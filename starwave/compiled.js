// hazeljs-examples, Star wave: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel d58de34755 (trial/794-games-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
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
"use strict";  let let$1, StarWave$256; return (let$1 = (() => { let def$2, md$6, def$7, next$10, def$11, absi$14, def$15, at$23, def$24, set_at$33, def$34, alive$41, def$42, rows_from$48, def$49, ones$53, def$54, top_of$57, def$58, start$61, def$62, alien_at$75, def$76, block_at$87, def$88, col_has$92, def$93, first_col$98, def$99, last_col$104, def$105, lowest$111, def$112, bottom$118, def$119, fall$139, def$140, count$146, def$147, step$218, def$219, threat$227, def$228, aim$245, def$246, robot$255; return (def$2 = $R.fn((a$3) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$4, b$5; return (a$4 = a$3[0], b$5 = a$3[1], $R.isub(a$4, $R.imul($R.idiv(a$4, b$5), b$5))); }, 0, null), md$6 = def$2, def$7 = $R.fn((a$8) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$9; return (s$9 = a$8, (md$6)([$R.imul(s$9, 48271), 2147483647])); }, 1, [md$6]), next$10 = def$7, def$11 = $R.fn((a$12) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let v$13; return (v$13 = a$12, ((v$13 < 0) ? $R.isub(0, v$13) : v$13)); }, 2, null), absi$14 = def$11, def$15 = (() => { let at$16; return (at$16 = $R.fn((a$17) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$18, i$19, m$20, x$21, rest$22; return (xs$18 = a$17[0], i$19 = a$17[1], (m$20 = xs$18, ((m$20 === null) ? (0) : ((m$20 !== null) ? (x$21 = m$20.h, rest$22 = m$20.t, ((i$19 <= 0) ? x$21 : (at$16)([rest$22, $R.isub(i$19, 1)]))) : $R.nomatch("case"))))); }, 3, [at$16]), at$16); })(), at$23 = def$15, def$24 = (() => { let set_at$25; return (set_at$25 = $R.fn((a$26) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$27, i$28, v$29, m$30, x$31, rest$32; return (xs$27 = a$26[0], i$28 = a$26[1], v$29 = a$26[2], (m$30 = xs$27, ((m$30 === null) ? (null) : ((m$30 !== null) ? (x$31 = m$30.h, rest$32 = m$30.t, ((i$28 <= 0) ? {h: v$29, t: rest$32} : {h: x$31, t: (set_at$25)([rest$32, $R.isub(i$28, 1), v$29])})) : $R.nomatch("case"))))); }, 4, [set_at$25]), set_at$25); })(), set_at$33 = def$24, def$34 = (() => { let alive$35; return (alive$35 = $R.fn((a$36) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$37, m$38, x$39, rest$40; return (xs$37 = a$36, (m$38 = xs$37, ((m$38 === null) ? (0) : ((m$38 !== null) ? (x$39 = m$38.h, rest$40 = m$38.t, $R.iadd(((x$39 > 0) ? 1 : 0), (alive$35)(rest$40))) : $R.nomatch("case"))))); }, 5, [alive$35]), alive$35); })(), alive$41 = def$34, def$42 = (() => { let rows_from$43; return (rows_from$43 = $R.fn((a$44) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let i$45, let$46, r$47; return (i$45 = a$44, ((i$45 >= 45) ? null : {h: (let$46 = $R.idiv(i$45, 9), r$47 = let$46, ($R.eq(r$47, 0) ? 3 : ((r$47 <= 2) ? 2 : 1))), t: (rows_from$43)($R.iadd(i$45, 1))})); }, 6, [rows_from$43]), rows_from$43); })(), rows_from$48 = def$42, def$49 = (() => { let ones$50; return (ones$50 = $R.fn((a$51) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let k$52; return (k$52 = a$51, ((k$52 <= 0) ? null : {h: 1, t: (ones$50)($R.isub(k$52, 1))})); }, 7, [ones$50]), ones$50); })(), ones$53 = def$49, def$54 = $R.fn((a$55) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let w$56; return (w$56 = a$55, $R.iadd(110, $R.imul(20, ((w$56 > 5) ? 5 : w$56)))); }, 8, null), top_of$57 = def$54, def$58 = $R.fn((a$59) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seed$60; return (seed$60 = a$59, $R.tup([300, $R.isub(0, 1), $R.isub(0, 1), null, (rows_from$48)(0), 92, (top_of$57)(0), 1, 24, (ones$53)(128), 3, 0, 0, (next$10)($R.iadd(seed$60, 1)), 0, false, 0, 0], ["cx", "sx", "sy", "bombs", "aliens", "fx", "fy", "fdir", "march", "shields", "lives", "score", "wave", "seed", "wait", "over", "hit", "t"])); }, 9, [rows_from$48, top_of$57, ones$53, next$10]), start$61 = def$58, def$62 = $R.fn((a$63) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$64, fx$65, fy$66, x$67, y$68, let$69, c$70, let$71, r$72, let$73, i$74; return (aliens$64 = a$63[0], fx$65 = a$63[1], fy$66 = a$63[2], x$67 = a$63[3], y$68 = a$63[4], (((x$67 < fx$65) || (y$68 < fy$66)) ? $R.isub(0, 1) : (let$69 = $R.idiv($R.isub(x$67, fx$65), 48), c$70 = let$69, (let$71 = $R.idiv($R.isub(y$68, fy$66), 40), r$72 = let$71, (((c$70 > 8) || ((r$72 > 4) || (($R.isub($R.isub(x$67, fx$65), $R.imul(c$70, 48)) >= 32) || ($R.isub($R.isub(y$68, fy$66), $R.imul(r$72, 40)) >= 24)))) ? $R.isub(0, 1) : (let$73 = $R.iadd($R.imul(r$72, 9), c$70), i$74 = let$73, (((at$23)([aliens$64, i$74]) > 0) ? i$74 : $R.isub(0, 1)))))))); }, 10, [at$23]), alien_at$75 = def$62, def$76 = $R.fn((a$77) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let shields$78, x$79, y$80, let$81, s$82, let$83, bx$84, let$85, i$86; return (shields$78 = a$77[0], x$79 = a$77[1], y$80 = a$77[2], (((y$80 < 640) || ((y$80 >= 672) || (x$79 < 58))) ? $R.isub(0, 1) : (let$81 = $R.idiv($R.isub(x$79, 58), 140), s$82 = let$81, (let$83 = $R.isub($R.isub(x$79, 58), $R.imul(140, s$82)), bx$84 = let$83, (((s$82 > 3) || (bx$84 >= 64)) ? $R.isub(0, 1) : (let$85 = $R.iadd($R.iadd($R.imul(s$82, 32), $R.imul($R.idiv($R.isub(y$80, 640), 8), 8)), $R.idiv(bx$84, 8)), i$86 = let$85, ($R.eq((at$23)([shields$78, i$86]), 1) ? i$86 : $R.isub(0, 1)))))))); }, 11, [at$23]), block_at$87 = def$76, def$88 = $R.fn((a$89) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$90, c$91; return (aliens$90 = a$89[0], c$91 = a$89[1], (((at$23)([aliens$90, c$91]) > 0) || (((at$23)([aliens$90, $R.iadd(9, c$91)]) > 0) || (((at$23)([aliens$90, $R.iadd(18, c$91)]) > 0) || (((at$23)([aliens$90, $R.iadd(27, c$91)]) > 0) || ((at$23)([aliens$90, $R.iadd(36, c$91)]) > 0)))))); }, 12, [at$23]), col_has$92 = def$88, def$93 = (() => { let first_col$94; return (first_col$94 = $R.fn((a$95) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$96, c$97; return (aliens$96 = a$95[0], c$97 = a$95[1], ((c$97 > 8) ? 0 : ((col_has$92)([aliens$96, c$97]) ? c$97 : (first_col$94)([aliens$96, $R.iadd(c$97, 1)])))); }, 13, [first_col$94, col_has$92]), first_col$94); })(), first_col$98 = def$93, def$99 = (() => { let last_col$100; return (last_col$100 = $R.fn((a$101) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$102, c$103; return (aliens$102 = a$101[0], c$103 = a$101[1], ((c$103 < 0) ? 8 : ((col_has$92)([aliens$102, c$103]) ? c$103 : (last_col$100)([aliens$102, $R.isub(c$103, 1)])))); }, 14, [last_col$100, col_has$92]), last_col$100); })(), last_col$104 = def$99, def$105 = (() => { let lowest$106; return (lowest$106 = $R.fn((a$107) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$108, c$109, r$110; return (aliens$108 = a$107[0], c$109 = a$107[1], r$110 = a$107[2], ((r$110 < 0) ? $R.isub(0, 1) : (((at$23)([aliens$108, $R.iadd($R.imul(r$110, 9), c$109)]) > 0) ? r$110 : (lowest$106)([aliens$108, c$109, $R.isub(r$110, 1)])))); }, 15, [lowest$106, at$23]), lowest$106); })(), lowest$111 = def$105, def$112 = (() => { let bottom$113; return (bottom$113 = $R.fn((a$114) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let aliens$115, fy$116, r$117; return (aliens$115 = a$114[0], fy$116 = a$114[1], r$117 = a$114[2], ((r$117 < 0) ? $R.isub(0, 1) : ((((at$23)([aliens$115, $R.imul(r$117, 9)]) > 0) || (((at$23)([aliens$115, $R.iadd($R.imul(r$117, 9), 1)]) > 0) || (((at$23)([aliens$115, $R.iadd($R.imul(r$117, 9), 2)]) > 0) || (((at$23)([aliens$115, $R.iadd($R.imul(r$117, 9), 3)]) > 0) || (((at$23)([aliens$115, $R.iadd($R.imul(r$117, 9), 4)]) > 0) || (((at$23)([aliens$115, $R.iadd($R.imul(r$117, 9), 5)]) > 0) || (((at$23)([aliens$115, $R.iadd($R.imul(r$117, 9), 6)]) > 0) || (((at$23)([aliens$115, $R.iadd($R.imul(r$117, 9), 7)]) > 0) || ((at$23)([aliens$115, $R.iadd($R.imul(r$117, 9), 8)]) > 0))))))))) ? $R.iadd($R.iadd(fy$116, $R.imul(r$117, 40)), 24) : (bottom$113)([aliens$115, fy$116, $R.isub(r$117, 1)])))); }, 16, [bottom$113, at$23]), bottom$113); })(), bottom$118 = def$112, def$119 = (() => { let fall$120; return (fall$120 = $R.fn((a$121) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$122, shields$123, cx$124, hurt$125, m$126, b$127, rest$128, let$129, y$130, let$131, k$132, let$133, onme$134, let$135, more$136, sh$137, hu$138; return (bs$122 = a$121[0], shields$123 = a$121[1], cx$124 = a$121[2], hurt$125 = a$121[3], (m$126 = bs$122, ((m$126 === null) ? ([null, shields$123, hurt$125]) : ((m$126 !== null) ? (b$127 = m$126.h, rest$128 = m$126.t, (let$129 = $R.iadd($R.dot(b$127, "y"), 5), y$130 = let$129, (let$131 = (block_at$87)([shields$123, $R.dot(b$127, "x"), y$130]), k$132 = let$131, (let$133 = (((absi$14)($R.isub($R.dot(b$127, "x"), cx$124)) <= 20) && ((y$130 >= 728) && (y$130 <= 756))), onme$134 = let$133, (let$135 = (fall$120)([rest$128, ((k$132 >= 0) ? (set_at$33)([shields$123, k$132, 0]) : shields$123), cx$124, (hurt$125 || onme$134)]), more$136 = let$135[0], sh$137 = let$135[1], hu$138 = let$135[2], (((k$132 >= 0) || (onme$134 || (y$130 > 800))) ? [more$136, sh$137, hu$138] : [{h: $R.tup([$R.dot(b$127, "x"), y$130], ["x", "y"]), t: more$136}, sh$137, hu$138])))))) : $R.nomatch("case"))))); }, 17, [block_at$87, absi$14, set_at$33, fall$120]), fall$120); })(), fall$139 = def$119, def$140 = (() => { let count$141; return (count$141 = $R.fn((a$142) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$143, m$144, rest$145; return (bs$143 = a$142, (m$144 = bs$143, ((m$144 === null) ? (0) : ((m$144 !== null) ? (rest$145 = m$144.t, $R.iadd(1, (count$141)(rest$145))) : $R.nomatch("case"))))); }, 18, [count$141]), count$141); })(), count$146 = def$140, def$147 = $R.fn((a$148) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$149, move$150, fire$151, let$152, ready$153, let$154, let$155, x$156, cx$157, let$158, firing$159, let$160, sx0$161, let$162, sy0$163, let$164, sy1$165, let$166, let$167, a$168, hitA$169, let$170, let$171, k$172, hitS$173, let$174, points$175, let$176, aliens$177, let$178, shields0$179, let$180, shot_on$181, let$182, left$183, let$184, marching$185, let$186, edge$187, let$188, fx$189, let$190, fy$191, let$192, fdir$193, let$194, march$195, let$196, bombs0$197, shields1$198, hurt$199, let$200, s1$201, let$202, c$203, let$204, lr$205, let$206, drop$207, let$208, bombs1$209, let$210, hurt2$211, let$212, lives$213, let$214, landed$215, let$216, cleared$217; return (g$149 = a$148[0], move$150 = a$148[1], fire$151 = a$148[2], ($R.dot(g$149, "over") ? g$149 : (let$152 = ($R.dot(g$149, "wait") <= 0), ready$153 = let$152, (let$154 = (ready$153 ? (let$155 = $R.iadd($R.dot(g$149, "cx"), $R.imul(6, move$150)), x$156 = let$155, ((x$156 < 30) ? 30 : ((x$156 > 570) ? 570 : x$156))) : $R.dot(g$149, "cx")), cx$157 = let$154, (let$158 = (ready$153 && (fire$151 && ($R.dot(g$149, "sy") < 0))), firing$159 = let$158, (let$160 = (firing$159 ? cx$157 : $R.dot(g$149, "sx")), sx0$161 = let$160, (let$162 = (firing$159 ? 724 : $R.dot(g$149, "sy")), sy0$163 = let$162, (let$164 = ((sy0$163 >= 0) ? $R.isub(sy0$163, 12) : $R.isub(0, 1)), sy1$165 = let$164, (let$166 = ((sy1$165 >= 0) ? (let$167 = (alien_at$75)([$R.dot(g$149, "aliens"), $R.dot(g$149, "fx"), $R.dot(g$149, "fy"), sx0$161, sy1$165]), a$168 = let$167, ((a$168 >= 0) ? a$168 : (alien_at$75)([$R.dot(g$149, "aliens"), $R.dot(g$149, "fx"), $R.dot(g$149, "fy"), sx0$161, $R.iadd(sy1$165, 6)]))) : $R.isub(0, 1)), hitA$169 = let$166, (let$170 = (((sy1$165 >= 0) && (hitA$169 < 0)) ? (let$171 = (block_at$87)([$R.dot(g$149, "shields"), sx0$161, sy1$165]), k$172 = let$171, ((k$172 >= 0) ? k$172 : (block_at$87)([$R.dot(g$149, "shields"), sx0$161, $R.iadd(sy1$165, 6)]))) : $R.isub(0, 1)), hitS$173 = let$170, (let$174 = ((hitA$169 >= 0) ? $R.imul(10, (at$23)([$R.dot(g$149, "aliens"), hitA$169])) : 0), points$175 = let$174, (let$176 = ((hitA$169 >= 0) ? (set_at$33)([$R.dot(g$149, "aliens"), hitA$169, 0]) : $R.dot(g$149, "aliens")), aliens$177 = let$176, (let$178 = ((hitS$173 >= 0) ? (set_at$33)([$R.dot(g$149, "shields"), hitS$173, 0]) : $R.dot(g$149, "shields")), shields0$179 = let$178, (let$180 = ((sy1$165 >= 0) && ((hitA$169 < 0) && (hitS$173 < 0))), shot_on$181 = let$180, (let$182 = (alive$41)(aliens$177), left$183 = let$182, (let$184 = ($R.dot(g$149, "march") <= 1), marching$185 = let$184, (let$186 = (($R.dot(g$149, "fdir") > 0) ? ($R.iadd($R.iadd($R.iadd($R.dot(g$149, "fx"), $R.imul((last_col$104)([aliens$177, 8]), 48)), 32), 8) > 592) : ($R.isub($R.iadd($R.dot(g$149, "fx"), $R.imul((first_col$98)([aliens$177, 0]), 48)), 8) < 8)), edge$187 = let$186, (let$188 = ((marching$185 && (!(edge$187))) ? $R.iadd($R.dot(g$149, "fx"), $R.imul(8, $R.dot(g$149, "fdir"))) : $R.dot(g$149, "fx")), fx$189 = let$188, (let$190 = ((marching$185 && edge$187) ? $R.iadd($R.dot(g$149, "fy"), 20) : $R.dot(g$149, "fy")), fy$191 = let$190, (let$192 = ((marching$185 && edge$187) ? $R.isub(0, $R.dot(g$149, "fdir")) : $R.dot(g$149, "fdir")), fdir$193 = let$192, (let$194 = (marching$185 ? $R.iadd(2, $R.idiv(left$183, 2)) : $R.isub($R.dot(g$149, "march"), 1)), march$195 = let$194, (let$196 = (fall$139)([$R.dot(g$149, "bombs"), shields0$179, cx$157, false]), bombs0$197 = let$196[0], shields1$198 = let$196[1], hurt$199 = let$196[2], (let$200 = (next$10)($R.dot(g$149, "seed")), s1$201 = let$200, (let$202 = (md$6)([$R.idiv(s1$201, 100), 9]), c$203 = let$202, (let$204 = (lowest$111)([aliens$177, c$203, 4]), lr$205 = let$204, (let$206 = (ready$153 && ((left$183 > 0) && (((md$6)([s1$201, 100]) < $R.iadd(2, $R.dot(g$149, "wave"))) && (((count$146)(bombs0$197) < $R.iadd(3, $R.idiv($R.dot(g$149, "wave"), 2))) && (lr$205 >= 0))))), drop$207 = let$206, (let$208 = (drop$207 ? {h: $R.tup([$R.iadd($R.iadd(fx$189, $R.imul(c$203, 48)), 16), $R.iadd($R.iadd(fy$191, $R.imul(lr$205, 40)), 24)], ["x", "y"]), t: bombs0$197} : bombs0$197), bombs1$209 = let$208, (let$210 = (ready$153 && hurt$199), hurt2$211 = let$210, (let$212 = (hurt2$211 ? $R.isub($R.dot(g$149, "lives"), 1) : $R.dot(g$149, "lives")), lives$213 = let$212, (let$214 = ((left$183 > 0) && ((bottom$118)([aliens$177, fy$191, 4]) >= 700)), landed$215 = let$214, (let$216 = $R.eq(left$183, 0), cleared$217 = let$216, (cleared$217 ? $R.tup([cx$157, $R.isub(0, 1), $R.isub(0, 1), null, (rows_from$48)(0), 92, (top_of$57)($R.iadd($R.dot(g$149, "wave"), 1)), 1, 24, shields1$198, lives$213, $R.iadd($R.iadd($R.dot(g$149, "score"), points$175), $R.imul(100, $R.iadd($R.dot(g$149, "wave"), 1))), $R.iadd($R.dot(g$149, "wave"), 1), s1$201, 60, false, 3, $R.iadd($R.dot(g$149, "t"), 1)], ["cx", "sx", "sy", "bombs", "aliens", "fx", "fy", "fdir", "march", "shields", "lives", "score", "wave", "seed", "wait", "over", "hit", "t"]) : $R.tup([cx$157, (shot_on$181 ? sx0$161 : $R.isub(0, 1)), (shot_on$181 ? sy1$165 : $R.isub(0, 1)), (hurt2$211 ? null : bombs1$209), aliens$177, fx$189, fy$191, fdir$193, march$195, shields1$198, lives$213, $R.iadd($R.dot(g$149, "score"), points$175), $R.dot(g$149, "wave"), s1$201, (hurt2$211 ? 70 : (($R.dot(g$149, "wait") > 0) ? $R.isub($R.dot(g$149, "wait"), 1) : 0)), ((lives$213 <= 0) || landed$215), (landed$215 ? 4 : (hurt2$211 ? 2 : ((hitA$169 >= 0) ? 1 : 0))), $R.iadd($R.dot(g$149, "t"), 1)], ["cx", "sx", "sy", "bombs", "aliens", "fx", "fy", "fdir", "march", "shields", "lives", "score", "wave", "seed", "wait", "over", "hit", "t"]))))))))))))))))))))))))))))))))); }, 19, [alien_at$75, block_at$87, at$23, set_at$33, alive$41, first_col$98, last_col$104, fall$139, next$10, md$6, lowest$111, count$146, bottom$118, rows_from$48, top_of$57]), step$218 = def$147, def$219 = (() => { let threat$220; return (threat$220 = $R.fn((a$221) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$222, cx$223, m$224, b$225, rest$226; return (bs$222 = a$221[0], cx$223 = a$221[1], (m$224 = bs$222, ((m$224 === null) ? ($R.isub(0, 1)) : ((m$224 !== null) ? (b$225 = m$224.h, rest$226 = m$224.t, ((((absi$14)($R.isub($R.dot(b$225, "x"), cx$223)) < 26) && (($R.dot(b$225, "y") > 480) && ($R.dot(b$225, "y") < 740))) ? $R.dot(b$225, "x") : (threat$220)([rest$226, cx$223]))) : $R.nomatch("case"))))); }, 20, [threat$220, absi$14]), threat$220); })(), threat$227 = def$219, def$228 = (() => { let aim$229; return (aim$229 = $R.fn((a$230) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$231, c$232, best$233, bd$234, let$235, r$236, let$237, rise$238, let$239, drift$240, let$241, x$242, let$243, d$244; return (g$231 = a$230[0], c$232 = a$230[1], best$233 = a$230[2], bd$234 = a$230[3], ((c$232 > 8) ? best$233 : ((!((col_has$92)([$R.dot(g$231, "aliens"), c$232]))) ? (aim$229)([g$231, $R.iadd(c$232, 1), best$233, bd$234]) : (let$235 = (lowest$111)([$R.dot(g$231, "aliens"), c$232, 4]), r$236 = let$235, (let$237 = $R.idiv($R.isub(740, $R.iadd($R.iadd($R.dot(g$231, "fy"), $R.imul(r$236, 40)), 12)), 12), rise$238 = let$237, (let$239 = $R.imul($R.imul($R.idiv(rise$238, $R.iadd(2, $R.idiv((alive$41)($R.dot(g$231, "aliens")), 2))), 8), $R.dot(g$231, "fdir")), drift$240 = let$239, (let$241 = $R.iadd($R.iadd($R.iadd($R.dot(g$231, "fx"), $R.imul(c$232, 48)), 16), drift$240), x$242 = let$241, (let$243 = (absi$14)($R.isub(x$242, $R.dot(g$231, "cx"))), d$244 = let$243, ((d$244 < bd$234) ? (aim$229)([g$231, $R.iadd(c$232, 1), x$242, d$244]) : (aim$229)([g$231, $R.iadd(c$232, 1), best$233, bd$234])))))))))); }, 21, [lowest$111, alive$41, absi$14, aim$229, col_has$92]), aim$229); })(), aim$245 = def$228, def$246 = $R.fn((a$247) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$248, let$249, b$250, let$251, x$252, let$253, move$254; return (g$248 = a$247, (($R.dot(g$248, "over") || ($R.dot(g$248, "wait") > 0)) ? $R.tup([0, false], ["move", "fire"]) : (let$249 = (threat$227)([$R.dot(g$248, "bombs"), $R.dot(g$248, "cx")]), b$250 = let$249, ((b$250 >= 0) ? $R.tup([(((b$250 <= $R.dot(g$248, "cx")) && ($R.dot(g$248, "cx") < 566)) ? 1 : (($R.dot(g$248, "cx") > 34) ? $R.isub(0, 1) : 1)), false], ["move", "fire"]) : (let$251 = (aim$245)([g$248, 0, $R.dot(g$248, "cx"), 100000]), x$252 = let$251, (let$253 = ((x$252 > $R.iadd($R.dot(g$248, "cx"), 3)) ? 1 : ((x$252 < $R.isub($R.dot(g$248, "cx"), 3)) ? $R.isub(0, 1) : 0)), move$254 = let$253, $R.tup([move$254, (($R.dot(g$248, "sy") < 0) && ((absi$14)($R.isub(x$252, $R.dot(g$248, "cx"))) <= 10))], ["move", "fire"]))))))); }, 22, [threat$227, aim$245, absi$14]), robot$255 = def$246, $R.tup([md$6, next$10, absi$14, at$23, set_at$33, alive$41, rows_from$48, ones$53, top_of$57, start$61, alien_at$75, block_at$87, col_has$92, first_col$98, last_col$104, lowest$111, bottom$118, fall$139, count$146, step$218, threat$227, aim$245, robot$255], ["md", "next", "absi", "at", "set_at", "alive", "rows_from", "ones", "top_of", "start", "alien_at", "block_at", "col_has", "first_col", "last_col", "lowest", "bottom", "fall", "count", "step", "threat", "aim", "robot"])); })(), StarWave$256 = let$1, $R.tup([$R.dot(StarWave$256, "start"), $R.dot(StarWave$256, "step"), $R.dot(StarWave$256, "robot")], ["start", "step", "robot"]));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
  const made = "d58de34755";
  // (ticket 827) Game = (cx, sx, sy = Int, bombs = [Bomb], aliens = [Int], fx, fy, fdir, march = Int, shields = [Int], lives, score,
  // wave, seed, wait = Int, over = Bool, hit, t = Int); Bomb = (x, y = Int); Choice = (move = Int, fire = Bool)
  const GAME = ["cx", "sx", "sy", "bombs", "aliens", "fx", "fy", "fdir", "march", "shields", "lives", "score", "wave", "seed", "wait", "over", "hit", "t"];
  const gameIn = g => $R.tup(GAME.map(k => k === "bombs" ? list(g.bombs.map(b => $R.tup([b.x, b.y], ["x", "y"]))) : k === "aliens" || k === "shields" ? list(g[k]) : g[k]), GAME);
  const gameOut = r => Object.fromEntries(GAME.map(k => [k, k === "bombs" ? array(r.bombs).map(b => ({ x: int(b.x), y: int(b.y) })) : k === "aliens" || k === "shields" ? array(r[k]).map(int) : k === "over" ? r[k] : int(r[k])]));
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
