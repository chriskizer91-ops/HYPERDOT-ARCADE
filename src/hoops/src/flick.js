// synthetic pointer flick with real (busy-waited) timestamps; client coords in CSS px
window.__flick=function(x0,y0,x1,y1,ms,steps,type){
  const cv=document.getElementById('gl'),pt=type||'mouse',id=type==='touch'?7:1;
  const mk=(n,x,y)=>new PointerEvent(n,{clientX:x,clientY:y,pointerId:id,pointerType:pt,isPrimary:true,bubbles:true,cancelable:true,buttons:n==='pointerup'?0:1});
  const spin=d=>{const t=performance.now();while(performance.now()-t<d);};
  cv.dispatchEvent(mk('pointerdown',x0,y0));
  for(let i=1;i<=steps;i++){spin(ms/steps);cv.dispatchEvent(mk('pointermove',x0+(x1-x0)*i/steps,y0+(y1-y0)*i/steps));}
  spin(4);cv.dispatchEvent(mk('pointerup',x1,y1));
};
0; // (an expression statement, so Playwright does not invoke the function above)
