// hazeljs-examples, Minesweeper's 💡 hint in Node: the same Hazel modules as the page (minesweeper/rules/*.hz), run through
// hazeljs. It plays boards by hints alone, from the first tap, and checks every hint against the mines it was not shown: a cell
// called safe is no mine, a mine is a mine, a flag called wrong is on a safe cell, and the number given as the reason is open.
// One wrong flag is planted on each board, to see the hint find it. A board ends won, or where no single number shows a sure move.
//
//   npm install && npm run minesweeper-hint [-- seed] [-- hints per board, 40 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../minesweeper/rules/" + path, import.meta.url), "utf8").replace(/\s+$/, "");
const MODULES = ["Board", "Play", "Hint"];
const TAIL = "(fresh = Board.fresh, lay = Board.lay_mines, reveal = Play.reveal, flag = Play.flag, chord = Play.chord, flags = Play.flags, sure = Hint.sure)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: MODULES.map(name => ({ name, text: read(name + ".hz") })), tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, r.errors.map(e => `${e.module}: ${e.message.replace(/\s+/g, " ")}`));
if (!r.ok) process.exit(1);
const H = r.value;
let seed = Number(process.argv[2] || 11); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const MAX = Number(process.argv[3] || 40);
const fail = m => { console.log("FAIL:", m); process.exitCode = 1; };
for (const [name, rows, cols, mines, boards] of [["beginner", 9, 9, 10, 3], ["intermediate", 16, 16, 40, 1], ["expert", 16, 30, 99, 1]]) {
  let hints = 0, won = 0, guess = 0, planted = 0, found = 0; const ms = [];
  for (let n = 0; n < boards; n++) {
    const r0 = Math.floor(rows / 2), c0 = Math.floor(cols / 2);
    let g = H.reveal(H.lay(rows, cols, mines, Array.from({ length: rows * cols }, rnd), r0, c0), r0, c0);
    // one wrong flag: on a closed cell with no mine
    outer: for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = g.grid[r][c]; if (!x.open && !x.mine) { g = H.flag(g, r, c); planted++; break outer; } }
    for (let i = 0; i < MAX && !g.over; i++) {
      const t = performance.now(); const h = H.sure(g); ms.push(performance.now() - t); hints++;
      if (h.kind === 0) { guess++; break; }
      const at = g.grid[Math.floor(h.at / cols)][h.at % cols], why = g.grid[Math.floor(h.why / cols)][h.why % cols];
      if (!why.open || why.mine) fail(`${name}: the reason given, place ${h.why}, is not an open number`);
      if (h.kind === 1) { if (at.mine || at.open || at.flag) fail(`${name}: place ${h.at} called safe to open`); g = H.reveal(g, Math.floor(h.at / cols), h.at % cols); }
      else if (h.kind === 2) { if (!at.mine || at.flag) fail(`${name}: place ${h.at} called a mine to flag`); g = H.flag(g, Math.floor(h.at / cols), h.at % cols); }
      else if (h.kind === 3) { if (at.mine || !at.flag) fail(`${name}: place ${h.at} called a wrong flag`); found++; g = H.flag(g, Math.floor(h.at / cols), h.at % cols); }
      else fail(`${name}: a hint of kind ${h.kind}`);
    }
    if (g.over && !g.won) fail(`${name}: a board lost, playing by hints alone`);
    if (g.over && g.won) won++;
  }
  ms.sort((a, b) => a - b);
  console.log(`${name} ${rows}x${cols}, ${mines} mines: ${boards} board${boards > 1 ? "s" : ""}, ${hints} hints, all right so far; won by hints alone ${won}, ended at a guess ${guess}, wrong flags found ${found} of ${planted}; a hint ${ms[ms.length >> 1].toFixed(0)} ms (median), the slowest ${ms[ms.length - 1].toFixed(0)}`);
}
