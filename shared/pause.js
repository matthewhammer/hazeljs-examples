// shared/pause.js: a pause for the games whose time runs on its own (0.0.53; Matthew, 2026-11-22: "for each physics based game
// (any game with time advancing automatically) --- let's offer a pause feature, as a button and as space bar."). A ⏸ Pause
// button joins the game's controls, and the space bar pauses and goes on; paused, a card over the board says so, and a tap on
// it goes on. Leaving the page (another app, the screen off) pauses too, so a game is not lost meanwhile. The page asks
// paused() each frame and runs no step while it is true; 🤖 Hazel playing for you pauses the same way.
//   const P = HazelPause.make({ into: the controls, over: the board's box })
(() => {
  "use strict";
  function make({ into, over, onChange }) {
    let paused = false;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "pause-btn";
    const card = document.createElement("div");
    card.className = "pause-card"; card.hidden = true;
    const big = document.createElement("b"), small = document.createElement("span");
    big.textContent = "⏸ Paused"; small.textContent = "the space bar, ▶️ Go on, or a tap here goes on";
    card.append(big, small);
    if (over) { over.classList.add("pause-host"); over.append(card); }
    const show = () => {
      btn.textContent = paused ? "▶️ Go on" : "⏸ Pause";
      btn.setAttribute("aria-pressed", String(paused));
      btn.title = paused ? "Go on (the space bar)" : "Pause the game (the space bar)";
      card.hidden = !paused;
      if (onChange) onChange(paused);
    };
    const set = v => { if (paused === !!v) return; paused = !!v; show(); };
    btn.addEventListener("click", () => { set(!paused); btn.blur(); });
    card.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); set(false); });
    addEventListener("keydown", e => {
      if (e.key !== " " || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && t.closest && t.closest("input, textarea, select, .hazel-listing, [contenteditable]")) return;
      e.preventDefault();
      if (!e.repeat) set(!paused);
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden) set(true); });
    into.append(btn);
    show();
    return { paused: () => paused, set };
  }
  window.HazelPause = { make };
})();
