const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const r=await p.evaluate(async()=>{const G=__G;G.start('land');G.M.paused=true;G.run(5);G.M.paused=false;
 const out=[];const R=G.renderer,orig=R.render.bind(R);R.render=(s,c)=>{orig(s,c);out.push([c.near,c.layers.mask,R.info.render.calls,R.info.render.triangles])};
 await new Promise(r=>setTimeout(r,600));R.render=orig;G.M.paused=true;return out.slice(-4)});
console.log(JSON.stringify(r));await p.screenshot({path:'test/dbg.png'});console.log(errs.join('|')||'no errors');await b.close()})();
