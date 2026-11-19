// hazeljs-examples, Minesweeper: the page. The board, the mines (laid after the first tap, never beside it), the counts, a cell
// opened and the empty region flooding open, flags and chords are Hazel (rules/*.hz), shown in Hazel's own editor
// (../shared/hazel-listings.js) and built by hazeljs from npm. The page draws the board and asks Hazel at every tap; the game
// is a value it holds and passes back in, (game, row, col) -> game.
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "minesweeper", MODULES = ["Board", "Play"];
  const TAIL = "(fresh = Board.fresh, lay = Board.lay_mines, reveal = Play.reveal, flag = Play.flag, chord = Play.chord, flags = Play.flags)";
  const KEY = "hazeljs-examples/minesweeper/";
  const LEVELS = { beginner: [9, 9, 10], intermediate: [16, 16, 40], expert: [16, 30, 99] };
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };
  // (the next frame painted, or 60 ms, whichever comes first: a page in the background draws no frames)
  const painted = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => setTimeout(go, 0)); setTimeout(go, 60); });

  // ---- the state: Hazel's program, the level, the game (a Hazel value), whether its mines are laid, its clock
  const S = { built: null, libAt: 0, libFailed: false, level: kept("level", "beginner"), game: null, laid: false, started: 0, ended: 0, busy: false, flagMode: false };
  if (!LEVELS[S.level]) S.level = "beginner";
  const saved = kept("game", null);
  if (saved && saved.game && Array.isArray(saved.game.grid) && saved.level === S.level) Object.assign(S, { game: saved.game, laid: saved.laid, started: saved.started, ended: saved.ended });
  const stats = kept("stats", {});
  const H = () => S.built && S.built.ok ? S.built.value : null;
  const save = () => keep("game", S.game ? { level: S.level, game: S.game, laid: S.laid, started: S.started, ended: S.ended } : null);

  // ---- the board
  const board = $("board");
  function size() {
    const [rows, cols] = LEVELS[S.level];
    const w = (board.parentElement.clientWidth || 320) - 10;
    // (in full screen, the cells as large as the window lets them be, its height too, less the bar above the board)
    const fs = document.documentElement.classList.contains("oracle-fs");
    const byH = fs ? Math.floor((innerHeight - 120) / rows) - 2 : 34;
    board.style.setProperty("--cs", Math.max(22, Math.min(fs ? 64 : 34, Math.floor(w / cols) - 2, byH)) + "px");
  }
  function draw() {
    const g = S.game;
    $("level").value = S.level;
    if (!g) { board.replaceChildren(); $("count").textContent = "💣 " + LEVELS[S.level][2]; face(); clockDraw(); info(); return; }
    size();
    board.style.gridTemplateColumns = `repeat(${g.cols}, var(--cs))`;
    const cells = [];
    g.grid.forEach((row, r) => row.forEach((x, c) => {
      const b = el("button", "cell"); b.type = "button"; b.dataset.r = r; b.dataset.c = c;
      if (x.open) {
        b.classList.add("open");
        if (x.mine) { b.textContent = "💣"; if (g.boom === r * g.cols + c) b.classList.add("boom"); }
        else if (x.near) { b.textContent = x.near; b.classList.add("n" + x.near); }
        b.setAttribute("aria-label", x.mine ? "a mine" : x.near ? `${x.near} mine${x.near > 1 ? "s" : ""} near` : "open, no mine near");
      } else if (x.flag) {
        b.classList.add("flag"); b.textContent = g.over && !g.won && !x.mine ? "❌" : "🚩";
        if (g.over && !g.won && !x.mine) b.classList.add("miss");
        b.setAttribute("aria-label", "flagged");
      } else b.setAttribute("aria-label", "closed");
      cells.push(b);
    }));
    board.replaceChildren(...cells);
    $("count").textContent = "💣 " + (g.mines - g.grid.reduce((n, row) => n + row.filter(x => x.flag).length, 0));
    face(); clockDraw(); info();
    if (window.OracleFs) window.OracleFs.empty(!!g.over);
  }
  const face = () => { $("face").textContent = S.busy ? "😮" : !S.game ? "🙂" : S.game.over ? (S.game.won ? "😎" : "😵") : "🙂"; };
  const secs = () => !S.started ? 0 : Math.floor(((S.ended || Date.now()) - S.started) / 1000);
  const clockDraw = () => { $("time").textContent = "⏱ " + Math.min(999, secs()); };
  setInterval(() => { if (S.started && !S.ended) clockDraw(); }, 500);
  function info() {
    const st = stats[S.level] || { played: 0, won: 0, best: 0 };
    const g = S.game, end = g && g.over ? (g.won ? `🎉 Cleared in ${secs()} s. ` : "💥 A mine. ") : "";
    $("info").textContent = `${end}${S.level}: won ${st.won} of ${st.played} on this device` + (st.best ? `, best ${st.best} s` : "");
  }
  addEventListener("resize", () => { if (S.game) size(); });

  // ---- a tap, asked of Hazel; while it thinks, the face says so
  async function ask(f) {
    const h = H(); if (!h || S.busy) return;
    S.busy = true; face(); await painted();
    let g = null;
    try { g = f(h); } catch (e) { g = null; }
    S.busy = false;
    if (g && Array.isArray(g.grid)) {
      const was = S.game; S.game = g;
      if (g.over && !(was && was.over)) {
        S.ended = Date.now();
        const st = stats[S.level] || { played: 0, won: 0, best: 0 };
        if (g.won) { st.won++; const t = secs(); if (!st.best || t < st.best) st.best = t; }
        stats[S.level] = st; keep("stats", stats);
      }
      save();
    }
    draw();
  }
  function newBoard() {
    const h = H(); if (!h) return;
    const [rows, cols, mines] = LEVELS[S.level];
    S.game = h.fresh(rows, cols, mines); Object.assign(S, { laid: false, started: 0, ended: 0 });
    save(); draw();
  }
  function tapCell(r, c, flagIt) {
    const g = S.game; if (!g || g.over) return;
    const x = g.grid[r][c];
    if (flagIt || S.flagMode) { if (!x.open) ask(h => h.flag(S.game, r, c)); return; }
    if (x.flag) return;
    if (!S.laid) {
      const [rows, cols, mines] = LEVELS[S.level];
      const st = stats[S.level] || { played: 0, won: 0, best: 0 }; st.played++; stats[S.level] = st; keep("stats", stats);
      S.laid = true; S.started = Date.now();
      ask(h => h.reveal(h.lay(rows, cols, mines, Array.from({ length: rows * cols }, Math.random), r, c), r, c));
      return;
    }
    if (x.open) { if (x.near) ask(h => h.chord(S.game, r, c)); return; }
    ask(h => h.reveal(S.game, r, c));
  }
  // a click opens; a right click, a long press, or flag mode flags
  let pressTimer = 0, pressed = null;
  board.addEventListener("pointerdown", e => {
    const b = e.target.closest(".cell"); if (!b) return;
    pressed = { r: +b.dataset.r, c: +b.dataset.c, long: false };
    clearTimeout(pressTimer);
    if (e.pointerType !== "mouse") pressTimer = setTimeout(() => { if (pressed) { pressed.long = true; tapCell(pressed.r, pressed.c, true); if (navigator.vibrate) navigator.vibrate(20); } }, 450);
  });
  board.addEventListener("pointerup", e => {
    clearTimeout(pressTimer);
    const p = pressed; pressed = null;
    if (!p || p.long || e.button === 2) return;
    const b = e.target.closest(".cell"); if (!b || +b.dataset.r !== p.r || +b.dataset.c !== p.c) return;
    tapCell(p.r, p.c, false);
  });
  board.addEventListener("pointercancel", () => { clearTimeout(pressTimer); pressed = null; });
  board.addEventListener("contextmenu", e => { e.preventDefault(); const b = e.target.closest(".cell"); if (b) tapCell(+b.dataset.r, +b.dataset.c, true); });
  $("face").addEventListener("click", newBoard);
  $("new").addEventListener("click", newBoard);
  $("level").addEventListener("change", () => { S.level = $("level").value; keep("level", S.level); newBoard(); });
  // (🚩 flag mode, from the controls or, in full screen with the controls hidden, from under ☰: fullscreen.js)
  let flagFs = null;
  const flagModeSet = on => {
    S.flagMode = on; $("flagmode").setAttribute("aria-pressed", String(on));
    if (flagFs) flagFs.setAttribute("aria-pressed", String(on));
  };
  $("flagmode").addEventListener("click", () => flagModeSet(!S.flagMode));
  if (window.OracleFs) window.OracleFs.offer({ label: "💣 New board", title: "A new board, at the level chosen", cast: newBoard });
  if (window.OracleFs && window.OracleFs.tool) {
    flagFs = window.OracleFs.tool({ label: "🚩", title: "Flag mode: taps flag instead of open", click: () => flagModeSet(!S.flagMode) });
    flagFs.setAttribute("aria-pressed", "false");
  }

  // ---- Hazel: its library, the program built from the listings, and the status line
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr, so there is nothing to sweep by: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules lay the mines and open the cells."; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s: every tap is asked of them.`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so no tap can be answered: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build") + ". Put them back with the button under the listings.";
  }
  let L = null, timer = 0;
  function build() {
    if (!window.Hazel || !L) return;
    const sp = L.spec(PROGRAM, TAIL), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now(); let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!r.ok && !!v && typeof v.reveal === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0, at: performance.now() };
    drawStatus();
    if (S.built.ok && !S.game) newBoard(); else draw();
  }
  let libAsked = false;
  function loadLib() {
    if (libAsked) return; libAsked = true;
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
    L.onChange(PROGRAM, () => { clearTimeout(timer); timer = setTimeout(build, 350); });
    loadLib();
  } catch (e) {
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });

  // ---- ⚙️ Advanced: this device's speed
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Minesweeper", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: "interpreted", error: null }),
    about: "a beginner board's mines laid and its first tap, twenty taps after it, and ten drawings of the board",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      const time = f => { const t = performance.now(); const v = f(); return [performance.now() - t, v]; };
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const [layMs, g0] = time(() => h.lay(9, 9, 10, Array.from({ length: 81 }, rnd), 4, 4));
      const [firstMs, g1] = time(() => h.reveal(g0, 4, 4));
      const taps = []; let g = g1;
      for (let r = 0; r < 9 && taps.length < 20; r++) for (let c = 0; c < 9 && taps.length < 20; c++) if (!g.grid[r][c].open && !g.grid[r][c].mine) { const [t, g2] = time(() => h.reveal(g, r, c)); taps.push(t); g = g2; }
      say("🧪 measuring: drawing the board…");
      const keepState = { game: S.game, level: S.level }, draws = [];
      Object.assign(S, { game: g1, level: "beginner" });
      for (let i = 0; i < 10; i++) { const t = performance.now(); draw(); await window.OracleAdvanced.painted(); draws.push(performance.now() - t); }
      Object.assign(S, keepState); draw();
      const st = window.OracleAdvanced.stats, tp = st(taps), dr = st(draws);
      return { data: { lay: Math.round(layMs), first: Math.round(firstMs), tap: tp, draw: dr },
               text: [`through Hazel: the mines laid ${Math.round(layMs)} ms, the first tap ${Math.round(firstMs)} ms, a tap ${tp.median} ms (worst ${tp.worst})`,
                      `drawing the board, to the next frame: ${dr.median} ms`] };
    },
  });
  document.body.classList.add("js");
  drawStatus(); draw();
})();
