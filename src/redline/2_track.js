/* =====================================================================================
   8. THE TRACK: segments, themes, circuits, racing line and speed profile
   The road is a list of SEG-long segments; each knows its curve (the heading change, in the
   units the segment-road projection needs), its height, and what stands beside it.
   ===================================================================================== */
const SEG=200,ROADW=2000,CAMH=1000,DRAW=210,PLAYERZ=CAMH*.84;
const VTOP=SEG*62;                           /* top speed: 62 segments a second, shown as 300 km/h */
const KMH=300/VTOP;
let camDepth=1/Math.tan(50*PI/180);
const THEMES=[
  {name:'NEON CITY',sky:['#05011a','#2b0a52','#ff3d8f'],fog:'#2a0a3a',grass:['#0a0516','#0d071c'],rumble:['#ff2f9a','#f4f4ff'],kerb:['#ff2a4a','#f4f4ff'],road:['#17131f','#1a1623'],lane:'#e8e4ff',edge:'#2fe6ff',
    far:'city',props:'city',weather:'rain',sun:'#ffd23f',wall:['#22203a','#2c2848'],wallTop:'#2fe6ff',night:1,crowd:['#ff2f9a','#2fe6ff','#ffd23f','#ffffff']},
  {name:'SUNSET COAST',sky:['#2a0b3e','#ff4f6a','#ffc45a'],fog:'#ff8a5a',grass:['#d9a25e','#cf9852'],rumble:['#ffffff','#ff3b3b'],kerb:['#ff3b3b','#ffffff'],road:['#4a3d48','#463943'],lane:'#fff4e0',edge:'#ffe7c0',
    far:'sea',props:'coast',weather:'',sun:'#ffe14d',wall:['#c87a52','#b86e48'],wallTop:'#ffffff',night:0,crowd:['#ff3b3b','#3a7bff','#ffffff','#ffd23f']},
  {name:'HYPER TUNNEL',sky:['#000000','#05030c','#0a0618'],fog:'#05030c',grass:['#0b0814','#0b0814'],rumble:['#2fe6ff','#0b3a4a'],kerb:['#2fe6ff','#ff2f9a'],road:['#121018','#15121c'],lane:'#2fe6ff',edge:'#ff2f9a',
    far:'none',props:'none',weather:'',wall:['#120e1c','#2a2238'],wallTop:'#ff2f9a',night:1,crowd:['#2fe6ff','#ff2f9a','#ffffff','#7dff6a']},
  {name:'AURORA PEAKS',sky:['#01030f','#06213a','#0f4a5c'],fog:'#a8c4d8',grass:['#e2ebf4','#d4dfeb'],rumble:['#2fe6ff','#ffffff'],kerb:['#ff3b3b','#ffffff'],road:['#2a3440','#27313c'],lane:'#ffffff',edge:'#9ff1ff',
    far:'peaks',props:'alpine',weather:'snow',sun:'#f0f6ff',wall:['#3a4a5c','#46566a'],wallTop:'#9ff1ff',night:1,crowd:['#ff3b3b','#2fe6ff','#ffffff','#ffd23f']},
  {name:'MAGMA RIDGE',sky:['#0a0102','#3a0606','#ff4a12'],fog:'#5a1206',grass:['#1a0a08','#22100c'],rumble:['#ff6a12','#2a0a06'],kerb:['#ff6a12','#ffd23f'],road:['#1d1514','#211816'],lane:'#ffb36a',edge:'#ff6a12',
    far:'volcano',props:'magma',weather:'embers',sun:'#ff8a3a',wall:['#2a1210','#3a1a14'],wallTop:'#ff6a12',night:1,crowd:['#ff6a12','#ffd23f','#ffffff','#ff2a4a'],lava:1}
];
/* the five Grand Prix circuits, drawn as turtle plans (see circuitGeom) */
const CIRCUITS=[
  {id:'neon',name:'NEON CITY',sub:'STREET CIRCUIT',theme:0,laps:3,walls:'street',wallX:1.42,grip:.96,
   plan:[{s:360},{t:90,n:52,nm:'TOWER TURN'},{s:220},{t:-50,n:38,nm:'NEON CHICANE'},{t:50,n:38},{s:240,tun:1,h:3},{t:90,n:56,h:2},{s:180},{t:25,n:34},{s:120},{t:-25,n:34},{s:200,h:0},{t:160,n:104,nm:'HARBOUR HAIRPIN'},{s:160},{t:-70,n:62},{s:300,h:4},{t:45,n:46},{s:80},{t:-45,n:46,h:2},{s:120,h:0},{t:90,n:58,nm:'LAST CORNER'}]},
  {id:'coast',name:'SUNSET COAST',sub:'CLIFF ROAD',theme:1,laps:3,walls:'open',wallX:2.5,grip:1,
   plan:[{s:320},{t:60,n:120},{s:160,h:8},{t:-40,n:80,h:12},{s:140,h:18},{t:100,n:130,h:24,nm:'CLIFF SWEEPER'},{s:200,h:30},{t:30,n:60,h:28},{s:160,h:20},{t:150,n:112,h:14,nm:'LIGHTHOUSE'},{s:180,h:8},{t:-60,n:80,h:4},{s:160,h:0},{t:40,n:80,h:-2},{s:200,h:0},{t:80,n:90,nm:'BEACH TURN'}]},
  {id:'tunnel',name:'HYPER TUNNEL',sub:'UNDERGROUND RING',theme:2,laps:3,walls:'tunnel',wallX:1.3,grip:1,tunnel:1,
   plan:[{s:300},{t:90,n:56,nm:'PORTAL'},{s:120},{t:45,n:40},{t:-90,n:64,nm:'THE SNAKE'},{t:45,n:40},{s:220},{t:120,n:92},{s:160},{t:-60,n:54},{t:60,n:54},{s:200},{t:60,n:56},{s:140},{t:-30,n:36,nm:'ZIGZAG'},{t:30,n:36},{s:160},{t:90,n:64}]},
  {id:'peaks',name:'AURORA PEAKS',sub:'MOUNTAIN PASS',theme:3,laps:3,walls:'open',wallX:2.3,grip:.93,
   plan:[{s:260},{t:70,n:100,h:6},{s:160,h:16},{t:-120,n:104,h:26,nm:'GLACIER BEND'},{s:140,h:38},{t:170,n:112,h:46,nm:'SUMMIT HAIRPIN'},{s:200,h:36},{t:-50,n:70,h:30},{t:110,n:100,h:22},{s:220,h:14},{t:60,n:84,h:8},{s:180,h:4},{t:60,n:84,h:2},{s:140,h:0},{t:60,n:84}]},
  {id:'magma',name:'MAGMA RIDGE',sub:'VOLCANO ROAD',theme:4,laps:3,walls:'open',wallX:2.2,grip:.98,
   plan:[{s:380},{t:45,n:80,h:10},{s:200,h:24},{t:45,n:80,h:12},{s:160,h:4},{t:-70,n:80,h:16},{t:140,n:120,h:26,nm:'CALDERA'},{s:260,h:10},{t:60,n:90,h:20},{s:160,h:8},{t:-50,n:60,h:4},{t:120,n:110,h:14,nm:'LAVA FALLS'},{s:200,h:4},{t:70,n:90,h:0}]}
];
/* ---------- circuit geometry from a turtle plan ----------
   pieces: {s:n} a straight of n segments, {t:deg,n} a corner turning deg (right positive) over n
   segments with eased entry and exit. Optional: h (height at its end, in segments), tun (tunnel), nm. */
function planHeadings(plan,len){
  const dth=[],piece=[];
  plan.forEach((p,pi)=>{
    if(p.s!=null){const n=Math.max(8,Math.round(len[pi]));for(let k=0;k<n;k++){dth.push(0);piece.push(pi);}}
    else{const n=p.n,A=p.t*PI/180,e=Math.max(1,Math.round(n*(p.e!=null?p.e:.3)));
      /* trapezoid: ramp in, hold, ramp out: the curvature of a real road corner */
      const w=[];for(let k=0;k<n;k++)w.push(Math.min(1,(k+.5)/e,(n-k-.5)/e));
      const sw=w.reduce((a,b)=>a+b,0);for(let k=0;k<n;k++){dth.push(A*w[k]/sw);piece.push(pi);}}
  });
  return {dth,piece};
}
function walk(dth){let x=0,z=0,h=0;const pts=[];for(let i=0;i<dth.length;i++){pts.push([x,z]);h+=dth[i];x+=Math.sin(h-dth[i]*.5);z+=Math.cos(h-dth[i]*.5);}return {pts,end:[x,z]};}
/* closing the loop: headings depend only on the corners, so the end point is linear in the straights'
   lengths. Find the lengths nearest the plan's (weighted least squares) that close it exactly, with every
   straight at least 30 segments (an active set: pin any that go short and solve again). The start
   straight is weighted heavily so the grid always has room. */
function closeStraights(plan){
  const nom=plan.map(p=>p.s!=null?p.s:0),len=nom.slice(),S=plan.map((p,i)=>p.s!=null?i:-1).filter(i=>i>=0),wt=i=>i===0?8:1;
  const H0=planHeadings(plan,nom.map(()=>0)),dir={};
  {let h=0,k=0;plan.forEach((p,pi)=>{if(p.s!=null)dir[pi]=[Math.sin(h),Math.cos(h)];while(k<H0.dth.length&&H0.piece[k]===pi){h+=H0.dth[k];k++;}});}
  const C=walk(H0.dth).end,base=S.reduce((a,i)=>[a[0]+dir[i][0]*8,a[1]+dir[i][1]*8],[0,0]),pinned=new Set();
  for(let it=0;it<20;it++){
    const fr=S.filter(i=>!pinned.has(i)),r=[-C[0]+base[0],-C[1]+base[1]];let a00=0,a01=0,a11=0;
    for(const i of S){const l=pinned.has(i)?len[i]:nom[i];r[0]-=dir[i][0]*l;r[1]-=dir[i][1]*l;}
    for(const i of fr){const w=1/wt(i);a00+=dir[i][0]*dir[i][0]*w;a01+=dir[i][0]*dir[i][1]*w;a11+=dir[i][1]*dir[i][1]*w;}
    const det=a00*a11-a01*a01;if(Math.abs(det)<1e-6)break;const l0=(a11*r[0]-a01*r[1])/det,l1=(-a01*r[0]+a00*r[1])/det;
    let bad=false;for(const i of fr){len[i]=nom[i]+(dir[i][0]*l0+dir[i][1]*l1)/wt(i);if(len[i]<30){pinned.add(i);len[i]=30;bad=true;}}
    if(!bad)break;
  }
  return len;
}
/* ---------- the racing line and the speed it can be driven at ----------
   Line: for every real corner, a swing to the outside before it, the inside at its apex (a little
   past the middle, a late apex) and the outside again on the way out; the bumps are summed and
   blurred, so an S-bend or a chicane cancels into the straightest path through it, as drivers take it.
   Speed: each corner's grip limit, then a backward pass so the car can brake down in time.
   Both are shared by the AI and the line overlay. */
const GRIPK=1.6,LINEB=.28,BRAKEA=.55;     /* corner speed at curve 1.6 = top speed; on the line 28% less demand; braking .55 top/s */
function blurC(a,sig){const N=a.length,r=Math.ceil(sig*2.5),k=[];let s=0;for(let d=-r;d<=r;d++){const w=Math.exp(-d*d/(2*sig*sig));k.push(w);s+=w;}
  const o=new Float32Array(N);for(let i=0;i<N;i++){let v=0;for(let d=-r;d<=r;d++)v+=a[(i+d+N)%N]*k[d+r];o[i]=v/s;}return o;}
function speedProfile(curve,grip){
  const N=curve.length,v=new Float32Array(N),ds=SEG/VTOP;
  for(let i=0;i<N;i++){const c=Math.abs(curve[i]);v[i]=Math.min(1,Math.sqrt(GRIPK*grip/(Math.max(1e-3,c)*(1-LINEB))));}
  for(let it=0;it<2;it++)for(let i=N-1;i>=0;i--){const nx=v[(i+1)%N];v[i]=Math.min(v[i],Math.sqrt(nx*nx+2*BRAKEA*ds));}
  return v;
}
function racingLine(N,corners){
  const t=new Float32Array(N),bump=(c,amp,sig)=>{const r=Math.ceil(sig*2.5);for(let d=-r;d<=r;d++){const i=((Math.round(c)+d)%N+N)%N;t[i]+=amp*Math.exp(-d*d/(2*sig*sig));}};
  for(const c of corners){if(c.deg<18)continue;const k=clamp((1-c.v)/.3,.35,1),sg=Math.max(8,c.n*.32);
    bump(c.i+c.n*.58,c.dir*.78*k,sg);bump(c.i-26,-c.dir*.66*k,20);bump(c.i+c.n+26,-c.dir*.62*k,22);}
  const sm=blurC(t,6);for(let i=0;i<N;i++)sm[i]=clamp(sm[i],-.74,.74);return sm;
}
/* ---------- build a track (a circuit, or the highway) into segments ---------- */
let TR=null;
function mkSeg(i,curve,y1,y2,st){return {i,curve,p1:{w:{y:y1,z:i*SEG},c:{},s:{}},p2:{w:{y:y2,z:(i+1)*SEG},c:{},s:{}},st,spr:[],cars:[],tun:0,kerb:0,line:0,vlim:1,cp:0,grid:-1,board:0,fogK:0,clip:0,vis:false};}
function buildCircuit(ci){
  const C=CIRCUITS[ci],len=closeStraights(C.plan),H=planHeadings(C.plan,len),N=H.dth.length,Wk=walk(H.dth);
  const curve=new Float32Array(N),y=new Float32Array(N);for(let i=0;i<N;i++)curve[i]=H.dth[i]*SEG;
  let i0=0,h0=0;C.plan.forEach((p,pi)=>{let i1=i0;while(i1<N&&H.piece[i1]===pi)i1++;const h1=p.h!=null?p.h:h0;
    for(let i=i0;i<i1;i++){const t=(i-i0)/Math.max(1,i1-i0);y[i]=(h0+(h1-h0)*smooth(t))*SEG*1.3;}i0=i1;h0=h1;});
  const VL=speedProfile(curve,C.grip),segs=[];
  for(let i=0;i<N;i++){const s=mkSeg(i,curve[i],y[i],y[(i+1)%N],C.theme);s.tun=C.tunnel||C.plan[H.piece[i]].tun?1:0;s.vlim=VL[i];s.kerb=Math.abs(curve[i])>1.6?1:0;s.piece=H.piece[i];segs.push(s);}
  /* the start line a little past halfway down the first straight, the grid behind it */
  const startI=Math.round(len[0]*.62);segs[startI].cp=2;
  for(let k=0;k<8;k++){const s=segs[(startI-8-k*9+N)%N];s.grid=k;}
  /* the map: normalised to a unit box */
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const [x,z] of Wk.pts){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
  const sc=1/Math.max(x1-x0,z1-z0),map=Wk.pts.map(([x,z])=>[(x-x0)*sc,(z1-z)*sc]),mw=(x1-x0)*sc,mh=(z1-z0)*sc;
  /* corners: name the big ones for the intro card and the pace notes */
  const corners=[];C.plan.forEach((p,pi)=>{if(p.t==null)return;const i=H.piece.indexOf(pi);let mn=1;for(let k=i-60;k<i+p.n;k++)mn=Math.min(mn,VL[(k+N)%N]);corners.push({i,n:p.n,dir:Math.sign(p.t),deg:Math.abs(p.t),nm:p.nm||'',v:mn});});
  const LN=racingLine(N,corners);for(let i=0;i<N;i++)segs[i].line=LN[i];
  TR={kind:'circuit',ci,C,segs,N,L:N*SEG,startI,map,mw,mh,corners,laps:C.laps,wallX:C.wallX,grip:C.grip,walls:C.walls,theme:C.theme};
  dressCircuit();
  return TR;
}
/* ---------- dressing: kerbs, boards, grandstands, gantry, tyre walls, marshals, scenery ---------- */
function dressCircuit(){
  const T=TR,N=T.N,th=THEMES[T.theme],R=mulberry(31+T.ci*7),rnd=(a,b)=>a+R()*(b-a);      /* seeded: every circuit is dressed the same way each time */
  const add=(s,t,x,o)=>s.spr.push(Object.assign({t,x,seed:R()},o||{}));
  for(const s of T.segs){
    const i=s.i;
    if(s.tun){if(i%3===0)add(s,'tlight',0);continue;}
    if(T.walls==='street'){if(i%9===0){add(s,'lamp',-1.62);add(s,'lamp',1.62,{flip:1});}if(i%41===7)add(s,'neon',(R()<.5?-1:1)*rnd(1.9,2.6));if(i%67===30)add(s,'billboard',(R()<.5?-1:1)*rnd(2.2,2.6));if(i%7===3)add(s,'tower',(R()<.5?-1:1)*rnd(3.2,6));continue;}
    if(th.props==='coast'){if(i%6===0&&R()<.8)add(s,'palm',(R()<.5?-1:1)*rnd(2.7,3.6));if(i%17===5)add(s,'rock',(R()<.5?-1:1)*rnd(2.8,4));if(i%53===20)add(s,'billboard',(R()<.5?-1:1)*rnd(2.8,3.2));if(i%11===0){add(s,'post',-2.45);add(s,'post',2.45);}}
    else if(th.props==='alpine'){if(i%3===0)add(s,'pine',(R()<.5?-1:1)*rnd(2.5,5));if(i%4===2&&R()<.6)add(s,'pine',(R()<.5?-1:1)*rnd(2.6,3.4));if(i%29===9)add(s,'rock',(R()<.5?-1:1)*rnd(2.6,3.5));if(i%10===0){add(s,'post',-2.3);add(s,'post',2.3);}}
    else if(th.props==='magma'){if(i%5===0&&R()<.8)add(s,'rock',(R()<.5?-1:1)*rnd(2.5,3.8));if(i%14===3)add(s,'vent',(R()<.5?-1:1)*rnd(2.6,3.4));if(i%10===0){add(s,'torch',-2.25);add(s,'torch',2.25);}}
  }
  /* braking boards counting down to the braking point of every corner that needs real braking, on the outside */
  for(const c of T.corners){if(c.v>.8)continue;let b=c.i;for(let k=0;k<200;k++){const j=(c.i-k+N)%N;if(T.segs[j].vlim>.985){b=j;break;}}
    const side=-c.dir*(T.walls==='street'?1.55:T.walls==='tunnel'?1.22:2.0);
    for(const [d,lab] of [[-33,3],[-22,2],[-11,1]]){const s=T.segs[(b+d+N)%N];if(!s.tun||T.walls==='tunnel')s.spr.push({t:'board',x:side,n:lab,seed:0});}      /* brake at the last board */
    if(T.walls==='open'&&c.v<.66)for(let k=0;k<c.n;k+=3){const s=T.segs[(c.i+k)%N];s.spr.push({t:'tyres',x:-c.dir*2.35,seed:R()});}
  }
  /* the start: gantry and lights over the line, grandstands right, pit wall left, flag marshal */
  const S0=T.startI;
  for(let k=-50;k<70;k++){const s=T.segs[(S0+k+N)%N];s.spr=s.spr.filter(p=>p.t==='tlight');if(T.walls!=='tunnel'){if(k%5===0)add(s,'stand',T.walls==='street'?1.75:2.7);if(k%4===0)add(s,'pitwall',-1.5);}}
  T.segs[S0].spr.push({t:'gantry',x:0,seed:0});T.segs[(S0+2)%N].spr.push({t:'flagman',x:T.walls==='tunnel'?-1.25:-1.48,seed:0});
  for(let k=1;k<N;k+=260){const s=T.segs[(S0+k)%N];if(!s.tun&&Math.abs(s.curve)<.5&&Math.abs(k)>80)add(s,'marshal',T.walls==='street'?1.6:2.2);}
  /* a bridge or two across the straights */
  if(T.walls!=='tunnel'){let made=0;for(let k=140;k<N&&made<2;k+=37){const s=T.segs[(S0+k)%N];if(!s.tun&&Math.abs(s.curve)<.1&&!T.segs[(S0+k+6)%N].tun&&Math.abs(T.segs[(S0+k+6)%N].curve)<.1){s.spr=s.spr.filter(p=>Math.abs(p.x)>2.6);s.spr.push({t:'bridge',x:0,seed:R()});made++;k+=Math.round(N*.42);}}}
}
/* ---------- the highway: five themed stages end to end, three lanes, checkpoints (the classic run) ---------- */
function buildHighway(){
  const segs=[],stageStart=[],R=mulberry(7);
  const lastY=()=>segs.length?segs[segs.length-1].p2.w.y:0;
  const addSeg=(curve,y,st,tun)=>{const n=segs.length,s=mkSeg(n,curve,lastY(),y,st);s.tun=tun?1:0;s.kerb=0;segs.push(s);};
  const easeIn=(a,b,p)=>a+(b-a)*p*p,easeIO=(a,b,p)=>a+(b-a)*((-Math.cos(p*PI)/2)+.5);
  const road=(en,ho,le,cv,hill,st,tun)=>{const sy=lastY(),ey=sy+hill*SEG,tot=en+ho+le;
    for(let n=0;n<en;n++)addSeg(easeIn(0,cv,n/en),easeIO(sy,ey,n/tot),st,tun);
    for(let n=0;n<ho;n++)addSeg(cv,easeIO(sy,ey,(en+n)/tot),st,tun);
    for(let n=0;n<le;n++)addSeg(easeIO(cv,0,n/le),easeIO(sy,ey,(en+ho+n)/tot),st,tun);};
  for(let st=0;st<THEMES.length;st++){
    const th=THEMES[st],tun=st===2;stageStart.push(segs.length);road(10,40,10,0,0,st,false);segs[stageStart[st]+6].cp=1;
    const target=segs.length+1500;
    while(segs.length<target){const k=R(),dir=R()<.5?-1:1,len=(a,b)=>Math.round(a+R()*(b-a));
      const hill=tun?0:(R()<.5?0:(R()<.5?-1:1)*Math.round(10+R()*40));const tt=tun||(th.props==='city'&&R()<.12);
      if(k<.18)road(len(10,20),len(20,60),len(10,20),0,hill,st,tt);
      else if(k<.5)road(len(15,30),len(20,60),len(15,30),dir*(2+R()*2.5),hill,st,tt);
      else if(k<.72)road(len(15,25),len(30,70),len(15,25),dir*(3.5+R()*2.5),hill*.5,st,tt);
      else if(k<.9){road(15,25,15,dir*3.5,0,st,tt);road(15,25,15,-dir*3.5,0,st,tt);}
      else{road(10,10,10,0,25,st,tt);road(10,10,10,0,-25,st,tt);road(10,10,10,0,25,st,tt);road(10,10,10,0,-25,st,tt);}}
  }
  road(30,30,30,0,-lastY()/SEG,THEMES.length-1,false);
  const N=segs.length,VL=speedProfile(Float32Array.from(segs.map(s=>s.curve)),1);
  for(const s of segs){s.vlim=VL[s.i];s.line=0;}
  TR={kind:'highway',segs,N,L:N*SEG,startI:6,stageStart,laps:99,wallX:2.6,grip:1,walls:'open',theme:0,map:null,corners:[]};
  const P=mulberry(99);
  for(const s of segs){const th=THEMES[s.st],i=s.i,add=(t,x,o)=>s.spr.push(Object.assign({t,x,seed:P()},o||{}));
    if(s.tun){if(i%3===0)add('tlight',0);continue;}
    if(Math.abs(s.curve)>3.2&&i%5===0)add('chevron',s.curve>0?-1.3:1.3,{dir:s.curve>0?1:-1});
    if(th.props==='city'){if(i%9===0){add('lamp',-1.25);add('lamp',1.25,{flip:1});}if(i%23===7)add('neon',(P()<.5?-1:1)*rnd(1.7,2.6));if(i%61===30)add('billboard',(P()<.5?-1:1)*rnd(2.3,2.8));if(i%13===4&&P()<.6)add('palm',(P()<.5?-1:1)*rnd(1.5,2.2));if(i%7===3)add('tower',(P()<.5?-1:1)*rnd(3.4,6));}
    else if(th.props==='coast'){if(i%6===0&&P()<.8)add('palm',(P()<.5?-1:1)*rnd(1.4,2.6));if(i%17===5)add('rock',(P()<.5?-1:1)*rnd(1.5,3));if(i%53===20)add('billboard',(P()<.5?-1:1)*rnd(2.3,2.8));if(i%11===0){add('post',-1.15);add('post',1.15);}}
    else if(th.props==='alpine'){if(i%3===0)add('pine',(P()<.5?-1:1)*rnd(1.4,4.5));if(i%4===2&&P()<.6)add('pine',(P()<.5?-1:1)*rnd(1.6,3));if(i%12===0){add('lamp',-1.25);add('lamp',1.25,{flip:1});}if(i%29===9)add('rock',(P()<.5?-1:1)*rnd(1.6,3));}
    else if(th.props==='magma'){if(i%5===0&&P()<.8)add('rock',(P()<.5?-1:1)*rnd(1.4,3.4));if(i%14===3)add('vent',(P()<.5?-1:1)*rnd(1.6,3));if(i%10===0){add('torch',-1.2);add('torch',1.2);}}}
  for(let st=0;st<THEMES.length;st++){const s=segs[stageStart[st]+6];s.spr=s.spr.filter(p=>Math.abs(p.x)>2.4);s.spr.push({t:'gate',x:0,st,seed:0});}
  return TR;
}
const segAt=z=>TR.segs[((Math.floor(z/SEG)%TR.N)+TR.N)%TR.N];
const wrapZ=z=>{const L=TR.L;z%=L;return z<0?z+L:z;};
/* signed distance from a to b along the loop, in segments, in (-N/2, N/2] */
function dSeg(za,zb){const L=TR.L;let d=(zb-za)%L;if(d>L/2)d-=L;else if(d<=-L/2)d+=L;return d/SEG;}
