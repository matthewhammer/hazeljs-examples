// shared/offline.js: each oracle on this device with no connection (0.0.24). It installs the site's service worker
// (sw.js, beside the apps), keeps the browser's own install prompt where the browser offers one (Chrome, Edge, Android),
// and answers ⚙️ Advanced's 📲 section (advanced.js): whether this app is saved for offline use, and saving more on request.
(() => {
  "use strict";
  const here = document.currentScript ? document.currentScript.src : location.href;
  const SW = new URL("../sw.js", here), SCOPE = new URL("../", here);
  const EXTRA = "hazeljs-examples-extra";
  const secure = location.protocol === "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  const supported = secure && "serviceWorker" in navigator && "caches" in window;
  let failed = "", prompt = null;
  const listeners = [];
  const tell = () => listeners.forEach(f => { try { f(); } catch (e) { /* a listener's own trouble */ } });
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); prompt = e; tell(); });
  addEventListener("appinstalled", () => { prompt = null; tell(); });
  const ready = supported
    ? navigator.serviceWorker.register(SW.href, { scope: SCOPE.href }).then(() => navigator.serviceWorker.ready)
        .then(r => { tell(); return r; }, e => { failed = String(e && e.message || e); tell(); return null; })
    : Promise.resolve(null);
  if (supported) navigator.serviceWorker.addEventListener("controllerchange", tell);
  addEventListener("online", tell); addEventListener("offline", tell);
  const standalone = () => matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;
  // what this device holds: the files saved, by the worker's cache for this version, and the extras
  async function status() {
    const s = { supported, secure, failed, online: navigator.onLine, standalone: standalone(), active: false, version: "", files: 0, extras: 0 };
    if (!supported) return s;
    s.active = !!navigator.serviceWorker.controller;
    try {
      for (const k of await caches.keys()) {
        if (!k.startsWith("hazeljs-examples-")) continue;
        const n = (await (await caches.open(k)).keys()).length;
        if (k === EXTRA) s.extras = n; else { s.files += n; s.version = k.slice("hazeljs-examples-".length); }
      }
    } catch (e) { /* the browser keeps no caches here */ }
    return s;
  }
  // a set of the site's files saved for offline use (each one not saved yet, fetched and kept); progress as (done, of)
  async function save(urls, progress) {
    const c = await caches.open(EXTRA);
    let done = 0, got = 0;
    for (const u of urls) {
      if (await c.match(u)) got++;
      else try { const r = await fetch(u); if (r.ok) { await c.put(u, r); got++; } } catch (e) { /* this one waits for a connection */ }
      if (progress) progress(++done, urls.length);
    }
    return got;
  }
  async function saved(urls) {
    if (!supported) return 0;
    const c = await caches.open(EXTRA);
    let n = 0;
    for (const u of urls) if (await c.match(u)) n++;
    return n;
  }
  // ---- (0.0.27; Matthew, 2026-11-19: "messed up dress up also has a feature that pops up when there's a new live version.
  // Can we do that here, somehow?") As Dress Up does it (its tickets 134 and 302). This page's version is version.json as the
  // page read it on loading, the way its other files were read. Each minute while the page is shown, and whenever it is shown
  // again, version.json is asked for afresh, past every cache (sw.js lets a no-store request by). A newer version is offered
  // once: a card at the top of the window (🔄 Switch, or Not now), and a 🆕 chip after the page's title until the switch. The
  // switch loads the page again at an address of its own (?v=), so no cache hands back the old one; what this device keeps
  // (games, readings, settings) stays. The card is on until ⚙️ Advanced switches it off, this browser's own choice.
  const VJSON = new URL("../version.json", here);
  const ASK_KEY = "hazeljs-examples/ask-new";
  const newer = (a, b) => {
    const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    return false;
  };
  const good = j => j && typeof j.number === "string" && /^\d+(\.\d+)*$/.test(j.number) ? j : null;
  const loaded = fetch(VJSON.href).then(r => r.ok ? r.json() : null).then(good).catch(() => null);
  let offered = null;
  const askOn = () => { try { return localStorage.getItem(ASK_KEY) !== "off"; } catch (e) { return true; } };
  function switchNow() {
    if (!offered) return;
    const to = new URL(location.href);
    to.searchParams.set("v", offered.number);
    // (the app's own last word first, if it has one, two seconds at most: Gnome world keeps its world, 0.0.138; then version.json,
    // afresh into this browser's cache, so the new page reads the new number)
    const last = typeof window.HazelBeforeSwitch === "function"
      ? Promise.race([Promise.resolve().then(window.HazelBeforeSwitch), new Promise(r => setTimeout(r, 2000))]).catch(() => {}) : Promise.resolve();
    last.then(() => fetch(VJSON.href, { cache: "reload" })).catch(() => {}).finally(() => location.replace(to.href));
  }
  function chip() {
    const h = document.querySelector("h1");
    if (!h || !offered) return;
    let c = document.getElementById("newer-chip");
    if (!c) { c = document.createElement("button"); c.type = "button"; c.id = "newer-chip"; c.className = "newer-chip"; c.addEventListener("click", switchNow); h.after(c); }
    c.textContent = "🆕 " + offered.number;
    c.title = `Version ${offered.number}${offered.released ? ", out " + offered.released : ""} is out: press to switch to it. What this device keeps stays.`;
  }
  function ask(v) {
    let card = document.getElementById("ask-new");
    if (!card) {
      card = document.createElement("div"); card.id = "ask-new";
      card.setAttribute("role", "dialog"); card.setAttribute("aria-label", "A new version");
      document.body.append(card);
    }
    const p = (cls, t) => { const e = document.createElement("p"); if (cls) e.className = cls; e.textContent = t; return e; };
    const row = document.createElement("div"), yes = document.createElement("button"), no = document.createElement("button");
    yes.type = no.type = "button"; yes.className = "primary"; yes.textContent = "🔄 Switch"; no.textContent = "Not now";
    yes.addEventListener("click", switchNow); no.addEventListener("click", () => card.remove());
    row.className = "ask-new-row"; row.append(yes, no);
    card.replaceChildren(p("", "🆕 A new version is available, would you like to switch?"),
      p("ask-new-hint", `version ${v.number}${v.released ? ", out " + v.released : ""} · what this device keeps (games, readings, settings) stays`), row);
  }
  function askSet(on) {
    try { if (on) localStorage.removeItem(ASK_KEY); else localStorage.setItem(ASK_KEY, "off"); } catch (e) { /* this visit only */ }
    const card = document.getElementById("ask-new");
    if (!on && card) card.remove();
    if (on && offered && !card) ask(offered);
    tell();
  }
  async function check() {
    if (document.hidden) return;
    const mine = await loaded;
    if (!mine) return;
    try {
      const r = await fetch(VJSON.href + "?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return;
      const v = good(await r.json());
      if (!v || !newer(v.number, mine.number) || (offered && !newer(v.number, offered.number))) return;
      offered = v; chip(); tell();
      if (askOn()) ask(v);
    } catch (e) { /* offline: nothing to offer */ }
  }
  setTimeout(check, 20000);
  setInterval(check, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  window.OracleOffline = {
    supported, ready, status, save, saved, standalone,
    loaded, check, switchNow, askOn, askSet, offered: () => offered,
    onChange: f => listeners.push(f),
    canInstall: () => !!prompt,
    install: async () => { if (!prompt) return false; const p = prompt; prompt = null; p.prompt(); const r = await p.userChoice; tell(); return r.outcome === "accepted"; },
  };
})();
