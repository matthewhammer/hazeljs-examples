// hazeljs-examples, Go: the page. The board, a move (the stones it takes, never one that leaves its own stones without a
// liberty, the ko), a pass, the score (Tromp and Taylor's area rules) and the opponent's choice of move are Hazel
// (rules/*.hz), shown in Hazel's own editor (../shared/hazel-listings.js) and built by hazeljs from npm. You play black;
// Hazel plays white. The game is a value the page holds and passes back in: (game, point) -> game.
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "go", MODULES = ["Go"];
  const TAIL = "(fresh = Go.fresh, play = Go.play, pass = Go.pass, score = Go.score, choose = Go.choose)";
  const KEY = "hazeljs-examples/go/";
  // (0.0.34, ticket 794, as the oracles since 0.0.13 and Checkers in 0.0.34) the rules run compiled ahead of time to JavaScript
  // by hazel-jit (compiled.js), without loading hazeljs or building the program, unless the address asks for interpreted
  // (?interpreted=1, or ?compiled=0) or the rules are edited, when hazeljs loads and runs the edited rules
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const SIZES = [7, 9];
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };
  // (the next frame painted, or 60 ms, whichever comes first: a page in the background draws no frames)
  const painted = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => setTimeout(go, 0)); setTimeout(go, 60); });

  // ---- the state: Hazel's program, the board size, the game (a Hazel value), the moves to undo, the score once it is over
  const S = { built: null, libAt: 0, libFailed: false, size: kept("size", 9), game: null, undo: [], score: null, busy: false, note: "", thinkMs: 0, compiledError: "", auto: false, touched: false, looping: false };
  if (!SIZES.includes(S.size)) S.size = 9;
  const saved = kept("game", null);
  if (saved && saved.game && Array.isArray(saved.game.board) && saved.game.size === S.size) Object.assign(S, { game: saved.game, undo: saved.undo || [], score: saved.score || null, touched: !!saved.touched });
  const stats = kept("stats", {});
  const H = () => S.built && S.built.ok ? S.built.value : null;
  const save = () => keep("game", S.game ? { game: S.game, undo: S.undo.slice(-30), score: S.score, touched: S.touched } : null);
  const at = (g, p) => g.board[Math.floor(p / g.size)][p % g.size];

  // ---- the board, drawn as an SVG: the wood, the lines, the star points, the stones, the last move, and at the end who owns each point
  const board = $("board");
  const U = 40, PAD = 30;
  const stars = n => n === 9 ? [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]] : n === 7 ? [[2, 2], [2, 4], [4, 2], [4, 4], [3, 3]] : [];
  function draw() {
    const g = S.game;
    $("size").value = String(S.size);
    if (!g) { board.replaceChildren(); bar(); info(); able(); return; }
    const n = g.size, W = PAD * 2 + U * (n - 1), X = c => PAD + U * c;
    const parts = [`<svg viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A ${n} by ${n} board">`,
      `<defs><radialGradient id="gb" cx="36%" cy="32%" r="72%"><stop offset="0" stop-color="#6b6f78"/><stop offset="0.45" stop-color="#23262c"/><stop offset="1" stop-color="#050608"/></radialGradient>`,
      `<radialGradient id="gw" cx="36%" cy="32%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="0.6" stop-color="#eceae4"/><stop offset="1" stop-color="#bdb9b0"/></radialGradient>`,
      `<linearGradient id="gwood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ecc67c"/><stop offset="0.55" stop-color="#ddae5c"/><stop offset="1" stop-color="#c79443"/></linearGradient></defs>`,
      `<rect width="${W}" height="${W}" rx="10" fill="url(#gwood)"/><g stroke="#4a3518" stroke-width="1.6">`];
    for (let i = 0; i < n; i++) parts.push(`<line x1="${X(0)}" y1="${X(i)}" x2="${X(n - 1)}" y2="${X(i)}"/><line x1="${X(i)}" y1="${X(0)}" x2="${X(i)}" y2="${X(n - 1)}"/>`);
    parts.push(`</g><g fill="#4a3518">`);
    for (const [r, c] of stars(n)) parts.push(`<circle cx="${X(c)}" cy="${X(r)}" r="3.6"/>`);
    parts.push(`</g>`);
    const owners = S.score && Array.isArray(S.score.owners) ? S.score.owners : null;
    for (let p = 0; p < n * n; p++) {
      const r = Math.floor(p / n), c = p % n, s = at(g, p);
      if (s) parts.push(`<circle cx="${X(c)}" cy="${X(r)}" r="${U * 0.47}" fill="url(#${s === 1 ? "gb" : "gw"})"${s === 2 ? ' stroke="#8a8a8a" stroke-width="0.8"' : ""}/>`);
      else if (owners && owners[p]) parts.push(`<rect x="${X(c) - 7}" y="${X(r) - 7}" width="14" height="14" rx="2" fill="${owners[p] === 1 ? "#1f2328" : "#f8f8f6"}" stroke="#5b4a2c" stroke-width="0.8" opacity="0.9"/>`);
      if (p === g.last && s) parts.push(`<circle cx="${X(c)}" cy="${X(r)}" r="${U * 0.16}" fill="none" stroke="${s === 1 ? "#f2f2f2" : "#222"}" stroke-width="2.4"/>`);
    }
    // (a target for each point, a little larger than the stone, last so it takes the click)
    for (let p = 0; p < n * n; p++) parts.push(`<rect class="pt" data-p="${p}" x="${X(p % n) - U / 2}" y="${X(Math.floor(p / n)) - U / 2}" width="${U}" height="${U}"><title>${"ABCDEFGHJ"[p % n]}${n - Math.floor(p / n)}</title></rect>`);
    parts.push(`</svg>`);
    board.innerHTML = parts.join("");
    board.classList.toggle("busy", S.busy); board.classList.toggle("over", !!g.over);
    bar(); info(); able();
    if (window.OracleFs) window.OracleFs.empty(!!g.over);
  }
  function bar() {
    const g = S.game;
    $("you").textContent = (S.auto ? "⚫ Hazel, for you" : "⚫ You") + (g && g.black_took ? ` · took ${g.black_took}` : "");
    $("hazel").textContent = "⚪ Hazel" + (g && g.white_took ? ` · took ${g.white_took}` : "");
    $("you").classList.toggle("now", !!g && !g.over && g.turn === 1 && (!S.busy || S.auto));
    $("hazel").classList.toggle("now", !!g && !g.over && (g.turn === 2 || (S.busy && !S.auto)));
    $("turn").textContent = !g ? "" : g.over ? "Game over" : S.auto ? (g.turn === 1 ? "⚫ Hazel's move, for you" : "⚪ Hazel's move") : S.busy ? "🤔 Hazel is thinking…" : g.turn === 1 ? "Your move" : "Hazel's move";
  }
  function info() {
    const st = stats[S.size] || { played: 0, won: 0 };
    const tally = `${S.size} by ${S.size}: you won ${st.won} of ${st.played} on this device`;
    let line = S.note;
    if (S.game && S.game.over && S.score) {
      const b = S.score.black, w = S.score.white + S.score.komi;
      const g = S.game, owned = (S.score.owners || []).filter((o, p) => o && !at(g, p)).length;
      line = `Black ${S.score.black}, White ${S.score.white} + ${S.score.komi} komi = ${w}: ` + (S.touched ? outcome() + "." : b > w ? `🎉 you win by ${b - w}.` : b < w ? `Hazel wins by ${w - b}.` : "a draw.") +
        (owned ? " A small square marks an empty point only one side's stones reach." : " No empty point is reached by one side's stones alone.");
    }
    $("info").textContent = (line ? line + " · " : "") + tally + (S.touched ? " (games Hazel played for you are not counted)" : "");
  }
  const outcome = () => { if (!S.score) return "Game over"; const b = S.score.black, w = S.score.white + S.score.komi;
    return b > w ? `⚫ Hazel, playing for you, wins by ${b - w}` : b < w ? `⚪ Hazel wins by ${w - b}` : "A draw"; };
  function able() {
    const g = S.game, mine = !!H() && !!g && !g.over && !S.busy && !S.auto && g.turn === 1;
    $("pass").disabled = !mine; $("undo").disabled = S.busy || S.auto || !S.undo.length || !H();
    if (passFs) passFs.disabled = !mine;
  }

  // ---- a move: yours, asked of Hazel, then Hazel's reply, chosen by Hazel
  function whyNot(g, p) {
    if (at(g, p)) return "That point has a stone on it already.";
    if (p === g.ko) return "Not yet: that would take back the stone just taken (the ko). Play somewhere else first.";
    return "Not allowed: that stone would have no empty point beside it, and would take nothing.";
  }
  function tap(p) {
    const h = H(), g = S.game; if (!h || !g || g.over || S.busy || S.auto || g.turn !== 1) return;
    let g2 = null;
    try { g2 = h.play(g, p); } catch (e) { g2 = null; }
    if (!g2) return;
    if (g2.turn === g.turn) {
      S.note = whyNot(g, p); info();
      const t = board.querySelector(`[data-p="${p}"]`); if (t) { t.classList.remove("nope"); void t.getBBox(); t.classList.add("nope"); }
      return;
    }
    S.undo.push(g); S.game = g2; S.note = ""; save(); draw();
    reply();
  }
  async function reply() {
    const h = H(); let g = S.game; if (!h || !g || g.over || g.turn !== 2 || S.busy) return;
    S.busy = true; draw(); await painted();
    const rs = Array.from({ length: g.size * g.size }, () => Math.floor(Math.random() * 20));
    const t = performance.now(); let w = -1;
    try { w = h.choose(g, rs); } catch (e) { w = -1; }
    S.thinkMs = performance.now() - t;
    try { g = w < 0 ? h.pass(g) : h.play(g, w); } catch (e) { /* the game as it was */ }
    S.busy = false; S.game = g;
    S.note = w < 0 && !g.over ? "Hazel passes: play on, or pass too to end the game." : "";
    if (g.over) finish();
    save(); draw(); drawStatus();
    if (S.auto) autoplay();
  }
  function pass() {
    const h = H(), g = S.game; if (!h || !g || g.over || S.busy || S.auto || g.turn !== 1) return;
    S.undo.push(g); S.game = h.pass(g); S.note = "";
    if (S.game.over) finish();
    save(); draw();
    if (!S.game.over) reply();
  }
  function finish() {
    const h = H(); if (!h) return;
    try { S.score = h.score(S.game); } catch (e) { S.score = null; }
    if (!S.score) return;
    if (S.touched) { W.end(outcome()); return; }
    const st = stats[S.size] || { played: 0, won: 0 }; st.played++;
    if (S.score.black > S.score.white + S.score.komi) st.won++;
    stats[S.size] = st; keep("stats", stats);
  }
  function newGame() {
    const h = H(); if (!h || S.busy) return;
    S.game = h.fresh(S.size); Object.assign(S, { undo: [], score: null, note: "", touched: S.auto });
    if (S.auto) W.start(0);
    save(); draw();
    if (S.auto) autoplay();
  }
  // ---- 🤖 Hazel plays for you (0.0.34, ticket 796): Hazel plays both sides to the end, at the pace chosen, and the clock
  // times it. Each side passes when Hazel's choice is to pass; two passes end the game. A game that runs past four moves a
  // point (a ko fight can go round) is ended by both passing. At full speed the moves follow at once.
  async function autoplay() {
    if (S.looping) return; S.looping = true;
    while (S.busy) await new Promise(r => setTimeout(r, 30));
    S.busy = true; draw();
    try {
      while (S.auto && S.game && !S.game.over && H()) {
        const h = H(), g = S.game, side = g.turn, n = g.size;
        const rs = Array.from({ length: n * n }, () => Math.floor(Math.random() * 20));
        const t = performance.now(); let w = -1, g2 = null;
        const long = S.undo.length >= 4 * n * n;
        try { w = long ? -1 : h.choose(g, rs); g2 = w < 0 ? h.pass(g) : h.play(g, w); } catch (e) { g2 = null; }
        const ms = performance.now() - t;
        if (!g2) { S.note = "Hazel's rules stopped here."; break; }
        if (w >= 0 && g2.turn === g.turn) { g2 = h.pass(g); } // (a choice the rules then refused: a pass instead)
        W.think(side === 1 ? 0 : 1, ms); S.thinkMs = ms;
        S.undo.push(g); S.game = g2; S.touched = true;
        S.note = long ? `Both pass: ${S.undo.length} moves, past four a point.` : w < 0 && !g2.over ? (side === 1 ? "⚫ Hazel, for you, passes." : "⚪ Hazel passes.") : "";
        if (g2.over) break;
        await W.between(() => { draw(); });
      }
    } finally { S.busy = false; S.looping = false; }
    if (S.game && S.game.over) finish();
    save(); draw(); drawStatus();
    // (the switch turned off mid-game: the game goes on as before, Hazel answering your moves)
    if (!S.auto && S.game && !S.game.over && S.game.turn === 2) reply();
  }
  const W = window.HazelAutoplay.make({
    after: $("new").parentElement, key: KEY, sides: ["⚫", "⚪"],
    onChange: on => {
      S.auto = on;
      if (!on) { W.stop(); draw(); return; }
      if (!H()) { draw(); return; }
      if (!S.game || S.game.over) { newGame(); return; }
      S.touched = true; W.start(S.undo.length); autoplay();
    },
  });
  function undo() {
    if (S.busy || S.auto || !S.undo.length) return;
    S.game = S.undo.pop(); S.score = null; S.note = ""; save(); draw();
  }
  board.addEventListener("click", e => { const t = e.target.closest("[data-p]"); if (t) tap(+t.dataset.p); });
  $("new").addEventListener("click", newGame);
  $("pass").addEventListener("click", pass);
  $("undo").addEventListener("click", undo);
  $("size").addEventListener("change", () => { S.size = +$("size").value; keep("size", S.size); newGame(); });
  let passFs = null;
  if (window.OracleFs) window.OracleFs.offer({ label: "⚫ New game", title: "A new game, on the board size chosen", cast: newGame });
  if (window.OracleFs && window.OracleFs.tool) passFs = window.OracleFs.tool({ label: "⏭", title: "Pass: two passes in a row end the game", click: pass });

  // ---- Hazel: its library, the program built from the listings, and the status line
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (COMPILED && S.compiledError && !(b && b.compiled) && !window.Hazel) { st.className = "status no"; st.textContent = `Compiled mode was asked for, but compiled.js did not run (${S.compiledError}); loading Hazel to interpret the rules instead.`; return; }
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), without loading Hazel's library or building the program` + (S.thinkMs ? ` (Hazel's last move took ${S.thinkMs < 100 ? Math.round(S.thinkMs) + " ms" : (S.thinkMs / 1000).toFixed(1) + " s"})` : "") + "."; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr, so there is no one to play: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules play and score."; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s: every move is asked of them, and Hazel's choice too` + (S.thinkMs ? ` (its last took ${(S.thinkMs / 1000).toFixed(1)} s).` : "."); return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so no move can be answered: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build") + ". Put them back with the button under the listings.";
  }
  let L = null, timer = 0;
  function build() {
    if (!window.Hazel || !L) return;
    const sp = L.spec(PROGRAM, TAIL), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now(); let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!r.ok && !!v && typeof v.play === "function" && typeof v.choose === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0, at: performance.now() };
    drawStatus();
    if (S.built.ok && !S.game) newGame(); else draw();
    if (S.built.ok && S.game && !S.game.over && S.game.turn === 2) reply();
  }
  function loadCompiled() {
    addEventListener("error", e => { if (/compiled\.js/.test(e.filename || "")) S.compiledError = String(e.message || e.error || "an error"); });
    const c = document.createElement("script");
    c.src = "compiled.js?v=0.0.34"; c.async = true;
    c.onload = () => {
      const v = window.GoCompiled;
      if (v && !S.built) {
        S.libAt = performance.now(); S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() };
        drawStatus();
        if (!S.game) newGame(); else draw();
        if (S.game && !S.game.over && S.game.turn === 2) reply();
      } else if (!v) { S.compiledError = S.compiledError || "it ran, but gave no Go"; drawStatus(); loadLib(); }
    };
    c.onerror = () => { S.compiledError = "it did not load"; drawStatus(); loadLib(); };
    document.head.append(c);
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
    L.onChange(PROGRAM, () => { if (!window.Hazel) loadLib(); clearTimeout(timer); timer = setTimeout(build, 350); });
    if (COMPILED) loadCompiled(); else loadLib();
  } catch (e) {
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });

  // ---- ⚙️ Advanced: this device's speed
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Go", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "a 9 by 9 game's first six moves (three each, Hazel choosing white's), a move played, and the score",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      const time = f => { const t = performance.now(); const v = f(); return [performance.now() - t, v]; };
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      let g = h.fresh(9); const plays = [], chooses = [];
      for (const p of [40, 20, 60]) {
        const [tp, g1] = time(() => h.play(g, p)); plays.push(tp); g = g1;
        say("🧪 measuring: Hazel choosing a move…"); await painted();
        const rs = Array.from({ length: 81 }, () => Math.floor(rnd() * 20));
        const [tc, w] = time(() => h.choose(g, rs)); chooses.push(tc);
        g = w < 0 ? h.pass(g) : h.play(g, w);
      }
      const [ts] = time(() => h.score(g));
      const st = window.OracleAdvanced.stats, pl = st(plays), ch = st(chooses);
      return { data: { play: pl, choose: ch, score: Math.round(ts) },
               text: [`through Hazel: a move played ${pl.median} ms, Hazel's choice of move ${ch.median} ms (worst ${ch.worst}), the score ${Math.round(ts)} ms`] };
    },
  });
  // (0.0.34) the switch, under ⚙️ Advanced: this page compiled ahead of time, or interpreted
  { const box = $("advanced") && $("advanced").querySelector("details.advanced");
    if (box && box.querySelector(".advanced-version")) {
      const u = new URL(location.href); u.searchParams.delete("compiled"); if (COMPILED) u.searchParams.set("interpreted", "1"); else u.searchParams.delete("interpreted");
      const p = document.createElement("p"); p.className = "advanced-version";
      p.textContent = COMPILED ? "⚡ This page runs its rules compiled ahead of time to JavaScript, without loading Hazel (until you edit them). " : "⚡ This page interprets its rules with hazeljs. ";
      const a = document.createElement("a"); a.textContent = COMPILED ? "Open it interpreted" : "Open it compiled"; a.href = u.href;
      p.append(a); box.querySelector(".advanced-version").after(p);
    } }
  document.body.classList.add("js");
  drawStatus(); draw();
})();
