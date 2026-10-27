import glob
shell=open('shell.html').read()
files=sorted(glob.glob('[0-9]_*.js'))
code='\n'.join(open(f).read() for f in files)
out=shell.replace('/*@@CODE@@*/',code)
open('voltfist.html','w').write(out)
print('built',len(out),'bytes from',files)

import re
pub=re.sub(r"window\.__vf=\{.*?\};\n","",out,flags=re.S)
assert '__vf' not in pub
open('voltfist_pub.html','w').write(pub)
print('pub',len(pub))
