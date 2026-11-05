/* test handle, only in the --debug build (never in v2/games/voltfist3d.html) */
window.__vf3={ARC,AU,APP,ROSTER,KEY,TOUCH,PT,PROJ,FXL,CAM,CD,QS,get FIGHT(){return FIGHT},get Q(){return Q()},get HS(){return HITSTOP},get SF(){return SUPERF},get SLOW(){return SLOW},
  go,startDemo,newFight,launchVs,startArcade,toSelect,setQuality,toggleDots,vfTickets,selConfirm,
  F:i=>FIGHT.f[i],sm:(i,k)=>startMove(FIGHT.f[i],FIGHT.f[1-i],k),step:()=>fightStep(),
  ff(sec){for(let i=0;i<Math.round(sec*60);i++)update(1/60);},
  prep(al=1){prepare3D(1/60,al);drawUI();},
  draw(al=1){prepare3D(1/60,al);drawUI();render3D();},
  info(){const r=renderer.info;return {calls:STATS.calls,tris:STATS.tris,geos:r.memory.geometries,tex:r.memory.textures,progs:r.programs?r.programs.length:0,scene:[SW,SH],out:[renderer.domElement.width,renderer.domElement.height],grid:[OW,OH],q:Q().id};},
  cam(a){CAMO=a;},
  artdbg(id){const d=ROSTER[id],g=fighterGeo(d).geo;return {uv:Array.from(g.attributes.uv.array).map(v=>+v.toFixed(4)),part:Array.from(g.attributes.aPart.array),n:Array.from(g.attributes.normal.array).map(v=>+v.toFixed(2))};},
  /* a neutral studio shot of one fighter: grey backdrop, white key light, no stage, no grade */
  shotSetup(id){APP.mode='versus';newFight({p1:id,p2:id==='kai'?'runa':'kai',c1:'dummy',c2:'dummy',stage:'orbit'});go('fight');this.ff(4.4);
    const A=FIGHT.f[0],B=FIGHT.f[1];A.x=0;B.x=3.4;B.hidden=true;this.ff(.05);B.hidden=true;
    const e=STAGE.env;e.sunK=1.8;e.skyK=1.15;e.grade={lift:[0,0,0],gain:[1,1,1],gam:[1,1,1],sat:1.02,con:1.02};e.rays={p:[0,0,-100],c:'#000',k:0};e.streak=0;
    SUN.color.set('#fff4ea');HEMI.color.set('#cfd6ea');HEMI.groundColor.set('#3a3640');SCENE.fog=null;SHU.uRim.value.setRGB(.5,.55,.65);SCENE.background=new THREE.Color('#55555f');},
  shot(c){const k=FIGHT.f[0].def.body.h;CAMO=[c[0],c[1]*k,c[2],c[3],c[4]*k,c[5]];for(let i=0;i<3;i++){prepare3D(1/60,1);STAGEG.visible=false;FIGHT.f[1].hidden=true;drawUI();render3D();}},
  pose(id,k){POSEPICK[id]=k;for(const key in ALTS0)delete ALTS0[key];},
  tris(){const o={};for(const k in GEOS)o[k]=GEOS[k].tris;return o;}
};
