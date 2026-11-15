const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const r=await p.evaluate((delay)=>{const G=__G,P=G.P,M=G.M,V=P.pos.constructor;M.diff=0;G.start('mission');G.spawn(2);M.paused=true;
 const imp=new V(),T=G.tgtPos,q=[];const des=new V();let log=[];
 for(let s=0;s<900&&P.state==='fly'&&M.phase<4;s++){const u=-P.pos.z;
  if(M.phase===2){const la=u+850;des.set(G.xc(la)-P.pos.x,G.floorOf(la)+60-P.pos.y,-la-P.pos.z).normalize()}
  else if(u<21300)des.set(T.x-P.pos.x,1050-P.pos.y,-21500-P.pos.z).normalize();
  else if(G.ccip(imp)){const d=Math.hypot(imp.x-T.x,imp.z-T.z);des.set(2*T.x-imp.x-P.pos.x,T.y+Math.min(400,d*.5)-P.pos.y,2*T.z-imp.z-P.pos.z).normalize();if(s%5===0)log.push([u|0,P.pos.y|0,d|0,(imp.x-T.x)|0,(imp.z-T.z)|0]);if(d<35&&P.bombs>0){G.dropBomb();log.push('DROP '+d.toFixed(0))}}
  q.push(des.clone());if(q.length>delay)P.aim.copy(q.shift());G.run(.1)}
 return {ph:M.phase,tgt:M.tgt,log:log.slice(0,40)}},+(process.argv[2]||2));
console.log(JSON.stringify(r));await b.close()})();
