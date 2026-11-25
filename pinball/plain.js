// hazeljs-examples, Pinball in plain JavaScript (^report(65), 2026-11-25; Matthew: "Why don't we have plain JS data for the
// later part of the table? Can we get it?"), for timing only: the page never loads it. The same game as
// pinball/rules/Pinball.hz (ten boards; a step of 1/60 s: the flippers turned, then in four small steps gravity, the walls, the
// bumpers on their tracks, the flippers sweeping, the links; then the drain, the ball save and the plunger), written as a
// JavaScript programmer would: loops over the pieces, the ball an object. The boards are the rules' own lines, as they are
// (calls of the helpers below, lists and strings: JavaScript as written), and the Floats are in the rules' order of
// operations, so every answer is the same to the bit. Same functions and values as compiled.js, so node/package-bench.mjs
// times it beside the others and compares every way's answers.
(() => {
  "use strict";
  const q = (a, b) => Math.trunc(a / b);
  // ---- building boards
  const w = (ax, ay, bx, by) => ({ ax, ay, bx, by, bounce: 50, kick: 0, level: 0 });
  const sling = (ax, ay, bx, by) => ({ ax, ay, bx, by, bounce: 60, kick: 55, level: 0 });
  const kicker = (ax, ay, bx, by, k) => ({ ax, ay, bx, by, bounce: 60, kick: k, level: 0 });
  const bp = (x, y, r, p) => ({ x, y, r, points: p, track: -1, phase: 0, level: 0 });
  const mover = (k, phase, r, p) => ({ x: 0, y: 0, r, points: p, track: k, phase, level: 0 });
  const loop = (cx, cy, rx, ry, period) => ({ cx, cy, rx, ry, period });
  const fl = (x, y, len, side) => ({ x, y, len, side, level: 0 });
  const gate = (x, y, r, tx, ty) => ({ x, y, r, tx, ty, from: 0, to: 0, kind: 0, need: 0, hold: 40, ex: 0, ey: 0, path: [] });
  const dw = (ax, ay, bx, by) => ({ ax, ay, bx, by, bounce: 50, kick: 0, level: 1 });
  const dbp = (x, y, r, p) => ({ x, y, r, points: p, track: -1, phase: 0, level: 1 });
  const dfl = (x, y, len, side) => ({ x, y, len, side, level: 1 });
  const link = (kind, from, to, x, y, r, tx, ty, need, hold, ex, ey, path) => ({ x, y, r, tx, ty, from, to, kind, need, hold, ex, ey, path });
  const cat_w = xss => xss.flat(), cat_l = xss => xss.flat();
  // an arc of n walls round (cx, cy), radius r, from angle a0 to a1 (thousandths of a radian)
  function arc(cx, cy, r, a0, a1, n) {
    const px = i => cx + Math.trunc(r * Math.cos((a0 + q((a1 - a0) * i, n)) / 1000)), py = i => cy + Math.trunc(r * Math.sin((a0 + q((a1 - a0) * i, n)) / 1000));
    const out = []; for (let i = 0; i < n; i++) out.push(w(px(i), py(i), px(i + 1), py(i + 1))); return out;
  }
  function lampsOn(x0, y0, x1, y1, n, g, lv) {
    const out = []; for (let i = 0; i < n; i++) out.push({ x: x0 + q((x1 - x0) * i, n - 1), y: y0 + q((y1 - y0) * i, n - 1), group: g, level: lv }); return out;
  }
  const lamps = (x0, y0, x1, y1, n, g) => lampsOn(x0, y0, x1, y1, n, g, 0), dlamps = (x0, y0, x1, y1, n, g) => lampsOn(x0, y0, x1, y1, n, g, 1);
  const shell = [w(580, 300, 580, 1000), w(545, 330, 545, 1000), w(545, 965, 580, 965), ...arc(300, 300, 280, 3142, 6283, 16)];
  const bd = (name, bg, ink, glow, pattern, walls, bumpers, tracks, flippers, portals, lights, glass, gravity) =>
    ({ name, bg, ink, glow, pattern, walls: [...shell, ...walls], bumpers, tracks, flippers, portals, lights, glass, sx: 562, sy: 940, svx: 0, svy: -300, gravity });
  // ---- the ten boards: the rules' own lines (pinball/rules/Pinball.hz)
  const boards = [
  bd("🌌 Starfield", "#0b1030", "#7dd3fc", "#f0abfc", "stars",
     cat_w([[w(20, 300, 20, 820), w(20, 820, 190, 897), w(545, 820, 410, 897), sling(90, 680, 160, 795), w(90, 680, 90, 770), w(90, 770, 160, 795), sling(510, 680, 440, 795), w(510, 680, 510, 770), w(510, 770, 440, 795), w(240, 80, 240, 135), w(300, 70, 300, 125), w(360, 80, 360, 135)], arc(300, 300, 226, 3142, 3950, 6), [w(74, 300, 74, 430), dw(110, 116, 146, 80), dw(146, 80, 454, 80), dw(454, 80, 490, 116), dw(110, 116, 110, 290), dw(490, 116, 490, 290), dw(110, 290, 240, 342), dw(490, 290, 360, 342), dw(226, 384, 300, 408), dw(374, 384, 300, 408)]]),
     [bp(300, 330, 28, 100), mover(0, 0, 16, 150), mover(0, 500, 16, 150), bp(300, 200, 10, 250), dbp(220, 170, 16, 150), dbp(380, 170, 16, 150), dbp(300, 235, 14, 200)],
     [loop(300, 330, 140, 70, 420)],
     [fl(190, 905, 100, 1), fl(410, 905, 100, 0 - 1), dfl(240, 350, 42, 1), dfl(360, 350, 42, 0 - 1)],
     [link(3, 1, 0, 300, 390, 26, 527, 760, 0, 40, 0 - 10, 20, [300, 390, 530, 470, 527, 760]), link(1, 0, 1, 100, 560, 22, 160, 120, 60, 46, 50, 10, [100, 560, 80, 470, 78, 360, 92, 250, 120, 170, 160, 120]), link(1, 0, 1, 500, 560, 22, 440, 120, 60, 46, 0 - 50, 10, [500, 560, 522, 470, 524, 360, 510, 250, 480, 170, 440, 120]), link(1, 1, 0, 300, 92, 14, 55, 760, 0, 54, 10, 20, [300, 92, 250, 62, 150, 72, 72, 140, 42, 260, 36, 420, 38, 600, 46, 700, 55, 760])],
     cat_l([lamps(47, 430, 47, 310, 4, 0), lamps(210, 115, 390, 115, 4, 1), lamps(45, 812, 165, 872, 4, 2), lamps(520, 812, 435, 855, 4, 3), dlamps(160, 128, 440, 128, 6, 10), dlamps(250, 300, 350, 300, 3, 11)]),
     [98, 110, 140, 68, 460, 68, 502, 110, 502, 296, 394, 416, 206, 416, 98, 296], 260),
  bd("🌋 Volcano", "#2a0a05", "#fb923c", "#fde047", "basalt",
     [w(20, 300, 20, 820), w(20, 820, 190, 897), w(545, 820, 410, 897), sling(90, 680, 160, 795), w(90, 680, 90, 770), w(90, 770, 160, 795), sling(510, 680, 440, 795), w(510, 680, 510, 770), w(510, 770, 440, 795), w(80, 410, 215, 462), w(500, 410, 385, 462)],
     [bp(300, 990, 8, 5), bp(300, 250, 26, 50), mover(0, 0, 18, 50), mover(0, 500, 18, 50), bp(235, 345, 18, 50), bp(365, 345, 18, 50), bp(300, 640, 22, 30)],
     [loop(300, 250, 95, 55, 400)],
     [fl(190, 905, 100, 1), fl(410, 905, 100, 0 - 1), fl(215, 470, 68, 1), fl(385, 470, 68, 0 - 1)],
     [],
     cat_l([lamps(95, 392, 200, 442, 4, 0), lamps(505, 392, 400, 442, 4, 1), lamps(50, 600, 50, 450, 4, 2), lamps(522, 600, 522, 450, 4, 3)]),
     [], 280),
  bd("🌊 Ocean", "#03243a", "#5eead4", "#93c5fd", "waves",
     cat_w([[w(20, 300, 20, 820), w(20, 820, 190, 897), w(545, 820, 410, 897)], arc(200, 470, 120, 3500, 4600, 6), arc(400, 470, 120, 4825, 5900, 6), [dw(110, 116, 146, 80), dw(146, 80, 454, 80), dw(454, 80, 490, 116), dw(110, 116, 110, 280), dw(490, 116, 490, 280), dw(110, 280, 240, 332), dw(490, 280, 360, 332), dw(226, 374, 300, 398), dw(374, 374, 300, 398)]]),
     [bp(85, 805, 14, 20), bp(480, 805, 14, 20), bp(200, 135, 9, 20), bp(260, 112, 9, 20), bp(340, 112, 9, 20), bp(400, 135, 9, 20), bp(300, 260, 18, 40), bp(240, 340, 18, 40), bp(360, 340, 18, 40), bp(300, 420, 18, 40), mover(0, 0, 14, 40), mover(0, 333, 14, 40), mover(0, 667, 14, 40), dbp(210, 180, 14, 60), dbp(390, 180, 14, 60), dbp(300, 140, 12, 80)],
     [loop(300, 570, 150, 45, 480)],
     [fl(190, 905, 100, 1), fl(410, 905, 100, 0 - 1), fl(20, 610, 60, 1), fl(545, 610, 60, 0 - 1), dfl(240, 340, 42, 1), dfl(360, 340, 42, 0 - 1)],
     [link(3, 1, 0, 300, 380, 26, 140, 845, 0, 40, 20, 10, [300, 380, 70, 460, 140, 845]), link(1, 0, 1, 100, 560, 22, 160, 120, 60, 46, 50, 10, [100, 560, 80, 470, 78, 360, 92, 250, 120, 170, 160, 120]), link(2, 0, 1, 505, 520, 16, 440, 130, 0, 60, 0 - 40, 0, [505, 520, 505, 130, 440, 130]), link(1, 1, 0, 300, 92, 14, 450, 850, 0, 54, 0 - 20, 10, [300, 92, 360, 62, 450, 72, 520, 150, 538, 300, 538, 500, 530, 700, 470, 800, 450, 850])],
     cat_l([lamps(70, 440, 120, 370, 3, 0), lamps(530, 440, 480, 370, 3, 1), lamps(230, 160, 370, 160, 3, 2), lamps(40, 760, 40, 660, 3, 3), lamps(525, 760, 525, 660, 3, 4), dlamps(170, 120, 430, 120, 5, 10), dlamps(250, 290, 350, 290, 3, 11)]),
     [98, 110, 140, 68, 460, 68, 502, 110, 502, 286, 394, 406, 206, 406, 98, 286], 250),
  bd("🍄 Mushroom forest", "#14261a", "#86efac", "#fca5a5", "leaves",
     [w(20, 300, 20, 820), w(20, 820, 190, 897), w(545, 820, 410, 897), sling(90, 680, 160, 795), w(90, 680, 90, 770), w(90, 770, 160, 795), sling(510, 680, 440, 795), w(510, 680, 510, 770), w(510, 770, 440, 795), w(140, 400, 140, 500), w(20, 537, 55, 552), w(425, 400, 425, 500), w(545, 537, 510, 552), dw(110, 116, 146, 80), dw(146, 80, 454, 80), dw(454, 80, 490, 116), dw(110, 116, 110, 280), dw(490, 116, 490, 280), dw(110, 280, 240, 332), dw(490, 280, 360, 332), dw(226, 374, 300, 398), dw(374, 374, 300, 398)],
     [bp(220, 230, 16, 30), bp(300, 190, 16, 30), bp(380, 230, 16, 30), bp(255, 315, 16, 30), bp(345, 315, 16, 30), bp(300, 410, 16, 30), bp(300, 600, 14, 30), dbp(220, 175, 15, 50), dbp(380, 175, 15, 50), dbp(300, 240, 13, 80)],
     [],
     [fl(190, 905, 100, 1), fl(410, 905, 100, 0 - 1), fl(55, 560, 64, 1), fl(510, 560, 64, 0 - 1), dfl(240, 340, 42, 1), dfl(360, 340, 42, 0 - 1)],
     [link(3, 1, 0, 300, 380, 26, 55, 760, 0, 40, 10, 20, [300, 380, 70, 460, 55, 760]), link(2, 0, 1, 390, 480, 16, 300, 120, 0, 60, 0, 10, [390, 480, 390, 300, 340, 150, 300, 120]), link(1, 0, 1, 215, 640, 22, 160, 120, 60, 46, 50, 10, [215, 640, 170, 560, 150, 450, 140, 300, 150, 180, 160, 120]), link(1, 1, 0, 300, 92, 14, 527, 760, 0, 54, 0 - 10, 20, [300, 92, 360, 62, 450, 72, 520, 150, 538, 300, 538, 500, 533, 680, 527, 760])],
     cat_l([lamps(80, 420, 80, 520, 3, 0), lamps(485, 420, 485, 520, 3, 1), lamps(200, 140, 400, 140, 5, 2), lamps(45, 812, 165, 872, 4, 3), dlamps(170, 125, 430, 125, 5, 10), dlamps(250, 290, 350, 290, 3, 11)]),
     [98, 110, 140, 68, 460, 68, 502, 110, 502, 286, 394, 406, 206, 406, 98, 286], 260),
  bd("🏰 Castle, two floors", "#1e1033", "#c4b5fd", "#fcd34d", "bricks",
     [w(20, 300, 20, 905), w(70, 690, 70, 905), w(70, 850, 190, 897), kicker(20, 905, 70, 905, 300), sling(100, 690, 165, 800), w(100, 690, 100, 775), w(100, 775, 165, 800), w(505, 690, 505, 905), w(505, 850, 410, 897), kicker(505, 905, 545, 905, 300), sling(475, 690, 415, 800), w(475, 690, 475, 775), w(475, 775, 415, 800), w(26, 250, 215, 312), w(500, 250, 385, 312)],
     [bp(160, 150, 22, 200), bp(300, 105, 22, 200), bp(440, 150, 22, 200), bp(300, 480, 30, 50), bp(175, 570, 16, 40), bp(425, 570, 16, 40), mover(0, 0, 15, 60), mover(1, 250, 15, 60)],
     [loop(300, 650, 110, 0, 400), loop(300, 400, 150, 0, 520)],
     [fl(190, 905, 100, 1), fl(410, 905, 100, 0 - 1), fl(215, 320, 68, 1), fl(385, 320, 68, 0 - 1)],
     [gate(70, 640, 22, 300, 190)],
     cat_l([lamps(60, 262, 200, 305, 4, 0), lamps(495, 262, 400, 305, 4, 1), lamps(45, 700, 45, 880, 4, 2), lamps(525, 700, 525, 880, 4, 3)]),
     [], 260),
  bd("🐱 Cat face", "#2b1030", "#f9a8d4", "#5eead4", "paws",
     [w(20, 300, 20, 820), w(20, 820, 190, 897), w(545, 820, 410, 897), sling(90, 680, 160, 795), w(90, 680, 90, 770), w(90, 770, 160, 795), sling(510, 680, 440, 795), w(510, 680, 510, 770), w(510, 770, 440, 795), w(170, 200, 210, 120), w(210, 120, 250, 200), w(350, 200, 390, 120), w(390, 120, 430, 200), sling(140, 430, 230, 415), sling(460, 430, 370, 415), dw(110, 126, 146, 90), dw(146, 90, 454, 90), dw(454, 90, 490, 126), dw(110, 126, 110, 270), dw(490, 126, 490, 270), dw(110, 270, 240, 322), dw(490, 270, 360, 322), dw(226, 364, 300, 388), dw(374, 364, 300, 388)],
     [bp(240, 300, 26, 150), bp(360, 300, 26, 150), bp(300, 385, 16, 300), bp(300, 160, 12, 100), dbp(220, 170, 15, 120), dbp(380, 170, 15, 120), dbp(300, 150, 12, 200)],
     [],
     [fl(190, 905, 100, 1), fl(410, 905, 100, 0 - 1), dfl(240, 330, 42, 1), dfl(360, 330, 42, 0 - 1)],
     [link(3, 1, 0, 300, 370, 26, 527, 760, 0, 40, 0 - 10, 20, [300, 370, 530, 450, 527, 760]), link(1, 0, 1, 100, 560, 22, 160, 130, 60, 46, 50, 10, [100, 560, 80, 470, 78, 360, 92, 250, 120, 170, 160, 130]), link(1, 0, 1, 500, 560, 22, 440, 130, 60, 46, 0 - 50, 10, [500, 560, 522, 470, 524, 360, 510, 250, 480, 170, 440, 130]), link(1, 1, 0, 300, 102, 14, 55, 760, 0, 54, 10, 20, [300, 102, 250, 62, 150, 72, 72, 140, 42, 260, 36, 420, 38, 600, 46, 700, 55, 760])],
     cat_l([lamps(180, 230, 240, 230, 2, 0), lamps(360, 230, 420, 230, 2, 1), lamps(150, 470, 450, 470, 6, 2), lamps(45, 812, 165, 872, 4, 3), dlamps(170, 135, 430, 135, 5, 10), dlamps(250, 280, 350, 280, 3, 11)]),
     [98, 120, 140, 78, 460, 78, 502, 120, 502, 276, 394, 396, 206, 396, 98, 276], 260),
  bd("🎡 Funfair ring", "#1a0b2e", "#fde047", "#f472b6", "diamonds",
     cat_w([[w(20, 300, 20, 820), w(20, 820, 190, 897), w(545, 820, 410, 897), sling(90, 680, 160, 795), w(90, 680, 90, 770), w(90, 770, 160, 795), sling(510, 680, 440, 795), w(510, 680, 510, 770), w(510, 770, 440, 795), kicker(284, 1000, 316, 1000, 220)], arc(300, 380, 120, 0, 1350, 4), arc(300, 380, 120, 1800, 5400, 8), [w(220, 75, 220, 125), w(300, 62, 300, 112), w(380, 75, 380, 125), dw(110, 96, 146, 60), dw(146, 60, 454, 60), dw(454, 60, 490, 96), dw(110, 96, 110, 170), dw(490, 96, 490, 170), dw(110, 170, 240, 212), dw(490, 170, 360, 212), dw(226, 254, 300, 278), dw(374, 254, 300, 278)]]),
     [bp(300, 380, 24, 80), mover(0, 0, 10, 60), mover(0, 333, 10, 60), mover(0, 667, 10, 60), bp(150, 600, 22, 40), bp(450, 600, 22, 40), dbp(220, 115, 12, 60), dbp(380, 115, 12, 60)],
     [loop(300, 380, 62, 62, 300)],
     [fl(190, 905, 100, 1), fl(410, 905, 100, 0 - 1), dfl(240, 220, 42, 1), dfl(360, 220, 42, 0 - 1)],
     [link(3, 1, 0, 300, 260, 26, 527, 760, 0, 40, 0 - 10, 20, [300, 260, 530, 340, 527, 760]), link(2, 0, 1, 480, 470, 16, 440, 100, 0, 60, 0 - 40, 0, [480, 470, 480, 140, 440, 100]), link(1, 0, 1, 100, 560, 22, 160, 100, 60, 46, 50, 10, [100, 560, 80, 470, 78, 360, 92, 250, 120, 160, 160, 100]), link(1, 1, 0, 300, 72, 14, 55, 760, 0, 54, 10, 20, [300, 72, 250, 50, 150, 72, 72, 140, 42, 260, 36, 420, 38, 600, 46, 700, 55, 760])],
     cat_l([lamps(190, 110, 410, 110, 4, 0), lamps(185, 380, 300, 265, 4, 1), lamps(300, 495, 415, 380, 4, 2), lamps(45, 812, 165, 872, 4, 3), dlamps(170, 100, 430, 100, 5, 10)]),
     [98, 90, 140, 48, 460, 48, 502, 90, 502, 176, 394, 286, 206, 286, 98, 176], 250),
  bd("🌙 Moon, low gravity", "#0f172a", "#e2e8f0", "#93c5fd", "craters",
     [w(20, 300, 20, 820), w(20, 820, 190, 897), w(545, 820, 410, 897), sling(90, 680, 160, 795), w(90, 680, 90, 770), w(90, 770, 160, 795), sling(510, 680, 440, 795), w(510, 680, 510, 770), w(510, 770, 440, 795), w(70, 470, 220, 522), w(530, 470, 380, 522)],
     [bp(200, 290, 30, 60), bp(400, 290, 30, 60), bp(300, 190, 22, 60), bp(300, 690, 24, 40), mover(0, 0, 12, 80), mover(0, 500, 12, 80)],
     [loop(300, 310, 175, 80, 540)],
     [fl(190, 905, 100, 1), fl(410, 905, 100, 0 - 1), fl(220, 530, 64, 1), fl(380, 530, 64, 0 - 1)],
     [],
     cat_l([lamps(85, 485, 205, 520, 4, 0), lamps(515, 485, 395, 520, 4, 1), lamps(150, 200, 450, 200, 4, 2)]),
     [], 170),
  bd("🌀 Portals", "#0a0008", "#ff2bd6", "#ffffff", "rings",
     [w(20, 300, 20, 820), w(20, 820, 190, 897), w(545, 820, 410, 897), sling(90, 680, 160, 795), w(90, 680, 90, 770), w(90, 770, 160, 795), sling(510, 680, 440, 795), w(510, 680, 510, 770), w(510, 770, 440, 795), w(26, 290, 210, 332), w(545, 290, 390, 332)],
     [bp(300, 150, 24, 100), bp(195, 215, 16, 50), bp(405, 215, 16, 50), bp(220, 480, 24, 80), bp(380, 480, 24, 80)],
     [],
     [fl(190, 905, 100, 1), fl(410, 905, 100, 0 - 1), fl(210, 340, 75, 1), fl(390, 340, 75, 0 - 1)],
     [gate(110, 580, 22, 300, 235), gate(470, 580, 22, 300, 235), gate(300, 1004, 14, 300, 235)],
     cat_l([lamps(60, 300, 190, 325, 4, 0), lamps(540, 300, 410, 325, 4, 1), lamps(110, 520, 470, 520, 5, 2), lamps(45, 812, 165, 872, 4, 3)]),
     [], 250),
  bd("🏙️ City, two levels", "#1f1a14", "#fdba74", "#93c5fd", "windows",
     [w(20, 300, 20, 820), w(20, 820, 190, 897), w(545, 820, 410, 897), sling(90, 680, 160, 795), w(90, 680, 90, 770), w(90, 770, 160, 795), sling(510, 680, 440, 795), w(510, 680, 510, 770), w(510, 770, 440, 795), w(70, 420, 215, 472), w(505, 420, 385, 472)],
     [bp(220, 270, 24, 70), bp(380, 270, 24, 70), bp(300, 190, 20, 70), bp(300, 640, 24, 70), mover(0, 0, 16, 70), mover(1, 500, 16, 70)],
     [loop(200, 630, 0, 70, 360), loop(400, 630, 0, 70, 360)],
     [fl(190, 905, 100, 1), fl(410, 905, 100, 0 - 1), fl(215, 480, 68, 1), fl(385, 480, 68, 0 - 1)],
     [],
     cat_l([lamps(85, 432, 200, 470, 4, 0), lamps(495, 432, 400, 470, 4, 1), lamps(45, 600, 45, 440, 4, 2), lamps(525, 600, 525, 440, 4, 3)]),
     [], 260)];
  const NOBOARD = bd("", "#000000", "#ffffff", "#ffffff", "", [], [], [], [], [], [], [], 260);
  const board = i => (boards.length === 0 ? NOBOARD : i <= 0 ? boards[0] : i < boards.length ? boards[i] : NOBOARD);

  // ---- a game
  function start(i) {
    const b = board(i);
    return { x: b.sx * 1000, y: b.sy * 1000, vx: 0, vy: 0, flips: b.flippers.map(() => 500), score: 0, balls: 3, over: false, hits: [], warp: 0, gate: -1, save: 0, t: 0, lv: 0 };
  }
  // each flipper turned toward up while its side's button is held, quickly, else back down, more slowly
  function turn(fs, angles, left, right) {
    const n = Math.min(fs.length, angles.length), out = [];
    for (let k = 0; k < n; k++) {
      const f = fs[k], a = angles[k], held = (f.side === 1 && left) || (f.side === -1 && right);
      out.push(held ? (a - 260 < -500 ? -500 : a - 260) : (a + 120 > 500 ? 500 : a + 120));
    }
    return out;
  }
  // a ball against a piece from (ax, ay) to (bx, by), th thick, its far end moving (tdx, tdy) a step: the ball, and whether it touched
  function offSeg(b, ax, ay, bx, by, th, e, kick, tdx, tdy) {
    const dx = bx - ax, dy = by - ay;
    const t0 = ((b.x - ax) * dx + (b.y - ay) * dy) / (dx * dx + dy * dy + 0.0001);
    const t = t0 < 0 ? 0 : t0 > 1 ? 1 : t0;
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = Math.sqrt((b.x - cx) * (b.x - cx) + (b.y - cy) * (b.y - cy));
    const reach = 12 + th;
    if (d >= reach || d < 0.0001) return [b, false];
    const nx = (b.x - cx) / d, ny = (b.y - cy) / d;
    const vn = (b.vx - t * tdx) * nx + (b.vy - t * tdy) * ny;
    const x2 = cx + nx * reach, y2 = cy + ny * reach;
    if (vn >= 0) return [{ x: x2, y: y2, vx: b.vx, vy: b.vy }, true];
    return [{ x: x2, y: y2, vx: b.vx - (1 + e) * vn * nx + kick * nx, vy: b.vy - (1 + e) * vn * ny + kick * ny }, true];
  }
  const TAU = 6283185307179586 / 1000000000000000;
  const NOTRACK = { cx: 0, cy: 0, rx: 0, ry: 0, period: 1 };
  const trackAt = (ts, k) => (ts.length === 0 ? NOTRACK : k <= 0 ? ts[0] : k < ts.length ? ts[k] : NOTRACK);
  function spot(ts, p, t) {
    if (p.track < 0) return [p.x, p.y, 0, 0];
    const tr = trackAt(ts, p.track), wv = TAU / tr.period, th = wv * t + TAU * p.phase / 1000;
    return [tr.cx + tr.rx * Math.cos(th), tr.cy + tr.ry * Math.sin(th), 0 - tr.rx * wv * Math.sin(th), tr.ry * wv * Math.cos(th)];
  }
  const tip = (f, a) => [f.x + f.side * f.len * Math.cos(a), f.y + f.len * Math.sin(a)];
  // four small steps of a step: gravity, moving, then the walls, the bumpers, the flippers, the links; a link ends the step
  function sub(bo, b, a0s, a1s, score, hits, t, lv) {
    for (let k = 0; k < 4; k++) {
      const g = bo.gravity / 1000, vy = b.vy + g / 4;
      b = cap({ x: b.x + b.vx / 4, y: b.y + vy / 4, vx: b.vx, vy });
      bo.walls.forEach((v, j) => {
        if (v.level !== lv) return;
        const [b2, hit] = offSeg(b, v.ax, v.ay, v.bx, v.by, 0, v.bounce / 100, v.kick / 10, 0, 0);
        b = b2;
        if (hit && v.kick > 0) { score += 10; hits = [1000 + j, ...hits]; }
      });
      bo.bumpers.forEach((p, i) => {
        if (p.level !== lv) return;
        const [px, py, ux, uy] = spot(bo.tracks, p, t);
        const d = Math.sqrt((b.x - px) * (b.x - px) + (b.y - py) * (b.y - py)), reach = p.r + 12;
        if (d >= reach || d < 0.0001) return;
        const nx = (b.x - px) / d, ny = (b.y - py) / d, vn = b.vx * nx + b.vy * ny, push = ux * nx + uy * ny;
        const out = (vn < 0 ? 0 - vn : vn) + 6 + (push > 0 ? push : 0);
        b = { x: px + nx * reach, y: py + ny * reach, vx: b.vx - vn * nx + out * nx, vy: b.vy - vn * ny + out * ny };
        score += p.points; hits = [i, ...hits];
      });
      const u = (k + 1) / 4, nf = Math.min(bo.flippers.length, a0s.length, a1s.length);
      for (let m = 0; m < nf; m++) {
        const f = bo.flippers[m]; if (f.level !== lv) continue;
        const a0 = a0s[m], a1 = a1s[m], a = (a0 + (a1 - a0) * u) / 1000;
        const [tx, ty] = tip(f, a), [ox, oy] = tip(f, a0 / 1000), [nx, ny] = tip(f, a1 / 1000);
        b = offSeg(b, f.x, f.y, tx, ty, 8, 0.3, 0, nx - ox, ny - oy)[0];
      }
      b = cap(b);
      for (let i = 0; i < bo.portals.length; i++) {
        const p = bo.portals[i], dx = b.x - p.x, dy = b.y - p.y;
        if (p.from === lv && dx * dx + dy * dy < p.r * p.r && (p.need === 0 || 0 - b.vy * 10 > p.need)) {
          const out = p.kind === 0 ? { x: p.tx, y: p.ty, vx: b.vx * 0.8, vy: b.vy * 0.8 } : { x: p.tx, y: p.ty, vx: p.ex / 10, vy: p.ey / 10 };
          return [out, score, hits, i];
        }
      }
    }
    return [b, score, hits, -1];
  }
  // no faster than 32 units a step
  function cap(b) {
    const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    return s <= 32 ? b : { x: b.x, y: b.y, vx: b.vx * 32 / s, vy: b.vy * 32 / s };
  }
  const NOLINK = link(0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 0, 0, []);
  // one step on board i: the flippers' buttons held or not, and the plunger let go (1 to 100; 0 while not)
  function step(i, g, left, right, launch) {
    if (g.over) return g;
    const bo = board(i), a1s = turn(bo.flippers, g.flips, left, right);
    if (g.warp > 0) return { x: g.x, y: g.y, vx: g.vx, vy: g.vy, flips: a1s, score: g.score, balls: g.balls, over: false, hits: [], warp: g.warp - 1,
                             gate: g.warp > 1 ? g.gate : -1, save: g.save, t: g.t + 1, lv: g.lv };
    const [b, score, hits, gt] = sub(bo, { x: g.x / 1000, y: g.y / 1000, vx: g.vx / 1000, vy: g.vy / 1000 }, g.flips, a1s, g.score, [], g.t, g.lv);
    const ml = f => Math.trunc(Math.floor(f * 1000 + 0.5));
    const save = g.save > 0 ? g.save - 1 : g.save;
    if (gt >= 0) {
      const p = gt < bo.portals.length ? bo.portals[gt] : NOLINK;
      return { x: ml(b.x), y: ml(b.y), vx: ml(b.vx), vy: ml(b.vy), flips: a1s, score: score + (p.kind === 1 ? 100 : p.kind === 2 ? 50 : 25), balls: g.balls, over: false, hits,
               warp: p.hold, gate: gt, save, t: g.t + 1, lv: p.to };
    }
    if (b.y > 1030) {
      if (g.save > 0) return { x: bo.sx * 1000, y: bo.sy * 1000, vx: 0, vy: 0, flips: a1s, score, balls: g.balls, over: false, hits: [2000, ...hits], warp: 0, gate: -1, save: -1, t: g.t + 1, lv: 0 };
      if (g.balls <= 1) return { x: g.x, y: g.y, vx: 0, vy: 0, flips: a1s, score, balls: 0, over: true, hits, warp: 0, gate: -1, save: 0, t: g.t + 1, lv: 0 };
      return { x: bo.sx * 1000, y: bo.sy * 1000, vx: 0, vy: 0, flips: a1s, score, balls: g.balls - 1, over: false, hits, warp: 0, gate: -1, save: 0, t: g.t + 1, lv: 0 };
    }
    const waiting = b.x > 545 && b.y > 920 && b.vy > 0 - 1 && b.vy < 2;
    const gr = bo.gravity / 1000, vmin = Math.sqrt(2 * gr * 700);
    const v = vmin + (32 - vmin) * (launch > 100 ? 100 : launch) / 100;
    const push = 0 - Math.trunc(v * 1000);
    return { x: ml(b.x), y: ml(b.y), vx: ml(b.vx), vy: waiting ? (launch > 0 ? push : 0) : ml(b.vy), flips: a1s, score, balls: g.balls, over: false, hits,
             warp: 0, gate: -1, save: waiting && launch > 0 && save === 0 ? 480 : save, t: g.t + 1, lv: g.lv };
  }

  const api = { board, start, step, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.PinballPlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
