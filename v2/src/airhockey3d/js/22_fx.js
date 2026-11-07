/* =====================================================================================
   22. EFFECTS — sparks where a hard hit lands, a light trail behind a fast puck in the colour
       of whoever hit it last, confetti out of the goal mouth, and a shower for a win.
       One additive points cloud for everything that flies, one ribbon per puck.
   ===================================================================================== */
const FXN=600,FX={pos:null,col:null,life:new Float32Array(FXN),max:new Float32Array(FXN),vel:new Float32Array(FXN*3),grav:new Float32Array(FXN),size:new Float32Array(FXN),base:new Float32Array(FXN*3),i:0,pts:null};
const TRAILN=26,TRAILS=[];
function fxInit(){
  const gm=new THREE.BufferGeometry();FX.pos=new Float32Array(FXN*3);FX.col=new Float32Array(FXN*3);
  gm.setAttribute('position',new THREE.BufferAttribute(FX.pos,3).setUsage(THREE.DynamicDrawUsage));gm.setAttribute('color',new THREE.BufferAttribute(FX.col,3).setUsage(THREE.DynamicDrawUsage));
  const dot=canvasTex(32,32,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,'#fff');gr.addColorStop(.35,'rgba(255,255,255,.7)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);},{srgb:false});
  FX.pts=new THREE.Points(gm,new THREE.PointsMaterial({size:.018,map:dot,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
  FX.pts.frustumCulled=false;SCENE.add(FX.pts);for(let i=0;i<FXN;i++)FX.pos[i*3+1]=-9;
  for(let k=0;k<3;k++){const g2=new THREE.BufferGeometry(),p=new Float32Array(TRAILN*2*3),c=new Float32Array(TRAILN*2*3),idx=[];
    for(let i=0;i<TRAILN-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    g2.setAttribute('position',new THREE.BufferAttribute(p,3).setUsage(THREE.DynamicDrawUsage));g2.setAttribute('color',new THREE.BufferAttribute(c,3).setUsage(THREE.DynamicDrawUsage));g2.setIndex(idx);
    const m=new THREE.Mesh(g2,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));m.frustumCulled=false;m.renderOrder=2;SCENE.add(m);
    TRAILS.push({m,p,c,hist:[],col:new THREE.Color(),on:0});}
}
const _c=new THREE.Color();
function emit(x,y,z,vx,vy,vz,col,life,grav,size){
  const i=FX.i;FX.i=(FX.i+1)%FXN;FX.pos[i*3]=x;FX.pos[i*3+1]=y;FX.pos[i*3+2]=z;FX.vel[i*3]=vx;FX.vel[i*3+1]=vy;FX.vel[i*3+2]=vz;
  FX.life[i]=life;FX.max[i]=life;FX.grav[i]=grav;FX.size[i]=size||1;_c.set(col);FX.base[i*3]=_c.r;FX.base[i*3+1]=_c.g;FX.base[i*3+2]=_c.b;
}
function fxHit(x,z,col,k){if(k<.12)return;const n=4+k*16|0;for(let i=0;i<n;i++){const a=Math.random()*TAU,s=.4+Math.random()*1.6*k;emit(x,TB.DECK+.012,z,Math.cos(a)*s,Math.random()*.6*k,Math.sin(a)*s,i%3?col:'#ffffff',.18+Math.random()*.25,2,1);}}
function fxSpark(x,z,col,k){const n=3+k*8|0;for(let i=0;i<n;i++){const a=Math.random()*TAU,s=.3+Math.random()*k;emit(x,TB.DECK+.02,z,Math.cos(a)*s,Math.random()*.4,Math.sin(a)*s,col,.15+Math.random()*.15,2,1);}}
const CONF=['#ff2f8a','#2fd8ff','#ffd23f','#8a4bff','#6aff7a','#ffffff'];
function fxGoal(x,sz,col){
  for(let i=0;i<70;i++){const sp=.6+Math.random()*1.8;emit(clamp(x,-.14,.14)+(Math.random()-.5)*.1,TB.DECK+.03,sz*(TB.HL+.02),(Math.random()-.5)*1.4,1+Math.random()*2.2,-sz*sp,i%2?col:pick(CONF),1+Math.random()*.9,3.2,1.6);}
}
function fxWin(col){for(let i=0;i<220;i++){emit((Math.random()-.5)*1.4,TB.DECK+1+Math.random()*.6,(Math.random()-.5)*2.4,(Math.random()-.5)*.5,-.2-Math.random()*.4,(Math.random()-.5)*.5,i%3?pick(CONF):col,2+Math.random()*1.5,1.1,1.8);}}
function fxTick(dt){
  for(let i=0;i<FXN;i++){if(FX.life[i]<=0){FX.pos[i*3+1]=-9;continue;}
    FX.life[i]-=dt;const j=i*3,dr=Math.exp(-dt*1.6);FX.vel[j]*=dr;FX.vel[j+2]*=dr;FX.vel[j+1]-=FX.grav[i]*dt;
    FX.pos[j]+=FX.vel[j]*dt;FX.pos[j+1]+=FX.vel[j+1]*dt;FX.pos[j+2]+=FX.vel[j+2]*dt;
    if(FX.pos[j+1]<TB.DECK+.004&&Math.abs(FX.pos[j])<TB.HW&&Math.abs(FX.pos[j+2])<TB.HL){FX.pos[j+1]=TB.DECK+.004;FX.vel[j+1]*=-.3;}
    else if(FX.pos[j+1]<.01){FX.pos[j+1]=.01;FX.vel[j+1]=0;}
    const k=Math.max(0,FX.life[i]/FX.max[i]),b=Math.min(1,k*1.6)*2.2;FX.col[j]=FX.base[j]*b;FX.col[j+1]=FX.base[j+1]*b;FX.col[j+2]=FX.base[j+2]*b;}
  FX.pts.geometry.attributes.position.needsUpdate=true;FX.pts.geometry.attributes.color.needsUpdate=true;
}
/* the trails: each puck's recent path as a ribbon flat on the deck, fading to nothing */
function trailTick(dt,pucks){
  for(let k=0;k<3;k++){const T=TRAILS[k],p=pucks[k];
    const on=p&&p.vis;T.on+=((on&&p.spd>1.8?1:0)-T.on)*Math.min(1,dt*(on?6:12));
    /* a puck that vanished, or jumped (a new serve, a replay starting), starts a fresh trail */
    if(on&&T.hist.length&&Math.hypot(p.x-T.hist[0][0],p.z-T.hist[0][1])>.3)T.hist.length=0;
    if(on){T.hist.unshift([p.x,p.z]);if(T.hist.length>TRAILN)T.hist.pop();T.col.set(p.col);}else T.hist.length=0;
    const n=T.hist.length;T.m.visible=n>2&&T.on>.02;if(!T.m.visible)continue;
    for(let i=0;i<TRAILN;i++){const h=T.hist[Math.min(i,n-1)],h2=T.hist[Math.min(i+1,n-1)]||h;let dx=h[0]-h2[0],dz=h[1]-h2[1];const l=Math.hypot(dx,dz);
      if(l<1e-5){const h0=T.hist[Math.min(n-1,Math.max(0,i-1))];dx=h0[0]-h[0];dz=h0[1]-h[1];}const ll=Math.hypot(dx,dz)||1,nx=-dz/ll,nz=dx/ll,u=i/(TRAILN-1),w=TB.RP*(1-u)*.95;
      const y=TB.DECK+.003,a=i*6;T.p[a]=h[0]+nx*w;T.p[a+1]=y;T.p[a+2]=h[1]+nz*w;T.p[a+3]=h[0]-nx*w;T.p[a+4]=y;T.p[a+5]=h[1]-nz*w;
      const b=(1-u)*(1-u)*T.on*1.6*(i<n?1:0);for(const o of [0,3]){T.c[a+o]=T.col.r*b;T.c[a+o+1]=T.col.g*b;T.c[a+o+2]=T.col.b*b;}}
    T.m.geometry.attributes.position.needsUpdate=true;T.m.geometry.attributes.color.needsUpdate=true;}
}
