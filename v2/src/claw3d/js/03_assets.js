/* =====================================================================================
   3. ASSETS — everything is packed into this one file by build.py (ASSET_DATA, base64). Models decode to
   arrays; pictures decode to ImageBitmaps (plush textures as stored, the rest flipped the usual way up).
   ===================================================================================== */
const ASSETS={bin:{},img:{}};const PLUSH={};
function b64(s){const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
async function loadAssets(progress){
  const keys=Object.keys(ASSET_DATA);let done=0;
  await Promise.all(keys.map(async k=>{
    const u=b64(ASSET_DATA[k]);
    if(k.startsWith('bin/')){ASSETS.bin[k.slice(4)]=u.buffer;}
    else{const key=k.slice(4),flip=!key.startsWith('p/');
      try{ASSETS.img[key]=await createImageBitmap(new Blob([u],{type:'image/webp'}),{imageOrientation:flip?'flipY':'none',premultiplyAlpha:'none',colorSpaceConversion:'none'});}
      catch(e){ASSETS.img[key]=await new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=URL.createObjectURL(new Blob([u],{type:'image/webp'}));});}}
    done++;progress&&progress(done/keys.length);}));
  for(const id in PLUSHIDX){const buf=ASSETS.bin['m/'+id];if(buf)PLUSH[id]={id,size:PLUSHIDX[id].size,model:decodePlush(buf)};}
}
