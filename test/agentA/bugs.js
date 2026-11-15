const {open}=require('./common');(async()=>{const {b,p,errs}=await open();
const R=await p.evaluate(()=>{const G=__G,P=G.P,M=G.M,V3=P.pos.constructor,o={};
 const launch=(thr,flaps,gearUpAt)=>{M.diff=0;G.start('mission');M.paused=true;P.thr=thr;P.flaps=flaps;G.run(3);G.act.launch();const st0=P.state;let minY=99;for(let i=0;i<120;i++){G.run(.1);if(!P.onDeck)minY=Math.min(minY,P.pos.y);if(P.state!=='fly')break}return{st0,st:P.state,why:P.state==='dead'?M.why:'',minY:+minY.toFixed(1),y:P.pos.y|0,V:P.V|0}};
 o.launch_AB_flaps=launch(1,true);o.launch_AB_noflaps=launch(1,false);o.launch_mil85=launch(.85,true);o.launch_thr79=launch(.79,true);
 // banked / nose-down touchdown
 const td=(roll,pitch,sink,hook=true)=>{G.start('land');M.paused=true;const E=new (Object.getPrototypeOf(P.q).constructor)();P.pos.set(G.LP0.x+G.LD.x*70,22.3+.4,G.LP0.z+G.LD.z*70);P.vel.set(G.LD.x*70,-sink,G.LD.z*70);
   // build attitude: yaw .157, pitch, roll
   const cy=Math.cos(.157/2),sy=Math.sin(.157/2),cp=Math.cos(pitch/2),sp=Math.sin(pitch/2),cr=Math.cos(-roll/2),sr=Math.sin(-roll/2);
   const qy=E.clone().set(0,sy,0,cy),qp=E.clone().set(sp,0,0,cp),qr=E.clone().set(0,0,sr,cr);P.q.copy(qy).multiply(qp).multiply(qr);P.hook=hook;G.run(.3);return{st:P.state,why:P.state==='dead'?M.why:'',onDeck:P.onDeck,wire:M.td&&M.td.wire}};
 o.td_bank60=td(1.05,.1,3);o.td_inverted=td(3.1,.1,3);o.td_nose_down20=td(0,-.35,3);o.td_sink8=td(0,.1,8);o.td_sink9=td(0,.1,9);
 // roll off deck side at taxi speed
 M.diff=0;G.start('mission');M.paused=true;P.state='fly';P.thr=.5;P.aim.set(1,0,0);let log=[];for(let i=0;i<300&&P.state==='fly';i++){G.run(.1);if(i%50===0)log.push([P.pos.x|0,P.pos.y|0,P.pos.z|0,P.V|0,P.onDeck])}o.taxiOff={st:P.state,why:M.why,log};
 // island pass-through
 G.start('free');M.paused=true;P.pos.set(30,35,300);P.vel.set(0,0,-150);P.aim.set(0,0,-1);P.q.set(0,0,0,1);G.run(3);o.island={st:P.state,z:P.pos.z|0};
 // hull from the side below deck
 G.start('free');M.paused=true;P.pos.set(200,10,0);P.vel.set(-150,0,0);P.aim.set(-1,0,0);G.run(2);o.hullSide={st:P.state,why:M.why};
 // under-deck from astern low (ramp strike)
 G.start('land');M.paused=true;P.pos.set(G.LP0.x-G.LD.x*60,17,G.LP0.z-G.LD.z*60);P.vel.set(G.LD.x*70,0,G.LD.z*70);P.aim.copy(G.LD);G.run(2);o.ramp={st:P.state,why:M.why};
 // death then immediate retry: does delayed failT fire result?
 M.diff=0;G.start('mission');M.paused=true;G.spawn(1);P.pos.y=5;G.run(.2);const d1=P.state;G.spawn(M.cp);G.run(3);o.retryAfterDeath={dead:d1,after:P.state,failT:M.failT,over:M.over,resultShown:document.getElementById('result').style.display};
 // die → wait → showResult → retry button
 G.spawn(1);P.pos.y=5;G.run(3);o.deathFlow={st:P.state,over:M.over,paused:M.paused,why:M.why};document.getElementById('rRetry').click();o.deathFlow.afterRetry={st:P.state,cp:M.cp,ph:M.phase,hp:P.hp,paused:M.paused};M.paused=true;
 // gear down at 300 m/s, flaps: any limit?
 G.start('free');M.paused=true;P.thr=1;G.run(40);G.act.gear();P.flaps=true;G.run(5);o.gearAt={V:P.V|0,st:P.state,gear:P.gear};
 // bombs on deck / on cat, gun on cat
 G.start('mission');M.paused=true;G.dropBomb();G.inp.fire=true;G.run(1);G.inp.fire=false;o.catWeapons={bombs:P.bombs,ammo:P.ammo|0};
 // phase skipping: fly high outside canyon straight to target
 G.start('mission');M.paused=true;G.spawn(1);P.pos.set(3000,2500,-7000);P.aim.set(0,0,-1);let ph=[];for(let i=0;i<150&&P.state==='fly';i++){G.run(.1)}o.highRoute={st:P.state,why:M.why,t:M.t|0,u:(-P.pos.z)|0,lock:+M.lock.toFixed(2)};
 // stale grade after new start
 o.staleGrade=M.grade;
 // ceiling
 G.start('free');M.paused=true;P.pos.y=15900;P.aim.set(0,.3,-1).normalize();P.thr=1;G.run(20);o.ceiling={st:P.state,why:M.why,y:P.pos.y|0};
 // NaN scan
 o.nan=![P.pos.x,P.pos.y,P.pos.z,P.q.x,P.q.w,P.V,P.alpha].every(isFinite);
 return o});
for(const k in R)console.log(k,JSON.stringify(R[k]));console.log(errs.join('\n')||'no errors');await b.close()})();
