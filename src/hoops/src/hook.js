/*@@HOOK*/
/* test hook (stripped from the published build): fast-forward the fixed-step sim, inspect state, drive the bot */
window.__game={S,KEY,LATCH,PTR,TS,FS,flickVel,SFX,AU,CR,TRACKS,setTrack,BALLS,HP,NP,AI,PART,tick,render,physics,fire,handBall,flush,setRes,start:APP_start,attract:APP_attract,
  ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},
  lv(nr){if(!nr)render();return {w:W,h:H,d:Array.from(L)};},
  poses(){lclr(0);const r=15,fl=90;const P=[{mouth:'smile'},{mouth:'grin',armR:2.7,look:[-1,0],turn:-.25},{mouth:'open',walk:1,armL:1.1,armR:-.3,sq:.06},{mouth:'o',blink:.5,sq:.2},{mouth:'flat',sweat:.4,brow:-.6,armR:2.3,look:[.3,-.6]},{mouth:'grin',crown:true,shades:true,armR:2.6}];
    P.forEach((p,i)=>{p.floor=fl;bucky(22+i*42,fl-r*(1-(p.sq||0))-r*.62,r,p);});},
  lab(tx,m,hx){newRun(true);S.mode='play';S.canShoot=false;HP.x=HP.tx=hx||0;rimUpdate();netReset();const b=BALLS[0];b.st='hand';S.handX=0;fire(b,tx,m,'lab');
    const s0=S.baskets;let t=0,vin=0,vout=0,sc=false;while(t<5&&b.st==='fly'){physics(1/60);t+=1/60;if(!sc&&b.scored){sc=true;vin=b.vy;}}
    return {in:S.baskets>s0,rim:b.rim,brd:b.brd,rimT:+b.rimT.toFixed(3),net:b.net,t:+t.toFixed(2),call:S.calls[0]?S.calls[0].s:''};},
  film(tx,m,hx,n,ev){newRun(true);S.mode='play';S.demo=false;S.canShoot=false;HP.x=HP.tx=hx||0;rimUpdate();netReset();const b=BALLS[0];b.st='hand';S.handX=0;fire(b,tx,m,'lab');
    const fr=[];for(let i=0;i<n;i++){for(let k=0;k<(ev||3);k++){fxTick(1/60);physics(1/60);}render();fr.push(Array.from(L));}return {w:W,h:H,fr,rim:b.rim,brd:b.brd,sc:b.scored};},
  shoot(tx,m){const b=handBall();if(b&&shootable(b)){fire(b,tx,m,'test');return true;}return false;}};
/*@@/HOOK*/