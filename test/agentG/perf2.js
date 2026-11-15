// node perf2.js page -> 每場景 繪製次數/三角形/LOD 分佈/平均繪製毫秒（軟體繪圖，只看相對值）
const {open}=require('../lib');(async()=>{const page=process.argv[2]||'index.html';const {b,p,errs}=await open({},page);await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});await p.waitForTimeout(1000);
const r=await p.evaluate(async()=>{const G=__G,P=G.P,T=P.pos.constructor,V=(x,y,z)=>new T(x,y,z),o={bakeMs:G.TERRAIN.bakeMs};G.start('free');G.M.paused=true;
 const gl=G.renderer.getContext(),px=new Uint8Array(4);
 const sc={canyon:[V(1657,139,-12000),V(1700,120,-12800)],entrance:[V(0,150,-6400),V(0,120,-7400)],ridge:[V(1000,1667,-20000),V(1000,1500,-20800)],coast:[V(1500,40,-5650),V(1500,30,-6600)],deck:null};
 for(const [n,v] of Object.entries(sc)){if(v){P.pos.copy(v[0]);window.__CAMO={p:v[0].clone().add(V(0,8,27)),l:v[1],fov:66}}else{window.__CAMO=null;G.start('mission');G.M.paused=true}
  await new Promise(r=>setTimeout(r,700));const i=G.renderer.info;const lv=[0,0,0,0];G.scene.traverse(x=>{if(x.isLOD)lv[x.getCurrentLevel()]++});
  const cam=G.cam;let t0=performance.now();for(let k=0;k<12;k++){G.renderer.render(G.scene,cam);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px)}const ms=(performance.now()-t0)/12;
  o[n]={calls:i.render.calls,tris:i.render.triangles,lodLevels:lv,msPerFrame:+ms.toFixed(1)}}
 return o});console.log(JSON.stringify(r));console.log(errs.join('|')||'no errors');await b.close()})();
