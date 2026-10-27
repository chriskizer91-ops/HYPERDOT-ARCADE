/* ===== Hyperdot arcade bridge for a full-size game (runs after the game) =====
   Configure with window.HD_BRIDGE = {id, title, read(): {state, score, last} | null, overState, playStates}
   before this script. Posts ready / score / over to the arcade and answers its mute / pause commands
   through the shim that ran before the game. */
(()=>{
  const B=window.HD_BRIDGE;if(!B)return;
  const IN_FRAME=window.parent&&window.parent!==window;
  const post=(type,data)=>{if(!IN_FRAME)return;try{window.parent.postMessage(Object.assign({src:'hyperdot',type,id:B.id},data||{}),'*');}catch(e){}};
  window.HYPERDOT_GAME={id:B.id,title:B.title,tickets:true,version:1,kind:'deluxe'};
  addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
    if(m.cmd==='mute')window.__hdSetMute&&__hdSetMute(true);
    else if(m.cmd==='unmute')window.__hdSetMute&&__hdSetMute(false);
    else if(m.cmd==='pause')window.__hdSetPause&&__hdSetPause(true);
    else if(m.cmd==='resume')window.__hdSetPause&&__hdSetPause(false);
  });
  let prev=null,lastScore=-1,ready=false;
  setInterval(()=>{
    let r=null;try{r=B.read();}catch(e){r=null;}
    if(!r)return;
    if(!ready){ready=true;post('ready',{title:B.title,deluxe:true,tickets:true});}
    const st=r.state;
    if(B.playStates.includes(st)&&r.score!==lastScore){lastScore=r.score;post('score',{score:r.score});}
    if(prev!=null&&prev!==B.overState&&st===B.overState){const sc=r.last!=null?r.last:r.score;post('over',{score:sc,tickets:B.tickets(sc)});lastScore=-1;}
    prev=st;
  },400);
})();
