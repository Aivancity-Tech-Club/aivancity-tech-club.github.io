#!/usr/bin/env python3
"""Make a Tech Club styled QR code (SVG), free and offline.

    pip install segno
    python3 tools/make_qr.py https://aivancity-tech-club.github.io/schedule assets/qr/schedule.svg
    python3 tools/make_qr.py https://aivancity-tech-club.github.io/schedule assets/qr/schedule-light.svg --light

Style: light-blue modules drawn as rounded pills on navy, square finder rings with a
star centre, the ninja logo in the middle, inside a rounded light-blue frame.
Error correction is set to H (30%), so the logo in the centre doesn't stop phones reading it.
The default (light pills on navy) is an "inverted" QR code: recent iPhone and Android cameras
read it, but some older scanner apps don't. --light makes the same design in standard colours
(navy on light), which every scanner reads: the safer choice for print.
Always test a new code with an iPhone and an Android phone before printing.
"""
import base64
import math
import pathlib
import sys

import segno

NAVY = "#2b3767"
CYAN = "#6ee6fb"
M = 20            # one module, in SVG units
QUIET = 3         # navy margin around the code, in modules
FRAME = 1.6       # light-blue frame thickness, in modules
LOGO_R = 5.6      # radius of the cleared centre, in modules
ROOT = pathlib.Path(__file__).resolve().parent.parent
LOGO = ROOT / "assets" / "ninjas" / "ninja-black.svg"


def star(cx, cy, r_out, r_in, spikes=18):
    pts = []
    for i in range(spikes * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.pi * i / spikes - math.pi / 2
        pts.append(f"{cx + r * math.cos(a):.2f},{cy + r * math.sin(a):.2f}")
    return f'<polygon points="{" ".join(pts)}"/>'


def build(url: str, light: bool = False) -> str:
    bg, fg = ("#f1fcff", NAVY) if light else (NAVY, CYAN)
    frame = NAVY if light else CYAN
    qr = segno.make(url, error="h", micro=False)
    grid = [list(row) for row in qr.matrix]
    n = len(grid)
    off = (FRAME + QUIET) * M              # where module (0,0) starts
    size = (n + 2 * QUIET + 2 * FRAME) * M
    c = n / 2                              # code centre, in modules

    def in_finder(r, col):
        return (r < 7 and col < 7) or (r < 7 and col >= n - 7) or (r >= n - 7 and col < 7)

    def in_logo(r, col):
        return math.hypot(col + 0.5 - c, r + 0.5 - c) < LOGO_R

    # alignment patterns (5x5), from the QR standard's table for versions 1-10
    table = {1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38],
             8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]}
    pos = table.get(qr.version)
    if pos is None:
        sys.exit("URL too long for this style (QR version > 10): use a shorter link.")
    align = [(r, col) for r in pos for col in pos
             if not in_finder(r - 2, col - 2) and not in_finder(r + 2, col + 2) and not in_finder(r - 2, col + 2) and not in_finder(r + 2, col - 2)
             and not in_logo(r, col)]

    def in_align(r, col):
        return any(abs(r - ar) <= 2 and abs(col - ac) <= 2 for ar, ac in align)

    parts = []
    h, rx = 0.8 * M, 0.4 * M
    for r in range(n):
        col = 0
        while col < n:
            if grid[r][col] and not in_finder(r, col) and not in_align(r, col) and not in_logo(r, col):
                start = col
                while col + 1 < n and grid[r][col + 1] and not in_finder(r, col + 1) and not in_align(r, col + 1) and not in_logo(r, col + 1):
                    col += 1
                x = off + start * M + 0.1 * M
                y = off + r * M + 0.1 * M
                w = (col - start + 1) * M - 0.2 * M
                parts.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx:.1f}"/>')
            col += 1

    # finder patterns: square ring + star centre
    for fr, fc in ((0, 0), (0, n - 7), (n - 7, 0)):
        x, y = off + fc * M, off + fr * M
        parts.append(f'<path fill-rule="evenodd" d="M{x},{y}h{7*M}v{7*M}h{-7*M}z M{x+M},{y+M}v{5*M}h{5*M}v{-5*M}z"/>')
        parts.append(star(x + 3.5 * M, y + 3.5 * M, 1.62 * M, 1.3 * M))
    # alignment patterns: small rounded ring + dot
    for ar, ac in align:
        x, y = off + (ac - 2) * M, off + (ar - 2) * M
        parts.append(f'<path fill-rule="evenodd" d="M{x+M},{y}h{3*M}a{M},{M} 0 0 1 {M},{M}v{3*M}a{M},{M} 0 0 1 {-M},{M}h{-3*M}a{M},{M} 0 0 1 {-M},{-M}v{-3*M}a{M},{M} 0 0 1 {M},{-M}z '
                     f'M{x+M},{y+M}v{3*M}h{3*M}v{-3*M}z"/>')
        parts.append(f'<circle cx="{x+2.5*M}" cy="{y+2.5*M}" r="{0.55*M}"/>')

    logo = base64.b64encode(LOGO.read_bytes()).decode()
    lw = 2 * LOGO_R * M * 1.22
    lx = off + c * M - lw / 2
    ly = off + c * M - lw / 2 * (650 / 690)
    outer_r, inner_r = 2.4 * M, 1.6 * M
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size:.0f} {size:.0f}" width="{size:.0f}" height="{size:.0f}" role="img" aria-label="QR code: {url}">
<rect width="{size:.0f}" height="{size:.0f}" rx="{outer_r:.0f}" fill="{frame}"/>
<rect x="{FRAME*M:.0f}" y="{FRAME*M:.0f}" width="{size-2*FRAME*M:.0f}" height="{size-2*FRAME*M:.0f}" rx="{inner_r:.0f}" fill="{bg}"/>
<g fill="{fg}">
{chr(10).join(parts)}
</g>
<image href="data:image/svg+xml;base64,{logo}" x="{lx:.1f}" y="{ly:.1f}" width="{lw:.1f}" height="{lw*650/690:.1f}"/>
</svg>
'''


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        sys.exit(__doc__)
    out = pathlib.Path(args[1])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build(args[0], light="--light" in sys.argv))
    print("wrote", out)
