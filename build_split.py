"""Artifact 用分檔版：dist2/index.html＋dist2/m/*.js（每個 glb 一支 base64 腳本），避開單檔 16 MB 上限"""
import base64,os
M=[('__GLB','fa18e'),('__GLB2','mig29'),('__GLB3','su27'),('__GLB4','yamato'),('__GLB5','shokaku'),('__GLB6','zuikaku'),('__GLB7','a6m5'),('__GLB8','kagero'),('__GLB9','cvn'),('__GLB10','ddg')]
s=open('index.html').read();tag='<script type="importmap">';assert s.count(tag)==1
os.makedirs('dist2/m',exist_ok=True)
for v,n in M: open(f'dist2/m/{n}.js','w').write(f'window.{v}="'+base64.b64encode(open(f'assets/{n}.glb','rb').read()).decode()+'";')
s=s.replace(tag,''.join(f'<script src="m/{n}.js"></script>' for v,n in M)+'\n'+tag)
open('dist2/index.html','w').write(s);print('ok')
