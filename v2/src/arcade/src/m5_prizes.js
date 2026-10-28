/* =====================================================================================
   THE PRIZE COUNTER. Tickets won on the floor are spent here. The counter is a glass case
   with shelves of stock behind it; whatever you redeem goes on YOUR SHELF beside it and
   stays there between visits. Walk up and press E (or tap) to open the counter.
   ===================================================================================== */
const PRIZES=[
  {id:'ball',name:'Bouncy Ball',cost:25,note:'Goes higher than you think.'},
  {id:'glow',name:'Glow Sticks',cost:40,note:'Three of them. Snap to light.'},
  {id:'duck',name:'Rubber Duck',cost:75,note:'Squeaks. Floats. Judges you.'},
  {id:'yoyo',name:'Light-up Yo-yo',cost:120,note:'Flashes on every throw.'},
  {id:'shades',name:'Pixel Shades',cost:180,note:'Eight bits of cool.'},
  {id:'slinky',name:'Rainbow Spring',cost:260,note:'Walks down stairs, mostly.'},
  {id:'plush',name:'Mini Plush',cost:400,note:'Escaped from the claw.'},
  {id:'lava',name:'Lava Lamp',cost:650,note:'Slow light for a dark room.'},
  {id:'handheld',name:'Pocket Handheld',cost:1000,note:'One game, forever.'},
  {id:'rocket',name:'Tin Rocket',cost:1500,note:'Wind it up and stand back.'},
  {id:'bear',name:'Giant Plush',cost:2500,note:'Needs its own seat home.'},
  {id:'token',name:'Golden Token',cost:5000,note:'Proof you beat the house.'}];
const PZ_OWN=(()=>{try{return JSON.parse(store.get('arcade2-prizes','{}'))||{};}catch(e){return {};}})();

/* each prize, modelled at its real size with its base at the origin, facing +z */
function prizeModel(mb,id,col){
  const c=C_;
  switch(id){
  case 'ball':mb.sphere(0,.06,0,.06,c(col||'#ff3fa4'),.25,1);mb.sphere(-.022,.088,.042,.014,c('#ffd8f0'),.8,0);break;
  case 'glow':[['#7dff6a',-1],['#35e8ff',0],['#ff4fb8',1]].forEach(([k,i])=>{mb.push();mb.tr(i*.028,0,0);mb.rz(i*.2);mb.cyl(0,0,0,.009,.22,8,c(k),2.6);mb.cyl(0,.22,0,.009,.012,8,c('#e8e8f0'),.2);mb.pop();});break;
  case 'duck':mb.sphere(0,.052,0,.066,c('#ffd23f'),.2,1,.72);mb.sphere(0,.118,.028,.042,c('#ffd23f'),.2,1);mb.box(0,.112,.074,.036,.013,.032,c('#ff8a2e'),.3);
    for(const sx of [-1,1])mb.sphere(sx*.018,.132,.06,.007,BLACK,0,0);mb.push();mb.tr(0,.07,-.06);mb.rx(-.6);mb.box(0,0,0,.034,.03,.03,c('#ffd23f'),.2);mb.pop();break;
  case 'yoyo':mb.box(0,.004,0,.07,.008,.05,c('#241a36'));mb.push();mb.tr(0,.062,0);mb.rx(Math.PI/2);
    mb.cyl(0,-.027,0,.055,.022,16,c('#ff2a4a'),.35);mb.cyl(0,.005,0,.055,.022,16,c('#ff2a4a'),.35);mb.cyl(0,-.006,0,.014,.012,8,c('#ddd'));
    mb.cyl(0,-.029,0,.032,.003,14,c('#ffd23f'),2.4);mb.cyl(0,.026,0,.032,.003,14,c('#ffd23f'),2.4);mb.pop();mb.tube([0,.118,0],[0,.27,0],.0025,c('#eee'));mb.sphere(0,.275,0,.009,c('#eee'),0,0);break;
  case 'shades':mb.box(0,.016,0,.05,.032,.04,c('#241a36'));mb.push();mb.tr(0,.06,0);mb.rx(-.15);
    mb.box(0,0,0,.17,.044,.012,BLACK);for(const sx of [-1,1]){mb.box(sx*.043,-.002,.008,.064,.032,.004,c('#35e8ff'),1.7);mb.box(sx*.085,.004,-.05,.008,.01,.1,BLACK);}mb.pop();break;
  case 'slinky':for(let i=0;i<12;i++){const y=.012+i*.0125,h=i/12,col=hsl(h*360,1,.6);for(let k=0;k<14;k++){const f0=k/14*TAU,f1=(k+1)/14*TAU;mb.tube([Math.cos(f0)*.045,y,Math.sin(f0)*.045],[Math.cos(f1)*.045,y,Math.sin(f1)*.045],.005,col,.6);}}break;
  case 'plush':{const p=c(col||'#ff8fc8');mb.sphere(0,.07,0,.07,p,.15,1);mb.sphere(0,.158,.01,.055,p,.15,1);for(const sx of [-1,1]){mb.sphere(sx*.04,.205,0,.02,p,.15,1);mb.sphere(sx*.02,.17,.055,.008,BLACK,0,0);
      mb.sphere(sx*.042,.02,.045,.026,p,.15,1);mb.sphere(sx*.066,.09,.02,.025,p,.15,1);}mb.sphere(0,.155,.062,.011,c('#3a1a24'),0,0);mb.sphere(0,.075,.066,.022,c('#fff0f6'),.2,0);break;}
  case 'lava':mb.cyl(0,0,0,.052,.06,12,c('#c3c9d6'),.15,.032);mb.cyl(0,.06,0,.032,.16,12,c('#ff4a1a'),.9,.022);
    mb.sphere(0,.1,0,.017,c('#ffd23f'),2.6,0);mb.sphere(.006,.165,0,.012,c('#ffd23f'),2.6,0);mb.sphere(-.006,.135,.004,.009,c('#ffe08a'),2.6,0);mb.cyl(0,.22,0,.022,.04,12,c('#c3c9d6'),.15,.012);break;
  case 'handheld':mb.box(0,.01,.0,.07,.02,.06,c('#241a36'));mb.push();mb.tr(0,.02,0);mb.rx(-.22);mb.box(0,.083,0,.1,.165,.026,c('#c9c6d4'),.08);
    mb.box(0,.118,.014,.072,.062,.004,c('#7dff6a'),1.7);mb.box(-.025,.05,.014,.032,.01,.006,c('#1a1a22'));mb.box(-.025,.05,.014,.01,.032,.006,c('#1a1a22'));
    mb.sphere(.02,.056,.014,.008,c('#ff2a4a'),.6,0);mb.sphere(.036,.046,.014,.008,c('#ff2a4a'),.6,0);mb.pop();break;
  case 'rocket':mb.cyl(0,.0,0,0,.05,10,c('#ff9a2e'),3,.024);mb.cyl(0,.05,0,.036,.17,12,c('#d8dde8'),.15);mb.cyl(0,.22,0,.036,.075,12,c('#ff2a4a'),.25,0);
    mb.sphere(0,.16,.032,.013,c('#35e8ff'),1.6,0);for(let k=0;k<3;k++){mb.push();mb.ry(k*TAU/3+.5);mb.box(0,.08,.046,.006,.07,.036,c('#ff2a4a'),.25);mb.pop();}break;
  case 'bear':mb.push();mb.sc(3.4);prizeModel(mb,'plush',col||'#6fd0ff');mb.pop();mb.push();mb.tr(0,.27,.235);mb.sphere(-.03,0,0,.04,c('#ff3fa4'),.6,0);mb.sphere(.03,0,0,.04,c('#ff3fa4'),.6,0);mb.sphere(0,-.035,0,.034,c('#ff3fa4'),.6,0);mb.pop();break;
  case 'token':mb.box(0,.015,0,.09,.03,.06,c('#4a2a1a'));mb.push();mb.tr(0,.125,0);mb.rx(Math.PI/2);mb.cyl(0,-.011,0,.09,.022,24,c('#f2c45a'),.7);mb.cyl(0,-.013,0,.075,.026,24,c('#ffd86a'),.9);mb.pop();
    for(const sx of [-1,1])mb.box(sx*.026,.125,.014,.012,.07,.004,c('#fff3c4'),1.4);mb.box(0,.125,.014,.05,.012,.004,c('#fff3c4'),1.4);break;
  }
}
function hsl(h,s,l){const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1));return [f(0),f(8),f(4)].map(v=>Math.pow(v,2.2));}

/* a dot-matrix picture of each prize for the counter's list: drawn at 16x16, shown as lit dots */
function prizeIcon(id){
  const s=mkCanvas(16,16),g=s.getContext('2d');g.imageSmoothingEnabled=false;
  const C=(c)=>g.fillStyle=c,R=(x,y,w,h)=>g.fillRect(x,y,w,h),O=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,TAU);g.fill();};
  switch(id){
  case 'ball':C('#ff3fa4');O(8,8.5,6);C('#ffd8f0');R(5,5,2,2);break;
  case 'glow':g.lineWidth=2;[['#7dff6a',3],['#35e8ff',7],['#ff4fb8',11]].forEach(([c,x])=>{g.strokeStyle=c;g.beginPath();g.moveTo(x,14);g.lineTo(x+3,2);g.stroke();});break;
  case 'duck':C('#ffd23f');O(7,10.5,5);O(10,5.5,3.2);C('#ff8a2e');R(12,5,3,2);C('#000');R(10,4,1,1);break;
  case 'yoyo':C('#eee');R(8,1,1,5);C('#ff2a4a');O(8,10,5.5);C('#ffd23f');O(8,10,2.6);C('#ff2a4a');O(8,10,1.2);break;
  case 'shades':C('#111');R(1,6,14,2);C('#35e8ff');R(2,7,5,4);R(9,7,5,4);C('#111');R(7,7,2,1);break;
  case 'slinky':for(let i=0;i<6;i++){C(`hsl(${i*60},100%,60%)`);R(3,2+i*2,10,1);R(2,3+i*2,12,1);}break;
  case 'plush':C('#ff8fc8');O(4,4,2.5);O(12,4,2.5);O(8,8.5,5.5);C('#000');R(6,7,1,1);R(10,7,1,1);C('#3a1a24');R(7,10,2,1);break;
  case 'lava':C('#c3c9d6');R(5,13,6,2);R(6,1,4,2);C('#ff4a1a');R(6,3,4,10);R(5,6,6,5);C('#ffd23f');R(7,9,2,2);R(8,5,2,2);break;
  case 'handheld':C('#c9c6d4');R(3,1,10,14);C('#7dff6a');R(5,3,6,5);C('#222');R(5,10,3,1);R(6,9,1,3);C('#ff2a4a');R(10,10,1,1);R(11,11,1,1);break;
  case 'rocket':C('#ff2a4a');R(7,1,2,2);R(6,3,4,1);C('#d8dde8');R(6,4,4,8);C('#35e8ff');R(7,6,2,2);C('#ff2a4a');R(4,9,2,3);R(10,9,2,3);C('#ff9a2e');R(7,12,2,3);break;
  case 'bear':C('#6fd0ff');O(4,3.5,2.5);O(12,3.5,2.5);O(8,7,4.8);O(8,13,3.5);C('#000');R(6,6,1,1);R(10,6,1,1);C('#ff3fa4');R(7,12,2,2);break;
  case 'token':C('#f2c45a');O(8,8,7);C('#ffd86a');O(8,8,5.5);C('#fff3c4');R(5,5,1,6);R(10,5,1,6);R(6,8,4,1);break;
  }
  const d=g.getImageData(0,0,16,16).data,o=mkCanvas(64,64),h=o.getContext('2d');
  h.fillStyle='#07060b';h.fillRect(0,0,64,64);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4,a=d[i+3]/255;
    h.fillStyle=a>.35?`rgb(${d[i]},${d[i+1]},${d[i+2]})`:'rgba(255,255,255,.055)';h.beginPath();h.arc(x*4+2,y*4+2,a>.35?1.7:1.1,0,TAU);h.fill();}
  return o.toDataURL();
}

function PrizeCounter(o){
  const a=Machine(Object.assign({useZ:.95,minH:30},o)),T=a.T;a.controls='menu';a.sub='Spend your tickets';
  const lp=a.W(0,2.6,-.4),Lw=lightAt(lp[0],2.5,lp[2],4.2,[1,.85,.6],1.0),lp2=a.W(0,1.4,.9),Lf=lightAt(lp2[0],1.5,lp2[2],3,[1,.45,.75],.6);
  const wood=C_('#2a1c3c'),deep=C_('#160f24'),gold=C_('#ffd23f'),pink=C_('#ff3fa4'),cyan=C_('#35e8ff');
  const SH=[.55,1.0,1.45,1.9],BZ=-1.12;
  const STOCK=[[['ball',4],['glow',3],['duck',3],['yoyo',3]],[['shades',3],['slinky',3],['plush',4]],[['lava',3],['handheld',3],['rocket',3]],[['plush',6],['duck',4]]];
  const PCOL=['#ff8fc8','#8fd8ff','#ffd23f','#b8ff9a','#c9a0ff','#ff9a6a'];
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    /* the glass case at the front */
    mb.box(0,.35,0,3.2,.7,.62,deep);mb.box(0,.71,0,3.16,.02,.58,C_('#3a2a50'),.1);
    for(const [p,q] of [[[-1.6,1.02,.31],[1.6,1.02,.31]],[[-1.6,1.02,-.31],[1.6,1.02,-.31]],[[-1.6,1.02,.31],[-1.6,1.02,-.31]],[[1.6,1.02,.31],[1.6,1.02,-.31]]])mb.tube(p,q,.012,C_('#c3c9d6'),.3);
    for(const sx of [-1.6,-.53,.53,1.6])for(const sz of [-.31,.31])mb.tube([sx,.71,sz],[sx,1.02,sz],.01,C_('#c3c9d6'),.3);
    mb.tube([-1.6,.04,.32],[1.6,.04,.32],.012,pink,3);mb.tube([-1.6,.7,.322],[1.6,.7,.322],.01,gold,2.4);
    for(let i=0;i<14;i++){const x=-1.45+i*.22;mb.push();mb.tr(x,.72,.05*((i%3)-1));prizeModel(mb,i%2?'ball':'glow',PCOL[i%6]);mb.pop();}
    /* the register and the bell */
    mb.box(1.15,1.12,-.05,.36,.2,.3,C_('#2a2440'));mb.push();mb.tr(1.15,1.24,.03);mb.rx(-.5);mb.box(0,0,0,.3,.14,.02,BLACK);mb.box(0,0,.011,.26,.1,.004,C_('#ffd23f'),1.6);mb.pop();
    mb.cyl(-1.2,1.02,.05,.06,.012,14,C_('#2a2a32'));mb.sphere(-1.2,1.035,.05,.05,C_('#d8a64a'),.4,1,.7);mb.cyl(-1.2,1.07,.05,.008,.02,8,C_('#d8a64a'),.4);
    /* the shelving behind */
    mb.box(0,1.35,BZ-.17,3.5,2.7,.04,C_('#1d1530'));for(const sx of [-1.75,1.75])mb.box(sx,1.35,BZ,.05,2.7,.36,wood);
    mb.box(0,2.72,BZ,3.55,.06,.38,wood);
    SH.forEach((y,k)=>{mb.box(0,y,BZ,3.45,.03,.34,C_('#3a2a50'));mb.tube([-1.72,y-.02,BZ+.175],[1.72,y-.02,BZ+.175],.007,[pink,cyan,gold,pink][k],2.6);
      const row=STOCK[k],tot=row.reduce((s,r)=>s+r[1],0);let i=0;
      for(const [id,n] of row)for(let j=0;j<n;j++,i++){const x=-1.55+(i+.5)/tot*3.1;mb.push();mb.tr(x,y+.015,BZ+.02*((i%2)?1:-1));prizeModel(mb,id,PCOL[(i+k)%6]);mb.pop();}});
    /* the giant ones sit on top */
    for(const [x,cl] of [[-1.15,'#6fd0ff'],[1.15,'#ff8fc8']]){mb.push();mb.tr(x,2.75,BZ);prizeModel(mb,'bear',cl);mb.pop();}
    mb.push();mb.tr(0,2.75,BZ+.05);mb.sc(2.2);prizeModel(mb,'token');mb.pop();
    mb.pop();
    /* price tags along each shelf edge */
    SH.forEach((y,k)=>{const row=STOCK[k],tot=row.reduce((s,r)=>s+r[1],0),cv=mkCanvas(512,24),g=cv.getContext('2d');g.fillStyle='#0d0918';g.fillRect(0,0,512,24);let i=0;
      for(const [id,n] of row){const P=PRIZES.find(p=>p.id===id),mid=(i+n/2)/tot;i+=n;txt5(g,fmt(P.cost),Math.round(mid*512),5,'#ffd23f',2,'c');}
      texQuad(T,[[-1.725,y-.07,BZ+.172],[1.725,y-.07,BZ+.172],[1.725,y-.017,BZ+.172],[-1.725,y-.017,BZ+.172]],texFrom(cv,false),1.5);});
    const p0=a.W(-1.7,0,-1.35),p1=a.W(1.7,0,.36);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
  };
  /* framed so the counter and your shelf sit clear of the list: left of it on a wide screen, above it on a phone */
  a.cam=()=>{const sheet=innerWidth<=640||(innerHeight<=420&&innerWidth<=900);
    return sheet?{eye:[-9.9,2.5,6.4],tgt:[-10.1,.9,11.2],fov:62}:{eye:[-9.15,1.8,6.55],tgt:[-11.2,1.25,11.2],fov:58};};
  a.start=()=>{};a.update=()=>{if(!PZ.open)prizeOpen();};a.stop=()=>prizeClose();
  a.onIdle=()=>{Lw.k=.95+.05*Math.sin(W_.t*.7);Lf.k=.55+.1*Math.sin(W_.t*1.9);};
  return a;
}

/* YOUR SHELF: a glass case of what you have won, one slot for each prize */
function YourShelf(o){
  const T=chain(mT(o.x,0,o.z),mRY(o.ry||0)),SL=[];let ownM=null,tags=[];
  const rows=[['ball','glow','duck'],['yoyo','shades','slinky'],['plush','lava','handheld'],['rocket','token']],YS=[.42,.86,1.3,1.74];
  rows.forEach((r,k)=>r.forEach((id,i)=>SL.push({id,x:(i-(r.length-1)/2)*.42,y:YS[k]})));
  const a={name:'Your shelf',sub:'Everything you have won',controls:'none',use:{x:1e9,z:1e9,face:0},idle(){},drawScreens(){},
    draw(){if(ownM)drawLit(ownM,m4());}};
  const lp=xf(T,0,1.6,.6),L=lightAt(lp[0],1.7,lp[2],2.6,[.55,.8,1],.75);
  a.rebuild=()=>{const mb=new MB();mb.m=mmul(mb.m,T);
    for(const s of SL)if(PZ_OWN[s.id]>0){mb.push();mb.tr(s.x,s.y+.015,0);prizeModel(mb,s.id);mb.pop();}
    if(PZ_OWN.bear>0){mb.push();mb.tr(1.05,0,.1);mb.ry(-.35);prizeModel(mb,'bear');mb.pop();}
    if(ownM)gl.deleteVertexArray(ownM.vao);ownM=mb.d.length?mesh(mb):null;
    /* the little plates under each slot: the prize's name, and how many */
    rows.forEach((r,k)=>{const cv=mkCanvas(256,20),g=cv.getContext('2d');g.fillStyle='#0d0918';g.fillRect(0,0,256,20);
      r.forEach((id,i)=>{const n=PZ_OWN[id]|0,P=PRIZES.find(p=>p.id===id),cx=Math.round((.5+(i-(r.length-1)/2)*.42/1.26)*256);
        txt3(g,n?(P.name.toUpperCase().split(' ').pop()+(n>1?' x'+n:'')):fmt(P.cost),cx,7,n?'#9ff1ff':'#4a3f66','c');});
      const tex=texFrom(cv,false);if(tags[k]){gl.deleteTexture(tags[k].tex);tags[k].tex=tex;}
      else{const y=YS[k];texQuad(T,[[-.63,y-.06,.2],[.63,y-.06,.2],[.63,y-.015,.2],[-.63,y-.015,.2]],tex,1.4);tags[k]=TEXMESH[TEXMESH.length-1];}});};
  a.build=mb=>{mb.push();mb.m=mmul(mb.m,T);const fr=C_('#1d1530'),cy=C_('#35e8ff');
    mb.box(0,1.05,-.2,1.4,2.1,.04,fr);for(const sx of [-.69,.69])mb.box(sx,1.05,0,.04,2.1,.42,fr);mb.box(0,2.1,0,1.42,.05,.44,fr);mb.box(0,.1,0,1.42,.2,.44,fr);
    for(const y of YS){mb.box(0,y,0,1.34,.02,.4,C_('#2e2446'),.05);mb.tube([-.67,y-.012,.2],[.67,y-.012,.2],.005,cy,2.4);}
    for(const sx of [-.69,.69])mb.tube([sx,.2,.215],[sx,2.08,.215],.008,cy,2.2);
    mb.pop();neon2(WORLD,'YOUR SHELF',xf(T,0,2.22,.12),(()=>{const d=xf(T,1,0,0),b=xf(T,0,0,0);return [d[0]-b[0],0,d[2]-b[2]];})(),.022,hex('#9ff1ff'),3);
    const p0=xf(T,-.75,0,-.25),p1=xf(T,1.45,0,.3);block(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[2],p1[2]),Math.max(p0[2],p1[2]));
    a.rebuild();};
  ATTR.push(a);return a;
}

/* ---------- the counter's list, over the left of the view (a sheet from the bottom on a phone) ---------- */
const PZ={open:false,el:null,list:null,msg:null,shelf:null};
(function prizeDom(){
  const css=document.createElement('style');
  css.textContent=`#pz{position:fixed;top:max(56px,calc(env(safe-area-inset-top,0px) + 52px));bottom:0;right:0;width:min(400px,100%);z-index:12;display:flex;flex-direction:column;gap:12px;
  padding:8px max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) 18px;
  background:linear-gradient(270deg,rgba(7,6,11,.94),rgba(7,6,11,.86) 78%,rgba(7,6,11,0));transform:translateX(104%);transition:transform .38s cubic-bezier(.2,.8,.2,1);pointer-events:auto}
#pz.on{transform:none}
#pz header{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
#pz h2{margin:0;font:700 17px/1.1 var(--f);letter-spacing:.26em;text-transform:uppercase;color:#fff;text-shadow:0 0 12px var(--pink),0 0 26px rgba(255,63,164,.45)}
#pz h2 small{display:block;margin-top:6px;font:500 10px/1.3 var(--f);letter-spacing:.16em;color:var(--ink-2);text-shadow:none}
#pz .bal{font:700 12px/1 var(--f);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2);text-align:right;white-space:nowrap}
#pz .bal b{display:block;margin-top:4px;font-size:22px;letter-spacing:.06em;color:#ffd23f;font-variant-numeric:tabular-nums;text-shadow:0 0 14px rgba(255,210,63,.45)}
#pzm{min-height:18px;font:600 11px/1.4 var(--f);letter-spacing:.14em;text-transform:uppercase;color:#9ff1ff}
#pzl{list-style:none;margin:0;padding:0 4px 0 0;display:flex;flex-direction:column;gap:8px;overflow-y:auto;overscroll-behavior:contain;flex:1;min-height:0;scrollbar-width:thin}
#pzl li{display:grid;grid-template-columns:48px 1fr auto;gap:12px;align-items:center;padding:8px 8px 8px 8px;border-radius:12px;border:1px solid var(--edge);background:rgba(22,16,38,.72)}
#pzl li.got{border-color:rgba(53,232,255,.35)}
#pzl li.flash{animation:pzf .9s}
@keyframes pzf{0%{background:rgba(255,210,63,.35)}100%{background:rgba(22,16,38,.72)}}
#pzl img{width:48px;height:48px;border-radius:8px;display:block}
#pzl b{display:block;font:700 12px/1.15 var(--f);letter-spacing:.12em;text-transform:uppercase;color:var(--ink)}
#pzl small{display:block;margin-top:3px;font:500 11px/1.3 var(--f);letter-spacing:.04em;color:var(--ink-2)}
#pzl em{display:block;margin-top:4px;font:600 10px/1 var(--f);font-style:normal;letter-spacing:.12em;text-transform:uppercase;color:#35e8ff}
#pzl button{min-width:86px;height:40px;padding:0 12px;border-radius:999px;border:0;cursor:pointer;font:700 13px/1 var(--f);letter-spacing:.08em;font-variant-numeric:tabular-nums;
  background:linear-gradient(180deg,#ffe27a,#ffbf1f);color:#241500;box-shadow:0 0 16px rgba(255,210,63,.35)}
#pzl button[aria-disabled=true]{background:rgba(255,255,255,.07);color:var(--ink-2);box-shadow:none;cursor:default}
#pzl button:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
#pz footer{font:500 10px/1.4 var(--f);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)}
@media (max-width:640px),(max-height:420px) and (max-width:900px){
  #pz{top:auto;left:0;width:100%;height:min(60vh,520px);padding:16px 16px max(14px,env(safe-area-inset-bottom,0px));border-top:1px solid var(--edge);border-radius:18px 18px 0 0;
    background:rgba(7,6,11,.94);transform:translateY(104%)}
  #pz footer{display:none}}
@media (prefers-reduced-motion:reduce){#pz{transition:none}#pzl li.flash{animation:none}}
.ui:has(#back:not([hidden])) .tix{opacity:0;pointer-events:none}`;
  document.head.appendChild(css);
  const d=document.createElement('section');d.id='pz';d.setAttribute('aria-label','Prize counter');d.hidden=true;
  d.innerHTML='<header><h2>Prize counter<small>Spend tickets, fill your shelf</small></h2><div class="bal">Tickets<b id="pzb">0</b></div></header><div id="pzm" role="status" aria-live="polite"></div><ul id="pzl"></ul><footer>Esc or Back to leave · arrows to browse</footer>';
  document.body.appendChild(d);PZ.el=d;PZ.list=d.querySelector('#pzl');PZ.msg=d.querySelector('#pzm');
  for(const P of PRIZES){const li=document.createElement('li');li.dataset.id=P.id;
    li.innerHTML=`<img alt="" src="${prizeIcon(P.id)}"><div><b>${P.name}</b><small>${P.note}</small><em></em></div><button type="button"></button>`;
    li.querySelector('button').addEventListener('click',()=>redeem(P,li));PZ.list.appendChild(li);}
  PZ.list.addEventListener('keydown',e=>{if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;e.preventDefault();
    const bs=[...PZ.list.querySelectorAll('button')],i=bs.indexOf(document.activeElement),j=Math.max(0,Math.min(bs.length-1,i+(e.key==='ArrowDown'?1:-1)));bs[j].focus();bs[j].scrollIntoView({block:'nearest'});});
})();
function prizeRefresh(){
  $('pzb').textContent=fmt(W_.tickets);
  for(const li of PZ.list.children){const P=PRIZES.find(p=>p.id===li.dataset.id),n=PZ_OWN[P.id]|0,b=li.querySelector('button'),short=P.cost-W_.tickets;
    b.textContent=fmt(P.cost);b.setAttribute('aria-disabled',short>0?'true':'false');
    b.setAttribute('aria-label',short>0?`${P.name}, ${fmt(P.cost)} tickets, ${fmt(short)} more needed`:`Redeem ${P.name} for ${fmt(P.cost)} tickets`);
    li.classList.toggle('got',n>0);li.querySelector('em').textContent=n?(n>1?`${n} on your shelf`:'On your shelf'):(short>0?`${fmt(short)} more to go`:'');}
}
function redeem(P,li){
  if(W_.tickets<P.cost){PZ.msg.textContent=`${fmt(P.cost-W_.tickets)} more tickets for the ${P.name}`;S.blip(220,.05);return;}
  W_.tickets-=P.cost;store.set('arcade2-tickets',W_.tickets);$('tixN').textContent=fmt(W_.tickets);
  PZ_OWN[P.id]=(PZ_OWN[P.id]|0)+1;store.set('arcade2-prizes',JSON.stringify(PZ_OWN));
  if(PZ.shelf)PZ.shelf.rebuild();
  PZ.msg.textContent=`${P.name} → your shelf`;li.classList.remove('flash');void li.offsetWidth;li.classList.add('flash');S.win();prizeRefresh();
}
function prizeOpen(){PZ.open=true;PZ.msg.textContent=W_.tickets?'':'Win tickets on the floor, then come back';prizeRefresh();PZ.el.hidden=false;
  requestAnimationFrame(()=>{PZ.el.classList.add('on');const b=[...PZ.list.querySelectorAll('button')].find(x=>x.getAttribute('aria-disabled')==='false')||PZ.list.querySelector('button');try{b.focus({preventScroll:true});}catch(e){}});}
function prizeClose(){if(!PZ.open)return;PZ.open=false;PZ.el.classList.remove('on');setTimeout(()=>{if(!PZ.open)PZ.el.hidden=true;},400);try{cv.focus();}catch(e){}}

/* the counter goes under the PRIZES sign on the front wall, your shelf beside it */
PrizeCounter({name:'Prize Counter',x:-11.5,z:10.62,ry:Math.PI,game:{id:'prizes',title:'PRIZES'}});
PZ.shelf=YourShelf({x:-8.35,z:11.55,ry:Math.PI});
