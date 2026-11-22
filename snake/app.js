// hazeljs-examples, Snake (ticket 825; Matthew, 2026-11-22: "let's do more classic games with simple physics and rules: break
// out, snake, tron", and "For each game, be sure to include 'automated gameplay' mode ... that gameplay should also be Hazel
// code"). The page: the board drawn on a canvas, a step of Hazel's rules (Snake.step: the snake moved a cell, a meal, a crash,
// the next meal) at the speed chosen, and 🤖 Hazel plays for you, the robot in Hazel (Snake.robot) choosing each step's way. The
// rules compiled ahead of time by hazel-jit (compiled.js) when it is here, else, and once they are edited, run by hazeljs.
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "snake", MODULES = ["Snake"];
  const TAIL = "(start = Snake.start, step = Snake.step, robot = Snake.robot)";
  const KEY = "hazeljs-examples/snake/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: the rules, the game (a Hazel value: the board 20 by 20, a cell row times 20 plus column), the turns asked
  // for (up to two, so a quick double turn is kept), the speed (steps a second), the best score, words floating up
  const N = 20;
  const S = { built: null, libAt: 0, libFailed: false, compiledError: "", game: null, wrap: kept("wrap", false), speed: kept("speed", 6), best: kept("best", 0),
              turns: [], pops: [], stepMs: [], restartAt: 0, lastStep: 0, swipe: null };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  $("wrap").checked = !!S.wrap; $("speed").value = String(S.speed);

  // ---- drawing: the board, its cells in two greens; the food an apple; the snake from its tail to its head, the head with eyes
  const cv = $("board"), ctx = cv.getContext("2d");
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, Math.round(r.width * d));
    if (cv.width !== w || cv.height !== w) { cv.width = w; cv.height = w; }
  }
  function draw() {
    fit();
    const c = ctx, u = cv.width / N, g = S.game, now = performance.now();
    for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) { c.fillStyle = (r + k) % 2 ? "#166534" : "#15803d"; c.fillRect(k * u, r * u, u + 0.5, u + 0.5); }
    if (!g) return;
    const cx = cell => (cell % N + 0.5) * u, cy = cell => (Math.floor(cell / N) + 0.5) * u;
    // the apple
    const fx = cx(g.food), fy = cy(g.food), pulse = 1 + 0.06 * Math.sin(now / 180);
    c.fillStyle = "#dc2626"; c.beginPath(); c.arc(fx, fy + u * 0.04, u * 0.36 * pulse, 0, 7); c.fill();
    c.fillStyle = "rgba(255, 255, 255, 0.45)"; c.beginPath(); c.arc(fx - u * 0.12, fy - u * 0.08, u * 0.09, 0, 7); c.fill();
    c.strokeStyle = "#78350f"; c.lineWidth = u * 0.07; c.beginPath(); c.moveTo(fx, fy - u * 0.28); c.lineTo(fx + u * 0.05, fy - u * 0.42); c.stroke();
    c.fillStyle = "#4ade80"; c.beginPath(); c.ellipse(fx + u * 0.16, fy - u * 0.36, u * 0.13, u * 0.07, -0.5, 0, 7); c.fill();
    // the snake: each cell a rounded square, joined to the next where they touch (not across a wrap), darker toward the tail
    const body = g.body, L = body.length;
    for (let i = L - 1; i >= 0; i--) {
      const k = body[i], x = cx(k), y = cy(k), shade = 1 - 0.45 * i / Math.max(1, L - 1);
      c.fillStyle = `rgb(${Math.round(250 * shade)}, ${Math.round(204 * shade)}, ${Math.round(21 * shade)})`;
      c.beginPath(); c.roundRect(x - u * 0.42, y - u * 0.42, u * 0.84, u * 0.84, u * 0.28); c.fill();
      if (i > 0) { const p = body[i - 1], dx = cx(p) - x, dy = cy(p) - y; if (Math.abs(dx) + Math.abs(dy) <= u * 1.01) c.fillRect(Math.min(x, x + dx) - (dx ? 0 : u * 0.32), Math.min(y, y + dy) - (dy ? 0 : u * 0.32), Math.abs(dx) || u * 0.64, Math.abs(dy) || u * 0.64); }
    }
    // the head's eyes, looking its way
    const hx = cx(body[0]), hy = cy(body[0]), d = g.dir, ex = [0, 1, 0, -1][d], ey = [-1, 0, 1, 0][d];
    for (const s of [-1, 1]) { const px = hx + ex * u * 0.14 + (-ey) * s * u * 0.17, py = hy + ey * u * 0.14 + ex * s * u * 0.17;
      c.fillStyle = "#ffffff"; c.beginPath(); c.arc(px, py, u * 0.12, 0, 7); c.fill();
      c.fillStyle = "#111827"; c.beginPath(); c.arc(px + ex * u * 0.04, py + ey * u * 0.04, u * 0.06, 0, 7); c.fill(); }
    // words floating up
    S.pops = S.pops.filter(p => now - p.t < 900);
    for (const p of S.pops) { const q = (now - p.t) / 900; c.globalAlpha = 1 - q; c.fillStyle = "#fef08a"; c.font = `700 ${Math.round(u * 0.8)}px system-ui`; c.textAlign = "center"; c.fillText(p.text, p.x, p.y - q * u); }
    c.globalAlpha = 1;
    if (g.over) {
      c.fillStyle = "rgba(5, 30, 15, 0.7)"; c.fillRect(0, cv.height * 0.38, cv.width, cv.height * 0.24);
      c.fillStyle = "#ffffff"; c.textAlign = "center"; c.font = `700 ${Math.round(u * 1.2)}px system-ui`; c.fillText(`Game over: ${g.score} points`, cv.width / 2, cv.height * 0.49);
      c.font = `${Math.round(u * 0.7)}px system-ui`; c.fillText("New game: the button, a tap, or Enter", cv.width / 2, cv.height * 0.56);
    } else if (g.t === 0 && !(W && W.on)) {
      c.fillStyle = "#ffffff"; c.textAlign = "center"; c.font = `${Math.round(u * 0.7)}px system-ui`; c.fillText("An arrow key, a swipe or a button to start", cv.width / 2, cv.height * 0.8);
    }
  }
  function bar() {
    const g = S.game; if (!g) return;
    $("points").textContent = `⭐ ${g.score}`; $("long").textContent = `🐍 ${g.body.length + g.grow} long`;
    $("bestline").textContent = `best ${S.best}`;
    const ms = S.stepMs.length ? [...S.stepMs].sort((a, b) => a - b)[S.stepMs.length >> 1] : 0;
    $("info").textContent = `Your best on this device: ${S.best} points.` + (ms ? ` A step of Hazel's rules: ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms.` : "");
    if (window.OracleFs) window.OracleFs.empty(!g || !!g.over);
  }

  // ---- a game, and its steps at the speed chosen (it waits for the first turn, unless 🤖 plays)
  function newGame() {
    const h = H(); if (!h) return;
    S.game = h.start(1 + Math.floor(Math.random() * 2000000000), !!S.wrap); S.turns = []; S.pops = []; S.restartAt = 0; S.lastStep = performance.now();
    if (W && W.on) W.start(0);
    bar(); draw();
  }
  function oneStep(h) {
    const g = S.game;
    let want = -1;
    if (W && W.on) { const t1 = performance.now(); want = h.robot(g); W.think(0, performance.now() - t1); }
    else want = S.turns.length ? S.turns.shift() : -1;
    const t0 = performance.now(), g2 = h.step(g, want);
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 60) S.stepMs.shift();
    if (g2.hit === 1) { const u = 1, k = g2.body[0]; S.pops.push({ x: (k % N + 0.5) * cv.width / N, y: (Math.floor(k / N) + 0.5) * cv.width / N, text: "+10", t: performance.now() }); }
    S.game = g2;
    if (g2.over && !(W && W.on) && g2.score > S.best) { S.best = g2.score; keep("best", S.best); }
    if (g2.over && W && W.on) { W.end(`🤖 Hazel's game: ${g2.score} points, ${g2.body.length} long`); S.restartAt = performance.now() + 3000; }
  }
  let lastBar = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const h = H(), g = S.game;
    if (g && g.over && W && W.on && S.restartAt && t > S.restartAt) newGame();
    if (!h || !g || document.hidden) return;
    if (P && P.paused()) { S.lastStep = t; draw(); return; }
    if (!g.over) {
      // (a step every 1/speed of a second; 🤖's pace: slowly half speed, at a walk the speed chosen, briskly twice, at full speed
      // four times; waiting for the first turn when you play)
      const auto = W && W.on, rate = auto ? ({ 900: 0.5, 450: 1, 120: 2, 0: 4 }[W.pace] || 1) : 1, every = 1000 / (S.speed * rate);
      const waiting = !auto && g.t === 0 && !S.turns.length;
      if (waiting) S.lastStep = t;
      else if (t - S.lastStep >= every) {
        S.lastStep = t - Math.min(every, t - S.lastStep - every);
        try { oneStep(h); } catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; drawStatus(); return; }
        if (auto) W.show();
      }
    }
    draw();
    if (t - lastBar > 150) { lastBar = t; bar(); }
  }
  requestAnimationFrame(frame);

  // ---- the controls: the arrow keys and W A S D, a swipe on the board, the four buttons; a turn asked for waits for the next
  // step (two at most: the second after the first)
  const ask = d => { if (W && W.on) return; if (S.game && S.game.over) return; if (S.turns.length < 2 && S.turns[S.turns.length - 1] !== d) S.turns.push(d); };
  const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  addEventListener("keydown", e => {
    if (typing(e)) return;
    if (e.key in KEYS) { if (e.key.startsWith("Arrow")) e.preventDefault(); ask(KEYS[e.key]); }
    else if (e.key === "Enter" && S.game && S.game.over && !(W && W.on)) newGame();
  });
  cv.addEventListener("pointerdown", e => { if (S.game && S.game.over && !(W && W.on)) { newGame(); return; } S.swipe = { x: e.clientX, y: e.clientY }; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (!S.swipe) return;
    const dx = e.clientX - S.swipe.x, dy = e.clientY - S.swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    ask(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); S.swipe = { x: e.clientX, y: e.clientY };
  });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, () => { S.swipe = null; });
  for (const b of document.querySelectorAll(".sn-pad button")) b.addEventListener("pointerdown", e => { e.preventDefault(); ask(+b.dataset.dir); b.classList.add("held"); setTimeout(() => b.classList.remove("held"), 140); });
  $("new").addEventListener("click", newGame);
  $("wrap").addEventListener("change", () => { S.wrap = $("wrap").checked; keep("wrap", S.wrap); newGame(); });
  $("speed").addEventListener("change", () => { S.speed = +$("speed").value; keep("speed", S.speed); });
  addEventListener("resize", () => draw());
  if (window.OracleFs) window.OracleFs.offer({ label: "🐍 New game", title: "A new game", cast: newGame });
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["Hazel"], label: "🤖 Hazel plays for you", what: "the game",
    more: () => S.game ? `; ${S.game.score} points, ${S.game.body.length} long` : "",
    onChange: on => {
      S.turns = [];
      if (!on) { W.stop(); return; }
      if (!H()) return;
      if (!S.game || S.game.over) newGame();
      W.start(0);
    },
  }) : null;
  // (0.0.53) ⏸ the pause (shared/pause.js): its button and the space bar; no step runs while paused
  const P = window.HazelPause ? window.HazelPause.make({ into: $("new").parentElement, over: $("board").parentElement }) : null;

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), every step, without loading Hazel's library or building the program. Hazel loads if you edit the rules.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules move the snake…"; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s, and interpreted every step (🤖's choices are slower interpreted).`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so the snake cannot move: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build");
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
    c.src = "compiled.js?v=0.0.51"; c.async = true;
    c.onload = () => { const v = window.SnakeCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newGame(); }
      else if (!v) { S.compiledError = "it ran, but gave no Snake"; loadLib(); } };
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

  // ---- ⚙️ Advanced: this device's speed (100 steps of a game, the robot choosing each one)
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Snake", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "100 steps of a game with the robot choosing each one, through Hazel",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: 100 steps of a game…");
      let g = h.start(12345, false); const t0 = performance.now();
      for (let n = 0; n < 100 && !g.over; n++) g = h.step(g, h.robot(g));
      const ms = (performance.now() - t0) / 100;
      return { data: { step: +ms.toFixed(3) }, text: [`a step and the robot's choice through Hazel: ${ms.toFixed(2)} ms`] };
    },
  });
  // (for checking the page where no frames are drawn, a browser pane hidden: ?test=1 lets a script run steps and draw)
  if (Q.has("test")) window.SnakeTest = { S, newGame, steps: n => { const h = H(); for (let i = 0; i < n && S.game && !S.game.over; i++) oneStep(h); draw(); bar(); return S.game; }, auto: () => W };
  document.body.classList.add("js");
  draw(); bar();
})();
