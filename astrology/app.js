// hazeljs-examples, astrology (ticket 768): the page. The astronomy, the chart, the aspects and the reading are Hazel
// (rules/*.hz), shown in Hazel's own editor (../shared/hazel-listings.js) and built by hazeljs from npm. The page turns the
// birth's local time into UTC (the browser's own time zones), asks the program for one reading, and draws what comes back.
//
// The program's answer is data, not a function: the page writes the birth and the day into the program's last line,
// Reading.reading((year = ..., hour = ...), (latitude = ..., longitude = ...), (...)), and builds it again for each chart. A
// program that answers with a function reaching these modules grows past gigabytes in hazeljs 0.0.4 (hazelgrove/hazel#2832),
// and a float literal past six decimals sends it to the slow parse (hazelgrove/hazel#2831): the page writes six.
// There is no JS fallback here, as the other oracles have: the sky is Hazel's alone.
//
// (0.0.16, ticket 768; Matthew, 2026-11-18: "does our astrology app use compiled code by default, like the others seem to?
// ... It seems like we should, if possible") By default the page casts through compiled.js, the same rules compiled to
// JavaScript by hazel-jit when the site was made (tools/make-compiled.py), without loading Hazel's library or building the
// program, until someone edits the rules; ?interpreted=1 (or ?compiled=0) builds and casts with hazeljs, as before. Its
// inputs are rounded to six decimals, as the program's last line writes them, so both give the same chart.
(async () => {
  "use strict";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
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
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  // ---- (0.0.23; Matthew, 2026-11-19: "is the current time a factor in the chart, or just the current date?", then "Yes, add it",
  // and "if the app is left in a browser running, does it have a way to notice that the date and time have advanced from when it
  // was loaded originally?") Today's sky is a date and a time, in this browser's time zone. Until either is changed, both follow
  // the clock: kept up to the minute while the page is open (and when it is shown again), and read afresh at each cast; Now
  // goes back to following it. Before, the date was the day the page loaded and the time the clock's at the cast, unseen, so
  // a page left open past midnight cast yesterday's date at today's time.
  let followNow = true;
  const showNow = () => { const d = new Date(); $("tdate").value = ymd(d); $("ttime").value = hm(d); };
  const markNow = () => { $("tstate").textContent = followNow ? "now, following the clock" : ""; $("tnow").setAttribute("aria-pressed", String(followNow)); };
  const fixNow = d => { const t = new Date(d); $("tdate").value = ymd(t); $("ttime").value = hm(t); followNow = false; markNow(); };
  showNow(); markNow();
  // (not while either is being typed in)
  const keepUp = () => { if (followNow && !document.hidden && ![$("tdate"), $("ttime")].includes(document.activeElement)) showNow(); };
  setInterval(keepUp, 15000);
  document.addEventListener("visibilitychange", keepUp);
  for (const id of ["tdate", "ttime"]) $(id).addEventListener("input", () => { followNow = false; markNow(); });
  $("tnow").addEventListener("click", () => { followNow = true; showNow(); markNow(); });

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
    // today's sky: now, while following the clock, or the date and time chosen, in this browser's time zone
    if (followNow) showNow();
    const [ty, tmo, td] = ($("tdate").value || "").split("-").map(Number);
    if (!ty) throw new Error("a date for today's sky");
    if (!$("ttime").value) throw new Error("a time for today's sky");
    const [th, tmi] = $("ttime").value.split(":").map(Number);
    const day = new Date(ty, tmo - 1, td, th, tmi).getTime();
    const app = birth === APP_BIRTH && lat === CITIES[0][1] && lon === CITIES[0][2];
    const typed = { date: $("bdate").value, time: noTime ? "" : $("btime").value, city: $("city").value, lat, lon, zone };
    // (0.0.22) who: the saved chart's name, while the form is that chart's birth
    const c = selectedChart(), who = c && sameTyped(c.typed, typed) ? c.name : null;
    return { birth, lat, lon, zone, name, noTime, day, app, who, typed };
  }
  const tailOf = a => `Reading.reading(${momentLit(moment(a.birth))}, (latitude = ${num(a.lat)}, longitude = ${num(a.lon)}), ${momentLit(moment(a.day))})`;

  // ---- the form, filled from a birth as typed ({date, time, city, and lat, lon, zone for elsewhere}), and read back as typed
  function fillForm(t) {
    if (t.date) $("bdate").value = t.date;
    $("bnotime").checked = !t.time; $("btime").disabled = !t.time; if (t.time) $("btime").value = t.time;
    $("city").value = t.city != null ? String(t.city) : "0";
    if (t.city === ELSEWHERE) { $("lat").value = t.lat; $("lon").value = t.lon; if (zones.includes(t.zone)) $("zone").value = t.zone; }
    showElsewhere();
  }
  const typedNow = () => {
    const city = $("city").value, t = { date: $("bdate").value, time: $("bnotime").checked ? "" : $("btime").value, city };
    return city === ELSEWHERE ? { ...t, lat: Number($("lat").value), lon: Number($("lon").value), zone: $("zone").value } : t;
  };
  // the same birth: the same date, time and city, or the same latitude, longitude and zone elsewhere
  const sameTyped = (x, y) => !!x && !!y && x.date === y.date && (x.time || "") === (y.time || "") && String(x.city) === String(y.city) &&
    (x.city !== ELSEWHERE || (Number(x.lat) === Number(y.lat) && Number(x.lon) === Number(y.lon) && x.zone === y.zone));
  const APP_TYPED = { date: "2026-11-17", time: "11:03:51", city: "0" };

  // ---- (0.0.22; Matthew, 2026-11-18: "new feature -- multiple saved birth charts, with user-defined names", and "the one that's
  // the 'legacy' saved chart can be called 'default' at the start, when we load an old json file") Births saved under names, in
  // this browser only: saving one is asking to keep it, so it needs no "remember"; Delete forgets it. Each is {id, name, typed,
  // at}, in the order saved. The menu has this app's own birth first, then the saved charts, then a new birth, unsaved.
  const CHARTS_KEY = "hazeljs-oracles/astrology/charts";
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const charts = {
    ok: (() => { try { const k = CHARTS_KEY + ":probe"; localStorage.setItem(k, "1"); localStorage.removeItem(k); return true; } catch (e) { return false; } })(),
    list() { try { const v = JSON.parse(localStorage.getItem(CHARTS_KEY) || "[]"); return Array.isArray(v) ? v.filter(c => c && c.id && c.name && c.typed) : []; } catch (e) { return []; } },
    write(list) { try { localStorage.setItem(CHARTS_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } },
  };
  const NEW = "new", APP = "app";
  const selectedChart = () => { const v = $("saved").value; return charts.list().find(c => c.id === v) || null; };
  const cleanName = s => s.trim().replace(/\s+/g, " ").slice(0, 60);
  function fillSelect(value) {
    const list = charts.list(), s = $("saved"), v = value !== undefined ? value : s.value;
    const opt = (val, label) => { const o = el("option", "", label); o.value = val; return o; };
    const group = list.length ? Object.assign(el("optgroup"), { label: "Saved" }) : null;
    if (group) group.append(...list.map(c => opt(c.id, c.name)));
    s.replaceChildren(opt(APP, "This app's own birth"), ...(group ? [group] : []), opt(NEW, "A new birth (not saved)"));
    s.value = v === APP || list.some(c => c.id === v) ? v : NEW;
  }
  // what the form is to the chart chosen: saved, changed since, or a name not saved yet; Delete only for a saved chart
  let armed = 0;
  function disarm() { clearTimeout(armed); armed = 0; const d = $("cdelete"); d.classList.remove("armed"); d.textContent = "Delete"; }
  function markState(said) {
    const c = selectedChart(), st = $("cstate");
    $("cdelete").hidden = !c; if (!c) disarm();
    if (!charts.ok) {
      ["saved", "cname", "csave"].forEach(id => { $(id).disabled = true; });
      st.className = "muted cstate"; st.textContent = "This browser keeps nothing here (its storage is off for this page, as in a private window).";
      return;
    }
    const name = cleanName($("cname").value);
    $("csave").title = c ? `Save the form's birth, and the name, as the chart “${c.name}”` : "Save the form's birth under the name, in this browser";
    const changed = c && !sameTyped(c.typed, typedNow()), renamed = c && name && name !== c.name;
    st.className = "muted cstate" + (changed || renamed ? " changed" : "");
    st.textContent = said || (changed ? "changed since it was saved" : renamed ? "renamed, not saved yet" : "");
  }
  // the form remembered under KEY, while "remember" is ticked: the birth as typed, and which saved chart it was (or null)
  function remember(a) {
    try {
      if ($("remember").checked) localStorage.setItem(KEY, JSON.stringify({ ...a.typed, chart: selectedChart() ? $("saved").value : null }));
      else localStorage.removeItem(KEY);
    } catch (e) { /* no storage */ }
  }
  // ---- remembering the birth on this device, only when asked; a value with no `chart`, from 0.0.15 to 0.0.21, was the one birth
  // remembered, and it is saved as the chart "default" (or, if that very birth is saved already, that chart)
  {
    let r = null;
    try { r = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { /* no storage here: nothing remembered */ }
    if (r && typeof r !== "object") r = null;
    if (r && !("chart" in r)) {
      const list = charts.list();
      let c = list.find(x => sameTyped(x.typed, r));
      if (!c) {
        let name = "default", i = 2;
        while (list.some(x => x.name.toLowerCase() === name)) name = "default " + i++;
        const { date, time, city, lat, lon, zone } = r;
        c = { id: newId(), name, typed: { date, time, city, lat, lon, zone }, at: new Date().toISOString() };
        if (!charts.write([...list, c])) c = null;
      }
      if (c) { r = { ...r, chart: c.id }; try { localStorage.setItem(KEY, JSON.stringify(r)); } catch (e) { /* as it was */ } }
    }
    if (r) { $("remember").checked = true; fillForm(r); }
    showElsewhere();
    const start = r && r.chart && charts.list().find(c => c.id === r.chart);
    fillSelect(start ? start.id : !r || sameTyped(r, APP_TYPED) ? APP : NEW);
    $("cname").value = start ? start.name : "";
    markState();
  }
  $("remember").addEventListener("change", () => { if (!$("remember").checked) try { localStorage.removeItem(KEY); } catch (e) {} if (H) H.redraw(); });

  // choosing a chart casts it; choosing a new birth keeps the form as it is, to change and save under a new name
  $("saved").addEventListener("change", () => {
    disarm(); S.error = "";
    const c = selectedChart(), v = $("saved").value;
    if (c || v === APP) { fillForm(c ? c.typed : APP_TYPED); $("cname").value = c ? c.name : ""; markState(); cast(); return; }
    $("cname").value = ""; markState(); drawStatus(); $("cname").focus();
  });
  // an edit to the form: off this app's birth is a new birth; on a saved chart, it says the chart has changed
  const onFormEdit = e => {
    if (e.target === $("saved")) return;
    if ($("saved").value === APP && !sameTyped(typedNow(), APP_TYPED)) fillSelect(NEW);
    markState();
  };
  $("form").addEventListener("input", onFormEdit);
  $("form").addEventListener("change", onFormEdit);
  function saveChart() {
    disarm();
    const name = cleanName($("cname").value);
    if (!name) { S.error = "Please give the chart a name to save it."; drawStatus(); $("cname").focus(); return; }
    let a;
    try { a = asked(); } catch (e) { S.error = "Please give " + e.message + "."; drawStatus(); return; }
    const list = charts.list(), c = selectedChart();
    const clash = list.find(x => x.name.toLowerCase() === name.toLowerCase() && (!c || x.id !== c.id));
    if (clash) { S.error = `A chart named “${clash.name}” is saved already: choose it above to change it, or give this one another name.`; drawStatus(); $("cname").focus(); return; }
    const { date, time, city, lat, lon, zone } = a.typed;
    const typed = city === ELSEWHERE ? { date, time, city, lat, lon, zone } : { date, time, city };
    let id;
    if (c) { id = c.id; list[list.findIndex(x => x.id === id)] = { ...c, name, typed }; }
    else { id = newId(); list.push({ id, name, typed, at: new Date().toISOString() }); }
    if (!charts.write(list)) { S.error = "This browser would not save the chart (its storage is full, or off for this page)."; drawStatus(); return; }
    S.error = ""; drawStatus();
    fillSelect(id); $("cname").value = name;
    if ($("remember").checked) remember({ typed: a.typed });
    markState(c ? `✓ “${name}” saved` : `✓ saved as “${name}”`);
    // (the heading names the chart on show if it is this birth, and no longer names it if this chart was it before the change)
    if (S.result && S.asked && !S.past) {
      const who = sameTyped(S.asked.typed, a.typed) ? name : c && S.asked.who === c.name ? null : S.asked.who;
      if (who !== S.asked.who) { S.asked = { ...S.asked, who }; draw(); }
    }
  }
  $("csave").addEventListener("click", saveChart);
  $("cname").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); saveChart(); } });
  $("cdelete").addEventListener("click", () => {
    const c = selectedChart(), d = $("cdelete");
    if (!c) return;
    if (!armed) { d.classList.add("armed"); d.textContent = `Forget “${c.name}”?`; armed = setTimeout(disarm, 5000); return; }
    disarm();
    charts.write(charts.list().filter(x => x.id !== c.id));
    fillSelect(NEW); $("cname").value = "";
    if ($("remember").checked) try { const r = JSON.parse(localStorage.getItem(KEY) || "null"); if (r && r.chart === c.id) localStorage.setItem(KEY, JSON.stringify({ ...r, chart: null })); } catch (e) { /* as it was */ }
    markState(`“${c.name}” forgotten; the form keeps its birth`);
    if (S.asked && S.asked.who === c.name) { S.asked = { ...S.asked, who: null }; if (S.result) draw(); }
  });
  // (another tab saved or forgot a chart)
  addEventListener("storage", e => { if (e.key === CHARTS_KEY) { fillSelect(); markState(); } });

  // ---- the state: the reading asked for, and the last answer
  // (past: when a chart opened from the history was kept, or null; keep: this cast is a new chart, to keep if asked; pending:
  // a chart to cast once the compiled rules, or Hazel, arrive)
  const S = { asked: null, result: null, busy: false, libFailed: false, libAt: 0, error: "", compiled: null, compiledError: "", edited: false,
              past: null, keep: false, pending: null };
  // the compiled rules answer while they are loaded, have not failed, and the rules are as shipped
  const compiledReady = () => !!S.compiled && !S.edited && !S.compiledError;
  const compiledPending = () => COMPILED && !S.compiled && !S.compiledError && !S.edited;
  let L = null;
  // one reading: the program as the listings have it, with the birth and the day as its last line; the same text asks again for nothing
  let last = null;
  const six = x => Number(num(x));
  const momentIn = t => { const m = moment(t); return { ...m, hour: Number(m.hour.toFixed(6)) }; };
  function run(a) {
    if (compiledReady()) {
      const key = "compiled " + tailOf(a);
      if (last && last.key === key) return last;
      const t0 = performance.now();
      let v = null, threw = "";
      try { v = S.compiled.reading(momentIn(a.birth), { latitude: six(a.lat), longitude: six(a.lon) }, momentIn(a.day)); } catch (e) { threw = String(e && e.message || e); }
      last = { key, ok: !!(v && v.wheel), value: v, errors: [], threw, ms: performance.now() - t0, compiled: true };
      return last;
    }
    const sp = L.spec(PROGRAM, tailOf(a)), key = JSON.stringify(sp);
    if (last && last.key === key) return last;
    const t0 = performance.now();
    let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" && r.value.wheel ? r.value : null;
    last = { key, ok: !!r.ok && !!v, value: v, errors: r.errors || [], threw, ms: performance.now() - t0 };
    return last;
  }
  // the form's chart: a new one, kept in the history when "remember" is ticked
  async function cast() {
    if (S.busy) return;
    let a;
    try { a = asked(); } catch (e) { S.error = "Please give " + e.message + "."; drawStatus(); return; }
    S.error = ""; remember(a);
    if (S.past) { S.past = null; if (H) H.leave(); }
    S.keep = true;
    go(a);
  }
  // a chart, the form's or one from the history, cast and drawn (and kept, when cast() asks)
  async function go(a) {
    if (S.busy || !a) return;
    S.asked = a;
    if (compiledPending()) { S.pending = a; drawStatus(); return; }   // (cast when compiled.js arrives)
    if (compiledReady()) {
      S.result = run(a);
      if (S.result.ok) { draw(); keep(); return; }
      // (a compiled run that stops gives no chart: Hazel casts it instead, and the status says why)
      S.compiledError = "it stopped: " + (S.result.threw || "no reading"); S.result = null; last = null;
    }
    if (!window.Hazel) { S.pending = a; loadLib(); drawStatus(); return; }   // (cast when Hazel arrives)
    S.busy = true; drawStatus(); await painted();
    S.result = run(a);
    S.busy = false;
    draw(); keep();
  }
  const castPending = () => { const a = S.pending; S.pending = null; if (a) go(a); };

  // ---- drawing: the glyphs (glyphs.svg's symbols, put in the page once), the wheel, and the notes
  const GLYPH = { Aries: "aries", Taurus: "taurus", Gemini: "gemini", Cancer: "cancer", Leo: "leo", Virgo: "virgo", Libra: "libra", Scorpio: "scorpio", Sagittarius: "sagittarius", Capricorn: "capricorn", Aquarius: "aquarius", Pisces: "pisces" };
  // (0.0.19: k, the element's key for the hover's tooltip and the notes it lights; a transparent disc under the glyph is
  // what the pointer meets, as its strokes alone are hard to land on)
  const glyph = (id, x, y, size, cls, title, k) => {
    const g = sv("g", { class: cls, "aria-label": title || "" });
    if (k) { g.dataset.k = k; g.append(sv("circle", { cx: x, cy: y, r: size / 2, class: "hit" })); }
    g.append(sv("use", { href: "#" + id, x: x - size / 2, y: y - size / 2, width: size, height: size }));
    return g;
  };
  const SIGNS = Object.keys(GLYPH);
  const where = lon => { const l = ((lon % 360) + 360) % 360; return `${Math.floor(l % 30)}° ${SIGNS[Math.floor(l / 30)]}`; };
  const HARD = { Square: 1, Opposition: 1 };
  // (Matthew 2026-11-21: "can we label the houses by number and label?") what each house holds, as Reading.hz's house_word has it,
  // and the word each house's label on the wheel shows (the first of them)
  const HOUSE_HOLDS = ["the self, and how you meet the world", "money, things, and what you value", "talk, learning, siblings and short trips", "home, family and roots",
    "pleasure, romance, children and making things", "work, health and daily habits", "partners, close and contracted", "what is shared, debts, and deep change",
    "far travel, beliefs and higher learning", "career, standing and aims", "friends, groups and hopes", "what is hidden, rest and retreat"];
  const HOUSE_WORD = ["self", "money", "talk", "home", "pleasure", "work", "partners", "shared", "travel", "career", "friends", "hidden"];
  const HOUSE_R = 22.8;   // (just inside the birth's ring, at 27)
  function drawWheel(v) {
    const w = $("wheel"), c = (r, cls) => sv("circle", { cx: 50, cy: 50, r, class: cls });
    const line = (l, cls) => sv("line", { x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, class: cls });
    // a line with a wider, invisible twin for the pointer, under one key
    const keyed = (l, cls, k) => { const g = sv("g", {}); g.dataset.k = k; g.append(line(l, cls), line(l, "hit-line")); return g; };
    const lonOf = (ps, b) => (ps.find(p => p.body.tag === b) || {}).longitude;
    w.replaceChildren(
      ...v.wheel.signs.map(s => glyph(GLYPH[s.sign.tag], s.x, s.y, 5.4, "sign " + s.element.tag.toLowerCase(), `${s.sign.tag}, ${s.element.tag.toLowerCase()}`, "sign:" + s.sign.tag)),
      c(50, "ring"), c(41, "ring"), c(34.3, "ring faint"), c(27, "ring"),
      ...v.wheel.cusps.map((l, i) => keyed(l, "cusp", "cusp:" + i)),
      ...v.wheel.axes.map((l, i) => keyed(l, "axis", i === 0 ? "axis:asc" : "axis:mc")),
      // (the lines follow the birth's aspects in order, Wheel.hz's lines; a conjunction has none drawn)
      ...v.wheel.lines.map((l, i) => l.kind.tag === "Conjunction" ? null : keyed(l, "aspect " + (HARD[l.kind.tag] ? "hard" : "soft"), "aspect:" + i)).filter(Boolean),
      ...v.wheel.marks.map(m => {
        const ps = m.ring === 0 ? v.natal : v.today, lon = lonOf(ps, m.body.tag);
        return glyph(m.body.tag.toLowerCase(), m.x, m.y, m.ring === 0 ? 5.6 : 4.8, m.ring === 0 ? "body natal" : "body today",
          `${m.ring === 0 ? "At birth" : "Today"}: ${m.body.tag}, ${where(lon)}`, (m.ring === 0 ? "natal:" : "today:") + m.body.tag);
      }),
    );
    // the axes' names, outside the wheel: Asc at the ascendant's end, MC at the midheaven's
    const label = (x, y, s) => { const t = sv("text", { x, y, class: "axis-name", "text-anchor": "middle", "dominant-baseline": "middle" }); t.textContent = s; return t; };
    const out = (l, k) => ({ x: 50 + (l.x1 - 50) * k, y: 50 + (l.y1 - 50) * k });
    const a = out(v.wheel.axes[0], 1.1), m = out(v.wheel.axes[1], 1.1);
    w.append(label(a.x, a.y, "Asc"), label(m.x, m.y, "MC"));
    // each house (whole-sign: a sign each, counted from the rising sign): its number and its word, in line with its sign, just
    // inside the birth's ring, on a halo over the aspect lines; hovered, what it holds, and its notes lit
    const ascSign = Math.floor((((v.chart.ascendant % 360) + 360) % 360) / 30);
    for (const s of v.wheel.signs) {
      const h = ((SIGNS.indexOf(s.sign.tag) - ascSign + 12) % 12) + 1, ang = Math.atan2(s.y - 50, s.x - 50);
      const x = 50 + HOUSE_R * Math.cos(ang), y = 50 + HOUSE_R * Math.sin(ang);
      const t = (dy, cls, str) => { const e = sv("text", { x, y: y + dy, class: cls, "text-anchor": "middle", "dominant-baseline": "middle" }); e.textContent = str; return e; };
      const g = sv("g", { class: "house", "aria-label": `${ord(h)} house: ${HOUSE_WORD[h - 1]}` }); g.dataset.k = "house:" + h;
      g.append(sv("circle", { cx: x, cy: y, r: 3.2, class: "hit" }), t(-1.3, "house-num", String(h)), t(1.5, "house-word", HOUSE_WORD[h - 1]));
      w.append(g);
    }
  }
  // (0.0.23) today's sky, with its time: "November 19, 2026 at 9:14 AM"
  const fmtDay = t => new Date(t).toLocaleString(undefined, { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

  // ---- (0.0.20; Matthew, 2026-11-18: "In FS mode for the chart, let's have a toggle for the birth information that moves it to
  // the top of the LHS column, so we can see text for birth chart and today's chart side by side as we hover over the center
  // chart") In full screen, the toggle puts away the form, so the birth itself (the heading, and when and where) is at the top
  // of the left column, with the birth's notes under it; today's stay on the right. Kept in this browser, as a convenience.
  const SPLIT_KEY = "hazeljs-oracles/astrology/split";
  let split = (() => { try { return localStorage.getItem(SPLIT_KEY) === "1"; } catch (e) { return false; } })();
  const splitNow = () => split && document.documentElement.classList.contains("oracle-fs");
  function placeNotes() {
    const birth = document.querySelector(".note-group.birth");
    document.documentElement.classList.toggle("astro-split", splitNow());
    const t = $("split-toggle");
    t.setAttribute("aria-pressed", String(split));
    t.textContent = split ? "◨ Show the form, the notes together" : "◧ Birth and today side by side";
    if (!birth) return;
    if (splitNow()) { if (birth.parentNode !== $("notes-birth")) $("notes-birth").append(birth); }
    else if (birth.parentNode !== $("notes")) $("notes").prepend(birth);
  }
  $("split-toggle").addEventListener("click", () => {
    split = !split;
    try { localStorage.setItem(SPLIT_KEY, split ? "1" : "0"); } catch (e) { /* this visit only */ }
    placeNotes();
  });
  // (entering or leaving full screen: shared/fullscreen.js sends a resize)
  addEventListener("resize", () => setTimeout(placeNotes, 0));

  // ---- (0.0.19; Matthew, 2026-11-18: "when the user hovers over different SVG elements of the chart, there's a tooltip that
  // explains that element of the chart, and also highlights any relevant parts of the RHS (text part of the reading)") What
  // each element of the wheel is, in words from the reading where it has them (a note's own first sentence, a sign's or a
  // house's sentence), and the keys of the notes it lights
  const ord = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
  // (Reading.hz's verb and kind_word, for an aspect at birth)
  const ASPECT_WORDS = { Conjunction: ["conjunct", "join with"], Sextile: ["sextile", "open a way for"], Square: ["square", "press on"],
    Trine: ["trine", "flow easily with"], Opposition: ["opposite", "pull against"] };
  const firstSentence = t => (t.match(/^[^.]*\./) || [t])[0];
  // (0.0.21) the constellation each sign is named for, as the IAU names it
  const CONSTELLATION = { Scorpio: "Scorpius", Capricorn: "Capricornus" };
  // a sign's constellation, drawn from the page's constellations.svg, sized by the figure's own proportions
  function figureOf(f) {
    const sym = document.getElementById(f.id);
    if (!sym) return null;
    const [, , w, h] = (sym.getAttribute("viewBox") || "0 0 100 80").split(/\s+/).map(Number);
    const k = Math.min(112 / h, 236 / w);
    const svg = sv("svg", { class: "tip-con " + f.cls, width: Math.round(w * k), height: Math.round(h * k), "aria-hidden": "true" });
    svg.append(sv("use", { href: "#" + f.id, width: "100%", height: "100%" }));
    const box = el("span", "tip-figure");
    box.append(svg, el("span", "tip-cap", `The stars of ${f.name}, the constellation the sign is named for. Precession has since moved the sign about one constellation west of them.`));
    return box;
  }
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  function explain(k, v) {
    const texts = [...v.notes, ...v.today_notes];
    const sentence = re => { for (const n of texts) { const m = n.text.match(re); if (m) return m[0]; } return ""; };
    const ascSign = Math.floor((((v.chart.ascendant % 360) + 360) % 360) / 30);
    const houseOf = signIndex => ((signIndex - ascSign + 12) % 12) + 1;
    const lon = (ps, b) => (ps.find(p => p.body.tag === b) || {}).longitude;
    const [kind, a, b] = k.split(":");
    if (kind === "sign") {
      const i = SIGNS.indexOf(a), elem = (v.wheel.signs.find(s => s.sign.tag === a) || { element: { tag: "" } }).element.tag.toLowerCase();
      return { title: a, text: (sentence(new RegExp(a + " is the [^.]*\\.")) || `${a}, ${/^[aeiou]/.test(elem) ? "an" : "a"} ${elem} sign.`) +
        ` Its 30° run from ${i * 30}° to ${i * 30 + 30}° along the zodiac; with whole-sign houses, it is your ${ord(houseOf(i))} house.`, lights: ["sign:" + a],
        figure: { id: "con-" + a.toLowerCase(), cls: "sign " + elem, name: CONSTELLATION[a] || a } };
    }
    if (kind === "natal") {
      const n = v.notes.find(n => n.head.startsWith(a + " in "));
      return { title: "At birth: " + (n ? n.head : `${a}, ${where(lon(v.natal, a))}`), text: n ? firstSentence(n.text) : "", lights: ["natal:" + a] };
    }
    if (kind === "today") {
      const ns = v.today_notes.filter(n => n.head.startsWith("Today's " + a));
      return { title: `Today: ${a}, ${where(lon(v.today, a))}`,
        text: ns.length ? cap(ns.map(n => n.head.replace("Today's " + a + ", ", "").replace("Today's " + a + " ", "")).join("; ")) + "." : "Not among today's closest aspects to your chart.", lights: ["today:" + a] };
    }
    if (kind === "aspect") {
      const x = v.aspects[Number(a)]; if (!x) return null;
      const [word, verb] = ASPECT_WORDS[x.kind.tag];
      return { title: `At birth: ${x.a.tag} ${word} ${x.b.tag}`, text: `${x.orb.toFixed(1)}° from exact. ${x.a.tag} and ${x.b.tag} ${verb} each other.`,
        lights: ["natal:" + x.a.tag, "natal:" + x.b.tag] };
    }
    if (kind === "cusp") {
      const i = Number(a), h = houseOf(i);
      return { title: `The start of ${SIGNS[i]}, and of your ${ord(h)} house`,
        text: sentence(new RegExp("The " + ord(h) + " house holds [^.]*\\.")) || "With whole-sign houses, each sign is a house, counted from the rising sign.", lights: ["house:" + h] };
    }
    if (kind === "house") {   // (a house's label: what it holds, in the reading's words where a note has them)
      const h = Number(a), i = (ascSign + h - 1) % 12;
      return { title: `Your ${ord(h)} house: ${SIGNS[i]}`, text: sentence(new RegExp("The " + ord(h) + " house holds [^.]*\\.")) || `The ${ord(h)} house holds ${HOUSE_HOLDS[h - 1]}.`,
        lights: ["house:" + h] };
    }
    if (kind === "axis" && a === "asc") return { title: `The ascendant: ${where(v.chart.ascendant)}`,
      text: "The degree of the zodiac rising in the east at the moment of birth. Its sign is the rising sign, and your 1st house.", lights: ["axis:asc"] };
    if (kind === "axis" && a === "mc") return { title: `The midheaven: ${where(v.chart.midheaven)}`,
      text: "The degree of the zodiac highest in the sky at the moment of birth, on the meridian.", lights: [] };
    return null;
  }
  const tip = el("div", "wheel-tip"); tip.hidden = true; tip.setAttribute("role", "tooltip");
  $("wheel-fig").append(tip);
  let hot = null;
  function light(k) {
    if (hot === k) return;
    hot = k;
    fromNotes = null;
    document.querySelectorAll("#wheel .transit-line").forEach(e => e.remove());
    document.querySelectorAll("#wheel .hot").forEach(e => e.classList.remove("hot"));
    document.querySelectorAll(".notes .note.lit").forEach(e => e.classList.remove("lit"));
    const v = S.result && S.result.ok ? S.result.value : null;
    const x = k && v ? explain(k, v) : null;
    if (!x) { tip.hidden = true; return; }
    const g = document.querySelector(`#wheel [data-k="${k}"]`); if (g) g.classList.add("hot");
    const fig = x.figure ? figureOf(x.figure) : null;
    tip.replaceChildren(el("b", "", x.title), ...(fig ? [fig] : []), el("span", "", x.text));
    tip.hidden = false;
    const lit = [...document.querySelectorAll(".notes .note")].filter(p => x.lights.some(r => (p.dataset.refs || "").split(" ").includes(r)));
    lit.forEach(p => p.classList.add("lit"));
    // (in full screen each column scrolls on its own: bring each column's first lit note into its view, without moving the page)
    if (document.documentElement.classList.contains("oracle-fs")) {
      const seen = new Set();
      for (const p of lit) {
        const box = p.closest("#notes, .fs-left");
        if (!box || seen.has(box)) continue;
        seen.add(box);
        const br = box.getBoundingClientRect(), pr = p.getBoundingClientRect();
        if (pr.top < br.top || pr.bottom > br.bottom) box.scrollBy({ top: pr.top - br.top - 24, behavior: "smooth" });
      }
    }
  }
  function placeTip(e) {
    const f = $("wheel-fig").getBoundingClientRect();
    let x = e.clientX - f.left + 14, y = e.clientY - f.top + 14;
    if (x + tip.offsetWidth > f.width) x = Math.max(0, e.clientX - f.left - tip.offsetWidth - 14);
    if (y + tip.offsetHeight > f.height) y = Math.max(0, e.clientY - f.top - tip.offsetHeight - 14);
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  const onWheel = e => { const g = e.target.closest && e.target.closest("[data-k]"); light(g ? g.dataset.k : null); if (g) placeTip(e); };
  $("wheel").addEventListener("pointermove", onWheel);
  $("wheel").addEventListener("pointerdown", onWheel);
  $("wheel").addEventListener("pointerleave", () => light(null));

  // ---- (0.0.20; Matthew, 2026-11-18: "when we hover over the symbols or entries in the RHS text for "today", please highlight
  // the related elements of the center chart") The other way: a note lights what it is about on the wheel (its bodies, its
  // signs, the line where its house begins, the horizon for the rising sign), and a note on today's sky draws the aspect it
  // names, a dashed line from today's body to the birth's; a glyph in a note's heading lights only what it stands for
  let fromNotes = null;
  function wheelKeysOf(refs, v) {
    const ascSign = Math.floor((((v.chart.ascendant % 360) + 360) % 360) / 30);
    return refs.flatMap(r => { const [k, a] = r.split(":"); return k === "house" ? ["cusp:" + ((ascSign + Number(a) - 1) % 12), r] : [r]; });   // (a house: the line where it begins, and its label)
  }
  function lightFromNotes(key, p) {
    const id = key ? key + (p ? "@" + p.dataset.refs : "") : p ? "note:" + p.dataset.refs + ":" + p.textContent.length : null;
    if (id === fromNotes) return;
    fromNotes = id; hot = null; tip.hidden = true;
    document.querySelectorAll("#wheel .hot").forEach(e => e.classList.remove("hot"));
    document.querySelectorAll("#wheel .transit-line").forEach(e => e.remove());
    document.querySelectorAll(".notes .note.lit").forEach(e => e.classList.remove("lit"));
    const v = S.result && S.result.ok ? S.result.value : null;
    if (!v || !id) return;
    const refs = key ? [key] : (p.dataset.refs || "").split(" ").filter(Boolean);
    for (const k of wheelKeysOf(refs, v)) document.querySelectorAll(`#wheel [data-k="${k}"]`).forEach(e => e.classList.add("hot"));
    if (p) p.classList.add("lit");
    const t = !key && refs.find(r => r.startsWith("today:")), n = !key && refs.find(r => r.startsWith("natal:"));
    if (t && n) {
      const at = (ring, b) => v.wheel.marks.find(m => m.ring === ring && m.body.tag === b);
      const a = at(1, t.slice(6)), b = at(0, n.slice(6));
      if (a && b) $("wheel").insertBefore(sv("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "transit-line" }), $("wheel").querySelector('[data-k^="natal:"], [data-k^="today:"]'));
    }
  }
  for (const box of [$("notes"), $("notes-birth")]) {
    box.addEventListener("pointermove", e => { const g = e.target.closest(".note-glyph[data-k]"), p = e.target.closest(".note"); lightFromNotes(g ? g.dataset.k : null, p); });
    box.addEventListener("pointerleave", () => lightFromNotes(null, null));
  }
  // (0.0.18; Matthew, 2026-11-18: "RHS uses symbols that resemble the ones in the center chart where appropriate", and "I'd
  // prefer to reverse the emphasis, and have it on the text that isn't the form/template of the RHS") A note's heading, the
  // chart's facts in the reading's fixed form, is quiet, with the wheel's own glyphs beside its signs, bodies and aspects,
  // colored as the wheel colors them (a sign by its element; a body at birth in ink, today's in the accent; an aspect soft
  // or hard); its words, the reading itself, carry the emphasis.
  const BODY_NAMES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const ASPECT = { conjunct: ["conjunction", ""], sextile: ["sextile", "soft"], square: ["square", "hard"], trine: ["trine", "soft"], opposite: ["opposition", "hard"] };
  const inlineGlyph = (id, cls, title, k) => {
    const s = sv("svg", { class: "note-glyph " + cls, "aria-hidden": "true" });
    if (k) s.dataset.k = k;
    if (title) { const t = sv("title", {}); t.textContent = title; s.append(t); }
    s.append(sv("use", { href: "#" + id, width: "100%", height: "100%" }));
    return s;
  };
  function headOf(text, elementOf) {
    const h = el("span", "note-head");
    const parts = text.split(/\b(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces|Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|conjunct|sextile|square|trine|opposite)\b/);
    parts.forEach((p, i) => {
      if (i % 2 === 0) { if (p) h.append(p); return; }
      const before = parts[i - 1] || "";
      if (GLYPH[p]) h.append(inlineGlyph(GLYPH[p], "sign " + (elementOf[p] || "").toLowerCase(), p, "sign:" + p));
      else if (BODY_NAMES.includes(p)) {
        const today = /Today's\s*$/.test(before);
        h.append(inlineGlyph(p.toLowerCase(), today ? "body today" : "body natal", p, (today ? "today:" : "natal:") + p));
      }
      else if (ASPECT[p]) h.append(inlineGlyph(ASPECT[p][0], "aspect " + ASPECT[p][1], p));
      h.append(p);
    });
    return h;
  }
  // (0.0.19) what a note is about, as the keys the wheel's elements light: a body at birth or today, a sign, a house, the rising sign
  function refsOf(head) {
    const refs = [];
    const parts = head.split(/\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\b/);
    for (let i = 1; i < parts.length; i += 2) refs.push((/Today's\s*$/.test(parts[i - 1]) ? "today:" : "natal:") + parts[i]);
    if (/back where it was at your birth/.test(head)) refs.push("natal:" + parts[1]);
    for (const sg of SIGNS) if (new RegExp("\\b" + sg + "\\b").test(head)) refs.push("sign:" + sg);
    const h = head.match(/(\d+)(?:st|nd|rd|th) house/); if (h) refs.push("house:" + h[1]);
    if (/^Rising\b/.test(head)) refs.push("axis:asc", "house:1");
    return refs;
  }
  function notes(head, ns, elementOf, which) {
    const s = el("section", "note-group " + which);
    s.append(el("h3", "", head), ...ns.map(n => { const p = el("p", "note"); p.dataset.refs = refsOf(n.head).join(" "); p.append(headOf(n.head, elementOf), el("span", "note-text", n.text)); return p; }));
    return s;
  }
  function draw() {
    const r = S.result, a = S.asked;
    $("wheel-fig").hidden = !(r && r.ok);
    if (r && r.ok && a) {
      const v = r.value;
      const h = $("reading-head");
      h.className = "reading-head" + (S.past ? " past" : "");
      h.replaceChildren(S.past ? `A chart from ${S.past}` : a.who ? `A birth chart: ${a.who}` : a.app ? "This app's own birth chart" : "A birth chart");
      if (S.past) {
        const b = el("button", "", "New chart"); b.type = "button"; b.title = "Cast the birth in the form again, with today's sky";
        b.addEventListener("click", () => { followNow = true; showNow(); markNow(); cast(); });
        h.append(b);
      }
      const local = new Date(a.birth).toLocaleString(undefined, { timeZone: a.zone, year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
      $("reading-q").textContent = `${S.past && a.who ? a.who + ", born" : "Born"} ${a.noTime ? new Date(a.birth).toLocaleDateString(undefined, { timeZone: a.zone, year: "numeric", month: "long", day: "numeric" }) + ", time not known (noon)" : local} ${a.name}; today's sky on ${fmtDay(a.day)}.`;
      hot = null; tip.hidden = true;
      drawWheel(v);
      const n = $("notes");
      const elementOf = Object.fromEntries(v.wheel.signs.map(s => [s.sign.tag, s.element.tag]));
      $("notes-birth").replaceChildren();
      n.replaceChildren(notes("At birth", v.notes, elementOf, "birth"), notes(`Today, ${fmtDay(a.day)}`, v.today_notes, elementOf, "today"));
      if (a.noTime) n.prepend(el("p", "muted", "With no time of birth, the rising sign and the houses are a guess (noon), and so is the Moon's degree."));
      n.append(el("p", "muted reading-foot", `${r.compiled ? `Cast by compiled Hazel in ${fmtMs(r.ms)}` : `Cast by Hazel in ${(r.ms / 1000).toFixed(1)} s`}: ${v.aspects.length} aspects at birth, ${v.transits.length} from today's sky (the closest six above).`));
    } else { $("notes").replaceChildren(); $("notes-birth").replaceChildren(); }
    placeNotes();
    drawStatus();
    if (window.OracleFs) window.OracleFs.empty(!(r && r.ok));
  }
  const fmtMs = ms => ms < 1 ? "under a millisecond" : `${ms.toFixed(0)} ms`;
  function drawStatus() {
    const st = $("status"), r = S.result;
    if (S.error) { st.className = "status no"; st.textContent = S.error; return; }
    if (compiledPending()) { st.className = "status wait"; st.textContent = "⏳ Loading the rules, compiled ahead of time to JavaScript (compiled.js)" + (S.asked ? "; the chart is cast when they arrive." : "."); return; }
    if (compiledReady()) {
      st.className = "status ok";
      st.textContent = r && r.ok && r.compiled
        ? `✓ Cast by compiled Hazel in ${fmtMs(r.ms)}: the rules run as JavaScript, compiled ahead of time by hazel-jit (${S.compiled.made}), without loading Hazel's library or building the program. Hazel loads if you edit the rules.`
        : `✓ The rules are compiled and ready (hazel-jit, ${S.compiled.made}). Cast the chart.`;
      return;
    }
    const why = COMPILED && S.compiledError ? `Compiled mode was asked for, but compiled.js did not run (${S.compiledError}), so Hazel interprets the rules instead. `
      : COMPILED && S.edited ? "The rules were edited, so Hazel interprets them. " : "";
    if (!window.Hazel) { st.className = S.libFailed ? "status no" : "status wait"; st.textContent = why + (S.libFailed ? "Hazel did not load from jsDelivr, and this page has no other way to cast." : "⏳ Loading Hazel (hazeljs from jsDelivr, about 650 kB)" + (S.asked ? "; the chart is cast when it arrives." : ".")); return; }
    if (S.busy) { st.className = "status wait"; st.textContent = "⏳ Hazel is building the program and casting the chart (a few seconds; longer on a phone)…"; return; }
    if (!r) { st.className = "status ok"; st.textContent = "✓ Hazel is ready. Cast the chart."; return; }
    if (r.ok) { st.className = "status ok"; st.textContent = why + `✓ Built and cast by Hazel in ${(r.ms / 1000).toFixed(1)} s.`; return; }
    st.className = "status no";
    st.textContent = "The program did not cast the chart: " + (r.threw || (r.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "it has a hole, or its answer is not a reading.");
  }

  // ---- the history (shared/history.js; 0.0.17, Matthew, 2026-11-18: "Yes, opt-in only"): a chart is kept only while "remember
  // these on this device" is ticked, as the birth in the form is, since a birth is personal; opening one casts that very chart
  // again (its birth, place and day as they were), and it can carry notes and an emoji like the other oracles' readings
  const signOf = lon => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];
  const H = window.OracleHistory && $("history") ? window.OracleHistory.panel({
    holder: $("history"), key: "hazeljs-oracles/astrology/history", noun: ["chart", "charts"],
    empty: () => $("remember").checked ? "The charts you cast are kept here, in this browser only, newest first."
      : "Tick “remember these on this device” above, and the charts you cast are kept here, in this browser only, newest first, to come back to with notes. Nothing is kept unless you ask.",
    foot: () => $("remember").checked ? null : "New charts are not kept while “remember these on this device” is not ticked; unticking it forgets the form, not these.",
    summarize: r => {
      const o = { timeZone: r.zone, year: "numeric", month: "short", day: "numeric" };
      const born = new Date(r.birth).toLocaleString(undefined, r.noTime ? o : { ...o, hour: "numeric", minute: "2-digit" });
      return `${r.who ? r.who + " · " : ""}Born ${born} ${r.name} · Sun in ${r.sun}, Moon in ${r.moon}${r.noTime ? "" : `, ${r.rising} rising`} · the sky of ${fmtDay(r.day)}`;
    },
    open: (r, when) => {
      const t = r.typed || {};
      fillForm(t);
      // (0.0.22) the menu on the saved chart of this birth, the one of its name first, if one is saved
      const list = charts.list(), c = list.find(x => x.name === r.who && sameTyped(x.typed, t)) || list.find(x => sameTyped(x.typed, t));
      fillSelect(c ? c.id : sameTyped(t, APP_TYPED) ? APP : NEW); $("cname").value = c ? c.name : ""; disarm(); markState();
      fixNow(r.day);
      S.past = when; S.keep = false; S.error = "";
      go({ birth: r.birth, lat: r.lat, lon: r.lon, zone: r.zone, name: r.name, noTime: r.noTime, day: r.day, app: r.app, who: r.who || null, typed: r.typed });
      $("reading-head").scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
  }) : null;
  function keep() {
    const r = S.result, a = S.asked;
    if (!S.keep || !H || !r || !r.ok || !a) return;
    S.keep = false;
    if (!$("remember").checked) return;
    const key = tailOf(a), newest = H.list()[0];
    if (newest && newest.key === key) return;   // (the same chart cast again)
    const v = r.value, at = b => (v.natal.find(p => p.body.tag === b) || {}).longitude;
    H.add({ key, birth: a.birth, day: a.day, lat: a.lat, lon: a.lon, zone: a.zone, name: a.name, noTime: a.noTime, app: a.app, who: a.who, typed: a.typed,
            sun: signOf(at("Sun")), moon: signOf(at("Moon")), rising: signOf(v.chart.ascendant) });
  }

  // ---- start: the glyphs, the program's text into the listings, the editors, then Hazel
  let timer = 0;
  try {
    const [glyphs, cons, pre, ...mods] = await Promise.all([text("glyphs.svg"), text("constellations.svg").catch(() => ""), text("rules/preamble.hz"), ...MODULES.map(m => text(`rules/${m}.hz`))]);
    // (0.0.21) the zodiac's constellations, for a sign's tooltip (tools/make-constellations.mjs); none, and the tooltip has words only
    if (cons) document.body.insertAdjacentHTML("afterbegin", cons.replace(/<\?xml[^>]*>/, "").replace('style="display:none"', 'aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"'));
    document.body.insertAdjacentHTML("afterbegin", glyphs.replace(/<\?xml[^>]*>/, "").replace('style="display:none"', 'aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"'));
    document.querySelector(`pre.hazel[data-program="${PROGRAM}"]:not([data-module])`).textContent = pre;
    MODULES.forEach((m, i) => { document.querySelector(`pre.hazel[data-module="${m}"]`).textContent = mods[i]; });
    window.HazelListingsOptions = { start: "request" };
    await load("../shared/hazel-listings.js?v=0.0.24");
    L = window.HazelListings;
    L.tail(PROGRAM, LISTING_TAIL);
    // an edit casts the chart again, once the typing stops
    L.onChange(PROGRAM, () => { S.edited = true; if (!window.Hazel) loadLib(); clearTimeout(timer); timer = setTimeout(() => { if (S.result && S.asked) go(S.asked); }, 600); });
  } catch (e) {
    $("status").className = "status no";
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("form").addEventListener("submit", e => { e.preventDefault(); cast(); });
  // (0.0.24) in full screen with no chart, one button casts it: the birth the form holds, against today's sky
  if (window.OracleFs) window.OracleFs.offer({ label: "✶ Cast the chart", title: "Casts the chart of the birth in the form, against today's sky", cast: () => $("cast").click() });
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });
  document.body.classList.add("js");
  draw();
  // ---- ⚙️ Advanced (../shared/advanced.js): the version and its notes, and 🧪 this device's speed: three charts cast in Hazel
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Astrology", built: () => last && { ok: last.ok, ms: last.ms }, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null, compiled: compiledReady() }),
    about: "three charts cast (compiled, or built and cast by Hazel, as the page runs; the same three births on every device) and ten drawings of the wheel",
    work: async say => {
      const { stats, painted } = window.OracleAdvanced;
      if (!compiledReady() && (!window.Hazel || !L)) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      const how = compiledReady() ? "cast by compiled Hazel" : "built and cast by Hazel";
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
      return { data: { cast: c, draw: d, compiled: compiledReady() }, text: [`a chart ${how} ${c.median} ms (worst ${c.worst})`, `drawing the chart, to the next frame: ${d.median} ms`] };
    },
  });
  // (0.0.16) the switch, under ⚙️ Advanced: compiled ahead of time, or interpreted as before
  { const box = $("advanced") && $("advanced").querySelector("details.advanced");
    if (box) {
      const u = new URL(location.href); u.searchParams.delete("compiled"); if (COMPILED) u.searchParams.set("interpreted", "1"); else u.searchParams.delete("interpreted");
      const p = el("p", "advanced-version", COMPILED ? "⚡ This page casts with its rules compiled ahead of time to JavaScript, without loading Hazel (until you edit them). " : "⚡ This page builds and casts its rules with hazeljs, as before compiling. ");
      const a = el("a", "", COMPILED ? "Open it interpreted" : "Open it compiled"); a.href = u.href;
      p.append(a); box.querySelector(".advanced-version").after(p);
    } }
  let libAsked = false;
  function loadLib() {
    if (libAsked) return; libAsked = true;
    const s = document.createElement("script");
    s.src = LIB; s.async = true;
    s.onload = () => { S.libAt = performance.now(); drawStatus(); castPending(); };
    s.onerror = () => { S.libFailed = true; drawStatus(); };
    document.head.append(s);
  }
  if (!COMPILED) loadLib();
  else {
    addEventListener("error", e => { if (/compiled\.js/.test(e.filename || "")) S.compiledError = String(e.message || e.error || "an error"); });
    const c = document.createElement("script");
    c.src = "compiled.js?v=0.0.16"; c.async = true;
    c.onload = () => {
      const v = window.AstrologyCompiled;
      if (v && !S.compiledError) { S.compiled = v; S.libAt = performance.now(); drawStatus(); castPending(); }
      else { S.compiledError = S.compiledError || "it ran, but gave no rules"; drawStatus(); loadLib(); }
    };
    c.onerror = () => { S.compiledError = "it did not load"; drawStatus(); loadLib(); };
    document.head.append(c);
  }
})();
