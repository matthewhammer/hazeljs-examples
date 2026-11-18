// hazeljs-oracles: an oracle compiled ahead of time (<app>/compiled.js, tools/make-compiled.py) against the same rules run
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
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";

const APP = process.argv[2] || "i-ching";
const SETUP = {
  "i-ching": { modules: ["Lines", "Casting", "Book", "Reading"], tail: "(cast = Casting.cast, reading = Reading.reading)" },
  "tarot": { modules: ["Deck", "Spreads", "Reading"], tail: "(deal = Reading.deal)" },
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

if (APP === "i-ching") {
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
