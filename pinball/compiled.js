// hazeljs-examples, Pinball: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel b7dc366d68 (trial/794-games-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// (ticket 793) The page runs its rules through this file instead of loading hazeljs and building the program, unless asked
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
"use strict";  let let$1, Pinball$304; return (let$1 = (() => { let def$2, w$8, def$9, sling$15, def$16, bp$22, def$23, gate$30, def$31, join$39, def$40, arc$61, def$62, frame$63, def$64, bd$75, def$76, boards$77, def$78, board$90, def$91, rests$97, def$98, start$103, def$104, turn$118, def$119, off_seg$157, def$158, walls_hit$170, def$171, bumps$198, def$199, tip$203, def$204, flips_hit$232, def$233, through$245, def$246, cap$251, def$252, sub$277, def$278, step$303; return (def$2 = $R.fn((a$3) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ax$4, ay$5, bx$6, by$7; return (ax$4 = a$3[0], ay$5 = a$3[1], bx$6 = a$3[2], by$7 = a$3[3], $R.tup([ax$4, ay$5, bx$6, by$7, 50, 0], ["ax", "ay", "bx", "by", "bounce", "kick"])); }, 0, null), w$8 = def$2, def$9 = $R.fn((a$10) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let ax$11, ay$12, bx$13, by$14; return (ax$11 = a$10[0], ay$12 = a$10[1], bx$13 = a$10[2], by$14 = a$10[3], $R.tup([ax$11, ay$12, bx$13, by$14, 60, 55], ["ax", "ay", "bx", "by", "bounce", "kick"])); }, 1, null), sling$15 = def$9, def$16 = $R.fn((a$17) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let x$18, y$19, r$20, p$21; return (x$18 = a$17[0], y$19 = a$17[1], r$20 = a$17[2], p$21 = a$17[3], $R.tup([x$18, y$19, r$20, p$21], ["x", "y", "r", "points"])); }, 2, null), bp$22 = def$16, def$23 = $R.fn((a$24) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let x$25, y$26, r$27, tx$28, ty$29; return (x$25 = a$24[0], y$26 = a$24[1], r$27 = a$24[2], tx$28 = a$24[3], ty$29 = a$24[4], $R.tup([x$25, y$26, r$27, tx$28, ty$29], ["x", "y", "r", "tx", "ty"])); }, 3, null), gate$30 = def$23, def$31 = (() => { let join$32; return (join$32 = $R.fn((a$33) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$34, ys$35, m$36, x$37, rest$38; return (xs$34 = a$33[0], ys$35 = a$33[1], (m$36 = xs$34, ((m$36 === null) ? (ys$35) : ((m$36 !== null) ? (x$37 = m$36.h, rest$38 = m$36.t, {h: x$37, t: (join$32)([rest$38, ys$35])}) : $R.nomatch("case"))))); }, 4, [join$32]), join$32); })(), join$39 = def$31, def$40 = $R.fn((a$41) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let cx$42, cy$43, r$44, a0$45, a1$46, n$47, let$48, px$51, let$52, py$55, let$56, go$60; return (cx$42 = a$41[0], cy$43 = a$41[1], r$44 = a$41[2], a0$45 = a$41[3], a1$46 = a$41[4], n$47 = a$41[5], (let$48 = $R.fn((a$49) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let i$50; return (i$50 = a$49, $R.iadd(cx$42, ($R.b["int_of_float"])((($R.b["float_of_int"])(r$44) * ($R.b["cos"])((($R.b["float_of_int"])($R.iadd(a0$45, $R.idiv($R.imul($R.isub(a1$46, a0$45), i$50), n$47))) / 1000)))))); }, 5, [n$47, a0$45, a1$46, r$44, cx$42]), px$51 = let$48, (let$52 = $R.fn((a$53) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let i$54; return (i$54 = a$53, $R.iadd(cy$43, ($R.b["int_of_float"])((($R.b["float_of_int"])(r$44) * ($R.b["sin"])((($R.b["float_of_int"])($R.iadd(a0$45, $R.idiv($R.imul($R.isub(a1$46, a0$45), i$54), n$47))) / 1000)))))); }, 6, [n$47, a0$45, a1$46, r$44, cy$43]), py$55 = let$52, (let$56 = (() => { let go$57; return (go$57 = $R.fn((a$58) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let i$59; return (i$59 = a$58, ((i$59 >= n$47) ? null : {h: (w$8)([(px$51)(i$59), (py$55)(i$59), (px$51)($R.iadd(i$59, 1)), (py$55)($R.iadd(i$59, 1))]), t: (go$57)($R.iadd(i$59, 1))})); }, 7, [go$57, px$51, py$55, w$8, n$47]), go$57); })(), go$60 = let$56, (go$60)(0))))); }, 8, [w$8]), arc$61 = def$40, def$62 = (join$39)([{h: (w$8)([20, 300, 20, 820]), t: {h: (w$8)([580, 300, 580, 1000]), t: {h: (w$8)([545, 330, 545, 1000]), t: {h: (w$8)([545, 965, 580, 965]), t: {h: (w$8)([20, 820, 190, 905]), t: {h: (w$8)([545, 820, 410, 905]), t: {h: (sling$15)([90, 680, 160, 795]), t: {h: (w$8)([90, 680, 90, 770]), t: {h: (w$8)([90, 770, 160, 795]), t: {h: (sling$15)([510, 680, 440, 795]), t: {h: (w$8)([510, 680, 510, 770]), t: {h: (w$8)([510, 770, 440, 795]), t: null}}}}}}}}}}}}, (arc$61)([300, 300, 280, 3142, 6283, 16])]), frame$63 = def$62, def$64 = $R.fn((a$65) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let name$66, bg$67, ink$68, glow$69, walls$70, bumpers$71, more$72, portals$73, gravity$74; return (name$66 = a$65[0], bg$67 = a$65[1], ink$68 = a$65[2], glow$69 = a$65[3], walls$70 = a$65[4], bumpers$71 = a$65[5], more$72 = a$65[6], portals$73 = a$65[7], gravity$74 = a$65[8], $R.tup([name$66, bg$67, ink$68, glow$69, (join$39)([frame$63, walls$70]), bumpers$71, {h: $R.tup([190, 905, 92, 1], ["x", "y", "len", "side"]), t: {h: $R.tup([410, 905, 92, $R.isub(0, 1)], ["x", "y", "len", "side"]), t: more$72}}, portals$73, 562, 940, 0, $R.isub(0, 300), gravity$74], ["name", "bg", "ink", "glow", "walls", "bumpers", "flippers", "portals", "sx", "sy", "svx", "svy", "gravity"])); }, 9, [frame$63, join$39]), bd$75 = def$64, def$76 = {h: (bd$75)(["🌌 Starfield", "#0b1030", "#7dd3fc", "#f0abfc", null, {h: (bp$22)([220, 300, 30, 100]), t: {h: (bp$22)([380, 300, 30, 100]), t: {h: (bp$22)([300, 420, 30, 100]), t: null}}}, null, null, 390]), t: {h: (bd$75)(["🌋 Volcano", "#2a0a05", "#fb923c", "#fde047", {h: (w$8)([250, 580, 300, 520]), t: {h: (w$8)([300, 520, 350, 580]), t: null}}, {h: (bp$22)([410, 380, 26, 50]), t: {h: (bp$22)([334, 485, 26, 50]), t: {h: (bp$22)([211, 445, 26, 50]), t: {h: (bp$22)([211, 315, 26, 50]), t: {h: (bp$22)([334, 275, 26, 50]), t: null}}}}}, null, null, 400]), t: {h: (bd$75)(["🌊 Ocean", "#03243a", "#5eead4", "#93c5fd", (join$39)([(arc$61)([170, 470, 120, 3300, 4600, 6]), (arc$61)([430, 470, 120, 4800, 6100, 6])]), {h: (bp$22)([300, 260, 18, 40]), t: {h: (bp$22)([240, 340, 18, 40]), t: {h: (bp$22)([360, 340, 18, 40]), t: {h: (bp$22)([300, 420, 18, 40]), t: {h: (bp$22)([200, 520, 18, 40]), t: {h: (bp$22)([400, 520, 18, 40]), t: null}}}}}}, null, null, 360]), t: {h: (bd$75)(["🍄 Mushroom forest", "#14261a", "#86efac", "#fca5a5", null, {h: (bp$22)([200, 260, 16, 30]), t: {h: (bp$22)([300, 260, 16, 30]), t: {h: (bp$22)([400, 260, 16, 30]), t: {h: (bp$22)([250, 340, 16, 30]), t: {h: (bp$22)([350, 340, 16, 30]), t: {h: (bp$22)([200, 420, 16, 30]), t: {h: (bp$22)([300, 420, 16, 30]), t: {h: (bp$22)([400, 420, 16, 30]), t: {h: (bp$22)([300, 500, 16, 30]), t: null}}}}}}}}}, null, null, 390]), t: {h: (bd$75)(["🏰 Castle, two floors", "#1e1033", "#c4b5fd", "#fcd34d", {h: (w$8)([60, 230, 250, 230]), t: {h: (w$8)([350, 230, 520, 230]), t: {h: (w$8)([250, 230, 250, 200]), t: {h: (w$8)([350, 230, 350, 200]), t: null}}}}, {h: (bp$22)([160, 150, 24, 200]), t: {h: (bp$22)([300, 120, 24, 200]), t: {h: (bp$22)([440, 150, 24, 200]), t: {h: (bp$22)([300, 420, 30, 50]), t: null}}}}, null, {h: (gate$30)([70, 640, 22, 300, 170]), t: {h: (gate$30)([300, 215, 18, 300, 470]), t: null}}, 390]), t: {h: (bd$75)(["🐱 Cat face", "#2b1030", "#f9a8d4", "#5eead4", {h: (w$8)([170, 260, 210, 170]), t: {h: (w$8)([210, 170, 250, 260]), t: {h: (w$8)([350, 260, 390, 170]), t: {h: (w$8)([390, 170, 430, 260]), t: {h: (sling$15)([140, 430, 230, 415]), t: {h: (sling$15)([460, 430, 370, 415]), t: null}}}}}}, {h: (bp$22)([240, 330, 28, 150]), t: {h: (bp$22)([360, 330, 28, 150]), t: {h: (bp$22)([300, 410, 18, 300]), t: null}}}, null, null, 390]), t: {h: (bd$75)(["🎡 Funfair ring", "#1a0b2e", "#fde047", "#f472b6", (arc$61)([300, 380, 120, 0, 5400, 12]), {h: (bp$22)([300, 380, 32, 80]), t: {h: (bp$22)([150, 560, 22, 40]), t: {h: (bp$22)([450, 560, 22, 40]), t: null}}}, null, null, 390]), t: {h: (bd$75)(["🌙 Moon, low gravity", "#0f172a", "#e2e8f0", "#93c5fd", null, {h: (bp$22)([200, 300, 34, 60]), t: {h: (bp$22)([400, 340, 34, 60]), t: {h: (bp$22)([300, 470, 34, 60]), t: null}}}, null, null, 210]), t: {h: (bd$75)(["🌀 Portals", "#0a0008", "#ff2bd6", "#ffffff", null, {h: (bp$22)([220, 380, 26, 80]), t: {h: (bp$22)([380, 380, 26, 80]), t: null}}, null, {h: (gate$30)([110, 300, 22, 470, 200]), t: {h: (gate$30)([470, 560, 22, 130, 470]), t: {h: (gate$30)([300, 600, 22, 300, 150]), t: null}}}, 390]), t: {h: (bd$75)(["🏙️ City, two levels", "#1f1a14", "#fdba74", "#93c5fd", {h: (w$8)([20, 470, 150, 560]), t: {h: (w$8)([545, 470, 450, 560]), t: null}}, {h: (bp$22)([220, 280, 26, 70]), t: {h: (bp$22)([380, 280, 26, 70]), t: {h: (bp$22)([300, 720, 26, 70]), t: null}}}, {h: $R.tup([150, 560, 70, 1], ["x", "y", "len", "side"]), t: {h: $R.tup([450, 560, 70, $R.isub(0, 1)], ["x", "y", "len", "side"]), t: null}}, null, 390]), t: null}}}}}}}}}}, boards$77 = def$76, def$78 = $R.fn((a$79) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let i$80, let$81, nth$89; return (i$80 = a$79, (let$81 = (() => { let nth$82; return (nth$82 = $R.fn((a$83) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bs$84, k$85, m$86, b$87, rest$88; return (bs$84 = a$83[0], k$85 = a$83[1], (m$86 = bs$84, ((m$86 === null) ? ((bd$75)(["", "#000000", "#ffffff", "#ffffff", null, null, null, null, 390])) : ((m$86 !== null) ? (b$87 = m$86.h, rest$88 = m$86.t, ((k$85 <= 0) ? b$87 : (nth$82)([rest$88, $R.isub(k$85, 1)]))) : $R.nomatch("case"))))); }, 10, [nth$82, bd$75]), nth$82); })(), nth$89 = let$81, (nth$89)([boards$77, i$80]))); }, 11, [bd$75, boards$77]), board$90 = def$78, def$91 = (() => { let rests$92; return (rests$92 = $R.fn((a$93) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let fs$94, m$95, rest$96; return (fs$94 = a$93, (m$95 = fs$94, ((m$95 === null) ? (null) : ((m$95 !== null) ? (rest$96 = m$95.t, {h: 500, t: (rests$92)(rest$96)}) : $R.nomatch("case"))))); }, 12, [rests$92]), rests$92); })(), rests$97 = def$91, def$98 = $R.fn((a$99) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let i$100, let$101, b$102; return (i$100 = a$99, (let$101 = (board$90)(i$100), b$102 = let$101, $R.tup([$R.imul($R.dot(b$102, "sx"), 1000), $R.imul($R.dot(b$102, "sy"), 1000), 0, 0, (rests$97)($R.dot(b$102, "flippers")), 0, 3, false, null], ["x", "y", "vx", "vy", "flips", "score", "balls", "over", "hits"]))); }, 13, [board$90, rests$97]), start$103 = def$98, def$104 = (() => { let turn$105; return (turn$105 = $R.fn((a$106) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let fs$107, angles$108, left$109, right$110, m$111, f$112, frest$113, a$114, arest$115, let$116, held$117; return (fs$107 = a$106[0], angles$108 = a$106[1], left$109 = a$106[2], right$110 = a$106[3], (m$111 = [fs$107, angles$108], ((m$111[0] !== null) && (m$111[1] !== null) ? (f$112 = m$111[0].h, frest$113 = m$111[0].t, a$114 = m$111[1].h, arest$115 = m$111[1].t, (let$116 = (($R.eq($R.dot(f$112, "side"), 1) && left$109) || ($R.eq($R.dot(f$112, "side"), $R.isub(0, 1)) && right$110)), held$117 = let$116, {h: (held$117 ? (($R.isub(a$114, 260) < $R.isub(0, 500)) ? $R.isub(0, 500) : $R.isub(a$114, 260)) : (($R.iadd(a$114, 120) > 500) ? 500 : $R.iadd(a$114, 120))), t: (turn$105)([frest$113, arest$115, left$109, right$110])})) : (null)))); }, 14, [turn$105]), turn$105); })(), turn$118 = def$104, def$119 = $R.fn((a$120) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$121, ax$122, ay$123, bx$124, by$125, th$126, e$127, kick$128, tdx$129, tdy$130, let$131, dx$132, let$133, dy$134, let$135, t0$136, let$137, t$138, let$139, cx$140, let$141, cy$142, let$143, d$144, let$145, reach$146, let$147, nx$148, let$149, ny$150, let$151, vn$152, let$153, x2$154, let$155, y2$156; return (b$121 = a$120[0], ax$122 = a$120[1], ay$123 = a$120[2], bx$124 = a$120[3], by$125 = a$120[4], th$126 = a$120[5], e$127 = a$120[6], kick$128 = a$120[7], tdx$129 = a$120[8], tdy$130 = a$120[9], (let$131 = (bx$124 - ax$122), dx$132 = let$131, (let$133 = (by$125 - ay$123), dy$134 = let$133, (let$135 = (((($R.dot(b$121, "x") - ax$122) * dx$132) + (($R.dot(b$121, "y") - ay$123) * dy$134)) / (((dx$132 * dx$132) + (dy$134 * dy$134)) + 0.0001)), t0$136 = let$135, (let$137 = ((t0$136 < 0) ? 0 : ((t0$136 > 1) ? 1 : t0$136)), t$138 = let$137, (let$139 = (ax$122 + (t$138 * dx$132)), cx$140 = let$139, (let$141 = (ay$123 + (t$138 * dy$134)), cy$142 = let$141, (let$143 = ($R.b["sqrt"])(((($R.dot(b$121, "x") - cx$140) * ($R.dot(b$121, "x") - cx$140)) + (($R.dot(b$121, "y") - cy$142) * ($R.dot(b$121, "y") - cy$142)))), d$144 = let$143, (let$145 = (12 + th$126), reach$146 = let$145, (((d$144 >= reach$146) || (d$144 < 0.0001)) ? [b$121, false] : (let$147 = (($R.dot(b$121, "x") - cx$140) / d$144), nx$148 = let$147, (let$149 = (($R.dot(b$121, "y") - cy$142) / d$144), ny$150 = let$149, (let$151 = ((($R.dot(b$121, "vx") - (t$138 * tdx$129)) * nx$148) + (($R.dot(b$121, "vy") - (t$138 * tdy$130)) * ny$150)), vn$152 = let$151, (let$153 = (cx$140 + (nx$148 * reach$146)), x2$154 = let$153, (let$155 = (cy$142 + (ny$150 * reach$146)), y2$156 = let$155, ((vn$152 >= 0) ? [$R.tup([x2$154, y2$156, $R.dot(b$121, "vx"), $R.dot(b$121, "vy")], ["x", "y", "vx", "vy"]), true] : [$R.tup([x2$154, y2$156, (($R.dot(b$121, "vx") - (((1 + e$127) * vn$152) * nx$148)) + (kick$128 * nx$148)), (($R.dot(b$121, "vy") - (((1 + e$127) * vn$152) * ny$150)) + (kick$128 * ny$150))], ["x", "y", "vx", "vy"]), true])))))))))))))))); }, 15, null), off_seg$157 = def$119, def$158 = (() => { let walls_hit$159; return (walls_hit$159 = $R.fn((a$160) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$161, ws$162, score$163, m$164, v$165, rest$166, let$167, b2$168, hit$169; return (b$161 = a$160[0], ws$162 = a$160[1], score$163 = a$160[2], (m$164 = ws$162, ((m$164 === null) ? ([b$161, score$163]) : ((m$164 !== null) ? (v$165 = m$164.h, rest$166 = m$164.t, (let$167 = (off_seg$157)([b$161, ($R.b["float_of_int"])($R.dot(v$165, "ax")), ($R.b["float_of_int"])($R.dot(v$165, "ay")), ($R.b["float_of_int"])($R.dot(v$165, "bx")), ($R.b["float_of_int"])($R.dot(v$165, "by")), 0, (($R.b["float_of_int"])($R.dot(v$165, "bounce")) / 100), (($R.b["float_of_int"])($R.dot(v$165, "kick")) / 10), 0, 0]), b2$168 = let$167[0], hit$169 = let$167[1], (walls_hit$159)([b2$168, rest$166, ((hit$169 && ($R.dot(v$165, "kick") > 0)) ? $R.iadd(score$163, 10) : score$163)]))) : $R.nomatch("case"))))); }, 16, [off_seg$157, walls_hit$159]), walls_hit$159); })(), walls_hit$170 = def$158, def$171 = (() => { let bumps$172; return (bumps$172 = $R.fn((a$173) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$174, bs$175, i$176, score$177, hits$178, m$179, p$180, rest$181, let$182, px$183, let$184, py$185, let$186, d$187, let$188, reach$189, let$190, nx$191, let$192, ny$193, let$194, vn$195, let$196, out$197; return (b$174 = a$173[0], bs$175 = a$173[1], i$176 = a$173[2], score$177 = a$173[3], hits$178 = a$173[4], (m$179 = bs$175, ((m$179 === null) ? ([b$174, score$177, hits$178]) : ((m$179 !== null) ? (p$180 = m$179.h, rest$181 = m$179.t, (let$182 = ($R.b["float_of_int"])($R.dot(p$180, "x")), px$183 = let$182, (let$184 = ($R.b["float_of_int"])($R.dot(p$180, "y")), py$185 = let$184, (let$186 = ($R.b["sqrt"])(((($R.dot(b$174, "x") - px$183) * ($R.dot(b$174, "x") - px$183)) + (($R.dot(b$174, "y") - py$185) * ($R.dot(b$174, "y") - py$185)))), d$187 = let$186, (let$188 = (($R.b["float_of_int"])($R.dot(p$180, "r")) + 12), reach$189 = let$188, (((d$187 >= reach$189) || (d$187 < 0.0001)) ? (bumps$172)([b$174, rest$181, $R.iadd(i$176, 1), score$177, hits$178]) : (let$190 = (($R.dot(b$174, "x") - px$183) / d$187), nx$191 = let$190, (let$192 = (($R.dot(b$174, "y") - py$185) / d$187), ny$193 = let$192, (let$194 = (($R.dot(b$174, "vx") * nx$191) + ($R.dot(b$174, "vy") * ny$193)), vn$195 = let$194, (let$196 = (((vn$195 < 0) ? (0 - vn$195) : vn$195) + 6), out$197 = let$196, (bumps$172)([$R.tup([(px$183 + (nx$191 * reach$189)), (py$185 + (ny$193 * reach$189)), (($R.dot(b$174, "vx") - (vn$195 * nx$191)) + (out$197 * nx$191)), (($R.dot(b$174, "vy") - (vn$195 * ny$193)) + (out$197 * ny$193))], ["x", "y", "vx", "vy"]), rest$181, $R.iadd(i$176, 1), $R.iadd(score$177, $R.dot(p$180, "points")), {h: i$176, t: hits$178}]))))))))))) : $R.nomatch("case"))))); }, 17, [bumps$172]), bumps$172); })(), bumps$198 = def$171, def$199 = $R.fn((a$200) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let f$201, a$202; return (f$201 = a$200[0], a$202 = a$200[1], [(($R.b["float_of_int"])($R.dot(f$201, "x")) + (($R.b["float_of_int"])($R.imul($R.dot(f$201, "side"), $R.dot(f$201, "len"))) * ($R.b["cos"])(a$202))), (($R.b["float_of_int"])($R.dot(f$201, "y")) + (($R.b["float_of_int"])($R.dot(f$201, "len")) * ($R.b["sin"])(a$202)))]); }, 18, null), tip$203 = def$199, def$204 = (() => { let flips_hit$205; return (flips_hit$205 = $R.fn((a$206) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$207, fs$208, a0s$209, a1s$210, u$211, m$212, f$213, frest$214, a0$215, r0$216, a1$217, r1$218, let$219, a$220, let$221, tx$222, ty$223, let$224, ox$225, oy$226, let$227, nx$228, ny$229, let$230, b2$231; return (b$207 = a$206[0], fs$208 = a$206[1], a0s$209 = a$206[2], a1s$210 = a$206[3], u$211 = a$206[4], (m$212 = [fs$208, a0s$209, a1s$210], ((m$212[0] !== null) && (m$212[1] !== null) && (m$212[2] !== null) ? (f$213 = m$212[0].h, frest$214 = m$212[0].t, a0$215 = m$212[1].h, r0$216 = m$212[1].t, a1$217 = m$212[2].h, r1$218 = m$212[2].t, (let$219 = ((($R.b["float_of_int"])(a0$215) + ((($R.b["float_of_int"])(a1$217) - ($R.b["float_of_int"])(a0$215)) * u$211)) / 1000), a$220 = let$219, (let$221 = (tip$203)([f$213, a$220]), tx$222 = let$221[0], ty$223 = let$221[1], (let$224 = (tip$203)([f$213, (($R.b["float_of_int"])(a0$215) / 1000)]), ox$225 = let$224[0], oy$226 = let$224[1], (let$227 = (tip$203)([f$213, (($R.b["float_of_int"])(a1$217) / 1000)]), nx$228 = let$227[0], ny$229 = let$227[1], (let$230 = (off_seg$157)([b$207, ($R.b["float_of_int"])($R.dot(f$213, "x")), ($R.b["float_of_int"])($R.dot(f$213, "y")), tx$222, ty$223, 8, 0.29999999999999999, 0, (nx$228 - ox$225), (ny$229 - oy$226)]), b2$231 = let$230[0], (flips_hit$205)([b2$231, frest$214, r0$216, r1$218, u$211]))))))) : (b$207)))); }, 19, [tip$203, off_seg$157, flips_hit$205]), flips_hit$205); })(), flips_hit$232 = def$204, def$233 = (() => { let through$234; return (through$234 = $R.fn((a$235) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$236, ps$237, m$238, p$239, rest$240, let$241, dx$242, let$243, dy$244; return (b$236 = a$235[0], ps$237 = a$235[1], (m$238 = ps$237, ((m$238 === null) ? (b$236) : ((m$238 !== null) ? (p$239 = m$238.h, rest$240 = m$238.t, (let$241 = ($R.dot(b$236, "x") - ($R.b["float_of_int"])($R.dot(p$239, "x"))), dx$242 = let$241, (let$243 = ($R.dot(b$236, "y") - ($R.b["float_of_int"])($R.dot(p$239, "y"))), dy$244 = let$243, ((((dx$242 * dx$242) + (dy$244 * dy$244)) < ($R.b["float_of_int"])($R.imul($R.dot(p$239, "r"), $R.dot(p$239, "r")))) ? $R.tup([($R.b["float_of_int"])($R.dot(p$239, "tx")), ($R.b["float_of_int"])($R.dot(p$239, "ty")), ($R.dot(b$236, "vx") * 0.80000000000000004), ($R.dot(b$236, "vy") * 0.80000000000000004)], ["x", "y", "vx", "vy"]) : (through$234)([b$236, rest$240]))))) : $R.nomatch("case"))))); }, 20, [through$234]), through$234); })(), through$245 = def$233, def$246 = $R.fn((a$247) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let b$248, let$249, s$250; return (b$248 = a$247, (let$249 = ($R.b["sqrt"])((($R.dot(b$248, "vx") * $R.dot(b$248, "vx")) + ($R.dot(b$248, "vy") * $R.dot(b$248, "vy")))), s$250 = let$249, ((s$250 <= 32) ? b$248 : $R.tup([$R.dot(b$248, "x"), $R.dot(b$248, "y"), (($R.dot(b$248, "vx") * 32) / s$250), (($R.dot(b$248, "vy") * 32) / s$250)], ["x", "y", "vx", "vy"])))); }, 21, null), cap$251 = def$246, def$252 = (() => { let sub$253; return (sub$253 = $R.fn((a$254) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let bo$255, b$256, a0s$257, a1s$258, k$259, score$260, hits$261, let$262, g$263, let$264, vy$265, let$266, moved$267, let$268, b1$269, s1$270, let$271, b2$272, s2$273, h2$274, let$275, b3$276; return (bo$255 = a$254[0], b$256 = a$254[1], a0s$257 = a$254[2], a1s$258 = a$254[3], k$259 = a$254[4], score$260 = a$254[5], hits$261 = a$254[6], ((k$259 >= 4) ? [b$256, score$260, hits$261] : (let$262 = (($R.b["float_of_int"])($R.dot(bo$255, "gravity")) / 1000), g$263 = let$262, (let$264 = ($R.dot(b$256, "vy") + (g$263 / 4)), vy$265 = let$264, (let$266 = (cap$251)($R.tup([($R.dot(b$256, "x") + ($R.dot(b$256, "vx") / 4)), ($R.dot(b$256, "y") + (vy$265 / 4)), $R.dot(b$256, "vx"), vy$265], ["x", "y", "vx", "vy"])), moved$267 = let$266, (let$268 = (walls_hit$170)([moved$267, $R.dot(bo$255, "walls"), score$260]), b1$269 = let$268[0], s1$270 = let$268[1], (let$271 = (bumps$198)([b1$269, $R.dot(bo$255, "bumpers"), 0, s1$270, hits$261]), b2$272 = let$271[0], s2$273 = let$271[1], h2$274 = let$271[2], (let$275 = (flips_hit$232)([b2$272, $R.dot(bo$255, "flippers"), a0s$257, a1s$258, (($R.b["float_of_int"])($R.iadd(k$259, 1)) / 4)]), b3$276 = let$275, (sub$253)([bo$255, (through$245)([(cap$251)(b3$276), $R.dot(bo$255, "portals")]), a0s$257, a1s$258, $R.iadd(k$259, 1), s2$273, h2$274]))))))))); }, 22, [cap$251, walls_hit$170, bumps$198, flips_hit$232, through$245, sub$253]), sub$253); })(), sub$277 = def$252, def$278 = $R.fn((a$279) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let i$280, g$281, left$282, right$283, launch$284, let$285, bo$286, let$287, a1s$288, let$289, b0$290, let$291, b$292, score$293, hits$294, let$295, ml$298, let$299, waiting$300, let$301, push$302; return (i$280 = a$279[0], g$281 = a$279[1], left$282 = a$279[2], right$283 = a$279[3], launch$284 = a$279[4], ($R.dot(g$281, "over") ? g$281 : (let$285 = (board$90)(i$280), bo$286 = let$285, (let$287 = (turn$118)([$R.dot(bo$286, "flippers"), $R.dot(g$281, "flips"), left$282, right$283]), a1s$288 = let$287, (let$289 = $R.tup([(($R.b["float_of_int"])($R.dot(g$281, "x")) / 1000), (($R.b["float_of_int"])($R.dot(g$281, "y")) / 1000), (($R.b["float_of_int"])($R.dot(g$281, "vx")) / 1000), (($R.b["float_of_int"])($R.dot(g$281, "vy")) / 1000)], ["x", "y", "vx", "vy"]), b0$290 = let$289, (let$291 = (sub$277)([bo$286, b0$290, $R.dot(g$281, "flips"), a1s$288, 0, $R.dot(g$281, "score"), null]), b$292 = let$291[0], score$293 = let$291[1], hits$294 = let$291[2], (let$295 = $R.fn((a$296) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let f$297; return (f$297 = a$296, ($R.b["int_of_float"])(($R.b["floor"])(((f$297 * 1000) + 0.5)))); }, 23, null), ml$298 = let$295, (($R.dot(b$292, "y") > 1030) ? (($R.dot(g$281, "balls") <= 1) ? $R.tup([$R.dot(g$281, "x"), $R.dot(g$281, "y"), 0, 0, a1s$288, score$293, 0, true, hits$294], ["x", "y", "vx", "vy", "flips", "score", "balls", "over", "hits"]) : $R.tup([$R.imul($R.dot(bo$286, "sx"), 1000), $R.imul($R.dot(bo$286, "sy"), 1000), 0, 0, a1s$288, score$293, $R.isub($R.dot(g$281, "balls"), 1), false, hits$294], ["x", "y", "vx", "vy", "flips", "score", "balls", "over", "hits"])) : (let$299 = (($R.dot(b$292, "x") > 545) && (($R.dot(b$292, "y") > 920) && (($R.dot(b$292, "vy") > (0 - 1)) && ($R.dot(b$292, "vy") < 2)))), waiting$300 = let$299, (let$301 = $R.isub(0, $R.iadd(24000, $R.imul(80, ((launch$284 > 100) ? 100 : launch$284)))), push$302 = let$301, $R.tup([(ml$298)($R.dot(b$292, "x")), (ml$298)($R.dot(b$292, "y")), (ml$298)($R.dot(b$292, "vx")), (waiting$300 ? ((launch$284 > 0) ? push$302 : 0) : (ml$298)($R.dot(b$292, "vy"))), a1s$288, score$293, $R.dot(g$281, "balls"), false, hits$294], ["x", "y", "vx", "vy", "flips", "score", "balls", "over", "hits"]))))))))))); }, 24, [board$90, turn$118, sub$277]), step$303 = def$278, $R.tup([w$8, sling$15, bp$22, gate$30, join$39, arc$61, frame$63, bd$75, boards$77, board$90, rests$97, start$103, turn$118, off_seg$157, walls_hit$170, bumps$198, tip$203, flips_hit$232, through$245, cap$251, sub$277, step$303], ["w", "sling", "bp", "gate", "join", "arc", "frame", "bd", "boards", "board", "rests", "start", "turn", "off_seg", "walls_hit", "bumps", "tip", "flips_hit", "through", "cap", "sub", "step"])); })(), Pinball$304 = let$1, $R.tup([$R.dot(Pinball$304, "start"), $R.dot(Pinball$304, "step"), $R.dot(Pinball$304, "board")], ["start", "step", "board"]));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
  const made = "b7dc366d68";
  // (ticket 793) Game = (x = Int, y = Int, vx = Int, vy = Int, flips = [Int], score = Int, balls = Int, over = Bool, hits = [Int]);
  // Board = (name, bg, ink, glow = String, walls = [Wall], bumpers = [Bumper], flippers = [Flipper], portals = [Portal], sx = Int,
  // sy = Int, svx = Int, svy = Int, gravity = Int), its pieces records of Ints
  const ints = l => array(l).map(int);
  const G = ["x", "y", "vx", "vy", "flips", "score", "balls", "over", "hits"];
  const gameIn = g => $R.tup([g.x, g.y, g.vx, g.vy, list(g.flips), g.score, g.balls, g.over, list(g.hits)], G);
  const gameOut = r => ({ x: int(r.x), y: int(r.y), vx: int(r.vx), vy: int(r.vy), flips: ints(r.flips), score: int(r.score),
                          balls: int(r.balls), over: r.over, hits: ints(r.hits) });
  const rec = (r, ks) => Object.fromEntries(ks.map(k => [k, int(r[k])]));
  const boardOut = r => ({ name: r.name, bg: r.bg, ink: r.ink, glow: r.glow,
    walls: array(r.walls).map(w => rec(w, ["ax", "ay", "bx", "by", "bounce", "kick"])), bumpers: array(r.bumpers).map(b => rec(b, ["x", "y", "r", "points"])),
    flippers: array(r.flippers).map(f => rec(f, ["x", "y", "len", "side"])), portals: array(r.portals).map(q => rec(q, ["x", "y", "r", "tx", "ty"])),
    sx: int(r.sx), sy: int(r.sy), svx: int(r.svx), svy: int(r.svy), gravity: int(r.gravity) });
  // board : Int -> Board; start : Int -> Game; step : (Int, Game, Bool, Bool, Int) -> Game (the board, the game, the left and
  // right flippers held, the plunger's launch 0 to 100)
  const board = i => boardOut(P.board(i));
  const start = i => gameOut(P.start(i));
  const step = (i, g, left, right, launch) => gameOut(P.step([i, gameIn(g), left, right, launch]));
  const api = { board, start, step, made };
  // (ticket 797) a game's converters, for node/three-way.mjs to time the page boundary by itself
  try { api.$convert = { gameIn, gameOut }; } catch (e) { /* an oracle: no game crosses */ }
  if (typeof window !== "undefined") window.PinballCompiled = api;
  if (typeof module !== "undefined") module.exports = api;
})();
