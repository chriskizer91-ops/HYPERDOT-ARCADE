/* =====================================================================================
   CAMERA + SHADER UNIFORMS
   ===================================================================================== */
const v3={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];},lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]};
let CAMOV=null;
const CAM={eye:[0,3,-8],f:[0,0,1],r:[1,0,0],u:[0,1,0],fov:1,lu:0,lh:0,roll:0,s:0};
function lookAt(eye,at,roll){
  const f=v3.norm(v3.sub(at,eye));let r=v3.norm(v3.cross([0,1,0],f)),u=v3.cross(f,r);
  if(roll){const c=Math.cos(roll),s=Math.sin(roll),r2=v3.add(v3.mul(r,c),v3.mul(u,s)),u2=v3.sub(v3.mul(u,c),v3.mul(r,s));r=r2;u=u2;}
  CAM.eye=eye;CAM.f=f;CAM.r=r;CAM.u=u;CAM.s=eye[2];
}
function chasePose(dt){
  const B=BK;CAM.lu+=(B.u-CAM.lu)*Math.min(1,dt*4.5);CAM.lh+=(B.h-CAM.lh)*Math.min(1,dt*(B.air?3.5:8));
  const back=4.7+B.vs*.014+(B.nitroT>0?1.5:0);
  return [W3(B.s-back,CAM.lu*.9,CAM.lh*.75+1.85+B.vs*.004),W3(B.s+13,B.u*.72+CAM.lu*.28,CAM.lh*.55+1.05)];
}
const smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
function updateCamera(dt){
  const B=BK,ni=B.nitroT>0?1:0;let eye,at,roll=B.bank*.22,fov=.84+B.vs/420+ni*.12+(B.boostT>0?.05:0);
  const m=S.mode;
  if(m==='intro'){const k=smooth((S.t-.3)/3.4),[ce,ca]=chasePose(dt);
    eye=v3.lerp(W3(B.s-34,-6,24),ce,k);at=v3.lerp(W3(B.s+70,0,3),ca,k);roll*=k;}
  else if(m==='caught'||m==='tally'||(TG.state==='caught'&&m==='title')){
    /* orbit the van, squashed so the camera never leaves the street */
    const a=S.clock*.32+.6,R=m==='tally'?16:12.5,room=limAt(TG.s)-(ST.id===2?.5:1.8);
    eye=W3(TG.s+Math.sin(a)*R,clamp(TG.u+Math.cos(a)*R*.75,-room,room),m==='tally'?6.5:4.2);at=W3(TG.s,TG.u,1.1);roll=0;fov=1;}
  else if(m==='ending'){const k=Math.min(1,S.t/14);eye=W3(BK.s-30-k*10,0,4+k*60);at=W3(BK.s+80,0,6+k*25);roll=0;fov=1.05;}
  else if(m==='title'){
    S.camT+=dt;if(S.camT>7){S.camT=0;S.camMode=(S.camMode+1)%4;}
    const cm=S.camMode;
    if(cm===0){[eye,at]=chasePose(dt);}
    else if(cm===1){const sd=B.u>0?-1:1;eye=W3(B.s-4.5+S.camT*.25,B.u+sd*2.6,.55);at=W3(B.s+6,B.u-sd*.4,1.25);roll=sd*.06;fov=.85;}
    else if(cm===2&&!(TG.s-B.s>-6&&TG.s-B.s<22)){eye=W3(B.s+9.5,B.u*.7,1.5);at=W3(B.s-2,B.u,1.1);roll=0;fov=.9;}
    else if(cm===2){[eye,at]=chasePose(dt);}
    else{eye=W3(B.s-26,0,21+Math.sin(S.camT*.4)*2);at=W3(B.s+32,B.u*.5,0);roll=0;fov=1;}
  }
  else{[eye,at]=chasePose(dt);}
  if(CAMOV){eye=CAMOV(B)[0];at=CAMOV(B)[1];roll=0;fov=CAMOV(B)[2]||1;}
  /* shake */
  if(S.shake>0&&!reduce){const k=S.shake*S.shake;eye=v3.add(eye,[rnd(-1,1)*k*.35,rnd(-1,1)*k*.25,0]);at=v3.add(at,[rnd(-1,1)*k*.2,rnd(-1,1)*k*.2,0]);}
  if(m==='play'||m==='title'||m==='intro')fov+=0;
  CAM.fov+=(fov-CAM.fov)*Math.min(1,dt*3);CAM.roll+=(roll-CAM.roll)*Math.min(1,dt*5);
  lookAt(eye,at,CAM.roll);
}
function project(p){const v=v3.sub(p,CAM.eye),z=v3.dot(v,CAM.f);if(z<.4)return null;return [W/2+v3.dot(v,CAM.r)/z/CAM.fov*H,H/2-v3.dot(v,CAM.u)/z/CAM.fov*H,z];}
const UCAR=new Float32Array(56),UCARB=new Float32Array(56),UPAD=new Float32Array(24),URAMP=new Float32Array(16),UDR=new Float32Array(8),UDRT=new Float32Array(8),UROT=new Float32Array(9);
const QUAL={steps:parseFloat(store.get('hd-prisma-q','112'))||112,ema:16.7,t:0,auto:true,drops:0};
function stageUniforms(){
  Object.assign(SU,{uStage:ST.id,uPA:ST.PA,uPF:ST.PF,uPP:ST.PP,uYA:ST.YA,uYF:ST.YF,uYP:ST.YP,uRain:ST.rain,uFogD:ST.fogD,uWet:ST.wet,
    uN1:ST.N1,uN2:ST.N2,uN3:ST.N3,uFogC:ST.fog,uSkyA:ST.skyA,uSkyB:ST.skyB});
}
function frameUniforms(){
  const B=BK,T=TG;
  /* a lightning flicker lifts the sky (and with it the ambient light) for a few frames */
  const bl=S.bolt>0?(S.bolt>.85||(S.bolt>.45&&S.bolt<.6)?1:.35)*S.bolt:0;
  SU.uSkyA=bl?ST.skyA.map((c,i)=>c+[.35,.38,.55][i]*bl):ST.skyA;SU.uSkyB=bl?ST.skyB.map((c,i)=>c+[.25,.25,.4][i]*bl):ST.skyB;
  SU.uTime=S.clock%900;SU.uCam=CAM.eye;SU.uFov=CAM.fov;SU.uSteps=QUAL.steps;
  UROT.set([CAM.r[0],CAM.r[1],CAM.r[2],CAM.u[0],CAM.u[1],CAM.u[2],CAM.f[0],CAM.f[1],CAM.f[2]]);SU.uRot=UROT;
  let n=0;for(const t of TR.cars){if(n>=14)break;if(t.s<CAM.s-12||t.s>CAM.s+520)continue;const p=W3(t.s,t.u,t.h);
    UCAR.set([p[0],p[1],p[2],t.yaw],n*4);UCARB.set([t.type,t.L,t.brake,t.blink],n*4);n++;}
  SU.uNC=n;SU.uCar=UCAR;SU.uCarB=UCARB;
  const bp=W3(B.s,B.u,B.h+.05+Math.sin(S.clock*9)*.04);
  SU.uBk=[bp[0],bp[1],bp[2],B.yaw];SU.uBkB=[B.bank,0,B.nitroT>0?1:B.boostT>0?.5:0,1];SU.uBkF=[Math.sin(B.yaw),0,Math.cos(B.yaw)];
  if(T.on){const tp=W3(T.s,T.u,T.h);SU.uTg=[tp[0],tp[1],tp[2],T.yaw];SU.uTgB=[T.bank,T.dmg/100,T.boostT>0?1:0,1];
    for(let k=0;k<2;k++){const d=DR[k];UDR.set([d.x,d.y,d.z,d.on],k*4);UDRT.set([tp[0],tp[1]+1,tp[2],0],k*4);}}
  else{SU.uTgB=[0,0,0,0];UDR.fill(0);}
  SU.uDr=UDR;SU.uDrT=UDRT;
  UPAD.fill(0);URAMP.fill(0);let np=0,nr=0;
  for(const f of FEAT.list){if(f.z+f.len<CAM.s-6||f.z>CAM.s+480)continue;
    if(f.k==='pad'&&np<6){UPAD.set([f.z,f.u,f.len,0],np*4);np++;}else if(f.k==='ramp'&&nr<4){URAMP.set([f.z,f.u,f.len,0],nr*4);nr++;}}
  SU.uPad=UPAD;SU.uRamp=URAMP;
}

/* =====================================================================================
   HUD — drawn on a transparent W x H canvas that the LED pass lays over the city
   ===================================================================================== */
const FACE=['......HHHH......','....HHHHHHHH....','...HHHHHHHHHH...','..HHHHHHHHHHHH..','..HHHSSSSSSHHH..','.gHHSSSSSSSSHHg.','.gHSSSSSSSSSSHg.','.gHSEESSSSEESHg.',
  '.gHSSSSSSSSSSHg.','.ggSSSSNNSSSSgg.','..HSSSSSSSSSSH..','..HSSSMMMMSSSmH.','...HSSSSSSSSmm..','....SSSSSSSm....','.....SSSSS......','....CCCCCCCC....','..CCCCBCCCCCCC..','.CCCCCCCCCCCCCC.'];
const FACEC={H:'#3c1c5c',S:'#e8a888',E:'#1a1030',N:'#c88068',M:'#a03850',g:'#8a96b0',m:'#d0d8e8',C:'#2a4aa8',B:'#ffd040'};
function face(x,y,talk){
  for(let j=0;j<FACE.length;j++)for(let i=0;i<16;i++){let ch=FACE[j][i];if(ch==='.')continue;if(ch==='M'&&!talk)ch='N';if(ch==='E'&&(S.clock%3.2)>3.05)ch='S';g.fillStyle=FACEC[ch];g.fillRect(x+i,y+j,1,1);}
  if((S.clock*2|0)%2){g.fillStyle='#ff3040';g.fillRect(x+14,y+12,1,1);}
}
const RAIN=[];for(let i=0;i<70;i++)RAIN.push({a:Math.random()*TAU,r:Math.random(),v:rnd(.5,1)});
const SPEED=[];for(let i=0;i<30;i++)SPEED.push({a:Math.random()*TAU,r:rnd(.3,1),v:rnd(.8,1.4)});
function radial(arr,dt,rate,len,col,alpha,minR){
  const cx=W/2,cy=H*.44,R=Math.hypot(W,H)*.55;g.strokeStyle=col;g.lineWidth=1;g.globalAlpha=alpha;g.beginPath();
  for(const d of arr){d.r+=d.v*rate*dt*(.3+d.r);if(d.r>1){d.r=minR+Math.random()*.1;d.a=Math.random()*TAU;}
    const ca=Math.cos(d.a),sa=Math.sin(d.a)*.62,r0=d.r*R,r1=r0+len*d.r*R;g.moveTo(Math.round(cx+ca*r0)+.5,Math.round(cy+sa*r0)+.5);g.lineTo(Math.round(cx+ca*r1)+.5,Math.round(cy+sa*r1)+.5);}
  g.stroke();g.globalAlpha=1;
}
function panel(x,y,w,h,edge){g.fillStyle='rgba(8,6,22,.78)';g.fillRect(x,y,w,h);g.fillStyle=edge||'rgba(79,227,255,.55)';g.fillRect(x,y,w,1);g.fillRect(x,y+h-1,w,1);g.fillRect(x,y,1,h);g.fillRect(x+w-1,y,1,h);}
function bar(x,y,w,h,k,c1,c2,bg){g.fillStyle=bg||'rgba(40,30,60,.85)';g.fillRect(x,y,w,h);const n=Math.round(w*clamp(k,0,1));for(let i=0;i<n;i+=2){g.fillStyle=i/w<.5?c1:c2;g.fillRect(x+i,y,1,h);}}
function drawSparks(){
  for(const p of SPK){const a=project([p.x,p.y,p.z]);if(!a||a[2]>260)continue;const b=project([p.x-p.vx*.02,p.y-p.vy*.02,p.z-(p.vz-BK.vs)*.02]);
    const k=clamp(p.life*2.5,0,1);g.fillStyle=p.sm?rgba(p.col,.32*k):rgba(mixC(p.col,[255,255,255],k*.5),Math.min(1,.4+k));
    if(b&&Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1])>1.5){g.strokeStyle=g.fillStyle;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}
    else g.fillRect(Math.round(a[0]),Math.round(a[1]),a[2]<12?2:1,a[2]<12?2:1);}
}
function drawWorldHUD(dt){
  if(ST.rain&&!reduce)radial(RAIN,dt,.25+BK.vs/90,.05,'#a8c4ff',.16,.04);
  if((BK.nitroT>0||BK.boostT>0)&&!reduce)radial(SPEED,dt,1.6,.1,BK.nitroT>0?'#c8f4ff':'#7fe8ff',BK.nitroT>0?.3:.18,.5);
  drawSparks();
  /* the target marker */
  if(TG.on&&TG.state!=='caught'&&(S.mode==='play'||(S.mode==='intro'&&S.t>3.6))){
    const gap=TG.s-BK.s,p=project(W3(TG.s,TG.u,TG.h+3.6)),blink=(S.clock*4|0)%2;
    if(p&&p[0]>-4&&p[0]<W+4&&p[1]>-4&&p[1]<H){const x=Math.round(p[0]),y=Math.round(p[1]);g.fillStyle=blink?'#ffd040':'#ff9a20';
      for(let i=0;i<3;i++)g.fillRect(x-2+i,y-3+i,5-i*2,1);if(gap>45)otxt3(g,Math.round(gap)+'M',x,y-10,'#ffe8a0',1,'c');}
    else if(gap>0){const side=p?Math.sign(p[0]-W/2):Math.sign(TG.u-BK.u)||1,x=side>0?W-10:9,y=Math.round(H*.42);g.fillStyle=blink?'#ffd040':'#ff9a20';
      for(let i=0;i<4;i++)g.fillRect(x+(side>0?i:-i),y-3+i,1,7-i*2);otxt3(g,Math.round(gap)+'M',x-side*4,y+6,'#ffe8a0',1,side>0?'r':'');}
  }
}
function drawPlayHUD(){
  const B=BK,blink=(S.clock*4|0)%2;
  /* time */
  otxt3(g,'TIME',4,3,'#ffd040');const tc=S.time<10?(blink?'#ff4a5a':'#ffffff'):GR.volt;otxt5(g,String(Math.max(0,Math.ceil(S.time))).padStart(2,'0'),4,10,tc,2);
  /* score */
  otxt3(g,'SCORE',W-4,3,'#9fe6ff',1,'r');otxt5(g,fmt(S.score),W-4,10,'#ffffff',1,'r');
  /* stage + target meter / damage bar */
  const cx=W/2,bw=Math.min(110,W*.36);otxt3(g,(S.stage+1)+' '+ST.name,cx,3,'#c8b8ff',1,'c');
  if(!S.contact){const gap=Math.max(0,TG.s-B.s),k=clamp(gap/ST.gap,0,1),x0=Math.round(cx-bw/2);
    g.fillStyle='rgba(10,8,24,.7)';g.fillRect(x0-1,11,bw+2,5);for(let i=0;i<bw;i+=3){g.fillStyle='#3a3060';g.fillRect(x0+i,13,1,1);}
    g.fillStyle='#4fe3ff';g.fillRect(x0,12,2,3);const vx=Math.round(x0+2+k*(bw-4));g.fillStyle=blink?'#ffd040':'#ffae20';g.fillRect(vx-1,11,3,5);
    otxt3(g,'TARGET '+Math.round(gap)+'M',cx,18,'#ffe0a0',1,'c');}
  else{const x0=Math.round(cx-bw/2);otxt3(g,'DAMAGE',x0,11,'#ff8a9a');otxt3(g,Math.round(TG.dmg)+'%',x0+bw,11,'#ffffff',1,'r');
    g.fillStyle='rgba(10,8,24,.8)';g.fillRect(x0-1,17,bw+2,6);const n=Math.round(bw*TG.dmg/100);
    for(let i=0;i<bw;i+=2){const on=i<n;g.fillStyle=on?(TG.hitFlash>0&&blink?'#ffffff':i/bw<.5?'#ffd040':i/bw<.8?'#ff8a20':'#ff3040'):'#2a2040';g.fillRect(x0+i,18,1,4);}}
  /* speed */
  const kmh=Math.round(B.vs*3.6),sx=W-4;otxt5(g,String(kmh),sx-17,H-17,B.nitroT>0?GR.cyan:'#ffffff',2,'r');otxt3(g,'KM',sx,H-16,'#9fe6ff',1,'r');otxt3(g,'/H',sx,H-10,'#9fe6ff',1,'r');
  const segs=22,lit=Math.round(segs*clamp(B.vs/(ST.top+33),0,1));for(let i=0;i<segs;i++){const x=sx-segs*3+i*3+1;g.fillStyle=i<lit?(i>16?'#ff4ad8':i>12?'#ffd040':'#4fe3ff'):'#2a2440';g.fillRect(x,H-21-Math.round(i*.18),2,2);}
  /* nitro */
  otxt3(g,'NITRO',4,H-17,'#7fe8ff');for(let i=0;i<3;i++){const on=i<B.nitros,x=4+i*9,y=H-10;g.fillStyle='#000';g.fillRect(x-1,y-1,9,7);g.fillStyle=on?(B.nitroT>0?'#ffffff':'#4fe3ff'):'#232040';g.fillRect(x,y,7,5);if(on){g.fillStyle='#08283a';g.fillRect(x+3,y+1,1,3);g.fillRect(x+2,y+2,3,1);}}
  if(B.nitroT>0)bar(4,H-3,26,1,B.nitroT/2.6,'#ffffff','#7fe8ff');
  if(S.chain>1&&S.chainT>0)otxt3(g,'CHAIN x'+Math.min(8,S.chain),W/2,H-9,S.chain>4?'#ff5ad8':'#ffd040',1,'c');
  if(B.scrape>.5&&blink)otxt3(g,'WALL',W/2,H-16,'#ff7a5a',1,'c');
}
function drawMsgs(){
  let y=Math.round(S.big?H*.2+(W>=300?2:1)*7+14:H*.2);
  for(let i=S.msgs.length-1;i>=0;i--){const m=S.msgs[i],a=clamp((m.dur-m.t)*4,0,1),pop=m.t<.08?2:1;g.globalAlpha=a;otxt5(g,m.text,W/2,y-Math.round(m.t*8),m.col,pop,'c');g.globalAlpha=1;y+=11;}
  if(S.big){const b=S.big,a=clamp((2.6-b.t)*3,0,1),slide=Math.round(Math.max(0,.18-b.t)*W*3),sc=W>=300?2:1;g.globalAlpha=a;
    otxt5(g,b.text,W/2+slide,Math.round(H*.2),[b.col,b.col,'#ffffff',b.col,b.col,b.col,b.col],sc,'c',.12);if(b.sub)otxt3(g,b.sub,W/2-slide,Math.round(H*.2)+7*sc+4,'#ffffff',1,'c');g.globalAlpha=1;}
}
function drawRadio(){
  const r=S.radio;if(!r)return;const n=Math.floor(r.t*42),w=Math.min(W-8,Math.max(...r.lines.map(l=>tw3(l)))+30),h=8+r.lines.length*7,x=4,y=H-26-h,a=clamp((r.dur-r.t)*3,0,1),slide=Math.round(Math.max(0,.15-r.t)*-300);
  g.globalAlpha=a;panel(x+slide,y,w,h);face(x+slide+3,y+Math.max(1,(h-18)>>1),(S.clock*9|0)%2&&n<r.lines.join('').length);
  let used=0;for(let i=0;i<r.lines.length;i++){const L=r.lines[i],k=clamp(n-used,0,L.length);used+=L.length;if(k>0)txt3(g,L.slice(0,k),x+slide+23,y+4+i*7,i===0?'#7fe8ff':'#e8e4ff');}
  g.globalAlpha=1;
}
function logo(y){
  const sc=W>=300?4:3,x=W/2;
  txt5(g,'PRISMA',x,y+1,'#000',sc,'c',.18);
  g.globalAlpha=.8;txt5(g,'PRISMA',x-1,y,'#ff2a9a',sc,'c',.18);txt5(g,'PRISMA',x+1,y,'#2ad8ff',sc,'c',.18);g.globalAlpha=1;
  txt5(g,'PRISMA',x,y,['#ffffff','#ffffff','#ffe8fa','#ffc8ee','#ff9ad8','#e070ff','#9a60ff'],sc,'c',.18);
  const sw=tw5('PRISMA',sc),cols=['#ff3050','#ff9a20','#ffe040','#40ff80','#30d8ff','#a060ff'];
  for(let i=0;i<6;i++){const yy=y+7*sc+3+i,x0=Math.round(x-sw/2+i*.7);for(let k=0;k<sw-4;k++){const sh=.55+.45*Math.sin(k*.21-S.clock*5+i*.6);g.globalAlpha=sh;g.fillStyle=cols[i];g.fillRect(x0+k,yy,1,1);}}g.globalAlpha=1;
}
const MENU=()=>['START CHASE','HOW TO PLAY','ASSIST: '+(ASSIST?'ON':'OFF')];
function menuRows(){const y0=Math.round(H*.6);return MENU().map((t,i)=>({t,y:y0+i*11}));}
function drawTitle(){
  g.fillStyle='rgba(4,2,12,.35)';g.fillRect(0,0,W,H);
  logo(Math.round(H*.14));otxt3(g,'NIGHT PURSUIT UNIT',W/2,Math.round(H*.14)+(W>=300?4:3)*7+12,'#c8c0e8',1,'c');
  if(S.how>=0){drawHow();return;}
  for(const [i,r] of menuRows().entries()){const sel=i===S.menuI;
    if(sel){g.fillStyle='rgba(255,79,216,.22)';g.fillRect(Math.round(W/2-60),r.y-2,120,11);}
    otxt5(g,r.t,W/2,r.y,sel?'#ffffff':'#9890b8',1,'c');if(sel&&(S.clock*3|0)%2){otxt5(g,'>',W/2-56,r.y,'#ff5ad8');otxt5(g,'<',W/2+52,r.y,'#ff5ad8');}}
  otxt3(g,'HI '+fmt(S.hi),4,H-8,'#8890b0');otxt3(g,'HYPERDOT ARCADE',W-4,H-8,'#8890b0',1,'r');
  otxt3(g,(S.attractN%4||4)+' '+ST.name,W/2,H-8,'#6a6488',1,'c');
}
const HOW=[
  ['THE GOLD VAN IS OUT AHEAD.','CATCH IT BEFORE THE CLOCK','RUNS OUT, THEN RAM IT UNTIL','ITS DAMAGE BAR IS FULL.','','CATCHING UP ADDS 25 SECONDS.'],
  ['STEER     A D / ARROWS / STICK','NITRO     SPACE / NITRO, 3 A STAGE','BRAKE     S / BRAKE','','NITRO RAMS HIT TWICE AS HARD.','NEAR MISSES, AIR AND PADS SCORE.','ASSIST NUDGES YOU PAST TRAFFIC.']
];
function drawHow(){
  const p=HOW[S.how],w=Math.min(W-16,150),h=p.length*7+20,x=Math.round(W/2-w/2),y=Math.round(H*.5);panel(x,y,w,h,'rgba(255,79,216,.6)');
  p.forEach((l,i)=>txt3(g,l,x+6,y+6+i*7,i===0&&S.how===0?'#ffd040':'#e8e4ff'));otxt3(g,(S.how+1)+'/2  '+(touchy?'TAP':'PRESS START'),W/2,y+h-8,'#ff9ad8',1,'c');
}
function drawIntro(){
  const t=S.t;
  if(t<3.6){const a=clamp(t*3,0,1)*clamp((3.6-t)*3,0,1),sc=W>=300?2:1;g.globalAlpha=a;
    otxt3(g,'STAGE '+(S.stage+1),W/2,Math.round(H*.18),'#ffd040',1,'c');otxt5(g,ST.name,W/2,Math.round(H*.18)+8,[ '#ffffff','#ffffff',rgba(ST.N2.map(v=>v*255)),rgba(ST.N2.map(v=>v*200)),rgba(ST.N1.map(v=>v*255)),rgba(ST.N1.map(v=>v*200)),rgba(ST.N1.map(v=>v*150))],sc,'c',.12);
    otxt3(g,ST.area,W/2,Math.round(H*.18)+8+7*sc+4,'#c8c0e8',1,'c');g.globalAlpha=1;}
  else{const k=Math.floor(t-3.6),f=(t-3.6)%1,txt=k<3?String(3-k):'GO!',sc=Math.round((W>=300?4:3)*(1+Math.max(0,.25-f)*2));
    otxt5(g,txt,W/2,Math.round(H*.32-sc*3.5),k<3?GR.volt:GR.green,sc,'c');}
}
function drawTally(){
  const T=S.tally,w=Math.min(W-16,170),x=Math.round(W/2-w/2),y=Math.round(H*.2),h=T.rows.length*9+40;
  panel(x,y,w,h,'rgba(255,208,64,.6)');otxt5(g,'STAGE '+(S.stage+1)+' CLEAR',W/2,y+5,GR.volt,1,'c');
  T.rows.forEach((r,i)=>{if(i>=T.shown)return;const yy=y+18+i*9;txt3(g,r[0],x+6,yy,'#c8c0e8');txt3(g,r[1],x+w*.58,yy,'#ffffff');if(r[2])txt3(g,'+'+fmt(r[2]),x+w-6,yy,'#ffd040',1,'r');});
  const yy=y+h-13;txt3(g,'SCORE',x+6,yy,'#9fe6ff');txt5(g,fmt(S.score),x+w-6,yy-1,'#ffffff',1,'r');
  if(T.paid>=T.pay&&T.shown>=T.rows.length&&(S.clock*2|0)%2)otxt3(g,(S.stage<3?'NEXT  '+STAGES[S.stage+1].name:'FINAL REPORT')+'   '+(touchy?'TAP':'PRESS START'),W/2,y+h+4,'#ff9ad8',1,'c');
}
function drawCenter(title,col,lines){
  const sc=W>=300?3:2;g.fillStyle='rgba(4,2,12,.55)';g.fillRect(0,0,W,H);otxt5(g,title,W/2,Math.round(H*.2),col,sc,'c',.12);
  lines.forEach((l,i)=>{if(l)otxt5(g,l[0],W/2,Math.round(H*.2)+7*sc+10+i*11,l[1],1,'c');});
}
function drawOverlay(dt){
  const m=S.mode;
  if(m==='play'||m==='caught'||m==='intro'){drawWorldHUD(dt);if((m!=='intro'||S.t>3.6)&&(m!=='caught'||S.t<1.2))drawPlayHUD();}
  else if(m==='title'){if(ST.rain&&!reduce)radial(RAIN,dt,.25+BK.vs/90,.05,'#a8c4ff',.2,.04);drawSparks();}
  else drawSparks();
  if(m==='intro')drawIntro();
  if(m!=='title')drawMsgs();
  drawRadio();
  if(m==='title')drawTitle();
  else if(m==='tally')drawTally();
  else if(m==='timeup'){const blink=(S.clock*3|0)%2;drawCenter('TIME UP',GR.red,[['HE GOT AWAY','#ffb0b8'],null,['CONTINUE?  '+Math.max(0,Math.ceil(S.count-.01)),'#ffd040'],[blink?(touchy?'TAP TO CONTINUE':'PRESS START'):'','#ff9ad8'],['SCORE RESETS ON CONTINUE','#8880a8']]);}
  else if(m==='over')drawCenter('GAME OVER',GR.steel,[[fmt(S.score),'#ffffff'],[S.tickets+' TICKETS','#ffd040'],[S.newHi&&(S.clock*4|0)%2?'NEW HIGH SCORE':'','#6aff5a'],['HI '+fmt(S.hi),'#8890b0']]);
  else if(m==='ending'&&S.t>1.5)drawCenter('CITY SECURE',GR.cyan,[['ALL SUSPECTS APPREHENDED','#c8c0e8'],[fmt(S.score),'#ffffff'],[S.tickets+' TICKETS','#ffd040'],[S.newHi&&(S.clock*4|0)%2?'NEW HIGH SCORE':'','#6aff5a']]);
  if(S.paused){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,W,H);otxt5(g,'PAUSED',W/2,Math.round(H*.3),GR.steel,2,'c');
    ['RESUME',EMBED?'EXIT':'QUIT TO TITLE'].forEach((t,i)=>{const y=Math.round(H*.55)+i*12,sel=i===S.pauseI;otxt5(g,(sel?'> ':'  ')+t+(sel?' <':'  '),W/2,y,sel?'#ffffff':'#9890b8',1,'c');});}
}

/* =====================================================================================
   FRAME LOOP — fixed 60 Hz simulation, one render per display frame
   ===================================================================================== */
const UIP={};
function edges(c){const e={};for(const k of ['ok','back','pause','a','u','d']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}return e;}
function rowAt(y){for(const [i,r] of menuRows().entries())if(y>=r.y-3&&y<=r.y+9)return i;return -1;}
function menuAct(i){
  if(i===0)APP_start();else if(i===1){S.how=0;SFX.confirm();}
  else{ASSIST=!ASSIST;store.set('hd-prisma-assist',ASSIST?'1':'0');SFX.confirm();}
}
function tick(dt){
  const c=readCtl(),e=edges(c),tap=PTR.pressed;S.t+=dt;
  if((S.mode==='play'||S.mode==='intro')&&e.pause){setPause(!S.paused);return;}
  if(S.paused){
    if(e.u||e.d){S.pauseI^=1;SFX.move();}
    const ti=tap?(PTR.y>H*.55-3&&PTR.y<H*.55+9?0:PTR.y>H*.55+9&&PTR.y<H*.55+21?1:-1):-1;
    if(e.ok||ti>=0){const i=ti>=0?ti:S.pauseI;if(i===0)setPause(false);else{setPause(false);if(EMBED)ARC.exit();APP_attract();}}
    return;
  }
  const m=S.mode;
  if(m==='title'){
    if(S.how>=0){if(e.ok||tap){S.how++;SFX.move();if(S.how>1)S.how=-1;}else if(e.back){S.how=-1;SFX.back();}}
    else{if(e.u){S.menuI=(S.menuI+2)%3;SFX.move();}if(e.d){S.menuI=(S.menuI+1)%3;SFX.move();}
      if(tap){const i=rowAt(PTR.y);if(i>=0){S.menuI=i;menuAct(i);return;}APP_start();return;}
      if(e.ok){menuAct(S.menuI);if(S.mode!=='title')return;}
      else if(e.back&&EMBED)ARC.exit();}
    worldStep(dt,autopilot(),true);
    if((TG.state==='caught'&&S.caughtT>6)||S.t>55)APP_attract();
  }
  else if(m==='intro'){
    const t0=S.t-dt;if(t0<3.6&&S.t>=3.6||t0<4.6&&S.t>=4.6||t0<5.6&&S.t>=5.6)SFX.beep();
    if(S.t>=6.6){S.mode='play';S.t=0;SFX.go();BK.vs=20;}
    else if((e.ok||tap)&&S.t<3.5)S.t=3.5;
    worldStep(dt,null,false);
  }
  else if(m==='play'){
    const ctl={x:c.x,brake:c.b,nitro:e.a||(tap&&!PTR.touch)};
    if(window.__auto)Object.assign(ctl,autopilot());
    S.time-=dt;if(S.time<10&&Math.ceil(S.time)!==Math.ceil(S.time+dt)&&S.time>0)SFX.warn();
    worldStep(dt,ctl,true);
    if(S.mode==='play'&&S.time<=0){S.time=0;timeUp();}
  }
  else if(m==='caught'){worldStep(dt,null,false);if(S.t>4.8)startTally();}
  else if(m==='tally'){
    worldStep(dt,null,false);const T=S.tally;T.t+=dt;
    if(T.shown<T.rows.length){if(T.t>.45){T.t=0;T.shown++;SFX.tick();}}
    else if(T.paid<T.pay){const k=Math.min(T.pay-T.paid,Math.max(50,Math.round(T.pay*dt*.9)));T.paid+=k;addScore(k);SFX.tick();}
    if(e.ok||tap){if(T.shown<T.rows.length||T.paid<T.pay){addScore(T.pay-T.paid);T.paid=T.pay;T.shown=T.rows.length;}else nextStage();}
    else if(S.t>16&&T.paid>=T.pay)nextStage();
  }
  else if(m==='timeup'){worldStep(dt,null,false);S.count-=dt;
    if(S.t>.8&&(e.ok||tap)){S.cont++;S.score=0;ARC.score(0);startStage(S.stage);SFX.confirm();}
    else if(S.count<=0)gameOver();}
  else if(m==='over'){worldStep(dt,null,false);if(S.t>1.5&&(e.ok||tap))APP_attract();else if(EMBED&&S.t>1.5&&e.back)ARC.exit();else if(S.t>25)APP_attract();}
  else if(m==='ending'){worldStep(dt,null,false);if(S.t>3&&(e.ok||tap))APP_attract();else if(S.t>40)APP_attract();}
}
let ACC=0,LAST=0;
function frame(ts){
  const ms=LAST?ts-LAST:16.7,dt=Math.min(.05,ms/1000);LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0)endInputFrame();
  if(!window.__noDraw)render(dt);musicTick(S.paused);ambUpdate();
  /* auto quality: fewer march steps when the GPU falls behind */
  if(QUAL.auto&&!document.hidden){QUAL.ema+=(Math.min(ms,80)-QUAL.ema)*.05;QUAL.t+=dt;
    if(QUAL.t>1.2){QUAL.t=0;if(QUAL.ema>23&&QUAL.steps>60){QUAL.steps=Math.max(60,QUAL.steps-12);QUAL.drops++;}else if(QUAL.ema<18&&QUAL.steps<136)QUAL.steps+=4;
      if(QUAL.ema>30&&QUAL.steps<=60&&resI>0&&QUAL.drops>3){setRes(resI-1);QUAL.drops=0;}}}
  requestAnimationFrame(frame);
}
function render(dt){
  updateCamera(S.paused?0:dt);frameUniforms();
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);drawOverlay(S.paused?0:dt);
  FLASH=reduce?0:S.flash*.25;
  present();
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setRes((resI+1)%RES.length);QUAL.drops=0;e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('resize',resize);
if(!gl||GLERR){$('err').style.display='grid';if(GLERR)$('err').textContent='PRISMA could not build its city shader on this graphics card. '+GLERR.slice(0,300);}
if(AU.muted)$('snd').textContent='Sound off';
if(gl){setRes(resI);resize();stageUniforms();APP_attract();
  ARC.post('ready',{title:CAB.title,w:W,h:H,tickets:CAB.tickets});
  window.__pr={AU,S,BK,TG,TR,FEAT,DR,CAM,QUAL,KEY,LATCH,PTR,TS,tick,ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},start:APP_start,attract:APP_attract,setRes,startStage,STAGES,get ST(){return ST;},render,autopilot,cam(f){CAMOV=f;}};
  requestAnimationFrame(frame);}
