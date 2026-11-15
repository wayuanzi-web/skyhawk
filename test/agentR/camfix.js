// 試修：追蹤鏡頭改版（只放在 exp.html）
const OLD=`function updCam(dt){fwd.set(0,0,-1).applyQuaternion(P.q);up.set(0,1,0).applyQuaternion(P.q);
  const tgt=inp.stickOn||P.state==='cat'&&false?fwd:P.aim;camDir.lerp(inp.stickOn?fwd:tgt,1-Math.exp(-7*dt)).normalize();
  if(view===0){cam.up.set(0,1,0);cam.position.copy(P.pos).addScaledVector(camDir,-27);cam.position.y+=8;
    const gh=Math.max(0,groundH(cam.position.x,cam.position.z))+2;if(cam.position.y<gh)cam.position.y=gh;
    t1.copy(P.pos).addScaledVector(camDir,160);t1.y+=14;cam.lookAt(t1);plane.visible=P.state!=='dead'}`;
const NEW=`const CS={off:V3(),init:false,roll:0,lag:V3(),gk:0,shk:0,n1:0,n2:0,n3:0,imp:0,base:V3(0,0,-1),vh:V3(),w:V3(),q:new THREE.Quaternion(),ax:V3()};window.__CS=CS;
function updCam(dt){fwd.set(0,0,-1).applyQuaternion(P.q);up.set(0,1,0).applyQuaternion(P.q);right.set(1,0,0).applyQuaternion(P.q);
  const V=P.vel.length(),vhc=CS.vh.copy(V>30?P.vel:fwd).normalize();
  // 1) 看的方向：航跡與機頭之間（看得到攻角），再往指向圈偏，最多偏 25 度；轉向速度有上限
  const base=CS.base.copy(vhc).lerp(fwd,P.onDeck||P.state==='cat'?1:.3).normalize();
  let want=CS.w.copy(inp.stickOn?fwd:P.aim);if(P.onDeck||P.state==='cat')want.copy(fwd);
  {const c=clamp(base.dot(want),-1,1),a=Math.acos(c),MX=.44;if(a>MX){const k=MX/a;want.copy(base).lerp(CS.w,k).normalize()}}
  {const c=clamp(camDir.dot(want),-1,1),a=Math.acos(c),step=Math.min(a*(1-Math.exp(-3.2*dt)),1.6*dt);if(a>1e-5){CS.ax.crossVectors(camDir,want).normalize();if(CS.ax.lengthSq()>.5)camDir.applyAxisAngle(CS.ax,step)}}
  if(view===0){
    const D=26+3*clamp((V-150)/250,0,1),H=5.2;
    // 2) 理想位置（相對飛機）＋彈簧落後：轉向時看到飛機轉出去
    t3.copy(camDir).multiplyScalar(-D);t3.y+=H;
    if(!CS.init){CS.off.copy(t3);CS.init=true}
    CS.off.lerp(t3,1-Math.exp(-5*dt));
    // 3) 加速度與 G 的「重量感」：後燃／彈射時飛機往前拉開、減速時靠近；拉 G 時飛機在畫面上浮
    const along=P.onDeck&&P.catT>0?31:P.onDeck&&P.state==='trap'?-27:P.acc.dot(vhc),gn=(P.onDeck?0:P.g-1);
    CS.lag.lerp(t1.set(0,0,0).addScaledVector(vhc,-clamp(along,-15,35)*.2).addScaledVector(up,-clamp(gn,-3,8)*.2),1-Math.exp(-3*dt));
    cam.position.copy(P.pos).add(CS.off).add(CS.lag);
    const gh=Math.max(0,groundH(cam.position.x,cam.position.z))+2;if(cam.position.y<gh)cam.position.y=gh;
    cam.up.set(0,1,0);t1.copy(P.pos).addScaledVector(camDir,160);t1.y+=H;cam.lookAt(t1);
    // 4) 部分跟著壓坡度（地平線會斜，但不會整個翻過去）
    const bank=Math.atan2(-right.y,up.y),inv=Math.abs(bank)>Math.PI/2;const rT=P.onDeck?0:clamp(bank,-2,2)*(inv?.3:.45);
    CS.roll+=(rT-CS.roll)*(1-Math.exp(-4*dt));
    // 5) 震動：高動壓、大攻角抖振、後燃、觸艦／彈射衝擊
    const qd=.5*1.225*Math.exp(-P.pos.y/8500)*V*V;
    const amp=(P.onDeck&&P.catT<=0&&P.state!=='trap'?0:.0006+.0035*sstep(25000,70000,qd)+.006*sstep(.30,.45,P.alpha)*sstep(60,120,V)+.0015*clamp((P.thrAct-.85)/.15,0,1)+(P.catT>0?.004:0))+CS.imp;
    CS.imp*=Math.exp(-6*dt);const r=()=>Math.random()*2-1;CS.n1+=(r()-CS.n1)*Math.min(1,dt*25);CS.n2+=(r()-CS.n2)*Math.min(1,dt*25);CS.n3+=(r()-CS.n3)*Math.min(1,dt*18);
    cam.rotateZ(-CS.roll+CS.n3*amp*.6);cam.rotateX(CS.n1*amp);cam.rotateY(CS.n2*amp);
    plane.visible=P.state!=='dead'}`;
const OLDF=`const ft=(P.gear&&!P.onDeck&&P.state==='fly')?(view===1?38:50):62+clamp((P.V-150)/250,0,1)*8;`;
const NEWF=`const ft=(P.gear&&!P.onDeck&&P.state==='fly'&&view===1)?38:(P.gear&&!P.onDeck&&P.state==='fly')?56:58+clamp((P.V-150)/250,0,1)*8+3*clamp((P.thrAct-.85)/.15,0,1);`;
// 觸艦時加一下衝擊
const OLDT=`function touchdown(sink){`,NEWT=`function touchdown(sink){if(window.__CS)__CS.imp=.012+sink*.002;`;
// 指向圈跑出畫面時貼在邊緣
const OLDA=`if(!inp.stickOn){proj(P.aim,s1);if(s1.ok){`,NEWA=`if(!inp.stickOn){proj(P.aim,s1);if(!s1.ok){s1.x=W-s1.x;s1.y=H-s1.y;s1.ok=true}s1.x=clamp(s1.x,40,W-40);s1.y=clamp(s1.y,30,H-30);if(s1.ok){`;
module.exports=[[OLD,NEW],[OLDF,NEWF],[OLDT,NEWT],[OLDA,NEWA]];
