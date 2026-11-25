// Gnome world (0.0.107; ^ticket(861), the first of its logic moved from JavaScript into Hazel): the magic carpet's flight, Hazel's
// Fly.step against the page's JavaScript of it (world/app.js flyJS, read from the page's own file so the two never drift), on
// random flights through a made-up world of tiles: the same answer at every step, and each one's time a step.
//
//   node node/fly-check.mjs <hazel-lib.js> [out.json] [--build-only]
//
// --build-only: build the world's program and stop (with --stack-size=N, to find the least stack it builds in).
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const lib = process.argv[2], out = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : null;
const BUILD_ONLY = process.argv.includes("--build-only"), NO_FLY = process.argv.includes("--no-fly");
await import(pathToFileURL(lib).href);
const Hazel = globalThis.Hazel;
const read = f => readFileSync(new URL("../world/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const modules = NO_FLY ? ["World"] : ["World", "Fly", "Tail"];   // (0.0.116: and the cat tail's flight, Tail.hz)
const tail = "(plan = World.plan, step = World.step" + (NO_FLY ? "" : ", fly = Fly.step, tail = Tail.step") + ")";
const spec = { preamble: read("preamble.hz"), modules: modules.map(name => ({ name, text: read(name + ".hz") })), tail };
const t0 = performance.now();
const built = Hazel.jitProgram(spec);
const buildMs = performance.now() - t0;
if (!built.ok || !built.compiled) { console.log("not built:", JSON.stringify({ ok: built.ok, compiled: built.compiled, reason: built.reason, errors: built.errors })); process.exit(1); }
console.log(`built (${modules.join(", ")}) in ${(buildMs / 1000).toFixed(1)} s, compiled`);
if (BUILD_ONLY) process.exit(0);

// the page's flyJS, out of world/app.js
const app = readFileSync(new URL("../world/app.js", import.meta.url), "utf8");
const src = app.slice(app.indexOf("  function flyJS("), app.indexOf("  function carpetStep("));
const flyJS = new Function(src + "; return flyJS;")();

// a made-up world, 80 tiles across and 60 down, coded as the page's code() codes a tile: what is there (0 open, 1 to 9 a kind
// of ground, 10 a boulder, 11 a platform), 16 more for water, 32 more where the gnome can climb, and a ground tile's slope
// (64 or 128) on top; outside it, 8 (masonry)
let seed = 12345; const rnd = () => (seed = (seed * 48271 + 11) % 2147483647) / 2147483647;
const WW = 80, WH = 60, grid = new Int32Array(WW * WH);
for (let r = 0; r < WH; r++) for (let c = 0; c < WW; c++) { const ground = r > 40 + Math.round(4 * Math.sin(c / 7)), k = rnd();
  grid[r * WW + c] = ground ? (1 + Math.floor(k * 9)) + (k < 0.08 ? 64 : k < 0.12 ? 128 : 0) : k < 0.03 ? 10 : k < 0.06 ? 11 : k < 0.12 ? 16 : k < 0.16 ? 32 : 0; }
const code = (c, r) => c < 0 || r < 0 || c >= WW || r >= WH ? 8 : grid[r * WW + c];
const near = g => { const cx = Math.floor(g.x / 1000), cy = Math.floor((g.y - 1) / 1000), row = r => code(cx - 1, r) + 512 * code(cx, r) + 262144 * code(cx + 1, r);
  return { cx, cy, r0: row(cy - 3), r1: row(cy - 2), r2: row(cy - 1), r3: row(cy), r4: row(cy + 1) }; };
const fly = built.value.fly;
const gnome0 = { x: 40500, y: 20000, vx: 0, vy: 0, face: 1, ground: false, climb: false, swim: false, under: false, air: 600, gear: false, tool: 0, kit: 0, dc: -1, dr: -1, dt: 0, ev: 0 };
const N = 20000, pads = [], states = [];
for (let i = 0; i < N; i++) { const ph = Math.floor(i / (20 + Math.floor(rnd() * 40))) % 9;
  pads.push({ dx: [1, 1, 0, -1, -1, 0, 1, -1, 0][ph] * (rnd() < 0.9 ? 1 : 0), up: ph === 2 || ph === 5, down: ph === 6 || ph === 8, jump: false, dig: false, dash: false }); }
const key = f => [f.gnome.x, f.gnome.y, f.gnome.face, f.gnome.air, f.carpet.vx, f.carpet.vy, f.carpet.face].join(",");
let g = { ...gnome0 }, c = { vx: 0, vy: 0, face: 1 }, same = 0, first = null, moved = 0, stopped = 0;
for (let i = 0; i < N; i++) { const n = near(g); states.push([g, n, c]);
  const a = fly(g, n, pads[i], c), b = flyJS(g, n, pads[i], c);
  if (key(a) === key(b)) same++; else if (!first) first = { step: i, hazel: key(a), js: key(b) };
  if (b.gnome.x !== g.x || b.gnome.y !== g.y) moved++; if ((pads[i].dx || pads[i].up || pads[i].down) && b.gnome.x === g.x && b.gnome.y === g.y) stopped++;
  g = { ...g, ...b.gnome }; c = { ...b.carpet }; }
console.log(`the same at ${same} of ${N} steps${first ? "; first differs at " + JSON.stringify(first) : ""} (moved at ${moved}, held back by something at ${stopped})`);
// each one's time a step: the recorded states again, batches of the whole run, the median of seven
const time = f => { const ts = []; for (let k = 0; k < 7; k++) { const s0 = performance.now(); for (let i = 0; i < N; i++) f(states[i][0], states[i][1], pads[i], states[i][2]); ts.push((performance.now() - s0) / N * 1000); }
  ts.sort((x, y) => x - y); return ts[3]; };
time(flyJS); time(fly);
const usJS = time(flyJS), usHazel = time(fly);
console.log(`a step: the page's JavaScript ${usJS.toFixed(3)} µs, Hazel's Fly.step through the jit ${usHazel.toFixed(3)} µs (${(usHazel / usJS).toFixed(1)}×); of a 16.7 ms frame, ${(usHazel / 16700 * 100).toFixed(3)}%`);
const result = { when: new Date().toISOString(), node: process.version, build: Hazel.build, buildMs: Math.round(buildMs), steps: N, same, first, moved, stopped, usJS: +usJS.toFixed(4), usHazel: +usHazel.toFixed(4) };
// (0.0.116) the cat tail's flight: Hazel's Tail.step against the page's tailJS, on 20,000 made-up gnomes (on the ground or in
// the air, climbing or in the water, at any speed), keys and tails (the meter, the flight, the lift and the flutter at any count)
const tsrc = app.slice(app.indexOf("  function tailJS("), app.indexOf("  function tailToggle("));
const tailJS = new Function(tsrc + "; return tailJS;")(), tailH = built.value.tail;
let tSame = 0, tFirst = null; const seen = { takeoff: 0, lift: 0, flutter: 0, ended: 0, landed: 0 };
for (let i = 0; i < N; i++) {
  const ground = rnd() < 0.4, wet = rnd() < 0.12;
  const gg = { ...gnome0, x: 1000 + Math.floor(rnd() * 70000), y: 1000 + Math.floor(rnd() * 50000), vx: Math.round((rnd() * 2 - 1) * 300), vy: Math.round(rnd() * 520 - 250), face: rnd() < 0.5 ? -1 : 1,
    ground, climb: wet && rnd() < 0.5, swim: wet && rnd() < 0.5, under: wet && rnd() < 0.3 };
  const pp = { dx: [-1, 0, 1][Math.floor(rnd() * 3)], up: rnd() < 0.3, down: rnd() < 0.2, jump: rnd() < 0.35, dig: false, dash: rnd() < 0.5 };
  const tt = { meter: rnd() < 0.4 ? 50 : Math.floor(rnd() * 51), fly: rnd() < 0.5 ? Math.floor(rnd() * 241) : rnd() < 0.15 ? 1 : 0, lift: Math.floor(rnd() * 19), flut: Math.floor(rnd() * 17) };
  const a = tailH(gg, pp, tt), b = tailJS(gg, pp, tt);
  if (JSON.stringify(a) === JSON.stringify(b)) tSame++; else if (!tFirst) tFirst = { step: i, gnome: gg, pad: pp, tail: tt, hazel: a, js: b };
  if (b.tail.fly === 240) seen.takeoff++; if (b.gnome.vy === -81) seen.lift++; if (b.gnome.vy === 19 && gg.vy !== 19) seen.flutter++; if (tt.fly === 1 && b.tail.fly === 0 && !ground) seen.ended++; if (tt.fly > 0 && ground && b.tail.meter === 0) seen.landed++;
}
console.log(`the cat tail: Tail.step the same as the page's tailJS at ${tSame} of ${N} made-up steps${tFirst ? "; first differs: " + JSON.stringify(tFirst) : ""} (take-offs ${seen.takeoff}, lifts ${seen.lift}, flutters ${seen.flutter}, flights run out ${seen.ended}, landed ${seen.landed})`);
result.tail = { steps: N, same: tSame, first: tFirst, seen };
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
process.exit(same === N && tSame === N ? 0 : 1);
