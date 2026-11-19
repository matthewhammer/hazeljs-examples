# hazeljs-examples: versions

Each version lists what the apps do as of that version. The newest version is first.

## Unreleased

## 0.0.25 (2026-11-19)

Everything in 0.0.24, plus:

- **Hazel activities, at a new address.** The apps are now at https://matthewhammer.org/hazeljs-examples/, and their repository is [hazeljs-examples](https://github.com/matthewhammer/hazeljs-examples). The front page has two parts, each with a link of its own: **Ancient oracles** (`#oracles`), and **One-player games** (`#games`), where Solitaire comes next. Each app's header links back to both: Hazel activities › ancient oracles.
- **The old address sends you on.** Each page at https://matthewhammer.org/hazeljs-oracles/ goes to its new one, with its query and anchor. An app saved for use with no connection at the old address is cleared there; open it once at the new address, and it saves itself again (the Tarot's woodcut faces need saving again, too). Your past readings and saved charts carry over: they live in this browser, under the same names as before.

## 0.0.24 (2026-11-19)

Everything in 0.0.23, plus:

- **Each oracle works with no connection.** Open an oracle once while online and it saves itself on this device; after that it opens, casts and reads with no connection at all, and your past readings and saved charts are there as before. Opening or editing the rules in Hazel's editor still needs a connection; with none, the listings stay text.
- **Each oracle is an app with its own icon.** The I Ching's is a gold hexagram (63, After Completion), the Tarot's two fanned cards with a star, Astrology's a gold zodiac wheel with the Sun at its heart. Put it on your home screen, or install it on a computer, and it opens in its own window.
- **📲 Use it with no connection,** under ⚙️ Advanced: whether this app is saved on this device, an **Install this app** button where the browser offers one, and how to put the app's icon on this device (iPhone and iPad, Android, a computer), this device's way first. On the Tarot, a button saves the woodcut faces too (about 4 MB to download in black and white, about 28 MB in color); a woodcut face that is not saved, with no connection, is drawn simple instead.
- **One button casts in full screen.** In full screen with nothing cast yet, the picture's place has one button: **☰ Cast the hexagram** (all six lines, by the method chosen), **✧ Shuffle, deal and turn** (the spread chosen, every card turned), **✶ Cast the chart** (the birth in the form, against today's sky).

## 0.0.23 (2026-11-19)

Everything in 0.0.22, plus:

- **Today's sky has a time, and keeps up with the clock.** Astrology's **Today's sky** is now a date and a time, in this browser's time zone, with **Now** beside them. Until you change either, both follow the clock: they are kept up to the minute while the page is open, brought up to date when the page is shown again, and read afresh at each cast, so a chart cast after the page has sat open for hours, or past midnight, has the sky of the moment it was cast. Change the date or the time and the chart takes that moment instead; **Now** goes back to the clock. The time matters most for the Moon, which moves about half a degree an hour. Before, the date was the day the page was loaded and the time, unseen, the clock's at the cast, so a page left open past midnight cast yesterday's date at today's time. The chart shows the moment it uses ("today's sky on November 19, 2026 at 7:02 AM"), in its notes' heading and in the 🕰 history; opening a chart from the history sets the date and time to its moment.

## 0.0.22 (2026-11-18)

Everything in 0.0.21, plus:

- **Astrology saves births under names.** A new box at the top of the form, **Saved charts, on this device only**, has a menu of this app's own birth, the charts you have saved, and a new birth. Give the form's birth a name and press **Save** (or Enter in the name), and it is kept in this browser under that name; choosing it from the menu later fills the form and casts its chart, headed with its name ("A birth chart: …"). With a saved chart chosen, **Save** keeps the form's changes to it, or a new name for it, and the box says when the form has changed since it was saved; to keep a copy under another name, choose **A new birth** first, which keeps the form as it is. **Delete** asks once more in place, then forgets the chart, not the 🕰 history's charts of it, which now name it too. Two charts cannot share a name. Saving a chart is asking to keep it, so it needs no **remember these on this device**, which still keeps the form as last cast, and the history.
- **The birth remembered before is the chart "default".** A browser that remembered a birth with 0.0.15 to 0.0.21 finds it saved, on its first visit, as the chart named "default" (or "default 2", if that name is taken), chosen in the menu and in the form as before; rename it with **Save**.

## 0.0.21 (2026-11-18)

Everything in 0.0.20, plus:

- **A sign's tooltip shows its constellation.** Hovering a sign on astrology's wheel now draws, in the sign's element color, the stars of the constellation the sign is named for, with a line on what they are: since antiquity, precession has moved each sign about one constellation west of its stars. The twelve figures (`astrology/constellations.svg`, shown together in `astrology/constellations.html`) are drawn by `tools/make-constellations.mjs` from Marc van der Sluys's [ConstellationLines](https://github.com/MarcvdSluys/ConstellationLines) (CC BY 4.0), which says which stars to join, and the Yale Bright Star Catalogue (5th revised edition, CDS V/50), for where the stars are and how bright: each figure projected onto the sky's plane at its center, north up and east to the left, its stars sized by brightness and its lines stopped short of them. The credit is in the page's foot and in NOTICE.

## 0.0.20 (2026-11-18)

Everything in 0.0.19, plus:

- **Astrology in full screen: the birth and today side by side.** A toggle at the top of the left column, **◧ Birth and today side by side**, puts the form away (with the status and the history), so the left column starts with the birth itself, its heading and when and where, and the birth's notes follow under it; today's notes stay on the right. Hovering the wheel then lights notes on both sides at once, and each side scrolls on its own to its first lit note. **◨ Show the form, the notes together** puts it back. The choice is kept in this browser.
- **The notes light the wheel, the other way round.** Hovering a note lights what it is about on the wheel: its bodies, its signs, the line where its house begins, the horizon for the rising sign; a note on today's sky also draws the aspect it names, a dashed line from today's body to the birth's. Hovering a glyph in a note's heading lights only what that glyph stands for.

## 0.0.19 (2026-11-18)

Everything in 0.0.18, plus:

- **Astrology's wheel explains itself under the pointer.** Hover over a sign, a body at birth or today, an aspect's line, a line between two signs, or the horizon or meridian, and a tooltip says what it is, in the reading's own words where it has them: a body's note and what it is about ("At birth: Sun in Scorpio, 25°, in the 11th house. About who you are, and what gives you life."), a sign's sentence and which of your houses it is, an aspect's two bodies, how far from exact and what they do to each other, a house's sentence. The notes it concerns light up on the right, as does the element on the wheel; in full screen, the notes column scrolls to the first of them. A tap does the same on a touch screen. Each glyph has a disc under it, and each line a wider twin, for the pointer to land on.

## 0.0.18 (2026-11-18)

Everything in 0.0.17, plus:

- **Astrology's notes show the wheel's glyphs, and their words come first.** Each note's heading, the chart's facts in the reading's fixed form ("Sun in Aries, 20°, in the 5th house"), is now quiet, smaller and in the muted color, with the wheel's own glyph beside each sign, body and aspect, colored as the wheel colors them: a sign by its element, a body at birth in ink and today's in the accent, an aspect soft or hard. The reading's words under it carry the emphasis, in full ink and a heavier weight. The groups' headings ("At birth", "Today, …") are small capitals.
- **Full screen fits a small or zoomed window.** The left column's parts are gathered, in full screen, into one column that scrolls on its own, and put back after; before, a window shorter than they were tall squeezed them together, the status over the form. A fieldset no longer runs past its column (the place's latitude, longitude and time zone wrap), the wheel's column narrows before the notes go past the window's edge, and the I Ching's two hexagrams stay side by side, with its link to a reading's text in a place of its own. Checked at 1000 by 660.

## 0.0.17 (2026-11-18)

Everything in 0.0.16, plus:

- **Astrology keeps a history of charts, when asked.** A chart is kept only while **remember these on this device** is ticked, as the birth in the form is: a birth is personal, so nothing is kept unless you ask, and the 🕰 History panel says so. Each kept chart is one line, the birth, its place, the Sun's, the Moon's and the rising sign, and the day of the sky (the same chart cast again is kept once). Opening one casts that very chart again, its birth, place and day as they were, under "A chart from …", with **New chart** to cast the form's birth with today's sky; and it takes notes and an emoji, as the I Ching's and the Tarot's readings do since 0.0.16. Unticking **remember** forgets the form, not the charts; ✕ or **Forget them all** does that.

## 0.0.16 (2026-11-18)

Everything in 0.0.15, plus:

- **Astrology runs compiled by default,** as the I Ching and the Tarot have since 0.0.13. The page casts through `astrology/compiled.js` (101 kB), the same eleven modules compiled ahead of time to JavaScript by hazel-jit, without loading hazeljs or building the program: a chart in about a millisecond, where hazeljs builds and casts one in about 1.4 s (Node, the median of 40 charts). hazeljs loads only when the rules are edited, and runs them as before; `?interpreted=1`, or the link under ⚙️ Advanced, interprets. If the compiled rules stop on a chart, Hazel casts it instead, and the status says why. Checked against hazeljs on 40 charts, the app's own first, then births and days drawn from 1900 to 2099 and places to 60° north and south: the same words, and every number within a relative 10⁻¹⁰ (`node node/compare-compiled.mjs astrology`). Made by `tools/make-compiled.py` from the program a test prints on hazelgrove/hazel's branch `trial/768-astrology-aot`.
- **Full screen, in each oracle.** In two-column mode, **⛶ Full screen** at the top of the reading's column fills the screen with the oracle alone, without the program's listings: the controls on the left, the picture in the middle as large as the window allows (the wheel, the hexagrams, the table of cards), and the words on the right, each column scrolling on its own. Two dividers, either side of the picture, widen or narrow the side columns (drag them, or the arrow keys on them; a double-click puts them back), kept in this browser for each oracle. **✕ Leave full screen**, or Esc, goes back to the page.
- **Notes and an emoji on each reading in the history** (the I Ching and the Tarot). 📝 writes a note under a reading, kept with the time it was written, for when you come back to it; each note can be hidden, shown again, or removed. ♡ marks a reading with a red heart, and pressing the mark again chooses another, or none. All of it stays in this browser, with the history.

## 0.0.15 (2026-11-17)

Everything in 0.0.14, plus:

- **A third oracle: astrology.** Give a birth's date, time and place (one of a few cities, or a latitude, longitude and time zone), and Hazel places the Sun, the Moon and the planets, finds the rising sign, the midheaven and the houses (whole signs), the aspects among the planets, and today's sky against them, and reads it all in short sentences, in words of this oracle's own; the page draws the wheel, the birth inside and today's sky round it. The astronomy is rewritten in Hazel from [astronomia](https://github.com/commenthol/astronomia) (MIT), after Jean Meeus's *Astronomical Algorithms*, and from Paul Schlyter's [planetary positions](https://stjarnhimlen.se/comp/ppcomp.html): every body within 0.11° of [Astronomy Engine](https://github.com/cosinekitty/astronomy) from 1900 to 2100 (`npm run astrology`).
- **It starts with its own birth chart**: the app's first commit, at 11:03:51 Mountain time on November 17, 2026, at 40.046313° N, 105.286695° W. Capricorn rising, the Sun in Scorpio. A planet back where it was at a birth reads as a return.
- **Hazel alone casts it**, in about 1.3 s on a laptop: the page writes the birth into the program's last line and builds the program again for each chart, taking back data, not a function, since an answer that is a function grows past gigabytes in hazeljs 0.0.4 ([hazelgrove/hazel#2832](https://github.com/hazelgrove/hazel/issues/2832)); and the astronomy's long numbers are written as ratios, since a long float literal sends a module to a slow parse ([hazelgrove/hazel#2831](https://github.com/hazelgrove/hazel/issues/2831)). There is no JavaScript fallback, and no compiled mode yet.
- **Birth details stay on the device**, and are kept there only when **remember these on this device** is ticked.
- **The front page has a third card**, its picture the app's own chart (`astrology/thumb.svg`, made by `tools/astrology-thumb.mjs`).

## 0.0.14 (2026-11-17)

Everything in 0.0.13, plus:

- **The Tarot's cards can be woodcuts.** A new **Faces** choice beside the spread: the simple faces as before; the woodcut deck in black and white; or the woodcut deck in its own stencil colors. The deck is [Woodcut tarot](https://github.com/SONDLecT/woodcut-tarot), the 78 cards traced in SVG from the Jean Noblet tarot (Paris, about 1650), the oldest Tarot de Marseille that survives, and dedicated to the public domain (CC0). It is a git submodule of this repository, by way of our fork, not a copy. A card's picture loads when the card is turned: about 50 kB in black and white, about 350 kB in color. A face-down card shows the deck's own back, a reversed card is turned over, and the choice is remembered on the device. A Marseille deck numbers Justice VIII and Strength XI, the other way from Waite's order, which the cards' names here follow; the credit under the table says so.
- **One button for the code: text or Hazel's editor.** In both oracles, **Edit in Hazel**, above the first listing, opens every listing in Hazel's editor, and **Show as text** goes back to the text, showing your edits; the editors stay loaded behind it, so switching again is quick. It replaces the button on each listing. The pages still start with the text, and Hazel's editors load only when asked.
- **The text is highlighted**, near the colors Hazel's editor uses: keywords, types and constructors, strings, numbers and comments, in light and dark.
- **The front page is shorter.** Its two paragraphs are a sentence each, and each oracle is one phrase, under a new picture, centered and larger: the eight trigrams around the taijitu for the I Ching (`i-ching/bagua.svg`), and the woodcut deck's back for the Tarot.

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
