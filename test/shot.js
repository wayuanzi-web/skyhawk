const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G);await p.waitForTimeout(1500);
console.log('model',await p.evaluate(()=>__G.modelSrc));
await p.evaluate(()=>{const G=__G;G.start('mission');G.M.paused=true;G.P.thr=1;G.run(1)});await p.evaluate(()=>{__G.M.paused=false});await p.waitForTimeout(400);await p.screenshot({path:'test/s3_cat.png'});
await p.evaluate(()=>{const G=__G,P=G.P;G.M.paused=true;G.start('free');G.M.paused=true;P.aim.set(.6,.25,-.75).normalize();G.run(2.2)});await p.evaluate(()=>{__G.M.paused=false});await p.waitForTimeout(400);await p.screenshot({path:'test/s3_turn.png'});
console.log(errs.join('|')||'no errors');await b.close()})();
