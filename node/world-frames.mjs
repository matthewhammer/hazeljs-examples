// node/world-frames.mjs (^ticket(902); Matthew, 2026-11-27: "when I was demoing gnome world (while using zoom), I used the
// 'speed run' button and I noticed that the frame rate was very poor, and the 'worst time' reported in the HUD was hundreds of
// ms, well above 16.7 ms. can we do a deep analysis of the current performance of a speed run"). For a GitHub runner, NOT the
// laptop: headless Chrome over its DevTools protocol (cdp.mjs). Gnome world's 🏃 speed run as the page plays it, its own frames
// and their drawing, from a fresh world (seed 7), each frame recorded by the page (PERF.rec: the frame's gap, its steps, the
// slowest step and where that step's time went, ⏱'s parts; the drawing's parts; the run's phase), and the page's thread sampled
// (V8's CPU profiler, a sample each SAMPLE_US), the samples put on the page's clock (a marked busy wait, found in the profile)
// so that each slow frame's samples can be named: which functions, the garbage collector among them.
// Setups (each a fresh page): Hazel's rules (as the page loads them: compiled ahead of time) and ⚡ plain JavaScript, at
// 1280×800; Hazel's rules full screen on a 2× display (1920×1080 CSS px, 3840×2160 canvas px); Hazel's rules with the CPU 4×
// slower (Chrome's throttling: a laptop busy with a video call, roughly).
//   node node/world-frames.mjs [base url] [out dir]     (the site served at the base url: python3 -m http.server)
import fs from "node:fs";
import path from "node:path";
import { chrome } from "./cdp.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:8000/", OUT = process.argv[3] || "world-frames";
const RUN_MS = +(process.env.RUN_MS || 120000), DIG_MS = +(process.env.DIG_MS || 15000), SAMPLE_US = +(process.env.SAMPLE_US || 500);
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
// (before and after on one runner, in turn: two runs of the job met different CPUs, AMD EPYC 9V45 and 7763, and a step's time
// differed by 70% between them. "before" is 0.0.148 with the frame record (perf/902-frames 5e3734e), checked out by the workflow
// under old/0.0.148/; "after", this checkout)
const B148 = "old/0.0.148/", B149 = "old/0.0.149/";
// (^ticket(904), ^ticket(905), ^report(69)) 0.0.149 against 0.0.150 (the water's passes in locals, the run's way by A*), and
// 0.0.150 with the water in Hazel, the way in Hazel, and the water's waking threshold at a thousandth (each a query of the page)
const SETUPS_904 = [
  { name: "0.0.149", dir: B149, rules: "hazel", w: 1280, h: 800, dpr: 1, cpu: 1 },
  { name: "0.0.150", rules: "hazel", w: 1280, h: 800, dpr: 1, cpu: 1 },
  { name: "water-hazel", q: "&water=hazel", rules: "hazel", w: 1280, h: 800, dpr: 1, cpu: 1 },
  { name: "way-hazel", q: "&way=hazel", rules: "hazel", w: 1280, h: 800, dpr: 1, cpu: 1 },
  { name: "wateps-1e-3", q: "&wateps=0.001", rules: "hazel", w: 1280, h: 800, dpr: 1, cpu: 1 },
];
const SETUPS_902 = [
  { name: "before", dir: B148, rules: "hazel", w: 1280, h: 800, dpr: 1, cpu: 1 },
  { name: "after", rules: "hazel", w: 1280, h: 800, dpr: 1, cpu: 1 },
  { name: "after-plain", rules: "plain", w: 1280, h: 800, dpr: 1, cpu: 1 },
  { name: "before-2x-full", dir: B148, rules: "hazel", w: 1920, h: 1080, dpr: 2, cpu: 1 },
  { name: "after-2x-full", rules: "hazel", w: 1920, h: 1080, dpr: 2, cpu: 1 },
  { name: "before-cpu4", dir: B148, rules: "hazel", w: 1280, h: 800, dpr: 1, cpu: 4 },
  { name: "after-cpu4", rules: "hazel", w: 1280, h: 800, dpr: 1, cpu: 4 },
  // (then: Gnome world 0.0.103 of 2026-11-24, ^report(64)'s "then", before its pieces were moved into Hazel: checked out by the
  // workflow under old/0.0.103/, its rules built at load by today's library; its frames timed by a requestAnimationFrame of our
  // own, as it has no record of its own)
  { name: "then-0.0.103", old: "0.0.103", rules: "hazel", w: 1280, h: 800, dpr: 1, cpu: 1 },
];
const SETUPS = ((process.env.SETS || "904") === "902" ? SETUPS_902 : SETUPS_904).filter(s => !ONLY || ONLY.includes(s.name));
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const logLines = [], log = (...a) => { const s = a.join(" "); console.log(s); logLines.push(s); };
const READY = "!!(window.WorldTest && WorldTest.S.g && WorldTest.S.built && WorldTest.S.built.ok && WorldTest.bot)";
const q = (xs, p) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const f1 = x => (+x).toFixed(1);

// (in the page: a busy wait in a function of its own name, 30 ms, at a time on the page's clock; found again in the profile)
const MARK = `(() => { const t0 = performance.now(); (function __worldFramesMark() { while (performance.now() - t0 < 30) {} })(); return t0; })()`;

function profileTimes(P) {
  // each sample's time (µs, the profiler's clock) and node; the nodes by id
  const byId = new Map(P.nodes.map(n => [n.id, n])); let t = P.startTime; const ts = [];
  for (let i = 0; i < P.samples.length; i++) { t += P.timeDeltas[i]; ts.push(t); }
  return { byId, ts };
}
// (what a node is: the garbage collector, V8's own, a function of the page, of plain.js, of the Hazel library, of the rules
// compiled from Hazel (code made by new Function, no url), a native (canvas, DOM; script 0))
function kindOf(n) {
  const cf = n.callFrame, u = cf.url || "", f = cf.functionName;
  if (f === "(garbage collector)") return "garbage collection";
  if (f === "(program)" || f === "(idle)" || f === "(root)") return f;
  if (/\/world\/app\.js/.test(u)) return "the page (app.js)";
  if (/\/world\/plain\.js/.test(u)) return "plain.js";
  if (/hazel|lib\.js/i.test(u) && !/world\//.test(u)) return "the Hazel library";
  if (/\/dig\/sound\.js/.test(u)) return "sound";
  if (u) return "other script: " + u.replace(/^.*\//, "");
  if (cf.scriptId && cf.scriptId !== "0") return "the rules compiled from Hazel";
  return "native (canvas, DOM, builtins)";
}
const nameOf = n => { const cf = n.callFrame; return `${cf.functionName || "(anonymous)"} ${cf.url ? cf.url.replace(/^.*\//, "") + ":" + (cf.lineNumber + 1) : cf.scriptId && cf.scriptId !== "0" ? "(compiled rules)" : "(native)"}`; };

async function runSetup(C, U) {
  const p = await C.open("about:blank", U.name);
  await p.send("Emulation.setDeviceMetricsOverride", { width: U.w, height: U.h, deviceScaleFactor: U.dpr, mobile: false });
  await p.send("Page.navigate", { url: BASE + (U.old ? `old/${U.old}/` : U.dir || "") + "world/?test=1" + (U.q || "") });
  if (U.old) return runOld(p, U);
  const t0 = Date.now(); for (;;) { let ok = false; try { ok = await p.eval(READY); } catch (e) { /* navigating */ } if (ok) break; if (Date.now() - t0 > 300000) throw new Error(`${U.name}: the rules not built after 300 s`); await sleep(500); }
  const info = await p.eval(`(() => { const T = WorldTest, S = T.S; T.restartNow(); T.setRules(${JSON.stringify(U.rules)}); S.asking = false; T.PERF.on = true;
    const cv = document.getElementById("world"); return { seed: S.seed, aot: !!(S.built && S.built.aot), compiled: !!S.built.compiled, canvas: cv.width + "×" + cv.height, tile: T.tile(), dpr: devicePixelRatio, rules: S.rules }; })()`);
  log(`== ${U.name}: ${U.w}×${U.h} CSS px at ${U.dpr}x (canvas ${info.canvas}, a tile ${info.tile} px), CPU ${U.cpu}x; rules ${info.rules}${info.rules === "hazel" ? (info.aot ? " (compiled ahead of time)" : info.compiled ? " (compiled by hazel-jit at load)" : " (interpreted)") : ""}; seed ${info.seed}`);
  if (U.cpu > 1) await p.send("Emulation.setCPUThrottlingRate", { rate: U.cpu });
  await sleep(1500);   // (the page's own frames a moment, the world drawn once)
  await p.send("Profiler.enable"); await p.send("Profiler.setSamplingInterval", { interval: SAMPLE_US }); await p.send("Profiler.start");
  const mark0 = await p.eval(MARK);
  await p.eval(`(() => { const T = WorldTest; T.TP.ms = {}; T.TP.on = true; T.PERF.rec = []; T.bot(true); return T.BOT.on; })()`);
  const w0 = Date.now(); let digAt = 0, last = 0;
  for (;;) { await sleep(1000); const st = await p.eval(`(() => { const B = WorldTest.BOT; return { on: B.on, phase: B.phase, n: WorldTest.PERF.rec.length }; })()`);
    const el = Date.now() - w0; if (el - last >= 15000) { last = el; log(`  ${f1(el / 1000)} s: phase ${st.phase || "-"}, ${st.n} frames`); }
    if (st.phase === "dig" && !digAt) digAt = Date.now();
    if (!st.on || el > RUN_MS || (digAt && Date.now() - digAt > DIG_MS)) break; }
  const R = await p.eval(`(() => { const T = WorldTest, B = T.BOT; T.TP.on = false; const rec = T.PERF.rec; T.PERF.rec = null; B.on && T.bot(false);
    return { rec, tp: T.TP.ms, report: B.report, phase: B.phase, items: T.S.items.filter(i => i.taken).length + "/" + T.S.items.length, gems: B.gems + "/" + B.gemsAll, parts: B.parts + "/" + B.partsAll }; })()`);
  const P = (await p.send("Profiler.stop")).profile;
  if (U.cpu > 1) await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  p.ws.close();
  return { U, info, ...R, profile: P, mark0 };
}

// (an old page: its frames timed by our own requestAnimationFrame, the run started by its 🏃 button, the thread sampled the same way)
async function runOld(p, U) {
  const t0 = Date.now(); for (;;) { let ok = false; try { ok = await p.eval("!!(window.WorldTest && WorldTest.S && WorldTest.S.g && WorldTest.S.built && WorldTest.S.built.ok && document.getElementById('run'))"); } catch (e) { /* navigating */ }
    if (ok) break; if (Date.now() - t0 > 300000) throw new Error(`${U.name}: the rules not built after 300 s`); await sleep(500); }
  const info = await p.eval(`(() => { const S = WorldTest.S, cv = document.getElementById("world"); S.asking = false; return { seed: S.seed, compiled: !!S.built.compiled, canvas: cv.width + "×" + cv.height, tile: WorldTest.tile ? WorldTest.tile() : 0, built: Math.round(S.built.ms || 0) }; })()`);
  log(`== ${U.name}: ${U.w}×${U.h} CSS px at ${U.dpr}x (canvas ${info.canvas}, a tile ${info.tile} px); Gnome world ${U.old}, its rules ${info.compiled ? "compiled by hazel-jit" : "interpreted"} at load (${info.built} ms) by today's library; seed ${info.seed}`);
  await sleep(1500);
  await p.send("Profiler.enable"); await p.send("Profiler.setSamplingInterval", { interval: SAMPLE_US }); await p.send("Profiler.start");
  const mark0 = await p.eval(MARK);
  await p.eval(`(() => { window.__rec = []; let last = 0; const loop = t => { if (last) __rec.push({ t: +last.toFixed(1), gap: +(t - last).toFixed(1) }); last = t; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    document.getElementById("run").click(); return true; })()`);
  const w0 = Date.now(); let last = 0;
  for (;;) { await sleep(1000); const st = await p.eval(`(() => ({ on: document.getElementById("run").getAttribute("aria-pressed") === "true", n: __rec.length, phase: (WorldTest.BOT || {}).phase || "" }))()`);
    const el = Date.now() - w0; if (el - last >= 15000) { last = el; log(`  ${f1(el / 1000)} s: phase ${st.phase || "-"}, ${st.n} frames`); }
    if (!st.on || el > RUN_MS || (st.phase === "dig")) break; }
  const R = await p.eval(`(() => { const rec = __rec.slice(); __rec.length = 0; const B = WorldTest.BOT || {}, S = WorldTest.S; const draws = (WorldTest.PERF || {}).draws || [];
    return { rec: rec.map((r, i) => ({ ...r, gap: i ? rec[i - 1].gap : 0 })), report: B.report || null, phase: B.phase || "", items: S.items.filter(i => i.taken).length + "/" + S.items.length, gems: (B.gems || 0) + "/" + (B.gemsAll || 0), parts: (B.parts || 0) + "/" + (B.partsAll || 0), tp: {} }; })()`);
  const P = (await p.send("Profiler.stop")).profile; p.ws.close();
  return { U, info, ...R, profile: P, mark0, old: true };
}

function analyze(X) {
  const { U, rec, profile: P, mark0 } = X;
  // ---- the frames
  const gaps = rec.map(r => r.gap).filter(g => g > 0), n = gaps.length;
  const over = ms => gaps.filter(g => g > ms).length;
  log(`${U.name}: ${rec.length} frames recorded; the run: things ${X.items}, tree parts ${X.parts}, gems ${X.gems}, at phase ${X.phase || "(done)"}${X.report ? `; its time ${X.report.time}, real ${f1(X.report.realMs / 1000)} s` : ""}`);
  log(`  frame gap: median ${f1(q(gaps, 0.5))} ms (${f1(1000 / Math.max(1, q(gaps, 0.5)))} fps), p90 ${f1(q(gaps, 0.9))}, p99 ${f1(q(gaps, 0.99))}, worst ${f1(Math.max(...gaps))}; over 16.7 ms ${over(16.7)} of ${n}, over 33 ${over(33.4)}, over 50 ${over(50)}, over 100 ${over(100)}, over 200 ${over(200)}`);
  if (X.old) return analyzeOld(X, gaps, over);
  const ticks = rec.map(r => r.ticks), draws = rec.map(r => r.draw), ns = rec.map(r => r.n), tmax = rec.map(r => r.tmax);
  const bud = rec.map(r => r.budget).filter(x => x > 0), put = rec.length ? (rec[rec.length - 1].put || 0) - (rec[0].put || 0) : 0, painted = rec.length ? (rec[rec.length - 1].painted || 0) - (rec[0].painted || 0) : 0;
  log(`  the steps' budget a frame: ${bud.length ? `median ${f1(q(bud, 0.5))} ms, from ${f1(Math.min(...bud))} to ${f1(Math.max(...bud))}` : "fixed (12 ms, before 0.0.149)"}; pictures painted ${painted}, put off to a later frame ${put}`);
  log(`  a frame's steps: median ${f1(q(ticks, 0.5))} ms (${q(ns, 0.5)} steps), the slowest step in a frame: median ${f1(q(tmax, 0.5))} ms, p99 ${f1(q(tmax, 0.99))}, worst ${f1(Math.max(...tmax))}; drawing: median ${f1(q(draws, 0.5))} ms, p99 ${f1(q(draws, 0.99))}, worst ${f1(Math.max(...draws))}`);
  // by phase
  const phases = [...new Set(rec.map(r => r.phase))];
  for (const ph of phases) { const R = rec.filter(r => r.phase === ph), g = R.map(r => r.gap).filter(x => x > 0);
    if (g.length) log(`  phase ${ph || "(off)"}: ${R.length} frames, gap median ${f1(q(g, 0.5))} ms, p99 ${f1(q(g, 0.99))}, worst ${f1(Math.max(...g))}; steps a frame ${q(R.map(r => r.n), 0.5)}, drawing median ${f1(q(R.map(r => r.draw), 0.5))} ms`); }
  // the steps' parts (⏱), over the whole run
  const tpAll = Object.entries(X.tp).sort((a, b) => b[1] - a[1]), tpSum = tpAll.reduce((a, [, v]) => a + v, 0);
  log(`  the steps' time by part (⏱, whole run, ${f1(tpSum / 1000)} s): ` + tpAll.slice(0, 14).map(([k, v]) => `${k} ${f1(100 * v / tpSum)}%`).join(" · "));
  const dsum = {}; for (const r of rec) for (const [k, v] of Object.entries(r.dparts || {})) dsum[k] = (dsum[k] || 0) + v;
  const dAll = Object.entries(dsum).sort((a, b) => b[1] - a[1]), dTot = draws.reduce((a, b) => a + b, 0);
  log(`  the drawing by part (whole run, ${f1(dTot / 1000)} s): ` + dAll.slice(0, 14).map(([k, v]) => `${k} ${f1(100 * v / dTot)}%`).join(" · "));
  // ---- the profile: put on the page's clock by the mark
  const { byId, ts } = profileTimes(P);
  let markUs = null; for (let i = 0; i < P.samples.length; i++) { if (byId.get(P.samples[i]).callFrame.functionName === "__worldFramesMark") { markUs = ts[i]; break; } }
  const off = markUs == null ? null : markUs / 1000 - mark0;   // (profile ms - page ms)
  const self = new Map(), kinds = new Map(); let total = 0;
  const add = (m, k, v) => m.set(k, (m.get(k) || 0) + v);
  for (let i = 0; i < P.samples.length; i++) { const node = byId.get(P.samples[i]), dt = (P.timeDeltas[i + 1] || SAMPLE_US) / 1000; if (node.callFrame.functionName === "(idle)") continue; add(self, node.id, dt); add(kinds, kindOf(node), dt); total += dt; }
  log(`  the page's thread, sampled (${(total / 1000).toFixed(1)} s busy; idle left out): ` + [...kinds].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${f1(100 * v / total)}%`).join(" · "));
  log(`  its top functions, self time: ` + [...self].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([id, v]) => `${nameOf(byId.get(id))} ${f1(100 * v / total)}%`).join(" · "));
  // ---- the worst frames: each with its steps, its slowest step's parts, its drawing's parts, and its samples' top functions
  const idx = rec.map((r, i) => i).filter(i => i + 1 < rec.length).sort((a, b) => rec[b + 1].gap - rec[a + 1].gap).slice(0, 25);
  log(`  the 25 worst frames (the work done from a frame to the next; ms):`);
  const worst = [];
  for (const i of idx) { const r = rec[i], span = rec[i + 1].gap;
    let top = []; if (off != null) { const a = (r.t + off) * 1000, b = (rec[i + 1].t + off) * 1000, m = new Map(); let busy = 0;
      for (let j = 0; j < ts.length; j++) { if (ts[j] < a) continue; if (ts[j] > b) break; const node = byId.get(P.samples[j]); if (node.callFrame.functionName === "(idle)") continue; const dt = (P.timeDeltas[j + 1] || SAMPLE_US) / 1000; busy += dt; add(m, nameOf(node), dt); }
      top = [...m].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => `${k} ${f1(v)}`); }
    const tp = Object.entries(r.tpart || {}).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ${f1(v)}`).join(", ");
    const dp = Object.entries(r.dparts || {}).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ${f1(v)}`).join(", ");
    worst.push({ at: r.t, span, phase: r.phase, n: r.n, ticks: r.ticks, tmax: r.tmax, tpart: r.tpart, draw: r.draw, dparts: r.dparts, top });
    log(`   ${f1(span)} ms at ${f1(r.t / 1000)} s, ${r.phase || "-"}: ${r.n} steps ${f1(r.ticks)} (slowest ${f1(r.tmax)}${tp ? ": " + tp : ""}); drawing ${f1(r.draw)}${dp ? " (" + dp + ")" : ""}${top.length ? "; sampled: " + top.join(", ") : ""}`); }
  return { setup: U, info: X.info, frames: rec.length, gaps: { median: q(gaps, 0.5), p90: q(gaps, 0.9), p99: q(gaps, 0.99), worst: Math.max(...gaps), over: { 16.7: over(16.7), 33: over(33.4), 50: over(50), 100: over(100), 200: over(200) } },
    steps: { median: q(ticks, 0.5), n: q(ns, 0.5), tmaxMedian: q(tmax, 0.5), tmaxP99: q(tmax, 0.99), tmaxWorst: Math.max(...tmax) }, drawing: { median: q(draws, 0.5), p99: q(draws, 0.99), worst: Math.max(...draws) },
    tp: Object.fromEntries(tpAll), draw: Object.fromEntries(dAll), kinds: Object.fromEntries(kinds), busyMs: total, top: [...self].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([id, v]) => [nameOf(byId.get(id)), +v.toFixed(1)]), worst, calibrated: off != null,
    run: { items: X.items, parts: X.parts, gems: X.gems, phase: X.phase, report: X.report }, budget: bud.length ? { median: q(bud, 0.5), min: Math.min(...bud), max: Math.max(...bud) } : null, painted, put };
}

function analyzeOld(X, gaps, over) {
  const { U, rec, profile: P, mark0 } = X, { byId, ts } = profileTimes(P);
  const self = new Map(), kinds = new Map(); let total = 0; const add = (m, k, v) => m.set(k, (m.get(k) || 0) + v);
  for (let i = 0; i < P.samples.length; i++) { const node = byId.get(P.samples[i]), dt = (P.timeDeltas[i + 1] || SAMPLE_US) / 1000; if (node.callFrame.functionName === "(idle)") continue; add(self, node.id, dt); add(kinds, kindOf(node), dt); total += dt; }
  log(`  the page's thread, sampled (${(total / 1000).toFixed(1)} s busy; idle left out): ` + [...kinds].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${f1(100 * v / total)}%`).join(" · "));
  log(`  its top functions, self time: ` + [...self].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([id, v]) => `${nameOf(byId.get(id))} ${f1(100 * v / total)}%`).join(" · "));
  let markUs = null; for (let i = 0; i < P.samples.length; i++) if (byId.get(P.samples[i]).callFrame.functionName === "__worldFramesMark") { markUs = ts[i]; break; }
  const off = markUs == null ? null : markUs / 1000 - mark0, worst = [];
  const idx = rec.map((r, i) => i).filter(i => i + 1 < rec.length).sort((a, b) => rec[b + 1].gap - rec[a + 1].gap).slice(0, 12);
  log(`  the 12 worst frames (sampled functions, ms):`);
  for (const i of idx) { const r = rec[i], span = rec[i + 1].gap; let top = [];
    if (off != null) { const a = (r.t + off) * 1000, b = (rec[i + 1].t + off) * 1000, m = new Map();
      for (let j = 0; j < ts.length; j++) { if (ts[j] < a) continue; if (ts[j] > b) break; const node = byId.get(P.samples[j]); if (node.callFrame.functionName === "(idle)") continue; add(m, nameOf(node), (P.timeDeltas[j + 1] || SAMPLE_US) / 1000); }
      top = [...m].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => `${k} ${f1(v)}`); }
    worst.push({ at: r.t, span, top }); log(`   ${f1(span)} ms at ${f1(r.t / 1000)} s${top.length ? ": " + top.join(", ") : ""}`); }
  return { setup: U, info: X.info, frames: rec.length, gaps: { median: q(gaps, 0.5), p90: q(gaps, 0.9), p99: q(gaps, 0.99), worst: Math.max(...gaps), over: { 16.7: over(16.7), 33: over(33.4), 50: over(50), 100: over(100), 200: over(200) } },
    kinds: Object.fromEntries(kinds), busyMs: total, top: [...self].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([id, v]) => [nameOf(byId.get(id)), +v.toFixed(1)]), worst, calibrated: off != null, run: { items: X.items, parts: X.parts, gems: X.gems, phase: X.phase, report: X.report } };
}

const result = { when: new Date().toISOString(), base: BASE, runMs: RUN_MS, digMs: DIG_MS, sampleUs: SAMPLE_US, setups: {} };
let C = null, code = 0;
try {
  C = await chrome();
  for (const U of SETUPS) {
    try { const X = await runSetup(C, U); const A = analyze(X); result.setups[U.name] = A;
      fs.writeFileSync(path.join(OUT, `frames-${U.name}.json`), JSON.stringify(X.rec)); }
    catch (e) { log(`${U.name}: FAILED: ` + (e && e.stack || e)); code = 1; }
  }
} catch (e) { log("FAIL: " + (e && e.stack || e)); code = 1; }
fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify(result, null, 1));
fs.writeFileSync(path.join(OUT, "log.txt"), logLines.join("\n") + "\n");
if (C) C.close();
process.exit(code);
