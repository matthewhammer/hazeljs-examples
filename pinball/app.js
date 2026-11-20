// hazeljs-examples, Pinball (ticket 793; Matthew: "let's try to do a pinball game using hazeljs to describe: layout of the
// game, state of the game, state updates to the game, based on physics and flapper states, etc. In particular, the layout
// of the pinball walls and obstacles should be represented with Hazel data. We should offer 10 different boards, some with
// multiple levels, or other unique features or themes"; then "let's plan to use hazel-jit with hazeljs to make the pinball
// game fast"). The page: the table drawn on a canvas, every frame one step of Hazel's rules (Pinball.step: the flippers,
// gravity, the walls, bumpers, flippers and portals, the drain, the plunger), the buttons and keys; the rules compiled ahead
// of time by hazel-jit (compiled.js) when it is here, else, and once they are edited, run by hazeljs (slower: a step there
// takes tens of milliseconds, so the ball moves in slow motion).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "pinball", MODULES = ["Pinball"];
  const TAIL = "(start = Pinball.start, step = Pinball.step, board = Pinball.board)";
  const KEY = "hazeljs-examples/pinball/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: the rules, the board chosen, the game (a Hazel value), the buttons held, the plunger's pull
  const S = { built: null, libAt: 0, libFailed: false, compiledError: "", board: kept("board", 0), game: null, left: false, right: false,
              pullAt: 0, launch: 0, flash: new Map(), stepMs: [], best: kept("best", {}), boardData: null, layer: null };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  const SND = window.PinballSound || null;   // (sound.js: the music and the table's sounds)
  const NAMES = ["🌌 Starfield", "🌋 Volcano", "🌊 Ocean", "🍄 Mushroom forest", "🏰 Castle, two floors", "🐱 Cat face", "🎡 Funfair ring", "🌙 Moon, low gravity", "🌀 Portals", "🏙️ City, two levels"];
  NAMES.forEach((n, i) => { const o = document.createElement("option"); o.value = String(i); o.textContent = n; $("boardpick").append(o); });
  if (!(S.board >= 0 && S.board < NAMES.length)) S.board = 0;
  $("boardpick").value = String(S.board);

  // ---- the table: its board drawn once (walls, bumpers, portals) on a layer of its own; each frame, that, the bumpers just
  // hit lit up, the flippers, the plunger and the ball
  const cv = $("board"), cx = cv.getContext("2d");
  function boardLayer(b) {
    const L = document.createElement("canvas"); L.width = 600; L.height = 1000;
    const c = L.getContext("2d");
    c.fillStyle = b.bg; c.fillRect(0, 0, 600, 1000);
    c.strokeStyle = b.ink; c.lineWidth = 5; c.lineCap = "round";
    for (const w of b.walls) { c.beginPath(); c.moveTo(w.ax, w.ay); c.lineTo(w.bx, w.by); c.lineWidth = w.kick > 0 ? 8 : 5; c.strokeStyle = w.kick > 0 ? b.glow : b.ink; c.stroke(); }
    for (const p of b.portals) {
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(p.x, p.y, p.r - i * 6, 0, 2 * Math.PI); c.strokeStyle = i % 2 ? b.ink : b.glow; c.lineWidth = 3; c.stroke(); }
      c.beginPath(); c.arc(p.tx, p.ty, 8, 0, 2 * Math.PI); c.strokeStyle = b.glow; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]);
    }
    for (const q of b.bumpers) { c.beginPath(); c.arc(q.x, q.y, q.r, 0, 2 * Math.PI); c.fillStyle = b.ink; c.globalAlpha = 0.25; c.fill(); c.globalAlpha = 1; c.lineWidth = 4; c.strokeStyle = b.ink; c.stroke(); }
    c.fillStyle = b.ink; c.font = "bold 26px system-ui, sans-serif"; c.textAlign = "center"; c.globalAlpha = 0.5; c.fillText(b.name, 300, 980); c.globalAlpha = 1;
    return L;
  }
  function draw() {
    const b = S.boardData, g = S.game;
    if (!b) { cx.fillStyle = "#0b1030"; cx.fillRect(0, 0, 600, 1000); return; }
    cx.drawImage(S.layer, 0, 0);
    const now = performance.now();
    b.bumpers.forEach((q, i) => { const t = S.flash.get(i); if (t && now - t < 160) { cx.beginPath(); cx.arc(q.x, q.y, q.r + 4, 0, 2 * Math.PI); cx.fillStyle = b.glow; cx.globalAlpha = 1 - (now - t) / 160; cx.fill(); cx.globalAlpha = 1; } });
    if (!g) return;
    // the flippers, at the angles the rules turned them to
    b.flippers.forEach((f, i) => { const a = (g.flips[i] ?? 500) / 1000, tx = f.x + f.side * f.len * Math.cos(a), ty = f.y + f.len * Math.sin(a);
      cx.beginPath(); cx.moveTo(f.x, f.y); cx.lineTo(tx, ty); cx.strokeStyle = b.glow; cx.lineWidth = 16; cx.lineCap = "round"; cx.stroke();
      cx.beginPath(); cx.arc(f.x, f.y, 6, 0, 2 * Math.PI); cx.fillStyle = b.bg; cx.fill(); });
    // the plunger, pulled down as the launch is held
    const pull = S.pullAt ? Math.min(1, (now - S.pullAt) / 1200) : 0;
    cx.fillStyle = b.ink; cx.fillRect(551, 968 + pull * 22, 24, 10);
    // the ball
    const x = g.x / 1000, y = g.y / 1000, grad = cx.createRadialGradient(x - 4, y - 4, 2, x, y, 12);
    grad.addColorStop(0, "#ffffff"); grad.addColorStop(1, "#9ca3af");
    cx.beginPath(); cx.arc(x, y, 12, 0, 2 * Math.PI); cx.fillStyle = grad; cx.fill();
    if (g.over) { cx.fillStyle = "rgba(0,0,0,0.55)"; cx.fillRect(0, 380, 600, 200); cx.fillStyle = "#ffffff"; cx.font = "bold 44px system-ui, sans-serif"; cx.textAlign = "center";
      cx.fillText("Game over", 300, 465); cx.font = "26px system-ui, sans-serif"; cx.fillText("New game to play again", 300, 520); }
  }
  function bar() {
    const g = S.game, best = S.best[S.board] || 0;
    $("score").textContent = g ? g.score.toLocaleString() : "0";
    $("balls").textContent = g ? (g.over ? "game over" : "⚪".repeat(Math.max(0, g.balls)) + " balls") : "";
    $("info").textContent = `${NAMES[S.board]}: best ${best.toLocaleString()} on this device`;
    // (0.0.36; Matthew: "the new game button obscures the running game") full screen's 🎱 New game, over the table only
    // while no game runs, as Go's and Minesweeper's
    if (window.OracleFs) window.OracleFs.empty(!g || !!g.over);
    const ms = S.stepMs.length ? [...S.stepMs].sort((a, b) => a - b)[S.stepMs.length >> 1] : 0;
    $("fps").textContent = !S.stepMs.length ? "" : `a frame of Hazel: ${ms < 0.1 ? "under 0.1" : ms < 1 ? ms.toFixed(2) : ms.toFixed(0)} ms`;   // (a compiled step is about 0.03 ms: under the clock's 0.1 ms)
  }

  // ---- the game: a new one on the board chosen, and every frame a step of the rules
  function newGame() {
    const h = H(); if (!h) return;
    S.boardData = h.board(S.board); S.layer = boardLayer(S.boardData);
    S.game = h.start(S.board); S.flash.clear(); S.pullAt = 0; S.launch = 0;
    if (SND) { SND.fanfare(); SND.tune(S.board); }
    bar(); draw();
  }
  let last = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const h = H(), g = S.game;
    if (!h || !g || g.over || document.hidden) { if (g && g.over) draw(); return; }
    const t0 = performance.now();
    let g2;
    const pulled = S.launch;
    try { g2 = h.step(S.board, g, S.left, S.right, S.launch); } catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; drawStatus(); return; }
    S.launch = 0;
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 60) S.stepMs.shift();
    for (const i of g2.hits || []) S.flash.set(i, performance.now());
    if (SND) heard(g, g2, pulled);
    S.game = g2;
    if (g2.over && g2.score > (S.best[S.board] || 0)) { S.best[S.board] = g2.score; keep("best", S.best); }
    draw();
    if (t - last > 250) { last = t; bar(); }
    if (g2.over) bar();
  }
  requestAnimationFrame(frame);
  // (what a step did, heard: the plunger let go, bumpers and slingshots hit, a portal gone through, a thousand points, a ball
  // lost, the game over; each read from the two games, before and after, and the board)
  function heard(g, g2, pulled) {
    if (pulled && g2.vy <= -24000 && g.vy === 0) SND.launch(pulled);
    const bs = S.boardData ? S.boardData.bumpers : [];
    (g2.hits || []).slice(0, 2).forEach(i => SND.bump(i));
    const fromBumpers = (g2.hits || []).reduce((n, i) => n + (bs[i] ? bs[i].points : 0), 0);
    if (g2.score - g.score - fromBumpers >= 10) SND.sling();
    if (g2.balls === g.balls && Math.hypot(g2.x - g.x, g2.y - g.y) > 80000) SND.portal();
    if (Math.floor(g2.score / 1000) > Math.floor(g.score / 1000)) SND.bonus();
    if (g2.over && !g.over) { SND.stop(); SND.over(); }
    else if (g2.balls < g.balls) SND.drain();
  }

  // ---- the controls: keys, the buttons under the table, and the table's own two halves
  const plungeDown = () => { if (!S.pullAt) S.pullAt = performance.now(); $("launch").classList.add("held"); };
  const plungeUp = () => { if (S.pullAt) { S.launch = Math.max(1, Math.min(100, Math.round((performance.now() - S.pullAt) / 12))); S.pullAt = 0; } $("launch").classList.remove("held"); };
  const flip = (side, on) => { if (on && SND && !(side < 0 ? S.left : S.right)) SND.flip();
    if (side < 0) S.left = on; else S.right = on; $(side < 0 ? "flipL" : "flipR").classList.toggle("held", on); };
  // (0.0.36; Matthew: "for desktop use, please map the paddles to L and R arrow keys") ← and → were mapped, but went to the
  // board menu while it had the focus, as it keeps after a board is chosen: → turned the Starfield into the Volcano. Now the
  // game's keys play whatever has the focus, the menu and the buttons too (the focus let go, so the space bar does not press
  // the button last clicked); only typing, in a field or in Hazel's editor, keeps them
  const GAME_KEYS = ["z", "Z", "/", " ", "ArrowLeft", "ArrowRight", "ArrowDown"];
  addEventListener("keydown", e => {
    if (e.target.closest && e.target.closest("input, textarea, .hazel-listing, [contenteditable]")) return;
    if (!GAME_KEYS.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
    const f = document.activeElement;
    if (f && f !== document.body && f.matches && f.matches("select, button")) f.blur();
    if (["z", "Z", "ArrowLeft"].includes(e.key)) { flip(-1, true); e.preventDefault(); }
    else if (["/", "ArrowRight"].includes(e.key)) { flip(1, true); e.preventDefault(); }
    else if ([" ", "ArrowDown"].includes(e.key)) { plungeDown(); e.preventDefault(); }
  });
  addEventListener("keyup", e => {
    if (["z", "Z", "ArrowLeft"].includes(e.key)) flip(-1, false);
    else if (["/", "ArrowRight"].includes(e.key)) flip(1, false);
    else if ([" ", "ArrowDown"].includes(e.key)) plungeUp();
  });
  const hold = (el, down, up) => { el.addEventListener("pointerdown", e => { e.preventDefault(); el.setPointerCapture(e.pointerId); down(); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) el.addEventListener(ev, up); };
  hold($("flipL"), () => flip(-1, true), () => flip(-1, false));
  hold($("flipR"), () => flip(1, true), () => flip(1, false));
  hold($("launch"), plungeDown, plungeUp);
  // (the table: its left half the left flipper, its right half the right one; the launch lane, the plunger)
  const sides = new Map();
  cv.addEventListener("pointerdown", e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    const what = u > 0.9 && v > 0.8 ? 0 : u < 0.5 ? -1 : 1; sides.set(e.pointerId, what); if (what === 0) plungeDown(); else flip(what, true); });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, e => { const what = sides.get(e.pointerId); sides.delete(e.pointerId); if (what === 0) plungeUp(); else if (what) flip(what, false); });
  $("new").addEventListener("click", newGame);
  // (the music and the sounds: each a switch, remembered; any tap or key wakes the chip, which browsers ask for before a sound)
  if (SND) {
    const sw = (id, get, set) => { const b = $(id); b.setAttribute("aria-pressed", String(get()));
      b.addEventListener("click", () => { set(!get()); b.setAttribute("aria-pressed", String(get())); if (get()) SND.gesture(S.game && !S.game.over ? S.board : null); }); };
    sw("music", () => SND.musicOn, on => { SND.music(on); if (on && S.game && !S.game.over) SND.tune(S.board); });
    sw("sfx", () => SND.soundsOn, on => SND.sounds(on));
    for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => SND.gesture(S.game && !S.game.over ? S.board : null), true);
  } else for (const id of ["music", "sfx"]) $(id).hidden = true;
  $("boardpick").addEventListener("change", () => { S.board = +$("boardpick").value; keep("board", S.board); newGame(); });
  if (window.OracleFs) window.OracleFs.offer({ label: "🎱 New game", title: "A new game, on the board chosen", cast: newGame });

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), every frame, without loading Hazel's library.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules run the table."; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s, and interpreted every frame: slower than compiled, so the ball moves in slow motion.`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so the table cannot move: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build") + ". Put them back with the button under the listings.";
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
    c.src = "compiled.js?v=0.0.36"; c.async = true;
    c.onload = () => { const v = window.PinballCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newGame(); }
      else if (!v) { S.compiledError = "it ran, but gave no Pinball"; loadLib(); } };
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
  document.body.classList.add("js");
  draw(); bar();
})();
