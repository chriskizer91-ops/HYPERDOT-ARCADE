#!/usr/bin/env python3
"""Build whack.html (with the __game test hook) and whack_pub.html (hook stripped)
from the house starter plus the cabinet's own sections in src/."""
import re, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(HERE, '..', '..', 'kit', 'hyperdot_cabinet_starter.html')
src = open(KIT, encoding='utf-8').read()
rd = lambda n: open(os.path.join(HERE, 'src', n), encoding='utf-8').read()

def swap(text, start, end, new, inclusive_end=True):
    i = text.index(start)
    j = text.index(end, i)
    j = j + len(end) if inclusive_end else j
    return text[:i] + new + text[j:]

CAB = """const CAB={
  id:'whack',                   // file name in the arcade: games/<id>.html
  title:'WHACK SHACK',          // shown on the marquee and in the arcade
  brand:'WHACK SHACK',sub:'HYPERDOT ARCADE',
  style:'color',                // full-colour LED: this is the character-animation cabinet
  res:[[192,108],[256,144],[320,180]], // matrix sizes the Dots chip cycles through
  resDefault:1,
  tickets:true,                 // this cabinet pays tickets into the arcade's prize counter
  keys:'<b>Mouse</b> aim and click · <b>1</b>–<b>9</b> or <b>numpad</b> whack a burrow · <b>Arrows</b> + <b>Space</b> · <b>M</b> mute · <b>Esc</b> pause'
};"""
src = swap(src, 'const CAB={', '\n};', CAB)
src = swap(src, '/* sound effects: keep them short', "f(...a);};}}\n", rd('audio.js'))
src = swap(src, 'const TRACKS={', '\n};', rd('tracks.js').rstrip('\n'))
# layout hook so the cabinet can place its own phone keypad
src = src.replace('function layout(){', 'const LAYCB=[];\nfunction layout(){', 1)
src = src.replace("bs.setProperty('--b',Math.min(56,vh*.13)+'px');}\n  }\n}", "bs.setProperty('--b',Math.min(56,vh*.13)+'px');}\n  }\n  for(const f of LAYCB)f(portrait);\n}", 1)
assert 'for(const f of LAYCB)f(portrait);' in src
CSS = """/* WHACK SHACK: a 3x3 keypad of lit buttons under the matrix on upright phones */
#kp{position:fixed;left:50%;transform:translateX(-50%);display:grid;grid-template-columns:repeat(3,var(--kb,84px));gap:var(--kg,16px);touch-action:none}
.kb{width:var(--kb,84px);height:var(--kb,84px);border-radius:50%;border:1px solid var(--edge);color:var(--ink-2);cursor:pointer;padding:0;touch-action:none;
  background:radial-gradient(circle at 50% 34%,rgba(255,176,64,.16),var(--panel) 72%);font:700 13px/1 var(--f);display:grid;place-items:center;transition:transform .05s,box-shadow .12s,border-color .12s}
.kb[data-s=mole],.kb[data-s=hard]{border-color:rgba(255,200,90,.9);color:var(--ink);box-shadow:0 0 18px rgba(255,190,70,.55),inset 0 0 14px rgba(255,190,70,.35)}
.kb[data-s=gold]{border-color:#ffe27a;color:var(--ink);box-shadow:0 0 24px rgba(255,226,120,.85),inset 0 0 16px rgba(255,226,120,.5)}
.kb[data-s=bomb]{border-color:rgba(255,70,70,.95);color:#ffd0d0;box-shadow:0 0 18px rgba(255,60,60,.6),inset 0 0 14px rgba(255,60,60,.4)}
.kb[data-s=king]{border-color:#d08aff;color:var(--ink);box-shadow:0 0 24px rgba(200,120,255,.8),inset 0 0 16px rgba(200,120,255,.45)}
.kb.on{transform:scale(.9);filter:brightness(1.6)}
.kb:focus-visible{outline:2px solid var(--accent-2);outline-offset:2px}
#gl.nocur{cursor:none}
@media (max-width:440px){.brand{letter-spacing:.1em;font-size:11px}.chip{padding:0 8px}}
@media (max-width:360px){.brand{font-size:10px;letter-spacing:.06em}}
"""
src = src.replace('</style>', CSS + '</style>', 1)
src = src.replace('<p id="turn" hidden>', '<div id="kp" hidden aria-label="Burrow buttons"></div>\n<p id="turn" hidden>', 1)
src = src.replace('<title>Hyperdot Cabinet Starter</title>', '<title>Whack Shack</title>', 1)
GAME = rd('g1_core.js') + rd('g2_scene.js') + rd('g3_brain.js') + rd('g4_show.js')
src = swap(src, '/* =====================================================================================\n   9. GAME', '})();\n</script>', GAME + '</script>')
open(os.path.join(HERE, 'whack.html'), 'w', encoding='utf-8').write(src)
pub = '\n'.join(l for l in src.split('\n') if not l.startswith('window.__game=') and not l.startswith('/* test hook'))
assert '__game' not in pub
open(os.path.join(HERE, 'whack_pub.html'), 'w', encoding='utf-8').write(pub)
print('whack.html', len(src.encode()), 'bytes; whack_pub.html', len(pub.encode()), 'bytes')
