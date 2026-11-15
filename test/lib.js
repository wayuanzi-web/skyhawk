const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
const root=path.join(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.glb':'model/gltf-binary','.json':'application/json'};
exports.open=async(opts={},page='index.html')=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const ctx=await b.newContext(Object.assign({viewport:{width:844,height:390}},opts));await ctx.addInitScript(t=>{try{if(!t)localStorage.setItem('skyhawk_tut','1');localStorage.setItem('skyhawk_qa','0')}catch(e){}},!!process.env.TUT);const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
 await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',r=>{const f=path.join(root,'node_modules/three',r.request().url().split('three@0.160.0/')[1]);r.fulfill({path:f,contentType:'application/javascript'})});
 await p.route('http://sky.test/**',r=>{const f=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname));if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({path:f,contentType:types[path.extname(f)]||'application/octet-stream'})});
 await p.goto('http://sky.test/'+((process.env.DIST&&page==='index.html')?'dist/index.html':page));return{b,p,errs}};
