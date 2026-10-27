/* =====================================================================================
   15. HUD AND SCREENS
   ===================================================================================== */
const K5=()=>W>=256?2:1,K3=()=>W>=384?2:1,MG=()=>Math.max(2,Math.round(3*SC));
function panel(x,y,w,h,a=.62,edge){g.fillStyle=`rgba(6,4,14,${a})`;g.fillRect(x,y,w,h);if(edge){g.fillStyle=edge;g.fillRect(x,y,w,1);g.fillRect(x,y+h-1,w,1);}}
/* ---------- the minimap: the real shape of the circuit, every car on it ---------- */
function drawMap(x0,y0,bw,bh,big){
  if(!TR.map)return;const s=Math.min(bw/TR.mw,bh/TR.mh),ox=x0+(bw-TR.mw*s)/2,oy=y0+(bh-TR.mh*s)/2,N=TR.N,step=2;
  g.fillStyle=big?'#3a3450':'#5a5288';
  for(let i=0;i<N;i+=step){const p=TR.map[i];g.fillRect(Math.round(ox+p[0]*s),Math.round(oy+p[1]*s),1,1);}
  if(big){g.fillStyle='#8a80b0';for(let i=0;i<N;i+=step*2){const p=TR.map[i];g.fillRect(Math.round(ox+p[0]*s),Math.round(oy+p[1]*s),1,1);}}
  const sp=TR.map[TR.startI];g.fillStyle='#ffffff';g.fillRect(Math.round(ox+sp[0]*s)-1,Math.round(oy+sp[1]*s)-1,3,3);
  if(big)for(const c of TR.corners){if(c.v>.72||!c.nm)continue;const p=TR.map[(c.i+(c.n>>1))%N];g.fillStyle='#ffb020';g.fillRect(Math.round(ox+p[0]*s),Math.round(oy+p[1]*s),2,2);}
  for(const c of CARS){if(c===P)continue;const p=TR.map[segAt(c.z).i];g.fillStyle=c.drv.tag;g.fillRect(Math.round(ox+p[0]*s)-1,Math.round(oy+p[1]*s)-1,2,2);}
  if(P){const p=TR.map[segAt(P.z).i],on=((S.clock*6)|0)%2;g.fillStyle=on?'#ffffff':'#ff2a4a';g.fillRect(Math.round(ox+p[0]*s)-1,Math.round(oy+p[1]*s)-1,3,3);}
}
/* ---------- the rear-view mirror: headlights of whoever is behind you ---------- */
function drawMirror(){
  const mw=Math.round(W*.24),mh=Math.round(H*.075),mx=Math.round(W/2-mw/2),my=MG();
  g.fillStyle='#0a0812';g.fillRect(mx-1,my-1,mw+2,mh+2);g.fillStyle='#15121f';g.fillRect(mx,my,mw,mh);
  const th=THEMES[(P.seg||segAt(P.z)).st];g.fillStyle=th.sky[1];g.fillRect(mx,my,mw,Math.round(mh*.45));g.fillStyle=th.road[0];
  g.beginPath();g.moveTo(mx+mw*.1,my+mh);g.lineTo(mx+mw*.47,my+mh*.45);g.lineTo(mx+mw*.53,my+mh*.45);g.lineTo(mx+mw*.9,my+mh);g.fill();
  for(const c of CARS){if(c===P)continue;const d=-dSeg(P.z,c.z);if(d<=.4||d>32)continue;
    const k=1/(1+d*.22),cw=Math.max(2,mw*.32*k),ch=Math.max(1,cw*.35),cx=mx+mw/2-(c.x-P.x)*mw*.32*k,cy=my+mh*.45+(mh*.55)*k;
    g.fillStyle=c.drv.col;g.fillRect(Math.round(cx-cw/2),Math.round(cy-ch),Math.round(cw),Math.round(ch));
    g.fillStyle='#fff6d8';g.fillRect(Math.round(cx-cw*.42),Math.round(cy-ch*.6),Math.max(1,Math.round(cw*.18)),1);g.fillRect(Math.round(cx+cw*.24),Math.round(cy-ch*.6),Math.max(1,Math.round(cw*.18)),1);}
  g.fillStyle='rgba(255,255,255,.18)';g.fillRect(mx,my,mw,1);
}
/* ---------- the race HUD ---------- */
function drawRaceHUD(){
  const m=MG(),k5=K5(),k3=K3(),order=raceOrder();
  drawMirror();
  /* lap and time */
  const lap=Math.min(TR.laps,P.lapDone+1);
  stxt3(g,'LAP',m,m,'#a69cba',k3);stxt5(g,lap+'/'+TR.laps,m,m+6*k3,lap===TR.laps?'#ffffff':'#ffd23f',k5>1&&W>=320?2:1);
  const ly=m+6*k3+8*(k5>1&&W>=320?2:1)+2;stxt3(g,fmtT(S.mode==='race'?S.raceT-P.lapT0:P.lastLap),m,ly,'#ffffff',k3);if(P.bestLap)stxt3(g,'BEST '+fmtT(P.bestLap),m,ly+7*k3,'#ff9ae0',k3);
  /* position */
  const ps='P'+P.pos,psc=W>=320?3:2;stxt5(g,ps,W-m-tw3('/8',k3)-2,m,P.pos<=3?GR.gold:'#ffffff',psc,'r',.15);stxt3(g,'/'+CARS.length,W-m,m+7*psc-5*k3,'#a69cba',k3,'r');
  /* the cars either side of you, with gaps */
  const i=P.pos-1,ty=m+7*psc+4;let row=0;
  for(const j of [i-1,i,i+1]){const c=order[j];if(!c)continue;const y=ty+row*7*k3;row++;
    const gap=c===P?'':(c.dist>P.dist?'+':'-')+(Math.abs(c.dist-P.dist)/Math.max(VTOP*.3,P.v)).toFixed(1);
    g.fillStyle=c.drv.tag;g.fillRect(W-m-tw3('00 XXXXX +0.0',k3)-4*k3,y,2*k3,5*k3);
    stxt3(g,(j+1)+' '+c.drv.name,W-m-tw3('00 XXXXX +0.0',k3),y,c===P?'#ffffff':'#c9b8ff',k3);if(gap)stxt3(g,gap,W-m,y,c.dist>P.dist?'#ff9a9a':'#9affa8',k3,'r');}
  /* speed, tach, gear */
  drawSpeedo();
  /* minimap and nitro */
  const mw=Math.round(W*.2),mh=Math.round(H*.24),mx=W-m-mw,my=H-m-mh-9*k3;panel(mx-2,my-2,mw+4,mh+4,.45);drawMap(mx,my,mw,mh,false);
  drawNitro(W-m,H-m-3*k3);
  /* braking advice from the line, assist FULL and LIGHT */
  if(ASSISTS[S.assist].line&&S.mode==='race'){const s=P.seg||segAt(P.z);let need=null;for(let k=4;k<70;k+=2){const q=TR.segs[(s.i+k)%TR.N];if(P.v>q.vlim*VTOP*1.06){need=q;break;}}
    if(need){let cn=null,bd=150;for(const c of TR.corners){const d=(c.i-need.i+TR.N)%TR.N;if(d<bd){bd=d;cn=c;}}const on=((S.clock*5)|0)%2;if(on)stxt5(g,'BRAKE',W/2,Math.round(H*.24),'#ff2a4a',1,'c');if(cn&&cn.nm)stxt3(g,cn.nm,W/2,Math.round(H*.24)+9,'#ffb020',k3,'c');}}
  drawPopups();drawRadio();
  if(S.yellow>0&&((S.clock*3)|0)%2){g.fillStyle='#ffd23f';g.fillRect(0,0,W,Math.max(1,SC));g.fillRect(0,H-Math.max(1,SC),W,Math.max(1,SC));}
  if(S.mode==='race'&&S.goT>0)stxt5(g,'GO!',W/2,Math.round(H*.32),GR.green,K5()*2,'c',.25);
  if(S.stats&&P.draft>.3){const dw=Math.round(W*.12);g.fillStyle='#0a2a32';g.fillRect(W/2-dw/2,Math.round(H*.12),dw,Math.max(1,SC));g.fillStyle='#2fe6ff';g.fillRect(W/2-dw/2,Math.round(H*.12),Math.round(dw*P.draft),Math.max(1,SC));}
}
function drawSpeedo(){
  const m=MG(),k5=K5(),k3=K3(),kmh=Math.round(P.v*KMH),sy=H-m-7*k5;
  stxt5(g,String(kmh).padStart(3,' '),m,sy,'#ffffff',k5);stxt3(g,'KM/H',m+tw5('000',k5)+2*k3,H-m-5*k3,'#a69cba',k3);
  const n=20,tw=Math.round(W*.26),sw=tw/n,ty=sy-4*k3;
  for(let i=0;i<n;i++){const on=i/n<P.rpm;g.fillStyle=on?(i>16?'#ff2a4a':i>12?'#ffd23f':'#7dff6a'):'#1c1828';g.fillRect(m+i*sw,ty,Math.max(1,sw-1),2*k3);}
  stxt3(g,'GEAR '+P.gear,m+tw+3*k3,ty-k3,'#ffffff',k3);
  if(S.assist!==2&&S.mode!=='hw'&&W>=256)stxt3(g,ASSISTS[S.assist].name+' ASSIST',m,ty-7*k3,'#6a6488',k3);
}
function drawNitro(xr,ny){
  const k3=K3(),nw=Math.round(W*.2),nx=xr-nw;
  stxt3(g,'NITRO',nx,ny-7*k3,P.nitroOn?'#ffffff':'#9ff1ff',k3);
  g.fillStyle='#000';g.fillRect(nx-1,ny-1,nw+2,3*k3+2);g.fillStyle='#10202a';g.fillRect(nx,ny,nw,3*k3);
  g.fillStyle=P.nitroOn?(((S.clock*12)|0)%2?'#ffffff':'#2fe6ff'):'#2fe6ff';g.fillRect(nx,ny,nw*P.nitro,3*k3);
}
function drawPopups(){
  const k5=K5(),k3=K3();let py=H*.3;
  for(const p of S.popups){const a=p.t<.15?p.t/.15:p.t>1.3?(1.6-p.t)/.3:1;g.globalAlpha=clamp(a,0,1);
    stxt5(g,p.txt,W/2,py-p.t*4*SC,p.col,k5,'c',.25);if(p.sub)stxt3(g,p.sub,W/2,py-p.t*4*SC+8*k5,'#ffffff',k3,'c');g.globalAlpha=1;py+=14*k5;}
}
function drawRadio(){
  const k3=K3();let y=Math.round(H*.075)+MG()+4;
  for(const r of S.radio){const a=r.t<.2?r.t/.2:r.t>2.7?(3.2-r.t)/.5:1;g.globalAlpha=clamp(a,0,1);const w=tw3(r.txt,k3)+8;panel(W/2-w/2,y-2,w,5*k3+4,.6);txt3(g,r.txt,W/2,y,r.col,k3,'c');g.globalAlpha=1;y+=5*k3+6;}
}
/* ---------- the start lights, big, over the screen ---------- */
function drawLights(){
  const r=Math.max(2,Math.round(5*SC)),lx=W/2,ly=Math.round(H*.2);panel(lx-r*9,ly-r*1.8,r*18,r*3.6,.75);
  for(let i=0;i<5;i++){const on=i<S.lights;g.fillStyle=on?'#ff2a4a':'#3a1018';g.beginPath();g.arc(lx+(i-2)*r*3.4,ly,r,0,TAU);g.fill();if(on){g.fillStyle='rgba(255,60,80,.25)';g.beginPath();g.arc(lx+(i-2)*r*3.4,ly,r*1.8,0,TAU);g.fill();}}
  if(!S.demo){stxt3(g,S.hwGrid?'HIGHWAY RUN':'START FROM P'+S.gridPos,W/2,ly+r*2.6,'#c9b8ff',K3(),'c');if(!S.hwGrid&&S.lights>=2)stxt3(g,'NITRO AS THE LIGHTS GO OUT',W/2,ly+r*2.6+8*K3(),'#6a6488',K3(),'c');}
}
/* ---------- title (over the attract race) ---------- */
const CHROME=['#ffffff','#ffe0e6','#ff9aab','#ff4a62','#ff1a3a','#c80d2a','#7a0618'];
function drawTitle(){
  const k=W>=384?6:W>=256?4:3,k3=K3(),y=Math.round(H*.16);
  g.fillStyle='rgba(0,0,0,.38)';g.fillRect(0,y-4*SC,W,7*k+24*SC);
  for(let i=0;i<5;i++){g.fillStyle=['#ff1a3a','#ff4a62','#ffd23f','#2fe6ff','#3a7bff'][i];g.fillRect(0,y+7*k+3*SC+i*Math.max(1,SC),W*.5*(1-i*.12)+Math.sin(S.clock*3+i)*W*.04,Math.max(1,SC*.8));}
  txt5(g,'REDLINE',W/2+k,y+k,'#000',k,'c',.3);txt5(g,'REDLINE',W/2,y,CHROME,k,'c',.3);
  stxt5(g,'GRAND PRIX',W/2,y+7*k+9*SC,GR.gold,W>=320?2:1,'c',.2);
  if(((S.clock*1.6)|0)%2===0)stxt5(g,touchy?'TAP TO START':'PRESS START',W/2,Math.round(H*.66),'#ffffff',1,'c');
  stxt3(g,'GP BEST '+fmt(S.hi),W-3*SC,3*SC,'#ffd23f',k3,'r');
  /* the live order of the demo race */
  const o=raceOrder();for(let i=0;i<Math.min(4,o.length);i++){const c=o[i],yy=Math.round(H*.74)+i*7*k3;g.fillStyle=c.drv.tag;g.fillRect(MG(),yy,2*k3,5*k3);stxt3(g,(i+1)+' '+c.drv.name,MG()+4*k3,yy,'#c9b8ff',k3);}
  stxt3(g,'DEMO  '+TR.C.name,W-MG(),H-MG()-5*k3,'#7b84c9',k3,'r');
}
/* ---------- the menu: what to race, how much help ---------- */
const MODES=[{id:'gp',name:'GRAND PRIX',lines:['5 ROUNDS. 7 RIVALS','TOP 3 GO THROUGH']},{id:'hw',name:'HIGHWAY RUN',lines:['THE CLASSIC','BEAT THE CLOCK']}];
function drawMenu(){
  const k3=K3(),k5=K5();g.fillStyle='rgba(4,3,10,.72)';g.fillRect(0,0,W,H);
  stxt5(g,'REDLINE',W/2,MG()+2,CHROME,k5,'c',.2);
  const cw=Math.round(W*.36),ch=Math.round(H*.36),cy=Math.round(H*.2);
  MODES.forEach((md,i)=>{const cx=Math.round(W/2+(i?1:-1)*(cw/2+4*SC))-cw/2,sel=S.menuI===i,hot=S.menuRow===0&&sel;
    g.fillStyle=sel?'rgba(255,42,74,.22)':'rgba(255,255,255,.05)';g.fillRect(cx,cy,cw,ch);g.fillStyle=hot?(((S.clock*4)|0)%2?'#ffffff':'#ff2a4a'):sel?'#ff2a4a':'#3a3450';
    g.fillRect(cx,cy,cw,1);g.fillRect(cx,cy+ch-1,cw,1);g.fillRect(cx,cy,1,ch);g.fillRect(cx+cw-1,cy,1,ch);
    stxt5(g,md.name,cx+cw/2,cy+5*SC,sel?'#ffffff':'#a69cba',W>=320?1:1,'c');
    md.lines.forEach((l,j)=>stxt3(g,l,cx+cw/2,cy+Math.round(ch*.42)+j*8*k3,'#c9b8ff',k3,'c'));
    stxt3(g,i===0?'BEST '+fmt(S.hi):'BEST '+fmt(S.hwhi),cx+cw/2,cy+ch-8*k3,'#ffd23f',k3,'c');});
  const ay=cy+ch+Math.round(10*SC),hot=S.menuRow===1;
  stxt3(g,'ASSIST',W/2,ay,hot?'#ffffff':'#a69cba',k3,'c');
  ASSISTS.forEach((a,i)=>{const x=Math.round(W/2+(i-1)*W*.17),sel=S.assist===i;if(sel){const w=tw5(a.name)+6;g.fillStyle=hot&&((S.clock*4)|0)%2?'#ffffff':'#ff2a4a';g.fillRect(x-w/2,ay+7*k3+9,w,1);}
    stxt5(g,a.name,x,ay+7*k3,sel?'#ffffff':'#6a6488',1,'c');});
  const AD=['LINE, BRAKE CUES, LANE KEEP, GRIP HELP','RACING LINE AND BRAKE CUES','NO HELP. FASTEST IF YOU CAN HANDLE IT'];
  stxt3(g,AD[S.assist],W/2,ay+7*k3+13,'#7b84c9',k3,'c');
  if(((S.clock*1.6)|0)%2===0)stxt3(g,touchy?'TAP A MODE TO RACE':'ENTER TO RACE  ESC BACK',W/2,H-MG()-5*k3,'#ffffff',k3,'c');
}
/* ---------- round intro: the circuit ---------- */
function drawIntro(){
  const k3=K3(),k5=K5(),C=TR.C;g.fillStyle='rgba(4,3,10,.78)';g.fillRect(0,0,W,H);
  stxt3(g,'ROUND '+(S.round+1)+' OF '+CIRCUITS.length,MG(),MG(),'#ffb020',k3);
  stxt5(g,C.name,MG(),MG()+7*k3,GR.red,k5,'',.2);stxt3(g,C.sub,MG(),MG()+7*k3+8*k5+1,'#c9b8ff',k3);
  const bw=Math.round(W*.42),bh=Math.round(H*.56),bx=W-MG()-bw,by=Math.round(H*.16);panel(bx-3,by-3,bw+6,bh+6,.5,'#3a3450');drawMap(bx,by,bw,bh,true);
  const rec=parseFloat(store.get('hd-'+CAB.id+'-rec-'+C.id,'0'))||0,km=TR.N*1.344/1000;      /* 62 segments a second is 300 km/h, so a segment is 1.34 m */
  const rows=[['LAPS',''+TR.laps],['LENGTH',km.toFixed(2)+' KM'],['CORNERS',''+TR.corners.filter(c=>c.deg>=18).length],['RECORD',rec?fmtT(rec):'NONE YET'],['GRIP',S.wet?'WET':C.grip<.95?'COLD':'DRY'],['YOU START','P'+S.gridPos]];
  let y=Math.round(H*.36);for(const [a,b] of rows){stxt3(g,a,MG(),y,'#a69cba',k3);stxt3(g,b,Math.round(W*.42),y,'#ffffff',k3,'r');y+=7*k3+1;}
  const big=TR.corners.filter(c=>c.nm).slice(0,3).map(c=>c.nm);if(big.length)stxt3(g,big.join('  '),MG(),y+3,'#ffb020',k3);
  if(S.t>1&&((S.clock*1.6)|0)%2===0)stxt3(g,touchy?'TAP TO GO TO THE GRID':'PRESS START',W/2,H-MG()-5*k3,'#ffffff',k3,'c');
}
/* ---------- after the race ---------- */
function drawResults(){
  const k3=K3(),R=S.res,t=S.t;g.fillStyle='rgba(4,3,10,.84)';g.fillRect(0,0,W,H);
  stxt5(g,R.pos===1?'WINNER!':'RESULT  P'+R.pos,W/2,MG(),R.pos<=3?GR.gold:GR.steel,K5(),'c',.2);
  const x0=Math.round(W*.08),x1=Math.round(W*.6),rh=6*k3+1;let y=MG()+8*K5()+4;
  R.rows.forEach((r,i)=>{if(t<.2+i*.12)return;const lead=R.rows[0].t,tt=i===0?fmtT(r.t):'+'+(r.t-lead).toFixed(2);
    if(r.me){g.fillStyle='rgba(255,42,74,.25)';g.fillRect(x0-2,y-1,x1-x0+Math.round(W*.32),rh);}
    stxt3(g,String(i+1),x0,y,'#a69cba',k3);g.fillStyle=r.col;g.fillRect(x0+8*k3,y,2*k3,5*k3);stxt3(g,r.name,x0+12*k3,y,r.me?'#ffffff':'#c9b8ff',k3);
    stxt3(g,tt,x1,y,'#ffffff',k3,'r');stxt3(g,'+'+r.pts,x1+Math.round(W*.12),y,'#ffd23f',k3,'r');if(R.fast===r.name)stxt3(g,'FL',x1+Math.round(W*.2),y,'#ff9ae0',k3,'r');y+=rh;});
  if(t>1.4){const bx=Math.round(W*.08);y+=3;const B=R.bon;const lines=[['FINISH P'+R.pos,B.pos],['PLACES GAINED',B.passes],['FASTEST LAP',B.fast],['CLEAN RACE',B.clean]].filter(l=>l[1]>0);
    for(const [a,b] of lines){stxt3(g,a,bx,y,'#a69cba',k3);stxt3(g,'+'+fmt(b),bx+Math.round(W*.4),y,'#5aff6a',k3,'r');y+=rh;}
    stxt3(g,'SCORE '+fmt(S.score),W-MG(),H-MG()-12*k3,'#ffd23f',k3,'r');}
  if(t>2.2&&((S.clock*1.6)|0)%2===0)stxt3(g,touchy?'TAP TO CONTINUE':'PRESS START',W/2,H-MG()-5*k3,'#ffffff',k3,'c');
}
function drawStandings(){
  const k3=K3(),st=standings(),t=S.t;g.fillStyle='rgba(4,3,10,.84)';g.fillRect(0,0,W,H);
  stxt5(g,'CHAMPIONSHIP',W/2,MG(),GR.cyan,K5(),'c',.2);stxt3(g,'AFTER ROUND '+(S.round+1)+' OF '+CIRCUITS.length,W/2,MG()+8*K5()+2,'#a69cba',k3,'c');
  const x0=Math.round(W*.22),x1=Math.round(W*.78),rh=6*k3+2;let y=MG()+8*K5()+10*k3;
  st.forEach((r,i)=>{if(t<.2+i*.1)return;const d=r.me?{tag:'#ff2a4a'}:DRIVERS.find(q=>q.name===r.name);if(r.me){g.fillStyle='rgba(255,42,74,.25)';g.fillRect(x0-3,y-1,x1-x0+6,rh);}
    stxt3(g,String(i+1),x0,y,'#a69cba',k3);g.fillStyle=d.tag;g.fillRect(x0+8*k3,y,2*k3,5*k3);stxt3(g,r.name,x0+12*k3,y,r.me?'#ffffff':'#c9b8ff',k3);stxt3(g,r.pts+' PTS',x1,y,'#ffd23f',k3,'r');y+=rh;});
  if(t>1.5){const nx=CIRCUITS[S.round+1];if(nx)stxt3(g,'NEXT  '+nx.name,W/2,H-MG()-14*k3,'#ffb020',k3,'c');}
  if(t>1.8&&((S.clock*1.6)|0)%2===0)stxt3(g,touchy?'TAP TO CONTINUE':'PRESS START',W/2,H-MG()-5*k3,'#ffffff',k3,'c');
}
function drawContinue(){
  const k3=K3(),n=Math.max(0,Math.ceil(9-S.t));g.fillStyle='rgba(4,3,10,.84)';g.fillRect(0,0,W,H);
  stxt5(g,'NOT THROUGH',W/2,Math.round(H*.18),GR.red,K5(),'c',.2);stxt3(g,'TOP 3 GO THROUGH TO THE NEXT ROUND',W/2,Math.round(H*.18)+9*K5(),'#c9b8ff',k3,'c');
  stxt5(g,'RETRY THE ROUND?',W/2,Math.round(H*.46),'#ffffff',1,'c');stxt5(g,String(n),W/2,Math.round(H*.56),GR.volt,W>=320?3:2,'c');
  stxt3(g,'ONE RETRY PER GRAND PRIX',W/2,Math.round(H*.8),'#7b84c9',k3,'c');if(((S.clock*2)|0)%2)stxt3(g,touchy?'TAP TO RETRY':'START TO RETRY  ESC TO END',W/2,H-MG()-5*k3,'#ffffff',k3,'c');
}
/* a gold cup, drawn in dots */
function drawTrophy(cx,cy,s){
  const G=GR.gold;g.fillStyle=G[4];g.fillRect(cx-s*.5,cy+s*.9,s,s*.18);g.fillStyle=G[5];g.fillRect(cx-s*.32,cy+s*.75,s*.64,s*.16);g.fillStyle=G[3];g.fillRect(cx-s*.08,cy+s*.4,s*.16,s*.36);
  g.fillStyle=G[2];g.beginPath();g.moveTo(cx-s*.5,cy-s*.5);g.lineTo(cx+s*.5,cy-s*.5);g.quadraticCurveTo(cx+s*.48,cy+s*.35,cx,cy+s*.42);g.quadraticCurveTo(cx-s*.48,cy+s*.35,cx-s*.5,cy-s*.5);g.fill();
  g.strokeStyle=G[3];g.lineWidth=Math.max(1,s*.07);g.beginPath();g.arc(cx-s*.5,cy-s*.15,s*.2,PI*.5,PI*1.5);g.stroke();g.beginPath();g.arc(cx+s*.5,cy-s*.15,s*.2,-PI*.5,PI*.5);g.stroke();
  g.fillStyle=G[0];g.fillRect(cx-s*.3,cy-s*.42,s*.1,s*.5);const sp=(S.clock*1.5)%2-.5;g.globalAlpha=.6;g.fillRect(cx+sp*s,cy-s*.45,Math.max(1,s*.06),s*.8);g.globalAlpha=1;
}
function drawChampion(){
  const k3=K3(),cp=S.champPos,t=S.t;g.fillStyle='rgba(4,3,10,.86)';g.fillRect(0,0,W,H);
  if(cp===1){drawTrophy(W/2,Math.round(H*.36),Math.round(H*.2));stxt5(g,'WORLD CHAMPION',W/2,MG(),GR.gold,K5(),'c',.2);
    for(let i=0;i<30;i++){const a=i/30*TAU+S.clock*.8,r=H*.3+Math.sin(S.clock*3+i)*H*.04;g.fillStyle=['#ffd23f','#ff2a4a','#2fe6ff','#ffffff'][i%4];g.fillRect(W/2+Math.cos(a)*r*1.4,H*.38+Math.sin(a)*r*.8,Math.max(1,SC),Math.max(1,SC));}}
  else{stxt5(g,'FINAL STANDINGS',W/2,MG(),GR.steel,K5(),'c',.2);stxt5(g,'P'+cp+' IN THE CHAMPIONSHIP',W/2,Math.round(H*.3),'#ffffff',1,'c');}
  drawTally(Math.round(H*.66),t);
}
function drawTally(y,t){
  const k3=K3(),tk=Math.min(S.tickets,Math.floor(Math.max(0,t-1)*12));
  stxt5(g,'SCORE '+fmt(S.score),W/2,y,'#ffffff',1,'c');if(S.newHi&&((S.clock*3)|0)%2)stxt3(g,'NEW BEST',W/2,y+9,'#5aff6a',k3,'c');
  stxt5(g,tk+' TICKETS',W/2,y+12+5*k3,GR.volt,1,'c');
  if(t>2.5&&((S.clock*1.6)|0)%2===0)stxt3(g,touchy?'TAP TO CONTINUE':'PRESS START',W/2,H-MG()-5*k3,'#ffffff',k3,'c');
}
function drawOver(){
  g.fillStyle='rgba(4,3,10,.84)';g.fillRect(0,0,W,H);stxt5(g,'GAME OVER',W/2,Math.round(H*.18),GR.red,K5(),'c',.2);
  if(S.roundRes&&S.roundRes.length)stxt3(g,'ROUNDS '+S.roundRes.map(p=>'P'+p).join(' '),W/2,Math.round(H*.18)+9*K5(),'#c9b8ff',K3(),'c');
  drawTally(Math.round(H*.48),S.t);
}
/* ---------- the highway ---------- */
function drawHwHUD(){
  const m=MG(),k5=K5(),k3=K3(),H2=S.hw;
  const tcol=H2.time<=10&&((S.clock*4)|0)%2?'#ff2a4a':'#ffd23f';stxt3(g,'TIME',m,m,'#ffffff',k3);stxt5(g,String(Math.ceil(H2.time)).padStart(2,'0'),m,m+6*k3+1,tcol,k5);
  stxt3(g,'SCORE',W-m,m,'#ffffff',k3,'r');stxt5(g,fmt(S.score),W-m,m+6*k3+1,'#2fe6ff',k5>1?k5-1:1,'r');
  if(W>=192){const st=VIEW.th;stxt3(g,THEMES[st].name,W/2,m,'#c9b8ff',k3,'c');const s=segAt(P.z),s0=TR.stageStart[st],s1=st+1<TR.stageStart.length?TR.stageStart[st+1]:TR.N,pr=clamp((s.i-s0)/(s1-s0),0,1);
    const bw=W*.24,bx=W/2-bw/2,byy=m+6*k3+2;g.fillStyle='#000';g.fillRect(bx-1,byy-1,bw+2,k3+3);g.fillStyle='#2a2440';g.fillRect(bx,byy,bw,k3+1);g.fillStyle='#7dff6a';g.fillRect(bx,byy,bw*pr,k3+1);}
  drawSpeedo();drawNitro(W-m,H-m-3*k3);drawPopups();
  if(S.mode==='hw'&&S.goT>0)stxt5(g,'GO!',W/2,Math.round(H*.32),GR.green,K5()*2,'c',.25);
}
function drawHwOver(){
  const k3=K3(),H2=S.hw,x0=W*.18,x1=W*.82;g.fillStyle='rgba(6,4,14,.82)';g.fillRect(W*.12,H*.1,W*.76,H*.8);
  stxt5(g,'TIME UP',W/2,H*.13,'#ff4a62',K5(),'c',.25);
  const rows=[['DISTANCE',H2.dist.toFixed(1)+' KM'],['TOP SPEED',Math.round(H2.top*KMH)+' KM/H'],['NEAR MISSES',String(H2.near)],['LAP',String(H2.lap)],['BEST',fmt(S.hwhi)]];
  let y=H*.13+9*K5();for(const [a,b] of rows){stxt3(g,a,x0,y,'#a69cba',k3);stxt3(g,b,x1,y,'#ffffff',k3,'r');y+=7*k3;}
  drawTally(Math.round(H*.62),S.t);
}
function drawPause(){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,W,H);const y0=Math.round(H*.36);stxt5(g,'PAUSED',W/2,y0-10*K5(),GR.steel,K5(),'c');
  ['RESUME',S.mode==='hw'?'END THE RUN':'RETIRE FROM THE GRAND PRIX'].forEach((t,i)=>{const sel=(S.pauseI||0)===i;stxt5(g,(sel?'> ':'')+t+(sel?' <':''),W/2,y0+10*K5()+i*Math.round(13*SC),sel?'#ffffff':'#6a6488',1,'c');});
  stxt3(g,'ASSIST '+ASSISTS[S.assist].name,W/2,H-MG()-5*K3(),'#7b84c9',K3(),'c');}
