// hazeljs-examples, Mahjong solitaire in plain JavaScript (^report(65), 2026-11-25; Matthew: "Why don't we have plain JS data
// for the later part of the table? Can we get it?"), for timing only: the page never loads it. The same game as
// mahjong-solitaire/rules/MahjongSolitaire.hz (three layouts; each place keeping count of the tiles on it and beside it; a deal
// that can always be won, made by playing the layout from full; a match; the plan kept right as pairs are taken; a shuffle that
// keeps a game winnable; Hazel's choice of a pair), written as a JavaScript programmer would: arrays in the rules' order, loops
// for the recursions. The shuffle's merge sort is a sort by its keys (a stream of distinct numbers, so the order is the same).
// Same functions and values as compiled.js, so node/package-bench.mjs times it beside the others and compares every way's answers.
(() => {
  "use strict";
  const q = (a, b) => Math.trunc(a / b);
  const modulo = (a, b) => a - b * q(a, b);
  const next = r => modulo(r * 16807, 2147483647);
  const STUCK = () => ({ a: -1, b: -1 });
  // ---- layouts
  function row(y, x0, x1, z) { const out = []; for (let x = x0; x <= x1; x += 2) out.push({ x, y, z }); return out; }
  function block(x0, x1, y0, y1, z) { const out = []; for (let y = y0; y <= y1; y += 2) out.push(...row(y, x0, x1, z)); return out; }
  const TURTLE = [row(0, 2, 24, 0), row(2, 6, 20, 0), row(4, 4, 22, 0), row(6, 2, 24, 0), row(8, 2, 24, 0), row(10, 4, 22, 0), row(12, 6, 20, 0), row(14, 2, 24, 0),
    row(7, 0, 0, 0), row(7, 26, 26, 0), row(7, 28, 28, 0), block(8, 18, 2, 12, 1), block(10, 16, 4, 10, 2), block(12, 14, 6, 8, 3), row(7, 13, 13, 4)].flat();
  const PYRAMID = [block(0, 18, 0, 14, 0), block(2, 16, 2, 12, 1), block(6, 12, 4, 10, 2)].flat();
  const FORTRESS = [block(0, 22, 0, 14, 0), block(0, 2, 0, 2, 1), block(20, 22, 0, 2, 1), block(0, 2, 12, 14, 1), block(20, 22, 12, 14, 1),
    row(0, 4, 18, 1), row(14, 4, 18, 1), block(0, 0, 4, 10, 1), block(22, 22, 4, 10, 1), block(10, 12, 6, 8, 1), row(1, 1, 1, 2), row(1, 21, 21, 2), row(13, 1, 1, 2), row(13, 21, 21, 2)].flat();
  const layout = i => (i === 1 ? PYRAMID : i === 2 ? FORTRESS : TURTLE).map(p => ({ x: p.x, y: p.y, z: p.z }));
  // ---- neighbours, by number, in the layout's order
  function nears(ps) {
    return ps.map(p => {
      const n = { above: [], below: [], left: [], right: [] };
      ps.forEach((o, j) => {
        const dx = o.x - p.x, dy = o.y - p.y, over = dx < 2 && dx > -2 && dy < 2 && dy > -2, beside = dy < 2 && dy > -2;
        if (o.z === p.z + 1 && over) n.above.push(j);
        else if (o.z === p.z - 1 && over) n.below.push(j);
        else if (o.z === p.z && beside && dx === -2) n.left.push(j);
        else if (o.z === p.z && beside && dx === 2) n.right.push(j);
      });
      return n;
    });
  }
  const NO_NEAR = () => ({ above: [], below: [], left: [], right: [] });
  const nearAt = (ns, i) => (ns.length === 0 ? NO_NEAR() : i <= 0 ? ns[0] : i < ns.length ? ns[i] : NO_NEAR());
  // ---- free places
  const fresh = ns => ns.map(n => ({ face: -2, up: n.above.length, lf: n.left.length, rt: n.right.length }));
  const isFree = s => s.face !== -1 && s.up === 0 && (s.lf === 0 || s.rt === 0);
  function frees(ss) { const out = []; ss.forEach((s, i) => { if (isFree(s)) out.push(i); }); return out; }
  const slotAt = (ss, i) => (ss.length === 0 ? { face: -1, up: 1, lf: 1, rt: 1 } : i <= 0 ? ss[0] : i < ss.length ? ss[i] : { face: -1, up: 1, lf: 1, rt: 1 });
  // take the tile at place i (n its neighbours): its face gone, one fewer on the places it covered and beside it
  const lift = (ss, i, n) => ss.map((x, k) => k === i ? { face: -1, up: x.up, lf: x.lf, rt: x.rt }
    : { face: x.face, up: n.below.includes(k) ? x.up - 1 : x.up, lf: n.right.includes(k) ? x.lf - 1 : x.lf, rt: n.left.includes(k) ? x.rt - 1 : x.rt });
  const lift2 = (ss, near, a, b) => lift(lift(ss, a, nearAt(near, a)), b, nearAt(near, b));
  function withFaces(ss, fs) { const n = Math.min(ss.length, fs.length), out = []; for (let i = 0; i < n; i++) out.push({ face: fs[i], up: ss[i].up, lf: ss[i].lf, rt: ss[i].rt }); return out; }
  // ---- faces
  const key = f => (f < 34 ? f : f < 38 ? 34 : 38);
  function pairsOf(ss) {
    const fk = []; ss.forEach((x, i) => { if (isFree(x) && x.face >= 0) fk.push([i, key(x.face)]); });
    const out = [];
    for (let i = 0; i < fk.length; i++) for (let j = i + 1; j < fk.length; j++) if (fk[i][1] === fk[j][1]) out.push({ a: fk[i][0], b: fk[j][0] });
    return out;
  }
  // ---- chance
  function shuffled(xs, seed) {
    const keyed = []; let r = seed;
    for (const x of xs) { r = next(r); keyed.push([r, x]); }
    keyed.sort((p, o) => p[0] - o[0]);
    return keyed.map(p => p[1]);
  }
  const countTo = n => Array.from({ length: n }, (_, i) => i);
  const atOr = (xs, i) => (i < 0 ? (xs.length ? xs[0] : -1) : i < xs.length ? xs[i] : -1);
  function pairFaces(fs, order) { const out = []; for (const p of order) out.push(atOr(fs, 2 * p), atOr(fs, 2 * p + 1)); return out; }
  // play from the slots, two free places at a time, giving them the faces; null if it stuck
  function unplay(ss, near, faces, r) {
    let out = ss.map(() => -1); const done = [];
    for (let i = 0; i < faces.length; i += 2) {
      if (i + 1 >= faces.length) return null;
      const free = frees(ss), m = free.length;
      if (m < 2) return null;
      const r1 = next(r), r2 = next(r1);
      const a = atOr(free, modulo(r1, m)), b = atOr(free.filter(x => x !== a), modulo(r2, m - 1));
      ss = lift2(ss, near, a, b);
      out = out.slice(); if (a >= 0 && a < out.length) out[a] = faces[i]; if (b >= 0 && b < out.length) out[b] = faces[i + 1];
      done.push({ a, b }); r = r2;
    }
    return [out, done];
  }
  // deal the faces (sorted like by like) to the places that have a tile, trying up to 40 times; the plan it was made by
  function redeal(ss, near, fs, seed) {
    for (let k = 0; ; k++) {
      const faces = pairFaces(fs, shuffled(countTo(q(fs.length, 2)), seed));
      const got = faces.length ? unplay(ss, near, faces, next(next(seed))) : [ss.map(() => -1), []];
      if (got && got[0].length) return got;
      if (k >= 40) { let gi = 0; return [ss.map(x => (x.face === -1 ? -1 : gi < faces.length ? faces[gi++] : -1)), []]; }
      seed = next(seed + 7919);
    }
  }
  function deal(k, seed) {
    const near = nears(layout(k)), ss = fresh(near);
    const fs = []; for (let i = 0; i < 144; i++) fs.push(i < 136 ? q(i, 4) : 34 + (i - 136));
    const [out, plan] = redeal(ss, near, fs, seed);
    return { layout: k, slots: withFaces(ss, out), near, plan };
  }
  // ---- playing
  const facesOf = ss => ss.map(x => x.face);
  // the plan after a and b are taken (see the rules: a pair of the plan dropped; two pairs' tiles, their partners paired; played through as a set; stuck, each face's pairs paired the other two ways)
  function replan(plan, ss, near, a, b) {
    const partner = x => { for (const p of plan) { if (p.a === x) return p.b; if (p.b === x) return p.a; } return -1; };
    const hit = p => p.a === a || p.b === a || p.a === b || p.b === b;
    const base = plan.filter(p => !hit(p));
    const less = (ps, o) => { const i = ps.findIndex(p => p.a === o.a && p.b === o.b); return i < 0 ? ps : [...ps.slice(0, i), ...ps.slice(i + 1)]; };
    function play(xs, ps) {
      const out = [];
      while (ps.length) {
        const fr = frees(xs), p = ps.find(o => fr.includes(o.a) && fr.includes(o.b));
        if (!p) { out.push(STUCK()); return out; }
        out.push(p); xs = lift2(xs, near, p.a, p.b); ps = less(ps, p);
      }
      return out;
    }
    const clears = ps => ps.every(p => p.a >= 0);
    const face = i => key(slotAt(ss, i).face);
    const pa = partner(a), pb = partner(b);
    if (pa === b || pa < 0 || pb < 0) return base;
    const all = [{ a: pa, b: pb }, ...base];
    const first = play(ss, all);
    if (clears(first)) return first;
    function pairUp(p, k, qs) {
      for (const o of qs) {
        if (face(o.a) !== k) continue;
        const os = less(less(all, p), o);
        const r1 = play(ss, [{ a: p.a, b: o.a }, { a: p.b, b: o.b }, ...os]);
        if (clears(r1)) return r1;
        const r2 = play(ss, [{ a: p.a, b: o.b }, { a: p.b, b: o.a }, ...os]);
        if (clears(r2)) return r2;
      }
      return [STUCK()];
    }
    for (let i = 0; i < all.length; i++) { const r = pairUp(all[i], face(all[i].a), all.slice(i + 1)); if (clears(r)) return r; }
    return [];
  }
  function take(g, a, b) {
    const sa = slotAt(g.slots, a), sb = slotAt(g.slots, b);
    if (a !== b && isFree(sa) && isFree(sb) && sa.face >= 0 && sb.face >= 0 && key(sa.face) === key(sb.face)) {
      const s2 = lift2(g.slots, g.near, a, b);
      return { layout: g.layout, slots: s2, near: g.near, plan: replan(g.plan, s2, g.near, a, b) };
    }
    return g;
  }
  const freePlaces = g => frees(g.slots), pairs = g => pairsOf(g.slots);
  const won = g => facesOf(g.slots).every(f => f === -1);
  function shuffle(g, seed) {
    const left = facesOf(g.slots).filter(f => f !== -1), sorted = [];
    for (const k of [...countTo(34), 34, 38]) for (const f of left) if (key(f) === k) sorted.push(f);
    const [out, plan] = redeal(g.slots, g.near, sorted, seed);
    return { layout: g.layout, slots: withFaces(g.slots, out), near: g.near, plan };
  }
  // Hazel's choice: the plan's next pair if it can be taken; else the pair that leaves the most free places and pairs after it
  function best(g) {
    if (g.plan.length) {
      const p = g.plan[0], sa = slotAt(g.slots, p.a), sb = slotAt(g.slots, p.b);
      if (isFree(sa) && isFree(sb) && sa.face >= 0 && sb.face >= 0 && key(sa.face) === key(sb.face)) return p;
    }
    let top = STUCK(), v = -2000000;
    for (const p of pairs(g)) {
      const s2 = lift2(g.slots, g.near, p.a, p.b);
      let w;
      if (facesOf(s2).every(f => f === -1)) w = 1000000;
      else { const ps = pairsOf(s2); w = ps.length === 0 ? -1000000 : 10 * frees(s2).length + 3 * ps.length + 4 * (nearAt(g.near, p.a).below.length + nearAt(g.near, p.b).below.length); }
      if (w > v) { top = p; v = w; }
    }
    return top;
  }

  const api = { deal, take, frees: freePlaces, pairs, best, shuffle, places: layout, won, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.MahjongSolitairePlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
