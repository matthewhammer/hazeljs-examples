// node/step-time.mjs (^ticket(891)): the gnome's own step, World.step, through Hazel.jitProgram as the page calls it, against the
// page's plain JavaScript of it (world/plain.js), on 20,000 made-up states of a made-up world: the same answer at every one, and a
// step's time on fresh inputs (each call a copy of its own, as the game makes them) and on the same inputs again.
//   node node/step-time.mjs <hazel-lib.js> [name]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [LIB, NAME = "lib"] = process.argv.slice(2);
await import(pathToFileURL(LIB).href);
const Hazel = globalThis.Hazel, read = f => readFileSync(new URL("../world/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const spec = { preamble: read("preamble.hz"), modules: [{ name: "World", text: read("World.hz") }], tail: "(step = World.step)" };
const b = Hazel.jitProgram(spec); if (!b.ok || !b.compiled) { console.log("not built", b.reason); process.exit(1); }
const mod = { exports: {} }; new Function("module", readFileSync(new URL("../world/plain.js", import.meta.url), "utf8"))(mod); const plain = mod.exports;
let seed = 12345; const rnd = () => (seed = (seed * 48271 + 11) % 2147483647) / 2147483647;
const WW = 80, WH = 60, grid = new Int32Array(WW * WH);
for (let r = 0; r < WH; r++) for (let c = 0; c < WW; c++) { const ground = r > 40 + Math.round(4 * Math.sin(c / 7)), k = rnd();
  grid[r * WW + c] = ground ? (1 + Math.floor(k * 9)) + (k < 0.08 ? 64 : k < 0.12 ? 128 : 0) : k < 0.03 ? 10 : k < 0.06 ? 11 : k < 0.12 ? 16 : k < 0.16 ? 32 : 0; }
const code = (c, r) => c < 0 || r < 0 || c >= WW || r >= WH ? 8 : grid[r * WW + c];
const near = g => { const cx = Math.floor(g.x / 1000), cy = Math.floor((g.y - 1) / 1000), row = r => code(cx - 1, r) + 512 * code(cx, r) + 262144 * code(cx + 1, r);
  return { cx, cy, r0: row(cy - 3), r1: row(cy - 2), r2: row(cy - 1), r3: row(cy), r4: row(cy + 1) }; };
let g = { x: 40500, y: 40000, vx: 0, vy: 0, face: 1, ground: false, climb: false, swim: false, under: false, air: 600, gear: false, tool: 0, kit: 0, dc: -1, dr: -1, dt: 0, ev: 0 };
const ins = []; let same = 0;
for (let i = 0; i < 20000; i++) { const ph = Math.floor(i / 37) % 7, p = { dx: [1, 1, 0, -1, -1, 0, 1][ph], up: ph === 2, down: false, jump: i % 53 === 0, dig: false, dash: false }, n = near(g);
  ins.push([g, n, p]); const a = b.value.step(g, n, p), j = plain.step(g, n, p); if (JSON.stringify(a) === JSON.stringify(j)) same++; g = { ...j }; }
const time = (f, fresh) => { const ts = []; for (let k = 0; k < 7; k++) { const list = fresh ? structuredClone(ins) : ins; const t0 = performance.now(); for (const a of list) f(...a); ts.push((performance.now() - t0) * 1000 / list.length); } ts.sort((x, y) => x - y); return ts[3]; };
time(plain.step, false); time(b.value.step, false);
console.log(`World.step, ${NAME} (${Hazel.build.slice(0, 10)}): the same as plain.js at ${same} of ${ins.length}; a step, fresh inputs: Hazel ${time(b.value.step, true).toFixed(3)} us, plain JS ${time(plain.step, true).toFixed(3)} us; the same inputs again: Hazel ${time(b.value.step, false).toFixed(3)} us, plain JS ${time(plain.step, false).toFixed(3)} us`);
process.exit(same === ins.length ? 0 : 1);
