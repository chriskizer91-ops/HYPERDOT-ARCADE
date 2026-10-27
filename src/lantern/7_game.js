/* =====================================================================================
   10. CABINET, SOUND EFFECTS, MUSIC
   ===================================================================================== */
const CAB={id:'lantern',title:'LANTERN',tickets:true};
const SFXT={};
function rl(k,ms){const t=performance.now();if(SFXT[k]&&t-SFXT[k]<ms)return false;SFXT[k]=t;return true;}
const SFX={
  move(){PATCH.glass(1568,now(),.12,.03);},
  confirm(){const t=now();PATCH.bell(659,t,1.2,.06);PATCH.box(1319,t+.05,.5,.05);},
  back(){PATCH.box(392,now(),.25,.05);},
  tick(){if(!rl('tk',45))return;PATCH.box(2093,now(),.08,.025);},
  shutter(open){if(!rl('sh',60))return;const t=now();noise(t,.03,.12,6000,2500,'bandpass',0,0,3);tone(open?1900:1200,t,.03,'square',.03,0,open?2600:800);},
  kindle(k){if(!rl('kd',90))return;noise(now(),.12,.05+k*.05,800+k*2400,1800+k*2600,'bandpass',0,.2,2);},
  lampLit(n){const t=now(),f=[523.3,587.3,659.3,784,880,987.8,1046.5,1174.7,1318.5,1568,1760,2093][Math.min(11,n)];noise(t,.5,.18,900,4000,'bandpass',0,.3,1.2,.02);PATCH.bell(f/2,t+.05,2.2,.09);PATCH.box(f,t+.08,1,.06);PATCH.box(f*1.5,t+.2,.9,.04);},
  burn(m){if(!rl('bn',40))return;const t=now();noise(t,.35,.16,7000,1400,'bandpass',0,.2,1.5);PATCH.glass(440*Math.pow(1.122,m||1),t,.35,.05);},
  chill(){const t=now();noise(t,.7,.22,300,2600,'bandpass',0,.5,1.4,.05);fm(110,t,.8,.5,6,.6,.12,AU.sfx,.5,.02);},
  flare(){const t=now();noise(t,.06,.6,9000,3000,'highpass');noise(t,2.2,.22,5000,1200,'bandpass',0,.4,.8);tone(90,t,.5,'sine',.4,0,40);fm(220,t,1.6,3.01,4,1.2,.07,AU.sfx,.5);},
  oil(){const t=now();for(let k=0;k<3;k++)tone(260-k*40,t+k*.07,.09,'sine',.12,0,180-k*30);},
  pickFlare(){const t=now();PATCH.box(1047,t,.4,.06);PATCH.box(1568,t+.08,.5,.05);},
  firefly(){if(!rl('ff',60))return;PATCH.glass(2637+Math.random()*400,now(),.3,.03);},
  moths(){const t=now();for(let k=0;k<6;k++)noise(t+k*.05,.04,.05,3000,1500,'bandpass',0,.1,4);},
  snufferCome(){const t=now();fm(73.4,t,2.4,1.41,5,2,.12,AU.sfx,.6,.4);PATCH.bell(146.8,t+.2,3,.06);},
  snuff(){const t=now();tone(880,t,.6,'sine',.06,0,180);noise(t,.9,.14,1200,200,'lowpass',0,.4);},
  toll(){const t=now();PATCH.bell(98,t,4,.16);PATCH.bell(196.4,t+.01,3.5,.06);},
  heartbeat(){const t=now();tone(60,t,.13,'sine',.22,0,42);tone(54,t+.16,.15,'sine',.17,0,38);},
  step(m){if(!rl('st',140))return;const t=now();if(m===M_GRASS||m===M_SAND)noise(t,.05,.025,1600,900,'bandpass',0,0,1.2);else if(m===M_BRIDGE)tone(170+Math.random()*30,t,.05,'triangle',.03);else noise(t,.03,.03,2600,1800,'bandpass',0,0,2);},
  die(){const t=now();fm(55,t,3.5,.5,8,3,.2,AU.sfx,.6,.05);noise(t,3,.2,400,60,'lowpass',0,.5);for(let k=0;k<5;k++)noise(t+.4+k*.35,.5,.05,600+k*200,2500,'bandpass',0,.5,6,.1);},
  dawn(){const t=now();[0,4,7,12,16].forEach((s,i)=>{PATCH.celst(mtof(67+s),t+i*.14,1.6,.06);});PATCH.pad(mtof(55),t,3.5,.03);},
  bossRise(){const t=now();fm(41.2,t,5,.5,9,4,.26,AU.sfx,.7,1.2);fm(61.7,t+.5,4.5,.71,6,3,.14,AU.sfx,.7,1);noise(t,5,.12,200,60,'lowpass',0,.6,1,1.5);},
  bossEye(){const t=now();PATCH.glass(196,t,1.2,.07);fm(98,t,1.2,2.76,4,1,.06,AU.sfx,.5);},
  bossHit(){const t=now();fm(65.4,t,1.5,.5,7,1.2,.18,AU.sfx,.5,.02);},
  bossDie(){const t=now();for(let k=0;k<12;k++)PATCH.glass(300+k*140,t+k*.09,1.4,.04);fm(32.7,t,4,.5,10,3,.25,AU.sfx,.7,.05);noise(t,4,.25,3000,80,'lowpass',0,.6);},
  great(){const t=now();PATCH.bell(65.4,t,6,.2);PATCH.bell(98,t+.02,5,.1);noise(t,2,.1,500,3000,'bandpass',0,.6,.8,.6);},
  lose(){const t=now();[523,466,392,311].forEach((f,i)=>PATCH.box(f,t+i*.25,.8,.06));}
};
/* ---- the sequencer: 12 or 16 steps a bar, FM voices. lead: scale degrees (1..g), '-' holds; bass R/O/F/T;
   bell: X struck. A waltz is written in 12 steps (three beats of four). ---- */
const SCALES={minor:[0,2,3,5,7,8,10],harm:[0,2,3,5,7,8,11],dorian:[0,2,3,5,7,9,10],major:[0,2,4,5,7,9,11],phryg:[0,1,3,5,7,8,10],lyd:[0,2,4,6,7,9,11]};
function sdeg(tr,d){const sc=SCALES[tr.scale],n=sc.length,o=Math.floor(d/n),i=((d%n)+n)%n;return sc[i]+12*o;}
const LEADCH='123456789abcdefg';
const TRACKS={
  title:{bpm:80,steps:12,root:50,scale:'harm',prog:[0,3,4,0,5,3,4,4],lead:'5---3-1-3---4---2-7-2---3---1-5-1---6---4-2-4---5-------7---',bass:'R...O...F...',pad:1,lv:.05,inst:'box',bell:'X...........'},
  n1:{bpm:84,steps:12,root:45,scale:'minor',prog:[0,5,3,4],lead:'1---3---5---4-3-2---1---6---5-4-3---2---',bass:'R...F...F...',pad:1,lv:.04,inst:'box'},
  n2:{bpm:72,steps:16,root:43,scale:'dorian',prog:[0,3,0,4],lead:'5-------4---3---2-------1-------',bass:'R.......O.......',pad:1,lv:.035,inst:'celst',drip:1},
  n3:{bpm:66,steps:12,root:41,scale:'phryg',prog:[0,1,0,5],lead:'1-----2-----1---7---5-------',bass:'R...........',pad:1,lv:.04,inst:'reed',bell:'X...........'},
  n4:{bpm:92,steps:16,root:46,scale:'harm',prog:[0,5,3,4],lead:'1-3-5-3-4-2-7---5-6-5-4-3-2-1---',bass:'R..R..O.R..R..F.',pad:1,lv:.035,inst:'box'},
  n5:{bpm:78,steps:12,root:38,scale:'minor',prog:[0,5,6,4],lead:'5---6---5---3---2---1---7---1---2-------',bass:'R...O...F...',pad:1,lv:.04,inst:'celst',bell:'X.....x.....'},
  boss:{bpm:132,steps:12,root:38,scale:'harm',prog:[0,0,5,4],lead:'1-2-3-5-3-2-7---5---6-5-4-3-2-1-7-5-',bass:'R.RO.RR.RF.R',pad:1,lv:.045,inst:'reed',bell:'X..x..X..x..',kick:'x.....x.....'},
  dawn:{bpm:76,steps:12,root:55,scale:'major',prog:[0,3,4,0],lead:'3---5---8---7---6---5---6-5-4-3-2---',bass:'R...O...F...',pad:1,lv:.05,inst:'celst'},
  over:{bpm:60,steps:12,root:40,scale:'minor',prog:[0,5,3,4],lead:'5-----------4-----------3-----------2-----------',bass:'R...........',pad:1,lv:.03,inst:'box'}
};
function setTrack(name){AU.want=name;}
function musicTick(paused){
  const c=AU.ctx;if(!c||c.state!=='running')return;
  if(AU.want!==AU.track){AU.track=AU.want;AU.step=0;AU.next=Math.max(AU.next,c.currentTime+.05);}
  const tr=TRACKS[AU.track];if(!tr)return;
  const n=tr.steps||16,sd=60/tr.bpm/4;if(AU.next<c.currentTime)AU.next=c.currentTime+.03;
  while(AU.next<c.currentTime+.15){
    const st=AU.step,s=st%n,bar=Math.floor(st/n)%tr.prog.length,d=tr.prog[bar],t=AU.next,R=tr.root;
    if(!AU.muted&&!ARC.muted&&!paused){
      const bc=tr.bass[s%tr.bass.length];
      if(bc&&bc!=='.'){const nn=R+sdeg(tr,d)+(bc==='O'?12:bc==='F'?sdeg(tr,d+4)-sdeg(tr,d):bc==='T'?sdeg(tr,d+2)-sdeg(tr,d):0);PATCH.bass(mtof(nn-12),t,sd*3.2,.12,AU.mus);}
      const L=tr.lead.length,lc=tr.lead[st%L];
      if(lc&&lc!=='.'&&lc!=='-'&&tr.lv){let len=1;while(tr.lead[(st+len)%L]==='-'&&len<24)len++;const dg=LEADCH.indexOf(lc);
        const g=PATCH[tr.inst||'box'](mtof(R+24+sdeg(tr,dg+d*0)),t,sd*len*.95+.3,tr.lv,AU.mus);if(g&&AU.dly){const s2=AU.ctx.createGain();s2.gain.value=.5;g.connect(s2);s2.connect(AU.dly);}}
      if(tr.pad&&s===0){for(const k of [0,2,4])PATCH.pad(mtof(R+12+sdeg(tr,d+k)),t,sd*n*1.02,.016,AU.mus);}
      if(tr.bell&&tr.bell[s]!=='.'&&tr.bell[s]){PATCH.bell(mtof(R+12+sdeg(tr,d)),t,2.4,tr.bell[s]==='X'?.05:.03,AU.mus);}
      if(tr.kick&&tr.kick[s]==='x'){tone(80,t,.2,'sine',.25,AU.mus,38);}
      if(tr.drip&&(r32()&31)===0)PATCH.glass(mtof(R+36+sdeg(tr,(r32()%7))),t,.4,.02,AU.mus);
    }
    AU.next+=sd;AU.step++;
  }
}
/* the night as sound: wind, crickets in the grass, rain, the sea; and the lantern's own small roar */
const AMB={on:false};
function ambInit(){
  const c=AU.ctx;if(!c||AMB.on)return;AMB.on=true;
  const gain=v=>{const g2=c.createGain();g2.gain.value=v;return g2;},filt=(type,f,q)=>{const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||1;return fl;};
  const nsrc=()=>{const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;s.start(0,Math.random());return s;};
  AMB.wn=nsrc();AMB.wf=filt('bandpass',420,.6);AMB.wg=gain(0);AMB.wn.connect(AMB.wf);AMB.wf.connect(AMB.wg);AMB.wg.connect(AU.sfx);
  AMB.rn=nsrc();AMB.rf=filt('highpass',2600,.5);AMB.rg=gain(0);AMB.rn.connect(AMB.rf);AMB.rf.connect(AMB.rg);AMB.rg.connect(AU.sfx);
  AMB.sn=nsrc();AMB.sf=filt('lowpass',380,.7);AMB.sg=gain(0);AMB.sn.connect(AMB.sf);AMB.sf.connect(AMB.sg);AMB.sg.connect(AU.sfx);
  AMB.fn=nsrc();AMB.ff=filt('bandpass',1100,1.4);AMB.fg=gain(0);AMB.fn.connect(AMB.ff);AMB.ff.connect(AMB.fg);AMB.fg.connect(AU.sfx);   /* the flame */
  AMB.cr=0;
}
function ambUpdate(){
  if(!AU.ctx)return;if(!AMB.on)ambInit();if(!AMB.on)return;
  const t=AU.ctx.currentTime,inGame=S.mode==='play'||S.mode==='demo'||S.mode==='intro',live=!S.paused&&!AU.muted&&inGame,set=(p,v,k)=>p.setTargetAtTime(v,t,k||.2);
  set(AMB.wg.gain,live?.02+.015*Math.sin(t*.21)+(ST.fog>.5?.012:0):0,.8);set(AMB.wf.frequency,330+180*Math.sin(t*.13));
  set(AMB.rg.gain,live&&ST.rain?.03:0,.6);set(AMB.sg.gain,live&&ST.boss?.05+.03*Math.sin(t*.4):0,.8);
  set(AMB.fg.gain,live&&!P.dead?.006+P.beamK*.014:0,.08);set(AMB.ff.frequency,900+P.beamK*900);
  /* crickets: FM chirps when the lamplighter is near grass and nothing hunts close by */
  if(live&&!P.dead&&MAT[(P.y|0)*WW+(P.x|0)]===M_GRASS&&SH.every(s=>Math.hypot(s.x-P.x,s.y-P.y)>40)&&Math.random()<.03){const f=4200+Math.random()*600;for(let k=0;k<3;k++)fm(f,t+k*.045,.03,1.5,.8,.03,.012,AU.sfx,.2,.002);}
}
/* =====================================================================================
   11. ARCADE BRIDGE AND INPUT SNAPSHOT
   ===================================================================================== */
const ARC={muted:false,last:0,
  post(type,data){if(window.parent===window)return;try{window.parent.postMessage(Object.assign({src:'hyperdot',type,id:CAB.id},data||{}),'*');}catch(e){}},
  score(s){const t=performance.now();if(t-this.last>250){this.last=t;this.post('score',{score:s});}},
  over(score,tickets){this.post('over',{score,tickets:CAB.tickets?Math.max(0,Math.round(tickets||0)):0});},
  exit(){this.post('exit');}
};
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
  if(m.cmd==='start'){audioInit();APP_start();}else if(m.cmd==='pause')setPause(true);else if(m.cmd==='resume')setPause(false);
  else if(m.cmd==='attract')APP_attract();else if(m.cmd==='mute'){ARC.muted=true;setVolume();}else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}});
window.HYPERDOT_GAME={id:CAB.id,title:CAB.title,tickets:CAB.tickets,version:1};
let PTRAIM=false;
function readCtl(){
  const o={x:0,y:0,a:false,b:false,start:false,ok:false,back:false,pause:false,u:false,d:false,l:false,r:false,ax:0,ay:0,aim:null};
  if(K('ArrowLeft')||K('KeyA'))o.x-=1;if(K('ArrowRight')||K('KeyD'))o.x+=1;if(K('ArrowUp')||K('KeyW'))o.y-=1;if(K('ArrowDown')||K('KeyS'))o.y+=1;
  if(K('Space')||K('KeyJ')||K('KeyZ'))o.a=true;if(K('ShiftLeft')||K('ShiftRight')||K('KeyK')||K('KeyX'))o.b=true;
  if(TS.on&&(TS.x||TS.y)){o.x=TS.x;o.y=TS.y;}if(TS.A)o.a=true;if(TS.B)o.b=true;
  for(const p of pads()){
    const b=k=>!!(p.buttons[k]&&p.buttons[k].pressed),lx=p.axes[0]||0,ly=p.axes[1]||0,rx=p.axes[2]||0,ry=p.axes[3]||0;
    if(Math.abs(lx)>.18||Math.abs(ly)>.18){o.x=lx;o.y=ly;}if(Math.hypot(rx,ry)>.35){o.ax=rx;o.ay=ry;}
    if(b(14))o.x=-1;if(b(15))o.x=1;if(b(12))o.y=-1;if(b(13))o.y=1;
    if(b(0)||b(7)||b(5))o.a=true;if(b(2)||b(6)||b(4))o.b=true;if(b(9))o.start=true;if(b(0))o.ok=true;if(b(1))o.back=true;
  }
  const l=Math.hypot(o.x,o.y);if(l>1){o.x/=l;o.y/=l;}
  o.u=o.y<-.5;o.d=o.y>.5;o.l=o.x<-.5;o.r=o.x>.5;
  /* the mouse (or a finger on the panel) aims the lantern; the button opens the beam */
  if(PTR.on&&!PTR.touch&&performance.now()-PTR.last<4000)PTRAIM=true;if(Math.hypot(o.ax,o.ay)>.35||(l>.2&&PTR.touch&&!PTR.down))PTRAIM=false;
  if(PTR.touch&&PTR.down)PTRAIM=true;
  if(PTRAIM&&PTR.on)o.aim=[PTR.x,PTR.y];
  if(PTR.down&&(!PTR.touch||PTRAIM))o.a=true;
  if(PTR.right){o.b=true;}
  o.ok=o.ok||K('Enter')||K('Space')||K('KeyJ')||TS.A;o.back=o.back||K('Escape')||K('Backspace');o.pause=K('Escape')||K('KeyP')||o.start;
  return o;
}
function endInputFrame(){LATCH.clear();PTR.pressed=false;PTR.released=false;PTR.right=false;}
/* =====================================================================================
   12. GAME STATE AND FLOW
     attract (logo, high scores, rules, demo) -> intro (a night's card) -> play -> dawn (tally) -> next night
     play -> dying -> respawn at the last lamp, or game over (initials) -> attract
   ===================================================================================== */
const DEF_HI=[['LMP',60000],['WIK',45000],['ELM',32000],['OIL',20000],['FOG',10000]];
function loadHi(){try{const v=JSON.parse(store.get('hd-lantern-table','null'));if(Array.isArray(v)&&v.length===5)return v;}catch(e){}return DEF_HI.map(r=>r.slice());}
const S={mode:'attract',t:0,clock:0,tick:0,score:0,night:0,lives:3,cont:0,paused:false,pauseI:0,demo:false,chain:0,chainT:0,calls:[],big:null,pops:[],shake:0,flash:0,
  nt:0,nextDeep:0,maxAlive:3,rate:3,spawnT:2,mothI:0,snufI:0,stats:null,tally:null,deathT:0,hi:loadHi(),entry:null,att:{ph:0,t:0},attractN:0,mothsOn:0,bossDown:0,greatT:0,lampsLit:0,
  fieldT:0,newHi:false,tickets:0,flawless:true};
function newStats(){return {lamps:0,shades:0,snuffers:0,flies:0,hits:0,snuffed:0};}
function addScore(n,x,y){if(S.demo)return;S.score+=n;ARC.score(Math.floor(S.score));if(x!=null)S.pops.push({x,y,txt:''+n,t:0});if(S.pops.length>8)S.pops.shift();}
function callout(txt,dur){S.calls.push({txt,t:0,dur:dur||1.2});if(S.calls.length>2)S.calls.shift();}
function bigCallout(title,sub){S.big={title,sub,t:0};}
function nightSetup(i,demo){
  ST=NIGHTS[i];S.night=i;S.demo=demo;RS=(ST.seed*2654435761)>>>0||7;
  buildTown(ST);SH.length=0;MOTHS.length=0;SNUF.length=0;FLARES.length=0;PART.length=0;seedFlies();BOSS.on=false;GREAT.on=false;
  Object.assign(P,{x:START.x,y:START.y,vx:0,vy:0,aim:-Math.PI/2,aimTo:-Math.PI/2,beamK:0,oil:OIL_MAX,hurt:0,inv:0,kindle:0,kl:null,gutter:0,dead:0,lastLamp:null,flick:1});
  if(!demo&&i===0){P.flares=2;P.lives=3;}
  S.nt=0;S.nextDeep=ST.shade.deepen;S.maxAlive=ST.shade.max;S.rate=ST.shade.rate;S.spawnT=4;S.mothI=0;S.snufI=0;S.stats=newStats();S.chain=0;S.chainT=0;S.calls.length=0;S.big=null;S.pops.length=0;
  S.bossDown=0;S.greatT=0;S.flawless=true;S.fieldT=0;litCells();buildField(P.x,P.y);
  CAM.x=clamp(P.x-W/2,0,WW-W);CAM.y=clamp(P.y-H/2,0,WH-H);
}
function APP_attract(){S.mode='attract';S.t=0;S.paused=false;S.att={ph:0,t:0};S.entry=null;$('pauseBtn').textContent='Pause';titleSetup();setTrack('title');}
function APP_start(){S.score=0;S.cont=0;S.paused=false;S.newHi=false;P.lives=3;P.flares=2;$('pauseBtn').textContent='Pause';startNight(0);SFX.confirm();ARC.score(0);}
function startNight(i){nightSetup(i,false);S.mode='intro';S.t=0;setTrack(ST.tr);}
function startDemo(){nightSetup(S.attractN%4,true);S.attractN++;S.mode='demo';S.t=0;P.oil=OIL_MAX;P.flares=2;setTrack(ST.tr);}
function setPause(on){if(S.mode!=='play'&&S.mode!=='intro')on=false;S.paused=on;S.pauseI=0;$('pauseBtn').textContent=on?'Resume':'Pause';}
function lampsLit(){let n=0;for(const L of LAMPS)if(L.lit)n++;return n;}
/* ---------- the lamplighter ---------- */
function playerStep(dt,c,live){
  P.hurt=Math.max(0,P.hurt-dt);P.inv=Math.max(0,P.inv-dt);
  if(P.dead){P.beamK=Math.max(0,P.beamK-dt*6);return;}
  /* walking */
  const sp=34,acc=14;P.vx+=(c.x*sp-P.vx)*Math.min(1,dt*acc);P.vy+=(c.y*sp-P.vy)*Math.min(1,dt*acc);
  const nx=P.x+P.vx*dt,ny=P.y+P.vy*dt;
  if(!blocked(nx,P.y,2,true))P.x=nx;else P.vx=0;if(!blocked(P.x,ny,2,true))P.y=ny;else P.vy=0;
  P.x=clamp(P.x,3,WW-4);P.y=clamp(P.y,3,WH-4);
  const spd=Math.hypot(P.vx,P.vy);P.step+=spd*dt;if(P.step>7&&live){P.step=0;SFX.step(MAT[(P.y|0)*WW+(P.x|0)]);}
  /* aiming: the pointer or the right stick if they speak; otherwise the way you walk, with a little help
     toward the nearest thing that hunts you in front */
  let want=null;
  if(c.aim){const wx=c.aim[0]+CAM.x,wy=c.aim[1]+CAM.y;if(Math.hypot(wx-P.x,wy-P.y)>2)want=Math.atan2(wy-P.y,wx-P.x);}
  else if(Math.hypot(c.ax,c.ay)>.35)want=Math.atan2(c.ay,c.ax);
  else{if(spd>6)want=Math.atan2(P.vy,P.vx);else want=P.aimTo;
    let best=null,bd=1e9;for(const s of SH){const d=Math.hypot(s.x-P.x,s.y-P.y);if(d>70||s.in<.5)continue;let da=Math.atan2(s.y-P.y,s.x-P.x)-want;da=Math.atan2(Math.sin(da),Math.cos(da));if(Math.abs(da)<.9&&d<bd){bd=d;best=s;}}
    for(const z of SNUF){const d=Math.hypot(z.x-P.x,z.y-P.y);if(d<70&&d<bd){let da=Math.atan2(z.y-P.y,z.x-P.x)-want;da=Math.atan2(Math.sin(da),Math.cos(da));if(Math.abs(da)<.9){bd=d;best=z;}}}
    if(best&&c.a)want=Math.atan2(best.y-P.y,best.x-P.x);}
  if(want!=null)P.aimTo=want;
  let da=P.aimTo-P.aim;da=Math.atan2(Math.sin(da),Math.cos(da));P.aim+=clamp(da,-11*dt,11*dt);
  P.lx=P.x+Math.cos(P.aim)*2.6;P.ly=P.y+Math.sin(P.aim)*2.6-.5;
  /* the shutter */
  const open=c.a&&P.oil>0;if(open!==P.beam){P.beam=open;SFX.shutter(open);}
  P.beamK=clamp(P.beamK+(open?1:-1)*dt*12,0,1);
  /* oil */
  if(live){P.oil=Math.max(0,P.oil-(.85+P.beamK*3)*dt);
    const L=LMAP[(P.y|0)*WW+(P.x|0)];if(L>.5&&P.oil<OIL_MAX){P.oil=Math.min(OIL_MAX,P.oil+6*dt);if(P.oil<OIL_MAX-1&&rl('wick',900))PATCH.glass(1760,now(),.3,.012);}}
  P.flick=.94+.05*vnoise(S.clock*9,1,3)+.03*vnoise(S.clock*23,2,4);
  if(P.oil<=0){P.gutter+=dt;if(P.gutter>2.4&&live)playerDies();}else P.gutter=0;
  if(live&&P.oil<22&&P.oil>0&&rl('hb',Math.max(380,P.oil*40)))SFX.heartbeat();
  /* kindling: stand by a dark lamp and the flame passes to it */
  let near=null,nd=9;for(const L of LAMPS){if(L.lit)continue;const d=Math.hypot(L.x-P.x,L.y-P.y);if(d<nd){nd=d;near=L;}}
  if(near&&near===P.kl&&P.hurt<=0&&live){P.kindle+=dt/1.5;SFX.kindle(P.kindle);if(P.kindle>=1){P.kindle=0;lightLamp(near);}}
  else{P.kl=near;P.kindle=Math.max(0,P.kindle-dt*3);}
}
function lightLamp(L){
  lampToggle(L,true);L.snuffT=0;litCells();const n=lampsLit(),first=!L.once;L.once=1;S.stats.lamps++;P.lastLamp=L;
  addScore(first?500:250,L.x,L.y-8);callout('LAMP LIT  '+n+'/'+LAMPS.length,1.4);SFX.lampLit(n);puff(L.x,L.y-3,18,0,40,.6);
  /* a newly lit lamp holds the shades already standing in it */
}
function playerDies(){
  P.dead=1;S.mode='dying';S.t=0;S.flawless=false;SFX.die();setTrack('over');P.lives--;
}
function respawn(){
  const lit=LAMPS.filter(L=>L.lit),L=P.lastLamp&&P.lastLamp.lit?P.lastLamp:lit.length?lit[(Math.random()*lit.length)|0]:null;
  const x=L?L.x+4:START.x,y=L?L.y+5:START.y;let px=x,py=y;
  for(let r=0;r<20&&blocked(px,py,2,true);r++){const a=Math.random()*TAU;px=x+Math.cos(a)*r;py=y+Math.sin(a)*r;}
  Object.assign(P,{x:px,y:py,vx:0,vy:0,oil:72,dead:0,gutter:0,inv:2.5,hurt:0,kindle:0,beamK:0});
  for(let k=SH.length-1;k>=0;k--)if(Math.hypot(SH[k].x-P.x,SH[k].y-P.y)<70)SH.splice(k,1);
  if(BOSS.on){BOSS.vx=0;BOSS.vy=0;}
  S.mode='play';S.t=0;setTrack(BOSS.on?'boss':ST.tr);callout('THE FLAME LIVES',1.4);
}
/* ---------- the night's director ---------- */
function director(dt){
  S.nt+=dt;
  if(S.nt>=S.nextDeep){S.nextDeep+=ST.shade.deepen;if(S.maxAlive<ST.shade.cap){S.maxAlive++;S.rate*=.92;callout('THE NIGHT DEEPENS',1.6);SFX.toll();}}
  S.spawnT-=dt;if(S.spawnT<=0){S.spawnT=S.rate*rnd(.7,1.3);if(SH.length<S.maxAlive)spawnShade();}
  if(S.mothI<ST.moths.length&&S.nt>=ST.moths[S.mothI]){S.mothI++;spawnMoths();}
  if(S.snufI<ST.snuff.length&&S.nt>=ST.snuff[S.snufI]&&lampsLit()>0){S.snufI++;spawnSnuffer();}
  S.fieldT-=dt;if(S.fieldT<=0){S.fieldT=.3;buildField(P.x,P.y);}
  /* the last night: the island lit wakes the great lamp, and the great lamp wakes the Long Night */
  if(ST.boss&&!GREAT.on&&lampsLit()===LAMPS.length){wakeGreatLamp();S.greatT=.01;SFX.great();bigCallout('THE GREAT LAMP','WAKES');}
  if(S.greatT>0&&!BOSS.on&&!S.bossDown){S.greatT+=dt;if(S.greatT>3.2){bossStart();setTrack('boss');}}
  if(GREAT.on){GREAT.k=Math.min(1,GREAT.k+dt*.6);GREAT.a+=dt*.55;}
}
function nightWon(){return lampsLit()===LAMPS.length&&(!ST.boss||S.bossDown);}
/* ---------- the tally at dawn ---------- */
function startDawn(){
  const oilB=Math.round(P.oil)*20,timeB=Math.max(0,Math.round(240-S.nt))*15,flaw=S.flawless&&S.stats.hits===0?5000:0,boss=ST.boss?25000:0;
  S.tally={rows:[['LAMPS LIT',''+S.stats.lamps,0],['SHADES BURNED',''+S.stats.shades,0],['OIL LEFT',Math.round(P.oil)+'%',oilB],['NIGHT',fmtT(S.nt),timeB],['UNTOUCHED',flaw?'YES':'NO',flaw]].concat(boss?[['THE LONG NIGHT','ENDED',boss]]:[]),
    shown:0,pay:oilB+timeB+flaw+boss,paid:0,t:0};
  S.mode='dawn';S.t=0;setTrack('dawn');SFX.dawn();
}
const fmtT=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
function nextNight(){
  if(S.night>=NIGHTS.length-1){finalize();S.mode='ending';S.t=0;setTrack('dawn');return;}
  const keep={oil:P.oil,flares:P.flares,lives:P.lives};startNight(S.night+1);P.flares=keep.flares;P.lives=keep.lives;
}
function finalize(){S.tickets=Math.round(S.score/2500);ARC.over(Math.floor(S.score),S.tickets);
  const q=S.hi.findIndex(r=>S.score>r[1]);S.newHi=q>=0;if(q>=0&&!S.demo)S.entry={q,ch:[0,0,0],i:0,t:0};}
function gameOver(){finalize();S.mode='over';S.t=0;setTrack('over');SFX.lose();}
const ALPHA='ABCDEFGHIJKLMNOPQRSTUVWXYZ.';
function commitEntry(){const e=S.entry;const nm=e.ch.map(i=>ALPHA[i]).join('');S.hi.splice(e.q,0,[nm,Math.floor(S.score)]);S.hi.length=5;store.set('hd-lantern-table',JSON.stringify(S.hi));S.entry=null;SFX.confirm();}
/* ---------- the autopilot: plays the demo and the soak tests ---------- */
const AFIELD=new Uint16Array(64*64);const AP={tgt:null,tgtT:0,ft:0};
function autopilot(){
  const o={x:0,y:0,a:false,b:false,ax:0,ay:0,aim:null,ok:false};
  if(P.dead)return o;
  /* the nearest threat that can move */
  let th=null,td=1e9;for(const s of SH){if(s.in<.5)continue;const d=Math.hypot(s.x-P.x,s.y-P.y);if(d<td&&d<BEAM.R*.85&&(s.fz<.5||d<30)){td=d;th=s;}}
  for(const z of SNUF){const d=Math.hypot(z.x-P.x,z.y-P.y);if(d<BEAM.R*.9&&d<td+20){td=d;th=z;}}
  if(BOSS.on&&BOSS.rise>=1&&BOSS.eye>0){const d=Math.hypot(BOSS.x-P.x,BOSS.y-P.y);if(d<BEAM.R*.9){th=BOSS;td=d;}}
  const swarm=MOTHS.some(m=>m.tgt==='P'&&Math.hypot(m.x-P.x,m.y-P.y)<14);
  if(th&&!(swarm&&td>28)){o.ax=th.x-P.x;o.ay=th.y-P.y;const l=Math.hypot(o.ax,o.ay)||1;o.ax/=l;o.ay/=l;o.a=true;}
  /* flares for crowds, for a snuffer at a lamp, and against the Long Night's open eye */
  const close=SH.filter(s=>Math.hypot(s.x-P.x,s.y-P.y)<26&&s.in>.5).length;
  AP.flT=(AP.flT||0)-1/60;
  if(AP.flT<=0&&P.flares>0&&(close>=3||(BOSS.on&&BOSS.eye>0&&Math.hypot(BOSS.x-P.x,BOSS.y-P.y)<BOSS.r+40&&BOSS.hp<BOSS.hp0*.8)||(swarm&&P.oil<40))){o.b=true;AP.flT=2.5;}
  /* where to walk: oil when low, a lit lamp to refill when there is no can, else the nearest dark lamp */
  AP.tgtT-=1/60;
  if(AP.tgtT<=0){AP.tgtT=.5;let tgt=null,bd=1e9;
    if(P.oil<34){for(const p of PICKS)if(p.on&&p.k==='oil'){const d=Math.hypot(p.x-P.x,p.y-P.y);if(d<bd){bd=d;tgt=p;}}
      if(!tgt||bd>140){bd=1e9;for(const L of LAMPS)if(L.lit){const d=Math.hypot(L.x-P.x,L.y-P.y);if(d<bd){bd=d;tgt={x:L.x+5,y:L.y+5};}}}}
    if(!tgt||(swarm&&P.oil<70)){if(swarm){bd=1e9;for(const L of LAMPS)if(L.lit){const d=Math.hypot(L.x-P.x,L.y-P.y);if(d<bd){bd=d;tgt={x:L.x+5,y:L.y+5};}}}}
    if(!tgt){bd=1e9;for(const L of LAMPS)if(!L.lit){const d=Math.hypot(L.x-P.x,L.y-P.y);if(d<bd){bd=d;tgt=L;}}}
    if(!tgt&&BOSS.on)tgt={x:BOSS.x+(P.x>BOSS.x?40:-40),y:BOSS.y+30};
    if(tgt!==AP.tgt||AP.ft<=0){AP.tgt=tgt;AP.ft=1.5;if(tgt)bfs2(tgt.x|0,tgt.y|0);}}
  AP.ft-=1/60;
  if(AP.tgt){const [tx,ty]=step2(P.x|0,P.y|0);
    const dx=tx-P.x,dy=ty-P.y,l=Math.hypot(dx,dy);if(l>.8){o.x=dx/l;o.y=dy/l;}
    /* while kindling, hold still */
    if(P.kl&&P.kl===AP.tgt&&Math.hypot(P.kl.x-P.x,P.kl.y-P.y)<8){o.x=0;o.y=0;}}
  /* back away from a shade that is about to touch */
  if(th&&td<9&&th!==BOSS){o.x-=(th.x-P.x)/td;o.y-=(th.y-P.y)/td;}
  if(BOSS.on&&BOSS.rise>=1){const d=Math.hypot(BOSS.x-P.x,BOSS.y-P.y);if(d<BOSS.r+16){o.x-=(BOSS.x-P.x)/d*1.5;o.y-=(BOSS.y-P.y)/d*1.5;}}
  /* wedged: wander a moment and try again */
  AP.mv=(AP.mv||0)*.97+Math.hypot(P.vx,P.vy)*.03;if(AP.mv<3&&Math.hypot(o.x,o.y)>.5&&!(P.kl&&P.kindle>0)){AP.stuck=(AP.stuck||0)+1/60;}else AP.stuck=0;
  if(AP.stuck>1.5){AP.jig=.7;AP.ja=Math.random()*TAU;AP.stuck=0;AP.side=-(AP.side||1);}
  if(AP.jig>0){AP.jig-=1/60;o.x=Math.cos(AP.ja);o.y=Math.sin(AP.ja);}
  const l=Math.hypot(o.x,o.y);if(l>1){o.x/=l;o.y/=l;}
  return o;
}
/* ---------- one tick of a running night ---------- */
const PERF={sim:0};
function nightStep(dt,c,live){
  const t0=performance.now();
  playerStep(dt,c,live);
  if(!P.dead)castShadow(LSM,P.lx,P.ly,P.beamK>.02?BEAM.R:lanternR()+2,1,.8);
  if(live)director(dt);
  stepShades(dt,live);stepMoths(dt);stepSnuffers(dt,live);stepBoss(dt,live);stepFlies(dt);stepPicks(dt);stepParts(dt);
  for(let k=FLARES.length-1;k>=0;k--){FLARES[k].t+=dt;if(FLARES[k].t>FLARES[k].dur)FLARES.splice(k,1);}
  for(const L of LAMPS){L.flick+=dt;L.snuffT=Math.max(0,L.snuffT-dt*.5);}
  S.chainT=Math.max(0,S.chainT-dt);S.mothsOn=0;
  for(const c of S.calls)c.t+=dt;S.calls=S.calls.filter(c=>c.t<=c.dur);if(S.big){S.big.t+=dt;if(S.big.t>3.2)S.big=null;}
  for(const p of S.pops)p.t+=dt;S.pops=S.pops.filter(p=>p.t<1.1);
  PERF.sim+=(performance.now()-t0-PERF.sim)*.05;
}
