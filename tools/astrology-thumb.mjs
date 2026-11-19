// hazeljs-examples, astrology: the front page's picture, astrology/thumb.svg: the app's own birth chart (its first commit,
// 0fa9e0a, 2026-11-17 18:03:51 UTC, at 40.046313° N, 105.286695° W), as the Wheel module lays it out, drawn on a light tile like
// the I Ching's, with glyphs.svg's strokes copied in (a picture in an <img> cannot reach another file's symbols).
//
//   node --max-old-space-size=2048 tools/astrology-thumb.mjs
import Hazel from "hazeljs";
import { readFileSync, writeFileSync } from "node:fs";
const at = p => new URL("../astrology/" + p, import.meta.url);
const read = p => readFileSync(at(p), "utf8").replace(/\s+$/, "");
const MODULES = ["Zodiac", "Aspects", "Chart", "Orbit", "MoonOrbit", "Planets", "Outer", "PlutoOrbit", "Sky", "Wheel", "Reading"];
const birth = "(year = 2026, month = 11, day = 17, hour = 18.064167)";
const r = Hazel.runProgram({ preamble: read("rules/preamble.hz"), modules: MODULES.map(name => ({ name, text: read(`rules/${name}.hz`) })),
  tail: `Reading.reading(${birth}, (latitude = 40.046313, longitude = -105.286695), ${birth})` });
if (!r.ok) { console.log(JSON.stringify(r.errors).slice(0, 800)); process.exit(1); }
const w = r.value.wheel;
const sym = {};
for (const m of read("glyphs.svg").matchAll(/<symbol id="([a-z]+)"[^>]*>([\s\S]*?)<\/symbol>/g)) sym[m[1]] = m[2];
const f = x => x.toFixed(2);
const glyph = (id, x, y, s, color) => `<g transform="translate(${f(x - s / 2)} ${f(y - s / 2)}) scale(${(s / 100).toFixed(4)})" color="${color}">${sym[id]}</g>`;
const line = (l, color, width) => `<line x1="${f(l.x1)}" y1="${f(l.y1)}" x2="${f(l.x2)}" y2="${f(l.y2)}" stroke="${color}" stroke-width="${width}"/>`;
const ELEMENT = { Fire: "#c2410c", Earth: "#4d7c0f", Air: "#0e7490", Water: "#4338ca" };
const HARD = { Square: 1, Opposition: 1 };
const svg = `<svg viewBox="-6 -6 112 112" xmlns="http://www.w3.org/2000/svg">
<title>This app's own birth chart: Capricorn rising, the Sun in Scorpio</title>
<rect x="-5.5" y="-5.5" width="111" height="111" rx="14" fill="#F7F7F5" stroke="#D8D8D4" stroke-width="0.8"/>
<g fill="none" stroke="#141414" stroke-width="0.5"><circle cx="50" cy="50" r="50"/><circle cx="50" cy="50" r="41"/><circle cx="50" cy="50" r="27"/></g>
${w.cusps.map(l => line(l, "#5b6470", 0.35)).join("\n")}
${w.axes.map(l => line(l, "#141414", 0.6)).join("\n")}
${w.lines.filter(l => l.kind.tag !== "Conjunction").map(l => line(l, HARD[l.kind.tag] ? "#b91c1c" : "#1d4ed8", 0.5)).join("\n")}
${w.signs.map(s => glyph(s.sign.tag.toLowerCase(), s.x, s.y, 6.6, ELEMENT[s.element.tag])).join("\n")}
${w.marks.filter(m => m.ring === 0).map(m => glyph(m.body.tag.toLowerCase(), m.x, m.y, 6.4, "#141414")).join("\n")}
</svg>
`;
writeFileSync(at("thumb.svg"), svg);
console.log(`astrology/thumb.svg: ${svg.length} bytes, rising ${r.value.chart.ascendant.toFixed(2)}`);
