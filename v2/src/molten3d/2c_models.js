/* ---------------------------------------------------------------------------------
   MODELS — the forge and the Rime built in 3D from the model sheets (5.1 to 5.13).
   A small kit: faceted ellipsoids (ice boulders, shells), lofts (legs, spikes, drills, blades),
   octagonal lathes. Flat facets read as cut crystal. Every Rime is a body plus moving parts
   (legs that walk in a tripod or diagonal gait, a spinning drill, a staff, tendrils), placed where
   the simulation has the creature and turned three-quarters toward you. The two giants are
   built part by part on their cell grids; where their cells melt, the model melts with them.
   --------------------------------------------------------------------------------- */
M4.rx=a=>{const o=M4.id(),c=Math.cos(a),s=Math.sin(a);o[5]=c;o[6]=s;o[9]=-s;o[10]=c;return o;};
M4.ry=a=>{const o=M4.id(),c=Math.cos(a),s=Math.sin(a);o[0]=c;o[2]=-s;o[8]=s;o[10]=c;return o;};
M4.sc=k=>{const o=M4.id();o[0]=o[5]=o[10]=k;return o;};
M4.chain=(...m)=>m.reduce((a,b)=>M4.mul(a,b));
let MSEED=7;const mrnd=()=>{MSEED=(MSEED*16807)%2147483647;return MSEED/2147483647;};
/* a faceted ellipsoid */
Mesh.prototype.ell=function(c,r,seg,rings,col,met,e,jit){
  const P=[];
  for(let i=0;i<=rings;i++){const ph=i/rings*Math.PI,row=[];
    for(let j=0;j<seg;j++){const th=(j+(i&1?.5:0))/seg*TAU,k=(i===0||i===rings)?1:1+(mrnd()-.5)*(jit||0);
      row.push([c[0]+r[0]*Math.sin(ph)*Math.cos(th)*k,c[1]+r[1]*Math.cos(ph)*k,c[2]+r[2]*Math.sin(ph)*Math.sin(th)*k]);}
    P.push(row);}
  for(let i=0;i<rings;i++)for(let j=0;j<seg;j++){const a=P[i][j],b=P[i][(j+1)%seg],c2=P[i+1][j],d=P[i+1][(j+1)%seg];
    if(i>0)this.tri(a,b,c2,col,met,e);if(i<rings-1)this.tri(b,d,c2,col,met,e);}
  return this;};
/* a loft through rings [[x,y,z],r] (r a number or [ru,rw]); n sides; caps at both ends unless a ring is a point */
Mesh.prototype.loft=function(rings,n,col,met,e,up,twist){
  const c0=rings[0][0],c1=rings[rings.length-1][0],ax=V3.norm(V3.sub(c1,c0));
  const ref=up||(Math.abs(ax[1])<.9?[0,1,0]:[1,0,0]);const u=V3.norm(V3.cross(ax,ref)),w=V3.cross(ax,u);
  const R=rings.map(([c,r],i)=>{const ru=Array.isArray(r)?r[0]:r,rw=Array.isArray(r)?r[1]:r,out=[];
    for(let j=0;j<n;j++){const t=j/n*TAU+(twist||0)*i;out.push(V3.add(c,V3.add(V3.mul(u,Math.cos(t)*ru),V3.mul(w,Math.sin(t)*rw))));}return out;});
  for(let i=0;i<R.length-1;i++)for(let j=0;j<n;j++){const a=R[i][j],b=R[i][(j+1)%n],c=R[i+1][j],d=R[i+1][(j+1)%n];
    const ra=rings[i][1],rb=rings[i+1][1],za=!(Array.isArray(ra)?ra[0]+ra[1]:ra),zb=!(Array.isArray(rb)?rb[0]+rb[1]:rb);
    if(!za)this.tri(a,b,c,col,met,e);if(!zb)this.tri(b,d,c,col,met,e);}
  const r0=rings[0][1],rN=rings[rings.length-1][1];
  if(Array.isArray(r0)?r0[0]+r0[1]:r0)for(let j=0;j<n;j++)this.tri(c0,R[0][(j+1)%n],R[0][j],col,met,e);
  if(Array.isArray(rN)?rN[0]+rN[1]:rN){const L=R[R.length-1];for(let j=0;j<n;j++)this.tri(c1,L[j],L[(j+1)%n],col,met,e);}
  return this;};
/* a crystal: a short prism with a point */
Mesh.prototype.spike=function(b,dir,len,r,col,met,e,n){const d=V3.norm(dir);
  return this.loft([[b,r],[V3.add(b,V3.mul(d,len*.55)),r*.92],[V3.add(b,V3.mul(d,len)),0]],n||5,col,met,e);};
/* a flat blade between two points, wide across `side` */
Mesh.prototype.blade=function(a,b,wid,th,col,met,e,side){const m=V3.add(V3.mul(a,.62),V3.mul(b,.38));
  return this.loft([[a,[wid*.35,th*.6]],[m,[wid*.5,th]],[b,0]],4,col,met,e,side);};
/* an oval lathe: a profile [[r,y],...] turned about y, squashed to zk in depth (normals kept true) */
Mesh.prototype.latheE=function(prof,seg,zk,col,met,e,o,flip){o=o||[0,0,0];
  for(let i=0;i<prof.length-1;i++){const [r0,y0]=prof[i],[r1,y1]=prof[i+1];const dy=y1-y0,dr=r1-r0,nl=Math.hypot(dy,dr)||1;let ny=-dr/nl,nr=dy/nl;if(flip){ny=-ny;nr=-nr;}
    for(let s=0;s<seg;s++){const a0=(s+.5)/seg*TAU,a1=(s+1.5)/seg*TAU,c0=Math.cos(a0),s0=Math.sin(a0),c1=Math.cos(a1),s1=Math.sin(a1);
      const P=(r,y,c,s)=>[o[0]+r*c,o[1]+y,o[2]+r*s*zk],Nn=(c,s)=>V3.norm([nr*c,ny,nr*s/zk]);
      const q=[[P(r0,y0,c0,s0),Nn(c0,s0)],[P(r1,y1,c0,s0),Nn(c0,s0)],[P(r1,y1,c1,s1),Nn(c1,s1)],[P(r0,y0,c1,s1),Nn(c1,s1)]];
      const ec=Array.isArray(e)?e[i]:e;const ord=flip?[0,2,1,0,3,2]:[0,1,2,0,2,3];for(const k of ord)this.vert(q[k][0],q[k][1],col,met,ec);}}
  return this;};
/* six-armed snowflake, flat in the xy plane */
Mesh.prototype.flake=function(c,r,col,met,e){for(let k=0;k<6;k++){const a=k/6*TAU,d=[Math.cos(a),Math.sin(a),0];this.blade(c,V3.add(c,V3.mul(d,r)),r*.22,r*.06,col,met,e,[0,0,1]);
  const m=V3.add(c,V3.mul(d,r*.55));for(const s of [-1,1]){const a2=a+s*.7;this.blade(m,V3.add(m,[Math.cos(a2)*r*.35,Math.sin(a2)*r*.35,0]),r*.12,r*.05,col,met,e,[0,0,1]);}}return this;};

/* ---------- colours (linear albedo; alpha = how much it glows) ---------- */
const IC_A=[.42,.72,1.],IC_D=[.2,.4,.72],IC_W=[.7,.88,1.],IC_K=[.04,.08,.16];
const RIME={};   /* per type: {parts:[{m,kind,at,side,k}], fit:{s,ox,oy}} */
function rimeBody(){const m=new Mesh();m.tl=T_RIME_L;return m;}
const T_RIME_L=14,T_PLATE_L=10,T_BRICK_L=11,T_HAMMER_L=12,T_IRON_L=6;
function legMesh(pts,r0,col){const m=rimeBody();const rings=pts.map((p,i)=>[p,i===pts.length-1?0:r0*(1-i/(pts.length)*.55)]);m.loft(rings,5,col||IC_A,0,0);return m;}
function buildRime(){
  MSEED=11;
  /* SHARDLING: a domed crystal shell, a spine of shards, six crystal legs */
  {const b=rimeBody();b.ell([0,3.7,0],[4.3,3.,3.5],9,6,IC_A,0,0,.2);b.ell([0,2.5,0],[3.5,1.2,2.8],8,4,IC_D,0,0,.1);
    [1.6,2.2,2.7,2.1,1.4].forEach((l,i)=>{const x=1.9-i*1.1,y=3.7+3.*Math.sqrt(Math.max(0,1-(x/4.3)**2))-.5;b.spike([x,y,0],[-.35,1,0],l,.55,IC_W,0,0);});
    for(const s of [-1,1]){b.spike([.6,4.6,s*2.3],[-.2,.8,s*.7],1.3,.4,IC_W,0,0);b.spike([-1.6,4.2,s*2.4],[-.4,.7,s*.7],1.1,.38,IC_W,0,0);}
    for(let k=0;k<7;k++){const a=mrnd()*TAU,b2=.2+mrnd()*.9;b.ell([Math.cos(a)*Math.cos(b2)*3.6,3.7+Math.sin(b2)*2.5,Math.sin(a)*Math.cos(b2)*2.9],[1.2,.5,1.],6,3,mrnd()<.4?IC_W:IC_A,0,0,.3);}
    b.ell([3.6,2.8,0],[1.5,1.3,1.8],7,4,IC_A,0,0,.15);for(const s of [-1,1])b.ell([4.75,3.1,s*.75],[.46,.46,.46],5,3,[.6,1,1],1,1);
    const L=legMesh([[0,0,0],[.2,-.4,1.3],[.3,-2.,1.9],[.4,-2.5,2.]],.42);
    RIME.shard={parts:[{m:b,kind:'body'}],legs:{m:L,hips:[[2.1,2.5],[.2,2.4],[-1.8,2.5]],z:2.,n:6,sw:.45,lift:.5}};}
  /* RIMEBACK: a turtle of layered ice plates hung with icicles, a snow cap, four stout legs */
  {const b=rimeBody();b.ell([-.5,6.8,0],[7.1,4.,5.5],12,7,IC_A,0,0,.12);b.ell([-.5,8.9,0],[5.6,1.9,4.4],10,4,IC_A,0,0,.15);b.ell([-.5,10.2,0],[4.,1.,3.1],9,3,IC_W,0,0,.2);
    for(let k=0;k<18;k++){const a=mrnd()*TAU,b2=mrnd()*1.1,x=-.5+Math.cos(a)*Math.cos(b2)*6.2,z=Math.sin(a)*Math.cos(b2)*4.8,y=6.8+Math.sin(b2)*3.7;b.ell([x,y,z],[1.9,.8,1.6],6,3,mrnd()<.4?IC_W:IC_A,0,0,.3);}
    for(let k=0;k<16;k++){const a=k/16*TAU,x=-.5+Math.cos(a)*6.8,z=Math.sin(a)*5.2;b.spike([x,5.4,z],[0,-1,0],1.2+mrnd()*1.4,.35,IC_W,0,0,4);}
    for(let k=0;k<7;k++){const a=k/7*TAU,x=-.5+Math.cos(a)*4.2,z=Math.sin(a)*3.3;b.spike([x,8.6,z],[Math.cos(a)*.4,1,Math.sin(a)*.4],1.4+mrnd(),.6,IC_W,0,0);}
    b.ell([6.9,4.9,0],[2.6,2.2,2.4],8,5,IC_A,0,0,.18);b.ell([8.2,4.,0],[1.4,.9,1.6],6,3,IC_D,0,0,.1);for(const s of [-1,1])b.ell([9.1,5.5,s*1.25],[.42,.36,.36],5,3,[.6,1,1],1,1);
    const L=rimeBody();L.loft([[[0,0,0],1.5],[[.2,-2.4,.6],1.35],[[.2,-4.4,.8],1.55],[[.3,-5.,.8],1.25]],6,IC_A,0,0);
    RIME.rime={parts:[{m:b,kind:'body'}],legs:{m:L,hips:[[4.,5.],[-4.6,5.]],z:3.4,n:4,sw:.3,lift:.35}};}
  /* BORER: a segmented grub behind a spinning ice drill and a ring of teeth */
  {const b=rimeBody();[[-4.4,1.6],[-2.6,2.2],[-.7,2.6],[1.2,2.8]].forEach(([x,ry],i)=>{b.ell([x,3.5,0],[1.4,ry+.5,ry+.2],9,5,i&1?IC_A:IC_D,0,0,.1);b.spike([x,3.5+ry+.2,0],[-.5,1,0],1.1+i*.25,.5,IC_W,0,0);});
    b.ell([3.,3.5,0],[1.4,3.1,2.9],10,5,IC_A,0,0,.1);for(const s of [-1,1])b.ell([3.2,5.5,s*1.3],[.5,.5,.5],5,3,[.6,1,1],1,1);
    for(let k=0;k<9;k++){const a=k/9*TAU;b.spike([3.8,3.5+Math.cos(a)*2.3,Math.sin(a)*2.3],[1,Math.cos(a)*.35,Math.sin(a)*.35],1.2,.32,IC_W,0,0,4);}
    const d=rimeBody();d.loft([[[0,0,0],2.],[[1.2,0,0],1.5],[[2.4,0,0],.95],[[3.4,0,0],.45],[[4.1,0,0],0]],7,IC_W,0,0,null,.55);
    const L=legMesh([[0,0,0],[0,-.9,.8],[.2,-1.6,.9]],.26,IC_D);
    RIME.borer={parts:[{m:b,kind:'body'},{m:d,kind:'drill',at:[3.9,3.5,0]}],legs:{m:L,hips:[[-4.,1.6],[-2.4,1.6],[-.8,1.6],[.8,1.6],[2.2,1.6]],z:2.,n:10,sw:.5,lift:.4}};}
  /* WISP: a glowing orb with dark eyes, ribbons of frost wound round it, snowflakes, trailing tendrils */
  {const b=rimeBody();b.tl=-1;b.ell([0,0,0],[2.7,2.7,2.7],12,8,[.35,.75,1.],.28,0,.05);for(const s of [-1,1])b.ell([s*.95,.45,2.35],[.42,.55,.35],6,4,IC_K,0,0);
    const r=rimeBody();for(const [tx,tz] of [[.5,.2],[-.4,.7],[.1,-.6]]){const ring=[];for(let k=0;k<=18;k++){const a=k/18*TAU;ring.push([Math.cos(a)*3.4,Math.sin(a)*3.4*Math.cos(tx)+Math.sin(a)*tz,Math.sin(a)*3.4*Math.sin(tx)]);}
      for(let k=0;k<18;k++)r.loft([[ring[k],.22],[ring[k+1],.22]],4,IC_W,.2,0);}
    const f=rimeBody();f.tl=-1;f.flake([0,0,0],1.3,IC_W,.5,0);
    const t=rimeBody();t.tl=-1;t.loft([[[0,0,0],.6],[[.5,-1.6,0],.5],[[-.3,-3.2,0],.35],[[.4,-4.6,0],.18],[[0,-5.8,0],0]],5,[.7,.92,1.],.3,0);
    RIME.wisp={parts:[{m:b,kind:'body'},{m:r,kind:'swirl'},{m:f,kind:'flakes'},{m:t,kind:'tails'}],fly:1};}
  /* FROSTCALLER: a hooded insect mage in a robe of leaf-plates, antlers, a staff crowned with a star */
  {const b=rimeBody();b.ell([0,7.6,0],[1.9,3.3,1.5],9,6,IC_A,0,0,.12);
    for(const s of [-1,1])b.blade([-.5,10.2,s*.8],[-1.2,3.4,s*1.5],2.,.28,IC_W,0,0,[0,0,1]);
    for(let k=0;k<3;k++)b.blade([1.2,9.6-k*1.6,0],[1.6,8.4-k*1.6,0],1.6,.2,IC_W,0,0,[0,0,1]);
    for(const s of [-1,1])b.spike([.2,10.2,s*1.3],[0,.6,s*1],1.,.35,IC_W,0,0);
    b.loft([[[0,10.5,0],1.45],[[.1,11.9,0],1.1],[[-.9,13.,0],0]],6,IC_A,0,0);b.ell([.6,11.2,0],[1.,1.1,.9],6,4,IC_K,0,0);
    for(const s of [-1,1]){b.ell([1.4,11.2,s*.38],[.3,.28,.28],4,3,[.6,1,1],1,1);b.loft([[[0,12.3,s*.5],.2],[[.3,13.2,s*.9],.16],[[-.3,13.9,s*1.15],.1],[[.1,14.4,s*1.25],0]],4,IC_W,0,0);}
    b.loft([[[.3,9.4,1.3],.3],[[1.3,7.9,1.6],.25],[[2.1,8.4,1.6],.22]],4,IC_A,0,0);b.loft([[[.3,9.4,-1.3],.3],[[1.,7.6,-1.6],.25],[[1.3,6.4,-1.6],0]],4,IC_A,0,0);
    const st=rimeBody();st.loft([[[0,-8.4,0],.22],[[0,4.6,0],.22]],5,IC_A,0,0);st.tl=-1;for(let k=0;k<6;k++){const a=k/6*TAU;st.spike([0,4.9,0],[Math.cos(a),Math.sin(a),0],1.6,.22,[.7,1,1],1,0,4);}st.spike([0,4.9,0],[0,0,1],1.,.25,[.7,1,1],1,0,4);st.spike([0,4.9,0],[0,0,-1],1.,.25,[.7,1,1],1,0,4);
    const L=legMesh([[0,0,0],[.7,-2.,0],[-.3,-3.6,0],[.5,-4.4,0],[1.2,-4.6,0]],.42);
    RIME.caller={parts:[{m:b,kind:'body'},{m:st,kind:'staff',at:[2.2,8.4,1.6]}],legs:{m:L,hips:[[0,5.]],z:.9,n:2,sw:.5,lift:.45,biped:1}};}
  /* SKATER: a sleek beetle with swept blades, big glowing eyes, four long legs on skates */
  {const b=rimeBody();b.ell([0,3.3,0],[3.4,1.6,2.1],9,5,IC_A,0,0,.1);
    b.blade([1.6,4.3,0],[-4.,6.,0],1.,.22,IC_W,0,0,[0,0,1]);for(const s of [-1,1])b.blade([1.2,4.1,s*.8],[-4.2,5.4,s*1.4],1.,.2,IC_A,0,0,[0,0,1]);
    b.ell([3.1,3.2,0],[1.2,1.,1.5],7,4,IC_A,0,0,.12);for(const s of [-1,1])b.ell([3.85,3.55,s*.72],[.52,.52,.52],5,3,[.6,1,1],1,1);
    const L=rimeBody();L.loft([[[0,0,0],.28],[[0,1.,1.9],.24],[[.2,-2.6,2.6],.18]],4,IC_A,0,0);L.blade([-1.,-2.75,2.6],[1.6,-2.75,2.6],.35,.2,IC_W,0,0,[0,1,0]);
    RIME.skater={parts:[{m:b,kind:'body'}],legs:{m:L,hips:[[1.4,2.8],[-1.5,2.8]],z:1.4,n:4,sw:.55,lift:.3}};}
  /* SPITTER: a round crab with a glowing gullet, teeth round its mouth, eyes on stalks */
  {const b=rimeBody();b.ell([-.4,4.4,0],[3.6,3.2,3.4],10,6,IC_A,0,0,.14);b.ell([2.3,3.6,0],[1.3,1.5,2.],7,4,IC_K,0,0);
    b.tl=-1;b.ell([2.25,3.6,0],[1.05,1.05,1.05],7,5,[.6,1,1],.9,0);b.tl=T_RIME_L;
    for(let k=0;k<8;k++){const a=k/8*TAU;b.spike([2.9,3.6+Math.cos(a)*1.5,Math.sin(a)*1.9],[.4,-Math.cos(a),-Math.sin(a)],.7,.2,IC_W,0,0,4);}
    for(const s of [-1,1]){b.loft([[[.7,6.9,s*1.2],.24],[[.9,8.,s*1.4],.2]],5,IC_A,0,0);b.ell([.95,8.25,s*1.45],[.48,.48,.48],5,3,[.6,1,1],1,1);}
    for(let k=0;k<6;k++){const a=k/6*TAU;b.spike([-.4+Math.cos(a)*2.4,6.9,Math.sin(a)*2.4],[Math.cos(a)*.5,1,Math.sin(a)*.5],1.,.42,IC_W,0,0);}
    const L=legMesh([[0,0,0],[.2,-.3,1.2],[.3,-1.9,1.7],[.4,-2.3,1.8]],.45);
    RIME.spitter={parts:[{m:b,kind:'body'}],legs:{m:L,hips:[[1.6,2.4],[-.3,2.3],[-2.1,2.4]],z:2.,n:6,sw:.4,lift:.45}};}
  /* BULWARK: a broad armoured crab whose back spikes carry its roof of ice */
  {const b=rimeBody();b.ell([0,4.7,0],[6.6,3.4,4.8],12,6,IC_A,0,0,.12);b.ell([0,6.9,0],[5.4,1.4,4.],10,4,IC_A,0,0,.15);
    b.ell([5.3,3.6,0],[2.,1.8,2.5],7,4,IC_A,0,0,.15);for(const s of [-1,1]){b.ell([6.9,4.2,s*1.],[.52,.52,.52],5,3,[.6,1,1],1,1);b.loft([[[6.,2.6,s*2.],.6],[[7.6,2.4,s*2.6],.5],[[8.3,3.4,s*2.4],0]],5,IC_W,0,0);}
    for(const [x,z] of [[3.,2.2],[3.,-2.2],[-3.2,2.4],[-3.2,-2.4],[0,0]])b.loft([[[x,7.,z],.8],[[x*.95,10.6,z*.95],.6],[[x*.9,13.4,z*.9],.45]],5,IC_W,0,0);
    const L=legMesh([[0,0,0],[.2,-.4,1.6],[.4,-2.6,2.2],[.5,-3.,2.3]],.6);
    RIME.bulwark={parts:[{m:b,kind:'body'}],legs:{m:L,hips:[[3.6,3.],[0,2.9],[-3.6,3.]],z:3.6,n:6,sw:.3,lift:.35},noFit:1};}
  /* FROST BOLT: a spinning star of ice */
  {const b=rimeBody();b.tl=-1;for(let k=0;k<6;k++){const a=k/6*TAU;b.spike([0,0,0],[Math.cos(a),Math.sin(a),0],1.8,.35,[.7,1,1],.9,0,4);}b.spike([0,0,0],[0,0,1],1.2,.3,[.7,1,1],.9,0,4);b.spike([0,0,0],[0,0,-1],1.2,.3,[.7,1,1],.9,0,4);
    RIME.bolt={parts:[{m:b,kind:'spin'}],fly:1};}
  /* fit each creature to its footprint in the simulation: as wide and as tall as its sprite */
  for(const k in RIME){const R=RIME[k];let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;const add=(m,ox,oy)=>{for(let i=0;i<m.v.length;i+=12){x0=Math.min(x0,m.v[i]+ox);x1=Math.max(x1,m.v[i]+ox);y0=Math.min(y0,m.v[i+1]+oy);y1=Math.max(y1,m.v[i+1]+oy);}};
    for(const p of R.parts)add(p.m,p.at?p.at[0]:0,p.at?p.at[1]:0);if(R.legs)for(const h of R.legs.hips)add(R.legs.m,h[0],h[1]);
    const D=ETYPES[k],s=R.noFit?1:Math.min(D.w/(x1-x0),D.h/(y1-y0))*1.22;R.fit={s,ox:-(x0+x1)/2,oy:R.fly?-(y0+y1)/2:-y0};
    for(const p of R.parts)p.g=upMesh(p.m);if(R.legs)R.legs.g=upMesh(R.legs.m);}
}
/* ---------- the two giants, built on their cell grids (x = column, y = -row) ---------- */
const GIANT={king:{},queen:{}};
function buildGiants(){
  MSEED=29;
  const W_=IC_W,A_=IC_A,D_=IC_D;
  /* chunks of ice set over a core shape: the golem's hide */
  const hide=(m,cx,cy,cz,rx,ry,rz,n,sz)=>{for(let k=0;k<n;k++){const a=mrnd()*TAU,b=(mrnd()-.5)*Math.PI*.8;
    const x=cx+Math.cos(a)*Math.cos(b)*rx,y=cy+Math.sin(b)*ry,z=cz+Math.sin(a)*Math.cos(b)*rz;
    m.ell([x,y,z],[sz*(.7+mrnd()*.6),sz*(.6+mrnd()*.5),sz*(.7+mrnd()*.5)],6,4,mrnd()<.35?W_:A_,0,0,.35);}};
  const shards=(m,cx,cy,cz,rx,ry,rz,n,len,dirY)=>{for(let k=0;k<n;k++){const a=mrnd()*TAU,b=(mrnd()-.2)*1.2;
    const d=[Math.cos(a)*Math.cos(b),Math.sin(b)*(dirY||1),Math.sin(a)*Math.cos(b)];m.spike([cx+d[0]*rx,cy+d[1]*ry,cz+d[2]*rz],[d[0]*.6,Math.abs(d[1])+.5,d[2]*.6],len*(.6+mrnd()*.8),len*.28,W_,0,0);}};
  const K=GIANT.king;
  /* torso (36 x 30 cells): a great chest over a narrower belly, shoulders like boulders, a crest of shards,
     plates of clear ice on the front and the frost heart set in the middle */
  {const m=rimeBody();m.ell([17.5,-12.5,0],[14.6,10.4,7.],14,8,D_,0,0,.12);m.ell([17.5,-23.5,0],[10.,6.5,6.],12,6,D_,0,0,.12);
    for(const s of [-1,1]){m.ell([17.5+s*14.5,-6.5,0],[6.2,5.8,6.4],9,6,A_,0,0,.2);hide(m,17.5+s*14.5,-6.5,0,5.6,5.,5.6,6,2.);
      for(let k=0;k<5;k++)m.spike([17.5+s*(11+k*1.9),-9.5-k*.2,-1+k*.6],[s*.55,1,-.2],3.4+mrnd()*2.6,1.,W_,0,0);}
    hide(m,17.5,-13.,0,14.,10.,6.8,34,3.3);hide(m,17.5,-23.,0,9.5,6.,5.8,12,2.6);
    for(let k=0;k<5;k++)m.ell([10+k*3.75,-20.5+Math.abs(k-2)*1.5,6.4],[2.2,3.4,1.2],6,4,W_,0,0,.25);
    m.tl=-1;m.loft([[[17.5,-14.,5.6],0],[[17.5,-10.6,8.3],[3.,1.4]],[[17.5,-14.,10.],0]],4,[.6,1,1],1,1);m.loft([[[17.5,-14.,5.6],0],[[17.5,-17.4,8.3],[3.,1.4]],[[17.5,-14.,10.],0]],4,[.6,1,1],1,1);
    K.torso=m;}
  /* head (18 x 15): a heavy brow, glowing eyes, a jaw, a crown of shards */
  {const m=rimeBody();m.ell([8.5,-10.,0],[7.,5.,5.2],10,6,A_,0,0,.16);m.ell([8.5,-12.8,2.2],[5.,2.5,3.4],8,4,D_,0,0,.2);
    m.blade([2.4,-8.2,4.6],[14.6,-8.2,4.6],2.,.9,W_,0,0,[0,1,0]);hide(m,8.5,-9.5,0,6.,4.,4.8,8,1.4);
    for(let c=1;c<18;c+=4){const hgt=c%8===1?6.4:4.2;m.spike([c+.5,-5.6,-.5],[(c-8.5)*.06,1,-.15],hgt,1.25,W_,0,0);}
    m.tl=-1;for(const x of [5.,12.])m.ell([x,-9.6,4.7],[1.1,.6,.6],5,3,[.6,1,1],1,1);
    K.head=m;}
  /* arms (9 x 27): growing heavier toward the fists, shards down the outside */
  for(const side of ['armL','armR']){const m=rimeBody(),sg=side==='armL'?1:-1;
    [[3.6,3.2],[3.9,3.5],[4.3,3.9],[4.6,4.2]].forEach(([rx,ry],k)=>{m.ell([4+Math.sin(k*1.2)*.6*sg,-3.-k*5.,0],[rx,ry,rx],9,5,k&1?A_:D_,0,0,.22);hide(m,4,-3-k*5,0,rx*.8,ry*.7,rx*.8,3,1.4);});
    m.ell([4,-24.4,0],[5.,3.6,4.8],10,6,A_,0,0,.2);for(let k=0;k<4;k++)m.spike([1.4+k*1.8,-27.,1.5],[0,-1,.3],1.6,.6,W_,0,0,4);
    for(let k=0;k<4;k++)m.spike([4+sg*3.6,-4-k*5,.5],[sg,.25,.2],2.4+mrnd()*1.6,.7,W_,0,0);K[side]=m;}
  /* legs (10 x 17): pillars of ice with a knee and a broad foot */
  for(const side of ['legL','legR']){const m=rimeBody();m.ell([5,-4.6,0],[4.8,4.8,4.8],9,5,A_,0,0,.2);m.ell([5,-9.6,.8],[3.2,2.4,3.6],8,4,W_,0,0,.25);
    m.ell([5,-12.2,0],[4.2,3.4,4.2],9,5,D_,0,0,.2);m.ell([5,-15.4,1.],[5.4,2.,5.6],9,4,A_,0,0,.15);hide(m,5,-6,0,4,4,4,4,1.5);K[side]=m;}
  const Q=GIANT.queen;
  /* wings (24 x 22): long feathers of ice in three layers, fanned from the shoulder to the tip */
  for(const side of ['wingL','wingR']){const m=rimeBody(),w=24,h=22,L=side==='wingL';
    for(let layer=0;layer<3;layer++)for(let k=0;k<7;k++){const t=k/6,rx=L?w-1.5:.5,ry=-(1.5+t*h*.62),tipX=L?(.5+t*4+layer*2.):(w-.5-t*4-layer*2.),tipY=-(h*(.58+t*.36))+layer*1.8;
      m.blade([rx,ry,-1.6+layer*1.1],[tipX,tipY,-.6+layer*1.1],2.3-layer*.4,.45,layer===1?A_:W_,0,0,[0,0,1]);}
    for(let k=0;k<6;k++){const u=(k+.5)/6,c=L?w-1-u*(w-2):u*(w-2)+1;m.spike([c,-(h*(1-u*.32))+1.6,.5],[0,-1,.15],1.8+mrnd()*2.4,.45,W_,0,0,4);}
    Q[side]=m;}
  /* body (30 x 34): a tall cut gem, shards rising off her shoulders, a smaller heart of frost */
  {const m=rimeBody();m.loft([[[15,-.5,0],0],[[15,-12,0],[11.8,6.2]],[[15,-22,0],[7.,5.]],[[15,-33.5,0],0]],6,A_,0,0,[1,0,0]);
    hide(m,15,-14,0,9.,9.,4.6,12,1.6);for(const s of [-1,1])for(let k=0;k<4;k++)m.spike([15+s*(7+k*1.8),-7-k*1.4,-.5],[s*.5,1,-.1],4+mrnd()*3,.9,W_,0,0);
    for(let k=0;k<6;k++)m.blade([15+(k-2.5)*2.2,-20,4.2],[15+(k-2.5)*1.2,-31,2.],1.6,.4,k&1?A_:W_,0,0,[0,0,1]);
    m.tl=-1;m.loft([[[15,-14,4.4],0],[[15,-14,6.8],[2.8,3.4]],[[15,-14,8.8],0]],4,[.7,1,1],1,1,[1,0,0]);Q.body=m;}
  /* head (16 x 15): a narrow face, glowing eyes, a tall crown */
  {const m=rimeBody();m.ell([7.5,-9.8,0],[5.4,4.8,4.4],10,6,A_,0,0,.12);m.ell([7.5,-12.6,1.6],[3.,2.2,2.8],8,4,W_,0,0,.15);
    for(let c=1;c<16;c+=3){const hgt=c%6===1?6.6:4.;m.spike([c+.5,-5.2,-.4],[(c-7.5)*.07,1,-.1],hgt,.75,W_,0,0);}
    m.tl=-1;for(const x of [5.,10.])m.ell([x,-9.6,4.],[.9,.45,.45],5,3,[.7,1,1],1,1);Q.head=m;}
  /* skirt (14 x 12): long icicles */
  {const m=rimeBody();for(let c=0;c<14;c++){const len=4+((c*7)%5)+(c>3&&c<10?4:0);m.spike([c+.5,.5,Math.sin(c*1.7)*2.2],[0,-1,.05],len+1,.85,c&1?A_:W_,0,0,4);}Q.skirt=m;}
  for(const g of [K,Q])for(const k in g)g[k]=upMesh(g[k]);
}
/* ---------- the forge: the heart's pedestal (5.3), the furnace (5.2); the crucible is in buildMeshes ---------- */
function buildForge(){
  /* the pedestal, on the floor under the core (y up from the floor, in cells): an octagonal plinth, a waist,
     a cradle that hugs the core, prongs that hold it; glowing slots in the waist */
  const P=new Mesh();P.tl=T_HAMMER_L;const dk=[.2,.17,.16],bd=[.26,.22,.2],zk=.5;
  P.latheE([[16.4,0],[16.4,1.2],[15.2,1.6],[15.2,2.6],[14.4,3.1],[12.6,5.],[10.6,7.],[9.2,8.6],[8.4,9.6],[9.6,11.2],[12.,13.2],[13.6,14.4],[13.6,15.],[11.6,15.3],[7.6,13.8],[4.,11.2],[0,10.5]],8,zk,dk,.55,0);
  P.tl=T_PLATE_L;for(const [y,r] of [[2.75,15.3],[13.9,13.75]])P.latheE([[r+.4,y-.55],[r+.4,y+.55]],8,zk,bd,.7,0);
  const octZ=(r,x)=>{for(let k=0;k<8;k++){const a0=(k+.5)/8*TAU,a1=(k+1.5)/8*TAU,x0=Math.cos(a0)*r,x1=Math.cos(a1)*r,z0=Math.sin(a0)*r,z1=Math.sin(a1)*r;
    if(z0>=0&&z1>=0&&(x-x0)*(x-x1)<=0){const t=(x-x0)/((x1-x0)||1);return (z0+(z1-z0)*t)*zk;}}return 0;};
  P.tl=-1;for(const [y,r] of [[2.75,15.75],[13.9,14.2]])for(let k=0;k<24;k++){const x=-r*.92+k/23*r*1.84;P.ell([x,y,octZ(r,x)+.15],[.38,.38,.38],5,3,[.35,.3,.26],.8,0);}
  for(const x of [-7.4,-2.5,2.5,7.4]){const z=octZ(11.4,x);P.box(x-.75,4.4,z-.5,x+.75,8.4,z+.12,[.1,.05,.03],.2,1);}
  P.tl=T_HAMMER_L;for(let k=0;k<4;k++){const a=(k+.5)/4*TAU,c=Math.cos(a),s=Math.sin(a);P.loft([[[c*11.4,14.,s*11.4*zk],[1.3,1.]],[[c*9.6,18.5,s*9.6*zk*1.1],[1.1,.9]],[[c*7.8,21.4,s*7.8*zk*1.2],[.8,.6]]],5,dk,.6,0);}
  MESH.pedestal=upMesh(P);
  /* the furnace (in the gallery roof, behind the rail; y up): rock it hangs from, a pipe, a riveted hood that
     flares down to a brass rim round its glowing mouth, the tap below, chains up to the rock */
  const F=new Mesh();const iron=[.2,.19,.2],brass=[.5,.36,.2],zk2=.62,o=[0,0,-6.5];F.tl=T_PLATE_L;
  F.latheE([[8.,-4.3],[9.5,-4.3],[9.5,-3.6],[8.8,-3.4],[2.5,1.],[1.9,1.3],[1.9,9.]],14,zk2,iron,.65,[.7,0,0,0,0,0],o);
  F.tl=-1;F.latheE([[8.,-4.25],[2.,-.4],[0,-.5]],14,zk2,[.15,.06,.03],.2,1,o,true);
  F.tl=T_PLATE_L;F.latheE([[9.8,-4.45],[9.8,-3.5]],14,zk2,brass,.85,0,o);F.latheE([[2.3,2.4],[2.3,3.3]],10,zk2,brass,.85,0,o);
  F.tl=-1;for(let k=0;k<18;k++){const a=k/18*TAU;F.ell([Math.cos(a)*9.95,-3.97,Math.sin(a)*9.95*zk2-6.5],[.3,.3,.3],4,3,[.55,.4,.22],.9,0);}
  F.tl=T_IRON_L;F.loft([[[0,-3.6,-6.5],1.45],[[0,-5.6,-6.5],1.25]],8,[.14,.12,.12],.5,[0,0,0]);F.tl=-1;F.loft([[[0,-5.55,-6.5],1.05],[[0,-5.9,-6.5],.9]],8,[.2,.1,.05],.3,1);
  for(const a of [.75,2.45,4.7]){const tx=Math.cos(a)*8.9,tz=Math.sin(a)*8.9*zk2-6.5,bx=Math.cos(a)*4.6,bz=Math.sin(a)*4.6*zk2-6.5;
    for(let k=0;k<9;k++){const t0=k/9,t1=(k+1)/9,p0=[tx+(bx-tx)*t0,-3.4+11.4*t0,tz+(bz-tz)*t0],p1=[tx+(bx-tx)*t1,-3.4+11.4*t1,tz+(bz-tz)*t1];F.loft([[p0,[.34,.15]],[p1,[.34,.15]]],4,[.3,.24,.2],.7,0,k&1?[1,0,0]:[0,0,1]);}}
  F.tl=0;F.ell([0,9.6,-6.5],[10.,2.6,5.],10,4,[.12,.1,.1],.1,0,.35);
  MESH.furnace=upMesh(F);
}
/* the crucible's rivets and painted plate, added to the ladle built in buildMeshes */
function crucibleDetail(L){
  for(const [y,r] of [[-8.3,7.82],[-5.2,8.95],[-2.5,9.85]])for(let k=0;k<18;k++){const a=(k+.5)/18*TAU;L.ell([Math.cos(a)*r,y,Math.sin(a)*r],[.32,.32,.32],4,3,[.3,.28,.28],.85,0);}
  for(const s of [-1,1])L.latheE([[1.7,0],[1.7,.5]],10,1,[.3,.3,.32],.8,0,[s*11.2,-3.3,0]);
}
/* ---------- drawing ---------- */
const MOD={on:true,t:0};
function setIce(u,o){gl.uniform1i(u.uMode,2);gl.uniform3fv(u.uIceT,o.tint||[1,1,1]);gl.uniform4f(u.uFx,o.wet||0,o.flash||0,o.rage||0,o.glow||0);gl.uniform3fv(u.uGlowC,o.gc||[.35,.95,1.25]);gl.uniform1f(u.uMask,o.mask||0);gl.uniform1f(u.uHot,o.hot||0);gl.uniform1f(u.uTS,o.ts||7);}
function drawG(g,M){const u=P_ME.u;gl.uniformMatrix4fv(u.uM,false,M);gl.bindVertexArray(g.vao);gl.drawArrays(gl.TRIANGLES,0,g.n);}
function drawRimeModels(dt){
  const u=P_ME.u;
  for(const e of EN){const R=RIME[e.t];if(!R)continue;const D=e.D,f=R.fit;
    const fly=!!R.fly,cx=(e.x0+e.x1+1)/2,cy=fly?(e.y0+e.y1+1)/2:e.y1+1;
    if(e.rx===undefined){e.rx=cx;e.ry=cy;e.ph=Math.random()*TAU;e.yaw=e.dir>0?-.55:Math.PI+.55;}
    const k=Math.min(1,dt*16),ox=e.rx;e.rx+=(cx-e.rx)*k;e.ry+=(cy-e.ry)*k;
    const mv=Math.abs(e.rx-ox)+(e.climbing?dt*3:0);e.ph+=mv/(D.w*.5)*TAU+(e.inRock?dt*9:0);
    const ty=e.dir>0?-.55:Math.PI+.55;let dy=ty-e.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));e.yaw+=dy*Math.min(1,dt*7);
    const wet=1-e.hp/D.hp,flash=e.hurt>0&&((e.anim*30|0)&1)?1:0,rage=e.rage&&((e.anim*6|0)&1)?1:0;
    const cast=e.state==='cast'?1:0;
    setIce(u,{wet,flash,rage,glow:cast*(.5+.5*Math.sin(e.anim*10)),tint:e.inRock?[.7,.7,.75]:[1,1,1]});
    const bob=fly?Math.sin(e.anim*3+e.id)*.6:Math.abs(Math.sin(e.ph))*.25*(mv>0?1:0);
    const yaw=fly&&e.t==='wisp'?Math.sin(e.anim*.9)*.3:e.yaw;
    const B=M4.chain(M4.tr(e.rx,-(e.ry)+bob,0),M4.ry(yaw),M4.sc(f.s*(1-wet*.12)),M4.tr(f.ox,f.oy,0));
    for(const p of R.parts){let M=B;
      if(p.kind==='drill')M=M4.chain(B,M4.tr(p.at[0],p.at[1],p.at[2]),M4.rx(e.anim*(e.inRock?14:5)));
      else if(p.kind==='staff')M=M4.chain(B,M4.tr(p.at[0],p.at[1]+cast*1.4,p.at[2]),M4.rz(cast?-.25+Math.sin(e.anim*6)*.08:Math.sin(e.ph)*.06));
      else if(p.kind==='swirl')M=M4.chain(B,M4.ry(e.anim*2.2),M4.rx(Math.sin(e.anim)*.3));
      else if(p.kind==='spin')M=M4.chain(B,M4.rz(e.anim*9),M4.ry(e.anim*4));
      if(p.kind==='flakes'){for(let n=0;n<3;n++){const a=e.anim*1.6+n*TAU/3;drawG(p.g,M4.chain(B,M4.tr(Math.cos(a)*4.2,Math.sin(a*1.3)*1.2+1.,Math.sin(a)*4.2),M4.rz(e.anim*2+n),M4.sc(.8)));}continue;}
      if(p.kind==='tails'){for(let n=0;n<3;n++)drawG(p.g,M4.chain(B,M4.tr((n-1)*1.3,-2.,(n-1)*.6),M4.rz(Math.sin(e.anim*2.4+n*2.1)*.35),M4.rx(Math.sin(e.anim*1.7+n)*.25)));continue;}
      drawG(p.g,M);}
    if(R.legs){const L=R.legs;let i=0;
      for(const s of L.biped?[1,-1]:[1,-1])for(let h=0;h<L.hips.length;h++){if(i>=L.n)break;const [hx,hy]=L.hips[h];
        const off=L.biped?(s>0?0:Math.PI):((h+(s>0?1:0))%2)*Math.PI,ph=e.ph+off;
        const sw=cast&&!L.biped?0:Math.sin(ph)*L.sw,lift=Math.max(0,Math.cos(ph))*L.lift*(mv>0||e.inRock?1:0);
        const M=L.biped?M4.chain(B,M4.tr(hx,hy+lift*.8,s*L.z),M4.rz(-sw*.9)):M4.chain(B,M4.tr(hx,hy,s*L.z),M4.ry(s>0?sw:Math.PI-sw),M4.rx(-lift));
        drawG(L.g,M);i++;}}
  }
}
/* the giants' cells for their models: red where a cell lives, green where it has melted */
function giantLayer(){
  RVOX.fill(0);const B=BOSS;if(!B.on)return;
  for(const p of B.parts){const [ox,oy]=partOrigin(p);
    for(let r=0;r<p.h;r++){const y=oy+r;if(y<0||y>=H)continue;for(let c=0;c<p.w;c++){const i=r*p.w+c;if(!p.kind0[i])continue;const x=ox+c;if(x<0||x>=W)continue;
      const o=(y*W+x)*4;if(p.kind[i])RVOX[o]=255;else RVOX[o+1]=255;RVOX[o+3]=255;}}}
}
function drawGiant(dt){
  const B=BOSS;if(!B.on)return;const u=P_ME.u,G=GIANT[B.kind];if(!G)return;
  const dying=B.dying>0&&((B.dying*14|0)&1);
  for(const p of B.parts){const g=G[p.id];if(!g)continue;const [ox,oy]=partOrigin(p);
    setIce(u,{mask:1,hot:p.hotT>0?Math.min(1,p.hotT):0,glow:-.6+(.5+.5*Math.sin(S.clock*5))*.35,flash:dying?.6:(B.hurt>0?.25:0),ts:12,wet:Math.max(0,1-B.cells/B.cells0)*.5,gc:[.4,.95,1.3]});
    drawG(g,M4.tr(ox+.5,-(oy+.5),0));}
}
function drawForgeModels(dt){
  const u=P_ME.u;gl.uniform1i(u.uMode,0);gl.uniform1f(u.uMask,0);gl.uniform1f(u.uTS,9);
  if(HEART.cells.length&&MESH.pedestal){const H_=HEART,Tc=(880+H_.heat*6.6+H_.beat*110+H_.pulse*160)*H_.ign+AMB_T*(1-H_.ign);
    gl.uniform1f(u.uFrost,H_.frost*.8);gl.uniform1f(u.uHot,Math.max(300,Tc-250));drawG(MESH.pedestal,M4.tr(HX+.5,-HY,0));gl.uniform1f(u.uFrost,0);}
}
