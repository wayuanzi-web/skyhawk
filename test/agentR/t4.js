const {go}=require('./rlib');(async()=>{const {b,p}=await go();
const r=await p.evaluate(()=>{freeStart();for(let i=0;i<30;i++)tick(1/30,false);setAimRel(1.4,0);const o=[];for(let i=0;i<90;i++){tick(1/30,false);if(i%15==0){const s=window.__G.SURF||{};o.push({g:__G.P.g.toFixed(1),cmd:JSON.stringify(__G.P.cmd&&{p:+(__G.P.cmd.pitch||0).toFixed(2),r:+(__G.P.cmd.roll||0).toFixed(2),a:+(__G.P.cmd.aCmd||0).toFixed(2)})})}}return o});
console.log(JSON.stringify(r));await b.close()})();
