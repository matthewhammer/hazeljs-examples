// hazeljs-examples, Gnome world's rules in plain JavaScript (^report(65), 2026-11-25; Matthew: "please time a speedrun for a 3
// way comparison: interpreter (to some limit; no more than 5 minutes total), hazel jit, as of today, plain JS"), for timing
// only: the page loads it only when asked (?rules=js, for node/world-speedrun.mjs). The rules the speed run calls each step,
// as world/rules/World.hz has them: the gnome's step (World.step, with tile, slope_at, slide_vx, dig_ahead and finish), the
// beavers' (World.beaver), dig_steps and water_row; written as a JavaScript programmer would, the same answers. Hazel's Int
// division truncates toward zero, as here (q); its remainder (md) is the truncated one, as JavaScript's own % is.
(() => {
  "use strict";
  const q = (a, b) => Math.trunc(a / b) + 0;   // (+ 0: never a -0, which Hazel has not)
  const md = (a, b) => a - q(a, b) * b;
  const absi = v => (v < 0 ? -v : v);
  const DIG = [0, 10, 18, 6, 26, 34, 0, 0, 0, 0];   // (ground(k).dig)

  function dig_steps(w, r, tool) {
    if (w < 1 || w > 7 || r >= 207) return 0;
    if (tool <= 0) return DIG[w];
    if (tool === 1) { if (w === 6) return 16; if (w === 7) return r >= 204 ? 0 : 24; const d = DIG[w]; return d >= 18 ? q(d * 2, 9) : d < 6 ? 2 : q(d, 3); }
    if (w === 6) return 5; if (w === 7) return r >= 204 ? 12 : 8;
    const k = q(DIG[w], 9); return k < 1 ? 1 : k;
  }
  const water_row = (natural, bank, logs) => { const r = natural - q(logs, 3); return r < bank + 1 ? bank + 1 : r; };

  // a tile in the window round the gnome: nine bits of it, as World.tile
  function tile(n, dc, dr) {
    if (dc < -1 || dc > 1 || dr < -3 || dr > 1) return 0;
    const row = dr === -3 ? n.r0 : dr === -2 ? n.r1 : dr === -1 ? n.r2 : dr === 0 ? n.r3 : n.r4;
    return md(q(row, dc === -1 ? 1 : dc === 0 ? 512 : 262144), 512);
  }
  const at = (n, c, r) => tile(n, c - n.cx, r - n.cy);
  const shapeOf = (n, c, r) => md(q(at(n, c, r), 64), 4);
  const whatOf = (n, c, r) => md(at(n, c, r), 16);
  const wetAt = (n, c, r) => md(q(at(n, c, r), 16), 2) === 1;

  function slope_at(n, g, x, y, vy, climbing, midw) {
    const c = q(x, 1000), f = q(y - 1, 1000);
    const r = shapeOf(n, c, f) > 0 ? f : shapeOf(n, c, f + 1) > 0 ? f + 1 : g.ground && shapeOf(n, c, f - 1) > 0 ? f - 1 : -1;
    if (climbing || vy < 0) return -1;
    if (r >= 0) { const sy = (r + 1) * 1000 - (shapeOf(n, c, r) === 1 ? x - c * 1000 : 1000 - (x - c * 1000));
      return (y > sy && g.y <= sy + 300) || (g.ground && !midw && y < sy && sy - y < 300) ? sy : -1; }
    const w = whatOf(n, c, f);
    if (g.ground && w >= 1 && w <= 10 && y - f * 1000 <= 450) return f * 1000;
    if (g.ground && !midw && (f + 1) * 1000 - y < 300 && whatOf(n, c, f + 1) >= 1 && whatOf(n, c, f + 1) <= 10) return (f + 1) * 1000;
    return -1;
  }
  function slide_vx(n, g, p, climbing, midw) {
    const cx = q(g.x, 1000), feet = q(g.y - 1, 1000);
    const a = shapeOf(n, cx, feet), k = a > 0 ? a : shapeOf(n, cx, feet + 1);
    const way = k === 1 ? -1 : k === 2 ? 1 : 0;
    if (!p.down || p.dig || !g.ground || climbing || midw) return -100000;
    if (way !== 0) { const v = g.vx + way * 14; return v > 190 ? 190 : v < -190 ? -190 : v; }
    return absi(g.vx) > 95 ? q(g.vx * 15, 16) : -100000;
  }
  function dig_ahead(n, g, p, feet, head, up_tile) {
    const digs = (c, r) => dig_steps(whatOf(n, c, r), r, g.tool);
    const cx = q(g.x, 1000), ahead = cx + (p.dx !== 0 ? p.dx : g.face);
    if (!p.dig) return -1;
    if (p.down) { const feet1 = feet + 1; return shapeOf(n, cx, feet) > 0 && digs(cx, feet) > 0 ? cx * 1000 + feet : digs(cx, feet1) > 0 ? cx * 1000 + feet1 : -1; }
    if (p.up) return digs(cx, up_tile) > 0 ? cx * 1000 + up_tile : -1;
    return digs(ahead, feet) > 0 ? ahead * 1000 + feet : digs(ahead, head) > 0 ? ahead * 1000 + head : -1;
  }
  function finish(g, n, p, m) {
    const hh = 880, none = -1, digs = (c, r) => dig_steps(whatOf(n, c, r), r, g.tool);
    const cx = q(g.x, 1000), feet = q(g.y - 1, 1000), head = q(g.y - hh, 1000);
    const midw = wetAt(n, cx, q(g.y - 450, 1000)), headw = wetAt(n, cx, q(g.y - 800, 1000));
    const up_tile = q(g.y - hh - 1, 1000), climbing = m.climb, hc = m.hc;
    const dig_up = p.up && (g.ground || climbing || midw) && digs(cx, up_tile) > 0 && g.y - hh - (up_tile + 1) * 1000 < 150;
    const side = p.dx !== 0 && !p.dig && hc >= 0 && (g.ground || climbing || midw) ? (digs(hc, feet) > 0 ? hc * 1000 + feet : digs(hc, head) > 0 ? hc * 1000 + head : none) : none;
    const underfoot = feet + 1, button = dig_ahead(n, g, p, feet, head, up_tile);
    const target = side >= 0 ? side : button >= 0 ? button
      : p.down && absi(m.vx) < 40 && shapeOf(n, cx, feet) === 0 && shapeOf(n, cx, underfoot) === 0 && (((g.ground || climbing) && md(g.y, 1000) === 0) || midw) && digs(cx, underfoot) > 0 && underfoot * 1000 - g.y < 150 ? cx * 1000 + underfoot
      : dig_up ? cx * 1000 + up_tile : none;
    const tc = target < 0 ? none : q(target, 1000), tr = target < 0 ? none : md(target, 1000);
    const dt = target < 0 ? 0 : tc === g.dc && tr === g.dr ? g.dt + 1 : 1;
    const dug = target >= 0 && dt >= digs(tc, tr);
    const air = headw && !g.gear ? g.air - 1 : Math.min(g.air + 5, 600);
    const ev = dug ? 1 : air <= 0 ? 4 : m.jumped ? 2 : midw && !g.swim && !g.under && g.vy > 30 ? 3 : p.down && g.swim && !g.gear ? 5 : 0;
    return { x: m.x, y: m.y, vx: m.vx, vy: m.vy, face: p.dx !== 0 ? p.dx : g.face, ground: m.ground, climb: climbing, swim: m.floating || (midw && !headw), under: headw,
      air: air <= 0 ? 600 : air, gear: g.gear, tool: g.tool, kit: g.kit, dc: tc, dr: tr, dt: dug ? 0 : dt, ev };
  }
  // the gnome's step, as World.step
  function step(g, n, p) {
    const hw = 330, hh = 880, none = -1, kit2 = md(q(g.kit, 2), 2) === 1 ? 3 : 1, climbSp = md(q(g.kit, 4), 2) === 1 ? 210 : 70;
    const solid = (c, r) => { const w = whatOf(n, c, r); return w >= 1 && w <= 10 && shapeOf(n, c, r) === 0; };
    const climbs = (c, r) => md(q(at(n, c, r), 32), 2) === 1;
    const digs = (c, r) => dig_steps(whatOf(n, c, r), r, g.tool);
    const cx = q(g.x, 1000), feet = q(g.y - 1, 1000), head = q(g.y - hh, 1000);
    const midw = wetAt(n, cx, q(g.y - 450, 1000)), headw = wetAt(n, cx, q(g.y - 800, 1000));
    const can_climb = climbs(q(g.x - hw, 1000), feet) || climbs(q(g.x + hw, 1000), feet) || climbs(cx, head);
    const climbing = can_climb && (!midw || p.up) && (g.climb || p.up || p.down);
    const floating = midw && !headw && !g.gear && !p.down;
    let tw = q(g.y - 450, 1000); while (tw > n.cy - 3 && wetAt(n, cx, tw - 1)) tw--;   // (top_wet)
    const surface = tw * 1000;
    const up_tile = q(g.y - hh - 1, 1000);
    const dig_up = p.up && (g.ground || climbing || midw) && digs(cx, up_tile) > 0 && g.y - hh - (up_tile + 1) * 1000 < 150;
    const run = p.dig ? 0 : p.dash && p.dx !== 0 && g.vx * p.dx >= 80 ? (g.ground ? p.dx * Math.min(absi(g.vx) + (md(g.kit, 2) === 1 ? 16 : 5), 276) : g.vx) : g.vx + q(p.dx * 92 - g.vx, 4);
    const snap = q(cx * 1000 + 500 - g.x, 3);
    const sv = slide_vx(n, g, p, climbing, midw);
    const vx = sv > -100000 ? sv : climbing ? (p.dx === 0 || p.dig ? snap : p.dx * climbSp) : midw ? p.dx * (g.gear ? 55 : 58) * kit2
      : p.dx === 0 && p.down && g.ground ? snap : p.dx === 0 && absi(run) < 8 ? 0 : run;
    const jumped = g.ground && p.jump && !dig_up && !midw && !climbing;
    let vy;
    if (climbing) vy = p.up && !dig_up ? -climbSp : p.down ? climbSp : 0;
    else if (midw) vy = g.gear ? (p.up ? -55 * kit2 : p.down ? 55 * kit2 : q(g.vy * 4, 5))
      : p.down ? Math.min(g.vy + 6 * kit2, 45 * kit2) : headw ? Math.max(q(g.vy * 3, 4) - 9 * kit2, -60 * kit2) : p.jump ? -160 : q(surface + 480 - g.y, 4);
    else if (jumped) vy = -208;
    else { const v = g.vy + 11; vy = Math.min(!p.up && v < -70 ? -70 : v, 267); }
    const nx0 = g.x + vx;
    const sloping = shapeOf(n, cx, feet) > 0 || shapeOf(n, cx, feet + 1) > 0;
    const blocked = c => solid(c, head) || (solid(c, feet) && !((shapeOf(n, cx, feet) === 1 && vx > 0) || (shapeOf(n, cx, feet) === 2 && vx < 0)) && !(sloping && g.y - feet * 1000 <= 450));
    const hc = vx > 0 && blocked(q(nx0 + hw, 1000)) ? q(nx0 + hw, 1000) : vx < 0 && nx0 - hw >= 0 && blocked(q(nx0 - hw, 1000)) ? q(nx0 - hw, 1000) : none;
    const nx1 = hc < 0 ? nx0 : vx > 0 ? hc * 1000 - hw - 1 : (hc + 1) * 1000 + hw;
    const nx = Math.max(hw, Math.min(nx1, 896 * 1000 - hw));
    const l = q(nx - hw, 1000), rr = q(nx + hw, 1000);
    const ny0 = g.y + vy, fr = q(ny0 - 1, 1000);
    const lands_on = c => solid(c, fr) || (whatOf(n, c, fr) === 11 && !p.down);
    const land = vy > 0 && g.y <= fr * 1000 && (lands_on(l) || lands_on(rr));
    const hr = q(ny0 - hh, 1000);
    const bump = vy < 0 && (solid(l, hr) || solid(rr, hr));
    const ny1 = land ? fr * 1000 : bump ? (hr + 1) * 1000 + hh : ny0;
    const sl = slope_at(n, g, nx, ny1, vy, climbing, midw);
    const ny = sl >= 0 ? sl : ny1, below = q(ny, 1000);
    const ground_now = sl >= 0 || (md(ny, 1000) === 0 && (solid(l, below) || solid(rr, below) || ((whatOf(n, l, below) === 11 || whatOf(n, rr, below) === 11) && !p.down)));
    return finish(g, n, p, { x: nx, y: ny, vx: hc >= 0 ? 0 : vx, vy: land || bump || sl >= 0 ? 0 : vy, hc, ground: ground_now, climb: climbing, floating, jumped });
  }

  // a beaver's step, as World.beaver (trees, piles, fallen: arrays of columns)
  function beaver(b, trees, piles, fallen) {
    const has = (l, v) => l.includes(v);
    const near = ts => { let best = -1, bd = 1000000; for (const t of ts) { const d = absi(t * 100 - b.x); if (absi(t - b.lodge) <= 36 && d < bd) { best = t; bd = d; } } return best; };
    const go = (to, sp) => (absi(to - b.x) <= sp ? to : to > b.x ? b.x + sp : b.x - sp);
    const face = to => (to > b.x ? 1 : to < b.x ? -1 : b.face);
    const be = (x, f, job, t, tree, felled, laid, cut) => ({ x, face: f, job, t, tree, lodge: b.lodge, dam: b.dam, felled, laid, cut });
    const none = -1, work = x => has(piles, x) || has(fallen, x);
    if (b.job === 0) {
      if (b.t > 0) return be(b.x, b.face, 0, b.t - 1, none, none, false, false);
      const p1 = near(piles), pl = p1 >= 0 ? p1 : near(fallen);
      if (pl >= 0) return be(b.x, face(pl * 100), 6, 0, pl, none, false, false);
      const tr = near(trees);
      return tr >= 0 ? be(b.x, face(tr * 100), 1, 0, tr, none, false, false) : be(b.x, b.face, 0, 60, none, none, false, false);
    }
    if (b.job === 1) { if (!has(trees, b.tree)) return be(b.x, b.face, 5, 0, none, none, false, false);
      const to = b.tree * 100 + (b.x < b.tree * 100 ? -60 : 60);
      return absi(to - b.x) <= 25 ? be(to, face(b.tree * 100), 2, 40, b.tree, none, false, false) : be(go(to, 25), face(to), 1, 0, b.tree, none, false, false); }
    if (b.job === 2) return !has(trees, b.tree) ? be(b.x, b.face, 5, 0, none, none, false, false) : b.t > 1 ? be(b.x, b.face, 2, b.t - 1, b.tree, none, false, false) : be(b.x, b.face, 7, 20, b.tree, b.tree, false, false);
    if (b.job === 7) { if (!has(fallen, b.tree)) return has(piles, b.tree) ? be(b.x, b.face, 3, 0, b.tree, none, false, false) : be(b.x, b.face, 5, 0, none, none, false, false);
      return b.t > 1 ? be(b.x, b.face, 7, b.t - 1, b.tree, none, false, false) : be(b.x, b.face, 7, 20, b.tree, none, false, true); }
    if (b.job === 3) { const to = b.dam * 100; return absi(to - b.x) <= 15 ? be(to, b.face, 4, 20, b.tree, none, false, false) : be(go(to, 15), face(to), 3, 0, b.tree, none, false, false); }
    if (b.job === 4) return b.t > 1 ? be(b.x, b.face, 4, b.t - 1, b.tree, none, false, false) : work(b.tree) ? be(b.x, b.face, 6, 0, b.tree, none, true, false) : be(b.x, b.face, 5, 0, none, none, true, false);
    if (b.job === 6) { if (!work(b.tree)) return be(b.x, b.face, 5, 0, none, none, false, false);
      const to = b.tree * 100 + (b.x < b.tree * 100 ? -50 : 50);
      if (absi(to - b.x) <= 25) return has(piles, b.tree) ? be(to, face(b.tree * 100), 3, 0, b.tree, none, false, false) : be(to, face(b.tree * 100), 7, 20, b.tree, none, false, false);
      return be(go(to, 25), face(to), 6, 0, b.tree, none, false, false); }
    const to = b.lodge * 100;
    return absi(to - b.x) <= 30 ? be(to, b.face, 0, 80, none, none, false, false) : be(go(to, 30), face(to), 5, 0, none, none, false, false);
  }

  const api = { step, beaver, dig_steps, water_row, tile, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.WorldPlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
