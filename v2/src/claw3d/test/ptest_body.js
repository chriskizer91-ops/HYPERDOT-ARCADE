const IDX=JSON.parse(fs.readFileSync(path.join(SRC,'models','index.json'),'utf8'));
const TYPES={};
function type(id,o={}){if(TYPES[id])return TYPES[id];const buf=fs.readFileSync(path.join(SRC,'models',id+'.bin'));
  const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
  return TYPES[id]=Object.assign({id,size:IDX[id].size,model:decodePlush(ab),mass:.22,ks:.06,beta:.3,ke:.25,kd:.02},o);}
const WILD=['frog','hedgehog','toadstool','fox','redpanda','owl','moth','hare'];
function stats(){let ke=0,n=0,nan=false;for(let i=0;i<NP;i++){if(PB[i]<0)continue;const vx=(PX[i]-OX[i])/HS,vy=(PY[i]-OY[i])/HS,vz=(PZ[i]-OZ[i])/HS;if(!isFinite(vx+vy+vz))nan=true;ke+=vx*vx+vy*vy+vz*vz;n++;}
  let hmax=0;for(const b of BOD)hmax=Math.max(hmax,b.y1);return {v:Math.sqrt(ke/n).toFixed(3),hmax:hmax.toFixed(2),nan};}
function fill(n){
  let k=0;for(let row=0;k<n;row++)for(let col=0;col<4&&k<n;col++)for(let dep=0;dep<3&&k<n;dep++,k++){
    const T=type(WILD[(Math.random()*WILD.length)|0]);
    const x=-.22+col*.19+rnd(-.02,.02),z=-.24+dep*.2+rnd(-.02,.02),y=.12+row*.24;
    spawn(T,x,y,z,rnd(-3,3),0,0,0,rnd(-.3,.3));}
}
const MODE=process.argv[2]||'pile';
if(MODE==='pile'){
  fill(+(process.env.N||22));setupGrid();
  for(let s=0;s<8;s++){const t0=Date.now();for(let t=0;t<60;t++)physTick(null);const st=stats();
    console.log('t',s+1,'s  rms speed',st.v,'m/s  top',st.hmax,'m  ms/tick',((Date.now()-t0)/60).toFixed(2),'balls',NP,st.nan?'NAN':'');}
  console.log('centre heights',BOD.map(b=>b.cy.toFixed(2)).join(' '));
  console.log('squash',BOD.map(b=>b.comp.toFixed(2)).join(' '));
}
function gantryTo(x,z,sec){GT.tx=x;GT.tz=z;for(let t=0;t<sec*60;t++){gantryTick(1/60);physTick(CLAWSTEP);clawTelemetry();}}
function grabRun(id,S,o={}){
  BOD.slice().forEach(kill);NP=0;clawReset();CL.S=S;
  const T=type(id),tx=o.x??.1,tz=o.z??-.05;
  const b=spawn(T,tx,T.size*.45,tz,o.yaw??0);
  if(o.nb){spawn(type('frog'),tx-.2,.1,tz,0);spawn(type('owl'),tx+.2,.12,tz,1);}
  setupGrid();
  for(let t=0;t<90;t++)physTick(null);
  gantryTo(tx+(o.dx||0),tz+(o.dz||0),4);
  // drop: open, pay out cable until slack
  CL.motor=-1;for(let t=0;t<18;t++){gantryTick(1/60);physTick(CLAWSTEP);}
  let slackT=0,t;for(t=0;t<60*4;t++){CL.winch=Math.min(.5,Math.max(CL.winch,0)+.05);physTick(CLAWSTEP);const vy=(CL.hy-CL.oy)/HS;if(CL.slack>.008&&vy>-.15)slackT++;else slackT=0;if(slackT>4||CL.L>=CS.LMAX)break;}
  CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-CS.GY,CL.hz-CL.gz)+.004);
  const stopY=CL.hy;
  CL.motor=1;for(t=0;t<60;t++){physTick(CLAWSTEP);clawTelemetry();}
  const sq=b.comp,ph=Array.from(CL.ph).slice(0,CS.npr).map(v=>v.toFixed(2)).join('/');
  let maxY=0;
  for(t=0;t<60*5;t++){CL.winch=-Math.min(.34,.06+(CL.L-CS.LMIN)*3);physTick(CLAWSTEP);clawTelemetry();if(b.cy>maxY)maxY=b.cy;if(CL.L<=CS.LMIN+.0005)break;}
  CL.winch=0;for(t=0;t<20;t++)physTick(CLAWSTEP);
  const top=b.cy;GT.carry=true;gantryTo(CS.home[0],CS.home[1],5);GT.carry=false;
  const carried=b.cy;CL.motor=-1;for(t=0;t<120;t++)physTick(CLAWSTEP);
  const won=b.cy<-.06;
  return {id,S,stopY:stopY.toFixed(3),sq:sq.toFixed(2),ph,maxY:maxY.toFixed(2),top:top.toFixed(2),carried:carried.toFixed(2),won};
}
if(MODE==='grab'){
  const Ss=(process.env.S||'0.3,0.5,0.7,0.9,1').split(',').map(Number);
  const ids=(process.env.T||WILD.join(',')).split(',');
  const o=JSON.parse(process.env.O||'{}');
  for(const id of ids){const row=[];for(const S of Ss){const t0=Date.now(),r=grabRun(id,S,o);row.push(`S${S}:${r.won?'WIN':r.top>.3?'held':'drop'} (top ${r.top}, squeeze ${r.sq}, ph ${r.ph})`);}
    console.log(id.padEnd(10),row.join(' | '));}
}
if(MODE==='sleep'){
  fill(+(process.env.N||22));setupGrid();
  for(let s=0;s<6;s++){const t0=Date.now();for(let t=0;t<60;t++)physTick(null);const asleep=BOD.filter(b=>b.sleep).length;
    console.log('t',s+1,'s  ms/tick',((Date.now()-t0)/60).toFixed(2),' asleep',asleep+'/'+BOD.length,stats().nan?'NAN':'');}
}
if(MODE==='jitter'){
  SLEEPOK=false;fill(+(process.env.N||22));setupGrid();
  for(let t=0;t<60*5;t++)physTick(null);
  const out=[];for(const b of BOD){let mv=0,av=0;for(let i=b.i0;i<b.i0+b.n;i++){const v=Math.hypot(PX[i]-OX[i],PY[i]-OY[i],PZ[i]-OZ[i])/HS;mv=Math.max(mv,v);av+=v;}out.push(b.T.id+' max '+(mv*1000).toFixed(1)+' avg '+(av/b.n*1000).toFixed(1));}
  console.log('mm/s after 5 s:\n'+out.join('\n'));
}
if(MODE==='trace'){
  const id=process.env.T||'fox',S=+(process.env.S||1);
  BOD.slice().forEach(kill);NP=0;clawReset();CL.S=S;
  const T=type(id),tx=.1,tz=-.05,b=spawn(T,tx,T.size*.45,tz,0);setupGrid();
  for(let t=0;t<90;t++)physTick(null);
  console.log('plush box y',b.y0.toFixed(3),b.y1.toFixed(3),'x',b.x0.toFixed(3),b.x1.toFixed(3),'z',b.z0.toFixed(3),b.z1.toFixed(3),'centre',b.cx.toFixed(3),b.cy.toFixed(3),b.cz.toFixed(3));
  gantryTo(b.cx,b.cz,4);
  CL.motor=-1;for(let t=0;t<18;t++){physTick(CLAWSTEP);}
  let slackT=0,t;for(t=0;t<60*4;t++){CL.winch=Math.min(.5,Math.max(CL.winch,0)+.05);physTick(CLAWSTEP);const vy=(CL.hy-CL.oy)/HS;if(CL.slack>.008&&vy>-.15)slackT++;else slackT=0;if(slackT>4||CL.L>=CS.LMAX)break;}
  CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-CS.GY,CL.hz-CL.gz)+.004);
  const tip=()=>{clawFrame();return [0,1,2].slice(0,CS.npr).map(s=>`(${PG[s*9+6].toFixed(2)},${PG[s*9+7].toFixed(2)},${PG[s*9+8].toFixed(2)})`).join(' ');};
  console.log('stopped: head',CL.hx.toFixed(3),CL.hy.toFixed(3),CL.hz.toFixed(3),'tips',tip());
  CL.motor=1;
  for(t=0;t<60;t++){physTick(CLAWSTEP);if(t%10===0)console.log(' close t',t,'ph',Array.from(CL.ph).slice(0,3).map(v=>v.toFixed(2)).join('/'),'contacts',b.pc,'touch',CL.touch,'body c',b.cx.toFixed(3),b.cy.toFixed(3),b.cz.toFixed(3),'tips',tip());}
}
function trial(id,S,seedYaw,seedTilt,err){
  BOD.slice().forEach(kill);NP=0;clawReset();CL.S=S;
  const T=type(id),b=spawn(T,.1,T.size*.6,-.05,seedYaw,0,0,0,seedTilt);setupGrid();
  for(let t=0;t<150;t++)physTick(null);
  const ax=(b.x0+b.x1)/2+err[0],az=(b.z0+b.z1)/2+err[1];
  gantryTo(ax,az,3.5);for(let t=0;t<40;t++)physTick(CLAWSTEP);      // let the swing die down a bit
  CL.motor=-1;for(let t=0;t<18;t++)physTick(CLAWSTEP);
  let slackT=0,t;for(t=0;t<60*4;t++){CL.winch=Math.min(.45,Math.max(CL.winch,0)+.04);physTick(CLAWSTEP);const vy=(CL.hy-CL.oy)/HS;if(CL.slack>.008&&vy>-.12)slackT++;else slackT=0;if(slackT>4||CL.L>=CS.LMAX)break;}
  CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-CS.GY,CL.hz-CL.gz)+.004);
  CL.motor=1;for(t=0;t<60;t++){physTick(CLAWSTEP);clawTelemetry();}
  let maxY=0;for(t=0;t<60*5;t++){CL.winch=-Math.min(.34,.06+(CL.L-CS.LMIN)*3);physTick(CLAWSTEP);clawTelemetry();if(b.cy>maxY)maxY=b.cy;if(CL.L<=CS.LMIN+.0005)break;}
  CL.winch=0;for(t=0;t<20;t++)physTick(CLAWSTEP);
  const lifted=b.cy>.35;GT.carry=true;gantryTo(CS.home[0],CS.home[1],4.5);GT.carry=false;
  const carried=b.cy>.35,at=[b.cx,b.cy,b.cz].map(v=>v.toFixed(2)).join(',');
  CL.motor=-1;for(t=0;t<120;t++)physTick(CLAWSTEP);
  if(process.env.V)console.log('   S',S,'lifted',lifted,'carried',carried,'at home',at,'end',[b.cx,b.cy,b.cz].map(v=>v.toFixed(2)).join(','),'won',b.cy<-.06);
  return {lifted,won:b.cy<-.06};
}
if(MODE==='rate'){
  const Ss=(process.env.S||'0.42,0.7,1').split(',').map(Number),N=+(process.env.N||6);
  const ids=(process.env.T||WILD.join(',')).split(',');
  const tot={};
  for(const id of ids){const row=[];
    for(const S of Ss){let w=0,l=0;for(let k=0;k<N;k++){const r=trial(id,S,rnd(-3,3),rnd(-1.6,1.6),[rnd(-.015,.015),rnd(-.015,.015)]);if(r.won)w++;if(r.lifted)l++;}
      row.push(`S${S}: lifted ${l}/${N} won ${w}/${N}`);tot[S]=(tot[S]||0)+w;}
    console.log(id.padEnd(10),row.join(' | '));}
  console.log('total wins',JSON.stringify(tot),'of',N*ids.length,'each');
}
