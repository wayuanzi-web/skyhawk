const {open}=require('./lib');(async()=>{const {b,p,errs}=await open({viewport:{width:844,height:390},hasTouch:true,isMobile:true});await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
await p.evaluate(()=>{const G=__G;G.start('free');window._ev=[];document.getElementById('pad').addEventListener('pointerdown',e=>_ev.push(['pd',e.pointerType,performance.now()|0,e.clientX|0]),true);});
await p.evaluate(()=>{__G.P.aim.set(.8,.5,.2).normalize()});const cdp=await p.context().newCDPSession(p);
for(let k=0;k<2;k++){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:600,y:200,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(60)}
console.log(await p.evaluate(()=>JSON.stringify({ev:_ev,aim:__G.P.aim.toArray().map(v=>+v.toFixed(2)),last:__G.inp.lastTap|0})));await b.close()})();
