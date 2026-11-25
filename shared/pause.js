// shared/pause.js: a pause for the games whose time runs on its own (0.0.53; Matthew, 2026-11-22: "for each physics based game
// (any game with time advancing automatically) --- let's offer a pause feature, as a button and as space bar."). A ⏸ Pause
// button joins the game's controls, and the space bar pauses and goes on; paused, a card over the board says so, and a tap on
// it goes on. Leaving the page (another app, the screen off) pauses too, so a game is not lost meanwhile. The page asks
// paused() each frame and runs no step while it is true; 🤖 Hazel playing for you pauses the same way.
// (0.0.121, for Gnome world's power-ups; Matthew: "lots of the power up text is too long -- need line wraps. and it goes by too
// fast -- let's have the game pause while we read it, also please present a 'read aloud' button for it. unpause clears the
// text; or clicking on it.") P.say({ title, text, read, close }) pauses with words on the card, their lines wrapped, read at
// leisure; with read, a 🔊 Read aloud button on it (a tap on it reads, and does not go on); going on, any way (the space bar,
// ▶️ Go on, a tap on the card, the page's own), clears them and calls close.
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
    const words = document.createElement("p"), readBtn = document.createElement("button");
    words.className = "pause-words"; words.hidden = true;
    readBtn.type = "button"; readBtn.className = "pause-read"; readBtn.textContent = "🔊 Read aloud"; readBtn.hidden = true;
    let reader = null, closer = null;
    readBtn.addEventListener("pointerdown", e => e.stopPropagation());   // (not a tap on the card: it reads, and the game stays paused)
    readBtn.addEventListener("click", e => { e.stopPropagation(); if (reader) reader(); });
    card.append(big, words, readBtn, small);
    if (over) { over.classList.add("pause-host"); over.append(card); }
    const show = () => {
      if (!paused && card.classList.contains("pause-says")) {   // (going on: the words cleared)
        card.classList.remove("pause-says"); big.textContent = "⏸ Paused"; words.textContent = ""; words.hidden = true; readBtn.hidden = true;
        const c = closer; reader = closer = null; if (c) c(); }
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
    const say = ({ title, text, read, close } = {}) => {
      big.textContent = title || "⏸ Paused"; words.textContent = text || ""; words.hidden = !text;
      reader = read || null; closer = close || null; readBtn.hidden = !read; card.classList.add("pause-says");
      if (paused) show(); else set(true); };
    return { paused: () => paused, set, say, saying: () => card.classList.contains("pause-says"), read: () => { if (reader) reader(); } };
  }
  window.HazelPause = { make };
})();
