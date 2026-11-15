// 同樣拖 100px，觸控事件密度不同（快速滑 vs 慢慢拖 / 60Hz vs 120Hz 螢幕）時指向圈移動多少
const {boot}=require('./h');(async()=>{const H=await boot();const {p,reset,run,drag}=H;
for(const n of [4,7,10,20,40]){await reset();await run(.2);await drag(560,200,100,0,n,1,true);const e=await p.evaluate(()=>__samp().aimE);console.log(`100px 分 ${n} 個 move 事件（每步 ${(100/n).toFixed(1)}px）→ 指向圈偏 ${e}°`)}
for(const n of [5,10,20]){await reset();await run(.2);await drag(600,100,0,200,n,1,true);const e=await p.evaluate(()=>__samp().aimEl);console.log(`往下 200px 分 ${n} 步 → 指向圈俯角 ${e}°`)}
await H.b.close()})();
