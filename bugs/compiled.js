// hazeljs-examples, Bug run: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel fa59db9586 (trial/794-games-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// (ticket 828) The page runs its rules through this file instead of loading hazeljs and building the program, unless asked
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
"use strict";  let let$1, Bugs$223; return (let$1 = (() => { let def$2, md$6, def$7, next$10, def$11, absi$14, def$15, cols$16, def$17, rows$18, def$19, stone_at$28, def$29, seg_at$38, def$39, scatter$51, def$52, bug$57, def$58, pace_of$63, def$64, len_of$69, def$70, start$76, def$77, move_seg$85, def$86, move_all$94, def$95, drop_seg$104, def$105, chip$114, def$115, count$121, def$122, step$182, def$183, nearest$197, def$198, danger$207, def$208, robot$222; return (def$2 = $R.fn((a$3) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$4, b$5; return (a$4 = a$3[0], b$5 = a$3[1], $R.isub(a$4, $R.imul($R.idiv(a$4, b$5), b$5))); }, 0, null), md$6 = def$2, def$7 = $R.fn((a$8) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$9; return (s$9 = a$8, (md$6)([$R.imul(s$9, 48271), 2147483647])); }, 1, [md$6]), next$10 = def$7, def$11 = $R.fn((a$12) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let v$13; return (v$13 = a$12, ((v$13 < 0) ? $R.isub(0, v$13) : v$13)); }, 2, null), absi$14 = def$11, def$15 = 24, cols$16 = def$15, def$17 = 32, rows$18 = def$17, def$19 = (() => { let stone_at$20; return (stone_at$20 = $R.fn((a$21) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ss$22, c$23, r$24, m$25, s$26, rest$27; return (ss$22 = a$21[0], c$23 = a$21[1], r$24 = a$21[2], (m$25 = ss$22, ((m$25 === null) ? (false) : ((m$25 !== null) ? (s$26 = m$25.h, rest$27 = m$25.t, (($R.eq($R.dot(s$26, "c"), c$23) && $R.eq($R.dot(s$26, "r"), r$24)) || (stone_at$20)([rest$27, c$23, r$24]))) : $R.nomatch("case"))))); }, 3, [stone_at$20]), stone_at$20); })(), stone_at$28 = def$19, def$29 = (() => { let seg_at$30; return (seg_at$30 = $R.fn((a$31) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$32, c$33, r$34, m$35, s$36, rest$37; return (gs$32 = a$31[0], c$33 = a$31[1], r$34 = a$31[2], (m$35 = gs$32, ((m$35 === null) ? (false) : ((m$35 !== null) ? (s$36 = m$35.h, rest$37 = m$35.t, (($R.eq($R.dot(s$36, "c"), c$33) && $R.eq($R.dot(s$36, "r"), r$34)) || (seg_at$30)([rest$37, c$33, r$34]))) : $R.nomatch("case"))))); }, 4, [seg_at$30]), seg_at$30); })(), seg_at$38 = def$29, def$39 = (() => { let scatter$40; return (scatter$40 = $R.fn((a$41) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let n$42, seed$43, ss$44, let$45, s1$46, let$47, c$48, let$49, r$50; return (n$42 = a$41[0], seed$43 = a$41[1], ss$44 = a$41[2], ((n$42 <= 0) ? [ss$44, seed$43] : (let$45 = (next$10)(seed$43), s1$46 = let$45, (let$47 = (md$6)([$R.idiv(s1$46, 7), cols$16]), c$48 = let$47, (let$49 = $R.iadd(2, (md$6)([$R.idiv(s1$46, 1000), 24])), r$50 = let$49, ((stone_at$28)([ss$44, c$48, r$50]) ? (scatter$40)([n$42, s1$46, ss$44]) : (scatter$40)([$R.isub(n$42, 1), s1$46, {h: $R.tup([c$48, r$50, 3], ["c", "r", "hp"]), t: ss$44}]))))))); }, 5, [next$10, cols$16, md$6, scatter$40, stone_at$28]), scatter$40); })(), scatter$51 = def$39, def$52 = (() => { let bug$53; return (bug$53 = $R.fn((a$54) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let n$55, i$56; return (n$55 = a$54[0], i$56 = a$54[1], ((i$56 >= n$55) ? null : {h: $R.tup([$R.isub($R.isub(n$55, 1), i$56), 0, 1, 1], ["c", "r", "d", "v"]), t: (bug$53)([n$55, $R.iadd(i$56, 1)])})); }, 6, [bug$53]), bug$53); })(), bug$57 = def$52, def$58 = $R.fn((a$59) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let w$60, let$61, p$62; return (w$60 = a$59, (let$61 = $R.isub(7, w$60), p$62 = let$61, ((p$62 < 3) ? 3 : p$62))); }, 7, null), pace_of$63 = def$58, def$64 = $R.fn((a$65) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let w$66, let$67, n$68; return (w$66 = a$65, (let$67 = $R.iadd(10, $R.imul(2, w$66)), n$68 = let$67, ((n$68 > 18) ? 18 : n$68))); }, 8, null), len_of$69 = def$64, def$70 = $R.fn((a$71) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seed$72, let$73, stones$74, s1$75; return (seed$72 = a$71, (let$73 = (scatter$51)([34, (next$10)($R.iadd(seed$72, 1)), null]), stones$74 = let$73[0], s1$75 = let$73[1], $R.tup([300, 770, $R.isub(0, 1), $R.isub(0, 1), (bug$57)([(len_of$69)(0), 0]), stones$74, 3, 0, 0, s1$75, (pace_of$63)(0), (pace_of$63)(0), 0, false, 0, 0], ["px", "py", "sx", "sy", "segs", "stones", "lives", "score", "wave", "seed", "tick", "pace", "wait", "over", "hit", "t"]))); }, 9, [next$10, scatter$51, len_of$69, bug$57, pace_of$63]), start$76 = def$70, def$77 = $R.fn((a$78) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ss$79, s$80, let$81, nc$82, let$83, v$84; return (ss$79 = a$78[0], s$80 = a$78[1], (let$81 = $R.iadd($R.dot(s$80, "c"), $R.dot(s$80, "d")), nc$82 = let$81, (((nc$82 >= 0) && ((nc$82 < cols$16) && (!((stone_at$28)([ss$79, nc$82, $R.dot(s$80, "r")]))))) ? $R.tup([nc$82, $R.dot(s$80, "r"), $R.dot(s$80, "d"), $R.dot(s$80, "v")], ["c", "r", "d", "v"]) : (let$83 = (($R.dot(s$80, "r") >= $R.isub(rows$18, 1)) ? $R.isub(0, 1) : ((($R.dot(s$80, "v") < 0) && ($R.dot(s$80, "r") <= 26)) ? 1 : $R.dot(s$80, "v"))), v$84 = let$83, $R.tup([$R.dot(s$80, "c"), $R.iadd($R.dot(s$80, "r"), v$84), $R.isub(0, $R.dot(s$80, "d")), v$84], ["c", "r", "d", "v"]))))); }, 10, [rows$18, stone_at$28, cols$16]), move_seg$85 = def$77, def$86 = (() => { let move_all$87; return (move_all$87 = $R.fn((a$88) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ss$89, gs$90, m$91, s$92, rest$93; return (ss$89 = a$88[0], gs$90 = a$88[1], (m$91 = gs$90, ((m$91 === null) ? (null) : ((m$91 !== null) ? (s$92 = m$91.h, rest$93 = m$91.t, {h: (move_seg$85)([ss$89, s$92]), t: (move_all$87)([ss$89, rest$93])}) : $R.nomatch("case"))))); }, 11, [move_all$87, move_seg$85]), move_all$87); })(), move_all$94 = def$86, def$95 = (() => { let drop_seg$96; return (drop_seg$96 = $R.fn((a$97) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$98, c$99, r$100, m$101, s$102, rest$103; return (gs$98 = a$97[0], c$99 = a$97[1], r$100 = a$97[2], (m$101 = gs$98, ((m$101 === null) ? (null) : ((m$101 !== null) ? (s$102 = m$101.h, rest$103 = m$101.t, (($R.eq($R.dot(s$102, "c"), c$99) && $R.eq($R.dot(s$102, "r"), r$100)) ? rest$103 : {h: s$102, t: (drop_seg$96)([rest$103, c$99, r$100])})) : $R.nomatch("case"))))); }, 12, [drop_seg$96]), drop_seg$96); })(), drop_seg$104 = def$95, def$105 = (() => { let chip$106; return (chip$106 = $R.fn((a$107) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ss$108, c$109, r$110, m$111, s$112, rest$113; return (ss$108 = a$107[0], c$109 = a$107[1], r$110 = a$107[2], (m$111 = ss$108, ((m$111 === null) ? (null) : ((m$111 !== null) ? (s$112 = m$111.h, rest$113 = m$111.t, (($R.eq($R.dot(s$112, "c"), c$109) && $R.eq($R.dot(s$112, "r"), r$110)) ? (($R.dot(s$112, "hp") <= 1) ? rest$113 : {h: $R.tup([$R.dot(s$112, "c"), $R.dot(s$112, "r"), $R.isub($R.dot(s$112, "hp"), 1)], ["c", "r", "hp"]), t: rest$113}) : {h: s$112, t: (chip$106)([rest$113, c$109, r$110])})) : $R.nomatch("case"))))); }, 13, [chip$106]), chip$106); })(), chip$114 = def$105, def$115 = (() => { let count$116; return (count$116 = $R.fn((a$117) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$118, m$119, rest$120; return (gs$118 = a$117, (m$119 = gs$118, ((m$119 === null) ? (0) : ((m$119 !== null) ? (rest$120 = m$119.t, $R.iadd(1, (count$116)(rest$120))) : $R.nomatch("case"))))); }, 14, [count$116]), count$116); })(), count$121 = def$115, def$122 = $R.fn((a$123) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$124, mx$125, my$126, fire$127, let$128, ready$129, let$130, let$131, x$132, px$133, let$134, let$135, y$136, py$137, let$138, firing$139, let$140, sx$141, let$142, sy$143, let$144, sc$145, let$146, sr$147, let$148, segHit$149, let$150, stoneHit$151, let$152, headOf$159, let$160, points$161, let$162, segs0$163, let$164, stones0$165, let$166, broke$167, let$168, moving$169, let$170, segs$171, let$172, tick$173, let$174, caught$175, let$176, lives$177, let$178, shot_on$179, let$180, score$181; return (g$124 = a$123[0], mx$125 = a$123[1], my$126 = a$123[2], fire$127 = a$123[3], ($R.dot(g$124, "over") ? g$124 : (let$128 = ($R.dot(g$124, "wait") <= 0), ready$129 = let$128, (let$130 = (ready$129 ? (let$131 = $R.iadd($R.dot(g$124, "px"), $R.imul(5, mx$125)), x$132 = let$131, ((x$132 < 12) ? 12 : ((x$132 > 588) ? 588 : x$132))) : $R.dot(g$124, "px")), px$133 = let$130, (let$134 = (ready$129 ? (let$135 = $R.iadd($R.dot(g$124, "py"), $R.imul(5, my$126)), y$136 = let$135, ((y$136 < 662) ? 662 : ((y$136 > 788) ? 788 : y$136))) : $R.dot(g$124, "py")), py$137 = let$134, (let$138 = (ready$129 && (fire$127 && ($R.dot(g$124, "sy") < 0))), firing$139 = let$138, (let$140 = (firing$139 ? px$133 : $R.dot(g$124, "sx")), sx$141 = let$140, (let$142 = (firing$139 ? $R.isub(py$137, 14) : (($R.dot(g$124, "sy") >= 0) ? $R.isub($R.dot(g$124, "sy"), 18) : $R.isub(0, 1))), sy$143 = let$142, (let$144 = $R.idiv(sx$141, 25), sc$145 = let$144, (let$146 = ((sy$143 >= 0) ? $R.idiv(sy$143, 25) : $R.isub(0, 1)), sr$147 = let$146, (let$148 = ((sy$143 >= 0) && (seg_at$38)([$R.dot(g$124, "segs"), sc$145, sr$147])), segHit$149 = let$148, (let$150 = ((sy$143 >= 0) && ((!(segHit$149)) && (stone_at$28)([$R.dot(g$124, "stones"), sc$145, sr$147]))), stoneHit$151 = let$150, (let$152 = (() => { let headOf$153; return (headOf$153 = $R.fn((a$154) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$155, m$156, s$157, rest$158; return (gs$155 = a$154, (m$156 = gs$155, ((m$156 === null) ? (true) : ((m$156 !== null) ? (s$157 = m$156.h, rest$158 = m$156.t, (($R.eq($R.dot(s$157, "c"), sc$145) && $R.eq($R.dot(s$157, "r"), sr$147)) ? (!((seg_at$38)([$R.dot(g$124, "segs"), $R.iadd(sc$145, $R.dot(s$157, "d")), sr$147]))) : (headOf$153)(rest$158))) : $R.nomatch("case"))))); }, 15, [headOf$153, g$124, sc$145, sr$147, seg_at$38]), headOf$153); })(), headOf$159 = let$152, (let$160 = (segHit$149 ? ((headOf$159)($R.dot(g$124, "segs")) ? 100 : 10) : 0), points$161 = let$160, (let$162 = (segHit$149 ? (drop_seg$104)([$R.dot(g$124, "segs"), sc$145, sr$147]) : $R.dot(g$124, "segs")), segs0$163 = let$162, (let$164 = ((segHit$149 && (!((stone_at$28)([$R.dot(g$124, "stones"), sc$145, sr$147])))) ? {h: $R.tup([sc$145, sr$147, 3], ["c", "r", "hp"]), t: $R.dot(g$124, "stones")} : (stoneHit$151 ? (chip$114)([$R.dot(g$124, "stones"), sc$145, sr$147]) : $R.dot(g$124, "stones"))), stones0$165 = let$164, (let$166 = (stoneHit$151 && (!((stone_at$28)([stones0$165, sc$145, sr$147])))), broke$167 = let$166, (let$168 = ($R.dot(g$124, "tick") <= 1), moving$169 = let$168, (let$170 = (moving$169 ? (move_all$94)([stones0$165, segs0$163]) : segs0$163), segs$171 = let$170, (let$172 = (moving$169 ? $R.dot(g$124, "pace") : $R.isub($R.dot(g$124, "tick"), 1)), tick$173 = let$172, (let$174 = (ready$129 && (seg_at$38)([segs$171, $R.idiv(px$133, 25), $R.idiv(py$137, 25)])), caught$175 = let$174, (let$176 = (caught$175 ? $R.isub($R.dot(g$124, "lives"), 1) : $R.dot(g$124, "lives")), lives$177 = let$176, (let$178 = ((sy$143 >= 0) && ((!(segHit$149)) && (!(stoneHit$151)))), shot_on$179 = let$178, (let$180 = $R.iadd($R.iadd($R.dot(g$124, "score"), points$161), (broke$167 ? 1 : 0)), score$181 = let$180, ($R.eq((count$121)(segs$171), 0) ? $R.tup([px$133, py$137, $R.isub(0, 1), $R.isub(0, 1), (bug$57)([(len_of$69)($R.iadd($R.dot(g$124, "wave"), 1)), 0]), stones0$165, lives$177, $R.iadd(score$181, 500), $R.iadd($R.dot(g$124, "wave"), 1), $R.dot(g$124, "seed"), (pace_of$63)($R.iadd($R.dot(g$124, "wave"), 1)), (pace_of$63)($R.iadd($R.dot(g$124, "wave"), 1)), 30, false, 3, $R.iadd($R.dot(g$124, "t"), 1)], ["px", "py", "sx", "sy", "segs", "stones", "lives", "score", "wave", "seed", "tick", "pace", "wait", "over", "hit", "t"]) : $R.tup([(caught$175 ? 300 : px$133), (caught$175 ? 770 : py$137), (shot_on$179 ? sx$141 : $R.isub(0, 1)), (shot_on$179 ? sy$143 : $R.isub(0, 1)), segs$171, stones0$165, lives$177, score$181, $R.dot(g$124, "wave"), $R.dot(g$124, "seed"), tick$173, $R.dot(g$124, "pace"), (caught$175 ? 60 : (($R.dot(g$124, "wait") > 0) ? $R.isub($R.dot(g$124, "wait"), 1) : 0)), (lives$177 <= 0), (caught$175 ? 2 : (segHit$149 ? 1 : (broke$167 ? 4 : 0))), $R.iadd($R.dot(g$124, "t"), 1)], ["px", "py", "sx", "sy", "segs", "stones", "lives", "score", "wave", "seed", "tick", "pace", "wait", "over", "hit", "t"])))))))))))))))))))))))))); }, 16, [seg_at$38, stone_at$28, drop_seg$104, chip$114, move_all$94, len_of$69, bug$57, pace_of$63, count$121]), step$182 = def$122, def$183 = (() => { let nearest$184; return (nearest$184 = $R.fn((a$185) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$186, pc$187, bc$188, br$189, bd$190, _r$191, m$192, s$193, rest$194, let$195, d$196; return (gs$186 = a$185[0], pc$187 = a$185[1], bc$188 = a$185[2], br$189 = a$185[3], bd$190 = a$185[4], _r$191 = a$185[5], (m$192 = gs$186, ((m$192 === null) ? ([bc$188, br$189]) : ((m$192 !== null) ? (s$193 = m$192.h, rest$194 = m$192.t, (let$195 = $R.iadd($R.imul((absi$14)($R.isub($R.dot(s$193, "c"), pc$187)), 4), $R.isub(31, $R.dot(s$193, "r"))), d$196 = let$195, ((d$196 < bd$190) ? (nearest$184)([rest$194, pc$187, $R.dot(s$193, "c"), $R.dot(s$193, "r"), d$196, 0]) : (nearest$184)([rest$194, pc$187, bc$188, br$189, bd$190, 0])))) : $R.nomatch("case"))))); }, 17, [absi$14, nearest$184]), nearest$184); })(), nearest$197 = def$183, def$198 = (() => { let danger$199; return (danger$199 = $R.fn((a$200) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$201, pc$202, pr$203, m$204, s$205, rest$206; return (gs$201 = a$200[0], pc$202 = a$200[1], pr$203 = a$200[2], (m$204 = gs$201, ((m$204 === null) ? (0) : ((m$204 !== null) ? (s$205 = m$204.h, rest$206 = m$204.t, ((((absi$14)($R.isub($R.dot(s$205, "c"), pc$202)) <= 2) && ((absi$14)($R.isub($R.dot(s$205, "r"), pr$203)) <= 2)) ? (($R.dot(s$205, "c") <= pc$202) ? $R.isub(0, 1) : 1) : (danger$199)([rest$206, pc$202, pr$203]))) : $R.nomatch("case"))))); }, 18, [danger$199, absi$14]), danger$199); })(), danger$207 = def$198, def$208 = $R.fn((a$209) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$210, let$211, pc$212, let$213, pr$214, let$215, dz$216, let$217, tc$218, tr$219, let$220, x$221; return (g$210 = a$209, (($R.dot(g$210, "over") || ($R.dot(g$210, "wait") > 0)) ? $R.tup([0, 0, false], ["mx", "my", "fire"]) : (let$211 = $R.idiv($R.dot(g$210, "px"), 25), pc$212 = let$211, (let$213 = $R.idiv($R.dot(g$210, "py"), 25), pr$214 = let$213, (let$215 = (danger$207)([$R.dot(g$210, "segs"), pc$212, pr$214]), dz$216 = let$215, ((!$R.eq(dz$216, 0)) ? $R.tup([((dz$216 < 0) ? (($R.dot(g$210, "px") < 580) ? 1 : $R.isub(0, 1)) : (($R.dot(g$210, "px") > 20) ? $R.isub(0, 1) : 1)), ((pr$214 >= 30) ? $R.isub(0, 1) : 1), ($R.dot(g$210, "sy") < 0)], ["mx", "my", "fire"]) : (let$217 = (nearest$197)([$R.dot(g$210, "segs"), pc$212, $R.isub(0, 1), $R.isub(0, 1), 100000, 0]), tc$218 = let$217[0], tr$219 = let$217[1], ((tc$218 < 0) ? $R.tup([0, 1, false], ["mx", "my", "fire"]) : (let$220 = $R.iadd($R.imul(tc$218, 25), 12), x$221 = let$220, $R.tup([((x$221 > $R.iadd($R.dot(g$210, "px"), 3)) ? 1 : ((x$221 < $R.isub($R.dot(g$210, "px"), 3)) ? $R.isub(0, 1) : 0)), (($R.dot(g$210, "py") < 780) ? 1 : 0), (($R.dot(g$210, "sy") < 0) && ((absi$14)($R.isub(x$221, $R.dot(g$210, "px"))) <= 12))], ["mx", "my", "fire"])))))))))); }, 19, [danger$207, nearest$197, absi$14]), robot$222 = def$208, $R.tup([md$6, next$10, absi$14, cols$16, rows$18, stone_at$28, seg_at$38, scatter$51, bug$57, pace_of$63, len_of$69, start$76, move_seg$85, move_all$94, drop_seg$104, chip$114, count$121, step$182, nearest$197, danger$207, robot$222], ["md", "next", "absi", "cols", "rows", "stone_at", "seg_at", "scatter", "bug", "pace_of", "len_of", "start", "move_seg", "move_all", "drop_seg", "chip", "count", "step", "nearest", "danger", "robot"])); })(), Bugs$223 = let$1, $R.tup([$R.dot(Bugs$223, "start"), $R.dot(Bugs$223, "step"), $R.dot(Bugs$223, "robot")], ["start", "step", "robot"]));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
  const made = "fa59db9586";
  // (ticket 828) Game = (px, py, sx, sy = Int, segs = [Seg], stones = [Stone], lives, score, wave, seed, tick, pace, wait = Int, over = Bool,
  // hit, t = Int); Seg = (c, r, d, v = Int); Stone = (c, r, hp = Int); Choice = (mx, my = Int, fire = Bool)
  const GAME = ["px", "py", "sx", "sy", "segs", "stones", "lives", "score", "wave", "seed", "tick", "pace", "wait", "over", "hit", "t"];
  const SEG = ["c", "r", "d", "v"], STONE = ["c", "r", "hp"];
  const recIn = (o, ks) => $R.tup(ks.map(k => o[k]), ks), recOut = (r, ks) => Object.fromEntries(ks.map(k => [k, int(r[k])]));
  const gameIn = g => $R.tup(GAME.map(k => k === "segs" ? list(g.segs.map(s => recIn(s, SEG))) : k === "stones" ? list(g.stones.map(s => recIn(s, STONE))) : g[k]), GAME);
  const gameOut = r => Object.fromEntries(GAME.map(k => [k, k === "segs" ? array(r.segs).map(s => recOut(s, SEG)) : k === "stones" ? array(r.stones).map(s => recOut(s, STONE)) : k === "over" ? r[k] : int(r[k])]));
  // start : Int -> Game (a seed); step : (Game, Int, Int, Bool) -> Game (the moves across and up or down, a shot); robot : Game -> Choice
  const start = seed => gameOut(P.start(seed));
  const step = (g, mx, my, fire) => gameOut(P.step([gameIn(g), mx, my, fire]));
  const robot = g => { const c = P.robot(gameIn(g)); return { mx: int(c.mx), my: int(c.my), fire: c.fire }; };
  const api = { start, step, robot, made };
  // (ticket 797) a game's converters, for node/three-way.mjs to time the page boundary by itself
  try { api.$convert = { gameIn, gameOut }; } catch (e) { /* an oracle: no game crosses */ }
  if (typeof window !== "undefined") window.BugsCompiled = api;
  if (typeof module !== "undefined") module.exports = api;
})();
