// hazeljs-examples, Checkers: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel d15466c7b1 (trial/794-games-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// (ticket 794) The page runs its rules through this file instead of loading hazeljs and building the program, unless asked
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
"use strict";  let let$1, Checkers$323; return (let$1 = (() => { let def$2, lo8$5, def$6, bit$9, def$10, has$16, def$17, add$21, def$22, drop$26, def$27, drop_all$35, def$36, squares$43, def$44, step$57, def$58, mem$66, def$67, dirs$71, def$72, side$76, def$77, crowns$81, def$82, wide$85, def$86, from_page$89, def$90, join_seqs$98, def$99, prefix$109, def$110, jumps_in$133, def$134, join_moves$142, def$143, as_moves$152, def$153, caps_of$166, def$167, steps_in$181, def$182, steps_of$192, def$193, legal$204, def$205, last_of$213, def$214, after$233, def$234, apply$247, def$248, moves$251, def$252, start$253, def$254, worth_of$264, def$265, value$268, def$269, walk$288, def$289, pick$314, def$315, choose$322; return (def$2 = $R.fn((a$3) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let k$4; return (k$4 = a$3, ((k$4 < 4) ? ((k$4 < 2) ? ($R.eq(k$4, 0) ? 1 : 2) : ($R.eq(k$4, 2) ? 4 : 8)) : ((k$4 < 6) ? ($R.eq(k$4, 4) ? 16 : 32) : ($R.eq(k$4, 6) ? 64 : 128)))); }, 0, null), lo8$5 = def$2, def$6 = $R.fn((a$7) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let k$8; return (k$8 = a$7, ((k$8 < 8) ? (lo8$5)(k$8) : ((k$8 < 16) ? $R.imul(256, (lo8$5)($R.isub(k$8, 8))) : ((k$8 < 24) ? $R.imul(65536, (lo8$5)($R.isub(k$8, 16))) : $R.imul(16777216, (lo8$5)($R.isub(k$8, 24))))))); }, 1, [lo8$5]), bit$9 = def$6, def$10 = $R.fn((a$11) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$12, k$13, let$14, q$15; return (b$12 = a$11[0], k$13 = a$11[1], (let$14 = $R.idiv(b$12, (bit$9)(k$13)), q$15 = let$14, $R.eq($R.isub(q$15, $R.imul($R.idiv(q$15, 2), 2)), 1))); }, 2, [bit$9]), has$16 = def$10, def$17 = $R.fn((a$18) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$19, k$20; return (b$19 = a$18[0], k$20 = a$18[1], ((has$16)([b$19, k$20]) ? b$19 : $R.iadd(b$19, (bit$9)(k$20)))); }, 3, [bit$9, has$16]), add$21 = def$17, def$22 = $R.fn((a$23) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$24, k$25; return (b$24 = a$23[0], k$25 = a$23[1], ((has$16)([b$24, k$25]) ? $R.isub(b$24, (bit$9)(k$25)) : b$24)); }, 4, [bit$9, has$16]), drop$26 = def$22, def$27 = (() => { let drop_all$28; return (drop_all$28 = $R.fn((a$29) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$30, ks$31, m$32, k$33, rest$34; return (b$30 = a$29[0], ks$31 = a$29[1], (m$32 = ks$31, ((m$32 === null) ? (b$30) : ((m$32 !== null) ? (k$33 = m$32.h, rest$34 = m$32.t, (drop_all$28)([(drop$26)([b$30, k$33]), rest$34])) : $R.nomatch("case"))))); }, 5, [drop$26, drop_all$28]), drop_all$28); })(), drop_all$35 = def$27, def$36 = (() => { let squares$37; return (squares$37 = $R.fn((a$38) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$39, k$40, let$41, rest$42; return (b$39 = a$38[0], k$40 = a$38[1], ($R.eq(b$39, 0) ? null : (let$41 = (squares$37)([$R.idiv(b$39, 2), $R.iadd(k$40, 1)]), rest$42 = let$41, ($R.eq($R.isub(b$39, $R.imul($R.idiv(b$39, 2), 2)), 1) ? {h: k$40, t: rest$42} : rest$42)))); }, 6, [squares$37]), squares$37); })(), squares$43 = def$36, def$44 = $R.fn((a$45) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$46, dr$47, dc$48, let$49, r$50, let$51, c$52, let$53, r2$54, let$55, c2$56; return (s$46 = a$45[0], dr$47 = a$45[1], dc$48 = a$45[2], (let$49 = $R.idiv(s$46, 4), r$50 = let$49, (let$51 = $R.iadd($R.imul(2, $R.isub(s$46, $R.imul(r$50, 4))), ($R.eq($R.isub(r$50, $R.imul($R.idiv(r$50, 2), 2)), 0) ? 1 : 0)), c$52 = let$51, (let$53 = $R.iadd(r$50, dr$47), r2$54 = let$53, (let$55 = $R.iadd(c$52, dc$48), c2$56 = let$55, (((r2$54 < 0) || ((r2$54 > 7) || ((c2$56 < 0) || (c2$56 > 7)))) ? $R.isub(0, 1) : $R.iadd($R.imul(r2$54, 4), $R.idiv(c2$56, 2)))))))); }, 7, null), step$57 = def$44, def$58 = (() => { let mem$59; return (mem$59 = $R.fn((a$60) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let x$61, xs$62, m$63, y$64, rest$65; return (x$61 = a$60[0], xs$62 = a$60[1], (m$63 = xs$62, ((m$63 === null) ? (false) : ((m$63 !== null) ? (y$64 = m$63.h, rest$65 = m$63.t, ($R.eq(y$64, x$61) || (mem$59)([x$61, rest$65]))) : $R.nomatch("case"))))); }, 8, [mem$59]), mem$59); })(), mem$66 = def$58, def$67 = $R.fn((a$68) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let who$69, king$70; return (who$69 = a$68[0], king$70 = a$68[1], (king$70 ? {h: [$R.isub(0, 1), $R.isub(0, 1)], t: {h: [$R.isub(0, 1), 1], t: {h: [1, $R.isub(0, 1)], t: {h: [1, 1], t: null}}}} : ($R.eq(who$69, 1) ? {h: [$R.isub(0, 1), $R.isub(0, 1)], t: {h: [$R.isub(0, 1), 1], t: null}} : {h: [1, $R.isub(0, 1)], t: {h: [1, 1], t: null}}))); }, 9, null), dirs$71 = def$67, def$72 = $R.fn((a$73) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$74, who$75; return (g$74 = a$73[0], who$75 = a$73[1], ($R.eq(who$75, 1) ? $R.dot(g$74, "black") : $R.dot(g$74, "white"))); }, 10, null), side$76 = def$72, def$77 = $R.fn((a$78) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let who$79, s$80; return (who$79 = a$78[0], s$80 = a$78[1], ($R.eq(who$79, 1) ? (s$80 < 4) : (s$80 >= 28))); }, 11, null), crowns$81 = def$77, def$82 = $R.fn((a$83) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$84; return (b$84 = a$83, ((b$84 < 0) ? $R.iadd(b$84, 4294967296) : b$84)); }, 12, null), wide$85 = def$82, def$86 = $R.fn((a$87) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$88; return (g$88 = a$87, $R.tup([(wide$85)($R.dot(g$88, "black")), (wide$85)($R.dot(g$88, "white")), (wide$85)($R.dot(g$88, "kings")), $R.dot(g$88, "turn"), $R.dot(g$88, "quiet"), $R.dot(g$88, "over"), $R.dot(g$88, "winner"), $R.dot(g$88, "last")], ["black", "white", "kings", "turn", "quiet", "over", "winner", "last"])); }, 13, [wide$85]), from_page$89 = def$86, def$90 = (() => { let join_seqs$91; return (join_seqs$91 = $R.fn((a$92) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$93, ys$94, m$95, x$96, rest$97; return (xs$93 = a$92[0], ys$94 = a$92[1], (m$95 = xs$93, ((m$95 === null) ? (ys$94) : ((m$95 !== null) ? (x$96 = m$95.h, rest$97 = m$95.t, {h: x$96, t: (join_seqs$91)([rest$97, ys$94])}) : $R.nomatch("case"))))); }, 14, [join_seqs$91]), join_seqs$91); })(), join_seqs$98 = def$90, def$99 = (() => { let prefix$100; return (prefix$100 = $R.fn((a$101) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let land$102, over$103, seqs$104, m$105, ls$106, ts$107, rest$108; return (land$102 = a$101[0], over$103 = a$101[1], seqs$104 = a$101[2], (m$105 = seqs$104, ((m$105 === null) ? (null) : ((m$105 !== null) ? (ls$106 = m$105.h[0], ts$107 = m$105.h[1], rest$108 = m$105.t, {h: [{h: land$102, t: ls$106}, {h: over$103, t: ts$107}], t: (prefix$100)([land$102, over$103, rest$108])}) : $R.nomatch("case"))))); }, 15, [prefix$100]), prefix$100); })(), prefix$109 = def$99, def$110 = (() => { let jumps_in$111; return (jumps_in$111 = $R.fn((a$112) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let who$113, king$114, all$115, them$116, s$117, took$118, ds$119, m$120, dr$121, dc$122, rest$123, let$124, others$125, let$126, over$127, let$128, land$129, let$130, more$131, m$132; return (who$113 = a$112[0], king$114 = a$112[1], all$115 = a$112[2], them$116 = a$112[3], s$117 = a$112[4], took$118 = a$112[5], ds$119 = a$112[6], (m$120 = ds$119, ((m$120 === null) ? (null) : ((m$120 !== null) ? (dr$121 = m$120.h[0], dc$122 = m$120.h[1], rest$123 = m$120.t, (let$124 = (jumps_in$111)([who$113, king$114, all$115, them$116, s$117, took$118, rest$123]), others$125 = let$124, (let$126 = (step$57)([s$117, dr$121, dc$122]), over$127 = let$126, (let$128 = (step$57)([s$117, $R.iadd(dr$121, dr$121), $R.iadd(dc$122, dc$122)]), land$129 = let$128, (((over$127 >= 0) && ((land$129 >= 0) && ((has$16)([them$116, over$127]) && ((!((mem$66)([over$127, took$118]))) && (!((has$16)([all$115, land$129]))))))) ? (let$130 = (((!(king$114)) && (crowns$81)([who$113, land$129])) ? null : (jumps_in$111)([who$113, king$114, all$115, them$116, land$129, {h: over$127, t: took$118}, (dirs$71)([who$113, king$114])])), more$131 = let$130, (join_seqs$98)([(m$132 = more$131, ((m$132 === null) ? ({h: [{h: land$129, t: null}, {h: over$127, t: null}], t: null}) : ((m$132 !== null) ? ((prefix$109)([land$129, over$127, more$131])) : $R.nomatch("case")))), others$125])) : others$125))))) : $R.nomatch("case"))))); }, 16, [jumps_in$111, step$57, dirs$71, crowns$81, prefix$109, join_seqs$98, has$16, mem$66]), jumps_in$111); })(), jumps_in$133 = def$110, def$134 = (() => { let join_moves$135; return (join_moves$135 = $R.fn((a$136) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$137, ys$138, m$139, x$140, rest$141; return (xs$137 = a$136[0], ys$138 = a$136[1], (m$139 = xs$137, ((m$139 === null) ? (ys$138) : ((m$139 !== null) ? (x$140 = m$139.h, rest$141 = m$139.t, {h: x$140, t: (join_moves$135)([rest$141, ys$138])}) : $R.nomatch("case"))))); }, 17, [join_moves$135]), join_moves$135); })(), join_moves$142 = def$134, def$143 = (() => { let as_moves$144; return (as_moves$144 = $R.fn((a$145) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$146, seqs$147, m$148, ls$149, ts$150, rest$151; return (s$146 = a$145[0], seqs$147 = a$145[1], (m$148 = seqs$147, ((m$148 === null) ? (null) : ((m$148 !== null) ? (ls$149 = m$148.h[0], ts$150 = m$148.h[1], rest$151 = m$148.t, {h: $R.tup([s$146, ls$149, ts$150], ["from", "path", "took"]), t: (as_moves$144)([s$146, rest$151])}) : $R.nomatch("case"))))); }, 18, [as_moves$144]), as_moves$144); })(), as_moves$152 = def$143, def$153 = (() => { let caps_of$154; return (caps_of$154 = $R.fn((a$155) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$156, who$157, all$158, them$159, ss$160, m$161, s$162, rest$163, let$164, k$165; return (g$156 = a$155[0], who$157 = a$155[1], all$158 = a$155[2], them$159 = a$155[3], ss$160 = a$155[4], (m$161 = ss$160, ((m$161 === null) ? (null) : ((m$161 !== null) ? (s$162 = m$161.h, rest$163 = m$161.t, (let$164 = (has$16)([$R.dot(g$156, "kings"), s$162]), k$165 = let$164, (join_moves$142)([(as_moves$152)([s$162, (jumps_in$133)([who$157, k$165, (drop$26)([all$158, s$162]), them$159, s$162, null, (dirs$71)([who$157, k$165])])]), (caps_of$154)([g$156, who$157, all$158, them$159, rest$163])]))) : $R.nomatch("case"))))); }, 19, [has$16, drop$26, dirs$71, jumps_in$133, as_moves$152, caps_of$154, join_moves$142]), caps_of$154); })(), caps_of$166 = def$153, def$167 = (() => { let steps_in$168; return (steps_in$168 = $R.fn((a$169) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let all$170, s$171, ds$172, m$173, dr$174, dc$175, rest$176, let$177, t$178, let$179, others$180; return (all$170 = a$169[0], s$171 = a$169[1], ds$172 = a$169[2], (m$173 = ds$172, ((m$173 === null) ? (null) : ((m$173 !== null) ? (dr$174 = m$173.h[0], dc$175 = m$173.h[1], rest$176 = m$173.t, (let$177 = (step$57)([s$171, dr$174, dc$175]), t$178 = let$177, (let$179 = (steps_in$168)([all$170, s$171, rest$176]), others$180 = let$179, (((t$178 >= 0) && (!((has$16)([all$170, t$178])))) ? {h: $R.tup([s$171, {h: t$178, t: null}, null], ["from", "path", "took"]), t: others$180} : others$180)))) : $R.nomatch("case"))))); }, 20, [step$57, steps_in$168, has$16]), steps_in$168); })(), steps_in$181 = def$167, def$182 = (() => { let steps_of$183; return (steps_of$183 = $R.fn((a$184) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$185, who$186, all$187, ss$188, m$189, s$190, rest$191; return (g$185 = a$184[0], who$186 = a$184[1], all$187 = a$184[2], ss$188 = a$184[3], (m$189 = ss$188, ((m$189 === null) ? (null) : ((m$189 !== null) ? (s$190 = m$189.h, rest$191 = m$189.t, (join_moves$142)([(steps_in$181)([all$187, s$190, (dirs$71)([who$186, (has$16)([$R.dot(g$185, "kings"), s$190])])]), (steps_of$183)([g$185, who$186, all$187, rest$191])])) : $R.nomatch("case"))))); }, 21, [has$16, dirs$71, steps_in$181, steps_of$183, join_moves$142]), steps_of$183); })(), steps_of$192 = def$182, def$193 = $R.fn((a$194) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$195, let$196, who$197, let$198, all$199, let$200, ss$201, m$202, cs$203; return (g$195 = a$194, ($R.dot(g$195, "over") ? null : (let$196 = $R.dot(g$195, "turn"), who$197 = let$196, (let$198 = $R.iadd($R.dot(g$195, "black"), $R.dot(g$195, "white")), all$199 = let$198, (let$200 = (squares$43)([(side$76)([g$195, who$197]), 0]), ss$201 = let$200, (m$202 = (caps_of$166)([g$195, who$197, all$199, (side$76)([g$195, $R.isub(3, who$197)]), ss$201]), ((m$202 === null) ? ((steps_of$192)([g$195, who$197, all$199, ss$201])) : (cs$203 = m$202, cs$203)))))))); }, 22, [side$76, squares$43, steps_of$192, caps_of$166]), legal$204 = def$193, def$205 = (() => { let last_of$206; return (last_of$206 = $R.fn((a$207) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$208, d$209, m$210, x$211, rest$212; return (xs$208 = a$207[0], d$209 = a$207[1], (m$210 = xs$208, ((m$210 === null) ? (d$209) : ((m$210 !== null) ? (x$211 = m$210.h, rest$212 = m$210.t, (last_of$206)([rest$212, x$211])) : $R.nomatch("case"))))); }, 23, [last_of$206]), last_of$206); })(), last_of$213 = def$205, def$214 = $R.fn((a$215) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$216, m$217, let$218, who$219, let$220, dest$221, let$222, king$223, let$224, mine$225, let$226, theirs$227, let$228, ks$229, let$230, m$231, quiet$232; return (g$216 = a$215[0], m$217 = a$215[1], (let$218 = $R.dot(g$216, "turn"), who$219 = let$218, (let$220 = (last_of$213)([$R.dot(m$217, "path"), $R.dot(m$217, "from")]), dest$221 = let$220, (let$222 = (has$16)([$R.dot(g$216, "kings"), $R.dot(m$217, "from")]), king$223 = let$222, (let$224 = (add$21)([(drop$26)([(side$76)([g$216, who$219]), $R.dot(m$217, "from")]), dest$221]), mine$225 = let$224, (let$226 = (drop_all$35)([(side$76)([g$216, $R.isub(3, who$219)]), $R.dot(m$217, "took")]), theirs$227 = let$226, (let$228 = (drop_all$35)([(drop$26)([$R.dot(g$216, "kings"), $R.dot(m$217, "from")]), $R.dot(m$217, "took")]), ks$229 = let$228, (let$230 = (m$231 = $R.dot(m$217, "took"), ((m$231 === null) ? ((king$223 ? $R.iadd($R.dot(g$216, "quiet"), 1) : 0)) : ((m$231 !== null) ? (0) : $R.nomatch("case")))), quiet$232 = let$230, $R.tup([($R.eq(who$219, 1) ? mine$225 : theirs$227), ($R.eq(who$219, 1) ? theirs$227 : mine$225), ((king$223 || (crowns$81)([who$219, dest$221])) ? (add$21)([ks$229, dest$221]) : ks$229), $R.isub(3, who$219), quiet$232, false, 0, {h: $R.dot(m$217, "from"), t: $R.dot(m$217, "path")}], ["black", "white", "kings", "turn", "quiet", "over", "winner", "last"]))))))))); }, 24, [last_of$213, has$16, side$76, drop$26, add$21, drop_all$35, crowns$81]), after$233 = def$214, def$234 = $R.fn((a$235) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g0$236, m$237, let$238, g$239, let$240, c$241, let$242, end_as$245, m$246; return (g0$236 = a$235[0], m$237 = a$235[1], (let$238 = (from_page$89)(g0$236), g$239 = let$238, (let$240 = (after$233)([g$239, m$237]), c$241 = let$240, (let$242 = $R.fn((a$243) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let w$244; return (w$244 = a$243, $R.tup([$R.dot(c$241, "black"), $R.dot(c$241, "white"), $R.dot(c$241, "kings"), $R.dot(c$241, "turn"), $R.dot(c$241, "quiet"), true, w$244, $R.dot(c$241, "last")], ["black", "white", "kings", "turn", "quiet", "over", "winner", "last"])); }, 25, [c$241]), end_as$245 = let$242, (($R.dot(c$241, "quiet") >= 80) ? (end_as$245)(0) : (m$246 = (legal$204)(c$241), ((m$246 === null) ? ((end_as$245)($R.dot(g$239, "turn"))) : ((m$246 !== null) ? (c$241) : $R.nomatch("case"))))))))); }, 26, [from_page$89, after$233, legal$204]), apply$247 = def$234, def$248 = $R.fn((a$249) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$250; return (g$250 = a$249, (legal$204)((from_page$89)(g$250))); }, 27, [from_page$89, legal$204]), moves$251 = def$248, def$252 = $R.tup([4293918720, 4095, 0, 1, 0, false, 0, null], ["black", "white", "kings", "turn", "quiet", "over", "winner", "last"]), start$253 = def$252, def$254 = (() => { let worth_of$255; return (worth_of$255 = $R.fn((a$256) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let who$257, kings$258, ss$259, acc$260, m$261, s$262, rest$263; return (who$257 = a$256[0], kings$258 = a$256[1], ss$259 = a$256[2], acc$260 = a$256[3], (m$261 = ss$259, ((m$261 === null) ? (acc$260) : ((m$261 !== null) ? (s$262 = m$261.h, rest$263 = m$261.t, (worth_of$255)([who$257, kings$258, rest$263, $R.iadd(acc$260, ((has$16)([kings$258, s$262]) ? 160 : $R.iadd(100, $R.imul(2, ($R.eq(who$257, 1) ? $R.isub(7, $R.idiv(s$262, 4)) : $R.idiv(s$262, 4))))))])) : $R.nomatch("case"))))); }, 28, [has$16, worth_of$255]), worth_of$255); })(), worth_of$264 = def$254, def$265 = $R.fn((a$266) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$267; return (g$267 = a$266, $R.isub((worth_of$264)([$R.dot(g$267, "turn"), $R.dot(g$267, "kings"), (squares$43)([(side$76)([g$267, $R.dot(g$267, "turn")]), 0]), 0]), (worth_of$264)([$R.isub(3, $R.dot(g$267, "turn")), $R.dot(g$267, "kings"), (squares$43)([(side$76)([g$267, $R.isub(3, $R.dot(g$267, "turn"))]), 0]), 0]))); }, 29, [side$76, squares$43, worth_of$264]), value$268 = def$265, def$269 = (() => { let walk$270; return (walk$270 = $R.fn((a$271) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$272, ms$273, depth$274, alpha$275, beta$276, m$277, m$278, rest$279, let$280, c$281, let$282, m$283, cms$284, v$285, let$286, a$287; return (g$272 = a$271[0], ms$273 = a$271[1], depth$274 = a$271[2], alpha$275 = a$271[3], beta$276 = a$271[4], (m$277 = ms$273, ((m$277 === null) ? (alpha$275) : ((m$277 !== null) ? (m$278 = m$277.h, rest$279 = m$277.t, (let$280 = (after$233)([g$272, m$278]), c$281 = let$280, (let$282 = ((depth$274 <= 1) ? $R.isub(0, (value$268)(c$281)) : (m$283 = (legal$204)(c$281), ((m$283 === null) ? ($R.iadd(10000, depth$274)) : (cms$284 = m$283, $R.isub(0, (walk$270)([c$281, cms$284, $R.isub(depth$274, 1), $R.isub(0, beta$276), $R.isub(0, alpha$275)])))))), v$285 = let$282, (let$286 = ((v$285 > alpha$275) ? v$285 : alpha$275), a$287 = let$286, ((a$287 >= beta$276) ? a$287 : (walk$270)([g$272, rest$279, depth$274, a$287, beta$276])))))) : $R.nomatch("case"))))); }, 30, [after$233, walk$270, legal$204, value$268]), walk$270); })(), walk$288 = def$269, def$289 = (() => { let pick$290; return (pick$290 = $R.fn((a$291) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$292, ms$293, depth$294, rs$295, best$296, bv$297, br$298, m$299, m$300, rest$301, let$302, m$303, x$304, xs$305, r$306, more$307, let$308, c$309, let$310, m$311, cms$312, v$313; return (g$292 = a$291[0], ms$293 = a$291[1], depth$294 = a$291[2], rs$295 = a$291[3], best$296 = a$291[4], bv$297 = a$291[5], br$298 = a$291[6], (m$299 = ms$293, ((m$299 === null) ? (best$296) : ((m$299 !== null) ? (m$300 = m$299.h, rest$301 = m$299.t, (let$302 = (m$303 = rs$295, ((m$303 === null) ? ([0, null]) : ((m$303 !== null) ? (x$304 = m$303.h, xs$305 = m$303.t, [x$304, xs$305]) : $R.nomatch("case")))), r$306 = let$302[0], more$307 = let$302[1], (let$308 = (after$233)([g$292, m$300]), c$309 = let$308, (let$310 = ((depth$294 <= 1) ? $R.isub(0, (value$268)(c$309)) : (m$311 = (legal$204)(c$309), ((m$311 === null) ? ($R.iadd(10000, depth$294)) : (cms$312 = m$311, $R.isub(0, (walk$288)([c$309, cms$312, $R.isub(depth$294, 1), $R.isub(0, 1000000), 1000000])))))), v$313 = let$310, (((v$313 > bv$297) || ($R.eq(v$313, bv$297) && (r$306 > br$298))) ? (pick$290)([g$292, rest$301, depth$294, more$307, m$300, v$313, r$306]) : (pick$290)([g$292, rest$301, depth$294, more$307, best$296, bv$297, br$298])))))) : $R.nomatch("case"))))); }, 31, [after$233, walk$288, legal$204, value$268, pick$290]), pick$290); })(), pick$314 = def$289, def$315 = $R.fn((a$316) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g0$317, depth$318, rs$319, let$320, g$321; return (g0$317 = a$316[0], depth$318 = a$316[1], rs$319 = a$316[2], (let$320 = (from_page$89)(g0$317), g$321 = let$320, (pick$314)([g$321, (legal$204)(g$321), depth$318, rs$319, $R.tup([$R.isub(0, 1), null, null], ["from", "path", "took"]), $R.isub(0, 1000000), $R.isub(0, 1)]))); }, 32, [from_page$89, legal$204, pick$314]), choose$322 = def$315, $R.tup([lo8$5, bit$9, has$16, add$21, drop$26, drop_all$35, squares$43, step$57, mem$66, dirs$71, side$76, crowns$81, wide$85, from_page$89, join_seqs$98, prefix$109, jumps_in$133, join_moves$142, as_moves$152, caps_of$166, steps_in$181, steps_of$192, legal$204, last_of$213, after$233, apply$247, moves$251, start$253, worth_of$264, value$268, walk$288, pick$314, choose$322], ["lo8", "bit", "has", "add", "drop", "drop_all", "squares", "step", "mem", "dirs", "side", "crowns", "wide", "from_page", "join_seqs", "prefix", "jumps_in", "join_moves", "as_moves", "caps_of", "steps_in", "steps_of", "legal", "last_of", "after", "apply", "moves", "start", "worth_of", "value", "walk", "pick", "choose"])); })(), Checkers$323 = let$1, $R.tup([$R.dot(Checkers$323, "start"), $R.dot(Checkers$323, "moves"), $R.dot(Checkers$323, "apply"), $R.dot(Checkers$323, "choose")], ["start", "moves", "apply", "choose"]));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
  const made = "d15466c7b1";
  // (ticket 794, the games compiled as the oracles are) Game = (black = Int, white = Int, kings = Int, turn = Int, quiet = Int,
  // over = Bool, winner = Int, last = [Int]), Move = (from = Int, path = [Int], took = [Int])
  const G = ["black", "white", "kings", "turn", "quiet", "over", "winner", "last"], M = ["from", "path", "took"];
  const gameIn = g => $R.tup([g.black, g.white, g.kings, g.turn, g.quiet, g.over, g.winner, list(g.last)], G);
  const gameOut = r => ({ black: int(r.black), white: int(r.white), kings: int(r.kings), turn: int(r.turn), quiet: int(r.quiet),
                          over: r.over, winner: int(r.winner), last: array(r.last).map(int) });
  const moveIn = m => $R.tup([m.from, list(m.path), list(m.took)], M);
  const moveOut = r => ({ from: int(r.from), path: array(r.path).map(int), took: array(r.took).map(int) });
  // start : Game; moves : Game -> [Move]; apply : (Game, Move) -> Game; choose : (Game, Int, [Int]) -> Move
  const start = gameOut(P.start);
  const moves = g => array(P.moves(gameIn(g))).map(moveOut);
  const apply = (g, m) => gameOut(P.apply([gameIn(g), moveIn(m)]));
  const choose = (g, depth, rs) => moveOut(P.choose([gameIn(g), depth, list(rs || [])]));
  const api = { start, moves, apply, choose, made };
  // (ticket 797) a game's converters, for node/three-way.mjs to time the page boundary by itself
  try { api.$convert = { gameIn, gameOut }; } catch (e) { /* an oracle: no game crosses */ }
  if (typeof window !== "undefined") window.CheckersCompiled = api;
  if (typeof module !== "undefined") module.exports = api;
})();
