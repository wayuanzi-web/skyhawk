// 真實時間跑（不暫停、不固定鏡頭），簡易搖桿一般轉彎截圖
const {open}=require('../lib');const pg=process.env.PAGE||'test/agentF/exp.html',tag=pg.includes('exp')?'exp':'base';
(async()=>{const {b,p,errs}=await open({viewport:{width:844,height:390},hasTouch:true,isMobile:true},pg);await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:60000});
const st=()=>p.evaluate(()=>{const P=__G.P,V=P.pos.constructor;const r=new V(1,0,0).applyQuaternion(P.q),u=new V(0,1,0).applyQuaternion(P.q);return `坡${(Math.atan2(-r.y,u.y)*57.3).toFixed(0)} 向${(Math.atan2(P.vel.x,-P.vel.z)*57.3).toFixed(0)} 高${P.pos.y|0}`});
const go=async(label,ex,ey,shotsAt)=>{await p.evaluate(()=>{const G=__G,P=G.P;document.querySelector('[data-c="0"]').click();G.start('free');P.pos.set(0,1200,-1500);P.vel.set(0,0,-230);P.q.set(0,0,0,1);P.aim.set(0,0,-1);P.thr=P.thrAct=.9;P.at=true});
  await p.waitForTimeout(1500);await p.evaluate(([ex,ey])=>{const G=__G;G.inp.ezOn=true;G.inp.ex=ex;G.inp.ey=ey;G.P.ezRel=false;G.P.hold=null},[ex,ey]);
  const t0=Date.now();for(const t of shotsAt){while(Date.now()-t0<t*1000)await p.waitForTimeout(50);const s=await st();const f=`test/agentF/shot_${tag}_${label}_${t}s.png`;await p.screenshot({path:f});console.log(f,s,'simT',await p.evaluate(()=>__G.P.simT.toFixed(1)))}
  await p.evaluate(()=>{__G.inp.ezOn=false;__G.P.ezRel=true})};
await go('右推0.5',.5,0,[1,3,6]);await go('右推滿',1,0,[1,3,6]);
console.log(errs.join('|')||'no errors');await b.close()})();
