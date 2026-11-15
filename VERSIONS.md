# hazeljs-oracles: versions

Each version lists what the apps do as of that version. The newest version is first.

## Unreleased

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
