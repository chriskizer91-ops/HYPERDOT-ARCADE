/* =====================================================================================
   24. MENUS — real buttons over the live table: the title (with the match settings), the
       rival select, the result card, and the pause menu. Arrow keys and a gamepad's d-pad
       move between buttons; Enter, Space or A press them.
   ===================================================================================== */
const UI={scr:null};
function uiShow(id){UI.scr=id;for(const s of document.querySelectorAll('.scr'))s.hidden=s.id!=='s'+id[0].toUpperCase()+id.slice(1);
  document.body.classList.toggle('inmenu',!!id);
  if(id==='title')titleSync();else if(id==='rivals')rivalsBuild();else if(id==='over')overBuild();
  requestAnimationFrame(()=>{const b=document.querySelector('.scr:not([hidden]) [data-focus]')||document.querySelector('.scr:not([hidden]) button:not([disabled])');if(b&&!touchy)try{b.focus({preventScroll:true});}catch(e){}});}
function uiHide(){UI.scr=null;for(const s of document.querySelectorAll('.scr'))s.hidden=true;document.body.classList.remove('inmenu');try{cv.focus({preventScroll:true});}catch(e){}}
function segSync(){for(const sg of document.querySelectorAll('.seg')){const k=sg.dataset.k,v=k==='to'?String(G.to):k==='rules'?G.rules:THEME;
  for(const b of sg.querySelectorAll('button'))b.setAttribute('aria-pressed',b.dataset.v===v?'true':'false');}}
function titleSync(){segSync();$('tHint').textContent=touchy?'Drag your mallet. Two players: each drags on their own half.':'Mouse, arrows, WASD or a gamepad. Two players: P1 mouse or arrows, P2 WASD.';}
function setOpt(k,v){
  if(k==='to'){G.to=+v;store.set('hd-'+CAB.id+'-to',G.to);}
  else if(k==='rules'){G.rules=v;store.set('hd-'+CAB.id+'-rules',v);}
  else if(k==='theme'){THEME=v;store.set('hd-'+CAB.id+'-theme',v);applyTheme();}
  segSync();menuSync();
}
function stars(n){return n>0?'★'.repeat(Math.min(5,n))+(n>5?' ×'+n:''):'';}
function rivalsBuild(){
  const box=$('cards');box.innerHTML='';
  RIVALS.forEach((rv,i)=>{const lock=i>BEAT+1,wins=+store.get('hd-'+CAB.id+'-wins-'+rv.id,'0')||0;
    const b=document.createElement('button');b.type='button';b.className='card'+(lock?' locked':'');b.style.setProperty('--c',rv.col);b.disabled=lock;
    b.innerHTML='<i></i><b></b><em></em><span></span><small></small>';
    b.querySelector('b').textContent=rv.name;b.querySelector('em').textContent=rv.tag;
    b.querySelector('span').textContent=lock?'Beat '+RIVALS[i-1].name+' to unlock.':rv.line;
    b.querySelector('small').textContent=lock?'LOCKED':wins?stars(wins)+'  beaten':i===BEAT+1?'NEXT UP':'';
    if(i===G.ri&&!lock)b.dataset.focus='1';
    b.addEventListener('click',()=>{if(lock)return;audioInit();SFX.confirm();G.ri=i;store.set('hd-'+CAB.id+'-rival',i);APP_start();});
    box.appendChild(b);});
}
function overBuild(){
  const r=G.result;if(!r)return;const me=!G.two,w=r.w;
  const head=G.two?(w===0?'P1 WINS':'P2 WINS'):w===0?(r.champ?'CHAMPION!':'YOU WIN!'):plName(1)+' WINS';
  $('oT').textContent=head;$('oT').style.setProperty('--c',plCol(w));
  $('oS').innerHTML='';const s0=document.createElement('b'),s1=document.createElement('b'),dash=document.createElement('span');
  s0.textContent=r.score[0];s1.textContent=r.score[1];dash.textContent='–';s0.style.color=plCol(0);s1.style.color=plCol(1);$('oS').append(s0,dash,s1);
  const st=r.stats,row=(k,a,b)=>'<div><span>'+k+'</span><b style="color:'+plCol(0)+'">'+a+'</b><b style="color:'+plCol(1)+'">'+b+'</b></div>';
  $('oStats').innerHTML='<div class="hd"><span></span><b>'+(G.two?'P1':'YOU')+'</b><b>'+plName(1)+'</b></div>'+
    row('Top shot',MPH(st.top[0]).toFixed(0)+' mph',MPH(st.top[1]).toFixed(0)+' mph')+row('Hits',st.hits[0],st.hits[1])+row('Bank goals',st.banks[0],st.banks[1])+
    '<div class="one"><span>Longest rally</span><b>'+st.longest+'</b></div>';
  $('oTix').textContent=r.tix>0?'+'+r.tix+' tickets':'';
  $('oUnlock').textContent=r.unlocked?'New rival unlocked: '+r.unlocked:r.champ?'You beat APEX. The table is yours.':'';
  $('oNext').hidden=!(me&&w===0&&G.ri<4);$('oAgain').textContent=me&&w===1?'Try again':'Rematch';
  $('oExit').hidden=!EMBED;
}
/* ---------- the pause menu ---------- */
function setPause(on){if(S.mode!=='play'||G.demo)on=false;S.paused=on;$('menu').hidden=!on;document.body.classList.toggle('paused',on);if(on){menuSync();requestAnimationFrame(()=>{if(!touchy)try{$('mRes').focus({preventScroll:true});}catch(e){}});}}
function toggleSound(){AU.muted=!AU.muted;store.set('hd-'+CAB.id+'-mute',AU.muted?'1':'0');setVolume();menuSync();try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
function toggleDots(){DOTS=!DOTS;store.set('hd-'+CAB.id+'-dots',DOTS?'1':'0');menuSync();}
function toggleVoice(){VOICE=!VOICE;store.set('hd-'+CAB.id+'-voice',VOICE?'1':'0');menuSync();}
function cycleQ(){const order=[null,0,1,2],i=order.indexOf(QPIN);QPIN=order[(i+1)%4];store.set('hd-'+CAB.id+'-q',QPIN==null?'auto':String(QPIN));setQuality(QPIN==null?QSTART:QPIN);T.frames=0;menuSync();}
function menuSync(){
  $('snd').textContent=AU.muted?'Sound off':'Sound on';$('mSnd').textContent=AU.muted?'Sound: off':'Sound: on';$('mVo').textContent=VOICE?'Voice: on':'Voice: off';
  $('mDots').textContent=DOTS?'Dots: on':'Dots: off';$('mQ').textContent='Graphics: '+(QPIN==null?'auto ('+QP[QL].name.toLowerCase()+')':QP[QPIN].name.toLowerCase());
  $('mTh').textContent='Table: '+(THEME==='neon'?'neon':'classic');
}
/* spatial focus: arrows move to the nearest button that way */
function focusMove(dx,dy){
  const vis=[...document.querySelectorAll('#menu:not([hidden]) button, .scr:not([hidden]) button')].filter(b=>!b.disabled&&!b.hidden&&b.offsetParent);
  if(!vis.length)return;const a=document.activeElement;if(!vis.includes(a)){vis[0].focus();return;}
  const r=a.getBoundingClientRect(),ax=r.x+r.width/2,ay=r.y+r.height/2;let best=null,bs=1e9;
  for(const b of vis){if(b===a)continue;const q=b.getBoundingClientRect(),bx=q.x+q.width/2,by=q.y+q.height/2,ddx=bx-ax,ddy=by-ay;
    const along=ddx*dx+ddy*dy;if(along<=4)continue;const off=Math.abs(ddx*dy)+Math.abs(ddy*dx),sc=along+off*2.2;if(sc<bs){bs=sc;best=b;}}
  if(best){best.focus();SFX.select();}
}
const btn=(id,f)=>$(id).addEventListener('click',e=>{audioInit();const t=e.currentTarget;f(e);if(touchy)t.blur();});
function uiInit(){
  btn('b1p',()=>{SFX.confirm();uiShow('rivals');});
  btn('b2p',()=>{SFX.confirm();APP_start2();});
  btn('bBack',()=>{SFX.back();uiShow('title');});
  for(const sg of document.querySelectorAll('.seg'))for(const b of sg.querySelectorAll('button'))b.addEventListener('click',()=>{audioInit();SFX.select();setOpt(sg.dataset.k,b.dataset.v);});
  btn('oAgain',()=>{SFX.confirm();G.two?APP_start2():APP_start();});
  btn('oNext',()=>{SFX.confirm();G.ri=Math.min(4,G.ri+1);store.set('hd-'+CAB.id+'-rival',G.ri);APP_start();});
  btn('oMenu',()=>{SFX.back();APP_attract();});
  btn('oExit',()=>ARC.exit());
  btn('snd',toggleSound);btn('dots',toggleDots);btn('pz',()=>setPause(!S.paused));btn('pauseBtn',()=>setPause(!S.paused));
  btn('mRes',()=>setPause(false));btn('mRe',()=>{setPause(false);G.two?APP_start2():APP_start();});btn('mQuit',()=>{setPause(false);APP_attract();});
  btn('mTh',()=>setOpt('theme',THEME==='neon'?'classic':'neon'));btn('mDots',toggleDots);btn('mQ',cycleQ);btn('mSnd',toggleSound);btn('mVo',toggleVoice);btn('mEx',()=>{setPause(false);ARC.exit();});
  $('mEx').hidden=!EMBED;
}
