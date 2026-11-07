/* =====================================================================================
   2. THE RIVALS — five CPU players, each with a style. A CPU moves a hand the way a person
      does: it has a top speed and an acceleration, it sees the puck a moment late (react)
      and guesses ahead, and its aim wavers (err). It plans each touch:
      - home: back in front of its goal, leaning toward the puck
      - defend: a shot is coming; it reads the bounces and steps into the line
      - attack: the puck is on its side; it gets behind it and strikes, straight or off a rail
      - counter: a slow puck is coming; it meets it and hits it back on the way
      Pure: it reads the physics and writes the mallet's target, like a player's hand would.
   ===================================================================================== */
const RIVALS=[
  {id:'pixel',name:'PIXEL',tag:'ROOKIE',line:'Just learning. Slow hands, soft shots.',col:'#7cff6a',col2:'#1fae46',
   vmax:1.75,amax:8,react:.32,err:.24,pnoise:.11,power:2.3,aggr:.35,bank:.05,depth:.19,wait:.55,wobble:.05,counter:0},
  {id:'blitz',name:'BLITZ',tag:'THE SLAMMER',line:'Hits everything as hard as it can. Leaves the door open.',col:'#ffb020',col2:'#ff5a10',
   vmax:2.7,amax:16,react:.22,err:.15,pnoise:.08,power:4.9,aggr:.95,bank:.12,depth:.34,wait:.12,wobble:.03,counter:.5},
  {id:'brick',name:'BRICK',tag:'THE WALL',line:'Almost impossible to score on. Waits for your mistake.',col:'#4fa8ff',col2:'#2a54d8',
   vmax:3.1,amax:22,react:.15,err:.12,pnoise:.04,power:3.0,aggr:.3,bank:.15,depth:.15,wait:.5,wobble:.015,counter:.15},
  {id:'rico',name:'RICO',tag:'BANK SHOTS',line:'Plays the rails. Watch the angles.',col:'#c27aff',col2:'#7a36e0',
   vmax:3.3,amax:24,react:.13,err:.08,pnoise:.035,power:4.2,aggr:.65,bank:.75,depth:.2,wait:.22,wobble:.012,counter:.4},
  {id:'apex',name:'APEX',tag:'CHAMPION',line:'Fast, sharp, no wasted moves. Beat APEX, own the table.',col:'#ff3a5c',col2:'#c8102e',
   vmax:4.3,amax:34,react:.085,err:.045,pnoise:.018,power:5.3,aggr:.8,bank:.45,depth:.19,wait:.06,wobble:.006,counter:.8}
];
/* the mid-level pair that plays the attract demo */
const DEMO_A=Object.assign({},RIVALS[3],{name:'RICO'}),DEMO_B=Object.assign({},RIVALS[1],{name:'BLITZ'});

function mkAI(pi,rv,seed){
  const s=SIDE[pi];
  return {pi,s,rv,hx:0,hz:s*(TB.HL-rv.depth),hvx:0,hvz:0,mode:'home',mt:0,plan:null,strike:null,hist:[],rnd:mulberry(seed||(pi*7919+13)),
    adapt:0,wob:0,serveT:0,since:0,target:null,lastHitN:0};
}
/* the CPU's view of a puck: a moment old, then guessed forward (good players guess better) */
function aiSee(ai,P,p){
  const rv=ai.rv,h=ai.hist[p.id];if(!h||!h.length)return {x:p.x,z:p.z,vx:p.vx,vz:p.vz,w:p.w,on:p.on};
  const lagN=Math.min(h.length-1,Math.round(rv.react*60)),o=h[h.length-1-lagN],k=rv.react*(.55+.4*(1-rv.err*2));
  return {x:o.x+o.vx*k,z:o.z+o.vz*k,vx:o.vx,vz:o.vz,w:o.w,on:o.on};
}
function aiRecord(ai,P){
  for(const p of P.pucks){let h=ai.hist[p.id];if(!h)h=ai.hist[p.id]=[];h.push({x:p.x,z:p.z,vx:p.vx,vz:p.vz,w:p.w,on:p.on});if(h.length>40)h.shift();}
}
const gauss=r=>{let a=0;for(let i=0;i<4;i++)a+=r();return (a-2)*1.22;};
/* move the hand toward (x,z): it speeds up and slows down like an arm, arriving without overshoot */
function handTo(ai,x,z,dt,vcap){
  const rv=ai.rv,ad=1+ai.adapt;[x,z]=clampMallet(ai.s,x,z);
  const dx=x-ai.hx,dz=z-ai.hz,d=Math.hypot(dx,dz),vm=(vcap||rv.vmax)*ad,am=rv.amax*ad;
  let vdx=0,vdz=0;if(d>1e-4){const v=Math.min(vm,Math.sqrt(2*am*d)*.92);vdx=dx/d*v;vdz=dz/d*v;}
  accel(ai,vdx,vdz,am,dt);
}
function accel(ai,vdx,vdz,am,dt){
  let ex=vdx-ai.hvx,ez=vdz-ai.hvz;const e=Math.hypot(ex,ez),s=am*dt;if(e>s){ex*=s/e;ez*=s/e;}
  ai.hvx+=ex;ai.hvz+=ez;ai.hx+=ai.hvx*dt;ai.hz+=ai.hvz*dt;
  const [cx,cz]=clampMallet(ai.s,ai.hx,ai.hz);if(cx!==ai.hx){ai.hvx=0;ai.hx=cx;}if(cz!==ai.hz){ai.hvz=0;ai.hz=cz;}
}
/* pick the puck that matters most: one on our side, or the one that will get here first */
function aiPick(ai,P){
  let best=null,bs=1e9;
  for(const p of P.pucks){if(!p.on)continue;const lz=ai.s*p.z,lvz=ai.s*p.vz;
    const sc=lz>0?(TB.HL-lz)*.5:(lvz>.05?(-lz)/lvz:5+(-lz));if(sc<bs){bs=sc;best=p;}}
  return best;
}
/* plan a shot from contact point (cx,cz): straight at the goal, or off a side rail */
function aiPlan(ai,cx,cz){
  const rv=ai.rv,r=ai.rnd,gz=-ai.s*(TB.HL+.02);
  let tx=(r()-.5)*TB.GW*.55,bank=r()<rv.bank,wall=0;
  if(bank){wall=Math.abs(cx)>.12?-Math.sign(cx):(r()<.5?-1:1);if(r()<.3)wall=-wall;
    const wx=wall*(TB.HW-TB.RP);tx=2*wx-tx;}            /* aim at the goal's mirror image in the rail */
  let a=Math.atan2(tx-cx,gz-cz)+gauss(r)*rv.err;
  return {dx:Math.sin(a),dz:Math.cos(a),bank,wall,set:0,wait:rv.wait*(.4+r()*.9)};
}
/* is a setup point usable: inside our area and not on the far side of the puck from where we are */
function legalPt(ai,x,z){const [cx,cz]=clampMallet(ai.s,x,z);return Math.hypot(cx-x,cz-z)<.012;}

function aiTick(ai,P,dt){
  const rv=ai.rv,r=ai.rnd,m=P.mal[ai.pi],s=ai.s,HL=TB.HL,R=TB.RP+TB.RM;
  aiRecord(ai,P);ai.mt+=dt;ai.since+=dt;
  ai.wob+=dt*(2.1+r()*.6);
  const home=()=>{const p=aiPick(ai,P);const px=p?aiSee(ai,P,p).x:0;handTo(ai,clamp(px*.38,-.2,.2)+Math.sin(ai.wob)*rv.wobble,s*(HL-rv.depth),dt);};
  /* keep the hand honest: if the mallet was stopped (a pinned puck), the hand stops too */
  if(Math.hypot(m.x-ai.hx,m.z-ai.hz)>.05){ai.hx=m.x;ai.hz=m.z;ai.hvx*=.3;ai.hvz*=.3;}
  const live=aiPick(ai,P);
  if(!live||!P.air){ai.mode='home';ai.strike=null;ai.plan=null;home();return out();}
  const q=aiSee(ai,P,live),lz=s*q.z,lvz=s*q.vz,sp=Math.hypot(q.vx,q.vz);

  /* a strike in progress: drive through the puck along the planned line */
  if(ai.strike){const k=ai.strike;k.t+=dt;
    if(k.t<0){handTo(ai,k.cx-k.dx*(R+.03),k.cz-k.dz*(R+.03),dt,rv.vmax*1.1);return out();}   /* a counter waits for the puck */
    const past=(ai.hx-k.cx)*k.dx+(ai.hz-k.cz)*k.dz;
    if(k.t>.32||past>.13||live.last===ai.pi&&P.hits!==ai.lastHitN&&k.t>.03){ai.strike=null;ai.plan=null;ai.mode='recover';ai.mt=0;ai.lastHitN=P.hits;}
    else{const v=rv.power*(1+ai.adapt*.6);accel(ai,k.dx*v,k.dz*v,rv.amax*2.2,dt);return out();}
  }
  if(ai.mode==='recover'&&ai.mt<.18){home();return out();}

  const own=lz>-.02;
  if(own){
    const coming=lvz>.6;
    /* defend a puck that's already past us and still moving our way: get between it and the goal */
    if(coming&&s*ai.hz<lz+.02&&lvz>1.0){ai.mode='defend';
      const pr=predictCross(q,s,HL-.08,1.2),gx=pr?clamp(pr.x,-TB.GW/2-.02,TB.GW/2+.02):0;
      handTo(ai,gx*.8,s*(HL-.09),dt,rv.vmax*1.15);return out();}
    if(sp>2.6&&lvz>-.2){ai.mode='defend';return defend(q);}
    /* attack: settle the plan, get behind the puck, wait a beat, strike */
    ai.mode='attack';
    const lead=Math.min(.22,sp*.06),c=predictAt(q,lead),cx=c.x,cz=c.z;
    if(!ai.plan||ai.mt>3.2){ai.plan=aiPlan(ai,cx,cz);ai.mt=0;}
    let pl=ai.plan,dx=pl.dx,dz=pl.dz;
    let sx=cx-dx*(R+.055),sz=cz-dz*(R+.055);
    if(!legalPt(ai,sx,sz)){
      /* can't get behind it (it's against our end rail, or in a corner): swing the line round until we can */
      let ok=false;for(const da of [.35,-.35,.7,-.7,1.05,-1.05,1.4,-1.4]){
        const a=Math.atan2(dx,dz)+da*(cx>0?1:-1),ex=Math.sin(a),ez=Math.cos(a),qx=cx-ex*(R+.04),qz=cz-ez*(R+.04);
        if(legalPt(ai,qx,qz)&&s*ez<.35){dx=ex;dz=ez;sx=qx;sz=qz;ok=true;break;}}
      if(!ok){dx=-Math.sign(cx||1)*.7;dz=-s*.7;sx=cx-dx*R;sz=cz-dz*R;}
    }
    /* on the wrong side of the puck? go round it, not through it */
    const ahead=(ai.hx-cx)*dx+(ai.hz-cz)*dz;
    if(ahead>-R*.6){const side=((ai.hx-cx)*-dz+(ai.hz-cz)*dx)>=0?1:-1,px=-dz*side,pz=dx*side;
      handTo(ai,cx+px*(R+.06)-dx*R*.95,cz+pz*(R+.06)-dz*R*.95,dt);return out();}
    ai.atk=(ai.atk||0)+dt;
    if(ai.atk>2.4){ai.atk=0;const ex=cx-ai.hx,ez=cz-ai.hz,el=Math.hypot(ex,ez)||1;ai.strike={dx:ex/el,dz:ez/el,cx,cz,t:0};ai.lastHitN=P.hits;return out();}  /* stuck setting up: just hit it */
    const dd=Math.hypot(sx-ai.hx,sz-ai.hz);
    if(dd>.03||sp>1.4){handTo(ai,sx,sz,dt);pl.set=0;return out();}
    pl.set+=dt;if(pl.set<pl.wait){handTo(ai,sx,sz,dt);return out();}
    ai.strike={dx,dz,cx,cz,t:0};ai.lastHitN=P.hits;ai.atk=0;return out();
  }
  /* the puck is over there */
  ai.atk=0;
  if(lvz>.15){ai.mode='defend';return defend(q);}
  ai.mode='home';ai.plan=null;home();return out();

  function defend(q){
    const pr=predictCross(q,s,HL-rv.depth,1.6+rv.react);
    if(!pr){home();return out();}
    /* stand between the puck's arrival point and the middle of the goal, a little toward the goal */
    let tx=pr.x*.78+gauss(r)*rv.pnoise*.35*(ai.mt<.05?1:0);
    if(!ai.target||ai.mt>.25){ai.target={x:tx+gauss(r)*rv.pnoise,t:0};ai.mt=0;}
    tx=lerp(ai.target.x,tx,.5);
    /* a slow puck, and time to spare: meet it and hit it back (counter) */
    const spd=Math.hypot(pr.vx,pr.vz);
    if(rv.counter>0&&spd<2.4&&pr.t>.16&&ai.rnd()<rv.counter*dt*12){
      const c=predictAt(q,Math.max(0,pr.t-.08));const dx=-pr.x*.25,dz=-s,l=Math.hypot(dx,dz);
      ai.strike={dx:dx/l,dz:dz/l,cx:c.x,cz:c.z,t:-Math.max(.04,pr.t-.14)};ai.lastHitN=P.hits;ai.mode='counter';
      handTo(ai,c.x+dx/l*-(R+.03),c.z+dz/l*-(R+.03),dt);return out();}
    handTo(ai,clamp(tx,-TB.HW+TB.RM,TB.HW-TB.RM),s*(HL-rv.depth),dt,rv.vmax*1.1);return out();
  }
  function out(){malletAim(m,ai.hx,ai.hz,dt);}
}
/* adaptive edge: a CPU that is far ahead eases off a little; one that is behind digs in */
function aiAdapt(ai,mine,theirs){ai.adapt=clamp((theirs-mine)*.025,-.1,.06);}
