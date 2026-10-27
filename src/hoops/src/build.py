#!/usr/bin/env python3
"""Splice the BUCKET BLITZ parts into the Hyperdot cabinet starter.
The house sections (LED shader, fonts, synth, sequencer, input, layout, bridge, frame loop) are kept
byte-for-byte; only CAB, SFX, TRACKS, the GAME section, tick/setPause and the test hook are replaced.
Writes hoops.html (with the __game test hook) and hoops_pub.html (hook stripped)."""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KIT = os.path.join(os.path.dirname(os.path.dirname(ROOT)), 'kit', 'hyperdot_cabinet_starter.html')
src = open(KIT, encoding='utf-8').read()
part = lambda n: open(os.path.join(HERE, n), encoding='utf-8').read().rstrip('\n')

def cut(s, start, end, repl, incl_end=True):
    a = s.index(start)
    b = s.index(end, a + len(start))
    b = b + len(end) if incl_end else b
    return s[:a] + repl + s[b:]

# ---- page chrome: title, flick-zone hint for upright phones, hide the stick/buttons (this is a flick game)
src = src.replace('<title>Hyperdot Cabinet Starter</title>', '<title>Bucket Blitz</title>')
assert src.count("""document.title='Hyperdot '+CAB.title.charAt(0)+CAB.title.slice(1).toLowerCase();""") == 1
src = src.replace("""document.title='Hyperdot '+CAB.title.charAt(0)+CAB.title.slice(1).toLowerCase();""", "document.title='Bucket Blitz';")
src = src.replace('body.embed .bar,body.embed .keys,body.embed #turn{display:none!important}',
                  'body.embed .bar,body.embed .keys,body.embed #turn{display:none!important}\n' + part('extra.css'))
src = src.replace('<p id="turn" hidden>', '<div id="flick" aria-hidden="true"><i></i><span>Swipe up to shoot</span></div>\n<p id="turn" hidden>')
# ---- config, sounds, music
src = cut(src, 'const CAB={', '\n};', part('cab.js'))
src = cut(src, 'const SFX={', "f(...a);};}}", part('sfx.js'))
src = cut(src, 'const TRACKS={', '\n};', part('tracks.js'))
# ---- the game
src = cut(src, '/* =====================================================================================\n   9. GAME',
          '/* =====================================================================================\n   10. FRAME LOOP', part('game.js') + '\n', incl_end=False)
src = cut(src, 'const UIP={};', 'let ACC=0,LAST=0;', part('loop.js') + '\n', incl_end=False)
src = cut(src, '/* test hook (strip', 'setRes};', part('hook.js'))
assert '/*@@HOOK*/' in src
open(os.path.join(ROOT, 'hoops.html'), 'w', encoding='utf-8').write(src)
pub = re.sub(r'/\*@@HOOK\*/.*?/\*@@/HOOK\*/\n?', '', src, flags=re.S)
assert '__game' not in pub
open(os.path.join(ROOT, 'hoops_pub.html'), 'w', encoding='utf-8').write(pub)
print('hoops.html', len(src.encode()), 'bytes; hoops_pub.html', len(pub.encode()), 'bytes')
