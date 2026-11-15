const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});await p.waitForTimeout(1000);
await p.evaluate(()=>{const G=__G;G.start('mission');G.M.paused=true;G.run(.3)});await p.click('#bView');await p.evaluate(()=>{__G.M.paused=false});await p.waitForTimeout(800);await p.screenshot({path:'test/cock_deck.png'});
await p.evaluate(()=>{const G=__G,P=G.P;G.M.paused=true;G.start('free');G.M.paused=true;P.pos.set(0,1200,-3000);P.vel.set(0,0,-220);P.q.setFromAxisAngle(new P.pos.constructor(0,0,1),.5);G.M.paused=false});await p.waitForTimeout(800);await p.screenshot({path:'test/cock_air.png'});
console.log(errs.join('|')||'no errors');await b.close()})();
