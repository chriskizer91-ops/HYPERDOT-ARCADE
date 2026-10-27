/* =====================================================================================
   THE SHIFTLIGHT ENGINE LAB, IN THE GAME. The two blocks below (the synth, makeDSP, and the
   engine catalogue, SIM) are copied unchanged from the Shiftlight Engine Lab, so an engine sounds
   the same here as it does in the Lab. To pick up a newer Lab, paste its two blocks over these.
   Under them is the host that plays them in the game (HDL).
   ===================================================================================== */
/* ---- src/audio/engine-dsp.js ---- */
/* =====================================================================================
   SHIFTLIGHT ENGINE SYNTH — live, sample by sample.
   Every cylinder fires on its own crank angle, in its real firing order, into its own bank
   of pipe. The pipes are 1-D acoustic waveguides (Kelly-Lochbaum scattering at every change
   of bore, lossy where there is packing, a closed-ish valve at one end and an open radiating
   tip at the other), run live rather than baked into an impulse response. On top: flow rasp
   gated by each pulse, induction through its own airbox model, afterfire and bangs fired
   into the pipes, turbo/supercharger/gear whine, blow-off, nitrous, the starter, and a
   listener with real propagation delay (so Doppler falls out of a moving source).

   makeDSP() returns the EngineDSP class. Its source is stringified into an AudioWorklet
   module, so everything it needs is declared inside this function.
   ===================================================================================== */
function makeDSP(){
'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const C_GAS=500;   /* speed of sound in hot exhaust gas, m/s */
const C_AIR=343;   /* and in the air between the car and you */
const ftanh=x=>{if(x>3)return 1;if(x<-3)return -1;const x2=x*x;return x*(27+x2)/(27+9*x2);};
const LP=0,HP=1,BP=2;

class Biquad{
  constructor(){this.b0=1;this.b1=0;this.b2=0;this.a1=0;this.a2=0;this.z1=0;this.z2=0;}
  set(type,f,q,sr){
    const w=TAU*clamp(f,8,sr*.47)/sr,cw=Math.cos(w),al=Math.sin(w)/(2*q),a0=1+al;let b0,b1,b2;
    if(type===LP){b0=(1-cw)/2;b1=1-cw;b2=b0;}else if(type===HP){b0=(1+cw)/2;b1=-(1+cw);b2=b0;}else{b0=al;b1=0;b2=-al;}
    this.b0=b0/a0;this.b1=b1/a0;this.b2=b2/a0;this.a1=-2*cw/a0;this.a2=(1-al)/a0;return this;
  }
  tick(x){const y=this.b0*x+this.z1;this.z1=this.b1*x-this.a1*y+this.z2;this.z2=this.b2*x-this.a2*y;return y;}
  reset(){this.z1=this.z2=0;}
}

/* 1-D acoustic waveguide. sec = [[length m, bore m, packing 0..1], ...] from the valve outward.
   Each section is a pair of delay lines; at every change of bore a Kelly-Lochbaum junction
   splits the waves with k=(A1-A2)/(A1+A2). Packing is a lowpass and a loss per pass. The valve
   end reflects (rPort); the open tip reflects inverted and duller (rEnd) and radiates the flow
   it lets out through a leaky differentiator, the way a pipe's far field behaves. */
class Waveguide{
  constructor(sec,sr,rPort=.7,rEnd=-.8){
    const n=sec.length;this.n=n;this.rPort=rPort;this.rEnd=rEnd;
    this.m=new Int32Array(n);this.a=new Float64Array(n);this.g=new Float64Array(n);this.K=new Float64Array(n);this.p=new Int32Array(n);
    this.yr=new Float64Array(n);this.yl=new Float64Array(n);this.ar=new Float64Array(n);this.al=new Float64Array(n);this.nr=new Float64Array(n);this.nl=new Float64Array(n);
    this.R=[];this.L=[];
    for(let i=0;i<n;i++){const [l,,pk]=sec[i];this.m[i]=Math.max(2,Math.round(l/C_GAS*sr));this.a[i]=Math.min(.75,1-Math.min(.9,.6*pk));this.g[i]=.985-.08*pk;
      this.R.push(new Float64Array(this.m[i]));this.L.push(new Float64Array(this.m[i]));}
    for(let i=0;i<n-1;i++){const A1=sec[i][1]*sec[i][1],A2=sec[i+1][1]*sec[i+1][1];this.K[i]=(A1-A2)/(A1+A2);}
    this.tip=0;this.u1=0;this.dn=1e-20;
  }
  tick(x){
    const n=this.n,a=this.a,g=this.g,ar=this.ar,al=this.al,nr=this.nr,nl=this.nl,R=this.R,L=this.L,p=this.p,yr=this.yr,yl=this.yl,K=this.K,m=this.m;
    for(let i=0;i<n;i++){const q=p[i];yr[i]+=a[i]*(R[i][q]-yr[i]);ar[i]=yr[i]*g[i];yl[i]+=a[i]*(L[i][q]-yl[i]);al[i]=yl[i]*g[i];}
    this.dn=-this.dn;nr[0]=this.rPort*al[0]+x+this.dn;
    for(let i=0;i<n-1;i++){const k=K[i];nr[i+1]=(1+k)*ar[i]-k*al[i+1];nl[i]=k*ar[i]+(1-k)*al[i+1];}
    this.tip+=.5*(ar[n-1]-this.tip);const back=this.rEnd*this.tip,u=ar[n-1]-back;nl[n-1]=back;const out=u-.6*this.u1;this.u1=u;
    for(let i=0;i<n;i++){const q=p[i];R[i][q]=nr[i];L[i][q]=nl[i];p[i]=q+1>=m[i]?0:q+1;}
    return out;
  }
}
function irOf(sec,sr,rp,re){const w=new Waveguide(sec,sr,rp,re),n=Math.round(.15*sr),o=new Float64Array(n);for(let t=0;t<n;t++)o[t]=w.tick(t===0?1:0);return o;}
/* peak tailpipe response to one standard blowdown pulse: every system is levelled by it */
function pulsePeak(ir,sr){
  const n=Math.round(.005*sr),P=new Float64Array(n);for(let q=0;q<n;q++){const t=q/sr*1.5;P[q]=(1-Math.exp(-t/1e-4))*Math.exp(-t/1.5e-3);}
  const M=Math.min(ir.length,Math.round(.04*sr));let pk=1e-6;
  for(let t=0;t<M;t++){let s=0;for(let q=0;q<n&&q<=t;q++)s+=P[q]*ir[t-q];if(Math.abs(s)>pk)pk=Math.abs(s);}
  return pk;
}
/* plumbing per exhaust level: [length m, bore m, packing], valve to tip */
const PIPES=[
  [[.34,.036,.05],[.26,.05,.05],[.26,.1,.35],[1.05,.048,.05],[.34,.09,.4],[.85,.048,.05],[.42,.11,.55],[.3,.045,.05]], /* stock: manifold, cat, resonator, packed muffler */
  [[.34,.036,.05],[.26,.05,.05],[.26,.1,.35],[1.3,.056,.04],[.42,.09,.28],[.34,.058,.04]],                         /* cat-back: bigger pipe, straight-through box */
  [[.74,.04,.04],[.3,.06,.04],[.22,.085,.18],[1.3,.062,.03],[.34,.09,.2],[.3,.063,.03]],                            /* long-tube headers, high-flow cat */
  [[.78,.042,.03],[.3,.064,.03],[1.9,.068,.02],[.22,.076,.02]],                                                    /* straight pipe */
  [[.62,.042,.02],[.2,.056,.02]]];                                                                                 /* open headers: dump at the collector */
const INTAKES=[
  [[.22,.04,.03],[.32,.13,.35],[.06,.06,.05],[.45,.07,.08],[.3,.2,.6],[.22,.06,.1]],  /* airbox */
  [[.22,.04,.03],[.32,.13,.3],[.06,.065,.04],[.55,.075,.05],[.12,.12,.25]],          /* cold air: long pipe, cone filter */
  [[.22,.04,.03],[.32,.13,.25],[.06,.07,.03],[.35,.09,.05],[.2,.16,.2],[.25,.1,.05]], /* ram air */
  [[.2,.044,.02],[.08,.052,.02]]];                                                   /* individual throttles: just trumpets */
const EXK={ex:[.5,.66,.82,1,1.1],drive:[.55,.65,.8,1,1.12],bright:[.55,.75,.9,1.15,1.3],rasp:[.05,.09,.15,.24,.3],pop:[.25,.45,.7,1,1.15],crk:[.35,.6,1,1.35,1.6]};
const INK=[.22,.3,.38,.75];
function pipeGeom(c,bank){
  const lv=c.ex|0,bore=Math.pow(c.disp/2,.33),P=PIPES[lv].map(s=>s.slice());
  /* tuned primaries get shorter as the engine revs higher */
  P[0][0]*=clamp(Math.pow(7000/c.redline,.7),.5,1.25);
  /* the second bank's primaries are longer: equal-length headers tidy that up, a boxer keeps its rumble */
  if(bank){P[0][0]+=c.split*(lv>=2&&!c.rumble?.4:1);if(c.dual)P[Math.min(3,P.length-1)][0]+=.16;}
  if(c.turbo)P.splice(2,0,[.1,.032,.5]); /* the turbine: a lossy throat that swallows the crackle */
  for(const s of P)s[1]*=bore;
  return P;
}
function intakeGeom(c){const bore=Math.pow(c.disp/2,.25);return INTAKES[c.intake|0].map(s=>[s[0]*clamp(Math.pow(7000/c.redline,.5),.6,1.2),s[1]*bore,s[2]]);}
const hermite=(y0,y1,y2,y3,f)=>{const c1=.5*(y2-y0),c2=y0-2.5*y1+2*y2-.5*y3,c3=.5*(y3-y0)+1.5*(y1-y2);return ((c3*f+c2)*f+c1)*f+y1;};

class EngineDSP{
  constructor(sr){
    this.sr=sr;this.t=0;this.cfg=null;this.pend=null;
    this.p={on:0,firing:0,crank:0,crankT:0,rpm:0,load:0,cutFrac:0,boost:0,nos:0,speed:0,gear:0,twostep:0,antilag:0,view:0,dist:3,pan:0,rear:1,vol:1};
    this.rpm=0;this.load=0;this.ph=0;this.ei=0;this.idleW=1;this.kOn=0;this.und=.3;this.pl=0;this.crk=0;
    this.bs=[{e1:0,e2:0,u1:0,u2:0,env:0},{e1:0,e2:0,u1:0,u2:0,env:0}];
    this.bg=[{a1:0,a2:0,an:0,d1:0,d2:0,dn:0},{a1:0,a2:0,an:0,d1:0,d2:0,dn:0}];
    this.dc={d1:0,d2:0,d3:0,d4:0,de:0};
    this.pq=[];this.vox=[];
    const B=()=>new Biquad();
    this.f={rasp:B().set(BP,2400,.55,sr),roar:B(),rush:B(),sup:B(),nos:B().set(BP,3800,1.2,sr),start:B().set(LP,900,1.4,sr),
      hpL:B().set(HP,28,.7,sr),hpR:B().set(HP,28,.7,sr),lpL:B(),lpR:B(),lpI:B(),lpI2:B()};
    this.g={og:0,exG:0,inG:0,drive:1,post:1,rasp:0,roar:0,tw:0,rush:0,sup:0,gw:0,nos:0,st:0,fade:0,pan:0,gd:1};
    this.T={};for(const k in this.g)this.T[k]=this.g[k];
    this.ph1=0;this.ph2=0;this.ph3=0;this.phS=0;this.phG=0;this.phSt=0;this.phAm=0;
    this.xd={n:64,a:new Float64Array(64),b:new Float64Array(64),w:0,d:6,x:.9};
    this.dn=1<<15;this.dlL=new Float64Array(this.dn);this.dlR=new Float64Array(this.dn);this.dw=0;this.dS=3;this.airL=0;this.airR=0;this.aa=1;
    this.stats={pops:0,fires:0};
    this.ks=1-Math.exp(-1/(.012*sr));       /* per-sample smoothing for gains, ~12 ms */
    this.kd=1-Math.exp(-1/(.06*sr));        /* listener distance, ~60 ms */
  }
  /* ---------- control from the main thread ---------- */
  configure(c){
    if(!this.cfg){this._apply(c,false);this.g.fade=0;this.T.fade=1;return;}
    const geo=k=>JSON.stringify([k.layout,k.ex,k.intake,k.disp,k.redline,!!k.turbo,k.split,k.dual,k.rumble]);
    if(geo(c)!==geo(this.cfg)){this.pend=c;this.T.fade=0;}else this._apply(c,true);
  }
  set(p){this.p=p;if(p.jump)this.dS=p.dist;}
  event(e){
    const T=this.t,sr=this.sr;
    if(e.type==='bov'){
      const k=clamp((this.p.boost||0)/.9,.35,1.3);
      if(e.flutter){for(let i=0;i<10;i++)this._vox(T+(.015+i*.036*(1+i*.07))*sr,.026,.3*k*Math.pow(.82,i),1500-i*50,1100-i*40,BP,2.4);this._vox(T,.18,.16*k,700,300,LP,.7);}
      else{this._vox(T,.42,.26*k,5200,1400,BP,.9);this._vox(T,.12,.12*k,9000,6000,HP,.7);}
    }else if(e.type==='pop')this._bang(Math.random()<.5?0:1,e.k||.8);
    else if(e.type==='shift'){if(this.cfg&&this.cfg.ex>=1)this._bang(Math.random()<.5?0:1,.5);}
    else if(e.type==='purge'){this._vox(T,1.1,.32,7000,3000,HP,.7);this._vox(T,.9,.2,2600,900,BP,.8);}
  }
  takeStats(){const s=this.stats;if(!s.pops&&!s.fires)return null;this.stats={pops:0,fires:0};return s;}
  _apply(c,soft){
    const prev=this.cfg;this.cfg=c;const lv=c.ex|0,tb=!!c.turbo,ch=c.ch;
    this.k={ex:EXK.ex[lv],drive:EXK.drive[lv],bright:EXK.bright[lv]*(tb?.82:1)*ch.bright,rasp:EXK.rasp[lv]*(tb?.6:1)*ch.rasp,pop:EXK.pop[lv],
      inl:INK[c.intake|0],crackle:c.crackle*EXK.crk[lv]*(tb?.75:1),whine:c.gearWhine?1:.15,gain:c.gain||1};
    if(soft&&prev&&prev.layout===c.layout)return;
    const sr=this.sr;
    this.wgA=new Waveguide(pipeGeom(c,0),sr);this.wgB=new Waveguide(pipeGeom(c,1),sr);this.wgI=new Waveguide(intakeGeom(c),sr,.8,-.85);
    this.gEx=1/pulsePeak(irOf(pipeGeom(c,0),sr),sr);this.gIn=1/pulsePeak(irOf(intakeGeom(c),sr,.8,-.85),sr);
    /* twin pipes sit apart; a single tip is close to mono */
    this.xd.d=Math.round((c.dual?3.5e-4:1.2e-4)*sr);this.xd.x=c.dual?.5:.92;this.xd.a.fill(0);this.xd.b.fill(0);
    for(const b of this.bs){b.e1=b.e2=b.u1=b.u2=b.env=0;}for(const b of this.bg){b.a1=b.a2=b.an=0;}
    for(const k of ['hpL','hpR','lpL','lpR','lpI','lpI2'])this.f[k].reset();
    this.ei=c.ang.findIndex(a=>a>this.ph);if(this.ei<0)this.ei=c.ang.length;
  }
  /* noise voice: an enveloped, swept, filtered noise burst (blow-off, flutter, purge) */
  _vox(t0,dur,vol,f0,f1,type,q){
    if(this.vox.length>40)this.vox.shift();const sr=this.sr,N=Math.max(8,Math.round(dur*sr)),att=Math.round(.004*sr);
    this.vox.push({t0:Math.round(t0),N,att,e:1e-4,mA:Math.pow(vol/1e-4,1/att),mD:Math.pow(1e-4/vol,1/Math.max(1,N-att)),f0,f1,type,q,bq:new Biquad().set(type,f0,q,sr)});
  }
  /* a bang in the pipe: a hard pressure spike with a ragged tail, sometimes a double or a triple */
  _bang(b,k,extra=true){
    const s=this.bg[b],sr=this.sr,rate=.75+.5*Math.random(),tr=4e-5/rate,td=5e-4/rate,A=k*this.k.pop*1.6;
    s.d1=Math.exp(-1/(td*sr));s.d2=Math.exp(-1/(1/(1/tr+1/td)*sr));s.dn=Math.exp(-1/(6e-3/rate*sr));
    s.a1+=A;s.a2+=A;s.an+=A;this.stats.pops++;
    if(extra){const r=Math.random();if(r<.4)this._sched(this.t+(.005+Math.random()*.022)*sr,b,k*(.35+.5*Math.random()),0);if(r<.15)this._sched(this.t+(.02+Math.random()*.03)*sr,b,k*(.3+.4*Math.random()),0);}
  }
  _sched(at,b,k,kind){if(this.pq.length>64)return;const e={at:Math.round(at),b,k,kind};let i=this.pq.length;while(i>0&&this.pq[i-1].at>e.at)i--;this.pq.splice(i,0,e);}
  _burst(expect,k,n){let c=Math.floor(expect)+(Math.random()<expect%1?1:0);while(c-->0)this._sched(this.t+Math.random()*n,Math.random()<.5?0:1,k,0);}
  /* one cylinder's exhaust valve cracks open */
  _fire(i){
    const c=this.cfg,p=this.p,b=c.bank[i],base=c.amp[i],R=Math.random,s=this.bs[b];let A;
    this.stats.fires++;
    if(!p.firing||R()<p.cutFrac){
      /* no combustion: the piston still pumps air, and unburnt fuel can light off in the pipe */
      A=base*.1*(.8+.4*R());
      if(p.firing&&R()<.1*this.k.crackle+(p.twostep||p.antilag?.12:0))this._sched(this.t+(.0012+R()*.004)*this.sr,b,.5+.6*R(),0);
    }else{
      const r1=R(),sc=c.ch.scatter,kOn=this.kOn;
      const on=base*(1-sc*.5+sc*r1)*(1+.5*Math.min(p.boost||0,2.5)+(p.nos?.35:0));
      const off=base*(.32+.55*r1*r1)*(.7+.3*Math.min(1,this.rpm/this.cfg.redline*1.5));
      A=off+(on-off)*kOn;
      /* lumpy cams (and rotaries) idle unevenly: weak cycles, the odd near-misfire */
      const lope=c.lope*this.idleW;if(lope>0){A*=1+lope*(R()-.5)*5;if(R()<lope*1.6)A*=.2;}
      /* on overrun, now and then the thin charge lights off late in the header: the burble */
      if(kOn<.5&&R()<(.02+.08*this.k.crackle)*(1-kOn*2))this._sched(this.t+(.0014+R()*.003)*this.sr,b,(.45+.6*R())*.35,1);
    }
    const u=this.und;s.e1+=A;s.e2+=A;s.u1+=A*u;s.u2+=A*u;s.env+=A;
  }
  process(L,R,n){for(let o=0;o<n;o+=128)this._block(L,R,o,Math.min(128,n-o));}
  _block(OL,OR,o,n){
    if(!this.cfg){for(let i=0;i<n;i++){OL[o+i]=0;OR[o+i]=0;}this.t+=n;return;}
    /* a new engine waits until the old one has faded out, then swaps in at a block boundary */
    if(this.pend&&this.g.fade<.002){this._apply(this.pend,false);this.pend=null;this.T.fade=1;}
    const c=this.cfg,p=this.p,sr=this.sr,bt=n/sr,T=this.T,g=this.g,f=this.f,k=this.k;
    /* ---- block-rate state ---- */
    const r0=this.rpm,rT=p.on||p.crank?Math.max(0,p.rpm):0;this.rpm+=(rT-this.rpm)*(1-Math.exp(-bt/.01));const r1=this.rpm;
    const cut=p.cutFrac>.5;this.load+=((p.load||0)-this.load)*(1-Math.exp(-bt/(cut?.003:.02)));
    const L=this.load,rpm=Math.max(r1,1),x=rpm/c.redline;
    this.idleW=1-clamp((rpm-c.idle)/(c.idle*.7),0,1);
    this.kOn=p.firing?Math.max(Math.pow(L,.6),this.idleW*.55):0;const kOn=this.kOn,lw=Math.max(L,this.idleW*.3,p.firing?.3*Math.min(1,x):0);
    /* pulse shape: crank-angle-ish at idle, tighter with revs */
    const ts=clamp(Math.pow(3000/Math.max(rpm,250),.6),.26,2.8),tr=lerp(.22e-3,.1e-3,kOn)*ts*c.ch.tr,td=lerp(1.1e-3,1.5e-3,kOn)*ts*c.ch.td,td3=2.7*td;
    const dc=this.dc;dc.d1=Math.exp(-1/(td*sr));dc.d2=Math.exp(-1/(sr/(1/tr+1/td)));dc.d3=Math.exp(-1/(td3*sr));dc.d4=Math.exp(-1/(sr/(1/td+1/td3)));dc.de=Math.exp(-1/(2e-3*ts*sr));
    this.und=lerp(.16,.3,kOn);
    const view=p.view|0,cab=view===1,rear=p.rear===undefined?1:p.rear,vol=p.vol===undefined?1:p.vol;
    T.drive=k.drive*(.5+.9*lw*Math.min(1,x*1.2))*(1+.25*Math.min(p.boost||0,2));T.post=1/(.6+.5*k.drive);
    f.lpL.set(LP,clamp((700+(1800+7000*lw)*x)*k.bright*(cab?.45:1)*(.75+.35*rear),250,17000),.6,sr);f.lpR.b0=f.lpL.b0;f.lpR.b1=f.lpL.b1;f.lpR.b2=f.lpL.b2;f.lpR.a1=f.lpL.a1;f.lpR.a2=f.lpL.a2;
    T.exG=k.ex*(cab?.6:1)*(.75+.35*rear);
    T.rasp=k.rasp*lw*Math.min(1.2,x*x*1.4);
    T.inG=k.inl*(.12+.88*L)*(.35+.65*x)*(cab?2:1)*(.7+.5*(1-rear));
    f.lpI.set(LP,3500,.5,sr);f.lpI2.set(LP,3500*(cab?.7:1),.5,sr);
    T.roar=k.inl*.09*L*x*(cab?1.6:1);f.roar.set(BP,380+rpm*.12,.8,sr);
    /* forced induction and gears */
    const b=c.fiBoost>0?clamp((p.boost||0)/Math.max(.3,c.fiBoost),0,1.3):0;
    this.fw=900+b*4200+rpm*.05;
    T.tw=c.turbo?b*b*.04*(.35+.65*L):0;T.rush=c.turbo?b*.04*L+(p.antilag?b*.02:0):0;f.rush.set(BP,1300+b*2400,1.1,sr);
    if(c.sup==='roots'){this.fs=rpm*.13;f.sup.set(BP,rpm*.26,1.1,sr);T.sup=.07*Math.pow(clamp(x,0,1.1),1.2)*(.45+.55*L);}
    else if(c.sup==='screw'){this.fs=rpm*.24;f.sup.set(BP,rpm*.245,2.5,sr);T.sup=.055*Math.pow(clamp(x,0,1.1),1.3)*(.45+.55*L);}
    else if(c.sup==='cent'){this.fs=700+5200*x*x;T.sup=.05*x*x*(.3+.7*L);}
    else T.sup=0;
    this.fg=rpm/60*23;T.gw=k.whine*.026*clamp((p.speed||0)/30,0,1)*(.4+.6*L)*(cab?1.8:1);
    T.nos=p.nos?.06:0;
    T.st=p.crank?.5:0;this.fSt=90+60*Math.min(1,(p.crankT||0)/.8);this.fAm=6+6*Math.min(1,(p.crankT||0)/.8);
    T.og=.42*vol*(.32+.22*L+.75*Math.pow(Math.min(1.05,x),1.4))*k.gain*(p.on||p.crank?1:0)+(p.crank?.25:0);
    /* the listener: distance, air, pan */
    const dT=Math.max(.5,p.dist||3);this.aa=1-Math.exp(-TAU*clamp(21000/(1+this.dS/28),900,20000)/sr);
    T.pan=clamp(p.pan||0,-1,1);T.gd=clamp(3/Math.max(this.dS,.6),0,2.4)*(view===2?1.5:1);
    const width=clamp(5/Math.max(this.dS,1),.15,1);
    /* events fired into the pipes */
    if(this.pl>.5&&L<.15&&x>.45&&k.crackle>0)this.crk=Math.max(this.crk,.25+Math.random()*.5*k.crackle);
    this.pl=L;
    if(L<.2&&this.crk>0){this.crk-=bt;this._burst((5+9*k.crackle)*clamp(x*1.3,0,1.2)*(this.crk>.15?1:.45)*bt,.3+.5*Math.random(),n);}else if(L>.3)this.crk=0;
    if(p.antilag&&L<.2&&x>.3)this._burst(14*bt,.8+.4*Math.random(),n);
    if(p.twostep)this._burst(11*bt,.7+.3*Math.random(),n);
    /* ---- per sample ---- */
    const ang=c.ang,nE=ang.length,A=this.bs[0],B=this.bs[1],GA=this.bg[0],GB=this.bg[1],ks=this.ks,kd=this.kd,xd=this.xd,dl=this.dlL,dr=this.dlR,dn=this.dn,dm=dn-1;
    const gEx=this.gEx,gIn=this.gIn,ftw=this.fw/sr,fsu=(this.fs||0)/sr,fgw=this.fg/sr,fst=this.fSt/sr,fam=this.fAm/sr;
    const twin=!!c.twin,cent=c.sup==='cent',d1=dc.d1,d2=dc.d2,d3=dc.d3,d4=dc.d4,de=dc.de;
    for(let i=0;i<n;i++){
      g.og+=(T.og-g.og)*ks;g.exG+=(T.exG-g.exG)*ks;g.inG+=(T.inG-g.inG)*ks;g.drive+=(T.drive-g.drive)*ks;g.post+=(T.post-g.post)*ks;
      g.rasp+=(T.rasp-g.rasp)*ks;g.roar+=(T.roar-g.roar)*ks;g.tw+=(T.tw-g.tw)*ks;g.rush+=(T.rush-g.rush)*ks;g.sup+=(T.sup-g.sup)*ks;
      g.gw+=(T.gw-g.gw)*ks;g.nos+=(T.nos-g.nos)*ks;g.st+=(T.st-g.st)*ks;g.fade+=(T.fade-g.fade)*ks*1.5;g.pan+=(T.pan-g.pan)*ks*.25;g.gd+=(T.gd-g.gd)*ks*.25;
      const rpmI=r0+(r1-r0)*(i/n);
      if(rpmI>25&&(p.on||p.crank)){
        this.ph+=rpmI*6/sr;
        while(this.ei<nE&&this.ph>=ang[this.ei])this._fire(this.ei++);
        if(this.ph>=720){this.ph-=720;this.ei=0;while(this.ei<nE&&this.ph>=ang[this.ei])this._fire(this.ei++);}
      }
      while(this.pq.length&&this.pq[0].at<=this.t){const e=this.pq.shift();if(e.kind===1){const s=this.bg[e.b],sr2=sr;s.d1=Math.exp(-1/(6e-4*sr2));s.d2=Math.exp(-1/(sr2/(1/6e-5+1/6e-4)));s.dn=Math.exp(-1/(1.5e-3*sr2));s.a1+=e.k;s.a2+=e.k;s.an+=e.k*.5;}else this._bang(e.b,e.k,true);}
      this.t++;
      const w=Math.random()*2-1,w2=Math.random()*2-1;
      /* blowdown pulses: a fast rise, a decay, and the rarefaction behind it */
      const pa=A.e1-A.e2-(A.u1-A.u2),pb=B.e1-B.e2-(B.u1-B.u2);
      A.e1*=d1;A.e2*=d2;A.u1*=d3;A.u2*=d4;A.env*=de;B.e1*=d1;B.e2*=d2;B.u1*=d3;B.u2*=d4;B.env*=de;
      const ba=2.4*(GA.a1-GA.a2)+.32*GA.an*w,bb=2.4*(GB.a1-GB.a2)+.32*GB.an*w2;
      GA.a1*=GA.d1;GA.a2*=GA.d2;GA.an*=GA.dn;GB.a1*=GB.d1;GB.a2*=GB.d2;GB.an*=GB.dn;
      const rn=f.rasp.tick(w);
      const xa=this.wgA.tick(pa+rn*A.env*g.rasp+ba)*gEx,xb=this.wgB.tick(pb+rn*B.env*g.rasp+bb)*gEx;
      xd.a[xd.w]=xa;xd.b[xd.w]=xb;const ri=(xd.w-xd.d+xd.n)%xd.n,da=xd.a[ri],db=xd.b[ri];xd.w=(xd.w+1)%xd.n;
      /* saturation that grows with load, asymmetric so it adds even harmonics */
      let l=xa+db*xd.x,r=da*xd.x+xb;
      l=clamp(l*g.drive,-1,1);r=clamp(r*g.drive,-1,1);
      l=ftanh(1.5*(l+.16*l*l))*1.07*g.post;r=ftanh(1.5*(r+.16*r*r))*1.07*g.post;
      l=f.lpL.tick(f.hpL.tick(l))*g.exG;r=f.lpR.tick(f.hpR.tick(r))*g.exG;
      /* induction: the same pulses through the airbox and runners, plus a pulse-locked roar */
      let m=f.lpI2.tick(f.lpI.tick(this.wgI.tick(pa+pb)*gIn))*g.inG+f.roar.tick(w2)*(A.env+B.env)*g.roar+(ba+bb)*k.pop*.08;
      if(c.turbo){this.ph1+=ftw;if(this.ph1>1)this.ph1-=1;this.ph2+=ftw*1.51;if(this.ph2>1)this.ph2-=1;
        let tw=Math.sin(TAU*this.ph1)+.35*Math.sin(TAU*this.ph2);if(twin){this.ph3+=ftw*1.034;if(this.ph3>1)this.ph3-=1;tw+=.8*Math.sin(TAU*this.ph3);}
        m+=tw*g.tw+f.rush.tick(w)*g.rush;}
      if(g.sup>1e-5){this.phS+=fsu;if(this.phS>1)this.phS-=1;m+=(cent?Math.sin(TAU*this.phS)+.3*Math.sin(2*TAU*this.phS):f.sup.tick(2*this.phS-1)*3)*g.sup;}
      if(g.gw>1e-5){this.phG+=fgw;if(this.phG>1)this.phG-=1;m+=(4*Math.abs(this.phG-.5)-1)*g.gw;}
      if(g.nos>1e-5)m+=f.nos.tick(w2)*g.nos*3;
      if(g.st>1e-4){this.phSt+=fst;if(this.phSt>1)this.phSt-=1;this.phAm+=fam;if(this.phAm>1)this.phAm-=1;m+=f.start.tick(2*this.phSt-1)*(.55+.45*(this.phAm<.5?1:-1))*g.st;}
      for(let v=this.vox.length-1;v>=0;v--){const o2=this.vox[v],age=this.t-o2.t0;if(age<0)continue;if(age>=o2.N){this.vox.splice(v,1);continue;}
        if((age&31)===0)o2.bq.set(o2.type,o2.f0*Math.pow(o2.f1/o2.f0,age/o2.N),o2.q,sr);o2.e*=age<o2.att?o2.mA:o2.mD;m+=o2.bq.tick(Math.random()*2-1)*o2.e*3;}
      l=(l+m)*g.og*g.fade;r=(r+m)*g.og*g.fade;
      /* the listener: propagation delay (Doppler falls out of it), air absorption, distance, pan */
      this.dS+=(dT-this.dS)*kd;
      dl[this.dw]=l;dr[this.dw]=r;
      const dly=Math.min(dn-4,this.dS/C_AIR*sr+1),ip=Math.floor(dly),fr=dly-ip,j=this.dw-ip;
      const j0=(j+1)&dm,j1=j&dm,j2=(j-1)&dm,j3=(j-2)&dm;
      l=hermite(dl[j0],dl[j1],dl[j2],dl[j3],fr);r=hermite(dr[j0],dr[j1],dr[j2],dr[j3],fr);
      this.dw=(this.dw+1)&dm;
      this.airL+=this.aa*(l-this.airL);this.airR+=this.aa*(r-this.airR);
      const mid=(this.airL+this.airR)*.5,side=(this.airL-this.airR)*.5*width,th=(g.pan+1)*Math.PI/4;
      l=(mid+side)*Math.cos(th)*1.4142*g.gd;r=(mid-side)*Math.sin(th)*1.4142*g.gd;
      /* a soft knee so nothing ever hard-clips */
      const al=Math.abs(l),ar=Math.abs(r);
      if(al>.9)l=Math.sign(l)*(.9+.1*ftanh((al-.9)*10));if(ar>.9)r=Math.sign(r)*(.9+.1*ftanh((ar-.9)*10));
      OL[o+i]=l;OR[o+i]=r;
    }
  }
}
return EngineDSP;
}
if(typeof module!=='undefined')module.exports={makeDSP};

/* ---- src/engine/engine-sim.js ---- */
/* =====================================================================================
   ENGINE + DRIVETRAIN SIM — runs on the main thread (the game will own this part), feeding
   the synth its rpm, load, boost and ignition cuts. Layouts carry real firing orders: the
   crank angle of each exhaust pulse over a 720 degree cycle and which bank of pipe it feeds.
   ===================================================================================== */
const SIM=(()=>{
'use strict';
const TAU=Math.PI*2,G0=9.81,clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const steps=(n,d)=>Array.from({length:n},(_,i)=>i*d);
const alt=n=>Array.from({length:n},(_,i)=>i&1);

/* fire: crank angle of each exhaust pulse (of 720). bank: which pipe it feeds. order: the cylinder
   (or rotor) firing at that angle. split: extra primary length on bank B (m). dual: separate tailpipes */
const LAYOUTS={
  I3:  {name:'Inline 3',fam:'Inline',fire:[0,240,480],bank:[0,1,0],order:[1,2,3],split:.06,dual:0,
        note:'Three pulses every two turns. The off-beat thrum comes from the 240 degree gaps.'},
  I4:  {name:'Inline 4',fam:'Inline',fire:steps(4,180),bank:[0,1,0,1],order:[1,3,4,2],amp:[1,.97,1.02,.98],split:.06,dual:0,
        note:'Even 180 degree firing into a 4-2-1 manifold. Bright and buzzy, sings at high rpm.'},
  I5:  {name:'Inline 5',fam:'Inline',fire:steps(5,144),bank:[0,1,0,1,0],order:[1,2,4,5,3],amp:[1,.93,1.05,.96,1.03],split:.1,dual:0,
        note:'An odd number of cylinders into one collector: the pulses never line up, so it warbles.'},
  I6:  {name:'Inline 6',fam:'Inline',fire:steps(6,120),bank:alt(6),order:[1,5,3,6,2,4],split:.04,dual:0,
        note:'Perfectly balanced, front three and back three into separate scrolls. Smooth and silky.'},
  I8:  {name:'Inline 8',fam:'Inline',fire:steps(8,90),bank:[0,1,0,1,1,0,1,0],order:[1,6,2,5,8,3,7,4],split:.05,dual:0,
        note:'The straight-eight: V8 firing frequency, but the front and rear groups fire unevenly.'},
  V6:  {name:'V6 · 60° even-fire',fam:'V',fire:steps(6,120),bank:alt(6),order:[1,2,3,4,5,6],split:.08,dual:1,
        note:'Each bank fires every 240 degrees, like two inline threes woven together.'},
  V6O: {name:'V6 · 90° odd-fire',fam:'V',fire:[0,90,240,330,480,570],bank:alt(6),order:[1,6,5,4,3,2],split:.1,dual:1,
        note:'Gaps of 90 and 150 degrees. The engine gallops at idle.'},
  V8:  {name:'V8 · cross-plane',fam:'V',fire:steps(8,90),bank:[0,1,1,0,1,0,0,1],order:[1,8,4,3,6,5,7,2],amp:[1,.94,.97,.95,1,.93,.98,.96],split:.12,dual:1,
        note:'Each bank fires unevenly (90, 180 and 270 degree gaps). That is the burble.'},
  V8F: {name:'V8 · flat-plane',fam:'V',fire:steps(8,90),bank:alt(8),order:[1,5,3,7,4,8,2,6],split:.05,dual:1,
        note:'Banks alternate, so each fires evenly every 180 degrees: two inline fours that scream.'},
  V10: {name:'V10 · even-fire',fam:'V',fire:steps(10,72),bank:alt(10),order:[1,6,5,10,2,7,3,8,4,9],split:.06,dual:1,
        note:'Ten pulses per cycle, each bank firing every 144 degrees like an inline five. A raw, hard-edged howl.'},
  V10O:{name:'V10 · odd-fire',fam:'V',fire:[0,90,144,234,288,378,432,522,576,666],bank:alt(10),order:[1,6,5,10,2,7,3,8,4,9],split:.08,dual:1,
        note:'A 90 degree V10 on a shared crankpin: gaps of 54 and 90 degrees give it a rasping edge.'},
  V12: {name:'V12 · 60°',fam:'V',fire:steps(12,60),bank:alt(12),order:[1,7,5,11,3,9,6,12,2,8,4,10],split:.04,dual:1,ch:{scatter:.12},
        note:'Two inline sixes fired alternately. Silky at low revs, a shriek at the top.'},
  F4:  {name:'Flat 4 · boxer',fam:'Flat',fire:steps(4,180),bank:[0,0,1,1],order:[1,3,2,4],split:.55,rumble:1,dual:0,
        note:'Unequal-length headers: one side fires twice, then the other. The rumble.'},
  F6:  {name:'Flat 6',fam:'Flat',fire:steps(6,120),bank:alt(6),order:[1,6,2,4,3,5],split:.05,dual:1,
        note:'Opposed sixes, banks alternating. Mechanical, metallic and hard-edged near the redline.'},
  R2:  {name:'Rotary · 2 rotor',fam:'Rotary',rotary:1,fire:steps(4,180),bank:[0,1,0,1],order:['R1','R2','R1','R2'],split:.05,dual:0,ch:{tr:.55,td:1.7,scatter:.24,rasp:1.9,bright:1.25,lope:.02},
        note:'Each rotor fires once per shaft turn through a port that opens all at once: long, harsh pulses.'},
  R3:  {name:'Rotary · 3 rotor',fam:'Rotary',rotary:1,fire:steps(6,120),bank:[0,1,0,0,1,0],order:['R1','R2','R3','R1','R2','R3'],split:.05,dual:0,ch:{tr:.55,td:1.7,scatter:.22,rasp:1.9,bright:1.3,lope:.015},
        note:'Three rotors, six pulses per cycle into two pipes. The high, piercing shriek of a racing rotary.'}
};
const LAYOUT_IDS=Object.keys(LAYOUTS);
const CAM_LOPE=[0,.012,.032,.065];
const EXHAUSTS=['Stock muffler','Cat-back','Headers','Straight pipe','Open headers'];
const INTAKES=['Airbox','Cold air','Ram air','Individual throttles'];
const CAMS=['Stock','Street','Race','Wild'];
const INDUCTION={none:'Natural',turbo:'Turbo',twin:'Twin turbo',roots:'Roots blower',screw:'Screw blower',cent:'Centrifugal'};
const NOS_SHOTS=[0,35,75,125,250];
const GEARS6=[3.13,2.1,1.58,1.25,1.03,.86],GEARS6R=[2.9,2.1,1.66,1.37,1.16,1.0],GEARS7=[3.0,2.4,1.98,1.68,1.45,1.27,1.12],GEARS4=[2.7,1.75,1.3,1.0];

/* turbo sizes: spool window (fraction of redline) and lag */
const TURBO_SIZE=[{n:'Small',s0:.32,s1:.48,lag:.24},{n:'Medium',s0:.4,s1:.6,lag:.36},{n:'Large',s0:.48,s1:.7,lag:.55}];

const PRESETS=[
  {id:'street4',name:'Street Four',tag:'2.0 L inline-4, stock',layout:'I4',disp:2.0,redline:7200,idle:850,tq:205,cP:.6,cW:.48,cA:.45,Ie:.13,ex:0,intake:0,cam:0,crackle:.15,limiter:'soft',mass:1180,drv:'RWD'},
  {id:'screamer',name:'Ten-Grand Four',tag:'2.0 L inline-4, throttle bodies, 9,400 rpm',layout:'I4',disp:2.0,redline:9400,idle:1150,tq:232,cP:.8,cW:.42,cA:.42,Ie:.085,ex:3,intake:3,cam:3,crackle:.55,seq:1,gearWhine:1,limiter:'hard',mass:980,drv:'RWD'},
  {id:'three',name:'Pocket Three',tag:'1.6 L inline-3, turbo',layout:'I3',disp:1.6,redline:7200,idle:900,tq:190,cP:.55,cW:.5,cA:.5,Ie:.11,fi:'turbo',boost:1.25,tsize:0,bov:'flutter',ex:2,intake:1,cam:1,crackle:.6,mass:1180,drv:'FWD'},
  {id:'five',name:'Group B Five',tag:'2.1 L inline-5, turbo, anti-lag',layout:'I5',disp:2.1,redline:8000,idle:950,tq:235,cP:.62,cW:.45,cA:.42,Ie:.13,fi:'turbo',boost:1.6,tsize:1,antilag:1,bov:'valve',ex:3,intake:2,cam:2,crackle:.9,launch:1,launchRpm:5500,mass:1100,drv:'AWD'},
  {id:'six',name:'Big-Turbo Six',tag:'3.0 L inline-6, single turbo, 75-shot',layout:'I6',disp:3.0,redline:7600,idle:850,tq:300,cP:.58,cW:.5,cA:.5,Ie:.17,fi:'turbo',boost:1.4,tsize:2,bov:'flutter',ex:3,intake:1,cam:1,crackle:.4,nos:2,mass:1450,drv:'RWD'},
  {id:'eight',name:'Blown Straight-Eight',tag:'4.0 L inline-8, roots blower, 1930s Grand Prix',layout:'I8',disp:4.0,redline:6200,idle:650,tq:430,cP:.6,cW:.55,cA:.55,Ie:.24,fi:'roots',boost:.85,ex:4,intake:0,cam:1,crackle:.65,gearWhine:1,mass:1050,drv:'RWD',mu:.95,gears:GEARS4},
  {id:'oddv6',name:'Odd-Fire V6',tag:'3.8 L 90-degree V6, odd-firing crank',layout:'V6O',disp:3.8,redline:5800,idle:700,tq:350,cP:.5,cW:.5,cA:.6,Ie:.22,ex:3,intake:0,cam:2,crackle:.3,mass:1500,drv:'RWD'},
  {id:'v6tt',name:'Twin-Turbo V6',tag:'3.5 L 60-degree V6, twin turbos',layout:'V6',disp:3.5,redline:7600,idle:850,tq:340,cP:.6,cW:.48,cA:.5,Ie:.15,fi:'twin',boost:1.2,tsize:0,bov:'valve',ex:2,intake:1,cam:1,crackle:.5,seq:1,mass:1550,drv:'AWD'},
  {id:'muscle',name:'Lumpy-Cam V8',tag:'6.2 L cross-plane V8, big cam',layout:'V8',disp:6.2,redline:6800,idle:780,tq:640,cP:.6,cW:.5,cA:.55,Ie:.27,ex:3,intake:1,cam:3,crackle:.5,limiter:'hard',mass:1650,drv:'RWD'},
  {id:'blown',name:'Blown Big-Block',tag:'8.2 L V8, roots blower, 125-shot',layout:'V8',disp:8.2,redline:7200,idle:900,tq:780,cP:.55,cW:.55,cA:.6,Ie:.32,fi:'roots',boost:.9,ex:4,intake:2,cam:3,crackle:.6,nos:3,launch:1,launchRpm:4800,limiter:'hard',mass:1500,drv:'RWD',mu:1.45},
  {id:'flatplane',name:'Flat-Plane V8',tag:'4.5 L flat-plane V8, 9,000 rpm',layout:'V8F',disp:4.5,redline:9000,idle:1000,tq:540,cP:.72,cW:.45,cA:.5,Ie:.16,ex:2,intake:2,cam:2,crackle:.35,seq:1,mass:1450,drv:'RWD'},
  {id:'v10',name:'V10 Supercar',tag:'5.2 L V10, even-firing, 8,700 rpm',layout:'V10',disp:5.2,redline:8700,idle:950,tq:560,cP:.75,cW:.45,cA:.5,Ie:.17,ex:2,intake:1,cam:2,crackle:.45,seq:1,mass:1550,drv:'AWD'},
  {id:'gp',name:'Grand Prix V10',tag:'3.0 L V10, 19,000 rpm',layout:'V10',disp:3.0,redline:19000,idle:4200,tq:345,cP:.82,cW:.34,cA:.42,Ie:.022,ex:4,intake:3,cam:3,crackle:.25,seq:1,gearWhine:1,limiter:'hard',mass:610,drv:'RWD',cdA:1.0,mu:1.8,gears:GEARS7},
  {id:'v12',name:'V12 Grand Tourer',tag:'6.5 L V12, 8,900 rpm',layout:'V12',disp:6.5,redline:8900,idle:900,tq:720,cP:.72,cW:.48,cA:.5,Ie:.2,ex:2,intake:1,cam:2,crackle:.35,seq:1,mass:1650,drv:'RWD'},
  {id:'boxer',name:'Boxer Rally',tag:'2.0 L flat-4, turbo, anti-lag',layout:'F4',disp:2.0,redline:7800,idle:950,tq:225,cP:.6,cW:.46,cA:.45,Ie:.12,fi:'turbo',boost:1.3,tsize:1,antilag:1,bov:'valve',ex:2,intake:1,cam:1,crackle:.7,seq:1,gearWhine:1,launch:1,launchRpm:5200,mass:1230,drv:'AWD'},
  {id:'flat6',name:'Flat-Six Wail',tag:'4.0 L flat-6, 9,000 rpm',layout:'F6',disp:4.0,redline:9000,idle:950,tq:470,cP:.74,cW:.45,cA:.5,Ie:.15,ex:2,intake:2,cam:2,crackle:.3,seq:1,mass:1420,drv:'RWD'},
  {id:'rotary2',name:'Bridge-Port Twin Rotor',tag:'1.3 L two-rotor, bridge port',layout:'R2',disp:1.3,redline:9200,idle:1300,tq:215,cP:.7,cW:.45,cA:.45,Ie:.08,ex:3,intake:1,cam:3,crackle:.75,mass:1150,drv:'RWD'},
  {id:'rotary3',name:'Three-Rotor Shriek',tag:'2.6 L three-rotor, peripheral ports',layout:'R3',disp:2.6,redline:9500,idle:1400,tq:340,cP:.78,cW:.42,cA:.42,Ie:.1,ex:4,intake:3,cam:3,crackle:.5,seq:1,gearWhine:1,mass:900,drv:'RWD',mu:1.6}
];
const DEFAULTS={fi:'none',boost:1,tsize:1,antilag:0,bov:'valve',ex:1,intake:0,cam:0,crackle:.3,seq:0,gearWhine:0,nos:0,launch:0,launchRpm:5000,limiter:'hard',mass:1350,drv:'RWD',cdA:.68,mu:1.15};

/* fill in a full engine spec from a preset plus any edits */
function makeSpec(base){
  const e=Object.assign({},DEFAULTS,base),L=LAYOUTS[e.layout];
  e.cyl=L.fire.length;e.rotary=!!L.rotary;e.limiterRpm=Math.round(e.redline*1.022+40);
  e.ch=Object.assign({tr:1,td:1,scatter:.18,rasp:1,bright:1,lope:0},L.ch||{});
  e.turbo=e.fi==='turbo'||e.fi==='twin';e.sup=['roots','screw','cent'].includes(e.fi)?e.fi:'';
  const ts=TURBO_SIZE[e.tsize|0];e.s0=e.redline*ts.s0;e.s1=e.redline*ts.s1;e.lag=ts.lag*(e.fi==='twin'?.8:1);
  e.fiBoost=e.fi==='none'?0:e.boost;
  e.nosKw=[0,26,56,93,186][e.nos|0];e.nosT=8;
  e.resp=[1,1.1,1.25,1.7][e.intake|0];
  e.gears=(e.gears||(e.seq?GEARS6R:GEARS6)).slice();e.nG=e.gears.length;
  e.shiftT=e.seq?.06:.3;
  /* gearing: the top gear runs out near a top speed that suits the power */
  e.peak=peakPower(e);
  const vTop=clamp(46+e.peak.hp*.06,62,98);e.R=.33;e.fd=(e.limiterRpm*TAU/60)*e.R/(e.gears[e.nG-1]*vTop);
  e.shiftRpm=e.redline*.99;
  return e;
}
/* crank torque (N m): bell-shaped NA curve x (1 + boost), friction and pumping when off throttle */
function engTq(e,rpm,thr,boost){
  const x=rpm/e.redline;
  const base=e.tq*(e.cA+(1-e.cA)*Math.exp(-Math.pow((x-e.cP)/e.cW,2)));
  const fade=rpm>e.redline?Math.max(0,1-(rpm-e.redline)/(e.redline*.18)):1;
  const wot=base*(1+boost*.62)*fade-(e.sup?e.tq*.03*x:0);
  const fric=e.tq*(.08+.13*x);
  return thr*wot-(1-thr)*fric;
}
function steadyBoost(e,rpm){
  if(!e.fiBoost)return 0;
  if(e.sup==='roots'||e.sup==='screw')return e.fiBoost*Math.pow(Math.min(1,rpm/(e.redline*.38)),.6);
  if(e.sup==='cent')return e.fiBoost*Math.pow(rpm/e.redline,2);
  return e.fiBoost*sstep(e.s0,e.s1,rpm);
}
function peakPower(e){let pk=0,pr=0,tk=0,tr=0;for(let rpm=e.idle;rpm<=e.redline*1.02;rpm+=e.redline/200){const t=engTq(e,rpm,1,steadyBoost(e,rpm)),p=t*rpm*TAU/60;if(p>pk){pk=p;pr=rpm;}if(t>tk){tk=t;tr=rpm;}}return {kw:pk/1000,hp:pk/745.7,rpm:pr,tq:tk,tqRpm:tr};}
function curve(e,n=120){const out=[];for(let i=0;i<=n;i++){const rpm=e.idle+(e.limiterRpm-e.idle)*i/n,b=steadyBoost(e,rpm),t=engTq(e,rpm,1,b);out.push({rpm,tq:t,hp:t*rpm*TAU/60/745.7,boost:b});}return out;}
/* bank firing intervals, for the crank diagram */
function bankIntervals(L){const out=[[],[]];for(const b of [0,1]){const a=L.fire.filter((_,i)=>L.bank[i]===b);for(let i=0;i<a.length;i++)out[b].push(((a[(i+1)%a.length]-a[i])+720)%720||720);}return out;}

/* the synth's configuration for a spec */
function dspCfg(e){
  const L=LAYOUTS[e.layout],n=L.fire.length;
  return {layout:e.layout,ang:L.fire.slice(),bank:L.bank.slice(),amp:L.amp?L.amp.slice():Array.from({length:n},(_,i)=>1+.03*Math.sin(i*2.39+n)),
    ch:e.ch,lope:CAM_LOPE[e.cam|0]+(e.ch.lope||0),split:L.split,dual:L.dual,rumble:L.rumble|0,
    ex:e.ex|0,intake:e.intake|0,disp:e.disp,redline:e.redline,idle:e.idle,turbo:e.turbo?1:0,twin:e.fi==='twin'?1:0,sup:e.sup,fiBoost:e.fiBoost,
    crackle:e.crackle,gearWhine:e.gearWhine|0,seq:e.seq|0,gain:L.fire.length>=10?.85:L.fire.length<=3?1.15:1};
}

/* ---------- the engine and car ---------- */
class EngineSim{
  constructor(spec){this.st='off';this.t=0;this.we=0;this.rpm=0;this.thr=0;this.boost=0;this.gear=0;this.v=0;this.cutT=0;this.cutFrac=0;
    this.shiftT=0;this.shiftTo=0;this.clutch='open';this.engage=0;this.spin=false;this.nos=1;this.nosOn=false;this.thrPrev=0;this.load=0;
    this.twostep=false;this.events=[];this.pos=-40;this.ww=0;this.launching=false;this.launchT=0;this.wHold=0;this.slip=0;this.tc=true;this.tcOn=false;this.jump=false;this.held=false;this.aPrev=0;this.lopeT=0;this.rpmOut=0;this.mode='free';this.auto=true;
    if(spec)this.setSpec(spec);}
  setSpec(e){const keep=this.e;this.e=e;if(keep&&this.gear>e.nG)this.gear=e.nG;}
  start(){if(this.st==='off'||this.st==='stopping'){this.st='crank';this.t=0;this.nos=1;}}
  stop(){if(this.st!=='off')this.st='stopping';}
  get running(){return this.st==='run'||this.st==='catch';}
  shift(dir){
    const e=this.e;if(this.mode!=='drive'||this.shiftT>0||!this.running)return false;
    const to=this.gear+dir;if(to<1||to>e.nG)return false;
    if(this.gear===0){this.gear=to;this.clutch='open';return true;}
    this.shiftTo=to;this.shiftT=e.shiftT;this.clutch='open';this.engage=0;
    if(dir>0&&e.seq&&this.thr>.6)this.events.push({type:'shift'});
    return true;
  }
  /* inp: {thr 0..1, brk 0..1, nos bool} */
  step(dt,inp){
    const e=this.e,idleW=e.idle*TAU/60,limW=e.limiterRpm*TAU/60;this.t+=dt;this.lopeT+=dt;
    this.twostep=false;this.cutFrac=0;let thrIn=clamp(inp.thr||0,0,1);const brk=clamp(inp.brk||0,0,1);
    /* ---- starting and stopping ---- */
    if(this.st==='off'){this.we=0;this.v=Math.max(0,this.v-dt*3);this._out();return;}
    if(this.st==='crank'){this.we=(235+70*Math.sin(this.t*38))*TAU/60;this.thr=0;if(this.t>.8){this.st='catch';this.t=0;}this._out();return;}
    if(this.st==='catch'){const t=this.t;this.we=idleW*(1+.95*Math.sin(Math.min(1,t/.22)*Math.PI/2)*Math.exp(-Math.max(0,t-.22)*2.6));this.load=t<.22?.6:0;
      if(t>1.1)this.st='run';this.rpm=this.we*60/TAU;this._out();return;}
    if(this.st==='stopping')thrIn=0;
    /* ---- throttle body ---- */
    this.thr+=(thrIn-this.thr)*Math.min(1,dt*(thrIn>this.thr?9:14)*e.resp);
    let thr=this.thr,thrSnd=this.thr;const rpm=this.we*60/TAU;
    /* ---- the rev limiter ---- */
    if(this.cutT>0){this.cutT-=dt;thr=0;this.cutFrac=1;}
    else if(e.limiter==='hard'&&rpm>e.limiterRpm){this.cutT=clamp(24/e.cyl*60/rpm*2,.025,.07);thr=0;this.cutFrac=1;}
    else if(e.limiter==='soft'&&rpm>e.limiterRpm-160){const k=clamp((e.limiterRpm-rpm)/160,0,1);thr*=k;this.cutFrac=1-k;}
    /* ---- shifting ---- */
    const drive=this.mode==='drive',R=e.R;
    if(!drive)this.ww=this.v/R;
    if(this.shiftT>0){this.shiftT-=dt;
      if(this.shiftTo>this.gear){if(!(e.seq&&thrIn>.7)){thr=0;thrSnd=0;}else{thr=0;this.cutFrac=1;}}
      else{const tgt=e.gears[this.shiftTo-1]*e.fd*this.ww;thr=Math.max(thr,clamp((tgt-this.we)*.03,0,1));thrSnd=thr;}
      if(this.shiftT<=0){this.gear=this.shiftTo;this.clutch='slip';this.launching=false;this.engage=e.seq?.85:.3;this.engT=e.seq?.05:.18;}}
    /* ---- launch: hold the brake at a standstill, rev against the two-step, let go to launch ---- */
    if(drive&&this.v<.4&&brk>.5){this.held=true;this.clutch='open';this.launching=false;if(this.gear===0)this.gear=1;
      if(e.launch&&rpm>e.launchRpm){thr=0;this.cutFrac=.75;this.twostep=thrIn>.4;}}
    else if(drive&&this.held&&brk<.3)this.held=false;
    if(drive&&this.gear===0&&thrIn>.1&&this.running)this.gear=1;
    /* pulling away: the driver's left foot slips the clutch to hold the revs and lets it go as the car catches up */
    if(drive&&this.clutch==='open'&&!this.held&&this.shiftT<=0&&this.gear>0&&thrIn>.1&&this.running){
      this.clutch='slip';this.launching=this.v<4;this.launchT=0;this.engage=this.launching?.6:.2;this.engT=.25;
      this.wHold=e.launch?e.launchRpm*TAU/60:lerp(idleW*1.4,e.redline*.55*TAU/60,thrIn);}
    /* ---- traction control: cut sparks while the driven tyres spin past their peak (the rally-car stutter) ---- */
    this.tcOn=false;
    if(this.tc&&drive&&this.gear>0&&this.clutch!=='open'&&this.slip>.16&&this.v>.5){const k=clamp((this.slip-.16)*4.5,0,.85);thr*=1-k;this.cutFrac=Math.max(this.cutFrac,k);this.tcOn=k>.05;}
    /* ---- forced induction ---- */
    if(e.turbo){const spool=sstep(e.s0,e.s1,rpm),tgt=thrSnd>.15?e.fiBoost*spool*(.35+.65*thrSnd):e.antilag&&this.running?e.fiBoost*.75*sstep(e.s0*.7,e.s1,rpm):0;
      if(this.boost>.35&&this.thrPrev>.6&&thrIn<.2&&!e.antilag&&e.bov!=='none'){this.events.push({type:'bov',flutter:e.bov==='flutter'});}
      this.boost+=(tgt-this.boost)*Math.min(1,dt*(tgt>this.boost?(.5+1.5*rpm/e.redline)/e.lag:6));}
    else this.boost=steadyBoost(e,rpm)*(thrSnd>.05?1:.2);
    this.thrPrev=thrIn;
    /* ---- torque ---- */
    let Te=engTq(e,Math.max(rpm,1),thr,this.boost);
    this.nosOn=false;
    if(inp.nos&&e.nosKw&&this.nos>0&&thrIn>.5&&this.running&&this.shiftT<=0&&!this.held&&this.cutFrac<.5){this.nosOn=true;this.nos=Math.max(0,this.nos-dt/e.nosT);Te+=Math.min(e.nosKw*1000/Math.max(this.we,150),e.tq*1.6);}
    if(this.st==='run'&&this.we<idleW*1.1&&thr<.3)Te+=Math.max(0,(idleW-this.we)*e.Ie*28);
    /* what the cylinders that do fire are breathing: the limiter drops events, it does not close the throttle */
    const TeS=engTq(e,Math.max(rpm,1),thrSnd,this.boost);
    this.load=this.st==='run'?clamp(thrSnd*(TeS>0?1:0)*(.42+.58*Math.min(1,TeS/e.tq)),0,1):0;
    /* ---- drivetrain: engine, clutch, gearbox, driven wheels with their own speed, tyre slip ---- */
    const m=e.mass,eta=.9,G=drive&&this.gear>0?e.gears[this.gear-1]*e.fd:0,Iw=e.drv==='AWD'?4.8:2.4;
    const drvF=e.drv==='AWD'?1:e.drv==='FWD'?.6-.15*this.aPrev/G0:.56+.18*this.aPrev/G0,Fmax=e.mu*m*G0*clamp(drvF,.35,1);
    /* tyre: force rises with slip to a peak at 12 percent, then falls away to a sliding plateau */
    const vn=Math.max(this.v,3),kap=(this.ww*R-this.v)/vn,KP=.12,sl=kap/KP,as=Math.abs(sl);
    let tf,tdf;if(as<1){tf=sl*(2-as);tdf=2-2*as;}else{tf=Math.sign(sl)*(.82+.18*Math.exp(-(as-1)*.8));tdf=0;}
    const F0=Fmax*tf,K=Fmax*tdf/KP;
    const res=.5*1.2*e.cdA*this.v*this.v+(this.v>.05?.013*m*G0+brk*m*G0*.95:0);
    /* semi-implicit wheel update: the tyre's own stiffness goes into the denominator */
    const wheel=(Tw,J)=>{const dww=dt*(Tw-F0*R)/(J+dt*K*R*R/vn);this.ww+=dww;return F0+K*dww*R/vn;};
    let F=0;
    if(!drive||this.gear===0||this.clutch==='open'){this.we+=dt*Te/e.Ie;F=wheel(0,Iw);}
    else if(this.clutch==='slip'){
      this.engage=Math.min(1,this.engage+dt/Math.max(.03,this.engT||.2));
      const cap=e.tq*(1.6+e.fiBoost*.7)*this.engage,wG=G*this.ww;let Tc;
      const wCar=G*this.v/R;if(this.launching&&wCar>=this.we-15)this.launching=false;
      if(this.launching){this.launchT+=dt;const wT=Math.max(wCar,this.wHold*Math.max(.8,1-.25*this.launchT));Tc=clamp(Te+30*e.Ie*(this.we-wT),0,cap);}
      else{Tc=cap*clamp((this.we-wG)/14,-1,1);if(Tc>0&&this.we<idleW*1.25)Tc=Math.min(Tc,Math.max(0,Te+e.Ie*30*(this.we-idleW*1.05)));}
      this.we+=dt*(Te-Tc)/e.Ie;F=wheel(Tc*G*eta,Iw);
      if(this.engage>=1&&!this.launching&&Math.abs(this.we-G*this.ww)<8){this.clutch='lock';this.launching=false;this.we=G*this.ww;}
      if(this.launching&&this.launchT>3)this.launching=false;
    }else{
      F=wheel(Te*G*eta,Iw+e.Ie*G*G*eta);this.we=G*this.ww;
      if(this.we<idleW*.8&&this.v<6)this.clutch='open';
    }
    if(brk>.1)this.ww+=(this.v/R-this.ww)*Math.min(1,dt*25*brk);
    let dv=(F-res)/(m+2.4/(R*R));
    if(this.held){dv=Math.min(0,dv);this.ww=0;}
    this.v=Math.max(0,this.v+dv*dt);if(this.v<.05&&brk>.1){this.v=0;this.ww=0;}
    this.ww=Math.max(0,this.ww);this.aPrev=dv;this.spin=kap>.2;this.slip=kap;
    if(this.we>limW*1.08)this.we=limW*1.08;
    if(this.st==='stopping'){if(this.we<idleW*.35){this.st='off';this.we=0;}}
    else if(this.we<idleW*.6)this.we=idleW*.6;
    this.rpm=this.we*60/TAU;
    /* ---- the automatic gearbox ---- */
    if(drive&&this.auto&&this.shiftT<=0&&!this.held&&this.gear>0){
      if(this.clutch!=='open'&&!this.launching&&this.gear<e.nG&&this.rpm>e.shiftRpm&&thrIn>.3)this.shift(1);
      else if(this.gear>1){const after=this.rpm*e.gears[this.gear-2]/e.gears[this.gear-1];if(after<e.redline*.86&&(this.rpm<e.redline*.42||(brk>.3&&after<e.redline*.8)))this.shift(-1);}
    }
    if(drive&&this.v<.5&&this.gear>1&&this.shiftT<=0)this.gear=1;
    /* ---- where the car is, for the trackside listener ---- */
    this.pos+=this.v*dt;if(this.pos>170){this.pos=-170;this.jump=true;}
    this._out();
  }
  _out(){
    const e=this.e,w=1-clamp((this.rpm-e.idle)/(e.idle*.9),0,1),lope=CAM_LOPE[e.cam|0]*1.4+(e.ch.lope||0);
    /* lumpy cams hunt at idle: the needle and the sound both bob */
    const mod=this.running&&lope?lope*w*(Math.sin(this.lopeT*TAU*1.55)+.6*Math.sin(this.lopeT*TAU*.62+1.3)):0;
    this.rpmOut=this.st==='off'?0:this.st==='crank'?this.we*60/TAU:this.we*60/TAU*(1+mod);
  }
  /* parameters for the synth. listener: 0 behind the car, 1 in the cabin, 2 trackside */
  params(listener,vol=1){
    const e=this.e;let dist=3,pan=0,rear=1;
    if(listener===1){dist=1.4;rear=.35;}
    else if(listener===2){const y=7;dist=Math.hypot(this.pos,y);pan=clamp(this.pos/dist,-1,1);rear=.5+.5*this.pos/dist;}
    return {on:this.st!=='off'&&this.st!=='crank'?1:0,firing:this.st==='run'||this.st==='catch'?1:0,crank:this.st==='crank'?1:0,crankT:this.st==='crank'?this.t:0,
      rpm:this.rpmOut,load:this.load,cutFrac:this.cutFrac,boost:this.boost,nos:this.nosOn?1:0,speed:this.v,gear:this.gear,twostep:this.twostep?1:0,
      antilag:e.antilag&&e.turbo&&this.thr<.2&&this.running?1:0,view:listener,dist,pan,rear,vol,jump:this._jump()};
  }
  _jump(){const j=this.jump?1:0;this.jump=false;return j;}
  takeEvents(){const ev=this.events;this.events=[];return ev;}
}
return {LAYOUTS,LAYOUT_IDS,PRESETS,DEFAULTS,EXHAUSTS,INTAKES,CAMS,INDUCTION,NOS_SHOTS,TURBO_SIZE,makeSpec,engTq,steadyBoost,curve,bankIntervals,dspCfg,EngineSim,clamp};
})();
if(typeof module!=='undefined')module.exports=SIM;


/* ---- the host: the Lab's synth running every engine in the game ----
   One AudioWorklet runs a fixed pool of engines, each an EngineDSP from the Lab. A voice is a slot
   in that pool: give it an engine (a Lab preset id, a preset plus edits, or a spec copied from the
   Lab's "Copy engine spec" button) and feed it the game's rpm, throttle and where the car is
   relative to you every frame. Each voice has a small ECU beside it on the main thread doing what
   the Lab's EngineSim did for the synth: turbo spool and blow-off, superchargers, cam lope at
   idle, the starter and the catch, the two-step. Distance, pan and Doppler are the synth's own:
   it delays the sound by the time it takes to reach you, so a car going by changes pitch on its own. */
const HDL=(()=>{
'use strict';
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
/* an engine: a Lab preset id ('v10'), a preset id with edits, or a whole spec object from the Lab */
function engine(src,over){
  const base=typeof src==='string'?SIM.PRESETS.find(p=>p.id===src):src;
  return SIM.makeSpec(Object.assign({},base||SIM.PRESETS[0],over||{}));
}
/* the Lab's rooms: open air (a ground bounce and a far wall), a garage, a tunnel */
function roomIR(ctx,kind){
  const sr=ctx.sampleRate,n=Math.round(sr*{open:.5,garage:1.2,tunnel:2.4}[kind]),b=ctx.createBuffer(2,n,sr);let seed=1234567;
  const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647*2-1;};
  for(let ch=0;ch<2;ch++){const X=b.getChannelData(ch);let lp=0;
    if(kind==='tunnel'){
      for(let k=1;k<44;k++){const i=Math.round((k*.036+(k&1?ch*.011:0)+rnd()*.0015)*sr);if(i>=n)break;const a=Math.pow(.8,k)*(((k+ch)&1)?.55:1);
        for(let q=0;q<90&&i+q<n;q++)X[i+q]+=a*Math.exp(-q/(5+k*1.4))*(q?rnd()*.6:1);}
      for(let i=0;i<n;i++){const t=i/sr;lp+=.3*(rnd()-lp);X[i]+=lp*.55*Math.exp(-t*2.5)*Math.min(1,t/.03);}
    }else if(kind==='garage'){
      for(const [t,a] of [[.007,.7],[.013,.5],[.019,.45],[.026,.35],[.034,.3],[.041,.28]])X[Math.round((t+ch*.0013)*sr)]+=a*(rnd()>0?1:-1);
      for(let i=0;i<n;i++){const t=i/sr;lp+=.45*(rnd()-lp);X[i]+=lp*.5*Math.exp(-t*5.8)*Math.min(1,t/.012);}
    }else{
      X[Math.round((.0045+ch*.0006)*sr)]+=.5;
      for(const [t,a,d] of [[.085,.22,12],[.16,.12,18]]){const s=Math.round((t+ch*.005)*sr);for(let q=0;q<80;q++)X[s+q]+=a*Math.exp(-q/d)*rnd();}
      for(let i=0;i<n;i++){const t=i/sr;lp+=.25*(rnd()-lp);X[i]+=lp*.12*Math.exp(-t*9)*Math.min(1,t/.02);}
    }}
  return b;
}
/* the processor: the pool of engines summed into one stereo output. A voice that has gone quiet
   (released, or turned all the way down) costs nothing until it is asked to play again. */
const PROC=`const EngineDSP=(${makeDSP.toString()})();
${hostMsg.toString()}
${hostRun.toString()}
class HDLabHost extends AudioWorkletProcessor{
  constructor(){super();this.v=[];this.L=new Float32Array(128);this.R=new Float32Array(128);this.k=0;
    this.port.onmessage=e=>hostMsg(this.v,e.data,()=>new EngineDSP(sampleRate));}
  process(i,o){const s=hostRun(this,o[0][0],o[0][1]||o[0][0]);if(s)this.port.postMessage(s);return true;}
}
registerProcessor('hd-lab-host',HDLabHost);`;
function hostMsg(v,m,mk){
  if(m.b){for(const x of m.b)hostMsg(v,x,mk);return;}
  if(m.t==='new'){v[m.i]=mk();return;}
  const d=v[m.i];if(!d)return;
  if(m.t==='cfg')d.configure(m.cfg);else if(m.t==='p')d.set(m.p);else if(m.t==='ev')d.event(m.ev);
}
function hostRun(h,oL,oR){
  const n=oL.length;let L=h.L,R=h.R;if(L.length<n){L=h.L=new Float32Array(n);R=h.R=new Float32Array(n);}
  oL.fill(0);if(oR!==oL)oR.fill(0);
  for(let k=0;k<h.v.length;k++){const d=h.v[k];if(!d)continue;
    if((!(d.p.vol>0)||(!d.p.on&&!d.p.crank))&&d.g.og<1e-4&&!d.pend)continue;
    d.process(L,R,n);for(let j=0;j<n;j++){oL[j]+=L[j];if(oR!==oL)oR[j]+=R[j];}}
  if(++h.k>=8){h.k=0;let s=null;for(let k=0;k<h.v.length;k++){const d=h.v[k];if(!d)continue;const t=d.takeStats();if(t&&t.pops)(s||(s=[])).push(k,t.pops);}return s;}
  return null;
}

/* the ECU beside each voice: the game says rpm and throttle; this adds what an engine does on its own */
function ECU(e){
  return {e,st:'run',t:0,blend:1,boost:0,thrPrev:0,lopeT:0,
    start(){this.st='crank';this.t=0;this.blend=0;},
    run(){this.st='run';this.blend=1;},
    off(){this.st='off';},
    step(dt,s,events){
      const e=this.e;this.t+=dt;this.lopeT+=dt;
      let rpm=Math.max(0,s.rpm||0),load=clamp(s.load==null?s.thr||0:s.load,0,1),cut=clamp(s.cut===true?1:s.cut||0,0,1),on=1,firing=1,crank=0,crankT=0;
      const thr=clamp(s.thr==null?load:s.thr,0,1);
      if(this.st==='off'){on=0;firing=0;rpm=0;load=0;}
      else if(this.st==='crank'){rpm=235+70*Math.sin(this.t*38);on=0;firing=0;crank=1;crankT=this.t;load=0;if(this.t>.8){this.st='catch';this.t=0;}}
      else if(this.st==='catch'){const t=this.t;rpm=e.idle*(1+.95*Math.sin(Math.min(1,t/.22)*Math.PI/2)*Math.exp(-Math.max(0,t-.22)*2.6));load=t<.22?.6:0;cut=0;if(t>1.1){this.st='run';this.blend=0;}}
      else if(this.blend<1){this.blend=Math.min(1,this.blend+dt/.6);rpm=lerp(e.idle,rpm,this.blend*this.blend);load*=this.blend;}
      const running=this.st==='run'||this.st==='catch';
      /* lumpy cams hunt at idle, the way the Lab's needle bobs */
      const w=1-clamp((rpm-e.idle)/(e.idle*.9),0,1),lope=SIM_LOPE[e.cam|0]*1.4+(e.ch.lope||0);
      if(running&&lope)rpm*=1+lope*w*(Math.sin(this.lopeT*TAU*1.55)+.6*Math.sin(this.lopeT*TAU*.62+1.3));
      /* the two-step: held at the launch rpm, sparks cut, the pipes crackle */
      let twostep=0;if(s.launch&&e.launch&&running&&rpm>e.launchRpm*.96&&thr>.4){twostep=1;cut=Math.max(cut,.75);}
      /* forced induction */
      if(e.turbo){const spool=sstep(e.s0,e.s1,rpm),tgt=thr>.15&&cut<.9?e.fiBoost*spool*(.35+.65*thr):e.antilag&&running?e.fiBoost*.75*sstep(e.s0*.7,e.s1,rpm):0;
        if(this.boost>.35&&this.thrPrev>.6&&thr<.2&&!e.antilag&&e.bov!=='none'&&events)events.push({type:'bov',flutter:e.bov==='flutter'});
        this.boost+=(tgt-this.boost)*Math.min(1,dt*(tgt>this.boost?(.5+1.5*rpm/e.redline)/e.lag:6));}
      else this.boost=SIM.steadyBoost(e,rpm)*(thr>.05?1:.2);
      this.thrPrev=thr;
      return {on,firing,crank,crankT,rpm,load:running?load:0,cutFrac:cut,boost:this.boost,nos:s.nos?1:0,speed:s.speed||0,gear:s.gear||0,twostep,
        antilag:e.antilag&&e.turbo&&thr<.2&&running?1:0,view:s.view|0,dist:s.dist==null?3:s.dist,pan:s.pan||0,rear:s.rear==null?1:s.rear,vol:s.vol==null?1:s.vol,jump:s.jump?1:0};
    }};
}
const SIM_LOPE=[0,.012,.032,.065];

/* host(ctx, destination, {slots, room, roomSend, tunnel}) */
function host(ctx,dest,o={}){
  const H={ctx,ready:false,kind:'starting',q:[],voices:[],out:ctx.createGain(),node:null};
  H.out.connect(dest);
  /* the Lab's open-air room under everything, and a tunnel that the game fades in */
  if(o.room!==false){const cv=ctx.createConvolver();cv.buffer=roomIR(ctx,o.room||'open');const s=ctx.createGain();s.gain.value=o.roomSend??.22;H.out.connect(s);s.connect(cv);cv.connect(dest);H.roomSend=s;}
  if(o.tunnel){const cv=ctx.createConvolver();cv.buffer=roomIR(ctx,'tunnel');H.tunnelSend=ctx.createGain();H.tunnelSend.gain.value=0;H.out.connect(H.tunnelSend);H.tunnelSend.connect(cv);cv.connect(dest);}
  const send=m=>{if(H.ready)H.port(m);else H.q.push(m);};
  let batch=[];H.flush=()=>{if(!batch.length)return;const b=batch;batch=[];send({b});};
  const onStats=a=>{for(let k=0;k<a.length;k+=2){const v=H.voices[a[k]];if(v)v.pops+=a[k+1];}};
  (async()=>{
    try{
      if(!ctx.audioWorklet||!window.AudioWorkletNode)throw new Error('no audio worklet');
      try{await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([PROC],{type:'application/javascript'})));}
      catch(e1){await ctx.audioWorklet.addModule('data:application/javascript;charset=utf-8,'+encodeURIComponent(PROC));}
      const node=new AudioWorkletNode(ctx,'hd-lab-host',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
      node.port.onmessage=e=>onStats(e.data);H.port=m=>node.port.postMessage(m);H.node=node;H.kind='worklet';
    }catch(err){
      /* no worklet (or not allowed here): the same synth on the main thread */
      const D=makeDSP(),v=[],node=ctx.createScriptProcessor(1024,1,2),h={v,L:new Float32Array(1024),R:new Float32Array(1024),k:0};
      if(ctx.createConstantSource){const z=ctx.createConstantSource();z.offset.value=0;z.connect(node);z.start();}
      node.onaudioprocess=ev=>{const b=ev.outputBuffer,s=hostRun(h,b.getChannelData(0),b.getChannelData(1));if(s)onStats(s);};
      H.port=m=>hostMsg(v,m,()=>new D(ctx.sampleRate));H.node=node;H.kind='main thread';
    }
    H.node.connect(H.out);H.ready=true;for(const m of H.q)H.port(m);H.q=[];
  })();
  /* the pool is made once; voices are handed out and given back, and swap engines with a short fade */
  const N=o.slots||4;
  for(let i=0;i<N;i++){
    const v={i,e:null,key:'',ecu:null,pops:0,busy:false,ev:[],
      assign(e){if(this.e===e)return this;const k=JSON.stringify(SIM.dspCfg(e));this.e=e;this.ecu=ECU(e);this.fresh=true;
        if(k!==this.key){this.key=k;send({t:'cfg',i,cfg:SIM.dspCfg(e)});}return this;},
      update(s,dt){if(!this.ecu)return;const ev=this.ev;const p=this.ecu.step(dt||1/60,s,ev);if(this.fresh){p.jump=1;this.fresh=false;}
        batch.push({t:'p',i,p});while(ev.length)batch.push({t:'ev',i,ev:ev.shift()});},
      event(e){batch.push({t:'ev',i,ev:e});},
      start(){if(this.ecu)this.ecu.start();},run(){if(this.ecu)this.ecu.run();},
      release(){this.busy=false;batch.push({t:'p',i,p:{on:0,firing:0,crank:0,rpm:0,load:0,vol:0,dist:3}});},
      takePops(){const n=this.pops;this.pops=0;return n;}};
    H.voices.push(v);send({t:'new',i});
  }
  H.take=e=>{const v=H.voices.find(x=>!x.busy&&x.i>0)||null;if(v){v.busy=true;v.assign(e);}return v;};
  H.main=e=>{const v=H.voices[0];v.busy=true;return v.assign(e);};
  H.tunnel=(k,t)=>{if(H.tunnelSend)H.tunnelSend.gain.setTargetAtTime(k,t||ctx.currentTime,.12);};
  return H;
}
return {engine,host,roomIR,ECU,hostMsg,hostRun,PRESETS:SIM.PRESETS,LAYOUTS:SIM.LAYOUTS};
})();
