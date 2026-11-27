// Gnome world's rules compiled ahead of time (0.0.147; Matthew, 2026-11-27: "the jit has already been done, ahead of time, before
// loading on client machine"). Builds the rules as the page would (its spec: the preamble, each module in the order the page lists
// them, the tail from world/app.js) with a library that hands the compiled program back as text (Hazel.jitProgramSaved, ^ticket(890)),
// makes the program again from that text as a page does (world/app.js rulesFromSaved), checks it plans the same worlds as the one
// built, and writes world/rules-aot.json: the text, the rules' data fields, and a hash of the spec the page checks before using it.
//
//   node node/world-aot.mjs <hazel-lib.js> <out.json> [the library's name]   (or --key: print the spec's hash and stop)
//
// An unchanged spec with the same library leaves the file as it is (so the job commits only a change).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2).filter(a => !a.startsWith("--")), KEY_ONLY = process.argv.includes("--key");
const [lib, out, libName = lib] = args;
const here = f => new URL("../world/" + f, import.meta.url);
const app = readFileSync(here("app.js"), "utf8"), html = readFileSync(here("index.html"), "utf8");
const MODULES = JSON.parse(app.match(/MODULES = (\[[^\]]*\]);/)[1]);
const TAIL = JSON.parse(app.match(/const TAIL = ("(?:[^"\\]|\\.)*");/)[1]);
const order = [...html.matchAll(/data-module="(\w+)"/g)].map(m => m[1]);
if (order.join() !== MODULES.join()) { console.error(`the page lists the modules ${order.join()}, but MODULES is ${MODULES.join()}`); process.exit(1); }
const read = f => readFileSync(here("rules/" + f), "utf8").replace(/\s+$/, "");
const spec = { preamble: read("preamble.hz"), modules: order.map(name => ({ name, text: read(name + ".hz") })), tail: TAIL };
// (world/app.js textHash: FNV-1a over the spec's JSON, by UTF-16 unit, and its length)
const textHash = t => { let x = 0x811c9dc5; for (let i = 0; i < t.length; i++) { x ^= t.charCodeAt(i); x = Math.imul(x, 0x01000193); } return (x >>> 0).toString(16) + ":" + t.length; };
const key = textHash(JSON.stringify(spec));
if (KEY_ONLY) { console.log(key); process.exit(0); }
if (out && existsSync(out)) { try { const was = JSON.parse(readFileSync(out, "utf8")); if (was.key === key && was.lib === libName) { console.log(`unchanged: ${out} is for these rules (${key}) and this library`); process.exit(0); } } catch (e) { /* made again */ } }

await import(pathToFileURL(lib).href);
const Hazel = globalThis.Hazel;
if (typeof Hazel.jitProgramSaved !== "function") { console.error("this library has no Hazel.jitProgramSaved"); process.exit(1); }
const t0 = performance.now(), r = Hazel.jitProgramSaved(spec), ms = performance.now() - t0;
if (!r.ok || !r.compiled || !r.saved || (r.errors || []).length) { console.error("not built:", JSON.stringify({ ok: r.ok, compiled: r.compiled, reason: r.reason, errors: r.errors }).slice(0, 3000)); process.exit(1); }
const fns = Object.keys(r.value).filter(k => typeof r.value[k] === "function");
const missing = fns.filter(k => typeof r.saved.wrap[k] !== "string");
if (missing.length) { console.error("not every function saved:", missing.join(", ")); process.exit(1); }
const data = {}; for (const k of Object.keys(r.value)) if (typeof r.value[k] !== "function") data[k] = r.value[k];

// made again from the text, as the page makes it, with no fallback: the same worlds planned, the same ground, styles and limbs
const R = (0, eval)("(" + r.saved.runtime + ")"), cv = new Function("$R", r.saved.js)(R), v = { ...data };
for (const k of Object.keys(r.saved.wrap)) v[k] = (0, eval)(r.saved.wrap[k])(cv[k], () => { throw new Error(`the saved ${k} could not take a call`); });
const same = [];
for (const seed of [7, 1126, 42]) same.push(JSON.stringify(v.plan(seed)) === JSON.stringify(r.value.plan(seed)));
for (let k = 0; k <= 9; k++) same.push(JSON.stringify(v.ground(k)) === JSON.stringify(r.value.ground(k)));
for (const [kind, h, s] of [[30, 90, 3], [31, 84, 11]]) same.push(JSON.stringify(v.limbs(kind, h, s)) === JSON.stringify(r.value.limbs(kind, h, s)));
if (same.some(x => !x)) { console.error("the program made again from its text plans otherwise than the one built:", same.join(",")); process.exit(1); }

const doc = { about: "Gnome world's rules compiled ahead of time by hazel-jit (node/world-aot.mjs, the world aot job): the page uses them when its rules are the text this key hashes, and builds otherwise (world/app.js useAotRules)",
  key, at: new Date().toISOString(), lib: libName, build: Hazel.build || "", ms: Math.round(ms), modules: order, saved: r.saved, data };
writeFileSync(out, JSON.stringify(doc));
console.log(`compiled ahead of time in ${(ms / 1000).toFixed(1)} s with ${libName}: ${fns.length} functions, ${Object.keys(data).length} data fields, ${(JSON.stringify(doc).length / 1024).toFixed(0)} KB; made again from the text, the same at ${same.length} of ${same.length} calls; key ${key}`);
