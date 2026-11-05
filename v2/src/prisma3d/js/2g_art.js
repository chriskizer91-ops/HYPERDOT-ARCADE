/* =====================================================================================
   2g. THE ART — Christopher's 38 images, loaded onto the GPU.
   Everything code-made stays as the fallback, so the game draws from the first frame and
   each picture swaps in the moment it's decoded. Flags in TX.on say what's ready.
   ===================================================================================== */
const TXF={FAC:1,SHOP:2,SURF:4,ADS:8,SIGNS:16,VEH:32,SKY:64,SKYL:128,MOON:256,DEC:512};
const TX={on:0,img:{},sky:null,skyl:null,moon:null,signs:null,fac:null,shop:null,surf:null,ads:null,veh:{},dec:null,liv:null,skyFor:-1,skylFor:-1,meshes:{}};
/* which picture each stage uses */
const STAGE_SKY=[0,1,2,3],STAGE_SKYL=[0,1,2,0];
/* the horizon colour of each sky, so the city's fog sinks into the same colour as the sky behind it */
const SKY_FOG=[[.05,.012,.17],[.3,.03,.006],[.016,.008,.24],[.0,.1,.11]];
function decodeArt(name){
  if(TX.img[name])return TX.img[name];
  const im=new Image();im.decoding='async';im.src=ART[name];
  TX.img[name]=(im.decode?im.decode():new Promise((ok,no)=>{im.onload=ok;im.onerror=no;})).then(()=>im);
  return TX.img[name];
}
function texParams(target,mips,wrap){
  gl.texParameteri(target,gl.TEXTURE_MIN_FILTER,mips?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);gl.texParameteri(target,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const w=wrap?gl.REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(target,gl.TEXTURE_WRAP_S,w);gl.texParameteri(target,gl.TEXTURE_WRAP_T,w);
  const an=gl.getExtension('EXT_texture_filter_anisotropic');if(an&&mips)gl.texParameterf(target,an.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
}
function tex2D(im,wrap,mips=true){
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);if(mips)gl.generateMipmap(gl.TEXTURE_2D);texParams(gl.TEXTURE_2D,mips,wrap);return t;
}
function texArray(names,w,h,flag,key,wrap=true){
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,t);
  const lv=1+Math.floor(Math.log2(Math.max(w,h)));gl.texStorage3D(gl.TEXTURE_2D_ARRAY,lv,gl.RGBA8,w,h,names.length);texParams(gl.TEXTURE_2D_ARRAY,true,wrap);
  Promise.all(names.map(decodeArt)).then(ims=>{
    gl.bindTexture(gl.TEXTURE_2D_ARRAY,t);
    ims.forEach((im,i)=>{if(im.width!==w||im.height!==h){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);im=c;}
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,w,h,1,gl.RGBA,gl.UNSIGNED_BYTE,im);});
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);TX[key]=t;TX.on|=flag;
  }).catch(e=>console.warn('art',key,e));
}
function artInit(){
  if(typeof ART==='undefined')return;
  texArray(['fac0','fac1','fac2','fac3'],1024,1024,TXF.FAC,'fac');
  texArray(['shop0','shop1'],2048,640,TXF.SHOP,'shop');
  texArray(['surf0','surf1','surf2','surf3','surf4','surf5'],1024,1024,TXF.SURF,'surf');
  texArray(['ad0','ad1','ad2','ad3','ad4','ad5'],1024,576,TXF.ADS,'ads',false);
  decodeArt('signs').then(im=>{TX.signs=tex2D(im,false);TX.on|=TXF.SIGNS;});
  decodeArt('moon').then(im=>{TX.moon=tex2D(im,false);TX.on|=TXF.MOON;});
  Promise.all([decodeArt('decal'),decodeArt('livery')]).then(([d,l])=>{TX.dec=tex2D(d,false);TX.liv=tex2D(l,false);TX.on|=TXF.DEC;});
  /* the vehicles: the carved shapes are ready at once, their paint when decoded */
  for(const k of ['bike','van','drone'])TX.meshes[k]=vehMesh(VEHDATA[k].mesh);
  TX.meshes.cars=VEHDATA.cars.map(c=>vehMesh(c.mesh));
  Promise.all(['veh_bike','veh_van','veh_traffic','veh_drone'].map(decodeArt)).then(ims=>{
    ['bike','van','traffic','drone'].forEach((k,i)=>TX.veh[k]=tex2D(ims[i],false));TX.on|=TXF.VEH;});
  for(let i=0;i<4;i++)decodeArt('sky'+i);for(let i=0;i<3;i++)decodeArt('skyline'+i);
}
/* skies and skylines: one of each on the GPU at a time, swapped when the stage changes */
function artStage(){
  if(typeof ART==='undefined'||!gl)return;
  const si=STAGE_SKY[ST.id],li=STAGE_SKYL[ST.id];
  if(TX.skyFor!==si){TX.skyFor=si;decodeArt('sky'+si).then(im=>{if(TX.skyFor!==si)return;if(TX.sky)gl.deleteTexture(TX.sky);TX.sky=tex2D(im,false);TX.on|=TXF.SKY;});TX.on&=~TXF.SKY;}
  if(TX.skylFor!==li){TX.skylFor=li;decodeArt('skyline'+li).then(im=>{if(TX.skylFor!==li)return;if(TX.skyl)gl.deleteTexture(TX.skyl);TX.skyl=tex2D(im,false);TX.on|=TXF.SKYL;});TX.on&=~TXF.SKYL;}
}
/* a carved vehicle: positions stored as 16-bit steps between its corners, normals as bytes */
function b64bytes(s){const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
function vehMesh(m){
  const q=new Uint16Array(b64bytes(m.pos).buffer),nb=new Int8Array(b64bytes(m.nrm).buffer),ib=b64bytes(m.idx);
  const idx=m.i32?new Uint32Array(ib.buffer):new Uint16Array(ib.buffer);
  const p=new Float32Array(q.length);for(let i=0;i<q.length;i++)p[i]=m.lo[i%3]+q[i]*m.sc[i%3];
  const M={vao:gl.createVertexArray(),n:idx.length,type:m.i32?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,bufs:[]};
  gl.bindVertexArray(M.vao);
  const pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,p,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
  const nbuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,nbuf);gl.bufferData(gl.ARRAY_BUFFER,nb,gl.STATIC_DRAW);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.BYTE,true,0,0);
  gl.disableVertexAttribArray(2);gl.disableVertexAttribArray(3);
  const eb=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,eb);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);
  gl.bindVertexArray(null);M.bufs=[pb,nbuf,eb];return M;
}
function drawVeh(M){if(!M)return;gl.vertexAttrib4f(2,1,1,1,20);gl.vertexAttrib4f(3,0,0,0,0);gl.bindVertexArray(M.vao);gl.drawElements(gl.TRIANGLES,M.n,M.type,0);}
/* the signs, by kind, and the colour of light each one throws */
const SIGNCAT={};
if(typeof SIGNS!=='undefined')SIGNS.signs.forEach((s,i)=>{(SIGNCAT[s.cat]=SIGNCAT[s.cat]||[]).push(i);});
const SIGNR=new Float32Array(160),SIGNC=new Float32Array(160);
if(typeof SIGNS!=='undefined')SIGNS.signs.forEach((s,i)=>{if(i>=40)return;SIGNR.set(s.r,i*4);
  const lin=s.col.map(v=>Math.pow(v,2.2)),mx=Math.max(...lin,1e-3);SIGNC.set([lin[0]/mx,lin[1]/mx,lin[2]/mx,1],i*4);});
const signsOn=()=>typeof SIGNS!=='undefined';
function bladeCat(){return ST.id===1?'blade_market':'blade_downtown';}
function shopCat(){return ST.id===1?'shop_market':'shop_downtown';}
function pickSign(cat,r){const L=SIGNCAT[cat];return L?L[Math.min(L.length-1,Math.floor(r*L.length))]:0;}
