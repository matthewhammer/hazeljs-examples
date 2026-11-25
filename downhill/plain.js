// hazeljs-examples, Downhill in plain JavaScript (^report(65), 2026-11-25; Matthew: "Why don't we have plain JS data for the
// later part of the table? Can we get it?"), for timing only: the page never loads it. The same game as
// downhill/rules/Downhill.hz (a course made from its seed a stretch at a time; a run one step at a time: heading and crouch,
// the snow's pull and drag, trees and rocks to fall on, ramps, bumps, gates, and far enough down a snowball; a robot that
// skis it), written as a JavaScript programmer would: the things in arrays, loops in place of the folds. The Floats in the
// rules' order of operations, so every answer is the same to the bit. Same functions and values as compiled.js, so
// node/package-bench.mjs times it beside the others and compares every way's answers.
(() => {
  "use strict";
  const STRETCH = 600, HALF = 800;
  const next = s => (s * 48271) % 2147483647;
  const mix = (seed, k, i) => next(next(next(seed + 1 + k * 7919) + i * 104729) + 17);
  // the course's stretch k: the first two clear; then more things the further down, up to 14 a stretch
  function course(seed, k) {
    if (k < 2) return [];
    const n = Math.min(5 + Math.trunc(k / 6), 14), out = [];
    for (let i = 0; i < n; i++) {
      const r = mix(seed, k, i), roll = r % 100;
      const kind = roll < 52 ? 0 : roll < 66 ? 1 : roll < 74 ? 2 : roll < 86 ? 3 : 4;
      const x = Math.trunc(r / 100) % (2 * HALF) - HALF;
      const y = k * STRETCH + Math.trunc(r / 300000) % STRETCH;
      const w = kind === 4 ? 150 + Math.trunc(r / 7) % 120 : kind === 3 ? 40 + Math.trunc(r / 11) % 40 : 0;
      out.push({ kind, x, y, w });
    }
    return out;
  }
  // the things near a place down the hill: its stretch, and the ones above and below it
  function around(seed, y) {
    const k = Math.trunc(Math.trunc(y) / STRETCH);
    return [...course(seed, k - 1), ...course(seed, k), ...course(seed, k + 1)];
  }
  function angle(h) {
    const a = h === 0 ? 0 : h === 1 || h === -1 ? 0.42 : h === 2 || h === -2 ? 0.87 : 1.5708;
    return h < 0 ? 0 - a : a;
  }
  const NONE = { kind: 9, x: 0, y: 0, w: 0 };
  const near = (th, x, y, r) => { const dx = th.x - x, dy = th.y - y; return dx * dx + dy * dy < r * r; };
  // what a skier going from (x0, y0) to (x1, y1) runs into (a gate is not in the way)
  function meets(ts, x0, y0, x1, y1) {
    const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
    for (const th of ts) {
      if (th.kind === 4) continue;
      const r = th.kind === 0 ? 16 : th.kind === 1 ? 13 : th.kind === 2 ? 24 : th.kind === 3 ? th.w : 0;
      if (near(th, x1, y1, r) || near(th, xm, ym, r)) return th;
    }
    return NONE;
  }
  // whether that way goes between a gate's two flags
  function through(ts, x0, y0, x1, y1) {
    const xm = (x0 + x1) / 2;
    for (const th of ts)
      if (th.kind === 4 && y0 < th.y && y1 >= th.y && xm > th.x - Math.trunc(th.w / 2) && xm < th.x + Math.trunc(th.w / 2)) return true;
    return false;
  }

  function start(seed, chase) {
    return { x: 0, y: 0, speed: 0, heading: 0, air: 0, rise: 0, down: 0, score: 0, gates: 0, jumps: 0, bx: 0, by: 0, br: 0, rolling: false, over: false, hit: 0, seed, t: 0, chase };
  }
  // the snowball: its place, its size, whether it rolls, and whether it has caught the skier
  function roll(g, x, y) {
    const bx0 = g.bx / 100, by0 = g.by / 100, br0 = g.br / 100;
    if (!g.chase) return [0, 0, 0, false, false];
    if (!g.rolling) return y > 75000 ? [x, y - 1300, 34, true, false] : [0, 0, 0, false, false];
    const v = 8.6 + (y - 75000) / 60000, vb = v > 12.4 ? 12.4 : v;
    const bya = by0 + vb, by1 = bya < y - 1800 ? y - 1800 : bya;
    const dx = x - bx0, bx1 = bx0 + (dx > 2.6 ? 2.6 : dx < -2.6 ? -2.6 : dx);
    const br1 = br0 < 88 ? br0 + 0.012 : br0;
    const ex = x - bx1, ey = y - by1;
    return [bx1, by1, br1, true, ex * ex + ey * ey < (br1 + 8) * (br1 + 8)];
  }

  // turn: -1, 0 or 1; tuck: crouching
  function step(g, turn, tuck) {
    if (g.over) return g;
    const hu = f => Math.floor(f * 100 + 0.5);
    const x0 = g.x / 100, y0 = g.y / 100, v0 = g.speed / 100, z0 = g.air / 100, w0 = g.rise / 100;
    const flying = z0 > 0 || w0 > 0, lying = g.down > 0;
    let h1 = g.heading;
    if (!lying && !flying) { h1 = g.heading + turn; h1 = h1 > 3 ? 3 : h1 < -3 ? -3 : h1; }
    const a = angle(h1);
    const low = h1 >= -1 && h1 <= 1, drag = tuck && low ? 0.00045 : 0.0009, across = h1 === 3 || h1 === -3;
    const v1 = lying ? 0 : flying ? v0 : v0 + 0.09 * Math.cos(a) - drag * v0 * v0 - (across ? 0.12 : 0.004);
    const v2 = v1 < 0 ? 0 : v1;
    const xa = x0 + v2 * Math.sin(a), x1 = xa > 1000 ? 1000 : xa < -1000 ? -1000 : xa;
    const y1 = y0 + v2 * Math.cos(a);
    const z1 = flying ? z0 + w0 : 0;
    const landed = flying && z1 <= 0, z2 = landed ? 0 : z1;
    const w1 = flying && !landed ? w0 - 0.22 : 0;
    const ts = around(g.seed, y1);
    const th = lying || z2 > 6 ? NONE : meets(ts, x0, y0, x1, y1), k = th.kind;
    const fall = (k === 0 && z2 < 40) || (k === 1 && z2 <= 0);
    const jump = k === 2 && !flying, bumps = k === 3 && !flying;
    const gate = !lying && through(ts, x0, y0, x1, y1);
    const v3 = fall ? 0 : bumps ? v2 * 0.93 : v2;
    const y3 = fall ? th.y + 26 : y1;
    const rise = jump ? 3.2 + v2 * 0.32 : w1;
    const down = fall ? 50 : lying ? g.down - 1 : 0;
    const bonus = (gate ? 50 : 0) + (jump ? 25 : 0);
    const hit = fall ? (k === 0 ? 1 : 2) : jump ? 3 : gate ? 4 : bumps ? 6 : 0;
    const [bx, by, br, rolling, caught] = roll(g, x1, y3);
    return { x: hu(x1), y: hu(y3), speed: hu(v3), heading: fall ? 0 : h1, air: hu(z2), rise: hu(rise), down, score: g.score + bonus,
             gates: g.gates + (gate ? 1 : 0), jumps: g.jumps + (jump ? 1 : 0), bx: hu(bx), by: hu(by), br: hu(br), rolling,
             over: caught, hit: caught ? 5 : hit, seed: g.seed, t: g.t + 1, chase: g.chase };
  }

  // ---- the robot ----
  // how far a skier can go from (x, y) the way (dx, dy) before a tree or a rock in its path (30 either side), looking 320 ahead
  function clear(ts, x, y, dx, dy) {
    let c = 320;
    for (let i = ts.length - 1; i >= 0; i--) {
      const th = ts[i];
      if (th.kind !== 0 && th.kind !== 1) continue;
      const px = th.x - x, py = th.y - y;
      const along = px * dx + py * dy, off = px * dy - py * dx, offa = off < 0 ? 0 - off : off;
      if (along > 0 && along < c && offa < 30) c = along;
    }
    return c;
  }
  // what that way is worth beyond being clear: a gate it goes between (90) or a ramp it goes over (40), within 260 ahead
  function bonusOf(ts, x, y, dx, dy) {
    let total = 0;
    for (let i = ts.length - 1; i >= 0; i--) {
      const th = ts[i];
      let b = 0;
      if (th.kind === 4 || th.kind === 2) {
        const px = th.x - x, py = th.y - y;
        const along = px * dx + py * dy, off = px * dy - py * dx, offa = off < 0 ? 0 - off : off;
        const room = th.kind === 4 ? th.w / 2 - 12 : 14;
        if (along > 0 && along < 260 && offa < room) b = th.kind === 4 ? 90 : 40;
      }
      total = b + total;
    }
    return total;
  }
  function robot(g) {
    if (g.over || g.down > 0 || g.air > 0 || g.rise > 0) return { turn: 0, tuck: false };
    const x = g.x / 100, y = g.y / 100;
    const ts = around(g.seed, y + 300);
    let bh = 0, bw = -100000;
    for (let h = -2; h <= 2; h++) {
      const a = angle(h), dx = Math.sin(a), dy = Math.cos(a);
      const c = clear(ts, x, y, dx, dy), ahead = x + dx * 200;
      const edge = ahead > 760 || ahead < -760 ? 300 : 0;
      const w = c * 2 + bonusOf(ts, x, y, dx, dy) - Math.abs(h) * 25 - Math.abs(h - g.heading) * 15 - edge;
      if (w > bw) { bh = h; bw = w; }
    }
    return { turn: bh > g.heading ? 1 : bh < g.heading ? -1 : 0, tuck: bh === 0 && clear(ts, x, y, 0, 1) > 250 };
  }

  const api = { start, step, course, robot, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.DownhillPlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
