/* ================= THE BACK ROOM =================
   The rooms behind the main floor, built with V2's look: glossy black wainscot under a chrome rail,
   ribbed walls under a cove of LED light, an open ceiling with trusses and blacklight tubes.

   You come in by the door from the main floor (front wall), into the MAIN ROOM: the gallery by the door,
   and the 3D rebuilds of the arcade's games round the floor, under the BACK ROOM sign on the far wall.
   Off the main room:
     the X ROOM, a closet of panels about what this place is, through a door in its own wall (right side);
     a nook behind the X Room, where the Howler kneels;
     the EMPTY ROOM, through a doorway in the left wall;
     the WORKSHOP, through a doorway in the far wall: the unfinished games.

   ROOM (set in build.py) is the box round all of it, which the engine uses for the floor, the ceiling and its limits.
   B is the building itself: the main room and the Workshop behind it. */
const B={x0:-9,x1:9,z0:-26,z1:8};
const ZB=-14,WD={x0:1.7,x1:3.5};                  // the wall between the main room and the Workshop, and the doorway in it
const CL={x:4.2,z:-1.6,zn:-8,dz0:-4.9,dz1:-3.5,t:.16};   // the X Room: its west wall at x, its south wall at z, its north wall at zn, the door's gap in the west wall
const ER={x0:-19,z0:-12,z1:-2,d0:-7.7,d1:-5.9};   // the empty room, off the left wall: its far wall at x0, its side walls at z0 and z1, the doorway from d0 to d1
const WT=.16,HD=2.45;                             // how thick a wall is, how high a doorway
const WALLS=[];                                   // interior walls the camera mustn't look through: [x0,x1,z0,z1]
function wallBlock(x0,x1,z0,z1){WALLS.push([Math.min(x0,x1),Math.max(x0,x1),Math.min(z0,z1),Math.max(z0,z1)]);block(x0,x1,z0,z1);}
/* the walking camera stays on the player's side of an interior wall: it slides in along the line to the player */
function camPull(tg,eye){
  if(!WALLS.length)return eye;
  const dx=eye[0]-tg[0],dz=eye[2]-tg[2],L=Math.hypot(dx,dz);if(L<.05)return eye;
  const N=Math.ceil(L/.05),m=.22;let k=1;
  for(let i=1;i<=N;i++){const t=i/N,x=tg[0]+dx*t,z=tg[2]+dz*t;
    if(WALLS.some(w=>x>w[0]-m&&x<w[1]+m&&z>w[2]-m&&z<w[3]+m)){k=(i-1)/N;break;}}
  if(k>=1)return eye;
  k=Math.max(.1,k);const ky=Math.max(.45,k);
  return [tg[0]+dx*k,tg[1]+(eye[1]-tg[1])*ky,tg[2]+dz*k];
}
function buildRoom(){
  const {x0,x1,z0,z1,h}=ROOM,W=WORLD;
  FLOOR.quad([x0,0,z1],[x1,0,z1],[x1,0,z0],[x0,0,z0],[1,1,1]);
  const wall=hex('#1e1731'),rib=hex('#2a2044'),wain=hex('#0a0810'),ceil=hex('#08070c'),soff=hex('#120e1c'),chrome=hex('#c0c6d2'),
    steel=hex('#3a3846'),blk=hex('#060509'),trimP=hex('#ff2f9a'),trimC=hex('#2fe6ff'),uvC=hex('#7a3cff');
  W.fin(0,0);
  W.quad([x0,h,z0],[x1,h,z0],[x1,h,z1],[x0,h,z1],ceil);
  const at=(R,s,off,y)=>[R.o[0]+R.d[0]*s+R.n[0]*off,y,R.o[1]+R.d[1]*s+R.n[1]*off];
  const boxAlong=(R,s,len,off,y,hgt,dep,col,e=0)=>{const c=at(R,s+len/2,off+dep/2,y);W.box(c[0],c[1],c[2],Math.abs(R.d[0])*len+Math.abs(R.n[0])*dep,hgt,Math.abs(R.d[1])*len+Math.abs(R.n[1])*dep,col,e);};
  /* the glow of each cove on the ceiling, gathered by colour */
  const GLOW={v:new MB(),c:new MB(),p:new MB()},yc=h-.004,gw=1.2;
  /* one face of a wall, dressed like V2's: wainscot, rail, LED lines, ribs, the cove.
     R.o is where the face starts, R.d the way it runs, R.n the side the room is on, R.L its length; R.skip are stretches left bare */
  const dress=R=>{
    const gaps=R.skip||[],free=(a,b)=>!gaps.some(([g0,g1])=>b>g0&&a<g1);
    const segs=[];let s0=0;for(const [g0,g1] of gaps){if(g0>s0)segs.push([s0,g0]);s0=g1;}segs.push([s0,R.L]);
    for(const [a,b] of segs){if(b-a<.05)continue;
      W.fin(.75,0);boxAlong(R,a,b-a,0,.56,1.12,.05,wain);
      W.fin(.9,1);W.tube(at(R,a,.075,1.135),at(R,b,.075,1.135),.018,chrome,0,6);
      W.fin(0,0);W.tube(at(R,a,.055,1.085),at(R,b,.055,1.085),.006,R.cove==='p'?trimP:trimC,2.6);
      W.tube(at(R,a,.04,.05),at(R,b,.04,.05),.007,R.cove==='c'?trimP:trimC,2.2);
      W.fin(.35,0);
      for(let s=a+.3;s<b-.1;s+=.6)if(free(s-.06,s+.06))boxAlong(R,s-.05,.1,0,(1.2+h-.5)/2,h-.5-1.2,.045,rib);
      if(R.cove!=='none'){W.fin(.2,0);boxAlong(R,a,b-a,0,h-.42,.16,.42,soff);
        W.fin(0,0);boxAlong(R,a,b-a,.36,h-.335,.012,.03,R.cove==='v'?hex('#a24bff'):R.cove==='p'?trimP:trimC,3.2);}
    }
    if(GLOW[R.cove])GLOW[R.cove].quad(at(R,0,0,yc),at(R,R.L,0,yc),at(R,R.L,gw,yc),at(R,0,gw,yc),[1,1,1],0,[[0,1],[1,1],[1,0],[0,0]]);
  };
  /* a wall, WT thick, standing behind its face. R.doors are openings you walk through, [from,to] along the face;
     R.back dresses the far face too, for the room behind it; R.solid:false leaves out the blocker (a wall on ROOM's edge needs none) */
  const backOf=(R,cove)=>{const e=at(R,R.L,-WT,0);return {o:[e[0],e[2]],d:[-R.d[0],-R.d[1]],n:[-R.n[0],-R.n[1]],L:R.L,cove,skip:(R.doors||[]).map(([g0,g1])=>[R.L-g1,R.L-g0]).reverse()};};
  const wallRun=R=>{
    const doors=R.doors||[],segs=[];let s0=0;
    for(const [g0,g1] of doors){if(g0>s0)segs.push([s0,g0]);s0=g1;}if(R.L>s0)segs.push([s0,R.L]);
    W.fin(.2,0);
    for(const [a,b] of segs){boxAlong(R,a,b-a,-WT,h/2,h,WT,wall);
      if(R.solid!==false){const p=at(R,a,0,0),q=at(R,b,-WT,0);wallBlock(p[0],q[0],p[2],q[2]);}}
    for(const [g0,g1] of doors)boxAlong(R,g0,g1-g0,-WT,(HD+h)/2,h-HD,WT,wall);
    dress(Object.assign({},R,{skip:(R.skip||[]).concat(doors).sort((a,b)=>a[0]-b[0])}));
    if(R.back)dress(backOf(R,R.back));
    return R;
  };
  /* a doorway's frame on one face of its wall: chrome round the opening, a line of LED outside that */
  const frame=(R,g0,g1,col,back)=>{
    const sg=back?-1:1,f=(back?-WT:0)+sg*.02,f2=f+sg*.03;W.fin(.9,1);
    for(const [a,b] of [[at(R,g0,f,0),at(R,g0,f,HD)],[at(R,g1,f,0),at(R,g1,f,HD)],[at(R,g0,f,HD),at(R,g1,f,HD)]])W.tube(a,b,.03,chrome,0,6);
    W.fin(0,0);
    for(const [a,b] of [[at(R,g0-.06,f2,0),at(R,g0-.06,f2,HD+.06)],[at(R,g1+.06,f2,0),at(R,g1+.06,f2,HD+.06)],[at(R,g0-.06,f2,HD+.06),at(R,g1+.06,f2,HD+.06)]])W.tube(a,b,.01,col,3);
  };
  const GOLD=hex('#ffd23f'),bw=B.x1-B.x0,bd=B.z1-B.z0;

  /* ---- the building's outer walls. The front wall leaves room for the door to the main floor;
          the left wall has the doorway to the empty room ---- */
  wallRun({o:[B.x0,B.z0],d:[1,0],n:[0,1],L:bw,cove:'v',solid:false});
  wallRun({o:[B.x1,B.z1],d:[-1,0],n:[0,-1],L:bw,cove:'p',skip:[[bw/2-1.75,bw/2+1.75]],solid:false});
  wallRun({o:[B.x1,B.z0],d:[0,1],n:[-1,0],L:bd,cove:'c'});
  {const R=wallRun({o:[B.x0,B.z1],d:[0,-1],n:[1,0],L:bd,cove:'c',doors:[[B.z1-ER.d1,B.z1-ER.d0]]}),[g0,g1]=R.doors[0];
    frame(R,g0,g1,trimP);frame(R,g0,g1,trimC,true);
    lightAt(B.x0+1,2.3,(ER.d0+ER.d1)/2,3.5,[1,.35,.75],.5);}

  /* ---- the wall between the main room and the Workshop, and the doorway through it ---- */
  {const R=wallRun({o:[B.x0,ZB],d:[1,0],n:[0,1],L:bw,cove:'v',back:'p',doors:[[WD.x0-B.x0,WD.x1-B.x0]]}),[g0,g1]=R.doors[0],mx=(WD.x0+WD.x1)/2;
    frame(R,g0,g1,GOLD);frame(R,g0,g1,trimC,true);
    neon2(W,'WORKSHOP',[mx,2.62,ZB+.05],[1,0,0],.034,GOLD,4.2);
    neon2(W,'BACK ROOM',[mx,2.62,ZB-WT-.05],[-1,0,0],.03,trimC,4.2);
    lightAt(mx,2.3,ZB+1,3.5,[1,.8,.4],.6);lightAt(mx,2.3,ZB-WT-1,3.5,[.4,.8,1],.5);}

  /* ---- the X Room's walls: one with the door in it, and one across to the right wall on either side ---- */
  {const {x:cx,z:cz,zn,dz0,dz1,t}=CL,ht=t/2;
    const R=wallRun({o:[cx-ht,zn],d:[0,1],n:[-1,0],L:cz+ht-zn,cove:'c',back:'c',doors:[[dz0-zn,dz1-zn]]}),[g0,g1]=R.doors[0];
    wallRun({o:[B.x1,cz+ht],d:[-1,0],n:[0,1],L:B.x1-cx+ht,cove:'c',back:'c'});     // the side towards the door from the main floor
    wallRun({o:[cx-ht,zn-ht],d:[1,0],n:[0,-1],L:B.x1-cx+ht,cove:'c',back:'c'});    // the side towards the Howler's nook
    frame(R,g0,g1,trimC);frame(R,g0,g1,trimC,true);
    neon2(W,'X ROOM',[cx-ht-.05,2.62,(dz0+dz1)/2],[0,0,1],.045,trimC,4.2);
    lightAt(cx-1,2.4,(dz0+dz1)/2,3.5,[.35,.85,1],.6);
    /* inside: one bare bulb on a cord, a stack of boxes in the corner */
    const bx=(cx+B.x1)/2+.2,bz=(zn+cz)/2;
    W.fin(0,0);W.tube([bx,h,bz],[bx,h-.85,bz],.006,hex('#222'));W.fin(.6,1);W.cyl(bx,h-.92,bz,.035,.08,10,hex('#3a3428'));W.fin(0,0);W.sphere(bx,h-.98,bz,.06,hex('#ffe2a8'),4,1);
    {const L=lightAt(bx,h-1.1,bz,6.5,[1,.82,.6],1.05);L.hz=.35;}
    const box3=(x,y,z,w,hh,d,c)=>{W.fin(.1,0);W.box(x,y+hh/2,z,w,hh,d,hex(c));W.box(x,y+hh-.005,z,w*.12,.012,d+.004,hex('#c8b48a'));};
    box3(cx+.55,0,cz-.4,.6,.42,.5,'#8a6a42');box3(cx+.58,.42,cz-.43,.5,.36,.44,'#7a5c38');box3(cx+1.2,0,cz-.32,.48,.34,.4,'#94744c');
    block(cx+.1,cx+1.5,cz-.7,cz);
  }

  /* ---- the empty room: three walls of its own, and the other face of the left wall ---- */
  {const ex1=B.x0-WT,ew=ex1-ER.x0;
    wallRun({o:[ER.x0,ER.z0],d:[1,0],n:[0,1],L:ew,cove:'v'});
    wallRun({o:[ex1,ER.z1],d:[-1,0],n:[0,-1],L:ew,cove:'p'});
    wallRun({o:[ER.x0,ER.z1],d:[0,-1],n:[1,0],L:ER.z1-ER.z0,cove:'c',solid:false});
    dress({o:[ex1,ER.z0],d:[0,1],n:[-1,0],L:ER.z1-ER.z0,cove:'c',skip:[[ER.d0-ER.z0,ER.d1-ER.z0]]});}

  {const glowTex=(col)=>{const c=mkCanvas(4,128),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,128);
      gr.addColorStop(0,col);gr.addColorStop(.35,col.replace(/[\d.]+\)$/,'.35)'));gr.addColorStop(1,'rgba(0,0,0,1)');g.fillStyle='#000';g.fillRect(0,0,4,128);g.fillStyle=gr;g.fillRect(0,0,4,128);return texFrom(c,false);};
    for(const [k,col] of [['v','rgba(150,70,255,1)'],['c','rgba(40,200,255,1)'],['p','rgba(255,50,160,1)']])TEXMESH.push({mesh:mesh(GLOW[k]),tex:glowTex(col),mode:3,emi:.55,add:true});}

  /* ---- what hangs from the ceiling: trusses, house lights, rows of blacklight tubes, spotlights ---- */
  const truss=(ax,az,bx,bz,y,wd)=>{
    const L=Math.hypot(bx-ax,bz-az),ux=(bx-ax)/L,uz=(bz-az)/L,px=-uz,pz=ux,hw=wd/2;
    const P=(s,a,b)=>[ax+ux*s+px*a*hw,y+b*hw,az+uz*s+pz*a*hw];
    W.fin(.55,1);
    for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]])W.tube(P(0,a,b),P(L,a,b),.02,steel,0,6);
    const n=Math.round(L/wd);
    for(let i=0;i<n;i++){const s=i*L/n,s2=(i+1)*L/n,f=i%2;
      for(const a of [-1,1])W.tube(P(f?s:s2,a,-1),P(f?s2:s,a,1),.009,steel);
      W.tube(P(f?s:s2,-1,-1),P(f?s2:s,1,-1),.009,steel);}
    for(const s of [0,L])for(const a of [-1,1])W.tube(P(s,a,1),[ax+ux*s+px*a*hw,h,az+uz*s+pz*a*hw],.006,hex('#555'));
  };
  const TY=h-.6;
  const house=(gx,gz,k=.75,r=7.5,c='#fff4ea')=>{W.fin(.2,0);W.box(gx,h-.03,gz,1.4,.04,.5,hex(c),1.2);W.box(gx,h-.06,gz,1.52,.03,.62,blk);
    const L=lightAt(gx,h-.45,gz,r,[1,.88,.8],k);L.hz=.12;};
  const uvRow=(tz,ta,tb,step=2.25)=>{
    for(let tx=ta+.7;tx<tb-.5;tx+=step){W.fin(.3,1);W.box(tx,h-.1,tz,1.25,.05,.09,steel);W.fin(0,0);W.tube([tx-.58,h-.14,tz],[tx+.58,h-.14,tz],.016,uvC,3.4);}
    UVT.push([ta+.2,tz,tb-.2,tz,.95,2.4]);};
  /* ---- spotlights: a fixture, a beam through the haze, a lit target ---- */
  const spot=(from,to,col,deg,k,o={})=>{
    const d=[to[0]-from[0],to[1]-from[1],to[2]-from[2]],dl=Math.hypot(...d),th=Math.acos(clamp(-d[1]/dl,-1,1)),yaw=Math.atan2(d[0],d[2]);
    W.push();W.tr(...from);W.ry(yaw);W.rx(-th);
    W.fin(.6,1);W.cyl(0,-.28,0,.085,.3,12,hex('#1c1b24'));W.fin(.2,0);W.cyl(0,-.292,0,.07,.012,12,col.map(c=>c),6);
    W.fin(.55,1);W.tube([-.11,.02,0],[-.11,-.16,0],.012,steel);W.tube([.11,.02,0],[.11,-.16,0],.012,steel);W.tube([-.11,.02,0],[.11,.02,0],.012,steel);
    W.pop();
    beamAt(from.slice(),d,deg,dl*1.12,col,k);
    if(o.light!==false){const lp=[to[0]-d[0]/dl*.8,to[1]-d[1]/dl*.8,to[2]-d[2]/dl*.8];const L=lightAt(lp[0],lp[1],lp[2],o.range||3.4,col,o.lk??.7);L.hz=.05;}
    if(o.pool)POOLS.push([to[0],to[2],dl*Math.tan(deg*Math.PI/180)*1.05,o.pool]);
  };
  const SW=[1,.86,.7],PK=[1,.3,.75],CY=[.35,.85,1],AM=[1,.62,.25],VI=[.65,.4,1];

  /* ---- THE MAIN ROOM ---- */
  truss(-8.4,-10.6,8.4,-10.6,TY,.32);truss(-8.4,-4.3,3.6,-4.3,TY,.32);truss(-8.4,2.6,8.4,2.6,TY,.32);
  for(const [gx,gz] of [[-6,-1],[-.5,-1],[-3.2,5.4],[5.6,5.4],[-5.8,-7.8],[.6,-7.8]])house(gx,gz);
  uvRow(-12.4,-8.2,8.2);uvRow(-6,-8.2,3.4);uvRow(.8,-8.2,8.2);uvRow(6.4,-8.2,8.2);
  UVT.push([B.x0+.4,-13,B.x0+.4,6,.5,1.4],[B.x1-.4,-1,B.x1-.4,6,.5,1.4]);
  spot([-4.2,TY-.2,-10.6],[-1.2,3.0,ZB+.1],PK,6,1.0,{light:false});
  spot([-.6,TY-.2,-10.6],[-3.6,3.0,ZB+.1],CY,6,1.0,{light:false});
  spot([-.4,TY-.2,-10.6],[-2.4,1.2,ZB+.7],AM,12,.85,{range:4,pool:.4});
  spot([2.2,TY-.2,-10.6],[(WD.x0+WD.x1)/2,1.6,ZB+.1],VI,12,.7,{range:3.5,pool:.35});
  spot([0,TY-.2,2.6],[0,1.4,7.8],SW,13,.7,{pool:.4,range:4});
  /* the Howler's nook, behind the X Room */
  spot([6.0,TY-.2,-10.6],[7.9,1.5,-11.0],[1,.78,.5],17,1.0,{range:4.8,pool:.5});lightAt(8.5,2.7,-13.0,3.4,[.4,.62,1],.7);lightAt(8.5,2.7,-9.0,3.4,[.4,.62,1],.6);

  /* ---- the far wall's sign: BACK ROOM over 3D REBUILDS ---- */
  {const sx=-2.4,zs=ZB;
    W.fin(.7,0);W.box(sx,2.92,zs+.07,5.2,1.6,.1,hex('#0b0812'));
    W.fin(.9,1);for(const [a,b] of [[[sx-2.6,2.12,zs+.13],[sx+2.6,2.12,zs+.13]],[[sx-2.6,3.72,zs+.13],[sx+2.6,3.72,zs+.13]],[[sx-2.6,2.12,zs+.13],[sx-2.6,3.72,zs+.13]],[[sx+2.6,2.12,zs+.13],[sx+2.6,3.72,zs+.13]]])W.tube(a,b,.028,chrome,0,6);
    W.fin(0,0);
    {const c=mkCanvas(256,80),g=c.getContext('2d'),gr=g.createRadialGradient(128,40,4,128,40,130);gr.addColorStop(0,'rgba(70,20,130,1)');gr.addColorStop(.6,'rgba(26,6,52,1)');gr.addColorStop(1,'rgba(8,4,14,1)');
      g.fillStyle=gr;g.fillRect(0,0,256,80);for(let y=2;y<80;y+=4)for(let x=2;x<256;x+=4){g.fillStyle='rgba(120,220,255,'+(.05+.05*Math.sin(x*.07+y*.11))+')';g.fillRect(x,y,1.4,1.4);}
      const m=new MB();m.quad([sx-2.52,2.2,zs+.125],[sx+2.52,2.2,zs+.125],[sx+2.52,3.64,zs+.125],[sx-2.52,3.64,zs+.125],[1,1,1],0,QUV);TEXMESH.push({mesh:mesh(m),tex:texFrom(c,false),mode:3,emi:.42});}
    neon2(W,'BACK ROOM',[sx,3.0,zs+.17],[1,0,0],.072,hex('#2fe6ff'),4.5);
    neon2(W,'3D REBUILDS',[sx,2.42,zs+.17],[1,0,0],.034,hex('#ff2f9a'),4.2);
    lightAt(sx,2.9,zs+1.1,6,[.4,.6,1],1.0);
    /* chasing bulbs round the sign */
    const sets=[new MB(),new MB(),new MB()],pts=[];
    for(let x=sx-2.48;x<=sx+2.49;x+=.16)pts.push([x,3.62]);for(let y=3.48;y>=2.3;y-=.16)pts.push([sx+2.48,y]);
    for(let x=sx+2.48;x>=sx-2.49;x-=.16)pts.push([x,2.22]);for(let y=2.36;y<=3.49;y+=.16)pts.push([sx-2.48,y]);
    pts.forEach((p,i)=>sets[i%3].sphere(p[0],p[1],zs+.15,.024,hex('#ffd890'),3.2,0));
    const SM=sets.map(mesh);
    DECO.push({t:0,update(dt){this.t+=dt;},draw(){const k=Math.floor(this.t*7)%3;SM.forEach((m,i)=>drawLit(m,m4(),{emi:i===k?1.5:.12}));}});
  }
  /* the gallery's name on the left wall */
  W.fin(.6,0);W.box(B.x0+.03,3.16,.4,.06,.42,3.3,hex('#0a0810'));W.fin(0,0);
  neon2(W,'GALLERY',[B.x0+.08,3.0,.4],[0,0,-1],.05,GOLD,4);lightAt(B.x0+1.3,2.8,.4,6,[1,.85,.4],.7);
  /* a bench facing the gallery */
  {const bx=-6.7,bz=.4;W.fin(.5,0);W.box(bx,.42,bz,.45,.08,1.8,hex('#2b2040'));W.fin(.9,1);W.box(bx,.21,bz-.78,.4,.42,.06,chrome);W.box(bx,.21,bz+.78,.4,.42,.06,chrome);W.fin(0,0);block(bx-.25,bx+.25,bz-.95,bz+.95);}
  lightAt(-2.4,2.6,1.5,9,[.3,.5,1],.5);lightAt(5,2.6,3.5,8,[.7,.25,1],.5);

  /* ---- THE WORKSHOP, behind the main room: the unfinished games ---- */
  truss(-8.4,-17.6,8.4,-17.6,TY,.32);truss(-8.4,-22.6,8.4,-22.6,TY,.32);
  for(const [gx,gz] of [[-5.5,-17],[5.5,-17],[0,-20.6]])house(gx,gz,.6,7,'#fff0dc');
  uvRow(-15.6,-8.2,8.2,2.5);uvRow(-19.8,-8.2,8.2,2.5);
  {const z0=B.z0;W.fin(.7,0);W.box(0,3.12,z0+.07,6.4,1.36,.1,hex('#0b0812'));
    W.fin(.9,1);for(const [a,b] of [[[-3.2,2.44,z0+.13],[3.2,2.44,z0+.13]],[[-3.2,3.8,z0+.13],[3.2,3.8,z0+.13]],[[-3.2,2.44,z0+.13],[-3.2,3.8,z0+.13]],[[3.2,2.44,z0+.13],[3.2,3.8,z0+.13]]])W.tube(a,b,.028,chrome,0,6);
    W.fin(0,0);neon2(W,'THE WORKSHOP',[0,3.12,z0+.17],[1,0,0],.064,GOLD,4.5);neon2(W,'UNFINISHED GAMES',[0,2.64,z0+.17],[1,0,0],.03,hex('#ff2f9a'),4.2);
    lightAt(0,3.0,z0+1.1,6,[1,.75,.4],.9);}
  spot([-1.6,TY-.2,-22.6],[-3.4,1.4,-25.2],[.65,.45,1],13,.9,{range:4.5,pool:.45});
  spot([1.6,TY-.2,-22.6],[3.4,1.4,-24.85],[1,.7,.35],14,.9,{range:4.5,pool:.45});
  spot([0,TY-.2,-22.6],[0,3.0,-25.9],[1,.8,.45],7,1.0,{light:false});

  /* ---- THE EMPTY ROOM: lit and dressed like the rest, and bare ---- */
  {const ex=(ER.x0+B.x0)/2,ez=(ER.z0+ER.z1)/2;
    truss(ER.x0+.6,ez,B.x0-WT-.6,ez,TY,.32);
    house(ex,ER.z0+2.6,.7,7);house(ex,ER.z1-2.6,.7,7);
    uvRow(ER.z0+2.2,ER.x0+.6,B.x0-.7);uvRow(ER.z1-2.2,ER.x0+.6,B.x0-.7);
    lightAt(ex,2.6,ez,9,[.5,.3,1],.45);}

  /* ---- a polished mat at the door, a polished floor in front of the games ---- */
  GLOSS.disc=[0,6.55,1.05,3];
  const PF=[-4.4,ZB,-.4,ZB+1.8];
  GLOSS.rects.push([...PF,1],[-7,-26,7,-23.1,1]);
  {const [cx,cz,r]=GLOSS.disc,pts=[];for(let i=0;i<64;i++){const a=i/64*TAU;pts.push([cx+Math.cos(a)*(r+.02),.012,cz+Math.sin(a)*(r+.02)]);}
    W.fin(.9,1);polyTube(W,pts,.02,chrome,0,true);W.fin(0,0);
    const p2=pts.map(p=>[cx+(p[0]-cx)*.985,.016,cz+(p[2]-cz)*.985]);polyTube(W,p2,.008,trimC,3.2,true);}
  {const [a0,b0,a1,b1]=PF;W.fin(.9,1);
    for(const [a,b] of [[[a0,.006,b1],[a1,.006,b1]],[[a0,.006,b0],[a0,.006,b1]],[[a1,.006,b0],[a1,.006,b1]]])W.tube(a,b,.012,chrome,0,6);W.fin(0,0);}
}
/* neon text along any wall: c is the centre of the bottom row, right is the reading direction */
function neon2(mb,s,c,right,px,col,glow){
  const cols=s.length*6-1;let gx=0;const lit=new Set();
  for(const ch of s){const g=G5[ch]||G5[' '];for(let r=0;r<7;r++)for(let k=0;k<5;k++)if((g[r]>>(4-k))&1)lit.add((gx+k)+','+r);gx+=6;}
  const P=(k,r)=>[c[0]+right[0]*(k-cols/2)*px,c[1]+(6-r)*px,c[2]+right[2]*(k-cols/2)*px];
  for(const key of lit){
    const [k,r]=key.split(',').map(Number);const a=P(k,r);
    if(lit.has((k+1)+','+r))mb.tube(a,P(k+1,r),px*.26,col,glow);
    if(lit.has(k+','+(r+1)))mb.tube(a,P(k,r+1),px*.26,col,glow);
    if(lit.has((k+1)+','+(r+1))&&!lit.has((k+1)+','+r)&&!lit.has(k+','+(r+1)))mb.tube(a,P(k+1,r+1),px*.26,col,glow);
    if(lit.has((k-1)+','+(r+1))&&!lit.has((k-1)+','+r)&&!lit.has(k+','+(r+1)))mb.tube(a,P(k-1,r+1),px*.26,col,glow);
    mb.box(a[0],a[1],a[2],px*.5,px*.5,px*.5,col,glow);
  }
}
