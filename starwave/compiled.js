// hazeljs-examples, Star wave: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel 0d739f2b25 (trial/794-games-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// (ticket 827) The page runs its rules through this file instead of loading hazeljs and building the program, unless asked
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
"use strict";  let let$1, StarWave$309; return (let$1 = (() => { let def$2, md$6, def$7, next$10, def$11, absi$14, def$15, at$23, def$24, set_at$33, def$34, alive$41, def$42, sum$49, def$50, bx$53, def$54, floors$57, def$58, roof$61, def$62, full$63, def$64, rows_of$67, def$68, kinds_from$75, def$76, top_of$79, def$80, wave_start$90, def$91, start$94, def$95, alien_at$108, def$109, building_at$114, def$115, col_has$119, def$120, first_col$125, def$126, last_col$131, def$132, lowest$138, def$139, bottom$145, def$146, nearest_plain$156, def$157, fall$176, def$177, count$183, def$184, col_from$192, def$193, paused$198, def$199, step$267, def$268, to_come$271, def$272, keep$276, def$277, aim$294, def$295, robot$308; return (def$2 = $R.fn((a$3) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$4, b$5; return (a$4 = a$3[0], b$5 = a$3[1], $R.isub(a$4, $R.imul($R.idiv(a$4, b$5), b$5))); }, 0, null), md$6 = def$2, def$7 = $R.fn((a$8) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$9; return (s$9 = a$8, (md$6)([$R.imul(s$9, 48271), 2147483647])); }, 1, [md$6]), next$10 = def$7, def$11 = $R.fn((a$12) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let v$13; return (v$13 = a$12, ((v$13 < 0) ? $R.isub(0, v$13) : v$13)); }, 2, null), absi$14 = def$11, def$15 = (() => { let at$16; return (at$16 = $R.fn((a$17) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$18, i$19, m$20, x$21, rest$22; return (xs$18 = a$17[0], i$19 = a$17[1], (m$20 = xs$18, ((m$20 === null) ? (0) : ((m$20 !== null) ? (x$21 = m$20.h, rest$22 = m$20.t, ((i$19 <= 0) ? x$21 : (at$16)([rest$22, $R.isub(i$19, 1)]))) : $R.nomatch("case"))))); }, 3, [at$16]), at$16); })(), at$23 = def$15, def$24 = (() => { let set_at$25; return (set_at$25 = $R.fn((a$26) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$27, i$28, v$29, m$30, x$31, rest$32; return (xs$27 = a$26[0], i$28 = a$26[1], v$29 = a$26[2], (m$30 = xs$27, ((m$30 === null) ? (null) : ((m$30 !== null) ? (x$31 = m$30.h, rest$32 = m$30.t, ((i$28 <= 0) ? {h: v$29, t: rest$32} : {h: x$31, t: (set_at$25)([rest$32, $R.isub(i$28, 1), v$29])})) : $R.nomatch("case"))))); }, 4, [set_at$25]), set_at$25); })(), set_at$33 = def$24, def$34 = (() => { let alive$35; return (alive$35 = $R.fn((a$36) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$37, m$38, x$39, rest$40; return (xs$37 = a$36, (m$38 = xs$37, ((m$38 === null) ? (0) : ((m$38 !== null) ? (x$39 = m$38.h, rest$40 = m$38.t, $R.iadd(((x$39 > 0) ? 1 : 0), (alive$35)(rest$40))) : $R.nomatch("case"))))); }, 5, [alive$35]), alive$35); })(), alive$41 = def$34, def$42 = (() => { let sum$43; return (sum$43 = $R.fn((a$44) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$45, m$46, x$47, rest$48; return (xs$45 = a$44, (m$46 = xs$45, ((m$46 === null) ? (0) : ((m$46 !== null) ? (x$47 = m$46.h, rest$48 = m$46.t, $R.iadd(x$47, (sum$43)(rest$48))) : $R.nomatch("case"))))); }, 6, [sum$43]), sum$43); })(), sum$49 = def$42, def$50 = $R.fn((a$51) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$52; return (s$52 = a$51, $R.iadd(54, $R.imul(140, s$52))); }, 7, null), bx$53 = def$50, def$54 = $R.fn((a$55) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$56; return (s$56 = a$55, ($R.eq(s$56, 0) ? 5 : ($R.eq(s$56, 1) ? 7 : ($R.eq(s$56, 2) ? 6 : 4)))); }, 8, null), floors$57 = def$54, def$58 = $R.fn((a$59) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$60; return (s$60 = a$59, $R.isub(762, $R.imul(18, (floors$57)(s$60)))); }, 9, [floors$57]), roof$61 = def$58, def$62 = 22, full$63 = def$62, def$64 = $R.fn((a$65) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let w$66; return (w$66 = a$65, ((w$66 >= 2) ? 5 : $R.iadd(3, w$66))); }, 10, null), rows_of$67 = def$64, def$68 = (() => { let kinds_from$69; return (kinds_from$69 = $R.fn((a$70) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let n$71, i$72, let$73, r$74; return (n$71 = a$70[0], i$72 = a$70[1], ((i$72 >= 45) ? null : {h: (let$73 = $R.idiv(i$72, 9), r$74 = let$73, ((r$74 >= n$71) ? 0 : ($R.eq(r$74, 0) ? 3 : ((r$74 <= $R.idiv($R.isub(n$71, 1), 2)) ? 2 : 1)))), t: (kinds_from$69)([n$71, $R.iadd(i$72, 1)])})); }, 11, [kinds_from$69]), kinds_from$69); })(), kinds_from$75 = def$68, def$76 = $R.fn((a$77) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let w$78; return (w$78 = a$77, $R.iadd(110, $R.imul(20, ((w$78 > 5) ? 5 : w$78)))); }, 12, null), top_of$79 = def$76, def$80 = $R.fn((a$81) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let cx$82, tries$83, hearts$84, wins$85, wave$86, seed$87, t$88, hit$89; return (cx$82 = a$81[0], tries$83 = a$81[1], hearts$84 = a$81[2], wins$85 = a$81[3], wave$86 = a$81[4], seed$87 = a$81[5], t$88 = a$81[6], hit$89 = a$81[7], $R.tup([cx$82, $R.isub(0, 1), $R.isub(0, 1), null, (kinds_from$75)([(rows_of$67)(wave$86), 0]), 92, (top_of$79)(wave$86), 1, 24, {h: 0, t: {h: 0, t: {h: 0, t: {h: 0, t: null}}}}, 0, tries$83, hearts$84, wins$85, wave$86, seed$87, 0, 0, false, hit$89, t$88], ["cx", "hx", "hy", "drops", "aliens", "fx", "fy", "fdir", "march", "town", "glow", "tries", "hearts", "wins", "wave", "seed", "wait", "verdict", "over", "hit", "t"])); }, 13, [rows_of$67, kinds_from$75, top_of$79]), wave_start$90 = def$80, def$91 = $R.fn((a$92) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seed$93; return (seed$93 = a$92, (wave_start$90)([300, 3, 0, 0, 0, (next$10)($R.iadd(seed$93, 1)), 0, 0])); }, 14, [next$10, wave_start$90]), start$94 = def$91, def$95 = $R.fn((a$96) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$97, fx$98, fy$99, x$100, y$101, let$102, c$103, let$104, r$105, let$106, i$107; return (aliens$97 = a$96[0], fx$98 = a$96[1], fy$99 = a$96[2], x$100 = a$96[3], y$101 = a$96[4], (((x$100 < fx$98) || (y$101 < fy$99)) ? $R.isub(0, 1) : (let$102 = $R.idiv($R.isub(x$100, fx$98), 48), c$103 = let$102, (let$104 = $R.idiv($R.isub(y$101, fy$99), 40), r$105 = let$104, (((c$103 > 8) || ((r$105 > 4) || (($R.isub($R.isub(x$100, fx$98), $R.imul(c$103, 48)) >= 32) || ($R.isub($R.isub(y$101, fy$99), $R.imul(r$105, 40)) >= 24)))) ? $R.isub(0, 1) : (let$106 = $R.iadd($R.imul(r$105, 9), c$103), i$107 = let$106, (((at$23)([aliens$97, i$107]) > 0) ? i$107 : $R.isub(0, 1)))))))); }, 15, [at$23]), alien_at$108 = def$95, def$109 = $R.fn((a$110) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let x$111, let$112, s$113; return (x$111 = a$110, ((x$111 < 54) ? $R.isub(0, 1) : (let$112 = $R.idiv($R.isub(x$111, 54), 140), s$113 = let$112, (((s$113 > 3) || ($R.isub(x$111, (bx$53)(s$113)) >= 72)) ? $R.isub(0, 1) : s$113)))); }, 16, [bx$53]), building_at$114 = def$109, def$115 = $R.fn((a$116) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$117, c$118; return (aliens$117 = a$116[0], c$118 = a$116[1], (((at$23)([aliens$117, c$118]) > 0) || (((at$23)([aliens$117, $R.iadd(9, c$118)]) > 0) || (((at$23)([aliens$117, $R.iadd(18, c$118)]) > 0) || (((at$23)([aliens$117, $R.iadd(27, c$118)]) > 0) || ((at$23)([aliens$117, $R.iadd(36, c$118)]) > 0)))))); }, 17, [at$23]), col_has$119 = def$115, def$120 = (() => { let first_col$121; return (first_col$121 = $R.fn((a$122) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$123, c$124; return (aliens$123 = a$122[0], c$124 = a$122[1], ((c$124 > 8) ? 0 : ((col_has$119)([aliens$123, c$124]) ? c$124 : (first_col$121)([aliens$123, $R.iadd(c$124, 1)])))); }, 18, [first_col$121, col_has$119]), first_col$121); })(), first_col$125 = def$120, def$126 = (() => { let last_col$127; return (last_col$127 = $R.fn((a$128) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$129, c$130; return (aliens$129 = a$128[0], c$130 = a$128[1], ((c$130 < 0) ? 8 : ((col_has$119)([aliens$129, c$130]) ? c$130 : (last_col$127)([aliens$129, $R.isub(c$130, 1)])))); }, 19, [last_col$127, col_has$119]), last_col$127); })(), last_col$131 = def$126, def$132 = (() => { let lowest$133; return (lowest$133 = $R.fn((a$134) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$135, c$136, r$137; return (aliens$135 = a$134[0], c$136 = a$134[1], r$137 = a$134[2], ((r$137 < 0) ? $R.isub(0, 1) : (((at$23)([aliens$135, $R.iadd($R.imul(r$137, 9), c$136)]) > 0) ? r$137 : (lowest$133)([aliens$135, c$136, $R.isub(r$137, 1)])))); }, 20, [lowest$133, at$23]), lowest$133); })(), lowest$138 = def$132, def$139 = (() => { let bottom$140; return (bottom$140 = $R.fn((a$141) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$142, fy$143, r$144; return (aliens$142 = a$141[0], fy$143 = a$141[1], r$144 = a$141[2], ((r$144 < 0) ? $R.isub(0, 1) : ((((at$23)([aliens$142, $R.imul(r$144, 9)]) > 0) || (((at$23)([aliens$142, $R.iadd($R.imul(r$144, 9), 1)]) > 0) || (((at$23)([aliens$142, $R.iadd($R.imul(r$144, 9), 2)]) > 0) || (((at$23)([aliens$142, $R.iadd($R.imul(r$144, 9), 3)]) > 0) || (((at$23)([aliens$142, $R.iadd($R.imul(r$144, 9), 4)]) > 0) || (((at$23)([aliens$142, $R.iadd($R.imul(r$144, 9), 5)]) > 0) || (((at$23)([aliens$142, $R.iadd($R.imul(r$144, 9), 6)]) > 0) || (((at$23)([aliens$142, $R.iadd($R.imul(r$144, 9), 7)]) > 0) || ((at$23)([aliens$142, $R.iadd($R.imul(r$144, 9), 8)]) > 0))))))))) ? $R.iadd($R.iadd(fy$143, $R.imul(r$144, 40)), 24) : (bottom$140)([aliens$142, fy$143, $R.isub(r$144, 1)])))); }, 21, [bottom$140, at$23]), bottom$140); })(), bottom$145 = def$139, def$146 = (() => { let nearest_plain$147; return (nearest_plain$147 = $R.fn((a$148) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let town$149, x$150, s$151, best$152, bd$153, let$154, d$155; return (town$149 = a$148[0], x$150 = a$148[1], s$151 = a$148[2], best$152 = a$148[3], bd$153 = a$148[4], ((s$151 > 3) ? best$152 : (let$154 = (absi$14)($R.isub($R.iadd((bx$53)(s$151), 36), x$150)), d$155 = let$154, ((((at$23)([town$149, s$151]) < (floors$57)(s$151)) && (d$155 < bd$153)) ? (nearest_plain$147)([town$149, x$150, $R.iadd(s$151, 1), s$151, d$155]) : (nearest_plain$147)([town$149, x$150, $R.iadd(s$151, 1), best$152, bd$153]))))); }, 22, [bx$53, absi$14, nearest_plain$147, floors$57, at$23]), nearest_plain$147); })(), nearest_plain$156 = def$146, def$157 = (() => { let fall$158; return (fall$158 = $R.fn((a$159) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ds$160, town$161, m$162, d$163, rest$164, let$165, y$166, let$167, s$168, let$169, landed$170, let$171, p$172, let$173, more$174, t2$175; return (ds$160 = a$159[0], town$161 = a$159[1], (m$162 = ds$160, ((m$162 === null) ? ([null, town$161]) : ((m$162 !== null) ? (d$163 = m$162.h, rest$164 = m$162.t, (let$165 = $R.iadd($R.dot(d$163, "y"), 4), y$166 = let$165, (let$167 = (building_at$114)($R.dot(d$163, "x")), s$168 = let$167, (let$169 = ((y$166 >= 762) || ((s$168 >= 0) && (y$166 >= (roof$61)(s$168)))), landed$170 = let$169, (let$171 = (landed$170 ? (nearest_plain$156)([town$161, $R.dot(d$163, "x"), 0, $R.isub(0, 1), 100000]) : $R.isub(0, 1)), p$172 = let$171, (let$173 = (fall$158)([rest$164, ((p$172 >= 0) ? (set_at$33)([town$161, p$172, $R.iadd((at$23)([town$161, p$172]), 1)]) : town$161)]), more$174 = let$173[0], t2$175 = let$173[1], (landed$170 ? [more$174, t2$175] : [{h: $R.tup([$R.dot(d$163, "x"), y$166], ["x", "y"]), t: more$174}, t2$175]))))))) : $R.nomatch("case"))))); }, 23, [building_at$114, roof$61, nearest_plain$156, at$23, set_at$33, fall$158]), fall$158); })(), fall$176 = def$157, def$177 = (() => { let count$178; return (count$178 = $R.fn((a$179) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ds$180, m$181, rest$182; return (ds$180 = a$179, (m$181 = ds$180, ((m$181 === null) ? (0) : ((m$181 !== null) ? (rest$182 = m$181.t, $R.iadd(1, (count$178)(rest$182))) : $R.nomatch("case"))))); }, 24, [count$178]), count$178); })(), count$183 = def$177, def$184 = (() => { let col_from$185; return (col_from$185 = $R.fn((a$186) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$187, c$188, k$189, let$190, cc$191; return (aliens$187 = a$186[0], c$188 = a$186[1], k$189 = a$186[2], ((k$189 > 8) ? $R.isub(0, 1) : (let$190 = (md$6)([$R.iadd(c$188, k$189), 9]), cc$191 = let$190, ((col_has$119)([aliens$187, cc$191]) ? cc$191 : (col_from$185)([aliens$187, c$188, $R.iadd(k$189, 1)]))))); }, 25, [md$6, col_from$185, col_has$119]), col_from$185); })(), col_from$192 = def$184, def$193 = $R.fn((a$194) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$195, wait$196, hit$197; return (g$195 = a$194[0], wait$196 = a$194[1], hit$197 = a$194[2], $R.tup([$R.dot(g$195, "cx"), $R.dot(g$195, "hx"), $R.dot(g$195, "hy"), $R.dot(g$195, "drops"), $R.dot(g$195, "aliens"), $R.dot(g$195, "fx"), $R.dot(g$195, "fy"), $R.dot(g$195, "fdir"), $R.dot(g$195, "march"), $R.dot(g$195, "town"), $R.dot(g$195, "glow"), $R.dot(g$195, "tries"), $R.dot(g$195, "hearts"), $R.dot(g$195, "wins"), $R.dot(g$195, "wave"), $R.dot(g$195, "seed"), wait$196, $R.dot(g$195, "verdict"), $R.dot(g$195, "over"), hit$197, $R.iadd($R.dot(g$195, "t"), 1)], ["cx", "hx", "hy", "drops", "aliens", "fx", "fy", "fdir", "march", "town", "glow", "tries", "hearts", "wins", "wave", "seed", "wait", "verdict", "over", "hit", "t"])); }, 26, null), paused$198 = def$193, def$199 = $R.fn((a$200) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$201, move$202, fire$203, let$204, let$205, x$206, cx$207, let$208, firing$209, let$210, hx0$211, let$212, hy0$213, let$214, hy1$215, let$216, let$217, a$218, hitA$219, let$220, aliens$221, let$222, heart_on$223, let$224, hearts$225, let$226, left$227, let$228, marching$229, let$230, edge$231, let$232, fx$233, let$234, fy$235, let$236, fdir$237, let$238, march$239, let$240, drops0$241, town$242, let$243, painted$244, let$245, s1$246, let$247, c$248, let$249, lr$250, let$251, n$252, let$253, drop$254, let$255, drops$256, let$257, late$258, let$259, glow$260, let$261, landed$262, let$263, verdict$264, let$265, tries$266; return (g$201 = a$200[0], move$202 = a$200[1], fire$203 = a$200[2], ($R.dot(g$201, "over") ? g$201 : (($R.dot(g$201, "wait") > 1) ? (paused$198)([g$201, $R.isub($R.dot(g$201, "wait"), 1), 0]) : ($R.eq($R.dot(g$201, "wait"), 1) ? (wave_start$90)([$R.dot(g$201, "cx"), $R.dot(g$201, "tries"), $R.dot(g$201, "hearts"), $R.dot(g$201, "wins"), ($R.eq($R.dot(g$201, "verdict"), 3) ? $R.iadd($R.dot(g$201, "wave"), 1) : $R.dot(g$201, "wave")), $R.dot(g$201, "seed"), $R.iadd($R.dot(g$201, "t"), 1), 7]) : (let$204 = (let$205 = $R.iadd($R.dot(g$201, "cx"), $R.imul(6, move$202)), x$206 = let$205, ((x$206 < 30) ? 30 : ((x$206 > 570) ? 570 : x$206))), cx$207 = let$204, (let$208 = (fire$203 && ($R.dot(g$201, "hy") < 0)), firing$209 = let$208, (let$210 = (firing$209 ? cx$207 : $R.dot(g$201, "hx")), hx0$211 = let$210, (let$212 = (firing$209 ? 724 : $R.dot(g$201, "hy")), hy0$213 = let$212, (let$214 = ((hy0$213 >= 0) ? $R.isub(hy0$213, 12) : $R.isub(0, 1)), hy1$215 = let$214, (let$216 = ((hy1$215 >= 0) ? (let$217 = (alien_at$108)([$R.dot(g$201, "aliens"), $R.dot(g$201, "fx"), $R.dot(g$201, "fy"), hx0$211, hy1$215]), a$218 = let$217, ((a$218 >= 0) ? a$218 : (alien_at$108)([$R.dot(g$201, "aliens"), $R.dot(g$201, "fx"), $R.dot(g$201, "fy"), hx0$211, $R.iadd(hy1$215, 6)]))) : $R.isub(0, 1)), hitA$219 = let$216, (let$220 = ((hitA$219 >= 0) ? (set_at$33)([$R.dot(g$201, "aliens"), hitA$219, 0]) : $R.dot(g$201, "aliens")), aliens$221 = let$220, (let$222 = ((hy1$215 >= 0) && (hitA$219 < 0)), heart_on$223 = let$222, (let$224 = $R.iadd($R.dot(g$201, "hearts"), ((hitA$219 >= 0) ? 1 : 0)), hearts$225 = let$224, (let$226 = (alive$41)(aliens$221), left$227 = let$226, (let$228 = ($R.dot(g$201, "march") <= 1), marching$229 = let$228, (let$230 = (($R.dot(g$201, "fdir") > 0) ? ($R.iadd($R.iadd($R.iadd($R.dot(g$201, "fx"), $R.imul((last_col$131)([aliens$221, 8]), 48)), 32), 8) > 592) : ($R.isub($R.iadd($R.dot(g$201, "fx"), $R.imul((first_col$125)([aliens$221, 0]), 48)), 8) < 8)), edge$231 = let$230, (let$232 = ((marching$229 && (!(edge$231))) ? $R.iadd($R.dot(g$201, "fx"), $R.imul(8, $R.dot(g$201, "fdir"))) : $R.dot(g$201, "fx")), fx$233 = let$232, (let$234 = ((marching$229 && edge$231) ? $R.iadd($R.dot(g$201, "fy"), 20) : $R.dot(g$201, "fy")), fy$235 = let$234, (let$236 = ((marching$229 && edge$231) ? $R.isub(0, $R.dot(g$201, "fdir")) : $R.dot(g$201, "fdir")), fdir$237 = let$236, (let$238 = (marching$229 ? $R.iadd(4, $R.idiv(left$227, 2)) : $R.isub($R.dot(g$201, "march"), 1)), march$239 = let$238, (let$240 = (fall$176)([$R.dot(g$201, "drops"), $R.dot(g$201, "town")]), drops0$241 = let$240[0], town$242 = let$240[1], (let$243 = (sum$49)(town$242), painted$244 = let$243, (let$245 = (next$10)($R.dot(g$201, "seed")), s1$246 = let$245, (let$247 = (col_from$192)([aliens$221, (md$6)([$R.idiv(s1$246, 1000), 9]), 0]), c$248 = let$247, (let$249 = ((c$248 >= 0) ? (lowest$138)([aliens$221, c$248, 4]) : $R.isub(0, 1)), lr$250 = let$249, (let$251 = (count$183)(drops0$241), n$252 = let$251, (let$253 = ((lr$250 >= 0) && (($R.iadd(painted$244, n$252) < full$63) && ((n$252 < 3) && ((md$6)([s1$246, 1000]) < $R.iadd(3, $R.idiv(left$227, 3)))))), drop$254 = let$253, (let$255 = (drop$254 ? {h: $R.tup([$R.iadd($R.iadd(fx$233, $R.imul(c$248, 48)), 16), $R.iadd($R.iadd(fy$235, $R.imul(lr$250, 40)), 24)], ["x", "y"]), t: drops0$241} : drops0$241), drops$256 = let$255, (let$257 = ((painted$244 >= full$63) && $R.eq($R.dot(g$201, "glow"), 1)), late$258 = let$257, (let$259 = ((painted$244 >= full$63) ? (($R.dot(g$201, "glow") > 0) ? $R.isub($R.dot(g$201, "glow"), 1) : 480) : 0), glow$260 = let$259, (let$261 = ((left$227 > 0) && ((bottom$145)([aliens$221, fy$235, 4]) >= 630)), landed$262 = let$261, (let$263 = ($R.eq(left$227, 0) ? ((painted$244 >= full$63) ? 3 : 5) : (landed$262 ? 4 : (late$258 ? 6 : 0))), verdict$264 = let$263, ((verdict$264 > 0) ? (let$265 = ($R.eq(verdict$264, 3) ? $R.dot(g$201, "tries") : $R.isub($R.dot(g$201, "tries"), 1)), tries$266 = let$265, $R.tup([cx$207, $R.isub(0, 1), $R.isub(0, 1), null, aliens$221, fx$233, fy$235, fdir$237, march$239, town$242, glow$260, tries$266, hearts$225, $R.iadd($R.dot(g$201, "wins"), ($R.eq(verdict$264, 3) ? 1 : 0)), $R.dot(g$201, "wave"), s1$246, ((tries$266 <= 0) ? 0 : 150), verdict$264, (tries$266 <= 0), verdict$264, $R.iadd($R.dot(g$201, "t"), 1)], ["cx", "hx", "hy", "drops", "aliens", "fx", "fy", "fdir", "march", "town", "glow", "tries", "hearts", "wins", "wave", "seed", "wait", "verdict", "over", "hit", "t"])) : $R.tup([cx$207, (heart_on$223 ? hx0$211 : $R.isub(0, 1)), (heart_on$223 ? hy1$215 : $R.isub(0, 1)), drops$256, aliens$221, fx$233, fy$235, fdir$237, march$239, town$242, glow$260, $R.dot(g$201, "tries"), hearts$225, $R.dot(g$201, "wins"), $R.dot(g$201, "wave"), s1$246, 0, $R.dot(g$201, "verdict"), false, ((hitA$219 >= 0) ? 1 : 0), $R.iadd($R.dot(g$201, "t"), 1)], ["cx", "hx", "hy", "drops", "aliens", "fx", "fy", "fdir", "march", "town", "glow", "tries", "hearts", "wins", "wave", "seed", "wait", "verdict", "over", "hit", "t"])))))))))))))))))))))))))))))))))); }, 27, [alien_at$108, set_at$33, alive$41, first_col$125, last_col$131, fall$176, sum$49, next$10, md$6, col_from$192, lowest$138, count$183, full$63, bottom$145, wave_start$90, paused$198]), step$267 = def$199, def$268 = $R.fn((a$269) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$270; return (g$270 = a$269, $R.isub($R.isub(full$63, (sum$49)($R.dot(g$270, "town"))), (count$183)($R.dot(g$270, "drops")))); }, 28, [count$183, sum$49, full$63]), to_come$271 = def$268, def$272 = $R.fn((a$273) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$274, p$275; return (g$274 = a$273[0], p$275 = a$273[1], ((p$275 <= 0) ? 1 : $R.iadd(1, $R.idiv($R.isub($R.iadd($R.imul($R.imul(p$275, 9), (rows_of$67)($R.dot(g$274, "wave"))), full$63), 1), full$63)))); }, 29, [full$63, rows_of$67]), keep$276 = def$272, def$277 = (() => { let aim$278; return (aim$278 = $R.fn((a$279) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$280, c$281, best$282, bd$283, let$284, r$285, let$286, rise$287, let$288, drift$289, let$290, x$291, let$292, d$293; return (g$280 = a$279[0], c$281 = a$279[1], best$282 = a$279[2], bd$283 = a$279[3], ((c$281 > 8) ? best$282 : ((!((col_has$119)([$R.dot(g$280, "aliens"), c$281]))) ? (aim$278)([g$280, $R.iadd(c$281, 1), best$282, bd$283]) : (let$284 = (lowest$138)([$R.dot(g$280, "aliens"), c$281, 4]), r$285 = let$284, (let$286 = $R.idiv($R.isub(724, $R.iadd($R.iadd($R.dot(g$280, "fy"), $R.imul(r$285, 40)), 12)), 12), rise$287 = let$286, (let$288 = $R.imul($R.imul($R.idiv(rise$287, $R.iadd(4, $R.idiv((alive$41)($R.dot(g$280, "aliens")), 2))), 8), $R.dot(g$280, "fdir")), drift$289 = let$288, (let$290 = $R.iadd($R.iadd($R.iadd($R.dot(g$280, "fx"), $R.imul(c$281, 48)), 16), drift$289), x$291 = let$290, (let$292 = $R.iadd((absi$14)($R.isub(x$291, $R.dot(g$280, "cx"))), (($R.dot(g$280, "glow") > 0) ? 0 : $R.imul(120, $R.isub(4, r$285)))), d$293 = let$292, ((d$293 < bd$283) ? (aim$278)([g$280, $R.iadd(c$281, 1), x$291, d$293]) : (aim$278)([g$280, $R.iadd(c$281, 1), best$282, bd$283])))))))))); }, 30, [lowest$138, alive$41, absi$14, aim$278, col_has$119]), aim$278); })(), aim$294 = def$277, def$295 = $R.fn((a$296) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$297, let$298, left$299, let$300, x$301, let$302, move$303, let$304, near$305, let$306, want$307; return (g$297 = a$296, (($R.dot(g$297, "over") || ($R.dot(g$297, "wait") > 0)) ? $R.tup([0, false], ["move", "fire"]) : (let$298 = (alive$41)($R.dot(g$297, "aliens")), left$299 = let$298, (let$300 = (aim$294)([g$297, 0, $R.dot(g$297, "cx"), 100000]), x$301 = let$300, (let$302 = ((x$301 > $R.iadd($R.dot(g$297, "cx"), 3)) ? 1 : ((x$301 < $R.isub($R.dot(g$297, "cx"), 3)) ? $R.isub(0, 1) : 0)), move$303 = let$302, (let$304 = ($R.isub(630, (bottom$145)([$R.dot(g$297, "aliens"), $R.dot(g$297, "fy"), 4])) < 50), near$305 = let$304, (let$306 = (($R.dot(g$297, "glow") > 0) || ((left$299 >= 2) && (near$305 || ($R.isub(left$299, 1) >= (keep$276)([g$297, (to_come$271)(g$297)]))))), want$307 = let$306, $R.tup([move$303, (want$307 && (($R.dot(g$297, "hy") < 0) && ((absi$14)($R.isub(x$301, $R.dot(g$297, "cx"))) <= 10)))], ["move", "fire"])))))))); }, 31, [alive$41, aim$294, bottom$145, to_come$271, keep$276, absi$14]), robot$308 = def$295, $R.tup([md$6, next$10, absi$14, at$23, set_at$33, alive$41, sum$49, bx$53, floors$57, roof$61, full$63, rows_of$67, kinds_from$75, top_of$79, wave_start$90, start$94, alien_at$108, building_at$114, col_has$119, first_col$125, last_col$131, lowest$138, bottom$145, nearest_plain$156, fall$176, count$183, col_from$192, paused$198, step$267, to_come$271, keep$276, aim$294, robot$308], ["md", "next", "absi", "at", "set_at", "alive", "sum", "bx", "floors", "roof", "full", "rows_of", "kinds_from", "top_of", "wave_start", "start", "alien_at", "building_at", "col_has", "first_col", "last_col", "lowest", "bottom", "nearest_plain", "fall", "count", "col_from", "paused", "step", "to_come", "keep", "aim", "robot"])); })(), StarWave$309 = let$1, $R.tup([$R.dot(StarWave$309, "start"), $R.dot(StarWave$309, "step"), $R.dot(StarWave$309, "robot")], ["start", "step", "robot"]));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
  const made = "0d739f2b25";
  // (ticket 827, reimagined in 0.0.57) Game = (cx, hx, hy = Int, drops = [Drop], aliens = [Int], fx, fy, fdir, march = Int, town = [Int],
  // glow, tries, hearts, wins, wave, seed, wait, verdict = Int, over = Bool, hit, t = Int); Drop = (x, y = Int); Choice = (move = Int, fire = Bool)
  const GAME = ["cx", "hx", "hy", "drops", "aliens", "fx", "fy", "fdir", "march", "town", "glow", "tries", "hearts", "wins", "wave", "seed", "wait", "verdict", "over", "hit", "t"];
  const gameIn = g => $R.tup(GAME.map(k => k === "drops" ? list(g.drops.map(d => $R.tup([d.x, d.y], ["x", "y"]))) : k === "aliens" || k === "town" ? list(g[k]) : g[k]), GAME);
  const gameOut = r => Object.fromEntries(GAME.map(k => [k, k === "drops" ? array(r.drops).map(d => ({ x: int(d.x), y: int(d.y) })) : k === "aliens" || k === "town" ? array(r[k]).map(int) : k === "over" ? r[k] : int(r[k])]));
  // start : Int -> Game (a seed); step : (Game, Int, Bool) -> Game (a move, -1, 0 or 1, and a shot); robot : Game -> Choice
  const start = seed => gameOut(P.start(seed));
  const step = (g, move, fire) => gameOut(P.step([gameIn(g), move, fire]));
  const robot = g => { const c = P.robot(gameIn(g)); return { move: int(c.move), fire: c.fire }; };
  const api = { start, step, robot, made };
  // (ticket 797) a game's converters, for node/three-way.mjs to time the page boundary by itself
  try { api.$convert = { gameIn, gameOut }; } catch (e) { /* an oracle: no game crosses */ }
  if (typeof window !== "undefined") window.StarWaveCompiled = api;
  if (typeof module !== "undefined") module.exports = api;
})();
