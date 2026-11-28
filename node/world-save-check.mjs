// node/world-save-check.mjs (0.0.101; Matthew, 2026-11-24: "let's do a CI check that the automated tour through the world,
// including digging, and saving and then loading all preserves the state exactly"). For a GitHub runner, NOT the laptop: it
// runs headless Chrome. Gnome world, in Chrome driven over its DevTools protocol (no packages: Node's own fetch and WebSocket):
//   1. the girl chosen, three hearts of five, the 🏃 speed run tours the world, stepped here a few hundred steps at a time: the
//      things to find first, then (its tree climbing skipped) digging for gems, until it has dug, found things and gems, the
//      beavers have felled a tree, and then until it rains, so that the save holds rain; or the steps run out;
//   2. the world read (WorldTest.digest: each part of the state, read from the world itself, hashed), then 💾 saved, the file's
//      own text;
//   3. 🔄 restarted: the world must be as it was made (the tiles, gems and water of the fresh world), and not as it was;
//   4. 📂 the file loaded: every part must be the same as before the save; saved again, the file must say the same;
//   5. a second page, a new world (another seed) and the boy chosen there, the same file loaded: every part the same again,
//      the girl back, where she was.
// The wildlife, the villagers' strolls and passing dust and smoke are not in a save (they start afresh), so not in the digest.
// (0.0.115; ^ticket(852), the iPad's foreground vanishing in Safari, past its cap on canvas memory) Page 1 keeps its pictures
// as an iPad would (?ios=1: the smaller caches) at the largest tile (56 px, as full screen on an iPad): after the tour, its
// canvases at their peak must stay within the page's own limit for an iPad (256 MB, well under Safari's 384 MB with the
// screen's own), and no canvas may have failed, nor every picture been let go.
//   node node/world-save-check.mjs [base url] [out dir]     (the site served at the base url: python3 -m http.server)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { chrome } from "./cdp.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:8000/", OUT = process.argv[3] || "world-save";
const STEPS_MAX = +(process.env.STEPS_MAX || 90000), CHUNK = 300;
fs.mkdirSync(OUT, { recursive: true });
const logLines = [], log = (...a) => { const s = a.join(" "); console.log(s); logLines.push(s); };
let C = null;
const done = code => { if (C) C.close(); fs.writeFileSync(path.join(OUT, "log.txt"), logLines.join("\n") + "\n"); process.exit(code); };
const READY = "!!(window.WorldTest && WorldTest.S.g && WorldTest.S.built && WorldTest.S.built.ok)";
// (the parts of two digests that differ)
const differ = (a, b) => Object.keys({ ...a, ...b }).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
// (the tour's progress: the tiles dug since the world was made, the things and gems found, the trees felled, the rain)
const PROGRESS = `(() => { const T = WorldTest, S = T.S; let dug = 0; for (let i = 0; i < T.bg.length; i++) if (T.bg[i] === 1) dug++;
  return { frame: S.frame, dug: dug - (window.__dug0 || 0), things: S.items.filter(it => it.taken).length, gems: S.found || 0, gemTotal: S.gemTotal,
    felled: S.trees.filter(t => !t.alive).length, hearts: S.hearts, heartsTaken: (S.heartItems || []).filter(h => h.taken).length, heartsAll: (S.heartItems || []).length, fallen: S.fallen.length, rain: S.rain, wind: +(S.windNow || 0).toFixed(3), bot: T.BOT.on, phase: T.BOT.phase,
    gnome: { x: S.g.x, y: S.g.y, gear: !!S.g.gear, tool: S.g.tool || 0, climbPack: !!S.g.climbPack }, hero: S.hero, seed: S.seed }; })()`;

const fail = [];
try {
  C = await chrome();
  // ---- 1. the tour
  const A = await C.open(BASE + "world/?test=ios", "page 1");   // (the test hooks and the iPad's budgets, in one parameter: cdp.mjs's /json/new lost a second one, after an &)
  await A.until(READY, "the rules built and the world made");
  const lib = await A.eval("({ compiled: !!WorldTest.S.built.compiled, ms: Math.round(WorldTest.S.built.ms), seed: WorldTest.S.seed })");
  log(`page 1: the world made (seed ${lib.seed}); the rules ${lib.compiled ? "compiled by hazel-jit" : "interpreted"}, built in ${lib.ms} ms; at ${await A.eval("location.href")}`);
  await A.eval(`(() => { const T = WorldTest; T.S.asking = true; document.querySelector('#heroes button[data-hero="girl"]').click();
    T.restartNow(); T.S.asking = true; T.S.tileFix = 56; T.S.hearts = 3; let d = 0; for (let i = 0; i < T.bg.length; i++) if (T.bg[i] === 1) d++; window.__dug0 = d; window.__fresh = T.digest(); T.bot(true); return true; })()`);
  let P = null, steps = 0, skipTrees = false; const t0 = Date.now();
  while (steps < STEPS_MAX) {
    await A.eval(`(WorldTest.S.asking = true, WorldTest.tick(${CHUNK}), true)`); steps += CHUNK;
    P = await A.eval(PROGRESS);
    if (steps % 3000 === 0) log(`  ${steps} steps: dug ${P.dug} tiles, ${P.things} things, ${P.gems}/${P.gemTotal} gems, ${P.felled} trees felled, ❤️ ${P.hearts} (${P.heartsTaken} of ${P.heartsAll} taken), rain ${P.rain}, wind ${P.wind}, bot ${P.bot ? P.phase || "on" : "off"}`);
    if (!P.bot && steps < 600) await A.eval("WorldTest.bot(true)");
    // (the tree climbing skipped: once the things are found, on to the gems, digging)
    if (P.phase === "trees") { await A.eval("(WorldTest.BOT.queue = [], true)"); if (!skipTrees) log(`  ${steps} steps: the things found, on to the gems`); skipTrees = true; }
    if (P.dug >= 150 && P.things >= 3 && P.gems >= 5 && P.felled >= 1 && P.rain > 0 && steps >= 12000) break;
  }
  log(`the tour: ${steps} steps in ${((Date.now() - t0) / 1000).toFixed(0)} s: dug ${P.dug} tiles, ${P.things} things, ${P.gems} of ${P.gemTotal} gems, ${P.felled} trees felled (${P.fallen} lying), ❤️ ${P.hearts} (${P.heartsTaken} of ${P.heartsAll} hearts taken), rain ${P.rain}, wind ${P.wind}; the girl at (${(P.gnome.x / 1000).toFixed(2)}, ${(P.gnome.y / 1000).toFixed(2)})`);
  if (P.dug < 20) fail.push(`the tour dug only ${P.dug} tiles`);
  if (P.gems < 1) fail.push("the tour found no gem");
  // (a tour that passed no heart with fewer than five took none: one marked taken, as one just picked up, so the save holds one)
  if (!P.heartsTaken && await A.eval("(() => { const H = WorldTest.S.heartItems; if (!H.length) return false; H[0].taken = true; return true; })()"))
    log("❤️ the tour took no heart: one marked taken, as if just picked up, so that the save holds a taken one");
  await A.shot(path.join(OUT, "1-before-save.png"));
  const CM = await A.eval("(() => { const K = WorldTest.CANVAS; return { ios: WorldTest.IOS, peakMB: Math.round(K.peak * 4 / 1e6), keptMB: Math.round(K.px * 4 / 1e6), made: K.made, freed: K.freed, fails: K.fails, purges: K.purges }; })()");
  log(`canvas memory, as on an iPad (${CM.ios ? "its budgets" : "NOT its budgets"}): peak ${CM.peakMB} MB, kept ${CM.keptMB} MB at the end; made ${CM.made}, let go ${CM.freed}; could not make ${CM.fails}; everything let go ${CM.purges} times`);
  if (!CM.ios || CM.peakMB > 256 || CM.fails || CM.purges) fail.push(`canvas memory as on an iPad: peak ${CM.peakMB} MB (at most 256), ${CM.fails} could not be made, everything let go ${CM.purges} times`);
  // ---- (^ticket(904), ^ticket(905)) the Hazel twins, from the tour's world: the water's two passes by Water.hz against the page's
  // JavaScript and against the passes of 0.0.149, 20 steps, every tile's water and every block's waking to the bit (the world put
  // back after); and the run's way to 20 gems by Path.hz against wayJS, the same tiles
  const TW = await A.eval(`(() => { const T = WorldTest, S = T.S, WW = T.WW, w = T.waterSame(20), g = S.g, gc = Math.floor(g.x / 1000), gr = Math.floor((g.y - 1) / 1000), gems = [];
    for (let i = 0; i < T.gem.length; i++) if (T.gem[i]) gems.push([i % WW, Math.floor(i / WW)]);
    gems.sort((a, b) => Math.abs(a[0] - gc) + Math.abs(a[1] - gr) - Math.abs(b[0] - gc) - Math.abs(b[1] - gr));
    return { water: w, way: T.waySame(gems.slice(0, 20)) }; })()`);
  log(`💧 the water, 20 steps: the passes of 0.0.149 ${TW.water.refMs} ms a step, the page's ${TW.water.jsMs} ms (tiles differing ${TW.water.jsWaterDiffers}, wakings ${TW.water.jsWakeDiffers}), Water.hz ${TW.water.hazelMs} ms (tiles differing ${TW.water.hazelWaterDiffers}, wakings ${TW.water.hazelWakeDiffers})`);
  log(`🧭 the way to ${TW.way.n} gems: Path.hz the same as wayJS on ${TW.way.same} (found ${TW.way.found}); Path.hz ${TW.way.hazelMs} ms in all, wayJS ${TW.way.jsMs} ms (and the window's tiles ${TW.way.codesMs} ms), the search of 0.0.149 ${TW.way.oldMs} ms`);
  if (TW.water.jsWaterDiffers || TW.water.jsWakeDiffers) fail.push(`the water's passes: the page's differ from 0.0.149's at ${TW.water.jsWaterDiffers} tiles, ${TW.water.jsWakeDiffers} wakings`);
  if (TW.water.hazelMs == null || TW.water.hazelWaterDiffers || TW.water.hazelWakeDiffers) fail.push(`the water in Hazel: ${TW.water.hazelMs == null ? "not built" : `differs at ${TW.water.hazelWaterDiffers} tiles, ${TW.water.hazelWakeDiffers} wakings`}`);
  if (TW.way.same !== TW.way.n) fail.push(`the way in Hazel: the same as wayJS on ${TW.way.same} of ${TW.way.n}${TW.way.firstDiff ? "; first: " + JSON.stringify(TW.way.firstDiff) : ""}`);
  // ---- (^ticket(907)) the speed run's planning by Plan.hz against the page's: the order of all the things, the trees' parts, the gems
  // nearest first, the dig's chunk from several chunks and chances
  const PS = await A.eval("WorldTest.planSame()");
  log(`🗺️ the planning: the order of ${PS.order && PS.order.n} things ${PS.order && PS.order.same ? "the same" : "DIFFERS"}, the trees' ${PS.trees && PS.trees.n} parts ${PS.trees && PS.trees.same ? "the same" : "DIFFER"}, ${PS.nearest && PS.nearest.n} gems nearest first ${PS.nearest && PS.nearest.same ? "the same" : "DIFFER"}, the dig's chunk the same at ${PS.chunksSame} of ${PS.chunks}; ms ${JSON.stringify(PS.ms)}`);
  if (!PS.order || !PS.order.same || !PS.trees.same || !PS.nearest.same || PS.chunksSame !== PS.chunks) fail.push("the planning in Hazel (Plan.hz) differs from the page's: " + JSON.stringify({ order: PS.order, trees: PS.trees, nearest: PS.nearest, chunks: [PS.chunksSame, PS.chunks] }).slice(0, 600));
  // ---- 2. read, then save
  const before = await A.eval(`(async () => { const T = WorldTest; T.stopBot(); T.S.asking = true; const d = T.digest(); window.__save = await T.saveText(T.snapshot()); return d; })()`);
  const text = await A.eval("window.__save");
  fs.writeFileSync(path.join(OUT, "gnome-world-save.json"), text);
  const saved = JSON.parse(text);
  log(`💾 saved: ${(text.length / 1024).toFixed(0)} KB (the tiles ${(saved.tiles.bytes / 1024).toFixed(0)} KB, ${saved.tiles.gzip ? "gzip" : "not packed"}, ${(saved.tiles.data.length / 1024).toFixed(0)} KB in base64)`);
  // ---- 3. restart
  const after = await A.eval(`(() => { WorldTest.restartNow(); WorldTest.S.asking = true; return { d: WorldTest.digest(), fresh: window.__fresh }; })()`);
  const failsBefore = fail.length;
  for (const k of ["ground", "gems", "water", "built", "slopes", "stones"]) if (after.d[k] !== after.fresh[k]) fail.push(`🔄 restart: ${k} not as the world was made`);
  for (const k of ["ground", "gnome"]) if (after.d[k] === before[k]) fail.push(`🔄 restart: ${k} the same as before it (the tour changed nothing there?)`);
  log(`🔄 restarted: ${fail.length > failsBefore ? "NOT as made" : "the world as it was made"}`);
  // ---- 4. load the file into the same page; save again
  // (read and saved again at once, as it was loaded: drawing, between, grows the roots the view comes to, as it would have before)
  const L1 = await A.eval(`(async () => { const T = WorldTest; await T.loadText(window.__save, "the check's save"); T.S.asking = true; const d = T.digest(), snap = T.snapshot(); return { d, again: await T.saveText(snap) }; })()`), loaded = L1.d;
  const d1 = differ(before, loaded);
  log(`📂 loaded in page 1: ${d1.length ? "DIFFERS in " + d1.join(", ") : `every part the same (${Object.keys(before).length} parts)`}`);
  if (d1.length) fail.push("page 1 load differs: " + d1.join(", "));
  await A.shot(path.join(OUT, "2-after-load.png"));
  const again = JSON.parse(L1.again);
  { const strip = s => { const { saved: _s, tiles, ...rest } = s; return rest; }, raw = s => s.tiles.gzip ? zlib.gunzipSync(Buffer.from(s.tiles.data, "base64")) : Buffer.from(s.tiles.data, "base64");
    const same = JSON.stringify(strip(saved)) === JSON.stringify(strip(again)) && raw(saved).equals(raw(again));
    log(`💾 saved again: ${same ? "the same file" : "A DIFFERENT FILE"}`); if (!same) fail.push("saved again after the load, the file differs"); }
  // ---- 5. a second page: a new world, the boy chosen, then the same file loaded
  const B = await C.open(BASE + "world/?test=1", "page 2");
  await B.until(READY, "page 2: the rules built and the world made");
  const other = await B.eval(`(() => { const T = WorldTest; T.S.asking = true; document.getElementById("new").click(); document.querySelector('#heroes button[data-hero="boy"]').click(); return { seed: T.S.seed, hero: T.S.hero }; })()`);
  log(`page 2: a new world (seed ${other.seed}), the ${other.hero} chosen`);
  await B.eval(`window.__save = ${JSON.stringify(text)}; true`);
  const loaded2 = await B.eval(`(async () => { await WorldTest.loadText(window.__save, "the check's save"); WorldTest.S.asking = true; return WorldTest.digest(); })()`);
  const d2 = differ(before, loaded2);
  log(`📂 loaded in page 2: ${d2.length ? "DIFFERS in " + d2.join(", ") : `every part the same: seed ${loaded2.seed}, the ${loaded2.hero}, where she was`}`);
  if (d2.length) fail.push("page 2 load differs: " + d2.join(", "));
  await B.shot(path.join(OUT, "3-page2-after-load.png"));
  const errs = [...A.console, ...B.console]; if (errs.length) log("console:\n" + errs.join("\n"));
  fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify({ ok: !fail.length, fail, lib, steps, tour: P, canvas: CM, before, restarted: after.d, fresh: after.fresh, loaded, loaded2, differ1: d1, differ2: d2 }, null, 1));
} catch (e) { fail.push(String(e && e.stack || e)); }
log(fail.length ? "FAILED:\n  " + fail.join("\n  ") : "✓ the tour's world, saved, restarted and loaded (twice): the same");
done(fail.length ? 1 : 0);
