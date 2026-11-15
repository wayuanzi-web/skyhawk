// 滾轉率量測：搖桿全右 1.5 秒；指向圈 90° 右轉；右轉中反向
const {boot}=require('./h');(async()=>{const H=await boot();const {p,reset,T,run,drag}=H;
const peak=()=>p.evaluate(()=>{let m=0,t0=null;const P=__G.P,V=P.pos.constructor;for(let i=0;i<240;i++){__G.simStep(__G.DT);const r=Math.abs(P.w.z)*57.3;if(r>m)m=r;const rr=new V(1,0,0).applyQuaternion(P.q),u=new V(0,1,0).applyQuaternion(P.q),b=Math.abs(Math.atan2(-rr.y,u.y))*57.3;if(t0===null&&b>=60)t0=(i+1)*__G.DT}return `最大滾轉率 ${m|0}°/s，坡度到 60° 用 ${t0?t0.toFixed(2):'>2'} 秒`});
for(const kt of [450,300]){await reset({v:kt/1.944});await run(.2);await T('touchStart',[{x:200,y:220,id:2}]);await T('touchMove',[{x:300,y:220,id:2}]);console.log(`${kt}kt 搖桿全右：`,await peak());await T('touchEnd',[]);
 await reset({v:kt/1.944});await run(.2);await drag(470,200,330,0,12,1,true);console.log(`${kt}kt 指向圈右拖 330px：`,await peak())}
await H.b.close()})();
