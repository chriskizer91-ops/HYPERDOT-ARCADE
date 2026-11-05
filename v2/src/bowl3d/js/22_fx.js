/* =====================================================================================
   22. EFFECTS — impact sparks where the solver reports a hard contact, strike confetti that
       flutters down in front of the pin deck, and a neon trail behind the rolling ball.
       All of it lives inside ALLEY, in physics coordinates.
   ===================================================================================== */
const PTS_VS=`attribute float aSize;attribute vec3 aCol;varying vec3 vC;uniform float uPx;
void main(){vC=aCol;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uPx/max(.05,-mv.z);gl_Position=projectionMatrix*mv;}`;
const PTS_FS=`varying vec3 vC;void main(){vec2 q=gl_PointCoord-.5;float d=dot(q,q)*4.;if(d>1.)discard;gl_FragColor=vec4(vC*(1.-d)*(1.-d),1.);}`;
function pointCloud(n){
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));
  geo.setAttribute('aSize',new THREE.BufferAttribute(new Float32Array(n),1));geo.setAttribute('aCol',new THREE.BufferAttribute(new Float32Array(n*3),3));
  const mat=new THREE.ShaderMaterial({vertexShader:PTS_VS,fragmentShader:PTS_FS,uniforms:{uPx:{value:400}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
  const p=new THREE.Points(geo,mat);p.frustumCulled=false;p.renderOrder=6;ALLEY.add(p);return p;}
const SPK=pointCloud(320),TRL=pointCloud(32);const SP=[];
function spark(x,y,z,s){const n=Math.min(16,3+s*2.4|0);
  for(let i=0;i<n;i++){if(SP.length>=320)break;const a=Math.random()*TAU,u=Math.random()*2-1,v=rnd(.6,2.4)*(.5+s*.25),r=Math.sqrt(1-u*u);
    SP.push({x,y,z,vx:Math.cos(a)*r*v,vy:Math.abs(u)*v+.6,vz:Math.sin(a)*r*v,life:rnd(.25,.6),max:.6,c:Math.random()<.5?[.7,.9,1.6]:[1.6,1.5,1.7],sz:rnd(.012,.024)});}}
/* confetti: little cards that tumble and flutter */
const CONF=new THREE.InstancedMesh(new THREE.PlaneGeometry(.034,.02),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,fog:false}),180);
CONF.frustumCulled=false;CONF.count=0;ALLEY.add(CONF);const CF=[];
const CFC=[[1,.35,.7],[.31,.88,1],[1,.82,.25],[.47,1,.47],[.67,.47,1]].map(c=>new THREE.Color(c[0]*2,c[1]*2,c[2]*2));
function confetti(n){for(let i=0;i<n;i++){if(CF.length>=180)break;
  CF.push({x:rnd(-.9,.9),y:rnd(1.3,2.1),z:rnd(15.6,17.4),vx:rnd(-.3,.3),vy:rnd(-.2,.3),vz:rnd(-.3,.1),rx:rnd(0,TAU),ry:rnd(0,TAU),wr:rnd(4,10),ph:rnd(0,TAU),life:rnd(2.2,3.6),c:pick(CFC)});}}
const TRAIL=[];
function fxTick(dt){
  /* sparks */
  let j=0;for(const p of SP){p.life-=dt;if(p.life<=0)continue;p.vy-=6*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.y<0){p.y=0;p.vy*=-.3;}SP[j++]=p;}SP.length=j;
  const pa=SPK.geometry.attributes,P=pa.position.array,Sz=pa.aSize.array,Cc=pa.aCol.array;
  for(let i=0;i<320;i++){const p=SP[i];if(!p){Sz[i]=0;continue;}const a=clamp(p.life/p.max*1.6,0,1);P[i*3]=p.x;P[i*3+1]=p.y;P[i*3+2]=p.z;Sz[i]=p.sz;Cc[i*3]=p.c[0]*a*2;Cc[i*3+1]=p.c[1]*a*2;Cc[i*3+2]=p.c[2]*a*2;}
  pa.position.needsUpdate=pa.aSize.needsUpdate=pa.aCol.needsUpdate=true;
  /* confetti */
  j=0;for(const c of CF){c.life-=dt;if(c.life<=0||c.y<0)continue;c.ph+=dt*c.wr*.5;c.vy=Math.max(c.vy-2.2*dt,-.55);c.vx+=Math.sin(c.ph)*.9*dt;c.vx*=.98;c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt;c.rx+=dt*c.wr;c.ry+=dt*c.wr*.7;CF[j++]=c;}CF.length=j;
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),one=new THREE.Vector3(1,1,1);
  for(let i=0;i<CF.length;i++){const c=CF[i];e.set(c.rx,c.ry,0);q.setFromEuler(e);v.set(c.x,c.y,c.z);m.compose(v,q,one);CONF.setMatrixAt(i,m);CONF.setColorAt(i,c.c);}
  CONF.count=CF.length;CONF.instanceMatrix.needsUpdate=true;if(CONF.instanceColor)CONF.instanceColor.needsUpdate=true;
  /* the trail: recent ball positions, fading */
  const b=PW.ball,n=QP[QL].trail;
  if(b.on&&!b.kin&&G.ph!=='aim'&&G.ph!=='swing'){TRAIL.push([b.x,b.y,b.z]);while(TRAIL.length>n)TRAIL.shift();}else if(TRAIL.length)TRAIL.shift();
  const ta=TRL.geometry.attributes,TP=ta.position.array,TS2=ta.aSize.array,TC=ta.aCol.array,ca=BSTY.a,cb=BSTY.b;
  for(let i=0;i<32;i++){const p=TRAIL[i];if(!p){TS2[i]=0;continue;}const u=(i+1)/TRAIL.length;TP[i*3]=p[0];TP[i*3+1]=p[1];TP[i*3+2]=p[2];TS2[i]=BR*1.3*u;
    TC[i*3]=lerp(cb[0],ca[0],u)*u*.5;TC[i*3+1]=lerp(cb[1],ca[1],u)*u*.5;TC[i*3+2]=lerp(cb[2],ca[2],u)*u*.5;}
  ta.position.needsUpdate=ta.aSize.needsUpdate=ta.aCol.needsUpdate=true;
  const px=VH/(2*Math.tan(CAM3.fov*Math.PI/360));SPK.material.uniforms.uPx.value=px;TRL.material.uniforms.uPx.value=px;
}
