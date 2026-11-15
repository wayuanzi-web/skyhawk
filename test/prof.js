const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:path.join(__dirname,'../node_modules/three/build/three.module.min.js'),contentType:'application/javascript'}));
await p.goto('file://'+path.join(__dirname,'../index.html'));await p.waitForFunction(()=>window.__G);
console.log(await p.evaluate(()=>{const G=__G,o=[];for(let u=19500;u<=24600;u+=250)o.push(u+':'+(G.groundH(G.xc(u),-u)|0));return o.join(' ')+' tgt '+JSON.stringify(G.tgtPos)}));await b.close()})();
