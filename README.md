# hazeljs-examples: Hazel activities

**▶ Try it at https://matthewhammer.org/hazeljs-examples/**: the ancient oracles (the [I Ching](https://matthewhammer.org/hazeljs-examples/i-ching/), the [Tarot](https://matthewhammer.org/hazeljs-examples/tarot/), [astrology](https://matthewhammer.org/hazeljs-examples/astrology/)) and one-player games. The old address, https://matthewhammer.org/hazeljs-oracles/, sends each page to its new one.

**Small apps whose rules are written in [Hazel](https://hazel.org) and run by [hazeljs](https://www.npmjs.com/package/hazeljs): ancient oracles, and one-player games.** Each is its own app, on its own page: the reading on one side, revealed a step at a time, and on the other the Hazel program that makes it, in Hazel's own editor. The page passes the program random numbers, or a birth's time and place, and draws what it answers; edit the program and the page builds it again. While it has an error or a hole, the I Ching's and the Tarot's own JavaScript answers instead, and the page says which did (astrology has no such fallback: its sky is Hazel's alone).

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
git clone --recurse-submodules https://github.com/matthewhammer/hazeljs-examples
cd hazeljs-examples
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
| `astrology/index.html`, `astrology/app.js` | Astrology's page: a birth's date, time and place (a city, or a latitude, longitude and time zone, turned to UTC by the browser's own time zones), the moment of today's sky (now, following the clock, unless another date and time are chosen; since 0.0.23), the wheel and the reading. By default (since 0.0.16) it casts through `astrology/compiled.js`, the rules compiled ahead of time by hazel-jit (`tools/make-compiled.py`), as the I Ching and the Tarot do through theirs; with `?interpreted=1`, or once the rules are edited, it writes the birth into the program's last line and builds the program with hazeljs for each chart, as an answer that is a function grows past gigabytes in hazeljs 0.0.4 (hazelgrove/hazel#2832). Its 🕰 history keeps charts only while “remember these on this device” is ticked (since 0.0.17). Births can be saved under names, in the browser's local storage (since 0.0.22); a birth remembered before then becomes the chart named “default”. `astrology/thumb.svg`, the front page's picture, is the app's own chart, made by `tools/astrology-thumb.mjs`. |
| `astrology/glyphs.svg` | The signs', bodies' and aspects' glyphs, drawn in simple strokes (`glyphs.html` shows them). |
| `astrology/constellations.svg` | The twelve zodiac constellations as star figures, for a sign's tooltip (`constellations.html` shows them), made by `tools/make-constellations.mjs` from ConstellationLines (Marc van der Sluys, CC BY 4.0) and the Yale Bright Star Catalogue. |
| `tarot/meanings/*.json` | Where each card's meaning is on other sites, one map per site (Biddy Tarot, Brigit Esselmont; Labyrinthos, Tina Gong), keyed by our card ids. |
| `shared/` | What the pages share: Hazel's listings as editors (`hazel-listings.js`, from hazeljs-petri-example), each oracle's 🕰 history of readings in the browser's local storage, with notes and an emoji on each (`history.js`), the divider between the code and the reading (`divider.js`), full screen, with its two dividers, the left column put away on a landscape screen, and an app's own buttons under ☰ (`fullscreen.js`), and the styles. |
| `solitaire/rules/*.hz` | Solitaire (Klondike) in Hazel: its vocabulary (`preamble.hz`: a card, a pile, the game, a move), the deck (`Cards.hz`), the deal (`Deal.hz`: the deck shuffled by the page's random numbers into seven piles and the stock), and the moves (`Moves.hz`: every legal move, the moves from one place, a move made, the win). The page calls `(deal, moves, moves_from, apply, won)`: a game is a value, (game, move) -> game, the shape a livelit for the game will want. |
| `solitaire/index.html`, `solitaire/app.js` | Solitaire's page: the table, a tap moving a card where Hazel says it first fits, a drag where you choose, undo, a hint, and finishing; the game kept on this device. |
| `solitaire/cards/`, `solitaire/backs.js` | The 52 faces, Adrian Kennard's (CC0); the backs, drawn by `backs.js`: thirteen designs, each the same either way up, in five colour themes, chosen under ⚙️ Advanced. |
| `minesweeper/rules/*.hz` | Minesweeper in Hazel: its vocabulary (`preamble.hz`: a cell, a game), the board (`Board.hz`: a fresh board, the mines laid after the first tap by selection sampling, never in its 3 by 3, and each cell's count, by three rows walked side by side), and play (`Play.hz`: a cell opened, an empty region flooding open by sweeps along the rows, turning the board between them, flags, chords, the end), and the 💡 hint (`Hint.hz`: a sure move from the open numbers alone, a safe cell, a mine to flag or a flag on a safe cell, and the number that shows it; the board read once, three rows walked side by side). The page calls `(fresh, lay, reveal, flag, chord, flags, sure)`. |
| `minesweeper/index.html`, `minesweeper/app.js` | Minesweeper's page: three boards, a tap to open, a right click, a long press or 🚩 mode to flag, a number tapped to open around it, 💡 a hint (the cell outlined, the number that shows it dashed, and why, in words), the mine counter and the clock, best times kept on this device. |
| `go/rules/*.hz` | Go in Hazel, as one module (in hazeljs a call into another module costs the build seconds): its vocabulary (`preamble.hz`: a game, a score), and `Go.hz`: the board (a group of stones and its liberties), a move (the stones it takes, never one that leaves its own stones without a liberty, the ko), a pass, Tromp and Taylor's area score, and the opponent: every empty point tried, each worth what it takes, saves, threatens and risks, its liberties and its distance from the edge, with the board's groups traced once a turn. The page calls `(fresh, play, pass, score, choose)`. |
| `go/index.html`, `go/app.js` | Go's page: 7 by 7 or 9 by 9, you black and Hazel white, a move refused with its reason (a stone there, the ko, no liberty), passes, ↶ undo, the score with who owns each empty point, wins kept on this device. |
| `sw.js`, `shared/offline.js` | Each oracle with no connection: the service worker saves every app's own files when it installs, and each file a page fetches after, answering from them when there is no network; `offline.js` installs it and keeps the browser's install prompt, and each minute asks `version.json` whether a newer version is out, offering it in a card at the top of the page (as Messed Up Dress Up does). Under ⚙️ Advanced, 📲 says whether this device holds the app, and how to put its icon on the device. |
| `*/manifest.webmanifest`, `*/icons/` | Each oracle as an app of its own: its name, colors and icon (an SVG, drawn by hand, and PNGs made from it with ffmpeg), for a home screen or a computer's apps. |
| `node/i-ching.mjs`, `node/tarot.mjs`, `node/astrology.mjs`, `node/solitaire.mjs`, `node/minesweeper.mjs`, `node/minesweeper-hint.mjs`, `node/go.mjs` | Each oracle in Node (`npm run i-ching`, `npm run tarot`, `npm run astrology`); each game too (`npm run solitaire`, `npm run minesweeper`, `npm run minesweeper-hint`, which plays boards by hints alone and checks each hint against the mines, and `npm run go`, which plays Hazel against random moves and checks every position). |

## Things to know

- **The yarrow stalks' odds are the procedure's.** The books give 1/16, 5/16, 7/16 and 3/16 for 6, 7, 8 and 9, which holds when each heap is as likely to leave 1, 2, 3 or 4 stalks. Here each split falls anywhere along the heap, as a hand's might, and a heap leaves 4 a little less often, so 6 comes about 1 time in 20 rather than 1 in 16 (`npm run i-ching` counts them).
- **A Tarot deal costs about 20 ms a card** in Node (0.18 s for the Celtic Cross's ten), each card taken from a list of up to 78 in one walk. Measuring the deck and walking it twice a card, as the first draft did, cost 50 ms a card.
- **The woodcut deck is a Marseille deck.** It numbers Justice VIII and Strength XI, where Waite's order, which the deck's names here follow, has Strength 8 and Justice 11, so the page finds each card's file by its name, not its number; its Pope is our Hierophant, its Coins our Pentacles, and its Two to Ten of each suit show the suit's signs rather than a scene.
- **Links, not text, for meanings.** The I Ching links to Cafe au Soul's reading of the six lines, and each Tarot card to Brigit Esselmont's and Tina Gong's meanings; the pages are theirs, with ads. We copy none of their text.
- **From JS, a constructor takes one value or a labeled tuple, not a plain tuple.** hazeljs 0.0.4 cannot match `{tag: "YearAhead", value: [10, true]}` against `YearAhead(m, t)`, so the year ahead takes `(start = Int, theme = Bool)`.
- **Hazel answers in about a millisecond a cast** in Node (coins 0.35 ms, yarrow 1.1 ms on a laptop), and builds the program in about half a second.

## Licences

Copyright 2026 Matthew Hammer. The code (the `.js`, `.mjs`, `.html`, `.css`, `.json` and `.hz` files) is under the [Apache License 2.0](LICENSE); everything else (the `.md` files) under [Creative Commons Attribution 4.0](LICENSE-CC-BY-4.0). The woodcut cards (`tarot/woodcut`, a submodule) are not ours: they are CC0, in the public domain. See [NOTICE](NOTICE).
