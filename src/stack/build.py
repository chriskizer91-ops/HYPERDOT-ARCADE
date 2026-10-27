# Splice the SKY STACK pieces into a copy of the house starter. Untouched starter code stays byte-identical.
import re,os,sys
HERE=os.path.dirname(os.path.abspath(__file__))
K=os.path.join(HERE,'..','kit','hyperdot_cabinet_starter.html')
SRC=os.path.join(HERE,'src')+os.sep
OUT=HERE+os.sep
L=open(K).read().split('\n')
rd=lambda n:open(SRC+n).read().rstrip('\n')
def find(pred,start=0):
    for i in range(start,len(L)):
        if pred(L[i]):return i
    raise SystemExit('marker not found')
iStyle=find(lambda l:l.startswith('</style>'))
iCab=find(lambda l:l.startswith('const CAB={'));iCabE=find(lambda l:l=='};',iCab)
iFs=find(lambda l:l.startswith('const FS_LED=`'));iFsE=find(lambda l:l.startswith('const FS_BRIGHT'))-1
iSfx=find(lambda l:l.startswith('const SFX={'));iSfxE=find(lambda l:l.startswith('{const lim='),iSfx)
iTr=find(lambda l:l.startswith('const TRACKS={'));iTrE=find(lambda l:l=='};',iTr)
iG=find(lambda l:'9. GAME' in l)-1;iEnd=find(lambda l:l=='})();',iG)
out=(L[:iStyle]+[rd('css.css')]+L[iStyle:iCab]+[rd('cab.js')]+L[iCabE+1:iFs]+[rd('shader.js')]+L[iFsE+1:iSfx]+[rd('sfx.js')]
     +L[iSfxE+1:iTr]+[rd('tracks.js')]+L[iTrE+1:iG]+[rd('game.js')]+L[iEnd+1:])
html='\n'.join(out).replace('<title>Hyperdot Cabinet Starter</title>','<title>Sky Stack</title>')
os.makedirs(OUT,exist_ok=True)
open(OUT+'stack.html','w').write(html)
pub=re.sub(r'/\*@@HOOK\*/.*?/\*@@/HOOK\*/\n?','',html,flags=re.S)
assert '__game' not in pub
open(OUT+'stack_pub.html','w').write(pub)
print('built',len(html),'bytes; pub',len(pub))
