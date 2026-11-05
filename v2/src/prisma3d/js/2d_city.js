/* =====================================================================================
   2d. THE CITY — built in 96 m chunks ahead of the bike and thrown away behind it.
   Every chunk is made the same way every time from its number, so the city never changes
   when you drive the same stretch again. Each chunk has two meshes:
     ground  the road and the pavements (they read the mirror of the city)
     solid   everything standing up: buildings, signs, lamps, lanterns, the skyway, the tunnel
   ===================================================================================== */
const CHUNK=96;
/* per stage: how the blocks are laid out (the original's numbers) and how they look */
const CITY=[
  {kind:'street',P:34,hMin:14,hMax:95,signs:1,lamps:true,lantern:false,glass:.24,lit:[.22,.5],board:.38,back:[60,240],
   walls:[[.09,.085,.11],[.12,.10,.11],[.07,.08,.10],[.10,.09,.13]],pave:[.11,.105,.12]},
  {kind:'street',P:26,hMin:8,hMax:26,signs:2,lamps:true,lantern:true,glass:0,lit:[.35,.65],board:.2,back:[18,44],
   walls:[[.14,.09,.08],[.11,.08,.09],[.16,.12,.09],[.09,.08,.09]],pave:[.12,.10,.09]},
  {kind:'skyway'},
  {kind:'tunnel',P:34,hMin:20,hMax:70,signs:1,lamps:false,lantern:false,glass:.3,lit:[.25,.5],board:.3,back:[60,200],
   walls:[[.08,.09,.11],[.1,.1,.12],[.07,.08,.1]],pave:[.08,.09,.1]}
];
const CH={map:new Map(),stage:-1,builds:0,tris:0};
const rgbN=i=>{const c=[ST.N1,ST.N2,ST.N3][i];return [c[0],c[1],c[2]];};
const signCol=id=>rgbN(Math.floor(ihash(id*7+3)*3));
const R_=(a,b)=>ihash2(a,b);
function cityReset(){for(const c of CH.map.values()){freeMesh(c.g);freeMesh(c.s);}CH.map.clear();CH.stage=ST.id;}
function cityUpdate(s,budget){
  if(CH.stage!==ST.id)cityReset();
  const view=ST.id===2?760:560,k0=Math.floor((s-60)/CHUNK),k1=Math.floor((s+view)/CHUNK);
  for(const [k,c] of CH.map)if(k<k0-1||k>k1+1){freeMesh(c.g);freeMesh(c.s);CH.map.delete(k);}
  let n=0;
  /* nearest chunks first, so a fresh stage fills in from the bike outward */
  for(let k=k0;k<=k1;k++){if(CH.map.has(k))continue;if(n>=budget)break;CH.map.set(k,buildChunk(k));n++;}
}
function buildChunk(k){
  const G=new MB(),Sd=new MB(),z0=k*CHUNK,z1=z0+CHUNK,C=CITY[ST.id];
  if(C.kind==='street')streetChunk(G,Sd,z0,z1,C,false);
  else if(C.kind==='skyway')skywayChunk(G,Sd,z0,z1);
  else tunnelChunk(G,Sd,z0,z1,C);
  CH.builds++;
  return {k,g:G.upload(),s:Sd.upload(),z0,z1};
}
/* ---------- the road and the pavements ---------- */
function roadStrip(G,z0,z1,C,seg){
  const st=seg||3,pave=C&&C.pave?C.pave:[.1,.1,.11];
  for(let z=z0;z<z1-1e-6;z+=st){const zb=Math.min(z1,z+st);
    G.quad([-9,0,z],[9,0,z],[9,0,zb],[-9,0,zb],[1,1,1],1);
  }
  return pave;
}
function pavements(G,z0,z1,pave,outer){
  for(const sd of [-1,1]){
    const a=sd*9,b=sd*14.5;
    G.box(Math.min(a,b),0,z0,Math.max(a,b),.22,z1,pave,2,null,4,3);
    /* the kerb face */
    if(sd>0)G.box(9,0,z0,9.001,.22,z1,[.16,.16,.17],2,null,2,6);else G.box(-9.001,0,z0,-9,.22,z1,[.16,.16,.17],2,null,1,6);
    /* ground out behind the buildings */
    const o0=sd*14.5,o1=sd*(outer||150);G.box(Math.min(o0,o1),.2,z0,Math.max(o0,o1),.22,z1,[.05,.05,.06],2,null,4,24);
  }
}
/* ---------- a city block on one side: the original's layout, with podiums, towers and signs ---------- */
function blockAt(Sd,G,cell,sd,C,stageSeed){
  const P=C.P,id=cell*2+(sd>0?1:0),r=i=>R_(id*31+stageSeed,i);
  const zc=(cell+.5)*P,gap=2.5+r(3)*5,D=8+r(2)*12,Hh=C.hMin+r(1)*r(1)*(C.hMax-C.hMin),Ht=Hh*2;
  const zA=zc-(P-gap)/2,zB=zc+(P-gap)/2,uF=14.5,uB=14.5+D*2;
  const xs=(a,b)=>sd>0?[a,b]:[-b,-a];   /* road side -> far side, mirrored for the left */
  const wall=C.walls[(r(4)*C.walls.length)|0],seed=r(5)*100,lit=C.lit[0]+r(6)*(C.lit[1]-C.lit[0]),fh=3.1+r(7)*.6;
  const glass=Ht>60&&r(8)<C.glass;
  const style=C.signs>1.5?(r(9)<.62?3:2):(r(9)<.55?0:2);
  const ext=[seed,lit,style,fh];
  if(glass){
    /* a glass tower on a lit podium */
    const pod=10+r(10)*6;let [a,b]=xs(uF,uB);Sd.box(a,0,zA,b,pod,zB,wall,3,ext,63,8);
    const set=2+r(11)*3;[a,b]=xs(uF+set,uB-1);Sd.box(a,pod,zA+set*.6,b,Ht,zB-set*.6,[.02,.03,.05],4,[seed,0,0,0],63,8);
    [a,b]=xs(uF+set-.2,uF+set+.2);Sd.box(a,pod,zA+set*.6,b,pod+.4,zB-set*.6,[.4,.4,.45],6,null,63,8);
    /* a lit crown */
    [a,b]=xs(uF+set,uB-1);Sd.box(a,Ht,zA+set*.6,b,Ht+.6,zB-set*.6,rgbN((r(12)*3)|0),5,[2.2,0,0,0],63,8);
  }else if(Ht>55){
    /* podium + a set-back tower + a roof box */
    const pod=12+r(10)*10;let [a,b]=xs(uF,uB);Sd.box(a,0,zA,b,pod,zB,wall,3,ext,63,8);
    [a,b]=xs(uF-.35,uF+.2);Sd.box(a,pod-.2,zA-.2,b,pod+.5,zB+.2,[.06,.06,.07],6,null,63,8);
    const set=2+r(11)*4;[a,b]=xs(uF+set,uB-1.5);const w2=[wall[0]*.9,wall[1]*.9,wall[2]*1.05];
    Sd.box(a,pod,zA+set*.5,b,Ht,zB-set*.5,w2,3,[seed+7,lit*.9,r(19)<.5?0:style,fh],63,8);
    const rb=[uF+set+3,uF+set+3+(uB-uF-set)*.4];[a,b]=xs(rb[0],rb[1]);Sd.box(a,Ht,zc-3,b,Ht+3.5,zc+3,[.05,.05,.06],0,[.6,0,0,0],63,8);
    /* an aircraft light on the mast */
    const mu=sd*(uF+set+5);Sd.box(mu-.08,Ht+3.5,zc-.08,mu+.08,Ht+11,zc+.08,[.08,.08,.09],6,null,63,8);
    Sd.box(mu-.25,Ht+11,zc-.25,mu+.25,Ht+11.5,zc+.25,[1,.1,.06],5,[4,.5,r(13),0],63,8);
  }else{
    let [a,b]=xs(uF,uB);Sd.box(a,0,zA,b,Ht,zB,wall,3,ext,63,8);
    [a,b]=xs(uF-.3,uF+.2);Sd.box(a,Ht-.1,zA-.2,b,Ht+.45,zB+.2,[.05,.05,.06],6,null,63,8);
  }
  /* signs: a band over the shops, a blade sign sticking out, and on some roofs a giant screen */
  const sc=signCol(id),art=signsOn();
  const shopH=C.lantern?4.5:5.3;
  if(art){
    /* shop signs over the shop fronts, one or two per building, cut from sheet 19 or 20 */
    const n=(zB-zA)>18?2:1;for(let k=0;k<n;k++){const si=pickSign(C.lantern?'shop_market':'shop_downtown',R_(id*13+k,7)),asp=SIGNS.signs[si].asp,w=Math.min(7.2,(zB-zA)/n-1.5),h=w/asp;
      const zz=n===1?zc:zA+(zB-zA)*(k+.5)/n;Sd.panel(sd*(uF-.1),shopH+.35+h/2,zz,w,h,sd>0?'-x':'+x',[1,1,1],7,si,10);}
  }else{const bw=(zB-zA)*.84;Sd.panel(sd*(uF-.12),3.75,zc,bw,.9,sd>0?'-x':'+x',sc,7,seed,0);}
  const bz=zc+(r(1)-.5)*(P-gap)*.6,bu0=sd*(uF-1.5),bu1=sd*uF;
  let sy=5.5+r(2)*5,sl=1.6+r(3)*2.5;
  if(art){
    /* the blade sign: the same pick as the coloured light it throws (the shader hashes the block the same way) */
    const si=pickSign(C.lantern?'blade_market':'blade_downtown',ihash(id*7+3)),asp=SIGNS.signs[si].asp,w=1.6;sl=w/asp/2;sy=Math.max(sy,shopH+2.2+sl);
    Sd.panel((bu0+bu1)/2,sy,bz-.13,w,sl*2,'-z',[1,1,1],7,si,10);Sd.panel((bu0+bu1)/2,sy,bz+.13,w,sl*2,'+z',[1,1,1],7,si,10);
  }else{Sd.panel((bu0+bu1)/2,sy,bz-.13,1.5,sl*2,'-z',sc,7,seed+1,1);Sd.panel((bu0+bu1)/2,sy,bz+.13,1.5,sl*2,'+z',sc,7,seed+1,1);}
  {const [a,b]=sd>0?[bu0,bu1]:[bu1,bu0];Sd.box(Math.min(a,b),sy-sl,bz-.12,Math.max(a,b),sy+sl,bz+.12,[.03,.03,.04],6,null,15,8);}
  if(C.signs>1.5){const sy2=sy+sl+2.8,bz2=zc-(r(1)-.5)*(P-gap)*.5;
    if(art){const si=pickSign('blade_market',R_(id,23)),w=1.4,h=w/SIGNS.signs[si].asp;Sd.panel((bu0+bu1)/2,sy2+h/2,bz2-.13,w,h,'-z',[1,1,1],7,si,10);Sd.panel((bu0+bu1)/2,sy2+h/2,bz2+.13,w,h,'+z',[1,1,1],7,si,10);}
    else{const sl2=1.1+r(14),c2=rgbN(((ihash(id*7+3)*3|0)+1)%3);Sd.panel((bu0+bu1)/2,sy2,bz2-.13,1.3,sl2*2,'-z',c2,7,seed+2,1);Sd.panel((bu0+bu1)/2,sy2,bz2+.13,1.3,sl2*2,'+z',c2,7,seed+2,1);}}
  if(!glass&&Ht>30&&r(15)<C.board){const bwd=Math.min(zB-zA-2,15+r(17)*6),bh=bwd*9/16,y0=(Ht>55?Ht+3.5:Ht)+1.2;
    Sd.panel(sd*(uF+1.2),y0+bh/2,zc,bwd,bh,sd>0?'-x':'+x',[1,1,1],8,Math.floor(r(20)*6)+.5,0);
    Sd.box(sd*(uF+1.2)+(sd>0?.05:-.35),y0-1.2,zc-.15,sd*(uF+1.2)+(sd>0?.35:-.05),y0,zc+.15,[.06,.06,.07],6,null,63,8);}
  /* the market: striped awnings over the shop fronts */
  if(C.lantern){const ac=[[.55,.1,.12],[.6,.4,.08],[.15,.35,.5],[.4,.12,.4]][(r(18)*4)|0];
    const x0=sd*(uF-2.1),x1=sd*uF;const A=[x0,3.05,zA+.4],B=[x0,3.05,zB-.4],Cc=[x1,3.7,zB-.4],Dd=[x1,3.7,zA+.4];
    if(sd>0)Sd.quad(A,B,Cc,Dd,ac,0,[.8,0,0,0]);else Sd.quad(B,A,Dd,Cc,ac,0,[.8,0,0,0]);
    Sd.box(Math.min(x0,x0+sd*.05),2.85,zA+.4,Math.max(x0,x0+sd*.05),3.05,zB-.4,[1,.7,.4],5,[1.6,0,0,0],63,8);}
  return {zA,zB,Ht,uB};
}
/* the skyline behind the front row: bigger, simpler towers so the gaps never show empty sky */
function backRow(Sd,cellZ,sd,C,stageSeed){
  const P=48,id=cellZ*2+(sd>0?1:0),r=i=>R_(id*17+stageSeed+999,i);
  const zc=(cellZ+.5)*P,w=(P-6-r(1)*8)/2,dep=20+r(2)*30,u0=70+r(3)*40,Ht=C.back[0]+r(4)*r(4)*(C.back[1]-C.back[0]);
  const a=sd>0?u0:-u0-dep,b=sd>0?u0+dep:-u0;
  const glass=r(5)<C.glass+.1;
  if(glass)Sd.box(a,0,zc-w,b,Ht,zc+w,[.02,.03,.05],4,[r(6)*100,0,0,0],63,16);
  else Sd.box(a,0,zc-w,b,Ht,zc+w,C.walls[(r(7)*C.walls.length)|0],3,[r(6)*100,C.lit[0]+r(8)*.3,0,3.4],63,16);
  if(r(9)<.5){const mu=(a+b)/2;Sd.box(mu-.3,Ht,zc-.3,mu+.3,Ht+14,zc+.3,[.06,.06,.07],6,null,63,16);Sd.box(mu-.4,Ht+14,zc-.4,mu+.4,Ht+14.6,zc+.4,[1,.1,.06],5,[4,.6,r(10),0],63,16);}
}
function lampsIn(Sd,z0,z1){
  const LP=26;for(let k=Math.ceil(z0/LP);k*LP<z1;k++){const z=k*LP;
    for(const sd of [-1,1]){
      Sd.cyl(sd*10,z,.22,7.75,.13,8,[.07,.07,.08],6,null,false,'y',.09);
      Sd.box(Math.min(sd*10,sd*8.2),7.68,z-.07,Math.max(sd*10,sd*8.2),7.82,z+.07,[.07,.07,.08],6,null,63,8);
      Sd.box(Math.min(sd*8,sd*8.9),7.5,z-.25,Math.max(sd*8,sd*8.9),7.7,z+.25,[.05,.05,.06],6,null,63,8);
      Sd.box(Math.min(sd*8.05,sd*8.85),7.46,z-.2,Math.max(sd*8.05,sd*8.85),7.5,z+.2,[1,.72,.45],5,[5,0,0,0],63,8);
    }}
}
function lanternsIn(Sd,z0,z1){
  const LZ=18;for(let k=Math.ceil((z0-LZ/2)/LZ);(k+.5)*LZ<z1;k++){const z=(k+.5)*LZ;
    const wy=x=>8.8-1.8*(1-(x*x)/(81+30));
    for(let x=-12.5;x<12.5;x+=1.25){const xb=x+1.25;Sd.box(x,wy(x)-.02,z-.02,xb,wy(x)+.02,z+.02,[.02,.02,.02],6,null,63,8);}
    for(let i=-5;i<=5;i++){const x=i*2.3;const hsh=ihash(k*41+i*7+11);
      const c=hsh<.5?[1,.22,.08]:hsh<.85?[1,.55,.14]:[1,.85,.5];
      Sd.sphere(x,wy(x)-.6,z,.34,.42,.34,10,c,12,[hsh*10,0,0,0]);
      Sd.box(x-.012,wy(x)-.2,z-.012,x+.012,wy(x),z+.012,[.02,.02,.02],6,null,63,8);}
  }
}
function streetChunk(G,Sd,z0,z1,C,tunnelOpen){
  const seed=ST.id*1000;
  const pave=roadStrip(G,z0,z1,C,3);pavements(G,z0,z1,pave);
  const P=C.P;
  for(let cell=Math.floor(z0/P);cell*P<z1;cell++){
    const zc=(cell+.5)*P;if(zc<z0||zc>=z1)continue;
    if(tunnelOpen&&!tunnelOpen(zc))continue;
    /* a cross street every 7 blocks */
    if(((cell%7)+7)%7===0){for(const sd of [-1,1]){const a=sd*14.5,b=sd*150;G.box(Math.min(a,b),.23,zc-P*.38,Math.max(a,b),.235,zc+P*.38,[1,1,1],1,null,4,12);}continue;}
    for(const sd of [-1,1])blockAt(Sd,G,cell,sd,C,seed);
  }
  for(let c=Math.floor(z0/48);c*48<z1;c++){const zc=(c+.5)*48;if(zc<z0||zc>=z1)continue;if(tunnelOpen&&!tunnelOpen(zc))continue;for(const sd of [-1,1])backRow(Sd,c,sd,C,seed);}
  if(C.lamps)lampsIn(Sd,z0,z1);
  if(C.lantern)lanternsIn(Sd,z0,z1);
}
/* ---------- the skyway: a deck in the sky over a city of lights ---------- */
function skywayChunk(G,Sd,z0,z1){
  roadStrip(G,z0,z1,null,3);
  for(const sd of [-1,1]){
    const a=sd*9,b=sd*10.6;G.box(Math.min(a,b),0,z0,Math.max(a,b),.02,z1,[.12,.12,.14],2,null,4,3);
    Sd.box(Math.min(sd*10.35,sd*10.85),0,z0,Math.max(sd*10.35,sd*10.85),1.15,z1,[.22,.22,.26],21,null,63,4);
    Sd.box(Math.min(sd*10.33,sd*10.87),1.15,z0,Math.max(sd*10.33,sd*10.87),1.28,z1,rgbN(1),5,[3.2,0,0,0],63,4);
    Sd.box(Math.min(sd*10.36,sd*10.84),.25,z0,Math.max(sd*10.36,sd*10.84),.32,z1,rgbN(0),5,[1.6,0,0,0],63,4);
  }
  Sd.box(-10.6,-2.6,z0,10.6,0,z1,[.16,.16,.19],21,null,1|2|8,8);
  /* pillars down to the ground, and the ground itself, a grid of lit streets 78 m below */
  const PZ=64;for(let k=Math.ceil((z0-PZ/2)/PZ);(k+.5)*PZ<z1;k++){const z=(k+.5)*PZ;
    Sd.box(-2.2,-78,z-2.2,2.2,-2.6,z+2.2,[.16,.17,.2],21,null,1|2|16|32,40);
    Sd.box(-6,-4.6,z-1.8,6,-2.6,z+1.8,[.16,.17,.2],21,null,63,8);
    Sd.box(-2.25,-40,z-2.25,2.25,-39.6,z+2.25,rgbN(1),5,[2,0,0,0],63,8);}
  Sd.box(-600,-78.2,z0,600,-78,z1,[1,1,1],14,null,4,CHUNK);
  /* towers rising from the ground on a 150 m grid, away from the road */
  const GZ=150;
  for(let cz=Math.floor(z0/GZ);cz*GZ<z1;cz++){const zc=(cz+.5)*GZ;if(zc<z0||zc>=z1)continue;
    for(let cx=-4;cx<=3;cx++){if(Math.abs(cx+.5)<.6)continue;
      const hr=ihash2(cx+50,cz+5000),hr2=ihash2(cx*3+1,cz*7+2),xc=(cx+.5)*GZ+(hr2-.5)*40;
      const Ht=60+hr*170,hw=16+hr*14,hd=16+hr2*10;
      const glass=hr2>.55;
      if(glass)Sd.box(xc-hw,-78,zc-hd,xc+hw,-78+Ht,zc+hd,[.02,.03,.05],4,[hr*100,0,0,0],63,16);
      else Sd.box(xc-hw,-78,zc-hd,xc+hw,-78+Ht,zc+hd,[.08,.085,.11],3,[hr*100,.3+hr2*.3,0,3.6],63,16);
      Sd.box(xc-hw,-78+Ht,zc-hd,xc+hw,-78+Ht+.8,zc+hd,rgbN((hr2*3)|0),5,[2.4,0,0,0],63,16);
      if(hr>.4){Sd.box(xc-.4,-78+Ht,zc-.4,xc+.4,-78+Ht+20,zc+.4,[.06,.06,.07],6,null,63,16);Sd.box(xc-.6,-78+Ht+20,zc-.6,xc+.6,-78+Ht+21,zc+.6,[1,.1,.06],5,[4,.55,hr2,0],63,16);}
      if(!glass&&hr2<.3){const fx=cx<0?xc+hw+.3:xc-hw-.3;Sd.panel(fx,-78+Ht*.7,zc,hd*1.6,Ht*.25,cx<0?'+x':'-x',[1,1,1],8,hr*50,0);}
    }}
  /* gantries with signs every 520 m */
  const GTZ=520;for(let k=Math.ceil((z0-GTZ/2)/GTZ);(k+.5)*GTZ<z1;k++){const z=(k+.5)*GTZ;
    if(signsOn()){const si=pickSign('gantry',ihash(k*5+1)),w=13,h=w/SIGNS.signs[si].asp;
      for(const sd of [-1,1])Sd.box(Math.min(sd*6.2,sd*6.6),0,z-.2,Math.max(sd*6.2,sd*6.6),6.2,z+.2,[.07,.07,.09],6,null,63,8);
      Sd.panel(0,6+h/2,z-.25,w,h,'-z',[1,1,1],7,si,10);Sd.box(-w/2,6,z-.22,w/2,6+h,z+.2,[.03,.03,.04],6,null,1|2|4|8,8);continue;}
    for(const sd of [-1,1])Sd.box(Math.min(sd*9.6,sd*10.2),0,z-.3,Math.max(sd*9.6,sd*10.2),9,z+.3,[.07,.07,.09],6,null,63,8);
    Sd.box(-10.2,8.3,z-.3,10.2,9,z+.3,[.07,.07,.09],6,null,63,8);
    Sd.panel(0,7.1,z-.36,11,1.9,'-z',rgbN(0),7,k*3.3,0);
    Sd.box(-10.2,7.95,z-.32,10.2,8.05,z-.28,rgbN(1),5,[3,0,0,0],63,8);}
}
/* ---------- the Underline: a tiled tube with rings of light, open to the sky every 700 m ---------- */
const tubeOpen=z=>((z/700)%1+1)%1>=.82;
function tubeProfile(){const P=[[13,0],[13,3]];for(let i=1;i<=14;i++){const a=i/14*Math.PI;P.push([13*Math.cos(a),3+13/1.08*Math.sin(a)]);}P.push([-13,0]);return P;}
const TUBE=tubeProfile();
function tunnelChunk(G,Sd,z0,z1,C){
  roadStrip(G,z0,z1,C,3);
  /* walk the chunk in 4 m steps, building tube where it's closed and city where it's open */
  const st=4;
  for(let z=z0;z<z1-1e-6;z+=st){const zb=Math.min(z1,z+st),zm=(z+zb)/2;if(tubeOpen(zm))continue;
    for(const sd of [-1,1]){const a=sd*9,b=sd*13;G.box(Math.min(a,b),0,z,Math.max(a,b),.22,zb,[.08,.085,.1],2,null,4,st);
      if(sd>0)G.box(9,0,z,9.001,.22,zb,[.16,.16,.17],2,null,2,st);else G.box(-9.001,0,z,-9,.22,zb,[.16,.16,.17],2,null,1,st);}
    for(let i=0;i<TUBE.length-1;i++){const p=TUBE[i],q=TUBE[i+1];Sd.quad([p[0],p[1],zb],[q[0],q[1],zb],[q[0],q[1],z],[p[0],p[1],z],[.1,.11,.14],11);}
    /* cable trays and a pipe along both walls */
    for(const sd of [-1,1]){Sd.box(Math.min(sd*12.95,sd*12.4),5.6,z,Math.max(sd*12.95,sd*12.4),5.75,zb,[.05,.05,.06],6,null,1|2|4|8,st);
      Sd.cyl(sd*12.5,6.6,z,zb,.18,6,[.12,.1,.08],6,null,false);}
  }
  /* rings of light every 16 m, and red lamps every 48 m */
  const RZ=16;for(let k=Math.ceil(z0/RZ);k*RZ<z1;k++){const z=k*RZ;if(tubeOpen(z))continue;
    for(let i=1;i<TUBE.length-2;i++){const p=TUBE[i],q=TUBE[i+1],s=.985;
      Sd.quad([p[0]*s,p[1]*s+.05,z-.18],[q[0]*s,q[1]*s+.05,z-.18],[q[0]*s,q[1]*s+.05,z+.18],[p[0]*s,p[1]*s+.05,z+.18],rgbN(0),5,[3.4,0,0,0]);}}
  /* signs on the tunnel walls, alternating sides, cut from sheet 22 */
  if(signsOn()){const SZ=96;for(let k=Math.ceil(z0/SZ);k*SZ<z1;k++){const z=k*SZ+30;if(tubeOpen(z)||z>=z1)continue;const sd=k%2?1:-1,si=pickSign('tunnel',ihash(k*11+4)),w=3.8,h=w/SIGNS.signs[si].asp;
    Sd.panel(sd*12.75,4.6,z,w,h,sd>0?'-x':'+x',[1,1,1],7,si,10);}}
  /* portals where the tube opens and closes */
  for(let k=Math.floor(z0/700);k*700<z1+700;k++){for(const zp of [k*700+574,k*700+700]){if(zp<z0||zp>=z1)continue;
    for(let i=0;i<TUBE.length-1;i++){const p=TUBE[i],q=TUBE[i+1];const o=1.1;
      Sd.quad([p[0],p[1],zp-.6],[q[0],q[1],zp-.6],[q[0]*o,q[1]*o,zp-.6],[p[0]*o,p[1]*o,zp-.6],[.2,.2,.23],21);
      Sd.quad([p[0]*o,p[1]*o,zp+.6],[q[0]*o,q[1]*o,zp+.6],[q[0],q[1],zp+.6],[p[0],p[1],zp+.6],[.2,.2,.23],21);
      Sd.quad([p[0]*.995,p[1]*.995,zp-.65],[q[0]*.995,q[1]*.995,zp-.65],[q[0]*.995,q[1]*.995,zp+.65],[p[0]*.995,p[1]*.995,zp+.65],rgbN(2),5,[2.6,0,0,0]);}}}
  if(signsOn())for(let k=Math.floor(z0/700);k*700<z1+700;k++){const zp=k*700+700-.8;if(zp<z0||zp>=z1)continue;const si=(SIGNCAT.tunnel||[0])[0],w=8,h=w/SIGNS.signs[si].asp;Sd.panel(0,12.2,zp-.1,w,h,'-z',[1,1,1],7,si,10);}
  /* the open stretches are city */
  let any=false;for(let z=z0;z<z1-1e-6;z+=st)if(tubeOpen(z+st/2)){pavements(G,z,Math.min(z1,z+st),C.pave);any=true;}
  if(any)streetChunk(new MB(),Sd,z0,z1,C,tubeOpen);
}
