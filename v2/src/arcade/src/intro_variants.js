  /* ---------- shared by the test versions ---------- */
  // a quad facing along n, w wide and h tall, centred on p (local +z is the face)
  const faceM=(p,n,w,h)=>{const up0=Math.abs(n[1])>.95?[0,0,-1]:[0,1,0],x=norm(cross(up0,n)),y=cross(n,x),m=m4();
    m[0]=x[0]*w;m[1]=x[1]*w;m[2]=x[2]*w;m[4]=y[0]*h;m[5]=y[1]*h;m[6]=y[2]*h;m[8]=n[0];m[9]=n[1];m[10]=n[2];m[12]=p[0];m[13]=p[1];m[14]=p[2];return m;};
  // the games' attract loops; until they arrive, their names in dots
  const FALLBACK=[];
  function artAt(k){
    if(TART.length)return TART[k%TART.length];
    if(!FALLBACK.length)for(const [t,c] of [['REDLINE',GRAD.red],['MOLTEN',GRAD.amber],['VOIDLANCE',GRAD.violet],['PRISMA',GRAD.cyan]]){
      const cv=mkCanvas(128,72),g=cv.getContext('2d');g.fillStyle='#05030a';g.fillRect(0,0,128,72);gradText(g,t,64,26,2,c);
      FALLBACK.push({m:{w:128,h:72,n:1,cols:1,fps:1},tex:texFrom(cv,true),W:128,H:72});}
    return FALLBACK[k%FALLBACK.length];
  }
  const aspectOf=k=>{const A=artAt(k);return A.m.h/A.m.w;};
  function drawGame(k,M,pow,ph){const A=artAt(k),m=A.m,f=Math.floor((api.t+ph)*m.fps)%m.n,cl=f%m.cols,rw=(f/m.cols)|0;
    drawSheet(A.tex,[cl*m.w/A.W,1-(rw+1)*m.h/A.H,m.w/A.W,m.h/A.H],[Math.max(24,m.w>>1),Math.max(14,m.h>>1)],M,pow);}
  const ortho=(u,f)=>norm(sub(u,scl(f,dot3(u,f))));
  // a heading and pitch as a direction
  const dirHP=(hd,p)=>[Math.sin(hd)*Math.cos(p),Math.sin(p),Math.cos(hd)*Math.cos(p)];
  // the last second of a drift turns you to look straight down, the way the plunge starts
  function toDown(k,fwd,up){rig.fwd=nl(fwd,DOWN,k);rig.up=ortho(nl(up,[0,0,-1],k),rig.fwd);}
  function plunge(o){startFall(Object.assign({T:1.9,v0:Math.max(1,api.vel||1.5),roll:Math.PI,layers:3,panels:false,table:false},o));}
  function endShared(){for(const A of FALLBACK)gl.deleteTexture(A.tex);FALLBACK.length=0;}

  /* ===== A · WHIRLPOOL =====
     Straight after STEP INSIDE the camera lifts to see the whole table, and the table twists: its art, its rails and
     bumpers wind into a whirlpool round the frozen ball. Then the spin takes you, faster and faster, down the drain.
     Below the table you sink slowly through a ring of the arcade's games, each passing close and big, then turn to
     look down and drop. */
  VARS.a={name:'Whirlpool',at:G.sink+.25,T:{twist:1.4,suck:3.0,drift:5.6},W:0,
    start(){const S=this;setStage('suck');S.f0=rig.fwd.slice();S.u0=rig.up.slice();S.fov0=rig.fov;S.e0=rig.eye.slice();
      S.e1=UPT;S.e2=norm(cross(NRM,UPT));const d=sub(rig.eye,HOLE.w);const h=dot3(d,NRM),r=sub(d,scl(NRM,h));S.p0=Math.atan2(dot3(r,S.e2),dot3(r,S.e1));
      Object.assign(api.post,{gl:0,dot:0});api.tear.a=0;api.flick=0;api.jit=0;S.W=0;S.crossed=0;api.dmdPow=0;
      SX.suck(3);SX.swell(3,120,5200,.15,.6);SX.pad([45,57,60,64],3.8,.022);},
    warp(){const S=this;return S.W>0?[[HOLE.w[0],HOLE.w[1],HOLE.w[2],S.W],[NRM[0],NRM[1],NRM[2],.12+.3*S.W]]:null;},
    update(dt,st){const S=this,t=api.st,T1=S.T.twist,T2=S.T.suck;
      if(st==='suck'){
        api.pow=1;api.dim=.15;
        // the twist, watched from above; then the dive, the spin speeding up as you go down the middle
        S.W=.72*sstep(.05,T1,t)+.28*sstep(T1,T2-.4,t);
        const d=Math.max(0,t-T1),ph=S.p0+.45*t+1.9*d*d,
          rad=lerp(.32,0,sstep(T1,T2-.5,t)),h=t<T1?lerp(.55,1.15,easeIO(t/T1)):lerp(1.15,-.8,Math.pow(sstep(T1,T2,t),1.7));
        const rv=add(scl(S.e1,Math.cos(ph)),scl(S.e2,Math.sin(ph))),pos=add(add(HOLE.w,scl(NRM,h)),scl(rv,rad));
        const k0=sstep(0,.9,t);rig.eye=mix3(S.e0,pos,k0);
        rig.fwd=nl(S.f0,norm(sub(sub(HOLE.w,scl(NRM,t<T1?0:1.6*sstep(T1,T2,t))),rig.eye)),k0);
        rig.up=ortho(nl(S.u0,rv,sstep(.2,1.6,t)),rig.fwd);
        rig.fov=lerp(S.fov0,50,k0)+40*sstep(T1+.6,T2,t);
        api.carve=h<.2?{c:rig.eye.slice(),r:.42,y0:-1e9,k:100,col:[1,.55,.95]}:{c:add(HOLE.w,scl(NRM,-.004)),r:.13+.22*sstep(T1,T2-.6,t),y0:-1e9,k:100,col:[1,.55,.95]};
        if(!S.crossed&&h<0){S.crossed=1;api.post.dot=8;api.dotT=.12;SX.crackle(16);SX.whoosh();}
        B.h=R-.08-.4*sstep(T1,T2-.4,t);
        api.post.rad=(reduce?.15:.55)*sstep(T1+.7,T2,t);LOOK.fringe=lerp(.012,.07,sstep(T1,T2,t));shake(.0015*sstep(T1,T2,t));
        tunA=lerp(.1,.9,sstep(T1+.5,T2,t));api.vel=1+6*sstep(T1+.5,T2,t);windSet(api.vel);
        if(t>=T2){setStage('drift');S.W=0;S.y0=rig.eye[1];S.ax=[HOLE.w[0],HOLE.w[2]];S.f1=rig.fwd.slice();S.u1=rig.up.slice();
          S.hd0=Math.atan2(rig.up[0],rig.up[2]);api.carve=null;api.tableOn=false;S.buildRing();SX.pad([50,57,62,66],5,.02);SX.drone(5);}
        return;}
      // the drift: falling slowly, looking out at the games as they come past
      const y=S.y(t);api.vel=3.6*Math.exp(-1.9*t)+.9;windSet(api.vel*.6);
      const hd=S.hd0+.36*t,look=dirHP(hd,-.18+.04*Math.sin(t*1.3));
      rig.eye=[S.ax[0],y,S.ax[1]];
      const k=sstep(0,1.3,t);rig.fwd=nl(S.f1,look,k);rig.up=ortho(nl(S.u1,[0,1,0],k),rig.fwd);rig.fov=lerp(90,62,sstep(0,1.1,t));
      const k2=sstep(S.T.drift-1.1,S.T.drift,t);if(k2>0){toDown(k2,rig.fwd,rig.up);rig.fov=lerp(62,72,k2);}
      api.post.rad=(reduce?.05:.3)*(1-sstep(0,.8,t));LOOK.fringe=lerp(.07,.02,sstep(0,1,t));tunA=lerp(.9,.3,sstep(0,1.2,t));
      if(t>=S.T.drift)plunge();},
    y(t){return this.y0-(3.6/1.9*(1-Math.exp(-1.9*t))+.9*t);},
    // the games: one after another, each placed where you'll be looking as you sink past it
    buildRing(){const S=this;S.ring=[];
      for(let k=0;k<5;k++){const tk=1.2+k*.95;S.ring.push({k,y:S.y(tk)-.05,hd:S.hd0+.36*tk+(k%2?.55:-.55),ph:Math.random()*10});}},
    screens(){const S=this;if(api.stage!=='drift'||!S.ring)return;const t=api.st,ey=rig.eye;
      for(const q of S.ring){const dy=ey[1]-q.y;if(dy<-2.6||dy>3)continue;
        const hd=q.hd+.1*t,p=[S.ax[0]+Math.sin(hd)*2.0,q.y,S.ax[1]+Math.cos(hd)*2.0],n=norm(sub(ey,p)),w=1.75;
        drawGame(q.k,faceM(p,n,w,w*aspectOf(q.k)),1.25*sstep(3,1.8,Math.abs(dy)),q.ph);}},
    end(){endShared();}
  };

  /* ===== B · INTO THE DISPLAY =====
     You're pulled face first into the playfield. The picture breaks into bigger and bigger LED dots until you pass
     between them, and come out sinking down a shaft whose walls are video walls of the arcade's games. */
  VARS.b={name:'Into the display',at:G.sink+.3,T:{suck:2.4,drift:5.4},
    start(){const S=this;setStage('suck');S.e0=rig.eye.slice();S.f0=rig.fwd.slice();S.u0=rig.up.slice();S.fov0=rig.fov;
      Object.assign(api.post,{gl:0,dot:0});api.tear.a=0;api.flick=0;S.flash=0;
      SX.suck(2.3);SX.swell(2.4,300,7000,.12,.7);SX.pad([45,57,60,64],3.6,.022);},
    update(dt,st){const S=this,t=api.st;
      if(st==='suck'){
        // the table stays lit, then you hit its surface
        api.pow=1;api.dim=.15;api.dmdPow=1;
        const e=Math.pow(sstep(0,S.T.suck,t),2.4),P1=add(HOLE.w,scl(NRM,.035));
        rig.eye=mix3(S.e0,P1,e);rig.fwd=nl(nl(S.f0,norm(sub(HOLE.w,rig.eye)),sstep(0,.5,t)),scl(NRM,-1),sstep(1.2,2.2,t));rig.up=ortho(nl(S.u0,UPT,sstep(.6,1.8,t)),rig.fwd);rig.fov=lerp(S.fov0,58,sstep(0,1.5,t));
        api.post.dot=t<.35?0:2.5+64*Math.pow(sstep(.35,S.T.suck,t),2.1);
        shake(.002*sstep(1.5,S.T.suck,t));LOOK.fringe=lerp(.012,.05,sstep(1,S.T.suck,t));
        if(t>=S.T.suck){setStage('drift');api.tableOn=false;api.exp=.9;S.y0=rig.eye[1]-.6;S.ax=[rig.eye[0],rig.eye[2]];S.f1=rig.fwd.slice();S.u1=rig.up.slice();
          S.hd0=Math.PI;S.buildWalls();SX.whoosh();SX.crackle(20);SX.pad([52,59,64,67],5.4,.02);SX.drone(5.4);}
        return;}
      // the shaft: the dots resolve into the video walls as you sink, turning slowly to face each wall in turn
      const v=1.35+.5*Math.exp(-2*t),y=S.y0-(1.35*t+.25*(1-Math.exp(-2*t)));api.vel=v;windSet(v*.5);
      rig.eye=[S.ax[0],y,S.ax[1]];
      const hd=S.hd0+.33*t,look=dirHP(hd,-.1+.03*Math.sin(t*1.1)),k=sstep(0,.9,t);
      rig.fwd=nl(S.f1,look,k);rig.up=ortho(nl(S.u1,[0,1,0],k),rig.fwd);rig.fov=lerp(58,62,k);
      api.post.dot=Math.max(0,66*(1-sstep(0,.85,t)));
      const k2=sstep(S.T.drift-1.0,S.T.drift,t);if(k2>0){toDown(k2,rig.fwd,rig.up);rig.fov=lerp(62,72,k2);}
      LOOK.fringe=lerp(.05,.015,sstep(0,1,t));tunA=.0;
      if(t>=S.T.drift){api.post.dot=0;plunge();}},
    // four walls of screens round a square shaft, three across and a row every metre
    buildWalls(){const S=this;S.walls=[];let k=0;const D=2.15,sw=1.3;
      for(let wall=0;wall<4;wall++){const a=wall*Math.PI/2,n=[-Math.sin(a),0,-Math.cos(a)],c=[Math.sin(a)*D,0,Math.cos(a)*D],rt=[Math.cos(a),0,-Math.sin(a)];
        for(let row=0;row<12;row++)for(let col=-1;col<=1;col++){const y=S.y0+1.4-row*.92;
          S.walls.push({k:k++,p:[S.ax[0]+c[0]+rt[0]*col*1.42,y,S.ax[1]+c[2]+rt[2]*col*1.42],n,ph:Math.random()*10});}}},
    screens(){const S=this;if(api.stage!=='drift'||!S.walls)return;const ey=rig.eye,k=sstep(0,.5,api.st);
      for(const q of S.walls){const dy=q.p[1]-ey[1];if(dy<-2.6||dy>2.4)continue;
        drawGame(q.k,faceM(q.p,q.n,1.3,1.3*.5625),k*1.1*sstep(2.6,1.6,Math.abs(dy)),q.ph);}},
    points(pt,t){const S=this;if(api.stage!=='drift'||!S.walls)return;const ey=rig.eye;
      // the shaft's corners, lined with LED dots
      for(let c=0;c<4;c++){const a=c*Math.PI/2+Math.PI/4,x=S.ax[0]+Math.sin(a)*3.05,z=S.ax[1]+Math.cos(a)*3.05;
        for(let i=-14;i<=14;i++){const y=Math.round(ey[1]/.25)*.25+i*.25,lit=((i+Math.floor(t*14))%7+7)%7===0;pt(x,y,z,c%2?.18:1,c%2?.9:.18,c%2?1:.6,lit?1.4:.25,.03);}}},
    end(){endShared();}
  };

  /* ===== C · SWALLOWED =====
     The machine convulses and bursts. You shrink as it goes, so its parts balloon round you: you fall in slow motion
     among giant bumpers, flippers and slabs of the playfield, with the arcade's games floating among them. Then
     gravity comes back and everything drops, you with it. */
  VARS.c={name:'Swallowed',at:G.sink+.5,T:{suck:1.7,drift:5.6,brk:.7},
    start(){const S=this;setStage('suck');S.e0=rig.eye.slice();S.f0=rig.fwd.slice();S.u0=rig.up.slice();S.fov0=rig.fov;S.broke=0;
      Object.assign(api.post,{gl:0,dot:0});api.tear.a=0;SX.suck(1.4);SX.bits(6);S.L=[
        {p:[0,0,0],range:8,col:[1,.35,.8],k:0,pin:true,hz:.3},{p:[0,0,0],range:8,col:[.3,.85,1],k:0,pin:true,hz:.3},{p:[0,0,0],range:7,col:[1,.85,.65],k:0,pin:true,hz:.2}];},
    // the machine's parts, each with its centre in the playfield's own frame
    buildParts(){const S=this,P2=[],tile=(i,j,NX,NY)=>{const x0=-HW+2*HW*i/NX,x1=-HW+2*HW*(i+1)/NX,z0=-PL*j/NY,z1=-PL*(j+1)/NY,cx=(x0+x1)/2,cz=(z0+z1)/2,m=new MB();
        const uv=[[i/NX,j/NY],[(i+1)/NX,j/NY],[(i+1)/NX,(j+1)/NY],[i/NX,(j+1)/NY]];m.quad([x0-cx,.001,z0-cz],[x1-cx,.001,z0-cz],[x1-cx,.001,z1-cz],[x0-cx,.001,z1-cz],[1,1,1],0,uv);
        m.quad([x0-cx,-.012,z1-cz],[x1-cx,-.012,z1-cz],[x1-cx,-.012,z0-cz],[x0-cx,-.012,z0-cz],[1,1,1],0,[uv[3],uv[2],uv[1],uv[0]]);
        const b=new MB();b.box(0,-.006,0,x1-x0,.01,z0-z1,hex('#120a20'));return {c:[cx,0,cz],parts:[{m:mesh(m),mode:2,tex:pfTex,emi:.9},{m:mesh(b)}],local:true,sc:7};};
      for(let j=0;j<4;j++)for(let i=0;i<3;i++)if((i+j)%2===0||j===1)P2.push(tile(i,j,3,4));
      for(const b of P.bumpers)P2.push({c:[b.x,0,-b.y],parts:[{m:bumpBody,emi:1.1},{m:bumpCap,emi:2.4,tint:BCOL[b.i]},{m:bumpRing,y:.01,emi:.4}],local:true,sc:9});
      P.flip.forEach((f,i)=>P2.push({c:[f.x,0,-f.y],parts:[{m:flipM[i],emi:1.1}],local:true,sc:9}));
      [P.slingL,P.slingR].forEach((S2,i)=>{let cx=0,cz=0;for(const p of S2){cx+=p[0];cz-=p[1];}cx/=S2.length;cz/=S2.length;P2.push({c:[cx,0,cz],parts:[{m:slingM[i],emi:1.2,tint:i?[.18,.9,1]:[1,.18,.6]}],sc:9});});
      INS.slice(0,7).forEach(I=>P2.push({c:[I.u,0,-I.v],parts:[{m:I.m,emi:2.6}],sc:9}));
      P2.push({c:[HOLE.u,R,-HOLE.v],parts:[{m:ballM,emi:.3}],local:true,sc:14,ball:true});
      // where each settles round you, and how it drifts and turns
      P2.forEach((q,i)=>{const a=i*2.39996,el=((i*.618)%1-.5)*1.5,r=1.5+((i*.37)%1)*1.6;
        q.base=[Math.cos(a)*r,el,Math.sin(a)*r];q.vr=[rnd(-.08,.08),rnd(-.12,.06),rnd(-.08,.08)];q.ax=norm([rnd(-1,1),rnd(-1,1),rnd(-1,1)]);q.ang=0;q.w=rnd(-.9,.9);});
      S.parts=P2;
      S.games=[0,1,2,3,4,5].map(k=>{const a=k*1.047+.5,r=2.35;return {k,base:[Math.cos(a)*r,((k*.53)%1-.5)*1.2,Math.sin(a)*r],ph:Math.random()*10,sw:rnd(-.3,.3)};});},
    update(dt,st){const S=this,t=api.st;
      if(st==='suck'){
        const B1=S.T.brk;
        if(t<B1){// the yank: pulled at the ball, the machine fighting it
          const e=Math.pow(t/B1,2.2),P1=add(HOLE.w,scl(NRM,.16));rig.eye=mix3(S.e0,P1,e);rig.fwd=nl(S.f0,norm(sub(HOLE.w,rig.eye)),sstep(0,.4,t));rig.up=ortho(S.u0,rig.fwd);
          rig.fov=lerp(S.fov0,80,e);shake(.012*t/B1);api.pow=Math.random()<.35?.2:1;api.flick=.4;
          for(const f of P.flip)f.held=Math.random()<.5;for(const b of P.bumpers)if(Math.random()<.2){b.flash=1;b.ring=1;}physTick(dt);
          return;}
        if(!S.broke){S.broke=1;S.hdB=Math.atan2(-UPT[0],-UPT[2])+.6;S.buildParts();S.tb=t;S.cam0=rig.eye.slice();api.tableOn=false;api.exp=1.2;LOOK.fringe=.1;burst();}
        const u=sstep(B1,S.T.suck,t);
        // through where the playfield was, while it all balloons round you
        if(!S.f2)S.f2=rig.fwd.slice();rig.eye=add(S.cam0,scl(NRM,-.9*u));rig.fwd=nl(S.f2,dirHP(S.hdB,-.3),sstep(0,1,u));rig.up=ortho([0,1,0],rig.fwd);rig.fov=lerp(80,66,u);S.grow=u;
        if(t>=S.T.suck){setStage('drift');S.y0=rig.eye[1];S.ax=[rig.eye[0],rig.eye[2]];S.f1=rig.fwd.slice();S.hd0=Math.atan2(rig.fwd[0],rig.fwd[2]);S.f1=rig.fwd.slice();SX.pad([48,55,60,63],5.6,.022);SX.drone(5.6);}
        S.lights(t);return;}
      // the slow fall among the pieces
      const g=sstep(S.T.drift-1.1,S.T.drift,t),y=S.y0-(.8*t+.06*t*t)-4*g*g*(t-(S.T.drift-1.1));api.vel=.8+.12*t+6*g;windSet(api.vel*.6);
      rig.eye=[S.ax[0],y,S.ax[1]];
      const hd=S.hd0+.34*t,look=dirHP(hd,-.3+.08*Math.sin(t*.8));rig.fwd=nl(S.f1,look,sstep(0,1,t));
      rig.up=ortho([Math.sin(t*.7)*.12,1,0],rig.fwd);rig.fov=66;
      for(const q of S.parts){q.ang+=q.w*dt;}
      if(g>0){toDown(g,rig.fwd,rig.up);rig.fov=lerp(66,72,g);}
      LOOK.fringe=lerp(.1,.018,sstep(0,1.2,t));S.lights(t);
      if(t>=S.T.drift){S.fallStart=rig.eye[1];plunge({roll:Math.PI*.6});api.dyn=[BALL_L].concat(S.L);}},
    lights(t){const S=this,e=rig.eye;S.L[0].p=[e[0]+Math.cos(t*.6)*1.8,e[1]+1,e[2]+Math.sin(t*.6)*1.8];S.L[1].p=[e[0]-Math.cos(t*.6)*1.8,e[1]-.6,e[2]-Math.sin(t*.6)*1.8];S.L[2].p=[e[0],e[1]-1.6,e[2]];
      for(const L of S.L)L.k=api.stage==='fall'?L.k*.96:1.7;api.dyn=(api.stage==='fall'?[BALL_L]:[]).concat(S.L);},
    // in the plunge the pieces fall ahead of you and break up as they hit the ceiling
    fall(dt,u){const S=this;if(!S.parts)return;S.lights(api.t);for(const q of S.parts){q.ang+=q.w*dt;q.drop=(q.drop||0)+dt*(2+q.base[1]);}},
    // where piece q is now: in the table at first, then ballooned round the camera, then (in the plunge) dropping ahead
    pose(q){const S=this,e=rig.eye,st=api.stage,u=st==='suck'?S.grow:1,t=st==='suck'?0:st==='drift'?api.st:S.T.drift;
      const tw=xf(PFM,q.c[0],q.c[1],q.c[2]),dr=add(add(st==='suck'?S.cam0:[S.ax[0],e[1],S.ax[1]],q.base),scl(q.vr,t));
      if(st==='fall'){dr[1]=e[1]+q.base[1]-(q.drop||0)*(q.drop||0)*1.2;}
      const p=mix3(tw,dr,u),sc=lerp(1,q.sc,u*u);
      return chain(mT(...p),mRX(TH*(1-u)),mRot(q.ax,q.ang*u),mS(sc,sc,sc),q.local?m4():mT(-q.c[0],-q.c[1],-q.c[2]));},
    draw(){const S=this,st=api.stage;if(!S.parts||!(st==='suck'||st==='drift'||st==='fall'&&rig.eye[1]>ROOM.h+.4))return;
      gl.uniform4f(P_LIT.u.uCarve,0,0,0,0);
      for(const q of S.parts){if(st==='fall'&&q.dead)continue;const M=S.pose(q);
        if(st==='fall'&&M[13]<ROOM.h+.3){q.dead=1;for(let i=0;i<14;i++)spawnDeb([M[12],M[13],M[14]],[rnd(-1,1),rnd(-1,.5),rnd(-1,1)],PAL[(Math.random()*4)|0],rnd(.4,.9),.016,2);continue;}
        for(const pp of q.parts)drawLit(pp.m,pp.y?mmul(M,mT(0,pp.y,0)):M,{emi:pp.emi??0,tint:pp.tint,mode:pp.mode,tex:pp.tex});}
      setCarve();},
    screens(){const S=this;if(api.stage!=='drift'||!S.games)return;const e=rig.eye,t=api.st;
      for(const q of S.games){const p=add([S.ax[0],e[1],S.ax[1]],add(q.base,[0,Math.sin(t*.5+q.ph)*.15,0])),n=norm(add(sub(e,p),[Math.sin(t*.6+q.ph)*q.sw,0,Math.cos(t*.5+q.ph)*q.sw])),w=1.6;
        drawGame(q.k,faceM(p,n,w,w*aspectOf(q.k)),1.2*sstep(0,.8,t),q.ph);}},
    end(){const S=this;S.parts=null;S.games=null;endShared();}
  };
  // the burst: a crack, dots everywhere, the table's lights going with it
  function burst(){S.boom(1.6);SX.crackle(24);SX.whoosh();SX.bits(8);
    for(let i=0;i<260;i++){const d=norm([rnd(-1,1),rnd(-1,1),rnd(-1,1)]),v=rnd(.4,2.6);spawnDeb(add(HOLE.w,scl(d,.1)),scl(d,v),PAL[(Math.random()*5)|0],rnd(.6,1.6),rnd(.006,.014),.2);}}
