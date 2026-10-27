"""The Hyperdot Arcade: the user's intro v2 (the walk floor, Star Vanguard, Air Hockey and the pinball intro),
with a bigger room and every cabinet on the floor. The intro and the shell are kept as they are; the patches
below are the only changes to them, and every one is checked to apply exactly once."""
import os,sys
D=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(os.path.dirname(D))
s=open(os.path.join(D,'intro_v2.html'),encoding='utf-8').read()
rd=lambda n:open(os.path.join(D,'src',n),encoding='utf-8').read()
def sub(a,b,count=1):
    global s
    assert s.count(a)==count,('patch target',a[:80],s.count(a))
    s=s.replace(a,b)
sub('<title>Hyperdot Arcade Intro</title>','<title>Hyperdot Arcade</title>')
sub('const ROOM={x0:-12,x1:12,z0:-9,z1:9,h:4.2};','const ROOM={x0:-16,x1:16,z0:-12,z1:12,h:4.6};')
# the room: replaced whole by the bigger floor with its zone signs
i=s.index('function buildRoom(){');j=s.index('/* ---- character: low-poly person with procedural walk ---- */')
s=s[:i]+rd('m0_room.js')+'\n'+s[j:]
# transitions: optional camera paths (climbing into a pod), longer when a machine asks, and the game frame
sub("  W_.trans=Math.min(1,W_.trans+dt/.85);","  W_.trans=Math.min(1,W_.trans+dt/((W_.active&&W_.active.transT)||.85));")
sub("""  const to=W_.mode==='enter'?W_.active.cam():walkCam();
  for(let i=0;i<3;i++){CAM.eye[i]=lerp(from.eye[i],to.eye[i],e);CAM.tgt[i]=lerp(from.tgt[i],to.tgt[i],e);}
  CAM.fov=lerp(from.fov,to.fov,e);""","""  const A=W_.active,path=A&&A.camPath;
  if(path){const p=W_.mode==='enter'?path(e,from):path(1-e,walkCam());CAM.eye=p.eye.slice();CAM.tgt=p.tgt.slice();CAM.fov=p.fov;}
  else{const to=W_.mode==='enter'?A.cam():walkCam();
  for(let i=0;i<3;i++){CAM.eye[i]=lerp(from.eye[i],to.eye[i],e);CAM.tgt[i]=lerp(from.tgt[i],to.tgt[i],e);}
  CAM.fov=lerp(from.fov,to.fov,e);}""")
sub("    if(W_.mode==='enter'){W_.mode='play';$('back').hidden=false;setControls(W_.active.controls,W_.active.labels);CH_.hidden=true;}",
    "    if(W_.mode==='enter'){if(W_.active.controls==='iframe'){CH_.hidden=true;openGame(W_.active);}else{W_.mode='play';$('back').hidden=false;setControls(W_.active.controls,W_.active.labels);CH_.hidden=true;}}")
# while a game is up, the room stops drawing and its machines stop ticking
sub("  if(!window.__hdHold)step(dt);render();requestAnimationFrame(frame);","  if(!window.__hdHold)step(dt);if(W_.mode!=='game')render();requestAnimationFrame(frame);")
sub("  for(const a of ATTR)if(a!==W_.active||W_.mode!=='play')a.idle&&a.idle(dt);","  if(W_.mode!=='game')for(const a of ATTR)if(a!==W_.active||W_.mode!=='play')a.idle&&a.idle(dt);\n  ghTick();")
# the machines: the house's own two stay, everything else is placed by the floor plan
i=s.index('/* ================= place machines ================= */');j=s.index('/* ================= INTRO PINBALL:')
s=s[:i]+rd('m1_host.js')+'\n'+rd('m2_cabinets.js')+'\n'+rd('m3_tables.js')+'\n'+rd('m4_floor.js')+'\n'+rd('m5_prizes.js')+'\n\n'+s[j:]
out=os.path.join(ROOT,'index.html');open(out,'w',encoding='utf-8').write(s)
print('index.html',len(s.encode()),'bytes')
