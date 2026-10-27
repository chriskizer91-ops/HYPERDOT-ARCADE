const SFX={
  laser(){const t=now();tone(1500,t,.09,'square',.05,AU.sfx,260,3200);noise(t,.04,.07,6000,2000,'highpass');},
  elaser(k){const t=now(),v=.05*clamp(k,0,1);if(v<.004)return;tone(980,t,.12,'sawtooth',v,AU.sfx,240,2200);},
  missile(){const t=now();noise(t,.7,.16,400,4200,'bandpass',0,.2,1.6);tone(220,t,.5,'sawtooth',.04,AU.sfx,900,1800);},
  lockTone(){tone(1250,now(),.05,'square',.035);},
  locked(){const t=now();tone(1900,t,.06,'square',.04);tone(1900,t+.08,.06,'square',.04);},
  warn(){const t=now();tone(1040,t,.09,'square',.05);tone(780,t+.1,.09,'square',.05);},
  boom(k=1){const t=now(),m=Math.min(1.4,k);noise(t,.35*k+.2,.36*m,2600,50,'lowpass',0,.4*m);tone(80,t,.3*k+.1,'sine',.36*m,AU.sfx,26);},
  bigboom(){const t=now();noise(t,1.8,.7,3600,40,'lowpass',0,.9);tone(54,t,1.4,'sine',.66,AU.sfx,18,0,.5);noise(t,.15,.3,9000,3000,'highpass');},
  capboom(){const t=now();for(let i=0;i<4;i++){noise(t+i*.22,1.6,.55,3000-i*500,40,'lowpass',0,.9);tone(46-i*4,t+i*.22,1.6,'sine',.5,AU.sfx,16,0,.6);}},
  shieldHit(){const t=now();noise(t,.18,.2,8000,2400,'bandpass',0,.1,2);tone(2400,t,.08,'triangle',.04,AU.sfx,900);},
  hullHit(){const t=now();tone(90,t,.25,'square',.12,AU.sfx,40,600);noise(t,.2,.3,1800,200,'lowpass');},
  boost(){noise(now(),.9,.2,300,5200,'bandpass',0,.2,1.2);},
  flyby(k){const t=now(),v=.25*clamp(k,0,1);if(v<.02)return;noise(t,.7,v,3600,300,'bandpass',0,.25,1.4);},
  radio(){const t=now();noise(t,.07,.07,2400,1800,'bandpass',0,0,4);tone(1600,t+.06,.04,'square',.02);},
  impact(){const t=now();noise(t,.5,.45,1400,60,'lowpass',0,.3);tone(60,t,.4,'sine',.45,AU.sfx,22);},
  alarm(){const t=now();for(let i=0;i<3;i++){tone(700,t+i*.46,.22,'sawtooth',.05,AU.sfx,0,2400);tone(520,t+i*.46+.23,.22,'sawtooth',.05,AU.sfx,0,2400);}},
  charge(){tone(70,now(),3.2,'sawtooth',.08,AU.sfx,520,1600,.4,.4);},
  beam(){const t=now();tone(48,t,2.6,'sawtooth',.22,AU.sfx,36,900,.5);noise(t,2.6,.3,700,200,'lowpass',0,.5);},
  shieldDown(){const t=now();tone(880,t,.5,'sawtooth',.05,AU.sfx,110,2000);noise(t,.4,.2,5000,500,'bandpass');},
  select(){tone(990,now(),.05,'square',.045);},
  confirm(){const t=now();tone(880,t,.06,'square',.06);tone(1320,t+.06,.18,'square',.06,AU.sfx,0,0,.2);},
  back(){const t=now();tone(660,t,.06,'square',.05);tone(440,t+.06,.1,'square',.05);},
  tick(){tone(1900,now(),.02,'square',.025);},
  clear(){const t=now();[0,4,7,12,16,19].forEach((n,i)=>tone(mtof(72+n),t+i*.09,.34,'square',.05,AU.sfx,0,0,.3));},
  lose(){const t=now();[12,7,3,0].forEach((n,i)=>tone(mtof(60+n),t+i*.22,.4,'sawtooth',.05,AU.sfx,0,1500,.3));}
};
/* continuous engine: two detuned saws + filtered noise, steered every frame */
const ENG={on:false,o1:null,o2:null,f:null,g:null,ng:null,nf:null};
function engineInit(){const c=AU.ctx;if(!c||ENG.on)return;ENG.on=true;
  ENG.g=c.createGain();ENG.g.gain.value=0;ENG.f=c.createBiquadFilter();ENG.f.type='lowpass';ENG.f.frequency.value=300;ENG.f.Q.value=2;ENG.f.connect(ENG.g);ENG.g.connect(AU.sfx);
  ENG.o1=c.createOscillator();ENG.o1.type='sawtooth';ENG.o1.frequency.value=46;ENG.o2=c.createOscillator();ENG.o2.type='sawtooth';ENG.o2.frequency.value=46.7;ENG.o1.connect(ENG.f);ENG.o2.connect(ENG.f);ENG.o1.start();ENG.o2.start();
  const n=c.createBufferSource();n.buffer=AU.noise;n.loop=true;ENG.nf=c.createBiquadFilter();ENG.nf.type='bandpass';ENG.nf.frequency.value=600;ENG.nf.Q.value=.8;ENG.ng=c.createGain();ENG.ng.gain.value=0;n.connect(ENG.nf);ENG.nf.connect(ENG.ng);ENG.ng.connect(AU.sfx);n.start();}
function engineTick(on,thr,boost){
  if(!AU.ctx)return;if(!ENG.on)engineInit();const t=AU.ctx.currentTime,v=on&&!AU.muted?1:0;
  ENG.g.gain.setTargetAtTime(v*(.05+.05*thr+(boost?.06:0)),t,.08);ENG.f.frequency.setTargetAtTime(220+thr*500+(boost?900:0),t,.1);
  ENG.o1.frequency.setTargetAtTime(40+thr*26+(boost?18:0),t,.15);ENG.o2.frequency.setTargetAtTime(40.6+thr*26.4+(boost?18:0),t,.15);
  ENG.ng.gain.setTargetAtTime(v*(.015+.02*thr+(boost?.08:0)),t,.1);ENG.nf.frequency.setTargetAtTime(500+thr*600+(boost?1800:0),t,.1);
}
