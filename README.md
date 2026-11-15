# hazeljs-oracles

**▶ Try it at https://matthewhammer.org/hazeljs-oracles/** (the [I Ching](https://matthewhammer.org/hazeljs-oracles/i-ching/), the [Tarot](https://matthewhammer.org/hazeljs-oracles/tarot/))

**Ancient oracles whose core logic is written in [Hazel](https://hazel.org) and run by [hazeljs](https://www.npmjs.com/package/hazeljs).** Each oracle is its own app, on its own page: the reading on one side, revealed a step at a time, and on the other the Hazel program that makes it, in Hazel's own editor. The page passes the program random numbers and draws what it answers; edit the program and the page builds it again. While it has an error or a hole, the page's own JavaScript answers instead, and the page says which did.

It is the third example app for `hazeljs`, after [Messed Up Dress Up](https://matthewhammer.org/kids-choice-games/dress-up/) and [hazeljs-petri-example](https://github.com/matthewhammer/hazeljs-petri-example).

> **Experimental.** `hazeljs` is a 0.0.x prototype, and Hazel's tile editor comes from a branch build of Hazel.

## The oracles

| Oracle | Page | What Hazel does |
|---|---|---|
| I Ching | `i-ching/` | Casts each line, by three coins or by dividing the yarrow stalks; names the trigrams and the hexagram (King Wen order); finds the changing lines and the hexagram they turn it into. |
| Tarot | `tarot/` | Holds the 78 cards and their names; deals a spread from random numbers, upright or reversed, and says what each place speaks to. The spreads: one card; three (past, present, future; situation, challenge, advice; mind, body, spirit); the Celtic Cross; a relationship; a choice between paths; the year ahead. |

## Run it

The pages need to be served over http, from `localhost` (Hazel's editor frames take messages only from a few sites, `localhost` among them):

```sh
git clone https://github.com/matthewhammer/hazeljs-oracles
cd hazeljs-oracles
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open http://localhost:8000/. The pages load `hazeljs` from npm through jsDelivr, so nothing needs installing for them.

The I Ching in Node, with the odds of each line by each method and what a cast costs:

```sh
npm install
npm run i-ching
```

## What is where

| File | What it is |
|---|---|
| `index.html` | The series' front page. |
| `i-ching/rules/preamble.hz` | The I Ching's vocabulary: a method (`Coins`, `Yarrow`), a line (`OldYin`, `YoungYang`, `YoungYin`, `OldYang`), a cast, a trigram, a hexagram, a reading. |
| `i-ching/rules/Lines.hz` | A line's value, which lines change, and what each turns into. |
| `i-ching/rules/Casting.hz` | Three coins, or three divisions of the 49 yarrow stalks. |
| `i-ching/rules/Book.hz` | The eight trigrams, the King Wen table, the 64 names. |
| `i-ching/rules/Reading.hz` | The reading so far, from the lines cast. |
| `i-ching/index.html`, `i-ching/app.js` | The I Ching's page: the reading, the listings, hazeljs building the program, and the page's own JS for while it does not build. |
| `tarot/rules/*.hz` | The Tarot: its vocabulary (`preamble.hz`), the deck (`Deck.hz`), the spreads' places (`Spreads.hz`), the deal (`Reading.hz`). |
| `tarot/index.html`, `tarot/app.js` | The Tarot's page: the table, cards turned one at a time, simple faces drawn by the page for now. |
| `tarot/meanings/*.json` | Where each card's meaning is on other sites, one map per site (Biddy Tarot, Brigit Esselmont; Labyrinthos, Tina Gong), keyed by our card ids. |
| `shared/` | What the pages share: Hazel's listings as editors (`hazel-listings.js`, from hazeljs-petri-example), each oracle's 🕰 history of readings in the browser's local storage (`history.js`), the divider between the code and the reading (`divider.js`), and the styles. |
| `node/i-ching.mjs`, `node/tarot.mjs` | Each oracle in Node (`npm run i-ching`, `npm run tarot`). |

## Things to know

- **The yarrow stalks' odds are the procedure's.** The books give 1/16, 5/16, 7/16 and 3/16 for 6, 7, 8 and 9, which holds when each heap is as likely to leave 1, 2, 3 or 4 stalks. Here each split falls anywhere along the heap, as a hand's might, and a heap leaves 4 a little less often, so 6 comes about 1 time in 20 rather than 1 in 16 (`npm run i-ching` counts them).
- **A Tarot deal costs about 20 ms a card** in Node (0.18 s for the Celtic Cross's ten), each card taken from a list of up to 78 in one walk. Measuring the deck and walking it twice a card, as the first draft did, cost 50 ms a card.
- **Links, not text, for meanings.** The I Ching links to Cafe au Soul's reading of the six lines, and each Tarot card to Brigit Esselmont's and Tina Gong's meanings; the pages are theirs, with ads. We copy none of their text.
- **From JS, a constructor takes one value or a labeled tuple, not a plain tuple.** hazeljs 0.0.4 cannot match `{tag: "YearAhead", value: [10, true]}` against `YearAhead(m, t)`, so the year ahead takes `(start = Int, theme = Bool)`.
- **Hazel answers in about a millisecond a cast** in Node (coins 0.35 ms, yarrow 1.1 ms on a laptop), and builds the program in about half a second.

## Licences

Copyright 2026 Matthew Hammer. The code (the `.js`, `.mjs`, `.html`, `.css`, `.json` and `.hz` files) is under the [Apache License 2.0](LICENSE); everything else (the `.md` files) under [Creative Commons Attribution 4.0](LICENSE-CC-BY-4.0). See [NOTICE](NOTICE).
