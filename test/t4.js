const {chromium}=require('playwright');const path=require('path');
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const ctx=await b.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});await ctx.addInitScript(()=>{try{localStorage.setItem('skyhawk_tut','1');localStorage.setItem('skyhawk_qa','0')}catch(e){}});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',r=>r.fulfill({path:path.join(__dirname,'../node_modules/three',r.request().url().split('three@0.160.0/')[1]),contentType:'application/javascript'}));await p.route('http://sky.test/**',r=>r.fulfill({path:path.join(__dirname,'..',new URL(r.request().url()).pathname)}));
await p.goto('http://sky.test/index.html');await p.waitForFunction(()=>window.__G);
await p.tap('#mMission');await p.waitForTimeout(300);
const st=()=>p.evaluate(()=>({st:__G.P.state,thr:+__G.P.thr.toFixed(2),gear:__G.P.gear,aimx:+__G.P.aim.x.toFixed(3),aimy:+__G.P.aim.y.toFixed(3),v:__G.P.V|0,y:__G.P.pos.y|0,ph:__G.M.phase,paused:__G.M.paused}));
console.log('start',JSON.stringify(await st()));
await p.tap('#bLaunch');console.log('launch w/o thr',JSON.stringify(await st()));
// 油門滑到頂（指標事件）
const drag=async(x0,y0,x1,y1)=>{await p.mouse.move(x0,y0);await p.mouse.down();await p.mouse.move((x0+x1)/2,(y0+y1)/2);await p.mouse.move(x1,y1);await p.mouse.up()};
await drag(20,300,20,70);console.log('thr',JSON.stringify(await st()));
await p.waitForTimeout(2500);await p.tap('#bLaunch');await p.waitForTimeout(6000);console.log('after cat',JSON.stringify(await st()));
await p.tap('#bGear');await p.tap('#bFlap');await drag(600,200,680,200);console.log('aim drag right',JSON.stringify(await st()));
await p.waitForTimeout(3000);console.log('3s later',JSON.stringify(await st()));await p.screenshot({path:'test/s_live.png'});
await p.tap('#bPause');await p.waitForTimeout(200);await p.screenshot({path:'test/s_pause.png'});
const fps=await p.evaluate(()=>new Promise(r=>{__G.M.paused=false;document.getElementById('menu').style.display='none';let n=0,t0=performance.now();const f=()=>{n++;if(performance.now()-t0>3000)r(n/3);else requestAnimationFrame(f)};f()}));console.log('fps(software GL)',fps.toFixed(1));
console.log(errs.join('\n')||'no errors');await b.close()})();
