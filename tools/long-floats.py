#!/usr/bin/env python3
"""hazeljs-oracles, astrology: every float literal with more than six decimal places, outside comments, written as a ratio of
whole numbers, 280.46061837 as (28046061837. /. 100000000.), the same number. Until hazelgrove/hazel#2831: Hazel prints a
float literal to six decimal places, so its fast parser gives up on a longer one, and the slow parse of a whole program
of these rules runs out of memory. A whole-number float prints back exactly.

  python3 tools/long-floats.py astrology/rules/*.hz      (rewrites the files in place)
"""
import re, sys
LIT = re.compile(r"(?<![\w.])(\d+)\.(\d{7,})(?![\w.])")
def ratio(m):
    whole, frac = m.group(1), m.group(2)
    num = (whole + frac).lstrip("0") or "0"
    return f"({num}. /. 1{'0' * len(frac)}.)"
for path in sys.argv[1:]:
    s = open(path).read()
    parts = s.split("#")
    n = 0
    for i in range(0, len(parts), 2):          # outside comments: the even parts
        parts[i], k = LIT.subn(ratio, parts[i])
        n += k
    open(path, "w").write("#".join(parts))
    print(f"{path}: {n} literals")
