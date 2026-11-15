// 自由飛行序列截圖
const {go,shots}=require('./rlib');const fs=require('fs');const which=process.argv[2]||'all';const page=process.argv[3]||'test/agentR/probe.html';const tag=process.argv[4]||'base';
(async()=>{const {b,p,errs}=await go(page);const D=__dirname+'/shots_'+tag;const log={};
const S=async(name,setup,dur,fn,step=0.2,dt=1/30)=>{if(which!=='all'&&!which.split(',').includes(name))return;await p.evaluate(s=>eval(s),setup);log[name]=await shots(p,name,dur,dt,fn,step,D);console.log(name,log[name].length)};
await S('turn',"freeStart();for(let i=0;i<30;i++)tick(1/30,false)",4,"(t)=>{if(Math.abs(t-__T0)<0.001){}}".replace('__T0','0')&&"(()=>{let s=__T;return (t)=>{if(t-s>0.4&&t-s<0.45)setAimRel(1.4,0)}})()",0.2);
await S('roll',"freeStart();for(let i=0;i<30;i++)tick(1/30,false)",3,"(()=>{let s=__T;return (t)=>{const G=__G;if(t-s>0.2&&t-s<1.4){G.inp.stickOn=true;G.inp.sx=1;G.inp.sy=0}else{G.inp.stickOn=false;G.inp.sx=0}}})()",0.1);
await S('dive',"freeStart(3000,230);for(let i=0;i<30;i++)tick(1/30,false)",4,"(()=>{let s=__T;return (t)=>{if(t-s>0.2&&t-s<0.25)setAimRel(0,-0.8)}})()",0.25);
await S('climb',"freeStart(1500,250);for(let i=0;i<30;i++)tick(1/30,false)",4,"(()=>{let s=__T;return (t)=>{if(t-s>0.2&&t-s<0.25)setAimRel(0,0.9)}})()",0.25);
await S('sea',"freeStart(25,260);__G.P.thr=__G.P.thrAct=1;for(let i=0;i<30;i++)tick(1/30,false)",1,null,1/30);
await S('ab',"freeStart(1500,150);for(let i=0;i<30;i++)tick(1/30,false);__G.P.thr=1",6,null,0.5);
await S('brake',"freeStart(1500,280);for(let i=0;i<30;i++)tick(1/30,false);__G.P.thr=0.3;__G.P.brake=true",5,null,0.5);
fs.writeFileSync(D+'/log_'+which.replace(/,/g,'_')+'.json',JSON.stringify(log));console.log(errs.join('\n')||'ok');await b.close()})();
