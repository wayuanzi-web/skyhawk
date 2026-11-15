const {open}=require('./common');(async()=>{const {b,p}=await open();
console.log(JSON.stringify(await p.evaluate(()=>{const G=__G,P=G.P,M=G.M,o=[];M.diff=0;G.start('mission');M.paused=true;P.thr=1;G.run(2.2);G.act.launch();
 for(let s=0;s<600&&P.state==='fly';s++){const u=-P.pos.z;if(!P.onDeck&&P.pos.y>60&&P.gear){G.act.gear();G.act.flap()}
  if(M.phase<=1)P.aim.set(0-P.pos.x,80-P.pos.y,-1500).normalize();else{const la=u+800;P.aim.set(G.xc(la)-P.pos.x,G.floorOf(la)+90-P.pos.y,-la-P.pos.z).normalize()}
  P.thr=P.V<220?1:.6;G.run(.1);if(u>6800&&s%3===0)o.push([u|0,P.pos.x|0,P.pos.y|0,G.groundH(P.pos.x,P.pos.z)|0,P.V|0,M.phase,P.gear,P.flaps])}
 return{why:M.why,o:o.slice(-14)}})));await b.close()})();
