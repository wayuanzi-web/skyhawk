// 戰鬥平衡：防空飛彈（不動／會閃）、敵機（不動／會打），三種難度各跑 N 次
const {open}=require('./lib');const N=+(process.argv[2]||4);
(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const R=await p.evaluate((N)=>{const G=__G,P=G.P,M=G.M,CB=G.CB,L=G.LOCK,V=P.pos.constructor;const out={};
 const aimTo=(v)=>P.aim.copy(v).normalize();
 function evade(){const inc=CB.msl.filter(m=>m.alive&&m.orig.isP&&m.tgt===m.orig&&!m.lost);if(!inc.length)return false;
   const m=inc.sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos))[0],d=m.pos.distanceTo(P.pos);
   const los=m.pos.clone().sub(P.pos).normalize(),side=new V(-los.z,0,los.x);if(side.dot(P.vel)<0)side.negate();
   const agl=P.pos.y-Math.max(0,G.groundH(P.pos.x,P.pos.z));aimTo(side.clone().add(new V(0,agl>250?-.25:.15,0)));P.thr=1;
   if(d<2600&&(P._fc=(P._fc||0)-.1)<=0){G.countermeasure();P._fc=.6}return true}
 function sam(diff,smart){M.diff=diff;G.start('mission');G.spawn(3);M.paused=true;let t=0;const l0=CB.dodged;
   while(t<60&&P.state==='fly'&&M.stage==='sam'){if(!(smart&&evade())){aimTo(new V(0,(1900-P.pos.y)/2000,1));P.thr=.9}G.run(.1);t+=.1}
   return{alive:P.state==='fly',hp:P.hp|0,launched:M.samL,dodged:CB.dodged-l0,stage:M.stage,t:+t.toFixed(1)}}
 function ban(diff,smart){M.diff=diff;G.start('mission');G.spawn(5);M.paused=true;let t=0,fired=0;
   while(t<150&&P.state==='fly'&&M.stage==='bandit'){
     if(!(smart&&evade())){if(smart){const e=CB.ene.filter(e=>e.alive).sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos))[0];
         if(e){const d=e.pos.distanceTo(P.pos);aimTo(e.pos.clone().addScaledVector(e.vel,Math.min(1.5,d/1000)).sub(P.pos));P.thr=.95;
           if(L.ok&&L.e===e){G.fireMsl();fired++}G.inp.fire=d<900&&L.e===e&&e._ang<.06}}
       else{aimTo(new V(0,(1900-P.pos.y)/2000,1));P.thr=.9}}
     const agl=P.pos.y-Math.max(0,G.groundH(P.pos.x,P.pos.z));if(agl<300)P.aim.y=Math.max(P.aim.y,.3),P.aim.normalize();
     G.run(.1);t+=.1}G.inp.fire=false;
   return{alive:P.state==='fly',why:P.state==='dead'?M.why:'',hp:P.hp|0,kills:CB.kills,fired,left:P.m9+P.m120,stage:M.stage,t:+t.toFixed(1)}}
 for(const d of [0,1,2]){out['sam_d'+d+'_passive']=[];out['sam_d'+d+'_smart']=[];out['ban_d'+d+'_passive']=[];out['ban_d'+d+'_smart']=[];
   for(let i=0;i<N;i++){out['sam_d'+d+'_passive'].push(sam(d,false));out['sam_d'+d+'_smart'].push(sam(d,true));out['ban_d'+d+'_passive'].push(ban(d,false));out['ban_d'+d+'_smart'].push(ban(d,true))}}
 return out},N);
for(const k in R){const rs=R[k];console.log(k.padEnd(18),'存活 '+rs.filter(r=>r.alive).length+'/'+rs.length,' ',rs.map(r=>JSON.stringify(r)).join(' ').slice(0,330))}
console.log(errs.join('\n')||'no errors');await b.close()})();
