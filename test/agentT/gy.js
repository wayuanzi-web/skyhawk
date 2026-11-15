// 體感（手機傾斜）試飛：橫拿手機，模擬 devicemotion
const {boot,fmt,sum}=require('./h');
(async()=>{const H=await boot();const {p,reset,run,log}=H;
await p.evaluate(()=>{Object.defineProperty(screen,'orientation',{value:{angle:90},configurable:true})});
const dev=(rollDeg,tiltDeg)=>{const r=rollDeg*Math.PI/180,t=(30+tiltDeg)*Math.PI/180,g=9.81;
  const sx=-Math.sin(r)*Math.cos(t)*g,sy=Math.cos(r)*Math.cos(t)*g,sz=Math.sin(t)*g;const a=Math.PI/2,c=Math.cos(a),s=Math.sin(a);return [sx*c-sy*s,sx*s+sy*c,sz]};
const send=(r,t)=>p.evaluate(([x,y,z])=>{const ev=new Event('devicemotion');ev.accelerationIncludingGravity={x,y,z};window.dispatchEvent(ev)},dev(r,t));
await p.tap('[data-c="1"]');for(let i=0;i<5;i++){await send(0,0);await p.waitForTimeout(50)}
// 手機感應器 60Hz：每 1/60 秒送一筆再跑一格
const hold=async(r,t,sec)=>{for(let i=0;i<sec*60;i++){await send(r,t);await run(1/60)}};
// 漸進傾斜（真人約 0.3 秒傾到位）
const ramp=async(r0,t0,r1,t1,sec=.3)=>{const n=Math.round(sec*60);for(let i=1;i<=n;i++){await send(r0+(r1-r0)*i/n,t0+(t1-t0)*i/n);await run(1/60)}};
const K=['t','bank','hdg','gam','alt','g','roll','kt'];
const sc=async(name,fn)=>{await reset();for(let i=0;i<40;i++)await send(0,0);await p.evaluate(()=>{__G.GY.cal=true});await send(0,0);await run(.2);await p.evaluate(()=>__LOG.splice(0));await fn();const L=await p.evaluate(()=>__LOG.splice(0));
  console.log('\n== '+name+' ==\n'+fmt(L,5,K)+'\n  ▶ '+sum(L)+'  GY.roll='+await p.evaluate(()=>__G.GY.roll.toFixed(2)))};
const want=process.argv.slice(2),on=k=>!want.length||want.includes(k);
if(on('a'))await sc('a 往右傾 10 度 6 秒',async()=>{await ramp(0,0,10,0);await hold(10,0,6)});
if(on('b'))await sc('b 往右傾 20 度 6 秒再回正 4 秒',async()=>{await ramp(0,0,20,0);await hold(20,0,6);await ramp(20,0,0,0);await hold(0,0,4)});
if(on('c'))await sc('c 往左傾 35 度 8 秒（急轉）再回正',async()=>{await ramp(0,0,-35,0);await hold(-35,0,8);await ramp(-35,0,0,0);await hold(0,0,4)});
if(on('d'))await sc('d 手機往自己拉 10 度 3 秒再回正',async()=>{await ramp(0,0,0,-10);await hold(0,-10,3);await ramp(0,-10,0,0);await hold(0,0,4)});
if(on('e'))await sc('e 上緣往外推 10 度 3 秒再回正',async()=>{await ramp(0,0,0,10);await hold(0,10,3);await ramp(0,10,0,0);await hold(0,0,4)});
if(on('f'))await sc('f 右傾 25 度＋往自己拉 8 度（拉著轉）6 秒',async()=>{await ramp(0,0,25,-8);await hold(25,-8,6);await ramp(25,-8,0,0);await hold(0,0,3)});
if(on('g'))await sc('g 手微抖（±3 度、2Hz）10 秒，看是否保持直飛',async()=>{for(let i=0;i<600;i++){await send(3*Math.sin(i/60*2*Math.PI*2),2*Math.sin(i/60*2*Math.PI*1.3));await run(1/60)}});
if(on('h'))await sc('h 在 2000 公尺右傾 30 度保持 30 秒（看會不會掉高度/速度）',async()=>{await ramp(0,0,30,0);await hold(30,0,30)});
console.log(H.errs.join('|')||'no errors');await H.b.close()})();
