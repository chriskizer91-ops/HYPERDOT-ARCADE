/* ===================== combat engine (fixed 60 Hz) ===================== */
const STH=6.2;
const CAM={x:0,y:0,vh:3.3,shake:0,focus:null,focusT:0,kick:0};
let HITSTOP=0,SUPERF=0,SUPEROWN=null,SLOW=1,SLOWT=0;
const PROJ=[],POPS=[];
let FIGHT=null;
const NEUTRAL=new Set(['idle','walk','crouch','guard']);
const maxSep=()=>3.9*W/H-.95;

function mkFighter(id,side,ctrl){
  const def=ROSTER[id];
  const F={def,id,side,ctrl,x:0,y:0,vx:0,vy:0,face:1,hp:def.hp,red:def.hp,redT:0,meter:0,state:'idle',t:0,mf:0,move:null,mk:'',
    air:false,stun:0,stun0:1,combo:0,comboDmg:0,showCombo:0,showComboT:0,juggle:0,inv:0,hurtT:0,flashT:0,inp:blank(),prev:blank(),buf:{P:0,K:0,S:0,X:0},clock:0,lastF:-99,lastB:-99,
    rp:P(def.st.S0),tp:P(def.st.S0),J:{},Jr:{},chains:null,trail:[],hitIds:new Set(),contact:false,grabbed:null,grabber:null,grabTried:false,
    proj:0,airAtk:0,dead:false,wins:0,top:false,hidden:false,cine:false,armorHits:0,kdOnLand:true,ai:null,crouching:false,hitHigh:true,wph:0,jdir:0,landLen:4,throwRot:0,aura:null};
  F.chains=mkChains(def);solve(F.tp,def.body,F.J);solve(F.rp,def.body,F.Jr);
  return F;
}
function setState(F,s){if(F.state!==s){F.state=s;F.t=0;}}
function opp(F){return FIGHT.f[0]===F?FIGHT.f[1]:FIGHT.f[0];}
function popup(F,txt,col){POPS.push({side:F.side,txt,col,t:0});if(POPS.length>6)POPS.shift();}

/* ---------- input ---------- */
function handleInput(F,inp){
  F.prev=F.inp;F.inp=inp;
  for(const b of ['P','K','S','X']){if(inp[b]&&!F.prev[b])F.buf[b]=9;else if(F.buf[b]>0)F.buf[b]--;}
  const fwd=F.face>0?inp.r:inp.l,back=F.face>0?inp.l:inp.r,pf=F.face>0?F.prev.r:F.prev.l,pb=F.face>0?F.prev.l:F.prev.r;
  F.fwd=fwd;F.back=back;F.up=inp.u;F.down=inp.d;F.dash=0;
  if(fwd&&!pf){if(F.clock-F.lastF<13)F.dash=1;F.lastF=F.clock;}
  if(back&&!pb){if(F.clock-F.lastB<13)F.dash=-1;F.lastB=F.clock;}
  F.clock++;
}
function wantMove(F,O){
  const b=F.buf,M=F.def.moves,air=F.air;
  if((b.X>0||(b.P>0&&b.K>0))&&F.meter>=100&&M.X&&!air)return 'X';
  if(b.S>0){if(air)return M.jS?'jS':null;if(F.up&&M.uS)return 'uS';if(F.down&&M.dS)return 'dS';if(F.fwd&&M.fS)return 'fS';return 'nS';}
  if(b.P>0){if(air)return 'jP';if(F.down)return '2P';if(F.fwd&&canThrow(F,O))return 'throw';if(F.fwd)return '6P';return '5P';}
  if(b.K>0){if(air)return 'jK';if(F.down)return '2K';if(F.fwd)return '6K';return '5K';}
  return null;
}
function clearBuf(F){F.buf.P=F.buf.K=F.buf.S=F.buf.X=0;}
function tryMoves(F,O){
  const k=wantMove(F,O);if(!k)return false;const m=F.def.moves[k];if(!m){clearBuf(F);return false;}
  if(m.proj&&F.proj>0){F.buf.S=0;return false;}
  if(m.air&&m.tier<3&&F.airAtk>0)return false;
  startMove(F,O,k);return true;
}
function canThrow(F,O){
  const m=F.def.moves.throw;if(!m||O.air||O.inv>0)return false;
  return Math.abs(O.x-F.x)<=m.grab.range+.04&&['idle','walk','crouch','guard','land','dash','bdash','attack'].includes(O.state)&&!(O.state==='attack'&&O.move&&O.move.inv);
}
function cancelOK(cur,nxt,k,F){
  if(!nxt||nxt.air)return false;
  if(nxt.tier===4)return !!(cur.cancel.su||cur.cancel.sp)&&F.meter>=100;
  if(nxt.tier===3)return !!cur.cancel.sp&&!(nxt.proj&&F.proj>0);
  if(cur.cancel.chain&&(nxt.tier===2||(nxt.tier===1&&cur.tier===1)))return true;
  return false;
}
function startMove(F,O,k){
  const m=F.def.moves[k],from=F.state;
  F.move=m;F.mk=k;F.mf=0;setState(F,'attack');F.t=0;F.hitIds.clear();F.contact=false;F.cine=false;F.armorHits=0;F.grabbed=null;F.grabTried=false;
  clearBuf(F);
  if(!F.air)F.vx=0;
  F.crouching=!!m.crouch;
  if(m.tier===3)F.meter=Math.min(200,F.meter+4);
  if(m.air)F.airAtk++;
  F.top=true;O.top=false;
  if(m.tier>=3&&(from==='getup'||from==='block'||from==='land')&&m.inv)popup(F,'REVERSAL','#7dff6a');
  if(m.super){F.meter-=100;SUPERF=48;SUPEROWN=F;FIGHT.superName=m.name;FIGHT.superT=0;FIGHT.superSide=F.side;SFX.superStart();CAM.focus=F;CAM.focusT=60;crowd(1);}
}
function endMove(F){
  const m=F.move;F.move=null;F.cine=false;F.grabbed=null;
  if(F.air)setState(F,'air');else{setState(F,F.down?'crouch':'idle');F.vx=0;}
  F.crouching=!!F.down&&!F.air;void m;
}

/* ---------- per-fighter update ---------- */
function threat(O,F){
  if(O.state==='attack'&&O.move&&O.move.hits.length&&Math.abs(O.x-F.x)<2.4&&O.mf<=O.move.actEnd)return true;
  for(const p of PROJ)if(p.own===O&&Math.abs(p.x-F.x)<2.6&&!p.dead)return true;
  return false;
}
function neutral(F,O){
  if(FIGHT.phase!=='fight'){F.vx=0;if(F.state!=='idle')setState(F,'idle');return;}
  if(tryMoves(F,O))return;
  if(F.dash===1){setState(F,'dash');F.vx=F.def.dashV*F.face;SFX.dash();dust(F.x,0,4,-F.face);return;}
  if(F.dash===-1){setState(F,'bdash');F.vx=-F.def.dashV*.95*F.face;SFX.dash();return;}
  if(F.up){setState(F,'jsq');F.jdir=F.fwd?1:F.back?-1:0;F.vx=0;return;}
  F.crouching=!!F.down;
  if(F.down){setState(F,'crouch');F.vx=0;}
  else if(F.fwd){setState(F,'walk');F.vx=F.def.walkF*F.face;}
  else if(F.back){if(threat(O,F)){setState(F,'guard');F.vx=0;}else{setState(F,'walk');F.vx=-F.def.walkB*F.face;}}
  else{setState(F,'idle');F.vx=0;}
}
function updateFighter(F,O){
  F.t++;if(F.hurtT>0)F.hurtT--;if(F.inv>0)F.inv--;if(F.flashT>0)F.flashT--;if(F.redT>0)F.redT--;else if(F.red>F.hp)F.red=Math.max(F.hp,F.red-F.def.hp*.012);
  if(F.showComboT>0)F.showComboT--;
  switch(F.state){
    case 'idle':case 'walk':case 'crouch':case 'guard':neutral(F,O);break;
    case 'jsq':
      if(F.buf.S>0&&F.up&&F.def.moves.uS&&FIGHT.phase==='fight'){startMove(F,O,'uS');break;}
      if(F.t>=4){setState(F,'air');F.air=true;F.vy=F.def.jumpV;F.vx=F.jdir*F.def.jumpX*F.face;F.airAtk=0;SFX.jump();}break;
    case 'air':if(FIGHT.phase==='fight')tryMoves(F,O);break;
    case 'land':if(F.t>=F.landLen){setState(F,'idle');neutral(F,O);}break;
    case 'dash':{const k=1-F.t/16;F.vx=F.def.dashV*F.face*Math.max(.1,k);if(F.t>=3&&FIGHT.phase==='fight'&&tryMoves(F,O))break;if(F.t>=16){setState(F,'idle');F.vx=0;}if(F.t%4===0)trailSnap(F,.5);break;}
    case 'bdash':{const k=1-F.t/18;F.vx=-F.def.dashV*.95*F.face*Math.max(.1,k);if(F.t<7)F.inv=Math.max(F.inv,1);if(F.t>=18){setState(F,'idle');F.vx=0;}break;}
    case 'attack':runMove(F,O);break;
    case 'hit':F.stun--;if(F.stun<=0){F.combo=0;setState(F,F.crouching?'crouch':'idle');}break;
    case 'block':F.stun--;if(F.stun<=0){setState(F,F.crouching?'crouch':'idle');}break;
    case 'airhit':break;
    case 'kd':if(!F.dead&&F.t>=34)setState(F,'getup');break;
    case 'getup':F.inv=Math.max(F.inv,1);if(F.t>=20){setState(F,'idle');F.combo=0;F.juggle=0;}break;
    case 'thrown':break;
  }
  if(F.state==='thrown'&&!F.grabber)setState(F,'airhit');
}
function runMove(F,O){
  const m=F.move;F.mf++;const f=F.mf;
  if(m.vel)for(const v of m.vel)if(v[0]===f){if(v[1]!=null)F.vx=v[1]*F.face;if(v[2]!=null){F.vy=v[2];if(v[2]>0)F.air=true;}}
  if(m.spawn)for(const s of m.spawn)if(s[0]===f)spawnProj(F,O,s[1],s[2],s[3]);
  if(m.sfx)for(const s of m.sfx)if(s[0]===f&&SFX[s[1]])SFX[s[1]](s[2]);
  if(m.fx)for(const s of m.fx)if(s[0]===f)MOVEFX[s[1]](F,O);
  if(F.cine){
    if(m.cineFx)for(const s of m.cineFx)if(s[0]===f)MOVEFX[s[1]](F,O);
    if(m.cineHits)for(const s of m.cineHits)if(s[0]===f)cineHit(F,O,s[1]);
    if(O.state==='hit'){O.stun=Math.max(O.stun,20);O.vx=0;}
  }
  if(m.inv&&f>=m.inv[0]&&f<=m.inv[1])F.inv=Math.max(F.inv,1);
  if(m.trail&&f>=m.trail[0]&&f<=m.trail[1]&&f%2===0)trailSnap(F,m.super?.75:.55);
  if(m.aura&&f>=m.aura[0]&&f<=m.aura[1])auraFx(F,m.aura[2]);
  if(m.grab){grabStep(F,O,m.grab,f);if(F.move!==m)return;}
  if(m.cancel&&f>=m.cancel.f[0]&&f<=m.cancel.f[1]&&(F.contact||m.cancel.whiff)){
    const k=wantMove(F,O);if(k&&cancelOK(m,F.def.moves[k],k,F)){startMove(F,O,k);return;}
  }
  if(m.whiffEnd&&!F.cine&&f>=m.whiffEnd&&m.cine){endMove(F);return;}
  if(m.landTo&&F.air&&f>=m.landTo-1)F.mf=m.landTo-2;
  if(F.mf>=m.len)endMove(F);
}
function physics(F){
  if(F.state==='thrown')return;
  if(F.air){
    const gm=F.state==='attack'&&F.move&&F.move.grav?F.move.grav:1;
    F.vy-=F.def.grav*gm/60;F.x+=F.vx/60;F.y+=F.vy/60;
    if(F.y<=0&&F.vy<=0){F.y=0;F.vy=0;F.air=false;onLand(F);}
  }else{
    F.y=0;F.x+=F.vx/60;
    const keep=F.state==='walk'||F.state==='dash'||F.state==='bdash'||(F.state==='attack'&&F.move&&F.move.vel);
    if(!keep){F.vx*=.86;if(Math.abs(F.vx)<.02)F.vx=0;}
  }
}
function onLand(F){
  switch(F.state){
    case 'air':setState(F,'land');F.landLen=4;F.vx=0;SFX.land();dust(F.x,0,3,0);break;
    case 'attack':{const m=F.move;if(m.landTo){F.mf=m.landTo;}else if(m.air){F.move=null;setState(F,'land');F.landLen=5;F.vx=0;}else if(m.landLag){F.move=null;setState(F,'land');F.landLen=m.landLag;F.vx=0;}SFX.land();dust(F.x,0,4,0);break;}
    case 'airhit':
      if(F.kdOnLand||F.dead){setState(F,'kd');F.vx*=.3;F.juggle=0;SFX.land();dust(F.x,0,10,0);CAM.shake=Math.max(CAM.shake,.03);if(F.dead)SFX.slam();}
      else{setState(F,'land');F.landLen=10;F.vx=0;F.combo=0;}
      break;
    default:SFX.land();
  }
}
function autoFace(F,O){
  if(F.air||F.state==='thrown')return;
  if(NEUTRAL.has(F.state)||F.state==='land'||F.state==='block'||F.state==='jsq'||F.state==='getup'||F.state==='kd'&&F.t<2){const d=O.x-F.x;if(Math.abs(d)>.03)F.face=d>0?1:-1;}
}
function noPush(F){const m=F.move;return F.state==='attack'&&m&&m.noPush&&F.mf>=m.noPush[0]&&F.mf<=m.noPush[1];}
function resolvePush(A,B){
  if(A.state!=='thrown'&&B.state!=='thrown'&&!noPush(A)&&!noPush(B)&&!A.hidden&&!B.hidden&&Math.abs(A.y-B.y)<1.05){
    const w=(A.def.push+B.def.push)/2,dx=B.x-A.x;
    if(Math.abs(dx)<w){const pen=w-Math.abs(dx),s=dx>0?1:dx<0?-1:A.face;
      let ka=.5,kb=.5;if(A.air&&!B.air){ka=.85;kb=.15;}else if(B.air&&!A.air){ka=.15;kb=.85;}
      A.x-=s*pen*ka;B.x+=s*pen*kb;}
  }
  for(const F of [A,B]){const lim=STH-F.def.push/2;if(F.x<-lim)F.x=-lim;if(F.x>lim)F.x=lim;}
  const ms=maxSep(),sep=Math.abs(B.x-A.x);
  if(sep>ms&&A.state!=='thrown'&&B.state!=='thrown'){const ex=sep-ms,s=B.x>A.x?1:-1;A.x+=s*ex/2;B.x-=s*ex/2;}
}

/* ---------- hits ---------- */
function hurtCircles(F){
  const J=F.J,k=F.def.body.bulk*F.def.body.h,arr=F.hurt||(F.hurt=[]);arr.length=0;
  const add=(p,r)=>arr.push([F.x+p[0]*F.face,F.y+p[1],r]);
  add(J.C,J.R*1.3);add(J.chest,.2*k);add(J.H,.18*k);add(J.knN,.1*k);add(J.knF,.1*k);add(J.anN,.09);add(J.anF,.09);
  add(J.elN,.08*k);add(J.haN,.08*k);add(J.haF,.08*k);add(J.elF,.07*k);
  return arr;
}
function limbPt(F,limb,off){
  const J=F.J;let p;
  switch(limb){case 'an':p=J.haN;break;case 'af':p=J.haF;break;case 'ln':p=[(J.anN[0]+J.toN[0])/2,(J.anN[1]+J.toN[1])/2];break;case 'lf':p=[(J.anF[0]+J.toF[0])/2,(J.anF[1]+J.toF[1])/2];break;
    case 'body':p=J.chest;break;case 'head':p=J.C;break;case 'pt':p=off;break;default:p=J.chest;}
  return [F.x+p[0]*F.face,F.y+p[1]];
}
function hittable(D){return D.inv<=0&&!D.hidden&&!['kd','getup','thrown','intro'].includes(D.state)&&!(D.state==='airhit'&&(D.juggle>=5||D.dead));}
function touches(D,px,py,r){for(const c of hurtCircles(D)){const dx=c[0]-px,dy=c[1]-py,rr=c[2]+r;if(dx*dx+dy*dy<=rr*rr)return true;}return false;}
function checkHits(A,D){
  if(A.state!=='attack'||!A.move)return;
  const m=A.move,f=A.mf;
  for(const h of m.hits){
    if(f<h.f[0]||f>h.f[1]||A.hitIds.has(h.id))continue;
    if(!hittable(D))continue;
    const p=limbPt(A,h.limb,h.off);
    if(touches(D,p[0],p[1],h.r)){A.hitIds.add(h.id);const r=applyHit(A,D,h,p,null);if(r==='hit'&&m.cine&&h.id===0){A.cine=true;}break;}
  }
}
function canBlock(D,src,h){
  if(h.type==='unblock'||D.air)return false;
  if(!(NEUTRAL.has(D.state)||D.state==='block'||D.state==='land'))return false;
  if(FIGHT.dummyBlock&&D===FIGHT.f[1])return true;
  const back=src>D.x?D.inp.l:D.inp.r;if(!back)return false;
  const cr=!!D.inp.d;if(h.type==='low'&&!cr)return false;if(h.type==='high'&&cr)return false;
  return true;
}
function applyHit(A,D,h,p,proj,force){
  let away=D.x>=A.x?1:-1;if(proj&&proj.vx)away=Math.sign(proj.vx);else if(proj&&proj.attach)away=D.x>=proj.x?1:-1;
  const src=proj?proj.x:A.x;
  if(!force&&D.state==='attack'&&D.move&&D.move.armor&&D.mf>=D.move.armor[0]&&D.mf<=D.move.armor[1]&&D.armorHits<1){
    D.armorHits++;D.hp=Math.max(1,D.hp-h.dmg*.5);D.redT=30;D.flashT=5;HITSTOP=Math.max(HITSTOP,7);spark(p[0],p[1],'block',away,40);SFX.block();A.contact=true;popup(D,'ARMOR','#ffc21a');return 'armor';
  }
  if(!force&&canBlock(D,src,h)){
    setState(D,'block');D.stun=h.bstun||10;D.crouching=!!D.inp.d||(FIGHT.dummyBlock&&h.type==='low');D.vx=away*(h.kb*.85+.4);
    if(h.chip)D.hp=Math.max(h.super?0:1,D.hp-h.dmg*h.chip);
    A.meter=Math.min(200,A.meter+h.dmg*.06);D.meter=Math.min(200,D.meter+h.dmg*.05);
    HITSTOP=Math.max(HITSTOP,Math.round(h.hs*.7));A.contact=true;D.combo=0;
    if(Math.abs(D.x)>STH-.6&&!proj)A.vx-=away*h.kb*.6;
    spark(p[0],p[1],'block',away,h.dmg);SFX.block();
    if(D.hp<=0){D.hp=0;koHit(A,D,p);}
    return 'block';
  }
  const counter=!proj&&D.state==='attack'&&D.move&&D.mf<=D.move.actEnd&&D.move.hits.length>0;
  const wasAir=D.air,sc=Math.max(.32,1-.1*D.combo);
  const dmg=h.dmg*sc*(counter?1.22:1);
  if(D.combo===0||D.state!=='hit'&&D.state!=='airhit')D.comboDmg=0;
  D.hp-=dmg;D.redT=42;D.combo++;D.comboDmg+=dmg;
  if(FIGHT.practice&&D.side===1)D.hp=Math.max(1,D.hp);
  A.showCombo=D.combo;A.showComboT=D.combo>=2?90:0;A.lastCD=D.comboDmg;
  A.meter=Math.min(200,A.meter+dmg*.14);D.meter=Math.min(200,D.meter+dmg*.09);
  A.contact=true;D.hurtT=20;D.flashT=4;
  if(counter)popup(A,'COUNTER','#ff3b5c');
  if(!FIGHT.firstHit){FIGHT.firstHit=A;popup(A,'FIRST ATTACK','#ffd23f');}
  if(D.state==='attack'){D.move=null;D.cine=false;}
  if(D.grabbed){D.grabbed.grabber=null;D.grabbed=null;}
  const launch=wasAir||h.kby>0||h.kd;
  if(launch){
    setState(D,'airhit');D.air=true;D.vy=h.kby>0?h.kby:(wasAir?3.4:4.2);D.vx=away*(h.kb*.75+.5);
    D.kdOnLand=!!(h.kd||h.kby>0)||D.juggle>0;D.juggle++;
  }else{setState(D,'hit');D.stun=h.stun+(counter?6:0);D.stun0=D.stun;D.vx=away*h.kb;D.hitHigh=(p[1]-D.y)>D.def.body.h*1.18;D.crouching=!!D.inp.d&&!wasAir;}
  if(Math.abs(D.x)>STH-.6&&!launch&&!proj)A.vx-=away*h.kb*.7;
  HITSTOP=Math.max(HITSTOP,h.hs+(counter?3:0));
  spark(p[0],p[1],h.spark,away,dmg);
  (h.snd==='H'?SFX.hitH:h.snd==='S'?SFX.hitS:SFX.hitL)();
  if(dmg>50){CAM.shake=Math.max(CAM.shake,Math.min(.09,dmg*.0009));CAM.kick=Math.min(.06,dmg*.0005);}
  if(D.combo>=4||dmg>80)crowd(.6);
  if(D.hp<=0){D.hp=0;koHit(A,D,p);}
  return 'hit';
}
function cineHit(F,O,h0){
  const h=Object.assign({hs:6,stun:30,bstun:10,kb:.2,kby:0,spark:'slash',snd:'H',type:'unblock',super:1},h0);
  const p=[O.x,O.y+O.def.body.h*1.1];
  applyHit(F,O,h,p,null,true);
}
function koHit(A,D,p){
  if(FIGHT.phase!=='fight'||D.dead)return;
  D.dead=true;setState(D,'airhit');D.air=true;D.vy=Math.max(D.vy,5.2);D.vx=(D.x>=A.x?1:-1)*3;D.kdOnLand=true;D.juggle=9;
  HITSTOP=Math.max(HITSTOP,26);SLOW=.3;SLOWT=80;CAM.focus=D;CAM.focusT=110;
  spark(p[0],p[1],'super',D.x>=A.x?1:-1,200);
  FIGHT.phase='ko';FIGHT.pt=0;FIGHT.winnerF=A;FIGHT.koFlash=1;SFX.ko();crowd(1.4);
  say('K.O.');
}

/* ---------- grabs ---------- */
function pathAt(path,f){
  if(f<=path[0][0])return path[0].slice(1);
  for(let i=1;i<path.length;i++)if(f<=path[i][0]){const a=path[i-1],b=path[i],t=(f-a[0])/Math.max(1,b[0]-a[0]);return [lerp(a[1],b[1],t),lerp(a[2],b[2],t),lerp(a[3],b[3],t)];}
  return path[path.length-1].slice(1);
}
function grabStep(F,O,G,f){
  if(!F.grabbed){
    if(f>=G.f[0]&&f<=G.f[1]&&!F.grabTried){
      const ok=Math.abs(O.x-F.x)<=G.range&&!O.air&&O.inv<=0&&!O.hidden&&!['kd','getup','thrown','airhit'].includes(O.state)&&(G.cmd||(O.state!=='hit'&&O.state!=='block'));
      if(ok){
        F.grabTried=true;
        if(!G.cmd&&O.buf.P>0&&O.ctrl!=='dummy'&&(O.ctrl!=='cpu'||Math.random()<O.ai.lvl*.45)){techThrow(F,O);return;}
        F.grabbed=O;O.grabber=F;setState(O,'thrown');O.move=null;O.vx=O.vy=0;O.face=-F.face;SFX.grab();F.contact=true;
        if(O.combo===0)O.comboDmg=0;
      }
    }
    if(f===G.f[1]&&!F.grabbed&&G.miss){F.grabTried=true;startMove(F,O,G.miss);}
    return;
  }
  const pos=pathAt(G.path,f),b=O.def.body;
  O.x=F.x+pos[0]*F.face;O.y=Math.max(0,F.y+pos[1]-.6*b.h);O.throwRot=pos[2];O.air=O.y>0;
  if(f>=G.rel)releaseGrab(F,O,G);
}
function releaseGrab(F,O,G){
  F.grabbed=null;O.grabber=null;
  const sc=Math.max(.4,1-.1*O.combo),dmg=G.dmg*sc;
  O.hp-=dmg;O.redT=42;O.combo++;O.comboDmg+=dmg;O.hurtT=24;O.flashT=3;
  if(FIGHT.practice&&O.side===1)O.hp=Math.max(1,O.hp);
  F.meter=Math.min(200,F.meter+dmg*.12);O.meter=Math.min(200,O.meter+dmg*.08);
  setState(O,'airhit');O.air=true;O.kdOnLand=true;O.juggle=9;O.vx=G.vx*F.face;O.vy=G.vy;
  if(G.slam){O.y=.05;O.vy=-1;CAM.shake=Math.max(CAM.shake,G.mega?.16:.08);HITSTOP=Math.max(HITSTOP,G.mega?20:12);SFX.slam();ring(O.x,.05,[255,200,120],.2,G.mega?3:1.6,G.mega?30:18,3);dust(O.x,0,G.mega?40:20,0);if(G.mega){crowd(1.5);FIGHT.koFlash=Math.max(FIGHT.koFlash,.6);}}
  else{HITSTOP=Math.max(HITSTOP,10);SFX.hitH();}
  spark(O.x,O.y+.6,'heavy',F.face,dmg);
  if(O.hp<=0){O.hp=0;koHit(F,O,[O.x,O.y+.6]);}
}
function techThrow(F,O){
  F.move=null;setState(F,'block');F.stun=14;F.vx=-F.face*3.2;setState(O,'block');O.stun=14;O.vx=-O.face*3.2;
  spark((F.x+O.x)/2,1.1,'block',F.face,30);SFX.block();popup(O,'TECH','#2fe6ff');
}

/* ---------- special-move scripting ---------- */
const MOVEFX={
  vanish(F){puff(F.x,F.y+.8,F.def.glow);F.hidden=true;},
  reappear(F,O){let nx=O.x-O.face*.95;if(Math.abs(nx)>STH-.4)nx=O.x+O.face*.95;F.x=clamp(nx,-STH+.3,STH-.3);F.face=O.x>F.x?1:-1;F.hidden=false;puff(F.x,F.y+.8,F.def.glow);},
  blinkL(F,O){blink(F,O,-1);},blinkR(F,O){blink(F,O,1);},blinkC(F,O){blink(F,O,0);},
  stomp(F){CAM.shake=Math.max(CAM.shake,.07);ring(F.x+F.face*.6,.05,[255,230,90],.2,1.6,18,2);dust(F.x+F.face*.5,0,14,0);elecBurst(F.x+F.face*.6,.2,.6,8);},
  quarry(F){for(let i=0;i<10;i++)FXL.push({k:'deb',x:F.x+F.face*.7,y:.05,vx:rnd(-1.5,1.5),vy:rnd(1.5,4),g:14,life:rnd(.4,.8)*60,max:60,col:[120,100,90],s:rnd(.03,.06)});dust(F.x+F.face*.7,0,8,0);}
};
function blink(F,O,side){
  puff(F.x,F.y+.8,F.def.glow);
  const s=side===0?-O.face:side;F.x=clamp(O.x+s*.75,-STH+.3,STH-.3);F.face=O.x>F.x?1:-1;
  for(let i=0;i<6;i++)FXL.push({k:'slash',x:O.x+rnd(-.3,.3),y:O.y+rnd(.6,1.6),a:rnd(0,TAU),len:rnd(.5,.9),life:10,max:10,col:[255,80,110]});
}

/* ---------- projectiles ---------- */
const PT={
  bolt:{vx:5.4,r:.22,life:220,hits:1,cnt:1,h:{dmg:58,hs:7,stun:18,bstun:14,kb:2.2,chip:.12,spark:'elec',snd:'H'},draw:'bolt'},
  prism:{vx:6.8,r:.21,life:200,hits:1,cnt:1,h:{dmg:56,hs:7,stun:18,bstun:14,kb:2.2,chip:.12,spark:'elec',snd:'H'},draw:'prism'},
  shuriken:{vx:8.6,r:.13,life:120,hits:1,cnt:1,h:{dmg:38,hs:5,stun:15,bstun:10,kb:1.4,chip:.08,spark:'slash',snd:'L'},draw:'star'},
  shurikenD:{vx:6.4,vy:-6,r:.13,life:90,hits:1,cnt:1,ground:'die',h:{dmg:36,hs:5,stun:15,bstun:10,kb:1.2,type:'high',spark:'slash',snd:'L'},draw:'star'},
  rock:{vx:4.6,vy:4.4,g:11,r:.28,life:240,hits:1,cnt:1,ground:'shatter',h:{dmg:86,hs:12,stun:22,bstun:16,kb:2.8,kd:1,kby:3,chip:.14,spark:'heavy',snd:'H'},draw:'rock'},
  orb:{vx:3,r:.32,life:300,hits:2,gap:12,cnt:1,h:{dmg:40,hs:6,stun:18,bstun:12,kb:1.2,chip:.1,spark:'plasma',snd:'H'},draw:'orb'},
  stardrop:{vx:4.6,vy:-4.8,r:.24,life:100,hits:1,cnt:1,ground:'burst',h:{dmg:46,hs:7,stun:17,bstun:12,kb:1.6,type:'high',spark:'plasma',snd:'H'},draw:'orb'},
  quake:{vx:4.4,r:.28,life:30,hits:1,ylock:.14,h:{dmg:44,hs:7,stun:18,bstun:12,kb:1.6,type:'low',chip:.1,spark:'elec',snd:'H'},draw:'quake',noClash:1},
  halo:{attach:1,r:.95,life:26,hits:3,gap:7,h:{dmg:34,hs:6,stun:24,kby:4.2,kb:1.2,chip:.08,spark:'plasma',snd:'H'},draw:'halo',noClash:1},
  well:{vx:0,r:.6,life:250,hits:3,gap:12,trigger:.8,cnt:1,h:{dmg:32,hs:6,stun:22,bstun:12,kb:.2,chip:.06,spark:'plasma',snd:'H'},hlast:{kby:5.4,kd:1,kb:1.5,dmg:46},draw:'well',noClash:1},
  nova:{vx:2.2,r:.35,grow:1.2,life:96,hits:10,gap:5,beats:1,h:{dmg:27,hs:4,stun:26,bstun:10,kb:.5,chip:.2,spark:'plasma',snd:'H',super:1},hlast:{dmg:70,hs:16,kby:6,kd:1,kb:3.5},draw:'nova'},
  beam:{attach:1,beam:1,r:.27,life:56,hits:12,gap:4,beats:1,h:{dmg:23,hs:3,stun:26,bstun:10,kb:.5,chip:.2,spark:'elec',snd:'H',super:1},hlast:{dmg:66,hs:18,kby:5.5,kd:1,kb:4},draw:'beam',col:[255,226,90]},
  beam2:{attach:1,beam:1,r:.3,life:62,hits:14,gap:4,beats:1,h:{dmg:22,hs:3,stun:26,bstun:10,kb:.5,chip:.2,spark:'elec',snd:'H',super:1},hlast:{dmg:70,hs:18,kby:5.5,kd:1,kb:4},draw:'beam',col:[120,240,255]}
};
function spawnProj(F,O,type,lx,ly){
  const t=PT[type],b=F.def.body.h;
  const p={type,t:0,own:F,face:F.face,x:F.x+lx*b*F.face,y:F.y+ly*b,ox:lx*b,oy:ly*b,vx:(t.vx||0)*F.face,vy:t.vy||0,r:t.r,life:t.life,hits:t.hits,cool:0,dead:false,on:!t.trigger,spin:0};
  if(type==='well'){p.y=.05;p.x=clamp(p.x,-STH+.5,STH-.5);}
  if(t.cnt)F.proj++;
  PROJ.push(p);return p;
}
function killProj(p){if(p.dead)return;p.dead=true;if(PT[p.type].cnt)p.own.proj=Math.max(0,p.own.proj-1);}
function projHurtTest(p,D){
  const t=PT[p.type];
  if(t.beam){const x0=p.x,x1=p.face>0?STH+2:-STH-2,lo=Math.min(x0,x1),hi=Math.max(x0,x1);
    for(const c of hurtCircles(D))if(c[0]+c[2]>=lo&&c[0]-c[2]<=hi&&Math.abs(c[1]-p.y)<=p.r+c[2])return [clamp(D.x,lo,hi),p.y];return null;}
  return touches(D,p.x,p.y,p.r)?[p.x+(D.x>p.x?p.r*.5:-p.r*.5),p.y]:null;
}
function updProj(){
  for(const p of PROJ){
    if(p.dead)continue;const t=PT[p.type],F=p.own,D=opp(F);
    p.t++;p.life--;p.spin+=.35;if(p.cool>0)p.cool--;
    if(t.attach){if(F.state!=='attack'&&!t.beam&&p.type!=='halo'){killProj(p);continue;}p.x=F.x+p.ox*F.face;p.y=F.y+p.oy;p.face=F.face;if(F.state==='hit'||F.state==='airhit'||F.state==='kd'){killProj(p);continue;}}
    else{p.vy-=(t.g||0)/60;p.x+=p.vx/60;p.y+=p.vy/60;if(t.ylock!=null)p.y=t.ylock;}
    if(t.grow)p.r=Math.min(t.r*3.4,p.r+t.r*t.grow/20);
    if(t.trigger&&!p.on&&Math.abs(D.x-p.x)<t.trigger&&!D.air)p.on=true;
    if(p.type==='well'&&p.on&&hittable(D)&&!D.air){D.x+=Math.sign(p.x-D.x)*.018;}
    if(p.y<=.02&&(t.g||p.vy<0)&&t.ground){
      if(t.ground==='shatter'){for(let i=0;i<16;i++)FXL.push({k:'deb',x:p.x,y:.05,vx:rnd(-3,3),vy:rnd(1,4.5),g:14,life:rnd(.4,.9)*60,max:60,col:[150,126,108],s:rnd(.03,.07)});dust(p.x,0,10,0);SFX.rock();}
      else if(t.ground==='burst'){ring(p.x,.05,[190,120,255],.1,.9,14,2);}
      killProj(p);continue;
    }
    if(p.life<=0||Math.abs(p.x)>STH+3){killProj(p);continue;}
    if(p.on&&p.cool<=0&&hittable(D)&&!(D.state==='attack'&&D.move&&D.move.pinv&&D.mf>=D.move.pinv[0]&&D.mf<=D.move.pinv[1])){
      const hp=projHurtTest(p,D);
      if(hp){
        const last=p.hits===1&&t.hlast,h=Object.assign({},t.h,last?t.hlast:null);
        const r=applyHit(F,D,h,hp,p);
        p.hits--;p.cool=t.gap||0;
        if(p.hits<=0){killProj(p);if(!t.attach&&!t.beam)spark(p.x,p.y,h.spark,p.face,40);}
        void r;
      }
    }
  }
  for(let i=0;i<PROJ.length;i++){const a=PROJ[i];if(a.dead)continue;const ta=PT[a.type];
    for(let j=i+1;j<PROJ.length;j++){const b=PROJ[j];if(b.dead||b.own===a.own)continue;const tb=PT[b.type];
      if(ta.noClash||tb.noClash||ta.beam||tb.beam)continue;
      const dx=a.x-b.x,dy=a.y-b.y,rr=a.r+b.r;
      if(dx*dx+dy*dy<=rr*rr){
        if(!ta.beats)killProj(a);if(!tb.beats)killProj(b);
        spark((a.x+b.x)/2,(a.y+b.y)/2,'heavy',1,60);SFX.boom(.6);
      }}}
  for(let i=PROJ.length-1;i>=0;i--)if(PROJ[i].dead)PROJ.splice(i,1);
}

/* ---------- poses per state ---------- */
const GUP=[[0,null],[8,null],[14,null],[20,null]];
function computePose(F){
  const st=F.def.st,out=F.tp,c=F.clock;
  switch(F.state){
    case 'idle':{cpPose(st.S0,out);const b=Math.sin(c*.085);out.hy-=.012*(1+b)*.5;out.an[1]+=.012*b;out.af[1]+=.01*b;out.lean+=b*.8;break;}
    case 'walk':{const dir=Math.sign(F.vx)*F.face;F.wph+=Math.abs(F.vx)/60*7.2;const s=Math.sin(F.wph),co=Math.cos(F.wph);cpPose(st.S0,out);
      out.ln[0]+=s*.13*dir;out.ln[1]=Math.max(0,co)*.07;out.lf[0]-=s*.13*dir;out.lf[1]=Math.max(0,-co)*.07;out.hy-=.022*(1-Math.abs(co));out.an[0]-=s*.03;out.af[0]+=s*.02;out.lean+=dir*3;break;}
    case 'crouch':{cpPose(st.C0,out);const b=Math.sin(c*.085);out.hy-=.008*(1+b)*.5;break;}
    case 'guard':cpPose(F.down?st.BC:st.B0,out);break;
    case 'block':cpPose(F.crouching?st.BC:st.B0,out);if(F.t<3){out.hx-=.05;out.lean-=6;}break;
    case 'jsq':case 'land':cpPose(st.JS,out);break;
    case 'air':{const k=clamp(.5-F.vy/(2*F.def.jumpV),0,1);lerpPose(st.J0,st.J1,k,out);break;}
    case 'dash':cpPose(st.DASH,out);break;
    case 'bdash':cpPose(st.BDASH,out);break;
    case 'attack':keyPose(F.move.keys,F.mf,out);break;
    case 'hit':{const tgt=F.crouching?st.HC:F.hitHigh?st.HH:st.HG,base=F.crouching?st.C0:st.S0;
      const k=F.t<4?F.t/4:clamp(F.stun/Math.max(1,F.stun0-4),0,1);lerpPose(base,tgt,EASE.smooth(k),out);break;}
    case 'airhit':{cpPose(st.AH,out);const k=clamp(.5-F.vy/10,0,1);out.rot=F.dead?-(F.t*9)%360-20:lerp(-8,-70,k);break;}
    case 'kd':cpPose(st.KD,out);break;
    case 'getup':{GUP[0][1]=st.KD;GUP[1][1]=st.GU;GUP[2][1]=st.C0;GUP[3][1]=st.S0;keyPose(GUP,F.t,out);break;}
    case 'thrown':cpPose(st.TH,out);out.rot=F.throwRot;break;
    case 'intro':cpPose(F.t<70?st.INTRO:st.S0,out);break;
    case 'win':{cpPose(st.WIN,out);const b=Math.sin(c*.07);out.hy+=.01*b;out.an[1]+=.015*b;break;}
    case 'lose':cpPose(st.LOSE,out);break;
    default:cpPose(st.S0,out);
  }
  const k=F.state==='attack'?.72:F.state==='hit'||F.state==='thrown'?.85:F.state==='airhit'?.55:F.state==='block'?.7:.38;
  lerpPose(F.rp,out,k,F.rp);
  if(F.state==='thrown'||F.state==='airhit'&&F.dead)F.rp.rot=out.rot;
}
function trailSnap(F,a){const J={};for(const k of JPTS)J[k]=F.Jr[k].slice();J.C=F.Jr.C.slice();J.R=F.Jr.R;J.hu=F.Jr.hu.slice();J.hfw=F.Jr.hfw.slice();J.dir=F.Jr.dir.slice();J.q=F.Jr.q.slice();J.H=F.Jr.H.slice();
  F.trail.push({x:F.x,y:F.y,face:F.face,Jr:J,life:14,max:14,a});if(F.trail.length>8)F.trail.shift();}

/* ---------- one logic frame ---------- */
function fightStep(){
  const A=FIGHT.f[0],B=FIGHT.f[1];
  FRAME++;FRAMET++;
  updFX();
  for(const F of [A,B])for(const tr of F.trail)tr.life--;
  for(const F of [A,B])F.trail=F.trail.filter(t=>t.life>0);
  if(SUPERF>0){SUPERF--;FIGHT.superT++;superFx(SUPEROWN);if(SUPERF===0)SUPEROWN=null;return;}
  if(HITSTOP>0){HITSTOP--;for(const F of [A,B])if(F.flashT>0)F.flashT--;return;}
  FIGHT.tick++;
  for(const F of [A,B]){const O=F===A?B:A;let inp;
    if(FIGHT.phase!=='fight')inp=blank();
    else if(F.ctrl==='cpu')inp=aiThink(F.ai,O);
    else if(F.ctrl==='dummy')inp=dummyInput(F,O);
    else inp=readPlayer(F.ctrl);
    handleInput(F,inp);}
  for(const F of [A,B])updateFighter(F,F===A?B:A);
  for(const F of [A,B])physics(F);
  resolvePush(A,B);
  for(const F of [A,B])autoFace(F,F===A?B:A);
  for(const F of [A,B]){computePose(F);solve(F.tp,F.def.body,F.J);solve(F.rp,F.def.body,F.Jr);}
  checkHits(A,B);checkHits(B,A);
  updProj();
  for(const F of [A,B])for(const ch of F.chains)updChain(ch,F);
  updCam();
  roundLogic();
}
function updCam(){
  const A=FIGHT.f[0],B=FIGHT.f[1];
  let cx=(A.x+B.x)/2;const sep=Math.abs(A.x-B.x);let vh=clamp(2.95+sep*.16,3.05,3.9);
  if(CAM.focus&&CAM.focusT>0){CAM.focusT--;cx=lerp(cx,CAM.focus.x,.55);vh*=.8;if(CAM.focusT<=0)CAM.focus=null;}
  const vw=vh*W/H;cx=clamp(cx,-STH+vw/2,STH-vw/2);
  const top=Math.max(A.y,B.y),cy=Math.max(0,top-.75)*.55;
  CAM.x=lerp(CAM.x,cx,.12);CAM.vh=lerp(CAM.vh,vh*(1-CAM.kick),.08);CAM.y=lerp(CAM.y,cy,.08);
  CAM.shake*=.86;CAM.kick*=.8;
}
