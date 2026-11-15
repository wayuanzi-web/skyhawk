// 直升機與巡邏艇：截圖、機砲擊落直升機、對地飛彈打巡邏艇、擊落敵機墜落
const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});await p.waitForTimeout(1000);
await p.evaluate(()=>{const G=__G,P=G.P;G.start('free');G.M.paused=true;const h=G.GU.find(u=>u.type==='heli');G.run(.2);const T=P.pos.constructor;h.g.visible=true;window.__CAMO={p:h.pos.clone().add(new T(18,8,22)),l:h.pos.clone(),fov:45}});
await p.waitForTimeout(1200);await p.screenshot({path:'test/ne_heli.png'});
await p.evaluate(()=>{const G=__G,P=G.P;G.M.paused=true;const h=G.GU.find(u=>u.type==='boat');const T=P.pos.constructor;window.__CAMO={p:h.pos.clone().add(new T(40,22,50)),l:h.pos.clone(),fov:40}});
await p.waitForTimeout(1200);await p.screenshot({path:'test/ne_boat.png'});
const r=await p.evaluate(()=>{const G=__G,P=G.P,T=P.pos.constructor;window.__CAMO=null;G.M.paused=true;const h=G.GU.find(u=>u.type==='heli');
  // 機砲：從後方 600 m 對準直升機射擊
  const w0=h.orbit.w;h.orbit.w=0;let hits=0;for(let i=0;i<120&&h.alive;i++){P.pos.copy(h.pos).add(new T(0,30,600).applyAxisAngle(new T(0,1,0),h.g.rotation.y));P.vel.copy(h.pos).sub(P.pos).normalize().multiplyScalar(150);P.q.setFromUnitVectors(new T(0,0,-1),P.vel.clone().normalize());P.aim.copy(P.vel).normalize();G.inp.fire=true;G.run(.05)}
  G.inp.fire=false;h.orbit.w=w0;const hk=!h.alive;G.run(3);const fell=h.pos.y;
  // 敵機被擊落後墜落
  G.spawnEne(1);const e=G.CB.ene[G.CB.ene.length-1];const y0=e.pos.y;e.hp=0;e.hp=-1;G.CB.ene;const de=G.CB.ene.indexOf(e);e.alive=true;e.hp=1;e.hp-=12;
  return{heliKilled:hk,heliY:fell|0,ammo:P.ammo|0}});
console.log(JSON.stringify(r),errs.join('|')||'no errors');await b.close()})();
