/* ===================== CPU opponent ===================== */
const STYLE={kai:{zone:.45,rush:.45,grab:.1},runa:{zone:.25,rush:.75,grab:.1},magnus:{zone:.2,rush:.55,grab:.45},nova:{zone:.75,rush:.2,grab:.05},echo:{zone:.5,rush:.55,grab:.15}};
function mkAI(F,lvl){return {F,lvl,mem:[],plan:'wait',pt:0,q:[],combo:null,cool:0,react:Math.round(lerp(17,5,lvl)),airPlan:0};}
function projNear(O,F){let best=null;for(const p of PROJ){if(p.own!==O||p.dead||PT[p.type].attach)continue;const d=(F.x-p.x)*Math.sign(p.vx||1);if(d>0&&d<3.2&&(!best||d<best.d))best={d,low:PT[p.type].h.type==='low',high:PT[p.type].h.type==='high'};}return best;}
const KEYIN={'5P':['P'],'6P':['f','P'],'2P':['d','P'],'5K':['K'],'6K':['f','K'],'2K':['d','K'],'nS':['S'],'fS':['f','S'],'uS':['u','S'],'dS':['d','S'],'X':['X'],'throw':['f','P'],'jP':['P'],'jK':['K'],'jS':['S']};
function press(ai,inp,key){const F=ai.F,fwd=F.face>0?'r':'l';for(const k of KEYIN[key]||[]){if(k==='f')inp[fwd]=true;else inp[k]=true;}return inp;}
function reach(F){return .95*(F.def.norm&&F.def.norm.reach||1)*F.def.body.h;}
function aiThink(ai,O){
  const F=ai.F,L=ai.lvl,inp=blank(),fwd=F.face>0?'r':'l',bk=F.face>0?'l':'r',dist=Math.abs(O.x-F.x),sty=STYLE[F.id]||STYLE.kai,M=F.def.moves;
  ai.mem.push({state:O.state,x:O.x,y:O.y,vy:O.vy,air:O.air,mv:O.move,mf:O.mf,proj:projNear(O,F)});
  if(ai.mem.length>32)ai.mem.shift();
  const seen=ai.mem[Math.max(0,ai.mem.length-1-ai.react)];
  if(ai.cool>0)ai.cool--;
  if(ai.q.length){const q=ai.q[0];if(q.w>0)q.w--;else{ai.q.shift();for(const k of q.k){if(k==='f')inp[fwd]=true;else if(k==='b')inp[bk]=true;else inp[k]=true;}}return inp;}
  const oAtk=seen.state==='attack'&&seen.mv&&seen.mv.hits.length&&seen.mf<=seen.mv.actEnd;
  const lowAtk=oAtk&&seen.mv.hits.some(h=>h.type==='low'),highAtk=oAtk&&seen.mv.hits.some(h=>h.type==='high');
  // continue a combo on contact
  if(F.state==='attack'&&F.contact&&ai.combo&&ai.combo.length&&F.mf>=2){
    const next=ai.combo[0];
    if(next==='X'&&F.meter<100){ai.combo=null;return inp;}
    if(Math.random()<lerp(.55,.97,L)){ai.combo.shift();return press(ai,inp,next);}ai.combo=null;return inp;
  }
  if(F.state==='hit'||F.state==='block'||F.state==='guard'||F.state==='kd'||F.state==='getup'){
    if(Math.random()<lerp(.4,.92,L)){inp[bk]=true;if(lowAtk||seen.state==='attack'&&seen.mv&&seen.mv.crouch)inp.d=true;}
    if(F.state==='getup'&&F.t>=17&&dist<1.3&&Math.random()<.25*L&&M.uS){return press(ai,inp,'uS');}
    return inp;
  }
  if(F.state==='air'){
    if(!F.airAtk&&dist<1.5&&F.vy<2.5&&O.y<1.2&&Math.random()<.35)return press(ai,inp,Math.random()<.6?'jK':'jP');
    if(M.jS&&!F.airAtk&&dist>2&&F.vy<1&&F.proj===0&&Math.random()<.05)return press(ai,inp,'jS');
    return inp;
  }
  if(!(NEUTRAL.has(F.state)||F.state==='dash'))return inp;
  // projectile coming
  if(seen.proj&&seen.proj.d<2.4){
    const r=Math.random();
    if(r<.18+.25*L&&!seen.proj.low){inp.u=true;inp[fwd]=true;return inp;}
    if(r<.85){inp[bk]=true;if(seen.proj.low)inp.d=true;return inp;}
    if(M.nS&&M.nS.proj&&F.proj===0)return press(ai,inp,'nS');
  }
  // incoming strike
  if(oAtk&&dist<2.3&&Math.random()<lerp(.15,.85,L)){inp[bk]=true;if(lowAtk)inp.d=true;if(highAtk)inp.d=false;return inp;}
  // anti-air
  if(seen.air&&dist<2.1&&dist>.3&&seen.vy<3&&Math.random()<lerp(.04,.3,L)){return press(ai,inp,M.uS&&Math.random()<.7?'uS':'5K');}
  // punish a whiffed move
  if(seen.state==='attack'&&seen.mv&&seen.mf>seen.mv.actEnd+2&&dist<reach(F)+.35&&Math.random()<lerp(.05,.5,L))return startCombo(ai,inp);
  // super when it would connect
  if(F.meter>=100&&dist<2.2&&!O.air&&Math.random()<.004+.012*L)return press(ai,inp,'X');
  // opponent on the floor: close in
  if(O.state==='kd'||O.state==='getup'){if(dist>1.0)inp[fwd]=true;return inp;}
  ai.pt--;
  if(ai.pt<=0){
    const r=Math.random();ai.pt=(rnd(16,44)*(1.2-L*.4))|0;
    if(dist>3)ai.plan=r<sty.zone?'zone':r<sty.zone+.22?'approach':r<.84?'dash':'jump';
    else if(dist>1.6)ai.plan=r<sty.zone*.55?'zone':r<.45?'approach':r<.66?'jump':r<.8?'poke':r<.9?'dash':'wait';
    else ai.plan=r<sty.grab*.7?'grab':r<.5?'attack':r<.64?'poke':r<.76?'retreat':r<.82?'throw':r<.9?'jump':'wait';
  }
  switch(ai.plan){
    case 'zone':if(M.nS&&M.nS.proj&&F.proj===0&&ai.cool<=0){ai.cool=lerp(60,30,L)|0;ai.plan='wait';return press(ai,inp,F.id==='nova'&&Math.random()<.25?'dS':'nS');}inp[bk]=Math.random()<.3;break;
    case 'approach':inp[fwd]=true;if(dist<reach(F)+.2){ai.plan='attack';}break;
    case 'dash':ai.q.push({w:0,k:['f']},{w:2,k:[]},{w:1,k:['f']});ai.plan='approach';break;
    case 'jump':inp.u=true;inp[fwd]=true;ai.plan='wait';break;
    case 'retreat':inp[bk]=true;break;
    case 'poke':{if(dist<reach(F)+.45){ai.plan='wait';return press(ai,inp,pick(['5K','2K','6P','5P']));}inp[fwd]=true;break;}
    case 'attack':if(dist<reach(F)+.15){ai.plan='wait';return startCombo(ai,inp);}inp[fwd]=true;break;
    case 'grab':if(dist<1.0&&M.dS&&M.dS.grab){ai.plan='wait';return press(ai,inp,'dS');}inp[fwd]=true;break;
    case 'throw':if(dist<.85){ai.plan='wait';return press(ai,inp,'throw');}inp[fwd]=true;break;
    case 'wait':if(Math.random()<.04)inp.d=true;break;
  }
  return inp;
}
function startCombo(ai,inp){
  const F=ai.F,O=opp(F),list=F.def.combos.filter(c=>!c.includes('X')||F.meter>=100);
  const c=pick(list).slice();if(c[0]==='6P'&&canThrow(F,O))c[0]='5P';ai.combo=c.slice(1);return press(ai,inp,c[0]);
}
/* practice dummy */
let DUMMY='stand';
function dummyInput(F,O){
  const inp=blank(),bk=F.face>0?'l':'r';
  if(DUMMY==='crouch')inp.d=true;
  else if(DUMMY==='jump'){if(F.state==='idle')inp.u=true;}
  else if(DUMMY==='cpu'){if(!F.ai)F.ai=mkAI(F,.6);return aiThink(F.ai,O);}
  FIGHT.dummyBlock=DUMMY==='block';
  if(FIGHT.dummyBlock){inp[bk]=true;if(O.state==='attack'&&O.move&&O.move.hits.some(h=>h.type==='low'))inp.d=true;}
  return inp;
}
