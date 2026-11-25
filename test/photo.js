const {open}=require('./lib');(async()=>{let bad=0;for(const W of [667,844,932]){const {b,p,errs}=await open({viewport:{width:W,height:390}});
await p.waitForFunction(()=>window.__G&&__G.YM&&__G.YM.bb&&__G.YM.bb.lods,null,{timeout:180000});
await p.evaluate(()=>{__G.start('yamato');const d=__G.YM.cvs[1];const V=__G.THREE.Vector3;for(let i=0;i<80&&d.alive;i++)__G.ymHit(d,'hpn',new V(-12,1,(i%5-2)*30));for(let i=0;i<50&&!__SINK.SINKCIN.active;i++)__G.run(.1)});
await p.waitForTimeout(1500);
const r1=await p.evaluate(()=>{const b=document.getElementById('skPh'),row=b.parentElement,R=[...row.children].filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect());let ov=0;for(let i=0;i<R.length;i++)for(let j=i+1;j<R.length;j++){const a=R[i],c=R[j];if(a.left<c.right-1&&c.left<a.right-1&&a.top<c.bottom-1&&c.top<a.bottom-1)ov++}const br=b.getBoundingClientRect();return {vis:!!b.offsetParent,ov,inside:br.right<=innerWidth&&br.left>=0}});
await p.click('#skPh');await p.waitForTimeout(1500);
const r2=await p.evaluate(()=>({ph:getComputedStyle(document.getElementById('ph')).display,src:document.getElementById('phI').src.slice(0,90),cap:document.getElementById('phCap').textContent,n:document.getElementById('phN').textContent,play:__SINK.SINKCIN.playing}));
await p.click('#phR');await p.waitForTimeout(300);const n2=await p.evaluate(()=>document.getElementById('phN').textContent);
await p.screenshot({path:`/tmp/ph_${W}.png`});
await p.click('#phX');await p.waitForTimeout(300);const r3=await p.evaluate(()=>({ph:getComputedStyle(document.getElementById('ph')).display,play:__SINK.SINKCIN.playing}));
const ok=r1.vis&&!r1.ov&&r1.inside&&r2.ph==='flex'&&!r2.play&&n2!==r2.n&&r3.ph==='none'&&r3.play;if(!ok)bad++;
console.log(W,ok?'通過':'失敗',JSON.stringify({r1,r2,n2,r3}),errs.filter(e=>!/Failed to load resource|wikimedia/i.test(e)).slice(0,3).join('|'));await b.close()}
console.log(bad?'有失敗':'全部通過')})()
