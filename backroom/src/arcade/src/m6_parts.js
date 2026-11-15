/* =====================================================================================
   THE BACK ROOM'S OWN MACHINES
   - Handheld: a giant handheld on a pedestal, for What the Map Forgot (the design follows the game's own handheld)
   - Panel: a lit board in the X Room; READ opens it as a card
   - ArtFrame: a framed picture in the gallery; VIEW opens it full size
   - SealedDoor: the door to the main floor, closed for now
   Every one is a Machine, so walking up, the prompt, the camera move and the ← Arcade button all work as on the floor.
   ===================================================================================== */
/* a camera square in front of a flat thing at local centre c, sized to fit w x h */
function flatCam(a,c,w,h,fov=40,m=1.12){
  const p=a.W(...c),n=a.Dir(0,0,1),d=fitDist(w,h,fov,20,m);
  return ()=>({eye:[p[0]+n[0]*d,p[1]+n[1]*d,p[2]+n[2]*d],tgt:p,fov});
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
/* a cylinder whose axis runs along local z (buttons, rounded corners) */
function zCyl(mb,x,y,z0,z1,r,col,e=0,seg=16){mb.push();mb.tr(x,y,z0);mb.rx(Math.PI/2);mb.cyl(0,-(z1-z0),0,r,z1-z0,seg,col,e);mb.pop();}
/* a slab with rounded corners in the x-y plane, from z0 to z1 */
function roundSlab(mb,cx,cy,w,h,r,z0,z1,col,e=0){
  const zc=(z0+z1)/2,d=z1-z0;
  mb.box(cx,cy,zc,w-2*r,h,d,col,e);mb.box(cx,cy,zc,w,h-2*r,d,col,e);
  for(const sx of [-1,1])for(const sy of [-1,1])zCyl(mb,cx+sx*(w/2-r),cy+sy*(h/2-r),z0,z1,r,col,e,14);
}

/* ---------- the giant handheld ---------- */
function Handheld(o){
  const a=Machine(o),T=a.T;
  const SW=.8,SH=.533,SY=1.56,FZ=.12;
  a.addScreen(o.game.id,o.res||[192,128],[0,SY,FZ+.006],0,SW,SH,{gain:2.3,col:o.col||'#ffb46a'});
  const gp=a.W(0,1.4,.9),glow=lightAt(gp[0],1.4,gp[2],3.2,o.glow||[1,.6,.3],.8);
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const body=C_(o.body||'#2c3246'),rim=C_(o.rim||'#3c4360'),dark=C_('#141824'),bez=C_('#0d1018'),trim=C_(o.trim||'#ff9a3a');
    /* the pedestal: a black plinth with a chrome lip and a line of light */
    mb.fin(.7,0);mb.box(0,.17,0,.96,.34,.5,hex('#0c0a12'));
    mb.fin(.9,1);mb.box(0,.345,0,1.0,.02,.54,CHROME);mb.fin(0,0);mb.tube([-.48,.05,.255],[.48,.05,.255],.008,trim,2.6);
    /* the body: a rounded slab, a lighter rim behind it */
    mb.fin(.25,0);roundSlab(mb,0,1.17,1.08,1.62,.16,-.13,-.09,rim);
    mb.fin(.35,0);roundSlab(mb,0,1.17,1.04,1.58,.15,-.1,FZ,body);
    /* the screen's bezel, with a power light */
    mb.fin(.5,0);roundSlab(mb,0,SY,.92,.66,.05,FZ-.004,FZ+.004,bez);
    mb.fin(0,0);mb.sphere(-.39,SY+.27,FZ+.008,.012,hex('#ff3030'),3,0);
    /* the d-pad, A and B, the menu pill, a speaker grille */
    mb.fin(.3,0);mb.box(-.27,.9,FZ+.02,.26,.08,.04,dark);mb.box(-.27,.9,FZ+.02,.08,.26,.04,dark);
    mb.box(-.27,.9,FZ+.042,.05,.05,.004,hex('#232838'));
    mb.fin(.6,0);zCyl(mb,.31,.96,FZ,FZ+.05,.075,C_('#ff8a2e'),.5,20);zCyl(mb,.13,.84,FZ,FZ+.05,.065,dark,0,20);
    mb.fin(.3,0);mb.box(0,.62,FZ+.012,.18,.045,.02,hex('#3a4052'));
    mb.fin(0,0);for(let i=0;i<4;i++)for(let j=0;j<3;j++)mb.box(.24+i*.045,.5+j*.045,FZ+.002,.018,.018,.004,hex('#0a0c12'));
    mb.pop();
    /* the game's name under the screen */
    texQuad(T,[[-.4,1.13,FZ+.003],[.4,1.13,FZ+.003],[.4,1.23,FZ+.003],[-.4,1.23,FZ+.003]],marqueeTex(o.marq||o.name.toUpperCase(),'#0d1018','#0d1018',GRAD.amber),1.6);
    const p0=a.W(-.58,0,-.3),p1=a.W(.58,0,.3);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  a.onIdle=()=>{glow.k=.7+.15*Math.sin(W_.t*1.1+a.x);};
  return a;
}

/* ---------- a panel in the X Room ---------- */
function Panel(o){
  const BW=.92,BH=1.3,CY=1.58;
  const a=Machine(Object.assign({useZ:.95},o));a.verb='READ';
  const paras=o.body;
  a.game={id:'panel-'+o.id,title:o.title,panel:'<article class="card"><h2>'+esc(o.title)+'</h2>'+paras.map(p=>'<p>'+esc(p)+'</p>').join('')+'<footer>Hyperdot Arcade · the X Room</footer></article>'};
  /* the board: the title in dots, then the words */
  const cv=mkCanvas(512,724),g=cv.getContext('2d');
  let gr=g.createLinearGradient(0,0,0,724);gr.addColorStop(0,'#140b26');gr.addColorStop(1,'#07050e');g.fillStyle=gr;g.fillRect(0,0,512,724);
  g.strokeStyle=o.col||'#2fe6ff';g.globalAlpha=.6;g.lineWidth=2;g.strokeRect(10,10,492,704);g.globalAlpha=1;
  const words=o.title.toUpperCase(),sc=words.length>14?3:4;
  gradText(g,words,256,34,sc,o.cols||GRAD.cyan,'c');
  g.fillStyle='#e6dcf6';g.font='400 21px system-ui,-apple-system,"Segoe UI",sans-serif';g.textBaseline='top';
  let y=34+7*sc+30;const LH=30,MX=440;
  outer:for(const p of paras){let line='';
    for(const w of p.split(' ')){const t=line?line+' '+w:w;if(g.measureText(t).width>MX&&line){g.fillText(line,36,y);y+=LH;line=w;if(y>650)break outer;}else line=t;}
    if(line){g.fillText(line,36,y);y+=LH;}y+=12;if(y>650)break;}
  if(y>650){g.fillStyle='#a99ec0';g.fillText('…',36,660);}
  g.fillStyle='#a99ec0';g.font='600 14px system-ui,sans-serif';g.fillText('READ  ▸',412,686);
  const tex=texFrom(cv,false);
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,a.T);
    mb.fin(.6,0);mb.box(0,CY,.012,BW+.1,BH+.1,.024,hex('#0a0810'));
    mb.fin(.9,1);const z=.03,hw=BW/2+.03,hh=BH/2+.03;
    for(const [p,q] of [[[-hw,CY-hh,z],[hw,CY-hh,z]],[[-hw,CY+hh,z],[hw,CY+hh,z]],[[-hw,CY-hh,z],[-hw,CY+hh,z]],[[hw,CY-hh,z],[hw,CY+hh,z]]])mb.tube(p,q,.016,CHROME,0,6);
    mb.fin(0,0);mb.tube([-hw,CY-hh-.05,z],[hw,CY-hh-.05,z],.006,hex(o.col||'#2fe6ff'),3);
    mb.pop();
    texQuad(a.T,[[-BW/2,CY-BH/2,.026],[BW/2,CY-BH/2,.026],[BW/2,CY+BH/2,.026],[-BW/2,CY+BH/2,.026]],tex,.95);
  };
  const lp=a.W(0,CY+.3,.8);lightAt(lp[0],lp[1],lp[2],2.4,[.6,.6,1],.4);
  a.cam=flatCam(a,[0,CY,.026],BW,BH,40,1.1);
  return a;
}

/* ---------- a framed picture in the gallery ---------- */
function ArtFrame(o){
  const w=o.w,h=o.h,CY=o.y||1.72;
  const a=Machine(Object.assign({useZ:.95},o));a.verb='VIEW';
  a.game={id:'art-'+o.id,title:o.title,panel:'<figure class="art"><img'+(o.pixel?' class="px"':'')+' src="'+esc(o.src)+'" alt="'+esc(o.title)+'"><figcaption><b>'+esc(o.title)+'</b>'+esc(o.cap||'')+'</figcaption></figure>'};
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,a.T);
    const gold=hex(o.frame||'#c8a24a'),k=.07;
    mb.fin(.6,0);mb.box(0,CY,.015,w+.06,h+.06,.03,hex('#0a0810'));
    mb.fin(.75,1);mb.box(0,CY+h/2+k/2,.035,w+2*k,k,.05,gold);mb.box(0,CY-h/2-k/2,.035,w+2*k,k,.05,gold);
    mb.box(-w/2-k/2,CY,.035,k,h,.05,gold);mb.box(w/2+k/2,CY,.035,k,h,.05,gold);
    /* a picture light over it */
    mb.fin(.8,1);mb.tube([0,CY+h/2+k,.03],[0,CY+h/2+k+.09,.16],.012,CHROME);mb.box(0,CY+h/2+k+.1,.2,Math.min(.6,w*.5),.04,.07,CHROME);
    mb.fin(0,0);mb.box(0,CY+h/2+k+.075,.2,Math.min(.56,w*.46),.008,.04,hex('#fff2d8'),3);
    mb.pop();
    const ph=new MB();ph.m=mmul(ph.m,a.T);ph.quad([-w/2,CY-h/2,.032],[w/2,CY-h/2,.032],[w/2,CY+h/2,.032],[-w/2,CY+h/2,.032],[1,1,1],0,QUV);
    const entry={mesh:mesh(ph),tex:null,mode:3,emi:o.emi||.9};
    imgCrop(o.src,w/h,t=>{entry.tex=t;TEXMESH.push(entry);},1024);
  };
  const lp=a.W(0,CY+.2,.9);lightAt(lp[0],lp[1],lp[2],2.6,[1,.9,.75],.45);
  a.cam=flatCam(a,[0,CY,.032],w,h,40,1.12);
  return a;
}

/* ---------- the door to the main floor, sealed for now ---------- */
function SealedDoor(o){
  const a=Machine(Object.assign({useZ:1.1},o));a.verb='LOOK';
  a.game={id:'door',title:'Main floor',panel:'<article class="card"><h2>Main floor</h2>'+
    ['This door opens onto the main floor of Hyperdot Arcade.','It stays sealed while the back room is being built. When it opens, you’ll walk straight from here onto the floor.'].map(p=>'<p>'+p+'</p>').join('')+'<footer>Hyperdot Arcade · the back room</footer></article>'};
  /* frosted glass: the floor's neon, blurred, behind it */
  const c=mkCanvas(512,400),g=c.getContext('2d');
  let gr=g.createLinearGradient(0,0,0,400);gr.addColorStop(0,'#0a0618');gr.addColorStop(1,'#1a0c2a');g.fillStyle=gr;g.fillRect(0,0,512,400);
  g.filter='blur(9px)';
  const glow=[['#ff2f9a',40,90,60,120],['#2fe6ff',130,110,50,100],['#ffd23f',215,80,56,130],['#b47aff',300,100,50,110],['#ff7a2e',380,90,58,120],['#2fe6ff',455,110,46,100]];
  for(const [col,x,y,w,hh] of glow){g.fillStyle=col;g.globalAlpha=.7;g.fillRect(x,y,w,hh*.55);g.globalAlpha=.35;g.fillRect(x-6,y+hh*.6,w+12,hh*.9);}
  g.globalAlpha=.6;g.fillStyle='#ff2f9a';g.fillRect(150,24,212,22);g.globalAlpha=1;g.filter='none';
  for(let i=0;i<2600;i++){g.fillStyle='rgba(255,255,255,'+(Math.random()*.06)+')';g.fillRect(Math.random()*512,Math.random()*400,1.5,1.5);}
  gr=g.createLinearGradient(0,0,512,0);gr.addColorStop(0,'rgba(255,255,255,.04)');gr.addColorStop(.5,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(255,255,255,.03)');g.fillStyle=gr;g.fillRect(0,0,512,400);
  const tex=texFrom(c,false);
  a.build=mb=>{
    texQuad(a.T,[[-1.5,0,.03],[1.5,0,.03],[1.5,2.3,.03],[-1.5,2.3,.03]],tex,.8);
    mb.push();mb.m=mmul(mb.m,a.T);
    const chrome=CHROME,trimC=hex('#2fe6ff');
    mb.fin(.9,1);
    for(const [p,q] of [[[-1.55,0,.06],[-1.55,2.35,.06]],[[1.55,0,.06],[1.55,2.35,.06]],[[-1.55,2.35,.06],[1.55,2.35,.06]],[[0,0,.06],[0,2.35,.06]]])mb.tube(p,q,.035,chrome,0,6);
    for(const sx of [-1,1])mb.tube([sx*.12,.95,.11],[sx*.12,1.5,.11],.014,chrome,0,6);
    mb.tube([-1.35,1.05,.1],[-.25,1.05,.1],.016,chrome,0,6);mb.tube([.25,1.05,.1],[1.35,1.05,.1],.016,chrome,0,6);
    mb.fin(0,0);for(const [p,q] of [[[-1.62,0,.08],[-1.62,2.42,.08]],[[1.62,0,.08],[1.62,2.42,.08]],[[-1.62,2.42,.08],[1.62,2.42,.08]]])mb.tube(p,q,.012,trimC,3);
    neon2(mb,'MAIN FLOOR',[0,2.62,.08],[1,0,0],.05,hex('#ff2f9a'),4);
    neon2(mb,'CONNECTING SOON',[0,1.2,.12],[1,0,0],.016,hex('#ffd23f'),3.4);
    mb.pop();
  };
  const lp=a.W(0,1.6,.9);lightAt(lp[0],lp[1],lp[2],4,[.8,.35,.9],.5);
  a.cam=flatCam(a,[0,1.35,.03],3.2,2.6,45,1.08);
  return a;
}
