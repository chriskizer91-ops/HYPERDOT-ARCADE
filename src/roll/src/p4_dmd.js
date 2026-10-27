/* =====================================================================================
   9d. AMBER DMD SCORE PANEL — the top rows of the matrix are a classic 1990s pinball DMD:
   a float brightness buffer drawn with chunky scaled glyphs, sparkles, rays and wipes, then
   quantized to 16 amber steps (ordered dither between steps) independently of the colour lane.
   Scenes queue up (a dunk, a gutter, the final ball) and play over the base scoreboard.
   ===================================================================================== */
let DG=null,DSC=2;
const AMB=new Uint32Array(16);
for(let l=0;l<16;l++){const k=l/15,lin=Math.pow(k,1.15);AMB[l]=l===0?pack(14,5,2):pack(255*Math.pow(lin,1/2.2),255*Math.pow(lin*.42,1/2.2),255*Math.pow(lin*.075,1/2.2));}
RESCB.unshift(()=>{DH=Math.round(H*.19);Y0=DH+1;VH3=H-Y0;DG=new Float32Array(W*DH);DSC=Math.max(2,Math.floor((DH-5)/7));});
function dClear(){DG.fill(0);}
function dFill(x0,y0,x1,y1,v,set){x0=Math.max(0,x0|0);y0=Math.max(0,y0|0);x1=Math.min(W,x1|0);y1=Math.min(DH,y1|0);
  for(let y=y0;y<y1;y++){let i=y*W+x0;for(let x=x0;x<x1;x++,i++){if(set)DG[i]=v;else if(v>DG[i])DG[i]=v;}}}
function dPx(x,y,v){x|=0;y|=0;if(x>=0&&y>=0&&x<W&&y<DH){const i=y*W+x;if(v>DG[i])DG[i]=v;}}
/* scaled glyph text (scale may be fractional: that is what makes the zooms chunky).
   flags: 1 = bevel (top rows brighter), 2 = knock out a 1-dot outline first, 4 = italic lean */
function dTxt(s,x,y,sc,v,al,f,fl){
  const w=f===3?tw3(s,1):tw5(s,1);if(al==='c')x-=w*sc/2;else if(al==='r')x-=w*sc;
  const rows=f===3?5:7;
  for(let pass=(fl&2)?0:1;pass<2;pass++){let cx=0;
    for(const ch of s){
      if(f===3){const gg=G3[ch]||G3[ch.toUpperCase()];if(!gg){cx+=4;continue;}
        for(let r=0;r<5;r++)for(let c=0;c<gg[r].length;c++)if(gg[r][c]==='1')cell(cx+c,r);cx+=gg[0].length+1;}
      else{const gl=G5[ch]||G5[ch.toUpperCase()]||G5[' '];for(let r=0;r<7;r++)for(let c=0;c<5;c++)if((gl[r]>>(4-c))&1)cell(cx+c,r);cx+=6;}
    }
    function cell(c,r){const lean=(fl&4)?(rows-1-r)*sc*.22:0,X0=Math.round(x+c*sc+lean),X1=Math.round(x+(c+1)*sc+lean),Y0_=Math.round(y+r*sc),Y1_=Math.round(y+(r+1)*sc);
      if(pass===0)dFill(X0-1,Y0_-1,X1+1,Y1_+1,0,true);
      else dFill(X0,Y0_,X1,Y1_,(fl&1)?v*(1-.42*r/(rows-1)):v,false);}
  }
  return w*sc;
}
/* four-point sparkle */
function dStar(x,y,s,v){dPx(x,y,v);for(let k=1;k<=s;k++){const q=v*(1-k/(s+1));dPx(x+k,y,q);dPx(x-k,y,q);dPx(x,y+k,q);dPx(x,y-k,q);}if(s>1){dPx(x+1,y+1,v*.35);dPx(x-1,y-1,v*.35);dPx(x+1,y-1,v*.35);dPx(x-1,y+1,v*.35);}}
/* rotating sunburst behind a zoom */
function dRays(cx,cy,t,v,n){for(let y=0;y<DH;y++)for(let x=0;x<W;x++){const a=Math.atan2(y-cy,(x-cx)*.45),f=(a/Math.PI*n+t)%2;if((f<0?f+2:f)<1){const i=y*W+x;if(v>DG[i])DG[i]=v;}}}
/* expanding dithered ring (fireworks) */
function dRing(cx,cy,r,v){const n=Math.max(8,r*6|0);for(let k=0;k<n;k++){const a=k/n*TAU;dPx(cx+Math.cos(a)*r*1.6,cy+Math.sin(a)*r,v);}}
/* lamp chase around the DMD border */
function dBorder(t,v){const per=2*(W+DH),n=per/4|0;for(let k=0;k<n;k++){const on=((k+Math.floor(t*14))%4)===0;let p=k*4;let x,y;
  if(p<W){x=p;y=0;}else if((p-=W)<DH){x=W-1;y=p;}else if((p-=DH)<W){x=W-1-p;y=DH-1;}else{p-=W;x=0;y=DH-1-p;}dPx(x,y,on?v:v*.18);}}
function dmdCommit(){
  for(let y=0;y<DH;y++){const br=(y&3)<<2;for(let x=0;x<W;x++){const i=y*W+x;let l=(DG[i]*15+BAY4[br|(x&3)]*.98)|0;if(l>15)l=15;if(l<0)l=0;RBUF[i]=AMB[l];}}
  const bz=pack(36,30,40);for(let y=DH;y<Y0;y++)RBUF.fill(bz,y*W,(y+1)*W);
}
const easeOutBack=(t,s=1.9)=>{t-=1;return t*t*((s+1)*t+s)+1;};
const easeBounce=t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375;};
/* ---- DMD scenes ---- */
const DQ=[];let DCUR=null;
function dmdPush(type,data,dur){DQ.push({type,data:data||{},dur,t:0});}
function dmdTick(dt){if(!DCUR&&DQ.length)DCUR=DQ.shift();if(DCUR){DCUR.t+=dt;if(DCUR.t>=DCUR.dur)DCUR=DQ.length?DQ.shift():null;}}
function dmdBusy(){return !!DCUR||DQ.length>0;}
function dmdBase(){
  /* the scoreboard: ball pips on the left, big score centre, high score and last ball on the right */
  const sc=DSC,ys=Math.round((DH-7*sc)/2);
  dTxt(String(S.disp),W/2,ys,sc,1,'c',5,1);
  const shown=S.mode==='over'?S.balls:Math.min(S.balls,S.thrown+(S.ballReady?1:0));
  dTxt('BALL '+Math.max(1,Math.min(S.balls,shown)),4,3,1,.75,'l',3,0);
  const pip=DH>=30?4:3,gap=pip+2;for(let k=0;k<S.balls;k++){const x=4+k*gap,y=DH-pip-3,used=k<S.thrown,cur=k===S.thrown&&S.ballReady;
    const v=used?.13:cur?(Math.sin(S.t*10)>0?1:.45):.8;for(let yy=0;yy<pip;yy++)for(let xx=0;xx<pip;xx++)dPx(x+xx,y+yy,(xx===0||xx===pip-1)&&(yy===0||yy===pip-1)&&pip>3?v*.45:v);}
  dTxt('HI '+fmt(S.hi),W-4,3,1,.62,'r',3,0);
  if(S.last!==null)dTxt('LAST '+S.last,W-4,DH-8,1,.85,'r',3,0);
}
function dmdScene(sc){
  const t=sc.t,d=sc.data,big=DSC,cx=W/2,cy=DH/2;
  switch(sc.type){
    case 'score':{ /* "40!" punches in over a sunburst, sparkles, then flies home into the score */
      const val=d.val,p=val/50;
      if(t<.1){dFill(0,0,W,DH,(t*30|0)%2?1:.55,true);dTxt(val+'!',cx,cy-3.5*big*1.25,big*1.25,0,'c',5,0);break;}
      dRays(cx,cy,t*2.5,.1+.08*p,6+val/10);
      const zt=Math.min(1,(t-.1)/.35),s=big*(.35+.95*easeOutBack(zt)),ft=clamp((t-1.0)/.3,0,1);
      const s2=lerp(s,big*.5,ft*ft),y=lerp(cy-3.5*s2,cy-3.5*s2,ft),x=lerp(cx,cx,ft);
      dTxt(val+'!',x,y,s2,1-ft*.6,'c',5,1|2|4);
      const n=3+val/5|0;for(let k=0;k<n;k++){const a=k*2.4+t*1.3,rr=(W*.18+k*3)*(.7+.3*Math.sin(t*5+k)),tw=Math.sin(t*14+k*1.7);if(tw>.2)dStar(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.35,tw>.8?2:1,tw);}
      if(d.sub)dTxt(d.sub,6,cy-2,1,.7*(1-ft),'l',3,0),dTxt(d.sub,W-6,cy-2,1,.7*(1-ft),'r',3,0);
      break;}
    case 'jackpot':{
      const st=t<.5&&((t*24|0)%2);if(st)dFill(0,0,W,DH,.8,true);
      for(let k=0;k<5;k++){const tt=(t*1.4+k*.37)%1,fx=(hash1(k*91+((t*1.4+k*.37)|0)*7)*.8+.1)*W,fy=hash1(k*13+((t*1.4+k*.37)|0))*DH;dRing(fx,fy,tt*DH*.45,(1-tt)*.7);}
      const zt=Math.min(1,t/.4),s=big*(.3+1.0*easeOutBack(zt,2.4));dTxt('100',cx,cy-3.5*s,s,st?0:1,'c',5,1|2);
      const tx=W-((t*W*.9)%(W+140));dTxt('POCKET JACKPOT',tx,DH-6,1,.9,'l',3,2);dBorder(t,1);break;}
    case 'gutter':{
      const yy=-DH+(DH*.5+DH*.5*easeBounce(Math.min(1,t/.7)))-3.5*big*.75;dTxt(d.txt||'GUTTER',cx,yy,big*.75|0||1,1,'c',5,1|2);
      const bx=(t/1.1)*W*.6+W*.2,by=DH-4+(bx>W*.62?Math.min(8,(bx-W*.62)*.4):0);for(let a=0;a<TAU;a+=.5)dPx(bx+Math.cos(a)*2,by+Math.sin(a)*2,.8);
      dFill(0,DH-1,W*.6,DH,.5);dFill(W*.72,DH-1,W,DH,.5);break;}
    case 'short':{
      const k=easeOutBack(Math.min(1,t/.45),1.2),x=lerp(W*1.5,cx,k);dTxt(d.txt,x,cy-3.5*big*.75,Math.max(1,big*.75|0),1,'c',5,1|2|4);
      for(let q=0;q<6;q++)dPx(x+tw5(d.txt,Math.max(1,big*.75|0))/2+4+q*3+((t*40)%3),cy+3+(q%3),.4*(1-t));break;}
    case 'ball':{
      const k=Math.min(1,t/.25),wx=k*W;dTxt('BALL '+d.n,cx,cy-3.5*big,big,1,'c',5,1|2);
      for(let y=0;y<DH;y++)for(let x=Math.max(0,wx|0);x<W;x++){const i=y*W+x;if(BAY4[((y&3)<<2)|(x&3)]>(x-wx)/12)DG[i]=0;}break;}
    case 'final':{
      dBorder(t,1);const on=(t*6|0)%2===0||t>1;dTxt('FINAL BALL',cx,cy-3.5*Math.max(1,big-1),Math.max(1,big-1),on?1:.25,'c',5,1|2);break;}
    case 'perfect':{dFill(0,0,W,DH,(t*20|0)%2?.6:0,true);dTxt('PERFECT 900',cx,cy-3.5*Math.max(1,big-1),Math.max(1,big-1),1,'c',5,1|2);dBorder(t,1);break;}
  }
}
/* attract pages cycle on the DMD while the alley plays itself */
function dmdAttract(t){
  const pages=['logo','start','hi','howto','start','tix'],per=[5,2.2,2.6,3.4,2.2,2.6],tot=per.reduce((a,b)=>a+b,0);let tt=t%tot,pg=0;while(tt>per[pg]){tt-=per[pg];pg++;}
  const cx=W/2,cy=DH/2,big=DSC;
  if(pages[pg]==='logo'){
    const sc=Math.min(big,Math.floor((W-8)/tw5('RING ROLLER',1))),w=tw5('RING ROLLER',sc),x0=Math.round(cx-w/2),y0=Math.round(cy-3.5*sc);
    dTxt('RING ROLLER',cx+1,y0+1,sc,.22,'c',5,0);dTxt('RING ROLLER',cx,y0,sc,.78,'c',5,1|2);
    /* shine sweep: a bright diagonal band passing over the lettering */
    const sp=((tt*.7)%1.4-.2)*(w+DH*2)+x0-DH;for(let y=y0;y<y0+7*sc&&y<DH;y++)for(let x=x0;x<x0+w;x++){const i=y*W+x;if(DG[i]>.3){const q=Math.abs(x+(y-y0)*.6-sp);if(q<4)DG[i]=Math.min(1,DG[i]+.35*(1-q/4));}}
    for(let k=0;k<6;k++){const tw=Math.sin(t*9+k*2.1);if(tw>.5)dStar((hash1(k*31+(t*.7|0))*W)|0,(hash1(k*17+(t*.7|0))*DH)|0,1,tw);}
  }else if(pages[pg]==='hi'){dTxt('HIGH SCORE',cx,2,1,.7,'c',3,0);dTxt(fmt(S.hi),cx,DH-7*Math.max(1,big-1)-2,Math.max(1,big-1),1,'c',5,1|2);}
  else if(pages[pg]==='start'){const on=(t*3|0)%2===0;dBorder(t,.8);dTxt(touchy?'TAP TO PLAY':'PRESS START',cx,cy-3.5*Math.max(1,big-1),Math.max(1,big-1),on?1:.35,'c',5,1|2);}
  else if(pages[pg]==='howto'){const a=tt<1.7;dTxt(a?(touchy?'SWIPE UP':'DRAG BACK'):'CURVE THE FLICK',cx,3,1,.85,'c',3,0);dTxt(a?'AND FLICK':'FOR SPIN',cx,DH-7*Math.max(1,big-1)-2,Math.max(1,big-1),1,'c',5,1|2);}
  else{dTxt('9 BALLS',cx,2,1,.7,'c',3,0);dTxt('ROLL FOR 900',cx,DH-7*Math.max(1,big-1)-2,Math.max(1,big-1),1,'c',5,1|2);}
}
function dmdOver(t){
  const cx=W/2,cy=DH/2,big=DSC,tt=t%7;
  if(tt<2.4){dTxt('GAME OVER',cx,cy-3.5*Math.max(1,big-1),Math.max(1,big-1),(t*4|0)%2||t>1.2?1:.3,'c',5,1|2);}
  else if(tt<4.8){dTxt('FINAL SCORE',cx,2,1,.7,'c',3,0);dTxt(fmt(S.score),cx,DH-7*Math.max(1,big-1)-2,Math.max(1,big-1),1,'c',5,1|2);}
  else{dTxt('TICKETS',cx,2,1,.7,'c',3,0);dTxt(String(S.tixShown),cx,DH-7*Math.max(1,big-1)-2,Math.max(1,big-1),1,'c',5,1|2);}
}
function renderDMD(){
  dClear();
  if(DCUR)dmdScene(DCUR);
  else if(S.mode==='title')dmdAttract(S.t);
  else if(S.mode==='over')dmdOver(S.t);
  else dmdBase();
  if(S.paused){dClear();dTxt('PAUSED',W/2,DH/2-3.5*Math.max(1,DSC-1),Math.max(1,DSC-1),(S.rt*2|0)%2?1:.5,'c',5,1|2);}
  dmdCommit();
}
