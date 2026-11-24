// node/world-save-check.mjs (0.0.101; Matthew, 2026-11-24: "let's do a CI check that the automated tour through the world,
// including digging, and saving and then loading all preserves the state exactly"). For a GitHub runner, NOT the laptop: it
// runs headless Chrome. Gnome world, in Chrome driven over its DevTools protocol (no packages: Node's own fetch and WebSocket):
//   1. the girl chosen, the 🏃 speed run tours the world, stepped here a few hundred steps at a time, until it has dug, found
//      things and gems, the beavers have felled a tree and it rains, or the steps run out;
//   2. the world read (WorldTest.digest: each part of the state, read from the world itself, hashed), then 💾 saved, the file's
//      own text;
//   3. 🔄 restarted: the world must be as it was made (the tiles, gems and water of the fresh world), and not as it was;
//   4. 📂 the file loaded: every part must be the same as before the save; saved again, the file must say the same;
//   5. a second page, a new world (another seed) and the boy chosen there, the same file loaded: every part the same again,
//      the girl back, where she was.
// The wildlife, the villagers' strolls and passing dust and smoke are not in a save (they start afresh), so not in the digest.
//   node node/world-save-check.mjs [base url] [out dir]     (the site served at the base url: python3 -m http.server)
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const BASE = process.argv[2] || "http://127.0.0.1:8000/", OUT = process.argv[3] || "world-save";
const CHROME = process.env.CHROME || "google-chrome", PORT = 9333;
const STEPS_MAX = +(process.env.STEPS_MAX || 60000), CHUNK = 300;
fs.mkdirSync(OUT, { recursive: true });
const logLines = [], log = (...a) => { const s = a.join(" "); console.log(s); logLines.push(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (typeof WebSocket !== "function") { console.error("needs Node 22 or later (its WebSocket)"); process.exit(2); }

const prof = fs.mkdtempSync(path.join(os.tmpdir(), "world-save-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "--no-first-run", "--no-default-browser-check",
  "--no-sandbox", "--mute-audio", "--window-size=1280,900", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
chrome.stderr.on("data", () => {});
const done = code => { try { chrome.kill("SIGKILL"); } catch (e) { /* gone */ } fs.writeFileSync(path.join(OUT, "log.txt"), logLines.join("\n") + "\n"); process.exit(code); };

async function devtools() { for (let i = 0; i < 100; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) { /* not yet */ } await sleep(200); } throw new Error("Chrome did not start"); }
class Page {
  static async open(url, name) {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURI(url)}`, { method: "PUT" });
    const t = await r.json(), p = new Page(); p.name = name; p.id = 0; p.wait = new Map(); p.console = [];
    p.ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((ok, no) => { p.ws.onopen = ok; p.ws.onerror = no; });
    p.ws.onmessage = ev => { const m = JSON.parse(ev.data);
      if (m.id && p.wait.has(m.id)) { const w = p.wait.get(m.id); p.wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.ok(m.result); return; }
      if (m.method === "Runtime.consoleAPICalled" && /error|warning/.test(m.params.type)) p.console.push(`[${name} ${m.params.type}] ` + m.params.args.map(a => a.value ?? a.description ?? "").join(" "));
      if (m.method === "Runtime.exceptionThrown") p.console.push(`[${name} exception] ` + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)); };
    await p.send("Runtime.enable"); await p.send("Page.enable");
    return p;
  }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((ok, no) => this.wait.set(id, { ok, no })); }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`${this.name}: ` + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
  async until(expr, what, ms = 180000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await this.eval(expr)) return; await sleep(500); } throw new Error(`${this.name}: ${what}: not after ${ms / 1000} s`); }
  async shot(file) { const r = await this.send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(OUT, file), Buffer.from(r.data, "base64")); }
}
const READY = "!!(window.WorldTest && WorldTest.S.g && WorldTest.S.built && WorldTest.S.built.ok)";
// (the parts of two digests that differ)
const differ = (a, b) => Object.keys({ ...a, ...b }).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
// (the tour's progress: the tiles dug since the world was made, the things and gems found, the trees felled, the rain)
const PROGRESS = `(() => { const T = WorldTest, S = T.S; let dug = 0; for (let i = 0; i < T.bg.length; i++) if (T.bg[i] === 1) dug++;
  return { frame: S.frame, dug: dug - (window.__dug0 || 0), things: S.items.filter(it => it.taken).length, gems: S.found || 0, gemTotal: S.gemTotal,
    felled: S.trees.filter(t => !t.alive).length, fallen: S.fallen.length, rain: S.rain, wind: +(S.windNow || 0).toFixed(3), bot: T.BOT.on, phase: T.BOT.phase,
    gnome: { x: S.g.x, y: S.g.y, gear: !!S.g.gear, tool: S.g.tool || 0, climbPack: !!S.g.climbPack }, hero: S.hero, seed: S.seed }; })()`;

const fail = [];
try {
  await devtools();
  // ---- 1. the tour
  const A = await Page.open(BASE + "world/?test=1", "page 1");
  await A.until(READY, "the rules built and the world made");
  const lib = await A.eval("({ compiled: !!WorldTest.S.built.compiled, ms: Math.round(WorldTest.S.built.ms), seed: WorldTest.S.seed })");
  log(`page 1: the world made (seed ${lib.seed}); the rules ${lib.compiled ? "compiled by hazel-jit" : "interpreted"}, built in ${lib.ms} ms`);
  await A.eval(`(() => { const T = WorldTest; T.S.asking = true; document.querySelector('#heroes button[data-hero="girl"]').click();
    T.restartNow(); T.S.asking = true; let d = 0; for (let i = 0; i < T.bg.length; i++) if (T.bg[i] === 1) d++; window.__dug0 = d; window.__fresh = T.digest(); T.bot(true); return true; })()`);
  let P = null, steps = 0; const t0 = Date.now();
  while (steps < STEPS_MAX) {
    await A.eval(`(WorldTest.S.asking = true, WorldTest.tick(${CHUNK}), true)`); steps += CHUNK;
    P = await A.eval(PROGRESS);
    if (steps % 3000 === 0) log(`  ${steps} steps: dug ${P.dug} tiles, ${P.things} things, ${P.gems}/${P.gemTotal} gems, ${P.felled} trees felled, rain ${P.rain}, wind ${P.wind}, bot ${P.bot ? P.phase || "on" : "off"}`);
    if (!P.bot && steps < 600) await A.eval("WorldTest.bot(true)");
    if (P.dug >= 150 && P.things >= 1 && P.gems >= 3 && P.felled >= 1 && P.rain > 0 && steps >= 12000) break;
  }
  log(`the tour: ${steps} steps in ${((Date.now() - t0) / 1000).toFixed(0)} s: dug ${P.dug} tiles, ${P.things} things, ${P.gems} of ${P.gemTotal} gems, ${P.felled} trees felled (${P.fallen} lying), rain ${P.rain}, wind ${P.wind}; the girl at (${(P.gnome.x / 1000).toFixed(2)}, ${(P.gnome.y / 1000).toFixed(2)})`);
  if (P.dug < 20) fail.push(`the tour dug only ${P.dug} tiles`);
  await A.shot("1-before-save.png");
  // ---- 2. read, then save
  const before = await A.eval(`(async () => { const T = WorldTest; T.stopBot(); T.S.asking = true; const d = T.digest(); window.__save = await T.saveText(T.snapshot()); return d; })()`);
  const text = await A.eval("window.__save");
  fs.writeFileSync(path.join(OUT, "gnome-world-save.json"), text);
  const saved = JSON.parse(text);
  log(`💾 saved: ${(text.length / 1024).toFixed(0)} KB (the tiles ${(saved.tiles.bytes / 1024).toFixed(0)} KB, ${saved.tiles.gzip ? "gzip" : "not packed"}, ${(saved.tiles.data.length / 1024).toFixed(0)} KB in base64)`);
  // ---- 3. restart
  const after = await A.eval(`(() => { WorldTest.restartNow(); WorldTest.S.asking = true; return { d: WorldTest.digest(), fresh: window.__fresh }; })()`);
  for (const k of ["ground", "gems", "water", "built", "slopes", "stones"]) if (after.d[k] !== after.fresh[k]) fail.push(`🔄 restart: ${k} not as the world was made`);
  for (const k of ["ground", "gnome"]) if (after.d[k] === before[k]) fail.push(`🔄 restart: ${k} the same as before it (the tour changed nothing there?)`);
  log(`🔄 restarted: ${fail.length ? "NOT as made" : "the world as it was made"}`);
  // ---- 4. load the file into the same page; save again
  // (read and saved again at once, as it was loaded: drawing, between, grows the roots the view comes to, as it would have before)
  const L1 = await A.eval(`(async () => { const T = WorldTest; await T.loadText(window.__save, "the check's save"); T.S.asking = true; const d = T.digest(), snap = T.snapshot(); return { d, again: await T.saveText(snap) }; })()`), loaded = L1.d;
  const d1 = differ(before, loaded);
  log(`📂 loaded in page 1: ${d1.length ? "DIFFERS in " + d1.join(", ") : `every part the same (${Object.keys(before).length} parts)`}`);
  if (d1.length) fail.push("page 1 load differs: " + d1.join(", "));
  await A.shot("2-after-load.png");
  const again = JSON.parse(L1.again);
  { const strip = s => { const { saved: _s, tiles, ...rest } = s; return rest; }, raw = s => s.tiles.gzip ? zlib.gunzipSync(Buffer.from(s.tiles.data, "base64")) : Buffer.from(s.tiles.data, "base64");
    const same = JSON.stringify(strip(saved)) === JSON.stringify(strip(again)) && raw(saved).equals(raw(again));
    log(`💾 saved again: ${same ? "the same file" : "A DIFFERENT FILE"}`); if (!same) fail.push("saved again after the load, the file differs"); }
  // ---- 5. a second page: a new world, the boy chosen, then the same file loaded
  const B = await Page.open(BASE + "world/?test=1", "page 2");
  await B.until(READY, "page 2: the rules built and the world made");
  const other = await B.eval(`(() => { const T = WorldTest; T.S.asking = true; document.getElementById("new").click(); document.querySelector('#heroes button[data-hero="boy"]').click(); return { seed: T.S.seed, hero: T.S.hero }; })()`);
  log(`page 2: a new world (seed ${other.seed}), the ${other.hero} chosen`);
  await B.eval(`window.__save = ${JSON.stringify(text)}; true`);
  const loaded2 = await B.eval(`(async () => { await WorldTest.loadText(window.__save, "the check's save"); WorldTest.S.asking = true; return WorldTest.digest(); })()`);
  const d2 = differ(before, loaded2);
  log(`📂 loaded in page 2: ${d2.length ? "DIFFERS in " + d2.join(", ") : `every part the same: seed ${loaded2.seed}, the ${loaded2.hero}, where she was`}`);
  if (d2.length) fail.push("page 2 load differs: " + d2.join(", "));
  await B.shot("3-page2-after-load.png");
  const errs = [...A.console, ...B.console]; if (errs.length) log("console:\n" + errs.join("\n"));
  fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify({ ok: !fail.length, fail, lib, steps, tour: P, before, restarted: after.d, fresh: after.fresh, loaded, loaded2, differ1: d1, differ2: d2 }, null, 1));
} catch (e) { fail.push(String(e && e.stack || e)); }
log(fail.length ? "FAILED:\n  " + fail.join("\n  ") : "✓ the tour's world, saved, restarted and loaded (twice): the same");
done(fail.length ? 1 : 0);
