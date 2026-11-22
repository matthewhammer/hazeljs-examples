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
  const TAIL = "(start = Dig.start, step = Dig.step, robot = Dig.robot, scene = Scene.scene, landing = Scene.landing)";
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
              dir: -1, keys: [], flash: false, pops: [], stepMs: [], restartAt: 0, banner: null, swipe: null, startSeed: 1, scene: null, sceneKey: "", layers: null,
              land: null, landKey: "", landAt: 0, drops: new Map(), dug: null };
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
      S.layers = null; S.drops = new Map();
    }
    if (S.layers && S.layers.w === cv.width) return S.layers;
    const mk = (hgt) => { const c2 = document.createElement("canvas"); c2.width = cv.width; c2.height = hgt; return c2; };
    const sky = mk(Math.ceil((TOP + 1) * u + 4)), burrows = mk(Math.ceil(H_ * u)), roots = mk(Math.ceil(H_ * u)), light = mk(Math.ceil(H_ * u)), threads = mk(Math.ceil(H_ * u)), back = mk(Math.ceil(H_ * u));
    drawSky(sky.getContext("2d"), u, S.scene); drawBurrows(burrows.getContext("2d"), u, S.scene);
    drawRoots(roots.getContext("2d"), u, S.scene, false); drawRoots(light.getContext("2d"), u, S.scene, true); drawThreads(threads.getContext("2d"), u, S.scene);
    drawBack(back.getContext("2d"), u, S.scene, mk);
    S.layers = { w: cv.width, sky, burrows, roots, light, threads, back };
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
  // ---- (0.0.66; Matthew: "for the trees, use the 'pads' SVG routine from messed up dress up", "'leaf pads and branches' I
  // should say") the trees as Messed Up Dress Up grows them (dress-up/js/10-nature.js leafyTree, pineTree, taperSvg;
  // 09-backgrounds.js padInner; by Matthew Hammer and family, Apache 2.0), drawn here on the canvas: a trunk flaring at the
  // roots, curved tapering limbs forking up and out, leaf pads (low scalloped clouds, shaded beneath, lit on top) clustered at
  // their tips, darker behind and lighter in front; a pine's tiers of drooping boughs. In Dress Up's units: the foot at 0, 0, a
  // leafy tree about 330 tall, a pine 200
  const seededR = seed => i => { const v = Math.sin(seed * 71.3 + i * 13.7) * 43758.5453; return v - Math.floor(v); };
  const poly = (c, pts, fill) => { c.fillStyle = fill; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
  const mixHex = (h, to, t) => { const a = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), b = [1, 3, 5].map(i => parseInt(to.slice(i, i + 2), 16));
    return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  // a curved, tapering limb: from p0 by way of p1 to p2, w0 wide to w1
  function taper(c, p0, p1, p2, w0, w1, fill) {
    const L = [], R = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, x = (1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * p1[0] + u * u * p2[0], y = (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * p1[1] + u * u * p2[1];
      const dx = 2 * (1 - u) * (p1[0] - p0[0]) + 2 * u * (p2[0] - p1[0]), dy = 2 * (1 - u) * (p1[1] - p0[1]) + 2 * u * (p2[1] - p1[1]), d = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * u) / 2;
      L.push([x - dy / d * w, y + dx / d * w]); R.push([x + dy / d * w, y - dx / d * w]);
    }
    poly(c, [...L, ...R.reverse()], fill);
  }
  // a leaf pad's shape j (of 8): a scalloped top over a flat bottom; its shade beneath and its lit top
  const PADS = [...Array(8)].map((_, j) => {
    const r = v => { const z = Math.sin(j * 57.1 + v * 13.9) * 43758.5453; return z - Math.floor(z); };
    const w = 170 + 70 * r(1), h = 34 + 22 * r(2), bumps = 3 + j % 5, amp = 7 + 7 * r(3), lean = (r(4) - 0.5) * 0.6, top = [], bottom = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40, x = (u - 0.5) * w, env = Math.pow(Math.sin(Math.PI * Math.pow(u, 1 + lean)), 0.7); top.push([x, -h * env - amp * Math.abs(Math.sin(Math.PI * bumps * u)) * env]); }
    for (let i = 12; i >= 0; i--) { const u = i / 12; bottom.push([(u - 0.5) * w, 5 * Math.sin(Math.PI * u)]); }
    return { all: [...top, ...bottom], shade: [...top.map(([x, y]) => [x, y * 0.3]), ...bottom], lit: top.filter((_, i) => i > 4 && i < 30).map(([x, y]) => [x * 0.7 - w * 0.06, y * 0.85 - 4]) };
  });
  function pad(c, j, x, y, sx, sy, color) {
    const P2 = PADS[((j % 8) + 8) % 8];
    c.save(); c.translate(x, y); c.scale(sx, sy); poly(c, P2.all, color); poly(c, P2.shade, "rgba(0, 0, 0, 0.2)"); poly(c, P2.lit, "rgba(255, 255, 255, 0.13)"); c.restore();
  }
  // a broadleaf tree: a trunk flaring at the roots, limbs forking up and out, leaf pads clustered at their tips
  function leafyTree(c, seed, o = {}) {
    const r = seededR(seed), H2 = o.h ?? 320, wide = o.wide ?? 1, bark = o.bark ?? "#6b4a2b", dk = mixHex(bark, "#000000", 0.35);
    const greens = o.greens ?? ["#285e2a", "#2f7d32", "#3a8a3c", "#47a047", "#58b050"];
    const limbs = [], tips = [];
    const grow = (x, y, a, len, w, lvl, id) => {
      const bend = (r(id * 7 + 1) - 0.5) * 0.6, mx = x + Math.cos(a) * len * 0.5, my = y + Math.sin(a) * len * 0.5;
      const ex = mx + Math.cos(a + bend) * len * 0.5, ey = my + Math.sin(a + bend) * len * 0.5;
      limbs.push([[x, y], [mx, my], [ex, ey], w, w * 0.6]);
      if (lvl === 0) { tips.push([ex, ey, len]); return; }
      const n = 2 + (r(id * 7 + 2) > 0.45 ? 1 : 0);
      for (let k = 0; k < n; k++) grow(ex, ey, a + bend + (k - (n - 1) / 2) * (0.55 + 0.3 * r(id * 7 + 3 + k)) * wide, len * (0.6 + 0.18 * r(id * 11 + k)), w * 0.6, lvl - 1, id * 3 + k + 1);
    };
    const lean = (r(1) - 0.5) * 0.18, top = [Math.sin(lean) * H2 * 0.45, -H2 * 0.44];
    c.fillStyle = "rgba(0, 0, 0, 0.15)"; c.beginPath(); c.ellipse(0, 2, 70 * wide, 11, 0, 0, 7); c.fill();
    for (const e of [-1, 1]) { c.fillStyle = bark; c.beginPath(); c.moveTo(e * 10, -24); c.quadraticCurveTo(e * 16, -4, e * (30 + 8 * r(2 + e)), 2); c.lineTo(e * 6, 2); c.closePath(); c.fill(); }
    taper(c, [0, 2], [top[0] * 0.4, -H2 * 0.24], top, 30, 19, bark);
    for (let k = 0; k < 3; k++) grow(top[0], top[1], -Math.PI / 2 + (k - 1) * 0.7 * wide + (r(10 + k) - 0.5) * 0.3, H2 * (0.25 + 0.06 * r(20 + k)), 16, 1, k + 2);
    for (const [p0, p1, p2, w0, w1] of limbs) taper(c, p0, p1, p2, w0, w1, bark);
    c.strokeStyle = dk; c.globalAlpha = 0.5; c.lineWidth = 3; c.beginPath(); c.moveTo(-4, -20); c.quadraticCurveTo(top[0] * 0.3 - 6, -H2 * 0.22, top[0] - 4, top[1] + 10); c.stroke(); c.globalAlpha = 1;
    if (o.marks) { c.fillStyle = "#292524"; for (let i = 0; i < 7; i++) { const q = 0.08 + i * 0.12, x = top[0] * q * 0.9, y = -H2 * 0.44 * q - 6; c.fillRect(x - 8 + (i % 2) * 6, y, 9, 3); } }   // (a birch's dark marks)
    const pads = [];
    for (let i = 0; i < 4; i++) pads.push([top[0] + (r(30 + i) - 0.5) * 140 * wide, top[1] - 60 - 70 * r(34 + i), 0.55 + 0.2 * r(38 + i), 0]);
    tips.forEach(([x, y], i) => { pads.push([x + (r(40 + i) - 0.5) * 30, y - 16, 0.42 + 0.16 * r(50 + i), 1]); pads.push([x + (r(60 + i) - 0.5) * 40, y + 8, 0.36 + 0.14 * r(70 + i), 2]); });
    pads.sort((a, b) => a[3] - b[3] || a[1] - b[1]);
    pads.forEach(([x, y, sc, layer], i) => { const j = Math.floor(r(80 + i) * 8), sx = sc * (r(90 + i) < 0.5 ? -1 : 1) * wide;
      pad(c, j, x, y, sx, sc, greens[Math.min(greens.length - 1, layer + Math.floor(r(100 + i) * 3))]); });
  }
  // a pine: a trunk, then tiers of drooping boughs, ragged at their tips, darker underneath
  function pineTree(c, seed, color, n = 5) {
    const r = seededR(seed);
    c.fillStyle = "#5e3d22"; c.fillRect(-6, -34, 12, 36);
    for (let j = 0; j < n; j++) {
      const u = j / n, y = -22 - u * 158, hw = 60 * (1 - u * 0.84), th = 62 - 22 * u, tip = y - th, right = [];
      for (let q = 1; q <= 3; q++) { const v = q / 3, x = hw * v; right.push([x - hw / 6, y - 4 - 6 * r(j * 10 + q)], [x, y + 6 + 6 * r(j * 10 + q + 5) - 4 * v]); }
      const pts = [[0, tip], ...right, ...[...right].reverse().map(([x, yy]) => [-x * (0.94 + 0.1 * r(j + 40)), yy + 2 * (r(j + 41) - 0.5)])];
      c.lineJoin = "round"; c.strokeStyle = color; c.lineWidth = 3; poly(c, pts, color); c.stroke();
      poly(c, [[-hw * 0.85, y + 2], [hw * 0.85, y + 2], [hw * 0.5, y - th * 0.3], [-hw * 0.5, y - th * 0.3]], "rgba(0, 0, 0, 0.16)");
      poly(c, [[0, tip + 4], [-hw * 0.6, y - th * 0.15], [-hw * 0.18, y - th * 0.5]], "rgba(255, 255, 255, 0.1)");
    }
  }
  // a thing on top, its foot at x, base: trees, a bush, grass, a flower, a fern, mushrooms, the anthill
  function plant(c, x, base, u, t) {
    const k = t.size / 100, v = t.v, E = (cx, cy, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.fill(); };
    if (t.kind <= 2) {   // (0.0.66: an oak, a pine or a birch, grown as Dress Up grows its trees, from the scene's own number for each)
      const hgt = u * (t.kind === 1 ? 2.7 : 2.5) * k, sc = hgt / (t.kind === 1 ? 200 : 330);
      c.save(); c.translate(x, base); c.scale(sc, sc);
      if (t.kind === 1) pineTree(c, v + 1, ["#1f5f3a", "#245f34", "#2a6b3c"][v % 3]);
      else if (t.kind === 0) leafyTree(c, v + 1, { wide: 0.95 + (v % 5) * 0.04 });
      else leafyTree(c, v + 1, { wide: 0.8, bark: "#e9e4dc", marks: true, greens: ["#4d7c0f", "#5a8f2a", "#6aa832", "#7cbf3a", "#93d04a"] });
      c.restore();
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
  // (0.0.67; Matthew: "for the dug out parts, instead of being just black, lets show some different darker versions of what was there
  // --- vary the root patterns for 'dug out' version of the pattern. Maybe two layers.") A tunnel's back wall, further in: each
  // depth's earth, darker, and in it other roots than the ones in the cut face (the same trees' roots seen from behind: the
  // pattern turned over and set a little lower), a shade darker than the wall, with their mycelium. Over it, in draw, the near
  // layer: the roots that ran where the tunnel is, a shade lighter, hanging across it
  function drawBack(c, u, sc, mk) {
    const band = r => mixHex(LAYERS[Math.min(3, Math.floor((r - 1) / 4))], "#140a05", 0.62);
    for (let r = 1; r < H_; r++) { c.fillStyle = band(r); c.fillRect(0, r * u, c.canvas.width, u + 0.5); }
    const far = mk(c.canvas.height), threads = mk(c.canvas.height), fc = far.getContext("2d"), tc = threads.getContext("2d");
    for (const k of [fc, tc]) { k.translate(c.canvas.width, PX(u, 45)); k.scale(-1, 1); }
    drawRoots(fc, u, sc, false); drawThreads(tc, u, sc);
    c.globalAlpha = 0.42; c.drawImage(far, 0, 0); c.globalAlpha = 0.1; c.drawImage(threads, 0, 0); c.globalAlpha = 1;
  }
  // the dug squares, all their layers at once, made again only when the ground changes: the back wall, the near roots and
  // mycelium, and the shadows the earth casts into each (down from earth above, in from earth at either side), a lighter floor
  function dugLayer(g, L, u) {
    const key = g.cells.join("");
    if (S.dug && S.dug.key === key && S.dug.L === L) return S.dug.canvas;
    const cnv = S.dug && S.dug.canvas.width === cv.width && S.dug.canvas.height === L.back.height ? S.dug.canvas : Object.assign(document.createElement("canvas"), { width: cv.width, height: L.back.height });
    const c = cnv.getContext("2d"), dug = (r, k) => r >= 0 && r < H_ && k >= 0 && k < W_ && g.cells[r * W_ + k] === 0;
    c.clearRect(0, 0, cnv.width, cnv.height); c.save(); c.beginPath();
    for (let r = 1; r < H_; r++) for (let k = 0; k < W_; k++) if (dug(r, k)) c.rect(k * u, r * u, u + 0.5, u + 0.5);
    c.clip(); c.drawImage(L.back, 0, 0); c.globalAlpha = 0.2; c.drawImage(L.light, 0, 0); c.globalAlpha = 0.14; c.drawImage(L.threads, 0, 0); c.globalAlpha = 1;
    const shade = (x0, y0, x1, y1, a, rx, ry, rw, rh) => { const gr = c.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(8, 4, 2, ${a})`); gr.addColorStop(1, "rgba(8, 4, 2, 0)"); c.fillStyle = gr; c.fillRect(rx, ry, rw, rh); };
    for (let r = 1; r < H_; r++) for (let k = 0; k < W_; k++) if (dug(r, k)) {
      const x = k * u, y = r * u;
      if (r > 1 && !dug(r - 1, k)) shade(0, y, 0, y + u * 0.34, 0.55, x, y, u + 0.5, u * 0.34);
      if (!dug(r, k - 1)) shade(x, 0, x + u * 0.16, 0, 0.35, x, y, u * 0.16, u + 0.5);
      if (!dug(r, k + 1)) shade(x + u, 0, x + u * 0.84, 0, 0.35, x + u * 0.84, y, u * 0.16 + 0.5, u + 0.5);
      if (!dug(r + 1, k)) { c.fillStyle = "rgba(255, 228, 196, 0.07)"; c.fillRect(x, y + u * 0.9, u + 0.5, u * 0.1); }
    }
    c.restore();
    S.dug = { key, L, canvas: cnv };
    return cnv;
  }
  // (0.0.67; Matthew: "when the dirt is removed, the worms and moles, etc, should drop down") Where a creature let go comes to rest is
  // Hazel's (Scene.landing: for each cell the row it lands in, or -1 where the earth holds it), from the ground's cells with the
  // boulders' counted as earth, and worked out again as the ground changes (interpreted, at most three times a second)
  function landings(g) {
    const h = H(); if (!h || typeof h.landing !== "function") return S.land;
    const cells = g.cells.slice(); for (const b of g.rocks) if (b.r >= 0 && b.r < H_ && b.c >= 0 && b.c < W_) cells[b.r * W_ + b.c] = 1;
    const key = cells.join(""), now = performance.now();
    if (S.landKey === key || (!(S.built && S.built.compiled) && S.land && now - S.landAt < 330)) return S.land;
    try { S.land = h.landing(cells); } catch (e) { S.land = null; }
    S.landKey = key; S.landAt = now;
    return S.land;
  }
  // where a creature is, in hundredths of a cell: at home (hx, hy) while the earth holds it; once its cell is dug out, let go, falling
  // faster and faster to the floor it lands on (a little bounce), and lying there, falling on if that floor is dug away in turn.
  // foot: from its middle to its feet
  function placed(key, hx, hy, foot, land, now) {
    let d = S.drops.get(key);
    const row = (x, y) => { const k = Math.floor(x / 100), r = Math.floor(y / 100); return land && k >= 0 && k < W_ && r >= 1 && r < H_ ? land[r * W_ + k] : -1; };
    if (!d) { if (row(hx, hy) < 0) return null; d = { x: hx, y: hy, vy: 0, t: now, rest: false }; S.drops.set(key, d); }
    const l = row(d.x, Math.min(d.y, H_ * 100 - 1)), dt = Math.min(50, now - d.t); d.t = now;
    if (l < 0) return d;   // (a boulder come down on it: it stays where it is, under the boulder)
    const floor = (l + 1) * 100 - foot;
    if (d.y < floor - 0.5 || d.vy < 0) { d.vy += 0.0035 * dt; d.y += d.vy * dt; d.rest = false;
      if (d.y >= floor) { d.y = floor; d.vy = d.vy > 0.25 ? -d.vy * 0.3 : 0; d.rest = d.vy === 0; } }
    else { d.y = floor; d.vy = 0; d.rest = true; }
    return d;
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
    const land = S.game ? landings(S.game) : null;
    c.save(); c.globalAlpha = 0.9;
    for (let i = 0; i < 9; i++) { let p = along(sc.ants, now / 9000 + i * 0.23); if (!p) break;
      const q = placed("a" + i, p.x, p.y, 4, land, now);   // (an ant let go: on the floor, it wanders to and fro)
      if (q) p = { x: q.x + (q.rest ? Math.sin(now / 1400 + i) * 25 : 0), y: q.y, dx: Math.cos(now / 1400 + i), back: false };
      const x = X(p.x), y = X(p.y), s2 = (p.dx >= 0) !== p.back ? 1 : -1;
      c.strokeStyle = "#1c1917"; c.lineWidth = u * 0.012; c.beginPath(); for (const lx of [-0.03, 0, 0.03]) { c.moveTo(x + lx * u, y); c.lineTo(x + lx * u + Math.sin(now / 60 + i) * u * 0.015, y + u * 0.04); } c.stroke();
      E(x - s2 * u * 0.05, y, u * 0.028, u * 0.022, "#3f1d0b"); E(x, y, u * 0.022, u * 0.018, "#451a03"); E(x + s2 * u * 0.045, y - u * 0.005, u * 0.022, u * 0.02, "#3f1d0b"); }
    const FOOT = { 12: 4, 13: 8, 14: 6, 15: 14, 17: 21, 19: 30 };
    sc.below.forEach((t, i) => {
      if (!FOOT[t.kind]) return;   // (the chambers are in the burrows' layer)
      const q = t.kind === 15 ? null : placed("b" + i, t.x, t.y, FOOT[t.kind], land, now);
      const x = X(q ? q.x : t.x), y = X(q ? q.y : t.y), v = t.v;
      if (t.kind === 15) {   // (the mole, along its run: velvet grey, a pink nose and broad pink hands; let go, on the floor, shuffling)
        const p0 = along(sc.run, now / 14000 + v / 1000) || { x: t.x, y: t.y, dx: 1, back: false }, d = placed("b" + i, p0.x, p0.y, FOOT[15], land, now);
        const p = d ? { x: d.x + (d.rest ? Math.sin(now / 2600 + v) * 22 : 0), y: d.y, dx: Math.cos(now / 2600 + v), back: false } : p0;
        const mx = X(p.x), my = X(p.y), s2 = (p.dx >= 0) !== p.back ? 1 : -1;
        E(mx, my, u * 0.2, u * 0.13, "#374151"); E(mx + s2 * u * 0.17, my + u * 0.02, u * 0.06, u * 0.045, "#f9a8d4");
        E(mx + s2 * u * 0.08, my + u * 0.1, u * 0.07, u * 0.035, "#fbcfe8", s2 * 0.5); E(mx - s2 * u * 0.12, my + u * 0.1, u * 0.05, u * 0.03, "#fbcfe8");
        E(mx + s2 * u * 0.1, my - u * 0.04, u * 0.012, u * 0.012, "#111827");
      } else if (t.kind === 17) {   // (the rabbit in its chamber, an ear twitching, its nose going)
        const tw = Math.sin(now / 400 + v) > 0.9 ? 0.25 : 0;
        E(x, y + u * 0.05, u * 0.22, u * 0.16, "#a8a29e"); E(x + u * 0.16, y - u * 0.04, u * 0.11, u * 0.1, "#a8a29e");
        E(x + u * 0.12, y - u * 0.2, u * 0.03, u * 0.11, "#a8a29e", -0.3 - tw); E(x + u * 0.19, y - u * 0.2, u * 0.03, u * 0.11, "#a8a29e", 0.2);
        E(x + u * 0.12, y - u * 0.2, u * 0.015, u * 0.07, "#fbcfe8", -0.3 - tw); E(x - u * 0.2, y + u * 0.02, u * 0.06, u * 0.06, "#f5f5f4");
        E(x + u * 0.2, y - u * 0.06, u * 0.016, u * 0.016, "#111827"); E(x + u * 0.26, y - u * 0.02 + Math.sin(now / 90) * u * 0.006, u * 0.015, u * 0.012, "#f472b6");
      } else if (t.kind === 19) {   // (the badger, asleep in its sett, breathing)
        badger(c, x, y, u, v % 2 ? 1 : -1, 1 + 0.035 * Math.sin(now / 900 + v));
        c.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.4 * Math.sin(now / 900 + v)})`; c.font = `${Math.round(u * 0.22)}px system-ui`; c.textAlign = "center"; c.fillText("z", x + (v % 2 ? 1 : -1) * u * 0.45, y - u * 0.18 - (now / 60 % 20) * u * 0.005);
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
    });
    c.restore();
  }
  // (0.0.67; Matthew: "some the animals look bad -- the biggest one, whatever its supposed to be") the badger, drawn again: asleep
  // on its side, facing s2, a long low body grizzled grey, darker along its back, short black legs, a stubby tail, and its head
  // resting on its front paws: white, with the black stripe from its nose back over its (closed) eye to its ear, white-tipped
  function badger(c, x, y, u, s2, br) {
    const E = (cx, cy, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, 7); c.fill(); };
    c.save(); c.translate(x, y); c.scale(s2 * u, u);   // (in cells from here: +x its front, y down)
    E(-0.42, 0.12, 0.08, 0.035, "#a8a29e", 0.35);   // (the tail)
    E(-0.26, 0.25, 0.11, 0.05, "#1c1917"); E(-0.12, 0.27, 0.07, 0.035, "#292524");   // (the hind legs, tucked)
    c.save(); c.beginPath(); c.ellipse(-0.02, 0.1, 0.38, 0.17 * br, 0, 0, 7); c.fillStyle = "#9a9ca3"; c.fill(); c.clip();
    E(-0.02, -0.03, 0.4, 0.12 * br, "#5f636b");   // (its back, darker)
    c.strokeStyle = "rgba(240, 240, 240, 0.5)"; c.lineWidth = 0.012; c.lineCap = "round"; c.beginPath();
    for (let i = 0; i < 18; i++) { const gx = -0.34 + i * 0.038, gy = -0.04 + ((i * 37) % 9) * 0.017; c.moveTo(gx, gy); c.lineTo(gx + 0.035, gy - 0.012); } c.stroke();
    E(-0.02, 0.26, 0.4, 0.07, "#3f3f46");   // (its belly, in shadow)
    c.restore();
    E(0.27, 0.27, 0.11, 0.045, "#1c1917"); E(0.36, 0.28, 0.07, 0.035, "#0c0a09");   // (the front paws, under its chin)
    c.save(); c.translate(0.37, 0.15); c.rotate(0.1);   // (the head, a wedge to the nose, resting on the paws)
    c.beginPath(); c.moveTo(-0.13, -0.11); c.quadraticCurveTo(0.08, -0.12, 0.24, -0.02); c.quadraticCurveTo(0.27, 0.02, 0.22, 0.045);
    c.quadraticCurveTo(0.05, 0.11, -0.13, 0.09); c.closePath(); c.fillStyle = "#f4f4f2"; c.fill();
    c.save(); c.clip(); c.strokeStyle = "#111111"; c.lineWidth = 0.065; c.lineCap = "round";
    c.beginPath(); c.moveTo(-0.16, -0.045); c.quadraticCurveTo(0.05, -0.065, 0.24, -0.005); c.stroke(); c.restore();
    E(0.245, 0.01, 0.032, 0.026, "#0c0a09");   // (the nose)
    c.strokeStyle = "#d6d3d1"; c.lineWidth = 0.011; c.beginPath(); c.arc(0.06, -0.06, 0.022, 0.25, Math.PI - 0.25); c.stroke();   // (the eye, closed)
    E(-0.1, -0.115, 0.045, 0.038, "#111111"); E(-0.1, -0.13, 0.028, 0.016, "#f4f4f2");   // (the ear, white-tipped)
    c.restore();
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
      if (v === 0) { if (!L) { c.fillStyle = "#1c1009"; c.fillRect(x, y, u + 0.5, u + 0.5); } }
      else { c.fillStyle = "rgba(0, 0, 0, 0.12)"; c.fillRect(x + u * 0.2, y + u * 0.3, u * 0.08, u * 0.08); c.fillRect(x + u * 0.65, y + u * 0.7, u * 0.08, u * 0.08); }
      if (v === 2) {
        const tw = 0.6 + 0.4 * Math.sin(now / 250 + r * 3 + k);
        c.fillStyle = "#22d3ee"; c.beginPath(); c.moveTo(x + u / 2, y + u * 0.22); c.lineTo(x + u * 0.75, y + u * 0.45); c.lineTo(x + u / 2, y + u * 0.78); c.lineTo(x + u * 0.25, y + u * 0.45); c.closePath(); c.fill();
        c.fillStyle = `rgba(255, 255, 255, ${tw})`; c.beginPath(); c.arc(x + u * 0.42, y + u * 0.4, u * 0.06, 0, 7); c.fill();
      }
    }
    if (L) { c.drawImage(dugLayer(g, L, u), 0, 0); creatures(c, u, now); }   // (the dug squares, two layers deep; then the creatures)
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
    c.src = "compiled.js?v=0.0.67"; c.async = true;
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
  if (Q.has("test")) window.DigTest = { S, newGame, gnome, badger, steps: n => { const h = H(); for (let i = 0; i < n && S.game && !S.game.over; i++) oneStep(h); draw(); bar(); return S.game; }, auto: () => W };
  document.body.classList.add("js");
  draw(); bar();
})();
