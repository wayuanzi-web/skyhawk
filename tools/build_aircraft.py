"""參數檔 → Blender（無介面）放樣 → 貼圖 → .glb（LOD0–3）→ meshopt／webp 壓縮。

用法：python3 tools/build_aircraft.py tools/fa18e.json assets/fa18e.glb
座標：參數用遊戲座標（x 右、y 上、z 往機尾，機頭在 -z）；Blender 內是 (x, -z, y)，輸出 glTF 時 Y 朝上，回到遊戲座標。
會動的零件是獨立節點，extras 帶 pivot（轉軸上一點）與 axis（轉軸方向），遊戲端繞這條軸轉。
"""
import bpy, bmesh, json, math, sys, os, random, subprocess
from mathutils import Vector
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
P = json.load(open(SRC))
HERE = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
B = lambda x, y, z: Vector((x, -z, y))          # 遊戲 → Blender
Gm = lambda v: (v.x, v.z, -v.y)                  # Blender → 遊戲
random.seed(7)

# ---------------- 材質 ----------------
TEX_PATH = os.path.join(os.path.dirname(os.path.abspath(OUT)), "_" + P["id"] + "_skin.png")
mats = {}
def mat(name):
    if name in mats: return mats[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    if name == "skin":
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.new("skin", 8, 8)
        nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.6; b.inputs["Metallic"].default_value = P["skin"].get("metal", 0.0)
    else:
        c = P["colors"][name]; b.inputs["Base Color"].default_value = (*c, 1)
        b.inputs["Roughness"].default_value = {"glass": 0.05, "visor": 0.1, "nozzle": 0.45, "tire": 0.9}.get(name, 0.6)
        b.inputs["Metallic"].default_value = {"nozzle": 0.7, "strut": 0.3}.get(name, 0.05)
        if name == "glass":
            b.inputs["Alpha"].default_value = 0.32
            try: m.surface_render_method = 'BLENDED'
            except Exception: m.blend_method = 'BLEND'
    mats[name] = m; return m

# ---------------- 幾何工具 ----------------
def spow(v, e): return math.copysign(abs(v) ** e, v)
def catmull(secs, sub):
    """截面之間用 Catmull-Rom 內插，讓機身縱向平順。"""
    if sub <= 1 or len(secs) < 3: return secs
    out = []
    n = len(secs)
    for i in range(n - 1):
        p0, p1, p2, p3 = secs[max(i - 1, 0)], secs[i], secs[i + 1], secs[min(i + 2, n - 1)]
        for k in range(sub):
            t = k / sub
            out.append([0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3)
                        for a, b, c, d in zip(p0, p1, p2, p3)])
    out.append(secs[-1]); return out
def ring(bm, sec, seg, xc=0.0, rakeY=0.0, rakeX=0.0, sgn=1, petals=0, pd=0.93, pz=0.07):
    z, w, ht, hb, yc, nt, nb = sec[:7]
    vs = []
    for k in range(seg):
        a = 2 * math.pi * k / seg; c, s = math.cos(a), math.sin(a)
        dx = w * spow(c, 2 / nt if s >= 0 else 2 / nb)
        dy = (ht * spow(s, 2 / nt)) if s >= 0 else (hb * spow(s, 2 / nb))
        zz = z + rakeY * dy + rakeX * dx * sgn
        if petals and k % 2: dx *= pd; dy *= pd; zz -= pz
        vs.append(bm.verts.new(B(xc + dx, yc + dy, zz)))
    return vs
def loft(bm, rings, mi=0, cap0=None, cap1=None):
    for a, b in zip(rings, rings[1:]):
        n = len(a)
        for k in range(n):
            f = bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k])); f.material_index = mi
    for r, c in ((rings[0], cap0), (rings[-1], cap1)):
        if c is False: continue
        try:
            f = bm.faces.new(r); f.material_index = mi if c is None else c
        except ValueError: pass
def box(bm, c, s, mi=0, rz=0.0):
    cx, cy, cz = c; sx, sy, sz = s
    co, si = math.cos(rz), math.sin(rz)
    vs = []
    for dz in (-1, 1):
        for dy in (-1, 1):
            for dx in (-1, 1):
                x, y = dx * sx / 2, dy * sy / 2
                vs.append(bm.verts.new(B(cx + x * co - y * si, cy + x * si + y * co, cz + dz * sz / 2)))
    for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        f = bm.faces.new([vs[i] for i in q]); f.material_index = mi
def cyl(bm, p0, p1, r, mi=0, seg=10, cap=True):
    p0, p1 = Vector(p0), Vector(p1); ax = (p1 - p0).normalized()
    u = ax.orthogonal().normalized(); v = ax.cross(u)
    rs = [[bm.verts.new(B(*(p + (u * math.cos(2 * math.pi * k / seg) + v * math.sin(2 * math.pi * k / seg)) * r))) for k in range(seg)] for p in (p0, p1)]
    loft(bm, rs, mi, None if cap else False, None if cap else False)
def revolve(bm, prof, c, mi=0, seg=12):
    """沿 z 軸旋轉體。prof=[(z相對, 半徑)]，c=(x,y,z起點)。"""
    rs = []
    for z, r in prof:
        r = max(r, 0.004)
        rs.append([bm.verts.new(B(c[0] + r * math.cos(2 * math.pi * k / seg), c[1] + r * math.sin(2 * math.pi * k / seg), c[2] + z)) for k in range(seg)])
    loft(bm, rs, mi)
def fins(bm, c, z0, z1, span, mi=0, n=4, rot=math.pi / 4, th=0.012, taper=0.5):
    for i in range(n):
        a = rot + 2 * math.pi * i / n; ca, sa = math.cos(a), math.sin(a)
        pts = [(0, z0), (span, z0 + (z1 - z0) * (1 - taper)), (span, z1), (0, z1)]
        top = [bm.verts.new(B(c[0] + r * ca - th * sa, c[1] + r * sa + th * ca, c[2] + z)) for r, z in pts]
        bot = [bm.verts.new(B(c[0] + r * ca + th * sa, c[1] + r * sa - th * ca, c[2] + z)) for r, z in pts]
        for q in (top, bot[::-1]): bm.faces.new(q).material_index = mi
        for k in range(4):
            bm.faces.new((top[k], top[(k + 1) % 4], bot[(k + 1) % 4], bot[k])).material_index = mi
def sphere(bm, c, r, mi=0, u=12, v=8, sy=1.0):
    ret = bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)
    for vv in ret["verts"]:
        vv.co.z *= sy; vv.co += B(*c)
    for f in {f for vv in ret["verts"] for f in vv.link_faces}: f.material_index = mi
    return ret["verts"]

# ---------------- 貼圖投影（盒狀投影到 2048×1024 的圖集） ----------------
TW, TH = P["skin"]["texW"], P["skin"]["texH"]
def region_uv(n, p):
    """n、p 為遊戲座標的法向與位置。回傳 Blender UV（v 往上）。"""
    nx, ny, nz = n; x, y, z = p
    if abs(ny) >= abs(nx) and abs(ny) >= abs(nz) * 0.9:
        u = (x + 7) / 14 * 0.25 + (0 if ny > 0 else 0.25); v = (z + 9.5) / 19
    elif abs(nx) >= abs(nz):
        if nx > 0: u = 0.5 + (9.5 - z) / 19 * 0.5; v = (y + 3) / 7.5 * 0.5
        else: u = 0.5 + (z + 9.5) / 19 * 0.5; v = 0.5 + (y + 3) / 7.5 * 0.5
    else:
        u = (x + 7) / 14 * 0.25 + (0 if y > 0.2 else 0.25); v = (z + 9.5) / 19
    return (min(max(u, 0.001), 0.999), min(max(v, 0.001), 0.999))

# ---------------- 物件 ----------------
statics, nodes = [], {}
CHECK = []
def finish(bm, name, materials, origin=(0, 0, 0), extras=None, static=True):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-5, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    vol = sum(f.verts[0].co.dot(f.verts[i].co.cross(f.verts[i + 1].co)) for f in bm.faces for i in range(1, len(f.verts) - 1)) / 6
    if vol < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    open_edges = sum(1 for e in bm.edges if len(e.link_faces) == 1)
    CHECK.append((name, round(vol, 4), open_edges))
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        n = Gm(f.normal)
        for l in f.loops: l[uv].uv = region_uv(n, Gm(l.vert.co))
    o = B(*origin)
    for v in bm.verts: v.co -= o
    sharp = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(40)]
    bmesh.ops.split_edges(bm, edges=sharp)
    for f in bm.faces: f.smooth = True
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in materials: me.materials.append(mat(m))
    ob = bpy.data.objects.new(name, me); ob.location = o; bpy.context.collection.objects.link(ob)
    if extras:
        for k, val in extras.items(): ob[k] = val
    (statics.append(ob) if static else nodes.__setitem__(name, ob))
    return ob

def solid(secs, seg, sub, name, mats_, xc=0.0, **kw):
    bm = bmesh.new()
    rings = [ring(bm, s, seg, xc, **kw) for s in catmull(secs, sub)]
    loft(bm, rings, 0, 1 if len(mats_) > 1 else None, 1 if len(mats_) > 1 else None)
    return finish(bm, name, mats_)

# 機身、背脊
F = P["fuselage"]; solid(F["sections"], F["seg"], F["sub"], "fuselage", ["skin", "dark"])
S = P["spine"]; solid(S["sections"], S["seg"], S["sub"], "spine", ["skin"])
# 進氣道（前緣斜切、唇口內深色）
I = P["intake"]
for sg in (1, -1):
    bm = bmesh.new()
    rings = [ring(bm, s, I["seg"], I["x"] * sg, I["rakeY"], I["rakeX"], sg) for s in catmull(I["sections"], I["sub"])]
    inner = [bm.verts.new(v.co.lerp(sum((w.co for w in rings[0]), Vector()) / len(rings[0]), 0.12) + B(0, 0, 0.18) - B(0, 0, 0)) for v in rings[0]]
    loft(bm, [inner] + rings, 0, 1, None)
    finish(bm, "intake", ["skin", "dark"])
# 噴嘴（尾端鋸齒狀調節片、內縮的深色內壁）
N = P["nozzle"]
for sg in (1, -1):
    bm = bmesh.new(); secs = N["sections"]
    rs = []
    for i, (z, r) in enumerate(secs):
        rs.append(ring(bm, [z, r, r, r, N["y"], 2, 2], N["seg"], N["x"] * sg, petals=(N["petals"] if i == len(secs) - 1 else 0), pd=N.get("petalDepth", 0.93), pz=N.get("petalZ", 0.07)))
    zE, rE = secs[-1]
    rs.append(ring(bm, [zE - 0.25, rE * 0.8, rE * 0.8, rE * 0.8, N["y"], 2, 2], N["seg"], N["x"] * sg))
    loft(bm, rs, 0, None, 1)
    finish(bm, "nozzle", ["nozzle", "dark"])
# 座艙罩（玻璃）＋擋風框
C = P["canopy"]
bm = bmesh.new(); loft(bm, [ring(bm, s, C["seg"]) for s in catmull(C["sections"], C["sub"])], 0)
finish(bm, "canopy", ["glass"], static=False)
bm = bmesh.new()
for zf in (-5.95, -3.62):
    sec = catmull(C["sections"], 8); sec = min(sec, key=lambda s: abs(s[0] - zf))
    r0 = ring(bm, [zf - 0.05, sec[1] * 1.03, sec[2] * 1.03 + 0.01, 0.01, sec[4], 2, 2], C["seg"])
    r1 = ring(bm, [zf + 0.05, sec[1] * 1.03, sec[2] * 1.03 + 0.01, 0.01, sec[4], 2, 2], C["seg"])
    loft(bm, [r0, r1], 0, False, False)
finish(bm, "frame", ["dark"])

# ---------------- 翼面 ----------------
def naca(f, tc):
    return 5 * tc * (0.2969 * math.sqrt(max(f, 0)) - 0.126 * f - 0.3516 * f * f + 0.2843 * f ** 3 - 0.1036 * f ** 4)
def sta(st, s, side):
    same = [x for x in st if abs(x[0] - s) < 1e-6]
    if same: return same[0] if side == 0 else same[-1]
    for a, b in zip(st, st[1:]):
        if a[0] <= s <= b[0]:
            t = (s - a[0]) / (b[0] - a[0]); return [a[i] + (b[i] - a[i]) * t for i in range(4)]
    return st[-1]
def frame(Sf, sg):
    rx, ry = Sf["root"]
    if "cant" in Sf:
        c = math.radians(Sf["cant"]); d = Vector((sg * math.sin(c), math.cos(c), 0)); t = Vector((sg * math.cos(c), -math.sin(c), 0))
    else:
        a = math.radians(Sf.get("dihedral", 0)); d = Vector((sg * math.cos(a), math.sin(a), 0)); t = Vector((-sg * math.sin(a), math.cos(a), 0))
    return Vector((rx * sg, ry, 0)), d, t
for Sf in P["surfaces"]:
    for sg in (1, -1):
        R0, d, t = frame(Sf, sg)
        pt = lambda s, z, h: R0 + d * s + t * h + Vector((0, 0, z))
        for pc in Sf["pieces"]:
            s0, s1 = pc["s"]; f0, f1 = pc["f"]
            ss = [s0] + [x[0] for x in Sf["stations"] if s0 + 1e-6 < x[0] < s1 - 1e-6] + [s1]
            ss2 = []
            for a, b in zip(ss, ss[1:]):
                k = max(1, int((b - a) / 1.2 + 0.999)); ss2 += [a + (b - a) * i / k for i in range(k)]
            ss2.append(ss[-1])
            n = max(4, int((f1 - f0) * 18) + 2)
            fs = [f0 + (f1 - f0) * (0.5 - 0.5 * math.cos(math.pi * i / (n - 1))) for i in range(n)]
            bm = bmesh.new(); rings = []
            for i, s in enumerate(ss2):
                side = 1 if i == 0 else 0
                _, le, ch, tc = sta(Sf["stations"], s, side)
                loop = [(f, naca(f, tc) * ch) for f in fs] + [(f, -naca(f, tc) * ch) for f in fs[::-1]]
                rings.append([bm.verts.new(B(*pt(s, le + f * ch, h))) for f, h in loop])
            loft(bm, rings, 0)
            if "node" in pc:
                if "pivotF" in pc:
                    _, le, ch, _ = sta(Sf["stations"], 0, 1); H0 = pt(0, le + pc["pivotF"] * ch, 0); ax = d.copy()
                else:
                    fh = f0 if pc["hinge"] == 0 else f1
                    a0, b0 = sta(Sf["stations"], s0, 1), sta(Sf["stations"], s1, 0)
                    H0 = pt(s0, a0[1] + fh * a0[2], 0); H1 = pt(s1, b0[1] + fh * b0[2], 0); ax = (H1 - H0)
                ax.normalize()
                if ("cant" in Sf and ax.y < 0) or ("cant" not in Sf and ax.x < 0): ax = -ax
                nm = pc["node"] + ("R" if sg > 0 else "L")
                finish(bm, nm, ["skin"], tuple(H0), {"pivot": [round(c, 4) for c in H0], "axis": [round(c, 5) for c in ax]}, static=False)
            else:
                finish(bm, Sf["name"], ["skin"])

# ---------------- 掛架與外掛 ----------------
W = next(s for s in P["surfaces"] if s["name"] == "wing")
def wing_at(x):
    s = (x - W["root"][0]) / math.cos(math.radians(3)); _, le, ch, tc = sta(W["stations"], s, 0)
    return W["root"][1] - s * math.sin(math.radians(3)), le, ch
GBU = [(0, 0.0), (0.05, 0.06), (0.22, 0.105), (0.48, 0.125), (0.62, 0.137), (2.55, 0.137), (2.95, 0.10), (3.27, 0.065)]
bomb_i = 0
for py in P["pylons"]:
    for sg in (-1, 1):
        x = py["x"] * sg; yw, le, ch = wing_at(py["x"]); zc = le + ch * 0.42; yb = yw - 0.40
        bm = bmesh.new(); box(bm, (x, yw - 0.18, zc), (0.13, 0.36, min(2.6, ch * 0.85)), 0, rz=-0.07 * sg); finish(bm, "pylon", ["store"])
        if py.get("store") == "bomb":
            c = (x - 0.02 * sg, yb - 0.15, zc - 1.75)
            bm = bmesh.new(); revolve(bm, GBU, c, 0, 12)
            fins(bm, c, 2.68, 3.25, 0.27, 1); fins(bm, c, 0.52, 0.72, 0.13, 1, taper=0.2)
            ctr = (c[0], c[1], c[2] + 1.6)
            finish(bm, "bomb%d" % bomb_i, ["bomb", "store"], ctr, {"store": "bomb"}, static=False); bomb_i += 1
T = P.get("centerTank")
if T:
  bm = bmesh.new()
  prof = [(z, T["r"] * math.pow(max(0.0, 1 - ((z - T["len"] / 2) / (T["len"] / 2)) ** 2), 0.42)) for z in [T["len"] * i / 14 for i in range(15)]]
  revolve(bm, prof, (0, T["y"], T["z"] - T["len"] / 2), 0, 16)
  fins(bm, (0, T["y"], T["z"] - T["len"] / 2), T["len"] - 0.75, T["len"] - 0.15, 0.32, 0, n=3, rot=math.pi / 2 + 2 * math.pi / 3)
  box(bm, (0, T["y"] + T["r"] + 0.12, T["z"]), (0.12, 0.3, 1.8), 0)
  finish(bm, "tank", ["store"])
AMRAAM = [(0, 0.0), (0.25, 0.06), (0.55, 0.089), (3.6, 0.089), (3.65, 0.07)]
A = P["cheekAAM"]
for sg in (-1, 1):
    c = (A["x"] * sg, A["y"], A["z"] - 1.8); bm = bmesh.new(); revolve(bm, AMRAAM, c, 0, 10)
    fins(bm, c, 1.35, 1.9, 0.20, 1); fins(bm, c, 3.15, 3.6, 0.22, 1, taper=0.1)
    finish(bm, "aim120" + ("R" if sg > 0 else "L"), ["white", "dark"], (c[0], c[1], c[2] + 1.8), {"store": "aim120"}, static=False)
SW = [(0, 0.0), (0.12, 0.045), (0.3, 0.064), (2.95, 0.064), (3.0, 0.05)]
A = P.get("tipAAM")
for sg in ((-1, 1) if A else ()):
    yw, le, ch = wing_at(A["x"] - 0.15)
    bm = bmesh.new(); box(bm, (sg * (A["x"] - 0.07), yw, A["z"] + 0.55), (0.09, 0.11, 2.6), 0); finish(bm, "rail", ["skin"])
    c = (sg * A["x"], yw - 0.10, A["z"] - 0.95); bm = bmesh.new(); revolve(bm, SW, c, 0, 10)
    fins(bm, c, 0.35, 0.62, 0.09, 1, taper=0.3); fins(bm, c, 2.55, 2.95, 0.12, 1, taper=0.2)
    finish(bm, "aim9" + ("R" if sg > 0 else "L"), ["white", "dark"], (c[0], c[1], c[2] + 1.5), {"store": "aim9"}, static=False)
# 小細節：機砲口、加油管整流罩、天線
if P.get("blades", True): bm = bmesh.new(); box(bm, (0, 0.47, -7.25), (0.09, 0.05, 0.35), 0); finish(bm, "gunport", ["dark"])
if P.get("probe", True): bm = bmesh.new(); revolve(bm, [(0, 0.0), (0.25, 0.07), (1.3, 0.085), (1.6, 0.05)], (0.50, 0.42, -6.9), 0, 10); finish(bm, "probe", ["skin"])
for z, h in (((-2.3, 0.22), (2.5, 0.16)) if P.get("blades", True) else ()):
    bm = bmesh.new(); box(bm, (0, 0.95 if z < 0 else 0.92, z), (0.025, h, 0.30), 0); finish(bm, "blade", ["dark"])

# ---------------- 座艙內部與飛行員 ----------------
bm = bmesh.new()
# 儀表遮光罩：半橢圓殼
cw = [ring(bm, [z, w, h, 0.01, 0.62, 2.2, 2], 16) for z, w, h in ((-5.95, 0.30, 0.12), (-5.70, 0.40, 0.20), (-5.35, 0.42, 0.20))]
loft(bm, cw, 0)
box(bm, (0, 0.90, -5.78), (0.22, 0.17, 0.02), 0)                       # 抬頭顯示器框
# 彈射椅：椅背、椅頭、兩側
box(bm, (0, 0.86, -3.86), (0.46, 0.60, 0.16), 1)
box(bm, (0, 1.16, -3.92), (0.36, 0.16, 0.28), 1)
for sx in (-0.23, 0.23): box(bm, (sx, 0.74, -4.02), (0.05, 0.34, 0.44), 1)
box(bm, (0, 1.27, -3.95), (0.10, 0.04, 0.10), 5)                       # 彈射把手（黃黑）
# 飛行員：軀幹（上寬下窄的放樣）、肩、手臂、頭盔與面罩
tor = [ring(bm, [z, w, h, h, y, 2.4, 2.4], 12) for z, w, h, y in ((-4.30, 0.17, 0.10, 0.66), (-4.22, 0.21, 0.12, 0.80), (-4.14, 0.23, 0.11, 0.92), (-4.10, 0.18, 0.08, 0.99))]
loft(bm, tor, 2)
for sx in (-1, 1):
    cyl(bm, (sx * 0.22, 0.95, -4.13), (sx * 0.24, 0.78, -4.40), 0.055, 2, 8)
    cyl(bm, (sx * 0.24, 0.78, -4.40), (sx * 0.12, 0.72, -4.70), 0.05, 2, 8)
cyl(bm, (0, 0.98, -4.16), (0, 1.07, -4.19), 0.06, 2, 8)
hv = sphere(bm, (0, 1.15, -4.20), 0.135, 3, 14, 10, sy=1.08)
for f in {f for v in hv for f in v.link_faces}:
    g = Gm(f.calc_center_median())
    if g[2] < -4.25 and 1.08 < g[1] < 1.22: f.material_index = 4
finish(bm, "cockpit", ["dark", "seat", "suit", "helmet", "visor", "warn"], static=False)

# ---------------- 起落架、尾鉤 ----------------
GY = P["groundY"]; GN, GM = P["gear"]["nose"], P["gear"]["main"]
# 鼻輪：往前收；主輪：往內收；艙門：輪子收起後關上（每個都是獨立節點，帶轉軸與轉動軸資料）
bm = bmesh.new()
ax_n = (GN["x"], GY + GN["wheelR"], GN["axleZ"])
cyl(bm, (GN["x"], GN["top"], GN["z"]), ax_n, 0.07, 1, 10)
cyl(bm, (GN["x"], GN["top"] - 0.25, GN["z"] - 0.05), (GN["x"], GN["top"] - 0.65, GN["z"] - 0.25), 0.035, 1, 6)
for dx in (-GN["twin"], GN["twin"]):
    cyl(bm, (dx - GN["wheelW"] / 2, ax_n[1], ax_n[2]), (dx + GN["wheelW"] / 2, ax_n[1], ax_n[2]), GN["wheelR"], 0, 14)
    cyl(bm, (dx - GN["wheelW"] / 2 - 0.01, ax_n[1], ax_n[2]), (dx + GN["wheelW"] / 2 + 0.01, ax_n[1], ax_n[2]), GN["wheelR"] * 0.5, 1, 10)
cyl(bm, (0, ax_n[1] + 0.05, ax_n[2] - 0.1), (0, GY + 0.16, ax_n[2] - 0.95), 0.03, 1, 6)       # 彈射拖桿
pv = [GN["x"], GN["top"], GN["z"]]
finish(bm, "gearN", ["tire", "strut", "skin"], tuple(pv), {"pivot": pv, "axis": [1, 0, 0]}, static=False)
for sx, nm in ((-0.24, "doorNL"), (0.24, "doorNR")):                                              # 鼻輪艙門
    bm = bmesh.new(); box(bm, (sx, -0.86, GN["z"] - 0.15), (0.02, 0.32, 0.7), 2)
    pv = [sx, -0.70, GN["z"] - 0.15]; finish(bm, nm, ["tire", "strut", "skin"], tuple(pv), {"pivot": pv, "axis": [0, 0, 1]}, static=False)
for sg, nm in ((-1, "L"), (1, "R")):
    bm = bmesh.new()
    ax_m = (sg * GM["x"], GY + GM["wheelR"], GM["axleZ"])
    cyl(bm, (sg * (GM["x"] - 0.26), GM["top"], GM["z"]), ax_m, 0.09, 1, 10)
    cyl(bm, (sg * (GM["x"] - 0.63), -0.70, GM["z"] - 0.65), (sg * (GM["x"] - 0.13), -1.25, GM["z"] + 0.05), 0.045, 1, 6)
    cyl(bm, (ax_m[0] - GM["wheelW"] / 2, ax_m[1], ax_m[2]), (ax_m[0] + GM["wheelW"] / 2, ax_m[1], ax_m[2]), GM["wheelR"], 0, 16)
    cyl(bm, (ax_m[0] - GM["wheelW"] / 2 - 0.01, ax_m[1], ax_m[2]), (ax_m[0] + GM["wheelW"] / 2 + 0.01, ax_m[1], ax_m[2]), GM["wheelR"] * 0.55, 1, 12)
    pv = [sg * (GM["x"] - 0.26), GM["top"], GM["z"]]; finish(bm, "gearM" + nm, ["tire", "strut", "skin"], tuple(pv), {"pivot": pv, "axis": [0, 0, 1]}, static=False)
    bm = bmesh.new(); box(bm, (sg * (GM["x"] + 0.12), -1.05, GM["z"] - 0.1), (0.02, 0.6, 1.1), 2, rz=0.15 * sg)  # 主輪艙門
    pv = [sg * (GM["x"] + 0.08), -0.76, GM["z"] - 0.1]; finish(bm, "doorM" + nm, ["tire", "strut", "skin"], tuple(pv), {"pivot": pv, "axis": [0, 0, 1]}, static=False)
H = P.get("hook")
if H:
  bm = bmesh.new(); cyl(bm, (0, 0, 0), (0, 0, H["length"]), 0.05, 0, 8)
  box(bm, (0, -0.07, H["length"] + 0.05), (0.12, 0.16, 0.18), 1)
  for v in bm.verts: v.co += B(*H["pivot"])
  finish(bm, "hook", ["dark", "white"], tuple(H["pivot"]), {"pivot": H["pivot"], "axis": [1, 0, 0]}, static=False)

# ---------------- 貼圖 ----------------
sk = P["skin"]
img = Image.new("RGB", (TW, TH)); px = img.load()
TOP = tuple(int(c * 255) for c in sk["top"]); BOT = tuple(int(c * 255) for c in sk["bottom"])
def sidecol(y):
    t = min(max((y + 0.25) / 0.7, 0), 1); return tuple(int(b + (a - b) * t) for a, b in zip(TOP, BOT))
dr = ImageDraw.Draw(img)
dr.rectangle([0, 0, TW // 4, TH], fill=TOP); dr.rectangle([TW // 4, 0, TW // 2, TH], fill=BOT)
for r in range(TH):
    v = 1 - (r + 0.5) / TH
    y = (v / 0.5 * 7.5 - 3) if v < 0.5 else ((v - 0.5) / 0.5 * 7.5 - 3)
    dr.line([(TW // 2, r), (TW, r)], fill=sidecol(y))
# 座標 → 圖素
def pix(region, x=0, y=0, z=0):
    if region == "top": u, v = (x + 7) / 14 * 0.25, (z + 9.5) / 19
    elif region == "bot": u, v = 0.25 + (x + 7) / 14 * 0.25, (z + 9.5) / 19
    elif region == "R": u, v = 0.5 + (9.5 - z) / 19 * 0.5, (y + 3) / 7.5 * 0.5
    else: u, v = 0.5 + (z + 9.5) / 19 * 0.5, 0.5 + (y + 3) / 7.5 * 0.5
    return (u * TW, (1 - v) * TH)
def shade(c, k): return tuple(max(0, min(255, int(ch * k))) for ch in c)
# 迷彩（選用）：上面與兩側畫不規則色塊
for ci, cc in enumerate(sk.get("camo", [])):
    col = tuple(int(c * 255) for c in cc); rnd = random.Random(100 + ci)
    for reg in ("top", "R", "L"):
        for _ in range(26):
            z0 = rnd.uniform(-9, 9); x0 = rnd.uniform(-6.5, 6.5); y0 = rnd.uniform(-0.2, 2.8); r = rnd.uniform(0.6, 1.6)
            pts = []
            for k in range(9):
                a = k / 9 * 6.283; rr = r * rnd.uniform(0.6, 1.2)
                pts.append(pix(reg, x0 + math.cos(a) * rr, 0, z0 + math.sin(a) * rr * 1.4) if reg == "top" else pix(reg, 0, y0 + math.sin(a) * rr * 0.5, z0 + math.cos(a) * rr * 1.4))
            dr.polygon(pts, fill=col)
# 面板色差（補漆的斑駁感）
for reg in ("top", "bot", "R", "L"):
    for _ in range(140):
        if reg in ("top", "bot"):
            x0 = random.uniform(-6.5, 6.5); z0 = random.uniform(-8.5, 8.5); w = random.uniform(0.3, 1.2); h = random.uniform(0.3, 1.0)
            a, b = pix(reg, x0, 0, z0), pix(reg, x0 + w, 0, z0 + h); base = TOP if reg == "top" else BOT
        else:
            z0 = random.uniform(-8.5, 8.5); y0 = random.uniform(-1, 2.6); w = random.uniform(0.3, 1.0); h = random.uniform(0.2, 0.6)
            a, b = pix(reg, 0, y0, z0), pix(reg, 0, y0 + h, z0 + w); base = sidecol(y0)
        dr.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=shade(base, random.uniform(0.95, 1.05)))
LINE = sk["line"]
def pline(reg, pts, k=LINE, w=1):
    q = [pix(reg, *p) for p in pts]; base = TOP if reg == "top" else BOT if reg == "bot" else sidecol(pts[0][1])
    dr.line(q, fill=shade(base, k), width=w)
# 機身隔框線
for z in [-6.9 + 0.95 * i for i in range(17)]:
    hw = 0.45 if z < -3 else 0.95 if z < -1 else 1.5
    for reg in ("top", "bot"): pline(reg, [(-hw, 0, z), (hw, 0, z)])
    for reg in ("R", "L"): pline(reg, [(0, -0.9, z), (0, 0.75, z)])
for reg in ("R", "L"):
    pline(reg, [(0, 0.15, -6.9), (0, 0.15, 8.2)]); pline(reg, [(0, -0.55, -2.9), (0, -0.55, 6.5)])
for reg in ("top", "bot"):
    for sx in (-0.42, 0.42): pline(reg, [(sx, 0, -6.9), (sx, 0, 8.2)])
# 雷達罩分界、主翼板線、檢修口
for reg in ("top", "bot"): pline(reg, [(-0.6, 0, -6.95), (0.6, 0, -6.95)], 0.72, 2)
for reg in ("R", "L"): pline(reg, [(0, -0.6, -6.95), (0, 0.55, -6.95)], 0.72, 2)
for reg in ("top", "bot"):
    for sg in (-1, 1):
        for f in (0.35, 0.55):
            pts = []
            for s in (0.4, 2.85, 4.8):
                _, le, ch, _ = sta(W["stations"], s, 0); pts.append((sg * (W["root"][0] + s), 0, le + f * ch))
            pline(reg, pts)
        for s in (1.2, 2.85, 3.9):
            _, le, ch, _ = sta(W["stations"], s, 0); x = sg * (W["root"][0] + s); pline(reg, [(x, 0, le + 0.17 * ch), (x, 0, le + 0.7 * ch)])
        for _ in range(6):
            x = sg * random.uniform(1.0, 4.2); z = random.uniform(-2, 3); a, b = pix(reg, x, 0, z), pix(reg, x + 0.35, 0, z + 0.25)
            dr.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], outline=shade(TOP if reg == "top" else BOT, LINE))
# 低可視度標誌（虛構陣營：圓圈＋箭羽，不用真實國徽）
def roundel(reg, x, y, z, r):
    cx, cy = pix(reg, x, y, z)
    sx = abs(pix(reg, x + r, y, z)[0] - cx) if reg in ("top", "bot") else abs(pix(reg, x, y, z + r)[0] - cx)
    sy = abs(pix(reg, x, y, z + r)[1] - cy) if reg in ("top", "bot") else abs(pix(reg, x, y + r, z)[1] - cy)
    base = TOP if reg == "top" else BOT if reg == "bot" else sidecol(y); col = shade(base, 0.68)
    dr.ellipse([cx - sx, cy - sy, cx + sx, cy + sy], outline=col, width=max(2, int(sx * 0.12)))
    dr.polygon([(cx, cy - sy * 0.62), (cx + sx * 0.55, cy + sy * 0.45), (cx, cy + sy * 0.12), (cx - sx * 0.55, cy + sy * 0.45)], outline=col, width=max(2, int(sx * 0.08)))
roundel("top", -4.6, 0, 1.75, 0.55); roundel("bot", 4.6, 0, 1.75, 0.55)
roundel("R", 0, -0.30, -1.2, 0.38); roundel("L", 0, -0.30, -1.2, 0.38)
# 機號與隊徽（虛構）
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def text(reg, s, y, z, h, k=0.68):
    x0, y0 = pix(reg, 0, y + h / 2, z); x1, y1 = pix(reg, 0, y - h / 2, z)
    size = int(abs(y1 - y0)); fnt = ImageFont.truetype(FONT, max(8, size))
    dr.text((x0, (y0 + y1) / 2), s, font=fnt, fill=shade(sidecol(y), k), anchor="mm")
for reg in ("R", "L"):
    text(reg, sk["modex"], 0.05, -5.0, 0.30)
    text(reg, sk["code"], 1.55, 4.15, 0.55)
    text(reg, sk["modex"][-2:], 2.35, 4.75, 0.22)
img = img.filter(ImageFilter.GaussianBlur(0.4))
noise = Image.effect_noise((TW // 4, TH // 4), 40).resize((TW, TH), Image.BILINEAR).filter(ImageFilter.GaussianBlur(2))
img = Image.blend(img, Image.merge("RGB", [noise] * 3).point(lambda v: v), 0.05)
img.save(TEX_PATH)
bi = bpy.data.images["skin"]; bi.filepath = TEX_PATH; bi.source = "FILE"; bi.reload()

# ---------------- 組合、層級、輸出 ----------------
def join(obs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]; bpy.ops.object.join(); obs[0].name = name; obs[0].data.name = name; return obs[0]
tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
airframe = join(statics, "airframe")
lod0 = bpy.data.objects.new("LOD0", None); bpy.context.collection.objects.link(lod0)
for o in [airframe] + list(nodes.values()): o.parent = lod0
stats = {"LOD0": sum(tri(o) for o in [airframe] + list(nodes.values()))}
keep = {1: lambda n: not n.startswith(("gear", "door", "hook", "cockpit", "bomb")), 2: lambda n: not n.startswith(("gear", "door", "hook", "cockpit", "bomb")), 3: lambda n: n.startswith(("canopy", "stab"))}
targets = {1: 6000, 2: 900, 3: 140}
for i in (1, 2, 3):
    dup = []
    for o in [airframe] + [v for k, v in nodes.items() if keep[i](k)]:
        d = o.copy(); d.data = o.data.copy(); d.parent = None; d.matrix_world = o.matrix_world.copy()
        for k in list(d.keys()): del d[k]
        bpy.context.collection.objects.link(d); dup.append(d)
    j = join(dup, "LOD%d" % i)
    bpy.context.view_layer.objects.active = j
    bpy.ops.object.select_all(action='DESELECT'); j.select_set(True); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(j.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-3); bm.to_mesh(j.data); bm.free()
    m = j.modifiers.new("dec", "DECIMATE"); m.ratio = min(1.0, targets[i] / max(1, tri(j)))
    bpy.ops.object.modifier_apply(modifier="dec")
    stats["LOD%d" % i] = tri(j)
bpy.context.view_layer.update()
pts = [o.matrix_world @ v.co for o in [airframe] + list(nodes.values()) for v in o.data.vertices]
xs = [p.x for p in pts]; ys = [p.y for p in pts]; zs = [p.z for p in pts]
dims = {"length": max(ys) - min(ys), "span": max(xs) - min(xs), "height": max(zs) - P["groundY"]}
RAW = OUT + ".raw.glb"
bpy.ops.export_scene.gltf(filepath=RAW, export_format='GLB', export_yup=True, export_extras=True, export_image_format='JPEG')
TOOL = os.path.join(HERE, "..", "node_modules", ".bin", "gltf-transform")
subprocess.run([TOOL, "meshopt", RAW, OUT + ".m.glb"], check=True, capture_output=True)
subprocess.run([TOOL, "webp", OUT + ".m.glb", OUT, "--quality", "82"], check=True, capture_output=True)
for f in (RAW, OUT + ".m.glb"): os.remove(f)
rep = {"file": OUT, "bytes": os.path.getsize(OUT), "triangles": stats, "nodes": sorted(nodes.keys()),
       "dims": {k: round(v, 3) for k, v in dims.items()},
       "dimsErrorPct": {k: round(100 * (dims[k] - P["dims"][k]) / P["dims"][k], 2) for k in dims}}
print("REPORT " + json.dumps(rep, ensure_ascii=False))
bad = [c for c in CHECK if c[1] < 0 or c[2] > 0]
print("CHECK flipped=%d open=%d" % (sum(1 for c in CHECK if c[1] < 0), sum(1 for c in CHECK if c[2] > 0)), bad[:40])
