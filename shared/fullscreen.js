// hazeljs-examples: full screen, for each oracle (0.0.16; Matthew, 2026-11-18: "for each ancient oracle app, in two-column
// mode, let's provide a full screen button at the top of the main interactive elements -- in this mode, we ignore the Hazel
// listings and only show the main components, organized into the geometry of the full browser window.")
//
// A button at the top of the reading's column (.oracle-ui), shown in two-column mode (oracles.css). Pressed, it puts the
// class oracle-fs on <html>, which hides the listings and lays the oracle's own parts out across the window (oracles.css,
// "full screen"), and asks the browser for full screen; where the browser will not, the window is filled all the same.
// Pressed again, or Esc, or the browser leaving full screen, puts the page back as it was.
//
// (Matthew, 2026-11-18: "in FS mode, let's provide divider support for LHS and RHS widths (versus center size).") Two
// dividers, one each side of the picture: drag one, or the arrow keys on it, to widen or narrow its side's column, the
// picture taking what is left; a double-click puts both back. Their places are kept in this browser, as shares of the
// width, one pair for each oracle's page, as shared/divider.js keeps the two-column split.
//
// (0.0.18; Matthew, 2026-11-18, a screenshot at his laptop's high zoom: "layout is goofy at my laptop's low resolution") The
// left column's parts move, in full screen, into one container that scrolls on its own (.fs-left), and back to their
// places after: as rows of the page's grid they were squeezed together when the window was shorter than they are tall.
(() => {
  "use strict";
  const ui = document.querySelector(".oracle-ui");
  if (!ui) return;
  const root = document.documentElement;
  const on = () => root.classList.contains("oracle-fs");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fs-button";
  const label = () => {
    btn.textContent = on() ? "✕ Leave full screen" : "⛶ Full screen";
    btn.setAttribute("aria-pressed", String(on()));
    btn.title = on() ? "Back to the page, with the program beside it (Esc)" : "Fill the screen with the oracle alone, without the program's listings";
  };
  // ---- the left column, gathered: each part's place kept by a marker, to put it back
  const LEFT_PARTS = { "astro-ui": ["#split-toggle", ".astro-form", "#status", "#reading-head", "#reading-q", "#notes-birth", "#history"],
    "iching-ui": [".question-label", ".question", ".controls", "#status", "#reading-head", "#reading-q", "#history"],
    "tarot-ui": [".controls", ".spread-use", "#status", "#reading-head", "#history"],
    "solitaire-ui": [".controls", "#status", "#info"],
    "sweeper-ui": [".controls", "#status", "#info"],
    // (0.0.33) the Hazel AI opponents: the board or table takes the rest of the window
    "go-ui": [".controls", "#status", "#info"], "ck-ui": [".controls", "#status", "#info"], "mj-ui": [".controls", "#status", "#log"],
    // (0.0.36) Pinball: the table as tall as the window, its score above it and its buttons under it
    "pb-ui": [".controls", "#status", "#info"],
    // (0.0.39) Mahjong solitaire: the stacks as large as the window allows
    "ms-ui": [".controls", "#status", "#info"],
    // (0.0.49) Downhill: the slope as tall as the window, its numbers above it and its buttons under it
    "dh-ui": [".controls", "#status", "#info"],
    // (0.0.51) Snake and Light trails: the board as large as the window, the buttons under it
    "sn-ui": [".controls", "#status", "#info"], "tr-ui": [".controls", "#status", "#info"],
    // (0.0.51) Bricks, left out of 0.0.50: the field as tall as the window, its buttons under it
    "bk-ui": [".controls", "#status", "#info"] };
  const partsOf = Object.entries(LEFT_PARTS).find(([c]) => ui.classList.contains(c));
  const left = document.createElement("div");
  left.className = "fs-left";
  let moved = [];
  const gather = () => {
    if (!partsOf || moved.length) return;
    for (const sel of partsOf[1]) {
      const e = ui.querySelector(":scope > " + sel);
      if (!e) continue;
      const mark = document.createComment("fs " + sel);
      e.replaceWith(mark);
      left.append(e);
      moved.push([e, mark]);
    }
    ui.insertBefore(left, ui.firstChild.nextSibling);
  };
  const scatter = () => { for (const [e, mark] of moved) mark.replaceWith(e); moved = []; left.remove(); };
  // ---- (0.0.24) one button in the picture's place, in full screen while no reading is cast: each app offers its cast
  // (OracleFs.offer({ label, title, cast })) and says, as its reading changes, whether it is empty (OracleFs.empty(bool))
  const castBtn = document.createElement("button");
  castBtn.type = "button";
  castBtn.className = "fs-cast primary";
  castBtn.hidden = true;
  let offered = null, isEmpty = true;
  const showCast = () => { castBtn.hidden = !(offered && isEmpty && on()); };
  castBtn.addEventListener("click", () => { if (offered) offered.cast(); });
  window.OracleFs = {
    // (o.where: an element of the picture to center the button on, kept when the app draws, as the I Ching's hexagrams)
    offer(o) {
      offered = o; castBtn.textContent = o.label; castBtn.title = o.title || "";
      const at = o.where && ui.querySelector(o.where);
      if (at) { at.classList.add("fs-cast-at"); at.append(castBtn); castBtn.classList.add("fs-cast-in"); }
      showCast();
    },
    empty(v) { isEmpty = !!v; showCast(); },
  };
  // ---- (0.0.27; M, on a tablet: "in FS mode, landscape, we want to hide the LHS by default, with some little icon to reveal
  // it") the left column hidden in full screen, landscape (oracles.css), until ☰ shows it; the choice kept on this device
  const LEFT_KEY = "hazeljs-examples/fs-left-shown";
  let leftShown = (() => { try { return localStorage.getItem(LEFT_KEY) === "1"; } catch (e) { return false; } })();
  const leftBtn = document.createElement("button");
  leftBtn.type = "button"; leftBtn.className = "fs-left-toggle"; leftBtn.textContent = "☰";
  const leftLabel = () => {
    leftBtn.setAttribute("aria-pressed", String(leftShown));
    leftBtn.title = leftShown ? "Hide the controls, for more room" : "Show the controls";
    leftBtn.setAttribute("aria-label", leftBtn.title);
  };
  leftBtn.addEventListener("click", () => {
    leftShown = !leftShown;
    try { localStorage.setItem(LEFT_KEY, leftShown ? "1" : "0"); } catch (e) { /* this visit only */ }
    root.classList.toggle("fs-left-hidden", on() && !leftShown); leftLabel();
    window.dispatchEvent(new Event("resize"));
  });
  leftLabel();
  // ---- (0.0.27; M, on the tablet: "when we hide the LHS, we still want 'hint'") an app's own buttons, under ☰ while the
  // left column is hidden: OracleFs.tool({ label, title, click }) gives back the button, for the app to enable and disable
  const toolBox = document.createElement("div");
  toolBox.className = "fs-tools";
  window.OracleFs.tool = o => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "fs-tool"; b.textContent = o.label; b.title = o.title || "";
    b.setAttribute("aria-label", o.title || o.label);
    b.addEventListener("click", o.click);
    toolBox.append(b);
    return b;
  };
  const set = v => {
    if (v) gather(); else scatter();
    root.classList.toggle("oracle-fs", v);
    root.classList.toggle("fs-left-hidden", v && !leftShown);
    showCast();
    label();
    if (v) cols(); else clearCols();
    // (anything that measures itself, such as the Tarot's table, measures again)
    window.dispatchEvent(new Event("resize"));
  };
  btn.addEventListener("click", () => {
    if (!on()) {
      set(true);
      if (root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(() => { /* the window is filled anyway */ });
    } else {
      set(false);
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && on()) set(false); });
  // (Esc, where the browser gave no full screen: the browser's own Esc leaves it, and fullscreenchange follows)
  document.addEventListener("keydown", e => { if (e.key === "Escape" && on() && !document.fullscreenElement) set(false); });
  const bar = document.createElement("div");
  bar.className = "fs-bar";
  bar.append(btn);
  ui.prepend(bar);
  bar.after(castBtn);
  ui.prepend(leftBtn);
  leftBtn.after(toolBox);

  // ---- the two dividers: each oracle's left column, its right column (the I Ching's inside its .reading grid), by an element
  // as wide as the column
  const APP = [["astro-ui", ".fs-left", ".notes", false], ["iching-ui", ".fs-left", ".casts", true], ["tarot-ui", ".fs-left", ".read", false]]
    .find(([c]) => ui.classList.contains(c));
  let cols = () => {}, clearCols = () => {};
  if (APP) {
    const [, LEFT, RIGHT, NESTED] = APP;
    const inner = NESTED ? ui.querySelector(".reading") : null;
    const KEY = "hazeljs-oracles/fs-cols:" + location.pathname;
    const MIN_SIDE = 220, MIN_MID = 320;
    const handles = ["left", "right"].map(side => {
      const h = document.createElement("div");
      h.className = "fs-divider";
      Object.entries({ role: "separator", "aria-orientation": "vertical", tabindex: "0",
        "aria-label": side === "left" ? "Between the controls and the picture" : "Between the picture and the words",
        title: "Drag to widen or narrow this side (double-click: as it was)" }).forEach(([k, v]) => h.setAttribute(k, v));
      if (side === "left") h.classList.add("left");
      ui.append(h);
      return h;
    });
    const gap = () => parseFloat(getComputedStyle(ui).columnGap) || 0;
    const inside = () => { const cs = getComputedStyle(ui); return ui.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); };
    const widths = () => [ui.querySelector(LEFT).getBoundingClientRect().width, ui.querySelector(RIGHT).getBoundingClientRect().width];
    const kept = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && v.l > 0 && v.r > 0 ? v : null; } catch (e) { return null; } };
    const place = () => {
      if (!on()) return;
      const g = gap(), a = ui.querySelector(LEFT).getBoundingClientRect(), b = ui.querySelector(RIGHT).getBoundingClientRect();
      handles[0].style.left = (a.right + g / 2) + "px";
      handles[1].style.left = (b.left - g / 2) + "px";
    };
    clearCols = () => { ui.style.removeProperty("--fs-cols"); if (inner) inner.style.removeProperty("--fs-cols-in"); };
    // l, r: the left and right columns' widths in px; none, the kept shares at today's width (or the page's own, none kept)
    cols = (l, r, keep) => {
      if (!on()) return;
      const W = inside(), g = gap();
      if (l == null) {
        const k = kept();
        if (!k) { clearCols(); place(); return; }
        l = k.l * W; r = k.r * W;
      }
      l = Math.round(Math.max(MIN_SIDE, Math.min(l, W - 2 * g - MIN_MID - MIN_SIDE)));
      r = Math.round(Math.max(MIN_SIDE, Math.min(r, W - 2 * g - MIN_MID - l)));
      ui.style.setProperty("--fs-cols", NESTED ? `${l}px minmax(0, 1fr)` : `${l}px minmax(0, 1fr) ${r}px`);
      if (inner) inner.style.setProperty("--fs-cols-in", `minmax(0, 1fr) ${r}px`);
      if (keep) try { localStorage.setItem(KEY, JSON.stringify({ l: l / W, r: r / W })); } catch (e) { /* kept for this visit only */ }
      place();
    };
    handles.forEach((h, i) => {
      let drag = null;
      h.addEventListener("pointerdown", e => {
        if (e.button !== 0) return;
        const [l, r] = widths();
        drag = { id: e.pointerId, x: e.clientX, l, r, now: null };
        try { h.setPointerCapture(e.pointerId); } catch (_) { /* moves still reach the handle */ }
        h.classList.add("drag"); root.classList.add("dragging-split"); e.preventDefault();
      });
      h.addEventListener("pointermove", e => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x;
        drag.now = i === 0 ? [drag.l + dx, drag.r] : [drag.l, drag.r - dx];
        cols(...drag.now);
      });
      const end = e => {
        if (!drag || e.pointerId !== drag.id) return;
        if (drag.now) cols(...drag.now, true);
        drag = null; h.classList.remove("drag"); root.classList.remove("dragging-split");
      };
      h.addEventListener("pointerup", end);
      h.addEventListener("pointercancel", end);
      h.addEventListener("dblclick", () => { try { localStorage.removeItem(KEY); } catch (e) { /* nothing kept */ } clearCols(); place(); });
      h.addEventListener("keydown", e => {
        const d = { ArrowLeft: -40, ArrowRight: 40 }[e.key];
        if (!d) return;
        e.preventDefault();
        const [l, r] = widths();
        if (i === 0) cols(l + d, r, true); else cols(l, r - d, true);
      });
    });
    // (the browser's full screen arrives after the press, as a resize; a timer, not a frame, as divider.js says)
    addEventListener("resize", () => setTimeout(() => cols(), 0));
  }
  label();
})();
