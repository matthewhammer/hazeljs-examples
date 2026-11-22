// hazeljs-examples, Star wave in Node (ticket 827): the same Hazel module as the page (starwave/rules/StarWave.hz), built by
// hazeljs. It builds the rules, has the robot (StarWave.robot, the 🤖 player) play a game, and checks it: the cannon stays on
// the field, the points only grow, the lives only fall, the invaders only thin within a wave; it counts the invaders hit, the
// lives lost and the waves cleared; then times a step and a robot's choice.
//   npm run starwave [-- steps, 3000 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../starwave/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(start = StarWave.start, step = StarWave.step, robot = StarWave.robot)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "StarWave", text: read("StarWave.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 1500));
if (!r.ok) process.exit(1);
const SW = r.value, N = Number(process.argv[2] || 3000);
let fail = 0; const bad = m => { fail++; if (fail < 10) console.log("FAIL:", m); };
const stepMs = [], robotMs = [];
let g = SW.start(42); const seen = { hits: 0, lost: 0, waves: 0, shots: 0 };
for (let n = 0; n < N && !g.over; n++) {
  let t = performance.now(); const c = SW.robot(g); robotMs.push(performance.now() - t);
  t = performance.now(); const g2 = SW.step(g, c.move, c.fire); stepMs.push(performance.now() - t);
  if (g2.cx < 30 || g2.cx > 570) bad(`step ${n}: the cannon at ${g2.cx}`);
  if (g2.score < g.score) bad(`step ${n}: the points went down`);
  if (g2.lives > g.lives) bad(`step ${n}: a life came back`);
  if (g2.wave === g.wave && g2.aliens.filter(a => a > 0).length > g.aliens.filter(a => a > 0).length) bad(`step ${n}: an invader came back`);
  if (g2.hit === 1) seen.hits++; if (g2.hit === 2) seen.lost++; if (g2.hit === 3) seen.waves++; if (c.fire && g.sy < 0 && g2.sy >= 0) seen.shots++;
  g = g2;
}
console.log(`${g.t} steps: ${g.score} points, ${seen.shots} shots, ${seen.hits} invaders hit, ${seen.lost} lives lost, ${seen.waves} waves cleared, wave ${g.wave + 1}, ${g.shields.filter(b => b).length} of 128 shield blocks left${g.over ? ", over (" + (g.hit === 4 ? "the invaders landed" : "no lives left") + ")" : ""}`);
const med = a => { const s = [...a].sort((x, y) => x - y); return `${s[s.length >> 1].toFixed(2)} ms median, ${s[Math.floor(s.length * 0.9)].toFixed(2)} p90`; };
console.log(`a step: ${med(stepMs)}; the robot's choice: ${med(robotMs)}; ${fail} failures`);
