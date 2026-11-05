/* =====================================================================================
   20. 3D — SHADOWS FROM THE HEIGHT MAP. The original gave every light a 1-D polar shadow map:
       how far each ray gets. In 3D a light keeps, for each of 384 directions and each distance
       out from it, the steepest rise it has met so far ("the horizon"). A point is lit when it
       stands above the line from the light over that horizon. One texture read per light, and
       the distance to the edge that cast the shadow gives soft shadows that sharpen at the foot
       of a wall. The hand lantern's horizon is cast again every frame; the street lamps' once a
       night; a flare's when it is lit; the lighthouse's when it wakes.
   ===================================================================================== */
const HZ={A:384,rows:0,data:null,tex:null,dirty:[]};
/* rows of the atlas: [first row, rows, dots per row] */
const HZL={r0:0,nr:92,st:1};                       /* the hand lantern: out to 92 dots */
const HZP={r0:92,nr:46,st:1,max:16};               /* the street lamps: 46 dots each */
const HZF={r0:92+46*16,nr:52,st:2,max:3};          /* flares: 104 dots each */
const HZG={r0:92+46*16+52*3,nr:68,st:2};           /* the great lamp: 136 dots */
HZ.rows=HZG.r0+HZG.nr;
const HZCOS=new Float32Array(HZ.A),HZSIN=new Float32Array(HZ.A);for(let a=0;a<HZ.A;a++){const t=(a+.5)/HZ.A*TAU;HZCOS[a]=Math.cos(t);HZSIN[a]=Math.sin(t);}
function hzInit(){HZ.data=new Float32Array(HZ.A*HZ.rows*2);for(let i=0;i<HZ.data.length;i+=2){HZ.data[i]=-100;HZ.data[i+1]=1;}
  HZ.tex=mkTex(HZ.A,HZ.rows,gl.RG16F,gl.RG,gl.FLOAT,HZ.data,gl.LINEAR);gl.bindTexture(gl.TEXTURE_2D,HZ.tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);}
/* cast one light's horizon into its rows: (lx,ly) on the map, lz its height, skip: the light's own fitting */
function hzCast(row0,nr,st,lx,ly,lz,skip){
  const A=HZ.A,d=HZ.data,hm=HM,W2=HMW,H2=HMH,out=HM_OUT,ds=.5;
  for(let a=0;a<A;a++){const dx=HZCOS[a],dy=HZSIN[a];let best=-100,bestR=1,s=ds;
    for(let i=0;i<nr;i++){const se=(i+1)*st;
      for(;s<=se;s+=ds){if(s<=skip)continue;const ix=Math.floor((lx+dx*s)*HR),iy=Math.floor((ly+dy*s)*HR);
        const h=ix<0||iy<0||ix>=W2||iy>=H2?out:hm[iy*W2+ix];const e=(h-lz)/s;if(e>best){best=e;bestR=s;}}
      const o=((row0+i)*A+a)*2;d[o]=best;d[o+1]=best<-99?se:bestR;}}
  HZ.dirty.push([row0,nr]);
}
function hzFlush(){if(!HZ.dirty.length)return;gl.bindTexture(gl.TEXTURE_2D,HZ.tex);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);
  for(const [r0,nr] of HZ.dirty)gl.texSubImage2D(gl.TEXTURE_2D,0,0,r0,HZ.A,nr,gl.RG,gl.FLOAT,HZ.data.subarray(r0*HZ.A*2,(r0+nr)*HZ.A*2));HZ.dirty.length=0;}
function hzLamps(){for(let i=0;i<LAMPS.length&&i<HZP.max;i++){const L=LAMPS[i];hzCast(HZP.r0+i*HZP.nr,HZP.nr,HZP.st,L.x,L.y,TOWN.lampsZ,2.2);}}
/* the same horizon read on the CPU: is a point of the town in a light's shadow (for the particles and moths) */
function hzLit(row0,nr,st,lx,ly,lz,x,y,z){const dx=x-lx,dy=y-ly,r=Math.hypot(dx,dy);const fi=Math.floor((r-1)/st-1);if(fi<0)return 1;
  let a=Math.floor((Math.atan2(dy,dx)/TAU+1)%1*HZ.A);const o=((row0+Math.min(fi,nr-1))*HZ.A+a)*2;return z>lz+HZ.data[o]*r-.5?1:0;}
