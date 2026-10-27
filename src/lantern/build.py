import glob,re
shell=open('shell.html').read()
files=sorted(glob.glob('[0-9]_*.js'))
code='\n'.join(open(f).read() for f in files)
out=shell.replace('/*@@CODE@@*/',code)
open('lantern.html','w').write(out)
pub=re.sub(r"  window\.__la=\{.*?\};\n","",out,flags=re.S)
for a,b in [("let ctl=c;if(window.__auto){ctl=autopilot();if(ctl.b)fireFlare();}else if(e.b)fireFlare();","let ctl=c;if(e.b)fireFlare();"),
            ("(e.ok||tap||window.__auto&&S.t>6)","(e.ok||tap)"),("if(en.t>30||window.__auto)commitEntry();","if(en.t>30)commitEntry();")]:
    assert a in pub,a;pub=pub.replace(a,b)
assert '__la' not in pub and '__auto' not in pub
open('lantern_pub.html','w').write(pub)
print('built',len(out),'pub',len(pub),files)
