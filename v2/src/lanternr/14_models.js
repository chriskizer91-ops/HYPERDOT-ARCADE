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
  /* the body (model sheet 6.1): a caped greatcoat open over a brown waistcoat, brass buttons down both edges,
     a white collar and tie, a half-belt at the back; the satchel at his right hip, its strap from the left shoulder */
  const vest=[.3,.2,.13,.12],shirt=[.78,.76,.7,.1],tie=[.36,.12,.09,.2];
  mb=new MB();let b0=mb.n;
  mb.lathe(0,0,[[1.44,-.75],[1.38,.3],[1.48,1.8],[1.64,3.1],[1.62,3.85],[1.28,4.42],[.82,4.8],[0,4.9]],18,coat,M(WOOL));
  mb.latheArc([[2.02,2.68],[2.18,2.7],[2.14,2.95],[1.92,3.9],[1.3,4.48]],20,.62,TAU-.62,coat,M(WOOL,.9));
  mb.lathe(0,0,[[.92,4.3],[1.07,5.12],[1.16,5.32],[.98,5.3]],14,coat,M(WOOL));
  mb.box(1.38,-.56,-.75,1.47,.56,2.9,vest,M(WOOL,.8),31);mb.box(1.45,-.2,-.35,1.53,.2,-.05,brass,M(BRASS),31);
  for(let k=0;k<4;k++)mb.blob(1.5,0,.5+k*.62,.08,.08,.08,1,brass,M(BRASS),0,1);
  mb.box(1.36,-.3,3.0,1.5,.3,4.35,shirt,M(0),31);mb.box(1.45,-.12,2.4,1.56,.12,4.25,tie,M(WOOL),31);
  for(const sy of [-1,1]){mb.box(1.36,sy>0?.5:-.72,-.75,1.5,sy>0?.72:-.5,3.2,coatD,M(WOOL),31);for(let k=0;k<4;k++)mb.blob(1.53,sy*.63,.45+k*.78,.13,.13,.13,1,brass,M(BRASS),0,1);}
  mb.box(-1.56,-.62,-.1,-1.42,.62,.32,coatD,M(WOOL),31);for(const sy of [-.38,.38])mb.blob(-1.6,sy,.11,.12,.12,.12,1,brass,M(BRASS),0,1);
  mb.warp(b0,(x,y,z)=>[x*.84,y,z]);
  mb.box(-.62,1.5,-1.85,.6,2.02,-.25,belt,M(LEA,.85),63);mb.box(-.66,1.46,-.75,.64,2.08,-.18,[.22,.14,.09,.3],M(LEA),63);mb.box(-.12,2.06,-1.1,.12,2.1,-.7,brass,M(BRASS),31);
  {const R=z=>{const p=[[-.75,1.44],[.3,1.38],[1.8,1.48],[3.1,1.64],[3.85,1.62],[4.42,1.28]];for(let i=0;i<p.length-1;i++)if(z<=p[i+1][0]){const k=(z-p[i][0])/(p[i+1][0]-p[i][0]);return p[i][1]+(p[i+1][1]-p[i][1])*k;}return 1.28;};
    const pts=[];for(let i=0;i<=8;i++){const t=i/8,z=lerp(3.4,-.3,t),y=lerp(-.95,1.62,t),r=R(z)+.06,x=Math.sqrt(Math.max(0,r*r-y*y))*.84+.06;pts.push([x,y,z]);}
    pts.unshift([.1,-1.1,4.5]);mb.chain(pts,pts.map(()=>.11),6,belt,M(LEA));mb.box(pts[3][0]-.04,pts[3][1]-.18,pts[3][2]-.15,pts[3][0]+.06,pts[3][1]+.18,pts[3][2]+.15,brass,M(BRASS),31);}
  AM2.torso=mb.build();
  /* the coat's skirts: two halves, open at the front and split at the back, swung by the legs */
  for(const [k,s] of [['skirtR',1],['skirtL',-1]]){mb=new MB();b0=mb.n;const a0=s*.42,a1=s*(Math.PI-.06);
    mb.latheArc([[1.98,-3.95],[2.0,-3.8],[1.8,-2.9],[1.6,-1.8],[1.44,-.7]],12,a0,a1,coat,M(WOOL,.85));mb.latheArc([[2.03,-3.95],[2.01,-3.65]],12,a0,a1,coatD,M(WOOL,.85));
    mb.warp(b0,(x,y,z)=>[x*.88,y,z]);AM2[k]=mb.build();}
  /* the head: a face with a nose, ears and sideburns; the scarf; the top hat with its band */
  mb=new MB();
  mb.lathe(0,0,[[1.12,-1.32],[1.3,-.98],[1.27,-.58],[1.08,-.32],[.9,-.26]],14,scarf,M(KNIT));mb.blob(.86,-.42,-.88,.46,.42,.4,1,scarf,M(KNIT),.08,3);
  mb.blob(.05,0,.55,.88,.82,1.02,3,skin,M(SKIN),.02,4);mb.blob(.26,0,.06,.64,.66,.5,2,skin,M(SKIN),0,5);mb.blob(.82,0,.36,.26,.18,.3,1,skin,M(SKIN),0,6);
  for(const s of [-1,1]){mb.blob(.02,s*.86,.5,.16,.1,.26,1,skin,M(SKIN),0,7);mb.box(-.05,s>0?.66:-.86,.02,.42,s>0?.86:-.66,.72,hair,M(WOOL),31);mb.blob(.8,s*.3,.64,.075,.075,.075,1,[.03,.025,.025,.8],pl,0,1);}
  mb.blob(-.32,0,.82,.76,.88,.74,2,hair,M(WOOL),.05,8);mb.box(.66,-.42,.82,.86,.42,.92,hair,M(WOOL),31);
  b0=mb.n;mb.lathe(0,0,[[0,1.18],[1.15,1.18],[1.95,1.2],[2.13,1.33],[2.08,1.41],[1.9,1.35],[1.12,1.37]],18,hat,M(WOOL));
  mb.lathe(0,0,[[1.1,1.3],[1.04,2.1],[1.06,2.9],[1.13,3.36],[1.09,3.46],[0,3.49]],18,hat,M(WOOL));mb.lathe(0,0,[[1.12,1.4],[1.12,1.88]],18,band,M(WOOL));
  mb.warp(b0,(x,y,z)=>[x*.92,y,z]);AM2.head=mb.build();
  mb=new MB();mb.box(-.07,-.34,-2.7,.07,.34,0,scarf,M(KNIT),63);for(let k=0;k<5;k++){const y=-.28+k*.14;mb.box(-.05,y-.04,-3.15,.05,y+.04,-2.7,scarf,M(KNIT),63);}AM2.scarfEnd=mb.build();
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
  mb=new MB();mb.tube([0,0,0],[1,0,0],.5,.42,8,wood,M(MT.wood));for(const x of [0,.5,.78])mb.tube([x,0,0],[x+.025,0,0],.62,.62,8,brass,M(BRASS));AM2.pole=mb.build();
  mb=new MB();mb.tube([0,0,0],[.25,0,0],.17,.15,8,brass,M(BRASS));
  {const pts=[[.2,0,0],[.75,0,0],[1.02,0,.12],[1.12,0,.45],[.98,0,.72],[.72,0,.74],[.6,0,.52]];mb.chain(pts,pts.map((_,i)=>i<2?.1:.085-i*.006),7,brass,M(BRASS));}AM2.ptip=mb.build();
  /* ---------- the shade (model sheet 6.2): a hooded head pushed forward, ragged shoulders, a thin body that trails away
     into a wavering tail of smoke, long thin arms held out at the sides with hooked claws hanging down ---------- */
  mb=new MB();b0=mb.n;
  mb.lathe(0,0,[[.12,0],[.35,1],[.6,2.4],[.85,4],[1.15,5.6],[1.55,7.2],[2.0,8.6],[2.15,9.4],[1.75,10.1],[1.1,10.6],[.5,10.9],[0,11]],16,COL.plain,pl);
  mb.warp(b0,(x,y,z)=>{const t=Math.max(0,(6-z)/6);return [x+.9*Math.pow(z/11,2)+Math.sin(t*5.2)*.9*t-.5*t,y*(1+.1*Math.sin(z*.7))+Math.sin(t*3.3+1)*.5*t,z];});
  b0=mb.n;mb.lathe(0,0,[[2.5,8.5],[2.35,9.1],[1.9,9.9],[1.2,10.5]],16,COL.plain,pl);
  mb.warp(b0,(x,y,z)=>{const a=Math.atan2(y,x),jag=Math.max(0,Math.sin(a*7+.5)*.6+Math.sin(a*4)*.4)*1.3;return [x+.5,y,z-(z<9?jag:0)];});
  mb.blob(.55,0,11.35,1.12,1.02,1.2,2,COL.plain,pl,.1,3);mb.blob(-.25,0,11.95,1.05,.98,1.05,2,COL.plain,pl,.14,4);mb.blob(-1.05,0,12.45,.55,.5,.5,1,COL.plain,pl,.1,5);mb.blob(-1.6,0,12.75,.3,.28,.3,1,COL.plain,pl,.1,6);
  for(const s of [-1,1]){mb.chain([[.6,s*2.0,9.5],[.3,s*3.15,7.4],[1.5,s*3.05,5.4]],[.62,.42,.3],8,COL.plain,pl);
    for(let k=-1;k<=2;k++){const sp=(k-.5)*.32;mb.chain([[1.5,s*3.05,5.4],[1.85+.1*k,s*(3.05+sp),4.25],[2.15+.1*k,s*(3.05+sp*1.3),3.3],[2.45+.08*k,s*(3.05+sp*1.4),2.9]],[.2,.12,.05,.012],5,COL.plain,pl);}}
  for(const s of [-.5,.5])mb.chain([[-.1,s*.6,3.2],[-.9,s*1.1,2.0],[-.6,s*1.5,.9],[-1.3,s*1.4,.1]],[.35,.25,.12,.02],6,COL.plain,pl);
  AM2.shade=mb.build();
  /* ---------- the snuffer (model sheet 6.3): a tall hooded robe torn into strips at the hem, a tattered mantle over the
     shoulders, the right hand on the pole, the left sleeve hanging ---------- */
  mb=new MB();b0=mb.n;
  mb.lathe(0,0,[[2.6,0],[3.2,.6],[3.0,2],[2.6,5],[2.25,9],[2.0,13],[2.15,15.5],[2.45,16.8],[2.3,17.6],[1.6,18.1],[1.1,18.3],[0,18.4]],22,COL.plain,pl);
  mb.warp(b0,(x,y,z)=>{if(z>2.6)return [x,y,z];const a=Math.atan2(y,x),jag=Math.max(0,Math.sin(a*11)*.6+Math.sin(a*5+1)*.4)*2.6;return [x,y,z+jag*(1-z/2.6)];});
  b0=mb.n;mb.lathe(0,0,[[3.0,13.6],[2.85,14.4],[2.6,16],[2.4,17.2],[1.7,18.1]],20,COL.plain,pl);
  mb.warp(b0,(x,y,z)=>{const a=Math.atan2(y,x),jag=Math.max(0,Math.sin(a*8+.7)*.7+Math.sin(a*3)*.3)*1.8;return [x,y,z<14.5?z+jag*(14.5-z)/.9:z];});
  b0=mb.n;mb.lathe(0,0,[[1.38,17.5],[1.66,18.6],[1.62,20],[1.4,21.2],[.92,22],[.32,22.5],[0,22.65]],14,COL.plain,pl);
  mb.warp(b0,(x,y,z)=>[x-.45+.55*Math.pow((z-17.5)/5.2,2)-.35*Math.max(0,z-21.5),y,z]);
  mb.chain([[.3,1.95,16.7],[1.0,2.55,15.4],[1.04,1.8,14.8]],[.64,.68,.85],10,COL.plain,pl);
  mb.chain([[.2,-1.95,16.7],[.35,-2.4,13.3],[.5,-2.3,10.4]],[.64,.75,1.0],10,COL.plain,pl);
  AM2.snuf=mb.build();
  /* its pole, iron with rings, long enough to stand on the ground */
  mb=new MB();mb.tube([0,0,0],[1,0,0],.5,.5,8,COL.iron,[MT.iron,0,0,1]);for(const x of [.02,.4,.72,.97])mb.tube([x-.012,0,0],[x+.012,0,0],.8,.8,8,COL.iron,[MT.iron,0,0,1]);AM2.spole=mb.build();
  /* ---------- the Long Night (model sheet 6.4, unit size): a great mound rising out of the sea, a hood over a dark face,
     a crown of spines with one tall in the middle, and arms of darkness curling out all round ---------- */
  mb=new MB();b0=mb.n;mb.lathe(0,0,[[1.55,-1.05],[1.5,-.7],[1.3,-.25],[1.08,.15],[.9,.45],[.68,.72],[.42,.92],[0,1.0]],24,COL.plain,pl);
  mb.warp(b0,(x,y,z)=>{const a=Math.atan2(y,x),n=1+.07*Math.sin(a*9+z*4)+.05*Math.sin(a*17-z*7);return [x*n,y*n,z];});
  mb.blob(.05,0,.62,.78,.82,.5,3,COL.plain,pl,.15,6);mb.blob(.72,0,.47,.28,.7,.13,2,COL.plain,pl,.1,9);
  for(const s of [-1,1])mb.blob(-.05,s*.85,.02,.62,.55,.55,2,COL.plain,pl,.15,7+s);
  mb.tube([.0,0,.92],[-.1,0,1.62],.12,.01,6,COL.plain,pl);
  for(let k=0;k<10;k++){const a=(k/9-.5)*3.6+Math.PI,h=vnoise(k*1.7,3.1,4),f=.6+.4*Math.abs(Math.cos((k/9-.5)*Math.PI));mb.tube([Math.cos(a)*.48-.15,Math.sin(a)*.6,.84],[Math.cos(a)*.74-.3,Math.sin(a)*.98,1.22+.3*h*f],.1,.01,6,COL.plain,pl);}
  /* the arms: each curls up out of the water and out, and its tip curls back */
  for(let j=0;j<11;j++){const a=j/11*TAU+.3;if(Math.cos(a)>.7)continue;const z0=-.7+.55*(j%3)/2,tw=(j%2?1:-1)*.6,cd=j%2?1:-1,pts=[],rs=[];
    for(let i=0;i<=14;i++){const t=i/14,cu=Math.max(0,(t-.6)/.4),r=1.15+t*1.5-cu*cu*.35,ang=a+tw*t*t+Math.sin(t*4+j)*.1+cd*cu*cu*1.6,z=z0+t*1.25+Math.sin(t*3.1+j)*.12-cu*cu*cu*.45;
      pts.push([Math.cos(ang)*r,Math.sin(ang)*r*1.08,z]);rs.push(.2*(1-t)+.012);}
    mb.chain(pts,rs,6,COL.plain,pl);}
  AM2.boss=mb.build();
}
