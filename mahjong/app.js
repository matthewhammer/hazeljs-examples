// hazeljs-examples, Mahjong: the page. The deal, a turn, the claims on a discard and which comes first, the winning hands,
// the faan and the points, and what each Hazel player discards and claims are Hazel (rules/*.hz), shown in Hazel's own
// editor (../shared/hazel-listings.js) and built by hazeljs from npm. The page holds the game, a Hazel value, draws the
// table, and passes it back in with your move, one step at a time: (game, move) -> game.
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "mahjong", MODULES = ["Mahjong"];
  const TAIL = "(start = Mahjong.start, step = Mahjong.step, options = Mahjong.options, next_hand = Mahjong.next_hand)";
  const KEY = "hazeljs-examples/mahjong/";
  // (0.0.34, ticket 794, as the oracles since 0.0.13 and Checkers in 0.0.34) the rules run compiled ahead of time to JavaScript
  // by hazel-jit (compiled.js), without loading hazeljs or building the program, unless the address asks for interpreted
  // (?interpreted=1, or ?compiled=0) or the rules are edited, when hazeljs loads and runs the edited rules
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };
  // (the next frame painted, or 60 ms, whichever comes first: a page in the background draws no frames)
  const painted = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => setTimeout(go, 0)); setTimeout(go, 60); });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const NONE = { kind: 0, tile: -1 };
  const rs = () => Array.from({ length: 136 }, () => Math.floor(Math.random() * 1000000));

  // ---- the tiles: 0 to 8 dots, 9 to 17 bamboo, 18 to 26 characters, 27 to 30 the winds, 31 to 33 the dragons
  const SUIT = ["dots", "bamboo", "chars"], SUIT_CH = ["筒", "索", "萬"], SUIT_NAME = ["dots", "bamboo", "characters"];
  const HON = ["東", "南", "西", "北", "中", "發", "白"], HON_CLS = ["wind", "wind", "wind", "wind", "red", "green", "white"];
  const HON_NAME = ["East wind", "South wind", "West wind", "North wind", "Red dragon", "Green dragon", "White dragon"];
  const name = t => t < 27 ? `${t % 9 + 1} ${SUIT_NAME[Math.floor(t / 9)]}` : HON_NAME[t - 27];
  const face = t => t < 27 ? `${t % 9 + 1}<span class="s">${SUIT_CH[Math.floor(t / 9)]}</span>` : HON[t - 27];
  const cls = t => t < 27 ? SUIT[Math.floor(t / 9)] : HON_CLS[t - 27];
  const tile = (t, more = "") => `<span class="tile ${cls(t)} ${more}" title="${name(t)}">${face(t)}</span>`;
  const back = more => `<span class="tile back ${more}" title="a tile, face down"></span>`;
  const set = (m, size) => { const ts = m.kind === 1 ? [m.tile, m.tile + 1, m.tile + 2] : Array(m.kind === 3 ? 4 : 3).fill(m.tile);
    return `<span class="set" title="${["", "a chow", "a pung", "a kong"][m.kind]}${m.shown ? "" : ", concealed"}">${ts.map((t, i) => m.kind === 3 && !m.shown && (i === 0 || i === 3) ? back(size) : tile(t, size)).join("")}</span>`; };
  const WINDS = ["East", "South", "West", "North"];
  const seatWind = (g, s) => (s - g.dealer + 4) % 4;
  const who = (g, s) => s === 0 ? "You" : `Hazel (${WINDS[seatWind(g, s)]})`;
  const FAAN = { 1: "Self-drawn", 2: "Concealed hand", 3: "All chows", 4: "All pungs", 5: "Mixed one suit", 6: "Pure one suit", 7: "Dragon pungs",
    8: "Seat wind pung", 9: "Round wind pung", 10: "Small three dragons", 11: "Big three dragons", 12: "All honours", 13: "Thirteen orphans", 14: "The last tile" };
  function said(g, e) {
    const w = e.who >= 0 ? who(g, e.who) : "";
    switch (e.what) {
      case 2: return `${w} discard${e.who ? "s" : ""} ${tile(e.tile, "sm")}`;
      case 3: return `${w} chow${e.who ? "s" : ""} ${[0, 1, 2].map(i => tile(e.tile + i, "sm")).join("")}`;
      case 4: return `${w} pung${e.who ? "s" : ""} ${tile(e.tile, "sm")}`;
      case 5: return `${w} kong${e.who ? "s" : ""} ${tile(e.tile, "sm")}, and draw${e.who ? "s" : ""} again`;
      case 6: return `${w} declare${e.who ? "s" : ""} a kong of ${tile(e.tile, "sm")}, and draw${e.who ? "s" : ""} again`;
      case 7: return `🀄 ${w} win${e.who ? "s" : ""}, drawing ${tile(e.tile, "sm")}!`;
      case 8: return `🀄 ${w} win${e.who ? "s" : ""} on ${tile(e.tile, "sm")}!`;
      case 9: return "The wall is empty: no one wins this hand.";
      default: return "";
    }
  }

  // ---- the state: Hazel's program, the game (a Hazel value), what you may do now, the tile you chose, how fast Hazel plays
  const S = { built: null, libAt: 0, libFailed: false, game: null, opts: null, sel: -1, pace: kept("pace", 450), peek: kept("peek", false), running: 0, note: "", stepMs: 0, compiledError: "", auto: false, touched: kept("touched", false) };
  const saved = kept("game", null);
  if (saved && Array.isArray(saved.seats) && saved.seats.length === 4) S.game = saved;
  const stats = kept("stats", { played: 0, won: 0 });
  const H = () => S.built && S.built.ok ? S.built.value : null;
  const save = () => { keep("game", S.game); keep("touched", S.touched); };
  const waiting = o => !!o && (o.discard || o.win || o.pung || o.kong || o.chows.length > 0 || o.kongs.length > 0);
  function refresh() { const h = H(); S.opts = null; if (h && S.game) { try { S.opts = h.options(S.game); } catch (e) { S.opts = null; } } }

  // ---- the table
  function seatHtml(g, s) {
    const st = g.seats[s], open = S.peek || g.phase === 3, mine = s === 0;
    const now = g.phase !== 3 && ((g.phase === 1 && g.turn === s) || (g.phase === 2 && g.from === s));
    const size = mine ? "" : "sm";
    let hand;
    if (mine) {
      const off = !(S.opts && S.opts.discard);
      let tiles = [...st.hand], drawn = -1;
      if (g.phase === 1 && g.turn === 0 && g.drawn >= 0) { const i = tiles.indexOf(g.drawn); if (i >= 0) { tiles.splice(i, 1); drawn = g.drawn; } }
      const all = drawn >= 0 ? [...tiles, drawn] : tiles;
      hand = `<div class="row hand${off ? " off" : ""}">` + all.map((t, i) => `<button type="button" class="tile lg ${cls(t)}${i === S.sel ? " up" : ""}${drawn >= 0 && i === all.length - 1 ? " drawn" : ""}" data-i="${i}" data-t="${t}" title="${name(t)}">${face(t)}</button>`).join("") + `</div>`;
    } else hand = `<div class="row">` + st.hand.map(t => open ? tile(t, size) : back(size)).join("") + `</div>`;
    const river = [...st.river].reverse().map((t, i, a) => tile(t, "sm" + (g.phase === 2 && g.from === s && i === a.length - 1 ? " last" : ""))).join("");
    return `<div class="who"><span>${who(g, s)}${g.dealer === s ? " · dealer" : ""}</span><span class="pts">${st.points} pts</span></div>` +
      `<div class="row melds">${[...st.melds].reverse().map(m => set(m, size)).join("")}</div>` + hand + `<div class="row river" title="discards">${river}</div>`;
  }
  function draw() {
    const g = S.game;
    $("pace").value = String(S.pace); $("peek").checked = !!S.peek;
    $("next").disabled = !g || g.phase !== 3 || !H();
    if (!g) { for (let s = 0; s < 4; s++) $("seat" + s).innerHTML = ""; $("mid").textContent = ""; acts(); return; }
    for (let s = 0; s < 4; s++) {
      const el = $("seat" + s); el.innerHTML = seatHtml(g, s);
      el.classList.toggle("now", g.phase !== 3 && ((g.phase === 1 && g.turn === s) || (g.phase === 2 && g.from === s)));
    }
    $("mid").innerHTML = `<div class="big">${WINDS[g.wind]} round · hand ${g.hand_no}</div><div>${g.wall.length} tiles in the wall</div>` +
      (g.phase === 2 ? `<div>${who(g, g.from)} discarded</div><div>${tile(g.tile, "lg last")}</div>` : g.phase === 1 ? `<div>${g.turn === 0 ? "Your turn" : who(g, g.turn) + "'s turn"}</div>` : `<div>The hand is over</div>`);
    acts(); end();
    $("log").innerHTML = g.events.slice(0, 12).map(e => `<li>${said(g, e)}</li>`).join("");
    if (window.OracleFs) window.OracleFs.empty(g.phase === 3);
  }
  function acts() {
    const g = S.game, o = S.opts, el = $("acts");
    if (!g || !H()) { el.innerHTML = ""; return; }
    const b = (kind, t, label, extra = "") => `<button type="button" data-kind="${kind}" data-tile="${t}" class="${extra}">${label}</button>`;
    let h = "";
    if (g.phase === 3) h = "";
    else if (o && o.discard) {
      h = `<span class="say">${S.note || (S.sel >= 0 ? "Tap it again to discard it, or tap another." : "Your turn: tap a tile, then tap it again to discard it.")}</span>`;
      if (o.win) h = b(2, -1, "🀄 Mahjong! Win", "win") + h;
      for (const k of o.kongs) h += b(3, k, `Kong ${tile(k)}`);
    } else if (waiting(o)) {
      h = `<span class="say">${who(g, g.from)} discarded ${tile(g.tile)}:</span>`;
      if (o.win) h += b(8, g.tile, "🀄 Mahjong! Win", "win");
      if (o.kong) h += b(7, g.tile, `Kong ${tile(g.tile)}${tile(g.tile)}${tile(g.tile)}${tile(g.tile)}`);
      if (o.pung) h += b(6, g.tile, `Pung ${tile(g.tile)}${tile(g.tile)}${tile(g.tile)}`);
      for (const c of o.chows) h += b(5, c, `Chow ${[0, 1, 2].map(i => tile(c + i)).join("")}`);
      h += b(4, -1, "Pass");
    } else h = `<span class="say">${S.note || "Hazel is playing…"}</span>`;
    if (S.auto && g.phase !== 3) h = `<span class="say">${S.note || "🤖 Hazel is playing your seat too…"}</span>`;
    el.innerHTML = h;
  }
  function end() {
    const g = S.game, el = $("end");
    if (!g || g.phase !== 3) { el.hidden = true; return; }
    el.hidden = false;
    const ev = g.events[0] || {};
    let h;
    if (g.winner < 0) h = `<b>The wall is empty: no one wins this hand.</b> ${who(g, g.dealer)} deal${g.dealer ? "s" : ""} again.`;
    else {
      const f = Math.min(13, g.items.reduce((a, i) => a + i.faan, 0)), p = 2 ** Math.min(10, f);
      h = `<b>${g.winner === 0 ? (S.touched ? "🎉 Hazel, playing for you, wins" : "🎉 You win") : who(g, g.winner) + " wins"}, ${ev.what === 7 ? "drawing " + tile(ev.tile, "sm") : "on " + who(g, g.from).replace("You", "your") + (g.from === 0 ? "" : "'s") + " discard " + tile(ev.tile, "sm")}.</b>` +
        `<table>${g.items.length ? g.items.map(i => `<tr><td>${FAAN[i.code] || i.code}</td><td>${i.faan} faan</td></tr>`).join("") : `<tr><td>No faan: a chicken hand, which still wins here</td><td>0 faan</td></tr>`}` +
        `<tr><td><b>In all</b></td><td><b>${f} faan${f === 13 ? " (the limit)" : ""}: ${p} point${p > 1 ? "s" : ""}</b></td></tr></table>` +
        `<div class="muted">${ev.what === 7 ? `Drawn by the winner: each other player pays twice the points.` : `Won on a discard: its thrower pays twice the points, the other two once.`}</div>`;
    }
    h += `<div>${g.seats.map((s, i) => `${who(g, i)} ${g.pays[i] > 0 ? "+" : ""}${g.pays[i]}`).join(" · ")}</div><div class="muted">You have won ${stats.won} of ${stats.played} hands on this device${S.touched ? " (hands Hazel played for you are not counted)" : ""}.</div>`;
    el.innerHTML = h;
  }

  // ---- moves: yours, then Hazel's, a step at a time, at the pace chosen
  function act(a) {
    const h = H(); if (!h || !S.game || S.running || S.auto) return;
    let g2 = null;
    try { g2 = h.step(S.game, a); } catch (e) { S.note = "Hazel's rules stopped on that move: " + (e && e.message || e); draw(); return; }
    S.game = g2; S.sel = -1; S.note = ""; settle(); refresh(); save(); draw(); run();
  }
  // (a hand just over: counted once on this device, however often the page is reloaded on it)
  function settle() {
    const g = S.game; if (!g || g.phase !== 3) return;
    const key = g.hand_no + ":" + g.events.length + ":" + g.winner + ":" + g.pays.join(",") + ":" + g.seats.map(s => s.points).join(",");
    if (kept("counted", "") === key) return;
    if (S.touched) { keep("counted", key); W.end(g.winner === 0 ? "Hazel, playing for you, wins the hand" : g.winner < 0 ? "The wall is empty, no one wins" : who(g, g.winner) + " wins the hand"); return; }
    keep("counted", key); stats.played++; if (g.winner === 0) stats.won++; keep("stats", stats);
  }
  async function run() {
    const h = H(); if (!h || S.running) return;
    const token = S.running = Date.now();
    refresh();
    // (🤖 Hazel plays for you, 0.0.34, ticket 796: your seat's moves are asked of Hazel too, as kind 9, and the table goes on
    // to the hand's end; at full speed the steps follow at once, the table drawn every 50 ms)
    while (S.game && S.game.phase !== 3 && (S.auto || !waiting(S.opts)) && S.running === token) {
      if (S.auto) await W.between(draw); else { draw(); await sleep(S.pace); await painted(); }
      if (S.running !== token) return;
      const g = S.game, yours = S.auto && waiting(S.opts);
      const t = performance.now();
      try { S.game = h.step(g, yours ? AUTO : NONE); } catch (e) { S.note = "Hazel's rules stopped: " + (e && e.message || e); break; }
      S.stepMs = performance.now() - t;
      if (S.auto) { W.think(yours ? 0 : 1, S.stepMs); S.touched = true; }
      if (yours && JSON.stringify(S.game) === JSON.stringify(g)) { S.note = "These rules have no move for Hazel to make in your seat (kind 9): edit them back, or turn 🤖 off."; S.auto = false; W.set(false); W.stop(); refresh(); break; }
      refresh(); settle(); save();
    }
    if (S.running === token) S.running = 0;
    draw(); drawStatus();
  }
  function newHand(first) {
    const h = H(); if (!h) return;
    S.running = 0;
    S.game = first || !S.game ? h.start(rs()) : h.next_hand(S.game, rs());
    S.sel = -1; S.note = ""; S.touched = S.auto; if (S.auto) W.start(0);
    refresh(); save(); draw(); run();
  }
  // ---- 🤖 Hazel plays for you (0.0.34, ticket 796): your seat played as the Hazel players play theirs (the step's kind 9),
  // each hand to its end at the pace chosen (with "at full speed" added), and the clock times the hand
  const AUTO = { kind: 9, tile: -1 };
  const W = window.HazelAutoplay.make({
    after: $("next").parentElement, key: KEY, sides: ["your seat", "the other three"], pace: { get: () => S.pace },
    onChange: on => {
      S.auto = on; S.sel = -1; S.note = "";
      if (!on) { W.stop(); S.running = 0; refresh(); draw(); run(); return; }
      if (!H()) { draw(); return; }
      if (!S.game || S.game.phase === 3) { newHand(!S.game); return; }
      S.touched = true; W.start(S.game.events.length); S.running = 0; run();
    },
  });
  $("table").addEventListener("click", e => {
    const t = e.target.closest(".hand .tile"); if (!t || !S.opts || !S.opts.discard || S.running || S.auto) return;
    const i = +t.dataset.i;
    if (S.sel === i) act({ kind: 1, tile: +t.dataset.t }); else { S.sel = i; draw(); }
  });
  $("acts").addEventListener("click", e => { const b = e.target.closest("button[data-kind]"); if (b) act({ kind: +b.dataset.kind, tile: +b.dataset.tile }); });
  $("next").addEventListener("click", () => newHand(false));
  $("new").addEventListener("click", () => { if (S.game && S.game.phase !== 3 && !confirm("Start a new game? Every player's points go back to 0.")) return; newHand(true); });
  $("pace").addEventListener("change", () => { S.pace = +$("pace").value; keep("pace", S.pace); });
  $("peek").addEventListener("change", () => { S.peek = $("peek").checked; keep("peek", S.peek); draw(); });
  if (window.OracleFs) window.OracleFs.offer({ label: "🀄 Next hand", title: "Deal the next hand", cast: () => newHand(false) });

  // ---- Hazel: its library, the program built from the listings, and the status line
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (COMPILED && S.compiledError && !(b && b.compiled) && !window.Hazel) { st.className = "status no"; st.textContent = `Compiled mode was asked for, but compiled.js did not run (${S.compiledError}); loading Hazel to interpret the rules instead.`; return; }
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), without loading Hazel's library or building the program` + "."; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr, so there is no one to play: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules deal, play and score."; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s: every step of the table is asked of them` + (S.stepMs ? ` (the last took ${Math.round(S.stepMs)} ms).` : "."); return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so the table cannot go on: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build") + ". Put them back with the button under the listings.";
  }
  let L = null, timer = 0;
  function build() {
    if (!window.Hazel || !L) return;
    const sp = L.spec(PROGRAM, TAIL), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now(); let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!r.ok && !!v && typeof v.step === "function" && typeof v.options === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0, at: performance.now() };
    drawStatus();
    if (S.built.ok && !S.game) newHand(true); else { refresh(); draw(); run(); }
  }
  function loadCompiled() {
    addEventListener("error", e => { if (/compiled\.js/.test(e.filename || "")) S.compiledError = String(e.message || e.error || "an error"); });
    const c = document.createElement("script");
    c.src = "compiled.js?v=0.0.34"; c.async = true;
    c.onload = () => {
      const v = window.MahjongCompiled;
      if (v && !S.built) {
        S.libAt = performance.now(); S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() };
        drawStatus();
        if (!S.game) newHand(true); else { refresh(); draw(); run(); }
      } else if (!v) { S.compiledError = S.compiledError || "it ran, but gave no Mahjong"; drawStatus(); loadLib(); }
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
    holder: $("advanced"), name: "Mahjong", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "a hand dealt, and forty steps of play (you discarding your first tile and passing every claim)",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      let t = performance.now(); let g = h.start(Array.from({ length: 136 }, () => Math.floor(rnd() * 1e6))); const dealMs = performance.now() - t;
      const steps = [];
      say("🧪 measuring: forty steps of play…"); await painted();
      for (let i = 0; i < 40 && g.phase !== 3; i++) {
        const o = h.options(g);
        const a = o.discard ? { kind: 1, tile: g.seats[0].hand[0] } : waiting(o) ? { kind: 4, tile: -1 } : NONE;
        t = performance.now(); g = h.step(g, a); steps.push(performance.now() - t);
      }
      const st = window.OracleAdvanced.stats(steps);
      return { data: { deal: Math.round(dealMs), step: st }, text: [`through Hazel: a hand dealt ${Math.round(dealMs)} ms; a step of play ${st.median} ms (worst ${st.worst})`] };
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
