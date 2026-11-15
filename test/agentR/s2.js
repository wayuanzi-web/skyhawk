// 任務：彈射、峽谷；著艦
const {go,shots}=require('./rlib');const fs=require('fs');const which=process.argv[2]||'all';const page=process.argv[3]||'test/agentR/probe.html';const tag=process.argv[4]||'base';
(async()=>{const {b,p,errs}=await go(page);const D=__dirname+'/shots_'+tag;const log={};
const S=async(name,setup,dur,fn,step=0.2,dt=1/30)=>{if(which!=='all'&&!which.split(',').includes(name))return;await p.evaluate(s=>eval(s),setup);log[name]=await shots(p,name,dur,dt,fn,step,D);console.log(name,log[name].length)};
await p.evaluate(()=>{const G=__G,P=G.P,V3=P.pos.constructor;
 window.canyonAim=()=>{const u=-P.pos.z+700;const tp=new V3(G.xc(u),G.floorOf(u)+45,-u);P.aim.copy(tp.sub(P.pos)).normalize()};
 window.landAim=()=>{const LP=G.LP0,LD=G.LD,aimP=LP.clone().addScaledVector(LD,73);const rel=P.pos.clone().sub(aimP),along=-rel.dot(LD);if(P.onDeck)return;const la=Math.max(0,along-450),tp=aimP.clone().addScaledVector(LD,-la);tp.y=22.3+Math.tan(.061)*la;P.aim.copy(tp.sub(P.pos)).normalize()};
});
// 彈射：油門推滿、等 2 秒、按彈射；從按彈射前 0.5 秒開始截
await S('cat',"__G.start('mission');__R.view=0;__G.P.thr=1;for(let i=0;i<60;i++)tick(1/30,false)",5,"(()=>{let s=__T,done=false;return (t)=>{if(!done&&t-s>0.5){__G.act.launch();done=true}if(t-s>3.5&&__G.P.gear){__G.act.gear();__G.act.flap()}}})()",0.1);
await S('canyon',"__G.start('mission');__G.spawn(1);__R.view=0;__R.camDir.copy(__G.P.aim);for(let i=0;i<30;i++){canyonAim();tick(1/30,false)}",6,"(t)=>canyonAim()",0.2);
await S('landx',"__G.start('land');__R.view=0;for(let i=0;i<30;i++){landAim();tick(1/30,false)};for(let i=0;i<1200&&__G.P.pos.distanceTo(__G.LP0)>900;i++){landAim();tick(1/30,false)}",9,"(t)=>landAim()",0.25);
await S('landc',"__G.start('land');__R.view=1;for(let i=0;i<30;i++){landAim();tick(1/30,false)};for(let i=0;i<1200&&__G.P.pos.distanceTo(__G.LP0)>700;i++){landAim();tick(1/30,false)}",8,"(t)=>landAim()",0.25);
await S('trap',"__G.start('land');__R.view=0;for(let i=0;i<3000&&__G.P.pos.distanceTo(__G.LP0)>200||__G.P.pos.y>27;i++){landAim();tick(1/30,false)}",5,"(t)=>landAim()",0.1);
fs.writeFileSync(D+'/log2_'+which.replace(/,/g,'_')+'.json',JSON.stringify(log));console.log(errs.join('\n')||'ok');await b.close()})();
