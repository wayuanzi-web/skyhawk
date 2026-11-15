const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const go=async(n,fn,wait=700)=>{await p.evaluate(fn);await p.evaluate(()=>{__G.M.paused=false});await p.waitForTimeout(wait);await p.evaluate(()=>{__G.M.paused=true});await p.screenshot({path:'test/'+n+'.png'})};
// 防空飛彈來襲：放干擾彈
await go('c_sam',()=>{const G=__G,P=G.P;G.M.diff=1;G.start('mission');G.spawn(3);G.M.paused=true;G.run(10.5);G.countermeasure();G.run(.4);G.countermeasure()});
// 敵機：鎖定
await go('c_lock',()=>{const G=__G,P=G.P;G.M.diff=1;G.start('mission');G.spawn(5);G.M.paused=true;for(let i=0;i<60;i++){const e=G.CB.ene[0];P.aim.copy(e.pos).sub(P.pos).normalize();G.run(.1)}});
await go('c_fire',()=>{const G=__G,P=G.P;G.fireMsl();G.run(1.5)});
const st=await p.evaluate(()=>({ene:__G.CB.ene.map(e=>[e.alive,e.pos.distanceTo(__G.P.pos)|0]),msl:__G.CB.msl.length,m9:__G.P.m9,m120:__G.P.m120,lock:__G.LOCK.ok}));console.log(JSON.stringify(st));
console.log(errs.join('|')||'no errors');await b.close()})();
