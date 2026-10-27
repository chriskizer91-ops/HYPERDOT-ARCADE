/* =====================================================================================
   THE MATTER SIMULATION — one cell per LED.
     movement   falling-sand cellular automaton, two passes per tick, bottom-up with a per-pass
                stamp so nothing moves twice; densities decide who displaces whom; liquids
                keep a flow direction and accelerate in free fall; gases rise and expire
     heat       explicit conduction on every cell edge with a pairwise conductance table and
                per-material heat capacity (energy-conserving exchange), buoyant hot air,
                radiative loss to the far wall
     phases     lava crusts to iron (or to glassy slag when water quenched it), iron remelts,
                water boils and steam condenses — both through latent heat accumulators —
                ice and snow melt the same way, cold water freezes
     particles  airborne matter (the pour, splashes, debris, embers) flies ballistically and
                is deposited back into the grid where it lands
   ===================================================================================== */
const AIR=0,ROCK=1,BED=2,RAIL=3,IRON=4,SLAG=5,LAVA=6,WATER=7,STEAM=8,SMOKE=9,ICE=10,SNOW=11,RUBBLE=12,EMBER=13,CRYST=14,HOUSE=15;
const KIND=new Uint8Array(16),DENS=new Uint8Array(16).fill(255),ICAP=new Float32Array(16),LOSS=new Float32Array(16),KP=new Float32Array(256),QP=new Uint8Array(256);
for(const m of [ROCK,BED,RAIL,IRON,SLAG,ICE,CRYST,HOUSE,EMBER])KIND[m]=1;
KIND[SNOW]=KIND[RUBBLE]=2;KIND[LAVA]=KIND[WATER]=3;KIND[STEAM]=KIND[SMOKE]=4;
DENS[AIR]=5;DENS[STEAM]=1;DENS[SMOKE]=2;DENS[WATER]=10;DENS[SNOW]=12;DENS[RUBBLE]=20;DENS[LAVA]=30;
{
  const cap={[AIR]:.25,[ROCK]:1.4,[IRON]:1,[SLAG]:1,[LAVA]:1,[WATER]:3.5,[STEAM]:.6,[SMOKE]:.3,[ICE]:2,[SNOW]:1.2,[RUBBLE]:1.3};
  for(const k in cap)ICAP[k]=1/cap[k];          /* BED, RAIL, CRYST, HOUSE: infinite capacity (held temperatures) */
  const c={[AIR]:.03,[ROCK]:.05,[BED]:.04,[IRON]:.2,[SLAG]:.1,[LAVA]:.19,[WATER]:.15,[STEAM]:.03,[SMOKE]:.02,[ICE]:.12,[SNOW]:.05,[RUBBLE]:.04,[HOUSE]:.08};
  for(let a=0;a<16;a++)for(let b=0;b<16;b++)KP[a<<4|b]=Math.min(c[a]||0,c[b]||0);
  const kp=(a,b,v)=>{KP[a<<4|b]=KP[b<<4|a]=v;};
  kp(LAVA,AIR,.0007);kp(LAVA,IRON,.022);kp(LAVA,SLAG,.012);kp(IRON,AIR,.0011);kp(SLAG,AIR,.0011);kp(ROCK,AIR,.0012);kp(RUBBLE,AIR,.0014);kp(BED,AIR,.001);kp(HOUSE,AIR,.004);
  kp(LAVA,WATER,.2);kp(IRON,WATER,.11);kp(SLAG,WATER,.09);kp(ROCK,WATER,.03);kp(RUBBLE,WATER,.03);
  kp(LAVA,ICE,.13);kp(LAVA,SNOW,.2);kp(IRON,ICE,.09);kp(IRON,SNOW,.15);kp(SLAG,ICE,.06);
  kp(LAVA,ROCK,.001);kp(LAVA,BED,.0008);kp(IRON,ROCK,.0016);kp(SLAG,ROCK,.0014);kp(LAVA,RUBBLE,.003);kp(LAVA,HOUSE,.1);kp(ROCK,ROCK,.03);
  kp(LAVA,STEAM,.004);kp(WATER,AIR,.004);kp(WATER,STEAM,.02);kp(ICE,AIR,.002);kp(SNOW,AIR,.002);kp(ICE,WATER,.08);kp(SNOW,WATER,.1);
  kp(STEAM,AIR,.02);kp(SMOKE,AIR,.02);kp(ICE,ROCK,.02);kp(SNOW,ROCK,.02);
  QP[LAVA<<4|WATER]=1;QP[WATER<<4|LAVA]=2;
  Object.assign(LOSS,{[AIR]:.028,[STEAM]:.008,[SMOKE]:.02,[WATER]:.0004,[ROCK]:.0002,[IRON]:.00025,[SLAG]:.00025,[LAVA]:.00015,[RUBBLE]:.0003});
}
const T_SOLID=1080,T_REMELT=1320,T_SLAGMELT=1460,T_POUR=1560;
/* the grid */
const M=new Uint8Array(N),T=new Float32Array(N),A=new Uint8Array(N),F=new Uint8Array(N),V=new Uint8Array(N),L=new Uint8Array(N),U=new Uint8Array(N);
let AMB_T=18,STAMP=1,PASS=0;
const EV={solid:0,melt:0,boil:0,cond:0,quench:0,splash:0,remelt:0,freeze:0,hiss:0,land:0};
/* xorshift32: the automaton burns a lot of random bits */
let RS=0x9e3779b9;
function r32(){RS^=RS<<13;RS^=RS>>>17;RS^=RS<<5;return RS>>>0;}
const rf=()=>r32()/4294967296;
function setCell(i,m,t){AWAKE[((i/W|0)>>CSH)*NCX+((i%W)>>CSH)]=1;M[i]=m;T[i]=t;A[i]=r32()&255;F[i]=0;V[i]=0;L[i]=m===STEAM?150+(r32()&63):m===SMOKE?90+(r32()&63):0;}
function swp(i,j){let a=M[i];M[i]=M[j];M[j]=a;const f=T[i];T[i]=T[j];T[j]=f;a=A[i];A[i]=A[j];A[j]=a;a=F[i];F[i]=F[j];F[j]=a;a=V[i];V[i]=V[j];V[j]=a;a=L[i];L[i]=L[j];L[j]=a;U[i]=U[j]=STAMP;}
const VMAX=5,WSPREAD=4;
function moveLiquid(i,x,m){
  const d=DENS[m],j=i+W;
  if(DENS[M[j]]<d){
    let v=V[i]+1;if(v>VMAX)v=VMAX;let t=j;
    for(let s=1;s<v;s++){const n=t+W;if(n>=N||DENS[M[n]]>=d)break;t=n;}
    swp(i,t);V[t]=v;return;
  }
  V[i]=0;const r=r32();
  const s0=(r&1)?1:-1;
  for(let q=0;q<2;q++){const s=q?-s0:s0;if(DENS[M[j+s]]<d&&DENS[M[i+s]]<d){swp(i,j+s);return;}}
  let spread=WSPREAD;
  if(m===LAVA){const tt=T[i],fp=tt>1460?222:tt>1300?130:tt>1180?60:24;if(((r>>>8)&255)>fp)return;spread=tt>1400?2:1;}
  let fd=F[i]&3;if(fd===0)fd=(r&2)?1:2;
  const dv=fd===1?-1:1;let t=i,cx=x;
  for(let s=0;s<spread;s++){const nx=cx+dv;if(nx<1||nx>W-2)break;const n=t+dv;if(DENS[M[n]]>=d)break;t=n;cx=nx;if(DENS[M[n+W]]<d)break;}
  if(t!==i){swp(i,t);F[t]=(F[t]&~3)|fd;}else F[i]=(F[i]&~3)|(fd===1?2:1);
}
function movePowder(i,x,m){
  const d=DENS[m],j=i+W;
  if(DENS[M[j]]<d){let v=V[i]+1;if(v>VMAX)v=VMAX;let t=j;for(let s=1;s<v;s++){const n=t+W;if(n>=N||DENS[M[n]]>=d)break;t=n;}swp(i,t);V[t]=v;return;}
  V[i]=0;const r=r32();if((r&255)>(m===SNOW?110:170))return;
  const s0=(r&256)?1:-1;
  for(let q=0;q<2;q++){const s=q?-s0:s0;if(DENS[M[j+s]]<d&&DENS[M[i+s]]<d){swp(i,j+s);return;}}
}
function moveGas(i,x,m,y){
  const d=DENS[m],r=r32(),up=i-W;
  if(y>1&&KIND[M[up]]!==1&&DENS[M[up]]>d&&(r&7)!==0){swp(i,up);return;}
  const s0=(r&8)?1:-1;
  if(y>1)for(let q=0;q<2;q++){const s=q?-s0:s0;const nx=x+s;if(nx<1||nx>W-2)continue;const n=up+s;if(KIND[M[n]]!==1&&DENS[M[n]]>d&&KIND[M[i+s]]!==1){swp(i,n);return;}}
  if(y<GAL&&L[i]>3)L[i]-=3;               /* vapour pressed against the roof thins away */
  const s=(r&16)?1:-1,nx=x+s;if(nx>=1&&nx<=W-2&&M[i+s]===AIR)swp(i,i+s);
}
function simMove(){
  PASS++;STAMP=(STAMP%255)+1;
  for(let y=H-2;y>=1;y--){
    const ltr=((y+PASS)&1)===0,row=y*W;
    for(let k=1;k<W-1;k++){
      const x=ltr?k:W-1-k,i=row+x,m=M[i],kd=KIND[m];
      if(kd<2||U[i]===STAMP)continue;
      if(kd===3)moveLiquid(i,x,m);else if(kd===2)movePowder(i,x,m);else moveGas(i,x,m,y);
    }
  }
}
/* the heat pass: every cell exchanges with its right and lower neighbour (so each edge once),
   then loses a little toward ambient, then is checked for a change of phase */
function exch(i,j,m,mj,k){const dT=(T[j]-T[i])*k;T[i]+=dT*ICAP[m];T[j]-=dT*ICAP[mj];}
/* chunks of 8x8 cells sleep once they reach thermal steady state (no cell changing by more than
   0.06 degrees a tick, no vapour); any write from outside the automaton wakes its chunk */
const CSH=3,CHK=1<<CSH,NCX=W/CHK,NCY=Math.ceil(H/CHK),AWAKE=new Uint8Array(NCX*NCY).fill(1),ACT=new Uint8Array(NCX*NCY);
function wake(x,y){if(x>=0&&x<W&&y>=0&&y<H)AWAKE[(y>>CSH)*NCX+(x>>CSH)]=1;}
function wakeBox(x0,y0,x1,y1){for(let cy=Math.max(0,y0>>CSH);cy<=Math.min(NCY-1,y1>>CSH);cy++)for(let cx=Math.max(0,x0>>CSH);cx<=Math.min(NCX-1,x1>>CSH);cx++)AWAKE[cy*NCX+cx]=1;}
let HEATN=0;
function simHeat(){
  const ta=AMB_T;
  for(let cy=0;cy<NCY;cy++)for(let cx=0;cx<NCX;cx++){const c=cy*NCX+cx;
    ACT[c]=AWAKE[c]|(cx>0?AWAKE[c-1]:0)|(cx<NCX-1?AWAKE[c+1]:0)|(cy>0?AWAKE[c-NCX]:0)|(cy<NCY-1?AWAKE[c+NCX]:0);}
  HEATN=0;
  for(let cy=0;cy<NCY;cy++){const y0=Math.max(1,cy*CHK),y1=Math.min(H-2,cy*CHK+CHK-1);
   for(let cx=0;cx<NCX;cx++){const c=cy*NCX+cx;if(!ACT[c])continue;HEATN++;
    const x0=Math.max(1,cx*CHK),x1=Math.min(W-2,cx*CHK+CHK-1);let dev=0;
    for(let y=y0;y<=y1;y++){const row=y*W;
    for(let x=x0;x<=x1;x++){
      const i=row+x,m=M[i],t0=T[i];
      let j=i+1,mj=M[j],pk=m<<4|mj,k=KP[pk];
      if(k>0){exch(i,j,m,mj,k);if(QP[pk])quench(i,j,QP[pk]);}
      j=i+W;mj=M[j];pk=m<<4|mj;k=KP[pk];
      if(m===AIR&&mj===AIR&&T[j]>T[i]+2)k=.11;           /* buoyancy: hot air below rises through cool air above */
      if(k>0){exch(i,j,m,mj,k);if(QP[pk])quench(i,j,QP[pk]);}
      let t=T[i];const ls=LOSS[m];if(ls>0){t+=(ta-t)*ls;if(m===AIR&&t-ta<9&&ta-t<9)t=ta;T[i]=t;}   /* air within 9 degrees of ambient settles: lets chunks sleep */
      const d=t>t0?t-t0:t0-t;if(d>dev)dev=d;
      switch(m){
        case LAVA:if(t<T_SOLID){M[i]=(F[i]&4)?SLAG:IRON;EV.solid++;}break;
        case IRON:if(t>T_REMELT){M[i]=LAVA;F[i]&=~4;EV.remelt++;}break;
        case SLAG:if(t>T_SLAGMELT){M[i]=LAVA;F[i]&=~4;}break;
        case WATER:
          if(t>100){let l=L[i]+((t-100)*.3|0)+1;T[i]=100;if(l>=110){M[i]=STEAM;T[i]=108;L[i]=150+(r32()&63);EV.boil++;}else L[i]=l;}
          else if(t<-2){M[i]=ICE;L[i]=0;EV.freeze++;}
          break;
        case ICE:case SNOW:
          if(t>.5){let l=L[i]+((t-.5)*.5|0)+1;T[i]=.5;if(l>=(m===ICE?70:22)){M[i]=WATER;T[i]=1;L[i]=0;V[i]=0;EV.melt++;}else L[i]=l;}
          break;
        case STEAM:case SMOKE:{dev=99;
          const l=L[i];if(l<=1){if(m===STEAM&&t<96&&(r32()&3)===0){M[i]=WATER;T[i]=70;L[i]=0;EV.cond++;}else{M[i]=AIR;}}
          else{L[i]=l-1;if(m===STEAM&&t<62&&(r32()&63)===0){M[i]=WATER;L[i]=0;EV.cond++;}}
          break;}
      }
    }}
    AWAKE[c]=dev>.06?1:0;
  }}
}
/* lava meeting water: the lava remembers it was quenched (it will set as glassy slag) and the water
   flashes to a burst of steam spray now and then */
function quench(i,j,q){
  const li=q===1?i:j,wi=q===1?j:i;F[li]|=4;EV.quench++;
  if((r32()&31)===0&&PN<PMAX-8){const x=wi%W,y=(wi/W)|0;spawnP(x+.5,y+.5,rnd(-40,40),rnd(-110,-50),STEAM,108,rnd(.4,.9),0);EV.hiss++;}
}
/* ---------- particles: struct-of-arrays, swap-remove ---------- */
const PMAX=4096,PX=new Float32Array(PMAX),PY=new Float32Array(PMAX),PVX=new Float32Array(PMAX),PVY=new Float32Array(PMAX),PT=new Float32Array(PMAX),PL=new Float32Array(PMAX),PM=new Uint8Array(PMAX),PF=new Uint8Array(PMAX),POX=new Float32Array(PMAX),POY=new Float32Array(PMAX);
let PN=0;const GRAV=330;
const PF_POUR=1,PF_HURT=2,PF_SPLASHED=4;
function spawnP(x,y,vx,vy,m,t,life,fl){if(PN>=PMAX)return -1;const k=PN++;PX[k]=POX[k]=x;PY[k]=POY[k]=y;PVX[k]=vx;PVY[k]=vy;PM[k]=m;PT[k]=t;PL[k]=life||9;PF[k]=fl||0;return k;}
function killP(k){const e=--PN;if(k!==e){PX[k]=PX[e];PY[k]=PY[e];PVX[k]=PVX[e];PVY[k]=PVY[e];PT[k]=PT[e];PL[k]=PL[e];PM[k]=PM[e];PF[k]=PF[e];POX[k]=POX[e];POY[k]=POY[e];}}
/* what stops a particle of material m */
function pBlock(m,c){const k=KIND[c];if(m===EMBER||m===STEAM||m===SMOKE)return k!==0&&k!==4;return k===1||k===2||k===3;}
let PHIT=null;                 /* the world installs a hook: (k,x,y) -> true when an entity caught the particle */
/* drop particle k into the grid at the last free cell it passed through */
function deposit(k,lx,ly){
  const m=PM[k];if(m===EMBER)return;
  let i=ly*W+lx;
  for(let s=0;s<4&&KIND[M[i]]!==0&&KIND[M[i]]!==4;s++){i-=W;if(i<W)return;}
  if(KIND[M[i]]!==0&&KIND[M[i]]!==4)return;
  setCell(i,m,PT[k]);
  if(KIND[m]===3){F[i]=PVX[k]<-8?1:PVX[k]>8?2:0;V[i]=Math.min(VMAX,Math.max(0,PVY[k]/70|0));}
  EV.land++;
}
function stepParticles(dt){
  for(let k=0;k<PN;k++){
    const m=PM[k];let x=PX[k],y=PY[k],vx=PVX[k],vy=PVY[k];POX[k]=x;POY[k]=y;
    if(m===EMBER){vy-=55*dt;vx*=.985;vy*=.985;PT[k]-=dt*520;PL[k]-=dt;if(PL[k]<=0||PT[k]<500){killP(k);k--;continue;}}
    else if(m===STEAM||m===SMOKE){vy-=70*dt;vx*=.94;vy*=.94;PL[k]-=dt;
      if(PL[k]<=0){const cx=x|0,cy=y|0;if(cx>0&&cx<W-1&&cy>0&&cy<H-1){const i=cy*W+cx;if(M[i]===AIR)setCell(i,m,PT[k]);}killP(k);k--;continue;}}
    else if(m===SNOW){vy+=GRAV*.1*dt;vx+=Math.sin((y+k)*.3)*12*dt;vx*=.97;if(vy>45)vy=45;}
    else vy+=GRAV*dt;
    if(m===LAVA&&PT[k]<T_SOLID)PM[k]=IRON;
    const nx=x+vx*dt,ny=y+vy*dt,dx=nx-x,dy=ny-y,steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
    let lx=x|0,ly=y|0,hit=0;
    for(let s=1;s<=steps;s++){
      const fx=x+dx*s/steps,fy=y+dy*s/steps,cx=fx|0,cy=fy|0;
      if(cx<1||cx>W-2||cy<1||cy>H-2){hit=2;break;}
      if(PHIT&&PHIT(k,fx,fy)){hit=3;break;}
      const ci=cy*W+cx,cm=M[ci];
      /* molten drops sink through water, flashing it to steam on the way and losing heat */
      if(m===LAVA&&cm===WATER){M[ci]=STEAM;T[ci]=110;L[ci]=120+(r32()&63);AWAKE[(cy>>CSH)*NCX+(cx>>CSH)]=1;PT[k]-=140;vx*=.7;vy*=.55;EV.hiss++;EV.boil++;if(PT[k]<T_SOLID){PM[k]=SLAG;}lx=cx;ly=cy;continue;}
      if(pBlock(m,cm)){hit=1;break;}
      lx=cx;ly=cy;
    }
    if(hit===3){killP(k);k--;continue;}
    if(hit===1){
      const sp=Math.abs(vy)+Math.abs(vx)*.5;
      /* a fast drop landing in a pool throws a little of itself back up */
      if((m===LAVA||m===WATER)&&sp>150&&!(PF[k]&PF_SPLASHED)&&(r32()&3)===0&&PN<PMAX-4){
        const q=spawnP(lx+.5,ly+.2,vx*.3+rnd(-50,50),-sp*rnd(.18,.34),m,PT[k]-20,9,PF_SPLASHED);EV.splash++;
        if(m===LAVA&&(r32()&1))spawnP(lx+.5,ly,rnd(-60,60),rnd(-120,-40),EMBER,1350,rnd(.3,.8),0);}
      if(m===LAVA&&sp>120&&(r32()&7)===0)spawnP(lx+.5,ly,rnd(-50,50),rnd(-100,-30),EMBER,1400,rnd(.25,.7),0);
      deposit(k,lx,ly);killP(k);k--;continue;
    }
    if(hit===2){killP(k);k--;continue;}
    PX[k]=nx;PY[k]=ny;PVX[k]=vx;PVY[k]=vy;
    if(m===LAVA)PT[k]-=dt*24;
  }
}
/* ---------- big events ---------- */
/* a slag bomb: carves the player's own iron and ice, lifts liquids into spray, scorches everything */
function explode(cx,cy,r,heat){
  const r2=r*r;wakeBox(cx-r,cy-r,cx+r,cy+r);
  for(let y=Math.max(1,cy-r|0);y<=Math.min(H-2,cy+r|0);y++)for(let x=Math.max(1,cx-r|0);x<=Math.min(W-2,cx+r|0);x++){
    const dx=x-cx,dy=y-cy,d2=dx*dx+dy*dy;if(d2>r2)continue;const i=y*W+x,m=M[i],f=1-Math.sqrt(d2)/r,d=Math.sqrt(d2)||1;
    T[i]+=heat*f*ICAP[m]*.5;
    if(m===IRON||m===SLAG||m===ICE||m===SNOW||m===RUBBLE||(m===ROCK&&f>.45&&(r32()&3)!==0)){
      if((r32()&1)===0)spawnP(x+.5,y+.5,dx/d*rnd(90,220)*f,dy/d*rnd(90,220)*f-rnd(40,120),m===ICE||m===SNOW?WATER:RUBBLE,Math.max(T[i],300),9,0);
      M[i]=AIR;T[i]=Math.max(T[i],400*f);L[i]=0;}
    else if(KIND[m]===3&&(r32()&1)===0){spawnP(x+.5,y+.5,dx/d*rnd(80,200),dy/d*rnd(60,160)-rnd(60,160),m,T[i],9,0);M[i]=AIR;}
    else if(m===AIR&&f>.3&&(r32()&7)===0)setCell(i,SMOKE,500);
  }
  for(let n=0;n<70;n++){const a=rnd(-Math.PI,0),s=rnd(60,260);spawnP(cx+rnd(-2,2),cy+rnd(-2,1),Math.cos(a)*s,Math.sin(a)*s,LAVA,T_POUR-60,9,0);}
  for(let n=0;n<40;n++){const a=rnd(0,TAU),s=rnd(40,200);spawnP(cx,cy,Math.cos(a)*s,Math.sin(a)*s-60,EMBER,1500,rnd(.3,1.1),0);}
}
/* ---------- build the GPU's view: cell state + particles stamped as short streaks ---------- */
function stampState(){
  const S8=SBUF;
  for(let i=0,o=0;i<N;i++,o+=4){const m=M[i];S8[o]=m;S8[o+1]=(T[i]+40)*.125;S8[o+2]=A[i];S8[o+3]=L[i];}
  for(let k=0;k<PN;k++){
    const m=PM[k],x1=PX[k],y1=PY[k],x0=POX[k],y0=POY[k],dx=x1-x0,dy=y1-y0;
    const n=Math.min(7,Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy)))));
    const tb=(PT[k]+40)*.125;
    for(let s=0;s<n;s++){const cx=(x0+dx*(s+1)/n)|0,cy=(y0+dy*(s+1)/n)|0;if(cx<0||cx>=W||cy<0||cy>=H)continue;const i=cy*W+cx;
      if(KIND[M[i]]!==0&&KIND[M[i]]!==4)continue;const o=i*4;S8[o]=m===SMOKE?SMOKE:m;S8[o+1]=s===n-1?tb:tb-6;S8[o+2]=(k*37)&255;S8[o+3]=0;}
  }
}
function clearGrid(){AWAKE.fill(1);M.fill(AIR);T.fill(AMB_T);F.fill(0);V.fill(0);L.fill(0);U.fill(0);for(let i=0;i<N;i++)A[i]=r32()&255;PN=0;}
