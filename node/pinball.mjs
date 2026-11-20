// hazeljs-examples, Pinball in Node (ticket 793): the same Hazel module as the page (pinball/rules/Pinball.hz), built by
// hazeljs. It builds the rules, starts a game on each board and runs it a while with the flippers flapping now and then,
// checking that the ball stays on the board or drains, that the score only grows, and that a game ends; then times a step.
//   npm run pinball [-- boards, all 10 by default] [-- steps a board, 600 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../pinball/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(start = Pinball.start, step = Pinball.step, board = Pinball.board)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Pinball", text: read("Pinball.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 900));
if (!r.ok) process.exit(1);
const P = r.value, NB = Number(process.argv[2] || 10), N = Number(process.argv[3] || 600);
let fail = 0; const bad = m => { fail++; if (fail < 8) console.log("FAIL:", m); };
const times = [];
for (let i = 0; i < NB; i++) {
  const b = P.board(i); let g = P.start(i), lost = 0, hits = 0, maxY = 0;
  for (let n = 0; n < N && !g.over; n++) {
    const left = n % 50 < 8, right = n % 70 > 60;
    const t = performance.now(); const g2 = P.step(i, g, left, right, n % 97 === 5 ? 20 + (n * 37) % 80 : 0); times.push(performance.now() - t);
    if (g2.score < g.score) bad(`${b.name}: the score went down`);
    if (g2.balls < g.balls) lost++;
    if (g2.x < 0 || g2.x > 600000 || g2.y < 0) bad(`${b.name} step ${n}: the ball at ${g2.x}, ${g2.y}, off the board`);
    hits += g2.hits.length; maxY = Math.max(maxY, g2.y); g = g2;
  }
  console.log(`${b.name}: ${b.walls.length} walls, ${b.bumpers.length} bumpers, ${b.flippers.length} flippers, ${b.portals.length} portals; after ${N} steps score ${g.score}, balls lost ${lost}, bumper hits ${hits}, over ${g.over}`);
}
const s = [...times].sort((a, b) => a - b);
console.log(`a step: ${s[s.length >> 1].toFixed(1)} ms median, ${s[Math.floor(s.length * 0.9)].toFixed(1)} ms at p90 (${times.length} steps); ${fail} failures`);
