// 簡易搖桿：直接給搖桿量、推進模擬，量坡度、航向、高度
const {open}=require('./lib');(async()=>{const {b,p,errs}=await open({viewport:{width:844,height:390},hasTouch:true,isMobile:true});await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const run=(label,seq)=>p.evaluate(([label,seq])=>{const G=__G,P=G.P,V=P.pos.constructor;G.start('free');G.M.paused=true;P.pos.set(0,1500,-1500);P.vel.set(0,0,-200);P.q.set(0,0,0,1);P.aim.set(0,0,-1);P.thr=P.thrAct=.9;P.at=true;
  const o=[];let t=0;for(const [dur,ex,ey,on] of seq){G.inp.ezOn=on;G.inp.ex=ex;G.inp.ey=ey;if(!on)P.ezRel=true;for(let i=0;i<dur*10;i++){G.run(.1);t+=.1;if(Math.round(t*10)%10===0){const r=new V(1,0,0).applyQuaternion(P.q),u=new V(0,1,0).applyQuaternion(P.q);o.push(`${t.toFixed(0)}s 坡${Math.round(Math.atan2(-r.y,u.y)*57.3)} 向${Math.round(Math.atan2(P.vel.x,-P.vel.z)*57.3)} 高${P.pos.y|0} G${P.g.toFixed(1)}`)}}}
  return label+'\n  '+o.join(' | ')},[label,seq]);
console.log(await run('右推一半 6 秒後放開',[[6,.5,0,true],[6,0,0,false]]));
console.log(await run('右推到底 8 秒後放開',[[8,1,0,true],[6,0,0,false]]));
console.log(await run('左推 0.3 輕修正 3 秒',[[3,-.3,0,true],[4,0,0,false]]));
console.log(await run('往上推（爬升）4 秒、放開',[[4,0,-.8,true],[6,0,0,false]]));
console.log(await run('往下推（俯衝）4 秒、放開',[[4,0,.8,true],[8,0,0,false]]));
console.log(await run('右上斜推 5 秒',[[5,.7,-.5,true],[5,0,0,false]]));
console.log(errs.join('|')||'no errors');await b.close()})();
