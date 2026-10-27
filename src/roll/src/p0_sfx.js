/* sound effects: short and layered, synthesized. Rate-limited below so a rattle never clips. */
const RING_HZ=[330,392,494,587,740,880,880];
const SFX={
  select(){tone(990,now(),.05,'square',.045);},
  confirm(){const t=now();tone(880,t,.06,'square',.06);tone(1320,t+.06,.18,'square',.06,AU.sfx,0,0,.2);},
  back(){const t=now();tone(660,t,.06,'square',.05);tone(440,t+.06,.1,'square',.05);},
  /* ball leaving the hand: a soft wooden thump plus air */
  release(k=1){const t=now();noise(t,.18,.12*k,900,300,'lowpass');tone(110,t,.12,'sine',.18*k,AU.sfx,70);noise(t,.22,.05*k,600,3000,'bandpass',0,0,.8);},
  /* the hump: a hard wooden clack, brighter the faster the ball hits it */
  clack(k=1){const t=now();noise(t,.05,.3*Math.min(1.4,k),5200,1600,'bandpass',0,.1,2.5);tone(640+k*90,t,.06,'triangle',.12*Math.min(1.4,k),AU.sfx,300);tone(1900,t,.02,'square',.03);},
  launch(k=1){noise(now(),.3,.05*k,800,3600,'bandpass',0,.15,1.2);},
  thud(k=1){const t=now();k=Math.min(1.6,k);noise(t,.12,.22*k,1400,120,'lowpass',0,.06);tone(86,t,.16,'sine',.3*k,AU.sfx,48);},
  /* ring lips ring at their own pitch: rattles play little melodies */
  tock(i=0,k=1){const t=now(),f=RING_HZ[i]||500;k=Math.min(1.5,k);tone(f*2,t,.05,'triangle',.11*k,AU.sfx,f*1.4,0,.08);tone(f,t,.09,'square',.035*k,AU.sfx,0,1800);noise(t,.025,.12*k,7000,2500,'bandpass',0,0,3);},
  rim(k=1){const t=now();tone(1250,t,.03,'square',.03*Math.min(1,k));noise(t,.03,.08*Math.min(1,k),6000,3000,'bandpass',0,0,4);},
  knock(k=1){const t=now();k=Math.min(1.3,k);noise(t,.06,.2*k,2200,500,'bandpass',0,.05,1.6);tone(220,t,.06,'triangle',.08*k,AU.sfx,140);},
  click(){const t=now();tone(2600,t,.025,'square',.05);noise(t,.02,.1,9000,5000,'highpass');},
  /* a dunk: the ball drops, a thunk, then a chime arpeggio that climbs with the value */
  dunk(val=10){const t=now(),n=Math.min(6,Math.max(1,val/10|0));tone(150,t,.18,'sine',.35,AU.sfx,55);noise(t,.12,.22,1800,200,'lowpass');
    for(let i=0;i<n;i++)tone(mtof(72+[0,4,7,12,16,19][i]),t+.06+i*.055,.22,'square',.045,AU.sfx,0,3600,.35);
    if(val>=50)for(let i=0;i<6;i++)tone(mtof(91+(i%3)*5),t+.4+i*.04,.08,'triangle',.03,AU.sfx,0,0,.4);},
  jackpot(){const t=now();[0,4,7,12,7,12,16,19,24].forEach((n,i)=>tone(mtof(67+n),t+.1+i*.075,.25,'square',.05,AU.sfx,0,0,.35));for(let i=0;i<10;i++)noise(t+.3+i*.09,.06,.08,9000,4000,'highpass');},
  gutter(){const t=now();tone(260,t,.32,'sawtooth',.05,AU.sfx,120,900);tone(196,t+.3,.45,'sawtooth',.05,AU.sfx,90,700,.2);noise(t,.5,.06,1200,200,'lowpass');},
  short(){const t=now();tone(500,t,.4,'triangle',.06,AU.sfx,140,0,.2);},
  side(){const t=now();tone(mtof(72),t,.12,'square',.04,AU.sfx,0,2400);tone(mtof(76),t+.08,.18,'square',.04,AU.sfx,0,2400,.2);},
  tick(){tone(1500,now(),.02,'square',.025);},
  charge(p=0){tone(300+p*900,now(),.035,'square',.02,AU.sfx,0,2600);},
  count(){tone(2100,now(),.018,'square',.018);},
  ticket(){const t=now();for(let i=0;i<3;i++)tone(1600+i*200,t+i*.03,.03,'square',.022);noise(t,.04,.05,7000,3000,'bandpass',0,0,2);},
  enter(){const t=now();noise(t,.35,.05,500,200,'lowpass');tone(130,t+.3,.08,'sine',.12,AU.sfx,80);},
  final(){const t=now();for(let i=0;i<4;i++){tone(1568,t+i*.16,.12,'square',.04,AU.sfx,0,0,.3);tone(1175,t+i*.16+.08,.1,'square',.035);}},
  nudge(){const t=now();tone(80,t,.2,'sawtooth',.08,AU.sfx,60,400);noise(t,.15,.12,800,200,'lowpass');},
  win(){const t=now();[0,4,7,12,16].forEach((n,i)=>tone(mtof(72+n),t+i*.09,.32,'square',.05,AU.sfx,0,0,.3));},
  lose(){const t=now();[12,7,3,0].forEach((n,i)=>tone(mtof(60+n),t+i*.22,.4,'sawtooth',.05,AU.sfx,0,1500,.3));}
};
{const lim={tock:.025,rim:.03,knock:.04,thud:.05,ticket:.035,count:.025,charge:.03,click:.03};const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;f(...a);};}}
