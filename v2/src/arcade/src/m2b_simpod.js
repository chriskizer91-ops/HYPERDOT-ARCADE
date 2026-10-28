/* ---------- 5. THE SIM POD: Shiftlight 3's deluxe motion sim ----------
   A closed racing capsule on a six-legged motion base. Its gullwing door lifts as you walk up, and shows a
   bucket seat, a wheel with its shift lights, and three screens wrapped round the nose. Over it hangs the
   marquee with a set of start lights. Every few seconds they fill, go out, and the capsule launches: it
   squats, nods at each upshift and leans through the bends. Until the game arrives you can sit in it. */

/* rotation by th about the axis through A along unit u */
function rotAxisM(A,u,th){const c=Math.cos(th),s=Math.sin(th),t=1-c,[x,y,z]=u;
  const R=new Float32Array([c+x*x*t,y*x*t+z*s,z*x*t-y*s,0, x*y*t-z*s,c+y*y*t,z*y*t+x*s,0, x*z*t+y*s,y*z*t-x*s,c+z*z*t,0, 0,0,0,1]);
  return chain(mT(A[0],A[1],A[2]),R,mT(-A[0],-A[1],-A[2]));}

/* one lap of the demo, 7.6 s: idle, the lights fill while the two-step holds the revs, lights out, four gears */
const SIM_CY=7.6,SIM_GO=3.7,SIM_GEARS=[.6,.8,1.0,1.5];
function simState(t){
  const p=((t%SIM_CY)+SIM_CY)%SIM_CY,S={p,L:0,race:false,tau:0,rpm:1100,gear:0,kmh:0,shift:false,pitch:0,roll:0,heave:0};
  if(p<SIM_GO){
    S.L=p<.5?0:p<3.0?Math.min(5,1+Math.floor((p-.5)/.5)):5;
    if(p<.5)S.rpm=1100+60*Math.sin(t*9);
    else{S.rpm=6800+380*Math.max(0,Math.sin(t*23))-200*Math.sin(t*7);S.pitch=.003*Math.sin(t*31);S.heave=.002*Math.sin(t*27);}
  }else{
    const tau=p-SIM_GO;S.race=true;S.tau=tau;let g=0,acc=0;
    while(g<SIM_GEARS.length-1&&tau>acc+SIM_GEARS[g]){acc+=SIM_GEARS[g];g++;}
    const u=clamp((tau-acc)/SIM_GEARS[g],0,1);S.gear=g+1;S.rpm=lerp(g?6400:5600,9100,Math.pow(u,.8));S.shift=u>.88&&g<SIM_GEARS.length-1;
    S.kmh=Math.round(305*(1-Math.exp(-tau/1.7)));
    const win=clamp(tau/.45,0,1)*clamp((3.9-tau)/.8,0,1);
    S.pitch=.034*Math.exp(-tau*1.4)*(1-Math.exp(-tau*14));
    if(g>0&&tau-acc<.25)S.pitch-=.007*Math.sin((tau-acc)/.25*Math.PI);
    S.roll=.026*Math.sin(tau*1.35+.4)*win;S.heave=(.006*Math.sin(tau*6.1)+.003*Math.sin(tau*13.7))*win;
  }
  return S;
}

/* the teaser on the three screens: one wide picture, cut into left, centre and right */
const TZ_NEWS={t:'COMING SOON'};
function SimTeaser(){
  const W=512,H=144,HZ=70,VX=256,RW=170,K=H-HZ;
  let sd=11;const R=()=>(sd=(sd*16807)%2147483647)/2147483647;
  const bg=mkCanvas(W,H),b=bg.getContext('2d');
  let gr=b.createLinearGradient(0,0,0,HZ);gr.addColorStop(0,'#03010a');gr.addColorStop(.62,'#150632');gr.addColorStop(1,'#43104e');b.fillStyle=gr;b.fillRect(0,0,W,HZ);
  for(let i=0;i<110;i++){b.fillStyle=R()<.22?'#ffffff':'#6a5a9a';b.fillRect((R()*W)|0,(R()*(HZ-20))|0,1,1);}
  /* the sun: stripes, with gaps that widen toward the horizon */
  const SR=34;for(let y=HZ-SR;y<HZ;y++){const dy=HZ-y,hw=Math.sqrt(SR*SR-dy*dy),k=1-dy/SR;
    if(dy<18&&(y%4)<(18-dy)/5)continue;
    b.fillStyle='rgb(255,'+Math.round(lerp(214,58,k))+','+Math.round(lerp(70,168,k))+')';b.fillRect(Math.round(VX-hw),y,Math.round(hw*2),1);}
  /* the city on the horizon */
  for(let x=0;x<W;){const w=4+((R()*10)|0),near=Math.abs(x-VX)<64,h=3+((R()*(near?7:19))|0);b.fillStyle='#14061f';b.fillRect(x,HZ-h,w,h);
    for(let k=0;k<3;k++)if(R()<.55&&h>3){b.fillStyle=R()<.5?'#a8306e':'#2e8aa0';b.fillRect(x+1+((R()*(w-2))|0),HZ-h+1+((R()*(h-2))|0),1,1);}
    x+=w+((R()*2)|0);}
  b.fillStyle='#06020c';b.fillRect(0,HZ,W,H-HZ);
  b.fillStyle='#2c0d4c';for(let k=-14;k<=14;k++){if(!k)continue;for(let y=HZ+1;y<H;y++){const f=(y-HZ)/K;b.fillRect(Math.round(VX+k*46*f),y,1,1);}}
  b.fillStyle='#0b0614';b.beginPath();b.moveTo(VX-1,HZ);b.lineTo(VX+1,HZ);b.lineTo(VX+RW,H);b.lineTo(VX-RW,H);b.closePath();b.fill();
  for(let y=HZ+1;y<H;y++){const f=(y-HZ)/K,x=RW*f;b.fillStyle='#ff4fa0';b.fillRect(Math.round(VX-x)-1,y,2,1);b.fillRect(Math.round(VX+x),y,2,1);}
  b.fillStyle='#ff7ac8';b.fillRect(0,HZ,W,1);
  /* the car, from behind, and its flame */
  const car=mkCanvas(64,30),c=car.getContext('2d');
  c.fillStyle='#ff4fa0';c.fillRect(2,1,60,3);c.fillRect(3,4,3,7);c.fillRect(58,4,3,7);c.fillStyle='#3a1640';c.fillRect(22,4,3,6);c.fillRect(39,4,3,6);
  c.fillStyle='#2a1a4a';c.fillRect(15,6,34,7);c.fillStyle='#4fe3ff';c.fillRect(18,7,28,4);c.fillStyle='#0a0612';c.fillRect(19,8,26,2);
  c.fillStyle='#1c1234';c.fillRect(5,12,54,11);c.fillStyle='#ff2a3a';c.fillRect(7,14,13,3);c.fillRect(44,14,13,3);c.fillStyle='#ffd0d6';c.fillRect(9,15,9,1);c.fillRect(46,15,9,1);
  c.fillStyle='#ffd23f';c.fillRect(29,16,6,4);c.fillStyle='#1c1234';c.fillRect(30,17,4,1);
  c.fillStyle='#3a3448';c.fillRect(19,22,26,3);c.fillStyle='#000';c.fillRect(2,21,13,9);c.fillRect(49,21,13,9);
  const cv=mkCanvas(W,H),g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  const LC=['#ffffff','#ffe0f0','#ff9ad0','#ff4fa0','#c45cff','#4fe3ff','#2fb8ff'];
  let zs=0;
  const yAt=D=>HZ+K/D;
  return {cv,W,H,draw(dt,t,S){
    zs+=dt*S.kmh/30;
    g.drawImage(bg,0,0);
    /* the cross lines of the grid, off the road, coming at you */
    for(let n=0;n<16;n++){const D=1+n*1.6-(zs%1.6);if(D<1)continue;const y=Math.round(yAt(D)),hw=Math.round(RW*(y-HZ)/K)+3;
      g.fillStyle=D<4?'#7a2aa8':D<8?'#4a1a78':'#30104e';g.fillRect(0,y,VX-hw,1);g.fillRect(VX+hw,y,W-VX-hw,1);}
    /* lane dashes */
    for(let n=0;n<14;n++){const Da=1+n*2.4-(zs%2.4),Db=Da+1.1;if(Db<1)continue;const ya=Math.min(H,yAt(Math.max(1,Da))),yb=yAt(Db),f=(ya-HZ)/K;
      const w=Math.max(1,Math.round(3*f));g.fillStyle='#d8d0ff';
      for(const l of [-1,1])g.fillRect(Math.round(VX+l*RW*f/3-w/2),Math.round(yb),w,Math.max(1,Math.round(ya-yb)));}
    /* posts down both sides, a lamp on each */
    for(let n=0;n<9;n++){const D=1+n*3.2-(zs%3.2);if(D<1)continue;const f=1/D,y=Math.round(yAt(D)),h=Math.round(34*f),w=Math.max(1,Math.round(3*f));
      for(const l of [-1,1]){const x=Math.round(VX+l*RW*f*1.3);g.fillStyle='#24183a';g.fillRect(x-(w>>1),y-h,w,h);g.fillStyle=(n%2)?'#4fe3ff':'#ff4fa0';g.fillRect(x-(w>>1),y-h,w,Math.max(1,w));}}
    /* the car, weaving a little once it is away */
    const cx=Math.round(VX-32+(S.race?Math.sin(t*.9)*6:0)),cy=104+(S.race&&((t*14)|0)%2?1:0);
    if(S.race&&S.shift){g.fillStyle=((t*30)|0)%2?'#4f8bff':'#ffb84a';g.fillRect(cx+27,cy+24,10,3);g.fillStyle='#fff3c4';g.fillRect(cx+30,cy+24,4,2);}
    g.drawImage(car,cx,cy);
    /* the name, and under it the start lights or the news */
    gradText(g,'SHIFTLIGHT 3',VX,6,3,LC);txt3(g,'DELUXE MOTION SIM',VX,30,'#9ff1ff','c');
    if(!S.race||S.tau<.5){g.fillStyle='#0a0a0e';g.fillRect(VX-62,39,124,16);
      for(let i=0;i<5;i++){const x=VX-48+i*24,on=S.L>i;g.fillStyle=on?'#ff2a2a':'#2a0808';g.fillRect(x-4,43,8,8);g.fillRect(x-3,42,6,10);g.fillRect(x-5,44,10,6);
        if(on){g.fillStyle='#ffb0b0';g.fillRect(x-2,44,2,2);}}}
    else if(((t*1.6)|0)%3){g.fillStyle='#0a0412';g.fillRect(VX-70,40,140,18);txt5(g,TZ_NEWS.t,VX,42,'#ff4fa0',2,'c');}
    /* the HUD on the side screens: revs and gear on the left, speed on the right */
    const n=S.shift?(((t*12)|0)%2?15:0):clamp(Math.round((S.rpm-6500)/2500*15),0,15);
    g.fillStyle='#05030a';g.fillRect(6,96,116,40);g.fillRect(390,96,116,40);
    txt3(g,'RPM',12,100,'#9a94b2');txt5(g,String(Math.round(S.rpm/10)*10).padStart(4,' '),12,108,'#ece8f6');
    for(let i=0;i<15;i++){const col=S.shift?'#4f8bff':i<5?'#3dff6a':i<10?'#ff2a3a':'#4f8bff';g.fillStyle=i<n?col:'#1c1626';g.fillRect(12+i*7,124,6,7);}
    txt3(g,'GEAR',92,100,'#9a94b2');gradText(g,S.gear?String(S.gear):'N',101,107,2,LC);
    txt3(g,'KM/H',500,126,'#9a94b2','r');txt5(g,String(S.kmh),500,100,'#ece8f6',3,'r');txt3(g,S.race?'P1':'GRID',398,100,S.race?'#ffd23f':'#9a94b2');
  }};
}

function SimPod(o){
  const a=Machine(Object.assign({useZ:0},o)),T=a.T,M=36,TUM=.16,NX=3;
  const useP=a.W(2.45,0,.1);a.use={x:useP[0],z:useP[2],face:(o.ry||0)-Math.PI/2};
  a.verb=o.game?'PLAY':'SIT IN';if(!o.game)a.controls='none';
  /* the screens: a wide one in the nose, two angled in beside it */
  const SC=[{c:[0,1.38,-1.12],yaw:0,w:1.0,res:[256,144]},{c:[-.69,1.38,-.96],yaw:.7,w:.5,res:[128,144]},{c:[.69,1.38,-.96],yaw:-.7,w:.5,res:[128,144]}];
  const SH=.5625;
  for(const s of SC){const S0=a.addScreen('shift3',s.res,s.c,0,s.w,SH,{gain:2.1,col:'#ff4fa0'});S0.yaw=s.yaw;S0.att=null;}
  /* and a spectator screen on the wall behind the nose, so the floor sees the driver's view */
  const WTV={c:[-1.6,2.28,-1.86],w:1.16};{const S0=a.addScreen('shift3',[256,144],WTV.c,0,WTV.w,WTV.w*SH,{gain:2.1,col:'#ff4fa0'});S0.yaw=Math.PI/2;S0.att=null;S0.fixed=true;}
  if(o.game)TZ_NEWS.t='NOW RACING';
  const TZ=SimTeaser();
  /* the hull: z, half-width, keel, roof */
  const ST=[[-2.2,.3,.84,1.0],[-2.1,.62,.79,1.13],[-1.92,.86,.76,1.3],[-1.65,1.0,.74,1.52],[-1.32,1.07,.73,1.74],[-1.0,1.09,.72,1.88],
    [-.5,1.1,.72,1.96],[0,1.1,.72,1.99],[.5,1.1,.72,1.97],[.95,1.09,.72,1.9],[1.3,1.06,.73,1.78],[1.62,1.0,.75,1.62],[1.9,.95,.78,1.45],[2.1,.88,.82,1.3],[2.2,.8,.85,1.22]];
  const ring=(z,w,yb,yt)=>{const ym=(yb+yt)/2,hh=(yt-yb)/2,P=[];
    for(let k=0;k<M;k++){const f=k/M*TAU,c=Math.cos(f),s=Math.sin(f),yy=Math.sign(s)*Math.pow(Math.abs(s),2/NX),ww=w*(1-TUM*Math.max(0,yy)*Math.max(0,yy));
      P.push([ww*Math.sign(c)*Math.pow(Math.abs(c),2/NX),ym+hh*yy,z]);}return P;};
  const rings=ST.map(s=>ring(...s));
  /* the shell's outer x at any z and y, for the decals */
  const surfX=(z,y)=>{let i=0;while(i<ST.length-2&&ST[i+1][0]<z)i++;const A=ST[i],B=ST[i+1],u=clamp((z-A[0])/(B[0]-A[0]),0,1);
    const w=lerp(A[1],B[1],u),yb=lerp(A[2],B[2],u),yt=lerp(A[3],B[3],u),ym=(yb+yt)/2,hh=(yt-yb)/2,yy=clamp((y-ym)/hh,-1,1);
    const s=Math.sign(yy)*Math.pow(Math.abs(yy),NX/2),c=Math.sqrt(Math.max(0,1-s*s));return w*(1-TUM*Math.max(0,yy)*Math.max(0,yy))*Math.pow(c,2/NX);};
  /* the door: rings 5..9, from the sill (j 34) over the shoulder to the hinge near the roof (j 8) */
  const DI0=5,DI1=9,DJ=[34,35,0,1,2,3,4,5,6,7,8],inDoor=(i,j)=>i>=DI0&&i<DI1&&(j>=34||j<=7);
  const HA=rings[DI0][8],HB=rings[DI1][8],hl=Math.hypot(HB[0]-HA[0],HB[1]-HA[1],HB[2]-HA[2]),HU=[(HB[0]-HA[0])/hl,(HB[1]-HA[1])/hl,(HB[2]-HA[2])/hl];
  const DOOR_OPEN=1.15;
  const body=C_('#1a1428'),dark=C_('#0c0a12'),glass=C_('#0e1526'),streak=C_('#1c2c4c'),pink=C_('#ff4fa0'),cyan=C_('#4fe3ff'),metal=C_('#2c2a36'),chrome=CHROME,
    seatC=C_('#121016'),seatP=C_('#3a1430'),carbon=C_('#1c1b22'),red=C_('#ff2a3a'),grn=C_('#3dff6a'),blu=C_('#4f8bff');
  const shellCol=(m,i,j)=>{const f=(j+.5)/M*TAU,s=Math.sin(f),c=Math.cos(f);
    if(s<-.5)return dark;
    if(s>.62&&i>=2&&i<=11&&Math.abs(c)>.17)return (i*3+j)%7===0?streak:glass;
    return body;};
  /* the motion base: six legs, in pairs, from a plate on the plinth to the chassis under the hull */
  const legs=[];for(let k=0;k<6;k++){const tb=(Math.floor(k/2)*120+(k%2?18:-18))*Math.PI/180,tt=tb+(k%2?16:-16)*Math.PI/180;
    const B=[Math.sin(tb)*.86,.3,Math.cos(tb)*1.46],Tp=[Math.sin(tt)*.7,.638,Math.cos(tt)*1.26],d=[Tp[0]-B[0],Tp[1]-B[1],Tp[2]-B[2]],l=Math.hypot(...d);
    legs.push({B,Tp,d:d.map(v=>v/l),l});}
  const at=(p,d,s)=>[p[0]+d[0]*s,p[1]+d[1]*s,p[2]+d[2]*s];
  let capM=null,doorM=null,livM=null,livT=null,SLM=[],SLB=null,LTM=[];
  /* the shift lights, on the wheel and in a bar over the centre screen: k lit, in green, red, blue */
  const WHEEL=mb=>{mb.tr(0,1.15,-.5);mb.rx(-.38);};
  const ledCol=i=>i<5?grn:i<10?red:blu;
  const leds=(mb,k,allBlue,e)=>{
    for(let i=0;i<15;i++){if(i>=k)continue;const col=allBlue?blu:ledCol(i);
      mb.push();WHEEL(mb);mb.box((i-7)*.015,.098,.026,.011,.012,.008,col,e);mb.pop();
      mb.box((i-7)*.062,1.705,-1.105,.045,.026,.012,col,e);}};
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    /* the plinth, its lit edge, and the plate the legs stand on */
    mb.box(0,.11,0,2.84,.22,4.84,C_('#0d0b14'));
    const E=[[-1.42,.225,-2.42],[1.42,.225,-2.42],[1.42,.225,2.42],[-1.42,.225,2.42]];
    for(let k=0;k<4;k++)mb.tube(E[k],E[(k+1)%4],.012,k%2?cyan:pink,2.4);
    mb.box(0,.26,0,1.96,.08,3.3,C_('#24222c'));
    for(const L of legs){mb.sphere(...L.B,.05,chrome,.2,1);mb.tube(L.B,at(L.B,L.d,L.l*.52),.05,metal,0,8);const r0=at(L.B,L.d,L.l*.46);mb.tube(r0,at(r0,L.d,.04),.056,pink,1.8,8);}
    /* steps up to the door, checkered on the risers */
    mb.box(1.62,.06,.1,.38,.12,1.0,C_('#1a1822'));mb.box(1.28,.36,.1,.3,.28,.9,C_('#1a1822'));
    mb.tube([1.81,.125,-.4],[1.81,.125,.6],.01,pink,2.2);mb.tube([1.43,.505,-.35],[1.43,.505,.55],.01,cyan,2.2);
    for(const [x,y0,n,z0,len] of [[1.812,.02,2,-.4,1.0],[1.432,.38,2,-.35,.9]]){const N=Math.round(len/.06);
      for(let r=0;r<n;r++)for(let q=0;q<N;q++)if((r+q)%2===0)mb.box(x,y0+r*.05+.025,z0+(q+.5)*len/N,.004,.05,len/N,C_('#e8e8f0'),.25);}
    /* the marquee hanging over it, on cables, with the start lights underneath */
    mb.box(0,3.42,0,.14,.74,3.3,C_('#0a0812'));
    for(const z of [-1.5,1.5])mb.tube([0,3.79,z],[0,ROOM.h,z],.006,C_('#555'));
    polyTube(mb,[[.075,3.06,1.64],[.075,3.06,-1.64],[.075,3.78,-1.64],[.075,3.78,1.64]],.012,pink,2.4,true);
    polyTube(mb,[[-.075,3.06,1.64],[-.075,3.06,-1.64],[-.075,3.78,-1.64],[-.075,3.78,1.64]],.012,cyan,2.2,true);
    mb.box(0,2.89,0,.14,.3,1.56,C_('#0a0a0e'));for(const z of [-.7,.7])mb.tube([0,3.03,z],[0,3.07,z],.01,metal);
    for(let i=0;i<5;i++){const z=.56-i*.28;for(const y of [2.96,2.82]){mb.push();mb.tr(.07,y,z);mb.rz(-Math.PI/2);mb.cyl(0,0,0,.055,.018,12,C_('#2a0606'),.08);mb.pop();}
}
    {const [x,y,z]=WTV.c,w=WTV.w,h=w*SH;mb.box(x-.03,y,z,.05,h+.08,w+.08,BLACK);mb.box(x-.07,y,z,.06,.2,.3,metal);
      polyTube(mb,[[x+.005,y-h/2-.04,z+w/2+.04],[x+.005,y-h/2-.04,z-w/2-.04],[x+.005,y+h/2+.04,z-w/2-.04],[x+.005,y+h/2+.04,z+w/2+.04]],.01,pink,2.2,true);}
    /* a sandwich board by the steps */
    mb.push();mb.tr(2.05,0,1.35);mb.ry(-.5);for(const sx of [-1,1]){mb.push();mb.tr(0,.48,sx*.12);mb.rx(-sx*.13);mb.box(0,0,0,.5,.96,.02,C_('#14101e'));mb.pop();}mb.pop();
    mb.pop();
    /* the plinth's name, both sides of the steps, and the marquee's face */
    const nm=mkCanvas(160,18),ng=nm.getContext('2d');ng.fillStyle='#0d0b14';ng.fillRect(0,0,160,18);gradText(ng,'SHIFTLIGHT 3',80,2,2,['#ffffff','#ffe0f0','#ff9ad0','#ff4fa0','#c45cff','#4fe3ff','#2fb8ff']);
    const ntex=texFrom(nm,false);
    for(const [z0,z1] of [[2.34,.76],[-.66,-2.34]])texQuad(T,[[1.423,.035,z0],[1.423,.035,z1],[1.423,.19,z1],[1.423,.19,z0]],ntex,1.7);
    const mq=mkCanvas(512,116),q=mq.getContext('2d');let gq=q.createLinearGradient(0,0,0,116);gq.addColorStop(0,'#1a0630');gq.addColorStop(1,'#05020c');q.fillStyle=gq;q.fillRect(0,0,512,116);
    for(let i=0;i<70;i++){q.fillStyle='rgba(255,255,255,'+(.05+.05*(i%3))+')';q.fillRect((i*67)%512,(i*29)%116,1,1);}
    for(let x=0;x<512;x+=8){q.fillStyle=(x/8)%2?'#e8e8f0':'#0a0812';q.fillRect(x,0,8,4);q.fillStyle=(x/8)%2?'#0a0812':'#e8e8f0';q.fillRect(x,4,8,4);}
    txt3(q,'HYPERDOT ARCADE PRESENTS',256,13,'#9a94b2','c');
    gradText(q,'SHIFTLIGHT 3',256,24,5,['#ffffff','#ffe0f0','#ff9ad0','#ff4fa0','#c45cff','#4fe3ff','#2fb8ff']);
    txt5(q,'DELUXE MOTION SIM',256,68,'#4fe3ff',2,'c');txt5(q,o.game?'NOW RACING':'COMING SOON',256,90,'#ff4fa0',2,'c');
    texQuad(T,[[.072,3.07,1.63],[.072,3.07,-1.63],[.072,3.77,-1.63],[.072,3.77,1.63]],texFrom(mq,false),2.0);
    const sb=mkCanvas(64,128),sg=sb.getContext('2d');sg.fillStyle='#0a0612';sg.fillRect(0,0,64,128);sg.strokeStyle='#ff4fa0';sg.lineWidth=2;sg.strokeRect(2,2,60,124);
    txt5(sg,'NEW',32,12,'#ffd23f',1,'c');gradText(sg,'3',32,26,4,['#ffffff','#ffe0f0','#ff9ad0','#ff4fa0','#c45cff','#4fe3ff','#2fb8ff']);
    txt5(sg,'COMING',32,66,'#ece8f6',1,'c');txt5(sg,'SOON',32,78,'#ece8f6',1,'c');txt3(sg,'DELUXE',32,98,'#4fe3ff','c');txt3(sg,'MOTION SIM',32,106,'#4fe3ff','c');
    const sbt=texFrom(sb,false),BT=chain(T,mT(2.05,0,1.35),mRY(-.5));
    if(!o.game)for(const sx of [-1,1]){const MM=chain(BT,mT(0,.48,sx*.12),mRX(-sx*.13)),zz=sx*.0115,hx=.22;
      const pts=sx>0?[[-hx,-.44,zz],[hx,-.44,zz],[hx,.44,zz],[-hx,.44,zz]]:[[hx,-.44,zz],[-hx,-.44,zz],[-hx,.44,zz],[hx,.44,zz]];
      texQuad(MM,pts,sbt,1.4);}
    /* ---- the capsule: everything that rides the motion base, drawn on its own each frame ---- */
    const cb=new MB();
    loft(cb,rings,shellCol,0,(m,i,j)=>inDoor(i,j));
    capRing(cb,rings[0],[0,.93,-2.24],dark);capRing(cb,rings[rings.length-1],[0,1.03,2.2],dark);
    /* the light lines: the beltline in pink, the sill in cyan, a stripe down the roof */
    const lift=(p,i,d)=>{const ym=(ST[i][2]+ST[i][3])/2,dx=p[0],dy=p[1]-ym,l=Math.hypot(dx,dy)||1;return [p[0]+dx/l*d,p[1]+dy/l*d,p[2]];};
    const line=(k,i0,i1,col,e)=>{const P=[];for(let i=i0;i<=i1;i++)P.push(lift(rings[i][k],i,.012));polyTube(cb,P,.009,col,e);};
    line(3,1,DI0,pink,2.4);line(3,DI1,13,pink,2.4);line(15,1,13,pink,2.4);
    line(32,1,13,cyan,2.2);line(22,1,13,cyan,2.2);line(9,2,12,cyan,1.6);
    /* the nose's eyes and the tail lights */
    for(const [a0,a1] of [[1,4],[14,17]]){const P=[];for(let k=a0;k<=a1;k++){const p=rings[2][k];P.push([p[0]*1.012,p[1],p[2]-.005]);}polyTube(cb,P,.013,cyan,3.0);}
    cb.box(0,1.14,2.207,1.3,.045,.012,red,3.4);for(const sx of [-1,1])cb.box(sx*.66,1.06,2.207,.03,.16,.012,red,3.0);cb.box(0,.95,2.207,.12,.05,.012,red,2.2);
    for(const x of [-.5,-.25,0,.25,.5])cb.box(x,.9,2.17,.014,.1,.12,carbon);
    /* the doorway's lit frame on the body */
    const fr=(i,j0,j1)=>{const P=[];for(let j=j0;j!==j1;j=(j+1)%M)P.push(rings[i][j]);P.push(rings[i][j1]);polyTube(cb,P.map(p=>[p[0]*1.004,p[1],p[2]]),.011,pink,2.0);};
    fr(DI0,34,8);fr(DI1,34,8);{const P=[];for(let i=DI0;i<=DI1;i++)P.push(rings[i][34]);polyTube(cb,P.map(p=>[p[0]*1.006,p[1],p[2]]),.012,cyan,2.4);}
    /* wing, mirrors, a grab handle by the door */
    for(const sx of [-1,1])cb.tube([sx*.35,1.42,1.96],[sx*.35,1.66,2.08],.022,carbon);
    cb.box(0,1.68,2.1,1.62,.035,.34,body);cb.box(0,1.703,2.265,1.62,.012,.02,pink,2.2);
    for(const sx of [-1,1]){cb.box(sx*.81,1.64,2.1,.02,.22,.42,carbon);cb.tube([sx*.82,1.755,1.9],[sx*.82,1.755,2.3],.006,cyan,2.0);}
    for(const sx of [-1,1]){const x=sx*surfX(-1.25,1.5);cb.tube([x*.98,1.5,-1.25],[x+sx*.14,1.56,-1.2],.012,carbon);cb.box(x+sx*.17,1.58,-1.2,.1,.07,.04,body);cb.box(x+sx*.17,1.58,-1.177,.08,.05,.004,C_('#2a3a5a'),.2);}
    {const x=surfX(1.05,1.35);cb.tube([x,1.12,1.05],[x+.06,1.14,1.05],.01,chrome);cb.tube([x,1.6,1.05],[x+.06,1.58,1.05],.01,chrome);cb.tube([x+.06,1.14,1.05],[x+.06,1.58,1.05],.014,chrome);}
    /* chassis and the legs' rods */
    cb.box(0,.675,0,1.5,.07,3.0,metal);
    for(const L of legs){cb.sphere(...L.Tp,.045,chrome,.2,1);cb.tube(L.Tp,at(L.Tp,L.d,-L.l*.6),.028,chrome,0,8);}
    /* inside: the tub floor, the dash, the screens' bezels, the seat, the wheel, the pedals */
    cb.box(0,.8,.1,1.86,.04,3.0,C_('#16141e'));
    for(const sx of [-1,1])cb.box(sx*.86,.83,.1,.012,.012,2.6,cyan,2.2);cb.box(0,.9,-.955,1.3,.012,.012,pink,2.6);
    cb.box(0,1.0,-1.08,1.5,.2,.24,carbon);cb.box(0,1.77,-1.04,1.3,.035,.3,carbon);
    for(const s of SC){cb.push();cb.tr(...s.c);cb.ry(s.yaw);cb.box(0,0,-.03,s.w+.06,SH+.06,.04,BLACK);cb.pop();}
    cb.box(0,1.705,-1.115,.96,.04,.02,C_('#0a0810'));for(let i=0;i<15;i++)cb.box((i-7)*.062,1.705,-1.108,.045,.026,.008,C_('#1a0a10'),.05);
    cb.tube([0,1.04,-.98],[0,1.13,-.56],.03,carbon,0,6);
    cb.push();WHEEL(cb);
    {const P=[];for(let k=0;k<18;k++){const f=k/18*TAU;P.push([.17*Math.cos(f),Math.max(-.1,.13*Math.sin(f)),0]);}polyTube(cb,P,.02,C_('#1a1820'),0,true);}
    cb.box(0,0,0,.2,.13,.04,carbon);cb.box(0,.01,.022,.1,.055,.004,cyan,.9);
    for(const [x,y,col] of [[-.075,-.04,red],[.075,-.04,C_('#ffd23f')],[-.075,.045,blu],[.075,.045,grn]])cb.box(x,y,.022,.018,.018,.006,col,.7);
    for(const sx of [-1,1]){cb.tube([sx*.1,0,0],[sx*.165,0,0],.014,carbon);cb.box(sx*.14,.02,-.035,.06,.1,.008,C_('#c3c9d6'),.1);}
    cb.box(0,.098,.022,.24,.02,.006,C_('#0a0810'));for(let i=0;i<15;i++)cb.box((i-7)*.015,.098,.024,.011,.012,.006,C_('#1a0a10'),.05);
    cb.pop();
    for(const x of [-.12,0,.12]){cb.push();cb.tr(x,.9,-.92);cb.rx(-.5);cb.box(0,0,0,.07,.12,.015,x?chrome:C_('#888'),.05);cb.pop();}
    cb.box(0,.9,.45,.52,.16,.52,seatC);cb.box(0,.995,.42,.44,.05,.44,seatP);for(const sx of [-1,1])cb.box(sx*.24,1.03,.45,.06,.1,.46,seatC);
    cb.push();cb.tr(0,1.0,.72);cb.rx(.28);
    cb.box(0,.34,0,.5,.7,.1,seatC);cb.box(0,.32,-.055,.36,.56,.02,seatP);for(const sx of [-1,1])cb.box(sx*.24,.3,-.06,.06,.55,.12,seatC);cb.box(0,.75,0,.3,.16,.12,seatC);
    for(const sx of [-1,1])cb.box(sx*.1,.34,-.068,.035,.5,.005,cyan,.6);cb.box(0,.12,-.07,.26,.04,.005,cyan,.6);
    cb.pop();
    capM=mesh(cb);
    /* the door, built closed: its skin, its trim panel inside, the beltline, its lit edges */
    const db=new MB(),rowsO=[],rowsI=[];
    for(let i=DI0;i<=DI1;i++){const ym=(ST[i][2]+ST[i][3])/2;rowsO.push(DJ.map(j=>rings[i][j]));rowsI.push(DJ.map(j=>{const p=rings[i][j];return [p[0]*.975,ym+(p[1]-ym)*.985,p[2]];}));}
    for(let i=0;i<rowsO.length-1;i++)for(let k=0;k<DJ.length-1;k++){const jj=DJ[k];
      const f=(jj+.5)/M*TAU,isG=Math.sin(f)>.62;
      db.quad(rowsO[i][k],rowsO[i][k+1],rowsO[i+1][k+1],rowsO[i+1][k],isG?((i+k)%3===0?streak:glass):body,0);
      db.quad(rowsI[i][k],rowsI[i][k+1],rowsI[i+1][k+1],rowsI[i+1][k],isG?glass:C_('#24202e'),0);}
    polyTube(db,rowsO.map((r,ii)=>lift(r[5],DI0+ii,.012)),.009,pink,2.4);
    polyTube(db,rowsI.map(r=>r[0]),.008,cyan,2.2);polyTube(db,rowsI[0],.006,cyan,1.6);polyTube(db,rowsI[rowsI.length-1],.006,cyan,1.6);
    doorM=mesh(db);
    /* the number on the flank, aft of the door: laid onto the curve of the shell */
    const rc=mkCanvas(128,128),rg=rc.getContext('2d');rg.fillStyle='#1a1428';rg.fillRect(0,0,128,128);
    rg.fillStyle='#ece8f6';rg.beginPath();rg.arc(64,64,54,0,TAU);rg.fill();rg.fillStyle='#ff4fa0';rg.beginPath();rg.arc(64,64,48,0,TAU);rg.fill();
    rg.fillStyle='#120c1e';rg.beginPath();rg.arc(64,64,42,0,TAU);rg.fill();gradText(rg,'3',64,36,8,['#ffffff','#e6fbff','#9ff1ff','#58e8ff','#2fb8ff','#3a62ff','#5a2fd8']);
    livT=texFrom(rc,false);
    const lb=new MB(),NZ=5,NY=5,z0=1.62,z1=1.12,y0=1.0,y1=1.46;
    const LP=(u,v)=>{const z=lerp(z0,z1,u),y=lerp(y0,y1,v);return [surfX(z,y)+.006,y,z];};
    for(let iu=0;iu<NZ;iu++)for(let iv=0;iv<NY;iv++){const u0=iu/NZ,u1=(iu+1)/NZ,v0=iv/NY,v1=(iv+1)/NY;lb.quad(LP(u0,v0),LP(u1,v0),LP(u1,v1),LP(u0,v1),[1,1,1],0,[[u0,v0],[u1,v0],[u1,v1],[u0,v1]]);}
    livM=mesh(lb);
    /* lit states: the shift lights (k of 15, or all blue) and the start lights (k of 5) */
    for(let k=0;k<=15;k++){const m=new MB();leds(m,k,false,5);SLM.push(k?mesh(m):null);}
    {const m=new MB();leds(m,15,true,6);SLB=mesh(m);}
    for(let k=0;k<=5;k++){if(!k){LTM.push(null);continue;}const m=new MB();
      for(let i=0;i<k;i++){const z=.56-i*.28;for(const y of [2.96,2.82]){m.push();m.tr(.078,y,z);m.rz(-Math.PI/2);m.cyl(0,0,0,.052,.014,12,C_('#ff2a2a'),5.5);m.pop();}}LTM.push(mesh(m));}
    const p0=a.W(-1.42,0,-2.42),p1=a.W(1.42,0,2.42);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
    const s0=a.W(1.42,0,-.4),s1=a.W(1.82,0,.6);block(Math.min(s0[0],s1[0]),Math.max(s0[0],s1[0]),Math.min(s0[2],s1[2]),Math.max(s0[2],s1[2]));
    if(!o.game){const b0=a.W(1.88,0,1.18),b1=a.W(2.22,0,1.52);block(Math.min(b0[0],b1[0]),Math.max(b0[0],b1[0]),Math.min(b0[2],b1[2]),Math.max(b0[2],b1[2]));}
  };
  /* lights: the cockpit, the screens' spill, the underglow, the marquee, and the start lights' red */
  const L_in=lightAt(...a.W(.3,1.5,-.1),2.8,[1,.4,.8],.95),L_scr=lightAt(...a.W(0,1.45,-.7),2.0,[.4,.75,1],.45),
    L_under=lightAt(...a.W(0,.42,0),2.8,[.3,.85,1],.55),L_mq=lightAt(...a.W(1.3,3.1,0),3.6,[1,.4,.8],.5),L_st=lightAt(...a.W(.6,2.85,0),2.6,[1,.12,.1],0);
  let S=simState(0),door=0,tA=0;
  const SW=()=>chain(mT(0,.62+S.heave,0),mRX(S.pitch),mRZ(S.roll),mT(0,-.62,0));
  const P_=(x,y,z)=>xf(chain(T,SW()),x,y,z);
  const doorMat=()=>rotAxisM(HA,HU,door);
  a.onDraw=()=>{if(!capM)return;const M0=chain(T,SW());
    drawLit(capM,M0);drawLit(doorM,chain(M0,doorMat()));drawLit(livM,M0,{mode:3,tex:livT,emi:1.3});
    const k=S.shift?(((W_.t*12)|0)%2?-1:0):clamp(Math.round((S.rpm-6500)/2500*15),0,15);
    if(k<0)drawLit(SLB,M0);else if(k>0)drawLit(SLM[k],M0);
    if(S.L>0&&LTM[S.L])drawLit(LTM[S.L],T);};
  a.drawScreens=()=>{const M0=chain(T,SW());for(const s of a.screens)drawScreen(s.scr,chain(s.fixed?T:M0,mT(...s.c),mRY(s.yaw||0),mS(s.w,s.h,1)),s.pow||1);};
  /* cut the wide teaser into the three screens */
  const blit=()=>{const cut=[[128,256],[0,128],[384,128],[128,256]];a.screens.forEach((s,i)=>{const [x,w]=cut[i];s.scr.g.drawImage(TZ.cv,x,0,w,TZ.H,0,0,s.scr.w,s.scr.h);s.scr.upload();});};
  const tick=(dt,live)=>{
    S=simState(W_.t);
    const d=Math.hypot(CH_.x-o.x,CH_.z-o.z),want=(live||d<7.5)?DOOR_OPEN:0;
    door+=clamp(want-door,-dt*.9,dt*.9);door=door<=0?0:door;
    tA+=dt;if(tA>=(live||d<9?1/12:1/8)&&(live||d<24)){TZ.draw(tA,W_.t,S);blit();tA=0;}
    L_st.k=.22*S.L;L_under.k=.45+.15*Math.sin(W_.t*1.7);L_in.k=door>.2?.95:.3;L_scr.k=door>.2?.5:.1;
  };
  a.idle=function(dt){if(W_.mode==='game'||(W_.mode==='pin'&&!PIN.arcadeOn))return;tick(dt,this===W_.active);};
  a.update=(dt)=>{tick(dt,true);if(!a.told&&!o.game){a.told=true;toast('SHIFTLIGHT 3<br><small style="font-size:12px;color:#f4ecff">Still in the workshop · coming soon</small>');}};
  a.stop=()=>{a.told=false;};
  /* climbing in: up the steps, under the door, down into the seat */
  const seatEye=[0,1.6,.32],look=[0,1.37,-1.12];
  a.camPath=(e,from)=>{const step=a.W(2.3,1.72,.15),sill=P_(.92,1.62,.22),seat=P_(...seatEye),c=P_(...look),mid=P_(0,1.3,-.2);
    let p,tg;
    if(e<.42){const u=ease(e/.42);p=mix3_(from.eye,step,u);tg=mix3_(from.tgt,mid,u);}
    else if(e<.74){const u=ease((e-.42)/.32);p=mix3_(step,sill,u);tg=mix3_(mid,c,u);}
    else{const u=ease((e-.74)/.26);p=mix3_(sill,seat,u);tg=c;}
    return {eye:p,tgt:tg,fov:lerp(from.fov,64,ease(e))};};
  a.cam=()=>({eye:P_(...seatEye),tgt:P_(...look),fov:64});
  a.camLive=true;
  return a;
}
