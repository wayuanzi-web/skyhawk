# 產生 test/agentG/exp.html：只改地形區塊（index.html 不動）
import sys
src=open('/home/claude/skyhawk/index.html',encoding='utf-8').read()
SMIN='--smin' in sys.argv
def rep(old,new,cnt=1):
    global src
    assert src.count(old)==cnt,(old[:60],src.count(old))
    src=src.replace(old,new)

if '--scatter' in sys.argv:
    rep("  // 海面：兩層波紋","""  // 峽谷谷底與下坡散佈岩塊／灌木：每 1,500 公尺一段一個 InstancedMesh（可被視錐剔除），每個 20 個三角形
  {const geo=new THREE.IcosahedronGeometry(1,0),mat=new THREE.MeshLambertMaterial({flatShading:true}),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),sc=new THREE.Vector3(),ps=new THREE.Vector3(),col=new THREE.Color();let sd=11;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;TERRAIN.scatter=0;
    for(let u0=5900;u0<21000;u0+=1500){const N=260,im=new THREE.InstancedMesh(geo,mat,N),cx=xc(u0+750),cz=-(u0+750);let n=0;
      for(let k=0;k<N*3&&n<N;k++){const u=u0+rnd()*1500,side=rnd()<.5?-1:1,d=Math.pow(rnd(),.7)*520,x=xc(u)+side*d,z=-u,h=groundH(x,z);if(h<6)continue;
        const sl=Math.hypot(groundH(x+8,z)-groundH(x-8,z),groundH(x,z+8)-groundH(x,z-8))/16;if(sl>1.2)continue;
        const bush=sl<.35&&rnd()<.6,s=bush?2+rnd()*3.5:1.5+Math.pow(rnd(),2)*7;
        sc.set(s*(.8+rnd()*.6),s*(bush?.75:.45+rnd()*.4),s*(.8+rnd()*.6));q.setFromEuler(e.set(rnd()*.4,rnd()*6.28,rnd()*.4));ps.set(x-cx,h+sc.y*(bush?.45:.25)-sl*s*.5,z-cz);
        im.setMatrixAt(n,m4.compose(ps,q,sc));const v=.85+rnd()*.3;im.setColorAt(n,bush?col.setRGB(.16*v,.24*v,.11*v):col.setRGB(.42*v,.39*v,.36*v));n++}
      im.count=n;im.computeBoundingSphere();const lo=new THREE.LOD();lo.addLevel(im,0);lo.addLevel(new THREE.Object3D(),3200);lo.position.set(cx,0,cz);scene.add(lo);TERRAIN.scatter+=n}}
""" + "  // 海面：兩層波紋")
if SMIN:
    rep("    base=lerp(base,Math.min(base,w),c)}",
        "    const sk=70,hh=clamp(.5+.5*(base-w)/sk,0,1);base=lerp(base,lerp(base,w,hh)-sk*hh*(1-hh),c)}")

# 1) 頂點色只放「草地底色」(依高度漸層＋每點小變化)；岩/沙/雪改在片段著色器逐像素決定
rep("""    if(h<8){r=.78;gg=.72;bb=.55}else if(ny<0.72){r=.47;gg=.43;bb=.40}else if(h>1150){r=.85;gg=.87;bb=.9}
    else{const m=sstep(150,1000,h);r=lerp(.33,.50,m);gg=lerp(.46,.47,m);bb=lerp(.26,.38,m)}""",
"""    {const m=sstep(150,1000,h);r=lerp(.33,.50,m);gg=lerp(.46,.47,m);bb=lerp(.26,.38,m)}""")

# 2) 烘焙光照：太陽方向沿高度場走，看會不會被山擋（軟陰影）＋八方向地平線遮蔽(AO)；載入時算一次，執行時零成本
rep("""  const tmat=new THREE.MeshLambertMaterial({vertexColors:true,map:noiseTex(256,.55),color:new THREE.Color(1.12,1.12,1.1)});""",
"""  const LIT=new Float32Array(TNX*TNU*2);{const t0=performance.now(),hl=Math.hypot(SUND.x,SUND.z),sx=SUND.x/hl,sz=SUND.z/hl,tn=SUND.y/hl,AD=[];for(let a=0;a<8;a++)AD.push([Math.cos(a*Math.PI/4),Math.sin(a*Math.PI/4)]);
    for(let j=0;j<TNU;j++)for(let i=0;i<TNX;i++){const k=j*TNX+i,x=TX0+i*TD,z=-(TU0+j*TD),h=HG[k];if(h<-29){LIT[k*2]=LIT[k*2+1]=1;continue}
      let oc=0;for(let s=24;s<3000;s*=1.12){const d=groundH(x+sx*s,z+sz*s)-(h+2+s*tn);if(d>0){oc=Math.max(oc,d/(.10*s+6));if(oc>=1)break}}
      let ao=0;for(const [ax,az] of AD){let m=0;for(let s=40;s<1200;s*=1.6){const t=(groundH(x+ax*s,z+az*s)-h)/s;if(t>m)m=t}ao+=m/Math.hypot(1,m)}
      LIT[k*2]=1-Math.min(1,oc);LIT[k*2+1]=clamp(1-ao/8*1.1,.3,1)}
    TERRAIN.bakeMs=Math.round(performance.now()-t0)}
  const tN=noiseTex(256,0);tN.colorSpace=THREE.NoColorSpace;tN.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  // 岩石法線貼圖：等向的脊狀雜訊（裂縫感），給陡壁三平面用
  const rockN=(()=>{const sz=256,h=new Float32Array(sz*sz),p=(a,b,q)=>{const fa=Math.floor(a),fb=Math.floor(b),i0=fa%q,j0=fb%q,i1=(i0+1)%q,j1=(j0+1)%q,fx=a-fa,fy=b-fb,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);return lerp(lerp(hash(i0+7,j0),hash(i1+7,j0),sx),lerp(hash(i0+7,j1),hash(i1+7,j1),sx),sy)};
    for(let j=0;j<sz;j++)for(let i=0;i<sz;i++){let v=0,f=4,w=1;for(let o=0;o<5;o++){v+=w*(1-Math.abs(2*p(i/sz*f,j/sz*f,f)-1));f*=2;w*=.5}h[j*sz+i]=v}
    const cv=document.createElement('canvas');cv.width=cv.height=sz;const c=cv.getContext('2d'),im=c.createImageData(sz,sz),d=im.data;
    for(let j=0;j<sz;j++)for(let i=0;i<sz;i++){const dx=(h[j*sz+(i+1)%sz]-h[j*sz+(i+sz-1)%sz])*4,dy=(h[((j+1)%sz)*sz+i]-h[((j+sz-1)%sz)*sz+i])*4,l=Math.hypot(dx,dy,1),k=(j*sz+i)*4;d[k]=(-dx/l*.5+.5)*255;d[k+1]=(-dy/l*.5+.5)*255;d[k+2]=(1/l*.5+.5)*255;d[k+3]=255}
    c.putImageData(im,0,0);const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.NoColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t})();
  const tmat=new THREE.MeshLambertMaterial({vertexColors:true,color:new THREE.Color(1.12,1.12,1.1)});""")

# 3) 材質：三平面取樣(陡壁不拉伸)、逐像素坡度/高度分地表(草/岩/沙/雪)、岩層條紋、陡壁導數凹凸、烘焙光照
old_shader=src[src.index("  TERRAIN.mat=tmat;tmat.onBeforeCompile=sh=>{"):src.index("  const CX=50,CU=40,STEPS")]
src=src.replace(old_shader,r"""  TERRAIN.mat=tmat;tmat.onBeforeCompile=sh=>{sh.uniforms.tN={value:tN};sh.uniforms.tR={value:rockN};
    sh.vertexShader='attribute vec2 lit;varying vec2 vLit;varying vec3 vWP;varying vec3 vWN;\n'+sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n vWP=(modelMatrix*vec4(transformed,1.)).xyz;vWN=normalize(mat3(modelMatrix)*objectNormal);vLit=lit;');
    sh.fragmentShader='uniform sampler2D tN,tR;varying vec2 vLit;varying vec3 vWP;varying vec3 vWN;\nfloat tri3(vec3 p,vec3 w,float s){if(w.y>.97)return texture2D(tN,p.xz*s).r;return texture2D(tN,p.zy*s).r*w.x+texture2D(tN,p.xz*s).r*w.y+texture2D(tN,p.xy*s).r*w.z;}\n'+
     sh.fragmentShader.replace('#include <map_fragment>','').replace('#include <color_fragment>',`
      vec3 wn=normalize(vWN);vec3 bw=pow(abs(wn),vec3(6.));bw/=bw.x+bw.y+bw.z;
      float nL=texture2D(tN,vWP.xz/2300.).r, nM=tri3(vWP,bw,1./170.), nD=tri3(vWP,bw,1./26.);
      float hgt=vWP.y;
      vec3 grass=vColor.rgb*mix(.80,1.16,nL)*mix(.86,1.10,nM);
      grass=mix(grass,grass*vec3(1.15,1.05,.80),smoothstep(.6,.85,nM)*.7);
      float rockK=1.-smoothstep(.64,.80,wn.y+(nM-.5)*.24+(nD-.5)*.06);
      rockK=max(rockK,smoothstep(980.,1120.,hgt+(nL-.5)*200.));
      vec3 rock=vec3(.50,.45,.41)*mix(.80,1.12,nL)*mix(.74,1.14,nM);
      rock*=mix(.88,1.06,.5+.5*sin(hgt*.07+nM*2.+nL*6.));
      float sandK=1.-smoothstep(4.,12.,hgt+(nM-.5)*10.);
      float snowK=smoothstep(1100.,1240.,hgt+(nL-.5)*240.+(nM-.5)*60.)*smoothstep(.74,.86,wn.y+(nM-.5)*.3+(nD-.5)*.08)*smoothstep(.30,.42,nM*.6+nL*.4+(nD-.5)*.08);
            vec3 cS=mix(grass*mix(.88,1.08,nD),rock*mix(.84,1.10,nD),rockK);
      cS=mix(cS,vec3(.80,.74,.57)*mix(.9,1.06,nD),sandK);
      cS=mix(cS,vec3(.86,.88,.91)*mix(.72,1.03,nM)*mix(.86,1.03,nL)*mix(.9,1.04,nD),snowK);
      diffuseColor.rgb*=cS;DBGLINE
`).replace('#include <normal_fragment_maps>',`#ifdef USE_NORMALMAP_TANGENTSPACE
      vec3 mapN=texture2D(normalMap,vNormalMapUv*17.).xyz*2.-1.;mapN.xy*=normalScale*(1.-snowK*.3);normal=normalize(tbn*mapN);
      if(rockK>.01){vec3 p=vWP/60.,tx=texture2D(tR,p.zy).xyz*2.-1.,ty=texture2D(tR,p.xz).xyz*2.-1.,tz=texture2D(tR,p.xy).xyz*2.-1.;
        float rs=1.5*(1.-smoothstep(250.,1400.,length(vViewPosition)));tx.xy*=rs;ty.xy*=rs;tz.xy*=rs;
        vec3 wX=vec3(abs(tx.z)*wn.x,tx.y+wn.y,tx.x+wn.z),wY=vec3(ty.x+wn.x,abs(ty.z)*wn.y,ty.y+wn.z),wZ=vec3(tz.x+wn.x,tz.y+wn.y,abs(tz.z)*wn.z);
        vec3 nR=normalize((viewMatrix*vec4(normalize(wX*bw.x+wY*bw.y+wZ*bw.z),0.)).xyz);
        normal=normalize(mix(normal,nR,rockK));}
      #endif
      `).replace('#include <lights_fragment_end>',
      '#include <lights_fragment_end>\n reflectedLight.directDiffuse*=mix(.12,1.,vLit.x);reflectedLight.indirectDiffuse*=vLit.y;\n reflectedLight.indirectDiffuse+=diffuseColor.rgb*vec3(.16,.16,.15)*max(dot(normal,normalize((viewMatrix*vec4(.62,.2,-.45,0.)).xyz)),0.)*vLit.y;')};
""")
# 4) 每頂點加 lit 屬性
rep("""const put=(i,j,dy)=>{const k=j*TNX+i;P.push(TX0+i*TD,HG[k]-dy,-(TU0+j*TD));""","""const put=(i,j,dy)=>{const k=j*TNX+i;L.push(LIT[k*2],LIT[k*2+1]);P.push(TX0+i*TD,HG[k]-dy,-(TU0+j*TD));""")
rep("""function chunkGeo(i0,j0,st){const nx=CX/st+1,nu=CU/st+1,P=[],N=[],C=[],U=[],I=[];""","""function chunkGeo(i0,j0,st){const nx=CX/st+1,nu=CU/st+1,P=[],N=[],C=[],U=[],I=[],L=[];""")
rep("""g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(I);""","""g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setAttribute('lit',new THREE.Float32BufferAttribute(L,2));g.setIndex(I);""")
# 4b) 每格依高度選對角線（沿稜線切），消除稜線鋸齒；只改索引順序，三角形數不變
rep("""for(let b=0;b<nu-1;b++)for(let a=0;a<nx-1;a++){const p=b*nx+a,q=p+1,r=p+nx,t=r+1;I.push(p,q,r,q,t,r)}""",
"""for(let b=0;b<nu-1;b++)for(let a=0;a<nx-1;a++){const p=b*nx+a,q=p+1,r=p+nx,t=r+1;if(Math.abs(P[p*3+1]-P[t*3+1])<Math.abs(P[q*3+1]-P[r*3+1]))I.push(p,q,t,p,t,r);else I.push(p,q,r,q,t,r)}""")
# 5) 岩石法線貼圖加非等向過濾
rep("""TERRAIN.mat.normalMap=rn;""","""rn.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());TERRAIN.mat.normalMap=rn;""")
src=src.replace("LD.load('assets/","LD.load('../../assets/")  # 僅測試路徑
import os
src=src.replace('DBGLINE',os.environ.get('DBG',''))
pos=[a for a in sys.argv[1:] if not a.startswith('--')]
out=pos[0] if pos else '/home/claude/skyhawk/test/agentG/exp.html'
open(out,'w',encoding='utf-8').write(src);print('ok',out)
