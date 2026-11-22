// hazeljs-examples, Star wave in Node (ticket 827): the same Hazel module as the page (starwave/rules/StarWave.hz), built by
// hazeljs. It builds the rules, has the robot (StarWave.robot, the 🤖 player) play games, and checks them: the launcher stays
// on the field, the hearts only grow, the tries only fall, the town only turns more rainbow and the visitors only thin within a
// wave; it tells how each wave ended (just right, too soon, too late) and when, against when the town was all rainbow; then
// times a step and a robot's choice.
//   npm run starwave [-- games, 3 by default] [steps a game, 20000 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../starwave/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(start = StarWave.start, step = StarWave.step, robot = StarWave.robot)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "StarWave", text: read("StarWave.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 1500));
if (!r.ok) process.exit(1);
const SW = r.value, GAMES = Number(process.argv[2] || 3), N = Number(process.argv[3] || 20000);
const FLOORS = [5, 7, 6, 4], WORD = { 3: "just right", 4: "too late (landed)", 5: "too soon", 6: "too late (waited)" };
let fail = 0; const bad = m => { fail++; if (fail < 10) console.log("FAIL:", m); };
const stepMs = [], robotMs = [], tally = {};
for (let game = 0; game < GAMES; game++) {
  let g = SW.start(42 + game * 1000), waveAt = 0, fullAt = -1;
  const ends = [];
  for (let n = 0; n < N && !g.over; n++) {
    let t = performance.now(); const c = SW.robot(g); robotMs.push(performance.now() - t);
    t = performance.now(); const g2 = SW.step(g, c.move, c.fire); stepMs.push(performance.now() - t);
    if (g2.cx < 30 || g2.cx > 570) bad(`step ${n}: the launcher at ${g2.cx}`);
    if (g2.hearts < g.hearts) bad(`step ${n}: the hearts went down`);
    if (g2.tries > g.tries) bad(`step ${n}: a try came back`);
    if (g2.town.some((f, s) => f > FLOORS[s])) bad(`step ${n}: more floors rainbow than a building has: ${g2.town}`);
    if (g2.hit !== 7 && g2.town.some((f, s) => f < g.town[s])) bad(`step ${n}: a floor lost its rainbow within a wave`);
    if (g2.hit !== 7 && g2.aliens.filter(a => a > 0).length > g.aliens.filter(a => a > 0).length) bad(`step ${n}: a visitor came back`);
    if (g2.glow > 0 && g.glow === 0 && fullAt < 0) fullAt = g2.t;
    if (g2.hit >= 3 && g2.hit <= 6) {
      tally[g2.hit] = (tally[g2.hit] || 0) + 1;
      ends.push(`wave ${g2.wave + 1}: ${WORD[g2.hit]} after ${((g2.t - waveAt) / 60).toFixed(0)} s` + (fullAt >= 0 ? `, ${((g2.t - fullAt) / 60).toFixed(1)} s after the town was all rainbow` : `, the town ${g2.town.reduce((a, b) => a + b, 0)} of 22 floors`) + `, ${g2.aliens.filter(a => a > 0).length} left`);
    }
    if (g2.hit === 7) { waveAt = g2.t; fullAt = -1; }
    g = g2;
  }
  console.log(`game ${game + 1}: ${g.t} steps, 💗 ${g.hearts} hearts, ⭐ ${g.wins} just right, ${g.tries} tries left${g.over ? ", over" : ""}\n  ` + ends.join("\n  "));
}
console.log("the waves:", Object.entries(tally).map(([k, v]) => `${WORD[k]} ${v}`).join(", "));
const med = a => { const s = [...a].sort((x, y) => x - y); return `${s[s.length >> 1].toFixed(2)} ms median, ${s[Math.floor(s.length * 0.9)].toFixed(2)} p90`; };
console.log(`a step: ${med(stepMs)}; the robot's choice: ${med(robotMs)}; ${fail} failures`);
