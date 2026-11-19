#!/usr/bin/env python3
"""hazeljs-examples, astrology (ticket 768): the Sky module's tables, written as Hazel from astronomia's source
(https://github.com/commenthol/astronomia, MIT; Sonia Keys's port of Jean Meeus's Astronomical Algorithms): the Moon's
periodic terms in longitude (src/moonposition.js, ta; Meeus Table 47.A), Pluto's (src/pluto.js, t37; Meeus Table 37.A),
and the planets' mean orbital elements of date (src/planetelements.js, cMean; Meeus Table 31.A). Prints Hazel, for
astrology/rules/Sky.hz between its "tables" markers.

  python3 tools/make-sky-tables.py <astronomia/src>
"""
import re, sys
src = sys.argv[1].rstrip("/")
num = r"-?\d+(?:\.\d+)?(?:e-?\d+)?"
def fl(x):
    s = x if ("." in x or "e" in x) else x + "."
    return s if not s.startswith(".") else "0" + s

# the Moon: rows [d, m, m', f, Σl, Σr]
moon = open(f"{src}/moonposition.js").read()
block = moon[moon.index("const ta = (function"):moon.index("})()", moon.index("const ta = (function"))]
rows = re.findall(r"\[\s*(" + num + r")\s*,\s*(" + num + r")\s*,\s*(" + num + r")\s*,\s*(" + num + r")\s*,\s*(" + num + r")\s*,\s*(" + num + r")\s*\]", block)
assert len(rows) == 60, len(rows)
out = ["# The Moon's periodic terms in longitude: multiples of D, M, M', F, and the term in millionths of a degree (Meeus Table 47.A, from astronomia's src/moonposition.js) #",
       "let moon_terms : [(Int, Int, Int, Int, Float)] = ["]
out.append(",\n".join(f"  ({d}, {m}, {mp}, {f}, {fl(sl)})" for d, m, mp, f, sl, sr in rows))
out[-1] += "\n];"

# Pluto: Pt(i, j, k, lA, lB, bA, bB, rA, rB)
pl = open(f"{src}/pluto.js").read()
pts = re.findall(r"new Pt\(\s*" + r"\s*,\s*".join(["(" + num + ")"] * 9) + r"\s*\)", pl)
assert len(pts) == 43, len(pts)
out.append("# Pluto's periodic terms: multiples of J, S, P, and the terms in longitude, latitude (degrees) and distance (AU), sine and cosine (Meeus Table 37.A, from astronomia's src/pluto.js) #")
out.append("let pluto_terms : [(Int, Int, Int, Float, Float, Float, Float, Float, Float)] = [")
out.append(",\n".join("  (" + ", ".join(p[:3]) + ", " + ", ".join(fl(x) for x in p[3:]) + ")" for p in pts))
out[-1] += "\n];"

# the planets' mean elements of date: L, a, e, i, Ω, ϖ, polynomials in T
pe = open(f"{src}/planetelements.js").read()
names = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"]
out.append("# The planets' mean orbital elements of date, each a polynomial in Julian centuries from J2000.0: mean longitude, semi-major axis (AU), eccentricity, inclination, ascending node, longitude of perihelion (degrees) (Meeus Table 31.A, from astronomia's src/planetelements.js) #")
out.append("let elements : Body -> ([Float], [Float], [Float], [Float], [Float], [Float]) = fun b ->\n  case b")
for n in names:
    a = pe.index(f"  {n}: {{"); z = pe.index("}", a)
    body = pe[a:z]
    def get(key):
        m = re.search(key + r":\s*(\[[^\]]*\]|undefined)", body)
        v = m.group(1)
        if v == "undefined": return "[0.]"
        return "[" + ", ".join(fl(x) for x in re.findall(num, v)) + "]"
    tag = "Sun" if n == "earth" else n.capitalize()   # (the Earth's elements, under the Sun's name: the Sun is where the Earth is not)
    out.append(f"  | {tag} => ({get('L')}, {get('a')}, {get('e')}, {get('i')}, {get('Ω')}, {get('ϖ')})")
out.append("  | _ => ([0.], [0.], [0.], [0.], [0.], [0.])\n  end;")
print("\n".join(out))
