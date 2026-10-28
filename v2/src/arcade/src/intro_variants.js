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
    for(let i=0;i<(INTRO==='d'||INTRO==='e'?150:260);i++){const d=norm([rnd(-1,1),rnd(-1,1),rnd(-1,1)]),v=rnd(.4,2.6);spawnDeb(add(HOLE.w,scl(d,.1)),scl(d,v),PAL[(Math.random()*5)|0],rnd(.6,1.6),rnd(.006,.014),.2);}}

  /* ===== D · UPLOAD (the opening of C, the tunnel of B) =====
     The boot list ends on a quiet hint. When the game glitches the camera stays on the whole table and the score
     display throws ERROR 404. Everything freezes; the display types INITIALIZING, then UPLOADING PLAYER 1 with a bar
     filling, while a portal opens in the middle of the playfield, on the logo: the art spirals into it, the ball rolls
     in, the machine starts to shake. PLAYER 1 READY, and you're pulled through. The machine bursts and you fall in slow
     motion among its giant parts; they drop away as the walls round you light up, screen by screen, with the arcade's
     games (and once, all together, PLAYER 1). Then the camera swings down, the screens wind into a spiral and the
     spiral takes you, faster and faster, down to the arcade. */
  VARS.d={name:'Upload',at:G.freeze,hazeSuck:.45,get hazeOn(){return !this.broke;},T:{suck:4.4,parts:3.0,shaft:7.2,spiral:4.4},W:0,
    init(){BOOT[4]='PLAYER UPLOAD ... STANDBY';ERRS.splice(0,ERRS.length,'ERROR 404','404','NOT FOUND','ERROR 404');},
    once(k,f){const S=this;if(!S.fired[k]){S.fired[k]=1;f();}},
    glitchCam(gt){const g0=api.g0,c=Wp(P.UC*.3,PL*.47,0),k=.1*easeIO(clamp(gt/G.freeze,0,1));
      rig.eye=mix3(g0.eye,c,k);rig.fwd=nl(g0.fwd,norm(sub(c,rig.eye)),k*2);rig.up=upFor(rig.fwd);rig.fov=g0.fov;},
    start(){const S=this;setStage('suck');S.fired={};S.e0=rig.eye.slice();S.f0=rig.fwd.slice();S.fov0=rig.fov;
      // the portal: in the middle of the playfield, on the logo; everything that drains now drains into it
      HOLE.u=P.UC*.3;HOLE.v=PL*.47;HOLE.w=Wp(HOLE.u,HOLE.v,0);S.pc=HOLE.w;S.ax=[S.pc[0],S.pc[2]];S.ball0=[B.u,B.v];S.tb=0;
      S.e1=UPT;S.e2=norm(cross(NRM,UPT));S.dmdC=xf(BBM,0,.115,.007);S.broke=0;S.grow=0;S.W=0;S.typed=-1;S.seg=-1;
      S.PL_={p:add(S.pc,scl(NRM,.06)),range:.9,col:[1,.4,.95],k:0,pin:true,hz:.8};
      S.L=[{p:[0,0,0],range:8,col:[1,.35,.8],k:0,pin:true,hz:.3},{p:[0,0,0],range:8,col:[.3,.85,1],k:0,pin:true,hz:.3},{p:[0,0,0],range:7,col:[1,.85,.65],k:0,pin:true,hz:.2}];
      Object.assign(api.post,{gl:0,dot:0});api.tear.a=.02;api.jit=0;api.ghost=0;api.flick=0;api.dmdPow=1;},
    warp(){const S=this;return S.W>0?[[S.pc[0],S.pc[1],S.pc[2],S.W],[NRM[0],NRM[1],NRM[2],.1+.25*S.W]]:null;},
    // the score display, from the 404 on
    dmd(g,st,gt,t){const S=this;
      if(st==='glitch'&&gt>=G.stut){const fl=Math.random()<.2;txt5(g,fl?'404':'ERROR 404',64,9,'#fff',2,'c');corruptRows(g,.22);
        if(Math.random()<.35){g.fillStyle='#fff';g.fillRect((Math.random()*120)|0,(Math.random()*28)|0,(Math.random()*24)|0,2);}return true;}
      if(st!=='suck')return false;
      const s=api.st;
      if(s<.6){txt5(g,'ERROR 404',64,9,'#fff',2,'c');if(Math.random()<.25)corruptRows(g,.15);return true;}
      if(s<1.6){const W='INITIALIZING',n=Math.min(W.length,Math.floor((s-.6)/.055)),x0=Math.round(64-tw5(W,1)/2);txt5(g,W.slice(0,n),x0,12,'#fff',1);
        g.fillStyle='#fff';if(n<W.length)g.fillRect(x0+n*6,12,5,7);else for(let i=0;i<(Math.floor(t*5)%4);i++)g.fillRect(x0+tw5(W,1)+3+i*4,17,2,2);return true;}
      if(s<3.6){const p=sstep(1.75,3.45,s),seg=Math.floor(p*24);txt5(g,'UPLOADING PLAYER 1',64,2,'#fff',1,'c');
        g.strokeStyle='#bbb';g.lineWidth=1;g.strokeRect(3.5,12.5,121,9);g.fillStyle='#fff';for(let i=0;i<seg;i++)g.fillRect(5+i*5,14,4,6);
        txt3(g,Math.round(p*100)+'%',64,25,'#ddd','c');if(s>2.6&&Math.random()<.25*sstep(2.6,3.6,s))corruptRows(g,.12);return true;}
      const on=s<3.75||Math.floor(t*9)%2===0;txt5(g,'PLAYER 1',64,1,on?'#fff':'#777',2,'c');txt5(g,'READY',64,18,'#fff',2,'c');return true;},
    update(dt,st){const S=this,t=api.st;
      if(st==='suck')return S.suck(dt,t);
      // the fall: the parts, the shaft of screens, the spiral
      const T1=S.T.parts,T2=T1+S.T.shaft,T3=T2+S.T.spiral;
      const v=t<T1?.85+.12*t:t<T2?lerp(1.2,1.45,(t-T1)/S.T.shaft):1.45+6.2*Math.pow(sstep(T2+.4,T3,t),1.5);
      S.y-=v*dt;api.vel=v;windSet(v*.5);rig.eye=[S.ax[0],S.y,S.ax[1]];
      S.hd+=(.3+1.1*sstep(T2+.8,T3,t))*dt;
      const pitch=t<T1?lerp(-1.25,-.36,easeIO(sstep(0,1.2,t)))+.06*Math.sin(t*.9):t<T2?lerp(-.32,-.1,sstep(T1,T1+1,t))+.04*Math.sin(t*1.1):lerp(-.1,-1.5707,easeIO(sstep(T2,T2+2.0,t)));
      const look=dirHP(S.hd,pitch),k0=sstep(0,1.1,t);rig.fwd=nl(S.f1,look,k0);
      const hu=dirHP(S.hd,0),ku=sstep(T2+.7,T2+2.0,t);rig.up=ortho(norm(nl(nl(S.u1,[0,1,0],k0),hu,ku)),rig.fwd);
      rig.fov=t<T2?lerp(84,62,sstep(0,1.2,t)):lerp(62,74,sstep(T2+1,T3,t));
      for(const q of S.parts||[])q.ang+=q.w*dt;
      S.lights(t<T1+1.5?1.7:1.7*(1-sstep(T1+1.5,T1+3,t)));
      tunA=t<T2?lerp(.15,.06,sstep(0,T1,t)):lerp(.06,.95,sstep(T2+.5,T3-.6,t));
      api.post.rad=(reduce?.05:.35)*(t<1?1-t:0)+(reduce?.08:.32)*sstep(T2+1.5,T3,t);LOOK.fringe=lerp(.1,.016,sstep(0,1.2,t))+.03*sstep(T2+2,T3,t);
      // the beats
      if(t>=T1-.5)S.once('walls',()=>{SX.pad([52,59,64,67],S.T.shaft,.02);SX.drone(S.T.shaft);});
      if(t>=T1+3.1)S.once('p1',()=>{SX.jingle();S.flash=api.t;});
      if(t>=T2-.3)S.once('helix',()=>{S.buildHelix();SX.riser(S.T.spiral+.4,.12);SX.pad([48,55,60,64,67],S.T.spiral,.022);});
      if(t>=T3){const u=rig.up;plunge({T:2.0,v0:v,roll:Math.PI*.9,roll0:Math.atan2(-u[0],-u[2]),layers:3});api.dyn=[BALL_L];}},
    suck(dt,s){const S=this;
      // the frozen screen speaks, then a bar fills while the portal opens and takes the art, the ball and then you
      if(s>=.55)S.once('unsil',()=>SX.unsilence());
      const n=s>=.6&&s<1.6?Math.min(12,Math.floor((s-.6)/.055)):-1;if(n!==S.typed&&n>0){S.typed=n;SX.typeTick();}
      const seg=s>=1.75&&s<3.6?Math.floor(sstep(1.75,3.45,s)*24):-1;if(seg!==S.seg&&seg>=0){S.seg=seg;tone(420+seg*38,now(),.035,'square',.02);}
      if(s>=1.8)S.once('portal',()=>{const k=S.slow||1;SX.swell(2.6*k,70,2600,.14,.7);SX.drone(3*k);SX.crackle(10);});
      if(s>=3.6)S.once('ready',()=>{SX.jingle();SX.suck(.9);});
      api.pow=s<2.6?1:(Math.random()<.22*sstep(2.6,4,s)?.25:1);api.dim=.15;api.dmdPow=1;
      const pr=s<1.8?0:.025+.17*easeO(sstep(1.8,3.1,s))+.16*sstep(3.6,4.25,s);S.pr=pr;
      api.carve=pr>0&&!S.broke?{c:add(S.pc,scl(NRM,-.004)),r:pr,y0:-1e9,k:100,col:[1,.55,.95]}:null;
      S.W=.3*sstep(1.9,3.4,s)+.45*sstep(3.6,4.2,s);
      if(s>=2.0){if(!S.vx){S.vx=1;api.vxT=0;buildVortex();}api.vxT+=dt*.55;updateVortex(dt*.55);api.drainR=pr*1.5+api.vxT*.12;}
      const bk=sstep(2.2,3.1,s);B.u=lerp(S.ball0[0],HOLE.u,bk*bk);B.v=lerp(S.ball0[1],HOLE.v,bk*bk);B.h=R-.09*sstep(2.85,3.25,s);
      const cv=sstep(2.4,4.2,s);api.jit=.0025*cv;for(const f of P.flip)f.held=cv>.15&&Math.random()<.5*cv;for(const b of P.bumpers)if(Math.random()<.15*cv){b.flash=1;b.ring=1;}physTick(dt);
      S.PL_.k=1.6*sstep(1.8,2.6,s)*(1+.25*Math.sin(s*14));api.dyn=S.broke?S.L:[S.PL_];
      tunA=.04;
      if(s<3.6){// push in on the portal, the score display kept at the top of the frame
        const e=easeIO(sstep(1.3,3.6,s)),E=add(add(S.pc,scl(NRM,1.1)),scl(UPT,-.95)),tg=mix3(S.pc,S.dmdC,.42);
        rig.eye=mix3(S.e0,E,e);rig.fwd=nl(S.f0,norm(sub(tg,rig.eye)),e);rig.up=upFor(rig.fwd);rig.fov=lerp(S.fov0,54,e);
        shake(.0045*cv*cv);S.E36=rig.eye.slice();S.F36=rig.fwd.slice();S.U36=rig.up.slice();}
      else{// the pull: in and through
        const e1=easeIO(sstep(3.6,4.0,s)),e2=Math.pow(sstep(4.0,4.4,s),2),A1=add(S.pc,scl(NRM,.4));
        rig.eye=e2>0?mix3(A1,sub(S.pc,scl(NRM,.6)),e2):mix3(S.E36,A1,e1);
        rig.fwd=nl(S.F36,scl(NRM,-1),e1);rig.up=ortho(nl(S.U36,UPT,e1),rig.fwd);rig.fov=lerp(54,62,e1)+26*e2;shake(.005*(1-e2));
        api.post.rad=(reduce?.1:.5)*e2;LOOK.fringe=lerp(.012,.09,e2);}
      if(!S.broke&&s>=4.0&&dot3(sub(rig.eye,S.pc),NRM)<.02){S.broke=1;VARS.c.buildParts.call(S);const hp=Math.atan2(-UPT[0],-UPT[2])+.95;
        // mostly ahead of where you'll be looking, and a little below
        S.parts.forEach((q,i)=>{q.sc*=.62;for(const pp of q.parts)pp.emi=(pp.emi||0)+.35;const a=hp+((i*.618)%1-.5)*2.7,el=-1.05+((i*.37)%1)*1.35,r=1.35+((i*.53)%1)*1.5;q.base=[Math.sin(a)*r,el,Math.cos(a)*r];});api.tableOn=false;api.carve=null;S.W=0;api.exp=1.2;S.cam0=rig.eye.slice();burst();}
      if(S.broke){S.grow=sstep(S.tb||(S.tb=s),S.T.suck+.6,s);S.lights(2.2);}
      if(s>=S.T.suck){setStage('drift');S.y=rig.eye[1];S.f1=rig.fwd.slice();S.u1=rig.up.slice();S.hd=Math.atan2(-UPT[0],-UPT[2])+.5;S.buildWalls();
        SX.pad([48,55,60,63],S.T.parts+1,.022);}},
    lights(k){const S=this,e=rig.eye,t=api.t;S.L[0].p=[e[0]+Math.cos(t*.6)*1.8,e[1]+1,e[2]+Math.sin(t*.6)*1.8];S.L[1].p=[e[0]-Math.cos(t*.6)*1.8,e[1]-.6,e[2]-Math.sin(t*.6)*1.8];
      S.L[2].p=[e[0],e[1]-1.6,e[2]];for(const L of S.L){L.k=k;L.hz=.03;}api.dyn=S.L;},
    // the parts: in the table, then ballooned round you, then (as the shaft begins) falling away below
    pose(q){const S=this,st=api.stage,e=rig.eye,u=st==='suck'?S.grow:1,t=st==='drift'?api.st:0,f=Math.max(0,t-S.T.parts+.7);
      const tw=xf(PFM,q.c[0],q.c[1],q.c[2]),dr=add(add([S.ax[0],e[1],S.ax[1]],q.base),[q.vr[0]*t,q.vr[1]*t-f*f*(1+.3*q.base[1]),q.vr[2]*t]);
      const p=mix3(tw,dr,u),sc=lerp(1,q.sc,u*u);
      return chain(mT(...p),mRX(TH*(1-u)),mRot(q.ax,q.ang*u),mS(sc,sc,sc),q.local?m4():mT(-q.c[0],-q.c[1],-q.c[2]));},
    draw(){const S=this,st=api.stage;if(!S.parts||!(st==='suck'&&S.broke||st==='drift'&&api.st<S.T.parts+4))return;
      gl.uniform4f(P_LIT.u.uCarve,0,0,0,0);
      for(const q of S.parts){const M=S.pose(q);if(M[13]<rig.eye[1]-9)continue;
        for(const pp of q.parts)drawLit(pp.m,pp.y?mmul(M,mT(0,pp.y,0)):M,{emi:pp.emi??0,tint:pp.tint,mode:pp.mode,tex:pp.tex});}
      setCarve();},
    // the shaft: four walls of screens, three across, a row every 92 cm; each lights as it comes into view
    buildWalls(){const S=this;S.walls=[];let k=0;const D=2.15;
      for(let wall=0;wall<4;wall++){const a=wall*Math.PI/2,n=[-Math.sin(a),0,-Math.cos(a)],c=[Math.sin(a)*D,0,Math.cos(a)*D],rt=[Math.cos(a),0,-Math.sin(a)];
        for(let row=0;row<15;row++)for(let col=-1;col<=1;col++)S.walls.push({k:k++,row,col,p:[S.ax[0]+c[0]+rt[0]*col*1.42,S.y-1.9-row*.92,S.ax[1]+c[2]+rt[2]*col*1.42],n,ph:Math.random()*10,on:-1,dl:Math.random()*.25});}
      // PLAYER 1, across three screens by three
      const cv=mkCanvas(112,63),g=cv.getContext('2d');g.fillStyle='#07040e';g.fillRect(0,0,112,63);
      gradText(g,'PLAYER 1',56,15,2,GRAD.pink);gradText(g,'READY',56,38,1,GRAD.cyan);
      S.mosaic=texFrom(cv,true);},
    buildHelix(){const S=this;S.helix=[];for(let k=0;k<16;k++){const y=S.y-2.4-k*1.15,a=S.hd+.9+k*.78;S.helix.push({k:k+3,y,a,ph:Math.random()*10});}},
    screens(){const S=this;if(api.stage!=='drift')return;const e=rig.eye,t=api.st,T1=S.T.parts,mz=t>=T1+3.1&&t<T1+4.5;
      if(S.walls&&t>T1-.6&&t<T1+S.T.shaft+1.2)for(const q of S.walls){const dy=q.p[1]-e[1];if(dy<-2.9||dy>2.4)continue;
        if(q.on<0&&dy>-2.6&&t>T1-.6+q.dl){q.on=t;if(q.k%5===0)S.click();}if(q.on<0)continue;
        const a=t-q.on,pw=(a<.06?1.8:a<.12?.2:a<.2?1.3:1)*sstep(2.9,1.9,Math.abs(dy))*1.1,M=faceM(q.p,q.n,1.3,1.3*.5625);
        if(mz)drawSheet(S.mosaic,[0,0,1,1],[112,63],M,pw*(t-T1-3.1<.08?2:1.15));else drawGame(q.k,M,pw,q.ph);}
      if(S.helix)for(const q of S.helix){const dy=e[1]-q.y;if(dy<-1.5||dy>9)continue;
        const a=q.a+.35*t,p=[S.ax[0]+Math.sin(a)*2.05,q.y,S.ax[1]+Math.cos(a)*2.05],n=norm(sub([S.ax[0],q.y+1.7,S.ax[1]],p)),w=1.45;
        drawGame(q.k,faceM(p,n,w,w*aspectOf(q.k)),1.2*sstep(9,6,dy)*(1-sstep(-.4,-1.5,dy)),q.ph);}},
    click(){const t=now();noise(t,.02,.035,5000,2400,'bandpass');tone(1900,t,.015,'square',.012);},
    points(pt,t){const S=this,st=api.stage;
      if(st==='suck'&&S.pr>0&&!S.broke){const s=api.st,pr=S.pr;
        // the portal: a rim of dots turning both ways, a swirl draining inward, sparks lifting off
        for(let i=0;i<72;i++){const a=i/72*TAU+(i%2?1:-1)*s*1.6,c=i%2?PAL[1]:PAL[0],p=add(S.pc,add(scl(S.e1,Math.cos(a)*pr),add(scl(S.e2,Math.sin(a)*pr),scl(NRM,.004))));pt(p[0],p[1],p[2],c[0],c[1],c[2],1.7,.0075);}
        for(let i=0;i<110;i++){const f=(i*.6180339+s*.7)%1,r=pr*(1-f)*.95,a=i*2.399+s*2.2+f*5,c=PAL[(i%3)+2],p=add(S.pc,add(scl(S.e1,Math.cos(a)*r),add(scl(S.e2,Math.sin(a)*r),scl(NRM,-.03*f))));pt(p[0],p[1],p[2],c[0],c[1],c[2],1.1*(1-f*.5),.005);}
        for(let i=0;i<40;i++){const f=(i*.37+s*.5)%1,a=i*1.7,r=pr*(.6+.5*((i*.29)%1)),p=add(S.pc,add(scl(S.e1,Math.cos(a)*r),add(scl(S.e2,Math.sin(a)*r),scl(NRM,f*.45))));pt(p[0],p[1],p[2],1,.6,.95,1.2*(1-f),.004);}}
      if(st==='drift'&&S.walls){const T1=S.T.parts,e=rig.eye;if(t>0&&api.st>T1-.6&&api.st<T1+S.T.shaft+1)
        for(let c=0;c<4;c++){const a=c*Math.PI/2+Math.PI/4,x=S.ax[0]+Math.sin(a)*3.05,z=S.ax[1]+Math.cos(a)*3.05;
          for(let i=-14;i<=12;i++){const y=Math.round(e[1]/.25)*.25+i*.25,lit=((i+Math.floor(t*16))%6+6)%6===0;pt(x,y,z,c%2?.18:1,c%2?.9:.18,c%2?1:.6,lit?1.5:.22,.03);}}}},
    end(){const S=this;if(S.mosaic)gl.deleteTexture(S.mosaic);S.mosaic=null;S.parts=null;S.walls=null;S.helix=null;endShared();}
  };

  /* ===== E · UPLOAD, PACED =====
     D as it is, with more time to read: the power-up runs 50% slower, and the glitch, the 404 and the upload 25%
     slower, up to PLAYER 1 READY. From the pull through the portal on, it's D's timing exactly. */
  VARS.e=Object.assign(Object.create(VARS.d),{name:'Upload, paced',slow:1.25,bootRate:1/1.5,
    init(){VARS.d.init.call(this);for(const k in G)G[k]*=this.slow;this.at=G.freeze;},
    rate(s){return s<3.6?1/this.slow:1;}});
