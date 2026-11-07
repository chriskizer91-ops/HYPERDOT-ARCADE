/* =====================================================================================
   23. THE DOTS — the HUD, drawn on a small canvas that the renderer shows as LED dots over the
       3D picture (the house look), and the overhead scoreboard's own LED face.
   ===================================================================================== */
function gradOf(hex){const c=hexRGB(hex),w=[255,255,255],k=[0,0,0];
  return [rgba(mixC(c,w,.85)),rgba(mixC(c,w,.6)),rgba(mixC(c,w,.3)),rgba(c),rgba(mixC(c,k,.15)),rgba(mixC(c,k,.35)),rgba(mixC(c,k,.55))];}
const GRC={};const grad=h=>GRC[h]||(GRC[h]=gradOf(h));
/* a dark plate behind text: the LED panel look, without heavy outlines */
function plate(x,y,w,h,a){g.fillStyle='rgba(4,2,12,'+(a==null?.62:a)+')';g.fillRect(x|0,y|0,Math.ceil(w),Math.ceil(h));}
/* split a line into rows that fit the screen (3x5 font) */
function wrap3(t,maxW){const out=[];let cur='';for(const w of t.split(' ')){const n=cur?cur+' '+w:w;if(tw3(n)>maxW&&cur){out.push(cur);cur=w;}else cur=n;}if(cur)out.push(cur);return out;}
function lines3(t,y,col){const rows=wrap3(t,W-10);rows.forEach((r,i)=>{const w=tw3(r);plate(W/2-w/2-3,y+i*8-2,w+6,9);txt3(g,r,W/2,y+i*8,col,1,'c');});}
const dotPx=()=>innerWidth/W;
function scoreBar(){
  if(!G.pl[0].name)return;
  const sc=clamp(Math.round(30/(7*dotPx())),1,3),y=PADT+2,cx=W>>1,n0=String(G.score[0]),n1=String(G.score[1]);
  const nm0=G.two?'P1':G.demo?plName(0):'YOU',nm1=plName(1),w0=tw5(n0,sc),w1=tw5(n1,sc),ny=y+Math.round((7*sc-5)/2);
  const left=cx-6-w0-5-tw3(nm0),right=cx+6+w1+5+tw3(nm1);plate(left-4,y-2,right-left+8,7*sc+4,.66);
  txt5(g,n0,cx-6,y,grad(plCol(0)),sc,'r');txt5(g,n1,cx+6,y,grad(plCol(1)),sc,'');
  g.fillStyle='#8a80b0';g.fillRect(cx-1,y+2*sc,2,2);g.fillRect(cx-1,y+5*sc,2,2);
  txt3(g,nm0,cx-6-w0-5,ny,plCol(0),1,'r');txt3(g,nm1,cx+6+w1+5,ny,plCol(1),1,'');
}
function bigCard(b){
  const t=b.t,pop=t<.12?t/.12:1,blink=t>b.dur-.4&&(t*10|0)%2;if(blink)return;
  const want=clamp(Math.round(54/(7*dotPx())),2,5),txt=b.txt;let ss=Math.max(1,Math.round(want*(.6+.4*pop)));while(ss>1&&tw5(txt,ss)>W-8)ss--;
  const y=Math.round(H*.4-7*ss/2),w=tw5(txt,ss);plate(W/2-w/2-4,y-3,w+8,7*ss+6+(b.sub&&t>.25?9:0),.55);
  txt5(g,txt,W/2,y,grad(b.col),ss,'c',.12);
  if(b.sub&&t>.25)txt3(g,b.sub,W/2,y+7*ss+3,'#ffffff',1,'c');
}
function smallCard(m){const blink=(m.t*4|0)%2&&m.t>m.dur-.5;if(blink)return;
  let s=clamp(Math.round(16/(7*dotPx())),1,2);while(s>1&&tw5(m.txt,s)>W-8)s--;
  const y=Math.round(H*(G.big?.62:.44)),w=tw5(m.txt,s);plate(W/2-w/2-3,y-2,w+6,7*s+4);txt5(g,m.txt,W/2,y,grad(m.col),s,'c');}
function hud(){
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);
  if(S.mode==='play'||S.mode==='over'&&!UI.scr){scoreBar();}
  if(S.mode==='play'){
    if(G.replay){const blink=(S.t*2|0)%2;plate(3,PADT+2,36,9);if(blink){g.fillStyle='#ff2a3a';g.fillRect(6,PADT+4,4,4);}txt3(g,'REPLAY',13,PADT+4,'#ff8a9a');
      lines3(touchy?'TAP TO SKIP':'CLICK OR SPACE TO SKIP',H-12-PADB,'#c8c0dc');}
    if(G.big)bigCard(G.big);if(G.msg)smallCard(G.msg);
    /* how to play, on the first serve */
    if(!G.demo&&G.round<=1&&G.ph==='live'&&G.pt<5&&!G.big){
      const t=G.two?(touchy?'EACH PLAYER: DRAG ON YOUR OWN HALF':'P1: MOUSE OR ARROWS  -  P2: WASD'):(touchy?'DRAG YOUR MALLET. HIT THE PUCK INTO THE FAR GOAL':'MOVE THE MOUSE (OR ARROWS). HIT THE PUCK INTO THE FAR GOAL');
      lines3(t,Math.round(H*(G.two?.5:.66)),(S.t*2|0)%2?'#ffffff':'#7fe9ff');}
  }
}
/* the scoreboard over the table: big digits, names, and the goal flash. The attract demo shows a sign. */
let BOARDT=0;
function paintBoard(dt){
  BOARDT+=dt;if(BOARDT<1/20)return;BOARDT=0;
  const B=BOARD.scr,c=B.g,w=B.w,h=B.h;c.fillStyle='#000';c.fillRect(0,0,w,h);
  if(S.mode==='title'){
    const ph=(S.t/3.2|0)%3;
    if(ph===0){txt5(c,'AIR HOCKEY',w/2,3,GR.pink,1,'c');txt3(c,'HYPERDOT ARCADE',w/2,14,'#7fe9ff',1,'c');if((S.t*2|0)%2)txt3(c,'INSERT COIN',w/2,24,'#ffd23f',1,'c');}
    else if(ph===1){txt5(c,'PLAY ME',w/2,4,GR.cyan,2,'c');}
    else{txt3(c,'TODAY\'S CHAMP',w/2,3,'#ffd23f',1,'c');txt5(c,BEAT>=4?'YOU':'APEX',w/2,12,BEAT>=4?GR.cyan:grad('#ff3a5c'),2,'c');}
    B.up();return;}
  const lg=G.lastGoal,fl=G.big&&G.big.t<1.2&&lg&&S.t-lg.t<1.3;
  if(fl&&((S.t*6|0)%2)){txt5(c,'GOAL',w/2,6,grad(plCol(lg.scorer)),3,'c');B.mat.uniforms.uFl.value=.0;B.up();return;}
  const n0=String(G.score[0]),n1=String(G.score[1]);
  txt3(c,G.two?'P1':G.demo?plName(0):'YOU',4,2,plCol(0));txt3(c,plName(1),w-4,2,plCol(1),1,'r');
  txt5(c,n0,w/4,9,grad(plCol(0)),3,'c');txt5(c,n1,w*3/4,9,grad(plCol(1)),3,'c');
  c.fillStyle='#ffd23f';c.fillRect(w/2-1,13,2,2);c.fillRect(w/2-1,22,2,2);
  txt3(c,String(G.to),w/2,2,'#7a70a0',1,'c');
  if(matchPoint()&&(S.t*2|0)%2)txt3(c,'MATCH PT',w/2,27,'#ffd23f',1,'c');
  B.up();
}
