// 對地攻擊：飛向峽谷車隊、等鎖定、發射、看是否擊毀
const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});await p.waitForTimeout(1000);
const r=await p.evaluate(()=>{const G=__G,P=G.P,GU=G.GU;G.M.diff=0;G.start('free');G.M.paused=true;const u=GU.find(x=>x.type==='tank');const T=P.pos.constructor;
  P.pos.set(u.pos.x,u.pos.y+2200,u.pos.z+4500);P.vel.set(0,-90,-200);P.q.setFromUnitVectors(new T(0,0,-1),u.pos.clone().sub(P.pos).normalize());P.aim.copy(u.pos).sub(P.pos).normalize();P.agm=4;
  const o=[];let fired=0;for(let i=0;i<300;i++){P.aim.copy(u.pos).sub(P.pos).normalize();G.run(.1);if(G.GA.lock.ok&&!fired){fired=1;G.fireMsl();o.push('發射 t='+(i/10).toFixed(1)+' 距離 '+(u.pos.distanceTo(P.pos)|0))}
    if(i===Math.round(10*(o.length&&0)))0;if(fired&&!G.GA.msl.length){o.push('飛彈結束 t='+(i/10).toFixed(1));break}}
  return{o,lockT:G.GA.lock.t,alive:u.alive,kills:G.GA.kills,agm:P.agm}});
console.log(JSON.stringify(r));await p.evaluate(()=>{const G=__G,P=G.P,u=G.GU.find(x=>x.type==='tank'),T=P.pos.constructor;window.__CAMO={p:u.pos.clone().add(new T(30,18,30)),l:u.pos.clone(),fov:45}});await p.waitForTimeout(800);await p.screenshot({path:'test/agm_kill.png'});
// 鎖定畫面
await p.evaluate(()=>{window.__CAMO=null;const G=__G,P=G.P,u=G.GU.filter(x=>x.type==='tank')[3],T=P.pos.constructor;G.M.paused=true;P.pos.set(u.pos.x+200,u.pos.y+600,u.pos.z+4000);P.vel.set(0,-20,-200);P.q.setFromUnitVectors(new T(0,0,-1),u.pos.clone().sub(P.pos).normalize());P.aim.copy(u.pos).sub(P.pos).normalize();G.M.paused=false});
await p.waitForTimeout(2500);await p.screenshot({path:'test/agm_lock.png'});
console.log(errs.join('|')||'no errors');await b.close()})();
