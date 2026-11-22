// hazeljs-examples, Pinball (ticket 793; Matthew: "let's try to do a pinball game using hazeljs to describe: layout of the
// game, state of the game, state updates to the game, based on physics and flapper states, etc. In particular, the layout
// of the pinball walls and obstacles should be represented with Hazel data. We should offer 10 different boards, some with
// multiple levels, or other unique features or themes"; then "let's plan to use hazel-jit with hazeljs to make the pinball
// game fast"). The page: the table drawn on a canvas, every frame one step of Hazel's rules (Pinball.step: the flippers,
// gravity, the walls, bumpers, flippers and portals, the drain, the plunger), the buttons and keys; the rules compiled ahead
// of time by hazel-jit (compiled.js) when it is here, else, and once they are edited, run by hazeljs (slower: a step there
// takes tens of milliseconds, so the ball moves in slow motion).
(async () => {
  "use strict";
  const LIB = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "pinball", MODULES = ["Pinball"];
  const TAIL = "(start = Pinball.start, step = Pinball.step, board = Pinball.board)";
  const KEY = "hazeljs-examples/pinball/";
  const Q = new URLSearchParams(location.search);
  const COMPILED = !(Q.has("interpreted") || Q.get("compiled") === "0");
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* kept for this visit only */ } };

  // ---- the state: the rules, the board chosen, the game (a Hazel value), the buttons held, the plunger's pull
  const S = { built: null, libAt: 0, libFailed: false, compiledError: "", board: kept("board", 0), game: null, left: false, right: false,
              pullAt: 0, launch: 0, flash: new Map(), stepMs: [], best: kept("best", {}), boardData: null, layer: null,
              // (round two, ticket 805) what lights up: each bumper's heat (its colour, cooling), the walls kicked, the whole table's
              // flash, rings spreading from each hit, points floating up, the lamps lit and each row's blink when it is all lit, a banner
              heat: [], wallFlash: new Map(), tableFlash: 0, rings: [], pops: [], lit: new Set(), rowBlink: new Map(), banner: null, shown: 0 };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  const SND = window.PinballSound || null;   // (sound.js: the music and the table's sounds)
  const NAMES = ["🌌 Starfield", "🌋 Volcano", "🌊 Ocean", "🍄 Mushroom forest", "🏰 Castle, two floors", "🐱 Cat face", "🎡 Funfair ring", "🌙 Moon, low gravity", "🌀 Portals", "🏙️ City, two levels"];
  NAMES.forEach((n, i) => { const o = document.createElement("option"); o.value = String(i); o.textContent = n; $("boardpick").append(o); });
  if (!(S.board >= 0 && S.board < NAMES.length)) S.board = 0;
  $("boardpick").value = String(S.board);

  // ---- the table: its board drawn once (walls, bumpers, portals) on a layer of its own; each frame, that, the bumpers just
  // hit lit up, the flippers, the plunger and the ball
  const cv = $("board"), cx = cv.getContext("2d");
  // (round two; Matthew: "low-contrast background patterns on each board that are distinct. like mosaics, or animal/floral/plant
  // themes, etc") each board's pattern, by the name its Hazel data gives, drawn faintly in its own colours under everything
  const seeded = n => () => (n = n * 16807 % 2147483647) / 2147483647;
  const PATTERNS = {
    stars(c, r, ink, glow) {   // stars, a few sparkles, faint constellations
      for (let i = 0; i < 170; i++) { const s = r(); c.globalAlpha = 0.07 + 0.13 * s; c.fillStyle = s > 0.9 ? glow : ink; c.beginPath(); c.arc(r() * 600, r() * 1000, 0.7 + 1.6 * s, 0, 7); c.fill(); }
      c.globalAlpha = 0.08; c.strokeStyle = ink;
      for (let k = 0; k < 6; k++) { let x = 60 + r() * 480, y = 80 + r() * 800; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 130; y += (r() - 0.5) * 130; c.lineTo(x, y); } c.stroke(); }
      c.fillStyle = glow; c.globalAlpha = 0.12;
      for (let k = 0; k < 9; k++) { const x = r() * 600, y = r() * 1000, s = 4 + 6 * r(); c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s / 4, y); c.lineTo(x, y + s); c.lineTo(x - s / 4, y); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(x - s, y); c.lineTo(x, y + s / 4); c.lineTo(x + s, y); c.lineTo(x, y - s / 4); c.closePath(); c.fill(); }
    },
    basalt(c, r, ink, glow) {   // a mosaic of basalt columns, hexagons
      const a = 30, h = a * Math.sqrt(3);
      for (let row = -1; row * h / 2 < 1040; row++) for (let col = -1; col * a * 3 < 660; col++) {
        const x = col * a * 3 + (row % 2 ? a * 1.5 : 0), y = row * h / 2;
        c.beginPath(); for (let k = 0; k < 6; k++) c.lineTo(x + (a - 2) * Math.cos(k * Math.PI / 3), y + (a - 2) * Math.sin(k * Math.PI / 3)); c.closePath();
        c.globalAlpha = 0.03 + 0.05 * r(); c.fillStyle = r() < 0.12 ? glow : ink; c.fill(); c.globalAlpha = 0.07; c.strokeStyle = ink; c.stroke(); }
    },
    waves(c, r, ink, glow) {   // scales of water, and a few fish
      c.strokeStyle = ink; c.globalAlpha = 0.08;
      for (let row = 0; row * 18 < 1030; row++) for (let col = -1; col * 36 < 640; col++) { const x = col * 36 + (row % 2 ? 18 : 0); c.beginPath(); c.arc(x, row * 18, 18, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      c.fillStyle = glow;
      for (let k = 0; k < 10; k++) { const x = 40 + r() * 520, y = 60 + r() * 880, s = 10 + 10 * r(), d = r() < 0.5 ? 1 : -1; c.globalAlpha = 0.1;
        c.beginPath(); c.ellipse(x, y, s, s * 0.45, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(x - d * s * 0.8, y); c.lineTo(x - d * s * 1.5, y - s * 0.5); c.lineTo(x - d * s * 1.5, y + s * 0.5); c.closePath(); c.fill(); }
    },
    leaves(c, r, ink, glow) {   // (round four; Matthew: "let's enhance the details of the backgrounds, especially the leaves") a forest
      // floor: leaves of four kinds, each with its veins (a long leaf, a midrib and side veins; an oak leaf, lobed; a maple leaf,
      // five-pointed and toothed; a ginkgo fan), fern fronds (a curving stem, leaflets along it, each a little frond of its
      // own), small spotted mushrooms, flowers, and moss
      const leaf = (x, y, s, t, kind, col) => { c.save(); c.translate(x, y); c.rotate(t); c.fillStyle = col; c.strokeStyle = col; c.beginPath();
        if (kind === 0) { c.moveTo(-s, 0); c.quadraticCurveTo(0, -s * 0.45, s, 0); c.quadraticCurveTo(0, s * 0.45, -s, 0); }
        else if (kind === 1) { for (let k = 0; k <= 48; k++) { const u = k / 48, a = u * Math.PI * 2, w = Math.sin(a) * s * 0.42 * (0.72 + 0.28 * Math.cos(u * 14 * Math.PI)); if (k) c.lineTo(Math.cos(a) * s, w); else c.moveTo(Math.cos(a) * s, w); } }
        else if (kind === 2) { for (let k = 0; k <= 80; k++) { const a = k / 80 * Math.PI * 2 - Math.PI / 2, lobe = Math.abs(Math.cos(a * 2.5 + Math.PI * 1.25)), rr = s * (0.42 + 0.58 * Math.pow(lobe, 3)) * (1 + 0.07 * Math.sin(a * 34)); if (k) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } }
        else { c.moveTo(0, s * 0.6); c.lineTo(-s * 0.78, -s * 0.32); c.quadraticCurveTo(0, -s * 0.9, s * 0.78, -s * 0.32); }
        c.closePath(); c.globalAlpha = 0.08; c.fill(); c.globalAlpha = 0.13; c.lineWidth = 0.8; c.stroke();
        c.globalAlpha = 0.15; c.lineWidth = 0.7; c.beginPath();
        if (kind < 2) { c.moveTo(-s, 0); c.lineTo(s * 0.95, 0); for (let k = 1; k < 6; k++) { const u = -s + k * s / 3; c.moveTo(u, 0); c.lineTo(u + s * 0.24, -s * 0.27); c.moveTo(u, 0); c.lineTo(u + s * 0.24, s * 0.27); } }
        else if (kind === 2) { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; c.moveTo(0, s * 0.1); c.lineTo(Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85); } c.moveTo(0, s * 0.1); c.lineTo(0, s * 0.75); }
        else for (let k = -3; k <= 3; k++) { c.moveTo(0, s * 0.55); c.lineTo(Math.sin(k * 0.32) * s * 0.78, -Math.cos(k * 0.32) * s * 0.6 + s * 0.05); }
        c.stroke(); c.restore(); };
      const fern = (x, y, len, t, d) => { c.save(); c.translate(x, y); c.rotate(t); c.globalAlpha = 0.1; c.strokeStyle = ink; c.lineWidth = d ? 1 : 0.6;
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.14, len, 0); c.stroke();
        for (let k = 1; k < 10; k++) { const u = k / 10, px = len * u, py = -len * 0.14 * 2 * u * (1 - u), l2 = len * 0.34 * (1 - u * 0.75);
          for (const sd of [-1, 1]) { if (d) fern(px, py, l2, sd * 1.05, d - 1); else { c.globalAlpha = 0.1; c.fillStyle = glow; c.beginPath(); c.ellipse(px, py, l2 * 0.55, l2 * 0.17, sd * 1.05, 0, 7); c.fill(); } } }
        c.restore(); };
      for (let k = 0; k < 12; k++) fern(r() * 600, r() * 1000, 55 + 45 * r(), r() * 7, 1);
      for (let k = 0; k < 72; k++) leaf(r() * 600, r() * 1000, 9 + 16 * r(), r() * 7, Math.floor(r() * 4), r() < 0.25 ? glow : ink);
      for (let k = 0; k < 16; k++) { const x = r() * 600, y = r() * 1000, sz = 4 + 6 * r(); c.globalAlpha = 0.1; c.fillStyle = ink; c.fillRect(x - sz * 0.18, y, sz * 0.36, sz * 0.9);
        c.fillStyle = glow; c.beginPath(); c.ellipse(x, y, sz, sz * 0.62, 0, Math.PI, 0); c.fill(); c.globalAlpha = 0.16; c.fillStyle = "#ffffff"; for (let d = 0; d < 3; d++) { c.beginPath(); c.arc(x - sz * 0.5 + d * sz * 0.5, y - sz * 0.3, sz * 0.11, 0, 7); c.fill(); } }
      for (let k = 0; k < 22; k++) { const x = r() * 600, y = r() * 1000; c.globalAlpha = 0.1; c.fillStyle = glow; for (let q = 0; q < 5; q++) { const a = q * 2 * Math.PI / 5; c.beginPath(); c.arc(x + 5 * Math.cos(a), y + 5 * Math.sin(a), 3.4, 0, 7); c.fill(); }
        c.fillStyle = "#facc15"; c.globalAlpha = 0.14; c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
      for (let k = 0; k < 280; k++) { c.globalAlpha = 0.05 + 0.06 * r(); c.fillStyle = r() < 0.5 ? ink : glow; c.beginPath(); c.arc(r() * 600, r() * 1000, 0.8 + 1.4 * r(), 0, 7); c.fill(); }
    },
    bricks(c, r, ink, glow) {   // the castle's stones
      for (let row = 0; row * 26 < 1000; row++) for (let col = -1; col * 62 < 620; col++) { const x = col * 62 + (row % 2 ? 31 : 0), y = row * 26;
        c.globalAlpha = 0.025 + 0.04 * r(); c.fillStyle = r() < 0.06 ? glow : ink; c.fillRect(x + 2, y + 2, 58, 22); c.globalAlpha = 0.06; c.strokeStyle = ink; c.strokeRect(x + 2, y + 2, 58, 22); }
    },
    paws(c, r, ink, glow) {   // trails of paw prints
      for (let k = 0; k < 7; k++) { let x = r() * 600, y = r() * 1000; const t = r() * Math.PI * 2;
        for (let j = 0; j < 6; j++) { const side = j % 2 ? 1 : -1, px = x + side * 12 * Math.cos(t + Math.PI / 2), py = y + side * 12 * Math.sin(t + Math.PI / 2);
          c.save(); c.translate(px, py); c.rotate(t + Math.PI / 2); c.globalAlpha = 0.09; c.fillStyle = j % 3 ? ink : glow;
          c.beginPath(); c.ellipse(0, 4, 7, 6, 0, 0, 7); c.fill(); for (const [tx, ty] of [[-8, -5], [-3, -9], [3, -9], [8, -5]]) { c.beginPath(); c.arc(tx, ty, 2.6, 0, 7); c.fill(); } c.restore();
          x += 40 * Math.cos(t); y += 40 * Math.sin(t); } }
    },
    diamonds(c, r, ink, glow) {   // a harlequin's diamonds, and lights between
      const w = 50, h = 80;
      for (let row = -1; row * h / 2 < 1040; row++) for (let col = -1; col * w < 640; col++) { const x = col * w + (row % 2 ? w / 2 : 0), y = row * h / 2;
        c.beginPath(); c.moveTo(x, y - h / 2); c.lineTo(x + w / 2, y); c.lineTo(x, y + h / 2); c.lineTo(x - w / 2, y); c.closePath();
        c.globalAlpha = (row + col) % 2 ? 0.07 : 0.025; c.fillStyle = (row + col) % 3 ? ink : glow; c.fill(); c.globalAlpha = 0.12; c.fillStyle = glow; c.beginPath(); c.arc(x + w / 2, y, 1.6, 0, 7); c.fill(); }
    },
    craters(c, r, ink, glow) {   // the moon's craters
      for (let k = 0; k < 46; k++) { const x = r() * 600, y = r() * 1000, s = 6 + 46 * r() * r();
        c.globalAlpha = 0.05; c.fillStyle = ink; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); c.globalAlpha = 0.09; c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke();
        c.globalAlpha = 0.08; c.strokeStyle = glow; c.beginPath(); c.arc(x + s * 0.12, y + s * 0.12, s * 0.8, 0.9 * Math.PI, 1.6 * Math.PI); c.stroke(); }
    },
    rings(c, r, ink, glow) {   // rings round three hidden centres, crossing each other
      c.lineWidth = 2;
      for (const [x, y, col] of [[120, 250, ink], [480, 520, glow], [260, 830, ink]]) for (let k = 1; k < 45; k++) { c.globalAlpha = 0.045; c.strokeStyle = col; c.beginPath(); c.arc(x, y, k * 15, 0, 7); c.stroke(); }
    },
    windows(c, r, ink, glow) {   // towers of windows, a few lit
      let x = 0;
      while (x < 600) { const w = 48 + Math.floor(r() * 40), top = 120 + r() * 520;
        c.globalAlpha = 0.04; c.fillStyle = ink; c.fillRect(x + 3, top, w - 6, 1000 - top);
        for (let y = top + 10; y < 990; y += 22) for (let wx = x + 9; wx < x + w - 12; wx += 14) { const on = r() < 0.16; c.globalAlpha = on ? 0.16 : 0.06; c.fillStyle = on ? glow : ink; c.fillRect(wx, y, 7, 11); }
        x += w; }
    },
  };
  // (round three; Matthew: "for at least 3 boards, let's put two or three of the round bumpers into an animation loop, with \"a
  // track\" that's printed as part of the background, as if it's being automated mechanically behind the board") where a bumper
  // is at step t, as the rules place it; its track printed under the board as a groove with rails and sleepers (a straight
  // stroke with a pulley at each end), and each frame a gear turning at an oval's middle with an arm out to each bumper on it
  const TAU = 6.283185307179586;
  const spot = (b, q, t) => { if (!(q.track >= 0)) return [q.x, q.y, 0];
    const tr = (b.tracks || [])[q.track] || { cx: 0, cy: 0, rx: 0, ry: 0, period: 1 }, th = TAU / tr.period * t + TAU * q.phase / 1000;
    return [tr.cx + tr.rx * Math.cos(th), tr.cy + tr.ry * Math.sin(th), th]; };
  function trackLayer(c, b) {
    for (const tr of b.tracks || []) {
      c.save(); c.lineCap = "round";
      if (tr.rx > 0 && tr.ry > 0) {
        c.globalAlpha = 0.5; c.strokeStyle = "rgba(0,0,0,0.55)"; c.lineWidth = 18; c.beginPath(); c.ellipse(tr.cx, tr.cy, tr.rx, tr.ry, 0, 0, TAU); c.stroke();
        c.globalAlpha = 0.4; c.strokeStyle = b.ink; c.lineWidth = 1.5;
        for (const d of [-6, 6]) { c.beginPath(); c.ellipse(tr.cx, tr.cy, tr.rx + d, tr.ry + d, 0, 0, TAU); c.stroke(); }
        c.globalAlpha = 0.25; const n = Math.round((tr.rx + tr.ry) * Math.PI / 14);
        for (let k = 0; k < n; k++) { const a = k * TAU / n, x = tr.cx + tr.rx * Math.cos(a), y = tr.cy + tr.ry * Math.sin(a), nx = tr.ry * Math.cos(a), ny = tr.rx * Math.sin(a), m = Math.hypot(nx, ny) || 1;
          c.beginPath(); c.moveTo(x - 8 * nx / m, y - 8 * ny / m); c.lineTo(x + 8 * nx / m, y + 8 * ny / m); c.stroke(); }
      } else {
        const x0 = tr.cx - tr.rx, y0 = tr.cy - tr.ry, x1 = tr.cx + tr.rx, y1 = tr.cy + tr.ry, ux = (x1 - x0) / (Math.hypot(x1 - x0, y1 - y0) || 1), uy = (y1 - y0) / (Math.hypot(x1 - x0, y1 - y0) || 1);
        c.globalAlpha = 0.5; c.strokeStyle = "rgba(0,0,0,0.55)"; c.lineWidth = 18; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        c.globalAlpha = 0.4; c.strokeStyle = b.ink; c.lineWidth = 1.5;
        for (const d of [-6, 6]) { c.beginPath(); c.moveTo(x0 - uy * d, y0 + ux * d); c.lineTo(x1 - uy * d, y1 + ux * d); c.stroke(); }
        c.globalAlpha = 0.25; const len = Math.hypot(x1 - x0, y1 - y0);
        for (let k = 0; k <= len; k += 14) { const x = x0 + ux * k, y = y0 + uy * k; c.beginPath(); c.moveTo(x - uy * 8, y + ux * 8); c.lineTo(x + uy * 8, y - ux * 8); c.stroke(); }
        for (const [x, y] of [[x0 - ux * 22, y0 - uy * 22], [x1 + ux * 22, y1 + uy * 22]]) { c.globalAlpha = 0.35; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 11, 0, TAU); c.stroke(); c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }
      }
      c.restore();
    }
  }
  // ---- (round four; Matthew: "let's enhance the details of the other game elements that are active, like the bumpers and the
  // side walls, making them more fractalized for effect (but not in game geometry, which stays smooth)") a wall drawn smooth,
  // as the rules have it, with a fringe beside it: a lightning line each side (the segment's midpoints pushed out at random,
  // the push halving each time) and frost branching off it every so often (each branch splitting in two, twice)
  function fringe(c, w, col, seed) {
    const r = seeded(seed), dx = w.bx - w.ax, dy = w.by - w.ay, L = Math.hypot(dx, dy); if (L < 8) return;
    const nx = -dy / L, ny = dx / L;
    c.save(); c.strokeStyle = col; c.lineCap = "round";
    for (const side of [-1, 1]) {
      let pts = [[0, 0], [1, 0]], amp = Math.min(7, L / 9);
      for (let it = 0; it < 4; it++) { const out = []; for (let k = 0; k < pts.length - 1; k++) out.push(pts[k], [(pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2 + (r() - 0.5) * amp]); out.push(pts[pts.length - 1]); pts = out; amp /= 2; }
      c.beginPath(); pts.forEach(([u, o], k) => { const x = w.ax + dx * u + nx * (side * 6 + o), y = w.ay + dy * u + ny * (side * 6 + o); if (k) c.lineTo(x, y); else c.moveTo(x, y); });
      c.globalAlpha = 0.32; c.lineWidth = 1; c.stroke();
    }
    const branch = (x, y, a, len, d) => { const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); if (d) { branch(x2, y2, a - 0.65, len * 0.62, d - 1); branch(x2, y2, a + 0.65, len * 0.62, d - 1); } };
    c.globalAlpha = 0.2; c.lineWidth = 0.8;
    for (let u = 14; u < L - 8; u += 28) { const side = r() < 0.5 ? -1 : 1, x = w.ax + dx * u / L + nx * side * 6, y = w.ay + dy * u / L + ny * side * 6; branch(x, y, Math.atan2(ny * side, nx * side), 7, 2); }
    c.restore();
  }
  // each bumper from a sprite of its own (twice the pixels, sharp on a phone), turned a little each frame: a rim of spikes on
  // spikes (a Koch star: each edge of a twelve-sided figure breaks into a spike, twice over), a glassy body, and circles round
  // circles inside it (six round the middle one, six round each of those)
  const sprites = new Map();
  function sprite(r, ink, glow) {
    const key = `${r}|${ink}|${glow}`; if (sprites.has(key)) return sprites.get(key);
    const s = Math.ceil(2 * r + 22), C = document.createElement("canvas"); C.width = C.height = 2 * s;
    const c = C.getContext("2d"); c.scale(2, 2); c.translate(s / 2, s / 2);
    let pts = []; for (let k = 0; k < 12; k++) pts.push([Math.cos(k * Math.PI / 6) * (r + 2), Math.sin(k * Math.PI / 6) * (r + 2)]);
    for (let it = 0; it < 2; it++) { const out = [];
      for (let k = 0; k < pts.length; k++) { const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % pts.length], dx = bx - ax, dy = by - ay, mx = ax + dx / 2, my = ay + dy / 2;
        let nx = dy, ny = -dx; if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; } const h = it ? 0.24 : 0.32;
        out.push([ax, ay], [ax + dx / 3, ay + dy / 3], [mx + nx * h, my + ny * h], [ax + 2 * dx / 3, ay + 2 * dy / 3]); }
      pts = out; }
    c.beginPath(); pts.forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
    c.globalAlpha = 0.3; c.fillStyle = glow; c.fill(); c.globalAlpha = 0.85; c.strokeStyle = glow; c.lineWidth = 1; c.stroke();
    const body = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.08, 0, 0, r); body.addColorStop(0, "#ffffff"); body.addColorStop(0.3, glow); body.addColorStop(1, ink);
    c.globalAlpha = 0.8; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = body; c.fill();
    c.save(); c.beginPath(); c.arc(0, 0, r - 1, 0, TAU); c.clip();
    const ring = (x, y, rr, d) => { c.beginPath(); c.arc(x, y, rr, 0, TAU); c.stroke(); if (d) for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ring(x + Math.cos(a) * rr, y + Math.sin(a) * rr, rr / 2.7, d - 1); } };
    c.globalAlpha = 0.45; c.strokeStyle = ink; c.lineWidth = 0.7; ring(0, 0, r * 0.4, 2); c.restore();
    c.globalAlpha = 1; c.lineWidth = 2.5; c.strokeStyle = ink; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    const out = { C, s }; sprites.set(key, out); return out;
  }
  // a path of a link (x, y, x, y...): its point a share v of the way along
  function along(path, v) {
    if (!path || path.length < 4) return null;
    const segs = []; let total = 0; for (let k = 0; k + 3 < path.length; k += 2) { const l = Math.hypot(path[k + 2] - path[k], path[k + 3] - path[k + 1]); segs.push(l); total += l; }
    let d = Math.max(0, Math.min(1, v)) * total;
    for (let k = 0, i = 0; k + 3 < path.length; k += 2, i++) { if (d <= segs[i] || i === segs.length - 1) { const u = segs[i] ? Math.min(1, d / segs[i]) : 0; return [path[k] + (path[k + 2] - path[k]) * u, path[k + 1] + (path[k + 3] - path[k + 1]) * u]; } d -= segs[i]; }
    return [path[path.length - 2], path[path.length - 1]];
  }
  function polyline(c, path) { c.beginPath(); for (let k = 0; k + 1 < path.length; k += 2) if (k) c.lineTo(path[k], path[k + 1]); else c.moveTo(path[k], path[k + 1]); }
  // the table's layer: the pattern, the tracks, the hidden tunnels (dotted, under the board), the table's walls (smooth, their
  // fringe beside them), its portals and the mouths of its ramps and lifts; the bumpers are drawn each frame (they turn)
  // (round four) a detail more on each of the other patterns: nebulas among the stars, cracks through the basalt, foam on the
  // water, moss on the stones, fish bones among the paw prints, confetti over the diamonds, rays from the craters, a spiral in
  // the rings, aerials and stars over the towers
  const DETAILS = {
    stars(c, r, ink, glow) { for (let k = 0; k < 4; k++) { const x = r() * 600, y = r() * 1000, rr = 120 + 120 * r(), g2 = c.createRadialGradient(x, y, 4, x, y, rr); g2.addColorStop(0, k % 2 ? glow : ink); g2.addColorStop(1, "rgba(0,0,0,0)"); c.globalAlpha = 0.07; c.fillStyle = g2; c.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); } },
    basalt(c, r, ink) { c.strokeStyle = ink; c.lineWidth = 1; for (let k = 0; k < 14; k++) { let x = r() * 600, y = r() * 1000; c.globalAlpha = 0.1; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 7; j++) { x += (r() - 0.5) * 50; y += 10 + r() * 30; c.lineTo(x, y); } c.stroke(); } },
    waves(c, r, ink, glow) { c.fillStyle = "#ffffff"; for (let k = 0; k < 160; k++) { c.globalAlpha = 0.05 + 0.06 * r(); c.beginPath(); c.arc(r() * 600, r() * 1000, 0.8 + 1.8 * r(), 0, 7); c.fill(); } },
    bricks(c, r, ink, glow) { for (let k = 0; k < 40; k++) { const x = r() * 600, y = r() * 1000; c.globalAlpha = 0.08; c.fillStyle = "#4ade80"; for (let j = 0; j < 7; j++) { c.beginPath(); c.arc(x + (r() - 0.5) * 18, y + (r() - 0.5) * 8, 2 + 3 * r(), 0, 7); c.fill(); } } },
    paws(c, r, ink, glow) { c.strokeStyle = glow; c.lineWidth = 1.5; for (let k = 0; k < 6; k++) { const x = r() * 600, y = r() * 1000, t = r() * 7; c.save(); c.translate(x, y); c.rotate(t); c.globalAlpha = 0.1;
      c.beginPath(); c.moveTo(-18, 0); c.lineTo(16, 0); for (let j = -2; j <= 2; j++) { c.moveTo(j * 6, -6); c.lineTo(j * 6, 6); } c.moveTo(16, 0); c.lineTo(24, -7); c.moveTo(16, 0); c.lineTo(24, 7); c.stroke(); c.beginPath(); c.arc(-22, 0, 4, 0, 7); c.stroke(); c.restore(); } },
    diamonds(c, r, ink, glow) { for (let k = 0; k < 120; k++) { c.save(); c.translate(r() * 600, r() * 1000); c.rotate(r() * 7); c.globalAlpha = 0.1; c.fillStyle = [ink, glow, "#38bdf8", "#4ade80"][k % 4]; c.fillRect(-3, -1.5, 6, 3); c.restore(); } },
    craters(c, r, ink, glow) { c.strokeStyle = glow; c.lineWidth = 1; for (let k = 0; k < 4; k++) { const x = r() * 600, y = r() * 1000; for (let j = 0; j < 12; j++) { const a = j * Math.PI / 6 + r() * 0.3, l = 60 + 80 * r(); c.globalAlpha = 0.06; c.beginPath(); c.moveTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); } } },
    rings(c, r, ink, glow) { c.strokeStyle = glow; c.lineWidth = 1.5; c.globalAlpha = 0.07; c.beginPath(); for (let k = 0; k < 900; k++) { const a = k * 0.06, rr = 4 + k * 0.5; const x = 300 + Math.cos(a) * rr, y = 500 + Math.sin(a) * rr; if (k) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); },
    windows(c, r, ink, glow) { c.strokeStyle = ink; c.lineWidth = 1; for (let k = 0; k < 9; k++) { const x = 20 + r() * 560, y = 130 + r() * 300; c.globalAlpha = 0.1; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 30 - 30 * r()); c.stroke(); }
      c.fillStyle = glow; for (let k = 0; k < 40; k++) { c.globalAlpha = 0.08 + 0.08 * r(); c.beginPath(); c.arc(r() * 600, r() * 200, 0.8 + r(), 0, 7); c.fill(); } },
  };
  function boardLayer(b) {
    const L = document.createElement("canvas"); L.width = 600; L.height = 1000;
    const c = L.getContext("2d");
    c.fillStyle = b.bg; c.fillRect(0, 0, 600, 1000);
    if (PATTERNS[b.pattern]) { c.save(); PATTERNS[b.pattern](c, seeded(7 + 31 * S.board), b.ink, b.glow); c.restore(); c.globalAlpha = 1; c.lineWidth = 1; }
    if (DETAILS[b.pattern]) { c.save(); DETAILS[b.pattern](c, seeded(71 + 31 * S.board), b.ink, b.glow); c.restore(); c.globalAlpha = 1; c.lineWidth = 1; }
    c.fillStyle = b.ink; trackLayer(c, b); c.globalAlpha = 1; c.lineWidth = 1;
    for (const p of b.portals) if (p.kind === 3) { c.save(); c.setLineDash([3, 7]); c.globalAlpha = 0.35; c.strokeStyle = b.glow; c.lineWidth = 3; polyline(c, p.path); c.stroke(); c.restore(); }
    b.walls.forEach((w, j) => { if (w.level) return; fringe(c, w, w.kick > 0 ? b.glow : b.ink, 101 + 7 * j); });
    c.lineCap = "round";
    for (const w of b.walls) { if (w.level) continue; c.beginPath(); c.moveTo(w.ax, w.ay); c.lineTo(w.bx, w.by); c.lineWidth = w.kick > 0 ? 8 : 5; c.strokeStyle = w.kick > 0 ? b.glow : b.ink; c.stroke(); }
    for (const p of b.portals) {
      if ((p.from || 0) !== 0) continue;
      if (!p.kind) { for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(p.x, p.y, p.r - i * 6, 0, TAU); c.strokeStyle = i % 2 ? b.ink : b.glow; c.lineWidth = 3; c.stroke(); }
        c.beginPath(); c.arc(p.tx, p.ty, 8, 0, TAU); c.strokeStyle = b.glow; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]); continue; }
      // a ramp's mouth: a metal arch over the way in, chevrons pointing up it; a lift's: a ring and an arrow up
      c.save(); c.translate(p.x, p.y); c.strokeStyle = "#e2e8f0"; c.lineWidth = 2.5; c.globalAlpha = 0.85;
      if (p.kind === 1) { c.beginPath(); c.arc(0, 4, p.r, Math.PI, TAU); c.stroke(); c.beginPath(); c.moveTo(-p.r, 4); c.lineTo(-p.r, 16); c.moveTo(p.r, 4); c.lineTo(p.r, 16); c.stroke();
        c.strokeStyle = b.glow; for (const yy of [2, 12]) { c.beginPath(); c.moveTo(-8, yy + 6); c.lineTo(0, yy); c.lineTo(8, yy + 6); c.stroke(); } }
      else { c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.stroke(); c.strokeStyle = b.glow; c.beginPath(); c.moveTo(0, 8); c.lineTo(0, -8); c.moveTo(-6, -2); c.lineTo(0, -8); c.lineTo(6, -2); c.stroke(); }
      c.restore();
    }
    // (its name in the corner under the left slope, out of play: the foot of the table is the save light's, and some boards' post)
    c.fillStyle = b.ink; c.font = "bold 20px system-ui, sans-serif"; c.textAlign = "left"; c.globalAlpha = 0.5; c.fillText(b.name, 26, 985); c.globalAlpha = 1;
    return L;
  }
  // (round four; Matthew: "add a mezzanine level, that's transparent but apparently one level above the back half of the board")
  // the mezzanine's layer: its glass (the outline the board gives), lit along its edge, light streaking across it; its walls;
  // its holes
  function deckLayer(b) {
    if (!b.glass || b.glass.length < 6) return null;
    const L = document.createElement("canvas"); L.width = 600; L.height = 1000; const c = L.getContext("2d");
    polyline(c, b.glass); c.closePath();
    const gl = c.createLinearGradient(0, 40, 600, 420); gl.addColorStop(0, "rgba(255,255,255,0.16)"); gl.addColorStop(0.5, "rgba(255,255,255,0.05)"); gl.addColorStop(1, "rgba(255,255,255,0.12)");
    c.fillStyle = gl; c.fill(); c.globalAlpha = 0.75; c.strokeStyle = b.glow; c.lineWidth = 2; c.stroke();
    c.save(); c.clip(); c.globalAlpha = 0.08; c.strokeStyle = "#ffffff"; c.lineWidth = 14; for (let k = -2; k < 6; k++) { c.beginPath(); c.moveTo(k * 140, 0); c.lineTo(k * 140 + 260, 460); c.stroke(); } c.restore();
    b.walls.forEach((w, j) => { if (!w.level) return; fringe(c, w, b.glow, 301 + 7 * j); });
    c.globalAlpha = 1; c.lineCap = "round";
    for (const w of b.walls) { if (!w.level) continue; c.beginPath(); c.moveTo(w.ax, w.ay); c.lineTo(w.bx, w.by); c.lineWidth = 5; c.strokeStyle = b.ink; c.stroke(); c.lineWidth = 1.5; c.strokeStyle = "#ffffff"; c.globalAlpha = 0.5; c.stroke(); c.globalAlpha = 1; }
    for (const p of b.portals) { if (p.from !== 1 || p.kind === 1) continue;
      const hg = c.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r); hg.addColorStop(0, "#000000"); hg.addColorStop(0.8, "rgba(0,0,0,0.85)"); hg.addColorStop(1, b.glow);
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fillStyle = hg; c.fill(); }
    for (const p of b.portals) { if (p.from !== 1 || p.kind !== 1) continue; c.save(); c.translate(p.x, p.y); c.strokeStyle = "#e2e8f0"; c.lineWidth = 2; c.beginPath(); c.arc(0, -2, p.r, 0, Math.PI); c.stroke(); c.restore(); }
    return L;
  }
  // the wires over everything: each ramp a tube of four wires with rings round them; each lift a cage of two rails with rungs
  function wireLayer(b) {
    const ws = b.portals.filter(p => (p.kind === 1 || p.kind === 2) && p.path && p.path.length >= 4); if (!ws.length) return null;
    const L = document.createElement("canvas"); L.width = 600; L.height = 1000; const c = L.getContext("2d"); c.lineCap = "round"; c.lineJoin = "round";
    for (const p of ws) {
      const path = p.path, offs = p.kind === 1 ? [-7, -2.5, 2.5, 7] : [-8, 8];
      c.globalAlpha = 0.25; c.strokeStyle = "#000000"; c.lineWidth = 18; c.save(); c.translate(6, 9); polyline(c, path); c.stroke(); c.restore();
      for (let k = 0; k + 3 < path.length; k += 2) {
        const ax = path[k], ay = path[k + 1], bx = path[k + 2], by = path[k + 3], l = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / l, ny = (bx - ax) / l;
        offs.forEach((o, i) => { c.globalAlpha = 0.85; c.strokeStyle = i % 2 ? "#94a3b8" : "#e2e8f0"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ax + nx * o, ay + ny * o); c.lineTo(bx + nx * o, by + ny * o); c.stroke(); });
        const step = p.kind === 1 ? 16 : 10;
        for (let u = 0; u < l; u += step) { const x = ax + (bx - ax) * u / l, y = ay + (by - ay) * u / l; c.globalAlpha = 0.7; c.strokeStyle = "#cbd5e1"; c.lineWidth = p.kind === 1 ? 1.2 : 1.6;
          c.beginPath(); c.moveTo(x + nx * offs[0], y + ny * offs[0]); c.lineTo(x + nx * offs[offs.length - 1], y + ny * offs[offs.length - 1]); c.stroke(); }
      }
    }
    return L;
  }
  function draw() {
    const b = S.boardData, g = S.game;
    if (!b) { cx.fillStyle = "#0b1030"; cx.fillRect(0, 0, 600, 1000); return; }
    cx.drawImage(S.layer, 0, 0);
    const now = performance.now(), T = g ? g.t || 0 : 0, lvOf = p => p.level || 0;
    // (Matthew: "let's have the backgrounds animate/flash, etc, to make the game more excting") a slow glow wandering over the
    // pattern; the whole table flashing at a hit, and a ring spreading from it
    const gx = 300 + 210 * Math.sin(now / 2900), gy = 500 + 330 * Math.cos(now / 4100), amb = cx.createRadialGradient(gx, gy, 10, gx, gy, 420);
    amb.addColorStop(0, b.glow); amb.addColorStop(1, "rgba(0,0,0,0)"); cx.globalAlpha = 0.07; cx.fillStyle = amb; cx.fillRect(0, 0, 600, 1000);
    const tf = now - S.tableFlash; if (tf < 260) { cx.globalAlpha = 0.16 * (1 - tf / 260); cx.fillStyle = b.glow; cx.fillRect(0, 0, 600, 1000); }
    S.rings = S.rings.filter(q => now - q.t < 420);
    for (const q of S.rings) { const u = (now - q.t) / 420; cx.globalAlpha = 0.55 * (1 - u); cx.strokeStyle = q.col || b.glow; cx.lineWidth = 4 * (1 - u) + 1; cx.beginPath(); cx.arc(q.x, q.y, q.r + 150 * u, 0, 7); cx.stroke(); }
    cx.globalAlpha = 1;
    for (const [grp, t] of S.rowBlink) if (now - t >= 900) { S.rowBlink.delete(grp); (b.lights || []).forEach((l, k) => { if (l.group === grp) S.lit.delete(k); }); }
    const ball = (bx, by, r) => { const grad = cx.createRadialGradient(bx - r / 3, by - r / 3, 1, bx, by, r); grad.addColorStop(0, "#ffffff"); grad.addColorStop(1, "#9ca3af");
      cx.beginPath(); cx.arc(bx, by, r, 0, TAU); cx.fillStyle = grad; cx.fill(); };
    // one level's moving things: (Matthew: "\"light arrays\" along the paths that are most likey for the ball to travel") the
    // lamps, a slow chase in the dark ones; the machine behind the tracks; the bumpers, turning, warming with their hits, a hit
    // flashing white; the walls that kicked, lit along their length; the flippers; and the ball, if it is on this level
    function level(lv) {
      (b.lights || []).forEach((l, k) => { if (lvOf(l) !== lv) return;
        const blink = S.rowBlink.get(l.group), on = S.lit.has(k) || (blink && now - blink < 900 && Math.floor((now - blink) / 110) % 2 === 0);
        if (on) { cx.globalAlpha = 0.3; cx.fillStyle = b.glow; cx.beginPath(); cx.arc(l.x, l.y, 13, 0, 7); cx.fill(); cx.globalAlpha = 1; cx.beginPath(); cx.arc(l.x, l.y, 6.5, 0, 7); cx.fill();
          cx.fillStyle = "#ffffff"; cx.globalAlpha = 0.8; cx.beginPath(); cx.arc(l.x - 1.5, l.y - 1.5, 2.2, 0, 7); cx.fill(); }
        else { const chase = 0.5 + 0.5 * Math.sin(now / 180 - k * 0.9); cx.globalAlpha = 0.25 + 0.25 * chase; cx.strokeStyle = b.glow; cx.lineWidth = 2; cx.beginPath(); cx.arc(l.x, l.y, 6.5, 0, 7); cx.stroke();
          cx.globalAlpha = 0.08 + 0.12 * chase; cx.fillStyle = b.glow; cx.fill(); } });
      cx.globalAlpha = 1;
      if (lv === 0) (b.tracks || []).forEach((tr, k) => {
        const riders = b.bumpers.filter(q => q.track === k);
        if (tr.rx > 0 && tr.ry > 0) {
          const th = TAU / tr.period * T; cx.save(); cx.translate(tr.cx, tr.cy); cx.rotate(th); cx.globalAlpha = 0.35; cx.strokeStyle = b.ink; cx.lineWidth = 2;
          cx.beginPath(); for (let i = 0; i < 24; i++) { const a0 = i * TAU / 24, r0 = i % 2 ? 30 : 36; cx.lineTo(r0 * Math.cos(a0), r0 * Math.sin(a0)); cx.lineTo(r0 * Math.cos(a0 + TAU / 24), r0 * Math.sin(a0 + TAU / 24)); } cx.closePath(); cx.stroke();
          cx.beginPath(); cx.arc(0, 0, 9, 0, TAU); cx.stroke(); cx.restore();
          for (const q of riders) { const [x, y] = spot(b, q, T); cx.globalAlpha = 0.3; cx.strokeStyle = b.ink; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(tr.cx, tr.cy); cx.lineTo(x, y); cx.stroke(); }
        } else for (const q of riders) { const [x, y] = spot(b, q, T); cx.globalAlpha = 0.4; cx.strokeStyle = b.ink; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(tr.cx - tr.rx, tr.cy - tr.ry - 22); cx.lineTo(x, y - q.r); cx.stroke(); }
      });
      cx.globalAlpha = 1;
      b.bumpers.forEach((q, i) => { if (lvOf(q) !== lv) return;
        const [qx, qy] = spot(b, q, T), h = S.heat[i] || 0, t = S.flash.get(i), sp = sprite(q.r, b.ink, b.glow);
        cx.save(); cx.translate(qx, qy); cx.rotate(now / 3000 * (1 + 4 * h) + i); cx.drawImage(sp.C, -sp.s / 2, -sp.s / 2, sp.s, sp.s); cx.restore();
        if (h > 0.02) { cx.globalAlpha = 0.2 + 0.55 * h; cx.fillStyle = b.glow; cx.beginPath(); cx.arc(qx, qy, q.r - 3, 0, 7); cx.fill(); S.heat[i] = h * 0.985; }
        if (t && now - t < 180) { const u = (now - t) / 180; cx.globalAlpha = 1 - u; cx.fillStyle = "#ffffff"; cx.beginPath(); cx.arc(qx, qy, q.r + 6 * (1 - u), 0, 7); cx.fill(); }
        cx.globalAlpha = 1; });
      for (const [j, t] of S.wallFlash) { const w = b.walls[j]; if (!w || lvOf(w) !== lv) continue; const u = (now - t) / 240; if (u >= 1) { S.wallFlash.delete(j); continue; }
        cx.globalAlpha = 1 - u; cx.strokeStyle = "#ffffff"; cx.lineWidth = 12 - 6 * u; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(w.ax, w.ay); cx.lineTo(w.bx, w.by); cx.stroke(); }
      cx.globalAlpha = 1;
      if (!g) return;
      b.flippers.forEach((f, i) => { if (lvOf(f) !== lv) return; const a = (g.flips[i] ?? 500) / 1000, tx = f.x + f.side * f.len * Math.cos(a), ty = f.y + f.len * Math.sin(a);
        cx.beginPath(); cx.moveTo(f.x, f.y); cx.lineTo(tx, ty); cx.strokeStyle = b.glow; cx.lineWidth = lv ? 13 : 16; cx.lineCap = "round"; cx.stroke();
        cx.globalAlpha = 0.5; cx.strokeStyle = "#ffffff"; cx.lineWidth = 2; cx.stroke(); cx.globalAlpha = 1;
        cx.beginPath(); cx.arc(f.x, f.y, lv ? 5 : 6, 0, TAU); cx.fillStyle = b.bg; cx.fill(); });
      if (!(g.warp > 0) && (g.lv || 0) === lv) { const x = g.x / 1000, y = g.y / 1000;
        if (lv) { cx.globalAlpha = 0.3; cx.fillStyle = "#000000"; cx.beginPath(); cx.arc(x + 10, y + 14, 12, 0, TAU); cx.fill(); cx.globalAlpha = 1; ball(x, y, 13.5); } else ball(x, y, 12); }
    }
    level(0);
    if (S.deck) { cx.save(); cx.globalAlpha = 0.28; cx.fillStyle = "#000000"; cx.translate(10, 14); polyline(cx, b.glass); cx.closePath(); cx.fill(); cx.restore(); cx.globalAlpha = 1; cx.drawImage(S.deck, 0, 0); level(1); }
    if (S.wires) cx.drawImage(S.wires, 0, 0);
    if (!g) return;
    // the plunger, pulled down as the launch is held
    const pull = S.pullAt ? Math.min(1, (now - S.pullAt) / 1200) : 0;
    cx.fillStyle = b.ink; cx.fillRect(551, 968 + pull * 22, 24, 10);
    // (Matthew: "we should be able to adjust the launch power") the pull's power, as a bar beside the lane while it is held
    if (pull > 0) { cx.globalAlpha = 0.35; cx.fillStyle = b.ink; cx.fillRect(586, 700, 10, 260); cx.globalAlpha = 1; cx.fillStyle = pull > 0.85 ? "#ffffff" : b.glow; cx.fillRect(586, 960 - 260 * pull, 10, 260 * pull); }
    // the ball save's light at the foot of the table while it lasts (blinking in its last two seconds)
    if (g.save > 0 && !(g.save < 120 && Math.floor(now / 150) % 2)) { cx.globalAlpha = 0.85; cx.fillStyle = b.glow; cx.font = "bold 20px system-ui, sans-serif"; cx.textAlign = "center"; cx.fillText("🛟 save", 300, 993); cx.globalAlpha = 1; }
    // a trip through a link, while the rules hold the ball (Matthew: "delay the portal transport to be non-instant, and animate it
    // in some interesting way"): a portal's, a spiral in, a comet over on a curve, a burst out; a wire ramp's, the ball rolling
    // along its tube; a lift's, the ball on a platform going up its cage; a hole's, the ball sinking in, a glow down the tunnel
    // under the board, and the ball rolling out onto the inlane
    const p = g.warp > 0 && g.gate >= 0 ? b.portals[g.gate] : null;
    if (p) {
      const hold = p.hold || 40, u = (hold - g.warp) / hold, sx = p.x, sy = p.y, tx = p.tx, ty = p.ty;
      if (!p.kind) {
        const mx = (sx + tx) / 2 + (ty - sy) * 0.35, my = (sy + ty) / 2 - (tx - sx) * 0.35, at = v => [(1 - v) * (1 - v) * sx + 2 * (1 - v) * v * mx + v * v * tx, (1 - v) * (1 - v) * sy + 2 * (1 - v) * v * my + v * v * ty];
        for (const [qx, qy, k] of [[sx, sy, 1 - u], [tx, ty, u]]) { cx.globalAlpha = 0.25 + 0.5 * k; cx.strokeStyle = b.glow; cx.lineWidth = 3; for (let i = 0; i < 3; i++) { cx.beginPath(); cx.arc(qx, qy, (p.r + 6) * (0.4 + ((now / 400 + i / 3) % 1)), 0, 7); cx.stroke(); } }
        if (u < 0.3) { const v = u / 0.3, a = v * 9, rr = (1 - v) * 16; ball(sx + rr * Math.cos(a), sy + rr * Math.sin(a), 12 * (1 - v) + 2); }
        else if (u < 0.85) { const v = (u - 0.3) / 0.55;
          for (let k = 0; k < 14; k++) { const w = Math.max(0, v - k * 0.025), [qx, qy] = at(w); cx.globalAlpha = 0.6 * (1 - k / 14); cx.fillStyle = k % 3 ? b.glow : "#ffffff"; cx.beginPath(); cx.arc(qx + Math.sin(now / 37 + k) * 3, qy + Math.cos(now / 41 + k) * 3, 6 * (1 - k / 14) + 1, 0, 7); cx.fill(); }
          const [qx, qy] = at(v); cx.globalAlpha = 1; ball(qx, qy, 7); }
        else { const v = (u - 0.85) / 0.15; ball(tx, ty, 4 + 8 * v); cx.globalAlpha = 1 - v; cx.strokeStyle = "#ffffff"; cx.lineWidth = 3; cx.beginPath(); cx.arc(tx, ty, 14 + 40 * v, 0, 7); cx.stroke(); }
      } else if (p.kind === 3) {
        if (u < 0.22) { const v = u / 0.22; ball(sx, sy, 13.5 * (1 - v) + 2); }
        else if (u < 0.86) { const [qx, qy] = along(p.path, (u - 0.22) / 0.64) || [tx, ty]; cx.globalAlpha = 0.45; cx.fillStyle = b.glow; cx.beginPath(); cx.arc(qx, qy, 9, 0, TAU); cx.fill(); cx.globalAlpha = 1; }
        else { const v = (u - 0.86) / 0.14; ball(tx, ty, 3 + 9 * v); cx.globalAlpha = 1 - v; cx.strokeStyle = b.glow; cx.lineWidth = 3; cx.beginPath(); cx.arc(tx, ty, 12 + 26 * v, 0, TAU); cx.stroke(); }
      } else {
        const [qx, qy] = along(p.path, u) || [tx, ty], r = p.to === 1 ? 12 + 1.5 * u : 13.5 - 1.5 * u;
        if (p.kind === 2) { cx.globalAlpha = 0.9; cx.fillStyle = "#94a3b8"; cx.fillRect(qx - 14, qy + r - 1, 28, 4); }
        for (let k = 1; k < 6; k++) { const [px2, py2] = along(p.path, Math.max(0, u - k * 0.018)) || [qx, qy]; cx.globalAlpha = 0.25 * (1 - k / 6); cx.fillStyle = "#ffffff"; cx.beginPath(); cx.arc(px2, py2, r * (1 - k / 8), 0, TAU); cx.fill(); }
        cx.globalAlpha = 1; ball(qx, qy, r);
      }
      cx.globalAlpha = 1;
    }
    // points floating up from each hit, and a banner
    S.pops = S.pops.filter(q => now - q.t < 750);
    cx.textAlign = "center"; cx.font = "bold 22px system-ui, sans-serif";
    for (const q of S.pops) { const u = (now - q.t) / 750; cx.globalAlpha = 1 - u; cx.fillStyle = q.col || "#ffffff"; cx.fillText(q.text, q.x, q.y - 40 * u); }
    if (S.banner && now - S.banner.t < 1600) { const u = (now - S.banner.t) / 1600; cx.globalAlpha = Math.min(1, 3 * (1 - u)); cx.fillStyle = "rgba(0,0,0,0.5)"; cx.fillRect(0, 440, 600, 90);
      cx.fillStyle = b.glow; cx.font = "bold 46px system-ui, sans-serif"; cx.fillText(S.banner.text, 300, 502); }
    cx.globalAlpha = 1;
    if (g.over) { cx.fillStyle = "rgba(0,0,0,0.55)"; cx.fillRect(0, 380, 600, 200); cx.fillStyle = "#ffffff"; cx.font = "bold 44px system-ui, sans-serif"; cx.textAlign = "center";
      cx.fillText("Game over", 300, 465); cx.font = "26px system-ui, sans-serif"; cx.fillText("New game to play again", 300, 520); }
  }
  function bar() {
    const g = S.game, best = S.best[S.board] || 0;
    $("score").textContent = g ? g.score.toLocaleString() : "0";
    $("balls").textContent = g ? (g.over ? "game over" : "⚪".repeat(Math.max(0, g.balls)) + " balls") : "";
    $("info").textContent = `${NAMES[S.board]}: best ${best.toLocaleString()} on this device`;
    // (0.0.36; Matthew: "the new game button obscures the running game") full screen's 🎱 New game, over the table only
    // while no game runs, as Go's and Minesweeper's
    if (window.OracleFs) window.OracleFs.empty(!g || !!g.over);
    const waiting = !!g && !g.over && g.x > 545000 && g.y > 900000 && Math.abs(g.vy) < 2000;
    document.querySelector(".pb-pad").classList.toggle("ready", waiting);
    const ms = S.stepMs.length ? [...S.stepMs].sort((a, b) => a - b)[S.stepMs.length >> 1] : 0;
    $("fps").textContent = !S.stepMs.length ? "" : `a frame of Hazel: ${ms < 0.1 ? "under 0.1" : ms < 1 ? ms.toFixed(2) : ms.toFixed(0)} ms`;   // (a compiled step is about 0.03 ms: under the clock's 0.1 ms)
  }

  // ---- the game: a new one on the board chosen, and every frame a step of the rules
  function newGame() {
    const h = H(); if (!h) return;
    S.boardData = h.board(S.board); S.layer = boardLayer(S.boardData); S.deck = deckLayer(S.boardData); S.wires = wireLayer(S.boardData);
    S.game = h.start(S.board); S.flash.clear(); S.pullAt = 0; S.launch = 0;
    S.heat = []; S.wallFlash.clear(); S.rings = []; S.pops = []; S.lit.clear(); S.rowBlink.clear(); S.banner = null; S.robot = {};
    if (W && W.on) W.start(0);
    if (SND) { SND.fanfare(); SND.tune(S.board); }
    bar(); draw();
  }
  let last = 0, half = false;
  // (🤖, robot.js: Matthew, "let's have robot mode for pinball, with near-perfect ball retention") while the switch is on, the
  // robot chooses each step's buttons, looking ahead with the rules when they are compiled; its pace sets the steps a frame:
  // slowly half speed, at a walk the game's own speed, briskly three steps a frame, at full speed as many as fit in 10 ms
  const RB = window.PinballRobot || null;
  function oneStep(h, quiet) {
    const g = S.game;
    if (W && W.on && RB) { const t1 = performance.now(), [l, r, la] = RB.choose(h.step, S.boardData, S.board, g, S.robot, !!(S.built && S.built.compiled));
      W.think(0, performance.now() - t1); S.left = l; S.right = r; if (la) S.launch = la;
      $("flipL").classList.toggle("held", l); $("flipR").classList.toggle("held", r); }
    const t0 = performance.now(), pulled = S.launch;
    const g2 = h.step(S.board, g, S.left, S.right, S.launch);
    S.launch = 0;
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 60) S.stepMs.shift();
    lightUp(g, g2);
    if (SND && !quiet) heard(g, g2, pulled);
    S.game = g2;
    if (g2.over && g2.score > (S.best[S.board] || 0)) { S.best[S.board] = g2.score; keep("best", S.best); }
    if (g2.over && W && W.on) { W.end(`Hazel's game over: ${g2.score.toLocaleString()} points`); if (SND && quiet) heard(g, g2, 0); }
    return g2;
  }
  function frame(t) {
    requestAnimationFrame(frame);
    const h = H(), g = S.game;
    if (!h || !g || g.over || document.hidden) { if (g && g.over) draw(); return; }
    if (P && P.paused()) { draw(); return; }
    const auto = W && W.on, pace = auto ? W.pace : 450;
    try {
      if (pace === 900) { half = !half; if (half) oneStep(h); }
      else if (pace === 450) oneStep(h);
      // (0.0.54) briskly 1x three steps a frame, each briskly more that many times as many (briskly 10x, thirty)
      else if (pace > 0) { const n = Math.round(3 * 120 / pace); for (let k = 0; k < n && !S.game.over; k++) oneStep(h, k < n - 1); }
      else { const t0 = performance.now(); while (!S.game.over && performance.now() - t0 < 10) oneStep(h, true); }
    } catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; drawStatus(); return; }
    if (auto) W.show();
    const g2 = S.game;
    draw();
    if (t - last > 120) { last = t; bar(); }
    if (g2.over) bar();
  }
  requestAnimationFrame(frame);
  // (what a step lit up: each bumper hit flashes white and warms, rings out and floats its points, and the table flashes; a
  // kicking wall lights along its length; a lamp near the ball lights, and a row all lit blinks; a portal trip, a ball saved)
  function lightUp(g, g2) {
    const b = S.boardData, now = performance.now(), x = g2.x / 1000, y = g2.y / 1000;
    for (const h of g2.hits || []) {
      if (h === 2000) { S.banner = { text: "🛟 Ball saved!", t: now }; continue; }
      if (h >= 1000) { const w = b.walls[h - 1000]; if (!w) continue; S.wallFlash.set(h - 1000, now); S.rings.push({ x, y, r: 6, t: now, col: "#ffffff" }); S.pops.push({ x, y: y - 14, text: "+10", t: now }); continue; }
      const q = b.bumpers[h]; if (!q) continue; const [qx, qy] = spot(b, q, g.t || 0);
      S.flash.set(h, now); S.heat[h] = Math.min(1, (S.heat[h] || 0) + 0.34); S.tableFlash = now;
      S.rings.push({ x: qx, y: qy, r: q.r, t: now }); S.pops.push({ x: qx, y: qy - q.r - 6, text: "+" + q.points, t: now, col: b.glow });
    }
    if (g2.warp > 0 && !(g.warp > 0)) { const p = b.portals[g2.gate]; if (p) { S.rings.push({ x: p.x, y: p.y, r: p.r, t: now }); S.pops.push({ x: p.x, y: p.y - p.r - 8, text: "+25", t: now, col: b.glow }); } }
    if (g.warp === 1 && g2.warp === 0) { S.rings.push({ x, y, r: 10, t: now, col: "#ffffff" }); S.tableFlash = now; }
    if (g2.warp > 0) return;
    (b.lights || []).forEach((l, k) => {
      if (S.lit.has(k) || S.rowBlink.has(l.group) || (l.level || 0) !== (g2.lv || 0) || (l.x - x) * (l.x - x) + (l.y - y) * (l.y - y) > 26 * 26) return;
      S.lit.add(k); const row = b.lights.filter(m => m.group === l.group), n = row.filter(m => S.lit.has(b.lights.indexOf(m))).length;
      if (SND && SND.lamp) SND.lamp(n);
      if (n === row.length) { S.rowBlink.set(l.group, now); S.tableFlash = now; S.pops.push({ x: l.x, y: l.y - 18, text: "★ row lit", t: now, col: "#ffffff" }); if (SND && SND.row) SND.row(); }
    });
  }
  // (what a step did, heard: the plunger let go, bumpers and slingshots hit, a portal gone through, a thousand points, a ball
  // lost, the game over; each read from the two games, before and after, and the board)
  function heard(g, g2, pulled) {
    if (pulled && g2.vy < -10000 && g.vy === 0) SND.launch(pulled);
    const hs = g2.hits || [], ws = S.boardData ? S.boardData.walls : [];
    hs.filter(i => i < 1000).slice(0, 2).forEach(i => SND.bump(i));
    const kicked = hs.filter(i => i >= 1000 && i < 2000).map(i => ws[i - 1000]).filter(Boolean);
    if (kicked.some(w => w.kick > 100) && SND.kick) SND.kick(); else if (kicked.length) SND.sling();
    if (g2.warp > 0 && !(g.warp > 0)) SND.portal();
    if (g.warp === 1 && g2.warp === 0 && SND.warpOut) SND.warpOut();
    if (hs.includes(2000) && SND.saved) SND.saved();
    if (Math.floor(g2.score / 1000) > Math.floor(g.score / 1000)) SND.bonus();
    if (g2.over && !g.over) { SND.stop(); SND.over(); }
    else if (g2.balls < g.balls) SND.drain();
  }

  // ---- the controls: keys, the buttons under the table, and the table's own two halves
  const plungeDown = () => { if (!S.pullAt) S.pullAt = performance.now(); $("launch").classList.add("held"); };
  const plungeUp = () => { if (S.pullAt) { S.launch = Math.max(1, Math.min(100, Math.round((performance.now() - S.pullAt) / 12))); S.pullAt = 0; } $("launch").classList.remove("held"); };
  const flip = (side, on) => { if (W && W.on) return; if (on && SND && !(side < 0 ? S.left : S.right)) SND.flip();
    if (side < 0) S.left = on; else S.right = on; $(side < 0 ? "flipL" : "flipR").classList.toggle("held", on); };
  // (0.0.36; Matthew: "for desktop use, please map the paddles to L and R arrow keys") ← and → were mapped, but went to the
  // board menu while it had the focus, as it keeps after a board is chosen: → turned the Starfield into the Volcano. Now the
  // game's keys play whatever has the focus, the menu and the buttons too (the focus let go, so the space bar does not press
  // the button last clicked); only typing, in a field or in Hazel's editor, keeps them
  const GAME_KEYS = ["z", "Z", "/", " ", "ArrowLeft", "ArrowRight", "ArrowDown"];
  addEventListener("keydown", e => {
    if (e.target.closest && e.target.closest("input, textarea, .hazel-listing, [contenteditable]")) return;
    if (!GAME_KEYS.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
    const f = document.activeElement;
    if (f && f !== document.body && f.matches && f.matches("select, button")) f.blur();
    if (["z", "Z", "ArrowLeft"].includes(e.key)) { flip(-1, true); e.preventDefault(); }
    else if (["/", "ArrowRight"].includes(e.key)) { flip(1, true); e.preventDefault(); }
    else if (e.key === "ArrowDown") { plungeDown(); e.preventDefault(); }
  });
  addEventListener("keyup", e => {
    if (["z", "Z", "ArrowLeft"].includes(e.key)) flip(-1, false);
    else if (["/", "ArrowRight"].includes(e.key)) flip(1, false);
    else if (e.key === "ArrowDown") plungeUp();
  });
  const hold = (el, down, up) => { el.addEventListener("pointerdown", e => { e.preventDefault(); el.setPointerCapture(e.pointerId); down(); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) el.addEventListener(ev, up); };
  hold($("flipL"), () => flip(-1, true), () => flip(-1, false));
  hold($("flipR"), () => flip(1, true), () => flip(1, false));
  hold($("launch"), plungeDown, plungeUp);
  // (Matthew: "we should be able to adjust the launch power, perhaps we need more than \"launch\" as a button") a launch at a
  // set strength, softest to full, by a button or by 1, 2, 3; holding 🚀 (or the space bar) still pulls the plunger by time
  const POWERS = { soft: 6, mid: 50, full: 100 };
  const launchAt = k => { if (S.game && !S.game.over && !(W && W.on)) { S.launch = k; S.pullAt = 0; } };
  document.querySelectorAll(".pb-power button").forEach(btn => btn.addEventListener("pointerdown", e => { e.preventDefault(); launchAt(POWERS[btn.dataset.power]); }));
  addEventListener("keydown", e => { if (e.target.closest && e.target.closest("input, textarea, .hazel-listing, [contenteditable]")) return;
    const k = { "1": "soft", "2": "mid", "3": "full" }[e.key]; if (k && !e.ctrlKey && !e.metaKey && !e.altKey) { launchAt(POWERS[k]); e.preventDefault(); } });
  // (the table: its left half the left flipper, its right half the right one; the launch lane, the plunger)
  const sides = new Map();
  cv.addEventListener("pointerdown", e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    const what = u > 0.9 && v > 0.8 ? 0 : u < 0.5 ? -1 : 1; sides.set(e.pointerId, what); if (what === 0) plungeDown(); else flip(what, true); });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, e => { const what = sides.get(e.pointerId); sides.delete(e.pointerId); if (what === 0) plungeUp(); else if (what) flip(what, false); });
  $("new").addEventListener("click", newGame);
  // (the music and the sounds: each a switch, remembered; any tap or key wakes the chip, which browsers ask for before a sound)
  if (SND) {
    const sw = (id, get, set) => { const b = $(id); b.setAttribute("aria-pressed", String(get()));
      b.addEventListener("click", () => { set(!get()); b.setAttribute("aria-pressed", String(get())); if (get()) SND.gesture(S.game && !S.game.over ? S.board : null); }); };
    sw("music", () => SND.musicOn, on => { SND.music(on); if (on && S.game && !S.game.over) SND.tune(S.board); });
    sw("sfx", () => SND.soundsOn, on => SND.sounds(on));
    // (0.0.56) a volume slider beside each switch (shared/volume.js): how loud the music, and the sounds, each kept on this device
    if (window.HazelVolume) {
      window.HazelVolume.slider($("music"), { label: "Music volume", get: () => SND.volumeOf("music"), set: v => SND.setVolume("music", v), isOn: () => SND.musicOn });
      window.HazelVolume.slider($("sfx"), { label: "Sounds volume", get: () => SND.volumeOf("sfx"), set: v => SND.setVolume("sfx", v), isOn: () => SND.soundsOn, hear: () => SND.bump(0) });
    }
    for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => SND.gesture(S.game && !S.game.over ? S.board : null), true);
  } else for (const id of ["music", "sfx"]) $(id).hidden = true;
  $("boardpick").addEventListener("change", () => { S.board = +$("boardpick").value; keep("board", S.board); newGame(); });
  if (window.OracleFs) window.OracleFs.offer({ label: "🎱 New game", title: "A new game, on the board chosen", cast: newGame });
  const W = window.HazelAutoplay ? window.HazelAutoplay.make({
    into: $("new").parentElement, key: KEY, sides: ["Hazel"], label: "🤖 Hazel plays for you",
    more: () => S.game ? `; ${S.game.score.toLocaleString()} points, ${S.game.balls} ball${S.game.balls === 1 ? "" : "s"} left` : "",
    onChange: on => {
      S.robot = {}; S.left = S.right = false; $("flipL").classList.remove("held"); $("flipR").classList.remove("held");
      if (!on) { W.stop(); return; }
      if (!H()) return;
      if (!S.game || S.game.over) newGame();
      W.start(0);
    },
  }) : null;
  // (0.0.53) ⏸ the pause (shared/pause.js): its button and the space bar; no step runs while paused
  const P = window.HazelPause ? window.HazelPause.make({ into: $("new").parentElement, over: $("board").parentElement,
    onChange: paused => { if (!SND) return; if (paused) SND.stop(); else if (S.game && !S.game.over) SND.tune(S.board); } }) : null;   // (the music stops while paused)

  // ---- the rules: compiled ahead of time when compiled.js is here, else (and once they are edited) built by hazeljs
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (b && b.compiled) { st.className = "status ok"; st.textContent = `✓ Compiled ahead of time: the rules run as JavaScript (hazel-jit, ${b.made || "a prototype"}), every frame, without loading Hazel's library.`; return; }
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load from jsDelivr: check the connection, then reload." : "⏳ Loading Hazel (hazeljs from jsDelivr), whose rules run the table."; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { st.className = "status ok"; st.textContent = `✓ Hazel's rules are ready, built by hazeljs in ${(b.ms / 1000).toFixed(1)} s, and interpreted every frame: slower than compiled, so the ball moves in slow motion.`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so the table cannot move: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build") + ". Put them back with the button under the listings.";
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
    c.src = "compiled.js?v=0.0.40"; c.async = true;
    c.onload = () => { const v = window.PinballCompiled;
      if (v && !S.built) { S.built = { key: "compiled", ok: true, compiled: true, made: v.made, value: v, errors: [], threw: "", ms: 0, at: performance.now() }; drawStatus(); newGame(); }
      else if (!v) { S.compiledError = "it ran, but gave no Pinball"; loadLib(); } };
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
  document.body.classList.add("js");
  draw(); bar();
})();
