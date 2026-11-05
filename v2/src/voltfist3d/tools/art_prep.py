"""Turn Christopher's character sheets into what the game needs: one texture atlas per fighter, plus measurements.
usage: python3 tools/art_prep.py RAW_DIR OUT_DIR [DEBUG_DIR]
RAW_DIR holds the folders from the zips (Kai-Volta/1.3-...-Front-T-Pose.png and so on).
For each fighter it finds the figure on the plain grey background, finds the joints of the T-pose, measures how wide
every body part is (front T-pose) and how deep (turnaround side view), and packs four pictures into a 2048 x 2048 atlas:
  top-left: front T-pose   top-right: back view (mirrored, so it lines up with the front)
  bottom-left: face front  bottom-right: face side
meta.json gives every landmark in atlas pixels, every width in front-T-pose pixels."""
import sys, os, glob, json
import numpy as np, cv2
from PIL import Image

RAW, OUT = sys.argv[1], sys.argv[2]
DBG = sys.argv[3] if len(sys.argv) > 3 else None
FIGHTERS = {'kai': 'Kai-Volta', 'runa': 'Runa-Kage', 'magnus': 'Magnus-Strom', 'nova': 'Nova-Sierra', 'echo': 'Echo'}
# which way the side views face (+1 = face points to the image's right); checked by eye on the debug sheet
SIDE_FACE = {'kai': 1, 'runa': 1, 'magnus': 1, 'nova': -1, 'echo': -1}
HEAD_SIDE_FACE = {'kai': -1, 'runa': -1, 'magnus': 1, 'nova': 1, 'echo': -1}
A = 2048; Q = 1024


def load(folder, key):
    p = glob.glob(os.path.join(RAW, folder, '*' + key + '*.png'))[0]
    return np.asarray(Image.open(p).convert('RGB'))


def mask_of(img, tol=16):
    """everything that is not the flat grey background (flood-filled from the borders)"""
    h, w = img.shape[:2]
    m = np.zeros((h + 2, w + 2), np.uint8)
    im = img.copy()
    for (x, y) in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if m[y + 1, x + 1] == 0:
            cv2.floodFill(im, m, (x, y), (0, 0, 0), (tol,) * 3, (tol,) * 3, 4 | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE | (255 << 8))
    fg = m[1:-1, 1:-1] == 0
    fg = cv2.morphologyEx(fg.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg.astype(np.uint8))
    keep = np.zeros_like(fg)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > fg.size * 0.002: keep |= lab == i
    return keep


def bleed(img, m):
    """fill the background with the colour of the nearest pixel inside the figure (a few pixels in from the outline, so
    the grey edge pixels don't spread), so a texture lookup that lands just outside the outline still gets the right colour"""
    from scipy import ndimage
    core = cv2.erode(m.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    if not core.any(): core = m
    _, (iy, ix) = ndimage.distance_transform_edt(~core, return_indices=True)
    filled = img[iy, ix]
    out = np.where(core[..., None], img, filled)
    soft = cv2.GaussianBlur(out, (0, 0), 3)
    edge = (~core).astype(np.float32)[..., None]
    return (out * (1 - edge) + soft * edge).astype(np.uint8)


def split_figures(m, n):
    """the n figures of a turnaround (or face sheet), left to right, by empty columns"""
    col = m.any(axis=0); xs = np.where(col)[0]
    runs = []; s = xs[0]; p = xs[0]
    for x in xs[1:]:
        if x > p + 6: runs.append((s, p)); s = x
        p = x
    runs.append((s, p))
    runs.sort(key=lambda r: -(r[1] - r[0]))
    runs = sorted(runs[:n])
    return runs


def runs_in_row(row):
    xs = np.where(row)[0]
    if len(xs) == 0: return []
    out = []; s = xs[0]; p = xs[0]
    for x in xs[1:]:
        if x > p + 1: out.append((s, p)); s = x
        p = x
    out.append((s, p)); return out


def run_at(row, x):
    for a, b in runs_in_row(row):
        if a <= x <= b: return (a, b)
    return None


def tpose_landmarks(m):
    ys, xs = np.where(m); top, bot, left, right = ys.min(), ys.max(), xs.min(), xs.max(); Hf = bot - top
    span = right - left
    cxa = int((left + right) / 2)
    def cw(y):
        r = run_at(m[y], cxa)
        return (r[1] - r[0]) if r else 0
    wid = np.array([cw(y) for y in range(m.shape[0])])
    band = np.where(wid > 0.6 * span)[0]
    arm_top, arm_bot = band.min(), band.max()
    cx0 = (left + right) / 2
    y_ap = int(arm_bot + 0.012 * Hf)
    tr = run_at(m[y_ap], int(cx0)) or (int(cx0 - 0.08 * Hf), int(cx0 + 0.08 * Hf))
    tl, trr = tr; cx = (tl + trr) / 2

    def arm_c(x):
        col = m[max(0, arm_top - int(.06 * Hf)):arm_bot + int(.06 * Hf), int(x)]
        yy = np.where(col)[0]
        return (arm_top - int(.06 * Hf) + (yy.min() + yy.max()) / 2, yy.max() - yy.min()) if len(yy) else ((arm_top + arm_bot) / 2, 1)
    th = arm_c(tl - 0.08 * Hf)[1]
    SR = (tl + 0.3 * th, arm_c(tl + 0.3 * th)[0]); SL = (trr - 0.3 * th, arm_c(trr - 0.3 * th)[0])
    TR = (left, arm_c(left + 3)[0]); TL = (right, arm_c(right - 3)[0])
    fe, fw = .29 / .75, .56 / .75
    lerp2 = lambda a, b, t: (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    ER, WR = lerp2(SR, TR, fe), lerp2(SR, TR, fw); EL, WL = lerp2(SL, TL, fe), lerp2(SL, TL, fw)
    y = int(top + 0.45 * Hf)
    while y < bot and m[y, int(cx)]: y += 1
    crotch = y
    H = (cx, crotch - 0.04 * Hf)
    rr = [r for r in runs_in_row(m[int(crotch + 0.04 * Hf)])]
    lr = [r for r in rr if (r[0] + r[1]) / 2 < cx]; rgt = [r for r in rr if (r[0] + r[1]) / 2 >= cx]
    hR = ((lr[-1][0] + lr[-1][1]) / 2 if lr else cx - .06 * Hf, H[1]); hL = ((rgt[0][0] + rgt[0][1]) / 2 if rgt else cx + .06 * Hf, H[1])
    ya = int(bot - 0.05 * Hf); ra = runs_in_row(m[ya])
    la = [r for r in ra if (r[0] + r[1]) / 2 < cx]; ga = [r for r in ra if (r[0] + r[1]) / 2 >= cx]
    aR = ((la[-1][0] + la[-1][1]) / 2 if la else hR[0], ya); aL = ((ga[0][0] + ga[0][1]) / 2 if ga else hL[0], ya)
    kR, kL = lerp2(hR, aR, .5), lerp2(hL, aL, .5)
    N = (cx, arm_top); chin = arm_top - 0.045 * Hf
    hx = np.where(m[int(top + 0.02 * Hf)])[0]; hcx = (hx.min() + hx.max()) / 2 if len(hx) else cx
    C = (hcx, (top + chin) / 2)
    Wst = (cx, H[1] - 0.3 * (H[1] - N[1]))
    return dict(top=float(top), bot=float(bot), Hf=float(Hf), armpit=float(y_ap), crotch=float(crotch), chin=float(chin),
                N=N, C=C, W=Wst, H=H, SR=SR, SL=SL, ER=ER, EL=EL, WR=WR, WL=WL, TR=TR, TL=TL,
                hR=hR, hL=hL, kR=kR, kL=kL, aR=aR, aL=aL, cx=float(cx))


def half_width(m, A_, B_, t, lim):
    """half the thickness of the figure across the line A->B at fraction t"""
    ax, ay = A_[0] + (B_[0] - A_[0]) * t, A_[1] + (B_[1] - A_[1]) * t
    dx, dy = B_[0] - A_[0], B_[1] - A_[1]; L = (dx * dx + dy * dy) ** .5 or 1; px, py = dy / L, -dx / L
    h, w = m.shape; d = []
    for sgn in (1, -1):
        k = 0
        while k < lim:
            x, y = int(round(ax + px * sgn * k)), int(round(ay + py * sgn * k))
            if not (0 <= x < w and 0 <= y < h) or not m[y, x]: break
            k += 1
        d.append(k)
    return ((d[0] + d[1]) / 2, (d[0] - d[1]) / 2)


def row_run(m, y, x):
    y = int(round(y)); r = run_at(m[max(0, min(m.shape[0] - 1, y))], int(round(x)))
    return r


def main():
    os.makedirs(OUT, exist_ok=True)
    if DBG: os.makedirs(DBG, exist_ok=True)
    META = {}
    for fid, folder in FIGHTERS.items():
        F = load(folder, 'Front-T-Pose'); T = load(folder, 'Turnaround'); Fc = load(folder, 'Face-Sheet')
        mF = mask_of(F); L = tpose_landmarks(mF); Hf = L['Hf']
        # turnaround: front, side, back
        mT = mask_of(T); figs = split_figures(mT, 3)
        (sx0, sx1), (bx0, bx1) = figs[1], figs[2]
        mS = mT[:, sx0:sx1 + 1]; ysS = np.where(mS.any(axis=1))[0]; topS, botS = ysS.min(), ysS.max(); HfS = botS - topS
        back = T[:, bx0:bx1 + 1][:, ::-1]; mB = mT[:, bx0:bx1 + 1][:, ::-1]
        LB = tpose_landmarks(mB)
        # face sheet: front, side
        mC = mask_of(Fc); ff = split_figures(mC, 2)
        cf = Fc[:, ff[0][0]:ff[0][1] + 1]; mcf = mC[:, ff[0][0]:ff[0][1] + 1]
        cs = Fc[:, ff[1][0]:ff[1][1] + 1]; mcs = mC[:, ff[1][0]:ff[1][1] + 1]
        if HEAD_SIDE_FACE[fid] < 0: cs = cs[:, ::-1]; mcs = mcs[:, ::-1]
        # ---- measurements in front-T-pose pixels ----
        lim = int(0.14 * Hf); TS = [i / 30 for i in range(31)]
        meas = {}
        for k, (a, b) in {'uaR': ('SR', 'ER'), 'faR': ('ER', 'WR'), 'uaL': ('SL', 'EL'), 'faL': ('EL', 'WL'),
                          'thR': ('hR', 'kR'), 'shR': ('kR', 'aR'), 'thL': ('hL', 'kL'), 'shL': ('kL', 'aL')}.items():
            hw_ = [half_width(mF, L[a], L[b], t, lim) for t in TS]
            meas[k] = [v[0] for v in hw_]; meas[k + '_o'] = [v[1] for v in hw_]
        # torso and pelvis rows (front half widths, side front/back depths in front pixels)
        sideK = Hf / HfS; sf = SIDE_FACE[fid]
        def side_at(y):
            f = (y - L['top']) / Hf; ys = int(round(topS + f * HfS)); r = runs_in_row(mS[max(0, min(mS.shape[0] - 1, ys))])
            if not r: return None
            return (r[0][0], r[-1][1])
        yax = side_at(L['W'][1]); axis = (yax[0] + yax[1]) / 2 if yax else 0
        rows = []
        for i in range(121):
            y = L['crotch'] + (L['N'][1] - L['crotch']) * i / 120
            rr = row_run(mF, y, L['cx']); hw = (rr[1] - rr[0]) / 2 if rr else 0
            if y < L['armpit']: hw = None
            s = side_at(y)
            if s: fr, bk = (s[1] - axis, axis - s[0]) if sf > 0 else (axis - s[0], s[1] - axis)
            else: fr = bk = None
            rows.append([float(y), hw, fr * sideK if fr is not None else None, bk * sideK if bk is not None else None])
        # leg depth from the side view (both legs overlap there)
        legd = []
        for t in TS:
            y = L['hR'][1] + (L['aR'][1] - L['hR'][1]) * t; s = side_at(y)
            legd.append(((s[1] - s[0]) / 2 * sideK) if s else None)
        footL = None
        s = side_at(L['bot'] - 2)
        if s: footL = (s[1] - s[0]) * sideK
        # ---- head from the face sheet ----
        def head_meas(mm):
            ys = np.where(mm.any(axis=1))[0]; top = ys.min()
            w = np.array([(np.ptp(mm[y].nonzero()[0]) if mm[y].any() else 0) for y in range(mm.shape[0])])
            hw0 = w[int(top + 0.22 * (ys.max() - top))]
            sh = top + int(np.argmax(w[top:] > 1.55 * hw0))
            return top, sh, w
        topF, shF, wF = head_meas(mcf); topSd, shS, wS = head_meas(mcs)
        chinF = topF + 0.86 * (shF - topF); chinS = topSd + (chinF - topF)
        shS = topSd + (shF - topF)
        cxF = np.mean([(mcf[int(topF + k * (chinF - topF))].nonzero()[0][[0, -1]].mean()) for k in (.3, .5, .7)])
        hrowsF = []; hrowsS = []
        for i in range(73):
            y = topF + (chinF - topF) * i / 72; r = runs_in_row(mcf[int(y)])
            hrowsF.append([float(y), float((r[-1][1] - r[0][0]) / 2) if r else 0, float(((r[-1][1] + r[0][0]) / 2) - cxF) if r else 0])
        nk = runs_in_row(mcs[int(chinS + 0.1 * (shS - chinS))]); axS = (nk[0][0] + nk[-1][1]) / 2 if nk else mcs.shape[1] / 2
        for i in range(73):
            y = topSd + (chinS - topSd) * i / 72; r = runs_in_row(mcs[int(y)])
            hrowsS.append([float(y), float(r[-1][1] - axS) if r else 0, float(axS - r[0][0]) if r else 0])
        # ---- atlas ----
        atlas = np.zeros((A, A, 3), np.uint8)
        def place(img, mm, qx, qy, box):
            """crop box (x0,y0,x1,y1) of img, fit it into quadrant (qx,qy) keeping aspect; returns (scale, ox, oy)"""
            x0, y0, x1, y1 = [int(v) for v in box]
            x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(img.shape[1], x1), min(img.shape[0], y1)
            cr = bleed(img[y0:y1, x0:x1], mm[y0:y1, x0:x1])
            sc = min(Q / (x1 - x0), Q / (y1 - y0)); nw, nh = int((x1 - x0) * sc), int((y1 - y0) * sc)
            ox, oy = qx * Q + (Q - nw) // 2, qy * Q + (Q - nh) // 2
            atlas[oy:oy + nh, ox:ox + nw] = cv2.resize(cr, (nw, nh), interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
            # outside the placed picture: stretch the edges so nothing grey leaks in
            return dict(s=sc, ox=ox - x0 * sc, oy=oy - y0 * sc, box=[ox, oy, ox + nw, oy + nh])
        pad = 0.03 * Hf
        tF = place(F, mF, 0, 0, (0, L['top'] - pad, F.shape[1], L['bot'] + pad))
        ysB = np.where(mB.any(axis=1))[0]; padB = 0.03 * LB['Hf']
        tB = place(back, mB, 1, 0, (0, ysB.min() - padB, back.shape[1], ysB.max() + padB))
        hh = chinF - topF
        tHF = place(cf, mcf, 0, 1, (cxF - 0.75 * hh, topF - 0.08 * hh, cxF + 0.75 * hh, chinF + 0.4 * hh))
        hhs = chinS - topSd
        tHS = place(cs, mcs, 1, 1, (axS - 0.75 * hhs, topSd - 0.08 * hhs, axS + 0.75 * hhs, chinS + 0.4 * hhs))
        def tp(t, p): return [p[0] * t['s'] + t['ox'], p[1] * t['s'] + t['oy']]
        LMK = ['N', 'C', 'W', 'H', 'SR', 'SL', 'ER', 'EL', 'WR', 'WL', 'TR', 'TL', 'hR', 'hL', 'kR', 'kL', 'aR', 'aL']
        meta = dict(
            front={k: tp(tF, L[k]) for k in LMK}, back={k: tp(tB, LB[k]) for k in LMK},
            fs=tF['s'], bs=tB['s'], bscale=LB['Hf'] / Hf,
            Hf=Hf, top=L['top'], bot=L['bot'], chin=L['chin'], armpit=L['armpit'], crotch=L['crotch'], cx=L['cx'],
            limbs=meas, legDepth=legd, footL=footL, torso=rows,
            head=dict(front=dict(o=tp(tHF, (cxF, chinF)), s=tHF['s'], top=float(topF), chin=float(chinF), rows=hrowsF),
                      side=dict(o=tp(tHS, (axS, chinS)), s=tHS['s'], top=float(topSd), chin=float(chinS), rows=hrowsS),
                      tposeH=float(L['chin'] - L['top']), tposeW=float(max(r[1] for r in hrowsF) * (L['chin'] - L['top']) / (chinF - topF))),
            backH=[LB['top'] * tB['s'] + tB['oy'], LB['bot'] * tB['s'] + tB['oy']], fo=[tF['ox'], tF['oy']])
        lum = cv2.cvtColor(atlas, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
        lum = np.log(lum + 0.06)
        fine = cv2.GaussianBlur(lum, (0, 0), 1.0) - cv2.GaussianBlur(lum, (0, 0), 9)
        alpha = np.clip(128 + fine * 160, 0, 255).astype(np.uint8)
        coarse = cv2.GaussianBlur(lum, (0, 0), 6) - cv2.GaussianBlur(lum, (0, 0), 40)
        g = cv2.resize(coarse, (256, 256), interpolation=cv2.INTER_AREA)
        g = np.clip(128 + g * 150, 0, 255).astype(np.uint8)
        import base64
        meta['disp'] = base64.b64encode(g.tobytes()).decode()
        META[fid] = meta
        Image.fromarray(np.dstack([atlas, alpha]), 'RGBA').save(os.path.join(OUT, fid + '.webp'), quality=84, alpha_quality=35, method=6)
        if DBG:
            d = atlas.copy()
            for side, key in (('front', 'front'), ('back', 'back')):
                for k, p in meta[key].items(): cv2.circle(d, (int(p[0]), int(p[1])), 7, (255, 0, 255), -1)
                for a, b in [('SR', 'ER'), ('ER', 'WR'), ('WR', 'TR'), ('SL', 'EL'), ('EL', 'WL'), ('WL', 'TL'), ('hR', 'kR'), ('kR', 'aR'), ('hL', 'kL'), ('kL', 'aL'), ('N', 'W'), ('W', 'H'), ('N', 'C')]:
                    pa, pb = meta[key][a], meta[key][b]; cv2.line(d, (int(pa[0]), int(pa[1])), (int(pb[0]), int(pb[1])), (0, 255, 0), 3)
            for k in ('front', 'side'):
                o = meta['head'][k]['o']; cv2.circle(d, (int(o[0]), int(o[1])), 9, (255, 0, 0), -1)
            Image.fromarray(cv2.resize(d, (768, 768))).save(os.path.join(DBG, fid + '_atlas.png'))
            sv = T[:, sx0:sx1 + 1].copy(); Image.fromarray(cv2.resize(sv, (sv.shape[1] // 2, sv.shape[0] // 2))).save(os.path.join(DBG, fid + '_side.png'))
        print(fid, 'Hf', int(Hf), 'atlas KB', os.path.getsize(os.path.join(OUT, fid + '.webp')) // 1024)
    json.dump(META, open(os.path.join(OUT, 'meta.json'), 'w'), separators=(',', ':'))


main()
