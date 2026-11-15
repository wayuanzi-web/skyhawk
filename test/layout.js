const {open}=require('./lib');(async()=>{for(const [w,h] of [[844,390],[667,375],[932,430]]){const {b,p,errs}=await open({viewport:{width:w,height:h},hasTouch:true,isMobile:true});await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
 await p.evaluate(()=>{const G=__G;G.start('mission');G.M.paused=true;G.P.thr=1;G.run(.5)});await p.evaluate(()=>{__G.M.paused=false});await p.waitForTimeout(500);
 const r=await p.evaluate(()=>{const ids=['bFire','bBomb','bMsl','bFlr','bView','bBrake','bGear','bFlap','bHook','bAT','bPause','thr'];const R=ids.map(i=>{const b=document.getElementById(i).getBoundingClientRect();return [i,b.x|0,b.y|0,b.width|0,b.height|0]});
   let ov=[];for(let i=0;i<R.length;i++)for(let j=i+1;j<R.length;j++){const a=R[i],c=R[j];if(a[1]<c[1]+c[3]&&c[1]<a[1]+a[3]&&a[2]<c[2]+c[4]&&c[2]<a[2]+a[4])ov.push(a[0]+'×'+c[0])}return {R,ov}});
 console.log(w+'x'+h,'overlaps:',r.ov.join(',')||'none','minH:',Math.min(...r.R.map(x=>x[4])));await p.screenshot({path:`test/lay_${w}.png`});
 // 雙擊回正（真觸控）
 await p.evaluate(()=>{__G.P.aim.set(.8,.5,.2).normalize()});const cdp=await p.context().newCDPSession(p);
 for(let k=0;k<2;k++){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:w*.7,y:h*.5,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(60)}
 console.log(' recenter aim.x',await p.evaluate(()=>__G.P.aim.x.toFixed(2)));
 console.log(' ',errs.join('|')||'no errors');await b.close()}})();
