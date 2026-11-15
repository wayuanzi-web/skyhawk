// 彈射蒸汽、觸艦輪煙、鉤索
const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});await p.waitForTimeout(1200);
await p.evaluate(()=>{const G=__G;G.start('mission');G.M.paused=true;G.run(.3);G.P.thr=G.P.thrAct=1;G.M.paused=false;G.act.launch();window.__CAMO={p:new G.P.pos.constructor(-25,30,-20),l:new G.P.pos.constructor(-10,21,-90),fov:50}});
await p.waitForTimeout(2200);await p.screenshot({path:'test/dfx_cat.png'});
console.log(await p.evaluate(()=>__G.P.state));
// 著艦：用 t3 的方式放在進場線上，快轉到觸艦
await p.evaluate(()=>{window.__CAMO=null;const G=__G;G.start('land');});await p.waitForTimeout(500);
const r=await p.evaluate(()=>{const G=__G,P=G.P;G.M.paused=true;let s='';for(let i=0;i<7000&&P.state==='fly';i++){const t=G.LP0.clone().addScaledVector(G.LD,73),rel=P.pos.clone().sub(t),along=-rel.dot(G.LD);
  if(!P.onDeck&&along>30){const la=Math.max(0,along-450),tp=t.clone().addScaledVector(G.LD,-la);tp.y=20+2.3+Math.tan(0.061)*la;P.aim.copy(tp).sub(P.pos).normalize()}G.run(.01)}
  for(let i=0;i<25;i++)G.run(.01);return P.state});
await p.evaluate(()=>{const P=__G.P,T=P.pos.constructor;window.__CAMO={p:P.pos.clone().add(new T(-22,8,30)),l:P.pos.clone().add(new T(0,0,-10)),fov:45}});await p.waitForTimeout(700);await p.screenshot({path:'test/dfx_trap.png'});
console.log(r,errs.join('|')||'no errors');await b.close()})();
