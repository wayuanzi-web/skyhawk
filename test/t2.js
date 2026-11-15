const {chromium}=require('playwright');const path=require('path');
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:844,height:390}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',r=>r.fulfill({path:path.join(__dirname,'../node_modules/three',r.request().url().split('three@0.160.0/')[1]),contentType:'application/javascript'}));await p.route('http://sky.test/**',r=>r.fulfill({path:path.join(__dirname,'..',new URL(r.request().url()).pathname)}));
await p.goto('http://sky.test/index.html');await p.waitForFunction(()=>window.__G);
const shot=async n=>{await p.evaluate(()=>{__G.M.paused=true});await p.waitForTimeout(250);await p.screenshot({path:'test/'+n+'.png'})};
const diff=+(process.argv[2]||0),noAAA=process.argv[3]==='noaaa';
// 彈射
let r=await p.evaluate(([d,na])=>{const G=__G,P=G.P;G.M.diff=d;G.start('mission');G.M.paused=true;if(na)for(const a of G.AAA)a.hp=0;P.thr=1;G.run(2);G.act.launch();G.run(1.2);return{st:P.state,v:P.V|0,z:P.pos.z|0}},[diff,noAAA]);
console.log('cat',JSON.stringify(r));await shot('s_cat');
r=await p.evaluate(()=>{const G=__G,P=G.P;G.run(6);G.act.gear();G.act.flap();const a={y:P.pos.y|0,v:P.V|0,ph:G.M.phase,st:P.state,why:G.M.why};return a});console.log('after launch',JSON.stringify(r));
// 飛向峽谷並穿越
r=await p.evaluate((d)=>{const G=__G,P=G.P,M=G.M,LIM=[150,90,30][d];let maxH=0,maxLock=0,log=[];const V3=P.pos.constructor;
 const aimAt=(x,y,z)=>{P.aim.set(x-P.pos.x,y-P.pos.y,z-P.pos.z).normalize()};
 for(let s=0;s<2400&&P.state==='fly'&&M.phase<3;s++){const u=-P.pos.z,la=u+850;
   if(u<7000)aimAt(0,60,-(u+1500));else aimAt(G.xc(la),G.floorOf(la)+LIM*.5,-la);
   P.thr=Math.max(0.2,Math.min(1,.6+(215-P.V)*.03));G.run(.1);
   if(M.phase===2){const h=P.pos.y-G.floorOf(u);maxH=Math.max(maxH,h);maxLock=Math.max(maxLock,M.lock)}
   if(s%100===0)log.push([u|0,(P.pos.y-G.floorOf(u))|0,(P.pos.x-G.xc(u))|0,P.V|0,+P.g.toFixed(1),P.hp|0])}
 return{st:P.state,why:M.why,ph:M.phase,t:M.t|0,maxH:maxH|0,maxLock:+maxLock.toFixed(2),hp:P.hp|0,log}},diff);
console.log('canyon',JSON.stringify(r));
await p.evaluate(()=>{__G.M.paused=false});await p.waitForTimeout(400);await shot('s_popup');
// 翻越、投彈
r=await p.evaluate(()=>{const G=__G,P=G.P,M=G.M;const imp=new P.pos.constructor();let rel=null,log=[];
 const aimAt=(x,y,z)=>{P.aim.set(x-P.pos.x,y-P.pos.y,z-P.pos.z).normalize()};
 for(let s=0;s<700&&P.state==='fly'&&M.phase===3;s++){const u=-P.pos.z;
   if(u<21300)aimAt(G.tgtPos.x,1050,-21500);else{if(G.ccip(imp))aimAt(2*G.tgtPos.x-imp.x,G.tgtPos.y+Math.min(400,Math.hypot(imp.x-G.tgtPos.x,imp.z-G.tgtPos.z)*.5),2*G.tgtPos.z-imp.z);else aimAt(G.tgtPos.x,G.tgtPos.y,G.tgtPos.z)}P.thr=.5;
   if(u>21300&&G.ccip(imp)){const d=Math.hypot(imp.x-G.tgtPos.x,imp.z-G.tgtPos.z);if(d<35&&P.bombs>0){G.dropBomb();rel={alt:P.pos.y|0,v:P.V|0,d:d|0};aimAt(G.tgtPos.x,3000,G.tgtPos.z-3000);P.thr=1;for(let k=0;k<200&&P.state==='fly'&&M.phase===3;k++){aimAt(P.pos.x+ (P.pos.x>0?-1:1)*200,P.pos.y+3000,P.pos.z-800);G.run(.1)}}}
   G.run(.1);if(s%20===0)log.push([u|0,P.pos.y|0,(P.pos.y-G.groundH(P.pos.x,P.pos.z))|0,P.V|0,+P.g.toFixed(1)])}
 return{st:P.state,why:M.why,ph:M.phase,rel,tgt:M.tgt,bombs:P.bombs,hp:P.hp|0,log}});
console.log('attack',JSON.stringify(r));
await p.evaluate(()=>{__G.M.paused=false});await p.waitForTimeout(400);await shot('s_egress');
console.log(errs.join('\n')||'no errors');await b.close()})();
