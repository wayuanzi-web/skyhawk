const {open}=require('./common');(async()=>{const {b,p,errs}=await open();
const R=await p.evaluate(()=>{const G=__G,P=G.P,M=G.M,V3=P.pos.constructor,o={};
 function land(c){G.start('land');M.paused=true;const LP=G.LP0,LD=G.LD,aimP=LP.clone().addScaledVector(LD,73),side=new V3(LD.z,0,-LD.x);
  P.pos.addScaledVector(side,c.lat||0);P.pos.y+=c.dh||0;if(c.noAT){P.at=false;P.thr=.14}let jx=0,jy=0;const q=[];let bolt=0,manT=0;
  for(let s=0;s<1500;s++){if(P.state==='dead')return{ok:false,why:M.why,td:M.td&&{s:M.td.s|0,d:+M.td.d.toFixed(1),sink:+M.td.sink.toFixed(1)}};if(P.state==='done')return{ok:true,wire:M.td.wire,d:+M.td.d.toFixed(1),sink:+M.td.sink.toFixed(1),grade:M.grade.slice(0,6),bolt};
   const rel=P.pos.clone().sub(aimP),along=-rel.dot(LD);const des=new V3();
   if(P.onDeck){if(P.state==='fly'){bolt=1;P.thr=1;P.at=false;des.set(LD.x,.15,LD.z)}else des.copy(P.aim)}
   else if(bolt){ // go-around pattern: climb, downwind, re-approach
     manT+=.1;if(manT<12){des.set(LD.x,.12,LD.z).normalize();P.thr=1;if(P.gear&&manT>3)G.act.gear()}
     else if(along<5200&&manT<200){const tp=aimP.clone().addScaledVector(LD,-6500).addScaledVector(side,along<4000?1800:0);des.set(tp.x-P.pos.x,350-P.pos.y,tp.z-P.pos.z).normalize();P.thr=Math.max(.05,Math.min(1,.4+(110-P.V)*.03))}
     else{bolt=2;manT=0;if(!P.gear)G.act.gear();P.hook=true;P.flaps=true;P.at=true}}
   if(!P.onDeck&&bolt!==1){const la=Math.max(0,along-450),tp=aimP.clone().addScaledVector(LD,-la);tp.y=22.3+Math.tan(.061)*la;des.copy(tp).sub(P.pos).normalize();if(c.noAT&&bolt===0)P.thr=Math.max(0,Math.min(1,P.thr+((0.141-P.alpha)*-.9)*.1*(c.thrSkill||1)))}
   jx+=(Math.random()*2-1)*c.jit*.5-jx*.15;jy+=(Math.random()*2-1)*c.jit*.5-jy*.15;const yaw=Math.atan2(des.x,-des.z)+jx,pit=Math.asin(Math.max(-1,Math.min(1,des.y)))+jy;des.set(Math.sin(yaw)*Math.cos(pit),Math.sin(pit),-Math.cos(yaw)*Math.cos(pit));
   q.push(des);if(q.length>Math.round(c.delay/.1))P.aim.copy(q.shift());if(c.hookUp&&bolt===0)P.hook=false;G.run(.1)}
  return{ok:false,why:'timeout',along:0,bolt,y:P.pos.y|0,V:P.V|0}}
 const pil={novice:{delay:.4,jit:.012},normal:{delay:.2,jit:.005}};
 for(const pn in pil)for(const [nm,c] of [['base',{}],['L100',{lat:-100}],['R100',{lat:100}],['hi30',{dh:30}],['lo30',{dh:-30}],['noAT',{noAT:true}],['hookUp→bolter',{hookUp:true}]]){const rs=[];for(let i=0;i<5;i++)rs.push(land({...pil[pn],...c}));o[pn+'_'+nm]=rs}
 // hands-off: do nothing at all
 G.start('land');M.paused=true;G.run(70);o.handsOff={st:P.state,why:M.why,td:M.td&&M.td.wire,grade:M.grade};
 return o});
for(const k in R){const rs=R[k];if(Array.isArray(rs)){console.log('== '+k+' ok '+rs.filter(r=>r.ok).length+'/'+rs.length);for(const r of rs)console.log('   '+JSON.stringify(r))}else console.log(k,JSON.stringify(rs))}
console.log(errs.join('\n')||'no errors');await b.close()})();
