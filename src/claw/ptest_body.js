
const MODE=process.argv[2]||'pile';
function fillPile(n){
  const types=[];for(const t of CAST)for(let k=0;k<t.wt;k++)types.push(t);
  let k=0;
  for(let row=0;k<n;row++)for(let col=0;col<7&&k<n;col++,k++){
    const T=types[(Math.random()*types.length)|0];
    const x=CW+18+col*26+rnd(-3,3),z=8+((k*7)%3)*15+rnd(0,4),y=20+row*16+rnd(0,6);
    spawn(T,x,y,clamp(z,T.R*.7+.5,PD-T.R*.7-.5),rnd(-.5,.5));
  }
}
function gantry(tx,tz,dt){const VM=+(process.env.VM||48),AC=+(process.env.AC||110);
  for(const [k,v,t] of [['gx','gvx',tx],['gz','gvz',tz]]){const d=t-CL[k],want=clamp(d*3,-VM,VM),dv=clamp(want-CL[v],-AC*dt,AC*dt);CL[v]+=dv;CL[k]+=CL[v]*dt;}}
function nanCheck(){for(let i=0;i<NP;i++)if(PB[i]>=0&&!(isFinite(X[i])&&isFinite(Y[i])))return true;return false;}
function stats(){let ke=0;for(let i=0;i<NP;i++){if(PB[i]<0)continue;const vx=(X[i]-OX[i])/HS,vy=(Y[i]-OY[i])/HS;ke+=vx*vx+vy*vy;}
  let hmax=0,comp=0;for(const b of BOD){hmax=Math.max(hmax,b.maxY-5);comp+=b.comp;}return {ke:(ke/NP).toFixed(2),hmax:hmax.toFixed(1),comp:(comp/BOD.length).toFixed(3)};}
function settle(sec){for(let t=0;t<sec*60;t++){physTick();for(const b of BOD.slice())if(b.cy<-40){FELL++;kill(b);}}}
let FELL=0;
const T0=Date.now();
if(MODE==='pile'){
  fillPile(+(process.env.N||26));
  for(let s=0;s<8;s++){const t0=Date.now();settle(1);console.log('t',s+1,'s',stats(),'ms/tick',((Date.now()-t0)/60).toFixed(2),'NP',NP,nanCheck()?'NAN':'');}
  const zs=BOD.map(b=>BZ[b.slot].toFixed(0)).join(' ');console.log('z',zs,'fell',FELL);
  console.log('cy',BOD.map(b=>b.cy.toFixed(0)).join(' '));
  console.log('comp',BOD.map(b=>b.comp.toFixed(2)).join(' '));
}
// grab experiment: one target body on the floor (optionally with neighbours), claw at strength S
function grabRun(T,S,opts={}){
  BOD.slice().forEach(kill);NP=0;
  Object.assign(CL,{gvx:0,gvz:0,gx:HOME_X,gz:HOME_Z,hx:HOME_X,hy:GYA-LMIN,hz:HOME_Z,ox:HOME_X,oy:GYA-LMIN,oz:HOME_Z,L:LMIN,winch:0,ph:[.5,.5],oph:[.5,.5],pt:[.5,.5],motor:-1,S,tilt:0});
  const tx=opts.x||140,tz=opts.z||25;
  const b=spawn(T,tx,T.R+2,tz,opts.rot||0);
  if(opts.nb){spawn(CAST[0],tx-27,14,tz,0);spawn(CAST[1],tx+27,14,tz,0);if(opts.nb>1){spawn(CAST[2],tx,40,tz+16,0);spawn(CAST[3],tx-12,40,tz-14,0);}}
  settle(1.5);
  const ax=tx+(opts.dx||0),az=tz+(opts.dz||0);
  for(let t=0;t<60*6;t++){gantry(ax,az,1/60);physTick();}
  // drop
  CL.motor=-1;let t=0,slackT=0;
  for(;t<60*0.3;t++)physTick();
  CL.winch=0;
  for(t=0;t<60*4;t++){CL.winch=Math.min(50,CL.winch+5);physTick();const vy=(CL.hy-CL.oy)/HS;if(CL.slack>1&&vy>-15)slackT++;else slackT=0;if(slackT>2||CL.L>=LMAX)break;}
  CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-GYA,CL.hz-CL.gz)+.5);
  const stopY=CL.hy;
  CL.motor=1;for(t=0;t<60*1.0;t++)physTick();
  const sq=b.comp;
  CL.winch=-34;let maxY=0,loadMax=0;
  for(t=0;t<60*4;t++){physTick();if(b.cy>maxY)maxY=b.cy;if(CL.L<=LMIN)break;}
  CL.winch=0;for(t=0;t<20;t++)physTick();
  const top=b.cy;
  // carry home
  for(t=0;t<60*6;t++){gantry(HOME_X,HOME_Z,1/60);physTick();loadMax=Math.max(loadMax,CL.load);}
  const carried=b.cy;
  CL.motor=-1;for(t=0;t<60*2;t++)physTick();
  const won=b.cy<-5||b.state==='gone';
  return {stopY:stopY.toFixed(1),sq:sq.toFixed(2),maxY:maxY.toFixed(0),top:top.toFixed(0),carried:carried.toFixed(0),won,ph:CL.ph.map(v=>v.toFixed(2)).join('/'),load:loadMax.toFixed(2)};
}
if(MODE==='grab'){
  const Ss=(process.env.S||'0.2,0.35,0.5,0.65,0.8,1').split(',').map(Number);
  const types=(process.env.T||'bear,bunny,cat,octo,star,slime,uni,gold').split(',');
  const opts=JSON.parse(process.env.O||'{}');
  for(const id of types){const row=[];for(const S of Ss){const r=grabRun(CASTI[id],S,opts);row.push(`${S}:${r.won?'WIN':'---'} top${r.top} car${r.carried} sq${r.sq} ph${r.ph} ld${r.load}`);}console.log(id.padEnd(6),row.join(' | '));}
}
console.log('total ms',Date.now()-T0);
if(MODE==='diag'){
  fillPile(+(process.env.N||26));
  for(let t=0;t<60*8;t++){
    const pre=BOD.map(b=>({id:b.id,z:BZ[b.slot],zm:b.zmode,cy:b.cy,cx:b.cx}));
    physTick();for(const b of BOD.slice())if(b.cy<-40){FELL++;kill(b);}
    for(const b of BOD){let vm=0;for(let i=b.i0;i<b.i0+b.np;i++){const v=Math.hypot(X[i]-OX[i],Y[i]-OY[i])/HS;if(v>vm)vm=v;}
      if(vm>400){const p=pre.find(q=>q.id===b.id);console.log('tick',t,b.T.id,'id',b.id,'vmax',vm.toFixed(0),'z',BZ[b.slot].toFixed(1),'zmode',p&&p.zm,'->',b.zmode,'c',b.cx.toFixed(0),b.cy.toFixed(0),'comp',b.comp.toFixed(2));}}
  }
}
if(MODE==='diag2'){
  fillPile(+(process.env.N||26));settle(2);
  const hist={};
  for(let t=0;t<60*3;t++){physTick();
    for(const b of BOD){for(let i=b.i0;i<b.i0+b.np;i++){const v=Math.hypot(X[i]-OX[i],Y[i]-OY[i])/HS;if(v>250){const li=i-b.i0;const k=b.T.id+(li<b.n?':ring':':limb'+(li-b.n));hist[k]=(hist[k]||0)+1;}}}}
  console.log(hist);
  // single body alone on floor
  BOD.slice().forEach(kill);NP=0;
  for(const T of CAST){const b=spawn(T,120,T.R+1,25,0);let vm=0;for(let t=0;t<120;t++){physTick();}for(let t=0;t<60;t++){physTick();for(let i=b.i0;i<b.i0+b.np;i++){const v=Math.hypot(X[i]-OX[i],Y[i]-OY[i])/HS;if(v>vm)vm=v;}}
    console.log(T.id,'alone vmax',vm.toFixed(1),'comp',b.comp.toFixed(3),'cy',b.cy.toFixed(2));kill(b);NP=0;}
}
if(MODE==='stack'){
  const cases=[['bear','bear'],['star','bear'],['bear','star'],['star','star'],['bunny','octo'],['slime','cat'],['gold','uni']];
  for(const [a,bb] of cases){BOD.slice().forEach(kill);NP=0;
    const b1=spawn(CASTI[bb],120,13,25,0),b2=spawn(CASTI[a],122,40,25,.3),b3=spawn(CASTI[bb],95,13,25,0);
    settle(3);let vm=0,ke=0,cnt=0;for(let t=0;t<120;t++){physTick();for(const b of BOD)for(let i=b.i0;i<b.i0+b.np;i++){const v=Math.hypot(X[i]-OX[i],Y[i]-OY[i])/HS;if(v>vm)vm=v;ke+=v*v;cnt++;}}
    console.log(a,'on',bb,'vmax',vm.toFixed(1),'rms',Math.sqrt(ke/cnt).toFixed(2),'top cy',b2.cy.toFixed(1));}
  BOD.slice().forEach(kill);NP=0;
  for(const T of CAST){const b=spawn(T,120,T.R+1,25,0);let vm=0;for(let t=0;t<120;t++){physTick();}for(let t=0;t<60;t++){physTick();for(let i=b.i0;i<b.i0+b.np;i++){const v=Math.hypot(X[i]-OX[i],Y[i]-OY[i])/HS;if(v>vm)vm=v;}}
    console.log(T.id,'alone vmax',vm.toFixed(1),'comp',b.comp.toFixed(3),'cy',b.cy.toFixed(2));kill(b);NP=0;}
}
function jit(label,setup,sec=3){BOD.slice().forEach(kill);NP=0;setup();settle(sec);let vm=0,ke=0,cnt=0,arg='';
  for(let t=0;t<120;t++){physTick();for(const b of BOD)for(let i=b.i0;i<b.i0+b.np;i++){const v=Math.hypot(X[i]-OX[i],Y[i]-OY[i])/HS;if(v>vm){vm=v;arg=b.T.id+(i-b.i0<b.n?' ring':' limb')+(i-b.i0);}ke+=v*v;cnt++;}}
  console.log(label.padEnd(28),'vmax',vm.toFixed(1).padStart(6),'rms',Math.sqrt(ke/cnt).toFixed(2).padStart(6),arg, BOD.map(b=>b.cy.toFixed(0)+'/'+BZ[b.slot].toFixed(0)).join(' '));}
if(MODE==='jit'){
  jit('2 bears touching',()=>{spawn(CASTI.bear,120,13,25,0);spawn(CASTI.bear,144,13,25,0);});
  jit('2 cats touching',()=>{spawn(CASTI.cat,120,13,25,0);spawn(CASTI.cat,144,13,25,0);});
  jit('bear on 2 bears',()=>{spawn(CASTI.bear,108,13,25,0);spawn(CASTI.bear,132,13,25,0);spawn(CASTI.bear,120,38,25,0);});
  jit('cat on 2 cats',()=>{spawn(CASTI.cat,108,13,25,0);spawn(CASTI.cat,132,13,25,0);spawn(CASTI.cat,120,38,25,0);});
  jit('bear vs wall',()=>{spawn(CASTI.bear,230,13,25,0);});
  jit('bear diff z overlap',()=>{spawn(CASTI.bear,120,13,20,0);spawn(CASTI.bear,130,13,36,0);});
}
if(MODE==='wall'){
  const b=spawn(CASTI.bear,230,13,25,0);
  for(let t=0;t<60*5;t++){physTick();if(t%15===0){const e=b.limbs[1].s;let vm=0,am=0;for(let i=b.i0;i<b.i0+b.np;i++){const v=Math.hypot(X[i]-OX[i],Y[i]-OY[i])/HS;if(v>vm){vm=v;am=i-b.i0;}}
    console.log(t,'c',b.cx.toFixed(2),b.cy.toFixed(2),'ang',b.ang.toFixed(3),'earR',X[e].toFixed(2),Y[e].toFixed(2),'vmax',vm.toFixed(1),'@',am);}}
}
if(MODE==='count'){
  fillPile(26);settle(3);
  const t0=Date.now();for(let k=0;k<300;k++)physTick();console.log('ms/tick',(Date.now()-t0)/300,'NP',NP);
}
if(MODE==='trace'){
  const T=CASTI[process.env.T||'bear'],S=+(process.env.S||1);
  const tx=140,tz=25;const b=spawn(T,tx,T.R+2,tz,0);CL.S=S;settle(1.5);
  const tr=(lab)=>console.log(lab.padEnd(6),'h',CL.hx.toFixed(1),CL.hy.toFixed(1),CL.hz.toFixed(1),'L',CL.L.toFixed(1),'slack',CL.slack.toFixed(2),'ph',CL.ph.map(v=>v.toFixed(3)).join('/'),'touch',CL.touch,'pc',b.pc,b.pcL,b.pcR,'b',b.cx.toFixed(1),b.cy.toFixed(1),'z',BZ[b.slot].toFixed(1),'comp',b.comp.toFixed(2),'load',CL.load.toFixed(2));
  for(let t=0;t<60*6;t++){gantry(tx,tz,1/60);physTick();}tr('aim');
  CL.motor=-1;for(let t=0;t<18;t++)physTick();tr('open');
  CL.winch=50;let st=0;
  for(let t=0;t<240;t++){physTick();if(t%10===0)tr('drop'+t);if(CL.slack>1.5)st++;else st=0;if(st>7||CL.L>=LMAX){tr('stop');break;}}
  CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-GYA,CL.hz-CL.gz)+.5);
  CL.motor=1;for(let t=0;t<60;t++){physTick();if(t%10===0)tr('close'+t);}
  CL.winch=-34;for(let t=0;t<200;t++){physTick();if(t%20===0)tr('lift'+t);if(CL.L<=LMIN)break;}
  tr('top');
}
const DBG=require(process.cwd()+'/dbgpng.js');
function shot(path,sc=4){const w=(PW+20)*sc,h=(PH+20)*sc,buf=Buffer.alloc(w*h*3,16);
  const P=(x,y,r,g,b2)=>{x=Math.round((x+10)*sc);y=Math.round((PH+10-y)*sc);if(x<0||y<0||x>=w||y>=h)return;const o=(y*w+x)*3;buf[o]=r;buf[o+1]=g;buf[o+2]=b2;};
  const circ=(cx,cy,rr,c)=>{for(let a=0;a<TAU;a+=.15/Math.max(1,rr))P(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,...c);};
  const seg=(x0,y0,x1,y1,c)=>{const n=Math.max(2,Math.hypot(x1-x0,y1-y0)*sc);for(let k=0;k<=n;k++)P(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,...c);};
  seg(0,0,PW,0,[90,90,90]);seg(CW,-40,CW,CH,[200,200,90]);seg(0,CH,CW,CH,[60,60,40]);
  for(const b of BOD){const z=BZ[b.slot],t=z/PD,col=[255*(1-t)|0,120,255*t|0];
    for(let k=0;k<b.n;k++){const i=b.i0+k,j=b.i0+(k+1)%b.n;seg(X[i],Y[i],X[j],Y[j],col);circ(X[i],Y[i],RD[i],col.map(v=>v>>1));}
    for(let i=b.i0+b.n;i<b.i0+b.np;i++)circ(X[i],Y[i],RD[i],[255,255,255]);}
  prongLocal();const w2=[0,0];
  const L2W=(u,v)=>clawLocalToWorld(u,v,[0,0]);
  for(let s=0;s<2;s++){const o=s*8;const a=L2W(PG[o],PG[o+1]),b=L2W(PG[o+2],PG[o+3]),c=L2W(PG[o+4],PG[o+5]);seg(a[0],a[1],b[0],b[1],[255,255,0]);seg(b[0],b[1],c[0],c[1],[255,160,0]);circ(c[0],c[1],RC,[255,160,0]);}
  const h0=L2W(-5.5,1.5),h1=L2W(5.5,1.5);seg(h0[0],h0[1],h1[0],h1[1],[0,255,255]);circ(h0[0],h0[1],4,[0,255,255]);circ(h1[0],h1[1],4,[0,255,255]);
  seg(CL.gx,GYA,CL.hx,CL.hy,[150,150,150]);
  DBG.png(path,w,h,buf);}
if(MODE==='vis'){
  const T=CASTI[process.env.T||'bear'],S=+(process.env.S||1);const tx=140,tz=25;const b=spawn(T,tx,T.R+2,tz,0);CL.S=S;
  if(process.env.NB){spawn(CAST[0],tx-27,14,tz,0);spawn(CAST[1],tx+27,14,tz,0);}
  settle(1.5);for(let t=0;t<60*6;t++){gantry(tx+(+process.env.DX||0),tz,1/60);physTick();}
  CL.motor=-1;for(let t=0;t<18;t++)physTick();CL.winch=0;let st=0;
  for(let t=0;t<240;t++){CL.winch=Math.min(50,CL.winch+5);physTick();const vy=(CL.hy-CL.oy)/HS;if(CL.slack>1&&vy>-15)st++;else st=0;if(st>2||CL.L>=LMAX)break;}
  CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-GYA,CL.hz-CL.gz)+.5);shot('shots/dbg_1land.png');
  CL.motor=1;for(let t=0;t<60;t++)physTick();shot('shots/dbg_2closed.png');
  CL.winch=-34;for(let t=0;t<40;t++)physTick();shot('shots/dbg_3lift.png');
  for(let t=0;t<200;t++){physTick();if(CL.L<=LMIN)break;}shot('shots/dbg_4top.png');
  for(let t=0;t<60*6;t++){gantry(HOME_X,HOME_Z,1/60);physTick();if(t===40)shot('shots/dbg_4b.png');if(t===80)shot('shots/dbg_4c.png');}shot('shots/dbg_5home.png');
  CL.motor=-1;for(let t=0;t<60;t++)physTick();shot('shots/dbg_6rel.png');
  console.log('ph',CL.ph,'b',b.cx,b.cy,b.state);
}
if(MODE==='close'){
  const T=CASTI[process.env.T||'bear'],S=+(process.env.S||1);const tx=140,tz=25;const b=spawn(T,tx,T.R+2,tz,0);CL.S=S;
  settle(1.5);for(let t=0;t<60*6;t++){gantry(tx,tz,1/60);physTick();}
  CL.motor=-1;for(let t=0;t<18;t++)physTick();CL.winch=0;let st=0;
  for(let t=0;t<240;t++){CL.winch=Math.min(50,CL.winch+5);physTick();const vy=(CL.hy-CL.oy)/HS;if(CL.slack>1&&vy>-15)st++;else st=0;if(st>2||CL.L>=LMAX)break;}
  CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-GYA,CL.hz-CL.gz)+.5);
  CL.motor=1;
  for(let t=0;t<60;t++){
    let dphF=0;const p0=CL.ph.slice();physTick();
    if(t%4===0)console.log(t,'ph',CL.ph.map(v=>v.toFixed(3)).join('/'),'hy',CL.hy.toFixed(2),'L',CL.L.toFixed(1),'slack',CL.slack.toFixed(2),'pc',b.pc,b.pcL,b.pcR,'cnt',CL.cnt,'cap',CL.cap.toFixed(3),'dem',CL.dem.toFixed(3),'comp',b.comp.toFixed(3),'by',b.cy.toFixed(1));
  }
}

/* realistic metric: settled heap, AI-style target choice, full sequence */
function pickTarget(){let best=null,bs=-1e9;for(const b of BOD){if(b.state!=='pit'||b.cx<CW+14||b.cx>PW-14)continue;
  let cover=0;for(const o of BOD){if(o===b)continue;if(Math.abs(BZ[o.slot]-BZ[b.slot])<(BTH[o.slot]+BTH[b.slot])*.5&&Math.abs(o.cx-b.cx)<o.T.R+b.T.R&&o.cy>b.cy)cover++;}
  const sc=b.cy*1.5-cover*40-Math.abs(b.cx-120)*.05+Math.random()*4;if(sc>bs){bs=sc;best=b;}}return best;}
let VMAXH=0;
function fullRun(S,jit){
  CL.S=S;const b=pickTarget();if(!b)return null;const tx=b.cx+rnd(-jit,jit),tz=BZ[b.slot]+rnd(-jit*.6,jit*.6);
  for(let t=0;t<60*7;t++){gantry(tx,tz,1/60);physTick();}
  CL.motor=-1;for(let t=0;t<18;t++)physTick();CL.winch=0;let st=0;
  for(let t=0;t<300;t++){CL.winch=Math.min(50,CL.winch+5);physTick();const vy=(CL.hy-CL.oy)/HS;if(CL.slack>1&&vy>-15)st++;else st=0;if(st>2||CL.L>=LMAX)break;}
  for(let t=0;t<+(process.env.OD||9)&&CL.L<LMAX;t++)physTick();
  CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-GYA,CL.hz-CL.gz)+.5);
  CL.motor=1;for(let t=0;t<60;t++){physTick();const v=Math.hypot(CL.hx-CL.ox,CL.hy-CL.oy)/HS;if(v>VMAXH)VMAXH=v;}
  CL.winch=-34;for(let t=0;t<240;t++){physTick();if(CL.L<=LMIN)break;}CL.winch=0;for(let t=0;t<20;t++)physTick();
  let up=BOD.filter(o=>o.cy>65).map(o=>o.T.id);
  for(let t=0;t<60*7;t++){gantry(HOME_X,HOME_Z,1/60);physTick();}
  const carried=BOD.filter(o=>o.cy>65).map(o=>o.T.id);
  CL.motor=-1;let won=[];for(let t=0;t<120;t++){physTick();for(const o of BOD.slice())if(o.cy<-15&&o.cx<CW){won.push(o.T.id);kill(o);}}
  for(const o of BOD.slice())if(o.cy<-40)kill(o);
  return {tgt:b.T.id,up,carried,won};
}
if(MODE==='heap'){
  const Ss=(process.env.S||'0.3,0.5,0.7,0.9').split(',').map(Number),runs=+(process.env.RUNS||12),jit=+(process.env.JIT||3);
  for(const S of Ss){let lift=0,carry=0,win=0,tot=0;const wonT={};let t0=Date.now();
    for(let r=0;r<runs;r++){if(r%4===0){BOD.slice().forEach(kill);NP=0;fillPile(26);settle(4);}
      const res=fullRun(S,jit);if(!res)continue;tot++;if(res.up.length)lift++;if(res.carried.length)carry++;if(res.won.length){win++;for(const w of res.won)wonT[w]=(wonT[w]||0)+1;}}
    console.log('S',S,'vmaxHeadGrab',VMAXH.toFixed(0),'runs',tot,'lifted',lift,'carried',carry,'won',win,JSON.stringify(wonT),'ms/run',((Date.now()-t0)/runs).toFixed(0));}
}
if(MODE==='heapvis'){
  fillPile(26);settle(4);const S=+(process.env.S||.9);CL.S=S;
  for(let r=0;r<+(process.env.R||1);r++){const b=pickTarget();const tx=b.cx,tz=BZ[b.slot];
    for(let t=0;t<60*7;t++){gantry(tx,tz,1/60);physTick();}
    CL.motor=-1;for(let t=0;t<18;t++)physTick();CL.winch=0;let st=0;
    for(let t=0;t<300;t++){CL.winch=Math.min(50,CL.winch+5);physTick();const vy=(CL.hy-CL.oy)/HS;if(CL.slack>1&&vy>-15)st++;else st=0;if(st>2||CL.L>=LMAX)break;}
    CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-GYA,CL.hz-CL.gz)+.5);shot('shots/dbgh_'+r+'a.png');
    CL.motor=1;for(let t=0;t<60;t++)physTick();shot('shots/dbgh_'+r+'b.png');
    CL.winch=-34;for(let t=0;t<30;t++)physTick();shot('shots/dbgh_'+r+'c.png');for(let t=0;t<240;t++){physTick();if(CL.L<=LMIN)break;}CL.winch=0;
    for(let t=0;t<60*7;t++){gantry(HOME_X,HOME_Z,1/60);physTick();if(t==60)shot('shots/dbgh_'+r+'d.png');}
    CL.motor=-1;for(let t=0;t<120;t++)physTick();
    console.log(r,'target',b.T.id,'z',BZ[b.slot].toFixed(0),'claw z',CL.hz.toFixed(1),'b now',b.cx.toFixed(0),b.cy.toFixed(0));
  }
}
if(MODE==='long'){
  fillPile(28);settle(4);const snap=()=>BOD.map(b=>[b.cx,b.cy,BZ[b.slot]]);let s0=snap();
  for(let k=0;k<6;k++){const t0=Date.now();settle(10);const s1=snap();let mx=0;for(let i=0;i<s1.length;i++)mx=Math.max(mx,Math.hypot(s1[i][0]-s0[i][0],s1[i][1]-s0[i][1],s1[i][2]-s0[i][2]));
    console.log('t',(k+1)*10,'s max drift',mx.toFixed(2),stats(),'ms/tick',((Date.now()-t0)/600).toFixed(2),'fell',FELL);s0=s1;}
}
if(MODE==='perf'){
  fillPile(26);settle(4);const ts=[];
  for(let k=0;k<600;k++){const a=process.hrtime.bigint();physTick();ts.push(Number(process.hrtime.bigint()-a)/1e6);}
  ts.sort((a,b)=>a-b);console.log('idle heap NP',NP,'median',ts[300].toFixed(3),'p90',ts[540].toFixed(3),'p99',ts[594].toFixed(3),'ms/tick');
  const tg=[];const orig=physTick;
  for(let r=0;r<6;r++){CL.S=.9;const b=pickTarget();const tx=b.cx,tz=BZ[b.slot];
    const run=(n,f)=>{for(let t=0;t<n;t++){if(f)f();const a=process.hrtime.bigint();physTick();tg.push(Number(process.hrtime.bigint()-a)/1e6);}};
    run(300,()=>gantry(tx,tz,1/60));CL.motor=-1;run(18);CL.winch=0;let st=0;
    for(let t=0;t<300;t++){CL.winch=Math.min(50,CL.winch+5);run(1);const vy=(CL.hy-CL.oy)/HS;if(CL.slack>1&&vy>-15)st++;else st=0;if(st>2||CL.L>=LMAX)break;}
    run(9);CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-GYA,CL.hz-CL.gz)+.5);CL.motor=1;run(60);CL.winch=-34;run(150);CL.winch=0;run(300,()=>gantry(HOME_X,HOME_Z,1/60));CL.motor=-1;run(90);
    for(const o of BOD.slice())if(o.cy<-15)kill(o);}
  tg.sort((a,b)=>a-b);const q=p=>tg[Math.floor(p*tg.length)].toFixed(3);console.log('full grab cycles ticks',tg.length,'median',q(.5),'p90',q(.9),'p99',q(.99),'max',tg[tg.length-1].toFixed(2),'ms/tick');
}
