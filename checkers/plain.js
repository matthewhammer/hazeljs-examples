// hazeljs-examples, Checkers in plain JavaScript (ticket 797), for timing only: the page never loads it. The same game,
// rules and strategy as checkers/rules/Checkers.hz, written as a JavaScript programmer would (bit operations on 32-bit
// sets, arrays, loops), and giving the same answers in the same order: the moves in the order Hazel lists them, the same
// alpha-beta over them, and a tie going to the larger of the page's random numbers, one taken per move tried. The same
// functions as compiled.js (start, moves, apply, choose), on the same values (hazeljs's shapes), so node/compare-compiled.mjs
// --plain checks it against the compiled rules and node/three-way.mjs times all three.
(() => {
  "use strict";
  // ---- the board: square k (0 to 31, row by row from the top left) is bit k of a set
  const has = (b, k) => ((b >>> k) & 1) === 1;
  const add = (b, k) => (b | (1 << k)) >>> 0;
  const drop = (b, k) => (b & ~(1 << k)) >>> 0;
  const squares = b => { const out = []; for (let k = 0; k < 32; k++) if (has(b, k)) out.push(k); return out; };
  // the square dr rows down and dc columns right of square s, or -1 off the board
  const step = (s, dr, dc) => {
    const r = s >> 2, c = 2 * (s & 3) + (r % 2 === 0 ? 1 : 0), r2 = r + dr, c2 = c + dc;
    return r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7 ? -1 : r2 * 4 + (c2 >> 1);
  };
  const KING = [[-1, -1], [-1, 1], [1, -1], [1, 1]], BLACK = [[-1, -1], [-1, 1]], WHITE = [[1, -1], [1, 1]];
  const dirs = (who, king) => king ? KING : who === 1 ? BLACK : WHITE;
  const side = (g, who) => who === 1 ? g.black : g.white;
  const crowns = (who, s) => who === 1 ? s < 4 : s >= 28;
  // (a set past 2^31 may come back from a JavaScript caller as a negative 32-bit number, as from hazeljs)
  const wide = b => b < 0 ? b + 4294967296 : b;
  const fromPage = g => ({ black: wide(g.black), white: wide(g.white), kings: wide(g.kings), turn: g.turn, quiet: g.quiet, over: g.over, winner: g.winner, last: g.last });

  // ---- moves: every way to jump on from s, as [landed, taken] pairs, over the other side's pieces not yet taken onto an
  // empty square, on again while it can; a man reaching the far row is crowned and stops. all: the squares with a piece,
  // less the one moving
  function jumps(who, king, all, them, s, took) {
    const out = [];
    for (const [dr, dc] of dirs(who, king)) {
      const over = step(s, dr, dc), land = step(s, dr + dr, dc + dc);
      if (over < 0 || land < 0 || !has(them, over) || took.includes(over) || has(all, land)) continue;
      const more = !king && crowns(who, land) ? [] : jumps(who, king, all, them, land, [over, ...took]);
      if (!more.length) out.push([[land], [over]]);
      else for (const [ls, ts] of more) out.push([[land, ...ls], [over, ...ts]]);
    }
    return out;
  }
  // the moves of whoever's turn it is: the jumps if there are any (taking is compulsory), else the steps
  function legal(g) {
    if (g.over) return [];
    const who = g.turn, all = (g.black | g.white) >>> 0, them = side(g, 3 - who), ss = squares(side(g, who));
    const caps = [];
    for (const s of ss) { const k = has(g.kings, s); for (const [path, took] of jumps(who, k, drop(all, s), them, s, [])) caps.push({ from: s, path, took }); }
    if (caps.length) return caps;
    const steps = [];
    for (const s of ss) for (const [dr, dc] of dirs(who, has(g.kings, s))) { const t = step(s, dr, dc); if (t >= 0 && !has(all, t)) steps.push({ from: s, path: [t], took: [] }); }
    return steps;
  }
  // a move made: the piece to its last square, the pieces it took gone, crowned on the far row
  function after(g, m) {
    const who = g.turn, dest = m.path.length ? m.path[m.path.length - 1] : m.from, king = has(g.kings, m.from);
    const mine = add(drop(side(g, who), m.from), dest);
    let theirs = side(g, 3 - who), ks = drop(g.kings, m.from);
    for (const t of m.took) { theirs = drop(theirs, t); ks = drop(ks, t); }
    const quiet = m.took.length ? 0 : king ? g.quiet + 1 : 0;
    return { black: who === 1 ? mine : theirs, white: who === 1 ? theirs : mine, kings: king || crowns(who, dest) ? add(ks, dest) : ks,
             turn: 3 - who, quiet, over: false, winner: 0, last: [m.from, ...m.path] };
  }
  // a move made, and the end: the side left with no move has lost; 80 moves with no capture and no man moving, a draw
  function apply(g0, m) {
    const g = fromPage(g0), c = after(g, m);
    if (c.quiet >= 80) return { ...c, over: true, winner: 0 };
    return legal(c).length ? c : { ...c, over: true, winner: g.turn };
  }
  const moves = g => legal(fromPage(g));
  const start = { black: 4293918720, white: 4095, kings: 0, turn: 1, quiet: 0, over: false, winner: 0, last: [] };

  // ---- the opponent: a man is worth 100 and 2 for each row it has come, a king 160; a position's worth to whoever's turn
  function worth(who, kings, b) {
    let w = 0;
    for (const s of squares(b)) w += has(kings, s) ? 160 : 100 + 2 * (who === 1 ? 7 - (s >> 2) : s >> 2);
    return w;
  }
  const value = g => worth(g.turn, g.kings, side(g, g.turn)) - worth(3 - g.turn, g.kings, side(g, 3 - g.turn));
  // the best the side to move at g can make of its moves ms, looking depth moves ahead, between alpha and beta
  function walk(g, ms, depth, alpha, beta) {
    for (const m of ms) {
      const c = after(g, m);
      let v;
      if (depth <= 1) v = -value(c);
      else { const cms = legal(c); v = cms.length ? -walk(c, cms, depth - 1, -beta, -alpha) : 10000 + depth; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) return alpha;
    }
    return alpha;
  }
  // each move tried, the best kept; a tie goes to the larger of the page's random numbers
  function choose(g0, depth, rs) {
    const g = fromPage(g0), ms = legal(g);
    let best = { from: -1, path: [], took: [] }, bv = -1000000, br = -1;
    ms.forEach((m, i) => {
      const r = rs && i < rs.length ? rs[i] : 0, c = after(g, m);
      let v;
      if (depth <= 1) v = -value(c);
      else { const cms = legal(c); v = cms.length ? -walk(c, cms, depth - 1, -1000000, 1000000) : 10000 + depth; }
      if (v > bv || (v === bv && r > br)) { best = m; bv = v; br = r; }
    });
    return best;
  }

  const api = { start, moves, apply, choose, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.CheckersPlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
