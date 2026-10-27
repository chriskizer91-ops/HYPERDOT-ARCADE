import glob,re,sys
shell=open('shell.html').read()
fin=open('final.glsl').read()
assert '`' not in fin and fin.count('${')==1
files=sorted(glob.glob('[0-9]*_*.js'))
code='\n'.join(open(f).read() for f in files)
code=code.replace('/*@@FINAL@@*/',fin)
out=shell.replace('/*@@CODE@@*/',code)
open('molten.html','w').write(out)
pub=re.sub(r"  window\.__mo=\{.*?\};\n","",out,flags=re.S)
pub=pub.replace("    if(window.__auto)Object.assign(ctl,autopilot());\n","")
assert '__mo' not in pub and '__auto' not in pub
open('molten_pub.html','w').write(pub)
print('built',len(out),'pub',len(pub),files)
