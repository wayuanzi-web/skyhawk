const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const r=await p.evaluate(()=>{const G=__G,P=G.P,V=P.pos.constructor;G.start('free');G.M.paused=true;P.pos.set(0,1500,-1500);P.vel.set(0,0,-230);P.q.set(0,0,0,1);P.thr=P.thrAct=.8;
 P.aim.set(Math.sin(.85),0,-Math.cos(.85));const o=[];for(let i=0;i<60;i++){G.run(.1);if(i%4===0){const r=new V(1,0,0).applyQuaternion(P.q),u=new V(0,1,0).applyQuaternion(P.q);const c=P.cmd;
  o.push([+(Math.atan2(-r.y,u.y)*57.3).toFixed(0),+(Math.atan2(P.vel.x,-P.vel.z)*57.3).toFixed(1),+(c.roll||0).toFixed(2),+(c.aCmd||0).toFixed(3),+(P.alpha*57.3).toFixed(1),+(P.beta*57.3).toFixed(1),+(-P.w.z).toFixed(2)])}}return o});
console.log('坡度,航向,滾轉指令,攻角指令,攻角,側滑,滾轉率');r.forEach(x=>console.log(x.join(',')));await b.close()})();
