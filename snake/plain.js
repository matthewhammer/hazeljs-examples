// hazeljs-examples, Snake in plain JavaScript (^report(65), 2026-11-25; Matthew: "Why don't we have plain JS data for the
// later part of the table? Can we get it?"), for timing only: the page never loads it. The same game as snake/rules/Snake.hz
// (the head a cell a step, unless turned straight back; a meal grows it by three; a wall, unless the walls wrap, or its own
// body ends the game; the next meal on a free cell, by chance; a level's meals, the last golden), and the same robot (of the
// moves after which the head can still reach the tail, the one nearest the food, then the one hugging the most walls and
// body), written as a JavaScript programmer would: the body an array, a Set for the cells in the way, loops for the floods.
// Same functions and values as compiled.js, so node/package-bench.mjs times it beside the others and compares every way's
// answers.
(() => {
  "use strict";
  const N = 20;
  const next = s => (s * 48271) % 2147483647;
  // the cell a step from cell k going direction d (0 up, 1 right, 2 down, 3 left): -1 off the board where the walls do not wrap
  function toward(k, d, wrap) {
    const r = Math.trunc(k / N), c = k % N;
    const r1 = d === 0 ? r - 1 : d === 2 ? r + 1 : r, c1 = d === 1 ? c + 1 : d === 3 ? c - 1 : c;
    if (r1 >= 0 && r1 < N && c1 >= 0 && c1 < N) return r1 * N + c1;
    return wrap ? ((r1 + N) % N) * N + (c1 + N) % N : -1;
  }
  // the next meal: a cell by chance from the seed, or the next free one after it
  function place(seed, body) {
    let k = seed % (N * N);
    for (let tries = 0; tries < N * N; tries++) { if (!body.includes(k)) return k; k = (k + 1) % (N * N); }
    return -1;
  }
  const per = lv => 4 + 2 * lv;

  function start(seed, wrap) {
    const body = [10 * N + 8, 10 * N + 7, 10 * N + 6], s = next(seed + 1);
    return { body, dir: 1, grow: 0, food: place(s, body), seed: s, wrap, score: 0, over: false, hit: 0, t: 0, level: 1, left: per(1) };
  }

  // want: a direction to turn to, or -1 to go on
  function step(g, want) {
    if (g.over) return g;
    const dir = want >= 0 && want <= 3 && want !== (g.dir + 2) % 4 ? want : g.dir;
    const head = g.body.length ? g.body[0] : 0;
    const nh = toward(head, dir, g.wrap);
    const kept = g.grow > 0 ? g.body : g.body.slice(0, -1);
    if (nh < 0 || kept.includes(nh))
      return { body: g.body, dir, grow: g.grow, food: g.food, seed: g.seed, wrap: g.wrap, score: g.score, over: true, hit: 2, t: g.t + 1, level: g.level, left: g.left };
    const body = [nh, ...kept];
    const ate = nh === g.food;
    const s = ate ? next(g.seed) : g.seed;
    const left = ate ? g.left - 1 : g.left;
    const cleared = ate && left <= 0;
    return { body, dir, grow: (g.grow > 0 ? g.grow - 1 : 0) + (ate ? 3 : 0), food: cleared ? -1 : ate ? place(s, body) : g.food, seed: s,
             wrap: g.wrap, score: g.score + (ate ? (cleared ? 50 : 10) : 0), over: false, hit: cleared ? 3 : ate ? 1 : 0, t: g.t + 1, level: g.level, left };
  }

  function next_level(g) {
    const s = next(g.seed + g.level);
    return { body: g.body, dir: g.dir, grow: g.grow, food: place(s, g.body), seed: s, wrap: g.wrap, score: g.score, over: false, hit: 0, t: g.t,
             level: g.level + 1, left: per(g.level + 1) };
  }

  // ---- the robot ----
  // how much room there is from cell `from`, over cells not in `inWay`: a flood counting until it has found `want` (it may
  // overshoot by the last cell's neighbours, as the rules do), each cell's neighbours up, right, down, left, the last found first
  function flood(wrap, inWay, from, want) {
    const seen = new Set([from]), stack = [from]; let count = 1;
    while (count < want && stack.length) {
      const k = stack.pop();
      for (let d = 0; d < 4; d++) {
        const m = toward(k, d, wrap);
        if (m < 0 || seen.has(m) || inWay.has(m)) continue;
        seen.add(m); stack.push(m); count++;
      }
    }
    return count;
  }
  // whether the head at `from` can reach `goal` over cells not in `inWay`
  function reaches(wrap, inWay, from, goal) {
    const seen = new Set([from]), stack = [from];
    while (stack.length) {
      const k = stack.pop();
      for (let d = 0; d < 4; d++) {
        const m = toward(k, d, wrap);
        if (m === goal) return true;
        if (m < 0 || seen.has(m) || inWay.has(m)) continue;
        seen.add(m); stack.push(m);
      }
    }
    return false;
  }
  // how far a cell is from the food, rows plus columns (the short way round, where the walls wrap)
  function gap(a, b, wrap) {
    const dr = Math.abs(Math.trunc(a / N) - Math.trunc(b / N)), dc = Math.abs(a % N - b % N);
    return (wrap && N - dr < dr ? N - dr : dr) + (wrap && N - dc < dc ? N - dc : dc);
  }
  function robot(g) {
    if (g.over) return -1;
    const head = g.body.length ? g.body[0] : 0;
    const kept = g.grow > 0 ? g.body : g.body.slice(0, -1);
    const keptSet = new Set(kept);
    const long = g.body.length + g.grow + 2;
    let best = -1, bestWorth = -100000;
    for (let d = 0; d < 4; d++) {
      const m = toward(head, d, g.wrap);
      let worth;
      if (d === (g.dir + 2) % 4 || m < 0 || keptSet.has(m)) worth = -100000;
      else {
        // after the move: the body is m then kept; its last cell (the tail) moves on, so the rest is in the way
        const after = [m, ...kept], tail = after[after.length - 1], inner = new Set(after.slice(0, -1));
        const safe = reaches(g.wrap, inner, m, tail) && (g.grow === 0 && m !== g.food || flood(g.wrap, inner, m, long) >= long);
        let hug = 0;
        for (let e = 0; e < 4; e++) { const q = toward(m, e, g.wrap); if (q < 0 || inner.has(q)) hug++; }
        worth = safe ? -10 * (g.food < 0 ? 0 : gap(m, g.food, g.wrap)) + 3 * hug + (d === g.dir ? 1 : 0)
                     : -50000 + 10 * flood(g.wrap, keptSet, m, long);
      }
      if (worth > bestWorth) { best = d; bestWorth = worth; }
    }
    return best;
  }

  const api = { start, step, robot, next_level, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.SnakePlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
