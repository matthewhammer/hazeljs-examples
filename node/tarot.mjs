// hazeljs-oracles, the Tarot in Node: the same Hazel modules as the page (tarot/rules/*.hz), run through hazeljs. It deals each
// spread, checks that a deal never repeats a card and that every card can come, and says what a deal costs.
//
//   npm install && npm run tarot
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../tarot/rules/" + path, import.meta.url), "utf8").replace(/\s+$/, "");
const MODULES = ["Deck", "Spreads", "Reading"];
const TAIL = "(deal = Reading.deal, deck = Deck.deck, size = Deck.size(Deck.deck))";
const spec = { preamble: read("preamble.hz"), modules: MODULES.map(name => ({ name, text: read(name + ".hz") })), tail: TAIL };
const t0 = performance.now();
const r = Hazel.runProgram(spec);
console.log("built:", r.ok, `${(performance.now() - t0).toFixed(0)} ms`, r.errors.map(e => `${e.module}: ${e.message.replace(/\s+/g, " ")}`));
if (!r.ok) process.exit(1);
const { deal, size } = r.value;
console.log("cards in the deck:", size);
let seed = 7; const draw = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const us = n => Array.from({ length: 2 * n }, draw);
// every spread, with how many cards it should have
const SPREADS = [[{ tag: "One" }, 1],
  [{ tag: "Three", value: { tag: "PastPresentFuture" } }, 3], [{ tag: "Three", value: { tag: "SituationChallengeAdvice" } }, 3],
  [{ tag: "Three", value: { tag: "MindBodySpirit" } }, 3], [{ tag: "CelticCross" }, 10], [{ tag: "Relationship" }, 6],
  [{ tag: "Choice", value: 2 }, 7], [{ tag: "Choice", value: 3 }, 10],
  [{ tag: "YearAhead", value: { start: 10, theme: true } }, 13], [{ tag: "YearAhead", value: { start: 0, theme: false } }, 12]];
for (const [s, n] of SPREADS) {
  const t1 = performance.now(), d = deal(s, us(20), true), ms = performance.now() - t1;
  console.log(`${JSON.stringify(s)}: ${d.length === n ? "ok" : "WRONG, " + d.length}, ${n} cards, ${ms.toFixed(0)} ms`);
  console.log("   " + d.map(c => `${c.position}: ${c.name}${c.reversed ? " (reversed)" : ""}`).join(" | "));
}
const seen = new Set(); let repeats = 0; const t1 = performance.now(), N = 20;
for (let i = 0; i < N; i++) {
  const d = deal({ tag: "CelticCross" }, us(10), true);
  const names = d.map(c => c.name); if (new Set(names).size !== names.length) repeats++;
  names.forEach(n => seen.add(n));
}
console.log(`${N} Celtic Crosses: ${repeats} with a card twice; ${seen.size} different cards came; ${((performance.now() - t1) / N).toFixed(1)} ms a deal`);
