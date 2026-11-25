// 大和沉沒過場（子代理 Y）：三種沉法、拖曳時間軸一致性、跳過、結算時機（等所有過場結束）、重播、效能、截圖 test/sinkY/
// 用法：node test/sinkY.js [ten|bow|mag|flow|perf]...（不給＝全部）
const {open}=require('./lib');const fs=require('fs');const OUT='test/sinkY';fs.mkdirSync(OUT,{recursive:true});
const want=process.argv.slice(2);const on=k=>!want.length||want.includes(k);
const raf=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function boot(){const o=await open({viewport:{width:844,height:390},hasTouch:true,isMobile:true});await o.p.waitForFunction(()=>window.__G&&__G.PARTS&&__G.YM.bb.lods,null,{timeout:120000});return o}
// 依沉法造命中紀錄並觸發沉沒（走真正的 ymHit／updYM 流程）
const SETUP={
 ten:()=>{const G=__G,S=G.YM.bb,T=G.THREE.Vector3;for(const z of [-40,-5,30,60,10])G.ymHit(S,'hpn',new T(-18.5,1.6,z));G.ymHit(S,'hpn',new T(18.5,1.6,0));S.flL=80},
 bow:()=>{const G=__G,S=G.YM.bb,T=G.THREE.Vector3;for(const z of [-100,-108,-95,-112])G.ymHit(S,'hpn',new T(z%2?-9:9,1.4,z));S.flL=48;S.flR=50;},
 mag:()=>{const G=__G,S=G.YM.bb,T=G.THREE.Vector3;for(let i=0;i<6&&!S.magd;i++)G.ymHit(S,'bomb',new T(0,16,-33.5))}};
async function trigger(p,mode){return p.evaluate(([m,src])=>{const G=__G,C=__SINK.SINKCIN;G.start('yamato');G.M.paused=true;G.run(1);C.playing=false;eval('('+src+')')();
  let i=0;for(;i<600&&!C.active;i++)G.run(.1);if(!C.active)return {err:'沒有進入過場'};const P=C.P;
  return {mode:P.mode,label:P.label,dur:P.dur,tx:P.tx<1e8?P.tx:null,events:C.ev.length,cams:C.cams.map(c=>c.name),shots:P.shots.length,hits:(G.YM.bb.hits||[]).length,goneF:P.goneF,goneA:P.goneA,steamT:P.steamT,turrets:P.tur.map(u=>u.id),chunks:P.ch.length,people:P.ppl.length,floats:P.fl.length,how:G.YM.st.how,resultShown:document.getElementById('result').style.display==='flex',paused:G.M.paused}},[mode,SETUP[mode].toString()])}
async function shot(p,t,cam,name){await p.evaluate(([t,c])=>{const C=__SINK.SINKCIN;C.cam=C.cams.findIndex(x=>x.name===c);C.seek(t)},[t,cam]);await raf(p);await p.evaluate(t=>__SINK.SINKCIN.seek(t),t);await raf(p);await p.screenshot({path:`${OUT}/${name}.png`})}
const SHOTS={
 ten:[[2,'空中盤旋','01_開場'],[14,'低角水面','02_左傾'],[24,'艦橋特寫','03_艦橋'],[36,'美軍機視角','04_加速翻覆'],[44,'艦橋特寫','05_主甲板垂直'],[50.25,'美軍機視角','06_殉爆閃光'],[51.5,'低角水面','07_火球衝擊波'],[56,'低角水面','08_斷成兩截'],[62,'艦艉','09_後段翻覆'],[57,'艦橋特寫','10_斷面'],[80,'空中盤旋','11_漩渦油污'],[96,'蕈狀雲遠景','12_蕈狀雲遠景16km'],[108,'美軍機視角','13_最後煙雲']],
 bow:[[2,'空中盤旋','01_開場'],[20,'低角水面','02_艦艏下沉'],[34,'艦艉','03_螺旋槳露出'],[44,'低角水面','04_艦艉抬高'],[48,'美軍機視角','05_史實角度'],[52,'艦艉','06_舵與螺旋槳'],[58,'空中盤旋','07_滑入'],[66,'空中盤旋','08_漩渦'],[76,'美軍機視角','09_結束']],
 mag:[[.8,'艦橋特寫','01_直擊前'],[1.7,'美軍機視角','02_閃光'],[2.6,'美軍機視角','03_火球'],[4,'低角水面','04_衝擊波'],[8,'低角水面','05_V字斷裂'],[12,'空中盤旋','06_兩截下沉'],[18,'艦艉','07_後段'],[26,'空中盤旋','08_漩渦'],[34,'蕈狀雲遠景','09_遠景'],[50,'美軍機視角','10_最後']]};
(async()=>{let fail=0;const ok=(c,m)=>{console.log((c?'通過 ':'失敗 ')+m);if(!c)fail++};
for(const mode of ['ten','bow','mag']){if(!on(mode))continue;const {b,p,errs}=await boot();
  const r=await trigger(p,mode);await p.evaluate(()=>new Promise(r=>{let n=0;const f=()=>{if(++n>45)r();else requestAnimationFrame(f)};f()}));console.log(mode,JSON.stringify(r));ok(r.mode===mode,`${mode}：沉法由命中紀錄選出 ${r.mode}`);ok(!r.resultShown,`${mode}：過場中沒有結算`);ok(r.cams&&r.cams.length>=7,`${mode}：機位 ${r.cams&&r.cams.length} 個`);
  // 拖曳時間軸：往前跳、往回跳到同一時刻，姿態與特效要一致
  const sc=await p.evaluate(()=>{const C=__SINK.SINKCIN,S=__G.YM.bb,P=C.P,Y=__YSK,O=Y.O;const sig=()=>[S.roll.toFixed(4),S.pitch.toFixed(4),S.sinkY.toFixed(3),S.root.position.x.toFixed(2),S.ysk.aft?S.ysk.aft.position.toArray().map(v=>v.toFixed(2)).join():'-',O.bb.n,O.ad.n,O.ppl.count,O.chunk.count,O.flot.count,O.bb.st[0].toFixed(2),O.bb.st[1].toFixed(2)].join('|');
    const tm=P.tx<1e8?P.tx+10:P.dur*.6;C.seek(tm);const a=sig();C.seek(P.dur-1);C.seek(3);C.seek(tm);const b=sig();for(let t=tm-3;t<tm;t+=.05)C.step(.05);C.seek(tm);const c=sig();return {a,b,c,tm}});
  ok(sc.a===sc.b&&sc.a===sc.c,`${mode}：拖曳時間軸 t=${sc.tm.toFixed(1)} 前跳／回跳／播放後狀態一致`);if(sc.a!==sc.b)console.log(' ',sc.a,'\n ',sc.b);
  for(const [t,c,n] of SHOTS[mode])await shot(p,t,c,`${mode}_${n}`);
  // 導演機位：每個鏡頭切換時刻都能算出合理位置（不在水下、不是 NaN）
  const dr=await p.evaluate(()=>{const C=__SINK.SINKCIN,A={P:C.P,C:C.cams,S:C.S},bad=[];for(let t=0;t<=A.P.dur;t+=.5){for(const c of A.C){const o=c.fn(A.S,A.P,t);if(![o.p.x,o.p.y,o.p.z,o.l.x,o.l.y,o.fov].every(Number.isFinite)||o.p.y<1.9)bad.push(c.name+'@'+t)}}return bad.slice(0,5)});ok(!dr.length,`${mode}：所有機位全程有效 ${dr.join(',')}`);
  // 播放（真實時間 2 倍速 6 秒），然後跳過 → 結算時機
  const fl=await p.evaluate(async()=>{const G=__G,C=__SINK.SINKCIN;C.seek(10);C.playing=true;C.spd=2;G.M.paused=false;await new Promise(r=>setTimeout(r,6000));const t1=C.active?C.t:-1;const mid={res:G.YM.res,shown:document.getElementById('result').style.display==='flex'};
    C.skip();const after={active:!!C.active,vis:G.YM.bb.root.visible,paused:G.M.paused};G.M.paused=true;
    // 另一艘船的過場還在排隊／播放 → 不能結算
    C.queue.push([G.YM.bb,G.YM.bb.sinkPlan]);G.run(4);const blocked=document.getElementById('result').style.display==='flex';C.queue.length=0;G.run(3.2);const shown=document.getElementById('result').style.display==='flex';
    return {t1,mid,after,blocked,shown,over:G.M.over,how:G.YM.st.how,replay:getComputedStyle(document.getElementById('rReplay')).display}});
  console.log(mode,'flow',JSON.stringify(fl));ok(fl.t1>10.5,`${mode}：自動播放推進 t=${fl.t1.toFixed(1)}`);ok(!fl.mid.shown&&!fl.blocked&&fl.shown,`${mode}：結算等大和過場結束且無其他過場後才出現`);ok(!fl.after.vis,`${mode}：跳過後船隱藏`);ok(fl.replay!=='none',`${mode}：結算頁有「重播沉沒」`);
  await p.screenshot({path:`${OUT}/${mode}_99_結算.png`});
  // 重播：播 2 秒後跳過，回到結算頁、不重複記成績
  const rp=await p.evaluate(async()=>{const G=__G,C=__SINK.SINKCIN,cl=G.ST.m.yamato.clears;document.getElementById('rReplay').click();const a=!!C.active,hid=document.getElementById('result').style.display==='none';C.playing=true;await new Promise(r=>setTimeout(r,1500));C.skip();await new Promise(r=>setTimeout(r,300));return {a,hid,back:document.getElementById('result').style.display==='flex',same:G.ST.m.yamato.clears===cl}});
  ok(rp.a&&rp.hid&&rp.back&&rp.same,`${mode}：重播沉沒 ${JSON.stringify(rp)}`);
  ok(!errs.length,`${mode}：無錯誤 ${errs.slice(0,3).join('|')}`);await b.close()}
if(on('perf')){const {b,p,errs}=await boot();await trigger(p,'ten');
  const pf=await p.evaluate(async()=>{const G=__G,C=__SINK.SINKCIN,R=G.renderer,out={};
    const meas=async(t,cam)=>{C.cam=C.cams.findIndex(x=>x.name===cam);C.seek(t);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const T=[];let calls=0,tri=0;for(let i=0;i<12;i++){const t0=performance.now();C.seek(t);R.render(G.scene,G.cam);T.push(performance.now()-t0);calls=Math.max(calls,R.info.render.calls);tri=Math.max(tri,R.info.render.triangles)}T.sort((a,b)=>a-b);return {calls,tri,ms:+T[6].toFixed(1)}};
    out.before=await meas(5,'低角水面');out.boom=await meas(51,'低角水面');out.halves=await meas(58,'艦橋特寫');out.photo=await meas(56,'美軍機視角');out.far=await meas(95,'蕈狀雲遠景');
    C.skip();G.M.paused=true;G.start('yamato');G.M.paused=true;G.run(1);const S=G.YM.bb,hd=S.hd;window.__CAMO={p:S.pos.clone().add(new G.THREE.Vector3(-Math.cos(hd)*650,4,Math.sin(hd)*650)),l:S.pos.clone().setY(14),fov:42};
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));G.run(.05);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const T=[];let calls=0,tri=0;for(let i=0;i<12;i++){const t0=performance.now();R.render(G.scene,G.cam);T.push(performance.now()-t0);calls=R.info.render.calls;tri=R.info.render.triangles}T.sort((a,b)=>a-b);out.game=  {calls,tri,ms:+T[6].toFixed(1)};window.__CAMO=null;return out});
  console.log('效能（swiftshader，只看相對值；ms＝單次 render 中位數）',JSON.stringify(pf));ok(!errs.length,'perf 無錯誤 '+errs.slice(0,2).join('|'));await b.close()}
console.log(fail?`失敗 ${fail} 項`:'全部通過');process.exit(fail?1:0)})();
