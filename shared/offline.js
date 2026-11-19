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
  window.OracleOffline = {
    supported, ready, status, save, saved, standalone,
    onChange: f => listeners.push(f),
    canInstall: () => !!prompt,
    install: async () => { if (!prompt) return false; const p = prompt; prompt = null; p.prompt(); const r = await p.userChoice; tell(); return r.outcome === "accepted"; },
  };
})();
