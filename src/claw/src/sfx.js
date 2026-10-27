const SFX={
  select(){tone(990,now(),.05,'square',.045);},
  confirm(){const t=now();tone(880,t,.06,'square',.06);tone(1320,t+.06,.18,'square',.06,AU.sfx,0,0,.2);},
  back(){const t=now();tone(660,t,.06,'square',.05);tone(440,t+.06,.1,'square',.05);},
  /* coin drop: two bright clinks and a rattle down the coin mech */
  coin(){const t=now();tone(2400,t,.06,'triangle',.07,AU.sfx,0,0,.25);tone(3150,t+.07,.16,'triangle',.06,AU.sfx,0,0,.3);noise(t+.02,.12,.06,9000,3000,'highpass');noise(t+.16,.09,.05,6000,2500,'bandpass',0,0,4);},
  /* strength roll: a ratchet tick whose pitch follows the needle */
  roll(p){tone(380+p*1100,now(),.022,'square',.03,AU.sfx,0,2400);},
  settle(s){const t=now(),b=60+Math.round(s*14);tone(mtof(b),t,.1,'square',.05);tone(mtof(b+7),t+.08,.1,'square',.05);tone(mtof(b+12),t+.16,.28,'triangle',.06,AU.sfx,0,0,.3);},
  go(){const t=now();tone(mtof(76),t,.08,'square',.05);tone(mtof(83),t+.08,.16,'square',.05,AU.sfx,0,0,.2);},
  /* button lock: chunky arcade microswitch + confirm beep */
  lock(){const t=now();noise(t,.03,.16,3500,900,'bandpass',0,0,2);tone(180,t,.04,'square',.06,AU.sfx,90);tone(1046,t+.03,.07,'square',.04);},
  step(){tone(1400,now(),.012,'square',.012);},
  /* claw drop: servo whine falling + cable whirr */
  drop(){const t=now();tone(900,t,.5,'sawtooth',.025,AU.sfx,260,1600);noise(t,.55,.035,3200,700,'bandpass',0,0,5);},
  /* soft plush impacts: a lowpassed "poff", pitch by the plush */
  poff(v=1,p=1){const t=now();noise(t,.09+.08*v,.05+.12*v,700*p+300,90,'lowpass',0,.05);tone(120*p,t,.08,'sine',.05*v,AU.sfx,60);},
  flump(v=1,p=1){const t=now();noise(t,.07+.05*v,.03+.08*v,500*p+200,80,'lowpass');},
  /* claw closing: geared servo zip up, metal clack at the end */
  close(){const t=now();tone(160,t,.5,'sawtooth',.035,AU.sfx,420,1100);tone(240,t,.5,'square',.012,AU.sfx,630,900);noise(t+.46,.04,.12,6000,2200,'bandpass',0,.05,3);},
  /* toy squeaker inside the plush (pitch per character) */
  squeak(p=1){const t=now(),f=820*p;tone(f,t,.07,'sine',.06,AU.sfx,f*1.6,0,.1);tone(f*1.55,t+.07,.09,'sine',.045,AU.sfx,f*.95,0,.15);},
  lift(){const t=now();tone(140,t,1.1,'sawtooth',.03,AU.sfx,300,800);noise(t,1,.03,1800,2600,'bandpass',0,0,6);},
  clink(){const t=now(),f=2600+Math.random()*900;tone(f,t,.05,'triangle',.035,AU.sfx,0,0,.25);tone(f*1.41,t,.03,'sine',.02);},
  rattle(){const t=now();for(let i=0;i<3;i++){const f=2200+Math.random()*1400;tone(f,t+i*.045,.04,'triangle',.03,AU.sfx,0,0,.2);}},
  slip(){const t=now();tone(1100,t,.45,'sine',.06,AU.sfx,240,0,.35);tone(1650,t,.3,'triangle',.02,AU.sfx,380);},
  release(){const t=now();noise(t,.05,.16,4200,1300,'bandpass',0,.05,2);tone(300,t,.14,'square',.04,AU.sfx,170,1200);},
  /* prize chute: thump down the shaft, then the boing as it pops out of the door */
  chute(){const t=now();tone(120,t,.25,'sine',.3,AU.sfx,45);noise(t,.2,.22,1400,90,'lowpass',0,.2);tone(70,t+.12,.2,'sine',.2,AU.sfx,40);},
  boing(){const t=now();tone(180,t,.32,'sine',.13,AU.sfx,720,0,.25);tone(360,t+.02,.25,'triangle',.04,AU.sfx,1100);},
  winner(){const t=now();[0,4,7,12,7,12,16,19].forEach((n,i)=>tone(mtof(72+n),t+i*.075,.22,'square',.05,AU.sfx,0,3200,.3));[0,4,7].forEach(n=>tone(mtof(60+n),t+.6,.7,'sawtooth',.03,AU.sfx,0,2000,.4));},
  jackpot(){const t=now();for(let r=0;r<3;r++)[0,4,7,12,16].forEach((n,i)=>tone(mtof(76+n+r*2),t+r*.42+i*.06,.25,'square',.045,AU.sfx,0,3800,.35));for(let i=0;i<14;i++)tone(2600+((i*7)%5)*300,t+.2+i*.09,.12,'triangle',.03,AU.sfx,0,0,.4);},
  aww(){const t=now();[7,5,3,0].forEach((n,i)=>tone(mtof(64+n),t+i*.16,.24,'triangle',.05,AU.sfx,0,2000,.2));},
  beep(hi){tone(hi?1760:1320,now(),.07,'square',.05);},
  ticket(){const t=now();tone(1500+Math.random()*300,t,.022,'square',.028);noise(t,.02,.03,7000,4000,'highpass');},
  confetti(){noise(now(),.5,.05,9000,5000,'highpass',0,.2);},
  ding(){const t=now();tone(1568,t,.35,'triangle',.06,AU.sfx,0,0,.3);tone(2093,t+.04,.3,'sine',.03,AU.sfx,0,0,.3);}
};
{const lim={ticket:.035,poff:.06,flump:.05,squeak:.18,clink:.08,rattle:.25,roll:.03,step:.04};const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;f(...a);};}}
