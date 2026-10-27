/* a little formant voice for laughs and raspberries: saw/square through a band-pass "vowel" */
function vox(f0,f1,t,dur,form,vol,type){
  const c=AU.ctx;if(!c||AU.muted)return;const o=c.createOscillator();o.type=type||'sawtooth';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);
  const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=form;bp.Q.value=3.2;const gn=c.createGain();env(gn,t,.012,vol,dur);
  o.connect(bp);bp.connect(gn);gn.connect(AU.sfx);o.start(t);o.stop(t+dur+.06);
}
const MAJ=[0,2,4,5,7,9,11];
/* sound effects: short and layered. Rate-limited below so 20 at once never clip. */
const SFX={
  select(){tone(990,now(),.05,'square',.045);},
  confirm(){const t=now();tone(880,t,.06,'square',.06);tone(1320,t+.06,.18,'square',.06,AU.sfx,0,0,.2);},
  back(){const t=now();tone(660,t,.06,'square',.05);tone(440,t+.06,.1,'square',.05);},
  rustle(){const t=now();for(let i=0;i<4;i++)noise(t+i*.05+Math.random()*.02,.045,.05,1800+Math.random()*2400,900,'bandpass',0,0,2.2);},
  pop(kind){const t=now(),p=kind==='gold'?1.5:kind==='king'?.55:kind==='hard'?.78:kind==='bomb'?.9:1;
    tone(230*p,t,.1,'sine',.16,AU.sfx,820*p);noise(t,.03,.07,4200,1500,'bandpass',0,0,1.5);if(kind==='hard')tone(170,t+.09,.12,'triangle',.09,AU.sfx,110);},
  swing(){noise(now(),.1,.1,500,3800,'bandpass',0,0,1.4);},
  /* the bonk: a thump, a wood knock, and a bell whose pitch climbs the major scale with the combo */
  bonk(n){const t=now();tone(160,t,.17,'sine',.42,AU.sfx,52);noise(t,.07,.24,2200,260,'lowpass');tone(540,t,.04,'triangle',.1,AU.sfx,320);
    const k=Math.max(0,Math.min(n,22)-1),f=mtof(72+MAJ[k%7]+12*Math.floor(k/7));tone(f,t+.012,.3,'triangle',.075,AU.sfx,0,0,.25);tone(f*2,t+.012,.14,'sine',.028,AU.sfx);},
  clang(){const t=now();for(const [m,v,d] of [[1,.06,.5],[2.76,.045,.36],[5.4,.03,.26],[1.47,.035,.42]])tone(760*m,t,d,'square',v,AU.sfx,0,7000,.25);noise(t,.08,.2,9000,2000,'highpass');},
  clink(){const t=now();tone(1900,t,.08,'square',.025,AU.sfx,0,6000);tone(2900,t,.06,'triangle',.02,AU.sfx);},
  gold(){const t=now();[0,4,7,12,16,19].forEach((s,i)=>tone(mtof(84+s),t+i*.035,.14,'triangle',.05,AU.sfx,0,0,.3));},
  boom(k=1){const t=now();noise(t,.35*k+.2,.42,2600,50,'lowpass',0,.35);tone(80,t,.4*k,'sine',.5,AU.sfx,25);noise(t+.05,.6,.12,800,100,'lowpass',0,.4);},
  laugh(p=1){const t=now();for(let i=0;i<3;i++){const t0=t+i*.115;noise(t0,.025,.05,3200,2400,'bandpass');vox((360-i*22)*p,(300-i*22)*p,t0+.012,.08,1100*Math.sqrt(p),.22);}},
  snicker(){const t=now();for(let i=0;i<2;i++)vox(540-i*30,470,t+i*.09,.06,1400,.12);},
  raspberry(){const t=now();vox(150,110,t,.28,700,.24,'sawtooth');noise(t,.28,.05,1200,600,'bandpass',0,0,3);},
  whiff(){const t=now();noise(t,.12,.1,3000,400,'bandpass',0,0,1.2);tone(95,t+.03,.1,'sine',.2,AU.sfx,48);noise(t+.03,.08,.12,700,150,'lowpass');},
  dizzy(){const t=now();for(let i=0;i<3;i++){tone(2400,t+i*.13,.06,'sine',.035,AU.sfx,2900);tone(2900,t+i*.13+.06,.05,'sine',.03,AU.sfx,2500);}},
  fanfare(){const t=now();[[0,.13],[4,.13],[7,.13],[12,.5]].forEach(([s,d],i)=>{const tt=t+i*.12;tone(mtof(62+s),tt,d,'sawtooth',.05,AU.sfx,0,2200,.3);tone(mtof(55+s),tt,d,'square',.028,AU.sfx,0,1600);});},
  ko(){const t=now();tone(300,t,.5,'square',.06,AU.sfx,60,1800,.3);[0,7,12,16,19,24].forEach((s,i)=>tone(mtof(72+s),t+.1+i*.06,.2,'triangle',.05,AU.sfx,0,0,.3));},
  combo(n){const t=now(),b=Math.min(4,Math.floor(n/5));[0,4,7,12].forEach((s,i)=>tone(mtof(72+b*2+s),t+i*.045,.12,'square',.04,AU.sfx,0,3000,.2));},
  tick(){tone(1500,now(),.035,'square',.045);},
  count(n){tone(n?660:1320,now(),n?.1:.32,'square',.07,AU.sfx,0,0,.2);},
  whistle(){const t=now();tone(2150,t,.16,'sine',.08,AU.sfx,2050);tone(2190,t+.22,.5,'sine',.08,AU.sfx,2080);noise(t+.22,.5,.02,4000,3000,'bandpass',0,0,4);},
  fizzle(){noise(now(),.3,.07,6000,1500,'highpass');},
  fuse(){noise(now(),.05,.022,7000,5000,'highpass');},
  ticket(){const t=now();for(let i=0;i<3;i++)tone(1600+i*200,t+i*.05,.05,'square',.03);},
  win(){const t=now();[0,4,7,12,16].forEach((n,i)=>tone(mtof(72+n),t+i*.09,.32,'square',.05,AU.sfx,0,0,.3));},
  lose(){const t=now();[12,7,3,0].forEach((n,i)=>tone(mtof(60+n),t+i*.22,.4,'sawtooth',.05,AU.sfx,0,1500,.3));}
};
{const lim={bonk:.03,ticket:.035,rustle:.06,pop:.03,laugh:.15,snicker:.2,boom:.06,fuse:.08,dizzy:.12,clang:.04,clink:.06,whiff:.04,swing:.03,fizzle:.1};const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;f(...a);};}}
