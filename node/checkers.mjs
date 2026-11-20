// hazeljs-examples, Checkers in Node: the same Hazel module as the page (checkers/rules/Checkers.hz), run through hazeljs. It
// plays games of random legal moves and checks Hazel's moves at every position against a move generator written here in
// JavaScript (steps, compulsory jumps that go on while they can, crowning that stops a man): the same moves, no more, no fewer.
// Then it times Hazel's choice of move, looking 1 to 4 moves ahead, and plays Hazel against random moves.
//
//   npm install && npm run checkers [-- seed] [-- games, 3 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../checkers/rules/" + path, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(start = Checkers.start, moves = Checkers.moves, apply = Checkers.apply, choose = Checkers.choose)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Checkers", text: read("Checkers.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, r.errors.map(e => `${e.module}: ${e.message.replace(/\s+/g, " ")}`).join(" | ").slice(0, 900));
if (!r.ok) process.exit(1);
const C = r.value;
let seed = Number(process.argv[2] || 9); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const GAMES = Number(process.argv[3] || 3);
const fail = m => { console.log("FAIL:", m); process.exitCode = 1; };
// ---- the reference, in JavaScript: squares 0-31 row by row from the top left
const has = (b, k) => Math.floor(b / 2 ** k) % 2 === 1;
const step = (s, dr, dc) => { const r = Math.floor(s / 4), c = 2 * (s % 4) + (r % 2 === 0 ? 1 : 0), r2 = r + dr, c2 = c + dc; return r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7 ? -1 : r2 * 4 + (c2 >> 1); };
const dirs = (who, king) => king ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : who === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
const crowns = (who, s) => who === 1 ? s < 4 : s >= 28;
function refMoves(g) {
  if (g.over) return [];
  const who = g.turn, mine = who === 1 ? g.black : g.white, them = who === 1 ? g.white : g.black, all = g.black + g.white;
  const caps = [], steps = [];
  for (let s = 0; s < 32; s++) if (has(mine, s)) {
    const king = has(g.kings, s), allLess = all - 2 ** s;
    const go = (at, path, took) => {
      let more = false;
      for (const [dr, dc] of dirs(who, king)) {
        const over = step(at, dr, dc), land = step(at, 2 * dr, 2 * dc);
        if (over < 0 || land < 0 || !has(them, over) || took.includes(over) || has(allLess, land)) continue;
        more = true;
        if (!king && crowns(who, land)) caps.push({ from: s, path: [...path, land], took: [...took, over] });
        else go(land, [...path, land], [...took, over]);
      }
      if (!more && path.length) caps.push({ from: s, path, took });
    };
    go(s, [], []);
    for (const [dr, dc] of dirs(who, king)) { const t = step(s, dr, dc); if (t >= 0 && !has(all, t)) steps.push({ from: s, path: [t], took: [] }); }
  }
  return caps.length ? caps : steps;
}
const key = m => `${m.from}>${m.path.join(",")}x${m.took.join(",")}`;
const same = (a, b) => { const x = a.map(key).sort(), y = b.map(key).sort(); return x.length === y.length && x.every((k, i) => k === y[i]); };
// ---- random games, every position checked
let positions = 0, jumps = 0, multi = 0, crowned = 0;
for (let n = 0; n < GAMES; n++) {
  let g = C.start;
  for (let i = 0; i < 200 && !g.over; i++) {
    const hm = C.moves(g), rm = refMoves(g); positions++;
    if (!same(hm, rm)) { fail(`game ${n + 1}, move ${i + 1}: Hazel's moves ${hm.map(key).sort().join(" ")} | the reference's ${rm.map(key).sort().join(" ")}`); break; }
    const m = hm[Math.floor(rnd() * hm.length)];
    if (m.took.length) jumps++; if (m.took.length > 1) multi++;
    const g2 = C.apply(g, m);
    if (!has(g.kings, m.from) && has(g2.kings, m.path[m.path.length - 1])) crowned++;
    g = g2;
  }
  if (g.over && refMoves({ ...g, over: false }).length && g.quiet < 80) fail(`game ${n + 1}: over with moves left`);
}
console.log(`${GAMES} random games: ${positions} positions, Hazel's moves the same as the reference's at each; ${jumps} jumps (${multi} of more than one), ${crowned} crowned`);
// ---- Hazel's choice of move: its time, looking 1 to 4 moves ahead, from a position 8 moves in
let g = C.start; for (let i = 0; i < 8; i++) { const ms = C.moves(g); g = C.apply(g, ms[Math.floor(rnd() * ms.length)]); }
const rs = () => Array.from({ length: 40 }, () => Math.floor(rnd() * 20));
for (const d of [1, 2, 3, 4]) { const t = performance.now(); const m = C.choose(g, d, rs()); console.log(`looking ${d} ahead: ${key(m)} in ${(performance.now() - t).toFixed(0)} ms`); }
// ---- Hazel (looking 3 ahead) against random moves
const D = Number(process.env.DEPTH || 3);
let won = 0, lost = 0, drawn = 0; const ts = [];
for (let n = 0; n < 1; n++) {
  let g = C.start;
  for (let i = 0; i < 300 && !g.over; i++) {
    if (g.turn === 1) { const ms = C.moves(g); g = C.apply(g, ms[Math.floor(rnd() * ms.length)]); }
    else { const t = performance.now(); const m = C.choose(g, D, rs()); ts.push(performance.now() - t); g = C.apply(g, m); }
  }
  if (g.winner === 2) won++; else if (g.winner === 1) lost++; else drawn++;
}
ts.sort((a, b) => a - b);
console.log(`Hazel looking ${D} ahead against random moves: won ${won}, lost ${lost}, drawn or unfinished ${drawn}; a move ${ts[ts.length >> 1].toFixed(0)} ms (median), the slowest ${ts[ts.length - 1].toFixed(0)}`);
