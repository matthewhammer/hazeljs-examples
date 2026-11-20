// hazeljs-examples, Go in Node: the same Hazel module as the page (go/rules/Go.hz), run through hazeljs. It plays games of
// Hazel's opponent against random legal moves and checks each position: no group on the board without a liberty, the stones
// on the board plus those taken equal the stones played, a ko point is empty and not playable, and the score covers every
// point once. It also checks a capture, a suicide refused, and a ko by hand, and times Hazel's choice of move.
//
//   npm install && npm run go [-- seed] [-- moves per game, 30 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../go/rules/" + path, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(fresh = Go.fresh, play = Go.play, pass = Go.pass, score = Go.score, choose = Go.choose)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Go", text: read("Go.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, r.errors.map(e => `${e.module}: ${e.message.replace(/\s+/g, " ")}`));
if (!r.ok) process.exit(1);
const G = r.value;
let seed = Number(process.argv[2] || 3); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const MOVES = Number(process.argv[3] || 30);
const fail = m => { console.log("FAIL:", m); process.exitCode = 1; };
const at = (g, p) => g.board[Math.floor(p / g.size)][p % g.size];
const beside = (n, p) => [p - n, p + n, p % n ? p - 1 : -1, p % n < n - 1 ? p + 1 : -1].filter(q => q >= 0 && q < n * n);
// every group on the board has a liberty
function checkGroups(g, where) {
  const n = g.size, seen = new Set();
  for (let p = 0; p < n * n; p++) {
    const s = at(g, p); if (!s || seen.has(p)) continue;
    const todo = [p]; let libs = 0; seen.add(p);
    while (todo.length) { const q = todo.pop(); for (const x of beside(n, q)) { const t = at(g, x); if (!t) libs++; else if (t === s && !seen.has(x)) { seen.add(x); todo.push(x); } } }
    if (!libs) fail(`${where}: a group at ${p} has no liberty`);
  }
}
// by hand: a capture, a suicide refused, a ko
{
  let g = G.fresh(5);
  for (const p of [1, 0, 5]) g = G.play(g, p);              // black 1, white 0 (corner), black 5: white 0 has no liberty and is taken
  if (at(g, 0) !== 0 || g.black_took !== 1) fail("a corner stone not taken");
  const s = G.play(g, 0); if (s.turn !== g.turn) fail("a suicide allowed");   // white into the corner, beside black 1 and 5: no liberty, takes nothing
  // a ko, on a 5 by 5 (a point is row * 5 + column): black at 1, 5, 11; white at 2, 6, 12, 8; black at 7 takes white's 6, and
  // white may not take back at 6 at once; after a move each elsewhere it may, and takes black's 7
  let k = G.fresh(5);
  for (const p of [1, 2, 5, 6, 11, 12, 24, 8, 7]) k = G.play(k, p);
  if (at(k, 6) !== 0 || k.black_took !== 1 || k.ko !== 6) fail(`the ko not set up: ko ${k.ko}, black took ${k.black_took}`);
  if (G.play(k, 6).turn !== k.turn) fail("a ko taken back at once");
  for (const p of [20, 21]) k = G.play(k, p);
  const back = G.play(k, 6);
  if (back.turn === k.turn || at(back, 7) !== 0 || back.white_took !== 1 || back.ko !== 7) fail("the ko not taken back after a move elsewhere");
  console.log("by hand: a capture, a suicide refused, a ko held and then taken back: checked");
}
for (const n of [7, 9]) {
  let g = G.fresh(n), played = 0, kos = 0; const ms = [];
  for (let i = 0; i < MOVES && !g.over; i++) {
    // black: a random legal move
    let ok = false;
    for (let k = 0; k < 60 && !ok; k++) { const q = Math.floor(rnd() * n * n); const g2 = G.play(g, q); if (g2.turn !== g.turn) { g = g2; played++; ok = true; } }
    if (!ok) g = G.pass(g);
    checkGroups(g, `${n}x${n} move ${i + 1} (black)`);
    if (g.over) break;
    const rs = Array.from({ length: n * n }, () => Math.floor(rnd() * 20));
    const t = performance.now(); const w = G.choose(g, rs); ms.push(performance.now() - t);
    if (w >= 0) { const g2 = G.play(g, w); if (g2.turn === g.turn) fail(`${n}x${n}: Hazel chose ${w}, not allowed`); g = g2; played++; } else g = G.pass(g);
    checkGroups(g, `${n}x${n} move ${i + 1} (white)`);
    if (g.ko >= 0) { kos++; if (at(g, g.ko)) fail(`${n}x${n}: the ko point ${g.ko} has a stone`); if (G.play(g, g.ko).turn !== g.turn) fail(`${n}x${n}: a ko taken back at once`); }
    const stones = g.board.flat().filter(Boolean).length;
    if (stones + g.black_took + g.white_took !== played) fail(`${n}x${n} move ${i + 1}: ${stones} on the board + ${g.black_took + g.white_took} taken, not ${played} played`);
  }
  const s = G.score(g), counts = [0, 0, 0]; s.owners.forEach(o => counts[o]++);
  if (s.owners.length !== n * n || counts[1] !== s.black || counts[2] !== s.white) fail(`${n}x${n}: the score does not cover the board`);
  ms.sort((a, b) => a - b);
  console.log(`${n}x${n}: ${played} stones played, taken: black ${g.black_took}, white ${g.white_took}; kos ${kos}; score black ${s.black}, white ${s.white} + ${s.komi}; Hazel's move ${ms[ms.length >> 1].toFixed(0)} ms (median), the slowest ${ms[ms.length - 1].toFixed(0)}`);
}
