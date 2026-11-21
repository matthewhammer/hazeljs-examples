// hazeljs-examples, Mahjong solitaire in Node (ticket 803): the module (mahjong-solitaire/rules/MahjongSolitaire.hz) built by
// hazeljs; each layout dealt, its 144 tiles checked (every face, four of each, the flowers and seasons once), a pair taken,
// a shuffle; then Hazel's own choice played for a few moves; each timed.   npm run mahjong-solitaire [-- layouts, 3] [-- moves, 4]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../mahjong-solitaire/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(deal = MahjongSolitaire.deal, take = MahjongSolitaire.take, frees = MahjongSolitaire.free_places, pairs = MahjongSolitaire.pairs, best = MahjongSolitaire.best, shuffle = MahjongSolitaire.shuffle, places = MahjongSolitaire.layout, won = MahjongSolitaire.won)";
let t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "MahjongSolitaire", text: read("MahjongSolitaire.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 900));
if (!r.ok) process.exit(1);
const M = r.value, NL = Number(process.argv[2] || 3), MOVES = Number(process.argv[3] || 4);
let fail = 0; const bad = m => { fail++; console.log("FAIL:", m); };
const NAMES = ["turtle", "pyramid", "fortress"];
for (let k = 0; k < NL; k++) {
  t0 = performance.now(); const ps = M.places(k); const tp = performance.now() - t0;
  const key = new Set(ps.map(p => `${p.x},${p.y},${p.z}`)); if (ps.length !== 144) bad(`${NAMES[k]}: ${ps.length} places`); if (key.size !== ps.length) bad(`${NAMES[k]}: places twice`);
  t0 = performance.now(); let g = M.deal(k, 12345 + k); const td = performance.now() - t0;
  const faces = g => g.slots.map(s => s.face);
  const count = {}; for (const f of faces(g)) count[f] = (count[f] || 0) + 1;
  for (let f = 0; f < 34; f++) if (count[f] !== 4) bad(`${NAMES[k]}: face ${f} ${count[f] || 0} times`);
  for (let f = 34; f < 42; f++) if (count[f] !== 1) bad(`${NAMES[k]}: face ${f} ${count[f] || 0} times`);
  t0 = performance.now(); const fr = M.frees(g), pr = M.pairs(g); const tf = performance.now() - t0;
  console.log(`${NAMES[k]}: places ${tp.toFixed(0)} ms, deal ${td.toFixed(0)} ms, ${fr.length} free and ${pr.length} pairs (${tf.toFixed(0)} ms)`);
  for (let m = 0; m < MOVES; m++) { t0 = performance.now(); const p = M.best(g); const tb = performance.now() - t0; if (p.a < 0) { console.log("  no pair"); break; }
    const g2 = M.take(g, p.a, p.b); const gone = faces(g2).filter(t => t < 0).length; console.log(`  Hazel takes ${p.a} and ${p.b} (${faces(g)[p.a]}, ${faces(g)[p.b]}) in ${tb.toFixed(0)} ms: ${gone} taken`); if (gone !== 2 * (m + 1)) bad("take"); g = g2; }
  t0 = performance.now(); const g3 = M.shuffle(g, 999); const ts = performance.now() - t0;
  const same = faces(g).sort((a, b) => a - b).join() === faces(g3).sort((a, b) => a - b).join(), holes = faces(g).every((t, i) => (t < 0) === (faces(g3)[i] < 0));
  console.log(`  shuffle ${ts.toFixed(0)} ms: the same tiles ${same}, the same places ${holes}`); if (!same || !holes) bad("shuffle");
}
// Hazel's own play from a fresh deal, by its plan: it should clear the table with no shuffle
if (process.argv[4] !== "noplay") {
  t0 = performance.now(); let g = M.deal(0, 4242), moves = 0;
  while (!M.won(g) && moves < 80) { const p = M.best(g); if (p.a < 0) { bad(`stuck after ${moves} moves`); break; } const g2 = M.take(g, p.a, p.b); if (g2.slots.every((s, i) => s.face === g.slots[i].face)) { bad("a planned pair not taken"); break; } g = g2; moves++; }
  console.log(`Hazel's play on the turtle: ${M.won(g) ? "cleared" : "NOT cleared"} in ${moves} moves, ${((performance.now() - t0) / 1000).toFixed(0)} s; plan left ${g.plan.length}`);
  if (!M.won(g)) bad("not cleared");
}
console.log(`${fail} failures`);
// (0.0.42) a person's own pairs first (the free pairs taken at random), then Hazel's play: by the plan as repaired, with no shuffle
if (process.argv[4] !== "noplay") {
  let t0 = performance.now(), g = M.deal(0, 777), seed = 9, mine = 0;
  for (; mine < 12; mine++) { const ps = M.pairs(g); if (!ps.length) break; seed = seed * 16807 % 2147483647; const p = ps[seed % ps.length]; g = M.take(g, p.a, p.b); }
  let moves = 0, shuffles = 0;
  while (!M.won(g) && moves < 80) { const p = M.best(g); if (p.a < 0) { shuffles++; if (shuffles > 5) break; g = M.shuffle(g, 1000 + moves); continue; } g = M.take(g, p.a, p.b); moves++; }
  console.log(`after ${mine} pairs of a person's, Hazel ${M.won(g) ? "cleared" : "did NOT clear"} the turtle in ${moves} moves, ${shuffles} shuffles, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
}
