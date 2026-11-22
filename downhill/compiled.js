// hazeljs-examples, Downhill: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel 8cebdd10f4 (trial/794-games-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// (ticket 823) The page runs its rules through this file instead of loading hazeljs and building the program, unless asked
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
"use strict";  let let$1, Downhill$331; return (let$1 = (() => { let def$2, md$6, def$7, next$10, def$11, mix$16, def$17, stretch$18, def$19, half$20, def$21, things_from$40, def$41, course$47, def$48, cat$56, def$57, around$63, def$64, angle$69, def$70, none$71, def$72, near$82, def$83, meets$100, def$101, through$114, def$115, start$119, def$120, roll$149, def$150, step$237, def$238, clear$261, def$262, bonus$287, def$288, robot$330; return (def$2 = $R.fn((a$3) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$4, b$5; return (a$4 = a$3[0], b$5 = a$3[1], $R.isub(a$4, $R.imul($R.idiv(a$4, b$5), b$5))); }, 0, null), md$6 = def$2, def$7 = $R.fn((a$8) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$9; return (s$9 = a$8, (md$6)([$R.imul(s$9, 48271), 2147483647])); }, 1, [md$6]), next$10 = def$7, def$11 = $R.fn((a$12) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seed$13, k$14, i$15; return (seed$13 = a$12[0], k$14 = a$12[1], i$15 = a$12[2], (next$10)($R.iadd((next$10)($R.iadd((next$10)($R.iadd($R.iadd(seed$13, 1), $R.imul(k$14, 7919))), $R.imul(i$15, 104729))), 17))); }, 2, [next$10]), mix$16 = def$11, def$17 = 600, stretch$18 = def$17, def$19 = 800, half$20 = def$19, def$21 = (() => { let things_from$22; return (things_from$22 = $R.fn((a$23) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seed$24, k$25, i$26, n$27, let$28, r$29, let$30, roll$31, let$32, kind$33, let$34, x$35, let$36, y$37, let$38, w$39; return (seed$24 = a$23[0], k$25 = a$23[1], i$26 = a$23[2], n$27 = a$23[3], ((i$26 >= n$27) ? null : (let$28 = (mix$16)([seed$24, k$25, i$26]), r$29 = let$28, (let$30 = (md$6)([r$29, 100]), roll$31 = let$30, (let$32 = ((roll$31 < 52) ? 0 : ((roll$31 < 66) ? 1 : ((roll$31 < 74) ? 2 : ((roll$31 < 86) ? 3 : 4)))), kind$33 = let$32, (let$34 = $R.isub((md$6)([$R.idiv(r$29, 100), $R.imul(2, half$20)]), half$20), x$35 = let$34, (let$36 = $R.iadd($R.imul(k$25, stretch$18), (md$6)([$R.idiv(r$29, 300000), stretch$18])), y$37 = let$36, (let$38 = ($R.eq(kind$33, 4) ? $R.iadd(150, (md$6)([$R.idiv(r$29, 7), 120])) : ($R.eq(kind$33, 3) ? $R.iadd(40, (md$6)([$R.idiv(r$29, 11), 40])) : 0)), w$39 = let$38, {h: $R.tup([kind$33, x$35, y$37, w$39], ["kind", "x", "y", "w"]), t: (things_from$22)([seed$24, k$25, $R.iadd(i$26, 1), n$27])})))))))); }, 3, [mix$16, md$6, half$20, stretch$18, things_from$22]), things_from$22); })(), things_from$40 = def$21, def$41 = $R.fn((a$42) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seed$43, k$44, let$45, d$46; return (seed$43 = a$42[0], k$44 = a$42[1], ((k$44 < 2) ? null : (things_from$40)([seed$43, k$44, 0, (let$45 = $R.iadd(5, $R.idiv(k$44, 6)), d$46 = let$45, ((d$46 > 14) ? 14 : d$46))]))); }, 4, [things_from$40]), course$47 = def$41, def$48 = (() => { let cat$49; return (cat$49 = $R.fn((a$50) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$51, ys$52, m$53, x$54, rest$55; return (xs$51 = a$50[0], ys$52 = a$50[1], (m$53 = xs$51, ((m$53 === null) ? (ys$52) : ((m$53 !== null) ? (x$54 = m$53.h, rest$55 = m$53.t, {h: x$54, t: (cat$49)([rest$55, ys$52])}) : $R.nomatch("case"))))); }, 5, [cat$49]), cat$49); })(), cat$56 = def$48, def$57 = $R.fn((a$58) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seed$59, y$60, let$61, k$62; return (seed$59 = a$58[0], y$60 = a$58[1], (let$61 = $R.idiv(($R.b["int_of_float"])(y$60), stretch$18), k$62 = let$61, (cat$56)([(course$47)([seed$59, $R.isub(k$62, 1)]), (cat$56)([(course$47)([seed$59, k$62]), (course$47)([seed$59, $R.iadd(k$62, 1)])])]))); }, 6, [stretch$18, course$47, cat$56]), around$63 = def$57, def$64 = $R.fn((a$65) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let h$66, let$67, a$68; return (h$66 = a$65, (let$67 = ($R.eq(h$66, 0) ? 0 : (($R.eq(h$66, 1) || $R.eq(h$66, $R.isub(0, 1))) ? 0.41999999999999998 : (($R.eq(h$66, 2) || $R.eq(h$66, $R.isub(0, 2))) ? 0.87 : 1.5708))), a$68 = let$67, ((h$66 < 0) ? (0 - a$68) : a$68))); }, 7, null), angle$69 = def$64, def$70 = $R.tup([9, 0, 0, 0], ["kind", "x", "y", "w"]), none$71 = def$70, def$72 = $R.fn((a$73) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let th$74, x$75, y$76, r$77, let$78, dx$79, let$80, dy$81; return (th$74 = a$73[0], x$75 = a$73[1], y$76 = a$73[2], r$77 = a$73[3], (let$78 = (($R.b["float_of_int"])($R.dot(th$74, "x")) - x$75), dx$79 = let$78, (let$80 = (($R.b["float_of_int"])($R.dot(th$74, "y")) - y$76), dy$81 = let$80, (((dx$79 * dx$79) + (dy$81 * dy$81)) < (r$77 * r$77))))); }, 8, null), near$82 = def$72, def$83 = (() => { let meets$84; return (meets$84 = $R.fn((a$85) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ts$86, x0$87, y0$88, x1$89, y1$90, m$91, th$92, rest$93, let$94, xm$95, let$96, ym$97, let$98, r$99; return (ts$86 = a$85[0], x0$87 = a$85[1], y0$88 = a$85[2], x1$89 = a$85[3], y1$90 = a$85[4], (m$91 = ts$86, ((m$91 === null) ? (none$71) : ((m$91 !== null) ? (th$92 = m$91.h, rest$93 = m$91.t, (let$94 = ((x0$87 + x1$89) / 2), xm$95 = let$94, (let$96 = ((y0$88 + y1$90) / 2), ym$97 = let$96, (let$98 = ($R.eq($R.dot(th$92, "kind"), 0) ? 16 : ($R.eq($R.dot(th$92, "kind"), 1) ? 13 : ($R.eq($R.dot(th$92, "kind"), 2) ? 24 : ($R.eq($R.dot(th$92, "kind"), 3) ? ($R.b["float_of_int"])($R.dot(th$92, "w")) : 0)))), r$99 = let$98, (((!$R.eq($R.dot(th$92, "kind"), 4)) && ((near$82)([th$92, x1$89, y1$90, r$99]) || (near$82)([th$92, xm$95, ym$97, r$99]))) ? th$92 : (meets$84)([rest$93, x0$87, y0$88, x1$89, y1$90])))))) : $R.nomatch("case"))))); }, 9, [meets$84, near$82, none$71]), meets$84); })(), meets$100 = def$83, def$101 = (() => { let through$102; return (through$102 = $R.fn((a$103) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ts$104, x0$105, y0$106, x1$107, y1$108, m$109, th$110, rest$111, let$112, xm$113; return (ts$104 = a$103[0], x0$105 = a$103[1], y0$106 = a$103[2], x1$107 = a$103[3], y1$108 = a$103[4], (m$109 = ts$104, ((m$109 === null) ? (false) : ((m$109 !== null) ? (th$110 = m$109.h, rest$111 = m$109.t, (($R.eq($R.dot(th$110, "kind"), 4) && ((y0$106 < ($R.b["float_of_int"])($R.dot(th$110, "y"))) && ((y1$108 >= ($R.b["float_of_int"])($R.dot(th$110, "y"))) && (let$112 = ((x0$105 + x1$107) / 2), xm$113 = let$112, ((xm$113 > ($R.b["float_of_int"])($R.isub($R.dot(th$110, "x"), $R.idiv($R.dot(th$110, "w"), 2)))) && (xm$113 < ($R.b["float_of_int"])($R.iadd($R.dot(th$110, "x"), $R.idiv($R.dot(th$110, "w"), 2))))))))) || (through$102)([rest$111, x0$105, y0$106, x1$107, y1$108]))) : $R.nomatch("case"))))); }, 10, [through$102]), through$102); })(), through$114 = def$101, def$115 = $R.fn((a$116) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seed$117, chase$118; return (seed$117 = a$116[0], chase$118 = a$116[1], $R.tup([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, false, false, 0, seed$117, 0, chase$118], ["x", "y", "speed", "heading", "air", "rise", "down", "score", "gates", "jumps", "bx", "by", "br", "rolling", "over", "hit", "seed", "t", "chase"])); }, 11, null), start$119 = def$115, def$120 = $R.fn((a$121) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$122, x$123, y$124, let$125, bx0$126, let$127, by0$128, let$129, br0$130, let$131, let$132, v$133, vb$134, let$135, bya$136, let$137, by1$138, let$139, dx$140, let$141, bx1$142, let$143, br1$144, let$145, ex$146, let$147, ey$148; return (g$122 = a$121[0], x$123 = a$121[1], y$124 = a$121[2], (let$125 = (($R.b["float_of_int"])($R.dot(g$122, "bx")) / 100), bx0$126 = let$125, (let$127 = (($R.b["float_of_int"])($R.dot(g$122, "by")) / 100), by0$128 = let$127, (let$129 = (($R.b["float_of_int"])($R.dot(g$122, "br")) / 100), br0$130 = let$129, ((!($R.dot(g$122, "chase"))) ? [0, 0, 0, false, false] : ((!($R.dot(g$122, "rolling"))) ? ((y$124 > 75000) ? [x$123, (y$124 - 1300), 34, true, false] : [0, 0, 0, false, false]) : (let$131 = (let$132 = (8.5999999999999996 + ((y$124 - 75000) / 60000)), v$133 = let$132, ((v$133 > 12.4) ? 12.4 : v$133)), vb$134 = let$131, (let$135 = (by0$128 + vb$134), bya$136 = let$135, (let$137 = ((bya$136 < (y$124 - 1800)) ? (y$124 - 1800) : bya$136), by1$138 = let$137, (let$139 = (x$123 - bx0$126), dx$140 = let$139, (let$141 = (bx0$126 + ((dx$140 > 2.6000000000000001) ? 2.6000000000000001 : ((dx$140 < (0 - 2.6000000000000001)) ? (0 - 2.6000000000000001) : dx$140))), bx1$142 = let$141, (let$143 = ((br0$130 < 88) ? (br0$130 + 0.012) : br0$130), br1$144 = let$143, (let$145 = (x$123 - bx1$142), ex$146 = let$145, (let$147 = (y$124 - by1$138), ey$148 = let$147, [bx1$142, by1$138, br1$144, true, (((ex$146 * ex$146) + (ey$148 * ey$148)) < ((br1$144 + 8) * (br1$144 + 8)))])))))))))))))); }, 12, null), roll$149 = def$120, def$150 = $R.fn((a$151) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$152, turn$153, tuck$154, let$155, hu$158, let$159, x0$160, let$161, y0$162, let$163, v0$164, let$165, z0$166, let$167, w0$168, let$169, flying$170, let$171, lying$172, let$173, let$174, h$175, h1$176, let$177, a$178, let$179, low$180, let$181, drag$182, let$183, across$184, let$185, v1$186, let$187, v2$188, let$189, xa$190, let$191, x1$192, let$193, y1$194, let$195, z1$196, let$197, landed$198, let$199, z2$200, let$201, w1$202, let$203, ts$204, let$205, th$206, let$207, k$208, let$209, fall$210, let$211, jump$212, let$213, bumps$214, let$215, gate$216, let$217, v3$218, let$219, y3$220, let$221, rise$222, let$223, down$224, let$225, h3$226, let$227, bonus$228, let$229, hit$230, let$231, bx$232, by$233, br$234, rolling$235, caught$236; return (g$152 = a$151[0], turn$153 = a$151[1], tuck$154 = a$151[2], ($R.dot(g$152, "over") ? g$152 : (let$155 = $R.fn((a$156) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let f$157; return (f$157 = a$156, ($R.b["int_of_float"])(($R.b["floor"])(((f$157 * 100) + 0.5)))); }, 13, null), hu$158 = let$155, (let$159 = (($R.b["float_of_int"])($R.dot(g$152, "x")) / 100), x0$160 = let$159, (let$161 = (($R.b["float_of_int"])($R.dot(g$152, "y")) / 100), y0$162 = let$161, (let$163 = (($R.b["float_of_int"])($R.dot(g$152, "speed")) / 100), v0$164 = let$163, (let$165 = (($R.b["float_of_int"])($R.dot(g$152, "air")) / 100), z0$166 = let$165, (let$167 = (($R.b["float_of_int"])($R.dot(g$152, "rise")) / 100), w0$168 = let$167, (let$169 = ((z0$166 > 0) || (w0$168 > 0)), flying$170 = let$169, (let$171 = ($R.dot(g$152, "down") > 0), lying$172 = let$171, (let$173 = ((lying$172 || flying$170) ? $R.dot(g$152, "heading") : (let$174 = $R.iadd($R.dot(g$152, "heading"), turn$153), h$175 = let$174, ((h$175 > 3) ? 3 : ((h$175 < $R.isub(0, 3)) ? $R.isub(0, 3) : h$175)))), h1$176 = let$173, (let$177 = (angle$69)(h1$176), a$178 = let$177, (let$179 = ((h1$176 >= $R.isub(0, 1)) && (h1$176 <= 1)), low$180 = let$179, (let$181 = ((tuck$154 && low$180) ? 0.00044999999999999999 : 0.00089999999999999998), drag$182 = let$181, (let$183 = ($R.eq(h1$176, 3) || $R.eq(h1$176, $R.isub(0, 3))), across$184 = let$183, (let$185 = (lying$172 ? 0 : (flying$170 ? v0$164 : (((v0$164 + (0.089999999999999997 * ($R.b["cos"])(a$178))) - ((drag$182 * v0$164) * v0$164)) - (across$184 ? 0.12 : 0.0040000000000000001)))), v1$186 = let$185, (let$187 = ((v1$186 < 0) ? 0 : v1$186), v2$188 = let$187, (let$189 = (x0$160 + (v2$188 * ($R.b["sin"])(a$178))), xa$190 = let$189, (let$191 = ((xa$190 > 1000) ? 1000 : ((xa$190 < (0 - 1000)) ? (0 - 1000) : xa$190)), x1$192 = let$191, (let$193 = (y0$162 + (v2$188 * ($R.b["cos"])(a$178))), y1$194 = let$193, (let$195 = (flying$170 ? (z0$166 + w0$168) : 0), z1$196 = let$195, (let$197 = (flying$170 && (z1$196 <= 0)), landed$198 = let$197, (let$199 = (landed$198 ? 0 : z1$196), z2$200 = let$199, (let$201 = ((flying$170 && (!(landed$198))) ? (w0$168 - 0.22) : 0), w1$202 = let$201, (let$203 = (around$63)([$R.dot(g$152, "seed"), y1$194]), ts$204 = let$203, (let$205 = ((lying$172 || (z2$200 > 6)) ? none$71 : (meets$100)([ts$204, x0$160, y0$162, x1$192, y1$194])), th$206 = let$205, (let$207 = $R.dot(th$206, "kind"), k$208 = let$207, (let$209 = (($R.eq(k$208, 0) && (z2$200 < 40)) || ($R.eq(k$208, 1) && (z2$200 <= 0))), fall$210 = let$209, (let$211 = ($R.eq(k$208, 2) && (!(flying$170))), jump$212 = let$211, (let$213 = ($R.eq(k$208, 3) && (!(flying$170))), bumps$214 = let$213, (let$215 = ((!(lying$172)) && (through$114)([ts$204, x0$160, y0$162, x1$192, y1$194])), gate$216 = let$215, (let$217 = (fall$210 ? 0 : (bumps$214 ? (v2$188 * 0.93000000000000005) : v2$188)), v3$218 = let$217, (let$219 = (fall$210 ? (($R.b["float_of_int"])($R.dot(th$206, "y")) + 26) : y1$194), y3$220 = let$219, (let$221 = (jump$212 ? (3.2000000000000002 + (v2$188 * 0.32000000000000001)) : w1$202), rise$222 = let$221, (let$223 = (fall$210 ? 50 : (lying$172 ? $R.isub($R.dot(g$152, "down"), 1) : 0)), down$224 = let$223, (let$225 = (fall$210 ? 0 : h1$176), h3$226 = let$225, (let$227 = $R.iadd((gate$216 ? 50 : 0), (jump$212 ? 25 : 0)), bonus$228 = let$227, (let$229 = (fall$210 ? ($R.eq(k$208, 0) ? 1 : 2) : (jump$212 ? 3 : (gate$216 ? 4 : (bumps$214 ? 6 : 0)))), hit$230 = let$229, (let$231 = (roll$149)([g$152, x1$192, y3$220]), bx$232 = let$231[0], by$233 = let$231[1], br$234 = let$231[2], rolling$235 = let$231[3], caught$236 = let$231[4], $R.tup([(hu$158)(x1$192), (hu$158)(y3$220), (hu$158)(v3$218), h3$226, (hu$158)(z2$200), (hu$158)(rise$222), down$224, $R.iadd($R.dot(g$152, "score"), bonus$228), $R.iadd($R.dot(g$152, "gates"), (gate$216 ? 1 : 0)), $R.iadd($R.dot(g$152, "jumps"), (jump$212 ? 1 : 0)), (hu$158)(bx$232), (hu$158)(by$233), (hu$158)(br$234), rolling$235, caught$236, (caught$236 ? 5 : hit$230), $R.dot(g$152, "seed"), $R.iadd($R.dot(g$152, "t"), 1), $R.dot(g$152, "chase")], ["x", "y", "speed", "heading", "air", "rise", "down", "score", "gates", "jumps", "bx", "by", "br", "rolling", "over", "hit", "seed", "t", "chase"])))))))))))))))))))))))))))))))))))))))); }, 14, [angle$69, around$63, meets$100, none$71, through$114, roll$149]), step$237 = def$150, def$238 = (() => { let clear$239; return (clear$239 = $R.fn((a$240) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ts$241, x$242, y$243, dx$244, dy$245, m$246, th$247, rest$248, let$249, c$250, let$251, px$252, let$253, py$254, let$255, along$256, let$257, off$258, let$259, offa$260; return (ts$241 = a$240[0], x$242 = a$240[1], y$243 = a$240[2], dx$244 = a$240[3], dy$245 = a$240[4], (m$246 = ts$241, ((m$246 === null) ? (320) : ((m$246 !== null) ? (th$247 = m$246.h, rest$248 = m$246.t, (let$249 = (clear$239)([rest$248, x$242, y$243, dx$244, dy$245]), c$250 = let$249, (($R.eq($R.dot(th$247, "kind"), 0) || $R.eq($R.dot(th$247, "kind"), 1)) ? (let$251 = (($R.b["float_of_int"])($R.dot(th$247, "x")) - x$242), px$252 = let$251, (let$253 = (($R.b["float_of_int"])($R.dot(th$247, "y")) - y$243), py$254 = let$253, (let$255 = ((px$252 * dx$244) + (py$254 * dy$245)), along$256 = let$255, (let$257 = ((px$252 * dy$245) - (py$254 * dx$244)), off$258 = let$257, (let$259 = ((off$258 < 0) ? (0 - off$258) : off$258), offa$260 = let$259, (((along$256 > 0) && ((along$256 < c$250) && (offa$260 < 30))) ? along$256 : c$250)))))) : c$250))) : $R.nomatch("case"))))); }, 15, [clear$239]), clear$239); })(), clear$261 = def$238, def$262 = (() => { let bonus$263; return (bonus$263 = $R.fn((a$264) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ts$265, x$266, y$267, dx$268, dy$269, m$270, th$271, rest$272, let$273, let$274, px$275, let$276, py$277, let$278, along$279, let$280, off$281, let$282, offa$283, let$284, room$285, b$286; return (ts$265 = a$264[0], x$266 = a$264[1], y$267 = a$264[2], dx$268 = a$264[3], dy$269 = a$264[4], (m$270 = ts$265, ((m$270 === null) ? (0) : ((m$270 !== null) ? (th$271 = m$270.h, rest$272 = m$270.t, (let$273 = (($R.eq($R.dot(th$271, "kind"), 4) || $R.eq($R.dot(th$271, "kind"), 2)) ? (let$274 = (($R.b["float_of_int"])($R.dot(th$271, "x")) - x$266), px$275 = let$274, (let$276 = (($R.b["float_of_int"])($R.dot(th$271, "y")) - y$267), py$277 = let$276, (let$278 = ((px$275 * dx$268) + (py$277 * dy$269)), along$279 = let$278, (let$280 = ((px$275 * dy$269) - (py$277 * dx$268)), off$281 = let$280, (let$282 = ((off$281 < 0) ? (0 - off$281) : off$281), offa$283 = let$282, (let$284 = ($R.eq($R.dot(th$271, "kind"), 4) ? ((($R.b["float_of_int"])($R.dot(th$271, "w")) / 2) - 12) : 14), room$285 = let$284, (((along$279 > 0) && ((along$279 < 260) && (offa$283 < room$285))) ? ($R.eq($R.dot(th$271, "kind"), 4) ? 90 : 40) : 0))))))) : 0), b$286 = let$273, (b$286 + (bonus$263)([rest$272, x$266, y$267, dx$268, dy$269])))) : $R.nomatch("case"))))); }, 16, [bonus$263]), bonus$263); })(), bonus$287 = def$262, def$288 = $R.fn((a$289) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$290, let$291, x$292, let$293, y$294, let$295, ts$296, let$297, worth$318, let$319, best$327, let$328, h$329; return (g$290 = a$289, (($R.dot(g$290, "over") || (($R.dot(g$290, "down") > 0) || (($R.dot(g$290, "air") > 0) || ($R.dot(g$290, "rise") > 0)))) ? $R.tup([0, false], ["turn", "tuck"]) : (let$291 = (($R.b["float_of_int"])($R.dot(g$290, "x")) / 100), x$292 = let$291, (let$293 = (($R.b["float_of_int"])($R.dot(g$290, "y")) / 100), y$294 = let$293, (let$295 = (around$63)([$R.dot(g$290, "seed"), (y$294 + 300)]), ts$296 = let$295, (let$297 = $R.fn((a$298) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let h$299, let$300, a$301, let$302, dx$303, let$304, dy$305, let$306, c$307, let$308, ahead$309, let$310, edge$311, let$312, lean$313, let$314, let$315, d$316, swing$317; return (h$299 = a$298, (let$300 = (angle$69)(h$299), a$301 = let$300, (let$302 = ($R.b["sin"])(a$301), dx$303 = let$302, (let$304 = ($R.b["cos"])(a$301), dy$305 = let$304, (let$306 = (clear$261)([ts$296, x$292, y$294, dx$303, dy$305]), c$307 = let$306, (let$308 = (x$292 + (dx$303 * 200)), ahead$309 = let$308, (let$310 = (((ahead$309 > 760) || (ahead$309 < (0 - 760))) ? 300 : 0), edge$311 = let$310, (let$312 = ((h$299 < 0) ? $R.isub(0, h$299) : h$299), lean$313 = let$312, (let$314 = (let$315 = $R.isub(h$299, $R.dot(g$290, "heading")), d$316 = let$315, ((d$316 < 0) ? $R.isub(0, d$316) : d$316)), swing$317 = let$314, (((((c$307 * 2) + (bonus$287)([ts$296, x$292, y$294, dx$303, dy$305])) - ($R.b["float_of_int"])($R.imul(lean$313, 25))) - ($R.b["float_of_int"])($R.imul(swing$317, 15))) - edge$311)))))))))); }, 17, [angle$69, ts$296, x$292, y$294, clear$261, g$290, bonus$287]), worth$318 = let$297, (let$319 = (() => { let best$320; return (best$320 = $R.fn((a$321) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let h$322, bh$323, bw$324, let$325, w$326; return (h$322 = a$321[0], bh$323 = a$321[1], bw$324 = a$321[2], ((h$322 > 2) ? bh$323 : (let$325 = (worth$318)(h$322), w$326 = let$325, ((w$326 > bw$324) ? (best$320)([$R.iadd(h$322, 1), h$322, w$326]) : (best$320)([$R.iadd(h$322, 1), bh$323, bw$324]))))); }, 18, [worth$318, best$320]), best$320); })(), best$327 = let$319, (let$328 = (best$327)([$R.isub(0, 2), 0, (0 - 100000)]), h$329 = let$328, $R.tup([((h$329 > $R.dot(g$290, "heading")) ? 1 : ((h$329 < $R.dot(g$290, "heading")) ? $R.isub(0, 1) : 0)), ($R.eq(h$329, 0) && ((clear$261)([ts$296, x$292, y$294, 0, 1]) > 250))], ["turn", "tuck"]))))))))); }, 19, [around$63, angle$69, clear$261, bonus$287]), robot$330 = def$288, $R.tup([md$6, next$10, mix$16, stretch$18, half$20, things_from$40, course$47, cat$56, around$63, angle$69, none$71, near$82, meets$100, through$114, start$119, roll$149, step$237, clear$261, bonus$287, robot$330], ["md", "next", "mix", "stretch", "half", "things_from", "course", "cat", "around", "angle", "none", "near", "meets", "through", "start", "roll", "step", "clear", "bonus", "robot"])); })(), Downhill$331 = let$1, $R.tup([$R.dot(Downhill$331, "start"), $R.dot(Downhill$331, "step"), $R.dot(Downhill$331, "course"), $R.dot(Downhill$331, "robot")], ["start", "step", "course", "robot"]));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
  const made = "8cebdd10f4";
  // (ticket 823) Run = (x, y, speed, heading, air, rise, down, score, gates, jumps, bx, by, br = Int, rolling, over = Bool, hit, seed,
  // t = Int, chase = Bool); Thing = (kind, x, y, w = Int); Choice = (turn = Int, tuck = Bool)
  const RUN = ["x", "y", "speed", "heading", "air", "rise", "down", "score", "gates", "jumps", "bx", "by", "br", "rolling", "over", "hit", "seed", "t", "chase"];
  const FLAGS = new Set(["rolling", "over", "chase"]);
  const runIn = g => $R.tup(RUN.map(k => g[k]), RUN);
  const runOut = r => Object.fromEntries(RUN.map(k => [k, FLAGS.has(k) ? r[k] : int(r[k])]));
  // start : (Int, Bool) -> Run (a seed, whether a snowball comes); step : (Run, Int, Bool) -> Run (a turn, -1, 0 or 1, and
  // crouching); course : (Int, Int) -> [Thing] (a seed, a stretch); robot : Run -> Choice
  const start = (seed, chase) => runOut(P.start([seed, chase]));
  const step = (g, turn, tuck) => runOut(P.step([runIn(g), turn, tuck]));
  const course = (seed, k) => array(P.course([seed, k])).map(t => ({ kind: int(t.kind), x: int(t.x), y: int(t.y), w: int(t.w) }));
  const robot = g => { const c = P.robot(runIn(g)); return { turn: int(c.turn), tuck: c.tuck }; };
  const api = { start, step, course, robot, made };
  // (ticket 797) a game's converters, for node/three-way.mjs to time the page boundary by itself
  try { api.$convert = { gameIn, gameOut }; } catch (e) { /* an oracle: no game crosses */ }
  if (typeof window !== "undefined") window.DownhillCompiled = api;
  if (typeof module !== "undefined") module.exports = api;
})();
