// 三段畫質：截圖、繪製次數、單幀時間（軟體繪圖，只看相對值）
const {open}=require('./lib');(async()=>{const {b,p,errs}=await open();await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});await p.waitForTimeout(1200);
for(const q of [2,1,0]){const r=await p.evaluate(async q=>{const G=__G,P=G.P;G.setLook(q);G.start('free');G.M.paused=true;const x=G.xc?G.xc(9000):0;P.pos.set(x,(G.floorOf?G.floorOf(9000):300)+60,-9000);P.q.set(0,0,0,1);P.vel.set(0,0,-200);G.run(.05);
  await new Promise(r=>setTimeout(r,600));const R=G.renderer||window.__R;const t0=performance.now();for(let i=0;i<5;i++)await new Promise(r=>requestAnimationFrame(r));return{ms:((performance.now()-t0)/5)|0,calls:R?R.info.render.calls:-1}},q);
  await p.screenshot({path:`test/qual_${q}.png`});console.log('q',q,JSON.stringify(r))}
console.log(errs.join('|')||'no errors');await b.close()})();
