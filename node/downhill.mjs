// hazeljs-examples, Downhill in Node (ticket 823): the same Hazel module as the page (downhill/rules/Downhill.hz), built by
// hazeljs. It builds the rules, has the robot (Downhill.robot, the 🤖 player) ski runs down courses from a few seeds, and
// checks a run: the skier never leaves the fences, never goes up the hill, the points only grow, a fall lies 50 steps; it
// counts the falls, jumps and gates, and how far each run got; then times a step and a robot's choice.
//   npm run downhill [-- runs, 3 by default] [-- steps a run, 3000 by default] [-- with a snowball: 1]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../downhill/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(start = Downhill.start, step = Downhill.step, course = Downhill.course, robot = Downhill.robot)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Downhill", text: read("Downhill.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 1500));
if (!r.ok) process.exit(1);
const D = r.value, RUNS = Number(process.argv[2] || 3), N = Number(process.argv[3] || 3000), CHASE = process.argv[4] === "1";
let fail = 0; const bad = m => { fail++; if (fail < 10) console.log("FAIL:", m); };
const stepMs = [], robotMs = [];
const k = D.course(7, 5); console.log(`course(7, 5): ${k.length} things, kinds ${k.map(t => t.kind).join("")}`);
for (let s = 1; s <= RUNS; s++) {
  let g = D.start(s * 101, CHASE); const seen = { falls: 0, jumps: 0, gates: 0, bumps: 0 };
  for (let n = 0; n < N && !g.over; n++) {
    let t = performance.now(); const c = D.robot(g); robotMs.push(performance.now() - t);
    t = performance.now(); const g2 = D.step(g, c.turn, c.tuck); stepMs.push(performance.now() - t);
    if (Math.abs(g2.x) > 100000) bad(`run ${s} step ${n}: x ${g2.x} past the fence`);
    if (g2.y < g.y) bad(`run ${s} step ${n}: went up the hill (${g.y} to ${g2.y})`);
    if (g2.score < g.score) bad(`run ${s} step ${n}: the points went down`);
    if (g2.speed > 1600) bad(`run ${s} step ${n}: speed ${g2.speed}`);
    if (g2.hit === 1 || g2.hit === 2) { seen.falls++; if (g2.down !== 50) bad(`a fall lies ${g2.down}`); }
    if (g2.hit === 3) seen.jumps++; if (g2.hit === 4) seen.gates++; if (g2.hit === 6) seen.bumps++;
    g = g2;
  }
  console.log(`run ${s}: ${(g.y / 100 / 50).toFixed(0)} m in ${g.t} steps, top ${g.score} points, falls ${seen.falls}, jumps ${g.jumps}, gates ${g.gates}, bump steps ${seen.bumps}${g.over ? ", caught by the snowball" : ""}${g.rolling ? ` (snowball ${((g.y - g.by) / 100 / 50).toFixed(0)} m behind)` : ""}`);
}
const med = a => { const s = [...a].sort((x, y) => x - y); return `${s[s.length >> 1].toFixed(2)} ms median, ${s[Math.floor(s.length * 0.9)].toFixed(2)} p90`; };
console.log(`a step: ${med(stepMs)}; the robot's choice: ${med(robotMs)}; ${fail} failures`);
