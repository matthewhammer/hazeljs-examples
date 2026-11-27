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
// (--fresh, ^report(64) #fresh: each piece timed again on inputs it has not seen, as the game gives them, each call a deep copy of
// its own, made before the clock starts, beside the crossing alone: a Hazel function of the same type answering 0. The timings
// without it pass the same objects again, which the library's converters remember)
const FRESH_ON = process.argv.includes("--fresh");
await import(pathToFileURL(lib).href);
const Hazel = globalThis.Hazel;
const read = f => readFileSync(new URL("../world/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const modules = NO_FLY ? ["World"] : ["World", "Fly", "Tail", "Ride", "Boulder", "Pickup", "Wind", "Bunny", "Frog", "Bird", "Jelly"];   // (0.0.116: and the cat tail's flight, Tail.hz; 0.0.134: Clover's ride, Ride.hz)
const tail = "(plan = World.plan, step = World.step" + (NO_FLY ? "" : ", fly = Fly.step, tail = Tail.step, ride_pre = Ride.pre, ride_post = Ride.post, boulder = Boulder.step, pickup = Pickup.step, wind = Wind.step, bunny = Bunny.step, frog = Frog.step, bird = Bird.step, swim = Bird.swim, jelly = Jelly.step") + ")";
const sigOf = (name, fn) => read(name + ".hz").match(new RegExp("let " + fn + " : (.*?) -> \\(", "s"))[1];
const CROSS = [["xpickup", "Pickup", "step", "(a, b, c)"], ["xbunny", "Bunny", "step", "(a, b, c, d)"], ["xfrog", "Frog", "step", "(a, b, c, d)"], ["xbird", "Bird", "step", "(a, b, c, d)"]];
const crossText = "# the crossing alone (fly-check --fresh) #\n" + CROSS.map(([x, m, fn, args]) => `let ${x} : ${sigOf(m, fn)} -> Int = fun ${args} -> 0`).join(";\n");
const spec = { preamble: read("preamble.hz"), modules: [...modules.map(name => ({ name, text: read(name + ".hz") })), ...(FRESH_ON && !NO_FLY ? [{ name: "Cross", text: crossText }] : [])],
  tail: FRESH_ON && !NO_FLY ? tail.slice(0, -1) + ", " + CROSS.map(([x]) => `${x} = Cross.${x}`).join(", ") + ")" : tail };
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
const usJS = time(flyJS), usHazel = time(fly); const FLYIN = states.map((st, i) => [st[0], st[1], pads[i], st[2]]);
console.log(`a step: the page's JavaScript ${usJS.toFixed(3)} µs, Hazel's Fly.step through the jit ${usHazel.toFixed(3)} µs (${(usHazel / usJS).toFixed(1)}×); of a 16.7 ms frame, ${(usHazel / 16700 * 100).toFixed(3)}%`);
const freshTime = (f, list) => { const ts = []; for (let k = 0; k < 3; k++) { const copies = structuredClone(list); const t0 = performance.now(); for (const a of copies) f(...a); ts.push((performance.now() - t0) * 1000 / copies.length); } ts.sort((x, y) => x - y); return ts[1]; };
const freshOut = {};
const FRESH = (name, js, hz, x, list) => { if (!FRESH_ON) return; freshTime(js, list); freshTime(hz, list); const r = { js: freshTime(js, list), hazel: freshTime(hz, list), cross: x ? freshTime(x, list) : null };
  freshOut[name] = r; console.log(`fresh, ${name}: JavaScript ${r.js.toFixed(3)} µs, Hazel ${r.hazel.toFixed(3)} µs (${(r.hazel / r.js).toFixed(1)}×)${r.cross != null ? `, the crossing alone ${r.cross.toFixed(3)} µs` : ""}, each call on objects it has not seen`); };
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
btime(boulderJS); btime(boulderH); const bjs = btime(boulderJS), bhz = btime(boulderH); FRESH("the carpet", flyJS, fly, null, FLYIN); FRESH("a boulder", boulderJS, boulderH, null, bin);
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
ptime(pickupJS); ptime(pickupH); const pjs = ptime(pickupJS), phz = ptime(pickupH); FRESH("picking up, as in a world", pickupJS, pickupH, built.value.xpickup, pin);
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
wtime(windJS); wtime(windH); const wjs = wtime(windJS), whz = wtime(windH); FRESH("the wind", windJS, windH, null, win);
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
  for (let k = 0; k < 30; k++) { const w = uworld(b.x), r = { a: rnd(), b: rnd(), c: rnd(), d: rnd(), e: rnd(), f: rnd() }; if (uSteps % 6 === 0) uin.push([b, gnome, w, r]); uSteps++;
    const a1 = bunnyH(b, gnome, w, r), a2 = bunnyJS(b, gnome, w, r);
    if (ucanon(a1) === ucanon(a2)) uSame++; else if (!uFirst) uFirst = { bunny: b, gnome, w, r, hazel: ucanon(a1), js: ucanon(a2) };
    if (a2.hop.on && !b.hop.on) { useen.hops++; if (a2.flee) useen.flees++; if (Math.abs(b.x - b.home) > 5 && !a2.flee) useen.home++; }
    if (a2.nib > b.nib) useen.nibbles++; if (!a2.hop.on && a2.wait === 40 && a2.face === -b.face && !b.hop.on && a2.nib === b.nib) useen.turned++; if (a2.ear === 0.45) useen.ears++;
    b = a2; } }
const utime = f => { const ts = []; for (let k = 0; k < 7; k++) { const t = performance.now(); for (const [b, g, w, r] of uin) f(b, g, w, r); ts.push((performance.now() - t) * 1000 / uin.length); } ts.sort((x, y) => x - y); return ts[3]; };
utime(bunnyJS); utime(bunnyH); const ujs = utime(bunnyJS), uhz = utime(bunnyH); FRESH("a wild bunny", bunnyJS, bunnyH, built.value.xbunny, uin); uin.length = 0;
console.log(`a wild bunny's mind: Bunny.step the same as the page's bunnyJS at ${uSame} of ${uSteps} steps of 20,000 made-up bunnies${uFirst ? "; first differs: " + JSON.stringify(uFirst) : ""} (hops begun ${useen.hops}, running away ${useen.flees}, toward home ${useen.home}; nibbles ${useen.nibbles}; turned back ${useen.turned}; ears up ${useen.ears})`);
console.log(`a step of a wild bunny: the page's JavaScript ${ujs.toFixed(3)} µs, Hazel's Bunny.step through the jit ${uhz.toFixed(3)} µs (${(uhz / ujs).toFixed(1)}×); of a 16.7 ms frame, ${(uhz / 16670 * 100).toFixed(4)}%`);
result.bunny = { steps: uSteps, same: uSame, first: uFirst, seen: useen, jsUs: ujs, hazelUs: uhz };
// (0.0.142) a frog's mind, piece 6's second part: Hazel's Frog.step against the page's frogJS. 20,000 made-up frogs, each on a
// made-up river with lily pads riding made-up waves (or none, and a bank), bugs about, the gnome near or far, in the water or
// not, each stepped 30 times (its answer carried on, the JavaScript's), five random numbers a step; each step's answer compared
const fsrc = app.slice(app.indexOf("  const frogJS = (f, g, w, r) => {"), app.indexOf("  const FROG_MODE = {"));
const frogJS = new Function(fsrc + "; return frogJS;")(), frogH = built.value.frog;
const fcanon = a => JSON.stringify([a.frog.x, a.frog.y, a.frog.mode, a.frog.face, a.frog.wait, a.frog.pad, Object.values(a.frog.jump), a.croak, a.ate, a.plop]);
const FNOJ = { x0: 0, y0: 0, x1: 0, y1: 0, t: 0, dur: 1, h: 0, into: 0 };
let fSame = 0, fFirst = null, fSteps = 0; const fin = [], fseen = { jumps: 0, fled: 0, padHops: 0, swims: 0, croaks: 0, ate: 0, plops: 0 };
for (let i = 0; i < N; i++) { const level = 40 + rnd() * 4, rx = 10 + rnd() * 50, rw = 4 + rnd() * 14, np = rnd() < 0.2 ? 0 : 1 + Math.floor(rnd() * 6);
  const padX = Array.from({ length: np }, () => rx + 0.5 + rnd() * (rw - 1)), ph = rnd() * 6;
  const bank = np ? null : (rnd() < 0.5 ? rx - 0.5 : rx + rw + 0.5);
  const startPad = np && rnd() < 0.7 ? Math.floor(rnd() * np) : -1, mode = startPad >= 0 ? 0 : rnd() < 0.5 ? 2 : 0;
  let f = { x: startPad >= 0 ? padX[startPad] : bank ?? rx + rnd() * rw, y: level + (mode === 2 ? 0.55 : -0.04), mode, face: rnd() < 0.5 ? -1 : 1, wait: Math.floor(rnd() * 80) - 5, pad: startPad, jump: FNOJ };
  if (rnd() < 0.2) { f.mode = 1; f.jump = { x0: f.x, y0: f.y, x1: f.x + (rnd() - 0.5) * 3, y1: level + 0.4, t: rnd(), dur: 24 + Math.floor(rnd() * 5), h: 0.6, into: rnd() < 0.5 ? 0 : 2 }; }
  const gnome = { x: f.x + (rnd() - 0.5) * (rnd() < 0.6 ? 8 : 40), y: level - 1 + rnd() * 2, wet: rnd() < 0.3 };
  let lick = rnd() < 0.7;
  for (let k = 0; k < 30; k++) { const pads = padX.map((x, q) => ({ x, y: level - 0.04 + 0.05 * Math.sin(x * 1.9 + ph + k * 0.1) })), bx = bank ?? f.x;
    const w = { level, rx, rw, land: level - 1.5, bank: bx, banky: level - 0.04 + 0.05 * Math.sin(bx * 1.9 + ph + k * 0.1), pads,
      bugs: rnd() < 0.5 ? Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => ({ x: f.x + (rnd() - 0.5) * 2.4, y: f.y - 0.4 + rnd() * 1.2 })) : [], lick };
    const r = { a: rnd(), b: rnd(), c: rnd() < 0.05 ? rnd() * 0.004 : rnd(), d: rnd(), e: rnd() }; if (fSteps % 6 === 0) fin.push([f, gnome, w, r]); fSteps++;
    const a1 = frogH(f, gnome, w, r), a2 = frogJS(f, gnome, w, r);
    if (fcanon(a1) === fcanon(a2)) fSame++; else if (!fFirst) fFirst = { frog: f, gnome, w, r, hazel: fcanon(a1), js: fcanon(a2) };
    if (a2.frog.mode === 1 && f.mode !== 1) { fseen.jumps++; if (a2.frog.jump.into === 2) fseen.fled++; else if (f.mode === 0) fseen.padHops++; }
    if (a2.frog.mode === 2) fseen.swims++; if (a2.croak) fseen.croaks++; if (a2.ate >= 0) { fseen.ate++; lick = false; } else if (k % 7 === 0) lick = true; if (a2.plop) fseen.plops++;
    f = a2.frog; } }
const ftime = fn => { const ts = []; for (let k = 0; k < 7; k++) { const t = performance.now(); for (const [f, g, w, r] of fin) fn(f, g, w, r); ts.push((performance.now() - t) * 1000 / fin.length); } ts.sort((x, y) => x - y); return ts[3]; };
ftime(frogJS); ftime(frogH); const fjs = ftime(frogJS), fhz = ftime(frogH); FRESH("a frog", frogJS, frogH, built.value.xfrog, fin); fin.length = 0;
console.log(`a frog's mind: Frog.step the same as the page's frogJS at ${fSame} of ${fSteps} steps of 20,000 made-up frogs${fFirst ? "; first differs: " + JSON.stringify(fFirst) : ""} (jumps begun ${fseen.jumps}, away into the water ${fseen.fled}, pad to pad ${fseen.padHops}; swimming ${fseen.swims} steps; croaks ${fseen.croaks}; bugs eaten ${fseen.ate}; plops ${fseen.plops})`);
console.log(`a step of a frog: the page's JavaScript ${fjs.toFixed(3)} µs, Hazel's Frog.step through the jit ${fhz.toFixed(3)} µs (${(fhz / fjs).toFixed(1)}×); of a 16.7 ms frame, ${(fhz / 16670 * 100).toFixed(4)}%`);
result.frog = { steps: fSteps, same: fSame, first: fFirst, seen: fseen, jsUs: fjs, hazelUs: fhz };
// (0.0.143) the birds' minds, piece 6's third part: Hazel's Bird.step against the page's songJS (20,000 made-up songbirds, on the
// ground, perched or flying, perches near them on a step they may choose one, the gnome near or far, each stepped 30 times) and
// Bird.swim against swimJS (20,000 made-up ducks and swans on made-up rivers, 30 steps each); six random numbers a step
const ssrc = app.slice(app.indexOf("  const songJS = (b, g, w, r) => {"), app.indexOf("  const BIRD_MODE = {"));
const [songJS, swimJS] = new Function(ssrc + "; return [songJS, swimJS];")(), songH = built.value.bird, swimH = built.value.swim;
const scanon = a => JSON.stringify([a.bird.x, a.bird.y, a.bird.mode, a.bird.face, a.bird.wait, a.bird.peck, a.bird.home, a.bird.hashome, a.bird.perch, Object.values(a.bird.hop), Object.values(a.bird.fly), a.call]);
const wcanon2 = a => JSON.stringify([a.bird.x, a.bird.tx, a.bird.face, a.bird.dab, a.bird.wait, a.call]);
const SNOHOP = { on: false, x0: 0, x1: 0, t: 0 }, SNOFLY = { x0: 0, y0: 0, x1: 0, y1: 0, t: 0, dur: 1, next: 0 };
let sSame = 0, sFirst = null, sSteps = 0; const sin_ = [], sseen = { flights: 0, toPerch: 0, home: 0, lost: 0, hops: 0, pecks: 0, calls: 0, landed: 0 };
const SWW = 200, sland = Array.from({ length: SWW }, (_, c) => 40 + Math.round(2 * Math.sin(c / 6)) + (rnd() < 0.2 ? 0.5 : 0) + (rnd() < 0.03 ? 1 : 0));
const sperch = Array.from({ length: 60 }, (_, i) => ({ px: 3 + rnd() * (SWW - 6), dy: 4 + rnd() * 8 }));
const sriv = [{ x0: 60 - 0.5, x1: 66 + 0.5 }, { x0: 140 - 0.5, x1: 142 + 0.5 }];
for (let i = 0; i < N; i++) { const jay = rnd() < 0.3, mode = rnd() < 0.4 ? 0 : rnd() < 0.6 ? 1 : 2, x0 = 4 + rnd() * (SWW - 8), hashome = !jay || rnd() < 0.3;
  let b = { jay, x: x0, y: sland[Math.floor(x0)], mode, face: rnd() < 0.5 ? -1 : 1, wait: Math.floor(rnd() * 60) - 3, peck: rnd() < 0.2 ? Math.floor(rnd() * 10) : 0, home: hashome ? x0 + (rnd() - 0.5) * 8 : 0, hashome,
    perch: mode === 1 ? Math.floor(rnd() * sperch.length) : -1, hop: rnd() < 0.15 && mode === 0 ? { on: true, x0: x0, x1: x0 + 0.3, t: rnd() } : SNOHOP, fly: SNOFLY };
  if (mode === 2) b.fly = { x0: x0, y0: b.y, x1: x0 + (rnd() - 0.5) * 20, y1: b.y - rnd() * 8, t: rnd(), dur: 30 + rnd() * 60, next: rnd() < 0.5 ? 0 : 1 };
  const gnome = { x: x0 + (rnd() - 0.5) * (rnd() < 0.5 ? 7 : 40), y: 39 + rnd() * 2 }, gone = rnd() < 0.05, sway = rnd() * 6;
  for (let k = 0; k < 30; k++) { const at = (pr) => ({ x: sperch[pr].px + 0.2 * Math.sin(sway + k / 9), y: sland[Math.floor(sperch[pr].px)] - sperch[pr].dy });
    const scare = (b.x - gnome.x) * (b.x - gnome.x) + (b.y - gnome.y) * (b.y - gnome.y) < (b.jay ? 4.84 : 9), atp = b.mode === 1 && b.perch >= 0 && !(gone && k > 10) ? at(b.perch) : null;
    const need = b.mode === 1 ? !!atp && (scare || b.wait - 1 <= 0) : b.mode === 0 && scare, cx = atp ? atp.x : b.x;
    const perches = need ? sperch.map((pr, i) => ({ i, ...at(i) })).filter(p => Math.abs(sperch[p.i].px - cx) < 16) : [];
    const c0 = Math.floor(b.x) - 1, w = { at: atp ? { ok: true, ...atp } : { ok: false, x: 0, y: 0 }, homey: b.hashome ? sland[Math.max(0, Math.min(SWW - 1, Math.floor(b.home)))] : 0, land: sland[Math.max(0, Math.min(SWW - 1, Math.floor(b.x)))], c0, ww: SWW,
      land3: [0, 1, 2].map(q => sland[Math.max(0, Math.min(SWW - 1, c0 + q))]), rivers: sriv.filter(v => v.x0 < b.x + 2 && v.x1 > b.x - 2), perches };
    const r = { a: rnd(), b: rnd(), c: rnd(), d: rnd(), e: rnd(), f: rnd() }; if (sSteps % 6 === 0) sin_.push([b, gnome, w, r]); sSteps++;
    const a1 = songH(b, gnome, w, r), a2 = songJS(b, gnome, w, r);
    if (scanon(a1) === scanon(a2)) sSame++; else if (!sFirst) sFirst = { bird: b, gnome, w, r, hazel: scanon(a1), js: scanon(a2) };
    const B = a2.bird; if (B.mode === 2 && b.mode !== 2) { sseen.flights++; if (B.fly.next === 1) sseen.toPerch++; else sseen.home++; } if (b.mode === 1 && B.mode === 0) sseen.lost++; if (b.mode === 2 && B.mode !== 2) sseen.landed++;
    if (B.hop.on && !b.hop.on) sseen.hops++; if (B.peck > b.peck) sseen.pecks++; if (a2.call) sseen.calls++;
    b = B; } }
let dSame = 0, dFirst = null, dSteps = 0; const din = [], dseen = { turns: 0, dabs: 0, fled: 0, calls: 0 };
for (let i = 0; i < N; i++) { const swan = rnd() < 0.3, w = { x: 20 + Math.floor(rnd() * 100), w: 3 + Math.floor(rnd() * 18), level: 38 + rnd() * 4 };
  let b = { swan, x: w.x + 0.8 + rnd() * (w.w - 1.6), tx: 0, face: rnd() < 0.5 ? -1 : 1, dab: rnd() < 0.2 ? Math.floor(rnd() * 30) : 0, wait: Math.floor(rnd() * 40) - 3 };
  const gnome = { x: b.x + (rnd() - 0.5) * (rnd() < 0.5 ? 6 : 30), y: w.level - 3 + rnd() * 2, wet: rnd() < 0.3 };
  for (let k = 0; k < 30; k++) { const r = { a: rnd() < 0.1 ? rnd() * 0.03 : rnd(), b: rnd(), c: rnd(), d: rnd(), e: rnd(), f: rnd() }; if (dSteps % 6 === 0) din.push([b, gnome, w, r]); dSteps++;
    const a1 = swimH(b, gnome, w, r), a2 = swimJS(b, gnome, w, r);
    if (wcanon2(a1) === wcanon2(a2)) dSame++; else if (!dFirst) dFirst = { bird: b, gnome, w, r, hazel: wcanon2(a1), js: wcanon2(a2) };
    if (a2.bird.wait > b.wait) dseen.turns++; if (a2.bird.dab > b.dab) dseen.dabs++; if (a2.call) dseen.calls++; b = a2.bird; } }
const stime = (fn, list) => { const ts = []; for (let k = 0; k < 7; k++) { const t = performance.now(); for (const [b, g, w, r] of list) fn(b, g, w, r); ts.push((performance.now() - t) * 1000 / list.length); } ts.sort((x, y) => x - y); return ts[3]; };
stime(songJS, sin_); stime(songH, sin_); const sjs = stime(songJS, sin_), shz = stime(songH, sin_); FRESH("a songbird", songJS, songH, built.value.xbird, sin_); FRESH("a duck or a swan", swimJS, swimH, null, din); stime(swimJS, din); stime(swimH, din); const djs = stime(swimJS, din), dhz = stime(swimH, din); sin_.length = 0; din.length = 0;
console.log(`a songbird's mind: Bird.step the same as the page's songJS at ${sSame} of ${sSteps} steps of 20,000 made-up birds${sFirst ? "; first differs: " + JSON.stringify(sFirst).slice(0, 3000) : ""} (flights begun ${sseen.flights}, to a perch ${sseen.toPerch}, home ${sseen.home}; landed ${sseen.landed}; perches lost ${sseen.lost}; hops ${sseen.hops}; pecks ${sseen.pecks}; calls ${sseen.calls})`);
console.log(`a step of a songbird: the page's JavaScript ${sjs.toFixed(3)} µs, Hazel's Bird.step through the jit ${shz.toFixed(3)} µs (${(shz / sjs).toFixed(1)}×)`);
console.log(`a duck's or swan's mind: Bird.swim the same as the page's swimJS at ${dSame} of ${dSteps} steps of 20,000 made-up ducks and swans${dFirst ? "; first differs: " + JSON.stringify(dFirst) : ""} (new aims ${dseen.turns}, dabs ${dseen.dabs}, calls ${dseen.calls})`);
console.log(`a step of a duck or swan: the page's JavaScript ${djs.toFixed(3)} µs, Hazel's Bird.swim through the jit ${dhz.toFixed(3)} µs (${(dhz / djs).toFixed(1)}×)`);
result.bird = { steps: sSteps, same: sSame, first: sFirst, seen: sseen, jsUs: sjs, hazelUs: shz };
result.fresh = FRESH_ON ? freshOut : undefined;
result.swim = { steps: dSteps, same: dSame, first: dFirst, seen: dseen, jsUs: djs, hazelUs: dhz };
// (0.0.146) the flying jellyfish: Hazel's Jelly.step against the page's jellyJS, first on one long flight through the made-up
// world (hovering, pulses held and pressed again and again, leaning, sinking, into ground and through water), then on 20,000
// made-up jellyfish at any beat, lean and speed, keys of any kind
const jsrc = app.slice(app.indexOf("  function jellyJS("), app.indexOf("  function jellyStep("));
const jellyJS = new Function(jsrc + "; return jellyJS;")(), jellyH = built.value.jelly;
const jkey = f => JSON.stringify([f.gnome.x, f.gnome.y, f.gnome.face, f.gnome.air, f.gnome.ground, f.jelly.vx, f.jelly.vy, f.jelly.beat, f.jelly.lean, f.jelly.face]);
let jSame = 0, jFirst = null, jSteps = 0; const jseen = { pulses: 0, bonks: 0, part: 0, hover: 0, wet: 0, risen: 0 };
const jin = [];
const jcheck = (gg, pp, jj) => { const n = near(gg), a = jellyH(gg, n, pp, jj), b = jellyJS(gg, n, pp, jj); jSteps++; jin.push([gg, n, pp, jj]);
  if (jkey(a) === jkey(b)) jSame++; else if (!jFirst) jFirst = { step: jSteps, in: { g: gg, p: pp, j: jj }, hazel: jkey(a), js: jkey(b) };
  if (b.jelly.beat === 1) jseen.pulses++; if (b.jelly.vy === 0 && jj.vy !== 0 && (pp.up || pp.down || jj.vy < 0)) jseen.bonks++;
  if (b.gnome.y !== gg.y && b.gnome.y - gg.y !== b.jelly.vy && b.jelly.vy === 0) jseen.part++;
  if (!pp.up && !pp.down && pp.dx === 0 && b.jelly.vx === 0 && b.jelly.vy === 0) jseen.hover++;
  if ((code(Math.floor(b.gnome.x / 1000), Math.floor((b.gnome.y - 500) / 1000)) & 16) === 16) jseen.wet++;
  return b; };
{ let gg = { ...gnome0, x: 30500, y: 30000 }, jj = { vx: 0, vy: 0, beat: 0, lean: 0, face: 1 }, upWas = false; const y0 = gg.y;
  for (let i = 0; i < N; i++) { const ph = Math.floor(i / 90) % 12;
    const dx = [0, 0, 1, 1, -1, 0, -1, 1, 0, 0, -1, 1][ph], up = ph === 1 || ph === 3 || (ph === 7 && rnd() < 0.5) || (ph === 10 && i % 9 < 4), down = ph === 5 || ph === 8 || ph === 11;
    const pp = { dx, up, down, jump: up && !upWas, dig: false, dash: false }; upWas = up;
    const b = jcheck(gg, pp, jj); gg = { ...gg, ...b.gnome }; jj = { ...b.jelly }; if (gg.y < y0 - 8000) jseen.risen++;
    if (i % 2000 === 1999) { gg = { ...gg, x: 3000 + Math.floor(rnd() * 74000), y: 3000 + Math.floor(rnd() * 50000) }; } } }
for (let i = 0; i < N; i++) {
  const gg = { ...gnome0, x: 1000 + Math.floor(rnd() * 77000), y: 1000 + Math.floor(rnd() * 57000), air: Math.floor(rnd() * 700), face: rnd() < 0.5 ? -1 : 1 };
  const pp = { dx: Math.floor(rnd() * 3) - 1, up: rnd() < 0.4, down: rnd() < 0.25, jump: rnd() < 0.3, dig: false, dash: false };
  const jj = { vx: Math.round((rnd() * 2 - 1) * 400), vy: Math.round((rnd() * 2 - 1) * 450), beat: rnd() < 0.3 ? 0 : Math.floor(rnd() * 41), lean: Math.round((rnd() * 2 - 1) * 450), face: rnd() < 0.5 ? -1 : 1 };
  jcheck(gg, pp, jj); }
const jtime = f => { const ts = []; for (let k = 0; k < 7; k++) { const t = performance.now(); for (const [a1, a2, a3, a4] of jin) f(a1, a2, a3, a4); ts.push((performance.now() - t) * 1000 / jin.length); } ts.sort((x, y) => x - y); return ts[3]; };
jtime(jellyJS); jtime(jellyH); const jjs = jtime(jellyJS), jhz = jtime(jellyH);
console.log(`the flying jellyfish: Jelly.step the same as the page's jellyJS at ${jSame} of ${jSteps} steps${jFirst ? "; first differs: " + JSON.stringify(jFirst).slice(0, 2000) : ""} (seen: ${JSON.stringify(jseen)})`);
console.log(`a step of the jellyfish: the page's JavaScript ${jjs.toFixed(3)} µs, Hazel's Jelly.step through the jit ${jhz.toFixed(3)} µs (${(jhz / jjs).toFixed(1)}×)`);
FRESH("the jellyfish", jellyJS, jellyH, null, jin);
result.jelly = { steps: jSteps, same: jSame, first: jFirst, seen: jseen, jsUs: jjs, hazelUs: jhz };
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
process.exit(same === N && tSame === N && rSame === N && bSame === N && pSame === N && pRealSame === N && wSame === N * 3 && uSame === uSteps && fSame === fSteps && sSame === sSteps && dSame === dSteps && jSame === jSteps ? 0 : 1);
