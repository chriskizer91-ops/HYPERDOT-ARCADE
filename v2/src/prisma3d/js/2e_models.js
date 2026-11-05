/* =====================================================================================
   2e. THE VEHICLES — built in code from smooth lofts (cross-sections joined into a skin),
   tubes and rings. Local space: +z forward, +x right, +y up, the ground at y = 0.
   Light materials (10) read the vehicle's own state per draw: brakes, blinkers, boost.
   ===================================================================================== */
/* a tube between two points, for limbs and struts */
function limb(M,a,b,r0,r1,seg,c,m,e){
  const T=new MB();const len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);T.cyl(0,0,0,len,r0,seg,c,m,e,true,'z',r1);
  const Z=[(b[0]-a[0])/len,(b[1]-a[1])/len,(b[2]-a[2])/len];let X=[Z[2],0,-Z[0]];let l=Math.hypot(X[0],X[1],X[2]);if(l<1e-3){X=[1,0,0];l=1;}X=X.map(v=>v/l);
  const Y=[Z[1]*X[2]-Z[2]*X[1],Z[2]*X[0]-Z[0]*X[2],Z[0]*X[1]-Z[1]*X[0]];
  T.xform((x,y,z,nx,ny,nz)=>[a[0]+X[0]*x+Y[0]*y+Z[0]*z,a[1]+X[1]*x+Y[1]*y+Z[1]*z,a[2]+X[2]*x+Y[2]*y+Z[2]*z,X[0]*nx+Y[0]*ny+Z[0]*nz,X[1]*nx+Y[1]*ny+Z[1]*nz,X[2]*nx+Y[2]*ny+Z[2]*nz]);
  for(const v of T.v)M.v.push(v);M.n+=T.n;
  M.sphere(a[0],a[1],a[2],r0,r0,r0,8,c,m,e);M.sphere(b[0],b[1],b[2],r1,r1,r1,8,c,m,e);
}
const MAT_LIGHT=(ty,ex)=>[ty,0,ex||0,0];
/* ---------- the player's hover-bike and its rider ---------- */
function buildBike(){
  const M=new MB(),PAINT=[1,1,1],DARK=[.03,.032,.045];
  /* hull: a teardrop skin, with a narrow band each side for the prism stripe */
  const ang=[-90,-55,-25,-7,7,28,60,90,120,152,173,187,205,235].map(a=>a*Math.PI/180);
  const st=[[-1.75,.11,.09,.87],[-1.5,.26,.19,.85],[-1.0,.35,.28,.81],[-.3,.4,.33,.79],[.45,.38,.35,.81],[1.05,.3,.3,.82],[1.55,.18,.19,.77],[1.95,.05,.06,.72]];
  const secs=st.map(([z,hw,hh,cy])=>({z,pts:ang.map(a=>{const s=Math.sin(a);return [hw*Math.cos(a)*(1-.12*Math.max(0,s)),cy+hh*s*(s<0?.62:1)];})}));
  M.loft(secs,PAINT,(i,j)=>j===3||j===10?17:9,null);
  /* seat, screen, fins */
  M.loft([{z:-1.0,pts:[[-.22,1.02],[.22,1.02],[.2,1.13],[-.2,1.13]]},{z:-.15,pts:[[-.26,1.08],[.26,1.08],[.24,1.18],[-.24,1.18]]}],DARK,()=>15,null);
  M.loft([{z:.72,pts:[[-.3,1.06],[.3,1.06],[.24,1.12],[-.24,1.12]]},{z:1.0,pts:[[-.26,1.08],[.26,1.08],[.18,1.3],[-.18,1.3]]},{z:1.25,pts:[[-.16,1.0],[.16,1.0],[.08,1.12],[-.08,1.12]]}],[1,1,1],()=>19,null);
  for(const sd of [-1,1])M.loft([{z:-1.6,pts:[[sd*.04,.98],[sd*.06,.98],[sd*.06,.99],[sd*.04,.99]]},{z:-1.2,pts:[[sd*.05,.95],[sd*.07,.95],[sd*.18,1.22],[sd*.16,1.22]]}],PAINT,()=>9,null);
  /* thruster pods with their rings: what you see most from behind */
  for(const sd of [-1,1]){const x=sd*.47,y=.43;
    M.loft([[-1.16,.17],[-.95,.2],[.55,.17],[.9,.07]].map(([z,r])=>({z,pts:Array.from({length:12},(_,k)=>{const a=k/12*TAU;return [x+Math.cos(a)*r,y+Math.sin(a)*r];})})),[.07,.075,.09],()=>6,null);
    M.torus(x,y,-1.18,.15,.035,16,6,[.15,.75,1],10,MAT_LIGHT(6));
    M.sphere(x,y,-1.14,.1,.1,.04,10,[.8,.95,1],10,MAT_LIGHT(6));
    M.box(x-.03,y+.08,-.5,x+.03,y+.12,.5,[.6,.9,1],10,MAT_LIGHT(6),63,2);
    limb(M,[x,y+.08,-.3],[sd*.22,.7,-.2],.05,.05,6,[.06,.06,.07],6);limb(M,[x,y+.08,.35],[sd*.2,.72,.4],.05,.05,6,[.06,.06,.07],6);}
  /* lights */
  M.box(-.07,.73,1.86,.07,.79,1.93,[1,1,1],10,MAT_LIGHT(0),63,2);
  M.box(-.2,.84,-1.74,.2,.9,-1.69,[1,.1,.1],10,MAT_LIGHT(1),63,2);
  M.box(-.18,.47,-1.0,.18,.5,1.2,[.55,.9,1],10,MAT_LIGHT(7),63,2);
  /* the rider: leaning forward, knees tucked, hands on the bars */
  const SUIT=[.035,.04,.065];
  limb(M,[0,1.04,-.5],[0,1.36,.12],.17,.15,10,SUIT,15);
  M.sphere(0,1.12,-.55,.19,.13,.16,10,SUIT,15);
  M.box(-.03,1.15,-.48,.03,1.4,.05,[1,1,1],17,null,63,1);
  M.sphere(0,1.52,.3,.2,.19,.22,14,[.92,.93,.96],0,[.12,1,0,0]);
  M.box(-.14,1.48,.45,.14,1.55,.52,[.5,.9,1],5,[3,0,0,0],63,1);
  M.sphere(0,1.5,.47,.15,.08,.06,10,[1,1,1],19);
  for(const sd of [-1,1]){
    limb(M,[sd*.2,1.35,.1],[sd*.27,1.13,.45],.065,.055,8,SUIT,15);limb(M,[sd*.27,1.13,.45],[sd*.25,1.05,.78],.055,.05,8,SUIT,15);
    M.sphere(sd*.25,1.05,.8,.055,.055,.065,8,[.02,.02,.025],15);
    limb(M,[sd*.14,1.03,-.45],[sd*.31,.92,.15],.1,.075,8,SUIT,15);limb(M,[sd*.31,.92,.15],[sd*.3,.6,-.42],.07,.055,8,SUIT,15);
    M.box(sd*.3-.06,.52,-.62,sd*.3+.06,.62,-.32,[.02,.02,.025],15,null,63,1);}
  M.box(-.3,1.02,.77,.3,1.05,.8,[.05,.05,.06],6,null,63,1);
  return M.upload();
}
/* ---------- a hover car body: one smooth loft, glass where the cabin is ---------- */
function carLoft(M,o){
  const {L,hw,yb,belt,roof,c0,c1,rearDrop,noseDrop}=o;
  const T=[0,.03,.09,.18,.3,.42,.55,.67,.78,.88,.95,1];
  const rise=t=>smooth((t-c0)/.13)*(1-smooth((t-(c1-.16))/.16));
  const R=t=>belt+(roof-belt)*rise(t);
  const W=t=>hw*(1-.22*(1-smooth(t/.16))-.3*smooth((t-.84)/.16));
  const B=t=>belt-(rearDrop||0)*(1-smooth(t/.2))-(noseDrop||.12)*smooth((t-.75)/.25);
  const secs=T.map(t=>{const w=W(t),bl=B(t),rf=Math.max(R(t),bl+.03),endK=t<.02||t>.98?.75:1,yB=yb+(bl-yb)*.08;
    const pts=[[w*.78,yb],[w*.98,yb+.12],[w,yB+(bl-yB)*.45],[w*.97,bl],[w*.76,rf-.1],[w*.56,rf],[-w*.56,rf],[-w*.76,rf-.1],[-w*.97,bl],[-w,yB+(bl-yB)*.45],[-w*.98,yb+.12],[-w*.78,yb]];
    const cy=(yb+rf)/2;return {z:-L+t*2*L,pts:pts.map(([x,y])=>[x*endK,cy+(y-cy)*endK])};});
  M.loft(secs,[1,1,1],(i,j)=>{const ra=rise(T[i]),rb=rise(T[i+1]);const slope=Math.abs(R(T[i+1])-R(T[i]))>.06;
    if((j===3||j===4||j===6||j===7)&&((ra>.6&&rb>.6)||slope))return 19;if(j===5&&slope)return 19;return 9;},null);
  return {W,B};
}
function lightsFor(M,L,hw,belt,glowCol){
  M.box(-hw*.72,belt-.16,L*.985-.04,hw*.72,belt-.08,L*.985+.02,[1,1,1],10,MAT_LIGHT(0),63,2);
  M.box(-hw*.78,belt-.14,-L*.985-.02,hw*.78,belt-.05,-L*.985+.04,[1,.1,.1],10,MAT_LIGHT(1),63,2);
  M.box(-hw*.86,belt-.14,-L*.98-.03,-hw*.7,belt-.05,-L*.98+.05,[1,.6,.1],10,MAT_LIGHT(2),63,2);
  M.box(hw*.7,belt-.14,-L*.98-.03,hw*.86,belt-.05,-L*.98+.05,[1,.6,.1],10,MAT_LIGHT(3),63,2);
  for(const sd of [-1,1])M.box(sd*hw*.8-.02,.3,-L*.7,sd*hw*.8+.02,.33,L*.7,glowCol,10,MAT_LIGHT(7),63,2);
  for(const z of [-L*.62,L*.62])for(const sd of [-1,1]){M.cyl(sd*hw*.55,z,.2,.31,.26,12,[.04,.04,.05],6,null,true,'y');M.torus(sd*hw*.55,z,.2,.26,.025,12,4,glowCol,10,MAT_LIGHT(7));}
}
function buildCar(type){
  const M=new MB();const L=CARTYPES[type][1];
  if(type===4){
    /* a hover truck: cab up front, a tall box behind */
    carLoft(M,{L:L*.24,hw:1.12,yb:.36,belt:1.35,roof:2.6,c0:.25,c1:1.05,noseDrop:.25});M.xform((x,y,z)=>[x,y,z+L*.76]);
    M.box(-1.18,.4,-L,1.18,3.3,L*.48,[1,1,1],9,null,63,2);
    M.box(-1.19,1.4,-L*.9,1.19,1.48,L*.4,[1,.75,.3],5,[1.2,0,0,0],63,2);
    lightsFor(M,L,1.12,1.0,[1,.55,.2]);
  }else{
    const P=[{hw:.96,belt:.92,roof:1.42,c0:.22,c1:.74},{hw:.98,belt:.86,roof:1.28,c0:.3,c1:.72,rearDrop:.06},{hw:.95,belt:.95,roof:1.5,c0:.12,c1:.7},{hw:.9,belt:.9,roof:1.45,c0:.2,c1:.76}][type];
    carLoft(M,Object.assign({L,yb:.32},P));
    if(type===1)M.box(-.85,1.0,-L+.05,.85,1.04,-L+.35,[1,1,1],9,null,63,2);
    lightsFor(M,L,P.hw,P.belt,[.5,.85,1]);
  }
  return M.upload();
}
/* ---------- the gold getaway van ---------- */
function buildVan(){
  const M=new MB(),L=3.15,hw=1.28,yb=.38,belt=1.45;
  /* a boxy body: tall cargo box behind, a raked windscreen and a short nose up front */
  const T=[0,.03,.1,.3,.5,.62,.72,.8,.87,.93,.97,1];
  const roofAt=t=>t<.72?2.72:t<.9?2.72-(t-.72)/.18*.95:1.77-(t-.9)/.1*.3;
  const beltAt=t=>t<.9?belt:belt-(t-.9)/.1*.35;
  const secs=T.map(t=>{const w=hw*(1-.06*(1-smooth(t/.06))-.12*smooth((t-.92)/.08)),rf=roofAt(t),bl=Math.min(beltAt(t),rf-.05),k=t<.01||t>.99?.92:1,cy=(yb+rf)/2;
    const pts=[[w*.9,yb],[w,yb+.15],[w,bl],[w*.97,rf-.14],[w*.88,rf],[-w*.88,rf],[-w*.97,rf-.14],[-w,bl],[-w,yb+.15],[-w*.9,yb]];
    return {z:-L+t*2*L,pts:pts.map(([x,y])=>[x*k,cy+(y-cy)*k])};});
  M.loft(secs,[1,1,1],(i,j)=>{const t=T[i];if((j===2||j===6)&&t>=.62&&t<.9)return 19;if((j===3||j===4||j===5)&&t>=.72&&t<.9)return 19;return 9;},null);
  for(const sd of [-1,1])M.box(Math.min(sd*hw*1.0,sd*hw*1.006),1.0,-L*.95,Math.max(sd*hw*1.0,sd*hw*1.006),1.13,L*.75,[1,.45,.05],5,[1.5,0,0,0],63,2);
  for(const sd of [-1,1]){M.cyl(sd*.55,L*.55,2.72,2.92,.11,10,[1,.6,.1],10,MAT_LIGHT(4,sd*.55),true,'y');
    M.box(sd*hw*.82-.12,1.0,-L*.99,sd*hw*.82+.12,1.7,-L*.95,[1,.1,.1],10,MAT_LIGHT(1),63,2);
    M.torus(sd*.6,.85,-L*1.0,.2,.05,14,5,[1,.5,.15],10,MAT_LIGHT(6));M.sphere(sd*.6,.85,-L*.99,.14,.14,.05,10,[1,.6,.2],10,MAT_LIGHT(6));}
  M.box(-hw*.7,1.18,L*.985-.03,hw*.7,1.28,L*.985+.02,[1,1,1],10,MAT_LIGHT(0),63,2);
  /* the back: two dark windows in the doors, the door seam, a bumper and a lit plate */
  for(const sd of [-1,1])M.box(sd>0?.08:-1.0,1.85,-L-.012,sd>0?1.0:-.08,2.4,-L+.02,[1,1,1],19,null,63,2);
  M.box(-.015,.6,-L-.015,.015,2.6,-L+.02,[.02,.02,.02],15,null,63,2);
  M.box(-hw,.42,-L-.12,hw,.68,-L+.1,[.03,.03,.035],6,null,63,2);
  M.box(-.32,.72,-L-.03,.32,.92,-L+.01,[1,.95,.85],5,[1.2,0,0,0],63,2);
  for(const sd of [-1,1])M.box(sd*hw*.82-.02,.34,-L*.75,sd*hw*.82+.02,.37,L*.75,[1,.55,.15],10,MAT_LIGHT(7),63,2);
  return M.upload();
}
/* ---------- the police drones ---------- */
function buildDrone(){
  const M=new MB(),D=[.05,.055,.07];
  M.sphere(0,0,0,.42,.18,.55,14,D,6);
  for(const sx of [-1,1])for(const sz of [-1,1]){limb(M,[sx*.25,0,sz*.25],[sx*.72,.02,sz*.62],.04,.04,6,D,6);
    const T=new MB();T.torus(0,0,0,.3,.05,16,5,[.12,.12,.15],6);T.xform((x,y,z,nx,ny,nz)=>[x+sx*.72,z+.02,y+sz*.62,nx,nz,ny]);for(const v of T.v)M.v.push(v);M.n+=T.n;}
  M.box(-.5,-.14,-.08,-.3,-.08,.08,[1,1,1],10,MAT_LIGHT(5,0),63,2);M.box(.3,-.14,-.08,.5,-.08,.08,[1,1,1],10,MAT_LIGHT(5,.5),63,2);
  M.sphere(0,-.14,.42,.11,.08,.08,10,[1,1,1],5,[6,0,0,0]);
  return M.upload();
}
/* ---------- a ramp, one metre long: the draw scales it to its real length ---------- */
function buildRamp(){
  const M=new MB();
  M.quad([-2.2,0,0],[2.2,0,0],[2.2,1.5,1],[-2.2,1.5,1],[1,1,1],13);
  M.quad([2.2,0,0],[2.2,0,1],[2.2,1.5,1],[2.2,0,0],[.06,.06,.07],6);M.quad([-2.2,0,1],[-2.2,0,0],[-2.2,0,0],[-2.2,1.5,1],[.06,.06,.07],6);
  M.quad([-2.2,0,1],[2.2,0,1],[2.2,1.5,1],[-2.2,1.5,1],[.06,.06,.07],6);
  M.box(-2.2,1.47,.985,2.2,1.56,1.0,[1,.8,.15],5,[4,0,0,0],63,1);
  for(const sd of [-1,1])M.quad([sd*2.21,.02,0],[sd*2.21,.02,0],[sd*2.21,1.52,1],[sd*2.21,1.42,1],[.4,.9,1],5,[3,0,0,0]);
  return M.upload();
}
const MODELS={};
function buildModels(){MODELS.bike=buildBike();MODELS.van=buildVan();MODELS.drone=buildDrone();MODELS.ramp=buildRamp();MODELS.car=[0,1,2,3,4].map(buildCar);}
/* saturated paint for the traffic: candy red, electric blue, pearl, emerald, black, violet, orange, lemon */
const PAINTS=[[.72,.02,.05],[.02,.14,.85],[.78,.79,.84],[.02,.5,.22],[.012,.012,.016],[.32,.03,.58],[.9,.28,.02],[.85,.68,.02]];
