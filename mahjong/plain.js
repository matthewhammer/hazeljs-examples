// hazeljs-examples, Mahjong (Hong Kong rules) in plain JavaScript (ticket 797), for timing only: the page never loads it. The
// same game, rules and players as mahjong/rules/Mahjong.hz: the deal (each tile given the page's random number as its key,
// sorted by Hazel's own merge sort, so ties fall the same way), a turn, the claims and which comes first, a winning hand
// (every arrangement of a pair and sets, in Hazel's order, the first worth the most kept), the faan and the points, and what
// each Hazel player discards and claims (all three seats' claims weighed, as Hazel's strict evaluation does). Written as a
// JavaScript programmer would, with arrays and loops, on the same values as compiled.js (start, step, options, next_hand),
// so node/compare-compiled.mjs --plain checks it and node/three-way.mjs times it.
(() => {
  "use strict";
  const rank = t => t % 9;
  const count = (x, xs) => { let n = 0; for (const y of xs) if (y === x) n++; return n; };
  const remove = (x, xs) => { const i = xs.indexOf(x); return i < 0 ? xs.slice() : [...xs.slice(0, i), ...xs.slice(i + 1)]; };
  const insert = (x, xs) => { const i = xs.findIndex(y => x <= y); return i < 0 ? [...xs, x] : [...xs.slice(0, i), x, ...xs.slice(i)]; };
  const distinct = xs => xs.filter((x, i) => i === 0 || xs[i - 1] !== x); // (a sorted list)
  const nxt = s => s === 3 ? 0 : s + 1;
  const total = is => is.reduce((n, i) => n + i.faan, 0);

  // ---- the deal: Hazel's merge sort on (key, tile), its halves taken alternately and reversed, a tie to the left
  function msort(xs) {
    if (xs.length <= 1) return xs;
    const evens = [], odds = [];
    for (let i = xs.length - 1; i >= 0; i--) (i % 2 ? odds : evens).push(xs[i]);
    const [l, r] = xs.length % 2 ? [odds, evens] : [evens, odds];
    const a = msort(l), b = msort(r), out = [];
    let i = 0, j = 0;
    while (i < a.length && j < b.length) out.push(a[i][0] <= b[j][0] ? a[i++] : b[j++]);
    while (i < a.length) out.push(a[i++]);
    while (j < b.length) out.push(b[j++]);
    return out;
  }
  function deal(dealer, wind, hand_no, points, rs) {
    const keyed = []; for (let k = 0; k < 136; k++) keyed.push([rs && k < rs.length ? rs[k] : 0, k >> 2]);
    const w = msort(keyed).map(([, t]) => t), e = w.slice(52, 53);
    const seats = [0, 1, 2, 3].map(i => {
      const h = w.slice(13 * i, 13 * i + 13);
      return { hand: (i === dealer ? [...e, ...h] : h).sort((a, b) => a - b), melds: [], river: [], points: i < points.length ? points[i] : 0 };
    });
    return { wall: w.slice(53), seats, turn: dealer, phase: 1, tile: -1, from: -1, drawn: e.length ? e[0] : 0, dealer, wind, hand_no,
             winner: -1, items: [], pays: [0, 0, 0, 0], events: [] };
  }
  const start = rs => deal(0, 0, 1, [0, 0, 0, 0], rs);

  // ---- seats and the record
  const seatWith = (s, hand, melds, river) => ({ hand, melds, river, points: s.points });
  const setSeat = (ss, i, x) => ss.map((s, j) => j === i ? x : s);
  const noted = (g, who, what, tile) => [{ who, what, tile }, ...g.events].slice(0, 24);
  const mk = (g, wall, seats, turn, phase, tile, from, drawn, events) =>
    ({ wall, seats, turn, phase, tile, from, drawn, dealer: g.dealer, wind: g.wind, hand_no: g.hand_no, winner: g.winner, items: g.items, pays: g.pays, events });
  const seatWind = (g, s) => 27 + (s - g.dealer < 0 ? s - g.dealer + 4 : s - g.dealer);

  // ---- winning hands: every way a sorted hand makes a pair and sets, in Hazel's order (the pairs from the highest, each
  // pair's ways last first)
  function splits(ts) {
    if (!ts.length) return [[]];
    const [t, ...rest] = ts, out = [];
    if (count(t, rest) >= 2) for (const w of splits(remove(t, remove(t, rest)))) out.push([{ kind: 2, tile: t, shown: false }, ...w]);
    if (t < 27 && rank(t) <= 6 && rest.includes(t + 1) && rest.includes(t + 2)) for (const w of splits(remove(t + 1, remove(t + 2, rest)))) out.push([{ kind: 1, tile: t, shown: false }, ...w]);
    return out;
  }
  function arrangements(ts) {
    const out = [];
    for (const p of distinct(ts)) if (count(p, ts) >= 2) for (const w of splits(remove(p, remove(p, ts)))) out.push([p, w]);
    return out.reverse();
  }
  const ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
  const thirteen = ts => ts.length === 14 && ts.every(t => t >= 27 || rank(t) === 0 || rank(t) === 8) && ORPHANS.every(x => ts.includes(x));
  // whether seat s wins with these tiles in hand, drawn by itself or not, and the faan of the arrangement worth the most
  function winOf(g, s, tiles, self) {
    const st = g.seats[s] || { hand: [], melds: [], river: [], points: 0 };
    const hidden = st.melds.every(m => !m.shown);
    const pungOf = (ms, t) => ms.some(m => m.kind >= 2 && m.tile === t);
    const itemsOf = (sets, pair) => {
      const ch = sets.filter(m => m.kind === 1).length, ts = [pair, ...sets.map(m => m.tile)];
      const first = ts.find(t => t < 27), su = first === undefined ? -1 : Math.floor(first / 9);
      const dr = sets.filter(m => m.kind >= 2 && m.tile >= 31).length;
      const oneSuit = ts.every(t => t >= 27 || Math.floor(t / 9) === su), honour = ts.some(t => t >= 27);
      const is = [];
      if (self) is.push({ code: 1, faan: 1 });
      if (hidden && !self) is.push({ code: 2, faan: 1 });
      if (ch === 4) is.push({ code: 3, faan: 1 });
      if (ch === 0) is.push({ code: 4, faan: 3 });
      if (su < 0) is.push({ code: 12, faan: 10 }); else if (oneSuit && honour) is.push({ code: 5, faan: 3 }); else if (oneSuit) is.push({ code: 6, faan: 7 });
      if (dr > 0) is.push({ code: 7, faan: dr });
      if (pungOf(sets, seatWind(g, s))) is.push({ code: 8, faan: 1 });
      if (pungOf(sets, 27 + g.wind)) is.push({ code: 9, faan: 1 });
      if (dr === 3) is.push({ code: 11, faan: 5 }); else if (dr === 2 && pair >= 31) is.push({ code: 10, faan: 3 });
      if (!g.wall.length) is.push({ code: 14, faan: 1 });
      return is;
    };
    if (!st.melds.length && thirteen(tiles)) return [true, [...(self ? [{ code: 1, faan: 1 }] : []), { code: 13, faan: 13 }]];
    const arrs = arrangements(tiles);
    if (!arrs.length) return [false, []];
    let best = [], bf = -1;
    for (const [p, way] of arrs) { const is = itemsOf([...st.melds, ...way], p), f = total(is); if (f > bf) { best = is; bf = f; } }
    return [true, best];
  }
  const wins = (g, s, tiles, self) => winOf(g, s, tiles, self)[0];

  // ---- a turn
  const kongTiles = st => [...distinct(st.hand).filter(d => count(d, st.hand) === 4), ...st.melds.filter(m => m.kind === 2 && st.hand.includes(m.tile)).map(m => m.tile)];
  function discard(g, s, t) {
    const st = g.seats[s];
    return mk(g, g.wall, setSeat(g.seats, s, seatWith(st, remove(t, st.hand), st.melds, [t, ...st.river])), s, 2, t, s, -1, noted(g, s, 2, t));
  }
  const wallEmpty = g => ({ wall: g.wall, seats: g.seats, turn: g.turn, phase: 3, tile: g.tile, from: g.from, drawn: -1, dealer: g.dealer, wind: g.wind,
                            hand_no: g.hand_no, winner: -1, items: [], pays: [0, 0, 0, 0], events: noted(g, -1, 9, -1) });
  // seat s takes the wall's next tile and has its turn (an empty wall ends the hand, as the game was before)
  function drawInto(g, seats, s, events) {
    if (!g.wall.length) return wallEmpty(g);
    const [d, ...rest] = g.wall, st = seats[s];
    return mk(g, rest, setSeat(seats, s, seatWith(st, insert(d, st.hand), st.melds, st.river)), s, 1, -1, -1, d, events);
  }
  function kongSelf(g, s, k) {
    const st = g.seats[s], four = count(k, st.hand) === 4;
    const h = four ? st.hand.filter(x => x !== k) : remove(k, st.hand);
    let grown = false;
    const ms = four ? [{ kind: 3, tile: k, shown: false }, ...st.melds]
      : st.melds.map(m => !grown && m.kind === 2 && m.tile === k ? (grown = true, { kind: 3, tile: k, shown: m.shown }) : m);
    return drawInto(g, setSeat(g.seats, s, seatWith(st, h, ms, st.river)), s, noted(g, s, 6, k));
  }

  // ---- the end of a hand: P = 2 to the faan (to 10); on a discard its thrower pays 2P and the others P; drawn, each 2P
  function finish(g, w, from, items, self, seats, events) {
    const p = 2 ** Math.max(0, Math.min(10, total(items)));
    const pays = [0, 1, 2, 3].map(i => i === w ? (self ? 6 * p : 4 * p) : self || i === from ? -2 * p : -p);
    return { wall: g.wall, seats: seats.map((s, i) => ({ hand: s.hand, melds: s.melds, river: s.river, points: s.points + pays[i] })), turn: w, phase: 3,
             tile: g.tile, from, drawn: g.drawn, dealer: g.dealer, wind: g.wind, hand_no: g.hand_no, winner: w, items, pays, events };
  }
  const winSelf = (g, s) => finish(g, s, s, winOf(g, s, g.seats[s].hand, true)[1], true, g.seats, noted(g, s, 7, g.drawn));
  const unthrown = (g, seats) => { const d = seats[g.from]; return setSeat(seats, g.from, seatWith(d, d.hand, d.melds, d.river.slice(1))); };
  function winDiscard(g, s) {
    const st = g.seats[s], h = insert(g.tile, st.hand);
    return finish(g, s, g.from, winOf(g, s, h, false)[1], false, unthrown(g, setSeat(g.seats, s, seatWith(st, h, st.melds, st.river))), noted(g, s, 8, g.tile));
  }

  // ---- claims
  function claimPung(g, s, kong) {
    const t = g.tile, st = g.seats[s], h1 = remove(t, remove(t, st.hand)), h = kong ? remove(t, h1) : h1;
    const seats = unthrown(g, setSeat(g.seats, s, seatWith(st, h, [{ kind: kong ? 3 : 2, tile: t, shown: true }, ...st.melds], st.river)));
    const events = noted(g, s, kong ? 5 : 4, t);
    return kong ? drawInto(g, seats, s, events) : mk(g, g.wall, seats, s, 1, -1, -1, -1, events);
  }
  function claimChow(g, s, c) {
    const t = g.tile, st = g.seats[s], dropIf = (x, h) => x === t ? h : remove(x, h);
    const h = dropIf(c, dropIf(c + 1, dropIf(c + 2, st.hand)));
    return mk(g, g.wall, unthrown(g, setSeat(g.seats, s, seatWith(st, h, [{ kind: 1, tile: c, shown: true }, ...st.melds], st.river))), s, 1, -1, -1, -1, noted(g, s, 3, c));
  }
  function chowsFor(h, t) {
    if (t >= 27) return [];
    const r = rank(t), out = [];
    if (r >= 2 && h.includes(t - 2) && h.includes(t - 1)) out.push(t - 2);
    if (r >= 1 && r <= 7 && h.includes(t - 1) && h.includes(t + 1)) out.push(t - 1);
    if (r <= 6 && h.includes(t + 1) && h.includes(t + 2)) out.push(t);
    return out;
  }
  function legal(g, s, a) {
    const st = g.seats[s], t = g.tile;
    if (a.kind === 8) return wins(g, s, insert(t, st.hand), false);
    if (a.kind === 7) return count(t, st.hand) >= 3 && g.wall.length > 0;
    if (a.kind === 6) return count(t, st.hand) >= 2;
    if (a.kind === 5) return s === nxt(g.from) && chowsFor(st.hand, t).includes(a.tile);
    return false;
  }

  // ---- the Hazel players: a suited tile's neighbours (3 each one away, 2 each two away); the tile that helps least,
  // honours looked at first (the distinct tiles from the highest), a tie to the first
  const near = (h, t) => t >= 27 ? 0 : (rank(t) >= 1 && h.includes(t - 1) ? 3 : 0) + (rank(t) <= 7 && h.includes(t + 1) ? 3 : 0) +
    (rank(t) >= 2 && h.includes(t - 2) ? 2 : 0) + (rank(t) <= 6 && h.includes(t + 2) ? 2 : 0);
  function worst(g, s, h) {
    const sw = seatWind(g, s), rw = 27 + g.wind;
    const helps = t => { const c = count(t, h); return t >= 27 ? 6 * (c - 1) + (t >= 31 || t === sw || t === rw ? 1 : 0) : 5 * (c - 1) + near(h, t) + (rank(t) >= 2 && rank(t) <= 6 ? 1 : 0); };
    let b = -1, bu = 1000000;
    for (const d of distinct(h).reverse()) { const u = helps(d); if (u < bu) { b = d; bu = u; } }
    return b;
  }
  function botTurn(g) {
    const s = g.turn, st = g.seats[s];
    if (g.drawn >= 0 && wins(g, s, st.hand, true)) return winSelf(g, s);
    const ks = g.drawn >= 0 && g.wall.length > 0 ? kongTiles(st) : [];
    return ks.length ? kongSelf(g, s, ks[0]) : discard(g, s, worst(g, s, st.hand));
  }
  function botClaim(g, s) {
    const st = g.seats[s], t = g.tile, c = count(t, st.hand);
    const one = x => x === t || count(x, st.hand) === 1;
    if (wins(g, s, insert(t, st.hand), false)) return { kind: 8, tile: t };
    if (c >= 3 && g.wall.length > 0) return { kind: 7, tile: t };
    if (c === 2 && (t >= 27 || near(st.hand, t) <= 3)) return { kind: 6, tile: t };
    if (s === nxt(g.from)) { const k = chowsFor(st.hand, t).find(x => one(x) && one(x + 1) && one(x + 2)); return k === undefined ? { kind: 4, tile: -1 } : { kind: 5, tile: k }; }
    return { kind: 4, tile: -1 };
  }
  // the claims on a discard, in their order: a win (the nearest seat after the thrower), a pung or kong, the next seat's chow;
  // with none, the next seat draws. mine: your claim, or kind 9 for a Hazel player's claim in your seat
  function resolve(g, mine) {
    const claimBy = s => s === 0 && mine.kind !== 9 ? (legal(g, 0, mine) ? mine : { kind: 4, tile: -1 }) : botClaim(g, s);
    const s1 = nxt(g.from), s2 = nxt(s1), s3 = nxt(s2);
    const a1 = claimBy(s1), a2 = claimBy(s2), a3 = claimBy(s3);
    if (a1.kind === 8) return winDiscard(g, s1);
    if (a2.kind === 8) return winDiscard(g, s2);
    if (a3.kind === 8) return winDiscard(g, s3);
    if (a1.kind === 6 || a1.kind === 7) return claimPung(g, s1, a1.kind === 7);
    if (a2.kind === 6 || a2.kind === 7) return claimPung(g, s2, a2.kind === 7);
    if (a3.kind === 6 || a3.kind === 7) return claimPung(g, s3, a3.kind === 7);
    if (a1.kind === 5) return claimChow(g, s1, a1.tile);
    return drawInto(g, g.seats, s1, g.events);
  }

  // ---- you: what you may do now, and one step of the table
  function options(g) {
    const st = g.seats[0];
    if (g.phase === 1 && g.turn === 0)
      return { discard: true, win: g.drawn >= 0 && wins(g, 0, st.hand, true), kongs: g.drawn >= 0 && g.wall.length > 0 ? kongTiles(st) : [], pung: false, kong: false, chows: [] };
    if (g.phase === 2 && g.from !== 0)
      return { discard: false, win: wins(g, 0, insert(g.tile, st.hand), false), kongs: [], pung: count(g.tile, st.hand) >= 2,
               kong: count(g.tile, st.hand) >= 3 && g.wall.length > 0, chows: nxt(g.from) === 0 ? chowsFor(st.hand, g.tile) : [] };
    return { discard: false, win: false, kongs: [], pung: false, kong: false, chows: [] };
  }
  function step(g, a) {
    if (g.phase === 3) return g;
    if (g.phase === 1) {
      if (g.turn !== 0 || a.kind === 9) return botTurn(g);
      const st = g.seats[0];
      if (a.kind === 1 && st.hand.includes(a.tile)) return discard(g, 0, a.tile);
      if (a.kind === 2 && g.drawn >= 0 && wins(g, 0, st.hand, true)) return winSelf(g, 0);
      if (a.kind === 3 && g.drawn >= 0 && g.wall.length > 0 && kongTiles(st).includes(a.tile)) return kongSelf(g, 0, a.tile);
      return g;
    }
    const o = options(g), asked = g.from !== 0 && (o.win || o.pung || o.kong || o.chows.length > 0);
    if (!asked) return resolve(g, { kind: 4, tile: -1 });
    return a.kind >= 4 ? resolve(g, a) : g;
  }
  function next_hand(g, rs) {
    const stay = g.winner === g.dealer || g.winner < 0, dealer = stay ? g.dealer : nxt(g.dealer);
    const wind = !stay && dealer === 0 ? nxt(g.wind) : g.wind;
    return deal(dealer, wind, g.hand_no + 1, g.seats.map(s => s.points), rs);
  }

  const api = { start, step, options, next_hand, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.MahjongPlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
