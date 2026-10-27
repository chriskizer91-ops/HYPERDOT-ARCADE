/* ---- coin sound model. A coin rings like a free thin disc: inharmonic modes at ~1, 1.73, 2.33, 3.91, 4.11 x f0,
   each a damped resonator (y[n] = 2r cos(w) y[n-1] - r^2 y[n-2]) with higher modes dying faster. Every impact class
   gets its own bank of variants synthesised once at start-up: coin on coin (two discs ring together), coin on the
   felt playfield (a damped tock), coin on steel (a plate ring under the coin), the payout tray (a short cascade
   into a resonant tray), the gutter (a dull thunk). Voices are budgeted so a 20-coin shower never clips. ---- */
const CLK={ready:false,cc:[],cf:[],cm:[],tray:[],gut:[],act:0,frame:0};
function synthBank(){
  const c=AU.ctx,sr=c.sampleRate,rng=mulberry(4242),MR=[1,1.73,2.33,3.91,4.11];
  const buf=(dur,fill)=>{const n=(dur*sr)|0,b=c.createBuffer(1,n,sr),d=b.getChannelData(0);fill(d,n);let m=1e-6;for(let i=0;i<n;i++)m=Math.max(m,Math.abs(d[i]));const k=.9/m;for(let i=0;i<n;i++)d[i]*=k;return b;};
  const ring=(d,n,f,amp,tau,start)=>{const w=2*Math.PI*f/sr;if(w>=Math.PI)return;const r=Math.exp(-1/(tau*sr)),c2=2*r*Math.cos(w),r2=r*r;let y1=0,y2=0;const s0=(start*sr)|0;
    for(let i=s0;i<n;i++){const y=(i===s0?amp*Math.sin(w):c2*y1-r2*y2);d[i]+=y;y2=y1;y1=y;if(y1*y1+y2*y2<1e-12&&i>s0+200)break;}};
  const click=(d,n,amp,len,start,bright)=>{const s0=(start*sr)|0,L=(len*sr)|0;let lp=0;for(let i=0;i<L&&s0+i<n;i++){const x=rng()*2-1;lp+=(x-lp)*bright;d[s0+i]+=(x-lp*.6)*amp*Math.pow(1-i/L,3);}};
  const coin=(d,n,f0,tau0,amp,start)=>{for(let k=0;k<MR.length;k++)ring(d,n,f0*MR[k]*(1+(rng()-.5)*.01),amp*(.35+rng()*.65)/(1+k*.4),tau0*Math.pow(1/MR[k],.7),start);};
  for(let v=0;v<14;v++)CLK.cc.push(buf(.42,(d,n)=>{const f=3100+rng()*2300;click(d,n,.5,.003,0,.6);coin(d,n,f,.06+rng()*.2,1,0);coin(d,n,f*(1.04+rng()*.12),.05+rng()*.15,.7,.0004);}));
  for(let v=0;v<8;v++)CLK.cf.push(buf(.16,(d,n)=>{const f=2600+rng()*1800;click(d,n,.9,.006,0,.25);coin(d,n,f,.012+rng()*.02,.55,0);ring(d,n,170+rng()*90,1.2,.018,0);}));
  for(let v=0;v<6;v++)CLK.cm.push(buf(.6,(d,n)=>{const f=3000+rng()*2000;click(d,n,.6,.004,0,.5);coin(d,n,f,.08+rng()*.1,.8,0);
    for(const pf of [880,1370,1910,2480])ring(d,n,pf*(1+(rng()-.5)*.08),.35,.22+rng()*.15,0);}));
  for(let v=0;v<6;v++)CLK.tray.push(buf(.9,(d,n)=>{const m=3+((rng()*5)|0);for(let k=0;k<m;k++){const t=k*.025+rng()*.04;const f=3000+rng()*2400;click(d,n,.4,.003,t,.6);coin(d,n,f,.08+rng()*.12,.6+rng()*.4,t);}
    for(const pf of [612,1083,1690])ring(d,n,pf,.25,.45,0);}));
  for(let v=0;v<3;v++)CLK.gut.push(buf(.5,(d,n)=>{click(d,n,1,.02,0,.08);ring(d,n,240+rng()*60,1,.05,0);ring(d,n,520,.3,.04,0);for(let k=0;k<4;k++){const t=.06+k*.07;click(d,n,.3*(1-k/5),.01,t,.1);ring(d,n,1900-k*250,.12,.03,t);}}));
  CLK.ready=true;
}
function playBuf(b,vol,rate,pan,when){
  const c=AU.ctx;if(!c||AU.muted||ARC.muted||CLK.act>18)return;
  const s=c.createBufferSource();s.buffer=b;s.playbackRate.value=rate;const gn=c.createGain();gn.gain.value=vol;s.connect(gn);
  let n=gn;if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=clamp(pan,-1,1);gn.connect(p);n=p;}
  n.connect(AU.sfx);CLK.act++;s.onended=()=>{CLK.act--;};s.start(when||c.currentTime);
}
/* ---- the pusher motor: two detuned saws through a low-pass (the hum) + band-passed noise (gear whirr) +
   a high band of noise for coins scraping, all following pusher speed and load ---- */
const MOT={on:false};
function motorEnsure(){const c=AU.ctx;if(!c||MOT.on)return;MOT.on=true;
  const o1=c.createOscillator(),o2=c.createOscillator();o1.type='sawtooth';o2.type='sawtooth';o1.frequency.value=46;o2.frequency.value=92.6;
  const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=260;lp.Q.value=2.5;const g1=c.createGain();g1.gain.value=0;
  o1.connect(lp);o2.connect(lp);lp.connect(g1);g1.connect(AU.sfx);
  const ns=c.createBufferSource();ns.buffer=AU.noise;ns.loop=true;const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1300;bp.Q.value=5;const g2=c.createGain();g2.gain.value=0;ns.connect(bp);bp.connect(g2);g2.connect(AU.sfx);
  const ns2=c.createBufferSource();ns2.buffer=AU.noise;ns2.loop=true;const hp=c.createBiquadFilter();hp.type='bandpass';hp.frequency.value=5200;hp.Q.value=.9;const g3=c.createGain();g3.gain.value=0;ns2.connect(hp);hp.connect(g3);g3.connect(AU.sfx);
  o1.start();o2.start();ns.start();ns2.start(c.currentTime,.3);Object.assign(MOT,{o1,o2,g1,g2,g3,lp,bp});}
function motorUpdate(active,v,load){
  const c=AU.ctx;if(!c||c.state!=='running')return;motorEnsure();const t=c.currentTime,sp=Math.min(1,Math.abs(v)/3.8),off=AU.muted||ARC.muted||!active;
  const ld=Math.min(1,load*25);
  MOT.g1.gain.setTargetAtTime(off?0:.05+.07*sp,t,.08);MOT.g2.gain.setTargetAtTime(off?0:.012+.03*sp,t,.08);MOT.g3.gain.setTargetAtTime(off?0:.05*ld*sp,t,.06);
  MOT.o1.frequency.setTargetAtTime(44+8*sp-5*ld,t,.1);MOT.o2.frequency.setTargetAtTime(88.6+15*sp-9*ld,t,.1);MOT.bp.frequency.setTargetAtTime(900+900*sp,t,.1);
}
const SFX={
  select(){tone(990,now(),.05,'square',.04);},
  confirm(){const t=now();tone(880,t,.06,'square',.05);tone(1320,t+.06,.18,'square',.05,AU.sfx,0,0,.2);},
  back(){const t=now();tone(660,t,.06,'square',.045);tone(440,t+.06,.1,'square',.045);},
  /* a coin into the slot: latch clack, then the coin ringing as it drops out of the chute */
  drop(x){const t=now();noise(t,.03,.12,3000,800,'bandpass',0,0,2);tone(140,t,.05,'square',.04,AU.sfx,70,600);if(CLK.ready)playBuf(pick(CLK.cc),.18,1.2+Math.random()*.2,x/XW*.7,t+.03);},
  insert(){const t=now();noise(t,.05,.15,2500,600,'bandpass');for(let i=0;i<3;i++)tone(2600-i*300,t+.06+i*.05,.08,'triangle',.05);tone(523,t+.25,.12,'square',.05);tone(784,t+.35,.25,'square',.05,AU.sfx,0,0,.3);},
  clink(type,str,x,z){if(!CLK.ready)return;const v=Math.min(1,(str-2)/14),near=.6+.4*clamp((z-4)/17,0,1),bank=type===0?CLK.cc:type===1?CLK.cf:type===3?CLK.cm:CLK.cm;
    playBuf(bank[(Math.random()*bank.length)|0],(.05+.32*v*v+.06*v)*near,.85+Math.random()*.3,x/XW*.8);},
  tray(n,x){if(!CLK.ready)return;const t=now();for(let k=0;k<Math.min(3,n);k++)playBuf(pick(CLK.tray),.32/(1+k*.5),.9+Math.random()*.25,x/XW*.6,t+k*.06);},
  coinWon(k,x){const t=now();tone(k===2?1568:1976+Math.random()*80,t,.06,'square',.03,AU.sfx,0,0,.15);},
  lost(x){if(CLK.ready)playBuf(pick(CLK.gut),.35,.9+Math.random()*.2,x/XW*.9);const t=now();tone(300,t+.05,.25,'triangle',.03,AU.sfx,120);},
  bonusIn(){const t=now();[0,4,7,12,16,19,24].forEach((n,i)=>tone(mtof(76+n),t+i*.045,.22,'square',.04,AU.sfx,0,3200,.3));},
  prize(){const t=now();[0,4,7,12,7,12,16,24].forEach((n,i)=>{tone(mtof(67+n),t+i*.09,.3,'square',.05,AU.sfx,0,2600,.35);tone(mtof(55+n),t+i*.09,.3,'triangle',.05);});noise(t+.7,.8,.08,9000,3000,'highpass',0,.4);},
  shower(){const t=now();noise(t,1.2,.1,800,6000,'bandpass',0,.3,.8);for(let i=0;i<14;i++)tone(mtof(72+[0,4,7,11,12,16,19][i%7]+12*(i/7|0)),t+i*.05,.16,'triangle',.045,AU.sfx,0,0,.25);},
  peg(sp){const t=now();noise(t,.018,.14*Math.min(1,.4+sp*.08),5000,1500,'bandpass',0,0,3);tone(1800+sp*40,t,.02,'square',.025);},
  wheelWin(lv){const t=now();const seq=lv>2?[0,4,7,12,16,19,24,28]:lv>1?[0,4,7,12,16]:[0,7,12];seq.forEach((n,i)=>tone(mtof(72+n),t+i*.07,.25,'square',.05,AU.sfx,0,0,.3));},
  jackpot(){const t=now();for(let r=0;r<3;r++)[0,4,7,12,16,19,24].forEach((n,i)=>tone(mtof(72+n+r*2),t+r*.5+i*.06,.3,'square',.05,AU.sfx,0,0,.4));noise(t,2,.1,10000,4000,'highpass',0,.5);},
  ticket(){const t=now();noise(t,.012,.07,6000,2500,'bandpass',0,0,2);tone(2400,t,.012,'square',.018);},
  bump(){const t=now();tone(70,t,.25,'sine',.35,AU.sfx,35);noise(t,.3,.25,1800,200,'lowpass');if(CLK.ready)for(let k=0;k<4;k++)playBuf(pick(CLK.cc),.12,1+Math.random()*.3,(Math.random()-.5),t+.02+k*.03);},
  tilt(){const t=now();for(let i=0;i<3;i++)tone(150,t+i*.18,.14,'sawtooth',.06,AU.sfx,0,900);},
  warn(){const t=now();tone(880,t,.08,'square',.04);tone(660,t+.1,.1,'square',.04);},
  last(){const t=now();[0,3,7,10].forEach((n,i)=>tone(mtof(64+n),t+i*.1,.2,'square',.05,AU.sfx,0,2200,.3));},
  win(){const t=now();[0,4,7,12,16].forEach((n,i)=>tone(mtof(72+n),t+i*.09,.32,'square',.05,AU.sfx,0,0,.3));},
  over(){const t=now();[12,7,4,0].forEach((n,i)=>tone(mtof(64+n),t+i*.18,.36,'triangle',.06,AU.sfx,0,0,.3));}
};
{const lim={peg:.02,ticket:.035,clink:.012,coinWon:.03,lost:.08,tray:.07,drop:.05};const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.04;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;try{f(...a);}catch(e){}};}}
