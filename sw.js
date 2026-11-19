// hazeljs-examples: the service worker that lets each oracle run with no connection (0.0.24).
//
// shared/offline.js installs it from any of the site's pages; its scope is the whole site. When it installs it saves every
// app's own files (PRECACHE), and from then on it saves each file of the site a page fetches, and Hazel's library from
// jsDelivr. Every request goes to the network first, so a page that is online always gets the newest files; with no
// network, the saved copy answers, its ?v= query ignored. Hazel's editor frames come from build.hazel.org, which this
// worker cannot answer for: with no connection, the listings stay text.
const VERSION = "0.0.25";
const CACHE = "hazeljs-examples-" + VERSION;
// (files a page saves on request, the Tarot's woodcut faces, and every face a page has shown: kept across versions)
const EXTRA = "hazeljs-examples-extra";
const PRECACHE = [
  "./",
  "index.html",
  "version.json",
  "VERSIONS.md",
  "shared/advanced.js",
  "shared/divider.js",
  "shared/fullscreen.js",
  "shared/hazel-listings.js",
  "shared/history.js",
  "shared/oracles.css",
  "shared/style.css",
  "i-ching/",
  "i-ching/index.html",
  "i-ching/app.js",
  "i-ching/compiled.js",
  "i-ching/manifest.webmanifest",
  "i-ching/icons/apple-touch-icon.png",
  "i-ching/icons/icon-192.png",
  "i-ching/icons/icon-32.png",
  "i-ching/icons/icon-512.png",
  "i-ching/icons/icon.svg",
  "i-ching/rules/Book.hz",
  "i-ching/rules/Casting.hz",
  "i-ching/rules/Lines.hz",
  "i-ching/rules/Reading.hz",
  "i-ching/rules/preamble.hz",
  "tarot/",
  "tarot/index.html",
  "tarot/app.js",
  "tarot/compiled.js",
  "tarot/manifest.webmanifest",
  "tarot/icons/apple-touch-icon.png",
  "tarot/icons/icon-192.png",
  "tarot/icons/icon-32.png",
  "tarot/icons/icon-512.png",
  "tarot/icons/icon.svg",
  "tarot/rules/Deck.hz",
  "tarot/rules/Reading.hz",
  "tarot/rules/Spreads.hz",
  "tarot/rules/preamble.hz",
  "astrology/",
  "astrology/index.html",
  "astrology/app.js",
  "astrology/compiled.js",
  "astrology/manifest.webmanifest",
  "astrology/icons/apple-touch-icon.png",
  "astrology/icons/icon-192.png",
  "astrology/icons/icon-32.png",
  "astrology/icons/icon-512.png",
  "astrology/icons/icon.svg",
  "astrology/rules/Aspects.hz",
  "astrology/rules/Chart.hz",
  "astrology/rules/MoonOrbit.hz",
  "astrology/rules/Orbit.hz",
  "astrology/rules/Outer.hz",
  "astrology/rules/Planets.hz",
  "astrology/rules/PlutoOrbit.hz",
  "astrology/rules/Reading.hz",
  "astrology/rules/Sky.hz",
  "astrology/rules/Wheel.hz",
  "astrology/rules/Zodiac.hz",
  "astrology/rules/preamble.hz",
  "i-ching/bagua.svg",
  "astrology/glyphs.svg",
  "astrology/constellations.svg",
  "astrology/thumb.svg",
  "tarot/meanings/biddy-tarot.json",
  "tarot/meanings/labyrinthos.json",
  "tarot/woodcut/cards/back.svg",
];

self.addEventListener("install", e => {
  // (one at a time and each on its own, so a file missing from the site does not stop the rest being saved)
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("hazeljs-examples-") && k !== CACHE && k !== EXTRA).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const lib = url.hostname === "cdn.jsdelivr.net" && url.pathname.startsWith("/npm/hazeljs@");
  if (!same && !lib) return;
  const keep = same && url.pathname.includes("/woodcut/") ? EXTRA : CACHE;
  e.respondWith(fetch(req).then(res => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(keep).then(c => c.put(req, copy)).catch(() => {}); }
    return res;
  }, async err => {
    const hit = await caches.match(req, { ignoreSearch: same })
      || (req.mode === "navigate" ? await caches.match(new URL("index.html", url).href, { ignoreSearch: true }) : null);
    if (hit) return hit;
    throw err;
  }));
});
