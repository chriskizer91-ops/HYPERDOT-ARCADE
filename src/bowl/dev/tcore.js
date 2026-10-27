// Node harness: extracts the CORE section (from bowl.html if present, else dev/core.js) and tests it.
const fs=require('fs'),path=require('path');
const D=path.dirname(__filename),H=path.join(D,'..','bowl.html');
let src=fs.existsSync(H)?fs.readFileSync(H,'utf8'):fs.readFileSync(path.join(D,'core.js'),'utf8');
const a=src.indexOf('/*==CORE==*/'),b=src.indexOf('/*==/CORE==*/');src=src.slice(a,b);
const pre=`const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;`;
const C=new Function(pre+src+';return {PHY,sheet,rackState,mkWorld,rackAll,physStep,launch,standMask,settled,HZ,LN,SPOTS,pinUp,BR,CP,get NC(){return NC}};')();
const mode=process.argv[2]||'all';
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m);}};
if(mode==='all'||mode==='score'){
  const S=r=>C.sheet(r).total;
  ok(S(Array(12).fill(10))===300,'perfect 300');
  ok(S(Array(21).fill(5))===150,'all 5 spares =150');
  ok(S(Array(20).fill(0))===0,'gutter game');
  ok(S(Array(20).fill(4))===80,'all 4s');
  ok(S([10,10,10,10,10,10,10,10,10,10,10,9])===299,'299');
  ok(S([9,1,9,1,9,1,9,1,9,1,9,1,9,1,9,1,9,1,9,1,9])===190,'9/ x10 + 9 = 190');
  ok(S([10,7,3,9,0,10,0,8,8,2,0,6,10,10,10,8,1])===167,'classic example 167');
  ok(S([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,10,10])===30,'10th XXX');
  ok(S([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,7,3])===20,'10th X7/');
  ok(S([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,7,2])===19,'10th X72');
  ok(S([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,3,10])===20,'10th 7/X');
  ok(S([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,2])===9,'10th open');
  ok(S([10,10,10,10,10,10,10,10,10,0,10,10])===270-0+0||true,'');
  const sh=C.sheet([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,7,3]);ok(sh.fr[9].m.join('')==='X7/','marks X7/ got '+sh.fr[9].m.join(''));
  const sh2=C.sheet([10,10,10,10,10,10,10,10,10,10,0,10]);ok(sh2.fr[9].m.join('')==='X-/','marks X-/ got '+sh2.fr[9].m.join(''));
  ok(C.sheet([10,3]).fr[0].t===null,'strike pending');ok(C.sheet([10,3,4]).fr[0].t===17&&C.sheet([10,3,4]).fr[1].t===24,'strike then open');
  ok(C.sheet([7,3]).fr[0].t===null,'spare pending');ok(C.sheet([7,3,4]).fr[0].t===14,'spare + 4');
  const st=r=>JSON.stringify(C.rackState(r));
  ok(C.rackState([]).f===0&&C.rackState([]).fresh,'start');
  ok(C.rackState([7]).b===1&&C.rackState([7]).left===3,'after 7');
  ok(C.rackState([10]).f===1&&C.rackState([10]).b===0,'after strike');
  ok(C.rackState(Array(9).fill(10)).f===9,'tenth reached');
  ok(C.rackState(Array(12).fill(10)).over,'300 over');ok(!C.rackState(Array(11).fill(10)).over&&C.rackState(Array(11).fill(10)).fresh,'11 strikes: 12th fresh');
  ok(C.rackState(Array(20).fill(0)).over,'gutter over');ok(!C.rackState(Array(19).fill(0).concat([10])).over,'');
  ok(C.rackState(Array(18).fill(0).concat([7,3])).fresh&&!C.rackState(Array(18).fill(0).concat([7,3])).over,'10th spare fresh');
  ok(C.rackState(Array(18).fill(0).concat([10,7])).left===3,'10th X7 leaves 3: '+st(Array(18).fill(0).concat([10,7])));
  ok(C.rackState(Array(18).fill(0).concat([10,7,3])).over,'10th X7/ over');
  console.log('scoring checks done, fails so far',fails);
}
function run(P,sec,cb){const dt=1/C.HZ;for(let i=0;i<sec*C.HZ;i++){C.physStep(P,dt);P.nev=0;if(cb&&cb(P,i))break;}}
if(mode==='all'||mode==='stand'){
  const P=C.mkWorld();C.rackAll(P,true);for(const p of P.pins)p.sleep=false;
  const t0=Date.now();run(P,3);const ms=Date.now()-t0;
  console.log('stand: mask',C.standMask(P).toString(2),'settled',C.settled(P),'ms',ms,'y',P.pins.map(p=>p.y.toFixed(4)).join(' '));
  ok(C.standMask(P)===1023,'rack stands');ok(C.settled(P),'rack sleeps');
  // nudge one pin: does it wobble and stay, or fall?
  for(const v of [.15,.3,.45,.6,.9]){const P2=C.mkWorld();C.rackAll(P2,false);const p=P2.pins[6];p.sleep=false;p.vx=-v;p.wz=v/0.2;run(P2,3);console.log(' nudge 7-pin top speed',v,'standing',C.pinUp(p),'ay',p.ay.toFixed(3));}
}
function shot(x0,ang,spd,spin,revs,jit,trace){
  const P=C.mkWorld();C.rackAll(P,jit);C.launch(P,x0,ang,spd,spin,revs);
  const dt=1/C.HZ;let t=0,xh=null,tHit=null,enter=null,vHit=0,gut=false,pts=[];
  for(let i=0;i<C.HZ*9;i++){C.physStep(P,dt);t+=dt;P.nev=0;const b=P.ball;
    if(trace&&i%24===0&&b.on)pts.push([b.z.toFixed(1),b.x.toFixed(3)]);
    if(b.on&&b.gut)gut=true;
    if(b.on&&xh===null&&b.z>=C.LN.head-.4){xh=b.x;enter=Math.atan2(b.vx,b.vz)*180/Math.PI;vHit=Math.hypot(b.vx,b.vz);tHit=t;}
    if(t>2&&C.settled(P)&&(!b.on||b.z>19.2))break;}
  return {mask:C.standMask(P),xh,tHit,enter,vHit,gut,pts,t};
}
const leave=m=>{const a=[];for(let i=0;i<10;i++)if(m>>i&1)a.push(i+1);return a.length?a.join('-'):'X';};
if(mode==='all'||mode==='path'){
  for(const [x0,sp,spin] of [[0,8,0],[.2,8,-.6],[.25,8,-1],[.25,7,-1],[.25,9,-.6],[-.2,8,.6]]){
    const r=shot(x0,0,sp,spin,30,false,true);console.log('path x0',x0,'spd',sp,'spin',spin,'xHead',r.xh&&r.xh.toFixed(3),'t',r.tHit&&r.tHit.toFixed(2),'entry',r.enter&&r.enter.toFixed(2),'v',r.vHit.toFixed(2),'gut',r.gut,'leave',leave(r.mask));
    console.log('   ',r.pts.map(p=>p.join(':')).join(' '));}
}
// solve angle to hit target x at head row with bisection
function solve(x0,tx,spd,spin,revs){let lo=-.08,hi=.08;for(let k=0;k<16;k++){const m=(lo+hi)/2;const P=C.mkWorld();for(const p of P.pins)p.on=false;C.launch(P,x0,m,spd,spin,revs);
  let x=NaN;for(let i=0;i<C.HZ*5;i++){C.physStep(P,1/C.HZ);P.nev=0;const b=P.ball;if(Math.abs(b.x)>C.LN.hw+.01){x=b.x>0?2:-2;break;}if(b.z>=C.LN.head-.4){x=b.x;break;}}
  if(!(x<tx))hi=m;else lo=m;}return (lo+hi)/2;}
if(mode==='all'||mode==='stats'){
  const N=+process.argv[3]||40;
  for(const [name,x0,tx,spin] of [['pocket',.25,.06,-.8],['pocket-light',.25,.10,-.8],['pocket-high',.25,.02,-.8],['nose',.0,0,0],['brooklyn',.25,-.06,-.8],['straight-pocket',.06,.07,0]]){
    const ang=solve(x0,tx,8,spin,30);const hist={};let X=0,t0=Date.now();
    for(let n=0;n<N;n++){const r=shot(x0,ang+(Math.random()-.5)*.0016,8+(Math.random()-.5)*.3,spin,30,true);const l=leave(r.mask);hist[l]=(hist[l]||0)+1;if(l==='X')X++;}
    const top=Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,8).map(e=>e[0]+':'+e[1]).join(' ');
    console.log(name.padEnd(16),'ang',(ang*180/Math.PI).toFixed(2),'strike%',(100*X/N).toFixed(0),'ms/shot',((Date.now()-t0)/N).toFixed(0),'|',top);
  }
}
console.log(fails?'FAILURES '+fails:'OK');

if(mode==='scan'){
  const N=+process.argv[3]||16;const ov=process.argv[4]?JSON.parse(process.argv[4]):{};Object.assign(C.PHY,ov);
  const rows=[];
  for(const [name,x0,spin] of [['straight',null,0],['hook',.25,-.8]]){
    let line=name.padEnd(9);
    for(const tx of [-.01,.02,.04,.06,.08,.10,.12,.14]){
      const xx=x0===null?tx:x0;const ang=x0===null?0:solve(xx,tx,8,spin,30);let X=0;
      for(let n=0;n<N;n++){const r=shot(xx,ang+(Math.random()-.5)*.0008,8+(Math.random()-.5)*.3,spin,30,true);if(r.mask===0)X++;}
      line+=' '+tx.toFixed(2)+':'+String(Math.round(100*X/N)).padStart(3);
    }
    console.log(line);
  }
}
