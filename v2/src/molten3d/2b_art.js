/* ---------------------------------------------------------------------------------
   ART — the painted surfaces and backdrops (made from the generated images by prep_art.py and
   packed into this file by build.py). Surfaces go to the GPU as two texture arrays: colour with a
   height in alpha, and the bumps worked out from that height. Until they are ready the cave is
   painted the old way, so the game never waits for them.
   --------------------------------------------------------------------------------- */
const ART=/*@@ART@@*/{};
const ARTL=['basalt','strata','columns','frost','rubble','crystal','iron','craze','crust','obsidian','plate','brick','hammered','ice','rimeskin','snow','ripples'];
/* how hard each surface's bumps stand out, and whether bright means low (glowing seams sit in the cracks) */
const ARTB={crust:[3,1],crystal:[2.5,0],ice:[1.4,0],rimeskin:[2.4,0],ripples:[2.2,0],snow:[2.4,0],plate:[3.2,0],brick:[3,0],craze:[3,0]};
/* each stage's stones: [main, patches, ledges] as layer numbers above, and how frozen the rock is */
const STAGE_ART=[
  {rockL:[0,1,4],cold:0,back:'back1'},   /* FORGE GATE: basalt, banded rock, rubble */
  {rockL:[3,1,15],cold:1,back:'back2'},  /* GLACIER VEIN: frosted rock, snow on the ledges */
  {rockL:[1,0,4],cold:0,back:'back3'},   /* THE UNDERCROFT */
  {rockL:[0,1,4],cold:.25,back:'back4'}, /* DROWNED FOUNDRY */
  {rockL:[3,1,15],cold:1,back:'back5'},  /* THE HOAR KING */
  {rockL:[0,1,4],cold:0,back:'back6'},   /* THE CALDERA */
  {rockL:[0,9,9],cold:0,back:'back7'},   /* OBSIDIAN DEEP: glass among the basalt */
  {rockL:[3,13,15],cold:1,back:'back8'}  /* THE WINTER THRONE: rock under ice */
];
let ARTOK=0;const BACK={img:{},cur:'',tex:null,ok:0,k:0,asp:2.33,t:0,gain:1};
function artBlur(a,S,r){   /* a box blur that wraps at the edges (two passes, x then y) */
  const o=new Float32Array(a.length),t=new Float32Array(a.length),k=1/(2*r+1);
  for(let y=0;y<S;y++){let s=0;const row=y*S;for(let i=-r;i<=r;i++)s+=a[row+((i+S)%S)];
    for(let x=0;x<S;x++){t[row+x]=s*k;s+=a[row+(x+r+1)%S]-a[row+(x-r+S)%S];}}
  for(let x=0;x<S;x++){let s=0;for(let i=-r;i<=r;i++)s+=t[((i+S)%S)*S+x];
    for(let y=0;y<S;y++){o[y*S+x]=s*k;s+=t[((y+r+1)%S)*S+x]-t[((y-r+S)%S)*S+x];}}
  return o;}
function loadArt(){
  if(!gl||!ART.basalt)return;
  const S=512,NL=ARTL.length,lv=Math.log2(S)+1;
  TX.alb=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,TX.alb);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,lv,gl.SRGB8_ALPHA8,S,S,NL);
  TX.nrm=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,TX.nrm);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,lv,gl.RG8,S,S,NL);
  const an=gl.getExtension('EXT_texture_filter_anisotropic');
  for(const t of [TX.alb,TX.nrm]){gl.bindTexture(gl.TEXTURE_2D_ARRAY,t);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.REPEAT);
    if(an)gl.texParameterf(gl.TEXTURE_2D_ARRAY,an.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));}
  const cv=document.createElement('canvas');cv.width=cv.height=S;const cx=cv.getContext('2d',{willReadFrequently:true});
  let i=0;
  const next=()=>{
    if(i>=NL){for(const t of [TX.alb,TX.nrm]){gl.bindTexture(gl.TEXTURE_2D_ARRAY,t);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);}ARTOK=1;return;}
    const k=ARTL[i],L=i,im=new Image();
    im.onload=()=>{
      cx.drawImage(im,0,0,S,S);const d=cx.getImageData(0,0,S,S).data,n=S*S;
      const lu=new Float32Array(n);for(let j=0;j<n;j++){const r=d[j*4]/255,g=d[j*4+1]/255,b=d[j*4+2]/255;lu[j]=r*r*.3+g*g*.55+b*b*.15;}
      const [bs,inv]=ARTB[k]||[4,0],lo=artBlur(lu,S,10),fine=artBlur(lu,S,1);
      /* height: the fine shape against the broad shape (a high-pass), lightly smoothed */
      const h=new Float32Array(n);let mx=1e-4;for(let j=0;j<n;j++){h[j]=(fine[j]-lo[j])/(lo[j]+.03);mx=Math.max(mx,Math.abs(h[j]));}
      const sc=1/Math.min(mx,1.6);for(let j=0;j<n;j++){let v=h[j]*sc;if(inv)v=-v;h[j]=v;d[j*4+3]=Math.max(0,Math.min(255,128+v*127));}
      const nr=new Uint8Array(n*2);
      for(let y=0;y<S;y++)for(let x=0;x<S;x++){const j=y*S+x;
        const dx=(h[y*S+(x+1)%S]-h[y*S+(x-1+S)%S])*bs,dy=(h[((y+1)%S)*S+x]-h[((y-1+S)%S)*S+x])*bs,il=1/Math.sqrt(dx*dx+dy*dy+1);
        nr[j*2]=Math.round((-dx*il*.5+.5)*255);nr[j*2+1]=Math.round((-dy*il*.5+.5)*255);}
      gl.bindTexture(gl.TEXTURE_2D_ARRAY,TX.alb);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,L,S,S,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(d.buffer));
      gl.bindTexture(gl.TEXTURE_2D_ARRAY,TX.nrm);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,L,S,S,1,gl.RG,gl.UNSIGNED_BYTE,nr);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);
      i++;setTimeout(next,0);};
    im.onerror=()=>{i++;setTimeout(next,0);};
    im.src=ART[k];};
  next();
  BACK.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,BACK.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
}
/* the far view behind the stage: decoded when first wanted, then kept */
function backdropFor(key){
  if(!gl||!BACK.tex)return;
  if(!ART[key])key='back1';if(!ART[key]||BACK.cur===key)return;
  BACK.cur=key;BACK.ok=0;BACK.k=0;
  const put=im=>{if(BACK.cur!==key)return;gl.bindTexture(gl.TEXTURE_2D,BACK.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.SRGB8_ALPHA8,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);BACK.asp=im.width/im.height;
    /* dark paintings are lifted and bright ones held back, so every stage's far view sits at a like depth */
    const c=document.createElement('canvas');c.width=24;c.height=10;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0,24,10);const d=x.getImageData(0,0,24,10).data;
    let m=0;for(let j=0;j<d.length;j+=4){const r=d[j]/255,g=d[j+1]/255,b=d[j+2]/255;m+=r*r*.3+g*g*.55+b*b*.15;}m/=d.length/4;
    BACK.gain=Math.max(.6,Math.min(2.6,Math.pow(.1/Math.max(m,.005),.6)));BACK.ok=1;};
  const im=BACK.img[key];
  if(im&&im.complete&&im.naturalWidth)put(im);
  else{const n=im||backdropDecode(key);n.addEventListener('load',()=>put(n),{once:true});}
  /* have the next stage's picture ready before it is needed */
  const nx='back'+(Math.min(8,(parseInt(key.slice(4),10)||0)+1));if(ART[nx])backdropDecode(nx);
}
function backdropDecode(key){let n=BACK.img[key];if(!n){n=new Image();BACK.img[key]=n;n.src=ART[key];}return n;}
/* everything the painted shaders need, on units 10 to 12 */
function setArtU(u){
  if(u.uArt===undefined)return;
  gl.uniform1f(u.uArt,ARTOK);gl.uniform1f(u.uPixA,2*Math.tan(CAM.fov/2)/Math.max(1,FB.sc?FB.sc.h:VH));
  gl.uniform3f(u.uEyeW,CAM.eye[0],-CAM.eye[1],CAM.eye[2]);
  gl.activeTexture(gl.TEXTURE10);gl.bindTexture(gl.TEXTURE_2D_ARRAY,ARTOK?TX.alb:null);gl.uniform1i(u.uAlb,10);
  gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D_ARRAY,ARTOK?TX.nrm:null);gl.uniform1i(u.uNrm,11);
  if(u.uBack!==undefined){gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,BACK.tex);gl.uniform1i(u.uBack,12);const now=performance.now()/1000,dt=Math.min(.5,now-BACK.t);BACK.t=now;BACK.k=BACK.ok?Math.min(1,BACK.k+dt*2.5):0;gl.uniform1f(u.uBackOk,BACK.k*BACK.k*(3-2*BACK.k));gl.uniform1f(u.uBackAsp,BACK.asp);gl.uniform1f(u.uBackGain,BACK.gain);}
  if(u.uRockL)gl.uniform3fv(u.uRockL,SU.rockL);if(u.uCold)gl.uniform1f(u.uCold,SU.cold);
}
