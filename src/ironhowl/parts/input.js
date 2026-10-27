/* ===================== input: keyboard + mouse, gamepads, twin touch sticks ===================== */
const KEY={},LATCH=new Set();
const GAMEKEYS=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Tab']);
const KEYHOOK=[];
addEventListener('keydown',e=>{if(GAMEKEYS.has(e.code))e.preventDefault();KEY[e.code]=true;if(e.repeat)return;LATCH.add(e.code);audioInit();for(const f of KEYHOOK)f(e.code);});
addEventListener('keyup',e=>{KEY[e.code]=false;});
addEventListener('blur',()=>{for(const k in KEY)KEY[k]=false;MOUSE.l=MOUSE.r=false;});
const K=c=>KEY[c]||LATCH.has(c);
const MOUSE={x:0,y:0,on:false,l:false,r:false,lp:false,rp:false,last:0};
cv.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;MOUSE.x=(e.clientX-RECT.x)/RECT.w*W;MOUSE.y=(e.clientY-RECT.y)/RECT.h*H;MOUSE.on=true;MOUSE.last=performance.now();});
cv.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;audioInit();MOUSE.on=true;MOUSE.x=(e.clientX-RECT.x)/RECT.w*W;MOUSE.y=(e.clientY-RECT.y)/RECT.h*H;if(e.button===0){MOUSE.l=true;MOUSE.lp=true;}if(e.button===2){MOUSE.r=true;MOUSE.rp=true;}});
addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')return;if(e.button===0)MOUSE.l=false;if(e.button===2)MOUSE.r=false;});
function pads(){try{const gp=navigator.getGamepads?navigator.getGamepads():[];const out=[];for(const p of gp)if(p&&p.connected!==false)out.push(p);return out;}catch(e){return [];}}
const TS={mx:0,my:0,ax:0,ay:0,aOn:false,M:false,D:false,H:false};
function stick(el,kn,cb){
  let id=null,cx=0,cy=0;
  const set=(x,y)=>{const dx=x-cx,dy=y-cy,r=el.clientWidth*.5,l=Math.hypot(dx,dy),k=l>r*.62?r*.62/l:1;kn.style.transform=`translate(${dx*k}px,${dy*k}px)`;const m=Math.min(1,l/(r*.62));cb(l>2?dx/l*m:0,l>2?dy/l*m:0,true);};
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();id=e.pointerId;const r=el.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;try{el.setPointerCapture(id);}catch(_){}set(e.clientX,e.clientY);});
  el.addEventListener('pointermove',e=>{if(e.pointerId===id)set(e.clientX,e.clientY);});
  const end=e=>{if(e.pointerId!==id)return;id=null;kn.style.transform='';cb(0,0,false);};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
}
stick($('stL'),$('knL'),(x,y)=>{TS.mx=x;TS.my=y;});
stick($('stR'),$('knR'),(x,y,on)=>{TS.ax=x;TS.ay=y;TS.aOn=on;});
for(const [bid,k] of [['bM','M'],['bD','D'],['bH','H']]){
  const el=$(bid);
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();TS[k]=true;el.classList.add('on');try{el.setPointerCapture(e.pointerId);}catch(_){}});
  const up=()=>{TS[k]=false;el.classList.remove('on');};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);
}
/* one control snapshot per frame */
let AIMMODE='mouse';
function readCtl(){
  const o={mx:0,my:0,ax:0,ay:0,aim:null,px:0,py:0,fire:false,missile:false,dash:false,howl:false,start:false,u:false,d:false,l:false,r:false,ok:false,back:false};
  if(K('KeyA'))o.mx-=1;if(K('KeyD'))o.mx+=1;if(K('KeyW'))o.my-=1;if(K('KeyS'))o.my+=1;
  let kx=0,ky=0;if(K('ArrowLeft'))kx-=1;if(K('ArrowRight'))kx+=1;if(K('ArrowUp'))ky-=1;if(K('ArrowDown'))ky+=1;
  if(kx||ky){o.aim='dir';o.ax=kx;o.ay=ky;o.fire=true;AIMMODE='keys';}
  else if(MOUSE.on&&(AIMMODE!=='keys'||performance.now()-MOUSE.last<400)){o.aim='point';o.px=MOUSE.x;o.py=MOUSE.y;AIMMODE='mouse';if(MOUSE.l)o.fire=true;}
  if(MOUSE.r||K('Space'))o.missile=true;if(K('ShiftLeft')||K('ShiftRight'))o.dash=true;if(K('KeyE')||K('KeyQ'))o.howl=true;
  if(K('KeyJ'))o.fire=true;if(K('KeyK'))o.missile=true;if(K('KeyL'))o.dash=true;
  if(TS.mx||TS.my){o.mx=TS.mx;o.my=TS.my;}
  if(TS.aOn&&(TS.ax||TS.ay)){o.aim='dir';o.ax=TS.ax;o.ay=TS.ay;o.fire=true;}
  if(TS.M)o.missile=true;if(TS.D)o.dash=true;if(TS.H)o.howl=true;
  for(const p of pads()){
    const b=k=>!!(p.buttons[k]&&p.buttons[k].pressed),lx=p.axes[0]||0,ly=p.axes[1]||0,rx=p.axes[2]||0,ry=p.axes[3]||0;
    if(Math.hypot(lx,ly)>.2){o.mx=lx;o.my=ly;}
    if(b(14))o.mx=-1;if(b(15))o.mx=1;if(b(12))o.my=-1;if(b(13))o.my=1;
    if(Math.hypot(rx,ry)>.3){o.aim='dir';o.ax=rx;o.ay=ry;if(Math.hypot(rx,ry)>.55)o.fire=true;}
    if(b(7)||b(2))o.fire=true;if(b(5)||b(0))o.missile=true;if(b(4)||b(1))o.dash=true;if(b(3)||b(6))o.howl=true;if(b(9))o.start=true;
    if(b(0))o.ok=true;if(b(1))o.back=true;
  }
  const ml=Math.hypot(o.mx,o.my);if(ml>1){o.mx/=ml;o.my/=ml;}
  o.u=o.my<-.5||K('ArrowUp');o.d=o.my>.5||K('ArrowDown');o.l=o.mx<-.5||K('ArrowLeft');o.r=o.mx>.5||K('ArrowRight');
  o.ok=o.ok||K('Enter')||K('Space')||K('KeyJ')||MOUSE.lp;o.back=o.back||K('Escape')||K('KeyK');o.start=o.start||K('Enter');
  return o;
}
function endInputFrame(){LATCH.clear();MOUSE.lp=MOUSE.rp=false;}
