// hazeljs-examples, Minesweeper in Node: the same Hazel modules as the page (minesweeper/rules/*.hz), run through hazeljs. It
// lays the mines for a first tap and checks them (as many as asked, none in the tap's 3 by 3, every count right), opens the
// tap's region, plays a board to the end by opening every safe cell, loses one on a mine, flags and chords, and times it all.
//
//   npm install && npm run minesweeper
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../minesweeper/rules/" + path, import.meta.url), "utf8").replace(/\s+$/, "");
const MODULES = ["Board", "Play"];
const TAIL = "(fresh = Board.fresh, lay = Board.lay_mines, reveal = Play.reveal, flag = Play.flag, chord = Play.chord, flags = Play.flags)";
const spec = { preamble: read("preamble.hz"), modules: MODULES.map(name => ({ name, text: read(name + ".hz") })), tail: TAIL };
const t0 = performance.now();
const r = Hazel.runProgram(spec);
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, r.errors.map(e => `${e.module}: ${e.message.replace(/\s+/g, " ")}`));
if (!r.ok) process.exit(1);
const H = r.value;
let seed = Number(process.argv[2] || 7); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const time = f => { const t = performance.now(); const v = f(); return [performance.now() - t, v]; };
const cells = g => g.grid.flat();
const fail = m => { console.log("FAIL:", m); process.exitCode = 1; };
for (const [name, rows, cols, mines] of [["beginner", 9, 9, 10], ["intermediate", 16, 16, 40], ["expert", 16, 30, 99]]) {
  const r0 = Math.floor(rows / 2), c0 = Math.floor(cols / 3);
  const [tFresh, f] = time(() => H.fresh(rows, cols, mines));
  if (f.grid.length !== rows || f.grid[0].length !== cols || cells(f).some(c => c.open || c.mine)) fail(`${name}: fresh board wrong`);
  const [tLay, g0] = time(() => H.lay(rows, cols, mines, Array.from({ length: rows * cols }, rnd), r0, c0));
  const mineAt = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols && g0.grid[r][c].mine;
  const n = cells(g0).filter(c => c.mine).length;
  if (n !== mines) fail(`${name}: ${n} mines, not ${mines}`);
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (mineAt(r0 + dr, c0 + dc)) fail(`${name}: a mine beside the first tap`);
  let wrong = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let k = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && mineAt(r + dr, c + dc)) k++;
    if (g0.grid[r][c].near !== k) wrong++;
  }
  if (wrong) fail(`${name}: ${wrong} counts wrong`);
  const [tFirst, g1] = time(() => H.reveal(g0, r0, c0));
  const opened = cells(g1).filter(c => c.open).length;
  // the region opened: every open zero's neighbours are open (a fixpoint), and no mine is open
  let unflooded = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = g1.grid[r][c]; if (x.open && x.near === 0) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const y = g1.grid[r + dr] && g1.grid[r + dr][c + dc]; if (y && !y.open) unflooded++; } }
  if (unflooded) fail(`${name}: ${unflooded} cells left closed beside an open zero`);
  if (cells(g1).some(c => c.open && c.mine)) fail(`${name}: a mine opened by the first tap`);
  if (g1.left !== rows * cols - mines - opened) fail(`${name}: left ${g1.left}, expected ${rows * cols - mines - opened}`);
  // play to the end: open every safe cell still closed
  let g = g1; const reveals = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!g.grid[r][c].open && !g.grid[r][c].mine) { const [t, g2] = time(() => H.reveal(g, r, c)); reveals.push(t); g = g2; }
  if (!g.won || !g.over || g.left !== 0) fail(`${name}: not won after every safe cell (won ${g.won}, left ${g.left})`);
  if (H.flags(g) !== mines) fail(`${name}: a won board has ${H.flags(g)} flags, not ${mines}`);
  // lose: a mine opened
  let mr = -1, mc = -1; for (let r = 0; r < rows && mr < 0; r++) for (let c = 0; c < cols; c++) if (g1.grid[r][c].mine) { mr = r; mc = c; break; }
  const lost = H.reveal(g1, mr, mc);
  if (!lost.over || lost.won || lost.boom !== mr * cols + mc || cells(lost).filter(c => c.open && c.mine).length !== mines) fail(`${name}: losing went wrong`);
  // flag a closed cell, and take it off; a chord around a number whose mines are flagged
  const fl = H.flag(g1, mr, mc);
  if (!fl.grid[mr][mc].flag || H.flag(fl, mr, mc).grid[mr][mc].flag) fail(`${name}: flag on and off`);
  let chordOk = null;
  outer: for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = g1.grid[r][c]; if (!x.open || x.near === 0) continue;
    let gg = g1, closedSafe = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const y = g1.grid[r + dr] && g1.grid[r + dr][c + dc]; if (!y || (!dr && !dc)) continue; if (y.mine) gg = H.flag(gg, r + dr, c + dc); else if (!y.open) closedSafe++; }
    if (!closedSafe) continue;
    const ch = H.chord(gg, r, c);
    chordOk = !ch.over || ch.won; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const y = ch.grid[r + dr] && ch.grid[r + dr][c + dc]; if (y && !y.mine && !y.open) chordOk = false; }
    break outer;
  }
  if (chordOk === false) fail(`${name}: a chord left a safe neighbour closed, or lost`);
  const med = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)].toFixed(1) : "-"; };
  console.log(`${name} ${rows}x${cols}, ${mines} mines: ok; first tap opened ${opened}; ms: fresh ${tFresh.toFixed(0)}, lay ${tLay.toFixed(0)}, first tap ${tFirst.toFixed(0)}, a reveal (median of ${reveals.length}) ${med(reveals)}, the slowest ${Math.max(...reveals).toFixed(0)}; chord ${chordOk === null ? "not tried" : "ok"}`);
}
