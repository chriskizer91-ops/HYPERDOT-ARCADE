/* ===================== HUD (kept small: fuel, two corner buttons, the JET button on phones) ===================== */
const HUD={
  load(p){const b=$('ldbar');if(b)b.style.width=Math.round(p*100)+'%';},
  stick(on,x,y,dx,dy){const s=$('stick');if(!on){s.style.display='none';return;}s.style.display='block';s.style.left=x+'px';s.style.top=y+'px';$('knob').style.transform='translate('+dx+'px,'+dy+'px)';},
  fuel(p){const el=$('fuel');if(!el)return;if(el.children.length!==p.cells){el.innerHTML='';for(let i=0;i<p.cells;i++){const c=document.createElement('i');c.appendChild(document.createElement('b'));el.appendChild(c);}}
    for(let i=0;i<p.cells;i++){const f=Math.round(clamp(p.fuel-i,0,1)*50)/50,c=el.children[i];if(c._f!==f){c._f=f;c.firstChild.style.width=(f*100)+'%';c.className=f>=1?'full':'';}}},
  flashFuel(){const el=$('fuel');el.classList.remove('no');void el.offsetWidth;el.classList.add('no');},
  view(v){$('bview').textContent=v==='close'?'CLOSE':'FAR';},
  hint(t,sec){const h=$('hint');h.textContent=t;h.style.opacity=t?1:0;clearTimeout(HUD._ht);if(t&&sec)HUD._ht=setTimeout(()=>h.style.opacity=0,sec*1000);},
  menu(){const m=$('menu');$('mview').textContent='VIEW: '+(SET.view==='close'?'CLOSE':'FAR');
    $('mqual').textContent='QUALITY: '+(SET.quality==='auto'?'AUTO ('+QL.toUpperCase()+')':SET.quality.toUpperCase());
    $('msound').textContent='SOUND: '+(SET.sound?'ON':'OFF');$('msens').textContent='LOOK SPEED: '+SET.sens.toFixed(1)+'x';$('msens').style.display=touchy?'':'none';
    $('mexit').style.display=EMBED?'':'none';m.style.display=G.paused?'flex':'none';},
  dev(){if(!DEV)return;const i=R.info.render;$('dev').textContent=Math.round(1/Math.max(1e-3,G.fdt))+' fps  '+QL+' x'+DYN.toFixed(2)+'  calls '+i.calls+'  tris '+(i.triangles/1000|0)+'k  veg '+VEGN.inst;}
};
function setupHud(){
  if(touchy)document.body.classList.add('touch');
  const jb=$('bjet');
  jb.addEventListener('touchstart',e=>{e.preventDefault();TS.jet=true;TS.jetHit=true;jb.classList.add('on');},{passive:false});
  const up=e=>{TS.jet=false;jb.classList.remove('on');};jb.addEventListener('touchend',up);jb.addEventListener('touchcancel',up);
  $('bview').onclick=e=>{e.stopPropagation();cycleView();};
  $('bpause').onclick=e=>{e.stopPropagation();if(G.mode==='play')setPause(!G.paused);};
  $('mresume').onclick=()=>setPause(false);
  $('mview').onclick=()=>{cycleView();HUD.menu();};
  $('mqual').onclick=()=>{const o=['auto','low','med','high'];SET.quality=o[(o.indexOf(SET.quality)+1)%o.length];store.set('quality',SET.quality);
    setQuality(SET.quality==='auto'?(touchy?'med':'high'):SET.quality);HUD.menu();};
  $('msound').onclick=()=>{SET.sound=!SET.sound;store.set('sound',SET.sound?1:0);HUD.menu();};
  $('msens').onclick=()=>{const o=[.6,.8,1,1.3,1.7];SET.sens=o[(o.indexOf(SET.sens)+1)%o.length]||1;store.set('sens',SET.sens);HUD.menu();};
  $('mexit').onclick=()=>ARC.exit();
  HUD.view(SET.view);
}
