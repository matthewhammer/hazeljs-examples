// node/level-check.mjs (0.0.140; Matthew, 2026-11-26: "I want the current 'default/start world' to be consistent in ongoing
// versions"; "let's be sure to save any seed numbers we use"; "let's be sure to save any structure not entirely determined by
// that seed number to the .json file"). For a GitHub runner, NOT the laptop: it runs headless Chrome.
// Each level in world/levels.json is built fresh, in two pages, and read (WorldTest.digest: each part of the world's state,
// hashed). A part that two fresh builds of the same level disagree on is not the level's (it follows the clock or the drawing),
// and is left out; every other part must be the one levels.json records for that level. A level that records none yet has
// its parts printed, to be recorded (the printed "record" line is levels.json's "built" for it).
//   node node/level-check.mjs [base url] [out dir]     (the site served at the base url: python3 -m http.server)
import fs from "node:fs";
import path from "node:path";
import { chrome } from "./cdp.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:8000/", OUT = process.argv[3] || "level-check";
fs.mkdirSync(OUT, { recursive: true });
const logLines = [], log = (...a) => { const s = a.join(" "); console.log(s); logLines.push(s); };
let C = null;
const done = code => { if (C) C.close(); fs.writeFileSync(path.join(OUT, "log.txt"), logLines.join("\n") + "\n"); process.exit(code); };
const READY = "!!(window.WorldTest && WorldTest.S.g && WorldTest.S.built && WorldTest.S.built.ok)";
// (the parts of a world as built: the tiles and everything placed; not the clock, the gnome's hearts or the weather)
const PARTS = ["seed", "gemTotal", "rand", "ground", "back", "built", "gems", "stones", "slopes", "tops", "water", "surface", "treeMask",
  "rivers", "dams", "things", "heartItems", "trees", "beavers", "boulders", "villagers", "level", "places"];
const LEVELS = JSON.parse(fs.readFileSync(new URL("../world/levels.json", import.meta.url), "utf8"));
// (a level's world, built fresh in the page: WorldTest.freshLevel where the page has levels, else the start world restarted)
const READ = id => `(() => { const T = WorldTest; T.S.asking = true;
  if (T.freshLevel) T.freshLevel(${JSON.stringify(id)}); else T.restartNow();
  T.S.asking = true; const d = T.digest(); return d; })()`;

const fail = [];
try {
  C = await chrome();
  const pages = [];
  for (const k of [1, 2]) { const P = await C.open(BASE + "world/?test=1", "page " + k); await P.until(READY, "the rules built and the world made"); pages.push(P); }
  const lib = await pages[0].eval("({ compiled: !!WorldTest.S.built.compiled, version: (document.querySelector('meta[name=version]') || {}).content || '' })");
  log(`the rules ${lib.compiled ? "compiled by hazel-jit" : "interpreted"}`);
  const record = {};
  for (const [id, L] of Object.entries(LEVELS.levels)) {
    const a = await pages[0].eval(READ(id)), b = await pages[1].eval(READ(id));
    const parts = PARTS.filter(k => k in a);
    const unsteady = parts.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    const mine = Object.fromEntries(parts.filter(k => !unsteady.includes(k)).map(k => [k, a[k]]));
    log(`level ${id} (${L.name}, seed ${L.seed}): built fresh twice; ${Object.keys(mine).length} parts the same both times` +
      (unsteady.length ? `; not the same, so left out: ${unsteady.join(", ")}` : ""));
    if (a.seed !== L.seed) fail.push(`level ${id}: built from seed ${a.seed}, not levels.json's ${L.seed}`);
    record[id] = mine;
    const want = L.built && L.built.parts;
    if (!want) { log(`level ${id}: levels.json records no parts yet; to record:`); log(`record ${id} ${JSON.stringify(mine)}`); continue; }
    const off = Object.keys(want).filter(k => JSON.stringify(want[k]) !== JSON.stringify(mine[k]));
    if (off.length) fail.push(`level ${id} (${L.name}) is not the world levels.json records (as built by ${L.built.version}): ${off.map(k => `${k} ${want[k]} -> ${mine[k]}`).join("; ")}`);
    else log(`level ${id}: the world as levels.json records it (as built by ${L.built.version}), all ${Object.keys(want).length} parts`);
  }
  fs.writeFileSync(path.join(OUT, "record.json"), JSON.stringify(record, null, 1));
} catch (e) {
  fail.push("the check itself failed: " + (e && e.stack || e));
}
if (fail.length) { log("FAILED:"); for (const f of fail) log("  " + f); done(1); }
log("passed"); done(0);
