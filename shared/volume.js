// hazeljs-examples, a volume slider beside a game's 🎵 or 🔊 switch (0.0.56; Matthew, 2026-11-22: "for each game with music
// and sound effects -- provide separate volume sliders for each, as well as the existing toggle"). The switch stays as it was,
// on or off; the slider beside it sets how loud, from 0 to 100, kept on this device by the game. Moving the slider while its
// switch is off turns the switch on; let go, it plays a sound at the new loudness. Pinball, Star wave (music and sounds) and
// Mahjong solitaire (sounds).
(() => {
  "use strict";
  let styled = false;
  function style() {
    if (styled) return; styled = true;
    const s = document.createElement("style");
    s.textContent = ".vol-pair { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }" +
      ".vol-pair input[type=range] { width: 84px; margin: 0; accent-color: var(--accent, #6366f1); cursor: pointer; touch-action: none; }" +
      ".vol-pair.off input[type=range] { opacity: 0.45; }";
    document.head.append(s);
  }
  // button: the switch (aria-pressed says whether it is on); label: what the slider sets; get(): the level, 0 to 1; set(v): a
  // new level; isOn(): whether the switch is on; hear(): a sound at the new level, when the slider is let go
  function slider(button, { label, get, set, isOn, hear }) {
    if (!button || button.dataset.vol) return null;
    style(); button.dataset.vol = "1";
    const pair = document.createElement("span"); pair.className = "vol-pair";
    button.before(pair); pair.append(button);
    const r = document.createElement("input");
    r.type = "range"; r.min = "0"; r.max = "100"; r.step = "5"; r.value = String(Math.round(get() * 100));
    r.setAttribute("aria-label", label);
    pair.append(r);
    const show = () => { pair.classList.toggle("off", !isOn()); r.title = `${label}: ${r.value}`; };
    r.addEventListener("input", () => { set(Number(r.value) / 100); if (!isOn() && Number(r.value) > 0) button.click(); show(); });
    r.addEventListener("change", () => { if (hear && isOn()) hear(); r.blur(); });   // (blurred, so the arrow keys go back to the game)
    new MutationObserver(show).observe(button, { attributes: true, attributeFilter: ["aria-pressed"] });
    show();
    return r;
  }
  window.HazelVolume = { slider };
})();
