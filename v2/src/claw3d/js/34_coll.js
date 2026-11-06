/* =====================================================================================
   34. THE COLLECTION — 20 slots, one per plush, in three groups (one per machine). A plush you've won shows its
   picture (rendered from its 3D model), its name and how many you have; the rest are silhouettes. New ones are
   marked NEW until you've seen them. Opened from the picker (the star button, or C), the pause menu and the arcade.
   ===================================================================================== */
const THUMB={c:{},sil:{},rt:null,scene:null,cam:null,size:192};
function thumbSetup(){
  if(THUMB.scene)return;const sc=THUMB.scene=new THREE.Scene();sc.environment=GFX.scene.environment;sc.environmentIntensity=.6;
  sc.add(new THREE.HemisphereLight('#ffffff','#6a5a7a',1.1));const d=new THREE.DirectionalLight('#fff4e8',2.2);d.position.set(.6,1.2,1.6);sc.add(d,d.target);
  THUMB.cam=new THREE.PerspectiveCamera(26,1,.01,20);
  THUMB.rt=new THREE.WebGLRenderTarget(THUMB.size,THUMB.size,{samples:4});THUMB.rt.texture.colorSpace=THREE.SRGBColorSpace;
}
/* one plush's picture: a three-quarter view of its model at rest, on a clear background */
function thumbOf(T){
  if(THUMB.c[T.id])return THUMB.c[T.id];thumbSetup();
  const sc=THUMB.scene,pm=T._mid||(T._mid=plushMid(T)),g=displayPlush(T);g.position.set(-pm.c[0],-pm.c[1],-pm.c[2]);
  const hold=new THREE.Group();hold.add(g);hold.rotation.y=-.45;sc.add(hold);
  const extra=T.ring?RING.L+RING.R*2:0,R=Math.max(pm.h+extra,pm.w)*.62,cy=extra/2,cam=THUMB.cam,dist=R/Math.tan(13*Math.PI/180);
  cam.position.set(0,cy+R*.35,dist);cam.lookAt(0,cy,0);
  const r=GFX.R,old=r.getRenderTarget(),oc=r.getClearAlpha();r.setRenderTarget(THUMB.rt);r.setClearColor(0x000000,0);r.clear();r.render(sc,cam);
  const n=THUMB.size,px=new Uint8Array(n*n*4);r.readRenderTargetPixels(THUMB.rt,0,0,n,n,px);r.setRenderTarget(old);r.setClearColor(0x000000,oc);
  sc.remove(hold);
  const cv=document.createElement('canvas');cv.width=cv.height=n;const g2=cv.getContext('2d'),im=g2.createImageData(n,n);
  for(let y=0;y<n;y++)im.data.set(px.subarray((n-1-y)*n*4,(n-y)*n*4),y*n*4);g2.putImageData(im,0,0);
  const s=document.createElement('canvas');s.width=s.height=n;const g3=s.getContext('2d');g3.drawImage(cv,0,0);g3.globalCompositeOperation='source-in';g3.fillStyle='#2c2440';g3.fillRect(0,0,n,n);
  THUMB.sil[T.id]=s;return THUMB.c[T.id]=cv;
}
function collOpen(){
  if(!GFX.R)return;const book=prizeBook(),G=$('cG');G.innerHTML='';let tot=0;
  for(const id of MORDER){const M0=MACHINES[id];let have=0;
    const sec=document.createElement('section');sec.className='cs';const h=document.createElement('h3');h.style.color=M0.col;sec.appendChild(h);
    const grid=document.createElement('div');grid.className='cg';sec.appendChild(grid);
    for(const c of M0.cast){const T=PLUSH[c.id];if(!T)continue;const e=book[c.id],got=e&&e.n>0;if(got)have++;
      thumbOf(T);const cell=document.createElement('div');cell.className='cell'+(got?' got':'')+(c.rar===4?' jack':'')+(got&&e.fresh?' new':'');
      const img=document.createElement('img');img.alt=got?c.name:'Not won yet';img.src=(got?THUMB.c[c.id]:THUMB.sil[c.id]).toDataURL('image/png');cell.appendChild(img);
      const nm=document.createElement('span');nm.textContent=got?c.name:'???';cell.appendChild(nm);
      const ct=document.createElement('em');ct.textContent=got?(e.n>1?'x'+e.n:c.tix+' tix'):c.rar===4?'JACKPOT':'';cell.appendChild(ct);
      grid.appendChild(cell);}
    h.innerHTML=M0.name+' <i>'+have+' / '+M0.cast.length+'</i>';tot+=have;G.appendChild(sec);}
  $('cN').textContent=tot+' / 20';$('coll').hidden=false;document.body.classList.add('coll');S.coll=true;
  /* seen now: the NEW marks go next time */
  try{let ch=false;for(const id in book)if(book[id].fresh){delete book[id].fresh;ch=true;}if(ch)store.set('hd-'+CAB.id+'-prizes',JSON.stringify(book));}catch(err){}
  SFX.confirm&&SFX.confirm();
}
function collClose(){$('coll').hidden=true;document.body.classList.remove('coll');S.coll=false;}
function collButton(){const n=collectedCount(),b=$('cB');if(b)b.querySelector('i').textContent=n+'/20';
  let fresh=false;const o=prizeBook();for(const id in o)if(o[id].fresh)fresh=true;if(b)b.classList.toggle('fresh',fresh);}
