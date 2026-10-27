
/* ---------- 9.4 materials: one tone ramp per surface ---------- */
const MT={
  mole:mkMat('#a46638'),moleB:mkMat('#dcae7c',{lt:.3}),
  hard:mkMat('#5c6a92'),hardB:mkMat('#a4b0cc',{lt:.25}),
  gold:mkMat('#f2a818',{spec:.95,lt:.45,rimc:'#fff4c0'}),goldB:mkMat('#f4dc94',{lt:.35,spec:.97}),
  king:mkMat('#9a48c4'),kingB:mkMat('#dcb8ea',{lt:.25}),kingM:mkMat('#c486e0',{lt:.25}),
  bomb:mkMat('#343860',{dk:.2,lt:.22,gain:.78}),glint:flatMat('#d6dcf4'),bombT:mkMat('#343860',{dk:.2,lt:.1,gain:.7,rim:0}),
  nose:mkMat('#f0608a',{spec:.9,rim:0}),
  eye:mkMat('#e2deee',{amb:.62,dif:.45,lt:.12,rim:0,dk:.55,gain:1}),pupil:mkMat('#1a1430',{rim:0,amb:.3,dif:.6}),
  mouth:flatMat('#4c0c1e'),tongue:mkMat('#ff6a8c',{rim:0,amb:.4}),teeth:mkMat('#ffffff',{amb:.72,dif:.35,rim:0,dk:.72}),
  ink:flatMat('#170a1a'),
  inEar:mkMat('#f08aa0',{rim:0}),paw:mkMat('#dca07c'),pawH:mkMat('#909cbc'),pawB:mkMat('#2a2c48',{spec:.97}),pawK:mkMat('#dcb4ec'),pawG:mkMat('#f4d07a'),
  helmet:mkMat('#f8a414',{spec:.95,lt:.35}),helmetHi:mkMat('#ffd050',{spec:.95,lt:.3}),brim:mkMat('#d8800c',{spec:.95}),
  crown:mkMat('#f8c430',{spec:.93,lt:.4}),gemR:mkMat('#ff2a56',{spec:.85}),gemB:mkMat('#36a2ff',{spec:.85}),
  ermine:mkMat('#e4e0f0',{amb:.45,lt:.15}),stache:mkMat('#ece2da',{lt:.2,amb:.3}),cap:mkMat('#9098b4',{spec:.93}),
  shade:darkMat(.6),flush:tintMat('#ff2a2a',.35),blush:tintMat('#ff5a8a',.42),
  spiral:(()=>{const M=M0();M.fx=1;M.c1=pack(23,10,26);M.c2=pack(255,255,255);return M;})(),
  dirt:mkMat('#5c321a',{tex:1.1,rim:0,lt:.14,amb:.12,dif:.85}),dirtB:mkMat('#342622',{tex:1.1,rim:0,lt:.1}),crest:mkMat('#7a4c2a',{tex:.9,rim:0,lt:.14,amb:.2,dif:.8}),
  hole:mkMat('#4a2a1a',{vg:1,rim:0,dk:.06,lt:.1}),gshadow:darkMat(.55,.9),
  mallet:mkMat('#f02a2a',{spec:.95,lt:.3,lo:'#3a0c2a',gain:1}),band:mkMat('#f0e6dc',{amb:.5,lt:.2,rim:0}),mcap:mkMat('#ff6a5a',{lt:.35,spec:.95}),
  wood:mkMat('#b87a46',{lt:.3}),grip:mkMat('#3a3458',{lt:.3}),
  mshadowL:darkMat(.72,.75),mshadowD:darkMat(.5,1),cursor:flatMat('#ffe46a')
};
const FUSEC=pack(150,108,62),DIRTC=[pack(124,76,44),pack(92,56,32),pack(160,110,66)],DUSTC=pack(170,128,90);
/* tufts of grass: blade colours from root to tip */
const GRASS=[pack(30,74,34),pack(54,122,48),pack(110,190,70)];

/* ---------- 9.5 the garden ----------
   Design space is 256x144 "units"; U converts to matrix pixels at the current resolution.
   Three rows of burrows in perspective; the back row is smaller and higher. */
const ROWS=[{y:61,k:.71,xs:[71,128,185]},{y:93,k:.83,xs:[60,128,196]},{y:127,k:.94,xs:[48,128,208]}];
const HRX=19,HRY=6.5,MRX=27.5,MRY=11.6,MCY=-1.6,HZD=40,DEPTH=55;
const HOLES=[];
function mkHole(r,ci,x,y,k,idx){return {r,col:ci,dx:x,dy:y,dk:k,x:0,y:0,k,clip:null,clipP:null,rus:0,jx:0,scorch:0,c:null,tufts:[],idx,lit:0};}
for(let r=0;r<3;r++)for(let i=0;i<3;i++){
  const h=mkHole(r,i,ROWS[r].xs[i],ROWS[r].y,ROWS[r].k,r*3+i),rg=mulberry(31+h.idx*7);
  for(let t=0;t<6;t++){let a;do{a=rg()*TAU-Math.PI;}while(Math.abs(a-Math.PI/2)<.55||Math.abs(a+Math.PI/2)<.5);
    h.tufts.push({x:Math.cos(a)*MRX*(.92+rg()*.16),y:MCY+Math.sin(a)*MRY*(.85+rg()*.2),n:2+(rg()*3|0),L:3.5+rg()*3,lean:(rg()-.5)*.5,ph:rg()*TAU,front:Math.sin(a)>.05});}
  h.c=mkCritter(h);HOLES.push(h);
}
/* per-column clip limits: a critter pixel is visible only above the burrow's front rim */
function holeClips(h){
  h.clip=new Int16Array(W);h.clipP=new Int16Array(W);
  const rx=HRX*h.k*U,ry=HRY*h.k*U;
  for(let x=0;x<W;x++){const d=(x+.5-h.x)/rx,v=Math.abs(d)<1?h.y+ry*Math.sqrt(1-d*d):h.y;h.clip[x]=Math.round(v);h.clipP[x]=Math.round(v+4.6*h.k*U);}
}
function layoutHoles(){for(const h of HOLES){h.x=h.dx*U;h.y=h.dy*U;holeClips(h);}}

/* the static backdrop is baked once per resolution: sky, moon, hills, fence, striped lawn, flowers */
let BG=null;const STARS=[];
const q6=(v,d)=>Math.floor(v/6+d)*6;
function bakeBG(){
  toRBUF();const hz=Math.round(HZD*U),rg=mulberry(77);
  const st=[[10,8,34],[28,16,64],[74,30,94],[146,62,94]];
  for(let y=0;y<hz;y++){const t=y/hz*3,i=Math.min(2,Math.floor(t)),f=t-i,a=st[i],b=st[i+1];
    const r=a[0]+(b[0]-a[0])*f,gg=a[1]+(b[1]-a[1])*f,bb=a[2]+(b[2]-a[2])*f;
    for(let x=0;x<W;x++){const d=BAY4[((y&3)<<2)|(x&3)];RBUF[y*W+x]=pack(q6(r,d),q6(gg,d),q6(bb,d));}}
  STARS.length=0;for(let i=0;i<W*hz/90;i++){const y=rg()*hz*.72|0;STARS.push([rg()*W|0,y,rg()*(1-y/hz),1+rg()*3]);}
  /* moon: lit sphere with craters and a halo */
  xReset();const mx=W*.7,my=11*U,mr=6.2*U;glow(mx,my,mr*3.2,[60,46,40],.5);
  fillE(geo(mx,my,mr,mr),mkMat('#f8e2b0',{lt:.5,amb:.35,rim:0}));
  for(const [cx,cy,cr] of [[-.3,-.2,.26],[.3,.25,.2],[.05,.45,.14],[.35,-.35,.12]])fillE(geo(mx+cx*mr,my+cy*mr,cr*mr,cr*mr),darkMat(.86));
  /* far hills and a tree line */
  for(let x=0;x<W;x++){const u=x/W,yh=hz-(7+3*Math.sin(u*6.2+1)+2*Math.sin(u*15+.3))*U;for(let y=Math.max(0,Math.floor(yh));y<hz;y++)RBUF[y*W+x]=pack(44,24,64);}
  const tc=flatMat('#1e1234');for(let i=0;i<11;i++){const x=(i+.5)/11*W+(rg()-.5)*14*U,r=(5+rg()*5)*U;fillE(geo(x,hz-5*U-r*.4,r,r*.8),tc);}
  /* string-light poles */
  for(const x of [Math.round(2*U),Math.round(W/2),Math.round(W-3*U)])rect(x-1,Math.round(12*U),Math.max(2,Math.round(2*U)),hz-Math.round(12*U),pack(46,26,30));
  /* picket fence, warm-lit from above by the string lights */
  const pw=Math.max(2,Math.round(2.2*U)),gap=Math.max(4,Math.round(5.6*U)),ft=hz-Math.round(11*U);
  for(const ry of [hz-Math.round(8.5*U),hz-Math.round(3.5*U)])rect(0,ry,W,Math.max(1,Math.round(1.6*U)),pack(78,44,36));
  for(let x=(rg()*gap)|0;x<W;x+=gap){const top=ft+((x*7)%3)-1;
    for(let y=top;y<hz+1;y++){const t=(y-top)/(hz-top),d=BAY4[((y&3)<<2)|(x&3)];
      for(let j=0;j<pw&&x+j<W;j++){const lit=1.05-t*.55-(j===pw-1?.18:0);if(y===top&&(j===0||j===pw-1))continue;RBUF[y*W+x+j]=pack(q6(150*lit,d),q6(92*lit,d),q6(66*lit,d));}}}
  /* lawn: perspective mowing stripes, depth gradient, a warm light pool, speckle */
  const vpx=W/2,vpy=hz-34*U;
  for(let y=hz;y<H;y++){const t=(y-hz)/(H-hz);
    for(let x=0;x<W;x++){const u=(x+.5-vpx)/(y+.5-vpy),s=(Math.floor(u*2.6+100)&1)?1.07:.93,dx=(x-W/2)/(W*.62),pool=1-dx*dx*.45,n=NZ[y*W+x];
      const sp=n===3&&((x*13+y*7)%5===0)?1.25:n===0&&((x*5+y*11)%7===0)?.8:1,k=s*pool*sp*(.72+t*.42),d=BAY4[((y&3)<<2)|(x&3)];
      RBUF[y*W+x]=pack(q6(24*k,d),q6(66*k,d),q6(42*k,d));}}
  /* flowers along the fence and a few pebbles */
  const FL=[[255,120,176],[255,214,80],[236,236,255],[180,140,255]];
  for(let i=0;i<W/5;i++){const x=rg()*W|0,y=hz+1+(rg()*4*U|0),c=FL[i%4];px(x,y+1,pack(40,90,40));px(x,y,pack(c[0],c[1],c[2]));if(U>=1&&rg()<.5)px(x+1,y,pack(c[0]*.8,c[1]*.8,c[2]*.8));}
  const pb=mkMat('#8a8098',{rim:0});for(let i=0;i<7;i++){const x=rg()*W,y=hz+(14+rg()*80)*U;let ok=true;for(const h of HOLES)if(Math.abs(x-h.x)<34*U*h.k&&Math.abs(y-h.y)<16*U)ok=false;if(ok)fillE(geo(x,y,(1.4+rg()*1.4)*U,(.9+rg()*.6)*U),pb);}
  for(const h of HOLES){h.jx=0;holeBack(h,true);}
  BG=RBUF.slice();
  for(const h of HOLES)bakeHoleSprite(h);
}

/* grass tufts around a burrow sway gently, and shiver hard while a critter is rustling below */
function tufts(h,front){
  const k=h.k*U,rus=h.rus;
  for(const t of h.tufts){if(t.front!==front)continue;
    const bx=h.x+h.jx*U+t.x*k,by=h.y+t.y*k;
    for(let j=0;j<t.n;j++){const a=t.lean+(j-(t.n-1)/2)*.42+Math.sin(S.rt*1.7+t.ph+j)*.07+rus*Math.sin(S.rt*44+t.ph*3+j)*.35,L=t.L*k*(1-.12*Math.abs(j-(t.n-1)/2));
      const tx=bx+Math.sin(a)*L,ty=by-Math.cos(a)*L,mx=(bx+tx)/2,my=(by+ty)/2;
      lineW(bx,by,mx,my,GRASS[0]);lineW(mx,my,tx,ty,GRASS[1]);plot(tx,ty,GRASS[2]);}}
}
function holeXf(h){xReset();xT(h.x+h.jx*U,h.y);xS(h.k*U,h.k*U);}
/* static burrow parts are baked: the back (shadow, mound, dark mouth) into the backdrop and the front
   lip into a sprite per burrow; they are re-rasterized live only while a burrow shakes or is scorched */
function holeBack(h,shadow){toRBUF();holeXf(h);if(shadow)fillE(geo(2,3.2,31.5,11.5),MT.gshadow);
  fillE(geo(0,MCY,MRX,MRY),h.scorch>0?MT.dirtB:MT.dirt);fillE(geo(0,0,HRX,HRY),MT.hole);}
function holeFront(h){const HG=geo(0,0,HRX,HRY),burnt=h.scorch>0;
  fillE(geo(0,MCY,MRX,MRY),burnt?MT.dirtB:MT.dirt,HG,-MCY/MRY,9,0,true);fillE(geo(0,.7,HRX+3,HRY+2.4),burnt?MT.dirtB:MT.crest,HG,.05,9,0,true);}
function bakeHoleSprite(h){newLayer();holeXf(h);holeFront(h);
  const x0=LX0,y0=LY0,w=LX1-LX0+1,hh=LY1-LY0+1,p=new Uint32Array(w*hh);
  for(let y=0;y<hh;y++)for(let x=0;x<w;x++){const i=(y0+y)*W+x0+x;p[y*w+x]=LST[i]===STAMP?LC[i]:0;}
  h.spr={x0,y0,w,h:hh,p};}
function blitSpr(sp){const p=sp.p,w=sp.w;for(let y=0;y<sp.h;y++){const r=(sp.y0+y)*W+sp.x0,o=y*w;for(let x=0;x<w;x++){const v=p[o+x];if(v!==0)RBUF[r+x]=v;}}}
const holeLive=h=>h.rus>.1||h.scorch>0;
function cursorRing(h,front){if(h.lit<=.02)return;toRBUF();holeXf(h);const G=geo(0,MCY,MRX+1.6,MRY+1.2);fillE(G,MT.cursor,null,front?-.05:-9,front?9:-.05,ringK(G,1.1));}
function drawHoleBack(h){if(holeLive(h))holeBack(h,false);cursorRing(h,false);tufts(h,false);}
function drawHoleFront(h){if(holeLive(h)){toRBUF();holeXf(h);holeFront(h);}else blitSpr(h.spr);cursorRing(h,true);tufts(h,true);}

/* sky life: twinkling stars, a string of festoon lights whose pattern follows the game mode */
const BULB=[[255,64,64],[255,186,50],[80,230,100],[70,180,255],[255,100,220]];
function wireY(x){const half=W/2,xx=x<half?x:x-half,t=xx/half*2-1;return (12.5+6.5*(1-t*t))*U;}
function drawSky(){
  for(const s of STARS){const k=.45+.55*Math.sin(S.rt*s[3]+s[2]*20),v=s[2]*k;if(v>.08)px(s[0],s[1],pack(130*v+30,130*v+30,160*v+50));}
  for(let x=0;x<W;x++)px(x,Math.round(wireY(x+.5)),pack(34,22,34));
  const n=Math.max(12,Math.round(W/(10.5*U))),mode=S.mode;
  for(let j=0;j<n;j++){const x=(j+.5)*W/n,y=wireY(x)+1.6*U,c=BULB[j%5];
    let b;
    if(S.lflash>0)b=1;
    else if(S.frenzy&&(mode==='play'||S.demo))b=((j+Math.floor(S.rt*7))&1)?1:.25;
    else if(mode==='title'||mode==='cast'||mode==='over')b=.3+.7*(frac(j/6-S.rt*1.2)<.34?1:0);
    else b=.62+.3*Math.sin(S.rt*2.3+j*1.7);
    const cr=c[0]*b,cg=c[1]*b,cb=c[2]*b,col=pack(cr*.6+90*b,cg*.6+90*b,cb*.6+90*b),xi=Math.round(x),yi=Math.round(y);
    px(xi,yi,col);if(U>=1){px(xi+1,yi,col);px(xi,yi+1,pack(cr,cg,cb));px(xi+1,yi+1,pack(cr,cg,cb));}
    glow(xi+1,yi+1,4.2*U,[cr*.5,cg*.5,cb*.5],.55*b);
  }
}
const FFLY=[];for(let i=0;i<9;i++)FFLY.push({x:Math.random(),y:.35+Math.random()*.55,p:Math.random()*TAU,s:.3+Math.random()*.5});
function drawFireflies(){for(const f of FFLY){const x=(f.x+.05*Math.sin(S.rt*f.s+f.p))*W,y=(f.y+.04*Math.sin(S.rt*f.s*1.7+f.p*2))*H,b=Math.max(0,Math.sin(S.rt*1.3+f.p*3));
  if(b>.1){px(x,y,pack(200*b+40,255*b,90*b));glow(x+.5,y+.5,3.5*U,[90,130,30],b*.7);}}}

/* ---------- 9.6 critter rigs ----------
   Rig space: the burrow centre is the origin, y down, a standing critter is ~45 units tall.
   Body pivots at the burrow (squash keeps the feet planted); the head hangs off a neck pivot
   at y=-19 and carries ears, face and props, so tilting the head carries everything with it. */
const KIND={
  mole:{name:'MOLE',sc:1,fur:'mole',bel:'moleB',paw:'paw',w:17,z:.42,rus:[.42,.27],up:[1.35,.82],sacc:[.45,1.2],blink:[1.6,3.6],lid0:0,mouth:'smile',teeth:1,ears:1,whisk:1,eye:[5.6,-11.6,3.3,4.2],voice:1,pts:20},
  hard:{name:'HARDHAT',sc:1.03,fur:'hard',bel:'hardB',paw:'pawH',w:13,z:.6,rus:[.5,.36],up:[1.95,1.45],sacc:[1.2,2.6],blink:[2.6,5],lid0:.3,mouth:'frown',teeth:0,ears:1,whisk:1,eye:[5.6,-10.4,3.3,3.8],voice:.78,pts:40},
  gold:{name:'GOLDIE',sc:.92,fur:'gold',bel:'goldB',paw:'pawG',w:24,z:.36,rus:[.3,.22],up:[.82,.62],sacc:[.1,.3],blink:[1.2,2.6],lid0:0,mouth:'open',teeth:1,ears:1,whisk:1,eye:[5.9,-11.8,3.8,4.8],voice:1.4,pts:80},
  bomb:{name:'BOMB',sc:1,fur:'bomb',bel:'bomb',paw:'pawB',w:15,z:.4,rus:[.45,.32],up:[1.95,1.6],sacc:[.6,1.4],blink:[2,4],lid0:.14,mouth:'grin',teeth:0,ears:0,whisk:0,eye:[5.4,-1.2,3.9,4.3],voice:.9,pts:-150},
  king:{name:'KING',sc:1.24,fur:'king',bel:'kingB',paw:'pawK',w:11,z:.5,rus:[.75,.75],up:[99,99],sacc:[.8,1.8],blink:[2.2,4.5],lid0:.38,mouth:'smirk',teeth:0,ears:1,whisk:0,eye:[5.5,-11.4,3.1,3.7],voice:.62,pts:20}
};
function mkCritter(hole){return {hole,kind:'mole',st:'none',t:0,dur:0,life:0,life0:1,hold:false,cool:0,
  H:SP(0),hT:0,hw:17,hz:.3,SQ:SP(0),LEAN:SP(0),leanT:0,TILT:SP(0),tiltT:0,HD:SP(0),EAR:[SP(0),SP(0)],WH:[SP(0),SP(0)],CRy:0,CRv:0,CRA:SP(0),
  lookX:0,lookY:0,ltx:0,lty:0,lookT:0,blinkT:2,blink:0,lid:0,lid0:0,lidAng:0,eyes:'open',mouth:'smile',mo:1,brow:0,
  flush:0,soot:0,red:0,fph:0,jx:0,br:0,hp:1,helmet:false,stars:0,worry:0,snick:0,snkOn:false,paw:0,laughSide:1,taunt:0,
  topX:0,topY:0,headX:0,headY:0,fuseX:0,fuseY:0,cast:false,act:0,scale:1,delay:0};}
/* root transform: burrow + emergence, then squash/stretch (area-preserving-ish) and lean as a shear */
function rigRoot(c){
  const KD=KIND[c.kind],k=c.hole.k*U*KD.sc*c.scale;
  xReset();xT(c.hole.x+c.jx*k,c.hole.y+(1-c.H.x)*DEPTH*k);xS(k,k);
  const sy=Math.max(.34,(1+c.SQ.x)*(1+.018*Math.sin(c.br))),sx=Math.pow(sy,-.62);
  xK(-Math.tan(c.LEAN.x));xS(sx,sy);return KD;
}
function drawRig(c){
  newLayer();const KD=rigRoot(c),kd=c.kind;
  if(kd==='bomb'){rigBomb(c,KD);return;}
  const fur=MT[KD.fur],bel=MT[KD.bel];
  fillE(geo(0,8,12.6,17),fur);fillE(geo(0,-11,13,14.6),fur);      /* trunk (lives in the burrow) + body */
  fillE(geo(0,4,8.2,12),bel);fillE(geo(0,-7.6,8.6,10.4),bel);
  if(kd==='king'){fillE(geo(0,-15.6,15.8,4.8),MT.ermine);for(const x of [-11,-5.5,0,5.5,11])plotL(x,-13.2+Math.abs(x)*.08,OUTL);}
  xPush();xT(0,-19+c.HD.x);xR(c.TILT.x);
  fillE(geo(0,-1.2,13.4,8.6),MT.shade);                       /* contact shadow of the head on the body */
  if(KD.ears&&!(kd==='hard'&&c.helmet))rigEars(c,fur);
  const HG=geo(0,-9,14.6,12.6);fillE(HG,fur);
  if(c.flush>.04){MT.flush.tint=.4*c.flush;fillE(HG,MT.flush,null,-.2);}
  fillE(geo(0,-3.4,8.3,5.7),kd==='king'?MT.kingM:bel);           /* muzzle */
  if(kd==='gold'||c.mouth==='laugh'||c.flush>.4)for(const s of [-1,1])fillE(geo(s*9.4,-3.8,2.6,1.7),MT.blush);
  rigEyes(c,KD,fur);
  rigMouth(c,KD,-.8);
  if(kd==='king')rigStache(c);
  fillE(geo(0,-6.1,3.5,2.7),MT.nose);
  if(KD.whisk)rigWhiskers(c);
  if(kd==='hard'&&c.helmet)rigHelmet();
  if(kd==='king')rigCrown(c);
  c.topX=wx(0,-24);c.topY=wy(0,-24);c.headX=wx(0,-8);c.headY=wy(0,-8);
  xPop();
}
function rigEars(c,fur){for(let i=0;i<2;i++){const s=i?1:-1;xPush();xT(s*9.6,-17.4);xR(s*(.32+c.EAR[i].x));fillE(geo(0,-3.3,4.4,5.3),fur);fillE(geo(0,-2.9,2.5,3.4),MT.inEar);xPop();}}
/* eyes: sclera, pupil (follows the look target), catch-light, a lid that is the upper part of a
   rotated copy of the eye (rotation = mood: angry slants inward, sad outward), lash line, brow */
function rigEyes(c,KD,fur){
  const E=KD.eye,mode=c.eyes;
  for(let i=0;i<2;i++){const s=i?1:-1,ex=s*E[0],ey=E[1],rx=E[2],ry=E[3];
    if(mode==='x'){strokeL(ex-rx*.9,ey-ry*.72,ex+rx*.9,ey+ry*.72,OUTL,1.15);strokeL(ex-rx*.9,ey+ry*.72,ex+rx*.9,ey-ry*.72,OUTL,1.15);continue;}
    if(mode==='happy'){const A=geo(ex,ey+ry*.4,rx*.95,ry*.8);fillE(A,MT.ink,null,-9,-.05,ringK(A,1.3));if(c.brow)rigBrow(c,s,ex,ey,rx,ry);continue;}
    if(mode==='shut'){strokeL(ex-rx*.85,ey+ry*.15,ex+rx*.85,ey+ry*.15,OUTL,1.1);continue;}
    const S_=geo(ex,ey,rx,ry);fillE(S_,MT.eye);
    if(mode==='spiral')fillE(S_,MT.spiral);
    else{const pr=mode==='wide'?.72:1,pX=ex+c.lookX*rx*.4,pY=ey+c.lookY*ry*.34;
      fillE(geo(pX,pY,rx*.56*pr,ry*.6*pr),MT.pupil,S_);plotL(pX-rx*.2,pY-ry*.26,WHITE);}
    const lid=mode==='wide'||mode==='spiral'?0:Math.max(c.lid,c.lid0);
    if(lid>.03){const L=geo(ex,ey,rx*1.3,ry*1.3,s*c.lidAng),ln=-.8+1.62*lid;fillE(L,fur,S_,-9,ln);fillE(L,MT.ink,S_,ln-.22,ln);}
    fillE(S_,MT.ink,null,-9,9,ringK(S_,1));
    if(c.brow)rigBrow(c,s,ex,ey,rx,ry);
  }
}
/* brows: 1 stern, 2 angry, 3 worried, 4 haughty */
function rigBrow(c,s,ex,ey,rx,ry){const b=c.brow,yb=ey-ry-1.5;let di=0,dout=0;
  if(b===1){di=.7;dout=.2;}else if(b===2){di=2.1;dout=-.5;}else if(b===3){di=-1.5;dout=.7;}else{di=.3;dout=-1.3;}
  const kg=c.kind==='king';strokeL(ex-s*rx*.85,yb+di,ex+s*rx*1.1,yb+dout,kg?MT.stache.ramp[4]:OUTL,kg?2:1.3);}
function buck(my){for(let s=-1;s<=1;s+=2){const T=geo(s*1.2,my+1.25,1.1,1.5);fillE(T,MT.teeth,null,-9,9,0,false,1);}lineL(0,my+.2,0,my+2.5,OUTL);}
function rigMouth(c,KD,my){
  const m=c.mouth;
  if(m==='smile'||m==='smirk'){const sm=m==='smirk',G=geo(sm?1.2:0,my-1.7,sm?3.6:4.5,2.9,sm?-.28:0);fillE(G,MT.ink,null,.1,9,ringK(G,1.15));if(KD.teeth&&!sm)buck(my);}
  else if(m==='frown'){const G=geo(0,my+1.9,3.9,2.4);fillE(G,MT.ink,null,-9,-.2,ringK(G,1.15));}
  else if(m==='o'){const G=geo(0,my+.6,2.1*c.mo,2.5*c.mo);fillE(G,MT.mouth);fillE(geo(0,my+.6+1.4*c.mo,1.6*c.mo,1.1*c.mo),MT.tongue,G);fillE(G,MT.ink,null,-9,9,ringK(G,1));}
  else if(m==='open'||m==='laugh'){const big=m==='laugh',G=geo(0,my+(big?1:.4),big?5.4:3.6,big?4.6:3.3),cut=-.32,bq=1.15/G.r;
    fillE(G,MT.mouth,null,cut);fillE(geo(0,my+(big?4.4:2.8),big?3.8:2.7,big?2.6:1.8),MT.tongue,G,cut);
    if(KD.teeth||big)fillE(G,MT.teeth,null,cut,cut+(big?.3:.34));fillE(G,MT.ink,null,cut,9,ringK(G,1));fillE(G,MT.ink,null,cut,cut+bq);}
  else if(m==='grit'){const G=geo(0,my+.8,4.7,2.3);fillE(G,MT.teeth,null,-9,9,0,false,1);lineL(-4.2,my+.8,4.2,my+.8,OUTL);for(const x of [-2.4,0,2.4])lineL(x,my-1.1,x,my+2.7,OUTL);fillE(G,MT.ink,null,-9,9,ringK(G,1),false,1);}
  else if(m==='wavy'){let ox=-4,oy=my+Math.sin(-4*1.4+FXT*9)*.8;for(let x=-3.5;x<=4.01;x+=.5){const y=my+Math.sin(x*1.4+FXT*9)*.8;lineL(ox,oy,x,y,OUTL);ox=x;oy=y;}const T=geo(1.8,my+2.4,1.7,2.4,.2);fillE(T,MT.tongue);fillE(T,MT.ink,null,-.1,9,ringK(T,1));}
  else if(m==='tongue'){const G=geo(0,my-1.5,4.2,2.6);fillE(G,MT.ink,null,.1,9,ringK(G,1.1));const T=geo(.6+Math.sin(FXT*22)*.5,my+2.3,2.1,2.8);fillE(T,MT.tongue,null,-.25);fillE(T,MT.ink,null,-.25,9,ringK(T,1));lineL(.6,my+1.4,.6,my+3.6,pack(200,60,90));}
  else if(m==='grin'){const G=geo(0,my-.6,8.2,5.6,0),bq=1.15/G.r;fillE(G,MT.teeth,null,0);for(const x of [-4,0,4]){const yy=my-.6+5.6*Math.sqrt(Math.max(0,1-(x/8.2)*(x/8.2)));lineL(x,my-.6,x,yy-.6,OUTL);}  /* toothy crescent */
    fillE(G,MT.ink,null,0,9,ringK(G,1.1));fillE(G,MT.ink,null,0,bq);}
}
function rigWhiskers(c){const col=c.kind==='hard'?pack(190,198,220):c.kind==='gold'?pack(236,220,170):pack(222,196,166);
  for(let i=0;i<2;i++){const s=i?1:-1,sp=c.WH[i].x;
    for(let j=0;j<2;j++){const rx=s*6.8,ry=-4.6+j*1.9,a=(j?.2:-.12)+sp,ah=(j?.2:-.12)+sp*.45,L=7.6;
      const mx=rx+s*Math.cos(ah)*L*.5,my=ry+Math.sin(ah)*L*.5,tx=mx+s*Math.cos(a)*L*.5,ty=my+Math.sin(a)*L*.5;
      lineL(rx,ry,mx,my,col);lineL(mx,my,tx,ty,col);}}}
function rigHelmet(){
  fillE(geo(0,-13.4,14.6,3),MT.shade);
  const D=geo(0,-19.6,15.4,9.6);fillE(D,MT.helmet,null,-9,.36);
  fillE(geo(0,-22,2.4,8),MT.helmetHi,D,-9,.6);
  fillE(geo(0,-16.2,18.6,2.7),MT.brim);
}
function rigStache(c){for(let i=0;i<2;i++){const s=i?1:-1;xPush();xT(s*1.2,-3.6);xR(s*(.1+c.WH[i].x*.9));
  const A=geo(s*4.8,0,5.4,2.2,s*.12);fillE(A,MT.stache);fillE(A,MT.ink,null,-9,9,ringK(A,1));const B=geo(s*9.6,-1.7,1.9,1.9);fillE(B,MT.stache);fillE(B,MT.ink,null,-9,9,ringK(B,1));xPop();}}
function rigCrown(c){
  xPush();xT(0,-20.4+c.CRy);xR(c.CRA.x);const r=MT.crown.ramp;
  triL(-8.6,0,-6,-7.4,-3.4,0,r[4]);triL(-6,-7.4,-3.4,0,-6,0,r[3]);
  triL(-3.7,0,0,-9.4,3.7,0,r[4]);triL(0,-9.4,3.7,0,0,0,r[3]);
  triL(3.4,0,6,-7.4,8.6,0,r[3]);triL(6,-7.4,8.6,0,6,0,r[2]);
  fillE(geo(-6,-7.8,1.3,1.3),MT.crown);fillE(geo(0,-9.8,1.4,1.4),MT.crown);fillE(geo(6,-7.8,1.3,1.3),MT.crown);
  fillE(geo(0,-.2,9,2.7),MT.crown,null,-9,9,0,false,1);
  fillE(geo(0,-.3,1.7,1.5),MT.gemR);fillE(geo(-5.4,-.2,1.2,1.1),MT.gemB);fillE(geo(5.4,-.2,1.2,1.1),MT.gemB);
  xPop();
}
/* the bomb is one glossy sphere: the face, cap and fuse ride on a tilted "head" frame at its centre */
function rigBomb(c,KD){
  fillE(geo(0,6,10,14),MT.bombT);fillE(geo(0,-16,15,15),MT.bomb);
  fillE(geo(-8.2,-25.2,3.4,1.6,-.75),MT.glint);plotL(-11.3,-21.5,pack(170,178,210));   /* a cartoon glint, clear of the face */
  xPush();xT(0,-16+c.HD.x*.6);xR(c.TILT.x);
  fillE(geo(0,-15.4,3.8,2.5),MT.cap,null,-9,9,0,false,1);
  const sw=Math.sin(FXT*5+c.hole.idx)*1.2;let ox=0,oy=-17;
  for(let k=1;k<=6;k++){const t=k/6,qx=2*(1-t)*t*(1.5+sw)+t*t*(4+sw*1.6),qy=(1-t)*(1-t)*-17+2*(1-t)*t*-22.5+t*t*-24;strokeL(ox,oy,qx,qy,FUSEC,1.3);ox=qx;oy=qy;}
  c.fuseX=wx(ox,oy);c.fuseY=wy(ox,oy);
  rigEyes(c,KD,MT.bomb);rigMouth(c,KD,5.8);
  c.topX=wx(0,-16);c.topY=wy(0,-16);c.headX=wx(0,-2);c.headY=wy(0,-2);
  xPop();
}
/* paws are a second pass, composited after the burrow's front lip so they grip the rim */
function drawPaws(c){
  if(c.paw<.5)return false;
  newLayer();const KD=rigRoot(c),pm=MT[KD.paw],cl=KD.paw==='pawB'?pack(120,130,176):pack(255,238,224);
  for(let i=0;i<2;i++){const s=i?1:-1;let py=4.3;const pxx=s*10.8;
    if(c.st==='laugh'&&s===c.laughSide)py-=Math.abs(Math.sin(c.t*16))*3.4;
    fillE(geo(pxx,py,4.8,3.1,s*.22),pm);for(let j=-1;j<=1;j++)plotL(pxx+j*1.7+s*.4,py+2.1,cl);}
  return true;
}
/* a lone hard hat (knocked off, tumbling) drawn through the same primitives */
function drawHelmetAt(x,y,r,k){newLayer();xReset();xT(x,y);xS(k,k);xR(r);xT(0,17);rigHelmet();}   /* spins about its own middle */
/* dizzy stars orbit the head on a flattened ellipse; the back half is drawn behind the critter */
/* a little five-pointed star (dizzy stars, bonk stars): spikes of length r with a hot centre */
function sparkle(x,y,b,k,rot){x=Math.round(x);y=Math.round(y);const cy=pack(255*b,206*b,50*b),cl=pack(255*b,240*b,150*b),cw=pack(255*b,255*b,235*b),r=Math.max(1.2,2.6*k),a0=rot||0;
  for(let i=0;i<5;i++){const a=a0+i*TAU/5-Math.PI/2,ca=Math.cos(a),sa=Math.sin(a);for(let j=1;j<=r+.01;j+=.7)px(x+Math.round(ca*j),y+Math.round(sa*j),j>r*.55?cy:cl);}
  px(x,y,cw);px(x+1,y,cl);px(x,y+1,cl);if(b>.8)glow(x+.5,y+.5,4.5*k,[110,90,20],.7);}
function dizzyStars(c,front){if(!c.stars||c.H.x<.32)return;                 /* they go under with the head */const k=c.hole.k*U*KIND[c.kind].sc;
  for(let i=0;i<3;i++){const a=FXT*5.2+i*TAU/3,sn=Math.sin(a);if((sn>=0)!==front)continue;
    sparkle(c.topX+Math.cos(a)*12.5*k,c.topY-2.5*k+sn*3.4*k,front?1:.55,k,FXT*4+i);}}
