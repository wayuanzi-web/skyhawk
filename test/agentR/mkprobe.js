// 由 index.html 產生 probe.html（只加測試掛鉤，不改邏輯）；可選擇套用修補 patches
const fs=require('fs');const src=fs.readFileSync(__dirname+'/../../index.html','utf8');
function mk(out,patches=[]){let s=src;
 const a='function frame(now){requestAnimationFrame(frame);let dt=Math.min(.1,(now-last)/1000);last=now;';
 if(!s.includes(a))throw 'frame anchor';
 s=s.replace(a,'function frame(now){requestAnimationFrame(frame);if(window.__FRZ)return;let dt=Math.min(.1,(now-last)/1000);last=now;body(dt,now)}\nfunction body(dt,now){');
 s=s.replace('/* 測試用掛鉤 */','window.__R={body,updCam:(d)=>updCam(d),get view(){return view},set view(v){view=v},camDir,get acc(){return acc},set acc(v){acc=v}};\n/* 測試用掛鉤 */');
 s=s.replace("LD.load('assets/fa18e.glb'","LD.load('../../assets/fa18e.glb'");
 for(const [f,t] of patches){if(!s.includes(f))throw 'patch anchor missing: '+f.slice(0,60);s=s.replace(f,t)}
 fs.writeFileSync(__dirname+'/'+out,s)}
module.exports=mk;if(require.main===module)mk('probe.html');
