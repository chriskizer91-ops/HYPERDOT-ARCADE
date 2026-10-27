/* ===================== particles & hit effects (world space, meters) ===================== */
const FXL=[];
function fxp(o){if(FXL.length<1100)FXL.push(o);return o;}
const C_W=[255,255,255],C_Y=[255,214,70],C_O=[255,140,40],C_C=[90,230,255],C_R=[255,60,90],C_V=[190,110,255];
function spark(x,y,kind,dir,dmg){
  const k=clamp((dmg||40)/60,.5,2.2);
  const burst=(n,cols,sp,len,life)=>{for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rnd(.5,1)*sp,b=dir*.6;fxp({k:'spk',x,y,vx:Math.cos(a)*v+b*v*.4,vy:Math.sin(a)*v,life:life*rnd(.6,1),max:life,col:pick(cols),len});}};
  switch(kind){
    case 'block':burst(8,[C_C,C_W],4,.1,9);fxp({k:'ring',x,y,r0:.05,r1:.32,life:9,max:9,col:C_C,w:1});fxp({k:'flash',x,y,r:.2,life:5,max:5,col:C_C});break;
    case 'light':burst(9*k|0,[C_Y,C_W,C_W],5,.12,10);fxp({k:'flash',x,y,r:.24,life:5,max:5,col:C_W});fxp({k:'ring',x,y,r0:.05,r1:.3,life:8,max:8,col:C_Y,w:1});break;
    case 'heavy':burst(16*k|0,[C_Y,C_W,C_O],7,.18,13);fxp({k:'flash',x,y,r:.42*k,life:7,max:7,col:C_W});fxp({k:'ring',x,y,r0:.1,r1:.7*k,life:12,max:12,col:C_Y,w:2});
      for(let i=0;i<6;i++)fxp({k:'dot',x,y,vx:rnd(-3,3),vy:rnd(0,4),g:9,life:rnd(14,26),max:26,col:C_O,s:.025});break;
    case 'elec':burst(10*k|0,[C_C,C_W,C_Y],6,.14,11);fxp({k:'flash',x,y,r:.36*k,life:6,max:6,col:C_Y});elecBurst(x,y,.5*k,6);break;
    case 'slash':for(let i=0;i<2;i++)fxp({k:'slash',x,y,a:rnd(-.7,.7)+(i?Math.PI/2:0),len:rnd(.6,.9)*k,life:9,max:9,col:i?C_W:C_R});burst(8,[C_R,C_W],5,.12,10);fxp({k:'flash',x,y,r:.25,life:5,max:5,col:C_R});break;
    case 'plasma':fxp({k:'ring',x,y,r0:.05,r1:.5*k,life:12,max:12,col:C_V,w:2});fxp({k:'ring',x,y,r0:.02,r1:.3*k,life:9,max:9,col:C_W,w:1});burst(10,[C_V,C_W,C_C],4,.1,12);fxp({k:'flash',x,y,r:.35,life:6,max:6,col:C_V});break;
    case 'super':burst(36,[C_W,C_Y,C_O,C_C],9,.3,22);for(let i=0;i<3;i++)fxp({k:'ring',x,y,r0:.1,r1:1.4+i*.5,life:18+i*6,max:18+i*6,col:i?C_Y:C_W,w:3-i});fxp({k:'flash',x,y,r:1.2,life:12,max:12,col:C_W});elecBurst(x,y,1.2,10);break;
  }
}
function elecBurst(x,y,r,n){for(let i=0;i<n;i++){const a=Math.random()*TAU,l=rnd(.4,1)*r;fxp({k:'bolt',x0:x,y0:y,x1:x+Math.cos(a)*l,y1:y+Math.sin(a)*l,life:rnd(4,8)|0,max:8,col:Math.random()<.5?C_C:C_Y,w:1});}}
function dust(x,y,n,dir){for(let i=0;i<n;i++)fxp({k:'dust',x:x+rnd(-.2,.2),y:y+.02,vx:rnd(-1.2,1.2)+dir*.8,vy:rnd(.1,.9),life:rnd(18,34),max:34,s:rnd(.06,.12),col:[150,140,160]});}
function ring(x,y,col,r0,r1,life,w){fxp({k:'ring',x,y,r0,r1,life,max:life,col,w:w||1,flat:y<.2});}
function puff(x,y,col){for(let i=0;i<14;i++){const a=i/14*TAU;fxp({k:'dust',x:x+Math.cos(a)*.15,y:y+Math.sin(a)*.3,vx:Math.cos(a)*1.6,vy:Math.sin(a)*1.6,life:rnd(14,24),max:24,s:rnd(.08,.14),col:[90,80,110]});}
  fxp({k:'ring',x,y,r0:.1,r1:.7,life:10,max:10,col,w:2});fxp({k:'flash',x,y,r:.4,life:6,max:6,col});}
function auraFx(F,kind){
  const J=F.J,h=F.def.body.h,cx=F.x+J.chest[0]*F.face,cy=F.y+J.chest[1];
  if(kind==='elec'){if(Math.random()<.5){const p=Math.random()<.5?J.haN:J.haF,x=F.x+p[0]*F.face,y=F.y+p[1];elecBurst(x,y,.35,1);}
    if(Math.random()<.25)fxp({k:'bolt',x0:cx+rnd(-.3,.3),y0:F.y+rnd(.1,.4),x1:cx+rnd(-.3,.3),y1:F.y+rnd(1,1.7)*h,life:4,max:4,col:C_C,w:1});}
  else if(kind==='plasma'){for(let i=0;i<2;i++){const a=Math.random()*TAU;fxp({k:'dot',x:cx+Math.cos(a)*.5,y:cy+Math.sin(a)*.6,vx:-Math.cos(a)*1.2,vy:-Math.sin(a)*1.2,g:0,life:16,max:16,col:Math.random()<.5?C_V:C_C,s:.02});}}
  else if(kind==='petal'){if(Math.random()<.8)fxp({k:'petal',x:cx+rnd(-1,1),y:cy+rnd(-.4,1),vx:rnd(-1,1),vy:rnd(-.6,.4),life:40,max:40,a:rnd(0,TAU),col:[255,150,190]});}
}
function superFx(F){
  if(!F)return;const J=F.J,cx=F.x+J.chest[0]*F.face,cy=F.y+J.chest[1];
  if(FIGHT.superT%6===1)fxp({k:'ring',x:cx,y:cy,r0:1.6,r1:.1,life:14,max:14,col:F.def.glow,w:2});
  if(Math.random()<.6)elecBurst(cx+rnd(-.3,.3),cy+rnd(-.5,.5),.5,1);
  for(let i=0;i<2;i++){const a=Math.random()*TAU;fxp({k:'spk',x:cx+Math.cos(a)*1.4,y:cy+Math.sin(a)*1.4,vx:-Math.cos(a)*6,vy:-Math.sin(a)*6,life:10,max:10,col:F.def.glow,len:.3});}
}
let EXCITE=0;function crowd(k){EXCITE=Math.min(3,EXCITE+k);if(k>.5)SFX.crowd(Math.min(1.5,k));}
function updFX(){
  for(const p of FXL){
    p.life--;
    switch(p.k){
      case 'spk':p.x+=p.vx/60;p.y+=p.vy/60;p.vx*=.9;p.vy=p.vy*.9-.05;break;
      case 'dot':case 'deb':p.vy-=(p.g||0)/60;p.x+=p.vx/60;p.y+=p.vy/60;if(p.y<0&&p.k==='deb'){p.y=0;p.vy*=-.35;p.vx*=.6;}break;
      case 'dust':p.x+=p.vx/60;p.y+=p.vy/60;p.vx*=.93;p.vy*=.93;p.s*=1.025;break;
      case 'petal':p.x+=p.vx/60+Math.sin(p.life*.2)*.01;p.y+=p.vy/60;p.a+=.15;break;
    }
  }
  let j=0;for(let i=0;i<FXL.length;i++)if(FXL[i].life>0)FXL[j++]=FXL[i];FXL.length=j;
  EXCITE*=.992;
}
/* ---------- drawing helpers (screen space) ---------- */
const WX=x=>VIEW.ox+x*VIEW.S,WY=y=>VIEW.oy-y*VIEW.S;
function zig(x0,y0,x1,y1,n,amp,col,w){
  g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(x0,y0);
  const dx=x1-x0,dy=y1-y0,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;
  for(let i=1;i<n;i++){const t=i/n,o=(Math.random()*2-1)*amp;g.lineTo(x0+dx*t+nx*o,y0+dy*t+ny*o);}
  g.lineTo(x1,y1);g.stroke();
}
function glow(x,y,r,col,a){const gr=g.createRadialGradient(x,y,0,x,y,Math.max(.5,r));gr.addColorStop(0,rgba(col,a));gr.addColorStop(1,rgba(col,0));g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
function drawFX(){
  const S=VIEW.S;g.save();g.globalCompositeOperation='lighter';
  for(const p of FXL){
    const f=p.life/p.max;
    switch(p.k){
      case 'spk':{const x=WX(p.x),y=WY(p.y),l=p.len*S;const v=Math.hypot(p.vx,p.vy)||1;g.strokeStyle=rgba(p.col,Math.min(1,f*1.6));g.lineWidth=Math.max(1,S*.012);
        g.beginPath();g.moveTo(x,y);g.lineTo(x-p.vx/v*l*f,y+p.vy/v*l*f);g.stroke();break;}
      case 'dot':g.fillStyle=rgba(p.col,Math.min(1,f*1.5));{const s=Math.max(1,p.s*S);g.fillRect(WX(p.x)-s/2,WY(p.y)-s/2,s,s);}break;
      case 'ring':{const r=lerp(p.r1,p.r0,f)*S;g.strokeStyle=rgba(p.col,f);g.lineWidth=Math.max(1,p.w*S*.012*(1+f));g.beginPath();if(p.flat)g.ellipse(WX(p.x),WY(p.y),r,r*.22,0,0,TAU);else g.arc(WX(p.x),WY(p.y),r,0,TAU);g.stroke();break;}
      case 'flash':glow(WX(p.x),WY(p.y),p.r*S*(1.4-f*.4),p.col,f);break;
      case 'bolt':zig(WX(p.x0),WY(p.y0),WX(p.x1),WY(p.y1),5,S*.05,rgba(p.col,Math.min(1,f*2)),Math.max(1,S*.012));break;
      case 'slash':{const x=WX(p.x),y=WY(p.y),l=p.len*S,c=Math.cos(p.a),s=Math.sin(p.a),e=1-f;g.strokeStyle=rgba(p.col,f);g.lineWidth=Math.max(1,S*.02*f+1);
        g.beginPath();g.moveTo(x-c*l*.5*e-c*l*.2,y-s*l*.5*e);g.lineTo(x+c*l*.5,y+s*l*.5);g.stroke();break;}
      case 'petal':{g.fillStyle=rgba(p.col,Math.min(1,f*2));const x=WX(p.x),y=WY(p.y),s=Math.max(1,S*.03);g.fillRect(x,y,s,Math.max(1,s*Math.abs(Math.sin(p.a))));break;}
    }
  }
  g.restore();
  for(const p of FXL){const f=p.life/p.max;
    if(p.k==='dust'){g.fillStyle=rgba(p.col,.32*f);const r=p.s*S;g.beginPath();g.arc(WX(p.x),WY(p.y),Math.max(1,r),0,TAU);g.fill();}
    else if(p.k==='deb'){g.fillStyle=rgba(p.col,Math.min(1,f*2));const s=Math.max(1,p.s*S);g.fillRect(WX(p.x)-s/2,WY(p.y)-s,s,s);}}
}
function drawProj(){
  const S=VIEW.S;
  for(const p of PROJ){
    if(p.dead)continue;const x=WX(p.x),y=WY(p.y),r=p.r*S,t=PT[p.type];
    g.save();g.globalCompositeOperation='lighter';
    switch(t.draw){
      case 'bolt':case 'prism':{const c=t.draw==='prism'?C_C:C_Y;glow(x,y,r*2.4,c,.75);glow(x,y,r*1.1,C_W,.9);
        for(let i=0;i<4;i++){const a=Math.random()*TAU;zig(x,y,x+Math.cos(a)*r*1.6,y+Math.sin(a)*r*1.6,4,r*.3,rgba(i%2?C_W:c,.9),1);}
        g.fillStyle='#fff';g.beginPath();g.arc(x,y,Math.max(1,r*.45),0,TAU);g.fill();
        if(p.t%2===0)fxp({k:'dot',x:p.x,y:p.y+rnd(-.08,.08),vx:-p.vx*.15,vy:rnd(-.3,.3),g:0,life:12,max:12,col:c,s:.03});break;}
      case 'star':{glow(x,y,r*2,C_R,.5);g.fillStyle='#f0f4ff';g.beginPath();for(let i=0;i<8;i++){const a=p.spin*1.6+i/8*TAU,rr=i%2?r*.38:r*1.1;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();g.fill();
        g.fillStyle='#ff2a48';g.beginPath();g.arc(x,y,Math.max(1,r*.25),0,TAU);g.fill();break;}
      case 'rock':{g.globalCompositeOperation='source-over';g.fillStyle='#6a5444';g.beginPath();for(let i=0;i<7;i++){const a=p.spin*.5+i/7*TAU,rr=r*(.85+.15*Math.sin(i*2.7));g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();g.fill();
        g.fillStyle='#9a8068';g.beginPath();g.arc(x-r*.25,y-r*.25,r*.45,0,TAU);g.fill();g.fillStyle='#2a1c14';g.fillRect(x+r*.1,y,Math.max(1,r*.3),Math.max(1,r*.2));break;}
      case 'orb':{glow(x,y,r*2.2,C_V,.7);glow(x,y,r,C_W,.7);g.strokeStyle=rgba(C_C,.8);g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.ellipse(x,y,r*(.7+i*.15),r*.3,p.spin+i*1.1,0,TAU);g.stroke();}
        if(p.t%2===0)fxp({k:'dot',x:p.x,y:p.y,vx:-p.vx*.1+rnd(-.4,.4),vy:rnd(-.4,.4),g:0,life:16,max:16,col:C_V,s:.03});break;}
      case 'quake':{for(let i=0;i<3;i++)zig(x+rnd(-r,r),WY(0),x+rnd(-r,r),WY(rnd(.25,.6)),4,r*.25,rgba(i?C_Y:C_W,.9),1);glow(x,WY(.05),r*2,C_Y,.5);if(p.t%2===0)dust(p.x,0,1,0);break;}
      case 'halo':{const ry=r*.45;g.strokeStyle=rgba(C_V,.9);g.lineWidth=Math.max(1,S*.03);g.beginPath();g.ellipse(x,y,r,ry,0,0,TAU);g.stroke();g.strokeStyle=rgba(C_W,.9);g.lineWidth=1;g.beginPath();g.ellipse(x,y,r*.92,ry*.92,0,p.spin,p.spin+2);g.stroke();glow(x,y,r*1.2,C_V,.25);break;}
      case 'well':{const on=p.on,a=on?.95:.45,gy=WY(.03);for(let i=0;i<4;i++){g.strokeStyle=rgba(i%2?C_C:C_V,a*(1-i*.18));g.lineWidth=1;g.beginPath();g.ellipse(x,gy,r*(1-i*.2),r*.22*(1-i*.2),0,p.spin*(i%2?1:-1),p.spin*(i%2?1:-1)+4.5);g.stroke();}
        glow(x,gy,r*(on?1.3:.8),C_V,on?.5:.2);if(on&&p.t%3===0)fxp({k:'dot',x:p.x+rnd(-.6,.6),y:rnd(.05,1.2),vx:0,vy:-1.5,g:0,life:20,max:20,col:C_V,s:.025});break;}
      case 'nova':{glow(x,y,r*2.2,C_V,.8);glow(x,y,r*1.2,C_C,.6);glow(x,y,r*.7,C_W,1);for(let i=0;i<3;i++){g.strokeStyle=rgba(C_W,.6);g.lineWidth=1;g.beginPath();g.arc(x,y,r*(1+((p.t*.05+i/3)%1)),0,TAU);g.stroke();}break;}
      case 'beam':{const col=t.col,x1=p.face>0?W+20:-20,hh=r*(1+.15*Math.sin(p.t*.9));
        g.fillStyle=rgba(col,.35);g.fillRect(Math.min(x,x1),y-hh*1.8,Math.abs(x1-x),hh*3.6);
        g.fillStyle=rgba(col,.85);g.fillRect(Math.min(x,x1),y-hh,Math.abs(x1-x),hh*2);
        g.fillStyle='#fff';g.fillRect(Math.min(x,x1),y-hh*.45,Math.abs(x1-x),hh*.9);
        for(let i=0;i<3;i++)zig(x,y+rnd(-hh,hh),x1,y+rnd(-hh,hh),18,hh*1.4,rgba(i%2?C_W:col,.9),1);
        glow(x,y,hh*4,col,.9);glow(x,y,hh*2,C_W,1);break;}
    }
    g.restore();
  }
}
/* ---------- the fight scene ---------- */
const GY=()=>Math.round(H*.86);
function updHolo(){HOLOX.fill(0);if(Math.random()<.35){const y0=(Math.random()*H)|0,n=2+(Math.random()*5|0),o=(Math.random()<.5?-1:1)*(1+(Math.random()*3|0));for(let i=0;i<n;i++)HOLOX[(y0+i)&511]=o;}}
function drawActor(F){
  let mode=F.flashT>0?1:F.def.look.holo?3:0;
  const m=F.move,sp=F.state==='attack'&&m&&m.spin&&F.mf>=m.spin[0]&&F.mf<=m.spin[1],of=F.face;
  if(sp&&((F.mf>>2)&1))F.face=-F.face;
  if(mode===3)updHolo();
  drawFighter(F,{mode});F.face=of;
  if(F.state==='attack'&&m&&m.hold&&F.mf>=m.hold[0]&&F.mf<=m.hold[1]){const J=F.Jr,hx=(J.haN[0]+J.haF[0])/2,hy=(J.haN[1]+J.haF[1])/2+.12;F._hold=[F.x+hx*F.face,F.y+hy];}else F._hold=null;
}
function drawTrails(F){
  for(const t of F.trail){const k=t.life/t.max;setGhost(F.def.glow,clamp(t.a*k*.7,0,1));
    drawFighter({def:F.def,x:t.x,y:t.y,face:t.face,Jr:t.Jr,chains:null,hurtT:0,state:'idle'},{mode:2});}
}
function drawShadow(F){
  const S=VIEW.S,k=1/(1+F.y*.8),rx=.36*F.def.body.bulk*S*k,x=WX(F.x+F.Jr.H[0]*F.face*.5),y=WY(0)+1;
  g.fillStyle=`rgba(0,0,0,${.45*k})`;g.beginPath();g.ellipse(x,y,rx,Math.max(1,rx*.2),0,0,TAU);g.fill();
}
function setView(){
  const S=H/CAM.vh,sh=CAM.shake>.002&&!reduce?CAM.shake:0,shx=sh?rnd(-1,1)*sh:0,shy=sh?rnd(-1,1)*sh*.6:0;
  VIEW.S=S;VIEW.ox=W/2-(CAM.x+shx)*S;VIEW.oy=GY()+(CAM.y+shy)*S;
}
function renderScene(){
  setView();
  const [A,B]=FIGHT.f,order=A.top?[B,A]:[A,B];
  RBUF.fill(0);fullClip();
  for(const F of order){drawTrails(F);if(!F.hidden)drawActor(F);}
  acx.putImageData(AIMG,0,0);
  STAGE.bg();
  if(SUPERF>0){g.fillStyle='rgba(0,0,0,.66)';g.fillRect(0,0,W,H);speedLines(SUPEROWN);}
  if(STAGE.reflect){const gy=WY(0);g.save();g.beginPath();g.rect(0,gy,W,H-gy);g.clip();g.globalAlpha=STAGE.reflect;g.translate(0,gy*2);g.scale(1,-1);g.drawImage(ac,0,0);g.restore();}
  for(const F of order)if(!F.hidden)drawShadow(F);
  g.drawImage(ac,0,0);
  for(const F of order)if(F._hold){const x=WX(F._hold[0]),y=WY(F._hold[1]),r=.28*VIEW.S;g.fillStyle='#6a5444';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.fillStyle='#9a8068';g.beginPath();g.arc(x-r*.3,y-r*.3,r*.4,0,TAU);g.fill();}
  drawProj();drawFX();
  if(STAGE.fg)STAGE.fg();
}
function speedLines(F){
  if(!F)return;const cx=WX(F.x),cy=WY(F.y+1.1*F.def.body.h);g.save();g.globalCompositeOperation='lighter';
  for(let i=0;i<26;i++){const a=Math.random()*TAU,r0=rnd(.25,.45)*W,r1=r0+rnd(.2,.5)*W;g.strokeStyle=rgba(F.def.glow,.5);g.lineWidth=1;g.beginPath();g.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);g.lineTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);g.stroke();}
  glow(cx,cy,VIEW.S*1.4,F.def.glow,.35);g.restore();
}
