/* ---------- 5. PINBALL: a real table body with its own playfield and backglass art ----------
   deluxe: the wide body, chrome armour, a speaker panel, light strips and a topper. */
function Pinball(o){
  const dx=o.deluxe,W2=dx?.4:.36,L=dx?1.46:1.36,TH=6.5*Math.PI/180,FH=.92;
  const a=Machine(Object.assign({useZ:.6,minH:30},o)),T=a.T;
  const PF=chain(T,mT(0,FH,.15),mRX(TH));                       /* playfield frame: x across, z up the table (toward -z) */
  const body=C_(o.body||'#120a1e'),trim=C_(o.trim||'#ff9a2e'),trim2=C_(o.trim2||'#4fe3ff'),rail=dx?CHROME:C_('#8a8fa0');
  const BB=chain(T,mT(0,FH+L*Math.sin(TH)+.02,.15-L*Math.cos(TH)-.02));
  /* the score display, drawn here rather than from a recording: attract text and a high-score roll */
  const dmd=new Screen(128,32,{mono:[1,.45,.08],gain:2.7});a.screens.push({scr:dmd,m:chain(BB,mT(0,.17,.13),mS(.46,.115,1)),att:null});
  const lamp=[];for(let i=0;i<(dx?26:16);i++)lamp.push({u:(Math.random()-.5)*W2*1.6,v:.15+Math.random()*(L-.4),c:[[1,.3,.7],[.3,.9,1],[1,.75,.2],[.6,.35,1]][i%4],ph:Math.random()*TAU});
  let lampM=null,ballM=null,flipM=null;const ball={u:0,v:.3,vu:.3,vv:.8};
  const gl1=a.W(0,1.6,-.2),L1=lightAt(gl1[0],1.65,gl1[2],2.6,o.glow||[1,.5,.3],.9);
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,PF);
    /* the cabinet box hanging under the playfield, its side rails and armour */
    mb.box(0,-.2,-L/2,W2*2+.08,.32,L+.1,body);
    for(const sx of [-1,1]){mb.box(sx*(W2+.05),.01,-L/2,.05,.1,L+.1,rail,dx?.08:.03);mb.tube([sx*(W2+.08),-.05,.03],[sx*(W2+.08),-.05,-L-.03],.008,sx<0?trim:trim2,2.8);
      if(dx)mb.tube([sx*(W2+.08),-.25,.03],[sx*(W2+.08),-.25,-L-.03],.008,sx<0?trim2:trim,2.8);}
    mb.box(0,.04,.04,W2*2+.12,.04,.06,rail,.1);                     /* lockdown bar */
    mb.box(0,-.2,.03,W2*2+.08,.3,.02,C_('#1a1226'));mb.box(0,-.24,.045,.22,.14,.01,DARKM);for(const cx of [-.05,.05])mb.box(cx,-.22,.05,.026,.045,.004,hex('#ff2b2b'),1.2);
    for(const sx of [-1,1])mb.push(),mb.tr(sx*(W2+.06),-.1,-.08),mb.rz(sx*Math.PI/2),mb.cyl(0,0,0,.018,.025,10,sx<0?trim:trim2,1.4),mb.pop();
    mb.push();mb.tr(W2-.04,-.02,.06);mb.rx(Math.PI/2);mb.cyl(0,0,0,.008,.09,8,CHROME);mb.sphere(0,.1,0,.018,trim,.6,1);mb.pop();
    /* the glass, faintly */
    mb.pop();
    /* legs */
    for(const [lx,lz] of [[-W2-.02,.12],[W2+.02,.12],[-W2-.02,-1.18],[W2+.02,-1.18]]){const top=a.W(lx,FH-.32+(-lz)*Math.sin(TH)*.9,lz+.05);
      mb.push();mb.m=mmul(mb.m,T);mb.tube([lx,top[1],lz+.05],[lx*1.05,.04,lz+.05],dx?.026:.022,dx?CHROME:hex('#2a2a32'));mb.box(lx*1.05,.02,lz+.05,.08,.04,.08,DARKM);if(dx)mb.tube([lx*1.05,.06,lz+.05],[lx*1.05,.06+.4,lz+.05],.03,trim,.0);mb.pop();}
    /* the backbox */
    mb.push();mb.m=mmul(mb.m,BB);
    const bh=dx?.86:.78,bw=W2*2+.06;
    mb.box(0,bh/2,-.08,bw,bh,.22,body);mb.box(0,.17,.03,.52,.15,.01,BLACK);
    for(const [p,q] of [[[-bw/2,0,.035],[-bw/2,bh,.035]],[[bw/2,0,.035],[bw/2,bh,.035]],[[-bw/2,bh,.035],[bw/2,bh,.035]]])mb.tube(p,q,.007,trim2,2.6);
    if(dx){/* speaker panel, light strips, and a topper ring like the black hole on the glass */
      mb.box(0,.05,.03,bw,.1,.02,DARKM);for(const sx of [-.2,.2])mb.cyl(sx,.05,.04,.04,.01,14,hex('#222'),0,.04);
      mb.push();mb.tr(0,bh+.17,-.02);
      for(let i=0;i<28;i++){const a0=i/28*TAU,a1=(i+1)/28*TAU,R=.15;mb.tube([Math.cos(a0)*R,Math.sin(a0)*R*.6,0],[Math.cos(a1)*R,Math.sin(a1)*R*.6,0],.018,i%2?trim:C_('#ff4fb8'),3);}
      mb.sphere(0,0,0,.07,BLACK,0,1,.6);mb.box(0,-.12,0,.36,.06,.08,body);mb.pop();}
    mb.pop();
    texQuad(BB,[[-W2+.02,.26,.031],[W2-.02,.26,.031],[W2-.02,bh-.03,.031],[-W2+.02,bh-.03,.031]],marqueeTex(o.name.toUpperCase(),'#1a0630','#05020c',GRAD.gold),1.6);
    /* the real art arrives from the game's own folder */
    if(o.backglass)imgCrop(o.backglass,(2*W2-.04)/(bh-.29),tex=>{a.bgM=texMeshAt(BB,[[-W2+.02,.26,.0315],[W2-.02,.26,.0315],[W2-.02,bh-.03,.0315],[-W2+.02,bh-.03,.0315]],tex,1.8);TEXMESH.push(a.bgM);a.bgT=[tex];
      /* the deluxe backbox is a screen: it steps through the game's boss paintings while nobody plays */
      for(const u of (o.backglassCycle||[]))imgCrop(u,(2*W2-.04)/(bh-.29),t=>a.bgT.push(t));});
    /* side art down the cabinet, from the game's own backglass paintings */
    const sa=o.sideArt||[];
    for(const [k,sx] of [[0,-1],[1,1]]){const url=sa[k]||sa[0];if(!url)continue;const x=sx*(W2+.042),pts=sx<0?[[x,-.345,-L-.03],[x,-.345,.03],[x,-.055,.03],[x,-.055,-L-.03]]:[[x,-.345,.03],[x,-.345,-L-.03],[x,-.055,-L-.03],[x,-.055,.03]];
      imgCrop(url,(L+.06)/.29,tex=>TEXMESH.push(texMeshAt(PF,pts,tex,.7)),1024);}
    if(o.boxArt)for(const sx of [-1,1]){const x=sx*(bw/2+.002),pts=sx<0?[[x,.02,-.19],[x,.02,.03],[x,bh-.02,.03],[x,bh-.02,-.19]]:[[x,.02,.03],[x,.02,-.19],[x,bh-.02,-.19],[x,bh-.02,.03]];
      imgCrop(o.boxArt,.22/(bh-.04),tex=>TEXMESH.push(texMeshAt(BB,pts,tex,.6)),256);}
    if(o.playfield)imgTex(o.playfield,(tex)=>{TEXMESH.push(texMeshAt(PF,[[-W2,.001,0],[W2,.001,0],[W2,.001,-L],[-W2,.001,-L]],tex,.55,2));});
    else{const c=mkCanvas(128,256),g=c.getContext('2d');g.fillStyle='#160a2a';g.fillRect(0,0,128,256);TEXMESH.push(texMeshAt(PF,[[-W2,.001,0],[W2,.001,0],[W2,.001,-L],[-W2,.001,-L]],texFrom(c,false),.4,2));}
    /* playfield lamps and a ball that wanders while nobody plays */
    const lb=new MB();lb.cyl(0,0,0,.012,.003,12,[1,1,1],1);lampM=mesh(lb);
    const bb=new MB();bb.sphere(0,0,0,.0135,hex('#d4d8e2'),.1,2);ballM=mesh(bb);
    const fb=new MB();fb.extrudeY([[0,-.013],[.075,-.006],[.075,.006],[0,.013]],0,.022,trim,.5);flipM=mesh(fb);
    const p0=a.W(-W2-.1,0,.25),p1=a.W(W2+.1,0,-L-.15);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  let dT=0,hiI=0;
  let bgI=0,bgC=0;
  a.onIdle=(dt,d)=>{
    L1.k=.75+.2*Math.sin(W_.t*2.1+a.x);
    if(a.bgT&&a.bgT.length>1){bgC+=dt;if(bgC>7){bgC=0;bgI=(bgI+1)%a.bgT.length;a.bgM.tex=a.bgT[bgI];}a.bgM.emi=1.8*(bgC<.12?.3+bgC*6:1);}
    ball.u+=ball.vu*dt*.35;ball.v+=ball.vv*dt*.35;ball.vv-=dt*.9;
    if(Math.abs(ball.u)>W2-.04){ball.u=Math.sign(ball.u)*(W2-.04);ball.vu*=-1;}if(ball.v>L-.12){ball.v=L-.12;ball.vv=-Math.abs(ball.vv);}
    if(ball.v<.18){ball.v=.18;ball.vv=1.6+Math.random()*.8;ball.vu=(Math.random()-.5)*1.4;a.kick=.2;}
    a.kick=Math.max(0,(a.kick||0)-dt);
    dT+=dt;if(dT>.12&&d<24){dT=0;const g=dmd.g;g.fillStyle='#000';g.fillRect(0,0,128,32);const t=W_.t;
      const ph=Math.floor(t/4)%3;
      if(ph===0){txt5(g,o.name.toUpperCase(),64,4,'#fff',o.name.length>10?1:2,'c');if(Math.floor(t*2)%2===0)txt3(g,'PRESS START',64,24,'#bbb','c');}
      else if(ph===1){txt3(g,'HIGH SCORES',64,2,'#888','c');(o.scores||['GRAND CHAMPION','1 UMB 60,000,000']).forEach((l,i)=>txt3(g,l,64,10+i*7,i?'#ddd':'#fff','c'));}
      else{const sc=Math.floor((t*913)%9e7);txt5(g,fmt(sc),64,6,'#fff',2,'c');txt3(g,'FREE PLAY',64,25,'#999','c');}
      dmd.upload();}
  };
  a.onDraw=()=>{
    if(!lampM)return;const t=W_.t;
    for(const l of lamp){const k=.5+.5*Math.sin(t*3+l.ph);drawLit(lampM,mmul(PF,mT(l.u,.002,-l.v)),{emi:.3+k*2.2,tint:l.c});}
    drawLit(ballM,mmul(PF,mT(ball.u,.0135,-ball.v)),{emi:.15});
    for(const sx of [-1,1]){const up=a.kick>0&&((sx<0)===(ball.u<0));drawLit(flipM,chain(PF,mT(sx*.07,.002,-.14),mRY(sx<0?(up?.5:-.45):Math.PI+(up?-.5:.45))));}
  };
  a.cam=()=>{const e=a.W(0,1.62,.85),t=a.W(0,1.05,-.55);return {eye:e,tgt:t,fov:46};};
  a.drawScreens=function(){drawScreen(dmd,this.screens[0].m);};
  return a;
}
function texMeshAt(M,pts,tex,emi,mode){const mm=new MB();mm.m=mmul(mm.m,M);mm.quad(pts[0],pts[1],pts[2],pts[3],[1,1,1],0,QUV);return {mesh:mesh(mm),tex,mode:mode||3,emi};}

/* ---------- 6. THE WHEEL (Cyclone): a tall lamp ring around its screen ---------- */
function Wheel(o){
  const a=Machine(Object.assign({useZ:.8},o)),T=a.T,R=.78,cy=1.45;
  a.addScreen(o.game.id,o.res||[256,144],[0,cy,.12],0,1.2,1.2/(o.aspect||16/9),{gain:o.gain,col:'#ffd23f'});
  const NL=40;let lampM=null;const gp=a.W(0,1.5,.8),Lg=lightAt(gp[0],1.6,gp[2],3.4,[1,.75,.3],1);
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    mb.box(0,.45,0,1.9,.9,.6,C_('#1a1030'));mb.box(0,cy,-.05,1.9,1.9,.24,C_('#140c24'));
    for(let i=0;i<48;i++){const a0=i/48*TAU,a1=(i+1)/48*TAU;mb.tube([Math.cos(a0)*R,cy+Math.sin(a0)*R,.1],[Math.cos(a1)*R,cy+Math.sin(a1)*R,.1],.03,C_('#d8a64a'),.3);
      mb.tube([Math.cos(a0)*(R+.12),cy+Math.sin(a0)*(R+.12),.08],[Math.cos(a1)*(R+.12),cy+Math.sin(a1)*(R+.12),.08],.012,C_('#ff3fa4'),2.4);}
    mb.box(0,.92,.28,1.2,.06,.3,DARKM);mb.sphere(0,.98,.3,.07,C_('#ff2b2b'),1.6,1);
    mb.box(0,cy+1.08,-.05,1.4,.32,.2,C_('#140c24'));mb.pop();
    texQuad(T,[[-.62,cy+.95,.06],[.62,cy+.95,.06],[.62,cy+1.21,.06],[-.62,cy+1.21,.06]],marqueeTex('CYCLONE','#2a0a1a','#0a0208',GRAD.gold),2.6);
    const lb=new MB();lb.sphere(0,0,0,.035,[1,1,1],1,1);lampM=mesh(lb);
    const p0=a.W(-.95,0,-.2),p1=a.W(.95,0,.45);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  a.onDraw=()=>{if(!lampM)return;const t=W_.t,head=(t*14)%NL;
    for(let i=0;i<NL;i++){const ang=Math.PI/2-i/NL*TAU,d=((head-i)%NL+NL)%NL,k=d<1?3:d<4?1.2/(d):.08+(i%5===0?.25:0);
      drawLit(lampM,chain(a.T,mT(Math.cos(ang)*(R+.06),cy+Math.sin(ang)*(R+.06),.14)),{emi:k,tint:i===0?[1,.2,.3]:[1,.78,.3]});}};
  a.onIdle=()=>{Lg.k=.85+.25*Math.sin(W_.t*5);};
  return a;
}

/* ---------- 7. THE TOWER (Sky Stack): a column of lamps reaching for a prize window ---------- */
function Tower(o){
  const a=Machine(Object.assign({useZ:.75},o)),T=a.T,sw=.62,sh=sw/(o.aspect||16/9);
  a.addScreen(o.game.id,o.res||[41,23],[0,1.2,.21],-.05,sw,sh,{gain:o.gain||2.6,col:'#9ff1ff'});
  let lamps=null;const gp=a.W(0,2,.6),Lg=lightAt(gp[0],2,gp[2],3,[.4,.8,1],.9);
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    mb.box(0,.45,0,.86,.9,.5,C_('#101828'));mb.box(0,1.62,-.04,.86,1.45,.36,C_('#0c1220'));
    mb.box(0,2.62,-.02,.9,.55,.42,C_('#101828'));mb.box(0,2.62,.2,.7,.4,.01,C_('#1d2a44'),.3);
    /* prizes behind glass at the top */
    const pc=['#ff3fa4','#ffd23f','#4fe3ff','#7dff6a'];for(let i=0;i<4;i++){mb.sphere(-.24+i*.16,2.5,.08,.06,C_(pc[i]),.3,1);mb.sphere(-.27+i*.16,2.56,.08,.025,C_(pc[i]),.3,1);mb.sphere(-.21+i*.16,2.56,.08,.025,C_(pc[i]),.3,1);}
    for(const sx of [-.44,.44])mb.tube([sx,.9,.19],[sx,2.86,.19],.012,C_('#4fe3ff'),2.6);
    mb.box(0,.94,.26,.5,.05,.12,DARKM);mb.cyl(0,.97,.27,.06,.03,14,C_('#4fe3ff'),2);mb.pop();
    texQuad(T,[[-.43,2.9,.0],[.43,2.9,.0],[.43,3.12,.0],[-.43,3.12,.0]],marqueeTex('SKY STACK','#0a1a30','#020610',GRAD.cyan),2.4);
    const lb=new MB();lb.box(0,0,0,.08,.05,.02,[1,1,1],1);lamps=mesh(lb);
    const p0=a.W(-.45,0,-.25),p1=a.W(.45,0,.35);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  a.onDraw=()=>{if(!lamps)return;const t=W_.t,row=Math.floor(t*3)%14;
    for(let r=0;r<14;r++)for(let c=0;c<5;c++){const lit=r<row?Math.abs(c-2)<=1+((r*7)%2):(r===row&&c===Math.floor(t*12)%5);
      drawLit(lamps,chain(a.T,mT(-.2+c*.1,1.58+r*.05,.15)),{emi:lit?2.2:.05,tint:r>11?[1,.8,.2]:[.3,.85,1]});}};
  a.onIdle=()=>{Lg.k=.8+.15*Math.sin(W_.t*2);};
  return a;
}

/* ---------- 8. CLAW: a glass box of plush and a claw that never stops hoping ---------- */
function Claw(o){
  const a=Machine(Object.assign({useZ:.85},o)),T=a.T,sw=.7,sh=sw/(o.aspect||16/9);
  a.addScreen(o.game.id,o.res||[256,144],[0,2.2,.36],-.15,sw,sh,{gain:o.gain,col:'#ff4fb8'});
  let clawM=null,cableM=null;const cl={x:0,z:0,tx:0,tz:0,y:1.85,ph:0};const gp=a.W(0,1.6,.1),Lg=lightAt(gp[0],1.7,gp[2],2.6,[1,.45,.8],.9);
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    mb.box(0,.45,0,1.0,.9,.92,C_('#2a1240'));mb.box(0,.92,.36,.9,.04,.24,DARKM);
    mb.cyl(-.18,.94,.38,.025,.07,8,hex('#ccc'));mb.sphere(-.18,1.02,.38,.035,C_('#ff3fa4'),.6,1);mb.cyl(.14,.94,.38,.04,.025,14,C_('#4fe3ff'),1.8);
    /* the glass box frame and roof */
    for(const [x,z] of [[-.49,-.45],[.49,-.45],[-.49,.45],[.49,.45]])mb.tube([x,.9,z],[x,2.0,z],.02,CHROME,.2);
    mb.box(0,2.06,0,1.02,.12,.94,C_('#2a1240'));mb.box(0,2.26,.18,.86,.32,.5,C_('#2a1240'));
    for(const z of [-.4,.4])mb.tube([-.46,1.96,z],[.46,1.96,z],.012,hex('#888'));
    /* the prize pile */
    const pc=['#ff3fa4','#ffd23f','#4fe3ff','#7dff6a','#c45cff','#ff8a2e'];
    for(let i=0;i<34;i++){const x=-.4+((i*37)%9)/9*.8,z=-.36+((i*53)%8)/8*.66,y=.98+((i*13)%3)*.07,c=C_(pc[i%6]);mb.sphere(x,y,z,.065,c,.15,1);mb.sphere(x-.04,y+.06,z,.025,c,.15,1);mb.sphere(x+.04,y+.06,z,.025,c,.15,1);mb.sphere(x,y+.01,z+.06,.012,BLACK,0,1);}
    mb.box(.32,.96,.3,.22,.12,.22,DARKM);                         /* the prize chute */
    for(const [p,q] of [[[-.5,2.0,.46],[.5,2.0,.46]],[[-.5,.9,.46],[.5,.9,.46]]])mb.tube(p,q,.012,C_('#ff3fa4'),2.6);
    mb.pop();
    const cb=new MB();cb.cyl(0,0,0,.05,.06,10,CHROME,.2);for(let k=0;k<3;k++){cb.push();cb.ry(k*TAU/3);cb.tube([0,0,0],[.06,-.08,0],.008,CHROME);cb.tube([.06,-.08,0],[.03,-.15,0],.008,CHROME);cb.pop();}clawM=mesh(cb);
    const kb=new MB();kb.tube([0,0,0],[0,1,0],.004,hex('#aaa'),0,4);cableM=mesh(kb);
    const p0=a.W(-.52,0,-.48),p1=a.W(.52,0,.5);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  a.onIdle=dt=>{cl.ph+=dt;const k=cl.ph%7;
    if(k<3){if(Math.hypot(cl.tx-cl.x,cl.tz-cl.z)<.02){cl.tx=(Math.random()-.5)*.7;cl.tz=(Math.random()-.5)*.6;}cl.x+=(cl.tx-cl.x)*Math.min(1,dt*1.5);cl.z+=(cl.tz-cl.z)*Math.min(1,dt*1.5);cl.y=1.85;}
    else if(k<4.5)cl.y=1.85-(k-3)/1.5*.68;else if(k<5)cl.y=1.17;else if(k<6.5)cl.y=1.17+(k-5)/1.5*.68;else cl.y=1.85;
    Lg.k=.8+.2*Math.sin(W_.t*2.6);};
  a.onDraw=()=>{if(!clawM)return;const len=1.96-cl.y;drawLit(cableM,chain(a.T,mT(cl.x,cl.y,cl.z),mS(1,len,1)));drawLit(clawM,chain(a.T,mT(cl.x,cl.y,cl.z)));};
  return a;
}

/* ---------- 9. COIN PUSHER: shelves of gold behind a window, a pusher that never rests ---------- */
function Pusher(o){
  const a=Machine(Object.assign({useZ:.8},o)),T=a.T,sw=.76,sh=sw/(o.aspect||16/9);
  a.addScreen(o.game.id,o.res||[256,144],[0,2.02,.25],-.12,sw,sh,{gain:o.gain,col:'#ffd23f'});
  let shelfM=null,coinM=null;const gp=a.W(0,1.4,.5),Lg=lightAt(gp[0],1.4,gp[2],2.6,[1,.8,.3],.9);
  const coins=[];for(let i=0;i<70;i++)coins.push({x:-.36+Math.random()*.72,z:-.25+Math.random()*.5,s:Math.floor(Math.random()*3)});
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    mb.box(0,.5,0,1.0,1.0,.84,C_('#2a1a08'));mb.box(0,1.62,-.06,1.0,.8,.72,C_('#2a1a08'));mb.box(0,1.62,.31,.84,.62,.01,C_('#140c04'),.05);
    for(const sx of [-.5,.5])mb.tube([sx,.0,.42],[sx,2.4,.42],.01,C_('#ffd23f'),1.1);
    mb.box(0,1.06,.36,.9,.05,.16,DARKM);mb.cyl(-.25,1.09,.38,.04,.03,14,C_('#ffd23f'),2);
    mb.box(0,1.12,.05,.86,.03,.62,C_('#4a3010'));mb.box(0,1.42,.05,.86,.03,.62,C_('#4a3010'));
    mb.pop();
    texQuad(T,[[-.48,2.4,.32],[.48,2.4,.32],[.48,2.62,.32],[-.48,2.62,.32]],marqueeTex('COIN CASCADE','#2a1a08','#0a0602',GRAD.gold),2.4);
    const sb=new MB();sb.box(0,0,0,.86,.08,.3,C_('#7a5a20'),.1);shelfM=mesh(sb);
    /* the coins never move, so they are part of the room's mesh */
    mb.push();mb.m=mmul(mb.m,T);for(const c of coins){const y=c.s===0?1.15:c.s===1?1.45:1.25;mb.cyl(c.x,y,c.z+.12,.028,.008,14,C_('#ffd23f'),.5,.028,true,C_('#ffe88a'));}mb.pop();
    const p0=a.W(-.52,0,-.45),p1=a.W(.52,0,.45);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  a.onDraw=()=>{if(!shelfM)return;const t=W_.t,pz=-.12+.1*Math.sin(t*1.4);
    drawLit(shelfM,chain(a.T,mT(0,1.2,pz)));drawLit(shelfM,chain(a.T,mT(0,1.5,-.1-pz*.6)));};
  a.onIdle=()=>{Lg.k=.8+.15*Math.sin(W_.t*1.9);};
  return a;
}

/* ---------- 10. ALLEY ROLLER (Ring Roller): a long ramp up to the scoring rings ---------- */
function Alley(o){
  const Ln=3.1,a=Machine(Object.assign({useZ:.55},o)),T=a.T,sw=.7,sh=sw/(o.aspect||16/9);
  a.addScreen(o.game.id,o.res||[256,144],[0,2.05,-Ln+.12],0,sw,sh,{gain:o.gain,col:'#7dff6a'});
  let ballM=null;const balls=[0,1,2].map(i=>({z:-.3-i*.1,v:0,on:false,t:i*1.4}));const gp=a.W(0,1.6,-Ln+.4),Lg=lightAt(gp[0],1.6,gp[2],3,[.4,1,.5],.9);
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const rise=.5,ang=Math.atan2(rise,Ln-.6);
    mb.push();mb.tr(0,.55,-(Ln-.6)/2-.1);mb.rx(ang);mb.box(0,0,0,.66,.05,Ln-.6,C_('#5a3a20'),.05);
    for(const sx of [-.33,.33])mb.box(sx,.08,0,.04,.16,Ln-.6,C_('#1a1024'));for(const sx of [-.31,.31])mb.tube([sx,.17,-(Ln-.6)/2],[sx,.17,(Ln-.6)/2],.008,C_('#7dff6a'),2.6);mb.pop();
    mb.box(0,.27,-(Ln-.6)/2-.1,.7,.54,Ln-.6,C_('#1a1024'));
    mb.box(0,.45,.1,.74,.9,.5,C_('#1a1024'));mb.box(0,.92,.2,.6,.04,.25,DARKM);
    /* the target: rings stepped up a backboard */
    mb.push();mb.tr(0,1.0,-Ln+.2);mb.box(0,.35,-.08,.74,1.4,.14,C_('#140a22'));
    for(const [ry,r,c] of [[.0,.26,'#7dff6a'],[.25,.19,'#4fe3ff'],[.45,.13,'#ffd23f'],[.6,.07,'#ff3fa4']]){for(let i=0;i<24;i++){const a0=i/24*TAU,a1=(i+1)/24*TAU;mb.tube([Math.cos(a0)*r,ry+Math.sin(a0)*r*.5,.0],[Math.cos(a1)*r,ry+Math.sin(a1)*r*.5,.0],.01,C_(c),2.4);}}
    mb.pop();
    /* the net cage */
    for(const sx of [-.36,.36])mb.tube([sx,.9,-Ln+.15],[sx,2.3,-Ln+.15],.012,hex('#666'));mb.tube([-.36,2.3,-Ln+.15],[.36,2.3,-Ln+.15],.012,hex('#666'));
    mb.pop();
    texQuad(T,[[-.36,2.36,-Ln+.1],[.36,2.36,-Ln+.1],[.36,2.56,-Ln+.1],[-.36,2.56,-Ln+.1]],marqueeTex('RING ROLLER','#0a2a14','#020a04',GRAD.green),2.4);
    const bb=new MB();bb.sphere(0,0,0,.045,C_('#d8c8a8'),.1,1);ballM=mesh(bb);
    const p0=a.W(-.4,0,-Ln),p1=a.W(.4,0,.38);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  a.onIdle=dt=>{for(const b of balls){b.t+=dt;if(!b.on&&b.t>4.2){b.on=true;b.z=-.1;b.v=2.6;b.t=0;}if(b.on){b.z-=b.v*dt;b.v=Math.max(.6,b.v-dt*.7);if(b.z<-Ln+.4){b.on=false;b.t=0;b.z=-.3;}}}Lg.k=.8+.15*Math.sin(W_.t*2.2);};
  a.onDraw=()=>{if(!ballM)return;const rise=.5,Lr=Ln-.6;for(const b of balls){const f=clamp((-b.z-.1)/Lr,0,1),y=b.on?.6+f*rise+.03:.96;drawLit(ballM,chain(a.T,mT((b.on?0:.18)+((b.t*3)%1)*0,y,b.on?b.z:.2+balls.indexOf(b)*.0)));}};
  return a;
}

/* ---------- 11. HOOPS (Bucket Blitz): a caged ramp under a backboard ---------- */
function Hoops(o){
  const Ln=2.5,a=Machine(Object.assign({useZ:.55},o)),T=a.T,sw=.8,sh=sw/(o.aspect||8/3);
  a.addScreen(o.game.id,o.res||[256,96],[0,2.62,-Ln+.06],0,sw,sh,{gain:o.gain,col:'#ffb84a'});
  let ballM=null;const ball={t:0};const gp=a.W(0,2.1,-Ln+.6),Lg=lightAt(gp[0],2.1,gp[2],3,[1,.6,.25],.9);
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    mb.box(0,.4,-Ln/2,1.0,.8,Ln,C_('#1a1030'));mb.box(0,.82,-Ln/2,.9,.04,Ln-.1,C_('#3a2a14'),.05);
    for(const sx of [-.5,.5]){mb.tube([sx,.8,0],[sx,2.6,-Ln],.012,hex('#666'));mb.tube([sx,.8,-Ln],[sx,2.9,-Ln],.02,hex('#555'));}
    mb.box(0,2.2,-Ln+.05,.86,.62,.03,C_('#e8e8f0'),.1);mb.box(0,2.08,-Ln+.07,.28,.22,.005,C_('#ff3030'),.4);
    for(let i=0;i<20;i++){const a0=i/20*TAU,a1=(i+1)/20*TAU;mb.tube([Math.cos(a0)*.12,1.95,-Ln+.22+Math.sin(a0)*.12],[Math.cos(a1)*.12,1.95,-Ln+.22+Math.sin(a1)*.12],.008,C_('#ff6a1a'),.8);}
    for(let i=0;i<10;i++){const a0=i/10*TAU;mb.tube([Math.cos(a0)*.12,1.95,-Ln+.22+Math.sin(a0)*.12],[Math.cos(a0)*.07,1.75,-Ln+.22+Math.sin(a0)*.07],.003,hex('#eee'));}
    mb.box(0,2.62,-Ln+.03,.9,.4,.06,C_('#140a22'));
    for(let i=0;i<6;i++)mb.sphere(-.3+i*.12,.9,-.18,.05,C_('#ff7a1a'),.1,1);
    mb.pop();
    texQuad(T,[[-.45,2.86,-Ln+.04],[.45,2.86,-Ln+.04],[.45,3.06,-Ln+.04],[-.45,3.06,-Ln+.04]],marqueeTex('BUCKET BLITZ','#2a1206','#0a0402',GRAD.amber),2.4);
    const bb=new MB();bb.sphere(0,0,0,.06,C_('#ff7a1a'),.15,1);ballM=mesh(bb);
    const p0=a.W(-.52,0,-Ln),p1=a.W(.52,0,.05);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  a.onIdle=dt=>{ball.t=(ball.t+dt)%2.4;Lg.k=.8+.15*Math.sin(W_.t*2.4);};
  a.onDraw=()=>{if(!ballM)return;const f=clamp(ball.t/1.1,0,1),z=lerp(-.1,-Ln+.22,f),y=f<1?lerp(.95,1.98,f)+Math.sin(f*Math.PI)*.75:1.98-(ball.t-1.1)*2.2;
    if(y>.86)drawLit(ballM,chain(a.T,mT(0,y,z)));};
  return a;
}

/* ---------- 12. BOWLING LANE (Strike Night): a short lane, pins, a scoring screen above ---------- */
function Lane(o){
  const Ln=3.3,a=Machine(Object.assign({useZ:.55},o)),T=a.T,sw=.84,sh=sw/(o.aspect||16/9);
  a.addScreen(o.game.id,o.res||[256,144],[0,1.78,-Ln+.08],0,sw,sh,{gain:o.gain,col:'#4fe3ff'});
  let pinM=null,ballM=null;const gp=a.W(0,1.3,-Ln+.5),Lg=lightAt(gp[0],1.3,gp[2],3,[.5,.7,1],.9);const bw={z:0,t:0};
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    mb.box(0,.3,-Ln/2,.9,.6,Ln,C_('#141024'));mb.box(0,.61,-Ln/2,.62,.02,Ln-.1,C_('#c8a070'),.08);
    for(const sx of [-.36,.36]){mb.box(sx,.62,-Ln/2,.1,.04,Ln,DARKM);mb.tube([sx,.66,0],[sx,.66,-Ln],.008,C_('#4fe3ff'),2.6);}
    for(let i=0;i<7;i++)mb.box(0,.623,-.4-i*.18,.015,.002,.05,C_('#552a10'));
    mb.box(0,1.15,-Ln+.05,.9,1.1,.1,C_('#101020'));mb.box(0,.9,-Ln+.25,.72,.5,.4,C_('#0a0a14'));
    mb.box(.52,.4,-.6,.14,.3,1.0,C_('#1a1430'));mb.sphere(.52,.6,-.3,.07,C_('#ff3fa4'),.3,1);mb.sphere(.52,.6,-.48,.07,C_('#4fe3ff'),.3,1);
    mb.pop();
    texQuad(T,[[-.45,2.1,-Ln+.11],[.45,2.1,-Ln+.11],[.45,2.32,-Ln+.11],[-.45,2.32,-Ln+.11]],marqueeTex('STRIKE NIGHT','#0a1430','#020408',GRAD.cyan),2.4);
    const pb=new MB();pb.cyl(0,0,0,.022,.09,10,C_('#f4f2ee'),.1,.012);pb.sphere(0,.11,0,.022,C_('#f4f2ee'),.1,1);pb.cyl(0,.075,0,.0225,.012,10,C_('#e02030'),.3);pinM=mesh(pb);
    const bb=new MB();bb.sphere(0,0,0,.06,C_('#3a1a6a'),.3,1);ballM=mesh(bb);
    const p0=a.W(-.6,0,-Ln),p1=a.W(.6,0,.05);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  const PINS=[[0,0],[-.05,-.08],[.05,-.08],[-.1,-.16],[0,-.16],[.1,-.16],[-.15,-.24],[-.05,-.24],[.05,-.24],[.15,-.24]];
  a.onIdle=dt=>{bw.t=(bw.t+dt)%5;Lg.k=.8+.15*Math.sin(W_.t*1.6);};
  a.onDraw=()=>{if(!pinM)return;const t=bw.t,hit=t>2.4;
    PINS.forEach(([px,pz],i)=>{const k=hit?Math.min(1,(t-2.4)*3):0,fall=k*(i%3===2?0:1);drawLit(pinM,chain(a.T,mT(px+fall*(i%2?.06:-.06),.62,-Ln+.55+pz),mRX(fall*1.4)));});
    if(t<2.5)drawLit(ballM,chain(a.T,mT(.02*Math.sin(t*2),.68,lerp(-.2,-Ln+.55,t/2.5))));};
  return a;
}

/* ---------- 13. WHACK TABLE: nine burrows, a mallet on a cord, a screen behind ---------- */
function WhackTable(o){
  const a=Machine(Object.assign({useZ:.85},o)),T=a.T,sw=.96,sh=sw/(o.aspect||16/9);
  a.addScreen(o.game.id,o.res||[256,144],[0,1.55,-.42],-.05,sw,sh,{gain:o.gain,col:'#ffb84a'});
  let headM=null;const H=[];for(let i=0;i<9;i++)H.push({x:-.32+(i%3)*.32,z:-.22+((i/3)|0)*.24,h:0,t:Math.random()*3});
  const gp=a.W(0,1.4,.3),Lg=lightAt(gp[0],1.4,gp[2],2.8,[1,.7,.3],.9);
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    mb.box(0,.4,-.05,1.2,.8,.9,C_('#2a1608'));mb.box(0,.82,-.05,1.16,.04,.86,C_('#4a8a30'),.05);
    for(const h of H){mb.cyl(h.x,.83,h.z,.09,.005,16,hex('#0a0604'));mb.cyl(h.x,.835,h.z,.1,.008,16,C_('#ffb84a'),1.4,.1,false);}
    mb.box(0,1.45,-.48,1.2,1.3,.1,C_('#1a1008'));mb.box(0,2.18,-.46,1.2,.22,.14,C_('#2a1608'));
    mb.push();mb.tr(.5,.88,.32);mb.rz(.3);mb.cyl(0,0,0,.016,.32,8,C_('#ffd23f'));mb.cyl(0,.32,0,.06,.09,12,C_('#e83020'),.2);mb.pop();
    mb.pop();
    texQuad(T,[[-.56,2.08,-.388],[.56,2.08,-.388],[.56,2.28,-.388],[-.56,2.28,-.388]],marqueeTex('WHACK SHACK','#2a1206','#0a0402',GRAD.amber),2.4);
    const hb=new MB();hb.sphere(0,0,0,.075,C_('#b07a4a'),.1,1,.9);hb.sphere(-.03,.04,.06,.015,hex('#ffffff'),.6,1);hb.sphere(.03,.04,.06,.015,hex('#ffffff'),.6,1);hb.sphere(0,.0,.075,.02,C_('#ff6a8a'),.3,1);headM=mesh(hb);
    const p0=a.W(-.62,0,-.55),p1=a.W(.62,0,.42);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  a.onIdle=dt=>{for(const h of H){h.t-=dt;if(h.t<0){h.t=1.2+Math.random()*2.5;h.up=.9;}h.up=Math.max(0,(h.up||0)-dt);h.h=h.up>0?Math.min(1,(.9-h.up)*6,h.up*6):0;}Lg.k=.8+.15*Math.sin(W_.t*2);};
  a.onDraw=()=>{if(!headM)return;for(const h of H)if(h.h>.02)drawLit(headM,chain(a.T,mT(h.x,.78+h.h*.11,h.z)));};
  return a;
}

/* ---------- 14. COMING SOON: a cabinet shape under a dust sheet ---------- */
function Covered(o){
  const a={name:o.name||'Coming soon',sub:o.sub||'Under wraps',controls:'none',use:{x:1e9,z:1e9,face:0},idle(){},draw(){},drawScreens(){}};
  const T=chain(mT(o.x,0,o.z),mRY(o.ry||0)),seed=o.seed||1;
  if(o.kind==='racer')a.build=mb=>{mb.push();mb.m=mmul(mb.m,T);
    /* a sit-down racer under its sheet: the tall screen hood at the front, the dip of the wheel, the seat back */
    const Z=[-1.02,-.96,-.7,-.3,-.06,.12,.32,.56,.84,1.06,1.24,1.4,1.5],HZ=[1.1,1.98,2.03,2.0,1.86,1.3,1.06,.9,.78,1.22,1.2,.5,.16],M=30,rings=[];
    Z.forEach((z,zi)=>{const hz=HZ[zi],R=[];for(let j=0;j<M;j++){const f=j/M*TAU,c=Math.cos(f),sn=Math.sin(f);
      let x=.66*Math.sign(c)*Math.pow(Math.abs(c),.4),y=hz*(.5+.5*Math.sign(sn)*Math.pow(Math.abs(sn),.4));
      const low=1-y/Math.max(.3,hz),d=(.004+.05*low*low)*Math.sin(z*11+f*5+seed)+(y<.1?.06:0);x+=Math.sign(x)*d;R.push([x,Math.max(0,y),z]);}rings.push(R);});
    const c1=C_('#6a6378'),c2=C_('#575166');
    loft(mb,rings,(m,i,j)=>Math.sin(m[2]*11+j/M*TAU*5+seed)>0?c1:c2,0);
    capRing(mb,rings[0],[0,.55,-1.04],c2);capRing(mb,rings[rings.length-1],[0,.08,1.52],c2);
    mb.pop();
    const p0=xf(T,-.75,0,-1.1),p1=xf(T,.75,0,1.55);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));};
  else a.build=mb=>{mb.push();mb.m=mmul(mb.m,T);
    /* the sheet follows the cabinet under it: the marquee's overhang, the screen set back, the control ledge */
    const M=36,YS=[2.06,2.03,1.96,1.86,1.78,1.66,1.4,1.16,1.08,1.0,.9,.7,.45,.22,.07,0],rings=[];
    const front=y=>y>1.84?.5:y>1.7?lerp(.33,.5,(y-1.7)/.14):y>1.12?.33:y>.98?.58:y>.86?lerp(.42,.58,(y-.86)/.12):.42;
    for(const y of YS){const k=1-y/2.06,amp=.004+.05*k*k,fl=y<.12?.08*(1-y/.12):0,R=[];
      for(let j=0;j<M;j++){const f=j/M*TAU,c=Math.cos(f),s=Math.sin(f),hx=y>2.0?.4:.43,hz=s>0?front(y):.42;
        let x=hx*Math.sign(c)*Math.pow(Math.abs(c),.45),z=hz*Math.sign(s)*Math.pow(Math.abs(s),.45);
        const d=amp*Math.sin(f*7+seed*1.7+k*2.2)+amp*.6*Math.sin(f*13+seed)+fl,l=Math.hypot(x,z)||1;x+=x/l*d;z+=z/l*d;
        R.push([x,y,z]);}rings.push(R);}
    const c1=C_('#6a6378'),c2=C_('#575166');
    loft(mb,rings,(m,i,j)=>Math.sin(j/M*TAU*7+seed*1.7)>0?c1:c2,0);capRing(mb,rings[0],[0,2.09,0],c1);
    mb.pop();
    const p0=xf(T,-.55,0,-.55),p1=xf(T,.55,0,.55);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));};
  ATTR.push(a);return a;
}
