const {open}=require('../lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const r=await p.evaluate(()=>{const G=__G,o={};let best=[0,0,0];for(let u=8000;u<24000;u+=200)for(let x=-7000;x<7000;x+=200){const h=G.groundH(x,-u);if(h>best[0])best=[h,x,u]}o.max=best;
o.canyon=[7000,9000,12000,15000,18000].map(u=>({u,xc:G.xc(u),fl:G.floorOf(u),prof:[-600,-400,-300,-200,0,200,300,400,600,900].map(d=>Math.round(G.groundH(G.xc(u)+d,-u)))}));
o.coast=[5600,5700,5800,5900,6000,6200].map(u=>[u,[-3000,-1000,0,1000,3000].map(x=>Math.round(G.groundH(x,-u)))]);
o.T=Object.keys(G.TERRAIN);o.chunks=G.TERRAIN.chunks;return o});console.log(JSON.stringify(r,null,0));console.log(errs.join('|')||'ok');await b.close()})();
