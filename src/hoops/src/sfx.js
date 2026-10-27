const SFX={
  select(){tone(990,now(),.05,'square',.045);},
  confirm(){const t=now();tone(880,t,.06,'square',.06);tone(1320,t+.06,.18,'square',.06,AU.sfx,0,0,.2);},
  back(){const t=now();tone(660,t,.06,'square',.05);tone(440,t+.06,.1,'square',.05);},
  /* the rim is a struck steel ring: inharmonic partials (1 : 2.76 : 5.40 : 8.93, a free ring's modes) with fast decay + a click */
  rim(k=.5){const t=now(),f=rnd(395,465)*(1+.08*k),P=[1,2.76,5.4,8.93];for(let i=0;i<4;i++)tone(f*P[i],t,(.22+.3*k)/(1+i*.8),'sine',(.03+.1*k)/(1+i*.55),AU.sfx,0,0,.14);noise(t,.025,.05+.12*k,7000,2600,'highpass');},
  /* the plexi backboard: a dull thump plus a short glassy ring */
  board(k=.5){const t=now();noise(t,.14,.1+.22*k,1500,200,'lowpass',0,.16);tone(136,t,.17,'sine',.12+.22*k,AU.sfx,60);tone(740,t,.1,'triangle',.02+.05*k,AU.sfx,0,0,.25);},
  swish(){const t=now();noise(t,.28,.17,6800,1500,'bandpass',0,.12,.7);noise(t+.05,.22,.08,3300,900,'bandpass',0,0,.9);},
  net(){const t=now();noise(t,.17,.09,4200,1300,'bandpass',0,.08,.9);},
  launch(k=1){const t=now();noise(t,.15,.045+.02*k,450,2400,'bandpass',0,0,1.4);tone(170,t,.05,'sine',.06,AU.sfx,85);},
  clack(k=.5){const t=now();tone(rnd(290,340),t,.07,'triangle',.05+.07*k,AU.sfx,140);noise(t,.02,.05*k,3000,900,'bandpass');},
  roll(){noise(now(),.55,.03,300,120,'lowpass');},
  pop(){tone(480,now(),.07,'sine',.05,AU.sfx,760);},
  buzzer(){const t=now();for(const f of [131,138.6,262])tone(f,t,1.25,'sawtooth',.07,AU.sfx,0,2400,.12,.01);tone(65.4,t,1.25,'square',.05,AU.sfx,0,500);},
  horn(){const t=now();[0,4,7,12].forEach(n=>tone(mtof(67+n),t,.5,'square',.04,AU.sfx,0,3200,.25,.01));},
  beep(hi){tone(hi?1760:1320,now(),.08,'square',.05);},
  tick(){tone(2300,now(),.018,'square',.022);},
  blip(i=0){tone(880+(i%12)*40,now(),.035,'square',.032);},
  type(){tone(rnd(1150,1350),now(),.02,'square',.022);},
  dmd(){const t=now();tone(1400,t,.05,'square',.04,AU.sfx,700);tone(700,t+.05,.12,'square',.04,AU.sfx,0,0,.25);},
  stamp(){const t=now();noise(t,.14,.22,2600,180,'lowpass',0,.1);tone(98,t,.16,'square',.09,AU.sfx,49,900);},
  whoosh(){noise(now(),.32,.07,280,5200,'bandpass',0,.12,1.6);},
  streak(n){const t=now();for(let i=0;i<Math.min(6,n);i++)tone(mtof(72+[0,4,7,12,16,19][i]),t+i*.05,.13,'square',.034,AU.sfx,0,0,.2);},
  /* crowd: many short band-passed noise grains ("voices") with whistles on top for big moments */
  cheer(k=.5){const t=now();for(let i=0,n=10+k*16|0;i<n;i++)noise(t+rnd(0,.35),rnd(.4,1.15),.011+.02*k,rnd(700,2700),rnd(380,1200),'bandpass',0,.25,2.6);
    if(k>.45)for(let i=0;i<1+k*2;i++){const f=rnd(1900,2500);tone(f,t+rnd(.1,.4),.3,'sine',.017,AU.sfx,f*1.35,0,.2);}},
  /* "ooh" / "aww": a choir of detuned saws through a vowel-ish low-pass, gliding up (ooh) or down (aww) */
  ooh(){const t=now();for(let i=0;i<7;i++){const f=rnd(160,240);tone(f,t+rnd(0,.06),.8,'sawtooth',.013,AU.sfx,f*1.12,650,.25,.12);}},
  aww(){const t=now();for(let i=0;i<7;i++){const f=rnd(170,280);tone(f,t+rnd(0,.08),1.0,'sawtooth',.014,AU.sfx,f*.72,820,.25,.18);}},
  airball(){const t=now();for(const [d,p] of [[0,1],[.36,.84]])for(let i=0;i<6;i++){const f=rnd(300,330)*p;tone(f,t+d+rnd(0,.04),.32,'sawtooth',.013,AU.sfx,0,900,.2,.05);}},
  ticket(){const t=now();for(let i=0;i<3;i++)tone(1600+i*200,t+i*.04,.04,'square',.028);noise(t,.03,.04,5000,2500,'highpass');},
  fire(){const t=now();noise(t,1.5,.22,180,1900,'lowpass',0,.3);noise(t+.1,1.1,.08,800,3200,'bandpass',0,.2,1.2);tone(55,t,1.2,'sawtooth',.06,AU.sfx,110,400);},
  win(){const t=now();[0,4,7,12,16].forEach((n,i)=>tone(mtof(72+n),t+i*.09,.32,'square',.05,AU.sfx,0,0,.3));},
  hiscore(){const t=now();[0,4,7,12,7,12,16,19,24].forEach((n,i)=>tone(mtof(72+n),t+i*.08,.24,'square',.045,AU.sfx,0,0,.3));},
  lose(){const t=now();[12,7,3,0].forEach((n,i)=>tone(mtof(60+n),t+i*.22,.4,'sawtooth',.05,AU.sfx,0,1500,.3));}
};
{const lim={rim:.03,board:.05,swish:.06,net:.06,clack:.04,ticket:.035,blip:.025,tick:.02,type:.03,cheer:.22,ooh:.9,aww:.9,airball:1.2,launch:.05,roll:.12,whoosh:.1};const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;f(...a);};}}