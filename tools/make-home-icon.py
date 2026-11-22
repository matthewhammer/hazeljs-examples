#!/usr/bin/env python3
"""hazeljs-examples: the front page's own icon (0.0.45), for one home-screen app that holds every activity. Nine of the
apps' own icons in a 3 by 3 grid, as a phone shows a folder of apps: icons/icon.svg (a rounded square, for "any"),
icons/icon-maskable.svg (the whole square, the grid inside the safe circle a launcher may cut it to), and the PNGs a
manifest and an iPhone want, drawn from them by ffmpeg's librsvg (no browser on this laptop):
icons/icon-512.png, icon-192.png, icon-32.png, icon-maskable-512.png, apple-touch-icon.png (180).
  python3 tools/make-home-icon.py"""
import os, re, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPS = ["i-ching", "tarot", "astrology", "solitaire", "minesweeper", "pinball", "go", "checkers", "mahjong"]
BG = "#22304a"


def inner(app, k):
    """an app's icon as a nested <svg>, its ids made its own (two icons may both say id="g")"""
    s = open(os.path.join(ROOT, app, "icons", "icon.svg")).read()
    s = re.sub(r"<\?xml[^>]*\?>", "", s).strip()
    ids = set(re.findall(r'id="([^"]+)"', s))
    for i in sorted(ids, key=len, reverse=True):
        s = re.sub(r'id="%s"' % re.escape(i), 'id="a%d-%s"' % (k, i), s)
        s = re.sub(r"url\(#%s\)" % re.escape(i), "url(#a%d-%s)" % (k, i), s)
        s = re.sub(r'href="#%s"' % re.escape(i), 'href="#a%d-%s"' % (k, i), s)
    body = re.sub(r"^<svg[^>]*>", "", s); body = re.sub(r"</svg>\s*$", "", body)
    return body


def grid(size, x0, y0, gap):
    """the nine icons, each size by size, from (x0, y0), gap apart"""
    out = []
    for k, app in enumerate(APPS):
        x, y = x0 + (k % 3) * (size + gap), y0 + (k // 3) * (size + gap)
        out.append('<svg x="%g" y="%g" width="%g" height="%g" viewBox="0 0 512 512">%s</svg>' % (x, y, size, size, inner(app, k)))
    return "".join(out)


def icon(full, span):
    """full: the background to the edges (maskable, an iPhone's); else a rounded square. span: the grid's width"""
    gap = span * 0.045
    size = (span - 2 * gap) / 3
    x0 = (512 - span) / 2
    back = '<rect width="512" height="512" fill="%s"/>' % BG if full else '<rect x="8" y="8" width="496" height="496" rx="96" fill="%s"/>' % BG
    return ('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512">'
            + back + grid(size, x0, x0, gap) + "</svg>\n")


def png(svg_path, px, out):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-width", str(px), "-height", str(px), "-i", svg_path,
                    os.path.join(ROOT, "icons", out)], check=True)


os.makedirs(os.path.join(ROOT, "icons"), exist_ok=True)
anyIcon, mask = os.path.join(ROOT, "icons", "icon.svg"), os.path.join(ROOT, "icons", "icon-maskable.svg")
open(anyIcon, "w").write(icon(False, 430))
# (a launcher may cut a maskable icon to a circle of 80% of its width: the grid's corners inside it, 290 wide)
open(mask, "w").write(icon(True, 290))
with tempfile.TemporaryDirectory() as t:
    # (an iPhone rounds its own corners and cuts nothing else: the whole square, the grid larger)
    apple = os.path.join(t, "apple.svg"); open(apple, "w").write(icon(True, 410))
    for px, out in ((512, "icon-512.png"), (192, "icon-192.png"), (32, "icon-32.png")): png(anyIcon, px, out)
    png(mask, 512, "icon-maskable-512.png")
    png(apple, 180, "apple-touch-icon.png")
for f in sorted(os.listdir(os.path.join(ROOT, "icons"))): print(f, os.path.getsize(os.path.join(ROOT, "icons", f)))
