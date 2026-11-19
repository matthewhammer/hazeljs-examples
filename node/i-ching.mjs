// hazeljs-examples, the I Ching in Node: the same Hazel modules as the page (i-ching/rules/*.hz), run through hazeljs. It casts
// lines by coins and by yarrow, checks the odds of each over many casts, checks the hexagram table against the trigrams, and
// reads a few readings, with what each call costs.
//
//   npm install && npm run i-ching
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../i-ching/rules/" + path, import.meta.url), "utf8").replace(/\s+$/, "");
export const MODULES = ["Lines", "Casting", "Book", "Reading"];
export const TAIL = "(cast = Casting.cast, reading = Reading.reading, trigrams = Book.trigrams)";
const spec = { preamble: read("preamble.hz"), modules: MODULES.map(name => ({ name, text: read(name + ".hz") })), tail: TAIL };

const t0 = performance.now();
const r = Hazel.runProgram(spec);
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, r.errors.map(e => `${e.module}: ${e.message.replace(/\s+/g, " ")}`));
if (!r.ok) process.exit(1);
const { cast, reading } = r.value;

// a deterministic stream of draws, so a run can be repeated
let seed = 7; const draw = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (const m of ["Coins", "Yarrow"]) {
  const n = 4000, counts = { 6: 0, 7: 0, 8: 0, 9: 0 }, t1 = performance.now();
  for (let i = 0; i < n; i++) counts[cast({ tag: m }, draw(), draw(), draw()).value]++;
  const ms = (performance.now() - t1) / n;
  console.log(m.padEnd(6), Object.entries(counts).map(([v, k]) => `${v}: ${(k / n * 16).toFixed(2)}/16`).join("  "), `(${ms.toFixed(2)} ms a cast)`);
}
console.log("one yarrow cast:", JSON.stringify(cast({ tag: "Yarrow" }, 0.3, 0.6, 0.1)));
console.log("one coin cast:", JSON.stringify(cast({ tag: "Coins" }, 0.3, 0.6, 0.1)));

// the table: every number 1..64 once, and a few hexagrams known by their lines (bottom first, 1 yang)
const L = b => ({ tag: b ? "YoungYang" : "YoungYin" });
const seen = new Set();
for (let k = 0; k < 64; k++) seen.add(reading([0, 1, 2, 3, 4, 5].map(i => L((k >> i) & 1))).primary.number);
console.log("all 64 numbers:", seen.size === 64 && [...seen].every(x => x >= 1 && x <= 64));
const known = { 1: [1,1,1,1,1,1], 2: [0,0,0,0,0,0], 11: [1,1,1,0,0,0], 12: [0,0,0,1,1,1], 63: [1,0,1,0,1,0], 64: [0,1,0,1,0,1],
  3: [1,0,0,0,1,0], 4: [0,1,0,0,0,1], 29: [0,1,0,0,1,0], 30: [1,0,1,1,0,1], 51: [1,0,0,1,0,0], 52: [0,0,1,0,0,1], 61: [1,1,0,0,1,1], 62: [0,0,1,1,0,0] };
for (const [k, ls] of Object.entries(known)) {
  const got = reading(ls.map(L)).primary;
  if (got.number !== +k) console.log("WRONG:", k, "got", JSON.stringify(got));
}
console.log("known hexagrams checked");
// a reading with changing lines: old yang at the bottom of Qian turns it into Gou (44)
const rd = reading([{ tag: "OldYang" }, L(1), L(1), L(1), L(1), L(1)]);
console.log(JSON.stringify(rd));
console.log("three lines:", JSON.stringify(reading([L(1), L(0), L(0)])));
console.log("none:", JSON.stringify(reading([])));
