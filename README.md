# hazeljs-oracles

**▶ Try it at https://matthewhammer.org/hazeljs-oracles/** (the [I Ching](https://matthewhammer.org/hazeljs-oracles/i-ching/), the [Tarot](https://matthewhammer.org/hazeljs-oracles/tarot/), [astrology](https://matthewhammer.org/hazeljs-oracles/astrology/))

**Ancient oracles whose core logic is written in [Hazel](https://hazel.org) and run by [hazeljs](https://www.npmjs.com/package/hazeljs).** Each oracle is its own app, on its own page: the reading on one side, revealed a step at a time, and on the other the Hazel program that makes it, in Hazel's own editor. The page passes the program random numbers, or a birth's time and place, and draws what it answers; edit the program and the page builds it again. While it has an error or a hole, the I Ching's and the Tarot's own JavaScript answers instead, and the page says which did (astrology has no such fallback: its sky is Hazel's alone).

It is the third example app for `hazeljs`, after [Messed Up Dress Up](https://matthewhammer.org/kids-choice-games/dress-up/) and [hazeljs-petri-example](https://github.com/matthewhammer/hazeljs-petri-example).

> **Experimental.** `hazeljs` is a 0.0.x prototype, and Hazel's tile editor comes from a branch build of Hazel.

## The oracles

| Oracle | Page | What Hazel does |
|---|---|---|
| I Ching | `i-ching/` | Casts each line, by three coins or by dividing the yarrow stalks; names the trigrams and the hexagram (King Wen order); finds the changing lines and the hexagram they turn it into. |
| Tarot | `tarot/` | Holds the 78 cards and their names; deals a spread from random numbers, upright or reversed, and says what each place speaks to. The spreads: one card; three (past, present, future; situation, challenge, advice; mind, body, spirit); the Celtic Cross; a relationship; a choice between paths; the year ahead. |
| Astrology | `astrology/` | Places the Sun, the Moon and the planets at a birth and today, from Meeus's and Schlyter's formulas; finds the rising sign, the midheaven and the houses (whole signs); the aspects among the birth's planets, and today's to them; lays out the wheel; and reads it all in short sentences. It starts with its own birth chart: its first commit, at 40.046313° N, 105.286695° W. |

## Run it

The pages need to be served over http, from `localhost` (Hazel's editor frames take messages only from a few sites, `localhost` among them):

```sh
git clone --recurse-submodules https://github.com/matthewhammer/hazeljs-oracles
cd hazeljs-oracles
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open http://localhost:8000/. The pages load `hazeljs` from npm through jsDelivr, so nothing needs installing for them. The Tarot's woodcut faces are a git submodule (`tarot/woodcut`); in a clone made without `--recurse-submodules`, `git submodule update --init` fetches them.

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
| `tarot/index.html`, `tarot/app.js` | The Tarot's page: the table, cards turned one at a time, with a choice of faces: simple ones drawn by the page, or the woodcut deck, in black and white or in color. |
| `tarot/woodcut/` | A git submodule, not a copy: [Woodcut tarot](https://github.com/SONDLecT/woodcut-tarot) (CC0), the 78 cards in SVG traced from the Jean Noblet tarot (Paris, c. 1650), by way of our fork, [matthewhammer/woodcut-tarot](https://github.com/matthewhammer/woodcut-tarot), pinned to one commit. GitHub Pages fetches it when it publishes the site. The page loads a card's file when the card is turned: `cards/` (black and white, 34 to 78 kB a card as served) or `colori/` (the deck's stencil colours, 300 to 420 kB). |
| `astrology/rules/*.hz` | Astrology, work in progress (ticket 768): its vocabulary (`preamble.hz`), the signs (`Zodiac.hz`: elements, modalities, rulers), aspects (`Aspects.hz`: orbs; a chart's own and today's transits), and the chart (`Chart.hz`: the Julian day, sidereal time, ascendant, midheaven, houses, after Meeus). Then the sky, in six small modules (`Orbit`, `MoonOrbit`, `Planets`, `Outer`, `PlutoOrbit`, `Sky`): the Sun, Moon and planets as seen from the Earth, from astronomia's tables (MIT; made by `tools/make-sky-tables.py`) and, for Jupiter to Neptune, Paul Schlyter's elements and perturbations; each within 0.11 degrees of Astronomy Engine from 1900 to 2100. Long float literals are written as ratios of whole numbers (`tools/long-floats.py`) until hazelgrove/hazel#2831. Then the wheel as data (`Wheel.hz`: where each glyph and line goes) and the reading (`Reading.hz`: the words, and `Reading.reading(birth, place, today)`, which the page asks for). `npm run astrology` checks the chart and the bodies against Astronomy Engine, and casts a reading. |
| `astrology/index.html`, `astrology/app.js` | Astrology's page: a birth's date, time and place (a city, or a latitude, longitude and time zone, turned to UTC by the browser's own time zones), the wheel and the reading. By default (since 0.0.16) it casts through `astrology/compiled.js`, the rules compiled ahead of time by hazel-jit (`tools/make-compiled.py`), as the I Ching and the Tarot do through theirs; with `?interpreted=1`, or once the rules are edited, it writes the birth into the program's last line and builds the program with hazeljs for each chart, as an answer that is a function grows past gigabytes in hazeljs 0.0.4 (hazelgrove/hazel#2832). `astrology/thumb.svg`, the front page's picture, is the app's own chart, made by `tools/astrology-thumb.mjs`. |
| `astrology/glyphs.svg` | The signs', bodies' and aspects' glyphs, drawn in simple strokes (`glyphs.html` shows them). |
| `tarot/meanings/*.json` | Where each card's meaning is on other sites, one map per site (Biddy Tarot, Brigit Esselmont; Labyrinthos, Tina Gong), keyed by our card ids. |
| `shared/` | What the pages share: Hazel's listings as editors (`hazel-listings.js`, from hazeljs-petri-example), each oracle's 🕰 history of readings in the browser's local storage, with notes and an emoji on each (`history.js`), the divider between the code and the reading (`divider.js`), full screen, with its two dividers (`fullscreen.js`), and the styles. |
| `node/i-ching.mjs`, `node/tarot.mjs`, `node/astrology.mjs` | Each oracle in Node (`npm run i-ching`, `npm run tarot`, `npm run astrology`). |

## Things to know

- **The yarrow stalks' odds are the procedure's.** The books give 1/16, 5/16, 7/16 and 3/16 for 6, 7, 8 and 9, which holds when each heap is as likely to leave 1, 2, 3 or 4 stalks. Here each split falls anywhere along the heap, as a hand's might, and a heap leaves 4 a little less often, so 6 comes about 1 time in 20 rather than 1 in 16 (`npm run i-ching` counts them).
- **A Tarot deal costs about 20 ms a card** in Node (0.18 s for the Celtic Cross's ten), each card taken from a list of up to 78 in one walk. Measuring the deck and walking it twice a card, as the first draft did, cost 50 ms a card.
- **The woodcut deck is a Marseille deck.** It numbers Justice VIII and Strength XI, where Waite's order, which the deck's names here follow, has Strength 8 and Justice 11, so the page finds each card's file by its name, not its number; its Pope is our Hierophant, its Coins our Pentacles, and its Two to Ten of each suit show the suit's signs rather than a scene.
- **Links, not text, for meanings.** The I Ching links to Cafe au Soul's reading of the six lines, and each Tarot card to Brigit Esselmont's and Tina Gong's meanings; the pages are theirs, with ads. We copy none of their text.
- **From JS, a constructor takes one value or a labeled tuple, not a plain tuple.** hazeljs 0.0.4 cannot match `{tag: "YearAhead", value: [10, true]}` against `YearAhead(m, t)`, so the year ahead takes `(start = Int, theme = Bool)`.
- **Hazel answers in about a millisecond a cast** in Node (coins 0.35 ms, yarrow 1.1 ms on a laptop), and builds the program in about half a second.

## Licences

Copyright 2026 Matthew Hammer. The code (the `.js`, `.mjs`, `.html`, `.css`, `.json` and `.hz` files) is under the [Apache License 2.0](LICENSE); everything else (the `.md` files) under [Creative Commons Attribution 4.0](LICENSE-CC-BY-4.0). The woodcut cards (`tarot/woodcut`, a submodule) are not ours: they are CC0, in the public domain. See [NOTICE](NOTICE).
