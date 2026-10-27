import glob,re,sys
shell=open('shell.html').read()
glsl=open('scene.glsl').read()
assert '`' not in glsl and '${' not in glsl
files=sorted(glob.glob('[0-9]*_*.js'))
code='\n'.join(open(f).read() for f in files)
code=code.replace('/*@@SCENE@@*/',glsl)
out=shell.replace('/*@@CODE@@*/',code)
open('prisma.html','w').write(out)
pub=re.sub(r"  window\.__pr=\{.*?\};\n","",out,flags=re.S)
pub=pub.replace("    if(window.__auto)Object.assign(ctl,autopilot());\n","")
pub=pub.replace("  if(!window.__noDraw)render(dt);","  render(dt);")
assert "__noDraw" not in pub
assert '__pr' not in pub and '__auto' not in pub
open('prisma_pub.html','w').write(pub)
print('built',len(out),'pub',len(pub),files)
