// hazeljs-oracles, the Tarot: the page. The deck, the deal and the spreads are Hazel (rules/*.hz), shown in Hazel's own editor
// (../shared/hazel-listings.js) and built by hazeljs from npm; the page passes random numbers in and lays out what is dealt.
// While the program has an error or a hole, the page's own JS (dealJS) deals instead. The faces are simple ones drawn here
// (^ticket(732) will make them a deck; ^ticket(731) adds the 1909 cards).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "tarot", MODULES = ["Deck", "Spreads", "Reading"], TAIL = "(deal = Reading.deal)";
  // (0.0.13, ticket 765; Matthew, 2026-11-16: "Yes, both", to compiled as the default and the Tarot compiled too) The page
  // deals through compiled.js, the same rules compiled to JavaScript by hazel-jit when the site was made, without loading
  // Hazel's library or building the program, until someone edits the rules; ?interpreted=1 (or ?compiled=0) interprets
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
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

  // ---- each card's meaning on other sites (^ticket(738), Matthew 2026-11-15: "links to free, externally hosted interpretations of
  // the cards we selected, preferably using one or two modern authors' published meanings"). One map per site, meanings/*.json,
  // from the site's own index of its card pages; we link to them and copy none of their text.
  let MEANINGS = [];   // [{site, author, cards: {id: url}}]
  const cardId = c => c.tag === "Major" ? "major-" + c.value : c.value[0].tag.toLowerCase() + "-" + c.value[1];
  function meaningLinks(d) {
    const id = cardId(d.card), have = MEANINGS.filter(m => m.cards && m.cards[id]);
    if (!have.length) return null;
    const span = el("span", "meanings");
    span.append(d.reversed ? "Its meaning, reversed, by " : "Its meaning by ");
    have.forEach((m, i) => {
      if (i) span.append(i === have.length - 1 ? " or " : ", ");
      const a = el("a", "", `${m.author} (${m.site}) ↗`);
      a.href = m.cards[id]; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.title = `${d.name} on ${m.site}: ${m.author}'s meaning, upright and reversed. Another site, with ads.`;
      span.append(a);
    });
    span.append(".");
    return span;
  }
  Promise.all(["meanings/biddy-tarot.json", "meanings/labyrinthos.json"].map(p => fetch(p).then(r => r.ok ? r.json() : null).catch(() => null)))
    .then(ms => { MEANINGS = ms.filter(Boolean); if (S.turned) draw(); });

  // ---- the state: the spread dealt, how many are turned, which engine dealt
  // (past: when a reading opened from the history was made, or null for a new one)
  const S = { dealt: [], turned: 0, eng: "", ms: 0, built: null, libFailed: false, past: null };
  function deal() {
    const sp = $("spread").value, rev = $("reversals").checked, us = Array.from({ length: 40 }, Math.random);
    let d = null; const t0 = performance.now(); S.eng = "js";
    if (S.built && S.built.ok) { try { d = S.built.value.deal(spreadOf(sp), us, rev); S.eng = S.built.compiled ? "compiled" : "hazel"; } catch (e) { d = null; } }
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
      const li = el("li"); li.append(el("b", "", `${d.position}: ${d.name}${d.reversed ? ", reversed" : ""}.`), " ", el("span", "muted", d.about + "."));
      const m = meaningLinks(d); if (m) li.append(m);
      return li; }));
    if (S.dealt.length) { const li = el("li", "dealt-by"); li.append(el("span", "eng " + S.eng, S.eng === "hazel" || S.eng === "compiled" ? (S.eng === "compiled" ? "dealt by compiled Hazel" : "dealt by Hazel") + (S.past ? "" : S.ms < 0.1 ? " in under 0.1 ms" : S.ms < 10 ? ` in ${S.ms.toFixed(1)} ms` : ` in ${S.ms.toFixed(0)} ms`) : "dealt by JS")); $("read").append(li); }
    if (S.turned && MEANINGS.length) {
      const li = el("li", "meanings-note muted");
      li.textContent = "The ↗ links open other sites: each author's own meaning of the card, upright and reversed, on their publisher's pages, which carry ads and promotions. They learn only which card you open.";
      $("read").append(li);
    }
    drawStatus();
  }
  // what the chosen spread is for, under the chooser
  function drawUse() { const o = $("spread").selectedOptions[0]; $("spread-use").textContent = o ? o.dataset.use || "" : ""; }
  drawUse();

  function drawStatus() {
    const st = $("status"), b = S.built;
    if (COMPILED && S.compiledError && !(b && b.compiled)) { st.className = "status no"; st.textContent = `Compiled mode was asked for, but compiled.js did not run (${S.compiledError}), so Hazel interprets the rules instead.` + (b && b.ok ? ` Built by hazeljs in ${b.ms.toFixed(0)} ms.` : ""); return; }
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), without loading Hazel's library or building the program. Hazel loads if you edit the rules.`; return; }
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
    S.built = { key, ok: !!r.ok && !!v && typeof v.deal === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0, at: performance.now() };
    drawStatus();
  }
  try {
    const [pre, ...mods] = await Promise.all([text("rules/preamble.hz"), ...MODULES.map(m => text(`rules/${m}.hz`))]);
    document.querySelector(`pre.hazel[data-program="${PROGRAM}"]:not([data-module])`).textContent = pre;
    MODULES.forEach((m, i) => { document.querySelector(`pre.hazel[data-module="${m}"]`).textContent = mods[i]; });
    const deck = mods[0], strs = src => [...src.matchAll(/"([^"]+)"/g)].map(x => x[1]);
    MAJORS = strs(deck.split("let majors = [")[1].split("];")[0]);
    RANKS = strs(deck.split("let ranks = [")[1].split("];")[0]);
    // (0.0.8, Matthew 2026-11-16: "only reveal the Hazel edit boxes when asked to") each listing stays text until its button opens
    // Hazel's editor there; Hazel itself (hazel-lib.js) still casts from the text
    window.HazelListingsOptions = { start: "request" };
    await load("../shared/hazel-listings.js?v=0.0.8");
    L = window.HazelListings; L.tail(PROGRAM, TAIL);
    L.onChange(PROGRAM, () => { if (!window.Hazel) loadLib(); clearTimeout(timer); timer = setTimeout(build, 350); });
  } catch (e) {
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("deal").addEventListener("click", () => { deal(); drawUse(); draw(); });
  // ---- (0.0.9) ⚙️ Advanced (../shared/advanced.js): the version and its notes, and 🧪 this device's speed: a deal of every spread through Hazel, with a
  // fixed stream of draws so every device does the same work, and a Celtic Cross drawn with every card turned; then the
  // table as it was
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Tarot", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "a deal of each spread through Hazel, and five drawings of a Celtic Cross with every card turned",
    work: async say => {
      const { stats, painted } = window.OracleAdvanced;
      if (!(S.built && S.built.ok)) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: a deal of each spread through Hazel…"); await painted();
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const deals = {}; let cross = null;
      for (const o of $("spread").options) {
        const us = Array.from({ length: 40 }, rnd), t = performance.now();
        const d = S.built.value.deal(spreadOf(o.value), us, true);
        deals[o.value] = Math.round((performance.now() - t) * 10) / 10;
        if (o.value === "CelticCross") cross = d;
      }
      const ms = Object.values(deals), all = Math.round(ms.reduce((a, b) => a + b, 0)), slow = Object.entries(deals).sort((a, b) => b[1] - a[1])[0];
      say("🧪 measuring: drawing a Celtic Cross…"); await painted();
      const keep = { dealt: S.dealt, turned: S.turned, spread: S.spread, eng: S.eng, ms: S.ms, past: S.past }, draws = [];
      if (cross) {
        Object.assign(S, { dealt: cross, turned: cross.length, spread: "CelticCross", eng: "hazel", ms: 0, past: null });
        for (let i = 0; i < 5; i++) { const t = performance.now(); draw(); await painted(); draws.push(performance.now() - t); }
      }
      Object.assign(S, keep); draw();
      const dr = stats(draws);
      return { data: { deals, all, draw: dr },
               text: [`through Hazel, ${ms.length} deals, one of each spread: ${all} ms in all, the slowest ${slow[1]} ms (${slow[0]})`,
                      cross ? `drawing a Celtic Cross, every card turned, to the next frame: ${dr.median} ms` : null].filter(Boolean) };
    },
  });
  $("spread").addEventListener("change", drawUse);
  $("turn").addEventListener("click", () => { if (S.turned < S.dealt.length) { S.turned++; draw(); } });
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });
  document.body.classList.add("js");
  draw();
  // (0.0.13) the switch, under ⚙️ Advanced: compiled ahead of time, or interpreted as before
  { const box = $("advanced") && $("advanced").querySelector("details.advanced");
    if (box) {
      const u = new URL(location.href); u.searchParams.delete("compiled"); if (COMPILED) u.searchParams.set("interpreted", "1"); else u.searchParams.delete("interpreted");
      const p = el("p", "advanced-version", COMPILED ? "⚡ This page runs its rules compiled ahead of time to JavaScript, without loading Hazel (until you edit them). " : "⚡ This page interprets its rules with hazeljs, as before compiling. ");
      const a = el("a", "", COMPILED ? "Open it interpreted" : "Open it compiled"); a.href = u.href;
      p.append(a); box.querySelector(".advanced-version").after(p);
    } }
  let libAsked = false;
  function loadLib() {
    if (libAsked) return; libAsked = true;
    const s = document.createElement("script"); s.src = LIB; s.async = true;
    s.onload = () => { S.libAt = performance.now(); build(); drawStatus(); }; s.onerror = () => { S.libFailed = true; drawStatus(); };
    document.head.append(s);
  }
  if (!COMPILED) loadLib();
  else {
    addEventListener("error", e => { if (/compiled\.js/.test(e.filename || "")) S.compiledError = String(e.message || e.error || "an error"); });
    const c = document.createElement("script");
    c.src = "compiled.js?v=0.0.13"; c.async = true;
    c.onload = () => {
      const v = window.TarotCompiled;
      if (v && !S.built) { S.libAt = performance.now(); S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); }
      else if (!v) { S.compiledError = S.compiledError || "it ran, but gave no Tarot"; drawStatus(); loadLib(); }
    };
    c.onerror = () => { S.compiledError = "it did not load"; drawStatus(); loadLib(); };
    document.head.append(c);
  }
})();
