#!/usr/bin/env python3
"""Splice the RING ROLLER game sources into a copy of the Hyperdot cabinet starter.
Writes roll.html (with the window.__game test hook) and roll_pub.html (hook stripped)."""
import os, re, sys
D = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(D, '..', '..', 'kit', 'hyperdot_cabinet_starter.html')
src = open(KIT, encoding='utf-8').read()
P = lambda n: open(os.path.join(D, 'src', n), encoding='utf-8').read().rstrip('\n')

def cut(s, start, end_pat, incl_end=True, label=''):
    i = s.index(start)
    j = s.index(end_pat, i)
    if incl_end: j += len(end_pat)
    return s[:i], s[i:j], s[j:]

# 1. CAB config
a, _, b = cut(src, 'const CAB={', '\n};')
src = a + P('p0_cab.js') + b
# 2. SFX block (object + rate limiter line)
a, _, b = cut(src, 'const SFX={', '\n{const lim=')
k = b.index('\n', 1)
src = a + P('p0_sfx.js') + b[k:]
# 3. TRACKS
a, _, b = cut(src, 'const TRACKS={', '\n};')
src = a + P('p0_tracks.js') + b
# 4. GAME section through the end of the script
i = src.index('/* =====================================================================================\n   9. GAME')
j = src.index('</script>', i)
game = '\n'.join(P(n) for n in ['p1_phys.js', 'p2_scene.js', 'p3_shade.js', 'p4_dmd.js', 'p5_game.js', 'p6_view.js', 'p7_boot.js'])
src = src[:i] + game + '\n' + src[j:]
src = src.replace('<title>Hyperdot Cabinet Starter</title>', '<title>Ring Roller</title>')
# the brand is longer than the starter's: tighten the top bar on narrow phones so all chips fit
src = src.replace('</style>', '@media (max-width:420px){.brand{font-size:11px;letter-spacing:.1em}.opts{gap:5px}.chip{padding:0 8px}}\n</style>', 1)
src = src.replace('<span class="brand" id="brand">CABINET<span>', '<span class="brand" id="brand">RING ROLLER<span>')
open(os.path.join(D, 'roll.html'), 'w', encoding='utf-8').write(src)
pub = re.sub(r'/\* test hook[^\n]*\n[^\n]*window\.__game=[^\n]*\n', '', src)
assert 'window.__game' not in pub
open(os.path.join(D, 'roll_pub.html'), 'w', encoding='utf-8').write(pub)
print('roll.html', len(src.encode()), 'bytes; roll_pub.html', len(pub.encode()), 'bytes')
