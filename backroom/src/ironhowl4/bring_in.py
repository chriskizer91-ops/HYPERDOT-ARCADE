"""Bring a build of Ironhowl 4 into the arcade as backroom/games/ironhowl4/.

    python3 backroom/src/ironhowl4/bring_in.py <a clone of the iron-howler-4 repo> <branch or commit>

It takes the same set of files the game's own one-file packer takes (game/tools/pack_single.py), laid out as a folder
so that a phone only downloads what it uses:
  index.html, js/      the page and its two scripts, as they are in game/
  art/, models/        game/art and game/models
  m4/<name>/           the kit and foe models from the repo's top models/ folder, combat and full-detail
The one change to the game: a line in index.html that tells it the kit and foe models are in m4/ (in its own repo they
are one folder up). It also checks that js/ironhowl4.js is what game/build.py would make from game/src, and stops if
it isn't. Nothing in the game's repo is run or changed."""
import os,sys,subprocess,shutil,tarfile,io
repo,ref=sys.argv[1],sys.argv[2]
OUT=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),'games','ironhowl4')
git=lambda *a:subprocess.run(['git','-C',repo,*a],capture_output=True,check=True).stdout
IH4={'wraith-v2-hd':['wraith_v2'],'autocannon':['ac_L','ac_R'],'lance':['ln_L','ln_R'],'arc':['ar_L','ar_R'],'mpod':['mpod'],'watcher':['watcher'],'jetpack':['jetpack'],'drone':['drone']}
FOES={'fgunner':'fgunner','fhound':'fhound','fskitter':'fskitter','spod':'spod'}
ORM={'autocannon':'ac_combat_orm','lance':'ln_combat_orm','arc':'ar_combat_orm'}
want={}
for d,stems in IH4.items():
    for st in stems:
        for f in (st+'_combat.glb',st+'_combat_albedo.webp',st+'_combat_normal.webp',st+'_full.glb',st+'_full_print.webp'):want['m4/%s/%s'%(d,f)]='models/%s/%s'%(d,f)
        want['m4/%s/%s.webp'%(d,ORM.get(d,st+'_combat_orm'))]='models/%s/%s.webp'%(d,ORM.get(d,st+'_combat_orm'))
for d,st in FOES.items():
    for f in (st+'_combat.glb',st+'_combat_albedo.webp',st+'_combat_normal.webp',st+'_combat_orm.webp',st+'_full.glb',st+'_full_print.webp'):want['m4/%s/%s'%(d,f)]='models/%s/%s'%(d,f)
have=set(git('ls-tree','-r','--name-only',ref,'--','models').decode().split('\n'))
missing=sorted(v for v in want.values() if v not in have)
if missing:sys.exit('these model files are not in the repo at '+ref+':\n  '+'\n  '.join(missing))
# the game's own folder
files={}
with tarfile.open(fileobj=io.BytesIO(git('archive',ref,'game/index.html','game/js','game/art','game/models','game/src'))) as t:
    for m in t.getmembers():
        if m.isfile():files[m.name[len('game/'):]]=t.extractfile(m).read()
parts=sorted(k for k in files if k.startswith('src/') and k.endswith('.js'))
built="/* Ironhowl 4 - built from game/src by build.py */\n(function(){'use strict';\n"+'\n'.join('/* ---- %s ---- */\n'%os.path.basename(p)+files[p].decode('utf-8') for p in parts)+'\n})();\n'
if built!=files['js/ironhowl4.js'].decode('utf-8'):sys.exit('js/ironhowl4.js is not what game/build.py makes from game/src at '+ref+': run build.py there and commit, then bring it in')
page=files['index.html'].decode('utf-8');tag='<script src="js/three-ih3.min.js"></script>'
if page.count(tag)!=1:sys.exit('index.html: expected the three.js script tag once')
files['index.html']=page.replace(tag,"<script>window.IH4_MODELS='m4/';   /* in the arcade the kit and foe models sit beside the page, in m4/ */</script>\n"+tag).encode('utf-8')
for rel,p in want.items():files[rel]=git('show',ref+':'+p)
shutil.rmtree(OUT,ignore_errors=True);n=0;size=0
for rel,b in sorted(files.items()):
    if rel.startswith('src/'):continue
    q=os.path.join(OUT,rel);os.makedirs(os.path.dirname(q),exist_ok=True);open(q,'wb').write(b);n+=1;size+=len(b)
print(OUT,':',n,'files,',round(size/1e6,1),'MB, from',ref,git('log','-1','--format=%h %cd %s','--date=short',ref).decode().strip())
