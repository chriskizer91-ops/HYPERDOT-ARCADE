/* ===================== match & round flow ===================== */
function newFight(o){
  FIGHT={f:[mkFighter(o.p1,0,o.c1),mkFighter(o.p2,1,o.c2)],stageId:o.stage,phase:'intro',pt:0,round:1,timer:99,timeT:0,tick:0,practice:!!o.practice,demo:!!o.demo,onEnd:o.onEnd,
    winnerF:null,koFlash:0,superName:'',superT:0,superSide:0,firstHit:null,dummyBlock:false,fightT:0,msg:null,perfect:false,dmgDealt:[0,0]};
  if(o.c1==='cpu')FIGHT.f[0].ai=mkAI(FIGHT.f[0],o.lvl1??o.lvl??.5);
  if(o.c2==='cpu')FIGHT.f[1].ai=mkAI(FIGHT.f[1],o.lvl??.5);
  useStage(o.stage);setTrack(o.demo?'title':STAGE.music);
  resetRound(true);
}
function resetRound(first){
  const [A,B]=FIGHT.f;
  for(const F of FIGHT.f){Object.assign(F,{hp:F.def.hp,red:F.def.hp,redT:0,dead:false,t:0,move:null,vx:0,vy:0,y:0,air:false,combo:0,comboDmg:0,juggle:0,inv:0,proj:0,trail:[],hidden:false,
    grabbed:null,grabber:null,stun:0,hurtT:0,flashT:0,cine:false,showComboT:0,airAtk:0,crouching:false});clearBuf(F);F.state=first&&!FIGHT.demo?'intro':'idle';F.chains=mkChains(F.def);}
  A.x=-1.5;B.x=1.5;A.face=1;B.face=-1;
  PROJ.length=0;FXL.length=0;POPS.length=0;HITSTOP=0;SUPERF=0;SUPEROWN=null;SLOW=1;SLOWT=0;
  CAM.x=0;CAM.y=0;CAM.vh=3.5;CAM.focus=null;CAM.shake=0;
  Object.assign(FIGHT,{timer:99,timeT:0,firstHit:null,winnerF:null,phase:first&&!FIGHT.demo?'intro':'round',pt:0,fightT:0,koFlash:0,perfect:false});
  for(const F of FIGHT.f){computePose(F);cpPose(F.tp,F.rp);solve(F.tp,F.def.body,F.J);solve(F.rp,F.def.body,F.Jr);for(let i=0;i<40;i++)for(const ch of F.chains)updChain(ch,F);}
  if(FIGHT.demo){FIGHT.phase='fight';}
}
const ROUNDTXT=['ROUND 1','ROUND 2','FINAL ROUND','EXTRA ROUND','EXTRA ROUND'];
function roundLogic(){
  const Fi=FIGHT,[A,B]=Fi.f;Fi.pt++;
  switch(Fi.phase){
    case 'intro':if(Fi.pt>=110){for(const F of Fi.f)setState(F,'idle');Fi.phase='round';Fi.pt=0;}break;
    case 'round':if(Fi.pt===2){SFX.bell();say(ROUNDTXT[Math.min(4,Fi.round-1)].replace('ROUND 1','Round one').replace('ROUND 2','Round two').toLowerCase());}
      if(Fi.pt>=78){Fi.phase='fight';Fi.pt=0;Fi.fightT=0;say('Fight!');SFX.boom(.8);}break;
    case 'fight':Fi.fightT++;
      if(!Fi.practice&&!Fi.demo){Fi.timeT++;if(Fi.timeT>=60){Fi.timeT=0;Fi.timer--;if(Fi.timer<=0){Fi.timer=0;timeUp();}}}
      if(Fi.demo&&Fi.fightT>60*70){timeUp();}
      if(Fi.practice){const D=B;if(D.state!=='hit'&&D.state!=='airhit'&&D.state!=='kd'&&D.state!=='thrown'&&D.hp<D.def.hp){D.hp=Math.min(D.def.hp,D.hp+12);D.red=Math.max(D.red,D.hp);}A.meter=Math.max(A.meter,Math.min(200,A.meter+.5));}
      break;
    case 'ko':case 'timeup':{
      const W0=Fi.winnerF,Lf=W0?opp(W0):null;
      if(Fi.pt>40&&W0&&!W0.air&&(W0.state==='idle'||NEUTRAL.has(W0.state)||W0.state==='land')&&(!Lf||Lf.state==='kd'||Lf.state==='lose'||Fi.phase==='timeup')){setState(W0,'win');}
      if(Fi.pt>(Fi.phase==='ko'?150:110)){Fi.phase='roundend';Fi.pt=0;}
      break;}
    case 'roundend':
      if(Fi.pt===1){const w=Fi.winnerF;if(w){w.wins++;Fi.perfect=w.hp>=w.def.hp;if(!Fi.demo)say(Fi.perfect?'Perfect':(APP.mode==='arcade'?(w.side===0?'You win':'You lose'):(w.side===0?'Player one wins':'Player two wins')));
          if(APP.mode==='arcade'&&w.side===0&&!Fi.demo)APP.score+=Math.round(w.hp*8+Fi.timer*120+(Fi.perfect?20000:0)+5000);}
        else say('Draw');}
      if(Fi.pt>=150){
        const w=Fi.winnerF,done=Fi.demo||(w&&w.wins>=2)||Fi.round>=5;
        if(done){if(Fi.demo){startDemo();return;}const ws=w?w.side:(A.hp>=B.hp?0:1);Fi.onEnd&&Fi.onEnd(ws);}
        else{Fi.round++;resetRound(false);}
      }
      break;
  }
}
function timeUp(){
  const [A,B]=FIGHT.f;FIGHT.phase='timeup';FIGHT.pt=0;say('Time');
  FIGHT.winnerF=A.hp>B.hp?A:B.hp>A.hp?B:null;
  for(const F of FIGHT.f){if(F!==FIGHT.winnerF){if(!F.air&&F.state!=='kd')setState(F,'lose');}F.move=null;if(F.state==='attack')setState(F,'idle');}
}

/* ===================== app screens ===================== */
const APP={screen:'title',t:0,mode:'arcade',menuI:0,pauseI:0,pause:false,score:0,hi:parseInt(store.get('vf-hi','0'),10)||0,ladder:[],stageI:0,player:'kai',
  sel:[{i:0,done:false},{i:1,done:false}],vs:null,cont:9,contT:0,end:0,hot:[],howI:0,beaten:store.get('vf-beat','0')==='1',listI:0};
function go(s){APP.screen=s;APP.t=0;APP.hot=[];}
function startDemo(){
  const ids=PICKS.concat(APP.beaten?['echo']:[]),a=pick(ids);let b=pick(ids);if(b===a)b=pick(ids);
  newFight({p1:a,p2:b,c1:'cpu',c2:'cpu',lvl:.75,lvl1:.75,stage:ROSTER[pick([a,b])].stage,demo:true});
}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;}
function startArcade(pid){APP.player=pid;APP.ladder=shuffle(PICKS.filter(x=>x!==pid)).concat(['echo']);APP.stageI=0;APP.score=0;ARC.begin();nextArcade();}
function nextArcade(){const o=APP.ladder[APP.stageI];APP.vs={p1:APP.player,p2:o,stage:ROSTER[o].stage,lvl:[.36,.52,.68,.84][APP.stageI]};go('vs');}
function launchVs(){
  const v=APP.vs;
  if(APP.mode==='arcade')newFight({p1:v.p1,p2:v.p2,c1:0,c2:'cpu',lvl:v.lvl,stage:v.stage,onEnd:w=>{
    if(w===0){APP.stageI++;if(APP.score>APP.hi){APP.hi=APP.score;store.set('vf-hi',APP.hi);}if(APP.stageI>=APP.ladder.length){APP.beaten=true;store.set('vf-beat','1');go('ending');setTrack('ending');APP.tix=vfTickets(true);ARC.over(APP.score,APP.tix);}else nextArcade();}
    else{go('cont');APP.cont=9;APP.contT=0;setTrack('cont');say('Continue?');}}});
  else if(APP.mode==='versus')newFight({p1:v.p1,p2:v.p2,c1:1,c2:2,stage:v.stage,onEnd:w=>{APP.vsWinner=w;go('select');APP.sel[0].done=APP.sel[1].done=false;setTrack('select');}});
  else newFight({p1:v.p1,p2:v.p2,c1:0,c2:'dummy',stage:v.stage,practice:true});
  go('fight');
}

/* ---------- menu input with edges + auto-repeat ---------- */
const UIN=[{c:blank(),p:blank(),rep:{}},{c:blank(),p:blank(),rep:{}}];
function uiPoll(){
  const a=readPlayer(APP.mode==='versus'&&APP.screen==='select'?1:0),b=readPlayer(2);
  for(const [k,src] of [[0,a],[1,b]]){const u=UIN[k];u.p=u.c;u.c=src;}
}
function ed(k,key){const u=UIN[k];if(u.c[key]&&!u.p[key]){u.rep[key]=0;return true;}if(u.c[key]&&(key==='l'||key==='r'||key==='u'||key==='d')){u.rep[key]=(u.rep[key]||0)+1;if(u.rep[key]>18&&u.rep[key]%6===0)return true;}return false;}
const OK=k=>ed(k,'P')||ed(k,'start'),BACK=k=>ed(k,'K');

/* ---------- puppets: fighters drawn outside a fight (select, VS, endings) ---------- */
const PUP={};
function puppet(id,face,tag){const k=id+face+(tag||'');let p=PUP[k];if(!p){const def=ROSTER[id];p={def,x:0,y:0,face,state:'idle',hurtT:0,tp:P(def.st.S0),J:{},Jr:null,clock:0,chains:mkChains(def)};p.Jr=p.J;PUP[k]=p;}return p;}
function animPuppet(p,pose,bob){p.clock++;cpPose(pose||p.def.st.S0,p.tp);const b=Math.sin(p.clock*.085);p.tp.hy-=.012*(1+b)*.5*(bob??1);p.tp.an[1]+=.012*b;solve(p.tp,p.def.body,p.J);FRAMET++;for(const ch of p.chains)updChain(ch,p);}
function drawPuppet(p,cx,gy,S,clip){VIEW.S=S;VIEW.ox=cx;VIEW.oy=gy;if(clip)setClip(clip[0],clip[1],clip[2],clip[3]);if(p.def.look.holo)updHolo();drawFighter(p,{mode:p.def.look.holo?3:0});fullClip();}
function beginLayer(){RBUF.fill(0);fullClip();}
function endLayer(){acx.putImageData(AIMG,0,0);}

/* ---------- shared drawing ---------- */
const U=()=>W/384;
function heading(txt,y,cols,sc,t,it=.25){
  const k=t<8?1+(8-t)*.18:1,s=Math.max(1,Math.round(sc*k));
  otxt5(g,txt,W/2,y-((s-sc)*3.5),cols,s,'c',it,'#000');
}
function panel(x,y,w,h,a=.78){g.fillStyle=`rgba(8,5,16,${a})`;g.fillRect(x,y,w,h);g.strokeStyle='rgba(255,255,255,.16)';g.strokeRect(x+.5,y+.5,w-1,h-1);}
function bgStripes(c0,c1,t){g.fillStyle=c0;g.fillRect(0,0,W,H);g.strokeStyle=c1;g.lineWidth=Math.max(1,W/96);const s=W/12,o=(t*.6)%s;for(let x=-H-s+o;x<W+s;x+=s){g.beginPath();g.moveTo(x,H);g.lineTo(x+H,0);g.stroke();}}
function dotsBg(col){g.fillStyle=col;const s=Math.max(3,Math.round(W/64));for(let y=s/2;y<H;y+=s)for(let x=s/2;x<W;x+=s)g.fillRect(x|0,y|0,1,1);}

/* ---------- HUD ---------- */
function bar(x,y,w,h,F,dirLeft){
  const pct=clamp(F.hp/F.def.hp,0,1),rp=clamp(F.red/F.def.hp,0,1),low=pct<.25&&((FRAMET>>3)&1);
  g.fillStyle='#000';g.fillRect(x-1,y-1,w+2,h+2);g.fillStyle='#2a0a14';g.fillRect(x,y,w,h);
  const fill=(p,col)=>{const ww=Math.round(w*p);if(dirLeft)g.fillRect(x+w-ww,y,ww,h);else g.fillRect(x,y,ww,h);};
  g.fillStyle='#ff2a3a';fill(rp);
  const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,low?'#ffffff':'#fff2a0');gr.addColorStop(.5,low?'#ff8080':'#ffc21a');gr.addColorStop(1,low?'#c02030':'#ff8a10');g.fillStyle=gr;fill(pct);
  g.fillStyle='rgba(0,0,0,.35)';for(let i=x+3;i<x+w;i+=3)g.fillRect(i,y,1,h);
  g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x,y,w,1);
}
function hud(){
  const u=U(),m=Math.round(4*u),bw=Math.round(W*.4),bh=Math.max(5,Math.round(7*u)),by=Math.round(5*u)+2,[A,B]=FIGHT.f,k3=W>=320?1:1;
  bar(m,by,bw,bh,A,true);bar(W-m-bw,by,bw,bh,B,false);
  otxt3(g,A.def.name,m,by+bh+3,'#ffffff',k3);otxt3(g,B.def.name,W-m,by+bh+3,'#ffffff',k3,'r');
  for(let i=0;i<2;i++){const on1=A.wins>i,on2=B.wins>i,y=by+bh+3,s=Math.max(3,Math.round(4*u));
    g.fillStyle=on1?'#ffd23f':'#3a2a40';g.fillRect(m+bw-(i+1)*(s+2),y,s,s);g.fillStyle=on2?'#ffd23f':'#3a2a40';g.fillRect(W-m-bw+i*(s+2),y,s,s);}
  const tx=W/2,tsc=W>=320?3:2;
  if(FIGHT.practice)otxt3(g,'PRACTICE',tx,by,'#7dff6a',1,'c');
  else{const tt=String(FIGHT.timer).padStart(2,'0'),col=FIGHT.timer<=10&&((FRAMET>>4)&1)?'#ff3b5c':'#ffffff';otxt5(g,tt,tx,by-1,col,tsc,'c');}
  const mw=Math.round(W*.2),mh=Math.max(3,Math.round(4*u)),my=H-m-mh;
  for(const [F,x,al] of [[A,m,'l'],[B,W-m-mw,'r']]){
    g.fillStyle='#000';g.fillRect(x-1,my-1,mw+2,mh+2);g.fillStyle='#14102a';g.fillRect(x,my,mw,mh);
    const p=F.meter/200,full=F.meter>=100,gr=g.createLinearGradient(x,0,x+mw,0);gr.addColorStop(0,'#2fe6ff');gr.addColorStop(1,F.meter>=200?'#ffffff':'#7a4cff');g.fillStyle=gr;
    if(al==='l')g.fillRect(x,my,Math.round(mw*p),mh);else g.fillRect(x+mw-Math.round(mw*p),my,Math.round(mw*p),mh);
    g.fillStyle='#000';g.fillRect(x+mw/2,my,1,mh);
    const lv=Math.floor(F.meter/100),lab=lv?('SUPER x'+lv):'SUPER';
    otxt3(g,lab,al==='l'?x:x+mw,my-7,full&&((FRAMET>>3)&1)?'#ffd23f':'#a69cba',1,al==='l'?undefined:'r');
  }
  for(const F of [A,B])if(F.showComboT>0&&F.showCombo>=2){const x=F.side===0?m+2:W-m-2,y=Math.round(H*.3),sc=W>=320?3:2,al=F.side===0?undefined:'r',k=F.showComboT>80?1.3:1;
    otxt5(g,String(F.showCombo),x,y,GR.volt,Math.round(sc*k),al,.2);otxt3(g,'HITS',x+(F.side===0?tw5(String(F.showCombo),sc)+3:-(tw5(String(F.showCombo),sc)+3)),y+7*sc-5,'#ffffff',1,al);
    otxt3(g,Math.round(F.lastCD)+' DMG',x,y+7*sc+3,'#ff9aab',1,al);}
  let py=[Math.round(H*.48),Math.round(H*.48)];
  for(const p of POPS){p.t++;if(p.t>70)continue;const x=p.side===0?m+2:W-m-2,al=p.side===0?undefined:'r';if(p.t<60||((p.t>>1)&1))otxt5(g,p.txt,x,py[p.side],p.col,1,al,.2);py[p.side]+=10;}
  for(let i=POPS.length-1;i>=0;i--)if(POPS[i].t>70)POPS.splice(i,1);
  centerMsg();
  if(SUPERF>0)cutIn();
  if(FIGHT.koFlash>0){g.fillStyle=`rgba(255,255,255,${Math.min(.85,FIGHT.koFlash)*(reduce?.3:1)})`;g.fillRect(0,0,W,H);FIGHT.koFlash=Math.max(0,FIGHT.koFlash-.07);}
}
function centerMsg(){
  const Fi=FIGHT,big=W>=384?4:W>=320?3:2,y=Math.round(H*.36);
  if(Fi.phase==='intro'){const t=Fi.pt;const [A,B]=Fi.f;
    if(t>10){otxt5(g,A.def.full,Math.round(W*.04),Math.round(H*.7),GR[A.def.gr],W>=320?2:1,undefined,.2);otxt3(g,A.def.title,Math.round(W*.04),Math.round(H*.7)+(W>=320?17:9),'#ffffff');}
    if(t>30){otxt5(g,B.def.full,Math.round(W*.96),Math.round(H*.7),GR[B.def.gr],W>=320?2:1,'r',.2);otxt3(g,B.def.title,Math.round(W*.96),Math.round(H*.7)+(W>=320?17:9),'#ffffff',1,'r');}
    if(t>60&&t<100)heading('VS',Math.round(H*.42),GR.volt,big,t-60);}
  else if(Fi.phase==='round')heading(ROUNDTXT[Math.min(4,Fi.round-1)],y,GR.steel,big,Fi.pt);
  else if(Fi.phase==='fight'&&Fi.fightT<45&&!Fi.demo)heading('FIGHT!',y,GR.volt,big+1,Fi.fightT);
  else if(Fi.phase==='ko'&&Fi.pt>12&&Fi.pt<150){const s=Fi.pt<20?big+3:big+1;otxt5(g,'K.O.',W/2+(Fi.pt<30&&!reduce?rnd(-2,2):0),y-6,GR.red,s,'c',.25);}
  else if(Fi.phase==='timeup')heading('TIME',y,GR.steel,big,Fi.pt);
  else if(Fi.phase==='roundend'&&!Fi.demo){const w=Fi.winnerF;let t=w?(APP.mode==='arcade'?(w.side===0?'YOU WIN':'YOU LOSE'):(w.side===0?'P1 WINS':'P2 WINS')):'DRAW';
    heading(t,y,w&&w.side===0?GR.volt:GR.cyan,big,Fi.pt);if(Fi.perfect&&Fi.pt>20)heading('PERFECT',y+8*big+4,GR.pink,big-1,Fi.pt-20);
    if(w&&Fi.pt>40){otxt3(g,'"'+w.def.quote.toUpperCase()+'"',W/2,Math.round(H*.62),'#ffffff',1,'c');}}
}
function cutIn(){
  const F=SUPEROWN;if(!F)return;const t=FIGHT.superT,y0=Math.round(H*.26),h=Math.round(H*.26),slide=Math.min(1,t/8),dir=F.side===0?1:-1;
  const off=Math.round((1-slide)*W*dir*-1);
  g.save();g.beginPath();g.moveTo(off,y0+4);g.lineTo(off+W,y0-4);g.lineTo(off+W,y0+h-4);g.lineTo(off,y0+h+4);g.closePath();g.clip();
  const gr=g.createLinearGradient(0,y0,0,y0+h);gr.addColorStop(0,rgba(F.def.glow,.9));gr.addColorStop(1,rgba(F.def.glow.map(c=>c*.3),.95));g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.strokeStyle='rgba(255,255,255,.25)';for(let i=0;i<14;i++){const yy=y0+((i*13+t*9)%h);g.beginPath();g.moveTo(0,yy);g.lineTo(W,yy-6);g.stroke();}
  g.restore();
  beginLayer();const p=puppet(F.id,dir,'cut');animPuppet(p,P(F.def.st.S0,{head:-10,lean:4,an:[.22,.86],af:[.04,.86]}),0);
  const S=H*2.5,hx=F.side===0?W*.26:W*.74;
  const J=p.J,cx=hx-(J.C[0]*dir)*S+off,gy=y0+h*.56+J.C[1]*S;
  drawPuppet(p,cx,gy,S,[0,y0-4,W,y0+h+4]);endLayer();g.drawImage(ac,0,0);
  const sc=W>=384?3:2,tx=F.side===0?Math.round(W*.94):Math.round(W*.06);
  if(t>4)otxt5(g,FIGHT.superName,tx+off,y0+h/2-3.5*sc,GR.volt,sc,F.side===0?'r':undefined,.25);
  otxt3(g,'SUPER',tx+off,y0+h/2-3.5*sc-9,'#ffffff',1,F.side===0?'r':undefined);
}

/* ---------- title ---------- */
function drawLogo(y,t){
  const sc=W>=384?6:W>=320?5:4,txt='VOLTFIST';
  otxt5(g,txt,W/2+sc,y+sc,'#000',sc,'c',.18);otxt5(g,txt,W/2,y,GR.volt,sc,'c',.18);
  if(!reduce&&t%3===0){const x0=W/2-tw5(txt,sc)/2,x=x0+Math.random()*tw5(txt,sc);g.save();g.globalCompositeOperation='lighter';zig(x,y-4,x+rnd(-20,20),y+7*sc+4,6,4,'rgba(150,230,255,.9)',1);g.restore();}
  otxt3(g,'LED MATRIX FIGHTER',W/2,y+7*sc+6,'#2fe6ff',W>=320?2:1,'c');
}
function drawTitle(){
  renderScene();g.fillStyle='rgba(4,2,10,.55)';g.fillRect(0,0,W,H);
  drawLogo(Math.round(H*.2),APP.t);
  if(((APP.t>>5)&1)===0)otxt5(g,touchy?'TAP TO START':'PRESS ENTER',W/2,Math.round(H*.66),'#ffffff',W>=320?2:1,'c');
  otxt3(g,'HI SCORE '+fmt(APP.hi),W/2,Math.round(H*.8),'#ffd23f',1,'c');
  otxt3(g,'(C) 2026 HYPERDOT ARCADE  FREE PLAY',W/2,H-8,'#7b84c9',1,'c');
}
/* ---------- main menu ---------- */
const MENU=[['ARCADE','FIGHT 3 RIVALS, THEN THE BOSS'],['VERSUS','TWO PLAYERS, ONE KEYBOARD OR PADS'],['PRACTICE','TRAIN ON A DUMMY, ENDLESS METER'],['HOW TO PLAY','CONTROLS AND MOVE LISTS'],['ANNOUNCER','VOICE ON / OFF']];
function drawMenu(){
  renderScene();g.fillStyle='rgba(4,2,10,.62)';g.fillRect(0,0,W,H);
  const sc=W>=320?3:2;otxt5(g,'VOLTFIST',W/2,Math.round(H*.1),GR.volt,sc,'c',.18);
  const iw=Math.round(W*.5),ih=Math.round(H*.1),x=Math.round(W/2-iw/2);let y=Math.round(H*.3);
  APP.hot=[];
  MENU.forEach((m,i)=>{const on=APP.menuI===i;panel(x,y,iw,ih,on?.9:.6);if(on){g.fillStyle='#ffd23f';g.fillRect(x,y,3,ih);}
    const lab=i===4?('ANNOUNCER '+(VOICE?'ON':'OFF')):m[0];otxt5(g,lab,x+10,y+Math.round((ih-7)/2),on?'#ffffff':'#a69cba',1);
    APP.hot.push({x,y,w:iw,h:ih,fn:()=>{APP.menuI=i;menuPick();}});y+=ih+3;});
  otxt3(g,MENU[APP.menuI][1],W/2,y+4,'#2fe6ff',1,'c');
}
function menuPick(){
  SFX.confirm();const i=APP.menuI;
  if(i===0){APP.mode='arcade';toSelect();}
  else if(i===1){APP.mode='versus';toSelect();}
  else if(i===2){APP.mode='practice';toSelect();}
  else if(i===3){go('howto');APP.howI=0;}
  else{VOICE=!VOICE;store.set('vf-voice',VOICE?'1':'0');if(VOICE)say('Announcer on');}
}
function toSelect(){APP.sel=[{i:APP.sel[0].i,done:false},{i:APP.sel[1].i,done:APP.mode==='arcade'}];APP.selT=20*60;go('select');setTrack('select');say('Choose your fighter');}
/* ---------- character select ---------- */
const SELIDS=()=>PICKS.concat(APP.beaten&&APP.mode!=='arcade'?['echo']:[]);
function drawSelect(){
  const ids=SELIDS(),n=ids.length,t=APP.t,u=U();
  bgStripes('#0c0618','#160c2a',t);dotsBg('rgba(255,255,255,.05)');
  beginLayer();
  const fw=Math.round(Math.min(W*.13,H*.24)),fh=Math.round(fw*1.15),gap=Math.round(4*u),tot=n*fw+(n-1)*gap,x0=Math.round(W/2-tot/2),fy=Math.round(H*.7);
  ids.forEach((id,i)=>{const x=x0+i*(fw+gap),p=puppet(id,1,'port');animPuppet(p,null,.5);const S=fh*1.9,J=p.J;drawPuppet(p,x+fw*.5-J.C[0]*S,fy+fh*.62+J.C[1]*S,S,[x,fy,x+fw,fy+fh]);});
  const show=APP.mode==='arcade'?[0]:[0,1];
  for(const s of show){const id=ids[APP.sel[s].i%n],face=s===0?1:-1,p=puppet(id,face,'big'),st=p.def.st,pose=APP.sel[s].done?st.WIN:st.S0;animPuppet(p,pose);
    const S=H/3.25,cx=s===0?Math.round(W*.2):Math.round(W*.8);drawPuppet(p,cx,Math.round(H*.655),S,[0,0,W,Math.round(H*.67)]);}
  endLayer();
  g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,Math.round(H*.66),W,H);
  g.drawImage(ac,0,0);
  otxt5(g,APP.mode==='arcade'?'SELECT YOUR FIGHTER':APP.mode==='versus'?'VERSUS':'PRACTICE: PICK BOTH',W/2,Math.round(4*u)+2,GR.steel,W>=320?2:1,'c',.2);
  APP.hot=[];
  ids.forEach((id,i)=>{const x=x0+i*(fw+gap);g.strokeStyle='#3a2a50';g.strokeRect(x+.5,fy+.5,fw-1,fh-1);
    APP.hot.push({x,y:fy,w:fw,h:fh,fn:()=>{const s=APP.mode==='practice'&&APP.sel[0].done?1:0;if(APP.sel[s].i%n===i)selConfirm(s);else{APP.sel[s].i=i;SFX.select();}}});});
  for(const s of [0,1]){if(APP.mode==='arcade'&&s===1)continue;const i=APP.sel[s].i%n,x=x0+i*(fw+gap),col=s===0?'#ffd23f':'#2fe6ff',bl=((t>>3)&1)||APP.sel[s].done;
    if(bl){g.strokeStyle=col;g.lineWidth=2;g.strokeRect(x,fy,fw,fh);g.lineWidth=1;}otxt3(g,s===0?'P1':'P2',x+(s===0?2:fw-2),fy+fh+2,col,1,s===0?undefined:'r');}
  for(const s of show){const d=ROSTER[ids[APP.sel[s].i%n]],left=s===0,x=left?Math.round(W*.4):Math.round(W*.6),al=left?undefined:'r',y=Math.round(H*.2),sc=W>=320?2:1;
    if(APP.mode==='arcade'||s===0||true){
      otxt5(g,d.name,x,y,GR[d.gr],sc+1,al,.2);otxt3(g,d.title,x,y+7*(sc+1)+3,'#ffffff',1,al);
      const labs=['POWER','SPEED','RANGE'];labs.forEach((l,k)=>{const yy=y+7*(sc+1)+12+k*8;otxt3(g,l,x,yy,'#a69cba',1,al);for(let q=0;q<5;q++){g.fillStyle=q<d.stats[k]?'#ffd23f':'#2a2040';const bx=left?x+24+q*6:x-24-q*6-4;g.fillRect(bx,yy,4,4);}});
      if(APP.mode==='arcade'){const yy=y+7*(sc+1)+40;otxt3(g,d.blurb.toUpperCase(),x,yy,'#2fe6ff',1,al);}
    }}
  if(APP.mode==='arcade'){const s=Math.ceil(APP.selT/60);otxt5(g,String(s).padStart(2,'0'),W-Math.round(6*u),Math.round(4*u)+2,s<=5?'#ff3b5c':'#ffffff',W>=320?2:1,'r');}
  if(APP.mode==='versus'&&APP.vsWinner!=null&&t<180)otxt3(g,(APP.vsWinner===0?'P1':'P2')+' WON THE LAST MATCH',W/2,Math.round(H*.58),'#ffd23f',1,'c');
  otxt3(g,touchy?'TAP A FIGHTER, TAP AGAIN TO LOCK IN':'ARROWS TO CHOOSE  J OR ENTER TO LOCK IN  K TO GO BACK',W/2,H-7,'#7b84c9',1,'c');
}
function selConfirm(s){
  const ids=SELIDS(),n=ids.length;if(APP.sel[s].done)return;APP.sel[s].done=true;SFX.confirm();say(ROSTER[ids[APP.sel[s].i%n]].name.toLowerCase());
}
function selUpdate(){
  const ids=SELIDS(),n=ids.length;APP.t++;
  if(APP.mode==='arcade'){APP.selT--;if(APP.selT<=0&&!APP.sel[0].done)selConfirm(0);}
  const sides=APP.mode==='versus'?[0,1]:[0];
  for(const s of sides){const k=s;const S=APP.sel[s];if(S.done){if(BACK(k)){S.done=false;SFX.back();}continue;}
    if(ed(k,'l')){S.i=(S.i+n-1)%n;SFX.select();}if(ed(k,'r')){S.i=(S.i+1)%n;SFX.select();}if(OK(k))selConfirm(s);if(BACK(k)&&s===0){go('menu');SFX.back();return;}}
  if(APP.mode==='practice'){const S0=APP.sel[0],S1=APP.sel[1];if(S0.done&&!S1.done){if(ed(0,'l')){S1.i=(S1.i+n-1)%n;SFX.select();}if(ed(0,'r')){S1.i=(S1.i+1)%n;SFX.select();}if(OK(0)&&APP.t>2){selConfirm(1);}if(BACK(0)){S0.done=false;SFX.back();}}}
  const ready=APP.sel[0].done&&(APP.mode==='arcade'||APP.sel[1].done);
  if(ready){APP.readyT=(APP.readyT||0)+1;if(APP.readyT>50){APP.readyT=0;const p1=ids[APP.sel[0].i%n];
    if(APP.mode==='arcade')startArcade(p1);else{const p2=ids[APP.sel[1].i%n];APP.vs={p1,p2,stage:ROSTER[pick([p1,p2])].stage};go('vs');}}}else APP.readyT=0;
}
/* ---------- VS screen ---------- */
function drawVs(){
  const v=APP.vs,a=ROSTER[v.p1],b=ROSTER[v.p2],t=APP.t,sl=Math.min(1,t/14);
  g.fillStyle='#05030a';g.fillRect(0,0,W,H);
  g.save();g.beginPath();g.moveTo(0,0);g.lineTo(W*.56,0);g.lineTo(W*.44,H);g.lineTo(0,H);g.closePath();g.clip();g.fillStyle=rgba(a.glow.map(c=>c*.35));g.fillRect(0,0,W,H);bgStripes(rgba(a.glow.map(c=>c*.3)),rgba(a.glow.map(c=>c*.42)),t);g.restore();
  g.save();g.beginPath();g.moveTo(W*.56,0);g.lineTo(W,0);g.lineTo(W,H);g.lineTo(W*.44,H);g.closePath();g.clip();bgStripes(rgba(b.glow.map(c=>c*.3)),rgba(b.glow.map(c=>c*.42)),-t);g.restore();
  beginLayer();
  const S=H/1.55,pa=puppet(v.p1,1,'vs'),pb=puppet(v.p2,-1,'vs');animPuppet(pa,a.st.INTRO);animPuppet(pb,b.st.INTRO);
  drawPuppet(pa,W*.26-pa.J.C[0]*S-(1-sl)*W*.4,H*.4+pa.J.C[1]*S,S);drawPuppet(pb,W*.74+pb.J.C[0]*S+(1-sl)*W*.4,H*.4+pb.J.C[1]*S,S);
  endLayer();g.drawImage(ac,0,0);
  g.save();g.globalCompositeOperation='lighter';zig(W*.56,0,W*.44,H,14,6,'rgba(255,255,255,.9)',2);g.restore();
  if(t>14){const sc=W>=384?7:W>=320?6:4;otxt5(g,'VS',W/2,Math.round(H*.36),GR.volt,t<20?sc+2:sc,'c',.2);}
  const ns=W>=320?2:1;otxt5(g,a.name,Math.round(W*.04),Math.round(H*.08),GR[a.gr],ns+1,undefined,.2);otxt3(g,a.title,Math.round(W*.04),Math.round(H*.08)+7*(ns+1)+3,'#ffffff');
  otxt5(g,b.name,Math.round(W*.96),Math.round(H*.08),GR[b.gr],ns+1,'r',.2);otxt3(g,b.title,Math.round(W*.96),Math.round(H*.08)+7*(ns+1)+3,'#ffffff',1,'r');
  const st=STAGES[v.stage];panel(0,H-Math.round(H*.13),W,Math.round(H*.13),.7);otxt5(g,st.name,W/2,H-Math.round(H*.11),'#ffffff',1,'c');otxt3(g,st.city,W/2,H-Math.round(H*.11)+9,'#2fe6ff',1,'c');
  if(APP.mode==='arcade')otxt3(g,APP.stageI===3?'FINAL BATTLE':'STAGE '+(APP.stageI+1),Math.round(W*.04),H-Math.round(H*.11),'#ffd23f');
  if(b.boss&&t>20&&((t>>3)&1))otxt5(g,'WARNING',W/2,Math.round(H*.6),GR.red,W>=320?2:1,'c',.2);
}
/* ---------- continue / ending / how-to ---------- */
function drawCont(){
  g.fillStyle='#05030a';g.fillRect(0,0,W,H);dotsBg('rgba(255,60,90,.08)');
  beginLayer();const p=puppet(APP.player,1,'cont');animPuppet(p,p.def.st.LOSE,0);drawPuppet(p,W*.3,H*.9,H/2.1);endLayer();g.drawImage(ac,0,0);
  otxt5(g,'CONTINUE?',W*.68,Math.round(H*.22),GR.red,W>=320?3:2,'c',.2);
  otxt5(g,String(APP.cont),W*.68,Math.round(H*.42),GR.steel,W>=320?7:5,'c',.2);
  otxt3(g,touchy?'TAP PUNCH TO CONTINUE':'PRESS J OR ENTER TO CONTINUE',W*.68,Math.round(H*.82),'#ffffff',1,'c');
  otxt3(g,'SCORE '+fmt(APP.score),W*.68,Math.round(H*.9),'#ffd23f',1,'c');
}
function contUpdate(){
  APP.t++;APP.contT++;
  if(OK(0)){SFX.confirm();nextArcade();setTrack('select');return;}
  if(BACK(0))APP.contT+=30;
  if(APP.contT>=60){APP.contT=0;APP.cont--;SFX.tick();if(APP.cont<0){go('gameover');say('Game over');setTrack('cont');APP.tix=vfTickets(true);ARC.over(APP.score,APP.tix);}}
}
function drawEnding(){
  const t=APP.t,d=ROSTER[APP.player];g.fillStyle='#03020a';g.fillRect(0,0,W,H);
  for(let i=0;i<80;i++){const x=(i*97+t*.3*(1+i%3))%W,y=(i*57)%H;g.fillStyle=i%7?'rgba(180,190,255,.5)':'#fff';g.fillRect(x,y,1,1);}
  beginLayer();const p=puppet(APP.player,1,'end');animPuppet(p,d.st.WIN);drawPuppet(p,W*.24,H*.95,H/2.0);endLayer();g.drawImage(ac,0,0);
  const x=Math.round(W*.46),sc=W>=320?2:1;otxt5(g,d.name+' WINS',x,Math.round(H*.12),GR[d.gr],sc+1,undefined,.2);
  const lines=d.ending||[];lines.forEach((l,i)=>{const n=Math.max(0,Math.floor((t-30-i*50)/2));if(n>0)otxt3(g,l.slice(0,n),x,Math.round(H*.3)+i*10,'#ffffff');});
  if(t>220){const cr=['VOLTFIST','A HYPERDOT ARCADE GAME','BUILT IN ONE HTML FILE','FIGHTERS  KAI  RUNA  MAGNUS  NOVA  ECHO','THANK YOU FOR PLAYING'];
    const y0=H-((t-220)*.4)%(H+cr.length*14);cr.forEach((c,i)=>{const y=y0+H*.55+i*14;if(y>H*.55&&y<H-6)otxt3(g,c,x,y,i===0?'#ffd23f':'#a69cba');});}
  otxt3(g,'FINAL SCORE '+fmt(APP.score)+(APP.score>=APP.hi?'  NEW RECORD':''),x,Math.round(H*.55),'#ffd23f');
  if(t>200&&((t>>5)&1))otxt3(g,'ECHO IS NOW PLAYABLE IN VERSUS AND PRACTICE',x,Math.round(H*.62),'#2fe6ff');
  else if(EMBED)otxt3(g,'+'+APP.tix+' TICKETS',x,Math.round(H*.62),'#2fe6ff');
}
const HOWTO=[
  ['CONTROLS',()=>touchy?['STICK  MOVE, JUMP, CROUCH','HOLD AWAY FROM YOUR RIVAL TO BLOCK','HOLD DOWN-AWAY TO BLOCK LOW','PUNCH  KICK  SPECIAL  SUPER','DOUBLE-TAP A DIRECTION TO DASH','FORWARD + PUNCH UP CLOSE TO THROW']:
    ['MOVE   WASD OR ARROWS     DASH  DOUBLE-TAP','PUNCH  J      KICK  K      SPECIAL  L','SUPER  I  (OR PUNCH + KICK) WHEN THE BAR IS FULL','BLOCK  HOLD AWAY.  HOLD DOWN-AWAY FOR LOWS','THROW  FORWARD + PUNCH UP CLOSE.  PUNCH TO BREAK','VERSUS P1  WASD F G H T   P2  ARROWS J K L I']],
  ['ATTACKS',()=>['DIRECTION + BUTTON CHANGES THE MOVE','FORWARD+P  STRAIGHT     FORWARD+K  OVERHEAD','DOWN+P  LOW JAB          DOWN+K  SWEEP','LIGHT HITS CHAIN INTO HEAVY HITS','NORMALS CANCEL INTO SPECIALS ON CONTACT','SPECIALS CANCEL INTO SUPERS']],
  ['SPECIALS',()=>['SPECIAL ALONE  PROJECTILE OR SIGNATURE','FORWARD + SPECIAL  RUSH MOVE','UP + SPECIAL  ANTI-AIR (INVINCIBLE START)','DOWN + SPECIAL  TRICK MOVE','SUPER  CINEMATIC FINISHER, COSTS ONE BAR','PICK A FIGHTER IN PRACTICE TO SEE THEIRS']]
];
function drawHow(){
  g.fillStyle='#07040e';g.fillRect(0,0,W,H);dotsBg('rgba(255,255,255,.05)');
  const pg=HOWTO[APP.howI];otxt5(g,pg[0],W/2,Math.round(H*.08),GR.volt,W>=320?2:1,'c',.2);
  pg[1]().forEach((l,i)=>otxt3(g,l,Math.round(W*.06),Math.round(H*.26)+i*Math.round(H*.09),'#ffffff'));
  for(let i=0;i<HOWTO.length;i++){g.fillStyle=i===APP.howI?'#ffd23f':'#3a2a50';g.fillRect(W/2-HOWTO.length*5+i*10,H-14,6,3);}
  otxt3(g,touchy?'LEFT / RIGHT TO FLIP PAGES  KICK TO GO BACK':'LEFT / RIGHT TO FLIP PAGES  K OR ESC TO GO BACK',W/2,H-8,'#7b84c9',1,'c');
  APP.hot=[{x:0,y:0,w:W/2,h:H,fn:()=>{APP.howI=(APP.howI+HOWTO.length-1)%HOWTO.length;}},{x:W/2,y:0,w:W/2,h:H,fn:()=>{APP.howI=(APP.howI+1)%HOWTO.length;}}];
}
function moveList(d){
  const M=d.moves,r=[];const add=(k,inp)=>{if(M[k])r.push([inp,M[k].name]);};
  add('nS','S');add('fS','FWD+S');add('uS','UP+S');add('dS','DOWN+S');add('jS','AIR S');add('X','SUPER');return r;
}
/* ---------- pause ---------- */
function pauseItems(){const it=['RESUME','MOVE LIST'];if(APP.mode==='practice')it.push('DUMMY: '+DUMMY.toUpperCase());it.push('RESTART','QUIT');return it;}
function drawPause(){
  g.fillStyle='rgba(4,2,10,.72)';g.fillRect(0,0,W,H);
  const it=pauseItems(),iw=Math.round(W*.42),ih=Math.round(H*.085),x=Math.round(W*.06);let y=Math.round(H*.18);
  otxt5(g,'PAUSED',x,Math.round(H*.06),GR.steel,W>=320?2:1,undefined,.2);APP.hot=[];
  it.forEach((s,i)=>{const on=APP.pauseI===i;panel(x,y,iw,ih,on?.92:.6);if(on){g.fillStyle='#ffd23f';g.fillRect(x,y,3,ih);}otxt5(g,s,x+8,y+Math.round((ih-7)/2),on?'#fff':'#a69cba');APP.hot.push({x,y,w:iw,h:ih,fn:()=>{APP.pauseI=i;pausePick();}});y+=ih+3;});
  const d=FIGHT.f[0].def,ml=moveList(d),mx=Math.round(W*.54);panel(mx-6,Math.round(H*.18),W-mx,Math.round(H*.62),.6);
  otxt5(g,d.name,mx,Math.round(H*.2),GR[d.gr],1,undefined,.2);
  ml.forEach((m,i)=>{const yy=Math.round(H*.3)+i*Math.round(H*.075);otxt3(g,m[0],mx,yy,'#ffd23f');otxt3(g,m[1],mx+34,yy,'#ffffff');});
  otxt3(g,'THROW  FWD+P CLOSE',mx,Math.round(H*.3)+ml.length*Math.round(H*.075)+2,'#a69cba');
}
function pausePick(){
  const s=pauseItems()[APP.pauseI];SFX.confirm();
  if(s==='RESUME'){APP.pause=false;}
  else if(s==='MOVE LIST'){}
  else if(s.startsWith('DUMMY')){const L=['stand','crouch','jump','block','cpu'];DUMMY=L[(L.indexOf(DUMMY)+1)%L.length];FIGHT.dummyBlock=false;FIGHT.f[1].ai=null;}
  else if(s==='RESTART'){APP.pause=false;resetRound(true);FIGHT.f[0].wins=FIGHT.f[1].wins=0;FIGHT.round=1;}
  else if(s==='QUIT'){APP.pause=false;arcQuit();go('menu');startDemo();setTrack('title');}
}
function togglePause(){if(APP.screen!=='fight')return;APP.pause=!APP.pause;APP.pauseI=0;$('pauseBtn').textContent=APP.pause?'Resume':'Pause';SFX.select();}

/* ===================== loop ===================== */
KEYHOOK.push(code=>{
  if(ARC.hold)return;
  /* in the arcade, Esc backs out: menu -> title -> leave the cabinet */
  if(code==='Escape'&&EMBED&&(APP.screen==='title'||APP.screen==='menu')){if(APP.screen==='title')ARC.exit();else{go('title');SFX.back();}return;}
  if(code==='Escape'||code==='KeyP'&&APP.screen==='fight'){if(APP.screen==='fight')togglePause();else if(APP.screen==='howto'||APP.screen==='select'){go('menu');SFX.back();}}
  if(code==='KeyM')toggleSound();
});
function toggleSound(){AU.muted=!AU.muted;store.set('vf-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setRes((resI+1)%RES.length);e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();if(APP.screen==='fight')togglePause();else if(APP.screen!=='title'){arcQuit();go('menu');if(!FIGHT||!FIGHT.demo)startDemo();setTrack('title');}e.currentTarget.blur();});
cv.addEventListener('pointerdown',e=>{
  e.preventDefault();audioInit();if(ARC.hold)return;
  const mx=(e.clientX-RECT.x)/RECT.w*W,my=(e.clientY-RECT.y)/RECT.h*H;
  if(APP.screen==='title'){go('menu');SFX.confirm();return;}
  if(APP.screen==='fight'&&!APP.pause)return;
  for(const h of APP.hot)if(mx>=h.x&&mx<=h.x+h.w&&my>=h.y&&my<=h.y+h.h){h.fn();return;}
  if(APP.screen==='cont'){SFX.confirm();nextArcade();setTrack('select');}
  else if(APP.screen==='ending'&&APP.t>120||APP.screen==='gameover'){go('title');startDemo();}
  else if(APP.screen==='vs'&&APP.t>30)launchVs();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&APP.screen==='fight'&&!APP.pause)togglePause();});
addEventListener('resize',resize);
const FIGHTSCREENS=new Set(['title','menu','fight']);
function update(dt){
  uiPoll();const pB=padBEdge();
  if(ARC.hold){LATCH.clear();return;}
  APP.t++;
  const sc=APP.screen;
  if(sc==='title'){if(EMBED&&pB)ARC.exit();else if(OK(0)||ed(0,'K')||ed(0,'S')){go('menu');SFX.confirm();}}
  else if(sc==='menu'){if(ed(0,'u')){APP.menuI=(APP.menuI+MENU.length-1)%MENU.length;SFX.select();}if(ed(0,'d')){APP.menuI=(APP.menuI+1)%MENU.length;SFX.select();}if(OK(0))menuPick();if(BACK(0)||EMBED&&pB){go('title');SFX.back();}}
  else if(sc==='select'){APP.t--;selUpdate();}
  else if(sc==='vs'){if(APP.t>170||(APP.t>40&&OK(0)))launchVs();}
  else if(sc==='cont'){APP.t--;contUpdate();}
  else if(sc==='ending'){setTrack('ending');if(APP.t>400&&(OK(0)||BACK(0))){go('title');startDemo();}}
  else if(sc==='gameover'){if(APP.t>150||(APP.t>40&&OK(0))){go('title');startDemo();setTrack('title');}}
  else if(sc==='howto'){if(ed(0,'l')){APP.howI=(APP.howI+HOWTO.length-1)%HOWTO.length;SFX.select();}if(ed(0,'r')){APP.howI=(APP.howI+1)%HOWTO.length;SFX.select();}if(BACK(0)||OK(0)&&APP.howI===HOWTO.length-1){go('menu');SFX.back();}else if(OK(0)){APP.howI++;SFX.select();}}
  else if(sc==='fight'&&APP.pause){const it=pauseItems();if(ed(0,'u')){APP.pauseI=(APP.pauseI+it.length-1)%it.length;SFX.select();}if(ed(0,'d')){APP.pauseI=(APP.pauseI+1)%it.length;SFX.select();}if(OK(0))pausePick();if(BACK(0)){APP.pause=false;}}
  else if(sc==='fight'){if(UIN[0].c.start&&!UIN[0].p.start&&!KEY.Enter)togglePause();}
  if(FIGHTSCREENS.has(sc)&&FIGHT&&!(sc==='fight'&&APP.pause)){
    ACC+=dt*(SLOWT>0?SLOW:1);let n=0;
    while(ACC>=1/60&&n<4){fightStep();if(SLOWT>0){SLOWT--;if(SLOWT<=0)SLOW=1;}ACC-=1/60;n++;}
    if(n===4)ACC=0;
  }
  if(ARC.live)ARC.score(APP.score);
  LATCH.clear();
  const bx=$('bX');const rd=APP.screen==='fight'&&FIGHT&&FIGHT.f[0].meter>=100;if(bx.classList.contains('ready')!==rd)bx.classList.toggle('ready',rd);
}
let ACC=0;
function draw(){
  const sc=APP.screen;
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
  if(sc==='title')drawTitle();
  else if(sc==='menu')drawMenu();
  else if(sc==='fight'){renderScene();hud();if(APP.pause)drawPause();}
  else if(sc==='select')drawSelect();
  else if(sc==='vs')drawVs();
  else if(sc==='cont')drawCont();
  else if(sc==='ending')drawEnding();
  else if(sc==='howto')drawHow();
  else if(sc==='gameover'){g.fillStyle='#05030a';g.fillRect(0,0,W,H);otxt5(g,'GAME OVER',W/2,Math.round(H*.4),GR.red,W>=320?4:3,'c',.2);otxt3(g,'SCORE '+fmt(APP.score),W/2,Math.round(H*.62),'#ffd23f',1,'c');
    if(EMBED)otxt3(g,'+'+APP.tix+' TICKETS',W/2,Math.round(H*.62)+9,'#2fe6ff',1,'c');}
  if(ARC.hold){g.fillStyle='rgba(4,2,10,.72)';g.fillRect(0,0,W,H);otxt5(g,'PAUSED',W/2,Math.round(H*.42),GR.steel,W>=320?2:1,'c',.2);}
}
let LAST=0;
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  update(dt);draw();musicTick(APP.pause||ARC.hold);present();
  requestAnimationFrame(frame);
}
/* ===================== arcade bridge: tickets and commands ===================== */
/* tickets for an arcade-mode credit: 4 per rival beaten, 1 per 4,000 points, 20 for clearing the ladder;
   a credit that runs its course pays at least 3; max 120 */
function vfTickets(natural){const won=APP.ladder.length>0&&APP.stageI>=APP.ladder.length,t=4*APP.stageI+Math.floor(APP.score/4000)+(won?20:0);return Math.min(120,natural?Math.max(3,t):t);}
function arcQuit(){if(ARC.live)ARC.over(APP.score,vfTickets(false));}   /* the player left the credit early */
const HOLDSCREENS=new Set(['select','vs','cont']);   /* screens that count down on their own */
function arcPause(on){
  if(APP.screen==='fight'){ARC.hold=false;if(APP.pause!==on)togglePause();}
  else ARC.hold=on&&HOLDSCREENS.has(APP.screen);
}
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
  if(m.cmd==='start'){audioInit();if(!ARC.live){ARC.hold=false;APP.pause=false;$('pauseBtn').textContent='Pause';APP.mode='arcade';SFX.confirm();toSelect();}}
  else if(m.cmd==='pause')arcPause(true);
  else if(m.cmd==='resume')arcPause(false);
  else if(m.cmd==='attract'){ARC.live=false;ARC.hold=false;APP.pause=false;$('pauseBtn').textContent='Pause';go('title');startDemo();setTrack('title');}
  else if(m.cmd==='mute'){ARC.muted=true;setVolume();try{speechSynthesis.cancel();}catch(_){}}
  else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}
});
window.HYPERDOT_GAME={id:ARC.id,title:ARC.title,tickets:true,version:1};
/* ===================== boot ===================== */
if(!gl){$('err').style.display='grid';}
if(AU.muted)$('snd').textContent='Sound off';
setRes(resI);resize();
startDemo();setTrack('title');
ARC.post('ready',{title:ARC.title,w:W,h:H,tickets:true});
window.__vf={ARC,AU,vfTickets,mkAI,APP,get FIGHT(){return FIGHT},ROSTER,KEY,TOUCH,go,startDemo,newFight,launchVs,startArcade,toSelect,
  ff(sec){for(let i=0;i<sec*60;i++){update(1/60);}},step:fightStep,setRes,useStage,sm:(i,k)=>startMove(FIGHT.f[i],FIGHT.f[1-i],k),draw,update,present,F:i=>FIGHT.f[i],get HS(){return HITSTOP},get SF(){return SUPERF}};
requestAnimationFrame(frame);
