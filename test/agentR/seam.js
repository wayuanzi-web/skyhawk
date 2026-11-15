const {go}=require('./rlib');(async()=>{const {b,p}=await go(process.argv[2]||'test/agentR/probe.html');const T=process.argv[3]||'';
await p.evaluate(()=>{freeStart(1500,230);tick(1/30,false);const V=__G.P.pos.constructor;window.__CAMO={p:new V(3000,120,3000),l:new V(3000,0,2700),fov:60};tick(1/30,true)});
await p.screenshot({path:__dirname+'/seam_sea'+T+'.png'});
await p.evaluate(()=>{const V=__G.P.pos.constructor;window.__CAMO={p:new V(3000,60,3000),l:new V(3000,0,2850),fov:50};tick(1/30,true)});
await p.screenshot({path:__dirname+'/seam_sea2'+T+'.png'});await b.close()})();
