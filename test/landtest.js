// 著艦專測：從進場開始，用腳本飛行員（含手抖）飛 N 次，記錄觸艦姿態
const {open}=require('./lib');(async()=>{const {b,p,errs}=await open({},process.env.PAGE||'index.html');await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const N=+(process.argv[2]||8),jit=+(process.argv[3]||.02),gsJ=+(process.argv[4]||.005);
const r=await p.evaluate(([N,jit,gsJ])=>{const G=__G,P=G.P,M=G.M,V3=P.pos.constructor,out=[];
 for(let k=0;k<N;k++){G.start('land');M.paused=true;let jx=0,jy=0,res=null,minB=0,bankAt=[];const q=[],des=new V3();
  for(let s=0;s<1500&&!res;s++){const LP=G.LP0,LD=G.LD,aimP=LP.clone().addScaledVector(LD,73),relp=P.pos.clone().sub(aimP),along=-relp.dot(LD);
    const la=Math.max(0,along-450),tp=aimP.clone().addScaledVector(LD,-la);tp.y=20+2.3+Math.tan(.061)*la;des.copy(tp).sub(P.pos).normalize();
    jx+=(Math.random()*2-1)*jit*.5-jx*.15;jy+=(Math.random()*2-1)*jit*.5-jy*.15;const gj=gsJ/jit;const yaw=Math.atan2(des.x,-des.z)+jx*gj,pit=Math.asin(Math.max(-1,Math.min(1,des.y)))+jy*gj;
    q.push(new V3(Math.sin(yaw)*Math.cos(pit),Math.sin(pit),-Math.cos(yaw)*Math.cos(pit)));if(q.length>2)P.aim.copy(q.shift());
    G.run(.1);const r=new V3(1,0,0).applyQuaternion(P.q),u=new V3(0,1,0).applyQuaternion(P.q),f=new V3(0,0,-1).applyQuaternion(P.q),bk=Math.atan2(-r.y,u.y)*57.3;
    if(along<600)bankAt.push(bk.toFixed(0));
    if(P.state==='dead')res={dead:M.why,bank:bk.toFixed(1),pitch:(Math.asin(f.y)*57.3).toFixed(1),along:along|0};else if(P.onDeck||P.state==='trap'||P.state==='done')res={ok:P.state,wire:M.td.wire,bank:bk.toFixed(1),pitch:(Math.asin(f.y)*57.3).toFixed(1)}}
  res=res||{timeout:1};res.lastBanks=bankAt.slice(-12).join(',');out.push(res)}return out},[N,jit,gsJ]);
for(const x of r)console.log(JSON.stringify(x));console.log(errs.join('|')||'no errors');await b.close()})();
