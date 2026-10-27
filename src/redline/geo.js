/* ---------- circuit geometry from a turtle plan ----------
   A plan is a list of pieces: {s:n} a straight of n segments, {t:deg,n} a corner turning deg
   (right is positive) over n segments with eased entry and exit. Optional on any piece:
   h (height at its end, in segments), tun (a tunnel), free (one of the two straights whose
   lengths are solved so the loop closes exactly), name (shown in pace notes).          */
const SEG=200;
function planHeadings(plan,len){
  const dth=[],piece=[];
  plan.forEach((p,pi)=>{
    if(p.s!=null){const n=Math.max(8,Math.round(len[pi]));for(let k=0;k<n;k++){dth.push(0);piece.push(pi);}}
    else{const n=p.n,A=p.t*PI/180,e=Math.max(1,Math.round(n*(p.e!=null?p.e:.3)));
      /* trapezoid: ramp in over e segments, hold, ramp out: the curvature of a real road corner */
      const w=[];for(let k=0;k<n;k++)w.push(Math.min(1,(k+.5)/e,(n-k-.5)/e));
      const sw=w.reduce((a,b)=>a+b,0);for(let k=0;k<n;k++){dth.push(A*w[k]/sw);piece.push(pi);}}
  });
  return {dth,piece};
}
function walk(dth){let x=0,z=0,h=0;const pts=[];for(let i=0;i<dth.length;i++){pts.push([x,z,h]);h+=dth[i];x+=Math.sin(h-dth[i]*.5);z+=Math.cos(h-dth[i]*.5);}return {pts,end:[x,z],turn:h};}
/* closing the loop: headings depend only on the corners, so the end point is linear in the straights'
   lengths. Find the lengths nearest the plan's (least squares) that make it close exactly, keeping each
   straight at least 30 segments (an active set: pin any that go short and solve again). */
function closeStraights(plan){
  const nom=plan.map(p=>p.s!=null?p.s:0),len=nom.slice(),S=plan.map((p,i)=>p.s!=null?i:-1).filter(i=>i>=0);
  const H0=planHeadings(plan,nom.map((v,i)=>plan[i].s!=null?0:v)),dir={};
  {let h=0,k=0;plan.forEach((p,pi)=>{if(p.s!=null)dir[pi]=[Math.sin(h),Math.cos(h)];while(k<H0.dth.length&&H0.piece[k]===pi){h+=H0.dth[k];k++;}});}
  const C=walk(H0.dth).end;      /* the corners alone, with zero-length straights (8 each, a constant offset) */
  const base=S.reduce((a,i)=>[a[0]+dir[i][0]*8,a[1]+dir[i][1]*8],[0,0]);
  const pinned=new Set();
  for(let it=0;it<20;it++){
    const fr=S.filter(i=>!pinned.has(i));let b=[-C[0]+base[0],-C[1]+base[1]];
    for(const i of S)if(pinned.has(i)){b[0]-=dir[i][0]*len[i];b[1]-=dir[i][1]*len[i];}
    let r=[b[0],b[1]],a00=0,a01=0,a11=0;for(const i of fr){r[0]-=dir[i][0]*nom[i];r[1]-=dir[i][1]*nom[i];a00+=dir[i][0]*dir[i][0];a01+=dir[i][0]*dir[i][1];a11+=dir[i][1]*dir[i][1];}
    const det=a00*a11-a01*a01;if(Math.abs(det)<1e-6)break;const l0=(a11*r[0]-a01*r[1])/det,l1=(-a01*r[0]+a00*r[1])/det;
    let bad=false;for(const i of fr){len[i]=nom[i]+dir[i][0]*l0+dir[i][1]*l1;if(len[i]<30){pinned.add(i);len[i]=30;bad=true;}}
    if(!bad)break;
  }
  return len;
}
function circuitGeom(plan){
  const len=closeStraights(plan),H=planHeadings(plan,len),Wk=walk(H.dth);
  const N=H.dth.length,curve=new Float32Array(N),y=new Float32Array(N),tun=new Uint8Array(N),pc=new Int16Array(N);
  for(let i=0;i<N;i++){curve[i]=H.dth[i]*SEG;pc[i]=H.piece[i];tun[i]=plan[H.piece[i]].tun?1:0;}
  /* heights: each piece eases from the previous piece's height to its own h */
  let i0=0,h0=0;plan.forEach((p,pi)=>{let i1=i0;while(i1<N&&H.piece[i1]===pi)i1++;const h1=p.h!=null?p.h:h0;
    for(let i=i0;i<i1;i++){const t=(i-i0)/Math.max(1,i1-i0);y[i]=(h0+(h1-h0)*(t*t*(3-2*t)))*SEG;}i0=i1;h0=h1;});
  return {N,curve,y,tun,pc,pts:Wk.pts,len,closeErr:Math.hypot(Wk.end[0],Wk.end[1]),turn:Wk.turn*180/PI};
}
