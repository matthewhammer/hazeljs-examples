// hazeljs-oracles, the Tarot: the page. The deck, the deal and the spreads are Hazel (rules/*.hz), shown in Hazel's own editor
// (../shared/hazel-listings.js) and built by hazeljs from npm; the page passes random numbers in and lays out what is dealt.
// While the program has an error or a hole, the page's own JS (dealJS) deals instead. The faces are simple ones drawn here
// (^ticket(732) will make them a deck; ^ticket(731) adds the 1909 cards).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "tarot", MODULES = ["Deck", "Spreads", "Reading"], TAIL = "(deal = Reading.deal)";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });

  // ---- the page's own JS deal, for while the Hazel program is not ready (the names and places read from the Hazel files)
  const SUITS = ["Wands", "Cups", "Swords", "Pentacles"];
  let MAJORS = [], RANKS = [], PLACES = {};
  const nameOf = c => c.tag === "Major" ? MAJORS[c.value] : `${RANKS[c.value[1] - 1]} of ${c.value[0].tag}`;
  const DECK = [...Array(22).keys()].map(i => ({ tag: "Major", value: i }))
    .concat(...SUITS.map(s => [...Array(14).keys()].map(r => ({ tag: "Minor", value: [{ tag: s }, r + 1] }))));
  function dealJS(spread, us, rev) {
    const cs = DECK.slice();
    return (PLACES[spread] || []).map((p, i) => { const c = cs.splice(Math.floor(us[2 * i] * cs.length), 1)[0];
      return { card: c, name: nameOf(c), reversed: rev && us[2 * i + 1] < 0.5, position: p.name, about: p.about }; });
  }

  // ---- a face: a major arcanum's number and name; a suit card's sign, as many times as its number; a court card's title
  const SIGN = { Wands: "⚚", Cups: "🜄", Swords: "⚔", Pentacles: "⛤" };
  const ROMAN = n => n === 0 ? "0" : ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI"][n - 1];
  function face(d) {
    const f = el("div", "face" + (d.card.tag === "Major" ? " major" : " minor " + d.card.value[0].tag.toLowerCase()));
    if (d.card.tag === "Major") { f.append(el("div", "num", ROMAN(d.card.value)), el("div", "big", "✶"), el("div", "nm", d.name)); return f; }
    const [s, r] = [d.card.value[0].tag, d.card.value[1]];
    if (r <= 10) { const g = el("div", "pips"); for (let i = 0; i < r; i++) g.append(el("span", "", SIGN[s])); f.append(g); }
    else f.append(el("div", "num", RANKS[r - 1]), el("div", "big", SIGN[s]));
    f.append(el("div", "nm", d.name));
    return f;
  }

  // ---- the state: the spread dealt, how many are turned, which engine dealt
  const S = { dealt: [], turned: 0, eng: "", ms: 0, built: null, libFailed: false };
  function deal() {
    const sp = $("spread").value, rev = $("reversals").checked, us = Array.from({ length: 20 }, Math.random);
    let d = null; const t0 = performance.now(); S.eng = "js";
    if (S.built && S.built.ok) { try { d = S.built.value.deal({ tag: sp }, us, rev); S.eng = "hazel"; } catch (e) { d = null; } }
    if (!Array.isArray(d) || !d.every(x => x && x.card && typeof x.name === "string")) { d = dealJS(sp, us, rev); S.eng = "js"; }
    S.ms = performance.now() - t0; S.dealt = d; S.turned = 0; S.spread = sp;
  }
  function draw() {
    const t = $("table"); t.replaceChildren(); t.className = "table " + (S.spread || "");
    if (!S.dealt.length) t.append(el("p", "muted", "Deal to lay out a spread."));
    S.dealt.forEach((d, i) => {
      const c = el("button", "card" + (i < S.turned ? " up" : "") + (d.reversed ? " rev" : "") + (i === S.turned - 1 ? " fresh" : ""));
      c.type = "button"; c.style.gridArea = "p" + (i + 1);
      c.title = i < S.turned ? `${d.position}: ${d.name}${d.reversed ? ", reversed" : ""}` : `${d.position}: face down; turn it`;
      c.append(i < S.turned ? face(d) : el("div", "back", "✧"), el("span", "where", d.position));
      c.addEventListener("click", () => { if (i >= S.turned) { S.turned = i + 1; draw(); } });
      t.append(c);
    });
    $("turn").disabled = !S.dealt.length || S.turned >= S.dealt.length;
    $("read").replaceChildren(...S.dealt.slice(0, S.turned).map(d => {
      const li = el("li"); li.append(el("b", "", `${d.position}: ${d.name}${d.reversed ? ", reversed" : ""}.`), " ", el("span", "muted", d.about + ".")); return li; }));
    if (S.dealt.length) { const li = el("li", "dealt-by"); li.append(el("span", "eng " + S.eng, S.eng === "hazel" ? `dealt by Hazel in ${S.ms.toFixed(0)} ms` : "dealt by JS")); $("read").append(li); }
    drawStatus();
  }
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr; the page's own JS deals." : "⏳ Loading Hazel (hazeljs from jsDelivr, about 650 kB); until then the page's own JS deals."; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the program…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ The program is ready: Hazel deals. Built by hazeljs in ${b.ms.toFixed(0)} ms.`; return; }
    st.className = "status no";
    st.textContent = "The program is not ready, so the page's own JS deals: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "it has a hole.");
  }

  let L = null, timer = 0;
  function build() {
    if (!window.Hazel || !L) return;
    const sp = L.spec(PROGRAM, TAIL), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now(); let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!r.ok && !!v && typeof v.deal === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0 };
    drawStatus();
  }
  try {
    const [pre, ...mods] = await Promise.all([text("rules/preamble.hz"), ...MODULES.map(m => text(`rules/${m}.hz`))]);
    document.querySelector(`pre.hazel[data-program="${PROGRAM}"]:not([data-module])`).textContent = pre;
    MODULES.forEach((m, i) => { document.querySelector(`pre.hazel[data-module="${m}"]`).textContent = mods[i]; });
    const deck = mods[0], strs = src => [...src.matchAll(/"([^"]+)"/g)].map(x => x[1]);
    MAJORS = strs(deck.split("let majors = [")[1].split("];")[0]);
    RANKS = strs(deck.split("let ranks = [")[1].split("];")[0]);
    for (const sp of ["One", "Three", "CelticCross"]) {
      const part = (mods[1].split(`| ${sp} =>`)[1] || "").split(/\|\s*[A-Z]|\bend\b/)[0];
      PLACES[sp] = [...part.matchAll(/name = "([^"]+)", about = "([^"]+)"/g)].map(x => ({ name: x[1], about: x[2] }));
    }
    await load("../shared/hazel-listings.js");
    L = window.HazelListings; L.tail(PROGRAM, TAIL);
    L.onChange(PROGRAM, () => { clearTimeout(timer); timer = setTimeout(build, 350); });
  } catch (e) {
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("deal").addEventListener("click", () => { deal(); draw(); });
  $("turn").addEventListener("click", () => { if (S.turned < S.dealt.length) { S.turned++; draw(); } });
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });
  document.body.classList.add("js");
  draw();
  const s = document.createElement("script"); s.src = LIB; s.async = true;
  s.onload = () => { build(); drawStatus(); }; s.onerror = () => { S.libFailed = true; drawStatus(); };
  document.head.append(s);
})();
