/* test handle, only in the --debug build (never in v2/games/voltfist3d.html) */
window.__vf3={ARC,AU,APP,ROSTER,KEY,TOUCH,PT,PROJ,FXL,CAM,CD,QS,get FIGHT(){return FIGHT},get Q(){return Q()},get HS(){return HITSTOP},get SF(){return SUPERF},get SLOW(){return SLOW},
  go,startDemo,newFight,launchVs,startArcade,toSelect,setQuality,toggleDots,vfTickets,selConfirm,
  F:i=>FIGHT.f[i],sm:(i,k)=>startMove(FIGHT.f[i],FIGHT.f[1-i],k),step:()=>fightStep(),
  ff(sec){for(let i=0;i<Math.round(sec*60);i++)update(1/60);},
  prep(al=1){prepare3D(1/60,al);drawUI();},
  draw(al=1){prepare3D(1/60,al);drawUI();render3D();},
  info(){const r=renderer.info;return {calls:STATS.calls,tris:STATS.tris,geos:r.memory.geometries,tex:r.memory.textures,progs:r.programs?r.programs.length:0,scene:[SW,SH],out:[renderer.domElement.width,renderer.domElement.height],grid:[OW,OH],q:Q().id};},
  cam(a){CAMO=a;},
  tris(){const o={};for(const k in GEOS)o[k]=GEOS[k].tris;return o;}
};
