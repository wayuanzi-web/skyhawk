"""把模型檔內嵌進單一 HTML（Artifact 不能放 .glb）。輸出 dist/index.html
__GLB＝玩家 F/A-18E、__GLB2＝敵機 MiG-29、__GLB3＝敵機 Su-27、__GLB4＝戰艦大和（擊沉大和模式）
__GLB5＝航母翔鶴、__GLB6＝航母瑞鶴、__GLB7＝零式艦戰 A6M5（擊沉大和模式）、__GLB8＝護航驅逐艦（陽炎型）"""
import base64,os
s=open('index.html').read()
b64=lambda f:base64.b64encode(open(f,'rb').read()).decode()
tag='<script type="importmap">'
assert s.count(tag)==1
s=s.replace(tag,'<script>window.__GLB="'+b64('assets/fa18e.glb')+'";window.__GLB2="'+b64('assets/mig29.glb')+'";window.__GLB3="'+b64('assets/su27.glb')+'";window.__GLB4="'+b64('assets/yamato.glb')+'";window.__GLB5="'+b64('assets/shokaku.glb')+'";window.__GLB6="'+b64('assets/zuikaku.glb')+'";window.__GLB7="'+b64('assets/a6m5.glb')+'";window.__GLB8="'+b64('assets/kagero.glb')+'";window.__GLB9="'+b64('assets/cvn.glb')+'";window.__GLB10="'+b64('assets/ddg.glb')+'"</script>\n'+tag)
os.makedirs('dist',exist_ok=True);open('dist/index.html','w').write(s);print('dist/index.html',len(s),'bytes')
