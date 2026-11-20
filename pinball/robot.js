// hazeljs-examples, Pinball's robot (🤖; Matthew, 2026-11-20: "let's have robot mode for pinball, with near-perfect ball
// retention"). It plays by looking ahead with the game's own rules: when the ball comes near a flipper, it tries each choice
// (no flip, the left ones, the right ones, both) held a few steps, plays each on with a simple flipper for a second more, and
// takes the one that keeps the ball and sends it highest. The rules are Hazel's (compiled ahead of time, a step about 0.03 ms),
// so a look ahead of a few hundred steps fits in a frame; run by hazeljs (a step about 0.1 s), it flips by the simple rule alone.
// Shared by the page (window.PinballRobot) and the lab (tools/pinball-lab.mjs, which measures how long it keeps a ball).
(function (root) {
  "use strict";
  const HOLD = 6, AHEAD = 70, NEAR = 150;
  const inLane = g => g.x > 545000 && g.y > 900000;
  const lost = (g, g2) => g2.over || g2.balls < g.balls || (g2.hits || []).includes(2000);
  // the simple rule: flip a flipper when the ball comes down along its outer part
  function simple(bo, g) {
    let L = false, R = false;
    const x = g.x / 1000, y = g.y / 1000, vy = g.vy / 1000;
    for (const f of bo.flippers) {
      const ux = f.side * Math.cos(0.5), uy = Math.sin(0.5), d = (x - f.x) * ux + (y - f.y) * uy, p = (x - f.x) * -uy * f.side + (y - f.y) * ux * f.side;
      if (d > 0.3 * f.len && d < f.len + 18 && Math.abs(p) < 40 && vy > 0.3) { if (f.side > 0) L = true; else R = true; }
    }
    return [L, R];
  }
  // a choice's worth: lost within its hold, the worst; lost later, by how long it lasted; kept, by how high the ball went and
  // the points it made
  function worth(step, bo, i, g, l, r) {
    let a = g, top = g.y, hold = 0;
    for (let k = 0; k < HOLD; k++) { const b = step(i, a, l, r, 0); if (lost(a, b)) return -2e6 + k; a = b; if (a.y < top) top = a.y; }
    for (let k = 0; k < AHEAD; k++) {
      let [L, R] = simple(bo, a); if (hold > 0) { hold--; } else if (L || R) hold = 8;
      if (hold > 0 && !(L || R)) { L = a.x < 300000; R = !L; }
      const b = step(i, a, L, R, 0); if (lost(a, b)) return -1e6 + k * 1000; a = b; if (a.y < top) top = a.y; if (a.warp > 0) break;
    }
    return 1e5 - top / 1000 + (a.score - g.score) / 50;
  }
  // one step's buttons: [left, right, launch]; mem keeps a plan across steps
  function choose(step, bo, i, g, mem, canLook) {
    if (!g || g.over || g.warp > 0) return [false, false, 0];
    if (inLane(g) && Math.abs(g.vy) < 2000) { mem.hold = 0; return [false, false, mem.pull || (mem.pull = 55 + Math.floor(Math.random() * 45))]; }
    mem.pull = 0;
    if (mem.hold > 0) { mem.hold--; return [mem.l, mem.r, 0]; }
    const x = g.x / 1000, y = g.y / 1000;
    const near = bo.flippers.some(f => (x - f.x) * (x - f.x) + (y - f.y) * (y - f.y) < NEAR * NEAR);
    if (!near) { mem.l = mem.r = false; return [false, false, 0]; }
    if (!canLook) { const [l, r] = simple(bo, g); mem.l = l; mem.r = r; mem.hold = l || r ? 7 : 0; return [l, r, 0]; }
    let best = null;
    for (const [l, r] of [[false, false], [true, false], [false, true], [true, true]]) {
      const v = worth(step, bo, i, g, l, r) - (l || r ? 0.5 : 0);   // (a flip for nothing costs a little: no fidgeting)
      if (!best || v > best.v) best = { v, l, r };
    }
    mem.l = best.l; mem.r = best.r; mem.hold = HOLD - 1;
    return [best.l, best.r, 0];
  }
  root.PinballRobot = { choose, simple };
})(typeof window !== "undefined" ? window : globalThis);
