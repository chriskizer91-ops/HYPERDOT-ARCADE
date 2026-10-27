/* =====================================================================================
   9. SKY STACK — the stacking prize game, on a board of incandescent lamps.
      Nothing in this section writes a colour. The game is a lamp CONTROLLER: each tick it closes
      circuits, writing a drive level (fraction of rated voltage, 0..1.15) and a glass colour for
      every bulb into DRV / GQ (compose). The FILAMENT model then integrates each bulb's temperature
      (lampsStep), and render() turns temperature into light through a Planck lookup table. Text,
      chases, sparks, the tower, the fireworks: all of it is filaments, so everything warms up,
      cools down, shifts from orange to white and glows on after it is switched off.
   ===================================================================================== */

/* ---------- 9.1 FILAMENTS --------------------------------------------------------------------
   u = filament temperature as a fraction of the rated 2900 K; the room is 300 K (u = .105).
   Steady state: electrical power V^2/R(T), with tungsten's R ~ T^1.2, balances radiation ~ T^4,
   so u_eq = V^(2/5.2). The approach is a first-order lag, asymmetric for physical reasons:
     heating  is forced by the supply, and cold tungsten has 1/15 of its hot resistance, so the
              inrush current is huge: a short constant TAU_HEAT;
     cooling  is radiation alone, whose rate falls as T^3 as the filament cools (linearised
              Stefan-Boltzmann): TAU_COOL/u^3, which stretches into the long, dim orange tail
              you see when a bulb is switched off - the afterglow.
   Light and colour come from the temperature: intensity from Planck's law at 580 nm, chromaticity
   from a blackbody fit, white-balanced so a lamp at full voltage reads warm white. Visible output
   rises like T^8, which is why a dimmed lamp is so much more orange than it is darker.          */
const U0=.105,TREF=2900,TAU_HEAT=.0095,TAU_COOL=.165,U_DARK=.44,SAG=.035,LAT_T=2;
const UEQN=300,UEQS=200,UEQ=new Float32Array(UEQN);for(let i=0;i<UEQN;i++)UEQ[i]=Math.max(U0,Math.pow(i/UEQS,1/2.6));
const LUTN=1024,UMAX=1.08,LUTS=(LUTN-1)/(UMAX-U0);
const RINV=new Float32Array(LUTN);for(let k=0;k<LUTN;k++)RINV[k]=Math.pow(U0+k/LUTS,-1.2);   // current ~ V/R(T)
/* glass: linear transmission + a gain that buys back what tinted glass absorbs (blue glass eats most of a warm filament) */
const GLS=[[1,1,1,1],[1,.40,.045,1.2],[1,.022,.012,1.45],[.035,1,.10,1.6],[.03,.16,1,2.6],[1,.72,.24,1.08],[1,.09,.36,1.35],[.03,.5,1,2.1]];
const G_CLR=0,G_AMB=1,G_RED=2,G_GRN=3,G_BLU=4,G_GLD=5,G_PNK=6,G_CYN=7;
const LUT=new Uint32Array(GLS.length*LUTN);
(()=>{
  const pl=(l,T)=>1/(Math.pow(l,5)*(Math.exp(14388/(l*T))-1));          // Planck radiance, l in um (constants cancel in ratios)
  const chroma=T=>{const t=T/100,cg=t>1?clamp(99.4708*Math.log(t)-161.1196,0,255):0,cb=T<=1900?0:clamp(138.5177*Math.log(t-10)-305.0448,0,255);
    return [1,Math.pow(cg/255,2.2),Math.pow(cb/255,2.2)];};
  const c0=chroma(TREF),WB=[1,Math.pow(225/255,2.2)/c0[1],Math.pow(182/255,2.2)/c0[2]],ref=pl(.58,TREF),EXPO=.86;
  for(let k=0;k<LUTN;k++){const T=(U0+k/LUTS)*TREF,I=pl(.58,T)/ref*EXPO,ch=chroma(T);
    for(let q=0;q<GLS.length;q++){const G=GLS[q],v=c=>255*Math.pow(Math.min(1,I*ch[c]*WB[c]*G[c]*G[3]),1/2.2);LUT[q*LUTN+k]=pack(v(0),v(1),v(2));}}
})();
/* drive levels the controller uses (light output ~ drive^3.4, so these are far apart in brightness) */
const D_EMB=.38,D_DIM=.56,D_MID=.72,D_ON=.84,D_HOT=1,D_FL=1.13;
let NB=0,TEMP=null,DRV=null,GQ=null,GLASS=null;
const SUP={v:1,i:0};               // the lamp supply: voltage (sags a hair under inrush) and mean current per bulb
function lampsAlloc(){NB=W*H;TEMP=new Float32Array(NB).fill(U0);DRV=new Float32Array(NB);GQ=new Uint8Array(NB);GLASS=new Uint8Array(NB);}
RESCB.push(lampsAlloc);
function lampsStep(dt){
  const kh=1-Math.exp(-dt/TAU_HEAT),kc=dt/TAU_COOL,V=SUP.v;let I=0;
  for(let i=0;i<NB;i++){
    const d=DRV[i];let u=TEMP[i];
    if(d>0){
      GLASS[i]=GQ[i];                                   // a powered bulb shows its glass; a dark one keeps the last (afterglow keeps its tint)
      let q=(d*V*UEQS+.5)|0;if(q>=UEQN)q=UEQN-1;const ue=UEQ[q];
      if(ue>=u)u+=(ue-u)*kh;                            // exact exponential step: stable at any dt
      else{const x=kc*u*u*u;u+=(ue-u)*x/(1+.5*x);}      // radiative cooling, Pade(1,1) of 1-e^-x
      let k=((u-U0)*LUTS)|0;if(k>=LUTN)k=LUTN-1;I+=d*V*RINV[k];
    }else{
      if(u<=U0)continue;
      if(u<U_DARK)u=U0;                                 // below ~1280 K nothing visible is emitted: let it rest
      else{const x=kc*u*u*u;u+=(U0-u)*x/(1+.5*x);}
    }
    TEMP[i]=u;
  }
  SUP.i=I/NB;const tv=Math.max(.86,1-SAG*SUP.i);SUP.v+=(tv-SUP.v)*.5;
}

/* ---------- 9.2 THE LAMP CONTROLLER: drive primitives ---------- */
const CLIP={x0:0,y0:0,x1:1,y1:1};
function clipAll(){CLIP.x0=0;CLIP.y0=0;CLIP.x1=W;CLIP.y1=H;}
function clipTo(x,y,w,h){CLIP.x0=Math.max(0,x);CLIP.y0=Math.max(0,y);CLIP.x1=Math.min(W,x+w);CLIP.y1=Math.min(H,y+h);}
/* close one circuit; overlapping sources keep the strongest (and its glass) */
function dset(x,y,d,q){if(!(d>0)||x<CLIP.x0||y<CLIP.y0||x>=CLIP.x1||y>=CLIP.y1)return;const i=y*W+x;if(d>DRV[i]){DRV[i]=d;GQ[i]=q;}}
function dclr(x,y,w,h){const x0=Math.max(0,x),x1=Math.min(W,x+w);if(x1<=x0)return;for(let j=Math.max(0,y),j1=Math.min(H,y+h);j<j1;j++)DRV.fill(0,j*W+x0,j*W+x1);}
function dmul(k){for(let i=0;i<NB;i++)DRV[i]*=k;}
/* a light source between bulbs shares its LIGHT (not its voltage) over the 4 nearest: light ~ V^3.4, so a share w needs w^0.3 of the drive */
function dsplat(fx,fy,d,q){const ax0=fx-.5,ay0=fy-.5,x0=Math.floor(ax0),y0=Math.floor(ay0),ax=ax0-x0,ay=ay0-y0;
  dset(x0,y0,d*Math.pow((1-ax)*(1-ay),.3),q);dset(x0+1,y0,d*Math.pow(ax*(1-ay),.3),q);dset(x0,y0+1,d*Math.pow((1-ax)*ay,.3),q);dset(x0+1,y0+1,d*Math.pow(ax*ay,.3),q);}
/* text as lamps. f = 3 (3x5) or 5 (5x7); al 'c' centres on x, 'r' puts the right edge on x; mod(x,y) scales the drive per lamp */
function twid(s,f,sc=1){return f===5?tw5(s,sc):tw3(s,sc);}
function dtxt(s,x,y,d,q,f=3,al,sc=1,mod){
  const w=twid(s,f,sc);if(al==='c')x=Math.round(x-w/2);else if(al==='r')x=x-w+1;
  for(const ch of s){
    if(f===5){const gg=G5[ch]||G5[ch.toUpperCase()]||G5[' '];for(let r=0;r<7;r++)for(let c=0;c<5;c++)if((gg[r]>>(4-c))&1)dblk(x+c*sc,y+r*sc,sc,d,q,mod);x+=6*sc;}
    else{const gg=G3[ch]||G3[ch.toUpperCase()];if(!gg){x+=4*sc;continue;}for(let r=0;r<5;r++)for(let c=0;c<gg[r].length;c++)if(gg[r][c]==='1')dblk(x+c*sc,y+r*sc,sc,d,q,mod);x+=(gg[0].length+1)*sc;}
  }
  return w;
}
function dblk(x,y,sc,d,q,mod){for(let j=0;j<sc;j++)for(let i=0;i<sc;i++){const a=x+i,b=y+j;dset(a,b,mod?d*mod(a,b):d,q);}}
/* lamp-pattern icons (rows of 0/1) */
const ICON={tkt:['11111','01110','11111'],up:['00100','01110','11011'],aL:['01','11','01'],aR:['10','11','10']};
function dico(n,x,y,d,q){const b=ICON[n];for(let r=0;r<b.length;r++)for(let c=0;c<b[r].length;c++)if(b[r][c]==='1')dset(x+c,y+r,d,q);}

/* ---------- 9.3 BOARD LAYOUT (recomputed per lamp board) ----------
   Every board keeps the same 7 x 15 tower, one lamp per cell, sitting on the bottom frame; the
   rows above it become a header sign when there are at least 5, and the sides become panels. */
const TCOLS=7,TROWS=15,MINOR=10,MAJOR=15,TK_ROW=5,TK_MINOR=60,TK_MAJOR=500;
const LY={};
const TY=r=>LY.ty+TROWS-r;               // matrix row of tower row r (1 = bottom; fractional r is fine for falling lamps)
let PN=0,PX=null,PY=null,PG=null,PDT=null,PDB=null,SPK=null;
function layoutBoard(){
  LY.tx=(W-TCOLS)>>1;LY.ty=H-1-TROWS;LY.crown=LY.ty-1;LY.rl=LY.tx-1;LY.rr=LY.tx+TCOLS;
  const hh=LY.crown-1;
  LY.hdr=hh>=5?{x:1,y:1,w:W-2,h:hh,f:hh>=7?5:3}:null;
  LY.rib={x:1,y:(H>>1)-3,w:W-2,h:7,f:3};                           // message ribbon for boards without a header
  LY.tcols=W>=41?[2,3,W-4,W-3]:[2,W-3];                           // ticket strips on the results board
  LY.pl={x:1,y:LY.crown,w:LY.rl-1,h:H-1-LY.crown};
  LY.pr={x:LY.rr+1,y:LY.crown,w:W-2-LY.rr,h:H-1-LY.crown};
  /* the marquee frame: every edge lamp, clockwise from the top-left corner */
  PN=2*W+2*H-4;PX=new Int16Array(PN);PY=new Int16Array(PN);PG=new Uint8Array(PN);PDT=new Float32Array(PN);PDB=new Float32Array(PN);SPK=new Float32Array(PN);
  let k=0;for(let x=0;x<W;x++){PX[k]=x;PY[k++]=0;}for(let y=1;y<H;y++){PX[k]=W-1;PY[k++]=y;}for(let x=W-2;x>=0;x--){PX[k]=x;PY[k++]=H-1;}for(let y=H-2;y>=1;y--){PX[k]=0;PY[k++]=y;}
  const it=W>>1,ib=2*W+H-3-(W>>1);
  for(let i=0;i<PN;i++){const a=Math.abs(i-it),b=Math.abs(i-ib);PDT[i]=Math.min(a,PN-a);PDB[i]=Math.min(b,PN-b);
    const corner=(PX[i]===0||PX[i]===W-1)&&(PY[i]===0||PY[i]===H-1);PG[i]=corner?G_RED:(i&1)?G_AMB:G_CLR;}
}
RESCB.push(layoutBoard);

/* ---------- 9.4 MARQUEE CHASES on the frame lamps ----------
   ph advances at `rate` steps per second (or is stepped by the game: in play the frame is clocked by the
   moving row's own relay). Patterns: run (every third lamp, the theatre marquee), wig (wig-wag pairs),
   comet (k smooth runners: the filament lag draws their tails), twin (two runners racing up both sides),
   bounce, fill / drain (from the top centre), strobe, steady (standby embers); sparkle overlays any of them. */
const CH={pat:'run',ph:0,rate:6,step:0,t:0,lv:1,clk:0,spark:0,k:4,fill:0};
function chase(p,rate,lv=1,clk=0,spark=0,k=4){if(CH.pat!==p){CH.pat=p;CH.t=0;}CH.rate=rate;CH.lv=lv;CH.clk=clk;CH.spark=spark;CH.k=k;}
function chaseTick(dt){
  CH.t+=dt;CH.ph+=dt*CH.rate;const s=Math.floor(CH.ph);if(s!==CH.step){CH.step=s;if(CH.clk)SFX.chase();}
  for(let i=0;i<PN;i++)if(SPK[i]>0)SPK[i]-=dt*5;
  let n=CH.spark*dt;while(n>0){if(Math.random()<n)SPK[(Math.random()*PN)|0]=1;n-=1;}
}
function fr(i,d){if(d>0){i=((i%PN)+PN)%PN;dset(PX[i],PY[i],d,PG[i]);}}
function frs(p,d){const i=Math.floor(p),a=p-i;fr(i,d*Math.pow(1-a,.3));fr(i+1,d*Math.pow(a,.3));}
function drawFrame(){
  const s=CH.step,lv=CH.lv,P=CH.pat,half=PN/2;
  if(P==='run'){for(let i=0;i<PN;i++)if((i+s)%3===0)fr(i,D_HOT*lv);}
  else if(P==='wig'){for(let i=0;i<PN;i++)if(((i>>1)+s)&1)fr(i,D_HOT*lv);}
  else if(P==='comet'){for(let k=0;k<CH.k;k++)frs((CH.ph+k*PN/CH.k)%PN,D_FL*lv);}
  else if(P==='twin'){const p=CH.ph%half;for(let i=0;i<PN;i++){const dd=Math.abs(PDB[i]-p);if(dd<2.2)fr(i,D_FL*lv*(1-dd*.18));}}
  else if(P==='bounce'){const p=Math.abs(((CH.ph/half)%2)-1)*half;for(let i=0;i<PN;i++)if(Math.abs(PDB[i]-p)<2)fr(i,D_FL*lv);}
  else if(P==='fill'){for(let i=0;i<PN;i++)if(PDT[i]<CH.fill)fr(i,D_ON*lv);}
  else if(P==='drain'){const lim=(1-CH.fill)*half;for(let i=0;i<PN;i++)if(PDT[i]>=lim)fr(i,((i+s)%3===0?D_FL:D_MID)*lv);}
  else if(P==='strobe'){if(s&1)for(let i=0;i<PN;i++)fr(i,D_FL*lv);}
  else if(P==='steady'){for(let i=0;i<PN;i++)fr(i,D_EMB*lv);}
  for(let i=0;i<PN;i++)if(SPK[i]>0)fr(i,D_FL*Math.min(1,SPK[i]*1.4));
}

/* ---------- 9.5 MESSAGES — designed for very few lamps ----------
   A message picks its own form for the space it gets: centred if it fits, word-by-word (like a sign
   relay-switching its words) if every word fits, otherwise a scrolling marquee. */
const SCR=11;                                    // marquee speed, lamps per second
const MS={on:false,s:'',q:0,kind:'',t:0,dur:0,pri:0,d:D_HOT};
function msgArea(){return LY.hdr||LY.rib;}
const WSPLIT=new Map(),MKIND=new Map();
const words=s=>{let v=WSPLIT.get(s);if(!v){if(WSPLIT.size>300)WSPLIT.clear();v=s.split(' ');WSPLIT.set(s,v);}return v;};   // cached: no per-tick allocation
function msgKind(s,A){const key=A.f*1000+A.w;let m=MKIND.get(key);if(!m){m=new Map();MKIND.set(key,m);}let v=m.get(s);if(v)return v;
  if(twid(s,A.f)<=A.w)v='flash';else{const ws=words(s);v=ws.length<=4&&ws.every(w=>twid(w,A.f)<=A.w)?'words':'scroll';}if(m.size>300)m.clear();m.set(s,v);return v;}
function msgDur(s,kind,A,dur){return kind==='scroll'?(twid(s,A.f)+A.w)/SCR:kind==='words'?Math.max(dur,words(s).length*.62):dur;}
function msg(s,q,dur=1.4,pri=1,kind){if(MS.on&&MS.pri>pri)return;const A=msgArea();kind=kind||msgKind(s,A);Object.assign(MS,{on:true,s,q,kind,t:0,dur:msgDur(s,kind,A,dur),pri,d:pri>=2?D_HOT:D_ON+.06});}
function msgTick(dt){if(MS.on){MS.t+=dt;if(MS.t>=MS.dur)MS.on=false;}}
/* draw string s into area A in the given form at time t */
function drawText(A,s,kind,t,d,q,mod){
  const f=A.f,gh=f===5?7:5,y=A.y+((A.h-gh)>>1);
  clipTo(A.x,A.y,A.w,A.h);
  if(kind==='scroll')dtxt(s,A.x+A.w-Math.floor(t*SCR),y,d,q,f,null,1,mod);
  else if(kind==='words'){const ws=words(s),k=Math.floor(t/.62);if(t-k*.62<.52)dtxt(ws[k%ws.length],A.x+(A.w>>1),y,d,q,f,'c',1,mod);}
  else if(kind!=='flash'||t>.6||(t%.2)<.13)dtxt(s,A.x+(A.w>>1),y,d,q,f,'c',1,mod);
  clipAll();
}
/* a highlight band sweeping left to right across text: the controller overdrives a few columns at a time */
let SWX=0;const sweepMod=(x,y)=>{const dx=x-y*.5-SWX;return dx>-2&&dx<2?1.22:1;};
/* the header sign (or, on the big-bulb board, a ribbon across the middle for important messages) */
function drawSign(def,defQ,defMod){
  const A=LY.hdr;
  if(A){if(MS.on)drawText(A,MS.s,MS.kind,MS.t,MS.d,MS.q);else if(def){const k=msgKind(def,A);drawText(A,def,k==='flash'?'static':k,S.t,D_ON-.04,defQ,defMod);}return;}
  if(MS.on&&MS.pri>=2){const R=LY.rib;dclr(R.x,R.y,R.w,R.h);drawText(R,MS.s,MS.kind,MS.t,MS.d,MS.q);}
}

/* ---------- 9.6 GAME STATE & RULES ---------- */
const S={mode:'title',ph:'',t:0,pt:0,k:0,score:0,dscore:0,hi:parseInt(store.get('hd-'+CAB.id+'-hi','0'),10)||0,row:1,stack:[],mv:null,land:null,
  fall:[],spk:[],rk:[],tickets:0,demo:true,paused:false,perfects:0,newHi:false,shake:0,dec:null,outcome:'',wait:0};
const AT={ph:'boot',t:0,n:0,k:0,booted:false};          // attract-mode sequencer
const BOT={plan:null,sig:.026,go:.5,hes:.18,decAt:0};   // the autopilot (attract demo, and the soak test)
const AUTO={on:false,sig:.02,go:.5};
const RES={t:0,total:0,shown:0,rate:1,off:0,score:0,rows:0,outcome:'',newHi:false};
/* the row's step time: 150 ms on the floor, ~52 ms at the top */
const stepTime=r=>.150-.098*Math.pow((r-1)/(TROWS-1),.85);
/* tower glass climbs from a sunset into the sky: red, amber, gold, the green minor row, cyan and blue, then a white-hot top */
const ROWG=[0,G_RED,G_RED,G_RED,G_AMB,G_AMB,G_AMB,G_GLD,G_GLD,G_GLD,G_GRN,G_CYN,G_CYN,G_BLU,G_BLU,G_CLR];
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v);}
function sweep(a,keep){let j=0;for(let i=0;i<a.length;i++){const o=a[i];if(keep(o))a[j++]=o;}a.length=j;}
function newRun(demo){Object.assign(S,{t:0,pt:0,k:0,score:0,dscore:0,row:1,stack:[],mv:null,land:null,fall:[],spk:[],rk:[],tickets:0,demo,perfects:0,streak:0,newHi:false,shake:0,dec:null,outcome:'',wait:0});
  MS.on=false;BOT.plan=null;setPh('intro');}
function busLevel(){if(AU.sfx&&AU.ctx)AU.sfx.gain.setTargetAtTime(S.mode==='title'?.42:.85,AU.ctx.currentTime,.08);}
function APP_start(){AT.booted=true;newRun(false);S.mode='play';setPause(false);setTrack('play');busLevel();SFX.confirm();SFX.relay(1.3);}
function APP_attract(){S.mode='title';newRun(true);atGo(AT.booted?'logo':'boot');setTrack('title');busLevel();}
function setPh(p){S.ph=p;S.pt=0;S.k=0;
  if(p==='intro')chase('fill',0);
  else if(p==='move'||p==='land'||p==='settle'||p==='climb')chase('run',0,.85);
  else if(p==='minor')chase('twin',30,1,0,10);
  else if(p==='decide')chase('drain',3);
  else if(p==='take')chase('comet',40,1,0,14,6);
  else if(p==='major')chase('comet',55,1,0,40,8);
  else if(p==='fail')chase('strobe',7);
}
function spawnRow(){
  const r=S.row,prev=r>1?S.stack[r-2]:null,w=Math.min(prev?prev.w:3,r>MINOR?2:3),fromL=Math.random()<.5;
  S.mv={x:fromL?0:TCOLS-w,w,dir:fromL?1:-1,acc:0,st:stepTime(r),age:0,hist:new Int8Array(8),hn:0};S.mv.hist.fill(S.mv.x);
  TRACKS.play.bpm=114+r*4;BOT.plan=null;setPh('move');SFX.relay(.8);
  if(r===MINOR+1&&prev&&prev.w>2)msg('2 LAMPS NOW',G_CYN,1.6,1);
  if(r===1&&!S.demo)msg(touchy?'TAP TO STOP':'PRESS TO STOP',G_AMB,2.6,1);
}
function moveRow(dt){
  const m=S.mv;m.acc+=dt;m.age++;
  while(m.acc>=m.st){m.acc-=m.st;if(m.x+m.dir<0||m.x+m.dir+m.w>TCOLS)m.dir=-m.dir;m.x+=m.dir;CH.ph+=1;SFX.step(S.row);}
  m.hn=(m.hn+1)&7;m.hist[m.hn]=m.x;
}
/* STOP. What you saw is what you get: the bulbs take a tick to warm and the display adds a frame or two, so the
   row is judged where it stood LAT_T ticks ago, which is where it looked to be when the button went down. */
function stopRow(){
  const m=S.mv,lag=Math.min(LAT_T,m.age),x=m.hist[(m.hn-lag)&7],r=S.row,sup=r>1?S.stack[r-2]:{x:0,w:TCOLS};
  const a=Math.max(x,sup.x),b=Math.min(x+m.w,sup.x+sup.w);
  S.land={r,x,w:m.w,a,b,kept:Math.max(0,b-a)};S.mv=null;
  SFX.clunk();S.shake=Math.max(S.shake,.18);setPh('land');           // hit-stop: the stopped row blazes for a beat before anything falls
}
function addFaller(c,r){let stop=-1;for(let k=r-2;k>=0;k--){const R=S.stack[k];if(c>=R.x&&c<R.x+R.w){stop=k+2;break;}}S.fall.push({c,y:r,vy:0,t:0,stop});}
function spark(x,y,vx,vy,life,q,d=D_FL){S.spk.push({x,y,vx,vy,t:0,life,q,d});}
function afterLand(){
  const L=S.land;let lost=0;
  for(let c=L.x;c<L.x+L.w;c++)if(c<L.a||c>=L.b){addFaller(c,L.r);lost++;}
  if(lost)SFX.fall();
  if(L.kept<=0){S.outcome='over';setPh('fail');SFX.buzz();S.shake=.6;msg('GAME OVER',G_RED,2.6,3);if(!S.demo)say('Game over');return;}
  S.stack.push({x:L.a,w:L.kept,t:S.t});
  const perfect=!lost&&L.r>1;
  S.score+=20*L.r+(perfect?30*L.r:0);SFX.land(L.r);
  S.streak=perfect?(S.streak||0)+1:0;
  if(perfect){S.perfects++;SFX.perfect();msg(S.streak>1?'PERFECT x'+S.streak:'PERFECT',G_GLD,1.1,1);
    for(let c=L.a;c<L.a+L.kept;c++)for(let k=0;k<2;k++)spark(LY.tx+c+.5,TY(L.r)+.5,rnd(-5,5),rnd(-9,-4),rnd(.25,.45),G_GLD);}
  else if(lost)msg(L.kept===1?'LAST LAMP':L.kept+' LAMPS',L.kept===1?G_RED:G_AMB,1.2,1);
  S.row++;S.tickets=TK_ROW*(S.row-1);if(!S.demo)ARC.score(S.score);
  if(L.r===MINOR){S.score+=300;setPh('minor');SFX.fanfare();SFX.bell(.9);msg('MINOR PRIZE',G_GRN,2.4,2);if(!S.demo)say('Minor prize!');}
  else if(L.r===MAJOR){S.score+=3000;setPh('major');SFX.fanfare();S.shake=.5;msg('MAJOR PRIZE',G_GLD,3,3);if(!S.demo)say('Major prize!');setTrack('win');}
  else{setPh('settle');S.wait=lost?.42:.2;}
}
function beginDecide(){setPh('decide');S.dec={t:10,sel:0,armed:false,sec:10};setTrack('decide');}
/* the decision: TAKE the minor prize (ends the game) or GO for the major. Defaults to TAKE; ignores the stop button
   still being mashed from the last row (it must be released first); collects by itself when the clock runs out. */
function decide(dt,I){
  const D=S.dec;D.t-=dt;CH.fill=Math.max(0,D.t/10);
  if(!D.armed&&S.pt>.7&&!I.held)D.armed=true;
  if(I.l&&D.sel!==0){D.sel=0;SFX.select();}if(I.r&&D.sel!==1){D.sel=1;SFX.select();}
  if(I.hover>=0&&I.hover!==D.sel){D.sel=I.hover;SFX.select();}
  let pick=-1;
  if(D.armed){if(I.take)pick=0;else if(I.go)pick=1;else if(I.side>=0)pick=I.side;else if(I.side===-2||I.conf)pick=D.sel;}
  const sec=Math.ceil(D.t);if(sec!==D.sec){D.sec=sec;SFX.tock(sec<=3);}
  if(D.t<=0)pick=0;
  if(pick===0){setPh('take');SFX.take();SFX.bell(.6);msg(TK_MINOR+' TICKETS',G_GLD,2.4,2);S.prize=TK_MINOR;setTrack('win');}
  else if(pick===1){setPh('climb');SFX.confirm();msg('GO FOR '+TK_MAJOR,G_RED,1.8,2);setTrack('play');}
}
function finish(o){
  S.outcome=o;S.tickets=TK_ROW*(S.row-1)+(o==='minor'?TK_MINOR:o==='major'?TK_MAJOR:0);
  if(S.demo){atGo('prize');return;}
  S.mode='over';S.newHi=S.score>S.hi;if(S.newHi){S.hi=S.score;store.set('hd-'+CAB.id+'-hi',S.hi);}
  Object.assign(RES,{t:0,total:S.tickets,shown:0,rate:S.tickets/clamp(S.tickets*.045,.8,4.2),off:0,score:S.score,rows:S.row-1,outcome:o,newHi:S.newHi});
  chase(o==='over'?'run':'comet',o==='over'?5:30,o==='over'?.8:1,o==='over'?1:0,o==='over'?0:8,6);
  setTrack(o==='over'?'over':'win');ARC.over(S.score,S.tickets);
}
/* one simulation step of a game (real or demo). I = this tick's intentions (from the player or the autopilot) */
function playSim(dt,I){
  S.t+=dt;S.pt+=dt;updFx(dt);
  if(S.dscore<S.score)S.dscore=Math.min(S.score,S.dscore+Math.max(1,(S.score-S.dscore)*.12));
  const P=S.ph,pt=S.pt;
  if(P==='intro'){const n=Math.floor(pt/.6*(PN/2+1));if(n>S.k&&n%3===0)SFX.relay(.35);S.k=n;CH.fill=n;if(pt>.85)spawnRow();}
  else if(P==='move'){if(I.stop)stopRow();else moveRow(dt);}
  else if(P==='land'){if(pt>.11)afterLand();}
  else if(P==='settle'){if(pt>S.wait)spawnRow();}
  else if(P==='minor'){if(pt>2.5)beginDecide();}
  else if(P==='decide')decide(dt,I);
  else if(P==='climb'){const n=Math.floor(pt*7);if(n>S.k&&n<=5){S.k=n;SFX.step(MINOR+n);}if(pt>.95)spawnRow();}
  else if(P==='take'){if(pt>2.6)finish('minor');}
  else if(P==='major'){majorSim(dt);if(pt>8||(pt>2.5&&I.conf&&!S.demo))finish('major');}
  else if(P==='fail'){const n=Math.floor((pt-1.25)/.09);if(pt>1.25&&n>=S.k&&S.k<S.stack.length){S.k=n+1;SFX.relay(.9);}if(pt>2.9)finish('over');}
}

/* ---------- 9.7 EFFECTS: falling lamps, sparks, fireworks ---------- */
const keepDead=o=>!o.dead,keepSpark=p=>p.t<p.life&&p.y<H+1&&p.x>-1&&p.x<W+1;
function updFx(dt){
  for(const f of S.fall){f.t+=dt;f.vy+=38*dt;f.y-=f.vy*dt;
    if(f.stop>0&&f.y<=f.stop){f.dead=1;SFX.tink();for(let k=0;k<4;k++)spark(LY.tx+f.c+.5,TY(f.stop)+.5,rnd(-6,6),rnd(-8,-2),rnd(.2,.4),G_AMB,D_HOT);}
    else if(f.y<-.6)f.dead=1;}
  sweep(S.fall,keepDead);
  for(const p of S.spk){p.t+=dt;p.vy+=26*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  sweep(S.spk,keepSpark);
  for(const r of S.rk){r.t+=dt;r.y+=r.vy*dt;r.vy+=5*dt;
    if(r.t>r.fuse){r.dead=1;SFX.boom(.45);SFX.crackle();const n=22+(Math.random()*10|0),q=pick(BURST),v0=rnd(7.5,11.5),tw=Math.random()<.55;
      for(let k=0;k<n;k++){const a=k/n*TAU+rnd(-.1,.1),v=v0*rnd(.78,1.05);spark(r.x,r.y,Math.cos(a)*v,Math.sin(a)*v*.85-2,rnd(.85,1.35),Math.random()<.2?G_CLR:q);S.spk[S.spk.length-1].tw=tw;}}}
  sweep(S.rk,keepDead);
  if(S.shake>0)S.shake=Math.max(0,S.shake-dt*1.8);
}
const BURST=[G_RED,G_GRN,G_GLD,G_PNK,G_CYN,G_AMB];
function rocket(){S.rk.push({x:rnd(3,W-3),y:H-1.5,vy:-rnd(17,23),t:0,fuse:rnd(.5,.75)});SFX.whoosh();}
function majorSim(){const pt=S.pt;
  if(pt<.95){const n=Math.floor(pt/.15);if(n>S.k){S.k=n;SFX.thunk();}}
  else{if(S.k<100){S.k=100;SFX.bell(2.2);SFX.siren();}const n=Math.floor((pt-.95)/.38);if(n+200>S.k&&pt<7.2){S.k=n+200;rocket();if(n%3===1)rocket();}
    if(LY.hdr&&!MS.on)msg((pt%5.2)<2.6?TK_MAJOR+' TICKETS':'MAJOR PRIZE',G_GLD,2.6,3);}
}

/* ---------- 9.8 AUTOPILOT — plays the attract demo (and the soak test) like a person would ----------
   It knows the row's future (the motion is deterministic), picks the position that keeps the most lamps,
   then presses somewhere inside that step with a human timing error that grows as the row speeds up,
   sometimes hesitating for another pass. It presses on what it SEES, i.e. LAT_T ticks late, like you. */
function botPlan(){
  const m=S.mv,r=S.row,sup=r>1?S.stack[r-2]:{x:0,w:TCOLS};let best=-1;const ok=[];
  for(let x=0;x+m.w<=TCOLS;x++){const ov=Math.max(0,Math.min(x+m.w,sup.x+sup.w)-Math.max(x,sup.x));if(ov>best){best=ov;ok.length=0;ok.push(x);}else if(ov===best)ok.push(x);}
  if(r===1){ok.length=0;ok.push((TCOLS-m.w)>>1);}
  let x=m.x,dir=m.dir;
  for(let k=0;k<60;k++){
    if(k>0){if(x+dir<0||x+dir+m.w>TCOLS)dir=-dir;x+=dir;}
    if(ok.indexOf(x)<0)continue;
    const start=k===0?-m.acc:k*m.st-m.acc;
    if(start+m.st<.15)continue;                               // too soon to react to this pass
    if(k<14&&Math.random()<BOT.hes)continue;                  // let it go round once more
    BOT.plan=S.pt+Math.max(0,start+m.st*rnd(.3,.7)+gauss()*BOT.sig*(1+r/10))+LAT_T/60;return;
  }
  BOT.plan=S.pt+.4;
}
const INP={stop:false,l:false,r:false,take:false,conf:false,side:-1,hover:-1,held:false,go:false};
function botInput(){
  const I=INP;I.stop=I.l=I.r=I.take=I.conf=I.held=I.go=false;I.side=-1;I.hover=-1;
  if(S.ph==='move'){if(BOT.plan===null)botPlan();if(S.pt>=BOT.plan){BOT.plan=null;I.stop=true;}}
  else if(S.ph==='decide'){if(!BOT.decAt)BOT.decAt=rnd(1.4,2.8);if(S.pt>=BOT.decAt){BOT.decAt=0;I.side=Math.random()<BOT.go?1:0;}}
  else BOT.decAt=0;
  return I;
}

/* ---------- 9.9 COMPOSE: what the controller switches on this tick ---------- */
function drawRails(){
  const reached=S.row-1,P=S.ph,pt=S.pt,T=S.t;
  for(let r=1;r<=TROWS;r++){const y=TY(r);let d=D_EMB*.8,q=G_AMB;
    if(r<=reached)d=D_DIM;
    if(r===S.row&&(P==='move'||P==='land'))d=D_HOT,q=G_CLR;              // the level indicator
    if(r===MINOR){q=G_GRN;d=Math.max(d,reached>=MINOR?D_ON:D_DIM+.1*Math.sin(T*5));}
    if(r===MAJOR){q=G_RED;d=Math.max(d,D_DIM+.12*Math.sin(T*6+1));}
    if(P==='minor'&&r<=MINOR&&(((r-pt*24)%5)+5)%5<1.3){d=D_FL;q=G_GRN;}
    if(P==='climb'&&r>MINOR&&r<=MINOR+pt*7){d=D_FL;q=G_RED;}
    if((P==='major'||P==='take')&&(((r+pt*20)%4)+4)%4<1.5){d=D_FL;q=P==='take'?G_GLD:ROWG[r];}
    dset(LY.rl,y,d,q);dset(LY.rr,y,d,q);
  }
  dset(LY.rl,LY.crown,D_MID,G_RED);dset(LY.rr,LY.crown,D_MID,G_RED);
}
function drawCrown(){
  const y=LY.crown,T=S.t,hot=S.row>MINOR,P=S.ph;
  for(let x=1;x<W-1;x++)if(x<LY.rl||x>LY.rr)dset(x,y,D_EMB*.55,G_AMB);   // the skyline: a dim separator under the sign
  for(let c=0;c<TCOLS;c++){let d=((c+(T*(hot?7:2.5)|0))&1)?D_MID:D_EMB;if(P==='major')d=((c+(S.pt*14|0))&1)?D_FL:D_MID;dset(LY.tx+c,y,d,G_GLD);}
}
function drawStack(){
  const P=S.ph,pt=S.pt,T=S.t,n=S.stack.length;
  for(let k=0;k<n;k++){const r=k+1,R=S.stack[k],age=T-R.t;
    let d=D_ON+.045*Math.sin(T*2.2-r*.55),q=ROWG[r];                      // a slow breath travels up the tower
    if(age<.35)d=Math.max(d,D_FL-(D_FL-D_ON)*age/.35);
    if(P==='fail'){if((pt>.2&&pt<.5)||(pt>.7&&pt<1)){d=D_FL;q=G_RED;}if(pt>1.25&&n-1-k<(pt-1.25)/.09)d=0;}
    else if(P==='minor'&&r===MINOR)d=(pt*7|0)&1?D_FL:D_DIM;
    else if(P==='take')d=((pt*8|0)+r)&1?D_FL:D_MID;
    else if(P==='major'){if(pt<.95){d=(pt/.15|0)&1?D_DIM:D_FL;q=G_CLR;}else if((((r-pt*14)%6)+6)%6<2)d=D_FL;}
    else if(P==='decide')d*=.86;
    for(let c=R.x;c<R.x+R.w;c++)dset(LY.tx+c,TY(r),d,q);
  }
  if(P==='major'&&pt<.95&&!((pt/.15|0)&1))for(let r=n+1;r<=TROWS;r++)for(let c=0;c<TCOLS;c++)dset(LY.tx+c,TY(r),D_FL,G_CLR);
}
function drawPrizeEmbers(){
  const T=S.t;
  if(S.row<=MINOR)for(let c=0;c<TCOLS;c++)dset(LY.tx+c,TY(MINOR),D_EMB+.04*Math.sin(T*3+c),G_GRN);
  if(S.ph!=='major')for(let c=0;c<TCOLS;c++)dset(LY.tx+c,TY(MAJOR),D_EMB+.04*Math.sin(T*3.4+c*.8),G_RED);
}
function drawPanels(){
  const pl=LY.pl,pr=LY.pr,T=S.t,ym=TY(MINOR),yM=TY(MAJOR);
  /* minor prize label on the left, its arrow touching the minor rail */
  const lm=S.row>MINOR?D_ON:D_MID+.08*Math.sin(T*4);
  dico('aR',LY.rl-2,ym-1,lm,G_GRN);dtxt(''+TK_MINOR,LY.rl-4,ym-2,lm,G_GLD,3,'r');
  /* major prize label on the right, top-aligned under the crown */
  const lM=D_MID+.1*Math.sin(T*5),ytop=Math.max(pr.y,yM-2);
  if(pr.w>=14){dico('aL',LY.rr+1,yM-1,lM,G_RED);dtxt(''+TK_MAJOR,LY.rr+4,ytop,lM,G_GLD,3);}else dtxt(''+TK_MAJOR,pr.x,ytop,lM,G_GLD,3);
  /* tickets so far (left, bottom) and the row (right, bottom: big digits) */
  const yb=H-2;const tk=''+S.tickets;
  if(pl.w>=14){dico('tkt',pl.x+1,yb-3,D_MID,G_AMB);dtxt(tk,pl.x+pl.w-1,yb-4,D_ON,G_AMB,3,'r');}
  else dtxt(tk,pl.x+(pl.w>>1),yb-4,D_ON,G_AMB,3,'c');
  const rs=''+Math.min(TROWS,S.row);dtxt(rs,pr.x+(pr.w>>1),yb-6,D_ON,G_CLR,5,'c');
}
function drawDecision(){
  const D=S.dec,T=S.t,pl=LY.pl,pr=LY.pr;
  const a=D.sel===0?D_ON+.08:D_EMB+.08,b=D.sel===1?D_ON+.08:D_EMB+.08;
  const cxL=pl.x+(pl.w>>1),cxR=pr.x+(pr.w>>1),y0=LY.crown+1,yb=H-2;
  /* left: TAKE (ticket + 60). right: GO (chevron + 500). Words only where the panel is wide enough. */
  if(pl.w>=15)dtxt('TAKE',cxL,y0,a,G_GLD,3,'c');
  dtxt('GO',cxR,y0,b,G_RED,3,'c');
  dico('tkt',cxL-2,yb-8,a,G_AMB);dico('up',cxR-2,yb-8,b,G_RED);
  dtxt(''+TK_MINOR,cxL,yb-4,a,G_GLD,3,'c');dtxt(''+TK_MAJOR,cxR,yb-4,b,G_GLD,3,'c');
  /* the chosen side gets a chasing underline beneath its word */
  const P=D.sel===0?pl:pr,yu=y0+6;for(let x=P.x;x<P.x+P.w;x++)if(((x+(T*14|0))%3)===0)dset(x,yu,D_HOT,D.sel===0?G_GLD:G_RED);
  /* the clock, in the empty sky above the minor row */
  const sec=Math.max(0,Math.ceil(D.t)),hot=D.t<3.2;
  if(!hot||(D.t*4|0)%2)dtxt(''+sec,LY.tx+(TCOLS>>1)+1,TY(MAJOR),hot?D_FL:D_ON,hot?G_RED:G_AMB,3,'c');
}
function drawFx(){
  for(const f of S.fall){const fl=Math.random()<.14?.45:1;dsplat(LY.tx+f.c+.5,LY.ty+TROWS-f.y+.5,D_HOT*Math.max(.5,1-f.t*1.4)*fl,G_CLR);/* cools to orange as it drops */}
  for(const p of S.spk){if(p.tw&&p.t>p.life*.45&&Math.random()<.45)continue;dsplat(p.x,p.y,p.d*Math.sqrt(1-p.t/p.life),p.q);}   /* glitter bursts crackle as they fall */
  for(const r of S.rk)dsplat(r.x,r.y,D_FL,G_GLD);
}
function composePlay(){
  const P=S.ph;
  if(P==='intro')CH.fill=S.k;
  drawFrame();drawRails();drawCrown();
  if(P==='decide')drawDecision();else drawPanels();
  drawStack();drawPrizeEmbers();
  if(P==='move'&&S.mv){const m=S.mv,y=TY(S.row);for(let c=m.x;c<m.x+m.w;c++)dset(LY.tx+c,y,D_HOT,G_CLR);}
  if(P==='land'){const L=S.land;for(let c=L.x;c<L.x+L.w;c++)dset(LY.tx+c,TY(L.r),D_FL,G_CLR);}
  if(P==='intro'){const n=Math.min(TCOLS,Math.floor(S.pt*14));for(let c=0;c<n;c++)dset(LY.tx+c,TY(1),D_MID,G_RED);}
  drawFx();
  if(S.demo&&S.mode==='title'){const c=S.t%7;SWX=(S.t*16)%(W+12)-6;
    drawSign(c<4.2?'SKY STACK':(touchy?'TAP TO PLAY':'PRESS START'),c<4.2?G_GLD:G_AMB,c<4.2?sweepMod:null);}
  else drawSign(P==='decide'?null:'SCORE '+Math.floor(S.dscore),G_GLD);
  if(P==='decide'&&LY.hdr&&!MS.on)msg('TAKE '+TK_MINOR+' OR GO FOR '+TK_MAJOR+'?',G_GLD,0,1,'scroll');
}
/* the logo: the biggest lettering that fits both words on this board */
function logoDims(){const iw=W-2,ih=H-2;if(tw3('STACK',2)<=iw&&23<=ih)return {f:3,sc:2,gh:10,gap:3};return {f:5,sc:1,gh:7,gap:Math.max(1,Math.min(3,(ih-14)>>1))};}
function drawLogo(lit,mod){  // lit = number of letters powered (boot), Infinity when all
  const L=logoDims(),tot=L.gh*2+L.gap,y0=1+((H-2-tot)>>1);let n=0;
  for(let w=0;w<2;w++){const word=w?'STACK':'SKY',yy=w?y0+L.gh+L.gap:y0,q=w?G_GLD:G_CYN;
    let x=Math.round(W/2-twid(word,L.f,L.sc)/2);
    for(const ch of word){if(n++<lit)dtxt(ch,x,yy,D_ON-.03,q,L.f,null,L.sc,mod);x+=(L.f===5?6:4)*L.sc;}
  }
}
function drawLines(lines,y0,gap){let y=y0;for(const [s,q,d] of lines){const A={x:1,y,w:W-2,h:5,f:3};drawText(A,s,msgKind(s,A),AT.t,d||D_ON,q);y+=5+gap;}}
function composeTitle(){
  const P=AT.ph,t=AT.t;
  if(P==='demo'){composePlay();return;}
  drawFrame();
  if(P==='boot'){
    drawLogo(t<1.1?0:Math.floor((t-1.1)/.17)+1);
    if(t>2.72&&t<2.86)for(let i=0;i<NB;i++){DRV[i]=D_FL;}                 // every circuit at once: watch the supply sag
  }else if(P==='logo'){
    SWX=((t*16)%(W+14))-7;
    if(t<3.6||t>5.6)drawLogo(99,sweepMod);
    else{const two=touchy?['TAP','PLAY']:['PRESS','START'],y0=(H>>1)-8;if((t*3|0)%3){dtxt(two[0],W>>1,y0,D_ON,G_AMB,5,'c');dtxt(two[1],W>>1,y0+9,D_ON,G_AMB,5,'c');}}
  }else if(P==='prize'){
    const k=Math.min(3,Math.floor(t/.45));
    if(W>=41){const all=[['MAJOR '+TK_MAJOR,G_RED,D_HOT],['MINOR '+TK_MINOR,G_GRN,D_ON],[TK_ROW+' PER ROW',G_AMB,D_ON]],y0=1+((H-2-19)>>1);drawLines(all.slice(0,k),y0+1,2);}
    else{const pg=t<2.5?0:1,w=pg?'MINOR':'MAJOR',v=''+(pg?TK_MINOR:TK_MAJOR),y0=(H>>1)-7;if(k>0){dtxt(w,W>>1,y0,D_ON,pg?G_GRN:G_RED,3,'c');dtxt(v,W>>1,y0+7,D_HOT,G_GLD,5,'c');}}
  }else if(P==='hi'){
    const y0=(H>>1)-7;dtxt('HI SCORE',W>>1,y0,D_ON,G_AMB,3,'c');if(t>.4)dtxt(''+S.hi,W>>1,y0+7,D_HOT,G_GLD,5,'c');
  }
}
function atGo(p){AT.ph=p;AT.t=0;AT.k=0;AT.k2=0;AT.th=0;
  if(p==='boot')chase('fill',0);
  else if(p==='logo')chase('run',7,1,1);
  else if(p==='demo'){const pro=AT.n%3===2;newRun(true);BOT.sig=pro?.007:.026;BOT.go=pro?1:.45;BOT.hes=pro?.08:.18;}
  else if(p==='prize')chase('bounce',26,1,0,3);
  else if(p==='hi')chase('wig',4,1,1);
}
function attractSim(dt){
  AT.t+=dt;const P=AT.ph,t=AT.t;
  if(P==='boot'){
    const n=Math.min(PN,Math.floor(t/1.0*(PN/2+1)));if(n>AT.k){if((n>>1)!==(AT.k>>1))SFX.relay(.32);AT.k=n;}CH.fill=n;
    const lit=t<1.1?0:Math.floor((t-1.1)/.17)+1;if(lit>0&&lit<=8&&lit+100>AT.k2){AT.k2=lit+100;SFX.relay(1.15);}
    if(t>2.72&&!AT.th){AT.th=1;SFX.thunk();}
    if(t>3.5){AT.booted=true;atGo('logo');}
  }
  else if(P==='logo'){if(t>6.4)atGo('demo');}
  else if(P==='demo')playSim(dt,botInput());
  else if(P==='prize'){const k=Math.min(3,Math.floor(t/.45));if(k>AT.k){AT.k=k;SFX.relay(1);}if(t>5)atGo('hi');}
  else if(P==='hi'){if(t>3.6){AT.n++;atGo('logo');}}
}
function composeOver(){
  const R=RES,t=R.t,hd=LY.hdr;drawFrame();
  /* ticket strips spitting out of both sides: 3 lamps of ticket, 1 dark perforation */
  const top=hd?hd.y+hd.h+1:1,bot=hd?H-2:11,cols=LY.tcols,fill=R.total?R.shown/R.total:0,pile=Math.round(fill*(bot-top+1)*.45);
  for(const x of cols)for(let y=top;y<=bot;y++){
    if(y>bot-pile){dset(x,y,D_ON,G_AMB);continue;}
    if(R.shown>0&&((y-Math.floor(R.off))%4+4)%4!==0)dset(x,y,R.shown<R.total?D_HOT:D_MID,G_GLD);}
  /* the count, in big doubled 3x5 digits */
  const num=''+Math.floor(R.shown),ny=hd?top+1:2;dtxt(num,W>>1,ny,R.shown<R.total?D_HOT:D_ON,G_GLD,3,'c',2);
  /* the sign tells the story, then cycles score / high score / how to continue */
  const A=hd||{x:1,y:ny+10,w:W-2,h:H-1-(ny+10),f:3};
  let s,q;const title=R.outcome==='major'?'MAJOR PRIZE':R.outcome==='minor'?'MINOR PRIZE':'GAME OVER',tq=R.outcome==='over'?G_RED:R.outcome==='minor'?G_GRN:G_GLD;
  const done=R.shown>=R.total,ct=t-(R.doneAt||0);
  if(t<1.5){s=title;q=tq;}
  else if(!done||ct<.8){s='TICKETS';q=G_GLD;}
  else{const seq=['SCORE '+R.score,R.newHi?'NEW HI SCORE':'HI '+S.hi,(R.rows)+(R.rows===1?' ROW':' ROWS'),touchy?'TAP TO PLAY':'PRESS START'],k=Math.floor((ct-.8)/2.4)%seq.length;s=seq[k];q=k===1&&R.newHi?G_GRN:k===3?G_AMB:G_GLD;}
  const st=t<1.5?t:(!done||ct<.8)?9:((ct-.8)%2.4);
  drawText(A,s,msgKind(s,A),st,D_ON+.06,q);
  drawFx();
}
function overSim(dt,press){
  const R=RES;R.t+=dt;updFx(dt);
  if(R.outcome==='major'&&R.t<5&&Math.random()<dt*1.4)rocket();
  if(R.t>.9&&R.shown<R.total){const p=Math.floor(R.shown);R.shown=Math.min(R.total,R.shown+R.rate*dt);if(Math.floor(R.shown)>p){SFX.ticket();}R.off+=dt*Math.min(36,8+R.rate*.6);if(R.shown>=R.total){R.doneAt=R.t;SFX.relay(1.2);if(R.total>=60)SFX.win();}}
  if(press){if(R.shown<R.total&&R.t>.25){R.shown=R.total;R.doneAt=R.t;SFX.ticket();}else if(R.t>1.2)APP_attract();}
}
function composePause(){
  dmul(.4);                                                  // the board drops to standby: every lit lamp falls to a warm ember
  const y=(H>>1)-3;dclr(1,y-1,W-2,9);dtxt('PAUSE',W>>1,y,D_ON+.04,G_CLR,5,'c');
}
function compose(){
  DRV.fill(0);clipAll();
  if(S.mode==='title')composeTitle();else if(S.mode==='play')composePlay();else composeOver();
  if(S.paused)composePause();
}

/* ---------- 9.10 RENDER: temperature -> light, through the Planck table ---------- */
function render(){
  for(let i=0;i<NB;i++){let k=((TEMP[i]-U0)*LUTS)|0;if(k>=LUTN)k=LUTN-1;RBUF[i]=LUT[GLASS[i]*LUTN+k];}
  commit();
}
/* the transformer hum follows the board's current draw: flash the whole board and you hear it */
const HUM={g:null};
function humUpdate(){
  const c=AU.ctx;if(!c||c.state!=='running')return;
  if(!HUM.g){try{const o=c.createOscillator(),o2=c.createOscillator(),fl=c.createBiquadFilter(),gn=c.createGain();o.type='sawtooth';o.frequency.value=60;o2.type='sine';o2.frequency.value=120;
    fl.type='lowpass';fl.frequency.value=340;gn.gain.value=0;o.connect(fl);o2.connect(fl);fl.connect(gn);gn.connect(AU.sfx);o.start();o2.start();HUM.g=gn;}catch(e){return;}}
  const lv=document.hidden?0:Math.min(.06,.003+SUP.i*.05);HUM.g.gain.setTargetAtTime(lv,c.currentTime,.06);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&HUM.g&&AU.ctx)HUM.g.gain.setTargetAtTime(0,AU.ctx.currentTime,.02);});

/* =====================================================================================
   10. FRAME LOOP — fixed 60 Hz simulation (input -> rules -> controller -> filaments), render per display frame
   ===================================================================================== */
/* on-screen buttons are level-triggered; latch their presses like keys so a very quick tap is never lost */
const TSL={A:false,B:false};$('bA').addEventListener('pointerdown',()=>{TSL.A=true;});$('bB').addEventListener('pointerdown',()=>{TSL.B=true;});
const UIP={},EDGE={},EK=['ok','back','pause','a','b','l','r','m','ta'],HOVER={last:0},BTN={a:''};
const PERF={tk:0,tn:0,tmax:0,rd:0,rn:0,rmax:0};
function setPause(on){if(S.mode!=='play')on=false;S.paused=on;$('pauseBtn').textContent=on?'Resume':'Pause';}
function playerInput(c,tap){
  const I=INP;I.l=EDGE.l;I.r=EDGE.r;I.take=EDGE.b;I.held=c.a||c.ok||PTR.down;
  I.go=EDGE.ta;I.conf=(EDGE.ok||EDGE.a)&&!I.go;               // on a phone the big button reads GO during the decision
  I.stop=EDGE.a||EDGE.ok||tap;I.side=-1;I.hover=-1;
  if(tap){const x=PTR.x;I.side=x<W/2-1.5?0:x>W/2+1.5?1:-2;}
  if(PTR.on&&!PTR.touch&&PTR.last!==HOVER.last&&S.ph==='decide'){HOVER.last=PTR.last;I.hover=PTR.x<W/2?0:1;}
  return I;
}
function tick(dt){
  const t0=performance.now();
  const c=readCtl();c.m=K('KeyM');c.ta=TS.A||TSL.A;
  if(TSL.A){c.a=c.ok=true;TSL.A=false;}if(TSL.B){c.b=true;TSL.B=false;}   // a touch-button tap shorter than a tick still counts
  for(const k of EK){EDGE[k]=c[k]&&!UIP[k];UIP[k]=c[k];}
  if(EDGE.m)toggleSound();
  const tap=PTR.pressed;PTR.pressed=false;          // a tap is consumed by the first tick that sees it
  if(S.mode==='title'){attractSim(dt);if(EDGE.ok||EDGE.a||tap){audioInit();APP_start();}else if(EDGE.back&&EMBED)ARC.exit();}
  else if(S.mode==='play'){
    if(EDGE.pause)setPause(!S.paused);
    else if(S.paused){if(EDGE.ok||tap)setPause(false);}
    else playSim(dt,AUTO.on?botInput():playerInput(c,tap));
  }
  else if(S.mode==='over'){overSim(dt,EDGE.ok||EDGE.a||tap);if(EMBED&&RES.t>1.2&&EDGE.back)ARC.exit();}
  if(!S.paused){chaseTick(dt);msgTick(dt);}
  compose();lampsStep(dt);
  const la=S.mode==='play'&&S.ph==='decide'?'GO':'STOP';if(la!==BTN.a){BTN.a=la;$('bA').textContent=la;}
  const ms=performance.now()-t0;PERF.tk+=ms;PERF.tn++;if(ms>PERF.tmax)PERF.tmax=ms;
}
let ACC=0,LAST=0;
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0)endInputFrame();          /* only clear latched taps once a tick has seen them */
  g.setTransform(1,0,0,1,0,0);
  const r0=performance.now();render();const rm=performance.now()-r0;PERF.rd+=rm;PERF.rn++;if(rm>PERF.rmax)PERF.rmax=rm;
  musicTick(S.paused);humUpdate();
  /* screen shake nudges where the matrix is drawn (never the lamps themselves) */
  const sk=reduce?0:S.shake*S.shake;
  if(sk>0){const r0c=RECT,a=RECT.w/W*.22*sk*4;RECT={x:r0c.x+(Math.random()-.5)*a,y:r0c.y+(Math.random()-.5)*a,w:r0c.w,h:r0c.h};present();RECT=r0c;}else present();
  requestAnimationFrame(frame);
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setRes((resI+1)%CAB.res.length);layout();e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('resize',resize);
$('brand').firstChild.textContent=CAB.brand;$('brand').querySelector('span').textContent=CAB.sub;$('keys').innerHTML=CAB.keys;document.title='Sky Stack';
/* one-button cabinet: no stick; A is the big STOP button, B takes the minor prize */
$('stL').hidden=true;$('pad').classList.add('one');$('bA').textContent='STOP';$('bB').textContent='TAKE';
if(!gl)$('err').style.display='grid';
if(AU.muted)$('snd').textContent='Sound off';
setRes(resI);resize();APP_attract();
ARC.post('ready',{title:CAB.title,w:W,h:H,tickets:CAB.tickets});
/*@@HOOK*/window.__game={S,AT,BOT,AUTO,RES,PERF,LY,CH,SUP,KEY,LATCH,PTR,TS,tick,ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},start:APP_start,attract:APP_attract,setRes,
  temp:()=>TEMP,drv:()=>DRV,render,dims:()=>[W,H],setPause};/*@@/HOOK*/
requestAnimationFrame(frame);
})();
