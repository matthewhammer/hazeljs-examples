// hazeljs-examples, Mahjong solitaire (ticket 803; Matthew, 2026-11-20: "Let's do a mahjong that resembles the classic ones from
// 1990s windows, etc.", then "and let's be sure to have a robot switch that does the game automatically, as the others").
// The page: the tiles drawn on a canvas, stacked, each layer a little up and to the left; a tap picks a tile, a second tap on its
// match takes the pair. Hazel's rules (rules/MahjongSolitaire.hz) say which tiles are free, deal a game that can be won, take a
// pair, shuffle, and choose a pair for a clue or for 🤖; compiled ahead of time by hazel-jit (compiled.js) when it is here, else
// (and once they are edited) run by hazeljs (much slower: a deal takes its interpreter about 20 seconds).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "mahjong-solitaire", MODULES = ["MahjongSolitaire"];
  const TAIL = "(deal = MahjongSolitaire.deal, take = MahjongSolitaire.take, frees = MahjongSolitaire.free_places, pairs = MahjongSolitaire.pairs, best = MahjongSolitaire.best, shuffle = MahjongSolitaire.shuffle, places = MahjongSolitaire.layout, won = MahjongSolitaire.won)";
  const KEY = "hazeljs-examples/mahjong-solitaire/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, d) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? d : v; } catch (e) { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* this visit only */ } };
  const seedNew = () => 1 + Math.floor(Math.random() * 2147483645);
  const T = window.MsTiles;

  // ---- the state
  const LAYOUTS = ["🐢 Turtle", "🔺 Pyramid", "🏯 Fortress"];
  const S = { built: null, libFailed: false, compiledError: "", layout: kept("layout", 0), game: null, places: null, seed: 0, sel: -1, clue: null, undo: [],
              moves: 0, shuffles: 0, t0: 0, spent: 0, over: "", lit: kept("lit", false), sfx: kept("sfx", true), vol: kept("sfx-volume", 1), frees: new Set(), pairs: 0, gone: new Map(), wrong: null, busy: false };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  LAYOUTS.forEach((n, i) => { const o = document.createElement("option"); o.value = String(i); o.textContent = n; $("layoutpick").append(o); });
  if (!(S.layout >= 0 && S.layout < LAYOUTS.length)) S.layout = 0;
  $("layoutpick").value = String(S.layout);
  const faces = g => g.slots.map(s => s.face);

  // ---- the table: each tile a face (W by H) with its edge below and to the right (D deep); a layer up drawn D up and to the left
  const cv = $("board"), cx = cv.getContext("2d");
  let geo = null;
  function measure() {
    const ps = S.places; if (!ps) return null;
    const maxX = Math.max(...ps.map(p => p.x)), maxY = Math.max(...ps.map(p => p.y)), maxZ = Math.max(...ps.map(p => p.z));
    const box = cv.parentElement.getBoundingClientRect(), css = Math.max(260, Math.min(box.width, 1400));
    const cols = maxX / 2 + 1, rows = maxY / 2 + 1, m = 8;
    let W = (css - 2 * m) / (cols + 0.14 * (maxZ + 1));
    const tall = document.documentElement.classList.contains("oracle-fs") ? Math.max(200, box.height) : innerHeight * 0.78;
    W = Math.min(W, (tall - 2 * m) / (rows * 1.3 + 0.14 * (maxZ + 1)));
    const D = W * 0.14, Hh = W * 1.3, width = Math.ceil(cols * W + (maxZ + 1) * D + 2 * m), height = Math.ceil(rows * Hh + (maxZ + 1) * D + 2 * m);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(width * dpr) || cv.height !== Math.round(height * dpr)) { cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr); }
    cv.style.width = width + "px"; cv.style.height = height + "px";
    const order = ps.map((p, i) => i).sort((a, b) => ps[a].z - ps[b].z || ps[a].y - ps[b].y || ps[a].x - ps[b].x);
    return geo = { W, H: Hh, D, m, dpr, maxZ, order, at: i => { const p = ps[i]; return [m + (maxZ + 1) * D + (p.x / 2) * W - p.z * D, m + (maxZ + 1) * D + (p.y / 2) * Hh - p.z * D]; } };
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function draw() {
    const g = S.game;
    if (!g || !S.places) { cv.width = 600; cv.height = 200; cx.clearRect(0, 0, 600, 200); return; }
    const G = measure(); const { W, H: Hh, D, dpr } = G, now = performance.now();
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    const fs = faces(g), clue = S.clue && now - S.clue.t < 2500 ? S.clue : null;
    for (const i of G.order) {
      let f = fs[i]; const fading = S.gone.get(i);
      if (f < 0 && !(fading && now - fading.t < 260)) continue;
      if (f < 0) f = fading.f;
      const [x, y] = G.at(i), r = W * 0.12, fade = fading && fs[i] < 0 ? 1 - (now - fading.t) / 260 : 1;
      cx.globalAlpha = fade;
      // the edge: the tile's thickness, below and to the right, and a shadow on what is under it
      cx.fillStyle = "rgba(0,0,0,0.22)"; rr(cx, x + D * 1.6, y + D * 1.6, W, Hh, r); cx.fill();
      cx.fillStyle = "#cdb68a"; rr(cx, x + D, y + D, W, Hh, r); cx.fill();
      cx.fillStyle = "#e7d7b2"; rr(cx, x + D * 0.5, y + D * 0.5, W, Hh, r); cx.fill();
      const face = cx.createLinearGradient(x, y, x + W, y + Hh); face.addColorStop(0, "#fffdf6"); face.addColorStop(1, "#f1e6cc");
      cx.fillStyle = face; rr(cx, x, y, W, Hh, r); cx.fill(); cx.strokeStyle = "#9a8762"; cx.lineWidth = Math.max(1, W * 0.025); cx.stroke();
      T.draw(cx, f, x + W * 0.06, y + Hh * 0.05, W * 0.88, Hh * 0.9);
      // dimmed when not free (with 💡), gold when picked, blue when the clue, red when a pick was wrong
      if (S.lit && !S.frees.has(i)) { cx.fillStyle = "rgba(30,41,59,0.38)"; rr(cx, x, y, W, Hh, r); cx.fill(); }
      const wrong = S.wrong && S.wrong.i === i && now - S.wrong.t < 400;
      const mark = i === S.sel ? "rgba(250,204,21,0.45)" : clue && (clue.a === i || clue.b === i) ? `rgba(56,189,248,${0.3 + 0.25 * Math.sin(now / 120)})` : wrong ? "rgba(220,38,38,0.4)" : null;
      if (mark) { cx.fillStyle = mark; rr(cx, x, y, W, Hh, r); cx.fill(); cx.strokeStyle = i === S.sel ? "#ca8a04" : wrong ? "#b91c1c" : "#0284c7"; cx.lineWidth = Math.max(2, W * 0.06); cx.stroke(); }
      cx.globalAlpha = 1;
    }
    if (S.over) { const w = cv.width / dpr, h = cv.height / dpr; cx.fillStyle = "rgba(15,23,42,0.6)"; cx.fillRect(0, h / 2 - 50, w, 100); cx.fillStyle = "#ffffff"; cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.font = `700 ${Math.round(Math.min(34, w / 16))}px system-ui, sans-serif`; cx.fillText(S.over, w / 2, h / 2 - 12); cx.font = `${Math.round(Math.min(20, w / 28))}px system-ui, sans-serif`;
      cx.fillText(S.overSub || "", w / 2, h / 2 + 22); }
  }
  // (animations: a fading pair, a pulsing clue, a wrong pick; drawn while any lasts)
  let anim = 0;
  function animate() { cancelAnimationFrame(anim); const tick = () => { draw(); const now = performance.now();
    if ([...S.gone.values()].some(v => now - v.t < 260) || (S.clue && now - S.clue.t < 2500) || (S.wrong && now - S.wrong.t < 400)) anim = requestAnimationFrame(tick); }; anim = requestAnimationFrame(tick); }

  // ---- the counters
  const clock = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const spent = () => S.spent + (S.t0 ? performance.now() - S.t0 : 0);
  function bar() {
    const g = S.game, left = g ? faces(g).filter(f => f >= 0).length : 144;
    $("time").textContent = clock(spent()); $("moves").textContent = `${S.moves} move${S.moves === 1 ? "" : "s"}`; $("left").textContent = `${left} tile${left === 1 ? "" : "s"}`;
    $("pairs").textContent = g && !S.over ? `${S.pairs} pair${S.pairs === 1 ? "" : "s"} free` : "";
    $("info").textContent = `${LAYOUTS[S.layout]} · deal ${S.seed}${S.shuffles ? ` · ${S.shuffles} shuffle${S.shuffles === 1 ? "" : "s"}` : ""}`;
    $("undo").disabled = !S.undo.length || S.busy; $("shuffle").disabled = !g || S.over.startsWith("🎉") || S.busy; $("clue").disabled = !g || !!S.over || S.busy;
    if (window.OracleFs) window.OracleFs.empty(!g || !!S.over);
  }
  setInterval(() => { if (S.t0 && !document.hidden) $("time").textContent = clock(spent()); }, 500);
  document.addEventListener("visibilitychange", () => { if (document.hidden && S.t0) { S.spent += performance.now() - S.t0; S.t0 = 0; } else if (!document.hidden && S.game && !S.over && S.moves) S.t0 = performance.now(); });

  // ---- what the rules say after each change: the free places, the pairs, won or stuck
  function look() {
    const h = H(), g = S.game; if (!h || !g) return;
    S.frees = new Set(h.frees(g)); S.pairs = h.pairs(g).length;
    if (h.won(g)) { S.over = "🎉 Cleared!"; S.overSub = `${clock(spent())}, ${S.moves} moves${S.shuffles ? `, ${S.shuffles} shuffle${S.shuffles === 1 ? "" : "s"}` : ""}`; stopClock(); sound("win"); }
    else if (!S.pairs) { S.over = "No pairs free"; S.overSub = "🔀 shuffle, or ↩️ take a pair back"; }
    else S.over = "";
  }
  const stopClock = () => { if (S.t0) { S.spent += performance.now() - S.t0; S.t0 = 0; } };

  // ---- a new game, a pair taken, a pair back, a shuffle, a clue
  function newGame(seed) {
    const h = H(); if (!h) return;
    S.busy = true; $("status").className = "status wait"; $("status").textContent = "⏳ Hazel is dealing…"; bar();
    setTimeout(() => {
      const t0 = performance.now();
      try { S.places = h.places(S.layout); S.seed = seed || seedNew(); S.game = h.deal(S.layout, S.seed); }
      catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; S.busy = false; drawStatus(); return; }
      S.dealMs = performance.now() - t0; S.sel = -1; S.clue = null; S.undo = []; S.moves = 0; S.shuffles = 0; S.t0 = 0; S.spent = 0; S.over = ""; S.gone.clear(); S.busy = false;
      look(); drawStatus(); bar(); draw();
      if (W && W.on) { W.start(0); play(); }
    }, 30);
  }
  function takePair(a, b) {
    const h = H(), g = S.game, fs = faces(g), g2 = h.take(g, a, b);
    if (g2 === g || faces(g2)[a] >= 0) return false;
    S.undo.push(g); S.game = g2; S.moves++; S.sel = -1; S.clue = null;
    const now = performance.now(); S.gone.set(a, { t: now, f: fs[a] }); S.gone.set(b, { t: now, f: fs[b] });
    if (!S.t0 && !S.over) S.t0 = now;
    sound("take"); look(); bar(); animate(); return true;
  }
  function pick(i) {
    if (S.busy || S.over || (W && W.on)) return;
    const g = S.game, fs = faces(g);
    if (!S.frees.has(i)) { S.wrong = { i, t: performance.now() }; sound("no"); animate(); return; }
    if (S.sel < 0 || S.sel === i) { S.sel = S.sel === i ? -1 : i; sound("pick"); draw(); return; }
    const a = S.sel, ka = fs[a] < 34 ? fs[a] : fs[a] < 38 ? 34 : 38, kb = fs[i] < 34 ? fs[i] : fs[i] < 38 ? 34 : 38;
    if (ka !== kb) { S.sel = i; sound("pick"); draw(); return; }
    takePair(a, i);
  }
  cv.addEventListener("pointerdown", e => {
    if (!geo || !S.game) return;
    const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * (cv.width / geo.dpr) / r.width, py = (e.clientY - r.top) * (cv.height / geo.dpr) / r.height, fs = faces(S.game);
    for (let k = geo.order.length - 1; k >= 0; k--) { const i = geo.order[k]; if (fs[i] < 0) continue; const [x, y] = geo.at(i); if (px >= x && px <= x + geo.W && py >= y && py <= y + geo.H) { pick(i); return; } }
    S.sel = -1; draw();
  });
  $("undo").addEventListener("click", () => { if (!S.undo.length || (W && W.on)) return; S.game = S.undo.pop(); S.moves++; S.sel = -1; S.clue = null; look(); bar(); draw(); });
  function doShuffle() { const h = H(); if (!h || !S.game || S.over && S.over.startsWith("🎉")) return; S.undo.push(S.game); S.game = h.shuffle(S.game, seedNew()); S.shuffles++; S.sel = -1; S.clue = null; sound("shuffle"); look(); bar(); draw(); }
  $("shuffle").addEventListener("click", doShuffle);
  $("clue").addEventListener("click", () => { const h = H(); if (!h || !S.game || S.over) return; const p = h.best(S.game); if (p.a < 0) return; S.clue = { a: p.a, b: p.b, t: performance.now() }; animate(); });
  const toggle = (id, get, set) => { const b = $(id); b.setAttribute("aria-pressed", String(get())); b.addEventListener("click", () => { set(!get()); b.setAttribute("aria-pressed", String(get())); }); };
  toggle("lit", () => S.lit, v => { S.lit = v; keep("lit", v); draw(); });
  toggle("sfx", () => S.sfx, v => { S.sfx = v; keep("sfx", v); });
  // (0.0.56) a volume slider beside the switch (shared/volume.js), kept on this device
  if (window.HazelVolume) window.HazelVolume.slider($("sfx"), { label: "Sounds volume", get: () => S.vol, set: v => { S.vol = v; keep("sfx-volume", v); }, isOn: () => S.sfx, hear: () => sound("take") });
  $("new").addEventListener("click", () => newGame());
  $("layoutpick").addEventListener("change", () => { S.layout = +$("layoutpick").value; keep("layout", S.layout); newGame(); });
  addEventListener("resize", () => draw());
  if (window.OracleFs) window.OracleFs.offer({ label: "🀄 New game", title: "A new game, on the layout chosen", cast: () => newGame() });

  // ---- sounds: a click of tiles (two short taps of noise and wood), a soft no, a run of notes for a shuffle and a win
  let ac = null;
  function sound(what) {
    if (!S.sfx || S.vol <= 0) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) { return; }
    const t = ac.currentTime + 0.01, tone = (f, at, d, v, type = "triangle") => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(Math.max(0.0011, v * S.vol), at); g.gain.exponentialRampToValueAtTime(0.001, at + d); o.connect(g); g.connect(ac.destination); o.start(at); o.stop(at + d + 0.02); };
    if (what === "pick") tone(1250, t, 0.05, 0.08, "square");
    else if (what === "take") { tone(900, t, 0.06, 0.12, "square"); tone(1400, t + 0.07, 0.07, 0.1, "square"); }
    else if (what === "no") tone(180, t, 0.12, 0.12, "sawtooth");
    else if (what === "shuffle") [523, 659, 784, 659, 523].forEach((f, i) => tone(f, t + i * 0.05, 0.08, 0.07));
    else if (what === "win") [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.09, 0.25, 0.1));
  }

  // ---- 🤖 Hazel plays for you: its choice of a pair (best), taken at the pace; a shuffle when no pair is free
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["Hazel"],
    more: () => S.game ? `; ${faces(S.game).filter(f => f >= 0).length} tiles left${S.shuffles ? `, ${S.shuffles} shuffle${S.shuffles === 1 ? "" : "s"}` : ""}` : "",
    onChange: on => { if (!on) { W.stop(); return; } if (!H()) return; if (!S.game || S.over) { newGame(); return; } W.start(0); play(); },
  }) : null;
  let playing = false;
  async function play() {
    if (playing) return; playing = true;
    try {
      while (W && W.on && S.game && !S.over.startsWith("🎉")) {
        const h = H(); if (!h) break;
        const t0 = performance.now(); let p = h.best(S.game); W.think(0, performance.now() - t0);
        if (p.a < 0) { if (S.shuffles > 30) { W.end("Hazel gave up after 30 shuffles"); break; } doShuffle(); await W.between(draw); continue; }
        if (W.pace > 0) { S.sel = p.a; S.clue = { a: p.a, b: p.b, t: performance.now() }; draw(); await W.between(draw); }
        takePair(p.a, p.b); await W.between(draw);
      }
      if (W && W.on && S.over.startsWith("🎉")) W.end("Hazel cleared the table");
    } finally { playing = false; bar(); draw(); }
  }

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), without loading Hazel's library${S.dealMs != null ? `; this deal took ${S.dealMs < 10 ? S.dealMs.toFixed(1) : Math.round(S.dealMs)} ms` : ""}.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules deal and play."; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s, and interpreted: slower than compiled${S.dealMs != null ? ` (this deal took ${(S.dealMs / 1000).toFixed(1)} s)` : ""}.`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so nothing can be dealt: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build") + ". Put them back with the button under the listings.";
  }
  let L = null, timer = 0;
  function build() {
    if (!window.Hazel || !L) return;
    const sp = L.spec(PROGRAM, TAIL), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now(); let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!r.ok && !!v && typeof v.deal === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0 };
    drawStatus(); if (S.built.ok) newGame(S.seed || undefined); else draw();
  }
  function loadCompiled() {
    const c = document.createElement("script"); c.src = "compiled.js?v=0.0.42"; c.async = true;
    c.onload = () => { const v = window.MahjongSolitaireCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0 }; drawStatus(); newGame(); }
      else if (!v) { S.compiledError = "it ran, but gave no Mahjong solitaire"; loadLib(); } };
    c.onerror = () => { S.compiledError = "it is not here yet"; loadLib(); };
    document.head.append(c);
  }
  let libAsked = false;
  function loadLib() {
    if (libAsked) return; libAsked = true; drawStatus();
    const s = document.createElement("script"); s.src = LIB; s.async = true;
    s.onload = () => { drawStatus(); setTimeout(build, 30); }; s.onerror = () => { S.libFailed = true; drawStatus(); };
    document.head.append(s);
  }
  try {
    const [pre, ...mods] = await Promise.all([text("rules/preamble.hz"), ...MODULES.map(m => text(`rules/${m}.hz`))]);
    document.querySelector(`pre.hazel[data-program="${PROGRAM}"]:not([data-module])`).textContent = pre;
    MODULES.forEach((m, i) => { document.querySelector(`pre.hazel[data-module="${m}"]`).textContent = mods[i]; });
    window.HazelListingsOptions = { start: "request" };
    await load("../shared/hazel-listings.js?v=0.0.24");
    L = window.HazelListings; L.tail(PROGRAM, TAIL);
    L.onChange(PROGRAM, () => { if (!window.Hazel) loadLib(); S.built = S.built && S.built.compiled ? null : S.built; clearTimeout(timer); timer = setTimeout(build, 350); });
    if (COMPILED) loadCompiled(); else loadLib();
  } catch (e) {
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });
  document.body.classList.add("js");
  bar(); draw();
})();
