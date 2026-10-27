#!/usr/bin/env python3
"""Assemble bowl.html from the house starter (verbatim sections) + this cabinet's parts,
then write bowl_pub.html with the window.__game test hook stripped."""
import os, re, sys
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(D)
ST = os.path.join(OUT, '..', '..', 'kit', 'hyperdot_cabinet_starter.html')
L = open(ST, encoding='utf-8').read().split('\n')
def lines(a, b): return '\n'.join(L[a-1:b])          # 1-indexed, inclusive
def part(n): return open(os.path.join(D, n), encoding='utf-8').read().rstrip('\n')
assert L[83].startswith('const CAB=') and L[312].startswith('/* sound effects') and L[336].startswith('const TRACKS=')
assert L[451].startswith('/* ====') and L[502].startswith('/* ====') and L[537].startswith('})();')
head = lines(1, 5) + '\n<title>Strike Night</title>\n' + lines(7, 83)
EXTRA_CSS = '''/* STRIKE NIGHT: no stick (players swipe the matrix), so the A/B pair sits on the right; a hint marks the swipe zone */
body.nostick #pad{justify-content:flex-end}
#swz{position:fixed;left:0;right:0;margin:0;text-align:center;font:500 12px/1.6 var(--f);letter-spacing:.16em;text-transform:uppercase;color:var(--ink-2);pointer-events:none;opacity:.8}
#swz b{display:block;font-size:26px;line-height:1;color:var(--accent-2);text-shadow:0 0 14px rgba(79,227,255,.6);margin-bottom:6px}
body.embed #swz{display:none!important}
'''
assert head.count('</style>') == 1 and head.count('<p id="turn" hidden>') == 1
head = head.replace('</style>', EXTRA_CSS + '</style>')
head = head.replace('<p id="turn" hidden>', '<p id="swz" hidden><b>&#8593;</b>Swipe up here to bowl<br>curve it to hook &#183; drag to move</p>\n<p id="turn" hidden>')
doc = '\n'.join([
    head,
    part('p_cab.js'),
    lines(94, 312),
    part('p_sfx.js'),
    lines(327, 336),
    part('p_tracks.js'),
    lines(342, 451),
    part('core.js'),
    part('p_scene.js'),
    part('p_game.js'),
    part('p_loop.js'),
    lines(538, 541),
]) + '\n'
open(os.path.join(OUT, 'bowl.html'), 'w', encoding='utf-8').write(doc)
pub = re.sub(r'/\*@@HOOK\*/.*?/\*HOOK@@\*/\n?', '', doc, flags=re.S)
assert '__game' not in pub
open(os.path.join(OUT, 'bowl_pub.html'), 'w', encoding='utf-8').write(pub)
print('bowl.html', len(doc.encode()), 'bytes; bowl_pub.html', len(pub.encode()), 'bytes')
