/* =====================================================================================
   THE MACHINES. Every cabinet on the floor is a real game: a separate HTML file the arcade
   loads into a frame only when you sit down at it. Idle cabinets play a recorded attract loop
   on their screens; the machine you are playing runs live and the 3D room stops drawing so
   the game has the whole GPU. Leaving a machine closes its frame and frees its memory.
   ===================================================================================== */
const GH={el:null,fr:null,a:null,ready:false,openT:0,holdT:0,lastTix:0};
(function hostDom(){
  const css=document.createElement('style');
  css.textContent=`#gh{position:fixed;inset:0;z-index:20;background:#000;opacity:0;transition:opacity .45s;pointer-events:none}
#gh.on{opacity:1;pointer-events:auto}
#gh iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}
#ghl{position:absolute;inset:0;display:grid;place-items:center;text-align:center;background:radial-gradient(60% 60% at 50% 45%,#1a0d2a,#050308);transition:opacity .5s;pointer-events:none}
#ghl.gone{opacity:0}
#ghl b{display:block;font:700 26px/1.1 var(--f);letter-spacing:.24em;color:#fff;text-shadow:0 0 14px var(--pink),0 0 30px rgba(255,63,164,.5)}
#ghl span{display:block;margin-top:12px;font:500 12px/1.4 var(--f);letter-spacing:.22em;text-transform:uppercase;color:var(--ink-2)}
#ghl i{display:block;width:180px;height:3px;margin:18px auto 0;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden}
#ghl i::after{content:'';display:block;height:100%;width:40%;background:linear-gradient(90deg,var(--pink),var(--cyan));animation:ghs 1.1s linear infinite}
@keyframes ghs{from{transform:translateX(-100%)}to{transform:translateX(260%)}}
#ghx{position:absolute;left:50%;top:max(6px,env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:2;height:30px;padding:0 14px;border-radius:999px;border:1px solid var(--edge);
  background:rgba(14,10,24,.7);color:var(--ink);font:600 11px/1 var(--f);letter-spacing:.16em;text-transform:uppercase;cursor:pointer;opacity:.35;transition:opacity .3s;backdrop-filter:blur(6px)}
#ghx:hover,#ghx:focus-visible,#gh.peek #ghx{opacity:1}
#ghx em{font-style:normal;color:#ffd23f;margin-left:8px}
#ghr{position:absolute;left:50%;top:44%;width:84px;height:84px;margin:-42px;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .15s;
  background:conic-gradient(var(--pink) calc(var(--p,0)*1turn),rgba(255,255,255,.1) 0);-webkit-mask:radial-gradient(circle,transparent 34px,#000 35px);mask:radial-gradient(circle,transparent 34px,#000 35px)}
#ghr.on{opacity:1}
#ght{position:absolute;left:50%;top:60%;transform:translate(-50%,-50%);font:700 22px/1.2 var(--f);letter-spacing:.14em;color:#ffd23f;text-shadow:0 0 18px rgba(255,210,63,.7);opacity:0;transition:opacity .3s;pointer-events:none;text-align:center;white-space:nowrap}`;
  document.head.appendChild(css);
  const d=document.createElement('div');d.id='gh';d.innerHTML='<div id="ghl"><div><b id="ghn">MACHINE</b><span id="ghs">Powering up</span><i></i></div></div><button id="ghx" type="button">← Arcade<em id="ghk"></em></button><div id="ghr"></div><div id="ght"></div>';
  document.body.appendChild(d);GH.el=d;
  $('ghx').addEventListener('click',()=>closeGame());
  $('ghk').textContent=touchy?'':'hold Esc';
  let peekT=0;d.addEventListener('pointermove',e=>{if(e.clientY<60){d.classList.add('peek');clearTimeout(peekT);peekT=setTimeout(()=>d.classList.remove('peek'),1600);}});
})();
function openGame(a){
  const G=a.game;GH.a=a;GH.ready=false;GH.gotReady=0;GH.score=null;GH.openT=performance.now();GH.holdT=0;
  $('ghn').textContent=G.title||a.name.toUpperCase();$('ghs').textContent=G.deluxe?'Loading the full game':'Powering up';$('ghl').classList.remove('gone');
  const f=document.createElement('iframe');f.allow='autoplay; fullscreen; gamepad';f.setAttribute('title',a.name);
  f.src=G.src+(G.src.includes('?')?'&':'?')+'embed=1';GH.fr=f;GH.el.insertBefore(f,GH.el.firstChild);
  GH.el.classList.add('on');W_.mode='game';
  if(AU.out&&AU.ctx)AU.out.gain.setTargetAtTime(0,AU.ctx.currentTime,.15);
  f.addEventListener('load',()=>{try{const w=f.contentWindow;w.addEventListener('keydown',ghKey,true);w.addEventListener('keyup',ghKey,true);w.focus();}catch(e){}
    setTimeout(()=>{if(!GH.ready)ghReady();},G.deluxe?9000:5000);});
}
function ghReady(){if(GH.ready)return;GH.ready=true;$('ghl').classList.add('gone');ghSync();try{GH.fr.contentWindow.focus();}catch(e){}}
/* hold Esc (or a gamepad's Back) to leave any machine, whatever the game does with a single press */
function ghKey(e){if(e.key!=='Escape')return;if(e.type==='keydown'){if(!e.repeat)GH.holdT=performance.now();}else GH.holdT=0;}
function ghTick(){
  if(W_.mode!=='game')return;
  let held=GH.holdT?(performance.now()-GH.holdT)/900:0;
  const gps=navigator.getGamepads?navigator.getGamepads():[];for(const gp of gps)if(gp&&gp.buttons[8]&&gp.buttons[8].pressed){GH.padT=GH.padT||performance.now();held=Math.max(held,(performance.now()-GH.padT)/900);}else if(gp)GH.padT=0;
  const r=$('ghr');r.style.setProperty('--p',Math.min(1,held).toFixed(3));r.classList.toggle('on',held>.12);
  if(held>=1){GH.holdT=0;GH.padT=0;closeGame();}
}
function closeGame(){
  if(W_.mode!=='game')return;const a=GH.a;
  try{GH.fr.contentWindow.postMessage({src:'hyperdot-arcade',cmd:'pause'},'*');}catch(e){}
  GH.el.classList.remove('on');$('ghr').classList.remove('on');
  setTimeout(()=>{if(GH.fr){GH.fr.src='about:blank';GH.fr.remove();GH.fr=null;}},460);
  if(AU.out&&AU.ctx)AU.out.gain.setTargetAtTime(AU.muted?0:.6,AU.ctx.currentTime,.3);
  W_.mode='play';W_.active=a;leaveAttr();cv.focus();
}
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot'||!GH.fr||e.source!==GH.fr.contentWindow)return;
  if(m.type==='ready'){GH.gotReady=performance.now()-GH.openT;if(GH.ready)ghSync();ghReady();}
  else if(m.type==='score')GH.score=m.score;
  else if(m.type==='over'){const n=Math.max(0,Math.round(m.tickets||0));if(n>0){W_.tickets+=n;store.set('arcade-tickets',W_.tickets);$('tixN').textContent=fmt(W_.tickets);
    const t=$('ght');t.textContent='+'+n+' TICKETS';t.style.opacity=1;setTimeout(()=>t.style.opacity=0,2200);S.win();}}
  else if(m.type==='exit')closeGame();
});
/* sound and tab visibility follow into the frame */
function ghCmd(cmd){try{GH.fr&&GH.fr.contentWindow.postMessage({src:'hyperdot-arcade',cmd},'*');}catch(e){}}
/* the arcade's sound switch carries into the machine; leaving the tab pauses whatever is running */
function ghSync(){if(AU.muted)ghCmd('mute');}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&W_.mode==='game')ghCmd('pause');});

/* ---------- attract loops: recorded frames of each game, played on its cabinet's screen ---------- */
const ATT=[];
function Attract(id,scr,o={}){
  const A={id,scr,meta:null,img:null,t:Math.random()*20,fi:-1,asked:false,ph:o.title||id.toUpperCase(),col:o.col||'#ff4fb8'};
  A.load=()=>{if(A.asked)return;A.asked=true;
    fetch('attract/'+id+'.json').then(r=>r.ok?r.json():null).then(m=>{if(!m)return;const im=new Image();im.onload=()=>{A.meta=m;A.img=im;};im.src='attract/'+id+'.webp';}).catch(()=>{});};
  /* until its loop arrives a screen shows the game's name, scrolling, in dots */
  A.place=t=>{const g=scr.g,w=scr.w,h=scr.h;g.fillStyle='#000';g.fillRect(0,0,w,h);
    const sc=Math.max(1,Math.floor(h/24)),tw=tw5(A.ph,sc),x=Math.round(w/2-tw/2+Math.sin(t*.9)*Math.max(0,(tw-w)/2+4));
    txt5(g,A.ph,x,Math.round(h/2-3.5*sc),A.col,sc);
    for(let i=0;i<w;i+=4){const k=(i/4+Math.floor(t*10))%10===0;g.fillStyle=k?'#fff':'#222';g.fillRect(i,1,1,1);g.fillRect(w-1-i,h-2,1,1);}};
  A.tick=(dt,near)=>{A.t+=dt;
    if(near)A.load();
    if(!A.img){if(((A.t*8)|0)!==A.fi){A.fi=(A.t*8)|0;A.place(A.t);return true;}return false;}
    const m=A.meta,f=Math.floor(A.t*m.fps)%m.n;if(f===A.fi)return false;A.fi=f;
    scr.g.drawImage(A.img,(f%m.cols)*m.w,((f/m.cols)|0)*m.h,m.w,m.h,0,0,scr.w,scr.h);return true;};
  ATT.push(A);return A;
}
/* the machine base every cabinet shares: frame, use point, camera, attract, launch */
function Machine(o){
  const T=chain(mT(o.x,0,o.z),mRY(o.ry||0)),W=(x,y,z)=>xf(T,x,y,z),Dir=(x,y,z)=>{const a=W(x,y,z),b=W(0,0,0);return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];};
  const fw=W(0,0,o.useZ??.95);
  const a={name:o.name,sub:o.sub||'',controls:'iframe',minH:o.minH||20,game:o.game,T,W,Dir,x:o.x,z:o.z,ry:o.ry||0,transT:o.transT,
    use:{x:fw[0],z:fw[2],face:(o.ry||0)+Math.PI},acc:0,screens:[],dyn:[],
    start(){},stop(){},update(){},
    idle(dt){
      if(W_.mode==='game'||(W_.mode==='pin'&&!PIN.arcadeOn))return;
      const d=Math.hypot(CH_.x-fw[0],CH_.z-fw[2]);
      this.acc+=dt;if(this.acc<1/20)return;const st=this.acc;this.acc=0;
      for(const s of this.screens)if(s.att&&s.att.tick(st,d<22))s.scr.upload();
      if(this.onIdle)this.onIdle(st,d);
    },
    drawScreens(){for(const s of this.screens)drawScreen(s.scr,s.m,s.pow||1);},
    draw(){if(this.onDraw)this.onDraw();}
  };
  /* a screen in the cabinet's frame: centre c, normal tilt (radians about x), size w x h in metres */
  a.addScreen=(id,res,c,tilt,w,h,opt={})=>{
    const scr=new Screen(res[0],res[1],{gain:opt.gain||2.2,mono:opt.mono});
    const m=chain(T,mT(c[0],c[1],c[2]),mRX(tilt||0),opt.ry?mRY(opt.ry):m4(),mS(w,h,1));
    const S0={scr,m,att:Attract(id,scr,{title:opt.title||o.game&&o.game.title||o.name.toUpperCase(),col:opt.col}),pow:opt.pow||1,c,tilt,w,h};
    a.screens.push(S0);return S0;};
  /* entering: the camera settles square to the main screen, framed to fit */
  a.cam=()=>{
    const S0=a.screens[0];if(!S0)return walkCam();
    const tl=S0.tilt||0,n=Dir(0,Math.sin(-tl),Math.cos(tl)),c=W(...S0.c);
    const d=fitDist(S0.w,S0.h,40,a.minH,1.04);
    return {eye:[c[0]+n[0]*d,c[1]+n[1]*d,c[2]+n[2]*d],tgt:c,fov:40};};
  ATTR.push(a);return a;
}
/* marquee art: a lit header panel with the game's name in gradient dots */
function marqueeTex(name,top,bot,cols,sub){
  const c=mkCanvas(256,64),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,top||'#1a0630');gr.addColorStop(1,bot||'#05020c');g.fillStyle=gr;g.fillRect(0,0,256,64);
  for(let i=0;i<40;i++){g.fillStyle='rgba(255,255,255,'+(.05+.05*(i%3))+')';g.fillRect((i*67)%256,(i*29)%64,1,1);}
  const sc=name.length>10?2:3,y=sub?10:Math.round(32-3.5*sc);
  gradText(g,name,128,y,sc,cols||['#ffffff','#e6f9ff','#9ff1ff','#58e8ff','#2fb8ff','#3a62ff','#5a2fd8']);
  if(sub)txt3(g,sub,128,50,'#e9ddff','c');
  return texFrom(c,false);
}
function texQuad(T,pts,tex,emi,mode){const mm=new MB();mm.m=mmul(mm.m,T);mm.quad(pts[0],pts[1],pts[2],pts[3],[1,1,1],0,QUV);TEXMESH.push({mesh:mesh(mm),tex,mode:mode||3,emi:emi??2});}
/* images shipped with the big games (backglass and playfield art) become textures once they arrive */
function imgTex(url,cb){const im=new Image();im.onload=()=>cb(texFrom(im,false),im);im.src=url;}
/* the same, cropped about its centre to the aspect of the surface it goes on (a 3:1 backglass onto a 4:3 glass) */
function imgCrop(url,asp,cb,maxW=1024){const im=new Image();im.onload=()=>{const iw=im.naturalWidth,ih=im.naturalHeight;let sw=iw,sh=iw/asp;if(sh>ih){sh=ih;sw=ih*asp;}
  const w=Math.min(maxW,Math.round(sw)),h=Math.max(1,Math.round(w/asp)),c=mkCanvas(w,h),g=c.getContext('2d');g.drawImage(im,(iw-sw)/2,(ih-sh)/2,sw,sh,0,0,w,h);cb(texFrom(c,false));};im.src=url;}
const GRAD={pink:['#ffffff','#ffe8f6','#ffb8e2','#ff7ac8','#ff2f9a','#d6237f','#8e1a6a'],cyan:['#ffffff','#e6fbff','#9ff1ff','#58e8ff','#2fb8ff','#3a62ff','#5a2fd8'],
  gold:['#ffffff','#fff3c4','#ffe14d','#ffb52e','#ff8a2e','#e0521e','#a8301a'],green:['#ffffff','#eaffea','#b8ffb0','#6dff7a','#2fd05a','#1a9a48','#0c6a36'],
  red:['#ffffff','#ffe0e0','#ff9a9a','#ff5a5a','#ff2f3f','#c81e30','#8a1222'],violet:['#ffffff','#f1e6ff','#d8b8ff','#b47aff','#8f4bff','#6a2fd8','#4a1a9a'],
  amber:['#ffffff','#fff0d0','#ffd890','#ffb84a','#ff9a1e','#e07010','#a04a08']};

window.__gh={GH,openGame,closeGame,ghCmd};
