// 畫面檢查：真實時間（有算圖）拖指向圈大轉彎，截圖看飛機、指向圈、地平線
process.env.RENDER='1';const {boot}=require('./h');const path=require('path');
(async()=>{const H=await boot();const {p,T,wait}=H;const tag=process.env.TAG||'base';
await p.evaluate(()=>{const G=__G,P=G.P;G.start('free');P.pos.set(0,1500,-1500);P.vel.set(0,0,-230);P.q.set(0,0,0,1);P.aim.set(0,0,-1);P.thr=P.thrAct=.8;G.M.paused=false});
await wait(1500);
const shot=async n=>{const s=await p.evaluate(()=>{const r=__samp();return `t${r.t} 坡${r.bank} 向${r.hdg} 指向圈-速度 ${r.aimE}° 機頭-指向圈 ${r.nose}° 圈畫面(${r.sx},${r.sy})`});console.log(n,s);await p.screenshot({path:path.join(__dirname,`cam_${tag}_${n}.png`)})};
await shot(0);
const sw=async(x0,dx)=>{await T('touchStart',[{x:x0,y:200,id:1}]);for(let i=1;i<=12;i++){await T('touchMove',[{x:x0+dx*i/12,y:200,id:1}])}await T('touchEnd',[])};
await sw(470,330);await sw(470,330);
for(let i=1;i<=6;i++){await wait(1200);await shot(i)}
await H.b.close()})();
