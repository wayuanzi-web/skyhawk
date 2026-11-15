// 實戰演練：開局、敵機波次、地面鎖定、補給；截圖
const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});await p.waitForTimeout(1000);
await p.click('#mCombat');await p.waitForTimeout(600);
const r=await p.evaluate(()=>{const G=__G,P=G.P;G.M.paused=true;const o=[];for(let i=0;i<300;i++){G.run(.1);if(i%50===49)o.push(`t${(i+1)/10} 敵機${G.CB.ene.filter(e=>e.alive).length} 狀態${P.state} 高${P.pos.y|0}`)}G.M.paused=false;return o.join(' | ')});
console.log(r);await p.waitForTimeout(1500);await p.screenshot({path:'test/cmb_mode.png'});console.log(errs.join('|')||'no errors');await b.close()})();
