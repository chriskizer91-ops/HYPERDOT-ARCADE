/* ===================== input: mouse virtual stick, keyboard, gamepads, touch stick + buttons ===================== */
const KEY={},LATCH=new Set();
const GAMEKEYS=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Tab']);
addEventListener('keydown',e=>{if(GAMEKEYS.has(e.code))e.preventDefault();KEY[e.code]=true;if(e.repeat)return;LATCH.add(e.code);audioInit();if(!e.code.startsWith('Arrow'))CTLM.kb=performance.now();else CTLM.ar=performance.now();});
addEventListener('keyup',e=>{KEY[e.code]=false;});
addEventListener('blur',()=>{for(const k in KEY)KEY[k]=false;MOUSE.l=MOUSE.r=false;});
const K=c=>KEY[c]||LATCH.has(c);
const MOUSE={x:0,y:0,on:false,l:false,r:false,lp:false,rp:false,last:0};
const CTLM={kb:0,ar:0};
cv.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const nx=(e.clientX-RECT.x)/RECT.w*W,ny=(e.clientY-RECT.y)/RECT.h*H;if(Math.abs(nx-MOUSE.x)+Math.abs(ny-MOUSE.y)>.3)MOUSE.last=performance.now();MOUSE.x=nx;MOUSE.y=ny;MOUSE.on=true;});
cv.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;audioInit();MOUSE.on=true;MOUSE.last=performance.now();MOUSE.x=(e.clientX-RECT.x)/RECT.w*W;MOUSE.y=(e.clientY-RECT.y)/RECT.h*H;if(e.button===0){MOUSE.l=true;MOUSE.lp=true;}if(e.button===2){MOUSE.r=true;MOUSE.rp=true;}});
addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')return;if(e.button===0)MOUSE.l=false;if(e.button===2)MOUSE.r=false;});
document.addEventListener('mouseleave',()=>{MOUSE.on=false;});
function pads(){try{const gp=navigator.getGamepads?navigator.getGamepads():[];const out=[];for(const p of gp)if(p&&p.connected!==false)out.push(p);return out;}catch(e){return [];}}
const TS={sx:0,sy:0,on:false,F:false,M:false,B:false};
function stick(el,kn,cb){
  let id=null,cx=0,cy=0;
  const set=(x,y)=>{const dx=x-cx,dy=y-cy,r=el.clientWidth*.5,l=Math.hypot(dx,dy),k=l>r*.62?r*.62/l:1;kn.style.transform=`translate(${dx*k}px,${dy*k}px)`;const m=Math.min(1,l/(r*.62));cb(l>2?dx/l*m:0,l>2?dy/l*m:0,true);};
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();id=e.pointerId;const r=el.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;try{el.setPointerCapture(id);}catch(_){}set(e.clientX,e.clientY);});
  el.addEventListener('pointermove',e=>{if(e.pointerId===id)set(e.clientX,e.clientY);});
  const end=e=>{if(e.pointerId!==id)return;id=null;kn.style.transform='';cb(0,0,false);};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
}
stick($('stL'),$('knL'),(x,y,on)=>{TS.sx=x;TS.sy=y;TS.on=on;});
for(const [bid,k] of [['bF','F'],['bM','M'],['bB','B']]){
  const el=$(bid);
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();TS[k]=true;el.classList.add('on');try{el.setPointerCapture(e.pointerId);}catch(_){}});
  const up=()=>{TS[k]=false;el.classList.remove('on');};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);
}
let INVERT=store.get('vl-inv','0')==='1';
const dz=(v,d)=>Math.abs(v)<d?0:(v-Math.sign(v)*d)/(1-d);
/* one control snapshot per tick. pitch + = nose up, yaw + = nose right, roll + = right wing down */
function readCtl(){
  const o={pitch:0,yaw:0,roll:0,thr:0,fire:false,missile:false,boost:false,target:false,cock:false,mouse:false,mx:0,my:0,start:false,u:false,d:false,l:false,r:false,ok:false,back:false,src:'none'};
  const nowt=performance.now();
  if(MOUSE.on&&nowt-CTLM.ar>600){const dx=(MOUSE.x-W/2)/(H*.4),dy=(MOUSE.y-H*.46)/(H*.4);o.mx=MOUSE.x;o.my=MOUSE.y;o.mouse=true;o.yaw=clamp(dz(dx,.05),-1,1);o.pitch=-clamp(dz(dy,.05),-1,1);o.src='mouse';if(MOUSE.l)o.fire=true;if(MOUSE.r)o.missile=true;}
  let kx=0,ky=0;if(K('ArrowLeft'))kx-=1;if(K('ArrowRight'))kx+=1;if(K('ArrowUp'))ky+=1;if(K('ArrowDown'))ky-=1;
  if(kx||ky){o.yaw=kx;o.pitch=ky;o.mouse=false;o.src='keys';}
  if(K('KeyA')||K('KeyQ'))o.roll-=1;if(K('KeyD')||K('KeyE'))o.roll+=1;if(K('KeyW'))o.thr+=1;if(K('KeyS'))o.thr-=1;
  if(K('Space')||K('KeyJ'))o.fire=true;if(K('KeyF')||K('KeyK'))o.missile=true;if(K('ShiftLeft')||K('ShiftRight')||K('KeyL'))o.boost=true;
  if(LATCH.has('KeyT')||LATCH.has('Tab'))o.target=true;if(LATCH.has('KeyC'))o.cock=true;
  if(TS.on&&(TS.sx||TS.sy)){o.yaw=TS.sx;o.pitch=-TS.sy;o.mouse=false;o.src='touch';}
  if(TS.F)o.fire=true;if(TS.M)o.missile=true;if(TS.B)o.boost=true;
  for(const p of pads()){
    const b=k=>!!(p.buttons[k]&&p.buttons[k].pressed),lx=p.axes[0]||0,ly=p.axes[1]||0,rx=p.axes[2]||0,ry=p.axes[3]||0;
    if(Math.hypot(lx,ly)>.15){o.yaw=dz(lx,.12);o.pitch=-dz(ly,.12);o.mouse=false;o.src='pad';}
    if(Math.abs(rx)>.2)o.roll=dz(rx,.18);if(Math.abs(ry)>.25)o.thr=-dz(ry,.2);
    if(b(7)||b(0))o.fire=true;if(b(5)||b(1))o.missile=true;if(b(4)||b(6)||b(2))o.boost=true;if(b(3))o.target=true;if(b(9))o.start=true;
    if(b(12))o.u=true;if(b(13))o.d=true;if(b(14))o.l=true;if(b(15))o.r=true;if(b(0))o.ok=true;if(b(1))o.back=true;
  }
  if(INVERT&&o.src!=='mouse')o.pitch=-o.pitch;
  o.u=o.u||K('ArrowUp')||K('KeyW')||(o.src==='touch'&&TS.sy<-.5);o.d=o.d||K('ArrowDown')||K('KeyS')||(o.src==='touch'&&TS.sy>.5);
  o.l=o.l||K('ArrowLeft')||K('KeyA');o.r=o.r||K('ArrowRight')||K('KeyD');
  o.ok=o.ok||K('Enter')||K('Space')||K('KeyJ');o.back=o.back||K('Escape');o.start=o.start||K('Enter');
  return o;
}
function endInputFrame(){LATCH.clear();MOUSE.lp=MOUSE.rp=false;}
