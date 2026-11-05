/* =====================================================================================
   5. CAMERA + HUD
   Two views: CHASE (behind and above, like the original) and HELMET (in the rider's visor,
   leaning with the bike). Speed drops the chase camera a little, pulls it back, widens the
   lens and adds a fine shake, so 400 km/h feels like 400 km/h.
   The HUD is the original's dot-matrix HUD, laid out for a full screen: the corners stay
   clear for your thumbs, and speed and nitro sit at the bottom in the middle.
   ===================================================================================== */
const v3={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];},lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]};
let CAMOV=null;
const CAM={eye:[0,3,-8],f:[0,0,1],r:[1,0,0],u:[0,1,0],fov:1,lu:0,lh:0,roll:0,s:0,shT:0};
const VIEW={mode:store.get('hd-prisma3d-view','0')==='1'?1:0};
function setView(m){VIEW.mode=m;store.set('hd-prisma3d-view',String(m));}
function lookAt(eye,at,roll){
  const f=v3.norm(v3.sub(at,eye));let r=v3.norm(v3.cross([0,1,0],f)),u=v3.cross(f,r);
  if(roll){const c=Math.cos(roll),s=Math.sin(roll),r2=v3.add(v3.mul(r,c),v3.mul(u,s)),u2=v3.sub(v3.mul(u,c),v3.mul(r,s));r=r2;u=u2;}
  CAM.eye=eye;CAM.f=f;CAM.r=r;CAM.u=u;CAM.s=eye[2];
}
function chasePose(dt){
  const B=BK;CAM.lu+=(B.u-CAM.lu)*Math.min(1,dt*7);CAM.lh+=(B.h-CAM.lh)*Math.min(1,dt*(B.air?3.5:8));
  const sp=clamp(B.vs/100,0,1.4);
  const back=5.1+sp*1.3+(B.nitroT>0?1.6:0),up=2.05-sp*.25;
  return [W3(B.s-back,CAM.lu*.9,CAM.lh*.75+up),W3(B.s+14,B.u*.72+CAM.lu*.28,CAM.lh*.55+1.0)];
}
function helmetPose(){
  const B=BK,ln=bikeLean(),yr=Math.atan2(B.vu,Math.max(1,B.vs));
  const hx=B.u+Math.sin(ln)*1.45*1.08,hy=B.h+.05+Math.cos(ln)*1.5*1.08;
  return [W3(B.s+.3,hx,hy),W3(B.s+30,B.u+Math.sin(yr)*30*.6,B.h+1.25)];
}
const smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
function updateCamera(dt){
  const B=BK,ni=B.nitroT>0?1:0,sp=clamp(B.vs/100,0,1.4);let eye,at,roll=B.bank*.3,fov=.86+B.vs/380+ni*.14+(B.boostT>0?.06:0);
  const m=S.mode,helm=VIEW.mode===1&&(m==='play'||(m==='intro'&&S.t>3.6));
  if(m==='intro'){const k=smooth((S.t-.3)/3.4),[ce,ca]=VIEW.mode===1?helmetPose():chasePose(dt);
    eye=v3.lerp(W3(B.s-34,-6,24),ce,k);at=v3.lerp(W3(B.s+70,0,3),ca,k);roll*=k;}
  else if(m==='caught'||m==='tally'||(TG.state==='caught'&&m==='title')){
    const a=S.clock*.32+.6,R=m==='tally'?16:12.5,room=limAt(TG.s)-(ST.id===2?.5:1.8);
    eye=W3(TG.s+Math.sin(a)*R,clamp(TG.u+Math.cos(a)*R*.75,-room,room),m==='tally'?6.5:4.2);at=W3(TG.s,TG.u,1.1);roll=0;fov=1;}
  else if(m==='ending'){const k=Math.min(1,S.t/14);eye=W3(BK.s-30-k*10,0,4+k*60);at=W3(BK.s+80,0,6+k*25);roll=0;fov=1.05;}
  else if(m==='title'){
    S.camT+=dt;if(S.camT>7){S.camT=0;S.camMode=(S.camMode+1)%4;}
    const cm=S.camMode;
    if(cm===0){[eye,at]=chasePose(dt);}
    else if(cm===1){const sd=B.u>0?-1:1;eye=W3(B.s-4.5+S.camT*.25,B.u+sd*2.6,.6);at=W3(B.s+6,B.u-sd*.4,1.2);roll=sd*.06;fov=.85;}
    else if(cm===2&&!(TG.s-B.s>-6&&TG.s-B.s<22)){eye=W3(B.s+9.5,B.u*.7,1.4);at=W3(B.s-2,B.u,1.1);roll=0;fov=.9;}
    else if(cm===2){[eye,at]=chasePose(dt);}
    else{eye=W3(B.s-26,0,21+Math.sin(S.camT*.4)*2);at=W3(B.s+32,B.u*.5,0);roll=0;fov=1;}
  }
  else if(helm){[eye,at]=helmetPose();roll=bikeLean()*.85;fov+=.1;}
  else{[eye,at]=chasePose(dt);}
  if(CAMOV){const o=CAMOV(B);eye=o[0];at=o[1];roll=o[3]||0;fov=o[2]||1;}
  /* shake: hits and landings, plus a fine buzz that grows with speed */
  if(!reduce&&!CAMOV){CAM.shT+=dt;let k=S.shake*S.shake;
    const buzz=(m==='play'?1:0)*Math.max(0,sp-.55)*.045*(helm?.6:1)+(ni?.03:0);
    const n1=Math.sin(CAM.shT*61)*.5+Math.sin(CAM.shT*97+1.3)*.5,n2=Math.sin(CAM.shT*73+2.1)*.5+Math.sin(CAM.shT*113)*.5;
    eye=v3.add(eye,[(rnd(-1,1)*k*.35)+n1*buzz,(rnd(-1,1)*k*.25)+n2*buzz,0]);at=v3.add(at,[rnd(-1,1)*k*.2,rnd(-1,1)*k*.2,0]);}
  CAM.fov+=(fov-CAM.fov)*Math.min(1,dt*3);CAM.roll+=(roll-CAM.roll)*Math.min(1,dt*(helm?9:5));
  lookAt(eye,at,CAM.roll);
}
/* project a world point onto the HUD's dot matrix (for the target marker) */
function project(p){const v=v3.sub(p,CAM.eye),z=v3.dot(v,CAM.f);if(z<.4)return null;return [W/2+v3.dot(v,CAM.r)/z/CAM.fov*H,H/2-v3.dot(v,CAM.u)/z/CAM.fov*H,z];}

/* =====================================================================================
   HUD — drawn on a transparent W x H dot matrix that the final pass lays over the 3D city
   ===================================================================================== */
const FACE=['......HHHH......','....HHHHHHHH....','...HHHHHHHHHH...','..HHHHHHHHHHHH..','..HHHSSSSSSHHH..','.gHHSSSSSSSSHHg.','.gHSSSSSSSSSSHg.','.gHSEESSSSEESHg.',
  '.gHSSSSSSSSSSHg.','.ggSSSSNNSSSSgg.','..HSSSSSSSSSSH..','..HSSSMMMMSSSmH.','...HSSSSSSSSmm..','....SSSSSSSm....','.....SSSSS......','....CCCCCCCC....','..CCCCBCCCCCCC..','.CCCCCCCCCCCCCC.'];
const FACEC={H:'#3c1c5c',S:'#e8a888',E:'#1a1030',N:'#c88068',M:'#a03850',g:'#8a96b0',m:'#d0d8e8',C:'#2a4aa8',B:'#ffd040'};
function face(x,y,talk){
  for(let j=0;j<FACE.length;j++)for(let i=0;i<16;i++){let ch=FACE[j][i];if(ch==='.')continue;if(ch==='M'&&!talk)ch='N';if(ch==='E'&&(S.clock%3.2)>3.05)ch='S';g.fillStyle=FACEC[ch];g.fillRect(x+i,y+j,1,1);}
  if((S.clock*2|0)%2){g.fillStyle='#ff3040';g.fillRect(x+14,y+12,1,1);}
}
function panel(x,y,w,h,edge){g.fillStyle='rgba(8,6,22,.78)';g.fillRect(x,y,w,h);g.fillStyle=edge||'rgba(79,227,255,.55)';g.fillRect(x,y,w,1);g.fillRect(x,y+h-1,w,1);g.fillRect(x,y,1,h);g.fillRect(x+w-1,y,1,h);}
function bar(x,y,w,h,k,c1,c2,bg){g.fillStyle=bg||'rgba(40,30,60,.85)';g.fillRect(x,y,w,h);const n=Math.round(w*clamp(k,0,1));for(let i=0;i<n;i+=2){g.fillStyle=i/w<.5?c1:c2;g.fillRect(x+i,y,1,h);}}
/* the pause button covers the top-right corner when it's on screen: keep the score clear of it */
function rightInset(){const on=!EMBED&&(S.mode==='play'||S.mode==='intro')&&!S.paused;return on?Math.round(54/Math.max(1,innerHeight)*H)+2:4;}
function drawWorldHUD(){
  if(TG.on&&TG.state!=='caught'&&(S.mode==='play'||(S.mode==='intro'&&S.t>3.6))){
    const gap=TG.s-BK.s,p=project(W3(TG.s,TG.u,TG.h+3.6)),blink=(S.clock*4|0)%2;
    if(p&&p[0]>-4&&p[0]<W+4&&p[1]>-4&&p[1]<H){const x=Math.round(p[0]),y=Math.round(p[1]);g.fillStyle=blink?'#ffd040':'#ff9a20';
      for(let i=0;i<3;i++)g.fillRect(x-2+i,y-3+i,5-i*2,1);if(gap>45)otxt3(g,Math.round(gap)+'M',x,y-10,'#ffe8a0',1,'c');}
    else if(gap>0){const side=p?Math.sign(p[0]-W/2):Math.sign(TG.u-BK.u)||1,x=side>0?W-10:9,y=Math.round(H*.42);g.fillStyle=blink?'#ffd040':'#ff9a20';
      for(let i=0;i<4;i++)g.fillRect(x+(side>0?i:-i),y-3+i,1,7-i*2);otxt3(g,Math.round(gap)+'M',x-side*4,y+6,'#ffe8a0',1,side>0?'r':'');}
  }
}
function drawPlayHUD(){
  const B=BK,blink=(S.clock*4|0)%2,ri=rightInset();
  otxt3(g,'TIME',4,3,'#ffd040');const tc=S.time<10?(blink?'#ff4a5a':'#ffffff'):GR.volt;otxt5(g,String(Math.max(0,Math.ceil(S.time))).padStart(2,'0'),4,10,tc,2);
  otxt3(g,'SCORE',W-ri,3,'#9fe6ff',1,'r');otxt5(g,fmt(S.score),W-ri,10,'#ffffff',1,'r');
  const cx=W/2,bw=Math.min(110,W*.3);otxt3(g,(S.stage+1)+' '+ST.name,cx,3,'#c8b8ff',1,'c');
  if(!S.contact){const gap=Math.max(0,TG.s-B.s),k=clamp(gap/ST.gap,0,1),x0=Math.round(cx-bw/2);
    g.fillStyle='rgba(10,8,24,.7)';g.fillRect(x0-1,11,bw+2,5);for(let i=0;i<bw;i+=3){g.fillStyle='#3a3060';g.fillRect(x0+i,13,1,1);}
    g.fillStyle='#4fe3ff';g.fillRect(x0,12,2,3);const vx=Math.round(x0+2+k*(bw-4));g.fillStyle=blink?'#ffd040':'#ffae20';g.fillRect(vx-1,11,3,5);
    otxt3(g,'TARGET '+Math.round(gap)+'M',cx,18,'#ffe0a0',1,'c');}
  else{const x0=Math.round(cx-bw/2);otxt3(g,'DAMAGE',x0,11,'#ff8a9a');otxt3(g,Math.round(TG.dmg)+'%',x0+bw,11,'#ffffff',1,'r');
    g.fillStyle='rgba(10,8,24,.8)';g.fillRect(x0-1,17,bw+2,6);const n=Math.round(bw*TG.dmg/100);
    for(let i=0;i<bw;i+=2){const on=i<n;g.fillStyle=on?(TG.hitFlash>0&&blink?'#ffffff':i/bw<.5?'#ffd040':i/bw<.8?'#ff8a20':'#ff3040'):'#2a2040';g.fillRect(x0+i,18,1,4);}}
  /* speed and nitro, bottom middle */
  const kmh=Math.round(B.vs*3.6),sx=Math.round(W/2)+18;otxt5(g,String(kmh),sx,H-17,B.nitroT>0?GR.cyan:'#ffffff',2,'r');otxt3(g,'KM',sx+4,H-16,'#9fe6ff');otxt3(g,'/H',sx+4,H-10,'#9fe6ff');
  const segs=22,lit=Math.round(segs*clamp(B.vs/(ST.top+33),0,1));for(let i=0;i<segs;i++){const x=Math.round(W/2)-33+i*3;g.fillStyle=i<lit?(i>16?'#ff4ad8':i>12?'#ffd040':'#4fe3ff'):'#2a2440';g.fillRect(x,H-22-Math.round(i*.18),2,2);}
  const nx=Math.round(W/2)-62;otxt3(g,'NITRO',nx,H-17,'#7fe8ff');for(let i=0;i<3;i++){const on=i<B.nitros,x=nx+i*9,y=H-10;g.fillStyle='#000';g.fillRect(x-1,y-1,9,7);g.fillStyle=on?(B.nitroT>0?'#ffffff':'#4fe3ff'):'#232040';g.fillRect(x,y,7,5);if(on){g.fillStyle='#08283a';g.fillRect(x+3,y+1,1,3);g.fillRect(x+2,y+2,3,1);}}
  if(B.nitroT>0)bar(nx,H-3,26,1,B.nitroT/2.6,'#ffffff','#7fe8ff');
  if(S.chain>1&&S.chainT>0)otxt3(g,'CHAIN x'+Math.min(8,S.chain),W/2,H-32,S.chain>4?'#ff5ad8':'#ffd040',1,'c');
  if(B.scrape>.5&&blink)otxt3(g,'WALL',W/2,H-40,'#ff7a5a',1,'c');
}
function drawMsgs(){
  let y=Math.round(S.big?H*.31+(W>=300?2:1)*7+14:H*.31);
  for(let i=S.msgs.length-1;i>=0;i--){const m=S.msgs[i],a=clamp((m.dur-m.t)*4,0,1),pop=m.t<.08?2:1;g.globalAlpha=a;otxt5(g,m.text,W/2,y-Math.round(m.t*8),m.col,pop,'c');g.globalAlpha=1;y+=11;}
  if(S.big){const b=S.big,a=clamp((2.6-b.t)*3,0,1),slide=Math.round(Math.max(0,.18-b.t)*W*3),sc=W>=300?2:1;g.globalAlpha=a;
    otxt5(g,b.text,W/2+slide,Math.round(H*.31),[b.col,b.col,'#ffffff',b.col,b.col,b.col,b.col],sc,'c',.12);if(b.sub)otxt3(g,b.sub,W/2-slide,Math.round(H*.31)+7*sc+4,'#ffffff',1,'c');g.globalAlpha=1;}
}
function drawRadio(){
  const r=S.radio;if(!r)return;const n=Math.floor(r.t*42),w=Math.min(W-8,Math.max(...r.lines.map(l=>tw3(l)))+30),h=8+r.lines.length*7,x=4,y=30,a=clamp((r.dur-r.t)*3,0,1),slide=Math.round(Math.max(0,.15-r.t)*-300);
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
  otxt3(g,'3D',Math.round(x+sw/2)+4,y+2,'#ffffff');
}
const MENU=()=>['START CHASE','HOW TO PLAY','ASSIST: '+(ASSIST?'ON':'OFF')];
function menuRows(){const y0=Math.round(H*.6);return MENU().map((t,i)=>({t,y:y0+i*11}));}
function drawTitle(){
  g.fillStyle='rgba(4,2,12,.3)';g.fillRect(0,0,W,H);
  logo(Math.round(H*.14));otxt3(g,'NIGHT PURSUIT UNIT',W/2,Math.round(H*.14)+(W>=300?4:3)*7+12,'#c8c0e8',1,'c');
  if(S.how>=0){drawHow();return;}
  for(const [i,r] of menuRows().entries()){const sel=i===S.menuI;
    if(sel){g.fillStyle='rgba(255,79,216,.22)';g.fillRect(Math.round(W/2-60),r.y-2,120,11);}
    otxt5(g,r.t,W/2,r.y,sel?'#ffffff':'#9890b8',1,'c');if(sel&&(S.clock*3|0)%2){otxt5(g,'>',W/2-56,r.y,'#ff5ad8');otxt5(g,'<',W/2+52,r.y,'#ff5ad8');}}
  otxt3(g,'HI '+fmt(S.hi),4,H-8,'#8890b0');otxt3(g,'HYPERDOT ARCADE',W-4,H-8,'#8890b0',1,'r');
  otxt3(g,(S.attractN%4||4)+' '+ST.name,W/2,H-8,'#6a6488',1,'c');
  if(!touchy&&!EMBED)otxt3(g,'A D STEER  SPACE NITRO  S BRAKE  C VIEW  ESC PAUSE',W/2,H-16,'#6a6488',1,'c');
}
const HOW=[
  ['THE GOLD VAN IS OUT AHEAD.','CATCH IT BEFORE THE CLOCK','RUNS OUT, THEN RAM IT UNTIL','ITS DAMAGE BAR IS FULL.','','CATCHING UP ADDS 25 SECONDS.'],
  ['STEER     A D / ARROWS / LEFT THUMB','NITRO     SPACE / NITRO, 3 A STAGE','BRAKE     S / BRAKE','VIEW      C, OR IN THE PAUSE MENU','','NITRO RAMS HIT TWICE AS HARD.','NEAR MISSES, AIR AND PADS SCORE.']
];
function drawHow(){
  const p=HOW[S.how],w=Math.min(W-16,168),h=p.length*7+20,x=Math.round(W/2-w/2),y=Math.round(H*.5);panel(x,y,w,h,'rgba(255,79,216,.6)');
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
/* the pause menu: everything that isn't driving lives here, so the play screen stays clear */
function pauseItems(){const q=QS.auto?'AUTO ('+qnow().name+')':qnow().name;
  return [['RESUME','resume'],['VIEW: '+(VIEW.mode?'HELMET':'CHASE'),'view'],['QUALITY: '+q,'qual'],['SOUND: '+(AU.muted?'OFF':'ON'),'snd'],[EMBED?'EXIT':'QUIT TO TITLE','quit']];}
const PAUSE_Y0=()=>Math.round(H*.38),PAUSE_DY=12;
function drawPause(){
  g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,W,H);otxt5(g,'PAUSED',W/2,Math.round(H*.18),GR.steel,2,'c');
  pauseItems().forEach(([t],i)=>{const y=PAUSE_Y0()+i*PAUSE_DY,sel=i===S.pauseI;if(sel){g.fillStyle='rgba(120,200,255,.18)';g.fillRect(Math.round(W/2-70),y-2,140,11);}
    otxt5(g,t,W/2,y,sel?'#ffffff':'#9890b8',1,'c');});
}
function drawOverlay(){
  const m=S.mode;
  if(m==='play'||m==='caught'||m==='intro'){drawWorldHUD();if((m!=='intro'||S.t>3.6)&&(m!=='caught'||S.t<1.2))drawPlayHUD();}
  if(m==='intro')drawIntro();
  if(m!=='title')drawMsgs();
  drawRadio();
  if(m==='title')drawTitle();
  else if(m==='tally')drawTally();
  else if(m==='timeup'){const blink=(S.clock*3|0)%2;drawCenter('TIME UP',GR.red,[['HE GOT AWAY','#ffb0b8'],null,['CONTINUE?  '+Math.max(0,Math.ceil(S.count-.01)),'#ffd040'],[blink?(touchy?'TAP TO CONTINUE':'PRESS START'):'','#ff9ad8'],['SCORE RESETS ON CONTINUE','#8880a8']]);}
  else if(m==='over')drawCenter('GAME OVER',GR.steel,[[fmt(S.score),'#ffffff'],[S.tickets+' TICKETS','#ffd040'],[S.newHi&&(S.clock*4|0)%2?'NEW HIGH SCORE':'','#6aff5a'],['HI '+fmt(S.hi),'#8890b0']]);
  else if(m==='ending'&&S.t>1.5)drawCenter('CITY SECURE',GR.cyan,[['ALL SUSPECTS APPREHENDED','#c8c0e8'],[fmt(S.score),'#ffffff'],[S.tickets+' TICKETS','#ffd040'],[S.newHi&&(S.clock*4|0)%2?'NEW HIGH SCORE':'','#6aff5a']]);
  if(S.paused)drawPause();
}
