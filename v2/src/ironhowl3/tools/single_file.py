"""Pack the whole game into one HTML file: page + three.js + game code + every texture and model as base64.
Run: python3 tools/single_file.py OUT.html   (from v2/src/ironhowl3)
Inside the file, a small shim sends every art/ and models/ request (FileLoader, ImageLoader, fetch) to the embedded copy,
so the page needs no other files and works offline. It is big (about 33 MB) because the art is inside it."""
import base64, json, os, sys
GAME = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'games', 'ironhowl3')
MIME = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.json': 'application/json'}
files = {}
for top in ('art', 'models'):
    for root, _, names in os.walk(os.path.join(GAME, top)):
        for n in sorted(names):
            ext = os.path.splitext(n)[1].lower()
            if ext not in MIME: continue
            p = os.path.join(root, n); rel = os.path.relpath(p, GAME).replace(os.sep, '/')
            files[rel] = 'data:%s;base64,%s' % (MIME[ext], base64.b64encode(open(p, 'rb').read()).decode())
shim = """<script>/* single-file build: art/ and models/ are inside this page */
(function(){const E=window.__IH3_FILES=%s;
const key=u=>{if(typeof u!=='string'||u.startsWith('data:'))return null;let s=u.split('?')[0];try{s=decodeURI(s);}catch(e){}
  const i=Math.max(s.lastIndexOf('art/'),s.lastIndexOf('models/'));if(i<0)return null;const k=s.slice(i);return E[k]?k:null;};
for(const C of [THREE.FileLoader,THREE.ImageLoader]){const L=C.prototype.load;C.prototype.load=function(url,...a){const k=key((this.path||'')+url)||key(url);
  if(!k)return L.call(this,url,...a);const p=this.path;this.path='';try{return L.call(this,E[k],...a);}finally{this.path=p;}};}
const F=window.fetch.bind(window);window.fetch=function(u,o){const k=key(typeof u==='string'?u:u&&u.url);return F(k?E[k]:u,o);};})();
</script>""" % json.dumps(files)
html = open(os.path.join(GAME, 'index.html')).read()
three = open(os.path.join(GAME, 'js', 'three-ih3.min.js')).read()
game = open(os.path.join(GAME, 'js', 'ironhowl3.js')).read()
a = '<script src="js/three-ih3.min.js"></script>'; b = '<script src="js/ironhowl3.js"></script>'
assert a in html and b in html
html = html.replace(a, '@@THREE@@').replace(b, '@@GAME@@')
html = html.replace('@@THREE@@', '<script>' + three.replace('</script', '<\\/script') + '</script>\n' + shim)
html = html.replace('@@GAME@@', '<script>' + game.replace('</script', '<\\/script') + '</script>')
out = sys.argv[1] if len(sys.argv) > 1 else 'ironhowl3-single.html'
open(out, 'w').write(html)
print('files', len(files), 'MB', round(os.path.getsize(out) / 1e6, 1))
