"""Cel-shaded scenery props for Ninja World (light comes from the upper right)."""
import math, random


def svg(body, w, h, defs=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs>{defs}</defs>{body}</svg>'


# ---------------- skies (gradient only; sun and moon are sprites) ----------------
SKIES = {
    "dawn":    ["#7d8fd8", "#b9b2ea", "#f3c0d8", "#ffd2bd", "#ffe9cf"],
    "day":     ["#4d9be9", "#79b8f2", "#a9d3f7", "#d8ecfb", "#f2f9ff"],
    "evening": ["#6f8fe0", "#b7b8ee", "#f8c3d6", "#ffd1a8", "#fff0d6"],
    "night":   ["#0a1030", "#16225a", "#2b3a7c", "#4a5294", "#6c6aa6"],
}


def sky(mode):
    c = SKIES[mode]
    stops = "".join(f'<stop offset="{o}" stop-color="{col}"/>' for o, col in zip([0, .32, .58, .78, 1], c))
    return svg('<rect width="1600" height="900" fill="url(#s)"/>', 1600, 900,
               f'<linearGradient id="s" x1="0" y1="0" x2="0" y2="1">{stops}</linearGradient>')


# ---------------- trees ----------------
def pine(seed, w=170, h=320):
    r = random.Random(seed); cx = w / 2
    out = [f'<path d="M{cx-7},{h-58} L{cx-9},{h} L{cx+9},{h} L{cx+7},{h-58}Z" fill="#6b4c46"/>',
           f'<path d="M{cx+1},{h-58} L{cx+2},{h} L{cx+9},{h} L{cx+7},{h-58}Z" fill="#8f675b"/>']
    tiers = 6
    for i in reversed(range(tiers)):
        t = i / (tiers - 1)
        yT = 8 + t * (h - 120); yB = yT + 70 + t * 40; hw = 18 + t * (w / 2 - 22)
        n = 5 + i // 2; bottom = []
        for k in range(n + 1):
            xx = cx - hw + 2 * hw * k / n
            bottom.append((xx, yB + (10 if k % 2 else 0) + r.uniform(-3, 3)))
        def tier(path_hw, yshift=0):
            d = f"M{cx},{yT+yshift} C{cx-path_hw*.35},{yT+25} {cx-path_hw*.8},{yB-25} {bottom[0][0]},{bottom[0][1]}"
            for k in range(1, len(bottom)):
                px, py = bottom[k]; qx = (bottom[k-1][0] + px) / 2
                d += f" Q{qx},{py+8} {px},{py}"
            d += f" C{cx+path_hw*.8},{yB-25} {cx+path_hw*.35},{yT+25} {cx},{yT+yshift}Z"
            return d
        base = tier(hw)
        out.append(f'<path d="{base}" fill="#2f6b5a"/>')
        # shadow (left half) and light (right edge)
        out.append(f'<clipPath id="pc{seed}{i}"><path d="{base}"/></clipPath>')
        out.append(f'<g clip-path="url(#pc{seed}{i})"><rect x="0" y="{yT}" width="{cx-hw*.15}" height="{yB-yT+20}" fill="#21493f" opacity=".55"/>'
                   f'<path d="M{cx+hw*.2},{yT+20} C{cx+hw*.6},{yT+40} {cx+hw*.95},{yB-10} {cx+hw},{yB+10} L{cx+hw*.45},{yB+10} C{cx+hw*.4},{yB-25} {cx+hw*.2},{yT+50} {cx+hw*.05},{yT+30}Z" fill="#5fae7f"/>'
                   f'<path d="M{cx+hw*.55},{yT+38} C{cx+hw*.8},{yT+55} {cx+hw*.95},{yB-12} {cx+hw},{yB+4}" stroke="#b6e8a3" stroke-width="3" fill="none" stroke-linecap="round"/>'
                   f'<path d="M{cx-hw},{yB} Q{cx},{yB+18} {cx+hw},{yB}" stroke="#163a33" stroke-width="5" fill="none" opacity=".5"/></g>')
    return svg("".join(out), w, h)


def leafy(seed, palette, w=280, h=300, blossoms=False):
    """Round broadleaf or sakura tree built from cel-shaded foliage clumps."""
    deep, base, light, hi, trunk, trunk_hi = palette
    r = random.Random(seed); cx = w / 2
    out = [f'<path d="M{cx-12},{h} C{cx-8},{h-60} {cx-14},{h-110} {cx-30},{h-150} M{cx+10},{h} C{cx+6},{h-70} {cx+20},{h-120} {cx+46},{h-160} '
           f'M{cx-2},{h} L{cx},{h-150}" stroke="{trunk}" stroke-width="16" fill="none" stroke-linecap="round"/>',
           f'<path d="M{cx+6},{h-10} C{cx+4},{h-70} {cx+18},{h-120} {cx+44},{h-158}" stroke="{trunk_hi}" stroke-width="5" fill="none" stroke-linecap="round"/>']
    clumps = []
    for _ in range(11):
        a = r.uniform(0, math.tau); d = r.uniform(0, 1) ** .6
        clumps.append((cx + math.cos(a) * d * w * .33, 120 + math.sin(a) * d * 70 - (1 - d) * 20, r.uniform(34, 52)))
    clumps.sort(key=lambda c: c[1])
    out.append("".join(f'<circle cx="{x-6:.0f}" cy="{y+8:.0f}" r="{rr:.0f}" fill="{deep}"/>' for x, y, rr in clumps))
    out.append("".join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rr*.92:.0f}" fill="{base}"/>' for x, y, rr in clumps))
    out.append("".join(f'<circle cx="{x+rr*.28:.0f}" cy="{y-rr*.3:.0f}" r="{rr*.55:.0f}" fill="{light}"/>' for x, y, rr in clumps if x > cx - 40))
    for x, y, rr in clumps:   # scalloped bottom edge shadows
        out.append(f'<path d="M{x-rr*.8:.0f},{y+rr*.35:.0f} Q{x:.0f},{y+rr*.95:.0f} {x+rr*.8:.0f},{y+rr*.35:.0f}" stroke="{deep}" stroke-width="5" fill="none" opacity=".6"/>')
    for _ in range(60 if blossoms else 26):
        x, y, rr = r.choice(clumps)
        hx = x + r.uniform(-.2, .8) * rr; hy = y + r.uniform(-.8, .2) * rr
        out.append(f'<circle cx="{hx:.0f}" cy="{hy:.0f}" r="{r.uniform(2,4.5):.1f}" fill="{hi}"/>')
    return svg("".join(out), w, h)


PINES = [pine(s) for s in (3, 11, 19)]
BROAD = leafy(5, ("#2f6a4c", "#4f9a62", "#7fc47c", "#d4f5a6", "#6b4c46", "#9a7466"))
SAKURA = leafy(8, ("#d78aa9", "#f0b2c9", "#fbd6e3", "#fff4f8", "#5d4048", "#8a6670"), blossoms=True)


# ---------------- grass and flowers ----------------
def grass(seed, w=150, h=90):
    r = random.Random(seed); out = []
    cols = ["#3f8a62", "#4f9d6b", "#5fb176", "#76c483", "#8fd48f"]
    for i in range(22):
        bx = w / 2 + r.uniform(-w * .3, w * .3); tipx = bx + r.uniform(-45, 45); tipy = r.uniform(4, h * .5)
        bw = r.uniform(3, 6); c = cols[min(len(cols) - 1, int((h - tipy) / h * len(cols)))] if r.random() > .3 else r.choice(cols)
        ctrlx = (bx + tipx) / 2 + r.uniform(-10, 10)
        out.append(f'<path d="M{bx-bw:.1f},{h} Q{ctrlx-bw/2:.1f},{(h+tipy)/2:.1f} {tipx:.1f},{tipy:.1f} Q{ctrlx+bw/2:.1f},{(h+tipy)/2:.1f} {bx+bw:.1f},{h}Z" fill="{c}"/>')
        if tipx > bx and r.random() > .5:
            out.append(f'<path d="M{bx+bw*.5:.1f},{h-6} Q{ctrlx+bw/2:.1f},{(h+tipy)/2:.1f} {tipx:.1f},{tipy:.1f}" stroke="#c4f0a8" stroke-width="1.4" fill="none" opacity=".8"/>')
    return svg("".join(out), w, h)


def daisy():
    pet = "".join(f'<ellipse cx="20" cy="9" rx="3.6" ry="9" fill="{"#ffffff" if k % 2 else "#f1f0fb"}" transform="rotate({k*30} 20 18)"/>' for k in range(12))
    return svg('<path d="M20,60 Q22,40 20,24" stroke="#4f9d6b" stroke-width="2.4" fill="none"/>'
               '<path d="M21,46 q8,-6 12,-2 q-6,4 -12,2Z" fill="#5fb176"/>'
               f'{pet}<circle cx="20" cy="18" r="5.5" fill="#f7c331"/><circle cx="21.5" cy="16.5" r="2" fill="#ffe58a"/>', 40, 60)


def bellflower():
    pet = "".join(f'<ellipse cx="18" cy="10" rx="5" ry="7.5" fill="{c}" transform="rotate({k*72} 18 17)"/>'
                  for k, c in enumerate(["#8ea6f2", "#7d95e6", "#8ea6f2", "#a3b7f6", "#7d95e6"]))
    return svg('<path d="M18,56 Q16,38 18,22" stroke="#4f9d6b" stroke-width="2.2" fill="none"/>'
               f'{pet}<circle cx="18" cy="17" r="3.2" fill="#ffffff"/><circle cx="18" cy="17" r="1.4" fill="#f7c331"/>', 36, 56)


# ---------------- lake life ----------------
FISH = svg('<path d="M10,22 C22,8 52,6 66,20 C52,34 22,34 10,22Z" fill="url(#fb)"/>'
           '<path d="M64,20 L80,8 L76,20 L80,32Z" fill="#7d9fd0"/>'
           '<path d="M30,12 C36,4 46,4 50,10Z" fill="#7d9fd0"/>'
           '<path d="M14,22 C26,28 48,30 62,22" stroke="#ffffff" stroke-width="2" fill="none" opacity=".7"/>'
           '<circle cx="19" cy="19" r="2.6" fill="#1e2440"/><circle cx="18.3" cy="18.3" r=".9" fill="#ffffff"/>',
           84, 40, '<linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f73b8"/><stop offset=".5" stop-color="#a9c4e8"/><stop offset="1" stop-color="#eef5ff"/></linearGradient>')

MERMAID = svg(  # head and shoulders above the water, seen from behind-left, hair flowing
    '<path d="M22,96 C20,74 26,58 40,54 C54,58 60,74 58,96Z" fill="#f2c9b5"/>'
    '<path d="M40,58 C56,62 60,80 58,96 L50,96 C52,80 48,68 40,64Z" fill="#e3ad97"/>'
    '<path d="M24,40 C22,16 58,10 62,36 C66,60 70,80 76,98 L44,98 C46,82 30,74 24,40Z" fill="#2c3f74"/>'
    '<path d="M54,30 C62,46 64,72 72,96" stroke="#5a74b8" stroke-width="3" fill="none" stroke-linecap="round"/>'
    '<path d="M28,30 C34,18 50,14 58,24" stroke="#5a74b8" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    '<circle cx="30" cy="30" r="5" fill="#ff9ec4"/><circle cx="30" cy="30" r="2" fill="#ffe58a"/>', 84, 100)

TAIL = svg('<path d="M40,110 C36,80 38,56 44,40 C30,30 14,10 8,2 C26,8 40,18 50,30 C60,18 74,8 92,2 C86,12 70,30 56,40 C62,56 64,80 60,110Z" fill="url(#tg)"/>'
           '<path d="M8,2 C26,8 40,18 50,30 C60,18 74,8 92,2" stroke="#b6fff1" stroke-width="2.5" fill="none" opacity=".8"/>'
           + "".join(f'<path d="M{44+(i%2)*6},{56+i*9} q4,4 8,0" stroke="#a6f2ff" stroke-width="1.6" fill="none" opacity=".7"/>' for i in range(6)),
           100, 112, '<linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#57d6c8"/><stop offset=".55" stop-color="#3f97d6"/><stop offset="1" stop-color="#6a5fc9"/></linearGradient>')

BOAT = svg(  # hull with a fisherman in a straw hat; the oar is a separate sprite
    '<path d="M10,58 C40,82 180,82 210,52 L196,50 C170,66 50,68 22,54Z" fill="#7a5038"/>'
    '<path d="M10,58 C40,82 180,82 210,52 C190,74 40,76 10,58Z" fill="#5a3a2a"/>'
    '<path d="M22,54 C50,68 170,66 196,50" stroke="#c99a72" stroke-width="3" fill="none"/>'
    '<path d="M30,62 C70,72 150,72 190,60" stroke="#9a6a4a" stroke-width="2" fill="none"/>'
    '<path d="M168,52 L170,10" stroke="#6b4c46" stroke-width="3"/>'
    '<path d="M92,58 C90,40 96,30 110,28 C124,30 130,42 128,58Z" fill="#3d4f7a"/>'
    '<path d="M110,28 C124,30 130,42 128,58 L118,58 C120,44 116,34 110,32Z" fill="#2c3a5e"/>'
    '<circle cx="110" cy="22" r="7" fill="#f0c8a8"/>'
    '<path d="M86,22 L110,4 L134,22 Q110,28 86,22Z" fill="#e8c77a"/>'
    '<path d="M110,4 L134,22 Q122,25 110,25Z" fill="#c9a55a"/>', 220, 84)

OAR = svg('<path d="M4,4 L104,46" stroke="#b88a5c" stroke-width="4" stroke-linecap="round"/>'
          '<path d="M96,40 C104,40 118,48 120,56 C112,58 98,52 94,46Z" fill="#a37548"/>', 124, 62)

RAFT = svg(''.join(f'<rect x="{10+i*30}" y="44" width="30" height="16" rx="8" fill="{c}"/><rect x="{12+i*30}" y="46" width="26" height="4" rx="2" fill="#c49870" opacity=".7"/>'
                   for i, c in enumerate(["#8a5e40", "#7a5038", "#8a5e40", "#7a5038", "#8a5e40", "#7a5038"]))
           + '<path d="M40,44 L40,60 M150,44 L150,60" stroke="#d9c49a" stroke-width="3"/>'
           '<path d="M160,44 L160,6" stroke="#6b4c46" stroke-width="3"/><rect x="153" y="6" width="14" height="16" rx="4" fill="#ffcf6b" stroke="#6b4c46" stroke-width="2"/>'
           '<path d="M84,44 C84,30 88,22 98,20 C108,22 112,30 112,44Z" fill="#7a3f4f"/>'
           '<circle cx="98" cy="14" r="6" fill="#f0c8a8"/><path d="M80,14 L98,0 L116,14 Q98,19 80,14Z" fill="#e8c77a"/>'
           '<path d="M112,26 L70,70" stroke="#b88a5c" stroke-width="3" stroke-linecap="round"/>', 200, 72)

BIRD = svg('<path d="M2,10 Q10,0 20,10 Q30,0 38,10 Q30,5 20,13 Q10,5 2,10Z" fill="#3b3f5c"/>', 40, 16)

MOON = svg('<circle cx="60" cy="60" r="44" fill="#fdf6e3"/><circle cx="46" cy="50" r="7" fill="#efe4c6"/>'
           '<circle cx="72" cy="72" r="10" fill="#efe4c6"/><circle cx="74" cy="44" r="5" fill="#efe4c6"/>'
           '<path d="M60,16 A44,44 0 0 1 60,104 A34,44 0 0 0 60,16Z" fill="#e9dcbd" opacity=".55"/>', 120, 120)

PROPS = {"pine0": PINES[0], "pine1": PINES[1], "pine2": PINES[2], "broad": BROAD, "sakura": SAKURA,
         "grass0": grass(1), "grass1": grass(2), "grass2": grass(3), "daisy": daisy(), "bell": bellflower(),
         "fish": FISH, "mermaid": MERMAID, "tail": TAIL, "boat": BOAT, "oar": OAR, "raft": RAFT, "bird": BIRD, "moon": MOON,
         **{f"sky_{m}": sky(m) for m in SKIES}}
