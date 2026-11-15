// 外觀截圖：甲板、空中側光、逆光、低空陰影、座艙
const {open}=require('./lib');const tag=process.argv[2]||'new';(async()=>{const {b,p,errs}=await open({viewport:{width:844,height:390}});await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});await p.waitForTimeout(1500);
const V=(x,y,z)=>({x,y,z});
const shot=async(name,setup,camf)=>{await p.evaluate(([s,c])=>{const G=__G,P=G.P;eval(s);window.__CAMO=null;if(c){const o=eval('('+c+')');const T=P.pos.constructor;window.__CAMO={p:new T(o.p[0],o.p[1],o.p[2]).applyQuaternion(P.q).add(P.pos),l:new T(o.l[0],o.l[1],o.l[2]).applyQuaternion(P.q).add(P.pos),fov:o.fov}}},[setup,camf]);await p.waitForTimeout(700);await p.screenshot({path:`test/look_${tag}_${name}.png`})};
await shot('deck',"G.start('mission');G.M.paused=true;G.run(.5);G.M.paused=true","{p:[-14,5,-16],l:[0,0,0],fov:45}");
await shot('side',"G.start('free');G.M.paused=true;P.pos.set(0,1500,-3000);P.q.setFromAxisAngle(new P.pos.constructor(0,1,0),-1.2);P.vel.set(0,0,-200).applyQuaternion(P.q);G.run(.05);G.M.paused=true","{p:[-12,3,-8],l:[0,0,-1],fov:42}");
await shot('top',"G.M.paused=true;P.q.setFromAxisAngle(new P.pos.constructor(0,0,1),1.1);","{p:[8,10,14],l:[0,0,-2],fov:45}");
await shot('back',"G.M.paused=true;P.q.setFromAxisAngle(new P.pos.constructor(0,1,0),2.2);","{p:[3,2,22],l:[0,0,0],fov:40}");
await shot('low',"G.start('free');G.M.paused=true;P.pos.set(G.xc?G.xc(9000):0,(G.floorOf?G.floorOf(9000):300)+18,-9000);P.q.set(0,0,0,1);P.vel.set(0,0,-200);G.run(.05);G.M.paused=true","{p:[10,14,30],l:[0,-6,-6],fov:50}");
await p.evaluate(()=>{window.__CAMO=null;__G.M.paused=false});await p.waitForTimeout(600);await p.screenshot({path:`test/look_${tag}_chase.png`});
console.log(errs.join('|')||'no errors',await p.evaluate(()=>window.__NM));await b.close()})();
