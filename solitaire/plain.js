// hazeljs-examples, Solitaire (Klondike) in plain JavaScript (ticket 797), for timing only: the page never loads it. The same
// game and rules as solitaire/rules/*.hz (the deck, the deal by the page's random numbers, every legal move in Hazel's
// order, a move made, the win), written as a JavaScript programmer would, with arrays and loops, on the same values as
// compiled.js (hazeljs's shapes: a card { suit: { tag }, rank }, a move { tag, value }), so node/compare-compiled.mjs
// --plain checks it against the compiled rules and node/three-way.mjs times all three. Solitaire has no opponent: the
// moves are its only work.
(() => {
  "use strict";
  const SUITS = ["Spades", "Hearts", "Diamonds", "Clubs"];
  const red = s => s.tag === "Hearts" || s.tag === "Diamonds";
  const index = s => SUITS.indexOf(s.tag);
  // the deck, by suit, each from the Ace to the King
  const deck = () => { const d = []; for (const tag of SUITS) for (let rank = 1; rank <= 13; rank++) d.push({ suit: { tag }, rank }); return d; };
  const NOCARD = () => ({ suit: { tag: "Spades" }, rank: 1 });

  // ---- the deal: each next card taken from those left, where a random number falls; pile i (0 to 6) takes i + 1 cards,
  // the first face up; the rest are the stock
  function deal(us, draw) {
    const left = deck(), cards = [];
    for (let i = 0; i < us.length && left.length; i++) cards.push(left.splice(Math.trunc(us[i] * left.length), 1)[0] || NOCARD());
    cards.push(...left);
    const piles = [];
    let at = 0;
    for (let i = 0; i < 7; i++) { const run = cards.slice(at, at + i + 1); at += i + 1; piles.push({ down: run.slice(1), up: run.slice(0, 1) }); }
    return { stock: cards.slice(at), waste: [], foundations: [[], [], [], []], piles, draw };
  }

  // ---- what fits where: a King on an empty pile, or one rank below the pile's top card in the other colour; an Ace on an
  // empty foundation, or one rank above its top card
  const fitsPile = (c, p) => p.up.length ? red(p.up[0].suit) === !red(c.suit) && c.rank === p.up[0].rank - 1 : !p.down.length && c.rank === 13;
  const fitsFound = (c, f) => f.length ? c.rank === f[0].rank + 1 : c.rank === 1;
  const shift = (from, to) => ({ tag: "Shift", value: { from, to } });
  const pileFrom = (pile, count) => ({ tag: "FromPile", value: { pile, count } });
  // the piles a card fits, as moves from where it is (skip: the pile it comes from)
  function toPiles(out, from, c, piles, skip) { piles.forEach((p, j) => { if (j !== skip && fitsPile(c, p)) out.push(shift(from, { tag: "ToPile", value: j })); }); }
  function toFound(out, from, c, g) { if (fitsFound(c, g.foundations[index(c.suit)] || [])) out.push(shift(from, { tag: "ToFoundation" })); }

  // ---- every legal move: the stock turned over (or the waste back into it), the waste's top card, the piles' runs (each run
  // of its top k face-up cards where its bottom card fits; a lone top card to its foundation first; a King that is all of its
  // pile does not move to another empty one), and the foundations' top cards
  function moves(g) {
    const out = [];
    if (g.stock.length) out.push({ tag: "Draw" }); else if (g.waste.length) out.push({ tag: "Redeal" });
    if (g.waste.length) { const c = g.waste[0], f = { tag: "FromWaste" }; toFound(out, f, c, g); toPiles(out, f, c, g.piles, -1); }
    g.piles.forEach((p, i) => {
      p.up.forEach((c, k0) => {
        const k = k0 + 1, whole = k === p.up.length && !p.down.length;
        if (k === 1) toFound(out, pileFrom(i, 1), c, g);
        if (!(whole && c.rank === 13)) toPiles(out, pileFrom(i, k), c, g.piles, i);
      });
    });
    g.foundations.forEach((f, i) => { if (f.length) toPiles(out, { tag: "FromFoundation", value: i }, f[0], g.piles, -1); });
    return out;
  }
  // the cards a move takes up (top first)
  function lifted(g, from) {
    if (from.tag === "FromWaste") return g.waste.slice(0, 1);
    if (from.tag === "FromPile") { const p = g.piles[from.value.pile]; return p ? p.up.slice(0, Math.max(0, from.value.count)) : []; }
    const f = g.foundations[from.value]; return f ? f.slice(0, 1) : [];
  }
  // the moves from one place: its foundation first (a lone card, not from a foundation), then the piles it fits
  function moves_from(g, from) {
    const run = lifted(g, from); if (!run.length) return [];
    const out = [], c = run[run.length - 1];
    if (from.tag !== "FromFoundation" && run.length === 1) toFound(out, from, c, g);
    toPiles(out, from, c, g.piles, from.tag === "FromPile" ? from.value.pile : -1);
    return out;
  }
  // whether a move is legal, checked by itself
  function can(g, m) {
    if (m.tag === "Draw") return g.stock.length > 0;
    if (m.tag === "Redeal") return !g.stock.length && g.waste.length > 0;
    const { from, to } = m.value, run = lifted(g, from), bottom = run.length ? run[run.length - 1] : NOCARD();
    const okFrom = from.tag === "FromPile" ? from.value.count >= 1 && from.value.pile >= 0 && from.value.pile <= 6 && from.value.count <= g.piles[from.value.pile].up.length
      : from.tag === "FromFoundation" ? from.value >= 0 && from.value <= 3 : true;
    if (!okFrom || !run.length) return false;
    if (to.tag === "ToPile") return to.value >= 0 && to.value <= 6 && !(from.tag === "FromPile" && from.value.pile === to.value) && fitsPile(bottom, g.piles[to.value]);
    return run.length === 1 && fitsFound(bottom, g.foundations[index(bottom.suit)] || []);
  }
  // a move made: the game after it; a move that is not legal leaves the game as it was. A pile whose run is gone turns its
  // top face-down card up
  function apply(g, m) {
    if (!can(g, m)) return g;
    if (m.tag === "Draw") {
      const stock = g.stock.slice(), waste = g.waste.slice();
      for (let n = 0; n < g.draw && stock.length; n++) waste.unshift(stock.shift());
      return { stock, waste, foundations: g.foundations, piles: g.piles, draw: g.draw };
    }
    if (m.tag === "Redeal") return { stock: g.waste.slice().reverse(), waste: [], foundations: g.foundations, piles: g.piles, draw: g.draw };
    const { from, to } = m.value, run = lifted(g, from);
    let waste = g.waste, foundations = g.foundations, piles = g.piles;
    if (from.tag === "FromWaste") waste = waste.slice(1);
    else if (from.tag === "FromPile") piles = piles.map((p, i) => i === from.value.pile ? { down: p.down, up: p.up.slice(run.length) } : p);
    else foundations = foundations.map((f, i) => i === from.value ? f.slice(1) : f);
    if (to.tag === "ToPile") piles = piles.map((p, j) => j === to.value ? { down: p.down, up: [...run, ...p.up] } : p);
    else { const i = index(run[0].suit); foundations = foundations.map((f, k) => k === i ? [run[0], ...f] : f); }
    piles = piles.map(p => !p.up.length && p.down.length ? { down: p.down.slice(1), up: [p.down[0]] } : p);
    return { stock: g.stock, waste, foundations, piles, draw: g.draw };
  }
  const won = g => g.foundations.reduce((n, f) => n + f.length, 0) === 52;

  const api = { deal, moves, moves_from, apply, won, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.SolitairePlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
