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
    leaves(c, r, ink, glow) {   // leaves and little flowers on the forest floor
      for (let k = 0; k < 80; k++) { const x = r() * 600, y = r() * 1000, s = 9 + 14 * r(), t = r() * Math.PI * 2;
        c.save(); c.translate(x, y); c.rotate(t); c.globalAlpha = 0.07 + 0.05 * r(); c.fillStyle = ink; c.beginPath(); c.ellipse(0, 0, s, s * 0.42, 0, 0, 7); c.fill();
        c.globalAlpha = 0.1; c.strokeStyle = glow; c.lineWidth = 1; c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.stroke(); c.restore(); }
      c.fillStyle = glow;
      for (let k = 0; k < 22; k++) { const x = r() * 600, y = r() * 1000; c.globalAlpha = 0.1; for (let p = 0; p < 5; p++) { const a = p * 2 * Math.PI / 5; c.beginPath(); c.arc(x + 5 * Math.cos(a), y + 5 * Math.sin(a), 3.4, 0, 7); c.fill(); } }
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
  function boardLayer(b) {
    const L = document.createElement("canvas"); L.width = 600; L.height = 1000;
    const c = L.getContext("2d");
    c.fillStyle = b.bg; c.fillRect(0, 0, 600, 1000);
    if (PATTERNS[b.pattern]) { c.save(); PATTERNS[b.pattern](c, seeded(7 + 31 * S.board), b.ink, b.glow); c.restore(); c.globalAlpha = 1; c.lineWidth = 1; }
    c.fillStyle = b.ink; trackLayer(c, b); c.globalAlpha = 1; c.lineWidth = 1;
    c.strokeStyle = b.ink; c.lineWidth = 5; c.lineCap = "round";
    for (const w of b.walls) { c.beginPath(); c.moveTo(w.ax, w.ay); c.lineTo(w.bx, w.by); c.lineWidth = w.kick > 0 ? 8 : 5; c.strokeStyle = w.kick > 0 ? b.glow : b.ink; c.stroke(); }
    for (const p of b.portals) {
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(p.x, p.y, p.r - i * 6, 0, 2 * Math.PI); c.strokeStyle = i % 2 ? b.ink : b.glow; c.lineWidth = 3; c.stroke(); }
      c.beginPath(); c.arc(p.tx, p.ty, 8, 0, 2 * Math.PI); c.strokeStyle = b.glow; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]);
    }
    for (const q of b.bumpers) { if (q.track >= 0) continue; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 2 * Math.PI); c.fillStyle = b.ink; c.globalAlpha = 0.25; c.fill(); c.globalAlpha = 1; c.lineWidth = 4; c.strokeStyle = b.ink; c.stroke(); }
    // (its name in the corner under the left slope, out of play: the foot of the table is the save light's, and some boards' post)
    c.fillStyle = b.ink; c.font = "bold 20px system-ui, sans-serif"; c.textAlign = "left"; c.globalAlpha = 0.5; c.fillText(b.name, 26, 985); c.globalAlpha = 1;
    return L;
  }
  function draw() {
    const b = S.boardData, g = S.game;
    if (!b) { cx.fillStyle = "#0b1030"; cx.fillRect(0, 0, 600, 1000); return; }
    cx.drawImage(S.layer, 0, 0);
    const now = performance.now();
    // (Matthew: "let's have the backgrounds animate/flash, etc, to make the game more excting") a slow glow wandering over the
    // pattern; the whole table flashing at a hit, and a ring spreading from it
    const gx = 300 + 210 * Math.sin(now / 2900), gy = 500 + 330 * Math.cos(now / 4100), amb = cx.createRadialGradient(gx, gy, 10, gx, gy, 420);
    amb.addColorStop(0, b.glow); amb.addColorStop(1, "rgba(0,0,0,0)"); cx.globalAlpha = 0.07; cx.fillStyle = amb; cx.fillRect(0, 0, 600, 1000);
    const tf = now - S.tableFlash; if (tf < 260) { cx.globalAlpha = 0.16 * (1 - tf / 260); cx.fillStyle = b.glow; cx.fillRect(0, 0, 600, 1000); }
    S.rings = S.rings.filter(q => now - q.t < 420);
    for (const q of S.rings) { const u = (now - q.t) / 420; cx.globalAlpha = 0.55 * (1 - u); cx.strokeStyle = q.col || b.glow; cx.lineWidth = 4 * (1 - u) + 1; cx.beginPath(); cx.arc(q.x, q.y, q.r + 150 * u, 0, 7); cx.stroke(); }
    cx.globalAlpha = 1;
    // (Matthew: "\"light arrays\" along the paths that are most likey for the ball to travel, with flashes/color changes and
    // sounds") the lamps: dark rings with a slow chase running through them, lit as the ball passes, a row all lit blinking
    (b.lights || []).forEach((l, k) => {
      const blink = S.rowBlink.get(l.group), on = S.lit.has(k) || (blink && now - blink < 900 && Math.floor((now - blink) / 110) % 2 === 0);
      if (on) { cx.globalAlpha = 0.3; cx.fillStyle = b.glow; cx.beginPath(); cx.arc(l.x, l.y, 13, 0, 7); cx.fill(); cx.globalAlpha = 1; cx.beginPath(); cx.arc(l.x, l.y, 6.5, 0, 7); cx.fill();
        cx.fillStyle = "#ffffff"; cx.globalAlpha = 0.8; cx.beginPath(); cx.arc(l.x - 1.5, l.y - 1.5, 2.2, 0, 7); cx.fill(); }
      else { const chase = 0.5 + 0.5 * Math.sin(now / 180 - k * 0.9); cx.globalAlpha = 0.25 + 0.25 * chase; cx.strokeStyle = b.glow; cx.lineWidth = 2; cx.beginPath(); cx.arc(l.x, l.y, 6.5, 0, 7); cx.stroke();
        cx.globalAlpha = 0.08 + 0.12 * chase; cx.fillStyle = b.glow; cx.fill(); }
    });
    for (const [grp, t] of S.rowBlink) if (now - t >= 900) { S.rowBlink.delete(grp); (b.lights || []).forEach((l, k) => { if (l.group === grp) S.lit.delete(k); }); }
    cx.globalAlpha = 1;
    // (Matthew: "more flashes/changes when we hit bumbers in the board", "bumpers or other things that collide with the ball")
    // the machine behind the board: a gear turning at each oval track's middle, an arm out to each bumper riding it, a cable
    // up from each lift; then the riding bumpers themselves
    const T = g ? g.t || 0 : 0;
    (b.tracks || []).forEach((tr, k) => {
      const riders = b.bumpers.filter(q => q.track === k);
      if (tr.rx > 0 && tr.ry > 0) {
        const th = TAU / tr.period * T; cx.save(); cx.translate(tr.cx, tr.cy); cx.rotate(th); cx.globalAlpha = 0.35; cx.strokeStyle = b.ink; cx.lineWidth = 2;
        cx.beginPath(); for (let i = 0; i < 24; i++) { const a0 = i * TAU / 24, r0 = i % 2 ? 30 : 36; cx.lineTo(r0 * Math.cos(a0), r0 * Math.sin(a0)); cx.lineTo(r0 * Math.cos(a0 + TAU / 24), r0 * Math.sin(a0 + TAU / 24)); } cx.closePath(); cx.stroke();
        cx.beginPath(); cx.arc(0, 0, 9, 0, TAU); cx.stroke(); cx.restore();
        for (const q of riders) { const [x, y] = spot(b, q, T); cx.globalAlpha = 0.3; cx.strokeStyle = b.ink; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(tr.cx, tr.cy); cx.lineTo(x, y); cx.stroke(); }
      } else for (const q of riders) {
        const [x, y] = spot(b, q, T), top = [tr.cx - tr.rx - (tr.rx ? 0 : 0), tr.cy - tr.ry - 22];
        cx.globalAlpha = 0.4; cx.strokeStyle = b.ink; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(top[0], top[1]); cx.lineTo(x, y - q.r); cx.stroke();
      }
    });
    cx.globalAlpha = 1;
    b.bumpers.forEach(q => { if (!(q.track >= 0)) return; const [x, y] = spot(b, q, T);
      cx.fillStyle = b.bg; cx.beginPath(); cx.arc(x, y, q.r, 0, TAU); cx.fill(); cx.globalAlpha = 0.25; cx.fillStyle = b.ink; cx.fill(); cx.globalAlpha = 1; cx.lineWidth = 4; cx.strokeStyle = b.ink; cx.stroke();
      cx.globalAlpha = 0.6; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x, y, q.r * 0.5, 0, TAU); cx.stroke(); cx.globalAlpha = 1; });
    // each bumper warms with its hits, from the board's ink toward its glow, and cools; a hit flashes it white
    b.bumpers.forEach((q, i) => {
      const h = S.heat[i] || 0, t = S.flash.get(i), [qx, qy] = spot(b, q, T);
      if (h > 0.02) { cx.globalAlpha = 0.25 + 0.6 * h; cx.fillStyle = b.glow; cx.beginPath(); cx.arc(qx, qy, q.r - 3, 0, 7); cx.fill(); S.heat[i] = h * 0.985; }
      if (t && now - t < 180) { const u = (now - t) / 180; cx.globalAlpha = 1 - u; cx.fillStyle = "#ffffff"; cx.beginPath(); cx.arc(qx, qy, q.r + 6 * (1 - u), 0, 7); cx.fill(); }
    });
    // the walls that kicked, lit along their length
    for (const [j, t] of S.wallFlash) { const u = (now - t) / 240; if (u >= 1) { S.wallFlash.delete(j); continue; } const w = b.walls[j]; if (!w) continue;
      cx.globalAlpha = 1 - u; cx.strokeStyle = "#ffffff"; cx.lineWidth = 12 - 6 * u; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(w.ax, w.ay); cx.lineTo(w.bx, w.by); cx.stroke(); }
    cx.globalAlpha = 1;
    if (!g) return;
    // the flippers, at the angles the rules turned them to
    b.flippers.forEach((f, i) => { const a = (g.flips[i] ?? 500) / 1000, tx = f.x + f.side * f.len * Math.cos(a), ty = f.y + f.len * Math.sin(a);
      cx.beginPath(); cx.moveTo(f.x, f.y); cx.lineTo(tx, ty); cx.strokeStyle = b.glow; cx.lineWidth = 16; cx.lineCap = "round"; cx.stroke();
      cx.beginPath(); cx.arc(f.x, f.y, 6, 0, 2 * Math.PI); cx.fillStyle = b.bg; cx.fill(); });
    // the plunger, pulled down as the launch is held
    const pull = S.pullAt ? Math.min(1, (now - S.pullAt) / 1200) : 0;
    cx.fillStyle = b.ink; cx.fillRect(551, 968 + pull * 22, 24, 10);
    // (Matthew: "we should be able to adjust the launch power") the pull's power, as a bar beside the lane while it is held
    if (pull > 0) { cx.globalAlpha = 0.35; cx.fillStyle = b.ink; cx.fillRect(586, 700, 10, 260); cx.globalAlpha = 1; cx.fillStyle = pull > 0.85 ? "#ffffff" : b.glow; cx.fillRect(586, 960 - 260 * pull, 10, 260 * pull); }
    // the ball save's light at the foot of the table while it lasts (blinking in its last two seconds)
    if (g.save > 0 && !(g.save < 120 && Math.floor(now / 150) % 2)) { cx.globalAlpha = 0.85; cx.fillStyle = b.glow; cx.font = "bold 20px system-ui, sans-serif"; cx.textAlign = "center"; cx.fillText("🛟 save", 300, 993); cx.globalAlpha = 1; }
    // (Matthew: "for the portals on the portals board, let's delay the portal transport to be non-instant, and animate it in some
    // interesting way") while the rules hold the ball in a portal (40 steps), it spirals into the hole, flies over as a comet on
    // a curve, its trail sparkling, and bursts out at the far end; else the ball
    const x = g.x / 1000, y = g.y / 1000;
    const ball = (bx, by, r) => { const grad = cx.createRadialGradient(bx - r / 3, by - r / 3, 1, bx, by, r); grad.addColorStop(0, "#ffffff"); grad.addColorStop(1, "#9ca3af");
      cx.beginPath(); cx.arc(bx, by, r, 0, 2 * Math.PI); cx.fillStyle = grad; cx.fill(); };
    const p = g.warp > 0 && g.gate >= 0 ? b.portals[g.gate] : null;
    if (p) {
      const u = (40 - g.warp) / 40, sx = p.x, sy = p.y, tx = p.tx, ty = p.ty, mx = (sx + tx) / 2 + (ty - sy) * 0.35, my = (sy + ty) / 2 - (tx - sx) * 0.35;
      const at = v => [(1 - v) * (1 - v) * sx + 2 * (1 - v) * v * mx + v * v * tx, (1 - v) * (1 - v) * sy + 2 * (1 - v) * v * my + v * v * ty];
      for (const [qx, qy, k] of [[sx, sy, 1 - u], [tx, ty, u]]) { cx.globalAlpha = 0.25 + 0.5 * k; cx.strokeStyle = b.glow; cx.lineWidth = 3; for (let i = 0; i < 3; i++) { cx.beginPath(); cx.arc(qx, qy, (p.r + 6) * (0.4 + ((now / 400 + i / 3) % 1)), 0, 7); cx.stroke(); } }
      if (u < 0.3) { const v = u / 0.3, a = v * 9, rr = (1 - v) * 16; ball(sx + rr * Math.cos(a), sy + rr * Math.sin(a), 12 * (1 - v) + 2); }
      else if (u < 0.85) { const v = (u - 0.3) / 0.55;
        for (let k = 0; k < 14; k++) { const w = Math.max(0, v - k * 0.025), [qx, qy] = at(w); cx.globalAlpha = 0.6 * (1 - k / 14); cx.fillStyle = k % 3 ? b.glow : "#ffffff"; cx.beginPath(); cx.arc(qx + Math.sin(now / 37 + k) * 3, qy + Math.cos(now / 41 + k) * 3, 6 * (1 - k / 14) + 1, 0, 7); cx.fill(); }
        const [qx, qy] = at(v); cx.globalAlpha = 1; ball(qx, qy, 7); }
      else { const v = (u - 0.85) / 0.15; ball(tx, ty, 4 + 8 * v); cx.globalAlpha = 1 - v; cx.strokeStyle = "#ffffff"; cx.lineWidth = 3; cx.beginPath(); cx.arc(tx, ty, 14 + 40 * v, 0, 7); cx.stroke(); }
      cx.globalAlpha = 1;
    } else ball(x, y, 12);
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
    S.boardData = h.board(S.board); S.layer = boardLayer(S.boardData);
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
    const auto = W && W.on, pace = auto ? W.pace : 450;
    try {
      if (pace === 900) { half = !half; if (half) oneStep(h); }
      else if (pace === 450) oneStep(h);
      else if (pace === 120) for (let k = 0; k < 3 && !S.game.over; k++) oneStep(h, k < 2);
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
      if (S.lit.has(k) || S.rowBlink.has(l.group) || (l.x - x) * (l.x - x) + (l.y - y) * (l.y - y) > 26 * 26) return;
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
    else if ([" ", "ArrowDown"].includes(e.key)) { plungeDown(); e.preventDefault(); }
  });
  addEventListener("keyup", e => {
    if (["z", "Z", "ArrowLeft"].includes(e.key)) flip(-1, false);
    else if (["/", "ArrowRight"].includes(e.key)) flip(1, false);
    else if ([" ", "ArrowDown"].includes(e.key)) plungeUp();
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
    c.src = "compiled.js?v=0.0.38"; c.async = true;
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
