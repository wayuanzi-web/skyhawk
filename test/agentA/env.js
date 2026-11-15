const {open}=require('./common');(async()=>{const {b,p,errs}=await open();
const R=await p.evaluate(()=>{const G=__G,P=G.P,o={};
 // max mach
 o.vmax={};for(const alt of [300,5000,10000]){H.air(alt,300,1);let last=0;for(let i=0;i<400;i++){P.aim.set(0,Math.max(-.2,Math.min(.2,(alt-P.pos.y)*.001)),-1).normalize();G.run(1);}o.vmax[alt]={M:+P.mach.toFixed(2),V:P.V|0,alt:P.pos.y|0,st:P.state}}
 // turns (direct stick, hold level by bank)
 function turn(V,sustained){H.air(1000,sustained?V:V+35,1);G.run(1);G.inp.stickOn=true;let bt=1.25,pit=1,res=null,alt0=P.pos.y,h0=H.hdg(),rates=[],gs=[],T=sustained?45:14;
  for(let i=0;i<T*30;i++){const bk=H.bank();bt+=(P.vel.y*.004+(P.pos.y-alt0)*.0008)*(1/30);bt=Math.max(.3,Math.min(1.52,bt));G.inp.sx=Math.max(-1,Math.min(1,(bt-bk)*3));
   if(sustained){pit+=((P.V-V)*.02)*(1/30)*3;pit=Math.max(0,Math.min(1,pit));}G.inp.sy=pit;
   const h1=H.hdg();G.run(1/30);const r=H.wrap(H.hdg()-h1)*30;
   if(sustained){if(i>T*30-150){rates.push(r);gs.push(P.g)}}else if(res===null&&P.V<=V&&i>60){res={rate:+r.toFixed(1),g:+P.g.toFixed(1),aoa:+(P.alpha*57.3).toFixed(1)}}}
  G.inp.stickOn=false;G.inp.sx=G.inp.sy=0;
  if(sustained){const m=a=>a.reduce((x,y)=>x+y,0)/a.length;return{rate:+m(rates).toFixed(1),g:+m(gs).toFixed(1),V:P.V|0,dAlt:(P.pos.y-alt0)|0,pit:+pit.toFixed(2)}}return res||{fail:1,V:P.V|0}}
 o.inst={};o.sust={};for(const V of [150,180,220,260]){o.inst[V]=turn(V,false);o.sust[V]=turn(V,true)}
 // climb
 o.climb=[];for(const pd of [10,20,30,40,50,60,75]){H.air(300,230,1);const pr=pd/57.3;P.aim.set(0,Math.sin(pr),-Math.cos(pr));G.run(6);const v0=P.V;G.run(6);o.climb.push([pd,+P.vel.y.toFixed(0),P.V|0,+((P.V-v0)/6).toFixed(1)])}
 // stall clean / landing config
 function stall(cfg){H.air(1500,cfg?110:160,0);if(cfg){P.gear=P.flaps=true}let last=null;for(let i=0;i<900;i++){P.aim.set(0,0,-1);G.run(.1);if(P.vel.y<-3||P.alpha>0.48){last={V:P.V|0,kt:(P.V*1.944)|0,aoa:+(P.alpha*57.3).toFixed(1),vy:+P.vel.y.toFixed(1)};break}}return last}
 o.stallClean=stall(false);o.stallLand=stall(true);
 // approach on AT
 H.air(600,90,.3);P.gear=P.flaps=P.hook=true;P.at=true;P.bombs=0;for(let i=0;i<400;i++){P.aim.set(0,-Math.sin(.061),-Math.cos(.061));G.run(.1)}o.approach={kt:(P.V*1.944)|0,aoa:+(P.alpha*57.3).toFixed(1),thr:+P.thr.toFixed(2),vy:+P.vel.y.toFixed(1)};
 H.air(600,90,.3);P.gear=P.flaps=P.hook=true;P.at=true;P.bombs=4;for(let i=0;i<400;i++){P.aim.set(0,-Math.sin(.061),-Math.cos(.061));G.run(.1)}o.approach4bombs={kt:(P.V*1.944)|0,aoa:+(P.alpha*57.3).toFixed(1),thr:+P.thr.toFixed(2)};
 // mil cruise speeds by throttle
 o.thrSpeed=[];for(const t of [.2,.4,.6,.85]){H.air(300,200,t);for(let i=0;i<200;i++){P.aim.set(0,0,-1);G.run(1)}o.thrSpeed.push([t,(P.V*1.944)|0,+P.mach.toFixed(2)])}
 return o});
console.log(JSON.stringify(R,null,0).replace(/},/g,'},\n'));console.log(errs.join('\n')||'no errors');await b.close()})();
