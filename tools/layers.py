"""Generate the layer SVGs for the PixiJS Ninja World and assemble the HTML page."""
import math, random, json, sys, os

W, H, HZ = 1600, 900, 650
THEME = {"white": ("#f6f2ff", "#cfc8ee", "#9a9cd4"), "yellow": ("#ffe9b8", "#f2c27a", "#c98f5a"),
         "green": ("#cdf3d6", "#7fcf9f", "#3f8f7a"), "blue": ("#d6ecff", "#86b8f0", "#4a74c4"),
         "red": ("#ffe0e3", "#f29aa6", "#b65473"), "black": ("#c9cff0", "#5d628f", "#2a2d4f")}
FLAG = {"white": "#ffffff", "yellow": "#f9ab00", "green": "#34a853", "blue": "#4285f4", "red": "#ea4335", "black": "#2d2d2f"}
PEAKS = [("white", 170, 470, 240, False), ("yellow", 420, 395, 260, False), ("green", 680, 320, 280, False),
         ("blue", 935, 250, 280, True), ("red", 1180, 180, 280, True), ("black", 1405, 105, 250, True)]
NAMES = {"white": "Hello World", "yellow": "Debugger", "green": "Builder", "blue": "Shipper", "red": "Mentor", "black": "Ninja"}


def cr(pts):
    d = f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[i + 2] if i + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}"
    return d


def silhouette(x, py, hw, seed, base=HZ + 12):
    r = random.Random(seed); h = base - py; out = []
    sh_side = r.choice([-1, 1]); sh_pos = r.uniform(.45, .62); sh_amp = r.uniform(.05, .09)
    N = 16
    for side in (-1, 1):
        seq = []
        for i in range(N + 1):
            t = i / N
            prof = 1 - (t ** 0.8) * (0.55 + 0.45 * t)
            bump = sh_amp * math.exp(-((t - sh_pos) / 0.07) ** 2) if side == sh_side else 0
            jit = r.uniform(-.012, .012) if 0 < i < N else 0
            y = base - h * (prof + bump + jit)
            xx = x + side * hw * (t ** 1.02) * ((1 + r.uniform(-.03, .03)) if 0 < i < N else 1)
            seq.append((xx, min(y, base)))
        out.append(seq)
    return list(reversed(out[0])) + out[1][1:]


def snowcap(sil, py, depth, seed):
    r = random.Random(seed + 7)
    top = [p for p in sil if p[1] < py + depth]
    if len(top) < 3: return ""
    L, R = top[0], top[-1]; n = 10; edge = []
    for i in range(n + 1):
        t = i / n; xx = R[0] + (L[0] - R[0]) * t
        edge.append((xx, py + depth * r.uniform(.5, 1.0) + (16 if i % 2 else -6)))
    return cr(top + edge) + " Z"


PAINT = '''<filter id="paint" x="-5%" y="-5%" width="110%" height="110%">
<feTurbulence type="fractalNoise" baseFrequency="0.011 0.018" numOctaves="3" seed="5" result="warp"/>
<feDisplacementMap in="SourceGraphic" in2="warp" scale="16" xChannelSelector="R" yChannelSelector="G" result="shape"/>
<feTurbulence type="fractalNoise" baseFrequency="0.006 0.035" numOctaves="3" seed="9" result="streak"/>
<feColorMatrix in="streak" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.18  0 0 0 0 0.35  0 0 0 -0.55 0.32" result="streakA"/>
<feComposite in="streakA" in2="shape" operator="in" result="streakIn"/>
<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="2" result="grain"/>
<feColorMatrix in="grain" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.16 -0.02" result="grainA"/>
<feComposite in="grainA" in2="shape" operator="in" result="grainIn"/>
<feMerge><feMergeNode in="shape"/><feMergeNode in="streakIn"/><feMergeNode in="grainIn"/></feMerge>
</filter>'''


def svg(body, defs="", w=W, h=H):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs>{defs}</defs>{body}</svg>'


def mountain(pid, x, py, hw, snow):
    l, m, d = THEME[pid]; seed = sum(map(ord, pid)) * 7
    sil = silhouette(x, py, hw, seed)
    defs = (f'<linearGradient id="g-{pid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{l}"/>'
            f'<stop offset=".45" stop-color="{m}"/><stop offset="1" stop-color="{d}"/></linearGradient>'
            f'<linearGradient id="lit-{pid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".5"/>'
            f'<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>')
    r = random.Random(seed)
    g = [f'<path d="{cr(sil)} Z" fill="url(#g-{pid})"/>']
    lit = [(x, py)] + [(x - hw * (.08 + .05 * i) + r.uniform(-8, 8), py + (HZ - py) * (i / 6)) for i in range(1, 7)]
    litpts = [p for p in sil if p[0] <= x]
    g.append(f'<path d="{cr(litpts + list(reversed(lit)))} Z" fill="url(#lit-{pid})" opacity=".55"/>')
    shd = [(x, py)] + [(x + hw * (.05 + .06 * i) + r.uniform(-10, 10), py + (HZ - py) * (i / 6)) for i in range(1, 7)]
    shdpts = [p for p in sil if p[0] >= x]
    g.append(f'<path d="{cr(shd + list(reversed(shdpts)))} Z" fill="#2a2d4f" opacity=".17"/>')
    for k in range(4):
        gx = x + r.uniform(-.35, .35) * hw; gy = py + (HZ - py) * r.uniform(.25, .5)
        g.append(f'<path d="M{gx:.0f},{gy:.0f} q{r.uniform(-20,20):.0f},60 {r.uniform(-10,10):.0f},{r.uniform(90,170):.0f}" '
                 f'stroke="#fff" stroke-opacity=".2" stroke-width="6" fill="none" stroke-linecap="round"/>')
    if snow:
        sc = snowcap(sil, py, (HZ - py) * .22, seed)
        g.append(f'<path d="{sc}" fill="#c9d4ff" opacity=".45" transform="translate(7 5)"/>')
        g.append(f'<path d="{sc}" fill="#fbfbff"/>')
    return defs, "".join(g)


import mountains2
PAINT2 = '''<filter id="paint2" x="-5%" y="-5%" width="110%" height="110%">
<feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="3" seed="5" result="warp"/>
<feDisplacementMap in="SourceGraphic" in2="warp" scale="7" xChannelSelector="R" yChannelSelector="G" result="shape"/>
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="grain"/>
<feColorMatrix in="grain" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.14 -0.02" result="grainA"/>
<feComposite in="grainA" in2="shape" operator="in" result="grainIn"/>
<feMerge><feMergeNode in="shape"/><feMergeNode in="grainIn"/></feMerge></filter>'''


def peaks_layer(ids):
    defs, body = [PAINT2], []
    for pid, x, py, hw, s in sorted([p for p in PEAKS if p[0] in ids], key=lambda p: p[2]):
        d, b, _ = mountains2.mountain(pid, x, py, hw); defs.append(d); body.append(b)
    return svg(f'<g filter="url(#paint2)">{"".join(body)}</g>', "".join(defs))


def forest_layer():
    r = random.Random(77)
    far = mountains2.forest_band(r, HZ - 26, HZ - 6, 260, ["#7f8fb5", "#8d9cc0", "#7488ad"], .55)
    near = mountains2.forest_band(r, HZ - 8, HZ + 12, 220, ["#4f7f86", "#5d8f8f", "#46717c"], .8)
    return svg(far + near)


def flags_layer(ids):
    out = []
    for pid, x, py, hw, s in [p for p in PEAKS if p[0] in ids]:
        out.append(f'<g><line x1="{x}" y1="{py+2}" x2="{x}" y2="{py-40}" stroke="#3a3550" stroke-width="3" stroke-linecap="round"/>'
                   f'<path d="M{x},{py-40} Q{x+18},{py-44} {x+32},{py-33} Q{x+18},{py-27} {x},{py-25} Z" fill="{FLAG[pid]}" stroke="#3a3550" stroke-width="2"/></g>')
    return svg("".join(out))


SKY = svg('<rect width="1600" height="900" fill="url(#sky)"/><circle cx="1180" cy="330" r="300" fill="url(#sun)"/>'
          '<circle cx="1180" cy="330" r="64" fill="#fffaf0" opacity=".95" filter="url(#b)"/>',
          '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f97de"/><stop offset=".35" stop-color="#b3c3f0"/>'
          '<stop offset=".6" stop-color="#f6cde0"/><stop offset=".78" stop-color="#ffe0c6"/><stop offset="1" stop-color="#fff2e0"/></linearGradient>'
          '<radialGradient id="sun"><stop offset="0" stop-color="#fffbe9"/><stop offset=".35" stop-color="#fff0c4" stop-opacity=".9"/>'
          '<stop offset="1" stop-color="#ffd6b8" stop-opacity="0"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="6"/></filter>')

FAR = svg(f'<path d="M0,{HZ+10} L0,520 C120,480 220,500 320,470 C420,440 520,480 640,450 C760,420 880,460 1000,430 C1120,400 1250,440 1380,410 '
          f'C1480,390 1550,420 1600,400 L1600,{HZ+10} Z" fill="url(#far)" filter="url(#b)"/>',
          '<linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd2f5"/><stop offset="1" stop-color="#f5e6f3"/></linearGradient>'
          '<filter id="b"><feGaussianBlur stdDeviation="5"/></filter>')

LAKE = svg(f'<path d="M0,{HZ} C300,{HZ-4} 600,{HZ+6} 900,{HZ} C1150,{HZ-6} 1400,{HZ+4} 1600,{HZ} L1600,800 L0,800 Z" fill="url(#lake)"/>',
           '<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6e5fd"/><stop offset=".55" stop-color="#a6c3f2"/>'
           '<stop offset="1" stop-color="#84a4e2"/></linearGradient>')

HILLS = svg('<path d="M0,800 C200,760 380,790 560,770 C760,748 900,800 1100,780 C1300,760 1450,785 1600,770 L1600,900 L0,900 Z" fill="url(#h1)"/>'
            '<path d="M0,800 C200,760 380,790 560,770 C760,748 900,800 1100,780 C1300,760 1450,785 1600,770" fill="none" stroke="#e9ffd9" stroke-width="4" opacity=".7"/>'
            '<path d="M0,852 C160,822 300,847 470,832 C650,817 820,862 1000,847 C1200,832 1400,862 1600,837 L1600,900 L0,900 Z" fill="url(#h2)"/>'
            + "".join(f'<circle cx="{i}" cy="{812+12*math.sin(i/90):.0f}" r="2.8" fill="#fff8e6" opacity=".9"/>' for i in range(0, 1600, 26)),
            PAINT + '<linearGradient id="h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c6efb6"/><stop offset="1" stop-color="#82cf98"/></linearGradient>'
            '<linearGradient id="h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5e0ae"/><stop offset="1" stop-color="#58b08f"/></linearGradient>')
HILLS = HILLS.replace('<path d="M0,800 C200', '<g filter="url(#paint)"><path d="M0,800 C200', 1).replace('</svg>', '</g></svg>')

TREE = svg('<rect x="57" y="140" width="10" height="24" rx="3" fill="#5b4a5e"/>'
           '<path d="M62,6 C80,40 104,80 106,112 C108,140 84,150 62,150 C40,150 16,140 18,112 C20,80 44,40 62,6Z" fill="#2f7f6f"/>'
           '<path d="M62,6 C52,44 40,84 38,120 Q44,128 52,126 C50,86 54,44 62,6Z" fill="#ffffff" opacity=".2"/>'
           '<path d="M62,60 C78,80 92,104 96,128" stroke="#1f5f55" stroke-width="5" fill="none" opacity=".4" stroke-linecap="round"/>', "", 124, 166)

TUFT = svg('<g fill="none" stroke-linecap="round" stroke-width="4">'
           '<path d="M30,60 Q26,30 10,8" stroke="#4fa37d"/><path d="M34,60 Q36,26 40,2" stroke="#5fbf8c"/>'
           '<path d="M38,60 Q46,34 62,14" stroke="#4fa37d"/><path d="M32,60 Q20,40 2,32" stroke="#6ccf98"/>'
           '<path d="M40,60 Q54,44 70,40" stroke="#6ccf98"/></g>'
           '<circle cx="40" cy="4" r="4" fill="#ffd6e8"/><circle cx="10" cy="8" r="3.5" fill="#fff3a8"/>', "", 72, 64)


def ninja(base, accs):
    s = open(f'/home/claude/acc/ninja-{base}.svg').read()
    inner = s[s.index('>') + 1: s.rindex('</svg>')]
    for a in accs:
        t = open(f'/home/claude/acc/acc-{a}.svg').read(); inner += t[t.index('>') + 1: t.rindex('</svg>')]
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="345" height="325" viewBox="112 50 690 650">{inner}</svg>'


import props
layers = {
    "far": FAR, "back": peaks_layer({"black", "red", "blue"}), "front": peaks_layer({"green", "yellow", "white"}),
    "flagsBack": flags_layer({"black", "red", "blue"}), "flagsFront": flags_layer({"green", "yellow", "white"}), "forest": forest_layer(), "lake": LAKE, "hills": HILLS,
    "nAmina": ninja("green", ["beanie", "glasses"]), "nSofia": ninja("blue", ["glasses"]), "nLucas": ninja("red", ["crown"]),
    "nInes": ninja("yellow", ["flower"]), "nKarim": ninja("white", ["party"]),
}
layers.update(props.PROPS)
peaks_meta = [{"id": p, "x": x, "y": py, "name": NAMES[p]} for p, x, py, hw, s in PEAKS]

tpl = open('/home/claude/world/world_template.html').read()
pixi = sys.argv[1] if len(sys.argv) > 1 else "https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.js"
html = (tpl.replace("__PIXI__", pixi).replace("__LAYERS__", json.dumps(layers)).replace("__PEAKS__", json.dumps(peaks_meta)))
open(sys.argv[2] if len(sys.argv) > 2 else '/home/claude/world/ninja-world.html', 'w').write(html)
print(len(html) // 1024, "KB")


# ---------- reusable world module data (assets/world/world-data.js) ----------
def _inner(path):
    s = open(path).read(); return s[s.index('>') + 1: s.rindex('</svg>')]

NINJA_PARTS = {r: _inner(f'/home/claude/acc/ninja-{r}.svg') for r in ["white", "yellow", "green", "blue", "red", "black"]}
ACC_PARTS = {a: _inner(f'/home/claude/acc/acc-{a}.svg') for a in
             ["beanie", "cap", "party", "catears", "headphones", "glasses", "flower", "mustache", "beard", "shades", "halo", "crown"]}
WORLD_KEYS = ["far", "back", "front", "flagsBack", "flagsFront", "forest", "lake", "hills",
              "sky_dawn", "sky_day", "sky_evening", "sky_night",
              "pine0", "pine1", "pine2", "broad", "sakura", "grass0", "grass1", "grass2", "daisy", "bell",
              "fish", "mermaid", "tail", "boat", "oar", "raft", "bird", "moon"]
world_data = {
    "layers": {k: layers[k] for k in WORLD_KEYS},
    "ninja": {"viewBox": "112 50 690 650", "w": 345, "h": 325, "bases": NINJA_PARTS, "accessories": ACC_PARTS},
    "peaks": [{"id": p, "x": x, "y": py, "hw": hw, "name": NAMES[p], "back": p in ("blue", "red", "black")} for p, x, py, hw, s in PEAKS],
}
_out = sys.argv[3] if len(sys.argv) > 3 else '/home/claude/world/world-data.js'
open(_out, 'w').write("/* Generated by tools/layers.py: the painted layers, props and ninja parts for Ninja World. */\nwindow.NW_DATA = " + json.dumps(world_data) + ";\n")
print("world-data", os.path.getsize(_out) // 1024, "KB")
