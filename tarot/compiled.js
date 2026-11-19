// hazeljs-examples, the Tarot: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel 760ce2cf67 (trial/765-iching-aot), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// (ticket 765) The page runs its rules through this file instead of loading hazeljs and building the program, unless asked
// for interpreted (?interpreted=1) or the rules are edited. The same answers are checked by node/compare-compiled.mjs.
(() => {
  "use strict";
  const $R = ({
  append(a, b) { if (a === null) return b; const xs = []; for (let p = a; p !== null; p = p.t) xs.push(p.h);
    let r = b; for (let i = xs.length - 1; i >= 0; i--) r = {h: xs[i], t: r}; return r; },
  tup(vs, ls) { for (let i = 0; i < ls.length; i++) if (ls[i] !== null) vs[ls[i]] = vs[i]; return vs; },
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
"use strict";  let let$1, Deck$78, let$79, Spreads$130, let$131, Reading$159; return (let$1 = (() => { let def$2, majors$3, def$4, ranks$5, def$6, nth_name$14, def$15, suit_name$19, def$20, name$27, def$28, cat$36, def$37, majors_from$41, def$42, suit_from$47, def$48, deck$49, def$50, size$56, def$57, nth_card$65, def$66, take$77; return (def$2 = {h: "The Fool", t: {h: "The Magician", t: {h: "The High Priestess", t: {h: "The Empress", t: {h: "The Emperor", t: {h: "The Hierophant", t: {h: "The Lovers", t: {h: "The Chariot", t: {h: "Strength", t: {h: "The Hermit", t: {h: "Wheel of Fortune", t: {h: "Justice", t: {h: "The Hanged Man", t: {h: "Death", t: {h: "Temperance", t: {h: "The Devil", t: {h: "The Tower", t: {h: "The Star", t: {h: "The Moon", t: {h: "The Sun", t: {h: "Judgement", t: {h: "The World", t: null}}}}}}}}}}}}}}}}}}}}}}, majors$3 = def$2, def$4 = {h: "Ace", t: {h: "Two", t: {h: "Three", t: {h: "Four", t: {h: "Five", t: {h: "Six", t: {h: "Seven", t: {h: "Eight", t: {h: "Nine", t: {h: "Ten", t: {h: "Page", t: {h: "Knight", t: {h: "Queen", t: {h: "King", t: null}}}}}}}}}}}}}}, ranks$5 = def$4, def$6 = (() => { let nth_name$7; return (nth_name$7 = $R.fn((a$8) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$9, i$10, m$11, x$12, rest$13; return (xs$9 = a$8[0], i$10 = a$8[1], (m$11 = xs$9, ((m$11 === null) ? ("") : ((m$11 !== null) ? (x$12 = m$11.h, rest$13 = m$11.t, ($R.eq(i$10, 0) ? x$12 : (nth_name$7)([rest$13, $R.isub(i$10, 1)]))) : $R.nomatch("case"))))); }, 0, [nth_name$7]), nth_name$7); })(), nth_name$14 = def$6, def$15 = $R.fn((a$16) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$17, m$18; return (s$17 = a$16, (m$18 = s$17, ((m$18.c === "Wands") ? ("Wands") : ((m$18.c === "Cups") ? ("Cups") : ((m$18.c === "Swords") ? ("Swords") : ((m$18.c === "Pentacles") ? ("Pentacles") : $R.nomatch("case"))))))); }, 1, null), suit_name$19 = def$15, def$20 = $R.fn((a$21) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let c$22, m$23, s$24, r$25, i$26; return (c$22 = a$21, (m$23 = c$22, ((m$23.c === "Major") ? (i$26 = m$23.v, (nth_name$14)([majors$3, i$26])) : ((m$23.c === "Minor") ? (s$24 = m$23.v[0], r$25 = m$23.v[1], ((nth_name$14)([ranks$5, $R.isub(r$25, 1)]) + (" of " + (suit_name$19)(s$24)))) : $R.nomatch("case"))))); }, 2, [suit_name$19, ranks$5, nth_name$14, majors$3]), name$27 = def$20, def$28 = (() => { let cat$29; return (cat$29 = $R.fn((a$30) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$31, ys$32, m$33, x$34, rest$35; return (xs$31 = a$30[0], ys$32 = a$30[1], (m$33 = xs$31, ((m$33 === null) ? (ys$32) : ((m$33 !== null) ? (x$34 = m$33.h, rest$35 = m$33.t, {h: x$34, t: (cat$29)([rest$35, ys$32])}) : $R.nomatch("case"))))); }, 3, [cat$29]), cat$29); })(), cat$36 = def$28, def$37 = (() => { let majors_from$38; return (majors_from$38 = $R.fn((a$39) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let i$40; return (i$40 = a$39, ((i$40 > 21) ? null : {h: {c: "Major", v: i$40}, t: (majors_from$38)($R.iadd(i$40, 1))})); }, 4, [majors_from$38]), majors_from$38); })(), majors_from$41 = def$37, def$42 = (() => { let suit_from$43; return (suit_from$43 = $R.fn((a$44) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$45, r$46; return (s$45 = a$44[0], r$46 = a$44[1], ((r$46 > 14) ? null : {h: {c: "Minor", v: [s$45, r$46]}, t: (suit_from$43)([s$45, $R.iadd(r$46, 1)])})); }, 5, [suit_from$43]), suit_from$43); })(), suit_from$47 = def$42, def$48 = (cat$36)([(majors_from$41)(0), (cat$36)([(suit_from$47)([{c: "Wands"}, 1]), (cat$36)([(suit_from$47)([{c: "Cups"}, 1]), (cat$36)([(suit_from$47)([{c: "Swords"}, 1]), (suit_from$47)([{c: "Pentacles"}, 1])])])])]), deck$49 = def$48, def$50 = (() => { let size$51; return (size$51 = $R.fn((a$52) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let cs$53, m$54, rest$55; return (cs$53 = a$52, (m$54 = cs$53, ((m$54 === null) ? (0) : ((m$54 !== null) ? (rest$55 = m$54.t, $R.iadd(1, (size$51)(rest$55))) : $R.nomatch("case"))))); }, 6, [size$51]), size$51); })(), size$56 = def$50, def$57 = (() => { let nth_card$58; return (nth_card$58 = $R.fn((a$59) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let cs$60, k$61, m$62, c$63, rest$64; return (cs$60 = a$59[0], k$61 = a$59[1], (m$62 = cs$60, ((m$62 === null) ? ({c: "Major", v: 0}) : ((m$62 !== null) ? (c$63 = m$62.h, rest$64 = m$62.t, ($R.eq(k$61, 0) ? c$63 : (nth_card$58)([rest$64, $R.isub(k$61, 1)]))) : $R.nomatch("case"))))); }, 7, [nth_card$58]), nth_card$58); })(), nth_card$65 = def$57, def$66 = (() => { let take$67; return (take$67 = $R.fn((a$68) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let cs$69, k$70, m$71, c$72, rest$73, let$74, d$75, left$76; return (cs$69 = a$68[0], k$70 = a$68[1], (m$71 = cs$69, ((m$71 === null) ? ([{c: "Major", v: 0}, null]) : ((m$71 !== null) ? (c$72 = m$71.h, rest$73 = m$71.t, ($R.eq(k$70, 0) ? [c$72, rest$73] : (let$74 = (take$67)([rest$73, $R.isub(k$70, 1)]), d$75 = let$74[0], left$76 = let$74[1], [d$75, {h: c$72, t: left$76}]))) : $R.nomatch("case"))))); }, 8, [take$67]), take$67); })(), take$77 = def$66, $R.tup([majors$3, ranks$5, nth_name$14, suit_name$19, name$27, cat$36, majors_from$41, suit_from$47, deck$49, size$56, nth_card$65, take$77], ["majors", "ranks", "nth_name", "suit_name", "name", "cat", "majors_from", "suit_from", "deck", "size", "nth_card", "take"])); })(), Deck$78 = let$1, (let$79 = (() => { let def$80, three$84, def$85, celtic_cross$86, def$87, relationship$88, def$89, join$97, def$98, letters$99, def$100, path$105, def$106, paths$111, def$112, months$113, def$114, year$121, def$122, positions$129; return (def$80 = $R.fn((a$81) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let t$82, m$83; return (t$82 = a$81, (m$83 = t$82, ((m$83.c === "PastPresentFuture") ? ({h: $R.tup(["Past", "what has led here"], ["name", "about"]), t: {h: $R.tup(["Present", "where things stand"], ["name", "about"]), t: {h: $R.tup(["Future", "where things are heading"], ["name", "about"]), t: null}}}) : ((m$83.c === "SituationChallengeAdvice") ? ({h: $R.tup(["Situation", "where things stand"], ["name", "about"]), t: {h: $R.tup(["Challenge", "what stands in the way"], ["name", "about"]), t: {h: $R.tup(["Advice", "what would help"], ["name", "about"]), t: null}}}) : ((m$83.c === "MindBodySpirit") ? ({h: $R.tup(["Mind", "your thoughts"], ["name", "about"]), t: {h: $R.tup(["Body", "your body and your days"], ["name", "about"]), t: {h: $R.tup(["Spirit", "what moves you"], ["name", "about"]), t: null}}}) : $R.nomatch("case")))))); }, 9, null), three$84 = def$80, def$85 = {h: $R.tup(["1. The present", "what covers the question"], ["name", "about"]), t: {h: $R.tup(["2. The challenge", "what crosses it"], ["name", "about"]), t: {h: $R.tup(["3. The root", "what lies beneath it"], ["name", "about"]), t: {h: $R.tup(["4. The recent past", "what is passing away"], ["name", "about"]), t: {h: $R.tup(["5. The crown", "what may come to be"], ["name", "about"]), t: {h: $R.tup(["6. The near future", "what comes next"], ["name", "about"]), t: {h: $R.tup(["7. Yourself", "how you stand in it"], ["name", "about"]), t: {h: $R.tup(["8. Your surroundings", "the people and places around it"], ["name", "about"]), t: {h: $R.tup(["9. Hopes and fears", "what you hope, or dread"], ["name", "about"]), t: {h: $R.tup(["10. The outcome", "where it leads"], ["name", "about"]), t: null}}}}}}}}}}, celtic_cross$86 = def$85, def$87 = {h: $R.tup(["You", "what you bring"], ["name", "about"]), t: {h: $R.tup(["The other", "what they bring"], ["name", "about"]), t: {h: $R.tup(["The bond", "what passes between you"], ["name", "about"]), t: {h: $R.tup(["Its strength", "what holds you together"], ["name", "about"]), t: {h: $R.tup(["Its tension", "what pulls you apart"], ["name", "about"]), t: {h: $R.tup(["A way forward", "what could come next"], ["name", "about"]), t: null}}}}}}, relationship$88 = def$87, def$89 = (() => { let join$90; return (join$90 = $R.fn((a$91) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let xs$92, ys$93, m$94, x$95, rest$96; return (xs$92 = a$91[0], ys$93 = a$91[1], (m$94 = xs$92, ((m$94 === null) ? (ys$93) : ((m$94 !== null) ? (x$95 = m$94.h, rest$96 = m$94.t, {h: x$95, t: (join$90)([rest$96, ys$93])}) : $R.nomatch("case"))))); }, 10, [join$90]), join$90); })(), join$97 = def$89, def$98 = {h: "A", t: {h: "B", t: {h: "C", t: {h: "D", t: {h: "E", t: {h: "F", t: null}}}}}}, letters$99 = def$98, def$100 = $R.fn((a$101) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let i$102, let$103, p$104; return (i$102 = a$101, (let$103 = ("Path " + ((Deck$78)["nth_name"])([letters$99, i$102])), p$104 = let$103, {h: $R.tup([(p$104 + ": opportunity"), "what this path opens"], ["name", "about"]), t: {h: $R.tup([(p$104 + ": difficulty"), "what this path asks of you"], ["name", "about"]), t: {h: $R.tup([(p$104 + ": direction"), "where this path is likely to lead"], ["name", "about"]), t: null}}})); }, 11, [letters$99, Deck$78]), path$105 = def$100, def$106 = (() => { let paths$107; return (paths$107 = $R.fn((a$108) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let i$109, n$110; return (i$109 = a$108[0], n$110 = a$108[1], ((i$109 >= n$110) ? null : (join$97)([(path$105)(i$109), (paths$107)([$R.iadd(i$109, 1), n$110])]))); }, 12, [path$105, paths$107, join$97]), paths$107); })(), paths$111 = def$106, def$112 = {h: "January", t: {h: "February", t: {h: "March", t: {h: "April", t: {h: "May", t: {h: "June", t: {h: "July", t: {h: "August", t: {h: "September", t: {h: "October", t: {h: "November", t: {h: "December", t: null}}}}}}}}}}}}, months$113 = def$112, def$114 = (() => { let year$115; return (year$115 = $R.fn((a$116) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let m$117, k$118, let$119, i$120; return (m$117 = a$116[0], k$118 = a$116[1], ((k$118 >= 12) ? null : (let$119 = (($R.iadd(m$117, k$118) >= 12) ? $R.isub($R.iadd(m$117, k$118), 12) : $R.iadd(m$117, k$118)), i$120 = let$119, {h: $R.tup([((Deck$78)["nth_name"])([months$113, i$120]), "what this month brings"], ["name", "about"]), t: (year$115)([m$117, $R.iadd(k$118, 1)])}))); }, 13, [year$115, months$113, Deck$78]), year$115); })(), year$121 = def$114, def$122 = $R.fn((a$123) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$124, m$125, y$126, n$127, t$128; return (s$124 = a$123, (m$125 = s$124, ((m$125.c === "One") ? ({h: $R.tup(["The card", "the heart of the matter"], ["name", "about"]), t: null}) : ((m$125.c === "Three") ? (t$128 = m$125.v, (three$84)(t$128)) : ((m$125.c === "CelticCross") ? (celtic_cross$86) : ((m$125.c === "Relationship") ? (relationship$88) : ((m$125.c === "Choice") ? (n$127 = m$125.v, {h: $R.tup(["The crossroads", "the choice before you"], ["name", "about"]), t: (paths$111)([0, ((n$127 < 2) ? 2 : ((n$127 > 6) ? 6 : n$127))])}) : ((m$125.c === "YearAhead") ? (y$126 = m$125.v, ((y$126)["theme"] ? {h: $R.tup(["The year", "the theme of the year ahead"], ["name", "about"]), t: (year$121)([(y$126)["start"], 0])} : (year$121)([(y$126)["start"], 0]))) : $R.nomatch("case"))))))))); }, 14, [year$121, paths$111, relationship$88, celtic_cross$86, three$84]), positions$129 = def$122, $R.tup([three$84, celtic_cross$86, relationship$88, join$97, letters$99, path$105, paths$111, months$113, year$121, positions$129], ["three", "celtic_cross", "relationship", "join", "letters", "path", "paths", "months", "year", "positions"])); })(), Spreads$130 = let$79, (let$131 = (() => { let def$132, deal_from$152, def$153, deal$158; return (def$132 = (() => { let deal_from$133; return (deal_from$133 = $R.fn((a$134) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let cs$135, n$136, ps$137, us$138, reversals$139, m$140, p$141, rest$142, m$143, a$144, b$145, more$146, let$147, k$148, let$149, c$150, left$151; return (cs$135 = a$134[0], n$136 = a$134[1], ps$137 = a$134[2], us$138 = a$134[3], reversals$139 = a$134[4], (m$140 = ps$137, ((m$140 === null) ? (null) : ((m$140 !== null) ? (p$141 = m$140.h, rest$142 = m$140.t, (m$143 = us$138, ((m$143 !== null) && (m$143.t !== null) ? (a$144 = m$143.h, b$145 = m$143.t.h, more$146 = m$143.t.t, (let$147 = ($R.b["int_of_float"])((a$144 * ($R.b["float_of_int"])(n$136))), k$148 = let$147, (let$149 = ((Deck$78)["take"])([cs$135, k$148]), c$150 = let$149[0], left$151 = let$149[1], {h: $R.tup([c$150, ((Deck$78)["name"])(c$150), (reversals$139 && (b$145 < 0.5)), (p$141)["name"], (p$141)["about"]], ["card", "name", "reversed", "position", "about"]), t: (deal_from$133)([left$151, $R.isub(n$136, 1), rest$142, more$146, reversals$139])}))) : (null)))) : $R.nomatch("case"))))); }, 15, [Deck$78, deal_from$133]), deal_from$133); })(), deal_from$152 = def$132, def$153 = $R.fn((a$154) => { if (--$R.fuel < 0 || (($R.fuel & 16383) === 0 && performance.now() > $R.deadline)) $R.out(); let s$155, us$156, reversals$157; return (s$155 = a$154[0], us$156 = a$154[1], reversals$157 = a$154[2], (deal_from$152)([(Deck$78)["deck"], 78, ((Spreads$130)["positions"])(s$155), us$156, reversals$157])); }, 16, [Deck$78, Spreads$130, deal_from$152]), deal$158 = def$153, $R.tup([deal_from$152, deal$158], ["deal_from", "deal"])); })(), Reading$159 = let$131, $R.tup([(Reading$159)["deal"]], ["deal"]))));
  })($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => { let r = null; for (let i = xs.length - 1; i >= 0; i--) r = { h: xs[i], t: r }; return r; };
  const array = l => { const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; };
  const int = n => Number(n);
  const made = "760ce2cf67";
  // Spread = + One + Three(Trio) + CelticCross + Relationship + Choice(Int) + YearAhead(Year), Year = (start = Int, theme = Bool)
  const spread = s => s.tag === "Three" ? { c: "Three", v: { c: s.value.tag } }
    : s.tag === "Choice" ? { c: "Choice", v: s.value }
    : s.tag === "YearAhead" ? { c: "YearAhead", v: $R.tup([s.value.start, s.value.theme], ["start", "theme"]) }
    : { c: s.tag };
  // Card = + Major(Int) + Minor(Suit, Int)
  const card = c => c.c === "Major" ? { tag: "Major", value: int(c.v) } : { tag: "Minor", value: [{ tag: c.v[0].c }, int(c.v[1])] };
  // deal : (Spread, [Float], Bool) -> [Dealt], a Dealt being (card = Card, name = String, reversed = Bool, position = String, about = String)
  const deal = (s, us, reversals) => array(P.deal([spread(s), list(us), reversals]))
    .map(d => ({ card: card(d.card), name: d.name, reversed: d.reversed, position: d.position, about: d.about }));
  const api = { deal, made };
  if (typeof window !== "undefined") window.TarotCompiled = api;
  if (typeof module !== "undefined") module.exports = api;
})();
