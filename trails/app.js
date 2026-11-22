// hazeljs-examples, Light trails (ticket 826; Matthew, 2026-11-22: "let's do more classic games with simple physics and rules:
// break out, snake, tron", and "For each game, be sure to include 'automated gameplay' mode ... that gameplay should also be
// Hazel code"). The page: the arena drawn on a canvas, a step of Hazel's rules (Trails.step: both riders moved, their turns,
// the crashes) at the speed chosen; Hazel's rider steered by the robot in Hazel (Trails.robot), and yours too when 🤖 Hazel
// plays for you. A match is the first to three rounds. The rules compiled ahead of time by hazel-jit (compiled.js) when it is
// here, else, and once they are edited, run by hazeljs.
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "trails", MODULES = ["Trails"];
  const TAIL = "(start = Trails.start, step = Trails.step, robot = Trails.robot)";
  const KEY = "hazeljs-examples/trails/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: the rules, the round (a Hazel value: the arena 40 by 30), each rider's trail (kept here to draw it in its
  // colour: the rules keep only which cells are lit), the turns asked for, the match's score, the speed and Hazel's care
  const AW = 40, AH = 30, WINS = 3;
  const S = { built: null, libAt: 0, libFailed: false, compiledError: "", game: null, trailA: [], trailB: [], turns: [], score: [0, 0], speed: kept("speed", 8),
              skill: kept("skill", "6:12"), stepMs: [], lastStep: 0, swipe: null, burst: null, roundOver: 0, matchOver: false, restartAt: 0, record: kept("record", { you: 0, hazel: 0 }) };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  if (!/^\d+:\d+$/.test(S.skill)) S.skill = "6:12";
  $("speed").value = String(S.speed); $("skill").value = S.skill;
  // (Hazel's skill: how far its rider looks for room, and how many times in a hundred steps it slips, turning without looking)
  const SKILL = () => S.skill.split(":").map(Number);
  const luck = () => Math.floor(Math.random() * 100);

  // ---- drawing: the arena, a faint grid; each trail a glowing line through its cells' middles; the heads; a crash's burst
  const cv = $("arena"), ctx = cv.getContext("2d");
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(240, Math.round(r.width * d)), h = Math.round(w * AH / AW);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  function trail(cells, col, glow, u) {
    const c = ctx; if (!cells.length) return;
    c.lineCap = "round"; c.lineJoin = "round";
    for (const [lw, st] of [[u * 0.7, glow], [u * 0.32, col]]) {
      c.strokeStyle = st; c.lineWidth = lw; c.beginPath();
      cells.forEach(([x, y], i) => { const X = (x + 0.5) * u, Y = (y + 0.5) * u; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); });
      if (cells.length === 1) c.lineTo((cells[0][0] + 0.5) * u + 0.1, (cells[0][1] + 0.5) * u);
      c.stroke();
    }
    const [hx, hy] = cells[cells.length - 1];
    c.fillStyle = "#ffffff"; c.beginPath(); c.arc((hx + 0.5) * u, (hy + 0.5) * u, u * 0.3, 0, 7); c.fill();
  }
  function draw() {
    fit();
    const c = ctx, u = cv.width / AW, g = S.game, now = performance.now();
    c.fillStyle = "#0b1020"; c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = "rgba(120, 140, 220, 0.12)"; c.lineWidth = 1;
    for (let x = 0; x <= AW; x += 2) { c.beginPath(); c.moveTo(x * u, 0); c.lineTo(x * u, cv.height); c.stroke(); }
    for (let y = 0; y <= AH; y += 2) { c.beginPath(); c.moveTo(0, y * u); c.lineTo(cv.width, y * u); c.stroke(); }
    c.strokeStyle = "rgba(160, 180, 255, 0.5)"; c.lineWidth = 2; c.strokeRect(1, 1, cv.width - 2, cv.height - 2);
    if (!g) return;
    trail(S.trailA, "#7dd3fc", "rgba(56, 189, 248, 0.35)", u);
    trail(S.trailB, "#fdba74", "rgba(251, 146, 60, 0.35)", u);
    if (S.burst) {
      const q = Math.min(1, (now - S.burst.t) / 700);
      for (const [bx, by] of S.burst.at) for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, rr = u * (0.5 + 3 * q);
        c.fillStyle = `rgba(255, 255, 255, ${1 - q})`; c.beginPath(); c.arc((bx + 0.5) * u + Math.cos(a) * rr, (by + 0.5) * u + Math.sin(a) * rr, u * 0.18, 0, 7); c.fill(); }
    }
    c.textAlign = "center";
    if (g.over) {
      c.fillStyle = "rgba(5, 8, 20, 0.7)"; c.fillRect(0, cv.height * 0.36, cv.width, cv.height * 0.28);
      c.fillStyle = "#ffffff"; c.font = `700 ${Math.round(u * 1.6)}px system-ui`;
      const said = S.matchOver ? (S.score[0] > S.score[1] ? "🎉 You win the match!" : "Hazel wins the match") : g.winner === 1 ? "🎉 You win the round!" : g.winner === 2 ? "Hazel wins the round" : "A draw: both crashed";
      c.fillText(said, cv.width / 2, cv.height * 0.48);
      c.font = `${Math.round(u * 0.9)}px system-ui`; c.fillText(S.matchOver ? "A new match: a tap, a key, or the button" : "The next round: a tap or a key", cv.width / 2, cv.height * 0.57);
    } else if (g.t === 0 && !(W && W.on)) {
      c.fillStyle = "#e0e7ff"; c.font = `${Math.round(u * 0.9)}px system-ui`; c.fillText("You are blue: an arrow key, a swipe or a button to go", cv.width / 2, cv.height * 0.85);
    }
  }
  function bar() {
    $("you").textContent = `🔵 You ${S.score[0]}`; $("hazel").textContent = `🟠 Hazel ${S.score[1]}`;
    $("round").textContent = `first to ${WINS}`;
    const ms = S.stepMs.length ? [...S.stepMs].sort((a, b) => a - b)[S.stepMs.length >> 1] : 0;
    $("info").textContent = `Matches on this device: you won ${S.record.you}, Hazel ${S.record.hazel}.` + (ms ? ` A step, with Hazel's choice: ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms.` : "");
    if (window.OracleFs) window.OracleFs.empty(!S.game || (!!S.game.over && S.matchOver));
  }

  // ---- a round, a match, and the steps at the speed chosen (a round waits for your first turn, unless 🤖 plays)
  function newRound() {
    const h = H(); if (!h) return;
    S.game = h.start(0); S.trailA = [[S.game.ax, S.game.ay]]; S.trailB = [[S.game.bx, S.game.by]]; S.turns = []; S.burst = null; S.lastStep = performance.now(); S.restartAt = 0;
    bar(); draw();
  }
  function newMatch() { S.score = [0, 0]; S.matchOver = false; if (W && W.on) W.start(0); newRound(); }
  function after() { if (!S.game || !S.game.over) return; if (S.matchOver) newMatch(); else newRound(); }
  function oneStep(h) {
    const g = S.game;
    const t1 = performance.now();
    const [care, slip] = SKILL();
    const b = h.robot(g, 2, care, slip, luck());
    const a = W && W.on ? h.robot(g, 1, 150, 0, luck()) : (S.turns.length ? S.turns.shift() : -1);
    const g2 = h.step(g, a, b);
    S.stepMs.push(performance.now() - t1); if (S.stepMs.length > 60) S.stepMs.shift();
    if (W && W.on) W.think(0, performance.now() - t1);
    // (a rider's new cell joins its trail unless it crashed there: you crashed when Hazel won or both did)
    if (!g2.over || g2.winner === 1) S.trailA.push([g2.ax, g2.ay]);
    if (!g2.over || g2.winner === 2) S.trailB.push([g2.bx, g2.by]);
    S.game = g2;
    if (g2.over) {
      const at = []; if (g2.winner !== 1) at.push([g2.ax, g2.ay]); if (g2.winner !== 2) at.push([g2.bx, g2.by]);
      S.burst = { at, t: performance.now() };
      if (g2.winner === 1) S.score[0]++; else if (g2.winner === 2) S.score[1]++;
      if (S.score[0] >= WINS || S.score[1] >= WINS) {
        S.matchOver = true;
        if (!(W && W.on)) { if (S.score[0] > S.score[1]) S.record.you++; else S.record.hazel++; keep("record", S.record); }
        else W.end(`🤖 the match: you ${S.score[0]}, Hazel ${S.score[1]}`);
      }
      if (W && W.on) S.restartAt = performance.now() + 1800;
      bar();
    }
  }
  let lastBar = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const h = H(), g = S.game;
    if (g && g.over && W && W.on && S.restartAt && t > S.restartAt) after();
    if (!h || !g || document.hidden) return;
    if (P && P.paused()) { S.lastStep = t; draw(); return; }
    if (!g.over) {
      // (0.0.54) as many times the speed chosen as 🤖's pace says (W.rate), several steps a frame; at full speed, as many as fit in 10 ms
      const auto = W && W.on, rate = auto ? (W.rate || 1) : 1, every = rate === Infinity ? 0 : 1000 / (S.speed * rate);
      if (!auto && g.t === 0 && !S.turns.length) S.lastStep = t;
      else if (rate === Infinity) {
        const tq = performance.now();
        try { while (!S.game.over && performance.now() - tq < 10) oneStep(h); } catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; drawStatus(); return; }
        S.lastStep = t; W.show();
      } else if (t - S.lastStep >= every) {
        let k = 0;
        try { while (t - S.lastStep >= every && k < 40 && !S.game.over) { S.lastStep += every; oneStep(h); k++; } } catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; drawStatus(); return; }
        if (t - S.lastStep > every * 4) S.lastStep = t;
        if (auto) W.show();
      }
    }
    draw();
    if (t - lastBar > 200) { lastBar = t; bar(); }
  }
  requestAnimationFrame(frame);

  // ---- the controls: the arrow keys and W A S D, a swipe on the arena, the four buttons (a turn waits for the next step; two at
  // most); a tap or a key after a round, the next one
  const ask = d => { if (W && W.on) return; const g = S.game; if (!g) return; if (g.over) { after(); return; } if (S.turns.length < 2 && S.turns[S.turns.length - 1] !== d) S.turns.push(d); };
  const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  addEventListener("keydown", e => {
    if (typing(e)) return;
    if (e.key in KEYS) { if (e.key.startsWith("Arrow")) e.preventDefault(); ask(KEYS[e.key]); }
    else if (e.key === "Enter" && S.game && S.game.over && !(W && W.on)) { e.preventDefault(); after(); }
  });
  cv.addEventListener("pointerdown", e => { if (S.game && S.game.over && !(W && W.on)) { after(); return; } S.swipe = { x: e.clientX, y: e.clientY }; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (!S.swipe) return;
    const dx = e.clientX - S.swipe.x, dy = e.clientY - S.swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    ask(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); S.swipe = { x: e.clientX, y: e.clientY };
  });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, () => { S.swipe = null; });
  for (const b of document.querySelectorAll(".tr-pad button")) b.addEventListener("pointerdown", e => { e.preventDefault(); ask(+b.dataset.dir); b.classList.add("held"); setTimeout(() => b.classList.remove("held"), 140); });
  $("new").addEventListener("click", newMatch);
  $("speed").addEventListener("change", () => { S.speed = +$("speed").value; keep("speed", S.speed); });
  $("skill").addEventListener("change", () => { S.skill = $("skill").value; keep("skill", S.skill); });
  addEventListener("resize", () => draw());
  if (window.OracleFs) window.OracleFs.offer({ label: "🔵 New match", title: "A new match, first to three rounds", cast: newMatch });
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["🔵", "🟠"], label: "🤖 Hazel plays for you",
    more: () => `; you ${S.score[0]}, Hazel ${S.score[1]}`,
    onChange: on => {
      S.turns = [];
      if (!on) { W.stop(); return; }
      if (!H()) return;
      newMatch();
    },
  }) : null;
  // (0.0.53) ⏸ the pause (shared/pause.js): its button and the space bar; no step runs while paused
  const P = window.HazelPause ? window.HazelPause.make({ into: $("new").parentElement, over: $("arena").parentElement }) : null;

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), every step, without loading Hazel's library or building the program. Hazel loads if you edit the rules.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules and rider play…"; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s, and interpreted every step: Hazel's rider is much slower so (a second a step, or more).`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so no one can ride: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build");
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
    if (S.built.ok) newMatch(); else draw();
  }
  function loadCompiled() {
    const c = document.createElement("script");
    c.src = "compiled.js?v=0.0.52"; c.async = true;
    c.onload = () => { const v = window.TrailsCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newMatch(); }
      else if (!v) { S.compiledError = "it ran, but gave no Light trails"; loadLib(); } };
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

  // ---- ⚙️ Advanced: this device's speed (a round of both riders, looking 30 ahead)
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Light trails", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "a round of the two riders, each looking 30 cells ahead, through Hazel",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: a round of the two riders…");
      let g = h.start(0), n = 0; const t0 = performance.now();
      while (!g.over && n < 400) { g = h.step(g, h.robot(g, 1, 30, 0, 50), h.robot(g, 2, 30, 0, 50)); n++; }
      const ms = (performance.now() - t0) / Math.max(1, n);
      return { data: { step: +ms.toFixed(3), steps: n }, text: [`a step with both riders' choices through Hazel: ${ms.toFixed(2)} ms (${n} steps)`] };
    },
  });
  // (for checking the page where no frames are drawn, a browser pane hidden: ?test=1 lets a script run steps and draw)
  if (Q.has("test")) window.TrailsTest = { S, newMatch, after, steps: n => { const h = H(); for (let i = 0; i < n && S.game && !S.game.over; i++) oneStep(h); draw(); bar(); return S.game; }, auto: () => W };
  document.body.classList.add("js");
  draw(); bar();
})();
