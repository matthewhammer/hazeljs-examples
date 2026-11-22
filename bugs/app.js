// hazeljs-examples, Butterfly garden (ticket 828; Bug run, Matthew, 2026-11-22: "Next: space invaders clone, centipede clone, dig
// dug clone", "all with hazel rules and hazel AI that plays the game"; reimagined in 0.0.61: "let's reimagine 'bug run' into a
// more positive theme somehow", and he chose the butterfly garden). The page: the garden drawn on a canvas, every frame a step
// of Hazel's rules (Bugs.step: your watering can and its drop of nectar, the caterpillars winding down through the buds, a
// caterpillar fed curling into a cocoon, a butterfly out opening the nearest bud; the garden in full bloom), and 🤖 Hazel
// plays for you, the robot in Hazel (Bugs.robot) choosing each step's move and drop. The rules compiled ahead of time by
// hazel-jit (compiled.js) when it is here, else, and once they are edited, run by hazeljs (slower).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "bugs", MODULES = ["Bugs"];
  const TAIL = "(start = Bugs.start, step = Bugs.step, robot = Bugs.robot)";
  const KEY = "hazeljs-examples/bugs/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: the rules, the game (a Hazel value: the garden 600 by 800), what is held, where a finger points, words
  // floating up, the butterflies in flight, petals bursting, the buds a butterfly is on its way to, the best score
  const S = { built: null, libAt: 0, libFailed: false, compiledError: "", game: null, best: kept("best", 0),
              held: { left: false, right: false, up: false, down: false }, aimX: null, aimY: null, fire: false, pops: [], stepMs: [], restartAt: 0, banner: null,
              flies: [], bursts: [], arriving: new Map(), sparks: [] };
  const H = () => S.built && S.built.ok ? S.built.value : null;

  // ---- drawing: the lawn, its grass and daisies, the path at the foot where your can goes; the buds, opening a little with each
  // drop, and the flowers (five colours, by their place); the cocoons, wobbling as they ripen; the caterpillars (a round body
  // with feet, spots, and at the head big eyes, a smile and antennae); the butterflies flying from a cocoon to the bud they open,
  // then away; your watering can and its drop of nectar
  const cv = $("field"), ctx = cv.getContext("2d");
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, Math.round(r.width * d)), h = Math.round(w * 4 / 3);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  const hash = (a, b) => { let x = (a * 374761393 + b * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177 | 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  const PETALS = ["#f472b6", "#facc15", "#a78bfa", "#fb923c", "#f8fafc", "#60a5fa"];
  const petalOf = (c, r) => PETALS[Math.floor(hash(c, r) * PETALS.length)];
  function flower(c, x, y, k, col, open, now) {   // (open 0, a bud, to 1, a flower)
    if (open < 1) {   // (the bud: a green cup, its petals' colour showing more as it opens)
      c.fillStyle = "#15803d"; c.beginPath(); c.moveTo(x, y + 9 * k); c.quadraticCurveTo(x - 9 * k, y + 2 * k, x - 6 * k, y - 4 * k); c.lineTo(x + 6 * k, y - 4 * k); c.quadraticCurveTo(x + 9 * k, y + 2 * k, x, y + 9 * k); c.fill();
      const h2 = 4 + 8 * open; c.fillStyle = col; c.beginPath(); c.ellipse(x, y - 4 * k, (4 + 4 * open) * k, h2 * k, 0, Math.PI, 0); c.fill();
      c.fillStyle = "#22c55e"; c.beginPath(); c.ellipse(x - 5 * k, y, 3 * k, 6 * k, -0.6, 0, 7); c.ellipse(x + 5 * k, y, 3 * k, 6 * k, 0.6, 0, 7); c.fill();
      return;
    }
    const sway = Math.sin(now / 900 + x) * 0.08;
    c.save(); c.translate(x, y); c.rotate(sway); c.fillStyle = col;
    for (let i = 0; i < 5; i++) { const a = i * 1.2566; c.beginPath(); c.ellipse(Math.cos(a) * 6.5 * k, Math.sin(a) * 6.5 * k, 6 * k, 4 * k, a, 0, 7); c.fill(); }
    c.fillStyle = "#facc15"; c.beginPath(); c.arc(0, 0, 4 * k, 0, 7); c.fill(); c.fillStyle = "#ca8a04"; c.beginPath(); c.arc(1 * k, 1 * k, 1.6 * k, 0, 7); c.fill();
    c.restore();
  }
  function butterfly(c, x, y, k, flap, col) {
    const wv = 0.35 + 0.65 * Math.abs(Math.sin(flap));
    c.fillStyle = col;
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(x + s * 6 * k * wv, y - 3 * k, 7 * k * wv, 6 * k, s * 0.4, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + s * 5 * k * wv, y + 4 * k, 5 * k * wv, 4 * k, -s * 0.4, 0, 7); c.fill(); }
    c.fillStyle = "rgba(255, 255, 255, 0.55)"; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * 6 * k * wv, y - 4 * k, 2 * k * wv, 0, 7); c.fill(); }
    c.fillStyle = "#3f2a14"; c.beginPath(); c.ellipse(x, y, 1.8 * k, 7 * k, 0, 0, 7); c.fill();
    c.strokeStyle = "#3f2a14"; c.lineWidth = 1 * k; c.beginPath(); c.moveTo(x, y - 6 * k); c.lineTo(x - 3 * k, y - 11 * k); c.moveTo(x, y - 6 * k); c.lineTo(x + 3 * k, y - 11 * k); c.stroke();
  }
  function draw() {
    fit();
    const k = cv.width / 600, g = S.game, c = ctx, now = performance.now(), U = 25 * k;
    const lawn = c.createLinearGradient(0, 0, 0, cv.height); lawn.addColorStop(0, "#86efac"); lawn.addColorStop(1, "#4ade80");
    c.fillStyle = lawn; c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = "rgba(21, 128, 61, 0.35)"; c.lineWidth = 1.4 * k;
    for (let i = 0; i < 160; i++) { const x = hash(i, 3) * 600 * k, y = hash(i, 4) * 640 * k; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2 * k, y - 7 * k); c.moveTo(x, y); c.lineTo(x + 2 * k, y - 6 * k); c.stroke(); }
    for (let i = 0; i < 24; i++) { const x = hash(i, 8) * 600 * k, y = hash(i, 9) * 620 * k; c.fillStyle = "#ffffff"; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.2566) * 2.4 * k, y + Math.sin(p * 1.2566) * 2.4 * k, 1.5 * k, 0, 7); c.fill(); } c.fillStyle = "#facc15"; c.beginPath(); c.arc(x, y, 1.3 * k, 0, 7); c.fill(); }
    c.fillStyle = "#d6b48a"; c.fillRect(0, 650 * k, cv.width, 150 * k); c.fillStyle = "#c19a6b"; c.fillRect(0, 650 * k, cv.width, 3 * k);
    for (let i = 0; i < 30; i++) { c.fillStyle = "rgba(120, 90, 60, 0.35)"; c.beginPath(); c.ellipse(hash(i, 21) * 600 * k, (660 + hash(i, 22) * 135) * k, 3 * k, 2 * k, 0, 0, 7); c.fill(); }
    if (!g) return;
    // (the buds and the flowers; a bud a butterfly is flying to stays a bud until it lands)
    for (const b of g.buds) {
      const x = (b.c + 0.5) * U, y = (b.r + 0.5) * U, key = b.c + "," + b.r, due = S.arriving.get(key);
      const open = b.hp === 0 && !(due && now < due) ? 1 : b.hp === 0 ? 0.66 : [1, 0.66, 0.33, 0][b.hp] ?? 0;
      flower(c, x, y, k, petalOf(b.c, b.r), open, now);
    }
    // (the cocoons: hanging from a thread, wobbling more as their butterfly gets ready)
    for (const q of g.cocoons) {
      const x = (q.c + 0.5) * U, y = (q.r + 0.5) * U, wob = Math.sin(now / 80) * (1 - q.hp / 90) * 0.35;
      c.strokeStyle = "rgba(255, 255, 255, 0.7)"; c.lineWidth = 1 * k; c.beginPath(); c.moveTo(x, y - 12 * k); c.lineTo(x, y - 7 * k); c.stroke();
      c.save(); c.translate(x, y - 7 * k); c.rotate(wob); c.fillStyle = "#d9f99d"; c.beginPath(); c.ellipse(0, 7 * k, 5.5 * k, 8.5 * k, 0, 0, 7); c.fill();
      c.strokeStyle = "#84cc16"; c.lineWidth = 1 * k; for (const dy of [3, 7, 11]) { c.beginPath(); c.moveTo(-4.5 * k, dy * k); c.quadraticCurveTo(0, (dy + 2) * k, 4.5 * k, dy * k); c.stroke(); }
      c.restore();
    }
    // (the caterpillars)
    const at = new Set(g.segs.map(s => s.c + "," + s.r));
    for (const s of g.segs) {
      const x = (s.c + 0.5) * U, y = (s.r + 0.5) * U, head = !at.has((s.c + s.d) + "," + s.r), bob = Math.sin(now / 120 + s.c * 0.9) * 1.2 * k;
      c.fillStyle = "#166534"; for (const dx of [-4, 4]) { c.beginPath(); c.arc(x + dx * k, y + 9 * k, 2 * k, 0, 7); c.fill(); }
      c.fillStyle = head ? "#a3e635" : "#84cc16"; c.beginPath(); c.arc(x, y + bob, (head ? 11.5 : 10) * k, 0, 7); c.fill();
      c.fillStyle = "rgba(255, 255, 255, 0.3)"; c.beginPath(); c.arc(x - 3 * k, y - 4 * k + bob, 3.5 * k, 0, 7); c.fill();
      if (!head) { c.fillStyle = "#fde047"; c.beginPath(); c.arc(x + 3 * k, y + 2 * k + bob, 2 * k, 0, 7); c.fill(); continue; }
      c.strokeStyle = "#3f6212"; c.lineWidth = 1.8 * k; c.beginPath(); c.moveTo(x - 3 * k, y - 9 * k + bob); c.lineTo(x - 6 * k, y - 17 * k + bob); c.moveTo(x + 3 * k, y - 9 * k + bob); c.lineTo(x + 6 * k, y - 17 * k + bob); c.stroke();
      c.fillStyle = "#f472b6"; c.beginPath(); c.arc(x - 6 * k, y - 17 * k + bob, 2.2 * k, 0, 7); c.arc(x + 6 * k, y - 17 * k + bob, 2.2 * k, 0, 7); c.fill();
      c.fillStyle = "#ffffff"; c.beginPath(); c.arc(x + (s.d * 2 - 4) * k, y - 2 * k + bob, 3.6 * k, 0, 7); c.arc(x + (s.d * 2 + 4) * k, y - 2 * k + bob, 3.6 * k, 0, 7); c.fill();
      c.fillStyle = "#111827"; c.beginPath(); c.arc(x + (s.d * 3 - 4) * k, y - 2 * k + bob, 1.8 * k, 0, 7); c.arc(x + (s.d * 3 + 4) * k, y - 2 * k + bob, 1.8 * k, 0, 7); c.fill();
      c.strokeStyle = "#14532d"; c.lineWidth = 1.4 * k; c.beginPath(); c.arc(x + s.d * 2 * k, y + 3 * k + bob, 3 * k, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      c.fillStyle = "rgba(244, 114, 182, 0.6)"; c.beginPath(); c.arc(x + (s.d * 2 - 7) * k, y + 2 * k + bob, 1.8 * k, 0, 7); c.arc(x + (s.d * 2 + 7) * k, y + 2 * k + bob, 1.8 * k, 0, 7); c.fill();
    }
    // (petals bursting from a bud the nectar opened; sparkles where a caterpillar was fed)
    S.bursts = S.bursts.filter(b => now - b.t < 700);
    for (const b of S.bursts) { const q = (now - b.t) / 700; c.globalAlpha = 1 - q; c.fillStyle = b.col;
      for (let i = 0; i < 8; i++) { const a = i * 0.785 + b.t, r = (6 + q * 22) * k; c.beginPath(); c.ellipse(b.x * k + Math.cos(a) * r, b.y * k + Math.sin(a) * r, 3 * k, 1.8 * k, a, 0, 7); c.fill(); } }
    S.sparks = S.sparks.filter(b => now - b.t < 500);
    for (const b of S.sparks) { const q = (now - b.t) / 500; c.globalAlpha = 1 - q; c.fillStyle = "#fef08a";
      for (let i = 0; i < 6; i++) { const a = i * 1.047, r = (5 + q * 14) * k, x = b.x * k + Math.cos(a) * r, y = b.y * k + Math.sin(a) * r, z = 3 * k * (1 - q);
        c.beginPath(); c.moveTo(x, y - z); c.lineTo(x + z * 0.3, y - z * 0.3); c.lineTo(x + z, y); c.lineTo(x + z * 0.3, y + z * 0.3); c.lineTo(x, y + z); c.lineTo(x - z * 0.3, y + z * 0.3); c.lineTo(x - z, y); c.lineTo(x - z * 0.3, y - z * 0.3); c.closePath(); c.fill(); } }
    c.globalAlpha = 1;
    // (the butterflies: from the cocoon to the bud they open, then up and away)
    S.flies = S.flies.filter(f => now - f.t < 2600);
    for (const f of S.flies) {
      const u = (now - f.t) / 900, e = Math.min(1, u), x = f.x0 + (f.x1 - f.x0) * e + Math.sin(e * 9) * 8 * (1 - e), y = f.y0 + (f.y1 - f.y0) * e - Math.sin(e * Math.PI) * 30;
      const off = Math.max(0, u - 1.1), fx = x + off * 120 * f.dir, fy = y - off * 260;
      c.globalAlpha = Math.max(0, Math.min(1, 1.8 - off)); butterfly(c, fx * k, fy * k, k, now / 70 + f.t, f.col); c.globalAlpha = 1;
    }
    // (your watering can, at the foot of the garden, and its drop of nectar)
    if (!(g.wait > 0 && Math.floor(now / 120) % 2)) {
      const x = g.px * k, y = g.py * k;
      c.fillStyle = "rgba(60, 40, 20, 0.25)"; c.beginPath(); c.ellipse(x, y + 12 * k, 13 * k, 4 * k, 0, 0, 7); c.fill();
      c.strokeStyle = "#0e7490"; c.lineWidth = 3 * k; c.beginPath(); c.arc(x - 2 * k, y - 6 * k, 8 * k, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      c.fillStyle = "#22d3ee"; c.beginPath(); c.roundRect(x - 11 * k, y - 6 * k, 20 * k, 17 * k, 5 * k); c.fill();
      c.fillStyle = "#67e8f9"; c.fillRect(x - 9 * k, y - 3 * k, 16 * k, 3 * k);
      c.strokeStyle = "#0891b2"; c.lineWidth = 4 * k; c.lineCap = "round"; c.beginPath(); c.moveTo(x + 7 * k, y); c.lineTo(x + 2 * k, y - 16 * k); c.stroke();
      c.fillStyle = "#0891b2"; c.beginPath(); c.ellipse(x + 1.5 * k, y - 17 * k, 4 * k, 2.2 * k, -0.3, 0, 7); c.fill();
    }
    if (g.sy >= 0) { const x = g.sx * k, y = (g.sy + 5) * k;
      c.fillStyle = "rgba(253, 224, 71, 0.45)"; for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(x, y + i * 7 * k, (3 - i * 0.6) * k, 0, 7); c.fill(); }
      c.fillStyle = "#f59e0b"; c.beginPath(); c.moveTo(x, y - 7 * k); c.quadraticCurveTo(x + 5 * k, y + 1 * k, x, y + 4 * k); c.quadraticCurveTo(x - 5 * k, y + 1 * k, x, y - 7 * k); c.fill();
      c.fillStyle = "rgba(255, 255, 255, 0.8)"; c.beginPath(); c.arc(x - 1.2 * k, y - 1 * k, 1.2 * k, 0, 7); c.fill(); }
    S.pops = S.pops.filter(p => now - p.t < 800);
    for (const p of S.pops) { const q = (now - p.t) / 800; c.globalAlpha = 1 - q; c.fillStyle = p.col; c.font = `700 ${Math.round(15 * k)}px system-ui`; c.textAlign = "center"; c.fillText(p.text, p.x * k, (p.y - q * 24) * k); }
    c.globalAlpha = 1; c.textAlign = "center";
    // (the meter along the top: the buds open)
    { const n = g.buds.length, open = g.buds.filter(b => b.hp === 0).length, x0 = 160 * k, w = 280 * k, y0 = 10 * k;
      c.fillStyle = "rgba(255, 255, 255, 0.45)"; c.beginPath(); c.roundRect(x0, y0, w, 12 * k, 6 * k); c.fill();
      c.fillStyle = "#ec4899"; c.beginPath(); c.roundRect(x0, y0, Math.max(12 * k, w * open / Math.max(1, n)), 12 * k, 6 * k); c.fill();
      c.fillStyle = "#14532d"; c.font = `600 ${Math.round(13 * k)}px system-ui`; c.textAlign = "right"; c.fillText("🌷", x0 - 6 * k, y0 + 11 * k);
      c.textAlign = "left"; c.fillText(`${open} of ${n}`, x0 + w + 8 * k, y0 + 11 * k); c.textAlign = "center"; }
    if (g.over) {
      c.fillStyle = "rgba(20, 83, 45, 0.82)"; c.fillRect(0, 330 * k, 600 * k, 140 * k);
      c.fillStyle = "#ffffff"; c.font = `700 ${Math.round(26 * k)}px system-ui`; c.fillText(`🦋 ${g.freed} butterflies · ⭐ ${g.score}`, 300 * k, 395 * k);
      c.font = `${Math.round(17 * k)}px system-ui`; c.fillText("New game: the button, a tap, or Enter", 300 * k, 435 * k);
    } else if (S.banner && now - S.banner.t < 1800 && S.banner.text) {
      c.fillStyle = "rgba(255, 255, 255, 0.75)"; c.fillRect(0, 528 * k, 600 * k, 46 * k);
      c.fillStyle = "#9d174d"; c.font = `700 ${Math.round(24 * k)}px system-ui`; c.fillText(S.banner.text, 300 * k, 560 * k);
    }
  }
  function bar() {
    const g = S.game; if (!g) return;
    $("points").textContent = `⭐ ${g.score}`; $("lives").textContent = "💛".repeat(Math.max(0, g.lives));
    $("level").textContent = `garden ${g.wave + 1}`; $("left").textContent = `🌷 ${g.buds.filter(b => b.hp === 0).length} of ${g.buds.length} open · 🦋 ${g.freed}`;
    const ms = S.stepMs.length ? [...S.stepMs].sort((a, b) => a - b)[S.stepMs.length >> 1] : 0;
    $("info").textContent = `Your best on this device: ${S.best} points.` + (ms ? ` A step of Hazel's rules: ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms.` : "");
    if (window.OracleFs) window.OracleFs.empty(!g || !!g.over);
  }

  // ---- a game, and every frame a step of the rules
  function newGame() {
    const h = H(); if (!h) return;
    S.game = h.start(1 + Math.floor(Math.random() * 2000000000)); S.pops = []; S.flies = []; S.bursts = []; S.sparks = []; S.arriving.clear(); S.banner = null; S.fire = false; S.restartAt = 0;
    if (W && W.on) W.start(0);
    bar(); draw();
  }
  // (what a step did: a caterpillar fed (sparkles, its points); each cocoon opened, its butterfly flying to the bud it opens (the
  // bud opens when it lands); a bud opened by nectar (petals); a bump; the garden in full bloom (butterflies everywhere); another
  // caterpillar)
  function heard(g, g2) {
    const now = performance.now();
    if (g2.hit === 1) { const x = g.sx, y = Math.max(0, g.sy - 18); S.sparks.push({ x, y, t: now }); S.pops.push({ x, y: y - 10, text: "+" + (g2.score - g.score - 5 * (g2.freed - g.freed)), t: now, col: "#9d174d" }); }
    if (g2.hit !== 3) {
      const gone = g.cocoons.filter(q => q.hp <= 1);
      const opened = g2.buds.filter(b => b.hp === 0 && g.buds.some(o => o.c === b.c && o.r === b.r && o.hp > 0));
      for (const q of gone) {
        let best = null, bd = 1e9; for (const b of opened) { const d = Math.abs(b.c - q.c) + Math.abs(b.r - q.r); if (d < bd) { bd = d; best = b; } }
        const x0 = (q.c + 0.5) * 25, y0 = (q.r + 0.5) * 25;
        if (best) { opened.splice(opened.indexOf(best), 1); S.arriving.set(best.c + "," + best.r, now + 900); S.flies.push({ x0, y0, x1: (best.c + 0.5) * 25, y1: (best.r + 0.5) * 25, t: now, col: petalOf(best.c, best.r), dir: hash(q.c, now) > 0.5 ? 1 : -1 }); }
        else S.flies.push({ x0, y0, x1: x0, y1: y0 - 40, t: now, col: PETALS[Math.floor(hash(q.r, q.c) * 6)], dir: 1 });
      }
      for (const b of opened) S.bursts.push({ x: (b.c + 0.5) * 25, y: (b.r + 0.5) * 25, t: now, col: petalOf(b.c, b.r) });
    }
    if (g2.hit === 2) S.banner = { text: g2.lives > 0 ? "🐛 Bump! A caterpillar walked into your can" : "", t: now };
    if (g2.hit === 3) { S.banner = { text: "🌸 The garden is in full bloom!", t: now }; S.arriving.clear();
      for (let i = 0; i < 14; i++) S.flies.push({ x0: 40 + hash(i, now) * 520, y0: 600 + hash(now, i) * 40, x1: 40 + hash(i + 7, now) * 520, y1: 200 + hash(now, i + 3) * 300, t: now + i * 60, col: PETALS[i % 6], dir: i % 2 ? 1 : -1 }); }
    if (g2.hit === 6) S.banner = { text: "🐛 Another hungry caterpillar!", t: now };
  }
  function oneStep(h) {
    const g = S.game;
    let mx = 0, my = 0, fire = false;
    if (W && W.on) { const t1 = performance.now(), c = h.robot(g); W.think(0, performance.now() - t1); mx = c.mx; my = c.my; fire = c.fire; }
    else {
      mx = S.held.left ? -1 : S.held.right ? 1 : S.aimX !== null ? (S.aimX > g.px + 4 ? 1 : S.aimX < g.px - 4 ? -1 : 0) : 0;
      my = S.held.up ? -1 : S.held.down ? 1 : S.aimY !== null ? (S.aimY > g.py + 4 ? 1 : S.aimY < g.py - 4 ? -1 : 0) : 0;
      fire = S.fire; if (g.sy < 0 || !S.fire) S.fire = false;
    }
    const t0 = performance.now(), g2 = h.step(g, mx, my, fire);
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 60) S.stepMs.shift();
    heard(g, g2); S.game = g2;
    if (g2.over && !(W && W.on) && g2.score > S.best) { S.best = g2.score; keep("best", S.best); }
    if (g2.over && W && W.on) { W.end(`🤖 Hazel's game: ${g2.freed} butterflies, ${g2.score} points, to garden ${g2.wave + 1}`); S.restartAt = performance.now() + 3000; }
  }
  let lastBar = 0, acc = 0, lastT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const h = H(), g = S.game;
    if (g && g.over && W && W.on && S.restartAt && t > S.restartAt) newGame();
    if (!h || !g || g.over || document.hidden) { lastT = t; if (g) draw(); return; }
    if (P && P.paused()) { lastT = t; draw(); return; }
    // (0.0.54) as many times its own speed as 🤖's pace says (W.rate), several steps a frame; at full speed, as many as fit in 10 ms
    const auto = W && W.on, rate = auto ? (W.rate || 1) : 1, fast = rate === Infinity, cap = fast ? 100000 : Math.max(6, Math.ceil(rate * 2));
    acc += fast ? 0 : Math.min(100, t - (lastT || t)) * rate * 60 / 1000; lastT = t;
    let n = 0; const tq = performance.now();
    try { while ((fast ? performance.now() - tq < 10 : acc >= 1) && n < cap && !S.game.over) { oneStep(h); acc -= 1; n++; } } catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; drawStatus(); return; }
    if (n >= cap || fast) acc = 0;
    if (auto) W.show();
    draw();
    if (t - lastBar > 150) { lastBar = t; bar(); }
  }
  requestAnimationFrame(frame);

  // ---- the controls: ⬅️ ➡️ held (or the keys), a finger along the field (the cannon follows it), ⬆️, the space bar or a tap
  // to fire (one shot in the air at a time; a fire asked for waits until it can go)
  const fieldXY = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 600, (e.clientY - r.top) / r.height * 800]; };
  cv.addEventListener("pointerdown", e => { if (W && W.on) return; if (S.game && S.game.over) { newGame(); return; } [S.aimX, S.aimY] = fieldXY(e); S.fire = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => { if (W && W.on) return; if (e.buttons) { [S.aimX, S.aimY] = fieldXY(e); S.fire = true; } });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, () => { S.aimX = null; S.aimY = null; });
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  addEventListener("keydown", e => {
    if (typing(e) || (W && W.on)) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); S.held.left = true; }
    else if (e.key === "ArrowRight") { e.preventDefault(); S.held.right = true; }
    else if (e.key === "ArrowUp") { e.preventDefault(); S.held.up = true; }
    else if (e.key === "ArrowDown") { e.preventDefault(); S.held.down = true; }
    else if (e.key === "Enter" && S.game && S.game.over) newGame();
    else if (e.key === "Enter" || e.key === "f" || e.key === "F") { e.preventDefault(); S.fire = true; }
  });
  addEventListener("keyup", e => { if (e.key === "ArrowLeft") S.held.left = false; else if (e.key === "ArrowRight") S.held.right = false; else if (e.key === "ArrowUp") S.held.up = false; else if (e.key === "ArrowDown") S.held.down = false; });
  const hold = (id, side) => { const b = $(id);
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("held"); if (!(W && W.on)) S.held[side] = true; });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { b.classList.remove("held"); S.held[side] = false; }); };
  hold("left", "left"); hold("right", "right");
  $("launch").addEventListener("pointerdown", e => { e.preventDefault(); if (!(W && W.on)) S.fire = true; });
  $("new").addEventListener("click", newGame);
  addEventListener("resize", () => draw());
  if (window.OracleFs) window.OracleFs.offer({ label: "🦋 New game", title: "A new game, from the first garden", cast: newGame });
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["Hazel"], label: "🤖 Hazel plays for you", what: "the game",
    more: () => S.game ? `; ${S.game.freed} butterflies, garden ${S.game.wave + 1}` : "",
    onChange: on => {
      S.held = { left: false, right: false, up: false, down: false }; S.fire = false; S.aimX = null; S.aimY = null;
      if (!on) { W.stop(); return; }
      if (!H()) return;
      if (!S.game || S.game.over) newGame();
      W.start(0);
    },
  }) : null;
  // (0.0.53) ⏸ the pause (shared/pause.js): its button and the space bar; no step runs while paused
  const P = window.HazelPause ? window.HazelPause.make({ into: $("new").parentElement, over: $("field").parentElement }) : null;

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), every step, without loading Hazel's library or building the program. Hazel loads if you edit the rules.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules move the caterpillars…"; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s, and interpreted every step: slower than compiled, so the game may go in slow motion.`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so nothing can move: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build");
  }
  let L = null, timer = 0;
  function build() {
    if (!window.Hazel || !L) return;
    const sp = L.spec(PROGRAM, TAIL), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now(); let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!r.ok && !!v && typeof v.step === "function" && typeof v.start === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0, at: performance.now() };
    S.stepMs = []; drawStatus();
    if (S.built.ok) newGame(); else draw();
  }
  function loadCompiled() {
    const c = document.createElement("script");
    c.src = "compiled.js?v=0.0.61"; c.async = true;
    c.onload = () => { const v = window.BugsCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newGame(); }
      else if (!v) { S.compiledError = "it ran, but gave no Butterfly garden"; loadLib(); } };
    c.onerror = () => { S.compiledError = "it is not here yet"; loadLib(); };
    document.head.append(c);
  }
  let libAsked = false;
  function loadLib() {
    if (libAsked) return; libAsked = true; drawStatus();
    const s = document.createElement("script"); s.src = LIB; s.async = true;
    s.onload = () => { S.libAt = performance.now(); drawStatus(); setTimeout(build, 30); }; s.onerror = () => { S.libFailed = true; drawStatus(); };
    document.head.append(s);
  }
  try {
    const [pre, ...mods] = await Promise.all([text("rules/preamble.hz"), ...MODULES.map(m => text(`rules/${m}.hz`))]);
    document.querySelector(`pre.hazel[data-program="${PROGRAM}"]:not([data-module])`).textContent = pre;
    MODULES.forEach((m, i) => { document.querySelector(`pre.hazel[data-module="${m}"]`).textContent = mods[i]; });
    window.HazelListingsOptions = { start: "request" };
    await load("../shared/hazel-listings.js?v=0.0.24");
    L = window.HazelListings; L.tail(PROGRAM, TAIL);
    L.onChange(PROGRAM, () => { if (!window.Hazel) loadLib(); S.built = S.built && S.built.compiled ? null : S.built; clearTimeout(timer); timer = setTimeout(build, 350); });
    if (COMPILED) loadCompiled(); else loadLib();
  } catch (e) {
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });

  // ---- ⚙️ Advanced: this device's speed (300 steps of a game, the robot choosing each one)
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Butterfly garden", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "300 steps of a game with the robot choosing each one, through Hazel",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: 300 steps of a game…");
      let g = h.start(12345); const t0 = performance.now();
      for (let n = 0; n < 300 && !g.over; n++) { const c = h.robot(g); g = h.step(g, c.mx, c.my, c.fire); }
      const ms = (performance.now() - t0) / 300;
      return { data: { step: +ms.toFixed(3) }, text: [`a step and the robot's choice through Hazel: ${ms.toFixed(2)} ms`] };
    },
  });
  // (for checking the page where no frames are drawn, a browser pane hidden: ?test=1 lets a script run steps and draw)
  if (Q.has("test")) window.BugsTest = { S, newGame, steps: n => { const h = H(); for (let i = 0; i < n && S.game && !S.game.over; i++) oneStep(h); draw(); bar(); return S.game; }, auto: () => W };
  document.body.classList.add("js");
  draw(); bar();
})();
