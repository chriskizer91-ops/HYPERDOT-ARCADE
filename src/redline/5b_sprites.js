/* =====================================================================================
   12. SCENERY AND CARS: everything is drawn from shapes at whatever size the road asks for
   ===================================================================================== */
const PROP={palm:[1500,3400],lamp:[400,3600],neon:[1800,2600],billboard:[3400,2800],tower:[2600,9000],chevron:[900,1000],rock:[1600,1100],post:[160,600],pine:[1500,3600],vent:[1400,900],torch:[220,1700],
  gate:[0,3900],tlight:[0,0],stand:[3400,2700],pitwall:[2600,1500],gantry:[0,3600],flagman:[260,900],board:[520,1300],tyres:[900,560],marshal:[700,1600],bridge:[0,3800]};
function drawProp(s,sp){
  const pr=PROP[sp.t];if(!pr)return;
  const sc=s.p1.s.scale,u=sc*W/2,x=s.p1.s.x+sc*sp.x*ROADW*W/2,y=s.p1.s.y,span=sp.t==='gate'||sp.t==='gantry'||sp.t==='bridge';
  const w=pr[0]*u,h=pr[1]*u;if(h<1&&!span)return;if(y-h>s.clip&&!span)return;
  const k=s.fogK,th=THEMES[s.st],t=S.clock,f=c=>fogT(s.st,c,k);
  clipBegin(s.clip);
  switch(sp.t){
    case 'palm':{const lean=(sp.seed-.5)*.5*w;g.strokeStyle=f('#2a1a24');g.lineWidth=Math.max(1,w*.09);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+lean*.2,y-h*.5,x+lean,y-h);g.stroke();
      g.strokeStyle=f(th.props==='city'?'#1a3a3a':'#2a5a2a');g.lineWidth=Math.max(1,w*.07);
      for(let i=0;i<6;i++){const a=i/6*TAU+sp.seed*3,ex=x+lean+Math.cos(a)*w*.55,ey=y-h+Math.sin(a)*h*.08+h*.12;g.beginPath();g.moveTo(x+lean,y-h);g.quadraticCurveTo((x+lean+ex)/2,y-h-h*.1,ex,ey);g.stroke();}
      if(th.props==='city'){g.fillStyle=f('#ff2f9a');g.fillRect(x+lean-w*.04,y-h,Math.max(1,w*.08),Math.max(1,w*.08));}break;}
    case 'lamp':{const dir=sp.x<0?1:-1;g.fillStyle=f('#3a3448');g.fillRect(x-w*.06,y-h,Math.max(1,w*.12),h);g.fillRect(x,y-h,dir*w*1.4,Math.max(1,w*.1));
      const lx=x+dir*w*1.4,ly=y-h;g.fillStyle=f(th.props==='alpine'?'#c8f0ff':'#ffe2a0');g.fillRect(lx-w*.3,ly,w*.6,Math.max(1,w*.18));
      if(k<.7){const gr=g.createRadialGradient(lx,ly,0,lx,ly,w*2.2);gr.addColorStop(0,`rgba(255,230,170,${.35*(1-k)})`);gr.addColorStop(1,'rgba(255,230,170,0)');g.fillStyle=gr;g.fillRect(lx-w*2.2,ly-w*2.2,w*4.4,w*4.4);}break;}
    case 'neon':{g.fillStyle=f('#2a2436');g.fillRect(x-w*.03,y-h*.45,Math.max(1,w*.06),h*.45);
      const bx=x-w/2,by=y-h,bw=w,bh=h*.55,cols=['#ff2f9a','#2fe6ff','#7dff6a','#ffd23f'],c=cols[(sp.seed*4)|0];
      g.fillStyle=f('#0c0814');g.fillRect(bx,by,bw,bh);const on=((t*2+sp.seed*7)|0)%5!==0;
      g.strokeStyle=f(on?c:'#333333');g.lineWidth=Math.max(1,w*.04);g.strokeRect(bx+w*.04,by+w*.04,bw-w*.08,bh-w*.08);
      const words=['BAR','OPEN','24H','DOTS','MOTEL','CAFE','HYPER','NEON'],wd=words[(sp.seed*words.length)|0],px=bw*.8/(wd.length*6);
      if(px>.45&&on)txt5(g,wd,bx+bw/2,by+bh/2-3.5*px,f(c),px,'c');break;}
    case 'billboard':{g.fillStyle=f('#2a2436');g.fillRect(x-w*.32,y-h*.5,Math.max(1,w*.04),h*.5);g.fillRect(x+w*.28,y-h*.5,Math.max(1,w*.04),h*.5);
      const bx=x-w/2,by=y-h,bw=w,bh=h*.55;const gr=g.createLinearGradient(bx,by,bx,by+bh);gr.addColorStop(0,f(sp.seed<.5?'#3a0f6a':'#0f3a5a'));gr.addColorStop(1,f(sp.seed<.5?'#ff2f9a':'#2fe6ff'));g.fillStyle=gr;g.fillRect(bx,by,bw,bh);
      const msgs=['REDLINE','HYPERDOT','DRIVE FAST','DOT MATRIX','GRAND PRIX'],m=msgs[(sp.seed*msgs.length)|0],px=bw*.86/(m.length*6);
      if(px>.4)txt5(g,m,bx+bw/2,by+bh*.28,f('#ffffff'),px,'c');
      g.fillStyle=f('#ffffff');if(bw>6)for(let i=0;i<8;i++)g.fillRect(bx+bw*(i+.5)/8-Math.max(.5,bw*.01),by+bh-Math.max(1,bh*.08),Math.max(1,bw*.02),Math.max(1,bh*.05));break;}
    case 'tower':{g.fillStyle=f('#120a20');g.fillRect(x-w/2,y-h,w,h);
      if(w>3)for(let wy=y-h+w*.1;wy<y-w*.1;wy+=w*.16)for(let wx=x-w*.4;wx<x+w*.4;wx+=w*.16){const hh=Math.sin(wx*3.1+wy*7.7+sp.seed*99)*999;if(hh-Math.floor(hh)>.55){g.fillStyle=f(hh-Math.floor(hh)>.9?'#ffe9a8':'#5fd8ff');g.fillRect(wx,wy,Math.max(.8,w*.07),Math.max(.8,w*.07));}}
      g.fillStyle=f('#ff2f9a');if(((t*2)|0)%2)g.fillRect(x-.5,y-h-Math.max(1,w*.1),Math.max(1,w*.05),Math.max(1,w*.1));break;}
    case 'chevron':{g.fillStyle=f('#1a1a1a');g.fillRect(x-w*.04,y-h*.4,Math.max(1,w*.08),h*.4);
      const bx=x-w/2,by=y-h,bh=h*.55;g.fillStyle=f('#ffd23f');g.fillRect(bx,by,w,bh);g.fillStyle=f('#151010');
      for(let i=0;i<3;i++){const cx=bx+w*(i+.5)/3,d=sp.dir;g.beginPath();g.moveTo(cx-d*w*.12,by+bh*.18);g.lineTo(cx+d*w*.08,by+bh*.5);g.lineTo(cx-d*w*.12,by+bh*.82);g.lineTo(cx-d*w*.02,by+bh*.82);g.lineTo(cx+d*w*.18,by+bh*.5);g.lineTo(cx-d*w*.02,by+bh*.18);g.fill();}break;}
    case 'rock':{g.fillStyle=f(th.props==='magma'?'#2a1210':th.props==='alpine'?'#4a5a6a':'#8a5a3a');g.beginPath();g.moveTo(x-w/2,y);g.lineTo(x-w*.4,y-h*.6);g.lineTo(x-w*.1,y-h);g.lineTo(x+w*.3,y-h*.8);g.lineTo(x+w/2,y);g.fill();
      g.fillStyle=f(th.props==='magma'?'#ff5a12':th.props==='alpine'?'#f0f6ff':'#b07a4a');g.beginPath();g.moveTo(x-w*.1,y-h);g.lineTo(x+w*.3,y-h*.8);g.lineTo(x+w*.1,y-h*.6);g.fill();break;}
    case 'post':{g.fillStyle=f('#f0f0f0');g.fillRect(x-w/2,y-h,Math.max(1,w),h);g.fillStyle=f('#ff3030');g.fillRect(x-w/2,y-h,Math.max(1,w),Math.max(1,h*.2));break;}
    case 'pine':{g.fillStyle=f('#2a1a10');g.fillRect(x-w*.05,y-h*.25,Math.max(1,w*.1),h*.25);
      g.fillStyle=f('#0e3a2a');for(let i=0;i<3;i++){const ty=y-h*.2-i*h*.25,tw=w*(.5-i*.12);g.beginPath();g.moveTo(x-tw,ty);g.lineTo(x,ty-h*.4);g.lineTo(x+tw,ty);g.fill();}
      g.fillStyle=f('#e8f4ff');g.beginPath();g.moveTo(x-w*.12,y-h*.82);g.lineTo(x,y-h);g.lineTo(x+w*.12,y-h*.82);g.fill();break;}
    case 'vent':{g.fillStyle=f('#1a0806');g.beginPath();g.moveTo(x-w/2,y);g.lineTo(x-w*.15,y-h);g.lineTo(x+w*.15,y-h);g.lineTo(x+w/2,y);g.fill();
      const fl=.6+.4*Math.sin(t*9+sp.seed*20);g.fillStyle=f('#ff6a12');g.fillRect(x-w*.12,y-h,w*.24,Math.max(1,h*.12));
      if(k<.8){g.fillStyle=`rgba(255,${(150*fl)|0},40,${.6*(1-k)})`;g.beginPath();g.moveTo(x-w*.12,y-h);g.quadraticCurveTo(x+Math.sin(t*5)*w*.2,y-h*2.2*fl,x+w*.12,y-h);g.fill();}break;}
    case 'torch':{g.fillStyle=f('#2a1a1a');g.fillRect(x-w/2,y-h,Math.max(1,w),h);const fl=Math.sin(t*14+sp.seed*30);g.fillStyle=f(fl>0?'#ffd23f':'#ff6a12');g.fillRect(x-w,y-h-w*1.4,Math.max(1,w*2),Math.max(1,w*1.6));break;}
    case 'gate':{const lx=s.p1.s.x-s.p1.s.w*1.25,rx=s.p1.s.x+s.p1.s.w*1.25,top=y-h,pw=Math.max(1,s.p1.s.w*.08);
      g.fillStyle=f('#1a1626');g.fillRect(lx-pw,top,pw*2,y-top);g.fillRect(rx-pw,top,pw*2,y-top);const bh=h*.22;g.fillStyle=f('#0c0a14');g.fillRect(lx-pw,top,rx-lx+pw*2,bh);
      const c=sp.st===0?'#ffffff':'#7dff6a',word=sp.st===0?'START':'CHECKPOINT',px=(rx-lx)*.8/(word.length*6);
      g.strokeStyle=f(c);g.lineWidth=Math.max(1,px*.6);g.strokeRect(lx-pw+px,top+px,rx-lx+pw*2-px*2,bh-px*2);
      if(px>.35)txt5(g,word,(lx+rx)/2,top+bh/2-3.5*px,f(((t*4)|0)%2?c:'#ffd23f'),px,'c');
      for(let i=0;i<6;i++){g.fillStyle=f(((t*6)|0)%6===i?'#ff2f9a':'#3a1a2a');g.fillRect(lx-pw*.7,top+bh+i*(y-top-bh)/6,pw*1.4,Math.max(1,pw*.6));g.fillRect(rx-pw*.7,top+bh+i*(y-top-bh)/6,pw*1.4,Math.max(1,pw*.6));}break;}
    case 'gantry':{const lx=s.p1.s.x-s.p1.s.w*1.3,rx=s.p1.s.x+s.p1.s.w*1.3,top=y-h,pw=Math.max(1,s.p1.s.w*.06),bh=h*.16;
      g.fillStyle=f('#1c1a26');g.fillRect(lx-pw,top,pw*2,y-top);g.fillRect(rx-pw,top,pw*2,y-top);g.fillRect(lx-pw,top,rx-lx+pw*2,bh);
      g.fillStyle=f('#2c2838');g.fillRect(lx-pw,top+bh,rx-lx+pw*2,Math.max(1,bh*.18));
      const L=S.lights,go=S.goT>0,lr=Math.max(.6,bh*.28);
      for(let i=0;i<5;i++){const lxp=lerp(s.p1.s.x-s.p1.s.w*.5,s.p1.s.x+s.p1.s.w*.5,i/4);
        for(const r of [0,1]){const on=go||i<L;g.fillStyle=f(go?'#5aff6a':on?'#ff2030':'#3a0a10');g.beginPath();g.arc(lxp,top+bh*(.32+r*.38),lr,0,TAU);g.fill();
          if(on&&k<.6){g.fillStyle=go?'rgba(90,255,106,.25)':'rgba(255,40,60,.25)';g.beginPath();g.arc(lxp,top+bh*(.32+r*.38),lr*2.6,0,TAU);g.fill();}}}
      const word=TR.kind==='circuit'?TR.C.name:'REDLINE',px=(rx-lx)*.5/(word.length*6);if(px>.4&&bh>6)txt5(g,word,(lx+rx)/2,top-px*8,f('#ffffff'),px,'c');break;}
    case 'stand':{const bx=x-w/2,by=y-h,tiers=5,th2=h*.7/tiers;
      g.fillStyle=f('#2a2a36');g.fillRect(bx,by+h*.18,w,h*.82);g.fillStyle=f(th.crowd[0]);g.fillRect(bx-w*.04,by,w*1.08,Math.max(1,h*.08));
      g.fillStyle=f('#16141e');g.fillRect(bx,by+h*.08,w,h*.1);
      if(w>8){const st=Math.max(1,w/22);for(let r=0;r<tiers;r++){const yy=by+h*.22+r*th2;g.fillStyle=f('#3a3846');g.fillRect(bx,yy+th2*.72,w,Math.max(1,th2*.2));
        for(let cx=bx+st*.5;cx<bx+w;cx+=st){const hh=Math.sin(cx*12.1+r*7.3+sp.seed*50)*999,v=hh-Math.floor(hh);if(v<.25)continue;const jump=S.cheer>0&&((t*8+v*9)|0)%2?st*.5:0;
          g.fillStyle=f(th.crowd[(v*4)|0]);g.fillRect(cx,yy+th2*.25-jump,Math.max(1,st*.55),Math.max(1,th2*.45));}}}
      break;}
    case 'pitwall':{const bx=x-w/2,by=y-h;g.fillStyle=f('#3a3a48');g.fillRect(bx,y-h*.32,w,h*.32);g.fillStyle=f('#ffffff');g.fillRect(bx,y-h*.32,w,Math.max(1,h*.04));
      g.fillStyle=f('#1a1824');g.fillRect(bx-w*.2,by,w*1.1,h*.68);
      if(w>6){const n=3;for(let i=0;i<n;i++){const gx=bx-w*.15+i*w*.36,col=DRIVERS[(sp.seed*7+i)%7|0].col;g.fillStyle=f(col);g.fillRect(gx,by+h*.08,w*.3,Math.max(1,h*.08));g.fillStyle=f('#0c0a12');g.fillRect(gx+w*.02,by+h*.2,w*.26,h*.44);}}break;}
    case 'flagman':{g.fillStyle=f('#e8e8f0');g.fillRect(x-w*.15,y-h*.6,w*.3,h*.6);g.fillStyle=f('#f0c8a0');g.fillRect(x-w*.12,y-h*.75,w*.24,h*.14);
      const wave=Math.sin(t*7)*w*.6,fx=x+w*.2,fy=y-h*.95;g.strokeStyle=f('#222222');g.lineWidth=Math.max(1,w*.06);g.beginPath();g.moveTo(x,y-h*.6);g.lineTo(fx+wave*.3,fy);g.stroke();
      const chk=S.flag==='chk',fw=w*1.4,fh=w*1;for(let i=0;i<4;i++)for(let j=0;j<3;j++){g.fillStyle=f(chk?((i+j)%2?'#111111':'#ffffff'):S.flag==='white'?'#f4f4ff':'#2ee04a');g.fillRect(fx+wave*.3+i*fw/4,fy-fh+j*fh/3+Math.sin(t*9+i)*fh*.1,Math.max(1,fw/4),Math.max(1,fh/3));}break;}
    case 'board':{g.fillStyle=f('#cccccc');g.fillRect(x-w*.06,y-h*.45,Math.max(1,w*.12),h*.45);g.fillStyle=f('#ffffff');g.fillRect(x-w/2,y-h,w,h*.56);
      g.fillStyle=f('#111111');const n=sp.n;for(let i=0;i<n;i++)g.fillRect(x-w*.38,y-h*.94+i*h*.17,w*.76,Math.max(1,h*.1));break;}
    case 'tyres':{const n=4;for(let i=0;i<n;i++){const tx=x-w/2+i*w/n;g.fillStyle=f('#141418');g.fillRect(tx,y-h,w/n*.92,h);g.fillStyle=f(i%2?'#ff2a4a':'#f0f0f0');g.fillRect(tx,y-h*.62,w/n*.92,Math.max(1,h*.16));}break;}
    case 'marshal':{g.fillStyle=f('#e8e8f0');g.fillRect(x-w/2,y-h*.55,w,h*.55);g.fillStyle=f('#ff8a2e');g.fillRect(x-w/2,y-h*.6,w,Math.max(1,h*.08));
      const yel=S.yellow>0,wv=Math.sin(t*8)*w*.3;g.fillStyle=f(yel?'#ffd23f':'#2ee04a');g.fillRect(x-w*.1+wv,y-h,w*.6,h*.26);g.fillStyle=f('#333333');g.fillRect(x-w*.1+wv*.5,y-h,Math.max(1,w*.05),h*.45);break;}
    case 'bridge':{const lx=s.p1.s.x-s.p1.s.w*2.7,rx=s.p1.s.x+s.p1.s.w*2.7,top=y-h,dh=h*.18,pw=Math.max(1,s.p1.s.w*.18);
      g.fillStyle=f('#1e1c2a');g.fillRect(s.p1.s.x-s.p1.s.w*2.4-pw,top+dh,pw*2,y-top-dh);g.fillRect(s.p1.s.x+s.p1.s.w*2.4-pw,top+dh,pw*2,y-top-dh);
      g.fillStyle=f(th.wall?th.wall[1]:'#2a2838');g.fillRect(lx,top,rx-lx,dh);g.fillStyle=f(th.wallTop||'#ffffff');g.fillRect(lx,top,rx-lx,Math.max(1,dh*.14));
      g.fillStyle=f('#0c0a12');g.fillRect(lx,top+dh,rx-lx,Math.max(1,dh*.25));
      const word=sp.seed<.5?'HYPERDOT ARCADE':'REDLINE GRAND PRIX',px=s.p1.s.w*1.6/(word.length*6);if(px>.4&&dh>5)txt5(g,word,s.p1.s.x,top+dh*.3,f(sp.seed<.5?'#2fe6ff':'#ff2a4a'),px,'c');break;}
    case 'tlight':break;
  }
  clipEnd();
}
/* ---------- highway traffic, seen from behind ---------- */
function drawCar(cx,by,w,o){
  const fk=o.fog||0,f=c=>fk>.02?fogS(c,THEMES[o.st].fog,fk*.85):c;
  const h=w*(o.type==='truck'?.95:o.type==='sports'?.45:.58);
  g.save();g.translate(cx,by);
  if(w<7){g.fillStyle=f(o.col);g.fillRect(-w/2,-h,w,h*.8);g.fillStyle=f('#ff2040');g.fillRect(-w/2,-h*.5,Math.max(1,w*.3),Math.max(1,h*.2));g.fillRect(w/2-Math.max(1,w*.3),-h*.5,Math.max(1,w*.3),Math.max(1,h*.2));g.restore();return;}
  g.fillStyle='rgba(0,0,0,.5)';g.fillRect(-w*.54,-h*.05,w*1.08,h*.09);
  g.fillStyle='#08080c';g.fillRect(-w*.47,-h*.24,w*.17,h*.25);g.fillRect(w*.3,-h*.24,w*.17,h*.25);
  if(o.type==='truck'){
    g.fillStyle=f(shadeS(o.col,.75));g.fillRect(-w*.5,-h,w,h*.82);g.fillStyle=f(shadeS(o.col,.55));for(let i=1;i<6;i++)g.fillRect(-w*.5+w*i/6,-h,Math.max(1,w*.015),h*.82);
    g.fillStyle=f('#1a1a20');g.fillRect(-w*.5,-h*.2,w,h*.06);g.fillStyle=f('#ff2040');g.fillRect(-w*.48,-h*.3,w*.1,h*.07);g.fillRect(w*.38,-h*.3,w*.1,h*.07);
    g.fillStyle=f('#ffb52e');g.fillRect(-w*.48,-h*.98,w*.05,h*.03);g.fillRect(w*.43,-h*.98,w*.05,h*.03);
  }else{
    const sp=o.type==='sports';
    g.fillStyle=f(shadeS(o.col,.6));g.beginPath();g.moveTo(-w*.5,-h*.18);g.lineTo(-w*.5,-h*.52);g.lineTo(w*.5,-h*.52);g.lineTo(w*.5,-h*.18);g.fill();
    g.fillStyle=f(o.col);g.beginPath();g.moveTo(-w*.49,-h*.48);g.lineTo(-w*.46,-h*.62);g.lineTo(w*.46,-h*.62);g.lineTo(w*.49,-h*.48);g.fill();
    g.beginPath();g.moveTo(-w*.4,-h*.6);g.lineTo(-w*(sp?.28:.33),-h*(sp?.98:1));g.lineTo(w*(sp?.28:.33),-h*(sp?.98:1));g.lineTo(w*.4,-h*.6);g.fill();
    g.fillStyle=f('#101828');g.beginPath();g.moveTo(-w*.34,-h*.64);g.lineTo(-w*(sp?.25:.29),-h*.94);g.lineTo(w*(sp?.25:.29),-h*.94);g.lineTo(w*.34,-h*.64);g.fill();
    g.fillStyle=f('#ff1a3a');g.fillRect(-w*.47,-h*.46,w*.24,h*.09);g.fillRect(w*.23,-h*.46,w*.24,h*.09);
    if(o.lights&&w>14){g.fillStyle=f('#ffd0d8');g.fillRect(-w*.43,-h*.44,w*.06,h*.04);g.fillRect(w*.37,-h*.44,w*.06,h*.04);}
    g.fillStyle=f('#e8e8f0');g.fillRect(-w*.09,-h*.33,w*.18,h*.09);
  }
  g.restore();
}
/* ---------- a rival's race car from behind: wide tyres, a deck lid in its colours, the wing with its
   number, the driver's helmet, the rain light; a sliver of flank shows when it is off to one side ---------- */
function drawRacer(cx,by,w,c,fk,st){
  const d=c.drv||c.ai.d,f=col=>fk>.02?fogS(col,THEMES[st].fog,fk*.85):col,h=w*.46;
  const side=clamp((cx-W/2)/(W*.5),-1,1),yaw=(c.yaw||0)+Math.sin(c.spinA||0)*.9;
  g.save();g.translate(cx,by);if(yaw)g.transform(1,0,clamp(-yaw*.5,-.6,.6),1,0,0);
  if(w<6){g.fillStyle=f(d.col);g.fillRect(-w/2,-h,w,h*.75);g.fillStyle=f(c.brakeLit?'#ff8090':'#ff2040');g.fillRect(-w*.3,-h*.45,w*.6,Math.max(1,h*.16));g.restore();return;}
  /* shadow, tyres */
  g.fillStyle='rgba(0,0,0,.5)';g.fillRect(-w*.56,-h*.06,w*1.12,h*.1);
  g.fillStyle=f('#09090c');g.fillRect(-w*.53,-h*.42,w*.22,h*.44);g.fillRect(w*.31,-h*.42,w*.22,h*.44);
  if(w>16){g.fillStyle=f('#26262e');const rr=(S.clock*c.v/VTOP*30)%1;for(let i=0;i<3;i++){const yy=-h*.4+((rr+i/3)%1)*h*.38;g.fillRect(-w*.52,yy,w*.2,Math.max(1,h*.03));g.fillRect(w*.32,yy,w*.2,Math.max(1,h*.03));}}
  /* the flank toward the camera */
  if(Math.abs(side)>.08){const sw=w*.18*Math.abs(side),sx=side>0?-w*.31:w*.31;g.fillStyle=f(shadeS(d.col,.55));g.beginPath();g.moveTo(sx,-h*.12);g.lineTo(sx-Math.sign(side)*sw,-h*.2);g.lineTo(sx-Math.sign(side)*sw,-h*.52);g.lineTo(sx,-h*.62);g.fill();}
  /* body: diffuser, deck, engine cover */
  g.fillStyle=f('#121218');g.fillRect(-w*.31,-h*.22,w*.62,h*.16);
  g.fillStyle=f(shadeS(d.col,.75));g.beginPath();g.moveTo(-w*.32,-h*.2);g.lineTo(-w*.36,-h*.5);g.lineTo(w*.36,-h*.5);g.lineTo(w*.32,-h*.2);g.fill();
  g.fillStyle=f(d.col);g.beginPath();g.moveTo(-w*.3,-h*.5);g.lineTo(-w*.16,-h*.78);g.lineTo(w*.16,-h*.78);g.lineTo(w*.3,-h*.5);g.fill();
  g.fillStyle=f(d.col2);g.fillRect(-w*.05,-h*.78,w*.1,h*.3);
  /* helmet */
  g.fillStyle=f(d.col2);g.beginPath();g.arc(0,-h*.84,w*.075,0,TAU);g.fill();g.fillStyle=f('#101828');g.fillRect(-w*.06,-h*.86,w*.12,Math.max(1,h*.05));
  /* wing on two posts, number on the end plate area */
  g.fillStyle=f('#1a1a22');g.fillRect(-w*.2,-h*1.02,Math.max(1,w*.03),h*.3);g.fillRect(w*.17,-h*1.02,Math.max(1,w*.03),h*.3);
  g.fillStyle=f(d.col2);g.fillRect(-w*.47,-h*1.14,w*.94,h*.14);g.fillStyle=f(d.col);g.fillRect(-w*.5,-h*1.2,Math.max(1,w*.05),h*.3);g.fillRect(w*.45,-h*1.2,Math.max(1,w*.05),h*.3);
  if(w>30){const ns=String(d.num);txt3(g,ns,0,-h*1.14+Math.max(0,(h*.14-5)/2),f(d.col),1,'c');}
  /* lights: the rain light and the brake lamps */
  const bl=c.brakeLit;g.fillStyle=f(bl?'#ffd0d8':'#ff1a30');g.fillRect(-w*.05,-h*.3,w*.1,Math.max(1,h*.07));
  g.fillStyle=f(bl?'#ff9aa8':'#b0102a');g.fillRect(-w*.3,-h*.42,w*.12,Math.max(1,h*.06));g.fillRect(w*.18,-h*.42,w*.12,Math.max(1,h*.06));
  if(bl&&w>10&&fk<.6){g.fillStyle='rgba(255,60,80,.22)';g.beginPath();g.arc(0,-h*.27,w*.22,0,TAU);g.fill();}
  if(c.nitroOn){const fl=rnd(.6,1.2);g.fillStyle='#9ff1ff';g.fillRect(-w*.12,-h*.16,w*.07,h*.3*fl);g.fillRect(w*.05,-h*.16,w*.07,h*.3*fl);}
  else if(c.brk>.5&&w>12&&Math.random()<.3){g.fillStyle=Math.random()<.5?'#ffd23f':'#ff6a12';g.fillRect(-w*.1,-h*.14,w*.06,h*.12);g.fillRect(w*.04,-h*.14,w*.06,h*.12);}      /* the overrun pops as it brakes */
  /* in the wet, every car throws up a plume of spray */
  if(S.wet&&c.v>VTOP*.3&&fk<.8&&!(c.seg&&c.seg.tun)){const a=Math.min(.2,c.v/VTOP*.22)*(1-fk);g.fillStyle=`rgba(180,195,235,${a})`;
    for(const sx of [-.42,.42])for(let k=0;k<4;k++){const r=w*(.05+k*.03);g.beginPath();g.arc(w*sx*(1+k*.12)+rnd(-w*.04,w*.04),-h*(.12+k*.2)-rnd(0,h*.1),r,0,TAU);g.fill();}}
  /* tyre smoke when it slides */
  if((c.slide>.15||c.drift||c.spinT>0)&&fk<.7){g.fillStyle=`rgba(210,206,222,${Math.min(.5,c.slide+.2)})`;for(const sx of [-.42,.42]){g.beginPath();g.arc(w*sx+rnd(-w*.05,w*.05),-h*.12,w*rnd(.12,.2),0,TAU);g.fill();}}
  g.restore();
}
/* ---------- your car ---------- */
function drawPlayer(){
  const c=P,sp=c.v/VTOP,w=W*.31,shake=(c.offroad?rnd(-1,1)*SC*1.6:c.onKerb?rnd(-1,1)*SC*.9:Math.sin(S.clock*30)*sp*.4*SC)+(c.wallT>0?rnd(-2,2)*SC:0);
  const cx=W/2+c.steer*W*.015+c.yaw*W*.03,by=H*.985+shake,h=w*.42,yaw=c.yaw*.4+Math.sin(c.spinA)*.8,sq=1-Math.abs(Math.sin(c.spinA))*.35;
  g.save();g.translate(cx,by);g.transform(sq,0,-yaw*.35,1,0,0);
  g.fillStyle='rgba(0,0,0,.55)';g.fillRect(-w*.55,-h*.06,w*1.1,h*.1);
  g.fillStyle='#07070a';g.fillRect(-w*.5,-h*.3,w*.2,h*.32);g.fillRect(w*.3,-h*.3,w*.2,h*.32);
  g.fillStyle='#2a2a32';for(let i=0;i<4;i++){const yy=-h*.28+((S.clock*sp*40+i*.25)%1)*h*.28;g.fillRect(-w*.49,yy,w*.18,Math.max(1,h*.02));g.fillRect(w*.31,yy,w*.18,Math.max(1,h*.02));}
  g.fillStyle='#5a0a18';g.beginPath();g.moveTo(-w*.52,-h*.12);g.lineTo(-w*.54,-h*.5);g.lineTo(w*.54,-h*.5);g.lineTo(w*.52,-h*.12);g.fill();
  g.fillStyle='#14141a';g.fillRect(-w*.3,-h*.2,w*.6,h*.1);for(let i=0;i<6;i++){g.fillStyle='#2a2a34';g.fillRect(-w*.27+i*w*.1,-h*.2,Math.max(1,w*.015),h*.1);}
  const gr=g.createLinearGradient(0,-h,0,-h*.4);gr.addColorStop(0,'#ff6a7a');gr.addColorStop(1,'#d01030');
  g.fillStyle=gr;g.beginPath();g.moveTo(-w*.54,-h*.48);g.quadraticCurveTo(-w*.56,-h*.66,-w*.44,-h*.72);g.lineTo(w*.44,-h*.72);g.quadraticCurveTo(w*.56,-h*.66,w*.54,-h*.48);g.fill();
  g.fillStyle='#c0102a';g.beginPath();g.moveTo(-w*.36,-h*.7);g.lineTo(-w*.25,-h*1.02);g.lineTo(w*.25,-h*1.02);g.lineTo(w*.36,-h*.7);g.fill();
  g.fillStyle='#0c1220';g.beginPath();g.moveTo(-w*.31,-h*.72);g.lineTo(-w*.22,-h*.98);g.lineTo(w*.22,-h*.98);g.lineTo(w*.31,-h*.72);g.fill();
  g.fillStyle='rgba(120,200,255,.45)';g.beginPath();g.moveTo(-w*.18,-h*.95);g.lineTo(-w*.1,-h*.95);g.lineTo(-w*.2,-h*.74);g.lineTo(-w*.27,-h*.74);g.fill();
  g.fillStyle='#1a1a22';g.fillRect(-w*.24,-h*.8,Math.max(1,w*.03),h*.1);g.fillRect(w*.21,-h*.8,Math.max(1,w*.03),h*.1);
  g.fillStyle='#e01838';g.fillRect(-w*.5,-h*.86,w*1.0,h*.07);g.fillStyle='#ff8a9a';g.fillRect(-w*.5,-h*.86,w*1.0,Math.max(1,h*.02));
  const br=c.brakeLit&&S.mode==='race';
  g.fillStyle=br?'#ffd0d8':'#ff1030';g.fillRect(-w*.5,-h*.6,w*1.0,Math.max(1,h*.07));
  g.fillStyle=br?'#ffffff':'#ff7080';for(let i=0;i<10;i++)g.fillRect(-w*.48+i*w*.1,-h*.59,Math.max(1,w*.05),Math.max(1,h*.04));
  g.fillStyle='#e8e8f0';g.fillRect(-w*.11,-h*.42,w*.22,h*.12);
  if(w*.22>tw3('REDLINE')+2)txt3(g,'REDLINE',0,-h*.42+Math.max(1,(h*.12-5)/2),'#10131a',1,'c');
  g.fillStyle='#2a2a30';g.fillRect(-w*.24,-h*.16,w*.07,h*.07);g.fillRect(w*.17,-h*.16,w*.07,h*.07);
  if(c.nitroOn||c.boostT>0){const fl=rnd(.6,1.2)*(c.nitroOn?1:.6);g.fillStyle=c.nitroOn?'#9ff1ff':'#ff9ae0';g.fillRect(-w*.235,-h*.14,w*.05,h*.25*fl);g.fillRect(w*.185,-h*.14,w*.05,h*.25*fl);g.fillStyle='#ffffff';g.fillRect(-w*.225,-h*.13,w*.03,h*.12*fl);g.fillRect(w*.195,-h*.13,w*.03,h*.12*fl);}
  g.restore();
}
/* ---------- screen-space particles: smoke, sparks, flames, grass and snow spray ---------- */
function part(x,y,vx,vy,life,col,size,type){if(S.parts.length>600)return;S.parts.push({x,y,vx,vy,life,max:life,col,size:size||1,type:type||'dot'});}
function sparks(side,imp){const n=Math.round(8+imp*12);for(let i=0;i<n;i++)part(W/2+side*W*.15+rnd(-3,3)*SC,H*.86,rnd(-30,30)*SC-side*20*SC,rnd(-50,-5)*SC,rnd(.2,.6),Math.random()<.5?'#ffd23f':'#ff8a2e',1,'spark');}
function playerFX(){
  const c=P,sp=c.v/VTOP,th=THEMES[c.seg?c.seg.st:0];
  if(c.drift||c.slide>.25||c.spinT>0){if(Math.random()<.8){const cx=W/2+c.steer*W*.03,by2=H*.94;for(const s of [-1,1])part(cx+s*W*.11,by2,rnd(-10,10)*SC-c.steer*20*SC,rnd(-12,-4)*SC,rnd(.5,1),'#c8c4d4',rnd(1.5,3)*SC,'smoke');}
    if(c.drift&&Math.random()<.4)part(W/2+(Math.random()<.5?-1:1)*W*.11,H*.95,rnd(-30,30)*SC,rnd(-25,-5)*SC,.25,'#ffd23f',1,'spark');}
  if(c.offroad&&sp>.15&&Math.random()<.7)part(W/2+rnd(-W*.12,W*.12),H*.95,rnd(-20,20)*SC,rnd(-20,-6)*SC,rnd(.3,.7),th.lava?'#ff6a12':th.grass[0],rnd(1,2.2)*SC,th.lava?'spark':'smoke');
  /* afterfire: every pop the engine fires into its pipes shows as a flame at the tailpipes */
  if(c.popN>0){const n=Math.min(3,c.popN);c.popN=0;for(let k=0;k<n;k++)for(const s of [-1,1])part(W/2+c.steer*W*.03+s*W*.06+rnd(-1,1)*SC,H*.9,rnd(-8,8)*SC,rnd(2,10)*SC,rnd(.07,.14),Math.random()<.6?'#ffb52e':'#ff5a1a',rnd(1.6,2.8)*SC,'flame');}
  if(c.nitroOn&&Math.random()<.9){for(const s of [-1,1])part(W/2+c.steer*W*.03+s*W*.06,H*.9,rnd(-6,6)*SC,rnd(4,14)*SC,.18,Math.random()<.5?'#9ff1ff':'#3a7bff',rnd(1.5,2.5)*SC,'flame');}
}
function partStep(dt){for(const p of S.parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.type==='smoke'){p.vx*=.96;p.vy*=.96;p.size+=dt*4*SC;}}let j=0;for(const p of S.parts)if(p.life>0)S.parts[j++]=p;S.parts.length=j;}
function drawParticles(){
  for(const p of S.parts){const a=p.life/p.max;
    if(p.type==='smoke'){g.globalAlpha=a*.5;g.fillStyle=p.col;g.beginPath();g.arc(p.x,p.y,p.size,0,TAU);g.fill();g.globalAlpha=1;}
    else if(p.type==='spark'){g.fillStyle=a>.5?'#ffffff':p.col;g.fillRect(p.x,p.y,Math.max(1,SC),Math.max(1,SC));}
    else{g.globalAlpha=Math.min(1,a*1.5);g.fillStyle=p.col;g.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);g.globalAlpha=1;}}
}
/* ---------- weather: rain streaks, snow, rising embers ---------- */
let WXP=[];
function weatherStep(dt){
  const s=P.seg||segAt(P.z),th=THEMES[s.st],sp=P.v/VTOP,inT=s.tun;
  const want=th.weather&&!inT?(th.weather==='rain'?90:th.weather==='snow'?70:40):0;
  while(WXP.length<want)WXP.push({x:Math.random(),y:Math.random(),z:Math.random()*.9+.1,k:th.weather});if(WXP.length>want)WXP.length=want;
  for(const p of WXP){const cx=p.x-.5,cy=p.y-.42;
    if(p.k==='rain'){p.y+=dt*(1.6+sp)*p.z;p.x+=dt*(cx*sp*1.2-P.steer*.2);}
    else if(p.k==='snow'){p.y+=dt*(.12+sp*.5)*p.z;p.x+=dt*(cx*sp*1.6+Math.sin(S.clock*2+p.z*9)*.05);p.y+=dt*cy*sp*1.2;}
    else{p.y-=dt*(.15+p.z*.2);p.x+=dt*(cx*sp*.8+Math.sin(S.clock+p.z*7)*.04);}
    if(p.y>1.05||p.y<-.05||p.x<-.05||p.x>1.05){p.x=Math.random();p.y=p.k==='embers'?1:Math.random()*.2;p.z=Math.random()*.9+.1;}}
}
function drawWeather(){
  for(const p of WXP){const x=p.x*W,y=p.y*H;
    if(p.k==='rain'){g.strokeStyle=`rgba(170,200,255,${.35+.4*p.z})`;g.lineWidth=Math.max(1,SC*.6);g.beginPath();g.moveTo(x,y);g.lineTo(x-(p.x-.5)*W*.03*(P.v/VTOP),y+H*.05*p.z);g.stroke();}
    else if(p.k==='snow'){g.fillStyle=`rgba(255,255,255,${.5+.5*p.z})`;const s=Math.max(1,SC*p.z*1.6);g.fillRect(x,y,s,s);}
    else{g.fillStyle=Math.sin(S.clock*8+p.z*40)>0?'#ffb36a':'#ff4a12';g.fillRect(x,y,Math.max(1,SC*p.z),Math.max(1,SC*p.z));}}
}
function speedLines(k){
  const cx=W/2,cy=H*.48;g.strokeStyle=`rgba(200,240,255,${.55*k})`;g.lineWidth=Math.max(1,SC*.7);
  for(let i=0;i<14;i++){const a=Math.random()*TAU,r0=rnd(.35,.6)*W,r1=r0+rnd(.08,.2)*W;g.beginPath();g.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0*.6);g.lineTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1*.6);g.stroke();}
}
