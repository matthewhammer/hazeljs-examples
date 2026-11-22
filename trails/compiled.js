// hazeljs-examples, Light trails: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel fa59db9586 (trial/794-games-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// (ticket 826) The page runs its rules through this file instead of loading hazeljs and building the program, unless asked
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
"use strict";  let let$1, Trails$187; return (let$1 = (() => { let def$2, w$3, def$4, h$5, def$6, md$10, def$11, pow2$15, def$16, at$24, def$25, set_at$34, def$35, zeros$39, def$40, lit_at$45, def$46, light$53, def$54, dx$57, def$58, dy$61, def$62, start$67, def$68, step$97, def$98, flood$139, def$140, absi$143, def$144, robot$186; return (def$2 = 40, w$3 = def$2, def$4 = 30, h$5 = def$4, def$6 = $R.fn((a$7) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$8, b$9; return (a$8 = a$7[0], b$9 = a$7[1], $R.isub(a$8, $R.imul($R.idiv(a$8, b$9), b$9))); }, 0, null), md$10 = def$6, def$11 = (() => { let pow2$12; return (pow2$12 = $R.fn((a$13) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$14; return (b$14 = a$13, ((b$14 <= 0) ? 1 : $R.imul(2, (pow2$12)($R.isub(b$14, 1))))); }, 1, [pow2$12]), pow2$12); })(), pow2$15 = def$11, def$16 = (() => { let at$17; return (at$17 = $R.fn((a$18) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$19, i$20, m$21, x$22, rest$23; return (xs$19 = a$18[0], i$20 = a$18[1], (m$21 = xs$19, ((m$21 === null) ? (0) : ((m$21 !== null) ? (x$22 = m$21.h, rest$23 = m$21.t, ((i$20 <= 0) ? x$22 : (at$17)([rest$23, $R.isub(i$20, 1)]))) : $R.nomatch("case"))))); }, 2, [at$17]), at$17); })(), at$24 = def$16, def$25 = (() => { let set_at$26; return (set_at$26 = $R.fn((a$27) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$28, i$29, v$30, m$31, x$32, rest$33; return (xs$28 = a$27[0], i$29 = a$27[1], v$30 = a$27[2], (m$31 = xs$28, ((m$31 === null) ? (null) : ((m$31 !== null) ? (x$32 = m$31.h, rest$33 = m$31.t, ((i$29 <= 0) ? {h: v$30, t: rest$33} : {h: x$32, t: (set_at$26)([rest$33, $R.isub(i$29, 1), v$30])})) : $R.nomatch("case"))))); }, 3, [set_at$26]), set_at$26); })(), set_at$34 = def$25, def$35 = (() => { let zeros$36; return (zeros$36 = $R.fn((a$37) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let k$38; return (k$38 = a$37, ((k$38 <= 0) ? null : {h: 0, t: (zeros$36)($R.isub(k$38, 1))})); }, 4, [zeros$36]), zeros$36); })(), zeros$39 = def$35, def$40 = $R.fn((a$41) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$42, x$43, y$44; return (g$42 = a$41[0], x$43 = a$41[1], y$44 = a$41[2], (((x$43 < 0) || ((x$43 >= w$3) || ((y$44 < 0) || (y$44 >= h$5)))) ? true : $R.eq((md$10)([$R.idiv((at$24)([g$42, $R.iadd($R.imul(2, y$44), $R.idiv(x$43, 20))]), (pow2$15)((md$10)([x$43, 20]))), 2]), 1))); }, 5, [md$10, pow2$15, at$24, h$5, w$3]), lit_at$45 = def$40, def$46 = $R.fn((a$47) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$48, x$49, y$50, let$51, i$52; return (g$48 = a$47[0], x$49 = a$47[1], y$50 = a$47[2], ((lit_at$45)([g$48, x$49, y$50]) ? g$48 : (let$51 = $R.iadd($R.imul(2, y$50), $R.idiv(x$49, 20)), i$52 = let$51, (set_at$34)([g$48, i$52, $R.iadd((at$24)([g$48, i$52]), (pow2$15)((md$10)([x$49, 20])))])))); }, 6, [md$10, pow2$15, at$24, set_at$34, lit_at$45]), light$53 = def$46, def$54 = $R.fn((a$55) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let d$56; return (d$56 = a$55, ($R.eq(d$56, 1) ? 1 : ($R.eq(d$56, 3) ? $R.isub(0, 1) : 0))); }, 7, null), dx$57 = def$54, def$58 = $R.fn((a$59) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let d$60; return (d$60 = a$59, ($R.eq(d$60, 0) ? $R.isub(0, 1) : ($R.eq(d$60, 2) ? 1 : 0))); }, 8, null), dy$61 = def$58, def$62 = $R.fn((a$63) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let _seed$64, let$65, g$66; return (_seed$64 = a$63, (let$65 = (light$53)([(light$53)([(zeros$39)($R.imul(2, h$5)), 6, $R.idiv(h$5, 2)]), $R.isub(w$3, 7), $R.idiv(h$5, 2)]), g$66 = let$65, $R.tup([6, $R.idiv(h$5, 2), 1, $R.isub(w$3, 7), $R.idiv(h$5, 2), 3, g$66, false, 0, 0], ["ax", "ay", "ad", "bx", "by", "bd", "lit", "over", "winner", "t"]))); }, 9, [h$5, zeros$39, light$53, w$3]), start$67 = def$62, def$68 = $R.fn((a$69) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$70, wa$71, wb$72, let$73, ad$74, let$75, bd$76, let$77, ax$78, let$79, ay$80, let$81, bx$82, let$83, by$84, let$85, meet$86, let$87, acrash$88, let$89, bcrash$90, let$91, over$92, let$93, lit$94, let$95, lit2$96; return (g$70 = a$69[0], wa$71 = a$69[1], wb$72 = a$69[2], ($R.dot(g$70, "over") ? g$70 : (let$73 = (((wa$71 >= 0) && ((wa$71 <= 3) && (!$R.eq(wa$71, (md$10)([$R.iadd($R.dot(g$70, "ad"), 2), 4]))))) ? wa$71 : $R.dot(g$70, "ad")), ad$74 = let$73, (let$75 = (((wb$72 >= 0) && ((wb$72 <= 3) && (!$R.eq(wb$72, (md$10)([$R.iadd($R.dot(g$70, "bd"), 2), 4]))))) ? wb$72 : $R.dot(g$70, "bd")), bd$76 = let$75, (let$77 = $R.iadd($R.dot(g$70, "ax"), (dx$57)(ad$74)), ax$78 = let$77, (let$79 = $R.iadd($R.dot(g$70, "ay"), (dy$61)(ad$74)), ay$80 = let$79, (let$81 = $R.iadd($R.dot(g$70, "bx"), (dx$57)(bd$76)), bx$82 = let$81, (let$83 = $R.iadd($R.dot(g$70, "by"), (dy$61)(bd$76)), by$84 = let$83, (let$85 = ($R.eq(ax$78, bx$82) && $R.eq(ay$80, by$84)), meet$86 = let$85, (let$87 = (meet$86 || (lit_at$45)([$R.dot(g$70, "lit"), ax$78, ay$80])), acrash$88 = let$87, (let$89 = (meet$86 || (lit_at$45)([$R.dot(g$70, "lit"), bx$82, by$84])), bcrash$90 = let$89, (let$91 = (acrash$88 || bcrash$90), over$92 = let$91, (let$93 = (acrash$88 ? $R.dot(g$70, "lit") : (light$53)([$R.dot(g$70, "lit"), ax$78, ay$80])), lit$94 = let$93, (let$95 = (bcrash$90 ? lit$94 : (light$53)([lit$94, bx$82, by$84])), lit2$96 = let$95, $R.tup([ax$78, ay$80, ad$74, bx$82, by$84, bd$76, lit2$96, over$92, ((acrash$88 && bcrash$90) ? 0 : (acrash$88 ? 2 : (bcrash$90 ? 1 : 0))), $R.iadd($R.dot(g$70, "t"), 1)], ["ax", "ay", "ad", "bx", "by", "bd", "lit", "over", "winner", "t"]))))))))))))))); }, 10, [md$10, dx$57, dy$61, lit_at$45, light$53]), step$97 = def$68, def$98 = (() => { let flood$99; return (flood$99 = $R.fn((a$100) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seen$101, frontier$102, count$103, want$104, m$105, k$106, rest$107, let$108, x$109, let$110, y$111, let$112, add$122, let$123, s0$124, f0$125, c0$126, let$127, s1$128, f1$129, c1$130, let$131, s2$132, f2$133, c2$134, let$135, s3$136, f3$137, c3$138; return (seen$101 = a$100[0], frontier$102 = a$100[1], count$103 = a$100[2], want$104 = a$100[3], ((count$103 >= want$104) ? count$103 : (m$105 = frontier$102, ((m$105 === null) ? (count$103) : ((m$105 !== null) ? (k$106 = m$105.h, rest$107 = m$105.t, (let$108 = (md$10)([k$106, w$3]), x$109 = let$108, (let$110 = $R.idiv(k$106, w$3), y$111 = let$110, (let$112 = $R.fn((a$113) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let sn$114, fr$115, c$116, d$117, let$118, nx$119, let$120, ny$121; return (sn$114 = a$113[0], fr$115 = a$113[1], c$116 = a$113[2], d$117 = a$113[3], (let$118 = $R.iadd(x$109, (dx$57)(d$117)), nx$119 = let$118, (let$120 = $R.iadd(y$111, (dy$61)(d$117)), ny$121 = let$120, ((lit_at$45)([sn$114, nx$119, ny$121]) ? [sn$114, fr$115, c$116] : [(light$53)([sn$114, nx$119, ny$121]), {h: $R.iadd($R.imul(ny$121, w$3), nx$119), t: fr$115}, $R.iadd(c$116, 1)])))); }, 11, [dx$57, x$109, dy$61, y$111, light$53, w$3, lit_at$45]), add$122 = let$112, (let$123 = (add$122)([seen$101, rest$107, count$103, 0]), s0$124 = let$123[0], f0$125 = let$123[1], c0$126 = let$123[2], (let$127 = (add$122)([s0$124, f0$125, c0$126, 1]), s1$128 = let$127[0], f1$129 = let$127[1], c1$130 = let$127[2], (let$131 = (add$122)([s1$128, f1$129, c1$130, 2]), s2$132 = let$131[0], f2$133 = let$131[1], c2$134 = let$131[2], (let$135 = (add$122)([s2$132, f2$133, c2$134, 3]), s3$136 = let$135[0], f3$137 = let$135[1], c3$138 = let$135[2], (flood$99)([s3$136, f3$137, c3$138, want$104]))))))))) : $R.nomatch("case")))))); }, 12, [w$3, md$10, dx$57, dy$61, light$53, lit_at$45, flood$99]), flood$99); })(), flood$139 = def$98, def$140 = $R.fn((a$141) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let v$142; return (v$142 = a$141, ((v$142 < 0) ? $R.isub(0, v$142) : v$142)); }, 13, null), absi$143 = def$140, def$144 = $R.fn((a$145) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$146, who$147, care$148, slip$149, luck$150, let$151, x$152, let$153, y$154, let$155, d0$156, let$157, ox$158, let$159, oy$160, let$161, worth$174, let$175, pick$183, let$184, d0$185; return (g$146 = a$145[0], who$147 = a$145[1], care$148 = a$145[2], slip$149 = a$145[3], luck$150 = a$145[4], ($R.dot(g$146, "over") ? $R.isub(0, 1) : ((luck$150 < slip$149) ? (let$184 = ($R.eq(who$147, 1) ? $R.dot(g$146, "ad") : $R.dot(g$146, "bd")), d0$185 = let$184, (md$10)([$R.iadd($R.iadd(d0$185, 3), (md$10)([luck$150, 3])), 4])) : (let$151 = ($R.eq(who$147, 1) ? $R.dot(g$146, "ax") : $R.dot(g$146, "bx")), x$152 = let$151, (let$153 = ($R.eq(who$147, 1) ? $R.dot(g$146, "ay") : $R.dot(g$146, "by")), y$154 = let$153, (let$155 = ($R.eq(who$147, 1) ? $R.dot(g$146, "ad") : $R.dot(g$146, "bd")), d0$156 = let$155, (let$157 = ($R.eq(who$147, 1) ? $R.dot(g$146, "bx") : $R.dot(g$146, "ax")), ox$158 = let$157, (let$159 = ($R.eq(who$147, 1) ? $R.dot(g$146, "by") : $R.dot(g$146, "ay")), oy$160 = let$159, (let$161 = $R.fn((a$162) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let d$163, let$164, nx$165, let$166, ny$167, let$168, near$169, let$170, seen$171, let$172, room$173; return (d$163 = a$162, (let$164 = $R.iadd(x$152, (dx$57)(d$163)), nx$165 = let$164, (let$166 = $R.iadd(y$154, (dy$61)(d$163)), ny$167 = let$166, (($R.eq(d$163, (md$10)([$R.iadd(d0$156, 2), 4])) || (lit_at$45)([$R.dot(g$146, "lit"), nx$165, ny$167])) ? $R.isub(0, 100000) : (let$168 = ($R.iadd((absi$143)($R.isub(nx$165, ox$158)), (absi$143)($R.isub(ny$167, oy$160))) <= 1), near$169 = let$168, (let$170 = (light$53)([$R.dot(g$146, "lit"), nx$165, ny$167]), seen$171 = let$170, (let$172 = (flood$139)([seen$171, {h: $R.iadd($R.imul(ny$167, w$3), nx$165), t: null}, 1, care$148]), room$173 = let$172, $R.iadd($R.isub($R.imul(room$173, 10), (near$169 ? 40 : 0)), ($R.eq(d$163, d0$156) ? 3 : 0))))))))); }, 14, [dx$57, x$152, dy$61, y$154, oy$160, absi$143, ox$158, g$146, light$53, w$3, care$148, flood$139, d0$156, lit_at$45, md$10]), worth$174 = let$161, (let$175 = (() => { let pick$176; return (pick$176 = $R.fn((a$177) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let d$178, bd$179, bw$180, let$181, v$182; return (d$178 = a$177[0], bd$179 = a$177[1], bw$180 = a$177[2], ((d$178 > 3) ? bd$179 : (let$181 = (worth$174)(d$178), v$182 = let$181, ((v$182 > bw$180) ? (pick$176)([$R.iadd(d$178, 1), d$178, v$182]) : (pick$176)([$R.iadd(d$178, 1), bd$179, bw$180]))))); }, 15, [worth$174, pick$176]), pick$176); })(), pick$183 = let$175, (pick$183)([0, d0$156, $R.isub(0, 1000000)]))))))))))); }, 16, [dx$57, dy$61, absi$143, light$53, w$3, flood$139, lit_at$45, md$10]), robot$186 = def$144, $R.tup([w$3, h$5, md$10, pow2$15, at$24, set_at$34, zeros$39, lit_at$45, light$53, dx$57, dy$61, start$67, step$97, flood$139, absi$143, robot$186], ["w", "h", "md", "pow2", "at", "set_at", "zeros", "lit_at", "light", "dx", "dy", "start", "step", "flood", "absi", "robot"])); })(), Trails$187 = let$1, $R.tup([$R.dot(Trails$187, "start"), $R.dot(Trails$187, "step"), $R.dot(Trails$187, "robot")], ["start", "step", "robot"]));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
  const made = "fa59db9586";
  // (ticket 826) Round = (ax, ay, ad, bx, by, bd = Int, lit = [Int], over = Bool, winner, t = Int)
  const ROUND = ["ax", "ay", "ad", "bx", "by", "bd", "lit", "over", "winner", "t"];
  const roundIn = g => $R.tup(ROUND.map(k => k === "lit" ? list(g.lit) : g[k]), ROUND);
  const roundOut = r => Object.fromEntries(ROUND.map(k => [k, k === "lit" ? array(r.lit).map(int) : k === "over" ? r[k] : int(r[k])]));
  // start : Int -> Round; step : (Round, Int, Int) -> Round (the ways each rider asks to turn, or -1); robot : (Round, Int, Int, Int,
  // Int) -> Int (the rider, 1 or 2; how far it looks; its slips in a hundred; a number 0 to 99 drawn this step)
  const start = seed => roundOut(P.start(seed));
  const step = (g, a, b) => roundOut(P.step([roundIn(g), a, b]));
  const robot = (g, who, care, slip, luck) => int(P.robot([roundIn(g), who, care, slip, luck]));
  const api = { start, step, robot, made };
  // (ticket 797) a game's converters, for node/three-way.mjs to time the page boundary by itself
  try { api.$convert = { gameIn, gameOut }; } catch (e) { /* an oracle: no game crosses */ }
  if (typeof window !== "undefined") window.TrailsCompiled = api;
  if (typeof module !== "undefined") module.exports = api;
})();
