// hazeljs-examples, Light trails in plain JavaScript (^report(65), 2026-11-25; Matthew: "Why don't we have plain JS data for
// the later part of the table? Can we get it?"), for timing only: the page never loads it. The same game as
// trails/rules/Trails.hz (both riders a cell a step, a turn when asked unless straight back, a crash off the arena or into a
// lit cell, meeting in one cell a draw; the robot's choice by the room ahead, a flood fill), written as a JavaScript
// programmer would: the trails a copied array of bitmasks, loops for the flood. Same functions and values as compiled.js,
// so node/package-bench.mjs times it beside the others and compares every way's answers.
(() => {
  "use strict";
  const W = 40, H = 30;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  // whether cell (x, y) is lit (off the arena counts as lit); the trails with it lit (a copy, the old one untouched)
  const litAt = (lit, x, y) => x < 0 || x >= W || y < 0 || y >= H || ((lit[2 * y + Math.floor(x / 20)] >> (x % 20)) & 1) === 1;
  function light(lit, x, y) {
    if (litAt(lit, x, y)) return lit;
    const out = lit.slice(); out[2 * y + Math.floor(x / 20)] += 1 << (x % 20); return out;
  }

  function start(_seed) {
    const lit = light(light(new Array(2 * H).fill(0), 6, H / 2), W - 7, H / 2);
    return { ax: 6, ay: H / 2, ad: 1, bx: W - 7, by: H / 2, bd: 3, lit, over: false, winner: 0, t: 0 };
  }

  // wa, wb: the way each rider asks to turn to (-1 to go on)
  function step(g, wa, wb) {
    if (g.over) return g;
    const ad = wa >= 0 && wa <= 3 && wa !== (g.ad + 2) % 4 ? wa : g.ad;
    const bd = wb >= 0 && wb <= 3 && wb !== (g.bd + 2) % 4 ? wb : g.bd;
    const ax = g.ax + DX[ad], ay = g.ay + DY[ad], bx = g.bx + DX[bd], by = g.by + DY[bd];
    const meet = ax === bx && ay === by;
    const acrash = meet || litAt(g.lit, ax, ay), bcrash = meet || litAt(g.lit, bx, by);
    let lit = g.lit;
    if (!acrash) lit = light(lit, ax, ay);
    if (!bcrash) lit = light(lit, bx, by);
    return { ax, ay, ad, bx, by, bd, lit, over: acrash || bcrash, winner: acrash && bcrash ? 0 : acrash ? 2 : bcrash ? 1 : 0, t: g.t + 1 };
  }

  // the room from a cell: a flood over cells not lit, in the rules' order (each cell's neighbours up, right, down, left, pushed
  // on the front of the list), until it has counted `want` or found no more
  function flood(seen, first, want) {
    seen = seen.slice();
    const stack = [first]; let count = 1;
    while (count < want && stack.length) {
      const k = stack.pop(), x = k % W, y = Math.floor(k / W);
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d];
        if (litAt(seen, nx, ny)) continue;
        seen[2 * ny + Math.floor(nx / 20)] += 1 << (nx % 20); stack.push(ny * W + nx); count++;
      }
    }
    return count;
  }
  // a rider's choice (who: 1 yours, 2 Hazel's), looking `care` cells ahead, slipping `slip` times in a hundred (luck: 0 to 99)
  function robot(g, who, care, slip, luck) {
    if (g.over) return -1;
    const d0 = who === 1 ? g.ad : g.bd;
    if (luck < slip) return (d0 + 3 + luck % 3) % 4;
    const x = who === 1 ? g.ax : g.bx, y = who === 1 ? g.ay : g.by, ox = who === 1 ? g.bx : g.ax, oy = who === 1 ? g.by : g.ay;
    let best = d0, bestWorth = -1000000;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d], ny = y + DY[d];
      let worth;
      if (d === (d0 + 2) % 4 || litAt(g.lit, nx, ny)) worth = -100000;
      else {
        const near = Math.abs(nx - ox) + Math.abs(ny - oy) <= 1;
        const room = flood(light(g.lit, nx, ny), ny * W + nx, care);
        worth = room * 10 - (near ? 40 : 0) + (d === d0 ? 3 : 0);
      }
      if (worth > bestWorth) { best = d; bestWorth = worth; }
    }
    return best;
  }

  const api = { start, step, robot, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.TrailsPlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
