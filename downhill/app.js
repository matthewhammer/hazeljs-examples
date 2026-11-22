// hazeljs-examples, Downhill (ticket 823; Matthew, 2026-11-22: "let's do a downhill ski game", "let's use hazel for the physics,
// as with pinball", and "For each game, be sure to include 'automated gameplay' mode ... that gameplay should also be Hazel
// code"). The page: the slope drawn on a canvas, every frame a step of Hazel's rules (Downhill.step: the heading and crouch,
// the snow's pull and drag, falls, jumps, bumps, gates, the snowball), the course a stretch at a time as Hazel makes it
// (Downhill.course), and 🤖 Hazel plays for you, the robot in Hazel (Downhill.robot) choosing each step's turn and crouch. The
// rules compiled ahead of time by hazel-jit (compiled.js) when it is here, else, and once they are edited, run by hazeljs
// (slower: a step there takes tens of milliseconds, so the run goes in slow motion).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "downhill", MODULES = ["Downhill"];
  const TAIL = "(start = Downhill.start, step = Downhill.step, course = Downhill.course, robot = Downhill.robot)";
  const KEY = "hazeljs-examples/downhill/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: the rules, the run (a Hazel value: places in hundredths of a unit, 50 units a metre), what is held, the
  // course's stretches as Hazel made them, the ski tracks, the gates passed, words floating up, the best run
  const S = { built: null, libAt: 0, libFailed: false, compiledError: "", game: null, chase: kept("chase", true), best: kept("best", 0),
              held: { left: false, right: false, tuck: false }, turn: 0, repeat: 0, wait: 0, stretches: new Map(), seed: 0,
              tracks: [], passed: new Set(), pops: [], camX: 0, stepMs: [], banner: null, restartAt: 0 };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  const C = 100, METRE = 50;   // (hundredths a unit, units a metre)
  $("chase").checked = !!S.chase;

  // ---- the course: stretch k as Hazel makes it (600 units down the hill each), kept, as it is the same for the same seed
  const STRETCH = 600;
  function stretch(k) {
    const key = S.seed + ":" + k;
    if (!S.stretches.has(key)) { let ts = []; try { ts = H().course(S.seed, k) || []; } catch (e) { ts = []; } S.stretches.set(key, ts); if (S.stretches.size > 60) S.stretches.delete(S.stretches.keys().next().value); }
    return S.stretches.get(key);
  }

  // ---- drawing: the canvas is 600 wide and shows 640 units across, the skier a third of the way down it
  const cv = $("slope"), ctx = cv.getContext("2d");
  const VIEW = 640;
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, Math.round(r.width * d)), h = Math.max(260, Math.round(r.height * d));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  const hash = (a, b) => { let x = (a * 374761393 + b * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177 | 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  function tree(c, x, y, k) {
    c.fillStyle = "rgba(60, 90, 140, 0.18)"; c.beginPath(); c.ellipse(x + 6 * k, y + 2 * k, 18 * k, 6 * k, 0, 0, 7); c.fill();
    c.fillStyle = "#6b4423"; c.fillRect(x - 3 * k, y - 10 * k, 6 * k, 11 * k);
    const tiers = [[0, 20, 22], [-14, 16, 20], [-27, 11, 17]];
    for (const [dy, hw, ht] of tiers) {
      c.fillStyle = "#1f6b3a"; c.beginPath(); c.moveTo(x - hw * k, y + (dy - 8) * k); c.lineTo(x + hw * k, y + (dy - 8) * k); c.lineTo(x, y + (dy - 8 - ht) * k); c.closePath(); c.fill();
      c.fillStyle = "#2f8a4e"; c.beginPath(); c.moveTo(x, y + (dy - 8 - ht) * k); c.lineTo(x + hw * k, y + (dy - 8) * k); c.lineTo(x + hw * 0.3 * k, y + (dy - 8) * k); c.closePath(); c.fill();
      c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(x - hw * 0.35 * k, y + (dy - 8 - ht * 0.62) * k); c.lineTo(x, y + (dy - 8 - ht) * k); c.lineTo(x + hw * 0.35 * k, y + (dy - 8 - ht * 0.62) * k); c.closePath(); c.fill();
    }
  }
  function rock(c, x, y, k) {
    c.fillStyle = "rgba(60, 90, 140, 0.18)"; c.beginPath(); c.ellipse(x + 3 * k, y + 2 * k, 15 * k, 5 * k, 0, 0, 7); c.fill();
    c.fillStyle = "#7d8591"; c.beginPath(); c.moveTo(x - 14 * k, y); c.lineTo(x - 10 * k, y - 10 * k); c.lineTo(x - 2 * k, y - 15 * k); c.lineTo(x + 9 * k, y - 12 * k); c.lineTo(x + 14 * k, y - 2 * k); c.lineTo(x + 10 * k, y + 2 * k); c.closePath(); c.fill();
    c.fillStyle = "#a3abb6"; c.beginPath(); c.moveTo(x - 10 * k, y - 10 * k); c.lineTo(x - 2 * k, y - 15 * k); c.lineTo(x + 2 * k, y - 8 * k); c.lineTo(x - 6 * k, y - 5 * k); c.closePath(); c.fill();
    c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(x - 9 * k, y - 11 * k); c.lineTo(x - 2 * k, y - 15 * k); c.lineTo(x + 8 * k, y - 12 * k); c.lineTo(x + 2 * k, y - 11 * k); c.closePath(); c.fill();
  }
  function ramp(c, x, y, k) {
    c.fillStyle = "rgba(60, 90, 140, 0.22)"; c.beginPath(); c.ellipse(x, y + 4 * k, 28 * k, 6 * k, 0, 0, 7); c.fill();
    c.fillStyle = "#cfe3f7"; c.beginPath(); c.moveTo(x - 24 * k, y - 14 * k); c.lineTo(x + 24 * k, y - 14 * k); c.lineTo(x + 26 * k, y + 4 * k); c.lineTo(x - 26 * k, y + 4 * k); c.closePath(); c.fill();
    c.fillStyle = "#8fb6de"; c.fillRect(x - 26 * k, y + 1 * k, 52 * k, 4 * k);
    c.strokeStyle = "#f59e0b"; c.lineWidth = 3 * k; c.beginPath(); c.moveTo(x - 8 * k, y - 2 * k); c.lineTo(x, y - 10 * k); c.lineTo(x + 8 * k, y - 2 * k); c.stroke();
  }
  function bumps(c, x, y, w, k) {
    for (let i = 0; i < 5; i++) {
      const bx = x + (hash(x + i, y) - 0.5) * w * 1.4 * k, by = y + (hash(y + i, x) - 0.5) * w * 0.8 * k;
      c.fillStyle = "#d5e4f3"; c.beginPath(); c.ellipse(bx + 3 * k, by + 2 * k, 11 * k, 5 * k, 0, 0, 7); c.fill();
      c.fillStyle = "#ffffff"; c.beginPath(); c.ellipse(bx, by, 11 * k, 5 * k, 0, 0, 7); c.fill();
    }
  }
  function flag(c, x, y, k, col, side) {
    c.strokeStyle = "#374151"; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 30 * k); c.stroke();
    c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 30 * k); c.lineTo(x + side * 14 * k, y - 25 * k); c.lineTo(x, y - 20 * k); c.closePath(); c.fill();
  }
  // the skier, from their heading (-3 to 3): skis turned that way, the body over them; crouched; lying in the snow; in the air
  function skier(c, x, y, g, k, crouch) {
    const h = g.heading, a = [0, 0.42, 0.87, 1.5708][Math.abs(h)] * Math.sign(h), up = (g.air / C) * k * 0.45;
    c.fillStyle = "rgba(60, 90, 140, 0.25)"; c.beginPath(); c.ellipse(x, y + 2 * k, 13 * k, 4 * k, 0, 0, 7); c.fill();
    if (g.down > 0) {   // (lying: the skis crossed, a star going round)
      c.strokeStyle = "#e11d48"; c.lineWidth = 3 * k; c.beginPath(); c.moveTo(x - 14 * k, y - 6 * k); c.lineTo(x + 14 * k, y + 2 * k); c.moveTo(x - 12 * k, y + 3 * k); c.lineTo(x + 13 * k, y - 7 * k); c.stroke();
      c.fillStyle = "#2563eb"; c.beginPath(); c.ellipse(x, y - 5 * k, 11 * k, 6 * k, 0.3, 0, 7); c.fill();
      c.fillStyle = "#f2c9a0"; c.beginPath(); c.arc(x + 11 * k, y - 9 * k, 5 * k, 0, 7); c.fill();
      const t = performance.now() / 160; c.font = `${Math.round(12 * k)}px system-ui`; c.textAlign = "center"; c.fillText("💫", x + 11 * k + Math.cos(t) * 10 * k, y - 18 * k + Math.sin(t) * 4 * k);
      return;
    }
    c.save(); c.translate(x, y - up);
    const s = 1 + Math.min(0.25, up / (60 * k));
    c.scale(s, s);
    // skis, turned to the heading (the view looks down the hill, so a heading's angle turns them from vertical)
    c.save(); c.rotate(-a);
    c.strokeStyle = "#e11d48"; c.lineWidth = 3 * k; c.lineCap = "round";
    c.beginPath(); c.moveTo(-4 * k, -12 * k); c.lineTo(-4 * k, 14 * k); c.moveTo(4 * k, -12 * k); c.lineTo(4 * k, 14 * k); c.stroke();
    c.restore();
    const bend = crouch ? 5 : 0;
    // legs, body, arms with poles, the head and its hat
    c.fillStyle = "#1e3a8a"; c.fillRect(-5 * k, (-10 + bend) * k, 10 * k, 9 * k);
    c.fillStyle = "#f97316"; c.beginPath(); c.ellipse(0, (-16 + bend) * k, 8 * k, 9 * k, 0, 0, 7); c.fill();
    c.strokeStyle = "#374151"; c.lineWidth = 1.5 * k; c.beginPath(); c.moveTo(-8 * k, (-16 + bend) * k); c.lineTo(-12 * k, 2 * k); c.moveTo(8 * k, (-16 + bend) * k); c.lineTo(12 * k, 2 * k); c.stroke();
    c.fillStyle = "#f2c9a0"; c.beginPath(); c.arc(0, (-29 + bend * 1.6) * k, 6 * k, 0, 7); c.fill();
    c.fillStyle = "#16a34a"; c.beginPath(); c.arc(0, (-31 + bend * 1.6) * k, 6.5 * k, Math.PI, 0); c.fill();
    c.fillStyle = "#ffffff"; c.beginPath(); c.arc(0, (-38 + bend * 1.6) * k, 2.5 * k, 0, 7); c.fill();
    c.restore();
  }
  function snowball(c, x, y, r, k, roll) {
    c.fillStyle = "rgba(60, 90, 140, 0.25)"; c.beginPath(); c.ellipse(x, y + r * 0.15 * k, r * 1.05 * k, r * 0.3 * k, 0, 0, 7); c.fill();
    const gr = c.createRadialGradient(x - r * 0.35 * k, y - r * 1.35 * k, r * 0.1 * k, x, y - r * k, r * 1.05 * k);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.7, "#e6f0fb"); gr.addColorStop(1, "#b9cde6");
    c.fillStyle = gr; c.beginPath(); c.arc(x, y - r * k, r * k, 0, 7); c.fill();
    c.strokeStyle = "rgba(120, 150, 190, 0.45)"; c.lineWidth = 2 * k;
    for (let i = 0; i < 3; i++) { const a = roll + i * 2.1; c.beginPath(); c.arc(x, y - r * k, r * 0.7 * k, a, a + 0.9); c.stroke(); }
    c.fillStyle = "#6b4423"; c.fillRect(x + Math.cos(roll) * r * 0.5 * k - 6 * k, y - r * k + Math.sin(roll) * r * 0.5 * k, 12 * k, 2 * k);
  }
  function draw() {
    fit();
    const W = cv.width, Hh = cv.height, k = W / VIEW, g = S.game;
    ctx.fillStyle = "#f4f8fd"; ctx.fillRect(0, 0, W, Hh);
    if (!g) return;
    const gx = g.x / C, gy = g.y / C;
    S.camX += (Math.max(-1000 + VIEW / 2, Math.min(1000 - VIEW / 2, gx)) - S.camX) * 0.12;
    const top = gy - (Hh / k) * 0.3, sx = x => (x - S.camX) * k + W / 2, sy = y => (y - top) * k;
    // the snow's speckle, fixed to the slope
    ctx.fillStyle = "rgba(150, 180, 215, 0.35)";
    for (let cy = Math.floor(top / 60) * 60; cy < top + Hh / k + 60; cy += 60) for (let cx = Math.floor((S.camX - VIEW) / 60) * 60; cx < S.camX + VIEW; cx += 60) {
      const hx = hash(cx, cy); ctx.fillRect(sx(cx + hx * 60), sy(cy + hash(cy, cx) * 60), 2 * k, 1.2 * k);
    }
    // the course's edge (blue posts) and the fences
    for (const ex of [-800, 800]) for (let py = Math.floor(top / 120) * 120; py < top + Hh / k; py += 120) { ctx.fillStyle = "#60a5fa"; ctx.fillRect(sx(ex) - 1.5 * k, sy(py) - 10 * k, 3 * k, 10 * k); }
    for (const fx of [-1000, 1000]) { ctx.strokeStyle = "#f97316"; ctx.lineWidth = 3 * k; ctx.setLineDash([8 * k, 6 * k]); ctx.beginPath(); ctx.moveTo(sx(fx), 0); ctx.lineTo(sx(fx), Hh); ctx.stroke(); ctx.setLineDash([]); }
    // the ski tracks
    ctx.strokeStyle = "rgba(140, 165, 200, 0.55)"; ctx.lineWidth = 1.4 * k;
    for (const off of [-4, 4]) { ctx.beginPath(); let on = false;
      for (const p of S.tracks) { if (p.air) { on = false; continue; } const X = sx(p.x + off), Y = sy(p.y); if (!on) { ctx.moveTo(X, Y); on = true; } else ctx.lineTo(X, Y); }
      ctx.stroke(); }
    // the things in view, the skier and the snowball, nearest the bottom drawn last
    const items = [];
    for (let s = Math.floor((top - 100) / STRETCH); s <= Math.floor((top + Hh / k + 100) / STRETCH); s++) for (const t of stretch(s)) items.push({ y: t.y, t });
    items.push({ y: gy, me: true });
    if (g.rolling) items.push({ y: g.by / C, ball: true });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.me) { skier(ctx, sx(gx), sy(gy), g, k, S.tucking); continue; }
      if (it.ball) { snowball(ctx, sx(g.bx / C), sy(g.by / C), g.br / C, k, g.by / C / 30); continue; }
      const t = it.t, X = sx(t.x), Y = sy(t.y);
      if (Y < -80 * k || Y > Hh + 80 * k || X < -100 * k || X > W + 100 * k) continue;
      if (t.kind === 0) tree(ctx, X, Y, k);
      else if (t.kind === 1) rock(ctx, X, Y, k);
      else if (t.kind === 2) ramp(ctx, X, Y, k);
      else if (t.kind === 3) bumps(ctx, X, Y, t.w, k);
      else if (t.kind === 4) { const done = S.passed.has(t.x + ":" + t.y); flag(ctx, sx(t.x - t.w / 2), Y, k, done ? "#f59e0b" : "#dc2626", 1); flag(ctx, sx(t.x + t.w / 2), Y, k, done ? "#f59e0b" : "#2563eb", -1); }
    }
    // the snowball, if it is behind and out of sight: an arrow at the top, and how far
    if (g.rolling && sy(g.by / C) < 0) {
      const behind = Math.round((gy - g.by / C) / METRE), X = Math.max(20 * k, Math.min(W - 20 * k, sx(g.bx / C)));
      ctx.fillStyle = "#1e3a8a"; ctx.font = `600 ${Math.round(13 * k)}px system-ui`; ctx.textAlign = "center"; ctx.fillText(`❄️ the snowball, ${behind} m behind ⬆`, X, 18 * k);
    }
    // words floating up
    const now = performance.now();
    S.pops = S.pops.filter(p => now - p.t < 1100);
    for (const p of S.pops) { const u = (now - p.t) / 1100; ctx.globalAlpha = 1 - u; ctx.fillStyle = p.col || "#1e3a8a"; ctx.font = `700 ${Math.round(15 * k)}px system-ui`; ctx.textAlign = "center"; ctx.fillText(p.text, sx(p.x), sy(p.y) - 40 * k - u * 30 * k); }
    ctx.globalAlpha = 1;
    if (g.over) {
      ctx.fillStyle = "rgba(15, 30, 60, 0.6)"; ctx.fillRect(0, Hh * 0.38, W, Hh * 0.2);
      ctx.fillStyle = "#ffffff"; ctx.font = `700 ${Math.round(22 * k)}px system-ui`; ctx.textAlign = "center";
      ctx.fillText(`❄️ The snowball got you, ${Math.round(gy / METRE)} m down`, W / 2, Hh * 0.47);
      ctx.font = `${Math.round(14 * k)}px system-ui`; ctx.fillText("New run: the button, or Enter", W / 2, Hh * 0.53);
    }
  }
  function bar() {
    const g = S.game; if (!g) return;
    const m = Math.round(g.y / C / METRE);
    $("metres").textContent = `⛷️ ${m} m`; $("points").textContent = `⭐ ${g.score}`; $("gates").textContent = `🚩 ${g.gates}`; $("jumps").textContent = `🦘 ${g.jumps}`;
    $("speed").textContent = `${Math.round(g.speed / C * 60 / METRE * 3.6)} km/h`;
    const ms = S.stepMs.length ? [...S.stepMs].sort((a, b) => a - b)[S.stepMs.length >> 1] : 0;
    $("info").textContent = `Your best run on this device: ${S.best} m.` + (ms ? ` A step of Hazel's rules: ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms.` : "");
    if (window.OracleFs) window.OracleFs.empty(!g || !!g.over);
  }

  // ---- a run: a new one from a new seed, and every frame a step of the rules
  function newRun() {
    const h = H(); if (!h) return;
    S.seed = 1 + Math.floor(Math.random() * 2000000000); S.stretches.clear();
    S.game = h.start(S.seed, !!S.chase); S.tracks = []; S.passed.clear(); S.pops = []; S.camX = 0; S.turn = 0; S.wait = 0; S.restartAt = 0;
    if (W && W.on) W.start(0);
    bar(); draw();
  }
  // what a step did: words for a fall, a jump, a gate and the snowball's catch; the gate passed, kept gold
  function heard(g, g2) {
    const x = g2.x / C, y = g2.y / C;
    if (g2.hit === 1 || g2.hit === 2) S.pops.push({ x, y, text: g2.hit === 1 ? "🌲 Oof!" : "🪨 Oof!", t: performance.now(), col: "#b91c1c" });
    if (g2.hit === 3) S.pops.push({ x, y, text: "🦘 Jump! +25", t: performance.now(), col: "#b45309" });
    if (g2.hit === 4) {
      S.pops.push({ x, y, text: "🚩 +50", t: performance.now(), col: "#15803d" });
      for (const t of [...stretch(Math.floor(y / STRETCH) - 1), ...stretch(Math.floor(y / STRETCH))]) if (t.kind === 4 && t.y > g.y / C - 1 && t.y <= y + 1) S.passed.add(t.x + ":" + t.y);
    }
  }
  function oneStep(h) {
    const g = S.game;
    let turn = 0, tuck = false;
    if (W && W.on) {
      // (🤖: the robot, in Hazel, chooses the turn and the crouch; a turn at most every sixth step, as a skier leans)
      const t1 = performance.now(), c = h.robot(g); W.think(0, performance.now() - t1);
      if (S.wait > 0) S.wait--; else if (c.turn) { turn = c.turn; S.wait = 6; }
      tuck = !!c.tuck;
    } else {
      // (a press turns at once; held, it turns again every tenth step)
      turn = S.turn; S.turn = 0;
      if (!turn && (S.held.left || S.held.right)) { if (++S.repeat >= 10) { S.repeat = 0; turn = S.held.left ? -1 : 1; } } else S.repeat = 0;
      tuck = S.held.tuck;
    }
    S.tucking = tuck && Math.abs(g.heading) <= 1 && g.down === 0;
    const t0 = performance.now(), g2 = h.step(g, turn, tuck);
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 60) S.stepMs.shift();
    heard(g, g2);
    if (g2.y !== g.y || g2.x !== g.x) { S.tracks.push({ x: g2.x / C, y: g2.y / C, air: g2.air > 0 }); if (S.tracks.length > 400) S.tracks.shift(); }
    S.game = g2;
    const m = Math.round(g2.y / C / METRE);
    if (g2.over && !(W && W.on) && m > S.best) { S.best = m; keep("best", S.best); }
    if (g2.over && W && W.on) { W.end(`🤖 Hazel's run: ${m} m, ${g2.score} points`); S.restartAt = performance.now() + 3000; }
    return g2;
  }
  let lastBar = 0, acc = 0, lastT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const h = H(), g = S.game;
    // (🤖 at a run's end: a new run, three seconds on)
    if (g && g.over && W && W.on && S.restartAt && t > S.restartAt) newRun();
    if (!h || !g || g.over || document.hidden) { lastT = t; if (g) draw(); return; }
    // (steps at 60 a second whatever the screen's rate; 🤖's pace: slowly half speed, at a walk the run's own, briskly twice, at
    // full speed four times; at most a few a frame, so a slow device runs slower rather than skipping)
    const auto = W && W.on, rate = auto ? ({ 900: 0.5, 450: 1, 120: 2, 0: 4 }[W.pace] || 1) : 1;
    acc += Math.min(100, t - (lastT || t)) * rate * 60 / 1000; lastT = t;
    let n = 0;
    try { while (acc >= 1 && n < 6 && !S.game.over) { oneStep(h); acc -= 1; n++; } } catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; drawStatus(); return; }
    if (n === 6) acc = 0;
    if (auto) W.show();
    draw();
    if (t - lastBar > 150) { lastBar = t; bar(); }
  }
  requestAnimationFrame(frame);

  // ---- the controls: the keys (← → turn, ↓ or the space bar crouch, Enter a new run when one is over), the buttons (held), a
  // tap on the slope's left or right third (a turn) or its middle (crouching while held)
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  addEventListener("keydown", e => {
    if (typing(e) || (W && W.on)) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); if (!e.repeat) { S.turn = e.key === "ArrowLeft" ? -1 : 1; S.repeat = 0; } S.held[e.key === "ArrowLeft" ? "left" : "right"] = true; }
    else if (e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); S.held.tuck = true; }
    else if (e.key === "Enter" && S.game && S.game.over) newRun();
  });
  addEventListener("keyup", e => {
    if (e.key === "ArrowLeft") S.held.left = false; else if (e.key === "ArrowRight") S.held.right = false;
    else if (e.key === "ArrowDown" || e.key === " ") S.held.tuck = false;
  });
  const hold = (id, on, off) => { const b = $(id);
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("held"); on(); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { b.classList.remove("held"); off(); }); };
  hold("left", () => { if (!(W && W.on)) { S.turn = -1; S.repeat = 0; S.held.left = true; } }, () => { S.held.left = false; });
  hold("right", () => { if (!(W && W.on)) { S.turn = 1; S.repeat = 0; S.held.right = true; } }, () => { S.held.right = false; });
  hold("tuck", () => { S.held.tuck = true; }, () => { S.held.tuck = false; });
  cv.addEventListener("pointerdown", e => {
    if (W && W.on) return;
    if (S.game && S.game.over) { newRun(); return; }
    const r = cv.getBoundingClientRect(), u = (e.clientX - r.left) / r.width;
    if (u < 1 / 3) S.turn = -1; else if (u > 2 / 3) S.turn = 1; else { S.held.tuck = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); }
  });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, () => { S.held.tuck = false; });
  $("new").addEventListener("click", newRun);
  $("chase").addEventListener("change", () => { S.chase = $("chase").checked; keep("chase", S.chase); newRun(); });
  addEventListener("resize", () => draw());
  if (window.OracleFs) window.OracleFs.offer({ label: "⛷️ New run", title: "A new run, down a new course", cast: newRun });
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["Hazel"], label: "🤖 Hazel plays for you", what: "the run",
    more: () => S.game ? `; ${Math.round(S.game.y / C / METRE)} m, ${S.game.score} points` : "",
    onChange: on => {
      S.held = { left: false, right: false, tuck: false }; S.turn = 0; S.wait = 0;
      if (!on) { W.stop(); return; }
      if (!H()) return;
      if (!S.game || S.game.over) newRun();
      W.start(0);
    },
  }) : null;

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), every step, without loading Hazel's library or building the program. Hazel loads if you edit the rules.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules make the course and run each step…"; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s, and interpreted every step: slower than compiled, so the run may go in slow motion.`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so the run cannot move: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build");
  }
  let L = null, timer = 0;
  function build() {
    if (!window.Hazel || !L) return;
    const sp = L.spec(PROGRAM, TAIL), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now(); let r, threw = "";
    try { r = window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!r.ok && !!v && typeof v.step === "function" && typeof v.start === "function" && typeof v.course === "function", value: v, errors: r.errors || [], threw, ms: performance.now() - t0, at: performance.now() };
    S.stepMs = []; drawStatus();
    if (S.built.ok) newRun(); else draw();
  }
  function loadCompiled() {
    const c = document.createElement("script");
    c.src = "compiled.js?v=0.0.49"; c.async = true;
    c.onload = () => { const v = window.DownhillCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newRun(); }
      else if (!v) { S.compiledError = "it ran, but gave no Downhill"; loadLib(); } };
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

  // ---- ⚙️ Advanced: this device's speed (a run of the robot's, 300 steps)
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Downhill", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "300 steps of a run with the robot choosing each one, through Hazel",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: 300 steps of a run…");
      let g = h.start(12345, true); const t0 = performance.now();
      for (let n = 0; n < 300; n++) { const c = h.robot(g); g = h.step(g, c.turn, c.tuck); }
      const ms = (performance.now() - t0) / 300;
      return { data: { step: +ms.toFixed(3) }, text: [`a step and the robot's choice through Hazel: ${ms.toFixed(2)} ms`] };
    },
  });
  // (for checking the page where no frames are drawn, a browser pane hidden: ?test=1 lets a script run steps and draw)
  if (Q.has("test")) window.DownhillTest = { S, newRun, steps: n => { const h = H(); for (let i = 0; i < n && S.game && !S.game.over; i++) oneStep(h); draw(); bar(); return S.game; }, auto: () => W };
  document.body.classList.add("js");
  draw(); bar();
})();
