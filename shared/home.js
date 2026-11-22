// shared/home.js: the front page as an app of its own (0.0.45). Matthew, 2026-11-22: "The usecase is the kids' tablet, where I
// don't want to manually create new homescreen icons for each activity --- i want one menu app that has all of the others
// inside, to all work offline together." The page has its own manifest (manifest.webmanifest, beside it, its scope the whole
// site), so a device's Add to Home Screen makes one icon that opens this page, every activity a tap away inside it; the site's
// one service worker (sw.js) saves every activity, and Hazel's library, the first time any page is opened. Its 📲 section is
// ⚙️ Advanced's (shared/advanced.js): whether this device has them all, the steps to put the icon on it, and the Tarot's
// woodcut faces, which the worker saves only on request, to save too.
(() => {
  "use strict";
  const A = window.OracleAdvanced, box = document.getElementById("tablet");
  if (!A || !A.offline || !box) return;
  // (each woodcut face's file, as the Tarot names them: tarot/app.js, WOOD_MAJOR, WOOD_SUIT and WOOD_RANK)
  const MAJOR = ["00-fool", "01-magician", "02-high-priestess", "03-empress", "04-emperor", "05-pope", "06-lovers", "07-chariot",
    "11-strength", "09-hermit", "10-wheel-of-fortune", "08-justice", "12-hanged-man", "13-death", "14-temperance", "15-devil",
    "16-tower", "17-star", "18-moon", "19-sun", "20-judgement", "21-world"];
  const SUITS = ["wands", "cups", "swords", "coins"];
  const RANK = r => r === 1 ? "ace" : r <= 10 ? String(r).padStart(2, "0") : ["page", "knight", "queen", "king"][r - 11];
  const faces = dir => [...MAJOR, ...SUITS.flatMap(s => Array.from({ length: 14 }, (_, k) => `${s}-${RANK(k + 1)}`))]
    .map(n => `tarot/woodcut/${dir}/${n}.svg`).concat("tarot/woodcut/cards/back.svg").map(u => new URL(u, location.href).href);
  const section = A.offline({
    name: "Hazel activities",
    offlineText: "Put this page's icon on the home screen (the steps below), then open it from there once while online: it saves every " +
      "activity on the device, about 6 MB. After that the one icon opens all of them with no connection: the oracles, the games, the Hazel " +
      "opponents and the Petri nets, with whatever each keeps on the device. Opening a program in Hazel's editor needs a connection.",
    offlineNow: " You are offline now: every activity works; Hazel's editor waits for a connection.",
    offlineExtras: [["the Tarot's black and white woodcut faces", "cards", "about 4 MB to download"],
      ["the Tarot's colored woodcut faces", "colori", "about 28 MB to download"]].map(([label, dir, size]) => ({ label, size, urls: faces(dir) })),
  });
  box.append(...section.nodes.filter(n => n.tagName !== "H3"));   // (its heading said again by the box's own summary)
})();
