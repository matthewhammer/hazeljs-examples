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
  let MAJORS = [], RANKS = [];
  const nameOf = c => c.tag === "Major" ? MAJORS[c.value] : `${RANKS[c.value[1] - 1]} of ${c.value[0].tag}`;
  const DECK = [...Array(22).keys()].map(i => ({ tag: "Major", value: i }))
    .concat(...SUITS.map(s => [...Array(14).keys()].map(r => ({ tag: "Minor", value: [{ tag: s }, r + 1] }))));
  // the spreads' places, as Spreads.hz has them (for while it does not build)
  const P = (name, about) => ({ name, about });
  const THREE = { PastPresentFuture: [P("Past", "what has led here"), P("Present", "where things stand"), P("Future", "where things are heading")],
    SituationChallengeAdvice: [P("Situation", "where things stand"), P("Challenge", "what stands in the way"), P("Advice", "what would help")],
    MindBodySpirit: [P("Mind", "your thoughts"), P("Body", "your body and your days"), P("Spirit", "what moves you")] };
  const CELTIC = [P("1. The present", "what covers the question"), P("2. The challenge", "what crosses it"), P("3. The root", "what lies beneath it"),
    P("4. The recent past", "what is passing away"), P("5. The crown", "what may come to be"), P("6. The near future", "what comes next"),
    P("7. Yourself", "how you stand in it"), P("8. Your surroundings", "the people and places around it"), P("9. Hopes and fears", "what you hope, or dread"),
    P("10. The outcome", "where it leads")];
  const RELATIONSHIP = [P("You", "what you bring"), P("The other", "what they bring"), P("The bond", "what passes between you"),
    P("Its strength", "what holds you together"), P("Its tension", "what pulls you apart"), P("A way forward", "what could come next")];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function positionsJS(s) {
    switch (s.tag) {
      case "One": return [P("The card", "the heart of the matter")];
      case "Three": return THREE[s.value.tag] || [];
      case "CelticCross": return CELTIC;
      case "Relationship": return RELATIONSHIP;
      case "Choice": return [P("The crossroads", "the choice before you")].concat(...[...Array(Math.max(2, Math.min(6, s.value))).keys()].map(i => {
        const p = "Path " + "ABCDEF"[i];
        return [P(p + ": opportunity", "what this path opens"), P(p + ": difficulty", "what this path asks of you"), P(p + ": direction", "where this path is likely to lead")]; }));
      case "YearAhead": return (s.value.theme ? [P("The year", "the theme of the year ahead")] : [])
        .concat([...Array(12).keys()].map(k => P(MONTHS[(s.value.start + k) % 12], "what this month brings")));
    }
    return [];
  }
  // the chooser's value as Hazel's Spread: "Three:MindBodySpirit" is Three(MindBodySpirit); the year ahead starts this month.
  // (YearAhead takes a labeled tuple, not two arguments: hazeljs 0.0.4 cannot pass a constructor a plain tuple, ^ticket(736))
  function spreadOf(v) {
    const [tag, arg] = String(v || "One").split(":");
    if (tag === "Three") return { tag, value: { tag: arg || "PastPresentFuture" } };
    if (tag === "Choice") return { tag, value: Number(arg) || 2 };
    if (tag === "YearAhead") return { tag, value: { start: new Date().getMonth(), theme: arg !== "months" } };
    return { tag };
  }
  const OLD = { Three: "Three:PastPresentFuture" };   // what 0.0.1's history called a spread
  const valueOf = v => OLD[v] || v;
  // the table's shape: the spread's kind, and how many cards (a choice and the year ahead have more than one shape)
  const layoutOf = (v, n) => `${String(valueOf(v) || "").split(":")[0]} n${n}`;
  function dealJS(spread, us, rev) {
    const cs = DECK.slice();
    return positionsJS(spread).map((p, i) => { const c = cs.splice(Math.floor(us[2 * i] * cs.length), 1)[0];
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
  // (past: when a reading opened from the history was made, or null for a new one)
  const S = { dealt: [], turned: 0, eng: "", ms: 0, built: null, libFailed: false, past: null };
  function deal() {
    const sp = $("spread").value, rev = $("reversals").checked, us = Array.from({ length: 40 }, Math.random);
    let d = null; const t0 = performance.now(); S.eng = "js";
    if (S.built && S.built.ok) { try { d = S.built.value.deal(spreadOf(sp), us, rev); S.eng = "hazel"; } catch (e) { d = null; } }
    if (!Array.isArray(d) || !d.every(x => x && x.card && typeof x.name === "string")) { d = dealJS(spreadOf(sp), us, rev); S.eng = "js"; }
    S.ms = performance.now() - t0; S.dealt = d; S.turned = 0; S.spread = sp; S.past = null;
    // kept in the history as it is dealt: the cards are the reading's, turned or not
    if (H) H.add({ spread: sp, reversals: rev, eng: S.eng, dealt: d.map(({ card, name, reversed, position, about }) => ({ card, name, reversed, position, about })) });
  }

  // ---- the history (shared/history.js): each deal, opened again with every card turned
  // a spread's name, as the chooser has it ("Choice:2" is "A choice: Two paths")
  const SPREAD = v => { const o = document.querySelector(`#spread option[value="${valueOf(v)}"]`); if (!o) return v;
    const g = o.parentElement.tagName === "OPTGROUP" ? o.parentElement.label.split(":")[0] + ": " : ""; return g + o.textContent.replace(/ \(\d+ cards\)$/, ""); };
  const H = window.OracleHistory ? window.OracleHistory.panel({
    holder: $("history"), key: "hazeljs-oracles/tarot/history",
    summarize: r => `${SPREAD(r.spread)}: ` + r.dealt.map(d => d.name + (d.reversed ? " (reversed)" : "")).join(", "),
    open: (r, when) => {
      S.dealt = r.dealt; S.turned = r.dealt.length; S.spread = r.spread; S.eng = r.eng; S.ms = 0; S.past = when;
      $("spread").value = valueOf(r.spread); $("reversals").checked = !!r.reversals; drawUse();
      draw();
      $("reading-head").scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
  }) : null;
  function drawHead() {
    const h = $("reading-head");
    h.className = "reading-head" + (S.past ? " past" : "");
    h.replaceChildren(S.past ? `Reading from ${S.past}` : "A new reading");
    if (S.past) { const b = el("button", "", "New reading"); b.type = "button";
      b.addEventListener("click", () => { S.dealt = []; S.turned = 0; S.past = null; if (H) H.leave(); draw(); }); h.append(b); }
  }
  function draw() {
    drawHead();
    const t = $("table"); t.replaceChildren(); t.className = "table " + (S.dealt.length ? layoutOf(S.spread, S.dealt.length) : "");
    if (!S.dealt.length) t.append(el("p", "muted", "Deal to lay out a spread."));
    S.dealt.forEach((d, i) => {
      const c = el("button", "card" + (i < S.turned ? " up" : "") + (d.reversed ? " rev" : "") + (i === S.turned - 1 && !S.past ? " fresh" : ""));
      c.type = "button"; c.style.gridArea = "p" + (i + 1);
      c.title = i < S.turned ? `${d.position}: ${d.name}${d.reversed ? ", reversed" : ""}` : `${d.position}: face down; turn it`;
      c.append(i < S.turned ? face(d) : el("div", "back", "✧"), el("span", "where", d.position));
      c.addEventListener("click", () => { if (i >= S.turned) { S.turned = i + 1; draw(); } });
      t.append(c);
    });
    $("turn").disabled = !S.dealt.length || S.turned >= S.dealt.length;
    $("read").replaceChildren(...S.dealt.slice(0, S.turned).map(d => {
      const li = el("li"); li.append(el("b", "", `${d.position}: ${d.name}${d.reversed ? ", reversed" : ""}.`), " ", el("span", "muted", d.about + ".")); return li; }));
    if (S.dealt.length) { const li = el("li", "dealt-by"); li.append(el("span", "eng " + S.eng, S.eng === "hazel" ? (S.past ? "dealt by Hazel" : `dealt by Hazel in ${S.ms.toFixed(0)} ms`) : "dealt by JS")); $("read").append(li); }
    drawStatus();
  }
  // what the chosen spread is for, under the chooser
  function drawUse() { const o = $("spread").selectedOptions[0]; $("spread-use").textContent = o ? o.dataset.use || "" : ""; }
  drawUse();

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
    await load("../shared/hazel-listings.js?v=0.0.2");
    L = window.HazelListings; L.tail(PROGRAM, TAIL);
    L.onChange(PROGRAM, () => { clearTimeout(timer); timer = setTimeout(build, 350); });
  } catch (e) {
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("deal").addEventListener("click", () => { deal(); draw(); });
  $("spread").addEventListener("change", drawUse);
  $("turn").addEventListener("click", () => { if (S.turned < S.dealt.length) { S.turned++; draw(); } });
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });
  document.body.classList.add("js");
  draw();
  const s = document.createElement("script"); s.src = LIB; s.async = true;
  s.onload = () => { build(); drawStatus(); }; s.onerror = () => { S.libFailed = true; drawStatus(); };
  document.head.append(s);
})();
