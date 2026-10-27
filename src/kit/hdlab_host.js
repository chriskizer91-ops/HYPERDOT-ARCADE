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
