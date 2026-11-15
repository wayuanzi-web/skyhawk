"""把模型檔內嵌進單一 HTML（Artifact 不能放 .glb）。輸出 dist/index.html"""
import base64,os
s=open('index.html').read()
g=base64.b64encode(open('assets/fa18e.glb','rb').read()).decode()
tag='<script type="importmap">'
assert s.count(tag)==1
g2=base64.b64encode(open('assets/mig29.glb','rb').read()).decode()
s=s.replace(tag,'<script>window.__GLB="'+g+'";window.__GLB2="'+g2+'"</script>\n'+tag)
os.makedirs('dist',exist_ok=True);open('dist/index.html','w').write(s);print('dist/index.html',len(s),'bytes')
