/* ===================== arena: the same layout as the original (same seeds), collision and line of sight =====================
   World units are metres. x runs east, y runs south, z is up. The 3D scene maps world (x,y,z) to three.js (x,z,y). */
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
  const Wd={th,props:[],lamps:[],gates:[],seed:seed||7,grid:null,GW:Math.ceil(WW/2),GH:Math.ceil(WH/2)};
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
  /* the docks' buildings each carry a neon sign that lights the ground in front of them */
  if(th.id==='docks')for(const p of Wd.props)if(p.kind==='bldg'&&!p.neon){const L={kind:'neon',cx:(p.x0+p.x1)/2,cy:p.y1+1.2,rad:4.5,col:p.c%2?[1,.25,.6]:[.2,.9,1],dead:false};p.neon=L;Wd.lamps.push(L);}
  WORLD=Wd;buildGrid();
  ARENA.build(Wd);
  return Wd;
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
/* ---------- marks left on the ground and on broken props (drawn by the 3D arena) ---------- */
function scorch(wx,wy,rad,k){FX.scorch(wx,wy,rad,k);}
function rubble(p){ARENA.wreck(p);scorch((p.x0+p.x1)/2,(p.y0+p.y1)/2,Math.max(p.x1-p.x0,p.y1-p.y0)*.55,.35);}
