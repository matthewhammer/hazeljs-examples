// hazeljs-examples, Gnome dig in Node (ticket 829; Deep dig until 0.0.61): the same Hazel module as the page (dig/rules/Dig.hz), built by hazeljs. It
// builds the rules, has the robot (Dig.robot, the 🤖 player) play a game, and checks it: you stay on the ground, a cell at a
// time, the points only grow, the lives only fall; it counts the gems, the monsters caught and squashed, the boulders landed,
// the times you were caught and the levels cleared; then times a step and a robot's choice.
//   npm run dig [-- steps, 3000 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../dig/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(start = Dig.start, step = Dig.step, robot = Dig.robot)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Dig", text: read("Dig.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 1500));
if (!r.ok) process.exit(1);
const D = r.value, N = Number(process.argv[2] || 3000);
let fail = 0; const bad = m => { fail++; if (fail < 10) console.log("FAIL:", m); };
const stepMs = [], robotMs = [];
let g = D.start(42); const seen = [0, 0, 0, 0, 0, 0, 0, 0];
console.log(`level 1: ${g.gems} gems, ${g.mons.length} monsters, ${g.rocks.length} boulders`);
for (let n = 0; n < N && !g.over; n++) {
  let t = performance.now(); const c = D.robot(g); robotMs.push(performance.now() - t);
  t = performance.now(); const g2 = D.step(g, c.dir, c.flash); stepMs.push(performance.now() - t);
  if (g2.px < 0 || g2.px > 13 || g2.py < 0 || g2.py > 15) bad(`step ${n}: you at ${g2.px}, ${g2.py}`);
  if (g2.level === g.level && Math.abs(g2.px - g.px) + Math.abs(g2.py - g.py) > 1 && !(g.dead === 1)) bad(`step ${n}: a jump from ${g.px},${g.py} to ${g2.px},${g2.py}`);
  if (g2.score < g.score) bad(`step ${n}: the points went down`);
  if (g2.lives > g.lives) bad(`step ${n}: a life came back`);
  seen[g2.hit]++; g = g2;
}
console.log(`${g.t} steps: ${g.score} points, level ${g.level + 1}, ${g.gems} gems left; gems ${seen[1]}, caught ${seen[2]} times, levels cleared ${seen[3]}, monsters caught ${seen[4]}, squashed ${seen[5]}, boulders landed ${seen[6]}, flashes ${seen[7]}${g.over ? ", over" : ""}`);
const med = a => { const s = [...a].sort((x, y) => x - y); return `${s[s.length >> 1].toFixed(2)} ms median, ${s[Math.floor(s.length * 0.9)].toFixed(2)} p90`; };
console.log(`a step: ${med(stepMs)}; the robot's choice: ${med(robotMs)}; ${fail} failures`);
