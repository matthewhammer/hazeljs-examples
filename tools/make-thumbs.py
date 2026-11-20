"""hazeljs-examples: each activity's card thumbnail, <app>/icons/card-light.svg and card-dark.svg, 320 by 200 as the Hazel
reports' thumbnails are (matthewhammer.org/hazel/reports/), for the list of activities on matthewhammer.org/hazel/: the
app's icon (<app>/icons/icon.svg), drawn in, beside its name and what it does. Run it again when an icon or a line changes:

  python3 tools/make-thumbs.py
"""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = {
  "i-ching": ("I Ching", "an ancient oracle, cast in Hazel", ["six lines, by three coins", "or the yarrow stalks;", "the hexagram, its changing", "lines, and the one they make"]),
  "tarot": ("Tarot", "an ancient oracle, dealt in Hazel", ["78 cards, shuffled and", "dealt into a spread,", "turned one at a time,", "simple or woodcut faces"]),
  "astrology": ("Astrology", "an ancient oracle, charted in Hazel", ["a birth chart: the Sun,", "the Moon and the planets,", "the rising sign, the houses;", "today's sky against it"]),
  "solitaire": ("Solitaire", "a one-player game, its rules in Hazel", ["Klondike: the deal,", "every legal move, and", "the win, all in Hazel;", "drag or tap to play"]),
  "minesweeper": ("Minesweeper", "a one-player game, its rules in Hazel", ["the mines laid after", "the first tap, the counts,", "the empty cells flooding", "open, flags and chords"]),
  "go": ("Go", "against an opponent written in Hazel", ["7 by 7 or 9 by 9: the", "captures, the ko and", "the score in Hazel, and", "Hazel's choice of move"]),
  "checkers": ("Checkers", "against an opponent written in Hazel", ["the moves, the jumps", "(compulsory, and on while", "they can), the kings, and", "Hazel's look-ahead"]),
}
LIGHT = ".h{fill:#1f2328;font:700 15px system-ui,sans-serif}.m{fill:#5b6470;font:10px system-ui,sans-serif}.k{fill:#1f2328;font:11px system-ui,sans-serif}"
DARK = ".h{fill:#e8e6e3}.m{fill:#a2a9b3}.k{fill:#e8e6e3}"

def card(app, dark):
    name, sub, lines = APPS[app]
    icon = (ROOT / app / "icons" / "icon.svg").read_text()
    inner = re.sub(r"<title>.*?</title>", "", icon[icon.index(">", icon.index("<svg")) + 1:icon.rindex("</svg>")], flags=re.S)
    text = "\n".join(f'<text class="k" x="164" y="{84 + 22 * i}">{t}</text>' for i, t in enumerate(lines))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
<style>{LIGHT}{chr(10) + DARK if dark else ""}
</style>
<text class="h" x="16" y="26">{name}</text>
<text class="m" x="16" y="42">{sub}</text>
<svg x="16" y="56" width="132" height="132" viewBox="0 0 512 512"><clipPath id="round"><rect width="512" height="512" rx="88"/></clipPath><g clip-path="url(#round)">{inner}</g></svg>
{text}
</svg>
'''

for app in APPS:
    if not (ROOT / app / "icons" / "icon.svg").exists():
        continue
    for dark in (False, True):
        (ROOT / app / "icons" / f"card-{'dark' if dark else 'light'}.svg").write_text(card(app, dark))
    print(app)
