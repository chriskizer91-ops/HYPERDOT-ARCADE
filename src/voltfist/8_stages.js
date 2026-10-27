/* ===================== stages: cached parallax layers + live animation ===================== */
const STAGES={};let STAGE=null;
function mkc(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');return [c,x];}
function useStage(id){STAGE=STAGES[id];buildStage();STAGEWIND=STAGE.wind||0;setRim(STAGE.rim,STAGE.rimDir);OUTLINE=pack(STAGE.outline[0],STAGE.outline[1],STAGE.outline[2]);}
function buildStage(){if(!STAGE)return;STAGE.LW=W+260;STAGE.LB=Math.round(H*.62);STAGE.L=STAGE.build(STAGE.LW,H,STAGE.LB);STAGE.fx=STAGE.fx||{};}
RESCB.push(()=>{if(STAGE)buildStage();});
const horizon=()=>WY(0)-VIEW.S*.95;
function lay(c,f){const x=Math.round((W-STAGE.LW)/2-CAM.x*VIEW.S*f),y=Math.round(horizon()-STAGE.LB);g.drawImage(c,x,y);return [x,y];}
function sky(cols){const gr=g.createLinearGradient(0,0,0,horizon()+4);cols.forEach((c,i)=>gr.addColorStop(i/(cols.length-1),c));g.fillStyle=gr;g.fillRect(0,0,W,H);}
function floorBase(c0,c1){const hz=horizon(),gr=g.createLinearGradient(0,hz,0,H);gr.addColorStop(0,c0);gr.addColorStop(1,c1);g.fillStyle=gr;g.fillRect(0,hz,W,H-hz);}
function floorLines(col,step,aFar,aNear,n,off){
  const hz=Math.round(horizon()),gy=WY(0);g.strokeStyle=col;g.lineWidth=1;
  for(let x=-STH-4;x<=STH+4;x+=step){const sx=WX(x),sh=W/2+(sx-W/2)*.4,sb=sx+(sx-sh)*(H-gy)/Math.max(1,gy-hz);g.globalAlpha=aNear*.8;g.beginPath();g.moveTo(sh,hz);g.lineTo(sb,H);g.stroke();}
  for(let i=1;i<=n;i++){const t=((i+(off||0))%n)/n,y=hz+(H-hz)*Math.pow(t,1.9);g.globalAlpha=lerp(aFar,aNear,t);g.beginPath();g.moveTo(0,Math.round(y)+.5);g.lineTo(W,Math.round(y)+.5);g.stroke();}
  g.globalAlpha=1;
}
function bldg(x,ctx,bx,base,bw,bh,col,winA,r,cols){
  ctx.fillStyle=col;ctx.fillRect(bx,base-bh,bw,bh);
  const s=Math.max(2,Math.round(H/72));
  for(let y=base-bh+s;y<base-s;y+=s)for(let xx=bx+1;xx<bx+bw-1;xx+=s){const v=r();if(v<winA){ctx.fillStyle=cols[(v*1000|0)%cols.length];ctx.fillRect(xx,y,Math.max(1,s-1),Math.max(1,s-1));}}
}
function crowdRow(x0,x1,base,n,sc,col,seed,f){
  const r=mulberry(seed),S=VIEW.S,t=FRAMET,e=Math.min(1,EXCITE);
  for(let i=0;i<n;i++){
    const u=i/n+r()*.01,wx=x0+(x1-x0)*u,ph=r()*TAU,hs=(.85+r()*.3)*sc,bob=Math.abs(Math.sin(t*(.08+e*.12)+ph))*(1+e*3)*sc*.04;
    const x=Math.round((W-STAGE.LW)/2-CAM.x*S*f)+wx,y=base-bob;
    g.fillStyle=col;g.beginPath();g.arc(x,y-hs*.62,hs*.16,0,TAU);g.fill();g.fillRect(x-hs*.2,y-hs*.48,hs*.4,hs*.5);
    if(e>.4&&(i+((t/8)|0))%3===0){g.fillRect(x-hs*.24,y-hs*.86,Math.max(1,hs*.06),hs*.4);g.fillRect(x+hs*.18,y-hs*.86,Math.max(1,hs*.06),hs*.4);}
    if(EXCITE>.8&&r()<.02&&(t+i)%7===0){g.fillStyle='#fff';g.fillRect(x,y-hs*.7,2,2);g.fillStyle=col;}
  }
}
const RAIN=[];
function rain(n,col,wind){
  while(RAIN.length<n)RAIN.push({x:Math.random()*W,y:Math.random()*H,v:rnd(.7,1.2)});
  g.strokeStyle=col;g.lineWidth=1;g.beginPath();
  const gy=WY(0);
  for(const d of RAIN){d.y+=H*.045*d.v;d.x+=wind*d.v;if(d.y>H){d.y=-10;d.x=Math.random()*W;}if(d.x<0)d.x+=W;if(d.x>W)d.x-=W;
    g.moveTo(d.x,d.y);g.lineTo(d.x-wind*1.6,d.y-H*.04*d.v);
    if(d.y>gy-2&&d.y<gy+H*.12&&Math.random()<.04){g.fillStyle='rgba(180,200,255,.7)';g.fillRect(d.x-1,d.y,3,1);}}
  g.stroke();
}
function petals(n){
  const P=STAGE.fx.pet||(STAGE.fx.pet=[]);while(P.length<n)P.push({x:Math.random()*W,y:Math.random()*H,a:Math.random()*TAU,v:rnd(.4,1),z:rnd(.5,1.4)});
  for(const p of P){p.x+=(.6+Math.sin(FRAMET*.02+p.a)*.6)*p.z*(W/384);p.y+=.45*p.v*p.z*(H/216);p.a+=.06;if(p.y>H||p.x>W+4){p.y=-4;p.x=Math.random()*W*1.2-W*.2;}
    const s=Math.max(1,p.z*1.6*(H/216));g.fillStyle=p.z>1.1?'#ffd6e6':'#ff9ec4';g.fillRect(p.x,p.y,s,Math.max(1,s*Math.abs(Math.sin(p.a))));}
}

/* ---------- NEON ROOFTOP ---------- */
STAGES.roof={id:'roof',name:'NEON ROOFTOP',city:'SECTOR 9, 02:14',rim:[255,60,170],rimDir:1,outline:[12,4,22],wind:-2.2,music:'roof',reflect:.24,
  build(LW,H,LB){
    const r=mulberry(4);const [s,sx]=mkc(LW,H);
    for(let i=0;i<120;i++){sx.fillStyle=i%9?'rgba(200,190,255,.5)':'#fff';sx.fillRect(r()*LW|0,r()*LB*.7|0,1,1);}
    const mx=LW*.72,my=H*.17,mr=H*.085;let gr=sx.createRadialGradient(mx,my,mr*.2,mx,my,mr*3);gr.addColorStop(0,'rgba(255,200,240,.35)');gr.addColorStop(1,'rgba(255,200,240,0)');sx.fillStyle=gr;sx.fillRect(0,0,LW,H);
    sx.fillStyle='#ffe8f4';sx.beginPath();sx.arc(mx,my,mr,0,TAU);sx.fill();sx.fillStyle='#f0c8e0';for(let i=0;i<5;i++){sx.beginPath();sx.arc(mx+(r()-.5)*mr,my+(r()-.5)*mr,mr*(.1+r()*.15),0,TAU);sx.fill();}
    sx.fillStyle='rgba(40,10,60,.55)';for(let i=0;i<7;i++){const y=LB*(.15+r()*.55);sx.fillRect(r()*LW-60,y,60+r()*200,2+r()*4);}
    const [a,ax]=mkc(LW,H),cA=['#3a5cff','#ff3fa4','#ffd23f','#5af0ff','#5a6aa0'];
    for(let x=-10;x<LW;){const bw=(8+r()*20)*H/216,bh=(18+r()*58)*H/216;bldg(ax,ax,x,LB,bw,bh,'#120a26',.22,r,cA);if(r()<.3){ax.fillStyle='#120a26';ax.fillRect(x+bw/2,LB-bh-6*H/216,1,6*H/216);}x+=bw+r()*3;}
    const [b,bx]=mkc(LW,H),cB=['#5a7cff','#ff5ab4','#ffe066','#7af6ff','#ffffff'];
    const signs=[];const bill={x:LW*.5-H*.36,y:LB-H*.44,w:H*.72,h:H*.4};
    for(let x=-20;x<LW;){const bw=(22+r()*40)*H/216,bh=(40+r()*70)*H/216;
      if(x+bw>bill.x-4&&x<bill.x+bill.w+4){x=bill.x+bill.w+6;continue;}
      bldg(bx,bx,x,LB,bw,bh,'#1a1036',.3,r,cB);
      if(r()<.6)signs.push({x:x+bw*.15,y:LB-bh+bh*(.15+r()*.4),w:bw*.7,h:Math.max(6,bh*.12),c:pick(['#ff2f9a','#2fe6ff','#ffd23f','#7dff6a']),t:pick(['HOTEL','DOTS','24H','VOLT','BAR','ARCADE','NOODLE','CYBER']),ph:r()*9});
      x+=bw+r()*4;}
    bx.fillStyle='#160c2c';bx.fillRect(bill.x-4,bill.y-4,bill.w+8,bill.h+8);bx.fillRect(bill.x+bill.w*.2,bill.y+bill.h,4,LB-bill.y-bill.h);bx.fillRect(bill.x+bill.w*.8-4,bill.y+bill.h,4,LB-bill.y-bill.h);
    STAGES.roof.sg=signs;STAGES.roof.bill=bill;
    return {s,a,b};
  },
  bg(){
    sky(['#05011a','#1c0640','#4a0f5c','#8a1f6a']);
    const L=STAGE.L;lay(L.s,.03);
    if(FRAMET%600<6&&!reduce){g.fillStyle='rgba(220,200,255,.25)';g.fillRect(0,0,W,H);}
    lay(L.a,.1);
    const [bx,by]=lay(L.b,.28),S=VIEW.S;
    for(const s of STAGE.sg){const on=((FRAMET*.05+s.ph)|0)%7!==0,x=bx+s.x,y=by+s.y;g.strokeStyle=on?s.c:'#331a40';g.lineWidth=1;g.strokeRect(x+.5,y+.5,s.w,s.h);
      const sc=Math.max(1,Math.floor(s.h/9));if(on&&tw5(s.t,sc)<s.w-2)txt5(g,s.t,x+s.w/2,y+(s.h-7*sc)/2,s.c,sc,'c');}
    const B=STAGE.bill,jx=bx+B.x,jy=by+B.y;
    g.fillStyle='#0a0618';g.fillRect(jx,jy,B.w,B.h);const gr=g.createLinearGradient(0,jy,0,jy+B.h);gr.addColorStop(0,'#2a0a50');gr.addColorStop(1,'#5a1060');g.fillStyle=gr;g.fillRect(jx,jy,B.w,B.h);
    const cw=W*.56,ch=cw*B.h/B.w;g.save();g.globalAlpha=.9;g.drawImage(ac,W/2-cw/2,WY(0)-ch*.92,cw,ch,jx,jy,B.w,B.h);g.restore();
    g.fillStyle='rgba(0,0,0,.35)';for(let y=jy;y<jy+B.h;y+=2)g.fillRect(jx,y,B.w,1);
    if(((FRAMET/30)|0)%2)txt3(g,'LIVE',jx+3,jy+3,'#ff3b5c');txt3(g,'VOLTFIST',jx+B.w-3,jy+3,'#ffd23f',1,'r');
    const hx=((FRAMET*.6)%(W+200))-100,hy=H*.12;g.fillStyle='#0c0618';g.fillRect(hx-6,hy-2,12,4);g.fillRect(hx-10,hy-4,20,1);
    if(((FRAMET/10)|0)%2){g.fillStyle='#ff3030';g.fillRect(hx+5,hy,1,1);}
    g.save();g.globalCompositeOperation='lighter';const ang=Math.sin(FRAMET*.012)*.5;const gx=hx+Math.sin(ang)*H*.6;g.fillStyle='rgba(180,200,255,.07)';g.beginPath();g.moveTo(hx,hy);g.lineTo(gx-H*.12,horizon()+4);g.lineTo(gx+H*.12,horizon()+4);g.fill();g.restore();
    floorBase('#16102a','#07050e');
    const hz=horizon();g.save();g.globalCompositeOperation='lighter';for(const s of STAGE.sg){const x=bx+s.x+s.w/2;if(x<0||x>W)continue;const gr2=g.createLinearGradient(0,hz,0,H);gr2.addColorStop(0,s.c+'00');gr2.addColorStop(.4,s.c+'22');gr2.addColorStop(1,s.c+'00');g.fillStyle=gr2;g.fillRect(x-2,hz,Math.max(2,s.w*.3),H-hz);}g.restore();
    floorLines('#3a2a6a',1.5,.15,.35,7);
    g.fillStyle='#0a0614';const rx=Math.round(-CAM.x*S*.7);g.fillRect(0,hz-H*.06,W,2);for(let x=((rx%28)+28)%28-28;x<W;x+=28*H/216)g.fillRect(x,hz-H*.06,2,H*.06);
  },
  fg(){rain(110,'rgba(170,190,255,.5)',-2.4);}
};
/* ---------- BLOSSOM SHRINE ---------- */
STAGES.sakura={id:'sakura',name:'BLOSSOM SHRINE',city:'KAGE VALLEY, DUSK',rim:[255,170,90],rimDir:-1,outline:[34,10,24],wind:1.6,music:'sakura',reflect:.08,
  build(LW,H,LB){
    const r=mulberry(21);const [s,sx]=mkc(LW,H);
    const sxp=LW*.5,syp=LB-H*.04,sr=H*.2;let gr=sx.createRadialGradient(sxp,syp,sr*.3,sxp,syp,sr*3);gr.addColorStop(0,'rgba(255,220,140,.5)');gr.addColorStop(1,'rgba(255,120,90,0)');sx.fillStyle=gr;sx.fillRect(0,0,LW,H);
    gr=sx.createLinearGradient(0,syp-sr,0,syp);gr.addColorStop(0,'#fff2b0');gr.addColorStop(1,'#ff7a4a');sx.fillStyle=gr;sx.beginPath();sx.arc(sxp,syp,sr,Math.PI,TAU);sx.fill();
    sx.globalCompositeOperation='destination-out';for(let k=0;k<6;k++){const y=syp-sr*.12-k*sr*.14;sx.fillRect(sxp-sr,y,sr*2,Math.max(1,(6-k)*H/216*.6));}sx.globalCompositeOperation='source-over';
    sx.fillStyle='rgba(120,30,80,.4)';for(let i=0;i<8;i++){const y=LB*(.2+r()*.6);sx.fillRect(r()*LW-40,y,80+r()*180,1+r()*3);}
    const [a,ax]=mkc(LW,H);
    for(const [col,hgt,amp] of [['#7a2a6a',.3,.6],['#5a1a54',.22,.8]]){ax.fillStyle=col;ax.beginPath();ax.moveTo(0,LB);let x=0;while(x<LW){const w=(30+r()*60)*H/216;ax.lineTo(x+w*.5,LB-H*hgt*(.4+r()*amp));ax.lineTo(x+w,LB-H*hgt*.2*r());x+=w;}ax.lineTo(LW,LB);ax.fill();}
    const px=LW*.3,pb=LB-H*.08;ax.fillStyle='#3a0f3a';for(let k=0;k<5;k++){const w=H*(.13-k*.02),y=pb-k*H*.045;ax.fillRect(px-w*.35,y-H*.035,w*.7,H*.035);ax.beginPath();ax.moveTo(px-w*.6,y-H*.03);ax.lineTo(px+w*.6,y-H*.03);ax.lineTo(px+w*.4,y-H*.045);ax.lineTo(px-w*.4,y-H*.045);ax.fill();}
    ax.fillRect(px-1,pb-H*.3,2,H*.08);
    const [b,bx]=mkc(LW,H);
    const gx=LW*.5,gw=H*.7,gh=H*.42;bx.fillStyle='#b8142a';bx.fillRect(gx-gw*.4,LB-gh,H*.03,gh);bx.fillRect(gx+gw*.4-H*.03,LB-gh,H*.03,gh);
    bx.fillRect(gx-gw*.48,LB-gh-H*.02,gw*.96,H*.03);bx.fillStyle='#1a0610';bx.fillRect(gx-gw*.55,LB-gh-H*.045,gw*1.1,H*.025);bx.fillStyle='#b8142a';bx.fillRect(gx-gw*.42,LB-gh+H*.05,gw*.84,H*.018);
    const trees=[];
    for(let i=0;i<7;i++){const tx=r()*LW;if(Math.abs(tx-gx)<gw*.45)continue;const th=H*(.18+r()*.12);bx.fillStyle='#2a0c18';bx.fillRect(tx-1,LB-th,3,th);bx.beginPath();bx.moveTo(tx,LB-th*.6);bx.lineTo(tx+th*.3,LB-th*.95);bx.lineTo(tx+th*.32,LB-th*.9);bx.fill();
      for(let k=0;k<14;k++){const cx=tx+(r()-.4)*th*.8,cy=LB-th-(r()-.3)*th*.4,cr=th*(.1+r()*.16);bx.fillStyle=k%3?'#ff8ab8':'#ffc0d8';bx.beginPath();bx.arc(cx,cy,cr,0,TAU);bx.fill();}trees.push(tx);}
    const lan=[];for(let i=0;i<6;i++){const lx=LW*(.08+i*.17);if(Math.abs(lx-gx)<gw*.3)continue;bx.fillStyle='#4a3a3a';bx.fillRect(lx-2,LB-H*.07,4,H*.07);bx.fillRect(lx-4,LB-H*.1,8,H*.03);bx.fillRect(lx-5,LB-H*.11,10,H*.012);lan.push(lx);}
    STAGES.sakura.lan=lan;return {s,a,b};
  },
  bg(){
    sky(['#2a0b3e','#6a1a5a','#ff5a6a','#ffb45a']);
    const L=STAGE.L;lay(L.s,.03);lay(L.a,.1);const [bx,by]=lay(L.b,.28);
    for(const lx of STAGE.lan){const fl=.6+.4*Math.sin(FRAMET*.2+lx);glow(bx+lx,by+STAGE.LB-H*.085,H*.05*fl,[255,190,90],.8);g.fillStyle='#ffe0a0';g.fillRect(bx+lx-2,by+STAGE.LB-H*.095,4,Math.max(2,H*.02));}
    const bt=(FRAMET*.4)%(W+160)-80;g.fillStyle='#2a0a24';for(let i=0;i<5;i++){const x=bt+i*9*(W/384),y=H*.18+Math.sin(i*1.7)*6+Math.sin(FRAMET*.1+i)*2;g.fillRect(x-2,y,5,1);g.fillRect(x,y-((FRAMET/6+i)|0)%2,1,1);}
    floorBase('#8a4a3a','#3a1a16');
    const hz=horizon(),gy=WY(0);g.strokeStyle='#2a0e0c';g.lineWidth=1;
    for(let i=1;i<=9;i++){const t=i/9,y=Math.round(hz+(H-hz)*Math.pow(t,1.7))+.5;g.globalAlpha=.25+t*.4;g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
    g.globalAlpha=.35;for(let x=-STH-3;x<=STH+3;x+=.9){const sx=WX(x),sh=W/2+(sx-W/2)*.4,sb=sx+(sx-sh)*(H-gy)/Math.max(1,gy-hz);g.beginPath();g.moveTo(sh,hz);g.lineTo(sb,H);g.stroke();}g.globalAlpha=1;
    const gr=g.createLinearGradient(0,hz,0,hz+H*.1);gr.addColorStop(0,'rgba(255,190,120,.35)');gr.addColorStop(1,'rgba(255,190,120,0)');g.fillStyle=gr;g.fillRect(0,hz,W,H*.1);
  },
  fg(){
    petals(70);
    const sw=Math.sin(FRAMET*.03)*3;g.strokeStyle='#1a0610';g.lineWidth=1;g.beginPath();g.moveTo(-5,H*.04);g.quadraticCurveTo(W/2,H*.13+sw,W+5,H*.04);g.stroke();
    for(let i=1;i<8;i++){const t=i/8,x=t*W,y=lerp(H*.04,H*.04,t)+Math.sin(t*Math.PI)*(H*.09+sw)+2,fl=.75+.25*Math.sin(FRAMET*.15+i);glow(x,y+4,H*.035,[255,120,60],.6*fl);
      g.fillStyle=i%2?'#ff3a2a':'#ffb03a';g.fillRect(x-3,y,6,Math.max(5,H*.035));g.fillStyle='#2a0a10';g.fillRect(x-3,y,6,1);}
  }
};
/* ---------- IRONWORKS ---------- */
STAGES.foundry={id:'foundry',name:'IRONWORKS',city:'FURNACE ROW, NIGHT SHIFT',rim:[255,130,40],rimDir:1,outline:[22,8,4],wind:0,music:'foundry',reflect:.06,
  build(LW,H,LB){
    const r=mulberry(77);const [s,sx]=mkc(LW,H);
    for(let i=0;i<12;i++){sx.fillStyle=`rgba(60,30,20,${.3+r()*.3})`;const x=r()*LW,w=20+r()*60;sx.beginPath();sx.ellipse(x,LB*.4*r(),w,w*.4,0,0,TAU);sx.fill();}
    const [a,ax]=mkc(LW,H);
    for(let x=0;x<LW;){const w=(20+r()*40)*H/216,h=(30+r()*70)*H/216;ax.fillStyle='#160a06';ax.fillRect(x,LB-h,w,h);
      if(r()<.5){ax.fillRect(x+w*.3,LB-h-H*.15,w*.25,H*.15);}
      if(r()<.35){const fy=LB-h*.5,fw=w*.5;const gr=ax.createRadialGradient(x+w/2,fy,1,x+w/2,fy,fw);gr.addColorStop(0,'#ffd080');gr.addColorStop(.5,'#ff6a10');gr.addColorStop(1,'rgba(255,60,0,0)');ax.fillStyle=gr;ax.fillRect(x,fy-fw,w,fw*2);}
      x+=w+r()*6;}
    ax.strokeStyle='#241008';ax.lineWidth=Math.max(2,H/80);for(let i=0;i<5;i++){ax.beginPath();const y=LB-H*(.2+r()*.3);ax.moveTo(0,y);ax.lineTo(LW,y+(r()-.5)*20);ax.stroke();}
    const [b,bx]=mkc(LW,H);
    const cy=LB-H*.2;bx.fillStyle='#2a140a';bx.fillRect(0,cy,LW,Math.max(2,H*.012));bx.fillStyle='#1c0c06';bx.fillRect(0,cy+H*.012,LW,H*.006);
    for(let x=0;x<LW;x+=Math.round(H*.06)){bx.fillStyle='#2a140a';bx.fillRect(x,cy-H*.05,Math.max(1,H*.006),H*.05);}bx.fillRect(0,cy-H*.05,LW,Math.max(1,H*.006));
    for(let x=0;x<LW;x+=Math.round(H*.25)){bx.fillStyle='#1a0a04';bx.fillRect(x,cy,Math.max(2,H*.02),LB-cy);}
    STAGES.foundry.cy=cy;return {s,a,b};
  },
  bg(){
    sky(['#060302','#1a0804','#3a1206','#6a2408']);
    const L=STAGE.L;lay(L.s,.03);lay(L.a,.1);const [bx,by]=lay(L.b,.28);
    const lx=bx+STAGE.LW*.5+Math.sin(FRAMET*.004)*H*.05,ly=by+STAGE.LB-H*.56,lw=H*.18,tilt=.5+.25*Math.sin(FRAMET*.01);
    g.strokeStyle='#2a1208';g.lineWidth=1;g.beginPath();g.moveTo(lx-lw*.3,0);g.lineTo(lx-lw*.3,ly);g.moveTo(lx+lw*.3,0);g.lineTo(lx+lw*.3,ly);g.stroke();
    g.save();g.translate(lx,ly);g.rotate(tilt*.4);g.fillStyle='#2a1208';g.beginPath();g.moveTo(-lw/2,-lw*.2);g.lineTo(lw/2,-lw*.2);g.lineTo(lw*.38,lw*.35);g.lineTo(-lw*.38,lw*.35);g.fill();g.fillStyle='#ffb040';g.fillRect(-lw*.45,-lw*.24,lw*.9,Math.max(1,lw*.06));g.restore();
    const px=lx+lw*.45,py=ly-lw*.05,cb=by+STAGE.LB-H*.02;
    g.save();g.globalCompositeOperation='lighter';const gr=g.createLinearGradient(px,0,px+6,0);gr.addColorStop(0,'rgba(255,240,180,.9)');gr.addColorStop(1,'rgba(255,120,20,.6)');g.fillStyle=gr;
    g.beginPath();g.moveTo(px,py);g.quadraticCurveTo(px+H*.04,py+H*.05,px+H*.045+Math.sin(FRAMET*.3)*1,cb);g.lineTo(px+H*.03,cb);g.quadraticCurveTo(px+H*.028,py+H*.05,px-2,py+2);g.fill();
    glow(px+H*.04,cb,H*.16,[255,140,30],.7);g.restore();
    const ST=STAGE.fx.sp||(STAGE.fx.sp=[]);if(ST.length<60&&!reduce)for(let i=0;i<3;i++)ST.push({x:px+H*.04,y:cb,vx:rnd(-2,2)*(H/216),vy:-rnd(1,3.5)*(H/216),l:rnd(20,50)});
    for(const s of ST){s.x+=s.vx;s.y+=s.vy;s.vy+=.12*(H/216);s.l--;g.fillStyle=s.l>25?'#fff0a0':'#ff8a20';g.fillRect(s.x,s.y,1,1);}STAGE.fx.sp=ST.filter(s=>s.l>0&&s.y<H);
    crowdRow(0,STAGE.LW,by+STAGE.cy,26,H*.09,'#120804',9,.28);
    for(let i=0;i<3;i++){const x=bx+STAGE.LW*(.2+i*.3),y=by+STAGE.LB-H*.32,on=((FRAMET+i*20)>>4)%2;if(on){glow(x,y,H*.05,[255,170,0],.8);}g.fillStyle=on?'#ffd040':'#4a2a08';g.fillRect(x-2,y-2,4,4);}
    floorBase('#2a1a14','#0c0806');
    floorLines('#4a3020',.6,.2,.45,10);
    const hz=horizon(),g2r=g.createLinearGradient(0,hz-2,0,hz+H*.05);g2r.addColorStop(0,'rgba(255,120,20,.55)');g2r.addColorStop(1,'rgba(255,120,20,0)');g.fillStyle=g2r;g.fillRect(0,hz-2,W,H*.05);
    const st=Math.max(4,H*.03),y0=H-st,off=((-CAM.x*VIEW.S)%(st*2)+st*2)%(st*2);for(let x=-st*2+off;x<W;x+=st*2){g.fillStyle='#ffc21a';g.beginPath();g.moveTo(x,H);g.lineTo(x+st,y0);g.lineTo(x+st*2,y0);g.lineTo(x+st,H);g.fill();}
  },
  fg(){const E=STAGE.fx.em||(STAGE.fx.em=[]);while(E.length<40)E.push({x:Math.random()*W,y:H+Math.random()*H,v:rnd(.3,1)});
    for(const e of E){e.y-=e.v*(H/216);e.x+=Math.sin(e.y*.05)*.3;if(e.y<0){e.y=H;e.x=Math.random()*W;}g.fillStyle=e.v>.7?'#ffb040':'#ff6010';g.fillRect(e.x,e.y,1,1);}}
};
/* ---------- ORBIT NINE ---------- */
STAGES.orbit={id:'orbit',name:'ORBIT NINE',city:'400 KM ABOVE THE PACIFIC',rim:[90,190,255],rimDir:-1,outline:[4,8,22],wind:.3,music:'orbit',reflect:.3,
  build(LW,H,LB){
    const r=mulberry(9);const [s,sx]=mkc(LW,H);
    for(let i=0;i<260;i++){sx.fillStyle=i%11?'rgba(190,200,255,.55)':'#fff';sx.fillRect(r()*LW|0,r()*H|0,1,1);}
    let gr=sx.createRadialGradient(LW*.7,H*.25,4,LW*.7,H*.25,H*.6);gr.addColorStop(0,'rgba(150,60,200,.35)');gr.addColorStop(1,'rgba(150,60,200,0)');sx.fillStyle=gr;sx.fillRect(0,0,LW,H);
    const ex=LW*.25,ey=LB+H*.55,er=H*.8;gr=sx.createRadialGradient(ex-er*.3,ey-er*.4,er*.2,ex,ey,er);gr.addColorStop(0,'#5ab8ff');gr.addColorStop(.6,'#1a5ab8');gr.addColorStop(1,'#08204a');
    sx.fillStyle=gr;sx.beginPath();sx.arc(ex,ey,er,0,TAU);sx.fill();
    sx.fillStyle='rgba(255,255,255,.5)';for(let i=0;i<30;i++){const a=-Math.PI*.9+r()*Math.PI*.8,d=er*(.6+r()*.38);sx.beginPath();sx.ellipse(ex+Math.cos(a)*d,ey+Math.sin(a)*d,4+r()*10,1+r()*2,a+Math.PI/2,0,TAU);sx.fill();}
    sx.strokeStyle='rgba(120,210,255,.8)';sx.lineWidth=2;sx.beginPath();sx.arc(ex,ey,er+1,Math.PI*1.05,Math.PI*1.95);sx.stroke();
    const [a,ax]=mkc(LW,H);ax.strokeStyle='#2a3450';ax.lineWidth=1;for(let i=0;i<3;i++){const y=LB-H*(.4+i*.08);ax.beginPath();ax.moveTo(LW*.55,y);ax.lineTo(LW,y-H*.05);ax.stroke();for(let x=LW*.55;x<LW;x+=8){ax.beginPath();ax.moveTo(x,y);ax.lineTo(x+4,y-4);ax.stroke();}}
    ax.fillStyle='#1a2a5a';for(let i=0;i<4;i++)ax.fillRect(LW*.7+i*H*.09,LB-H*.55,H*.07,H*.04);
    const [b,bx]=mkc(LW,H);
    bx.fillStyle='#0e1220';bx.fillRect(0,0,LW,H*.07);bx.fillRect(0,LB-H*.14,LW,H*.14);
    for(let x=0;x<LW;x+=Math.round(H*.42)){bx.fillStyle='#0e1220';bx.fillRect(x,0,Math.max(3,H*.03),LB);bx.fillStyle='#1c2440';bx.fillRect(x+Math.max(3,H*.03),0,1,LB);}
    bx.fillStyle='#1c2440';bx.fillRect(0,LB-H*.14,LW,1);
    const leds=[];for(let x=4;x<LW;x+=Math.round(H*.05))leds.push([x,LB-H*.1+(r()*H*.06|0),pick(['#2fe6ff','#7dff6a','#ff3b5c','#ffd23f'])]);
    const holo=[];for(let x=H*.2;x<LW;x+=Math.round(H*.84))holo.push(x);
    STAGES.orbit.leds=leds;STAGES.orbit.holo=holo;return {s,a,b};
  },
  bg(){
    g.fillStyle='#02030a';g.fillRect(0,0,W,H);
    const L=STAGE.L;lay(L.s,.02);lay(L.a,.07);
    const sx=((FRAMET*.5)%(W*3))-W;g.fillStyle='#8a9ac0';g.fillRect(sx,H*.2,6,2);g.fillStyle='#2fe6ff';g.fillRect(sx-3,H*.2,2,1);
    const [bx,by]=lay(L.b,.28);
    for(const l of STAGE.leds)if(((FRAMET+l[0])>>3)%5){g.fillStyle=l[2];g.fillRect(bx+l[0],by+l[1],1,1);}
    for(const hx of STAGE.holo){const x=bx+hx,y=by+STAGE.LB-H*.36,w=H*.22,h=H*.13;if(((FRAMET+hx)>>2)%23===0)continue;g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(47,230,255,.12)';g.fillRect(x,y,w,h);g.strokeStyle='rgba(47,230,255,.6)';g.strokeRect(x+.5,y+.5,w,h);
      for(let i=0;i<6;i++){const bh=(Math.sin(FRAMET*.05+i+hx)*.5+.5)*h*.7;g.fillStyle='rgba(125,255,106,.6)';g.fillRect(x+3+i*(w-6)/6,y+h-2-bh,Math.max(1,(w-6)/6-1),bh);}
      txt3(g,'ORBIT 9',x+2,y+2,'rgba(47,230,255,.9)');g.restore();}
    const rb=STAGE.fx.rb||(STAGE.fx.rb=Array.from({length:7},(_,i)=>({x:Math.random()*STAGE.LW,y:.5+Math.random(),p:Math.random()*TAU})));
    for(const d of rb){const x=bx+d.x+Math.sin(FRAMET*.01+d.p)*10,y=by+STAGE.LB-H*(.2+.04*Math.sin(FRAMET*.03+d.p))-H*.06*d.y-Math.min(1,EXCITE)*Math.abs(Math.sin(FRAMET*.2+d.p))*4;
      g.fillStyle='#2a3450';g.beginPath();g.arc(x,y,H*.022,0,TAU);g.fill();g.fillStyle=((FRAMET>>4)+d.p|0)%6?'#2fe6ff':'#ff3b5c';g.fillRect(x-1,y-1,3,1);}
    floorBase('#1a2236','#070a12');
    floorLines('#2fe6ff',1.2,.08,.28,6);
  }
};
/* ---------- THE CORE ---------- */
STAGES.core={id:'core',name:'THE CORE',city:'INSIDE THE MACHINE',rim:[80,230,255],rimDir:1,outline:[0,10,20],wind:.6,music:'boss',reflect:.34,
  build(LW,H,LB){const [s,sx]=mkc(LW,H);const gr=sx.createRadialGradient(LW/2,LB-H*.1,4,LW/2,LB-H*.1,H*.9);gr.addColorStop(0,'rgba(40,180,255,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=gr;sx.fillRect(0,0,LW,H);return {s};},
  bg(){
    g.fillStyle='#000207';g.fillRect(0,0,W,H);lay(STAGE.L.s,.03);
    const cx=W/2-CAM.x*VIEW.S*.08,cy=horizon()-H*.18;
    for(let k=0;k<4;k++){const R=H*(.18+k*.12),n=24+k*12,rot=FRAMET*.004*(k%2?1:-1)*(1+k*.3);for(let i=0;i<n;i++){const a=rot+i/n*TAU;g.fillStyle=(i+k)%5?'rgba(47,230,255,.5)':'#fff';g.fillRect(cx+Math.cos(a)*R,cy+Math.sin(a)*R*.42,1,1);}}
    const cols=STAGE.fx.dr||(STAGE.fx.dr=Array.from({length:30},()=>({x:Math.random(),y:Math.random()*H,v:rnd(.5,1.5)})));
    for(const c of cols){c.y+=c.v*(H/216);if(c.y>horizon())c.y=-20;const x=c.x*W;for(let k=0;k<6;k++){g.fillStyle=`rgba(47,230,255,${.6-k*.1})`;g.fillRect(x,c.y-k*3,1,1);}}
    for(const [px,f] of [[-.3,.15],[.32,.18]]){const x=W/2+px*W-CAM.x*VIEW.S*f,y=horizon()-H*.42,w=H*.42,h=H*.2;g.fillStyle='#02101c';g.fillRect(x-w/2,y,w,h);g.strokeStyle='#2fe6ff';g.strokeRect(x-w/2+.5,y+.5,w,h);
      const msg='VOLTFIST  INSERT COIN  ',off=(FRAMET>>1)%(msg.length*6);g.save();g.beginPath();g.rect(x-w/2+1,y+1,w-2,h-2);g.clip();txt5(g,msg+msg,x-w/2+2-off,y+h/2-3,'#2fe6ff');g.restore();}
    floorBase('#001018','#00040a');
    floorLines('#2fe6ff',.8,.15,.6,8,(FRAMET*.04)%1);
    if(EXCITE>.5){const r=(FRAMET%40)/40;g.strokeStyle=`rgba(47,230,255,${(1-r)*.7})`;g.beginPath();g.ellipse(WX(CAM.x),WY(0),W*r*.8,H*r*.08,0,0,TAU);g.stroke();}
  }
};
