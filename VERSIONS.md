# hazeljs-oracles: versions

Each version lists what the apps do as of that version. The newest version is first.

## Unreleased

## 0.0.14 (2026-11-17)

Everything in 0.0.13, plus:

- **The Tarot's cards can be woodcuts.** A new **Faces** choice beside the spread: the simple faces as before; the woodcut deck in black and white; or the woodcut deck in its own stencil colors. The deck is [Woodcut tarot](https://github.com/SONDLecT/woodcut-tarot), the 78 cards traced in SVG from the Jean Noblet tarot (Paris, about 1650), the oldest Tarot de Marseille that survives, and dedicated to the public domain (CC0). It is a git submodule of this repository, by way of our fork, not a copy. A card's picture loads when the card is turned: about 50 kB in black and white, about 350 kB in color. A face-down card shows the deck's own back, a reversed card is turned over, and the choice is remembered on the device. A Marseille deck numbers Justice VIII and Strength XI, the other way from Waite's order, which the cards' names here follow; the credit under the table says so.
- **One button for the code: text or Hazel's editor.** In both oracles, **Edit in Hazel**, above the first listing, opens every listing in Hazel's editor, and **Show as text** goes back to the text, showing your edits; the editors stay loaded behind it, so switching again is quick. It replaces the button on each listing. The pages still start with the text, and Hazel's editors load only when asked.
- **The text is highlighted**, near the colors Hazel's editor uses: keywords, types and constructors, strings, numbers and comments, in light and dark.
- **The front page is shorter.** Each oracle is one phrase, under a new picture: the eight trigrams around the taijitu for the I Ching (`i-ching/bagua.svg`), and the woodcut deck's back for the Tarot.

## 0.0.13 (2026-11-16)

Everything in 0.0.12, plus:

- **Both oracles run compiled by default.** The I Ching and now the Tarot cast, read and deal through `compiled.js`, their rules compiled ahead of time to JavaScript by hazel-jit, without loading hazeljs or building the program; hazeljs loads only when the rules are edited, and runs them as before. To interpret instead, open a page with `?interpreted=1`, or use the link under ⚙️ Advanced. On an older Android phone (Firefox), the I Ching compiled was ready to cast at 0.8 s instead of 3.7 s, and a reading took under a millisecond instead of 86 to 113 ms. The Tarot's `compiled.js` is checked against hazeljs on every spread, the year ahead from each month with and without its theme, 100 shuffles each, with reversals and without (`npm run compare-compiled`).

## 0.0.12 (2026-11-16)

Everything in 0.0.11, plus:

- **The compiled I Ching says when it could not run compiled.** An older Android phone's lines asked for compiled came back interpreted, with nothing to say why. Now, when `?compiled` is asked for and `compiled.js` does not load, or throws, or gives nothing, the status line says so with the error, and so does the speed line (and its data, under `mode`). The link under ⚙️ Advanced opens `?compiled=1`.

## 0.0.11 (2026-11-16)

Everything in 0.0.10, plus:

- **A prototype: the I Ching compiled ahead of time.** Open it with `?compiled` in its address (https://matthewhammer.org/hazeljs-oracles/i-ching/?compiled), or by the link under ⚙️ Advanced. Its rules, the same Hazel, are compiled to JavaScript by hazel-jit, Hazel's prototype compiler, when the site is made, into `i-ching/compiled.js` (33 kB): the page casts and reads through it, without loading hazeljs (2.8 MB) or building the program, and each line says "compiled Hazel". Editing the rules loads Hazel and runs them as before. Checked against hazeljs on 8,102 answers (every set of six lines with every pattern of changing lines, the readings of fewer lines, 4,000 casts), none different; in Node a cast is about 500 times faster and a reading about 3,000 times (`node/compare-compiled.mjs`). Made by `tools/make-compiled.py` from the compiled program a test prints on hazelgrove/hazel's branch `trial/765-iching-aot`. Compiling it found a bug in hazel-jit, now fixed there: a label or a module's member named `length` (as `Lines.length` is) broke every compiled call.

## 0.0.10 (2026-11-16)

Everything in 0.0.9, plus:

- **The I Ching reads faster.** Its first speed line, from an older Android phone in Firefox: Hazel ready 3.7 s after the page opened, the program built in 2.9 s, a cast 3 ms by coins and 9 ms by yarrow, a reading 113 ms, and the reading drawn 149 ms to the next frame; a key press in the question, one frame (17 ms), with the editors closed since 0.0.8. The same work on a laptop is about five times faster. Two changes:
  - Every function in its Hazel (`Lines.hz`, `Casting.hz`, `Book.hz`, `Reading.hz`) declares its whole type, and Book's two lists theirs, as the Tarot's did in 0.0.7: a reading 20 ms in Node and 13 ms now, the build 600 ms and 480. The odds, the 64 numbers and the known hexagrams are checked as before.
  - The page asks Hazel for the reading once for each set of lines cast, not at every redraw.

## 0.0.9 (2026-11-16)

Everything in 0.0.8, plus:

- **⚙️ Advanced, at the foot of each oracle,** as Messed Up Dress Up has it: the version, every version's notes (these), and **🧪 measure this device's speed**. The measurement does the same work on every device: it reads the page's own load (when Hazel's library ran, how long the program took to build), times the oracle's calls into Hazel (the I Ching: 30 casts by coins, 30 by yarrow, 20 readings; the Tarot: a deal of each of its ten spreads), drawing the reading, key presses in the I Ching's question box, and two seconds idle (frames a second, the longest pause); then it leaves the page as it was. It writes one line to copy, ending with its numbers as data, and links a shared page to paste it into (Riseup's public Etherpad, the one Dress Up's speed lines go to), so two devices can be compared: an older phone against a laptop, say.

## 0.0.8 (2026-11-16)

Everything in 0.0.7, plus:

- **Hazel's editor opens only when you ask for it.** Each listing of the rules is its text, with an **Open in Hazel's editor** button; the editor loads there when pressed (and in a listing a go to definition leads to). Hazel still casts and deals from the text as before. Until now each page opened Hazel's editor in every listing as it loaded: five on the I Ching's page, four on the Tarot's. Each one is a whole Hazel app, about 7 MB of JavaScript and some 50 MB of memory, which made both oracles painfully slow on an older Android phone in Firefox, a key press in the question included. The page now starts with none of them: on a laptop, 28 MB of memory for the I Ching's page with Hazel ready to cast.

## 0.0.7 (2026-11-15)

Everything in 0.0.6, plus:

- **The Tarot deals about three and a half times faster.** Every function in its Hazel (`Deck.hz`, `Spreads.hz`, `Reading.hz`) now declares its whole type, what it returns as well as what it takes: `let take : ([Card], Int) -> (Card, [Card]) = fun (cs, k) -> ...`, where before only `(cs, k) : ([Card], Int)` was declared. Hazel leaves a result type that is not declared unknown, and checks a value against an unknown type as the program runs: at every return, and again on every walk down a list built that way (the deck, made by `cat`, `majors_from` and `suit_from`, was slow to walk for that reason). Declared, those checks go. A Celtic Cross took 173 ms in Node and takes 46 (70 in the browser); the year ahead, 296 and now 86. The deal is the same deal: every spread checked, no card twice.

## 0.0.6 (2026-11-15)

Everything in 0.0.5, plus:

- **The I Ching asks your question first.** At the top of the reading, an optional question or statement; left blank, the reading is "relating to here/now". It shows under the reading's heading as you type, is fixed once the six lines are cast, and is kept with the reading in 🕰 History, where it leads the reading's line. A past reading opens with its own question; **New reading** gives back what you had typed.

## 0.0.5 (2026-11-15)

Everything in 0.0.4, plus:

- **A divider between the code and the reading**, in two-column mode, on both oracles: drag it to give either more room, or use the arrow keys on it; a double-click puts it back. Its place is kept in this browser as a share of the width, for each oracle's page. Each column keeps room for its controls (the code at least 280 px, the reading 300). In one column there is none, and the reading comes first.

## 0.0.4 (2026-11-15)

Everything in 0.0.3, plus:

- **Each Tarot card links to its meaning by two modern authors:** Brigit Esselmont's on Biddy Tarot, and Tina Gong's on Labyrinthos. The links sit beside each turned card ("Its meaning, reversed, by …" when it is reversed), open in a new tab, and are said plainly to be other sites, with ads. One map per site (`tarot/meanings/*.json`), from each site's own index of its 78 card pages, every one checked.

## 0.0.3 (2026-11-15)

Everything in 0.0.2, plus:

- **The code on the left, the reading on the right**, when the window is wide enough for two columns; the reading stays in view while the code scrolls past, and scrolls within itself when it is taller than the window. In one column, the reading comes first and the code below it.
- **On a phone,** every spread fits across the screen: the cards are smaller, and the Celtic Cross drops the empty column between the cross and the staff.
- **A yang line is one bar,** without the hairline where its two halves met.

## 0.0.2 (2026-11-15)

Everything in 0.0.1, plus the first public release, at https://matthewhammer.org/hazeljs-oracles/ :

- **Every spread on the list**, chosen from one menu, each with a line on what it is for: one card; three cards read three ways (past, present, future; situation, challenge, advice; mind, body, spirit); the Celtic Cross; a relationship (you, the other, the bond, its strength, its tension, a way forward); a choice between two or three paths (the crossroads, then each path's opportunity, difficulty and direction); the year ahead (a card for each month from this one, with or without a card for the year). Each spread is laid out in its own shape: the choice as columns, one per path; the year as a ring of months with the year's card in the middle. Hazel builds the places that vary (a group of three for each path, a month for each card from this one).
- **🕰 History, on each oracle's page.** Each reading is kept in this browser (local storage), each oracle's apart: the I Ching's once its six lines are cast, the Tarot's as it is dealt. The panel lists them newest first, with when and what came (the hexagram and the one it changes to, and how it was cast; the spread and its cards). Open one and it is shown as the reading just made, under its own heading, "Reading from" its date and time, with **New reading** beside it; ✕ forgets one, and **Forget them all** forgets every one, after asking.
- **The I Ching links to a fuller reading on another site** once six lines are cast (Cafe au Soul's, said plainly to be another site's, copyrighted and with ads; it gets only the six numbers).
- **The Celtic Cross's crossing card** lies across the first card without covering its neighbours, and a spread wider than its column scrolls.

## 0.0.1 (2026-11-15, not published)

- **The series' front page**, introducing the ancient oracles, with a card for each.
- **The I Ching**, cast in Hazel: six lines cast one at a time, bottom up, by three coins or by the yarrow stalks (a switch), each line drawn as it comes with how it came (the coins, or the stalks set aside at each division); after three lines the lower trigram, after six the hexagram, its changing lines and the hexagram they turn it into. The program is five Hazel listings in Hazel's own editor beside the reading; edit it and the page builds it again, and while it has an error or a hole the page's own JS casts, and each line says which did.
- **The Tarot**, dealt in Hazel: one card, three (past, present, future) or the Celtic Cross, dealt face down from the 78 cards, upright or reversed, and turned one at a time, each with its place and what the place speaks to. Simple faces drawn by the page for now (the suit's sign as many times as the card's number; a major arcanum's number and name).
- **The Tarot in Node** (`npm run tarot`): each spread dealt, 40 Celtic Crosses checked for repeated cards, and what a deal costs.
- **The I Ching in Node** (`npm run i-ching`): the odds of each line by each method over 4,000 casts, the hexagram table checked, and what a cast costs.
