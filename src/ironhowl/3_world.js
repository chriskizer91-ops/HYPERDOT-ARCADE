/* ===================== arena: baked ground albedo + baked lamp light + destructible props ===================== */
const WW=60,WH=38,IN0=3,INX=WW-3,INY=WH-3;
const THEMES={
  yard:{id:'yard',name:'FOUNDRY YARD',where:'SECTOR 4 SALVAGE YARD, DUSK',amb:[.33,.32,.44],g0:[78,73,66],g1:[88,82,74],seam:'#2c2925',paint:'#e2a420',paint2:'#e6e2da',out:'#0c0a08',
    wallT:'#5c5248',wallF:'#3a322c',bT:['#4c505a','#5a4e44','#44504a'],bF:['#2a2e36','#382e28','#283230'],win:[255,196,110],cont:['#a8402a','#2a5a8a','#4a7a3a','#c08a2a','#7a3a6a'],lamp:[1.05,.78,.46],music:'yard',rim:[255,170,90]},
  docks:{id:'docks',name:'NEON DOCKS',where:'HARBOR 9, MIDNIGHT',amb:[.3,.32,.5],g0:[46,50,60],g1:[54,58,70],seam:'#181b22',paint:'#2fe6ff',paint2:'#ff3fa4',out:'#03070e',water:1,
    wallT:'#3a404c',wallF:'#22262e',bT:['#2c3040','#32283a','#243238'],bF:['#181c28','#20182a','#142026'],win:[120,220,255],cont:['#d03a6a','#2a8ac0','#e0a020','#3a3a48','#2ab08a'],lamp:[.55,.85,1.1],music:'docks',rim:[90,200,255]}
};
let WORLD=null;
function newWorld(themeId,seed){
  const th=THEMES[themeId],r=mulberry(seed||7);
  const Wd={th,props:[],lamps:[],gates:[],seed:seed||7,AW:0,AH:0,ALB:null,SL:null,grid:null,GW:Math.ceil(WW/2),GH:Math.ceil(WH/2)};
  const add=(kind,x0,y0,x1,y1,h,o={})=>{const p=Object.assign({kind,x0,y0,x1,y1,h,hp:9999,max:9999,dead:false,seed:r(),hit:0},o);p.max=p.hp;Wd.props.push(p);return p;};
  const free=(x0,y0,x1,y1,pad=1.3)=>{if(x0<IN0+.4||y0<IN0+.4||x1>INX-.4||y1>INY-.4)return false;const cx=WW/2,cy=WH/2;if(x1>cx-6&&x0<cx+6&&y1>cy-4.5&&y0<cy+4.5)return false;
    for(const p of Wd.props){if(x1+pad>p.x0&&x0-pad<p.x1&&y1+pad>p.y0&&y0-pad<p.y1)return false;}for(const gt of Wd.gates)if(Math.hypot((x0+x1)/2-gt.x,(y0+y1)/2-gt.y)<5)return false;return true;};
  Wd.gates=[{x:WW/2,y:IN0-.5,dx:0,dy:1},{x:WW/2,y:INY+.5,dx:0,dy:-1},{x:IN0-.5,y:WH/2,dx:1,dy:0},{x:INX+.5,y:WH/2,dx:-1,dy:0}];
  const gw=2.4;
  add('wall',IN0-1,IN0-1,WW/2-gw,IN0,2.8);add('wall',WW/2+gw,IN0-1,INX+1,IN0,2.8);
  add('wall',IN0-1,INY,WW/2-gw,INY+1,1.4);add('wall',WW/2+gw,INY,INX+1,INY+1,1.4);
  add('wall',IN0-1,IN0,IN0,WH/2-gw,2.8);add('wall',IN0-1,WH/2+gw,IN0,INY,2.8);
  add('wall',INX,IN0,INX+1,WH/2-gw,2.8);add('wall',INX,WH/2+gw,INX+1,INY,2.8);
  for(let x=1;x<WW-6;x+=6+r()*4){const w=4+r()*5,h=6+r()*9;add('sky',x,-1.5,Math.min(WW-1,x+w),IN0-1.2,h,{c:r()});}
  const quads=[[IN0+3,IN0+2.5],[INX-12,IN0+2.5],[IN0+3,INY-9],[INX-12,INY-9]];
  for(const [qx,qy] of quads){for(let k=0;k<20;k++){const w=6+r()*3.5,d=4+r()*2.5,x=qx+r()*3,y=qy+r()*2.5;if(free(x,y,x+w,y+d,2)){add('bldg',x,y,x+w,y+d,4.2+r()*3,{c:(r()*3)|0});break;}}}
  for(let n=0,k=0;n<8&&k<300;k++){const horiz=r()<.6,w=horiz?6:2.5,d=horiz?2.5:6,x=IN0+2+r()*(INX-IN0-4-w),y=IN0+2+r()*(INY-IN0-4-d);
    if(free(x,y,x+w,y+d)){const c=(r()*5)|0;add('cont',x,y,x+w,y+d,2.6,{hp:300,c});n++;if(r()<.5&&horiz&&free(x,y+d+.05,x+w,y+2*d+.05,.0)){add('cont',x,y+d+.05,x+w,y+2*d+.05,2.6,{hp:300,c:(c+1)%5});}}}
  for(let n=0,k=0;n<8&&k<300;k++){const horiz=r()<.5,w=horiz?2.2:.7,d=horiz?.7:2.2,x=IN0+2+r()*(INX-IN0-4),y=IN0+2+r()*(INY-IN0-4);if(free(x,y,x+w,y+d,1.6)){add('barrier',x,y,x+w,y+d,.95,{hp:160});n++;}}
  for(let n=0,k=0;n<7&&k<300;k++){const x=IN0+2+r()*(INX-IN0-6),y=IN0+2+r()*(INY-IN0-6);if(!free(x,y,x+2.6,y+2.6,1.2))continue;const c=1+(r()*4|0);
    for(let i=0;i<c;i++){const cx=x+(i%2)*1.25,cy=y+((i/2)|0)*1.25;add('crate',cx,cy,cx+1.15,cy+1.15,1.1,{hp:45});}n++;}
  for(let n=0,k=0;n<14&&k<400;k++){const x=IN0+2+r()*(INX-IN0-4),y=IN0+2+r()*(INY-IN0-4);if(!free(x-.5,y-.5,x+.5,y+.5,.9))continue;add('barrel',x-.45,y-.45,x+.45,y+.45,1.05,{hp:22,cyl:1,cx:x,cy:y,rad:.45,c:r()<.75?0:1});n++;}
  for(let n=0,k=0;n<12&&k<400;k++){const x=IN0+2+r()*(INX-IN0-4),y=IN0+2+r()*(INY-IN0-4);if(!free(x-.25,y-.25,x+.25,y+.25,2.6))continue;const L=add('lamp',x-.18,y-.18,x+.18,y+.18,4.2,{hp:30,cx:x,cy:y});Wd.lamps.push(L);n++;}
  for(const gt of Wd.gates){const L={kind:'glamp',cx:gt.x+(gt.dx?0:3.2),cy:gt.y+(gt.dy?0:3.2),gate:1,dead:false};Wd.lamps.push(L);const L2={kind:'glamp',cx:gt.x-(gt.dx?0:3.2),cy:gt.y-(gt.dy?0:3.2),gate:1,dead:false};Wd.lamps.push(L2);}
  WORLD=Wd;bakeWorld();buildGrid();
  return Wd;
}
/* ---------- bake ---------- */
function bakeWorld(){
  const Wd=WORLD,th=Wd.th,r=mulberry(Wd.seed*3+1);
  Wd.AW=Math.ceil(WW*S);Wd.AH=Math.ceil(WH*S*KY);
  const [c,x]=(()=>{const c=document.createElement('canvas');c.width=Wd.AW;c.height=Wd.AH;return [c,c.getContext('2d',{willReadFrequently:true})];})();
  const gx=v=>v*S,gy=v=>v*S*KY;
  x.fillStyle=th.out;x.fillRect(0,0,Wd.AW,Wd.AH);
  if(th.water){x.fillStyle='#061a2c';x.fillRect(0,gy(INY+1),Wd.AW,Wd.AH);}
  x.fillStyle=rgba(th.g0);x.fillRect(gx(IN0-1),gy(IN0-1),gx(INX-IN0+2),gy(INY-IN0+2));
  for(let sx=IN0;sx<INX;sx+=3)for(let sy=IN0;sy<INY;sy+=3){if(r()<.5){x.fillStyle=rgba(mixC(th.g0,th.g1,r()));x.fillRect(gx(sx),gy(sy),gx(3),gy(3));}}
  x.strokeStyle=th.seam;x.lineWidth=1;for(let v=IN0;v<=INX;v+=3){x.beginPath();x.moveTo(Math.round(gx(v))+.5,gy(IN0));x.lineTo(Math.round(gx(v))+.5,gy(INY));x.stroke();}
  for(let v=IN0;v<=INY;v+=3){x.beginPath();x.moveTo(gx(IN0),Math.round(gy(v))+.5);x.lineTo(gx(INX),Math.round(gy(v))+.5);x.stroke();}
  for(let i=0;i<28;i++){x.fillStyle=`rgba(0,0,0,${.12+r()*.18})`;x.beginPath();x.ellipse(gx(IN0+r()*(INX-IN0)),gy(IN0+r()*(INY-IN0)),gx(.4+r()*1.6),gy(.3+r()*1.1),r()*3,0,TAU);x.fill();}
  x.strokeStyle='rgba(0,0,0,.35)';for(let i=0;i<30;i++){let px=gx(IN0+r()*(INX-IN0)),py=gy(IN0+r()*(INY-IN0));x.beginPath();x.moveTo(px,py);for(let k=0;k<6;k++){px+=(r()-.5)*gx(1.4);py+=(r()-.5)*gy(1.4);x.lineTo(px,py);}x.stroke();}
  if(th.water)for(let i=0;i<10;i++){x.fillStyle='rgba(40,80,140,.25)';x.beginPath();x.ellipse(gx(IN0+r()*(INX-IN0)),gy(IN0+r()*(INY-IN0)),gx(.8+r()*1.8),gy(.4+r()*.9),0,0,TAU);x.fill();}
  const cx=gx(WW/2),cy=gy(WH/2);x.strokeStyle=th.paint;x.lineWidth=Math.max(1,S*.12);x.beginPath();x.ellipse(cx,cy,gx(4.2),gy(4.2),0,0,TAU);x.stroke();
  x.lineWidth=Math.max(1,S*.06);x.beginPath();x.ellipse(cx,cy,gx(3.7),gy(3.7),0,0,TAU);x.stroke();
  x.fillStyle=th.paint2;const hw=gx(.25),hh=gy(1.4);x.fillRect(cx-gx(.9),cy-hh,hw*2,hh*2);x.fillRect(cx+gx(.9)-hw*2,cy-hh,hw*2,hh*2);x.fillRect(cx-gx(.9),cy-gy(.22),gx(1.8),gy(.44));
  x.fillStyle=th.paint;for(let v=IN0+2;v<INX-2;v+=2.4){if(Math.abs(v-WW/2)<5)continue;x.fillRect(gx(v),gy(WH/2)-1,gx(1.2),Math.max(1,gy(.12)));}
  for(let v=IN0+2;v<INY-2;v+=2.4){if(Math.abs(v-WH/2)<5)continue;x.fillRect(gx(WW/2)-1,gy(v),Math.max(1,gx(.12)),gy(1.2));}
  for(const gt of Wd.gates){const L=gt.dy?[gt.x-2.4,gt.y-.5,4.8,1]:[gt.x-.5,gt.y-2.4,1,4.8];for(let i=0;i<8;i++){x.fillStyle=i%2?'#151210':th.paint;if(gt.dy)x.fillRect(gx(L[0]+i*.6),gy(L[1]),gx(.6),gy(L[3]));else x.fillRect(gx(L[0]),gy(L[1]+i*.6),gx(L[2]),gy(.6));}}
  for(const p of Wd.props){if(p.kind==='sky'||p.kind==='lamp')continue;x.fillStyle='rgba(0,0,0,.5)';x.fillRect(gx(p.x0-.25),gy(p.y0-.15),gx(p.x1-p.x0+.5),gy(p.y1-p.y0+.45));
    x.fillStyle='rgba(0,0,0,.35)';x.fillRect(gx(p.x0-.5),gy(p.y0-.3),gx(p.x1-p.x0+1),gy(p.y1-p.y0+.9));}
  const img=x.getImageData(0,0,Wd.AW,Wd.AH),d=new Uint32Array(img.data.buffer),n=d.length;
  for(let i=0;i<n;i++){const v=d[i],k=.9+r()*.2;d[i]=pack((v&255)*k,((v>>>8)&255)*k,((v>>>16)&255)*k);}
  if(th.water){for(let y=Math.floor(gy(INY+1));y<Wd.AH;y++)for(let xx=0;xx<Wd.AW;xx++)if(r()<.006)d[y*Wd.AW+xx]=pack(90,140,200);}
  Wd.ALB=new Uint32Array(d);
  Wd.SL=new Uint8ClampedArray(Wd.AW*Wd.AH*3);
  if(th.id==='docks')for(const p of Wd.props)if(p.kind==='bldg'&&!p.neon){const L={kind:'neon',cx:(p.x0+p.x1)/2,cy:p.y1+1.2,rad:4.5,col:p.c%2?[1,.25,.6]:[.2,.9,1],dead:false};p.neon=L;Wd.lamps.push(L);}
  for(const L of Wd.lamps)if(!L.dead)bakeLamp(L,1);
  for(const p of Wd.props)if(p.dead)rubble(p);
}
function bakeLamp(L,sign){
  const Wd=WORLD,th=Wd.th,col=L.col||(L.gate?[1.1,.2,.15]:th.lamp),rad=L.rad||(L.gate?3.2:7.5),k=(L.gate?.9:1.25)*sign*100;
  const sx=L.cx*S,sy=L.cy*S*KY,rx=rad*S,ry=rad*S*KY,AW=Wd.AW,AH=Wd.AH,SL=Wd.SL;
  const x0=Math.max(0,Math.floor(sx-rx)),x1=Math.min(AW-1,Math.ceil(sx+rx)),y0=Math.max(0,Math.floor(sy-ry)),y1=Math.min(AH-1,Math.ceil(sy+ry));
  for(let y=y0;y<=y1;y++){const dy=(y-sy)/ry;for(let x=x0;x<=x1;x++){const dx=(x-sx)/rx,d2=dx*dx+dy*dy;if(d2>=1)continue;const f=Math.pow(1-d2,1.6),i=(y*AW+x)*3;SL[i]+=col[0]*f*k;SL[i+1]+=col[1]*f*k;SL[i+2]+=col[2]*f*k;}}
}
/* ---------- spatial grid ---------- */
function buildGrid(){const Wd=WORLD;Wd.grid=Array.from({length:Wd.GW*Wd.GH},()=>[]);
  for(const p of Wd.props){if(p.kind==='sky')continue;const a=Math.max(0,Math.floor(p.x0/2)),b=Math.min(Wd.GW-1,Math.floor(p.x1/2)),c=Math.max(0,Math.floor(p.y0/2)),d=Math.min(Wd.GH-1,Math.floor(p.y1/2));
    for(let gy=c;gy<=d;gy++)for(let gx=a;gx<=b;gx++)Wd.grid[gy*Wd.GW+gx].push(p);}}
function propsNear(x,y){const Wd=WORLD,gx=Math.floor(x/2),gy=Math.floor(y/2);if(gx<0||gy<0||gx>=Wd.GW||gy>=Wd.GH)return [];return Wd.grid[gy*Wd.GW+gx];}
function propAt(x,y,z,pad){
  const L=propsNear(x,y);for(const p of L){if(p.dead||p.h<=z)continue;
    if(p.cyl){const dx=x-p.cx,dy=y-p.cy,rr=p.rad+(pad||0);if(dx*dx+dy*dy<rr*rr)return p;}
    else if(x>p.x0-(pad||0)&&x<p.x1+(pad||0)&&y>p.y0-(pad||0)&&y<p.y1+(pad||0))return p;}
  return null;
}
function pushOut(u){
  const r=u.r;
  for(let it=0;it<2;it++)for(const p of propsNear(u.x,u.y).concat(propsNear(u.x+r,u.y),propsNear(u.x-r,u.y),propsNear(u.x,u.y+r),propsNear(u.x,u.y-r))){
    if(p.dead||p.h<.5||p.kind==='lamp'&&r<.6)continue;
    if(p.cyl){const dx=u.x-p.cx,dy=u.y-p.cy,d=Math.hypot(dx,dy),rr=p.rad+r;if(d<rr&&d>1e-4){u.x=p.cx+dx/d*rr;u.y=p.cy+dy/d*rr;u.bumped=p;}continue;}
    const cx=clamp(u.x,p.x0,p.x1),cy=clamp(u.y,p.y0,p.y1),dx=u.x-cx,dy=u.y-cy,d2=dx*dx+dy*dy;
    if(d2<r*r){if(d2>1e-8){const d=Math.sqrt(d2);u.x=cx+dx/d*r;u.y=cy+dy/d*r;}else{const pen=[u.x-p.x0,p.x1-u.x,u.y-p.y0,p.y1-u.y],m=Math.min(...pen);if(m===pen[0])u.x=p.x0-r;else if(m===pen[1])u.x=p.x1+r;else if(m===pen[2])u.y=p.y0-r;else u.y=p.y1+r;}u.bumped=p;}
  }
  u.x=clamp(u.x,IN0+r,INX-r);u.y=clamp(u.y,IN0+r,INY-r);
}
function losClear(x0,y0,x1,y1){const d=Math.hypot(x1-x0,y1-y0),n=Math.ceil(d/.6);for(let i=1;i<n;i++){const t=i/n;if(propAt(x0+(x1-x0)*t,y0+(y1-y0)*t,1.6))return false;}return true;}
/* ---------- decals burned into the ground ---------- */
function scorch(wx,wy,rad,k){
  const Wd=WORLD,AW=Wd.AW,AH=Wd.AH,A=Wd.ALB,sx=wx*S,sy=wy*S*KY,rx=rad*S,ry=rad*S*KY,r=Math.random;
  const x0=Math.max(0,Math.floor(sx-rx)),x1=Math.min(AW-1,Math.ceil(sx+rx)),y0=Math.max(0,Math.floor(sy-ry)),y1=Math.min(AH-1,Math.ceil(sy+ry));
  for(let y=y0;y<=y1;y++){const dy=(y-sy)/ry;for(let x=x0;x<=x1;x++){const dx=(x-sx)/rx,d2=dx*dx+dy*dy;if(d2>=1)continue;if(d2>.6&&r()<.5)continue;const i=y*AW+x,c=A[i],f=lerp(1-(k||.65),1,Math.pow(d2,.7))*(.85+r()*.2);
    A[i]=pack((c&255)*f,((c>>>8)&255)*f,((c>>>16)&255)*f);}}
}
function rubble(p){const r=Math.random;for(let i=0;i<40;i++){const x=p.x0+r()*(p.x1-p.x0),y=p.y0+r()*(p.y1-p.y0),Wd=WORLD,ax=Math.round(x*S),ay=Math.round(y*S*KY);if(ax>=0&&ay>=0&&ax<Wd.AW&&ay<Wd.AH){const c=p.kind==='crate'?pack(110,80,50):p.kind==='cont'?hexP(WORLD.th.cont[p.c]):pack(120,118,112);Wd.ALB[ay*Wd.AW+ax]=shade(c,.5+r()*.4);}}scorch((p.x0+p.x1)/2,(p.y0+p.y1)/2,Math.max(p.x1-p.x0,p.y1-p.y0)*.55,.35);}
/* ---------- drawing props ---------- */
const PR={};
function pc(h){return PR[h]||(PR[h]=hexP(h));}
function drawProp(p){
  if(p.dead)return;const th=WORLD.th;
  if(p.cyl){drawBarrel(p);return;}
  if(p.kind==='lamp'){drawLamp(p);return;}
  const sx0=PX(p.x0),sx1=PX(p.x1),ty0=PY(p.y0,p.h),ty1=PY(p.y1,p.h),gy1=PY(p.y1,0);
  if(sx1<0||sx0>W||ty0>H||gy1<0)return;
  let top,front;
  switch(p.kind){
    case 'wall':top=pc(th.wallT);front=pc(th.wallF);break;
    case 'sky':top=shade(pc(th.bT[0]),.55);front=shade(pc(th.bF[0]),.6);break;
    case 'bldg':top=pc(th.bT[p.c%3]);front=pc(th.bF[p.c%3]);break;
    case 'cont':top=shade(pc(th.cont[p.c]),1.05);front=shade(pc(th.cont[p.c]),.7);break;
    case 'crate':top=pack(150,110,66);front=pack(108,76,44);break;
    case 'barrier':top=pack(150,148,140);front=pack(108,106,100);break;
    default:top=pack(120,120,120);front=pack(80,80,80);
  }
  const dmg=p.max<9999&&p.hp<p.max*.5;
  if(p.hit>0){top=shade(top,1.6);front=shade(front,1.6);p.hit--;}
  fillR(sx0,ty0,sx1,ty1,top);fillR(sx0,ty1,sx1,gy1,front);
  const E=OUTLINE;
  fillR(sx0,ty1,sx1,ty1+1,shade(top,1.35));fillR(sx0-1,ty0,sx0,gy1,E);fillR(sx1,ty0,sx1+1,gy1,E);fillR(sx0,ty0-1,sx1,ty0,E);fillR(sx0,gy1,sx1,gy1+1,E);
  const fw=sx1-sx0,fh=gy1-ty1,r=mulberry((p.seed*1e6)|0);
  switch(p.kind){
    case 'bldg':case 'sky':{
      const wc=th.win,s=Math.max(2,Math.round(S*.35)),lit=pack(wc[0],wc[1],wc[2]),dark=shade(front,.7);
      for(let y=ty1+s;y<gy1-s;y+=s*1.6)for(let x=sx0+s;x<sx1-s;x+=s*1.4){const on=r()<(p.kind==='sky'?.35:.45);fillR(x,y,x+Math.max(1,s*.7),y+Math.max(1,s*.8),on?lit:dark,on);}
      if(p.kind==='bldg'){fillR(sx0+fw*.42,gy1-fh*.35,sx0+fw*.58,gy1,shade(front,.5));
        for(let i=0;i<3;i++){const vx=sx0+fw*(.15+r()*.7),vy=ty0+(ty1-ty0)*(.2+r()*.5),vw=S*(.6+r()*.6);fillR(vx,vy,vx+vw,vy+vw*.6,shade(top,.75));fillR(vx,vy+vw*.6,vx+vw,vy+vw*.6+Math.max(1,S*.25),shade(top,.5));}
        fillR(sx0,ty0,sx1,ty0+Math.max(1,S*.12),shade(top,1.2));
        if(p.neon){const nc=p.neon.col,col=pack(nc[0]*255,nc[1]*255,nc[2]*255),on=((FRAME>>3)+p.c)%11!==0;fillR(sx0+fw*.15,ty1+fh*.12,sx1-fw*.15,ty1+fh*.12+Math.max(1,S*.14),on?col:shade(col,.3),on);}}
      break;}
    case 'cont':{const dk=shade(front,.72);for(let x=sx0+2;x<sx1-1;x+=3)fillR(x,ty1+1,x+1,gy1,dk);const tk=shade(top,.86);for(let x=sx0+2;x<sx1-1;x+=Math.max(3,S*.5))fillR(x,ty0,x+1,ty1,tk);
      fillR(sx0+fw*.06,ty1+fh*.2,sx0+fw*.08+1,gy1-fh*.1,shade(front,1.3));if(dmg){for(let i=0;i<5;i++){const x=sx0+r()*fw,y=ty1+r()*fh;fillR(x,y,x+2,y+2,shade(front,.35));}}break;}
    case 'crate':{const dk=shade(front,.7);fillR(sx0,ty1+fh*.48,sx1,ty1+fh*.52+1,dk);fillR(sx0+fw*.48,ty0,sx0+fw*.52+1,ty1,shade(top,.75));fillR(sx0,ty0+(ty1-ty0)*.48,sx1,ty0+(ty1-ty0)*.52+1,shade(top,.75));if(dmg)fillR(sx0+fw*.2,ty1+2,sx0+fw*.35,gy1-1,shade(front,.4));break;}
    case 'barrier':{for(let x=sx0,i=0;x<sx1;x+=Math.max(2,S*.4),i++)fillR(x,ty1+fh*.35,x+Math.max(1,S*.2),ty1+fh*.7,i%2?pack(230,170,30):pack(30,26,22));break;}
    case 'wall':{const dk=shade(front,.75);for(let x=sx0+S;x<sx1;x+=S*3)fillR(x,ty1,x+1,gy1,dk);if(p.h>2){for(let x=sx0+S*1.5;x<sx1;x+=S*6){const on=((FRAME>>4)+(x|0))%3===0;fillR(x,ty1+2,x+2,ty1+4,on?pack(255,60,40):pack(70,20,16),on);}}break;}
  }
}
function drawBarrel(p){
  const sx=PX(p.cx),gy=PY(p.cy,0),ty=PY(p.cy,p.h),rx=p.rad*S,ry=rx*KY;
  if(sx<-rx||sx>W+rx||ty>H+ry||gy<-ry)return;
  const base=p.c?pack(40,120,200):pack(200,46,30),hit=p.hit>0;if(hit)p.hit--;
  for(let y=Math.floor(ty);y<gy;y++){for(let x=Math.floor(sx-rx);x<Math.ceil(sx+rx);x++){const u=(x+.5-sx)/rx,k=hit?1.7:(.55+.45*Math.cos(u*1.3+.5));if(x>=0&&x<W&&y>=0&&y<H){const i=y*W+x;RBUF[i]=shade(base,k);EM[i]=0;}}}
  fillR(sx-rx,ty+(gy-ty)*.3,sx+rx,ty+(gy-ty)*.3+1,shade(base,.45));fillR(sx-rx,ty+(gy-ty)*.7,sx+rx,ty+(gy-ty)*.7+1,shade(base,.45));
  fillEll(sx,ty,rx,ry,shade(base,1.25));fillEll(sx,ty,rx*.55,ry*.55,shade(base,.8));
  if(!p.c){fillR(sx-rx*.35,ty+(gy-ty)*.4,sx+rx*.35,ty+(gy-ty)*.62,pack(255,210,40));}
}
function drawLamp(p){
  const sx=PX(p.cx),gy=PY(p.cy,0),ty=PY(p.cy,p.h);if(sx<-20||sx>W+20||ty>H||gy<0)return;
  fillR(sx-1,ty,sx+1,gy,pack(70,72,78));fillEll(sx,gy,S*.25,S*.25*KY,pack(50,52,56));
  const hx=sx+S*.45;fillR(sx,ty,hx,ty+1,pack(70,72,78));const lc=WORLD.th.lamp;fillR(hx-S*.22,ty,hx+S*.22,ty+Math.max(2,S*.14),pack(lc[0]*240,lc[1]*240,lc[2]*240),1);
}
