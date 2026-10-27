#!/usr/bin/env python3
"""Splice the COIN CASCADE sources into the house starter -> pusher.html (+ pusher_pub.html without the test hook)."""
import os, re
D = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(D, 'src', 'starter.html'), encoding='utf-8').read()
rd = lambda n: open(os.path.join(D, 'src', n), encoding='utf-8').read().rstrip() + '\n'
def cut(s, start, end_pat, repl):
    a = s.index(start); b = s.index(end_pat, a) + len(end_pat)
    return s[:a] + repl + s[b:]
s = src
s = s.replace('<title>Hyperdot Cabinet Starter</title>', '<title>Coin Cascade</title>')
s = s.replace('<span class="brand" id="brand">CABINET<span>', '<span class="brand" id="brand">COIN CASCADE<span>')
s = cut(s, 'const CAB={', '\n};\n', rd('cab.js'))
s = cut(s, 'const SFX={', "f(...a);};}}\n", rd('sfx.js'))
s = cut(s, 'const TRACKS={', '\n};\n', rd('tracks.js'))
a = s.index('/* =====================================================================================\n   9. GAME')
b = s.index('})();\n</script>')
s = s[:a] + ''.join(rd(n) for n in ['phys_a.js', 'phys_b.js', 'render_a.js', 'render_b.js', 'game_a.js', 'game_b.js', 'game_c.js']) + s[b:]
# narrow phones: the brand is long, tighten the bar so every chip fits
s = s.replace('</style>', '@media (max-width:420px){.brand{font-size:11px;letter-spacing:.12em}.opts{gap:5px}.chip{padding:0 8px}}\n</style>', 1)
open(os.path.join(D, 'pusher.html'), 'w', encoding='utf-8').write(s)
pub = re.sub(r'/\*HOOK\*/.*?/\*/HOOK\*/\n?', '', s, flags=re.S)
assert '__game' not in pub, 'hook not stripped'
open(os.path.join(D, 'pusher_pub.html'), 'w', encoding='utf-8').write(pub)
print('pusher.html', len(s.encode()), 'bytes; pusher_pub.html', len(pub.encode()), 'bytes')
