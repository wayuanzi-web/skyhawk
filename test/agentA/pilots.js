const {open}=require('./common');(async()=>{const {b,p,errs}=await open();
const N=+(process.argv[2]||5);
const R=await p.evaluate((N)=>{const G=__G,P=G.P,M=G.M,V3=P.pos.constructor,LIMS=[150,90,30];
 const PIL={novice:{delay:.4,jit:.05,altF:.85,altJ:.25,look:550,spd:230,jink:0,bombTol:50,gsJ:.012},
            normal:{delay:.2,jit:.02,altF:.6,altJ:.1,look:800,spd:220,jink:0,bombTol:35,gsJ:.005},
            expert:{delay:.1,jit:.008,altF:.45,altJ:.05,look:900,spd:245,jink:70,bombTol:20,gsJ:.002}};
 function fly(pn,diff,noAAA){fly.pd=undefined;const c=PIL[pn],LIM=LIMS[diff];M.diff=diff;G.start('mission');M.paused=true;if(noAAA)for(const a of G.AAA)a.hp=0;
  const q=[],imp=new V3(),des=new V3(0,.17,-1).normalize();let jx=0,jy=0,t=0,maxLock=0,expo0=0,hpMin=100,dropped=false,dropT=0,cfg=false,tLand0=null,altBias=0,rel=null,boltered=0;
  const want=(x,y,z)=>des.set(x-P.pos.x,y-P.pos.y,z-P.pos.z).normalize();
  P.thr=1;G.run(2.2);G.act.launch();
  for(let s=0;s<9000;s++){t=s*.1;const u=-P.pos.z;
   if(P.state==='dead')return{ok:false,why:M.why,ph:M.phase,u:u|0,t:M.t|0,maxLock:+maxLock.toFixed(2),hpMin,rel};
   if(P.state==='done')return{ok:true,kills:G.CB.kills,t:M.t|0,maxLock:+maxLock.toFixed(2),hpMin,expo:+M.expo.toFixed(1),grade:M.grade.slice(0,8),wire:M.td.wire,rel,tLand:(M.t-tLand0)|0,boltered};
   if(s%30===0)altBias=(Math.random()*2-1)*c.altJ;
   if(M.phase<=1&&u<6400){if(!P.onDeck&&P.pos.y>60&&P.gear){G.act.gear();G.act.flap()}want(0,Math.max(60,80),-(u+1500));P.thr=P.onDeck||P.V<c.spd-25?1:Math.max(.15,Math.min(1,.55+(c.spd-P.V)*.03))}
   else if(M.phase<=2){if(!P.onDeck&&P.pos.y>60&&P.gear){G.act.gear();G.act.flap()}const la=u+c.look,jk=c.jink*Math.sin(t*1.3);want(G.xc(la)+jk,G.floorOf(la)+LIM*(c.altF+altBias),-la);P.thr=Math.max(.15,Math.min(1,.55+(c.spd-P.V)*.03));maxLock=Math.max(maxLock,M.lock)}
   else if(M.phase===3){const T=G.tgtPos;if(u<21300)want(T.x,1050,-21500);else if(!dropped){if(G.ccip(imp)){const d=Math.hypot(imp.x-T.x,imp.z-T.z);want(2*T.x-imp.x,T.y+Math.min(400,d*.5),2*T.z-imp.z);const closing=(fly.pd===undefined||d<fly.pd);const pick=d<c.bombTol||(!closing&&fly.pd<c.bombTol*1.8);fly.pd=d;/* 像真人：瞄準點掃過目標、開始遠離時按投彈 */if(pick&&P.bombs>0){G.dropBomb();rel={alt:P.pos.y|0,d:d|0,agl:(P.pos.y-G.groundH(P.pos.x,P.pos.z))|0}}}else want(T.x,T.y,T.z);if(P.pos.y-G.groundH(P.pos.x,P.pos.z)<420&&u>23000){dropped=true}}
     if(dropped||P.bombs<4&&false){}
     if(rel&&!dropped){dropped=true}
     if(dropped){want(P.pos.x,P.pos.y+1200,P.pos.z-900);P.thr=1;dropT+=.1}
     else P.thr=.5}
   else if(M.phase===4&&(M.stage==='sam'||M.stage==='bandit'||M.stage==='transit')){const CB=G.CB,L=G.LOCK;
     const inc=CB.msl.filter(m=>m.alive&&m.orig.isP&&m.tgt===m.orig&&!m.lost);
     if(inc.length){const m=inc.sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos))[0],dd=m.pos.distanceTo(P.pos);const los=m.pos.clone().sub(P.pos).normalize(),side=new V3(-los.z,0,los.x);if(side.dot(P.vel)<0)side.negate();
       const ag=P.pos.y-Math.max(0,G.groundH(P.pos.x,P.pos.z));want(P.pos.x+side.x*1000,P.pos.y+(ag>700?-200:120),P.pos.z+side.z*1000);P.thr=1;if(dd<2600&&(P._fc=(P._fc||0)-.1)<=0){G.countermeasure();P._fc=.6}}
     else if(M.stage==='bandit'){const e=CB.ene.filter(e=>e.alive).sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos))[0];
       if(e){const dd=e.pos.distanceTo(P.pos);const tp=e.pos.clone().addScaledVector(e.vel,Math.min(1.5,dd/1000));want(tp.x,tp.y,tp.z);P.thr=.95;if(L.ok&&L.e===e)G.fireMsl();G.inp.fire=dd<900&&L.e===e&&e._ang<.06}}
     else{want(G.xc(5200),2200,-5200);P.thr=.95}
     const ag=P.pos.y-Math.max(0,G.groundH(P.pos.x,P.pos.z));if(ag<300){des.y=Math.max(des.y,.3);des.normalize()}}
   else if(M.phase===4){if(tLand0===null)tLand0=M.t;const LP=G.LP0,LD=G.LD,aimP=LP.clone().addScaledVector(LD,73);const relp=P.pos.clone().sub(aimP),along=-relp.dot(LD),lat=relp.x*LD.z-relp.z*LD.x;
     const onFinal=P.pos.z>3000||cfg;
     if(P.onDeck){P.thr=P.state==='trap'?0:1;if(P.state==='fly'){boltered++;want(P.pos.x+LD.x*800,90,P.pos.z+LD.z*800)}}
     else if(!cfg){ // egress + downwind east side
       if(P.pos.z<-6500){want(P.pos.z<-21000?P.pos.x:4500,2700,P.pos.z+(P.pos.z<-21000&&P.pos.y<2000?-1500:4000));P.thr=P.pos.y<2300?1:.5}
       else if(P.pos.z<6500){want(4500,500,7500);P.thr=Math.max(.05,Math.min(1,.4+(150-P.V)*.03))}
       else{const tp=aimP.clone().addScaledVector(LD,-6500);want(tp.x,420,tp.z);P.thr=Math.max(.05,Math.min(1,.4+(120-P.V)*.03));if(Math.hypot(P.pos.x-tp.x,P.pos.z-tp.z)<900||(along>5000&&Math.abs(lat)<300)){cfg=true;if(!P.gear)G.act.gear();if(!P.flaps)G.act.flap();if(!P.hook)G.act.hook();P.at=true}}}
     else{ if(along<-150&&!P.onDeck){// missed / bolter go-around
         cfg=false;P.at=false;if(P.gear)G.act.gear();want(P.pos.x-3000,500,P.pos.z+2000);}
       else{const la=Math.max(0,along-450),tp=aimP.clone().addScaledVector(LD,-la);const gsH=20+2.3+Math.tan(.061)*la;const capt=P.pos.y<20+2.3+Math.tan(.061)*along+15;tp.y=along>4500&&!capt?P.pos.y:gsH;want(tp.x,tp.y,tp.z)}}}
   // human filter: jitter (random walk) + delay
   jx+=(Math.random()*2-1)*c.jit*.5-jx*.15;jy+=(Math.random()*2-1)*c.jit*.5-jy*.15;const gj=M.phase===4&&cfg?c.gsJ/c.jit:1;
   const d2=des.clone();const yaw=Math.atan2(d2.x,-d2.z)+jx*gj,pit=Math.asin(Math.max(-1,Math.min(1,d2.y)))+jy*gj;d2.set(Math.sin(yaw)*Math.cos(pit),Math.sin(pit),-Math.cos(yaw)*Math.cos(pit));
   q.push(d2);const k=Math.round(c.delay/.1);if(q.length>k){P.aim.copy(q.shift())}
   if(M.stage==='rtb')G.inp.fire=false;hpMin=Math.min(hpMin,P.hp|0);G.run(.1)}
  return{ok:false,why:'timeout',ph:M.phase,u:(-P.pos.z)|0,x:P.pos.x|0,y:P.pos.y|0,t:M.t|0,maxLock,hpMin,rel,cfg}}
 const out={};for(const pn of ['novice','normal','expert'])for(const d of [0,1,2]){const rs=[];for(let i=0;i<N;i++)rs.push(fly(pn,d,false));out[pn+'_d'+d]=rs}
 out['novice_d0_noAAA']=[fly('novice',0,true),fly('novice',0,true),fly('novice',0,true)];out['expert_d2_noAAA']=[fly('expert',2,true),fly('expert',2,true),fly('expert',2,true)];
 return out},N);
for(const k in R){const rs=R[k],ok=rs.filter(r=>r.ok);console.log('== '+k+'  pass '+ok.length+'/'+rs.length);for(const r of rs)console.log('   '+JSON.stringify(r))}
console.log(errs.join('\n')||'no errors');await b.close()})();
