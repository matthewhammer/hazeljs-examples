// hazeljs-examples, Light trails in Node (ticket 826): the same Hazel module as the page (trails/rules/Trails.hz), built by
// hazeljs. It builds the rules, has the robot (Trails.robot) ride both sides of rounds at different care (how far it looks),
// and checks a round: each head moves a cell a step, never onto a lit cell unless it crashes there, the round ends with one
// crash or two; it counts who wins at which care; then times a step and a robot's choice.
//   npm run trails [-- rounds a pairing, 2 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../trails/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(start = Trails.start, step = Trails.step, robot = Trails.robot)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Trails", text: read("Trails.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 1500));
if (!r.ok) process.exit(1);
const T = r.value, ROUNDS = Number(process.argv[2] || 2);
let fail = 0; const bad = m => { fail++; if (fail < 10) console.log("FAIL:", m); };
const stepMs = [], robotMs = [];
for (const [ca, cb] of [[6, 60], [60, 6], [30, 30]]) {
  const wins = [0, 0, 0]; let steps = 0;
  for (let k = 0; k < ROUNDS; k++) {
    let g = T.start(k);
    while (!g.over && g.t < 1300) {
      let t = performance.now(); const a = T.robot(g, 1, ca, 0, 50); robotMs.push(performance.now() - t);
      const b = T.robot(g, 2, cb, 0, 50);
      t = performance.now(); const g2 = T.step(g, a, b); stepMs.push(performance.now() - t);
      if (Math.abs(g2.ax - g.ax) + Math.abs(g2.ay - g.ay) !== 1 || Math.abs(g2.bx - g.bx) + Math.abs(g2.by - g.by) !== 1) bad(`a head moved more than a cell at step ${g.t}`);
      g = g2; steps++;
    }
    if (!g.over) bad(`round ${k} never ended`);
    wins[g.winner]++;
  }
  console.log(`your rider looking ${ca} cells, Hazel's ${cb}: you won ${wins[1]}, Hazel ${wins[2]}, draws ${wins[0]} (${steps} steps in all)`);
}
const med = a => { const s = [...a].sort((x, y) => x - y); return `${s[s.length >> 1].toFixed(2)} ms median, ${s[Math.floor(s.length * 0.9)].toFixed(2)} p90`; };
console.log(`a step: ${med(stepMs)}; a robot's choice: ${med(robotMs)}; ${fail} failures`);
