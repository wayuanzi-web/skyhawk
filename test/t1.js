const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:844,height:390}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',r=>r.fulfill({path:path.join(__dirname,'../node_modules/three',r.request().url().split('three@0.160.0/')[1]),contentType:'application/javascript'}));await p.route('http://sky.test/**',r=>r.fulfill({path:path.join(__dirname,'..',new URL(r.request().url()).pathname)}));
await p.goto('http://sky.test/index.html');await p.waitForFunction(()=>window.__G,{timeout:20000});
await p.waitForTimeout(500);await p.screenshot({path:'test/s_menu.png'});
const R=await p.evaluate(()=>{const G=__G,P=G.P,out={};const hdg=()=>Math.atan2(P.vel.x,-P.vel.z)*57.3;
 // 最大速度（後燃、海平面附近）
 G.M.diff=0;G.start('free');G.M.paused=true;P.pos.y=300;P.thr=1;P.aim.set(0,0,-1);G.run(150);out.vmaxAB_M=+P.mach.toFixed(3);out.vmaxAB_alt=P.pos.y|0;
 G.spawn(0);G.M.mode='free';G.spawn(0);P.pos.y=300;P.thr=.85;P.aim.set(0,0,-1);G.run(150);out.vmaxMil_M=+P.mach.toFixed(3);out.milAlt=P.pos.y|0;
 // 平飛保持
 G.spawn(0);P.thr=.6;P.aim.set(0,0,-1);G.run(40);out.level={alt:P.pos.y|0,kt:P.V*1.944|0,alpha:+(P.alpha*57.3).toFixed(1),hdg:+hdg().toFixed(1)};
 // 轉向 90 度
 P.aim.set(1,0,0);let t90=null;G.run(30,t=>{if(t90===null&&Math.abs(hdg()-90)<3)t90=t});out.turn90={t:t90,alt:P.pos.y|0,hdg:+hdg().toFixed(1),g:+P.g.toFixed(2)};
 // 直接操縱：最大持續轉彎
 G.spawn(0);P.pos.y=1000;P.thr=1;P.aim.set(0,0,-1);G.run(20);G.inp.stickOn=true;let h0=null,tt=0,gs=[];
 G.run(3,()=>{G.inp.sx=1;G.inp.sy=0});G.inp.sx=0; // roll
 const bank=()=>{const r=new (P.pos.constructor)(1,0,0).applyQuaternion(P.q);return Math.asin(-r.y)*57.3};
 out.bankAfterRoll=bank()|0;G.inp.stickOn=false;
 // 攻角上限測試：全拉
 G.spawn(0);P.pos.y=3000;P.thr=1;G.run(15);G.inp.stickOn=true;G.inp.sx=0;G.inp.sy=1;let gm=0,am=0;G.run(4,()=>{gm=Math.max(gm,P.g);am=Math.max(am,P.alpha)});G.inp.stickOn=false;out.pull={gmax:+gm.toFixed(2),amax:+(am*57.3).toFixed(1),V:P.V|0,state:P.state};
 return out});
console.log(JSON.stringify(R,null,1));console.log(errs.join('\n')||'no errors');
await b.close()})();
