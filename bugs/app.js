// hazeljs-examples, Bug run (ticket 828; Matthew, 2026-11-22: "Next: space invaders clone, centipede clone, dig dug clone", and
// "all with hazel rules and hazel AI that plays the game"): a segmented-bug shooter of our own in that genre. The page: the
// field drawn on a canvas, every frame a step of Hazel's rules (Bugs.step: the shooter and its shot, the bug moving a cell
// every few steps, a segment hit turned to a pebble, the shooter caught), and 🤖 Hazel plays for you, the robot in Hazel
// (Bugs.robot) choosing each step's move and shot. The rules compiled ahead of time by hazel-jit (compiled.js) when it is
// here, else, and once they are edited, run by hazeljs (slower).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "bugs", MODULES = ["Bugs"];
  const TAIL = "(start = Bugs.start, step = Bugs.step, robot = Bugs.robot)";
  const KEY = "hazeljs-examples/bugs/";
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
              held: { left: false, right: false, up: false, down: false }, aimX: null, aimY: null, fire: false, pops: [], stepMs: [], restartAt: 0, banner: null, booms: [] };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  
  // ---- drawing: the field (earth and tufts), the pebbles (worn by their shots), the bug (each segment a round body with legs, a
  // head with antennae and eyes where no segment is just ahead), the shooter, its shot
  const cv = $("field"), ctx = cv.getContext("2d");
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, Math.round(r.width * d)), h = Math.round(w * 4 / 3);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  const hash = (a, b) => { let x = (a * 374761393 + b * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177 | 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  function draw() {
    fit();
    const k = cv.width / 600, g = S.game, c = ctx, now = performance.now(), U = 25 * k;
    c.fillStyle = "#1c1917"; c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = "rgba(132, 204, 22, 0.35)"; c.lineWidth = 1.2 * k;
    for (let i = 0; i < 140; i++) { const x = hash(i, 3) * 600 * k, y = hash(i, 4) * 800 * k; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2 * k, y - 6 * k); c.moveTo(x, y); c.lineTo(x + 2 * k, y - 5 * k); c.stroke(); }
    c.fillStyle = "rgba(250, 204, 21, 0.06)"; c.fillRect(0, 650 * k, cv.width, 150 * k);
    if (!g) return;
    for (const p of g.stones) {
      const x = (p.c + 0.5) * U, y = (p.r + 0.5) * U;
      c.fillStyle = ["", "#57534e", "#78716c", "#a8a29e"][p.hp] || "#a8a29e"; c.beginPath(); c.ellipse(x, y, 10 * k, 8 * k, 0.3, 0, 7); c.fill();
      c.fillStyle = "rgba(255, 255, 255, 0.25)"; c.beginPath(); c.ellipse(x - 3 * k, y - 3 * k, 4 * k, 2.5 * k, 0.3, 0, 7); c.fill();
      if (p.hp < 3) { c.strokeStyle = "#1c1917"; c.lineWidth = 1.5 * k; c.beginPath(); c.moveTo(x - 5 * k, y - 4 * k); c.lineTo(x, y + 1 * k); c.lineTo(x + 4 * k, y - 2 * k); if (p.hp < 2) { c.moveTo(x, y + 1 * k); c.lineTo(x - 1 * k, y + 6 * k); } c.stroke(); }
    }
    const at = new Set(g.segs.map(s => s.c + "," + s.r));
    for (const s of g.segs) {
      const x = (s.c + 0.5) * U, y = (s.r + 0.5) * U, head = !at.has((s.c + s.d) + "," + s.r), wig = Math.sin(now / 90 + s.c) * 2 * k;
      c.strokeStyle = "#365314"; c.lineWidth = 2 * k; c.beginPath();
      for (const dx of [-5, 5]) { c.moveTo(x + dx * k, y + 6 * k); c.lineTo(x + dx * k + wig, y + 12 * k); c.moveTo(x + dx * k, y - 6 * k); c.lineTo(x + dx * k - wig, y - 12 * k); }
      c.stroke();
      c.fillStyle = head ? "#facc15" : "#84cc16"; c.beginPath(); c.arc(x, y, 10.5 * k, 0, 7); c.fill();
      c.fillStyle = "rgba(255, 255, 255, 0.25)"; c.beginPath(); c.arc(x - 3 * k, y - 4 * k, 4 * k, 0, 7); c.fill();
      if (head) {
        c.strokeStyle = "#a16207"; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(x + s.d * 6 * k, y - 7 * k); c.lineTo(x + s.d * 12 * k, y - 15 * k); c.moveTo(x + s.d * 2 * k, y - 8 * k); c.lineTo(x + s.d * 4 * k, y - 17 * k); c.stroke();
        c.fillStyle = "#111827"; c.beginPath(); c.arc(x + s.d * 4 * k, y - 2 * k, 2.4 * k, 0, 7); c.arc(x + s.d * 4 * k, y + 4 * k, 2.4 * k, 0, 7); c.fill();
      }
    }
    if (!(g.wait > 0 && Math.floor(now / 120) % 2)) {
      const x = g.px * k, y = g.py * k;
      c.fillStyle = "#f59e0b"; c.beginPath(); c.arc(x, y, 11 * k, 0, 7); c.fill();
      c.fillStyle = "#fde68a"; c.fillRect(x - 3 * k, y - 18 * k, 6 * k, 12 * k);
      c.fillStyle = "#78350f"; c.beginPath(); c.arc(x - 4 * k, y + 1 * k, 2 * k, 0, 7); c.arc(x + 4 * k, y + 1 * k, 2 * k, 0, 7); c.fill();
    }
    if (g.sy >= 0) { c.fillStyle = "#fde047"; c.fillRect(g.sx * k - 1.5 * k, g.sy * k, 3 * k, 10 * k); }
    S.booms = S.booms.filter(b => now - b.t < 400);
    for (const b of S.booms) { const q = (now - b.t) / 400; c.strokeStyle = `rgba(250, 204, 21, ${1 - q})`; c.lineWidth = 2 * k; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r1 = 6 + q * 12, r2 = r1 + 5; c.beginPath(); c.moveTo((b.x + Math.cos(a) * r1) * k, (b.y + Math.sin(a) * r1) * k); c.lineTo((b.x + Math.cos(a) * r2) * k, (b.y + Math.sin(a) * r2) * k); c.stroke(); } }
    S.pops = S.pops.filter(p => now - p.t < 800);
    for (const p of S.pops) { const q = (now - p.t) / 800; c.globalAlpha = 1 - q; c.fillStyle = p.col; c.font = `700 ${Math.round(15 * k)}px system-ui`; c.textAlign = "center"; c.fillText(p.text, p.x * k, (p.y - q * 24) * k); }
    c.globalAlpha = 1; c.textAlign = "center";
    if (g.over) {
      c.fillStyle = "rgba(28, 25, 23, 0.8)"; c.fillRect(0, 330 * k, 600 * k, 140 * k);
      c.fillStyle = "#ffffff"; c.font = `700 ${Math.round(28 * k)}px system-ui`; c.fillText(`Game over: ${g.score} points`, 300 * k, 395 * k);
      c.font = `${Math.round(17 * k)}px system-ui`; c.fillText("New game: the button, a tap, or Enter", 300 * k, 435 * k);
    } else if (S.banner && now - S.banner.t < 1600 && S.banner.text) {
      c.fillStyle = "#fef9c3"; c.font = `700 ${Math.round(26 * k)}px system-ui`; c.fillText(S.banner.text, 300 * k, 560 * k);
    }
  }
  function bar() {
    const g = S.game; if (!g) return;
    $("points").textContent = `⭐ ${g.score}`; $("lives").textContent = "💛".repeat(Math.max(0, g.lives));
    $("level").textContent = `wave ${g.wave + 1}`; $("left").textContent = `${g.segs.length} segments left`;
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
    if (g2.hit === 1) { const x = g.sx, y = Math.max(0, g.sy - 18); S.booms.push({ x, y, t: now }); S.pops.push({ x, y: y - 10, text: "+" + (g2.score - g.score), t: now, col: "#fde047" }); }
    if (g2.hit === 2) { S.booms.push({ x: g.px, y: g.py, t: now }); S.banner = { text: g2.lives > 0 ? "🐛 Caught!" : "", t: now }; }
    if (g2.hit === 3) S.banner = { text: `🎉 Wave ${g2.wave} cleared!`, t: now };
  }
  function oneStep(h) {
    const g = S.game;
    let mx = 0, my = 0, fire = false;
    if (W && W.on) { const t1 = performance.now(), c = h.robot(g); W.think(0, performance.now() - t1); mx = c.mx; my = c.my; fire = c.fire; }
    else {
      mx = S.held.left ? -1 : S.held.right ? 1 : S.aimX !== null ? (S.aimX > g.px + 4 ? 1 : S.aimX < g.px - 4 ? -1 : 0) : 0;
      my = S.held.up ? -1 : S.held.down ? 1 : S.aimY !== null ? (S.aimY > g.py + 4 ? 1 : S.aimY < g.py - 4 ? -1 : 0) : 0;
      fire = S.fire; if (g.sy < 0 || !S.fire) S.fire = false;
    }
    const t0 = performance.now(), g2 = h.step(g, mx, my, fire);
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

  // ---- the controls: ⬅️ ➡️ held (or the keys), a finger along the field (the cannon follows it), ⬆️, the space bar or a tap
  // to fire (one shot in the air at a time; a fire asked for waits until it can go)
  const fieldXY = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 600, (e.clientY - r.top) / r.height * 800]; };
  cv.addEventListener("pointerdown", e => { if (W && W.on) return; if (S.game && S.game.over) { newGame(); return; } [S.aimX, S.aimY] = fieldXY(e); S.fire = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => { if (W && W.on) return; if (e.buttons) { [S.aimX, S.aimY] = fieldXY(e); S.fire = true; } });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, () => { S.aimX = null; S.aimY = null; });
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  addEventListener("keydown", e => {
    if (typing(e) || (W && W.on)) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); S.held.left = true; }
    else if (e.key === "ArrowRight") { e.preventDefault(); S.held.right = true; }
    else if (e.key === "ArrowUp") { e.preventDefault(); S.held.up = true; }
    else if (e.key === "ArrowDown") { e.preventDefault(); S.held.down = true; }
    else if (e.key === "Enter" && S.game && S.game.over) newGame();
    else if (e.key === "Enter" || e.key === "f" || e.key === "F") { e.preventDefault(); S.fire = true; }
  });
  addEventListener("keyup", e => { if (e.key === "ArrowLeft") S.held.left = false; else if (e.key === "ArrowRight") S.held.right = false; else if (e.key === "ArrowUp") S.held.up = false; else if (e.key === "ArrowDown") S.held.down = false; });
  const hold = (id, side) => { const b = $(id);
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("held"); if (!(W && W.on)) S.held[side] = true; });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { b.classList.remove("held"); S.held[side] = false; }); };
  hold("left", "left"); hold("right", "right");
  $("launch").addEventListener("pointerdown", e => { e.preventDefault(); if (!(W && W.on)) S.fire = true; });
  $("new").addEventListener("click", newGame);
  addEventListener("resize", () => draw());
  if (window.OracleFs) window.OracleFs.offer({ label: "🐛 New game", title: "A new game, from the first wave", cast: newGame });
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["Hazel"], label: "🤖 Hazel plays for you", what: "the game",
    more: () => S.game ? `; ${S.game.score} points, wave ${S.game.wave + 1}` : "",
    onChange: on => {
      S.held = { left: false, right: false, up: false, down: false }; S.fire = false; S.aimX = null; S.aimY = null;
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
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules move the bug…"; return; }
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
    c.onload = () => { const v = window.BugsCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newGame(); }
      else if (!v) { S.compiledError = "it ran, but gave no Bug run"; loadLib(); } };
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
    holder: $("advanced"), name: "Bug run", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "300 steps of a game with the robot choosing each one, through Hazel",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: 300 steps of a game…");
      let g = h.start(12345); const t0 = performance.now();
      for (let n = 0; n < 300 && !g.over; n++) { const c = h.robot(g); g = h.step(g, c.mx, c.my, c.fire); }
      const ms = (performance.now() - t0) / 300;
      return { data: { step: +ms.toFixed(3) }, text: [`a step and the robot's choice through Hazel: ${ms.toFixed(2)} ms`] };
    },
  });
  // (for checking the page where no frames are drawn, a browser pane hidden: ?test=1 lets a script run steps and draw)
  if (Q.has("test")) window.BugsTest = { S, newGame, steps: n => { const h = H(); for (let i = 0; i < n && S.game && !S.game.over; i++) oneStep(h); draw(); bar(); return S.game; }, auto: () => W };
  document.body.classList.add("js");
  draw(); bar();
})();
