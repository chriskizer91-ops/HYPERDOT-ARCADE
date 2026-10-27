/* ===================== bodies and costumes ===================== */
const BODY0={h:1,torso:.54,neck:.07,headR:.12,shDrop:.06,shN:.045,shF:-.06,hipN:.035,hipF:-.035,uarm:.29,farm:.27,thigh:.42,shin:.42,footL:.16,
  rT:[.096,.07],rS:[.068,.05],rU:[.064,.05],rF:[.056,.046],rHand:.066,rFoot:.048,rWaist:.13,rChest:.176,rPelvis:.13,rNeck:.054,rDelt:.078,bulk:1};
const body=o=>Object.assign({},BODY0,o);
const EYEW=pack(244,242,252),EYED=pack(16,8,22);

/* KAI: electric-blue gi, white headband, storm fists */
const K={skin:mkRamp('#d99a70'),gi:mkRamp('#2a66ff'),gi2:mkRamp('#1d4ccc'),trim:mkRamp('#ffd23f'),belt:mkRamp('#1a141e'),band:mkRamp('#f4f2f8'),hair:mkRamp('#1c1426'),glove:mkRamp('#e0243f'),wrap:mkRamp('#ece4d6')};
const LOOK_KAI={
  skin:K.skin,hair:K.hair,hairStyle:'spikes',band:K.band,gear:'band',
  spikes:[[-150,1.55,.52],[-118,1.88,.58],[-86,1.78,.56],[-56,1.52,.5],[-28,1.22,.44],[26,1.14,.36]],
  torso:(t,s)=>{const b=1.55*(1-t)-.08;if(t>.4&&s>b)return K.skin;if(t>.36&&s>b-.24)return K.trim;return K.gi;},
  pelvis:K.gi2,belt:K.belt,beltW:.036,
  uarm:K.skin,farm:t=>t>.7?K.wrap:K.skin,hand:K.glove,
  thigh:K.gi2,shin:t=>t>.8?K.wrap:K.gi2,foot:K.skin,
  eyeW:EYEW,eyeD:EYED,
  chains:[{anchor:'band',n:6,seg:.075,w:[.026,.011],mat:'band',g:.45,flow:.7,damp:.9},{anchor:'band',n:5,seg:.07,w:[.022,.009],mat:'band',g:.55,flow:.5,damp:.88},
    {anchor:'belt',n:3,seg:.055,w:[.022,.016],mat:'belt',g:1,damp:.84,layer:'front'}]
};

/* RUNA: crimson-scarfed shadow ninja */
const R={skin:mkRamp('#efc4a2'),suit:mkRamp('#211c30'),suit2:mkRamp('#2c2442'),red:mkRamp('#ff2a48'),hair:mkRamp('#f2eefa'),steel:mkRamp('#b8c2d8')};
const LOOK_RUNA={
  skin:R.skin,hair:R.hair,hairStyle:'pony',gear:'mask',mask:R.suit,scarfM:R.red,
  spikes:[[30,1.16,.34],[54,1.02,.28],[-30,1.18,.38]],
  torso:(t,s)=>{if(t<.17)return R.red;if(Math.abs(s-(t*1.7-.85))<.2)return R.red;return R.suit;},
  pelvis:R.suit2,
  uarm:R.suit,farm:t=>t>.56?R.red:R.suit,hand:R.suit,
  thigh:R.suit2,shin:t=>(t>.22&&t<.36)?R.red:R.suit,foot:R.suit,
  eyeW:EYEW,eyeD:pack(255,48,80),
  collar(F,J,rs){const N=J.N,q=J.q,dd=J.dir,a=lsp(F,N[0]-q[0]*.07-dd[0]*.03,N[1]-q[1]*.07-dd[1]*.03),c=lsp(F,N[0]+q[0]*.06-dd[0]*.05,N[1]+q[1]*.06-dd[1]*.05);cap(a[0],a[1],c[0],c[1],.062*rs,.058*rs,R.red,26,false,false);},
  chains:[{anchor:'pony',n:7,seg:.068,w:[.042,.012],mat:'hair',g:.7,flow:.35,damp:.9},{anchor:'scarf',n:9,seg:.08,w:[.046,.022],mat:'scarfM',g:.62,flow:.75,damp:.9}]
};

/* MAGNUS: champion grappler */
const M={skin:mkRamp('#b8744a'),tank:mkRamp('#2f8c3c'),pant:mkRamp('#5e3c24'),boot:mkRamp('#2c1c14'),gold:mkRamp('#ffc21a'),gold2:mkRamp('#fff0a0'),tape:mkRamp('#f2f0ea'),beard:mkRamp('#3c2416')};
const LOOK_MAGNUS={
  skin:M.skin,hairStyle:'bald',beard:M.beard,brow:pack(40,20,14),
  torso:(t,s)=>{if(t>.9)return M.skin;if(t>.78&&Math.abs(s)>.42)return M.skin;return M.tank;},
  pelvis:M.pant,belt:M.gold,beltW:.06,buckle:.075,buckleM:M.gold2,
  uarm:M.skin,farm:t=>t>.62?M.tape:M.skin,hand:M.skin,
  thigh:M.pant,shin:t=>t>.42?M.boot:M.pant,foot:M.boot,
  eyeW:EYEW,eyeD:EYED,chains:[]
};

/* NOVA: zero-g plasma tactician */
const N={skin:mkRamp('#cc9478'),suit:mkRamp('#2e1666'),line:mkRamp('#38f2ff',{emi:1}),hair:mkRamp('#8e5cff'),white:mkRamp('#e8e6ff'),visor:mkRamp('#86fcff',{emi:1})};
const LOOK_NOVA={
  skin:N.skin,hair:N.hair,hairStyle:'long',gear:'visor',visor:N.visor,
  spikes:[[34,1.16,.38],[60,1.02,.3],[-150,1.2,.5]],
  torso:(t,s)=>{if(Math.abs(s+.12)<.09)return N.line;if(t>.9&&s>0)return N.white;return N.suit;},
  pelvis:N.suit,
  uarm:(t,s)=>Math.abs(s)<.15?N.line:N.suit,farm:(t,s)=>t>.66?N.white:(Math.abs(s)<.15?N.line:N.suit),hand:N.white,
  thigh:(t,s)=>Math.abs(s)<.15?N.line:N.suit,shin:t=>t>.48?N.white:N.suit,foot:N.white,
  eyeW:EYEW,eyeD:EYED,
  chains:[{anchor:'hair',n:8,seg:.072,w:[.062,.02],mat:'hair',g:.55,flow:.4,damp:.9},{anchor:'pony',n:7,seg:.07,w:[.05,.016],mat:'hair',g:.55,flow:.55,damp:.9}]
};

/* ECHO: the arcade's own ghost, a fighter made of light */
const E={body:mkRamp('#52d8ff'),dark:mkRamp('#1c5ea0'),core:mkRamp('#eaffff',{emi:1}),vis:mkRamp('#ffffff',{emi:1}),rib:mkRamp('#7ffcff',{emi:1})};
const LOOK_ECHO={
  skin:E.body,hairStyle:'holo',helm:E.body,visor:E.vis,rib:E.rib,holo:true,
  torso:(t,s)=>{if(t>.52&&t<.74&&Math.abs(s)<.26)return E.core;if(Math.abs(s)<.06)return E.core;return E.body;},
  pelvis:E.dark,uarm:E.body,farm:t=>t>.74?E.core:E.body,hand:E.core,thigh:E.dark,shin:E.body,foot:E.core,
  eyeW:EYEW,eyeD:EYED,
  chains:[{anchor:'shF',n:9,seg:.09,w:[.05,.01],mat:'rib',g:.2,flow:1.4,lift:3,damp:.92},{anchor:'shN',n:9,seg:.09,w:[.05,.01],mat:'rib',g:.2,flow:1.1,lift:3,damp:.92}]
};
