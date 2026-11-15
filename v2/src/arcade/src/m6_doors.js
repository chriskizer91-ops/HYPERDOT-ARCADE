/* =====================================================================================
   DOORS BETWEEN THE ARCADE'S ROOMS
   The main floor (v2/) and the back room (backroom/) are two pages. A Doorway is the door between them:
   a pair of frosted glass doors with the next room's lights behind the glass and its name in neon above.
   Walk up and press ENTER: the picture fades and the next room's page opens.
   The link carries ?from=<this room>, and the next room's floor plan says in ARRIVE where that door is,
   so you arrive standing at it and the pinball intro doesn't play.
   Both rooms' builds read this file.
   ===================================================================================== */
function Doorway(o){
  const a=Machine(Object.assign({useZ:1.1,transT:3},o));a.verb='ENTER';a.controls='door';
  /* frosted glass: the next room's neon, blurred, behind it */
  const c=mkCanvas(512,400),g=c.getContext('2d');
  let gr=g.createLinearGradient(0,0,0,400);gr.addColorStop(0,'#0a0618');gr.addColorStop(1,'#1a0c2a');g.fillStyle=gr;g.fillRect(0,0,512,400);
  g.filter='blur(9px)';
  const glow=[['#ff2f9a',40,90,60,120],['#2fe6ff',130,110,50,100],['#ffd23f',215,80,56,130],['#b47aff',300,100,50,110],['#ff7a2e',380,90,58,120],['#2fe6ff',455,110,46,100]];
  for(const [col,x,y,w,hh] of glow){g.fillStyle=col;g.globalAlpha=.7;g.fillRect(x,y,w,hh*.55);g.globalAlpha=.35;g.fillRect(x-6,y+hh*.6,w+12,hh*.9);}
  g.globalAlpha=.6;g.fillStyle=o.col||'#ff2f9a';g.fillRect(150,24,212,22);g.globalAlpha=1;g.filter='none';
  let sd=11;const R=()=>(sd=(sd*16807)%2147483647)/2147483647;
  for(let i=0;i<2600;i++){g.fillStyle='rgba(255,255,255,'+(R()*.06)+')';g.fillRect(R()*512,R()*400,1.5,1.5);}
  gr=g.createLinearGradient(0,0,512,0);gr.addColorStop(0,'rgba(255,255,255,.04)');gr.addColorStop(.5,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(255,255,255,.03)');g.fillStyle=gr;g.fillRect(0,0,512,400);
  const tex=texFrom(c,false);
  a.build=mb=>{
    texQuad(a.T,[[-1.5,0,.03],[1.5,0,.03],[1.5,2.3,.03],[-1.5,2.3,.03]],tex,.8);
    mb.push();mb.m=mmul(mb.m,a.T);
    mb.fin(.9,1);
    for(const [p,q] of [[[-1.55,0,.06],[-1.55,2.35,.06]],[[1.55,0,.06],[1.55,2.35,.06]],[[-1.55,2.35,.06],[1.55,2.35,.06]],[[0,0,.06],[0,2.35,.06]]])mb.tube(p,q,.035,CHROME,0,6);
    for(const sx of [-1,1])mb.tube([sx*.12,.95,.11],[sx*.12,1.5,.11],.014,CHROME,0,6);
    mb.tube([-1.35,1.05,.1],[-.25,1.05,.1],.016,CHROME,0,6);mb.tube([.25,1.05,.1],[1.35,1.05,.1],.016,CHROME,0,6);
    mb.fin(0,0);for(const [p,q] of [[[-1.62,0,.08],[-1.62,2.42,.08]],[[1.62,0,.08],[1.62,2.42,.08]],[[-1.62,2.42,.08],[1.62,2.42,.08]]])mb.tube(p,q,.012,hex('#2fe6ff'),3);
    neon2(mb,o.label,[0,2.62,.08],[1,0,0],.05,hex(o.col||'#ff2f9a'),4);
    mb.pop();
  };
  const lp=a.W(0,1.6,.9);lightAt(lp[0],lp[1],lp[2],4,[.8,.35,.9],.5);
  /* the camera closes on the doors while the picture fades */
  {const p=a.W(0,1.35,.03),n=a.Dir(0,0,1),d=fitDist(3.2,2.6,45,20,1.08);a.cam=()=>({eye:[p[0]+n[0]*d,p[1]+n[1]*d,p[2]+n[2]*d],tgt:p,fov:45});}
  a.start=()=>goThrough(o.to);
  return a;
}
let THRU=null;
function goThrough(url){
  if(!THRU){THRU=document.createElement('div');THRU.style.cssText='position:fixed;inset:0;background:#000;opacity:0;transition:opacity .45s ease;z-index:60;pointer-events:none';document.body.appendChild(THRU);
    /* coming back with the browser's Back button, the page can return exactly as it was left: black, mid-step. Put it right. */
    addEventListener('pageshow',e=>{if(!e.persisted)return;THRU.style.opacity=0;if(W_.mode==='enter'){W_.mode='walk';W_.active=null;W_.near=null;CH_.hidden=false;}});}
  requestAnimationFrame(()=>{THRU.style.opacity=1;});
  setTimeout(()=>{location.href=url;},500);
}
