// hazeljs-examples, Bricks (ticket 824; Matthew, 2026-11-22: "let's do more classic games with simple physics and rules: break
// out, snake, tron", and "For each game, be sure to include 'automated gameplay' mode ... that gameplay should also be Hazel
// code"). The page: the field drawn on a canvas, every frame a step of Hazel's rules (Bricks.step: the paddle, then the ball in
// four small steps off the walls, the paddle and the bricks; a ball lost, a level cleared), the levels as Hazel data
// (Bricks.layout), and 🤖 Hazel plays for you, the robot in Hazel (Bricks.robot) choosing where the paddle goes and when the
// ball goes off. The rules compiled ahead of time by hazel-jit (compiled.js) when it is here, else, and once they are edited,
// run by hazeljs (slower: a step there takes milliseconds to tens of them).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "bricks", MODULES = ["Bricks"];
  const TAIL = "(start = Bricks.start, step = Bricks.step, layout = Bricks.layout, robot = Bricks.robot)";
  const KEY = "hazeljs-examples/bricks/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: the rules, the game (a Hazel value: the ball in thousandths of a unit, the field 600 by 800), where the
  // paddle is asked to go, what is held, words floating up, the best score
  const S = { built: null, libAt: 0, libFailed: false, compiledError: "", game: null, wide: kept("wide", false), best: kept("best", 0),
              target: 300, launch: false, held: { left: false, right: false }, pops: [], flash: new Map(), stepMs: [], restartAt: 0, banner: null };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  $("wide").checked = !!S.wide;
  const COLS = 10, ROWS = 8;
  const ROW_COL = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];

  // ---- drawing: the field, 600 by 800, scaled to the canvas
  const cv = $("field"), ctx = cv.getContext("2d");
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, Math.round(r.width * d)), h = Math.round(w * 4 / 3);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  function draw() {
    fit();
    const k = cv.width / 600, g = S.game, c = ctx;
    c.fillStyle = "#140d26"; c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = "rgba(160, 140, 255, 0.07)"; c.lineWidth = 1;
    for (let x = 0; x <= 600; x += 40) { c.beginPath(); c.moveTo(x * k, 0); c.lineTo(x * k, 800 * k); c.stroke(); }
    for (let y = 0; y <= 800; y += 40) { c.beginPath(); c.moveTo(0, y * k); c.lineTo(600 * k, y * k); c.stroke(); }
    if (!g) return;
    const now = performance.now();
    // the bricks: each row its colour, a two-hit brick darker with a band, a post grey
    g.bricks.forEach((b, i) => {
      if (!b) return;
      const r = Math.floor(i / COLS), col = i % COLS, x = (2 + col * 60) * k, y = (80 + r * 26) * k, w = 56 * k, h = 22 * k;
      const lit = now - (S.flash.get(i) || 0) < 140;
      c.fillStyle = b === 9 ? "#8b93a7" : lit ? "#ffffff" : ROW_COL[r % ROW_COL.length];
      c.beginPath(); c.roundRect(x, y, w, h, 5 * k); c.fill();
      if (b === 2) { c.fillStyle = "rgba(0, 0, 0, 0.28)"; c.beginPath(); c.roundRect(x, y, w, h, 5 * k); c.fill(); c.fillStyle = "rgba(255, 255, 255, 0.5)"; c.fillRect(x + 6 * k, y + h / 2 - 1.5 * k, w - 12 * k, 3 * k); }
      if (b === 9) { c.fillStyle = "#c3c9d6"; for (const dx of [10, 46]) { c.beginPath(); c.arc(x + dx * k, y + h / 2, 2.5 * k, 0, 7); c.fill(); } }
      c.fillStyle = "rgba(255, 255, 255, 0.22)"; c.fillRect(x + 2 * k, y + 2 * k, w - 4 * k, 4 * k);
    });
    // the paddle, and the ball
    const px = g.px * k, pw = g.pw * k;
    const pg = c.createLinearGradient(0, 740 * k, 0, 754 * k); pg.addColorStop(0, "#a5b4fc"); pg.addColorStop(1, "#4f46e5");
    c.fillStyle = pg; c.beginPath(); c.roundRect(px - pw / 2, 740 * k, pw, 14 * k, 7 * k); c.fill();
    const bx = g.bx / 1000 * k, by = g.by / 1000 * k;
    c.fillStyle = "rgba(255, 255, 255, 0.18)"; c.beginPath(); c.arc(bx, by, 14 * k, 0, 7); c.fill();
    c.fillStyle = "#ffffff"; c.beginPath(); c.arc(bx, by, 8 * k, 0, 7); c.fill();
    // words floating up, and the banner
    S.pops = S.pops.filter(p => now - p.t < 900);
    for (const p of S.pops) { const u = (now - p.t) / 900; c.globalAlpha = 1 - u; c.fillStyle = p.col || "#ffffff"; c.font = `700 ${Math.round(16 * k)}px system-ui`; c.textAlign = "center"; c.fillText(p.text, p.x * k, (p.y - u * 30) * k); }
    c.globalAlpha = 1;
    c.textAlign = "center"; c.fillStyle = "#e0e7ff";
    if (g.over) {
      c.fillStyle = "rgba(10, 6, 24, 0.7)"; c.fillRect(0, 330 * k, 600 * k, 140 * k);
      c.fillStyle = "#ffffff"; c.font = `700 ${Math.round(30 * k)}px system-ui`; c.fillText(`Game over: ${g.score} points`, 300 * k, 395 * k);
      c.font = `${Math.round(17 * k)}px system-ui`; c.fillText("New game: the button, a tap, or Enter", 300 * k, 435 * k);
    } else if (S.banner && now - S.banner.t < 1800) {
      c.font = `700 ${Math.round(28 * k)}px system-ui`; c.fillText(S.banner.text, 300 * k, 560 * k);
    } else if (g.held && !(W && W.on)) {
      c.font = `${Math.round(17 * k)}px system-ui`; c.fillText("Tap, ⬆️ or the space bar to send the ball off", 300 * k, 640 * k);
    }
  }
  function bar() {
    const g = S.game; if (!g) return;
    $("points").textContent = `⭐ ${g.score}`;
    $("balls").textContent = "⚪".repeat(Math.max(0, g.balls));
    $("level").textContent = `level ${g.level + 1}`;
    $("left").textContent = `${g.bricks.filter(b => b > 0 && b !== 9).length} bricks left`;
    const ms = S.stepMs.length ? [...S.stepMs].sort((a, b) => a - b)[S.stepMs.length >> 1] : 0;
    $("info").textContent = `Your best on this device: ${S.best} points.` + (ms ? ` A step of Hazel's rules: ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms.` : "");
    if (window.OracleFs) window.OracleFs.empty(!g || !!g.over);
  }

  // ---- a game: a new one from the first level, and every frame a step of the rules
  function newGame() {
    const h = H(); if (!h) return;
    S.game = h.start(0, !!S.wide); S.target = 300; S.launch = false; S.pops = []; S.flash.clear(); S.banner = null; S.restartAt = 0;
    if (W && W.on) W.start(0);
    bar(); draw();
  }
  // what a step did: a brick hit flashes, a broken one floats its points; a ball lost; a level cleared
  function heard(g, g2) {
    const now = performance.now();
    g2.bricks.forEach((b, i) => { if (b !== g.bricks[i]) { S.flash.set(i, now); const r = Math.floor(i / COLS), col = i % COLS;
      S.pops.push({ x: 2 + col * 60 + 28, y: 80 + r * 26, text: b === 0 ? "+10" : "+5", t: now, col: ROW_COL[r % ROW_COL.length] }); } });
    if (g2.hit === 5) S.banner = { text: g2.over ? "" : "⚪ A ball lost", t: now };
    if (g2.hit === 6) S.banner = { text: `🎉 Level ${g2.level} cleared!`, t: now };
  }
  function oneStep(h) {
    const g = S.game;
    let target = S.target, launch = false;
    if (W && W.on) {
      const t1 = performance.now(), c = h.robot(g); W.think(0, performance.now() - t1);
      target = c.target; launch = c.launch;
    } else {
      // (⬅️ ➡️ held: the paddle asked to go on that way; a launch asked for, once)
      if (S.held.left) S.target = target = g.px - 40; else if (S.held.right) S.target = target = g.px + 40;
      launch = S.launch; S.launch = false;
    }
    const t0 = performance.now(), g2 = h.step(g, Math.round(target), launch);
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 60) S.stepMs.shift();
    heard(g, g2);
    S.game = g2;
    if (g2.over && !(W && W.on) && g2.score > S.best) { S.best = g2.score; keep("best", S.best); }
    if (g2.over && W && W.on) { W.end(`🤖 Hazel's game: ${g2.score} points, to level ${g2.level + 1}`); S.restartAt = performance.now() + 3000; }
    return g2;
  }
  let lastBar = 0, acc = 0, lastT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const h = H(), g = S.game;
    if (g && g.over && W && W.on && S.restartAt && t > S.restartAt) newGame();
    if (!h || !g || g.over || document.hidden) { lastT = t; if (g) draw(); return; }
    if (P && P.paused()) { lastT = t; draw(); return; }
    // (60 steps a second whatever the screen's rate; 🤖's pace: slowly half speed, at a walk the game's own, briskly twice,
    // at full speed four times; at most a few a frame, so a slow device runs slower rather than skipping)
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

  // ---- the controls: a finger or the mouse along the field sets where the paddle goes; a tap or a click sends the ball off;
  // the keys (← → move, the space bar or ↑ send the ball, Enter a new game when one is over); the buttons (⬅️ ➡️ held, ⬆️)
  const fieldX = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 600; };
  cv.addEventListener("pointerdown", e => {
    if (W && W.on) return;
    if (S.game && S.game.over) { newGame(); return; }
    S.target = fieldX(e); if (S.game && S.game.held) S.launch = true;
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", e => { if (W && W.on) return; if (e.pointerType === "mouse" || e.buttons) S.target = fieldX(e); });
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  addEventListener("keydown", e => {
    if (typing(e) || (W && W.on)) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); S.held.left = true; }
    else if (e.key === "ArrowRight") { e.preventDefault(); S.held.right = true; }
    else if (e.key === "Enter" && S.game && S.game.over) newGame();
    else if (e.key === "ArrowUp" || e.key === "Enter" || e.key === "f" || e.key === "F") { e.preventDefault(); S.launch = true; }
  });
  addEventListener("keyup", e => {
    if (e.key === "ArrowLeft") { S.held.left = false; if (S.game) S.target = S.game.px; }
    else if (e.key === "ArrowRight") { S.held.right = false; if (S.game) S.target = S.game.px; }
  });
  const hold = (id, side) => { const b = $(id);
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("held"); if (!(W && W.on)) S.held[side] = true; });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { b.classList.remove("held"); S.held[side] = false; if (S.game) S.target = S.game.px; }); };
  hold("left", "left"); hold("right", "right");
  $("launch").addEventListener("click", () => { if (!(W && W.on)) S.launch = true; });
  $("new").addEventListener("click", newGame);
  $("wide").addEventListener("change", () => { S.wide = $("wide").checked; keep("wide", S.wide); newGame(); });
  addEventListener("resize", () => draw());
  if (window.OracleFs) window.OracleFs.offer({ label: "🧱 New game", title: "A new game, from the first level", cast: newGame });
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["Hazel"], label: "🤖 Hazel plays for you", what: "the game",
    more: () => S.game ? `; ${S.game.score} points, level ${S.game.level + 1}` : "",
    onChange: on => {
      S.held = { left: false, right: false }; S.launch = false;
      if (!on) { W.stop(); return; }
      if (!H()) return;
      if (!S.game || S.game.over) newGame();
      W.start(0);
    },
  }) : null;
  // (0.0.53) ⏸ the pause (shared/pause.js): its button and the space bar; no step runs while paused
  const P = window.HazelPause ? window.HazelPause.make({ into: $("new").parentElement, over: $("field").parentElement }) : null;

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), every step, without loading Hazel's library or building the program. Hazel loads if you edit the rules.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules move the ball…"; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s, and interpreted every step: slower than compiled, so the ball may move in slow motion.`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so the ball cannot move: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build");
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
    c.src = "compiled.js?v=0.0.50"; c.async = true;
    c.onload = () => { const v = window.BricksCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newGame(); }
      else if (!v) { S.compiledError = "it ran, but gave no Bricks"; loadLib(); } };
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
    holder: $("advanced"), name: "Bricks", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "300 steps of a game with the robot choosing each one, through Hazel",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: 300 steps of a game…");
      let g = h.start(0, false); const t0 = performance.now();
      for (let n = 0; n < 300; n++) { const c = h.robot(g); g = h.step(g, c.target, c.launch); }
      const ms = (performance.now() - t0) / 300;
      return { data: { step: +ms.toFixed(3) }, text: [`a step and the robot's choice through Hazel: ${ms.toFixed(2)} ms`] };
    },
  });
  // (for checking the page where no frames are drawn, a browser pane hidden: ?test=1 lets a script run steps and draw)
  if (Q.has("test")) window.BricksTest = { S, newGame, steps: n => { const h = H(); for (let i = 0; i < n && S.game && !S.game.over; i++) oneStep(h); draw(); bar(); return S.game; }, auto: () => W };
  document.body.classList.add("js");
  draw(); bar();
})();
