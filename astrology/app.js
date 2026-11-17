// hazeljs-oracles, astrology (ticket 768): the page. The astronomy, the chart, the aspects and the reading are Hazel
// (rules/*.hz), shown in Hazel's own editor (../shared/hazel-listings.js) and built by hazeljs from npm. The page turns the
// birth's local time into UTC (the browser's own time zones), asks the program for one reading, and draws what comes back.
//
// The program's answer is data, not a function: the page writes the birth and the day into the program's last line,
// Reading.reading((year = ..., hour = ...), (latitude = ..., longitude = ...), (...)), and builds it again for each chart. A
// program that answers with a function reaching these modules grows past gigabytes in hazeljs 0.0.4 (hazelgrove/hazel#2832),
// and a float literal past six decimals sends it to the slow parse (hazelgrove/hazel#2831): the page writes six.
// There is no JS fallback here, as the other oracles have: the sky is Hazel's alone.
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "astrology";
  const MODULES = ["Zodiac", "Aspects", "Chart", "Orbit", "MoonOrbit", "Planets", "Outer", "PlutoOrbit", "Sky", "Wheel", "Reading"];
  // (the editors evaluate the program with this last line: data, cheap, as a function would bloat there too)
  const LISTING_TAIL = "Zodiac.signs";
  const KEY = "hazeljs-oracles/astrology/birth";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const SVG = "http://www.w3.org/2000/svg";
  const sv = (tag, attrs) => { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const painted = () => new Promise(ok => requestAnimationFrame(() => setTimeout(ok, 0)));

  // ---- places: a few cities, or a latitude, longitude and time zone (the ascendant's formula fails past the polar circles)
  const CITIES = [
    ["This app's birthplace, 40.046313° N, 105.286695° W", 40.046313, -105.286695, "America/Denver"], ["New York", 40.7128, -74.0060, "America/New_York"],
    ["Chicago", 41.8781, -87.6298, "America/Chicago"], ["Los Angeles", 34.0522, -118.2437, "America/Los_Angeles"],
    ["Mexico City", 19.4326, -99.1332, "America/Mexico_City"], ["São Paulo", -23.5505, -46.6333, "America/Sao_Paulo"],
    ["London", 51.5074, -0.1278, "Europe/London"], ["Paris", 48.8566, 2.3522, "Europe/Paris"],
    ["Cairo", 30.0444, 31.2357, "Africa/Cairo"], ["Lagos", 6.5244, 3.3792, "Africa/Lagos"],
    ["Mumbai", 19.0760, 72.8777, "Asia/Kolkata"], ["Beijing", 39.9042, 116.4074, "Asia/Shanghai"],
    ["Tokyo", 35.6762, 139.6503, "Asia/Tokyo"], ["Sydney", -33.8688, 151.2093, "Australia/Sydney"],
  ];
  const ELSEWHERE = "elsewhere";
  // (Matthew, 2026-11-17: the app's own birthday, named by its coordinates alone) the form starts with the app's own birth: its
  // first commit, 0fa9e0a, at 11:03:51 MST on 2026-11-17, 18:03:51 UTC, at 40.046313° N, 105.286695° W
  const APP_BIRTH = Date.UTC(2026, 10, 17, 18, 3, 51);
  $("city").append(...CITIES.map(([name], i) => { const o = el("option", "", name); o.value = String(i); return o; }), Object.assign(el("option", "", "Somewhere else…"), { value: ELSEWHERE }));
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const zones = (Intl.supportedValuesOf && Intl.supportedValuesOf("timeZone")) || [here, "UTC"];
  $("zone").append(...zones.map(z => { const o = el("option", "", z.replace(/_/g, " ")); o.value = z; return o; }));
  $("zone").value = zones.includes("America/Denver") ? "America/Denver" : here;
  const showElsewhere = () => { $("elsewhere").hidden = $("city").value !== ELSEWHERE; };
  $("city").addEventListener("change", showElsewhere);
  $("bnotime").addEventListener("change", () => { $("btime").disabled = $("bnotime").checked; });
  const pad = n => String(n).padStart(2, "0");
  const today = new Date();
  $("tdate").value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // ---- a local time in a time zone, to UTC: the zone's offset at a guess, then again at the answer (a change of clocks between)
  function offsetMs(utc, zone) {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    const p = Object.fromEntries(f.formatToParts(new Date(utc)).map(x => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - utc;
  }
  function zonedToUtc(y, mo, d, h, mi, sec, zone) {
    const wall = Date.UTC(y, mo - 1, d, h, mi, sec);
    const first = wall - offsetMs(wall, zone);
    return wall - offsetMs(first, zone);
  }
  // a moment as Hazel's Moment, in UTC, the hour to six decimals (about 4 ms)
  const moment = t => { const d = new Date(t); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600 }; };
  const momentLit = m => `(year = ${m.year}, month = ${m.month}, day = ${m.day}, hour = ${m.hour.toFixed(6)})`;
  const num = x => (x < 0 ? "-" : "") + Math.abs(x).toFixed(6);

  // ---- the form, read: the birth (its UTC moment, as typed, where), and today's sky at this moment of the day chosen
  function asked() {
    const [y, mo, d] = $("bdate").value.split("-").map(Number);
    if (!y || y < 1900 || y > 2099) throw new Error("a birth date from 1900 to 2099");
    const noTime = $("bnotime").checked;
    const [h, mi, sec = 0] = noTime ? [12, 0, 0] : ($("btime").value || "12:00").split(":").map(Number);
    let name, lat, lon, zone;
    if ($("city").value === ELSEWHERE) {
      lat = Number($("lat").value); lon = Number($("lon").value); zone = $("zone").value;
      if (!(Math.abs(lat) <= 66)) throw new Error("a latitude from -66 to 66 (past the polar circles a sign can stay below the horizon all day, and the rising sign has no meaning)");
      if (!(Math.abs(lon) <= 180)) throw new Error("a longitude from -180 to 180, east positive");
      name = `at ${Math.abs(lat).toFixed(4)}° ${lat < 0 ? "S" : "N"}, ${Math.abs(lon).toFixed(4)}° ${lon < 0 ? "W" : "E"}`;
    } else {
      const k = Number($("city").value);
      [name, lat, lon, zone] = CITIES[k];
      name = k === 0 ? "at 40.046313° N, 105.286695° W" : "in " + name;
    }
    const birth = zonedToUtc(y, mo, d, h, mi, sec, zone);
    const [ty, tmo, td] = ($("tdate").value || "").split("-").map(Number);
    const now = new Date();
    const day = ty ? new Date(ty, tmo - 1, td, now.getHours(), now.getMinutes()).getTime() : now.getTime();
    const app = birth === APP_BIRTH && lat === CITIES[0][1] && lon === CITIES[0][2];
    return { birth, lat, lon, zone, name, noTime, day, app, typed: { date: $("bdate").value, time: noTime ? "" : $("btime").value, city: $("city").value, lat, lon, zone } };
  }
  const tailOf = a => `Reading.reading(${momentLit(moment(a.birth))}, (latitude = ${num(a.lat)}, longitude = ${num(a.lon)}), ${momentLit(moment(a.day))})`;

  // ---- remembering the birth on this device, only when asked
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved) {
      $("remember").checked = true; $("bdate").value = saved.date || $("bdate").value;
      if (saved.time) $("btime").value = saved.time; else { $("bnotime").checked = true; $("btime").disabled = true; }
      $("city").value = saved.city || "0";
      if (saved.city === ELSEWHERE) { $("lat").value = saved.lat; $("lon").value = saved.lon; if (zones.includes(saved.zone)) $("zone").value = saved.zone; }
    }
  } catch (e) { /* no storage here: nothing remembered */ }
  showElsewhere();
  function remember(a) {
    try { if ($("remember").checked) localStorage.setItem(KEY, JSON.stringify(a.typed)); else localStorage.removeItem(KEY); } catch (e) { /* no storage */ }
  }
  $("remember").addEventListener("change", () => { if (!$("remember").checked) try { localStorage.removeItem(KEY); } catch (e) {} });

  // ---- the state: the reading asked for, and the last answer
  const S = { asked: null, result: null, busy: false, libFailed: false, libAt: 0, error: "" };
  let L = null;
  // one reading: the program as the listings have it, with the birth and the day as its last line; the same text asks again for nothing
  let last = null;
  function run(a) {
    const sp = L.spec(PROGRAM, tailOf(a)), key = JSON.stringify(sp);
    if (last && last.key === key) return last;
    const t0 = performance.now();
    let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" && r.value.wheel ? r.value : null;
    last = { key, ok: !!r.ok && !!v, value: v, errors: r.errors || [], threw, ms: performance.now() - t0 };
    return last;
  }
  async function cast() {
    if (S.busy) return;
    let a;
    try { a = asked(); } catch (e) { S.error = "Please give " + e.message + "."; drawStatus(); return; }
    S.error = ""; S.asked = a; remember(a);
    if (!window.Hazel) { loadLib(); drawStatus(); return; }   // (cast when Hazel arrives)
    S.busy = true; drawStatus(); await painted();
    S.result = run(a);
    S.busy = false;
    draw();
  }

  // ---- drawing: the glyphs (glyphs.svg's symbols, put in the page once), the wheel, and the notes
  const GLYPH = { Aries: "aries", Taurus: "taurus", Gemini: "gemini", Cancer: "cancer", Leo: "leo", Virgo: "virgo", Libra: "libra", Scorpio: "scorpio", Sagittarius: "sagittarius", Capricorn: "capricorn", Aquarius: "aquarius", Pisces: "pisces" };
  const glyph = (id, x, y, size, cls, title) => {
    const g = sv("g", { class: cls });
    if (title) { const t = sv("title", {}); t.textContent = title; g.append(t); }
    g.append(sv("use", { href: "#" + id, x: x - size / 2, y: y - size / 2, width: size, height: size }));
    return g;
  };
  const SIGNS = Object.keys(GLYPH);
  const where = lon => { const l = ((lon % 360) + 360) % 360; return `${Math.floor(l % 30)}° ${SIGNS[Math.floor(l / 30)]}`; };
  const HARD = { Square: 1, Opposition: 1 };
  function drawWheel(v) {
    const w = $("wheel"), c = (r, cls) => sv("circle", { cx: 50, cy: 50, r, class: cls });
    const line = (l, cls) => sv("line", { x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, class: cls });
    const lonOf = (ps, b) => (ps.find(p => p.body.tag === b) || {}).longitude;
    w.replaceChildren(
      ...v.wheel.signs.map(s => glyph(GLYPH[s.sign.tag], s.x, s.y, 5.4, "sign " + s.element.tag.toLowerCase(), `${s.sign.tag}, ${s.element.tag.toLowerCase()}`)),
      c(50, "ring"), c(41, "ring"), c(34.3, "ring faint"), c(27, "ring"),
      ...v.wheel.cusps.map(l => line(l, "cusp")),
      ...v.wheel.axes.map(l => line(l, "axis")),
      ...v.wheel.lines.filter(l => l.kind.tag !== "Conjunction").map(l => line(l, "aspect " + (HARD[l.kind.tag] ? "hard" : "soft"))),
      ...v.wheel.marks.map(m => {
        const ps = m.ring === 0 ? v.natal : v.today, lon = lonOf(ps, m.body.tag);
        return glyph(m.body.tag.toLowerCase(), m.x, m.y, m.ring === 0 ? 5.6 : 4.8, m.ring === 0 ? "body natal" : "body today",
          `${m.ring === 0 ? "At birth" : "Today"}: ${m.body.tag}, ${where(lon)}`);
      }),
    );
    // the axes' names, outside the wheel: Asc at the ascendant's end, MC at the midheaven's
    const label = (x, y, s) => { const t = sv("text", { x, y, class: "axis-name", "text-anchor": "middle", "dominant-baseline": "middle" }); t.textContent = s; return t; };
    const out = (l, k) => ({ x: 50 + (l.x1 - 50) * k, y: 50 + (l.y1 - 50) * k });
    const a = out(v.wheel.axes[0], 1.1), m = out(v.wheel.axes[1], 1.1);
    w.append(label(a.x, a.y, "Asc"), label(m.x, m.y, "MC"));
  }
  const fmtDay = t => new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  function notes(head, ns) {
    const s = el("section", "note-group");
    s.append(el("h3", "", head), ...ns.map(n => { const p = el("p", "note"); p.append(el("b", "", n.head), el("br"), n.text); return p; }));
    return s;
  }
  function draw() {
    const r = S.result, a = S.asked;
    $("wheel-fig").hidden = !(r && r.ok);
    if (r && r.ok && a) {
      const v = r.value;
      $("reading-head").textContent = a.app ? "This app's own birth chart" : "A birth chart";
      const local = new Date(a.birth).toLocaleString(undefined, { timeZone: a.zone, year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
      $("reading-q").textContent = `Born ${a.noTime ? new Date(a.birth).toLocaleDateString(undefined, { timeZone: a.zone, year: "numeric", month: "long", day: "numeric" }) + ", time not known (noon)" : local} ${a.name}; today's sky on ${fmtDay(a.day)}.`;
      drawWheel(v);
      const n = $("notes");
      n.replaceChildren(notes("At birth", v.notes), notes(`Today, ${fmtDay(a.day)}`, v.today_notes));
      if (a.noTime) n.prepend(el("p", "muted", "With no time of birth, the rising sign and the houses are a guess (noon), and so is the Moon's degree."));
      n.append(el("p", "muted reading-foot", `Cast by Hazel in ${(r.ms / 1000).toFixed(1)} s: ${v.aspects.length} aspects at birth, ${v.transits.length} from today's sky (the closest six above).`));
    } else $("notes").replaceChildren();
    drawStatus();
  }
  function drawStatus() {
    const st = $("status"), r = S.result;
    if (S.error) { st.className = "status no"; st.textContent = S.error; return; }
    if (!window.Hazel) { st.className = S.libFailed ? "status no" : "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr, and this page has no other way to cast." : "⏳ Loading Hazel (hazeljs from jsDelivr, about 650 kB)" + (S.asked ? "; the chart is cast when it arrives." : "."); return; }
    if (S.busy) { st.className = "status wait"; st.textContent = "⏳ Hazel is building the program and casting the chart (a few seconds; longer on a phone)…"; return; }
    if (!r) { st.className = "status ok"; st.textContent = "✓ Hazel is ready. Cast the chart."; return; }
    if (r.ok) { st.className = "status ok"; st.textContent = `✓ Built and cast by Hazel in ${(r.ms / 1000).toFixed(1)} s.`; return; }
    st.className = "status no";
    st.textContent = "The program did not cast the chart: " + (r.threw || (r.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "it has a hole, or its answer is not a reading.");
  }

  // ---- start: the glyphs, the program's text into the listings, the editors, then Hazel
  let timer = 0;
  try {
    const [glyphs, pre, ...mods] = await Promise.all([text("glyphs.svg"), text("rules/preamble.hz"), ...MODULES.map(m => text(`rules/${m}.hz`))]);
    document.body.insertAdjacentHTML("afterbegin", glyphs.replace(/<\?xml[^>]*>/, "").replace('style="display:none"', 'aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"'));
    document.querySelector(`pre.hazel[data-program="${PROGRAM}"]:not([data-module])`).textContent = pre;
    MODULES.forEach((m, i) => { document.querySelector(`pre.hazel[data-module="${m}"]`).textContent = mods[i]; });
    window.HazelListingsOptions = { start: "request" };
    await load("../shared/hazel-listings.js?v=0.0.14");
    L = window.HazelListings;
    L.tail(PROGRAM, LISTING_TAIL);
    // an edit casts the chart again, once the typing stops
    L.onChange(PROGRAM, () => { clearTimeout(timer); timer = setTimeout(() => { if (S.result) cast(); }, 600); });
  } catch (e) {
    $("status").className = "status no";
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("form").addEventListener("submit", e => { e.preventDefault(); cast(); });
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });
  document.body.classList.add("js");
  draw();
  // ---- ⚙️ Advanced (../shared/advanced.js): the version and its notes, and 🧪 this device's speed: three charts cast in Hazel
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Astrology", built: () => last && { ok: last.ok, ms: last.ms }, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: "interpreted", error: null }),
    about: "three charts built and cast by Hazel (the same three births on every device) and ten drawings of the wheel",
    work: async say => {
      const { stats, painted } = window.OracleAdvanced;
      if (!window.Hazel || !L) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      const births = [Date.UTC(1969, 6, 20, 20, 17), Date.UTC(1990, 5, 15, 14, 30), Date.UTC(2024, 3, 8, 18, 18)], casts = [];
      for (const b of births) {
        say(`🧪 measuring: chart ${casts.length + 1} of 3…`); await painted();
        last = null;
        const r = run({ birth: b, lat: 40.015, lon: -105.2705, day: Date.UTC(2026, 10, 17, 19) });
        casts.push(r.ms);
      }
      last = null; if (S.asked) S.result = run(S.asked);
      const draws = [];
      for (let i = 0; i < 10; i++) { const t = performance.now(); draw(); await painted(); draws.push(performance.now() - t); }
      const c = stats(casts), d = stats(draws);
      return { data: { cast: c, draw: d }, text: [`a chart built and cast by Hazel ${c.median} ms (worst ${c.worst})`, `drawing the chart, to the next frame: ${d.median} ms`] };
    },
  });
  let libAsked = false;
  function loadLib() {
    if (libAsked) return; libAsked = true;
    const s = document.createElement("script");
    s.src = LIB; s.async = true;
    s.onload = () => { S.libAt = performance.now(); drawStatus(); if (S.asked && !S.result) cast(); };
    s.onerror = () => { S.libFailed = true; drawStatus(); };
    document.head.append(s);
  }
  loadLib();
})();
