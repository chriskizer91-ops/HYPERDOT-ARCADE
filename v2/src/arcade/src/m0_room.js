/* ================= THE ROOM (V2) =================
   A black-box arcade: glossy black wainscot under a chrome rail, ribbed walls washed by a cove of LED light at the top,
   and an open ceiling with lighting trusses. Spotlights on the trusses throw beams through the haze onto the feature
   machines; blacklight tubes make the carpet glow in pools. Over the front of the floor three neon rings turn slowly.
   The front wall has glass doors onto a rainy street, and a synthwave mural; backlit posters fill the bare walls. */
function buildRoom(){
  const {x0,x1,z0,z1,h}=ROOM,W=WORLD;
  FLOOR.quad([x0,0,z1],[x1,0,z1],[x1,0,z0],[x0,0,z0],[1,1,1]);
  const wall=hex('#1e1731'),rib=hex('#2a2044'),wain=hex('#0a0810'),ceil=hex('#08070c'),soff=hex('#120e1c'),chrome=hex('#c0c6d2'),
    steel=hex('#3a3846'),blk=hex('#060509'),trimP=hex('#ff2f9a'),trimC=hex('#2fe6ff'),uvC=hex('#7a3cff');
  /* the shell */
  W.fin(0,0);
  W.quad([x0,0,z0],[x1,0,z0],[x1,h,z0],[x0,h,z0],wall);
  W.quad([x1,0,z1],[x0,0,z1],[x0,h,z1],[x1,h,z1],wall);
  W.quad([x0,0,z1],[x0,0,z0],[x0,h,z0],[x0,h,z1],wall);
  W.quad([x1,0,z0],[x1,0,z1],[x1,h,z1],[x1,h,z0],wall);
  W.quad([x0,h,z0],[x1,h,z0],[x1,h,z1],[x0,h,z1],ceil);
  /* each wall as a run: origin, direction along it, inward normal, length */
  const RUNS=[{o:[x0,z0],d:[1,0],n:[0,1],L:x1-x0,cove:'v'},{o:[x1,z1],d:[-1,0],n:[0,-1],L:x1-x0,cove:'p',skip:[[14.4,17.6]]},
    {o:[x0,z1],d:[0,-1],n:[1,0],L:z1-z0,cove:'c'},{o:[x1,z0],d:[0,1],n:[-1,0],L:z1-z0,cove:'c'}];
  const at=(R,s,off,y)=>[R.o[0]+R.d[0]*s+R.n[0]*off,y,R.o[1]+R.d[1]*s+R.n[1]*off];
  const boxAlong=(R,s,len,off,y,hgt,dep,col,e=0)=>{const c=at(R,s+len/2,off+dep/2,y);W.box(c[0],c[1],c[2],Math.abs(R.d[0])*len+Math.abs(R.n[0])*dep,hgt,Math.abs(R.d[1])*len+Math.abs(R.n[1])*dep,col,e);};
  for(const R of RUNS){
    const gaps=R.skip||[],free=(a,b)=>!gaps.some(([g0,g1])=>b>g0&&a<g1);
    const segs=[];let s0=0;for(const [g0,g1] of gaps){if(g0>s0)segs.push([s0,g0]);s0=g1;}segs.push([s0,R.L]);
    for(const [a,b] of segs){
      /* glossy black wainscot, a chrome rail on top, an LED line under the rail and one at the foot */
      W.fin(.75,0);boxAlong(R,a,b-a,0,.56,1.12,.05,wain);
      W.fin(.9,1);W.tube(at(R,a,.075,1.135),at(R,b,.075,1.135),.018,chrome,0,6);
      W.fin(0,0);W.tube(at(R,a,.055,1.085),at(R,b,.055,1.085),.006,R.cove==='p'?trimP:trimC,2.6);
      W.tube(at(R,a,.04,.05),at(R,b,.04,.05),.007,R.cove==='c'?trimP:trimC,2.2);
      /* the upper wall: ribs every 60 cm catch the light */
      W.fin(.35,0);
      for(let s=a+.3;s<b-.1;s+=.6)if(free(s-.06,s+.06))boxAlong(R,s-.05,.1,0,(1.2+h-.5)/2,h-.5-1.2,.045,rib);
      /* the cove: a soffit round the top of the walls with an LED strip on it, lighting the ceiling */
      W.fin(.2,0);boxAlong(R,a,b-a,0,h-.42,.16,.42,soff);
      W.fin(0,0);boxAlong(R,a,b-a,.36,h-.335,.012,.03,R.cove==='v'?hex('#a24bff'):R.cove==='p'?trimP:trimC,3.2);
    }
  }
  /* the glow of the cove on the ceiling: a soft gradient from the walls */
  const glowTex=(col)=>{const c=mkCanvas(4,128),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,128);
    gr.addColorStop(0,col);gr.addColorStop(.35,col.replace(/[\d.]+\)$/,'.35)'));gr.addColorStop(1,'rgba(0,0,0,1)');g.fillStyle='#000';g.fillRect(0,0,4,128);g.fillStyle=gr;g.fillRect(0,0,4,128);return texFrom(c,false);};
  const gV=glowTex('rgba(150,70,255,1)'),gC=glowTex('rgba(40,200,255,1)'),gP=glowTex('rgba(255,50,160,1)');
  const ceilGlow=(p0,p1,p2,p3,tex)=>{const m=new MB();m.quad(p0,p1,p2,p3,[1,1,1],0,[[0,1],[1,1],[1,0],[0,0]]);TEXMESH.push({mesh:mesh(m),tex,mode:3,emi:.55,add:true});};
  const yc=h-.004,gw=1.4;
  ceilGlow([x0,yc,z0],[x1,yc,z0],[x1,yc,z0+gw],[x0,yc,z0+gw],gV);
  ceilGlow([x1,yc,z1],[x0,yc,z1],[x0,yc,z1-gw],[x1,yc,z1-gw],gP);
  ceilGlow([x0,yc,z1],[x0,yc,z0],[x0+gw,yc,z0],[x0+gw,yc,z1],gC);
  ceilGlow([x1,yc,z0],[x1,yc,z1],[x1-gw,yc,z1],[x1-gw,yc,z0],gC);

  /* wall washes: soft scallops of light falling from the cove down the ribbed walls */
  {const sc=(col)=>{const c=mkCanvas(64,128),g=c.getContext('2d'),id=g.createImageData(64,128);
      const m=col.match(/\d+/g).map(Number);
      for(let y=0;y<128;y++)for(let x=0;x<64;x++){const u=(x-31.5)/32,v=y/128,w=Math.max(0,1-u*u/(.15+.85*Math.pow(v,.7)))*Math.pow(1-v,1.6)*(1-Math.exp(-v*40)),o=(y*64+x)*4;
        id.data[o]=m[0]*w;id.data[o+1]=m[1]*w;id.data[o+2]=m[2]*w;id.data[o+3]=255;}
      g.putImageData(id,0,0);return texFrom(c,false);};
    const SC={v:sc('rgb(150,80,255)'),p:sc('rgb(255,60,170)'),c:sc('rgb(50,200,255)')};
    for(const R of RUNS){const gaps=R.skip||[];
      for(let s=1.6;s<R.L-1;s+=2.9){if(gaps.some(([g0,g1])=>s+.8>g0&&s-.8<g1))continue;
        const a=at(R,s-.75,.05,h-.5),b=at(R,s+.75,.05,h-.5),c2=at(R,s+.75,.05,h-2.3),d=at(R,s-.75,.05,h-2.3);
        const m=new MB();m.quad(d,c2,b,a,[1,1,1],0,[[0,0],[1,0],[1,1],[0,1]]);TEXMESH.push({mesh:mesh(m),tex:SC[R.cove],mode:3,emi:.85,add:true});}}}

  /* ---- the ceiling: lighting trusses, house lights, blacklight tubes ---- */
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
  const TY=3.95;
  truss(-14,-5.2,14,-5.2,TY,.34);truss(-14,2.4,14,2.4,TY,.34);
  truss(-9.2,-10.6,-9.2,9.8,TY-.36,.3);truss(9.2,-10.6,9.2,9.8,TY-.36,.3);
  /* house lights: a few soft panels, dimmer than V1's, so the machines and the neon carry the room */
  for(const [gx,gz] of [[-4.5,-8.4],[4.5,-8.4],[-4.5,-1.2],[4.5,-1.2],[-4.5,6.3],[5.2,9.2]]){
    W.fin(.2,0);W.box(gx,h-.03,gz,1.5,.04,.5,hex('#fff4ea'),1.25);W.box(gx,h-.06,gz,1.62,.03,.62,blk);
    const L=lightAt(gx,h-.45,gz,8.5,[1,.88,.8],.8);L.hz=.12;}
  /* blacklight: rows of violet tubes; the carpet glows under them */
  for(const tz of [-8.6,-.9,7.4]){
    for(let tx=-13.5;tx<13.6;tx+=2.25){W.fin(.3,1);W.box(tx,h-.1,tz,1.25,.05,.09,steel);W.fin(0,0);W.tube([tx-.58,h-.14,tz],[tx+.58,h-.14,tz],.016,uvC,3.4);}
    UVT.push([-14,tz,14,tz,.95,2.5]);
  }
  UVT.push([-15.4,-7,-15.4,1.5,.5,1.4],[15.4,-.5,15.4,5,.5,1.4],[-12,-11.4,12,-11.4,.35,1.5]);

  /* ---- spotlights on the trusses: a fixture, a beam through the haze, a lit target, maybe a pool on the floor ---- */
  const spot=(from,to,col,deg,k,o={})=>{
    const d=[to[0]-from[0],to[1]-from[1],to[2]-from[2]],dl=Math.hypot(...d),th=Math.acos(clamp(-d[1]/dl,-1,1)),yaw=Math.atan2(d[0],d[2]);
    W.push();W.tr(...from);W.ry(yaw);W.rx(-th);
    W.fin(.6,1);W.cyl(0,-.28,0,.085,.3,12,hex('#1c1b24'));W.fin(.2,0);W.cyl(0,-.292,0,.07,.012,12,col.map(c=>c),6);
    W.fin(.55,1);W.tube([-.11,.02,0],[-.11,-.16,0],.012,steel);W.tube([.11,.02,0],[.11,-.16,0],.012,steel);W.tube([-.11,.02,0],[.11,.02,0],.012,steel);
    W.pop();
    const B=beamAt(from.slice(),d,deg,dl*1.12,col,k);
    if(o.light!==false){const lp=[to[0]-d[0]/dl*.8,to[1]-d[1]/dl*.8,to[2]-d[2]/dl*.8];const L=lightAt(lp[0],lp[1],lp[2],o.range||3.4,col,o.lk??.7);L.hz=.05;}
    if(o.pool)POOLS.push([to[0],to[2],dl*Math.tan(deg*Math.PI/180)*1.05,o.pool]);
    return B;
  };
  const SW=[1,.86,.7],PK=[1,.3,.75],CY=[.35,.85,1],AM=[1,.62,.25];
  /* the main sign gets two beams crossing on it */
  spot([-3.2,TY-.2,-5.2],[1.2,3.2,-11.9],PK,6,1.1,{light:false});
  spot([3.2,TY-.2,-5.2],[-1.2,3.2,-11.9],CY,6,1.1,{light:false});
  /* the deluxe corner, the racers, the motion sim, the pinball row, the redemption floor, the prize counter */
  spot([-9.2,TY-.55,-7.6],[-12.2,1.2,-8.7],AM,11,.9,{range:4});
  spot([-9.2,TY-.55,-8.6],[-8.9,1.0,-10.0],PK,10,.8);
  spot([5.75,TY-.2,-5.2],[5.75,.6,-9.6],SW,13,.75,{pool:.5});
  spot([9.2,TY-.55,-7.8],[10.6,.6,-9.6],SW,13,.75,{pool:.5});
  spot([9.2,TY-.55,-4.4],[13.6,1.1,-5.7],CY,14,.9,{range:4.2});
  spot([9.2,TY-.55,.6],[14,1,-.6],AM,13,.75);
  spot([9.2,TY-.55,3.2],[14.2,1,3],PK,12,.7);
  spot([-4.45,TY-.2,-5.2],[-4.45,.2,-1.9],SW,15,.6,{pool:.55,light:false});
  spot([5.2,TY-.2,2.4],[5.2,.2,-.6],SW,15,.6,{pool:.5,light:false});
  spot([-9.2,TY-.55,7.8],[-11.5,1.1,10.3],AM,13,.85,{pool:.35});
  spot([-9.2,TY-.55,2.6],[-9.8,.1,3.4],SW,12,.6,{pool:.5,light:false});
  spot([0,TY-.2,2.4],[0,.1,.6],SW,14,.55,{pool:.45,light:false});

  /* ---- the main sign, where your eyes land when the lights come on ---- */
  W.fin(.7,0);W.box(0,3.0,z0+.07,7.6,2.1,.1,hex('#0b0812'));
  W.fin(.9,1);for(const [a,b] of [[[-3.8,1.95,z0+.13],[3.8,1.95,z0+.13]],[[-3.8,4.05,z0+.13],[3.8,4.05,z0+.13]],[[-3.8,1.95,z0+.13],[-3.8,4.05,z0+.13]],[[3.8,1.95,z0+.13],[3.8,4.05,z0+.13]]])W.tube(a,b,.03,chrome,0,6);
  W.fin(0,0);
  {const c=mkCanvas(256,72),g=c.getContext('2d'),gr=g.createRadialGradient(128,36,4,128,36,130);gr.addColorStop(0,'rgba(120,30,170,1)');gr.addColorStop(.6,'rgba(40,8,70,1)');gr.addColorStop(1,'rgba(8,4,14,1)');
    g.fillStyle=gr;g.fillRect(0,0,256,72);for(let y=2;y<72;y+=4)for(let x=2;x<256;x+=4){g.fillStyle='rgba(255,120,220,'+(.06+.05*Math.sin(x*.07+y*.11))+')';g.fillRect(x,y,1.4,1.4);}
    const m=new MB();m.quad([-3.7,2.03,z0+.125],[3.7,2.03,z0+.125],[3.7,3.97,z0+.125],[-3.7,3.97,z0+.125],[1,1,1],0,QUV);TEXMESH.push({mesh:mesh(m),tex:texFrom(c,false),mode:3,emi:.42});}
  neon2(W,'HYPERDOT',[0,3.36,z0+.17],[1,0,0],.085,hex('#ff2f9a'),4.5);
  neon2(W,'ARCADE',[0,2.66,z0+.17],[1,0,0],.06,hex('#2fe6ff'),4.5);
  lightAt(0,3.0,z0+1.2,7,[1,.25,.6],1.1);
  /* chasing bulbs round the sign: three sets, lit in turn */
  {const sets=[new MB(),new MB(),new MB()],pts=[];
    for(let x=-3.66;x<=3.67;x+=.16)pts.push([x,3.95]);for(let y=3.8;y>=2.2;y-=.16)pts.push([3.66,y]);
    for(let x=3.66;x>=-3.67;x-=.16)pts.push([x,2.05]);for(let y=2.2;y<=3.81;y+=.16)pts.push([-3.66,y]);
    pts.forEach((p,i)=>sets[i%3].sphere(p[0],p[1],z0+.15,.026,hex('#ffd890'),3.2,0));
    const SM=sets.map(mesh);
    DECO.push({t:0,update(dt){this.t+=dt;},draw(){const k=Math.floor(this.t*7)%3;SM.forEach((m,i)=>drawLit(m,m4(),{emi:i===k?1.5:.12}));}});}

  /* ---- zone signs ---- */
  const sign=(txt,c,right,px,col,back)=>{const n=[-right[2],0,right[0]],w=(txt.length*6+3)*px;
    if(back){W.fin(.6,0);W.box(c[0]-n[0]*.03,c[1]+3*px,c[2]-n[2]*.03,Math.abs(right[0])*w+.04,9*px,Math.abs(right[2])*w+.04,hex('#0a0810'));W.fin(0,0);}
    neon2(W,txt,c,right,px,hex(col),4);};
  sign('DELUXE',[-10.6,3.05,z0+.12],[1,0,0],.055,'#f2c45a',1);lightAt(-10.6,2.8,z0+1.4,6,[1,.75,.4],.8);
  sign('RACING',[10.6,3.05,z0+.12],[1,0,0],.055,'#ff2a4a',1);lightAt(10.6,2.8,z0+1.4,6,[1,.3,.3],.8);
  sign('VIDEO',[x0+.12,3.05,-2.9],[0,0,-1],.06,'#58e8ff',1);lightAt(x0+1.4,2.8,-2.9,6,[.3,.7,1],.8);
  sign('PINBALL',[x1-.12,3.05,-.6],[0,0,1],.055,'#ff9a2e',1);lightAt(x1-1.4,2.8,-.6,6,[1,.6,.3],.8);
  sign('PRIZES',[-11.5,3.1,z1-.12],[-1,0,0],.055,'#ffd23f',1);lightAt(-11.5,2.8,z1-1.4,6,[1,.85,.4],.8);
  /* a hanging sign over the redemption games, on cables */
  {const hx=-4.45,hz=-.55;W.fin(.6,0);W.box(hx,3.3,hz,2.9,.5,.08,hex('#0a0810'));W.fin(0,0);for(const sx of [-1.3,1.3])W.tube([hx+sx,3.55,hz],[hx+sx,h,hz],.006,hex('#555'));
  neon2(W,'TICKETS',[hx,3.15,hz+.05],[1,0,0],.04,hex('#7dff6a'),4);neon2(W,'TICKETS',[hx,3.15,hz-.05],[-1,0,0],.04,hex('#ff4fb8'),4);}
  lightAt(-6,2.6,0,9,[.25,.5,1],.55);lightAt(6,2.6,0,9,[.7,.25,1],.55);

  /* ---- pillars: glossy black, chrome at the ends, LED strips up the corners ---- */
  for(const [px,pz] of [[-8,-4.4],[8,-4.4],[-8,4.8],[8,4.8]]){
    W.fin(.8,0);W.box(px,h/2,pz,.5,h,.5,hex('#0c0a12'));
    W.fin(.9,1);W.box(px,.08,pz,.62,.16,.62,chrome);W.box(px,h-.5,pz,.6,.08,.6,chrome);
    W.fin(0,0);
    for(const [cx,cz] of [[-1,-1],[1,-1],[1,1],[-1,1]])W.box(px+cx*.252,(1.2+h-.6)/2,pz+cz*.252,.022,h-.6-1.2,.022,(cx*cz>0)?trimP:trimC,3);
    for(const yy of [1.12,h-.62])for(let k=0;k<4;k++){const s=[[-1,-1],[1,-1],[1,1],[-1,1]],a=s[k],b=s[(k+1)%4];W.tube([px+a[0]*.27,yy,pz+a[1]*.27],[px+b[0]*.27,yy,pz+b[1]*.27],.012,yy>2?trimC:trimP,2.8);}
    block(px-.31,px+.31,pz-.31,pz+.31);
  }

  /* ---- the way in: glass doors onto a rainy street ---- */
  {const dz=z1-.02;
    const c=mkCanvas(512,384),g=c.getContext('2d');let sd=7;const R=()=>(sd=(sd*16807)%2147483647)/2147483647;
    let gr=g.createLinearGradient(0,0,0,384);gr.addColorStop(0,'#04030c');gr.addColorStop(.55,'#120a2a');gr.addColorStop(.62,'#05040a');gr.addColorStop(1,'#0a0716');g.fillStyle=gr;g.fillRect(0,0,512,384);
    for(let i=0;i<9;i++){const bx=i*60-20+R()*20,bw=50+R()*40,bh=120+R()*110,top=236-bh;g.fillStyle='#0a0814';g.fillRect(bx,top,bw,bh);
      for(let y=top+8;y<230;y+=11)for(let x=bx+6;x<bx+bw-6;x+=9)if(R()<.35){g.fillStyle=R()<.5?'rgba(255,200,120,.75)':'rgba(120,200,255,.6)';g.fillRect(x,y,4,5);}}
    const neon=(t,x,y,col,sz)=>{g.save();g.font='bold '+sz+'px monospace';g.textAlign='center';g.shadowColor=col;g.shadowBlur=14;g.fillStyle=col;g.fillText(t,x,y);g.fillStyle='#fff';g.shadowBlur=4;g.globalAlpha=.6;g.fillText(t,x,y);g.restore();};
    neon('NOODLES',120,150,'#ff3d8f',26);neon('OPEN',390,170,'#3dfff0',30);neon('24H',300,120,'#ffd23f',20);
    // the wet street: the lights again, smeared down
    g.save();g.globalAlpha=.35;g.scale(1,-1);g.drawImage(c,0,-236-150,512,150);g.restore();
    gr=g.createLinearGradient(0,236,0,384);gr.addColorStop(0,'rgba(10,6,22,.2)');gr.addColorStop(1,'rgba(10,6,22,.85)');g.fillStyle=gr;g.fillRect(0,236,512,148);
    g.strokeStyle='rgba(180,200,255,.18)';g.lineWidth=1;for(let i=0;i<260;i++){const x=R()*512,y=R()*384;g.beginPath();g.moveTo(x,y);g.lineTo(x-3,y+14);g.stroke();}
    const m=new MB();m.quad([1.5,0,dz],[-1.5,0,dz],[-1.5,2.3,dz],[1.5,2.3,dz],[1,1,1],0,QUV);TEXMESH.push({mesh:mesh(m),tex:texFrom(c,false),mode:3,emi:.75});
    W.fin(.9,1);
    for(const [a,b] of [[[-1.55,0,z1-.06],[-1.55,2.35,z1-.06]],[[1.55,0,z1-.06],[1.55,2.35,z1-.06]],[[-1.55,2.35,z1-.06],[1.55,2.35,z1-.06]],[[0,0,z1-.06],[0,2.35,z1-.06]]])W.tube(a,b,.035,chrome,0,6);
    for(const sx of [-1,1])W.tube([sx*.12,.9,z1-.12],[sx*.12,1.45,z1-.12],.014,chrome,0,6);
    W.fin(0,0);for(const [a,b] of [[[-1.62,0,z1-.08],[-1.62,2.42,z1-.08]],[[1.62,0,z1-.08],[1.62,2.42,z1-.08]],[[-1.62,2.42,z1-.08],[1.62,2.42,z1-.08]]])W.tube(a,b,.012,trimC,3);
    neon2(W,'EXIT',[0,2.6,z1-.08],[-1,0,0],.05,hex('#ff3030'),3);
    lightAt(0,1.6,z1-.9,4,[.45,.55,1],.45);
  }

  /* ---- a synthwave mural across the front wall, right of the doors ---- */
  {const c=mkCanvas(1024,240),g=c.getContext('2d'),HZN=150;
    let gr=g.createLinearGradient(0,0,0,HZN);gr.addColorStop(0,'#0a0420');gr.addColorStop(.6,'#3a0a4a');gr.addColorStop(1,'#ff3d8f');g.fillStyle=gr;g.fillRect(0,0,1024,HZN);
    for(let i=0;i<140;i++){g.fillStyle='rgba(255,255,255,'+(.2+.5*Math.random())+')';g.fillRect(Math.random()*1024,Math.random()*90,1.5,1.5);}
    const sx=620,sy=HZN,sr=78;gr=g.createLinearGradient(0,sy-sr,0,sy);gr.addColorStop(0,'#ffe14d');gr.addColorStop(1,'#ff2f9a');g.fillStyle=gr;
    g.beginPath();g.arc(sx,sy,sr,Math.PI,0);g.fill();g.fillStyle='#3a0a4a';for(let k=0;k<6;k++){const y=sy-8-k*11;g.fillRect(sx-sr,y,sr*2,2+k*.9);}
    g.fillStyle='#14052a';g.beginPath();g.moveTo(0,HZN);for(let x=0;x<=1024;x+=32)g.lineTo(x,HZN-20-Math.abs(Math.sin(x*.013)*38+Math.sin(x*.031)*16));g.lineTo(1024,HZN);g.fill();
    g.fillStyle='#08020f';g.fillRect(0,HZN,1024,90);
    g.strokeStyle='#ff2f9a';g.lineWidth=2;g.shadowColor='#ff2f9a';g.shadowBlur=8;
    for(let i=-20;i<=20;i++){g.beginPath();g.moveTo(512+i*14,HZN);g.lineTo(512+i*80,240);g.stroke();}
    for(let k=1;k<9;k++){const y=HZN+Math.pow(k/8,2.2)*90;g.beginPath();g.moveTo(0,y);g.lineTo(1024,y);g.stroke();}
    g.shadowBlur=0;
    const palm=(x,s)=>{g.strokeStyle='#05010a';g.fillStyle='#05010a';g.lineWidth=5*s;g.beginPath();g.moveTo(x,HZN+10);g.quadraticCurveTo(x+10*s,HZN-50*s,x+4*s,HZN-100*s);g.stroke();
      for(let k=0;k<6;k++){const a=-Math.PI/2+(k-2.5)*.55;g.beginPath();g.moveTo(x+4*s,HZN-100*s);g.quadraticCurveTo(x+4*s+Math.cos(a)*40*s,HZN-100*s+Math.sin(a)*25*s-10*s,x+4*s+Math.cos(a)*62*s,HZN-100*s+Math.sin(a)*20*s+18*s);g.lineWidth=6*s;g.stroke();}};
    palm(150,1.2);palm(230,.8);palm(880,1.1);
    gradText(g,'HYPERDOT',190,22,4,GRAD.cyan,'c');
    const m=new MB(),zz=z1-.065;m.quad([15.6,1.25,zz],[5.8,1.25,zz],[5.8,3.55,zz],[15.6,3.55,zz],[1,1,1],0,QUV);TEXMESH.push({mesh:mesh(m),tex:texFrom(c,false),mode:3,emi:.7});
    W.fin(.9,1);for(const [a,b] of [[[5.75,1.2,zz-.02],[15.65,1.2,zz-.02]],[[5.75,3.6,zz-.02],[15.65,3.6,zz-.02]]])W.tube(a,b,.02,chrome,0,6);W.fin(0,0);
    lightAt(10.7,2.4,z1-1.2,5,[1,.35,.7],.5);
  }

  /* ---- backlit posters on the bare walls ---- */
  const poster=(c,right,title,cols,motif,bg)=>{
    const cv=mkCanvas(192,288),g=cv.getContext('2d');let gr=g.createLinearGradient(0,0,0,288);gr.addColorStop(0,bg[0]);gr.addColorStop(1,bg[1]);g.fillStyle=gr;g.fillRect(0,0,192,288);
    if(motif==='stars'){for(let i=0;i<90;i++){g.fillStyle='rgba(255,255,255,'+Math.random()+')';g.fillRect(Math.random()*192,Math.random()*288,1.5,1.5);}
      g.fillStyle=cols[3];g.beginPath();g.moveTo(96,120);g.lineTo(76,190);g.lineTo(96,176);g.lineTo(116,190);g.fill();g.fillStyle='#ffe14d';g.fillRect(90,190,12,16);}
    else if(motif==='road'){g.fillStyle='#05030a';g.fillRect(0,170,192,118);g.strokeStyle=cols[3];g.lineWidth=3;for(const k of [-1,1]){g.beginPath();g.moveTo(96+k*6,170);g.lineTo(96+k*90,288);g.stroke();}
      for(let i=0;i<6;i++){const y=172+i*i*3.4;g.fillStyle='#ffe14d';g.fillRect(94,y,4,2+i);}g.fillStyle=cols[4];g.beginPath();g.arc(96,170,46,Math.PI,0);g.fill();}
    else if(motif==='fist'){for(let i=0;i<18;i++){g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=6;g.beginPath();g.moveTo(96,170);g.lineTo(96+Math.cos(i/18*TAU)*220,170+Math.sin(i/18*TAU)*220);g.stroke();}
      g.fillStyle=cols[3];g.fillRect(70,140,52,52);g.fillStyle=cols[1];g.fillRect(70,140,52,10);}
    else if(motif==='forge'){gr=g.createRadialGradient(96,200,6,96,200,110);gr.addColorStop(0,'#fff3c4');gr.addColorStop(.3,'#ff8a2e');gr.addColorStop(1,'rgba(255,40,10,0)');g.fillStyle=gr;g.fillRect(0,90,192,198);}
    else if(motif==='sim'){g.strokeStyle=cols[3];g.lineWidth=2;for(let i=0;i<5;i++){g.beginPath();g.arc(96,180,30+i*16,Math.PI*1.1,Math.PI*1.9);g.stroke();}
      for(let i=0;i<5;i++){g.fillStyle='#ff2a2a';g.beginPath();g.arc(48+i*24,120,7,0,TAU);g.fill();}}
    const sc=title.length>9?2:3;gradText(g,title,96,28,sc,cols,'c');
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=2;g.strokeRect(6,6,180,276);
    txt3(g,'NOW PLAYING · HYPERDOT ARCADE',96,272,'#e9ddff','c');
    const n=[-right[2],0,right[0]],hw=.62,hh=.93,P=(a,b)=>[c[0]+right[0]*a*hw,c[1]+b*hh,c[2]+right[2]*a*hw];
    const m=new MB();m.quad(P(-1,-1),P(1,-1),P(1,1),P(-1,1),[1,1,1],0,QUV);TEXMESH.push({mesh:mesh(m),tex:texFrom(cv,false),mode:3,emi:1.0});
    W.fin(.85,1);const f=(a,b,a2,b2)=>W.tube([...P(a,b)].map((v,i)=>v-n[i]*.01),[...P(a2,b2)].map((v,i)=>v-n[i]*.01),.022,chrome,0,6);
    f(-1.04,-1.03,1.04,-1.03);f(-1.04,1.03,1.04,1.03);f(-1.04,-1.03,-1.04,1.03);f(1.04,-1.03,1.04,1.03);W.fin(0,0);
    const lp=[c[0]+n[0]*.9,c[1]+.4,c[2]+n[2]*.9];const L=lightAt(lp[0],lp[1],lp[2],2.6,[cols[3]].map(hx=>hex(hx).map(v=>Math.min(1,v*3)))[0],.45);L.hz=.6;
  };
  poster([x0+.08,1.95,2.6],[0,0,-1],'VOIDLANCE',GRAD.violet,'stars',['#05061a','#2a0a4a']);
  poster([x0+.08,1.95,5.4],[0,0,-1],'VOLTFIST',GRAD.cyan,'fist',['#06102a','#0a2a6a']);
  poster([x0+.08,1.95,8.2],[0,0,-1],'MOLTEN',GRAD.amber,'forge',['#1a0602','#3a0c04']);
  poster([x1-.08,1.95,6.6],[0,0,1],'REDLINE',GRAD.red,'road',['#1a0208','#3a0a2a']);
  poster([x1-.08,1.95,9.6],[0,0,1],'SHIFTLIGHT 3',GRAD.gold,'sim',['#0a0a14','#1a1030']);

  /* ---- three neon rings turning over the front of the floor ---- */
  {const cx=0,cy=3.35,cz=7.2,RG=[[1.55,'#ff2f9a',.11,.33],[1.2,'#2fe6ff',-.17,.5],[.85,'#b47aff',.23,.7]];
    const RM=RG.map(([r,c])=>{const m=new MB(),pts=[];for(let i=0;i<64;i++){const a=i/64*TAU;pts.push([Math.cos(a)*r,0,Math.sin(a)*r]);}polyTube(m,pts,.03,hex(c),4.2,true);return mesh(m);});
    for(const a of [0,2.09,4.19])W.tube([cx+Math.cos(a)*.3,cy+.25,cz+Math.sin(a)*.3],[cx+Math.cos(a)*.3,h,cz+Math.sin(a)*.3],.006,hex('#666'));
    W.fin(.9,1);W.sphere(cx,cy+.25,cz,.12,chrome,0,1);W.fin(0,0);
    lightAt(cx,cy-.6,cz,6.5,[.85,.3,1],.95).hz=.7;
    DECO.push({t:0,update(dt){this.t+=dt;},draw(){const t=this.t;RM.forEach((m,i)=>{const s=RG[i];drawLit(m,chain(mT(cx,cy,cz),mRY(t*s[2]),mRX(s[3]*Math.sin(t*.4+i)),mRZ(.2*Math.cos(t*.3+i*2))),{emi:1});});}});
  }

  /* ---- polished floors: the landing pad, the mat at the doors, the pit lane chequer, the deluxe corner ---- */
  GLOSS.disc=[2.4,5.2,2.1,3];
  GLOSS.rects.push([-2.3,9.9,2.3,12,1],[4.4,-12,16,-8.25,2],[-16,-12,-7.3,-7.25,1]);
  {const [cx,cz,r]=GLOSS.disc,pts=[];for(let i=0;i<72;i++){const a=i/72*TAU;pts.push([cx+Math.cos(a)*(r+.02),.012,cz+Math.sin(a)*(r+.02)]);}
    W.fin(.9,1);polyTube(W,pts,.022,chrome,0,true);W.fin(0,0);
    const p2=pts.map(p=>[cx+(p[0]-cx)*.985,.016,cz+(p[2]-cz)*.985]);polyTube(W,p2,.008,trimC,3.2,true);}
  for(const [x0r,z0r,x1r,z1r] of [[-2.3,9.9,2.3,12],[4.4,-12,16,-8.25],[-16,-12,-7.3,-7.25]]){W.fin(.9,1);
    for(const [a,b] of [[[x0r,.006,z0r],[x1r,.006,z0r]],[[x1r,.006,z0r],[x1r,.006,z1r]],[[x1r,.006,z1r],[x0r,.006,z1r]],[[x0r,.006,z1r],[x0r,.006,z0r]]])W.tube(a,b,.012,chrome,0,6);W.fin(0,0);}

  /* ---- benches, a change machine and a bin ---- */
  for(const bx of [-4.2,4.2]){const bz=9.6;W.fin(.5,0);W.box(bx,.42,bz,1.6,.08,.45,hex('#2b2040'));W.fin(.9,1);W.box(bx-.7,.21,bz,.06,.42,.4,chrome);W.box(bx+.7,.21,bz,.06,.42,.4,chrome);W.fin(0,0);block(bx-.85,bx+.85,bz-.25,bz+.25);}
  W.fin(.6,0);W.box(4.8,.95,z1-.35,.7,1.9,.5,hex('#2a3b52'));W.fin(0,0);W.box(4.8,1.35,z1-.61,.5,.42,.02,hex('#7fffd4'),2.2);W.box(4.8,.8,z1-.61,.18,.08,.02,hex('#ffcc33'),2);
  neon2(W,'CHANGE',[4.8,1.98,z1-.62],[-1,0,0],.022,hex('#ffcc33'),2.5);block(4.4,5.2,z1-.65,z1);
  W.fin(.8,1);W.cyl(-4.6,0,z1-.4,.22,.8,14,hex('#3a3a46'),0,.24);W.fin(0,0);block(-4.85,-4.35,z1-.65,z1);
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
