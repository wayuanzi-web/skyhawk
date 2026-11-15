const {chromium}=require('playwright');const path=require('path');
exports.open=async()=>{const L=require('../lib');const {b,p,errs}=await L.open({},process.env.PAGE||'index.html');await p.waitForFunction(()=>window.__G);
await p.evaluate(()=>{const G=__G,P=G.P;window.H={
 hdg:()=>Math.atan2(P.vel.x,-P.vel.z)*57.2958,
 bank:()=>{const r=new P.pos.constructor(1,0,0).applyQuaternion(P.q),u=new P.pos.constructor(0,1,0).applyQuaternion(P.q);return Math.atan2(-r.y,u.y)},
 air:(alt,v,thr)=>{G.M.diff=0;G.start('free');G.M.paused=true;P.pos.set(0,alt,60000);P.vel.set(0,0,-v);P.thr=P.thrAct=thr;P.aim.set(0,0,-1)},
 wrap:a=>{while(a>180)a-=360;while(a<-180)a+=360;return a}}});
return{b,p,errs}};
