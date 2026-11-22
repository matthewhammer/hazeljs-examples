// hazeljs-examples, Bricks: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel 6c5a032106 (trial/794-games-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// (ticket 824) The page runs its rules through this file instead of loading hazeljs and building the program, unless asked
// for interpreted (?interpreted=1) or the rules are edited. The same answers are checked by node/compare-compiled.mjs.
(() => {
  "use strict";
  const $R = ({
  append(a, b) { if (a === null) return b; const xs = []; for (let p = a; p !== null; p = p.t) xs.push(p.h);
    let r = b; for (let i = xs.length - 1; i >= 0; i--) r = {h: xs[i], t: r}; return r; },
  tup(vs, ls) { for (let i = 0; i < ls.length; i++) if (ls[i] !== null) vs[ls[i]] = vs[i]; return vs; },
  /* (^ticket(761); the slides' check, CI run 44184122601) e.k, as Transition's Dot: a tuple's component; through a list,
     each element's (a table's column, t.get_acne in the b2t2 examples), so a list of rows gives a list; anything else, the
     interpreter's projection is stuck */
  dot(t, k) {
    if (Array.isArray(t)) return t[k];
    if (t === null) return null;
    if (typeof t === "object" && "h" in t) { const xs = []; for (let p = t; p !== null; p = p.t) xs.push(this.dot(p.h, k));
      let r = null; for (let i = xs.length - 1; i >= 0; i--) r = {h: xs[i], t: r}; return r; }
    this.indet("a projection by " + k);
  },
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
    /* (^ticket(761)) from_lvs: a list of (label = String, value = v), as a tuple with those labels, in order
       (BuiltinsTupleOperations); one entry is a tuple of one, none the empty tuple */
    from_lvs: l => { const vs = [], ks = [];
      for (let p = l; p !== null; p = p.t) { const k = p.h.label; vs.push(p.h.value);
        ks.push(k === "length" || k === "__proto__" || k[0] === "$" ? "$" + k : k); }
      ks.forEach((k, i) => { vs[k] = vs[i]; }); return vs; },
    /* (^ticket(761), found by the slides' check) to_lvs: a tuple's labeled entries as a list of (label = String,
       value = v), in order (BuiltinsTupleOperations); an unlabeled entry, or not a tuple, and the interpreter's is stuck */
    to_lvs: t => {
      const stuck = () => { const e = new Error("hazel-jit: indeterminate: to_lvs"); e.$indet = "to_lvs"; throw e; };
      if (!Array.isArray(t)) stuck();
      const ls = t.map(() => null);
      for (const k of Object.keys(t)) { if (/^[0-9]+$/.test(k)) continue; const i = ls.findIndex((x, j) => x === null && t[j] === t[k]); if (i >= 0) ls[i] = k; }
      if (ls.some(l => l === null)) stuck();
      let r = null;
      for (let i = t.length - 1; i >= 0; i--) { const k = ls[i], name = k.length > 1 && k[0] === "$" ? k.slice(1) : k;
        const e = [name, t[i]]; e.label = name; e.value = t[i]; r = { h: e, t: r }; }
      return r; },
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
"use strict";  let let$1, Bricks$245; return (let$1 = (() => { let def$2, md$6, def$7, absi$10, def$11, cols$12, def$13, rows$14, def$15, cell$22, def$23, layout_from$28, def$29, layout$32, def$33, left_to_break$40, def$41, at$49, def$50, set_at$59, def$60, brick_at$71, def$72, start$76, def$77, speed$82, def$83, maxi$87, def$88, subs$154, def$155, step$191, def$192, land$210, def$211, col_count$220, def$221, best_col$230, def$231, robot$244; return (def$2 = $R.fn((a$3) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$4, b$5; return (a$4 = a$3[0], b$5 = a$3[1], $R.isub(a$4, $R.imul($R.idiv(a$4, b$5), b$5))); }, 0, null), md$6 = def$2, def$7 = $R.fn((a$8) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let n$9; return (n$9 = a$8, ((n$9 < 0) ? $R.isub(0, n$9) : n$9)); }, 1, null), absi$10 = def$7, def$11 = 10, cols$12 = def$11, def$13 = 8, rows$14 = def$13, def$15 = $R.fn((a$16) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let l$17, r$18, c$19, let$20, k$21; return (l$17 = a$16[0], r$18 = a$16[1], c$19 = a$16[2], (let$20 = (md$6)([l$17, 6]), k$21 = let$20, ($R.eq(k$21, 0) ? (((r$18 >= 1) && (r$18 <= 5)) ? ($R.eq(r$18, 1) ? 2 : 1) : 0) : ($R.eq(k$21, 1) ? (((r$18 <= 6) && ((absi$10)($R.isub($R.imul(2, c$19), 9)) <= $R.iadd($R.imul(2, r$18), 1))) ? ($R.eq(r$18, 0) ? 2 : 1) : 0) : ($R.eq(k$21, 2) ? (((r$18 <= 6) && $R.eq((md$6)([$R.iadd(r$18, c$19), 2]), 0)) ? ((r$18 <= 1) ? 2 : 1) : 0) : ($R.eq(k$21, 3) ? (($R.eq(r$18, 3) && ($R.eq(c$19, 0) || $R.eq(c$19, 9))) ? 9 : (((r$18 <= 6) && ($R.iadd((absi$10)($R.isub($R.imul(2, c$19), 9)), $R.imul(2, (absi$10)($R.isub($R.imul(2, r$18), 6)))) <= 9)) ? ($R.eq(r$18, 3) ? 2 : 1) : 0)) : ($R.eq(k$21, 4) ? (($R.eq(r$18, 2) && ((c$19 >= 2) && ((c$19 <= 7) && $R.eq((md$6)([c$19, 2]), 0)))) ? 9 : (((r$18 <= 6) && (!$R.eq(r$18, 2))) ? (($R.eq(r$18, 0) || $R.eq(r$18, 6)) ? 2 : 1) : 0)) : (((r$18 <= 6) && ((c$19 <= 1) || ((c$19 >= 8) || ($R.eq(r$18, 0) || ($R.eq(r$18, 6) || $R.eq(c$19, $R.iadd(r$18, 1))))))) ? ($R.eq(c$19, $R.iadd(r$18, 1)) ? 2 : 1) : 0)))))))); }, 2, [md$6, absi$10]), cell$22 = def$15, def$23 = (() => { let layout_from$24; return (layout_from$24 = $R.fn((a$25) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let l$26, i$27; return (l$26 = a$25[0], i$27 = a$25[1], ((i$27 >= $R.imul(rows$14, cols$12)) ? null : {h: (cell$22)([l$26, $R.idiv(i$27, cols$12), (md$6)([i$27, cols$12])]), t: (layout_from$24)([l$26, $R.iadd(i$27, 1)])})); }, 3, [layout_from$24, cols$12, md$6, cell$22, rows$14]), layout_from$24); })(), layout_from$28 = def$23, def$29 = $R.fn((a$30) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let l$31; return (l$31 = a$30, (layout_from$28)([l$31, 0])); }, 4, [layout_from$28]), layout$32 = def$29, def$33 = (() => { let left_to_break$34; return (left_to_break$34 = $R.fn((a$35) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$36, m$37, b$38, rest$39; return (bs$36 = a$35, (m$37 = bs$36, ((m$37 === null) ? (0) : ((m$37 !== null) ? (b$38 = m$37.h, rest$39 = m$37.t, $R.iadd((((b$38 > 0) && (!$R.eq(b$38, 9))) ? 1 : 0), (left_to_break$34)(rest$39))) : $R.nomatch("case"))))); }, 5, [left_to_break$34]), left_to_break$34); })(), left_to_break$40 = def$33, def$41 = (() => { let at$42; return (at$42 = $R.fn((a$43) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$44, i$45, m$46, b$47, rest$48; return (bs$44 = a$43[0], i$45 = a$43[1], (m$46 = bs$44, ((m$46 === null) ? (0) : ((m$46 !== null) ? (b$47 = m$46.h, rest$48 = m$46.t, ((i$45 <= 0) ? b$47 : (at$42)([rest$48, $R.isub(i$45, 1)]))) : $R.nomatch("case"))))); }, 6, [at$42]), at$42); })(), at$49 = def$41, def$50 = (() => { let set_at$51; return (set_at$51 = $R.fn((a$52) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$53, i$54, v$55, m$56, b$57, rest$58; return (bs$53 = a$52[0], i$54 = a$52[1], v$55 = a$52[2], (m$56 = bs$53, ((m$56 === null) ? (null) : ((m$56 !== null) ? (b$57 = m$56.h, rest$58 = m$56.t, ((i$54 <= 0) ? {h: v$55, t: rest$58} : {h: b$57, t: (set_at$51)([rest$58, $R.isub(i$54, 1), v$55])})) : $R.nomatch("case"))))); }, 7, [set_at$51]), set_at$51); })(), set_at$59 = def$50, def$60 = $R.fn((a$61) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$62, x$63, y$64, let$65, c$66, let$67, r$68, let$69, i$70; return (bs$62 = a$61[0], x$63 = a$61[1], y$64 = a$61[2], (((x$63 < 2) || (y$64 < 80)) ? $R.isub(0, 1) : (let$65 = ($R.b["int_of_float"])(($R.b["floor"])(((x$63 - 2) / 60))), c$66 = let$65, (let$67 = ($R.b["int_of_float"])(($R.b["floor"])(((y$64 - 80) / 26))), r$68 = let$67, (((c$66 < 0) || ((c$66 >= cols$12) || ((r$68 < 0) || (r$68 >= rows$14)))) ? $R.isub(0, 1) : (let$69 = $R.iadd($R.imul(r$68, cols$12), c$66), i$70 = let$69, (((((x$63 - 2) - ($R.b["float_of_int"])($R.imul(c$66, 60))) <= 56) && ((((y$64 - 80) - ($R.b["float_of_int"])($R.imul(r$68, 26))) <= 22) && ((at$49)([bs$62, i$70]) > 0))) ? i$70 : $R.isub(0, 1)))))))); }, 8, [cols$12, at$49, rows$14]), brick_at$71 = def$60, def$72 = $R.fn((a$73) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let l$74, wide$75; return (l$74 = a$73[0], wide$75 = a$73[1], $R.tup([300000, 731000, 0, 0, 300, (wide$75 ? 140 : 96), (layout$32)(l$74), 3, 0, l$74, true, false, 0, 0], ["bx", "by", "vx", "vy", "px", "pw", "bricks", "balls", "score", "level", "held", "over", "hit", "t"])); }, 9, [layout$32]), start$76 = def$72, def$77 = $R.fn((a$78) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let l$79, let$80, v$81; return (l$79 = a$78, (let$80 = (6 + (($R.b["float_of_int"])(l$79) * 0.5)), v$81 = let$80, ((v$81 > 9) ? 9 : v$81))); }, 10, null), speed$82 = def$77, def$83 = $R.fn((a$84) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$85, b$86; return (a$85 = a$84[0], b$86 = a$84[1], ((a$85 > b$86) ? a$85 : b$86)); }, 11, null), maxi$87 = def$83, def$88 = (() => { let subs$89; return (subs$89 = $R.fn((a$90) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let n$91, b$92, px$93, pw$94, bs$95, score$96, hit$97, let$98, r$99, let$100, x$101, let$102, y$103, let$104, wl$105, let$106, wr$107, let$108, wt$109, let$110, x1$111, let$112, vx1$113, let$114, y1$115, let$116, vy1$117, let$118, h0$119, let$120, d$121, let$122, onp$123, let$124, top$125, let$126, bot$127, let$128, lef$129, let$130, rig$131, let$132, i$133, let$134, flipy$135, let$136, k$137, let$138, k2$139, let$140, sp$141, let$142, nb$143, let$144, u0$145, let$146, u$147, let$148, s0$149, let$150, s$151, let$152, a$153; return (n$91 = a$90[0], b$92 = a$90[1], px$93 = a$90[2], pw$94 = a$90[3], bs$95 = a$90[4], score$96 = a$90[5], hit$97 = a$90[6], ((n$91 <= 0) ? [b$92, bs$95, score$96, hit$97] : (let$98 = 8, r$99 = let$98, (let$100 = ($R.dot(b$92, "x") + ($R.dot(b$92, "vx") / 4)), x$101 = let$100, (let$102 = ($R.dot(b$92, "y") + ($R.dot(b$92, "vy") / 4)), y$103 = let$102, (let$104 = (x$101 < r$99), wl$105 = let$104, (let$106 = (x$101 > (600 - r$99)), wr$107 = let$106, (let$108 = (y$103 < r$99), wt$109 = let$108, (let$110 = (wl$105 ? (r$99 + (r$99 - x$101)) : (wr$107 ? ((600 - r$99) - (x$101 - (600 - r$99))) : x$101)), x1$111 = let$110, (let$112 = ((wl$105 || wr$107) ? (0 - $R.dot(b$92, "vx")) : $R.dot(b$92, "vx")), vx1$113 = let$112, (let$114 = (wt$109 ? (r$99 + (r$99 - y$103)) : y$103), y1$115 = let$114, (let$116 = (wt$109 ? (0 - $R.dot(b$92, "vy")) : $R.dot(b$92, "vy")), vy1$117 = let$116, (let$118 = ((wl$105 || (wr$107 || wt$109)) ? (maxi$87)([hit$97, 1]) : hit$97), h0$119 = let$118, (let$120 = (x1$111 - px$93), d$121 = let$120, (let$122 = ((vy1$117 > 0) && ((($R.dot(b$92, "y") + r$99) <= 740) && (((y1$115 + r$99) >= 740) && ((d$121 <= ((pw$94 / 2) + r$99)) && (d$121 >= ((0 - (pw$94 / 2)) - r$99)))))), onp$123 = let$122, (onp$123 ? (let$144 = (d$121 / (pw$94 / 2)), u0$145 = let$144, (let$146 = ((u0$145 > 1) ? 1 : ((u0$145 < (0 - 1)) ? (0 - 1) : u0$145)), u$147 = let$146, (let$148 = ($R.b["sqrt"])(((vx1$113 * vx1$113) + (vy1$117 * vy1$117))), s0$149 = let$148, (let$150 = ((s0$149 > 13) ? 13 : s0$149), s$151 = let$150, (let$152 = (u$147 * 1.05), a$153 = let$152, (subs$89)([$R.isub(n$91, 1), $R.tup([x1$111, (740 - r$99), (s$151 * ($R.b["sin"])(a$153)), (0 - (s$151 * ($R.b["cos"])(a$153)))], ["x", "y", "vx", "vy"]), px$93, pw$94, bs$95, score$96, (maxi$87)([h0$119, 2])])))))) : (let$124 = (brick_at$71)([bs$95, x1$111, (y1$115 - r$99)]), top$125 = let$124, (let$126 = (brick_at$71)([bs$95, x1$111, (y1$115 + r$99)]), bot$127 = let$126, (let$128 = (brick_at$71)([bs$95, (x1$111 - r$99), y1$115]), lef$129 = let$128, (let$130 = (brick_at$71)([bs$95, (x1$111 + r$99), y1$115]), rig$131 = let$130, (let$132 = ((top$125 >= 0) ? top$125 : ((bot$127 >= 0) ? bot$127 : ((lef$129 >= 0) ? lef$129 : rig$131))), i$133 = let$132, (let$134 = ((top$125 >= 0) || (bot$127 >= 0)), flipy$135 = let$134, ((i$133 >= 0) ? (let$136 = (at$49)([bs$95, i$133]), k$137 = let$136, (let$138 = ($R.eq(k$137, 9) ? 9 : $R.isub(k$137, 1)), k2$139 = let$138, (let$140 = ($R.eq(k$137, 9) ? 1 : 1.006), sp$141 = let$140, (let$142 = (flipy$135 ? $R.tup([x1$111, $R.dot(b$92, "y"), (vx1$113 * sp$141), (0 - (vy1$117 * sp$141))], ["x", "y", "vx", "vy"]) : $R.tup([$R.dot(b$92, "x"), y1$115, (0 - (vx1$113 * sp$141)), (vy1$117 * sp$141)], ["x", "y", "vx", "vy"])), nb$143 = let$142, (subs$89)([$R.isub(n$91, 1), nb$143, px$93, pw$94, (set_at$59)([bs$95, i$133, k2$139]), $R.iadd(score$96, ($R.eq(k$137, 9) ? 0 : ($R.eq(k2$139, 0) ? 10 : 5))), (maxi$87)([h0$119, ($R.eq(k2$139, 0) ? 4 : 3)])]))))) : (subs$89)([$R.isub(n$91, 1), $R.tup([x1$111, y1$115, vx1$113, vy1$117], ["x", "y", "vx", "vy"]), px$93, pw$94, bs$95, score$96, h0$119])))))))))))))))))))))))); }, 12, [maxi$87, brick_at$71, subs$89, at$49, set_at$59]), subs$89); })(), subs$154 = def$88, def$155 = $R.fn((a$156) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$157, target$158, launch$159, let$160, pwf$161, let$162, let$163, t$164, let$165, lo$166, let$167, hi$168, tgt$169, let$170, p0$171, let$172, dp$173, let$174, px$175, let$176, ipx$177, let$178, ml$181, let$182, b0$183, let$184, b$185, bs$186, score$187, hit$188, let$189, s$190; return (g$157 = a$156[0], target$158 = a$156[1], launch$159 = a$156[2], ($R.dot(g$157, "over") ? g$157 : (let$160 = ($R.b["float_of_int"])($R.dot(g$157, "pw")), pwf$161 = let$160, (let$162 = (let$163 = ($R.b["float_of_int"])(target$158), t$164 = let$163, (let$165 = (pwf$161 / 2), lo$166 = let$165, (let$167 = (600 - (pwf$161 / 2)), hi$168 = let$167, ((t$164 < lo$166) ? lo$166 : ((t$164 > hi$168) ? hi$168 : t$164))))), tgt$169 = let$162, (let$170 = ($R.b["float_of_int"])($R.dot(g$157, "px")), p0$171 = let$170, (let$172 = (tgt$169 - p0$171), dp$173 = let$172, (let$174 = (p0$171 + ((dp$173 > 16) ? 16 : ((dp$173 < (0 - 16)) ? (0 - 16) : dp$173))), px$175 = let$174, (let$176 = ($R.b["int_of_float"])(($R.b["floor"])((px$175 + 0.5))), ipx$177 = let$176, (let$178 = $R.fn((a$179) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let f$180; return (f$180 = a$179, ($R.b["int_of_float"])(($R.b["floor"])(((f$180 * 1000) + 0.5)))); }, 13, null), ml$181 = let$178, ($R.dot(g$157, "held") ? (let$189 = (speed$82)($R.dot(g$157, "level")), s$190 = let$189, $R.tup([$R.imul(ipx$177, 1000), 731000, (launch$159 ? (ml$181)((s$190 * 0.45000000000000001)) : 0), (launch$159 ? $R.isub(0, (ml$181)((s$190 * 0.89000000000000001))) : 0), ipx$177, $R.dot(g$157, "pw"), $R.dot(g$157, "bricks"), $R.dot(g$157, "balls"), $R.dot(g$157, "score"), $R.dot(g$157, "level"), (!(launch$159)), false, 0, $R.iadd($R.dot(g$157, "t"), 1)], ["bx", "by", "vx", "vy", "px", "pw", "bricks", "balls", "score", "level", "held", "over", "hit", "t"])) : (let$182 = $R.tup([(($R.b["float_of_int"])($R.dot(g$157, "bx")) / 1000), (($R.b["float_of_int"])($R.dot(g$157, "by")) / 1000), (($R.b["float_of_int"])($R.dot(g$157, "vx")) / 1000), (($R.b["float_of_int"])($R.dot(g$157, "vy")) / 1000)], ["x", "y", "vx", "vy"]), b0$183 = let$182, (let$184 = (subs$154)([4, b0$183, px$175, pwf$161, $R.dot(g$157, "bricks"), $R.dot(g$157, "score"), 0]), b$185 = let$184[0], bs$186 = let$184[1], score$187 = let$184[2], hit$188 = let$184[3], (($R.dot(b$185, "y") > 830) ? $R.tup([$R.imul(ipx$177, 1000), 731000, 0, 0, ipx$177, $R.dot(g$157, "pw"), bs$186, $R.isub($R.dot(g$157, "balls"), 1), score$187, $R.dot(g$157, "level"), true, ($R.dot(g$157, "balls") <= 1), 5, $R.iadd($R.dot(g$157, "t"), 1)], ["bx", "by", "vx", "vy", "px", "pw", "bricks", "balls", "score", "level", "held", "over", "hit", "t"]) : ($R.eq((left_to_break$40)(bs$186), 0) ? $R.tup([$R.imul(ipx$177, 1000), 731000, 0, 0, ipx$177, $R.dot(g$157, "pw"), (layout$32)($R.iadd($R.dot(g$157, "level"), 1)), $R.dot(g$157, "balls"), $R.iadd(score$187, 100), $R.iadd($R.dot(g$157, "level"), 1), true, false, 6, $R.iadd($R.dot(g$157, "t"), 1)], ["bx", "by", "vx", "vy", "px", "pw", "bricks", "balls", "score", "level", "held", "over", "hit", "t"]) : $R.tup([(ml$181)($R.dot(b$185, "x")), (ml$181)($R.dot(b$185, "y")), (ml$181)($R.dot(b$185, "vx")), (ml$181)($R.dot(b$185, "vy")), ipx$177, $R.dot(g$157, "pw"), bs$186, $R.dot(g$157, "balls"), score$187, $R.dot(g$157, "level"), false, false, hit$188, $R.iadd($R.dot(g$157, "t"), 1)], ["bx", "by", "vx", "vy", "px", "pw", "bricks", "balls", "score", "level", "held", "over", "hit", "t"]))))))))))))))); }, 14, [subs$154, layout$32, left_to_break$40, speed$82]), step$191 = def$155, def$192 = $R.fn((a$193) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let x$194, y$195, vx$196, vy$197, let$198, r$199, let$200, svy$201, let$202, dist$203, let$204, w$205, let$206, raw$207, let$208, m$209; return (x$194 = a$193[0], y$195 = a$193[1], vx$196 = a$193[2], vy$197 = a$193[3], (let$198 = 8, r$199 = let$198, (let$200 = ((vy$197 < 0) ? (0 - vy$197) : vy$197), svy$201 = let$200, ((svy$201 < 0.01) ? x$194 : (let$202 = ((vy$197 > 0) ? ((740 - r$199) - y$195) : ((y$195 - r$199) + (740 - (2 * r$199)))), dist$203 = let$202, (let$204 = (600 - (2 * r$199)), w$205 = let$204, (let$206 = ((x$194 - r$199) + ((vx$196 * dist$203) / svy$201)), raw$207 = let$206, (let$208 = (raw$207 - ((2 * w$205) * ($R.b["floor"])((raw$207 / (2 * w$205))))), m$209 = let$208, (r$199 + ((m$209 > w$205) ? ((2 * w$205) - m$209) : m$209)))))))))); }, 15, null), land$210 = def$192, def$211 = (() => { let col_count$212; return (col_count$212 = $R.fn((a$213) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$214, c$215, i$216, m$217, b$218, rest$219; return (bs$214 = a$213[0], c$215 = a$213[1], i$216 = a$213[2], (m$217 = bs$214, ((m$217 === null) ? (0) : ((m$217 !== null) ? (b$218 = m$217.h, rest$219 = m$217.t, $R.iadd((($R.eq((md$6)([i$216, cols$12]), c$215) && ((b$218 > 0) && (!$R.eq(b$218, 9)))) ? 1 : 0), (col_count$212)([rest$219, c$215, $R.iadd(i$216, 1)]))) : $R.nomatch("case"))))); }, 16, [col_count$212, cols$12, md$6]), col_count$212); })(), col_count$220 = def$211, def$221 = (() => { let best_col$222; return (best_col$222 = $R.fn((a$223) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$224, c$225, bc$226, bn$227, let$228, n$229; return (bs$224 = a$223[0], c$225 = a$223[1], bc$226 = a$223[2], bn$227 = a$223[3], ((c$225 >= cols$12) ? bc$226 : (let$228 = (col_count$220)([bs$224, c$225, 0]), n$229 = let$228, ((n$229 > bn$227) ? (best_col$222)([bs$224, $R.iadd(c$225, 1), c$225, n$229]) : (best_col$222)([bs$224, $R.iadd(c$225, 1), bc$226, bn$227]))))); }, 17, [col_count$220, best_col$222, cols$12]), best_col$222); })(), best_col$230 = def$221, def$231 = $R.fn((a$232) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$233, let$234, lx$235, let$236, c$237, let$238, tcx$239, let$240, u0$241, let$242, u$243; return (g$233 = a$232, ($R.dot(g$233, "over") ? $R.tup([$R.dot(g$233, "px"), false], ["target", "launch"]) : ($R.dot(g$233, "held") ? $R.tup([300, (($R.dot(g$233, "px") >= 290) && ($R.dot(g$233, "px") <= 310))], ["target", "launch"]) : (let$234 = (land$210)([(($R.b["float_of_int"])($R.dot(g$233, "bx")) / 1000), (($R.b["float_of_int"])($R.dot(g$233, "by")) / 1000), (($R.b["float_of_int"])($R.dot(g$233, "vx")) / 1000), (($R.b["float_of_int"])($R.dot(g$233, "vy")) / 1000)]), lx$235 = let$234, (let$236 = (best_col$230)([$R.dot(g$233, "bricks"), 0, 4, $R.isub(0, 1)]), c$237 = let$236, (let$238 = ($R.b["float_of_int"])($R.iadd($R.iadd(2, $R.imul(c$237, 60)), 28)), tcx$239 = let$238, (let$240 = ((tcx$239 - lx$235) / 400), u0$241 = let$240, (let$242 = ((u0$241 > 0.69999999999999996) ? 0.69999999999999996 : ((u0$241 < (0 - 0.69999999999999996)) ? (0 - 0.69999999999999996) : u0$241)), u$243 = let$242, $R.tup([($R.b["int_of_float"])(($R.b["floor"])(((lx$235 - (((u$243 * ($R.b["float_of_int"])($R.dot(g$233, "pw"))) / 2) * 0.90000000000000002)) + 0.5))), false], ["target", "launch"]))))))))); }, 18, [land$210, best_col$230]), robot$244 = def$231, $R.tup([md$6, absi$10, cols$12, rows$14, cell$22, layout_from$28, layout$32, left_to_break$40, at$49, set_at$59, brick_at$71, start$76, speed$82, maxi$87, subs$154, step$191, land$210, col_count$220, best_col$230, robot$244], ["md", "absi", "cols", "rows", "cell", "layout_from", "layout", "left_to_break", "at", "set_at", "brick_at", "start", "speed", "maxi", "subs", "step", "land", "col_count", "best_col", "robot"])); })(), Bricks$245 = let$1, $R.tup([$R.dot(Bricks$245, "start"), $R.dot(Bricks$245, "step"), $R.dot(Bricks$245, "layout"), $R.dot(Bricks$245, "robot")], ["start", "step", "layout", "robot"]));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
  const made = "6c5a032106";
  // (ticket 824) Game = (bx, by, vx, vy, px, pw = Int, bricks = [Int], balls, score, level = Int, held, over = Bool, hit, t = Int);
  // Choice = (target = Int, launch = Bool)
  const GAME = ["bx", "by", "vx", "vy", "px", "pw", "bricks", "balls", "score", "level", "held", "over", "hit", "t"];
  const gameIn = g => $R.tup(GAME.map(k => k === "bricks" ? list(g.bricks) : g[k]), GAME);
  const gameOut = r => Object.fromEntries(GAME.map(k => [k, k === "bricks" ? array(r.bricks).map(int) : k === "held" || k === "over" ? r[k] : int(r[k])]));
  // start : (Int, Bool) -> Game (a level, a wide paddle); step : (Game, Int, Bool) -> Game (where the paddle goes, a launch);
  // layout : Int -> [Int]; robot : Game -> Choice
  const start = (l, wide) => gameOut(P.start([l, wide]));
  const step = (g, target, launch) => gameOut(P.step([gameIn(g), target, launch]));
  const layout = l => array(P.layout(l)).map(int);
  const robot = g => { const c = P.robot(gameIn(g)); return { target: int(c.target), launch: c.launch }; };
  const api = { start, step, layout, robot, made };
  // (ticket 797) a game's converters, for node/three-way.mjs to time the page boundary by itself
  try { api.$convert = { gameIn, gameOut }; } catch (e) { /* an oracle: no game crosses */ }
  if (typeof window !== "undefined") window.BricksCompiled = api;
  if (typeof module !== "undefined") module.exports = api;
})();
