// hazeljs-examples, Butterfly garden: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel 1aef76ff96 (trial/794-games-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
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
"use strict";  let let$1, Bugs$310; return (let$1 = (() => { let def$2, md$6, def$7, next$10, def$11, absi$14, def$15, cols$16, def$17, rows$18, def$19, bud_at$28, def$29, closed_at$38, def$39, seg_at$48, def$49, closed$56, def$57, count$63, def$64, scatter$76, def$77, bug$82, def$83, pace_of$88, def$89, len_of$94, def$95, buds_of$100, def$101, garden$115, def$116, start$119, def$120, move_seg$129, def$130, move_all$139, def$140, drop_seg$149, def$150, water$159, def$160, nearest_bud$174, def$175, open_at$184, def$185, hatch$201, def$202, step$270, def$271, nearest$284, def$285, danger$294, def$295, robot$309; return (def$2 = $R.fn((a$3) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$4, b$5; return (a$4 = a$3[0], b$5 = a$3[1], $R.isub(a$4, $R.imul($R.idiv(a$4, b$5), b$5))); }, 0, null), md$6 = def$2, def$7 = $R.fn((a$8) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$9; return (s$9 = a$8, (md$6)([$R.imul(s$9, 48271), 2147483647])); }, 1, [md$6]), next$10 = def$7, def$11 = $R.fn((a$12) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let v$13; return (v$13 = a$12, ((v$13 < 0) ? $R.isub(0, v$13) : v$13)); }, 2, null), absi$14 = def$11, def$15 = 24, cols$16 = def$15, def$17 = 32, rows$18 = def$17, def$19 = (() => { let bud_at$20; return (bud_at$20 = $R.fn((a$21) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$22, c$23, r$24, m$25, b$26, rest$27; return (bs$22 = a$21[0], c$23 = a$21[1], r$24 = a$21[2], (m$25 = bs$22, ((m$25 === null) ? (false) : ((m$25 !== null) ? (b$26 = m$25.h, rest$27 = m$25.t, (($R.eq($R.dot(b$26, "c"), c$23) && $R.eq($R.dot(b$26, "r"), r$24)) || (bud_at$20)([rest$27, c$23, r$24]))) : $R.nomatch("case"))))); }, 3, [bud_at$20]), bud_at$20); })(), bud_at$28 = def$19, def$29 = (() => { let closed_at$30; return (closed_at$30 = $R.fn((a$31) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$32, c$33, r$34, m$35, b$36, rest$37; return (bs$32 = a$31[0], c$33 = a$31[1], r$34 = a$31[2], (m$35 = bs$32, ((m$35 === null) ? (false) : ((m$35 !== null) ? (b$36 = m$35.h, rest$37 = m$35.t, (($R.eq($R.dot(b$36, "c"), c$33) && ($R.eq($R.dot(b$36, "r"), r$34) && ($R.dot(b$36, "hp") > 0))) || (closed_at$30)([rest$37, c$33, r$34]))) : $R.nomatch("case"))))); }, 4, [closed_at$30]), closed_at$30); })(), closed_at$38 = def$29, def$39 = (() => { let seg_at$40; return (seg_at$40 = $R.fn((a$41) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$42, c$43, r$44, m$45, s$46, rest$47; return (gs$42 = a$41[0], c$43 = a$41[1], r$44 = a$41[2], (m$45 = gs$42, ((m$45 === null) ? (false) : ((m$45 !== null) ? (s$46 = m$45.h, rest$47 = m$45.t, (($R.eq($R.dot(s$46, "c"), c$43) && $R.eq($R.dot(s$46, "r"), r$44)) || (seg_at$40)([rest$47, c$43, r$44]))) : $R.nomatch("case"))))); }, 5, [seg_at$40]), seg_at$40); })(), seg_at$48 = def$39, def$49 = (() => { let closed$50; return (closed$50 = $R.fn((a$51) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$52, m$53, b$54, rest$55; return (bs$52 = a$51, (m$53 = bs$52, ((m$53 === null) ? (0) : ((m$53 !== null) ? (b$54 = m$53.h, rest$55 = m$53.t, $R.iadd((($R.dot(b$54, "hp") > 0) ? 1 : 0), (closed$50)(rest$55))) : $R.nomatch("case"))))); }, 6, [closed$50]), closed$50); })(), closed$56 = def$49, def$57 = (() => { let count$58; return (count$58 = $R.fn((a$59) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$60, m$61, rest$62; return (gs$60 = a$59, (m$61 = gs$60, ((m$61 === null) ? (0) : ((m$61 !== null) ? (rest$62 = m$61.t, $R.iadd(1, (count$58)(rest$62))) : $R.nomatch("case"))))); }, 7, [count$58]), count$58); })(), count$63 = def$57, def$64 = (() => { let scatter$65; return (scatter$65 = $R.fn((a$66) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let n$67, seed$68, bs$69, let$70, s1$71, let$72, c$73, let$74, r$75; return (n$67 = a$66[0], seed$68 = a$66[1], bs$69 = a$66[2], ((n$67 <= 0) ? [bs$69, seed$68] : (let$70 = (next$10)(seed$68), s1$71 = let$70, (let$72 = (md$6)([$R.idiv(s1$71, 7), cols$16]), c$73 = let$72, (let$74 = $R.iadd(2, (md$6)([$R.idiv(s1$71, 1000), 24])), r$75 = let$74, ((bud_at$28)([bs$69, c$73, r$75]) ? (scatter$65)([n$67, s1$71, bs$69]) : (scatter$65)([$R.isub(n$67, 1), s1$71, {h: $R.tup([c$73, r$75, 3], ["c", "r", "hp"]), t: bs$69}]))))))); }, 8, [next$10, cols$16, md$6, scatter$65, bud_at$28]), scatter$65); })(), scatter$76 = def$64, def$77 = (() => { let bug$78; return (bug$78 = $R.fn((a$79) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let n$80, i$81; return (n$80 = a$79[0], i$81 = a$79[1], ((i$81 >= n$80) ? null : {h: $R.tup([$R.isub($R.isub(n$80, 1), i$81), 0, 1, 1], ["c", "r", "d", "v"]), t: (bug$78)([n$80, $R.iadd(i$81, 1)])})); }, 9, [bug$78]), bug$78); })(), bug$82 = def$77, def$83 = $R.fn((a$84) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let w$85, let$86, p$87; return (w$85 = a$84, (let$86 = $R.isub(7, w$85), p$87 = let$86, ((p$87 < 3) ? 3 : p$87))); }, 10, null), pace_of$88 = def$83, def$89 = $R.fn((a$90) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let w$91, let$92, n$93; return (w$91 = a$90, (let$92 = $R.iadd(10, $R.imul(2, w$91)), n$93 = let$92, ((n$93 > 18) ? 18 : n$93))); }, 11, null), len_of$94 = def$89, def$95 = $R.fn((a$96) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let w$97, let$98, n$99; return (w$97 = a$96, (let$98 = $R.iadd(16, $R.imul(2, w$97)), n$99 = let$98, ((n$99 > 26) ? 26 : n$99))); }, 12, null), buds_of$100 = def$95, def$101 = $R.fn((a$102) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let w$103, seed$104, px$105, py$106, lives$107, score$108, freed$109, t$110, hit$111, let$112, buds$113, s1$114; return (w$103 = a$102[0], seed$104 = a$102[1], px$105 = a$102[2], py$106 = a$102[3], lives$107 = a$102[4], score$108 = a$102[5], freed$109 = a$102[6], t$110 = a$102[7], hit$111 = a$102[8], (let$112 = (scatter$76)([(buds_of$100)(w$103), (next$10)($R.iadd(seed$104, 1)), null]), buds$113 = let$112[0], s1$114 = let$112[1], $R.tup([px$105, py$106, $R.isub(0, 1), $R.isub(0, 1), (bug$82)([(len_of$94)(w$103), 0]), buds$113, null, lives$107, score$108, freed$109, w$103, s1$114, (pace_of$88)(w$103), (pace_of$88)(w$103), ((w$103 > 0) ? 30 : 0), false, hit$111, t$110], ["px", "py", "sx", "sy", "segs", "buds", "cocoons", "lives", "score", "freed", "wave", "seed", "tick", "pace", "wait", "over", "hit", "t"]))); }, 13, [buds_of$100, next$10, scatter$76, len_of$94, bug$82, pace_of$88]), garden$115 = def$101, def$116 = $R.fn((a$117) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seed$118; return (seed$118 = a$117, (garden$115)([0, seed$118, 300, 770, 3, 0, 0, 0, 0])); }, 14, [garden$115]), start$119 = def$116, def$120 = $R.fn((a$121) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$122, cs$123, s$124, let$125, nc$126, let$127, v$128; return (bs$122 = a$121[0], cs$123 = a$121[1], s$124 = a$121[2], (let$125 = $R.iadd($R.dot(s$124, "c"), $R.dot(s$124, "d")), nc$126 = let$125, (((nc$126 >= 0) && ((nc$126 < cols$16) && ((!((closed_at$38)([bs$122, nc$126, $R.dot(s$124, "r")]))) && (!((bud_at$28)([cs$123, nc$126, $R.dot(s$124, "r")])))))) ? $R.tup([nc$126, $R.dot(s$124, "r"), $R.dot(s$124, "d"), $R.dot(s$124, "v")], ["c", "r", "d", "v"]) : (let$127 = (($R.dot(s$124, "r") >= $R.isub(rows$18, 1)) ? $R.isub(0, 1) : ((($R.dot(s$124, "v") < 0) && ($R.dot(s$124, "r") <= 26)) ? 1 : $R.dot(s$124, "v"))), v$128 = let$127, $R.tup([$R.dot(s$124, "c"), $R.iadd($R.dot(s$124, "r"), v$128), $R.isub(0, $R.dot(s$124, "d")), v$128], ["c", "r", "d", "v"]))))); }, 15, [rows$18, bud_at$28, closed_at$38, cols$16]), move_seg$129 = def$120, def$130 = (() => { let move_all$131; return (move_all$131 = $R.fn((a$132) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$133, cs$134, gs$135, m$136, s$137, rest$138; return (bs$133 = a$132[0], cs$134 = a$132[1], gs$135 = a$132[2], (m$136 = gs$135, ((m$136 === null) ? (null) : ((m$136 !== null) ? (s$137 = m$136.h, rest$138 = m$136.t, {h: (move_seg$129)([bs$133, cs$134, s$137]), t: (move_all$131)([bs$133, cs$134, rest$138])}) : $R.nomatch("case"))))); }, 16, [move_all$131, move_seg$129]), move_all$131); })(), move_all$139 = def$130, def$140 = (() => { let drop_seg$141; return (drop_seg$141 = $R.fn((a$142) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$143, c$144, r$145, m$146, s$147, rest$148; return (gs$143 = a$142[0], c$144 = a$142[1], r$145 = a$142[2], (m$146 = gs$143, ((m$146 === null) ? (null) : ((m$146 !== null) ? (s$147 = m$146.h, rest$148 = m$146.t, (($R.eq($R.dot(s$147, "c"), c$144) && $R.eq($R.dot(s$147, "r"), r$145)) ? rest$148 : {h: s$147, t: (drop_seg$141)([rest$148, c$144, r$145])})) : $R.nomatch("case"))))); }, 17, [drop_seg$141]), drop_seg$141); })(), drop_seg$149 = def$140, def$150 = (() => { let water$151; return (water$151 = $R.fn((a$152) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$153, c$154, r$155, m$156, b$157, rest$158; return (bs$153 = a$152[0], c$154 = a$152[1], r$155 = a$152[2], (m$156 = bs$153, ((m$156 === null) ? (null) : ((m$156 !== null) ? (b$157 = m$156.h, rest$158 = m$156.t, (($R.eq($R.dot(b$157, "c"), c$154) && ($R.eq($R.dot(b$157, "r"), r$155) && ($R.dot(b$157, "hp") > 0))) ? {h: $R.tup([$R.dot(b$157, "c"), $R.dot(b$157, "r"), $R.isub($R.dot(b$157, "hp"), 1)], ["c", "r", "hp"]), t: rest$158} : {h: b$157, t: (water$151)([rest$158, c$154, r$155])})) : $R.nomatch("case"))))); }, 18, [water$151]), water$151); })(), water$159 = def$150, def$160 = (() => { let nearest_bud$161; return (nearest_bud$161 = $R.fn((a$162) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$163, c$164, r$165, bc$166, br$167, bd$168, m$169, b$170, rest$171, let$172, d$173; return (bs$163 = a$162[0], c$164 = a$162[1], r$165 = a$162[2], bc$166 = a$162[3], br$167 = a$162[4], bd$168 = a$162[5], (m$169 = bs$163, ((m$169 === null) ? ([bc$166, br$167]) : ((m$169 !== null) ? (b$170 = m$169.h, rest$171 = m$169.t, (let$172 = $R.iadd((absi$14)($R.isub($R.dot(b$170, "c"), c$164)), (absi$14)($R.isub($R.dot(b$170, "r"), r$165))), d$173 = let$172, ((($R.dot(b$170, "hp") > 0) && (d$173 < bd$168)) ? (nearest_bud$161)([rest$171, c$164, r$165, $R.dot(b$170, "c"), $R.dot(b$170, "r"), d$173]) : (nearest_bud$161)([rest$171, c$164, r$165, bc$166, br$167, bd$168])))) : $R.nomatch("case"))))); }, 19, [absi$14, nearest_bud$161]), nearest_bud$161); })(), nearest_bud$174 = def$160, def$175 = (() => { let open_at$176; return (open_at$176 = $R.fn((a$177) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$178, c$179, r$180, m$181, b$182, rest$183; return (bs$178 = a$177[0], c$179 = a$177[1], r$180 = a$177[2], (m$181 = bs$178, ((m$181 === null) ? (null) : ((m$181 !== null) ? (b$182 = m$181.h, rest$183 = m$181.t, (($R.eq($R.dot(b$182, "c"), c$179) && $R.eq($R.dot(b$182, "r"), r$180)) ? {h: $R.tup([$R.dot(b$182, "c"), $R.dot(b$182, "r"), 0], ["c", "r", "hp"]), t: rest$183} : {h: b$182, t: (open_at$176)([rest$183, c$179, r$180])})) : $R.nomatch("case"))))); }, 20, [open_at$176]), open_at$176); })(), open_at$184 = def$175, def$185 = (() => { let hatch$186; return (hatch$186 = $R.fn((a$187) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let cs$188, bs$189, n$190, m$191, k$192, rest$193, let$194, bc$195, br$196, let$197, more$198, bs2$199, n2$200; return (cs$188 = a$187[0], bs$189 = a$187[1], n$190 = a$187[2], (m$191 = cs$188, ((m$191 === null) ? ([null, bs$189, n$190]) : ((m$191 !== null) ? (k$192 = m$191.h, rest$193 = m$191.t, (($R.dot(k$192, "hp") > 1) ? (let$197 = (hatch$186)([rest$193, bs$189, n$190]), more$198 = let$197[0], bs2$199 = let$197[1], n2$200 = let$197[2], [{h: $R.tup([$R.dot(k$192, "c"), $R.dot(k$192, "r"), $R.isub($R.dot(k$192, "hp"), 1)], ["c", "r", "hp"]), t: more$198}, bs2$199, n2$200]) : (let$194 = (nearest_bud$174)([bs$189, $R.dot(k$192, "c"), $R.dot(k$192, "r"), $R.isub(0, 1), $R.isub(0, 1), 100000]), bc$195 = let$194[0], br$196 = let$194[1], (hatch$186)([rest$193, ((bc$195 >= 0) ? (open_at$184)([bs$189, bc$195, br$196]) : bs$189), $R.iadd(n$190, 1)])))) : $R.nomatch("case"))))); }, 21, [nearest_bud$174, open_at$184, hatch$186]), hatch$186); })(), hatch$201 = def$185, def$202 = $R.fn((a$203) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$204, mx$205, my$206, fire$207, let$208, ready$209, let$210, let$211, x$212, px$213, let$214, let$215, y$216, py$217, let$218, firing$219, let$220, sx$221, let$222, sy$223, let$224, sc$225, let$226, sr$227, let$228, fed$229, let$230, watered$231, let$232, headOf$239, let$240, segs0$241, let$242, buds0$243, let$244, opened$245, let$246, cocoons$247, buds1$248, out$249, let$250, cocoons1$251, let$252, moving$253, let$254, segs$255, let$256, tick$257, let$258, caught$259, let$260, lives$261, let$262, drop_on$263, let$264, score$265, let$266, freed$267, let$268, more$269; return (g$204 = a$203[0], mx$205 = a$203[1], my$206 = a$203[2], fire$207 = a$203[3], ($R.dot(g$204, "over") ? g$204 : (let$208 = ($R.dot(g$204, "wait") <= 0), ready$209 = let$208, (let$210 = (ready$209 ? (let$211 = $R.iadd($R.dot(g$204, "px"), $R.imul(5, mx$205)), x$212 = let$211, ((x$212 < 12) ? 12 : ((x$212 > 588) ? 588 : x$212))) : $R.dot(g$204, "px")), px$213 = let$210, (let$214 = (ready$209 ? (let$215 = $R.iadd($R.dot(g$204, "py"), $R.imul(5, my$206)), y$216 = let$215, ((y$216 < 662) ? 662 : ((y$216 > 788) ? 788 : y$216))) : $R.dot(g$204, "py")), py$217 = let$214, (let$218 = (ready$209 && (fire$207 && ($R.dot(g$204, "sy") < 0))), firing$219 = let$218, (let$220 = (firing$219 ? px$213 : $R.dot(g$204, "sx")), sx$221 = let$220, (let$222 = (firing$219 ? $R.isub(py$217, 14) : (($R.dot(g$204, "sy") >= 0) ? $R.isub($R.dot(g$204, "sy"), 18) : $R.isub(0, 1))), sy$223 = let$222, (let$224 = $R.idiv(sx$221, 25), sc$225 = let$224, (let$226 = ((sy$223 >= 0) ? $R.idiv(sy$223, 25) : $R.isub(0, 1)), sr$227 = let$226, (let$228 = ((sy$223 >= 0) && (seg_at$48)([$R.dot(g$204, "segs"), sc$225, sr$227])), fed$229 = let$228, (let$230 = ((sy$223 >= 0) && ((!(fed$229)) && (closed_at$38)([$R.dot(g$204, "buds"), sc$225, sr$227]))), watered$231 = let$230, (let$232 = (() => { let headOf$233; return (headOf$233 = $R.fn((a$234) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$235, m$236, s$237, rest$238; return (gs$235 = a$234, (m$236 = gs$235, ((m$236 === null) ? (true) : ((m$236 !== null) ? (s$237 = m$236.h, rest$238 = m$236.t, (($R.eq($R.dot(s$237, "c"), sc$225) && $R.eq($R.dot(s$237, "r"), sr$227)) ? (!((seg_at$48)([$R.dot(g$204, "segs"), $R.iadd(sc$225, $R.dot(s$237, "d")), sr$227]))) : (headOf$233)(rest$238))) : $R.nomatch("case"))))); }, 22, [headOf$233, g$204, sc$225, sr$227, seg_at$48]), headOf$233); })(), headOf$239 = let$232, (let$240 = (fed$229 ? (drop_seg$149)([$R.dot(g$204, "segs"), sc$225, sr$227]) : $R.dot(g$204, "segs")), segs0$241 = let$240, (let$242 = (watered$231 ? (water$159)([$R.dot(g$204, "buds"), sc$225, sr$227]) : $R.dot(g$204, "buds")), buds0$243 = let$242, (let$244 = (watered$231 && (!((closed_at$38)([buds0$243, sc$225, sr$227])))), opened$245 = let$244, (let$246 = (hatch$201)([$R.dot(g$204, "cocoons"), buds0$243, 0]), cocoons$247 = let$246[0], buds1$248 = let$246[1], out$249 = let$246[2], (let$250 = (fed$229 ? {h: $R.tup([sc$225, sr$227, 90], ["c", "r", "hp"]), t: cocoons$247} : cocoons$247), cocoons1$251 = let$250, (let$252 = ($R.dot(g$204, "tick") <= 1), moving$253 = let$252, (let$254 = (moving$253 ? (move_all$139)([buds1$248, cocoons1$251, segs0$241]) : segs0$241), segs$255 = let$254, (let$256 = (moving$253 ? $R.dot(g$204, "pace") : $R.isub($R.dot(g$204, "tick"), 1)), tick$257 = let$256, (let$258 = (ready$209 && (seg_at$48)([segs$255, $R.idiv(px$213, 25), $R.idiv(py$217, 25)])), caught$259 = let$258, (let$260 = (caught$259 ? $R.isub($R.dot(g$204, "lives"), 1) : $R.dot(g$204, "lives")), lives$261 = let$260, (let$262 = ((sy$223 >= 0) && ((!(fed$229)) && (!(watered$231)))), drop_on$263 = let$262, (let$264 = $R.iadd($R.iadd($R.iadd($R.dot(g$204, "score"), (fed$229 ? ((headOf$239)($R.dot(g$204, "segs")) ? 100 : 10) : 0)), (opened$245 ? 5 : 0)), $R.imul(5, out$249)), score$265 = let$264, (let$266 = $R.iadd($R.dot(g$204, "freed"), out$249), freed$267 = let$266, (($R.eq((closed$56)(buds1$248), 0) && (!(caught$259))) ? (garden$115)([$R.iadd($R.dot(g$204, "wave"), 1), $R.dot(g$204, "seed"), px$213, py$217, lives$261, $R.iadd(score$265, 500), freed$267, $R.iadd($R.dot(g$204, "t"), 1), 3]) : (let$268 = $R.eq((count$63)(segs$255), 0), more$269 = let$268, $R.tup([(caught$259 ? 300 : px$213), (caught$259 ? 770 : py$217), (drop_on$263 ? sx$221 : $R.isub(0, 1)), (drop_on$263 ? sy$223 : $R.isub(0, 1)), (more$269 ? (bug$82)([(len_of$94)($R.dot(g$204, "wave")), 0]) : segs$255), buds1$248, cocoons1$251, lives$261, score$265, freed$267, $R.dot(g$204, "wave"), $R.dot(g$204, "seed"), (more$269 ? $R.dot(g$204, "pace") : tick$257), $R.dot(g$204, "pace"), (caught$259 ? 60 : (($R.dot(g$204, "wait") > 0) ? $R.isub($R.dot(g$204, "wait"), 1) : 0)), (lives$261 <= 0), (caught$259 ? 2 : (fed$229 ? 1 : ((out$249 > 0) ? 5 : (opened$245 ? 4 : (more$269 ? 6 : 0))))), $R.iadd($R.dot(g$204, "t"), 1)], ["px", "py", "sx", "sy", "segs", "buds", "cocoons", "lives", "score", "freed", "wave", "seed", "tick", "pace", "wait", "over", "hit", "t"]))))))))))))))))))))))))))))); }, 23, [seg_at$48, closed_at$38, drop_seg$149, water$159, hatch$201, move_all$139, count$63, len_of$94, bug$82, garden$115, closed$56]), step$270 = def$202, def$271 = (() => { let nearest$272; return (nearest$272 = $R.fn((a$273) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$274, pc$275, bc$276, br$277, bd$278, m$279, s$280, rest$281, let$282, d$283; return (gs$274 = a$273[0], pc$275 = a$273[1], bc$276 = a$273[2], br$277 = a$273[3], bd$278 = a$273[4], (m$279 = gs$274, ((m$279 === null) ? ([bc$276, br$277]) : ((m$279 !== null) ? (s$280 = m$279.h, rest$281 = m$279.t, (let$282 = $R.iadd($R.imul((absi$14)($R.isub($R.dot(s$280, "c"), pc$275)), 4), $R.isub(31, $R.dot(s$280, "r"))), d$283 = let$282, ((d$283 < bd$278) ? (nearest$272)([rest$281, pc$275, $R.dot(s$280, "c"), $R.dot(s$280, "r"), d$283]) : (nearest$272)([rest$281, pc$275, bc$276, br$277, bd$278])))) : $R.nomatch("case"))))); }, 24, [absi$14, nearest$272]), nearest$272); })(), nearest$284 = def$271, def$285 = (() => { let danger$286; return (danger$286 = $R.fn((a$287) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let gs$288, pc$289, pr$290, m$291, s$292, rest$293; return (gs$288 = a$287[0], pc$289 = a$287[1], pr$290 = a$287[2], (m$291 = gs$288, ((m$291 === null) ? (0) : ((m$291 !== null) ? (s$292 = m$291.h, rest$293 = m$291.t, ((((absi$14)($R.isub($R.dot(s$292, "c"), pc$289)) <= 2) && ((absi$14)($R.isub($R.dot(s$292, "r"), pr$290)) <= 2)) ? (($R.dot(s$292, "c") <= pc$289) ? $R.isub(0, 1) : 1) : (danger$286)([rest$293, pc$289, pr$290]))) : $R.nomatch("case"))))); }, 25, [danger$286, absi$14]), danger$286); })(), danger$294 = def$285, def$295 = $R.fn((a$296) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$297, let$298, pc$299, let$300, pr$301, let$302, dz$303, let$304, tc$305, tr$306, let$307, x$308; return (g$297 = a$296, (($R.dot(g$297, "over") || ($R.dot(g$297, "wait") > 0)) ? $R.tup([0, 0, false], ["mx", "my", "fire"]) : (let$298 = $R.idiv($R.dot(g$297, "px"), 25), pc$299 = let$298, (let$300 = $R.idiv($R.dot(g$297, "py"), 25), pr$301 = let$300, (let$302 = (danger$294)([$R.dot(g$297, "segs"), pc$299, pr$301]), dz$303 = let$302, ((!$R.eq(dz$303, 0)) ? $R.tup([((dz$303 < 0) ? (($R.dot(g$297, "px") < 580) ? 1 : $R.isub(0, 1)) : (($R.dot(g$297, "px") > 20) ? $R.isub(0, 1) : 1)), ((pr$301 >= 30) ? $R.isub(0, 1) : 1), ($R.dot(g$297, "sy") < 0)], ["mx", "my", "fire"]) : (let$304 = (nearest$284)([$R.dot(g$297, "segs"), pc$299, $R.isub(0, 1), $R.isub(0, 1), 100000]), tc$305 = let$304[0], tr$306 = let$304[1], ((tc$305 < 0) ? $R.tup([0, 1, false], ["mx", "my", "fire"]) : (let$307 = $R.iadd($R.imul(tc$305, 25), 12), x$308 = let$307, $R.tup([((x$308 > $R.iadd($R.dot(g$297, "px"), 3)) ? 1 : ((x$308 < $R.isub($R.dot(g$297, "px"), 3)) ? $R.isub(0, 1) : 0)), (($R.dot(g$297, "py") < 780) ? 1 : 0), (($R.dot(g$297, "sy") < 0) && ((absi$14)($R.isub(x$308, $R.dot(g$297, "px"))) <= 12))], ["mx", "my", "fire"])))))))))); }, 26, [danger$294, nearest$284, absi$14]), robot$309 = def$295, $R.tup([md$6, next$10, absi$14, cols$16, rows$18, bud_at$28, closed_at$38, seg_at$48, closed$56, count$63, scatter$76, bug$82, pace_of$88, len_of$94, buds_of$100, garden$115, start$119, move_seg$129, move_all$139, drop_seg$149, water$159, nearest_bud$174, open_at$184, hatch$201, step$270, nearest$284, danger$294, robot$309], ["md", "next", "absi", "cols", "rows", "bud_at", "closed_at", "seg_at", "closed", "count", "scatter", "bug", "pace_of", "len_of", "buds_of", "garden", "start", "move_seg", "move_all", "drop_seg", "water", "nearest_bud", "open_at", "hatch", "step", "nearest", "danger", "robot"])); })(), Bugs$310 = let$1, $R.tup([$R.dot(Bugs$310, "start"), $R.dot(Bugs$310, "step"), $R.dot(Bugs$310, "robot")], ["start", "step", "robot"]));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
  const made = "1aef76ff96";
  // (ticket 828; Butterfly garden since 0.0.61) Game = (px, py, sx, sy = Int, segs = [Seg], buds = [Bud], cocoons = [Bud], lives, score, freed,
  // wave, seed, tick, pace, wait = Int, over = Bool, hit, t = Int); Seg = (c, r, d, v = Int); Bud = (c, r, hp = Int); Choice = (mx, my = Int, fire = Bool)
  const GAME = ["px", "py", "sx", "sy", "segs", "buds", "cocoons", "lives", "score", "freed", "wave", "seed", "tick", "pace", "wait", "over", "hit", "t"];
  const SEG = ["c", "r", "d", "v"], BUD = ["c", "r", "hp"];
  const recIn = (o, ks) => $R.tup(ks.map(k => o[k]), ks), recOut = (r, ks) => Object.fromEntries(ks.map(k => [k, int(r[k])]));
  const gameIn = g => $R.tup(GAME.map(k => k === "segs" ? list(g.segs.map(s => recIn(s, SEG))) : k === "buds" || k === "cocoons" ? list(g[k].map(s => recIn(s, BUD))) : g[k]), GAME);
  const gameOut = r => Object.fromEntries(GAME.map(k => [k, k === "segs" ? array(r.segs).map(s => recOut(s, SEG)) : k === "buds" || k === "cocoons" ? array(r[k]).map(s => recOut(s, BUD)) : k === "over" ? r[k] : int(r[k])]));
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
