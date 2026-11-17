// hazeljs-oracles, astrology (ticket 768): the rules in astrology/rules/*.hz, built by hazeljs, and checked against
// Astronomy Engine (https://github.com/cosinekitty/astronomy, MIT), which the pages never load: the Julian day, the
// sidereal time, the ascendant and the midheaven, for many moments and places; then the signs and aspects of a sample.
//
//   node node/astrology.mjs
import Hazel from "hazeljs";
import * as A from "astronomy-engine";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../astrology/rules/" + path, import.meta.url), "utf8").replace(/\s+$/, "");
const MODULES = ["Zodiac", "Aspects", "Chart"];
const t0 = performance.now();
const r = Hazel.runProgram({
  preamble: read("preamble.hz"),
  modules: MODULES.map(name => ({ name, text: read(name + ".hz") })),
  tail: "(sign_of = Zodiac.sign_of, element = Zodiac.element, modality = Zodiac.modality, ruler = Zodiac.ruler, " +
        "julian_day = Chart.julian_day, sidereal = Chart.sidereal, chart = Chart.chart, among = Aspects.among, transits = Aspects.transits)",
});
if (!r.ok) { console.log("not built:", JSON.stringify(r.errors, null, 1).slice(0, 3000)); process.exit(1); }
const H0 = r.value;
// (hazeljs 0.0.7: a whole number from JavaScript goes in as an Int where the function wants a Float, even with the
// parameter annotated, and Hazel's float operations are stuck on it; found here 2026-11-17. Until hazeljs reads it as
// the declared type, a whole number is nudged by 1e-9, a billionth of a degree or an hour, which no reading can notice.)
const fl = v => Number.isInteger(v) ? v + 1e-9 : v;
const H = H0;
console.log(`built in ${(performance.now() - t0).toFixed(0)} ms`);

let seed = 11; const draw = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sep = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const moment = d => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
  hour: fl(d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600 + d.getUTCMilliseconds() / 3.6e6) });

// The ascendant and midheaven, by Astronomy Engine: the ecliptic of date turned to the equator of date and to the horizon.
// The ascendant is the ecliptic's degree on the horizon in the east; the midheaven the one whose right ascension is the
// local sidereal time (on the meridian). Each found by a scan, then halving.
function angles(date, lat, lon) {
  const time = A.MakeTime(date), obs = new A.Observer(lat, lon, 0), rot = A.Rotation_ECT_EQD(time);
  const eqOf = l => A.EquatorFromVector(A.RotateVector(rot, new A.Vector(Math.cos(l * Math.PI / 180), Math.sin(l * Math.PI / 180), 0, time)));
  const hor = l => { const eq = eqOf(l); return A.Horizon(time, obs, eq.ra, eq.dec, null); };
  const lst = A.SiderealTime(date) * 15 + lon;
  const wrap = x => { let d = ((x % 360) + 540) % 360 - 180; return d; };
  const root = (f, ok) => {
    for (let l = 0; l < 360; l += 0.5) {
      const a = f(l), b = f(l + 0.5);
      if (Math.sign(a) !== Math.sign(b) && Math.abs(a - b) < 90) {
        let lo = l, hi = l + 0.5;
        for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (Math.sign(f(lo)) === Math.sign(f(m))) lo = m; else hi = m; }
        const x = (lo + hi) / 2;
        if (ok(x)) return x;
      }
    }
    return null;
  };
  return { asc: root(l => hor(l).altitude, l => hor(l).azimuth < 180), mc: root(l => wrap(eqOf(l).ra * 15 - lst), () => true) };
}

let n = 0, worst = { jd: 0, gmst: 0, asc: 0, mc: 0 }, where = {};
const note = (k, err, what) => { if (err > worst[k]) { worst[k] = err; where[k] = what; } };
for (let i = 0; i < 300; i++) {
  const date = new Date(Date.UTC(1900, 0, 1) + draw() * (Date.UTC(2100, 0, 1) - Date.UTC(1900, 0, 1)));
  const lat = -60 + 120 * draw(), lon = -180 + 360 * draw();
  const m = moment(date);
  const jd = H.julian_day(m), jdA = A.MakeTime(date).ut + 2451545;
  note("jd", Math.abs(jd - jdA) * 86400, date.toISOString());
  const gmst = H.sidereal(fl(jd)), gast = A.SiderealTime(date) * 15;
  note("gmst", sep(gmst, gast), date.toISOString());   // (mean against apparent: nutation, at most about 0.005 degrees)
  const c = H.chart(m, { latitude: fl(lat), longitude: fl(lon) });
  const e = angles(date, lat, lon);
  if (e.asc !== null) note("asc", sep(c.ascendant, e.asc), `${date.toISOString()} at ${lat.toFixed(1)}, ${lon.toFixed(1)}`);
  if (e.mc !== null) note("mc", sep(c.midheaven, e.mc), `${date.toISOString()} at ${lon.toFixed(1)}`);
  n++;
}
console.log(`${n} moments, 1900 to 2100, latitudes -60 to 60: the largest differences from Astronomy Engine:`);
console.log(`  the Julian day ${worst.jd.toFixed(3)} s (${where.jd}); the sidereal time ${worst.gmst.toFixed(4)} degrees (${where.gmst})`);
console.log(`  the ascendant ${worst.asc.toFixed(4)} degrees (${where.asc}); the midheaven ${worst.mc.toFixed(4)} degrees (${where.mc})`);

// a sample: signs, elements, and aspects among some places, and transits
const places = [["Sun", 15.2], ["Moon", 128.7], ["Mercury", 2.9], ["Venus", 47.1], ["Mars", 196.0], ["Jupiter", 252.4]]
  .map(([body, longitude]) => ({ body: { tag: body }, longitude: fl(longitude) }));
for (const p of places) {
  const s = H.sign_of(fl(p.longitude));
  console.log(`  ${p.body.tag} at ${p.longitude}: ${s.tag}, ${H.element(s).tag}, ${H.modality(s).tag}, ruled by ${H.ruler(s).tag}`);
}
console.log("  aspects:", H.among(places).map(a => `${a.a.tag} ${a.kind.tag} ${a.b.tag} (${a.orb.toFixed(1)})`).join("; "));
const now = [{ body: { tag: "Moon" }, longitude: fl(194) }, { body: { tag: "Saturn" }, longitude: fl(345) }];
console.log("  transits:", H.transits(now, places).map(a => `${a.a.tag} ${a.kind.tag} ${a.b.tag} (${a.orb.toFixed(1)})`).join("; "));
