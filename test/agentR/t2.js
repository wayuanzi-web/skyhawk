const {go,seg}=require('./rlib');const mk=require('./mkprobe');
(async()=>{for(const s of [0,1,-1]){mk('exp_b.html',s?[["-clamp(beta*4,-1,1)-c.yaw*.15","-clamp(beta*4,-1,1)-c.yaw*.15+("+s+")*P.w.z*Math.tan(clamp(alpha,-.6,.6))"]]:[]);
 const {b,p}=await go('test/agentR/exp_b.html');await p.evaluate(()=>freeStart());
 const r=await seg(p,4,1/60,"(()=>{let s=__T;return (t)=>{if(t>0.3&&t<0.32)setAimRel(1.4,0)}})()",0.1);
 const rr=await (async()=>{await p.evaluate(()=>freeStart());return seg(p,3,1/60,"(()=>{return (t)=>{if(t>0.3&&t<1.5){__G.inp.stickOn=true;__G.inp.sx=1;__G.inp.sy=-0.6}else{__G.inp.stickOn=false}}})()",0.1)})();
 console.log('sign',s,'turn: max|beta|',Math.max(...r.map(x=>Math.abs(x.b))).toFixed(2),'hdg@4s',r[r.length-1].hdg,'bank seq',r.slice(0,14).map(x=>x.bank).join(','));
 console.log('        roll+pull: max|beta|',Math.max(...rr.map(x=>Math.abs(x.b))).toFixed(2),'a',Math.max(...rr.map(x=>x.a)).toFixed(1));await b.close()}})();
