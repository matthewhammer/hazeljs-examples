// hazeljs-examples, Mahjong solitaire: how often Hazel's own play (its best pair, a shuffle when none is free) clears each
// layout, by the compiled rules (mahjong-solitaire/compiled.js): wins with no shuffle, with shuffles, and the time a choice takes.
//   node node/mahjong-solitaire-robot.mjs [deals a layout, 20]
import { readFileSync } from "node:fs";
const box = { exports: {} }; new Function("module", "window", readFileSync(new URL("../mahjong-solitaire/compiled.js", import.meta.url), "utf8"))(box, undefined);
const C = box.exports, N = Number(process.argv[2] || 20), NAMES = ["turtle", "pyramid", "fortress"];
for (let k = 0; k < 3; k++) {
  let clean = 0, shuffled = 0, lost = 0, shuffles = 0, ms = 0, choices = 0, dealMs = 0;
  for (let n = 0; n < N; n++) {
    let t0 = performance.now(), g = C.deal(k, 7 + 1009 * n + k); dealMs += performance.now() - t0; let sh = 0;
    for (let move = 0; move < 400 && !C.won(g); move++) {
      t0 = performance.now(); const p = C.best(g); ms += performance.now() - t0; choices++;
      if (p.a < 0) { if (sh >= 10) break; g = C.shuffle(g, 99 + move); sh++; continue; }
      g = C.take(g, p.a, p.b);
    }
    if (C.won(g)) { if (sh) shuffled++; else clean++; } else lost++; shuffles += sh;
  }
  // (then a person-like start: twenty pairs taken at random from those free, not Hazel's, and Hazel's play from there)
  let after = 0, afterSh = 0; let seed = 5;
  for (let n = 0; n < N; n++) { let g = C.deal(k, 31 + 977 * n + k), sh = 0;
    for (let m = 0; m < 20; m++) { const ps = C.pairs(g); if (!ps.length) break; seed = seed * 16807 % 2147483647; const p = ps[seed % ps.length]; g = C.take(g, p.a, p.b); }
    for (let move = 0; move < 400 && !C.won(g); move++) { const p = C.best(g); if (p.a < 0) { if (sh >= 10) break; g = C.shuffle(g, 77 + move); sh++; continue; } g = C.take(g, p.a, p.b); }
    if (C.won(g)) { after++; afterSh += sh; } }
  console.log(`${NAMES[k]}: after 20 pairs at random, Hazel cleared ${after} of ${N} (${afterSh} shuffles)`);
  console.log(`${NAMES[k]}: ${N} deals, cleared ${clean} with no shuffle, ${shuffled} with shuffles (${shuffles} in all), ${lost} not; a deal ${(dealMs / N).toFixed(1)} ms, a choice ${(ms / choices).toFixed(2)} ms`);
}
