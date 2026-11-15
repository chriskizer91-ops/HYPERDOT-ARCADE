/* =====================================================================================
   THE WORKSHOP'S CABINETS: each one built to look like its game
   - EnvoiShrine: Envoi on the Longest Night, a moonlit gothic shrine. A pointed arch with gilt trim,
     a rose window, a crescent moon over it, candles on the steps, motes of magic drifting round it,
     and the game's key art on its front.
   - FaireBooth: Moon Faire, a booth at a night faire. A striped tent with a scalloped valance of
     chasing bulbs, a velvet curtain behind a gilt playbill screen, a full moon on the peak, and
     the performers standing either side.
   - HalfBuilt: the next game, a cabinet still being built, with a work light, sawhorses and paint.
   - Workbench: a bench under a pegboard of tools, with a laptop building something.
   ===================================================================================== */
/* a canvas texture: draw(g,w,h) paints it */
function canvasTex(w,h,draw){const c=mkCanvas(w,h),g=c.getContext('2d');draw(g,w,h);return texFrom(c,false);}
/* a decoration: built into the room, never walked up to */
function Decor(build){const a={name:'',sub:'',controls:'none',use:{x:1e9,z:1e9,face:0},idle(){},draw(){},drawScreens(){},build};ATTR.push(a);return a;}
/* small glowing points drawn each frame (motes, bulbs): pos(i,t) gives each one's world position */
function Glints(n,col,r,pos,emi){const m=new MB();m.sphere(0,0,0,r,hex(col),4,0);const M=mesh(m);
  DECO.push({t:0,update(dt){this.t+=dt;},draw(){for(let i=0;i<n;i++){const p=pos(i,this.t);if(!p)continue;drawLit(M,mT(p[0],p[1],p[2]),{emi:emi?emi(i,this.t):1.6});}}});}

/* ---------- Envoi on the Longest Night: the moonlit shrine ---------- */
function EnvoiShrine(o){
  const a=Machine(Object.assign({useZ:1.0},o)),T=a.T;
  const SY=1.3,SW=.6,SH=.3375,FZ=.2;
  a.addScreen(o.game.id,o.res||[320,180],[0,SY,FZ+.03],-.06,SW,SH,{gain:2.3,col:'#d8b8ff'});
  /* the arch: straight sides, then a pointed top */
  const HW=.48,YS=1.95,YA=2.62,arch=(hw,y0,ys,ya)=>{const P=[[-hw,y0],[hw,y0],[hw,ys]];
    for(let i=1;i<14;i++){const u=1-i/14,x=hw*u;P.push([x,ys+(ya-ys)*Math.pow(1-u,.85)*(1-.25*u*u)]);}
    P.push([0,ya]);for(let i=13;i>=1;i--){const u=1-i/14,x=-hw*u;P.push([x,ys+(ya-ys)*Math.pow(1-u,.85)*(1-.25*u*u)]);}
    P.push([-hw,ys]);return P;};
  const OUT=arch(HW,.3,YS,YA),INN=arch(HW-.07,.98,YS-.04,YA-.13);
  const candles=[];
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const stone=hex('#221a2e'),stone2=hex('#2e2440'),dark=hex('#0c0814'),gold=hex('#d8b25a'),violet=hex('#a678ff');
    /* two stone steps with gilt edges */
    mb.fin(.35,0);mb.box(0,.08,.06,1.36,.16,.98,stone);mb.box(0,.22,.0,1.14,.12,.8,stone2);
    mb.fin(.85,1);mb.tube([-.68,.16,.55],[.68,.16,.55],.008,gold,0,6);mb.tube([-.57,.28,.4],[.57,.28,.4],.008,gold,0,6);
    /* the body: the arch, extruded back from its face */
    mb.fin(.3,0);mb.push();mb.ry(-Math.PI/2);mb.extrudeX(OUT,-.32,FZ,stone);mb.pop();
    /* the recess: a darker arch set into the face, where the screen sits */
    mb.fin(.15,0);mb.push();mb.ry(-Math.PI/2);mb.extrudeX(INN,FZ,FZ+.012,dark);mb.pop();
    /* gilt round the arch and round the recess */
    mb.fin(.85,1);polyTube(mb,OUT.map(p=>[p[0],p[1],FZ+.012]),.016,gold,0,false);polyTube(mb,INN.slice(1).concat([INN[0]]).map(p=>[p[0],p[1],FZ+.016]),.008,gold,.3,false);
    /* pinnacles at the front corners, gold-tipped */
    for(const sx of [-1,1]){const x=sx*(HW+.04);mb.fin(.4,0);mb.cyl(x,.28,FZ-.02,.045,1.78,10,stone2);mb.cyl(x,2.06,FZ-.02,.05,.26,10,stone2,0,0);
      mb.fin(.85,1);mb.sphere(x,2.33,FZ-.02,.026,gold,.6,1);mb.cyl(x,1.22,FZ-.02,.05,.025,10,gold);}
    /* the rose window: a gilt ring and spokes over stained glass */
    const RC=[0,2.14,FZ+.02],RR=.15;
    {const pts=[];for(let i=0;i<32;i++){const t=i/32*TAU;pts.push([RC[0]+Math.cos(t)*RR,RC[1]+Math.sin(t)*RR,RC[2]]);}
      mb.fin(.85,1);polyTube(mb,pts,.012,gold,0,true);
      for(let i=0;i<8;i++){const t=i/8*TAU;mb.tube([RC[0]+Math.cos(t)*.03,RC[1]+Math.sin(t)*.03,RC[2]+.004],[RC[0]+Math.cos(t)*RR,RC[1]+Math.sin(t)*RR,RC[2]+.004],.006,gold);}
      mb.sphere(RC[0],RC[1],RC[2]+.006,.028,gold,.8,1);}
    /* the control ledge: a crystal orb for a stick, two gilt buttons */
    mb.push();mb.tr(0,.98,.3);mb.rx(.32);mb.fin(.35,0);mb.box(0,0,0,.86,.05,.28,stone2);
      mb.fin(.85,1);mb.tube([-.43,.026,.14],[.43,.026,.14],.007,gold,0,6);
      mb.fin(.1,0);mb.cyl(-.2,.025,0,.03,.03,10,gold);mb.sphere(-.2,.085,0,.045,violet,1.8,2);
      mb.fin(.85,1);mb.cyl(.08,.025,.01,.03,.018,14,gold,.5);mb.cyl(.2,.025,-.01,.03,.018,14,gold,.5);mb.pop();
    /* candles on the lower step, three each side */
    for(const sx of [-1,1])for(const [dx,hh] of [[0,.22],[.07,.15],[-.06,.11]]){const x=sx*(.6+dx),z=.38+dx*.4;
      mb.fin(.1,0);mb.cyl(x,.16,z,.024,hh,10,hex('#eadfc4'));mb.fin(0,0);mb.sphere(x,.16+hh+.03,z,.016,hex('#ffb24a'),4,1,1.6);candles.push([x,.16+hh+.03,z]);}
    mb.pop();
    /* the title under the rose window, the key art below the ledge, a star map down each side */
    texQuad(T,[[-.32,1.6,FZ+.016],[.32,1.6,FZ+.016],[.32,1.8,FZ+.016],[-.32,1.8,FZ+.016]],marqueeTex('ENVOI','#120820','#06030e',GRAD.gold,'ON THE LONGEST NIGHT'),1.7);
    const kick={mesh:null,tex:null,mode:3,emi:.95};{const m=new MB();m.m=mmul(m.m,T);m.quad([-.4,.38,FZ+.004],[.4,.38,FZ+.004],[.4,.84,FZ+.004],[-.4,.84,FZ+.004],[1,1,1],0,QUV);kick.mesh=mesh(m);}
    imgCrop(ROOT+'art/envoi-keyart.webp',.8/.46,t=>{kick.tex=t;TEXMESH.push(kick);},1024);
    const stars=canvasTex(128,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1a0f34');gr.addColorStop(.6,'#2a1450');gr.addColorStop(1,'#0c0618');g.fillStyle=gr;g.fillRect(0,0,w,h);
      let sd=3;const R=()=>(sd=(sd*16807)%2147483647)/2147483647;const S=[];for(let i=0;i<70;i++){const x=R()*w,y=R()*h,r=R()<.12?1.8:.8;S.push([x,y]);g.fillStyle='rgba(235,225,255,'+(.4+R()*.6)+')';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
      g.strokeStyle='rgba(200,170,255,.35)';g.lineWidth=1;for(let i=0;i<9;i++){const p=S[i*3],q=S[i*3+1],r=S[i*3+2];g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.lineTo(r[0],r[1]);g.stroke();}
      g.fillStyle='rgba(255,236,190,.9)';g.beginPath();g.arc(w*.55,h*.14,16,0,TAU);g.fill();g.fillStyle='#1a0f34';g.beginPath();g.arc(w*.55+7,h*.14-4,14,0,TAU);g.fill();});
    for(const sx of [-1,1]){const x=sx*(HW+.002);texQuad(T,sx<0?[[x,.3,-.32],[x,.3,FZ],[x,YS,FZ],[x,YS,-.32]]:[[x,.3,FZ],[x,.3,-.32],[x,YS,-.32],[x,YS,FZ]],stars,.75);}
    /* the rose window's glass, lit from behind */
    const glass=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#120c1c';g.fillRect(0,0,w,h);const c=w/2,R=60,cols=['#7a3cff','#2f7bff','#ff4fb8','#c9a8ff','#4fe3ff','#ff8a3a','#b47aff','#2fe6ff'];
      for(let i=0;i<8;i++){g.fillStyle=cols[i];g.beginPath();g.moveTo(c,c);g.arc(c,c,R,i/8*TAU,(i+1)/8*TAU);g.closePath();g.fill();}
      for(let i=0;i<8;i++){g.fillStyle=cols[(i+3)%8];g.beginPath();g.arc(c+Math.cos((i+.5)/8*TAU)*R*.68,c+Math.sin((i+.5)/8*TAU)*R*.68,9,0,TAU);g.fill();}
      g.fillStyle='#ffe8b0';g.beginPath();g.arc(c,c,13,0,TAU);g.fill();});
    texQuad(T,[[-.15,1.99,FZ+.014],[.15,1.99,FZ+.014],[.15,2.29,FZ+.014],[-.15,2.29,FZ+.014]],glass,1.5);
    /* the crescent moon over the arch */
    const moon=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);const gr=g.createRadialGradient(w/2,h/2,10,w/2,h/2,60);gr.addColorStop(0,'#fff6dc');gr.addColorStop(1,'#ffd890');
      g.fillStyle=gr;g.beginPath();g.arc(w/2,h/2,52,0,TAU);g.fill();g.fillStyle='#000';g.beginPath();g.arc(w/2+24,h/2-14,46,0,TAU);g.fill();});
    const mt=chain(T,mT(0,2.98,-.05));texQuad(mt,[[-.2,-.2,0],[.2,-.2,0],[.2,.2,0],[-.2,.2,0]],moon,2.4);
    const p0=a.W(-.72,0,-.38),p1=a.W(.72,0,.58);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
    /* motes of magic drifting up round the arch */
    const MW=(x,y,z)=>a.W(x,y,z);
    Glints(14,'#d8b8ff',.011,(i,t)=>{const k=(t*.09+i/14)%1,ang=i*2.4+t*.35,r=.62+.12*Math.sin(i*1.7+t);return MW(Math.cos(ang)*r,.5+k*2.4,.05+Math.sin(ang)*r*.6);},(i,t)=>{const k=(t*.09+i/14)%1;return 2.4*Math.sin(k*Math.PI);});
    /* the candle flames, each flickering on its own */
    const CW=candles.map(c=>a.W(...c));
    Glints(CW.length,'#ffc066',.014,(i,t)=>CW[i],(i,t)=>2.6+.9*Math.sin(t*13+i*2.1)*Math.sin(t*7.3+i));
  };
  /* the light: violet from the arch, warm from the candles, cool moonlight from above */
  const gp=a.W(0,1.45,.95),glow=lightAt(gp[0],1.45,gp[2],3.4,[.62,.42,1],.85);
  const cl=[-1,1].map(sx=>{const p=a.W(sx*.62,.55,.6);return lightAt(p[0],.55,p[2],1.8,[1,.62,.3],.6);});
  const mp=a.W(0,3.1,.5);lightAt(mp[0],3.1,mp[2],3.2,[.75,.8,1],.55);
  a.onIdle=()=>{glow.k=.78+.1*Math.sin(W_.t*.9);cl.forEach((L,i)=>L.k=.55+.08*Math.sin(W_.t*11+i*3)+.05*Math.sin(W_.t*17.3+i));};
  return a;
}

/* ---------- Moon Faire: the booth at the night faire ---------- */
function FaireBooth(o){
  const a=Machine(Object.assign({useZ:1.25},o)),T=a.T;
  const SY=1.32,SW=.72,SH=.405,SZ=-.33;
  a.addScreen(o.game.id,o.res||[320,180],[0,SY,SZ],0,SW,SH,{gain:2.3,col:'#ffd27a'});
  const CW=.82,CD=.56,CY=2.25,AY=2.95;          // the canopy: half-width, half-depth, eave height, peak height
  const corners=[[-CW,CY,CD],[CW,CY,CD],[CW,CY,-CD],[-CW,CY,-CD]];
  const bulbsA=[],bulbsB=[];
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const wood=hex('#5a3218'),gold=hex('#e0b04a'),purple=hex('#4a1f7a'),plum=hex('#2e1050'),crimson=hex('#6a0f2a'),crimson2=hex('#4a0a1e'),cream=hex('#f2e6c8');
    /* the stage, with a gilt edge */
    mb.fin(.3,0);mb.box(0,.07,0,1.7,.14,1.2,wood);mb.fin(.85,1);mb.tube([-.85,.14,.6],[.85,.14,.6],.012,gold,0,6);
    /* four posts: the front two striped like a barber's pole */
    for(const [x,z] of [[-.72,.48],[.72,.48],[-.72,-.46],[.72,-.46]]){
      if(z>0)for(let k=0;k<11;k++){mb.fin(.4,0);mb.cyl(x,.14+k*.192,z,.036,.192,12,k%2?gold:purple);}
      else{mb.fin(.4,0);mb.cyl(x,.14,z,.032,2.1,10,plum);}
      mb.fin(.85,1);mb.sphere(x,CY+.02,z,.045,gold,.4,1);}
    /* the velvet curtain behind the screen, in folds, with gilt tie-backs */
    for(let i=0;i<10;i++){const x=-.66+i*.147;mb.fin(.15,0);mb.box(x,1.17,-.44+(i%2)*.025,.15,2.06,.03,i%2?crimson:crimson2);}
    mb.fin(.85,1);for(const sx of [-1,1])mb.tube([sx*.66,1.0,-.4],[sx*.5,1.1,-.38],.012,gold);
    /* the playbill frame round the screen */
    mb.fin(.85,1);const fw=SW/2+.05,fh=SH/2+.05,fz=SZ+.012;
    for(const [p,q] of [[[-fw,SY-fh,fz],[fw,SY-fh,fz]],[[-fw,SY+fh,fz],[fw,SY+fh,fz]],[[-fw,SY-fh,fz],[-fw,SY+fh,fz]],[[fw,SY-fh,fz],[fw,SY+fh,fz]]])mb.tube(p,q,.022,gold,0,6);
    for(const sx of [-1,1])for(const sy of [-1,1])mb.sphere(sx*fw,SY+sy*fh,fz,.032,gold,.3,1);
    mb.fin(.2,0);mb.box(0,SY,SZ-.01,SW+.08,SH+.08,.02,hex('#0a0510'));
    /* the canopy: a peaked tent in purple and gold stripes */
    mb.fin(.12,0);const AP=[0,AY,0],N=6;
    for(let s=0;s<4;s++){const A=corners[s],B=corners[(s+1)%4];
      for(let j=0;j<N;j++){const P0=[A[0]+(B[0]-A[0])*j/N,CY,A[2]+(B[2]-A[2])*j/N],P1=[A[0]+(B[0]-A[0])*(j+1)/N,CY,A[2]+(B[2]-A[2])*(j+1)/N];mb.tri(AP,P0,P1,(j+s)%2?gold:purple,0);}
      /* the valance: scalloped flaps hanging under the eave, a bulb at each point */
      for(let j=0;j<N;j++){const P0=[A[0]+(B[0]-A[0])*j/N,CY,A[2]+(B[2]-A[2])*j/N],P1=[A[0]+(B[0]-A[0])*(j+1)/N,CY,A[2]+(B[2]-A[2])*(j+1)/N];
        const C=[(P0[0]+P1[0])/2,CY,(P0[2]+P1[2])/2],r=Math.hypot(P1[0]-P0[0],P1[2]-P0[2])/2,ux=(P1[0]-P0[0])/(2*r),uz=(P1[2]-P0[2])/(2*r),col=(j+s)%2?purple:gold;
        let prev=P0;for(let k=1;k<=8;k++){const t=Math.PI*k/8,q=[C[0]-ux*r*Math.cos(t),CY-r*Math.sin(t)*.9,C[2]-uz*r*Math.cos(t)];mb.tri(C,prev,q,col,0);prev=q;}
        (j%2?bulbsA:bulbsB).push([P0[0],CY-.01,P0[2]]);}}
    /* the full moon on the peak */
    mb.fin(0,0);mb.sphere(0,AY+.13,0,.13,hex('#fff4d8'),1.9,2);mb.fin(.85,1);mb.cyl(0,AY-.02,0,.012,.05,6,gold);
    /* the name board hanging from the front eave, ringed with bulbs */
    mb.fin(.4,0);mb.box(0,2.03,CD+.02,.98,.3,.03,plum);mb.fin(.85,1);
    for(const [p,q] of [[[-.49,1.88,CD+.04],[.49,1.88,CD+.04]],[[-.49,2.18,CD+.04],[.49,2.18,CD+.04]],[[-.49,1.88,CD+.04],[-.49,2.18,CD+.04]],[[.49,1.88,CD+.04],[.49,2.18,CD+.04]]])mb.tube(p,q,.01,gold,0,6);
    for(let i=0;i<=12;i++){const x=-.47+i*.94/12;(i%2?bulbsA:bulbsB).push([x,2.18,CD+.05],[x,1.88,CD+.05]);}
    /* a ticket podium out front */
    mb.fin(.35,0);mb.box(0,.47,.78,.34,.66,.24,crimson);mb.fin(.85,1);mb.box(0,.81,.78,.4,.03,.3,gold);
    mb.fin(.5,0);mb.cyl(-.07,.825,.8,.025,.018,12,hex('#ffd23f'),1.4);mb.cyl(.07,.825,.8,.025,.018,12,hex('#ff4fb8'),1.4);
    mb.pop();
    texQuad(T,[[-.46,1.9,CD+.036],[.46,1.9,CD+.036],[.46,2.16,CD+.036],[-.46,2.16,CD+.036]],marqueeTex('MOON FAIRE','#2e1050','#12061e',GRAD.gold,'THE PERFORMERS'),1.8);
    /* the performers, standing either side of the booth on cut-out boards */
    for(const [sx,src,w,h] of [[-1,'art/moon-jester.webp',.42,.86],[1,'art/moon-witchfox.webp',.5,.86]]){
      const ST=chain(T,mT(sx*1.18,0,.32),mRY(sx*-.42));
      const m=new MB();m.m=mmul(m.m,ST);m.fin(.4,0);m.box(0,.03,.0,.36,.06,.2,hex('#2e1050'));m.fin(.85,1);m.tube([-w/2-.02,.06,-.01],[w/2+.02,.06,-.01],.01,hex('#e0b04a'),0,6);
      m.fin(.2,0);m.box(0,.08+h/2+.02,-.02,w+.04,h+.04,.02,hex('#140a20'));TEXMESH.push({mesh:mesh(m),tex:null,mode:0});
      const e={mesh:null,tex:null,mode:3,emi:1.05};const q=new MB();q.m=mmul(q.m,ST);q.quad([-w/2,.1,-.008],[w/2,.1,-.008],[w/2,.1+h,-.008],[-w/2,.1+h,-.008],[1,1,1],0,QUV);e.mesh=mesh(q);
      imgCrop(ROOT+src,w/h,t=>{e.tex=t;TEXMESH.push(e);},512);
      const fp=xf(ST,0,0,0);block(fp[0]-.25,fp[0]+.25,fp[2]-.15,fp[2]+.15);}
    const p0=a.W(-.9,0,-.62),p1=a.W(.9,0,.92);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
    /* the bulbs chase round: two sets, lit in turn */
    const BA=bulbsA.map(p=>a.W(...p)),BB=bulbsB.map(p=>a.W(...p)),ALL=BA.concat(BB);
    Glints(ALL.length,'#ffe2a0',.02,(i)=>ALL[i],(i,t)=>{const on=Math.floor(t*3.2)%2;return (i<BA.length)===(on===0)?3.2:.35;});
  };
  const gp=a.W(0,1.6,1.0),glow=lightAt(gp[0],1.6,gp[2],3.6,[1,.72,.35],.85);
  const pk=a.W(0,2.4,.2);lightAt(pk[0],2.4,pk[2],2.8,[1,.35,.7],.55);
  a.onIdle=()=>{glow.k=.8+.08*Math.sin(W_.t*3.2*Math.PI);};
  return a;
}

/* ---------- the next game: a cabinet still being built ---------- */
function HalfBuilt(o){
  const T=chain(mT(o.x,0,o.z),mRY(o.ry||0));
  Decor(mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const pine=hex('#b8925a'),mdf=hex('#9a7e58'),steel=hex('#6a6a74'),dark=hex('#141218');
    /* the frame: the cabinet's outline in bare timber on both sides, rails across */
    for(const sx of [-.33,.33])for(let i=0;i<CAB_PROF.length-1;i++){const A=CAB_PROF[i],B=CAB_PROF[i+1];mb.fin(.15,0);mb.tube([sx,A[1],A[0]],[sx,B[1],B[0]],.022,pine);}
    for(let i=0;i<CAB_PROF.length;i+=2){const A=CAB_PROF[i];mb.tube([-.33,A[1],A[0]],[.33,A[1],A[0]],.018,pine);}
    /* one side panel on, unpainted; the other still to go */
    mb.fin(.1,0);mb.extrudeX(CAB_PROF,-.35,-.33,mdf);
    /* wires hanging where the screen will go */
    for(const [x,c] of [[-.1,'#d8302a'],[0,'#2a2a30'],[.12,'#2a6ad8']]){const pts=[];for(let k=0;k<=8;k++){const t=k/8;pts.push([x+Math.sin(t*3+x*9)*.03,1.62-t*.6,.08+Math.sin(t*Math.PI)*.08]);}polyTube(mb,pts,.006,hex(c));}
    /* a work light clamped on top */
    mb.fin(.6,1);mb.box(0,1.95,.05,.08,.05,.12,steel);mb.push();mb.tr(0,2.0,.12);mb.rx(.9);mb.cyl(0,0,0,.07,.12,12,hex('#d8a020'),0,.04);mb.pop();
    mb.fin(0,0);mb.sphere(0,2.02,.2,.035,hex('#fff2c8'),4,1);
    /* sawhorses with a plank, paint cans, a toolbox */
    for(const zz of [.9,1.7]){mb.fin(.15,0);mb.box(-.85,.62,zz,.62,.05,.06,pine);for(const sx of [-1,1])for(const dz of [-1,1])mb.tube([-.85+sx*.26,.6,zz],[-.85+sx*.3,0,zz+dz*.16],.016,pine);}
    mb.box(-.85,.67,1.3,.24,.03,1.1,pine);
    for(const [x,z,c] of [[.55,.7,'#7a3cff'],[.7,.85,'#ff2f9a'],[.48,.95,'#2fe6ff']]){mb.fin(.6,1);mb.cyl(x,0,z,.09,.2,14,steel);mb.fin(.2,0);mb.cyl(x,.2,z,.092,.012,14,hex(c));}
    mb.fin(.5,0);mb.box(-.85,.78,1.0,.4,.16,.2,hex('#c8302a'));mb.box(-.85,.88,1.0,.2,.03,.04,dark);
    neon2(mb,'NEXT UP',[0,2.3,-.1],[1,0,0],.026,hex('#ffd23f'),4);
    mb.pop();
    const p0=xf(T,-.5,0,-.45),p1=xf(T,.5,0,.4);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
    const q0=xf(T,-1.2,0,.75),q1=xf(T,-.5,0,1.9);block(Math.min(q0[0],q1[0]),Math.max(q0[0],q1[0]),Math.min(q0[2],q1[2]),Math.max(q0[2],q1[2]));
  });
  const lp=xf(T,0,1.8,.6);const L=lightAt(lp[0],lp[1],lp[2],3.4,[1,.82,.55],.95);L.hz=.6;
}

/* ---------- the workbench under its pegboard ---------- */
function Workbench(o){
  const T=chain(mT(o.x,0,o.z),mRY(o.ry||0));
  Decor(mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const top=hex('#7a5232'),leg=hex('#3a3440'),steel=hex('#8a8a96');
    mb.fin(.3,0);mb.box(0,.9,0,2.4,.06,.7,top);for(const sx of [-1.12,1.12])for(const sz of [-.3,.3])mb.box(sx,.45,sz,.06,.9,.06,leg);mb.box(0,.25,-.3,2.24,.04,.04,leg);
    /* a laptop, open, building something */
    mb.fin(.5,1);mb.box(-.45,.94,.05,.42,.02,.28,hex('#2a2a34'));
    mb.push();mb.tr(-.45,.95,-.09);mb.rx(-.25);mb.box(0,.14,0,.42,.28,.015,hex('#2a2a34'));mb.pop();
    /* a lamp, a mug, a stack of cards */
    mb.fin(.7,1);mb.cyl(.7,.93,-.15,.06,.02,12,steel);mb.tube([.7,.95,-.15],[.62,1.35,-.05],.01,steel);mb.tube([.62,1.35,-.05],[.5,1.3,.05],.01,steel);
    mb.cyl(.5,1.22,.05,.05,.08,12,steel,0,.02);mb.fin(0,0);mb.sphere(.5,1.22,.06,.02,hex('#fff0c8'),4,0);
    mb.fin(.3,0);mb.cyl(.25,.93,.12,.04,.1,12,hex('#ff2f9a'));
    for(let i=0;i<4;i++){mb.box(.0+i*.01,.935+i*.008,.15,.16,.008,.1,hex(['#ffd23f','#2fe6ff','#b47aff','#ff7a2e'][i]));}
    mb.pop();
    /* the laptop's screen: a build going */
    const scr=canvasTex(256,160,(g,w,h)=>{g.fillStyle='#04060a';g.fillRect(0,0,w,h);g.font='bold 13px monospace';
      const L=['$ python3 build.py','  m0_room ......... ok','  m4_floor ........ ok','  shaders ......... ok','  cabinets ........ 3/5','  ▌'];L.forEach((s,i)=>{g.fillStyle=i===0?'#ffd23f':'#6dff7a';g.fillText(s,10,22+i*22);});});
    const st=chain(T,mT(-.45,.95,-.09),mRX(-.25));texQuad(st,[[-.19,.02,.009],[.19,.02,.009],[.19,.26,.009],[-.19,.26,.009]],scr,1.6);
    /* the pegboard behind it, with tools hung on it */
    const peg=canvasTex(512,256,(g,w,h)=>{g.fillStyle='#9a7a52';g.fillRect(0,0,w,h);g.fillStyle='rgba(40,26,14,.55)';for(let y=8;y<h;y+=16)for(let x=8;x<w;x+=16){g.beginPath();g.arc(x,y,2.2,0,TAU);g.fill();}
      g.fillStyle='#2a2a34';g.strokeStyle='#2a2a34';g.lineWidth=7;g.lineCap='round';
      g.beginPath();g.moveTo(60,50);g.lineTo(60,180);g.stroke();g.fillRect(36,40,48,22);                       // a hammer
      g.beginPath();g.moveTo(140,40);g.lineTo(140,190);g.stroke();g.beginPath();g.arc(140,40,14,0,TAU);g.stroke();  // a wrench
      g.fillStyle='#c8302a';g.fillRect(205,40,16,60);g.fillStyle='#8a8a96';g.fillRect(210,100,6,90);              // a screwdriver
      g.fillStyle='#8a8a96';g.beginPath();g.moveTo(270,60);g.lineTo(400,60);g.lineTo(400,110);g.lineTo(290,95);g.closePath();g.fill();g.fillStyle='#5a3218';g.fillRect(400,50,40,70); // a saw
      g.strokeStyle='#d8a020';g.lineWidth=5;g.beginPath();g.arc(470,120,30,0,TAU);g.stroke();                       // a coil of cable
      g.fillStyle='#2fe6ff';g.fillRect(300,170,90,10);g.fillStyle='#ffd23f';g.fillRect(300,190,60,10);});            // tape
    texQuad(T,[[-1.2,1.2,-.34],[1.2,1.2,-.34],[1.2,2.4,-.34],[-1.2,2.4,-.34]],peg,.55);
  });
  const lp=xf(T,.5,1.1,.2);lightAt(lp[0],lp[1],lp[2],2.6,[1,.85,.6],.7);
}

/* ---------- Ironhowl: the Howler, kneeling, its chest hatch open ----------
   A mech knelt down so its pilot can climb in: one knee on the ground, its cannon arm resting on the floor,
   missile pods on its shoulder. The chest hatch is swung up; inside are the seat, the sticks, and the
   cockpit's screens, the main one straight ahead. Its face looks out over the room. */
function segBox(mb,a,b,w,d,col,e=0){const v=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(...v),hz=Math.hypot(v[0],v[2]);
  mb.push();mb.tr((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);mb.ry(Math.atan2(v[0],v[2]||1e-6));mb.rx(Math.acos(clamp(v[1]/L,-1,1)));mb.box(0,0,0,w,L,d,col,e);mb.pop();}
function MechCockpit(o){
  const a=Machine(Object.assign({useZ:1.65},o)),T=a.T;
  const SY=1.36,SW=.96,SH=.54,SZ=-.6;
  a.addScreen(o.game.id||'ironhowl',o.res||[384,216],[0,SY,SZ],0,SW,SH,{gain:2.4,col:'#ff9a3a'});
  const beacon=[],embers=[];
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const arm=hex('#565a66'),arm2=hex('#3a3d46'),joint=hex('#1e2026'),orange=hex('#ff7a2e'),amber=hex('#ffb040'),steel=hex('#8a8e9a'),seat=hex('#1c1c22');
    /* the cockpit pod: floor, back, sides and roof, a sill and a frame round the open front */
    mb.fin(.55,1);mb.box(0,.5,-.1,1.5,.1,1.3,arm2);mb.box(0,1.25,-.72,1.5,1.5,.1,arm);
    for(const sx of [-1,1]){mb.box(sx*.72,1.25,-.1,.1,1.5,1.3,arm);
      /* angled armour on the flanks */
      mb.push();mb.tr(sx*.8,1.3,-.05);mb.rz(sx*.18);mb.box(0,0,0,.06,1.1,1.1,arm2);mb.pop();}
    mb.box(0,1.98,-.1,1.5,.1,1.3,arm);
    mb.box(0,.69,.5,1.5,.36,.14,arm2);for(const sx of [-1,1])mb.box(sx*.68,1.32,.5,.14,1.3,.14,arm);mb.box(0,1.9,.5,1.5,.18,.16,arm);
    /* the hatch, swung up on its hinge, lit underneath */
    mb.push();mb.tr(0,1.99,.58);mb.rx(-1.12);mb.fin(.6,1);mb.box(0,0,.44,1.32,.08,.88,arm);mb.box(0,.05,.44,1.0,.03,.6,arm2);
      mb.fin(0,0);mb.box(0,-.045,.44,1.0,.01,.04,amber,2.6);mb.box(0,-.045,.8,1.2,.01,.03,orange,2.2);mb.pop();
    /* inside: the seat facing the screen, two sticks, side consoles */
    mb.fin(.3,0);mb.box(0,.62,-.08,.52,.12,.5,seat);mb.push();mb.tr(0,.98,.2);mb.rx(.12);mb.box(0,0,0,.52,.66,.1,seat);mb.box(0,.42,0,.3,.18,.1,seat);mb.pop();
    mb.fin(0,0);mb.box(0,.69,-.08,.4,.005,.4,orange,.6);
    for(const sx of [-1,1]){const x=sx*.38;mb.fin(.6,1);mb.box(x,.72,-.3,.18,.36,.3,arm2);mb.cyl(x,.9,-.32,.035,.04,10,joint);
      mb.tube([x,.92,-.32],[x,1.08,-.36],.016,steel);mb.fin(.3,0);mb.box(x,1.12,-.37,.06,.12,.06,seat);mb.fin(0,0);mb.sphere(x,1.19,-.36,.016,hex('#ff3030'),3,0);
      for(let k=0;k<3;k++)mb.box(x+sx*.04-.04+k*.04,.905,-.22,.025,.01,.025,[hex('#ffd23f'),hex('#6dff7a'),hex('#2fe6ff')][k],2.4);}
    /* the mech's face over the hatch: a sensor head with a glowing visor and an antenna */
    mb.fin(.55,1);mb.box(0,2.16,.12,.56,.26,.44,arm);mb.box(0,2.16,.35,.6,.18,.06,arm2);
    mb.fin(0,0);mb.box(0,2.17,.385,.46,.05,.01,amber,3.6);
    mb.fin(.8,1);mb.tube([.2,2.29,0],[.26,2.62,-.06],.008,steel);mb.fin(0,0);beacon.push([.26,2.64,-.06]);
    /* shoulders: a big plate each side, a missile pod on the right */
    for(const sx of [-1,1]){mb.fin(.55,1);mb.box(sx*.98,1.95,-.15,.46,.32,.74,arm);mb.box(sx*.98,2.12,-.15,.4,.06,.66,arm2);mb.fin(0,0);mb.box(sx*.98,1.95,.225,.42,.04,.01,orange,1.6);}
    mb.fin(.5,1);mb.box(1.02,2.32,-.2,.4,.3,.5,arm2);
    for(let i=0;i<3;i++)for(let j=0;j<2;j++){zCyl(mb,.9+i*.12,2.27+j*.11,.04,.06,.04,joint,0,10);mb.fin(0,0);zCyl(mb,.9+i*.12,2.27+j*.11,.055,.062,.022,orange,2.4,10);mb.fin(.5,1);}
    /* arms: the left one lets its cannon rest on the floor, the right one rests on the raised knee */
    mb.fin(.55,1);segBox(mb,[-1.0,1.8,-.15],[-1.12,1.2,.12],.24,.26,arm2);mb.sphere(-1.12,1.2,.12,.13,joint,0,1);
    segBox(mb,[-1.12,1.2,.12],[-1.18,.34,.86],.28,.28,arm);mb.fin(.7,1);zCyl(mb,-1.18,.3,.86,1.2,.07,steel,0,12);mb.fin(0,0);zCyl(mb,-1.18,.3,1.19,1.205,.06,orange,1.6,12);
    mb.fin(.55,1);segBox(mb,[1.0,1.8,-.15],[1.14,1.28,.18],.24,.26,arm2);mb.sphere(1.14,1.28,.18,.13,joint,0,1);segBox(mb,[1.14,1.28,.18],[1.02,1.12,.62],.24,.24,arm);mb.box(1.02,1.1,.7,.22,.2,.2,arm2);
    /* legs: the left knee down on the floor, the right knee up with its foot planted */
    segBox(mb,[-.92,.9,-.35],[-.96,.26,.5],.34,.38,arm);mb.sphere(-.96,.26,.52,.17,joint,0,1);segBox(mb,[-.96,.24,.5],[-.96,.2,-.6],.3,.28,arm2);mb.box(-.96,.12,-.74,.34,.24,.32,arm);
    segBox(mb,[.92,.9,-.35],[.98,1.0,.55],.34,.38,arm);mb.sphere(.98,1.0,.57,.17,joint,0,1);segBox(mb,[.98,1.0,.57],[.98,.22,.7],.3,.3,arm2);mb.box(.98,.11,.82,.46,.22,.62,arm);
    mb.fin(0,0);mb.box(.98,.06,1.135,.42,.05,.01,orange,1.2);
    /* exhausts on the back, glowing */
    for(const sx of [-.35,.35]){mb.fin(.6,1);zCyl(mb,sx,1.7,-.95,-.77,.1,joint,0,12);mb.fin(0,0);zCyl(mb,sx,1.7,-.955,-.94,.075,orange,3,12);embers.push([sx,1.7,-1.0]);}
    mb.pop();
    /* hazard stripes on the sill and the toe, the name stencilled on the flank */
    const haz=canvasTex(256,32,(g,w,h)=>{g.fillStyle='#111';g.fillRect(0,0,w,h);g.fillStyle='#ff7a2e';for(let x=-h;x<w;x+=28){g.beginPath();g.moveTo(x,h);g.lineTo(x+14,h);g.lineTo(x+14+h,0);g.lineTo(x+h,0);g.closePath();g.fill();}});
    texQuad(T,[[-.74,.54,.572],[.74,.54,.572],[.74,.66,.572],[-.74,.66,.572]],haz,.9);
    const sten=canvasTex(512,128,(g,w,h)=>{g.fillStyle='#3a3d46';g.fillRect(0,0,w,h);g.fillStyle='#e8e4dc';g.font='bold 64px Impact,"Arial Black",sans-serif';g.textAlign='center';g.fillText('IRONHOWL',w/2,72);
      g.font='bold 26px monospace';g.fillStyle='#ff7a2e';g.fillText('HOWLER  ·  IH-01',w/2,110);});
    texQuad(T,[[-.775,1.1,.45],[-.775,1.1,-.65],[-.775,1.38,-.65],[-.775,1.38,.45]],sten,1.0);
    texQuad(T,[[.775,1.1,-.65],[.775,1.1,.45],[.775,1.38,.45],[.775,1.38,-.65]],sten,1.0);
    /* the cockpit's side screens: radar on one, the mech's status on the other */
    const radar=canvasTex(160,160,(g,w,h)=>{g.fillStyle='#050302';g.fillRect(0,0,w,h);g.strokeStyle='#ff9a3a';g.lineWidth=2;for(const r of [20,42,64]){g.beginPath();g.arc(80,80,r,0,TAU);g.stroke();}
      g.beginPath();g.moveTo(80,80);g.lineTo(140,40);g.stroke();g.fillStyle='#ff3030';for(const [x,y] of [[110,60],[50,110],[120,120]]){g.fillRect(x-3,y-3,6,6);}g.fillStyle='#ffd23f';g.fillRect(77,77,6,6);});
    const stat=canvasTex(160,160,(g,w,h)=>{g.fillStyle='#050302';g.fillRect(0,0,w,h);g.fillStyle='#ff9a3a';g.font='bold 14px monospace';
      ['HULL','HEAT','AMMO','CORE'].forEach((s,i)=>{g.fillText(s,10,28+i*34);g.fillRect(64,16+i*34,[80,46,64,90][i],12);});});
    const sideScr=(sx,tex)=>{const ST=chain(T,mT(sx*.6,1.2,-.38),mRY(sx*-.95));texQuad(ST,[[-.17,-.14,0],[.17,-.14,0],[.17,.2,0],[-.17,.2,0]],tex,1.5);};
    sideScr(-1,radar);sideScr(1,stat);
    const p0=a.W(-1.4,0,-1.05),p1=a.W(1.4,0,1.25);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
    /* a red beacon blinking on the antenna, embers drifting off the exhausts */
    const BW=beacon.map(p=>a.W(...p));Glints(1,'#ff3030',.02,()=>BW[0],(i,t)=>(t%1.2)<.18?4:.2);
    const EW=embers.map(p=>a.W(...p));
    Glints(10,'#ff8a3a',.009,(i,t)=>{const k=(t*.35+i/10)%1,b=EW[i%2];return [b[0]+Math.sin(i*3.1+t)*.05,b[1]+k*.9,b[2]+Math.cos(i*2.3)*.05];},(i,t)=>{const k=(t*.35+i/10)%1;return 2.6*(1-k);});
  };
  const ip=a.W(0,1.5,0),inner=lightAt(ip[0],1.5,ip[2],2.4,[1,.55,.2],.9);
  const vp=a.W(0,2.1,1.0);lightAt(vp[0],2.1,vp[2],2.6,[1,.7,.3],.6);
  const lp=a.W(0,.4,1.4);lightAt(lp[0],.5,lp[2],2.6,[1,.4,.15],.55);
  a.onIdle=()=>{inner.k=.85+.08*Math.sin(W_.t*2.2);};
  return a;
}

/* ---------- Redline County: the front half of the stock SUV ----------
   The Stock build from the game: warm grey paint, the chrome twin-bar face, six-spoke wheels on
   all-season tyres, roof rails with crossbars, mud up the sides from a day out. It's cut off behind
   the front seats and sits on jack stands on a patch of the game's own tyre-tracked dirt, with hay
   bales and a low sign out front. Climb into the driver's seat: the windshield is the screen. */
function texAt(url,cb){const im=new Image();im.onload=()=>cb(texFrom(im,false));im.src=url;}
function RedlineSUV(o){
  const a=Machine(Object.assign({useZ:1.55},o)),T=a.T,B=.06;
  const SC=[0,1.51+B,-.13],ST=.62,SW=1.4,SH=.7875;
  a.addScreen(o.game.id||'redlinecounty',o.res||[320,180],SC,ST,SW,SH,{gain:2.3,col:'#ff4fa0'});
  a.cam=()=>({eye:a.W(0,1.36+B,1.05),tgt:a.W(0,1.5+B,-.13),fov:52});
  /* surfaces with the game's own textures: lit, not glowing */
  const lit=(pts,url)=>{const m=new MB();m.m=mmul(m.m,T);m.quad(pts[0],pts[1],pts[2],pts[3],[1,1,1],0,QUV);const e={mesh:mesh(m),tex:null,mode:2,emi:1};texAt(ROOT+url,t=>{e.tex=t;TEXMESH.push(e);});};
  a.build=mb=>{
    const paint=hex('#6a625b'),clad=hex('#3a3a3d'),blk=hex('#121214'),chrome=CHROME,rubber=hex('#151517'),rim=hex('#b8bcc2'),red=hex('#8a1c1c'),wood=hex('#5a3a22');
    mb.push();mb.m=mmul(mb.m,T);
    /* the patch of ground: a low timber-edged plinth */
    mb.fin(.2,0);mb.box(0,B/2,-.35,3.5,B,4.5,wood);
    mb.push();mb.tr(0,B,0);
    /* the body: lower panels, the front fascia and bumper, the hood */
    mb.fin(.55,0);mb.box(0,.74,-.55,1.84,.72,2.7,paint);
    mb.fin(.3,0);mb.box(0,.56,-1.97,1.84,.36,.18,clad);mb.box(0,.4,-1.9,1.6,.1,.3,blk);
    mb.fin(.6,1);mb.box(0,.93,-1.935,1.46,.3,.05,blk);
    for(const y of [1.0,.87])mb.tube([-.56,y,-1.965],[.56,y,-1.965],.026,chrome,0,8);
    mb.sphere(0,.935,-1.97,.04,chrome,0,1);
    mb.fin(0,0);for(const sx of [-1,1]){mb.box(sx*.67,.94,-1.955,.3,.14,.03,hex('#eaf2ff'),3.2);mb.box(sx*.67,.82,-1.955,.3,.05,.03,hex('#ffb040'),2.2);mb.box(sx*.58,.5,-2.07,.14,.08,.02,hex('#fff4d8'),2.6);}
    mb.fin(.55,0);mb.push();mb.tr(0,1.13,-1.17);mb.rx(-.05);mb.box(0,0,0,1.8,.06,1.58,paint);mb.pop();
    mb.box(0,1.16,-.38,1.8,.06,.12,paint);
    /* fender flares, the wheels: all-seasons on factory six-spokes */
    for(const sx of [-1,1]){mb.fin(.3,0);mb.box(sx*.935,.84,-1.35,.07,.3,1.02,clad);
      const x=sx*.86,y=.42,z=-1.35;mb.fin(.15,0);mb.push();mb.tr(x,y,z);mb.rz(Math.PI/2);mb.cyl(0,-.15,0,.42,.3,22,rubber);mb.pop();
      const fx=x+sx*.152;mb.fin(.85,1);mb.push();mb.tr(fx,y,z);mb.rz(Math.PI/2);mb.cyl(0,-.01,0,.26,.02,20,rim);mb.pop();
      for(let k=0;k<6;k++){mb.push();mb.tr(fx+sx*.006,y,z);mb.rx(k/6*TAU);mb.box(0,.13,0,.02,.2,.05,rim);mb.pop();}
      mb.push();mb.tr(fx+sx*.012,y,z);mb.rz(Math.PI/2);mb.cyl(0,-.02,0,.06,.04,12,hex('#5a5c62'));mb.pop();}
    /* the cabin: A-pillars, roof, roof rails and crossbars, B-pillars at the cut, mirrors, a chrome beltline */
    mb.fin(.55,0);for(const sx of [-1,1]){segBox(mb,[sx*.86,1.16,-.38],[sx*.8,1.86,.12],.07,.07,paint);segBox(mb,[sx*.89,1.1,.8],[sx*.82,1.86,.8],.08,.1,paint);
      mb.box(sx*1.0,1.22,-.28,.14,.12,.08,blk);mb.fin(.85,1);mb.tube([sx*.925,1.11,-.38],[sx*.925,1.11,.8],.01,chrome,0,6);mb.fin(.55,0);}
    mb.box(0,1.88,.46,1.68,.06,.72,paint);
    mb.fin(.5,1);for(const sx of [-1,1])mb.tube([sx*.7,1.96,.14],[sx*.7,1.96,.8],.014,blk,0,6);for(const z of [.3,.68])mb.tube([-.72,1.98,z],[.72,1.98,z],.012,blk,0,6);
    /* the cut: a clean black panel where the rest of the truck would be */
    mb.fin(.3,0);mb.box(0,.74,.815,1.84,.72,.03,blk);
    /* inside: the dash, the wheel, two buckets, the console and shifter */
    mb.fin(.3,0);mb.box(0,1.0,-.28,1.7,.22,.3,hex('#1c1b1e'));mb.box(0,.5,.15,1.7,.04,1.3,hex('#141416'));
    {const c=[-.42,1.1,.02],pts=[];for(let i=0;i<24;i++){const t=i/24*TAU;pts.push([Math.cos(t)*.19,Math.sin(t)*.19,0]);}
      mb.push();mb.tr(...c);mb.rx(-.5);mb.fin(.2,0);polyTube(mb,pts,.022,blk,0,true);for(const t of [0,2.1,4.2])mb.tube([0,0,0],[Math.cos(t+.5)*.19,Math.sin(t+.5)*.19,0],.018,blk);mb.sphere(0,0,0,.05,blk,0,1);mb.pop();
      mb.tube([-.42,1.05,-.15],[-.42,1.1,.0],.03,blk);}
    for(const sx of [-1,1]){const x=sx*.42;mb.fin(.25,0);mb.box(x,.66,.42,.52,.14,.5,hex('#2a2828'));mb.push();mb.tr(x,1.0,.7);mb.rx(-.12);mb.box(0,0,0,.52,.66,.1,hex('#2a2828'));mb.box(0,.44,0,.28,.18,.1,hex('#2a2828'));mb.pop();}
    mb.box(0,.66,.18,.26,.22,.6,hex('#1c1b1e'));mb.fin(.8,1);mb.tube([0,.78,.1],[0,.98,.06],.012,chrome);mb.sphere(0,.99,.06,.03,blk,0,1);
    /* jack stands under the cut, a cone, hay bales */
    mb.fin(.5,1);for(const sx of [-1,1]){segBox(mb,[sx*.6,0,.7],[sx*.6,.38,.7],.08,.08,red);mb.box(sx*.6,.02,.7,.28,.04,.28,red);}
    mb.fin(.3,0);mb.cyl(1.35,0,1.25,.14,.42,12,hex('#ff6a1e'),0,.02);mb.box(1.35,.01,1.25,.32,.02,.32,hex('#ff6a1e'));
    mb.pop();mb.pop();
    /* the game's textures: tyre-tracked dirt on the ground, mud up the truck, hay */
    const y=B+.002;lit([[-1.74,y,1.9],[1.74,y,1.9],[1.74,y,-2.6],[-1.74,y,-2.6]],'art/rc/tracks.webp');
    for(const sx of [-1,1]){const x=sx*.922,yb=.38+B,yt=.82+B;lit(sx<0?[[x,yb,.8],[x,yb,-1.9],[x,yt,-1.9],[x,yt,.8]]:[[x,yb,-1.9],[x,yb,.8],[x,yt,.8],[x,yt,-1.9]],'art/rc/mud.webp');}
    const bale=(x,yy,z,ry)=>{const BT=chain(T,mT(x,yy,z),mRY(ry)),hw=.45,hh=.2,hd=.25,P=(a,b,c)=>[a*hw,b*hh+hh,c*hd];
      const faces=[[P(-1,-1,1),P(1,-1,1),P(1,1,1),P(-1,1,1)],[P(1,-1,-1),P(-1,-1,-1),P(-1,1,-1),P(1,1,-1)],[P(-1,1,1),P(1,1,1),P(1,1,-1),P(-1,1,-1)],[P(1,-1,1),P(1,-1,-1),P(1,1,-1),P(1,1,1)],[P(-1,-1,-1),P(-1,-1,1),P(-1,1,1),P(-1,1,-1)]];
      for(const f of faces){const m=new MB();m.m=mmul(m.m,BT);m.quad(f[0],f[1],f[2],f[3],[1,1,1],0,QUV);const e={mesh:mesh(m),tex:null,mode:2,emi:1};texAt(ROOT+'art/rc/hay.webp',t=>{e.tex=t;TEXMESH.push(e);});}};
    bale(-1.25,B,-2.0,.3);bale(-1.3,B,-1.4,-.2);bale(-1.28,B+.4,-1.7,.1);bale(1.3,B,.9,.5);
    /* tinted glass on the outside of the windshield, so from the front you see glass, not the back of the screen */
    {const tint=canvasTex(4,64,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1a1c26');gr.addColorStop(.5,'#08090d');gr.addColorStop(1,'#14161e');g.fillStyle=gr;g.fillRect(0,0,w,h);});
      const GT=chain(T,mT(SC[0],SC[1],SC[2]),mRX(ST));texQuad(GT,[[-SW/2-.03,-SH/2-.03,-.014],[SW/2+.03,-SH/2-.03,-.014],[SW/2+.03,SH/2+.03,-.014],[-SW/2-.03,SH/2+.03,-.014]],tint,.6);}
    /* a low timber sign in front of the bumper, the game's name in its pink neon */
    {mb.push();mb.m=mmul(mb.m,T);mb.fin(.2,0);mb.box(0,.5+B,-2.42,2.5,.46,.06,hex('#3a2616'));for(const sx of [-1.15,1.15])mb.box(sx,.36+B,-2.42,.08,.72,.08,hex('#5a3a22'));
      neon2(mb,'REDLINE COUNTY',[0,.56+B,-2.46],[-1,0,0],.026,hex('#ff3fa0'),4.4);neon2(mb,'ROAD NOT FOUND + SALT AND SAND',[0,.37+B,-2.46],[-1,0,0],.011,hex('#ffb24a'),3.6);mb.pop();}
    const p0=a.W(-1.1,0,-2.7),p1=a.W(1.1,0,.9);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
    const q0=a.W(-1.8,0,-2.55),q1=a.W(1.3,0,-2.3);block(Math.min(q0[0],q1[0]),Math.max(q0[0],q1[0]),Math.min(q0[2],q1[2]),Math.max(q0[2],q1[2]));
    /* the headlights throw two beams onto the barn wall */
    for(const sx of [-1,1]){const hp=a.W(sx*.67,.94+B,-1.99),hq=a.W(sx*.95,0,-4.6);beamAt(hp,[hq[0]-hp[0],hq[1]-hp[1],hq[2]-hp[2]],13,2.8,[.85,.9,1],.45);}
  };
  const hl=a.W(0,.5,-3.2);lightAt(hl[0],.5,hl[2],2.6,[.85,.9,1],.8);
  const dp=a.W(-.3,1.25,.2),dash=lightAt(dp[0],1.25,dp[2],1.6,[1,.6,.3],.55);
  const sp=a.W(0,2.9,-.6);lightAt(sp[0],2.9,sp[2],5,[1,.88,.7],.75);
  const np=a.W(0,.9,-2.9);lightAt(np[0],.9,np[2],2.2,[1,.3,.6],.5);
  a.onIdle=()=>{dash.k=.5+.05*Math.sin(W_.t*2.1);};
  return a;
}
