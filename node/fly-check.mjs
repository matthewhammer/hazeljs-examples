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
const modules = NO_FLY ? ["World"] : ["World", "Fly", "Tail", "Ride", "Boulder", "Pickup", "Wind", "Bunny"];   // (0.0.116: and the cat tail's flight, Tail.hz; 0.0.134: Clover's ride, Ride.hz)
const tail = "(plan = World.plan, step = World.step" + (NO_FLY ? "" : ", fly = Fly.step, tail = Tail.step, ride_pre = Ride.pre, ride_post = Ride.post, boulder = Boulder.step, pickup = Pickup.step, wind = Wind.step, bunny = Bunny.step") + ")";
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
let tSame = 0, tFirst = null; const seen = { takeoff: 0, lift: 0, flutter: 0, ended: 0, landed: 0, auto: 0 };
for (let i = 0; i < N; i++) {
  const ground = rnd() < 0.4, wet = rnd() < 0.12;
  const gg = { ...gnome0, x: 1000 + Math.floor(rnd() * 70000), y: 1000 + Math.floor(rnd() * 50000), vx: Math.round((rnd() * 2 - 1) * 300), vy: Math.round(rnd() * 520 - 250), face: rnd() < 0.5 ? -1 : 1, kit: Math.floor(rnd() * 8),
    ground, climb: wet && rnd() < 0.5, swim: wet && rnd() < 0.5, under: wet && rnd() < 0.3 };
  const pp = { dx: [-1, 0, 1][Math.floor(rnd() * 3)], up: rnd() < 0.3, down: rnd() < 0.2, jump: rnd() < 0.35, dig: false, dash: rnd() < 0.5 };
  const tt = { meter: rnd() < 0.4 ? 50 : Math.floor(rnd() * 51), fly: rnd() < 0.5 ? Math.floor(rnd() * 241) : rnd() < 0.15 ? 1 : 0, lift: Math.floor(rnd() * 19), flut: Math.floor(rnd() * 17), rep: rnd() < 0.4 ? 0 : Math.floor(rnd() * 25) };
  const a = tailH(gg, pp, tt), b = tailJS(gg, pp, tt);
  if (JSON.stringify(a) === JSON.stringify(b)) tSame++; else if (!tFirst) tFirst = { step: i, gnome: gg, pad: pp, tail: tt, hazel: a, js: b };
  if (b.tail.fly === 240) seen.takeoff++; if (b.gnome.vy === -81) seen.lift++; if (b.gnome.vy === 19 && gg.vy !== 19) seen.flutter++; if (tt.fly === 1 && b.tail.fly === 0 && !ground) seen.ended++; if (tt.fly > 0 && ground && b.tail.meter === 0) seen.landed++; if (!pp.jump && pp.up && b.gnome.vy === -81 && tt.lift === 0) seen.auto++;
}
console.log(`the cat tail: Tail.step the same as the page's tailJS at ${tSame} of ${N} made-up steps${tFirst ? "; first differs: " + JSON.stringify(tFirst) : ""} (take-offs ${seen.takeoff}, lifts ${seen.lift}, flutters ${seen.flutter}, flights run out ${seen.ended}, landed ${seen.landed}, flaps by up held ${seen.auto})`);
// (0.0.134) the tail's time a step too, as the carpet's and the ride's: its made-up steps again, the median of seven batches
const tin = []; { let sd = 777; const r2 = () => (sd = (sd * 48271 + 11) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) tin.push([{ ...gnome0, vx: Math.round((r2() * 2 - 1) * 300), vy: Math.round(r2() * 520 - 250), ground: r2() < 0.4, kit: Math.floor(r2() * 8) },
    { dx: [-1, 0, 1][Math.floor(r2() * 3)], up: r2() < 0.3, down: r2() < 0.2, jump: r2() < 0.35, dig: false, dash: r2() < 0.5 },
    { meter: Math.floor(r2() * 51), fly: Math.floor(r2() * 241), lift: Math.floor(r2() * 19), flut: Math.floor(r2() * 37), rep: Math.floor(r2() * 25) }]); }
const ttime = f => { const ts = []; for (let b = 0; b < 7; b++) { const t = performance.now(); for (const [gg, pp, tt] of tin) f(gg, pp, tt); ts.push((performance.now() - t) * 1000 / tin.length); } ts.sort((x, y) => x - y); return ts[3]; };
ttime(tailJS); ttime(tailH); const tjs = ttime(tailJS), thz = ttime(tailH);
console.log(`a step of the tail: the page's JavaScript ${tjs.toFixed(3)} µs, Hazel's Tail.step through the jit ${thz.toFixed(3)} µs (${(thz / tjs).toFixed(1)}×); of a 16.7 ms frame, ${(thz / 16670 * 100).toFixed(4)}%`);
result.tail = { steps: N, same: tSame, first: tFirst, seen, jsUs: tjs, hazelUs: thz };
// (0.0.134) Clover's ride, piece 2 of ^report(64): Hazel's Ride.pre and Ride.post against the page's rideJS, on 20,000 made-up
// gnomes, keys and states of hers each (on the ground or in the air, climbing or in the water, a jump just taken or not, a safe
// place or none, wet or dry); then each one's time a call, the same inputs again, the median of seven batches
const rsrc = app.slice(app.indexOf("  const rideJS = {"), app.indexOf("  function rideStep("));
const rideJS = new Function(rsrc + "; return rideJS;")(), preH = built.value.ride_pre, postH = built.value.ride_post;
const canon = x => JSON.stringify(x, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(q => [q, v[q]])) : v));
const rin = []; let rSame = 0, rFirst = null; const rseen = { leap: 0, hop: 0, back: 0, safeNew: 0 };
for (let i = 0; i < N; i++) {
  const wet = rnd() < 0.2, gg = { ...gnome0, x: 1000 + Math.floor(rnd() * 70000), y: 1000 + Math.floor(rnd() * 50000), vx: Math.round((rnd() * 2 - 1) * 300), vy: Math.round(rnd() * 520 - 250), face: rnd() < 0.5 ? -1 : 1,
    ground: rnd() < 0.5, climb: rnd() < 0.15, swim: wet && rnd() < 0.7, under: wet && rnd() < 0.4, gear: rnd() < 0.3, tool: Math.floor(rnd() * 3), kit: Math.floor(rnd() * 8),
    dc: rnd() < 0.5 ? -1 : Math.floor(rnd() * 60), dr: Math.floor(rnd() * 60), dt: Math.floor(rnd() * 6), ev: [0, 0, 1, 2, 2, 3, 4, 5][Math.floor(rnd() * 8)], air: Math.floor(rnd() * 601) };
  const kk = { dx: [-1, 0, 1][Math.floor(rnd() * 3)], up: rnd() < 0.4, down: rnd() < 0.2, jump: rnd() < 0.3, dig: rnd() < 0.2, dash: false };
  const cc = { want: rnd() < 0.5 ? 0 : Math.floor(rnd() * 41), leapt: rnd() < 0.3, hop: rnd() < 0.3, leap: rnd() < 0.3, safe: rnd() < 0.6, sx: Math.floor(rnd() * 70000), sy: Math.floor(rnd() * 50000) };
  const lp = rnd() < 0.4, wt = rnd() < 0.2; rin.push([gg, kk, cc, lp, wt]);
  const a1 = preH(gg, kk, cc), a2 = rideJS.pre(gg, kk, cc), b1 = postH(gg, kk, cc, lp, wt), b2 = rideJS.post(gg, kk, cc, lp, wt);
  if (canon(a1) === canon(a2) && canon(b1) === canon(b2)) rSame++; else if (!rFirst) rFirst = { step: i, gnome: gg, keys: kk, clover: cc, leap: lp, wet: wt, hazel: [a1, b1], js: [a2, b2] };
  if (a2.leap) rseen.leap++; if (a2.pad.jump && !a2.leap) rseen.hop++; if (b2.back) rseen.back++; if (b2.clover.safe && !cc.safe) rseen.safeNew++;
}
const rtime = f => { const ts = []; for (let b = 0; b < 7; b++) { const t = performance.now(); for (const [gg, kk, cc, lp, wt] of rin) f(gg, kk, cc, lp, wt); ts.push((performance.now() - t) * 1000 / rin.length); } ts.sort((x, y) => x - y); return ts[3]; };
const rjs = rtime((gg, kk, cc, lp, wt) => { rideJS.pre(gg, kk, cc); rideJS.post(gg, kk, cc, lp, wt); }), rhz = rtime((gg, kk, cc, lp, wt) => { preH(gg, kk, cc); postH(gg, kk, cc, lp, wt); });
console.log(`Clover's ride: Ride.pre and Ride.post the same as the page's rideJS at ${rSame} of ${N} made-up steps${rFirst ? "; first differs: " + JSON.stringify(rFirst) : ""} (leaps ${rseen.leap}, hops ${rseen.hop}, back to a safe place ${rseen.back}, a new safe place ${rseen.safeNew})`);
console.log(`a step of her ride (pre and post): the page's JavaScript ${rjs.toFixed(3)} µs, Hazel's through the jit ${rhz.toFixed(3)} µs (${(rhz / rjs).toFixed(1)}×); of a 16.7 ms frame, ${(rhz / 16670 * 100).toFixed(4)}%`);
result.ride = { steps: N, same: rSame, first: rFirst, seen: rseen, jsUs: rjs, hazelUs: rhz };
// (0.0.135) the boulders, piece 3: Hazel's Boulder.step against the page's boulderJS, on 20,000 made-up boulders (still or falling,
// wobbling or not, dry or wet, the tiles under them open or not, the gnome near or not), and each one's time a call
const bsrc = app.slice(app.indexOf("  const boulderJS = (b, s) => {"), app.indexOf("  function bouldersStep(h) {"));
const boulderJS = new Function(bsrc + "; return boulderJS;")(), boulderH = built.value.boulder;
const bin = []; let bSame = 0, bFirst = null; const bseen = { wobble: 0, fell: 0, landed: 0, hit: 0 };
for (let i = 0; i < N; i++) {
  const falling = rnd() < 0.5, c = 5 + Math.floor(rnd() * 80), r = 5 + Math.floor(rnd() * 80);
  const b = { c, r, oy: falling ? Math.floor(rnd() * 1000) / 1000 : (rnd() < 0.8 ? 0 : rnd()), wob: rnd() < 0.4 ? -1 : Math.floor(rnd() * 46), falling };
  const near = rnd() < 0.4, sees = { below: rnd() < 0.6, below2: rnd() < 0.6, wet: rnd() < 0.3, gx: near ? c + 0.5 + (rnd() - 0.5) * 2 : rnd() * 90, gy: near ? r + 1 + rnd() * 2 : rnd() * 90 };
  bin.push([b, sees]);
  const a1 = boulderH(b, sees), a2 = boulderJS(b, sees);
  if (canon(a1) === canon(a2)) bSame++; else if (!bFirst) bFirst = { step: i, boulder: b, sees, hazel: a1, js: a2 };
  if (a2.wobble) bseen.wobble++; if (a2.boulder.falling && !b.falling) bseen.fell++; if (a2.landed) bseen.landed++; if (a2.hit) bseen.hit++;
}
const btime = f => { const ts = []; for (let k = 0; k < 7; k++) { const t = performance.now(); for (const [b, sv] of bin) f(b, sv); ts.push((performance.now() - t) * 1000 / bin.length); } ts.sort((x, y) => x - y); return ts[3]; };
btime(boulderJS); btime(boulderH); const bjs = btime(boulderJS), bhz = btime(boulderH);
console.log(`the boulders: Boulder.step the same as the page's boulderJS at ${bSame} of ${N} made-up boulders${bFirst ? "; first differs: " + JSON.stringify(bFirst) : ""} (wobbles begun ${bseen.wobble}, falls begun ${bseen.fell}, landed ${bseen.landed}, hit the gnome ${bseen.hit})`);
console.log(`a boulder's step: the page's JavaScript ${bjs.toFixed(3)} µs, Hazel's Boulder.step through the jit ${bhz.toFixed(3)} µs (${(bhz / bjs).toFixed(1)}×)`);
result.boulder = { steps: N, same: bSame, first: bFirst, seen: bseen, jsUs: bjs, hazelUs: bhz };
// (0.0.136) picking things up, piece 4: Hazel's Pickup.step against the page's pickupJS. Two sets of 20,000 made-up steps: one
// close, the things and hearts in a few tiles round the gnome, so many are taken (for the same answers); one as in a world, the
// page's twelve things and twenty-six hearts spread over 900 tiles across, so nearly always none is near (for the time a step:
// it is the lists that cost, crossing, each step)
const psrc = app.slice(app.indexOf("  const pickupJS = (me, things, hearts) => {"), app.indexOf("  // (⏱ times it as a part of its own"));
const pickupJS = new Function(psrc + "; return pickupJS;")(), pickupH = built.value.pickup;
const KINDS = ["good", "super", "climb", "gear", "carrot", "carpet", "tail", "shoes", "flippers", "climber", "finder"];
const pcanon = a => JSON.stringify([a.me.x, a.me.y, a.me.hearts, a.me.gear, a.me.tool, a.me.kit, a.me.pack, a.me.carrots, Array.from(a.items), Array.from(a.hearts)]);
const madeUp = (spread, nThings, nHearts) => { const cx = 5 + rnd() * 800, cy = 5 + rnd() * 150, at = () => [cx + (rnd() - 0.5) * spread, cy + (rnd() - 0.5) * spread * (spread > 50 ? 0.2 : 1)];
  const things = [], hearts = [];
  for (let k = 0; k < nThings; k++) { const [x, y] = at(); things.push({ x, y, kind: KINDS[Math.floor(rnd() * KINDS.length)], taken: rnd() < 0.3 }); }
  for (let k = 0; k < nHearts; k++) { const [x, y] = at(); hearts.push({ x, y, taken: rnd() < 0.3 }); }
  const me = { x: cx + (rnd() - 0.5) * 2, y: cy + (rnd() - 0.5) * 2, hearts: Math.floor(rnd() * 6), gear: rnd() < 0.3, tool: Math.floor(rnd() * 4), kit: Math.floor(rnd() * 8), pack: rnd() < 0.3, carrots: Math.floor(rnd() * 4) };
  return [me, things, hearts]; };
let pSame = 0, pFirst = null; const pseen = { things: 0, hearts: 0, steps: 0 };
for (let i = 0; i < N; i++) { const [me, things, hearts] = madeUp(3, 1 + Math.floor(rnd() * 6), Math.floor(rnd() * 5));
  const a1 = pickupH(me, things, hearts), a2 = pickupJS(me, things, hearts);
  if (pcanon(a1) === pcanon(a2)) pSame++; else if (!pFirst) pFirst = { step: i, me, things, hearts, hazel: pcanon(a1), js: pcanon(a2) };
  pseen.things += a2.items.length; pseen.hearts += a2.hearts.length; if (a2.items.length || a2.hearts.length) pseen.steps++; }
const pin = []; let pRealSame = 0, pRealTook = 0;
for (let i = 0; i < N; i++) { const w = madeUp(900, 12, 26); pin.push(w); const a1 = pickupH(...w), a2 = pickupJS(...w); if (pcanon(a1) === pcanon(a2)) pRealSame++; if (a2.items.length || a2.hearts.length) pRealTook++; }
const ptime = f => { const ts = []; for (let k = 0; k < 7; k++) { const t = performance.now(); for (const w of pin) f(w[0], w[1], w[2]); ts.push((performance.now() - t) * 1000 / pin.length); } ts.sort((x, y) => x - y); return ts[3]; };
ptime(pickupJS); ptime(pickupH); const pjs = ptime(pickupJS), phz = ptime(pickupH);
console.log(`picking things up: Pickup.step the same as the page's pickupJS at ${pSame} of ${N} made-up steps close by${pFirst ? "; first differs: " + JSON.stringify(pFirst) : ""} (things taken ${pseen.things}, hearts ${pseen.hearts}, at ${pseen.steps} steps), and at ${pRealSame} of ${N} as in a world (twelve things, twenty-six hearts, over 900 tiles; something taken at ${pRealTook})`);
console.log(`a step of picking up, as in a world: the page's JavaScript ${pjs.toFixed(3)} µs, Hazel's Pickup.step through the jit ${phz.toFixed(3)} µs (${(phz / pjs).toFixed(1)}×); of a 16.7 ms frame, ${(phz / 16670 * 100).toFixed(4)}%`);
result.pickup = { steps: N, same: pSame, realSame: pRealSame, first: pFirst, seen: pseen, jsUs: pjs, hazelUs: phz };
// (0.0.137) the wind, piece 5: Hazel's Wind.step against the page's windJS, on a wind blowing 20,000 steps from the page's first
// wind, five random numbers a step as the page gives them; each step's answer compared, the JavaScript's carried on
const wsrc = app.slice(app.indexOf("  const windJS = (w, frame, r) => {"), app.indexOf("  function windStep(h) {"));
const windJS = new Function(wsrc + "; return windJS;")(), windH = built.value.wind;
const wcanon = a => JSON.stringify([a.wind.v, a.wind.aim, a.wind.next, a.wind.gust, a.now]);
let wind = { v: 0.25, aim: 0.3, next: 0, gust: 0 }, wSame = 0, wFirst = null; const win = [], wseen = { turns: 0, strong: 0, gusts: 0, top: 0 };
for (let i = 0; i < N * 3; i++) { const r = { a: rnd(), b: rnd(), c: rnd(), d: rnd(), e: rnd() }; win.push([wind, i, r]);
  const a1 = windH(wind, i, r), a2 = windJS(wind, i, r);
  if (wcanon(a1) === wcanon(a2)) wSame++; else if (!wFirst) wFirst = { step: i, wind, r, hazel: wcanon(a1), js: wcanon(a2) };
  if (a2.wind.next !== wind.next) { wseen.turns++; if (Math.abs(a2.wind.aim) > 0.62 * 1.1) wseen.strong++; } if (Math.abs(a2.wind.gust) > Math.abs(wind.gust) * 0.975 + 1e-12) wseen.gusts++; wseen.top = Math.max(wseen.top, Math.abs(a2.now));
  wind = a2.wind; }
const wtime = f => { const ts = []; for (let k = 0; k < 7; k++) { const t = performance.now(); for (const [w, i, r] of win) f(w, i, r); ts.push((performance.now() - t) * 1000 / win.length); } ts.sort((x, y) => x - y); return ts[3]; };
wtime(windJS); wtime(windH); const wjs = wtime(windJS), whz = wtime(windH);
console.log(`the wind: Wind.step the same as the page's windJS at ${wSame} of ${N * 3} steps of a wind blowing${wFirst ? "; first differs: " + JSON.stringify(wFirst) : ""} (new aims ${wseen.turns}, strong ones ${wseen.strong}, gusts ${wseen.gusts}, strongest ${wseen.top.toFixed(2)})`);
console.log(`a step of the wind: the page's JavaScript ${wjs.toFixed(3)} µs, Hazel's Wind.step through the jit ${whz.toFixed(3)} µs (${(whz / wjs).toFixed(1)}×); of a 16.7 ms frame, ${(whz / 16670 * 100).toFixed(4)}%`);
result.wind = { steps: N * 3, same: wSame, first: wFirst, seen: wseen, jsUs: wjs, hazelUs: whz };
// (0.0.141) a wild bunny's mind, piece 6's first part: Hazel's Bunny.step against the page's bunnyJS. 20,000 made-up bunnies,
// each stepped 30 times on (its answer carried on, the JavaScript's), on land of made-up heights with a river now and then, the
// gnome near or far, riding or not, six random numbers a step as the page gives them; each step's answer compared
const usrc = app.slice(app.indexOf("  const bunnyJS = (b, g, w, r) => {"), app.indexOf("  const NO_HOP = {"));
const bunnyJS = new Function(usrc + "; return bunnyJS;")(), bunnyH = built.value.bunny;
const ucanon = a => JSON.stringify([a.x, a.home, a.face, a.wait, a.nib, a.ear, a.flee, a.hop.on, a.hop.x0, a.hop.x1, a.hop.y0, a.hop.y1, a.hop.t, a.hop.dur, a.hop.h]);
const UWW = 120, uland = Array.from({ length: UWW }, (_, c) => 40 + Math.round(3 * Math.sin(c / 5)) + (rnd() < 0.15 ? 0.5 : 0) + (rnd() < 0.04 ? 2 : 0));
const urivers = [{ x0: 30 - 0.5, x1: 34 + 0.5 }, { x0: 77 - 0.5, x1: 78 + 0.5 }];
const uworld = x => { const c0 = Math.floor(x) - 3, land = []; for (let c = c0; c <= c0 + 6; c++) land.push(uland[Math.max(0, Math.min(UWW - 1, c))]);
  return { c0, ww: UWW, land, rivers: urivers.filter(v => v.x0 < x + 4 && v.x1 > x - 4) }; };
const UNOHOP = { on: false, x0: 0, x1: 0, y0: 0, y1: 0, t: 0, dur: 1, h: 0 };
let uSame = 0, uFirst = null, uSteps = 0; const uin = [], useen = { hops: 0, flees: 0, nibbles: 0, turned: 0, home: 0, ears: 0 };
for (let i = 0; i < N; i++) { const home = 3 + rnd() * (UWW - 6);
  let b = { x: home + (rnd() - 0.5) * 14, home, face: rnd() < 0.5 ? -1 : 1, wait: Math.floor(rnd() * 60) - 5, nib: rnd() < 0.3 ? Math.floor(rnd() * 20) : 0, ear: rnd() < 0.3 ? rnd() * 0.45 : 0, flee: rnd() < 0.2, hop: UNOHOP };
  b.x = Math.max(2.2, Math.min(UWW - 3.2, b.x));
  if (rnd() < 0.3) { const x1 = b.x + (rnd() - 0.5) * 4; b.hop = { on: true, x0: b.x, x1, y0: uland[Math.floor(b.x)], y1: uland[Math.floor(x1)] ?? 40, t: rnd(), dur: rnd() < 0.5 ? 16 : 22, h: 0.45 }; }
  const gnome = { x: b.x + (rnd() - 0.5) * (rnd() < 0.5 ? 6 : 30), y: 40 + (rnd() - 0.5) * 4, riding: rnd() < 0.2 };
  for (let k = 0; k < 30; k++) { const w = uworld(b.x), r = { a: rnd(), b: rnd(), c: rnd(), d: rnd(), e: rnd(), f: rnd() }; uin.push([b, gnome, w, r]); uSteps++;
    const a1 = bunnyH(b, gnome, w, r), a2 = bunnyJS(b, gnome, w, r);
    if (ucanon(a1) === ucanon(a2)) uSame++; else if (!uFirst) uFirst = { bunny: b, gnome, w, r, hazel: ucanon(a1), js: ucanon(a2) };
    if (a2.hop.on && !b.hop.on) { useen.hops++; if (a2.flee) useen.flees++; if (Math.abs(b.x - b.home) > 5 && !a2.flee) useen.home++; }
    if (a2.nib > b.nib) useen.nibbles++; if (!a2.hop.on && a2.wait === 40 && a2.face === -b.face && !b.hop.on && a2.nib === b.nib) useen.turned++; if (a2.ear === 0.45) useen.ears++;
    b = a2; } }
const utime = f => { const ts = []; for (let k = 0; k < 7; k++) { const t = performance.now(); for (const [b, g, w, r] of uin) f(b, g, w, r); ts.push((performance.now() - t) * 1000 / uin.length); } ts.sort((x, y) => x - y); return ts[3]; };
utime(bunnyJS); utime(bunnyH); const ujs = utime(bunnyJS), uhz = utime(bunnyH);
console.log(`a wild bunny's mind: Bunny.step the same as the page's bunnyJS at ${uSame} of ${uSteps} steps of 20,000 made-up bunnies${uFirst ? "; first differs: " + JSON.stringify(uFirst) : ""} (hops begun ${useen.hops}, running away ${useen.flees}, toward home ${useen.home}; nibbles ${useen.nibbles}; turned back ${useen.turned}; ears up ${useen.ears})`);
console.log(`a step of a wild bunny: the page's JavaScript ${ujs.toFixed(3)} µs, Hazel's Bunny.step through the jit ${uhz.toFixed(3)} µs (${(uhz / ujs).toFixed(1)}×); of a 16.7 ms frame, ${(uhz / 16670 * 100).toFixed(4)}%`);
result.bunny = { steps: uSteps, same: uSame, first: uFirst, seen: useen, jsUs: ujs, hazelUs: uhz };
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
process.exit(same === N && tSame === N && rSame === N && bSame === N && pSame === N && pRealSame === N && wSame === N * 3 && uSame === uSteps ? 0 : 1);
