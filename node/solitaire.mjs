// hazeljs-examples, Solitaire in Node: the same Hazel modules as the page (solitaire/rules/*.hz), run through hazeljs. It
// deals, lists the legal moves, plays random legal moves, and checks that no card is lost or doubled, that every move it
// is offered changes the game, and what the calls cost.
//
//   npm install && npm run solitaire
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../solitaire/rules/" + path, import.meta.url), "utf8").replace(/\s+$/, "");
const MODULES = ["Cards", "Deal", "Moves"];
const TAIL = "(deal = Deal.deal, moves = Moves.moves, apply = Moves.apply, won = Moves.won, name = Cards.name, can = Moves.can, moves_from = Moves.moves_from)";
const spec = { preamble: read("preamble.hz"), modules: MODULES.map(name => ({ name, text: read(name + ".hz") })), tail: TAIL };
const t0 = performance.now();
const r = Hazel.runProgram(spec);
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, r.errors.map(e => `${e.module}: ${e.message.replace(/\s+/g, " ")}`));
if (!r.ok) process.exit(1);
const { deal, moves, apply, won, name, can, moves_from } = r.value;
let seed = Number(process.argv[2] || 7); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const key = c => `${c.suit.tag}${c.rank}`;
const all = g => [...g.stock, ...g.waste, ...g.foundations.flat(), ...g.piles.flatMap(p => [...p.down, ...p.up])];
const check = (g, when) => { const ks = all(g).map(key); if (ks.length !== 52 || new Set(ks).size !== 52) throw new Error(`${when}: ${ks.length} cards, ${new Set(ks).size} distinct`); };
const show = m => m.tag === "Shift" ? `Shift(${m.value.from.tag}${m.value.from.value !== undefined ? JSON.stringify(m.value.from.value) : ""} -> ${m.value.to.tag}${m.value.to.value !== undefined ? m.value.to.value : ""})` : m.tag;
const times = { deal: [], moves: [], apply: [] };
const time = (k, f) => { const t = performance.now(); const v = f(); times[k].push(performance.now() - t); return v; };
let g = time("deal", () => deal(Array.from({ length: 52 }, rnd), 1));
check(g, "deal");
console.log("piles:", g.piles.map(p => `${p.down.length}+${p.up.length} ${p.up.map(c => name(c)).join(",")}`).join(" | "), "| stock", g.stock.length);
let ms = time("moves", () => moves(g));
console.log("first moves:", ms.map(show).join(" "));
let steps = 0, found = 0;
for (; steps < Number(process.argv[3] || 200); steps++) {
  ms = time("moves", () => moves(g));
  if (!ms.length) break;
  // prefer a move to a foundation, else any move, so the game tends to progress
  const toF = ms.filter(m => m.tag === "Shift" && m.value.to.tag === "ToFoundation");
  const m = toF.length ? toF[0] : ms[Math.floor(rnd() * ms.length)];
  // every 25 steps: each move offered passes the move's own check (can), as apply uses it
  if (steps % 25 === 0) { const bad = ms.filter(x => !can(g, x)); if (bad.length) throw new Error(`step ${steps}: offered but not allowed: ${bad.map(show).join(" ")}`); }
  // and the moves from one place are the same as those of every move that start there
  if (steps % 25 === 0 && m.tag === "Shift") {
    const t = performance.now(); const here = moves_from(g, m.value.from); times.from = (times.from || []).concat(performance.now() - t);
    const want = ms.filter(x => x.tag === "Shift" && JSON.stringify(x.value.from) === JSON.stringify(m.value.from)).map(show).sort();
    const got = here.map(show).sort();
    if (JSON.stringify(want) !== JSON.stringify(got)) throw new Error(`step ${steps}: moves_from ${JSON.stringify(m.value.from)} gave ${got} but moves gave ${want}`);
  }
  const before = JSON.stringify(g);
  g = time("apply", () => apply(g, m));
  check(g, `step ${steps}, ${show(m)}`);
  if (JSON.stringify(g) === before) throw new Error(`step ${steps}: ${show(m)} changed nothing`);
  if (won(g)) { console.log("won at step", steps); break; }
}
found = g.foundations.reduce((n, f) => n + f.length, 0);
const med = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)].toFixed(1) : "-"; };
console.log(`${steps} steps; ${found} cards on the foundations; won: ${won(g)}; an illegal move leaves the game as it was: ${JSON.stringify(apply(g, { tag: "Shift", value: { from: { tag: "FromFoundation", value: 9 }, to: { tag: "ToPile", value: 0 } } })) === JSON.stringify(g)}`);
console.log(`median ms: deal ${med(times.deal)}, moves ${med(times.moves)}, apply ${med(times.apply)}, moves_from ${med(times.from || [])}`);
