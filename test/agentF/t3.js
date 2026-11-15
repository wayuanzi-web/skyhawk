const {chromium}=require('playwright');const path=require('path');
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:844,height:390}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',r=>r.fulfill({path:path.join(__dirname,'../../node_modules/three',r.request().url().split('three@0.160.0/')[1]),contentType:'application/javascript'}));await p.route('http://sky.test/**',r=>r.fulfill({path:path.join(__dirname,'../..',new URL(r.request().url()).pathname)}));
await p.goto('http://sky.test/'+(process.env.PAGE||'index.html'));await p.waitForFunction(()=>window.__G);
const shot=async n=>{await p.evaluate(()=>{__G.M.paused=false});await p.waitForTimeout(300);await p.evaluate(()=>{__G.M.paused=true});await p.screenshot({path:'test/agentF/t3_'+(process.env.PAGE||'').includes('exp')+'_'+n+'.png'})};
// 放手不管：只靠自動油門與初始指向
let r=await p.evaluate(()=>{const G=__G,P=G.P;G.start('land');G.M.paused=true;const log=[];
 for(let s=0;s<700&&P.state!=='dead'&&P.state!=='done';s++){
   const t=G.LP0.clone().addScaledVector(G.LD,73),rel=P.pos.clone().sub(t),along=-rel.dot(G.LD);
   if(P.state==='fly'&&!P.onDeck&&along>30){const la=Math.max(0,along-450),tp=t.clone().addScaledVector(G.LD,-la);tp.y=20+2.3+Math.tan(0.061)*la;P.aim.copy(tp).sub(P.pos).normalize()}
   G.run(.1);if(s%50===0)log.push([along|0,(P.pos.y)|0,(P.V*1.944)|0,+(P.alpha*57.3).toFixed(1),+P.thr.toFixed(2),+P.vel.y.toFixed(1)])}
 return{st:P.state,why:G.M.why,td:G.M.td,grade:G.M.grade,log}});
console.log(JSON.stringify(r));
await p.evaluate(()=>{const G=__G;G.start('land');G.M.paused=true;G.run(25)});await shot('s_land');
await p.evaluate(()=>{const G=__G,P=G.P;G.M.diff=0;G.start('mission');G.spawn(1);G.M.paused=true;for(let s=0;s<150;s++){const u=-P.pos.z,la=u+850;P.aim.set(G.xc(la)-P.pos.x,G.floorOf(la)+75-P.pos.y,-la-P.pos.z).normalize();G.run(.1)}});await shot('s_canyon');
console.log(errs.join('\n')||'no errors');await b.close()})();
