// 用法: node shots.js <tag> [page] [wire]
const {open}=require('../lib');const tag=process.argv[2]||'base',page=process.argv[3]||'index.html',wire=process.argv[4]==='wire';
(async()=>{const {b,p,errs}=await open({viewport:{width:844,height:390}},page);await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});await p.waitForTimeout(1200);
await p.evaluate(()=>{const G=__G;G.M.diff=0;G.start('free');G.M.paused=true;window.__WIRE=[];});
await p.evaluate(()=>{for(const e of document.body.children)if(e.id!=='gl'&&e.tagName!=='SCRIPT')e.style.visibility='hidden'});
const scenes={
 canyon_chase:`const u=12000,f=dir(u),h=G.floorOf(u)+60;at(G.xc(u),h,-u,f);chase(f)`,
 canyon_low30:`const u=12600,f=dir(u),h=G.floorOf(u)+30;at(G.xc(u),h,-u,f);cam([G.xc(u),h+1,-u],[G.xc(u)+f.x*300,h-12,-u+f.z*300],62)`,
 canyon_wall:`const u=13800,x=G.xc(u),h=G.floorOf(u)+80;at(x,h,-u,dir(u));cam([x-150,h,-u],[x+400,h+60,-u-100],55)`,
 canyon_far:`const u=10400,f=dir(u),h=G.floorOf(u)+150;at(G.xc(u),h,-u,f);cam([G.xc(u),h,-u],[G.xc(u)+f.x*2000,h-150,-u+f.z*2000],62)`,
 entrance:`const u=6400,h=150;at(0,h,-u,V(0,0,-1));chase(V(0,-.05,-1).normalize())`,
 ridge:`const x=1000,u=20000,h=G.groundH(x,-u)+150;at(x,h,-u,V(0,0,-1));chase(V(0,-.25,-1).normalize())`,
 ridge_down:`const x=1000,u=20400,h=G.groundH(x,-u)+250;at(x,h,-u,V(0,0,-1));cam([x,h,-u+100],[x,h-250,-u-300],60)`,
 coast:`const u=5650,h=40;at(1500,h,-u,V(0,0,-1));chase(V(0,-.05,-1).normalize())`,
 coast_along:`const u=5880,h=60;at(-1500,h,-u+150,V(1,0,0));cam([-1500,h,-u+300],[-900,0,-u-150],60)`,
};
const out={};
for(const [n,code] of Object.entries(scenes)){
 const info=await p.evaluate(([code,wire])=>{const G=__G,P=G.P,T=P.pos.constructor,V=(x,y,z)=>new T(x,y,z);
  const dir=u=>{const d=(G.xc(u+5)-G.xc(u-5))/10;return V(d,0,-1).normalize()};
  const at=(x,y,z,f)=>{P.pos.set(x,y,z);const m=new (G.cam.matrix.constructor)();m.lookAt(V(0,0,0),f.clone().negate(),V(0,1,0));P.q.setFromRotationMatrix(m);P.vel.copy(f).multiplyScalar(200);P.aim.copy(f)};
  const cam=(p,l,fov)=>{window.__CAMO={p:V(...p),l:V(...l),fov};G.plane.scale.setScalar(1e-4)};G.plane.scale.setScalar(1);
  const chase=f=>{const c=P.pos.clone().addScaledVector(f,-27);c.y+=8;const t=P.pos.clone().addScaledVector(f,160);t.y+=14;window.__CAMO={p:c,l:t,fov:66}};
  eval(code);
  // 線框疊圖
  for(const w of window.__WIRE)w.parent.remove(w);window.__WIRE=[];
  if(wire){const M=G.TERRAIN.mat.clone();M.onBeforeCompile=()=>{};M.map=null;M.normalMap=null;M.vertexColors=false;M.color.set(0);M.wireframe=true;M.transparent=true;M.opacity=.45;M.polygonOffset=true;M.polygonOffsetFactor=-1;
   G.scene.traverse(o=>{if(o.isLOD)for(const l of o.levels){const w=new l.object.constructor(l.object.geometry,M);w.renderOrder=5;l.object.add(w);window.__WIRE.push(w)}})}
  const cm=G.cam;cm.position.copy(window.__CAMO.p);cm.up.set(0,1,0);cm.lookAt(window.__CAMO.l);cm.fov=window.__CAMO.fov;cm.aspect=844/390;cm.updateProjectionMatrix();cm.updateMatrixWorld();
  const tri={};for(const fy of [.55,.75,.92]){const d=V(0,-(fy*2-1),.5).unproject(cm).sub(cm.position).normalize();let t=0,hit=null;for(;t<20000;t+=2){const q=cm.position.clone().addScaledVector(d,t);if(q.y<Math.max(0,G.groundH(q.x,q.z))){hit=q;break}}
   if(hit){const pr=v=>{const s=v.clone().project(cm);return [s.x*422,s.y*195]};const a=pr(hit),bx=pr(hit.clone().add(V(64,0,0))),bz=pr(hit.clone().add(V(0,0,64)));tri['y'+fy]={dist:Math.round(t),pxX:Math.round(Math.hypot(a[0]-bx[0],a[1]-bx[1])),pxZ:Math.round(Math.hypot(a[0]-bz[0],a[1]-bz[1]))}}}
  const c=window.__CAMO.p;return {tri,pos:[P.pos.x|0,P.pos.y|0,P.pos.z|0],agl:Math.round(P.pos.y-Math.max(0,G.groundH(P.pos.x,P.pos.z))),camAgl:Math.round(c.y-Math.max(0,G.groundH(c.x,c.z)))}},[code,wire]);
 await p.waitForTimeout(900);
 const ri=await p.evaluate(()=>{const i=__G.renderer.info;return {calls:i.render.calls,tris:i.render.triangles}});
 out[n]=Object.assign(info,ri);
 await p.screenshot({path:`test/agentG/${tag}${wire?'_w':''}_${n}.png`});
}
console.log(JSON.stringify(out));console.log(errs.join('|')||'no errors');await b.close()})();
