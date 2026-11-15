const {open}=require('./common');(async()=>{const {b,p,errs}=await open();
const R=await p.evaluate(()=>{const G=__G,P=G.P,o={};const V3=P.pos.constructor;
 function yawTest(deg,V,thr,alt=1500){H.air(alt,V,thr);G.run(3);const a0=P.pos.y,r=deg/57.3;P.aim.set(Math.sin(r),0,-Math.cos(r));let t=null,over=0,minA=0,maxA=0,gmax=0,settle=null,osc=0,prev=0;
  for(let i=0;i<600;i++){G.run(.05);const e=H.wrap(H.hdg()-deg);if(t===null&&Math.abs(e)<3)t=i*.05;if(t!==null){over=Math.max(over,e);if(Math.sign(e)!==Math.sign(prev)&&Math.abs(e)>.5)osc++;prev=e;}
   minA=Math.min(minA,P.pos.y-a0);maxA=Math.max(maxA,P.pos.y-a0);gmax=Math.max(gmax,P.g);if(P.state!=='fly')break}
  const eEnd=H.wrap(H.hdg()-deg);return{t,over:+over.toFixed(1),minAlt:minA|0,maxAlt:maxA|0,gmax:+gmax.toFixed(1),endErr:+eEnd.toFixed(1),endPitch:+(Math.asin(P.vel.y/P.V)*57.3).toFixed(1),osc,V:P.V|0,st:P.state}}
 o.yaw={};for(const d of [30,90,180])o.yaw[d+'@220']=yawTest(d,220,.7);o.yaw['90@150']=yawTest(90,150,.6);o.yaw['90@90']=yawTest(90,90,.5);o.yaw['180@90']=yawTest(180,90,.5);o.yaw['90@300']=yawTest(90,300,.9);o.yaw['180@220lowalt300']=yawTest(180,220,.7,300);
 function pitTest(deg,V){H.air(1500,V,.7);G.run(3);const r=deg/57.3;P.aim.set(0,Math.sin(r),-Math.cos(r));let t=null,over=0,gmin=9,gmax=0,osc=0,prev=0;
  for(let i=0;i<300;i++){G.run(.05);const pp=Math.asin(P.vel.y/P.V)*57.3,e=pp-deg;if(t===null&&Math.abs(e)<2)t=i*.05;if(t!==null){over=Math.max(over,Math.sign(deg)*e);if(Math.sign(e)!==Math.sign(prev)&&Math.abs(e)>.3)osc++;prev=e}gmin=Math.min(gmin,P.g);gmax=Math.max(gmax,P.g);if(P.state!=='fly')break}
  return{t,over:+over.toFixed(1),gmin:+gmin.toFixed(1),gmax:+gmax.toFixed(1),osc,V:P.V|0,alt:P.pos.y|0,st:P.state}}
 o.pitch={'+30':pitTest(30,220),'-30':pitTest(-30,220),'-60':pitTest(-60,220),'+80':pitTest(80,220)};
 // level hold drift over 60 s, wings level
 H.air(1500,200,.5);G.run(60);o.hold={dAlt:(P.pos.y-1500)|0,bank:+(H.bank()*57.3).toFixed(1),V:P.V|0};
 // slow flight idle: does assisted control lose it?
 H.air(1500,150,0);let minV=999,st='';for(let i=0;i<1200;i++){P.aim.set(0,0,-1);G.run(.1);minV=Math.min(minV,P.V);if(P.state!=='fly'){st=G.M.why;break}}o.idleLevel={minV:minV|0,endAlt:P.pos.y|0,vy:+P.vel.y.toFixed(1),aoa:+(P.alpha*57.3).toFixed(1),st:P.state,why:st};
 // vertical climb until out of speed
 H.air(1000,250,.3);P.aim.set(0,Math.sin(1.4),-Math.cos(1.4));let nan=false,mv=999;for(let i=0;i<600;i++){G.run(.1);mv=Math.min(mv,P.V);if(!isFinite(P.pos.x+P.pos.y+P.q.x+P.V))nan=true;if(P.state!=='fly')break}o.vert={minV:mv|0,nan,st:P.state,alt:P.pos.y|0,why:G.M.why};
 // stick roll rate
 o.roll={};for(const V of [100,220,300]){H.air(1500,V,.7);G.run(2);G.inp.stickOn=true;G.inp.sx=1;G.inp.sy=0;const q0=P.q.clone();let ang=0,prev=H.bank();for(let i=0;i<30;i++){G.run(1/30);const bk=H.bank();let d=bk-prev;if(d<-3)d+=6.283;if(d>3)d-=6.283;ang+=d;prev=bk}o.roll[V]=(ang*57.3)|0;
  G.inp.sx=0;G.run(3);const b1=H.bank()*57.3;G.run(5);o.roll[V+'_drift5s']=+(H.bank()*57.3-b1).toFixed(1);G.inp.stickOn=false}
 // stick release: aim snaps to nose -> does assisted hold or roll level?
 H.air(1500,220,.7);G.inp.stickOn=true;G.inp.sx=1;G.run(.6);G.inp.sx=0;G.run(.3);G.inp.stickOn=false;const bk0=H.bank()*57.3;G.run(4);o.release={bankBefore:bk0|0,bankAfter4s:(H.bank()*57.3)|0,vy:+P.vel.y.toFixed(0)};
 // full aft stick hold 20 s
 H.air(3000,220,1);G.inp.stickOn=true;G.inp.sx=0;G.inp.sy=1;let amx=0;for(let i=0;i<200;i++){G.run(.1);amx=Math.max(amx,P.alpha)}G.inp.stickOn=false;G.inp.sy=0;o.loop={aoaMax:+(amx*57.3).toFixed(1),V:P.V|0,alt:P.pos.y|0,st:P.state};
 return o});
console.log(JSON.stringify(R).replace(/},/g,'},\n'));console.log(errs.join('\n')||'no errors');await b.close()})();
