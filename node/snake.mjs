// hazeljs-examples, Snake in Node (ticket 825): the same Hazel module as the page (snake/rules/Snake.hz), built by hazeljs. It
// builds the rules, has the robot (Snake.robot, the 🤖 player) play games with the walls and with them wrapping, and checks a
// game: the head moves one cell a step, the snake never runs over itself, it grows by three a meal, the food is on a free
// cell; it counts the meals and how long the snake grew; then times a step and a robot's choice.
//   npm run snake [-- games, 2 by default] [-- steps a game, 600 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../snake/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(start = Snake.start, step = Snake.step, robot = Snake.robot, next_level = Snake.next_level)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Snake", text: read("Snake.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 1500));
if (!r.ok) process.exit(1);
const Sn = r.value, GAMES = Number(process.argv[2] || 2), N = Number(process.argv[3] || 600);
let fail = 0; const bad = m => { fail++; if (fail < 10) console.log("FAIL:", m); };
const stepMs = [], robotMs = [];
for (let k = 0; k < GAMES; k++) {
  const wrap = k % 2 === 1;
  let g = Sn.start(7 + k, wrap), meals = 0, levels = 0;
  for (let i = 0; i < N && !g.over; i++) {
    let t = performance.now(); const d = Sn.robot(g); robotMs.push(performance.now() - t);
    t = performance.now(); const g2 = Sn.step(g, d); stepMs.push(performance.now() - t);
    if (!g2.over) {
      const [h0] = g.body, [h1] = g2.body, dr = Math.abs(Math.floor(h1 / 20) - Math.floor(h0 / 20)), dc = Math.abs(h1 % 20 - h0 % 20);
      if (!((dr + dc === 1) || (wrap && ((dr === 19 && dc === 0) || (dc === 19 && dr === 0))))) bad(`game ${k} step ${i}: the head went ${h0} to ${h1}`);
      if (new Set(g2.body).size !== g2.body.length) bad(`game ${k} step ${i}: the snake over itself`);
      if (g2.food >= 0 && g2.body.includes(g2.food)) bad(`game ${k} step ${i}: the food under the snake`);
    }
    if (g2.hit === 1 || g2.hit === 3) meals++;
    if (g2.hit === 3) { if (g2.food !== -1) bad(`game ${k}: food after the level's last meal`); levels++; g = Sn.next_level(g2); continue; }
    g = g2;
  }
  console.log(`game ${k} (${wrap ? "the walls wrap" : "walls"}): ${g.t} steps, ${meals} meals, ${g.score} points, ${g.body.length} long, ${levels} levels cleared${g.over ? ", crashed" : ""}`);
}
const med = a => { const s = [...a].sort((x, y) => x - y); return `${s[s.length >> 1].toFixed(2)} ms median, ${s[Math.floor(s.length * 0.9)].toFixed(2)} p90`; };
console.log(`a step: ${med(stepMs)}; the robot's choice: ${med(robotMs)}; ${fail} failures`);
