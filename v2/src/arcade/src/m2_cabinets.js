/* =====================================================================================
   CABINETS. One builder per kind of machine; every one is lofted from the same mesh kit as the
   room, lit by the room's lights, with its game's attract loop on its screen.
   Local frame: the player stands at +z looking toward -z; x is across the machine.
   ===================================================================================== */
const C_=h=>hex(h),BLACK=hex('#050407'),CHROME=hex('#c3c9d6'),DARKM=hex('#0b0a12');
function sideArt(cols,motif){
  const c=mkCanvas(128,256),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,128,256);
  gr.addColorStop(0,cols[0]);gr.addColorStop(.55,cols[1]);gr.addColorStop(1,cols[2]||cols[1]);g.fillStyle=gr;g.fillRect(0,0,128,256);
  g.globalAlpha=.85;
  if(motif==='rays'){for(let i=0;i<18;i++){g.strokeStyle=i%2?'rgba(255,255,255,.18)':'rgba(0,0,0,.25)';g.lineWidth=7;g.beginPath();g.moveTo(64,250);g.lineTo(64+Math.cos(-Math.PI*i/17)*260,250+Math.sin(-Math.PI*i/17)*260);g.stroke();}}
  else if(motif==='grid'){g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=1;for(let y=120;y<256;y+=Math.max(3,(y-110)*.18)){g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();}for(let i=-8;i<=8;i++){g.beginPath();g.moveTo(64+i*4,120);g.lineTo(64+i*30,256);g.stroke();}}
  else if(motif==='stripes'){for(let i=0;i<5;i++){g.fillStyle=i%2?'rgba(255,255,255,.75)':'rgba(255,255,255,.22)';g.fillRect(0,150+i*16,128,9);}}
  else{for(let y=8;y<256;y+=10)for(let x=8;x<128;x+=10){g.fillStyle=`rgba(255,255,255,${.06+.12*Math.max(0,Math.sin(x*.05+y*.03))})`;g.beginPath();g.arc(x,y,2.2,0,TAU);g.fill();}}
  g.globalAlpha=1;return texFrom(c,false);
}

/* ---------- 1. UPRIGHT: the classic video cabinet ---------- */
function Upright(o){
  const a=Machine(o),T=a.T,asp=o.aspect||16/9,MW=.56,MH=.46;let sw=MW,sh=MW/asp;if(sh>MH){sh=MH;sw=MH*asp;}
  const ang=-.2104,n=[0,Math.sin(-ang),Math.cos(ang)];
  a.addScreen(o.game.id,o.res||[256,144],[0,1.32+n[1]*.008,.12+n[2]*.008],ang,sw,sh,{gain:o.gain,col:o.col});
  const glowP=a.W(0,1.35,.75),glow=lightAt(glowP[0],1.35,glowP[2],3.2,o.glow||[.4,.6,1],.85);
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const body=C_(o.body||'#141020'),side=C_(o.side||'#1c1530'),trim=C_(o.trim||'#2fe6ff');
    mb.extrudeX(CAB_PROF,-.31,.31,body);mb.extrudeX(CAB_PROF,-.34,-.31,side);mb.extrudeX(CAB_PROF,.31,.34,side);
    for(const sx of [-.345,.345])for(let i=0;i<CAB_PROF.length-1;i++){const A=CAB_PROF[i],B=CAB_PROF[i+1];mb.tube([sx,A[1],A[0]],[sx,B[1],B[0]],.007,trim,2.6);}
    mb.push();mb.tr(0,1.32+n[1]*.004,.12+n[2]*.004);mb.rx(ang);mb.quad([-.3,-.27,0],[.3,-.27,0],[.3,.27,0],[-.3,.27,0],BLACK);mb.pop();
    mb.push();mb.tr(0,.965,.34);mb.rx(.284);mb.box(0,-.005,0,.6,.01,.2,DARKM);
    mb.cyl(-.14,0,0,.03,.012,10,hex('#222'));mb.cyl(-.14,0,0,.008,.08,6,hex('#bbb'));mb.sphere(-.14,.09,0,.026,C_(o.ball||'#ff2f9a'),.6,1);
    mb.cyl(.06,0,0,.026,.02,12,C_(o.btnA||'#2fe6ff'),1.6);mb.cyl(.16,0,-.02,.026,.02,12,C_(o.btnB||'#ffd23f'),1.6);mb.pop();
    mb.box(0,.45,.305,.26,.3,.02,hex('#20202a'));for(const cx of [-.06,.06])mb.box(cx,.5,.317,.035,.06,.01,hex('#ff2b2b'),2.2);
    mb.tube([-.3,.02,.31],[.3,.02,.31],.01,trim,2.4);
    mb.pop();
    texQuad(T,[[-.3,1.645,.302],[.3,1.645,.302],[.3,1.875,.302],[-.3,1.875,.302]],marqueeTex(o.marq||o.name.toUpperCase(),o.mTop,o.mBot,o.mCols),2.2);
    const art=sideArt(o.art||['#3a1460','#ff2f9a','#140827'],o.motif);
    for(const sx of [-.347,.347]){const L=sx<0;texQuad(T,L?[[sx,.18,-.38],[sx,.18,.18],[sx,1.25,-.06],[sx,1.25,-.38]]:[[sx,.18,.18],[sx,.18,-.38],[sx,1.25,-.38],[sx,1.25,-.06]],art,.55);}
    const p0=a.W(-.4,0,-.4),p1=a.W(.4,0,.32);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
    if(o.crown){/* The Hollow Crown: a gilt crown over the marquee, and a lantern hung on each flank */
      const cm=new MB();cm.m=mmul(cm.m,T);const gd=C_('#e8c878'),dk=C_('#3a2a14');
      cm.push();cm.tr(0,1.885,.1);cm.ry(Math.PI/2);
      cm.extrudeX([[-.29,0],[-.29,.13],[-.21,.06],[-.14,.2],[-.07,.08],[0,.27],[.07,.08],[.14,.2],[.21,.06],[.29,.13],[.29,0]],-.025,.025,gd,.9);cm.pop();
      for(const xx of [-.14,0,.14])cm.sphere(xx,1.885+(xx?.2:.27),.1,.022,C_('#ffe8a8'),2.6,0);
      for(const sx of [-1,1]){const x=sx*.36;cm.tube([x,1.62,.05],[x+sx*.07,1.62,.05],.008,dk);cm.tube([x+sx*.07,1.62,.05],[x+sx*.07,1.54,.05],.004,dk);
        cm.box(x+sx*.07,1.47,.05,.07,.12,.07,dk);cm.box(x+sx*.07,1.47,.05,.045,.08,.045,C_('#ffb84a'),2.8);cm.box(x+sx*.07,1.535,.05,.08,.012,.08,gd,.4);}
      TEXMESH.push({mesh:mesh(cm),tex:null,mode:0});
    }
  };
  if(o.crown){const lp=a.W(0,1.5,.35);a.lant=lightAt(lp[0],1.55,lp[2],2.2,[1,.7,.35],.7);}
  a.onIdle=()=>{glow.k=.7+.2*Math.sin(W_.t*1.3+a.x);if(a.lant)a.lant.k=.6+.08*Math.sin(W_.t*7.1)+.05*Math.sin(W_.t*12.7);};
  return a;
}

/* ---------- 2. SIT-DOWN RACER: bucket seat, wheel, pedals, a big screen in a hood ---------- */
function Racer(o){
  const a=Machine(Object.assign({useZ:1.45},o)),T=a.T,sw=1.0,sh=sw/(o.aspect||16/9),tilt=-.083,sc=[0,1.36,-.38];
  a.addScreen(o.game.id,o.res||[256,144],sc,tilt,sw,sh,{gain:o.gain,col:o.col});
  const ac=C_(o.accent||'#ff2a4a'),ac2=C_(o.accent2||'#ffffff'),body=C_(o.body||'#16121f'),neon=C_(o.neon||'#ff2a4a');
  const glowP=a.W(0,1.1,.2),glow=lightAt(glowP[0],1.2,glowP[2],3.6,o.glow||[1,.3,.35],.9);
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    /* the plinth everything sits on, with a light line round it */
    mb.box(0,.07,.25,1.3,.14,2.35,DARKM);for(const [p,q] of [[[-.66,.15,-.92],[.66,.15,-.92]],[[-.66,.15,1.42],[.66,.15,1.42]],[[-.66,.15,-.92],[-.66,.15,1.42]],[[.66,.15,-.92],[.66,.15,1.42]]])mb.tube(p,q,.012,neon,3);
    /* the screen hood: side wings, a roof and a lit marquee */
    const prof=[[-.95,.14],[-.25,.14],[-.25,.78],[-.36,1.0],[-.42,1.72],[-.05,1.86],[-.05,1.98],[-.95,1.98]];
    mb.extrudeX(prof,-.6,.6,body);
    for(const sx of [-.62,.62]){mb.extrudeX(prof.map(p=>[p[0]-.02,p[1]]),sx-.02,sx+.02,ac);}
    mb.push();mb.tr(...sc);mb.rx(tilt);mb.quad([-.55,-.33,-.004],[.55,-.33,-.004],[.55,.33,-.004],[-.55,.33,-.004],BLACK);mb.pop();
    /* speaker grilles either side of the screen */
    for(const sx of [-.42,.42]){mb.box(sx,.9,-.27,.18,.14,.02,hex('#1d1d24'));for(let k=0;k<3;k++)mb.box(sx,.86+k*.04,-.282,.15,.012,.004,hex('#333'));}
    /* dashboard, wheel column and the wheel */
    mb.box(0,.86,-.12,1.08,.08,.42,DARKM);mb.box(0,.78,-.02,1.0,.14,.3,body);
    mb.push();mb.tr(0,.98,.12);mb.rx(-1.1);mb.cyl(0,0,0,.03,.22,10,hex('#333'));mb.pop();
    mb.push();mb.tr(0,1.06,.24);mb.rx(-.45);
    const R=.17;for(let i=0;i<20;i++){const a0=i/20*TAU,a1=(i+1)/20*TAU;mb.tube([Math.cos(a0)*R,Math.sin(a0)*R,0],[Math.cos(a1)*R,Math.sin(a1)*R,0],.018,hex('#1c1c22'),0,6);}
    mb.tube([-R,0,0],[R,0,0],.014,hex('#26262e'));mb.tube([0,0,0],[0,-R,0],.014,hex('#26262e'));mb.cyl(0,-.02,0,.04,.03,12,ac,1.2);mb.pop();
    /* pedals */
    for(const px of [-.12,.12]){mb.push();mb.tr(px,.26,-.36);mb.rx(-.6);mb.box(0,0,0,.09,.02,.18,CHROME);mb.pop();}
    /* the bucket seat on its rails */
    mb.box(0,.32,.82,.62,.18,.7,body);
    mb.push();mb.tr(0,.5,.85);mb.box(0,0,0,.52,.1,.52,hex('#202028'));mb.box(0,.05,0,.3,.02,.5,ac,.4);mb.pop();
    mb.push();mb.tr(0,.8,1.12);mb.rx(.22);mb.box(0,0,0,.52,.56,.12,hex('#202028'));mb.box(0,.02,.065,.26,.42,.01,ac,.4);mb.box(0,.2,.065,.18,.08,.01,ac2,.6);mb.box(0,.36,-.01,.3,.16,.1,hex('#202028'));mb.pop();
    for(const sx of [-.3,.3])mb.box(sx,.62,.9,.06,.3,.6,hex('#1a1a20'));
    /* livery stripes down the plinth sides */
    for(const sx of [-.655,.655]){mb.box(sx,.07,.25,.012,.06,2.2,ac,.8);mb.box(sx,.07,.25,.013,.02,2.2,ac2,.8);}
    mb.pop();
    texQuad(T,[[-.58,1.86,-.04],[.58,1.86,-.04],[.58,1.98,-.04],[-.58,1.98,-.04]],marqueeTex(o.marq||o.name.toUpperCase(),o.mTop,o.mBot,o.mCols,o.mSub),2.4);
    const p0=a.W(-.68,0,-.98),p1=a.W(.68,0,1.25);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  /* climbing in: over the seat back, down into the driver's eye line */
  a.camPath=(e,from)=>{const S0=a.screens[0],c=a.W(...S0.c),eye=a.W(0,1.28,.78),mid=a.W(0,1.75,1.6);
    const u=e<.45?e/.45:1,v=e<.45?0:(e-.45)/.55,p=e<.45?mix3_(from.eye,mid,ease(u)):mix3_(mid,eye,ease(v));
    return {eye:p,tgt:mix3_(from.tgt,c,ease(Math.min(1,e*1.6))),fov:lerp(from.fov,48,ease(e))};};
  a.onIdle=()=>{glow.k=.75+.2*Math.sin(W_.t*1.7+a.x);};
  return a;
}
const mix3_=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];

/* ---------- 3. RIDE-ON HOVER-BIKE: you sit on the bike, the screen floats ahead ---------- */
function BikeRide(o){
  const a=Machine(Object.assign({useZ:1.35},o)),T=a.T,sw=.92,sh=sw/(o.aspect||16/9),tilt=-.1,sc=[0,1.32,-.72];
  a.addScreen(o.game.id,o.res||[256,144],sc,tilt,sw,sh,{gain:o.gain,col:o.col});
  const glowP=a.W(0,.3,.3),under=lightAt(glowP[0],.25,glowP[2],2.6,[.2,.85,1],1.0),glow2=lightAt(a.W(0,1.4,-.2)[0],1.4,a.W(0,1.4,-.2)[2],3,[1,.2,.7],.7);
  const cy=C_('#2fe6ff'),pk=C_('#ff3fa4'),body=C_('#14121e'),sh2=C_('#2a2440');
  let bikeM=null;
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    /* the pod screen on a slanted pylon */
    mb.box(0,.7,-.86,.32,1.4,.24,body);mb.push();mb.tr(...sc);mb.rx(tilt);mb.box(0,0,-.03,sw+.1,sh+.1,.06,body);mb.pop();
    for(const sx of [-1,1])mb.tube([sx*(sw/2+.05),1.32-sh/2-.05,-.74],[sx*(sw/2+.05),1.32+sh/2+.05,-.78],.01,sx<0?pk:cy,3);
    /* the hover pad: a ring of light on the floor */
    mb.cyl(0,.01,.25,.78,.04,32,DARKM,0,.78,true,hex('#120f1c'));
    for(let i=0;i<32;i++){const a0=i/32*TAU,a1=(i+1)/32*TAU;mb.tube([Math.cos(a0)*.72,.06,.25+Math.sin(a0)*.72],[Math.cos(a1)*.72,.06,.25+Math.sin(a1)*.72],.012,i%2?cy:pk,3);}
    mb.pop();
    /* the bike itself is drawn separately so it can float and bank: a lofted body, nose to tail */
    const b=new MB(),BM=14;
    const BS=[[-.8,.02,.31,.35],[-.7,.09,.25,.43],[-.55,.15,.19,.53],[-.4,.19,.17,.6],[-.24,.21,.17,.58],[-.08,.21,.18,.55],
      [.08,.19,.2,.47],[.26,.18,.22,.47],[.44,.17,.24,.51],[.6,.13,.27,.53],[.73,.07,.32,.49]];
    const br=BS.map(s=>seRing(s[0],s[1],s[2],s[3],BM,2.4));
    const dk=C_('#17132a'),dk2=C_('#221a3c'),belly=C_('#0d0b16');
    loft(b,br,(m,i,j)=>m[1]<.27?belly:(j>2&&j<5)||(j>9&&j<12)?dk2:dk,0);
    capRing(b,br[0],[0,.33,-.84],dk);capRing(b,br[br.length-1],[0,.4,.77],dk);
    /* light lines along both flanks: cyan on the right, pink on the left */
    for(const [k,c] of [[0,cy],[BM/2,pk]]){const P=br.map(R=>R[k]);polyTube(b,P.map(p=>[p[0]*1.03,p[1],p[2]]),.008,c,3);
      polyTube(b,br.map(R=>R[k===0?1:BM/2-1]).map(p=>[p[0]*1.03,p[1],p[2]]).slice(1,7),.005,c,2);}
    /* windscreen, bars, clocks, seat, pegs */
    b.quad([-.15,.55,-.5],[.15,.55,-.5],[.11,.74,-.36],[-.11,.74,-.36],C_('#1d2c48'),.35);
    polyTube(b,[[-.15,.55,-.5],[-.11,.74,-.36],[.11,.74,-.36],[.15,.55,-.5]],.007,cy,2.4);
    b.tube([-.27,.63,-.3],[.27,.63,-.3],.014,hex('#3a3a46'));for(const sx of [-.27,.27])b.push(),b.tr(sx,.63,-.3),b.rz(Math.PI/2),b.cyl(0,-.05,0,.022,.1,8,hex('#111')),b.pop();
    b.box(0,.62,-.36,.16,.05,.08,hex('#0a0a10'));b.box(0,.645,-.37,.12,.005,.05,cy,2.2);
    b.box(0,.5,.2,.28,.06,.34,hex('#101018'));b.box(0,.535,.2,.08,.005,.3,pk,1.6);b.box(0,.58,.4,.26,.1,.08,hex('#101018'));
    for(const sx of [-1,1])b.box(sx*.24,.3,.12,.1,.02,.05,hex('#2a2a34'));
    /* hover pads fore and aft, glowing underneath, on short struts */
    for(const [pz,pr] of [[-.46,.2],[.46,.22]]){b.cyl(0,.04,pz,pr,.07,20,hex('#0c0c14'),0,pr*.85,true,hex('#0c0c14'));
      b.cyl(0,.035,pz,pr*.8,.006,20,cy,3,pr*.8,true,cy);
      for(let k=0;k<20;k++){const f0=k/20*TAU,f1=(k+1)/20*TAU;b.tube([Math.cos(f0)*pr,.075,pz+Math.sin(f0)*pr],[Math.cos(f1)*pr,.075,pz+Math.sin(f1)*pr],.006,k%2?cy:pk,2.6);}
      for(const sx of [-1,1])b.tube([sx*pr*.6,.1,pz],[sx*.12,.22,pz*.85],.02,hex('#2a2a34'));}
    /* the rear thruster */
    b.push();b.tr(0,.4,.7);b.rx(Math.PI/2);b.cyl(0,0,0,.07,.12,14,hex('#2a2a34'),0,.06);b.cyl(0,.115,0,.05,.01,14,pk,3,.05,true,pk);b.pop();
    bikeM=mesh(b);
    const p0=a.W(-.8,0,-1),p1=a.W(.8,0,1.05);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
    texQuad(T,[[-.46,1.32+sh/2+.12,-.79],[.46,1.32+sh/2+.12,-.79],[.46,1.32+sh/2+.3,-.79],[-.46,1.32+sh/2+.3,-.79]],marqueeTex(o.marq||'PRISMA',o.mTop||'#2a0a3a',o.mBot,o.mCols||GRAD.pink),2.4);
  };
  a.onDraw=()=>{if(!bikeM)return;const t=W_.t,h=.36+.03*Math.sin(t*1.9+a.x),bank=.05*Math.sin(t*.7+a.z);drawLit(bikeM,chain(a.T,mT(0,h,.25),mRZ(bank),mRX(.03*Math.sin(t*1.3))));};
  a.camPath=(e,from)=>{const c=a.W(...a.screens[0].c),eye=a.W(0,1.36,.42),mid=a.W(.9,1.6,1.4);
    const p=e<.5?mix3_(from.eye,mid,ease(e/.5)):mix3_(mid,eye,ease((e-.5)/.5));return {eye:p,tgt:mix3_(from.tgt,c,ease(Math.min(1,e*1.5))),fov:lerp(from.fov,50,ease(e))};};
  a.onIdle=()=>{under.k=.9+.25*Math.sin(W_.t*3.1);glow2.k=.6+.2*Math.sin(W_.t*1.1);};
  return a;
}

/* skin a run of rings (each the same number of points) into panels; col and skip see each panel's centre */
function loft(mb,rings,col,e=0,skip){
  for(let i=0;i<rings.length-1;i++){const R0=rings[i],R1=rings[i+1],n=R0.length;
    for(let j=0;j<n;j++){const a=R0[j],b=R0[(j+1)%n],c=R1[(j+1)%n],d=R1[j];
      const m=[(a[0]+b[0]+c[0]+d[0])/4,(a[1]+b[1]+c[1]+d[1])/4,(a[2]+b[2]+c[2]+d[2])/4];
      if(skip&&skip(m,i,j))continue;mb.quad(a,b,c,d,col(m,i,j),typeof e==='function'?e(m,i,j):e);}}
}
function capRing(mb,R,tip,col,e=0){for(let j=0;j<R.length;j++)mb.tri(tip,R[j],R[(j+1)%R.length],col,e);}
/* a rounded-box cross-section at z: half-width w, from yb to yt; n squares it off */
function seRing(z,w,yb,yt,M,n=2.6){const ym=(yb+yt)/2,hh=(yt-yb)/2,P=[];
  for(let k=0;k<M;k++){const f=k/M*TAU,c=Math.cos(f),s=Math.sin(f);P.push([w*Math.sign(c)*Math.pow(Math.abs(c),2/n),ym+hh*Math.sign(s)*Math.pow(Math.abs(s),2/n),z]);}return P;}
function polyTube(mb,pts,r,col,e=0,closed=false){for(let i=0;i<pts.length-(closed?0:1);i++)mb.tube(pts[i],pts[(i+1)%pts.length],r,col,e);}

/* ---------- 4. THE FLIGHT POD: a little airship. You climb into the gondola; the envelope rides above ----------
   The gondola is the cabinet: a lofted hull with portholes, a door left swung open on its +x side, steps up to
   it, a padded seat inside facing the screen in the nose. Above it, on brass struts and rigging, a striped
   envelope with its fins and the game's name, and engines on outriggers turning over slowly. */
function FlightPod(o){
  const a=Machine(Object.assign({useZ:0},o)),T=a.T,M=20;
  const useP=a.W(2.3,0,.3);a.use={x:useP[0],z:useP[2],face:(o.ry||0)-Math.PI/2};
  const sw=1.55,sh=sw/(o.aspect||16/9),sc=[0,1.22,-1.03],tilt=-.06;
  a.addScreen(o.game.id,o.res||[256,144],sc,tilt,sw,sh,{gain:o.gain||2,col:'#f2c45a'});
  /* a small viewscreen on the flank, so the walk-past sees the game too */
  a.addScreen(o.game.id,o.res||[256,144],[1.1,1.36,1.13],0,.5,.5/(16/9),{ry:Math.PI/2,gain:2,col:'#f2c45a'});
  const plum=C_('#3d1c44'),plum2=C_('#2a1230'),plumL=C_('#57285e'),brass=C_('#d8a64a'),cream=C_('#efe0c4'),gold=C_('#f2c45a'),wood=C_('#5a3420'),leather=C_('#6a2a3a');
  const gp=a.W(0,1.6,-.2),inner=lightAt(gp[0],1.6,gp[2],2.8,[1,.78,.45],1.0);
  const dp=a.W(1.6,1.5,.3),doorL=lightAt(dp[0],1.5,dp[2],2.4,[1,.7,.35],.8);
  const ep=a.W(1.4,3.4,0),envL=lightAt(ep[0],3.3,ep[2],3.2,[1,.55,.85],.55);
  const props=[];let propM=null;
  /* the hull stations: z, half-width, keel, roof */
  const ST=[[-1.78,.18,1.0,1.45],[-1.62,.55,.55,1.85],[-1.42,.85,.3,2.08],[-1.15,1.04,.18,2.22],[-.7,1.12,.14,2.27],[-.15,1.13,.13,2.28],
    [.3,1.13,.13,2.28],[.75,1.12,.14,2.27],[1.1,1.06,.17,2.24],[1.4,.9,.27,2.12],[1.62,.62,.5,1.92],[1.78,.3,.85,1.62]];
  const rings=ST.map(s=>seRing(s[0],s[1],s[2],s[3],M));
  const door=(i,j)=>(i===5||i===6)&&(j>=17||j<=2);
  /* the envelope: stations along z, fuller forward, tapering to the fins */
  const EY=3.48,ER=.62,EL=3.9,EK=16,EM=16,erings=[];
  const er=t=>ER*Math.pow(Math.max(0,Math.sin(Math.PI*t)),.5)*(1-.22*t*t);
  for(let k=0;k<=EK;k++){const t=(1-Math.cos(Math.PI*k/EK))/2,z=-EL/2+t*EL,r=er(t),R=[];for(let j=0;j<EM;j++){const f=j/EM*TAU;R.push([Math.cos(f)*r,EY+Math.sin(f)*r,z]);}erings.push(R);}
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    /* the cradle it rests on */
    mb.box(0,.06,0,2.7,.12,4.3,C_('#150b19'));
    for(const [p,q] of [[[-1.35,.125,-2.15],[1.35,.125,-2.15]],[[-1.35,.125,2.15],[1.35,.125,2.15]],[[-1.35,.125,-2.15],[-1.35,.125,2.15]],[[1.35,.125,-2.15],[1.35,.125,2.15]]])mb.tube(p,q,.016,gold,2.2);
    for(const z of [-.95,.95])mb.box(0,.16,z,1.5,.1,.3,wood);
    /* the hull: plum below the rail, a lighter plum above, the doorway left open */
    loft(mb,rings,(m)=>m[1]<1.02?plum2:m[1]<1.12?cream:m[1]>2.15?plum2:plum,0,(m,i,j)=>door(i,j));
    capRing(mb,rings[0],[0,1.22,-1.86],plum2);capRing(mb,rings[rings.length-1],[0,1.24,1.86],plum2);
    /* the rub rail and a gold pinstripe round the hull */
    const at=(k,f)=>rings.map(R=>R[k]);
    const railY=(i)=>{const s=ST[i],ym=(s[2]+s[3])/2;return ym;};
    for(const sx of [1,-1]){const k=sx>0?0:M/2;const pts=rings.map(R=>R[k]);
      const off=pts.map(p=>[p[0]+sx*.012,1.07,p[2]]);
      const cut=sx>0?[...off.slice(0,6)]:off;polyTube(mb,cut,.022,brass,.25);if(sx>0)polyTube(mb,off.slice(7),.022,brass,.25);
      const pin=pts.map(p=>[p[0]*1.004,.62,p[2]]);polyTube(mb,sx>0?pin.slice(0,6):pin,.008,gold,2.4);if(sx>0)polyTube(mb,pin.slice(7),.008,gold,2.4);}
    /* portholes, warm inside */
    for(const [z,sx] of [[-1.1,-1],[-.35,-1],[.4,-1],[1.15,-1],[-.75,1]]){const w=sx<0?1.11:1.06;mb.push();mb.tr(sx*w,1.5,z);mb.rz(sx*Math.PI/2);mb.cyl(0,-.03,0,.15,.07,16,brass,.3,.15,true,hex('#ffcf7a'));mb.pop();
      for(let k=0;k<8;k++){const f=k/8*TAU;mb.box(sx*(w+.04),1.5+Math.sin(f)*.17,z+Math.cos(f)*.17,.02,.025,.025,brass,.4);}}
    /* the doorway: a gold frame round the opening, and the door swung out on its hinge */
    for(const i of [5,7]){const R=rings[i],pts=[];for(let k=17;k<=23;k++)pts.push(R[k%M]);polyTube(mb,pts.map(p=>[p[0]+.01,p[1],p[2]]),.02,gold,1.3);}
    for(const k of [3,17])polyTube(mb,[rings[5][k],rings[6][k],rings[7][k]].map(p=>[p[0]+.01,p[1],p[2]]),.02,gold,1.3);
    mb.push();mb.tr(1.14,0,-.15);mb.ry(1.9);
    mb.box(.0,1.1,.45,.05,1.56,.86,plum);for(const sx of [-1,1])mb.box(sx*.03,1.1,.45,.01,1.4,.72,plum2);
    for(const sx of [-1,1]){mb.push();mb.tr(sx*.035,1.45,.45);mb.rz(Math.PI/2);mb.cyl(0,-.02,0,.13,.04,14,brass,.3,.13,true,hex('#ffcf7a'));mb.pop();}
    mb.box(.05,1.0,.78,.03,.12,.03,brass,.4);for(const y of [.55,1.65])mb.box(.0,y,.02,.07,.1,.05,brass,.2);
    polyTube(mb,[[.03,.33,.03],[.03,.33,.87],[.03,1.87,.87],[.03,1.87,.03]],.01,gold,1.2,true);
    mb.pop();
    /* steps up to the door */
    mb.box(1.42,.1,.3,.5,.2,1.0,wood);mb.box(1.75,.05,.3,.3,.1,1.0,wood);
    for(const z of [-.18,.78]){mb.tube([1.2,.3,z],[1.62,1.05,z],.018,brass,.3);mb.tube([1.62,0,z],[1.62,1.05,z],.018,brass,.3);}
    /* the deck on the roof, its rail, and the struts up to the envelope */
    mb.box(0,2.3,.0,.9,.05,2.5,wood);
    for(const sx of [-.42,.42]){for(let z=-1.2;z<=1.21;z+=.6)mb.tube([sx,2.32,z],[sx,2.52,z],.012,brass,.3);mb.tube([sx,2.52,-1.2],[sx,2.52,1.2],.012,brass,.3);}
    const eb=EY-ER*.96;
    for(const sx of [-1,1])for(const sz of [-1,1]){mb.tube([sx*.38,2.32,sz*1.05],[sx*.22,eb+.05,sz*1.25],.028,brass,.3);mb.tube([sx*.38,2.32,sz*1.05],[sx*.4,eb+.12,-sz*.2],.006,C_('#b9a27a'));}
    mb.tube([-.22,eb+.05,-1.25],[.22,eb+.05,-1.25],.02,brass,.3);mb.tube([-.22,eb+.05,1.25],[.22,eb+.05,1.25],.02,brass,.3);
    /* the envelope, in gores, with gold seams and a nose cap */
    loft(mb,erings,(m,i,j)=>j%2?plum:plumL,.0);
    for(let j=0;j<EM;j+=2)polyTube(mb,erings.map(R=>R[j]).map(p=>[p[0]*1.006,EY+(p[1]-EY)*1.006,p[2]]),.009,gold,1.6);
    for(const k of [4,8,12])polyTube(mb,erings[k].map(p=>[p[0]*1.008,EY+(p[1]-EY)*1.008,p[2]]),.012,brass,.3,true);
    mb.sphere(0,EY,-EL/2+.01,.06,brass,.3,1);
    /* fins */
    const fz=EL/2;
    mb.push();mb.tr(0,0,0);mb.extrudeX([[fz-.85,EY+.32],[fz-.05,EY+.12],[fz+.12,EY+.86],[fz-.4,EY+.82]],-.025,.025,plum2);mb.pop();
    mb.extrudeX([[fz-.85,EY-.32],[fz-.05,EY-.12],[fz+.12,EY-.8],[fz-.4,EY-.76]],-.025,.025,plum2);
    for(const sx of [-1,1])mb.extrudeY([[sx*.3,fz-.85],[sx*.12,fz-.05],[sx*.92,fz+.12],[sx*.86,fz-.4]].map(p=>[p[0],p[1]]),EY-.025,EY+.025,plum2);
    for(const [p,q] of [[[0,EY+.86,fz+.12],[0,EY+.82,fz-.4]],[[0,EY-.8,fz+.12],[0,EY-.76,fz-.4]],[[.92,EY,fz+.12],[.86,EY,fz-.4]],[[-.92,EY,fz+.12],[-.86,EY,fz-.4]]])mb.tube(p,q,.014,gold,2.2);
    /* engines on outriggers, and the stern shaft */
    for(const sx of [-1,1]){const ex=sx*1.62;mb.tube([sx*.98,1.98,1.2],[ex,1.98,1.2],.03,brass,.3);mb.tube([sx*1.04,1.62,1.05],[ex,1.9,1.18],.018,brass,.3);
      mb.push();mb.tr(ex,1.98,1.0);mb.rx(Math.PI/2);mb.cyl(0,0,0,.08,.5,12,plum2,0,.13);mb.cyl(0,.5,0,.13,.06,12,brass,.3,.1);mb.cyl(0,-.02,0,.05,.04,10,hex('#ff9a3a'),2.2);mb.pop();}
    mb.push();mb.tr(0,1.24,1.8);mb.rx(Math.PI/2);mb.cyl(0,0,0,.06,.22,10,brass,.3,.05);mb.pop();
    /* inside: plank floor, a padded seat, a stick and a throttle, a brass rail round the screen */
    mb.box(0,.2,0,1.9,.04,2.6,wood);
    mb.box(0,.36,.62,.66,.28,.62,wood);mb.box(0,.54,.62,.6,.1,.56,leather);mb.push();mb.tr(0,.95,.95);mb.rx(.2);mb.box(0,0,0,.6,.86,.12,leather);mb.pop();
    for(const sx of [-.33,.33])mb.box(sx,.72,.66,.06,.06,.5,wood);
    mb.box(0,.72,-.1,.9,.06,.4,wood);mb.cyl(-.18,.75,-.02,.025,.24,8,hex('#2a2a2a'));mb.sphere(-.18,1.0,-.02,.05,C_('#c8302a'),.4,1);
    mb.box(.24,.82,-.05,.06,.12,.16,brass,.2);mb.cyl(.24,.88,-.05,.02,.12,8,brass,.3);mb.sphere(.24,1.02,-.05,.035,cream,.3,1);
    for(const [x,y] of [[-.32,.78],[.38,.78]]){mb.push();mb.tr(x,y,-.25);mb.rx(-.6);mb.cyl(0,0,0,.05,.02,12,brass,.3,.05,true,cream);mb.pop();}
    mb.push();mb.tr(...sc);mb.rx(tilt);
    for(const [p,q] of [[[-sw/2-.04,-sh/2-.04,.01],[sw/2+.04,-sh/2-.04,.01]],[[-sw/2-.04,sh/2+.04,.01],[sw/2+.04,sh/2+.04,.01]],[[-sw/2-.04,-sh/2-.04,.01],[-sw/2-.04,sh/2+.04,.01]],[[sw/2+.04,-sh/2-.04,.01],[sw/2+.04,sh/2+.04,.01]]])mb.tube(p,q,.022,brass,.4,6);
    mb.box(0,0,-.04,sw+.16,sh+.16,.04,BLACK);mb.pop();
    /* the flank viewscreen's brass frame */
    mb.box(1.07,1.36,1.13,.05,.36,.6,BLACK);polyTube(mb,[[1.1,1.18,.83],[1.1,1.18,1.43],[1.1,1.54,1.43],[1.1,1.54,.83]],.016,brass,.4,true);
    mb.pop();
    /* the name on both flanks of the envelope, a band that follows its curve */
    const nm=mkCanvas(512,96),g=nm.getContext('2d');g.fillStyle='#1a0a1e';g.fillRect(0,0,512,96);g.strokeStyle='#f2c45a';g.lineWidth=3;g.strokeRect(4,4,504,88);
    gradText(g,'AETHERMOOR',256,18,4,GRAD.gold);txt3(g,'SKIES OF',256,6,'#efe0c4','c');txt3(g,'DELUXE FLIGHT POD',256,80,'#efe0c4','c');
    const ntex=texFrom(nm,false),bm=new MB();bm.m=mmul(bm.m,T);
    for(const sx of [1,-1]){const N=10,z0=-1.15,z1=1.0,y0=EY-.17,y1=EY+.17;
      for(let k=0;k<N;k++){const za=z0+(z1-z0)*k/N,zb=z0+(z1-z0)*(k+1)/N,ta=(za+EL/2)/EL,tb=(zb+EL/2)/EL,ra=er(ta)+.012,rb=er(tb)+.012;
        const ua=sx>0?k/N:1-k/N,ub=sx>0?(k+1)/N:1-(k+1)/N;
        const P=(r,z,y)=>[sx*Math.sqrt(Math.max(0,r*r-(y-EY)*(y-EY))),y,z];
        sx>0?bm.quad(P(ra,za,y0),P(rb,zb,y0),P(rb,zb,y1),P(ra,za,y1),[1,1,1],0,[[ua,0],[ub,0],[ub,1],[ua,1]])
            :bm.quad(P(rb,zb,y0),P(ra,za,y0),P(ra,za,y1),P(rb,zb,y1),[1,1,1],0,[[ub,0],[ua,0],[ua,1],[ub,1]]);}}
    TEXMESH.push({mesh:mesh(bm),tex:ntex,mode:3,emi:1.9});
    /* propellers: one on the stern, one on each engine; they turn in their own draw */
    const pb=new MB();for(let k=0;k<3;k++){pb.push();pb.rz(k*TAU/3);pb.push();pb.tr(0,.3,0);pb.rz(.0);pb.box(0,0,0,.1,.56,.016,cream,.1);pb.pop();pb.pop();}pb.cyl(0,0,-.03,.06,.08,12,brass,.3);propM=mesh(pb);
    const sp=new MB();for(let k=0;k<4;k++){sp.push();sp.rz(k*TAU/4);sp.box(0,.13,0,.05,.26,.01,cream,.1);sp.pop();}const smallM=mesh(sp);
    props.push({m:propM,M:mT(0,1.24,2.04),w:2.2},{m:smallM,M:mT(1.62,1.98,1.54),w:-5.5},{m:smallM,M:mT(-1.62,1.98,1.54),w:5.1});
    const p0=a.W(-1.4,0,-2.2),p1=a.W(1.4,0,2.2);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
    const s0=a.W(1.3,0,-.25),s1=a.W(1.95,0,.85);block(Math.min(s0[0],s1[0]),Math.max(s0[0],s1[0]),Math.min(s0[2],s1[2]),Math.max(s0[2],s1[2]));
  };
  let pa=0;
  a.onDraw=()=>{for(const p of props)drawLit(p.m,chain(a.T,p.M,mRZ(pa*p.w)));};
  a.onIdle=(dt)=>{pa+=dt;inner.k=.9+.15*Math.sin(W_.t*1.6);doorL.k=.7+.15*Math.sin(W_.t*2.3+1);envL.k=.5+.1*Math.sin(W_.t*.9);};
  /* climbing in: up the steps to the door, through it, into the seat facing the screen */
  a.camPath=(e,from)=>{const c=a.W(...a.screens[0].c),door=a.W(2.05,1.6,.3),inD=a.W(.25,1.48,.3),seat=a.W(0,1.38,.62);
    let p,tg;
    if(e<.4){const u=ease(e/.4);p=mix3_(from.eye,door,u);tg=mix3_(from.tgt,a.W(0,1.3,.3),u);}
    else if(e<.72){const u=ease((e-.4)/.32);p=mix3_(door,inD,u);tg=mix3_(a.W(0,1.3,.3),c,u);}
    else{const u=ease((e-.72)/.28);p=mix3_(inD,seat,u);tg=c;}
    return {eye:p,tgt:tg,fov:lerp(from.fov,52,ease(e))};};
  a.cam=()=>({eye:a.W(0,1.38,.62),tgt:a.W(...a.screens[0].c),fov:52});
  return a;
}
