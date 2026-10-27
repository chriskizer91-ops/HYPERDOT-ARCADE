import glob,re
shell=open('shell.html').read()
files=sorted(glob.glob('[0-9]_*.js'))
code='\n'.join(open(f).read() for f in files)
out=shell.replace('/*@@CODE@@*/',code)
open('ironhowl.html','w').write(out)
print('built',len(out),'bytes from',files)
pub=re.sub(r"window\.__ih=\{.*?\};\n","",out,flags=re.S)
assert '__ih' not in pub
open('ironhowl_pub.html','w').write(pub)
print('pub',len(pub))
