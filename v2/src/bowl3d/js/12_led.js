/* =====================================================================================
   12. LED SCREENS IN THE ALLEY — the masking unit over our pins (192 x 82 dots) and the
       overhead monitor (160 x 50). The strike, spare, turkey, split and gutter cartoons are
       the original's, drawn in greys and quantised to 16 amber steps with an ordered dither.
   ===================================================================================== */
const BAY4=new Float32Array([0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16));
const DMD={on:false,kind:'',t:0,dur:2.5,txt:'',sub:''};
function dmd(kind,txt,sub){Object.assign(DMD,{on:true,kind,t:0,txt,sub:sub||'',dur:kind==='perfect'?4.4:kind==='turkey'?3:2.6});}
let dg=mk;                                   /* the cartoons draw into whichever screen is set here */
const gy=l=>{const v=c255(l*255);return 'rgb('+v+','+v+','+v+')';};
const eob=u=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(u-1,3)+c1*Math.pow(u-1,2);};
function dBall(x,y,r,a,l,face){dg.fillStyle=gy(l);dg.beginPath();dg.arc(x,y,r,0,TAU);dg.fill();
  if(face){dg.fillStyle='#000';dg.fillRect(x-r*.45,y-r*.3,Math.max(1,r*.22),Math.max(1,r*.3));dg.fillRect(x+r*.22,y-r*.3,Math.max(1,r*.22),Math.max(1,r*.3));
    dg.beginPath();dg.arc(x,y+r*.55,r*.32,Math.PI*1.15,Math.PI*1.85);dg.lineWidth=Math.max(1,r*.12);dg.strokeStyle='#000';dg.stroke();return;}
  dg.fillStyle=gy(l*.25);const c=Math.cos(a),s=Math.sin(a);
  for(const [hx,hy,hr] of [[-.3,-.28,.15],[.08,-.42,.14],[.06,.08,.17]]){dg.beginPath();dg.arc(x+(hx*c-hy*s)*r,y+(hx*s+hy*c)*r,hr*r,0,TAU);dg.fill();}
  dg.fillStyle=gy(1);dg.beginPath();dg.arc(x-r*.42,y-r*.42,r*.13,0,TAU);dg.fill();}
function dPin(cx,cy,s,a,l){dg.save();dg.translate(cx,cy);dg.rotate(a);dg.translate(0,7*s);dg.fillStyle=gy(l);
  dg.beginPath();dg.ellipse(0,-4.5*s,2.4*s,4.4*s,0,0,TAU);dg.fill();dg.fillRect(-.95*s,-10.6*s,1.9*s,4.4*s);
  dg.beginPath();dg.arc(0,-12.6*s,1.4*s,0,TAU);dg.fill();dg.fillStyle=gy(l*.35);dg.fillRect(-1.05*s,-9.7*s,2.1*s,.55*s);dg.fillRect(-1*s,-8.8*s,2*s,.55*s);dg.restore();}
function dStar(x,y,r,l){if(l<=0||r<=0)return;dg.fillStyle=gy(l);dg.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,q=i&1?r*.3:r;dg.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}dg.fill();}
/* a word centred at (cx,cy), scale may be fractional; wave = per-letter bounce amplitude */
function dWord(s,cx,cy,sc,l,wave,t,out){const w=tw5(s,1);dg.save();dg.translate(Math.round(cx),Math.round(cy));dg.scale(sc,sc);
  let x=-w/2;for(let i=0;i<s.length;i++){const yy=-3.5+(wave?Math.sin(t*9-i*.8)*wave:0);if(out!==false)for(const [ox,oy] of O8)txt5(dg,s[i],x+ox/sc,yy+oy/sc,'#000',1);txt5(dg,s[i],x,yy,gy(l),1);x+=6;}dg.restore();}
function wordScale(s,w,h){return Math.max(1,Math.min(Math.floor((h-4)/9),Math.floor((w-10)/tw5(s,1))));}
function fireworks(t,w,h,n,seed){for(let k=0;k<n;k++){const t0=jsh(seed+k)*1.6,u=t-t0;if(u<0||u>1.1)continue;const cx=w*(.1+.8*jsh(seed+k*3.1)),cy=h*(.2+.4*jsh(seed+k*7.7));
  for(let i=0;i<14;i++){const a=i/14*TAU,r=u*h*.55;dg.fillStyle=gy(1-u*.8);dg.fillRect(cx+Math.cos(a)*r,cy+Math.sin(a)*r+u*u*h*.3,1.4,1.4);}}}
function dmdDraw(w,h){
  const t=DMD.t,k=DMD.kind,T=DMD.txt,cy=h/2;dg.setTransform(1,0,0,1,0,0);dg.fillStyle='#000';dg.fillRect(0,0,w,h);
  const SC=wordScale(T,w,h);
  if(k==='strike'||k==='bagger'){
    /* beat 1: the ball barrels in and the rack explodes; beat 2: impact frame; beat 3: the word slams in */
    const hit=.4,px=w*.6,ps=h*.05;
    if(t<hit+.08){const u=clamp(t/hit,0,1),bx=lerp(-h*.3,px-h*.26,Math.pow(u,1.5));
      for(let i=0;i<5;i++){dg.fillStyle=gy(.25+.12*i);dg.fillRect(bx-h*.32-i*9-(t*90%9),cy+h*(-.14+.08*i),6+i*3,1);}dBall(bx,cy+h*.14,h*.22,t*16,.9);}
    for(let i=0;i<4;i++){const bx0=px+(i-1.5)*h*.22,pcy=cy+h*.1;
      if(t<hit)dPin(bx0,pcy,ps,Math.sin(t*30+i)*(t>hit-.06?.25:0),.92);
      else{const u=t-hit,vx=(i-1.2)*w*1.1+w*.35,vy=-h*(3.2+jsh(i)*2.2);if(u<.6)dPin(bx0+vx*u,pcy+vy*u+h*9*u*u,ps,(i-1.4)*16*u,.92);}}
    if(t>hit&&t<hit+.06){dg.fillStyle='#fff';dg.fillRect(0,0,w,h);}
    if(t>hit)for(let i=0;i<14;i++){const a=i*2.39,r=(t-hit)*w*.7*(.4+jsh(i+3));dStar(px+Math.cos(a)*r,cy+Math.sin(a)*r*.45,1.5+2*Math.abs(Math.sin(t*14+i)),.9*(1-clamp((t-hit)/1.1,0,1)));}
    if(k==='bagger')fireworks(t-.4,w,h,6,11);
    if(t>hit+.16){const u=clamp((t-hit-.16)/.3,0,1),sc=u<1?SC*(1+(1-eob(u))*2.4):SC;dWord(T,w/2,cy+(u<1?0:Math.sin(t*6)*.6),sc,1,0,t);}}
  else if(k==='perfect'){fireworks(t,w,h,9,3);fireworks(t-1.6,w,h,9,29);const fl=(t*5|0)%2,s2=Math.max(1,Math.min(Math.floor((h-6)/18),Math.floor((w-10)/tw5(T,1))));
    dWord(T,w/2,h*.28,s2,1,1.2,t);dWord('300',w/2,h*.74,s2,fl?1:.55,0,t);}
  else if(k==='turkey'){
    const x=lerp(w+h*.7,-h*.7,t/DMD.dur),y=h*.78,bob=Math.abs(Math.sin(t*11))*h*.04,R=h*.95;
    for(let i=0;i<7;i++){const a=Math.PI*(1.05+i*.15);dg.fillStyle=gy(i&1?.5:.78);dg.beginPath();dg.ellipse(x+R*.1+Math.cos(a)*R*.2,y-bob-R*.12+Math.sin(a)*R*.22,R*.06,R*.15,a+Math.PI/2,0,TAU);dg.fill();}
    dg.fillStyle=gy(.68);dg.beginPath();dg.ellipse(x,y-bob,R*.17,R*.13,0,0,TAU);dg.fill();
    const hx=x-R*.17,hy=y-bob-R*.2+Math.sin(t*22)*R*.02;dg.fillRect(hx,hy,R*.05,R*.14);dg.beginPath();dg.arc(hx+R*.02,hy,R*.065,0,TAU);dg.fill();
    dg.fillStyle=gy(1);dg.beginPath();dg.moveTo(hx-R*.04,hy);dg.lineTo(hx-R*.11,hy+R*.02);dg.lineTo(hx-R*.04,hy+R*.04);dg.fill();
    dg.fillStyle=gy(.45);dg.fillRect(hx-R*.03,hy+R*.03,R*.03,R*.07);dg.fillStyle='#000';dg.fillRect(hx,hy-R*.025,1.2,1.2);
    const lg=Math.sin(t*11)*R*.05;dg.fillStyle=gy(.9);dg.fillRect(x-R*.04+lg,y-bob+R*.1,1.5,R*.15+bob);dg.fillRect(x+R*.04-lg,y-bob+R*.1,1.5,R*.15+bob);
    const s2=Math.max(1,Math.min(SC,Math.floor(h*.36/7)));dWord(T,w/2,h*.2,s2,1,1,t);
    if(t>.8&&t<1.9&&(t*6|0)%2)txt3(dg,'GOBBLE!',Math.round(x-R*.5),Math.round(y-bob-R*.5),gy(.95),1,'r');
    dWord('X X X',w*.86,h*.2,1,.75,0,t,false);}
  else if(k==='spare'){
    const pxp=w*.5,ps=h*.052,hit=.5;
    if(t<hit)dPin(pxp,cy+h*.12,ps,Math.sin(t*26)*.25*sstep(0,.4,t),.92);
    else{const u=t-hit;dPin(pxp-w*.6*u,cy+h*.12-h*1.2*u+h*3*u*u,ps,-9*u,.92);}
    if(t<hit+.12){const bx=lerp(w+h*.3,pxp,clamp(t/hit,0,1));dBall(bx,cy+h*.22,h*.2,-t*16,.85);}
    if(t>hit){const u=clamp((t-hit)/.3,0,1),sx=lerp(-w*.3,w*1.3,u);dg.fillStyle=gy(.9);dg.save();dg.translate(sx,cy);dg.rotate(.5);dg.fillRect(-3,-h,6,h*2);dg.restore();
      if(t>hit+.12){const v=clamp((t-hit-.12)/.25,0,1);dWord(T,lerp(-w*.4,w/2,eob(v)),cy,SC,1,0,t);}}}
  else if(k==='gutter'){
    dg.fillStyle=gy(.35);dg.fillRect(0,h*.62,w,1);dg.fillRect(0,h*.92,w,1);
    const u=clamp(t/1.1,0,1),bx=lerp(-h*.2,w*.62,u),dropT=clamp((u-.45)/.25,0,1),by=lerp(h*.62-h*.15,h*.92-h*.16,dropT*dropT);
    dBall(bx,by,h*.15,0,.8,true);
    const ws=Math.max(1,Math.min(SC,Math.floor((h*.55)/7))),tw=tw5(T,ws);let x=w/2-tw/2;
    for(let i=0;i<T.length;i++){const t0=.15+i*.08,uu=t-t0;if(uu>0){const fy=Math.min(1,uu*2.2),bounce=Math.abs(Math.sin(Math.min(uu*6,Math.PI)))*(1-fy)*h*.2;
      const yy=lerp(-10,h*.08,fy*fy)-bounce+(uu>1.1?Math.sin(i*1.7)*2:0);txt5(dg,T[i],x,yy,gy(.95),ws);}x+=6*ws;}}
  else if(k==='split'){
    const ps=h*.05,sh=Math.sin(t*40)*.18*Math.max(0,1-t/1.6),sp=sstep(.2,.9,t);
    dPin(w*.07,cy+h*.1,ps,sh,.9);dPin(w*.93,cy+h*.1,ps,-sh,.9);
    const ix=T.indexOf('SPLIT'),a=T.slice(0,ix+3),bb=T.slice(ix+3),sc=Math.max(1,Math.min(SC,Math.floor((w*.72)/tw5(T,1)))),wa=tw5(a,sc),wb=tw5(bb,sc),tot=wa+wb+6*sc;
    const gap=Math.min(sp*w*.12,Math.max(0,(w*.76-tot)/2));txt5(dg,a,w/2-tot/2-gap,cy-3.5*sc,gy(1),sc);txt5(dg,bb,w/2-tot/2+wa+6*sc-sc+gap,cy-3.5*sc,gy(1),sc);
    for(let i=0;i<3;i++){dg.fillStyle=gy(.4);dg.fillRect(w/2-1,cy-h*.3+i*h*.25,2,h*.12);}}
  else {dWord(T,w/2,cy,SC,1,0,t);}
}
/* quantise a grey drawing to amber dots */
function amber(ctx,w,h){const id=ctx.getImageData(0,0,w,h),d=id.data;
  for(let y=0;y<h;y++){const br=(y&3)<<2;for(let x=0;x<w;x++){const i=(y*w+x)*4,l=d[i]/255,q=Math.floor(l*15+BAY4[br|(x&3)]*.999)/15;d[i]=16+239*q;d[i+1]=6+160*q;d[i+2]=2+68*q;d[i+3]=255;}}
  ctx.putImageData(id,0,0);}
/* ---------- the masking unit: starfield, ringed planet, the logo; flashes a word on a strike; cartoons when the DMD runs ---------- */
let MKmsg='',MKt=0;
function maskMsg(s,d){MKmsg=s;MKt=d;}
const MKSTARS=(()=>{const r=mulberry(11),a=[];for(let i=0;i<90;i++)a.push([r()*192|0,r()*46|0,r(),mixC([120,170,255],[255,130,230],r())]);return a;})();
function paintMask(){
  const w=192,h=82,t=S.t,x=mk;x.setTransform(1,0,0,1,0,0);
  if(DMD.on){dg=mk;dmdDraw(w,h);amber(mk,w,h);x.fillStyle='#ff9a30';x.fillRect(0,h-1,w,1);MK_MAT.userData.tex.needsUpdate=true;return;}
  x.fillStyle='#000';x.fillRect(0,0,w,h);
  for(const [sx,sy,b,c] of MKSTARS){const k=.55+.45*Math.sin(t*2.2+b*40);x.fillStyle=rgba(c,(.25+.75*b)*k);const xx=(sx+t*4*(.3+b))%w|0;x.fillRect(xx,sy,b>.9?2:1,b>.9?2:1);}
  const gd=x.createRadialGradient(156,17,1,160,22,14);gd.addColorStop(0,'#ffd0f0');gd.addColorStop(1,'#7a2a9a');x.fillStyle=gd;x.beginPath();x.arc(160,22,13,0,TAU);x.fill();
  x.strokeStyle='#5ff0ff';x.lineWidth=1.5;x.beginPath();x.ellipse(160,22,25,6,-.3,0,TAU);x.stroke();
  x.fillStyle='#ff5ab4';for(let i=0;i<w;i+=2)x.fillRect(i,44+Math.round(Math.sin(i*.25+t*3)*2),2,1);
  const fl=MKt>0&&(MKt*7|0)%2;
  if(MKmsg){const sc=tw5(MKmsg,3)<=184?3:2;txt5(x,MKmsg,96,66-7*sc,fl?GR.volt:GR.pink,sc,'c');
    for(let i=0;i<19;i++){x.fillStyle=(i+(fl?1:0))%2?'#ffd040':'#ff2f9a';x.fillRect(4+i*10,76,4,3);}}
  else{txt5(x,'STRIKE NIGHT',96,52,GR.cyan,2,'c');txt5(x,'LANE 7',96,70,'#ff9ad0',1,'c');}
  MK_MAT.userData.tex.needsUpdate=true;
}
/* ---------- the overhead monitor: the score sheet, the frame, the total; cartoons in the lower band ---------- */
function paintOverhead(){
  const w=160,h=50,x=ov;x.setTransform(1,0,0,1,0,0);x.fillStyle='#000';x.fillRect(0,0,w,h);
  drawSheet(x,w,13);
  const rs=G.rs||rackState(G.rolls),by=17,bh=h-by;
  if(DMD.on){const c=OVB.getContext('2d',{willReadFrequently:true});dg=c;dmdDraw(w,bh);amber(c,w,bh);x.drawImage(OVB,0,by);dg=mk;}
  else{
    const tot=String(G.sheet?G.sheet.total:0);
    txt3(x,G.over||S.mode==='over'?'FINAL':'FRAME '+(rs.f+1),6,by+5,'#c8c0ff');txt3(x,G.over||S.mode==='over'?'':'BALL '+(rs.b+1),6,by+13,'#7ce8ff');
    txt5(x,tot,w-6,by+6,GR.volt,3,'r');
    const m=standMask(PW),rows=[[6,7,8,9],[3,4,5],[1,2],[0]];
    for(let r=0;r<4;r++)for(let j=0;j<rows[r].length;j++){const i=rows[r][j],px=70+Math.round((j-(rows[r].length-1)/2)*7),py=by+5+r*6;x.fillStyle=(m>>i&1)?'#ffffff':'#2c2650';x.fillRect(px-1,py-1,3,3);}
    if(S.mode==='title'&&(S.t*2|0)%2)txt3(x,'INSERT PLAYER',6,by+22,'#ffb040');
  }
  OV_MAT.userData.tex.needsUpdate=true;
}
const OVB=document.createElement('canvas');OVB.width=160;OVB.height=33;
