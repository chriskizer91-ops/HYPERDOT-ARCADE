/* =====================================================================================
   1b. PLUSH MODELS — the format written by tools/build_plush.py:
   'PLS1', u32 nv, u32 ntri, u32 np, f32 min[3], f32 max[3], u16 pos[nv*3] (quantised in the box), i8 nrm[nv*3],
   u16 uv[nv*2], u8 bone[nv*4], u8 weight[nv*4], u16 index[ntri*3], f32 part[np*4] (x, y, z, radius).
   The model is 1 unit tall with its feet at y = 0; the game scales it by the toy's real height.
   ===================================================================================== */
function decodePlush(buf){
  const dv=new DataView(buf),nv=dv.getUint32(4,true),nt=dv.getUint32(8,true),np=dv.getUint32(12,true);
  const mn=[0,1,2].map(i=>dv.getFloat32(16+i*4,true)),mx=[0,1,2].map(i=>dv.getFloat32(28+i*4,true));
  let o=40;const take=(C,n,bytes)=>{const a=new C(buf.slice(o,o+n*bytes));o+=n*bytes;return a;};
  const qp=take(Uint16Array,nv*3,2),n8=take(Int8Array,nv*3,1),quv=take(Uint16Array,nv*2,2);
  const bone=take(Uint8Array,nv*4,1),wt=take(Uint8Array,nv*4,1),idx=take(Uint16Array,nt*3,2),part=take(Float32Array,np*4,4);
  const pos=new Float32Array(nv*3),nrm=new Float32Array(nv*3),uv=new Float32Array(nv*2);
  for(let i=0;i<nv;i++)for(let k=0;k<3;k++){pos[i*3+k]=mn[k]+qp[i*3+k]/65535*(mx[k]-mn[k]);nrm[i*3+k]=n8[i*3+k]/127;}
  for(let i=0;i<nv*2;i++)uv[i]=quv[i]/65535;
  return {nv,nt,np,pos,nrm,uv,bone,wt,idx,part};
}
