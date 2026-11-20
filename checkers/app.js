// hazeljs-examples, Checkers: the page. The moves (steps, and jumps, which are compulsory and go on while they can), a move
// made, the kings, the end, and the opponent's look-ahead are Hazel (rules/*.hz), shown in Hazel's own editor
// (../shared/hazel-listings.js) and built by hazeljs from npm. You play black, from the bottom; Hazel plays white. The game
// is a value the page holds and passes back in: each side's pieces are a set of the 32 dark squares, kept in a number's bits.
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "checkers", MODULES = ["Checkers"];
  const TAIL = "(start = Checkers.start, moves = Checkers.moves, apply = Checkers.apply, choose = Checkers.choose)";
  const KEY = "hazeljs-examples/checkers/";
  // (0.0.34, ticket 794, as the oracles since 0.0.13) the rules run compiled ahead of time to JavaScript by hazel-jit
  // (compiled.js), without loading hazeljs or building the program, unless the address asks for interpreted (?interpreted=1,
  // or ?compiled=0) or the rules are edited, when hazeljs loads and runs the edited rules
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };
  // (the next frame painted, or 60 ms, whichever comes first: a page in the background draws no frames)
  const painted = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => setTimeout(go, 0)); setTimeout(go, 60); });
  // a set of squares, as Hazel keeps it: bit k for square k (a number from Hazel may come as its 32 bits read signed)
  const wide = b => b < 0 ? b + 2 ** 32 : b;
  const has = (b, k) => Math.floor(wide(b) / 2 ** k) % 2 === 1;
  const count = b => { let n = 0; for (let k = 0; k < 32; k++) if (has(b, k)) n++; return n; };
  const rc = s => { const r = s >> 2; return [r, 2 * (s & 3) + (r % 2 === 0 ? 1 : 0)]; };
  const last = m => m.path.length ? m.path[m.path.length - 1] : m.from;

  // ---- the state: Hazel's program, how far it looks, the game (a Hazel value), the moves to undo, the piece chosen
  const S = { built: null, libAt: 0, libFailed: false, depth: kept("depth", 3), game: null, undo: [], legal: [], sel: -1, busy: false, note: "", thinkMs: 0, compiledError: "", auto: false, touched: false, looping: false };
  if (![1, 2, 3, 4].concat(COMPILED ? [5, 6] : []).includes(S.depth)) S.depth = 3;
  // (0.0.34) compiled, Hazel looks further: 5 ahead in about 13 ms and 6 in about 50 (node/compare-compiled.mjs), where
  // hazeljs took 11 s for 4; interpreted, 5 and 6 fall back to 4
  if (COMPILED && $("depth")) {
    const four = $("depth").querySelector('option[value="4"]'); if (four) four.textContent = "4 moves ahead";
    for (const d of [5, 6]) { const o = document.createElement("option"); o.value = String(d); o.textContent = `${d} moves ahead (compiled)`; $("depth").append(o); }
  }
  const saved = kept("game", null);
  if (saved && saved.game && typeof saved.game.black === "number") Object.assign(S, { game: saved.game, undo: saved.undo || [], touched: !!saved.touched });
  const stats = kept("stats", {});
  const H = () => S.built && S.built.ok ? S.built.value : null;
  const save = () => keep("game", S.game ? { game: S.game, undo: S.undo.slice(-30), touched: S.touched } : null);
  const mine = () => !!S.game && !S.game.over && !S.busy && !S.auto && S.game.turn === 1;
  function refresh() {
    const h = H(); S.legal = [];
    if (h && mine()) { try { S.legal = h.moves(S.game) || []; } catch (e) { S.legal = []; } }
  }

  // ---- the board, drawn as an SVG: the squares, Hazel's last move, the pieces and kings, the piece chosen and where it may go
  const board = $("board");
  const U = 60;
  function draw() {
    const g = S.game;
    $("depth").value = String(S.depth);
    if (!g) { board.replaceChildren(); bar(); info(); able(); return; }
    const jumpers = new Set(S.legal.filter(m => m.took.length).map(m => m.from));
    const targets = S.sel >= 0 ? new Set(S.legal.filter(m => m.from === S.sel).map(last)) : new Set();
    const lastMove = new Set(g.last || []);
    const parts = [`<svg viewBox="0 0 ${8 * U} ${8 * U}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The board">`,
      `<defs><radialGradient id="pb" cx="38%" cy="34%" r="72%"><stop offset="0" stop-color="#5d626c"/><stop offset="0.5" stop-color="#22252b"/><stop offset="1" stop-color="#08090b"/></radialGradient>`,
      `<radialGradient id="pw" cx="38%" cy="34%" r="75%"><stop offset="0" stop-color="#fffdf7"/><stop offset="0.6" stop-color="#efe6d2"/><stop offset="1" stop-color="#c8b994"/></radialGradient></defs>`];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 0) parts.push(`<rect x="${c * U}" y="${r * U}" width="${U}" height="${U}" fill="#efd9b4"/>`);
    for (let s = 0; s < 32; s++) {
      const [r, c] = rc(s), x = c * U, y = r * U, cx = x + U / 2, cy = y + U / 2;
      parts.push(`<rect x="${x}" y="${y}" width="${U}" height="${U}" fill="${lastMove.has(s) ? "#9a6a3a" : "#7a4a2a"}"/>`);
      const b = has(g.black, s), w = has(g.white, s);
      if (b || w) {
        parts.push(`<circle cx="${cx}" cy="${cy + 3}" r="${U * 0.4}" fill="#000" opacity="0.35"/><circle cx="${cx}" cy="${cy}" r="${U * 0.4}" fill="url(#${b ? "pb" : "pw"})" stroke="${b ? "#000" : "#8c7a5c"}" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${U * 0.26}" fill="none" stroke="${b ? "#4a4f58" : "#c9b48e"}" stroke-width="2.5"/>`);
        if (has(g.kings, s)) parts.push(`<path d="M${cx - 12} ${cy + 7} L${cx - 14} ${cy - 7} L${cx - 6} ${cy - 1} L${cx} ${cy - 10} L${cx + 6} ${cy - 1} L${cx + 14} ${cy - 7} L${cx + 12} ${cy + 7} Z" fill="#f2c14e" stroke="#7a5a10" stroke-width="1.8"/>`);
        if (s === S.sel) parts.push(`<circle cx="${cx}" cy="${cy}" r="${U * 0.46}" fill="none" stroke="#fbbf24" stroke-width="4"/>`);
        else if (b && jumpers.has(s)) parts.push(`<circle cx="${cx}" cy="${cy}" r="${U * 0.46}" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5 4"/>`);
      }
      if (targets.has(s)) parts.push(`<circle cx="${cx}" cy="${cy}" r="${U * 0.14}" fill="#34d399" stroke="#065f46" stroke-width="1.5"/>`);
    }
    // (a target on each dark square, last so it takes the tap)
    for (let s = 0; s < 32; s++) { const [r, c] = rc(s); parts.push(`<rect class="sq" data-s="${s}" x="${c * U}" y="${r * U}" width="${U}" height="${U}" fill="transparent"/>`); }
    parts.push(`</svg>`);
    board.innerHTML = parts.join("");
    board.classList.toggle("busy", S.busy); board.classList.toggle("over", !!g.over);
    bar(); info(); able();
    if (window.OracleFs) window.OracleFs.empty(!!g.over);
  }
  function bar() {
    const g = S.game;
    const tookB = g ? 12 - count(g.white) : 0, tookW = g ? 12 - count(g.black) : 0;
    $("you").textContent = (S.auto ? "⚫ Hazel, for you" : "⚫ You") + (tookB ? ` · took ${tookB}` : "");
    $("hazel").textContent = "⚪ Hazel" + (tookW ? ` · took ${tookW}` : "");
    $("you").classList.toggle("now", mine() || (S.auto && !!g && !g.over && g.turn === 1));
    $("hazel").classList.toggle("now", !!g && !g.over && (g.turn === 2 || (S.busy && !S.auto)));
    $("turn").textContent = !g ? "" : g.over ? "Game over" : S.auto ? (g.turn === 1 ? "⚫ Hazel's move, for you" : "⚪ Hazel's move") : S.busy ? "🤔 Hazel is thinking…" : g.turn === 1 ? (S.legal.some(m => m.took.length) ? "Your move: you must jump" : "Your move") : "Hazel's move";
  }
  function info() {
    const st = stats[S.depth] || { played: 0, won: 0 };
    const tally = `against Hazel looking ${S.depth} ahead: you won ${st.won} of ${st.played} on this device`;
    let line = S.note;
    const g = S.game;
    if (g && g.over) line = S.touched ? outcome(g) + (g.winner ? ": the other side has no move left." : ": 80 moves with no piece taken and no man moving.")
      : g.winner === 1 ? "🎉 You win: Hazel has no move left." : g.winner === 2 ? "Hazel wins: you have no move left." : "A draw: 80 moves with no piece taken and no man moving.";
    $("info").textContent = (line ? line + " · " : "") + tally + (S.touched ? " (games Hazel played for you are not counted)" : "");
  }
  function able() { $("undo").disabled = S.busy || S.auto || !S.undo.length || !H(); }
  const outcome = g => g.winner === 1 ? "⚫ Hazel, playing for you, wins" : g.winner === 2 ? "⚪ Hazel wins" : "A draw";

  // ---- a move: yours (a piece, then where it goes), then Hazel's, chosen by Hazel
  function tap(s) {
    const h = H(); if (!h || !mine()) return;
    const from = S.legal.filter(m => m.from === s);
    if (from.length) { S.sel = s; S.note = ""; draw(); return; }
    if (S.sel >= 0) {
      const m = S.legal.find(m => m.from === S.sel && last(m) === s);
      if (m) { play(m); return; }
    }
    // (nothing goes there: say why, and flash the square)
    const g = S.game, any = S.legal.some(m => m.took.length);
    S.note = has(g.black, s) ? (any ? "You must jump: the pieces that can are outlined." : "That piece cannot move now.") : has(g.white, s) ? "That is one of Hazel's pieces." : S.sel >= 0 ? "The chosen piece cannot go there: the green dots show where it can." : "Tap one of your pieces first.";
    draw();
    const t = board.querySelector(`[data-s="${s}"]`); if (t) t.classList.add("nope");
  }
  function play(m) {
    const h = H(), g = S.game; let g2 = null;
    try { g2 = h.apply(g, m); } catch (e) { g2 = null; }
    if (!g2) return;
    S.undo.push(g); S.game = g2; S.sel = -1; S.note = m.took.length > 1 ? `You took ${m.took.length} in one move.` : "";
    if (g2.over) finish();
    refresh(); save(); draw();
    reply();
  }
  async function reply() {
    const h = H(); let g = S.game; if (!h || !g || g.over || g.turn !== 2 || S.busy) return;
    S.busy = true; refresh(); draw(); await painted();
    const rs = Array.from({ length: 48 }, () => Math.floor(Math.random() * 1000));
    const t = performance.now(); let m = null;
    try { m = h.choose(g, S.built.compiled ? S.depth : Math.min(S.depth, 4), rs); } catch (e) { m = null; }
    S.thinkMs = performance.now() - t;
    if (m && m.from >= 0) { try { g = h.apply(g, m); } catch (e) { /* the game as it was */ } }
    S.busy = false; S.game = g;
    if (m && m.took && m.took.length > 1) S.note = `Hazel took ${m.took.length} in one move.`;
    if (g.over) finish();
    refresh(); save(); draw(); drawStatus();
    if (S.auto) autoplay();
  }
  function finish() {
    if (S.touched) { W.end(outcome(S.game)); return; }
    const st = stats[S.depth] || { played: 0, won: 0 }; st.played++;
    if (S.game.winner === 1) st.won++;
    stats[S.depth] = st; keep("stats", stats);
  }
  function newGame() {
    const h = H(); if (!h || S.busy) return;
    S.game = h.start; Object.assign(S, { undo: [], sel: -1, note: "", touched: S.auto });
    if (S.auto) W.start(0);
    refresh(); save(); draw();
    if (S.auto) autoplay();
  }
  // ---- 🤖 Hazel plays for you (0.0.34, ticket 796): Hazel plays both sides to the end, at the pace chosen, and the clock
  // times it. Each side looks as far ahead as chosen above. At full speed the moves follow at once, the board drawn once a
  // frame at most.
  async function autoplay() {
    if (S.looping) return; S.looping = true;
    while (S.busy) await new Promise(r => setTimeout(r, 30));
    S.busy = true; refresh(); draw();
    try {
      while (S.auto && S.game && !S.game.over && H()) {
        const h = H(), g = S.game, side = g.turn;
        const rs = Array.from({ length: 48 }, () => Math.floor(Math.random() * 1000));
        const t = performance.now(); let m = null, g2 = null;
        try { m = h.choose(g, S.built.compiled ? S.depth : Math.min(S.depth, 4), rs); if (m && m.from >= 0) g2 = h.apply(g, m); } catch (e) { g2 = null; }
        const ms = performance.now() - t;
        if (!g2) { S.note = "Hazel found no move here."; break; }
        W.think(side === 1 ? 0 : 1, ms); S.thinkMs = ms;
        S.undo.push(g); S.game = g2; S.touched = true;
        if (g2.over) break;
        await W.between(() => { draw(); });
      }
    } finally { S.busy = false; S.looping = false; }
    if (S.game && S.game.over) finish();
    refresh(); save(); draw(); drawStatus();
    // (the switch turned off mid-game: the game goes on as before, Hazel answering your moves)
    if (!S.auto && S.game && !S.game.over && S.game.turn === 2) reply();
  }
  const W = window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["⚫", "⚪"],
    onChange: on => {
      S.auto = on; S.sel = -1;
      if (!on) { W.stop(); refresh(); draw(); return; }
      if (!H()) { draw(); return; }
      if (!S.game || S.game.over) { newGame(); return; }
      S.touched = true; W.start(S.undo.length); autoplay();
    },
  });
  function undo() {
    if (S.busy || S.auto || !S.undo.length) return;
    S.game = S.undo.pop(); S.sel = -1; S.note = ""; refresh(); save(); draw();
  }
  board.addEventListener("click", e => { const t = e.target.closest("[data-s]"); if (t) tap(+t.dataset.s); });
  $("new").addEventListener("click", newGame);
  $("undo").addEventListener("click", undo);
  $("depth").addEventListener("change", () => { S.depth = +$("depth").value; keep("depth", S.depth); info(); });
  if (window.OracleFs) window.OracleFs.offer({ label: "⚫ New game", title: "A new game", cast: newGame });

  // ---- Hazel: its library, the program built from the listings, and the status line
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (COMPILED && S.compiledError && !(b && b.compiled) && !window.Hazel) { st.className = "status no"; st.textContent = `Compiled mode was asked for, but compiled.js did not run (${S.compiledError}); loading Hazel to interpret the rules instead.`; return; }
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), without loading Hazel's library or building the program` + (S.thinkMs ? ` (Hazel's last move took ${S.thinkMs < 100 ? Math.round(S.thinkMs) + " ms" : (S.thinkMs / 1000).toFixed(1) + " s"}).` : "."); return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr, so there is no one to play: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules play and choose."; return; }
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
    S.built = { key, ok: !!r.ok && !!v && typeof v.moves === "function" && typeof v.choose === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0, at: performance.now() };
    drawStatus();
    if (S.built.ok && !S.game) newGame(); else { refresh(); draw(); }
    if (S.built.ok && S.game && !S.game.over && S.game.turn === 2) reply();
  }
  function loadCompiled() {
    addEventListener("error", e => { if (/compiled\.js/.test(e.filename || "")) S.compiledError = String(e.message || e.error || "an error"); });
    const c = document.createElement("script");
    c.src = "compiled.js?v=0.0.34"; c.async = true;
    c.onload = () => {
      const v = window.CheckersCompiled;
      if (v && !S.built) {
        S.libAt = performance.now(); S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() };
        drawStatus();
        if (!S.game) newGame(); else { refresh(); draw(); }
        if (S.game && !S.game.over && S.game.turn === 2) reply();
      } else if (!v) { S.compiledError = S.compiledError || "it ran, but gave no Checkers"; drawStatus(); loadLib(); }
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
    holder: $("advanced"), name: "Checkers", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "the opening position's moves, and Hazel's choice of move from it looking 1, 2 and 3 ahead",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      const time = f => { const t = performance.now(); const v = f(); return [performance.now() - t, v]; };
      const [tm] = time(() => h.moves(h.start));
      const looks = [];
      for (const d of [1, 2, 3]) { say(`🧪 measuring: Hazel looking ${d} ahead…`); await painted(); const [t] = time(() => h.choose(h.start, d, [])); looks.push(Math.round(t)); }
      return { data: { moves: Math.round(tm), choose: looks },
               text: [`through Hazel: the opening's moves ${Math.round(tm)} ms; Hazel's choice looking 1, 2 and 3 ahead: ${looks.join(", ")} ms`] };
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
