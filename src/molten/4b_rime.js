/* =====================================================================================
   THE RIME — creatures of living ice. They are sprites, but they live in the simulation:
   they read the heat of the cells they stand in, chill them (so lava crusts under a
   Rimeback's feet and pools freeze into bridges), dig through the iron you pour, and
   when they die they come apart into water and ice that fall back into the grid.
   ===================================================================================== */
/* palette: [r,g,b,a]; a=255 is lit by the scene, smaller a glows by itself (a/254 x 6) */
const PAL={o:[18,44,88,255],b:[74,152,214,255],c:[150,214,246,255],w:[226,248,255,12],s:[205,240,255,14],k:[12,28,58,255],e:[130,250,255,62],
  g:[60,180,255,30],G:[150,235,255,72],d:[160,162,178,255],D:[66,66,80,255],'*':[150,225,255,112],'|':[78,62,86,255],r:[255,120,90,60]};
const sprite=rows=>({w:rows[0].length,h:rows.length,rows});
const SPRS={
  shard:[sprite(['...s.s...','..swsws..','.ocwcwco.','occbbbeeo','obbbbbbbo','.okkbkko.','.o.o.o.o.']),
         sprite(['...s.s...','..swsws..','.ocwcwco.','occbbbeeo','obbbbbbbo','.okkbkko.','o.o...o.o'])],
  rime:[sprite(['....s..s..s.....','...sws.sws.s....','..osccwcccwso...','.occcbbbbbbcco..','ocbbbbbbbbbbbcoo','obbbbbbbbbbbbbeo',
                'obbbkbbbbbkbbeeo','obbbbbbbbbbbbbbo','.okbbbbbbbbbbko.','..okkkbbbbkkko..','..oo.oo..oo.oo..','..oo.oo..oo.oo..']),
        sprite(['....s..s..s.....','...sws.sws.s....','..osccwcccwso...','.occcbbbbbbcco..','ocbbbbbbbbbbbcoo','obbbbbbbbbbbbbeo',
                'obbbkbbbbbkbbeeo','obbbbbbbbbbbbbbo','.okbbbbbbbbbbko.','..okkkbbbbkkko..','.oo..oo..oo..oo.','.oo...oo..oo..o.'])],
  borer:[sprite(['..oooooo....','.obcbbcbbod.','obbbbbbbeddd','okbbbbbbbbDd','obbbbbbbbddd','.obcbbcbbod.','..oooooo....']),
         sprite(['..oooooo....','.obcbbcbboD.','obbbbbbbeDdD','okbbbbbbbbdD','obbbbbbbbDdD','.obcbbcbboD.','..oooooo....'])],
  wisp:[sprite(['..ggg..','.gGGGg.','gGkGkGg','gGGwGGg','.gGGGg.','..gGg..','.g.g.g.','g..g..g']),
        sprite(['..ggg..','.gGGGg.','gGkGkGg','gGGwGGg','.gGGGg.','..gGg..','..ggg..','.g...g.'])],
  caller:[sprite(['.......*.','..ooo.***','.occco.*.','.ocwcco|.','.okeeko|.','..occo.|.','.occccoo|','occbbbcco','ocbbbbbo|','obbbbbbo|','obbbbbbo|','.obbbbo.|','.oo..oo..']),
          sprite(['.......*.','..ooo.***','.occco.*.','.ocwcco|.','.okeeko|.','..occo.|.','.occccoo|','occbbbcco','ocbbbbbo|','obbbbbbo|','obbbbbbo|','.obbbbo.|','..oo.oo..'])]
};
const ETYPES={
  shard: {w:9, h:7, hp:1,  sp:17, climb:2,chill:150,aura:0, ach:0,  drain:1.6,dig:3.2,score:100,res:1},
  rime:  {w:16,h:12,hp:7,  sp:6.5,climb:3,chill:360,aura:8, ach:170,drain:4.5,dig:2.6,score:600,res:.3},
  borer: {w:12,h:7, hp:2.4,sp:8,  climb:3,chill:240,aura:0, ach:0,  drain:4,  dig:3,  score:400,res:.7},
  wisp:  {w:7, h:8, hp:.5, sp:34, climb:0,chill:0,  aura:0, ach:0,  drain:0,  dig:0,  score:250,res:1,fly:1},
  caller:{w:9, h:13,hp:2.6,sp:9,  climb:2,chill:120,aura:0, ach:0,  drain:2.5,dig:1,  score:500,res:.8}
};
const EN=[];let EID=0;
const EGW=W>>2,EGH=H>>2,EGRID=new Int16Array(EGW*EGH);
function bbox(e){const D=e.D;e.x0=Math.round(e.x-D.w/2);e.x1=e.x0+D.w-1;if(D.fly){e.y0=Math.round(e.yc-D.h/2);e.y1=e.y0+D.h-1;}else{e.y1=Math.round(e.y);e.y0=e.y1-D.h+1;}}
function spawnEnemy(type,side,tun){
  if(type==='KING'){bossSpawn();return null;}
  const D=ETYPES[type],e={t:type,D,id:EID++,hp:D.hp,dir:side<0?1:-1,vx:0,vy:0,acc:0,fall:0,anim:Math.random()*4,state:'walk',dig:0,latched:false,hurt:0,
    inRock:false,quiet:0,blockT:0,climbing:false,climbAcc:0,bestD:1e9,stall:0,rage:false,casts:0,cast:2+Math.random()*1.5,summon:9,perch:30+Math.random()*50,walked:0,turnT:0,drip:0,src:'',x:0,y:0,yc:0,x0:0,x1:0,y0:0,y1:0};
  const ts=TUN.filter(t=>t.side===side);const tt=ts.length?ts[Math.min(tun,ts.length-1)]:TUN[0];
  if(type==='borer'){e.x=side<0?16:W-17;e.y=e.yc=H-7;e.inRock=true;e.dir=side<0?1:-1;}
  else{e.x=tt.x+(side<0?D.w/2:-D.w/2);e.y=tt.y;e.yc=tt.y-D.h/2;}
  bbox(e);EN.push(e);return e;
}
/* is there a clear fall from the gallery to (x,y)? rock and bedrock block it; a crust of cast iron does not */
function openAbove(x,y){if(x<1||x>W-2)return false;for(let yy=GAL;yy<=y;yy++){const m=M[yy*W+x];if(m===ROCK||m===BED||m===CRYST)return false;}return true;}
function solidAt(x,y){if(x<0||x>=W||y<0||y>=H)return true;const k=KIND[M[y*W+x]];return k===1||k===2;}
function grounded(e){const y=e.y1+1;for(let x=e.x0;x<=e.x1;x++)if(solidAt(x,y))return true;return false;}
function stepX(e,dir){
  const cx=dir>0?e.x1+1:e.x0-1;if(cx<1||cx>W-2)return 0;let need=0;
  for(let r=0;r<e.D.h;r++){if(solidAt(cx,e.y1-r)){if(r<e.D.climb)need=r+1;else return 0;}}
  if(need>0)for(let yy=e.y0-need;yy<e.y0;yy++)for(let x=e.x0+dir;x<=e.x1+dir;x++)if(solidAt(x,yy))return 0;
  e.x+=dir;e.y-=need;bbox(e);e.walked++;return 1;
}
const DIGGABLE=new Uint8Array(16);DIGGABLE[IRON]=1;DIGGABLE[SLAG]=1;DIGGABLE[ICE]=1;DIGGABLE[SNOW]=1;DIGGABLE[RUBBLE]=1;DIGGABLE[ROCK]=2;DIGGABLE[CRYST]=2;
function digFront(e){
  const cx=e.dir>0?e.x1+1:e.x0-1;let dug=0;const n=e.t==='rime'?4:1;
  for(let r=0;r<e.D.h&&dug<n;r++){const y=e.y1-r,i=y*W+cx,m=M[i];if(KIND[m]!==1&&KIND[m]!==2)continue;
    const dg=DIGGABLE[m];if(!dg)return dug>0;if(dg===2&&e.blockT<2&&(r32()&3)!==0)return true;
    spawnP(cx+.5,y+.5,-e.dir*rnd(20,70),rnd(-90,-30),m===ICE||m===SNOW?WATER:RUBBLE,m===ICE||m===SNOW?2:T[i],9,0);M[i]=AIR;L[i]=0;wake(cx,y);EV.dig=(EV.dig||0)+1;dug++;}
  /* clear a cell of headroom above the leading column too, so a step up is possible */
  if(dug<n){const y=e.y0-1,i=y*W+cx;if(y>GAL&&DIGGABLE[M[i]]&&(DIGGABLE[M[i]]===1||e.blockT>2)){M[i]=AIR;wake(cx,y);dug++;}}
  return dug>0;
}
/* last resort for a creature wedged for seconds: clear its leading column of anything but the frame and the heart */
function forceFront(e){const cx=e.dir>0?e.x1+1:e.x0-1;if(cx<2||cx>W-3)return;
  const clr=(x,y)=>{if(x<2||x>W-3||y<GAL)return;const i=y*W+x,m=M[i];if(m!==BED&&m!==HOUSE&&m!==RAIL&&(KIND[m]===1||KIND[m]===2)){if((r32()&3)===0)spawnP(x+.5,y+.5,-e.dir*rnd(20,60),rnd(-60,-20),RUBBLE,T[i],9,0);M[i]=AIR;wake(x,y);}};
  for(let y=e.y0;y<=e.y1;y++)clr(cx,y);}
function forceBelow(e){const y=e.y1+1;if(y>=HEART.y0-1)return;for(let x=e.x0;x<=e.x1;x++){const i=y*W+x,m=M[i];if(m!==BED&&m!==HOUSE&&m!==RAIL&&(KIND[m]===1||KIND[m]===2)){if((r32()&3)===0)spawnP(x+.5,y+.5,rnd(-40,40),rnd(-50,-10),RUBBLE,T[i],9,0);M[i]=AIR;wake(x,y);}}}
/* shardlings and callers scale a wall they cannot step over: up the face, then on over the top */
function climbWall(e){
  for(let x=e.x0;x<=e.x1;x++)if(solidAt(x,e.y0-1))return false;
  e.y-=1;bbox(e);return true;
}
function hurtEnemy(e,d,src){if(e.dead)return;e.hp-=d;if(src!=='heat'&&src!=='steam')e.hurt=.07;if(src)e.src=src;if(e.hp<=0)e.dead=true;}
/* how hot is it inside the creature, and how hard does the creature chill what it touches */
function bodyHeat(e,dt){
  const D=e.D;let lava=0,steam=0,sum=0,n=0,solid=0,water=0;
  const ch=D.chill*dt;
  for(let y=Math.max(1,e.y0);y<=Math.min(H-2,e.y1);y++)for(let x=Math.max(1,e.x0);x<=Math.min(W-2,e.x1);x++){
    const i=y*W+x,m=M[i];if(m===LAVA)lava++;else if(m===STEAM)steam++;else if(m===WATER)water++;else if(m===IRON||m===SLAG)solid++;
    sum+=T[i];n++;if(ch>0&&T[i]>(D.aura?-30:40))T[i]-=ch*(m===LAVA?1.5:1);   /* small Rime only quench heat; a Rimeback freezes everything */
  }
  wakeBox(e.x0-(D.aura||0),e.y0-(D.aura||0),e.x1+(D.aura||0),e.y1+(D.aura||0));
  if(D.aura){const cx=(e.x0+e.x1)>>1,cy=(e.y0+e.y1)>>1,r=D.aura,k=D.ach*dt;
    for(let y=Math.max(1,cy-r);y<=Math.min(H-2,cy+r);y++)for(let x=Math.max(1,cx-r);x<=Math.min(W-2,cx+r);x++){const dx=x-cx,dy=y-cy,d2=dx*dx+dy*dy;if(d2>r*r)continue;const i=y*W+x;if(T[i]>-25)T[i]-=k*(1-Math.sqrt(d2)/r);}}
  e.wet=water/(n||1);e.encased=solid/(n||1);
  const dl=lava*.24,ds=steam*.05,dh=Math.max(0,sum/(n||1)-70)*.0045;
  e.heatSrc=ds>dl&&ds>dh?'steam':dl>0?'pool':'heat';
  return (dl+ds+dh)*D.res;
}
function freezeCrucible(){CR.frozen=1.4;CR.fill=Math.max(0,CR.fill-120);S.shake=Math.max(S.shake,.35);SFX.freeze();flashMsg('CRUCIBLE FROZEN','#9fe8ff',1);}
function enemyStep(dt,live){
  EGRID.fill(-1);
  for(let k=0;k<EN.length;k++){const e=EN[k];for(let gy=Math.max(0,e.y0>>2);gy<=Math.min(EGH-1,e.y1>>2);gy++)for(let gx=Math.max(0,e.x0>>2);gx<=Math.min(EGW-1,e.x1>>2);gx++)EGRID[gy*EGW+gx]=k;}
  HEART.latched=0;
  for(let k=EN.length-1;k>=0;k--){
    const e=EN[k],D=e.D;e.anim+=dt;e.hurt=Math.max(0,e.hurt-dt);
    const dmg=bodyHeat(e,dt);if(dmg>0)hurtEnemy(e,dmg*dt,e.hurt>0&&e.src?e.src:e.heatSrc);
    if(e.encased>.55&&!D.fly){hurtEnemy(e,99,'entomb');}
    /* melting creatures drip */
    if(e.hp<D.hp&&(r32()&255)<40*(1-e.hp/D.hp)+3&&PN<PMAX-50)spawnP(e.x0+rf()*D.w,e.y1-rf()*2,rnd(-8,8),rnd(0,20),WATER,4,9,0);
    if(e.dead){EN.splice(k,1);killEnemy(e);continue;}
    if(D.fly){wispStep(e,dt);continue;}
    if(e.inRock){borerStep(e,dt);continue;}
    /* iron that sets on a creature's back is shrugged off as it hardens: a Rimeback cannot hide under its own frozen cap */
    for(let y=Math.max(GAL+1,e.y0-2);y<e.y0;y++)for(let x=Math.max(1,e.x0);x<=Math.min(W-2,e.x1);x++){const i=y*W+x,m=M[i];
      if((m===IRON||m===SLAG||m===ICE||m===SNOW||m===RUBBLE)&&(r32()&7)===0){M[i]=AIR;wake(x,y);
        if(PN<PMAX-40)spawnP(x+.5,y+.5,(x-(e.x0+e.x1)/2)*rnd(4,9),rnd(-70,-25),m===ICE||m===SNOW?ICE:RUBBLE,T[i],9,0);}}
    /* latch onto the heart */
    e.latched=e.x1>=HEART.x0-6&&e.x0<=HEART.x1+6&&e.y1>=HEART.y0-2;
    if(e.latched){HEART.latched++;if(live){HEART.drain+=D.drain*dt;HEART.hurtT=.2;}
      hurtEnemy(e,1.5*HEART.heat/100*D.res*dt,'heart');   /* the heart sears whatever clings to it */
      for(const i of HEART.edge)if((r32()&63)===0&&Math.abs(i%W-(e.x0+e.x1)/2)<D.w)T[i]-=60;}
    if(!e.climbing&&!grounded(e)){e.vy=Math.min(e.vy+GRAV*dt,240);e.fall+=e.vy*dt;while(e.fall>=1){e.fall-=1;if(grounded(e)){e.vy=0;e.fall=0;break;}e.y+=1;bbox(e);}
      if(e.y1>H-3){EN.splice(k,1);continue;}continue;}
    e.vy=0;e.fall=0;
    /* stuck inside fresh iron: climb out of it */
    let inside=0;for(let x=e.x0;x<=e.x1;x++)if(solidAt(x,e.y1))inside++;if(inside>D.w*.5&&!solidAt(e.x0,e.y0-1)&&!solidAt(e.x1,e.y0-1)){e.y-=1;bbox(e);}
    if(e.latched)continue;
    /* progress toward the heart: a creature that stops gaining ground for 8 s is enraged and bulldozes on */
    {const d=Math.abs((e.x0+e.x1)/2-HX)+Math.max(0,HEART.y0-e.y1)*.5;if(d<e.bestD-1){e.bestD=d;e.stall=0;}else if(e.state!=='cast')e.stall+=dt;
      if(e.stall>8&&!e.rage){e.rage=true;e.dir=Math.sign(HX-(e.x0+e.x1)/2)||e.dir;}}
    if(e.rage){const cx=(e.x0+e.x1)/2;e.dir=Math.sign(HX-cx)||e.dir;e.acc+=D.sp*.4*dt;
      while(e.acc>=1){e.acc-=1;
        if(Math.abs(cx-HX)<14){forceBelow(e);break;}            /* above the heart: dig straight down to it */
        if(!stepX(e,e.dir)){forceFront(e);e.x+=e.dir;bbox(e);}e.stall=0;}
      if(e.bestD<1e8){const d=Math.abs((e.x0+e.x1)/2-HX);if(d<e.bestD-4){e.bestD=d;e.rage=false;e.stall=0;}}continue;}
    e.turnT=Math.max(0,e.turnT-dt);
    if(e.turnT<=0)e.dir=Math.sign(HX-(e.x0+e.x1)/2)||e.dir;
    if(e.t==='caller'&&callerStep(e,dt))continue;
    if(e.climbing){e.climbAcc+=dt*9;while(e.climbAcc>=1){e.climbAcc-=1;if(stepX(e,e.dir)){e.climbing=false;e.blockT=0;break;}if(!climbWall(e)){e.climbing=false;break;}}continue;}
    e.acc+=D.sp*(e.wet>.25?.55:1)*dt;let moved=false;
    while(e.acc>=1){e.acc-=1;if(stepX(e,e.dir)){moved=true;e.blockT=0;continue;}
      e.blockT+=dt;e.dig+=dt*D.dig*60;
      if((e.t==='shard'||e.t==='caller')&&e.blockT>1.6&&!solidAt(e.x0,e.y0-1)&&!solidAt(e.x1,e.y0-1)){e.climbing=true;e.climbAcc=0;break;}
      if(e.dig>=60){e.dig=0;if(e.blockT>6)forceFront(e);else if(!digFront(e)){e.dir=-e.dir;e.turnT=2;}}e.acc=0;break;}
    if(!moved&&e.acc===0&&!e.climbing)e.blockT+=dt;
  }
}
function wispStep(e,dt){
  const D=e.D,tx=CR.x,ty=PIV_Y+8,dx=tx-e.x,dy=ty-e.yc,d=Math.hypot(dx,dy)||1;
  const wob=Math.sin(e.anim*3.1+e.id)*16;let wx=dx/d*D.sp-dy/d*wob,wy=dy/d*D.sp+dx/d*wob;
  e.vx+=(wx-e.vx)*dt*1.8;e.vy+=(wy-e.vy)*dt*1.8;
  /* wisps are frost spirits: they drift through rock, slowed a little while inside it */
  if(solidAt(e.x|0,e.yc|0)){e.vx*=.97;e.vy*=.97;}
  e.x=clamp(e.x+e.vx*dt,4,W-5);e.yc=clamp(e.yc+e.vy*dt,PIV_Y+3,H-6);bbox(e);
  if(Math.abs(e.x-CR.nx)<11&&Math.abs(e.yc-(PIV_Y+8))<9){freezeCrucible();e.dead=true;const k=EN.indexOf(e);if(k>=0)EN.splice(k,1);killEnemy(e,true);}
}
/* borers chew a round shaft through rock straight for the heart, then crawl out */
function borerStep(e,dt){
  const tx=HX,ty=HY-4,dx=tx-e.x,dy=ty-e.yc,d=Math.hypot(dx,dy)||1;
  e.x+=dx/d*e.D.sp*dt;e.yc+=dy/d*e.D.sp*dt;e.dir=dx>0?1:-1;e.y=e.yc+e.D.h/2;bbox(e);
  const hx=e.x+e.dir*4,hy=e.yc;let ate=0;
  for(let y=Math.round(hy-4);y<=Math.round(hy+4);y++)for(let x=Math.round(hx-5);x<=Math.round(hx+5);x++){
    if(x<1||x>W-2||y<GAL||y>H-2)continue;const ddx=x-hx,ddy=y-hy;if(ddx*ddx*.6+ddy*ddy>16)continue;const i=y*W+x,m=M[i];
    if(DIGGABLE[m]){ate++;if((r32()&7)===0)spawnP(x+.5,y+.5,-e.dir*rnd(10,50),rnd(-40,10),RUBBLE,T[i],9,0);M[i]=AIR;L[i]=0;}}
  /* also keep the shaft open behind it */
  for(let y=e.y0;y<=e.y1;y++)for(let x=e.x0;x<=e.x1;x++){const i=y*W+x;if(DIGGABLE[M[i]]===2){M[i]=AIR;}}
  if(ate)e.quiet=0;else e.quiet+=dt;
  /* it breaks out only into open cavern the ladle can reach: a borer following an older shaft, or crossing a
     sealed pocket, stays underground (surfacing there would leave it walking a tunnel no pour can touch) */
  const near=Math.abs(dx)<20&&Math.abs(dy)<8;
  if(near||(e.quiet>.25&&openAbove(Math.round(e.x),e.y0-1))){e.inRock=false;e.y=Math.round(e.yc+e.D.h/2);bbox(e);}
  if(rf()<.3)EV.bore=(EV.bore||0)+1;
}
/* frostcallers walk to a perch, then lob ice at the hottest pool and call up shardlings */
let LAVAC={n:0,x:HX,y:HY};
function lavaCentroid(){let n=0,sx=0,sy=0;for(let i=W*GAL;i<N;i+=3){if(M[i]===LAVA){n++;sx+=i%W;sy+=(i/W)|0;}}LAVAC={n,x:n?sx/n:HX,y:n?sy/n:HY};}
function callerStep(e,dt){
  if(e.state!=='cast'){if(e.walked>=e.perch&&grounded(e))e.state='cast';return false;}
  if(e.casts>=4){e.state='walk';e.casts=0;e.perch=e.walked+40;return false;}
  e.cast-=dt;e.summon-=dt;
  if(e.cast<=0){e.cast=3.4;e.casts++;const sx=e.dir>0?e.x1:e.x0,sy=e.y0,tx=LAVAC.n>30?LAVAC.x:HX,ty=LAVAC.n>30?LAVAC.y:HY-24,tf=.95;
    for(let n=0;n<10;n++)spawnP(sx+.5,sy+.5,(tx-sx)/tf+rnd(-14,14),(ty-sy)/tf-.5*GRAV*tf+rnd(-14,14),ICE,-25,9,0);
    for(let n=0;n<14;n++)spawnP(sx+.5,sy,rnd(-30,30)+(tx-sx)*.3,rnd(-60,-10),SNOW,-15,9,0);
    SFX.cast();LIGHTS.push({x:sx,y:sy,r:1,t:0,dur:.3,c:[150,220,255]});}
  if(e.summon<=0&&(e.summoned||0)<4){e.summon=11;e.summoned=(e.summoned||0)+2;for(let n=0;n<2;n++){const s=spawnEnemy('shard',e.dir>0?-1:1,0);if(s){s.x=e.x+(n?-6:6);s.y=e.y;bbox(s);}}SFX.summon();}
  return true;
}
function killEnemy(e,silent){
  e.alive=false;const sp=SPRS[e.t][0],cx=(e.x0+e.x1)/2,cy=(e.y0+e.y1)/2;
  for(let r=0;r<sp.h;r++)for(let c=0;c<sp.w;c++){const ch=sp.rows[r][e.dir>0?c:sp.w-1-c];if(ch==='.')continue;if(rf()<.5){const x=e.x0+c+.5,y=e.y0+r+.5,ice=rf()<.3;
    spawnP(x,y,(x-cx)*rnd(4,11)+rnd(-20,20),(y-cy)*rnd(3,8)-rnd(30,100),ice?ICE:WATER,ice?-12:(e.src==='entomb'?6:45),9,0);}}
  for(let n=0;n<8;n++)spawnP(cx+rnd(-3,3),cy,rnd(-40,40),rnd(-90,-20),STEAM,110,rnd(.5,1.2),0);
  LIGHTS.push({x:cx,y:cy,r:1,t:0,dur:.28,c:[160,235,255]});
  if(!silent)onKill(e);else SFX.shatter(.6);
}
/* particles meeting creatures: lava drops sear them (and are spent), everything else passes behind */
PHIT=(k,fx,fy)=>{
  if(PM[k]!==LAVA)return false;
  const cx=fx|0,cy=fy|0,gi=EGRID[(cy>>2)*EGW+(cx>>2)];
  if(gi>=0&&gi<EN.length){const e=EN[gi];if(cx>=e.x0&&cx<=e.x1&&cy>=e.y0&&cy<=e.y1){
    hurtEnemy(e,.13*e.D.res*clamp((PT[k]-900)/600,.25,1.2),'lava');EV.hiss++;
    if((r32()&3)===0)spawnP(fx,fy-1,rnd(-30,30),rnd(-70,-30),STEAM,110,rnd(.3,.7),0);
    if((r32()&3)===0)spawnP(fx,fy-1,(PVX[k]>0?1:-1)*rnd(30,70)+rnd(-20,20),-Math.abs(PVY[k])*.18,LAVA,PT[k]-120,9,PF_SPLASHED);
    return true;}}
  if(BOSS.on)return bossParticle(k,cx,cy);
  return false;
};
/* ---------- drawing the Rime into the sprite layer ---------- */
function blit(sp,x0,y0,flip,mod){
  const fl=mod&&mod.flash,wet=mod?mod.wet||0:0;
  for(let r=0;r<sp.h;r++){const row=sp.rows[r],y=y0+r;if(y<0||y>=H)continue;
    for(let c=0;c<sp.w;c++){const ch=row[flip?sp.w-1-c:c];if(ch==='.')continue;const x=x0+c;if(x<0||x>=W)continue;let p=PAL[ch];if(!p)continue;const o=(y*W+x)*4;
      if(fl&&p[3]===255){SPR[o]=255;SPR[o+1]=255;SPR[o+2]=255;SPR[o+3]=40;continue;}
      if(mod&&mod.rage&&ch==='e'){SPR[o]=255;SPR[o+1]=70;SPR[o+2]=60;SPR[o+3]=90;continue;}
      SPR[o]=p[0]*(1-wet*.45);SPR[o+1]=p[1]*(1-wet*.3);SPR[o+2]=p[2];SPR[o+3]=p[3];}}
}
function drawRime(){
  for(const e of EN){const fr=(e.anim*(e.t==='wisp'?6:e.D.sp*.45)|0)&1,sp=SPRS[e.t][fr];
    blit(sp,e.x0,e.y0,e.dir<0,{flash:e.hurt>0&&((e.anim*30|0)&1),wet:1-e.hp/e.D.hp,rage:e.rage&&((e.anim*6|0)&1)});}
}
/* =====================================================================================
   THE HOAR KING — a giant built cell by cell. Every cell of his body has its own hit
   points; lava erodes him where it lands, the cells fall away as water and ice, and
   his heart of frost sits deep in his chest. He regrows where he is not burning.
   ===================================================================================== */
const BOSS={on:false,parts:[],x:0,y:0,t:0,phase:0,breath:0,breathT:7,stompT:9,regenT:0,hot:0,dying:0,dead:false,cells:0,cells0:1,coreHp:0,coreHp0:1,kneel:0,stopX:HX+44,roar:0};
function mkPart(id,ox,oy,w,h,fn){const kind=new Uint8Array(w*h),hp=new Float32Array(w*h);let n=0;
  for(let r=0;r<h;r++)for(let c=0;c<w;c++){const k=fn(c,r,w,h);if(k){kind[r*w+c]=k;hp[r*w+c]=k===2?6:k===3?12:k===4?2:3;n++;}}
  return {id,ox,oy,w,h,kind,kind0:kind.slice(),hp,dx:0,dy:0,hotT:0,n0:n,n};}
function bossSpawn(){
  const ell=(c,r,w,h,cx,cy,rx,ry)=>{const x=(c-cx)/rx,y=(r-cy)/ry;return x*x+y*y<=1;};
  const P=[];
  P.push(mkPart('legL',-13,-16,10,17,(c,r,w,h)=>{if(c<1+(r<4?0:1)||c>w-2)return 0;return r>h-4?2:1;}));
  P.push(mkPart('legR',3,-16,10,17,(c,r,w,h)=>{if(c<1||c>w-2-(r<4?0:1))return 0;return r>h-4?2:1;}));
  P.push(mkPart('torso',-18,-44,36,30,(c,r,w,h)=>{const cx=w/2-.5;if(!ell(c,r,w,h,cx,h*.52,w*.5,h*.56))return 0;
    const dx=Math.abs(c-cx),dy=Math.abs(r-14);if(dx+dy<=4.5)return 3;if(r<6&&(c%5===1))return 2;return (hash2(c,r,9)<.18)?2:1;}));
  P.push(mkPart('head',-9,-58,18,15,(c,r,w,h)=>{const cx=w/2-.5;if(r<5){return (c%4===1&&r>=5-(c%8===1?5:3))?4:0;}
    if(!ell(c,r,w,h,cx,9.5,8.6,6.2))return 0;if(r===9&&(Math.abs(c-cx+3.5)<1||Math.abs(c-cx-3.5)<1))return 5;return 1;}));
  P.push(mkPart('armL',-26,-42,9,27,(c,r,w,h)=>{const cx=4+Math.sin(r*.2)*.8;if(Math.abs(c-cx)>3.6-(r>h-6?-.6:0))return 0;return r>h-5?2:1;}));
  P.push(mkPart('armR',17,-42,9,27,(c,r,w,h)=>{const cx=4-Math.sin(r*.2)*.8;if(Math.abs(c-cx)>3.6-(r>h-6?-.6:0))return 0;return r>h-5?2:1;}));
  BOSS.parts=P;BOSS.on=true;BOSS.dead=false;BOSS.dying=0;BOSS.x=W+30;BOSS.y=ST.tunnels[ST.tunnels.length-1].y-1;BOSS.t=0;BOSS.phase=0;BOSS.breath=0;BOSS.breathT=9;BOSS.stompT=11;BOSS.kneel=0;BOSS.roar=1;
  BOSS.cells0=P.reduce((a,p)=>a+p.n0,0);BOSS.cells=BOSS.cells0;
  BOSS.coreHp0=0;const to=P[2];for(let i=0;i<to.kind.length;i++)if(to.kind[i]===3)BOSS.coreHp0+=to.hp[i];BOSS.coreHp=BOSS.coreHp0;
  SFX.roar();S.shake=Math.max(S.shake,.6);bigMsg('THE HOAR KING','#bfefff','MELT HIS HEART OF FROST');
}
function partOrigin(p){return [Math.round(BOSS.x)+p.ox+p.dx,Math.round(BOSS.y)+p.oy+p.dy+BOSS.kneel];}
/* the topmost living cell at a world position: returns part*8192+cell, or -1 */
function bossCellAt(x,y){
  if(!BOSS.on)return -1;
  for(let pi=BOSS.parts.length-1;pi>=0;pi--){const p=BOSS.parts[pi],[ox,oy]=partOrigin(p),c=x-ox,r=y-oy;if(c<0||r<0||c>=p.w||r>=p.h)continue;const i=r*p.w+c;if(p.kind[i])return pi*8192+i;}
  return -1;
}
function bossDamage(q,d){
  const p=BOSS.parts[q>>13],i=q&8191,k=p.kind[i];if(!k)return;
  const before=p.hp[i];p.hp[i]-=d;p.hotT=1.6;BOSS.hurt=.06;
  if(k===3)BOSS.coreHp=Math.max(0,BOSS.coreHp-Math.min(before,d));
  if(p.hp[i]<=0){p.kind[i]=0;p.n--;BOSS.cells--;const [ox,oy]=partOrigin(p),x=ox+i%p.w+.5,y=oy+(i/p.w|0)+.5;
    if(PN<PMAX-20)spawnP(x,y,rnd(-25,25),rnd(-20,10),rf()<.75?WATER:ICE,rf()<.5?30:-5,9,0);
    if((r32()&3)===0)spawnP(x,y,rnd(-20,20),rnd(-60,-20),STEAM,110,rnd(.4,.9),0);
    if(k===3){SFX.coreCrack();S.shake=Math.max(S.shake,.3);}}
}
/* molten iron splashes as it strikes: the cell it lands on takes the blow, its neighbours a share of it */
function bossParticle(k,cx,cy){const q=bossCellAt(cx,cy);if(q<0)return false;const d=clamp((PT[k]-900)/500,.3,1.3);bossDamage(q,d);
  for(const [ox,oy] of [[-1,0],[1,0],[0,1],[-2,0],[2,0],[0,2]]){const qn=bossCellAt(cx+ox,cy+oy);if(qn>=0)bossDamage(qn,d*(Math.abs(ox)+Math.abs(oy)>1?.18:.4));}
  EV.hiss++;
  if((r32()&3)===0)spawnP(cx+.5,cy-1,rnd(-30,30),rnd(-80,-30),STEAM,110,rnd(.3,.8),0);return true;}
function bossBlast(x,y,r){for(const p of BOSS.parts){const [ox,oy]=partOrigin(p);for(let i=0;i<p.kind.length;i++){if(!p.kind[i])continue;const cx=ox+i%p.w,cy=oy+(i/p.w|0),d=Math.hypot(cx-x,cy-y);if(d<r)bossDamage((BOSS.parts.indexOf(p)<<13)|i,(1-d/r)*7);}}}
function bossStep(dt,live){
  const B=BOSS;if(!B.on)return;B.t+=dt;B.roar=Math.max(0,B.roar-dt);
  const P=B.parts,legs=(P[0].n+P[1].n)/(P[0].n0+P[1].n0),head=P[3].n/P[3].n0;
  if(B.dying>0){B.dying+=dt;if(B.dying>2.4){bossShatter();}return;}
  /* once most of the frost heart is gone the rest cannot hold: it cracks apart */
  if(B.coreHp<=B.coreHp0*.12){B.dying=.01;SFX.roar();S.shake=1.2;S.flash=.6;return;}
  /* walk in from the great tunnel and plant himself beside the heart */
  B.kneel=legs<.3?Math.min(7,B.kneel+dt*6):0;
  const sp=legs<.3?0:2.4*(.4+.6*legs);
  if(B.x>B.stopX){B.x-=sp*dt;B.phase+=dt*2.6*(sp>0?1:0);}
  P[0].dy=-Math.round(Math.max(0,Math.sin(B.phase))*3);P[1].dy=-Math.round(Math.max(0,Math.sin(B.phase+Math.PI))*3);
  P[2].dy=P[3].dy=-Math.round(Math.abs(Math.sin(B.phase*2))*1);P[4].dx=Math.round(Math.sin(B.phase)*1.4);P[5].dx=-P[4].dx;P[4].dy=P[5].dy=P[2].dy;
  /* he is too big to be walled in: whatever sets inside his body (iron he froze, ice, rubble, the tunnel's rough lip) is crushed out */
  for(let pi=0;pi<P.length;pi++){const p=P[pi],[ox,oy]=partOrigin(p);
    for(let r=0;r<p.h;r++){const y=oy+r;if(y<GAL||y>H-2||y>Math.round(B.y))continue;for(let c=0;c<p.w;c++){if(!p.kind[r*p.w+c])continue;const x=ox+c;if(x<1||x>W-2)continue;
      const i=y*W+x,m=M[i];if((KIND[m]===1||KIND[m]===2)&&m!==BED&&m!==HOUSE&&m!==RAIL){M[i]=AIR;wake(x,y);if((r32()&3)===0&&PN<PMAX-40)spawnP(x+.5,y+.5,rnd(-50,50),rnd(-70,-10),RUBBLE,T[i],9,0);}}}}
  /* stand on the bedrock of the cavern under his feet (iron, ice and rubble give way under his weight and are crushed above);
     he steps up at most a few cells, and never leaves the cavern */
  const hard=(x,y)=>{if(y>=H-1)return true;const m=M[y*W+x];return m===ROCK||m===BED||m===CRYST||m===HOUSE||m===RAIL;};
  let gy=H-2;for(const pi of [0,1]){const p=P[pi],[ox]=partOrigin(p);for(let c=0;c<p.w;c++){const x=ox+c;if(x<1||x>W-2)continue;let y=Math.round(B.y)-3;while(y<H-2&&!hard(x,y+1))y++;gy=Math.min(gy,y);}}
  B.y+=(gy-B.y)*Math.min(1,dt*6);B.y=clamp(B.y,GAL+62,H-2);
  /* his cold: everything near him loses heat, lava under him crusts */
  const x0=Math.max(1,Math.round(B.x)-26),x1=Math.min(W-2,Math.round(B.x)+26),y0=Math.max(GAL,Math.round(B.y)-60),y1=Math.min(H-2,Math.round(B.y)+2);
  for(let y=y0;y<=y1;y+=1)for(let x=x0;x<=x1;x+=1){const i=y*W+x;if(T[i]>-25)T[i]-=dt*(M[i]===LAVA?520:160);}
  /* lava pooled at his feet eats his legs */
  for(const pi of [0,1]){const p=P[pi],[ox,oy]=partOrigin(p);for(let r=p.h-4;r<p.h;r++)for(let c=0;c<p.w;c++){const i=r*p.w+c;if(!p.kind[i])continue;const x=ox+c,y=oy+r;if(x<1||x>W-2||y<1||y>H-2)continue;
    for(const o of [0,1,-1,W]){const m=M[y*W+x+o];if(m===LAVA)bossDamage(pi<<13|i,dt*2.2);}}}
  if(!live)return;
  if(B.x<=B.stopX+1){HEART.latched++;HEART.drain+=dt*4;HEART.hurtT=.2;}
  /* frost breath */
  B.breathT-=dt;if(B.breathT<=0&&head>.3){B.breath=1.5;B.breathT=8.5;SFX.breath();}
  if(B.breath>0){B.breath-=dt;const [ox,oy]=partOrigin(P[3]);for(let n=0;n<5;n++)spawnP(ox+2,oy+10,-rnd(110,190),rnd(20,80),SNOW,-20,9,0);if((r32()&1)===0)spawnP(ox+2,oy+10,-rnd(120,200),rnd(10,60),ICE,-25,9,0);}
  /* stomp: shakes ice from the ceiling and calls shardlings */
  B.stompT-=dt;if(B.stompT<=0&&legs>.35){B.stompT=10+Math.random()*3;S.shake=Math.max(S.shake,.8);SFX.stomp();
    for(let n=0;n<14;n++)spawnP(rnd(30,W-30),GAL+1,rnd(-10,10),rnd(0,40),ICE,-20,9,0);for(let n=0;n<2;n++)spawnEnemy('shard',1,ST.tunnels.length-1);}
  /* regrowth where he is not burning */
  B.regenT-=dt;if(B.regenT<=0){B.regenT=.1;const p=P[(Math.random()*P.length)|0];
    if(p.hotT<=0&&p.n<p.n0&&p.n>p.n0*.15){for(let tries=0;tries<24;tries++){const i=(Math.random()*p.kind.length)|0,k0=p.kind0[i];if(p.kind[i]||!k0||k0===3)continue;
      const c=i%p.w,r=(i/p.w)|0;if(!((c>0&&p.kind[i-1])||(c<p.w-1&&p.kind[i+1])||(r>0&&p.kind[i-p.w])||(r<p.h-1&&p.kind[i+p.w])))continue;
      p.kind[i]=k0;p.hp[i]=1;p.n++;B.cells++;break;}}}
  for(const p of P)p.hotT=Math.max(0,p.hotT-dt);
}
function bossShatter(){
  const B=BOSS;for(const p of B.parts){const [ox,oy]=partOrigin(p);for(let i=0;i<p.kind.length;i++){if(!p.kind[i])continue;const x=ox+i%p.w+.5,y=oy+(i/p.w|0)+.5;
    if(rf()<.55&&PN<PMAX-10)spawnP(x,y,(x-B.x)*rnd(2,6)+rnd(-30,30),rnd(-160,-20),rf()<.6?WATER:ICE,rf()<.5?20:-8,9,0);p.kind[i]=0;}}
  for(let n=0;n<40;n++)spawnP(B.x+rnd(-15,15),B.y-30+rnd(-20,20),rnd(-80,80),rnd(-140,-30),STEAM,110,rnd(.8,1.8),0);
  B.on=false;B.dead=true;S.shake=1.4;S.flash=.8;SFX.bossDie();onBossKilled();
}
function drawBoss(){
  const B=BOSS;if(!B.on)return;const pulse=.5+.5*Math.sin(S.clock*5),dyingFlash=B.dying>0&&((B.dying*14|0)&1);
  for(let pi=0;pi<B.parts.length;pi++){const p=B.parts[pi],[ox,oy]=partOrigin(p);
    for(let r=0;r<p.h;r++){const y=oy+r;if(y<0||y>=H)continue;for(let c=0;c<p.w;c++){const i=r*p.w+c,k=p.kind[i];if(!k)continue;const x=ox+c;if(x<0||x>=W)continue;const o=(y*W+x)*4;
      const edge=c===0||r===0||c===p.w-1||r===p.h-1||!p.kind[i-1]||!p.kind[i+1]||!p.kind[i-p.w]||!p.kind[i+p.w];
      const hv=hash2(c,r,pi*7),dmg=1-p.hp[i]/(k===2?6:k===3?12:k===4?2:3);
      let rr,gg,bb,a=255;
      if(k===3){rr=110+pulse*60;gg=210+pulse*40;bb=255;a=dyingFlash?200:70+pulse*60;}
      else if(k===5){rr=180;gg=255;bb=255;a=110;}
      else if(k===4){rr=215;gg=245;bb=255;a=edge?16:255;}
      else if(k===2){rr=58+hv*24;gg=108+hv*30;bb=165+hv*30;}
      else{rr=edge?175:96+hv*40;gg=edge?226:170+hv*36;bb=edge?252:222+hv*26;}
      if(dmg>0&&k!==3){rr*=1-dmg*.5;gg*=1-dmg*.35;}
      if(p.hotT>0&&k!==3&&(r32()&15)===0){rr=255;gg=200;bb=170;a=24;}
      SPR[o]=rr;SPR[o+1]=gg;SPR[o+2]=bb;SPR[o+3]=dyingFlash&&k!==3?40:a;}}}
}
