// hazeljs-examples, astrology (0.0.21, ticket 768; Matthew, 2026-11-18: "For this tool tip (outer ring of signs, which are
// constellations), can we show some SVG of the constellation too in the tool tip? ... one, perhaps stylized, for each sign?"):
// the twelve zodiac constellations as small star figures, astrology/constellations.svg, a <symbol> each (con-aries, ...), and
// astrology/constellations.html to look at them.
//
// The figures: Marc van der Sluys's ConstellationLines (https://github.com/MarcvdSluys/ConstellationLines, CC BY 4.0), each
// constellation a path through Bright Star Catalogue stars, a star repeated to branch. The stars: the Yale Bright Star
// Catalogue, 5th revised edition (Hoffleit and Warren 1991, CDS catalogue V/50), its J2000 positions and V magnitudes. Each
// figure is drawn here: its stars projected onto the plane touching the sky at the figure's center (gnomonic), north up and
// east to the left, as the sky is seen; each star a dot sized by its brightness; each line stopped short of its stars.
//
//   node tools/make-constellations.mjs ConstellationLines.dat bsc5.tsv
//
// ConstellationLines.dat from the repository above; bsc5.tsv from VizieR (V/50/catalog, the columns HR, RAJ2000, DEJ2000 and
// Vmag, tab-separated; for instance https://vizier.cfa.harvard.edu/viz-bin/asu-tsv?-source=V/50/catalog&-out=HR,RAJ2000,DEJ2000,Vmag&-out.max=unlimited).
import { readFileSync, writeFileSync } from "node:fs";

const [datPath, tsvPath] = process.argv.slice(2);
if (!datPath || !tsvPath) { console.error("usage: node tools/make-constellations.mjs ConstellationLines.dat bsc5.tsv"); process.exit(2); }

// the signs, in order, and the constellation each is named for (its IAU abbreviation and name)
const ZODIAC = [["Aries", "Ari", "Aries"], ["Taurus", "Tau", "Taurus"], ["Gemini", "Gem", "Gemini"], ["Cancer", "Cnc", "Cancer"],
  ["Leo", "Leo", "Leo"], ["Virgo", "Vir", "Virgo"], ["Libra", "Lib", "Libra"], ["Scorpio", "Sco", "Scorpius"],
  ["Sagittarius", "Sgr", "Sagittarius"], ["Capricorn", "Cap", "Capricornus"], ["Aquarius", "Aqr", "Aquarius"], ["Pisces", "Psc", "Pisces"]];

// ---- the catalogue: HR number to position (degrees) and V magnitude; sexagesimal or decimal, as VizieR gives it
const deg = (s, hours) => {
  s = s.trim();
  if (!s) return null;
  if (!/\s|:/.test(s)) return Number(s) * (hours ? 15 : 1);
  const neg = s.startsWith("-"), [a, b = 0, c = 0] = s.replace(/^[+-]/, "").split(/[\s:]+/).map(Number);
  const v = a + b / 60 + c / 3600;
  return (neg ? -v : v) * (hours ? 15 : 1);
};
const stars = new Map();
for (const line of readFileSync(tsvPath, "utf8").split("\n")) {
  const f = line.split("\t");
  if (f.length < 4 || !/^\s*\d+\s*$/.test(f[0])) continue;
  const ra = deg(f[1], true), dec = deg(f[2], false), v = Number(f[3]);
  if (ra == null || dec == null || !Number.isFinite(v)) continue;
  stars.set(Number(f[0]), { ra, dec, v });
}

// ---- the figures: a constellation's path of HR numbers
const paths = new Map();
for (const line of readFileSync(datPath, "utf8").split("\n")) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [abbr, n, ...hr] = line.trim().split(/\s+/);
  if (hr.length !== Number(n)) throw new Error(`${abbr}: ${n} stars said, ${hr.length} given`);
  if (!paths.has(abbr)) paths.set(abbr, []);
  paths.get(abbr).push(hr.map(Number));
}

const rad = d => d * Math.PI / 180;
const unit = s => [Math.cos(rad(s.dec)) * Math.cos(rad(s.ra)), Math.cos(rad(s.dec)) * Math.sin(rad(s.ra)), Math.sin(rad(s.dec))];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const fix = x => Number(x.toFixed(2));
const radius = v => Math.max(0.85, Math.min(3.1, 2.75 - 0.42 * v));   // (in a figure 100 wide: Antares about 2.3, a 4th-magnitude star 1.1)

function figure(abbr) {
  const polylines = paths.get(abbr);
  if (!polylines) throw new Error("no figure for " + abbr);
  const hrs = [...new Set(polylines.flat())];
  for (const h of hrs) if (!stars.has(h)) throw new Error(`${abbr}: HR ${h} not in the catalogue`);
  // the plane touching the sky at the figure's center: east and north there
  const c = hrs.map(h => unit(stars.get(h))).reduce((a, u) => [a[0] + u[0], a[1] + u[1], a[2] + u[2]], [0, 0, 0]);
  const len = Math.hypot(...c), z = c.map(x => x / len);
  const east = [-z[1], z[0], 0].map(x => x / Math.hypot(z[0], z[1]));
  const north = [z[1] * east[2] - z[2] * east[1], z[2] * east[0] - z[0] * east[2], z[0] * east[1] - z[1] * east[0]];
  const flat = new Map(hrs.map(h => { const u = unit(stars.get(h)), w = dot(u, z); return [h, [-dot(u, east) / w, -dot(u, north) / w]]; }));
  // fitted into a box 100 wide (or, for a tall figure, 80 high), with room round it
  const xs = [...flat.values()].map(p => p[0]), ys = [...flat.values()].map(p => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = 6, k = Math.min((100 - 2 * pad) / (x1 - x0), (80 - 2 * pad) / (y1 - y0));
  const W = fix((x1 - x0) * k + 2 * pad), H = fix((y1 - y0) * k + 2 * pad);
  const at = h => { const [x, y] = flat.get(h); return [fix((x - x0) * k + pad), fix((y - y0) * k + pad)]; };
  const segs = new Set(), lines = [];
  for (const pl of polylines) for (let i = 0; i + 1 < pl.length; i++) {
    const [a, b] = [pl[i], pl[i + 1]], key = a < b ? a + "-" + b : b + "-" + a;
    if (a === b || segs.has(key)) continue;
    segs.add(key);
    const [p, q] = [at(a), at(b)], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ra = radius(stars.get(a).v) + 1.1, rb = radius(stars.get(b).v) + 1.1;
    if (d <= ra + rb) continue;
    const [ux, uy] = [(q[0] - p[0]) / d, (q[1] - p[1]) / d];
    lines.push(`<line x1="${fix(p[0] + ux * ra)}" y1="${fix(p[1] + uy * ra)}" x2="${fix(q[0] - ux * rb)}" y2="${fix(q[1] - uy * rb)}"/>`);
  }
  const dots = hrs.map(h => { const [x, y] = at(h); return `<circle cx="${x}" cy="${y}" r="${fix(radius(stars.get(h).v))}"/>`; });
  return { W, H, svg: `<g class="con-lines">${lines.join("")}</g><g class="con-stars">${dots.join("")}</g>`, stars: hrs.length };
}

const made = ZODIAC.map(([sign, abbr, name]) => ({ sign, abbr, name, ...figure(abbr) }));
const credit = "The figures: ConstellationLines by Marc van der Sluys (https://github.com/MarcvdSluys/ConstellationLines), CC BY 4.0; " +
  "the stars: the Yale Bright Star Catalogue, 5th revised edition (CDS V/50). Drawn by tools/make-constellations.mjs, which projects and styles them.";
const symbols = made.map(m => `<symbol id="con-${m.sign.toLowerCase()}" viewBox="0 0 ${m.W} ${m.H}"><title>${m.name}</title>${m.svg}</symbol>`).join("\n");
writeFileSync(new URL("../astrology/constellations.svg", import.meta.url),
  `<?xml version="1.0" encoding="UTF-8"?>\n<!-- hazeljs-examples: the twelve zodiac constellations, made by tools/make-constellations.mjs; do not edit.\n     ${credit} -->\n` +
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n<style>.con-lines line { stroke: currentColor; stroke-width: 0.7; stroke-linecap: round; opacity: 0.6; } .con-stars circle { fill: currentColor; }</style>\n${symbols}\n</svg>\n`);
writeFileSync(new URL("../astrology/constellations.html", import.meta.url), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The zodiac's constellations</title>
<style>:root { color-scheme: light dark; } body { font: 15px/1.5 system-ui, sans-serif; margin: 24px; background: Canvas; color: CanvasText; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; } figure { margin: 0; }
svg { width: 100%; height: auto; color: CanvasText; } .con-lines line { stroke: currentColor; stroke-width: 0.7; stroke-linecap: round; opacity: 0.6; }
.con-stars circle { fill: currentColor; } figcaption { color: GrayText; font-size: 0.9em; }</style></head>
<body><h1>The zodiac's constellations</h1><p>${credit}</p><div class="grid">
${made.map(m => `<figure><svg viewBox="0 0 ${m.W} ${m.H}">${m.svg}</svg><figcaption>${m.name} (${m.abbr}), for the sign ${m.sign}: ${m.stars} stars</figcaption></figure>`).join("\n")}
</div></body></html>
`);
console.log(made.map(m => `${m.abbr} ${m.stars} stars, ${m.W}x${m.H}`).join("; "));
