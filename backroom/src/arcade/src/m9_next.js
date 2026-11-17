/* =====================================================================================
   THE WORKSHOP'S NEWEST CABINETS: three games that are still being built
   - WraithBay: Ironhowl 4. The Wraith, the recon mech a farm family dug up and rebuilt: orange over gunmetal,
     a wolf's head, bent-back legs on clawed feet, a jet pack, the Lance on its right arm. It crouches on a
     timber skid with its chest hatch dropped as a ramp. Climb in: the screen is inside.
   - MudTruck: Mud Lab. The front half of the Rock & Mud (Station Sand paint, a lift, knobbly tyres on bronze
     wheels, a rack of gear) bogged to its axles in a patch of mud, its winch line run out to the pull-test post.
     A field table of soil jars stands beside it. Climb in: the windshield is the screen.
   - Showroom: Salt & Sand Showroom. A black backdrop, a turntable, and a model of each SUV turning on it under
     two spots: the stock SUV, then the Rock & Mud. The screen hangs on the backdrop.
   Until a game is finished its cabinet shows a card instead (soon(), below). When it is, give the cabinet's line
   in the floor plan a real game: game:G_('<id>','<TITLE>',{...}).
   ===================================================================================== */
/* a card for a cabinet whose game isn't in yet */
function soon(id,title,paras,foot){
  return {id,title,panel:'<article class="card"><h2>'+esc(title)+'</h2>'+paras.map(p=>'<p>'+esc(p)+'</p>').join('')+'<footer>'+esc(foot||'Hyperdot Arcade · the Workshop')+'</footer></article>'};}
/* the floor a rotated cabinet covers: the box round all four corners */
function footprint4(a,x0,z0,x1,z1){const P=[a.W(x0,0,z0),a.W(x1,0,z0),a.W(x0,0,z1),a.W(x1,0,z1)],xs=P.map(p=>p[0]),zs=P.map(p=>p[2]);block(Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs));}
/* a wheel on an axle along x: tyre, rim, spokes. knob adds tread blocks. */
function wheelX(mb,x,y,z,sx,r,w,o={}){
  const rubber=hex('#151517'),rim=hex(o.rim||'#b8bcc2'),rr=o.rimR||r*.62;
  mb.fin(.15,0);mb.push();mb.tr(x,y,z);mb.rz(Math.PI/2);mb.cyl(0,-w/2,0,r,w,22,rubber);mb.pop();
  if(o.knob)for(let k=0;k<o.knob;k++){mb.push();mb.tr(x,y,z);mb.rx(k/o.knob*TAU);mb.box(0,r+.012,0,w*.96,.05,r*.2,rubber);mb.pop();}
  const fx=x+sx*(w/2+.004);mb.fin(.85,1);mb.push();mb.tr(fx,y,z);mb.rz(Math.PI/2);mb.cyl(0,-.01,0,rr,.02,20,rim);mb.pop();
  for(let k=0;k<6;k++){mb.push();mb.tr(fx+sx*.006,y,z);mb.rx(k/6*TAU);mb.box(0,rr*.5,0,.02,rr*.78,r*.12,rim);mb.pop();}
  if(o.bead){mb.fin(.5,1);for(let k=0;k<12;k++){const t=k/12*TAU;mb.sphere(fx+sx*.012,y+Math.cos(t)*rr*.93,z+Math.sin(t)*rr*.93,.016,hex('#1a1a1c'),0,0);}}
  mb.fin(.6,1);mb.push();mb.tr(fx+sx*.012,y,z);mb.rz(Math.PI/2);mb.cyl(0,-.02,0,r*.14,.04,12,hex('#5a5c62'));mb.pop();
}

/* ---------- Ironhowl 4: the Wraith ---------- */
function WraithBay(o){
  const a=Machine(Object.assign({useZ:1.75},o)),T=a.T;if(o.game.panel)a.verb='LOOK';
  const SY=1.4,SW=.96,SH=.54,SZ=-.5;
  a.addScreen(o.game.id||'ironhowl4',o.res||[384,216],[0,SY,SZ],0,SW,SH,{gain:2.4,col:'#ffb347',noLoop:!!o.game.panel});
  const jets=[],tip=[];
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const org=hex('#d8721c'),org2=hex('#a8540f'),gun=hex('#3b3e46'),gun2=hex('#26282e'),joint=hex('#16171b'),amber=hex('#ffb347'),glow=hex('#ff8a1a'),jet=hex('#9cd2ff'),steel=hex('#8a8e9a'),seat=hex('#1c1c22'),wood=hex('#5a3a22'),wood2=hex('#3a2616');
    /* the skid it was dragged in on: timber planks on two runners */
    mb.fin(.2,0);for(const sx of [-1,1])mb.box(sx*1.2,.05,-.05,.16,.1,2.7,wood2);
    for(let i=0;i<7;i++)mb.box(0,.115,-1.2+i*.39,3.0,.03,.34,i%2?wood:hex('#644226'));
    /* the cockpit pod: floor, back, sides and roof, a sill and a frame round the open front */
    mb.fin(.55,1);mb.box(0,.62,-.1,1.36,.1,1.1,gun2);mb.box(0,1.3,-.62,1.36,1.46,.1,gun);
    for(const sx of [-1,1]){mb.box(sx*.65,1.3,-.1,.1,1.46,1.1,gun);
      mb.push();mb.tr(sx*.73,1.38,-.08);mb.rz(sx*.16);mb.box(0,0,0,.06,1.0,.96,org);mb.box(sx*.02,-.2,0,.04,.14,.98,org2);mb.pop();}
    mb.box(0,2.0,-.1,1.36,.1,1.1,org);
    mb.box(0,.8,.42,1.36,.3,.12,gun2);for(const sx of [-1,1])mb.box(sx*.62,1.4,.42,.12,1.1,.12,gun);mb.box(0,1.93,.42,1.36,.16,.14,org2);
    /* the hatch, dropped forward as a ramp: treads across it, a strip of light down each edge */
    mb.push();mb.tr(0,.95,.48);mb.rx(.86);mb.fin(.6,1);mb.box(0,0,.5,1.0,.07,1.0,org);mb.box(0,-.045,.5,.8,.03,.8,gun2);
      for(let k=0;k<5;k++)mb.box(0,.04,.14+k*.18,.7,.012,.05,gun2);
      mb.fin(0,0);for(const sx of [-1,1])mb.box(sx*.46,.04,.5,.03,.01,.9,amber,2.6);mb.pop();
    /* inside: the seat facing the screen, two sticks, lit switches */
    mb.fin(.3,0);mb.box(0,.72,-.06,.5,.12,.46,seat);mb.push();mb.tr(0,1.06,.2);mb.rx(.12);mb.box(0,0,0,.5,.62,.1,seat);mb.box(0,.4,0,.28,.16,.1,seat);mb.pop();
    mb.fin(0,0);mb.box(0,.785,-.06,.38,.005,.36,glow,.6);
    for(const sx of [-1,1]){const x=sx*.36;mb.fin(.6,1);mb.box(x,.82,-.28,.16,.34,.28,gun2);mb.tube([x,1.0,-.3],[x,1.16,-.34],.016,steel);mb.fin(.3,0);mb.box(x,1.2,-.35,.06,.12,.06,seat);
      mb.fin(0,0);for(let k=0;k<3;k++)mb.box(x-.04+k*.04,.995,-.2,.025,.01,.025,[amber,hex('#6dff7a'),jet][k],2.4);}
    /* the hips and the back, the jet pack with its two nozzles */
    mb.fin(.55,1);mb.box(0,.86,-.45,1.0,.36,.6,gun);
    mb.box(0,1.62,-.88,.96,.76,.42,gun2);mb.box(0,2.02,-.86,.7,.1,.36,org);
    for(const sx of [-.26,.26]){mb.fin(.6,1);zCyl(mb,sx,1.38,-1.2,-1.06,.13,joint,0,14);mb.fin(0,0);zCyl(mb,sx,1.38,-1.205,-1.19,.1,jet,3.2,14);jets.push([sx,1.38,-1.24]);}
    /* the head: a wolf's skull over the hatch, a long snout, amber eyes, two swept ears and the blade between them */
    mb.fin(.55,1);mb.box(0,2.3,.02,.5,.3,.56,gun);mb.box(0,2.44,-.04,.42,.06,.44,org);
    segBox(mb,[0,2.3,.26],[0,2.2,.86],.3,.2,org);segBox(mb,[0,2.2,.3],[0,2.1,.8],.24,.07,gun2);
    mb.box(0,2.2,.9,.2,.1,.06,joint);
    mb.fin(0,0);for(const sx of [-1,1])mb.box(sx*.2,2.34,.3,.12,.045,.02,amber,3.6);
    mb.fin(.55,1);for(const sx of [-1,1])segBox(mb,[sx*.17,2.44,-.02],[sx*.25,2.86,-.34],.05,.17,org);
    segBox(mb,[0,2.46,-.14],[0,2.98,-.44],.03,.13,gun2);mb.fin(0,0);tip.push([0,3.0,-.45]);
    /* shoulders: an orange plate each side with its number */
    for(const sx of [-1,1]){mb.fin(.55,1);mb.box(sx*.98,1.92,-.14,.5,.42,.72,org);mb.box(sx*.98,2.15,-.14,.42,.06,.62,org2);mb.box(sx*.98,1.68,-.14,.4,.08,.6,gun2);mb.fin(0,0);mb.box(sx*.98,1.92,.225,.44,.04,.01,amber,1.6);}
    /* arms: the left one hangs with its claws on the planks, the right one carries the Lance across its knee */
    const claw=(p,d,L)=>{for(const k of [-1,0,1]){mb.fin(.7,1);mb.tube([p[0]+k*.07,p[1],p[2]],[p[0]+k*.1+d[0]*L,p[1]+d[1]*L,p[2]+d[2]*L],.022,steel,0,5);}};
    mb.fin(.55,1);segBox(mb,[-1.0,1.74,-.14],[-1.12,1.18,.14],.22,.24,gun);mb.sphere(-1.12,1.18,.14,.13,joint,0,1);
    segBox(mb,[-1.12,1.18,.14],[-1.16,.46,.66],.26,.26,org);mb.box(-1.16,.4,.7,.24,.16,.2,gun2);claw([-1.16,.36,.78],[0,-.75,.66],.3);
    segBox(mb,[1.0,1.74,-.14],[1.14,1.24,.16],.22,.24,gun);mb.sphere(1.14,1.24,.16,.13,joint,0,1);segBox(mb,[1.14,1.24,.16],[1.1,1.02,.66],.26,.26,org);
    mb.fin(.7,1);zCyl(mb,1.1,.98,.3,1.62,.045,steel,0,12);zCyl(mb,1.1,.98,.5,.9,.075,gun2,0,12);mb.box(1.1,1.12,.62,.1,.14,.3,gun);
    mb.fin(0,0);zCyl(mb,1.1,.98,1.62,1.66,.03,amber,3.4,10);for(const z of [1.0,1.2,1.4])ring(mb,[1.1,.98,z],.062,'z',glow,2.2,.006,14);
    /* legs: bent back like a wolf's. Thigh forward to the knee, shin back to the hock, then down to a three-clawed foot */
    for(const sx of [-1,1]){const x=sx*.82;mb.fin(.55,1);
      segBox(mb,[sx*.56,.92,-.36],[x,.84,.42],.32,.34,org);mb.sphere(x,.84,.44,.16,joint,0,1);
      segBox(mb,[x,.84,.44],[x,.5,-.42],.22,.24,gun);mb.sphere(x,.5,-.44,.13,joint,0,1);
      segBox(mb,[x,.5,-.44],[x,.25,.2],.18,.2,gun2);mb.box(x,.2,.3,.3,.14,.3,org);
      claw([x,.2,.44],[0,-.2,1],.34);mb.fin(.7,1);mb.tube([x,.22,.16],[x,.14,-.08],.022,steel,0,5);}
    /* the sign over its head */
    mb.fin(.6,0);mb.box(0,3.33,-1.2,2.76,.56,.05,hex('#0e0b08'));mb.fin(.8,1);for(const sx of [-1,1])mb.tube([sx*1.2,3.61,-1.2],[sx*1.2,ROOM.h,-1.2],.008,steel);
    mb.fin(0,0);neon2(mb,'IRONHOWL 4',[0,3.3,-1.16],[1,0,0],.04,amber,4.4);neon2(mb,'THE WRAITH   2176',[0,3.14,-1.16],[1,0,0],.014,hex('#ff6a4a'),3.6);
    /* farm leftovers by the skid: two tractor tyres, a gas bottle */
    mb.fin(.15,0);mb.cyl(-1.75,0,-.75,.42,.22,18,hex('#121214'));mb.cyl(-1.72,.22,-.72,.4,.22,18,hex('#17171a'));mb.fin(.6,1);mb.cyl(-1.78,0,.05,.11,.9,12,hex('#7a2a22'));mb.cyl(-1.78,.9,.05,.04,.1,8,steel);
    mb.pop();
    /* the numbers Pip painted on, and her wolf */
    const num=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#d8721c';g.fillRect(0,0,w,h);g.fillStyle='#2a2c32';g.beginPath();g.arc(64,64,52,0,TAU);g.fill();g.fillStyle='#f2ede2';g.font='bold 62px Impact,"Arial Black",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('09',64,68);});
    texQuad(T,[[-1.235,1.74,.16],[-1.235,1.74,-.2],[-1.235,2.1,-.2],[-1.235,2.1,.16]],num,1.0);
    texQuad(T,[[1.235,1.74,-.2],[1.235,1.74,.16],[1.235,2.1,.16],[1.235,2.1,-.2]],num,1.0);
    const wolf=canvasTex(256,128,(g,w,h)=>{g.fillStyle='#d8721c';g.fillRect(0,0,w,h);g.fillStyle='#f6f1e6';g.beginPath();
      for(const [x,y] of [[30,96],[58,70],[70,40],[86,58],[104,30],[112,60],[150,52],[196,22],[176,58],[226,60],[206,78],[168,84],[150,104],[96,104],[70,96]])g.lineTo(x,y);g.closePath();g.fill();
      g.fillStyle='#2a2c32';g.beginPath();g.arc(128,66,5,0,TAU);g.fill();});
    texQuad(T,[[-.765,1.5,.36],[-.765,1.5,-.2],[-.765,1.78,-.2],[-.765,1.78,.36]],wolf,1.0);
    texQuad(T,[[.765,1.5,-.2],[.765,1.5,.36],[.765,1.78,.36],[.765,1.78,-.2]],wolf,1.0);
    footprint4(a,-1.5,-1.3,1.5,1.3);footprint4(a,-2.2,-1.2,-1.4,.3);
    /* the blade's tip blinks blue, and the jets idle */
    const TW=tip.map(p=>a.W(...p));Glints(1,'#9cd2ff',.022,()=>TW[0],(i,t)=>(t%1.6)<.2?4.5:.3);
    const JW=jets.map(p=>a.W(...p)),back=a.Dir(0,0,-1);
    Glints(8,'#9cd2ff',.011,(i,t)=>{const k=(t*.5+i/8)%1,b=JW[i%2];return [b[0]+back[0]*k*.5,b[1]+Math.sin(i*2.1+t)*.02,b[2]+back[2]*k*.5];},(i,t)=>{const k=(t*.5+i/8)%1;return 3*(1-k);});
  };
  const ip=a.W(0,1.55,0),inner=lightAt(ip[0],1.55,ip[2],2.4,[1,.62,.25],.9);
  const vp=a.W(0,2.2,1.1);lightAt(vp[0],2.2,vp[2],2.8,[1,.7,.3],.6);
  const jp=a.W(0,1.4,-1.2);lightAt(jp[0],1.4,jp[2],2.2,[.5,.75,1],.6);
  const sp=a.W(0,3.2,-.6);lightAt(sp[0],3.2,sp[2],2.6,[1,.6,.25],.55);
  a.onIdle=()=>{inner.k=.85+.08*Math.sin(W_.t*2.2);};
  return a;
}

/* ---------- Mud Lab: the Rock & Mud, bogged ---------- */
function MudTruck(o){
  const a=Machine(Object.assign({useZ:1.55},o)),T=a.T,B=.06,L=.1;if(o.game.panel)a.verb='LOOK';
  const SC=[0,1.51+B+L,-.13],ST=.62,SW=1.4,SH=.7875;
  a.addScreen(o.game.id||'mudlab',o.res||[320,180],SC,ST,SW,SH,{gain:2.3,col:'#c98f4a',noLoop:!!o.game.panel});
  a.cam=()=>({eye:a.W(0,1.36+B+L,1.05),tgt:a.W(0,1.5+B+L,-.13),fov:52});
  a.build=mb=>{
    const paint=hex('#b79a6c'),clad=hex('#2c2c2f'),blk=hex('#121214'),chrome=CHROME,red=hex('#a32222'),wood=hex('#4a321c'),mud=hex('#5a4028'),mud2=hex('#6b4c30'),orange=hex('#ff6a1e'),steel=hex('#6a6c72');
    mb.push();mb.m=mmul(mb.m,T);
    /* the patch of bog: a low timber-edged bed */
    mb.fin(.2,0);mb.box(0,B/2,-.35,3.6,B,4.6,wood);
    mb.push();mb.tr(0,B,0);
    /* mud heaped up round the sunk wheels and pushed ahead of the bumper */
    mb.fin(.45,0);for(const sx of [-1,1]){mb.sphere(sx*.92,-.02,-.8,.34,mud,0,1,.42);mb.sphere(sx*.95,-.02,-1.92,.36,mud2,0,1,.4);mb.sphere(sx*1.25,-.03,-1.36,.3,mud,0,1,.36);}
    mb.sphere(0,-.03,-2.25,.5,mud2,0,1,.3);
    mb.push();mb.tr(0,L,0);
    /* the body: lower panels, the hood */
    mb.fin(.5,0);mb.box(0,.74,-.55,1.84,.72,2.7,paint);
    mb.fin(.5,0);mb.push();mb.tr(0,1.13,-1.17);mb.rx(-.05);mb.box(0,0,0,1.8,.06,1.58,paint);mb.pop();mb.box(0,1.16,-.38,1.8,.06,.12,paint);
    mb.fin(.3,0);mb.box(0,1.17,-1.3,.6,.03,.5,blk);
    /* the face: black grille, two chrome bars, the lights */
    mb.fin(.6,1);mb.box(0,.93,-1.935,1.46,.3,.05,blk);for(const y of [1.0,.87])mb.tube([-.56,y,-1.965],[.56,y,-1.965],.026,chrome,0,8);
    mb.fin(0,0);for(const sx of [-1,1]){mb.box(sx*.67,.94,-1.955,.3,.14,.03,hex('#eaf2ff'),3.2);mb.box(sx*.67,.82,-1.955,.3,.05,.03,hex('#ffb040'),2.2);}
    /* a steel winch bumper: the drum, the fairlead, two hooks, a hoop over the grille */
    mb.fin(.5,1);mb.box(0,.52,-2.04,1.9,.24,.3,clad);mb.box(0,.66,-2.02,.5,.12,.22,hex('#1c1c1f'));
    mb.push();mb.tr(-.18,.66,-2.02);mb.rz(Math.PI/2);mb.cyl(0,-.36,0,.07,.36,12,steel);mb.pop();mb.box(0,.6,-2.2,.3,.1,.03,hex('#9a9da4'));
    for(const sx of [-1,1]){mb.fin(.5,1);mb.box(sx*.7,.5,-2.2,.07,.1,.06,red);polyTube(mb,[[sx*.52,.64,-2.14],[sx*.52,1.12,-2.2],[sx*.2,1.2,-2.2]],.024,clad,0,false);}
    mb.tube([-.2,1.2,-2.2],[.2,1.2,-2.2],.024,clad,0,6);
    /* flares, the tyres sunk to their axles, a red spring in each arch */
    for(const sx of [-1,1]){mb.fin(.3,0);mb.box(sx*.955,.86,-1.35,.1,.32,1.16,clad);mb.fin(.5,1);mb.cyl(sx*.72,.62,-1.35,.05,.3,10,red);}
    mb.pop();
    for(const sx of [-1,1])wheelX(mb,sx*.9,.38,-1.35,sx,.5,.34,{rim:'#8a5a2a',rimR:.27,knob:16,bead:true});
    mb.push();mb.tr(0,L,0);
    /* the cabin: A-pillars, roof, B-pillars at the cut, mirrors, a snorkel up the right pillar */
    mb.fin(.5,0);for(const sx of [-1,1]){segBox(mb,[sx*.86,1.16,-.38],[sx*.8,1.86,.12],.07,.07,paint);segBox(mb,[sx*.89,1.1,.8],[sx*.82,1.86,.8],.08,.1,paint);mb.box(sx*1.0,1.22,-.28,.14,.12,.08,blk);}
    mb.box(0,1.88,.46,1.68,.06,.72,paint);
    mb.fin(.3,0);polyTube(mb,[[.94,1.0,-.9],[.94,1.2,-.42],[.9,1.9,.1],[.9,2.0,.1]],.045,blk,0,false);mb.cyl(.9,1.98,.1,.07,.1,10,blk);
    /* the rack: a basket of tube, a red can, two orange boards, a light bar across the front, a whip aerial with a flag */
    mb.fin(.5,1);for(const sx of [-1,1]){mb.tube([sx*.74,1.98,.1],[sx*.74,1.98,.8],.016,blk,0,6);mb.tube([sx*.76,2.12,.1],[sx*.76,2.12,.8],.014,blk,0,6);for(const z of [.1,.45,.8])mb.tube([sx*.74,1.92,z],[sx*.76,2.12,z],.012,blk);}
    for(const z of [.1,.8]){mb.tube([-.74,1.98,z],[.74,1.98,z],.014,blk,0,6);mb.tube([-.76,2.12,z],[.76,2.12,z],.014,blk,0,6);}
    mb.fin(.4,0);mb.box(.4,2.12,.5,.3,.26,.2,red);mb.box(.4,2.27,.5,.08,.05,.06,blk);mb.box(-.34,2.02,.46,.5,.05,.62,orange);mb.box(-.34,2.08,.46,.5,.05,.62,hex('#e85a12'));
    mb.fin(.5,1);mb.box(0,2.0,.04,1.2,.08,.06,blk);mb.fin(0,0);for(let k=0;k<6;k++)mb.box(-.5+k*.2,2.0,.005,.16,.055,.01,hex('#fff2d0'),3.4);
    mb.fin(.8,1);mb.tube([-.8,1.9,.7],[-.86,3.0,.86],.006,steel);mb.fin(0,0);mb.box(-.86,2.94,.9,.01,.09,.14,orange,1.2);
    /* the cut: a clean black panel where the rest of the truck would be */
    mb.fin(.3,0);mb.box(0,.74,.815,1.84,.72,.03,blk);
    /* inside: the dash, the wheel, two buckets, the console and shifter */
    mb.fin(.3,0);mb.box(0,1.0,-.28,1.7,.22,.3,hex('#1c1b1e'));mb.box(0,.5,.15,1.7,.04,1.3,hex('#141416'));
    {const pts=[];for(let i=0;i<24;i++){const t=i/24*TAU;pts.push([Math.cos(t)*.19,Math.sin(t)*.19,0]);}
      mb.push();mb.tr(-.42,1.1,.02);mb.rx(-.5);mb.fin(.2,0);polyTube(mb,pts,.022,blk,0,true);for(const t of [0,2.1,4.2])mb.tube([0,0,0],[Math.cos(t+.5)*.19,Math.sin(t+.5)*.19,0],.018,blk);mb.sphere(0,0,0,.05,blk,0,1);mb.pop();
      mb.tube([-.42,1.05,-.15],[-.42,1.1,.0],.03,blk);}
    for(const sx of [-1,1]){const x=sx*.42;mb.fin(.25,0);mb.box(x,.66,.42,.52,.14,.5,hex('#3a3026'));mb.push();mb.tr(x,1.0,.7);mb.rx(-.12);mb.box(0,0,0,.52,.66,.1,hex('#3a3026'));mb.box(0,.44,0,.28,.18,.1,hex('#3a3026'));mb.pop();}
    mb.box(0,.66,.18,.26,.22,.6,hex('#1c1b1e'));mb.fin(.8,1);mb.tube([0,.78,.1],[0,.98,.06],.012,chrome);mb.sphere(0,.99,.06,.03,blk,0,1);
    mb.pop();
    /* a spade stood in the mud */
    mb.fin(.3,0);mb.tube([-1.5,.02,-1.9],[-1.42,1.0,-1.82],.02,hex('#7a5a36'),0,6);mb.fin(.7,1);mb.box(-1.505,.1,-1.905,.2,.26,.02,steel);
    mb.pop();
    /* the pull-test post, off the bed: a timber post, a dial, a red strap, and the winch line run out to it */
    mb.fin(.25,0);mb.cyl(0,0,-4.25,.1,1.25,12,hex('#6a4a2a'));mb.box(0,.02,-4.25,.5,.04,.5,hex('#3a2616'));
    mb.fin(.4,0);mb.cyl(0,.78,-4.25,.115,.1,12,red);
    mb.fin(.85,1);mb.tube([0,.66+B+L,-2.22],[0,.83,-4.14],.008,hex('#9a9da4'),0,5);mb.fin(.5,1);mb.box(0,.83,-4.12,.05,.07,.05,red);
    mb.fin(.6,1);mb.push();mb.tr(0,1.08,-4.14);mb.rx(Math.PI/2);mb.cyl(0,0,0,.15,.04,20,hex('#1c1c1f'));mb.pop();
    /* a field table of soil jars beside the front wheel */
    {const tx=1.72,tz=-1.1;mb.fin(.5,1);for(const [dx,dz] of [[-.3,-.42],[.3,-.42],[-.3,.42],[.3,.42]])mb.tube([tx+dx,0,tz+dz],[tx+dx,.74,tz+dz],.014,steel);
      mb.fin(.3,0);mb.box(tx,.76,tz,.72,.04,1.0,hex('#c8b48a'));
      const lay=[['#2a1c10','#5a3d22','#8a6a44'],['#3a2a1c','#6a4a2a','#b09468'],['#1e140c','#4a3220','#7a5c3a']];
      lay.forEach((cs,i)=>{const z=tz-.3+i*.3;mb.fin(.2,0);cs.forEach((c,k)=>mb.cyl(tx,.78+k*.06,z,.055,.06,12,hex(c)));mb.fin(.9,0);mb.cyl(tx,.96,z,.057,.05,12,hex('#9fb4c0'));mb.fin(.6,1);mb.cyl(tx,1.01,z,.06,.02,12,steel);});
      mb.fin(.2,0);mb.box(tx+.18,.785,tz+.3,.2,.01,.28,hex('#e8e0cc'));mb.fin(.5,1);mb.box(tx+.18,.795,tz+.42,.1,.012,.03,steel);}
    /* the title board by the tailgate, on two posts */
    mb.fin(.2,0);for(const sx of [-1,1])mb.box(1.82+sx*.6,.72,.62,.06,1.44,.06,hex('#5a3a22'));mb.box(1.82,1.06,.6,1.4,.82,.04,hex('#1d140a'));
    mb.pop();
    /* the bog: churned mud with two ruts and standing water */
    const bog=canvasTex(512,640,(g,w,h)=>{let sd=5;const R=()=>(sd=(sd*16807)%2147483647)/2147483647;
      g.fillStyle='#6e4e2e';g.fillRect(0,0,w,h);
      for(let i=0;i<900;i++){g.fillStyle=`rgba(${50+R()*90|0},${32+R()*56|0},${16+R()*30|0},${.25+R()*.4})`;g.beginPath();g.ellipse(R()*w,R()*h,4+R()*26,3+R()*14,R()*3,0,TAU);g.fill();}
      for(const x of [132,380]){g.fillStyle='#3a2614';g.fillRect(x-34,0,68,h);for(let y=0;y<h;y+=18){g.fillStyle='rgba(120,86,52,.7)';g.fillRect(x-34,y,68,5);}}
      for(const [x,y,rx,ry] of [[256,150,120,60],[120,430,70,110],[390,470,66,90],[256,560,150,50]]){const gr=g.createRadialGradient(x,y,4,x,y,Math.max(rx,ry));gr.addColorStop(0,'rgba(190,206,220,.9)');gr.addColorStop(.7,'rgba(128,138,144,.75)');gr.addColorStop(1,'rgba(110,78,46,0)');g.fillStyle=gr;g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill();}});
    litQuad(T,[[-1.79,B+.002,1.94],[1.79,B+.002,1.94],[1.79,B+.002,-2.64],[-1.79,B+.002,-2.64]],bog);
    for(const sx of [-1,1]){const x=sx*.922,yb=.38+B+L,yt=.84+B+L;litQuad(T,sx<0?[[x,yb,.8],[x,yb,-1.9],[x,yt,-1.9],[x,yt,.8]]:[[x,yb,-1.9],[x,yb,.8],[x,yt,.8],[x,yt,-1.9]],'art/rc/mud.webp');}
    /* the pull-test dial, and the game's title the way its title screen has it */
    const dial=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#f2ead8';g.beginPath();g.arc(64,64,62,0,TAU);g.fill();g.strokeStyle='#1c1c1f';g.lineWidth=3;for(let i=0;i<=10;i++){const t=Math.PI*(.85+i*.13);g.beginPath();g.moveTo(64+Math.cos(t)*46,64+Math.sin(t)*46);g.lineTo(64+Math.cos(t)*56,64+Math.sin(t)*56);g.stroke();}
      g.strokeStyle='#a32222';g.lineWidth=5;g.beginPath();g.moveTo(64,64);g.lineTo(64+Math.cos(5.2)*44,64+Math.sin(5.2)*44);g.stroke();g.fillStyle='#1c1c1f';g.beginPath();g.arc(64,64,6,0,TAU);g.fill();g.font='bold 15px sans-serif';g.textAlign='center';g.fillText('PULL  LB',64,100);});
    texQuad(T,[[.13,.95,-4.098],[-.13,.95,-4.098],[-.13,1.21,-4.098],[.13,1.21,-4.098]],dial,.9);
    const title=canvasTex(640,360,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#8fa3b3');gr.addColorStop(.46,'#c9b28e');gr.addColorStop(.72,'#5a3d22');gr.addColorStop(1,'#24170c');g.fillStyle=gr;g.fillRect(0,0,w,h);
      g.textAlign='center';g.fillStyle='rgba(242,230,210,.85)';g.font='500 15px "Helvetica Neue",Arial,sans-serif';g.fillText('T W O   S U V S   A N D   A   B U S H   P L A N E',w/2,92);
      g.shadowColor='rgba(30,18,8,.55)';g.shadowBlur=10;g.fillStyle='#f6eee2';g.font='italic 300 104px "Helvetica Neue",Arial,sans-serif';g.fillText('M U D   L A B',w/2,196);g.shadowBlur=0;
      g.fillStyle='#c98f4a';g.beginPath();if(g.roundRect)g.roundRect(w/2-78,246,156,44,22);else g.rect(w/2-78,246,156,44);g.fill();g.fillStyle='#1d140a';g.font='600 17px "Helvetica Neue",Arial,sans-serif';g.fillText('S T A R T',w/2,274);});
    texQuad(T,[[1.14,.67+B,.622],[2.5,.67+B,.622],[2.5,1.45+B,.622],[1.14,1.45+B,.622]],title,.95);
    /* tinted glass on the outside of the windshield */
    {const tint=canvasTex(4,64,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1a1c26');gr.addColorStop(.5,'#08090d');gr.addColorStop(1,'#14161e');g.fillStyle=gr;g.fillRect(0,0,w,h);});
      const GT=chain(T,mT(SC[0],SC[1],SC[2]),mRX(ST));texQuad(GT,[[-SW/2-.03,-SH/2-.03,-.014],[SW/2+.03,-SH/2-.03,-.014],[SW/2+.03,SH/2+.03,-.014],[-SW/2-.03,SH/2+.03,-.014]],tint,.6);}
    footprint4(a,-1.1,-2.7,1.1,.9);footprint4(a,-.3,-4.5,.3,-4.0);footprint4(a,1.3,-1.7,2.15,-.5);footprint4(a,1.1,.5,2.5,.75);
  };
  const hl=a.W(0,.6,-3.1);lightAt(hl[0],.6,hl[2],2.6,[1,.9,.75],.8);
  const dp=a.W(-.3,1.35,.2),dash=lightAt(dp[0],1.35,dp[2],1.6,[1,.6,.3],.55);
  const sp=a.W(0,3.0,-.6);lightAt(sp[0],3.0,sp[2],5,[1,.86,.66],.8);
  const tp=a.W(1.82,1.2,1.3);lightAt(tp[0],1.2,tp[2],2.0,[1,.8,.55],.5);
  a.onIdle=()=>{dash.k=.5+.05*Math.sin(W_.t*2.1);};
  return a;
}

/* ---------- Salt & Sand Showroom: a turntable under two spots ---------- */
/* a model SUV, full size here and scaled down by whoever draws it: nose towards -z. o.rock makes it the Rock & Mud. */
function modelSUV(o){
  const mb=new MB(),paint=hex(o.rock?'#b79a6c':'#6a625b'),clad=hex('#2c2c2f'),blk=hex('#101012'),glass=hex('#0c1016'),chrome=CHROME,L=o.rock?.2:0,r=o.rock?.52:.4,y=r;
  mb.push();mb.tr(0,L,0);
  mb.fin(.6,0);mb.box(0,.74,0,1.84,.6,4.5,paint);mb.box(0,1.42,.45,1.7,.76,2.75,paint);mb.box(0,1.08,-1.55,1.8,.08,1.4,paint);
  mb.fin(.9,0);for(const sx of [-1,1])mb.box(sx*.856,1.46,.45,.012,.44,2.45,glass);mb.box(0,1.46,-.93,1.5,.44,.012,glass);mb.box(0,1.46,1.83,1.5,.44,.012,glass);
  mb.fin(.6,1);mb.box(0,.9,-2.255,1.46,.3,.03,blk);for(const yy of [.97,.84])mb.tube([-.56,yy,-2.28],[.56,yy,-2.28],.026,chrome,0,6);
  mb.fin(0,0);for(const sx of [-1,1]){mb.box(sx*.67,.92,-2.265,.3,.14,.02,hex('#eaf2ff'),3);mb.box(sx*.7,.92,2.26,.24,.2,.02,hex('#ff3a20'),2.6);}
  mb.fin(.3,0);mb.box(0,.52,-2.3,1.86,.24,.16,clad);mb.box(0,.52,2.3,1.86,.24,.16,clad);
  for(const sx of [-1,1])for(const z of [-1.45,1.45])mb.box(sx*.935,.8,z,.07,.3,1.0,clad);
  mb.fin(.5,1);for(const sx of [-1,1])mb.tube([sx*.7,1.84,-.6],[sx*.7,1.84,1.6],.02,blk,0,6);
  if(o.rock){mb.fin(.5,1);mb.box(0,.56,-2.42,1.9,.22,.2,clad);mb.box(0,1.9,-.7,1.2,.08,.06,blk);mb.fin(0,0);for(let k=0;k<6;k++)mb.box(-.5+k*.2,1.9,-.735,.16,.055,.01,hex('#fff2d0'),3.2);
    mb.fin(.4,0);for(const z of [-.5,1.5])mb.tube([-.76,1.96,z],[.76,1.96,z],.02,blk,0,6);for(const sx of [-1,1])mb.tube([sx*.76,1.96,-.5],[sx*.76,1.96,1.5],.02,blk,0,6);
    mb.box(.4,2.06,.2,.3,.22,.2,hex('#a32222'));mb.box(-.34,1.98,.5,.5,.08,1.2,hex('#ff6a1e'));mb.sphere(0,2.0,1.2,.36,blk,0,1,.36);}
  mb.pop();
  for(const sx of [-1,1])for(const z of [-1.45,1.45])wheelX(mb,sx*.86,y,z,sx,r,.3,o.rock?{rim:'#8a5a2a',rimR:.27,knob:12}:{});
  return mesh(mb);
}
function Showroom(o){
  const a=Machine(Object.assign({useZ:2.0},o)),T=a.T;if(o.game.panel)a.verb='LOOK';
  a.addScreen(o.game.id||'showroom',o.res||[320,180],[0,2.08,-1.44],0,1.5,.84,{gain:2.3,col:'#eaf2ff',noLoop:!!o.game.panel});
  const K=.4,TY=.32,cars=[modelSUV({}),modelSUV({rock:true})];
  a.build=mb=>{
    mb.push();mb.m=mmul(mb.m,T);
    const blk=hex('#09090b'),blk2=hex('#141416'),white=hex('#f4f6ff'),chrome=CHROME,steel=hex('#6a6c72');
    /* the backdrop: a flat of matt black and two wings, a white line of light along its top */
    mb.fin(.08,0);mb.box(0,1.6,-1.5,2.7,3.2,.08,blk);
    for(const sx of [-1,1]){mb.push();mb.tr(sx*1.35,0,-1.5);mb.ry(sx*-.62);mb.box(sx*.6,1.6,0,1.2,3.2,.08,blk);mb.fin(0,0);mb.box(sx*.6,3.215,0,1.2,.014,.03,white,3);mb.fin(.08,0);mb.pop();}
    mb.fin(0,0);mb.box(0,3.215,-1.5,2.7,.014,.03,white,3);
    /* the floor: polished black, and the turntable with a chrome rim and a ring of light under its edge */
    mb.fin(.92,0);mb.cyl(0,0,0,1.86,.03,44,blk2);
    mb.fin(.5,0);mb.cyl(0,.03,0,1.12,TY-.07,40,blk);mb.fin(.92,0);mb.cyl(0,TY-.04,0,1.2,.04,44,blk2);
    mb.fin(.9,1);ring(mb,[0,TY-.02,0],1.2,'y',chrome,0,.014,44);mb.fin(0,0);ring(mb,[0,.05,0],1.14,'y',white,3,.008,44);
    /* two spots on a bar across the top */
    mb.fin(.5,1);mb.tube([-1.3,3.05,-.5],[1.3,3.05,-.5],.02,steel,0,6);for(const sx of [-1,1]){mb.tube([sx*1.3,3.05,-.5],[sx*1.3,3.05,-1.46],.016,steel);
      mb.push();mb.tr(sx*.8,2.98,-.5);mb.rz(sx*.42);mb.rx(.3);mb.fin(.6,1);mb.cyl(0,-.26,0,.08,.26,12,hex('#1c1b24'));mb.fin(0,0);mb.cyl(0,-.272,0,.066,.012,12,white,5);mb.pop();}
    /* a rope across the front: two chrome posts, red rope, a gap in the middle to walk up to */
    for(const sx of [-1,1]){mb.fin(.9,1);for(const x of [sx*1.55,sx*.62]){mb.cyl(x,0,1.5,.11,.03,14,chrome);mb.tube([x,0,1.5],[x,.92,1.5],.022,chrome,0,8);mb.sphere(x,.95,1.5,.04,chrome,0,1);}
      mb.fin(.3,0);polyTube(mb,[[sx*1.55,.88,1.5],[sx*1.32,.76,1.5],[sx*1.08,.72,1.5],[sx*.85,.76,1.5],[sx*.62,.88,1.5]],.02,hex('#8a1c2a'),0,false);}
    /* its name over the screen */
    neon2(mb,'SHOWROOM',[0,2.78,-1.44],[1,0,0],.042,white,4.2);neon2(mb,'SALT AND SAND',[0,2.62,-1.44],[1,0,0],.016,hex('#ff3fa0'),3.8);
    mb.pop();
    footprint4(a,-1.9,-1.6,1.9,1.3);footprint4(a,-1.7,1.4,-.5,1.6);footprint4(a,.5,1.4,1.7,1.6);
    for(const sx of [-1,1]){const p=a.W(sx*.8,2.9,-.5),q=a.W(sx*.15,.9,0);beamAt(p,[q[0]-p[0],q[1]-p[1],q[2]-p[2]],15,2.6,[1,.97,.92],.5);}
  };
  /* the model turns once every 20 s; at the back of each turn the lights dip and the other SUV takes its place */
  const base=chain(T,mT(0,TY,0));
  DECO.push({t:0,update(dt){this.t+=dt;},draw(){const turn=this.t/20,ph=turn%1,dim=Math.min(1,Math.min(ph,1-ph)/.04),c=cars[Math.floor(turn)%2],k=.08+.92*dim*dim;
    drawLit(c,chain(base,mRY(ph*TAU+Math.PI*.75),mS(K,K,K)),{tint:[k,k,k],emi:k});}});
  const cp=a.W(0,2.3,.3),key=lightAt(cp[0],2.3,cp[2],3.4,[1,.97,.92],1.1);key.hz=.1;
  const fp=a.W(0,.9,1.2);lightAt(fp[0],.9,fp[2],2.4,[.85,.9,1],.5);
  return a;
}
