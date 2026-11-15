/* =====================================================================================
   THE UPGRADES' CABINETS: one for each game being rebuilt in V2, each built like its game.
   Every one plays the games straight from the main arcade's site, so it's always the newest build,
   and offers the new version(s) and the Retro 2D original.
   - BowlLane: Strike Night, a short blacklight lane with real pins and a ball return
   - ClawDeluxe: Plush Panic, a tall candy-pink claw machine full of plushes
   - ForgeMolten: Molten, a brick forge with a glowing mouth, a crucible pouring, an anvil, ice creeping in
   - VersusCab: Voltfist, two cabinets back to back with a championship belt on top
   - LanceFighter: Voidlance, a starfighter's cockpit on a docking cradle, its lance nose pointed at the wall
   - HoverBike: Prisma, a hover-bike floating over a glowing pad, light trails behind, rain falling
   - Lamppost: Lantern, an iron street lamp on cobbles, moths round the flame, the screen on its notice board
   ===================================================================================== */
function litQuad(T,pts,src,emi,mode){const m=new MB();m.m=mmul(m.m,T);m.quad(pts[0],pts[1],pts[2],pts[3],[1,1,1],0,QUV);const e={mesh:mesh(m),tex:null,mode:mode??2,emi:emi??1};
  if(typeof src==='string')texAt(ROOT+src,t=>{e.tex=t;TEXMESH.push(e);});else{e.tex=src;TEXMESH.push(e);}return e;}
function footprint(a,x0,z0,x1,z1){const p=a.W(x0,0,z0),q=a.W(x1,0,z1);block(Math.min(p[0],q[0]),Math.max(p[0],q[0]),Math.min(p[2],q[2]),Math.max(p[2],q[2]));}
function ring(mb,c,r,axis,col,e,tr=.012,n=28){const P=[];for(let i=0;i<n;i++){const t=i/n*TAU,u=Math.cos(t)*r,v=Math.sin(t)*r;P.push(axis==='y'?[c[0]+u,c[1],c[2]+v]:axis==='z'?[c[0]+u,c[1]+v,c[2]]:[c[0],c[1]+u,c[2]+v]);}polyTube(mb,P,tr,col,e,true);}

/* ---------- Strike Night: a short blacklight lane ---------- */
function BowlLane(o){
  const a=Machine(Object.assign({useZ:.75},o)),T=a.T,L=4.0;
  a.addScreen(o.game.id,o.res||[320,180],[0,2.08,-L+.1],0,.92,.5175,{gain:2.3,col:'#ff4fd8'});
  a.cam=()=>({eye:a.W(0,1.62,1.0),tgt:a.W(0,1.2,-L+.3),fov:46});
  const lane=canvasTex(128,1024,(g,w,h)=>{g.fillStyle='#0a0820';g.fillRect(0,0,w,h);
    for(let x=0;x<w;x+=8){g.fillStyle=x%16?'#100c2a':'#0d0a24';g.fillRect(x,0,7,h);}
    const tri=(x,y,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(x,y-14);g.lineTo(x+7,y+6);g.lineTo(x-7,y+6);g.closePath();g.fill();};
    [16,36,56,76,96,116].forEach((x,i)=>tri(x,h*.62+Math.abs(i-2.5)*14,i%2?'#ff3fd8':'#2fe6ff'));
    for(const x of [24,44,64,84,104])for(const y of [h*.9,h*.94]){g.fillStyle='#ffd23f';g.beginPath();g.arc(x,y,2.6,0,TAU);g.fill();}
    for(let i=0;i<60;i++){g.fillStyle='rgba(180,120,255,'+(Math.random()*.25)+')';g.fillRect(Math.random()*w,Math.random()*h*.55,2,2);}
    g.fillStyle='#2fe6ff';g.fillRect(0,h-6,w,3);});
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const dark=hex('#0c0a16'),deck=hex('#e8dcc4'),pin=hex('#f4f2ee'),pink=hex('#ff3fd8'),cyan=hex('#2fe6ff');
    mb.fin(.4,0);mb.box(0,.2,-L/2,1.36,.4,L+.1,dark);
    for(const sx of [-1,1]){mb.box(sx*.5,.39,-L/2+.2,.1,.02,L-.4,hex('#06050c'));mb.box(sx*.64,.55,-L/2,.06,.3,L+.1,hex('#160f2a'));
      mb.fin(0,0);mb.tube([sx*.61,.71,-L],[sx*.61,.71,0],.008,sx<0?pink:cyan,3);mb.fin(.4,0);}
    /* the pin deck, ten pins */
    mb.fin(.5,0);mb.box(0,.405,-L+.3,.88,.01,.5,deck);
    for(let r=0;r<4;r++)for(let k=0;k<=r;k++){const x=(k-r/2)*.11,z=-L+.5-r*.1;mb.fin(.55,0);mb.cyl(x,.41,z,.028,.15,10,pin,.25);mb.sphere(x,.585,z,.024,pin,.25,1);mb.fin(0,0);mb.cyl(x,.5,z,.03,.02,10,hex('#ff2a4a'),1.2);}
    /* the masking unit over the deck, the scoreboard above it */
    mb.fin(.4,0);mb.box(0,1.25,-L+.02,1.36,.9,.1,hex('#140a24'));mb.box(0,2.08,-L+.04,1.06,.66,.06,hex('#07050c'));
    mb.fin(.85,1);for(const sx of [-1,1])mb.tube([sx*.53,1.75,-L+.08],[sx*.53,2.41,-L+.08],.015,CHROME,0,6);
    neon2(mb,'STRIKE NIGHT',[0,1.2,-L+.08],[1,0,0],.026,pink,4.2);
    /* the ball return, three balls on its rails */
    mb.fin(.5,1);mb.box(.86,.42,-.75,.32,.32,1.1,hex('#1a1230'));mb.tube([.78,.62,-1.25],[.78,.62,-.2],.012,CHROME,0,6);mb.tube([.94,.62,-1.25],[.94,.62,-.2],.012,CHROME,0,6);
    mb.fin(.95,0);[['#8a3cff',-.35],['#2fe6ff',-.6],['#ff6a2e',-.85]].forEach(([c,z])=>mb.sphere(.86,.72,z,.105,hex(c),.35,2));
    /* the approach: a step, the foul line lit */
    mb.fin(.3,0);mb.box(0,.03,.4,1.36,.06,.8,hex('#1a1426'));mb.fin(0,0);mb.box(0,.065,.02,1.3,.006,.025,cyan,3);
    mb.pop();
    litQuad(T,[[-.44,.403,0],[.44,.403,0],[.44,.403,-L+.55],[-.44,.403,-L+.55]],lane,.85,3);
    footprint(a,-.75,-L-.1,1.05,.05);
  };
  const lp=a.W(0,1.6,-L/2);lightAt(lp[0],1.6,lp[2],3.2,[.55,.3,1],.7);const dp=a.W(0,1.0,-L+.8);lightAt(dp[0],1.0,dp[2],1.8,[1,.95,.9],.7);
  return a;
}

/* ---------- Plush Panic: a tall candy-pink claw machine ---------- */
function ClawDeluxe(o){
  const a=Machine(Object.assign({useZ:1.15},o)),T=a.T;
  a.addScreen(o.game.id,o.res||[320,180],[0,.58,.612],-.1,.46,.259,{gain:2.2,col:'#ff8ad8'});
  a.cam=()=>({eye:a.W(0,1.72,1.5),tgt:a.W(0,1.25,0),fov:48});
  const bulbs=[];
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const pink=hex('#ff4fa0'),pink2=hex('#ffb0d8'),white=hex('#fff4fa'),chrome=CHROME;
    /* the base, candy-striped */
    mb.fin(.55,0);roundSlab(mb,0,.46,1.24,.92,.08,-.6,.6,pink);
    /* the glass case: chrome corners and rails, the prize bed, a chute */
    mb.fin(.9,1);for(const sx of [-1,1])for(const sz of [-1,1])mb.tube([sx*.6,.92,sz*.6],[sx*.6,2.1,sz*.6],.022,chrome,0,8);
    for(const y of [.93,2.1]){mb.tube([-.6,y,.6],[.6,y,.6],.018,chrome,0,6);mb.tube([-.6,y,-.6],[.6,y,-.6],.018,chrome,0,6);mb.tube([-.6,y,-.6],[-.6,y,.6],.018,chrome,0,6);mb.tube([.6,y,-.6],[.6,y,.6],.018,chrome,0,6);}
    mb.fin(0,0);for(const sx of [-1,1])mb.box(sx*.35,1.5,.605,.012,1.0,.004,white,.9);   // glints on the glass
    mb.fin(.3,0);mb.box(0,.93,0,1.18,.02,1.18,hex('#3a1440'));mb.fin(.6,1);mb.box(-.38,1.02,.38,.36,.18,.36,hex('#e8e8f0'));
    /* plushes piled on the bed: soft round bodies, some with ears */
    let sd=11;const R=()=>(sd=(sd*16807)%2147483647)/2147483647;const PC=['#ffd23f','#7ad8ff','#b47aff','#ff8a5a','#8aff9a','#ff6ab8','#fff0c8'];
    for(let i=0;i<26;i++){const x=(R()-.5)*1.0,z=(R()-.5)*1.0;if(x<-.15&&z>.15)continue;const r=.07+R()*.05,c=hex(PC[i%PC.length]),y=.96+r+(R()<.35?.08:0);
      mb.fin(.05,0);mb.sphere(x,y,z,r,c,0,2,.92);if(R()<.6){mb.sphere(x-r*.6,y+r*.85,z,r*.35,c,0,1);mb.sphere(x+r*.6,y+r*.85,z,r*.35,c,0,1);}
      mb.fin(.6,0);mb.sphere(x-r*.32,y+r*.2,z+r*.88,r*.11,hex('#141018'),0,1);mb.sphere(x+r*.32,y+r*.2,z+r*.88,r*.11,hex('#141018'),0,1);}
    /* the claw on its gantry */
    mb.fin(.85,1);mb.tube([-.58,2.04,-.1],[.58,2.04,-.1],.014,chrome,0,6);mb.tube([-.58,2.04,.1],[.58,2.04,.1],.014,chrome,0,6);
    mb.box(.12,2.0,0,.14,.08,.24,hex('#d8d8e0'));mb.tube([.12,1.96,0],[.12,1.5,0],.005,hex('#888'));mb.sphere(.12,1.47,0,.045,chrome,0,1);
    for(let k=0;k<3;k++){const t=k/3*TAU;segBox(mb,[.12+Math.cos(t)*.03,1.45,Math.sin(t)*.03],[.12+Math.cos(t)*.11,1.33,Math.sin(t)*.11],.018,.018,chrome);segBox(mb,[.12+Math.cos(t)*.11,1.33,Math.sin(t)*.11],[.12+Math.cos(t)*.07,1.24,Math.sin(t)*.07],.016,.016,chrome);}
    /* the control ledge: a red ball-top stick and a big button */
    mb.fin(.5,0);mb.box(0,.95,.68,1.0,.06,.18,pink2);mb.fin(.8,1);mb.tube([-.2,.98,.68],[-.2,1.1,.68],.01,chrome);mb.fin(.6,0);mb.sphere(-.2,1.12,.68,.035,hex('#ff2a3a'),.4,1);
    mb.cyl(.18,.97,.68,.06,.03,16,hex('#ffd23f'),1.2);
    /* the top: the name, a glowing dome, bulbs round it */
    mb.fin(.5,0);mb.box(0,2.28,0,1.26,.34,1.26,pink);mb.fin(0,0);mb.sphere(0,2.45,0,.36,hex('#ff9ad8'),.9,2,.45);
    for(let i=0;i<14;i++){const x=-.6+i*1.2/13;bulbs.push([x,2.46,.635],[x,2.11,.635]);}
    mb.pop();
    texQuad(T,[[-.5,2.16,.632],[.5,2.16,.632],[.5,2.4,.632],[-.5,2.4,.632]],marqueeTex('PLUSH PANIC','#ff4fa0','#a01a5a',GRAD.gold),1.7);
    const stripes=canvasTex(64,64,(g,w,h)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#ff4fa0':'#ffd0e8';g.fillRect(i*8,0,8,h);}});
    for(const sx of [-1,1]){const x=sx*.622;litQuad(T,sx<0?[[x,.08,.55],[x,.08,-.55],[x,.84,-.55],[x,.84,.55]]:[[x,.08,-.55],[x,.08,.55],[x,.84,.55],[x,.84,-.55]],stripes,.7,3);}
    footprint(a,-.68,-.68,.68,.82);
    const BW=bulbs.map(p=>a.W(...p));Glints(BW.length,'#fff0b0',.017,i=>BW[i],(i,t)=>((i>>1)+Math.floor(t*6))%3===0?3.2:.4);
  };
  const ip=a.W(0,1.8,0);lightAt(ip[0],1.8,ip[2],1.6,[1,.85,.95],.8);const gp=a.W(0,1.4,1.1);lightAt(gp[0],1.4,gp[2],2.8,[1,.4,.75],.6);
  return a;
}

/* ---------- Molten: a brick forge ---------- */
function ForgeMolten(o){
  const a=Machine(Object.assign({useZ:1.6},o)),T=a.T,FZ=.55;
  a.addScreen(o.game.id,o.res||[320,180],[0,1.66,FZ+.03],0,.82,.461,{gain:2.4,col:'#ff8a2e'});
  const brick=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#2a1a14';g.fillRect(0,0,w,h);for(let r=0;r<16;r++)for(let c=0;c<9;c++){const x=c*32-(r%2)*16,y=r*16;g.fillStyle=['#5a2a1e','#6a3222','#4e241a','#733a26'][(r*7+c*3)%4];g.fillRect(x+1,y+1,30,14);}});
  const glow=canvasTex(64,64,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h*.9,4,w/2,h*.7,60);gr.addColorStop(0,'#fff2b0');gr.addColorStop(.35,'#ff9a2e');gr.addColorStop(1,'#3a0a04');g.fillStyle=gr;g.fillRect(0,0,w,h);});
  const embers=[];
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const iron=hex('#1e1c20'),orange=hex('#ff7a1e'),ice=hex('#9ae8ff');
    mb.fin(.25,0);mb.box(0,1.0,-.1,1.7,2.0,1.3,hex('#3a2218'));
    mb.box(0,2.32,-.2,1.4,.64,1.0,hex('#2e1c14'));mb.box(0,3.25,-.35,.52,1.5,.52,hex('#241612'));
    /* the iron frame round the screen, the ledge, a mould channel glowing */
    mb.fin(.7,1);mb.box(0,1.66,FZ+.01,.92,.56,.03,iron);mb.box(0,.95,FZ+.1,1.72,.08,.22,iron);
    mb.fin(0,0);mb.box(0,1.0,FZ+.13,1.1,.02,.06,orange,3.4);
    /* the crucible on its yoke, tipped, pouring */
    mb.fin(.7,1);mb.tube([.38,2.6,FZ-.05],[.72,2.6,FZ-.05],.018,iron);mb.tube([.55,2.6,FZ-.05],[.55,2.1,FZ+.12],.008,hex('#555'));
    mb.push();mb.tr(.55,1.98,FZ+.15);mb.rz(.75);mb.cyl(0,-.12,0,.15,.24,14,iron);mb.fin(0,0);mb.cyl(0,.1,0,.13,.02,14,orange,3.6);mb.pop();
    mb.fin(0,0);mb.tube([.43,1.94,FZ+.18],[.3,1.05,FZ+.15],.022,hex('#ffb24a'),4);
    /* the anvil out front, a hammer resting on it */
    mb.fin(.75,1);mb.box(0,.16,1.05,.26,.32,.3,iron);mb.box(0,.36,1.05,.18,.1,.22,iron);mb.box(0,.46,1.05,.56,.12,.22,iron);segBox(mb,[.28,.46,1.05],[.46,.5,1.05],.1,.12,iron);
    mb.fin(.3,0);mb.tube([-.1,.54,1.1],[.16,.6,.96],.014,hex('#6a4222'));mb.fin(.8,1);mb.box(-.12,.55,1.11,.06,.06,.12,iron);
    /* bellows on the left */
    mb.fin(.2,0);mb.push();mb.tr(-.95,.65,.25);mb.ry(.3);mb.box(0,0,0,.18,.4,.55,hex('#6a3a1e'));mb.box(0,.22,0,.2,.04,.6,hex('#3a2010'));mb.pop();
    /* the Rime creeping in: ice shards at the base */
    mb.fin(.9,0);let sd=5;const R=()=>(sd=(sd*16807)%2147483647)/2147483647;
    for(let i=0;i<11;i++){const x=-.9+R()*.5,z=.1+R()*.9,hh=.15+R()*.4;mb.push();mb.tr(x,0,z);mb.rz((R()-.5)*.5);mb.rx((R()-.5)*.5);mb.cyl(0,0,0,.05+R()*.04,hh,6,ice,.9,.0);mb.pop();}
    mb.pop();
    litQuad(T,[[-.85,0,FZ+.003],[.85,0,FZ+.003],[.85,2.0,FZ+.003],[-.85,2.0,FZ+.003]],brick,1,2);
    /* the forge's mouth, glowing */
    const M=[];for(let i=0;i<=12;i++){const t=Math.PI*i/12;M.push([Math.cos(t)*.42,.95+Math.sin(t)*.28]);}
    {const m=new MB();m.m=mmul(m.m,T);const c=[0,.66,FZ+.006];for(let i=0;i<M.length-1;i++)m.tri(c,[M[i][0],M[i][1],FZ+.006],[M[i+1][0],M[i+1][1],FZ+.006],[1,1,1],0);
      m.quad([-.42,.36,FZ+.006],[.42,.36,FZ+.006],[.42,.95,FZ+.006],[-.42,.95,FZ+.006],[1,1,1],0);TEXMESH.push({mesh:mesh(m),tex:glow,mode:3,emi:2.2});}
    {const m=new MB();m.m=mmul(m.m,T);m.fin(.7,1);polyTube(m,M.map(p=>[p[0],p[1],FZ+.02]).concat([[-.42,.36,FZ+.02],[.42,.36,FZ+.02]]),.03,hex('#1e1c20'),0,true);TEXMESH.push({mesh:mesh(m),tex:null,mode:0});}
    const frost=canvasTex(64,64,(g,w,h)=>{const gr=g.createLinearGradient(0,h,w,0);gr.addColorStop(0,'rgba(200,245,255,1)');gr.addColorStop(.6,'#5a8aa0');gr.addColorStop(1,'#2a1a14');g.fillStyle=gr;g.fillRect(0,0,w,h);});
    litQuad(T,[[-.851,0,.55],[-.851,0,-.2],[-.851,.7,-.2],[-.851,.9,.55]],frost,.6,3);
    for(let i=0;i<12;i++)embers.push(i);
    const MW=(x,y,z)=>a.W(x,y,z);
    Glints(12,'#ffb04a',.01,(i,t)=>{const k=(t*.3+i/12)%1;return MW(Math.sin(i*2.3+t*.6)*.3,1.0+k*1.6,FZ+.25+k*.25);},(i,t)=>{const k=(t*.3+i/12)%1;return 3*(1-k);});
    footprint(a,-1.0,-.8,.9,1.25);
  };
  const mp=a.W(0,.8,1.0),mouth=lightAt(mp[0],.8,mp[2],3.6,[1,.5,.15],1.0);const ip=a.W(-.7,.4,.8);lightAt(ip[0],.4,ip[2],1.6,[.5,.85,1],.5);
  a.onIdle=()=>{mouth.k=.9+.12*Math.sin(W_.t*9)*Math.sin(W_.t*5.3);};
  return a;
}

/* ---------- Voltfist: two cabinets back to back, the belt on top ---------- */
function VersusCab(o){
  const a=Machine(Object.assign({useZ:1.3},o)),T=a.T;
  a.addScreen(o.game.id,o.res||[384,216],[0,1.45,.4],-.18,.84,.4725,{gain:2.4,col:'#2fe6ff'});
  const back=canvasTex(256,144,(g,w,h)=>{g.fillStyle='#05060c';g.fillRect(0,0,w,h);gradText(g,'VOLTFIST',w/2,52,4,GRAD.cyan,'c');gradText(g,'PLAYER 2 SIDE',w/2,98,2,GRAD.pink,'c');});
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const shell=hex('#eef0f6'),blk=hex('#101218'),cyan=hex('#2fe6ff'),violet=hex('#b47aff'),gold=hex('#e0b04a');
    for(const s of [1,-1]){
      mb.fin(.6,0);mb.box(0,.42,s*.34,.98,.84,.66,shell);
      mb.push();mb.tr(0,.92,s*.66);mb.rx(s*.22);mb.box(0,0,0,.98,.07,.36,blk);
        mb.fin(.7,1);mb.tube([-.3,.04,0],[-.3,.12,0],.01,CHROME);mb.fin(.5,0);mb.sphere(-.3,.14,0,.032,s>0?hex('#ff2a3a'):hex('#2a6aff'),.5,1);
        [[-.05,.04],[.08,.06],[.21,.04],[-.05,-.07],[.08,-.05],[.21,-.07]].forEach(([x,z],k)=>mb.cyl(x+.02,.035,z*s,.026,.02,12,hex(['#ff3a5a','#ffd23f','#2fe6ff','#6dff7a','#b47aff','#ff8a2e'][k]),1.3));mb.pop();
      mb.fin(.6,0);mb.push();mb.tr(0,1.45,s*.33);mb.rx(-s*.18);mb.box(0,0,0,.98,.72,.12,shell);mb.fin(.3,0);mb.box(0,0,s*.062,.9,.56,.01,blk);mb.pop();
      mb.fin(.6,0);mb.box(0,1.88,s*.3,.98,.16,.2,shell);
      /* a lightning bolt down this side's flank: Kai's on one, Nova's plasma on the other */
      mb.fin(0,0);const zz=s*.34,P=[[.492,1.75,zz-.25*s],[.492,1.35,zz+.1*s],[.492,1.38,zz-.12*s],[.492,.85,zz+.2*s],[.492,.9,zz-.05*s],[.492,.35,zz+.15*s]];
      polyTube(mb,P,.012,s>0?cyan:violet,3.6,false);polyTube(mb,P.map(p=>[-p[0],p[1],p[2]]),.012,s>0?cyan:violet,3.6,false);
      /* a stool for each player */
      mb.fin(.7,1);mb.cyl(0,0,s*1.15,.04,.5,10,CHROME);mb.fin(.4,0);mb.cyl(0,.5,s*1.15,.19,.06,16,s>0?hex('#ff2a3a'):hex('#2a6aff'));}
    /* the championship belt in its case on top */
    mb.fin(.4,0);mb.box(0,2.0,0,.9,.08,.4,blk);mb.fin(.9,1);for(const sx of [-1,1])for(const sz of [-1,1])mb.tube([sx*.44,2.04,sz*.18],[sx*.44,2.5,sz*.18],.01,CHROME,0,6);
    mb.box(0,2.5,0,.9,.02,.38,CHROME);
    mb.fin(.3,0);mb.box(0,2.2,0,.8,.09,.02,blk);mb.fin(.95,1);mb.push();mb.tr(0,2.2,.015);mb.rx(Math.PI/2);mb.cyl(0,0,0,.11,.02,24,gold,.4);mb.pop();
    for(const sx of [-1,1]){mb.push();mb.tr(sx*.22,2.2,.015);mb.rx(Math.PI/2);mb.cyl(0,0,0,.055,.016,18,gold,.3);mb.pop();}
    mb.fin(0,0);mb.sphere(0,2.2,.03,.035,hex('#ff2a3a'),2,1);
    mb.pop();
    texQuad(T,[[-.38,1.79,.405],[.38,1.79,.405],[.38,1.96,.405],[-.38,1.96,.405]],marqueeTex('VOLTFIST','#05060c','#05060c',GRAD.cyan),1.8);
    {const BT=chain(T,mT(0,1.45,-.33),mRX(.18),mRY(Math.PI));texQuad(BT,[[-.45,-.28,.063],[.45,-.28,.063],[.45,.28,.063],[-.45,.28,.063]],back,1.4);}
    footprint(a,-.55,-1.4,.55,1.4);
  };
  const bp=a.W(0,2.3,0);lightAt(bp[0],2.3,bp[2],1.8,[1,.85,.5],.8);const fp=a.W(0,1.5,1.0);lightAt(fp[0],1.5,fp[2],2.6,[.3,.85,1],.6);const kp=a.W(0,1.5,-1.0);lightAt(kp[0],1.5,kp[2],2.6,[.7,.4,1],.5);
  return a;
}

/* ---------- Voidlance: a starfighter's cockpit on a docking cradle ---------- */
function LanceFighter(o){
  const a=Machine(Object.assign({useZ:1.35},o)),T=a.T;
  a.addScreen(o.game.id,o.res||[384,216],[0,1.3,-.78],.12,.9,.506,{gain:2.4,col:'#7ad8ff'});
  a.cam=()=>({eye:a.W(0,1.38,.6),tgt:a.W(0,1.28,-.8),fov:56});
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const hull=hex('#c8ccd6'),hull2=hex('#7a808e'),dark=hex('#14161c'),blue=hex('#4fb8ff'),cyan=hex('#7ae8ff');
    /* the cradle: two clamps up from the floor */
    mb.fin(.6,1);for(const z of [-.7,.3]){mb.box(0,.22,z,1.5,.44,.22,dark);for(const sx of [-1,1])segBox(mb,[sx*.66,.44,z],[sx*.5,.72,z],.1,.16,hull2);}
    /* the pod: floor, sides, a sloped nose, the seat, the screen ahead */
    mb.fin(.55,1);mb.box(0,.74,-.25,1.1,.1,1.75,hull2);for(const sx of [-1,1])mb.box(sx*.52,1.05,-.25,.08,.62,1.75,hull);
    mb.push();mb.tr(0,1.12,-1.2);mb.rx(.55);mb.box(0,0,0,1.1,.62,.08,hull);mb.pop();mb.box(0,1.42,-.95,1.1,.06,.4,hull);
    mb.fin(.3,0);mb.box(0,.88,.2,.46,.12,.44,dark);mb.push();mb.tr(0,1.18,.45);mb.rx(-.18);mb.box(0,0,0,.46,.62,.08,dark);mb.pop();
    mb.fin(0,0);for(let k=0;k<4;k++)mb.box(-.42+k*.05,.98,-.55,.03,.01,.03,[cyan,hex('#ffd23f'),hex('#ff4a6a'),cyan][k],2.6);
    /* the canopy, swung up and forward, tinted */
    mb.push();mb.tr(0,1.45,-.75);mb.rx(-.95);mb.fin(.9,1);for(const sx of [-1,1])mb.tube([sx*.5,0,0],[sx*.46,0,1.1],.016,hull2,0,6);mb.tube([-.46,0,1.1],[.46,0,1.1],.016,hull2,0,6);mb.pop();
    /* the lance: a long spike off the nose, rings of light along it, a glowing tip */
    mb.fin(.8,1);mb.push();mb.tr(0,1.08,-1.35);mb.rx(-Math.PI/2);mb.cyl(0,0,0,.1,1.5,12,hull,0,.015);mb.pop();
    for(const z of [-1.6,-1.95,-2.3])ring(mb,[0,1.08,z],.1-(-1.35-z)*.06+.03,'z',cyan,3.4,.008,20);
    mb.fin(0,0);mb.sphere(0,1.08,-2.86,.035,hex('#e8fbff'),5,1);
    /* stub wings with lit tips, two engines glowing blue at the back */
    mb.fin(.6,1);for(const sx of [-1,1]){segBox(mb,[sx*.56,1.0,-.2],[sx*1.15,.9,.1],.06,.5,hull2);mb.fin(0,0);mb.sphere(sx*1.16,.9,.12,.03,sx<0?hex('#ff3a3a'):hex('#3aff6a'),4,1);mb.fin(.6,1);
      zCyl(mb,sx*.42,1.18,.6,1.05,.13,hull2,0,14);mb.fin(0,0);zCyl(mb,sx*.42,1.18,1.05,1.06,.1,blue,4,14);mb.fin(.6,1);}
    mb.pop();
    footprint(a,-1.2,-1.4,1.2,1.1);
    const tip=a.W(0,1.08,-2.86);Glints(6,'#bff4ff',.008,(i,t)=>{const k=(t*.8+i/6)%1;return [tip[0]+Math.sin(i*2.1+t*3)*.06*k,tip[1]+Math.cos(i*1.7+t*3)*.06*k,tip[2]];},(i,t)=>3*(1-(t*.8+i/6)%1));
  };
  const cp=a.W(0,1.4,-.2);lightAt(cp[0],1.4,cp[2],2,[.5,.8,1],.7);const ep=a.W(0,1.2,1.4);lightAt(ep[0],1.2,ep[2],2.4,[.3,.6,1],.7);
  return a;
}

/* ---------- Prisma: a hover-bike over a glowing pad, in the rain ---------- */
function HoverBike(o){
  const a=Machine(Object.assign({useZ:1.45},o)),T=a.T;
  a.addScreen(o.game.id,o.res||[320,180],[0,1.6,-1.55],0,1.2,.675,{gain:2.4,col:'#ff4fd8'});
  a.cam=()=>({eye:a.W(0,1.45,.45),tgt:a.W(0,1.55,-1.55),fov:56});
  const trail=(c)=>canvasTex(8,128,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,c);gr.addColorStop(1,'#000');g.fillStyle=gr;g.fillRect(0,0,w,h);});
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const body=hex('#14141e'),mag=hex('#ff3fd8'),cyan=hex('#2fe6ff'),chrome=CHROME;
    /* the pad: a hexagon with a lit rim */
    mb.fin(.85,0);mb.cyl(0,0,0,1.15,.06,6,hex('#0c0a14'));mb.fin(0,0);ring(mb,[0,.065,0],1.12,'y',cyan,3,.012,6);
    /* the bike: a long fairing, a seat, bars, a small screen; hover rings under each end */
    mb.fin(.8,1);mb.push();mb.tr(0,.72,0);mb.rx(Math.PI/2);mb.sphere(0,0,0,.26,body,0,2,2.7);mb.pop();
    mb.fin(.9,1);mb.push();mb.tr(0,.82,-.45);mb.rx(Math.PI/2);mb.sphere(0,0,0,.16,mag,.25,2,1.8);mb.pop();
    mb.fin(.3,0);mb.box(0,.95,.25,.24,.08,.55,hex('#2a2430'));mb.fin(.8,1);mb.tube([-.3,1.05,-.42],[.3,1.05,-.42],.014,chrome);mb.tube([0,.92,-.48],[0,1.05,-.42],.014,chrome);
    mb.fin(0,0);mb.box(0,1.0,-.6,.22,.1,.01,cyan,1.2);
    for(const z of [-.5,.5])ring(mb,[0,.38,z],.24,'y',mag,3.4,.02,24);
    mb.fin(0,0);mb.box(0,.74,.72,.18,.08,.02,hex('#ff2a4a'),3);
    /* the arch ahead, with the screen in it */
    mb.fin(.6,1);for(const sx of [-1,1])mb.box(sx*.7,1.25,-1.6,.1,2.5,.14,hex('#1a1a26'));mb.box(0,2.42,-1.6,1.5,.16,.14,hex('#1a1a26'));
    mb.fin(0,0);for(const sx of [-1,1])mb.tube([sx*.64,.1,-1.52],[sx*.64,2.34,-1.52],.01,sx<0?mag:cyan,3.4);mb.box(0,1.6,-1.58,1.28,.76,.02,hex('#05050a'));
    neon2(mb,'PRISMA',[0,2.36,-1.52],[1,0,0],.024,mag,4.2);
    mb.pop();
    /* light trails streaming behind */
    for(const [sx,c] of [[-.12,'#ff3fd8'],[.12,'#2fe6ff']])texQuad(T,[[sx-.05,.72,2.3],[sx+.05,.72,2.3],[sx+.05,.78,.72],[sx-.05,.78,.72]],trail(c),2.2);
    footprint(a,-1.15,-1.75,1.15,1.15);
    /* rain falling round the bike */
    const MW=(x,y,z)=>a.W(x,y,z);
    Glints(26,'#9ad8ff',.006,(i,t)=>{const k=((t*.9+i*.137)%1);return MW(((i*37)%23)/23*2.4-1.2,3.2-k*3.2,((i*53)%19)/19*2.4-1.0);},()=>1.2);
  };
  const up=a.W(0,.3,0);lightAt(up[0],.3,up[2],2.2,[1,.3,.85],.9);const sp=a.W(0,1.7,-1.0);lightAt(sp[0],1.7,sp[2],2.4,[.3,.85,1],.6);
  return a;
}

/* ---------- Lantern: an iron street lamp on cobbles ---------- */
function Lamppost(o){
  const a=Machine(Object.assign({useZ:1.25},o)),T=a.T;
  a.addScreen(o.game.id,o.res||[384,216],[0,1.42,.1],0,.78,.439,{gain:2.4,col:'#ffb24a'});
  const cobble=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#14110e';g.fillRect(0,0,w,h);let sd=9;const R=()=>(sd=(sd*16807)%2147483647)/2147483647;
    for(let r=0;r<10;r++)for(let c=0;c<10;c++){const x=c*26+(r%2)*13+R()*4,y=r*26+R()*4,s=20+R()*4,v=40+R()*30|0;g.fillStyle=`rgb(${v+8},${v+4},${v})`;g.beginPath();g.ellipse(x,y,s/2,s/2.3,R(),0,TAU);g.fill();}});
  const glass=canvasTex(64,64,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h*.6,3,w/2,h/2,44);gr.addColorStop(0,'#fff6d0');gr.addColorStop(.4,'#ffc060');gr.addColorStop(1,'#7a3a10');g.fillStyle=gr;g.fillRect(0,0,w,h);g.strokeStyle='#1a1410';g.lineWidth=3;g.beginPath();g.moveTo(w/2,0);g.lineTo(w/2,h);g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();});
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const iron=hex('#141416'),wood=hex('#4a3020'),brass=hex('#b88a3a');
    mb.fin(.3,0);mb.cyl(0,0,-.2,1.15,.04,20,hex('#18140f'));
    /* the post: a fluted base, the column, a ladder bar, the lantern head */
    mb.fin(.7,1);mb.cyl(0,.04,-.25,.16,.3,12,iron,0,.1);mb.cyl(0,.34,-.25,.07,.12,12,iron);mb.cyl(0,.46,-.25,.05,2.2,10,iron);
    mb.tube([-.32,2.32,-.25],[.32,2.32,-.25],.014,iron);for(const sx of [-1,1])mb.sphere(sx*.32,2.32,-.25,.022,iron,0,1);
    mb.cyl(0,2.66,-.25,.12,.06,4,iron);for(const sx of [-1,1])for(const sz of [-1,1])mb.tube([sx*.16,2.72,-.25+sz*.16],[sx*.2,3.18,-.25+sz*.2],.012,iron);
    mb.cyl(0,3.18,-.25,.3,.2,4,iron,0,.02);mb.sphere(0,3.42,-.25,.03,brass,0,1);
    /* the notice board on the post, the screen pinned in it */
    mb.fin(.3,0);mb.box(0,1.42,.04,.98,.66,.06,wood);mb.fin(.8,1);mb.box(0,1.78,.06,1.04,.04,.1,iron);mb.box(0,1.06,.06,1.04,.04,.1,iron);
    mb.fin(0,0);for(const [x,y] of [[-.45,1.7],[.45,1.7],[-.45,1.13],[.45,1.13]])mb.sphere(x,y,.08,.012,brass,.8,0);
    mb.pop();
    litQuad(T,[[-1.1,.042,.95],[1.1,.042,.95],[1.1,.042,-1.35],[-1.1,.042,-1.35]],cobble,1,2);
    /* the lantern's glass, glowing on all four sides */
    const H=chain(T,mT(0,2.95,-.25));for(let k=0;k<4;k++){const LT=chain(H,mRY(k*Math.PI/2));texQuad(LT,[[-.17,-.22,.18],[.17,-.22,.18],[.2,.22,.2],[-.2,.22,.2]],glass,2.4);}
    footprint(a,-.35,-.55,.6,.25);
    const lh=a.W(0,2.95,-.25);
    Glints(1,'#fff2c0',.04,()=>lh,(i,t)=>3.6+.5*Math.sin(t*11)*Math.sin(t*4.7));
    Glints(8,'#e8dcc0',.008,(i,t)=>{const ang=t*(1.4+i*.17)+i,r=.32+.1*Math.sin(t*2+i);return [lh[0]+Math.cos(ang)*r,lh[1]+Math.sin(t*3.1+i*1.3)*.18,lh[2]+Math.sin(ang)*r];},()=>1.1);
  };
  const lp=a.W(0,2.9,-.25),flame=lightAt(lp[0],2.9,lp[2],5,[1,.72,.36],1.15);const bp=a.W(0,1.5,.9);lightAt(bp[0],1.5,bp[2],1.8,[1,.75,.45],.5);
  a.onIdle=()=>{flame.k=1.05+.12*Math.sin(W_.t*11)*Math.sin(W_.t*4.7);};
  return a;
}

/* ---------- Air Hockey 3D: a full-size table under a hanging scoreboard ----------
   The game's own Classic table: a white surface pricked with air holes, a pink-lit rim, blue goal creases.
   A puck glides back and forth across it on its own while nobody's playing. */
function HockeyTable(o){
  const a=Machine(Object.assign({useZ:1.8},o)),T=a.T,L=2.3,W=1.2,TY=.88;
  a.addScreen(o.game.id,o.res||[320,180],[0,1.98,0],-.12,.86,.484,{gain:2.4,col:'#ff4fb8'});
  a.cam=()=>({eye:a.W(0,1.8,2.1),tgt:a.W(0,.95,-.2),fov:54});
  const surf=canvasTex(256,512,(g,w,h)=>{g.fillStyle='#f2f6fb';g.fillRect(0,0,w,h);
    g.fillStyle='rgba(60,80,110,.35)';for(let y=8;y<h;y+=10)for(let x=8;x<w;x+=10){g.beginPath();g.arc(x+((y/10|0)%2)*5,y,1.2,0,TAU);g.fill();}
    g.strokeStyle='#ff3a5a';g.lineWidth=4;g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();g.beginPath();g.arc(w/2,h/2,40,0,TAU);g.stroke();
    g.strokeStyle='#2a7aff';g.lineWidth=4;for(const y of [0,h]){g.beginPath();g.arc(w/2,y,60,0,TAU);g.stroke();}
    g.strokeStyle='#2a7aff';g.lineWidth=3;for(const y of [h*.22,h*.78]){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
    g.fillStyle='rgba(255,60,150,.18)';g.font='bold 30px sans-serif';g.textAlign='center';g.save();g.translate(w/2,h/2+70);g.fillText('AIR HOCKEY',0,0);g.restore();});
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const blk=hex('#121218'),pink=hex('#ff3fa0'),cyan=hex('#2fe6ff'),chrome=CHROME;
    /* legs, the apron with its lights, the rails round the top */
    mb.fin(.8,1);for(const sx of [-1,1])for(const sz of [-1,1])mb.box(sx*(W/2-.1),.31,sz*(L/2-.15),.1,.62,.1,chrome);
    mb.fin(.5,0);mb.box(0,.74,0,W,.26,L,blk);
    mb.fin(0,0);for(const sx of [-1,1])mb.tube([sx*(W/2+.005),.66,-L/2+.05],[sx*(W/2+.005),.66,L/2-.05],.008,cyan,3);
    mb.fin(.6,0);for(const sx of [-1,1])mb.box(sx*(W/2-.03),TY+.04,0,.06,.08,L,hex('#1a1424'));for(const sz of [-1,1]){mb.box(-W/2+.22,TY+.04,sz*(L/2-.03),.44,.08,.06,hex('#1a1424'));mb.box(W/2-.22,TY+.04,sz*(L/2-.03),.44,.08,.06,hex('#1a1424'));}
    mb.fin(0,0);for(const sx of [-1,1])mb.tube([sx*(W/2-.065),TY+.075,-L/2+.06],[sx*(W/2-.065),TY+.075,L/2-.06],.008,pink,3.2);
    /* the goals: a dark slot each end, a light over it */
    for(const sz of [-1,1]){mb.fin(.2,0);mb.box(0,TY-.02,sz*(L/2-.01),.32,.06,.05,hex('#05050a'));mb.fin(0,0);mb.box(0,TY+.1,sz*(L/2+.005),.34,.03,.02,sz>0?hex('#ff3a3a'):hex('#3a7aff'),2.6);}
    /* the mallets and the hood of the table's fan box */
    mb.fin(.5,0);for(const [sz,c] of [[1,'#ff3a4a'],[-1,'#2a6aff']]){mb.cyl(0,TY,sz*.78,.07,.035,20,hex(c),.3);mb.cyl(0,TY+.035,sz*.78,.03,.06,14,hex(c),.2);mb.sphere(0,TY+.1,sz*.78,.032,hex(c),.2,1);}
    /* the scoreboard: two posts, a beam, the screen hung under it facing this end; the far side's board faces the other way */
    mb.fin(.8,1);for(const sx of [-1,1])mb.tube([sx*.72,TY,0],[sx*.72,2.5,0],.025,chrome,0,8);mb.box(0,2.48,0,1.56,.08,.1,hex('#1a1424'));
    mb.fin(.3,0);mb.box(0,1.98,-.03,.98,.6,.04,hex('#08060e'));
    neon2(mb,'AIR HOCKEY',[0,2.54,.06],[1,0,0],.026,pink,4.2);
    /* a hanging lamp over the table */
    mb.fin(.6,1);mb.box(0,3.1,0,.9,.08,1.6,hex('#1a1424'));mb.fin(0,0);mb.box(0,3.055,0,.8,.01,1.5,hex('#fff4ea'),1.6);for(const sx of [-1,1])mb.tube([sx*.4,3.14,0],[sx*.4,3.95,0],.004,hex('#444'));
    mb.pop();
    texQuad(T,[[-W/2+.06,TY+.002,L/2-.06],[W/2-.06,TY+.002,L/2-.06],[W/2-.06,TY+.002,-L/2+.06],[-W/2+.06,TY+.002,-L/2+.06]],surf,.85);
    {const BT=chain(T,mT(0,1.98,-.055),mRY(Math.PI));texQuad(BT,[[-.45,-.27,0],[.45,-.27,0],[.45,.27,0],[-.45,.27,0]],marqueeTex('AIR HOCKEY 3D','#08060e','#08060e',GRAD.pink,'FIRST TO 7'),1.6);}
    footprint(a,-W/2-.05,-L/2-.05,W/2+.05,L/2+.05);
    /* the puck, gliding and bouncing off the rails while the table waits */
    const pm=new MB();pm.fin(.4,0);pm.cyl(0,0,0,.045,.015,18,hex('#ffd23f'),.8);const PM=mesh(pm);
    const hx=W/2-.12,hz=L/2-.14;
    DECO.push({t:0,update(dt){this.t+=dt;},draw(){const t=this.t*.55,tri=(v,m)=>{const k=((v%(2*m))+2*m)%(2*m);return k<m?k:2*m-k;};
      const x=tri(t*.9+.3,2*hx)-hx,z=tri(t*1.6,2*hz)-hz,p=a.W(x,TY+.004,z);drawLit(PM,mT(p[0],p[1],p[2]),{emi:.5});}});
  };
  const lp=a.W(0,2.9,0);lightAt(lp[0],2.9,lp[2],3.4,[1,.95,.9],.95);const rp=a.W(0,.9,0);lightAt(rp[0],.9,rp[2],1.8,[1,.35,.7],.5);
  return a;
}
