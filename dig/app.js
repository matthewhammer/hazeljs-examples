// hazeljs-examples, Deep dig (ticket 829; Matthew, 2026-11-22: "Next: space invaders clone, centipede clone, dig dug clone", and
// "all with hazel rules and hazel AI that plays the game"): a digging game of our own in that genre (its own way with the
// monsters: boulders, and a lantern that stuns, not a pump). The page: the ground drawn on a canvas, every frame a step of
// Hazel's rules (Dig.step: your digging, the boulders, the monsters, the lantern), and 🤖 Hazel plays for you, the robot in
// Hazel (Dig.robot) choosing each step's way and flash. The rules compiled ahead of time by hazel-jit (compiled.js) when it is
// here, else, and once they are edited, run by hazeljs (slower).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "dig", MODULES = ["Dig"];
  const TAIL = "(start = Dig.start, step = Dig.step, robot = Dig.robot)";
  const KEY = "hazeljs-examples/dig/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: the rules, the game (a Hazel value: the ground 14 by 16 cells), the way held (by a key, a button or a swipe),
  // a flash asked for, words floating up, the best score
  const W_ = 14, H_ = 16;
  const S = { built: null, libAt: 0, libFailed: false, compiledError: "", game: null, best: kept("best", 0),
              dir: -1, keys: [], flash: false, pops: [], stepMs: [], restartAt: 0, banner: null, swipe: null };
  const H = () => S.built && S.built.ok ? S.built.value : null;

  // ---- drawing: the sky and the ground's layers (darker deeper), the tunnels, the gems glittering, the boulders (shaking before
  // they fall), the monsters (with stars when stunned), you with your lantern, and its flash
  const cv = $("ground"), ctx = cv.getContext("2d");
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, Math.round(r.width * d)), h = Math.round(w * H_ / W_);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  const LAYERS = ["#a16207", "#92400e", "#7c2d12", "#5b2112"];
  function draw() {
    fit();
    const c = ctx, u = cv.width / W_, g = S.game, now = performance.now();
    c.fillStyle = "#7dd3fc"; c.fillRect(0, 0, cv.width, u);
    for (let r = 1; r < H_; r++) { c.fillStyle = LAYERS[Math.min(3, Math.floor((r - 1) / 4))]; c.fillRect(0, r * u, cv.width, u + 0.5); }
    if (!g) return;
    for (let r = 1; r < H_; r++) for (let k = 0; k < W_; k++) {
      const v = g.cells[r * W_ + k], x = k * u, y = r * u;
      if (v === 0) { c.fillStyle = "#1c1009"; c.fillRect(x, y, u + 0.5, u + 0.5); }
      else { c.fillStyle = "rgba(0, 0, 0, 0.12)"; c.fillRect(x + u * 0.2, y + u * 0.3, u * 0.08, u * 0.08); c.fillRect(x + u * 0.65, y + u * 0.7, u * 0.08, u * 0.08); }
      if (v === 2) {
        const tw = 0.6 + 0.4 * Math.sin(now / 250 + r * 3 + k);
        c.fillStyle = "#22d3ee"; c.beginPath(); c.moveTo(x + u / 2, y + u * 0.22); c.lineTo(x + u * 0.75, y + u * 0.45); c.lineTo(x + u / 2, y + u * 0.78); c.lineTo(x + u * 0.25, y + u * 0.45); c.closePath(); c.fill();
        c.fillStyle = `rgba(255, 255, 255, ${tw})`; c.beginPath(); c.arc(x + u * 0.42, y + u * 0.4, u * 0.06, 0, 7); c.fill();
      }
    }
    for (const b of g.rocks) {
      const shake = !b.falling && b.wob >= 0 ? Math.sin(now / 30) * u * 0.05 : 0, fallBy = b.falling ? (4 - b.wob) / 4 * u : 0;
      const x = (b.c + 0.5) * u + shake, y = (b.r + 0.5) * u + fallBy;
      c.fillStyle = "#78716c"; c.beginPath(); c.ellipse(x, y, u * 0.44, u * 0.4, 0, 0, 7); c.fill();
      c.fillStyle = "#a8a29e"; c.beginPath(); c.ellipse(x - u * 0.12, y - u * 0.12, u * 0.18, u * 0.12, -0.4, 0, 7); c.fill();
    }
    for (const m of g.mons) {
      const x = (m.c + 0.5) * u, y = (m.r + 0.5) * u, bob = Math.sin(now / 160 + m.c) * u * 0.04;
      c.fillStyle = m.stun > 0 ? "#c4b5fd" : "#ef4444"; c.beginPath(); c.arc(x, y + bob, u * 0.38, Math.PI, 0); c.lineTo(x + u * 0.38, y + u * 0.36);
      for (let i = 3; i >= -3; i -= 2) c.lineTo(x + i * u * 0.11, y + u * (i % 4 === 1 || i % 4 === -3 ? 0.26 : 0.36)); c.closePath(); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(x - u * 0.13, y - u * 0.05 + bob, u * 0.1, 0, 7); c.arc(x + u * 0.13, y - u * 0.05 + bob, u * 0.1, 0, 7); c.fill();
      c.fillStyle = "#111827"; c.beginPath(); c.arc(x - u * 0.11, y - u * 0.04 + bob, u * 0.05, 0, 7); c.arc(x + u * 0.15, y - u * 0.04 + bob, u * 0.05, 0, 7); c.fill();
      if (m.stun > 0) { c.font = `${Math.round(u * 0.36)}px system-ui`; c.textAlign = "center"; c.fillText("💫", x + Math.cos(now / 150) * u * 0.25, y - u * 0.45); }
    }
    if (g.dead === 0 || Math.floor(now / 120) % 2) {
      const x = (g.px + 0.5) * u, y = (g.py + 0.5) * u, d = g.pd, ex = [0, 1, 0, -1][d], ey = [-1, 0, 1, 0][d];
      c.fillStyle = "#2563eb"; c.beginPath(); c.roundRect(x - u * 0.28, y - u * 0.05, u * 0.56, u * 0.42, u * 0.12); c.fill();
      c.fillStyle = "#f2c9a0"; c.beginPath(); c.arc(x, y - u * 0.18, u * 0.2, 0, 7); c.fill();
      c.fillStyle = "#facc15"; c.beginPath(); c.arc(x, y - u * 0.28, u * 0.2, Math.PI, 0); c.fill();
      c.fillStyle = "#fef08a"; c.beginPath(); c.arc(x + ex * u * 0.3, y + ey * u * 0.3, u * 0.09, 0, 7); c.fill();
    }
    if (S.lit && now - S.lit.t < 300) {
      const q = 1 - (now - S.lit.t) / 300; c.fillStyle = `rgba(254, 240, 138, ${0.5 * q})`;
      for (const k of S.lit.cells) c.fillRect((k % W_) * u, Math.floor(k / W_) * u, u, u);
    }
    S.pops = S.pops.filter(p => now - p.t < 900);
    for (const p of S.pops) { const q = (now - p.t) / 900; c.globalAlpha = 1 - q; c.fillStyle = p.col; c.font = `700 ${Math.round(u * 0.5)}px system-ui`; c.textAlign = "center"; c.fillText(p.text, (p.c + 0.5) * u, (p.r + 0.3 - q) * u); }
    c.globalAlpha = 1; c.textAlign = "center";
    if (g.over) {
      c.fillStyle = "rgba(20, 10, 5, 0.8)"; c.fillRect(0, cv.height * 0.4, cv.width, cv.height * 0.2);
      c.fillStyle = "#ffffff"; c.font = `700 ${Math.round(u * 0.8)}px system-ui`; c.fillText(`Game over: ${g.score} points`, cv.width / 2, cv.height * 0.49);
      c.font = `${Math.round(u * 0.45)}px system-ui`; c.fillText("New game: the button, a tap, or Enter", cv.width / 2, cv.height * 0.55);
    } else if (S.banner && now - S.banner.t < 1600 && S.banner.text) {
      c.fillStyle = "#fef9c3"; c.font = `700 ${Math.round(u * 0.7)}px system-ui`; c.fillText(S.banner.text, cv.width / 2, cv.height * 0.12);
    }
  }
  function bar() {
    const g = S.game; if (!g) return;
    $("points").textContent = `⭐ ${g.score}`; $("lives").textContent = "⛏️".repeat(Math.max(0, g.lives));
    $("level").textContent = `level ${g.level + 1}`; $("left").textContent = `💎 ${g.gems} left`;
    const ms = S.stepMs.length ? [...S.stepMs].sort((a, b) => a - b)[S.stepMs.length >> 1] : 0;
    $("info").textContent = `Your best on this device: ${S.best} points.` + (ms ? ` A step of Hazel's rules: ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms.` : "");
    if (window.OracleFs) window.OracleFs.empty(!g || !!g.over);
  }

  // ---- a game, and every frame a step of the rules
  function newGame() {
    const h = H(); if (!h) return;
    S.game = h.start(1 + Math.floor(Math.random() * 2000000000)); S.pops = []; S.banner = null; S.flash = false; S.dir = -1; S.keys = []; S.restartAt = 0;
    if (W && W.on) W.start(0);
    bar(); draw();
  }
  function heard(g, g2) {
    const now = performance.now();
    if (g2.hit === 1) S.pops.push({ c: g2.px, r: g2.py, text: "+50", t: now, col: "#67e8f9" });
    if (g2.hit === 4) S.pops.push({ c: g2.px, r: g2.py, text: "+100", t: now, col: "#c4b5fd" });
    if (g2.hit === 5) S.banner = { text: "🪨 Squashed! +200", t: now };
    if (g2.hit === 2) S.banner = { text: g2.lives > 0 ? "👻 Caught!" : "", t: now };
    if (g2.hit === 3) S.banner = { text: `🎉 Level ${g2.level} cleared!`, t: now };
    if (g2.hit === 7) { const cells = []; let c = g2.px, r = g2.py; for (let i = 0; i < 3; i++) { c += [0, 1, 0, -1][g2.pd]; r += [-1, 0, 1, 0][g2.pd]; if (c < 0 || c >= W_ || r < 0 || r >= H_ || g2.cells[r * W_ + c] !== 0) break; cells.push(r * W_ + c); } S.lit = { cells, t: now }; }
  }
  function oneStep(h) {
    const g = S.game;
    let dir = -1, flash = false;
    if (W && W.on) { const t1 = performance.now(), c = h.robot(g); W.think(0, performance.now() - t1); dir = c.dir; flash = c.flash; }
    else { dir = S.dir; flash = S.flash; S.flash = false; }
    const t0 = performance.now(), g2 = h.step(g, dir, flash);
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 60) S.stepMs.shift();
    heard(g, g2); S.game = g2;
    if (g2.over && !(W && W.on) && g2.score > S.best) { S.best = g2.score; keep("best", S.best); }
    if (g2.over && W && W.on) { W.end(`🤖 Hazel's game: ${g2.score} points, to level ${g2.level + 1}`); S.restartAt = performance.now() + 3000; }
  }
  let lastBar = 0, acc = 0, lastT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const h = H(), g = S.game;
    if (g && g.over && W && W.on && S.restartAt && t > S.restartAt) newGame();
    if (!h || !g || g.over || document.hidden) { lastT = t; if (g) draw(); return; }
    if (P && P.paused()) { lastT = t; draw(); return; }
    // (0.0.54) as many times its own speed as 🤖's pace says (W.rate), several steps a frame; at full speed, as many as fit in 10 ms
    const auto = W && W.on, rate = auto ? (W.rate || 1) : 1, fast = rate === Infinity, cap = fast ? 100000 : Math.max(6, Math.ceil(rate * 2));
    acc += fast ? 0 : Math.min(100, t - (lastT || t)) * rate * 60 / 1000; lastT = t;
    let n = 0; const tq = performance.now();
    try { while ((fast ? performance.now() - tq < 10 : acc >= 1) && n < cap && !S.game.over) { oneStep(h); acc -= 1; n++; } } catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; drawStatus(); return; }
    if (n >= cap || fast) acc = 0;
    if (auto) W.show();
    draw();
    if (t - lastBar > 150) { lastBar = t; bar(); }
  }
  requestAnimationFrame(frame);

  // ---- the controls: a way held (the arrow keys or W A S D, the four buttons; a swipe sets a way, kept until another, or a tap
  // to stop), the lantern (💡 or the space bar)
  const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  const heldNow = () => { S.dir = S.keys.length ? S.keys[S.keys.length - 1] : -1; };
  addEventListener("keydown", e => {
    if (typing(e) || (W && W.on)) return;
    if (e.key in KEYS) { if (e.key.startsWith("Arrow")) e.preventDefault(); const d = KEYS[e.key]; if (!S.keys.includes(d)) S.keys.push(d); heldNow(); }
    else if (e.key === "Enter" && S.game && S.game.over) newGame();
    else if (e.key === "Enter" || e.key === "f" || e.key === "F" || e.key === "l" || e.key === "L") { e.preventDefault(); S.flash = true; }
  });
  addEventListener("keyup", e => { if (e.key in KEYS) { S.keys = S.keys.filter(d => d !== KEYS[e.key]); heldNow(); } });
  cv.addEventListener("pointerdown", e => { if (W && W.on) return; if (S.game && S.game.over) { newGame(); return; } S.swipe = { x: e.clientX, y: e.clientY, moved: false }; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (!S.swipe) return;
    const dx = e.clientX - S.swipe.x, dy = e.clientY - S.swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    S.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0); S.swipe = { x: e.clientX, y: e.clientY, moved: true };
  });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, () => { if (S.swipe && !S.swipe.moved) S.dir = -1; S.swipe = null; });
  for (const b of document.querySelectorAll(".dg-pad button[data-dir]")) {
    const d = +b.dataset.dir;
    b.addEventListener("pointerdown", e => { e.preventDefault(); if (W && W.on) return; b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("held"); S.keys = [d]; heldNow(); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { b.classList.remove("held"); S.keys = S.keys.filter(k => k !== d); heldNow(); });
  }
  $("flash").addEventListener("pointerdown", e => { e.preventDefault(); if (!(W && W.on)) S.flash = true; });
  $("new").addEventListener("click", newGame);
  addEventListener("resize", () => draw());
  if (window.OracleFs) window.OracleFs.offer({ label: "⛏️ New game", title: "A new game, from the first level", cast: newGame });
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["Hazel"], label: "🤖 Hazel plays for you", what: "the game",
    more: () => S.game ? `; ${S.game.score} points, level ${S.game.level + 1}` : "",
    onChange: on => {
      S.keys = []; S.dir = -1; S.flash = false;
      if (!on) { W.stop(); return; }
      if (!H()) return;
      if (!S.game || S.game.over) newGame();
      W.start(0);
    },
  }) : null;
  // (0.0.53) ⏸ the pause (shared/pause.js): its button and the space bar; no step runs while paused
  const P = window.HazelPause ? window.HazelPause.make({ into: $("new").parentElement, over: $("ground").parentElement }) : null;

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), every step, without loading Hazel's library or building the program. Hazel loads if you edit the rules.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules move everything underground…"; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s, and interpreted every step: slower than compiled, so the game may go in slow motion.`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so nothing can move: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build");
  }
  let L = null, timer = 0;
  function build() {
    if (!window.Hazel || !L) return;
    const sp = L.spec(PROGRAM, TAIL), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now(); let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!r.ok && !!v && typeof v.step === "function" && typeof v.start === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0, at: performance.now() };
    S.stepMs = []; drawStatus();
    if (S.built.ok) newGame(); else draw();
  }
  function loadCompiled() {
    const c = document.createElement("script");
    c.src = "compiled.js?v=0.0.54"; c.async = true;
    c.onload = () => { const v = window.DigCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newGame(); }
      else if (!v) { S.compiledError = "it ran, but gave no Deep dig"; loadLib(); } };
    c.onerror = () => { S.compiledError = "it is not here yet"; loadLib(); };
    document.head.append(c);
  }
  let libAsked = false;
  function loadLib() {
    if (libAsked) return; libAsked = true; drawStatus();
    const s = document.createElement("script"); s.src = LIB; s.async = true;
    s.onload = () => { S.libAt = performance.now(); drawStatus(); setTimeout(build, 30); }; s.onerror = () => { S.libFailed = true; drawStatus(); };
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

  // ---- ⚙️ Advanced: this device's speed (300 steps of a game, the robot choosing each one)
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Deep dig", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "300 steps of a game with the robot choosing each one, through Hazel",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: 300 steps of a game…");
      let g = h.start(12345); const t0 = performance.now();
      for (let n = 0; n < 300 && !g.over; n++) { const c = h.robot(g); g = h.step(g, c.dir, c.flash); }
      const ms = (performance.now() - t0) / 300;
      return { data: { step: +ms.toFixed(3) }, text: [`a step and the robot's choice through Hazel: ${ms.toFixed(2)} ms`] };
    },
  });
  // (for checking the page where no frames are drawn, a browser pane hidden: ?test=1 lets a script run steps and draw)
  if (Q.has("test")) window.DigTest = { S, newGame, steps: n => { const h = H(); for (let i = 0; i < n && S.game && !S.game.over; i++) oneStep(h); draw(); bar(); return S.game; }, auto: () => W };
  document.body.classList.add("js");
  draw(); bar();
})();
