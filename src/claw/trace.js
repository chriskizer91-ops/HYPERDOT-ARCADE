(()=>{const G=__game,M=G.M,C=G.CL,out=[];
G.start();G.ffUntil(()=>M.ph==='aimX');const TB=G.pickTarget();M.tgtX=TB.cx;M.lockPend=1;G.ffUntil(()=>M.ph==='aimZ');M.tgtZ=G.bz(TB);M.lockPend=1;
G.ffUntil(()=>M.ph==='drop');
for(let t=0;t<240;t++){G.tick(1/60);if(t%4===0){const vy=(C.hy-C.oy)*240,vx=(C.hx-C.ox)*240;
  out.push(`${M.ph.padEnd(6)} t${(t/60).toFixed(2)} h(${C.hx.toFixed(1)},${C.hy.toFixed(1)},${C.hz.toFixed(1)}) v(${vx.toFixed(0)},${vy.toFixed(0)}) L${C.L.toFixed(1)} sl${C.slack.toFixed(1)} tilt${C.tilt.toFixed(2)} ph${C.ph[0].toFixed(2)}/${C.ph[1].toFixed(2)} tch${C.touch} tgt(${TB.cx.toFixed(0)},${TB.cy.toFixed(0)},${G.bz(TB).toFixed(0)}) pc${TB.pc} comp${TB.comp.toFixed(2)}`);}}
return TB.T.id+'\n'+out.join('\n');})()
