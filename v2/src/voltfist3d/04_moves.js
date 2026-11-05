/* ===================== moves: keyframed poses + frame data ===================== */
function MV(o){
  o.hits=(o.hits||[]).map((h,i)=>Object.assign({id:i,type:'mid',hs:8,stun:16,bstun:10,kb:1.6,kby:0,spark:'light',snd:'L',r:.1},h));
  o.len=o.len||o.keys[o.keys.length-1][0];
  o.actEnd=o.hits.length?Math.max(...o.hits.map(h=>h.f[1])):-1;
  o.tier=o.tier??1;
  return o;
}
const T=(n,sp)=>Math.max(1,Math.round(n*sp));
/* the same eight normals, reshaped for each fighter's stance, speed, reach and power */
function normals(st,o){
  const {S0,C0,J0,J1}=st,R=o.reach||1,sp=o.spd||1,dm=o.dmg||1,t=n=>T(n,sp),mv={};
  const jab=P(S0,{hx:S0.hx+.05,lean:S0.lean+7,an:[.8*R,S0.an[1]+.03],ln:[S0.ln[0]+.06,0]});
  mv['5P']=MV({name:'JAB',tier:1,keys:[[0,S0],[t(3),jab,'snap'],[t(6),jab],[t(14),S0]],
    hits:[{f:[t(3),t(5)],limb:'an',r:.11,dmg:28*dm,hs:6,stun:14,bstun:9,kb:1.6,spark:'light',snd:'L'}],cancel:{f:[t(3),t(12)],chain:1,sp:1,su:1},sfx:[[1,'whoosh',.5]]});
  const wind=P(S0,{hx:S0.hx-.03,lean:S0.lean-5,an:[S0.an[0]-.06,S0.an[1]-.04],af:[S0.af[0]-.12,S0.af[1]-.08]});
  const crs=P(S0,{hx:S0.hx+.16,lean:S0.lean+16,head:0,an:[.24,S0.an[1]-.08],af:[.88*R,S0.af[1]+.08],ln:[S0.ln[0]+.1,0],lf:[S0.lf[0]+.05,0]});
  mv['6P']=MV({name:'STRAIGHT',tier:2,keys:[[0,S0],[t(4),wind],[t(7),crs,'snap'],[t(11),crs],[t(22),S0]],vel:[[t(4),1.3,null],[t(9),0,null]],
    hits:[{f:[t(7),t(9)],limb:'af',r:.12,dmg:58*dm,hs:9,stun:19,bstun:12,kb:2.4,spark:'heavy',snd:'H'}],cancel:{f:[t(7),t(16)],sp:1,su:1},sfx:[[t(4),'whoosh',1]]});
  const cj=P(C0,{lean:C0.lean+8,an:[.8*R,C0.an[1]+.02],ln:[C0.ln[0]+.04,0]});
  mv['2P']=MV({name:'LOW JAB',tier:1,crouch:1,keys:[[0,C0],[t(3),cj,'snap'],[t(6),cj],[t(14),C0]],
    hits:[{f:[t(3),t(5)],limb:'an',r:.11,dmg:24*dm,hs:5,stun:14,bstun:8,kb:1.4,spark:'light',snd:'L'}],cancel:{f:[t(3),t(12)],chain:1,sp:1,su:1},sfx:[[1,'whoosh',.5]]});
  const ch=P(S0,{hx:S0.hx-.02,hy:S0.hy+.03,lean:S0.lean-10,an:[S0.an[0]-.08,S0.an[1]-.06],af:[S0.af[0]-.1,S0.af[1]-.08],ln:[.3,.5],lf:[S0.lf[0]+.08,0]});
  const rh=P(S0,{hx:S0.hx-.04,hy:S0.hy+.05,lean:-20,head:12,an:[.18,S0.an[1]-.18],af:[-.22,S0.af[1]-.08],ln:[.98*R,1.2],lf:[S0.lf[0]+.1,0]});
  mv['5K']=MV({name:'ROUNDHOUSE',tier:2,keys:[[0,S0],[t(5),ch],[t(9),rh,'snap'],[t(13),rh],[t(19),ch],[t(28),S0]],
    hits:[{f:[t(9),t(12)],limb:'ln',r:.14,dmg:70*dm,hs:10,stun:20,bstun:13,kb:2.6,spark:'heavy',snd:'H'}],cancel:{f:[t(9),t(16)],sp:1,su:1},sfx:[[t(5),'whoosh',1.2]]});
  const up=P(S0,{hx:S0.hx-.05,hy:S0.hy+.06,lean:-16,head:8,an:[S0.an[0]-.1,S0.an[1]-.08],af:[-.1,S0.af[1]-.1],ln:[.42,1.8],lf:[S0.lf[0]+.1,0]});
  const ax=P(S0,{hx:S0.hx+.14,hy:S0.hy-.04,lean:S0.lean+12,head:-2,ln:[.78*R,.5],lf:[S0.lf[0]+.06,0]});
  const axd=P(S0,{hx:S0.hx+.14,hy:S0.hy-.08,lean:S0.lean+16,ln:[.72*R,0],lf:[S0.lf[0]+.04,0]});
  mv['6K']=MV({name:'AXE KICK',tier:2,keys:[[0,S0],[t(9),up],[t(14),ax,'in'],[t(17),axd],[t(32),S0]],vel:[[t(8),1.6,null],[t(16),0,null]],
    hits:[{f:[t(12),t(16)],limb:'ln',r:.16,dmg:62*dm,hs:10,stun:19,bstun:12,kb:1.8,type:'high',spark:'heavy',snd:'H'}],cancel:{f:[t(16),t(22)],sp:1,su:1},sfx:[[t(4),'whoosh',1.3]]});
  const sw=P(C0,{hx:C0.hx+.04,hy:C0.hy-.12,lean:C0.lean+10,head:-18,an:[C0.an[0]-.04,C0.an[1]-.25],af:[C0.af[0]-.05,C0.af[1]-.34],ln:[1.02*R,.05],lf:[C0.lf[0],0]});
  mv['2K']=MV({name:'SWEEP',tier:2,crouch:1,keys:[[0,C0],[t(5),sw,'snap'],[t(11),sw],[t(30),C0]],
    hits:[{f:[t(5),t(10)],limb:'ln',r:.13,dmg:56*dm,hs:9,stun:30,bstun:12,kb:1.2,kd:1,type:'low',spark:'heavy',snd:'H'}],sfx:[[t(3),'whoosh',1]]});
  const jp=P(J0,{hx:J0.hx+.02,lean:J0.lean+20,an:[.68*R,J0.an[1]-.3]});
  mv['jP']=MV({name:'AIR PUNCH',tier:1,air:1,keys:[[0,J0],[4,jp,'snap'],[16,jp],[24,J1]],
    hits:[{f:[4,12],limb:'an',r:.13,dmg:48*dm,hs:7,stun:17,bstun:10,kb:1.6,type:'high',spark:'light',snd:'L'}],sfx:[[1,'whoosh',.7]]});
  const jk=P(J0,{lean:-12,head:6,an:[J0.an[0]-.06,J0.an[1]],af:[J0.af[0]-.1,J0.af[1]-.05],ln:[.86*R,.32],lf:[-.08,.38]});
  mv['jK']=MV({name:'FLYING KICK',tier:2,air:1,keys:[[0,J0],[5,jk,'snap'],[22,jk],[28,J1]],
    hits:[{f:[5,16],limb:'ln',r:.16,dmg:64*dm,hs:9,stun:19,bstun:12,kb:2.0,type:'high',spark:'heavy',snd:'H'}],sfx:[[2,'whoosh',1]]});
  const gr=P(S0,{hx:S0.hx+.06,lean:S0.lean+10,an:[.58,1.22],af:[.5,1.18],ln:[S0.ln[0]+.06,0]});
  const lift=P(S0,{hx:S0.hx-.04,hy:S0.hy+.02,lean:-6,head:-10,an:[.2,1.6],af:[.12,1.56]});
  const toss=P(S0,{hx:S0.hx-.1,hy:S0.hy+.03,lean:-26,head:-14,an:[-.42,1.62],af:[-.36,1.56],lf:[S0.lf[0]-.06,0]});
  mv.throw=MV({name:'THROW',tier:0,keys:[[0,S0],[3,gr,'snap'],[12,lift],[20,toss,'snap'],[36,toss],[46,S0]],
    grab:{f:[2,4],range:.9,path:[[4,.52,.92,-10],[12,.3,1.42,-70],[20,-.5,1.55,-160]],rel:20,dmg:110,vx:-3.8,vy:3.6,miss:'throwMiss'},sfx:[[3,'grab']]});
  mv.throwMiss=MV({name:'THROW',tier:0,keys:[[0,gr],[8,gr],[22,S0]]});
  return mv;
}
function stances(S0,C0,J0,J1,o={}){return {S0,C0,J0,J1,JS:P(C0,{hy:(S0.hy+C0.hy)/2,lean:(S0.lean+C0.lean)/2}),
  B0:P(S0,{hx:S0.hx-.04,lean:S0.lean-8,head:10,an:[.26,1.46],af:[.16,1.42]}),BC:P(C0,{lean:C0.lean-8,head:12,an:[.3,1.1],af:[.2,1.06]}),
  HH:P(S0,{hx:S0.hx-.08,lean:-18,head:-28,an:[.16,1.12],af:[-.14,1.2]}),HG:P(S0,{hx:S0.hx-.04,hy:S0.hy-.06,lean:40,head:24,an:[.22,.92],af:[.08,.98]}),
  HC:P(C0,{hx:C0.hx-.06,lean:C0.lean-24,head:-24}),
  AH:{hx:0,hy:.62,lean:-42,head:-30,rot:-18,an:[-.24,1.02],af:[-.42,.82],ln:[.42,.24],lf:[.2,.06]},
  KD:{hx:0,hy:.13,lean:-84,head:-6,an:[-.75,.05],af:[-.55,.02],ln:[.78,.05],lf:[.62,.18]},
  GU:{hx:0,hy:.26,lean:-28,head:-6,an:[-.3,.08],af:[.1,.4],ln:[.55,0],lf:[.3,0]},
  TH:{hx:0,hy:.66,lean:-30,head:-26,an:[-.3,1.2],af:[-.46,1.0],ln:[.38,.3],lf:[.16,.12]},
  DASH:P(S0,{hx:S0.hx+.06,lean:S0.lean+18,ln:[S0.ln[0]+.12,.06],lf:[S0.lf[0]-.12,.14]}),
  BDASH:P(S0,{hx:S0.hx-.06,lean:S0.lean-14,head:6,ln:[S0.ln[0]+.06,.12],lf:[S0.lf[0],.02]}),
  LOSE:{hx:-.02,hy:.46,lean:30,head:30,an:[.22,.55],af:[.15,.6],ln:[.34,0],lf:[-.42,.03]},
  ...o};}

/* ===================== the roster ===================== */
const ROSTER={};
function fighter(o){o.st=o.st;o.moves=Object.assign(normals(o.st,o.norm||{}),o.specials);o.chains=o.look.chains;ROSTER[o.id]=o;return o;}

/* ---- KAI ---- */
{
  const S0={hx:0,hy:.8,lean:8,head:-4,an:[.38,1.36],af:[.16,1.32],ln:[.24,0],lf:[-.26,0]};
  const C0={hx:.04,hy:.5,lean:24,head:-14,an:[.44,1.0],af:[.25,.96],ln:[.32,0],lf:[-.3,0]};
  const J0={hx:0,hy:.7,lean:4,head:-6,an:[.36,1.22],af:[.12,1.18],ln:[.26,.3],lf:[-.12,.22]};
  const J1={hx:0,hy:.76,lean:6,head:-4,an:[.38,1.28],af:[.14,1.24],ln:[.2,.1],lf:[-.18,.04]};
  const st=stances(S0,C0,J0,J1,{WIN:P(S0,{hy:.84,lean:0,head:-12,an:[.12,1.98],af:[.06,.94],ln:[.2,0],lf:[-.2,0]}),INTRO:P(S0,{lean:2,head:6,an:[.3,1.24],af:[.3,1.2],ln:[.16,0],lf:[-.18,0]})});
  const vb1=P(S0,{hx:-.06,hy:.7,lean:-4,head:-6,an:[-.1,1.02],af:[-.16,1.06],ln:[.38,0],lf:[-.36,0]});
  const vb2=P(S0,{hx:.12,hy:.72,lean:18,head:-2,an:[.76,1.16],af:[.68,1.1],ln:[.42,0],lf:[-.32,0]});
  const sr0=P(S0,{hx:-.06,hy:.66,lean:32,head:-12,an:[.28,1.0],af:[.04,.94],ln:[.4,0],lf:[-.42,0]});
  const sr1=P(S0,{hx:.12,hy:.72,lean:44,head:-10,an:[.5,1.08],af:[.2,1.0],ln:[.46,.04],lf:[-.5,0]});
  const rv1=P(S0,{hx:.06,hy:.62,lean:12,head:-10,an:[.42,1.32],af:[.1,1.0],ln:[.34,0],lf:[-.28,0]});
  const rv2=P(S0,{hx:.1,hy:.92,lean:4,head:-26,an:[.38,2.08],af:[0,1.04],ln:[.26,.26],lf:[-.12,.06]});
  const rv3=P(rv2,{ln:[.22,.42],lf:[-.08,.24]});
  const ts1=P(S0,{hy:.62,lean:10,an:[.3,1.1],af:[.1,1.05],ln:[.3,0],lf:[-.3,0]});
  const ts2=P(S0,{hx:.02,hy:.86,lean:-4,head:-10,an:[.3,1.8],af:[.04,1.74],ln:[.36,.52],lf:[-.1,.24]});
  const ts3=P(S0,{hx:.12,hy:.5,lean:34,head:-6,an:[.68,.08],af:[.5,.3],ln:[.38,0],lf:[-.34,0]});
  const gc1=P(S0,{hx:-.1,hy:.68,lean:-8,head:-8,an:[-.16,1.0],af:[-.22,1.04],ln:[.44,0],lf:[-.44,0]});
  const gc2=P(S0,{hx:.14,hy:.7,lean:16,head:-2,an:[.8,1.12],af:[.74,1.06],ln:[.48,0],lf:[-.4,0]});
  fighter({id:'kai',name:'KAI',full:'KAI VOLTA',title:'THE STORM FIST',hp:1000,walkF:1.75,walkB:1.4,jumpV:7.4,jumpX:2.3,grav:22,dashV:5.4,push:.44,
    body:body({}),look:LOOK_KAI,st,rim:[255,220,80],glow:[255,215,70],gr:'cyan',stage:'roof',
    stats:[3,3,3],blurb:'Balanced brawler who throws lightning.',
    combos:[['5P','6P','nS'],['2P','2K'],['5P','5K','fS'],['6P','fS'],['2P','6P','X'],['5K','uS']],
    quote:'Your fists were slow. My thunder was not.',
    ending:['KAI FOLLOWED THE SIGNAL TO THE','CORE AND PULLED THE PLUG.','THE CITY LIGHTS NEVER FLICKERED AGAIN.'],
    specials:{
      nS:MV({name:'VOLT BOLT',tier:3,proj:1,keys:[[0,S0],[8,vb1],[13,vb2,'snap'],[26,vb2],[38,S0]],spawn:[[13,'bolt',.85,1.14]],aura:[2,13,'elec'],sfx:[[4,'zap'],[13,'elec']]}),
      fS:MV({name:'SPARK RUSH',tier:3,keys:[[0,S0],[7,sr0],[10,sr1,'snap'],[27,sr1],[42,S0]],vel:[[10,7.4,null],[27,0,null]],trail:[10,27],aura:[8,27,'elec'],cancel:{f:[24,32],su:1},sfx:[[9,'dash'],[10,'elec']],
        hits:[{f:[11,14],limb:'body',r:.34,dmg:48,hs:7,stun:20,bstun:12,kb:.6,spark:'elec',snd:'H',chip:.1},{f:[20,24],limb:'body',r:.34,dmg:54,hs:11,stun:22,bstun:14,kb:3.4,spark:'elec',snd:'H',chip:.1}]}),
      uS:MV({name:'RISING VOLT',tier:3,keys:[[0,P(C0,{hy:.46})],[3,rv1],[6,rv2,'snap'],[18,rv3],[30,J1],[70,J1]],vel:[[5,1.6,7.4]],landLag:14,inv:[0,8],trail:[5,18],aura:[4,20,'elec'],sfx:[[4,'elec'],[5,'whoosh',1.4]],
        hits:[{f:[5,8],limb:'an',r:.18,dmg:46,hs:7,stun:26,kb:.8,kby:5,spark:'elec',snd:'H'},{f:[9,11],limb:'an',r:.18,dmg:28,hs:5,stun:26,kby:5.6,kb:.6,spark:'elec'},{f:[12,15],limb:'an',r:.19,dmg:34,hs:12,kby:6.4,kb:2,kd:1,spark:'heavy',snd:'H'}]}),
      dS:MV({name:'THUNDER STOMP',tier:3,keys:[[0,S0],[5,ts1],[9,ts2],[30,ts2],[33,ts3,'snap'],[48,ts3],[60,S0]],vel:[[8,1.4,5.2]],landTo:32,spawn:[[33,'quake',.7,.08]],sfx:[[33,'slam']],fx:[[33,'stomp']],
        hits:[{f:[33,35],limb:'an',r:.3,dmg:30,hs:6,stun:18,kb:1,type:'low',spark:'heavy',snd:'H'}]}),
      X:MV({name:'GIGAVOLT CANNON',tier:4,super:1,keys:[[0,S0],[10,gc1],[22,gc2,'snap'],[78,gc2],[96,S0]],inv:[0,24],spawn:[[22,'beam',.9,1.1]],aura:[0,78,'elec'],sfx:[[22,'elec']]})
    }});
}
/* ---- RUNA ---- */
{
  const S0={hx:0,hy:.74,lean:16,head:-10,an:[.44,1.18],af:[.08,1.06],ln:[.3,0],lf:[-.3,0]};
  const C0={hx:.04,hy:.44,lean:30,head:-18,an:[.46,.86],af:[.18,.8],ln:[.34,0],lf:[-.32,0]};
  const J0={hx:0,hy:.68,lean:10,head:-8,an:[.4,1.12],af:[.06,1.0],ln:[.28,.32],lf:[-.12,.22]};
  const J1={hx:0,hy:.74,lean:12,head:-6,an:[.42,1.14],af:[.08,1.02],ln:[.22,.12],lf:[-.18,.04]};
  const st=stances(S0,C0,J0,J1,{WIN:P(S0,{hy:.82,lean:-2,head:14,an:[.14,1.24],af:[.22,1.18],ln:[.18,0],lf:[-.16,0]}),INTRO:P(S0,{hy:.78,lean:4,head:12,an:[.18,1.3],af:[.1,1.32],ln:[.18,0],lf:[-.2,0]})});
  const sh0=P(S0,{hx:-.04,lean:4,an:[-.14,1.42],af:[.1,1.0]}),sh1=P(S0,{hx:.08,lean:24,an:[.74,1.2],af:[-.1,1.0],ln:[.36,0]});
  const jsh=P(J0,{lean:26,an:[.7,.92],af:[-.12,1.1]});
  const cd0=P(C0,{lean:40}),cd1=P(S0,{hx:.16,hy:.6,lean:48,head:-10,an:[.8,.96],af:[-.42,1.0],ln:[.5,.08],lf:[-.56,0]});
  const ff1=P(S0,{hy:.78,lean:-10,head:10,an:[.1,1.4],af:[-.2,1.3],ln:[.4,1.25],lf:[-.1,.3],rot:-40});
  const vn0=P(S0,{hy:.6,lean:30,head:-6,an:[.12,1.12],af:[.16,1.08],ln:[.3,0],lf:[-.3,0]});
  const tp0=P(C0,{lean:44}),tps=P(S0,{hx:.14,hy:.62,lean:40,an:[.82,1.02],af:[-.46,1.1],ln:[.48,0],lf:[-.5,0]});
  const tpa=P(S0,{hx:.1,hy:.66,lean:24,an:[.3,1.7],af:[.72,.8],ln:[.4,0],lf:[-.4,0]}),tpb=P(S0,{hx:.12,hy:.6,lean:36,an:[.78,.7],af:[-.2,1.6],ln:[.42,0],lf:[-.46,0]});
  const tpk=P(S0,{hx:.04,hy:.84,lean:-16,head:12,an:[.1,1.5],af:[-.3,1.3],ln:[.5,1.6],lf:[-.08,.06]});
  fighter({id:'runa',name:'RUNA',full:'RUNA KAGE',title:'THE CRIMSON VEIL',hp:900,walkF:2.15,walkB:1.75,jumpV:7.9,jumpX:2.7,grav:22,dashV:6.4,push:.4,
    body:body({h:.95,bulk:.86,rWaist:.112,rChest:.152}),look:LOOK_RUNA,st,rim:[255,60,90],glow:[255,60,90],gr:'red',stage:'sakura',
    norm:{spd:.86,dmg:.88},stats:[2,5,3],blurb:'Lightning-fast ninja who strikes from behind.',
    combos:[['5P','6P','fS'],['2P','2K'],['5K','nS'],['5P','5P','fS'],['2P','6P','X'],['6P','dS']],
    quote:'You never saw me. Nobody ever does.',
    ending:['RUNA VANISHED INTO THE STATIC.','SOME SAY SHE STILL GUARDS','THE LAST CABINET AT MIDNIGHT.'],
    specials:{
      nS:MV({name:'SHURIKEN',tier:3,proj:1,keys:[[0,S0],[5,sh0],[9,sh1,'snap'],[18,sh1],[28,S0]],spawn:[[9,'shuriken',.8,1.2]],sfx:[[9,'shuriken']]}),
      jS:MV({name:'AIR SHURIKEN',tier:3,air:1,proj:1,keys:[[0,J0],[4,P(J0,{an:[-.1,1.4]})],[8,jsh,'snap'],[20,jsh],[26,J1]],spawn:[[8,'shurikenD',.6,.95]],sfx:[[8,'shuriken']],vel:[[8,null,1.2]]}),
      fS:MV({name:'CRIMSON DASH',tier:3,keys:[[0,S0],[5,cd0],[8,cd1,'snap'],[18,cd1],[32,S0]],vel:[[8,12.5,null],[17,1,null]],noPush:[7,18],trail:[8,20],sfx:[[8,'dash']],
        hits:[{f:[9,15],limb:'an',r:.28,dmg:70,hs:10,stun:20,bstun:12,kb:2.2,spark:'slash',snd:'H',chip:.1}]}),
      uS:MV({name:'FALCON FLIP',tier:3,keys:[[0,C0],[4,ff1],[10,P(ff1,{rot:-140})],[16,P(ff1,{rot:-250,ln:[.3,.6]})],[22,P(J1,{rot:-340})],[30,P(J1,{rot:-360})],[70,P(J1,{rot:-360})]],vel:[[4,-.6,7.0]],landLag:10,inv:[0,7],trail:[4,22],sfx:[[4,'whoosh',1.5]],
        hits:[{f:[4,8],limb:'ln',r:.18,dmg:46,hs:8,stun:24,kby:5.6,kb:1,spark:'slash',snd:'H'},{f:[9,13],limb:'ln',r:.18,dmg:40,hs:12,kby:6.6,kb:2.2,kd:1,spark:'heavy',snd:'H'}]}),
      dS:MV({name:'VANISH',tier:3,keys:[[0,S0],[6,vn0],[18,vn0],[28,S0]],inv:[6,18],fx:[[7,'vanish'],[16,'reappear']],sfx:[[7,'teleport']]}),
      X:MV({name:'THOUSAND PETALS',tier:4,super:1,cine:1,whiffEnd:44,keys:[[0,S0],[10,tp0],[13,tps,'snap'],[19,tps],[24,tpa,'snap'],[31,tpb,'snap'],[38,tpa,'snap'],[45,tpb,'snap'],[52,tpa,'snap'],[60,tpk,'snap'],[70,tpk],[84,S0]],
        inv:[0,22],vel:[[13,14,null],[19,0,null]],noPush:[12,20],trail:[13,62],aura:[0,62,'petal'],
        hits:[{f:[14,19],limb:'body',r:.36,dmg:40,hs:10,stun:40,bstun:14,kb:.2,spark:'slash',snd:'H',chip:.15}],
        cineFx:[[22,'blinkL'],[29,'blinkR'],[36,'blinkL'],[43,'blinkR'],[50,'blinkL'],[57,'blinkC']],
        cineHits:[[24,{dmg:34,hs:5,spark:'slash'}],[31,{dmg:34,hs:5,spark:'slash'}],[38,{dmg:34,hs:5,spark:'slash'}],[45,{dmg:34,hs:5,spark:'slash'}],[52,{dmg:38,hs:6,spark:'slash'}],[61,{dmg:70,hs:16,kby:7.5,kb:2.5,kd:1,spark:'heavy'}]]})
    }});
}
/* ---- MAGNUS ---- */
{
  const S0={hx:0,hy:.78,lean:14,head:-6,an:[.46,1.12],af:[.3,1.02],ln:[.28,0],lf:[-.3,0]};
  const C0={hx:.04,hy:.52,lean:26,head:-14,an:[.5,.86],af:[.34,.78],ln:[.34,0],lf:[-.32,0]};
  const J0={hx:0,hy:.7,lean:10,head:-6,an:[.44,1.1],af:[.26,1.0],ln:[.28,.3],lf:[-.14,.2]};
  const J1={hx:0,hy:.76,lean:12,head:-6,an:[.46,1.12],af:[.28,1.02],ln:[.22,.1],lf:[-.2,.04]};
  const st=stances(S0,C0,J0,J1,{WIN:P(S0,{hy:.82,lean:-2,head:-8,an:[.16,1.56],af:[-.04,1.56],eN:1,eF:1,ln:[.26,0],lf:[-.26,0]}),INTRO:P(S0,{hy:.8,lean:6,head:-4,an:[.28,1.2],af:[.2,1.14],eN:1,eF:1})});
  const bt0=P(S0,{hx:.1,hy:.6,lean:58,head:-20,an:[.72,.05],af:[.6,.1],ln:[.38,0],lf:[-.36,0]});
  const bt1=P(S0,{hx:-.05,hy:.82,lean:-14,head:-10,an:[0,1.95],af:[-.12,1.9],ln:[.3,0],lf:[-.34,0]});
  const bt2=P(S0,{hx:.12,hy:.76,lean:30,head:-4,an:[.82,1.5],af:[.72,1.44],ln:[.4,0],lf:[-.3,0]});
  const bc0=P(S0,{hx:-.08,hy:.7,lean:30,an:[.3,.9],af:[.1,.85],ln:[.36,0],lf:[-.44,0]});
  const bc1=P(S0,{hx:.14,hy:.72,lean:42,head:-16,an:[.36,1.18],af:[.16,1.0],ln:[.48,.06],lf:[-.5,0]});
  const sb1=P(S0,{hy:.86,lean:0,head:-8,an:[.86,1.38],af:[-.82,1.36],ln:[.2,.2],lf:[-.2,.1]});
  const ic0=P(S0,{hx:.1,lean:26,an:[.72,1.2],af:[.64,1.12],ln:[.38,0]});
  const icL=P(S0,{hy:.84,lean:-6,head:-10,an:[.1,2.0],af:[0,1.96],ln:[.3,0],lf:[-.32,0]});
  const icS=P(S0,{hx:.18,hy:.55,lean:44,head:-4,an:[.9,.4],af:[.8,.35],ln:[.46,0],lf:[-.4,0]});
  const mdJ=P(J0,{hy:.72,lean:-4,head:-10,an:[.1,1.96],af:[0,1.92]});
  fighter({id:'magnus',name:'MAGNUS',full:'MAGNUS STROM',title:'THE IRON CHAMPION',hp:1150,walkF:1.3,walkB:1.05,jumpV:6.8,jumpX:2.0,grav:22,dashV:4.2,push:.6,
    body:body({h:1.1,bulk:1.36,headR:.1,rChest:.19,rWaist:.14,rNeck:.07,rDelt:.084}),look:LOOK_MAGNUS,st,rim:[255,140,40],glow:[255,140,40],gr:'volt',stage:'foundry',
    norm:{spd:1.18,dmg:1.22,reach:1.06},stats:[5,1,3],blurb:'Slow giant whose grabs end rounds.',
    combos:[['5P','6P','fS'],['2P','2K'],['5K','nS'],['6P','X'],['2P','6P','fS']],
    quote:'Get up. I want to throw you again.',
    ending:['MAGNUS CARRIED THE CORE HOME','ON ONE SHOULDER.','IT NOW HOLDS HIS CHAMPIONSHIP BELT.'],
    specials:{
      nS:MV({name:'BOULDER TOSS',tier:3,proj:1,keys:[[0,S0],[8,bt0],[18,bt1],[24,bt2,'snap'],[36,bt2],[48,S0]],spawn:[[24,'rock',.8,1.7]],hold:[9,24,'rock'],fx:[[8,'quarry']],sfx:[[8,'rock'],[24,'whoosh',1.5]]}),
      fS:MV({name:'BULL CHARGE',tier:3,keys:[[0,S0],[8,bc0],[12,bc1],[30,bc1],[46,S0]],vel:[[12,6.4,null],[30,0,null]],armor:[4,24],trail:[12,30],sfx:[[11,'dash']],
        hits:[{f:[13,28],limb:'body',r:.42,dmg:96,hs:13,stun:24,bstun:16,kb:4.2,kd:1,kby:3,spark:'heavy',snd:'H',chip:.1}]}),
      uS:MV({name:'SKY BREAKER',tier:3,keys:[[0,C0],[5,sb1,'snap'],[34,sb1],[50,J1],[80,J1]],vel:[[5,1.0,5.8]],landLag:16,inv:[0,8],spin:[5,34],sfx:[[5,'whoosh',1.6],[16,'whoosh',1.6],[26,'whoosh',1.6]],
        hits:[{f:[6,12],limb:'body',r:.6,dmg:44,hs:8,stun:26,kby:4.6,kb:1,spark:'heavy',snd:'H'},{f:[16,22],limb:'body',r:.6,dmg:38,hs:8,stun:26,kby:5,kb:1,spark:'heavy',snd:'H'},{f:[26,32],limb:'body',r:.6,dmg:50,hs:13,kby:6.2,kb:2.5,kd:1,spark:'heavy',snd:'H'}]}),
      dS:MV({name:'IRON CLAMP',tier:3,keys:[[0,S0],[6,ic0,'snap'],[12,ic0],[24,icL],[32,icS,'snap'],[50,icS],[62,S0]],sfx:[[5,'grab']],
        grab:{f:[6,10],range:1.08,cmd:1,path:[[10,.62,1.0,-20],[24,.1,2.15,-180],[32,.92,.1,-262]],rel:32,dmg:185,vx:.6,vy:-1,slam:1,miss:'dSmiss'}}),
      dSmiss:MV({name:'IRON CLAMP',tier:3,keys:[[0,ic0],[18,ic0],[36,S0]]}),
      X:MV({name:'MEGATON DROP',tier:4,super:1,keys:[[0,S0],[8,ic0,'snap'],[14,icL],[20,P(C0,{an:[.1,1.6],af:[0,1.56]})],[24,mdJ],[90,mdJ],[92,icS,'snap'],[118,icS],[130,S0]],inv:[0,30],
        vel:[[22,.8,12.5]],grav:.85,landTo:91,sfx:[[7,'grab'],[22,'whoosh',2]],
        grab:{f:[8,12],range:1.3,cmd:1,super:1,path:[[12,.6,1.0,-20],[18,.1,2.1,-180],[90,.1,2.1,-180],[92,1.0,.1,-262]],rel:92,dmg:360,vx:.6,vy:-1,slam:1,mega:1,miss:'Xmiss'}}),
      Xmiss:MV({name:'MEGATON DROP',tier:4,keys:[[0,ic0],[24,ic0],[44,S0]]})
    }});
}
/* ---- NOVA ---- */
{
  const S0={hx:0,hy:.82,lean:2,head:-2,an:[.34,1.16],af:[.02,1.14],ln:[.18,0],lf:[-.22,0]};
  const C0={hx:.02,hy:.52,lean:18,head:-10,an:[.4,.92],af:[.12,.9],ln:[.3,0],lf:[-.28,0]};
  const J0={hx:0,hy:.72,lean:0,head:-4,an:[.32,1.1],af:[-.04,1.08],ln:[.22,.26],lf:[-.12,.16]};
  const J1={hx:0,hy:.78,lean:2,head:-2,an:[.34,1.12],af:[-.02,1.1],ln:[.16,.1],lf:[-.16,.04]};
  const st=stances(S0,C0,J0,J1,{WIN:P(S0,{hy:.86,lean:-4,head:-14,an:[.3,1.5],af:[-.2,.9],ln:[.14,0],lf:[-.12,0]}),INTRO:P(S0,{hy:.84,head:8,an:[.26,1.0],af:[-.04,1.02]})});
  const po0=P(S0,{hx:-.04,lean:-6,an:[.1,1.0],af:[0,1.25]}),po1=P(S0,{hx:.08,lean:12,an:[.74,1.2],af:[.62,1.28],ln:[.32,0]});
  const pd0=P(S0,{lean:30,hy:.72,an:[.2,1.0],af:[-.3,1.1],ln:[.1,.22],lf:[-.4,.26]}),pd1=P(S0,{hx:.1,lean:20,an:[.84,1.3],af:[-.2,1.1],ln:[.4,0]});
  const ha=P(S0,{hy:.9,head:-14,an:[.3,1.92],af:[-.1,1.88],ln:[.16,.06],lf:[-.2,.02]});
  const gw=P(S0,{hy:.7,lean:22,an:[.7,.4],af:[.5,.5],ln:[.3,0],lf:[-.3,0]});
  const sd=P(J0,{lean:24,an:[.62,.84],af:[.5,.9]});
  const sn0=P(S0,{hy:.9,lean:-8,head:-16,an:[.2,1.96],af:[-.12,1.9]}),sn1=P(S0,{hx:.1,lean:14,an:[.8,1.4],af:[.7,1.34],ln:[.34,0]});
  fighter({id:'nova',name:'NOVA',full:'NOVA SIERRA',title:'THE ORBITAL WITCH',hp:950,walkF:1.55,walkB:1.45,jumpV:7.0,jumpX:2.2,grav:17,dashV:5.0,push:.42,
    body:body({h:1.04,bulk:.9,rWaist:.115,rChest:.158}),look:LOOK_NOVA,st,rim:[90,190,255],glow:[150,110,255],gr:'violet',stage:'orbit',
    norm:{dmg:.94,reach:1.04},stats:[3,3,5],blurb:'Floaty zoner who fills the screen with plasma.',
    combos:[['5P','6P','nS'],['2P','2K'],['5K','fS'],['6P','X'],['2P','5K','nS']],
    quote:'Gravity always wins. Today, so did I.',
    ending:['NOVA LAUNCHED THE CORE INTO','A STABLE ORBIT.','IT BLINKS HELLO EVERY 90 MINUTES.'],
    specials:{
      nS:MV({name:'PLASMA ORB',tier:3,proj:1,keys:[[0,S0],[10,po0],[16,po1,'snap'],[30,po1],[42,S0]],spawn:[[16,'orb',.9,1.24]],aura:[2,16,'plasma'],sfx:[[16,'plasma']]}),
      jS:MV({name:'STAR DROP',tier:3,air:1,proj:1,keys:[[0,J0],[6,P(J0,{an:[.2,1.3]})],[10,sd,'snap'],[22,sd],[28,J1]],spawn:[[10,'stardrop',.7,.9]],vel:[[10,-1,1.8]],sfx:[[10,'plasma']]}),
      fS:MV({name:'PHASE DASH',tier:3,keys:[[0,S0],[6,pd0],[22,pd0],[26,pd1,'snap'],[44,S0]],vel:[[6,7.6,null],[22,0,null]],pinv:[4,22],noPush:[6,20],trail:[6,22],aura:[6,22,'plasma'],sfx:[[6,'dash'],[25,'plasma']],
        hits:[{f:[26,29],limb:'an',r:.2,dmg:62,hs:10,stun:20,bstun:13,kb:3,spark:'plasma',snd:'H',chip:.1}]}),
      uS:MV({name:'HALO',tier:3,keys:[[0,S0],[6,ha,'snap'],[30,ha],[42,S0]],inv:[0,9],spawn:[[6,'halo',0,1.1]],sfx:[[6,'plasma']]}),
      dS:MV({name:'GRAVITY WELL',tier:3,proj:1,keys:[[0,S0],[8,gw],[24,gw],[36,S0]],spawn:[[10,'well',1.9,.05]],sfx:[[10,'plasma']]}),
      X:MV({name:'SUPERNOVA',tier:4,super:1,keys:[[0,S0],[12,sn0],[30,sn1,'snap'],[90,sn1],[104,S0]],inv:[0,32],spawn:[[30,'nova',1.3,1.2]],aura:[0,90,'plasma'],sfx:[[30,'plasma']]})
    }});
}
/* ---- ECHO: final boss, borrows everyone's best moves ---- */
{
  const S0={hx:0,hy:.8,lean:10,head:-6,an:[.4,1.3],af:[.12,1.26],ln:[.24,0],lf:[-.26,0]};
  const C0={hx:.04,hy:.5,lean:24,head:-14,an:[.44,1.0],af:[.25,.96],ln:[.32,0],lf:[-.3,0]};
  const J0={hx:0,hy:.7,lean:4,head:-6,an:[.36,1.22],af:[.12,1.18],ln:[.26,.3],lf:[-.12,.22]};
  const J1={hx:0,hy:.76,lean:6,head:-4,an:[.38,1.28],af:[.14,1.24],ln:[.2,.1],lf:[-.18,.04]};
  const st=stances(S0,C0,J0,J1,{WIN:P(S0,{hy:.86,lean:-6,head:-16,an:[.7,1.7],af:[-.6,1.66],ln:[.24,0],lf:[-.24,0]}),INTRO:P(S0,{hy:.86,lean:-4,head:-14,an:[.5,.9],af:[-.4,.9]})});
  const kai=ROSTER.kai.specials,runa=ROSTER.runa.specials;
  const gc1=P(S0,{hx:-.1,hy:.68,lean:-8,head:-8,an:[-.16,1.0],af:[-.22,1.04],ln:[.44,0],lf:[-.44,0]}),gc2=P(S0,{hx:.14,hy:.7,lean:16,head:-2,an:[.8,1.12],af:[.74,1.06],ln:[.48,0],lf:[-.4,0]});
  fighter({id:'echo',name:'ECHO',full:'ECHO',title:'THE GHOST IN THE MATRIX',hp:1300,walkF:1.8,walkB:1.5,jumpV:7.4,jumpX:2.4,grav:21,dashV:5.8,push:.44,boss:1,
    body:body({h:1.06}),look:LOOK_ECHO,st,rim:[120,240,255],glow:[80,230,255],gr:'cyan',stage:'core',
    norm:{spd:.94,dmg:1.05},stats:[4,4,4],blurb:'A copy of every fighter who ever played here.',
    combos:[['5P','6P','nS'],['2P','2K'],['5P','5K','fS'],['6P','X'],['5K','uS'],['2P','6P','dS']],
    quote:'I learned every move you made.',
    specials:{
      nS:MV(Object.assign({},kai.nS,{name:'PRISM BOLT',spawn:[[13,'prism',.85,1.14]],hits:[]})),
      fS:MV(Object.assign({},runa.fS,{name:'GHOST DASH',hits:runa.fS.hits.map(h=>Object.assign({},h,{spark:'elec'}))})),
      uS:MV(Object.assign({},kai.uS,{name:'ASCENSION',hits:kai.uS.hits.map(h=>Object.assign({},h))})),
      dS:MV(Object.assign({},runa.dS,{name:'BLINK'})),
      X:MV({name:'PRISM BREAK',tier:4,super:1,keys:[[0,S0],[10,gc1],[22,gc2,'snap'],[84,gc2],[100,S0]],inv:[0,24],spawn:[[22,'beam2',.9,1.1]],aura:[0,84,'elec'],sfx:[[22,'elec']]})
    }});
}
const PICKS=['kai','runa','magnus','nova'];
