import glob,re
shell=open('shell.html').read()
files=sorted(glob.glob('[0-9]*_*.js'))
code='\n'.join(open(f).read() for f in files)
out=shell.replace('/*@@CODE@@*/',code)
open('redline.html','w').write(out)
pub=re.sub(r"window\.__rl=\{.*?\};\n","",out,flags=re.S)
for a,b in [("  if(window.__auto&&!P.ai)P.ai=mkAI({name:'YOU',skill:.985,aggr:.6,cons:.95},3);\n",""),("||(window.__auto&&S.mode!=='hw')","")]:
    assert a in pub,a;pub=pub.replace(a,b)
assert '__rl' not in pub and '__auto' not in pub,'test hooks left in pub'
open('redline_pub.html','w').write(pub)
print('built',len(out),'pub',len(pub),files)
