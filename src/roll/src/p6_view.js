/* =====================================================================================
   9f. VIEW — compose a frame: cached G-buffer -> deferred shade -> ray-cast ball -> sparks,
   trail, aim guide -> DMD panel -> HUD. Plus the ticket strip on the results screen.
   ===================================================================================== */
/* tickets feed out of a slot as a chain of verlet links that sways and piles on the floor */
const TIX={pts:[],rest:[],n:0,target:0,feed:0,rate:10,ax:0,ay:0,done:false,
  reset(){this.pts.length=0;this.rest.length=0;this.n=0;this.target=0;this.feed=0;this.done=false;S.tixShown=0;},
  start(n){this.reset();this.target=n;this.rate=clamp(n/2.4,7,60);this.ax=W/2;this.ay=Y0+Math.round(VH3*.54);this.pts.push({x:this.ax,y:this.ay,ox:this.ax,oy:this.ay});this.pts.push({x:this.ax,y:this.ay,ox:this.ax,oy:this.ay});this.rest.push(0);},
  tick(dt){
    if(!this.pts.length)return;const L=Math.max(3,Math.round(W/56));
    if(this.n<this.target&&S.t>.9){this.feed+=this.rate*dt;
      while(this.feed>=1&&this.n<this.target){this.feed-=1;this.n++;S.tixShown=this.n;SFX.ticket();
        if(this.pts.length<64){this.rest[0]=L;this.pts.splice(1,0,{x:this.ax,y:this.ay+.5,ox:this.ax,oy:this.ay+.5});this.rest.unshift(0);}}
      this.rest[0]=Math.min(L,this.feed*L);
    }else if(this.n>=this.target&&!this.done&&S.t>.9){this.done=true;this.rest[0]=L;}
    const P=this.pts,g2=260*dt*dt,fl=H-2;
    for(let i=1;i<P.length;i++){const p=P[i],vx=(p.x-p.ox)*.985,vy=(p.y-p.oy)*.985;p.ox=p.x;p.oy=p.y;p.x+=vx+Math.sin(S.rt*1.7+i*.4)*.012;p.y+=vy+g2;
      if(p.y>fl){p.y=fl;p.x-=vx*.4;}if(p.x<2)p.x=2;if(p.x>W-3)p.x=W-3;}
    for(let it=0;it<8;it++){P[0].x=this.ax;P[0].y=this.ay;
      for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-6,df=(d-this.rest[i])/d;
        if(i===0){b.x-=dx*df;b.y-=dy*df;}else{a.x+=dx*df*.5;a.y+=dy*df*.5;b.x-=dx*df*.5;b.y-=dy*df*.5;}}}
  },
  draw(){
    const P=this.pts;if(!P.length)return;
    /* a ribbon of tickets: each link is one ticket, perforated where it joins the next */
    const hw=Math.max(2,Math.round(W/70));
    for(let i=P.length-2;i>=0;i--){const a=P[i],b=P[i+1],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<.3)continue;
      const nx=-dy/d,ny=dx/d,c1=i%2?pack(255,150,48):pack(255,96,72),c0=i%2?pack(190,96,26):pack(180,56,44),c2=pack(70,30,14),st=Math.ceil(d*2);
      for(let s=0;s<=st;s++){const x=a.x+dx*s/st,y=a.y+dy*s/st;for(let k=-hw;k<=hw;k++)px(x+nx*k,y+ny*k,s===st&&i>0?c2:(k===-hw||k===hw)?c0:(k===0&&s===st>>1)?c0:c1);}}
    const sw=Math.round(W*.07);rect(this.ax-sw,this.ay-2,sw*2,3,pack(10,8,14));rect(this.ax-sw-1,this.ay-3,sw*2+2,1,pack(190,190,210));rect(this.ax-sw-1,this.ay+1,sw*2+2,1,pack(90,90,110));
  }
};
const GHOST=newBall();
function aimGuide(){
  /* keys/pad: preview the first stretch of the roll (straight or curving) with the current power */
  launchBall(GHOST,S.handX,S.handZ,powerSpeed(S.charging?S.pw:.55),S.aim,S.spin);
  for(let i=0;i<30;i++){physTick([GHOST],1/60,()=>{});if(GHOST.pz>PH.ZH0-.05)break;if(i%2===1){const p=project(GHOST.px,GHOST.py-PH.R*.8,GHOST.pz);if(p[2]>0){const x=p[0]|0,y=p[1]|0,a=1-i/36;
      if(y>Y0&&y<H-1&&x>0&&x<W-1){const d=pack(10,20,40);px(x-1,y,d);px(x+1,y,d);px(x,y-1,d);px(x,y+1,d);px(x,y,pack(120*a+60,230*a+20,255));}}}}
  GHOST.st='gone';
}
function shiftView(sx,sy){
  if(!sx&&!sy)return;const z=pack(4,3,8);
  if(sy>0){for(let y=H-1;y>=Y0;y--){const s=y-sy;if(s>=Y0)RBUF.copyWithin(y*W,s*W,s*W+W);else RBUF.fill(z,y*W,y*W+W);}}
  else if(sy<0){for(let y=Y0;y<H;y++){const s=y-sy;if(s<H)RBUF.copyWithin(y*W,s*W,s*W+W);else RBUF.fill(z,y*W,y*W+W);}}
  if(sx)for(let y=Y0;y<H;y++){const o=y*W;if(sx>0){RBUF.copyWithin(o+sx,o,o+W-sx);RBUF.fill(z,o,o+sx);}else{RBUF.copyWithin(o,o-sx,o+W);RBUF.fill(z,o+W+sx,o+W);}}
}
function meterDraw(){
  const x=W-8,y0=Y0+6,y1=H-10,h=y1-y0,p=S.pw;
  rect(x-2,y0-1,6,h+2,pack(20,16,30));
  for(let y=y1-1;y>=y0;y--){const k=(y1-y)/h;if(k>p)break;const c=k<.5?mixC([60,140,255],[255,214,60],k*2):mixC([255,214,60],[255,48,80],(k-.5)*2);rect(x-1,y,4,1,pack(c[0],c[1],c[2]));}
  for(const m of METER){const y=Math.round(y1-m.p*h);rect(x-4,y,2,1,pack(...RINGS[m.ring].col));}
}
let PERF={tick:0,render:0,shade:0,raster:0,n:0};
function render(){
  const t0=performance.now();
  applyCam();
  const sig=CAM.ex.toFixed(4)+CAM.ey.toFixed(4)+CAM.ez.toFixed(4)+CAM.fx.toFixed(5)+CAM.fy.toFixed(5)+CAM.F.toFixed(2)+W;
  if(sig!==CAM.sig){const r0=performance.now();rasterScene();shadeStatic();CAM.sig=sig;PERF.raster=performance.now()-r0;}
  /* transient lights: flashing rings light the board around them */
  LIGHTS.length=0;
  for(const r of RINGS)if(r.flash>.04){const o=[0,0,0];fromBoard(r.u,r.v,.12,o);LIGHTS.push({x:o[0],y:o[1],z:o[2],r:r.col[0]*r.flash*1.4,g:r.col[1]*r.flash*1.4,b:r.col[2]*r.flash*1.4,i:1,k:40});}
  CASTN=0;const b=BALL;if(b.st!=='gone'&&b.st!=='sink'){CAST[0]=b.px;CAST[1]=b.py;CAST[2]=b.pz;CASTN=1;}
  const s0=performance.now();shadeScene(S.rt);PERF.shade=performance.now()-s0;
  GZ2.fill(0,Y0*W);
  if(b.st!=='gone')drawBall(b);
  /* light trail behind a fast or flying ball, sparks, the aim guide */
  const T=S.trails;for(let i=0;i<T.length;i+=3){const a=(i/T.length)*.8;addDot(T[i],T[i+1],T[i+2],255*a,170*a,70*a,.002);}
  for(const p of S.parts){const a=clamp(p.life/p.max,0,1);addDot(p.x,p.y,p.z,p.col[0]*a,p.col[1]*a,p.col[2]*a,p.sz);}
  if(S.mode==='play'&&S.phase==='aim'&&!S.auto&&S.lastIn==='key'&&!S.paused)aimGuide();
  if(S.flash>0){const f=S.flash*.32,c=S.flashC;for(let i=Y0*W;i<W*H;i++)addPx(i,c[0]*f,c[1]*f,c[2]*f);}
  if(!reduce&&S.shake>0)shiftView(Math.round((Math.random()-.5)*S.shake*5),Math.round((Math.random()-.5)*S.shake*4));
  if(S.mode==='over'||S.paused){const k=S.paused?.4:.42;for(let i=Y0*W;i<W*H;i++){const c=RBUF[i];RBUF[i]=pack((c&255)*k,((c>>>8)&255)*k,((c>>>16)&255)*k);}}
  if(S.mode==='over')TIX.draw();
  if(S.mode==='play'&&S.phase==='aim'&&!S.auto&&(S.charging||S.lastIn==='key')&&!S.paused)meterDraw();
  renderDMD();
  commit();
  hud();
  PERF.render=performance.now()-t0;   /* everything except present() (the GPU LED pass) */
}
/* ---- text HUD on top (bitmap fonts through the 2D context) ---- */
function hud(){
  const mid=W/2,bot=H-9,bl=(S.rt*2.2|0)%2;
  for(const p of S.popups){const q=project(p.x,p.y,p.z);if(q[2]<=0)continue;const sc=W>=300?2:1;otxt5(g,p.txt,Math.round(q[0]),Math.round(q[1]-10-p.t*14),p.t<.12?'#ffffff':rgba(p.col),sc,'c');}
  if(S.mode==='title'){
    if(bl||S.t<.5)otxt5(g,touchy?'TAP TO PLAY':'PRESS START',4,bot-1,GR.volt,1,'l');otxt3(g,'HI '+fmt(S.hi),W-4,bot+1,'#ffb040',1,'r');
  }else if(S.mode==='play'){
    if(S.phase==='aim'&&!S.auto&&S.hint<2&&!S.paused){
      const m=S.lastIn==='ptr'?(touchy?'SWIPE UP TO ROLL':'DRAG BACK, FLICK UP'):'HOLD SPACE, RELEASE';
      const hy=Y0+Math.round(VH3*.6);otxt3(g,m,mid,hy,bl?'#ffe46a':'#ffb040',1,'c');if(S.lastIn!=='ptr')otxt3(g,'ARROWS AIM   UP DOWN CURVE',mid,hy+8,'#a6f3ff',1,'c');}
    if(S.phase==='aim'&&!S.auto&&Math.abs(S.spin)>.05&&!S.paused){const n=Math.min(3,Math.ceil(Math.abs(S.spin)*3)),a=(S.spin>0?'>':'<').repeat(n);otxt3(g,'CURVE '+a,4,bot,'#ff9aab',1,'l');}
    if(S.paused){otxt5(g,'PAUSED',mid,Y0+Math.round(VH3*.35),GR.steel,2,'c');otxt3(g,touchy?'TAP RESUME':'ESC TO RESUME',mid,Y0+Math.round(VH3*.35)+20,'#cfd6e6',1,'c');}
  }else if(S.mode==='over'){
    const sc=W>=250?2:1,hs=S.newHi&&W<300?1:sc,y0=Y0+Math.round(VH3*.03);
    otxt5(g,S.newHi?'NEW HIGH SCORE':'GAME OVER',mid,y0,S.newHi?GR.green:GR.volt,hs,'c',.1);
    const ys=y0+hs*7+Math.round(VH3*.04);otxt5(g,'SCORE '+fmt(S.score),mid,ys,'#ffffff',1,'c');
    const yt=ys+7+Math.round(VH3*.06);otxt5(g,String(S.tixShown),mid,yt,GR.volt,sc,'c');otxt3(g,'TICKETS',mid,yt+sc*7+2,'#ffd040',1,'c');
    if(TIX.done&&S.t>1.6&&bl)otxt3(g,touchy?'TAP TO CONTINUE':'PRESS START',mid,bot+2,'#cfd6e6',1,'c');
  }
}
