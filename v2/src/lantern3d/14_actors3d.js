/* =====================================================================================
   23. 3D — THE LAMPLIGHTER AND THE THINGS IN THE DARK, as solid shapes and sprites.
       Everything here reads the original's state (P, SH, SNUF, MOTHS, BOSS, FLARES, PICKS,
       FF, PART) and only draws it.
   ===================================================================================== */
const AM={};
M4.seg=function(a,b,th,o){o=o||new Float32Array(16);const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz)||1;
  let sx=dy*0-dz*1,sy=dz*0-dx*0,sz=dx*1-dy*0;let sl=Math.hypot(sx,sy,sz);if(sl<1e-4){sx=1;sy=0;sz=0;sl=1;}sx/=sl;sy/=sl;sz/=sl;
  let ux=sy*dz-sz*dy,uy=sz*dx-sx*dz,uz=sx*dy-sy*dx;const ul=Math.hypot(ux,uy,uz)||1;ux/=ul;uy/=ul;uz/=ul;
  o[0]=dx;o[1]=dy;o[2]=dz;o[3]=0;o[4]=ux*th;o[5]=uy*th;o[6]=uz*th;o[7]=0;o[8]=sx*th;o[9]=sy*th;o[10]=sz*th;o[11]=0;o[12]=a[0];o[13]=a[1];o[14]=a[2];o[15]=1;return o;};
function actorMeshes(){
  const pl=[MT.plain,0,0,1],cloth=[MT.plain,0,0,1];let mb;
  mb=new MB();mb.lathe(0,0,[[2.1,0],[2.6,1],[2.35,3],[2.05,6],[1.85,8.4],[1.95,9.5],[1.7,10.6],[1.5,11.6],[1.15,12.6],[.5,13.4],[0,13.6]],14,COL.plain,pl);AM.shade=mb.build();
  mb=new MB();mb.lathe(0,0,[[2.7,0],[3.1,1.2],[2.6,5],[2.1,10],[1.8,14],[2.1,16],[1.8,18.4],[1.55,19.8],[1.05,21.2],[.45,22],[0,22.2]],14,COL.plain,pl);AM.snuf=mb.build();
  mb=new MB();mb.blob(0,0,0,1,1,1,3,COL.plain,pl,.16,5);AM.boss=mb.build();
  mb=new MB();mb.box(0,-.5,-.5,1,.5,.5,COL.iron,[MT.iron,0,0,1],63);AM.unitI=mb.build();
  mb=new MB();mb.box(0,-.5,-.5,1,.5,.5,[.2,.15,.11,.08],cloth,63);AM.unitC=mb.build();
  mb=new MB();mb.lathe(0,0,[[0,.2],[.55,.1],[1.05,-.8],[1.3,-2.1],[1.45,-2.7],[1.3,-2.75]],10,COL.iron,[MT.iron,0,0,1]);AM.bell=mb.build();
  /* the lamplighter: a long coat, a hood, a red scarf, boots */
  mb=new MB();const coat=[.3,.22,.15,.06];
  mb.lathe(0,0,[[1.8,1.4],[2.15,2.4],[2.0,4.8],[1.75,7.8],[1.62,9.5],[1.3,10.5],[.6,11],[0,11.1]],14,coat,cloth);
  mb.cyl(0,0,10.1,10.95,1.5,1.35,12,[.46,.1,.07,.08],cloth);
  mb.blob(-.25,0,12.05,1.45,1.38,1.6,2,[.17,.13,.1,.05],cloth,.06,2);mb.blob(.62,0,11.75,.75,.88,.92,1,[.05,.035,.03,.02],cloth,0,3);
  mb.box(1.2,-1.5,4.2,1.35,1.5,5,[.12,.09,.07,.1],cloth,31);
  AM.coat=mb.build();
  mb=new MB();mb.box(-.55,-.45,0,.55,.45,2.1,[.08,.06,.05,.25],cloth,31);mb.box(-.4,-.38,2.1,.4,.38,4,[.13,.11,.1,.05],cloth,31);AM.leg=mb.build();
  /* the lantern: a tin body, a pointed cap, a ring to hold it by; the glass is drawn glowing */
  mb=new MB();mb.lathe(0,0,[[0,-.05],[.85,-.05],[.9,.25],[.86,.32],[.86,1.6],[1.0,1.75],[.6,2.25],[.24,2.6],[.3,2.85],[0,2.95]],10,[.3,.26,.18,.6],[MT.metal,0,0,1]);
  mb.box(-.12,-.55,2.85,.12,.55,3.5,COL.iron,[MT.iron,0,0,1],31);for(let k=0;k<4;k++){const a=k/4*TAU+.4;mb.box(Math.cos(a)*.8-.08,Math.sin(a)*.8-.08,.3,Math.cos(a)*.8+.08,Math.sin(a)*.8+.08,1.6,COL.iron,[MT.iron,0,0,1],31);}
  AM.lant=mb.build();mb=new MB();mb.cyl(0,0,.32,1.6,.8,.8,10,[.9,.8,.6,.2],pl,false);mb.cyl(.82,0,.5,1.4,.01,.01,4,[1,1,1,0],pl,false);AM.lglass=mb.build();
  /* pickups */
  mb=new MB();mb.cyl(0,0,0,2.3,1.1,1.0,12,[.42,.36,.24,.6],[MT.metal,0,0,1]);mb.cyl(0,0,2.3,2.7,.35,.3,8,[.2,.18,.15,.6],[MT.metal,0,0,1]);
  mb.box(-1.4,-.2,1,-1,.2,2.6,[.2,.18,.15,.5],[MT.metal,0,0,1],31);mb.box(-.25,-.9,2.8,.25,-.7,3.4,COL.iron,[MT.iron,0,0,1],31);mb.box(-.25,.7,2.8,.25,.9,3.4,COL.iron,[MT.iron,0,0,1],31);mb.box(-.25,-.9,3.3,.25,.9,3.6,COL.iron,[MT.iron,0,0,1],31);AM.oil=mb.build();
  mb=new MB();mb.cyl(0,0,0,3.2,.42,.42,8,[.62,.08,.05,.3],pl);mb.cyl(0,0,3.2,3.6,.44,.3,8,[.85,.82,.75,.2],pl);AM.flare=mb.build();
}
const MX=new Float32Array(16);
function drawPart(pw,mesh,m,tint,emis){gl.uniformMatrix4fv(pw.u.uM,false,m);gl.uniform3fv(pw.u.uTint,tint||ONE3);gl.uniform3fv(pw.u.uEmis,emis||ZERO3);drawMesh(mesh);}
const ONE3=new Float32Array([1,1,1]),ZERO3=new Float32Array([0,0,0]);
/* GL point from a point of the town */
const GLP=(x,y,z)=>[x,z,y];
function drawSolids(pw){
  const t=R3.t,night=TOWN.kind==='night';
  if(night){
    /* the lamplighter */
    const vis=!P.dead||(S.mode==='dying'&&S.t<1.6),blink=P.inv>0&&((S.clock*16|0)&1)&&S.mode==='play';
    if(vis&&!blink){const a=P.aim,ca=Math.cos(a),sa=Math.sin(a),rx=-sa,ry=ca,spd=Math.hypot(P.vx,P.vy);R3.walk=(R3.walk||0)+spd*(1/60);
      const sw=Math.sin(R3.walk*.5)*Math.min(1,spd/18)*1.15,bob=Math.abs(Math.cos(R3.walk*.5))*Math.min(1,spd/18)*.35,dk=S.mode==='dying'?1-S.t/1.6:1;
      const tint=P.hurt>0?new Float32Array([1+P.hurt*3,1-P.hurt,1-P.hurt]):ONE3;
      drawPart(pw,AM.leg,M4.trs(P.x-rx*.75+ca*sw,P.y-ry*.75+sa*sw,0,a,1,1,1,MX),tint);
      drawPart(pw,AM.leg,M4.trs(P.x+rx*.75-ca*sw,P.y+ry*.75-sa*sw,0,a,1,1,1,MX),tint);
      drawPart(pw,AM.coat,M4.trs(P.x,P.y,bob*(dk),a+Math.sin(R3.walk*.5)*.05,1,1,1-(1-dk)*.25,MX),tint);
      const sh=GLP(P.x+rx*1.05+ca*.2,P.y+ry*1.05+sa*.2,9.4+bob),hand=GLP(P.lx+rx*.1,P.ly+ry*.1,10.3);drawPart(pw,AM.unitC,M4.seg(sh,hand,.62,MX),tint);
      const g=LU.lanI[0],em=new Float32Array([C3L[0]*g*2.6,C3L[1]*g*2.6,C3L[2]*g*2.6]);
      drawPart(pw,AM.lant,M4.trs(P.lx,P.ly,7.1,a,1,1,1,MX));drawPart(pw,AM.lglass,M4.trs(P.lx,P.ly,7.1,a,1,1,1,MX),ZERO3,em);}
    /* the snuffers' poles and bells */
    for(const z of SNUF){const tg=z.tgt||P,a=Math.atan2(tg.y-z.y,tg.x-z.x),ca=Math.cos(a),sa=Math.sin(a),rx=-sa,ry=ca;z.a3=a;
      const reach=z.wait>0?1:0,h=GLP(z.x+ca*.9+rx*1.7,z.y+sa*.9+ry*1.7,11.5),top=GLP(z.x+ca*(1.6+reach*1.5)+rx*2.1,z.y+sa*(1.6+reach*1.5)+ry*2.1,27.5+reach);
      drawPart(pw,AM.unitI,M4.seg(h,top,.36,MX));drawPart(pw,AM.bell,M4.trs(top[0],top[2],top[1],a,1,1,1,MX));}
    /* oil and flares waiting in the street */
    for(const p of PICKS){if(!p.on)continue;const bob=1.2+Math.sin(p.t*3)*.5;
      if(p.k==='oil')drawPart(pw,AM.oil,M4.trs(p.x,p.y,bob,p.t*1.1,1,1,1,MX));else drawPart(pw,AM.flare,M4.trs(p.x,p.y,bob,p.t,1,1,1,MX),ONE3,new Float32Array([.25,.03,.02]));}
    for(const f of FLARES)drawPart(pw,AM.flare,M4.trs(f.x,f.y,0,f.t,.9,.9,.8,MX),ONE3,new Float32Array([1.5,.4,.25]));
  }
  gl.uniformMatrix4fv(pw.u.uM,false,IDM);gl.uniform3fv(pw.u.uTint,ONE3);gl.uniform3fv(pw.u.uEmis,ZERO3);
}
const C3L=[1,.55,.22];
function drawVoids(){
  if(TOWN.kind!=='night')return;const p=PG.voidp,u=p.u;gl.useProgram(p.p);gl.uniformMatrix4fv(u.uVP,false,R3.VP);gl.uniform3fv(u.uCam,R3.cam);const dt=1/60;
  for(const s of SH){s.t3=(s.t3||0)+dt*(s.fz>.5?.08:1);const sc=.55+.45*clamp(s.hp,0,1),a=Math.hypot(s.vx,s.vy)>1?Math.atan2(s.vy,s.vx):Math.atan2(P.y-s.y,P.x-s.x);s.a3=a;
    gl.uniformMatrix4fv(u.uM,false,M4.trs(s.x,s.y,0,a,sc,sc,sc*(.9+.1*Math.sin(s.t3*3)),MX));gl.uniform4f(u.uVw,s.t3,s.id*1.7,s.burn>0?1.5:.85,13.6);
    gl.uniform4f(u.uVoid,s.fz,s.burn>0?1:0,s.in,0);gl.uniform3f(u.uVoidC,.008,.004,.02);drawMesh(AM.shade);}
  for(const z of SNUF){z.t3=(z.t3||0)+dt*(z.fz>.5?.1:1);gl.uniformMatrix4fv(u.uM,false,M4.trs(z.x,z.y,0,z.a3||0,1,1,1,MX));gl.uniform4f(u.uVw,z.t3,7.3,.55,22.2);
    gl.uniform4f(u.uVoid,z.fz,z.burn>0?1:0,1,0);gl.uniform3f(u.uVoidC,.01,.006,.016);drawMesh(AM.snuf);}
  const B=BOSS;if(B.on){const rs=.35+.65*B.rise,r=Math.max(.01,B.r);gl.uniformMatrix4fv(u.uM,false,M4.trs(B.x,B.y,-r*.45+r*1.05*rs,Math.atan2(P.y-B.y,P.x-B.x),r*1.15,r*1.15,r*1.75*rs,MX));
    gl.uniform4f(u.uVw,B.t,3.1,.22,1);gl.uniform4f(u.uVoid,0,B.hurt>0?.9:0,2,0);gl.uniform3f(u.uVoidC,.004,.001,.008);drawMesh(AM.boss);}
}
/* ---------- sprites: four batches (darkness, smoke, light, eyes seen through walls) ---------- */
const SPR={cap:6000,b:[[],[],[],[]],n:[0,0,0,0],data:null};SPR.data=new Float32Array(SPR.cap*12);
function sp(bt,x,y,z,s,r,g,b,a,shape,mode,rot,asp){const B=SPR.b[bt];B.push(x,y,z,s,r,g,b,a,shape,mode||0,rot||0,asp==null?1:asp);}
const SPL=[];
function lightGuess(x,y){if(TOWN.kind!=='night')return .2;let L=lightHere(x,y);return Math.min(2,L);}
function fillSprites(dt){
  for(const B of SPR.b)B.length=0;const t=R3.t,night=TOWN.kind==='night';
  if(TOWN.kind==='title'){sp(2,LAN3.x,LAN3.y,LAN3.z,5,1,.55,.22,.9,0);sp(2,LAN3.x,LAN3.y,LAN3.z,1.2,1,.85,.6,1.6,0);return;}
  if(!night)return;
  /* lamps: a halo and a flame when lit, an ember when dark, the kindling ring of dots */
  for(let i=0;i<LAMPS.length;i++){const L=LAMPS[i],v=L.vis||0,Z=TOWN.lampsZ;
    if(v>.01){const f=1+.04*Math.sin(L.flick*7.3+i);sp(2,L.x,L.y,Z,11*v*(1+(L.burst||0)*.8),1,.62,.28,.5*v*f,0);sp(2,L.x,L.y,Z-.6,1.05*v,1,.86,.62,2.2*v,5,2);
      if(L.burst>0)sp(2,L.x,L.y,.3,18+30*(1-L.burst),1,.6,.25,.5*L.burst,2,1);}
    else sp(2,L.x,L.y,Z,.75,1,.5,.2,.35+.15*Math.sin(t*2+i),0);
    if(P.kl===L&&P.kindle>0&&!L.lit){sp(2,L.x,L.y,.25,7,1,.6,.25,1.4,7,1,P.kindle,1);/* the ring of dots fills; the flame passes from the lantern up to the lamp */
      for(let k=0;k<5;k++){const q=((t*1.6+k/5)%1),x=lerp(P.lx,L.x,q),y=lerp(P.ly,L.y,q),z=lerp(8,Z,q)+Math.sin(q*Math.PI)*5;sp(2,x,y,z,.5,1,.7,.3,1.6*P.kindle,1);}}}
  /* the lantern's own glow and, with the shutter open, a glint at the lens */
  if(LAN3.on){const g=LU.lanI[0];sp(2,LAN3.x,LAN3.y,8.2,3.8+P.beamK*2,1,.55,.22,.55*g,0);
    if(P.beamK>.05){const ca=Math.cos(P.aim),sa=Math.sin(P.aim);sp(2,LAN3.x+ca*.9,LAN3.y+sa*.9,8.1,3.2*P.beamK,1,.8,.55,1.2*P.beamK*oilK(),6);}}
  /* flares */
  for(const f of FLARES){const k=1-f.t/f.dur;sp(2,f.x,f.y,3.5,24*k+4,1,.45,.3,.55*k,0);sp(2,f.x,f.y,3.4,4.5*k+1,1,.85,.75,2*k,6,0,t*3);if((r32()&1)===0)puff(f.x,f.y,1,0,34,.7,3.2);}
  /* the great lamp's lens */
  if(GREAT.on&&TOWER)sp(2,TOWER.x,TOWER.y,91,18*GREAT.k,1,.85,.6,.6*GREAT.k,0);
  /* fireflies, and the little pools they make */
  for(const f of FF)if(f.on){const b=.5+.5*Math.sin(f.ph*6);if(b<.2)continue;const z=4+Math.sin(f.ph*1.7)*1.5;sp(2,f.x,f.y,z,.6,.85,1,.4,2.2*b,0);sp(2,f.x,f.y,.15,6,.6,.8,.3,.09*b,0,1);}
  /* the wells breathe darkness */
  for(const w of WELLS)for(let k=0;k<3;k++){const q=((t*.25+k/3)%1);sp(0,w.x+Math.sin(t+k*2)*1.5,w.y+Math.cos(t*.7+k)*1.5,1+q*9,3+q*4,0,0,0,.3*(1-q)*Math.min(1,q*4),0);}
  /* shades: a pool of darkness on the ground, a haze round the body, two eyes */
  for(const s of SH){const k=s.in,a=s.a3||0,ca=Math.cos(a),sa=Math.sin(a),rx=-sa,ry=ca,sc=.55+.45*clamp(s.hp,0,1);
    sp(0,s.x,s.y,.2,10*sc,0,0,0,.62*k,0,1);sp(0,s.x,s.y,7*sc,8*sc,0,0,0,.42*k*(1-.4*s.fz),0);
    const open=((s.eye+s.id)%4.3)>.18,eb=(s.fz>.5?.35:.8)*k;if(open)for(const sd of [-1,1]){const ex=s.x+ca*1.5*sc+rx*.55*sd*sc,ey=s.y+sa*1.5*sc+ry*.55*sd*sc,ez=11.5*sc;sp(2,ex,ey,ez,.42,1,.86,.6,2.6*eb,9,0,0,1.5);sp(3,ex,ey,ez,.6,1,.8,.5,.9*eb,9,0,0,1.5);}}
  for(const z of SNUF){const a=z.a3||0,ca=Math.cos(a),sa=Math.sin(a),rx=-sa,ry=ca;sp(0,z.x,z.y,.2,12,0,0,0,.6,0,1);sp(0,z.x,z.y,12,11,0,0,0,.35,0);
    const eb=z.fz>.5?.4:.9;for(const sd of [-1,1]){const ex=z.x+ca*1.4+rx*.5*sd,ey=z.y+sa*1.4+ry*.5*sd;sp(2,ex,ey,19.6,.45,1,.8,.55,2.4*eb,9,0,0,1.5);sp(3,ex,ey,19.6,.65,1,.8,.5,.9*eb,9,0,0,1.5);}}
  const B=BOSS;if(B.on){const r=B.r,rs=.35+.65*B.rise;sp(0,B.x,B.y,.3,r*2.8,0,0,0,.75*rs,0,1);sp(0,B.x,B.y,r*1.2*rs,r*2.4,0,0,0,.55*rs,0);
    const e=B.eye>0?Math.min(1,B.eye*2):0,glow=(B.hurt>0?2.2:1.4)*(B.dead?Math.max(0,1-B.dead):1),ez=-r*.45+r*1.05*rs+r*1.75*rs*.35,ey=B.y+r*1.05;
    if(e>0){sp(2,B.x,ey,ez,3.2*e+.4,1,.9,.7,3.5*glow,9,0,0,2.4);sp(2,B.x,ey,ez,12*e,1,.75,.45,.5*glow*e,0);sp(3,B.x,ey,ez,4*e,1,.85,.6,1.2*glow,9,0,0,2.4);}
    else sp(2,B.x,ey,ez,2.6,1,.7,.4,.5,10,0,0,4);}
  /* when the flame dies: eyes in the dark, closing in (and drifting round after the game is over) */
  if(S.mode==='dying'||S.mode==='over'){const dy=S.mode==='dying',k=dy?clamp((S.t-.6)/2.4,0,1):1,n=dy?9:14;
    for(let i=0;i<n;i++){const a=dy?i/n*TAU+i*.7:i*2.39996+S.t*.05,r=dy?60-k*44+Math.sin(S.t*3+i)*3:30+((S.t*6+i*13)%50),open=dy?((S.t*3+i*.37)%2.1)>.15:(S.t*2+i)%3>.3;if(!open)continue;
      const ex=P.x+Math.cos(a)*r*1.2,ey=P.y+Math.sin(a)*r*.8,b=dy?.4+k*2:1.2,fa=a+Math.PI;
      for(const sd of [-1,1])sp(2,ex+Math.cos(fa+Math.PI/2)*.6*sd,ey+Math.sin(fa+Math.PI/2)*.6*sd,10.5,.45,1,.85,.6,b,9,0,0,1.5);}}
  /* moths: pale wings that catch the light they circle */
  for(const m of MOTHS){const tz=m.tgt==='P'?9:m.tgt?TOWN.lampsZ+1:12;m.z3=(m.z3==null?tz:m.z3)+(tz-(m.z3==null?tz:m.z3))*Math.min(1,dt*2);const sc=m.scatter>0?1+m.scatter:1;
    for(const q of m.n){const x=m.x+Math.cos(q.a)*q.r*sc,y=m.y+Math.sin(q.a)*q.r*.7*sc,z=m.z3+Math.sin(q.a*2+q.ph)*1.6;const L=lightGuess(x,y)+(m.tgt&&m.tgt!=='P'?.8:0);
      sp(1,x,y,z,.85,.9,.8,.62,Math.min(1,.25+L*.6),8,0,q.ph,1);}}
  /* embers glow; smoke is lit by whatever is near */
  for(const p of PART){const k=p.t/p.life;if(p.kind===0){sp(2,p.x,p.y,p.z,.32*p.sz*(1-k*.5),1,.5+.3*p.sp,.18,2.4*(1-k),1);}
    else{const L=lightGuess(p.x,p.y);sp(1,p.x,p.y,p.z,(1.6+k*4.5)*p.sz,.05+L*.3,.045+L*.2,.04+L*.12,.42*(1-k)*Math.min(1,k*6+.2),3,0,p.sp*6);}}
  /* rain rings on the stones */
  if(ST.rain&&S.mode!=='over'){for(let k=0;k<(R3.q==='low'?4:10);k++)SPL.push({x:R3.tgt.x+rnd(-120,120),y:R3.tgt.y+rnd(-80,70),t:0});
    let n=0;for(const s of SPL){s.t+=dt;if(s.t>.45)continue;const k=s.t/.45,L=lightGuess(s.x,s.y);if(L>.05)sp(2,s.x,s.y,.2,.4+k*1.3,1,.7,.4,(1-k)*.6*Math.min(1,L),2,1);SPL[n++]=s;}SPL.length=n;}
}
function drawSprites(){
  let tot=0;const counts=SPR.b.map(B=>{const n=Math.min(B.length/12,SPR.cap-tot);SPR.data.set(B.length>n*12?B.slice(0,n*12):B,tot*12);tot+=n;return n;});if(!tot)return;
  const p=PG.spr,u=p.u;gl.useProgram(p.p);gl.uniformMatrix4fv(u.uVP,false,R3.VP);gl.uniform3fv(u.uCR,R3.cr);gl.uniform3fv(u.uCU,R3.cu);gl.uniform1f(u.uT,R3.t);
  gl.bindVertexArray(SPRVAO);gl.bindBuffer(gl.ARRAY_BUFFER,SPRBUF);gl.bufferSubData(gl.ARRAY_BUFFER,0,SPR.data,0,tot*12);
  gl.enable(gl.BLEND);gl.depthMask(false);let off=0;
  const modes=[[gl.ZERO,gl.ONE_MINUS_SRC_ALPHA,gl.ZERO,gl.ONE_MINUS_SRC_ALPHA],[gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ZERO,gl.ONE],[gl.ONE,gl.ONE,gl.ONE,gl.ONE],[gl.ONE,gl.ONE,gl.ONE,gl.ONE]];
  for(let b=0;b<4;b++){const n=counts[b];if(n){for(let k=0;k<3;k++)gl.vertexAttribPointer(4+k,4,gl.FLOAT,false,48,off*48+k*16);gl.blendFuncSeparate(...modes[b]);gl.uniform1i(u.uBatch,b);
      if(b===3)gl.depthFunc(gl.GREATER);gl.drawArraysInstanced(gl.TRIANGLES,0,6,n);if(b===3)gl.depthFunc(gl.LEQUAL);}off+=n;}
  gl.depthMask(true);gl.disable(gl.BLEND);gl.bindVertexArray(null);
}
