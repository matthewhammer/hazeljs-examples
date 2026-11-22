// hazeljs-examples, Star wave (ticket 827; Matthew, 2026-11-22: "Next: space invaders clone ..." and "all with hazel rules
// and hazel AI that plays the game"; reimagined in 0.0.57: "the aliens are coming down, and they want to receive a 'love
// heart' that's shot up at them, not a laser beam. When they get that heart, they explode into hearts, and dissolve into the
// shared reality. And we score how many heart connections we make before they land on the ground. Rather than them destroying
// the buildings on the ground, let's say that they are transforming them into rainbows. We want to have love-struck each alien
// by the time that our buildings are fully rainbow, and if we time it just right (not too soon, or too late), we win."). The
// page: the sky and the town drawn on a canvas, every frame a step of Hazel's rules (StarWave.step: your launcher and its
// heart, the visitors marching across and down, their rainbows falling and turning the town rainbow a floor at a time; just
// right, too soon, too late), and 🤖 Hazel plays for you, the robot in Hazel (StarWave.robot) pacing its hearts to the
// rainbows. The rules compiled ahead of time by hazel-jit (compiled.js) when it is here, else, and once they are edited, run
// by hazeljs (slower).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "starwave", MODULES = ["StarWave"];
  const TAIL = "(start = StarWave.start, step = StarWave.step, robot = StarWave.robot)";
  const KEY = "hazeljs-examples/starwave/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: the rules, the game (a Hazel value: the field 600 by 800), what is held, where a finger points, the hearts
  // flying out of a visitor, words floating up, floors just turned, rainbow arcs, the best on this device
  const S = { built: null, libAt: 0, libFailed: false, compiledError: "", game: null, best: kept("best-hearts", 0),
              held: { left: false, right: false }, aimX: null, fire: false, pops: [], stepMs: [], restartAt: 0, bursts: [], flashes: [], arcs: [] };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  const SND = window.StarWaveSound || null;   // (sound.js: the music, a tune each wave, and the game's sounds)
  // (the town, as in the rules: building s from 54 + 140 s, 72 wide, its floors 18 tall; 22 floors in all)
  const FLOORS = [5, 7, 6, 4], BX = s => 54 + 140 * s, ROOF = s => 762 - 18 * FLOORS[s], FULL = 22, WINDOW = 480;
  const painted = g => g.town.reduce((a, b) => a + b, 0);
  const left = g => g.aliens.filter(a => a > 0).length;
  const VERDICT = { 3: "💖 Just right!", 4: "⏰ Too late: they landed", 5: "⏩ Too soon: the town wasn't all rainbow", 6: "⏰ Too late: the rainbow town waited" };

  // ---- drawing: the sky, its stars; the visitors (our own three kinds, each with two poses, changing at each march, all
  // smiling); the town's buildings, their floors plain or rainbow; your launcher, its heart, the rainbow drops; hearts bursting
  // out of a visitor reached; the rainbow meter; once the town is all rainbow, a rainbow over it and the seconds left
  const cv = $("field"), ctx = cv.getContext("2d");
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, Math.round(r.width * d)), h = Math.round(w * 4 / 3);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  const hash = (a, b) => { let x = (a * 374761393 + b * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177 | 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  const BANDS = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"];   // (a floor's rainbow, by its place from the top: every building's bands in line)
  const rainbow = (i, n, l = 60) => `hsl(${Math.round(n > 1 ? i / (n - 1) * 280 : 0)}, 90%, ${l}%)`;   // (red at the top, violet at the bottom)
  function heart(c, x, y, r, fill) {   // (a heart, its middle at x, y, r about half its width, in canvas pixels)
    c.fillStyle = fill; c.beginPath();
    c.moveTo(x, y + r * 0.9);
    c.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.75, y - r * 1.25, x, y - r * 0.45);
    c.bezierCurveTo(x + r * 0.75, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
    c.fill();
  }
  function smile(c, cx, cy, k, w) {
    c.strokeStyle = "#1f0a2e"; c.lineWidth = 1.6 * k; c.beginPath(); c.arc(cx, cy, w * k, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.fillStyle = "rgba(251, 113, 133, 0.75)"; c.beginPath(); c.arc(cx - (w + 4) * k, cy - 1 * k, 2.2 * k, 0, 7); c.arc(cx + (w + 4) * k, cy - 1 * k, 2.2 * k, 0, 7); c.fill();
  }
  function visitor(c, kind, x, y, k, pose) {
    const cx = (x + 16) * k, cy = (y + 12) * k;
    if (kind === 3) {   // (a diamond with one big eye, its points pulsing)
      const p = pose ? 1 : 0.8;
      c.fillStyle = "#e879f9"; c.beginPath(); c.moveTo(cx, cy - 12 * k); c.lineTo(cx + 15 * k * p, cy); c.lineTo(cx, cy + 12 * k); c.lineTo(cx - 15 * k * p, cy); c.closePath(); c.fill();
      c.fillStyle = "rgba(240, 171, 252, 0.6)"; c.beginPath(); c.moveTo(cx, cy - 12 * k); c.lineTo(cx + 15 * k * p, cy); c.lineTo(cx, cy); c.closePath(); c.fill();   // (0.0.59: a lit facet)
      c.fillStyle = "#ffffff"; c.beginPath(); c.arc(cx, cy - 2 * k, 4.5 * k, 0, 7); c.fill(); c.fillStyle = "#3b0764"; c.beginPath(); c.arc(cx, cy - 1 * k, 2.2 * k, 0, 7); c.fill();
      c.fillStyle = "#ffffff"; c.beginPath(); c.arc(cx + 0.8 * k, cy - 2 * k, 0.8 * k, 0, 7); c.fill();   // (a glint)
      c.strokeStyle = "#3b0764"; c.lineWidth = 1.4 * k; c.beginPath(); c.arc(cx, cy + 3 * k, 3 * k, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    } else if (kind === 2) {   // (a six-sided drone, two antennae up or out)
      c.fillStyle = "#22d3ee"; c.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.lineTo(cx + Math.cos(a) * 14 * k, cy + Math.sin(a) * 10 * k); }
      c.closePath(); c.fill(); c.strokeStyle = "rgba(165, 243, 252, 0.7)"; c.lineWidth = 1 * k; c.stroke();   // (0.0.59: a rim)
      c.strokeStyle = "#a5f3fc"; c.lineWidth = 2 * k; c.beginPath(); const sp = pose ? 9 : 5;
      c.moveTo(cx - 5 * k, cy - 8 * k); c.lineTo(cx - sp * k, cy - 14 * k); c.moveTo(cx + 5 * k, cy - 8 * k); c.lineTo(cx + sp * k, cy - 14 * k); c.stroke();
      heart(c, cx - sp * k, cy - 15 * k, 2.2 * k, "#fb7185"); heart(c, cx + sp * k, cy - 15 * k, 2.2 * k, "#fb7185");
      c.fillStyle = "#083344"; c.fillRect(cx - 7 * k, cy - 4 * k, 4 * k, 4 * k); c.fillRect(cx + 3 * k, cy - 4 * k, 4 * k, 4 * k);
      smile(c, cx, cy + 1 * k, k, 3);
    } else {   // (a round blob on three legs, the legs stepping)
      c.fillStyle = "#4ade80"; c.beginPath(); c.ellipse(cx, cy - 2 * k, 14 * k, 9 * k, 0, 0, 7); c.fill();
      c.fillStyle = "rgba(187, 247, 208, 0.5)"; c.beginPath(); c.ellipse(cx - 4 * k, cy - 6 * k, 6 * k, 3 * k, 0, 0, 7); c.fill();   // (0.0.59: a sheen)
      c.strokeStyle = "#4ade80"; c.lineWidth = 3 * k; c.beginPath();
      for (const dx of [-8, 0, 8]) { c.moveTo(cx + dx * k, cy + 5 * k); c.lineTo(cx + (dx + (pose ? 3 : -3)) * k, cy + 11 * k); }
      c.stroke();
      c.fillStyle = "#052e16"; c.beginPath(); c.arc(cx - 5 * k, cy - 4 * k, 2.5 * k, 0, 7); c.arc(cx + 5 * k, cy - 4 * k, 2.5 * k, 0, 7); c.fill();
      smile(c, cx, cy - 1 * k, k, 3.5);
    }
  }
  function town(c, g, k, now) {
    const all = painted(g) >= FULL;
    for (let s = 0; s < 4; s++) {
      const x = BX(s) * k, w = 72 * k, F = FLOORS[s];
      for (let i = 0; i < F; i++) {
        const y = (ROOF(s) + 18 * i) * k, lit = i < g.town[s];
        c.fillStyle = lit ? BANDS[i] : (i % 2 ? "#2b3a55" : "#33445f");
        c.fillRect(x, y, w, 18 * k + 0.5);
        if (lit && all) { c.fillStyle = `rgba(255, 255, 255, ${0.18 + 0.14 * Math.sin(now / 160 + i)})`; c.fillRect(x, y, w, 18 * k + 0.5); }   // (all rainbow: shimmering)
        for (let wi = 0; wi < 3; wi++) {   // (three windows a floor, some lit)
          c.fillStyle = lit ? "rgba(255, 255, 255, 0.55)" : (hash(s * 31 + i, wi) > 0.45 ? "#fde68a" : "#1e293b");
          c.fillRect(x + (10 + wi * 21) * k, y + 5 * k, 10 * k, 8 * k);
        }
      }
      c.fillStyle = g.town[s] >= F ? "#fef3c7" : "#475569"; c.fillRect(x - 3 * k, ROOF(s) * k - 4 * k, w + 6 * k, 4 * k);   // (the roof)
    }
    // (a floor just turned rainbow flashes; a rainbow landing away from the building it turned arcs over to it)
    S.flashes = S.flashes.filter(f => now - f.t < 450);
    for (const f of S.flashes) { c.fillStyle = `rgba(255, 255, 255, ${0.8 * (1 - (now - f.t) / 450)})`; c.fillRect(BX(f.s) * k, (ROOF(f.s) + 18 * f.i) * k, 72 * k, 18 * k); }
    S.arcs = S.arcs.filter(a => now - a.t < 700);
    for (const a of S.arcs) { const q = (now - a.t) / 700, x0 = a.x * k, x1 = (BX(a.s) + 36) * k, y = ROOF(a.s) * k, mid = (x0 + x1) / 2, r = Math.abs(x1 - x0) / 2;
      c.globalAlpha = 1 - q; for (let b = 0; b < 6; b++) { c.strokeStyle = rainbow(b, 6); c.lineWidth = 3 * k; c.beginPath(); c.arc(mid, y, Math.max(1, r - b * 3 * k), Math.PI, 2 * Math.PI); c.stroke(); } c.globalAlpha = 1; }
  }
  function draw() {
    fit();
    const k = cv.width / 600, g = S.game, c = ctx, now = performance.now();
    const sky = c.createLinearGradient(0, 0, 0, cv.height); sky.addColorStop(0, "#070a1c"); sky.addColorStop(0.7, "#1f1240"); sky.addColorStop(1, "#3a1d5c");
    c.fillStyle = sky; c.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < 90; i++) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(now / 900 + i)); c.fillStyle = `rgba(220, 210, 255, ${0.25 + 0.5 * tw * hash(i, 7)})`; c.fillRect(hash(i, 1) * cv.width, hash(i, 2) * cv.height * 0.75, 1.6 * k, 1.6 * k); }
    for (let i = 0; i < 6; i++) {   // (0.0.59, from the icon: a few stars twinkling as four-pointed sparkles)
      const tw = Math.max(0, Math.sin(now / 700 + i * 1.7)), x = hash(i, 11) * cv.width, y = hash(i, 12) * cv.height * 0.6, r = (3 + 4 * tw) * k;
      if (tw > 0.05) { c.fillStyle = `rgba(233, 213, 255, ${0.35 + 0.5 * tw})`; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.22, y - r * 0.22); c.lineTo(x + r, y); c.lineTo(x + r * 0.22, y + r * 0.22); c.lineTo(x, y + r); c.lineTo(x - r * 0.22, y + r * 0.22); c.lineTo(x - r, y); c.lineTo(x - r * 0.22, y - r * 0.22); c.closePath(); c.fill(); } }
    if (!g) { c.fillStyle = "#1e293b"; c.fillRect(0, 762 * k, cv.width, 38 * k); return; }
    const all = painted(g) >= FULL;
    if (all) {   // (the town all rainbow: a rainbow over it)
      for (let b = 0; b < 7; b++) { c.strokeStyle = rainbow(b, 7, 62); c.globalAlpha = 0.35; c.lineWidth = 9 * k; c.beginPath(); c.arc(300 * k, 790 * k, (330 - b * 9) * k, Math.PI, 2 * Math.PI); c.stroke(); }
      c.globalAlpha = 1;
    }
    town(c, g, k, now);
    c.fillStyle = "#1e293b"; c.fillRect(0, 762 * k, cv.width, 38 * k); c.fillStyle = "#334155"; c.fillRect(0, 762 * k, cv.width, 2 * k);
    const pose = Math.floor(g.fx / 8) % 2 === 0;
    g.aliens.forEach((a, i) => { if (a) visitor(c, a, g.fx + (i % 9) * 48, g.fy + Math.floor(i / 9) * 40, k, pose); });
    // (the rainbow drops: a falling drop, its colour going round)
    for (const d of g.drops) { const x = d.x * k, y = d.y * k; c.fillStyle = `hsl(${(d.y * 3 + now / 6) % 360}, 90%, 62%)`; c.beginPath(); c.moveTo(x, y - 9 * k); c.quadraticCurveTo(x + 6 * k, y, x, y + 4 * k); c.quadraticCurveTo(x - 6 * k, y, x, y - 9 * k); c.fill();
      c.strokeStyle = "rgba(255, 255, 255, 0.8)"; c.lineWidth = 1 * k; c.lineCap = "round"; c.beginPath(); c.moveTo(x - 1.5 * k, y - 4 * k); c.quadraticCurveTo(x - 2.5 * k, y - 1 * k, x - 1 * k, y + 1 * k); c.stroke(); }   // (0.0.59: a shine)
    // (your launcher, in front of the town, and its heart going up)
    { const x = g.cx * k, y = 740 * k;
      c.fillStyle = "#f9a8d4"; c.beginPath(); c.roundRect(x - 22 * k, y - 2 * k, 44 * k, 16 * k, 7 * k); c.fill();
      c.fillStyle = "#f472b6"; c.beginPath(); c.roundRect(x - 22 * k, y + 9 * k, 44 * k, 5 * k, 2.5 * k); c.fill();   // (0.0.59: a band at its foot)
      c.fillStyle = "#fdf2f8"; c.beginPath(); c.roundRect(x - 7 * k, y - 16 * k, 14 * k, 16 * k, 5 * k); c.fill();
      c.fillStyle = "#fbcfe8"; c.beginPath(); c.roundRect(x - 5 * k, y - 16 * k, 10 * k, 3 * k, 1.5 * k); c.fill();
      heart(c, x, y + 6 * k, 5 * k, "#e11d48"); }
    if (g.hy >= 0) {   // (0.0.59, from the icon: a glow round the heart, a trail under it, a highlight on it)
      const hx = g.hx * k, hy = (g.hy + 6) * k, gl = c.createRadialGradient(hx, hy, 0, hx, hy, 20 * k);
      gl.addColorStop(0, "rgba(253, 164, 175, 0.6)"); gl.addColorStop(1, "rgba(253, 164, 175, 0)"); c.fillStyle = gl; c.beginPath(); c.arc(hx, hy, 20 * k, 0, 7); c.fill();
      for (let i = 1; i <= 4; i++) { c.fillStyle = `rgba(253, 164, 175, ${0.75 - i * 0.15})`; c.beginPath(); c.arc(hx, hy + (6 + i * 9) * k, (3.4 - i * 0.5) * k, 0, 7); c.fill(); }
      heart(c, hx, hy, 7 * k, "#f43f5e"); heart(c, hx - 2 * k, hy - 2 * k, 2.2 * k, "rgba(254, 205, 211, 0.75)"); }
    // (hearts bursting out of a visitor reached, drifting up and away)
    S.bursts = S.bursts.filter(b => now - b.t < 1100);
    for (const b of S.bursts) { const q = (now - b.t) / 1100;
      { const gl = c.createRadialGradient(b.x * k, b.y * k, 0, b.x * k, b.y * k, 40 * k); gl.addColorStop(0, `rgba(253, 164, 175, ${0.55 * (1 - q)})`); gl.addColorStop(1, "rgba(253, 164, 175, 0)");   // (0.0.59: a glow, and sparkles)
        c.fillStyle = gl; c.beginPath(); c.arc(b.x * k, b.y * k, 40 * k, 0, 7); c.fill();
        c.fillStyle = `rgba(255, 255, 255, ${1 - q})`; for (let i = 0; i < 4; i++) { const a = i * 1.57 + b.spin * 3 + 0.8, r = (14 + q * 30) * k, x = b.x * k + Math.cos(a) * r, y = b.y * k + Math.sin(a) * r, z = 3 * k * (1 - q);
          c.beginPath(); c.moveTo(x, y - z); c.lineTo(x + z * 0.25, y - z * 0.25); c.lineTo(x + z, y); c.lineTo(x + z * 0.25, y + z * 0.25); c.lineTo(x, y + z); c.lineTo(x - z * 0.25, y + z * 0.25); c.lineTo(x - z, y); c.lineTo(x - z * 0.25, y - z * 0.25); c.closePath(); c.fill(); } }
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + b.spin, r = 6 + q * 46; c.globalAlpha = 1 - q;
        heart(c, (b.x + Math.cos(a) * r) * k, (b.y + Math.sin(a) * r - q * 20) * k, (4 + 2 * (i % 2)) * (1 - q * 0.4) * k, i % 2 ? "#fb7185" : "#f9a8d4"); } }
    c.globalAlpha = 1;
    S.pops = S.pops.filter(p => now - p.t < 900);
    for (const p of S.pops) { const q = (now - p.t) / 900; c.globalAlpha = 1 - q; c.fillStyle = p.col; c.font = `700 ${Math.round(15 * k)}px system-ui`; c.textAlign = "center"; c.fillText(p.text, p.x * k, (p.y - q * 24) * k); }
    c.globalAlpha = 1; c.textAlign = "center";
    { const vg = c.createRadialGradient(cv.width / 2, cv.height * 0.45, cv.width * 0.55, cv.width / 2, cv.height * 0.45, cv.height * 0.75);   // (0.0.59: a vignette)
      vg.addColorStop(0, "rgba(0, 0, 0, 0)"); vg.addColorStop(1, "rgba(0, 0, 0, 0.3)"); c.fillStyle = vg; c.fillRect(0, 0, cv.width, cv.height); }
    // (the rainbow meter, along the top: the town's floors turned, the visitors left)
    { const n = painted(g), x0 = 150 * k, w = 300 * k, y0 = 14 * k, h = 12 * k;
      c.fillStyle = "rgba(255, 255, 255, 0.12)"; c.beginPath(); c.roundRect(x0, y0, w, h, 6 * k); c.fill();
      for (let i = 0; i < n; i++) { c.fillStyle = rainbow(i, FULL); c.fillRect(x0 + i * w / FULL, y0, w / FULL + 0.5, h); }
      c.fillStyle = "#e0e7ff"; c.font = `600 ${Math.round(13 * k)}px system-ui`; c.textAlign = "right"; c.fillText("🌈", x0 - 8 * k, y0 + 11 * k);
      c.textAlign = "left"; c.fillText(`${left(g)} 👾`, x0 + w + 10 * k, y0 + 11 * k); c.textAlign = "center"; }
    if (all && !g.wait && !g.over) {   // (now's the time: the seconds left for the last heart)
      const sec = Math.ceil(g.glow / 60);
      c.fillStyle = "#fff1f2"; c.font = `800 ${Math.round(30 * k)}px system-ui`; c.fillText(`💗 Now! ${sec}`, 300 * k, 560 * k);
    }
    if (g.over) {
      c.fillStyle = "rgba(10, 6, 25, 0.78)"; c.fillRect(0, 320 * k, 600 * k, 170 * k);
      c.fillStyle = "#ffffff"; c.font = `700 ${Math.round(24 * k)}px system-ui`; c.fillText(VERDICT[g.verdict] || "", 300 * k, 370 * k);
      c.font = `700 ${Math.round(26 * k)}px system-ui`; c.fillText(`💗 ${g.hearts} hearts · ⭐ ${g.wins} just right`, 300 * k, 415 * k);
      c.font = `${Math.round(17 * k)}px system-ui`; c.fillText("New game: the button, a tap, or Enter", 300 * k, 455 * k);
    } else if (g.wait > 0) {
      c.fillStyle = "rgba(10, 6, 25, 0.6)"; c.fillRect(0, 330 * k, 600 * k, 110 * k);
      c.fillStyle = g.verdict === 3 ? "#fde68a" : "#e0e7ff"; c.font = `800 ${Math.round((g.verdict === 3 ? 34 : 24) * k)}px system-ui`;
      c.fillText(VERDICT[g.verdict] || "", 300 * k, 385 * k);
      c.font = `${Math.round(16 * k)}px system-ui`; c.fillStyle = "#e0e7ff";
      c.fillText(g.verdict === 3 ? `Next: wave ${g.wave + 2}` : `${g.tries} ${g.tries === 1 ? "try" : "tries"} left: wave ${g.wave + 1} again`, 300 * k, 420 * k);
    }
  }
  function bar() {
    const g = S.game; if (!g) return;
    $("points").textContent = `💗 ${g.hearts}`; $("lives").textContent = "🎈".repeat(Math.max(0, g.tries));
    $("level").textContent = `wave ${g.wave + 1}` + (g.wins ? ` · ⭐ ${g.wins}` : "");
    $("left").textContent = `🌈 ${painted(g)} of ${FULL} floors · ${left(g)} visitors`;
    const ms = S.stepMs.length ? [...S.stepMs].sort((a, b) => a - b)[S.stepMs.length >> 1] : 0;
    $("info").textContent = `Your best on this device: ${S.best} hearts.` + (ms ? ` A step of Hazel's rules: ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms.` : "");
    if (window.OracleFs) window.OracleFs.empty(!g || !!g.over);
  }

  // ---- a game, and every frame a step of the rules
  function newGame() {
    const h = H(); if (!h) return;
    S.game = h.start(1 + Math.floor(Math.random() * 2000000000)); S.pops = []; S.bursts = []; S.flashes = []; S.arcs = []; S.fire = false; S.restartAt = 0;
    if (SND) { SND.start(); SND.tune(0); }
    if (W && W.on) W.start(0);
    bar(); draw();
  }
  // (what a step did, seen and heard: a heart sent, a visitor reached (hearts burst out of it), a rainbow dropped, a floor
  // turned (the next note up the scale), the march, the town all rainbow, a wave's end, a wave's start and its tune)
  function heard(g, g2) {
    const now = performance.now(), same = g2.hit !== 7;
    if (same) {
      g.aliens.forEach((a, i) => { if (a && !g2.aliens[i]) { const x = g.fx + (i % 9) * 48 + 16, y = g.fy + Math.floor(i / 9) * 40 + 12;
        S.bursts.push({ x, y, t: now, spin: Math.random() }); S.pops.push({ x, y: y - 14, text: "+💗", t: now, col: "#fda4af" }); if (SND) SND.hit(a); } });
      const before = painted(g);
      g2.town.forEach((f, s) => { for (let i = g.town[s]; i < f; i++) S.flashes.push({ s, i, t: now }); });
      const gone = g.drops.filter(d => !g2.drops.some(e => e.x === d.x && e.y === d.y + 4));
      g2.town.forEach((f, s) => { if (f > g.town[s]) { const d = gone.find(d => d.x < BX(s) || d.x >= BX(s) + 72); if (d) S.arcs.push({ x: d.x, s, t: now }); } });
      if (SND) { for (let p = before; p < painted(g2); p++) SND.paint(p); }
    }
    if (!SND) return;
    if (g.hy < 0 && g2.hy >= 0) SND.shot();
    if (same && g2.drops.length > g.drops.length) SND.bomb();
    if (same && !g2.wait && (g2.fx !== g.fx || g2.fy !== g.fy)) SND.march();
    if (g2.glow > 0 && !(g.glow > 0) && !g2.wait) SND.glow();
    if (g2.hit >= 3 && g2.hit <= 6) { if (g2.over) SND.stop(); (g2.hit === 3 ? SND.cleared : g2.hit === 5 ? SND.soon : SND.late)(); if (g2.over) SND.over(); }
    if (g2.hit === 7) { SND.start(); SND.tune(g2.wave); }
  }
  function oneStep(h) {
    const g = S.game;
    let move = 0, fire = false;
    if (W && W.on) { const t1 = performance.now(), c = h.robot(g); W.think(0, performance.now() - t1); move = c.move; fire = c.fire; }
    else {
      move = S.held.left ? -1 : S.held.right ? 1 : S.aimX !== null ? (S.aimX > g.cx + 4 ? 1 : S.aimX < g.cx - 4 ? -1 : 0) : 0;
      fire = S.fire; if (g.hy < 0 || !S.fire) S.fire = false;
    }
    const t0 = performance.now(), g2 = h.step(g, move, fire);
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 60) S.stepMs.shift();
    heard(g, g2); S.game = g2;
    if (g2.over && !(W && W.on) && g2.hearts > S.best) { S.best = g2.hearts; keep("best-hearts", S.best); }
    if (g2.over && W && W.on) { W.end(`🤖 Hazel's game: ${g2.hearts} hearts, ${g2.wins} ${g2.wins === 1 ? "wave" : "waves"} just right`); S.restartAt = performance.now() + 3000; }
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

  // ---- the controls: ⬅️ ➡️ held (or the keys), a finger along the field (the launcher follows it), 💗, ⬆️, Enter or a tap to
  // send a heart (one in the air at a time; a heart asked for waits until it can go)
  const fieldX = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 600; };
  cv.addEventListener("pointerdown", e => { if (W && W.on) return; if (S.game && S.game.over) { newGame(); return; } S.aimX = fieldX(e); S.fire = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => { if (W && W.on) return; if (e.buttons) S.aimX = fieldX(e); });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, () => { S.aimX = null; });
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  addEventListener("keydown", e => {
    if (typing(e) || (W && W.on)) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); S.held.left = true; }
    else if (e.key === "ArrowRight") { e.preventDefault(); S.held.right = true; }
    else if (e.key === "Enter" && S.game && S.game.over) newGame();
    else if (e.key === "ArrowUp" || e.key === "Enter" || e.key === "f" || e.key === "F") { e.preventDefault(); S.fire = true; }
  });
  addEventListener("keyup", e => { if (e.key === "ArrowLeft") S.held.left = false; else if (e.key === "ArrowRight") S.held.right = false; });
  const hold = (id, side) => { const b = $(id);
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("held"); if (!(W && W.on)) S.held[side] = true; });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { b.classList.remove("held"); S.held[side] = false; }); };
  hold("left", "left"); hold("right", "right");
  $("launch").addEventListener("pointerdown", e => { e.preventDefault(); if (!(W && W.on)) S.fire = true; });
  $("new").addEventListener("click", newGame);
  // (0.0.55: the music and the sounds, each a switch, remembered; any tap or key wakes the chip, which browsers ask for first)
  if (SND) {
    const sw = (id, get, set) => { const b = $(id); b.setAttribute("aria-pressed", String(get()));
      b.addEventListener("click", () => { set(!get()); b.setAttribute("aria-pressed", String(get())); if (get()) SND.gesture(S.game && !S.game.over ? S.game.wave : null); b.blur(); }); };
    sw("music", () => SND.musicOn, on => { SND.music(on); if (on && S.game && !S.game.over) SND.tune(S.game.wave); });
    sw("sfx", () => SND.soundsOn, on => SND.sounds(on));
    // (0.0.56) a volume slider beside each switch (shared/volume.js): how loud the music, and the sounds, each kept on this device
    if (window.HazelVolume) {
      window.HazelVolume.slider($("music"), { label: "Music volume", get: () => SND.volumeOf("music"), set: v => SND.setVolume("music", v), isOn: () => SND.musicOn });
      window.HazelVolume.slider($("sfx"), { label: "Sounds volume", get: () => SND.volumeOf("sfx"), set: v => SND.setVolume("sfx", v), isOn: () => SND.soundsOn, hear: () => SND.hit(2) });
    }
    for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => SND.gesture(S.game && !S.game.over ? S.game.wave : null), true);
  } else for (const id of ["music", "sfx"]) $(id).hidden = true;
  addEventListener("resize", () => draw());
  if (window.OracleFs) window.OracleFs.offer({ label: "🚀 New game", title: "A new game, from the first wave", cast: newGame });
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["Hazel"], label: "🤖 Hazel plays for you", what: "the game",
    more: () => S.game ? `; ${S.game.hearts} hearts, wave ${S.game.wave + 1}` : "",
    onChange: on => {
      S.held = { left: false, right: false }; S.fire = false; S.aimX = null;
      if (!on) { W.stop(); return; }
      if (!H()) return;
      if (!S.game || S.game.over) newGame();
      W.start(0);
    },
  }) : null;
  // (0.0.53) ⏸ the pause (shared/pause.js): its button and the space bar; no step runs while paused
  const P = window.HazelPause ? window.HazelPause.make({ into: $("new").parentElement, over: $("field").parentElement,
    onChange: paused => { if (!SND) return; if (paused) SND.stop(); else if (S.game && !S.game.over) SND.tune(S.game.wave); } }) : null;   // (the music stops while paused)

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), every step, without loading Hazel's library or building the program. Hazel loads if you edit the rules.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules move the visitors…"; return; }
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
    c.src = "compiled.js?v=0.0.57"; c.async = true;
    c.onload = () => { const v = window.StarWaveCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newGame(); }
      else if (!v) { S.compiledError = "it ran, but gave no Star wave"; loadLib(); } };
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
    holder: $("advanced"), name: "Star wave", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "300 steps of a game with the robot choosing each one, through Hazel",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: 300 steps of a game…");
      let g = h.start(12345); const t0 = performance.now();
      for (let n = 0; n < 300 && !g.over; n++) { const c = h.robot(g); g = h.step(g, c.move, c.fire); }
      const ms = (performance.now() - t0) / 300;
      return { data: { step: +ms.toFixed(3) }, text: [`a step and the robot's choice through Hazel: ${ms.toFixed(2)} ms`] };
    },
  });
  // (for checking the page where no frames are drawn, a browser pane hidden: ?test=1 lets a script run steps and draw)
  if (Q.has("test")) window.StarWaveTest = { S, newGame, steps: n => { const h = H(); for (let i = 0; i < n && S.game && !S.game.over; i++) oneStep(h); draw(); bar(); return S.game; }, auto: () => W };
  document.body.classList.add("js");
  draw(); bar();
})();
