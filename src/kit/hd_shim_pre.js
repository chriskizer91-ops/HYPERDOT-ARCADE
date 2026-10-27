/* ===== Hyperdot cabinet shim (runs before the game) =====
   Lets the arcade mute and pause a full-size game without reaching into its code.
   MUTE   Every connection a live AudioContext makes to its speakers is routed through one gate per context.
          Offline contexts (games that pre-render music) are left alone.
   PAUSE  While paused, animation-frame callbacks are held back and released on resume, so the game's own
          loop simply stops; the gate is closed too. Games clamp their frame time, so nothing jumps on resume. */
(()=>{
  const C=AudioNode.prototype.connect,gates=new WeakMap(),RAF=window.requestAnimationFrame.bind(window);
  let muted=false,paused=false,held=[];
  window.__hdGates=[];
  const level=()=>muted||paused?0:1;
  AudioNode.prototype.connect=function(d,...a){
    if(d instanceof AudioDestinationNode&&!(typeof OfflineAudioContext!=='undefined'&&d.context instanceof OfflineAudioContext)){
      const ctx=d.context;let g=gates.get(ctx);
      if(!g){g=ctx.createGain();g.gain.value=level();C.call(g,d);gates.set(ctx,g);window.__hdGates.push(g);}
      C.call(this,g,...a);return d;
    }
    return C.call(this,d,...a);
  };
  const apply=()=>{for(const g of window.__hdGates)try{g.gain.setTargetAtTime(level(),g.context.currentTime,.03);}catch(e){}};
  window.requestAnimationFrame=cb=>{if(paused){held.push(cb);return 0;}return RAF(cb);};
  window.__hdSetMute=m=>{muted=!!m;apply();};
  window.__hdSetPause=p=>{p=!!p;if(p===paused)return;paused=p;apply();if(!p){const h=held;held=[];for(const cb of h)RAF(cb);}};
  window.__hdState=()=>({muted,paused});
})();
