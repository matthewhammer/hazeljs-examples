// node/build-profile.mjs (^ticket(791), from Gnome world's port, ^ticket(882)): where building Gnome world's rules spends its time,
// by Hazel's own source files. For a GitHub runner (.github/workflows/build-profile.yml), NOT the laptop: it wants a hazel-lib.js
// built in Hazel's dev profile, whose source map names each piece of JavaScript's OCaml (Reason) file.
//   node --cpu-prof --cpu-prof-dir=DIR node/build-profile.mjs <hazel-lib.js> <its .map> DIR
// It builds the world's rules (Hazel.jitProgram, as the page does) three times, then reads the CPU profile Node wrote and prints,
// for the builds after the first, each source file's share: inclusive (the file anywhere on the stack) and self (on top), and the
// functions on top most. Measured 11-26 on the laptop with the minified library: analyzeProgram (parse and statics) is nearly all of
// a build; this says which part of it.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [LIB, MAP, DIR] = process.argv.slice(2);
const R = new URL("../world/rules/", import.meta.url), read = f => readFileSync(new URL(f, R), "utf8").replace(/\s+$/, "");
const MODS = [["World", "plan = World.plan, step = World.step"], ["Fly", "fly = Fly.step"], ["Tail", "tail = Tail.step"], ["Ride", "ride_pre = Ride.pre, ride_post = Ride.post"],
  ["Boulder", "boulder = Boulder.step"], ["Pickup", "pickup = Pickup.step"], ["Wind", "wind = Wind.step"], ["Bunny", "bunny = Bunny.step"], ["Frog", "frog = Frog.step"],
  ["Bird", "bird = Bird.step, swim = Bird.swim"]];
const spec = { preamble: read("preamble.hz"), modules: MODS.map(([name]) => ({ name, text: read(name + ".hz") })), tail: "(" + MODS.map(([, t]) => t).join(", ") + ")" };

if (process.argv.includes("--summarize")) summarize(); else {
  await import(pathToFileURL(LIB).href);
  const Hazel = globalThis.Hazel, marks = [];
  for (let k = 0; k < 3; k++) {
    // (the profile's clock is the monotonic one process.hrtime reads, in microseconds)
    const h0 = Number(process.hrtime.bigint() / 1000n), t0 = performance.now(), b = Hazel.jitProgram(spec), ms = performance.now() - t0, h1 = Number(process.hrtime.bigint() / 1000n);
    marks.push({ k, ms: Math.round(ms), ok: b.ok, compiled: b.compiled, startUs: h0, endUs: h1 });
    console.log(`build ${k + 1}: ${(ms / 1000).toFixed(2)} s, ok ${b.ok}, compiled ${b.compiled}`);
    const a0 = performance.now(); Hazel.analyzeProgram(spec); console.log(`  analyzeProgram alone: ${((performance.now() - a0) / 1000).toFixed(2)} s`);
  }
  writeFileSync(path.join(DIR, "marks.json"), JSON.stringify(marks));
}

// ---- the profile, by source file (run again with --summarize once Node has written it)
function summarize() {
  const prof = readdirSync(DIR).find(f => f.endsWith(".cpuprofile"));
  const P = JSON.parse(readFileSync(path.join(DIR, prof), "utf8"));
  // (the map beside the library, or inlined at its end as a data: URL)
  let M; try { M = JSON.parse(readFileSync(MAP, "utf8")); } catch { const js = readFileSync(LIB, "utf8"), at = js.lastIndexOf("sourceMappingURL=data:application/json");
    M = JSON.parse(Buffer.from(js.slice(js.indexOf("base64,", at) + 7).trim(), "base64").toString("utf8")); }
  console.log(`source map: keys ${Object.keys(M).join(", ")}${M.sections ? `; ${M.sections.length} sections` : ""}`);
  // (a map is plain, { sources, mappings }, or indexed, { sections: [{ offset: { line, column }, map }] }, as js_of_ocaml links
  // one; each map's mappings decoded into lines of [generated column, source index] (base64 VLQ, as the source map spec has it))
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const decode = m => { const lines = []; let src = 0, sl = 0, sc = 0, nm = 0;
    for (const line of (m.mappings || "").split(";")) { const segs = []; let col = 0;
      for (const seg of line.split(",")) { if (!seg) continue; const v = []; let shift = 0, value = 0;
        for (const ch of seg) { const d = B64.indexOf(ch); value += (d & 31) << shift; if (d & 32) shift += 5; else { v.push(value & 1 ? -(value >> 1) : value >> 1); shift = 0; value = 0; } }
        col += v[0]; if (v.length > 1) { src += v[1]; sl += v[2]; sc += v[3]; if (v.length > 4) nm += v[4]; segs.push([col, src]); } }
      lines.push(segs); }
    return lines; };
  const sections = (M.sections || [{ offset: { line: 0, column: 0 }, map: M }])
    .map(sec => ({ line: sec.offset.line, column: sec.offset.column, sources: (sec.map && sec.map.sources) || [], lines: sec.map ? decode(sec.map) : [] }));
  console.log(`decoded ${sections.length} map(s), ${sections.reduce((n, x) => n + x.sources.length, 0)} sources`);
  const lookup = (L, line, col) => { const segs = L[line]; if (!segs || !segs.length) return -1; let lo = 0, hi = segs.length - 1, best = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (segs[mid][0] <= col) { best = mid; lo = mid + 1; } else hi = mid - 1; }
    return best < 0 ? -1 : segs[best][1]; };
  const fileOf = (line, col) => { let lo = 0, hi = sections.length - 1, k = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1, S = sections[mid]; if (S.line < line || (S.line === line && S.column <= col)) { k = mid; lo = mid + 1; } else hi = mid - 1; }
    if (k < 0) return "(unmapped)"; const S = sections[k], l = line - S.line, c = l === 0 ? col - S.column : col, src = lookup(S.lines, l, c);
    return src < 0 ? "(unmapped)" : String(S.sources[src]).replace(/^.*?(src\/|_build\/default\/|\.opam\/)/, "$1"); };
  const nodes = new Map(P.nodes.map(n => [n.id, n])), parent = new Map();
  for (const n of P.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const lib = path.basename(LIB), where = new Map();
  const fileOfNode = n => { if (where.has(n.id)) return where.get(n.id); const cf = n.callFrame;
    const f = cf.url && cf.url.endsWith(lib) ? fileOf(cf.lineNumber, cf.columnNumber) : cf.functionName ? `(${cf.functionName || "anon"})` : "(native)"; where.set(n.id, f); return f; };
  // only the builds after the first (warm), by the marks' times against the profile's own clock
  const marks = JSON.parse(readFileSync(path.join(DIR, "marks.json"), "utf8")).slice(1);
  let t = P.startTime; const incl = new Map(), self = new Map(), fns = new Map(); let total = 0;
  const inBuild = t => marks.some(m => t >= m.startUs && t <= m.endUs);
  console.log(`profile ${P.startTime} to ${P.endTime}; the warm builds ${marks.map(m => `${m.startUs} to ${m.endUs}`).join(", ")}`);
  P.samples.forEach((id, i) => { t += P.timeDeltas[i]; const dt = P.timeDeltas[i];
    if (!inBuild(t)) return;
    total += dt; let n = nodes.get(id); const seen = new Set(); const top = fileOfNode(n);
    self.set(top, (self.get(top) || 0) + dt); const fk = top + " " + (n.callFrame.functionName || "anon") + ":" + n.callFrame.lineNumber; fns.set(fk, (fns.get(fk) || 0) + dt);
    while (n) { const f = fileOfNode(n); if (!seen.has(f)) { seen.add(f); incl.set(f, (incl.get(f) || 0) + dt); } n = nodes.get(parent.get(n.id)); } });
  const show = (title, m, k) => { console.log(`\n${title} (of ${(total / 1e6).toFixed(2)} s sampled)`);
    [...m].sort((a, b) => b[1] - a[1]).slice(0, k).forEach(([f, us]) => console.log(`  ${(us / 1e3).toFixed(0).padStart(7)} ms ${(100 * us / total).toFixed(1).padStart(5)}%  ${f}`)); };
  show("inclusive, by source file", incl, 40); show("self, by source file", self, 30); show("self, by function", fns, 30);
  // (the hottest functions' callers in Hazel's own source: for each sample whose top is one of them, the nearest frame up the
  // stack in src/ outside the hot function's own file, by file and function; so a library helper, a List.append or a Map.add,
  // is laid at the statics' door that calls it)
  const HOT = [...fns].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k]) => k).filter(k => !k.startsWith("((garbage"));
  const callers = new Map(HOT.map(k => [k, new Map()])); t = P.startTime;
  P.samples.forEach((id, i) => { t += P.timeDeltas[i]; const dt = P.timeDeltas[i]; if (!inBuild(t)) return;
    let n = nodes.get(id); const top = fileOfNode(n), fk = top + " " + (n.callFrame.functionName || "anon") + ":" + n.callFrame.lineNumber;
    if (!callers.has(fk)) return; let up = nodes.get(parent.get(n.id)), who = "(none in src/)";
    while (up) { const f = fileOfNode(up); if (f.startsWith("src/") && f !== top) { who = f + " " + (up.callFrame.functionName || "anon") + ":" + up.callFrame.lineNumber; break; } up = nodes.get(parent.get(up.id)); }
    const m = callers.get(fk); m.set(who, (m.get(who) || 0) + dt); });
  for (const k of HOT) show(`callers in src/ of ${k}`, callers.get(k), 6);
  // (each function in src/ anywhere on the stack: which of the statics' own functions the time is under)
  const inclFn = new Map(); t = P.startTime;
  P.samples.forEach((id, i) => { t += P.timeDeltas[i]; const dt = P.timeDeltas[i]; if (!inBuild(t)) return;
    const seen = new Set(); for (let n = nodes.get(id); n; n = nodes.get(parent.get(n.id))) { const f = fileOfNode(n); if (!f.startsWith("src/")) continue;
      const k = f + " " + (n.callFrame.functionName || "anon") + ":" + n.callFrame.lineNumber; if (!seen.has(k)) { seen.add(k); inclFn.set(k, (inclFn.get(k) || 0) + dt); } } });
  show("inclusive, by function in src/", inclFn, 45);
}
