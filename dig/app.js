// hazeljs-examples, Gnome dig (Deep dig until 0.0.61; ticket 829; Matthew, 2026-11-22: "Next: space invaders clone, centipede clone, dig dug clone", and
// "all with hazel rules and hazel AI that plays the game"): a digging game of our own in that genre (its own way with the
// monsters: boulders, and a lantern that stuns, not a pump). The page: the ground drawn on a canvas, every frame a step of
// Hazel's rules (Dig.step: your digging, the boulders, the monsters, the lantern), and 🤖 Hazel plays for you, the robot in
// Hazel (Dig.robot) choosing each step's way and flash. The rules compiled ahead of time by hazel-jit (compiled.js) when it is
// here, else, and once they are edited, run by hazeljs (slower).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "dig", MODULES = ["Dig", "Scene"];
  const TAIL = "(start = Dig.start, step = Dig.step, robot = Dig.robot, scene = Scene.scene)";
  const KEY = "hazeljs-examples/dig/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: the rules, the game (a Hazel value: the ground 14 by 16 cells), the way held (by a key, a button or a swipe),
  // a flash asked for, words floating up, the best score
  const W_ = 14, H_ = 16, TOP = 3;   // (0.0.64: three rows of sky above the game's ground, for the trees)
  const S = { built: null, libAt: 0, libFailed: false, compiledError: "", game: null, best: kept("best", 0),
              dir: -1, keys: [], flash: false, pops: [], stepMs: [], restartAt: 0, banner: null, swipe: null, startSeed: 1, scene: null, sceneKey: "", layers: null };
  const H = () => S.built && S.built.ok ? S.built.value : null;

  // ---- drawing: the sky and the ground's layers (darker deeper), the tunnels, the gems glittering, the boulders (shaking before
  // they fall), the monsters (with stars when stunned), you with your lantern, and its flash
  const cv = $("ground"), ctx = cv.getContext("2d");
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, Math.round(r.width * d)), h = Math.round(w * (H_ + TOP) / W_);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  const LAYERS = ["#a16207", "#92400e", "#7c2d12", "#5b2112"];
  // (0.0.61; Matthew: "for the deep dig game -- let's redo the main char as a gnome. with more details, including a face with a beard,
  // nose, eyes, eye brows, moustache") you, a gnome of our own: a tall red cap, a blue tunic with a belt and its buckle, boots
  // trimmed with fur; a round nose, eyes under bushy brows, a moustache and a long white beard; your lantern held out the way
  // you face (bright when ready, dim while it charges). Facing up, his back; facing left, him the other way round; bobbing as
  // he walks or digs. Drawn in a cell 40 units square, its middle at 0, 0
  function gnome(c, x, y, u, d, ready, moving, now) {
    const back = d === 0, flip = d === 3 ? -1 : 1, side = d === 1 || d === 3, step = moving ? Math.sin(now / 70) : 0, bob = moving ? -Math.abs(step) * 1.4 : 0;
    c.save(); c.translate(x, y); c.scale(flip * u / 40, u / 40); c.translate(0, bob);
    const E = (cx, cy, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, 7); c.fill(); };
    E(0, 19 - bob, 13, 3.4, "rgba(0, 0, 0, 0.32)");   // (his shadow)
    for (const s2 of [-1, 1]) {   // (boots, a step at a time, with fur at the top)
      const lift = s2 * step > 0 ? -2 * Math.abs(step) : 0;
      c.fillStyle = "#4b5563"; c.beginPath(); c.roundRect(s2 * 6 - 4 + (s2 > 0 ? 1 : -1), 13 + lift, 9, 6, 2.5); c.fill();
      c.fillStyle = "#e5e7eb"; c.beginPath(); c.roundRect(s2 * 6 - 4, 11.5 + lift, 8, 3, 1.5); c.fill();
    }
    // (the tunic, its sleeves and the belt)
    c.fillStyle = "#3b5bab"; c.beginPath(); c.moveTo(-9, -3); c.lineTo(9, -3); c.lineTo(12, 13); c.quadraticCurveTo(0, 15, -12, 13); c.closePath(); c.fill();
    c.fillStyle = "#2f4a8f"; c.beginPath(); c.moveTo(3, -3); c.lineTo(9, -3); c.lineTo(12, 13); c.quadraticCurveTo(7, 14.3, 4, 14.5); c.closePath(); c.fill();
    c.fillStyle = "#7c4a1e"; c.fillRect(-11, 5.5, 22, 3.6);
    if (!back) { c.fillStyle = "#eab308"; c.beginPath(); c.roundRect(-3, 4.8, 6, 5, 1); c.fill(); c.fillStyle = "#7c4a1e"; c.fillRect(-1.2, 6.3, 2.4, 2); }
    const lx = side ? 14 : 13, ly = side ? 2 : 5;   // (the lantern's hand)
    c.strokeStyle = "#3b5bab"; c.lineWidth = 4.5; c.lineCap = "round";
    c.beginPath(); c.moveTo(-8, -1); c.lineTo(-11, 7); c.moveTo(8, -1); c.lineTo(lx - 2, ly); c.stroke();
    E(-11, 8, 2.4, 2.4, "#f2c9a0"); E(lx - 1.5, ly + 0.5, 2.4, 2.4, "#f2c9a0");
    // (the lantern: a handle, a dark frame, its glass lit when it is ready)
    if (ready) { const gl = c.createRadialGradient(lx + 1, ly + 7, 0, lx + 1, ly + 7, 12); gl.addColorStop(0, "rgba(254, 240, 138, 0.75)"); gl.addColorStop(1, "rgba(254, 240, 138, 0)"); c.fillStyle = gl; c.beginPath(); c.arc(lx + 1, ly + 7, 12, 0, 7); c.fill(); }
    c.strokeStyle = "#1f2937"; c.lineWidth = 1.2; c.beginPath(); c.arc(lx + 1, ly + 2.5, 2.2, Math.PI, 0); c.stroke();
    c.fillStyle = "#1f2937"; c.beginPath(); c.roundRect(lx - 2.5, ly + 2.5, 7, 9, 1.5); c.fill();
    c.fillStyle = ready ? "#fef08a" : "#a16207"; c.beginPath(); c.roundRect(lx - 1.3, ly + 4, 4.6, 6, 1); c.fill();
    if (back) {   // (his back: the beard showing at either side under the cap)
      E(-7.5, -6, 3.5, 6, "#f1f5f9", 0.3); E(7.5, -6, 3.5, 6, "#f1f5f9", -0.3);
      c.fillStyle = "#e5e7eb"; c.beginPath(); c.ellipse(0, -9.5, 8, 6.5, 0, 0, 7); c.fill();   // (white hair under the cap)
      c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.8; c.beginPath(); for (const hx of [-5, -2, 1, 4]) { c.moveTo(hx, -14); c.quadraticCurveTo(hx + 1, -9, hx, -4); } c.stroke();
    } else {
      // (the face, rosy cheeks, the beard down over the tunic, its strands)
      c.fillStyle = "#f2c9a0"; c.beginPath(); c.ellipse(side ? 1.5 : 0, -10.5, 7.5, 6.5, 0, 0, 7); c.fill();
      E(side ? -3 : -5, -8, 2.2, 1.6, "rgba(244, 114, 114, 0.45)"); E(side ? 6 : 5, -8, 2.2, 1.6, "rgba(244, 114, 114, 0.45)");
      c.fillStyle = "#f8fafc"; c.beginPath(); c.moveTo(-8 + (side ? 1 : 0), -8); c.quadraticCurveTo(-10, 3, (side ? 2 : 0), 12); c.quadraticCurveTo(10, 3, 8 + (side ? 2 : 0), -8); c.quadraticCurveTo(side ? 2 : 0, -2, -8 + (side ? 1 : 0), -8); c.fill();
      c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.8; c.beginPath();
      for (const bx of [-4, -1, 2, 5]) { const ox = side ? 1.5 : 0; c.moveTo(bx + ox, -3); c.quadraticCurveTo(bx * 0.6 + ox, 3, bx * 0.3 + ox, 8); }
      c.stroke();
      const fx = side ? 2.5 : 0;   // (the face turned a little toward the way he goes)
      // eyes, each with a glint, under bushy white brows
      for (const s2 of [-1, 1]) { const ex2 = fx + s2 * 3.2;
        E(ex2, -11.2, 1.5, 1.7, "#1f2937"); E(ex2 + 0.5, -11.8, 0.5, 0.5, "#ffffff");
        c.fillStyle = "#f8fafc"; c.beginPath(); c.ellipse(ex2 + s2 * 0.5, -13.4, 3, 1.4, s2 * 0.3, 0, 7); c.fill();
        c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.5; c.beginPath(); c.moveTo(ex2 - 2, -13.2); c.lineTo(ex2 + 2.4, -13.8); c.stroke(); }
      // the moustache, sweeping out from under the nose, and the round nose
      E(fx - 3.6, -6.4, 4.6, 2.2, "#f1f5f9", 0.35); E(fx + 3.6, -6.4, 4.6, 2.2, "#f1f5f9", -0.35);
      c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.6; c.beginPath(); c.moveTo(fx, -7); c.lineTo(fx - 6.5, -5.2); c.moveTo(fx, -7); c.lineTo(fx + 6.5, -5.2); c.stroke();
      E(fx + (side ? 1 : 0), -8.6, 2.9, 2.6, "#f0997d"); E(fx + (side ? 0.2 : -0.8), -9.4, 0.9, 0.7, "rgba(255, 255, 255, 0.6)");
    }
    // (the tall red cap, pulled down over the brows, its tip bending back)
    c.fillStyle = "#dc2626"; c.beginPath(); c.moveTo(-10, -14.5); c.quadraticCurveTo(-7, -25, -1, -34); c.quadraticCurveTo(2, -36, 4, -32.5); c.quadraticCurveTo(7, -24, 10, -14.5); c.quadraticCurveTo(0, -16, -10, -14.5); c.fill();
    c.fillStyle = "#b91c1c"; c.beginPath(); c.moveTo(3, -33); c.quadraticCurveTo(7, -24, 10, -14.5); c.quadraticCurveTo(6, -15.3, 4, -15.5); c.quadraticCurveTo(4, -24, 3, -33); c.fill();
    c.strokeStyle = "rgba(255, 255, 255, 0.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -17.5); c.quadraticCurveTo(-4, -26, -0.5, -32); c.stroke();
    c.restore();
  }
  // ---- (0.0.64; Matthew: "the gnome digging game looks good--- let's add trees and other veg on top. Let's add lots of realistic
  // tree roots as background. let's generate that geometry for roots with more Hazel code. also add mushrooms and myclieum, and
  // underground ants, and other burrowing inspects. also add burrowing animals") the scene: made by Hazel (Scene.scene, from the
  // game's seed and the level) once a level, and drawn here into three layers, once a level and size: the sky and what grows on
  // top; the burrows (the rabbit's, the badger's sett, the ants' nest, the mole's run, their chambers); the roots and the threads
  // of mycelium, drawn over the gnome's tunnels too. The creatures move each frame. In hundredths of a cell: x 0 to 1400 across,
  // y 100 the surface (the foot of row 0), the sky above it to -300
  const PX = (u, v) => v * u / 100;   // (hundredths of a cell to pixels)
  function layers(g, u) {
    const h = H(); if (!h || !h.scene) return null;
    const key = S.startSeed + ":" + g.level;
    if (S.sceneKey !== key) {
      if (!(S.built && S.built.compiled) && S.scene) S.sceneKey = key;   // (interpreted, a scene takes seconds: the first one kept)
      else { S.scene = h.scene(S.startSeed, g.level); S.sceneKey = key; }
      S.layers = null;
    }
    if (S.layers && S.layers.w === cv.width) return S.layers;
    const mk = (hgt) => { const c2 = document.createElement("canvas"); c2.width = cv.width; c2.height = hgt; return c2; };
    const sky = mk(Math.ceil((TOP + 1) * u + 4)), burrows = mk(Math.ceil(H_ * u)), roots = mk(Math.ceil(H_ * u)), light = mk(Math.ceil(H_ * u)), threads = mk(Math.ceil(H_ * u));
    drawSky(sky.getContext("2d"), u, S.scene); drawBurrows(burrows.getContext("2d"), u, S.scene);
    drawRoots(roots.getContext("2d"), u, S.scene, false); drawRoots(light.getContext("2d"), u, S.scene, true); drawThreads(threads.getContext("2d"), u, S.scene);
    S.layers = { w: cv.width, sky, burrows, roots, light, threads };
    return S.layers;
  }
  const hsh = (a, b) => { let x = (a * 374761393 + b * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177 | 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  // the sky and what grows on top: a sky, the sun, clouds, far hills; then, back to front, trees, bushes, ferns, mushrooms,
  // flowers, grass, the anthill; the grass along the surface. Drawn in the sky layer's own frame: y 0 its top (-300 in the scene)
  function drawSky(c, u, sc) {
    const Y = v => PX(u, v + TOP * 100), X = v => PX(u, v), base = Y(100);
    const sky = c.createLinearGradient(0, 0, 0, base); sky.addColorStop(0, "#38bdf8"); sky.addColorStop(1, "#bae6fd");
    c.fillStyle = sky; c.fillRect(0, 0, c.canvas.width, base + 2);
    c.fillStyle = "#fde68a"; c.beginPath(); c.arc(X(1220), Y(-210), u * 0.45, 0, 7); c.fill();
    c.fillStyle = "rgba(253, 230, 138, 0.35)"; c.beginPath(); c.arc(X(1220), Y(-210), u * 0.7, 0, 7); c.fill();
    for (let i = 0; i < 4; i++) { const cx = X(150 + i * 330 + hsh(i, 5) * 120), cy = Y(-250 + hsh(i, 6) * 90); c.fillStyle = "rgba(255, 255, 255, 0.85)";
      for (let j = 0; j < 4; j++) { c.beginPath(); c.ellipse(cx + (j - 1.5) * u * 0.3, cy + (j % 2) * u * 0.06, u * 0.32, u * 0.2, 0, 0, 7); c.fill(); } }
    c.fillStyle = "#86c66b"; c.beginPath(); c.moveTo(0, base);
    for (let x = 0; x <= 1400; x += 50) c.lineTo(X(x), Y(10 + 30 * Math.sin(x / 160) + 20 * Math.sin(x / 70)));
    c.lineTo(c.canvas.width, base); c.closePath(); c.fill();
    const above = [...sc.above].sort((a, b) => (a.kind <= 2 ? 0 : 1) - (b.kind <= 2 ? 0 : 1));
    for (const t of above) plant(c, X(t.x), base, u, t);
    c.fillStyle = "#4d7c0f"; c.fillRect(0, base - u * 0.06, c.canvas.width, u * 0.1);
    c.strokeStyle = "#65a30d"; c.lineWidth = u * 0.03; c.beginPath();
    for (let x = 4; x < 1400; x += 9) { const hh = 6 + hsh(x, 3) * 9; c.moveTo(X(x), base); c.lineTo(X(x + (hsh(x, 4) - 0.5) * 6), base - PX(u, hh)); }
    c.stroke();
  }
  // a thing on top, its foot at x, base: trees, a bush, grass, a flower, a fern, mushrooms, the anthill
  function plant(c, x, base, u, t) {
    const k = t.size / 100, v = t.v, E = (cx, cy, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.fill(); };
    if (t.kind === 0) {   // (an oak: a stout trunk, a broad round crown of leaves)
      const H2 = u * 2.4 * k;
      c.fillStyle = "#6b4423"; c.beginPath(); c.moveTo(x - u * 0.14 * k, base); c.lineTo(x - u * 0.09 * k, base - H2 * 0.55); c.lineTo(x + u * 0.09 * k, base - H2 * 0.55); c.lineTo(x + u * 0.14 * k, base); c.fill();
      c.strokeStyle = "#6b4423"; c.lineWidth = u * 0.06 * k; c.beginPath(); c.moveTo(x, base - H2 * 0.45); c.lineTo(x - u * 0.35 * k, base - H2 * 0.7); c.moveTo(x, base - H2 * 0.5); c.lineTo(x + u * 0.3 * k, base - H2 * 0.72); c.stroke();
      for (const [dx, dy, r, col] of [[-0.4, 0.7, 0.42, "#2f7d32"], [0.4, 0.68, 0.44, "#2f7d32"], [0, 0.82, 0.5, "#388e3c"], [-0.2, 0.95, 0.38, "#43a047"], [0.25, 0.92, 0.36, "#43a047"], [0, 0.62, 0.36, "#2e7031"]])
        E(x + dx * u * k, base - dy * H2, r * u * k, r * u * k * 0.85, col);
      c.fillStyle = "rgba(255, 255, 255, 0.12)"; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(x + (hsh(v, i) - 0.6) * u * 0.8 * k, base - H2 * (0.7 + hsh(i, v) * 0.25), u * 0.08 * k, 0, 7); c.fill(); }
    } else if (t.kind === 1) {   // (a pine: a straight trunk, tiers of dark needles)
      const H2 = u * 2.7 * k;
      c.fillStyle = "#5b3a1e"; c.fillRect(x - u * 0.06 * k, base - H2 * 0.3, u * 0.12 * k, H2 * 0.3);
      for (let i = 0; i < 4; i++) { const yb = base - H2 * (0.2 + i * 0.19), hw = u * (0.62 - i * 0.12) * k, ht = H2 * 0.32;
        c.fillStyle = "#1f5f3a"; c.beginPath(); c.moveTo(x - hw, yb); c.lineTo(x + hw, yb); c.lineTo(x, yb - ht); c.fill();
        c.fillStyle = "#2d7a4b"; c.beginPath(); c.moveTo(x, yb - ht); c.lineTo(x + hw, yb); c.lineTo(x + hw * 0.3, yb); c.fill(); }
    } else if (t.kind === 2) {   // (a birch: a slim white trunk with dark marks, a light crown)
      const H2 = u * 2.6 * k;
      c.fillStyle = "#f5f5f4"; c.fillRect(x - u * 0.06 * k, base - H2 * 0.62, u * 0.12 * k, H2 * 0.62);
      c.fillStyle = "#292524"; for (let i = 0; i < 6; i++) c.fillRect(x - u * 0.06 * k + (i % 2) * u * 0.05 * k, base - H2 * (0.08 + i * 0.09), u * 0.07 * k, u * 0.025);
      for (const [dx, dy, rx, ry, col] of [[0, 0.75, 0.38, 0.32, "#84cc16"], [-0.2, 0.62, 0.28, 0.24, "#65a30d"], [0.22, 0.64, 0.27, 0.24, "#65a30d"], [0, 0.9, 0.26, 0.22, "#a3e635"]])
        E(x + dx * u * k, base - dy * H2, rx * u * k, ry * u * k * 1.2, col);
    } else if (t.kind === 3) {   // (a bush, with berries)
      for (const [dx, dy, r, col] of [[-0.22, 0.2, 0.24, "#3f7d2b"], [0.22, 0.2, 0.24, "#3f7d2b"], [0, 0.32, 0.27, "#4d8f33"]]) E(x + dx * u * k, base - dy * u * k, r * u * k, r * u * k * 0.8, col);
      c.fillStyle = "#dc2626"; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x + (hsh(v, i) - 0.5) * u * 0.6 * k, base - (0.15 + hsh(i, v) * 0.3) * u * k, u * 0.035, 0, 7); c.fill(); }
    } else if (t.kind === 4) {   // (a tuft of grass)
      c.strokeStyle = v % 2 ? "#4d7c0f" : "#65a30d"; c.lineWidth = u * 0.035; c.beginPath();
      for (let i = -2; i <= 2; i++) { c.moveTo(x + i * u * 0.03, base); c.quadraticCurveTo(x + i * u * 0.06, base - u * 0.2 * k, x + i * u * 0.11, base - u * (0.26 + (i % 2) * 0.06) * k); }
      c.stroke();
    } else if (t.kind === 5) {   // (a flower on its stem)
      const col = ["#f472b6", "#facc15", "#a78bfa", "#fb923c", "#f8fafc", "#60a5fa"][v % 6], hh = u * 0.32 * k;
      c.strokeStyle = "#4d7c0f"; c.lineWidth = u * 0.03; c.beginPath(); c.moveTo(x, base); c.lineTo(x, base - hh); c.stroke();
      c.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i * 1.2566; c.beginPath(); c.arc(x + Math.cos(a) * u * 0.05, base - hh + Math.sin(a) * u * 0.05, u * 0.045, 0, 7); c.fill(); }
      c.fillStyle = "#ca8a04"; c.beginPath(); c.arc(x, base - hh, u * 0.03, 0, 7); c.fill();
    } else if (t.kind === 6) {   // (a fern: fronds arching out)
      c.strokeStyle = "#15803d"; c.lineWidth = u * 0.025;
      for (const s2 of [-1, -0.4, 0.4, 1]) { const ex = x + s2 * u * 0.32 * k, ey = base - u * (0.38 - Math.abs(s2) * 0.12) * k; c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + s2 * u * 0.1, base - u * 0.4 * k, ex, ey); c.stroke();
        for (let j = 1; j < 6; j++) { const q = j / 6, px = x + (ex - x) * q, py = base + (ey - base) * q - u * 0.05 * Math.sin(q * 3); c.beginPath(); c.moveTo(px, py); c.lineTo(px + s2 * u * 0.05, py - u * 0.05); c.moveTo(px, py); c.lineTo(px - s2 * u * 0.03, py - u * 0.06); c.stroke(); } }
    } else if (t.kind === 7 || t.kind === 8) {   // (mushrooms: a red cap with white spots, or a brown one)
      const red = t.kind === 7, hh = u * 0.28 * k, cw = u * 0.2 * k;
      c.fillStyle = "#f5f5f0"; c.fillRect(x - u * 0.04 * k, base - hh, u * 0.08 * k, hh);
      c.fillStyle = red ? "#dc2626" : "#92400e"; c.beginPath(); c.ellipse(x, base - hh, cw, cw * 0.7, 0, Math.PI, 0); c.fill();
      c.fillStyle = red ? "#ffffff" : "#d6a46b"; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + (i - 1.5) * cw * 0.45, base - hh - cw * (0.2 + (i % 2) * 0.25), u * 0.025 * k, 0, 7); c.fill(); }
      if (v % 2) { c.fillStyle = red ? "#ef4444" : "#a16207"; c.fillRect(x + cw * 1.1 - u * 0.025, base - hh * 0.6, u * 0.05, hh * 0.6); c.beginPath(); c.ellipse(x + cw * 1.1, base - hh * 0.6, cw * 0.5, cw * 0.35, 0, Math.PI, 0); c.fill(); }
    } else if (t.kind === 9) {   // (the anthill: a mound of earth with a hole at its top)
      c.fillStyle = "#a16207"; c.beginPath(); c.ellipse(x, base, u * 0.38, u * 0.24, 0, Math.PI, 0); c.fill();
      c.fillStyle = "#854d0e"; for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(x + (hsh(i, 9) - 0.5) * u * 0.6, base - hsh(9, i) * u * 0.18, u * 0.02, 0, 7); c.fill(); }
      c.fillStyle = "#1c1009"; c.beginPath(); c.ellipse(x, base - u * 0.2, u * 0.05, u * 0.03, 0, 0, 7); c.fill();
    }
  }
  // the burrows: the rabbit's burrow and the badger's sett, the ants' nest, the mole's run (dark tunnels with rounded ends), their
  // chambers (lined with grass, a few eggs in the ants'), in the game's frame (row 0 at the top)
  function drawBurrows(c, u, sc) {
    const X = v => PX(u, v), Y = v => PX(u, v);
    const tube = (ls, col, edge) => { c.lineCap = "round"; c.lineJoin = "round";
      for (const [w2, cl] of [[1.25, edge], [1, col]]) { c.strokeStyle = cl; for (const l of ls) { c.lineWidth = Math.max(1, PX(u, l.w) * w2); c.beginPath(); c.moveTo(X(l.x0), Y(l.y0)); c.lineTo(X(l.x1), Y(l.y1)); c.stroke(); } } };
    tube(sc.burrows, "#2b170b", "rgba(0, 0, 0, 0.25)"); tube(sc.run, "#2b170b", "rgba(0, 0, 0, 0.25)"); tube(sc.ants, "#2b170b", "rgba(0, 0, 0, 0.2)");
    for (const t of sc.below) {
      const x = X(t.x), y = Y(t.y);
      if (t.kind === 11) { c.fillStyle = "#2b170b"; c.beginPath(); c.ellipse(x, y, u * 0.24 * t.size / 80, u * 0.13 * t.size / 80, 0, 0, 7); c.fill();
        c.fillStyle = "#f5f5f0"; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(x + (i - 1.5) * u * 0.06, y + u * 0.05, u * 0.025, u * 0.035, 0, 0, 7); c.fill(); } }
      else if (t.kind === 16 || t.kind === 18 || t.kind === 20) { const big = t.kind === 20 ? 1.35 : t.kind === 18 ? 1.05 : 0.8;
        c.fillStyle = "#2b170b"; c.beginPath(); c.ellipse(x, y, u * 0.5 * big, u * 0.3 * big, 0, 0, 7); c.fill();
        c.strokeStyle = "#a3a35a"; c.lineWidth = u * 0.025; c.beginPath(); for (let i = 0; i < 9; i++) { const a = Math.PI * (0.15 + 0.7 * i / 8); c.moveTo(x - Math.cos(a) * u * 0.42 * big, y + u * 0.2 * big); c.lineTo(x - Math.cos(a) * u * 0.3 * big, y + u * 0.12 * big); } c.stroke(); }
    }
  }
  // the roots, in solid colours on a layer of their own, laid over the ground faintly and evenly (0.0.65; Matthew: "make the roots
  // more 'low contrast' in each square: dirt squares, of each shade. dug squares."): dark ones over the earth, so a root is a
  // shade darker than the earth it runs through, whatever its depth; light ones in the dug squares, a shade lighter than the
  // tunnel. The big roots a little lighter along their length. Overlaps do not darken, being one layer laid on at once
  function drawRoots(c, u, sc, light) {
    const X = v => PX(u, v), Y = v => PX(u, v);
    c.lineCap = "round";
    for (const l of [...sc.roots].sort((a, b) => a.w - b.w)) {
      c.strokeStyle = light ? "#b08a63" : "#24120a"; c.lineWidth = Math.max(1, PX(u, l.w)); c.beginPath(); c.moveTo(X(l.x0), Y(l.y0)); c.lineTo(X(l.x1), Y(l.y1)); c.stroke();
      if (l.w >= 9) { c.strokeStyle = light ? "#c4a07a" : "#3d2414"; c.lineWidth = Math.max(0.6, PX(u, l.w) * 0.35); c.beginPath(); c.moveTo(X(l.x0) - 1, Y(l.y0) - 1); c.lineTo(X(l.x1) - 1, Y(l.y1) - 1); c.stroke(); }
    }
  }
  // the threads of mycelium, fine and pale, on a layer of their own too
  function drawThreads(c, u, sc) {
    const X = v => PX(u, v), Y = v => PX(u, v);
    c.lineCap = "round"; c.strokeStyle = "#fafaf5"; c.lineWidth = Math.max(0.8, PX(u, 3));
    c.beginPath(); for (const l of sc.threads) { c.moveTo(X(l.x0), Y(l.y0)); c.lineTo(X(l.x1), Y(l.y1)); } c.stroke();
  }
  // a point along a path of lines, t from 0 to 1 and back (a creature going to and fro along it)
  function along(ls, t) {
    if (!ls.length) return null;
    const total = ls.reduce((a, l) => a + Math.hypot(l.x1 - l.x0, l.y1 - l.y0), 0), q = (t % 2 < 1 ? t % 1 : 1 - t % 1) * total;
    let acc = 0; const order = [...ls].reverse();
    for (const l of order) { const d = Math.hypot(l.x1 - l.x0, l.y1 - l.y0); if (acc + d >= q) { const f = d ? (q - acc) / d : 0; return { x: l.x0 + (l.x1 - l.x0) * f, y: l.y0 + (l.y1 - l.y0) * f, dx: l.x1 - l.x0, back: t % 2 >= 1 }; } acc += d; }
    const l = order[order.length - 1]; return { x: l.x1, y: l.y1, dx: l.x1 - l.x0, back: t % 2 >= 1 };
  }
  // the creatures, each frame: ants going to and fro along their tunnels, the mole along its run, the rabbit in its chamber (an
  // ear twitching), the badger asleep (breathing), worms wriggling, grubs curled, beetles creeping; a little muted, behind the game
  function creatures(c, u, now) {
    const sc = S.scene; if (!sc) return;
    const X = v => PX(u, v), E = (cx, cy, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, 7); c.fill(); };
    c.save(); c.globalAlpha = 0.9;
    for (let i = 0; i < 9; i++) { const p = along(sc.ants, now / 9000 + i * 0.23); if (!p) break;
      const x = X(p.x), y = X(p.y), s2 = (p.dx >= 0) !== p.back ? 1 : -1;
      c.strokeStyle = "#1c1917"; c.lineWidth = u * 0.012; c.beginPath(); for (const lx of [-0.03, 0, 0.03]) { c.moveTo(x + lx * u, y); c.lineTo(x + lx * u + Math.sin(now / 60 + i) * u * 0.015, y + u * 0.04); } c.stroke();
      E(x - s2 * u * 0.05, y, u * 0.028, u * 0.022, "#3f1d0b"); E(x, y, u * 0.022, u * 0.018, "#451a03"); E(x + s2 * u * 0.045, y - u * 0.005, u * 0.022, u * 0.02, "#3f1d0b"); }
    for (const t of sc.below) {
      const x = X(t.x), y = X(t.y), v = t.v;
      if (t.kind === 15) {   // (the mole, along its run: velvet grey, a pink nose and broad pink hands)
        const p = along(sc.run, now / 14000 + v / 1000) || { x: t.x, y: t.y, dx: 1, back: false }, mx = X(p.x), my = X(p.y), s2 = (p.dx >= 0) !== p.back ? 1 : -1;
        E(mx, my, u * 0.2, u * 0.13, "#374151"); E(mx + s2 * u * 0.17, my + u * 0.02, u * 0.06, u * 0.045, "#f9a8d4");
        E(mx + s2 * u * 0.08, my + u * 0.1, u * 0.07, u * 0.035, "#fbcfe8", s2 * 0.5); E(mx - s2 * u * 0.12, my + u * 0.1, u * 0.05, u * 0.03, "#fbcfe8");
        E(mx + s2 * u * 0.1, my - u * 0.04, u * 0.012, u * 0.012, "#111827");
      } else if (t.kind === 17) {   // (the rabbit in its chamber, an ear twitching, its nose going)
        const tw = Math.sin(now / 400 + v) > 0.9 ? 0.25 : 0;
        E(x, y + u * 0.05, u * 0.22, u * 0.16, "#a8a29e"); E(x + u * 0.16, y - u * 0.04, u * 0.11, u * 0.1, "#a8a29e");
        E(x + u * 0.12, y - u * 0.2, u * 0.03, u * 0.11, "#a8a29e", -0.3 - tw); E(x + u * 0.19, y - u * 0.2, u * 0.03, u * 0.11, "#a8a29e", 0.2);
        E(x + u * 0.12, y - u * 0.2, u * 0.015, u * 0.07, "#fbcfe8", -0.3 - tw); E(x - u * 0.2, y + u * 0.02, u * 0.06, u * 0.06, "#f5f5f4");
        E(x + u * 0.2, y - u * 0.06, u * 0.016, u * 0.016, "#111827"); E(x + u * 0.26, y - u * 0.02 + Math.sin(now / 90) * u * 0.006, u * 0.015, u * 0.012, "#f472b6");
      } else if (t.kind === 19) {   // (the badger, asleep in its sett: curled up, breathing, its striped face tucked in)
        const br = 1 + 0.04 * Math.sin(now / 900 + v);
        E(x, y + u * 0.06, u * 0.4 * br, u * 0.22 * br, "#6b7280"); E(x - u * 0.12, y + u * 0.02, u * 0.2, u * 0.12, "#4b5563");
        E(x + u * 0.28, y + u * 0.06, u * 0.14, u * 0.1, "#f5f5f4"); E(x + u * 0.3, y + u * 0.06, u * 0.12, u * 0.035, "#111827");
        c.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.4 * Math.sin(now / 900 + v)})`; c.font = `${Math.round(u * 0.22)}px system-ui`; c.textAlign = "center"; c.fillText("z", x + u * 0.42, y - u * 0.18 - (now / 60 % 20) * u * 0.005);
      } else if (t.kind === 12) {   // (a worm, wriggling a little to and fro)
        const ph = now / 500 + v, dir = v % 2 ? 1 : -1, off = Math.sin(now / 3000 + v) * u * 0.25;
        c.strokeStyle = "#f9a8d4"; c.lineWidth = u * 0.06; c.lineCap = "round"; c.beginPath();
        for (let i = 0; i <= 8; i++) { const px = x + off + dir * (i - 4) * u * 0.045, py = y + Math.sin(ph + i * 0.8) * u * 0.04; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke();
        c.strokeStyle = "#f472b6"; c.lineWidth = u * 0.07; c.beginPath(); c.moveTo(x + off + dir * u * 0.04, y + Math.sin(ph + 4.8) * u * 0.04); c.lineTo(x + off + dir * u * 0.07, y + Math.sin(ph + 5.6) * u * 0.04); c.stroke();
      } else if (t.kind === 13) {   // (a grub, curled, its head brown)
        c.strokeStyle = "#fef3c7"; c.lineWidth = u * 0.07; c.lineCap = "round"; c.beginPath(); c.arc(x, y, u * 0.07 * (1 + 0.04 * Math.sin(now / 700 + v)), 0.3, 4.8); c.stroke();
        E(x + Math.cos(0.3) * u * 0.07, y + Math.sin(0.3) * u * 0.07, u * 0.035, u * 0.035, "#92400e");
      } else if (t.kind === 14) {   // (a beetle, creeping round a little circle, its shell shining)
        const a = now / 4000 + v, bx = x + Math.cos(a) * u * 0.15, by = y + Math.sin(a) * u * 0.08, rot = a + Math.PI / 2;
        c.strokeStyle = "#1c1917"; c.lineWidth = u * 0.012; c.beginPath(); for (const s2 of [-1, 1]) for (const k2 of [-0.04, 0, 0.04]) { c.moveTo(bx, by + k2 * u); c.lineTo(bx + s2 * u * 0.07, by + k2 * u + Math.sin(now / 80 + k2 * 50) * u * 0.01); } c.stroke();
        E(bx, by, u * 0.06, u * 0.045, ["#1e3a8a", "#14532d", "#7f1d1d"][v % 3], rot); E(bx - u * 0.015, by - u * 0.015, u * 0.02, u * 0.012, "rgba(255, 255, 255, 0.5)", rot);
      }
    }
    c.restore();
  }
  function draw() {
    fit();
    const c = ctx, u = cv.width / W_, g = S.game, now = performance.now();
    const L = g ? layers(g, u) : null;
    if (L) c.drawImage(L.sky, 0, 0); else { c.fillStyle = "#7dd3fc"; c.fillRect(0, 0, cv.width, (TOP + 1) * u); }
    c.save(); c.translate(0, TOP * u);   // (the game's ground, row 0 its surface, three rows of sky above)
    for (let r = 1; r < H_; r++) { c.fillStyle = LAYERS[Math.min(3, Math.floor((r - 1) / 4))]; c.fillRect(0, r * u, cv.width, u + 0.5); }
    if (!g) { c.restore(); return; }
    if (L) { c.drawImage(L.burrows, 0, 0); c.globalAlpha = 0.3; c.drawImage(L.roots, 0, 0); c.globalAlpha = 0.4; c.drawImage(L.threads, 0, 0); c.globalAlpha = 1; }   // (the roots a shade darker than each earth)
    for (let r = 1; r < H_; r++) for (let k = 0; k < W_; k++) {
      const v = g.cells[r * W_ + k], x = k * u, y = r * u;
      if (v === 0) { c.fillStyle = "#1c1009"; c.fillRect(x, y, u + 0.5, u + 0.5); }
      else { c.fillStyle = "rgba(0, 0, 0, 0.12)"; c.fillRect(x + u * 0.2, y + u * 0.3, u * 0.08, u * 0.08); c.fillRect(x + u * 0.65, y + u * 0.7, u * 0.08, u * 0.08); }
      if (v === 2) {
        const tw = 0.6 + 0.4 * Math.sin(now / 250 + r * 3 + k);
        c.fillStyle = "#22d3ee"; c.beginPath(); c.moveTo(x + u / 2, y + u * 0.22); c.lineTo(x + u * 0.75, y + u * 0.45); c.lineTo(x + u / 2, y + u * 0.78); c.lineTo(x + u * 0.25, y + u * 0.45); c.closePath(); c.fill();
        c.fillStyle = `rgba(255, 255, 255, ${tw})`; c.beginPath(); c.arc(x + u * 0.42, y + u * 0.4, u * 0.06, 0, 7); c.fill();
      }
    }
    if (L) {   // (in the dug squares, the roots and the mycelium a shade lighter than the tunnel, hanging across it; then the creatures)
      c.save(); c.beginPath(); for (let r = 1; r < H_; r++) for (let k = 0; k < W_; k++) if (g.cells[r * W_ + k] === 0) c.rect(k * u, r * u, u + 0.5, u + 0.5);
      c.clip(); c.globalAlpha = 0.22; c.drawImage(L.light, 0, 0); c.globalAlpha = 0.18; c.drawImage(L.threads, 0, 0); c.restore();
      creatures(c, u, now);
    }
    for (const b of g.rocks) {
      const shake = !b.falling && b.wob >= 0 ? Math.sin(now / 30) * u * 0.05 : 0, fallBy = b.falling ? (4 - b.wob) / 4 * u : 0;
      const x = (b.c + 0.5) * u + shake, y = (b.r + 0.5) * u + fallBy;
      c.fillStyle = "#78716c"; c.beginPath(); c.ellipse(x, y, u * 0.44, u * 0.4, 0, 0, 7); c.fill();
      c.fillStyle = "#a8a29e"; c.beginPath(); c.ellipse(x - u * 0.12, y - u * 0.12, u * 0.18, u * 0.12, -0.4, 0, 7); c.fill();
    }
    for (const m of g.mons) {
      const x = (m.c + 0.5) * u, y = (m.r + 0.5) * u, bob = Math.sin(now / 160 + m.c) * u * 0.04;
      c.fillStyle = m.stun > 0 ? "#c4b5fd" : "#ef4444"; c.beginPath(); c.arc(x, y + bob, u * 0.38, Math.PI, 0); c.lineTo(x + u * 0.38, y + u * 0.36);
      for (let i = 3; i >= -3; i -= 2) c.lineTo(x + i * u * 0.11, y + u * (i % 4 === 1 || i % 4 === -3 ? 0.26 : 0.36)); c.closePath(); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(x - u * 0.13, y - u * 0.05 + bob, u * 0.1, 0, 7); c.arc(x + u * 0.13, y - u * 0.05 + bob, u * 0.1, 0, 7); c.fill();
      if (m.stun > 0) {   // (0.0.61, as on the icon: stunned, crossed eyes and three gold stars going round over it)
        c.strokeStyle = "#111827"; c.lineWidth = u * 0.035; c.lineCap = "round"; c.beginPath();
        for (const s2 of [-1, 1]) { const ex = x + s2 * u * 0.13, ey = y - u * 0.05 + bob, z = u * 0.05; c.moveTo(ex - z, ey - z); c.lineTo(ex + z, ey + z); c.moveTo(ex + z, ey - z); c.lineTo(ex - z, ey + z); }
        c.stroke(); c.fillStyle = "#fde047";
        for (let i = 0; i < 3; i++) { const a = now / 260 + i * 2.094, sx = x + Math.cos(a) * u * 0.3, sy = y - u * 0.52 + Math.sin(a) * u * 0.08, z = u * 0.08;
          c.beginPath(); c.moveTo(sx, sy - z); c.lineTo(sx + z * 0.3, sy - z * 0.3); c.lineTo(sx + z, sy); c.lineTo(sx + z * 0.3, sy + z * 0.3); c.lineTo(sx, sy + z); c.lineTo(sx - z * 0.3, sy + z * 0.3); c.lineTo(sx - z, sy); c.lineTo(sx - z * 0.3, sy - z * 0.3); c.closePath(); c.fill(); }
      } else { c.fillStyle = "#111827"; c.beginPath(); c.arc(x - u * 0.11, y - u * 0.04 + bob, u * 0.05, 0, 7); c.arc(x + u * 0.15, y - u * 0.04 + bob, u * 0.05, 0, 7); c.fill(); }
    }
    if (g.dead === 0 || Math.floor(now / 120) % 2) gnome(c, (g.px + 0.5) * u, (g.py + 0.5) * u, u, g.pd, g.flash <= 0, g.pwait > 0, now);
    if (S.lit && now - S.lit.t < 450) {
      const q = 1 - (now - S.lit.t) / 450; c.fillStyle = `rgba(254, 240, 138, ${0.45 * q})`;
      for (const k of S.lit.cells) c.fillRect((k % W_) * u, Math.floor(k / W_) * u, u, u);
      c.strokeStyle = `rgba(254, 249, 195, ${q})`; c.lineWidth = u * 0.12; c.beginPath(); c.arc((S.lit.c + 0.5) * u, (S.lit.r + 0.5) * u, u * (0.6 + 3 * (1 - q)), 0, 7); c.stroke();   // (a ring spreading out)
    }
    S.pops = S.pops.filter(p => now - p.t < 900);
    for (const p of S.pops) { const q = (now - p.t) / 900; c.globalAlpha = 1 - q; c.fillStyle = p.col; c.font = `700 ${Math.round(u * 0.5)}px system-ui`; c.textAlign = "center"; c.fillText(p.text, (p.c + 0.5) * u, (p.r + 0.3 - q) * u); }
    c.globalAlpha = 1; c.textAlign = "center";
    c.restore();
    if (g.over) {
      c.fillStyle = "rgba(20, 10, 5, 0.8)"; c.fillRect(0, cv.height * 0.4, cv.width, cv.height * 0.2);
      c.fillStyle = "#ffffff"; c.font = `700 ${Math.round(u * 0.8)}px system-ui`; c.fillText(`Game over: ${g.score} points`, cv.width / 2, cv.height * 0.49);
      c.font = `${Math.round(u * 0.45)}px system-ui`; c.fillText("New game: the button, a tap, or Enter", cv.width / 2, cv.height * 0.55);
    } else if (S.banner && now - S.banner.t < 1600 && S.banner.text) {
      c.fillStyle = "#fef9c3"; c.font = `700 ${Math.round(u * 0.7)}px system-ui`; c.fillText(S.banner.text, cv.width / 2, cv.height * 0.12);
    }
  }
  function bar() {
    const g = S.game; if (!g) return;
    $("points").textContent = `⭐ ${g.score}`; $("lives").textContent = "⛏️".repeat(Math.max(0, g.lives));
    $("level").textContent = `level ${g.level + 1}`; $("left").textContent = `💎 ${g.gems} left`;
    const ms = S.stepMs.length ? [...S.stepMs].sort((a, b) => a - b)[S.stepMs.length >> 1] : 0;
    $("info").textContent = `Your best on this device: ${S.best} points.` + (ms ? ` A step of Hazel's rules: ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms.` : "");
    if (window.OracleFs) window.OracleFs.empty(!g || !!g.over);
  }

  // ---- a game, and every frame a step of the rules
  function newGame() {
    const h = H(); if (!h) return;
    S.startSeed = 1 + Math.floor(Math.random() * 2000000000); S.game = h.start(S.startSeed); S.pops = []; S.banner = null; S.flash = false; S.dir = -1; S.keys = []; S.restartAt = 0;
    if (W && W.on) W.start(0);
    bar(); draw();
  }
  function heard(g, g2) {
    const now = performance.now();
    if (g2.hit === 1) S.pops.push({ c: g2.px, r: g2.py, text: "+50", t: now, col: "#67e8f9" });
    if (g2.hit === 4) S.pops.push({ c: g2.px, r: g2.py, text: "+100", t: now, col: "#c4b5fd" });
    if (g2.hit === 5) S.banner = { text: "🪨 Squashed! +200", t: now };
    if (g2.hit === 2) S.banner = { text: g2.lives > 0 ? "👻 Caught!" : "", t: now };
    if (g2.hit === 3) S.banner = { text: `🎉 Level ${g2.level} cleared!`, t: now };
    // (0.0.60: the lantern lights every cell within three of you, whatever is between: the monsters there are stunned)
    if (g2.flash > g.flash) { const cells = []; for (let r = g2.py - 3; r <= g2.py + 3; r++) for (let c = g2.px - 3; c <= g2.px + 3; c++) { const d = Math.abs(c - g2.px) + Math.abs(r - g2.py); if (d >= 1 && d <= 3 && c >= 0 && c < W_ && r >= 0 && r < H_) cells.push(r * W_ + c); } S.lit = { cells, t: now, c: g2.px, r: g2.py }; }
  }
  function oneStep(h) {
    const g = S.game;
    let dir = -1, flash = false;
    if (W && W.on) { const t1 = performance.now(), c = h.robot(g); W.think(0, performance.now() - t1); dir = c.dir; flash = c.flash; }
    else { dir = S.dir; flash = S.flash; S.flash = false; }
    const t0 = performance.now(), g2 = h.step(g, dir, flash);
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 60) S.stepMs.shift();
    heard(g, g2); S.game = g2;
    if (g2.over && !(W && W.on) && g2.score > S.best) { S.best = g2.score; keep("best", S.best); }
    if (g2.over && W && W.on) { W.end(`🤖 Hazel's game: ${g2.score} points, to level ${g2.level + 1}`); S.restartAt = performance.now() + 3000; }
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

  // ---- the controls: a way held (the arrow keys or W A S D, the four buttons; a swipe sets a way, kept until another, or a tap
  // to stop), the lantern (💡 or the space bar)
  const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  const heldNow = () => { S.dir = S.keys.length ? S.keys[S.keys.length - 1] : -1; };
  addEventListener("keydown", e => {
    if (typing(e) || (W && W.on)) return;
    if (e.key in KEYS) { if (e.key.startsWith("Arrow")) e.preventDefault(); const d = KEYS[e.key]; if (!S.keys.includes(d)) S.keys.push(d); heldNow(); }
    else if (e.key === "Enter" && S.game && S.game.over) newGame();
    else if (e.key === "Enter" || e.key === "f" || e.key === "F" || e.key === "l" || e.key === "L") { e.preventDefault(); S.flash = true; }
  });
  addEventListener("keyup", e => { if (e.key in KEYS) { S.keys = S.keys.filter(d => d !== KEYS[e.key]); heldNow(); } });
  cv.addEventListener("pointerdown", e => { if (W && W.on) return; if (S.game && S.game.over) { newGame(); return; } S.swipe = { x: e.clientX, y: e.clientY, moved: false }; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (!S.swipe) return;
    const dx = e.clientX - S.swipe.x, dy = e.clientY - S.swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    S.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0); S.swipe = { x: e.clientX, y: e.clientY, moved: true };
  });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, () => { if (S.swipe && !S.swipe.moved) S.dir = -1; S.swipe = null; });
  for (const b of document.querySelectorAll(".dg-pad button[data-dir]")) {
    const d = +b.dataset.dir;
    b.addEventListener("pointerdown", e => { e.preventDefault(); if (W && W.on) return; b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("held"); S.keys = [d]; heldNow(); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { b.classList.remove("held"); S.keys = S.keys.filter(k => k !== d); heldNow(); });
  }
  $("flash").addEventListener("pointerdown", e => { e.preventDefault(); if (!(W && W.on)) S.flash = true; });
  $("new").addEventListener("click", newGame);
  addEventListener("resize", () => draw());
  if (window.OracleFs) window.OracleFs.offer({ label: "⛏️ New game", title: "A new game, from the first level", cast: newGame });
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["Hazel"], label: "🤖 Hazel plays for you", what: "the game",
    more: () => S.game ? `; ${S.game.score} points, level ${S.game.level + 1}` : "",
    onChange: on => {
      S.keys = []; S.dir = -1; S.flash = false;
      if (!on) { W.stop(); return; }
      if (!H()) return;
      if (!S.game || S.game.over) newGame();
      W.start(0);
    },
  }) : null;
  // (0.0.53) ⏸ the pause (shared/pause.js): its button and the space bar; no step runs while paused
  const P = window.HazelPause ? window.HazelPause.make({ into: $("new").parentElement, over: $("ground").parentElement }) : null;

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), every step, without loading Hazel's library or building the program. Hazel loads if you edit the rules.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules move everything underground…"; return; }
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
    c.src = "compiled.js?v=0.0.65"; c.async = true;
    c.onload = () => { const v = window.DigCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newGame(); }
      else if (!v) { S.compiledError = "it ran, but gave no Gnome dig"; loadLib(); } };
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
    holder: $("advanced"), name: "Gnome dig", built: () => S.built, libAt: () => S.libAt, keysIn: null,
    mode: () => ({ asked: COMPILED ? "compiled" : "interpreted", error: S.compiledError || null }),
    about: "300 steps of a game with the robot choosing each one, through Hazel",
    work: async say => {
      const h = H(); if (!h) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: 300 steps of a game…");
      let g = h.start(12345); const t0 = performance.now();
      for (let n = 0; n < 300 && !g.over; n++) { const c = h.robot(g); g = h.step(g, c.dir, c.flash); }
      const ms = (performance.now() - t0) / 300;
      return { data: { step: +ms.toFixed(3) }, text: [`a step and the robot's choice through Hazel: ${ms.toFixed(2)} ms`] };
    },
  });
  // (for checking the page where no frames are drawn, a browser pane hidden: ?test=1 lets a script run steps and draw)
  if (Q.has("test")) window.DigTest = { S, newGame, gnome, steps: n => { const h = H(); for (let i = 0; i < n && S.game && !S.game.over; i++) oneStep(h); draw(); bar(); return S.game; }, auto: () => W };
  document.body.classList.add("js");
  draw(); bar();
})();
