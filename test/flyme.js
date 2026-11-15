// 親自試飛：只用真觸控，記錄坡度、航向、俯仰、高度
const {open}=require('./lib');
(async()=>{const {b,p,errs}=await open({viewport:{width:844,height:390},hasTouch:true,isMobile:true});await p.waitForFunction(()=>window.__G&&__G.PARTS,{timeout:30000});
const cdp=await p.context().newCDPSession(p);const T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
const st=()=>p.evaluate(()=>{const P=__G.P,V=P.pos.constructor;const r=new V(1,0,0).applyQuaternion(P.q),u=new V(0,1,0).applyQuaternion(P.q),f=new V(0,0,-1).applyQuaternion(P.q);
  return{bank:Math.round(Math.atan2(-r.y,u.y)*57.3),hdg:Math.round(Math.atan2(P.vel.x,-P.vel.z)*57.3),pitch:Math.round(Math.asin(f.y)*57.3),alt:P.pos.y|0,kt:P.V*1.944|0,g:+P.g.toFixed(1)}});
const reset=()=>p.evaluate(()=>{const G=__G,P=G.P;G.start('free');P.pos.set(0,1500,-1500);P.vel.set(0,0,-230);P.q.set(0,0,0,1);P.aim.set(0,0,-1);P.thr=P.thrAct=.8});
const log=async(label,ms)=>{const out=[];const t0=Date.now();while(Date.now()-t0<ms){out.push(await st());await p.waitForTimeout(200)}console.log(label);console.log(' ',out.map(o=>`坡${o.bank} 向${o.hdg} 仰${o.pitch} 高${o.alt}`).join(' | '))};
// 1 右手往右拖 150px（約 0.6 秒），手指留著
await reset();await p.waitForTimeout(300);
await T('touchStart',[{x:560,y:200,id:1}]);for(let i=1;i<=10;i++){await T('touchMove',[{x:560+15*i,y:200,id:1}]);await p.waitForTimeout(60)}
await log('1 往右拖 150px 後停住',4000);await T('touchEnd',[]);
// 2 往下拖 60px（想稍微俯衝）
await reset();await p.waitForTimeout(300);
await T('touchStart',[{x:600,y:180,id:1}]);for(let i=1;i<=6;i++){await T('touchMove',[{x:600,y:180+10*i,id:1}]);await p.waitForTimeout(60)}await T('touchEnd',[]);
await log('2 往下拖 60px',4000);
// 3 往右拖很大（想急轉 180 度）
await reset();await p.waitForTimeout(300);
await T('touchStart',[{x:470,y:200,id:1}]);for(let i=1;i<=12;i++){await T('touchMove',[{x:470+30*i,y:200,id:1}]);await p.waitForTimeout(50)}await T('touchEnd',[]);
await T('touchStart',[{x:470,y:200,id:1}]);for(let i=1;i<=12;i++){await T('touchMove',[{x:470+30*i,y:200,id:1}]);await p.waitForTimeout(50)}await T('touchEnd',[]);
await log('3 往右連拖兩次各 360px',5000);
// 5 往下拖 220px（大角度俯衝）
await reset();await p.waitForTimeout(300);await p.evaluate(()=>{__G.P.pos.y=3000});
await T('touchStart',[{x:600,y:80,id:1}]);for(let i=1;i<=11;i++){await T('touchMove',[{x:600,y:80+20*i,id:1}]);await p.waitForTimeout(50)}await T('touchEnd',[]);
await log('5 往下拖 220px',3000);
// 6 往上拖 220px（大角度爬升）
await reset();await p.waitForTimeout(300);
await T('touchStart',[{x:520,y:300,id:1}]);for(let i=1;i<=11;i++){await T('touchMove',[{x:520,y:300-20*i,id:1}]);await p.waitForTimeout(50)}await T('touchEnd',[]);
await log('6 往上拖 220px',3000);
// 4 搖桿往右推 1 秒再放
await reset();await p.waitForTimeout(300);
await T('touchStart',[{x:200,y:220,id:2}]);await T('touchMove',[{x:260,y:220,id:2}]);await log('4 搖桿往右推（推住）',1200);await T('touchEnd',[]);await log('  放開後',2500);
console.log(errs.join('|')||'no errors');await b.close()})();
