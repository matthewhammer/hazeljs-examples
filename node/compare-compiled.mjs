// hazeljs-oracles: an oracle compiled ahead of time (<app>/compiled.js, tools/make-compiled.py) against the same rules run
// by hazeljs. The I Ching: many casts by coins and by yarrow, every one of the 64 hexagrams with each set of changing lines,
// and readings of fewer than six lines. The Tarot: every spread (the year ahead from each month, with and without its
// theme), many shuffles each, with reversals and without. Then what each costs.
//
//   node node/compare-compiled.mjs i-ching
//   node node/compare-compiled.mjs tarot
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";

const APP = process.argv[2] || "i-ching";
const SETUP = {
  "i-ching": { modules: ["Lines", "Casting", "Book", "Reading"], tail: "(cast = Casting.cast, reading = Reading.reading)" },
  "tarot": { modules: ["Deck", "Spreads", "Reading"], tail: "(deal = Reading.deal)" },
}[APP];
// (compiled.js is a classic script for the page; the package is "type": "module", so it is run here as one)
const box = { exports: {} };
new Function("module", "window", readFileSync(new URL(`../${APP}/compiled.js`, import.meta.url), "utf8"))(box, undefined);
const C = box.exports;
const read = path => readFileSync(new URL(`../${APP}/rules/` + path, import.meta.url), "utf8").replace(/\s+$/, "");
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
