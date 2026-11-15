const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});await p.waitForTimeout(1000);
console.log(await p.evaluate(()=>Object.keys(__G.PARTS).filter(k=>/gear|door/.test(k)).join(',')));
await p.evaluate(()=>{const G=__G,P=G.P;G.start('free');G.M.paused=true;P.pos.set(0,2000,-3000);P.vel.set(0,0,-150);P.q.set(0,0,0,1);P.gear=true;P.gearT=1;});
const sh=async(n,gt)=>{await p.evaluate(g=>{const P=__G.P,T=P.pos.constructor;P.gearT=g;P.gear=g>.5;window.__CAMO={p:P.pos.clone().add(new T(-9,-3.2,-3)),l:P.pos.clone().add(new T(0,-.8,-1)),fov:45}},gt);await p.waitForTimeout(150);await p.evaluate(g=>{__G.P.gearT=g},gt);await p.waitForTimeout(80);await p.screenshot({path:`test/gear_${n}.png`})};
await sh('a',1);await sh('b',.6);await sh('c',.25);await sh('d',0);console.log(errs.join('|')||'no errors');await b.close()})();
