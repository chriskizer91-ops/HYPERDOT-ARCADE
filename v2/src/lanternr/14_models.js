/* =====================================================================================
   23b. 3D — STUDIO MODELS. The lamplighter rebuilt piece by piece (a caped greatcoat whose
        skirts swing with his legs, a satchel, a scarf that trails, a top hat, gloves, a brass
        lantern, a lighting pole with a hook), and new shapes for the things in the dark: a
        hunched shade that reaches with clawed hands, a hooded snuffer in a torn robe holding
        its pole in both hands, and the Long Night with a crown of spines and reaching arms.
        Same joints, same sizes, same rules: only the shapes change.
   ===================================================================================== */
const AM2={};
/* a tube between two points of the town, tapering from r0 to r1 */
MB.prototype.tube=function(a,b,r0,r1,seg,c,m,caps){const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(...d)||1;d[0]/=L;d[1]/=L;d[2]/=L;
  const rf=Math.abs(d[2])<.9?[0,0,1]:[1,0,0];let u=[d[1]*rf[2]-d[2]*rf[1],d[2]*rf[0]-d[0]*rf[2],d[0]*rf[1]-d[1]*rf[0]];const ul=Math.hypot(...u);u=u.map(x=>x/ul);
  const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]],base=this.n;
  for(let i=0;i<=seg;i++){const t=i/seg*TAU,ca=Math.cos(t),sa=Math.sin(t),n=[u[0]*ca+v[0]*sa,u[1]*ca+v[1]*sa,u[2]*ca+v[2]*sa];
    this.v(a[0]+n[0]*r0,a[1]+n[1]*r0,a[2]+n[2]*r0,n[0],n[1],n[2],c,m);this.v(b[0]+n[0]*r1,b[1]+n[1]*r1,b[2]+n[2]*r1,n[0],n[1],n[2],c,m);}
  for(let i=0;i<seg;i++){const k=base+i*2;this.I.push(k,k+3,k+2,k,k+1,k+3);}
  if(caps&&r1>0)this.blob(b[0],b[1],b[2],r1,r1,r1,1,c,m,0,1);};
/* a chain of tubes through a list of points, with a radius at each */
MB.prototype.chain=function(pts,rs,seg,c,m){for(let i=0;i<pts.length-1;i++){this.tube(pts[i],pts[i+1],rs[i],rs[i+1],seg,c,m);if(i>0&&rs[i]>.05)this.blob(...pts[i],rs[i],rs[i],rs[i],1,c,m,0,1);}};
/* part of a solid of revolution, from angle a0 to a1 (0 is forward, toward +y is to the right) */
MB.prototype.latheArc=function(prof,seg,a0,a1,c,m){const base=this.n;
  for(let j=0;j<prof.length;j++){const [r,z]=prof[j],p=prof[Math.max(0,j-1)],q=prof[Math.min(prof.length-1,j+1)],dr=q[0]-p[0],dz=q[1]-p[1],l=Math.hypot(dr,dz)||1,nr=dz/l,nz=-dr/l;
    for(let i=0;i<=seg;i++){const a=a0+(a1-a0)*i/seg,ca=Math.cos(a),sa=Math.sin(a);this.v(ca*r,sa*r,z,ca*nr,sa*nr,nz,c,m);}}
  for(let j=0;j<prof.length-1;j++)for(let i=0;i<seg;i++){const a=base+j*(seg+1)+i,b=a+seg+1;this.I.push(a,b+1,a+1,a,b,b+1);}};
/* move every point made since `from` (town coordinates in and out) */
MB.prototype.warp=function(from,fn){for(let i=from;i<this.n;i++){const o=i*3,q=fn(this.P[o],this.P[o+2],this.P[o+1]);this.P[o]=q[0];this.P[o+2]=q[1];this.P[o+1]=q[2];}};
function actorMeshes2(){
  const WOOL=18,LEA=19,SKIN=20,BRASS=21,KNIT=22,M=(id,ao)=>[id,0,0,ao==null?1:ao],pl=[MT.plain,0,0,1];let mb;
  const coat=[.21,.24,.21,.06],coatD=[.15,.17,.15,.05],trou=[.15,.12,.1,.05],boot=[.09,.065,.05,.38],belt=[.25,.16,.1,.3],brass=[.64,.5,.28,.62],scarf=[.52,.11,.075,.05],
    hat=[.075,.07,.07,.3],band=[.32,.08,.06,.3],skin=[.47,.34,.27,.18],hair=[.1,.075,.06,.08],glove=[.2,.14,.1,.25],wood=[.34,.23,.15,.15];
  /* legs: trousers to the knee, then the boot */
  mb=new MB();mb.tube([0,0,.1],[0,0,-3],.64,.52,12,trou,M(WOOL));mb.blob(0,0,-3,.52,.52,.5,1,trou,M(WOOL),0,1);AM2.thigh=mb.build();
  mb=new MB();mb.tube([0,0,0],[0,0,-2.1],.52,.44,12,trou,M(WOOL));mb.tube([0,0,-1.75],[.04,0,-3.05],.55,.52,12,boot,M(LEA));
  mb.blob(.5,0,-3.08,.98,.52,.4,2,boot,M(LEA),0,1);mb.box(-.55,-.5,-3.47,1.45,.5,-3.26,[.04,.035,.03,.2],M(LEA),31);mb.box(-.55,-.46,-3.47,-.05,.46,-3.1,[.05,.04,.035,.2],M(LEA),31);AM2.shin=mb.build();
  /* the body: a caped greatcoat buttoned down the front, a belt, a satchel at the left hip and its strap across the chest */
  mb=new MB();let b0=mb.n;
  mb.lathe(0,0,[[1.44,-.75],[1.38,.3],[1.48,1.8],[1.64,3.1],[1.62,3.85],[1.28,4.42],[.82,4.8],[0,4.9]],18,coat,M(WOOL));
  mb.lathe(0,0,[[2.02,2.68],[2.18,2.7],[2.14,2.95],[1.92,3.9],[1.3,4.48]],18,coat,M(WOOL,.9));
  mb.lathe(0,0,[[.92,4.3],[1.07,5.12],[1.16,5.32],[.98,5.3]],14,coat,M(WOOL));
  mb.lathe(0,0,[[1.47,-.42],[1.5,-.3],[1.5,.12],[1.46,.22]],18,belt,M(LEA));
  mb.box(1.46,-.26,-.4,1.6,.26,.2,brass,M(BRASS),31);
  mb.box(1.4,-.1,-.7,1.52,.1,2.75,coatD,M(WOOL),31);
  for(let k=0;k<4;k++)for(const sy of [-.42,.42])mb.blob(1.56,sy,.6+k*.78,.12,.12,.12,1,brass,M(BRASS),0,1);
  mb.warp(b0,(x,y,z)=>[x*.84,y,z]);
  mb.box(-.62,-2.02,-1.85,.6,-1.5,-.25,belt,M(LEA,.85),63);mb.box(-.66,-2.08,-.75,.64,-1.46,-.18,[.22,.14,.09,.3],M(LEA),63);mb.box(-.12,-2.1,-1.1,.12,-2.06,-.7,brass,M(BRASS),31);
  {const R=z=>{const p=[[-.75,1.44],[.3,1.38],[1.8,1.48],[3.1,1.64],[3.85,1.62],[4.42,1.28]];for(let i=0;i<p.length-1;i++)if(z<=p[i+1][0]){const k=(z-p[i][0])/(p[i+1][0]-p[i][0]);return p[i][1]+(p[i+1][1]-p[i][1])*k;}return 1.28;};
    const pts=[];for(let i=0;i<=8;i++){const t=i/8,z=lerp(3.4,-.3,t),y=lerp(.95,-1.62,t),r=R(z)+.06,x=Math.sqrt(Math.max(0,r*r-y*y))*.84+.04;pts.push([x,y,z]);}
    pts.unshift([.1,1.1,4.5]);mb.chain(pts,pts.map(()=>.11),6,belt,M(LEA));}
  AM2.torso=mb.build();
  /* the coat's skirts: two halves, split at the front and the back, swung by the legs */
  for(const [k,s] of [['skirtR',1],['skirtL',-1]]){mb=new MB();b0=mb.n;const a0=s*.1,a1=s*(Math.PI-.06);
    mb.latheArc([[1.98,-3.95],[2.0,-3.8],[1.8,-2.9],[1.6,-1.8],[1.44,-.7]],12,a0,a1,coat,M(WOOL,.85));mb.latheArc([[2.03,-3.95],[2.01,-3.65]],12,a0,a1,coatD,M(WOOL,.85));
    mb.warp(b0,(x,y,z)=>[x*.88,y,z]);AM2[k]=mb.build();}
  /* the head: a face with a nose, ears and sideburns; the scarf; the top hat with its band */
  mb=new MB();
  mb.lathe(0,0,[[1.12,-1.32],[1.3,-.98],[1.27,-.58],[1.08,-.32],[.9,-.26]],14,scarf,M(KNIT));mb.blob(.86,.48,-.88,.46,.42,.4,1,scarf,M(KNIT),.08,3);
  mb.blob(.05,0,.55,.88,.82,1.02,3,skin,M(SKIN),.02,4);mb.blob(.26,0,.06,.64,.66,.5,2,skin,M(SKIN),0,5);mb.blob(.82,0,.36,.26,.18,.3,1,skin,M(SKIN),0,6);
  for(const s of [-1,1]){mb.blob(.02,s*.86,.5,.16,.1,.26,1,skin,M(SKIN),0,7);mb.box(-.05,s>0?.66:-.86,.02,.42,s>0?.86:-.66,.72,hair,M(WOOL),31);mb.blob(.8,s*.3,.64,.075,.075,.075,1,[.03,.025,.025,.8],pl,0,1);}
  mb.blob(-.32,0,.82,.76,.88,.74,2,hair,M(WOOL),.05,8);mb.box(.66,-.42,.82,.86,.42,.92,hair,M(WOOL),31);
  b0=mb.n;mb.lathe(0,0,[[0,1.18],[1.15,1.18],[1.95,1.2],[2.13,1.33],[2.08,1.41],[1.9,1.35],[1.12,1.37]],18,hat,M(WOOL));
  mb.lathe(0,0,[[1.1,1.3],[1.04,2.1],[1.06,2.9],[1.13,3.36],[1.09,3.46],[0,3.49]],18,hat,M(WOOL));mb.lathe(0,0,[[1.12,1.4],[1.12,1.88]],18,band,M(WOOL));
  mb.warp(b0,(x,y,z)=>[x*.92,y,z]);AM2.head=mb.build();
  mb=new MB();mb.box(-.06,-.36,-2.5,.06,.36,0,scarf,M(KNIT),63);mb.box(-.07,-.38,-2.62,.07,.38,-2.42,[.62,.5,.4,.05],M(KNIT),63);AM2.scarfEnd=mb.build();
  /* arms (one unit long, stretched to fit), a cuff on the forearm, gloved hands */
  mb=new MB();mb.tube([0,0,0],[1,0,0],.52,.48,12,coat,M(WOOL));AM2.sleeveU=mb.build();
  mb=new MB();mb.tube([0,0,0],[1,0,0],.48,.46,12,coat,M(WOOL));mb.tube([.8,0,0],[1.02,0,0],.58,.56,12,coatD,M(WOOL));AM2.sleeveF=mb.build();
  mb=new MB();mb.blob(0,0,0,.42,.32,.46,2,glove,M(LEA),0,2);mb.blob(.14,.3,.06,.17,.17,.2,1,glove,M(LEA),0,3);mb.blob(.26,0,-.3,.3,.3,.26,1,glove,M(LEA),0,4);AM2.hand=mb.build();
  /* the lantern: a brass base, four posts, a cap with a chimney and a vent, a handle */
  mb=new MB();mb.lathe(0,0,[[0,-.12],[.96,-.12],[1.0,.06],[.92,.2],[.9,.32]],14,brass,M(BRASS));
  for(let k=0;k<4;k++){const a=k/4*TAU+Math.PI/4;mb.tube([Math.cos(a)*.86,Math.sin(a)*.86,.28],[Math.cos(a)*.86,Math.sin(a)*.86,1.64],.075,.075,6,brass,M(BRASS));}
  mb.lathe(0,0,[[.92,1.6],[1.06,1.72],[1.0,1.84],[.62,2.2],[.36,2.45],[.3,2.5]],14,brass,M(BRASS));mb.cyl(0,0,2.48,2.86,.26,.22,10,brass,M(BRASS));
  mb.lathe(0,0,[[.4,2.8],[.44,2.87],[.2,3.06],[0,3.09]],10,brass,M(BRASS));
  mb.chain([[0,-.46,2.9],[0,-.42,3.32],[0,0,3.56],[0,.42,3.32],[0,.46,2.9]],[.06,.06,.06,.06,.06],6,COL.iron,[MT.iron,0,0,1]);AM2.lant=mb.build();
  mb=new MB();mb.cyl(0,0,.3,1.62,.8,.8,14,[.9,.8,.6,.2],pl,false);mb.blob(.86,0,.96,.08,.4,.4,1,[1,1,1,0],pl,0,1);AM2.lglass=mb.build();
  /* the lighting pole and the brass hook at its end */
  mb=new MB();mb.tube([0,0,0],[1,0,0],.5,.42,8,wood,M(MT.wood));AM2.pole=mb.build();
  mb=new MB();mb.tube([0,0,0],[.3,0,0],.17,.15,8,brass,M(BRASS));mb.tube([.3,0,0],[1,0,0],.075,.06,6,brass,M(BRASS));mb.chain([[.55,0,0],[.72,0,.36],[.95,0,.44],[1.08,0,.26]],[.055,.05,.045,.04],5,COL.iron,[MT.iron,0,0,1]);AM2.ptip=mb.build();
  /* ---------- the shade: a hunched figure of smoke with long clawed arms, trailing away at the foot ---------- */
  mb=new MB();b0=mb.n;
  mb.lathe(0,0,[[.3,0],[.8,.8],[1.4,2.2],[2.0,4],[2.4,6],[2.55,7.8],[2.5,9],[2.0,10],[1.3,10.6],[.6,10.95],[0,11.05]],16,COL.plain,pl);
  mb.warp(b0,(x,y,z)=>[x+.75*Math.pow(z/11,2)-.5*Math.pow(Math.max(0,z-6)/5,2)*Math.max(0,-x)/2.5,y*(1+.12*Math.sin(z*.6)),z]);
  mb.blob(.38,0,11.35,1.18,1.08,1.25,2,COL.plain,pl,.1,3);mb.blob(-.4,0,12.0,1.12,1.05,1.12,2,COL.plain,pl,.14,4);mb.blob(-1.15,0,12.35,.6,.55,.55,1,COL.plain,pl,.1,5);
  for(const s of [-1,1]){mb.chain([[.7,s*2.15,8.9],[2.5,s*2.6,7.7],[4.3,s*2.2,7.1]],[.78,.58,.4],8,COL.plain,pl);
    for(let k=-1;k<=1;k++)mb.chain([[4.3,s*2.2,7.1],[5.4,s*(2.2+k*.42),6.8+k*.14],[6.2,s*(2.25+k*.58),6.1+k*.12]],[.24,.13,.025],5,COL.plain,pl);}
  for(const s of [-.7,0,.7])mb.chain([[-.2,s,2.2],[-1.2,s*1.3,1.1],[-2.4,s*1.5,.3]],[.55,.3,.04],6,COL.plain,pl);
  AM2.shade=mb.build();
  /* ---------- the snuffer: a tall hooded robe, torn at the hem, both hands on the pole ---------- */
  mb=new MB();b0=mb.n;
  mb.lathe(0,0,[[2.5,0],[3.2,.6],[3.0,2],[2.6,5],[2.25,9],[2.0,13],[2.15,15.5],[2.45,16.8],[2.3,17.6],[1.6,18.1],[1.1,18.3],[0,18.4]],20,COL.plain,pl);
  mb.warp(b0,(x,y,z)=>{if(z>2.6)return [x,y,z];const a=Math.atan2(y,x),jag=Math.max(0,Math.sin(a*9)*.6+Math.sin(a*5+1)*.4)*2.1;return [x,y,z+jag*(1-z/2.6)];});
  b0=mb.n;mb.lathe(0,0,[[1.38,17.5],[1.66,18.6],[1.62,20],[1.4,21.2],[.92,22],[.32,22.5],[0,22.65]],14,COL.plain,pl);
  mb.warp(b0,(x,y,z)=>[x-.45+.55*Math.pow((z-17.5)/5.2,2),y,z]);
  mb.chain([[.3,1.95,16.7],[1.35,2.5,15.4],[1.1,1.85,14.6]],[.62,.62,.78],10,COL.plain,pl);
  mb.chain([[.3,-1.95,16.7],[1.7,-.5,15.6],[1.25,1.55,16.7]],[.62,.62,.78],10,COL.plain,pl);
  AM2.snuf=mb.build();
  /* ---------- the Long Night: a cowled mass with a crown of spines and long reaching arms (unit size) ---------- */
  mb=new MB();mb.blob(0,0,0,1,1,1,4,COL.plain,pl,.2,5);mb.blob(-.15,0,.55,.85,.9,.6,3,COL.plain,pl,.15,6);mb.blob(.72,0,.47,.3,.78,.14,2,COL.plain,pl,.1,9);
  for(const s of [-1,1])mb.blob(-.1,s*.78,.05,.55,.5,.5,2,COL.plain,pl,.15,7+s);
  for(let k=0;k<9;k++){const a=(k/8-.5)*3.4+Math.PI,h=vnoise(k*1.7,3.1,4);mb.tube([Math.cos(a)*.5-.2,Math.sin(a)*.62,.82],[Math.cos(a)*.78-.35,Math.sin(a)*1.02,1.5+.22*h],.13,.012,6,COL.plain,pl);}
  /* the arms: each curls out of the water and up, with a twist of its own */
  for(const a of [.95,-.95,1.65,-1.65,2.35,-2.35,Math.PI]){const z0=-.45+.25*Math.abs(Math.sin(a*2.3)),tw=Math.sin(a*3.7)*.5,pts=[],rs=[];
    for(let i=0;i<=7;i++){const t=i/7,r=.75+t*1.65,ang=a+tw*t*t,z=z0+t*t*1.25+Math.sin(t*3.1)*.12;pts.push([Math.cos(ang)*r,Math.sin(ang)*r*1.1,z]);rs.push(.24*(1-t)+.012);}
    mb.chain(pts,rs,7,COL.plain,pl);}
  AM2.boss=mb.build();
}
