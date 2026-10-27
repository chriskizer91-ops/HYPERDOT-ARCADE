/* =====================================================================================
   9. THE LAMPLIGHTER, THE FLAME AND THE THINGS IN THE DARK
   ===================================================================================== */
const P={x:0,y:0,vx:0,vy:0,aim:0,aimTo:0,beamK:0,beam:false,oil:100,flares:2,lives:3,hurt:0,inv:0,kindle:0,kl:null,gutter:0,dead:0,step:0,lx:0,ly:0,moved:0,lastLamp:null,flick:1};
const LSM=mkShadow(512);           /* the hand lantern's shadow map, cast every tick */
const OIL_MAX=100;
const oilK=()=>smooth(0,32,P.oil);                       /* below a third of a tank the flame starts to gutter */
function lanternR(){return 10+18*oilK();}
function lanternI(){return (.6+.55*oilK())*P.flick;}
const BEAM={R:80,half:.34};
/* light reaching a world point from the hand lantern (for logic: hard shadow test, no penumbra) */
function lanternAt(wx,wy){
  if(P.dead)return 0;const dx=wx-P.lx,dy=wy-P.ly,d=Math.hypot(dx,dy);if(d>LSM.R)return 0;
  if(!shadowTest(LSM,wx,wy))return 0;let v=0;const ro=lanternR();
  if(d<ro){const f=1-d*d/(ro*ro);v+=lanternI()*f*f;}
  if(P.beamK>.05&&d<BEAM.R){const cs=(dx*Math.cos(P.aim)+dy*Math.sin(P.aim))/(d||1),ci=Math.cos(BEAM.half);if(cs>ci-.1){const f=1-d*d/(BEAM.R*BEAM.R);v+=1.9*P.beamK*oilK()*f*f*smooth(ci-.1,ci+.1,cs);}}
  return v;
}
/* is a world point inside the open beam, and how hard is it hit */
function beamAt(wx,wy){
  if(P.dead||P.beamK<.3||P.oil<=0)return 0;const dx=wx-P.lx,dy=wy-P.ly,d=Math.hypot(dx,dy);if(d>BEAM.R||d<1)return d<3?1:0;
  const cs=(dx*Math.cos(P.aim)+dy*Math.sin(P.aim))/d;if(cs<Math.cos(BEAM.half+.06))return 0;if(!shadowTest(LSM,wx,wy))return 0;
  return P.beamK*(1-d/BEAM.R*.6);
}
/* every light that can freeze a shade, at a world point */
function lightHere(wx,wy){let L=lightAt(wx,wy)+lanternAt(wx,wy);for(const f of FLARES)L+=flareAt(f,wx,wy);if(GREAT.on)L+=greatAt(wx,wy);return L;}
/* ---------- flares ---------- */
const FLARES=[];
function flareAt(f,wx,wy){const d=Math.hypot(wx-f.x,wy-f.y);if(d>f.R)return 0;if(!shadowTest(f.S,wx,wy))return 0;const k=1-f.t/f.dur;return 2.4*k*k*(1-d/f.R);}
function fireFlare(){
  if(P.flares<=0||P.dead)return;P.flares--;const f={x:P.x,y:P.y,t:0,dur:1.5,R:96,S:mkShadow(512)};castShadow(f.S,f.x,f.y,f.R,2,1.5);FLARES.push(f);
  S.flash=1;S.shake=Math.max(S.shake,.5);SFX.flare();
  let n=0;for(const s of SH){if(s.hp>0&&Math.hypot(s.x-f.x,s.y-f.y)<72&&shadowTest(f.S,s.x,s.y)){s.hp=0;s.how='flare';n++;}}
  for(const m of MOTHS)if(Math.hypot(m.x-f.x,m.y-f.y)<80){m.scatter=1;addScore(300,m.x,m.y-6);}
  for(const z of SNUF)if(Math.hypot(z.x-f.x,z.y-f.y)<80&&shadowTest(f.S,z.x,z.y))z.hp-=2.2;
  if(BOSS.on&&Math.hypot(BOSS.x-f.x,BOSS.y-f.y)<BOSS.r+60){BOSS.eye=Math.max(BOSS.eye,2.2);bossHurt(2.5);}
  if(n>=3)callout('FLARE  x'+n,2);
}
/* ---------- the great lamp of the lighthouse (last night) ---------- */
const GREAT={on:false,a:-Math.PI/2,S:null,R:127,half:.17,k:0};
function greatAt(wx,wy){
  if(!GREAT.on||!TOWER)return 0;const dx=wx-TOWER.x,dy=wy-TOWER.y,d=Math.hypot(dx,dy);if(d>GREAT.R||d<TOWER.r)return 0;
  const cs=(dx*Math.cos(GREAT.a)+dy*Math.sin(GREAT.a))/d,ci=Math.cos(GREAT.half);if(cs<ci-.05)return 0;if(!shadowTest(GREAT.S,wx,wy))return 0;
  return 1.6*GREAT.k*smooth(ci-.05,ci+.05,cs)*(1-d/GREAT.R*.55);
}
function wakeGreatLamp(){GREAT.on=true;GREAT.k=0;GREAT.S=mkShadow(1024);castShadow(GREAT.S,TOWER.x,TOWER.y,GREAT.R,2,TOWER.r+1.5);}
/* ---------- particles (world space): embers glow, smoke and spray are lit ---------- */
const PART=[];
function puff(x,y,n,kind,spd,life){for(let k=0;k<n&&PART.length<500;k++){const a=Math.random()*TAU,v=rnd(.2,1)*(spd||20);PART.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.5,1)*(life||.8),t:0,kind});}}
function stepParts(dt){let n=0;for(const p of PART){p.t+=dt;if(p.t>=p.life)continue;const dr=p.kind===1?1.6:p.kind===0?2.4:4;p.vx*=Math.exp(-dr*dt);p.vy*=Math.exp(-dr*dt);if(p.kind===1)p.vy-=6*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;PART[n++]=p;}PART.length=n;}
/* ---------- the shades' map of the town: a Dijkstra field from the lamplighter, lit cells cost more ---------- */
const FIELD=new Uint16Array(64*64),CLIT=new Uint8Array(64*64);
function litCells(){for(let cy=0;cy<MH;cy++)for(let cx=0;cx<MW;cx++){let s=0;for(let j=1;j<CS;j+=3)for(let i=1;i<CS;i+=3)s+=LMAP[(cy*CS+j)*WW+cx*CS+i];CLIT[cy*64+cx]=s/9>.3?1:0;}}
const HEAP=[];
function buildField(tx,ty,F,litCost,G){
  F=F||FIELD;litCost=litCost||5;G=G||WALK;
  F.fill(65535);const sc=clamp(Math.floor(tx/CS),0,MW-1)+clamp(Math.floor(ty/CS),0,MH-1)*64;F[sc]=0;HEAP.length=0;HEAP.push(sc);
  const push=v=>{HEAP.push(v);let i=HEAP.length-1;while(i>0){const p=(i-1)>>1;if(F[HEAP[p]]<=F[HEAP[i]])break;[HEAP[p],HEAP[i]]=[HEAP[i],HEAP[p]];i=p;}};
  const pop=()=>{const top=HEAP[0],last=HEAP.pop();if(HEAP.length){HEAP[0]=last;let i=0;for(;;){const l=i*2+1,r=l+1;let m=i;if(l<HEAP.length&&F[HEAP[l]]<F[HEAP[m]])m=l;if(r<HEAP.length&&F[HEAP[r]]<F[HEAP[m]])m=r;if(m===i)break;[HEAP[m],HEAP[i]]=[HEAP[i],HEAP[m]];i=m;}}return top;};
  const seen=new Uint8Array(64*64);
  while(HEAP.length){const c=pop();if(seen[c])continue;seen[c]=1;const cx=c&63,cy=c>>6,dc=F[c];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=MW||ny>=MH)continue;const n=ny*64+nx;if(!G[n])continue;
      if(dx&&dy&&(!G[cy*64+nx]||!G[ny*64+cx]))continue;                  /* no cutting corners of buildings */
      const cost=(dx&&dy?14:10)*(CLIT[n]?litCost:1),nd=dc+cost;if(nd<F[n]){F[n]=nd;push(n);}}}
}
function fieldStep(x,y,F,G){F=F||FIELD;G=G||WALK;const cx=clamp(Math.floor(x/CS),0,MW-1),cy=clamp(Math.floor(y/CS),0,MH-1);let best=F[cy*64+cx],bx=0,by=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=MW||ny>=MH)continue;if(dx&&dy&&(!G[cy*64+nx]||!G[ny*64+cx]))continue;const v=F[ny*64+nx];if(v<best){best=v;bx=dx;by=dy;}}
  return [(cx+bx)*CS+4,(cy+by)*CS+4];}
/* ---------- shades: darkness that walks. They cannot move while light is on them; the beam burns them ---------- */
const SH=[];let SID=0;
function spawnShade(){
  const cands=[...WELLS,...EDGES].filter(w=>Math.hypot(w.x-P.x,w.y-P.y)>95&&LMAP[(w.y|0)*WW+(w.x|0)]<.12);if(!cands.length)return false;
  const w=pick(cands);SH.push({x:w.x+rnd(-2,2),y:w.y+rnd(-2,2),vx:0,vy:0,hp:1,fz:0,in:0,eye:Math.random()*5,id:SID++,how:'',burn:0,lunge:0,stuck:0});return true;
}
function stepShades(dt,live){
  const spd=ST.shade.speed;
  for(let k=SH.length-1;k>=0;k--){const s=SH[k];s.in=Math.min(1,s.in+dt*1.25);s.eye+=dt;
    const L=lightHere(s.x,s.y),bm=beamAt(s.x,s.y);
    if(bm>0&&s.in>.6){s.hp-=bm*2.7*dt;s.burn=.12;if((r32()&3)===0)puff(s.x+rnd(-2,2),s.y+rnd(-2,2),1,0,30,.35);s.how='beam';}
    s.burn=Math.max(0,s.burn-dt);
    if(s.hp<=0){SH.splice(k,1);shadeDies(s);continue;}
    s.fz=L>.2&&s.in>.6?Math.min(1,s.fz+dt*8):Math.max(0,s.fz-dt*4);
    if(s.fz>.5||!live||P.dead){s.vx*=.6;s.vy*=.6;continue;}
    const d=Math.hypot(P.x-s.x,P.y-s.y);let tx,ty;
    if(d<20){tx=P.x;ty=P.y;}else[tx,ty]=fieldStep(s.x,s.y);
    let ax=tx-s.x,ay=ty-s.y;const al=Math.hypot(ax,ay)||1;ax/=al;ay/=al;
    for(const o of SH){if(o===s)continue;const ox=s.x-o.x,oy=s.y-o.y,od=ox*ox+oy*oy;if(od<36&&od>0){ax+=ox/od*3;ay+=oy/od*3;}}
    const v=spd*(d<24?1.5:1)*(1-s.fz)*(.4+.6*s.in);
    s.vx+=(ax*v-s.vx)*Math.min(1,dt*5);s.vy+=(ay*v-s.vy)*Math.min(1,dt*5);
    const nx=s.x+s.vx*dt,ny=s.y+s.vy*dt;
    if(!blocked(nx,s.y,1.5,false))s.x=nx;else s.vx*=-.3;
    if(!blocked(s.x,ny,1.5,false))s.y=ny;else s.vy*=-.3;
    if(d<4.5&&live&&P.inv<=0){SH.splice(k,1);shadeTouches(s);}
  }
}
function shadeDies(s){
  puff(s.x,s.y,14,0,46,.6);puff(s.x,s.y,6,1,12,1.2);
  if(s.how==='flare'){addScore(100,s.x,s.y-6);}else{S.chain=S.chainT>0?S.chain+1:1;S.chainT=2.2;const m=Math.min(6,S.chain);addScore(150*m,s.x,s.y-6);if(m>1)callout('BURNED  x'+m,1.1);}
  S.stats.shades++;SFX.burn(Math.min(6,S.chain||1));
}
function shadeTouches(s){
  P.oil=Math.max(0,P.oil-30);P.hurt=.5;P.inv=1.1;S.shake=Math.max(S.shake,.45);puff(s.x,s.y,10,1,30,1);SFX.chill();
  const dx=P.x-s.x,dy=P.y-s.y,dl=Math.hypot(dx,dy)||1;P.vx+=dx/dl*70;P.vy+=dy/dl*70;S.stats.hits++;
}
/* ---------- moths: a swarm goes to the brightest light it can see ---------- */
const MOTHS=[];
function spawnMoths(){const cands=[...WELLS,...EDGES];if(!cands.length)return;const w=pick(cands);
  const m={x:w.x,y:w.y,vx:0,vy:0,n:[],tgt:null,t:0,scatter:0,atLamp:0};for(let k=0;k<7;k++)m.n.push({a:Math.random()*TAU,r:rnd(2,6),w:rnd(5,11)*(Math.random()<.5?-1:1),ph:Math.random()*TAU});MOTHS.push(m);SFX.moths();}
function stepMoths(dt){
  for(let k=MOTHS.length-1;k>=0;k--){const m=MOTHS[k];m.t+=dt;
    if(m.scatter>0){m.scatter+=dt;for(const q of m.n)q.r+=dt*60;if(m.scatter>1.2)MOTHS.splice(k,1);continue;}
    /* pick the brightest light, weighed by distance */
    let best=null,bs=0;const pb=(.45+.9*P.beamK)*oilK()*(P.dead?0:1),pd=Math.hypot(P.x-m.x,P.y-m.y);if(pd<110){bs=pb/(1+pd/50);best='P';}
    for(const L of LAMPS){if(!L.lit)continue;const d=Math.hypot(L.x-m.x,L.y-m.y);if(d>110)continue;const s=.9/(1+d/50);if(s>bs){bs=s;best=L;}}
    if(best!==m.tgt){m.tgt=best;m.atLamp=0;}
    let tx,ty;if(best==='P'){tx=P.lx;ty=P.ly;}else if(best){tx=best.x;ty=best.y-2;m.atLamp+=dt;}else{tx=P.x;ty=P.y;}
    if(m.atLamp>22){m.scatter=.01;continue;}                        /* a swarm that has had its fill of a lamp drifts off */
    const dx=tx-m.x,dy=ty-m.y,dl=Math.hypot(dx,dy)||1,v=dl>8?30:8;m.vx+=(dx/dl*v-m.vx)*dt*2.5;m.vy+=(dy/dl*v-m.vy)*dt*2.5;m.x+=m.vx*dt;m.y+=m.vy*dt;
    for(const q of m.n){q.a+=q.w*dt;q.r+=(rnd(2,7)-q.r)*dt*.8;}
    if(best==='P'&&dl<10&&!P.dead){P.oil=Math.max(0,P.oil-2.4*dt);P.flick=.78+.22*Math.random();S.mothsOn=1;}
  }
}
/* ---------- snuffers: tall shapes with a bell on a pole, they walk through walls to put the lamps out ---------- */
const SNUF=[];
function spawnSnuffer(){const cands=[...WELLS,...EDGES].filter(w=>Math.hypot(w.x-P.x,w.y-P.y)>80);if(!cands.length)return;const w=pick(cands);
  SNUF.push({x:w.x,y:w.y,hp:2.6,tgt:null,t:0,wait:0,burn:0,fz:0});SFX.snufferCome();callout('A SNUFFER WALKS',1.6);}
function stepSnuffers(dt,live){
  for(let k=SNUF.length-1;k>=0;k--){const z=SNUF[k];z.t+=dt;
    const bm=beamAt(z.x,z.y-3);if(bm>0){z.hp-=bm*1.5*dt;z.burn=.12;z.fz=1;if((r32()&3)===0)puff(z.x+rnd(-3,3),z.y+rnd(-6,1),1,0,34,.4);}else z.fz=Math.max(0,z.fz-dt*3);
    z.burn=Math.max(0,z.burn-dt);
    if(z.hp<=0){SNUF.splice(k,1);puff(z.x,z.y-3,26,0,50,.8);puff(z.x,z.y-3,10,1,16,1.4);addScore(1000,z.x,z.y-10);S.stats.snuffers++;SFX.burn(4);callout('SNUFFER BURNED',1.4);continue;}
    if(!live||z.fz>.5)continue;
    if(z.wait>0){z.wait-=dt;continue;}
    if(!z.tgt||!z.tgt.lit){let bd=1e9;z.tgt=null;for(const L of LAMPS)if(L.lit){const d=Math.hypot(L.x-z.x,L.y-z.y);if(d<bd){bd=d;z.tgt=L;}}}
    const tx=z.tgt?z.tgt.x:P.x,ty=z.tgt?z.tgt.y+2:P.y,dx=tx-z.x,dy=ty-z.y,dl=Math.hypot(dx,dy)||1;
    z.x+=dx/dl*13*dt;z.y+=dy/dl*13*dt;
    if(z.tgt&&dl<4){lampToggle(z.tgt,false);z.tgt.snuffT=1;puff(z.tgt.x,z.tgt.y-3,18,1,14,2);SFX.snuff();callout('A LAMP GOES OUT',1.6);z.tgt=null;z.wait=1.6;S.stats.snuffed++;litCells();}
    if(Math.hypot(P.x-z.x,P.y-z.y)<5&&P.inv<=0&&!P.dead){P.oil=Math.max(0,P.oil-30);P.hurt=.5;P.inv=1.2;S.shake=.6;SFX.chill();}
  }
}
/* ---------- fireflies and pickups ---------- */
const FF=[];
function seedFlies(){FF.length=0;for(const f of FLIES)for(let k=0;k<5;k++)FF.push({hx:f.x,hy:f.y,x:f.x,y:f.y,ph:Math.random()*TAU,on:true,re:0,sp:rnd(.6,1.4)});}
function stepFlies(dt){for(const f of FF){if(!f.on){f.re-=dt;if(f.re<=0)f.on=true;continue;}f.ph+=dt*f.sp;f.x=f.hx+Math.sin(f.ph*1.3)*9+Math.sin(f.ph*.7)*4;f.y=f.hy+Math.cos(f.ph)*7;
  if(!P.dead&&Math.hypot(f.x-P.x,f.y-P.y)<4.5){f.on=false;f.re=30;P.oil=Math.min(OIL_MAX,P.oil+2);addScore(50,f.x,f.y-5);SFX.firefly();S.stats.flies++;}}}
function stepPicks(dt){for(const p of PICKS){p.t+=dt;if(!p.on){p.re-=dt;if(p.re<=0&&p.k==='oil')p.on=true;continue;}
  if(!P.dead&&Math.hypot(p.x-P.x,p.y-P.y)<5){if(p.k==='oil'){if(P.oil>OIL_MAX-4)continue;P.oil=Math.min(OIL_MAX,P.oil+38);p.on=false;p.re=40;SFX.oil();callout('OIL',.8);}
    else{if(P.flares>=3)continue;P.flares++;p.on=false;p.re=1e9;SFX.pickFlare();callout('FLARE',.8);}}}}
/* ---------- THE LONG NIGHT: a hole in the world the size of a house. Light does not stop it; it puts out
   every lamp it passes over. Its one eye opens now and then, and when the great lamp sweeps it. ---------- */
const BOSS={on:false,x:0,y:0,r:22,hp:9,hp0:9,eye:0,eyeT:6,t:0,rise:0,hurt:0,split:2,dead:0,vx:0,vy:0};
function bossStart(){Object.assign(BOSS,{on:true,x:TOWER?TOWER.x:WW/2,y:22,r:22,hp:12,hp0:12,eye:0,eyeT:5,t:0,rise:0,hurt:0,split:2,dead:0});SFX.bossRise();bigCallout('THE LONG NIGHT','RISES FROM THE SEA');}
function bossHurt(d){if(!BOSS.on||BOSS.dead)return;BOSS.hp=Math.max(0,BOSS.hp-d);BOSS.hurt=.15;
  if(BOSS.hp<BOSS.hp0*BOSS.split/3){BOSS.split--;for(let k=0;k<4;k++){const a=Math.random()*TAU;SH.push({x:BOSS.x+Math.cos(a)*BOSS.r,y:BOSS.y+Math.sin(a)*BOSS.r,vx:0,vy:0,hp:1,fz:0,in:.3,eye:0,id:SID++,how:'',burn:0,lunge:0,stuck:0});}SFX.bossHit();}
  if(BOSS.hp<=0){BOSS.dead=.01;SFX.bossDie();}}
function stepBoss(dt,live){
  const B=BOSS;if(!B.on)return;B.t+=dt;B.rise=Math.min(1,B.rise+dt*.35);B.hurt=Math.max(0,B.hurt-dt);
  if(B.dead){B.dead+=dt;B.r=Math.max(0,22*(1-B.dead/2.4));if((r32()&1)===0)puff(B.x+rnd(-B.r,B.r),B.y+rnd(-B.r,B.r),2,0,60,.7);if(B.dead>2.6){B.on=false;S.bossDown=1;}return;}
  /* the eye: on a timer, and forced open while the great lamp's beam crosses the body */
  B.eyeT-=dt;if(B.eyeT<=0){B.eye=2.6;B.eyeT=7+Math.random()*2;SFX.bossEye();}
  if(GREAT.on&&greatAt(B.x,B.y)>.2)B.eye=Math.max(B.eye,1.2);
  B.eye=Math.max(0,B.eye-dt);
  if(B.eye>0){const bm=beamAt(B.x,B.y);if(bm>0){bossHurt(bm*1.05*dt);if((r32()&1)===0)puff(B.x+rnd(-3,3),B.y+rnd(-3,3),1,0,40,.4);}}
  if(!live||B.rise<1)return;
  const dx=P.x-B.x,dy=P.y-B.y,dl=Math.hypot(dx,dy)||1,v=(B.eye>0?3:9)*(1+(1-B.hp/B.hp0)*.5);
  B.vx+=(dx/dl*v-B.vx)*dt*.8;B.vy+=(dy/dl*v-B.vy)*dt*.8;B.x=clamp(B.x+B.vx*dt,10,WW-10);B.y=clamp(B.y+B.vy*dt,10,WH-10);
  for(const L of LAMPS)if(L.lit&&Math.hypot(L.x-B.x,L.y-B.y)<B.r*.8){lampToggle(L,false);L.snuffT=1;puff(L.x,L.y-3,16,1,14,2);SFX.snuff();litCells();}
  if(dl<B.r*.75&&P.inv<=0&&!P.dead){P.oil=Math.max(0,P.oil-34);P.inv=1.4;P.hurt=.6;S.shake=.9;P.vx-=dx/dl*90;P.vy-=dy/dl*90;SFX.chill();}
}
/* the body: a ragged disc whose edge boils */
function bossMask(wx,wy){const B=BOSS;if(!B.on)return 1;const dx=wx-B.x,dy=wy-B.y,d=Math.hypot(dx,dy),r=B.r*(.4+.6*B.rise);if(d>r+5)return 1;
  const a=Math.atan2(dy,dx),edge=r+Math.sin(a*5+B.t*1.7)*2.2+Math.sin(a*11-B.t*2.9)*1.2+(vnoise(a*3+B.t,B.t*.7,77)-.5)*3;return smooth(edge-2.5,edge+.5,d);}
