// hazeljs-examples, Go in plain JavaScript (ticket 797), for timing only: the page never loads it. The same game, rules and
// opponent as go/rules/Go.hz (a move and its captures, no suicide, the ko; a pass; Tromp and Taylor's area score; and the
// opponent's worth of every empty point, in tenths of a point, plus the page's random number for that point), written as a
// JavaScript programmer would: the board a flat array inside, each group traced once for the turn. Its answers are the
// same: the same worth for every point, the same first best point in the same scan, the same pass. Same functions and values
// as compiled.js, so node/compare-compiled.mjs --plain checks it and node/three-way.mjs times it.
(() => {
  "use strict";
  const flat = g => g.board.flat();
  const rowsOf = (b, n) => { const out = []; for (let r = 0; r < n; r++) out.push(b.slice(r * n, r * n + n)); return out; };
  // the points beside p, in Hazel's order: above, below, left, right
  const beside = (n, p) => {
    const c = p % n, out = [];
    if (p >= n) out.push(p - n);
    if (p + n < n * n) out.push(p + n);
    if (c > 0) out.push(p - 1);
    if (c < n - 1) out.push(p + 1);
    return out;
  };
  // the points joined to p by its own colour (an empty point's region, for colour 0), and their liberties: the empty
  // points beside them (none for a region of empty points)
  function group(b, n, p) {
    const colour = b[p], stones = [p], seen = new Set([p]), libs = new Set();
    for (let i = 0; i < stones.length; i++) for (const q of beside(n, stones[i])) {
      if (b[q] === colour) { if (!seen.has(q)) { seen.add(q); stones.push(q); } }
      else if (b[q] === 0) libs.add(q);
    }
    return { stones, libs };
  }
  const fresh = n => ({ size: n, board: rowsOf(new Array(n * n).fill(0), n), turn: 1, ko: -1, passes: 0, black_took: 0, white_took: 0, last: -2, over: false });

  // ---- a move: the stone placed, the other side's groups beside it with no liberty taken; null when it would leave its own
  // group with none
  function place(b0, n, p, me) {
    const b = b0.slice(); b[p] = me;
    let took = 0, at = -1;
    for (const q of beside(n, p)) {
      if (b[q] !== 3 - me) continue;
      const { stones, libs } = group(b, n, q);
      if (!libs.size) { for (const s of stones) b[s] = 0; took += stones.length; at = q; }
    }
    const mine = group(b, n, p);
    return mine.libs.size ? { b, took, at, mine } : null;
  }
  function play(g, p) {
    const n = g.size, b0 = flat(g);
    if (g.over || p < 0 || p >= n * n || p === g.ko || b0[p] !== 0) return g;
    const me = g.turn, m = place(b0, n, p, me);
    if (!m) return g;
    return { size: n, board: rowsOf(m.b, n), turn: 3 - me, ko: m.took === 1 && m.mine.stones.length === 1 && m.mine.libs.size === 1 ? m.at : -1,
             passes: 0, black_took: me === 1 ? g.black_took + m.took : g.black_took, white_took: me === 2 ? g.white_took + m.took : g.white_took, last: p, over: false };
  }
  const pass = g => g.over ? g : { size: g.size, board: g.board, turn: 3 - g.turn, ko: -1, passes: g.passes + 1, black_took: g.black_took, white_took: g.white_took, last: -1, over: g.passes + 1 >= 2 };
  // ---- the score: each point its stone's colour, or the colour of the only stones its empty region reaches (0: both, none)
  function score(g) {
    const n = g.size, b = flat(g), owners = new Array(n * n).fill(-1);
    for (let p = 0; p < n * n; p++) {
      if (b[p] > 0) { owners[p] = b[p]; continue; }
      if (owners[p] >= 0) continue;
      const region = [p], seen = new Set([p]); let bl = false, wh = false;
      for (let i = 0; i < region.length; i++) for (const q of beside(n, region[i])) {
        if (b[q] === 0) { if (!seen.has(q)) { seen.add(q); region.push(q); } } else if (b[q] === 1) bl = true; else wh = true;
      }
      const o = bl && !wh ? 1 : wh && !bl ? 2 : 0;
      for (const q of region) owners[q] = o;
    }
    return { black: owners.filter(o => o === 1).length, white: owners.filter(o => o === 2).length, komi: n <= 7 ? 9 : 7, owners };
  }

  // ---- the opponent: what a move at p is worth to whoever's turn it is, in tenths of a point
  const line = (n, p) => { const r = Math.floor(p / n), c = p % n; return Math.min(r, c, n - 1 - r, n - 1 - c); };
  const PLACE = [-4, -1, 2, 1];
  // the board's groups, traced once for the turn: each point's group (its stones, its liberties)
  function groupsOf(b, n) {
    const of = new Array(n * n).fill(null);
    for (let p = 0; p < n * n; p++) if (b[p] !== 0 && !of[p]) { const gr = group(b, n, p); for (const s of gr.stones) of[s] = gr; }
    return of;
  }
  // the stones of colour's groups beside p with k liberties, a group counted each time it is beside p
  const withLibs = (b, of, colour, qs, k) => { let t = 0; for (const q of qs) if (b[q] === colour && of[q].libs.size === k) t += of[q].stones.length; return t; };
  function worth(g, b, of, p) {
    const n = g.size, me = g.turn, qs = beside(n, p);
    if (b[p] !== 0 || p === g.ko || qs.every(q => b[q] === me)) return -100000;
    const d = line(n, p), placed = d < 4 ? PLACE[d] : 0;
    // (with no stone beside it: its liberties are the points beside it)
    if (qs.every(q => b[q] === 0)) return 10 * (Math.min(qs.length, 4) + placed);
    if (qs.some(q => b[q] === 3 - me && of[q].libs.size === 1)) {
      // (a capture: the move played, and the board after it read afresh)
      // (never null after a capture, which frees a point beside p; were it, Hazel's play would leave the game as it was)
      const m = place(b, n, p, me) || { b, took: 0, mine: { libs: new Set() } }, l = m.mine.libs.size;
      const saved = l >= 2 ? withLibs(b, of, me, qs, 1) : 0;
      let threat = 0; for (const q of qs) if (m.b[q] === 3 - me) { const gr = group(m.b, n, q); if (gr.libs.size === 1) threat += gr.stones.length; }
      return 10 * (20 * m.took + 15 * saved + 6 * threat + Math.min(l, 4) + placed);
    }
    // (no capture: my stone joined to my groups beside it; their liberties less p, with the empty points beside p)
    const stones = new Set([p]), libs = new Set();
    for (const q of qs) {
      if (b[q] === 0) libs.add(q);
      else if (b[q] === me && !stones.has(q)) { for (const s of of[q].stones) stones.add(s); for (const x of of[q].libs) if (x !== p) libs.add(x); }
    }
    const l = libs.size;
    if (l === 0) return -100000;
    const saved = l >= 2 ? withLibs(b, of, me, qs, 1) : 0, threat = withLibs(b, of, 3 - me, qs, 2), risk = l === 1 ? stones.size : 0;
    return 10 * (15 * saved + 6 * threat - 12 * risk + Math.min(l, 4) + placed);
  }
  const ahead = g => { const s = score(g); return g.turn === 2 ? s.white + s.komi > s.black : s.black > s.white + s.komi; };
  // the opponent's move: the point of the best worth plus its random number (the first, scanning from the top left; worth
  // more than -3 points), or -1 to pass; a pass too when the other side has passed and it is ahead
  function choose(g, rs) {
    if (g.over) return -1;
    if (g.passes >= 1 && ahead(g)) return -1;
    const n = g.size, b = flat(g), of = groupsOf(b, n);
    let at = -1, best = -30;
    for (let p = 0; p < n * n; p++) { const v = worth(g, b, of, p) + (rs && p < rs.length ? rs[p] : 0); if (v > best) { at = p; best = v; } }
    return at;
  }

  const api = { fresh, play, pass, score, choose, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.GoPlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
