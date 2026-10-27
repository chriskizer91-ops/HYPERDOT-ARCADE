#!/usr/bin/env python3
"""Splice the PLUSH PANIC sections into the house starter -> claw.html (+ claw_pub.html without the test hook)."""
import re, os, sys
D = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(D, 'src/starter.html')).read()
rd = lambda n: open(os.path.join(D, 'src', n)).read().rstrip() + '\n'

def cut(s, start, end_pat, repl, inclusive_end=True):
    a = s.index(start)
    b = s.index(end_pat, a) + (len(end_pat) if inclusive_end else 0)
    return s[:a] + repl + s[b:]

s = src
s = s.replace('<title>Hyperdot Cabinet Starter</title>', '<title>Plush Panic</title>')
s = cut(s, 'const CAB={', '\n};\n', rd('cab.js'))
s = cut(s, 'const SFX={', "f(...a);};}}\n", rd('sfx.js'))
s = cut(s, 'const TRACKS={', '\n};\n', rd('tracks.js'))
a = s.index('/* =====================================================================================\n   9. GAME')
b = s.index('})();\n</script>')
s = s[:a] + rd('phys.js') + rd('play.js') + s[b:]
open(os.path.join(D, 'claw.html'), 'w').write(s)
pub = re.sub(r'/\*HOOK\*/.*?/\*/HOOK\*/\n?', '', s, flags=re.S)
assert '__game' not in pub, 'hook not stripped'
open(os.path.join(D, 'claw_pub.html'), 'w').write(pub)
print('claw.html', len(s.encode()), 'bytes; claw_pub.html', len(pub.encode()), 'bytes')
