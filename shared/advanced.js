// shared/advanced.js: ⚙️ Advanced, at the foot of each oracle: 🏷️ the version and 📰 every version's notes (VERSIONS.md as
// cards, as Messed Up Dress Up's ⚙️ advanced tab has them, its ticket 200; Matthew, 2026-11-16: "under advanced for each app,
// also please list versions, a la MUDU"), and 🧪 this device's speed, as Messed Up Dress Up's ⚙️ advanced tab has it (its
// tickets 163 and 166). Matthew, 2026-11-16, after the oracles were painfully slow on an older Android phone: "for MUDU, we had
// a way to record a 'speedrun' that we wrote back into a public etherpad instance --- can we add that feature to each app".
//
// A press runs the same work on every device: the page's own load (Hazel's library, the program built), the app's calls into
// Hazel (each oracle's own: casts and readings, deals), drawing the reading, key presses where the page has a text box, and
// two seconds idle (frames a second, the longest pause: anything working in the background shows there). It leaves the page
// as it was. Then a line to copy, ending in its numbers as JSON (DATA {...}), and a shared page to paste it into: Riseup's
// public Etherpad, the one Dress Up's speed lines go to (anyone with its address can read and write it; it is deleted after
// 60 days without an edit), read back as text from <pad>/export/txt.
(() => {
  "use strict";
  const PAD = "https://pad.riseup.net/p/LgBrn8VRzEJxrsmMW82I";
  // (the release, as version.json says it)
  let VERSION = "?", RELEASED = "";
  const versionKnown = fetch(new URL("../version.json", location.href), { cache: "no-cache" }).then(r => r.json())
    .then(j => { VERSION = j.number || "?"; RELEASED = j.released || ""; }).catch(() => {});

  // ---- 📰 VERSIONS.md as cards: a version's heading (its number and date), its paragraphs and points, **bold**, `code` and
  // [links] as such, all else as text; a heading with nothing under it ("## Unreleased", kept for the next notes) is no card
  const inline = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  function cards(md) {
    const out = []; let card = null, list = false, said = false;
    const flush = () => { if (card && said) out.push(card + (list ? "</ul>" : "") + "</div>"); };
    for (const line of md.split("\n")) {
      const h = line.match(/^## (\S+)(?: \(([^)]*)\))?/);
      if (h) { flush(); list = false; said = false; const now = h[1] === VERSION;
        card = `<div class="news-card${now ? " now" : ""}"><div class="news-head"><b>${inline(h[1])}</b>${h[2] ? ` <span class="muted">${inline(h[2])}</span>` : ""}${now ? ' <span class="news-this">this one</span>' : ""}</div>`; continue; }
      if (!card) continue;
      const li = line.match(/^\s*[-*] (.*)$/);
      if (li) { if (!list) { card += "<ul>"; list = true; } card += `<li>${inline(li[1])}</li>`; said = true; continue; }
      if (line.trim()) { if (list) { card += "</ul>"; list = false; } card += `<p>${inline(line.trim())}</p>`; said = true; }
    }
    flush();
    return out.join("");
  }
  function news(box) {
    Promise.all([versionKnown, fetch(new URL("../VERSIONS.md", location.href), { cache: "no-cache" }).then(r => r.ok ? r.text() : Promise.reject(r.status))])
      .then(([, md]) => { box.innerHTML = cards(md) || '<p class="muted">No versions found.</p>'; })
      .catch(() => { box.innerHTML = '<p class="muted">📰 The list of versions could not be read just now.</p>'; });
  }
  const el = (tag, attrs, kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs || {})) { if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } for (const c of [].concat(kids || [])) e.append(c); return e; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // (the next frame painted: a frame, then a task after it)
  const painted = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const median = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const r1 = x => x === null || x === undefined ? null : Math.round(x * 10) / 10;
  const stats = xs => ({ n: xs.length, median: r1(median(xs)), worst: r1(xs.length ? Math.max(...xs) : null) });

  // the device, named by its platform and browser (Dress Up's reports name devices that way)
  function device() {
    const ua = navigator.userAgent;
    const browser = (ua.match(/(Firefox|Edg|OPR|Chrome|Safari)\/(\d+)/) || [, "a browser", ""]).slice(1).join(" ").trim();
    const platform = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux|X11/.test(ua) ? "Linux" : "another platform";
    return { browser, platform, cores: navigator.hardwareConcurrency || null, memoryGB: navigator.deviceMemory || null,
             screen: `${screen.width}x${screen.height}`, dpr: devicePixelRatio, window: `${innerWidth}x${innerHeight}` };
  }
  // the page's load, from its own clock (ms from the start of the visit)
  function load(app) {
    const nav = performance.getEntriesByType("navigation")[0];
    const lib = performance.getEntriesByType("resource").find(e => /hazel-lib\.js/.test(e.name));
    const b = app.built();
    return { pageReady: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
             libFetched: lib ? Math.round(lib.responseEnd) : null, libKB: lib ? Math.round((lib.transferSize || lib.encodedBodySize || 0) / 1024) : null,
             libRan: app.libAt ? Math.round(app.libAt()) || null : null,
             built: b ? { ok: b.ok, ms: Math.round(b.ms), at: b.at ? Math.round(b.at) : null, compiled: !!b.compiled } : null,
             editorsOpen: document.querySelectorAll("iframe.hazel-listing-frame").length };
  }
  // two seconds idle: frames a second, the longest pause between frames, the share of frames later than 25 ms
  function idle(ms) {
    return new Promise(done => {
      const gaps = []; let t0 = 0, last = 0;
      const f = t => {
        if (!t0) t0 = last = t; else { gaps.push(t - last); last = t; }
        if (t - t0 >= ms) { const s = gaps.reduce((a, b) => a + b, 0) || 1;
          done({ fps: Math.round(1000 * gaps.length / s), longest: Math.round(Math.max(0, ...gaps)), late: Math.round(100 * gaps.filter(g => g > 25).length / (gaps.length || 1)) }); return; }
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
  }
  // key presses in a text box: a character added, the page's own input handlers run, until the next frame is painted; then
  // the box as it was
  async function keys(input, n) {
    const was = input.value, ro = input.readOnly, times = [];
    input.readOnly = false;
    for (let i = 0; i < n; i++) {
      const t0 = performance.now();
      input.value += "abcdefghij"[i % 10];
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await painted();
      times.push(performance.now() - t0);
    }
    input.value = was; input.readOnly = ro;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return stats(times);
  }

  // ---- 📲 this app on this device with no connection (0.0.24): whether it is saved, the browser's own install button where it
  // offers one, and how to put the app's icon on this device, this device's way first. shared/offline.js keeps the service
  // worker; app.offlineExtras, if any, are sets of files saved only on request (the Tarot's woodcut faces).
  function platform() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
    if (/Android/.test(ua)) return "android";
    if (/Firefox\//.test(ua)) return "firefox";
    if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return "safari";
    return "desktop";
  }
  const STEPS = {
    ios: ["📱 iPhone or iPad, in Safari", ["Tap Share (the square with an arrow pointing up), at the bottom of the screen or at the top right.",
      "Scroll down the list, and tap Add to Home Screen.", "Tap Add. The app's icon is now on your home screen: open the app from there."]],
    android: ["📱 Android, in Chrome", ["Tap ⋮ at the top right.", "Tap Add to Home screen, or Install app.",
      "Tap Install (or Add). The app's icon is now on your home screen: open the app from there."]],
    desktop: ["💻 A computer, in Chrome or Edge", ["Click the install button at the right end of the address bar (a small screen with an arrow), or open the menu (⋮ in Chrome; … then Apps in Edge).",
      "Choose Install, then Install again.", "The app opens in its own window, with its own icon, like any other app."]],
    safari: ["💻 A Mac, in Safari", ["Choose File, then Add to Dock.", "Click Add. The app's icon is in the Dock: open the app from there."]],
    firefox: ["💻 Firefox", ["Firefox makes no icon for a site: bookmark this page instead.",
      "Once opened here while online, the page works with no connection too."]],
  };
  function offlineSection(app) {
    const O = window.OracleOffline;
    const state = el("p", { class: "offline-status" }, "📲 …");
    const install = el("button", { type: "button", class: "primary", hidden: "", onclick: async () => { await O.install(); show(); } }, "📲 Install this app");
    const mine = platform();
    const stepsOf = k => el("div", { class: "offline-steps" }, [el("b", {}, STEPS[k][0]), el("ol", {}, STEPS[k][1].map(t => el("li", {}, t)))]);
    const others = el("details", { class: "offline-others" }, [el("summary", {}, "On other devices"),
      ...Object.keys(STEPS).filter(k => k !== mine).map(stepsOf)]);
    const extras = (app.offlineExtras || []).map(x => {
      const line = el("span", { class: "muted" }, "");
      const b = el("button", { type: "button" }, `💾 Save ${x.label} too (${x.size})`);
      const count = async () => { const n = O ? await O.saved(x.urls) : 0; line.textContent = ` ${n} of ${x.urls.length} saved on this device`; b.disabled = n === x.urls.length; };
      b.addEventListener("click", async () => {
        b.disabled = true;
        const got = await O.save(x.urls, (d, n) => { line.textContent = ` saving: ${d} of ${n}…`; });
        line.textContent = got < x.urls.length ? ` ${got} of ${x.urls.length} saved; the rest when there is a connection` : ` all ${got} saved on this device`;
        b.disabled = got === x.urls.length;
      });
      return { row: el("p", { class: "offline-extra" }, [b, line]), count };
    });
    async function show() {
      if (!O) { state.textContent = "📴 The offline part of the page did not load."; return; }
      const s = await O.status();
      const now = s.online ? "" : " You are offline now: casting and readings work; Hazel's editor and library wait for a connection.";
      state.textContent =
        !s.secure ? "📴 Saving for offline use needs the page served over https, or from localhost; this one is not."
        : !s.supported ? "📴 This browser cannot keep the app for use with no connection."
        : s.failed ? `📴 The offline worker did not start (${s.failed}).`
        : s.files ? `✓ Ready with no connection: ${s.files} files saved on this device${s.version ? ` (version ${s.version})` : ""}.` +
            (s.standalone ? " You opened it from its icon." : "") + now
        : "⏳ Saving the app on this device for use with no connection…" + now;
      install.hidden = !O.canInstall();
      extras.forEach(x => x.count());
    }
    if (O) { O.onChange(show); O.ready.then(show); }
    return { show, nodes: [
      el("h3", { class: "advanced-cap" }, "📲 Use it with no connection"),
      state,
      el("p", { class: "muted" }, `Put ${app.name}'s icon on this device, and open it once while online, so it saves itself. After that it works ` +
        "with no connection: casting, the reading, and your past readings and anything you saved, which live on this device. Opening the rules in Hazel's " +
        "editor, or editing them, needs a connection."),
      el("div", { class: "speed-row" }, [install]),
      stepsOf(mine),
      ...extras.map(x => x.row),
      others,
    ] };
  }

  // app: { holder, name, about, built(), libAt(), work: async (say) => ({ data, text: [phrases] }), keysIn: element or null }
  function panel(app) {
    const out = el("input", { type: "text", readonly: "", class: "speed-line", placeholder: "🧪 the line shows here", onfocus: e => e.target.select() });
    const copy = el("button", { type: "button", onclick: () => { out.select();
      try { navigator.clipboard.writeText(out.value).then(() => { copy.textContent = "📋 copied"; }, () => document.execCommand("copy")); } catch (e) { document.execCommand("copy"); } } }, "📋 copy");
    const pad = el("a", { href: PAD, target: "_blank", rel: "noopener", title: "A shared page anyone with its address can read and write: paste the line there" }, "📝 then paste it here");
    let busy = false;
    const run = el("button", { type: "button", class: "primary", onclick: async () => {
      if (busy) return; busy = true; run.disabled = true; copy.textContent = "📋 copy";
      const say = t => { out.value = t; };
      try {
        say("🧪 measuring: the page's load…");
        const ld = load(app);
        say("🧪 measuring: the calls into Hazel…"); await wait(50);
        const w = await app.work(say);
        let k = null;
        if (app.keysIn) { say("🧪 measuring: key presses…"); await wait(50); k = await keys(app.keysIn, 20); }
        say("🧪 measuring: two seconds idle…");
        const id = await idle(2000);
        const dv = device();
        const md = app.mode ? app.mode() : null;
        const data = { app: app.name, v: VERSION, mode: md, at: new Date().toISOString(), device: dv, load: ld, work: w.data, keys: k, idle: id };
        const s = x => x === null || x === undefined ? "?" : (x / 1000).toFixed(1);
        const parts = [
          `🧪 ${app.name} ${VERSION} on ${dv.browser}, ${dv.platform} (${dv.cores || "?"} cores${dv.memoryGB ? ", " + dv.memoryGB + " GB" : ""}, ${dv.dpr}×)`,
          md && md.asked === "compiled" && !(ld.built && ld.built.compiled) ? `asked for compiled, but compiled.js did not run (${md.error || "no reason kept"})` : null,
          ld.built ? (ld.built.compiled ? `compiled Hazel ready at ${s(ld.built.at)} s (no library, no build)` : `Hazel loaded at ${s(ld.libRan)} s, the program built in ${ld.built.ms} ms${ld.built.ok ? "" : " (not ready)"}`) : "Hazel not loaded",
          ...w.text,
          k ? `a key press in the question, to the next frame: ${k.median} ms (worst ${k.worst})` : null,
          `idle: ${id.fps} frames a second, the longest pause ${id.longest} ms`,
          `editors open: ${ld.editorsOpen}`,
        ].filter(Boolean);
        say(parts.join(" · ") + " · DATA " + JSON.stringify(data));
      } catch (e) {
        say("🧪 the speed run stopped: " + (e && e.message || e));
      }
      busy = false; run.disabled = false;
    } }, "🧪 measure this device's speed");
    const ver = el("p", { class: "advanced-version" }, "🏷️ version …");
    versionKnown.then(() => { ver.textContent = `🏷️ version ${VERSION}` + (RELEASED ? `, out ${RELEASED}` : ""); });
    const newsBox = el("div", { class: "news", tabindex: "0", "aria-label": "what's new: every version and its notes" }, el("p", { class: "muted" }, "📰 …"));
    const off = offlineSection(app);
    const box = el("details", { class: "advanced" }, [
      el("summary", {}, "⚙️ Advanced"),
      ver,
      // (0.0.26) an app's own sections first (Solitaire's card backs)
      ...(app.extras || []),
      ...off.nodes,
      el("h3", { class: "advanced-cap" }, "🧪 This device's speed"),
      el("div", { class: "speed-row" }, [run, copy, pad]),
      out,
      el("p", { class: "muted speed-hint" }, `About ten seconds: the page's own load, as it happened; then ${app.about}; then two seconds idle. ` +
        "The same work on every device, and the page as it was afterwards. Run it on two devices and compare the lines: the ratio of the times is how much slower one is."),
      el("h3", { class: "advanced-cap" }, "📰 What's new, version by version"),
      newsBox,
    ]);
    // (the notes are read when ⚙️ Advanced is first opened, not with the page)
    box.addEventListener("toggle", () => { if (box.open) off.show(); if (box.open && !newsBox.dataset.read) { newsBox.dataset.read = "1"; news(newsBox); } });
    app.holder.replaceChildren(box);
  }
  window.OracleAdvanced = { panel, stats, painted };
})();
