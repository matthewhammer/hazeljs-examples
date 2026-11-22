// hazeljs-examples, Bricks in Node (ticket 824): the same Hazel module as the page (bricks/rules/Bricks.hz), built by hazeljs. It
// builds the rules, lists each level's bricks, has the robot (Bricks.robot, the 🤖 player) play from a few levels, and checks
// a game: the ball stays in the field, the points only grow, the balls only fall; it counts the bricks broken and the levels
// cleared; then times a step and a robot's choice.
//   npm run bricks [-- games, 2 by default] [-- steps a game, 4000 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../bricks/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(start = Bricks.start, step = Bricks.step, layout = Bricks.layout, robot = Bricks.robot)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Bricks", text: read("Bricks.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 1500));
if (!r.ok) process.exit(1);
const B = r.value, GAMES = Number(process.argv[2] || 2), N = Number(process.argv[3] || 4000);
for (let l = 0; l < 6; l++) { const bs = B.layout(l); console.log(`level ${l}: ${bs.filter(b => b > 0 && b !== 9).length} bricks to break, ${bs.filter(b => b === 2).length} of them twice, ${bs.filter(b => b === 9).length} that never break`); }
let fail = 0; const bad = m => { fail++; if (fail < 10) console.log("FAIL:", m); };
const stepMs = [], robotMs = [];
for (let n0 = 0; n0 < GAMES; n0++) {
  let g = B.start(n0, false), broken = 0, levels = 0, lost = 0;
  for (let n = 0; n < N && !g.over; n++) {
    let t = performance.now(); const c = B.robot(g); robotMs.push(performance.now() - t);
    t = performance.now(); const g2 = B.step(g, c.target, c.launch); stepMs.push(performance.now() - t);
    if (g2.bx < 0 || g2.bx > 600000 || g2.by < 0) bad(`game ${n0} step ${n}: the ball at ${g2.bx}, ${g2.by}`);
    if (g2.score < g.score) bad(`game ${n0} step ${n}: the points went down`);
    if (g2.balls > g.balls) bad(`game ${n0} step ${n}: a ball came back`);
    if (g2.hit === 4) broken++; if (g2.hit === 6) levels++; if (g2.hit === 5) lost++;
    g = g2;
  }
  console.log(`game from level ${n0}: ${g.t} steps, ${g.score} points, ${broken} bricks broken, ${levels} levels cleared, ${lost} balls lost, now level ${g.level}${g.over ? ", over" : ""}`);
}
const med = a => { const s = [...a].sort((x, y) => x - y); return `${s[s.length >> 1].toFixed(2)} ms median, ${s[Math.floor(s.length * 0.9)].toFixed(2)} p90`; };
console.log(`a step: ${med(stepMs)}; the robot's choice: ${med(robotMs)}; ${fail} failures`);
