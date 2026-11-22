// hazeljs-examples, Downhill in Node (ticket 823): three moments of its rules, each set up by hand: the snowball starting at 1500 m and
// catching a skier who stops; a fall on a tree (50 steps lying just below it, then up); a jump off a ramp.
//   node node/downhill-moments.mjs
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const dir = new URL("..", import.meta.url).pathname;
const read = f => readFileSync(dir + "/downhill/rules/" + f, "utf8").replace(/\s+$/, "");
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Downhill", text: read("Downhill.hz") }], tail: "(start = Downhill.start, step = Downhill.step, course = Downhill.course, robot = Downhill.robot)" });
if (!r.ok) { console.log("not built"); process.exit(1); }
const D = r.value;
// a run put just above 1500 m, skiing straight down for 60 steps, then turned across the slope to stop and wait
let g = { ...D.start(5, true), y: 7490000 };
const log = [];
for (let n = 0; n < 900 && !g.over; n++) {
  const turn = n === 60 || n === 61 || n === 62 ? 1 : 0;
  g = D.step(g, turn, false);
  if (n % 100 === 0 || g.over || n === 61) log.push(`step ${n}: y ${(g.y / 100).toFixed(0)} speed ${(g.speed / 100).toFixed(1)} heading ${g.heading} rolling ${g.rolling} ball ${((g.y - g.by) / 100).toFixed(0)} behind, r ${(g.br / 100).toFixed(1)}${g.over ? " CAUGHT hit " + g.hit : ""}`);
}
console.log(log.join("\n"));
// a fall: a run straight at a tree
const things = []; for (let k = 2; k < 40; k++) for (const t of D.course(5, k)) things.push(t);
const tree = things.find(t => t.kind === 0 && Math.abs(t.x) < 600);
let h = { ...D.start(5, false), x: tree.x * 100, y: (tree.y - 60) * 100, speed: 600 };
let fell = null;
for (let n = 0; n < 40; n++) { h = D.step(h, 0, false); if (h.hit === 1) { fell = n; break; } }
console.log(`a tree at ${tree.x}, ${tree.y}: fell at step ${fell}, lying ${h.down}, now at y ${(h.y / 100).toFixed(0)} (the tree + 26), speed ${h.speed}`);
let up = h; for (let n = 0; n < 60; n++) up = D.step(up, 0, false);
console.log(`60 steps later: down ${up.down}, heading ${up.heading}, speed ${(up.speed / 100).toFixed(2)}, y ${(up.y / 100).toFixed(0)}`);
// a jump off a ramp
const ramp = things.find(t => t.kind === 2 && Math.abs(t.x) < 600);
let j = { ...D.start(5, false), x: ramp.x * 100, y: (ramp.y - 50) * 100, speed: 800 }, air = 0, top = 0;
for (let n = 0; n < 80; n++) { j = D.step(j, 0, false); if (j.air > 0) { air++; top = Math.max(top, j.air); } }
console.log(`a ramp at ${ramp.x}, ${ramp.y}: jumps ${j.jumps}, ${air} steps in the air, ${(top / 100).toFixed(1)} high, points ${j.score}`);
