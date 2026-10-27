function buildRoom(){
  const {x0,x1,z0,z1,h}=ROOM;
  FLOOR.quad([x0,0,z1],[x1,0,z1],[x1,0,z0],[x0,0,z0],[1,1,1]);
  const wall=hex('#2c2342'),wain=hex('#1b1529'),ceil=hex('#141019'),trimP=hex('#ff2f9a'),trimC=hex('#2fe6ff');
  WORLD.quad([x0,0,z0],[x1,0,z0],[x1,h,z0],[x0,h,z0],wall);
  WORLD.quad([x1,0,z1],[x0,0,z1],[x0,h,z1],[x1,h,z1],wall);
  WORLD.quad([x0,0,z1],[x0,0,z0],[x0,h,z0],[x0,h,z1],wall);
  WORLD.quad([x1,0,z0],[x1,0,z1],[x1,h,z1],[x1,h,z0],wall);
  WORLD.quad([x0,h,z0],[x1,h,z0],[x1,h,z1],[x0,h,z1],ceil);
  WORLD.box(0,.55,z0+.03,x1-x0,1.1,.06,wain);WORLD.box(0,.55,z1-.03,x1-x0,1.1,.06,wain);
  WORLD.box(x0+.03,.55,0,.06,1.1,z1-z0,wain);WORLD.box(x1-.03,.55,0,.06,1.1,z1-z0,wain);
  for(const [a,b,c] of [[[x0,.04,z0+.07],[x1,.04,z0+.07],trimC],[[x0+.07,.04,z0],[x0+.07,.04,z1],trimP],[[x1-.07,.04,z0],[x1-.07,.04,z1],trimP]])WORLD.tube(a,b,.012,c,2.2);
  for(const [a,b,c] of [[[x0,1.12,z0+.08],[x1,1.12,z0+.08],trimP],[[x0+.08,1.12,z0],[x0+.08,1.12,z1],trimC],[[x1-.08,1.12,z0],[x1-.08,1.12,z1],trimC],[[x0,1.12,z1-.08],[-1.6,1.12,z1-.08],trimC],[[1.6,1.12,z1-.08],[x1,1.12,z1-.08],trimC]])WORLD.tube(a,b,.01,c,2.4);
  /* ceiling: light panels on a grid, and the strips between them */
  for(let gx=-12;gx<=12;gx+=6)for(let gz=-8;gz<=8;gz+=8){WORLD.box(gx,h-.03,gz,1.6,.04,.5,hex('#fff4ea'),1.6);lightAt(gx,h-.4,gz,10,[1,.88,.8],1.35);}
  for(let gx=-15;gx<=15;gx+=3)WORLD.box(gx,h-.05,0,.05,.06,z1-z0,hex('#14111c'));
  /* the way in, on the front wall */
  WORLD.box(0,1.15,z1-.02,3.0,2.3,.04,hex('#05040a'));
  for(const [a,b] of [[[-1.55,0,z1-.06],[-1.55,2.35,z1-.06]],[[1.55,0,z1-.06],[1.55,2.35,z1-.06]],[[-1.55,2.35,z1-.06],[1.55,2.35,z1-.06]]])WORLD.tube(a,b,.03,trimC,3);
  neon2(WORLD,'EXIT',[0,2.55,z1-.08],[-1,0,0],.05,hex('#ff3030'),3);
  /* the main sign, where your eyes land when the lights come on */
  WORLD.box(0,3.25,z0+.05,6.2,1.55,.06,hex('#0a0810'));
  neon2(WORLD,'HYPERDOT',[0,3.42,z0+.12],[1,0,0],.085,hex('#ff2f9a'),4.5);
  neon2(WORLD,'ARCADE',[0,2.72,z0+.12],[1,0,0],.06,hex('#2fe6ff'),4.5);
  lightAt(0,3.1,z0+1.2,7,[1,.25,.6],1.1);
  /* zone signs */
  const sign=(txt,c,right,px,col,back)=>{const n=[-right[2],0,right[0]],w=(txt.length*6+3)*px;
    if(back)WORLD.box(c[0]-n[0]*.03,c[1]+3*px,c[2]-n[2]*.03,Math.abs(right[0])*w+.04,9*px,Math.abs(right[2])*w+.04,hex('#0a0810'));
    neon2(WORLD,txt,c,right,px,hex(col),4);};
  sign('DELUXE',[-10.6,3.35,z0+.12],[1,0,0],.055,'#f2c45a',1);lightAt(-10.6,3,z0+1.4,6,[1,.75,.4],.8);
  sign('RACING',[10.6,3.35,z0+.12],[1,0,0],.055,'#ff2a4a',1);lightAt(10.6,3,z0+1.4,6,[1,.3,.3],.8);
  sign('VIDEO',[x0+.12,3.3,-2.9],[0,0,-1],.06,'#58e8ff',1);lightAt(x0+1.4,3,-2.9,6,[.3,.7,1],.8);
  sign('PINBALL',[x1-.12,3.3,-.6],[0,0,1],.055,'#ff9a2e',1);lightAt(x1-1.4,3,-.6,6,[1,.6,.3],.8);
  sign('PRIZES',[-11.5,3.72,z1-.12],[-1,0,0],.055,'#ffd23f',1);lightAt(-11.5,3.3,z1-1.4,6,[1,.85,.4],.8);
  /* a hanging sign over the redemption games, on cables */
  {const hx=-4.45,hz=-.55;WORLD.box(hx,3.7,hz,2.9,.5,.08,hex('#0a0810'));for(const sx of [-1.3,1.3])WORLD.tube([hx+sx,3.95,hz],[hx+sx,h,hz],.006,hex('#555'));
  neon2(WORLD,'TICKETS',[hx,3.55,hz+.05],[1,0,0],.04,hex('#7dff6a'),4);neon2(WORLD,'TICKETS',[hx,3.55,hz-.05],[-1,0,0],.04,hex('#ff4fb8'),4);}
  lightAt(-6,2.6,0,9,[.25,.5,1],.55);lightAt(6,2.6,0,9,[.7,.25,1],.55);
  /* pillars with neon rings */
  for(const [px,pz] of [[-8,-4.4],[8,-4.4],[-8,4.8],[8,4.8]]){
    WORLD.box(px,h/2,pz,.5,h,.5,hex('#151020'));
    for(const yy of [.9,2.4,3.6])for(let k=0;k<4;k++){const s=[[-1,-1],[1,-1],[1,1],[-1,1]],a=s[k],b=s[(k+1)%4];WORLD.tube([px+a[0]*.26,yy,pz+a[1]*.26],[px+b[0]*.26,yy,pz+b[1]*.26],.012,(yy===2.4)?trimP:trimC,2.6);}
    block(px-.3,px+.3,pz-.3,pz+.3);
  }
  /* benches, a change machine and a bin */
  for(const bx of [-3.2,3.2]){WORLD.box(bx,.42,7.2,1.6,.08,.45,hex('#2b2040'));WORLD.box(bx-.7,.21,7.2,.08,.42,.4,hex('#1a1426'));WORLD.box(bx+.7,.21,7.2,.08,.42,.4,hex('#1a1426'));block(bx-.85,bx+.85,6.95,7.45);}
  WORLD.box(4.8,.95,z1-.35,.7,1.9,.5,hex('#2a3b52'));WORLD.box(4.8,1.35,z1-.61,.5,.42,.02,hex('#7fffd4'),2.2);WORLD.box(4.8,.8,z1-.61,.18,.08,.02,hex('#ffcc33'),2);
  neon2(WORLD,'CHANGE',[4.8,1.98,z1-.62],[-1,0,0],.022,hex('#ffcc33'),2.5);block(4.4,5.2,z1-.65,z1);
  WORLD.cyl(-4.6,0,z1-.4,.22,.8,10,hex('#22192e'),0,.24);block(-4.85,-4.35,z1-.65,z1);
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
