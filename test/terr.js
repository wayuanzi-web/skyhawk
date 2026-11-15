const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const go=async(n,fn)=>{await p.evaluate(fn);await p.evaluate(()=>{__G.M.paused=false});await p.waitForTimeout(800);await p.evaluate(()=>{__G.M.paused=true});await p.screenshot({path:'test/'+n+'.png'})};
await go('t_canyon',()=>{const G=__G,P=G.P;G.M.diff=0;G.start('mission');G.spawn(1);G.M.paused=true;for(let s=0;s<60;s++){const u=-P.pos.z,la=u+850;P.aim.set(G.xc(la)-P.pos.x,G.floorOf(la)+75-P.pos.y,-la-P.pos.z).normalize();G.run(.1)}});
await go('t_high',()=>{const G=__G,P=G.P;G.start('free');G.M.paused=true;P.pos.set(-3000,2600,-4000);P.aim.set(.3,-.35,-.9).normalize();G.run(.2)});
await go('t_ridge',()=>{const G=__G,P=G.P;G.M.diff=0;G.start('mission');G.spawn(2);G.M.paused=true;G.run(4)});
console.log(errs.join('|')||'no errors');await b.close()})();
