const {open}=require('../lib');
exports.go=async(page='test/agentR/probe.html',opts={})=>{const o=await open(Object.assign({viewport:{width:844,height:390}},opts),page);const p=o.p;
 await p.waitForFunction(()=>window.__G&&__G.PARTS&&window.__R,{timeout:60000});await p.waitForTimeout(800);
 await p.evaluate(()=>{window.__FRZ=true;const G=__G,P=G.P,V=P.pos.constructor,cam=G.cam;window.__T=0;
  window.__rend=G.renderer.render.bind(G.renderer);
  window.tick=(dt,draw)=>{if(!draw)G.renderer.render=()=>{};window.__T+=dt;__R.body(dt,__T*1000);G.renderer.render=__rend};
  window.st=()=>{const f=new V(0,0,-1).applyQuaternion(P.q),u=new V(0,1,0).applyQuaternion(P.q),r=new V(1,0,0).applyQuaternion(P.q);
   const cf=new V(0,0,-1).applyQuaternion(cam.quaternion),cu=new V(0,1,0).applyQuaternion(cam.quaternion),cr=new V(1,0,0).applyQuaternion(cam.quaternion);
   const s=P.pos.clone().project(cam);const vh=P.vel.clone().normalize();const D=57.3;
   const nose=P.pos.clone().addScaledVector(f,8).project(cam);
   return{t:+__T.toFixed(3),V:+P.V.toFixed(1),kt:P.V*1.944|0,alt:+P.pos.y.toFixed(1),bank:+(Math.atan2(-r.y,u.y)*D).toFixed(1),pitch:+(Math.asin(f.y)*D).toFixed(1),hdg:+(Math.atan2(f.x,-f.z)*D).toFixed(1),
    trk:+(Math.atan2(vh.x,-vh.z)*D).toFixed(1),gam:+(Math.asin(vh.y)*D).toFixed(1),a:+(P.alpha*D).toFixed(2),b:+(P.beta*D).toFixed(2),g:+P.g.toFixed(2),thr:+P.thrAct.toFixed(2),
    camRoll:+(Math.atan2(-cr.y,cu.y)*D).toFixed(1),camPitch:+(Math.asin(cf.y)*D).toFixed(1),camHdg:+(Math.atan2(cf.x,-cf.z)*D).toFixed(1),camNose:+(Math.acos(Math.max(-1,Math.min(1,cf.dot(f))))*D).toFixed(1),
    camVel:+(Math.acos(Math.max(-1,Math.min(1,cf.dot(vh))))*D).toFixed(1),dist:+cam.position.distanceTo(P.pos).toFixed(1),sx:+s.x.toFixed(3),sy:+s.y.toFixed(3),nx:+nose.x.toFixed(3),ny:+nose.y.toFixed(3),fov:+cam.fov.toFixed(1),
    cdy:+(cam.position.y-P.pos.y).toFixed(1),w:[P.w.x,P.w.y,P.w.z].map(x=>+(x*D).toFixed(1)),state:P.state}};
  window.setAimRel=(dyaw,dpit)=>{const vh=P.vel.clone().normalize();const hv=Math.atan2(vh.x,-vh.z),pv=Math.asin(vh.y);const y=hv+dyaw,pt=pv+dpit;P.aim.set(Math.sin(y)*Math.cos(pt),Math.sin(pt),-Math.cos(y)*Math.cos(pt))};
  window.freeStart=(alt=1500,v=230)=>{G.start('free');P.pos.set(0,alt,-1500);P.vel.set(0,0,-v);P.q.set(0,0,0,1);P.aim.set(0,0,-1);P.thr=P.thrAct=.8;__R.camDir.set(0,0,-1);__R.view=0;G.inp.stickOn=false};
 });
 return o};
// 跑一段：每幀 dt，每 every 秒存一筆；fn(t) 在每幀前執行（字串）
exports.seg=async(p,dur,dt,fn,every=0.1,shot=null,step=0.2)=>{return p.evaluate(async([dur,dt,fn,every])=>{const F=fn?eval('('+fn+')'):null;const out=[];let n=0,t0=__T;const N=Math.round(dur/dt),ke=Math.max(1,Math.round(every/dt));
  for(let i=0;i<N;i++){if(F)F(__T-t0);tick(dt,false);if(i%ke===0)out.push(st())}return out},[dur,dt,fn,every])};
exports.shots=async(p,name,dur,dt,fn,step,dir)=>{const fs=require('fs');fs.mkdirSync(dir,{recursive:true});const out=[];const N=Math.round(dur/dt),ks=Math.max(1,Math.round(step/dt));let k=0;
  for(let i=0;i<N;i++){const draw=i%ks===0;const r=await p.evaluate(([fn,dt,draw,i])=>{if(i===0)window.__F=fn?eval('('+fn+')'):null;if(__F)__F(__T);tick(dt,draw);return st()},[fn,dt,draw,i]);if(draw){await p.screenshot({path:`${dir}/${name}_${String(k).padStart(3,'0')}.png`});out.push(r);k++}}
  return out};
