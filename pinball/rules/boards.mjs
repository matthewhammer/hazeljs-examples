// hazeljs-examples, Pinball's ten boards as a design (ticket 805), in JavaScript beside the Hazel module. Each piece is built by
// the same small functions Pinball.hz has (w, sling, kicker, bp, fl, gate, arc, lamps), so tools/pinball-lab.mjs can play the
// boards in seconds and write them out as Hazel for pinball/rules/Pinball.hz (`node tools/pinball-lab.mjs hazel`).
// A board is 600 wide and 1000 tall, y down; the launch lane on the right (x 545 to 580), the arch over the top (y 20 to 300).
// Matthew (2026-11-20): "more interesting structures up-board", "more variation around the gutters", "multiple occurances of
// L and R flappers, all controlled in sync", "more \"chambers\" for the boards, so it's not just \"one chamber\" with \"one
// gutter\"", "light arrays along the paths that are most likey for the ball to travel", "low-contrast background patterns".

// ---- the pieces; each carries its Hazel text
const H = Symbol("hazel");
const tag = (o, text) => Object.defineProperty(o, H, { value: text, enumerable: false });
const hzOf = o => o[H];
export const w = (ax, ay, bx, by) => tag({ ax, ay, bx, by, bounce: 50, kick: 0 }, `w(${ax}, ${ay}, ${bx}, ${by})`);
export const sling = (ax, ay, bx, by) => tag({ ax, ay, bx, by, bounce: 60, kick: 55 }, `sling(${ax}, ${ay}, ${bx}, ${by})`);
// a kicker: a wall that kicks harder (in tenths of a unit a step): a kickback at an outlane's foot, a trampoline under a gap
export const kicker = (ax, ay, bx, by, kick) => tag({ ax, ay, bx, by, bounce: 60, kick }, `kicker(${ax}, ${ay}, ${bx}, ${by}, ${kick})`);
export const bp = (x, y, r, points) => tag({ x, y, r, points, track: -1, phase: 0 }, `bp(${x}, ${y}, ${r}, ${points})`);
// (round three; Matthew: "for at least 3 boards, let's put two or three of the round bumpers into an animation loop, with \"a
// track\" that's printed as part of the background, as if it's being automated mechanically behind the board") a bumper that
// rides track number k of its board, starting phase thousandths of the way round; and a track: an oval round (cx, cy), rx
// across and ry down (one of them 0: a straight stroke, as a crank drives it), once round in period steps
export const mover = (k, phase, r, points) => tag({ x: 0, y: 0, r, points, track: k, phase }, `mover(${k}, ${phase}, ${r}, ${points})`);
export const loop = (cx, cy, rx, ry, period) => tag({ cx, cy, rx, ry, period }, `loop(${cx}, ${cy}, ${rx}, ${ry}, ${period})`);
const neg = n => n < 0 ? `0 - ${-n}` : String(n);
export const fl = (x, y, len, side) => tag({ x, y, len, side }, `fl(${x}, ${y}, ${len}, ${neg(side)})`);
export const gate = (x, y, r, tx, ty) => tag({ x, y, r, tx, ty }, `gate(${x}, ${y}, ${r}, ${tx}, ${ty})`);
// an arc of n walls round (cx, cy), radius r, from angle a0 to a1 (thousandths of a radian; y down), as Hazel's: Ints cut
export const arc = (cx, cy, r, a0, a1, n) => {
  const ang = i => (a0 + Math.trunc((a1 - a0) * i / n)) / 1000;   // (Hazel: a0 + (a1 - a0) * i / n, an Int division)
  const px = i => cx + Math.trunc(r * Math.cos(ang(i))), py = i => cy + Math.trunc(r * Math.sin(ang(i)));
  const out = []; for (let i = 0; i < n; i++) out.push({ ax: px(i), ay: py(i), bx: px(i + 1), by: py(i + 1), bounce: 50, kick: 0 });
  return tag(out, `arc(${cx}, ${cy}, ${r}, ${a0}, ${a1}, ${n})`);
};
// a row of n lamps from (x0, y0) to (x1, y1), group g: lit as the ball passes (the page's; the rules never look at them)
export const lamps = (x0, y0, x1, y1, n, g) => {
  const out = []; for (let i = 0; i < n; i++) out.push({ x: x0 + Math.trunc((x1 - x0) * i / (n - 1)), y: y0 + Math.trunc((y1 - y0) * i / (n - 1)), group: g });
  return tag(out, `lamps(${x0}, ${y0}, ${x1}, ${y1}, ${n}, ${g})`);
};
// a board's list of pieces: single pieces and whole lists (an arc, a row of lamps), flattened; in Hazel, cat_w([[a, b], arc(...)])
// for walls, cat_l([lamps(...), ...]) for lamps, a plain list for the rest
const many = (items, kind) => {
  const flat = items.flatMap(x => Array.isArray(x) ? x : [x]), groups = [];
  for (const x of items) if (Array.isArray(x)) groups.push(hzOf(x)); else if (groups.length && Array.isArray(groups[groups.length - 1])) groups[groups.length - 1].push(hzOf(x)); else groups.push([hzOf(x)]);
  const parts = groups.map(g => Array.isArray(g) ? `[${g.join(", ")}]` : g);
  if (!items.some(Array.isArray)) return tag(flat, `[${flat.map(hzOf).join(", ")}]`);
  if (kind !== "w" && kind !== "l") throw new Error("a list of lists, but not walls or lamps");
  return tag(flat, `cat_${kind}([${parts.join(", ")}])`);
};

// ---- what every board has: the right wall, the launch lane (its floor too) and the arch over the top
export const SHELL = [w(580, 300, 580, 1000), w(545, 330, 545, 1000), w(545, 965, 580, 965), ...arc(300, 300, 280, 3142, 6283, 16)];

// ---- the bottoms: each board's own way down to its gutter (the left wall from y 300 is a bottom's: some go lower)
// classic: a slope into each flipper, a slingshot above each
const classic = (flen = 100) => ({
  walls: [w(20, 300, 20, 820), w(20, 820, 190, 897), w(545, 820, 410, 897),
    sling(90, 680, 160, 795), w(90, 680, 90, 770), w(90, 770, 160, 795), sling(510, 680, 440, 795), w(510, 680, 510, 770), w(510, 770, 440, 795)],
  flippers: [fl(190, 905, flen, 1), fl(410, 905, flen, -1)], bumpers: [] });
// post: the classic, and a post under the gap that bounces a ball dropping through the middle back up
const post = () => { const c = classic(); return { ...c, bumpers: [bp(300, 990, 8, 5)] }; };
// kickback: an outlane outside each slingshot, a kicker at its foot that fires a ball back up the side
const kickback = () => ({
  walls: [w(20, 300, 20, 905), w(70, 690, 70, 905), w(70, 850, 190, 897), kicker(20, 905, 70, 905, 300),
    sling(100, 690, 165, 800), w(100, 690, 100, 775), w(100, 775, 165, 800),
    w(505, 690, 505, 905), w(505, 850, 410, 897), kicker(505, 905, 545, 905, 300),
    sling(475, 690, 415, 800), w(475, 690, 475, 775), w(475, 775, 415, 800)],
  flippers: [fl(190, 905, 100, 1), fl(410, 905, 100, -1)], bumpers: [] });
// trampoline: the classic, and a kicker under the middle of the gap
const trampoline = () => { const c = classic(); return { ...c, walls: [...c.walls, kicker(284, 1000, 316, 1000, 220)] }; };
// buoys: no slingshots; a bumper over each slope bounces a ball coming down the side back up
const buoys = () => ({
  walls: [w(20, 300, 20, 820), w(20, 820, 190, 897), w(545, 820, 410, 897)],
  flippers: [fl(190, 905, 100, 1), fl(410, 905, 100, -1)], bumpers: [bp(85, 805, 14, 20), bp(480, 805, 14, 20)] });

// ---- an upper deck: a funnel across the board into a pair of flippers at height y, with a gap at each side (the ball comes up
// through them; a ball the deck's flippers miss drops through their gap, its gutter, to the chamber below)
const deck = (y, lx, rx, lgap, rgap, flen = 68, rise = 60) => ({
  walls: [w(lgap, y - rise, lx, y - 8), w(rgap, y - rise, rx, y - 8)], flippers: [fl(lx, y, flen, 1), fl(rx, y, flen, -1)] });

// ---- a board: name, colours, pattern; its walls, bumpers, flippers, portals, lamps; its gravity (thousandths of a unit a step²)
export function bd(name, bg, ink, glow, pattern, parts, gravity) {
  const walls = many(parts.walls || [], "w"), bumpers = many(parts.bumpers || []), tracks = many(parts.tracks || []), flippers = many(parts.flippers || []),
    portals = many(parts.portals || []), lights = many(parts.lights || [], "l");
  const b = { name, bg, ink, glow, pattern, walls: [...SHELL, ...walls], bumpers, tracks, flippers, portals, lights, sx: 562, sy: 940, svx: 0, svy: -300, gravity };
  return tag(b, `bd(${JSON.stringify(name)}, ${JSON.stringify(bg)}, ${JSON.stringify(ink)}, ${JSON.stringify(glow)}, ${JSON.stringify(pattern)},\n     ` +
    [walls, bumpers, tracks, flippers, portals, lights].map(hzOf).join(",\n     ") + `, ${gravity})`);
}
const join = (...xs) => ({ walls: xs.flatMap(x => x.walls || []), bumpers: xs.flatMap(x => x.bumpers || []), tracks: xs.flatMap(x => x.tracks || []), flippers: xs.flatMap(x => x.flippers || []),
  portals: xs.flatMap(x => x.portals || []), lights: xs.flatMap(x => x.lights || []) });

// ---- the ten boards
export const BOARDS = [
  // Starfield: three rollover lanes under the arch, an orbit up the left side round to the top; the classic bottom
  bd("🌌 Starfield", "#0b1030", "#7dd3fc", "#f0abfc", "stars", join(classic(), {
    walls: [w(240, 80, 240, 135), w(300, 70, 300, 125), w(360, 80, 360, 135), arc(300, 300, 226, 3142, 3950, 6), w(74, 300, 74, 430)],
    bumpers: [bp(300, 330, 28, 100), mover(0, 0, 16, 150), mover(0, 500, 16, 150), bp(300, 200, 10, 250)],
    tracks: [loop(300, 330, 140, 70, 420)],   // (two planets round the sun, once in 7 seconds)
    lights: [lamps(47, 430, 47, 310, 4, 0), lamps(210, 115, 390, 115, 4, 1), lamps(45, 812, 165, 872, 4, 2), lamps(520, 812, 435, 855, 4, 3)] }), 260),
  // Volcano: the crater, an upper chamber with its own flippers; lava tubes up each side; a post under the gap
  bd("🌋 Volcano", "#2a0a05", "#fb923c", "#fde047", "basalt", join(post(), deck(470, 215, 385, 80, 500), {
    bumpers: [bp(300, 250, 26, 50), bp(205, 195, 20, 50), bp(395, 195, 20, 50), bp(235, 345, 18, 50), bp(365, 345, 18, 50), bp(300, 640, 22, 30)],
    lights: [lamps(95, 392, 200, 442, 4, 0), lamps(505, 392, 400, 442, 4, 1), lamps(50, 600, 50, 450, 4, 2), lamps(522, 600, 522, 450, 4, 3)] }), 280),
  // Ocean: two currents, kelp along the top, fins on the side walls; buoys over the slopes instead of slingshots
  bd("🌊 Ocean", "#03243a", "#5eead4", "#93c5fd", "waves", join(buoys(), {
    walls: [arc(200, 470, 120, 3500, 4600, 6), arc(400, 470, 120, 4825, 5900, 6)],   // (each current ends clear of the side: the right one once made a pocket with the lane's wall)
    bumpers: [bp(200, 135, 9, 20), bp(260, 112, 9, 20), bp(340, 112, 9, 20), bp(400, 135, 9, 20),
      bp(300, 260, 18, 40), bp(240, 340, 18, 40), bp(360, 340, 18, 40), bp(300, 420, 18, 40),
      mover(0, 0, 14, 40), mover(0, 333, 14, 40), mover(0, 667, 14, 40)],
    tracks: [loop(300, 570, 150, 45, 480)],   // (three fish swimming a loop, once in 8 seconds)
    flippers: [fl(20, 610, 60, 1), fl(545, 610, 60, -1)],
    lights: [lamps(70, 440, 120, 370, 3, 0), lamps(530, 440, 480, 370, 3, 1), lamps(230, 160, 370, 160, 3, 2), lamps(40, 760, 40, 660, 3, 3), lamps(525, 760, 525, 660, 3, 4)] }), 250),
  // Mushroom forest: a burrow on each side, a chamber with a flipper of its own; mushrooms between
  bd("🍄 Mushroom forest", "#14261a", "#86efac", "#fca5a5", "leaves", join(classic(), {
    walls: [w(140, 400, 140, 500), w(20, 537, 55, 552), w(425, 400, 425, 500), w(545, 537, 510, 552)],
    bumpers: [bp(220, 230, 16, 30), bp(300, 190, 16, 30), bp(380, 230, 16, 30), bp(255, 315, 16, 30), bp(345, 315, 16, 30), bp(300, 410, 16, 30), bp(300, 600, 14, 30)],
    flippers: [fl(55, 560, 64, 1), fl(510, 560, 64, -1)],
    lights: [lamps(80, 420, 80, 520, 3, 0), lamps(485, 420, 485, 520, 3, 1), lamps(200, 140, 400, 140, 5, 2), lamps(45, 812, 165, 872, 4, 3)] }), 260),
  // Castle: the top floor behind the battlements, its own flippers; a portal up from the ground floor; kickbacks in the outlanes
  bd("🏰 Castle, two floors", "#1e1033", "#c4b5fd", "#fcd34d", "bricks", join(kickback(), deck(320, 215, 385, 26, 500, 68, 70), {
    bumpers: [bp(160, 150, 22, 200), bp(300, 105, 22, 200), bp(440, 150, 22, 200), bp(300, 480, 30, 50), bp(175, 570, 16, 40), bp(425, 570, 16, 40)],
    portals: [gate(70, 640, 22, 300, 190)],
    lights: [lamps(60, 262, 200, 305, 4, 0), lamps(495, 262, 400, 305, 4, 1), lamps(45, 700, 45, 880, 4, 2), lamps(525, 700, 525, 880, 4, 3)] }), 260),
  // Cat face: ears up top, eyes and a nose, whiskers that kick; the classic bottom
  bd("🐱 Cat face", "#2b1030", "#f9a8d4", "#5eead4", "paws", join(classic(), {
    walls: [w(170, 200, 210, 120), w(210, 120, 250, 200), w(350, 200, 390, 120), w(390, 120, 430, 200), sling(140, 430, 230, 415), sling(460, 430, 370, 415)],
    bumpers: [bp(240, 300, 26, 150), bp(360, 300, 26, 150), bp(300, 385, 16, 300), bp(300, 160, 12, 100)],
    lights: [lamps(180, 230, 240, 230, 2, 0), lamps(360, 230, 420, 230, 2, 1), lamps(150, 470, 450, 470, 6, 2), lamps(45, 812, 165, 872, 4, 3)] }), 260),
  // Funfair ring: the big wheel, three booths along the top, a trampoline under the gap
  bd("🎡 Funfair ring", "#1a0b2e", "#fde047", "#f472b6", "diamonds", join(trampoline(), {
    walls: [arc(300, 380, 120, 0, 1350, 4), arc(300, 380, 120, 1800, 5400, 8), w(220, 75, 220, 125), w(300, 62, 300, 112), w(380, 75, 380, 125)],   // (the wheel open at its foot too: a ball inside once came to rest there)
    bumpers: [bp(300, 380, 24, 80), mover(0, 0, 10, 60), mover(0, 333, 10, 60), mover(0, 667, 10, 60), bp(150, 600, 22, 40), bp(450, 600, 22, 40)],
    tracks: [loop(300, 380, 62, 62, 300)],   // (three cars round the wheel's hub, once in 5 seconds)
    lights: [lamps(190, 110, 410, 110, 4, 0), lamps(185, 380, 300, 265, 4, 1), lamps(300, 495, 415, 380, 4, 2), lamps(45, 812, 165, 872, 4, 3)] }), 250),
  // Moon: low gravity, the lander's deck with its own flippers, craters above; long flippers below
  bd("🌙 Moon, low gravity", "#0f172a", "#e2e8f0", "#93c5fd", "craters", join(classic(100), deck(530, 220, 380, 70, 530, 64), {
    bumpers: [bp(200, 290, 30, 60), bp(400, 290, 30, 60), bp(300, 190, 22, 60), bp(300, 690, 24, 40)],
    lights: [lamps(85, 485, 205, 520, 4, 0), lamps(515, 485, 395, 520, 4, 1), lamps(150, 200, 450, 200, 4, 2)] }), 170),
  // Portals: the sky chamber over the top, reached by portals; a portal under the gap that saves a ball dropping through the middle
  bd("🌀 Portals", "#0a0008", "#ff2bd6", "#ffffff", "rings", join(classic(), deck(340, 210, 390, 26, 545, 75, 50), {
    bumpers: [bp(300, 150, 24, 100), bp(195, 215, 16, 50), bp(405, 215, 16, 50), bp(220, 480, 24, 80), bp(380, 480, 24, 80)],
    portals: [gate(110, 580, 22, 300, 235), gate(470, 580, 22, 300, 235), gate(300, 1004, 14, 300, 235)],
    lights: [lamps(60, 300, 190, 325, 4, 0), lamps(540, 300, 410, 325, 4, 1), lamps(110, 520, 470, 520, 5, 2), lamps(45, 812, 165, 872, 4, 3)] }), 250),
  // City: the upper deck between the towers, its own flippers; the street below
  bd("🏙️ City, two levels", "#1f1a14", "#fdba74", "#93c5fd", "windows", join(classic(), deck(480, 215, 385, 70, 505), {
    bumpers: [bp(220, 270, 24, 70), bp(380, 270, 24, 70), bp(300, 190, 20, 70), bp(300, 640, 24, 70), mover(0, 0, 16, 70), mover(1, 500, 16, 70)],
    tracks: [loop(200, 630, 0, 70, 360), loop(400, 630, 0, 70, 360)],   // (two lifts, up and down beside the street, each once in 6 seconds)
    lights: [lamps(85, 432, 200, 470, 4, 0), lamps(495, 432, 400, 470, 4, 1), lamps(45, 600, 45, 440, 4, 2), lamps(525, 600, 525, 440, 4, 3)] }), 260),
];
// (the lab's zones, for counting where the ball spends its time: each board's chambers, by height; not in the Hazel)
export const ZONES = [null, 470, null, null, 320, null, null, 530, 330, 480];
export const hazelOf = b => hzOf(b);
