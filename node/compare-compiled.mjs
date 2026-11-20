// hazeljs-examples: an oracle compiled ahead of time (<app>/compiled.js, tools/make-compiled.py) against the same rules run
// by hazeljs. The I Ching: many casts by coins and by yarrow, every one of the 64 hexagrams with each set of changing lines,
// and readings of fewer than six lines. The Tarot: every spread (the year ahead from each month, with and without its
// theme), many shuffles each, with reversals and without. Astrology (0.0.16): readings for births and days drawn across
// 1900 to 2099 and places to 60 degrees north and south, each built by hazeljs as the page builds it (its answer data, as
// a function answer grows past gigabytes there, hazelgrove/hazel#2832), numbers compared to a relative 1e-9 and words
// exactly. Then what each costs.
//
//   node node/compare-compiled.mjs i-ching
//   node node/compare-compiled.mjs tarot
//   node node/compare-compiled.mjs astrology [charts, default 40]
//   node node/compare-compiled.mjs checkers [games, default 3]
//   node node/compare-compiled.mjs go [games, default 2]
//   node node/compare-compiled.mjs minesweeper [boards, default 6]
//   node node/compare-compiled.mjs mahjong [hands, default 3]
//   node node/compare-compiled.mjs solitaire [deals, default 4]
// Checkers (0.0.34, ticket 794, the first of the games compiled): random games, and at every position the moves, a move
// made, and Hazel's choice looking 1 and 2 ahead (3 and 4 on some), both ways.
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";

const APP = process.argv[2] || "i-ching";
const SETUP = {
  "i-ching": { modules: ["Lines", "Casting", "Book", "Reading"], tail: "(cast = Casting.cast, reading = Reading.reading)" },
  "tarot": { modules: ["Deck", "Spreads", "Reading"], tail: "(deal = Reading.deal)" },
  "checkers": { modules: ["Checkers"], tail: "(start = Checkers.start, moves = Checkers.moves, apply = Checkers.apply, choose = Checkers.choose)" },
  "go": { modules: ["Go"], tail: "(fresh = Go.fresh, play = Go.play, pass = Go.pass, score = Go.score, choose = Go.choose)" },
  "minesweeper": { modules: ["Board", "Play", "Hint"], tail: "(fresh = Board.fresh, lay = Board.lay_mines, reveal = Play.reveal, flag = Play.flag, chord = Play.chord, flags = Play.flags, sure = Hint.sure)" },
  "mahjong": { modules: ["Mahjong"], tail: "(start = Mahjong.start, step = Mahjong.step, options = Mahjong.options, next_hand = Mahjong.next_hand)" },
  "solitaire": { modules: ["Cards", "Deal", "Moves"], tail: "(deal = Deal.deal, moves = Moves.moves, moves_from = Moves.moves_from, apply = Moves.apply, won = Moves.won)" },
  "astrology": { modules: ["Zodiac", "Aspects", "Chart", "Orbit", "MoonOrbit", "Planets", "Outer", "PlutoOrbit", "Sky", "Wheel", "Reading"], tail: null },
}[APP];
// (compiled.js is a classic script for the page; the package is "type": "module", so it is run here as one)
const box = { exports: {} };
new Function("module", "window", readFileSync(new URL(`../${APP}/compiled.js`, import.meta.url), "utf8"))(box, undefined);
const C = box.exports;
const read = path => readFileSync(new URL(`../${APP}/rules/` + path, import.meta.url), "utf8").replace(/\s+$/, "");
if (APP === "astrology") astrology();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: SETUP.modules.map(name => ({ name, text: read(name + ".hz") })), tail: SETUP.tail });
if (!r.ok) { console.log("not built", r.errors); process.exit(1); }
const H = r.value;
let seed = 7; const draw = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
let checked = 0, differ = 0;
const check = (what, x, y) => { checked++; if (!same(x, y)) { differ++; if (differ <= 5) console.log("DIFFERS", what, JSON.stringify(x), JSON.stringify(y)); } };
const med = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const time = (f, n) => { const ts = []; for (let i = 0; i < n; i++) { const t = performance.now(); f(); ts.push(performance.now() - t); } return med(ts); };

if (APP === "checkers") {
  const games = Number(process.argv[3] || 3);
  check("start", H.start, C.start);
  let positions = 0;
  for (let n = 0; n < games; n++) {
    let g = C.start;
    for (let i = 0; i < 160 && !g.over; i++) {
      const ms = C.moves(g); positions++;
      check(`game ${n + 1} move ${i + 1}: moves`, H.moves(g), ms);
      const rs = Array.from({ length: 48 }, () => Math.floor(draw() * 1000));
      for (const d of i % 10 === 0 ? [1, 2, 3, 4] : [1, 2]) check(`game ${n + 1} move ${i + 1}: choose ${d}`, H.choose(g, d, rs), C.choose(g, d, rs));
      const m = ms[Math.floor(draw() * ms.length)];
      const a = C.apply(g, m); check(`game ${n + 1} move ${i + 1}: apply`, H.apply(g, m), a); g = a;
    }
  }
  console.log(`${checked} answers compared at ${positions} positions of ${games} games, ${differ} differ`);
  let g = C.start; for (let i = 0; i < 8; i++) { const ms = C.moves(g); g = C.apply(g, ms[Math.floor(draw() * ms.length)]); }
  const rs = Array.from({ length: 48 }, () => Math.floor(draw() * 1000));
  console.log(`the moves: hazeljs ${time(() => H.moves(g), 20).toFixed(2)} ms, compiled ${time(() => C.moves(g), 500).toFixed(4)} ms`);
  for (const d of [1, 2, 3, 4]) console.log(`Hazel looking ${d} ahead: hazeljs ${time(() => H.choose(g, d, rs), d >= 3 ? 3 : 10).toFixed(1)} ms, compiled ${time(() => C.choose(g, d, rs), d >= 3 ? 20 : 200).toFixed(3)} ms`);
  for (const d of [5, 6, 7]) console.log(`Hazel looking ${d} ahead, compiled only: ${time(() => C.choose(g, d, rs), 5).toFixed(1)} ms`);
} else if (APP === "go") {
  // (ticket 794) Hazel against itself on 9 by 9 boards, the page's random numbers for its choice; at every turn the choice, the
  // move or pass it makes, a random point played (legal or not), and every tenth turn the score, both ways
  const games = Number(process.argv[3] || 2);
  check("fresh 9", H.fresh(9), C.fresh(9));
  let turns = 0;
  for (let n = 0; n < games; n++) {
    let g = C.fresh(9);
    for (let i = 0; i < 120 && !g.over; i++) {
      turns++;
      const rs = Array.from({ length: 81 }, () => Math.floor(draw() * 20));
      const w = C.choose(g, rs); check(`game ${n + 1} turn ${i + 1}: choose`, H.choose(g, rs), w);
      const p = Math.floor(draw() * 81); check(`game ${n + 1} turn ${i + 1}: play ${p}`, H.play(g, p), C.play(g, p));
      if (i % 10 === 0) check(`game ${n + 1} turn ${i + 1}: score`, H.score(g), C.score(g));
      const g1 = w < 0 ? C.pass(g) : C.play(g, w); check(`game ${n + 1} turn ${i + 1}: ${w < 0 ? "pass" : "play " + w}`, w < 0 ? H.pass(g) : H.play(g, w), g1); g = g1;
    }
    check(`game ${n + 1}: the last score`, H.score(g), C.score(g));
  }
  console.log(`${checked} answers compared over ${turns} turns of ${games} games, ${differ} differ`);
  let g = C.fresh(9); for (const p of [40, 20, 60]) { g = C.play(g, p); const w = C.choose(g, Array(81).fill(3)); g = w < 0 ? C.pass(g) : C.play(g, w); }
  const rs = Array.from({ length: 81 }, () => Math.floor(draw() * 20));
  console.log(`a move played: hazeljs ${time(() => H.play(g, 30), 10).toFixed(1)} ms, compiled ${time(() => C.play(g, 30), 200).toFixed(3)} ms`);
  console.log(`Hazel's choice: hazeljs ${time(() => H.choose(g, rs), 5).toFixed(1)} ms, compiled ${time(() => C.choose(g, rs), 50).toFixed(2)} ms`);
  console.log(`the score: hazeljs ${time(() => H.score(g), 5).toFixed(1)} ms, compiled ${time(() => C.score(g), 50).toFixed(2)} ms`);
} else if (APP === "minesweeper") {
  // (ticket 794) boards at the three levels, mines laid from the first tap; then, until the board is done, the hint, the move
  // it names (or a random closed cell), a flag and a chord on random cells, and the flags counted, both ways
  const boards = Number(process.argv[3] || 6), LEVELS = [[9, 9, 10], [16, 16, 40], [16, 30, 99]];
  check("fresh", H.fresh(9, 9, 10), C.fresh(9, 9, 10));
  let positions = 0;
  for (let n = 0; n < boards; n++) {
    const [rows, cols, mines] = LEVELS[n % 3], us = Array.from({ length: rows * cols }, draw);
    const r0 = Math.floor(draw() * rows), c0 = Math.floor(draw() * cols);
    let g = C.lay(rows, cols, mines, us, r0, c0); check(`board ${n + 1}: lay`, H.lay(rows, cols, mines, us, r0, c0), g);
    let g1 = C.reveal(g, r0, c0); check(`board ${n + 1}: the first tap`, H.reveal(g, r0, c0), g1); g = g1;
    for (let i = 0; i < 400 && !g.over; i++) {
      positions++;
      const m = C.sure(g); check(`board ${n + 1} step ${i + 1}: sure`, H.sure(g), m);
      const rr = Math.floor(draw() * rows), rc = Math.floor(draw() * cols);
      if (i % 5 === 0) { check(`board ${n + 1} step ${i + 1}: flag`, H.flag(g, rr, rc), C.flag(g, rr, rc)); check(`board ${n + 1} step ${i + 1}: chord`, H.chord(g, rr, rc), C.chord(g, rr, rc)); }
      if (i % 10 === 0) check(`board ${n + 1} step ${i + 1}: flags`, H.flags(g), C.flags(g));
      let r = rr, c = rc;
      if (m.kind) { r = Math.floor(m.at / cols); c = m.at % cols; }
      const flagIt = m.kind === 2 || m.kind === 3; // (2, a mine to flag; 3, a wrong flag to take off: flag toggles)
      g1 = flagIt ? C.flag(g, r, c) : C.reveal(g, r, c);
      check(`board ${n + 1} step ${i + 1}: ${flagIt ? "flag" : "reveal"} ${r},${c}`, flagIt ? H.flag(g, r, c) : H.reveal(g, r, c), g1);
      if (JSON.stringify(g1) === JSON.stringify(g)) { const cl = []; g.grid.forEach((row, i) => row.forEach((x, j) => { if (!x.open && !x.flag) cl.push([i, j]); })); if (!cl.length) break; const [a, b] = cl[Math.floor(draw() * cl.length)]; g1 = C.reveal(g, a, b); check(`board ${n + 1} step ${i + 1}: reveal ${a},${b}`, H.reveal(g, a, b), g1); }
      g = g1;
    }
  }
  console.log(`${checked} answers compared at ${positions} positions of ${boards} boards, ${differ} differ`);
  for (const [rows, cols, mines] of LEVELS) {
    const us = Array.from({ length: rows * cols }, draw), r0 = Math.floor(rows / 2), c0 = Math.floor(cols / 2);
    const g = C.reveal(C.lay(rows, cols, mines, us, r0, c0), r0, c0);
    console.log(`${rows} by ${cols}: a tap hazeljs ${time(() => H.reveal(g, 0, 0), 10).toFixed(1)} ms, compiled ${time(() => C.reveal(g, 0, 0), 100).toFixed(3)} ms; ` +
      `a hint hazeljs ${time(() => H.sure(g), 5).toFixed(0)} ms, compiled ${time(() => C.sure(g), 50).toFixed(2)} ms`);
  }
} else if (APP === "mahjong") {
  // (ticket 794) whole hands: you discarding a random tile and passing every claim, as the page's timing does; at every step
  // the options and the step, both ways, then the next hand
  const hands = Number(process.argv[3] || 3);
  const NONE = { kind: 0, tile: -1 };
  const waiting = o => !!o && (o.discard || o.win || o.pung || o.kong || o.chows.length > 0 || o.kongs.length > 0);
  const rs = () => Array.from({ length: 136 }, () => Math.floor(draw() * 1e6));
  const r0 = rs(); let g = C.start(r0); check("start", H.start(r0), g);
  let steps = 0;
  for (let n = 0; n < hands; n++) {
    for (let i = 0; i < 400 && g.phase !== 3; i++) {
      steps++;
      const o = C.options(g); check(`hand ${n + 1} step ${i + 1}: options`, H.options(g), o);
      const hand = g.seats[0].hand;
      const a = o.discard ? { kind: 1, tile: hand[Math.floor(draw() * hand.length)] } : waiting(o) ? { kind: 4, tile: -1 } : NONE;
      const g1 = C.step(g, a); check(`hand ${n + 1} step ${i + 1}: step ${JSON.stringify(a)}`, H.step(g, a), g1); g = g1;
    }
    if (n + 1 < hands) { const r = rs(); const g1 = C.next_hand(g, r); check(`hand ${n + 2}: next_hand`, H.next_hand(g, r), g1); g = g1; }
  }
  console.log(`${checked} answers compared over ${steps} steps of ${hands} hands, ${differ} differ`);
  const r = rs(); g = C.start(r); for (let i = 0; i < 12; i++) g = C.step(g, NONE);
  console.log(`a hand dealt: hazeljs ${time(() => H.start(r), 5).toFixed(1)} ms, compiled ${time(() => C.start(r), 100).toFixed(3)} ms`);
  console.log(`a step: hazeljs ${time(() => H.step(g, NONE), 10).toFixed(1)} ms, compiled ${time(() => C.step(g, NONE), 200).toFixed(3)} ms`);
  console.log(`the options: hazeljs ${time(() => H.options(g), 10).toFixed(1)} ms, compiled ${time(() => C.options(g), 200).toFixed(3)} ms`);
} else if (APP === "solitaire") {
  // (ticket 794) deals drawing one and three; at every position the moves, the moves from each place, a random move made, and
  // whether it is won, both ways
  const deals = Number(process.argv[3] || 4);
  let positions = 0;
  for (let n = 0; n < deals; n++) {
    const us = Array.from({ length: 52 }, draw), dr = n % 2 ? 3 : 1;
    let g = C.deal(us, dr); check(`deal ${n + 1}`, H.deal(us, dr), g);
    for (let i = 0; i < 200; i++) {
      positions++;
      const ms = C.moves(g); check(`deal ${n + 1} move ${i + 1}: moves`, H.moves(g), ms);
      const froms = [{ tag: "FromWaste" }, ...g.piles.map((p, j) => ({ tag: "FromPile", value: { pile: j, count: Math.max(1, p.up.length) } })), ...[0, 1, 2, 3].map(k => ({ tag: "FromFoundation", value: k }))];
      if (i % 4 === 0) for (const f of froms) check(`deal ${n + 1} move ${i + 1}: moves_from ${JSON.stringify(f)}`, H.moves_from(g, f), C.moves_from(g, f));
      check(`deal ${n + 1} move ${i + 1}: won`, H.won(g), C.won(g));
      if (!ms.length || C.won(g)) break;
      const m = ms[Math.floor(draw() * ms.length)];
      const g1 = C.apply(g, m); check(`deal ${n + 1} move ${i + 1}: apply ${JSON.stringify(m)}`, H.apply(g, m), g1); g = g1;
    }
  }
  console.log(`${checked} answers compared at ${positions} positions of ${deals} deals, ${differ} differ`);
  const us = Array.from({ length: 52 }, draw), g = C.deal(us, 1);
  console.log(`a deal: hazeljs ${time(() => H.deal(us, 1), 10).toFixed(1)} ms, compiled ${time(() => C.deal(us, 1), 200).toFixed(3)} ms`);
  console.log(`all moves: hazeljs ${time(() => H.moves(g), 10).toFixed(1)} ms, compiled ${time(() => C.moves(g), 200).toFixed(3)} ms`);
  const m = C.moves(g)[0];
  console.log(`a move: hazeljs ${time(() => H.apply(g, m), 10).toFixed(1)} ms, compiled ${time(() => C.apply(g, m), 200).toFixed(3)} ms`);
} else if (APP === "i-ching") {
  for (const tag of ["Coins", "Yarrow"]) for (let i = 0; i < 2000; i++) { const u = [draw(), draw(), draw()]; check(`${tag} ${u}`, H.cast({ tag }, ...u), C.cast({ tag }, ...u)); }
  const TAGS = ["YoungYin", "YoungYang", "OldYin", "OldYang"];
  for (let k = 0; k < 4096; k++) { const ls = [0, 1, 2, 3, 4, 5].map(i => ({ tag: TAGS[(k >> (2 * i)) & 3] })); check(`reading ${k}`, H.reading(ls), C.reading(ls)); }
  for (let n = 0; n < 6; n++) { const ls = Array.from({ length: n }, (_, i) => ({ tag: TAGS[i % 4] })); check(`reading of ${n}`, H.reading(ls), C.reading(ls)); }
  console.log(`${checked} answers compared, ${differ} differ`);
  const six = [0, 1, 2, 3, 4, 5].map(i => ({ tag: TAGS[i % 4] }));
  for (const [name, f] of [["a cast by coins", e => e.cast({ tag: "Coins" }, 0.3, 0.6, 0.1)], ["a cast by yarrow", e => e.cast({ tag: "Yarrow" }, 0.3, 0.6, 0.1)], ["a reading", e => e.reading(six)]])
    console.log(`${name}: hazeljs ${time(() => f(H), 50).toFixed(3)} ms, compiled ${time(() => f(C), 2000).toFixed(4)} ms`);
} else {
  const spreads = [{ tag: "One" }, { tag: "CelticCross" }, { tag: "Relationship" }, { tag: "Choice", value: 2 }, { tag: "Choice", value: 3 },
    ...["PastPresentFuture", "SituationChallengeAdvice", "MindBodySpirit"].map(t => ({ tag: "Three", value: { tag: t } })),
    ...Array.from({ length: 12 }, (_, m) => [true, false].map(theme => ({ tag: "YearAhead", value: { start: m, theme } }))).flat()];
  for (const s of spreads) for (let i = 0; i < 100; i++) for (const rev of [true, false]) {
    const us = Array.from({ length: 40 }, draw);
    check(`${JSON.stringify(s)} ${rev}`, H.deal(s, us, rev), C.deal(s, us, rev));
  }
  console.log(`${checked} deals compared (${spreads.length} spreads), ${differ} differ`);
  const us = Array.from({ length: 40 }, draw);
  for (const s of [{ tag: "One" }, { tag: "CelticCross" }, { tag: "YearAhead", value: { start: 10, theme: true } }])
    console.log(`a deal, ${s.tag}: hazeljs ${time(() => H.deal(s, us, true), 20).toFixed(2)} ms, compiled ${time(() => C.deal(s, us, true), 2000).toFixed(4)} ms`);
}
process.exit(differ ? 1 : 0);

// ---- astrology: each chart built by hazeljs with the reading as its last line, as the page does, against compiled.js
function astrology() {
  const N = Number(process.argv[3] || 40);
  // (called before the shared helpers below are defined, so its own)
  const med = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const time = (f, n) => { const ts = []; for (let i = 0; i < n; i++) { const t = performance.now(); f(); ts.push(performance.now() - t); } return med(ts); };
  const spec = { preamble: read("preamble.hz"), modules: SETUP.modules.map(name => ({ name, text: read(name + ".hz") })) };
  let seed = 5; const u = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const six = x => Number((x < 0 ? "-" : "") + Math.abs(x).toFixed(6));
  const moment = t => { const d = new Date(t); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: six(d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600) }; };
  const lit = m => `(year = ${m.year}, month = ${m.month}, day = ${m.day}, hour = ${m.hour.toFixed(6)})`;
  const lo = Date.UTC(1900, 0, 1), hi = Date.UTC(2099, 11, 31);
  // the app's own birth first, then drawn ones
  const charts = [{ birth: Date.UTC(2026, 10, 17, 18, 3, 51), lat: 40.046313, lon: -105.286695, day: Date.UTC(2026, 10, 18, 12) }];
  while (charts.length < N) charts.push({ birth: lo + u() * (hi - lo), lat: six(-60 + 120 * u()), lon: six(-180 + 360 * u()), day: lo + u() * (hi - lo) });
  let worst = 0, checked = 0, differ = 0;
  const cmp = (x, y, path) => {
    if (typeof x === "number" && typeof y === "number") { const d = Math.abs(x - y) / Math.max(1, Math.abs(x)); worst = Math.max(worst, d); return d <= 1e-9 ? null : `${path}: ${x} against ${y}`; }
    if (Array.isArray(x) && Array.isArray(y)) { if (x.length !== y.length) return `${path}: ${x.length} items against ${y.length}`; for (let i = 0; i < x.length; i++) { const e = cmp(x[i], y[i], `${path}[${i}]`); if (e) return e; } return null; }
    if (x && y && typeof x === "object" && typeof y === "object") { const ks = Object.keys(x); if (ks.join() !== Object.keys(y).join()) return `${path}: fields ${ks} against ${Object.keys(y)}`; for (const k of ks) { const e = cmp(x[k], y[k], `${path}.${k}`); if (e) return e; } return null; }
    return x === y ? null : `${path}: ${JSON.stringify(x)} against ${JSON.stringify(y)}`;
  };
  const th = [], tc = [];
  for (const c of charts) {
    const b = moment(c.birth), t = moment(c.day), site = { latitude: c.lat, longitude: c.lon };
    let t0 = performance.now();
    const r = Hazel.runProgram({ ...spec, tail: `Reading.reading(${lit(b)}, (latitude = ${c.lat.toFixed(6)}, longitude = ${c.lon.toFixed(6)}), ${lit(t)})` });
    th.push(performance.now() - t0);
    t0 = performance.now();
    const v = C.reading(b, site, t);
    tc.push(performance.now() - t0);
    checked++;
    const e = !r.ok ? "hazeljs did not build it: " + JSON.stringify(r.errors).slice(0, 300) : cmp(r.value, v, "reading");
    if (e) { differ++; if (differ <= 5) console.log("DIFFERS", JSON.stringify(c), e); }
  }
  console.log(`${checked} readings compared, ${differ} differ; the largest relative difference in a number ${worst.toExponential(1)}`);
  const c0 = charts[0], b0 = moment(c0.birth), t0m = moment(c0.day);
  console.log(`a chart: hazeljs, built and cast, median ${med(th).toFixed(0)} ms; compiled, cast, median ${med(tc).toFixed(2)} ms (the first ${tc[0].toFixed(1)} ms), ` +
              `${time(() => C.reading(b0, { latitude: c0.lat, longitude: c0.lon }, t0m), 200).toFixed(3)} ms warm`);
  process.exit(differ ? 1 : 0);
}
