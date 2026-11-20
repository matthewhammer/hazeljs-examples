// hazeljs-examples, Pinball's lab (ticket 805): the rules of pinball/rules/Pinball.hz mirrored in plain JavaScript, line for
// line, to design boards quickly (a bot plays thousands of balls in seconds), then written into the Hazel module. The mirror
// is checked against the compiled rules (pinball/compiled.js): the same game, step for step, on every board.
//   node tools/pinball-lab.mjs check [compiled.js]     the mirror against the compiled rules, every board
//   node tools/pinball-lab.mjs play [balls] [steps]     the bot on every board: how long a ball lasts, where it drains
//   node tools/pinball-lab.mjs heat <board>             where the ball goes on one board, as a picture in text
// The boards themselves come from pinball/rules/boards.mjs (the design), which also writes them as Hazel (`hazel`).
import { readFileSync } from "node:fs";

// ---- the rules, as Pinball.hz has them (Floats inside; Ints across the boundary, in thousandths for the ball)
const offSeg = (b, ax, ay, bx, by, th, e, kick, tdx, tdy) => {
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
};
export const RULES = {};
RULES.v1 = {
  wallsHit(b, ws, score) {
    for (const v of ws) { const [b2, hit] = offSeg(b, v.ax, v.ay, v.bx, v.by, 0, v.bounce / 100, v.kick / 10, 0, 0); b = b2; if (hit && v.kick > 0) score += 10; }
    return [b, score];
  },
  bumps(b, bs, score, hits) {
    bs.forEach((p, i) => {
      const d = Math.sqrt((b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y)), reach = p.r + 12;
      if (d >= reach || d < 0.0001) return;
      const nx = (b.x - p.x) / d, ny = (b.y - p.y) / d, vn = b.vx * nx + b.vy * ny, out = (vn < 0 ? 0 - vn : vn) + 6;
      b = { x: p.x + nx * reach, y: p.y + ny * reach, vx: b.vx - vn * nx + out * nx, vy: b.vy - vn * ny + out * ny };
      score += p.points; hits = [i, ...hits];
    });
    return [b, score, hits];
  },
};
const tip = (f, a) => [f.x + f.side * f.len * Math.cos(a), f.y + f.len * Math.sin(a)];
const flipsHit = (b, fs, a0s, a1s, u) => {
  fs.forEach((f, i) => {
    const a0 = a0s[i], a1 = a1s[i], a = (a0 + (a1 - a0) * u) / 1000;
    const [tx, ty] = tip(f, a), [ox, oy] = tip(f, a0 / 1000), [nx, ny] = tip(f, a1 / 1000);
    b = offSeg(b, f.x, f.y, tx, ty, 8, 0.3, 0, nx - ox, ny - oy)[0];
  });
  return b;
};
const through = (b, ps) => {
  for (const p of ps) { const dx = b.x - p.x, dy = b.y - p.y; if (dx * dx + dy * dy < p.r * p.r) return { x: p.tx, y: p.ty, vx: b.vx * 0.8, vy: b.vy * 0.8 }; }
  return b;
};
const cap = b => { const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy); return s <= 32 ? b : { x: b.x, y: b.y, vx: b.vx * 32 / s, vy: b.vy * 32 / s }; };
const turn = (fs, angles, left, right) => fs.map((f, i) => { const a = angles[i], held = (f.side === 1 && left) || (f.side === -1 && right);
  return held ? (a - 260 < -500 ? -500 : a - 260) : (a + 120 > 500 ? 500 : a + 120); });
const ml = f => Math.floor(f * 1000 + 0.5);
// ---- round two (ticket 805): a portal holds the ball WARP steps before it comes out (the page animates the trip; 25 points);
// a kicker (a wall that kicks) touched is reported among the hits as 1000 + its number, for the page to flash
export const WARP = 40, SAVE = 480;   // (a portal's hold, 2/3 s; the ball save, 8 s after each launch)
const wallsHit2 = (b, ws, score, hits) => {
  ws.forEach((v, j) => { const [b2, hit] = offSeg(b, v.ax, v.ay, v.bx, v.by, 0, v.bounce / 100, v.kick / 10, 0, 0); b = b2; if (hit && v.kick > 0) { score += 10; hits = [1000 + j, ...hits]; } });
  return [b, score, hits];
};
const through2 = (b, ps) => {
  for (let i = 0; i < ps.length; i++) { const p = ps[i], dx = b.x - p.x, dy = b.y - p.y; if (dx * dx + dy * dy < p.r * p.r) return [{ x: p.tx, y: p.ty, vx: b.vx * 0.8, vy: b.vy * 0.8 }, i]; }
  return [b, -1];
};
export function start2(bo) { return { ...start(bo), warp: 0, gate: -1, save: 0 }; }
export function step2(bo, g, left, right, launch) {
  if (g.over) return g;
  const a1s = turn(bo.flippers, g.flips, left, right);
  if (g.warp > 0) return { ...g, flips: a1s, warp: g.warp - 1, gate: g.warp > 1 ? g.gate : -1, hits: [] };
  let b = { x: g.x / 1000, y: g.y / 1000, vx: g.vx / 1000, vy: g.vy / 1000 }, score = g.score, hits = [], gate = -1;
  const gr = bo.gravity / 1000;
  for (let k = 0; k < 4 && gate < 0; k++) {
    const vy = b.vy + gr / 4;
    const moved = cap({ x: b.x + b.vx / 4, y: b.y + vy / 4, vx: b.vx, vy });
    let b1; [b1, score, hits] = wallsHit2(moved, bo.walls, score, hits);
    let b2; [b2, score, hits] = RULES.v1.bumps(b1, bo.bumpers, score, hits);
    const b3 = flipsHit(b2, bo.flippers, g.flips, a1s, (k + 1) / 4);
    [b, gate] = through2(cap(b3), bo.portals);
  }
  const save = g.save > 0 ? g.save - 1 : g.save;   // (0: armed for the next launch; -1: this ball's save is spent)
  if (gate >= 0) return { x: ml(b.x), y: ml(b.y), vx: ml(b.vx), vy: ml(b.vy), flips: a1s, score: score + 25, balls: g.balls, over: false, hits, warp: WARP, gate, save };
  // (a ball lost while its save lasts comes back to the lane, no ball spent; 2000 among the hits says so, for the page)
  if (b.y > 1030) return g.save > 0 ? { x: bo.sx * 1000, y: bo.sy * 1000, vx: 0, vy: 0, flips: a1s, score, balls: g.balls, over: false, hits: [2000, ...hits], warp: 0, gate: -1, save: -1 }
    : g.balls <= 1 ? { x: g.x, y: g.y, vx: 0, vy: 0, flips: a1s, score, balls: 0, over: true, hits, warp: 0, gate: -1, save: 0 }
    : { x: bo.sx * 1000, y: bo.sy * 1000, vx: 0, vy: 0, flips: a1s, score, balls: g.balls - 1, over: false, hits, warp: 0, gate: -1, save: 0 };
  const waiting = b.x > 545 && b.y > 920 && b.vy > -1 && b.vy < 2;
  // (round two) the launch, 1 to 100: from just out of the lane (high enough on this board's gravity to clear it) to full speed
  const vmin = Math.sqrt(2 * gr * 700), v = vmin + (32 - vmin) * (launch > 100 ? 100 : launch) / 100, push = 0 - Math.trunc(v * 1000);
  return { x: ml(b.x), y: ml(b.y), vx: ml(b.vx), vy: waiting ? (launch > 0 ? push : 0) : ml(b.vy), flips: a1s, score, balls: g.balls, over: false, hits, warp: 0, gate: -1, save: waiting && launch > 0 && save === 0 ? SAVE : save };
}
export function start(bo) { return { x: bo.sx * 1000, y: bo.sy * 1000, vx: 0, vy: 0, flips: bo.flippers.map(() => 500), score: 0, balls: 3, over: false, hits: [] }; }
export function step(bo, g, left, right, launch, R = RULES.v1) {
  if (g.over) return g;
  const a1s = turn(bo.flippers, g.flips, left, right);
  let b = { x: g.x / 1000, y: g.y / 1000, vx: g.vx / 1000, vy: g.vy / 1000 }, score = g.score, hits = [];
  const gr = bo.gravity / 1000;
  for (let k = 0; k < 4; k++) {
    const vy = b.vy + gr / 4;
    const moved = cap({ x: b.x + b.vx / 4, y: b.y + vy / 4, vx: b.vx, vy });
    let b1; [b1, score] = R.wallsHit(moved, bo.walls, score);
    let b2; [b2, score, hits] = R.bumps(b1, bo.bumpers, score, hits);
    const b3 = flipsHit(b2, bo.flippers, g.flips, a1s, (k + 1) / 4);
    b = through(cap(b3), bo.portals);
  }
  if (b.y > 1030) return g.balls <= 1 ? { x: g.x, y: g.y, vx: 0, vy: 0, flips: a1s, score, balls: 0, over: true, hits }
    : { x: bo.sx * 1000, y: bo.sy * 1000, vx: 0, vy: 0, flips: a1s, score, balls: g.balls - 1, over: false, hits };
  const waiting = b.x > 545 && b.y > 920 && b.vy > -1 && b.vy < 2;
  const push = 0 - (24000 + 80 * (launch > 100 ? 100 : launch));
  return { x: ml(b.x), y: ml(b.y), vx: ml(b.vx), vy: waiting ? (launch > 0 ? push : 0) : ml(b.vy), flips: a1s, score, balls: g.balls, over: false, hits };
}

// ---- the bot: it flips a flipper when the ball comes down along its outer part (not while it rests by the pivot, where a
// person lets it roll), holds a few steps, lets go; it launches at a set pull. As a person (st.lag > 0), it sees the ball
// st.lag steps late and misses a flip now and then (st.miss of them)
export function bot(bo, g, st) {
  st.seen = st.seen || []; st.seen.push(g); if (st.seen.length > (st.lag || 0) + 1) st.seen.shift();
  const v = st.seen[0], x = v.x / 1000, y = v.y / 1000, vx = v.vx / 1000, vy = v.vy / 1000;
  let launch = 0; if (g.x / 1000 > 545 && g.y / 1000 > 900 && Math.abs(g.vy / 1000) < 2) launch = st.pull;
  for (const f of bo.flippers) {
    const ux = f.side * Math.cos(0.5), uy = Math.sin(0.5), d = (x - f.x) * ux + (y - f.y) * uy, p = (x - f.x) * -uy * f.side + (y - f.y) * ux * f.side;
    if (d > 0.3 * f.len && d < f.len + 18 && Math.abs(p) < 40 && vy > 0.3 && !(st.rnd && st.rnd() < (st.miss || 0) / 8)) { if (f.side > 0) st.L = st.L || 10; else st.R = st.R || 10; }
  }
  const out = [st.L > 0, st.R > 0, launch]; if (st.L > 0) st.L--; if (st.R > 0) st.R--; return out;
}

// ---- run from the command line
const here = new URL(".", import.meta.url);
async function boards() { return (await import(new URL("../pinball/rules/boards.mjs", here))).BOARDS; }
const cmd = process.argv[2];
if (cmd === "check") {
  const box = {}; new Function("module", "window", readFileSync(process.argv[3] || new URL("../pinball/compiled.js", here), "utf8"))(box, undefined);
  const P = box.exports; let bad = 0, steps = 0;
  for (let i = 0; i < 10; i++) {
    // (round two: the compiled rules against the mirror's round-two step, start2 and step2; `step` and `start` above are round one's)
    const bo = P.board(i); let g = P.start(i), m = start2(bo); const st = { pull: 10 + 9 * i, L: 0, R: 0 };
    for (let n = 0; n < 4000 && !g.over; n++) {
      const [l, r, la] = bot(bo, g, st); g = P.step(i, g, l, r, la); m = step2(bo, m, l, r, la); steps++;
      if (JSON.stringify(g) !== JSON.stringify(m)) { bad++; console.log(bo.name, "step", n, "differs:", JSON.stringify(g).slice(0, 160), "|", JSON.stringify(m).slice(0, 160)); break; }
    }
  }
  console.log(`${steps} steps on 10 boards: ${bad ? bad + " boards differ" : "the mirror and the compiled rules agree on every one"}`);
  process.exit(bad ? 1 : 0);
}
// the bot on the designed boards: per board, how long a ball lasts (seconds), how it left, whether it got stuck, the share of
// time in the upper chamber (ZONES), the bumpers and kickers it hit, and each lamp's share of balls that passed it
let LAG = 0, MISS = 0;
async function play(NB, MAX, only) {
  const { BOARDS, ZONES } = await import(new URL("../pinball/rules/boards.mjs", here));
  let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const rows = [];
  BOARDS.forEach((bo, i) => {
    if (only !== undefined && i !== only) return;
    const lives = [], lamp = bo.lights.map(() => 0); let saves = 0, mid = 0, side = 0, kept = 0, stuck = 0, upper = 0, total = 0, bumps = 0, kicks = 0, warps = 0;
    for (let n = 0; n < NB; n++) {
      let g = start2(bo); const st = { pull: 20 + Math.floor(rnd() * 80), L: 0, R: 0, lag: LAG, miss: MISS, rnd }; let s = 0, still = 0; const seen = new Set();
      for (; s < MAX; s++) {
        const [l, r, la] = bot(bo, g, st), g2 = step2(bo, g, l, r, la);
        for (const h of g2.hits) if (h === 2000) saves++; else if (h >= 1000) kicks++; else bumps++;
        if (g2.gate >= 0 && g.gate < 0) warps++;
        const x = g2.x / 1000, y = g2.y / 1000;
        if (g2.balls < g.balls || g2.over) { const lx = g.x / 1000; if (lx > 270 && lx < 330) mid++; else side++; break; }
        if (!(x > 545 && y > 900)) { total++; if (ZONES[i] && y < ZONES[i]) upper++; }
        bo.lights.forEach((L, k) => { if (!seen.has(k) && (L.x - x) ** 2 + (L.y - y) ** 2 < 28 * 28) { seen.add(k); lamp[k]++; } });
        const sp = Math.abs(g2.vx) + Math.abs(g2.vy);
        still = sp < 600 && !(x > 545 && y > 900) && g2.warp === 0 ? still + 1 : 0;
        if (still > 300) { stuck++; console.log(`  ${bo.name}: stuck at (${x.toFixed(0)}, ${y.toFixed(0)})`); break; }
        g = g2;
      }
      if (s >= MAX) kept++; lives.push(s);
    }
    lives.sort((a, c) => a - c);
    rows.push({ board: bo.name, life_s: +(lives[lives.length >> 1] / 60).toFixed(1), under_10s: lives.filter(x => x < 600).length, kept, stuck, drains: `${mid} mid ${side} side`,
      upper: ZONES[i] ? Math.round(100 * upper / Math.max(1, total)) + "%" : "", bumps: Math.round(bumps / NB), kicks: Math.round(kicks / NB), warps: Math.round(warps / NB), saves,
      dark_lamps: lamp.map((c, k) => c / NB < 0.25 ? k : null).filter(k => k !== null).join(" ") });
  });
  console.table(rows);
}
async function heat(i, NB, MAX) {
  const { BOARDS } = await import(new URL("../pinball/rules/boards.mjs", here));
  const bo = BOARDS[i], C = 30, R = 50, grid = Array.from({ length: R }, () => new Array(C).fill(0));
  let seed = 5; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  for (let n = 0; n < NB; n++) { let g = start2(bo); const st = { pull: 20 + Math.floor(rnd() * 80), L: 0, R: 0 };
    for (let s = 0; s < MAX; s++) { const [l, r, la] = bot(bo, g, st), g2 = step2(bo, g, l, r, la); if (g2.balls < g.balls || g2.over) break; g = g2;
      const cx = Math.floor(g.x / 1000 / 20), cy = Math.floor(g.y / 1000 / 20); if (cx >= 0 && cx < C && cy >= 0 && cy < R) grid[cy][cx]++; } }
  const mx = Math.max(...grid.flat()), ch = " .:-=+*#%@";
  console.log(bo.name + " (each character 20 units; the busier, the darker)");
  for (const row of grid) console.log("|" + row.map(v => v ? ch[Math.min(9, 1 + Math.floor(9 * Math.sqrt(v / mx)))] : " ").join("") + "|");
}
if (cmd === "play" || cmd === "person") { if (cmd === "person") { LAG = +(process.env.LAG || 6); MISS = +(process.env.MISS || 0.1); } await play(+(process.argv[3] || 30), +(process.argv[4] || 3600), process.argv[5] !== undefined ? +process.argv[5] : undefined); }
if (cmd === "hazel") { const { BOARDS, hazelOf } = await import(new URL("../pinball/rules/boards.mjs", here)); console.log("let boards : [Board] = [\n  " + BOARDS.map(hazelOf).join(",\n  ") + "];"); }
// the Hazel module, interpreted by hazeljs, against the mirror: every board's pieces, then a few steps from starts that meet
// walls, kickers, bumpers, flippers and portals (slow: about 0.1 s a step; run it niced and pinned)
if (cmd === "hazelcheck") {
  const { BOARDS } = await import(new URL("../pinball/rules/boards.mjs", here));
  const Hazel = (await import("hazeljs")).default, read = f => readFileSync(new URL("../pinball/rules/" + f, here), "utf8").replace(/\s+$/, "");
  const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Pinball", text: read("Pinball.hz") }], tail: "(start = Pinball.start, step = Pinball.step, board = Pinball.board)" });
  if (!r.ok) { console.log("did not build:", JSON.stringify(r.errors).slice(0, 600)); process.exit(1); }
  const P = r.value, norm = o => JSON.parse(JSON.stringify(o)); let bad = 0, steps = 0;
  const only = process.argv[3] !== undefined && process.argv[3] !== "" ? [+process.argv[3]] : BOARDS.map((_, i) => i), N = +(process.argv[4] || 10);
  for (const i of only) {
    const mine = BOARDS[i], theirs = norm(P.board(i));
    for (const k of ["name", "pattern", "gravity", "walls", "bumpers", "flippers", "portals", "lights"])
      if (JSON.stringify(theirs[k]) !== JSON.stringify(norm(mine[k]))) { bad++; console.log(mine.name, k, "differs:", JSON.stringify(theirs[k]).slice(0, 200), "|", JSON.stringify(norm(mine[k])).slice(0, 200)); }
    const starts = [{ x: 300000, y: 140000, vx: 3000, vy: 2000 }, { x: 230000, y: 860000, vx: 1000, vy: 9000 }, { x: 150000, y: 700000, vx: -6000, vy: 4000 }];
    starts.push({ x: 562000, y: 940000, vx: 0, vy: 0, launch: 37 }, { x: 562000, y: 940000, vx: 0, vy: 0, launch: 100 }, { x: 300000, y: 1020000, vx: 0, vy: 9000 }, { x: 300000, y: 1020000, vx: 0, vy: 9000, save: 0 }, { x: 300000, y: 1020000, vx: 0, vy: 9000, save: -1, balls: 1 });
    if (mine.portals.length) starts.push({ x: mine.portals[0].x * 1000, y: mine.portals[0].y * 1000 - 30000, vx: 0, vy: 6000 });
    const fl = mine.flippers.length; if (fl > 2) starts.push({ x: mine.flippers[2].x * 1000 + 30000, y: mine.flippers[2].y * 1000 - 40000, vx: 0, vy: 5000 });
    for (const s0 of starts) {
      const { launch: la0 = 0, ...g0 } = s0, sv = g0.save ?? 200;
      let a = { ...start2(mine), ...g0, save: sv }, b = { ...norm(P.start(i)), ...g0, save: sv };
      for (let n = 0; n < N; n++) {
        const l = n % 6 < 3, rr = n % 5 < 2; const la = n === 0 ? la0 : 0; a = step2(mine, a, l, rr, la); b = norm(P.step(i, b, l, rr, la)); steps++;
        if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.log(mine.name, "from", JSON.stringify(s0), "step", n, "differs:\n  lab  ", JSON.stringify(a).slice(0, 220), "\n  hazel", JSON.stringify(b).slice(0, 220)); break; }
      }
    }
    console.log(mine.name + ": checked");
  }
  console.log(`${steps} steps compared: ${bad ? bad + " differences" : "the Hazel rules and the mirror agree"}`); process.exit(bad ? 1 : 0);
}
if (cmd === "heat") await heat(+process.argv[3], +(process.argv[4] || 30), +(process.argv[5] || 3600));
export { offSeg, cap, through, turn, tip, flipsHit, ml };
