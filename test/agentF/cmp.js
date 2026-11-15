const a=require('./res_base.json'),b=require('./res_exp.json');const B=Object.fromEntries(b.map(r=>[r.name,r.m]));
const K=['maxBank','finBank','overshoot','maxRR','gEarly','maxG','minG','rev','tLvl','maxCam','maxCRR','maxScr','dHdg','dAlt','dead'];
console.log('情境 | '+K.join(' | '));for(const r of a){const m=r.m,n=B[r.name]||{};console.log(r.name+' | '+K.map(k=>`${m[k]}→${n[k]}`).join(' | '))}
