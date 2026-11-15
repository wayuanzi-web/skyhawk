const {go,seg}=require('./rlib');const mk=require('./mkprobe');
(async()=>{for(const [nm,pt] of [['base',[]],['cap',[["const n=clamp(nT,-1.5,AC.GMAX)","const n=clamp(nT,-1.5,P.gear?1.4:AC.GMAX)"]]]]){mk('exp_c.html',pt);
 const {b,p}=await go('test/agentR/exp_c.html');await p.evaluate(()=>{__G.start('mission');__G.P.thr=1;for(let i=0;i<60;i++)tick(1/30,false);__G.act.launch()});
 const r=await seg(p,8,1/30,null,0.5);console.log(nm,r.map(x=>`${x.t.toFixed(1)}s ${x.kt}kt 仰${x.pitch} 攻${x.a} 高${x.alt|0} G${x.g}`).join(' | '));await b.close()}})();
