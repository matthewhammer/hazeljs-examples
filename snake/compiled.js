// hazeljs-examples, Snake: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel 7d310be18a (trial/794-games-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// (ticket 825) The page runs its rules through this file instead of loading hazeljs and building the program, unless asked
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
"use strict";  let let$1, Snake$175; return (let$1 = (() => { let def$2, n$3, def$4, md$8, def$9, next$12, def$13, mem$21, def$22, len$28, def$29, drop_last$37, def$38, toward$51, def$52, free_from$58, def$59, place$63, def$64, start$72, def$73, step$93, def$94, flood$131, def$132, absi$135, def$136, gap$145, def$146, robot$174; return (def$2 = 20, n$3 = def$2, def$4 = $R.fn((a$5) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$6, b$7; return (a$6 = a$5[0], b$7 = a$5[1], $R.isub(a$6, $R.imul($R.idiv(a$6, b$7), b$7))); }, 0, null), md$8 = def$4, def$9 = $R.fn((a$10) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$11; return (s$11 = a$10, (md$8)([$R.imul(s$11, 48271), 2147483647])); }, 1, [md$8]), next$12 = def$9, def$13 = (() => { let mem$14; return (mem$14 = $R.fn((a$15) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let v$16, xs$17, m$18, x$19, rest$20; return (v$16 = a$15[0], xs$17 = a$15[1], (m$18 = xs$17, ((m$18 === null) ? (false) : ((m$18 !== null) ? (x$19 = m$18.h, rest$20 = m$18.t, ($R.eq(x$19, v$16) || (mem$14)([v$16, rest$20]))) : $R.nomatch("case"))))); }, 2, [mem$14]), mem$14); })(), mem$21 = def$13, def$22 = (() => { let len$23; return (len$23 = $R.fn((a$24) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$25, m$26, rest$27; return (xs$25 = a$24, (m$26 = xs$25, ((m$26 === null) ? (0) : ((m$26 !== null) ? (rest$27 = m$26.t, $R.iadd(1, (len$23)(rest$27))) : $R.nomatch("case"))))); }, 3, [len$23]), len$23); })(), len$28 = def$22, def$29 = (() => { let drop_last$30; return (drop_last$30 = $R.fn((a$31) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$32, m$33, x$34, rest$35, m$36; return (xs$32 = a$31, (m$33 = xs$32, ((m$33 === null) ? (null) : ((m$33 !== null) ? (x$34 = m$33.h, rest$35 = m$33.t, (m$36 = rest$35, ((m$36 === null) ? (null) : ((m$36 !== null) ? ({h: x$34, t: (drop_last$30)(rest$35)}) : $R.nomatch("case"))))) : $R.nomatch("case"))))); }, 4, [drop_last$30]), drop_last$30); })(), drop_last$37 = def$29, def$38 = $R.fn((a$39) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let k$40, d$41, wrap$42, let$43, r$44, let$45, c$46, let$47, r1$48, let$49, c1$50; return (k$40 = a$39[0], d$41 = a$39[1], wrap$42 = a$39[2], (let$43 = $R.idiv(k$40, n$3), r$44 = let$43, (let$45 = (md$8)([k$40, n$3]), c$46 = let$45, (let$47 = ($R.eq(d$41, 0) ? $R.isub(r$44, 1) : ($R.eq(d$41, 2) ? $R.iadd(r$44, 1) : r$44)), r1$48 = let$47, (let$49 = ($R.eq(d$41, 1) ? $R.iadd(c$46, 1) : ($R.eq(d$41, 3) ? $R.isub(c$46, 1) : c$46)), c1$50 = let$49, (((r1$48 >= 0) && ((r1$48 < n$3) && ((c1$50 >= 0) && (c1$50 < n$3)))) ? $R.iadd($R.imul(r1$48, n$3), c1$50) : (wrap$42 ? $R.iadd($R.imul((md$8)([$R.iadd(r1$48, n$3), n$3]), n$3), (md$8)([$R.iadd(c1$50, n$3), n$3])) : $R.isub(0, 1)))))))); }, 5, [n$3, md$8]), toward$51 = def$38, def$52 = (() => { let free_from$53; return (free_from$53 = $R.fn((a$54) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let k$55, body$56, tries$57; return (k$55 = a$54[0], body$56 = a$54[1], tries$57 = a$54[2], ((tries$57 >= $R.imul(n$3, n$3)) ? $R.isub(0, 1) : ((mem$21)([k$55, body$56]) ? (free_from$53)([(md$8)([$R.iadd(k$55, 1), $R.imul(n$3, n$3)]), body$56, $R.iadd(tries$57, 1)]) : k$55))); }, 6, [n$3, md$8, free_from$53, mem$21]), free_from$53); })(), free_from$58 = def$52, def$59 = $R.fn((a$60) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seed$61, body$62; return (seed$61 = a$60[0], body$62 = a$60[1], (free_from$58)([(md$8)([seed$61, $R.imul(n$3, n$3)]), body$62, 0])); }, 7, [n$3, md$8, free_from$58]), place$63 = def$59, def$64 = $R.fn((a$65) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let seed$66, wrap$67, let$68, body$69, let$70, s$71; return (seed$66 = a$65[0], wrap$67 = a$65[1], (let$68 = {h: $R.iadd($R.imul(10, n$3), 8), t: {h: $R.iadd($R.imul(10, n$3), 7), t: {h: $R.iadd($R.imul(10, n$3), 6), t: null}}}, body$69 = let$68, (let$70 = (next$12)($R.iadd(seed$66, 1)), s$71 = let$70, $R.tup([body$69, 1, 0, (place$63)([s$71, body$69]), s$71, wrap$67, 0, false, 0, 0], ["body", "dir", "grow", "food", "seed", "wrap", "score", "over", "hit", "t"])))); }, 8, [n$3, next$12, place$63]), start$72 = def$64, def$73 = $R.fn((a$74) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$75, want$76, let$77, dir$78, let$79, m$80, h$81, head$82, let$83, nh$84, let$85, kept$86, let$87, body$88, let$89, ate$90, let$91, s$92; return (g$75 = a$74[0], want$76 = a$74[1], ($R.dot(g$75, "over") ? g$75 : (let$77 = (((want$76 >= 0) && ((want$76 <= 3) && (!$R.eq(want$76, (md$8)([$R.iadd($R.dot(g$75, "dir"), 2), 4]))))) ? want$76 : $R.dot(g$75, "dir")), dir$78 = let$77, (let$79 = (m$80 = $R.dot(g$75, "body"), ((m$80 === null) ? (0) : ((m$80 !== null) ? (h$81 = m$80.h, h$81) : $R.nomatch("case")))), head$82 = let$79, (let$83 = (toward$51)([head$82, dir$78, $R.dot(g$75, "wrap")]), nh$84 = let$83, (let$85 = (($R.dot(g$75, "grow") > 0) ? $R.dot(g$75, "body") : (drop_last$37)($R.dot(g$75, "body"))), kept$86 = let$85, (((nh$84 < 0) || (mem$21)([nh$84, kept$86])) ? $R.tup([$R.dot(g$75, "body"), dir$78, $R.dot(g$75, "grow"), $R.dot(g$75, "food"), $R.dot(g$75, "seed"), $R.dot(g$75, "wrap"), $R.dot(g$75, "score"), true, 2, $R.iadd($R.dot(g$75, "t"), 1)], ["body", "dir", "grow", "food", "seed", "wrap", "score", "over", "hit", "t"]) : (let$87 = {h: nh$84, t: kept$86}, body$88 = let$87, (let$89 = $R.eq(nh$84, $R.dot(g$75, "food")), ate$90 = let$89, (let$91 = (ate$90 ? (next$12)($R.dot(g$75, "seed")) : $R.dot(g$75, "seed")), s$92 = let$91, $R.tup([body$88, dir$78, $R.iadd((($R.dot(g$75, "grow") > 0) ? $R.isub($R.dot(g$75, "grow"), 1) : 0), (ate$90 ? 3 : 0)), (ate$90 ? (place$63)([s$92, body$88]) : $R.dot(g$75, "food")), s$92, $R.dot(g$75, "wrap"), $R.iadd($R.dot(g$75, "score"), (ate$90 ? 10 : 0)), false, (ate$90 ? 1 : 0), $R.iadd($R.dot(g$75, "t"), 1)], ["body", "dir", "grow", "food", "seed", "wrap", "score", "over", "hit", "t"]))))))))))); }, 9, [md$8, toward$51, drop_last$37, next$12, place$63, mem$21]), step$93 = def$73, def$94 = (() => { let flood$95; return (flood$95 = $R.fn((a$96) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let wrap$97, body$98, frontier$99, seen$100, count$101, want$102, m$103, k$104, rest$105, let$106, add$114, let$115, f0$116, s0$117, c0$118, let$119, f1$120, s1$121, c1$122, let$123, f2$124, s2$125, c2$126, let$127, f3$128, s3$129, c3$130; return (wrap$97 = a$96[0], body$98 = a$96[1], frontier$99 = a$96[2], seen$100 = a$96[3], count$101 = a$96[4], want$102 = a$96[5], ((count$101 >= want$102) ? count$101 : (m$103 = frontier$99, ((m$103 === null) ? (count$101) : ((m$103 !== null) ? (k$104 = m$103.h, rest$105 = m$103.t, (let$106 = $R.fn((a$107) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let fr$108, sn$109, c$110, d$111, let$112, m$113; return (fr$108 = a$107[0], sn$109 = a$107[1], c$110 = a$107[2], d$111 = a$107[3], (let$112 = (toward$51)([k$104, d$111, wrap$97]), m$113 = let$112, (((m$113 < 0) || ((mem$21)([m$113, sn$109]) || (mem$21)([m$113, body$98]))) ? [fr$108, sn$109, c$110] : [{h: m$113, t: fr$108}, {h: m$113, t: sn$109}, $R.iadd(c$110, 1)]))); }, 10, [k$104, wrap$97, toward$51, body$98, mem$21]), add$114 = let$106, (let$115 = (add$114)([rest$105, seen$100, count$101, 0]), f0$116 = let$115[0], s0$117 = let$115[1], c0$118 = let$115[2], (let$119 = (add$114)([f0$116, s0$117, c0$118, 1]), f1$120 = let$119[0], s1$121 = let$119[1], c1$122 = let$119[2], (let$123 = (add$114)([f1$120, s1$121, c1$122, 2]), f2$124 = let$123[0], s2$125 = let$123[1], c2$126 = let$123[2], (let$127 = (add$114)([f2$124, s2$125, c2$126, 3]), f3$128 = let$127[0], s3$129 = let$127[1], c3$130 = let$127[2], (flood$95)([wrap$97, body$98, f3$128, s3$129, c3$130, want$102]))))))) : $R.nomatch("case")))))); }, 11, [toward$51, mem$21, flood$95]), flood$95); })(), flood$131 = def$94, def$132 = $R.fn((a$133) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let v$134; return (v$134 = a$133, ((v$134 < 0) ? $R.isub(0, v$134) : v$134)); }, 12, null), absi$135 = def$132, def$136 = $R.fn((a$137) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let a$138, b$139, wrap$140, let$141, dr$142, let$143, dc$144; return (a$138 = a$137[0], b$139 = a$137[1], wrap$140 = a$137[2], (let$141 = (absi$135)($R.isub($R.idiv(a$138, n$3), $R.idiv(b$139, n$3))), dr$142 = let$141, (let$143 = (absi$135)($R.isub((md$8)([a$138, n$3]), (md$8)([b$139, n$3]))), dc$144 = let$143, $R.iadd(((wrap$140 && ($R.isub(n$3, dr$142) < dr$142)) ? $R.isub(n$3, dr$142) : dr$142), ((wrap$140 && ($R.isub(n$3, dc$144) < dc$144)) ? $R.isub(n$3, dc$144) : dc$144))))); }, 13, [n$3, absi$135, md$8]), gap$145 = def$136, def$146 = $R.fn((a$147) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let g$148, let$149, m$150, h$151, head$152, let$153, body$154, let$155, long$156, let$157, worth$164, let$165, pick$173; return (g$148 = a$147, ($R.dot(g$148, "over") ? $R.isub(0, 1) : (let$149 = (m$150 = $R.dot(g$148, "body"), ((m$150 === null) ? (0) : ((m$150 !== null) ? (h$151 = m$150.h, h$151) : $R.nomatch("case")))), head$152 = let$149, (let$153 = (drop_last$37)($R.dot(g$148, "body")), body$154 = let$153, (let$155 = $R.iadd($R.iadd((len$28)($R.dot(g$148, "body")), $R.dot(g$148, "grow")), 2), long$156 = let$155, (let$157 = $R.fn((a$158) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let d$159, let$160, m$161, let$162, space$163; return (d$159 = a$158, (let$160 = (toward$51)([head$152, d$159, $R.dot(g$148, "wrap")]), m$161 = let$160, (($R.eq(d$159, (md$8)([$R.iadd($R.dot(g$148, "dir"), 2), 4])) || ((m$161 < 0) || (mem$21)([m$161, body$154]))) ? $R.isub(0, 100000) : (let$162 = (flood$131)([$R.dot(g$148, "wrap"), body$154, {h: m$161, t: null}, {h: m$161, t: null}, 1, long$156]), space$163 = let$162, $R.iadd($R.isub(((space$163 < long$156) ? $R.iadd($R.isub(0, 50000), $R.imul(space$163, 10)) : 0), $R.imul(10, (gap$145)([m$161, $R.dot(g$148, "food"), $R.dot(g$148, "wrap")]))), ($R.eq(d$159, $R.dot(g$148, "dir")) ? 1 : 0)))))); }, 14, [head$152, g$148, toward$51, body$154, long$156, flood$131, gap$145, mem$21, md$8]), worth$164 = let$157, (let$165 = (() => { let pick$166; return (pick$166 = $R.fn((a$167) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let d$168, bd$169, bw$170, let$171, w$172; return (d$168 = a$167[0], bd$169 = a$167[1], bw$170 = a$167[2], ((d$168 > 3) ? bd$169 : (let$171 = (worth$164)(d$168), w$172 = let$171, ((w$172 > bw$170) ? (pick$166)([$R.iadd(d$168, 1), d$168, w$172]) : (pick$166)([$R.iadd(d$168, 1), bd$169, bw$170]))))); }, 15, [worth$164, pick$166]), pick$166); })(), pick$173 = let$165, (pick$173)([0, $R.isub(0, 1), $R.isub(0, 100000)])))))))); }, 16, [drop_last$37, len$28, toward$51, flood$131, gap$145, mem$21, md$8]), robot$174 = def$146, $R.tup([n$3, md$8, next$12, mem$21, len$28, drop_last$37, toward$51, free_from$58, place$63, start$72, step$93, flood$131, absi$135, gap$145, robot$174], ["n", "md", "next", "mem", "len", "drop_last", "toward", "free_from", "place", "start", "step", "flood", "absi", "gap", "robot"])); })(), Snake$175 = let$1, $R.tup([$R.dot(Snake$175, "start"), $R.dot(Snake$175, "step"), $R.dot(Snake$175, "robot")], ["start", "step", "robot"]));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
  const made = "7d310be18a";
  // (ticket 825) Game = (body = [Int], dir, grow, food, seed = Int, wrap = Bool, score = Int, over = Bool, hit, t = Int)
  const GAME = ["body", "dir", "grow", "food", "seed", "wrap", "score", "over", "hit", "t"];
  const gameIn = g => $R.tup(GAME.map(k => k === "body" ? list(g.body) : g[k]), GAME);
  const gameOut = r => Object.fromEntries(GAME.map(k => [k, k === "body" ? array(r.body).map(int) : k === "wrap" || k === "over" ? r[k] : int(r[k])]));
  // start : (Int, Bool) -> Game (a seed, whether the walls wrap); step : (Game, Int) -> Game (a way to turn, or -1); robot : Game -> Int
  const start = (seed, wrap) => gameOut(P.start([seed, wrap]));
  const step = (g, want) => gameOut(P.step([gameIn(g), want]));
  const robot = g => int(P.robot(gameIn(g)));
  const api = { start, step, robot, made };
  // (ticket 797) a game's converters, for node/three-way.mjs to time the page boundary by itself
  try { api.$convert = { gameIn, gameOut }; } catch (e) { /* an oracle: no game crosses */ }
  if (typeof window !== "undefined") window.SnakeCompiled = api;
  if (typeof module !== "undefined") module.exports = api;
})();
