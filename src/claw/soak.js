// Page-side autopilot: plays complete games through the real input path (KEY/LATCH, pointer drags, hold-to-travel).
window.SOAK=(function(){
  const G=__game,S=G.S,M=G.M,C=G.CL,K=G.KEY,L=G.LATCH,P=G.PTR;
  const tick=()=>{G.tick(1/60);G.endInput();};
  const SPK=[],TS_=[],RS_=[];let tRender=0,nRender=0,tTick=0,nTick=0,maxTick=0,maxRender=0;
  function step(n=1,renderEvery=3){for(let i=0;i<n;i++){const a=performance.now();G.tick(1/60);const b=performance.now();G.endInput();const dt=b-a;TS_.push(dt);tTick+=dt;nTick++;if(dt>maxTick)maxTick=dt;G.PROF.on=false;
    if(nTick%renderEvery===0){const c=performance.now();G.render();const d=performance.now()-c;RS_.push(d);tRender+=d;nRender++;if(d>maxRender)maxRender=d;}}}
  function tap(code){L.add(code);step(1);}
  function release(){for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','ShiftLeft'])K[k]=false;}
  /* drive one axis with arrow keys, braking early like a person who knows the gantry coasts */
  function driveKeys(axis,target){
    const pos=axis?C.gz:C.gx,vel=axis?C.gvz:C.gvx,d=target-pos,brake=vel*vel/(2*130)+.6;
    const pos1=axis?'ArrowUp':'ArrowRight',neg1=axis?'ArrowDown':'ArrowLeft';release();
    if(Math.abs(d)>brake&&Math.sign(d)!==-Math.sign(vel)||Math.abs(d)>brake+3){K[d>0?pos1:neg1]=true;return false;}
    return Math.abs(d)<1.6&&Math.abs(vel)<3;
  }
  function screenOf(x,z){const W=G.W(),KS=W/256,s=200/(200+z);return [W/2+(x-120)*s*KS,0];}
  function playGame(style,seedTargetErr=2){
    const res={style,credits:[],err:null};let guard=0;
    if(S.mode!=='title'){G.attract();}
    tap('Enter');
    let lastCredit=0,tgt=null,phaseT=0,lastPh='',z0=0;
    while(S.mode==='play'&&guard++<60*200){
      const ph=M.ph;if(ph!==lastPh){phaseT=0;lastPh=ph;}phaseT++;
      if(S.credit!==lastCredit){lastCredit=S.credit;res.credits.push({S:M.S});tgt=null;}
      if(ph==='aimX'||ph==='aimZ'){
        if(!tgt){const b=G.pickTarget();tgt=b?{x:b.cx+(Math.random()*2-1)*seedTargetErr,z:G.bz(b)+(Math.random()*2-1)*seedTargetErr*.6,id:b.T.id}:{x:120,z:25,id:'?'};res.credits[res.credits.length-1].tgt=tgt.id;}
        const axis=ph==='aimZ'?1:0,target=axis?Math.min(43,Math.max(7,tgt.z)):Math.min(220,Math.max(20,tgt.x));
        if(style==='keys'){if(phaseT>8&&driveKeys(axis,target)){release();step(2);tap('Space');step(2);continue;}}
        else if(style==='hold'){ /* real-machine style: hold the button, let go near the spot (overshoot is part of it) */
          const pos=axis?C.gz:C.gx,vel=axis?C.gvz:C.gvx;
          if(phaseT===10){L.add('Space');K.Space=true;}
          if(phaseT>10&&K.Space&&pos+vel*vel/(2*130)>=target-.5){K.Space=false;}
          if(target<pos&&phaseT===10){K.Space=false;L.delete('Space');tap('Space');}
        }
        else if(style==='drag'){ /* pointer: X follows the finger; depth by a vertical drag */
          const W=G.W(),H=G.H(),KS=W/256;
          if(phaseT===10){z0=C.gz;P.x=axis?W*.6:screenOf(C.gx,C.gz)[0];P.y=H*.6;P.down=true;P.pressed=true;P.on=true;}
          if(phaseT>10&&phaseT<50&&P.down){if(!axis)P.x=screenOf(target,C.gz)[0];else P.y=H*.6-(target-z0)*KS/1.25;}
          if(phaseT===50){P.down=false;P.released=true;}
        }else if(style==='tap'){ /* tap where to go in X, tap the inset for depth */
          if(phaseT===10){const W=G.W(),H=G.H(),KS=W/256;let x,y;if(!axis){x=screenOf(target,C.gz)[0];y=H*.6;}else{const iw=Math.round(46*KS),ih=Math.round(20*KS),ix=W-(KS<1?3:4)-iw-2,iy=Math.round(12*KS)+2;x=ix+C.gx/240*iw;y=iy+ih-target/50*ih;}
            P.x=x;P.y=y;P.down=true;P.pressed=true;}
          if(phaseT===13){P.down=false;P.released=true;}
        }
      }
      step(1);
    }
    release();
    if(S.mode!=='over'){res.err='did not reach over (mode '+S.mode+' ph '+M.ph+')';return res;}
    res.score=S.score;res.tickets=S.tickets;res.prizes=S.prizes.map(i=>G.CAST[i].id);res.consol=S.consol;
    step(60*4);tap('Enter');step(30);res.backToTitle=S.mode==='title';
    return res;
  }
  const pc=(a,q)=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y);return +s[Math.min(s.length-1,Math.floor(q*s.length))].toFixed(2);};
  return {SPK,playGame,step,stats:()=>({tickMed:pc(TS_,.5),tickP90:pc(TS_,.9),tickP99:pc(TS_,.99),renderMed:pc(RS_,.5),renderP90:pc(RS_,.9),renderP99:pc(RS_,.99),tick:tTick/nTick,render:tRender/nRender,maxTick,maxRender,nTick,nRender}),reset(){tRender=nRender=tTick=nTick=maxTick=maxRender=0;TS_.length=0;RS_.length=0;SPK.length=0;}};
})();
