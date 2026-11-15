// node one.js page out.png scene(entrance)
const {open}=require('../lib');(async()=>{const {b,p,errs}=await open({},process.argv[2]);await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
await p.evaluate(()=>{for(const e of document.body.children)if(e.id!=='gl'&&e.tagName!=='SCRIPT')e.style.visibility='hidden';const G=__G;G.start('free');G.M.paused=true;G.plane.scale.setScalar(1e-4);const T=G.P.pos.constructor;
 G.P.pos.set(0,150,-6400);window.__CAMO={p:new T(0,150,-6373),l:new T(0,140,-6600),fov:66}});await p.waitForTimeout(1200);await p.screenshot({path:process.argv[3]});console.log(errs.join('|')||'ok');await b.close()})();
