// hazeljs-examples, Solitaire: the page. Klondike's rules are Hazel (rules/*.hz): the deal, every legal move, the moves from
// one place, a move made, and the win, shown in Hazel's own editor (../shared/hazel-listings.js) and built by hazeljs from npm.
// The page draws the table and asks Hazel at every move; it keeps no rule of its own. The game is a value the page holds and
// passes back in, the shape a livelit for the game will want: (game, move) -> game.
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "solitaire", MODULES = ["Cards", "Deal", "Moves"];
  const TAIL = "(deal = Deal.deal, moves = Moves.moves, moves_from = Moves.moves_from, apply = Moves.apply, won = Moves.won)";
  const KEY = "hazeljs-examples/solitaire/";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: Hazel's program as built, the game (a Hazel value, kept as hazeljs gives it), the moves made, the undo stack
  const S = { built: null, libAt: 0, libFailed: false, game: null, moves: 0, started: 0, undo: [], hint: null, wonAt: 0 };
  let hintFs = null;   // (the 💡 under ☰ in full screen, while the controls are hidden: fullscreen.js)
  const saved = kept("game", null);
  if (saved && saved.game && Array.isArray(saved.game.piles)) Object.assign(S, { game: saved.game, moves: saved.moves || 0, started: saved.started || Date.now() });
  let DRAW = kept("draw", 1) === 3 ? 3 : 1;
  const stats = kept("stats", { played: 0, won: 0 });
  const H = () => S.built && S.built.ok ? S.built.value : null;

  // ---- the cards: Adrian Kennard's faces (cards/, CC0), and the back drawn by backs.js in the design and colours chosen
  const RANK = "A23456789TJQK", SUIT = { Spades: "S", Hearts: "H", Diamonds: "D", Clubs: "C" }, SIGN = { Spades: "♠", Hearts: "♥", Diamonds: "♦", Clubs: "♣" };
  const RANK_NAME = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King"];
  const faceOf = c => `cards/${RANK[c.rank - 1]}${SUIT[c.suit.tag]}.svg`;
  const nameOf = c => `${RANK_NAME[c.rank - 1]} of ${c.suit.tag}`;
  const B = window.SolitaireBacks;
  let BACK = kept("back", { design: "lily", theme: "blue" });
  if (!B.designs.some(d => d.id === BACK.design)) BACK.design = "lily";
  if (!B.themes.some(t => t.id === BACK.theme)) BACK.theme = "blue";
  const backUrls = new Map();
  const backUrl = (design = BACK.design, theme = BACK.theme) => {
    const k = design + "/" + theme;
    if (!backUrls.has(k)) backUrls.set(k, URL.createObjectURL(new Blob([B.svg(design, theme)], { type: "image/svg+xml" })));
    return backUrls.get(k);
  };

  // ---- the table
  const table = $("table");
  const cardEl = (c, up, from) => {
    const d = el("div", "sc" + (up ? "" : " down"));
    const i = el("img"); i.alt = up ? nameOf(c) : "a card, face down"; i.draggable = false; i.decoding = "async";
    i.src = up ? faceOf(c) : backUrl();
    d.append(i);
    if (from) d.dataset.from = JSON.stringify(from);
    return d;
  };
  function layout() {
    const w = table.clientWidth || 640;
    // (in full screen, the cards as big as the window allows: seven across, and a tall pile's height down)
    const fs = document.documentElement.classList.contains("oracle-fs");
    const most = fs ? Math.max(110, Math.floor((innerHeight - 60) / 5.2)) : 110;
    const cw = Math.max(36, Math.min(most, Math.floor((w - 16) / 7.9)));
    table.style.setProperty("--cw", cw + "px");
    return cw;
  }
  function draw() {
    const g = S.game, cw = layout();
    table.replaceChildren();
    if (!g) {
      const p = el("div", "won"); p.append(el("div", "", H() ? "Deal to start a game." : "⏳ The rules are loading…"));
      if (H()) { const b = el("button", "primary", "Deal"); b.type = "button"; b.addEventListener("click", newGame); p.append(b); }
      table.append(p);
      $("info").textContent = statsLine();
      tools(); if (window.OracleFs) window.OracleFs.empty(true);
      return;
    }
    const top = el("div", "row top"), bottom = el("div", "row");
    // the stock: a back to tap, or an empty place (↻ to turn the waste back)
    const stock = el("div", "slot stock" + (g.stock.length ? "" : " empty"));
    if (g.stock.length) { const c = cardEl(g.stock[0], false); c.dataset.stock = "1"; c.title = `${g.stock.length} cards: tap to turn ${g.draw === 3 ? "three" : "one"} over`; stock.append(c); }
    else { stock.textContent = g.waste.length ? "↻" : ""; stock.dataset.stock = "1"; stock.title = g.waste.length ? "Turn the waste back into the stock" : ""; }
    top.append(stock);
    // the waste: its top card, or the top three fanned when a draw turns three
    const waste = el("div", "slot waste" + (g.waste.length ? "" : " empty"));
    const show = g.waste.slice(0, g.draw === 3 ? 3 : 1).reverse();
    show.forEach((c, i) => {
      const isTop = i === show.length - 1;
      const d = cardEl(c, true, isTop ? { tag: "FromWaste" } : null);
      d.style.left = `calc(var(--cw) * ${0.22 * i})`; if (!isTop) d.classList.add("under");
      waste.append(d);
    });
    top.append(waste, el("div", "slot spacer"));
    // the foundations: each suit's top card, or its sign
    ["Spades", "Hearts", "Diamonds", "Clubs"].forEach((s, i) => {
      const f = g.foundations[i] || [];
      const slot = el("div", "slot found" + (f.length ? "" : " empty"), f.length ? undefined : SIGN[s]);
      slot.dataset.to = JSON.stringify({ tag: "ToFoundation" });
      if (f.length) slot.append(cardEl(f[0], true, { tag: "FromFoundation", value: i }));
      top.append(slot);
    });
    // the seven piles: face-down cards close together, the face-up run fanned below them
    const fanDown = cw * 0.16, fanUp = cw * 0.3;
    g.piles.forEach((p, j) => {
      const pile = el("div", "pile"); pile.dataset.to = JSON.stringify({ tag: "ToPile", value: j });
      const base = el("div", "slot empty"); pile.append(base);
      let y = 0;
      [...p.down].reverse().forEach(c => { const d = cardEl(c, false); d.style.top = y + "px"; pile.append(d); y += fanDown; });
      const up = [...p.up].reverse();
      up.forEach((c, k) => {
        const count = up.length - k;
        const d = cardEl(c, true, { tag: "FromPile", value: { pile: j, count } }); d.style.top = y + "px"; pile.append(d);
        if (k < up.length - 1) y += fanUp;
      });
      pile.style.height = `calc(${y}px + var(--ch))`;
      bottom.append(pile);
    });
    table.append(top, bottom);
    if (S.hint) markHint(S.hint);
    if (S.wonAt) {
      const w = el("div", "won"); w.append(el("div", "", `🎉 Won in ${S.moves} moves, ${clock(S.wonAt - S.started)}`));
      const b = el("button", "primary", "Deal again"); b.type = "button"; b.addEventListener("click", newGame); w.append(b);
      table.append(w);
    }
    $("info").textContent = `${S.moves} moves · ${clock(Date.now() - S.started)} · ` + statsLine();
    tools();
    if (window.OracleFs) window.OracleFs.empty(false);
  }
  const clock = ms => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const statsLine = () => `won ${stats.won} of ${stats.played} on this device`;
  function tools() {
    const g = S.game;
    $("undo").disabled = !S.undo.length;
    $("hint").disabled = !g || !!S.wonAt || !H();
    if (hintFs) hintFs.disabled = $("hint").disabled;
    $("new").disabled = !H();
    const ready = g && !S.wonAt && !g.stock.length && !g.waste.length && g.piles.every(p => !p.down.length);
    $("finish").hidden = !ready;
  }
  setInterval(() => { if (S.game && !S.wonAt && document.visibilityState === "visible") $("info").textContent = `${S.moves} moves · ${clock(Date.now() - S.started)} · ` + statsLine(); }, 1000);
  addEventListener("resize", () => { if (S.game) draw(); else layout(); });

  // ---- the moves: each asked of Hazel
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function save() { keep("game", S.game && !S.wonAt ? { game: S.game, moves: S.moves, started: S.started } : null); }
  function play(m) {
    const h = H(); if (!h || !S.game || S.wonAt) return false;
    let g;
    try { g = h.apply(S.game, m); } catch (e) { return false; }
    if (!g || !Array.isArray(g.piles) || same(g, S.game)) return false;
    S.undo.push({ game: S.game, moves: S.moves }); if (S.undo.length > 500) S.undo.shift();
    S.game = g; S.moves++; S.hint = null;
    if (h.won(g)) { S.wonAt = Date.now(); stats.won++; keep("stats", stats); }
    save(); draw();
    return true;
  }
  function newGame() {
    const h = H(); if (!h) return;
    S.game = h.deal(Array.from({ length: 52 }, Math.random), DRAW);
    Object.assign(S, { moves: 0, started: Date.now(), undo: [], hint: null, wonAt: 0 });
    stats.played++; keep("stats", stats);
    save(); draw();
  }
  function nope(node) { if (!node) return; node.classList.remove("nope"); void node.offsetWidth; node.classList.add("nope"); }
  // a tap: the first place Hazel says the card (and those on it) may go, its foundation first
  function tap(from, node) {
    const h = H(); if (!h || !S.game) return;
    let ms = [];
    try { ms = h.moves_from(S.game, from); } catch (e) { ms = []; }
    if (!ms.length || !play(ms[0])) nope(node);
  }
  function stockTap() { if (!S.game || S.wonAt) return; play({ tag: S.game.stock.length ? "Draw" : "Redeal" }) || nope(table.querySelector(".stock")); }

  // ---- dragging: a card and those on it follow the pointer; let go over a pile or a foundation, and Hazel judges the move
  let press = null;
  table.addEventListener("pointerdown", e => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const card = e.target.closest(".sc"), stock = e.target.closest("[data-stock]");
    if (stock && (!card || card.dataset.stock)) { press = { stock: true }; return; }
    if (!card || !card.dataset.from) return;
    const run = [card]; let n = card.nextElementSibling;
    while (n && n.classList.contains("sc")) { run.push(n); n = n.nextElementSibling; }
    press = { from: JSON.parse(card.dataset.from), node: card, run, x: e.clientX, y: e.clientY, drag: null };
    try { table.setPointerCapture(e.pointerId); } catch (_) { /* moves still reach the table */ }
    e.preventDefault();
  });
  table.addEventListener("pointermove", e => {
    if (!press || press.stock) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (!press.drag && Math.hypot(dx, dy) < 6) return;
    if (!press.drag) {
      const g = el("div", "drag"), r0 = press.node.getBoundingClientRect();
      press.run.forEach((c, i) => { const r = c.getBoundingClientRect(), k = c.cloneNode(true); k.style.left = "0px"; k.style.top = (r.top - r0.top) + "px"; g.append(k); c.style.visibility = "hidden"; });
      press.drag = { g, x0: r0.left, y0: r0.top }; table.append(g);
    }
    press.drag.g.style.left = (press.drag.x0 + dx) + "px"; press.drag.g.style.top = (press.drag.y0 + dy) + "px";
  });
  const endPress = e => {
    const p = press; press = null;
    if (!p) return;
    if (p.stock) { stockTap(); return; }
    if (!p.drag) { tap(p.from, p.node); return; }
    p.drag.g.remove();
    const under = document.elementFromPoint(e.clientX, e.clientY), at = under && under.closest("[data-to]");
    const moved = at && play({ tag: "Shift", value: { from: p.from, to: JSON.parse(at.dataset.to) } });
    if (!moved) { p.run.forEach(c => { c.style.visibility = ""; }); nope(p.node); }
  };
  table.addEventListener("pointerup", endPress);
  table.addEventListener("pointercancel", () => { if (press && press.drag) { press.drag.g.remove(); press.run.forEach(c => { c.style.visibility = ""; }); } press = null; });

  // ---- hint, undo, finish
  // the hint: the card (or run) to move, and where it goes
  function markHint(m) {
    if (m.tag !== "Shift") { const s = table.querySelector(".stock"); if (s) s.classList.add("hint"); return; }
    const f = JSON.stringify(m.value.from);
    table.querySelectorAll(".sc[data-from]").forEach(c => { if (c.dataset.from === f) c.classList.add("hint"); });
    if (m.value.to.tag === "ToPile") { const p = table.querySelectorAll(".pile")[m.value.to.value]; if (p) p.classList.add("hint"); return; }
    const c = sourceCard(m.value.from), d = c && table.querySelectorAll(".found")[["Spades", "Hearts", "Diamonds", "Clubs"].indexOf(c.suit.tag)];
    if (d) d.classList.add("hint");
  }
  function sourceCard(from) {
    const g = S.game; if (!g) return null;
    if (from.tag === "FromWaste") return g.waste[0];
    if (from.tag === "FromFoundation") return (g.foundations[from.value] || [])[0];
    const up = g.piles[from.value.pile].up; return up[from.value.count - 1];
  }
  $("hint").addEventListener("click", () => {
    const h = H(); if (!h || !S.game) return;
    const ms = h.moves(S.game);
    const shift = ms.filter(m => m.tag === "Shift");
    const reveals = m => m.value.from.tag === "FromPile" && S.game.piles[m.value.from.value.pile].down.length && m.value.from.value.count === S.game.piles[m.value.from.value.pile].up.length;
    const pick = shift.find(m => m.value.to.tag === "ToFoundation") || shift.find(reveals) ||
      shift.find(m => m.value.from.tag === "FromWaste") || ms.find(m => m.tag !== "Shift") || shift[0];
    if (!pick) {
      $("info").textContent = "No moves left: undo, or deal a new game. · " + statsLine();
      // (the line above is hidden with the controls in full screen: the 💡 there says so itself, for a moment)
      if (hintFs) { hintFs.textContent = "🤷"; hintFs.title = "No moves left: undo, or deal a new game"; setTimeout(() => { hintFs.textContent = "💡"; hintFs.title = HINT_TITLE; }, 2200); }
      return;
    }
    S.hint = pick; draw();
    setTimeout(() => { if (S.hint === pick) { S.hint = null; draw(); } }, 1800);
  });
  $("undo").addEventListener("click", () => {
    const u = S.undo.pop(); if (!u) return;
    Object.assign(S, { game: u.game, moves: u.moves, hint: null, wonAt: 0 }); save(); draw();
  });
  $("finish").addEventListener("click", () => {
    const h = H(); if (!h) return;
    const step = () => {
      if (!S.game || S.wonAt) return;
      const g = S.game;
      const froms = g.piles.map((p, j) => p.up.length ? { tag: "FromPile", value: { pile: j, count: 1 } } : null).filter(Boolean);
      for (const f of froms) { const ms = h.moves_from(g, f).filter(m => m.value.to.tag === "ToFoundation"); if (ms.length && play(ms[0])) { setTimeout(step, 90); return; } }
    };
    step();
  });
  $("new").addEventListener("click", newGame);
  $("draw").value = String(DRAW);
  $("draw").addEventListener("change", () => { DRAW = $("draw").value === "3" ? 3 : 1; keep("draw", DRAW); $("draw").title = "From the next game"; });
  if (window.OracleFs) window.OracleFs.offer({ label: "🂠 Deal a new game", title: "Shuffles and deals a new game", cast: newGame });
  const HINT_TITLE = "Hint: the card to move, and where it goes";
  if (window.OracleFs && window.OracleFs.tool) { hintFs = window.OracleFs.tool({ label: "💡", title: HINT_TITLE, click: () => $("hint").click() }); tools(); }

  // ---- Hazel: its library, the program built from the listings, and the status line
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr, so there is nothing to play by: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules deal and play."; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${b.ms.toFixed(0)} ms: every move is asked of them.`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so no move can be judged: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build") + ". Put them back with the button under the listings.";
  }
  let L = null, timer = 0;
  function build() {
    if (!window.Hazel || !L) return;
    const sp = L.spec(PROGRAM, TAIL), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now(); let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!r.ok && !!v && typeof v.apply === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0, at: performance.now() };
    drawStatus(); draw();
  }
  let libAsked = false;
  function loadLib() {
    if (libAsked) return; libAsked = true;
    const s = document.createElement("script"); s.src = LIB; s.async = true;
    s.onload = () => { S.libAt = performance.now(); build(); drawStatus(); }; s.onerror = () => { S.libFailed = true; drawStatus(); };
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

  // ---- ⚙️ Advanced: the card backs (a design and its colours), and this device's speed
  function backsChooser() {
    const box = el("div", "backs-chooser");
    const themes = el("div", "backs-themes"), designs = el("div", "backs-designs");
    const paint = () => {
      themes.replaceChildren(...B.themes.map(t => {
        const b = el("button", "back-theme" + (t.id === BACK.theme ? " on" : ""));
        b.type = "button"; b.setAttribute("aria-pressed", String(t.id === BACK.theme));
        const i = el("img"); i.src = backUrl(BACK.design, t.id); i.alt = "";
        b.append(i, el("span", "", t.name)); b.addEventListener("click", () => { BACK.theme = t.id; keep("back", BACK); paint(); draw(); });
        return b;
      }));
      designs.replaceChildren(...B.designs.map(d => {
        const b = el("button", "back-design" + (d.id === BACK.design ? " on" : ""));
        b.type = "button"; b.title = d.name; b.setAttribute("aria-pressed", String(d.id === BACK.design));
        const i = el("img"); i.src = backUrl(d.id, BACK.theme); i.alt = d.name;
        b.append(i, el("span", "", d.name)); b.addEventListener("click", () => { BACK.design = d.id; keep("back", BACK); paint(); draw(); });
        return b;
      }));
    };
    paint();
    box.append(el("p", "muted", "Thirteen designs, each the same either way up, so a card turned around cannot be told from the rest; and five colour themes for each. Kept on this device."),
      el("h4", "backs-cap", "Colours"), themes, el("h4", "backs-cap", "Design"), designs);
    return box;
  }
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Solitaire", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: "interpreted", error: null }),
    extras: [el("h3", "advanced-cap", "🂠 Card backs"), backsChooser()],
    about: "a deal, every legal move, the moves from each pile and ten moves made through Hazel, and ten drawings of the table",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      const time = f => { const t = performance.now(); const v = f(); return [performance.now() - t, v]; };
      const keepState = { game: S.game, moves: S.moves, undo: S.undo, hint: S.hint, wonAt: S.wonAt, started: S.started };
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const [dealMs, g0] = time(() => h.deal(Array.from({ length: 52 }, rnd), 1));
      const [movesMs, ms] = time(() => h.moves(g0));
      const froms = [], applies = []; let g = g0;
      for (let j = 0; j < 7; j++) froms.push(time(() => h.moves_from(g, { tag: "FromPile", value: { pile: j, count: 1 } }))[0]);
      for (let i = 0; i < 10; i++) { const m = h.moves(g)[0]; if (!m) break; const [t, g2] = time(() => h.apply(g, m)); applies.push(t); g = g2; }
      say("🧪 measuring: drawing the table…");
      const draws = []; Object.assign(S, { game: g0, wonAt: 0, hint: null });
      for (let i = 0; i < 10; i++) { const t = performance.now(); draw(); await window.OracleAdvanced.painted(); draws.push(performance.now() - t); }
      Object.assign(S, keepState); draw();
      const st = window.OracleAdvanced.stats, f = st(froms), a = st(applies), dr = st(draws);
      return { data: { deal: Math.round(dealMs), moves: Math.round(movesMs), offered: ms.length, from: f, apply: a, draw: dr },
               text: [`through Hazel: a deal ${Math.round(dealMs)} ms, every move ${Math.round(movesMs)} ms, the moves from a pile ${f.median} ms, a move made ${a.median} ms`,
                      `drawing the table, to the next frame: ${dr.median} ms`] };
    },
  });
  document.body.classList.add("js");
  drawStatus(); draw();
})();
