"""Builds Ironhowl 3: joins game/*.js (in name order) into v2/games/ironhowl3/js/ironhowl3.js.
    python3 build.py
"""
import glob, os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'games', 'ironhowl3', 'js', 'ironhowl3.js'))
parts = sorted(glob.glob(os.path.join(HERE, 'game', '*.js')))
code = '\n'.join('/* ---- %s ---- */\n' % os.path.basename(p) + open(p, encoding='utf-8').read() for p in parts)
open(OUT, 'w', encoding='utf-8').write('/* Ironhowl 3 - Hyperdot Arcade. Built from v2/src/ironhowl3/game by build.py */\n(function(){\'use strict\';\n' + code + '\n})();\n')
print('built', OUT, round(os.path.getsize(OUT) / 1024), 'KB from', len(parts), 'files')
