#!/usr/bin/env python3
"""hazeljs-oracles: an oracle's Hazel, compiled ahead of time, as <app>/compiled.js (ticket 765, and the Hazel reports'
report 54, "Compiled ahead of time, for older phones"): the I Ching's since 0.0.11, the Tarot's since 0.0.13.

hazel-jit (Hazel's prototype compiler to JavaScript, on hazelgrove/hazel's trial/694-view-jit line) compiles the oracle's
program as hazeljs joins it: the preamble, `module Name = { body } in` for each module, then the page's tail (the I
Ching's `(cast = Casting.cast, reading = Reading.reading)`, the Tarot's `(deal = Reading.deal)`). Tests on hazelgrove/hazel's
branch trial/765-iching-aot print each compiled program to CI's log; this wraps one, with hazel-jit's runtime from the
same commit, into one file the page loads instead of hazeljs (2.8 MB) and its build of the program.

Values cross by the functions' declared types: hazeljs gives and takes a constructor as {tag}, a list as an array and a
labeled tuple as an object; hazel-jit's code has {c}, a chain of {h, t} cells, and an array carrying its labels.

  python3 tools/make-compiled.py --app i-ching --hazel ~/hazel-694-merge --commit a4633af773 --src iching-src.js
  python3 tools/make-compiled.py --app tarot --hazel ~/hazel-694-merge --commit 760ce2cf67 --src tarot-src.js
"""
import argparse, os, subprocess

ap = argparse.ArgumentParser()
ap.add_argument("--app", default="i-ching", choices=["i-ching", "tarot"])
ap.add_argument("--hazel", required=True, help="a checkout of hazelgrove/hazel with the commit")
ap.add_argument("--commit", required=True, help="the commit whose hazel-jit compiled the program")
ap.add_argument("--src", required=True, help="the compiled program, as the test printed it (a function body of $R)")
ap.add_argument("--out", default=None, help="default: <app>/compiled.js")
a = ap.parse_args()
a.out = a.out or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), a.app, "compiled.js")

# ---- each oracle's functions, hazeljs's values in and out (hazeljs: a constructor {tag, value}, a list an array, a labeled
# tuple an object; hazel-jit: {c, v}, {h, t} cells, an array carrying its labels), written from the declared types
ADAPTERS = {
  "i-ching": ("IChingCompiled", """
  const trigram = t => ({ number: int(t.number), name: t.name, image: t.image });
  const hexagram = h => ({ number: int(h.number), name: h.name });
  // cast : (Method, Float, Float, Float) -> Cast, a Cast being (line = Line, value = Int, counts = [Int])
  const cast = (m, a, b, c) => {
    const r = P.cast([{ c: m.tag }, a, b, c]);
    return { line: { tag: r.line.c }, value: int(r.value), counts: array(r.counts).map(int) };
  };
  // reading : [Line] -> Reading
  const reading = ls => {
    const r = P.reading(list(ls.map(l => ({ c: l.tag }))));
    return { cast: int(r.cast), lower: trigram(r.lower), upper: trigram(r.upper), primary: hexagram(r.primary),
             changing: array(r.changing).map(int), relating: hexagram(r.relating) };
  };
  const api = { cast, reading, made };"""),
  "tarot": ("TarotCompiled", """
  // Spread = + One + Three(Trio) + CelticCross + Relationship + Choice(Int) + YearAhead(Year), Year = (start = Int, theme = Bool)
  const spread = s => s.tag === "Three" ? { c: "Three", v: { c: s.value.tag } }
    : s.tag === "Choice" ? { c: "Choice", v: s.value }
    : s.tag === "YearAhead" ? { c: "YearAhead", v: $R.tup([s.value.start, s.value.theme], ["start", "theme"]) }
    : { c: s.tag };
  // Card = + Major(Int) + Minor(Suit, Int)
  const card = c => c.c === "Major" ? { tag: "Major", value: int(c.v) } : { tag: "Minor", value: [{ tag: c.v[0].c }, int(c.v[1])] };
  // deal : (Spread, [Float], Bool) -> [Dealt], a Dealt being (card = Card, name = String, reversed = Bool, position = String, about = String)
  const deal = (s, us, reversals) => array(P.deal([spread(s), list(us), reversals]))
    .map(d => ({ card: card(d.card), name: d.name, reversed: d.reversed, position: d.position, about: d.about }));
  const api = { deal, made };"""),
}
GLOBAL, ADAPT = ADAPTERS[a.app]
TITLE = {"i-ching": "the I Ching", "tarot": "the Tarot"}[a.app]

jit = subprocess.run(["git", "-C", a.hazel, "show", f"{a.commit}:src/language/dynamics/HazelJit.re"], capture_output=True, text=True, check=True).stdout
i = jit.index("let source = {|") + len("let source = {|")
runtime = jit[i:jit.index("|};", i)]
src = open(a.src).read().strip()
assert "HAZEL-JIT" not in src and src, "the compiled program, between the markers only"

out = f"""// hazeljs-oracles, {TITLE}: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel {a.commit} (trial/765-iching-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// (ticket 765) The page runs its rules through this file instead of loading hazeljs and building the program, unless asked
// for interpreted (?interpreted=1) or the rules are edited. The same answers are checked by node/compare-compiled.mjs.
(() => {{
  "use strict";
  const $R = ({runtime});
  const P = (function ($R) {{
{src}
  }})($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => {{ let r = null; for (let i = xs.length - 1; i >= 0; i--) r = {{ h: xs[i], t: r }}; return r; }};
  const array = l => {{ const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; }};
  const int = n => Number(n);
  const made = "{a.commit}";{ADAPT}
  if (typeof window !== "undefined") window.{GLOBAL} = api;
  if (typeof module !== "undefined") module.exports = api;
}})();
"""
open(a.out, "w").write(out)
print(f"wrote {a.out}: {len(out) // 1024} kB, from {a.commit}")
