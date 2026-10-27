/* =====================================================================================
   13. SOUND: your engine, the field's engines going by, tyres, kerbs, crowd; effects; music
   ===================================================================================== */
/* every car in the field has its own engine, from the Shiftlight Engine Lab (6a_engine.js). Each one
   is a Lab preset with any edits: to try another, put a preset id here (v10, gp, v12, flat6, rotary3,
   muscle, flatplane, five, six, boxer, ...) or paste a spec from the Lab's "Copy engine spec" button in
   place of the id. The game owns the gearbox; the Lab's synth does the rest. */
const ENGINE_SPECS={
  YOU:  {label:'5.2 V10',    lab:'v10',      over:{launch:1,launchRpm:5000}},
  VEX:  {label:'6.5 V12',    lab:'v12'},
  NOVA: {label:'4.0 FLAT-6', lab:'flat6'},
  KAITO:{label:'3-ROTOR',    lab:'rotary3'},
  SABLE:{label:'6.2 V8',     lab:'muscle'},
  MIRA: {label:'4.5 V8',     lab:'flatplane'},
  BRUNO:{label:'2.1 TURBO 5',lab:'five'},
  ZERO: {label:'3.0 TURBO 6',lab:'six'},
  ROAD: {label:'ROAD CAR',   lab:'street4',  over:{ex:0,crackle:.05}},
  TRUCK:{label:'TRUCK',      lab:'eight',    over:{layout:'I6',disp:7,redline:2800,idle:600,tq:900,fi:'none',ex:0,intake:0,cam:0,crackle:0,gearWhine:0}}
};
const ENGINES={};for(const k in ENGINE_SPECS){const q=ENGINE_SPECS[k];ENGINES[k]=Object.assign(HDL.engine(q.lab,q.over),{label:q.label});}
function engineFor(c){if(c.player)return ENGINES.YOU;if(c.type)return c.type==='truck'?ENGINES.TRUCK:ENGINES.ROAD;return (c.drv&&ENGINES[c.drv.name])||ENGINES.VEX;}
const MPS=83.33/VTOP,MSEG=SEG*MPS;      /* metres per second per speed unit, metres per segment */
function engineInit(){
  const c=AU.ctx,e={pool:new Map(),tun:0,wasT:false,lt:null,lastMode:''};
  /* engines get their own bus; the Lab's open-air room sits under them and its tunnel fades in when you're in one */
  e.bus=c.createGain();e.bus.gain.value=.7;e.bus.connect(AU.out);
  e.H=HDL.host(c,e.bus,{slots:touchy?3:4,room:'open',roomSend:.16,tunnel:true});
  e.me=e.H.main(ENGINES.YOU);
  const mkNoise=(type,f,q)=>{const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||1.2;const gg=c.createGain();gg.gain.value=0;s.connect(fl);fl.connect(gg);gg.connect(AU.out);s.start();return {fl,g:gg};};
  e.wind=mkNoise('lowpass',600);e.skid=mkNoise('bandpass',1500,6);e.skid2=mkNoise('bandpass',2400,9);e.kerb=mkNoise('bandpass',140,3);e.crowd=mkNoise('bandpass',1100,.7);
  AU.eng=e;
}
/* the grid: drivers hold the revs steady and blip now and then, each on their own rhythm; brake or nitro and you sit at idle.
   A car with launch control sits on its two-step instead, crackling. */
function gridRpm(c,t){const e=c.eng,h=c.player?.3:(c.drv?c.drv.num:3)*1.7,on=c.player?S.rev>.12:true,iN=e.idle/e.redline;
  const base=e.launch?(e.launchRpm*1.03/e.redline-iN)/(1-iN):c.player?.6:.42+.12*((h*7.3)%1);
  const hold=on?base+.035*Math.sin(t*2.3+h)+.02*Math.sin(t*6.1+h*2)+(e.launch?0:.2*Math.max(0,Math.sin(t*(1.7+h%1.1)+h*3))**12):0;
  return e.idle+hold*(e.redline-e.idle);}
function engineUpdate(){
  const e=AU.eng,c=AU.ctx;if(!e||!c||!P)return;const t=c.currentTime,dt=e.lt==null?1/60:clamp(t-e.lt,0,.1);e.lt=t;
  const live=!AU.muted&&!ARC.muted&&!S.paused&&['race','grid','finish','title','menu','hw','hwover'].includes(S.mode),vol=S.mode==='title'||S.mode==='menu'?.45:1;
  const grid=S.mode==='grid',sp=P.v/VTOP;
  if(!P.eng)P.eng=engineFor(P);
  /* lights on the grid: every engine on the grid is started, one after another */
  if(grid&&e.lastMode!=='grid'){e.me.start();for(const v of e.pool.values())v.startAt=t+.3+Math.random()*1.2;}
  e.lastMode=S.mode;
  /* a tunnel closes in around you: the reverb follows the camera, and the entrance thumps */
  const inT=P.seg&&P.seg.tun?1:0;e.tun+=(inT-e.tun)*.08;if(inT&&!e.wasT&&sp>.35&&live)SFX.tunnel(sp);e.wasT=!!inT;e.H.tunnel(e.tun*.7,t);
  /* your engine: the camera sits behind the car, so you hear the exhaust */
  const rev=S.rev>.12;
  e.me.update({rpm:grid?gridRpm(P,S.gridT):P.rpm*P.eng.redline,thr:grid?(rev?1:0):P.thr,load:grid?(rev?.6:.1):P.load,cut:!grid&&(P.cutT>0||P.limCut),nos:P.nitroOn||P.boostT>0,
    speed:P.v*MPS,gear:P.gear,vol:live?vol:0,dist:3.4,pan:0,rear:1,launch:grid&&S.rev>.5},dt);
  if(P.evShift){if(P.evShift>0&&live){SFX.shift();if(P.thr>.6)e.me.event({type:'shift'});}P.evShift=0;}
  P.popN=(P.popN||0)+e.me.takePops();
  /* the field: the nearest few cars each get a voice. The synth hears how far away each one is,
     so the pitch drops on its own as a car goes by, and you hear the tailpipes of the cars ahead */
  const pool=S.mode==='hw'||S.mode==='hwover'?TRAFFIC:CARS,cand=[];
  for(const o of pool){if(o===P)continue;if(!o.eng)o.eng=engineFor(o);
    const al=(dSeg(P.z,o.z)+PLAYERZ/SEG)*MSEG,lat=(o.x-P.x)*6.5,d=Math.hypot(al,lat);
    if(o._al!=null&&Math.sign(o._al)!==Math.sign(al)&&Math.abs(lat)<9&&live){const rv=Math.abs(o.v-P.v)*MPS;if(rv>10)SFX.passby(Math.min(1,rv/60)*.6,clamp(lat/6,-1,1));}
    o._al=al;if(d<90)cand.push([d,o,al,lat]);}
  cand.sort((a,b)=>a[0]-b[0]);const want=new Set(cand.slice(0,e.H.voices.length-1).map(q=>q[1]));
  for(const [o,v] of e.pool)if(!want.has(o)){v.release();e.pool.delete(o);}
  for(const [d,o,al,lat] of cand){if(!want.has(o))continue;let v=e.pool.get(o);
    if(!v){v=e.H.take(o.eng);if(!v)continue;e.pool.set(o,v);if(grid)v.startAt=t+.3+Math.random()*1.2;else v.run();}
    if(v.startAt&&t>=v.startAt){v.start();v.startAt=0;}
    const l=Math.max(.5,d);
    const rpm=grid?gridRpm(o,S.gridT):o.type?o.eng.idle+Math.min(1,o.v/VTOP*1.6)*(o.eng.redline*.55-o.eng.idle):o.rpm*o.eng.redline;
    const thr=grid?1:o.type?.4:(o.thr==null?o.load:o.thr);
    v.update({rpm,thr,load:grid?.55:o.type?.35:(o.load==null?o.thr:o.load),cut:!grid&&!o.type&&(o.cutT>0||o.limCut),nos:o.nitroOn,speed:o.v*MPS,gear:o.gear,
      vol:live?vol*.85*clamp(1.3-d/90,0,1):0,dist:l,pan:clamp(lat/l*1.1,-1,1),rear:clamp(.5+.5*al/l,0,1),launch:grid},dt);
    if(o.evShift){if(o.evShift>0&&(o.thr||0)>.6)v.event({type:'shift'});o.evShift=0;}
    o.popN=(o.popN||0)+v.takePops();}
  e.H.flush();
  /* tyres, wind, kerbs, the crowd */
  e.wind.g.gain.setTargetAtTime(live?sp*sp*.12*vol:0,t,.2);e.wind.fl.frequency.setTargetAtTime(400+sp*1600,t,.2);
  const sq=P.drift?.75:P.slide>.12?Math.min(.8,P.slide*1.6):0,gr=P.offroad&&sp>.2?.06:0;
  e.skid.g.gain.setTargetAtTime(live?(sq*.15+gr)*vol:0,t,.05);e.skid.fl.frequency.setTargetAtTime(P.offroad?700:1100+Math.min(1,P.slide)*900,t,.1);
  e.skid2.g.gain.setTargetAtTime(live?Math.max(0,sq-.4)*.1*vol:0,t,.05);
  e.kerb.g.gain.setTargetAtTime(live&&P.onKerb&&sp>.2?.25:0,t,.03);
  const near=TR.kind==='circuit'?Math.abs(dSeg(P.z,TR.startI*SEG)):999;
  e.crowd.g.gain.setTargetAtTime(live&&near<70?(.05+(S.cheer>0?.08:0))*(1-near/70):0,t,.3);
  /* the music steps back while engines are running */
  const racing=['race','grid','hw','finish'].includes(S.mode);AU.mus.gain.setTargetAtTime(racing?.15:.22,t,.4);
}
/* sound effects, short and layered. Rate-limited below so twenty at once never clip. */
const SFX={
  select(){tone(990,now(),.05,'square',.045);},
  confirm(){const t=now();tone(880,t,.06,'square',.06);tone(1320,t+.06,.18,'square',.06,AU.sfx,0,0,.2);},
  back(){const t=now();tone(660,t,.06,'square',.05);tone(440,t+.06,.1,'square',.05);},
  light(){tone(440,now(),.22,'square',.08,AU.sfx,0,2500,.2);},
  go(){const t=now();tone(880,t,.5,'square',.09,AU.sfx,0,3500,.3);tone(1320,t,.5,'square',.05,AU.sfx,0,3500);},
  beep(){tone(1200,now(),.08,'square',.05);},
  shift(){const t=now();noise(t,.035,.05,2600,900,'bandpass');tone(140,t,.03,'square',.03,AU.sfx,70);},
  /* a car going by close: a burst of air whose pitch falls as it passes */
  passby(k=.5,pan=0){const t=now();noise(t,.35+.25*k,.06+.12*k,2600*(1+k),500,'bandpass',0,0,.9,pan);},
  tunnel(k=.5){const t=now();noise(t,.5,.1+.12*k,900,80,'lowpass',0,.3);tone(48,t,.35,'sine',.12*k,AU.sfx,30);},
  nitro(){const t=now();noise(t,.9,.25,200,6000,'bandpass');tone(70,t,.8,'sawtooth',.1,AU.sfx,220,1200);},
  boost(){const t=now();noise(t,.5,.18,400,5000,'bandpass');tone(220,t,.35,'square',.05,AU.sfx,660,2500);},
  wall(k=1){const t=now();noise(t,.18+k*.1,.18+Math.min(.3,k*.2),5000,800,'bandpass');if(k>.6)tone(90,t,.25,'sine',.3,AU.sfx,40);},
  bump(k=.5){const t=now();noise(t,.12,.15+k*.2,1800,300,'lowpass');tone(120,t,.12,'sine',.2+k*.2,AU.sfx,60);},
  spin(){const t=now();noise(t,1.1,.25,3000,900,'bandpass',0,.2,3);},
  lap(){const t=now();[0,7,12].forEach((n,i)=>tone(mtof(76+n),t+i*.08,.18,'square',.06,AU.sfx,0,4000,.2));},
  final(){const t=now();[0,4,7,12,7,12,16].forEach((n,i)=>tone(mtof(72+n),t+i*.09,.2,'square',.06,AU.sfx,0,4000,.25));},
  best(){const t=now();[0,4,7,11,14].forEach((n,i)=>tone(mtof(79+n),t+i*.06,.2,'triangle',.06,AU.sfx,0,0,.3));},
  up(){const t=now();tone(1046,t,.07,'square',.05);tone(1568,t+.07,.12,'square',.05,AU.sfx,0,0,.2);},
  down(){const t=now();tone(784,t,.08,'square',.04);tone(523,t+.08,.14,'square',.04);},
  draft(){tone(1760,now(),.12,'triangle',.03,AU.sfx,2640);},
  check(){const t=now();[0,4,7,12,16].forEach((n,i)=>tone(mtof(76+n),t+i*.07,.2,'square',.06,AU.sfx,0,4000));},
  warn(){tone(1200,now(),.08,'square',.05);},
  crash(){const t=now();noise(t,.7,.5,3000,80);tone(90,t,.4,'sine',.4,AU.sfx,30);},
  miss(){const t=now();noise(t,.35,.18,500,4000,'bandpass');tone(1320,t+.05,.12,'triangle',.06);tone(1760,t+.12,.16,'triangle',.06);},
  ticket(){const t=now();for(let i=0;i<3;i++)tone(1600+i*200,t+i*.05,.05,'square',.03);},
  win(){const t=now();[0,4,7,12,16,19,24].forEach((n,i)=>tone(mtof(72+n),t+i*.1,.4,'square',.05,AU.sfx,0,0,.35));},
  lose(){const t=now();[12,7,3,0].forEach((n,i)=>tone(mtof(60+n),t+i*.22,.4,'sawtooth',.05,AU.sfx,0,1500,.3));},
  cheer(){const t=now();noise(t,2.2,.12,900,1400,'bandpass',0,.4,.6);}
};
{const lim={ticket:.04,wall:.08,bump:.1,shift:.05,draft:.5};const last={};for(const k of Object.keys(SFX)){const fn=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;fn(...a);};}}
/* ---- step-sequencer music: bass/lead/drums strings, 16 steps a bar, chords by scale degree ----
   bass: R root O octave F fifth T third . rest   lead: 1..g scale degree, '-' hold   x = hit */
const SCALES={minor:[0,2,3,5,7,8,10],phryg:[0,1,3,5,7,8,10],harm:[0,2,3,5,7,8,11],dorian:[0,2,3,5,7,9,10],major:[0,2,4,5,7,9,11],penta:[0,3,5,7,10],mixo:[0,2,4,5,7,9,10]};
function sdeg(tr,d){const sc=SCALES[tr.scale],n=sc.length,o=Math.floor(d/n),i=((d%n)+n)%n;return sc[i]+12*o;}
const LEADCH='123456789abcdefg';
const TRACKS={
  title:{bpm:112,root:45,scale:'dorian',prog:[0,3,4,3],bass:'R...R.O.R...R.F.',lead:'5---4-3-1---2-3-5---6-5-3-2-1---',kick:'x.......x.......',snare:'....x.......x...',hat:'..x...x...x...x.',arp:'8',pad:1,lv:.032},
  neon:{bpm:132,root:41,scale:'minor',prog:[0,5,6,4],bass:'R.RO.RR.R.RO.RF.',lead:'8.7.5.3.5---6.5.3.2.1---2.3.5---',kick:'x...x...x...x...',snare:'....x.......x...',hat:'.x.x.x.x.x.x.x.x',arp:'16',pad:1,lv:.034},
  coast:{bpm:120,root:43,scale:'mixo',prog:[0,4,5,3],bass:'R..R..O.R..R.FO.',lead:'3-5-6-5-3-2-1---3-5-8-7-6---5---',kick:'x..x..x...x.....',snare:'....x.......x...',hat:'x.xxx.xxx.xxx.xx',arp:'8',pad:1,lv:.034},
  tunnel:{bpm:140,root:38,scale:'phryg',prog:[0,1,0,6],bass:'RRORRRORRROR.RFR',lead:'1...2...3-5-....1...2...7-6-....',kick:'x...x...x...x...',snare:'....x..x....x...',hat:'xxxxxxxxxxxxxxxx',arp:'16',pad:0,lv:.03},
  peaks:{bpm:126,root:40,scale:'minor',prog:[0,5,2,6],bass:'R...O...R...O.F.',lead:'5---6---8---7-6-5---3---2-3-5---',kick:'x.....x.x.......',snare:'....x.......x...',hat:'..x...x...x...xx',arp:'8',pad:1,lv:.033},
  magma:{bpm:146,root:36,scale:'harm',prog:[0,5,4,0],bass:'R.R.RORFR.R.RORT',lead:'8-7-6-5-7---5---4-5-6-7-8---a---',kick:'x.x.x...x.x.x...',snare:'....x.......x..x',hat:'x.x.x.x.x.x.x.x.',arp:'16',pad:1,lv:.034},
  highway:{bpm:136,root:43,scale:'major',prog:[0,5,3,4],bass:'R.RO.RR.R.RO.RF.',lead:'1.3.5.8-7.5.6.4.5.3.1.3.2-------',kick:'x...x...x...x...',snare:'....x.......x...',hat:'x.x.x.x.x.x.x.x.',pad:1,lv:.038},
  results:{bpm:96,root:48,scale:'major',prog:[0,5,3,4],bass:'R.......F.......',lead:'5---3---4---2---3---1---2-------',kick:'x.......x.......',snare:'........x.......',hat:'..x...x...x...x.',arp:'8',pad:1,lv:.03},
  champ:{bpm:120,root:48,scale:'major',prog:[0,3,4,0],bass:'R.R.O.R.R.R.O.F.',lead:'8---8-9-a---8---9---7-8-5-------',kick:'x...x...x...x...',snare:'....x.......x.xx',hat:'xxxxxxxxxxxxxxxx',arp:'16',pad:1,lv:.04},
  over:{bpm:76,root:40,scale:'minor',prog:[0,5,3,4],bass:'R.......R.......',lead:'................................',kick:'x...............',snare:'................',hat:'................',pad:1,lv:0}
};
function setTrack(name){AU.want=name;}
function musicTick(paused){
  const c=AU.ctx;if(!c||c.state!=='running')return;
  if(AU.want!==AU.track){AU.track=AU.want;AU.step=0;AU.next=Math.max(AU.next,c.currentTime+.05);}
  const tr=TRACKS[AU.track];if(!tr)return;
  const sd=60/tr.bpm/4;if(AU.next<c.currentTime)AU.next=c.currentTime+.03;
  while(AU.next<c.currentTime+.15){
    const st=AU.step,s=st&15,bar=(st>>4)%tr.prog.length,d=tr.prog[bar],t=AU.next,R=tr.root;
    if(!AU.muted&&!ARC.muted&&!paused){
      const bc=tr.bass[s];
      if(bc!=='.'){const n=R+sdeg(tr,d)+(bc==='O'?12:bc==='F'?sdeg(tr,d+4)-sdeg(tr,d):bc==='T'?sdeg(tr,d+2)-sdeg(tr,d):0);tone(mtof(n),t,sd*1.7,'sawtooth',.12,AU.mus,0,700);}
      if(tr.kick[s]==='x'){const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);const gn=c.createGain();env(gn,t,.002,.42,.16);o.connect(gn);gn.connect(AU.mus);o.start(t);o.stop(t+.22);}
      if(tr.snare[s]==='x'){noise(t,.14,.22,2800,900,'bandpass',AU.mus);tone(190,t,.06,'triangle',.07,AU.mus,120);}
      if(tr.hat[s]==='x')noise(t,.025,.055,9000,7000,'highpass',AU.mus);
      const lc=tr.lead[st%32];
      if(lc&&lc!=='.'&&lc!=='-'&&tr.lv){let len=1;while(tr.lead[(st+len)%32]==='-'&&len<16)len++;const dg=LEADCH.indexOf(lc);
        const o=c.createOscillator();o.type='square';o.frequency.setValueAtTime(mtof(R+24+sdeg(tr,dg)),t);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=2600;
        const gn=c.createGain();env(gn,t,.01,tr.lv,sd*len*.95);o.connect(fl);fl.connect(gn);gn.connect(AU.mus);gn.connect(AU.dly);o.start(t);o.stop(t+sd*len+.1);}
      if(tr.arp){const ev=tr.arp==='16'?1:2;if(s%ev===0){const k=(s/ev|0)%4,deg=[0,2,4,7][k];tone(mtof(R+12+sdeg(tr,d+deg)),t,sd*ev*.9,'triangle',.03,AU.mus);}}
      if(tr.pad&&s===0){for(const k of [0,2,4]){const fq=mtof(R+12+sdeg(tr,d+k));tone(fq,t,sd*15,'sawtooth',.016,AU.mus,0,900,0,sd*4);tone(fq*1.006,t,sd*15,'sawtooth',.012,AU.mus,0,900,0,sd*4);}}
    }
    AU.next+=sd;AU.step++;
  }
}
