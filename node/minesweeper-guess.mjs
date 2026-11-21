// hazeljs-examples, Minesweeper's 🎲 guess in Node (ticket 809): the page's Hazel modules (minesweeper/rules/*.hz) run through
// hazeljs, Hazel playing by its sure moves (Hint.sure) and, when there are none, its pick (Guess.pick: the cell least likely to be
// a mine, by the numbers' odds). Checks that a pick called sure (risk 0) is never a mine, and counts the boards won.
//
//   node node/minesweeper-guess.mjs [boards, 3] [level: beginner, intermediate, expert]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../minesweeper/rules/" + path, import.meta.url), "utf8").replace(/\s+$/, "");
const MODULES = ["Board", "Play", "Hint", "Guess"];
const TAIL = "(fresh = Board.fresh, lay = Board.lay_mines, reveal = Play.reveal, flag = Play.flag, chord = Play.chord, flags = Play.flags, sure = Hint.sure, pick = Guess.pick)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: MODULES.map(name => ({ name, text: read(name + ".hz") })), tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 1500));
if (!r.ok) process.exit(1);
const H = r.value, N = Number(process.argv[2] || 3), LV = { beginner: [9, 9, 10], intermediate: [16, 16, 40], expert: [16, 30, 99] }[process.argv[3] || "beginner"];
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let won = 0, picks = 0, sure0 = 0, bad = 0, pickMs = 0;
for (let n = 0; n < N; n++) {
  const [rows, cols, mines] = LV, r0 = Math.floor(rows / 2), c0 = Math.floor(cols / 2);
  let g = H.reveal(H.lay(rows, cols, mines, Array.from({ length: rows * cols }, rnd), r0, c0), r0, c0);
  while (!g.over) {
    const m = H.sure(g);
    if (m.kind) { const rr = Math.floor(m.at / cols), cc = m.at % cols; g = m.kind === 1 ? H.reveal(g, rr, cc) : H.flag(g, rr, cc); continue; }
    const t = performance.now(), p = H.pick(g); pickMs += performance.now() - t; picks++;
    const rr = Math.floor(p.at / cols), cc = p.at % cols;
    if (p.at < 0 || g.grid[rr][cc].open || g.grid[rr][cc].flag) { console.log("FAIL: a pick not closed", p); bad++; break; }
    if (p.risk === 0) { sure0++; if (g.grid[rr][cc].mine) { console.log("FAIL: a pick called sure is a mine", p); bad++; } }
    g = H.reveal(g, rr, cc);
  }
  if (g.won) won++;
  console.log(`board ${n + 1}: ${g.won ? "won" : "lost"}`);
}
console.log(`won ${won} of ${N}; ${picks} picks (${sure0} sure), ${(pickMs / Math.max(1, picks)).toFixed(0)} ms a pick (interpreted); ${bad} failures`);
