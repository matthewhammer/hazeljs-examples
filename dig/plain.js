// hazeljs-examples, Gnome dig in plain JavaScript (^report(65), 2026-11-25; Matthew: "Why don't we have plain JS data for the
// later part of the table? Can we get it?"), for timing only: the page never loads it. The same game as dig/rules/Dig.hz and
// dig/rules/Scene.hz (a level's ground made by chance: earth, gems, boulders, monsters in their pockets, bedrock, ground water
// and its diving gear, the animals, the lantern and the love shooter; one step: digging, boulders wobbling and falling, the
// animals dropping and leaving the sunlight, the monsters following the tunnels, the flash and the blast; the robot; and the
// scene the page draws behind it), written as a JavaScript programmer would: arrays, loops, Sets where the rules only ask
// whether a cell is in a list. Lists the rules build newest first (the boulders each step, a search's next layer) are built
// so here too, as the answers depend on it. Same functions and values as compiled.js, so node/package-bench.mjs times it
// beside the others and compares every way's answers.
(() => {
  "use strict";
  const W = 14, H = 16;
  const q = (a, b) => Math.trunc(a / b);
  const next = s => (s * 48271) % 2147483647;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const dx = d => (d === 1 ? 1 : d === 3 ? -1 : 0), dy = d => (d === 0 ? -1 : d === 2 ? 1 : 0);
  const inside = (c, r) => c >= 0 && c < W && r >= 0 && r < H;
  const at = (xs, i) => (xs.length === 0 ? 1 : i <= 0 ? xs[0] : i < xs.length ? xs[i] : 1);
  const setAt = (xs, i, v) => { if (xs.length === 0) return xs; const out = xs.slice(); out[i <= 0 ? 0 : i < xs.length ? i : xs.length] = v; if (i >= xs.length) out.length = xs.length; return out; };
  const cell = (cs, c, r) => (inside(c, r) ? at(cs, r * W + c) : 1);
  const rockAt = (rs, c, r) => rs.some(x => x.c === c && x.r === r);
  const monAt = (ms, c, r) => ms.some(m => m.c === c && m.r === r);
  const awakeAt = (ms, c, r) => ms.some(m => m.c === c && m.r === r && m.stun <= 0);
  const animalAt = (ans, c, r) => ans.some(a => a.c === c && a.r === r);
  const countGems = cs => { let n = 0; for (const x of cs) if (x === 2) n++; return n; };

  // ---- a level's ground
  function pockets(n, seed, cs, ms) {
    while (n > 0) {
      const s1 = next(seed), c = 1 + q(s1, 7) % (W - 4), r = 5 + q(s1, 1000) % 10;
      seed = s1;
      if (cell(cs, c + 1, r) === 0) continue;
      cs = setAt(setAt(setAt(cs, r * W + c, 0), r * W + c + 1, 0), r * W + c + 2, 0); ms = [{ c: c + 1, r, stun: 0 }, ...ms]; n--;
    }
    return [cs, ms, seed];
  }
  function gemsIn(n, seed, cs) {
    while (n > 0) { const s1 = next(seed), c = q(s1, 7) % W, r = 2 + q(s1, 1000) % (H - 2); seed = s1; if (cell(cs, c, r) !== 1) continue; cs = setAt(cs, r * W + c, 2); n--; }
    return [cs, seed];
  }
  function rocksIn(n, seed, cs, rs) {
    while (n > 0) {
      const s1 = next(seed), c = q(s1, 7) % W, r = 2 + q(s1, 1000) % 11; seed = s1;
      if (cell(cs, c, r) !== 1 || cell(cs, c, r + 1) !== 1 || rockAt(rs, c, r)) continue;
      cs = setAt(cs, r * W + c, 0); rs = [{ c, r, wob: -1, falling: false }, ...rs]; n--;
    }
    return [cs, rs, seed];
  }
  function animalsIn(kinds, seed, cs, wt, gc) {
    let acc = [];
    for (const k of kinds) for (;;) {
      const s1 = next(seed), c = q(s1, 7) % W; seed = s1;
      const r = k === 17 ? 2 + q(s1, 1000) % 3 : k === 15 ? 5 + q(s1, 1000) % 4 : wt < H ? wt - 3 + q(s1, 1000) % 3 : 12 + q(s1, 1000) % 3;
      if (cell(cs, c, r) !== 1 || c === gc || animalAt(acc, c, r)) continue;
      acc = [{ kind: k, c, r, fall: -1, walk: -1 }, ...acc]; break;
    }
    return [acc, seed];
  }
  function bedrock(cs, ms, k, lv, seed) {
    const lay = (l, c, r, n) => { for (; n > 0; n--, c++) if (inside(c, r) && cell(l, c, r) === 1) l = setAt(l, r * W + c, 3); return l; };
    const near = (l, c, r, n) => { for (; n >= -1; n--) if (cell(l, c + n, r - 1) === 3 || cell(l, c + n, r) === 3 || cell(l, c + n, r + 1) === 3) return true; return false; };
    const slab = (l, c, r, n) => (near(l, c, r, n) ? l : lay(l, c, r, n));
    for (const m of ms) { const s1 = next(seed); if (lv >= 1 && q(s1, 7) % 10 < lv) cs = slab(cs, m.c - 2, m.r - 1, 5); seed = s1; }
    for (; k > 0; k--) { const s1 = next(seed); cs = slab(cs, q(s1, 7) % W, 3 + q(s1, 1000) % 12, 2 + q(s1, 31) % 3); seed = s1; }
    return [cs, seed];
  }
  // the cells you can get to from the top, round the bedrock and the boulders
  function reachMap(cs, rs) {
    const got = new Array(W * H).fill(0), stack = [7]; got[7] = 1;
    while (stack.length) {
      const i = stack.pop(), c = i % W, r = q(i, W);
      for (let d = 0; d < 4; d++) { const c1 = c + DX[d], r1 = r + DY[d], k = r1 * W + c1;
        if (inside(c1, r1) && got[k] === 0 && cell(cs, c1, r1) !== 3 && !rockAt(rs, c1, r1)) { got[k] = 1; stack.push(k); } }
    }
    return got;
  }
  function levelOf(lv, seed, score, lives, t, hit) {
    const ground = []; for (let i = 0; i < W * H; i++) ground.push(i < W ? 0 : 1);
    const cs0 = setAt(setAt(ground, W + 7, 0), 2 * W + 7, 0);
    const [cs1, ms, s1] = pockets(Math.min(2 + q(lv, 2), 4), next(seed + 1), cs0, []);
    const [csb, sb] = bedrock(cs1, ms, Math.min(q(lv, 2), 6), lv, s1);
    const [cs2, s2] = gemsIn(Math.min(10 + 2 * lv, 18), sb, csb);
    const [cs3a, rs, s3] = rocksIn(Math.min(5 + lv, 8), s2, cs2, []);
    const okmap = reachMap(cs3a, rs);
    const cs3 = lv >= 1 ? cs3a.map((v, i) => (v === 2 && okmap[i] === 0 ? 1 : v)) : cs3a;
    const wt = lv >= 1 && q(s3, 13) % 2 === 0 ? 10 + q(s3, 17) % 2 : H;
    let gc = -1;
    if (wt < H) { let c = q(s3, 19) % W; while (rs.some(x => x.c === c % W)) c++; gc = c % W; }
    let cs4 = cs3;
    if (gc >= 0) for (let r = 0; r < H; r++) if (cell(cs4, gc, r) === 3) cs4 = setAt(cs4, r * W + gc, 1);
    const [ans, s4] = animalsIn([17, 15, 19], next(s3 + 5), cs4, wt, gc);
    const spot = s => { for (;;) { const s1 = next(s), c = q(s1, 7) % W, r = 3 + q(s1, 1000) % 6; if (cell(cs4, c, r) === 1 && !animalAt(ans, c, r) && c !== gc) return r * W + c; s = s1; } };
    const lampSpot = (s, n) => { for (;;) { const s1 = next(s), c = 3 + q(s1, 7) % 9, r = 2 + q(s1, 1000) % 3;
      if (cell(cs4, c, r) === 1 && !animalAt(ans, c, r) && c !== gc && (n > 400 || okmap[r * W + c] === 1)) return r * W + c; s = s1; n++; } };
    const love = lv >= 1 && q(s3, 29) % 2 === 0 ? spot(s3 + 11) : -1;
    let lamp = -1;
    if (lv >= 3) { lamp = lampSpot(s3 + 13, 0); if (lamp === love) lamp = lampSpot(s3 + 17, 0); }
    return { px: 7, py: 0, pd: 2, pwait: 0, cells: cs4, rocks: rs, mons: ms, gems: countGems(cs4), score, lives, level: lv, seed: s4,
             flash: 0, mwait: 30, mpace: Math.max(12, 14 - lv), dead: 0, over: false, hit, t,
             animals: ans, wt, gear: wt < H ? (wt + 2 + q(s3, 23) % 2) * W + gc : -1, diving: false, air: 100,
             lover: love, loves: false, lamp, lantern: lv < 3, blast: 0, beam: -1 };
  }
  const start = seed => levelOf(0, seed, 0, 3, 0, 0);

  // ---- the boulders: the boulders (newest first, as the rules keep them), the monsters left, the points, whether you were caught, what happened
  function roll(rs, cs, ms, ans, wt, px, py, score) {
    let kept = [], hurt = false, ev = 0;
    for (let i = 0; i < rs.length; i++) {
      const x = rs[i], rest = rs.slice(i + 1);
      const open = cell(cs, x.c, x.r + 1) === 0 && !rockAt(rest, x.c, x.r + 1) && !rockAt(kept, x.c, x.r + 1);
      if (!x.falling) {
        const wob = !open ? -1 : x.wob < 0 ? 40 : x.wob <= 1 ? (x.r >= wt ? 10 : 4) : x.wob - 1;
        kept = [{ c: x.c, r: x.r, wob, falling: open && x.wob >= 0 && x.wob <= 1 }, ...kept];
      } else if (x.wob > 1) kept = [{ c: x.c, r: x.r, wob: x.wob - 1, falling: true }, ...kept];
      else if (!open) { if (ev === 0) ev = 6; }
      else {
        const r1 = x.r + 1, squash = monAt(ms, x.c, r1);
        if (squash) ms = ms.filter(m => !(m.c === x.c && m.r === r1));
        kept = [{ c: x.c, r: r1, wob: r1 >= wt ? 10 : 4, falling: true }, ...kept];
        if (squash) score += 200;
        hurt = hurt || (px === x.c && py === r1);
        ev = ev === 8 || animalAt(ans, x.c, r1) ? 8 : squash ? 5 : ev;
      }
    }
    return [kept, ms, score, hurt, ev];
  }
  // whether the sun shines into a cell: a line from its middle to the sun through dug cells with no boulder
  function sunlit(cs, rs, c, r) {
    const x0 = c * 100 + 50, y0 = r * 100 + 50, ex = 1220 - x0, ey = -210 - y0;
    const n = q(Math.max(Math.abs(ex), Math.abs(ey)), 16) + 1;
    for (let i = 1; i <= n; i++) {
      const qx = x0 + q(ex * i, n), qy = y0 + q(ey * i, n);
      if (qy < 100) return true;
      if (qx < 0 || qx >= 1400) return false;
      if (cell(cs, q(qx, 100), q(qy, 100)) !== 0 || rockAt(rs, q(qx, 100), q(qy, 100))) return false;
    }
    return true;
  }
  // the animals a step on: dropping where dug out under them; leaving the sunlight in a hole, a cell every 20 steps
  function settle(all, cs, rs, wt) {
    return all.map(a => {
      const open = cell(cs, a.c, a.r) === 0 && cell(cs, a.c, a.r + 1) === 0 && !rockAt(rs, a.c, a.r + 1) && !animalAt(all, a.c, a.r + 1);
      const still = wk => ({ kind: a.kind, c: a.c, r: a.r, fall: -1, walk: wk });
      if (open) return a.fall > 1 ? { kind: a.kind, c: a.c, r: a.r, fall: a.fall - 1, walk: -1 } : { kind: a.kind, c: a.c, r: a.r + 1, fall: a.r + 1 >= wt ? 10 : 4, walk: -1 };
      if (cell(cs, a.c, a.r) !== 0 || !sunlit(cs, rs, a.c, a.r)) return still(-1);
      if (a.walk > 1) return still(a.walk - 1);
      if (a.walk < 0) return still(20);
      const loose = k => rs.some(x => x.c === k && x.r < a.r && (x.falling || x.wob >= 0));
      const free = d => { const k = a.c + d; return inside(k, a.r) && cell(cs, k, a.r) === 0 && !rockAt(rs, k, a.r) && !animalAt(all, k, a.r) && !loose(k); };
      const shade = d => free(d) && !sunlit(cs, rs, a.c + d, a.r);
      const back = a.c * 100 + 50 < 1220 ? -1 : 1;
      const d = shade(back) ? back : shade(-back) ? -back : free(back) ? back : free(-back) ? -back : 0;
      return { kind: a.kind, c: a.c + d, r: a.r, fall: -1, walk: 20 };
    });
  }

  // ---- the monsters: a monster's move (the monster, the ground, whether it burnt up)
  function toward(m, cs, rs, ans, px, py, luck, loves) {
    const dist = d => Math.abs(m.c + dx(d) - px) + Math.abs(m.r + dy(d) - py);
    const free = d => { const c = m.c + dx(d), r = m.r + dy(d); return inside(c, r) && cell(cs, c, r) === 0 && !rockAt(rs, c, r); };
    const shade = d => free(d) && !sunlit(cs, rs, m.c + dx(d), m.r + dy(d));
    const best = bv => { let bd = -1; for (let d = 0; d <= 3; d++) { const v = dist(d); if (shade(d) && v < bv) { bd = d; bv = v; } } return bd; };
    const moved = d => ({ c: m.c + dx(d), r: m.r + dy(d), stun: 0 });
    if (sunlit(cs, rs, m.c, m.r)) { const d1 = best(1000); return m.stun <= 0 && d1 >= 0 ? [moved(d1), cs, false] : [m, cs, true]; }
    if (m.stun > 0) return [m, cs, false];
    const now = Math.abs(m.c - px) + Math.abs(m.r - py);
    if (loves && now <= 3) {
      let d3 = -1, bv = now;
      for (let d = 0; d <= 3; d++) { const v = dist(d); if (shade(d) && v > bv) { d3 = d; bv = v; } }
      return d3 >= 0 ? [moved(d3), cs, false] : [m, cs, false];
    }
    const d = best(now + (luck % 3 === 0 ? 1 : 0));
    if (d >= 0) return [moved(d), cs, false];
    if (q(luck, 3) % 8 === 0) {
      const dd = Math.abs(m.c - px) > Math.abs(m.r - py) ? (px > m.c ? 1 : 3) : (py > m.r ? 2 : 0);
      const c = m.c + dx(dd), r = m.r + dy(dd);
      if (inside(c, r) && !rockAt(rs, c, r) && r > 0 && cell(cs, c, r) <= 1 && !animalAt(ans, c, r)) return [{ c, r, stun: 0 }, setAt(cs, r * W + c, 0), false];
    }
    return [m, cs, false];
  }
  function moveMons(ms, cs, rs, ans, px, py, seed, loves) {
    const out = []; let n = 0;
    for (const m of ms) { const [m2, cs2, burnt] = toward(m, cs, rs, ans, px, py, q(seed, 11) % 1000, loves); cs = cs2; seed = next(seed); if (burnt) n++; else out.push(m2); }
    return [out, cs, n];
  }
  const tickStun = ms => ms.map(m => ({ c: m.c, r: m.r, stun: m.stun > 0 ? m.stun - 1 : 0 }));
  const mreach = (m, px, py) => Math.abs(m.c - px) + Math.abs(m.r - py);
  const stunNear = (ms, px, py) => ms.map(m => { const d = mreach(m, px, py); return { c: m.c, r: m.r, stun: d >= 1 && d <= 3 ? 180 : m.stun }; });
  function catchAt(ms, c, r) { const i = ms.findIndex(m => m.c === c && m.r === r && m.stun > 0); return i < 0 ? ms : [...ms.slice(0, i), ...ms.slice(i + 1)]; }
  function ray(cs, rs, c, r, d) { let n = 0; for (;;) { c += dx(d); r += dy(d); if (inside(c, r) && cell(cs, c, r) === 0 && !rockAt(rs, c, r)) n++; else return n; } }

  // ---- one step: want a way to go (-1 none); flash the lantern; blast the love shooter
  function step(g, want, flash, blast) {
    if (g.over) return g;
    if (g.dead > 0)
      return { px: g.dead === 1 ? 7 : g.px, py: g.dead === 1 ? 0 : g.py, pd: g.pd, pwait: 0, cells: g.cells, rocks: g.rocks, mons: g.mons, gems: g.gems,
               score: g.score, lives: g.lives, level: g.level, seed: g.seed, flash: g.flash, mwait: g.mwait, mpace: g.mpace, dead: g.dead - 1, over: false, hit: 0, t: g.t + 1,
               animals: settle(g.animals, g.cells, g.rocks, g.wt), wt: g.wt, gear: g.gear, diving: g.diving, air: 100, lover: g.lover, loves: g.loves, lamp: g.lamp, lantern: g.lantern, blast: g.blast, beam: -1 };
    const way = want >= 0 && want <= 3, pd = way ? want : g.pd, go = g.pwait <= 0 && way;
    const nc = g.px + dx(pd), nr = g.py + dy(pd);
    const can = go && inside(nc, nr) && !rockAt(g.rocks, nc, nr) && cell(g.cells, nc, nr) !== 3;
    const kind = can ? cell(g.cells, nc, nr) : 0;
    const px = can ? nc : g.px, py = can ? nr : g.py;
    const cs0 = can && kind !== 0 ? setAt(g.cells, nr * W + nc, 0) : g.cells;
    const gem = can && kind === 2;
    const caughtMon = can && monAt(g.mons, px, py) && !awakeAt(g.mons, px, py);
    const ms0 = caughtMon ? catchAt(g.mons, px, py) : g.mons;
    const pwait = can ? (kind !== 0 ? 12 : 8) : g.pwait > 0 ? g.pwait - 1 : 0;
    const gotLamp = g.lamp >= 0 && py * W + px === g.lamp, lantern = g.lantern || gotLamp;
    const flashing = flash && g.flash <= 0 && lantern;
    const firing = blast && g.loves && g.blast <= 0;
    const beam = firing ? ray(cs0, g.rocks, px, py, pd) : -1;
    const struck = m => { const k = (m.c - px) * dx(pd) + (m.r - py) * dy(pd); return k >= 1 && k <= beam && (dx(pd) === 0 ? m.c === px : m.r === py); };
    const msw = firing ? ms0.filter(m => !struck(m)) : ms0, won = ms0.length - msw.length;
    const ms1 = tickStun(flashing ? stunNear(msw, px, py) : msw);
    const [rs, ms2, sc1, squashedMe, rev] = roll(g.rocks, cs0, ms1, g.animals, g.wt, px, py, g.score + (gem ? 50 : 0) + (caughtMon ? 100 : 0) + 200 * won);
    const ans = settle(g.animals, cs0, rs, g.wt);
    const moving = g.mwait <= 1, s1 = next(g.seed);
    const gotLove = g.lover >= 0 && py * W + px === g.lover, loves = g.loves || gotLove;
    const [ms3, cs1, burnt] = moving ? moveMons(ms2, cs0, rs, ans, px, py, s1, loves) : [ms2, cs0, 0];
    const sc2 = sc1 + 150 * burnt;
    const got = g.gear >= 0 && py * W + px === g.gear, diving = g.diving || got;
    const wet = py >= g.wt && !diving, air = wet ? g.air - 1 : 100;
    const monCaught = squashedMe || awakeAt(ms3, px, py), caught = monCaught || (wet && air <= 0);
    const lost = rev === 8, gems = countGems(cs1);
    const lives = caught || lost ? g.lives - 1 : g.lives;
    if (lost && lives > 0) return levelOf(g.level, s1, sc2, lives, g.t + 1, 8);
    if (gems === 0 && !caught && !lost) return levelOf(g.level + 1, s1, sc2 + 300, lives, g.t + 1, 3);
    return { px, py, pd, pwait, cells: cs1, rocks: rs, mons: ms3, gems, score: sc2, lives, level: g.level, seed: s1,
             flash: flashing ? 60 : g.flash > 0 ? g.flash - 1 : 0, mwait: moving ? g.mpace : g.mwait - 1, mpace: g.mpace,
             dead: caught ? 90 : 0, over: lives <= 0,
             hit: lost ? 8 : monCaught ? 2 : caught ? 9 : rev === 5 ? 5 : won > 0 ? 14 : burnt > 0 ? 11 : got ? 10 : gotLove ? 12 : gotLamp ? 13 : caughtMon ? 4 : gem ? 1 : flashing ? 7 : rev,
             t: g.t + 1, animals: ans, wt: g.wt, gear: got ? -1 : g.gear, diving, air, lover: gotLove ? -1 : g.lover, loves, lamp: gotLamp ? -1 : g.lamp, lantern,
             blast: firing ? 120 : g.blast > 0 ? g.blast - 1 : 0, beam };
  }

  // ---- the robot
  // the cells an awake monster could get to in k moves, round the bedrock and the boulders
  function danger(g, k) {
    const ok = (c, r) => inside(c, r) && cell(g.cells, c, r) !== 3 && !rockAt(g.rocks, c, r);
    const out = new Set();
    for (const m of g.mons) {
      if (m.stun > 0) continue;
      let s = new Set([m.r * W + m.c]);
      for (let n = 0; n < k; n++) { const s2 = new Set(s); for (const x of s) { const c = x % W, r = q(x, W); for (let d = 0; d < 4; d++) { const c1 = c + dx(d), r1 = r + dy(d); if (ok(c1, r1)) s2.add(r1 * W + c1); } } s = s2; }
      for (const x of s) out.add(x);
    }
    return out;
  }
  const underLoose = (g, c, r) => g.rocks.some(x => x.c === c && r > x.r && r <= x.r + 3 && (x.falling || x.wob >= 0));
  function blocked(g, c, r) {
    if (!inside(c, r) || rockAt(g.rocks, c, r) || underLoose(g, c, r) || cell(g.cells, c, r) === 3) return true;
    if (animalAt(g.animals, c, r) && cell(g.cells, c, r) !== 0 && g.rocks.some(x => x.c === c && x.r < r)) return true;
    if (rockAt(g.rocks, c, r - 1) && cell(g.cells, c, r) !== 0) {
      for (let k = r; ; k++) { if (k >= H || (k > r && cell(g.cells, c, k) !== 0)) break; if (animalAt(g.animals, c, k)) return true; }
    }
    return !g.diving && r >= g.wt && !(g.gear >= 0 && c === g.gear % W && r <= q(g.gear, W));
  }
  const risky = (g, dz, c, r) => blocked(g, c, r) || dz.has(r * W + c);
  // a search spreading from every cell of the frontier at once, a layer at a time, until it reaches your cell: the cell it came from
  function spread(g, dz, frontier, plain) {
    const seen = new Set(frontier);
    let layer = frontier.slice();
    for (;;) {
      const out = [];
      for (const x of layer) {
        const c = x % W, r = q(x, W);
        for (let d = 0; d < 4; d++) if (c + dx(d) === g.px && r + dy(d) === g.py) return x;
        for (let d = 0; d < 4; d++) {
          const c1 = c + dx(d), r1 = r + dy(d), k = r1 * W + c1;
          if (!inside(c1, r1) || seen.has(k) || (plain ? blocked(g, c1, r1) : risky(g, dz, c1, r1))) continue;
          seen.add(k); out.push(k);
        }
      }
      if (!out.length) return -1;
      layer = out.reverse();   // (the rules' next layer: the newest first)
    }
  }
  function robot(g) {
    const none = { dir: -1, flash: false, blast: false };
    if (g.over || g.dead > 0) return none;
    const way = x => { const c = x % W, r = q(x, W); return c > g.px ? 1 : c < g.px ? 3 : r > g.py ? 2 : 0; };
    const am = g.mons.filter(m => m.stun <= 0).map(m => m.r * W + m.c);
    const dz = danger(g, g.flash > 0 || !g.lantern ? 2 : 1);
    const threat = g.mons.some(m => m.stun <= 0 && mreach(m, g.px, g.py) >= 1 && mreach(m, g.px, g.py) <= 3);
    const fl = g.lantern && g.flash <= 0 && threat;
    const choice = (dir, blast) => ({ dir, flash: fl, blast });
    for (let d = 0; d <= 3; d++) { const c = g.px + dx(d), r = g.py + dy(d); if (monAt(g.mons, c, r) && !awakeAt(g.mons, c, r) && !blocked(g, c, r)) return choice(d, false); }
    if (g.loves && g.blast <= 0 && g.pwait > 0) {
      for (let d = 0; d <= 3; d++) {
        const n = ray(g.cells, g.rocks, g.px, g.py, d);
        if (g.mons.some(m => { const k = (m.c - g.px) * dx(d) + (m.r - g.py) * dy(d); return k >= 1 && k <= n && (dx(d) === 0 ? m.c === g.px : m.r === g.py); })) return choice(d, true);
      }
    }
    if (g.pwait > 0) return choice(-1, false);
    if (!g.diving && g.py >= g.wt && g.air < 12 * (q(g.gear, W) - g.py + 1) + 16 && !rockAt(g.rocks, g.px, g.py - 1)) return choice(0, false);
    const hunting = q(g.t, 300) % 6 === 5;
    const y0 = hunting && g.lantern && g.flash <= 0 && am.length ? spread(g, dz, am, true) : -1;
    if (y0 >= 0 && !am.includes(y0)) return choice(way(y0), false);
    let xl = -1;
    if (g.lamp >= 0 && !g.lantern) { xl = spread(g, dz, [g.lamp], false); if (xl < 0 && hunting) xl = spread(g, dz, [g.lamp], true); }
    if (xl >= 0) return choice(way(xl), false);
    const gs = [];
    g.cells.forEach((x, i) => { if (x === 2 && !risky(g, dz, i % W, q(i, W))) gs.push(i); });
    if (g.lover >= 0 && !g.loves && !risky(g, dz, g.lover % W, q(g.lover, W))) gs.unshift(g.lover);
    const x = spread(g, dz, gs, false);
    if (x >= 0) {
      const d0 = way(x);
      return choice(d0 === (g.pd + 2) % 4 && q(g.seed, 7) % 3 === 0 && !risky(g, dz, g.px + dx(g.pd), g.py + dy(g.pd)) ? g.pd : d0, false);
    }
    const xg = g.gear >= 0 && !g.diving ? spread(g, dz, [g.gear], false) : -1;
    if (xg >= 0) return choice(way(xg), false);
    const sm = g.mons.filter(m => m.stun > 0).map(m => m.r * W + m.c);
    const z = sm.length ? spread(g, dz, sm, false) : -1;
    if (z >= 0) return choice(way(z), false);
    const y = g.lantern && g.flash <= 0 && am.length ? spread(g, dz, am, true) : -1;
    if (y >= 0 && !am.includes(y)) return choice(way(y), false);
    let bd = -1, bv = -1;
    for (let d = 0; d <= 3; d++) {
      const c = g.px + dx(d), r = g.py + dy(d);
      let v = -1;
      if (!blocked(g, c, r) && !awakeAt(g.mons, c, r)) { v = 100; for (const m of g.mons) v = Math.min(v, m.stun > 0 ? 100 : Math.abs(m.c - c) + Math.abs(m.r - r)); }
      if (v > bv) { bd = d; bv = v; }
    }
    return choice(bd, false);
  }

  // ---- the scene the page draws behind the game (Scene.hz); the game's rules never see it
  const COSINES = [1000, 985, 940, 866, 766, 643, 500, 342, 174, 0, -174, -342, -500, -643, -766, -866, -940, -985, -1000, -985, -940, -866, -766, -643, -500, -342, -174, 0, 174, 342, 500, 643, 766, 866, 940, 985];
  const cosd = a => COSINES[((a % 36) + 36) % 36], sind = a => cosd(a - 9);
  // a root (kind 0), a thread of mycelium (1) or a taproot (2), a segment at a time; its lines pushed onto out in the order the
  // rules put them in front of theirs (so out, reversed, is the rules' list)
  function grow(x, y, a, len, w, n, seed, kind, out) {
    for (;;) {
      if (n <= 0 || w < 200 || y > 1595 || y < 100 || x < 0 || x > 1400) return;
      const s1 = next(seed);
      const wander = kind === 1 ? q(s1, 11) % 5 - 2 : q(s1, 11) % 3 - 1;
      const pull = (kind === 0 && q(s1, 13) % 3 === 0) || (kind === 2 && q(s1, 13) % 3 !== 0) ? (a < 9 ? 1 : a > 9 ? -1 : 0) : 0;
      const b = a + wander + pull, a1 = b < 1 ? 1 : b > 17 ? 17 : b;
      const x1 = x + q(cosd(a1) * len, 100000), y1 = y + q(sind(a1) * len, 100000);
      out.push({ x0: x, y0: y, x1, y1, w: q(w, 100) });
      const side = q(s1, 211) % 2 === 0 ? 1 : -1;
      if (n > 2 && q(s1, 101) % 100 < 30)
        grow(x1, y1, a1 + side * (3 + q(s1, 307) % 3), q(len * 8, 10), kind === 1 ? w : q(w * 6, 10), q(n, 2), next(s1 + 7), kind === 2 ? 0 : kind, out);
      x = x1; y = y1; a = a1; len = q(len * (kind === 1 ? 970 : 985), 1000); w = kind === 1 ? w : q(w * 965, 1000); n--; seed = s1;
    }
  }
  function treeRoots(ts, seed) {
    const out = [];
    for (const t of ts) {
      const k = t.size, side = (a, s) => grow(t.x, 100, a, 55 * k, 15 * k, 30, s, 0, out);
      const s1 = next(seed + t.x);
      grow(t.x, 100, 9, 58 * k, 22 * k, 60, s1, 2, out);
      side(17, next(s1 + 2)); side(1, next(s1 + 1)); side(16, next(s1 + 4)); side(2, next(s1 + 3)); side(14, next(s1 + 6)); side(4, next(s1 + 5));
      seed = next(s1 + 9);
    }
    return out.reverse();
  }
  function mycelium(ms, seed) {
    const out = [];
    for (const m of ms) {
      const s1 = next(seed + m.x);
      for (const [a, k] of [[17, 7], [14, 6], [11, 5], [9, 4], [7, 3], [4, 2], [1, 1]]) grow(m.x, 104, a, 2400, 300, 14, next(s1 + k), 1, out);
      seed = next(s1 + 9);
    }
    return out.reverse();
  }
  function scatter(n, kind, x0, x1, y0, y1, seed, acc) {
    for (; n > 0; n--) { const s1 = next(seed); acc = [{ kind, x: x0 + q(s1, 7) % (x1 - x0), y: y0 + q(s1, 1000) % (y1 - y0), size: 70 + q(s1, 31) % 61, v: q(s1, 97) % 1000 }, ...acc]; seed = s1; }
    return [acc, seed];
  }
  function trees(xs, seed) {
    let acc = [];
    xs.forEach((x, i) => {
      const s1 = next(seed); seed = s1;
      if (q(s1, 7) % 2 === 0 || (Math.min(acc.length, 2) < 2 && xs.length - i - 1 <= 1))
        acc = [{ kind: q(s1, 13) % 3, x: x + q(s1, 101) % 60 - 30, y: 100, size: 80 + q(s1, 31) % 40, v: q(s1, 97) % 1000 }, ...acc];
    });
    return [acc, seed];
  }
  // a tunnel of n segments, wandering by a step either way within lo and hi: its lines in front of acc, and where it ends
  function tunnel(x, y, a, lo, hi, len, w, n, seed, acc) {
    for (; n > 0; n--) {
      const s1 = next(seed), b = a + q(s1, 11) % 3 - 1, a1 = b < lo ? lo : b > hi ? hi : b;
      const v = x + q(cosd(a1) * len, 1000), x1 = v < 40 ? 40 : v > 1360 ? 1360 : v, y1 = y + q(sind(a1) * len, 1000);
      acc = [{ x0: x, y0: y, x1, y1, w }, ...acc]; x = x1; y = y1; a = a1; seed = s1;
    }
    return [acc, x, y];
  }
  function nest(x, y, n, seed) {
    let lines = [], rooms = [];
    for (let k = 0; k < n; k++) {
      const s1 = next(seed);
      const [l1, x1, y1] = tunnel(x, y, 9, 7, 11, 60, 9, 1, s1, lines);
      lines = l1;
      if (k % 2 === 1) {
        const right = k % 4 === 1;
        const [l2, cx, cy] = tunnel(x1, y1, right ? 2 : 16, right ? 0 : 14, right ? 4 : 18, 45, 7, 2, next(s1 + 3), l1);
        lines = l2; rooms = [{ kind: 11, x: cx, y: cy, size: 60 + q(s1, 31) % 30, v: q(s1, 97) % 1000 }, ...rooms];
      }
      x = x1; y = y1; seed = s1;
    }
    return [lines, rooms];
  }
  const spotOf = (ans, k) => { const a = ans.find(a => a.kind === k); return a ? [a.c * 100 + 50, a.r * 100 + 55] : [700, 600]; };
  function scene(seed, level, ans) {
    const s0 = next(seed + 17 + level * 101), left = q(s0, 7) % 2 === 0;
    const ax = left ? 160 + q(s0, 11) % 200 : 1040 + q(s0, 11) % 200;
    const [ts, s1] = trees([70, 230, 390, 530, 970, 1120, 1300], next(s0 + 1));
    const [bushes, s2] = scatter(2, 3, 40, 1360, 100, 101, s1, []);
    const [grass, s3] = scatter(22, 4, 10, 1390, 100, 101, s2, []);
    const [flowers, s4] = scatter(8, 5, 20, 1380, 100, 101, s3, []);
    const [ferns, s5] = scatter(3, 6, 30, 1370, 100, 101, s4, []);
    const [reds, s6] = scatter(2, 7, 40, 620, 100, 101, s5, []);
    const [browns, s7] = scatter(2, 8, 880, 1360, 100, 101, s6, []);
    const anthill = { kind: 9, x: ax, y: 100, size: 100, v: 0 };
    const [antLines, chambers] = nest(ax, 100, 6, next(s7 + 3));
    const [rcx, rcy] = spotOf(ans, 17), west = rcx < 700;
    const [rab0, ex0, ey0] = tunnel(rcx, rcy, west ? 30 : 24, west ? 29 : 22, west ? 32 : 25, 70, 40, Math.max(1, q(rcy - 130, 60)), next(s7 + 5), []);
    const rabLines = ey0 > 100 ? [{ x0: ex0, y0: ey0, x1: ex0, y1: 100, w: 40 }, ...rab0] : rab0;
    const [mx, my] = spotOf(ans, 15), east = q(s7, 37) % 2 === 0;
    const [runLines] = tunnel(mx, my, east ? 0 : 18, east ? -1 : 17, east ? 1 : 19, 60, 30, 8, next(s7 + 7), []);
    const [bx, by] = spotOf(ans, 19), bw = bx < 700;
    const [settLines] = tunnel(bx, by, bw ? 0 : 18, bw ? -1 : 17, bw ? 1 : 19, 70, 46, 3, next(s7 + 9), rabLines);
    const [worms, s8] = scatter(9, 12, 60, 1340, 230, 1560, next(s7 + 11), []);
    const [grubs, s9] = scatter(5, 13, 60, 1340, 300, 1500, s8, worms);
    const [beetles, s10] = scatter(4, 14, 60, 1340, 260, 1520, s9, grubs);
    const shrooms = reds.length === 0 ? browns : [reds[0], ...(reds.length < 2 ? browns : [reds[1], ...browns])];
    return { above: [anthill, ...ts, ...bushes, ...ferns, ...shrooms, ...flowers, ...grass], roots: treeRoots(ts, next(s10 + 1)), threads: mycelium(shrooms, next(s10 + 2)),
             burrows: settLines, ants: antLines, run: runLines,
             below: [{ kind: 16, x: mx, y: my, size: 100, v: 0 }, { kind: 18, x: rcx, y: rcy, size: 100, v: 0 }, { kind: 20, x: bx, y: by, size: 100, v: 0 }, ...chambers, ...beetles] };
  }
  // the ground's landings: for each cell, the row a thing let go in it comes to rest in, or -1 where the earth holds it
  function landing(cells) {
    const SOLID = new Array(14).fill(1), lands = [];
    for (let r = 15; r >= 0; r--) {
      const row = cells.slice(r * 14, r * 14 + 14), under = r === 15 ? SOLID : cells.slice((r + 1) * 14, (r + 1) * 14 + 14), below = r === 15 ? SOLID : lands[r + 1];
      const n = Math.min(row.length, under.length, below.length), out = [];
      for (let i = 0; i < n; i++) out.push(row[i] !== 0 ? -1 : under[i] !== 0 ? r : below[i]);
      lands[r] = out;
    }
    return lands.flat();
  }

  const api = { start, step, robot, scene, landing, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.DigPlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
