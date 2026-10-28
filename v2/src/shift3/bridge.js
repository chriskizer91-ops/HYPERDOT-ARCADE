/* HYPERDOT ARCADE BRIDGE for Shiftlight 3. add_bridge.py puts this at the end of the game's finished build.
   It doesn't change the game: it talks to the arcade through the game's own test handle, window.__game.
     game -> arcade:  ready (the title screen is up), over (a results screen: tickets by finishing position)
     arcade -> game:  pause, resume, mute, unmute
   Opened on its own (no ?embed=1, or not in a frame) it does nothing. */
(()=>{
  if(!/[?&]embed=1/.test(location.search)||window.parent===window)return;
  const post=(type,data)=>{try{parent.postMessage(Object.assign({src:'hyperdot',type,id:'shift3'},data||{}),'*');}catch(e){}};
  const TIX={1:40,2:20,3:10},FINISHED=4;
  let muted=false;
  const hook=()=>{
    const G=window.__game;
    if(!G||!G.ready){setTimeout(hook,150);return;}
    const R=G.results,set=R.set.bind(R);
    R.set=d=>{set(d);post('over',{score:d&&d.rank||0,tickets:TIX[d&&d.rank]||FINISHED});};
    if(muted)G.audio.setMuted(true);
    post('ready',{title:'SHIFTLIGHT 3',tickets:true});
  };
  addEventListener('message',e=>{
    const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
    const G=window.__game;
    if(m.cmd==='mute'){muted=true;if(G)G.audio.setMuted(true);}
    else if(m.cmd==='unmute'){muted=false;if(G)G.audio.setMuted(false);}
    else if(m.cmd==='pause'){if(G&&G.state==='drive')G.pause(true);if(G)G.audio.suspend(true);}
    else if(m.cmd==='resume'){if(G&&G.state!=='pause')G.audio.suspend(false);}
  });
  hook();
})();
