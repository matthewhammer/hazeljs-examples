// hazeljs-examples: 🤖 Hazel plays for you (0.0.35, ticket 796). Matthew: "For each one-player game with AI opponents, please
// add a mode as a toggle switch where the AI for that game plays for the interactive user "you", so that the game becomes a
// 0 player activity to watch and to time." Then: "Let's ensure there's a "full speed" mode where the AI players go as fast
// as the hazel logic will permit."
//
// A switch and a pace for Go, Checkers and Mahjong, and the clock that times the game it plays. The page keeps its own
// game loop and asks this for three things: whether the switch is on, the wait between two moves (between()), and the
// clock (start, think, end). At full speed there is no wait: moves follow each other at once, and the board is drawn
// once every 50 ms of play (about 20 times a second), so most of the clock is Hazel's logic.
(() => {
  "use strict";
  const PACES = [[900, "slowly"], [450, "at a walk"], [120, "briskly"], [0, "at full speed"]];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // (the next frame painted, or 60 ms, whichever comes first: a page in the background draws no frames)
  const painted = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => setTimeout(go, 0)); setTimeout(go, 60); });
  const secs = ms => ms < 1 ? ms.toFixed(2) + " ms" : ms < 100 ? (ms < 10 ? ms.toFixed(1) : Math.round(ms)) + " ms" : ms < 60000 ? (ms / 1000).toFixed(ms < 10000 ? 2 : 1) + " s" : `${Math.floor(ms / 60000)} min ${Math.round(ms % 60000 / 1000)} s`;
  const kept = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  let styled = false;
  function style() {
    if (styled) return; styled = true;
    const s = document.createElement("style");
    s.textContent = `
.autoplay { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; margin: 8px 0 0; }
.controls > .autoplay, .controls > .auto-clock { flex: 1 1 100%; min-width: 0; }
.controls > .autoplay { margin: 2px 0 0; }
.autoplay .switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.autoplay .switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.autoplay .knob { position: relative; flex: none; width: 38px; height: 22px; border-radius: 11px; background: var(--line); border: 1px solid var(--line); transition: background 0.15s; }
.autoplay .knob::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--paper); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); transition: left 0.15s; }
.autoplay .switch input:checked + .knob { background: var(--accent); border-color: var(--accent); }
.autoplay .switch input:checked + .knob::after { left: 18px; }
.autoplay .switch input:focus-visible + .knob { outline: 2px solid var(--accent); outline-offset: 2px; }
.autoplay .auto-pace select { font: inherit; }
.auto-clock { margin: 0; font-size: 0.92em; font-variant-numeric: tabular-nums; color: var(--ink); overflow-wrap: anywhere; }
.fs-tool[aria-pressed="true"] { border-color: var(--accent) !important; background: color-mix(in srgb, var(--accent) 22%, var(--paper)) !important; }
.auto-clock[hidden] { display: none; }
@media (prefers-reduced-motion: reduce) { .autoplay .knob, .autoplay .knob::after { transition: none; } }`;
    document.head.append(s);
  }

  // make({ into, key, sides, pace, onChange }): into, the page's .controls, which the switch and the clock join (so in full
  // screen they go to the left column with the buttons; a 🤖 under ☰ flips the switch while that column is hidden); key, the page's localStorage
  // prefix (the pace is kept, the switch is not: a page opens with you playing); sides, the two sides' names for the clock
  // (["⚫", "⚪"]); pace, the page's own pace ({ get }) when it has one (Mahjong's), else the switch brings its own select;
  // onChange(on), called when the switch is flipped; sides may be one name (Minesweeper: Hazel alone); more(), words the page
  // adds to the clock (its guesses); label, the switch's words
  function make({ into, key, sides, pace, onChange, more, label, what }) {
    style();
    const box = document.createElement("div"); box.className = "autoplay";
    const sw = document.createElement("label"); sw.className = "switch";
    sw.title = "Hazel plays your side too, as it plays its own, to the end of the game: a game to watch, and to time";
    const input = document.createElement("input"); input.type = "checkbox"; input.setAttribute("role", "switch");
    const knob = document.createElement("span"); knob.className = "knob"; knob.setAttribute("aria-hidden", "true");
    sw.append(input, knob, document.createTextNode(label || "🤖 Hazel plays for you"));
    box.append(sw);
    let select = null;
    if (!pace) {
      const l = document.createElement("label"); l.className = "auto-pace"; l.append("moving ");
      select = document.createElement("select");
      for (const [v, t] of PACES) { const o = document.createElement("option"); o.value = String(v); o.textContent = t; select.append(o); }
      select.value = String(kept(key + "auto-pace", 450));
      if (!select.value) select.value = "450";
      select.addEventListener("change", () => keep(key + "auto-pace", +select.value));
      l.append(select); box.append(l);
    }
    const clock = document.createElement("p"); clock.className = "auto-clock"; clock.hidden = true; clock.setAttribute("aria-live", "polite");
    into.append(box, clock);

    // ---- the clock: from the switch (or a new game) to the game's end; each side's thinking, the moves, the slowest move
    let t0 = 0, moves = 0, think = [0, 0], slowest = 0, from = 0, endText = "", running = false, lastPaint = 0, paceAtStart = 0;
    const paceNow = () => pace ? pace.get() : +select.value;
    const paceName = ms => (PACES.find(([v]) => v === ms) || [0, ms ? `with ${ms} ms between moves` : "at full speed"])[1];
    function text(done) {
      const wall = (done || performance.now()) - t0, logic = think[0] + think[1];
      const share = wall > 0 ? Math.round(100 * logic / wall) : 0;
      const head = done ? `🏁 ${endText ? endText + ": " : ""}${moves} move${moves === 1 ? "" : "s"}${from ? ` from move ${from + 1}` : ""} in ${secs(wall)} on the clock, ${paceName(paceAtStart)}`
        : `🤖 Hazel plays ${sides.length > 1 ? "both sides" : what || "the board"}, ${paceName(paceNow())} · move ${from + moves} · ${secs(wall)} on the clock`;
      // (one side, Minesweeper's: Hazel's thinking in all; more(), the page's own words, such as its guesses)
      const thinking = sides.length > 1 ? `Hazel's thinking: ${sides[0]} ${secs(think[0])}, ${sides[1]} ${secs(think[1])}` : `Hazel's thinking ${secs(think[0])}`;
      return `${head} · ${thinking}` + (moves ? ` (${share}% of the clock; slowest move ${secs(slowest)})` : "") + (more ? more() : "") + (done ? "." : "");
    }
    const W = {
      get on() { return input.checked; },
      get pace() { return paceNow(); },
      // a new watch, from move `at` of the game (0: its start)
      start(at) { t0 = performance.now(); moves = 0; think = [0, 0]; slowest = 0; from = at || 0; endText = ""; running = true; paceAtStart = paceNow(); clock.hidden = false; clock.textContent = text(); },
      // a move made by side (0, yours; 1, Hazel's own), its thinking ms
      think(side, ms) { if (!running) return; moves++; think[side] += ms; if (ms > slowest) slowest = ms; },
      show() { if (running) clock.textContent = text(); },
      // the game over: what happened, and the clock stopped
      end(what) { if (!running) return; running = false; endText = what || ""; clock.textContent = text(performance.now()); },
      // the switch turned off mid-game: the clock stops where it is
      stop() { if (!running) return; running = false; clock.textContent = text(performance.now()).replace(/^🏁 /, "⏸ Stopped: "); },
      get running() { return running; },
      // between two moves: draw, then wait the pace; at full speed, draw and yield only when 50 ms have gone by since the
      // last drawing, so the moves run back to back
      async between(draw) {
        const p = paceNow();
        if (p > 0) { draw(); W.show(); await painted(); await sleep(p); lastPaint = performance.now(); return; }
        if (performance.now() - lastPaint >= 50) { draw(); W.show(); await painted(); lastPaint = performance.now(); }
      },
      set(on) { input.checked = !!on; mirror(); },
    };
    // (full screen, the left column hidden: the switch as a button under ☰)
    const tool = window.OracleFs && window.OracleFs.tool ? window.OracleFs.tool({ label: "🤖", title: "Hazel plays for you: on or off", click: () => { input.checked = !input.checked; input.dispatchEvent(new Event("change")); } }) : null;
    const mirror = () => { if (tool) tool.setAttribute("aria-pressed", String(input.checked)); };
    mirror();
    input.addEventListener("change", () => { mirror(); if (onChange) onChange(input.checked); });
    return W;
  }
  window.HazelAutoplay = { make, PACES, secs };
})();
