// 觸控試飛全套情境。用法：node fly.js [情境字母...]；PAGE=test/agentT/exp.html 換成實驗版
const {boot,fmt,sum}=require('./h');const BS=process.env.BS;
const want=process.argv.slice(2);const on=k=>!want.length||want.includes(k);
(async()=>{const H=await boot();const {p,T,reset,run,drag,log}=H;if(BS)await p.evaluate(b=>{window.__BS=JSON.parse(b)},BS);
const out=(name,L,every=5,keys)=>{console.log('\n== '+name+' ==');console.log(fmt(L,every,keys));console.log('  ▶ '+sum(L))};
const K=['t','bank','hdg','gam','alt','g','aimE','nose','roll'];
// 推定穩定時間與過衝：目標航向 tgt
const settle=(L,tgt)=>{let os=0,ts=null;for(const r of L){let e=r.hdg-tgt;while(e>180)e-=360;while(e<-180)e+=360;if(Math.sign(e)===Math.sign(tgt)&&Math.abs(e)>os)os=Math.abs(e)}
  for(let i=L.length-1;i>=0;i--){let e=L[i].hdg-tgt;while(e>180)e-=360;while(e<-180)e+=360;if(Math.abs(e)>2||Math.abs(L[i].bank)>5){ts=L[i+1]?L[i+1].t:null;break}}return`過衝 ${os}°｜航向誤差<2°且坡度<5° 的時間 ${ts}s`};
if(on('A')){await reset();await run(.3);log();
  await drag(560,200,100,0,10,16,true);await run(10);const L=await log();out('A 小幅右拖 100px（想轉約 25°）後放手',L,5,K);
  console.log('  ▶ 目標航向 '+L[3].aimE+'° ',settle(L,L.at(-1).hdg));}
if(on('A2')){await reset();await run(.3);log();
  await drag(560,200,50,0,6,16,true);await run(8);const L=await log();out('A2 很小右拖 50px（想轉約 10°）',L,5,K);}
if(on('B')){await reset();await run(.3);log();
  for(let k=0;k<2;k++)await drag(470,200,330,0,12,16,true);await run(16);const L=await log();out('B 大幅右拖兩次各 330px（想轉 180°）',L,8,K);}
if(on('C')){await reset();await run(.3);log();
  await drag(470,200,330,0,12,16,false);await run(2);await T('touchEnd',[]);await run(10);const L=await log();out('C 右拖 330px、按住 2 秒後放手（轉到一半放手）',L,6,K);}
if(on('C2')){// 轉到一半，想停住轉彎：點兩下回正
  await reset();await run(.3);log();await drag(470,200,330,0,12,16,true);await run(3);
  await H.tap(600,200);await run(.1);await H.tap(600,200);await run(8);const L=await log();out('C2 右拖 330px，3 秒後點兩下回正',L,5,K);}
if(on('D')){// 對準目標：目標在航向 30°，玩家每 0.5 秒看一次，把指向圈拖到目標上（誤差×增益），模擬人類「看到差多少就拖多少，略有過頭」
  await reset();await run(.3);log();const tgt=30;let rows=[];
  for(let k=0;k<24;k++){const s=await p.evaluate(()=>__samp());let e=tgt-(s.hdg+s.aimE);// 指向圈相對目標的偏差
    const px=Math.max(-150,Math.min(150,e/0.26*1.25));if(Math.abs(e)>1.5)await drag(600,200,px,0,6,16,true);await run(.5)}
  const L=await log();out('D 連續修正對準航向 30° 的目標（每 0.5s 拖指向圈過去，手會多拖 25%）',L,5,K);console.log('  ▶ ',settle(L,30));}
if(on('D2')){// 對準目標：目標在航向 30°，玩家每 0.5 秒看一次，把指向圈拖到目標上（誤差×增益），模擬人類「看到差多少就拖多少，略有過頭」
  await reset();await run(.3);log();const tgt=30;let rows=[];
  for(let k=0;k<24;k++){const s=await p.evaluate(()=>__samp());let e=tgt-(s.hdg+s.aimE);// 指向圈相對目標的偏差
    const px=Math.max(-150,Math.min(150,e/0.26*1.25));if(Math.abs(e)>1.5)await drag(k%2?540:660,k%4<2?150:250,px,0,6,16,true);await run(.5)}
  const L=await log();out('D2 （起點錯開，避開雙擊）連續修正對準航向 30° 的目標（每 0.5s 拖指向圈過去，手會多拖 25%）',L,5,K);console.log('  ▶ ',settle(L,30));}
if(on('E')){await reset({alt:3000});await run(.3);log();
  await drag(600,90,0,220,11,16,true);await run(5);await drag(520,300,0,-230,11,16,true);await run(8);const L=await log();
  out('E 往下拖 220px 俯衝 5 秒，再往上拖 230px 拉起',L,5,['t','bank','pitch','gam','alt','g','kt','aimEl','alpha']);}
if(on('E2')){await reset({alt:3000});await run(.3);log();
  await drag(600,200,0,-200,11,16,true);await run(6);const L=await log();
  out('E2 往上拖 200px 爬升',L,5,['t','bank','pitch','gam','alt','g','kt','aimEl','alpha']);}
if(on('F')){// 先右轉中，改成左轉（反向）
  await reset();await run(.3);log();await drag(560,200,120,0,10,16,true);await run(2.5);await drag(700,200,-240,0,12,16,true);await run(6);const L=await log();out('F 右轉中途改左拖 240px（左右反向）',L,4,K);}
if(on('G')){await reset();await run(.3);log();
  await T('touchStart',[{x:200,y:220,id:2}]);await T('touchMove',[{x:260,y:220,id:2}]);await run(1.2);await T('touchEnd',[]);await run(20);const L=await log();
  out('G 左手虛擬搖桿往右推 60px 1.2 秒後放開',L,10,K);}
if(on('G2')){await reset();await run(.3);log();
  await T('touchStart',[{x:200,y:220,id:2}]);await T('touchMove',[{x:290,y:220,id:2}]);await run(1.5);await T('touchEnd',[]);await run(20);const L=await log();
  out('G2 搖桿往右推到底 1.5 秒後放開',L,10,K);}
if(on('H')){// 峽谷：mission 檢查點 1，玩家看前方 1.2 公里中線點，每 0.3 秒把指向圈拖過去
  await p.evaluate(()=>{const G=__G;G.M.mode='mission';G.start('mission');G.spawn(1);G.M.paused=true;window.__LOG=[]});
  const rows=[];let dev=[];
  for(let k=0;k<100;k++){const s=await p.evaluate(()=>{const P=__G.P,u=-P.pos.z,la=Math.max(900,P.V*4.5),tx=__G.xc(u+la),fl=__G.floorOf(u+la)+40;
      const dh=Math.atan2(tx-P.pos.x,la)*57.3,dv=Math.atan2(fl-P.pos.y,la)*57.3,s=__samp();return{dh,dv,s,dev:P.pos.x-__G.xc(u),agl:P.pos.y-Math.max(0,__G.groundH(P.pos.x,P.pos.z)),st:P.state,u}});
    if(s.st!=='fly'){console.log('  !! 狀態',s.st,'t',s.s.t);break}
    dev.push({t:s.s.t,dev:Math.round(s.dev),agl:Math.round(s.agl),bank:s.s.bank});
    const eh=s.dh-(s.s.hdg+s.s.aimE),ev=s.dv-s.s.aimEl;const px=Math.max(-160,Math.min(160,eh/0.26)),py=Math.max(-120,Math.min(120,-ev/0.26));
    if(Math.abs(eh)>1||Math.abs(ev)>1)await drag(k%2?540:660,k%4<2?150:250,px,py,4,16,true);await run(.3)}
  const L=await log();out('H 峽谷跟彎道（每 0.3s 指向圈對準前方中線）',L,10,K);
  console.log('  ▶ 偏離中線/離地',dev.filter((_,i)=>i%5===0).map(d=>`t${d.t}:${d.dev}m/${d.agl}m/坡${d.bank}`).join(' '));
  console.log('  ▶ 最大偏離',Math.max(...dev.map(d=>Math.abs(d.dev))),'最低離地',Math.min(...dev.map(d=>d.agl)),'坡度變號次數',dev.reduce((a,d,i)=>a+(i&&Math.sign(d.bank)!==Math.sign(dev[i-1].bank)&&Math.abs(d.bank)>10?1:0),0));
  console.log('  ▶ 狀態',await p.evaluate(()=>__G.P.state+' '+(__G.M.why||'')));}
console.log(H.errs.join('|')||'no errors');await H.b.close()})();
