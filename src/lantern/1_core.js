/* =====================================================================================
   LANTERN — a lamplighter, a town of shades, one flame.
   The display is a classic amber plasma dot matrix: 192 x 96 dots, sixteen levels per dot.
   The game writes nibbles (0..15) into a framebuffer the way a 1990s pinball display
   controller did; the light that decides those nibbles is computed per dot on the CPU
   with polar shadow maps. The music and effects run through a small two-operator FM
   synthesizer, the sound family of the soundboards those machines carried.
   ===================================================================================== */
/* =====================================================================================
   1. BASICS
   ===================================================================================== */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2;
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchy=matchMedia('(hover: none)').matches;
const fmt=n=>Math.floor(n).toLocaleString('en-US');
const pick=a=>a[(Math.random()*a.length)|0];
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const EMBED=/[?&]embed=1/.test(location.search);
const cv=$('gl');
/* the panel */
const W=192,H=96,N=W*H;
/* xorshift32 for everything that must be cheap and repeatable */
let RS=0x2545f491;
function r32(){RS^=RS<<13;RS^=RS>>>17;RS^=RS<<5;return RS>>>0;}
const rf=()=>r32()/4294967296;
function hash2(x,y,s){let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,982451653))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function vnoise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi,s),b=hash2(xi+1,yi,s),c=hash2(xi,yi+1,s),d=hash2(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,s){return vnoise(x,y,s)*.55+vnoise(x*2.1,y*2.1,s+7)*.3+vnoise(x*4.3,y*4.3,s+13)*.15;}

/* =====================================================================================
   2. THE NIBBLE FRAMEBUFFER AND ITS FONTS
      NB holds one level per dot (0 = dark, 15 = full). Text and HUD art are written
      straight into it, as on the real thing: there is no colour, only brightness.
   ===================================================================================== */
const NB=new Uint8Array(N);
const F5SRC=`A 01110 10001 10001 11111 10001 10001 10001|B 11110 10001 10001 11110 10001 10001 11110|C 01110 10001 10000 10000 10000 10001 01110|D 11110 10001 10001 10001 10001 10001 11110|E 11111 10000 10000 11110 10000 10000 11111|F 11111 10000 10000 11110 10000 10000 10000|G 01110 10001 10000 10111 10001 10001 01111|H 10001 10001 10001 11111 10001 10001 10001|I 01110 00100 00100 00100 00100 00100 01110|J 00111 00010 00010 00010 00010 10010 01100|K 10001 10010 10100 11000 10100 10010 10001|L 10000 10000 10000 10000 10000 10000 11111|M 10001 11011 10101 10101 10001 10001 10001|N 10001 10001 11001 10101 10011 10001 10001|O 01110 10001 10001 10001 10001 10001 01110|P 11110 10001 10001 11110 10000 10000 10000|Q 01110 10001 10001 10001 10101 10010 01101|R 11110 10001 10001 11110 10100 10010 10001|S 01111 10000 10000 01110 00001 00001 11110|T 11111 00100 00100 00100 00100 00100 00100|U 10001 10001 10001 10001 10001 10001 01110|V 10001 10001 10001 10001 10001 01010 00100|W 10001 10001 10001 10101 10101 10101 01010|X 10001 10001 01010 00100 01010 10001 10001|Y 10001 10001 01010 00100 00100 00100 00100|Z 11111 00001 00010 00100 01000 10000 11111|0 01110 10001 10011 10101 11001 10001 01110|1 00100 01100 00100 00100 00100 00100 01110|2 01110 10001 00001 00010 00100 01000 11111|3 11111 00010 00100 00010 00001 10001 01110|4 00010 00110 01010 10010 11111 00010 00010|5 11111 10000 11110 00001 00001 10001 01110|6 00110 01000 10000 11110 10001 10001 01110|7 11111 00001 00010 00100 01000 01000 01000|8 01110 10001 10001 01110 10001 10001 01110|9 01110 10001 10001 01111 00001 00010 01100|! 00100 00100 00100 00100 00100 00000 00100|. 00000 00000 00000 00000 00000 01100 01100|, 00000 00000 00000 00000 01100 00100 01000|: 00000 01100 01100 00000 01100 01100 00000|- 00000 00000 00000 11111 00000 00000 00000|+ 00000 00100 00100 11111 00100 00100 00000|? 01110 10001 00001 00010 00100 00000 00100|' 00100 00100 01000 00000 00000 00000 00000|/ 00001 00001 00010 00100 01000 10000 10000|> 01000 00100 00010 00001 00010 00100 01000|< 00010 00100 01000 10000 01000 00100 00010|x 00000 00000 10001 01010 00100 01010 10001|_ 00000 00000 00000 00000 00000 00000 00000`;
const G5={};for(const ln of F5SRC.split('|')){const p=ln.trim().split(/\s+/);G5[p[0]==='_'?' ':p[0]]=p.slice(1).map(r=>parseInt(r,2));}
const F3SRC=`A 010 101 111 101 101|B 110 101 110 101 110|C 011 100 100 100 011|D 110 101 101 101 110|E 111 100 110 100 111|F 111 100 110 100 100|G 011 100 101 101 011|H 101 101 111 101 101|I 111 010 010 010 111|J 001 001 001 101 010|K 101 101 110 101 101|L 100 100 100 100 111|M 101 111 111 101 101|N 110 101 101 101 101|O 010 101 101 101 010|P 110 101 110 100 100|Q 010 101 101 110 011|R 110 101 110 101 101|S 011 100 010 001 110|T 111 010 010 010 010|U 101 101 101 101 111|V 101 101 101 101 010|W 101 101 111 111 101|X 101 101 010 101 101|Y 101 101 010 010 010|Z 111 001 010 100 111|0 111 101 101 101 111|1 010 110 010 010 111|2 111 001 111 100 111|3 111 001 011 001 111|4 101 101 111 001 001|5 111 100 111 001 111|6 111 100 111 101 111|7 111 001 001 010 010|8 111 101 111 101 111|9 111 101 111 001 111|x 000 101 010 101 000|+ 000 010 111 010 000|- 000 000 111 000 000|: 0 1 0 1 0|. 0 0 0 0 1|, 0 0 0 1 1|! 1 1 1 0 1|/ 001 001 010 100 100|' 1 1 0 0 0|> 100 010 001 010 100|< 001 010 100 010 001|? 111 001 011 000 010|( 01 10 10 10 01|) 10 01 01 01 10|% 101 001 010 100 101|# 101 111 101 111 101`;
const G3={};for(const ln of F3SRC.split('|')){const p=ln.trim().split(/\s+/);G3[p[0]]=p.slice(1);}
/* a dot: mode 0 sets, mode 1 keeps the brighter, mode 2 adds */
function dot(x,y,v,mode){x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const i=y*W+x;v=v<0?0:v>15?15:v|0;if(mode===1){if(v>NB[i])NB[i]=v;}else if(mode===2){NB[i]=Math.min(15,NB[i]+v);}else NB[i]=v;}
function rect(x,y,w,h,v){for(let j=0;j<h;j++)for(let i=0;i<w;i++)dot(x+i,y+j,v);}
function dimRect(x,y,w,h,k){x|=0;y|=0;for(let j=Math.max(0,y);j<Math.min(H,y+h);j++)for(let i=Math.max(0,x);i<Math.min(W,x+w);i++){const q=j*W+i;NB[q]=(NB[q]*k)|0;}}
function tw5(s,sc=1){return s.length*6*sc-sc;}
function tw3(s,sc=1){let w=0;for(const ch of s){const gg=G3[ch]||G3[ch.toUpperCase()];w+=((gg?gg[0].length:3)+1)*sc;}return Math.max(0,w-sc);}
/* v may be a number or a function (col,row)->level for shaded lettering */
function txt5(s,x,y,v,sc=1,align,mode){
  if(align==='c')x=Math.round(x-tw5(s,sc)/2);else if(align==='r')x=x-tw5(s,sc);
  const f=typeof v==='function'?v:null;
  for(const ch of s){const g5=G5[ch]||G5[ch.toUpperCase()]||G5[' '];
    for(let r=0;r<7;r++)for(let c=0;c<5;c++)if((g5[r]>>(4-c))&1)for(let j=0;j<sc;j++)for(let i=0;i<sc;i++)dot(x+c*sc+i,y+r*sc+j,f?f(c*sc+i,r*sc+j):v,mode);
    x+=6*sc;}
}
function txt3(s,x,y,v,align,mode){
  if(align==='c')x=Math.round(x-tw3(s)/2);else if(align==='r')x=x-tw3(s);
  for(const ch of s){const gg=G3[ch]||G3[ch.toUpperCase()];if(!gg){x+=4;continue;}for(let r=0;r<5;r++)for(let c=0;c<gg[r].length;c++)if(gg[r][c]==='1')dot(x+c,y+r,v,mode);x+=gg[0].length+1;}
}
/* outlined text: a dark keyline one dot wide so lettering reads over a lit scene */
const O8=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
function otxt5(s,x,y,v,sc=1,align){for(const [a,b] of O8)txt5(s,x+a,y+b,0,sc,align);txt5(s,x,y,v,sc,align);}
function otxt3(s,x,y,v,align){for(const [a,b] of O8)txt3(s,x+a,y+b,0,align);txt3(s,x,y,v,align);}

/* =====================================================================================
   3. AUDIO — a two-operator FM synthesizer (carrier + modulator, both sine) with an
      envelope on the output and a separate decaying envelope on the modulation index,
      which is what gives FM its struck, bell-like attacks. Plus filtered noise, a
      convolution hall and a tape-ish delay. Nothing plays until the first user gesture.
   ===================================================================================== */
const AU={ctx:null,out:null,mus:null,sfx:null,rev:null,dly:null,noise:null,muted:store.get('hd-mute','0')==='1',next:0,step:0,track:null,want:null};
const mtof=m=>440*Math.pow(2,(m-69)/12),now=()=>AU.ctx?AU.ctx.currentTime:0;
function audioInit(){
  try{
    if(!AU.ctx){
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();AU.ctx=c;
      const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.2;comp.connect(c.destination);
      AU.out=c.createGain();AU.out.gain.value=AU.muted||ARC.muted?0:.66;AU.out.connect(comp);
      AU.mus=c.createGain();AU.mus.gain.value=.3;AU.mus.connect(AU.out);
      AU.sfx=c.createGain();AU.sfx.gain.value=.85;AU.sfx.connect(AU.out);
      /* a long dark hall: night streets ring */
      const len=c.sampleRate*3.2|0,ir=c.createBuffer(2,len,c.sampleRate);
      for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);let lp=0;for(let i=0;i<len;i++){lp+=((Math.random()*2-1)-lp)*.35;d[i]=lp*Math.pow(1-i/len,2.6);}}
      const cvn=c.createConvolver();cvn.buffer=ir;AU.rev=c.createGain();AU.rev.gain.value=.55;AU.rev.connect(cvn);cvn.connect(AU.out);
      const dl=c.createDelay(1.5);dl.delayTime.value=.42;const fb=c.createGain();fb.gain.value=.36;const dlf=c.createBiquadFilter();dlf.type='lowpass';dlf.frequency.value=2400;const dlo=c.createGain();dlo.gain.value=.32;
      dl.connect(dlf);dlf.connect(fb);fb.connect(dl);dl.connect(dlo);dlo.connect(AU.mus);AU.dly=dl;
      const nb=c.createBuffer(1,c.sampleRate,c.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;AU.noise=nb;
      AU.next=c.currentTime+.05;
    }
    if(AU.ctx.state==='suspended')AU.ctx.resume();
  }catch(e){}
}
function setVolume(){if(AU.out)AU.out.gain.value=AU.muted||ARC.muted?0:.66;}
function env(gp,t,a,peak,d){gp.setValueAtTime(.0001,t);gp.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);gp.exponentialRampToValueAtTime(.0001,t+a+d);}
/* fm(freq, start, dur, ratio, index, indexDecay, vol, bus, reverbSend, attack, detune)
   modulation depth in Hz = index x modulator frequency; it falls to index*0.15 over indexDecay */
function fm(f,t,dur,ratio,index,idec,vol,bus,rv,att,det){
  const c=AU.ctx;if(!c||AU.muted)return;
  const car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain();
  car.frequency.setValueAtTime(f,t);if(det)car.detune.setValueAtTime(det,t);mod.frequency.setValueAtTime(f*ratio,t);
  const depth=index*f*ratio;mg.gain.setValueAtTime(depth,t);mg.gain.exponentialRampToValueAtTime(Math.max(.01,depth*.15),t+Math.max(.01,idec));
  mod.connect(mg);mg.connect(car.frequency);env(g.gain,t,att||.004,vol,dur);car.connect(g);g.connect(bus||AU.sfx);
  if(rv){const s=c.createGain();s.gain.value=rv;g.connect(s);s.connect(AU.rev);}
  car.start(t);mod.start(t);car.stop(t+dur+.1);mod.stop(t+dur+.1);
  return g;
}
/* tone(freq, start, dur, wave, vol, bus, slideTo, lowpassCut, reverbSend, attack) */
function tone(f,t,dur,type,vol,bus,slide,cut,rv,att){
  const c=AU.ctx;if(!c||AU.muted)return;const o=c.createOscillator();o.type=type||'sine';o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);
  const gn=c.createGain();env(gn.gain,t,att||.005,vol||.1,dur);let n=o;
  if(cut){const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=cut;fl.Q.value=2;o.connect(fl);n=fl;}
  n.connect(gn);gn.connect(bus||AU.sfx);if(rv){const s=c.createGain();s.gain.value=rv;gn.connect(s);s.connect(AU.rev);}o.start(t);o.stop(t+dur+.08);
}
/* noise(start, dur, vol, filterFrom, filterTo, filterType, bus, reverbSend, Q, attack) */
function noise(t,dur,vol,f0,f1,type,bus,rv,q,att){
  const c=AU.ctx;if(!c||AU.muted)return;const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;
  const fl=c.createBiquadFilter();fl.type=type||'lowpass';fl.Q.value=q||1;fl.frequency.setValueAtTime(f0||4000,t);fl.frequency.exponentialRampToValueAtTime(Math.max(30,f1||200),t+dur);
  const gn=c.createGain();env(gn.gain,t,att||.003,vol,dur);s.connect(fl);fl.connect(gn);gn.connect(bus||AU.sfx);if(rv){const r=c.createGain();r.gain.value=rv;gn.connect(r);r.connect(AU.rev);}
  s.start(t,Math.random()*.5);s.stop(t+dur+.08);
}
/* FM patches, in the spirit of a 1990s soundboard */
const PATCH={
  box:  (f,t,d,v,b)=>fm(f,t,d,3.5,2.2,.18,v,b,.35,.002),           /* music box: inharmonic tine */
  celst:(f,t,d,v,b)=>fm(f,t,d,1,1.6,.5,v,b,.3,.003),                /* celesta */
  bell: (f,t,d,v,b)=>fm(f,t,d,1.4,3.2,1.2,v,b,.5,.002),             /* church bell: non-integer ratio */
  bass: (f,t,d,v,b)=>fm(f,t,d,1,1.1,.3,v,b,0,.006),                 /* round FM bass */
  pad:  (f,t,d,v,b)=>{fm(f,t,d,2,.45,d,v,b,.5,d*.35,-6);fm(f,t,d,2,.45,d,v*.8,b,.5,d*.35,7);},   /* breathing string pad */
  reed: (f,t,d,v,b)=>fm(f,t,d,2,1.3,d,v,b,.25,.03),                 /* an accordion-ish reed for the waltz */
  glass:(f,t,d,v,b)=>fm(f,t,d,5.19,1.4,.6,v,b,.45,.002)
};

/* =====================================================================================
   4. INPUT — one snapshot per simulation tick from keyboard, mouse/pen, touch stick + buttons, gamepads.
      LATCH holds keys pressed since the last tick so very quick taps are never lost.
   ===================================================================================== */
const KEY={},LATCH=new Set();
const GAMEKEYS=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Tab']);
addEventListener('keydown',e=>{if(GAMEKEYS.has(e.code))e.preventDefault();KEY[e.code]=true;if(e.repeat)return;LATCH.add(e.code);audioInit();});
addEventListener('keyup',e=>{KEY[e.code]=false;});
addEventListener('blur',()=>{for(const k in KEY)KEY[k]=false;PTR.down=false;});
const K=c=>KEY[c]||LATCH.has(c);
let RECT={x:0,y:0,w:100,h:50};
/* pointer in panel dots (mouse, pen and touch on the panel itself) */
const PTR={x:0,y:0,on:false,down:false,pressed:false,released:false,last:0,id:null,touch:false,right:false};
const toM=e=>[(e.clientX-RECT.x)/RECT.w*W,(e.clientY-RECT.y)/RECT.h*H];
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();[PTR.x,PTR.y]=toM(e);PTR.on=true;PTR.touch=e.pointerType!=='mouse';PTR.last=performance.now();
  if(e.button===2){PTR.right=true;return;}PTR.down=true;PTR.pressed=true;PTR.id=e.pointerId;try{cv.setPointerCapture(e.pointerId);}catch(_){}});
addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.pointerId===PTR.id){[PTR.x,PTR.y]=toM(e);PTR.on=true;PTR.last=performance.now();}});
addEventListener('pointerup',e=>{if(e.pointerId===PTR.id||e.pointerType==='mouse'){if(e.button===2)return;if(PTR.down)PTR.released=true;PTR.down=false;}});
addEventListener('pointercancel',e=>{if(e.pointerId===PTR.id){PTR.down=false;PTR.released=true;}});
function pads(){try{const gp=navigator.getGamepads?navigator.getGamepads():[];const out=[];for(const p of gp)if(p&&p.connected!==false)out.push(p);return out;}catch(e){return [];}}
const TS={x:0,y:0,on:false,A:false,B:false};
function stick(el,kn,cb){
  let id=null,cx=0,cy=0;
  const set=(x,y)=>{const dx=x-cx,dy=y-cy,r=el.clientWidth*.5,l=Math.hypot(dx,dy),k=l>r*.62?r*.62/l:1;kn.style.transform=`translate(${dx*k}px,${dy*k}px)`;const m=Math.min(1,l/(r*.62));cb(l>2?dx/l*m:0,l>2?dy/l*m:0,true);};
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();id=e.pointerId;const r=el.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;try{el.setPointerCapture(id);}catch(_){}set(e.clientX,e.clientY);});
  el.addEventListener('pointermove',e=>{if(e.pointerId===id)set(e.clientX,e.clientY);});
  const end=e=>{if(e.pointerId!==id)return;id=null;kn.style.transform='';cb(0,0,false);};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
}
stick($('stL'),$('knL'),(x,y,on)=>{TS.x=x;TS.y=y;TS.on=on;});
for(const [bid,k] of [['bA','A'],['bB','B']]){
  const el=$(bid);
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();TS[k]=true;el.classList.add('on');try{el.setPointerCapture(e.pointerId);}catch(_){}});
  const up=()=>{TS[k]=false;el.classList.remove('on');};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);
}
