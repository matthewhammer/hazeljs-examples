// hazeljs-examples, Star wave in plain JavaScript (^report(65), 2026-11-25; Matthew: "Why don't we have plain JS data for the
// later part of the table? Can we get it?"), for timing only: the page never loads it. The same game as
// starwave/rules/StarWave.hz (visitors marching down from the stars, dropping rainbows on the town; a heart sent up connects;
// the last heart just right, too soon or too late; a robot that keeps as many visitors as the town still needs rainbows from),
// written as a JavaScript programmer would: the visitors and the town arrays copied when they change, loops for the scans.
// Hazel's Int division truncates, as Math.trunc does. Same functions and values as compiled.js, so node/package-bench.mjs
// times it beside the others and compares every way's answers.
(() => {
  "use strict";
  const FULL = 22, FLOORS = [5, 7, 6, 4];
  const next = s => (s * 48271) % 2147483647;
  const q = (a, b) => Math.trunc(a / b);
  const bx = s => 54 + 140 * s, roof = s => 762 - 18 * FLOORS[s];
  const rowsOf = w => (w >= 2 ? 5 : 3 + w), topOf = w => 110 + 20 * (w > 5 ? 5 : w);
  function kinds(n) {
    const out = new Array(45);
    for (let i = 0; i < 45; i++) { const r = q(i, 9); out[i] = r >= n ? 0 : r === 0 ? 3 : r <= q(n - 1, 2) ? 2 : 1; }
    return out;
  }
  const waveStart = (cx, tries, hearts, wins, wave, seed, t, hit) =>
    ({ cx, hx: -1, hy: -1, drops: [], aliens: kinds(rowsOf(wave)), fx: 92, fy: topOf(wave), fdir: 1, march: 24, town: [0, 0, 0, 0],
       glow: 0, tries, hearts, wins, wave, seed, wait: 0, verdict: 0, over: false, hit, t });
  const start = seed => waveStart(300, 3, 0, 0, 0, next(seed + 1), 0, 0);

  // ---- what is where
  function alienAt(aliens, fx, fy, x, y) {
    if (x < fx || y < fy) return -1;
    const c = q(x - fx, 48), r = q(y - fy, 40);
    if (c > 8 || r > 4 || x - fx - c * 48 >= 32 || y - fy - r * 40 >= 24) return -1;
    const i = r * 9 + c;
    return aliens[i] > 0 ? i : -1;
  }
  function buildingAt(x) { if (x < 54) return -1; const s = q(x - 54, 140); return s > 3 || x - bx(s) >= 72 ? -1 : s; }
  const colHas = (aliens, c) => aliens[c] > 0 || aliens[9 + c] > 0 || aliens[18 + c] > 0 || aliens[27 + c] > 0 || aliens[36 + c] > 0;
  function firstCol(aliens) { for (let c = 0; c <= 8; c++) if (colHas(aliens, c)) return c; return 0; }
  function lastCol(aliens) { for (let c = 8; c >= 0; c--) if (colHas(aliens, c)) return c; return 8; }
  function lowest(aliens, c) { for (let r = 4; r >= 0; r--) if (aliens[r * 9 + c] > 0) return r; return -1; }
  function bottom(aliens, fy) { for (let r = 4; r >= 0; r--) for (let c = 0; c < 9; c++) if (aliens[r * 9 + c] > 0) return fy + r * 40 + 24; return -1; }
  const alive = xs => { let n = 0; for (const x of xs) if (x > 0) n++; return n; };
  const sum = xs => { let n = 0; for (const x of xs) n += x; return n; };

  // ---- the rainbows
  // the building a rainbow landing at x turns a floor of: the nearest with a floor still plain; -1 when the town is all rainbow
  function nearestPlain(town, x) {
    let best = -1, bd = 100000;
    for (let s = 0; s <= 3; s++) { const d = Math.abs(bx(s) + 36 - x); if (town[s] < FLOORS[s] && d < bd) { best = s; bd = d; } }
    return best;
  }
  // the drops a step on: each 4 down; one on a roof, or on the ground, turns a floor rainbow and is gone
  function fall(ds, town0) {
    const town = town0.slice(), out = [];
    for (const d of ds) {
      const y = d.y + 4, s = buildingAt(d.x);
      if (y >= 762 || (s >= 0 && y >= roof(s))) { const p = nearestPlain(town, d.x); if (p >= 0) town[p]++; }
      else out.push({ x: d.x, y });
    }
    return [out, town];
  }
  // the column a rainbow comes from: the first with a visitor left from column c on, round to the start
  function colFrom(aliens, c) { for (let k = 0; k <= 8; k++) { const cc = (c + k) % 9; if (colHas(aliens, cc)) return cc; } return -1; }

  // ---- one step
  const paused = (g, wait, hit) => ({ cx: g.cx, hx: g.hx, hy: g.hy, drops: g.drops, aliens: g.aliens, fx: g.fx, fy: g.fy, fdir: g.fdir, march: g.march, town: g.town,
    glow: g.glow, tries: g.tries, hearts: g.hearts, wins: g.wins, wave: g.wave, seed: g.seed, wait, verdict: g.verdict, over: g.over, hit, t: g.t + 1 });
  // move: -1, 0 or 1; fire: a heart from the launcher, if none is in the air
  function step(g, move, fire) {
    if (g.over) return g;
    if (g.wait > 1) return paused(g, g.wait - 1, 0);
    if (g.wait === 1) return waveStart(g.cx, g.tries, g.hearts, g.wins, g.verdict === 3 ? g.wave + 1 : g.wave, g.seed, g.t + 1, 7);
    let cx = g.cx + 6 * move; cx = cx < 30 ? 30 : cx > 570 ? 570 : cx;
    const firing = fire && g.hy < 0;
    const hx0 = firing ? cx : g.hx, hy0 = firing ? 724 : g.hy, hy1 = hy0 >= 0 ? hy0 - 12 : -1;
    let hitA = -1;
    if (hy1 >= 0) { hitA = alienAt(g.aliens, g.fx, g.fy, hx0, hy1); if (hitA < 0) hitA = alienAt(g.aliens, g.fx, g.fy, hx0, hy1 + 6); }
    let aliens = g.aliens;
    if (hitA >= 0) { aliens = aliens.slice(); aliens[hitA] = 0; }
    const heartOn = hy1 >= 0 && hitA < 0, hearts = g.hearts + (hitA >= 0 ? 1 : 0), left = alive(aliens);
    const marching = g.march <= 1;
    const edge = g.fdir > 0 ? g.fx + lastCol(aliens) * 48 + 32 + 8 > 592 : g.fx + firstCol(aliens) * 48 - 8 < 8;
    const fx = marching && !edge ? g.fx + 8 * g.fdir : g.fx, fy = marching && edge ? g.fy + 20 : g.fy, fdir = marching && edge ? 0 - g.fdir : g.fdir;
    const march = marching ? 4 + q(left, 2) : g.march - 1;
    const [drops0, town] = fall(g.drops, g.town);
    const painted = sum(town), s1 = next(g.seed);
    const c = colFrom(aliens, q(s1, 1000) % 9), lr = c >= 0 ? lowest(aliens, c) : -1, n = drops0.length;
    const drop = lr >= 0 && painted + n < FULL && n < 3 && s1 % 1000 < 3 + q(left, 3);
    const drops = drop ? [{ x: fx + c * 48 + 16, y: fy + lr * 40 + 24 }, ...drops0] : drops0;
    const late = painted >= FULL && g.glow === 1;
    const glow = painted >= FULL ? (g.glow > 0 ? g.glow - 1 : 480) : 0;
    const landed = left > 0 && bottom(aliens, fy) >= 630;
    const verdict = left === 0 ? (painted >= FULL ? 3 : 5) : landed ? 4 : late ? 6 : 0;
    if (verdict > 0) {
      const tries = verdict === 3 ? g.tries : g.tries - 1;
      return { cx, hx: -1, hy: -1, drops: [], aliens, fx, fy, fdir, march, town, glow, tries, hearts, wins: g.wins + (verdict === 3 ? 1 : 0), wave: g.wave, seed: s1,
               wait: tries <= 0 ? 0 : 150, verdict, over: tries <= 0, hit: verdict, t: g.t + 1 };
    }
    return { cx, hx: heartOn ? hx0 : -1, hy: heartOn ? hy1 : -1, drops, aliens, fx, fy, fdir, march, town, glow, tries: g.tries, hearts, wins: g.wins, wave: g.wave,
             seed: s1, wait: 0, verdict: g.verdict, over: false, hit: hitA >= 0 ? 1 : 0, t: g.t + 1 };
  }

  // ---- the robot
  const toCome = g => FULL - sum(g.town) - g.drops.length;
  const keepFor = (g, p) => (p <= 0 ? 1 : 1 + q(p * 9 * rowsOf(g.wave) + FULL - 1, FULL));
  // the visitor to aim at: a column's lowest, the lowest rows first unless the town is all rainbow, where it will be when the heart gets there
  function aim(g) {
    let best = g.cx, bd = 100000;
    const pace = 4 + q(alive(g.aliens), 2);
    for (let c = 0; c <= 8; c++) {
      if (!colHas(g.aliens, c)) continue;
      const r = lowest(g.aliens, c), rise = q(724 - (g.fy + r * 40 + 12), 12);
      const x = g.fx + c * 48 + 16 + q(rise, pace) * 8 * g.fdir;
      const d = Math.abs(x - g.cx) + (g.glow > 0 ? 0 : 120 * (4 - r));
      if (d < bd) { best = x; bd = d; }
    }
    return best;
  }
  function robot(g) {
    if (g.over || g.wait > 0) return { move: 0, fire: false };
    const left = alive(g.aliens), x = aim(g);
    const move = x > g.cx + 3 ? 1 : x < g.cx - 3 ? -1 : 0;
    const near = 630 - bottom(g.aliens, g.fy) < 50;
    const want = g.glow > 0 || (left >= 2 && (near || left - 1 >= keepFor(g, toCome(g))));
    return { move, fire: want && g.hy < 0 && Math.abs(x - g.cx) <= 10 };
  }

  const api = { start, step, robot, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.StarWavePlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
