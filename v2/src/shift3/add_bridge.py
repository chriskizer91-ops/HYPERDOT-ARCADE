"""Put the arcade bridge (bridge.js) into a finished Shiftlight 3 build and write it to v2/games/shift3.html.

    python3 add_bridge.py path/to/shiftlight3.html

With no argument it refreshes the bridge in v2/games/shift3.html. A bridge already in the file is replaced,
so running it twice is safe."""
import os,re,sys
D=os.path.dirname(os.path.abspath(__file__));V2=os.path.dirname(os.path.dirname(D))
out=os.path.join(V2,'games','shift3.html')
src=sys.argv[1] if len(sys.argv)>1 else out
s=open(src,encoding='utf-8').read()
A,B='<!-- hyperdot-arcade-bridge -->','<!-- /hyperdot-arcade-bridge -->'
s=re.sub(re.escape(A)+'.*?'+re.escape(B)+'\n?','',s,flags=re.S)
js=open(os.path.join(D,'bridge.js'),encoding='utf-8').read()
i=s.rindex('</body>')
s=s[:i]+A+'\n<script>\n'+js+'</script>\n'+B+'\n'+s[i:]
os.makedirs(os.path.dirname(out),exist_ok=True)
open(out,'w',encoding='utf-8').write(s)
print('v2/games/shift3.html',len(s.encode()),'bytes')
