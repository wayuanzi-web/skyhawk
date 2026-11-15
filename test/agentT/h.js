// agentT 共用工具：開遊戲、真觸控、頁內取樣記錄
process.env.NODE_PATH=process.env.NODE_PATH||'/opt/npm-tools/node_modules';
const {open}=require('../lib');
const PAGE=process.env.PAGE||'index.html';
exports.boot=async()=>{const {b,p,errs}=await open({viewport:{width:844,height:390},hasTouch:true,isMobile:true},PAGE);
  await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:60000});
  if(!process.env.RENDER)await p.evaluate(()=>{__G.renderer.render=()=>{}});   // 只測飛控時不畫 3D，讓觸控事件即時
  const cdp=await p.context().newCDPSession(p);
  const T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
  // 頁內取樣：每 100ms（真實時間）記錄一筆，帶模擬時間
  await p.evaluate(()=>{window.__LOG=[];const V=__G.P.pos.constructor;
    window.__samp=()=>{const P=__G.P,r=new V(1,0,0).applyQuaternion(P.q),u=new V(0,1,0).applyQuaternion(P.q),f=new V(0,0,-1).applyQuaternion(P.q);
      const vh=Math.atan2(P.vel.x,-P.vel.z),ah=Math.atan2(P.aim.x,-P.aim.z);let e=(ah-vh)*57.3;while(e>180)e-=360;while(e<-180)e+=360;
      // 指向圈在畫面上的位置
      const cam=__G.cam,pp=P.pos.clone().addScaledVector(P.aim,600).project(cam),nose=Math.round(Math.acos(Math.max(-1,Math.min(1,f.dot(P.aim))))*57.3);
      return{t:+(P.simT||0).toFixed(2),bank:Math.round(Math.atan2(-r.y,u.y)*57.3),hdg:Math.round(vh*57.3),pitch:Math.round(Math.asin(f.y)*57.3),
        gam:Math.round(Math.asin(Math.max(-1,Math.min(1,P.vel.y/Math.max(1,P.vel.length()))))*57.3),alt:P.pos.y|0,kt:P.V*1.944|0,g:+P.g.toFixed(1),
        aimE:Math.round(e),aimEl:Math.round(Math.asin(P.aim.y)*57.3),sx:Math.round((pp.x+1)/2*innerWidth),sy:Math.round((1-pp.y)/2*innerHeight),onS:pp.z<1&&Math.abs(pp.x)<1&&Math.abs(pp.y)<1,
        nose,hold:P.hold?Math.round(P.hold.bank*57.3):null,roll:+(-P.w.z*57.3).toFixed(0),beta:+(P.beta*57.3).toFixed(1),alpha:+(P.alpha*57.3).toFixed(1)}};
    window.__step=sec=>{const DT=__G.DT,n=Math.round(sec/DT);for(let i=0;i<n;i++){__G.simStep(DT);if(i%2===0)__G.updWorld(DT*2);window.__k=(window.__k||0)+1;if(__k%12===0)__LOG.push(__samp())}}});
  const reset=(o={})=>p.evaluate(o=>{const G=__G,P=G.P;G.start(o.mode||'free');if(!o.keep){P.pos.set(0,o.alt||1500,-1500);P.vel.set(0,0,-(o.v||230));P.q.set(0,0,0,1);P.w.set(0,0,0);P.aim.set(0,0,-1);P.thr=P.thrAct=o.thr||.8;P.hold=null}
    G.inp.stickOn=false;G.M.paused=true;window.__LOG=[];window.__k=0},o);
  const wait=ms=>p.waitForTimeout(ms);
  const run=sec=>p.evaluate(s=>__step(s),sec);   // 模擬時間快轉（遊戲主迴圈暫停，時間由測試控制）
  // 拖曳：從 (x,y) 拖 (dx,dy)，n 步，每步 stepMs，end=true 放手
  const drag=async(x,y,dx,dy,n=10,stepMs=16,end=true,id=1)=>{await T('touchStart',[{x,y,id}]);for(let i=1;i<=n;i++){await T('touchMove',[{x:x+dx*i/n,y:y+dy*i/n,id}]);await run(stepMs/1000)}if(end)await T('touchEnd',[]);return{x:x+dx,y:y+dy}};
  const tap=async(x,y)=>{await T('touchStart',[{x,y,id:5}]);await wait(30);await T('touchEnd',[])};
  const log=()=>p.evaluate(()=>window.__LOG.splice(0));
  return{b,p,errs,T,reset,wait,run,drag,tap,log}};
// 簡潔列印
exports.fmt=(rows,every=3,keys=['t','bank','hdg','gam','alt','g','aimE','sx','sy'])=>rows.filter((_,i)=>i%every===0).map(r=>keys.map(k=>k+'='+(typeof r[k]==='boolean'?(r[k]?'Y':'N'):r[k])).join(' ')).join('\n');
exports.sum=rows=>{if(!rows.length)return'無資料';const mx=k=>Math.max(...rows.map(r=>Math.abs(r[k])));const a=rows[0],z=rows[rows.length-1];
  return `模擬 ${a.t}→${z.t}s｜最大坡度 ${mx('bank')}°｜最大G ${Math.max(...rows.map(r=>r.g))}｜航向 ${a.hdg}→${z.hdg}｜高度 ${a.alt}→${z.alt}（最低 ${Math.min(...rows.map(r=>r.alt))}）｜指向圈離開畫面 ${rows.filter(r=>!r.onS).length}/${rows.length}`};
