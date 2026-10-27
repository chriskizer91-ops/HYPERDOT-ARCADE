/* =====================================================================================
   CABINET, MUSIC, SOUND
   ===================================================================================== */
const CAB={id:'prisma',title:'PRISMA',tickets:true};
const TRACKS={
  title:{bpm:96,root:38,scale:'minor',prog:[0,5,3,6],bass:'R..R..R.R..R.OR.',lead:'5-------6---5---3-------2---1---',kick:'x.......x.......',snare:'....x.......x...',hat:'..x...x...x...x.',arp:'16',pad:1,lv:.028},
  s0:{bpm:124,root:40,scale:'minor',prog:[0,5,2,6],bass:'R.OR.OR.R.OR.OF.',lead:'1-3-5-8-7---5---6-5-3-5-4-------',kick:'x...x...x...x...',snare:'....x.......x...',hat:'..x...x...x...x.',arp:'16',pad:1,lv:.03},
  s1:{bpm:118,root:42,scale:'phryg',prog:[0,1,0,6],bass:'R..RO..RR..RO.F.',lead:'5.6.5.3.2-1-----3.5.6.8.6-5-----',kick:'x.....x...x.....',snare:'....x.......x..x',hat:'x.xxx.xxx.xxx.xx',arp:'8',pad:1,lv:.028},
  s2:{bpm:132,root:45,scale:'mixo',prog:[0,6,3,4],bass:'R.R.O.R.R.R.O.F.',lead:'8---7-5-6---5-3-4-5-6-8-9---8---',kick:'x...x...x...x...',snare:'....x.......x...',hat:'xxx.xxx.xxx.xxxx',arp:'16',pad:1,lv:.03},
  s3:{bpm:140,root:38,scale:'harm',prog:[0,0,5,4],bass:'RRR.RRR.RRO.RRF.',lead:'1-2-3---5---3-2-7---5---6-5-4-3-',kick:'x..x..x...x..x..',snare:'....x.......x...',hat:'x.x.x.x.x.x.x.xx',arp:'16',pad:1,lv:.028},
  take:{bpm:150,root:40,scale:'harm',prog:[0,5,3,4],bass:'R.RO.RR.R.RO.RF.',lead:'8-7-6-5-6-5-4-3-5-4-3-2-3---7---',kick:'x...x...x...x...',snare:'....x.......x.x.',hat:'xxxxxxxxxxxxxxxx',arp:'16',pad:0,lv:.032},
  win:{bpm:112,root:43,scale:'major',prog:[0,4,5,3],bass:'R...R.O.R...R.F.',lead:'5-3-5-8---7-8-9-8-------5-6-7---',kick:'x.......x.......',snare:'....x.......x...',hat:'..x...x...x...x.',arp:'8',pad:1,lv:.032},
  over:{bpm:76,root:40,scale:'minor',prog:[0,5,3,4],bass:'R.......R.......',lead:'5-------4-------3-------2-------',kick:'x...............',snare:'................',hat:'................',pad:1,lv:.018}
};
const SFXT={};
function rl(k,ms){const t=performance.now();if(SFXT[k]&&t-SFXT[k]<ms)return false;SFXT[k]=t;return true;}
const SFX={
  move(){tone(660,now(),.04,'square',.05);},
  confirm(){const t=now();tone(990,t,.06,'square',.06);tone(1320,t+.06,.12,'square',.06,0,0,0,.2);},
  back(){tone(440,now(),.08,'square',.05,0,330);},
  crunch(k=1){if(!rl('cr',70))return;const t=now();noise(t,.28,.5*k,2200,180,'lowpass',0,.15);tone(95,t,.2,'square',.16*k,0,42,600);tone(330,t,.14,'sawtooth',.05*k,0,170,1800);},
  scrape(k=1){if(!rl('sc',90))return;noise(now(),.2,.22*k,5200,1600,'bandpass',0,0,5);},
  qshift(){const t=now();noise(t,.03,.05,2800,1000,'bandpass');tone(150,t,.025,'square',.025,0,80);},
  passby(k=.5,pan=0){const t=now();noise(t,.3+.25*k,.05+.11*k,2400*(1+k),450,'bandpass',0,0,.9);},
  grind(){if(!rl('gr',60))return;noise(now(),.08,.12,6000,3000,'bandpass',0,0,6);},
  launch(){const t=now();tone(180,t,.35,'sawtooth',.07,0,520,2400);noise(t,.4,.18,600,3000,'bandpass');},
  land(h){const t=now(),k=Math.min(1,h/22);noise(t,.22,.15+.35*k,900,90);tone(72,t,.16,'sine',.25*k+.05,0,38);},
  pad(){if(!rl('pad',120))return;const t=now();[660,990,1320].forEach((f,i)=>tone(f,t+i*.04,.08,'square',.045));noise(t,.35,.16,800,5000,'bandpass');},
  nitro(){const t=now();noise(t,1.1,.32,500,7000,'bandpass',0,.2,.8);tone(110,t,.9,'sawtooth',.12,0,460,3200);tone(55,t,.4,'sine',.3,0,30);},
  vanBoost(){if(!rl('vb',600))return;const k=clamp(1-(TG.s-BK.s)/200,0,1);if(k>0)noise(now(),.6,.18*k,300,2200,'bandpass');},
  ram(n){const t=now();noise(t,.35,.6,2600,150,'lowpass',0,.25);tone(70,t,.25,'sine',.4,0,35);tone(520,t,.3,'square',.06,0,300,2600,.3);tone(737,t,.25,'square',.05,0,420,2600,.3);if(n)tone(1400,t,.4,'sawtooth',.05,0,2800,5000,.3);},
  horn(){if(!rl('hn',140))return;const t=now();for(const f of [392,494]){tone(f,t,.38,'square',.035,0,f*.82,1400);}},
  extend(){const t=now();[523,659,784,1047,1319].forEach((f,i)=>tone(f,t+i*.07,.14,'square',.06,0,0,0,.25));},
  beep(){tone(880,now(),.12,'square',.08);},
  go(){const t=now();tone(1320,t,.45,'square',.08,0,0,0,.3);tone(660,t,.45,'square',.05);},
  tick(){if(!rl('tk',40))return;tone(1500,now(),.02,'square',.035);},
  warn(){tone(1700,now(),.07,'square',.06);tone(1700,now()+.1,.07,'square',.05);},
  radio(){const t=now();noise(t,.07,.12,3000,1500,'bandpass',0,0,4);tone(1800,t+.06,.04,'square',.03);},
  caught(){const t=now();noise(t,.8,.4,1500,100,'lowpass',0,.4);[392,523,659,784].forEach((f,i)=>tone(f,t+.2+i*.09,.3,'sawtooth',.06,0,0,2400,.3));},
  thunder(k){const t=now()+.5+Math.random()*.9;noise(t,2.4,.32*k,500,60,'lowpass',0,.5);noise(t,.5,.2*k,1400,200,'lowpass');},
  lose(){const t=now();[523,466,392,311].forEach((f,i)=>tone(f,t+i*.16,.24,'triangle',.08,0,0,0,.3));}
};
/* =====================================================================================
   THE BIKE'S VOICE. Engines from the Shiftlight Engine Lab (2b_engine.js): a 9,400 rpm four on
   individual throttles and a straight pipe, through a six-speed quickshifter: cut-and-pop upshifts,
   auto-blipped downshifts. Geared so a cruise sits three-quarters of the way up the dial; boost pads
   rev it higher and nitro runs it into the limiter. Swap in any Lab preset id or copied spec below.
   Around it, what makes it a hover-bike: the lift fans' blade-pass whine and jet rush spooling with
   the throttle, a low field hum that sags when you leave the ground, air-brake flaps, an afterburner
   on nitro. The getaway car has a supercharged big-block you can hear closing in; hover traffic hums by.
   ===================================================================================== */
const BIKE_ENG=HDL.engine('screamer');
const TG_ENG=HDL.engine('blown');
const BVG=[28,44,60,77,96,122];        /* m/s each gear reaches at redline: a stage's cruise (92-100) sits at 75-82% in sixth */
const TGVG=[18,30,42,56,72,92];
const GBX={g:1,rpm:.15,cutT:0,blipT:0,cd:0,load:0,lim:false,limT:0,fan:0,tg:{g:1,rpm:.2,cd:0,cutT:0}};
/* one gearbox for the bike or the getaway car: returns the share of redline */
function shiftBox(st,v,thr,dt,iN,vg,air){
  st.cutT=Math.max(0,st.cutT-dt);st.blipT=Math.max(0,(st.blipT||0)-dt);st.cd=Math.max(0,st.cd-dt);
  if(v/vg[st.g-1]>.965&&st.g<vg.length&&st.cd<=0&&thr>.2){st.g++;st.cutT=.04;st.cd=.2;st.ev=1;}
  else if(st.g>1&&v/vg[st.g-2]<.88&&st.cd<=0){st.g--;st.blipT=thr<.3?.11:.06;st.cd=.14;st.ev=-1;}
  const road=v/vg[st.g-1];let tgt=road*(air?1.12:1);if(st.g===1&&thr>.3)tgt=Math.max(tgt,.55*(1-clamp(v/12,0,1))+road);if(st.blipT>0)tgt=Math.max(tgt,road+.09);
  st.lim=road>1.005&&thr>.3;if(st.lim)st.limT=(st.limT||0)+dt;
  tgt=Math.max(iN,Math.min(1,tgt));const k=tgt<st.rpm?(st.cutT>0?34:9):(st.blipT>0?26:12);st.rpm+=(tgt-st.rpm)*Math.min(1,dt*k);
  const limCut=st.lim&&((st.limT*26)|0)%2===0;st.limCut=limCut;
  return st.rpm;
}
const AMB={on:false,pool:new Map()};
function ambInit(){
  const c=AU.ctx;if(!c||AMB.on)return;AMB.on=true;
  const mk=(type,f)=>{const o=c.createOscillator();o.type=type;o.frequency.value=f;o.start();return o;};
  const gain=v=>{const g2=c.createGain();g2.gain.value=v;return g2;};
  const filt=(type,f,q)=>{const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||1;return fl;};
  const nsrc=()=>{const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;s.start(0,Math.random());return s;};
  AMB.bus=gain(.5);AMB.bus.connect(AU.out);
  const eb=gain(1.25);eb.connect(AMB.bus);const er=gain(.12);eb.connect(er);er.connect(AU.rev);
  AMB.H=HDL.host(c,eb,{slots:2,room:'open',roomSend:.14});
  AMB.eng=AMB.H.main(BIKE_ENG);AMB.tgv=AMB.H.take(TG_ENG);
  /* lift fans: blade-pass whine with its second partial, a slow wobble as the blades load up */
  AMB.f1=mk('sine',900);AMB.f2=mk('triangle',1350);AMB.fw=mk('sine',5.5);AMB.fwg=gain(14);AMB.fw.connect(AMB.fwg);AMB.fwg.connect(AMB.f1.frequency);
  AMB.fg=gain(0);AMB.f2g=gain(.35);AMB.f1.connect(AMB.fg);AMB.f2.connect(AMB.f2g);AMB.f2g.connect(AMB.fg);AMB.fg.connect(AMB.bus);
  /* jet rush through the thrust duct, and the afterburner roar under nitro */
  AMB.jn=nsrc();AMB.jf=filt('bandpass',1200,.9);AMB.jg=gain(0);AMB.jn.connect(AMB.jf);AMB.jf.connect(AMB.jg);AMB.jg.connect(AMB.bus);
  AMB.an=nsrc();AMB.af=filt('lowpass',600,.7);AMB.ag=gain(0);AMB.an.connect(AMB.af);AMB.af.connect(AMB.ag);AMB.ag.connect(AMB.bus);
  /* the hover field: a low hum that rides the bike's height */
  AMB.h1=mk('sine',62);AMB.h2=mk('square',31);AMB.hf=filt('lowpass',180,2);AMB.hg=gain(0);AMB.h1.connect(AMB.hg);AMB.h2.connect(AMB.hf);AMB.hf.connect(AMB.hg);AMB.hg.connect(AMB.bus);
  /* air brakes: flaps open into the slipstream */
  AMB.bn=nsrc();AMB.bf=filt('bandpass',1700,1.4);AMB.bg=gain(0);AMB.bn.connect(AMB.bf);AMB.bf.connect(AMB.bg);AMB.bg.connect(AMB.bus);
  AMB.wn=nsrc();AMB.wf=filt('bandpass',800,.6);AMB.wg=gain(0);AMB.wn.connect(AMB.wf);AMB.wf.connect(AMB.wg);AMB.wg.connect(AU.sfx);
  AMB.so=mk('triangle',720);AMB.lfo=mk('square',1.35);AMB.lg=gain(140);AMB.lfo.connect(AMB.lg);AMB.lg.connect(AMB.so.frequency);
  AMB.sf=filt('lowpass',2200,1);AMB.sg=gain(0);AMB.so.connect(AMB.sf);AMB.sf.connect(AMB.sg);AMB.sg.connect(AU.sfx);const sr=gain(.4);AMB.sg.connect(sr);sr.connect(AU.rev);
}
/* hover traffic: an electric whine and a push of air, pitched by doppler */
function hoverCar(c){const o1=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),n=c.createBufferSource(),nf=c.createBiquadFilter(),ng=c.createGain(),p=c.createStereoPanner?c.createStereoPanner():null;
  o1.type='sine';o2.type='triangle';g.gain.value=0;ng.gain.value=0;nf.type='bandpass';nf.Q.value=.8;n.buffer=AU.noise;n.loop=true;
  o1.connect(g);o2.connect(g);n.connect(nf);nf.connect(ng);const dst=p||AMB.bus;g.connect(dst);ng.connect(dst);if(p)p.connect(AMB.bus);o1.start();o2.start();n.start(0,Math.random());
  return {set(f,vol,pan,t){o1.frequency.setTargetAtTime(f,t,.05);o2.frequency.setTargetAtTime(f*1.5,t,.05);g.gain.setTargetAtTime(vol*.03,t,.05);nf.frequency.setTargetAtTime(f*2.2,t,.05);ng.gain.setTargetAtTime(vol*.06,t,.05);if(p)p.pan.setTargetAtTime(pan,t,.05);},
    stop(){const t=c.currentTime;g.gain.setTargetAtTime(0,t,.1);ng.gain.setTargetAtTime(0,t,.1);setTimeout(()=>{try{o1.stop();o2.stop();n.stop();}catch(e){}},900);}};}
function ambUpdate(){
  if(!AU.ctx)return;if(!AMB.on)ambInit();if(!AMB.on)return;
  const c=AU.ctx,t=c.currentTime,B=BK,live=!S.paused&&S.mode!=='over'&&!AU.muted,sp=B.vs/100,ni=B.nitroT>0?1:B.boostT>0?.5:0;
  const dt=AMB.lt==null?0:clamp(t-AMB.lt,0,.1);AMB.lt=t;
  const set=(p,v,k)=>p.setTargetAtTime(v,t,k||.08);
  const coast=S.mode==='caught'||S.mode==='tally',brk=!!(S.ctlBrake),thr=coast||brk?0:1,vol=live?(S.demo?.5:1):0;
  /* the bike */
  const r=shiftBox(GBX,Math.min(B.vs,topSpeed()),thr,dt,BIKE_ENG.idle/BIKE_ENG.redline,BVG,B.air);
  if(GBX.ev){if(GBX.ev>0&&live){SFX.qshift();if(AMB.eng)AMB.eng.event({type:'shift'});}GBX.ev=0;}
  const load=GBX.cutT>0||GBX.limCut?0:GBX.blipT>0?.8:ni>0?1:B.air?.5:thr*(B.hitT>0?.4:.86+.14*Math.min(1,Math.abs(B.steer)*1.5));
  /* leaning into a turn the rider rolls off a little and the revs ease; straighten up and it pulls again */
  GBX.lean=(GBX.lean||0)+(Math.min(1,Math.abs(B.steer)*1.3)-(GBX.lean||0))*Math.min(1,dt*3.5);const lean=ni>0||brk||B.air?0:GBX.lean;
  if(AMB.eng)AMB.eng.update({rpm:r*BIKE_ENG.redline*(1-.07*lean),thr:thr*(1-.3*lean),load:load*(1-.35*lean),cut:GBX.cutT>0||GBX.limCut,nos:ni>0,speed:B.vs,gear:GBX.g,vol,dist:3.2,pan:0,rear:1},dt);
  /* the fans spool with the throttle and lag behind it */
  const fanT=clamp(.18+.6*sp*thr+.35*ni+(B.air?.15:0),0,1.4);GBX.fan+=(fanT-GBX.fan)*Math.min(1,dt*(fanT>GBX.fan?1.6:.9));const fan=GBX.fan;
  set(AMB.f1.frequency,1100+2600*fan,.05);set(AMB.f2.frequency,(1100+2600*fan)*1.5,.05);set(AMB.fg.gain,vol*(.012+.028*fan),.08);
  set(AMB.jf.frequency,500+2400*fan,.08);set(AMB.jg.gain,vol*(.02+.08*fan*fan),.1);
  set(AMB.ag.gain,vol*(B.nitroT>0?.16:0),.06);set(AMB.af.frequency,B.nitroT>0?900:300,.2);
  const hz=B.air?48:62;set(AMB.h1.frequency,hz,.15);set(AMB.h2.frequency,hz*.5,.15);set(AMB.hg.gain,vol*(B.air?.02:.045),.1);
  set(AMB.bg.gain,vol*(brk&&B.vs>20?.06+.06*sp:0),.05);
  set(AMB.wg.gain,live?.01+.07*sp*sp+ni*.05:0);set(AMB.wf.frequency,500+sp*1800);
  /* the getaway car: you hear its twin-turbo V8 when you are close enough to matter */
  if(AMB.tgv){let tv=0,pan=0,dd=200,face=1,tr=.3;
    if(TG.on){const al=TG.s-B.s+6,lat=TG.u-B.u;dd=Math.hypot(al,lat);const l=Math.max(.5,dd);pan=clamp(lat/l,-1,1);face=clamp(al/l,-1,1);
      tv=vol*clamp(1.4-dd/160,0,1);tr=shiftBox(GBX.tg,TG.vs,TG.brakeT>0?0:1,dt,TG_ENG.idle/TG_ENG.redline,TGVG,false);if(GBX.tg.ev){GBX.tg.ev=0;}}
    const tl=GBX.tg.cutT>0?0:TG.brakeT>0||TG.state==='caught'?0:1;
    /* the synth hears how far away it is: the pitch drops on its own as it pulls away or you pass it */
    AMB.tgv.update({rpm:tr*TG_ENG.redline,thr:tl,load:tl,cut:GBX.tg.cutT>0,speed:TG.vs,gear:GBX.tg.g,vol:tv*1.2,dist:Math.max(1,dd),pan,rear:clamp(.5+.5*face,0,1)},dt);}
  /* hover traffic: the nearest two, with a push of air as each one goes by */
  const cand=[];for(const o of TR.cars){if(o.dead)continue;const al=o.s-B.s+6,lat=o.u-B.u,d=Math.hypot(al,lat);
    if(o._al!=null&&Math.sign(o._al)!==Math.sign(al)&&Math.abs(lat)<6&&live&&B.vs-o.vs>15)SFX.passby(Math.min(1,(B.vs-o.vs)/60),clamp(lat/5,-1,1));o._al=al;if(d<80)cand.push([d,o,al,lat]);}
  cand.sort((a,b)=>a[0]-b[0]);const want=new Set(cand.slice(0,2).map(q=>q[1]));
  for(const [o,v] of AMB.pool)if(!want.has(o)){v.stop();AMB.pool.delete(o);}
  for(const [d,o,al,lat] of cand){if(!want.has(o))continue;let v=AMB.pool.get(o);if(!v){v=hoverCar(c);AMB.pool.set(o,v);}
    const l=Math.max(.5,d),away=(o.vs-B.vs)*al/l,dop=clamp(343/(343+away),.7,1.35);v.set((240+o.vs*7)*dop,vol*clamp(8/(d+4),0,1),clamp(lat/l,-1,1),t);}
  let sv=0;if(live&&TG.on){const d=Math.abs(TG.s-B.s);sv=S.mode==='caught'||S.mode==='tally'?.045:.012+.04*clamp(1-d/700,0,1);}
  set(AMB.sg.gain,sv,.2);
  if(B.scrape>.5&&live)SFX.grind();
  if(AMB.eng)B.popN=(B.popN||0)+AMB.eng.takePops();
  if(AMB.H)AMB.H.flush();
  AU.mus.gain.setTargetAtTime(S.mode==='race'||S.mode==='play'?.19:.26,t,.4);
}
/* the dispatcher on the radio */
const VOX_ON=store.get('hd-prisma-voice','1')==='1';
function say(txt){
  if(AU.muted||ARC.muted||!VOX_ON)return;
  try{const s=window.speechSynthesis;if(!s)return;s.cancel();const u=new SpeechSynthesisUtterance(txt);u.pitch=1.12;u.rate=1.06;u.volume=.9;
    const vs=s.getVoices?s.getVoices():[],en=vs.filter(v=>/^en/i.test(v.lang));const v=en.find(v=>/female|samantha|victoria|karen|moira|zira|serena|google us english/i.test(v.name))||en[0];if(v)u.voice=v;s.speak(u);}catch(e){}
}
function radio(lines,voice){S.radio={lines,t:0,dur:Math.max(3.5,lines.join(' ').length*.06+1.6)};SFX.radio();if(voice&&!S.demo)say(voice);}

/* =====================================================================================
   INPUT SNAPSHOT + ARCADE BRIDGE
   ===================================================================================== */
function readCtl(){
  const o={x:0,y:0,a:false,b:false,start:false,ok:false,back:false,pause:false,u:false,d:false,l:false,r:false};
  if(K('ArrowLeft')||K('KeyA'))o.x-=1;if(K('ArrowRight')||K('KeyD'))o.x+=1;if(K('ArrowUp')||K('KeyW'))o.y-=1;if(K('ArrowDown')||K('KeyS'))o.y+=1;
  if(K('Space')||K('KeyJ')||K('KeyZ'))o.a=true;if(K('ShiftLeft')||K('ShiftRight')||K('KeyK')||K('KeyX')||K('KeyS')||K('ArrowDown'))o.b=true;
  if(TS.on&&(TS.x||TS.y)){o.x=TS.x;o.y=TS.y;}if(TS.A)o.a=true;if(TS.B)o.b=true;
  for(const p of pads()){
    const b=k=>!!(p.buttons[k]&&p.buttons[k].pressed),lx=p.axes[0]||0,ly=p.axes[1]||0;
    if(Math.abs(lx)>.15)o.x=lx;if(Math.abs(ly)>.5)o.y=ly;if(b(14))o.x=-1;if(b(15))o.x=1;if(b(12))o.y=-1;if(b(13))o.y=1;
    if(b(0)||b(7)||b(5))o.a=true;if(b(1)||b(6)||b(4))o.b=true;if(b(9))o.start=true;if(b(0))o.ok=true;if(b(1))o.back=true;
  }
  o.x=clamp(o.x,-1,1);o.u=o.y<-.5;o.d=o.y>.5;o.l=o.x<-.5;o.r=o.x>.5;
  o.ok=o.ok||K('Enter')||K('Space')||K('KeyJ')||TS.A;o.back=o.back||K('Escape')||K('Backspace');o.pause=K('Escape')||K('KeyP')||o.start;
  return o;
}
function endInputFrame(){LATCH.clear();PTR.pressed=false;PTR.released=false;}
const ARC={muted:false,last:0,
  post(type,data){if(window.parent===window)return;try{window.parent.postMessage(Object.assign({src:'hyperdot',type,id:CAB.id},data||{}),'*');}catch(e){}},
  score(s){const t=performance.now();if(t-this.last>250){this.last=t;this.post('score',{score:s});}},
  over(score,tickets){this.post('over',{score,tickets:CAB.tickets?Math.max(0,Math.round(tickets||0)):0});},
  exit(){this.post('exit');}
};
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
  if(m.cmd==='start'){audioInit();APP_start();}
  else if(m.cmd==='pause')setPause(true);
  else if(m.cmd==='resume')setPause(false);
  else if(m.cmd==='attract')APP_attract();
  else if(m.cmd==='mute'){ARC.muted=true;setVolume();try{speechSynthesis.cancel();}catch(_){}}
  else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}
});
window.HYPERDOT_GAME={id:CAB.id,title:CAB.title,tickets:CAB.tickets,version:1};

/* =====================================================================================
   GAME STATE AND FLOW
     title (attract demo) -> intro (radio + countdown) -> play (pursuit, then takedown)
     -> caught (cinematic) -> tally -> next intro ... -> ending      play -> timeup -> over
   ===================================================================================== */
const S={mode:'title',t:0,clock:0,score:0,hi:parseInt(store.get('hd-prisma-hi','0'),10)||0,time:60,stage:0,demo:true,paused:false,menuI:0,pauseI:0,how:-1,
  msgs:[],big:null,radio:null,chain:0,chainT:0,hits:0,stats:null,contact:false,shake:0,flash:0,newHi:false,tickets:0,attractN:0,
  camMode:0,camT:0,caughtT:0,bolt:0,boltT:6,tally:null,warnT:0,count:0,over:false,cont:0,best:null};
function newStats(){return {near:0,smash:0,air:0,pads:0,rams:0,hits:0,bestChain:0};}
function stageSetup(i,demo){
  ST=STAGES[i];S.stage=i;S.demo=demo;
  bikeReset(0,LANES[2]);trReset(17+i*31+(demo?7:0));featReset(101+i*13);featFill(0);SPK.length=0;
  for(let k=0;k<ST.cars;k++)spawnCar(70,620);
  tgReset(demo?110:ST.gap);DR[0].on=DR[1].on=0;
  S.time=ST.time;S.contact=false;S.stats=newStats();S.chain=0;S.chainT=0;S.msgs.length=0;S.big=null;S.radio=null;S.warnT=0;
  stageUniforms();
}
function APP_attract(){
  S.mode='title';S.t=0;S.paused=false;S.how=-1;S.menuI=0;S.over=false;$('pauseBtn').textContent='Pause';
  stageSetup(S.attractN%4,true);S.attractN++;BK.vs=ST.top*.8;TG.vs=ST.tgtV;setTrack('title');S.camMode=0;S.camT=0;
}
function APP_start(){
  S.score=0;S.cont=0;S.over=false;S.newHi=false;S.paused=false;$('pauseBtn').textContent='Pause';
  startStage(0);SFX.confirm();ARC.score(0);
}
function startStage(i){stageSetup(i,false);S.mode='intro';S.t=0;setTrack(ST.tr);radio(ST.brief,ST.say);}
function setPause(on){if(S.mode!=='play'&&S.mode!=='intro')on=false;S.paused=on;S.pauseI=0;$('pauseBtn').textContent=on?'Resume':'Pause';if(on){try{speechSynthesis.pause();}catch(e){}}else{try{speechSynthesis.resume();}catch(e){}}}
/* ---------- scoring ---------- */
function addScore(n){S.score+=n;if(!S.demo)ARC.score(Math.floor(S.score));}
function flashMsg(text,col,dur){S.msgs.push({text,col:col||'#ffffff',t:0,dur:dur||1.1});if(S.msgs.length>3)S.msgs.shift();}
function bigMsg(text,col,sub){S.big={text,col,sub,t:0};}
function hitStat(k=1){if(S.stats){S.stats.hits+=k;}S.chain=0;}
function nearMiss(t){S.chain++;S.chainT=3;const m=Math.min(8,S.chain);addScore(250*m);S.stats.near++;S.stats.bestChain=Math.max(S.stats.bestChain,S.chain);
  flashMsg(m>1?'NEAR MISS x'+m:'NEAR MISS',m>4?'#ff5ad8':m>2?'#ffd040':'#7ff0ff',.9);SFX.horn();}
function smashBonus(){addScore(400);S.stats.smash++;flashMsg('SMASH! +400','#9fe6ff',.9);}
function padBonus(){addScore(100);S.stats.pads++;flashMsg('BOOST','#4fe3ff',.7);}
function airBonus(t){const p=Math.round(t*600/50)*50;addScore(p);S.stats.air++;flashMsg((t>1.3?'BIG AIR ':'AIR ')+t.toFixed(1)+'S +'+p,'#c8a0ff',1.1);}
function ramHit(dm,nitro){
  const before=TG.dmg;TG.dmg=Math.min(100,TG.dmg+dm);if(TG.dmg>=93)TG.dmg=100;S.stats.rams++;addScore(600+Math.round(dm)*25);S.flash=Math.max(S.flash,nitro?.5:.3);
  flashMsg(nitro?'NITRO RAM!':'RAM!',nitro?'#7fe8ff':'#ffd040',.8);
  if(before<50&&TG.dmg>=50&&TG.dmg<100&&!S.demo)radio(['HE IS BREAKING UP.','KEEP HITTING HIM!'],"He's breaking up! Keep hitting him!");
  if(TG.dmg>=100)caught();
}
function caught(){
  TG.state='caught';TG.spinV=(Math.random()<.5?-1:1)*2.6;TG.vu=Math.sign(TG.u||1)*-2;S.caughtT=0;
  for(let i=TR.cars.length-1;i>=0;i--){const t=TR.cars[i];if(t.s<TG.s+80)TR.cars.splice(i,1);}
  if(S.demo)return;
  S.mode='caught';S.t=0;SFX.caught();setTrack('win');
  addScore(10000*(S.stage+1));bigMsg('SUSPECT','#ffd040','APPREHENDED');radio(['SUSPECT IN CUSTODY.','NICE DRIVING, PRISMA.'],'Suspect in custody. Nice driving, Prisma.');
}
function contact(){
  S.contact=true;if(S.demo)return;S.time=Math.min(99,S.time+25);SFX.extend();setTrack('take');
  bigMsg('TARGET IN SIGHT','#ff5ad8','+25 SEC  RAM HIM!');radio(['VISUAL ON THE SUSPECT.','TAKE HIM DOWN!'],'Visual on the suspect. Take him down!');
}
function timeUp(){S.mode='timeup';S.t=0;S.count=9.99;setTrack('over');SFX.lose();say('Time up. He got away.');}
function finalize(){
  S.over=true;S.tickets=Math.round(S.score/2500);
  if(S.score>S.hi){S.hi=Math.floor(S.score);store.set('hd-prisma-hi',S.hi);S.newHi=true;}else S.newHi=false;
  ARC.over(Math.floor(S.score),S.tickets);
}
function gameOver(){finalize();S.mode='over';S.t=0;setTrack('over');}
function startTally(){
  const tb=Math.floor(S.time)*500,clean=S.stats.hits<1?5000:0;
  S.tally={rows:[['TIME BONUS',Math.floor(S.time)+' S',tb],['NEAR MISSES',S.stats.near+'  BEST x'+Math.min(8,S.stats.bestChain),0],['RAMS',S.stats.rams+'',0],['AIR + BOOST',(S.stats.air+S.stats.pads)+'',0],['CLEAN RIDE',S.stats.hits<1?'YES':'NO',clean]],shown:0,pay:tb+clean,paid:0,t:0};
  S.mode='tally';S.t=0;
}
function nextStage(){
  if(S.stage>=STAGES.length-1){finalize();S.mode='ending';S.t=0;setTrack('win');radio(['ALL UNITS: THE CITY IS QUIET.','GOOD NIGHT, PRISMA.'],'All units, the city is quiet. Good night, Prisma.');return;}
  startStage(S.stage+1);
}
/* ---------- the pilot that drives the attract demo (and the soak tests) ---------- */
function autopilot(){
  const B=BK,o={x:0,brake:false,nitro:false};
  const near=TG.on&&TG.state!=='caught'&&TG.s-B.s<170&&TG.s-B.s>-6;
  let best=B.u,bs=-1e9,clearAhead=999;
  for(const cu of [-6.75,-4.5,-2.25,0,2.25,4.5,6.75]){
    let cl=260;for(const t of TR.cars){const ds=t.s-B.s;if(ds<-2.5||ds>260)continue;const tu=t.u+t.vu*Math.min(2,ds/Math.max(8,B.vs-t.vs));if(Math.abs(tu-cu)<2.4)cl=Math.min(cl,ds);}
    let sc=cl-Math.abs(cu-B.u)*5;
    if(near)sc-=Math.abs(cu-TG.u)*(TG.s-B.s<60?9:4);
    for(const f of FEAT.list){const ds=f.z-B.s;if(ds>0&&ds<180&&Math.abs(f.u-cu)<1.2)sc+=f.k==='ramp'?30:45;}
    if(sc>bs){bs=sc;best=cu;}
    if(Math.abs(cu-B.u)<1.2)clearAhead=Math.min(clearAhead,cl);
  }
  const gap=TG.s-B.s;if(near&&gap<45)best=TG.u;
  o.x=clamp((best-B.u)*.42-B.vu*.06,-1,1);
  o.brake=clearAhead<B.vs*.25&&B.vs>40&&Math.abs(best-B.u)>2;
  /* don't overshoot the van: hang back if it is not lined up, let it by if we passed it */
  if(TG.on&&TG.state!=='caught'&&((gap<14&&gap>0&&Math.abs(TG.u-B.u)>2.2&&B.vs>TG.vs+4)||(gap<=0&&gap>-60)))o.brake=true;
  const straight=Math.abs(ddpX(B.s))<.0012&&Math.abs(ddpX(B.s+120))<.0012;
  o.nitro=B.nitros>0&&B.nitroT<=0&&clearAhead>140&&straight&&(near?TG.s-B.s<40:TG.s-B.s>300||S.time<20);
  return o;
}
/* ---------- simulation of one 60 Hz tick of the world ---------- */
function worldStep(dt,ctl,live){
  S.clock+=dt;if(S.shake>0)S.shake=Math.max(0,S.shake-dt*2.2);if(S.flash>0)S.flash=Math.max(0,S.flash-dt*2.5);
  if(S.chainT>0){S.chainT-=dt;if(S.chainT<=0)S.chain=0;}
  for(const m of S.msgs)m.t+=dt;S.msgs=S.msgs.filter(m=>m.t<m.dur);if(S.big){S.big.t+=dt;if(S.big.t>2.6)S.big=null;}
  if(S.radio){S.radio.t+=dt;if(S.radio.t>S.radio.dur)S.radio=null;}
  featFill(BK.s);
  /* lightning over the rain-soaked downtown */
  if(ST.rain){S.boltT-=dt;if(S.boltT<=0){S.boltT=8+Math.random()*12;S.bolt=1;SFX.thunder(.7+Math.random()*.3);}}
  if(S.bolt>0)S.bolt=Math.max(0,S.bolt-dt*(S.bolt>.6?2:5));
  const glide=TG.on&&TG.state==='caught';
  if(live&&!glide){
    if(ctl.nitro)useNitro();
    S.ctlBrake=!!ctl.brake;bikeStep(dt,ctl);
    tgStep(dt,S.demo);
    bikeContacts();
    if(!S.demo)addScore(BK.vs*dt*.4);
    if(!S.contact&&TG.on&&TG.s-BK.s<55)contact();
  }else if(glide){
    /* glide to a stop behind the van */
    S.caughtT+=dt;BK.vs=Math.max(0,Math.min(BK.vs-26*dt,(TG.s-15-BK.s)*1.6));
    bikeStep(dt,{x:clamp((TG.u-BK.u)*.15,-.4,.4),coast:true});if(BK.s>TG.s-11)BK.s=TG.s-11;tgStep(dt,S.demo);
  }else if(S.mode==='timeup'||S.mode==='over'){
    BK.vs=Math.max(0,BK.vs-22*dt);bikeStep(dt,{x:0,coast:true});tgStep(dt,S.demo);
  }
  trStep(dt,S.mode==='play'||S.mode==='title'||S.mode==='intro');
  drStep(dt,S.clock);spkStep(dt);
}
