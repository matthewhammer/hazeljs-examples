#!/usr/bin/env python3
"""hazeljs-oracles: the I Ching's Hazel, compiled ahead of time, as i-ching/compiled.js (a prototype; ticket 765, and the
Hazel reports' report 54, "Compiled ahead of time, for older phones").

hazel-jit (Hazel's prototype compiler to JavaScript, on hazelgrove/hazel's trial/694-view-jit line) compiles the I Ching's
program as hazeljs joins it: the preamble, `module Name = { body } in` for each module, then the page's tail
`(cast = Casting.cast, reading = Reading.reading)`. A test on hazelgrove/hazel's branch trial/765-iching-aot prints that
compiled program to CI's log; this wraps it, with hazel-jit's runtime from the same commit, into one file the page loads
instead of hazeljs (2.8 MB) and its build of the program.

Values cross by the functions' declared types: hazeljs gives and takes a constructor as {tag}, a list as an array and a
labeled tuple as an object; hazel-jit's code has {c}, a chain of {h, t} cells, and an array carrying its labels.

  python3 tools/make-compiled.py --hazel ~/hazel-694-merge --commit 50e4f69171 --src compiled-src.js
"""
import argparse, os, subprocess

ap = argparse.ArgumentParser()
ap.add_argument("--hazel", required=True, help="a checkout of hazelgrove/hazel with the commit")
ap.add_argument("--commit", required=True, help="the commit whose hazel-jit compiled the program")
ap.add_argument("--src", required=True, help="the compiled program, as the test printed it (a function body of $R)")
ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "i-ching", "compiled.js"))
a = ap.parse_args()

jit = subprocess.run(["git", "-C", a.hazel, "show", f"{a.commit}:src/language/dynamics/HazelJit.re"], capture_output=True, text=True, check=True).stdout
i = jit.index("let source = {|") + len("let source = {|")
runtime = jit[i:jit.index("|};", i)]
src = open(a.src).read().strip()
assert "HAZEL-JIT" not in src and src, "the compiled program, between the markers only"

out = f"""// hazeljs-oracles, the I Ching: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel {a.commit} (trial/765-iching-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// A prototype (ticket 765): with ?compiled in its address, the page casts and reads through this file instead of loading
// hazeljs and building the program. The same answers are checked by node/compare-compiled.mjs.
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
  const trigram = t => ({{ number: int(t.number), name: t.name, image: t.image }});
  const hexagram = h => ({{ number: int(h.number), name: h.name }});
  // cast : (Method, Float, Float, Float) -> Cast, a Cast being (line = Line, value = Int, counts = [Int])
  const cast = (m, a, b, c) => {{
    const r = P.cast([{{ c: m.tag }}, a, b, c]);
    return {{ line: {{ tag: r.line.c }}, value: int(r.value), counts: array(r.counts).map(int) }};
  }};
  // reading : [Line] -> Reading
  const reading = ls => {{
    const r = P.reading(list(ls.map(l => ({{ c: l.tag }}))));
    return {{ cast: int(r.cast), lower: trigram(r.lower), upper: trigram(r.upper), primary: hexagram(r.primary),
             changing: array(r.changing).map(int), relating: hexagram(r.relating) }};
  }};
  const made = "{a.commit}";
  const api = {{ cast, reading, made }};
  if (typeof window !== "undefined") window.IChingCompiled = api;
  if (typeof module !== "undefined") module.exports = api;
}})();
"""
open(a.out, "w").write(out)
print(f"wrote {a.out}: {len(out) // 1024} kB, from {a.commit}")
