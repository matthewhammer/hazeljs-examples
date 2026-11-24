// hazeljs-examples, Gnome world in Node: the same Hazel module as the page (world/rules/World.hz), built by hazeljs. It builds
// the rules, makes a world's plan and checks it (the surface, the layers, the water table, the places in the world), lays out
// the village and the hamlet and furnishes their rooms, grows the great trees' limbs, checks the sixteen tree house styles,
// and runs the beavers for a while: each goes to a tree, gnaws it, drags the log to its dam and lays it. Then it times each.
//   npm run world
import HazelNpm from "hazeljs";
import path from "node:path";
import { pathToFileURL } from "node:url";
// (HAZELJS=<a package dir>: that build instead, e.g. one with hazel-jit; with Hazel.jitProgram, the step compiled too, checked
// against the interpreter's, step by step)
const Hazel = process.env.HAZELJS ? (await import(pathToFileURL(path.resolve(process.env.HAZELJS, "index.mjs")).href)).default : HazelNpm;
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../world/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(plan = World.plan, ground = World.ground, village = World.village, furnish = World.furnish, limbs = World.limbs, styles = World.styles, beaver = World.beaver, water_row = World.water_row, step = World.step, roots = World.roots, threads = World.threads, greet = World.greet, dig_steps = World.dig_steps)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "World", text: read("World.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 2500));
if (!r.ok) process.exit(1);
const G = r.value;
let fail = 0; const bad = m => { fail++; if (fail < 20) console.log("FAIL:", m); };
const time = (what, f) => { const t = performance.now(); const v = f(); console.log(`${what}: ${(performance.now() - t).toFixed(1)} ms`); return v; };
const p = time("plan", () => G.plan(7));
if (p.surface.length !== 57) bad(`surface samples ${p.surface.length}`);
for (const s of p.surface) if (s < 20 || s > 44) bad(`surface row ${s}`);
if (p.layers.length < 5) bad(`layers ${p.layers.length}`);
for (const l of p.layers) if (l.thick.length !== 29) bad(`layer ${l.kind}: ${l.thick.length} samples`);
if (p.table.length !== 29) bad(`table ${p.table.length}`);
const by = {}; for (const q of p.places) (by[q.kind] = by[q.kind] || []).push(q);
console.log("places:", Object.entries(by).map(([k, v]) => `${k}:${v.length}`).join(" "));
for (const k of [10, 11, 12, 13, 14, 15, 20, 21, 30, 31, 40, 41, 42, 43, 44, 45, 50, 51]) if (!by[k]) bad(`no place of kind ${k}`);
for (const q of p.places) if (q.x < 0 || q.x >= 448 || q.y < 0 || q.y >= 128) bad(`place ${JSON.stringify(q)} outside`);
for (const k of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) { const g = G.ground(k); if (g.kind !== k) bad(`ground ${k}`); }
console.log("grounds:", [1, 2, 3, 4, 5, 6, 7].map(k => { const g = G.ground(k); return `${g.name} dig ${g.dig} pores ${g.pores} flow ${g.flow}`; }).join("; "));
const v = time("village", () => G.village(62, 46, 0, 7)), hm = G.village(254, 50, 1, 7);
console.log(`village: ${v.length} rooms, x ${Math.min(...v.map(q => q.x))}..${Math.max(...v.map(q => q.x + q.w))}; hamlet ${hm.length}`);
if (v.length < 12) bad(`village rooms ${v.length}`);
const f = time("furnish (each kind)", () => [...Array(13)].map((_, k) => G.furnish(k, 8)));
f.forEach((things, k) => { if (!things.length) bad(`room ${k}: nothing in it`); for (const t of things) if (t.at < 0 || t.at + t.w > 80) bad(`room ${k}: ${JSON.stringify(t)} outside`); });
console.log("furnished:", f.map(t => t.map(x => x.kind).join(",")).join(" | "));
for (const [kind, h, seed] of [[30, 30, 301], [31, 34, 302], [30, 28, 303]]) {
  const L = G.limbs(kind, h, seed);
  console.log(`limbs ${kind}: ${L.map(l => `${l.y}${l.side > 0 ? "R" : "L"}${l.len}h${l.house}${l.bridge ? "b" : ""}`).join(" ")}`);
  if (L.length < 3) bad(`great tree ${kind}: ${L.length} limbs`);
}
if (G.styles.length < 12) bad(`styles ${G.styles.length}`);
if (new Set(G.styles.map(s => s.latin)).size !== G.styles.length) bad("two styles with one Latin name");
console.log("styles:", G.styles.map(s => s.latin).join(", "));
// the beavers: a lodge at 250, its dam at 240, trees at 230, 262 and 300 (too far)
let trees = [230, 262, 300], bs = [0, 1].map(i => ({ x: 25000, face: 1, job: 0, t: i * 5, tree: -1, lodge: 250, dam: 240, felled: -1, laid: false, cut: false }));
let felled = 0, laid = 0; const tb = performance.now(); let calls = 0;
// (the fallen trees and their piles of logs, as the page keeps them: a felled tree six pieces to cut where it fell, its pile
// empty; a cut moves a piece onto the pile; a beaver starting to drag takes one log from it)
const piles = new Map(), fallen = new Map(); let cuts = 0;
for (let n = 0; n < 900; n++) bs = bs.map(b => { calls++; const b2 = G.beaver(b, trees, [...piles.keys()], [...fallen.keys()]);
  if (b2.felled >= 0) { felled++; trees = trees.filter(t => t !== b2.felled); fallen.set(b2.felled, 6); }
  if (b2.cut && fallen.has(b2.tree)) { cuts++; const k = fallen.get(b2.tree) - 1; if (k > 0) fallen.set(b2.tree, k); else fallen.delete(b2.tree); piles.set(b2.tree, (piles.get(b2.tree) || 0) + 1); }
  if (b2.job === 3 && b.job !== 3 && piles.has(b2.tree)) { const k = piles.get(b2.tree) - 1; if (k > 0) piles.set(b2.tree, k); else piles.delete(b2.tree); }
  if (b2.laid) laid++;
  if (Math.abs(b2.x - b.x) > 30) bad(`a beaver jumped ${b.x} -> ${b2.x}`);
  return b2; });
console.log(`beavers: ${felled} trees felled, ${cuts} logs cut, ${laid} logs laid, ${((performance.now() - tb) / calls).toFixed(2)} ms a step; trees left ${trees}`);
if (felled < 1 || cuts < 4 || laid < 2 * felled || laid > cuts) bad(`beavers felled ${felled}, cut ${cuts} and laid ${laid}`);
{ const t1 = G.greet(5, 0, 0, 0), t2 = G.greet(5, 1, 3, 1), t3 = G.greet(9, 2, 2, 4); console.log(`villagers: ${t1.name}: ${t1.line} / ${t2.name}: ${t2.line} / ${t3.name}: ${t3.line}`);
  if (!t1.name || !t1.line || !t2.line || !t3.name) bad("greet"); }
// (0.0.95) the diggers: the steps each kind of ground takes with none, the good digger and the super digger; the bedrock, the
// last four rows, only with the super digger, and never the very last
{ const tbl = [0, 1, 2].map(t => [1, 2, 3, 4, 5, 6, 7, 8].map(w => G.dig_steps(w, 60, t)));
  console.log("dig steps (soil, clay, sand, sandstone, shale, limestone, granite, masonry), none / good / super:", tbl.map(r => r.join(",")).join(" / "));
  if (tbl[0][5] || tbl[0][6] || !tbl[1][5] || !tbl[1][6] || tbl[2][6] >= tbl[1][6] || tbl[1][4] >= tbl[0][4] || tbl[2][4] >= tbl[1][4] || tbl[1][7] || tbl[2][7]) bad("dig_steps");
  if (G.dig_steps(7, 125, 1) || !G.dig_steps(7, 125, 2) || G.dig_steps(7, 127, 2) || G.dig_steps(1, 127, 2)) bad("dig_steps: the bedrock"); }
if (G.water_row(40, 36, 0) !== 40 || G.water_row(40, 36, 9) !== 37 || G.water_row(40, 36, 30) !== 37) bad("water_row");
// the gnome on a patch of ground: soil from row 50 down, a pool of water (columns 20 to 27, rows 47 to 49, in a dip of the soil),
// a ladder at column 12 from row 40 to 49
const T = (c, r) => { if (c >= 20 && c <= 27) return r >= 50 ? 1 : r >= 47 ? 16 : 0; if (c === 12 && r >= 40 && r < 50) return 32; return r >= 50 ? 1 : (c >= 19 && c <= 28 && r >= 47 ? 1 : 0); };
const near = g => { const cx = Math.floor(g.x / 1000), cy = Math.floor((g.y - 1) / 1000), row = r => T(cx - 1, r) + 512 * T(cx, r) + 262144 * T(cx + 1, r);
  return { cx, cy, r0: row(cy - 3), r1: row(cy - 2), r2: row(cy - 1), r3: row(cy), r4: row(cy + 1) }; };
const gnome0 = { x: 5500, y: 50000, vx: 0, vy: 0, face: 1, ground: true, climb: false, swim: false, under: false, air: 600, gear: false, tool: 0, dc: -1, dr: -1, dt: 0, ev: 0 };
const pad = (dx = 0, up = false, down = false, jump = false, dig = false) => ({ dx, up, down, jump, dig });
const run = (S, g, n, p, each) => { for (let i = 0; i < n; i++) { g = S(g, near(g), typeof p === "function" ? p(i) : p); if (each) each(g, i); } return g; };
const checkGnome = (S, who) => {
  let g = run(S, gnome0, 10, pad());
  if (g.y !== 50000 || !g.ground) bad(`${who}: standing, y ${g.y} ground ${g.ground}`);
  g = run(S, g, 30, pad(1));
  console.log(`${who}: walked right 30 steps: x ${g.x} (from 5500)`);
  if (g.x < 7500 || g.x > 8600 || g.y !== 50000) bad(`${who}: walking: x ${g.x} y ${g.y}`);
  let top = g.y; g = run(S, g, 60, i => pad(0, i < 20, false, i === 0), q => { if (q.y < top) top = q.y; });
  console.log(`${who}: a jump rose to ${top} (from 50000), back at ${g.y}`);
  if (top > 48300 || top < 47600 || g.y !== 50000) bad(`${who}: jump top ${top}, end ${g.y}`);
  let dug = null; g = run(S, g, 30, pad(0, false, true), q => { if (q.ev === 1 && !dug) dug = [q.dc, q.dr]; });
  console.log(`${who}: dug down: ${dug}`);
  if (!dug || dug[1] !== 50) bad(`${who}: digging down gave ${dug}`);
  // into the pool: from x 19500 (on the dip's edge, row 47), walk right into the water, and float there
  let w = { ...gnome0, x: 19500, y: 47000 }, ev3 = false;
  w = run(S, w, 90, pad(1), q => { if (q.ev === 3) ev3 = true; });
  console.log(`${who}: in the pool: x ${w.x} y ${w.y} swim ${w.swim} under ${w.under} air ${w.air}`);
  if (!w.swim || w.under) bad(`${who}: not floating in the pool (swim ${w.swim}, under ${w.under})`);
  let lowest = 0; w = run(S, w, 60, pad(0, false, true), q => { if (q.y > lowest) lowest = q.y; });
  console.log(`${who}: dove to ${lowest}, air ${w.air}, under ${w.under}`);
  if (!w.under || w.air >= 600) bad(`${who}: diving: under ${w.under}, air ${w.air}`);
  w = run(S, w, 120, pad());
  if (!w.swim || w.under) bad(`${who}: did not come back up (swim ${w.swim}, under ${w.under}, y ${w.y})`);
  // the ladder: from its foot, up held: climbing up to row 40
  let c = run(S, { ...gnome0, x: 12500 }, 120, pad(0, true));
  console.log(`${who}: up the ladder: y ${c.y}, climbing ${c.climb}`);
  if (c.y > 42000) bad(`${who}: climbing the ladder only got to ${c.y}`);
  // a shaft one tile wide at column 30, dug up from a tunnel (row 49, columns 29 to 31): from x 30.9 (straddling 30 and 31), up
  // held: eased into column 30, it climbs, digging the soil over its head
  { const T0 = T; let dugUp = 0;
    const T2 = (c, r) => (r === 49 && c >= 29 && c <= 31) ? 32 : (c === 30 && r >= 45 && r < 49) ? 32 : r >= 40 && c >= 25 && c <= 35 ? 1 : T0(c, r);
    const near2 = g => { const cx = Math.floor(g.x / 1000), cy = Math.floor((g.y - 1) / 1000), row = r => T2(cx - 1, r) + 512 * T2(cx, r) + 262144 * T2(cx + 1, r);
      return { cx, cy, r0: row(cy - 3), r1: row(cy - 2), r2: row(cy - 1), r3: row(cy), r4: row(cy + 1) }; };
    let q = { ...gnome0, x: 30900, y: 50000 };
    for (let i = 0; i < 200; i++) { q = S(q, near2(q), pad(0, true)); if (q.ev === 1) dugUp++; }
    console.log(`${who}: up a shaft from x 30.9: x ${q.x} y ${q.y}, tiles dug ${dugUp}`);
    if (q.y > 46000 || Math.abs(q.x - 30500) > 60 || !dugUp) bad(`${who}: the shaft: x ${q.x} y ${q.y}`); }
  // (Matthew: "let's also do sloped banks, like Mario 3") a hill: flat at row 50, up a slope one tile a column (columns 41 to 44,
  // sloped tiles sloping up to the east) to a top at row 46, and down the other side (columns 48 to 51, sloping up to the west)
  { const top3 = c => c <= 40 ? 50 : c <= 44 ? 50 - (c - 40) : c <= 48 ? 46 : c <= 52 ? 46 + (c - 48) : 50, sh3 = c => c >= 41 && c <= 44 ? 1 : c >= 48 && c <= 51 ? 2 : 0;
    const T3 = (c, r) => r > top3(c) ? 1 : r === top3(c) ? 1 + 64 * sh3(c) : 0;
    const near3 = g => { const cx = Math.floor(g.x / 1000), cy = Math.floor((g.y - 1) / 1000), row = r => T3(cx - 1, r) + 512 * T3(cx, r) + 262144 * T3(cx + 1, r);
      return { cx, cy, r0: row(cy - 3), r1: row(cy - 2), r2: row(cy - 1), r3: row(cy), r4: row(cy + 1) }; };
    let q = { ...gnome0, x: 38500, y: 50000 }, hi = 1e9, stuck = 0, offGround = 0;
    for (let i = 0; i < 260; i++) { const x0 = q.x; q = S(q, near3(q), pad(1)); hi = Math.min(hi, q.y); if (q.x === x0 && q.x < 56000) stuck++; if (!q.ground) offGround++; }
    console.log(`${who}: over the hill: x ${q.x} y ${q.y}, highest ${hi}, steps stuck ${stuck}, steps off the ground ${offGround}`);
    if (q.x < 56000 || q.y !== 50000 || hi > 46100 || hi < 45900 || stuck > 0 || offGround > 3) bad(`${who}: over the hill`);
    // (Matthew: "down on a slope shouldn't dig --- it should do a slide") down, standing on the slope (sloping up to the east):
    // it slides down it, west, faster and faster, and digs nothing; the dig button with down digs the sloped tile under it
    let d = { ...gnome0, x: 43500, y: 47500 }; d = S(d, near3(d), pad()); let dd = null, fastest = 0; const dx0 = d.x;
    for (let i = 0; i < 30; i++) { d = S(d, near3(d), pad(0, false, true)); if (d.ev === 1) dd = [d.dc, d.dr]; fastest = Math.min(fastest, d.vx); }
    console.log(`${who}: slid from x ${dx0} to ${d.x}, fastest ${fastest}, dug ${dd}`);
    if (dd || d.x > dx0 - 2500 || fastest > -150) bad(`${who}: the slide`);
    let b2 = { ...gnome0, x: 42500, y: 48500 }; b2 = S(b2, near3(b2), pad()); dd = null;
    for (let i = 0; i < 40 && !dd; i++) { b2 = S(b2, near3(b2), pad(0, false, true, false, true)); if (b2.ev === 1) dd = [b2.dc, b2.dr]; }
    let e = { ...gnome0, x: 40500, y: 50000 }, ed = null; const ex = e.x;
    for (let i = 0; i < 40 && !ed; i++) { e = S(e, near3(e), pad(0, false, false, false, true)); if (e.ev === 1) ed = [e.dc, e.dr]; }
    console.log(`${who}: the dig button with down dug ${dd}; the dig button dug ${ed}, x ${ex} -> ${e.x}`);
    if (String(dd) !== "42,48" || String(ed) !== "41,49" || Math.abs(e.x - ex) > 5) bad(`${who}: digging slopes`); }
  // (0.0.95) on granite: down and the dig button dig nothing with no digger; the good digger digs it, the super digger faster
  { const TG = (c, r) => r >= 50 ? 7 : 0, nearG = g => { const cx = Math.floor(g.x / 1000), cy = Math.floor((g.y - 1) / 1000), row = r => TG(cx - 1, r) + 512 * TG(cx, r) + 262144 * TG(cx + 1, r);
      return { cx, cy, r0: row(cy - 3), r1: row(cy - 2), r2: row(cy - 1), r3: row(cy), r4: row(cy + 1) }; };
    const digIn = tool => { let q = { ...gnome0, tool }; for (let i = 0; i < 120; i++) { q = S(q, nearG(q), pad(0, false, true, false, true)); if (q.ev === 1) return `${i + 1} steps (${q.dc},${q.dr})`; } return "no"; };
    const d0 = digIn(0), d1 = digIn(1), d2 = digIn(2); console.log(`${who}: granite dug with no digger: ${d0}; the good digger: ${d1}; the super digger: ${d2}`);
    if (d0 !== "no" || !d1.startsWith("72 steps (5,50)") || !d2.startsWith("24 steps (5,50)")) bad(`${who}: the diggers`); }
  const t = performance.now(); run(S, gnome0, 300, i => pad(i % 50 < 25 ? 1 : -1, i % 40 === 0, false, i % 40 === 0));
  console.log(`${who}: a step ${((performance.now() - t) / 300).toFixed(3)} ms`);
};
checkGnome(G.step, "interpreted");
if (Hazel.jitProgram) {
  const t1 = performance.now();
  const J = Hazel.jitProgram({ preamble: read("preamble.hz"), modules: [{ name: "World", text: read("World.hz") }], tail: TAIL });
  console.log(`jit: compiled ${J.compiled} ${J.reason || ""} in ${(performance.now() - t1).toFixed(0)} ms`);
  if (J.compiled) {
    checkGnome(J.value.step, "jit");
    let a = gnome0, b = gnome0, diff = 0;
    for (let i = 0; i < 400; i++) { const p = pad(i % 70 < 35 ? 1 : -1, i % 30 < 10, i % 90 > 80, i % 30 === 0, i % 110 > 100); a = G.step(a, near(a), p); b = J.value.step(b, near(b), p);
      if (JSON.stringify(a) !== JSON.stringify(b)) { diff++; if (diff < 3) console.log("jit differs at", i, JSON.stringify(a), JSON.stringify(b)); a = b; } }
    if (diff) bad(`the jit's step differs from the interpreter's ${diff} times`);
    const tp = performance.now(); J.value.plan(7); console.log(`jit: plan ${(performance.now() - tp).toFixed(1)} ms`);
    { const t = performance.now(); let n = 0; for (let i = 0; i < 10; i++) n += J.value.roots(3450 + i * 1000, 40, 100, i).length; console.log(`jit: ten trees' roots ${n} lines, ${(performance.now() - t).toFixed(1)} ms`); }
  }
}
{ const t = performance.now(); const R = G.roots(3450, 40, 110, 7), M = G.threads(9050, 40, 7);
  console.log(`roots: ${R.length} lines, deepest ${Math.max(...R.map(l => l.y1)) / 100} rows, widest ${Math.max(...R.map(l => l.w))}; threads ${M.length}; ${(performance.now() - t).toFixed(1)} ms`);
  if (R.length < 60 || M.length < 20) bad(`roots ${R.length}, threads ${M.length}`);
  for (const l of R) if (l.y0 < 4004 || l.y1 > 12400) bad(`a root line out of the ground: ${JSON.stringify(l)}`); }
console.log(fail ? `${fail} FAILED` : "all good");
process.exit(fail ? 1 : 0);
