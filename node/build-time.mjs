// node/build-time.mjs (^ticket(791)): how long a build of hazel-lib.js takes to build Gnome world's rules (Hazel.jitProgram, as the
// page does): the first build (the library cold) and five more, their median; for comparing builds of the library on one machine
// (.github/workflows/build-timing.yml).
//   node node/build-time.mjs <hazel-lib.js> [name]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [LIB, NAME = "lib"] = process.argv.slice(2);
await import(pathToFileURL(LIB).href);
const Hazel = globalThis.Hazel, read = f => readFileSync(new URL("../world/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const app = readFileSync(new URL("../world/app.js", import.meta.url), "utf8");
const MODULES = JSON.parse(app.match(/MODULES = (\[[^\]]*\])/)[1]), TAIL = app.match(/const TAIL = "([^"]*)"/)[1];
const spec = { preamble: read("preamble.hz"), modules: MODULES.map(name => ({ name, text: read(name + ".hz") })), tail: TAIL };
const times = []; let ok = true;
for (let k = 0; k < 6; k++) { const t0 = performance.now(), b = Hazel.jitProgram(spec); times.push(performance.now() - t0); ok = ok && b.ok && b.compiled; }
const warm = times.slice(1).sort((a, b) => a - b);
console.log(`build time, ${NAME} (${Hazel.build.slice(0, 10)}): first ${(times[0] / 1000).toFixed(2)} s, then the median of five ${(warm[2] / 1000).toFixed(2)} s (${warm.map(t => (t / 1000).toFixed(2)).join(", ")}), ${ok ? "built and compiled each time" : "NOT BUILT"}`);
process.exit(ok ? 0 : 1);
