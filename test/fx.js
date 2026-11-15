// 特效截圖：後燃器、邊條渦流、蒸氣錐、航行燈
const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});await p.waitForTimeout(1500);
const sh=async(name,setup,camRel,fov=40)=>{await p.evaluate(([s,c,f])=>{const G=__G,P=G.P,T=P.pos.constructor;eval(s);const o=c;window.__CAMO={p:new T(...o[0]).applyQuaternion(P.q).add(P.pos),l:new T(...o[1]).applyQuaternion(P.q).add(P.pos),fov:f}},[setup,camRel,fov]);await p.waitForTimeout(900);await p.screenshot({path:`test/fx_${name}.png`})};
const base="G.start('free');G.M.paused=true;P.pos.set(0,800,-4000);P.q.set(0,0,0,1);P.vel.set(0,0,-200);";
await sh('ab',base+"P.thr=P.thrAct=1;G.run(.05);P.thr=P.thrAct=1;G.M.paused=true;",[[3,2.5,22],[0,0,4]]);
await sh('ab2',base+"P.thr=P.thrAct=1;G.run(.05);P.thr=P.thrAct=1;G.M.paused=true;",[[-9,1,16],[0,0,8]]);
await sh('lex',base+"P.vel.set(0,0,-170);G.run(.05);G.M.paused=true;P.alpha=.4;P.V=170;",[[-10,9,-4],[0,0,0]],45);
await sh('vcone',base+"P.vel.set(0,0,-333);G.run(.05);G.M.paused=true;P.V=333;P.alpha=.05;",[[-16,6,14],[0,0,0]],45);
await sh('nav',base+"G.run(.05);G.M.paused=true;",[[8,9,-12],[0,0,1]],45);
console.log(errs.join('|')||'no errors');await b.close()})();
