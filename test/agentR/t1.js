const {go,seg}=require('./rlib');
(async()=>{const {b,p,errs}=await go();
await p.evaluate(()=>freeStart());
const pr=(lbl,a,keys)=>{console.log('== '+lbl);for(const r of a)console.log(keys.map(k=>k+'='+JSON.stringify(r[k])).join(' '))};
const K=['t','kt','alt','bank','pitch','hdg','trk','a','b','g','camRoll','camPitch','camHdg','camNose','camVel','dist','sx','sy','fov'];
pr('平飛 3s',await seg(p,3,1/30,null,0.5),K);
pr('指向圈右 60度 保持',await seg(p,6,1/30,"(t)=>{if(t<0.04)setAimRel(1.05,0)}",0.2),K);
console.log(errs.join('\n')||'ok');await b.close()})();
