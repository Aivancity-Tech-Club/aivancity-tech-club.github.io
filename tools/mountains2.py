"""Painterly mountain generator: ridged silhouettes, lit/shadowed faces along spurs, biome details, haze."""
import math, random

HZ = 650
SUN_X = 1180
HAZE = "#efe3f1"

# lit, mid, shadow, deep  (natural palettes, each tinted toward its rank)
BIOME = {
    "white":  ("#ffffff", "#e3e5f5", "#aeb2da", "#7f84bb"),
    "yellow": ("#ffe1a3", "#e8b56f", "#b0775a", "#7d4f4c"),
    "green":  ("#d7f0c4", "#7cbf8c", "#3c7f6f", "#24524f"),
    "blue":   ("#eef7ff", "#a6cdf2", "#5a7fc4", "#34488f"),
    "red":    ("#ffc9b6", "#de7b7e", "#8f4363", "#5a2848"),
    "black":  ("#9aa0cf", "#4c5080", "#25274a", "#141530"),
}
SNOW = {"white": .95, "yellow": 0, "green": 0, "blue": .5, "red": .2, "black": .14}


def cr(pts, close=False):
    d = f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[i + 2] if i + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}"
    return d + (" Z" if close else "")


def poly(pts):
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"


def frac(p0, p1, disp, levels, r, axis="x"):
    pts = [p0, p1]
    for _ in range(levels):
        nxt = []
        for a, b in zip(pts, pts[1:]):
            m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
            o = r.uniform(-1, 1) * disp
            if axis == "x": m[0] += o
            else: m[1] += o
            nxt += [a, tuple(m)]
        nxt.append(pts[-1]); pts = nxt; disp *= 0.55
    return pts


def silhouette(x, py, hw, r, base):
    """Left base -> summit -> right base, rocky near the top, smooth at the foot."""
    h = base - py; out = []
    shoulders = {side: (r.uniform(.3, .55), r.uniform(.05, .11)) for side in (-1, 1)}
    N = 30
    for side in (-1, 1):
        seq = []
        sp, sa = shoulders[side]
        for i in range(N + 1):
            t = i / N
            prof = 1 - (t ** 0.78) * (0.5 + 0.5 * t)
            bump = sa * math.exp(-((t - sp) / 0.06) ** 2)
            rough = (1 - t) ** 1.5 * 0.035
            jit = r.uniform(-rough, rough) if 0 < i < N else 0
            y = base - h * (prof + bump + jit)
            xx = x + side * hw * (t ** 1.0) * ((1 + r.uniform(-.025, .025)) if 0 < i < N else 1)
            seq.append((xx, min(y, base)))
        out.append(seq)
    return list(reversed(out[0])) + out[1][1:]


def y_on(sil, xq):
    best = min(sil, key=lambda p: abs(p[0] - xq)); return best[1]


def mountain(pid, x, py, hw, base=HZ + 14, uid=""):
    r = random.Random(sum(map(ord, pid)) * 31 + 7)
    lit, mid, shd, deep = BIOME[pid]
    L = 1 if SUN_X > x else -1          # light comes from the right for peaks left of the sun
    sil = silhouette(x, py, hw, r, base)
    h = base - py
    cid = f"clip-{pid}{uid}"
    defs = [f'<clipPath id="{cid}"><path d="{cr(sil, True)}"/></clipPath>',
            f'<linearGradient id="body-{pid}{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{lit}"/>'
            f'<stop offset=".35" stop-color="{mid}"/><stop offset=".8" stop-color="{shd}"/><stop offset="1" stop-color="{shd}"/></linearGradient>',
            f'<linearGradient id="side-{pid}{uid}" x1="{0 if L > 0 else 1}" y1="0" x2="{1 if L > 0 else 0}" y2="0">'
            f'<stop offset="0" stop-color="{deep}" stop-opacity=".55"/><stop offset=".5" stop-color="{deep}" stop-opacity=".12"/>'
            f'<stop offset=".62" stop-color="{lit}" stop-opacity=".0"/><stop offset="1" stop-color="{lit}" stop-opacity=".35"/></linearGradient>',
            f'<linearGradient id="haze-{pid}{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{HAZE}" stop-opacity="0"/>'
            f'<stop offset=".55" stop-color="{HAZE}" stop-opacity=".05"/><stop offset="1" stop-color="{HAZE}" stop-opacity=".85"/></linearGradient>',
            f'<filter id="soft-{pid}{uid}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>',
            f'<filter id="glow-{pid}{uid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b"/>'
            f'<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>']
    g = [f'<path d="{cr(sil, True)}" fill="url(#body-{pid}{uid})"/>', f'<g clip-path="url(#{cid})">',
         f'<rect x="{x-hw-20}" y="{py-20}" width="{2*hw+40}" height="{h+40}" fill="url(#side-{pid}{uid})"/>']

    # ---- spurs: ridges running down from the summit and shoulders ----
    spurs = []
    for ex in (-0.62, -0.25, 0.18, 0.55):
        spurs.append(((x + r.uniform(-4, 4), py + 6), (x + ex * hw * r.uniform(.85, 1.1), base), 1.0))
    for side in (-1, 1):
        for k in range(2):
            t = r.uniform(.22, .55); sx = x + side * hw * t; sy = y_on(sil, sx) + 4
            spurs.append(((sx, sy), (sx + side * hw * r.uniform(.12, .35), base), 0.6))
    shadow, rims, gullies = [], [], []
    for (s, e, wgt) in spurs:
        pts = frac(s, e, hw * 0.09, 5, r, "x")
        sh = []
        for i, (px, pyy) in enumerate(pts):
            u = i / (len(pts) - 1)
            w = (4 + hw * 0.16 * u ** 0.8) * wgt * r.uniform(.8, 1.2)
            sh.append((px - L * w, pyy))
        shadow.append(f'<path d="{poly(pts + list(reversed(sh)))}" fill="{deep}" opacity="{0.34 * wgt + 0.08:.2f}"/>')
        rim = [(px + L * 2.5, pyy) for px, pyy in pts[: int(len(pts) * (0.55 if wgt == 1.0 else 0.35))]]
        if len(rim) > 2:
            rims.append(f'<path d="{cr(rim)}" fill="none" stroke="{lit}" stroke-width="{2.0 * wgt + .5:.1f}" opacity=".5" stroke-linecap="round"/>')
        gullies.append(sh)
    g.append(f'<g filter="url(#soft-{pid}{uid})">{"".join(shadow)}</g>')
    g.append(f'<g filter="url(#soft-{pid}{uid})" opacity=".9">{"".join(rims)}</g>')

    # ---- rock strokes: short diagonal brush marks following the slope ----
    strokes = []
    for _ in range(int(hw * 0.35)):
        sx = x + r.uniform(-.85, .85) * hw; top = y_on(sil, sx)
        sy = r.uniform(top + 8, base - 10)
        if sy < top + 6: continue
        side = 1 if sx > x else -1; ln = r.uniform(10, 26)
        col = lit if (side == L) else deep
        strokes.append(f'<path d="M{sx:.0f},{sy:.0f} l{side * ln * .45:.0f},{ln:.0f}" stroke="{col}" stroke-width="{r.uniform(1.5,3.2):.1f}" '
                       f'opacity="{r.uniform(.15,.35):.2f}" stroke-linecap="round"/>')
    g.append(f'<g filter="url(#soft-{pid}{uid})">{"".join(strokes)}</g>')

    # ---- biome details ----
    det = []
    if pid == "green":   # forest climbing the lower slopes
        for _ in range(1500):
            tx = x + r.uniform(-1, 1) * hw; top = y_on(sil, tx)
            lim = base - h * r.uniform(0, .6) ** 1.3
            if lim < top + 10: continue
            ty = r.uniform(lim, base); s = r.uniform(2.6, 5) * (0.6 + 0.7 * (ty - py) / h)
            c = r.choice(["#2f6e5c", "#3b8068", "#285e52", "#4b9474"])
            det.append(f'<path d="M{tx:.0f},{ty-2.6*s:.0f} L{tx+s:.0f},{ty:.0f} L{tx-s:.0f},{ty:.0f}Z" fill="{c}"/>'
                       f'<path d="M{tx:.0f},{ty-2.6*s:.0f} L{tx+L*s*.9:.0f},{ty-.2*s:.0f} L{tx:.0f},{ty-.4*s:.0f}Z" fill="#a9e0a0" opacity=".45"/>')
    elif pid == "red":   # maple forest in autumn colors
        for _ in range(1300):
            tx = x + r.uniform(-1, 1) * hw; top = y_on(sil, tx)
            lim = base - h * r.uniform(0, .5) ** 1.2
            if lim < top + 10: continue
            ty = r.uniform(lim, base); s = r.uniform(2.2, 4.4) * (0.6 + 0.7 * (ty - py) / h)
            c = r.choice(["#b8434f", "#c9524a", "#9e3550", "#d8774f", "#a8404f"])
            det.append(f'<circle cx="{tx:.0f}" cy="{ty:.0f}" r="{s:.1f}" fill="{c}" opacity=".9"/>')
        for _ in range(300):
            tx = x + r.uniform(-1, 1) * hw; top = y_on(sil, tx)
            ty = r.uniform(max(top + 10, base - h * .45), base); s = r.uniform(1.5, 3)
            det.append(f'<circle cx="{tx:.0f}" cy="{ty:.0f}" r="{s:.1f}" fill="#f6b27a" opacity=".55"/>')
    elif pid == "yellow":  # sandstone strata and golden grass
        for k in range(16):
            yy = py + h * (.18 + k * .05) + r.uniform(-4, 4)
            pts = frac((x - hw, yy), (x + hw, yy + r.uniform(-8, 8)), 10, 5, r, "y")
            det.append(f'<path d="{cr(pts)}" fill="none" stroke="{deep if k % 2 else lit}" stroke-width="{r.uniform(1.5,3):.1f}" opacity=".28"/>')
        for _ in range(260):
            tx = x + r.uniform(-1, 1) * hw; top = y_on(sil, tx); ty = r.uniform(max(top + 20, base - h * .45), base)
            det.append(f'<path d="M{tx:.0f},{ty:.0f} q2,-9 5,-13" stroke="#f7d27a" stroke-width="2" fill="none" opacity=".55"/>')
    elif pid == "blue":   # glacier crevasses
        for _ in range(40):
            tx = x + r.uniform(-.7, .7) * hw; top = y_on(sil, tx); ty = r.uniform(top + 30, py + h * .6)
            det.append(f'<path d="M{tx:.0f},{ty:.0f} q{r.uniform(-6,6):.0f},{r.uniform(10,22):.0f} {r.uniform(-3,3):.0f},{r.uniform(24,40):.0f}" '
                       f'stroke="#7fa6e0" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>')
    elif pid == "black":  # basalt with glowing cyan veins
        veins = []
        for _ in range(5):
            sx = x + r.uniform(-.5, .5) * hw; top = y_on(sil, sx); sy = r.uniform(top + 40, base - 60)
            pts = frac((sx, sy), (sx + r.uniform(-14, 14), sy + r.uniform(30, 60)), 6, 3, r, "x")
            veins.append(f'<path d="{cr(pts)}" fill="none" stroke="#55c9ea" stroke-width="1.8" stroke-linecap="round"/>')
        for _ in range(26):
            sx = x + r.uniform(-.7, .7) * hw; top = y_on(sil, sx); sy = r.uniform(top + 30, base - 20)
            veins.append(f'<circle cx="{sx:.0f}" cy="{sy:.0f}" r="{r.uniform(1,2.2):.1f}" fill="#9be7ff"/>')
        det.append(f'<g filter="url(#glow-{pid}{uid})" opacity=".6">{"".join(veins)}</g>')
    g.append(f'<g filter="url(#soft-{pid}{uid})">{"".join(det)}</g>' if pid in ("yellow", "blue") else "".join(det))

    # ---- snow: cap plus streaks down the gullies ----
    sf = SNOW[pid]
    if sf:
        depth = h * sf; top = [p for p in sil if p[1] < py + depth]
        edge = []
        n = 14
        for i in range(n + 1):
            t = i / n; xx = top[-1][0] + (top[0][0] - top[-1][0]) * t
            edge.append((xx, py + depth * r.uniform(.55, 1.0) + (depth * .18 if i % 2 else -depth * .05)))
        cap = cr(top + edge, True)
        g.append(f'<path d="{cap}" fill="#d9e2ff" transform="translate({-L*6} 4)" opacity=".8"/>')
        g.append(f'<path d="{cap}" fill="#fdfdff"/>')
        # shadow side of the snow follows the same spurs
        g.append(f'<g clip-path="url(#snowclip-{pid}{uid})">{"".join(shadow)}</g>')
        defs.append(f'<clipPath id="snowclip-{pid}{uid}"><path d="{cap}"/></clipPath>')
        streaks = []
        for sh in gullies:
            seg = [p for p in sh if p[1] < py + depth * 1.15]
            if len(seg) > 2:
                streaks.append(f'<path d="{cr(seg)}" fill="none" stroke="#ffffff" stroke-width="{r.uniform(2,4):.1f}" opacity=".75" stroke-linecap="round"/>')
        g.append(f'<g filter="url(#soft-{pid}{uid})">{"".join(streaks)}</g>')

    # ---- atmospheric haze toward the base ----
    g.append(f'<rect x="{x-hw-20}" y="{py}" width="{2*hw+40}" height="{h+20}" fill="url(#haze-{pid}{uid})"/>')
    g.append('</g>')
    # crisp light edge on the sunlit side of the silhouette
    lit_edge = [p for p in sil if (p[0] - x) * L >= 0]
    g.append(f'<path d="{cr(lit_edge)}" fill="none" stroke="#fff6e8" stroke-width="2.4" opacity=".7"/>')
    return "".join(defs), "".join(g), sil


def forest_band(r, y0, y1, n, cols, hazeop):
    out = []
    for _ in range(n):
        tx = r.uniform(-40, 1640); ty = r.uniform(y0, y1); s = r.uniform(6, 13)
        out.append(f'<path d="M{tx:.0f},{ty-2.8*s:.0f} C{tx+s*.6:.0f},{ty-1.6*s:.0f} {tx+s*1.1:.0f},{ty-.4*s:.0f} {tx+s:.0f},{ty:.0f} '
                   f'L{tx-s:.0f},{ty:.0f} C{tx-s*1.1:.0f},{ty-.4*s:.0f} {tx-s*.6:.0f},{ty-1.6*s:.0f} {tx:.0f},{ty-2.8*s:.0f}Z" fill="{r.choice(cols)}"/>')
    return f'<g opacity="{hazeop}">{"".join(sorted(out, key=lambda p: float(p.split(",")[1].split(" ")[0])))}</g>'
