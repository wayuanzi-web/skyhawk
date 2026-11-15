const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
console.log('model',await p.evaluate(()=>__G.modelSrc+' parts='+Object.keys(__G.PARTS).length));
const go=async(n,fn)=>{await p.evaluate(fn);await p.evaluate(()=>{__G.M.paused=false});await p.waitForTimeout(700);await p.evaluate(()=>{__G.M.paused=true});await p.screenshot({path:'test/'+n+'.png'})};
await go('s4_cat',()=>{const G=__G;G.start('mission');G.M.paused=true;G.P.thr=1;G.run(1)});
await go('s4_land_ext',()=>{const G=__G;G.start('land');G.M.paused=true;G.run(8);G.act.view();G.act.brake()});
await go('s4_land_cockpit',()=>{const G=__G;G.act.view();G.act.brake();G.run(14)});
await go('s4_turn',()=>{const G=__G,P=G.P;G.start('free');G.M.paused=true;G.act.view&&0;P.aim.set(.7,.15,-.7).normalize();G.run(1.6)});
const s=await p.evaluate(()=>({surf:JSON.stringify(__G.SURF,(k,v)=>typeof v==='number'?+v.toFixed(2):v),bombs:__G.P.bombs}));console.log(JSON.stringify(s));
console.log(errs.join('|')||'no errors');await b.close()})();
