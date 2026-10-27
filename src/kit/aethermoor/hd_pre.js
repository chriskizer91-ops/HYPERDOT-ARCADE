/* ===== Hyperdot cabinet shim (runs before the game) =====
   The arcade can mute any cabinet. Rather than reach into each game's own mixer, every connection a live
   AudioContext makes to its speakers is routed through one gate per context, which the arcade closes
   and opens. Offline contexts (games that pre-render music) are left alone. */
(()=>{
  const C=AudioNode.prototype.connect,gates=new WeakMap();
  window.__hdMuted=false;window.__hdGates=[];
  AudioNode.prototype.connect=function(d,...a){
    if(d instanceof AudioDestinationNode&&!(typeof OfflineAudioContext!=='undefined'&&d.context instanceof OfflineAudioContext)){
      const ctx=d.context;let g=gates.get(ctx);
      if(!g){g=ctx.createGain();g.gain.value=window.__hdMuted?0:1;C.call(g,d);gates.set(ctx,g);window.__hdGates.push(g);}
      C.call(this,g,...a);return d;
    }
    return C.call(this,d,...a);
  };
  window.__hdSetMute=m=>{window.__hdMuted=!!m;for(const g of window.__hdGates)try{g.gain.setTargetAtTime(m?0:1,g.context.currentTime,.03);}catch(e){}};
})();
