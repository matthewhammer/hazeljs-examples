// hazeljs-oracles, the I Ching: the page. The casting and the reading are Hazel (rules/*.hz), shown in Hazel's own editor
// (../shared/hazel-listings.js) and built by hazeljs from npm; the page passes random numbers in and draws what comes back.
// While the program has an error or a hole, the page's own JS (castJS, readingJS) answers instead, and each line says which did.
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "iching", MODULES = ["Lines", "Casting", "Book", "Reading"];
  // (0.0.11, a prototype, ticket 765 and ^report(54)'s "Compiled ahead of time": Matthew, 2026-11-16, "only run the pre-compiled
  // JS code for the Hazel code (running hazel jit for it during the packaging step for the HTML/JS, for a short load?)") With
  // ?compiled in the address, the page casts and reads through compiled.js, the same rules compiled to JavaScript by hazel-jit
  // when the site was made: Hazel's library is not loaded and the program not built, until someone edits the rules.
  const COMPILED = new URLSearchParams(location.search).has("compiled");
  const TAIL = "(cast = Casting.cast, reading = Reading.reading)";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });

  // ---- the page's own JS, for while the Hazel program is not ready: the same casting and table as the Hazel modules
  const LINE = { 6: "OldYin", 7: "YoungYang", 8: "YoungYin", 9: "OldYang" };
  const coin = u => u < 0.5 ? 2 : 3;
  const leftover = n => (n % 4) || 4;
  const divide = (n, u) => { const left = 1 + Math.floor(u * (n - 2)); return 1 + leftover(left) + leftover(n - left - 1); };
  function castJS(m, a, b, c) {
    if (m.tag === "Coins") { const cs = [coin(a), coin(b), coin(c)], v = cs[0] + cs[1] + cs[2]; return { line: { tag: LINE[v] }, value: v, counts: cs }; }
    const x = divide(49, a), y = divide(49 - x, b), z = divide(49 - x - y, c), v = (49 - x - y - z) / 4;
    return { line: { tag: LINE[v] }, value: v, counts: [x, y, z] };
  }
  const TRI = [["Kun", "earth"], ["Zhen", "thunder"], ["Kan", "water"], ["Dui", "lake"], ["Gen", "mountain"], ["Li", "fire"], ["Xun", "wind"], ["Qian", "heaven"]]
    .map(([name, image], number) => ({ number, name, image }));
  const KW = [2,24,7,19,15,36,46,11, 16,51,40,54,62,55,32,34, 8,3,29,60,39,63,48,5, 45,17,47,58,31,49,28,43,
              23,27,4,41,52,22,18,26, 35,21,64,38,56,30,50,14, 20,42,59,61,53,37,57,9, 12,25,6,10,33,13,44,1];
  const yang = l => l.tag === "YoungYang" || l.tag === "OldYang";
  const changingLine = l => l.tag === "OldYin" || l.tag === "OldYang";
  const becomes = l => ({ tag: l.tag === "OldYin" ? "YoungYang" : l.tag === "OldYang" ? "YoungYin" : l.tag });
  const tri = (a, b, c) => TRI[+yang(a) + 2 * yang(b) + 4 * yang(c)];
  let NAMES = [];   // from Book.hz's names, read by the page once (the JS answer names a hexagram as Hazel's Book does)
  const hex = (lo, up) => { const k = KW[up.number * 8 + lo.number]; return { number: k, name: NAMES[k - 1] || "" }; };
  const NONE = { number: -1, name: "", image: "" }, UNKNOWN = { number: 0, name: "" };
  function readingJS(ls) {
    const changing = ls.map((l, i) => changingLine(l) ? i + 1 : 0).filter(Boolean);
    if (ls.length >= 6) {
      const lo = tri(ls[0], ls[1], ls[2]), up = tri(ls[3], ls[4], ls[5]), b = ls.map(becomes);
      return { cast: 6, lower: lo, upper: up, primary: hex(lo, up), changing, relating: changing.length ? hex(tri(b[0], b[1], b[2]), tri(b[3], b[4], b[5])) : UNKNOWN };
    }
    return { cast: ls.length, lower: ls.length >= 3 ? tri(ls[0], ls[1], ls[2]) : NONE, upper: NONE, primary: UNKNOWN, changing, relating: UNKNOWN };
  }

  // ---- the state: the lines cast so far, each with how it came and which engine cast it
  // (past: when a reading opened from the history was made, or null for a new one; saved: this reading is in the history)
  const S = { casts: [], built: null, libFailed: false, past: null, saved: false, pastQ: null, typed: "" };
  // (ticket 745, Matthew 2026-11-15: "Optional statement/question for the oracle, recorded in the history. Default statement is
  // --- 'relating to here/now'") the question asked, or the default; fixed once the reading is kept
  const DEFAULT_Q = "relating to here/now";
  const asked = () => $("question").value.trim().replace(/\s+/g, " ") || DEFAULT_Q;
  const method = () => document.querySelector('input[name="method"]:checked').value;
  const hazelReady = () => !!(S.built && S.built.ok);
  function castOne() {
    if (S.casts.length >= 6) return;
    const m = { tag: method() }, u = [Math.random(), Math.random(), Math.random()];
    let c = null, eng = "js", t0 = performance.now();
    if (hazelReady()) { try { c = S.built.value.cast(m, ...u); eng = S.built.compiled ? "compiled" : "hazel"; } catch (e) { c = null; } }
    if (!c || !c.line || !LINE[c.value]) { c = castJS(m, ...u); eng = "js"; }
    S.casts.push({ ...c, method: m.tag, eng, ms: performance.now() - t0, fresh: true });
  }
  // (0.0.10) the reading, asked of Hazel once for each set of lines cast and each build: a page redrawn with the same lines (a
  // cast's draw, then keeping it in the history; the history opened) asks again for nothing. A reading through Hazel took 113 ms
  // on an older Android phone, every redraw.
  let lastReading = null;
  function readingNow() {
    const ls = S.casts.map(c => c.line), tags = ls.map(l => l.tag).join(",");
    if (lastReading && lastReading.built === S.built && lastReading.tags === tags) return lastReading.r;
    let r = null;
    if (hazelReady()) { try { const h = S.built.value.reading(ls); if (h && h.lower) r = { ...h, eng: S.built.compiled ? "compiled" : "hazel" }; } catch (e) { /* the JS answers */ } }
    if (!r) r = { ...readingJS(ls), eng: "js" };
    lastReading = { built: S.built, tags, r };
    return r;
  }

  // ---- drawing: a line as a bar (yang) or a broken bar (yin), an old line marked (○ old yang, × old yin)
  function lineEl(l, i, fresh) {
    const d = el("div", "hl " + (yang(l) ? "yang" : "yin") + (changingLine(l) ? " old" : "") + (fresh ? " fresh" : ""));
    d.title = `line ${i + 1}: ${l.tag.replace(/([a-z])([A-Z])/, "$1 $2").toLowerCase()}`;
    d.append(el("span", "bar"), el("span", "bar"));
    if (changingLine(l)) d.append(el("span", "mark", l.tag === "OldYang" ? "○" : "×"));
    return d;
  }
  const slot = () => el("div", "hl empty");
  function drawHex(holder, ls, freshLast) {
    holder.replaceChildren(...[0, 1, 2, 3, 4, 5].map(i => ls[i] ? lineEl(ls[i], i, freshLast && i === ls.length - 1) : slot()));
  }
  const say = c => c.method === "Coins"
    ? `coins ${c.counts.map(x => x === 3 ? "heads" : "tails").join(", ")} (${c.counts.join(" + ")} = ${c.value})`
    : `stalks set aside ${c.counts.join(", ")}; ${49 - c.counts.reduce((a, b) => a + b, 0)} left, by fours ${c.value}`;
  const NAMEOF = { 6: "old yin, changing", 7: "young yang", 8: "young yin", 9: "old yang, changing" };
  function draw() {
    const ls = S.casts.map(c => c.line), r = readingNow(), n = ls.length;
    drawHex($("primary-lines"), ls, !S.past);
    drawHead();
    $("cast").textContent = n === 0 ? "Cast the first line" : n < 6 ? `Cast line ${n + 1}` : "Six lines cast";
    $("cast").disabled = $("all").disabled = n >= 6;
    const list = $("casts");
    list.replaceChildren(...S.casts.map((c, i) => {
      const li = el("li", c.fresh ? "fresh" : "");
      li.value = i + 1;
      li.append(el("b", "", `Line ${i + 1}: ${c.value}, ${NAMEOF[c.value]}`), " ", el("span", "muted", say(c)), " ", el("span", "eng " + c.eng, c.eng === "hazel" || c.eng === "compiled" ? (c.eng === "compiled" ? "compiled Hazel" : "Hazel") + (typeof c.ms === "number" ? (c.ms < 0.1 ? ", under 0.1 ms" : `, ${c.ms.toFixed(1)} ms`) : "") : "JS"));
      return li;
    }).reverse());
    S.casts.forEach(c => c.fresh = false);
    const cap = $("primary-cap"), v = $("verdict");
    v.replaceChildren();
    document.querySelectorAll(".outlink").forEach(x => x.remove());
    if (n >= 6) {
      cap.textContent = `${r.primary.number}. ${r.primary.name}`;
      v.append(el("b", "", `${r.upper.name} (${r.upper.image}) over ${r.lower.name} (${r.lower.image}).`), " ");
      v.append(r.changing.length ? `Changing ${r.changing.length === 1 ? "line" : "lines"}: ${r.changing.join(", ")}, counted from the bottom; ${r.changing.length === 1 ? "it turns" : "they turn"} it into ${r.relating.number}, ${r.relating.name}.`
        : "No changing lines: the hexagram stands as it is.");
      v.append(" ", el("span", "eng " + r.eng, r.eng === "hazel" ? "read by Hazel" : r.eng === "compiled" ? "read by compiled Hazel" : "read by JS"));
      // (Matthew, 2026-11-15: a link, once the six lines are cast, to a fuller reading on another site, said plainly to be
      // another site's, copyrighted and with ads.) Cafe au Soul's reading takes the six values, bottom line first, as ours are:
      // lns=687879 is 53 changing to 63 there and here.
      const lns = S.casts.map(c => c.value).join("");
      const out = el("p", "outlink");
      const a = el("a", "", `Read more about ${r.primary.number}${r.changing.length ? ` changing to ${r.relating.number}` : ""} at cafeausoul.com ↗`);
      a.href = "https://www.cafeausoul.com/reading/?lns=" + lns; a.target = "_blank"; a.rel = "noopener noreferrer";
      out.append(a, el("span", "muted", " Another site, not part of this one: its text is the publisher's own, copyrighted, and its pages carry ads. It gets only the six numbers of your lines."));
      v.after(out);
    } else if (n >= 3) {
      cap.textContent = `Below: ${r.lower.name}, ${r.lower.image}. ${6 - n} more to cast.`;
    } else cap.textContent = n ? `${6 - n} more lines to cast, from the bottom up.` : "Six lines, cast from the bottom up.";
    const rel = $("relating");
    rel.hidden = !(n >= 6 && r.changing.length);
    if (!rel.hidden) { drawHex($("relating-lines"), ls.map(becomes), false); $("relating-cap").textContent = `becomes ${r.relating.number}. ${r.relating.name}`; }
    drawStatus();
  }
  // ---- the reading's heading: a new one, or one opened from the history, with the time it was made
  function drawHead() {
    const h = $("reading-head");
    h.className = "reading-head" + (S.past ? " past" : "");
    h.replaceChildren(S.past ? `Reading from ${S.past}` : "A new reading");
    if (S.past) { const b = el("button", "", "New reading"); b.type = "button"; b.addEventListener("click", startAgain); h.append(b); }
    // the question under the heading: this reading's, as it is typed, or a past one's (none, for one kept before there were questions)
    const q = S.past ? S.pastQ : asked();
    $("reading-q").textContent = q ? `“${q}”` : "";
    $("question").readOnly = !!(S.saved || S.past);
  }

  // ---- the history (shared/history.js): a reading is kept once its six lines are cast
  const METHOD = { Coins: "by coins", Yarrow: "by yarrow" };
  const H = window.OracleHistory ? window.OracleHistory.panel({
    holder: $("history"), key: "hazeljs-oracles/i-ching/history",
    summarize: r => (r.question ? `“${r.question}” · ` : "") + `${r.primary.number}. ${r.primary.name}` + (r.relating && r.relating.number ? ` → ${r.relating.number}. ${r.relating.name}` : "")
      + ` · ${[...new Set(r.casts.map(c => METHOD[c.method]))].join(" and ")}`,
    open: (r, when) => {
      S.casts = r.casts.map(c => ({ ...c, line: { tag: LINE[c.value] }, fresh: false }));
      if (!S.past) S.typed = $("question").value;   // (what was typed for a new reading, given back by New reading)
      S.past = when; S.saved = true; S.pastQ = r.question || null;
      $("question").value = r.question && r.question !== DEFAULT_Q ? r.question : "";
      const m = document.querySelector(`input[name="method"][value="${r.casts[r.casts.length - 1].method}"]`); if (m) m.checked = true;
      draw();
      $("reading-head").scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
  }) : null;
  function keep() {
    if (S.saved || S.casts.length < 6 || !H) return;
    const r = readingNow();
    H.add({ casts: S.casts.map(({ value, counts, method, eng }) => ({ value, counts, method, eng })),
            primary: r.primary, changing: r.changing, relating: r.relating, question: asked() });
    S.saved = true;
  }
  function startAgain() {
    if (S.past) $("question").value = S.typed;   // (back from a past reading: the question that was being typed)
    S.casts = []; S.past = null; S.pastQ = null; S.saved = false; if (H) H.leave(); draw();
  }

  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), without loading Hazel's library or building the program. Hazel loads if you edit the rules.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr; the page's own JS casts." : "⏳ Loading Hazel (hazeljs from jsDelivr, about 650 kB); until then the page's own JS casts."; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the program…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ The program is ready: Hazel casts each line. Built by hazeljs in ${b.ms.toFixed(0)} ms.`; return; }
    st.className = "status no";
    st.textContent = "The program is not ready, so the page's own JS casts: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "it has a hole.");
  }

  // ---- building, once per change of text
  let L = null, timer = 0;
  const spec = () => L.spec(PROGRAM, TAIL);
  function build() {
    if (!window.Hazel || !L) return;
    const sp = spec(), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now();
    let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!r.ok && !!v && typeof v.cast === "function" && typeof v.reading === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0, at: performance.now() };
    draw();
  }

  // ---- start: the program's text into the listings, the editors, then Hazel
  try {
    const [pre, ...mods] = await Promise.all([text("rules/preamble.hz"), ...MODULES.map(m => text(`rules/${m}.hz`))]);
    document.querySelector(`pre.hazel[data-program="${PROGRAM}"]:not([data-module])`).textContent = pre;
    MODULES.forEach((m, i) => { document.querySelector(`pre.hazel[data-module="${m}"]`).textContent = mods[i]; });
    // (0.0.10: Book's lists declare their types, let names : [String] = [...])
    NAMES = [...((mods[MODULES.indexOf("Book")].split(/let names\s*(?::\s*\[String\]\s*)?=\s*\[/)[1] || "").split("];")[0]).matchAll(/"([^"]+)"/g)].map(x => x[1]);
    // (0.0.8, Matthew 2026-11-16: "only reveal the Hazel edit boxes when asked to") each listing stays text until its button opens
    // Hazel's editor there; Hazel itself (hazel-lib.js) still casts from the text
    window.HazelListingsOptions = { start: "request" };
    await load("../shared/hazel-listings.js?v=0.0.8");
    L = window.HazelListings;
    L.tail(PROGRAM, TAIL);
    L.onChange(PROGRAM, () => { if (!window.Hazel) loadLib(); clearTimeout(timer); timer = setTimeout(build, 350); });
  } catch (e) {
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("cast").addEventListener("click", () => { castOne(); keep(); draw(); });
  $("all").addEventListener("click", () => { while (S.casts.length < 6) castOne(); keep(); draw(); });
  $("again").addEventListener("click", startAgain);
  $("question").addEventListener("input", drawHead);
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });
  document.body.classList.add("js");
  draw();
  // ---- (0.0.9) ⚙️ Advanced (../shared/advanced.js): the version and its notes, and 🧪 this device's speed; Hazel's calls with a fixed stream of draws, so
  // every device does the same work, and the reading as it was afterwards
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "I Ching", built: () => S.built, libAt: () => S.libAt, keysIn: $("question"),
    about: "30 casts by coins and 30 by yarrow and 20 readings through Hazel, ten drawings of the reading, and 20 key presses in the question",
    work: async say => {
      const { stats, painted } = window.OracleAdvanced;
      const draws = [];
      for (let i = 0; i < 10; i++) { const t = performance.now(); draw(); await painted(); draws.push(performance.now() - t); }
      const drawn = `drawing the reading, to the next frame: ${stats(draws).median} ms`;
      if (!hazelReady()) return { data: { hazel: false, draw: stats(draws) }, text: ["Hazel was not ready, so nothing was timed in it", drawn] };
      say("🧪 measuring: casts and readings through Hazel…"); await painted();
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const { cast, reading } = S.built.value, time = f => { const t = performance.now(); f(); return performance.now() - t; };
      const coins = [], yarrow = [], readings = [];
      for (let i = 0; i < 30; i++) coins.push(time(() => cast({ tag: "Coins" }, rnd(), rnd(), rnd())));
      for (let i = 0; i < 30; i++) yarrow.push(time(() => cast({ tag: "Yarrow" }, rnd(), rnd(), rnd())));
      const six = Array.from({ length: 6 }, () => cast({ tag: "Coins" }, rnd(), rnd(), rnd()).line);
      for (let i = 0; i < 20; i++) readings.push(time(() => reading(six)));
      const c = stats(coins), y = stats(yarrow), r = stats(readings);
      return { data: { coins: c, yarrow: y, reading: r, draw: stats(draws) },
               text: [`through Hazel, a cast by coins ${c.median} ms (worst ${c.worst}), by yarrow ${y.median} ms (worst ${y.worst}), a reading ${r.median} ms`, drawn] };
    },
  });
  // (0.0.11) the prototype's switch, under ⚙️ Advanced: this page compiled ahead of time, or interpreted as before
  { const box = $("advanced") && $("advanced").querySelector("details.advanced");
    if (box) {
      const u = new URL(location.href); if (COMPILED) u.searchParams.delete("compiled"); else u.searchParams.set("compiled", "");
      const p = el("p", "advanced-version", COMPILED ? "⚡ This page runs its rules compiled ahead of time (a prototype). " : "⚡ A prototype: the same rules compiled ahead of time to JavaScript, without loading Hazel. ");
      const a = el("a", "", COMPILED ? "Open it interpreted, as before" : "Open it compiled"); a.href = u.href.replace("compiled=", "compiled");
      p.append(a); box.querySelector(".advanced-version").after(p);
    } }
  let libAsked = false;
  function loadLib() {
    if (libAsked) return; libAsked = true;
    const s = document.createElement("script");
    s.src = LIB; s.async = true;
    s.onload = () => { S.libAt = performance.now(); build(); drawStatus(); };
    s.onerror = () => { S.libFailed = true; drawStatus(); };
    document.head.append(s);
  }
  if (!COMPILED) loadLib();
  else {
    const c = document.createElement("script");
    c.src = "compiled.js?v=0.0.11"; c.async = true;
    c.onload = () => {
      const v = window.IChingCompiled;
      if (v && !S.built) { S.libAt = performance.now(); S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; draw(); }
      else if (!v) loadLib();
    };
    c.onerror = () => loadLib();
    document.head.append(c);
  }
})();
