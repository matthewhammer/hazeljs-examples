// hazeljs-examples, Star wave (ticket 827; Matthew, 2026-11-22: "Next: space invaders clone, centipede clone, dig dug clone",
// and "all with hazel rules and hazel AI that plays the game"): a fixed shooter of our own in that genre. The page: the sky
// drawn on a canvas, every frame a step of Hazel's rules (StarWave.step: the cannon and its shot, the formation marching,
// its bombs, the shields; a hit, a wave cleared, the invaders landing), and 🤖 Hazel plays for you, the robot in Hazel
// (StarWave.robot) choosing each step's move and shot. The rules compiled ahead of time by hazel-jit (compiled.js) when it is
// here, else, and once they are edited, run by hazeljs (slower).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "starwave", MODULES = ["StarWave"];
  const TAIL = "(start = StarWave.start, step = StarWave.step, robot = StarWave.robot)";
  const KEY = "hazeljs-examples/starwave/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: the rules, the game (a Hazel value: the field 600 by 800), what is held, where a finger points, words
  // floating up, the best score
  const S = { built: null, libAt: 0, libFailed: false, compiledError: "", game: null, best: kept("best", 0),
              held: { left: false, right: false }, aimX: null, fire: false, pops: [], stepMs: [], restartAt: 0, banner: null, booms: [] };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  const SHIELD_X = [58, 198, 338, 478];

  // ---- drawing: the sky, its stars; the invaders (our own three kinds, each with two poses, changing at each march); the
  // shields' blocks; the cannon, its shot, the bombs; a burst where something is hit
  const cv = $("field"), ctx = cv.getContext("2d");
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, Math.round(r.width * d)), h = Math.round(w * 4 / 3);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  const hash = (a, b) => { let x = (a * 374761393 + b * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177 | 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  function invader(c, kind, x, y, k, pose) {
    const cx = (x + 16) * k, cy = (y + 12) * k;
    if (kind === 3) {   // (a diamond with an eye, its points pulsing)
      const p = pose ? 1 : 0.8;
      c.fillStyle = "#e879f9"; c.beginPath(); c.moveTo(cx, cy - 12 * k); c.lineTo(cx + 15 * k * p, cy); c.lineTo(cx, cy + 12 * k); c.lineTo(cx - 15 * k * p, cy); c.closePath(); c.fill();
      c.fillStyle = "#ffffff"; c.beginPath(); c.arc(cx, cy, 4.5 * k, 0, 7); c.fill(); c.fillStyle = "#3b0764"; c.beginPath(); c.arc(cx, cy + 1 * k, 2.2 * k, 0, 7); c.fill();
    } else if (kind === 2) {   // (a six-sided drone, two antennae up or out)
      c.fillStyle = "#22d3ee"; c.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.lineTo(cx + Math.cos(a) * 14 * k, cy + Math.sin(a) * 10 * k); }
      c.closePath(); c.fill();
      c.strokeStyle = "#a5f3fc"; c.lineWidth = 2 * k; c.beginPath(); const sp = pose ? 9 : 5;
      c.moveTo(cx - 5 * k, cy - 8 * k); c.lineTo(cx - sp * k, cy - 14 * k); c.moveTo(cx + 5 * k, cy - 8 * k); c.lineTo(cx + sp * k, cy - 14 * k); c.stroke();
      c.fillStyle = "#083344"; c.fillRect(cx - 7 * k, cy - 2 * k, 4 * k, 4 * k); c.fillRect(cx + 3 * k, cy - 2 * k, 4 * k, 4 * k);
    } else {   // (a round blob on three legs, the legs stepping)
      c.fillStyle = "#4ade80"; c.beginPath(); c.ellipse(cx, cy - 2 * k, 14 * k, 9 * k, 0, 0, 7); c.fill();
      c.strokeStyle = "#4ade80"; c.lineWidth = 3 * k; c.beginPath();
      for (const dx of [-8, 0, 8]) { c.moveTo(cx + dx * k, cy + 5 * k); c.lineTo(cx + (dx + (pose ? 3 : -3)) * k, cy + 11 * k); }
      c.stroke();
      c.fillStyle = "#052e16"; c.beginPath(); c.arc(cx - 5 * k, cy - 3 * k, 2.5 * k, 0, 7); c.arc(cx + 5 * k, cy - 3 * k, 2.5 * k, 0, 7); c.fill();
    }
  }
  function draw() {
    fit();
    const k = cv.width / 600, g = S.game, c = ctx, now = performance.now();
    c.fillStyle = "#05070f"; c.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < 90; i++) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(now / 900 + i)); c.fillStyle = `rgba(200, 210, 255, ${0.25 + 0.5 * tw * hash(i, 7)})`; c.fillRect(hash(i, 1) * cv.width, hash(i, 2) * cv.height * 0.85, 1.6 * k, 1.6 * k); }
    c.fillStyle = "#1e293b"; c.fillRect(0, 762 * k, cv.width, 38 * k);
    if (!g) return;
    const pose = Math.floor(g.fx / 8) % 2 === 0;
    g.aliens.forEach((a, i) => { if (a) invader(c, a, g.fx + (i % 9) * 48, g.fy + Math.floor(i / 9) * 40, k, pose); });
    c.fillStyle = "#22c55e";
    g.shields.forEach((b, i) => { if (!b) return; const s = Math.floor(i / 32), r = Math.floor((i % 32) / 8), col = i % 8; c.fillRect((SHIELD_X[s] + col * 8) * k, (640 + r * 8) * k, 8 * k + 0.5, 8 * k + 0.5); });
    // the cannon (blinking while it waits after a hit), its shot, the bombs
    if (!(g.wait > 0 && Math.floor(now / 120) % 2)) {
      const x = g.cx * k, y = 740 * k;
      c.fillStyle = "#2dd4bf"; c.beginPath(); c.roundRect(x - 20 * k, y - 4 * k, 40 * k, 16 * k, 4 * k); c.fill();
      c.fillRect(x - 4 * k, y - 16 * k, 8 * k, 14 * k); c.fillStyle = "#99f6e4"; c.fillRect(x - 14 * k, y, 28 * k, 3 * k);
    }
    if (g.sy >= 0) { c.fillStyle = "#fde047"; c.fillRect(g.sx * k - 1.5 * k, g.sy * k, 3 * k, 12 * k); }
    c.strokeStyle = "#f87171"; c.lineWidth = 2.5 * k;
    for (const b of g.bombs) { c.beginPath(); c.moveTo(b.x * k, (b.y - 10) * k); c.lineTo((b.x + 3) * k, (b.y - 6) * k); c.lineTo((b.x - 3) * k, (b.y - 2) * k); c.lineTo(b.x * k, (b.y + 2) * k); c.stroke(); }
    S.booms = S.booms.filter(b => now - b.t < 400);
    for (const b of S.booms) { const q = (now - b.t) / 400; c.strokeStyle = `rgba(255, 220, 120, ${1 - q})`; c.lineWidth = 2 * k; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r1 = 6 + q * 14, r2 = r1 + 6; c.beginPath(); c.moveTo((b.x + Math.cos(a) * r1) * k, (b.y + Math.sin(a) * r1) * k); c.lineTo((b.x + Math.cos(a) * r2) * k, (b.y + Math.sin(a) * r2) * k); c.stroke(); } }
    S.pops = S.pops.filter(p => now - p.t < 800);
    for (const p of S.pops) { const q = (now - p.t) / 800; c.globalAlpha = 1 - q; c.fillStyle = p.col; c.font = `700 ${Math.round(15 * k)}px system-ui`; c.textAlign = "center"; c.fillText(p.text, p.x * k, (p.y - q * 24) * k); }
    c.globalAlpha = 1; c.textAlign = "center";
    if (g.over) {
      c.fillStyle = "rgba(5, 7, 15, 0.75)"; c.fillRect(0, 330 * k, 600 * k, 140 * k);
      c.fillStyle = "#ffffff"; c.font = `700 ${Math.round(28 * k)}px system-ui`; c.fillText(g.hit === 4 ? `They landed: ${g.score} points` : `Game over: ${g.score} points`, 300 * k, 395 * k);
      c.font = `${Math.round(17 * k)}px system-ui`; c.fillText("New game: the button, a tap, or Enter", 300 * k, 435 * k);
    } else if (S.banner && now - S.banner.t < 1600 && S.banner.text) {
      c.fillStyle = "#e0e7ff"; c.font = `700 ${Math.round(26 * k)}px system-ui`; c.fillText(S.banner.text, 300 * k, 560 * k);
    }
  }
  function bar() {
    const g = S.game; if (!g) return;
    $("points").textContent = `⭐ ${g.score}`; $("lives").textContent = "🛡️".repeat(Math.max(0, g.lives));
    $("level").textContent = `wave ${g.wave + 1}`; $("left").textContent = `${g.aliens.filter(a => a > 0).length} invaders left`;
    const ms = S.stepMs.length ? [...S.stepMs].sort((a, b) => a - b)[S.stepMs.length >> 1] : 0;
    $("info").textContent = `Your best on this device: ${S.best} points.` + (ms ? ` A step of Hazel's rules: ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms.` : "");
    if (window.OracleFs) window.OracleFs.empty(!g || !!g.over);
  }

  // ---- a game, and every frame a step of the rules
  function newGame() {
    const h = H(); if (!h) return;
    S.game = h.start(1 + Math.floor(Math.random() * 2000000000)); S.pops = []; S.booms = []; S.banner = null; S.fire = false; S.restartAt = 0;
    if (W && W.on) W.start(0);
    bar(); draw();
  }
  function heard(g, g2) {
    const now = performance.now();
    g.aliens.forEach((a, i) => { if (a && !g2.aliens[i] && g2.wave === g.wave) { const x = g.fx + (i % 9) * 48 + 16, y = g.fy + Math.floor(i / 9) * 40 + 12; S.booms.push({ x, y, t: now }); S.pops.push({ x, y: y - 10, text: "+" + a * 10, t: now, col: "#fde047" }); } });
    if (g2.hit === 2) { S.booms.push({ x: g2.cx, y: 740, t: now }); S.banner = { text: g2.lives > 0 ? "💥 Hit!" : "", t: now }; }
    if (g2.hit === 3) S.banner = { text: `🎉 Wave ${g2.wave} cleared!`, t: now };
  }
  function oneStep(h) {
    const g = S.game;
    let move = 0, fire = false;
    if (W && W.on) { const t1 = performance.now(), c = h.robot(g); W.think(0, performance.now() - t1); move = c.move; fire = c.fire; }
    else {
      move = S.held.left ? -1 : S.held.right ? 1 : S.aimX !== null ? (S.aimX > g.cx + 4 ? 1 : S.aimX < g.cx - 4 ? -1 : 0) : 0;
      fire = S.fire; if (g.sy < 0 || !S.fire) S.fire = false;
    }
    const t0 = performance.now(), g2 = h.step(g, move, fire);
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 60) S.stepMs.shift();
    heard(g, g2); S.game = g2;
    if (g2.over && !(W && W.on) && g2.score > S.best) { S.best = g2.score; keep("best", S.best); }
    if (g2.over && W && W.on) { W.end(`🤖 Hazel's game: ${g2.score} points, to wave ${g2.wave + 1}`); S.restartAt = performance.now() + 3000; }
  }
  let lastBar = 0, acc = 0, lastT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const h = H(), g = S.game;
    if (g && g.over && W && W.on && S.restartAt && t > S.restartAt) newGame();
    if (!h || !g || g.over || document.hidden) { lastT = t; if (g) draw(); return; }
    const auto = W && W.on, rate = auto ? ({ 900: 0.5, 450: 1, 120: 2, 0: 4 }[W.pace] || 1) : 1;
    acc += Math.min(100, t - (lastT || t)) * rate * 60 / 1000; lastT = t;
    let n = 0;
    try { while (acc >= 1 && n < 6 && !S.game.over) { oneStep(h); acc -= 1; n++; } } catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; drawStatus(); return; }
    if (n === 6) acc = 0;
    if (auto) W.show();
    draw();
    if (t - lastBar > 150) { lastBar = t; bar(); }
  }
  requestAnimationFrame(frame);

  // ---- the controls: ⬅️ ➡️ held (or the keys), a finger along the field (the cannon follows it), ⬆️, the space bar or a tap
  // to fire (one shot in the air at a time; a fire asked for waits until it can go)
  const fieldX = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 600; };
  cv.addEventListener("pointerdown", e => { if (W && W.on) return; if (S.game && S.game.over) { newGame(); return; } S.aimX = fieldX(e); S.fire = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => { if (W && W.on) return; if (e.buttons) S.aimX = fieldX(e); });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, () => { S.aimX = null; });
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  addEventListener("keydown", e => {
    if (typing(e) || (W && W.on)) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); S.held.left = true; }
    else if (e.key === "ArrowRight") { e.preventDefault(); S.held.right = true; }
    else if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); S.fire = true; }
    else if (e.key === "Enter" && S.game && S.game.over) newGame();
  });
  addEventListener("keyup", e => { if (e.key === "ArrowLeft") S.held.left = false; else if (e.key === "ArrowRight") S.held.right = false; });
  const hold = (id, side) => { const b = $(id);
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("held"); if (!(W && W.on)) S.held[side] = true; });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { b.classList.remove("held"); S.held[side] = false; }); };
  hold("left", "left"); hold("right", "right");
  $("launch").addEventListener("pointerdown", e => { e.preventDefault(); if (!(W && W.on)) S.fire = true; });
  $("new").addEventListener("click", newGame);
  addEventListener("resize", () => draw());
  if (window.OracleFs) window.OracleFs.offer({ label: "🚀 New game", title: "A new game, from the first wave", cast: newGame });
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["Hazel"], label: "🤖 Hazel plays for you", what: "the game",
    more: () => S.game ? `; ${S.game.score} points, wave ${S.game.wave + 1}` : "",
    onChange: on => {
      S.held = { left: false, right: false }; S.fire = false; S.aimX = null;
      if (!on) { W.stop(); return; }
      if (!H()) return;
      if (!S.game || S.game.over) newGame();
      W.start(0);
    },
  }) : null;

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), every step, without loading Hazel's library or building the program. Hazel loads if you edit the rules.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules move the invaders…"; return; }
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
    c.src = "compiled.js?v=0.0.53"; c.async = true;
    c.onload = () => { const v = window.StarWaveCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newGame(); }
      else if (!v) { S.compiledError = "it ran, but gave no Star wave"; loadLib(); } };
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
    holder: $("advanced"), name: "Star wave", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "300 steps of a game with the robot choosing each one, through Hazel",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: 300 steps of a game…");
      let g = h.start(12345); const t0 = performance.now();
      for (let n = 0; n < 300 && !g.over; n++) { const c = h.robot(g); g = h.step(g, c.move, c.fire); }
      const ms = (performance.now() - t0) / 300;
      return { data: { step: +ms.toFixed(3) }, text: [`a step and the robot's choice through Hazel: ${ms.toFixed(2)} ms`] };
    },
  });
  // (for checking the page where no frames are drawn, a browser pane hidden: ?test=1 lets a script run steps and draw)
  if (Q.has("test")) window.StarWaveTest = { S, newGame, steps: n => { const h = H(); for (let i = 0; i < n && S.game && !S.game.over; i++) oneStep(h); draw(); bar(); return S.game; }, auto: () => W };
  document.body.classList.add("js");
  draw(); bar();
})();
