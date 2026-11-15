const {open}=require('../lib');(async()=>{const {b,p,errs}=await open({},process.argv[2]||'index.html');await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const r=await p.evaluate(async()=>{const G=__G,o={};const snap=async(name,fn)=>{fn();G.M.paused=false;await new Promise(r=>setTimeout(r,900));G.M.paused=true;const i=G.renderer.info;o[name]={calls:i.render.calls,tris:i.render.triangles,geom:i.memory.geometries,tex:i.memory.textures}};
 await snap('menu',()=>{});
 await snap('deck',()=>{G.start('mission');G.M.paused=true});
 await snap('canyon',()=>{G.spawn(1);G.M.paused=true;G.run(5)});
 await snap('cockpit',()=>{G.act.view();G.run(1)});
 return o});
console.log(JSON.stringify(r));console.log(errs.join('|')||'no errors');await b.close()})();
