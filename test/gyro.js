// 體感操控：用模擬的重力感應事件（橫拿手機），檢查左右傾＝轉彎、前後傾＝俯仰、校正、讀不到感應器時的提示
const {open}=require('./lib');(async()=>{
const {b,p,errs}=await open({viewport:{width:844,height:390},hasTouch:true,isMobile:true});await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const send=(gx,gy,gz)=>p.evaluate(([x,y,z])=>{const ev=new Event('devicemotion');ev.accelerationIncludingGravity={x,y,z};window.dispatchEvent(ev)},[gx,gy,gz]);
// 橫拿（螢幕轉 90 度）：在螢幕座標裡「上」= 裝置 -x；畫面往後仰 30 度
await p.evaluate(()=>{Object.defineProperty(screen,'orientation',{value:{angle:90},configurable:true})});
const dev=(rollDeg,tiltDeg)=>{const r=rollDeg*Math.PI/180,t=(30+tiltDeg)*Math.PI/180,g=9.81;
  // 螢幕座標的「上」向量：x=-sin(r)（向右傾時往左），y=cos(r)cos(t)，z=sin(t)；再轉回裝置座標（角度 90）
  const sx=-Math.sin(r)*Math.cos(t)*g,sy=Math.cos(r)*Math.cos(t)*g,sz=Math.sin(t)*g;const a=Math.PI/2,c=Math.cos(a),s=Math.sin(a);
  return [sx*c-sy*s,sx*s+sy*c,sz]};
await p.tap('[data-c="1"]');for(let i=0;i<5;i++){await send(...dev(0,0));await p.waitForTimeout(80)}
console.log('啟用後',await p.evaluate(()=>JSON.stringify({on:__G.GY.on,ok:__G.GY.ok,msg:document.getElementById('gyMsg').textContent})));
await p.tap('#mFree');await p.waitForTimeout(300);
const st=()=>p.evaluate(()=>{const P=__G.P,V=P.pos.constructor;const r=new V(1,0,0).applyQuaternion(P.q),u=new V(0,1,0).applyQuaternion(P.q);return{bank:Math.round(Math.atan2(-r.y,u.y)*57.3),hdg:Math.round(Math.atan2(P.vel.x,-P.vel.z)*57.3),alt:P.pos.y|0,roll:+__G.GY.roll.toFixed(2),pitch:+__G.GY.pitch.toFixed(2)}});
const hold=async(label,r,t,ms)=>{const o=[];const t0=Date.now();while(Date.now()-t0<ms){await send(...dev(r,t));await p.waitForTimeout(100);if(o.length<99)o.push(await st())}console.log(label,o.filter((_,i)=>i%3===0).map(x=>`坡${x.bank} 向${x.hdg} 高${x.alt}`).join(' | '),' 輸入',o[o.length-1].roll,o[o.length-1].pitch)};
await p.evaluate(()=>{__G.M.paused=true;const P=__G.P;P.pos.set(0,2000,-1500);P.vel.set(0,0,-230);P.q.set(0,0,0,1);P.thr=P.thrAct=.85;__G.M.paused=false});
await hold('水平拿著',0,0,1500);
await hold('往右傾 20 度',20,0,3000);
await hold('回正',0,0,2500);
await hold('往左傾 35 度',-35,0,2500);
await hold('回正並往自己拉 15 度',0,-15,2000);
await hold('上緣往外推 15 度',0,15,2000);
// 讀不到感應器的情況（例如 Claude 預覽頁面）
const c2=await b.newContext({viewport:{width:844,height:390}});const p2=await c2.newPage();
await p2.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',r=>r.fulfill({path:require('path').join(__dirname,'../node_modules/three',r.request().url().split('three@0.160.0/')[1]),contentType:'application/javascript'}));
await p2.route('http://sky.test/**',r=>r.fulfill({path:require('path').join(__dirname,'..',new URL(r.request().url()).pathname)}));
await p2.goto('http://sky.test/index.html');await p2.waitForFunction(()=>window.__G);await p2.click('[data-c="1"]');await p2.waitForTimeout(2300);
console.log('沒有感應器時',await p2.evaluate(()=>JSON.stringify({on:__G.GY.on,msg:document.getElementById('gyMsg').textContent})));
console.log(errs.join('|')||'no errors');await b.close()})();
