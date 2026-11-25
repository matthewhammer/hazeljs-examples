// hazeljs-examples, Butterfly garden in plain JavaScript (^report(65), 2026-11-25; Matthew: "Why don't we have plain JS data
// for the later part of the table? Can we get it?"), for timing only: the page never loads it. The same game as
// bugs/rules/Bugs.hz (caterpillars winding down through a garden of buds; a drop of nectar feeds a segment into a cocoon, whose
// butterfly opens the nearest bud; three drops open a bud; the garden in bloom wins the wave; a robot that looks two of the
// caterpillars' moves ahead), written as a JavaScript programmer would: arrays in the rules' order, copied where they change, a
// Set for the cells ahead. Same functions and values as compiled.js, so node/package-bench.mjs times it beside the others and
// compares every way's answers.
(() => {
  "use strict";
  const COLS = 24, ROWS = 32;
  const next = s => (s * 48271) % 2147483647;
  const q = (a, b) => Math.trunc(a / b);
  const budAt = (bs, c, r) => bs.some(b => b.c === c && b.r === r);
  const closedAt = (bs, c, r) => bs.some(b => b.c === c && b.r === r && b.hp > 0);
  const segAt = (gs, c, r) => gs.some(s => s.c === c && s.r === r);
  const closedCount = bs => { let n = 0; for (const b of bs) if (b.hp > 0) n++; return n; };
  // n buds by chance in rows 2 to 25, none twice in a cell (the last placed first, as the rules list them); and the seed after
  function scatter(n, seed) {
    let bs = [];
    while (n > 0) {
      seed = next(seed);
      const c = q(seed, 7) % COLS, r = 2 + q(seed, 1000) % 24;
      if (!budAt(bs, c, r)) { bs = [{ c, r, hp: 3 }, ...bs]; n--; }
    }
    return [bs, seed];
  }
  function bug(n) { const out = []; for (let i = 0; i < n; i++) out.push({ c: n - 1 - i, r: 0, d: 1, v: 1 }); return out; }
  const paceOf = w => Math.max(4, 7 - w), lenOf = w => Math.min(18, 10 + 2 * w), budsOf = w => Math.min(26, 16 + 2 * w);
  function garden(w, seed, px, py, lives, score, freed, t, hit) {
    const [buds, s1] = scatter(budsOf(w), next(seed + 1));
    return { px, py, sx: -1, sy: -1, segs: bug(lenOf(w)), buds, cocoons: [], lives, score, freed, wave: w, seed: s1,
             tick: paceOf(w), pace: paceOf(w), wait: w > 0 ? 30 : 0, over: false, hit, t };
  }
  const start = seed => garden(0, seed, 300, 770, 3, 0, 0, 0, 0);

  // ---- the caterpillars
  function moveSeg(bs, cs, s) {
    const nc = s.c + s.d;
    if (nc >= 0 && nc < COLS && !closedAt(bs, nc, s.r) && !budAt(cs, nc, s.r)) return { c: nc, r: s.r, d: s.d, v: s.v };
    const v = s.r >= ROWS - 1 ? -1 : s.v < 0 && s.r <= 26 ? 1 : s.v;
    return { c: s.c, r: s.r + v, d: 0 - s.d, v };
  }
  const moveAll = (bs, cs, gs) => gs.map(s => moveSeg(bs, cs, s));
  function dropSeg(gs, c, r) { const i = gs.findIndex(s => s.c === c && s.r === r); return i < 0 ? gs : [...gs.slice(0, i), ...gs.slice(i + 1)]; }
  // ---- the buds and the butterflies
  function water(bs, c, r) {
    const i = bs.findIndex(b => b.c === c && b.r === r && b.hp > 0);
    if (i < 0) return bs;
    const out = bs.slice(); out[i] = { c: bs[i].c, r: bs[i].r, hp: bs[i].hp - 1 }; return out;
  }
  function nearestBud(bs, c, r) {
    let bc = -1, br = -1, bd = 100000;
    for (const b of bs) { const d = Math.abs(b.c - c) + Math.abs(b.r - r); if (b.hp > 0 && d < bd) { bc = b.c; br = b.r; bd = d; } }
    return [bc, br];
  }
  function openAt(bs, c, r) {
    const i = bs.findIndex(b => b.c === c && b.r === r);
    if (i < 0) return bs;
    const out = bs.slice(); out[i] = { c: bs[i].c, r: bs[i].r, hp: 0 }; return out;
  }
  // the cocoons a step on; a butterfly out opens the nearest bud: the cocoons left, the buds, how many came out
  function hatch(cs, bs) {
    const left = []; let n = 0;
    for (const k of cs) {
      if (k.hp > 1) left.push({ c: k.c, r: k.r, hp: k.hp - 1 });
      else { const [bc, br] = nearestBud(bs, k.c, k.r); if (bc >= 0) bs = openAt(bs, bc, br); n++; }
    }
    return [left, bs, n];
  }

  // ---- one step
  const canX = (px, mx, k) => { const x = px + 7 * mx * k; return x < 12 ? 12 : x > 588 ? 588 : x; };
  const canY = (py, my, k) => { const y = py + 7 * my * k; return y < 662 ? 662 : y > 788 ? 788 : y; };
  function step(g, mx, my, fire) {
    if (g.over) return g;
    const ready = g.wait <= 0;
    const px = ready ? canX(g.px, mx, 1) : g.px, py = ready ? canY(g.py, my, 1) : g.py;
    const firing = ready && fire && g.sy < 0;
    const sx = firing ? px : g.sx, sy = firing ? py - 14 : g.sy >= 0 ? g.sy - 18 : -1;
    const sc = q(sx, 25), sr = sy >= 0 ? q(sy, 25) : -1;
    const fed = sy >= 0 && segAt(g.segs, sc, sr);
    const watered = sy >= 0 && !fed && closedAt(g.buds, sc, sr);
    const segs0 = fed ? dropSeg(g.segs, sc, sr) : g.segs;
    const buds0 = watered ? water(g.buds, sc, sr) : g.buds;
    const opened = watered && !closedAt(buds0, sc, sr);
    const [cocoons, buds1, out] = hatch(g.cocoons, buds0);
    const cocoons1 = fed ? [{ c: sc, r: sr, hp: 90 }, ...cocoons] : cocoons;
    const moving = g.tick <= 1;
    const segs = moving ? moveAll(buds1, cocoons1, segs0) : segs0;
    const tick = moving ? g.pace : g.tick - 1;
    const caught = ready && segAt(segs, q(px, 25), q(py, 25));
    const lives = caught ? g.lives - 1 : g.lives;
    const dropOn = sy >= 0 && !fed && !watered;
    let head = true;   // (the segment fed is a head when none is just ahead of it)
    if (fed) { const s = g.segs.find(s => s.c === sc && s.r === sr); head = !segAt(g.segs, sc + s.d, sr); }
    const score = g.score + (fed ? (head ? 100 : 10) : 0) + (opened ? 5 : 0) + 5 * out;
    const freed = g.freed + out;
    if (closedCount(buds1) === 0 && !caught) return garden(g.wave + 1, g.seed, px, py, lives, score + 500, freed, g.t + 1, 3);
    const more = segs.length === 0;
    return { px: caught ? 300 : px, py: caught ? 770 : py, sx: dropOn ? sx : -1, sy: dropOn ? sy : -1, segs: more ? bug(lenOf(g.wave)) : segs, buds: buds1,
             cocoons: cocoons1, lives, score, freed, wave: g.wave, seed: g.seed, tick: more ? g.pace : tick, pace: g.pace,
             wait: caught ? 60 : g.wait > 0 ? g.wait - 1 : 0, over: lives <= 0, hit: caught ? 2 : fed ? 1 : out > 0 ? 5 : opened ? 4 : more ? 6 : 0, t: g.t + 1 };
  }

  // ---- the robot
  const mxOf = i => { const a = q(i, 3); return a === 0 ? 0 : a === 1 ? -1 : 1; };
  const myOf = i => { const b = i % 3; return b === 0 ? 1 : b === 1 ? 0 : -1; };
  function robot(g) {
    if (g.over || g.wait > 0) return { mx: 0, my: 0, fire: false };
    const pc = q(g.px, 25), pr = q(g.py, 25);
    // the target: the nearest segment up on the lawn, else the nearest bud not yet open (across, then down)
    let tc = -1, bd = 100000;
    for (const s of g.segs) { const d = Math.abs(s.c - pc) * 4 + (31 - s.r); if (s.r <= 25 && d < bd) { tc = s.c; bd = d; } }
    if (tc < 0) { bd = 100000; for (const b of g.buds) { const d = Math.abs(b.c - pc) * 4 + (31 - b.r); if (b.hp > 0 && d < bd) { tc = b.c; bd = d; } } }
    const tx = tc < 0 ? g.px : tc * 25 + 12;
    const steps = Math.min(12, g.tick + g.pace);
    // the cells the caterpillars are in, and will be in after each of their next two moves
    const s1 = moveAll(g.buds, g.cocoons, g.segs), s2 = moveAll(g.buds, g.cocoons, s1), cells = new Set();
    for (const gs of [g.segs, s1, s2]) for (const s of gs) cells.add(s.c * 100 + s.r);
    let best = 0, bs = 1000000000;
    for (let i = 0; i <= 8; i++) {
      const mx = mxOf(i), my = myOf(i);
      let risk = 0;
      for (let k = steps; k >= 0; k--) if (cells.has(q(canX(g.px, mx, k), 25) * 100 + q(canY(g.py, my, k), 25))) risk++;
      const sc = risk * 1000 + Math.abs(tx - canX(g.px, mx, steps));
      if (sc < bs) { best = i; bs = sc; }
    }
    const above = g.segs.some(s => s.c === pc && s.r < pr);
    return { mx: mxOf(best), my: myOf(best), fire: g.sy < 0 && (above || Math.abs(tx - g.px) <= 12) };
  }

  const api = { start, step, robot, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.BugsPlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
