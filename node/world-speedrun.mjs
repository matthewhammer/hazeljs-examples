// node/world-speedrun.mjs (^report(65), ^ticket(873); Matthew, 2026-11-25: "please time a speedrun for a 3 way comparison:
// interpreter (to some limit; no more than 5 minutes total), hazel jit, as of today, plain JS"). For a GitHub runner, NOT the
// laptop: headless Chrome over its DevTools protocol (cdp.mjs). Gnome world's 🏃 speed run, from a fresh world (seed 7, Dad),
// to its end (every thing to be found, every part of every big tree, every gem; the dig that follows it not run), three ways,
// the page the same but for the rules each step calls (World.step, the beavers' World.beaver, World.water_row):
//   jit          the rules compiled by hazel-jit as the page loads (the hazeljs branch's library, build.hazel.org, today's);
//   plain        world/plain.js: the same rules in plain JavaScript, put in the place of those three;
//   interpreted  ?interpreted: the same library's interpreter (Hazel.runProgram), for INTERP_MS at most (four minutes).
// Each way: the steps alone (the page's own tick, as the speed run steps it, the bot finding its way included; no drawing, the
// same for all three, so no roots grown as the view nears them), timed in chunks of CHUNK steps; the time in each rule, each
// call timed (Chrome's clock, a tenth of a millisecond, jittered: a sum over many calls, not one call's); a fingerprint of the
// world at each chunk's end (the frame, the gnome, the beavers, the things and gems found), so the runs are compared step for
// step. Then the rules alone: World.step replayed on the hazel-jit run's own calls, every SAMPLE-th one across the whole run,
// each way (the interpreter on as many as REPLAY_MS lets it), every answer compared with hazel-jit's.
//   node node/world-speedrun.mjs [base url] [out dir]     (the site served at the base url: python3 -m http.server)
import fs from "node:fs";
import path from "node:path";
import { chrome } from "./cdp.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:8000/", OUT = process.argv[3] || "world-speedrun";
const STEPS_MAX = +(process.env.STEPS_MAX || 400000), CHUNK = +(process.env.CHUNK || 2000), INTERP_MS = +(process.env.INTERP_MS || 220000);
// (the interpreter's five minutes at most: its run INTERP_MS, its replay 15 s checking and 15 s timing, two builds of some seconds)
const SAMPLE = 10, REPLAY_MS = 3000, REPLAY_INTERP_MS = 15000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const logLines = [], log = (...a) => { const s = a.join(" "); console.log(s); logLines.push(s); };
const READY = "!!(window.WorldTest && WorldTest.S.g && WorldTest.S.built && WorldTest.S.built.ok && WorldTest.steps)";
const GN = ["x", "y", "vx", "vy", "face", "ground", "climb", "swim", "under", "air", "gear", "tool", "kit", "dc", "dr", "dt", "ev"];

// (in the page: a fresh world, the rules as this way has them, each rule's calls counted and timed, World.step's calls sampled
// (hazel-jit's run), the run started)
const SETUP = way => `(() => {
  const T = WorldTest, S = T.S; S.asking = true; T.restartNow(); S.asking = true;
  const V = S.built.value, R = window.__R = { way: ${JSON.stringify(way)}, calls: {}, ms: {}, samples: [], swapped: [] };
  if (R.way === "plain") for (const k of ["step", "beaver", "water_row"]) { V[k] = WorldPlain[k]; R.swapped.push(k); }
  for (const k of Object.keys(V)) { const f = V[k]; if (typeof f !== "function") continue; R.calls[k] = 0; R.ms[k] = 0;
    V[k] = function (...a) { const t = performance.now(); const r = f.apply(this, a); R.ms[k] += performance.now() - t; R.calls[k]++; return r; }; }
  window.__pickG = g => (${JSON.stringify(GN)}).map(k => (typeof g[k] === "boolean" ? (g[k] ? 1 : 0) : g[k]));
  if (R.way === "jit") { const st = V.step; let n = 0; V.step = (g, nn, p) => { const r = st(g, nn, p); if (++n % ${SAMPLE} === 0) R.samples.push([{ ...g }, { ...nn }, { ...p }, __pickG(r)]); return r; }; }
  T.bot(true); return { seed: S.seed, hero: S.hero, compiled: !!S.built.compiled, buildMs: Math.round(S.built.ms || 0), swapped: R.swapped }; })()`;
// (the world's fingerprint: FNV-1a over what the run changes)
const PRINT = `(() => { const S = WorldTest.S; const t = JSON.stringify([S.frame, __pickG(S.g), S.beavers.map(B => B.b), S.found || 0, S.items.map(i => i.taken ? 1 : 0), WorldTest.BOT.phase]);
  let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); })()`;
const STATE = `(() => { const S = WorldTest.S, B = WorldTest.BOT; return { phase: B.phase, on: B.on, frames: B.frames, items: S.items.filter(i => i.taken).length + "/" + S.items.length, parts: B.parts + "/" + B.partsAll, gems: B.gems + "/" + B.gemsAll, skipped: B.skipped.length, report: B.report }; })()`;

async function openWay(C, way) {
  const p = await C.open("about:blank", way);
  await p.send("Page.navigate", { url: BASE + "world/?test=1" + (way === "interpreted" ? "&interpreted" : "") + (way === "plain" ? "&rules=plain" : "") });
  const t0 = Date.now(); for (;;) { let ok = false; try { ok = await p.eval(READY); } catch (e) { /* navigating */ } if (ok) break; if (Date.now() - t0 > 300000) throw new Error(`${way}: the rules not built after 300 s`); await sleep(500); }
  await p.eval("(WorldTest.S.asking = true, true)");   // (the page's own frames step nothing: only the run's steps, here)
  if (way === "plain") await p.eval(`new Promise((ok, no) => { const s = document.createElement("script"); s.src = "plain.js?v=" + Date.now(); s.onload = () => ok(true); s.onerror = no; document.head.append(s); })`);
  return p;
}
async function run(C, way, capMs) {
  const p = await openWay(C, way), info = await p.eval(SETUP(way));
  log(`${way}: seed ${info.seed}, ${info.hero}; the rules ${info.compiled ? "compiled by hazel-jit" : "interpreted"}${info.swapped.length ? `, then ${info.swapped.join(", ")} put in plain JavaScript` : ""}; built in ${info.buildMs} ms`);
  const chunks = [], prints = []; let steps = 0, ms = 0; const wall0 = Date.now();
  while (steps < STEPS_MAX) {
    const r = await p.eval(`WorldTest.steps(${CHUNK})`); steps += r.k; ms += r.ms; chunks.push([steps, +r.ms.toFixed(2)]); prints.push([steps, await p.eval(PRINT)]);
    if (steps % 20000 < CHUNK || r.k < CHUNK) { const st = await p.eval(STATE); log(`  ${steps} steps, ${(ms / 1000).toFixed(1)} s: ${st.phase}, things ${st.items}, tree parts ${st.parts}, gems ${st.gems}`); }
    if (r.k < CHUNK) break;
    if (capMs && Date.now() - wall0 > capMs) { log(`  stopped at ${capMs / 1000} s (its limit), ${steps} steps in`); break; }
  }
  const st = await p.eval(STATE), R = await p.eval("(() => ({ calls: __R.calls, ms: __R.ms }))()");
  const done = st.phase === "dig" || !st.on;
  log(`${way}: ${done ? "the speed run done" : "not done"} in ${steps} steps; the steps ${(ms / 1000).toFixed(2)} s (${(ms / steps * 1000).toFixed(1)} µs a step); in the rules ${(Object.values(R.ms).reduce((a, b) => a + b, 0) / 1000).toFixed(2)} s: ` +
    Object.keys(R.calls).filter(k => R.calls[k]).map(k => `${k} ${R.calls[k]} calls, ${(R.ms[k] / 1000).toFixed(2)} s`).join("; "));
  return { way, info, done, steps, ms, chunks, prints, state: st, rules: R, page: p };
}
// (World.step replayed on the samples, as many times round as the time lets: µs a call; each answer against hazel-jit's)
const REPLAY = (fn, budget) => `(() => { const xs = window.__samples, f = ${fn}; let n = 0, same = 0, first = null; const t0 = performance.now();
  for (const [g, nn, p, want] of xs) { const got = __pickG(f(g, nn, p)); n++; if (JSON.stringify(got) === JSON.stringify(want)) same++; else if (!first) first = { at: n, want, got }; if (performance.now() - t0 > ${budget}) break; }
  const checkMs = performance.now() - t0, m = n;
  let rounds = 0, k = 0; const t1 = performance.now(); while (performance.now() - t1 < ${budget}) { const [g, nn, p] = xs[k]; f(g, nn, p); k = (k + 1) % m; rounds++; }
  return { checked: m, same, first, us: (performance.now() - t1) * 1000 / rounds, calls: rounds, checkMs }; })()`;

const result = { when: new Date().toISOString(), base: BASE, chunk: CHUNK, sample: SAMPLE, interpMs: INTERP_MS, ways: {} };
let C = null, code = 0;
try {
  C = await chrome();
  const lib = { ua: null };
  // ---- 1. hazel-jit: the whole run; its World.step calls sampled
  const J = await run(C, "jit", 0); lib.ua = await J.page.eval("navigator.userAgent");
  const samples = await J.page.eval("__R.samples.map(([g, nn, p, w]) => [Object.fromEntries(Object.entries(g).filter(([k]) => k !== 'climbPack')), nn, p, w])");
  fs.writeFileSync(path.join(OUT, "step-samples.json"), JSON.stringify(samples));
  log(`  World.step's calls sampled: ${samples.length} (every ${SAMPLE}th)`);
  await J.page.eval(`(window.__samples = ${JSON.stringify(samples)}, true)`);
  // ---- 2. plain JavaScript: the whole run
  const P = await run(C, "plain", 0);
  // ---- 3. the interpreter: four minutes at most
  const I = await run(C, "interpreted", INTERP_MS);
  // ---- the runs compared, fingerprint by fingerprint
  const cmp = (a, b) => { const n = Math.min(a.prints.length, b.prints.length); for (let i = 0; i < n; i++) if (a.prints[i][1] !== b.prints[i][1] || a.prints[i][0] !== b.prints[i][0]) return { same: i, of: n, parted: a.prints[i][0] }; return { same: n, of: n }; };
  const jp = cmp(J, P), ji = cmp(J, I);
  log(`compared, a fingerprint each ${CHUNK} steps: plain JS the same as hazel-jit at ${jp.same} of ${jp.of}${jp.parted != null ? ` (parted by step ${jp.parted})` : ""}; the interpreter the same at ${ji.same} of ${ji.of}${ji.parted != null ? ` (parted by step ${ji.parted})` : ""}`);
  // ---- 4. the rules alone, replayed: fresh pages, nothing wrapped
  const RJ = await openWay(C, "jit"); await RJ.eval(`(window.__samples = ${JSON.stringify(samples)}, window.__pickG = g => (${JSON.stringify(GN)}).map(k => (typeof g[k] === "boolean" ? (g[k] ? 1 : 0) : g[k])), true)`);
  await RJ.eval(`new Promise((ok, no) => { const s = document.createElement("script"); s.src = "plain.js?v=" + Date.now(); s.onload = () => ok(true); s.onerror = no; document.head.append(s); })`);
  const rj = await RJ.eval(REPLAY("WorldTest.S.built.value.step", REPLAY_MS)), rp = await RJ.eval(REPLAY("WorldPlain.step", REPLAY_MS));
  const RI = await openWay(C, "interpreted"); await RI.eval(`(window.__samples = ${JSON.stringify(samples)}, window.__pickG = g => (${JSON.stringify(GN)}).map(k => (typeof g[k] === "boolean" ? (g[k] ? 1 : 0) : g[k])), true)`);
  const ri = await RI.eval(REPLAY("WorldTest.S.built.value.step", REPLAY_INTERP_MS));
  for (const [name, r] of [["jit", rj], ["plain", rp], ["interpreted", ri]]) log(`World.step alone, ${name}: ${r.us.toFixed(2)} µs a call (${r.calls} calls); answers the same as hazel-jit's at ${r.same} of ${r.checked} samples${r.first ? `; first not at ${r.first.at}: want ${JSON.stringify(r.first.want)}, got ${JSON.stringify(r.first.got)}` : ""}`);
  const strip = w => ({ info: w.info, done: w.done, steps: w.steps, ms: +w.ms.toFixed(1), chunks: w.chunks, prints: w.prints, state: w.state, rules: w.rules });
  Object.assign(result, { browser: lib.ua, samples: samples.length, ways: { jit: strip(J), plain: strip(P), interpreted: strip(I) }, compared: { plain: jp, interpreted: ji }, replay: { jit: rj, plain: rp, interpreted: ri } });
  if (!J.done) { log("FAIL: the hazel-jit run did not finish the speed run"); code = 1; }
  if (jp.same !== jp.of || !P.done) { log("FAIL: plain JavaScript's run is not the same as hazel-jit's"); code = 1; }
  if (rp.same !== rp.checked) { log("FAIL: plain JavaScript's World.step answers differ"); code = 1; }
} catch (e) { log("FAIL: " + (e && e.stack || e)); code = 1; }
fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify(result, null, 1));
fs.writeFileSync(path.join(OUT, "log.txt"), logLines.join("\n") + "\n");
if (C) C.close();
process.exit(code);
