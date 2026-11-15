// 飛行性能黃金數值：對照 F/A-18E 公開數字的合理範圍，超出就失敗（exit code 1）
const {open}=require('./lib');
const BANDS={
 vmaxSL:[0.95,1.15,'海平面（300 m）後燃最大速度，馬赫'],
 vmax12k:[1.6,2.0,'12,000 m 後燃最大速度，馬赫（公開：1.8 以上）'],
 climbSL:[190,270,'海平面最大爬升率 m/s（公開約 228）'],
 susTurn:[13,21,'3,000 m 持續轉彎率 度/秒（四代機約 15–20）'],
 gmax:[7.1,7.9,'最大過載 G（限制 7.5）'],
 approach:[128,145,'進場速度 節（公開約 135–145）']};
(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G,{timeout:30000});
const R=await p.evaluate(()=>{const G=__G,P=G.P,out={};
 const lvl=(alt,v,thr)=>{G.start('free');G.M.paused=true;P.pos.set(0,alt,-1500);P.vel.set(0,0,-v);P.q.set(0,0,0,1);P.aim.set(0,0,-1);P.thr=P.thrAct=thr;P.bombs=0};
 const hold=alt=>{P.aim.set(0,Math.max(-.2,Math.min(.2,(alt-P.pos.y)/600)),-1).normalize()};
 lvl(300,250,1);for(let i=0;i<2400;i++){hold(300);G.run(.1)}out.vmaxSL=P.mach;
 lvl(12000,350,1);for(let i=0;i<4000;i++){hold(12000);G.run(.1)}out.vmax12k=P.mach;
 lvl(300,230,1);for(let i=0;i<20;i++){hold(300);G.run(.1)}const v0=P.V;for(let i=0;i<10;i++){hold(300);G.run(.1)}out.climbSL=P.V*(P.V-v0)/1/9.81;
 // 最大持續轉彎率：固定速度下，找速度不掉的最大坡度（水平協調轉彎）
 const sus=(alt,V0,phi)=>{lvl(alt,V0,1);for(let i=0;i<80;i++){const g=Math.asin(Math.max(-1,Math.min(1,P.vel.y/P.vel.length())));P.ovr={bank:phi,n:(Math.cos(g)+Math.max(-.4,Math.min(.4,(alt-P.pos.y)/150-g*3)))/Math.cos(phi)};G.run(.1)}P.ovr=null;return P.V>=V0-1&&Math.abs(P.pos.y-alt)<150};
 let best=0,bv=0;for(const V0 of [170,200,230,260]){let lo=.2,hi=1.37;for(let k=0;k<9;k++){const m=(lo+hi)/2;if(sus(3000,V0,m))lo=m;else hi=m}const rate=9.81*Math.tan(lo)/V0*57.3;if(rate>best){best=rate;bv=V0}}
 out.susTurn=best;out.susV=bv;out.susAlt=3000;
 lvl(3000,300,1);G.inp.stickOn=true;G.inp.sx=0;G.inp.sy=1;let gm=0;G.run(3,()=>{gm=Math.max(gm,P.g)});G.inp.stickOn=false;out.gmax=gm;
 G.start('land');G.M.paused=true;G.run(25);out.approach=P.V*1.944;out.appAlpha=P.alpha*57.3;
 return out});
let fail=0;for(const [k,[lo,hi,d]] of Object.entries(BANDS)){const v=R[k],ok=v>=lo&&v<=hi;if(!ok)fail++;console.log((ok?'通過':'失敗')+'  '+d+'：'+v.toFixed(2)+'（範圍 '+lo+'–'+hi+'）')}
console.log('持續轉彎時速度 '+(R.susV*1.944).toFixed(0)+' 節、高度 '+R.susAlt.toFixed(0)+' m；進場攻角 '+R.appAlpha.toFixed(1)+' 度');
console.log(errs.join('|')||'no errors');await b.close();process.exit(fail?1:0)})();
