const {open}=require('./lib');(async()=>{const {b,p}=await open({viewport:{width:844,height:390}});await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
await p.tap?0:0;await p.click('#mFree').catch(()=>{});await p.waitForTimeout(300);
const r=await p.evaluate(()=>{const G=__G,P=G.P,M=G.M;M.paused=true;P.pos.set(0,2000,-1500);P.vel.set(0,0,-250);P.q.set(0,0,0,1);P.w&&P.w.set(0,0,0);P.thr=P.thrAct=1;P.hold=null;P.ovr=null;M.paused=false;
 const o=[];const V=P.pos.constructor;for(let i=0;i<40;i++){P.aim.set(1,-.05,0).normalize();G.run(.1);const r=new V(1,0,0).applyQuaternion(P.q),u=new V(0,1,0).applyQuaternion(P.q);
 if(i%4==3)o.push(`t${((i+1)/10).toFixed(1)} 坡${Math.round(Math.atan2(-r.y,u.y)*57.3)} 向${Math.round(Math.atan2(P.vel.x,-P.vel.z)*57.3)} G${(P.nz||P.g||0).toFixed?(P.nz||P.g||0).toFixed(1):''} 高${P.pos.y|0} 速${P.vel.length()|0}`)}return o.join(' | ')});
console.log(process.env.DIST||'src',r);await b.close()})();
