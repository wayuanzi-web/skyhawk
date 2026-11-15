// agentF 量測工具：載入頁面（PAGE 環境變數，預設 base.html＝原版），暫停遊戲迴圈，由腳本推進模擬並記錄時間序列
const {open}=require('../lib');
exports.boot=async(page)=>{page=page||process.env.PAGE||'test/agentF/base.html';
 const {b,p,errs}=await open({viewport:{width:844,height:390},hasTouch:true,isMobile:true},page);
 await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:60000});
 await p.evaluate(()=>{Object.defineProperty(screen,'orientation',{value:{angle:90},configurable:true});
  const G=__G,P=G.P,V=P.pos.constructor,D=57.2958;
  window.__s=()=>{const r=new V(1,0,0).applyQuaternion(P.q),u=new V(0,1,0).applyQuaternion(P.q),f=new V(0,0,-1).applyQuaternion(P.q);const c=G.cam;
   const cr=new V(1,0,0).applyQuaternion(c.quaternion),cu=new V(0,1,0).applyQuaternion(c.quaternion);
   const vv=P.vel.length();let crr=0;{const q=c.quaternion;if(window.__pq){const dq=window.__pq.clone().invert().multiply(q);if(dq.w<0){dq.x=-dq.x;dq.y=-dq.y;dq.z=-dq.z;dq.w=-dq.w}crr=2*Math.atan2(dq.z,dq.w)*D/window.__pdt}window.__pq=q.clone()}
   return{bank:Math.atan2(-r.y,u.y)*D,rr:-P.w.z*D,pitch:Math.asin(Math.max(-1,Math.min(1,f.y)))*D,gam:Math.asin(Math.max(-1,Math.min(1,P.vel.y/Math.max(1,vv))))*D,g:P.g,hdg:Math.atan2(P.vel.x,-P.vel.z)*D,alt:P.pos.y,kt:vv*1.944,
    cam:Math.atan2(-cr.y,cu.y)*D,crr,scr:Math.atan2(-r.dot(cu),r.dot(cr))*D,gc:P.gcas?1:0,dead:P.state==='dead',why:G.M.why||''}};
  // 體感：橫拿手機、往右傾 rollDeg
  window.__dev=(rollDeg,tiltDeg)=>{const r=rollDeg/D,t=(30+tiltDeg)/D,g=9.81;const sx=-Math.sin(r)*Math.cos(t)*g,sy=Math.cos(r)*Math.cos(t)*g,sz=Math.sin(t)*g;const a=Math.PI/2,c=Math.cos(a),s=Math.sin(a);
   const ev=new Event('devicemotion');ev.accelerationIncludingGravity={x:sx*c-sy*s,y:sx*s+sy*c,z:sz};window.dispatchEvent(ev)};
  // 情境：setup 設定、seq=[[秒, ex, ey, on, 額外]...]；on: true=按住簡易搖桿, false=放開, 'gy'=體感傾斜 ex 度、ey 度, 'stick'=左手搖桿 sx=ex sy=ey, 'aim'=指向圈 aim 向量(額外), 'none'
  window.__seq=(setup,seq,dtS)=>{dtS=dtS||.05;const st=setup||{};G.start(st.mode||'free');G.M.paused=true;
   if(st.cp!==undefined)G.spawn(st.cp);
   if(st.alt!==undefined){P.pos.set(st.x||0,st.alt,st.z||-1500);const v=(st.kt||450)/1.944;P.vel.set(0,0,-v);P.q.set(0,0,0,1);P.aim.set(0,0,-1);P.w.set(0,0,0);P.thr=P.thrAct=st.thr!==undefined?st.thr:.9;P.at=st.at!==undefined?st.at:true}
   if(st.bank!==undefined){P.q.setFromAxisAngle(new V(0,0,1),-st.bank/D)}
   if(st.dive){const q2=new P.q.constructor().setFromAxisAngle(new V(1,0,0),-st.dive/D);P.q.premultiply(q2);const v=P.vel.length();P.vel.set(0,0,-v).applyQuaternion(q2);P.aim.copy(P.vel).normalize()}
   if(st.pre)new Function('G',st.pre)(G);
   for(let i=0;i<4;i++)window.__UC(.25);window.__pq=null;window.__pdt=dtS;window.__s();
   const o=[];let t=0;for(const s of seq){let [dur,ex,ey,on,x]=s;if(typeof x==='string')x=new Function('G','ph',x);
    if(on===true){G.inp.ezOn=true;G.inp.ex=ex;G.inp.ey=ey;P.ezRel=false;P.hold=null}else if(on===false){if(G.inp.ezOn){G.inp.ezOn=false;P.ezRel=true}G.inp.ex=G.inp.ey=0}
    else if(on==='stick'){G.inp.stickOn=true;G.inp.sx=ex;G.inp.sy=ey}else if(on==='stickoff'){if(G.inp.stickOn){G.inp.stickOn=false;const s0=window.__s();const b0=s0.bank/D;P.hold={bank:Math.abs(b0)<.09?0:Math.max(-.52,Math.min(.52,b0))}}}
    else if(on==='aim'){P.aim.set(x[0],x[1],x[2]).normalize()}
    if(typeof x==='function')x(G,'start');
    const n=Math.round(dur/dtS);for(let i=0;i<n;i++){if(on==='gy'){for(let k=0;k<3;k++)window.__dev(ex,ey)}if(typeof x==='function')x(G,'tick');G.run(dtS);window.__UC(dtS);t+=dtS;const r=window.__s();r.t=+t.toFixed(2);r.seg=seq.indexOf(s);o.push(r);if(r.dead)return o}}
   return o}});
 return{b,p,errs}};
// 指標
exports.metrics=(L,o={})=>{const mx=(f)=>L.reduce((m,r)=>Math.max(m,f(r)),-1e9);const hold=o.holdSeg===undefined?0:o.holdSeg;
 const H=L.filter(r=>r.seg===hold),R=L.filter(r=>r.seg>hold);
 const sgn=Math.sign(H.length?H[H.length-1].bank:0)||1;
 const fin=H.length?H.slice(-10).reduce((s,r)=>s+r.bank,0)/Math.min(10,H.length):0;
 const peak=H.length?Math.max(...H.map(r=>r.bank*sgn)):0;
 // 先滾再拉：坡度未達最終 50% 前的最大 G
 let gEarly=0;for(const r of H){if(Math.abs(r.bank)<Math.abs(fin)*.5)gEarly=Math.max(gEarly,r.g);else break}
 let rev=0,tLvl=null;if(R.length){for(const r of R)rev=Math.max(rev,-r.bank*sgn);const t0=R[0].t-.05;for(let i=0;i<R.length;i++){if(Math.abs(R[i].bank)<5&&R.slice(i).every(x=>Math.abs(x.bank)<5)){tLvl=+(R[i].t-t0).toFixed(2);break}}}
 const dcam=[];for(let i=1;i<L.length;i++)dcam.push(Math.abs(L[i].cam-L[i-1].cam)/(L[i].t-L[i-1].t));
 return{maxBank:+mx(r=>Math.abs(r.bank)).toFixed(0),finBank:+fin.toFixed(0),overshoot:+(peak-Math.abs(fin)).toFixed(0),maxRR:+mx(r=>Math.abs(r.rr)).toFixed(0),gEarly:+gEarly.toFixed(1),maxG:+mx(r=>r.g).toFixed(1),minG:+(-mx(r=>-r.g)).toFixed(1),
  rev:+Math.max(0,rev).toFixed(0),tLvl,maxCam:+mx(r=>Math.abs(r.cam)).toFixed(0),maxCamRate:+Math.max(0,...dcam).toFixed(0),maxCRR:+mx(r=>Math.abs(r.crr)).toFixed(0),maxScr:+mx(r=>Math.abs(r.scr)).toFixed(0),
  inv:L.some(r=>Math.abs(r.bank)>90),dHdg:+(()=>{let d=L[L.length-1].hdg-L[0].hdg;while(d>180)d-=360;while(d<-180)d+=360;return d})().toFixed(0),dAlt:+(L[L.length-1].alt-L[0].alt).toFixed(0),dead:L[L.length-1].dead?L[L.length-1].why:''}};
exports.fmt=(L,every=4)=>L.filter((_,i)=>i%every===every-1).map(r=>`${r.t.toFixed(1)}s 坡${r.bank.toFixed(0)} 滾${r.rr.toFixed(0)} 仰${r.pitch.toFixed(0)} 航跡${r.gam.toFixed(0)} G${r.g.toFixed(1)} 向${r.hdg.toFixed(0)} 高${r.alt.toFixed(0)} 鏡${r.cam.toFixed(0)} 鏡滾率${r.crr.toFixed(0)} 幕${r.scr.toFixed(0)}${r.gc?" GCAS":""}`).join('\n   ');
