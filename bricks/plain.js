// hazeljs-examples, Bricks in plain JavaScript (^report(65), 2026-11-25; Matthew: "Why don't we have plain JS data for the
// later part of the table? Can we get it?"), for timing only: the page never loads it. The same game as bricks/rules/Bricks.hz
// (six levels' bricks; a step of 1/60 s: the paddle toward where you point, the ball in four small steps off the walls, the
// paddle and the bricks; a ball lost, a level cleared; a robot that sets the paddle where the ball comes down), written as a
// JavaScript programmer would: the bricks an array copied when one is hit, loops for the small steps. The ball's Floats in
// the same order of operations as the rules, so every answer is the same to the bit. Same functions and values as
// compiled.js, so node/package-bench.mjs times it beside the others and compares every way's answers.
(() => {
  "use strict";
  const COLS = 10, ROWS = 8, R = 8;
  // a brick's hits at level l, row r, column c: 0 none, 1 or 2 hits, 9 one that never breaks (six layouts, then round again)
  function cell(l, r, c) {
    const k = l % 6;
    if (k === 0) return r >= 1 && r <= 5 ? (r === 1 ? 2 : 1) : 0;
    if (k === 1) return r <= 6 && Math.abs(2 * c - 9) <= 2 * r + 1 ? (r === 0 ? 2 : 1) : 0;
    if (k === 2) return r <= 6 && (r + c) % 2 === 0 ? (r <= 1 ? 2 : 1) : 0;
    if (k === 3) return r === 3 && (c === 0 || c === 9) ? 9 : r <= 6 && Math.abs(2 * c - 9) + 2 * Math.abs(2 * r - 6) <= 9 ? (r === 3 ? 2 : 1) : 0;
    if (k === 4) return r === 2 && c >= 2 && c <= 7 && c % 2 === 0 ? 9 : r <= 6 && r !== 2 ? (r === 0 || r === 6 ? 2 : 1) : 0;
    return r <= 6 && (c <= 1 || c >= 8 || r === 0 || r === 6 || c === r + 1) ? (c === r + 1 ? 2 : 1) : 0;
  }
  function layout(l) {
    const out = new Array(ROWS * COLS);
    for (let i = 0; i < ROWS * COLS; i++) out[i] = cell(l, Math.trunc(i / COLS), i % COLS);
    return out;
  }
  function leftToBreak(bs) { let n = 0; for (const b of bs) if (b > 0 && b !== 9) n++; return n; }
  // the brick a point is in, or -1
  function brickAt(bs, x, y) {
    if (x < 2 || y < 80) return -1;
    const c = Math.floor((x - 2) / 60), r = Math.floor((y - 80) / 26);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
    const i = r * COLS + c;
    return x - 2 - c * 60 <= 56 && y - 80 - r * 26 <= 22 && bs[i] > 0 ? i : -1;
  }

  function start(l, wide) {
    return { bx: 300000, by: 731000, vx: 0, vy: 0, px: 300, pw: wide ? 140 : 96, bricks: layout(l), balls: 3, score: 0, level: l, held: true, over: false, hit: 0, t: 0 };
  }
  const speed = l => { const v = 6 + l * 0.5; return v > 9 ? 9 : v; };

  // n small steps of the ball, each a quarter of its speed; the ball, the bricks, the points and what happened
  function subs(n, b, px, pw, bs, score, hit) {
    let { x: bx, y: by, vx: bvx, vy: bvy } = b;
    for (; n > 0; n--) {
      const x = bx + bvx / 4, y = by + bvy / 4;
      const wl = x < R, wr = x > 600 - R, wt = y < R;
      const x1 = wl ? R + (R - x) : wr ? (600 - R) - (x - (600 - R)) : x;
      const vx1 = wl || wr ? 0 - bvx : bvx;
      const y1 = wt ? R + (R - y) : y;
      const vy1 = wt ? 0 - bvy : bvy;
      const h0 = wl || wr || wt ? Math.max(hit, 1) : hit;
      const d = x1 - px;
      if (vy1 > 0 && by + R <= 740 && y1 + R >= 740 && d <= pw / 2 + R && d >= 0 - pw / 2 - R) {
        const u0 = d / (pw / 2), u = u0 > 1 ? 1 : u0 < -1 ? -1 : u0;
        const s0 = Math.sqrt(vx1 * vx1 + vy1 * vy1), s = s0 > 13 ? 13 : s0, a = u * 1.05;
        bx = x1; by = 740 - R; bvx = s * Math.sin(a); bvy = 0 - s * Math.cos(a); hit = Math.max(h0, 2);
        continue;
      }
      const top = brickAt(bs, x1, y1 - R), bot = brickAt(bs, x1, y1 + R), lef = brickAt(bs, x1 - R, y1), rig = brickAt(bs, x1 + R, y1);
      const i = top >= 0 ? top : bot >= 0 ? bot : lef >= 0 ? lef : rig;
      if (i >= 0) {
        const k = bs[i], k2 = k === 9 ? 9 : k - 1, sp = k === 9 ? 1 : 1.006;
        if (top >= 0 || bot >= 0) { bx = x1; bvx = vx1 * sp; bvy = 0 - vy1 * sp; }
        else { by = y1; bvx = 0 - vx1 * sp; bvy = vy1 * sp; }
        bs = bs.slice(); bs[i] = k2;
        score += k === 9 ? 0 : k2 === 0 ? 10 : 5;
        hit = Math.max(h0, k2 === 0 ? 4 : 3);
      } else { bx = x1; by = y1; bvx = vx1; bvy = vy1; hit = h0; }
    }
    return [{ x: bx, y: by, vx: bvx, vy: bvy }, bs, score, hit];
  }

  // target: where to move the paddle's middle; launch: send off a ball waiting on the paddle
  function step(g, target, launch) {
    if (g.over) return g;
    const pwf = g.pw, lo = pwf / 2, hi = 600 - pwf / 2;
    const tgt = target < lo ? lo : target > hi ? hi : target;
    const p0 = g.px, dp = tgt - p0;
    const px = p0 + (dp > 16 ? 16 : dp < -16 ? -16 : dp);
    const ipx = Math.floor(px + 0.5);
    const ml = f => Math.floor(f * 1000 + 0.5);
    if (g.held) {
      const s = speed(g.level);
      return { bx: ipx * 1000, by: 731000, vx: launch ? ml(s * 0.45) : 0, vy: launch ? 0 - ml(s * 0.89) : 0, px: ipx, pw: g.pw,
               bricks: g.bricks, balls: g.balls, score: g.score, level: g.level, held: !launch, over: false, hit: 0, t: g.t + 1 };
    }
    const [b, bs, score, hit] = subs(4, { x: g.bx / 1000, y: g.by / 1000, vx: g.vx / 1000, vy: g.vy / 1000 }, px, pwf, g.bricks, g.score, 0);
    if (b.y > 830)
      return { bx: ipx * 1000, by: 731000, vx: 0, vy: 0, px: ipx, pw: g.pw, bricks: bs, balls: g.balls - 1, score, level: g.level,
               held: true, over: g.balls <= 1, hit: 5, t: g.t + 1 };
    if (leftToBreak(bs) === 0)
      return { bx: ipx * 1000, by: 731000, vx: 0, vy: 0, px: ipx, pw: g.pw, bricks: layout(g.level + 1), balls: g.balls, score: score + 100,
               level: g.level + 1, held: true, over: false, hit: 6, t: g.t + 1 };
    return { bx: ml(b.x), by: ml(b.y), vx: ml(b.vx), vy: ml(b.vy), px: ipx, pw: g.pw, bricks: bs, balls: g.balls, score, level: g.level,
             held: false, over: false, hit, t: g.t + 1 };
  }

  // ---- the robot ----
  // where the ball will cross the paddle's line: its path unfolded off the side walls
  function land(x, y, vx, vy) {
    const svy = vy < 0 ? 0 - vy : vy;
    if (svy < 0.01) return x;
    const dist = vy > 0 ? (740 - R) - y : (y - R) + (740 - 2 * R);
    const w = 600 - 2 * R;
    const raw = x - R + vx * dist / svy;
    const m = raw - 2 * w * Math.floor(raw / (2 * w));
    return R + (m > w ? 2 * w - m : m);
  }
  function robot(g) {
    if (g.over) return { target: g.px, launch: false };
    if (g.held) return { target: 300, launch: g.px >= 290 && g.px <= 310 };
    const lx = land(g.bx / 1000, g.by / 1000, g.vx / 1000, g.vy / 1000);
    // the column with the most bricks left to break (the first of the most)
    const counts = new Array(COLS).fill(0);
    g.bricks.forEach((b, i) => { if (b > 0 && b !== 9) counts[i % COLS]++; });
    let c = 4, most = -1;
    for (let k = 0; k < COLS; k++) if (counts[k] > most) { c = k; most = counts[k]; }
    const u0 = (2 + c * 60 + 28 - lx) / 400, u = u0 > 0.7 ? 0.7 : u0 < -0.7 ? -0.7 : u0;
    return { target: Math.floor(lx - u * g.pw / 2 * 0.9 + 0.5), launch: false };
  }

  const api = { start, step, layout, robot, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.BricksPlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
