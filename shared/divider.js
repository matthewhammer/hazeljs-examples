// hazeljs-examples: the divider between the code and the reading, in two-column mode (^ticket(739); Matthew, 2026-11-15: "in the
// two-column mode for each app, let's provide slider in the center to adjust the vertical division"). As the Petri example's and
// Messed Up Dress Up's: drag it, or the arrow keys on it; a double-click puts it back. Its place is kept in this browser as the
// code column's share of the width, one for each oracle's page. In one column it is hidden, and the page is as it was.
(() => {
  "use strict";
  const grid = document.querySelector(".oracle-grid");
  if (!grid) return;
  const MIN_CODE = 280, MIN_UI = 300, GAP = 6, BAR = 14;   // (each column as wide as its controls need; the bar and its two gaps)
  const KEY = "hazeljs-oracles/split:" + location.pathname;
  const bar = document.createElement("div");
  bar.className = "oracle-divider";
  Object.entries({ role: "separator", "aria-orientation": "vertical", tabindex: "0", "aria-valuemin": "0", "aria-valuemax": "100",
    "aria-label": "Between the program and the reading", title: "Drag to give the program or the reading more room (double-click: as it was)" })
    .forEach(([k, v]) => bar.setAttribute(k, v));
  grid.insertBefore(bar, grid.querySelector(".oracle-code"));
  const twoColumns = () => getComputedStyle(bar).display !== "none";
  const kept = () => { try { const f = parseFloat(localStorage.getItem(KEY)); return f > 0 && f < 1 ? f : null; } catch (e) { return null; } };
  // px: the code column's width, or null for the kept share (or the page's own split, when none is kept)
  function setSplit(px, keep) {
    if (!twoColumns()) return;
    const w = grid.clientWidth;
    if (px == null) {
      const f = kept();
      if (f == null) { grid.style.removeProperty("--split"); bar.removeAttribute("aria-valuenow"); return; }
      px = f * w;
    }
    px = Math.min(Math.max(MIN_CODE, w - 2 * GAP - BAR - MIN_UI), Math.max(MIN_CODE, px));
    grid.style.setProperty("--split", Math.round(px) + "px");
    bar.setAttribute("aria-valuenow", String(Math.round(100 * px / w)));
    if (keep) try { localStorage.setItem(KEY, String(px / w)); } catch (e) { /* kept for this visit only */ }
  }
  const codeWidth = () => grid.querySelector(".oracle-code").getBoundingClientRect().width;
  let drag = null;
  bar.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, px: null };
    try { bar.setPointerCapture(e.pointerId); } catch (_) { /* a pointer the browser does not track: moves still reach the bar */ }
    bar.classList.add("drag"); document.documentElement.classList.add("dragging-split"); e.preventDefault();
  });
  bar.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.px = e.clientX - grid.getBoundingClientRect().left - GAP - BAR / 2;   // (the pointer at the bar's middle)
    setSplit(drag.px);
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.px != null) setSplit(drag.px, true);
    drag = null; bar.classList.remove("drag"); document.documentElement.classList.remove("dragging-split");
  };
  bar.addEventListener("pointerup", endDrag);
  bar.addEventListener("pointercancel", endDrag);
  bar.addEventListener("dblclick", () => { try { localStorage.removeItem(KEY); } catch (e) { /* nothing kept */ } setSplit(); });
  bar.addEventListener("keydown", e => {
    const d = { ArrowLeft: -40, ArrowRight: 40 }[e.key];
    if (!d) return;
    e.preventDefault();
    setSplit(codeWidth() + d, true);
  });
  // the kept share at the width there is now (after a timer, not an animation frame: a page in the background has none)
  const soon = () => setTimeout(() => setSplit(), 0);
  addEventListener("resize", soon);
  soon();
  window.OracleDivider = { set: setSplit };
})();
