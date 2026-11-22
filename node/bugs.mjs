// hazeljs-examples, Butterfly garden in Node (ticket 828; Bug run, reimagined in 0.0.61): the same Hazel module as the page
// (bugs/rules/Bugs.hz), built by hazeljs. It builds the rules, has the robot (Bugs.robot, the 🤖 player) play a game, and
// checks it: the watering can stays in its rows, the points only grow, the tries only fall, the segments stay in the garden, a
// bud only opens within a wave; it counts the caterpillars fed, the butterflies, the buds opened by nectar, the bumps and the
// gardens in full bloom; then times a step and a robot's choice.
//   npm run bugs [-- steps, 3000 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../bugs/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(start = Bugs.start, step = Bugs.step, robot = Bugs.robot)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Bugs", text: read("Bugs.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 1500));
if (!r.ok) process.exit(1);
const B = r.value, N = Number(process.argv[2] || 3000);
let fail = 0; const bad = m => { fail++; if (fail < 10) console.log("FAIL:", m); };
const stepMs = [], robotMs = [];
let g = B.start(42); const seen = { hits: 0, lost: 0, waves: 0, broke: 0 };
console.log(`start: ${g.segs.length} segments, ${g.buds.length} buds`);
const seen2 = { out: 0, more: 0 };
for (let n = 0; n < N && !g.over; n++) {
  let t = performance.now(); const c = B.robot(g); robotMs.push(performance.now() - t);
  t = performance.now(); const g2 = B.step(g, c.mx, c.my, c.fire); stepMs.push(performance.now() - t);
  if (g2.px < 12 || g2.px > 588 || g2.py < 662 || g2.py > 788) bad(`step ${n}: the can at ${g2.px}, ${g2.py}`);
  if (g2.hit !== 3 && g2.buds.filter(b => b.hp > 0).length > g.buds.filter(b => b.hp > 0).length) bad(`step ${n}: a bud closed again`);
  if (g2.freed > g.freed) seen2.out += g2.freed - g.freed; if (g2.hit === 6) seen2.more++;
  if (g2.score < g.score) bad(`step ${n}: the points went down`);
  if (g2.lives > g.lives) bad(`step ${n}: a life came back`);
  for (const s of g2.segs) if (s.c < 0 || s.c > 23 || s.r < 0 || s.r > 31) bad(`step ${n}: a segment at ${s.c}, ${s.r}`);
  if (g2.hit === 1) seen.hits++; if (g2.hit === 2) seen.lost++; if (g2.hit === 3) seen.waves++; if (g2.hit === 4) seen.broke++;
  g = g2;
}
console.log(`${g.t} steps: ${g.score} points, ${seen.hits} segments fed, ${seen2.out} butterflies, ${seen.broke} buds opened by nectar, ${seen2.more} caterpillars more, ${seen.lost} bumps, ${seen.waves} gardens in full bloom, wave ${g.wave + 1}, ${g.buds.filter(b => b.hp > 0).length} buds closed${g.over ? ", over" : ""}`);
const med = a => { const s = [...a].sort((x, y) => x - y); return `${s[s.length >> 1].toFixed(2)} ms median, ${s[Math.floor(s.length * 0.9)].toFixed(2)} p90`; };
console.log(`a step: ${med(stepMs)}; the robot's choice: ${med(robotMs)}; ${fail} failures`);
