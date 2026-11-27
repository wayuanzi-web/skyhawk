"""艦船參數檔 → Blender（無介面）建模 → 貼圖 → .glb（LOD0–2）→ meshopt／webp 壓縮。比照 build_aircraft.py。

用法：python3 tools/build_ship.py tools/yamato.json assets/yamato.glb
座標：參數用遊戲座標（x 右舷、y 上、0＝水線、z 往艦艉，艦艏在 -z）；Blender 內是 (x, -z, y)，輸出 glTF 時 Y 朝上，回到遊戲座標。
節點：
  LOD0／hull        靜態艦體與上層結構（合併，數種材質）
  LOD0／T1…T3、S1、S2   砲塔旋轉樞紐（空節點，原點＝旋轉中心，繞 y 轉）→ 子節點 ＊m（砲塔殼）＋ ＊g0..2（砲管樞紐，繞 x 轉仰角）→ ＊g0m…
  AA25、HA127       機砲座／高角砲座原型（遊戲端用 InstancedMesh 依 LOD0 extras「mounts」擺放，可個別擊毀）
  LOD1、LOD2        遠距用的合併減面版（含機砲座）
LOD0 的 extras「layout」帶損傷分區要用的位置（JSON 字串）。
"""
import bpy, bmesh, json, math, sys, os, random, subprocess
from mathutils import Vector, Matrix
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
P = json.load(open(SRC))
HERE = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
B = lambda x, y, z: Vector((x, -z, y))
Gm = lambda v: (v.x, v.z, -v.y)
random.seed(11)
L, BEAM = P["dims"]["length"], P["dims"]["beam"]
Z0 = -L / 2

# ---------------- 材質 ----------------
TEXD = os.path.dirname(os.path.abspath(OUT))
srgb = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
mats = {}
def mat(name):
    if name in mats: return mats[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    if name == "vc":
        a = nt.nodes.new("ShaderNodeVertexColor"); a.layer_name = "Color"; nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.72; b.inputs["Metallic"].default_value = 0.15
    elif name in ("hull", "deck"):
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.new(name, 8, 8)
        nt.links.new(tex.outputs["Color"], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.85 if name == "deck" else 0.7
        b.inputs["Metallic"].default_value = 0.0 if name == "deck" else 0.15
    else:
        c = P["colors"][name]; b.inputs["Base Color"].default_value = (*[srgb(v) for v in c], 1)
        b.inputs["Roughness"].default_value = {"gold": 0.35, "glass": 0.15, "lens": 0.2, "canvas": 0.95}.get(name, 0.7)
        b.inputs["Metallic"].default_value = {"gold": 0.9, "dark": 0.3, "steel": 0.15, "steel2": 0.15}.get(name, 0.05)
    mats[name] = m; return m

# ---------------- 幾何工具 ----------------
TEXM = ("hull", "deck", "gold")   # 有貼圖或特殊金屬感的獨立材質；其餘顏色全部走頂點色（同一個材質＝一次繪製）
class MB:
    """一個網格的累積器：faces 帶材質名，最後一次建成 bmesh。非 TEXM 的顏色寫進頂點色層 col。"""
    def __init__(s): s.bm = bmesh.new(); s.ml = []; s.col = s.bm.loops.layers.float_color.new("Color")
    def mi(s, name):
        name = name if name in TEXM else "vc"
        if name not in s.ml: s.ml.append(name)
        return s.ml.index(name)
    def v(s, x, y, z): return s.bm.verts.new(B(x, y, z))
    def f(s, vs, m):
        try: fc = s.bm.faces.new(vs)
        except ValueError: return None
        fc.material_index = s.mi(m)
        c = (1, 1, 1) if m in TEXM else tuple(srgb(v) for v in P["colors"][m])
        for l in fc.loops: l[s.col] = (*c, 1)
        return fc
def loft(mb, rings, m, cap0=True, cap1=True, closed=True):
    for a, b in zip(rings, rings[1:]):
        n = len(a)
        for k in range(n if closed else n - 1):
            mb.f((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]), m)
    if cap0: mb.f(rings[0][::-1], m)
    if cap1: mb.f(rings[-1], m)
def xf(p, c, rot):
    """局部 (x,y,z) 繞 y 轉 rot 後平移到 c。"""
    x, y, z = p; co, si = math.cos(rot), math.sin(rot)
    return (c[0] + x * co + z * si, c[1] + y, c[2] - x * si + z * co)
def box(mb, c, s, m, rot=0.0, rx=0.0):
    sx, sy, sz = s; vs = []
    for dz in (-1, 1):
        for dy in (-1, 1):
            for dx in (-1, 1):
                x, y, z = dx * sx / 2, dy * sy / 2, dz * sz / 2
                if rx: y, z = y * math.cos(rx) - z * math.sin(rx), y * math.sin(rx) + z * math.cos(rx)
                vs.append(mb.v(*xf((x, y, z), c, rot)))
    for q in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)):
        mb.f([vs[i] for i in q], m)
def oct_ring(w, d, ch):
    a, b = w / 2, d / 2; C = max(0.0, min(ch, a * 0.48, b * 0.48))
    return [(a - C, -b), (a, -b + C), (a, b - C), (a - C, b), (-a + C, b), (-a, b - C), (-a, -b + C), (-a + C, -b)]
def prism(mb, c, rings, m, rot=0.0, cap0=True, cap1=True):
    """rings = [(y, [(x,z)...]), ...]（局部座標，同點數），往上堆疊的稜柱。"""
    rr = [[mb.v(*xf((x, y, z), c, rot)) for x, z in pts] for y, pts in rings]
    loft(mb, rr, m, cap0, cap1)
def blk(mb, c, w, h, d, m, ch=0.0, tp=0.0, rot=0.0, cap0=True):
    r0 = oct_ring(w, d, ch); r1 = oct_ring(w - 2 * tp, d - 2 * tp, max(0, ch - tp))
    prism(mb, c, [(0, r0), (h, r1)], m, rot, cap0)
def cyl(mb, p0, p1, r, m, seg=10, cap=True, r1=None):
    p0, p1 = Vector(p0), Vector(p1); ax = (p1 - p0).normalized()
    u = ax.orthogonal().normalized(); v = ax.cross(u); r1 = r if r1 is None else r1
    rs = [[mb.v(*(p + (u * math.cos(2 * math.pi * k / seg) + v * math.sin(2 * math.pi * k / seg)) * rr)) for k in range(seg)] for p, rr in ((p0, r), (p1, r1))]
    loft(mb, rs, m, cap, cap)
def revolve(mb, prof, p0, d, m, seg=12, cap=True):
    """沿方向 d 的旋轉體。prof=[(沿軸距離, 半徑)]。"""
    p0, d = Vector(p0), Vector(d).normalized(); u = d.orthogonal().normalized(); v = d.cross(u)
    rs = [[mb.v(*(p0 + d * t + (u * math.cos(2 * math.pi * k / seg) + v * math.sin(2 * math.pi * k / seg)) * max(r, 0.003))) for k in range(seg)] for t, r in prof]
    loft(mb, rs, m, cap, cap)

# ---------------- 物件 ----------------
statics, nodes, CHECK = [], {}, []
def uv_of(mname, n, p):
    x, y, z = p
    if mname == "deck": return ((z - Z0) / L, (x + 20) / 40)
    if mname == "hull": return ((z - Z0) / L, (y + 11) / 23)
    return (0.5, 0.5)
def finish(mb, name, origin=(0, 0, 0), parent=None, static=True, extras=None, sharp=40):
    bm = mb.bm
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-5, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        f.normal_update(); mn = mb.ml[f.material_index]; n = Gm(f.normal)
        for l in f.loops: l[uv].uv = uv_of(mn, n, Gm(l.vert.co))
    o = B(*origin)
    for v in bm.verts: v.co -= o
    if sharp:
        se = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(sharp)]
        bmesh.ops.split_edges(bm, edges=se)
    for f in bm.faces: f.smooth = True
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if "Color" in me.color_attributes: me.color_attributes.active_color = me.color_attributes["Color"]; me.color_attributes.render_color_index = me.color_attributes.find("Color")
    for m in mb.ml: me.materials.append(mat(m))
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    ob.location = o
    if extras:
        for k, val in extras.items(): ob[k] = val
    (statics.append(ob) if static else nodes.__setitem__(name, ob))
    return ob
def empty(name, pos, parent=None, extras=None):
    e = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(e)
    e.location = B(*pos)
    if parent is not None:
        e.parent = parent; e.location = B(*pos) - parent_world(parent)
    if extras:
        for k, val in extras.items(): e[k] = val
    return e
def parent_world(p):
    t = Vector((0, 0, 0)); q = p
    while q is not None: t += q.location; q = q.parent
    return t
def attach(ob, parent):
    """把世界位置 ob 掛到 parent 下（只有平移，沒有旋轉）。"""
    w = ob.location.copy(); ob.parent = parent; ob.location = w - parent_world(parent)

# ---------------- 艦體放樣 ----------------
H = P["hull"]; ST = H["stations"]
def pchip(xs, ys):
    n = len(xs); h = [xs[i + 1] - xs[i] for i in range(n - 1)]; dl = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n; m[0] = dl[0]; m[-1] = dl[-1]
    for i in range(1, n - 1):
        if dl[i - 1] * dl[i] <= 0: m[i] = 0
        else:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i])
    def f(x):
        if x <= xs[0]: return ys[0]
        if x >= xs[-1]: return ys[-1]
        i = max(k for k in range(n - 1) if xs[k] <= x); t = (x - xs[i]) / h[i]
        return (ys[i] * (2 * t ** 3 - 3 * t * t + 1) + h[i] * m[i] * (t ** 3 - 2 * t * t + t) + ys[i + 1] * (-2 * t ** 3 + 3 * t * t) + h[i] * m[i + 1] * (t ** 3 - t * t))
    return f
ZS = [s[0] for s in ST]
FD, FW, FY, FK, FF, FN = [pchip(ZS, [s[i] for s in ST]) for i in range(1, 7)]
deckY = FY; halfDeck = FD
def hb(z, y):
    """截面半寬（z 站、y 高）。"""
    D, W, Yd, K, F, n = FD(z), FW(z), FY(z), FK(z), FF(z), FN(z)
    if y >= 0:
        t = min(1.0, y / max(Yd, 0.1)); p = 1.0 + 0.9 * max(0.0, (D - W) / max(D, 0.5) - 0.06)
        r = W + (D - W) * t ** p
    else:
        s = min(1.0, (-y) / max(-K, 0.1)) if K < 0 else 1.0
        r = F + (W - F) * max(0.0, 1 - s ** n) ** (1 / n)
    Bt = H["belt"]
    if Bt["z0"] < z < Bt["z1"] and Bt["y0"] < y < Bt["y1"]:
        e = min(1.0, (z - Bt["z0"]) / 8, (Bt["z1"] - z) / 8); tt = (y - Bt["y0"]) / (Bt["y1"] - Bt["y0"])
        r -= Bt["depth"] * e * math.sin(math.pi * tt) ** 0.5
    # 防雷突出部（水線下舷側的微凸＋下緣折角；艦舯 ±72 m）
    if -78 < z < 78 and -8.6 < y < -0.6:
        e = min(1.0, (z + 78) / 14, (78 - z) / 14); tt = (y + 8.6) / 8.0
        r += 0.55 * e * math.sin(math.pi * tt) ** 0.7
    return max(r, 0.0)
# 站位：端部加密
zl = []
for a, b in zip(ZS, ZS[1:]):
    k = max(1, int(round((b - a) / (1.4 if (a < -95 or a > 100) else 2.4))))
    if b - a < 1.5: k = 1
    zl += [a + (b - a) * i / k for i in range(k)]
zl.append(ZS[-1])
def yset(K, Yd):
    if K > 0: return [K + (Yd - K) * i / 21 for i in range(22)]
    ys = [K * (0.5 + 0.5 * math.cos(math.pi * i / 11)) for i in range(12)]
    return ys + [Yd * (i / 10) for i in range(1, 11)]
mb = MB(); rings = []
for z in zl:
    K, Yd = FK(z), FY(z); cam = H["camber"]
    ys = yset(K, Yd)
    side = [(hb(z, y), y) for y in ys]
    D = side[-1][0]
    deck = [(D * (1 - i / 4), Yd + cam * (1 - (1 - i / 4) ** 2)) for i in range(1, 4)]
    pts = [(0.0, ys[0])] + side + deck + [(0.0, Yd + cam)]
    full = pts + [(-x, y) for x, y in pts[-2:0:-1]]
    rings.append([mb.v(x, y, z) for x, y in full])
ns = len(side)
for a, b in zip(rings, rings[1:]):
    n = len(a)
    for k in range(n):
        mb.f((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]), "deck" if ns <= k <= ns + 7 else "hull")
mb.f(rings[0][::-1], "hull"); mb.f(rings[-1], "hull")
# 甲板段落差的垂直面改鋼材（不貼木紋）
for f in mb.bm.faces:
    f.normal_update()
    if mb.ml[f.material_index] == "deck" and abs(Gm(f.normal)[1]) < 0.5:
        f.material_index = mb.mi("steel")
        for l in f.loops: l[mb.col] = (*[srgb(v) for v in P["colors"]["steel"]], 1)
finish(mb, "hull_body", sharp=55)
# 球鼻艏
Bb = H["bulb"]; mb = MB()
Lb_ = Bb["z1"] - Bb["z0"]
prof = [(0, 0.0)] + [(Lb_ * (i / 24) ** 1.6, Bb["r"] * (math.sin(min(1.0, (i / 24) ** 1.6 * Lb_ / 5.5) * math.pi / 2) ** 0.55) * (1 - 0.92 * max(0.0, ((i / 24) ** 1.6 * Lb_ - 5.5) / (Lb_ - 5.5)) ** 1.4)) for i in range(1, 25)]
revolve(mb, prof, (0, Bb["y"], Bb["z0"]), (0, 0, 1), "hull", 24)
for v in mb.bm.verts:   # 截面上下略扁、往上收進艦艏
    g = Gm(v.co); dy = g[1] - Bb["y"]; v.co = B(g[0] * 0.9, Bb["y"] + dy * (1.45 if dy > 0 else 1.0 + 0.62 * (0.5 - 0.5 * math.cos(math.pi * min(1.0, max(0.0, (g[2] - Bb["z0"] - 0.5) / 8.0))))), g[2])   # 上緣併入艏柱（線圖：球鼻與艏柱平順相接）
finish(mb, "bulb")

# ---------------- 甲板配件：錨、錨鏈、繫纜樁、菊花紋章、艦艏旗桿 ----------------
mb = MB()
for sg in (-1, 1):
    za = -123.0; xa = hb(za, 7.6) + 0.05                                                         # 線圖：錨鏈孔在艏柱後 8 m、甲板下 2.5 m
    cyl(mb, (sg * (xa - 0.1), 7.7, za), (sg * (xa + 0.12), 7.7, za), 1.0, "dark", 12)            # 錨鏈孔
    box(mb, (sg * (xa + 0.3), 6.5, za), (0.45, 2.5, 0.55), "dark")                              # 錨柄
    box(mb, (sg * (xa + 0.3), 5.4, za), (0.5, 0.55, 2.5), "dark")                               # 錨爪
    for sz in (-1, 1): box(mb, (sg * (xa + 0.3), 5.7, za + sz * 1.25), (0.5, 0.9, 0.4), "dark")
    # 錨鏈：甲板上從錨鏈孔到起錨機，鏈環交錯
    x0, z0, x1, z1 = sg * 3.4, -121.0, sg * 1.6, -101.5
    for i in range(22):
        t = i / 21; x, z = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t; y = deckY(z) + 0.28 + 0.04 * math.sin(math.pi * t)
        box(mb, (x, y, z), (0.16 if i % 2 else 0.5, 0.5 if i % 2 else 0.16, 0.72), "dark")
    blk(mb, (sg * 1.6, deckY(-100.0), -100.0), 1.8, 1.1, 2.4, "steel2", 0.4)                   # 起錨機
    for z in (-108.0, -86.0, -40.0, -2.0, 34.5, 70.0, 92.0, 116.0):                            # 繫纜樁
        x = sg * (halfDeck(z) - 1.0); y = deckY(z)
        for dz in (-0.45, 0.45): cyl(mb, (x, y, z + dz), (x, y + 0.7, z + dz), 0.22, "dark", 8)
# 菊花紋章：艦艏前緣金色十六瓣圓盤
zc = -131.3; yc = 9.4; nP = 16; ctr = mb.v(0, yc, zc - 0.25); outer = []
for k in range(nP * 2):
    a = 2 * math.pi * k / (nP * 2); r = 0.78 if k % 2 == 0 else 0.6
    outer.append(mb.v(r * math.cos(a), yc + r * math.sin(a), zc - 0.12))
for k in range(len(outer)): mb.f((ctr, outer[k], outer[(k + 1) % len(outer)]), "gold")
back = [mb.v(0.8 * math.cos(2 * math.pi * k / 16), yc + 0.8 * math.sin(2 * math.pi * k / 16), zc + 0.3) for k in range(16)]
ring2 = [mb.v(0.8 * math.cos(2 * math.pi * k / 16), yc + 0.8 * math.sin(2 * math.pi * k / 16), zc - 0.1) for k in range(16)]
loft(mb, [ring2, back], "gold", False, True)
cyl(mb, (0, deckY(-130.0), -130.0), (0, deckY(-130.0) + 7.5, -130.6), 0.1, "dark", 6)          # 艦艏旗桿
for z in (-110.0, -60.0, 60.0, 100.0):                                                         # 通風口（菇形頂）
    for sg in (-1, 1):
        cyl(mb, (sg * 4.0, deckY(z), z), (sg * 4.0, deckY(z) + 1.2, z), 0.45, "steel2", 10)
        revolve(mb, [(0, 0.5), (0.25, 0.75), (0.5, 0.62), (0.62, 0.05)], (sg * 4.0, deckY(z) + 1.15, z), (0, 1, 0), "steel2", 10)
# 制鏈器（錨鏈中段）、錨鏈管（甲板孔）
for sg in (-1, 1):
    for t in (0.35, 0.7):
        x, z = sg * (3.4 + (1.6 - 3.4) * t), -121.0 + 19.5 * t
        box(mb, (x, deckY(z) + 0.3, z), (1.0, 0.6, 0.9), "steel2")
    cyl(mb, (sg * 1.6, deckY(-98.4) - 0.1, -98.4), (sg * 1.6, deckY(-98.4) + 0.12, -98.4), 0.5, "dark", 10)
# 導纜器（甲板邊緣，繫纜樁外側）、艙口蓋、天窗
for sg in (-1, 1):
    for z in (-112.0, -84.0, -42.0, 0.0, 33.5, 68.0, 90.0, 114.0, 126.0):
        x = sg * (halfDeck(z) - 0.35); y = deckY(z)
        box(mb, (x, y + 0.3, z), (0.5, 0.6, 1.4), "steel2"); box(mb, (x, y + 0.36, z), (0.52, 0.3, 0.7), "dark")
for x, z, w, l in ((5.5, -66, 1.8, 2.4), (-5.5, -66, 1.8, 2.4), (9.0, -40, 1.6, 2.0), (-9.0, -40, 1.6, 2.0), (6.0, 66, 1.8, 2.4), (-6.0, 66, 1.8, 2.4),
                   (3.0, -88, 1.4, 1.8), (-3.0, -88, 1.4, 1.8), (14.0, 56, 1.6, 2.0), (-14.0, 56, 1.6, 2.0), (2.5, 84, 1.6, 2.2), (-2.5, 84, 1.6, 2.2)):
    blk(mb, (x, deckY(z) + 0.05, z), w, 0.35, l, "steel2", 0.2, 0.08)
    box(mb, (x + (w / 2 - 0.15) * (1 if x > 0 else -1), deckY(z) + 0.42, z), (0.08, 0.1, l * 0.6), "dark")   # 鉸鏈
# 舷梯（收起，靠舷側斜放）
for sg in (-1, 1):
    for z in (-8.0, 40.0):
        x = sg * (FW(z) + (halfDeck(z) - FW(z)) * 0.5 + 0.2)
        box(mb, (x, 5.2, z), (0.25, 0.35, 9.0), "steel2", 0, 0.32)
        box(mb, (x, deckY(z) - 0.3, z - 3.6), (0.3, 1.0, 0.8), "steel2")
# 艦艉旗桿（航行中收倒）、艉燈
box(mb, (0, deckY(129.0) + 0.3, 128.6), (0.2, 0.2, 4.6), "dark")
box(mb, (0, deckY(130.6) + 0.15, 130.8), (0.6, 0.3, 0.4), "steel2")
# 4 軸推進器（直徑 5 m 三葉）、軸、軸支架、主舵＋副舵
PROPS = [(-10.8, -7.6, 100.0), (10.8, -7.6, 100.0), (-3.4, -6.4, 121.0), (3.4, -6.4, 121.0)]
for px_, py_, pz_ in PROPS:
    sg = 1 if px_ > 0 else -1
    cyl(mb, (px_ * 0.55, py_ + 2.2, pz_ - 30), (px_, py_, pz_ - 1.2), 0.42, "steel2", 8)                 # 軸
    revolve(mb, [(0, 0.05), (0.3, 0.55), (1.6, 0.75), (2.4, 0.3)], (px_, py_, pz_ - 1.6), (0, 0, 1), "gold", 10)   # 轂（青銅）
    for k in range(3):   # 葉片：沿半徑 4 段、節距角往葉尖遞減、葉寬中段最寬
        a = 2 * math.pi * k / 3 + 0.4; d = Vector((math.cos(a), math.sin(a), 0)); pp = Vector((-math.sin(a), math.cos(a), 0)); zz = Vector((0, 0, 1)); hub = Vector((px_, py_, pz_ - 0.7))
        top, bot = [], []
        for j, (rr, wd, pit) in enumerate(((0.6, 0.9, 0.9), (1.3, 1.25, 0.75), (1.9, 1.15, 0.6), (2.5, 0.35, 0.5))):
            c = hub + d * rr; t_ = (pp * math.cos(pit) * sg + zz * math.sin(pit)) * wd / 2
            for lst, off in ((top, 0.05), (bot, -0.05)):
                n_ = zz * math.cos(pit) - pp * math.sin(pit) * sg
                lst.append((mb.v(*(c + t_ + n_ * off)), mb.v(*(c - t_ + n_ * off))))
        for (a0, b0), (a1, b1) in zip(top, top[1:]): mb.f((a0, a1, b1, b0), "gold")
        for (a0, b0), (a1, b1) in zip(bot, bot[1:]): mb.f((b0, b1, a1, a0), "gold")
    S0, S1 = Vector((px_ * 0.55, py_ + 2.2, pz_ - 30)), Vector((px_, py_, pz_ - 1.2))
    for f_ in (0.55, 0.92):   # 軸支架（V 字兩腳）
        q = S0 + (S1 - S0) * f_
        for dx in (-0.9, 0.9): cyl(mb, tuple(q), (q.x * 0.8 + dx, q.y + 3.2, q.z), 0.16, "steel2", 6)
        cyl(mb, tuple(q - Vector((0, 0, 0.7))), tuple(q + Vector((0, 0, 0.7))), 0.55, "steel2", 8)
for zr, y0, y1, ch in ((124.5, -2.4, -8.6, 5.6), (110.5, -6.6, -9.6, 4.0)):   # 主舵、副舵
    blk(mb, (0, y1, zr), 0.7, y0 - y1, ch, "hull", 0.3)
finish(mb, "fittings")

# ---------------- 上層結構（依 Yamato1945 線圖：三層甲板室＋方塊漸收的塔型艦橋＋後傾大煙囪＋後傾主桅／吊桿＋後部艦橋） ----------------
S = P["super"]; mb = MB()
def mirror_pts(pts, grow=0.0):
    """右舷 [x,z]（前→後）→ 封閉凸多邊形；grow＝往外擴（甲板外伸、欄杆用）。"""
    R = [(x + grow, z) for x, z in pts]
    R[0] = (R[0][0], R[0][1] - grow); R[-1] = (R[-1][0], R[-1][1] + grow)
    return R + [(-x, z) for x, z in R[::-1]]
def rail_loop(pts, y, closed=True, m="dark"):
    seq = pts + (pts[:1] if closed else [])
    for (x0, z0), (x1, z1) in zip(seq, seq[1:]):
        Lr = math.hypot(x1 - x0, z1 - z0)
        if Lr < 0.05: continue
        ang = math.atan2(x1 - x0, z1 - z0); c = ((x0 + x1) / 2, 0, (z0 + z1) / 2)
        box(mb, (c[0], y + 0.95, c[2]), (0.05, 0.05, Lr), m, ang); box(mb, (c[0], y + 0.5, c[2]), (0.04, 0.04, Lr), m, ang)
        n = max(1, int(Lr / 2.0))
        for i in range(n + 1):
            t = i / n; box(mb, (x0 + (x1 - x0) * t, y + 0.48, z0 + (z1 - z0) * t), (0.05, 0.96, 0.05), m)
for li, lv_ in enumerate(S["levels"]):
    y0, y1 = lv_["y0"], lv_["y1"]; pts = mirror_pts(lv_["pts"])
    prism(mb, (0, 0, 0), [(y0 - 0.3, pts), (y1 - 0.2, pts)], "steel")
    gp = mirror_pts(lv_["pts"], 0.35)
    prism(mb, (0, 0, 0), [(y1 - 0.2, gp), (y1, gp)], "steel2")                                   # 甲板外伸
    rail_loop(gp, y1)
    for sg in (-1, 1):   # 側壁：舷窗、水密門、補強
        for (x0, z0), (x1, z1) in zip(lv_["pts"], lv_["pts"][1:]):
            if abs(x1 - x0) > 0.05 or z1 - z0 < 4: continue
            n = int((z1 - z0 - 2) / 2.4)
            for i in range(n):
                z = z0 + 1.6 + i * 2.4
                if random.random() < 0.3: continue
                box(mb, (sg * (x0 + 0.02), y0 + (y1 - y0) * 0.62, z), (0.08, 0.42, 0.42), "dark")
            for i in range(int((z1 - z0) / 9)):
                z = z0 + 4.5 + i * 9; box(mb, (sg * (x0 + 0.03), y0 + 1.0, z), (0.08, 1.9, 0.85), "steel2")
for pl in S["plats"]:   # 探照燈台／機砲台（立柱撐起的開放平台）
    gp = mirror_pts(pl["pts"]); y = pl["y"]
    prism(mb, (0, 0, 0), [(y - 0.25, gp), (y, gp)], "steel2"); rail_loop(gp, y)
    for x, z in pl["pts"][1:-1]:
        for sg in (-1, 1): cyl(mb, (sg * (x - 0.6), y - 2.3, z), (sg * (x - 0.6), y - 0.2, z), 0.18, "steel", 6)
# 高角砲座：圓形防盾圍（砲本體是 HA127 原型）
HA = P["ha"]
for x, y, z in HA["pos"]:
    for sg in (-1, 1):
        revolve(mb, [(0, 3.0), (0.9, 3.0)], (sg * x, y, z), (0, 1, 0), "steel2", 20, False)
        revolve(mb, [(0, 2.85), (0.9, 2.85)], (sg * x, y, z), (0, 1, 0), "steel2", 20, False)
        cyl(mb, (sg * x, y, z), (sg * x, y + 0.05, z), 2.95, "steel2", 20)
# 塔型艦橋：方塊漸收兩段＋圓角
T = P["tower"]; tz = T["z"]
def tring(w, zf, za, ch=None):
    ch = w * 0.3 if ch is None else ch; zc = (zf + za) / 2
    return [(x, z + zc) for x, z in oct_ring(w, za - zf, ch)]
def tbody(y):
    bd = T["body"]
    for (ya, wa, fa, aa), (yb, wb, fb, ab) in zip(bd, bd[1:]):
        if ya <= y <= yb and yb > ya:
            t = (y - ya) / (yb - ya); return wa + (wb - wa) * t, fa + (fb - fa) * t, aa + (ab - aa) * t
    return bd[-1][1], bd[-1][2], bd[-1][3]
prism(mb, (0, 0, 0), [(y, tring(w, zf, za)) for y, w, zf, za in T["body"]], "steel")
for y in (22.6, 25.4, 29.6):   # 塔周圍的走道平台
    w, zf, za = tbody(y - 0.01)
    gp = tring(w + 1.6, zf - 0.8, za + 0.8)
    prism(mb, (0, 0, 0), [(y - 0.2, gp), (y, gp)], "steel2"); rail_loop(gp, y)
for y, h in ((T["bridgeY"], 0.75), (24.0, 0.6), (27.0, 0.5)):   # 窗帶：第一艦橋、第二艦橋、作戰室
    w, zf, za = tbody(y + h / 2)
    g = tring(w + 0.08, zf - 0.04, za + 0.04); prism(mb, (0, 0, 0), [(y, g), (y + h, g)], "glass", 0, False, False)
# 第一艦橋頂：防空指揮所（開放平台、帆布防風幕、雙眼望遠鏡）、兩翼
cy = T["cmdY"]; c0, c1, cw = T["cmd"]
gp = tring(cw, c0, c1, 2.6); prism(mb, (0, 0, 0), [(cy - 0.35, gp), (cy, gp)], "steel2")
prism(mb, (0, 0, 0), [(cy, gp), (cy + 1.15, gp)], "canvas", 0, False, False)
for k in range(10):
    a_ = 2 * math.pi * k / 10; x, z = (cw / 2 - 0.7) * math.sin(a_), (c0 + c1) / 2 + ((c1 - c0) / 2 - 0.7) * math.cos(a_)
    cyl(mb, (x, cy, z), (x, cy + 1.2, z), 0.08, "dark", 5); cyl(mb, (x - 0.25 * math.cos(a_), cy + 1.35, z + 0.25 * math.sin(a_)), (x + 0.25 * math.cos(a_), cy + 1.35, z - 0.25 * math.sin(a_)), 0.14, "dark", 6)
box(mb, (0, T["bridgeY"] + 0.1, c0 + 1.8), (T["wing"], 0.25, 2.4), "steel2")                       # 艦橋兩翼
for sg in (-1, 1):
    box(mb, (sg * T["wing"] / 2, T["bridgeY"] + 0.6, c0 + 1.8), (0.06, 0.9, 2.4), "dark")
    cyl(mb, (sg * (T["wing"] / 2 - 0.8), T["bridgeY"] + 0.25, c0 + 1.5), (sg * (T["wing"] / 2 - 0.8), T["bridgeY"] + 1.45, c0 + 1.5), 0.45, "dark", 8)
box(mb, (0, cy + 0.6, c1 - 0.3), (9.0, 0.16, 0.16), "dark")                                        # 信號桁
# 主射擊指揮所（底座＋頂罩）、15 m 測距儀（橫貫兩舷）、21 號電探
d0, d1, df, da, dw = T["dir"]
prism(mb, (0, 0, 0), [(d0, tring(dw, df, da, 1.4)), (d1, tring(dw * 0.94, df + 0.2, da - 0.2, 1.3))], "steel")
h0, h1, hf, ha_, hw = T["hood"]
prism(mb, (0, 0, 0), [(h0, tring(hw, hf, ha_, 1.2)), (h0 + 1.5, tring(hw, hf - 0.3, ha_, 1.2)), (h1, tring(hw * 0.82, hf + 0.4, ha_ - 0.2, 0.9))], "steel")
for k in range(4): box(mb, ((k - 1.5) * 1.1, h0 + 1.05, hf - 0.32), (0.7, 0.32, 0.06), "glass")
ry, rz = T["rfY"], T["rfZ"]
cyl(mb, (-T["rf"] / 2, ry, rz), (T["rf"] / 2, ry, rz), 0.62, "steel", 14)
for sg in (-1, 1):
    box(mb, (sg * (T["rf"] / 2 - 0.35), ry, rz), (0.9, 1.6, 1.7), "steel2"); box(mb, (sg * (T["rf"] / 2 + 0.12), ry, rz), (0.05, 0.6, 0.6), "lens")
    box(mb, (sg * (T["rf"] / 2 * 0.55), ry - 0.75, rz), (0.3, 0.9, 0.3), "steel2")                 # 測距儀支架
yR = h1
box(mb, (0, yR + 0.15, rz - 0.2), (4.2, 0.12, 0.3), "dark"); box(mb, (0, yR + 1.35, rz - 0.2), (4.2, 0.12, 0.3), "dark")
for i in range(7): box(mb, (-2.0 + i * 4.0 / 6, yR + 0.75, rz - 0.2), (0.08, 1.2, 0.25), "dark")
box(mb, (0, yR + 0.75, rz - 0.2), (4.2, 0.08, 0.25), "dark")
cyl(mb, (0, yR, rz + 1.2), (0, yR + 3.0, rz + 1.2), 0.1, "dark", 6)                                 # 頂桿
# 22 號電探：塔兩側兩組喇叭
for sg in (-1, 1):
    for dy in (0.0, 1.5):
        y = 31.4 + dy; w, zf, za = tbody(y); x = sg * (w / 2 + 0.35)
        box(mb, (x, y, zf + 2.4), (0.9, 0.9, 0.9), "steel2")
        revolve(mb, [(0, 0.22), (0.8, 0.3), (1.6, 0.62)], (x + sg * 0.3, y, zf + 2.0), (sg * 0.5, 0, -1), "dark", 8)
# 塔側的機砲台（圓筒防彈圍）、塔前斜梯、側面通風筒（線圖：塔正面與兩側有多層半圓突出台）
def tub(c, r, h=1.0):
    x, y, z = c
    revolve(mb, [(0, r), (h, r)], (x, y, z), (0, 1, 0), "steel2", 16, False); revolve(mb, [(0, r - 0.12), (h, r - 0.12)], (x, y, z), (0, 1, 0), "steel2", 16, False)
    revolve(mb, [(h, r - 0.12), (h, r)], (x, y, z), (0, 1, 0), "steel2", 16, False); cyl(mb, (x, y - 0.25, z), (x, y, z), r, "steel2", 16)
    cyl(mb, (x, y - 1.6, z), (x, y - 0.25, z), r * 0.7, "steel", 12, False, r)                       # 下方漏斗形托座
for sg in (-1, 1):
    w, zf, za = tbody(25.4); tub((sg * (w / 2 + 0.9), 25.4, -3.6), 2.0)
    w, zf, za = tbody(28.0); tub((sg * (w / 2 + 0.4), 28.0, za - 1.8), 1.6)
    w, zf, za = tbody(22.6)
    for zz_ in (zf + 3.0, za - 2.5): box(mb, (sg * (w / 2 + 0.35), 24.5, zz_), (0.7, 7.0, 1.4), "steel")   # 側面通風筒／電纜管
w, zf, za = tbody(30.0)
for sgx in (-1, 1):
    for y0_, y1_ in ((19.5, 22.6), (22.6, 25.4), (25.4, 29.6)):
        cyl(mb, (sgx * 0.45, y0_, zf - 1.9), (sgx * 0.45, y1_, zf - 0.6), 0.05, "dark", 4)
for y0_, y1_ in ((19.5, 22.6), (22.6, 25.4), (25.4, 29.6)):
    n = int((y1_ - y0_) / 0.32)
    for i in range(1, n): t = i / n; cyl(mb, (-0.45, y0_ + (y1_ - y0_) * t, zf - 1.9 + 1.3 * t), (0.45, y0_ + (y1_ - y0_) * t, zf - 1.9 + 1.3 * t), 0.03, "dark", 3, False)
# 探照燈管制器、信號燈、13 mm 機銃（艦橋前方台）
for sg in (-1, 1):
    w, zf, za = tbody(30.6)
    cyl(mb, (sg * (w / 2 - 0.5), 29.6, za - 1.2), (sg * (w / 2 - 0.5), 30.8, za - 1.2), 0.6, "steel2", 10); cyl(mb, (sg * (w / 2 - 0.5), 30.8, za - 1.2), (sg * (w / 2 - 0.5), 31.0, za - 1.2), 0.45, "dark", 10)
    x = sg * 2.6; z = -2.6
    cyl(mb, (x, 29.6, z), (x, 30.4, z), 0.25, "dark", 6)
    for dx in (-0.18, 0.18): cyl(mb, (x + dx, 30.6, z + 0.2), (x + dx, 30.75, z - 1.8), 0.05, "dark", 5)
    cyl(mb, (sg * 4.4, 30.6, -2.4), (sg * 4.4, 30.6, -3.6), 0.75, "steel2", 12)                     # 小型探照燈
# 煙囪：後傾大煙囪，基座外擴、頂部雨蓋＋格柵
F = P["funnel"]
def fsec(t):
    y = F["y0"] + (F["y1"] - F["y0"]) * t; zz = F["z"] + (y - F["y0"]) * F["rake"]
    w = F["w0"] + (F["w1"] - F["w0"]) * t + (1.6 * (1 - t) ** 3); l = F["l0"] + (F["l1"] - F["l0"]) * t + (2.0 * (1 - t) ** 3)
    return y, zz, w, l
def fring(t, k=1.0):
    y, zz, w, l = fsec(t); return [mb.v(k * w / 2 * math.cos(2 * math.pi * i / 32), y, zz + k * l / 2 * math.sin(2 * math.pi * i / 32)) for i in range(32)]
rs = [fring(i / 14) for i in range(15)]
loft(mb, rs, "steel", False, False)
loft(mb, [fring(0.84, 1.035), fring(1.0, 1.035)], "steel2", False, False)                          # 頂部外罩
ty, tzf, tw_, tl_ = fsec(1.0)
inner = [mb.v(tw_ / 2 * 0.9 * math.cos(2 * math.pi * k / 32), ty - 0.3, tzf + tl_ / 2 * 0.9 * math.sin(2 * math.pi * k / 32)) for k in range(32)]
loft(mb, [fring(1.0, 1.035), inner], "steel2", False, True)
for f in mb.bm.faces:
    if f.verts[0] in inner and len(f.verts) == 32: f.material_index = mb.mi("dark")
for i in range(7): box(mb, (-tw_ / 2 * 0.8 + i * tw_ * 0.8 / 3, ty + 0.12, tzf), (0.12, 0.2, tl_ * 0.88), "dark")
for i in range(5): box(mb, (0, ty + 0.25, tzf - tl_ * 0.4 + i * tl_ * 0.2), (tw_ * 0.86, 0.12, 0.12), "dark")
for sx in (-1.3, 0.0, 1.3):   # 蒸汽管（煙囪後緣，貼著往上，頂端略高出頂罩）
    pts = []
    for i in range(8):
        t = 0.1 + i * 0.13; y, zc, wt, lt = fsec(min(t, 1.0))
        pts.append((sx, y, zc + lt / 2 * 1.035 * math.sqrt(max(0.0, 1 - (sx / (wt / 2)) ** 2)) + 0.25))
    pts[-1] = (sx, F["y1"] + 0.5, pts[-1][2])
    for p0, p1 in zip(pts, pts[1:]): cyl(mb, p0, p1, 0.24 if sx == 0 else 0.18, "steel2", 6)
y_, z_, w_, l_ = fsec(0.72); blk(mb, (0, y_, z_ - l_ / 2 - 0.9), 3.0, 0.2, 1.6, "steel2", 0.4)
for sg in (-1, 1): revolve(mb, [(0, 0.15), (0.9, 0.15), (1.3, 0.3)], (sg * 0.7, y_ + 0.2, z_ - l_ / 2 - 0.9), (0, 1, 0), "gold", 8)   # 汽笛
# 煙囪兩側探照燈（150 cm，每舷 4 具）
yP = S["plats"][0]["y"]
for sg in (-1, 1):
    for z in (11.5, 16.0, 20.5, 25.0):
        x = sg * 7.6; cyl(mb, (x, yP, z), (x, yP + 0.6, z), 0.5, "steel2", 8)
        cyl(mb, (x, yP + 1.3, z - 0.2), (x + sg * 0.6, yP + 1.3, z - 0.2), 0.78, "steel2", 12)
        cyl(mb, (x + sg * 0.6, yP + 1.3, z - 0.2), (x + sg * 0.66, yP + 1.3, z - 0.2), 0.7, "lens", 12)
        box(mb, (x, yP + 0.75, z - 0.2), (0.6, 0.6, 0.6), "steel")
# 主桅：往後上傾的主柱＋兩支前腳、雷達台、信號桁、斜桁；吊桿（短艇揚收）
Mt = P["mast"]; mz = Mt["z"]; MY0, MY1, MZT = Mt["y0"], Mt["y1"], Mt["zt"]
mpt = lambda y: (0, y, mz + (y - MY0) / (MY1 - MY0) * (MZT - mz))
cyl(mb, mpt(MY0), mpt(MY1 - 5), 0.55, "steel", 10, True, 0.4)
cyl(mb, mpt(MY1 - 5), mpt(MY1), 0.22, "steel", 8)                                                   # 頂桅
for sg in (-1, 1): q = mpt(MY1 - 11); cyl(mb, (sg * 3.4, MY0, mz - 2.4), (sg * 0.35, q[1], q[2]), 0.3, "steel", 8)
q = mpt(MY1 - 11.2); blk(mb, (0, q[1], q[2] + 0.3), 4.4, 0.25, 3.6, "steel2", 0.8)                  # 中段平台
q = mpt(MY1 - 8.0); blk(mb, (0, q[1], q[2] + 0.2), 2.8, 0.22, 2.4, "steel2", 0.6)                   # 雷達平台
qy = mpt(MY1 - 4.8); box(mb, (0, qy[1], qy[2]), (10.0, 0.22, 0.22), "dark")                         # 信號桁
q2 = mpt(MY1 - 2.0); box(mb, (0, q2[1], q2[2]), (5.0, 0.16, 0.16), "dark")
for sg in (-1, 1):
    for i in range(4): box(mb, (sg * (1.2 + i * 1.1), qy[1] + 0.15 - 0.25 * (i % 2), qy[2]), (0.1, 0.25, 0.1), "dark")
q = mpt(MY1 - 7.2); cyl(mb, q, (0, q[1] + 3.4, q[2] + 6.0), 0.13, "dark", 6)                         # 斜桁（往後上）
GAFF = (0, q[1] + 3.4, q[2] + 6.0)
for sg in (-1, 1):                                                                                 # 13 號雷達（兩舷，梯形格子天線）
    x = sg * 2.0; q = mpt(MY1 - 7.8)
    for dx in (-0.4, 0.4): box(mb, (x + dx, q[1] + 2.4, q[2] + 0.9), (0.07, 4.8, 0.07), "dark")
    for i in range(10): box(mb, (x, q[1] + 0.2 + i * 0.48, q[2] + 0.9), (0.86 - i * 0.03, 0.05, 0.05), "dark")
    box(mb, (x, q[1] + 2.4, q[2] + 0.9), (0.04, 4.6, 0.04), "dark")
B0_, B1_ = Mt["boom"]
cyl(mb, B0_, B1_, 0.34, "steel", 8, True, 0.2)                                                       # 吊桿
for t in (0.35, 0.65):
    a_ = [B0_[i] + (B1_[i] - B0_[i]) * t for i in range(3)]; q = mpt(a_[1] + 3.5); cyl(mb, a_, q, 0.1, "dark", 5)
cyl(mb, B1_, mpt(MY1 - 1.5), 0.05, "dark", 4)                                                         # 頂索
# 後部艦橋（後部主砲射擊指揮所）：八角塔＋10 m 測距儀
Af = P["aft"]; az = Af["z"]
prism(mb, (0, 0, az), [(Af["y0"], oct_ring(5.4, 5.6, 1.5)), (Af["y1"] - 3.0, oct_ring(4.6, 4.8, 1.3)), (Af["y1"] - 3.0, oct_ring(6.0, 6.0, 1.6)), (Af["y1"] - 1.6, oct_ring(6.0, 6.0, 1.6)), (Af["y1"] - 1.6, oct_ring(3.6, 3.6, 1.0))], "steel", 0, True, True)
blk(mb, (0, Af["y1"] - 1.6, az), 3.6, 1.8, 3.4, "steel", 0.8, 0.2)
cyl(mb, (-Af["rf"] / 2, Af["y1"] + 0.7, az + 0.4), (Af["rf"] / 2, Af["y1"] + 0.7, az + 0.4), 0.45, "steel", 12)
for sg in (-1, 1):
    box(mb, (sg * Af["rf"] / 2, Af["y1"] + 0.7, az + 0.4), (0.6, 1.1, 1.2), "steel2"); box(mb, (sg * (Af["rf"] / 2 + 0.31), Af["y1"] + 0.7, az + 0.4), (0.04, 0.5, 0.5), "lens")
for k in range(6):
    a_ = -0.9 + k * 0.36; box(mb, (2.95 * math.sin(a_), Af["y1"] - 2.3, az - 2.95 * math.cos(a_)), (0.8, 0.35, 0.06), "glass", a_)
box(mb, (0, Af["y1"] - 2.55, az), (6.4, 0.06, 6.2), "steel2")
# 94 式高射裝置（艦橋兩側；圓頂罩＋4.5 m 測距儀臂）
for hx, hy, hz in Af["had"]:
    for sg in (-1, 1):
        x = sg * hx
        blk(mb, (x, hy - 0.3, hz), 4.0, 0.3, 4.0, "steel2", 1.3)
        cyl(mb, (x - sg * 0.6, hy - 2.6, hz), (x, hy - 0.3, hz), 0.9, "steel", 10)
        revolve(mb, [(0, 1.5), (1.2, 1.5), (1.9, 1.15), (2.3, 0.4), (2.35, 0.05)], (x, hy, hz), (0, 1, 0), "steel", 14)
        cyl(mb, (x - 2.3, hy + 1.3, hz), (x + 2.3, hy + 1.3, hz), 0.24, "steel2", 8)
        for s2 in (-1, 1): box(mb, (x + s2 * 2.3, hy + 1.3, hz), (0.4, 0.6, 0.6), "steel2"); box(mb, (x + s2 * 2.52, hy + 1.3, hz), (0.04, 0.3, 0.3), "lens")
        box(mb, (x, hy + 1.2, hz - 1.35), (1.4, 0.35, 0.1), "glass")
# 艇庫（第一層後段兩舷的開口，內有內火艇）
def boat(c, Lb, Bb, col="canvas", cab=True):
    x, y, z = c
    prof = [(0, 0.05), (Lb * 0.07, Bb * 0.33), (Lb * 0.22, Bb * 0.48), (Lb * 0.7, Bb * 0.5), (Lb * 0.92, Bb * 0.42), (Lb, Bb * 0.25)]
    revolve(mb, prof, (x, y, z - Lb / 2), (0, 0, 1), "steel", 12)
    box(mb, (x, y + Bb * 0.42, z), (Bb * 0.92, 0.12, Lb * 0.72), "deckwood")
    if cab: blk(mb, (x, y + Bb * 0.42, z - Lb * 0.08), Bb * 0.6, Bb * 0.42, Lb * 0.28, col, 0.3, 0.05)
for sg in (-1, 1):
    for z0, z1 in ((24.5, 29.5), (30.0, 35.0)):
        x = sg * 15.02; zc = (z0 + z1) / 2
        box(mb, (x, 9.9, zc), (0.06, 2.9, z1 - z0), "dark")
        for dz in (-1, 1): box(mb, (x + sg * 0.08, 9.9, zc + dz * (z1 - z0) / 2), (0.16, 3.1, 0.2), "steel2")
        box(mb, (x + sg * 0.08, 11.4, zc), (0.16, 0.2, z1 - z0 + 0.2), "steel2")
        boat((sg * 14.6, 8.6, zc), z1 - z0 - 0.6, 2.2, "steel2", z0 < 30)
finish(mb, "super")

# ---------------- 艦艉：彈射器、起重機、水上機 ----------------
Sn = P["stern"]; mb = MB()
for sg in (-1, 1):
    cz = Sn["catZ"]; cx = sg * Sn["catX"]; y = deckY(cz); a = sg * Sn["catAng"]
    cyl(mb, (cx, y, cz), (cx, y + 0.8, cz), 1.6, "steel2", 14)
    for s_ in (-0.55, 0.55): box(mb, xf((s_, 1.3, 0), (cx, y, cz), a), (0.18, 0.5, Sn["catLen"]), "dark", a)   # 桁架兩側主樑
    for i in range(10): box(mb, xf((0, 1.2, (-0.5 + i / 9) * Sn["catLen"]), (cx, y, cz), a), (1.3, 0.12, 0.12), "dark", a)
    box(mb, xf((0, 1.65, 0), (cx, y, cz), a), (1.0, 0.25, Sn["catLen"]), "steel2", a)
# 起重機
cz = Sn["craneZ"]; y = deckY(cz)
cyl(mb, (0, y, cz), (0, y + 7.5, cz), 0.7, "steel", 10)
box(mb, (0, y + 7.8, cz), (2.0, 1.2, 2.2), "steel")
B0, B1 = Vector((0, y + 7.6, cz + 0.3)), Vector((0, y + 9.6, cz - 21.0))   # 1945 線圖：吊臂幾乎水平收置、往前伸到彈射器之間
for dx, dy in ((-0.45, 0.3), (0.45, 0.3), (0, -0.35)): cyl(mb, (dx, B0.y + dy, B0.z), (dx * 0.4, B1.y + dy * 0.4, B1.z), 0.1, "steel", 5)   # 桁架弦材
for i in range(18):
    t0, t1 = i / 18, (i + 1) / 18; q0, q1 = B0 + (B1 - B0) * t0, B0 + (B1 - B0) * t1; k0, k1 = 1 - 0.6 * t0, 1 - 0.6 * t1
    for dx in (-0.45, 0.45): cyl(mb, (dx * k0, q0.y + 0.3 * k0, q0.z), (0, q1.y - 0.35 * k1, q1.z), 0.05, "steel", 4)
cyl(mb, (0, y + 8.4, cz + 0.6), (0, y + 9.7, cz - 20.8), 0.05, "dark", 4)                       # 變幅索
blk(mb, (0, y + 7.2, cz), 2.6, 0.3, 2.6, "steel2", 0.8)
box(mb, (0, y + 4.0, cz - 1.0), (1.2, 1.0, 1.0), "steel2")
# 艦艉甲板軌道（水上機搬運）在貼圖上；水上機：零式觀測機（雙翼、中央浮筒、翼端浮筒）
def floatplane(c, rot):
    revolve(mb, [(0, 0.1), (0.5, 0.55), (2.0, 0.6), (5.5, 0.35), (8.6, 0.08)], xf((0, 1.9, -4.3), c, rot), xf((0, 0, 1), (0, 0, 0), rot), "plane", 8)
    box(mb, xf((0, 2.9, -1.6), c, rot), (11.0, 0.14, 1.6), "plane", rot)        # 上翼
    box(mb, xf((0, 1.5, -1.3), c, rot), (10.0, 0.12, 1.5), "plane", rot)        # 下翼
    for s in (-1.6, 1.6): box(mb, xf((s, 2.2, -1.5), c, rot), (0.08, 1.4, 0.08), "dark", rot)
    box(mb, xf((0, 2.4, 3.8), c, rot), (3.6, 0.1, 1.0), "plane", rot)           # 水平尾翼
    box(mb, xf((0, 3.1, 4.0), c, rot), (0.1, 1.3, 1.2), "plane", rot)           # 垂直尾翼
    revolve(mb, [(0, 0.05), (0.8, 0.42), (3.0, 0.45), (5.4, 0.12)], xf((0, 0.45, -3.4), c, rot), xf((0, 0, 1), (0, 0, 0), rot), "plane", 8)   # 中央浮筒
    for s in (-4.4, 4.4): revolve(mb, [(0, 0.03), (0.4, 0.2), (1.4, 0.18), (1.8, 0.05)], xf((s, 1.0, -2.2), c, rot), xf((0, 0, 1), (0, 0, 0), rot), "plane", 6)
    box(mb, xf((0, 1.1, -2.2), c, rot), (0.15, 1.2, 0.2), "dark", rot)
    cyl(mb, xf((0, 1.9, -4.35), c, rot), xf((0, 1.9, -4.5), c, rot), 0.75, "dark", 8)   # 螺旋槳盤
def e13a(c, rot):
    """零式水上偵察機（E13A）：低單翼、長座艙罩、雙浮筒、星型發動機。原點＝浮筒底。"""
    P_ = lambda p: xf(p, c, rot); D_ = xf((0, 0, 1), (0, 0, 0), rot)
    revolve(mb, [(0, 0.15), (0.3, 0.62), (1.2, 0.68), (3.0, 0.62), (6.0, 0.42), (9.4, 0.12)], P_((0, 2.9, -4.2)), D_, "plane", 10)   # 機身
    cyl(mb, P_((0, 2.9, -4.25)), P_((0, 2.9, -4.0)), 0.66, "dark", 10)                                # 發動機罩前緣
    box(mb, P_((0, 3.55, -0.6)), (0.62, 0.42, 4.6), "glass", rot)                                     # 長座艙罩
    for k in range(5): box(mb, P_((0, 3.58, -2.6 + k * 1.0)), (0.66, 0.46, 0.06), "plane", rot)
    wing = [(-7.25, 0.9), (-2.0, 2.0), (2.0, 2.0), (7.25, 0.9)]
    for (x0, c0), (x1, c1) in zip(wing, wing[1:]):                                                     # 主翼（梯形）
        zc0, zc1 = -1.4 + (2.0 - c0) * 0.35, -1.4 + (2.0 - c1) * 0.35
        v_ = [mb.v(*P_((x0, 2.45, zc0 - c0 / 2))), mb.v(*P_((x1, 2.45, zc1 - c1 / 2))), mb.v(*P_((x1, 2.45, zc1 + c1 / 2))), mb.v(*P_((x0, 2.45, zc0 + c0 / 2)))]
        w_ = [mb.v(*P_((x0, 2.6, zc0 - c0 / 2))), mb.v(*P_((x1, 2.6, zc1 - c1 / 2))), mb.v(*P_((x1, 2.6, zc1 + c1 / 2))), mb.v(*P_((x0, 2.6, zc0 + c0 / 2)))]
        mb.f(v_[::-1], "plane"); mb.f(w_, "plane"); mb.f((v_[0], v_[1], w_[1], w_[0]), "plane"); mb.f((v_[2], v_[3], w_[3], w_[2]), "plane")
    for s_ in (-1, 1):
        cyl(mb, P_((s_ * 4.2, 2.48, -1.6)), P_((s_ * 4.24, 2.48, -1.62)), 0.36, "red", 10)              # 日之丸（翼上）
    box(mb, P_((0, 3.0, 4.6)), (4.4, 0.1, 1.2), "plane", rot)                                         # 水平尾翼
    box(mb, P_((0, 3.8, 4.8)), (0.1, 1.7, 1.5), "plane", rot)                                         # 垂直尾翼
    for s_ in (-1, 1):
        revolve(mb, [(0, 0.05), (0.7, 0.4), (2.6, 0.46), (5.6, 0.12)], P_((s_ * 1.7, 0.45, -3.6)), D_, "plane", 8)   # 浮筒
        for dz in (-2.2, -0.4): cyl(mb, P_((s_ * 1.7, 0.85, dz)), P_((s_ * 0.6, 2.45, dz + 0.2)), 0.06, "dark", 5)
    cyl(mb, P_((0, 2.9, -4.4)), P_((0, 2.9, -4.5)), 1.4, "dark", 10)                                  # 螺旋槳盤
for sg in (-1, 1):
    a = sg * Sn["catAng"]; c = (sg * Sn["catX"], deckY(Sn["catZ"]) + 1.8, Sn["catZ"]); e13a(xf((0, 0, 2.0), c, a), a)
floatplane((0, deckY(100.0) + 0.1, 100.0), 0.0)
floatplane((0, deckY(116.0) + 0.1, 116.0), 0.0)
# 飛機甲板：昇降口（機庫入口）、轉盤、台車；起重機鋼索與吊鉤、操縱室
blk(mb, (0, deckY(92.0) + 0.02, 92.0), 9.0, 0.12, 9.0, "steel2", 0.2)
for sg in (-1, 1): box(mb, (sg * 4.5, deckY(92.0) + 0.16, 92.0), (0.12, 0.08, 9.0), "dark"); box(mb, (0, deckY(92.0) + 0.16, 92.0 + sg * 4.5), (9.0, 0.08, 0.12), "dark")
for x, z in ((0, 104.0), (0, 84.0), (-6.5, 112.0), (6.5, 112.0)):
    cyl(mb, (x, deckY(z), z), (x, deckY(z) + 0.1, z), 2.0, "steel2", 16)
cz = Sn["craneZ"]; y = deckY(cz)
cyl(mb, (0, y + 9.6, cz - 21.0), (0, y + 6.0, cz - 21.0), 0.04, "dark", 4)
box(mb, (0, y + 5.8, cz - 21.0), (0.4, 0.5, 0.3), "dark")
box(mb, (0, y + 6.5, cz + 1.4), (1.6, 1.6, 1.4), "steel2"); box(mb, (0, y + 6.8, cz + 0.65), (1.2, 0.5, 0.06), "glass")
finish(mb, "stern")

# ---------------- 主砲塔、副砲塔（可動節點） ----------------
LOD0 = empty("LOD0", (0, 0, 0))
def turret(t, Sh, roof_aa):
    name = t["name"]; cy = t["y"]; cz = t["z"]; rot = t["rot"]
    piv = empty(name, (0, cy, cz), LOD0, {"turret": 1, "base": rot})
    if rot: piv.rotation_euler = (0, 0, rot)   # Blender z 軸＝遊戲 y 軸
    mb = MB(); w, lf, lr, h, sl = Sh["w"], Sh["lf"], Sh["lr"], Sh["h"], Sh["slope"]
    a = w / 2; k_ = w / 14.6; rs_ = Sh.get("rs", 1.0)
    # 砲塔殼：低而寬，前面大斜面、前角斜切、側面微內傾、後面略後傾（線圖：長 17.8、高 4.0、寬 13.6）
    bot = [(-a * 0.6, -lf), (a * 0.6, -lf), (a, -lf + 3.0 * k_), (a, lr - 1.2 * k_), (a * 0.92, lr), (-a * 0.92, lr), (-a, lr - 1.2 * k_), (-a, -lf + 3.0 * k_)]
    top = [(-a * 0.52, -lf + sl), (a * 0.52, -lf + sl), (a * 0.9, -lf + sl + 1.6 * k_), (a * 0.9, lr - rs_ - 1.0 * k_), (a * 0.84, lr - rs_), (-a * 0.84, lr - rs_), (-a * 0.9, lr - rs_ - 1.0 * k_), (-a * 0.9, -lf + sl + 1.6 * k_)]
    prism(mb, (0, 0, 0), [(0, bot), (h, top)], "steel")
    cyl(mb, (0, -t.get("barbH", 2.6), 0), (0, 0.05, 0), Sh["barbR"], "steel", 36)                  # 砲座（露出甲板的部分）
    cyl(mb, (0, -0.05, 0), (0, 0.12, 0), Sh["barbR"] + 0.12, "steel2", 36)                          # 旋轉部下緣
    # 測距儀耳（砲塔後部兩側）
    rf = Sh["rf"]; ry = h * 0.6; rz = lr - 3.1 * k_
    cyl(mb, (-rf / 2, ry, rz), (rf / 2, ry, rz), 0.48 * (w / 14.6), "steel2", 10)
    for sg in (-1, 1):
        box(mb, (sg * (rf / 2 - 0.2), ry, rz), (0.9 * w / 14.6, 1.25 * w / 14.6, 1.4 * w / 14.6), "steel2")
        box(mb, (sg * (rf / 2 + 0.25), ry, rz), (0.05, 0.45, 0.45), "lens")
    # 砲眼（正面深色開口）、頂部艙口與潛望鏡罩
    for k in range(3):
        x = (k - 1) * Sh["gap"]; yp = Sh["trunY"] + 0.1; zp = -lf + sl * (yp / h) + 0.02
        box(mb, (x, yp, zp), (Sh["gap"] * 0.42, 1.15 * k_, 0.5), "dark", 0, -math.atan2(sl, h))         # 砲眼（貼在前斜面上）
    for sg in (-1, 1):
        box(mb, (sg * a * 0.45, h + 0.25, -lf + sl + 1.6), (0.9, 0.5, 1.1), "steel2")
        cyl(mb, (sg * a * 0.25, h, lr - 2.5), (sg * a * 0.25, h + 0.4, lr - 2.5), 0.45, "steel2", 8)
    # 正面裝甲接縫、側面艙門、後部出入門、頂部通風罩、側面踏梯、頂部欄杆座、測距儀罩窗
    for x in (-a * 0.3, a * 0.3): box(mb, (x, h * 0.5 + 0.2, -lf + sl * 0.5), (0.05, h * 0.9, 0.05), "steel2", 0, -math.atan2(sl, h))
    for sg in (-1, 1):
        box(mb, (sg * (a * 0.96), h * 0.42, lr - 3.6), (0.1, 1.6 * k_, 1.0 * k_), "steel2")
        for i in range(5): box(mb, (sg * (a * 0.93 + 0.05), 0.5 + i * 0.75 * k_, lr - 1.2), (0.08, 0.06, 0.6 * k_), "dark")
        box(mb, (sg * a * 0.45, h + 0.05, lr - 4.6 * k_), (1.6 * k_, 0.25, 1.0 * k_), "steel2")
        box(mb, (sg * a * 0.7, h + 0.1, -lf + sl + 3.0 * k_), (0.6 * k_, 0.35, 0.6 * k_), "steel2")
    box(mb, (0, h * 0.45, lr + 0.02), (1.4 * k_, 2.0 * k_, 0.12), "steel2")
    box(mb, (0, h * 0.45, lr + 0.06), (1.0 * k_, 1.6 * k_, 0.06), "dark")
    box(mb, (0, ry + 0.55 * k_, rz), (rf * 0.6, 0.12, 0.6 * k_), "steel2")
    blk(mb, (0, h, (lr - lf + sl) / 2), w * 0.5, 0.18, (lr + lf - sl) * 0.5, "steel2", 0.6)
    for aa in roof_aa:   # 砲塔頂機砲（跟砲塔一起轉）
        mount25(mb, (aa[0], h, aa[1]), aa[2])
    hm = finish(mb, name + "m", (0, 0, 0), static=False)
    attach(hm, piv); hm.location = Vector((0, 0, 0))
    # 砲管（各自一個樞紐）：防水砲衣（布）＋砲管錐度＋砲口加厚
    BL = Sh["barrel"]; r0 = 0.62 * w / 14.6
    for k in range(3):
        x = (k - 1) * Sh["gap"]; tp = (x, Sh["trunY"], Sh["trunZ"])
        gp = empty(name + "g%d" % k, (x, cy + Sh["trunY"], cz + Sh["trunZ"]), None, {"gun": 1})
        gp.parent = piv; gp.location = B(x, Sh["trunY"], Sh["trunZ"])
        mb = MB()
        dp = lf - sl * (Sh["trunY"] + 0.1) / h + Sh["trunZ"]                                          # 樞紐到砲眼的距離
        revolve(mb, [(dp - 0.8, r0 * 1.5), (dp + 0.5, r0 * 1.42), (dp + 1.3, r0 * 1.2), (dp + 1.9, r0 * 0.9)], (0, 0, 0), (0, 0, -1), "canvas", 14)   # 防水砲衣
        revolve(mb, [(1.0, r0 * 0.9), (1.0 + BL * 0.25, r0 * 0.78), (1.0 + BL * 0.92, r0 * 0.56), (1.0 + BL * 0.95, r0 * 0.64), (1.0 + BL, r0 * 0.62), (1.01 + BL, r0 * 0.36)], (0, 0, 0), (0, 0, -1), "steel", 16)
        cyl(mb, (0, 0, -1.0 - BL), (0, 0, -1.02 - BL), r0 * 0.38, "dark", 10)
        gm = finish(mb, name + "g%dm" % k, (0, 0, 0), static=False)
        gm.parent = gp; gm.location = Vector((0, 0, 0))
    return piv
def mount25(mb, c, rot, scale=1.0):
    """九六式 25 mm 三聯裝機砲：底座、旋轉座、搖架、三管、消焰器、射手座、小防盾。"""
    s = scale
    cyl(mb, xf((0, 0, 0), c, rot), xf((0, 0.55 * s, 0), c, rot), 0.7 * s, "steel2", 8)
    box(mb, xf((0, 0.95 * s, 0.1 * s), c, rot), (1.25 * s, 0.75 * s, 1.5 * s), "steel", rot)
    for k in (-1, 0, 1):
        cyl(mb, xf((k * 0.32 * s, 1.15 * s, -0.3 * s), c, rot), xf((k * 0.32 * s, 1.35 * s, -3.0 * s), c, rot), 0.07 * s, "dark", 5)
        cyl(mb, xf((k * 0.32 * s, 1.35 * s, -3.0 * s), c, rot), xf((k * 0.32 * s, 1.37 * s, -3.3 * s), c, rot), 0.12 * s, "dark", 5)
    for sg in (-1, 1):
        box(mb, xf((sg * 0.95 * s, 0.75 * s, 0.6 * s), c, rot), (0.45 * s, 0.12 * s, 0.6 * s), "dark", rot)                    # 射手座
        box(mb, xf((sg * 0.72 * s, 1.15 * s, 0.35 * s), c, rot), (0.08 * s, 0.4 * s, 0.25 * s), "dark", rot)                    # 照準器
        box(mb, xf((sg * 1.05 * s, 1.0 * s, -0.35 * s), c, rot + sg * 0.5), (0.05 * s, 0.85 * s, 0.9 * s), "steel2", rot + sg * 0.5)   # 側防盾
    box(mb, xf((0, 1.0 * s, -0.75 * s), c, rot), (1.6 * s, 0.9 * s, 0.06 * s), "steel2", rot)                                  # 正面防盾
    for k in (-1, 0, 1): box(mb, xf((k * 0.32 * s, 1.15 * s, 0.55 * s), c, rot), (0.18 * s, 0.32 * s, 0.4 * s), "dark", rot)   # 彈匣
    box(mb, xf((0, 0.3 * s, 1.55 * s), c, rot), (1.3 * s, 0.6 * s, 0.55 * s), "steel2", rot)                                   # 待用彈藥箱
    box(mb, xf((0, 0.62 * s, 1.55 * s), c, rot), (1.34 * s, 0.05 * s, 0.6 * s), "dark", rot)
M_S = P["mainShape"]; S_S = P["secShape"]
for t in P["main"]: turret(t, M_S, [(-3.9, 2.8, math.pi), (3.9, 2.8, math.pi)] if t["name"] != "T1" else [])
for t in P["sec"]: turret(t, S_S, [])

# ---------------- 細件（只在 LOD0：欄杆、救命浮器、天線、軍艦旗、單裝機砲＋沙包、機銃射擊裝置、斜梯） ----------------
mb = MB()
# 甲板邊緣欄杆（支柱每 2.4 m、上下兩道索）
zs_ = []; z = -127.0
while z < 129.5: zs_.append(z); z += 2.4
for sg in (-1, 1):
    pts_ = [(sg * (halfDeck(z) - 0.12), deckY(z), z) for z in zs_]
    for x, y, z in pts_: box(mb, (x, y + 0.5, z), (0.06, 1.0, 0.06), "dark")
    for (x0, y0, z0), (x1, y1, z1) in zip(pts_, pts_[1:]):
        if abs(y1 - y0) > 0.6: continue
        Lr = math.hypot(x1 - x0, z1 - z0); ang = math.atan2(x1 - x0, z1 - z0)
        for hh in (0.98, 0.5): box(mb, ((x0 + x1) / 2, (y0 + y1) / 2 + hh, (z0 + z1) / 2), (0.04, 0.04, Lr), "dark", ang)
# 救命浮器（上層結構側壁，木製方形，疊放）
for sg in (-1, 1):
    for z in (3.5, 29.5):
        for k in range(2): box(mb, (sg * (11.0 + 0.25 + k * 0.42), 13.6, z), (0.38, 1.3, 2.6), "deckwood")
    for z in (9.0, 21.0): box(mb, (sg * (15.0 + 0.25), 10.2, z), (0.4, 1.3, 2.6), "deckwood")
# 天線線纜：艦橋信號桁 → 主桅信號桁；主桅斜桁 → 艦艉；主桅頂 → 艦橋頂
MT = P["mast"]; tz0 = P["tower"]["z"]; TY = P["tower"]["cmdY"] + 0.6; TZ = P["tower"]["cmd"][1] - 0.3
def wire(p0, p1, sag=0.6, n=6):
    p0, p1 = Vector(p0), Vector(p1); pts = [p0 + (p1 - p0) * (i / n) - Vector((0, sag * math.sin(math.pi * i / n), 0)) for i in range(n + 1)]
    for a, b in zip(pts, pts[1:]): cyl(mb, tuple(a), tuple(b), 0.03, "rope", 3, False)
for sg in (-1, 1):
    wire((sg * 4.4, TY, TZ), (sg * 4.9, qy[1], qy[2]), 0.5)
    wire((sg * 4.9, qy[1], qy[2]), (sg * 9.0, deckY(124.0) + 1.0, 124.0), 1.4, 10)
wire(mpt(MT["y1"]), (0, P["tower"]["hood"][1] + 3.0, P["tower"]["rfZ"] + 1.2), 0.4)
for sg in (-1, 1): wire((sg * 2.2, q2[1], q2[2]), (sg * 4.0, 26.5, 56.0), 0.3, 6)
# 軍艦旗（戰鬥旗，掛在主桅斜桁端：白底、紅日偏旗桿側、16 道光芒）
def clip_rect(poly, x0, x1, y0, y1):
    def clip(poly, inside, inter):
        out = []
        for i in range(len(poly)):
            a, b = poly[i - 1], poly[i]
            if inside(b):
                if not inside(a): out.append(inter(a, b))
                out.append(b)
            elif inside(a): out.append(inter(a, b))
        return out
    for ax, val, keep in ((0, x0, 1), (0, x1, -1), (1, y0, 1), (1, y1, -1)):
        inside = lambda p, ax=ax, val=val, keep=keep: (p[ax] - val) * keep >= 0
        def inter(a, b, ax=ax, val=val):
            t = (val - a[ax]) / (b[ax] - a[ax]); return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        poly = clip(poly, inside, inter)
        if not poly: break
    return poly
FZ0, FY0 = GAFF[2] + 0.2, GAFF[1] - 0.1; FW_, FH_ = 4.2, 2.8
def flagpt(u, v, side):   # u 沿旗長（0＝旗桿側）、v 由上往下；旗面微微飄動
    return (side * 0.012 + 0.25 * math.sin(u * 2.4) * u / FW_, FY0 - v - u * 0.18, FZ0 + u)
for side in (-1, 1):
    def poly_(pp, col):
        vs = [mb.v(*flagpt(u, v, side)) for u, v in pp]
        if len(vs) >= 3: mb.f(vs if side > 0 else vs[::-1], col)
    # 白底切成條帶，讓飄動彎曲
    for i in range(6):
        u0, u1 = FW_ * i / 6, FW_ * (i + 1) / 6
        poly_([(u0, 0), (u1, 0), (u1, FH_), (u0, FH_)], "white")
    cu, cv, R = FW_ * 0.43, FH_ / 2, FH_ * 0.3
    for k in range(16):
        a0 = 2 * math.pi * (k - 0.25) / 16; a1 = 2 * math.pi * (k + 0.25) / 16
        tri_ = clip_rect([(cu, cv), (cu + 9 * math.cos(a0), cv + 9 * math.sin(a0)), (cu + 9 * math.cos(a1), cv + 9 * math.sin(a1))], 0, FW_, 0, FH_)
        vs = [mb.v(side * 0.02 + 0.25 * math.sin(u * 2.4) * u / FW_, FY0 - v - u * 0.18, FZ0 + u) for u, v in tri_]
        if len(vs) >= 3: mb.f(vs if side > 0 else vs[::-1], "red")
    vs = [mb.v(side * 0.028 + 0.25 * math.sin((cu + R * math.cos(2 * math.pi * k / 20)) * 2.4) * (cu + R * math.cos(2 * math.pi * k / 20)) / FW_, FY0 - (cv + R * math.sin(2 * math.pi * k / 20)) - (cu + R * math.cos(2 * math.pi * k / 20)) * 0.18, FZ0 + cu + R * math.cos(2 * math.pi * k / 20)) for k in range(20)]
    mb.f(vs if side > 0 else vs[::-1], "red")
# 單裝 25 mm 機砲（甲板上，沙包圍）
def single25(c, rot):
    x, y, z = c
    revolve(mb, [(0, 1.75), (0.85, 1.55)], (x, y, z), (0, 1, 0), "sand", 14, False)
    revolve(mb, [(0, 1.25), (0.85, 1.25)], (x, y, z), (0, 1, 0), "sand", 14, False)
    for k in range(14):   # 沙包頂（一圈小凸塊）
        a_ = 2 * math.pi * k / 14; box(mb, (x + 1.5 * math.cos(a_), y + 0.92, z + 1.5 * math.sin(a_)), (0.55, 0.18, 0.4), "sand", -a_)
    cyl(mb, (x, y, z), (x, y + 0.9, z), 0.18, "steel2", 8)
    box(mb, xf((0, 1.1, 0.1), c, rot), (0.45, 0.4, 0.9), "steel", rot)
    cyl(mb, xf((0, 1.2, -0.3), c, rot), xf((0, 1.32, -2.6), c, rot), 0.06, "dark", 5)
    box(mb, xf((0, 1.25, -0.5), c, rot), (0.9, 0.7, 0.05), "steel2", rot)
    box(mb, xf((0, 1.42, 0.2), c, rot), (0.18, 0.3, 0.4), "dark", rot)
for x, z in P["single25"]:
    for sg in (-1, 1): single25((sg * x, deckY(z), z), (0.9 if z < 0 else 2.4) * -sg)
# 九五式機銃射擊裝置（上層甲板四角）
for sg in (-1, 1):
    for x, y, z in ((8.4, 15.8, -2.6), (9.0, 15.8, 36.0)):
        x *= sg; cyl(mb, (x, y, z), (x, y + 1.0, z), 0.2, "steel2", 6)
        box(mb, (x, y + 1.2, z), (1.4, 0.3, 0.4), "steel"); box(mb, (x, y + 1.25, z - 0.21), (0.9, 0.18, 0.04), "lens")
        box(mb, (x, y + 0.5, z + 0.5), (0.4, 0.08, 0.4), "dark")
# 斜梯（上層結構各層之間）
def ladder(p0, p1, wdt=0.7):
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; n = max(2, int(d.length / 0.3))
    side = Vector((0, 1, 0)).cross(d).normalized() * wdt / 2 if abs(d.x) + abs(d.z) > 0.01 else Vector((wdt / 2, 0, 0))
    for sgn in (-1, 1): cyl(mb, tuple(p0 + side * sgn), tuple(p1 + side * sgn), 0.05, "dark", 4)
    for i in range(1, n): q = p0 + d * (i / n); cyl(mb, tuple(q - side), tuple(q + side), 0.03, "dark", 3, False)
for sg in (-1, 1):
    ladder((sg * 13.4, 12.2, -0.4), (sg * 11.2, 15.8, 2.2))
    ladder((sg * 9.6, 15.8, 34.8), (sg * 5.5, 19.5, 31.8))
    ladder((sg * 16.2, 8.3, 41.5), (sg * 15.2, 12.2, 38.6))
fine = finish(mb, "fine", static=False, sharp=0); fine.parent = LOD0

# ---------------- 機砲座、高角砲座原型 ----------------
mb = MB(); mount25(mb, (0, 0, 0), 0.0)
# 圓形防彈圍（1945 線圖俯視：機砲座是直徑約 5 m 的大圓筒，舷邊的會伸出甲板外；遠看上層結構的「毛茸茸」輪廓主要來自這些圓筒）
AR = 2.5
revolve(mb, [(0, AR), (1.15, AR)], (0, 0, 0), (0, 1, 0), "steel2", 18, False)
revolve(mb, [(0, AR - 0.13), (1.15, AR - 0.13)], (0, 0, 0), (0, 1, 0), "steel2", 18, False)
revolve(mb, [(1.15, AR - 0.13), (1.15, AR)], (0, 0, 0), (0, 1, 0), "steel2", 18, False)
cyl(mb, (0, -0.02, 0), (0, 0.04, 0), AR, "steel2", 18)                                              # 台面
cyl(mb, (0, -0.9, 0), (0, -0.02, 0), AR * 0.55, "steel2", 12, False, AR)                           # 下方漏斗形托座（伸出甲板外的不懸空）
AAP = finish(mb, "AA25", static=False)
def ha127(mb, c, rot):
    """八九式 12.7 cm 連裝高角砲（A1 型防盾）：圓頂防盾、雙管、旋轉座。"""
    cyl(mb, xf((0, 0, 0), c, rot), xf((0, 0.6, 0), c, rot), 1.5, "steel2", 12)
    prism(mb, c, [(0.6, oct_ring(3.6, 4.6, 1.2)), (2.5, oct_ring(3.3, 4.0, 1.2)), (3.0, oct_ring(2.4, 2.8, 0.9))], "steel", rot)
    for k in (-0.55, 0.55):
        cyl(mb, xf((k, 1.7, -1.9), c, rot), xf((k, 1.95, -6.6), c, rot), 0.14, "dark", 8)
        cyl(mb, xf((k, 1.7, -1.9), c, rot), xf((k, 1.75, -2.8), c, rot), 0.26, "steel2", 8)
    box(mb, xf((0, 1.6, 2.2), c, rot), (1.2, 1.2, 0.3), "dark", rot)
    for k in (-0.55, 0.55):
        cyl(mb, xf((k, 1.95, -6.6), c, rot), xf((k, 1.96, -6.75), c, rot), 0.19, "dark", 8)         # 砲口
        box(mb, xf((k * 1.8, 1.7, -2.36), c, rot), (0.5, 0.6, 0.06), "dark", rot)                   # 防盾砲眼
        cyl(mb, xf((k, 2.15, -2.2), c, rot), xf((k, 2.2, -3.4), c, rot), 0.1, "steel2", 6)           # 駐退機
    for sg in (-1, 1):
        box(mb, xf((sg * 1.82, 1.6, 0.4), c, rot), (0.06, 1.0, 0.8), "dark", rot)                   # 側門
        box(mb, xf((sg * 0.9, 3.05, 0.2), c, rot), (0.35, 0.3, 0.35), "steel2", rot)                # 頂部照準口
    box(mb, xf((0, 1.0, 2.6), c, rot), (2.2, 0.8, 0.8), "steel2", rot)                              # 信管測合機／彈藥台
    for sg in (-1, 1): box(mb, xf((sg * 2.2, 0.5, 1.6), c, rot), (0.8, 1.0, 1.4), "steel2", rot)     # 待用彈藥箱
mb = MB(); ha127(mb, (0, 0, 0), 0.0); HAP = finish(mb, "HA127", static=False)

mounts = {"aa": [], "ha": []}
snapY = lambda z, y: deckY(z) + 0.05 if y < 10.5 else y
for x, y, z, r, zn in P["aa25"]["mirror"]:
    y = snapY(z, y)
    mounts["aa"].append([x, y, z, -r, zn + "R" if zn == "M" else zn]); mounts["aa"].append([-x, y, z, r, zn + "L" if zn == "M" else zn])
for x, y, z, r, zn in P["aa25"]["center"]:
    y = snapY(z, y) + H["camber"]; mounts["aa"].append([x, y, z, r, zn])
for x, y, z in HA["pos"]:
    mounts["ha"].append([x, y, z, -math.pi / 2, "R"]); mounts["ha"].append([-x, y, z, math.pi / 2, "L"])
mounts["aa"] = [[round(v, 3) if isinstance(v, float) else v for v in m] for m in mounts["aa"]]
mounts["ha"] = [[round(v, 3) if isinstance(v, float) else v for v in m] for m in mounts["ha"]]

# ---------------- 貼圖 ----------------
def tex_deck(path, W=4096, Hh=1024):
    img = Image.new("RGB", (W, Hh), (180, 162, 126)); dr = ImageDraw.Draw(img); rnd = random.Random(3)
    px = lambda z, x: ((z - Z0) / L * W, (1 - (x + 20) / 40) * Hh)
    pw = 0.36; n = int(40 / pw)
    for i in range(n):   # 木條：每條色差、錯開的端接縫
        x0 = -20 + i * pw; base = rnd.uniform(0.9, 1.08)
        z = Z0; off = rnd.uniform(0, 8)
        while z < -Z0:
            ln = rnd.uniform(6.0, 9.0); k = base * rnd.uniform(0.95, 1.05)
            c = tuple(int(v * k) for v in (182, 163, 128))
            a, b = px(z + off * 0, x0), px(z + ln, x0 + pw)
            dr.rectangle([a[0], b[1], b[0], a[1]], fill=c)
            dr.line([px(z, x0), px(z, x0 + pw)], fill=(120, 100, 70), width=1)
            z += ln
        dr.line([px(Z0, x0), px(-Z0, x0)], fill=(132, 112, 80), width=1)
    steel = (104, 108, 110); steel2 = (88, 92, 94)
    # 鋼質區：艦艏錨甲板、主砲座周圍、艦艉飛機甲板（含軌道）
    def poly_steel(zs, xs_):
        dr.polygon([px(z, x) for z, x in zip(zs, xs_)], fill=steel)
    zz = [Z0 + i * 0.5 for i in range(0, 91)]   # 艦艏鋼甲板到 z≈-86（線圖）
    dr.polygon([px(z, halfDeck(z) + 0.5) for z in zz] + [px(z, -halfDeck(z) - 0.5) for z in zz[::-1]], fill=steel)
    for sg in (-1, 1):   # 錨鏈走道（鋼板帶，往起錨機延伸）
        dr.polygon([px(-122.0, sg * 4.6), px(-122.0, sg * 2.2), px(-97.0, sg * 0.6), px(-97.0, sg * 2.8)], fill=steel2)
    for z in range(-128, -86, 2): dr.line([px(z, -halfDeck(z)), px(z, halfDeck(z))], fill=(92, 96, 98), width=1)   # 鋼板接縫
    for t in P["main"] + P["sec"]:
        r = (M_S if t in P["main"] else S_S)["barbR"] + 1.2; a, b = px(t["z"] - r, -r), px(t["z"] + r, r)
        dr.ellipse([a[0], b[1], b[0], a[1]], fill=steel2)
    zz = [69.4 + i * 0.5 for i in range(int((-Z0 - 69.4) * 2))]   # 三號砲塔後方起為鋼甲板（線圖）
    dr.polygon([px(z, halfDeck(z) + 0.5) for z in zz] + [px(z, -halfDeck(z) - 0.5) for z in zz[::-1]], fill=steel)
    for x in (-1.2, 1.2):   # 飛機搬運軌道
        dr.line([px(P["hull"]["stepZ"] + 2, x), px(-Z0 - 4, x)], fill=(40, 40, 42), width=3)
    for sg in (-1, 1):
        dr.line([px(96, sg * 1.2), px(110, sg * Sn["catX"])], fill=(40, 40, 42), width=3)
    for z in range(80, 128, 4): dr.line([px(z, -8), px(z, 8)], fill=(80, 84, 86), width=1)
    # 甲板邊緣排水溝（深色細線）
    for sg in (-1, 1):
        dr.line([px(z, sg * (halfDeck(z) - 0.25)) for z in [Z0 + i for i in range(int(L) + 1)]], fill=(70, 70, 70), width=3)
    rn = random.Random(9)   # 木甲板釘孔列（每 1.2 m 一排橫樑位置的小黑點）、上層結構周圍的污漬
    for z in [Z0 + 30 + i * 1.2 for i in range(int((L - 60) / 1.2))]:
        if P["hull"]["stepZ"] < z: break
        for x in [-19 + k * 0.36 for k in range(106)]:
            if abs(x) < halfDeck(z) - 0.6 and rn.random() < 0.8:
                a = px(z, x + 0.18); dr.point((a[0], a[1]), fill=(128, 108, 76))
    ov = Image.new("RGBA", (W, Hh), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    for _ in range(260):
        z = rn.uniform(-60, 75); x = rn.uniform(-15, 15); r = rn.uniform(0.6, 2.5); a, b = px(z - r, x - r), px(z + r, x + r)
        od.ellipse([a[0], b[1], b[0], a[1]], fill=(70, 60, 50, rn.randint(10, 35)))
    img = Image.alpha_composite(img.convert("RGBA"), ov.filter(ImageFilter.GaussianBlur(3))).convert("RGB"); dr = ImageDraw.Draw(img)
    img = img.filter(ImageFilter.GaussianBlur(0.5))
    noise = Image.effect_noise((W // 2, Hh // 2), 30).resize((W, Hh)).convert("RGB")
    img = Image.blend(img, noise, 0.05); img.save(path)
def tex_hull(path, W=4096, Hh=512):
    img = Image.new("RGB", (W, Hh)); dr = ImageDraw.Draw(img); rnd = random.Random(5)
    py = lambda y: (1 - (y + 11) / 23) * Hh; pz = lambda z: (z - Z0) / L * W
    grey = (122, 128, 132)
    dr.rectangle([0, 0, W, py(0.9)], fill=grey)
    dr.rectangle([0, py(0.9), W, py(-0.7)], fill=(30, 30, 32))             # 水線帶（黑）
    dr.rectangle([0, py(-0.7), W, Hh], fill=(118, 44, 38))                  # 水線下防污漆（紅）
    for i in range(int(L / 2.2)):   # 船殼板接縫
        z = Z0 + i * 2.2; dr.line([(pz(z), py(13)), (pz(z), py(1.2))], fill=(113, 119, 123), width=1)
    for y in (3.2, 6.0): dr.line([(0, py(y)), (W, py(y))], fill=(113, 119, 123), width=1)
    B_ = P["hull"]["belt"]   # 舷側裝甲帶：稍深的一條
    dr.rectangle([pz(B_["z0"]), py(B_["y1"]), pz(B_["z1"]), py(0.9)], fill=(115, 121, 125))
    for row_y, z0, z1 in ((5.0, -112, -70), (6.9, -112, -66), (5.0, 68, 122), (6.9, 64, 124), (4.8, -66, 64)):
        z = z0
        while z < z1:
            if rnd.random() > 0.12:
                x, y = pz(z), py(row_y); dr.ellipse([x - 3.2, y - 3.2, x + 3.2, y + 3.2], fill=(80, 86, 90)); dr.ellipse([x - 2.2, y - 2.2, x + 2.2, y + 2.2], fill=(28, 30, 32))
            z += 2.4 if row_y > 4.9 or z0 < -60 or z0 > 60 else 4.8
    # 吃水標記（艦艏、艦艉，白色刻度：每 1 m 一格）
    for zm in (-127.5, 125.5):
        for yy in range(-10, 1):
            y = py(yy); x = pz(zm); dr.rectangle([x - 3, y - 2, x + 3, y + 2], fill=(205, 205, 200))
            if yy % 2 == 0: dr.rectangle([x + 5, y - 2, x + 9, y + 2], fill=(205, 205, 200))
    # 舷側排水口（甲板下緣）、舷窗上方雨眉
    for i in range(int(L / 6)):
        z = Z0 + 4 + i * 6; dr.rectangle([pz(z) - 2, py(7.9), pz(z) + 2, py(7.6)], fill=(40, 42, 44))
    for row_y, z0, z1 in ((5.0, -112, -70), (6.9, -112, -66), (5.0, 68, 122), (6.9, 64, 124), (4.8, -66, 64)):
        dr.line([(pz(z0), py(row_y + 0.35)), (pz(z1), py(row_y + 0.35))], fill=(109, 115, 119), width=1)
    ov = Image.new("RGBA", (W, Hh), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    for z in (-123.0,):   # 錨鏈孔下方鏽痕
        for k in range(6): od.line([(pz(z) + k * 2 - 5, py(6.8)), (pz(z) + k * 2 - 5 + rnd.uniform(-2, 2), py(rnd.uniform(2.0, 4.0)))], fill=(90, 58, 38, 90), width=2)
    for i in range(int(L / 6)):   # 排水口下方水漬
        z = Z0 + 4 + i * 6; od.line([(pz(z), py(7.6)), (pz(z), py(rnd.uniform(3, 6)))], fill=(60, 58, 52, 40), width=2)
    for _ in range(160):   # 鏽痕與水漬
        z = rnd.uniform(Z0, -Z0); y = rnd.uniform(2, 9); od.line([(pz(z), py(y)), (pz(z) + rnd.uniform(-2, 2), py(y - rnd.uniform(1, 4)))], fill=(70, 55, 45, rnd.randint(20, 60)), width=rnd.randint(1, 3))
    img = Image.alpha_composite(img.convert("RGBA"), ov.filter(ImageFilter.GaussianBlur(1))).convert("RGB")
    img.save(path)
TP_D = os.path.join(TEXD, "_yamato_deck.png"); TP_H = os.path.join(TEXD, "_yamato_hull.png")
tex_deck(TP_D); tex_hull(TP_H)
for nm, pth in (("deck", TP_D), ("hull", TP_H)):
    mat(nm); bi = bpy.data.images[nm]; bi.filepath = pth; bi.source = "FILE"; bi.reload()

# ---------------- 組合、LOD、輸出 ----------------
def join(obs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]; bpy.ops.object.join(); obs[0].name = name; obs[0].data.name = name; return obs[0]
tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
hull = join(statics, "hull"); hull.parent = LOD0
layout = {"main": [[t["name"], t["z"], t["y"], t["rot"]] for t in P["main"]], "sec": [[t["name"], t["z"], t["y"], t["rot"]] for t in P["sec"]],
          "bridge": [0, 31.0, P["tower"]["z"]], "funnel": [0, 27.0, P["funnel"]["z"] + 3.5], "mast": [0, 30.0, P["mast"]["z"] + 3],
          "mainBarrel": M_S["barrel"], "secBarrel": S_S["barrel"], "deck": [[round(z, 1), round(deckY(z), 2), round(halfDeck(z), 2), round(FW(z), 2)] for z in range(-130, 132, 4)]}
LOD0["layout"] = json.dumps(layout, separators=(",", ":")); LOD0["mounts"] = json.dumps(mounts, separators=(",", ":"))
bpy.context.view_layer.update()
mesh_nodes = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in ("AA25", "HA127", "fine")]
FINE = bpy.data.objects["fine"]
n_aa, n_ha = len(mounts["aa"]), len(mounts["ha"])
stats = {"hull": tri(hull), "fine": tri(FINE), "nodes": sum(tri(o) for o in mesh_nodes if o is not hull), "AA25": tri(AAP), "HA127": tri(HAP), "aaN": n_aa, "haN": n_ha}
stats["LOD0"] = stats["hull"] + stats["fine"] + stats["nodes"] + stats["AA25"] * n_aa + stats["HA127"] * n_ha
# LOD1／LOD2：全部（含機砲座擺好）合併、減面
def place_copies(proto, lst):
    out = []
    for x, y, z, r, _ in lst:
        d = proto.copy(); d.data = proto.data.copy(); d.parent = None
        d.matrix_world = Matrix.Translation(B(x, y, z)) @ Matrix.Rotation(r, 4, 'Z'); bpy.context.collection.objects.link(d); out.append(d)
    return out
for name, target in P["lods"].items():
    dup = []
    for o in mesh_nodes:
        d = o.copy(); d.data = o.data.copy(); d.parent = None; d.matrix_world = o.matrix_world.copy()
        for k in list(d.keys()): del d[k]
        bpy.context.collection.objects.link(d); dup.append(d)
    if name == "LOD1": dup += place_copies(AAP, mounts["aa"]) + place_copies(HAP, mounts["ha"])
    else: dup += place_copies(HAP, mounts["ha"])
    j = join(dup, name)
    bpy.context.view_layer.objects.active = j; bpy.ops.object.select_all(action='DESELECT'); j.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(j.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.02)
    if name == "LOD2":
        # 6 km 外：先丟掉小零件（欄杆段、線纜、小箱子等對角線 < 2.5 m 的獨立塊），再平面溶解，最後才塌縮減面。
        # 原本整艘直接塌縮到 7%，艦體被吃出大洞、上層結構碎成片（修前 LOD2 破面）。
        bm.verts.ensure_lookup_table(); seen = set(); kill = []
        for v0 in bm.verts:
            if v0.index in seen: continue
            isl = [v0]; seen.add(v0.index); k = 0
            while k < len(isl):
                for e in isl[k].link_edges:
                    w = e.other_vert(isl[k])
                    if w.index not in seen: seen.add(w.index); isl.append(w)
                k += 1
            xs_ = [v.co.x for v in isl]; ys_ = [v.co.y for v in isl]; zs_ = [v.co.z for v in isl]
            if math.dist((min(xs_), min(ys_), min(zs_)), (max(xs_), max(ys_), max(zs_))) < 2.5: kill += isl
        bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(j.data); bm.free()
    if name == "LOD2":
        m = j.modifiers.new("pl", "DECIMATE"); m.decimate_type = 'DISSOLVE'; m.angle_limit = math.radians(4); bpy.ops.object.modifier_apply(modifier="pl")
        m = j.modifiers.new("tr", "TRIANGULATE"); bpy.ops.object.modifier_apply(modifier="tr")
    m = j.modifiers.new("dec", "DECIMATE"); m.ratio = min(1.0, target / max(1, tri(j)))
    bpy.ops.object.modifier_apply(modifier="dec")
    # 減面後重算法線並依角度切硬邊（否則整片平滑法線會讓砲塔、甲板室變成圓鼓鼓的，1.6 km 切 LOD 時明暗跳動）
    bm = bmesh.new(); bm.from_mesh(j.data); bm.normal_update()
    se = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(40)]
    bmesh.ops.split_edges(bm, edges=se)
    for f in bm.faces: f.smooth = True
    bm.to_mesh(j.data); bm.free(); stats[name] = tri(j)
bpy.context.view_layer.update()
pts = [o.matrix_world @ v.co for o in mesh_nodes for v in o.data.vertices]
xs = [p.x for p in pts]; ys = [p.y for p in pts]; zs = [p.z for p in pts]
dims = {"length": max(ys) - min(ys), "beam": max(xs) - min(xs), "draft": -min(zs), "height": max(zs)}
# 水線寬：取 |y|<0.3 的艦體頂點
hv = [hull.matrix_world @ v.co for v in hull.data.vertices]
wl = [abs(p.x) for p in hv if abs(p.z) < 0.4]; dims["wlBeam"] = 2 * max(wl) if wl else 0
RAW = OUT + ".raw.glb"
bpy.ops.export_scene.gltf(filepath=RAW, export_format='GLB', export_yup=True, export_extras=True, export_image_format='JPEG', export_vertex_color='ACTIVE', export_all_vertex_colors=False)
TOOL = os.path.join(HERE, "..", "node_modules", ".bin", "gltf-transform")
subprocess.run([TOOL, "meshopt", RAW, OUT + ".m.glb"], check=True, capture_output=True)
subprocess.run([TOOL, "webp", OUT + ".m.glb", OUT, "--quality", "80"], check=True, capture_output=True)
for f in (RAW, OUT + ".m.glb"): os.remove(f)
ref = P["dims"]
rep = {"file": OUT, "bytes": os.path.getsize(OUT), "triangles": stats, "dims": {k: round(v, 3) for k, v in dims.items()},
       "dimsErrorPct": {k: round(100 * (dims[k] - ref[k]) / ref[k], 2) for k in ("length", "beam", "wlBeam", "draft")}}
print("REPORT " + json.dumps(rep, ensure_ascii=False))
BG = P["budget"]
print("BUDGET LOD0 %d/%d %s  bytes %d/%d %s" % (stats["LOD0"], BG["lod0Tris"], "ok" if stats["LOD0"] <= BG["lod0Tris"] else "OVER", rep["bytes"], BG["bytes"], "ok" if rep["bytes"] <= BG["bytes"] else "OVER"))
bad = [k for k, v in rep["dimsErrorPct"].items() if abs(v) >= 2]
print("CHECK dims " + ("ok" if not bad else "OFF " + ",".join(bad)))
