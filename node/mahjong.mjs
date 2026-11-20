// hazeljs-examples, Mahjong in Node: the same Hazel module as the page (mahjong/rules/Mahjong.hz), run through hazeljs. It
// checks the faan of hands worked out by hand, then plays hands at a table of the three Hazel players and a simple player in
// your seat (it wins when it can, claims a pung now and then, and discards at random; every third hand, Hazel plays your seat
// as it plays its own, by the step's kind 9: ticket 796), and checks every step: all 136 tiles
// are somewhere, each seat holds as many as it should, every win is a winning hand by a test written here in JavaScript,
// and the points paid add up to nothing. Then it times a step.
//
//   npm install && npm run mahjong [-- seed] [-- hands, 6 by default]
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../mahjong/rules/" + path, import.meta.url), "utf8").replace(/\s+$/, "");
const TAIL = "(start = Mahjong.start, step = Mahjong.step, options = Mahjong.options, next_hand = Mahjong.next_hand, win_of = Mahjong.win_of)";
const t0 = performance.now();
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Mahjong", text: read("Mahjong.hz") }], tail: TAIL });
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, (r.errors || []).map(e => `${e.module}: ${String(e.message).replace(/\s+/g, " ")}`).join(" | ").slice(0, 600));
if (!r.ok) process.exit(1);
const M = r.value;
let seed = Number(process.argv[2] || 5); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const HANDS = Number(process.argv[3] || 6);
const fail = m => { console.log("FAIL:", m); process.exitCode = 1; };
const rs = () => Array.from({ length: 136 }, () => Math.floor(rnd() * 1000000));
const NONE = { kind: 0, tile: -1 };
// ---- faan worked out by hand (codes: 1 self-drawn, 2 concealed on a discard, 3 all chows, 4 all pungs, 5 mixed one suit,
// 6 pure one suit, 7 dragon pungs, 8 seat wind, 9 round wind, 10 small three dragons, 11 big three dragons, 12 all honours,
// 13 thirteen orphans, 14 the last tile)
const base = M.start(rs());
const withHand = (hand, melds = []) => ({ ...base, wall: [1, 2, 3], seats: base.seats.map((s, i) => i === 0 ? { ...s, hand, melds } : s) });
const faan = res => [res[0], res[1].map(i => i.code + ":" + i.faan).sort().join(" ")];
const cases = [
  ["all chows, concealed, on a discard", [0, 1, 2, 3, 4, 5, 15, 16, 17, 19, 20, 21, 22, 22], [], false, "2:1 3:1"],
  ["pure dots, two pungs, drawn", [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 7, 7, 8, 8], [], true, "1:1 6:7"],
  ["thirteen orphans", [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33, 33], [], false, "13:13"],
  ["big three dragons, with dots: mixed one suit too", [0, 1, 2, 4, 4, 31, 31, 31, 32, 32, 32, 33, 33, 33], [], false, "11:5 2:1 5:3 7:3"],
  ["east wind pung for east in an east round, a shown pung", [3, 4, 5, 10, 11, 12, 20, 20, 27, 27, 27], [{ kind: 2, tile: 13, shown: true }], false, "8:1 9:1"],
  ["a chicken hand: no faan, still a win", [0, 1, 2, 3, 4, 5, 9, 9, 9, 20, 20], [{ kind: 1, tile: 24, shown: true }], false, ""],
  ["not a win", [0, 1, 2, 3, 4, 5, 9, 9, 9, 20, 21], [{ kind: 1, tile: 24, shown: true }], false, null],
];
for (const [name, hand, melds, self, want] of cases) {
  const [ok, got] = faan(M.win_of(withHand(hand, melds), 0, hand, self));
  if (want === null ? ok : !ok || got !== want) fail(`${name}: ${ok ? got : "no win"}, expected ${want === null ? "no win" : want}`);
}
console.log(`faan by hand: ${cases.length} hands checked`);
// ---- a winning hand, in JavaScript: a pair and sets, or thirteen orphans
const isSets = ts => { if (!ts.length) return true; const [t, ...rest] = ts;
  const i = rest.indexOf(t), j = i >= 0 ? rest.indexOf(t, i + 1) : -1;
  if (j >= 0) { const r2 = rest.filter((_, k) => k !== i && k !== j); if (isSets(r2)) return true; }
  if (t < 27 && t % 9 <= 6) { const a = rest.indexOf(t + 1), b = rest.indexOf(t + 2); if (a >= 0 && b >= 0) { const r2 = rest.filter((_, k) => k !== a && k !== b); if (isSets(r2)) return true; } }
  return false; };
const isWin = (ts, melds) => { ts = [...ts].sort((a, b) => a - b);
  const orph = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
  if (!melds.length && ts.length === 14 && ts.every(t => orph.includes(t)) && orph.every(t => ts.includes(t))) return true;
  for (const p of new Set(ts)) { const i = ts.indexOf(p); if (ts[i + 1] === p && isSets(ts.filter((_, k) => k !== i && k !== i + 1))) return true; }
  return false; };
const meldTiles = m => m.kind === 1 ? [m.tile, m.tile + 1, m.tile + 2] : Array(m.kind === 3 ? 4 : 3).fill(m.tile);
function check(g, where) {
  const n = Array(34).fill(0);
  for (const t of g.wall) n[t]++;
  g.seats.forEach(s => { for (const t of s.hand) n[t]++; for (const t of s.river) n[t]++; for (const m of s.melds) for (const t of meldTiles(m)) n[t]++; });
  if (n.some(k => k !== 4)) fail(`${where}: tiles not four of each: ${n.join("")}`);
  g.seats.forEach((s, i) => {
    const want = 13 - 3 * s.melds.length + (g.phase === 1 && g.turn === i ? 1 : 0) + (g.phase === 3 && g.winner === i ? 1 : 0);
    if (s.hand.length !== want) fail(`${where}: seat ${i} holds ${s.hand.length}, not ${want} (phase ${g.phase})`);
  });
}
// ---- hands at the table
let g = M.start(rs()); const tally = { wins: [0, 0, 0, 0], self: 0, discard: 0, empty: 0, chow: 0, pung: 0, kong: 0 }, ms = [];
let steps = 0;
for (let h = 0; h < HANDS; h++) {
  for (let k = 0; k < 400 && g.phase !== 3; k++) {
    const o = M.options(g);
    let a = NONE;
    if (h % 3 === 2) a = o.discard || o.win || o.pung || o.kong || o.chows.length || o.kongs.length ? { kind: 9, tile: -1 } : NONE;
    else if (o.discard) a = o.win ? { kind: 2, tile: -1 } : o.kongs.length && rnd() < 0.5 ? { kind: 3, tile: o.kongs[0] } : { kind: 1, tile: g.seats[0].hand[Math.floor(rnd() * g.seats[0].hand.length)] };
    else if (o.win) a = { kind: 8, tile: g.tile };
    else if (o.pung || o.kong || o.chows.length) a = o.pung && rnd() < 0.3 ? { kind: 6, tile: g.tile } : o.chows.length && rnd() < 0.2 ? { kind: 5, tile: o.chows[0] } : { kind: 4, tile: -1 };
    const t = performance.now(); const g2 = M.step(g, a); ms.push(performance.now() - t); steps++;
    if (JSON.stringify(g2) === JSON.stringify(g)) { fail(`hand ${h + 1} step ${k}: the table did not move (phase ${g.phase}, turn ${g.turn}, act ${JSON.stringify(a)})`); break; }
    g = g2; check(g, `hand ${h + 1} step ${k}`);
  }
  const e = g.events[0] || {};
  if (g.winner >= 0) {
    tally.wins[g.winner]++; e.what === 7 ? tally.self++ : tally.discard++;
    const w = g.seats[g.winner];
    if (!isWin(w.hand, w.melds)) fail(`hand ${h + 1}: seat ${g.winner} won with ${w.hand.join(",")} + ${w.melds.length} sets, not a winning hand`);
  } else tally.empty++;
  if (g.pays.reduce((a, b) => a + b, 0) !== 0) fail(`hand ${h + 1}: the points paid add to ${g.pays.reduce((a, b) => a + b, 0)}`);
  for (const ev of g.events) { if (ev.what === 3) tally.chow++; if (ev.what === 4) tally.pung++; if (ev.what === 5 || ev.what === 6) tally.kong++; }
  console.log(`hand ${h + 1}: ${g.winner >= 0 ? `seat ${g.winner} won ${e.what === 7 ? "by drawing" : "on a discard"}, ${g.items.map(i => i.code + ":" + i.faan).join(" ") || "no faan"}; paid ${g.pays.join(" ")}` : "the wall ran out"}; points ${g.seats.map(s => s.points).join(" ")}`);
  g = M.next_hand(g, rs()); check(g, `hand ${h + 2} dealt`);
}
ms.sort((a, b) => a - b);
console.log(`${HANDS} hands, ${steps} steps: wins by seat ${tally.wins.join(" ")} (${tally.self} drawn, ${tally.discard} on a discard), ${tally.empty} with the wall run out; in the last 24 events of each: chows ${tally.chow}, pungs ${tally.pung}, kongs ${tally.kong}; a step ${ms[ms.length >> 1].toFixed(0)} ms (median), the slowest ${ms[ms.length - 1].toFixed(0)}`);
