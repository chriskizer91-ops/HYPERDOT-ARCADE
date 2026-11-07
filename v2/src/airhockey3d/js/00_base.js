/* =====================================================================================
   1. BASICS
   ===================================================================================== */
const $=id=>document.getElementById(id);
const cv=$('gl');
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2;
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchy=matchMedia('(hover: none)').matches;
const fmt=n=>Math.floor(n).toLocaleString('en-US');
const pick=a=>a[(Math.random()*a.length)|0];
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hexRGB(h){const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255];}
const c255=v=>v<0?0:v>255?255:v|0;
/* pixels are stored ABGR little-endian in a Uint32Array view of ImageData */
const pack=(r,g,b,a=255)=>(((a&255)<<24)|(c255(b)<<16)|(c255(g)<<8)|c255(r))>>>0;
function rgba(c,a=1){return 'rgba('+c255(c[0])+','+c255(c[1])+','+c255(c[2])+','+a+')';}
function mixC(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
const EMBED=/[?&]embed=1/.test(location.search);
/* =====================================================================================
   2. BITMAP FONTS — 5x7 (txt5) and 3x5 (txt3); col may be a CSS color or an array of 7 row colors (gradient)
   ===================================================================================== */
const F5SRC=`A 01110 10001 10001 11111 10001 10001 10001|B 11110 10001 10001 11110 10001 10001 11110|C 01110 10001 10000 10000 10000 10001 01110|D 11110 10001 10001 10001 10001 10001 11110|E 11111 10000 10000 11110 10000 10000 11111|F 11111 10000 10000 11110 10000 10000 10000|G 01110 10001 10000 10111 10001 10001 01111|H 10001 10001 10001 11111 10001 10001 10001|I 01110 00100 00100 00100 00100 00100 01110|J 00111 00010 00010 00010 00010 10010 01100|K 10001 10010 10100 11000 10100 10010 10001|L 10000 10000 10000 10000 10000 10000 11111|M 10001 11011 10101 10101 10001 10001 10001|N 10001 10001 11001 10101 10011 10001 10001|O 01110 10001 10001 10001 10001 10001 01110|P 11110 10001 10001 11110 10000 10000 10000|Q 01110 10001 10001 10001 10101 10010 01101|R 11110 10001 10001 11110 10100 10010 10001|S 01111 10000 10000 01110 00001 00001 11110|T 11111 00100 00100 00100 00100 00100 00100|U 10001 10001 10001 10001 10001 10001 01110|V 10001 10001 10001 10001 10001 01010 00100|W 10001 10001 10001 10101 10101 10101 01010|X 10001 10001 01010 00100 01010 10001 10001|Y 10001 10001 01010 00100 00100 00100 00100|Z 11111 00001 00010 00100 01000 10000 11111|0 01110 10001 10011 10101 11001 10001 01110|1 00100 01100 00100 00100 00100 00100 01110|2 01110 10001 00001 00010 00100 01000 11111|3 11111 00010 00100 00010 00001 10001 01110|4 00010 00110 01010 10010 11111 00010 00010|5 11111 10000 11110 00001 00001 10001 01110|6 00110 01000 10000 11110 10001 10001 01110|7 11111 00001 00010 00100 01000 01000 01000|8 01110 10001 10001 01110 10001 10001 01110|9 01110 10001 10001 01111 00001 00010 01100|! 00100 00100 00100 00100 00100 00000 00100|. 00000 00000 00000 00000 00000 01100 01100|, 00000 00000 00000 00000 01100 00100 01000|: 00000 01100 01100 00000 01100 01100 00000|- 00000 00000 00000 11111 00000 00000 00000|+ 00000 00100 00100 11111 00100 00100 00000|? 01110 10001 00001 00010 00100 00000 00100|' 00100 00100 01000 00000 00000 00000 00000|/ 00001 00001 00010 00100 01000 10000 10000|> 01000 00100 00010 00001 00010 00100 01000|< 00010 00100 01000 10000 01000 00100 00010|x 00000 00000 10001 01010 00100 01010 10001|_ 00000 00000 00000 00000 00000 00000 00000`;
const G5={};for(const ln of F5SRC.split('|')){const p=ln.trim().split(/\s+/);G5[p[0]==='_'?' ':p[0]]=p.slice(1).map(r=>parseInt(r,2));}
const F3SRC=`A 010 101 111 101 101|B 110 101 110 101 110|C 011 100 100 100 011|D 110 101 101 101 110|E 111 100 110 100 111|F 111 100 110 100 100|G 011 100 101 101 011|H 101 101 111 101 101|I 111 010 010 010 111|J 001 001 001 101 010|K 101 101 110 101 101|L 100 100 100 100 111|M 101 111 111 101 101|N 110 101 101 101 101|O 010 101 101 101 010|P 110 101 110 100 100|Q 010 101 101 110 011|R 110 101 110 101 101|S 011 100 010 001 110|T 111 010 010 010 010|U 101 101 101 101 111|V 101 101 101 101 010|W 101 101 111 111 101|X 101 101 010 101 101|Y 101 101 010 010 010|Z 111 001 010 100 111|0 111 101 101 101 111|1 010 110 010 010 111|2 111 001 111 100 111|3 111 001 011 001 111|4 101 101 111 001 001|5 111 100 111 001 111|6 111 100 111 101 111|7 111 001 001 010 010|8 111 101 111 101 111|9 111 101 111 001 111|x 000 101 010 101 000|+ 000 010 111 010 000|- 000 000 111 000 000|: 0 1 0 1 0|. 0 0 0 0 1|, 0 0 0 1 1|! 1 1 1 0 1|/ 001 001 010 100 100|' 1 1 0 0 0|> 100 010 001 010 100|< 001 010 100 010 001|? 111 001 011 000 010|( 01 10 10 10 01|) 10 01 01 01 10|% 101 001 010 100 101|# 101 111 101 111 101`;
const G3={};for(const ln of F3SRC.split('|')){const p=ln.trim().split(/\s+/);G3[p[0]]=p.slice(1);}
function tw5(s,sc=1){return s.length*6*sc-sc;}
function txt5(g,s,x,y,col,sc=1,align,it=0){
  if(align==='c')x=Math.round(x-tw5(s,sc)/2);else if(align==='r')x=x-tw5(s,sc);
  const cols=Array.isArray(col)?col:null;if(!cols)g.fillStyle=col;
  for(const ch of s){const gl5=G5[ch]||G5[ch.toUpperCase()]||G5[' '];
    for(let r=0;r<7;r++){if(cols)g.fillStyle=cols[Math.min(cols.length-1,r)];const ox=it?Math.round((6-r)*it*sc):0;for(let c=0;c<5;c++)if((gl5[r]>>(4-c))&1)g.fillRect(x+c*sc+ox,y+r*sc,sc,sc);}
    x+=6*sc;}
}
function tw3(s,sc=1){let w=0;for(const ch of s){const gg=G3[ch]||G3[ch.toUpperCase()];w+=((gg?gg[0].length:3)+1)*sc;}return Math.max(0,w-sc);}
function txt3(g,s,x,y,col,sc=1,align){
  if(align==='c')x=Math.round(x-tw3(s,sc)/2);else if(align==='r')x=x-tw3(s,sc);
  g.fillStyle=col;
  for(const ch of s){const gg=G3[ch]||G3[ch.toUpperCase()];if(!gg){x+=4*sc;continue;}for(let r=0;r<5;r++)for(let c=0;c<gg[r].length;c++)if(gg[r][c]==='1')g.fillRect(x+c*sc,y+r*sc,sc,sc);x+=(gg[0].length+1)*sc;}
}
const O8=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
function otxt5(g,s,x,y,col,sc=1,align,it=0,ol='#000'){const o=Math.max(1,sc>>1);for(const [a,b] of O8)txt5(g,s,x+a*o,y+b*o,ol,sc,align,it);txt5(g,s,x,y,col,sc,align,it);}
function otxt3(g,s,x,y,col,sc=1,align,ol='#000'){for(const [a,b] of O8)txt3(g,s,x+a,y+b,ol,sc,align);txt3(g,s,x,y,col,sc,align);}
const GR={
  volt:['#ffffff','#fff7cc','#ffe46a','#ffc21a','#ff9a10','#e2600a','#902c06'],
  cyan:['#ffffff','#e6fbff','#a6f3ff','#4fe0ff','#22b4ff','#2a70ff','#3a36c8'],
  red:['#ffffff','#ffe0e6','#ff9aab','#ff4a62','#ff1a3a','#c80d2a','#7a0618'],
  steel:['#ffffff','#eef1f8','#cfd6e6','#a2adc6','#76829e','#4e5876','#2c3250'],
  pink:['#ffffff','#ffe2f2','#ffa6d6','#ff5ab4','#ff2f9a','#c81476','#760a46'],
  green:['#ffffff','#eaffe6','#b4ffaa','#6aff5a','#2ee04a','#1a9c3a','#0e5a26'],
  violet:['#ffffff','#f0e6ff','#d0b4ff','#a878ff','#8048ff','#5a2ad8','#34168a']
};
/* =====================================================================================
   5. AUDIO — tiny synth: tone() and noise() voices into a compressor, plus reverb and delay sends.
      Nothing plays until the first user gesture calls audioInit().
   ===================================================================================== */
const AU={ctx:null,out:null,mus:null,sfx:null,rev:null,dly:null,noise:null,muted:store.get('hd-'+CAB.id+'-mute','0')==='1',next:0,step:0,track:null,want:null};
const mtof=m=>440*Math.pow(2,(m-69)/12),now=()=>AU.ctx?AU.ctx.currentTime:0;
function audioInit(){
  try{
    if(!AU.ctx){
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();AU.ctx=c;
      const comp=c.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=5;comp.attack.value=.003;comp.release.value=.15;comp.connect(c.destination);
      AU.out=c.createGain();AU.out.gain.value=AU.muted||ARC.muted?0:.62;AU.out.connect(comp);
      AU.mus=c.createGain();AU.mus.gain.value=.26;AU.mus.connect(AU.out);
      AU.sfx=c.createGain();AU.sfx.gain.value=.85;AU.sfx.connect(AU.out);
      const len=c.sampleRate*2.2|0,ir=c.createBuffer(2,len,c.sampleRate);
      for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}
      const cvn=c.createConvolver();cvn.buffer=ir;AU.rev=c.createGain();AU.rev.gain.value=.5;AU.rev.connect(cvn);cvn.connect(AU.out);
      const dl=c.createDelay(1);dl.delayTime.value=.3;const fb=c.createGain();fb.gain.value=.32;const dlo=c.createGain();dlo.gain.value=.35;
      dl.connect(fb);fb.connect(dl);dl.connect(dlo);dlo.connect(AU.mus);AU.dly=dl;
      const nb=c.createBuffer(1,c.sampleRate,c.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;AU.noise=nb;
      AU.next=c.currentTime+.05;
    }
    if(AU.ctx.state==='suspended')AU.ctx.resume();
  }catch(e){}
}
function setVolume(){if(AU.out)AU.out.gain.value=AU.muted||ARC.muted?0:.62;}
function env(gn,t,a,peak,d){gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);gn.gain.exponentialRampToValueAtTime(.0001,t+a+d);}
/* tone(freq, start, dur, wave, vol, bus, slideTo, lowpassCut, reverbSend, attack) */
function tone(f,t,dur,type,vol,bus,slide,cut,rv,att){
  const c=AU.ctx;if(!c||AU.muted)return;const o=c.createOscillator();o.type=type||'square';o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);
  const gn=c.createGain();env(gn,t,att||.005,vol||.1,dur);let n=o;
  if(cut){const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=cut;fl.Q.value=3;o.connect(fl);n=fl;}
  n.connect(gn);gn.connect(bus||AU.sfx);if(rv){const s=c.createGain();s.gain.value=rv;gn.connect(s);s.connect(AU.rev);}o.start(t);o.stop(t+dur+.08);
}
/* noise(start, dur, vol, filterFrom, filterTo, filterType, bus, reverbSend, Q) */
function noise(t,dur,vol,f0,f1,type,bus,rv,q){
  const c=AU.ctx;if(!c||AU.muted)return;const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;
  const fl=c.createBiquadFilter();fl.type=type||'lowpass';fl.Q.value=q||1;fl.frequency.setValueAtTime(f0||4000,t);fl.frequency.exponentialRampToValueAtTime(Math.max(30,f1||200),t+dur);
  const gn=c.createGain();env(gn,t,.003,vol,dur);s.connect(fl);fl.connect(gn);gn.connect(bus||AU.sfx);if(rv){const r=c.createGain();r.gain.value=rv;gn.connect(r);r.connect(AU.rev);}
  s.start(t,Math.random()*.5);s.stop(t+dur+.08);
};
/* optional announcer through the browser's speech engine */
let VOICE=store.get('hd-'+CAB.id+'-voice','1')==='1';
function say(txt,pitch=.6,rate=.95){if(AU.muted||ARC.muted||!VOICE)return;try{const s=window.speechSynthesis;if(!s)return;s.cancel();const u=new SpeechSynthesisUtterance(txt);u.pitch=pitch;u.rate=rate;
  const vs=s.getVoices?s.getVoices():[];const v=vs.find(v=>/^en/i.test(v.lang));if(v)u.voice=v;s.speak(u);}catch(e){}}
/* ---- step-sequencer music: one string per instrument, 16 steps per bar, chords by scale degree ----
   bass: R=root O=octave F=fifth T=third  .=rest   lead: digits/letters = scale degree (1..g), '-' = hold
   kick/snare/hat: x = hit.  prog = scale degree of each bar's chord.  arp '8'/'16' = arpeggio speed. */
const SCALES={minor:[0,2,3,5,7,8,10],phryg:[0,1,3,5,7,8,10],harm:[0,2,3,5,7,8,11],dorian:[0,2,3,5,7,9,10],major:[0,2,4,5,7,9,11],penta:[0,3,5,7,10],mixo:[0,2,4,5,7,9,10]};
function sdeg(tr,d){const sc=SCALES[tr.scale],n=sc.length,o=Math.floor(d/n),i=((d%n)+n)%n;return sc[i]+12*o;}
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
      if(bc!=='.'){const n=R+sdeg(tr,d)+(bc==='O'?12:bc==='F'?sdeg(tr,d+4)-sdeg(tr,d):bc==='T'?sdeg(tr,d+2)-sdeg(tr,d):0);tone(mtof(n),t,sd*1.7,'sawtooth',.13,AU.mus,0,700);}
      if(tr.kick[s]==='x'){const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);const gn=c.createGain();env(gn,t,.002,.45,.16);o.connect(gn);gn.connect(AU.mus);o.start(t);o.stop(t+.22);}
      if(tr.snare[s]==='x'){noise(t,.14,.24,2800,900,'bandpass',AU.mus);tone(190,t,.06,'triangle',.08,AU.mus,120);}
      if(tr.hat[s]==='x')noise(t,.025,.06,9000,7000,'highpass',AU.mus);
      const lc=tr.lead[st%32];
      if(lc&&lc!=='.'&&lc!=='-'&&tr.lv){let len=1;while(tr.lead[(st+len)%32]==='-'&&len<16)len++;const dg=LEADCH.indexOf(lc);
        const o=c.createOscillator();o.type='square';o.frequency.setValueAtTime(mtof(R+24+sdeg(tr,dg)),t);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=2600;
        const gn=c.createGain();env(gn,t,.01,tr.lv,sd*len*.95);o.connect(fl);fl.connect(gn);gn.connect(AU.mus);gn.connect(AU.dly);o.start(t);o.stop(t+sd*len+.1);}
      if(tr.arp){const ev=tr.arp==='16'?1:2;if(s%ev===0){const k=(s/ev|0)%4,deg=[0,2,4,7][k];tone(mtof(R+12+sdeg(tr,d+deg)),t,sd*ev*.9,'triangle',.035,AU.mus);}}
      if(tr.pad&&s===0){for(const k of [0,2,4]){const f=mtof(R+12+sdeg(tr,d+k));tone(f,t,sd*15,'sawtooth',.018,AU.mus,0,900,0,sd*4);tone(f*1.006,t,sd*15,'sawtooth',.014,AU.mus,0,900,0,sd*4);}}
    }
    AU.next+=sd;AU.step++;
  }
}
/* =====================================================================================
   6. INPUT — keys (latched, so a quick tap is never lost), every pointer on the canvas,
      and gamepads. Mallets follow pointers directly; keys and sticks push them.
      In a two-player game each finger belongs to the player whose end of the screen it
      first touched, so two people can share one phone or tablet.
   ===================================================================================== */
const KEY={},LATCH=new Set();
const GAMEKEYS=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Tab']);
addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='BUTTON'&&(e.code==='Space'||e.code==='Enter'))return;   /* let menu buttons take their own keys */
  if(GAMEKEYS.has(e.code))e.preventDefault();KEY[e.code]=true;if(e.repeat)return;LATCH.add(e.code);audioInit();});
addEventListener('keyup',e=>{KEY[e.code]=false;});
addEventListener('blur',()=>{for(const k in KEY)KEY[k]=false;PT.clear();MOUSE.on=false;});
const K=c=>KEY[c]||LATCH.has(c);
const PT=new Map();                       /* pointerId -> {x,y,type,pl,t} in CSS pixels; pl is set by the game */
const MOUSE={x:0,y:0,on:false,t:0};
let TAP=false;
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();
  PT.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,type:e.pointerType,pl:-1,t:performance.now()});TAP=true;
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
  if(e.pointerType==='mouse'){MOUSE.x=e.clientX;MOUSE.y=e.clientY;MOUSE.on=true;MOUSE.t=performance.now();}});
addEventListener('pointermove',e=>{const p=PT.get(e.pointerId);if(p){p.x=e.clientX;p.y=e.clientY;}
  if(e.pointerType==='mouse'){MOUSE.x=e.clientX;MOUSE.y=e.clientY;MOUSE.on=e.target===cv||!!p;MOUSE.t=performance.now();}},{passive:true});
const ptrEnd=e=>{PT.delete(e.pointerId);};
addEventListener('pointerup',ptrEnd);addEventListener('pointercancel',ptrEnd);
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!PT.has(e.pointerId))MOUSE.on=false;});
function pads(){try{const gp=navigator.getGamepads?navigator.getGamepads():[];const out=[];for(const p of gp)if(p&&p.connected!==false)out.push(p);return out;}catch(e){return [];}}
/* a stick (keys or gamepad) for player pi: x across, y away from the player, -1..1.
   One player: arrows, WASD and the first pad all drive player 0. Two players: player 0 has the arrows and
   pad 1, player 1 has WASD and pad 2. */
function stick(pi,two){
  let x=0,y=0;const k=(a,b)=>KEY[a]||KEY[b];
  if(!two||pi===0){if(k('ArrowLeft'))x-=1;if(k('ArrowRight'))x+=1;if(k('ArrowUp'))y+=1;if(k('ArrowDown'))y-=1;}
  if(!two&&pi===0||two&&pi===1){if(KEY.KeyA)x-=1;if(KEY.KeyD)x+=1;if(KEY.KeyW)y+=1;if(KEY.KeyS)y-=1;}
  const ps=pads(),p=two?ps[pi]:(pi===0?ps[0]:null);
  if(p){const b=i=>!!(p.buttons[i]&&p.buttons[i].pressed),lx=p.axes[0]||0,ly=p.axes[1]||0;
    if(Math.hypot(lx,ly)>.18){x=lx;y=-ly;}if(b(14))x=-1;if(b(15))x=1;if(b(12))y=1;if(b(13))y=-1;}
  const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}return {x,y,on:l>.05};
}
/* menu keys, edge-detected by the loop */
function menuKeys(){
  const o={ok:K('Enter')||K('Space'),back:K('Escape'),pause:K('Escape')||K('KeyP')};
  for(const p of pads()){const b=i=>!!(p.buttons[i]&&p.buttons[i].pressed);if(b(0))o.ok=true;if(b(1))o.back=true;if(b(9))o.pause=true;}
  return o;
}
function endInputFrame(){LATCH.clear();TAP=false;}
/* =====================================================================================
   7. ARCADE BRIDGE — the arcade (or the back room) loads this page in an iframe with ?embed=1.
      game -> arcade:  {src:'hyperdot',type:'ready'|'score'|'over'|'exit', id, ...}
      arcade -> game:  {src:'hyperdot-arcade',cmd:'start'|'pause'|'resume'|'attract'|'mute'|'unmute'}
   ===================================================================================== */
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
  else if(m.cmd==='mute'){ARC.muted=true;setVolume();}
  else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}
});
window.HYPERDOT_GAME={id:CAB.id,title:CAB.title,tickets:CAB.tickets,version:1};
