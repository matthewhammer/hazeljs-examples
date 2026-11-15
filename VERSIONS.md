# hazeljs-oracles: versions

Each version lists what the apps do as of that version. The newest version is first.

## Unreleased

- **🕰 History, on each oracle's page.** Each reading is kept in this browser (local storage), each oracle's apart: the I Ching's once its six lines are cast, the Tarot's as it is dealt. The panel lists them newest first, with when and what came (the hexagram and the one it changes to, and how it was cast; the spread and its cards). Open one and it is shown as the reading just made, under its own heading, "Reading from" its date and time, with **New reading** beside it; ✕ forgets one, and **Forget them all** forgets every one, after asking.
- **The I Ching links to a fuller reading on another site** once six lines are cast (Cafe au Soul's, said plainly to be another site's, copyrighted and with ads; it gets only the six numbers).
- **The Celtic Cross's crossing card** lies across the first card without covering its neighbours, and a spread wider than its column scrolls.

## 0.0.1

- **The series' front page**, introducing the ancient oracles, with a card for each.
- **The I Ching**, cast in Hazel: six lines cast one at a time, bottom up, by three coins or by the yarrow stalks (a switch), each line drawn as it comes with how it came (the coins, or the stalks set aside at each division); after three lines the lower trigram, after six the hexagram, its changing lines and the hexagram they turn it into. The program is five Hazel listings in Hazel's own editor beside the reading; edit it and the page builds it again, and while it has an error or a hole the page's own JS casts, and each line says which did.
- **The Tarot**, dealt in Hazel: one card, three (past, present, future) or the Celtic Cross, dealt face down from the 78 cards, upright or reversed, and turned one at a time, each with its place and what the place speaks to. Simple faces drawn by the page for now (the suit's sign as many times as the card's number; a major arcanum's number and name).
- **The Tarot in Node** (`npm run tarot`): each spread dealt, 40 Celtic Crosses checked for repeated cards, and what a deal costs.
- **The I Ching in Node** (`npm run i-ching`): the odds of each line by each method over 4,000 casts, the hexagram table checked, and what a cast costs.
