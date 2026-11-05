/* =====================================================================================
   MOLTEN II — the sequel's additions, on top of the original's rules:
     three new Rime      skaters (fast, they freeze the water they cross), spitters (perch and
                         fire frost bolts at the crucible), bulwarks (they grow a roof of ice)
     lava vents          the Caldera's floor erupts on its own
     three new stages    after the Hoar King: the Caldera, the Obsidian Deep, the Winter Throne
     the Rime Queen      the King's mother, a flying giant who sinks toward the heart
     the Anvil           between stages, pick one of three upgrades for the rest of the run
   ===================================================================================== */
Object.assign(PAL,{q:[200,240,255,40],Q:[240,250,255,120]});
Object.assign(SPRS,{
  skater:[sprite(['..s..s..','.swssws.','ocwccwco','obbeebbo','.okkbko.','oo....oo']),
          sprite(['..s..s..','.swssws.','ocwccwco','obbeebbo','.okbkko.','.oo..oo.'])],
  spitter:[sprite(['..s..s..','.oooooo.','occccco.','ocwkkwco','obeeeebo','obbkkbbo','.obbbbo.','..o..o..']),
           sprite(['..s..s..','.oooooo.','occccco.','ocwkkwco','obeqqebo','obbkkbbo','.obbbbo.','.o....o.'])],
  bulwark:[sprite(['..ssss..ssss..','.swwwwsswwwws.','occccccccccco.','ocbbbbbbbbbbco','obbkbbbbbbkbbo','obbbbeeeebbbbo','obbbbbbbbbbbbo','obkbbbbbbbbkbo','.obbbbbbbbbbo.','..oo..oo..oo..','..oo..oo..oo..']),
           sprite(['..ssss..ssss..','.swwwwsswwwws.','occccccccccco.','ocbbbbbbbbbbco','obbkbbbbbbkbbo','obbbbeeeebbbbo','obbbbbbbbbbbbo','obkbbbbbbbbkbo','.obbbbbbbbbbo.','.oo..oo..oo...','.oo...oo..oo..'])],
  bolt:[sprite(['.G.','GQG','.G.']),sprite(['.q.','qQq','.q.'])]
});
Object.assign(ETYPES,{
  skater: {w:8, h:6, hp:.8, sp:30, climb:2,chill:230,aura:0,ach:0,drain:2,  dig:1.6,score:300,res:1},
  spitter:{w:8, h:8, hp:2.2,sp:9,  climb:2,chill:120,aura:0,ach:0,drain:2.5,dig:1,  score:450,res:.85},
  bulwark:{w:14,h:11,hp:9,  sp:5,  climb:3,chill:320,aura:0,ach:0,drain:5,  dig:2.2,score:900,res:.45},
  bolt:   {w:3, h:3, hp:.22,sp:58, climb:0,chill:0,  aura:0,ach:0,drain:0,  dig:0,  score:50, res:1,fly:1}
});
/* ---------- the run's upgrades (the Anvil) ---------- */
const RUN={};
function runReset(){Object.assign(RUN,{spd:1,flow:1,pourT:T_POUR,drainCap:7,bombMax:3,refill:1,bombEvery:14,mend:0,taken:[]});CR.cap=420;}
runReset();
const UPG=[
  {id:'cap',  name:'DEEP CRUCIBLE',d:['HOLDS 30% MORE','MOLTEN IRON'],     ap(){CR.cap=Math.round(CR.cap*1.3);CR.fill=CR.cap;}},
  {id:'spd',  name:'QUICK TROLLEY',d:['THE CRUCIBLE RIDES','25% FASTER'],  ap(){RUN.spd*=1.25;}},
  {id:'flow', name:'WIDE NOZZLE',  d:['IT POURS','30% FASTER'],            ap(){RUN.flow*=1.3;}},
  {id:'hot',  name:'WHITE HEAT',   d:['IRON POURS 120','DEGREES HOTTER'],  ap(){RUN.pourT+=120;}},
  {id:'plate',name:'FORGE PLATING',d:['THE RIME DRAIN','THE HEART SLOWER'],ap(){RUN.drainCap*=.72;}},
  {id:'bomb', name:'SLAG RACK',    d:['CARRY ONE MORE','SLAG BOMB'],       ap(){RUN.bombMax++;CR.bombs=Math.min(RUN.bombMax,CR.bombs+1);},max:2},
  {id:'refill',name:'BELLOWS',     d:['THE FURNACE REFILLS','60% FASTER'], ap(){RUN.refill*=1.6;}},
  {id:'chain',name:'SLAG HARVEST', d:['A BOMB FOR EVERY','10 MELTED'],     ap(){RUN.bombEvery=10;},max:1},
  {id:'mend', name:'EMBER HEART',  d:['THE HEART','WARMS ITSELF'],         ap(){RUN.mend+=1.2;},max:2}
];
function anvilDeal(){
  const ok=UPG.filter(u=>!(u.max&&RUN.taken.filter(t=>t===u.id).length>=u.max));
  for(let i=ok.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[ok[i],ok[j]]=[ok[j],ok[i]];}
  return ok.slice(0,3);
}
/* ---------- the new Rime ---------- */
/* spitters walk to a perch, then fire frost bolts up at the crucible */
function spitterStep(e,dt){
  if(e.state!=='cast'){if(e.walked>=e.perch&&grounded(e))e.state='cast';return false;}
  if(e.casts>=5){e.state='walk';e.casts=0;e.perch=e.walked+36;return false;}
  e.cast-=dt;
  if(e.cast<=0){e.cast=3.1;e.casts++;spawnBolt((e.x0+e.x1)/2,e.y0-1);SFX.cast();LIGHTS.push({x:(e.x0+e.x1)/2,y:e.y0,r:1,t:0,dur:.25,c:[150,220,255]});}
  return true;
}
function spawnBolt(x,y){
  const b=spawnEnemy('bolt',x<HX?-1:1,0);if(!b)return;b.x=x;b.yc=y;b.life=0;
  const dx=CR.nx-x,dy=CR.ny-y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*b.D.sp;b.vy=dy/d*b.D.sp;bbox(b);
}
/* frost bolts home a little on the crucible; lava shoots them down, rock breaks them */
function boltStep(e,dt){
  e.life+=dt;const dx=CR.nx-e.x,dy=CR.ny-e.yc,d=Math.hypot(dx,dy)||1,k=Math.min(1,dt*1.1);
  e.vx+=(dx/d*e.D.sp-e.vx)*k;e.vy+=(dy/d*e.D.sp-e.vy)*k;
  e.x+=e.vx*dt;e.yc+=e.vy*dt;bbox(e);
  const gone=()=>{e.dead=true;const k2=EN.indexOf(e);if(k2>=0)EN.splice(k2,1);};
  if(Math.abs(e.x-CR.nx)<9&&Math.abs(e.yc-(PIV_Y+8))<8){freezeCrucible();gone();killEnemy(e,true);return;}
  const m=M[(clamp(e.yc|0,0,H-1))*W+clamp(e.x|0,0,W-1)];
  if(e.life>.35&&(m===ROCK||m===BED||m===CRYST)){gone();for(let n=0;n<5;n++)spawnP(e.x,e.yc,rnd(-40,40),rnd(-40,20),ICE,-20,9,0);SFX.shatter(.4);return;}
  if(e.life>7||e.x<2||e.x>W-3||e.yc<2)gone();
}
/* bulwarks carry a roof of ice above their heads and keep growing it back */
function bulwarkRoof(e,dt){
  if(!e.roof)e.roof=[];e.roofT=(e.roofT||0)-dt;
  const ya=e.y0-5,yb=e.y0-4,x0=e.x0-1,x1=e.x1+1;
  for(let k=e.roof.length-1;k>=0;k--){const i=e.roof[k],x=i%W,y=(i/W)|0;
    if(M[i]!==ICE){e.roof.splice(k,1);continue;}
    if(x<x0||x>x1||y<ya||y>yb){M[i]=AIR;wake(x,y);e.roof.splice(k,1);}}
  if(e.roofT<=0){e.roofT=2;
    for(let y=ya;y<=yb;y++)for(let x=x0;x<=x1;x++){if(x<1||x>W-2||y<=GAL)continue;const i=y*W+x;if(M[i]===AIR){M[i]=ICE;T[i]=-25;L[i]=0;wake(x,y);e.roof.push(i);}}}
}
function dropRoof(e){if(!e.roof)return;for(const i of e.roof)if(M[i]===ICE){M[i]=WATER;T[i]=2;V[i]=0;L[i]=0;wake(i%W,(i/W)|0);}e.roof=null;}
/* ---------- the Caldera's vents ---------- */
function ventSetup(){
  if(!ST.vents)return;
  for(const v of ST.vents){v.t=5+Math.random()*5;v.erupt=0;v.warned=false;}
}
function ventFloor(x){let y=GAL+4;while(y<H-2&&KIND[M[y*W+x]]===0)y++;return y;}
function sequelStep(dt,live){
  if(!ST.vents||S.mode==='title')return;
  for(const v of ST.vents){
    const y=ventFloor(v.x);
    for(let dx=-1;dx<=1;dx++)for(let dy=0;dy<3;dy++){const i=(y+dy)*W+v.x+dx;if(i<N&&M[i]===ROCK)T[i]=Math.max(T[i],760+(v.erupt>0?500:v.t<1.5?300:0));}   /* the vent's throat glows */
    if(!live)continue;
    v.t-=dt;
    if(v.t<1.4&&!v.warned){v.warned=true;SFX.vent();for(let n=0;n<10;n++)spawnP(v.x+rnd(-2,2),y-1,rnd(-15,15),rnd(-80,-30),STEAM,140,rnd(.5,1.2),0);}
    if(v.t<=0){v.erupt=1.3;v.t=11+Math.random()*6;v.warned=false;S.shake=Math.max(S.shake,.32);LIGHTS.push({x:v.x,y:y-6,r:1,t:0,dur:.6,c:[255,190,110]});}
    if(v.erupt>0){v.erupt-=dt;if(Math.random()<dt*9)fxSplash(v.x+.5,y,true);for(let n=0;n<5;n++)spawnP(v.x+rnd(-1.5,1.5),y-1.5,rnd(-50,50),rnd(-290,-170),LAVA,1520,9,0);
      if((r32()&3)===0)spawnP(v.x,y-2,rnd(-60,60),rnd(-160,-60),EMBER,1500,rnd(.3,.9),0);}
  }
}
/* ---------- THE RIME QUEEN — the King's mother. She flies in high, hovers over the forge and
   sinks toward the heart; she breathes frost down on it, calls wisps and fires frost bolts. Like
   the King she is built cell by cell, regrows where she is not burning, and dies with her core. */
function queenSpawn(){
  const P=[];
  P.push(mkPart('wingL',-37,-40,24,22,(c,r,w,h)=>{const u=(w-1-c)/w,v=r/h;if(v<u*.72||v>1-u*.32)return 0;return v>1-u*.32-.12?4:(hash2(c,r,21)<.2?2:1);}));
  P.push(mkPart('wingR',13,-40,24,22,(c,r,w,h)=>{const u=c/w,v=r/h;if(v<u*.72||v>1-u*.32)return 0;return v>1-u*.32-.12?4:(hash2(c,r,23)<.2?2:1);}));
  P.push(mkPart('body',-15,-34,30,34,(c,r,w,h)=>{const dx=Math.abs(c-w/2+.5)/(w/2),dy=Math.abs(r-h/2+.5)/(h/2);if(dx+dy>1)return 0;
    if(Math.abs(c-w/2+.5)+Math.abs(r-h/2+.5)<=5)return 3;if(dx+dy>.82)return 2;return hash2(c,r,27)<.15?2:1;}));
  P.push(mkPart('head',-8,-48,16,15,(c,r,w,h)=>{if(r<5)return (c%3===1&&r>=4-(c%6===1?4:2))?4:0;const x=(c-w/2+.5)/7.4,y=(r-9.5)/5.2;if(x*x+y*y>1)return 0;if(r===9&&(c===4||c===11))return 5;return 1;}));
  P.push(mkPart('skirt',-7,-2,14,12,(c,r,w,h)=>{const len=4+((c*7)%5)+(c>3&&c<10?4:0);return r<len?4:0;}));
  Object.assign(BOSS,{kind:'queen',name:'THE RIME QUEEN',aimY:20,parts:P,on:true,dead:false,dying:0,x:W+40,y:40,t:0,phase:0,breath:0,breathT:8,stompT:10,boltT:6,kneel:0,roar:1,regenT:0});
  BOSS.cells0=P.reduce((a,p)=>a+p.n0,0);BOSS.cells=BOSS.cells0;
  BOSS.coreHp0=0;const bo=P[2];for(let i=0;i<bo.kind.length;i++)if(bo.kind[i]===3)BOSS.coreHp0+=bo.hp[i];BOSS.coreHp=BOSS.coreHp0;
  SFX.roar();S.shake=Math.max(S.shake,.7);bigMsg('THE RIME QUEEN','#e0f6ff','BREAK HER CORE BEFORE SHE LANDS');
}
function queenStep(dt,live){
  const B=BOSS,P=B.parts;B.t+=dt;B.roar=Math.max(0,B.roar-dt);
  if(B.dying>0){B.dying+=dt;if(B.dying>2.4)bossShatter();return;}
  if(B.coreHp<=B.coreHp0*.12){B.dying=.01;SFX.roar();S.shake=1.2;S.flash=.6;S.slowT=1.4;return;}
  /* glide in, then hover over the forge and sink, swaying */
  const sink=Math.min(1,Math.max(0,B.t-6)/150),tx=B.t<6?HX+30:HX+Math.sin(B.t*.21)*44,ty=B.t<6?70:lerp(80,HEART.y0-6,sink)+Math.sin(B.t*1.3)*2.5;
  B.x+=(tx-B.x)*Math.min(1,dt*.55);B.y+=(ty-B.y)*Math.min(1,dt*.7);
  const fl=Math.round(Math.sin(B.t*3.2)*2);P[0].dy=fl;P[1].dy=fl;P[3].dy=Math.round(Math.sin(B.t*1.6));
  /* whatever sets inside her body is crushed out; everything near her freezes */
  for(let pi=0;pi<P.length;pi++){const p=P[pi],[ox,oy]=partOrigin(p);
    for(let r=0;r<p.h;r++){const y=oy+r;if(y<GAL||y>H-2)continue;for(let c=0;c<p.w;c++){if(!p.kind[r*p.w+c])continue;const x=ox+c;if(x<1||x>W-2)continue;
      const i=y*W+x,m=M[i];if((KIND[m]===1||KIND[m]===2)&&m!==BED&&m!==HOUSE&&m!==RAIL&&m!==ROCK&&m!==CRYST){M[i]=AIR;wake(x,y);if((r32()&3)===0&&PN<PMAX-40)spawnP(x+.5,y+.5,rnd(-50,50),rnd(-70,-10),RUBBLE,T[i],9,0);}}}}
  const x0=Math.max(1,Math.round(B.x)-30),x1=Math.min(W-2,Math.round(B.x)+30),y0=Math.max(GAL,Math.round(B.y)-52),y1=Math.min(H-2,Math.round(B.y)+12);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*W+x;if(T[i]>-25)T[i]-=dt*(M[i]===LAVA?380:120);}
  wakeBox(x0,y0,x1,y1);
  if(!live)return;
  if(B.y>=HEART.y0-12&&Math.abs(B.x-HX)<32){HEART.latched++;HEART.drain+=dt*6;HEART.hurtT=.2;}
  /* frost breath straight down */
  B.breathT-=dt;if(B.breathT<=0&&P[3].n>P[3].n0*.3){B.breath=1.6;B.breathT=7.5;SFX.breath();}
  if(B.breath>0){B.breath-=dt;const [ox,oy]=partOrigin(P[3]);for(let n=0;n<5;n++)spawnP(ox+8+rnd(-3,3),oy+15,rnd(-70,70),rnd(90,170),SNOW,-20,9,0);if((r32()&1)===0)spawnP(ox+8,oy+15,rnd(-50,50),rnd(100,190),ICE,-25,9,0);}
  /* she calls wisps, and fires frost bolts from her wingtips */
  B.stompT-=dt;if(B.stompT<=0){B.stompT=10;for(let n=0;n<2;n++){const w=spawnEnemy('wisp',n?1:-1,0);if(w){w.x=B.x+(n?20:-20);w.yc=B.y-20;bbox(w);}}SFX.summon();}
  B.boltT-=dt;if(B.boltT<=0&&(P[0].n+P[1].n)>(P[0].n0+P[1].n0)*.25){B.boltT=5.2;spawnBolt(B.x-28,B.y-30);spawnBolt(B.x+28,B.y-30);SFX.cast();}
  /* regrowth where she is not burning */
  B.regenT-=dt;if(B.regenT<=0){B.regenT=.12;const p=P[(Math.random()*P.length)|0];
    if(p.hotT<=0&&p.n<p.n0&&p.n>p.n0*.15){for(let tries=0;tries<24;tries++){const i=(Math.random()*p.kind.length)|0,k0=p.kind0[i];if(p.kind[i]||!k0||k0===3)continue;
      const c=i%p.w,r=(i/p.w)|0;if(!((c>0&&p.kind[i-1])||(c<p.w-1&&p.kind[i+1])||(r>0&&p.kind[i-p.w])||(r<p.h-1&&p.kind[i+p.w])))continue;
      p.kind[i]=k0;p.hp[i]=1;p.n++;B.cells++;break;}}}
  for(const p of P)p.hotT=Math.max(0,p.hotT-dt);
}
/* ---------- the three new stages (after the Hoar King) ---------- */
STAGES.push(
  {name:'THE CALDERA',sub:'THE MOUNTAIN WAKES',seed:83,amb:26,magma:1,tint:[.62,.4,.3],backA:[.045,.026,.02],backB:[.1,.058,.04],cryst:[1.3,.55,.18],ice:[.55,.78,.95],
    floor:[[0,120],[44,128],[90,150],[130,166],[160,170],[190,166],[230,150],[276,128],[320,120]],rough:4,wall:6,
    ledges:[{side:-1,y:78,len:64,th:9},{side:1,y:78,len:64,th:9}],tunnels:[{side:-1,y:119},{side:-1,y:77},{side:1,y:119},{side:1,y:77}],
    pools:[],blobs:[],pillars:[],ncryst:12,iceCoat:0,snow:0,tr:'s2',vents:[{x:104},{x:216}],
    hint:['THE MOUNTAIN WAKES. ITS VENTS','THROW LAVA ON THEIR OWN.','BULWARKS GROW ROOFS OF ICE.'],
    waves:[[2,'skater',-1,0,3,.8],[8,'shard',1,1,4,1],[14,'bulwark',1,0,1,0],[20,'skater',1,0,4,.7],[28,'shard',0,1,5,.8],[34,'bulwark',-1,0,1,0],
      [40,'rime',1,1,1,0],[46,'skater',0,0,6,.5],[56,'bulwark',0,1,2,4],[62,'shard',0,0,8,.5],[72,'rime',-1,0,1,0],[76,'skater',0,1,6,.5]]},
  {name:'OBSIDIAN DEEP',sub:'WHERE THE GLASS GROWS',seed:97,amb:4,magma:.45,tint:[.44,.4,.58],backA:[.028,.024,.04],backB:[.064,.056,.09],cryst:[.7,.35,1.3],ice:[.55,.8,.97],
    floor:[[0,110],[50,116],[92,142],[130,162],[160,166],[196,160],[232,140],[276,116],[320,110]],rough:3,wall:6,
    ledges:[{side:-1,y:68,len:80,th:8},{side:1,y:64,len:70,th:8},{side:-1,y:100,len:34,th:6}],tunnels:[{side:-1,y:109},{side:-1,y:67},{side:1,y:109},{side:1,y:63}],
    pools:[{x0:70,x1:110,d:8},{x0:210,x1:250,d:8}],blobs:[],pillars:[],ncryst:15,iceCoat:.25,snow:0,tr:'s3',
    hint:['SPITTERS PERCH AND FIRE FROST','AT YOUR CRUCIBLE. SKATERS','FREEZE THE WATER THEY CROSS.'],
    waves:[[2,'shard',0,0,4,1],[8,'skater',-1,1,4,.6],[14,'spitter',1,1,1,0],[22,'wisp',0,0,3,1],[28,'skater',1,0,5,.6],[34,'spitter',-1,1,1,0],[42,'rime',0,0,1,0],
      [48,'shard',0,1,7,.55],[56,'spitter',0,1,2,6],[64,'wisp',0,0,4,.8],[70,'bulwark',1,0,1,0],[76,'skater',0,0,8,.45],[86,'rime',0,1,2,3]]},
  {name:'THE WINTER THRONE',sub:'SHE WAKES',seed:111,amb:-14,magma:.12,tint:[.36,.5,.72],backA:[.024,.034,.058],backB:[.06,.086,.13],cryst:[.45,.7,1.5],ice:[.64,.88,1],
    floor:[[0,128],[40,134],[90,154],[130,168],[160,170],[196,164],[246,150],[296,140],[320,138]],rough:2,wall:6,
    ledges:[{side:-1,y:72,len:66,th:8},{side:1,y:72,len:66,th:8}],tunnels:[{side:-1,y:127},{side:-1,y:71},{side:1,y:137},{side:1,y:71}],
    pools:[],blobs:[],pillars:[],ncryst:15,iceCoat:.7,snow:1,tr:'boss',boss:1,
    hint:["THE RIME QUEEN WAS THE KING'S",'MOTHER. SHE COMES FROM ABOVE.','BREAK HER CORE BEFORE SHE LANDS.'],
    waves:[[2,'shard',0,0,4,1],[8,'skater',0,1,4,.7],[12,'QUEEN',1,0,1,0],[26,'shard',-1,0,5,.8],[40,'skater',1,1,4,.6],[54,'spitter',-1,1,1,0],
      [68,'shard',0,0,6,.6],[82,'wisp',0,1,4,.8],[96,'bulwark',-1,0,1,0],[110,'skater',0,0,6,.5],[124,'shard',0,1,8,.5],[140,'rime',0,0,2,4]]}
);
