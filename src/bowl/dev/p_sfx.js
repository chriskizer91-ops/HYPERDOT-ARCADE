/* sound effects: keep them short and layered. Rate-limited below so 20 at once never clip. */
const SFX={
  select(){tone(990,now(),.05,'square',.045);},
  confirm(){const t=now();tone(880,t,.06,'square',.06);tone(1320,t+.06,.18,'square',.06,AU.sfx,0,0,.2);},
  back(){const t=now();tone(660,t,.06,'square',.05);tone(440,t+.06,.1,'square',.05);},
  /* the alley: maple pins are hollow-ish knocks with a bright crack; the ball is a deep thock */
  clack(k){const t=now(),v=clamp(k,.15,1);noise(t,.04+.05*v,.08+.2*v,rnd(3200,4400),1300,'bandpass',0,.14,2.4);tone(rnd(640,920),t,.05,'triangle',.05+.09*v,AU.sfx,rnd(380,520),0,.12);},
  thock(k){const t=now(),v=clamp(k,.2,1);tone(rnd(150,185),t,.14,'sine',.12+.26*v,AU.sfx,62);noise(t,.1,.12+.3*v,2400,600,'bandpass',0,.28,1.1);tone(rnd(950,1250),t,.03,'square',.04*v,AU.sfx,520);},
  clatter(k){const t=now(),v=clamp(k,.1,1);noise(t,.06,.05+.13*v,rnd(1500,2100),480,'bandpass',0,.1,1.6);tone(rnd(250,340),t,.05,'triangle',.04*v,AU.sfx,170);},
  wall(k){const t=now(),v=clamp(k,.1,1);noise(t,.14,.08+.16*v,900,160,'lowpass',0,.22);tone(95,t,.1,'sine',.08*v,AU.sfx,60);},
  crash(k){const t=now(),v=clamp(k,.3,1);noise(t,.7,.3*v,5200,420,'bandpass',0,.55,.7);noise(t,.3,.28*v,1300,110,'lowpass',0,.35);
    for(let i=0;i<7;i++){const d=Math.random()*.32;tone(rnd(480,1150),t+d,.05,'triangle',.05*v,AU.sfx,rnd(300,470),0,.25);}},
  land(){const t=now();tone(72,t,.2,'sine',.34,AU.sfx,38);noise(t,.09,.16,700,90,'lowpass',0,.15);},
  swoosh(){noise(now(),.32,.07,500,2600,'bandpass',0,.12,1.2);},
  gutter(){const t=now();noise(t,.35,.12,700,260,'bandpass',0,.2,5);tone(140,t,.3,'triangle',.07,AU.sfx,90);},
  sweep(){const t=now();tone(55,t,1.0,'sawtooth',.045,AU.sfx,47,240);noise(t,1.0,.05,520,300,'bandpass',0,.06,3);tone(110,t,.08,'square',.06,AU.sfx,70,500);},
  clunk(){const t=now();tone(120,t,.09,'square',.07,AU.sfx,58,650);noise(t,.07,.12,1500,260,'lowpass');},
  set(){const t=now();for(let i=0;i<10;i++)tone(rnd(680,920),t+i*.014+Math.random()*.01,.03,'triangle',.028,AU.sfx,520);noise(t,.15,.06,1800,500,'bandpass',0,.1,1.5);},
  ticket(){const t=now();for(let i=0;i<3;i++)tone(1600+i*200,t+i*.05,.05,'square',.03);},
  /* DMD jingles */
  strike(){const t=now();[0,4,7,12,16,19,24].forEach((n,i)=>tone(mtof(67+n),t+i*.055,.22,'square',.045,AU.sfx,0,3200,.35));tone(mtof(91),t+.42,.5,'square',.04,AU.sfx,0,0,.5);},
  spare(){const t=now();[0,7,12].forEach((n,i)=>tone(mtof(72+n),t+i*.08,.26,'square',.05,AU.sfx,0,2600,.3));},
  turkey(){const t=now();for(let i=0;i<5;i++){const f=rnd(420,560);tone(f,t+i*.085,.07,'sawtooth',.05,AU.sfx,f*.62,1800);}
    [0,4,7,12,16,19,24,28].forEach((n,i)=>tone(mtof(64+n),t+.5+i*.05,.25,'square',.04,AU.sfx,0,3000,.35));},
  sad(){const t=now();[7,6,5,4].forEach((n,i)=>tone(mtof(52+n),t+i*.28,i===3?.8:.3,'sawtooth',.06,AU.sfx,i===3?mtof(50):0,1100,.25));},
  split(){const t=now();tone(mtof(64),t,.12,'square',.05,AU.sfx,0,2000);tone(mtof(58),t+.14,.3,'square',.05,AU.sfx,mtof(55),2000,.2);},
  perfect(){const t=now();for(let r=0;r<3;r++)[0,4,7,12,16,19,24].forEach((n,i)=>tone(mtof(60+r*5+n),t+r*.5+i*.05,.3,'square',.04,AU.sfx,0,3400,.4));},
  win(){const t=now();[0,4,7,12,16].forEach((n,i)=>tone(mtof(72+n),t+i*.09,.32,'square',.05,AU.sfx,0,0,.3));},
  lose(){const t=now();[12,7,3,0].forEach((n,i)=>tone(mtof(60+n),t+i*.22,.4,'sawtooth',.05,AU.sfx,0,1500,.3));}
};
{const lim={clack:.028,thock:.04,clatter:.03,wall:.06,crash:.4,ticket:.04,set:.2};const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;f(...a);};}}
/* the rolling rumble is one long voice (looped noise through a lowpass + a sub sine), steered every frame */
const RUM={g:null,f:null,o:null,og:null};
function rumbleInit(){
  if(RUM.g||!AU.ctx)return;const c=AU.ctx;try{
    const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=150;f.Q.value=2.5;
    const gn=c.createGain();gn.gain.value=0;const o=c.createOscillator();o.type='sine';o.frequency.value=46;const og=c.createGain();og.gain.value=0;
    s.connect(f);f.connect(gn);gn.connect(AU.sfx);o.connect(og);og.connect(AU.sfx);s.start();o.start();Object.assign(RUM,{g:gn,f,o,og});}catch(e){}
}
function rumbleSet(lv,fq,hum){if(!RUM.g)return;const t=now(),m=AU.muted||ARC.muted;RUM.g.gain.setTargetAtTime(m?0:lv,t,.04);RUM.f.frequency.setTargetAtTime(fq,t,.05);RUM.og.gain.setTargetAtTime(m?0:hum,t,.05);RUM.o.frequency.setTargetAtTime(34+fq*.07,t,.1);}
