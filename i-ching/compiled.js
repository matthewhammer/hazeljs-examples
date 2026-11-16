// hazeljs-oracles, the I Ching: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel a4633af773 (trial/765-iching-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// A prototype (ticket 765): with ?compiled in its address, the page casts and reads through this file instead of loading
// hazeljs and building the program. The same answers are checked by node/compare-compiled.mjs.
(() => {
  "use strict";
  const $R = ({
  append(a, b) { if (a === null) return b; const xs = []; for (let p = a; p !== null; p = p.t) xs.push(p.h);
    let r = b; for (let i = xs.length - 1; i >= 0; i--) r = {h: xs[i], t: r}; return r; },
  tup(vs, ls) { for (let i = 0; i < ls.length; i++) if (ls[i] !== null) vs[ls[i]] = vs[i]; return vs; },
  /* (^ticket(761)) a tuple's labels by index, null where unlabeled, read as HazelJitValue.of_tuple reads them: each
     property that is not an index labels the first unlabeled index holding the very same value */
  labels(t) {
    const ls = t.map(() => null);
    for (const k of Object.keys(t)) { if (/^[0-9]+$/.test(k)) continue;
      const i = ls.findIndex((x, j) => x === null && t[j] === t[k]); if (i >= 0) ls[i] = k; }
    return ls;
  },
  /* (^ticket(761)) a tuple extended, e1 ... e2, as LabeledTuple.extension: e1's components in order, a label e2 also has
     taking e2's value; then e2's unlabeled components and its labels e1 lacks. Not tuples: the interpreter's is stuck. */
  ext(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) this.indet("a tuple extension of something not a tuple");
    const la = this.labels(a), lb = this.labels(b), by = new Map(), vs = [], ls = [];
    lb.forEach((l, i) => { if (l !== null) by.set(l, b[i]); });
    la.forEach((l, i) => { vs.push(l !== null && by.has(l) ? by.get(l) : a[i]); ls.push(l); });
    lb.forEach((l, i) => { if (l === null || !la.includes(l)) { vs.push(b[i]); ls.push(l); } });
    return this.tup(vs, ls);
  },
  eq(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a)) { if (!Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!this.eq(a[i], b[i])) return false; return true; }
    if ("c" in a) return ("c" in b) && a.c === b.c && this.eq(a.v, b.v);
    let p = a, q = b;
    while (p !== null && q !== null) { if (!this.eq(p.h, q.h)) return false; p = p.t; q = q.t; }
    return p === q;
  },
  nomatch(where) { throw new Error("hazel-jit: no pattern matched in " + where); },
  /* (^ticket(757)) Int and Nat, exact as the interpreter's Bigint: a JS number while it is a safe integer, a BigInt past
     that; each result normalized (inorm), so equal values are one value and === compares them. Measured in Node against
     plain numbers: fib x1.6, list walks x0.7-0.9, arithmetic-heavy updates x3.7 (plain BigInt: x4.1, x1.5, x9.6) */
  inorm(r) { return r <= 9007199254740991n && r >= -9007199254740991n ? Number(r) : r; },
  iadd(a, b) { if (typeof a === "number" && typeof b === "number") { const r = a + b; if (r <= 9007199254740991 && r >= -9007199254740991) return r; } return this.inorm(BigInt(a) + BigInt(b)); },
  isub(a, b) { if (typeof a === "number" && typeof b === "number") { const r = a - b; if (r <= 9007199254740991 && r >= -9007199254740991) return r; } return this.inorm(BigInt(a) - BigInt(b)); },
  imul(a, b) { if (typeof a === "number" && typeof b === "number") { const r = a * b; if (r <= 9007199254740991 && r >= -9007199254740991) return r; } return this.inorm(BigInt(a) * BigInt(b)); },
  ineg(a) { return typeof a === "number" ? (a === 0 ? 0 : -a) : this.inorm(-a); },
  /* toward zero, as Bigint's and BigInt's; (a - a % b) / b is exact where Math.trunc(a / b) rounds */
  idiv(a, b) { if (b === 0 || b === 0n) this.invalid("DivideByZero"); if (typeof a === "number" && typeof b === "number") return (a - a % b) / b; return this.inorm(BigInt(a) / BigInt(b)); },
  ipow(a, b) { if (b < 0) this.invalid("NegativeExponent"); return this.inorm(BigInt(a) ** BigInt(b)); },
  /* An operation the interpreter stops at with an error (Error: Divide by Zero, a stuck term): the compiled run stops
     too, and its caller falls back to the interpreter, which makes the stuck term (^ticket(759)) */
  invalid(err) { const e = new Error("hazel-jit: invalid operation: " + err); e.$invalid = err; throw e; },
  /* (^ticket(761)) undefined, reached: the interpreter's result is indeterminate there, so the compiled run stops and its
     caller falls back to the interpreter, as for an invalid operation. Not reached (List.head's empty case, on a list
     with a head), it costs nothing. */
  indet(what) { const e = new Error("hazel-jit: indeterminate: " + what); e.$indet = what; throw e; },
  /* (^ticket(758); Matthew, 2026-11-16: "Yes, 32 bits") An SInt has 32 bits, as in the interpreter (Atom.sint_fits): a
     result outside [-2^31, 2^31 - 1] stops the run at IntegerOverflow, where the interpreter's run is stuck at it. Exact for
     32-bit operands' sums; a product past 2^53 is not exact, but surely outside. (-0 is 0, as an int has no -0.) */
  s32(r) { if (r > 2147483647 || r < -2147483648) this.invalid("IntegerOverflow"); return r === 0 ? 0 : r; },
  sadd(a, b) { return this.s32(a + b); }, ssub(a, b) { return this.s32(a - b); },
  smul(a, b) { return this.s32(a * b); }, sneg(a) { return this.s32(-a); },
  /* (^ticket(759)) SInt's division and power, with the interpreter's errors; the least SInt by -1 overflows */
  sdiv(a, b) { if (b === 0) this.invalid("DivideByZero"); return this.s32(Math.trunc(a / b)); },
  spow(a, b) { if (b < 0) this.invalid("NegativeExponent"); return this.s32(a ** b); },
  /* (^ticket(763); Cyrus, 2026-11-13: "We need a way to limit compiled hazel functions that diverge --- we need a step
     limit. esp if we continue to optimize by including certain jit-compiled hazel functions into the main thread") Each
     compiled function counts its call (fuel, exact) and every 16384 calls reads the clock (deadline): a run past either
     throws, and its caller falls back to the interpreter. None by default; a caller sets a budget for one run (limit) and
     takes it off after (unlimit). (Endless recursion overflows JS's stack first, a RangeError, also thrown; what the budget
     catches is a run that is finite but long, fib(45), as the interpreter's own timer does.) */
  fuel: Number.MAX_SAFE_INTEGER,
  deadline: Infinity,
  limit(fuel, ms) { this.fuel = fuel; this.deadline = ms === null ? Infinity : performance.now() + ms; },
  unlimit() { this.fuel = Number.MAX_SAFE_INTEGER; this.deadline = Infinity; },
  out() { const e = new Error(this.fuel < 0 ? "hazel-jit: step limit (the run's calls)" : "hazel-jit: step limit (the run's time)"); e.$limit = true; throw e; },
  /* (^ticket(722)) a slide's run with its livelits' models as parameters: params, when set, maps a model's id to its
     value, in place of the literal the program holds; samples, when set, gets each livelit use's view answer, by its
     projector's id, as the interpreter samples it */
  params: null,
  samples: null,
  param(id, v) { const p = this.params; return p !== null && Object.prototype.hasOwnProperty.call(p, id) ? p[id] : v; },
  sample(id, v) { if (this.samples !== null) this.samples[id] = v; return v; },
  reach(why) { throw new Error("hazel-jit: not compiled, and reached: " + why); },
  missing(why) { const f = () => { throw new Error("hazel-jit: not compiled: " + why); }; f.$missing = why; return f; },
  fn(f, k, e) { f.$k = k; f.$e = e; return f; },
  b: {
    /* (^ticket(722)) %splice_value((model, id)): the value inside the model's SpliceRef((id, v)), found as the
       interpreter's BuiltinsADT.splice_value finds it, first in a walk from the root, left to right */
    "%splice_value": ([model, id]) => {
      const find = x => {
        if (x === null || typeof x !== "object") return undefined;
        if (Array.isArray(x)) { for (const y of x) { const r = find(y); if (r !== undefined) return r; } return undefined; }
        if ("c" in x) {
          if (x.c === "SpliceRef" && Array.isArray(x.v) && x.v[0] === id) return x.v[1];
          return "v" in x ? find(x.v) : undefined;
        }
        if ("h" in x) { for (let p = x; p !== null; p = p.t) { const r = find(p.h); if (r !== undefined) return r; } }
        return undefined;
      };
      const r = find(model);
      if (r === undefined) throw new Error("hazel-jit: %splice_value: no ref " + id);
      return r;
    },
    string_of_int: n => String(n), string_of_sint: n => String(n), string_of_nat: n => String(n),
    string_of_bool: b => String(b),
    float_of_int: n => Number(n), float_of_sint: n => n, float_of_nat: n => Number(n),
    int_of_float: f => { if (!Number.isFinite(f)) throw new Error("hazel-jit: invalid operation: int_of_float"); const t = Math.trunc(f); return Number.isSafeInteger(t) ? t : BigInt(t); },
    /* (^ticket(758)) into an SInt only what fits in 32 bits, as Atom.convert: else IntegerTooBig */
    sint_of_float: f => { const t = Math.trunc(f); if (!(t >= -2147483648 && t <= 2147483647)) { const e = new Error("hazel-jit: invalid operation: IntegerTooBig"); e.$invalid = "IntegerTooBig"; throw e; } return t === 0 ? 0 : t; },
    int_of_sint: n => n,
    sint_of_int: n => { if (n > 2147483647 || n < -2147483648) { const e = new Error("hazel-jit: invalid operation: IntegerTooBig"); e.$invalid = "IntegerTooBig"; throw e; } return Number(n); },
    int_of_string: s => { let r; try { if (s.trim() === "") throw 0; r = BigInt(s); } catch (_) { const e = new Error("hazel-jit: invalid operation: InvalidOfString"); e.$invalid = "InvalidOfString"; throw e; }
      return r <= 9007199254740991n && r >= -9007199254740991n ? Number(r) : r; },
    float_of_string: s => Number(s),
    /* (^ticket(761), found 11-16: s.length counted UTF-16 units, so string_length("\u{1F44B}") was 2 here and 1 in
       Hazel) a string's length, and string_sub's offsets, in graphemes, as HazelString has them (Intl.Segmenter, its
       reference); an ASCII string without a carriage return is its own graphemes, Unicode.length's fast path */
    string_length: s => /^[\x00-\x0c\x0e-\x7f]*$/.test(s) ? s.length : Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)).length,
    string_sub: ([s, i, n]) => { const g = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s), x => x.segment);
      if (typeof i === "bigint" || typeof n === "bigint" || i < 0 || n < 0 || i > g.length || n > g.length - i) { const e = new Error("hazel-jit: invalid operation: IndexOutOfBounds"); e.$invalid = "IndexOutOfBounds"; throw e; }
      return g.slice(i, i + n).join(""); },
    /* a literal separator; the empty one splits into graphemes */
    string_split: ([sep, s]) => { const p = sep === "" ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s), x => x.segment) : s.split(sep);
      let r = null; for (let i = p.length - 1; i >= 0; i--) r = { h: p[i], t: r }; return r; },
    string_uppercase: s => s.toUpperCase(), string_lowercase: s => s.toLowerCase(),
    string_trim: s => s.trim(),
    /* (^ticket(761), the sweep's most frequent missing builtins) as HazelString has them: a pattern a JS RegExp with the
       u flag (without it where u will not compile), global; a string's offsets in grapheme clusters, by Intl.Segmenter */
    string_match: ([p, s]) => { const re = (q => { try { return new RegExp(q, "gu"); } catch (e) { return new RegExp(q, "g"); } })(p); re.lastIndex = 0; return re.test(s); },
    string_replace: ([p, s, by]) => s.replace((q => { try { return new RegExp(q, "gu"); } catch (e) { return new RegExp(q, "g"); } })(p), by.split("$").join("$$")),
    string_search: ([p, s, start]) => {
      if (typeof start === "bigint" || start > 2147483647 || start < -2147483648) return -1;
      const g = (t => Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(t), x => x.segment))(s), n = g.length, k = start < 0 ? 0 : start > n ? n : start;
      let u = 0; for (let i = 0; i < k; i++) u += g[i].length;
      const re = (q => { try { return new RegExp(q, "gu"); } catch (e) { return new RegExp(q, "g"); } })(p); re.lastIndex = u; const m = re.exec(s);
      if (m === null) return -1;
      if (m.index <= 0) return 0;
      let acc = 0; for (let i = 0; i < n; i++) { acc += g[i].length; if (acc > m.index) return i; } return n;
    },
    string_join: ([sep, xs]) => { const a = []; for (let p = xs; p !== null; p = p.t) a.push(p.h); return a.join(sep); },
    string_escaped: s => {
      let out = "";
      for (const c of s) {
        const k = c.charCodeAt(0);
        out += c === "\\" ? "\\\\" : c === "\"" ? "\\\"" : c === "\n" ? "\\n" : c === "\t" ? "\\t" : c === "\r" ? "\\r" : c === "\b" ? "\\b"
          : (k < 0x20 || k === 0x7f) ? "\\" + String(k).padStart(3, "0") : c;
      }
      return out;
    },
    string_capitalize: s => { const g = (t => Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(t), x => x.segment))(s); return g.length ? g[0].toUpperCase() + g.slice(1).join("") : s; },
    string_uncapitalize: s => { const g = (t => Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(t), x => x.segment))(s); return g.length ? g[0].toLowerCase() + g.slice(1).join("") : s; },
    omit_all_labels: t => Array.isArray(t) ? Array.from(t) : t,
    /* (^ticket(761)) BuiltinsTupleOperations' label builtins: a tuple, then label literals ({lab: name}); a label the
       tuple lacks stops the run (the interpreter's projection is stuck there), as an invalid operation's does */
    project_labels: ([t, ...ls]) => ls.map(({ lab }) => { if (!Array.isArray(t) || !Object.prototype.hasOwnProperty.call(t, lab)) { const e = new Error("hazel-jit: indeterminate: a projection by " + lab); e.$indet = lab; throw e; } return t[lab]; }),
    select_labels: ([t, ...ls]) => { const vs = ls.map(({ lab }) => { if (!Array.isArray(t) || !Object.prototype.hasOwnProperty.call(t, lab)) { const e = new Error("hazel-jit: indeterminate: a projection by " + lab); e.$indet = lab; throw e; } return t[lab]; });
      ls.forEach(({ lab }, i) => { vs[lab] = vs[i]; }); return vs; },
    omit_labels: ([t, ...ls]) => { const drop = new Set(ls.map(({ lab }) => lab)), tl = t.map(() => null), vs = [], out = [];
      for (const k of Object.keys(t)) { if (/^[0-9]+$/.test(k)) continue; const i = tl.findIndex((x, j) => x === null && t[j] === t[k]); if (i >= 0) tl[i] = k; }
      t.forEach((v, i) => { if (tl[i] === null || !drop.has(tl[i])) { vs.push(v); out.push(tl[i]); } });
      out.forEach((l, i) => { if (l !== null) vs[l] = vs[i]; }); return vs; },
    /* the compare builtins (BuiltinsADT.of_atom_compare), Lt, Eq or Gt as Atom.compare_of_cls has them: Int, SInt, Nat by
       value (a number and a BigInt compare as they are); Float as OCaml's Float.compare, nan equal to itself and below
       every other float; String as String.compare, byte by byte in UTF-8, which is code point order */
    int_compare: ([a, b]) => ({ c: a < b ? "Lt" : a > b ? "Gt" : "Eq" }),
    sint_compare: ([a, b]) => ({ c: a < b ? "Lt" : a > b ? "Gt" : "Eq" }),
    nat_compare: ([a, b]) => ({ c: a < b ? "Lt" : a > b ? "Gt" : "Eq" }),
    float_compare: ([a, b]) => { const x = a !== a, y = b !== b;
      return { c: x ? (y ? "Eq" : "Lt") : y ? "Gt" : a < b ? "Lt" : a > b ? "Gt" : "Eq" }; },
    string_compare: ([a, b]) => { const x = Array.from(a, ch => ch.codePointAt(0)), y = Array.from(b, ch => ch.codePointAt(0));
      for (let i = 0; i < x.length && i < y.length; i++) if (x[i] !== y[i]) return { c: x[i] < y[i] ? "Lt" : "Gt" };
      return { c: x.length < y.length ? "Lt" : x.length > y.length ? "Gt" : "Eq" }; },
    invert_ord: o => o.c === "Lt" ? { c: "Gt" } : o.c === "Gt" ? { c: "Lt" } : o,
    abs: n => typeof n === "number" ? Math.abs(n) : (n < 0n ? -n : n), abs_float: Math.abs, ceil: Math.ceil, floor: Math.floor, round: Math.round,
    sqrt: Math.sqrt, exp: Math.exp, log: Math.log, log10: Math.log10,
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    atan2: ([y, x]) => Math.atan2(y, x),
    float_min: ([a, b]) => Math.min(a, b), float_max: ([a, b]) => Math.max(a, b),
    int_mod: ([a, b]) => { if (b === 0 || b === 0n) { const e = new Error("hazel-jit: invalid operation: DivideByZero"); e.$invalid = "DivideByZero"; throw e; }
      if (typeof a === "number" && typeof b === "number") return a % b; const r = BigInt(a) % BigInt(b); return r <= 9007199254740991n && r >= -9007199254740991n ? Number(r) : r; },
    sint_mod: ([a, b]) => { if (b === 0) { const e = new Error("hazel-jit: invalid operation: DivideByZero"); e.$invalid = "DivideByZero"; throw e; } return a % b; },
    float_mod: ([a, b]) => a % b,
    to_fixed: ([x, n]) => x.toFixed(Math.min(Math.max(Number(n), 0), 20)),
    fst: p => p[0], snd: p => p[1],
    is_nan: Number.isNaN, is_finite: Number.isFinite,
    pi: Math.PI, infinity: Infinity, neg_infinity: -Infinity, nan: NaN
  }
});
  const P = (function ($R) {
"use strict";  let let$1, Lines$51, let$52, Casting$102, let$103, Book$154, let$155, Reading$181; return (let$1 = (() => { let def$2, modulo$6, def$7, line_of$10, def$11, value_of$15, def$16, is_yang$20, def$21, is_changing$25, def$26, becomes$30, def$31, bit$34, def$35, changing_from$43, def$44, length$50; return (def$2 = $R.fn((a$3) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let n$4, m$5; return (n$4 = a$3[0], m$5 = a$3[1], $R.isub(n$4, $R.imul($R.idiv(n$4, m$5), m$5))); }, 0, null), modulo$6 = def$2, def$7 = $R.fn((a$8) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let v$9; return (v$9 = a$8, ($R.eq(v$9, 6) ? {c: "OldYin"} : ($R.eq(v$9, 7) ? {c: "YoungYang"} : ($R.eq(v$9, 8) ? {c: "YoungYin"} : {c: "OldYang"})))); }, 1, null), line_of$10 = def$7, def$11 = $R.fn((a$12) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let l$13, m$14; return (l$13 = a$12, (m$14 = l$13, ((m$14.c === "OldYin") ? (6) : ((m$14.c === "YoungYang") ? (7) : ((m$14.c === "YoungYin") ? (8) : ((m$14.c === "OldYang") ? (9) : $R.nomatch("case"))))))); }, 2, null), value_of$15 = def$11, def$16 = $R.fn((a$17) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let l$18, m$19; return (l$18 = a$17, (m$19 = l$18, ((m$19.c === "YoungYang") ? (true) : ((m$19.c === "OldYang") ? (true) : (false))))); }, 3, null), is_yang$20 = def$16, def$21 = $R.fn((a$22) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let l$23, m$24; return (l$23 = a$22, (m$24 = l$23, ((m$24.c === "OldYin") ? (true) : ((m$24.c === "OldYang") ? (true) : (false))))); }, 4, null), is_changing$25 = def$21, def$26 = $R.fn((a$27) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let l$28, m$29; return (l$28 = a$27, (m$29 = l$28, ((m$29.c === "OldYin") ? ({c: "YoungYang"}) : ((m$29.c === "OldYang") ? ({c: "YoungYin"}) : (l$28))))); }, 5, null), becomes$30 = def$26, def$31 = $R.fn((a$32) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let l$33; return (l$33 = a$32, ((is_yang$20)(l$33) ? 1 : 0)); }, 6, [is_yang$20]), bit$34 = def$31, def$35 = (() => { let changing_from$36; return (changing_from$36 = $R.fn((a$37) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ls$38, i$39, m$40, l$41, rest$42; return (ls$38 = a$37[0], i$39 = a$37[1], (m$40 = ls$38, ((m$40 === null) ? (null) : ((m$40 !== null) ? (l$41 = m$40.h, rest$42 = m$40.t, ((is_changing$25)(l$41) ? {h: i$39, t: (changing_from$36)([rest$42, $R.iadd(i$39, 1)])} : (changing_from$36)([rest$42, $R.iadd(i$39, 1)]))) : $R.nomatch("case"))))); }, 7, [changing_from$36, is_changing$25]), changing_from$36); })(), changing_from$43 = def$35, def$44 = (() => { let length$45; return (length$45 = $R.fn((a$46) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ls$47, m$48, rest$49; return (ls$47 = a$46, (m$48 = ls$47, ((m$48 === null) ? (0) : ((m$48 !== null) ? (rest$49 = m$48.t, $R.iadd(1, (length$45)(rest$49))) : $R.nomatch("case"))))); }, 8, [length$45]), length$45); })(), length$50 = def$44, $R.tup([modulo$6, line_of$10, value_of$15, is_yang$20, is_changing$25, becomes$30, bit$34, changing_from$43, length$50], ["modulo", "line_of", "value_of", "is_yang", "is_changing", "becomes", "bit", "changing_from", "$length"])); })(), Lines$51 = let$1, (let$52 = (() => { let def$53, coin$56, def$57, by_coins$64, def$65, leftover$70, def$71, divide$79, def$80, by_yarrow$93, def$94, cast$101; return (def$53 = $R.fn((a$54) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let u$55; return (u$55 = a$54, ((u$55 < 0.5) ? 2 : 3)); }, 9, null), coin$56 = def$53, def$57 = $R.fn((a$58) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$59, b$60, c$61, let$62, v$63; return (a$59 = a$58[0], b$60 = a$58[1], c$61 = a$58[2], (let$62 = $R.iadd($R.iadd((coin$56)(a$59), (coin$56)(b$60)), (coin$56)(c$61)), v$63 = let$62, $R.tup([((Lines$51)["line_of"])(v$63), v$63, {h: (coin$56)(a$59), t: {h: (coin$56)(b$60), t: {h: (coin$56)(c$61), t: null}}}], ["line", "value", "counts"]))); }, 10, [coin$56, Lines$51]), by_coins$64 = def$57, def$65 = $R.fn((a$66) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let n$67, let$68, r$69; return (n$67 = a$66, (let$68 = ((Lines$51)["modulo"])([n$67, 4]), r$69 = let$68, ($R.eq(r$69, 0) ? 4 : r$69))); }, 11, [Lines$51]), leftover$70 = def$65, def$71 = $R.fn((a$72) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let n$73, u$74, let$75, left$76, let$77, right$78; return (n$73 = a$72[0], u$74 = a$72[1], (let$75 = $R.iadd(1, ($R.b["int_of_float"])((u$74 * ($R.b["float_of_int"])($R.isub(n$73, 2))))), left$76 = let$75, (let$77 = $R.isub($R.isub(n$73, left$76), 1), right$78 = let$77, $R.iadd($R.iadd(1, (leftover$70)(left$76)), (leftover$70)(right$78))))); }, 12, [leftover$70]), divide$79 = def$71, def$80 = $R.fn((a$81) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$82, b$83, c$84, let$85, x$86, let$87, y$88, let$89, z$90, let$91, v$92; return (a$82 = a$81[0], b$83 = a$81[1], c$84 = a$81[2], (let$85 = (divide$79)([49, a$82]), x$86 = let$85, (let$87 = (divide$79)([$R.isub(49, x$86), b$83]), y$88 = let$87, (let$89 = (divide$79)([$R.isub($R.isub(49, x$86), y$88), c$84]), z$90 = let$89, (let$91 = $R.idiv($R.isub($R.isub($R.isub(49, x$86), y$88), z$90), 4), v$92 = let$91, $R.tup([((Lines$51)["line_of"])(v$92), v$92, {h: x$86, t: {h: y$88, t: {h: z$90, t: null}}}], ["line", "value", "counts"])))))); }, 13, [divide$79, Lines$51]), by_yarrow$93 = def$80, def$94 = $R.fn((a$95) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let m$96, a$97, b$98, c$99, m$100; return (m$96 = a$95[0], a$97 = a$95[1], b$98 = a$95[2], c$99 = a$95[3], (m$100 = m$96, ((m$100.c === "Coins") ? ((by_coins$64)([a$97, b$98, c$99])) : ((m$100.c === "Yarrow") ? ((by_yarrow$93)([a$97, b$98, c$99])) : $R.nomatch("case"))))); }, 14, [by_yarrow$93, by_coins$64]), cast$101 = def$94, $R.tup([coin$56, by_coins$64, leftover$70, divide$79, by_yarrow$93, cast$101], ["coin", "by_coins", "leftover", "divide", "by_yarrow", "cast"])); })(), Casting$102 = let$52, (let$103 = (() => { let def$104, trigrams$105, def$106, king_wen$107, def$108, names$109, def$110, nth_int$118, def$119, nth_name$127, def$128, nth_trigram$136, def$137, trigram$142, def$143, hexagram$149, def$150, none$151, def$152, unknown$153; return (def$104 = {h: $R.tup([0, "Kun", "earth"], ["number", "name", "image"]), t: {h: $R.tup([1, "Zhen", "thunder"], ["number", "name", "image"]), t: {h: $R.tup([2, "Kan", "water"], ["number", "name", "image"]), t: {h: $R.tup([3, "Dui", "lake"], ["number", "name", "image"]), t: {h: $R.tup([4, "Gen", "mountain"], ["number", "name", "image"]), t: {h: $R.tup([5, "Li", "fire"], ["number", "name", "image"]), t: {h: $R.tup([6, "Xun", "wind"], ["number", "name", "image"]), t: {h: $R.tup([7, "Qian", "heaven"], ["number", "name", "image"]), t: null}}}}}}}}, trigrams$105 = def$104, def$106 = {h: 2, t: {h: 24, t: {h: 7, t: {h: 19, t: {h: 15, t: {h: 36, t: {h: 46, t: {h: 11, t: {h: 16, t: {h: 51, t: {h: 40, t: {h: 54, t: {h: 62, t: {h: 55, t: {h: 32, t: {h: 34, t: {h: 8, t: {h: 3, t: {h: 29, t: {h: 60, t: {h: 39, t: {h: 63, t: {h: 48, t: {h: 5, t: {h: 45, t: {h: 17, t: {h: 47, t: {h: 58, t: {h: 31, t: {h: 49, t: {h: 28, t: {h: 43, t: {h: 23, t: {h: 27, t: {h: 4, t: {h: 41, t: {h: 52, t: {h: 22, t: {h: 18, t: {h: 26, t: {h: 35, t: {h: 21, t: {h: 64, t: {h: 38, t: {h: 56, t: {h: 30, t: {h: 50, t: {h: 14, t: {h: 20, t: {h: 42, t: {h: 59, t: {h: 61, t: {h: 53, t: {h: 37, t: {h: 57, t: {h: 9, t: {h: 12, t: {h: 25, t: {h: 6, t: {h: 10, t: {h: 33, t: {h: 13, t: {h: 44, t: {h: 1, t: null}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, king_wen$107 = def$106, def$108 = {h: "Qian, the Creative", t: {h: "Kun, the Receptive", t: {h: "Zhun, Difficulty at the Beginning", t: {h: "Meng, Youthful Folly", t: {h: "Xu, Waiting", t: {h: "Song, Conflict", t: {h: "Shi, the Army", t: {h: "Bi, Holding Together", t: {h: "Xiao Chu, Small Taming", t: {h: "Lu, Treading", t: {h: "Tai, Peace", t: {h: "Pi, Standstill", t: {h: "Tong Ren, Fellowship", t: {h: "Da You, Great Possession", t: {h: "Qian, Modesty", t: {h: "Yu, Enthusiasm", t: {h: "Sui, Following", t: {h: "Gu, Work on the Decayed", t: {h: "Lin, Approach", t: {h: "Guan, Contemplation", t: {h: "Shi He, Biting Through", t: {h: "Bi, Grace", t: {h: "Bo, Splitting Apart", t: {h: "Fu, Return", t: {h: "Wu Wang, Innocence", t: {h: "Da Chu, Great Taming", t: {h: "Yi, Nourishment", t: {h: "Da Guo, Great Exceeding", t: {h: "Kan, the Abysmal (Water)", t: {h: "Li, the Clinging (Fire)", t: {h: "Xian, Influence", t: {h: "Heng, Duration", t: {h: "Dun, Retreat", t: {h: "Da Zhuang, Great Power", t: {h: "Jin, Progress", t: {h: "Ming Yi, Darkening of the Light", t: {h: "Jia Ren, the Family", t: {h: "Kui, Opposition", t: {h: "Jian, Obstruction", t: {h: "Xie, Deliverance", t: {h: "Sun, Decrease", t: {h: "Yi, Increase", t: {h: "Guai, Breakthrough", t: {h: "Gou, Coming to Meet", t: {h: "Cui, Gathering Together", t: {h: "Sheng, Pushing Upward", t: {h: "Kun, Oppression", t: {h: "Jing, the Well", t: {h: "Ge, Revolution", t: {h: "Ding, the Cauldron", t: {h: "Zhen, the Arousing (Thunder)", t: {h: "Gen, Keeping Still (Mountain)", t: {h: "Jian, Development", t: {h: "Gui Mei, the Marrying Maiden", t: {h: "Feng, Abundance", t: {h: "Lu, the Wanderer", t: {h: "Xun, the Gentle (Wind)", t: {h: "Dui, the Joyous (Lake)", t: {h: "Huan, Dispersion", t: {h: "Jie, Limitation", t: {h: "Zhong Fu, Inner Truth", t: {h: "Xiao Guo, Small Exceeding", t: {h: "Ji Ji, After Completion", t: {h: "Wei Ji, Before Completion", t: null}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, names$109 = def$108, def$110 = (() => { let nth_int$111; return (nth_int$111 = $R.fn((a$112) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$113, i$114, m$115, x$116, rest$117; return (xs$113 = a$112[0], i$114 = a$112[1], (m$115 = xs$113, ((m$115 === null) ? (0) : ((m$115 !== null) ? (x$116 = m$115.h, rest$117 = m$115.t, ($R.eq(i$114, 0) ? x$116 : (nth_int$111)([rest$117, $R.isub(i$114, 1)]))) : $R.nomatch("case"))))); }, 15, [nth_int$111]), nth_int$111); })(), nth_int$118 = def$110, def$119 = (() => { let nth_name$120; return (nth_name$120 = $R.fn((a$121) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$122, i$123, m$124, x$125, rest$126; return (xs$122 = a$121[0], i$123 = a$121[1], (m$124 = xs$122, ((m$124 === null) ? ("") : ((m$124 !== null) ? (x$125 = m$124.h, rest$126 = m$124.t, ($R.eq(i$123, 0) ? x$125 : (nth_name$120)([rest$126, $R.isub(i$123, 1)]))) : $R.nomatch("case"))))); }, 16, [nth_name$120]), nth_name$120); })(), nth_name$127 = def$119, def$128 = (() => { let nth_trigram$129; return (nth_trigram$129 = $R.fn((a$130) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ts$131, i$132, m$133, t$134, rest$135; return (ts$131 = a$130[0], i$132 = a$130[1], (m$133 = ts$131, ((m$133 === null) ? ($R.tup([$R.isub(0, 1), "", ""], ["number", "name", "image"])) : ((m$133 !== null) ? (t$134 = m$133.h, rest$135 = m$133.t, ($R.eq(i$132, 0) ? t$134 : (nth_trigram$129)([rest$135, $R.isub(i$132, 1)]))) : $R.nomatch("case"))))); }, 17, [nth_trigram$129]), nth_trigram$129); })(), nth_trigram$136 = def$128, def$137 = $R.fn((a$138) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$139, b$140, c$141; return (a$139 = a$138[0], b$140 = a$138[1], c$141 = a$138[2], (nth_trigram$136)([trigrams$105, $R.iadd($R.iadd(((Lines$51)["bit"])(a$139), $R.imul(2, ((Lines$51)["bit"])(b$140))), $R.imul(4, ((Lines$51)["bit"])(c$141)))])); }, 18, [trigrams$105, Lines$51, nth_trigram$136]), trigram$142 = def$137, def$143 = $R.fn((a$144) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let lower$145, upper$146, let$147, k$148; return (lower$145 = a$144[0], upper$146 = a$144[1], (let$147 = (nth_int$118)([king_wen$107, $R.iadd($R.imul((upper$146)["number"], 8), (lower$145)["number"])]), k$148 = let$147, $R.tup([k$148, (nth_name$127)([names$109, $R.isub(k$148, 1)])], ["number", "name"]))); }, 19, [king_wen$107, nth_int$118, names$109, nth_name$127]), hexagram$149 = def$143, def$150 = $R.tup([$R.isub(0, 1), "", ""], ["number", "name", "image"]), none$151 = def$150, def$152 = $R.tup([0, ""], ["number", "name"]), unknown$153 = def$152, $R.tup([trigrams$105, king_wen$107, names$109, nth_int$118, nth_name$127, nth_trigram$136, trigram$142, hexagram$149, none$151, unknown$153], ["trigrams", "king_wen", "names", "nth_int", "nth_name", "nth_trigram", "trigram", "hexagram", "none", "unknown"])); })(), Book$154 = let$103, (let$155 = (() => { let def$156, reading$180; return (def$156 = $R.fn((a$157) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ls$158, let$159, changing$160, m$161, a$162, b$163, c$164, a$165, b$166, c$167, d$168, e$169, f$170, let$171, lo$172, let$173, up$174, let$175, lo2$176, let$177, up2$178, m$179; return (ls$158 = a$157, (let$159 = ((Lines$51)["changing_from"])([ls$158, 1]), changing$160 = let$159, (m$161 = ls$158, ((m$161 !== null) && (m$161.t !== null) && (m$161.t.t !== null) && (m$161.t.t.t !== null) && (m$161.t.t.t.t !== null) && (m$161.t.t.t.t.t !== null) ? (a$165 = m$161.h, b$166 = m$161.t.h, c$167 = m$161.t.t.h, d$168 = m$161.t.t.t.h, e$169 = m$161.t.t.t.t.h, f$170 = m$161.t.t.t.t.t.h, (let$171 = ((Book$154)["trigram"])([a$165, b$166, c$167]), lo$172 = let$171, (let$173 = ((Book$154)["trigram"])([d$168, e$169, f$170]), up$174 = let$173, (let$175 = ((Book$154)["trigram"])([((Lines$51)["becomes"])(a$165), ((Lines$51)["becomes"])(b$166), ((Lines$51)["becomes"])(c$167)]), lo2$176 = let$175, (let$177 = ((Book$154)["trigram"])([((Lines$51)["becomes"])(d$168), ((Lines$51)["becomes"])(e$169), ((Lines$51)["becomes"])(f$170)]), up2$178 = let$177, $R.tup([6, lo$172, up$174, ((Book$154)["hexagram"])([lo$172, up$174]), changing$160, (m$179 = changing$160, ((m$179 === null) ? ((Book$154)["unknown"]) : (((Book$154)["hexagram"])([lo2$176, up2$178]))))], ["cast", "lower", "upper", "primary", "changing", "relating"])))))) : ((m$161 !== null) && (m$161.t !== null) && (m$161.t.t !== null) ? (a$162 = m$161.h, b$163 = m$161.t.h, c$164 = m$161.t.t.h, $R.tup([((Lines$51)["$length"])(ls$158), ((Book$154)["trigram"])([a$162, b$163, c$164]), (Book$154)["none"], (Book$154)["unknown"], changing$160, (Book$154)["unknown"]], ["cast", "lower", "upper", "primary", "changing", "relating"])) : ($R.tup([((Lines$51)["$length"])(ls$158), (Book$154)["none"], (Book$154)["none"], (Book$154)["unknown"], changing$160, (Book$154)["unknown"]], ["cast", "lower", "upper", "primary", "changing", "relating"]))))))); }, 20, [Lines$51, Book$154]), reading$180 = def$156, $R.tup([reading$180], ["reading"])); })(), Reading$181 = let$155, $R.tup([(Casting$102)["cast"], (Reading$181)["reading"]], ["cast", "reading"])))));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
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
  const made = "a4633af773";
  const api = { cast, reading, made };
  if (typeof window !== "undefined") window.IChingCompiled = api;
  if (typeof module !== "undefined") module.exports = api;
})();
