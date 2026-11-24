// hazeljs-examples, Gnome world (0.0.76; Matthew, 2026-11-23: "I'd like a new variation of gnome dig. This one is called
// 'gnome world.', until I think of a better name"; "move the gnome in a sub-tile way"; "a world that's larger than one
// screen"; "fill the entire available screen with game tiles in full screen mode"; "the feel of a platform NES/SNES game ---
// we scroll the level smoothly to center the gnome we control"; "at least 8 or 16 screen fulls of width, and maybe 4 or 8
// screen fulls of height, between deep underground and trees and tree houses"). The world, 896 tiles across and 208 down
// (32 screens of 28 by 13 of 16; 448 by 128 until 0.0.102), planned by Hazel (World.plan: the land, the rock, the rivers, the beavers, the
// villages, the great trees, the places under the ground), and built here into its tiles. Every frame the gnome takes a step
// in Hazel (World.step: running, jumping, climbing, digging, swimming), the beavers think in Hazel ten times a second
// (World.beaver), and how high a dam holds its river is Hazel (World.water_row); here, the water seeping through the ground,
// the boulders falling, the camera, and the drawing.
//
// (Matthew: "please get inspired by the artwork of Rien Poortvliet ... This is a key inspiration. And we should give credit";
// "We aren't copying any image/illustration, but we are drawing inspiration and giving credit") The pictures are inspired by
// Rien Poortvliet's paintings for Gnomes (Wil Huygen and Rien Poortvliet, 1976): the woods, the gnomes' homes among the roots,
// the earth in cutaway. All of them are our own, drawn here; none of his is copied. The roots, the ground and the trees are
// Gnome dig's (and its trees Messed Up Dress Up's).
//
// (Matthew: "Or just use hazel jit as you prototype the game logic") The rules run compiled by hazel-jit: Hazel's library
// from the hazeljs branch's build (hazelgrove/hazel#2857), whose Hazel.jitProgram compiles them as the page loads; where that
// does not load, hazeljs 0.0.4 from npm runs them interpreted (?lib=npm asks for it), slower: a step 4 ms, not 0.02.
(async () => {
  "use strict";
  const LIB_JIT = "https://build.hazel.org/hazeljs/hazel-lib.js", LIB_NPM = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "world", MODULES = ["World"];
  const TAIL = "(plan = World.plan, ground = World.ground, village = World.village, furnish = World.furnish, limbs = World.limbs, styles = World.styles, beaver = World.beaver, water_row = World.water_row, step = World.step, roots = World.roots, threads = World.threads, greet = World.greet, dig_steps = World.dig_steps)";
  const KEY = "hazeljs-examples/world/";
  const Q = new URLSearchParams(location.search);
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* this visit only */ } };
  const SND = window.DigSound || null;   // (Gnome dig's music and sounds, dig/sound.js)

  // ---- the world's tiles: what is there (mat), its water (wat: for ground, the share of its pores full; for air, the share of
  // the tile full of water), what is behind an open tile (bg), what is on it (fix), a gem in it, roots in it, a digging's cracks
  // (0.0.102; Matthew, 2026-11-24: "To make the world all 'fit', let's extend the entire world to be larger, in terms of tiles")
  // twice as wide, and 80 rows more sky over the land (SKY), for trees three times as tall
  const WW = 896, WH = 208, NN = WW * WH, SKY = 80;
  const AIR = 0, SOIL = 1, CLAY = 2, SAND = 3, SSTONE = 4, SHALE = 5, LIME = 6, GRANITE = 7, MASON = 8, TIMBER = 9;
  const B_NONE = 0, B_DUG = 1, B_PLASTER = 2, B_WOOD = 3, B_STAIR = 4, B_CAVE = 5;
  const F_LADDER = 1, F_PLAT = 2, F_STAIR = 3, F_BRIDGE = 4, F_HATCH = 5, F_DOOR = 6;
  const mat = new Uint8Array(NN), wat = new Float32Array(NN), bg = new Uint8Array(NN), fix = new Uint8Array(NN), gem = new Uint8Array(NN), root = new Uint8Array(NN), stone = new Uint8Array(NN), shape = new Uint8Array(NN), treeMask = new Uint8Array(NN);
  const surf0 = new Int16Array(WW), top = new Int16Array(WW);   // (the land's surface as made; the highest solid tile now)
  const at = (c, r) => r * WW + c;
  const inside = (c, r) => c >= 0 && c < WW && r >= 0 && r < WH;
  // each kind of ground, from Hazel (World.ground): its pores (0 to 1), water's flow through it (a share of the pores a step), the
  // share that clings, the steps to dig it, its color
  const PORES = new Float32Array(10), FLOW = new Float32Array(10), CLING = new Float32Array(10), DIG = new Uint8Array(10), COLOR = [], NAME = [];
  // (0.0.95) the steps a tile takes to dig, from the rules (World.dig_steps), for each digger (none, the good, the super), each kind
  // of ground, and each band of rows: the ground, the bedrock (the last four rows) and the world's floor (the very last)
  const DIGT = new Uint8Array(3 * 10 * 3);
  const digSteps = (m, r, tool) => m > 9 ? 0 : DIGT[((Math.min(2, Math.max(0, tool | 0)) * 10 + m) * 3) + (r >= WH - 1 ? 2 : r >= WH - 4 ? 1 : 0)];
  const S = { built: null, lib: "", libFailed: false, plan: null, seed: kept("seed", 7), rivers: [], dams: [], lodges: [], beavers: [], rooms: [], villages: [],
    greats: [], trees: [], bushes: [], shrooms: [], flowers: [], rootSets: [], threadSets: [], rootPlan: [], boulders: [], ducts: [], lamps: [], items: [], houses: [], bridges: [], smoke: [], parts: [], drops: [], rain: 0, rainAt: 0,
    styles: [], dry: [], works: new Map(), windNow: 0.2, leaves: [], g: null, hero: kept("hero", "dad"), hearts: 5, gems: kept("gems", 0), hurtAt: -1e9, faintAt: 0, start: { x: 12500, y: 0 }, keys: { left: false, right: false, up: false, down: false, dig: false },
    jumpQueued: false, cam: { x: 0, y: 0, set: false }, frame: 0, map: kept("map", true), banner: null, places: [], stepMs: [], beaverAt: 0, damAt: 0, minimapAt: -1e9, dirty: true };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  let seedRand = 1;
  const rand = () => { seedRand = (seedRand * 1103515245 + 12345) & 0x7fffffff; return seedRand / 0x7fffffff; };

  // ---- building the world from Hazel's plan
  function build(h, seed) {
    const p = h.plan(seed); S.plan = p; seedRand = seed * 7 + 3;
    for (let k = 0; k <= 9; k++) { const gr = h.ground(k); PORES[k] = gr.pores / 100; FLOW[k] = gr.flow / 1000; CLING[k] = gr.cling / 100; DIG[k] = gr.dig;
      for (let t = 0; t < 3; t++) [60, WH - 3, WH - 1].forEach((r, b) => { DIGT[(t * 10 + k) * 3 + b] = h.dig_steps ? h.dig_steps(k, r, t) : t === 0 && b < 2 && k <= 5 ? gr.dig : 0; });
      COLOR[k] = "#" + gr.color.toString(16).padStart(6, "0"); NAME[k] = gr.name; }
    S.styles = h.styles;
    mat.fill(AIR); wat.fill(0); bg.fill(B_NONE); fix.fill(0); gem.fill(0); root.fill(0); stone.fill(0); shape.fill(0);
    const lerp = (a, i, step) => { const k = i / step, j = Math.min(a.length - 1, Math.floor(k)), f = k - j, b = a[Math.min(a.length - 1, j + 1)]; return a[j] * (1 - f) + b * f; };
    for (let c = 0; c < WW; c++) {
      const s = Math.round(lerp(p.surface, c, 8)); surf0[c] = s;
      let r = s;
      for (let L = 0; L < p.layers.length; L++) {
        const lay = p.layers[L], last = L === p.layers.length - 1, t = last ? WH : Math.round(lerp(lay.thick, c, 16));
        for (let k = 0; k < t && r < WH - 4; k++, r++) mat[at(c, r)] = lay.kind;
      }
      for (let r2 = WH - 4; r2 < WH; r2++) mat[at(c, r2)] = GRANITE;
    }
    const byKind = k => p.places.filter(q => q.kind === k);
    const blob = (q, kind, fn) => { const cx = q.x + q.w / 2, cy = q.y + q.h / 2;
      for (let c = q.x; c < q.x + q.w; c++) for (let r = q.y; r < q.y + q.h; r++) { if (!inside(c, r) || r < surf0[c] + 3 || r >= WH - 4) continue;
        const u = (c + 0.5 - cx) / (q.w / 2), v = (r + 0.5 - cy) / (q.h / 2); if (u * u + v * v <= 1 + 0.25 * Math.sin(c * 1.7 + r)) fn ? fn(c, r) : (mat[at(c, r)] = kind); } };
    // under the ground: old river gravel, limestone shelves (their caves), granite, and bowls of clay holding water
    for (const q of byKind(41)) blob(q, SAND);
    for (const q of byKind(42)) { blob(q, LIME);
      for (let k = 0; k < 2 + (q.v % 2); k++) { const w = 4 + Math.floor(rand() * Math.max(2, q.w / 3)), hh = 2 + Math.floor(rand() * 2), x = q.x + 2 + Math.floor(rand() * Math.max(1, q.w - w - 4)), y = q.y + 2 + Math.floor(rand() * Math.max(1, q.h - hh - 3));
        blob({ x, y, w, h: hh + 1 }, 0, (c, r) => { const i = at(c, r); if (mat[i] === LIME) { mat[i] = AIR; bg[i] = B_CAVE; } }); } }
    for (const q of byKind(43)) blob(q, GRANITE);
    for (const q of byKind(40)) { const cx = q.x + q.w / 2;
      for (let c = q.x; c < q.x + q.w; c++) { if (c < 0 || c >= WW) continue; const u = (c + 0.5 - cx) / (q.w / 2), d = Math.round(q.h * Math.sqrt(Math.max(0, 1 - u * u)));
        const bottom = q.y + Math.max(1, d);
        for (let r = q.y; r < bottom && r < WH - 4; r++) { const i = at(c, r); if (r > surf0[c] + 2) { mat[i] = SAND; wat[i] = 1; } }
        for (let r = bottom; r < bottom + 2 && r < WH - 4; r++) if (r > surf0[c] + 2) mat[at(c, r)] = CLAY;
        if (Math.abs(u) > 0.85) for (let r = q.y - 1; r < bottom; r++) if (r > surf0[c] + 2) { mat[at(c, r)] = CLAY; wat[at(c, r)] = 0; } } }
    // the rivers: the banks sloping down to each, its channel, a bed of sand and gravel under it
    S.rivers = [];
    for (const q of p.places.filter(q => q.kind >= 10 && q.kind <= 12)) {
      const R = { kind: q.kind, x: q.x, w: q.w, natural: q.y, level: q.y, depth: q.h, bed: [], bank: 0, dam: null, name: ["a creek", "the stream", "the river"][q.kind - 10] };
      for (let c = q.x - 4; c < q.x + q.w + 4; c++) { if (c < 0 || c >= WW || (c >= q.x && c < q.x + q.w)) continue;
        const d = c < q.x ? q.x - c : c - (q.x + q.w - 1), t = q.y - 5 + Math.min(1, Math.floor((4 - d) / 2));
        for (let r = surf0[c]; r < t; r++) mat[at(c, r)] = AIR;
        if (surf0[c] < t) surf0[c] = t; }
      for (let c = q.x; c < q.x + q.w; c++) { const u = (c - q.x + 0.5) / q.w * 2 - 1, d = Math.max(1, Math.round(q.h * Math.sqrt(Math.max(0.05, 1 - u * u))));
        const bed = q.y + d; R.bed.push(bed);
        for (let r = 0; r < bed; r++) { const i = at(c, r); mat[i] = AIR; bg[i] = B_NONE; }
        for (let r = bed; r < bed + 2; r++) mat[at(c, r)] = SAND;
        surf0[c] = bed; }
      R.bank = Math.max(surf0[q.x - 1] ?? q.y - 4, surf0[q.x + q.w] ?? q.y - 4);
      slopeBanks(R);
      S.rivers.push(R);
    }
    // the beavers' lodges, dams and the beavers
    S.lodges = byKind(13).map(q => ({ x: q.x, w: q.w, river: riverAt(q.x + q.w / 2) || riverAt(q.x + q.w + 3) || riverAt(q.x - 3) }));
    S.dams = byKind(14).map(q => { const R = riverAt(q.x + q.w / 2); const d = { x: q.x, w: q.w, logs: q.v, river: R, at: q.x + Math.floor(q.w / 2) }; if (R) R.dam = d; return d; });
    for (const d of S.dams) if (d.river) setLevel(h, d.river);
    for (const R of S.rivers) plantRiver(R);
    S.beavers = byKind(15).map(q => ({ b: { x: q.x * 100, face: 1, job: 0, t: 40 + q.v * 35, tree: -1, lodge: q.x, dam: q.w, felled: -1, laid: false, cut: false }, px: q.x, py: 0, swing: q.v }));
    // the villages, deep under the ground
    S.rooms = []; S.ducts = []; S.lamps = []; S.items = []; S.villages = [];
    for (const q of [...byKind(20), ...byKind(21)]) village(h, q, q.kind === 21 ? 1 : 0, p.seed);
    if (!S.items.some(it => it.kind === "good")) { const ws = S.rooms.find(R => R.kind === 4) || S.rooms[0]; if (ws) S.items.push({ kind: "good", x: ws.x + 0.9, y: ws.y + 3.2, taken: false }); }
    // the great trees, their limbs, platforms, ladders or stair, houses, and rope bridges to the trees beside the stair tree
    S.greats = []; S.houses = []; S.bridges = [];
    S.trees = byKind(50).map(q => ({ x: q.x, kind: q.v, h: q.h, alive: true, grow: 1, fallAt: 0, regrow: 0, seed: q.x * 13 + q.h }));
    for (const q of [...byKind(30), ...byKind(31)]) greatTree(h, q);
    S.bushes = byKind(51).map(q => ({ x: q.x, v: q.v }));
    // (Matthew: "gnome should be able to climb the tree like an animal"; "even the parts without a ladder"; "if he has the
    // tree-climb pack"; "place that into one of the tree houses by default") the tree-climbing pack, in the lowest house of
    // the first great tree
    { const first = S.houses.filter(hs => !hs.small).sort((a, b) => b.row - a.row)[0]; if (first) S.items.push({ kind: "climb", x: first.x + 0.5 - first.side * 1.1, y: first.row - 0.55, taken: false }); }
    S.shrooms = byKind(53).map(q => ({ x: q.x, v: q.v }));
    S.flowers = byKind(54).map(q => ({ x: q.x, v: q.v, n: q.h }));
    S.rootSets = []; S.threadSets = []; shapeSurface(); makeSquirrels(); buildTreeMask(); makeVillagers(); makeWild(); makeBunnies();
    S.rootPlan = [...S.greats.map(G => ({ x: G.x, row: G.foot, k: 150, seed: G.v })), ...S.trees.map(t => ({ x: t.x, row: surf0[t.x], k: 70 + Math.round(t.h * 4 / 3) + (t.tall ? 30 : 0), seed: t.seed })),
      ...S.shrooms.map(m => ({ x: m.x, row: surf0[m.x], seed: m.x * 3 + m.v, kind: "shroom" }))];
    // roots: under each tree, spreading and thinning down; water goes down them faster
    if (!(S.built && S.built.compiled)) for (const t of [...S.trees, ...S.greats.map(g => ({ x: g.x, h: g.h * 0.7 }))]) { const deep = Math.min(14, Math.round(t.h * 0.3)), s = surf0[t.x];
      for (let r = s; r < s + deep && r < WH - 4; r++) { const spread = 1 + Math.floor((r - s) / 3);
        for (let c = t.x - spread; c <= t.x + spread; c++) if (inside(c, r) && PORES[mat[at(c, r)]] > 0) root[at(c, r)] = Math.min(3, root[at(c, r)] + (Math.abs(c - t.x) <= 1 ? 2 : 1)); } }
    // gems in veins, and boulders, each in the ground (never in a room's walls)
    const diggable = i => mat[i] >= SOIL && mat[i] <= SHALE;
    for (const q of byKind(44)) for (let k = 0; k < q.v; k++) { const c = q.x + Math.floor(rand() * (q.w + 2)) - 1, r = q.y + Math.floor(rand() * (q.h + 2)) - 1;
      if (inside(c, r) && r > surf0[c] + 1 && diggable(at(c, r))) gem[at(c, r)] = 1 + Math.floor(rand() * 5); }
    // stones in the soil, the clay and the sand, below the turf
    // (by a chance of their own, so the rest of the world comes out as it did before them)
    { const sr = seededR(S.seed * 31 + 5); for (let c = 0; c < WW; c++) for (let r = surf0[c] + 1; r < WH; r++) { const i = at(c, r), m = mat[i]; if (gem[i] || !(m === SOIL || m === CLAY || m === SAND)) continue;
      if (sr(i) < (m === SAND ? 0.13 : m === SOIL ? 0.09 : 0.05)) stone[i] = 1 + Math.floor(sr(i + NN) * 250); } }
    S.boulders = [];
    for (const q of byKind(45)) { const c = q.x, r = q.y, i = inside(c, r) ? at(c, r) : -1;
      if (i >= 0 && r > surf0[c] + 1 && diggable(i) && inside(c, r + 1) && diggable(at(c, r + 1))) { mat[i] = AIR; bg[i] = B_DUG; gem[i] = 0; S.boulders.push({ c, r, oy: 0, wob: -1, falling: false }); } }
    // the water: below the table, the ground full; above it, damp; near a river, the table up to the river; caves under it full
    for (let c = 0; c < WW; c++) {
      let t = lerp(p.table, c, 16);
      for (const R of S.rivers) { const d = c < R.x ? R.x - c : c >= R.x + R.w ? c - (R.x + R.w - 1) : 0; if (d < 40) t = Math.min(t, R.level + d / 3); }
      for (let r = 0; r < WH; r++) { const i = at(c, r), m = mat[i];
        if (m === AIR) { if (r >= t && r > surf0[c]) wat[i] = 1; continue; }
        if (PORES[m] > 0 && wat[i] === 0) wat[i] = r >= t ? 1 : r < surf0[c] + 1 ? 0.3 : m === SAND ? 0.15 : 0.3; }
    }
    // (0.0.95) the super digger, deep: on the floor of the deepest cave in the limestone, which the good digger digs into; with no
    // cave, in a pocket in a body of granite near the bedrock
    { let best = -1; for (let i = 0; i + WW < NN; i++) if (bg[i] === B_CAVE && mat[i] === AIR && mat[i + WW] !== AIR) best = i;
      if (best < 0) { const c0 = Math.floor(WW * 0.62), r0 = WH - 11;
        for (let c = c0 - 4; c <= c0 + 4; c++) for (let r = r0 - 3; r <= r0 + 3; r++) { const i = at(c, r); mat[i] = GRANITE; bg[i] = B_NONE; wat[i] = 0; gem[i] = 0; stone[i] = 0; root[i] = 0; shape[i] = 0; }
        for (let c = c0 - 1; c <= c0 + 1; c++) for (let r = r0 - 1; r <= r0; r++) { const i = at(c, r); mat[i] = AIR; bg[i] = B_CAVE; }
        best = at(c0, r0); }
      const c = best % WW, r = (best - c) / WW; S.items.push({ kind: "super", x: c + 0.5, y: r + 0.45, taken: false }); }
    for (const R of S.rivers) holdRiver(R);
    for (let c = 0; c < WW; c++) top[c] = topOf(c);
    S.dry = []; for (let i = 0; i < NN; i++) if (mat[i] === AIR && (bg[i] === B_PLASTER || bg[i] === B_WOOD || bg[i] === B_STAIR)) S.dry.push(i);
    // where things are, for the words at the top of the picture
    S.places = [
      ...S.rivers.map(R => ({ x0: R.x - 3, x1: R.x + R.w + 3, name: R.dam ? `${R.name} and the beavers' dam` : R.name })),
      ...S.greats.map(g => ({ x0: g.x - 9, x1: g.x + 9, name: g.kind === 31 ? "the stair tree" : "a great tree, its ladders" })),
      ...S.villages.map(v => ({ x0: v.x0 - 2, x1: v.x1 + 2, name: v.which ? "the hamlet" : "the gnomes' village", under: true })),
    ];
    const g0 = { x: 12500, y: top[12] * 1000 };
    S.start = g0;
    S.g = { x: g0.x, y: g0.y, vx: 0, vy: 0, face: 1, ground: true, climb: false, swim: false, under: false, air: 600, gear: false, tool: 0, dc: -1, dr: -1, dt: 0, ev: 0 };
    // (Matthew: "let's have the upper left HUD show the total gems X / Y") this world's gems: how many there are, and found so far
    S.gemTotal = 0; for (let i = 0; i < NN; i++) if (gem[i]) S.gemTotal++; S.found = 0; S.party = null; S.confetti = [];
    // (0.0.101; Matthew: "let's put hearts in the world that re-generate --- maybe in one room per gnome house"; "each heart
    // re-charges the heart meter by one heart") a heart in each gnomes' home: in the kitchen of the village and of the hamlet, and
    // in each tree house, toward the limb's end (the climbing pack lies toward the trunk); one taken comes back once its place is
    // out of sight
    S.heartItems = [];
    for (const v of S.villages) { const mine = S.rooms.filter(R => R.x >= v.x0 && R.x < v.x1), R = mine.find(R => R.kind === 1) || mine[0];
      if (R) S.heartItems.push({ x: R.x + R.w * 0.5, y: R.y + 3.3, taken: false }); }
    for (const hs of S.houses) if (!hs.small) S.heartItems.push({ x: hs.x + 0.5 + hs.side * 0.6, y: hs.row - 0.55, taken: false });
    S.works = new Map(); S.hearts = 5; S.cam.set = false; S.smoke = []; S.parts = []; S.pebbles = []; S.piles = []; S.fallen = []; S.talk = null; rootChunks.clear(); S.minimapAt = -1e9; S.rain = 0; S.rainAt = S.frame + 60 * 60; S.banner = { text: "🌍 Gnome world", t: performance.now() };
  }
  const riverAt = x => S.rivers.find(R => x >= R.x - 0.5 && x < R.x + R.w + 0.5) || null;
  const topOf = c => { for (let r = 0; r < WH; r++) if (mat[at(c, r)] !== AIR) return r; return WH; };
  // (a dam's river at the height its logs hold it: World.water_row)
  function setLevel(h, R) { R.level = R.dam ? h.water_row(R.natural, R.bank, R.dam.logs) : R.natural; }
  function holdRiver(R) {
    for (let k = 0; k < R.w; k++) { const c = R.x + k; for (let r = Math.min(R.level, R.natural) - 4; r < R.bed[k]; r++) { if (r < 0) continue; const i = at(c, r);
      if (mat[i] === AIR && bg[i] === B_NONE) wat[i] = r >= R.level ? 1 : 0; } }
  }
  // a village: its rooms (World.village), walls of masonry round each, a timber floor, doorways between, the stair down from a
  // door on the hill, the things in each room (World.furnish), a lamp in each, and its chimneys and shafts up to the meadow
  function village(h, q, which, seed) {
    const rooms = h.village(q.x, q.y, which, seed), x0 = q.x;
    const set = (c, r, m, b) => { if (!inside(c, r)) return; const i = at(c, r); mat[i] = m; if (b != null) bg[i] = b; wat[i] = 0; gem[i] = 0; root[i] = 0; stone[i] = 0; shape[i] = 0; };
    let bottom = 0;
    for (const R of rooms) { bottom = Math.max(bottom, R.y + 4);
      for (let c = R.x - 1; c <= R.x + R.w; c++) for (let r = R.y - 1; r <= R.y + 4; r++) { const i = at(c, r); if (bg[i] !== B_PLASTER && bg[i] !== B_WOOD) set(c, r, r === R.y + 4 ? TIMBER : MASON); }
      for (let c = R.x; c < R.x + R.w; c++) for (let r = R.y; r < R.y + 4; r++) set(c, r, AIR, [5, 10, 2, 12].includes(R.kind) ? B_WOOD : B_PLASTER);
      R.things = h.furnish(R.kind, R.w);
      S.lamps.push({ x: R.x + R.w / 2, y: R.y + 0.7, r: 5.5 });
      S.rooms.push(R); }
    // doorways: between rooms side by side on a floor, and from the stair into each floor's first room
    for (const R of rooms) { for (const o of rooms) if (o !== R && o.y === R.y && o.x === R.x + R.w + 1) for (let r = R.y + 1; r < R.y + 4; r++) { set(R.x + R.w, r, AIR, B_PLASTER); fix[at(R.x + R.w, r)] = F_DOOR; }
      if (R.x === x0 + 3) for (let r = R.y + 1; r < R.y + 4; r++) { set(x0 + 2, r, AIR, B_PLASTER); fix[at(x0 + 2, r)] = F_DOOR; } }
    // the stair: two columns, a ladder, walls of masonry, from the hatch in the hill down to the lowest floor
    const s0 = Math.min(surf0[x0], surf0[x0 + 1]);
    for (let r = s0 - 1; r < bottom; r++) { for (const c of [x0 - 1, x0 + 2]) { const i = at(c, r); if (r >= s0 && fix[i] !== F_DOOR) set(c, r, MASON); }
      for (const c of [x0, x0 + 1]) { set(c, r, AIR, r >= s0 ? B_STAIR : B_NONE); fix[at(c, r)] = r === s0 ? F_HATCH : F_LADDER; } }
    for (const c of [x0 - 1, x0, x0 + 1, x0 + 2]) set(c, bottom, MASON);
    for (let c = x0 - 1; c <= x0 + 2; c++) surf0[c] = Math.max(surf0[c], s0);
    // chimneys (over the hearth or the stove), light shafts and air shafts, each a duct of masonry up through the ground
    for (const R of rooms) { if (!R.up) continue;
      const hearth = R.things.find(t => t.kind === 4 || t.kind === 5), cx = R.up === 3 && hearth ? R.x + Math.floor((hearth.at + hearth.w / 2) / 10) : R.x + Math.floor(R.w / 2) + (R.up === 2 ? 1 : 0);
      const top0 = surf0[cx];
      for (let r = top0; r < R.y; r++) { const i = at(cx, r); if (mat[i] !== AIR && bg[i] !== B_PLASTER && bg[i] !== B_WOOD) set(cx, r, MASON); }
      S.ducts.push({ kind: R.up, x: cx, y0: top0, y1: R.y, room: R });
      if (R.up === 1) S.lamps.push({ x: cx + 0.5, y: R.y + 1.5, r: 4.5, sun: true }); }
    // the diving gear, hung in the village's bath house (or its hall)
    if (which === 0) { const bath = rooms.find(R => R.kind === 7) || rooms[0]; S.items.push({ kind: "gear", x: bath.x + bath.w - 1.2, y: bath.y + 2.2, taken: false }); }
    // (Matthew: "let's give more power ups in gnome world: * good digger * super digger") the good digger, leaning in the hamlet's
    // workshop (with no hamlet, the village's: placed once the villages are laid out)
    if (which === 1) { const ws = rooms.find(R => R.kind === 4) || rooms[rooms.length - 1]; S.items.push({ kind: "good", x: ws.x + 0.9, y: ws.y + 3.2, taken: false }); }
    S.villages.push({ which, x0, x1: Math.max(...rooms.map(R => R.x + R.w)), top: s0, bottom });
  }
  // a great tree: its limbs (World.limbs), a platform out along each, a ladder up its trunk (30) or a stair inside it (31), the
  // houses at the limbs' ends; on the stair tree, rope bridges out to a tall tree beside it, a platform and a house on that
  function greatTree(h, q) {
    const foot = surf0[q.x], limbs = h.limbs(q.kind, q.h, q.v), half = q.kind === 31 ? 2 : 1;
    const G = { kind: q.kind, x: q.x, foot, h: q.h, limbs, half, v: q.v };
    const highest = Math.max(...limbs.map(l => l.y));
    for (let r = foot - highest - 1; r < foot; r++) for (let c = q.x - (q.kind === 31 ? 1 : 0); c <= q.x + (q.kind === 31 ? 1 : 0); c++) if (inside(c, r) && mat[at(c, r)] === AIR) fix[at(c, r)] = q.kind === 31 ? F_STAIR : F_LADDER;
    for (const L of limbs) { const row = foot - L.y;
      for (let k = half; k <= half + L.len; k++) { const c = q.x + L.side * k; if (inside(c, row) && mat[at(c, row)] === AIR && !fix[at(c, row)]) fix[at(c, row)] = F_PLAT; }
      const end = q.x + L.side * (half + L.len - 1.6);
      if (L.house >= 0 && L.house < 100) S.houses.push({ style: L.house, x: end, row, side: L.side });
      else if (L.house >= 100) S.houses.push({ style: L.house, x: q.x + L.side * (half + L.len - 0.6), row, side: L.side, small: true });
      if (L.bridge) { const cx = q.x + L.side * (half + L.len + 8);
        if (cx > 3 && cx < WW - 4 && !riverAt(cx) && !riverAt(cx - 2) && !riverAt(cx + 2)) {
          for (let k = half + L.len + 1; k < half + L.len + 7; k++) { const c = q.x + L.side * k; if (inside(c, row) && mat[at(c, row)] === AIR) fix[at(c, row)] = F_BRIDGE; }
          for (let c = cx - 2; c <= cx + 2; c++) if (inside(c, row) && mat[at(c, row)] === AIR) fix[at(c, row)] = F_PLAT;
          const a = q.x + L.side * (half + L.len), b = q.x + L.side * (half + L.len + 6);
          S.bridges.push({ x0: Math.min(a, b) + (L.side > 0 ? 1 : 0), x1: Math.max(a, b) + (L.side > 0 ? 1 : 0), row });
          S.trees.push({ x: cx, kind: 0, h: L.y + 6, alive: true, grow: 1, fallAt: 0, regrow: 0, seed: cx * 7, tall: true, keep: true });
          S.houses.push({ style: (q.v + L.y) % 16, x: cx, row, side: L.side }); } } }
    for (const hs of S.houses) if (!hs.small && !hs.things) hs.things = h.furnish(HOUSE_ROOM[hs.style % 16], 4);
    S.greats.push(G);
  }

  // ---- the water, a step: down first (from the bottom up, so a step moves it at most a tile), as fast as the slower of the two
  // grounds lets it, four times as fast where roots are, and never the share that clings; then across, where the tile below is
  // full or holds water back: toward the drier side, the ground giving water to a tunnel only when nearly full itself. The
  // rivers held at their level; now and then a shower over the land; a little drying at the surface
  let sweep = 1, wetFrom = 0;
  function waterStep() {
    // (0.0.102: no water lies higher than a row over the land's highest tile, where the rain falls: the rows of sky above skipped)
    if (S.frame % 60 === 0 || !wetFrom) { let m = WH; for (let c = 0; c < WW; c++) if (top[c] < m) m = top[c]; wetFrom = Math.max(0, m - 3); }
    for (let r = WH - 2; r >= wetFrom; r--) { const base = r * WW;
      for (let c = 0; c < WW; c++) { const a = base + c, wa = wat[a]; if (wa <= 0.0005) continue;
        const ma = mat[a], pa = PORES[ma]; if (pa === 0) continue;
        const b = a + WW, mb = mat[b], pb = PORES[mb]; if (pb === 0) continue;
        const free = (wa - CLING[ma]) * pa; if (free <= 0) continue;
        const room = (1 - wat[b]) * pb; if (room <= 0.0001) continue;
        const k = Math.min(1, Math.min(FLOW[ma], FLOW[mb]) * (root[a] ? 1 + root[a] * 1.5 : 1));
        const qv = Math.min(free * k, room);
        wat[a] -= qv / pa; wat[b] += qv / pb; } }
    sweep = -sweep;
    for (let r = wetFrom; r < WH - 1; r++) { const base = r * WW;
      for (let n = 0; n < WW; n++) { const c = sweep > 0 ? n : WW - 1 - n, a = base + c, wa = wat[a]; if (wa <= 0.002) continue;
        const ma = mat[a], pa = PORES[ma]; if (pa === 0) continue;
        const b = a + WW; if (PORES[mat[b]] > 0 && wat[b] < 0.98) continue;
        for (let side = 0; side < 2; side++) { const d = side ? -sweep : sweep, c2 = c + d; if (c2 < 0 || c2 >= WW) continue;   // (0.0.102: no array made for each tile: 80,000 a step in the bigger world)
          const n2 = base + c2, mn = mat[n2], pn = PORES[mn]; if (pn === 0) continue;
          const sn = wat[n2]; if (sn >= wat[a] - 0.01) continue;
          if (mn === AIR && ma !== AIR && wat[a] < 0.9) continue;
          const k = Math.min(1, Math.min(FLOW[ma], FLOW[mn]) * 0.5 * (root[a] ? 2 : 1));
          const qv = (wat[a] - sn) * Math.min(pa, pn) * 0.5 * k;
          wat[a] -= qv / pa; wat[n2] += qv / pn; } } }
    for (const R of S.rivers) holdRiver(R);
    // (Matthew: "The gnome's basement levels are flooded!") the villages' pumps: every room's and the stair's water drawn down a
    // little each step, as the gnomes' hand pumps at the stair's foot lift it up and out to the meadow
    for (const i of S.dry) if (wat[i] > 0) wat[i] = Math.max(0, wat[i] - 0.004);
    // a shower now and then (fourteen seconds, every two minutes or so), and drying at the surface
    const now = S.frame;
    if (!S.rain && now > S.rainAt) { S.rain = 14 * 60; S.rainAt = now + (100 + Math.floor(rand() * 80)) * 60; }
    if (S.rain) { S.rain--; for (let n = 0; n < 24; n++) { const c = Math.floor(rand() * WW), r = top[c]; if (r >= WH || r > surf0[c] + 2) continue; const i = at(c, r);
      if (PORES[mat[i]] > 0) wat[i] = Math.min(1, wat[i] + 0.06); else if (r > 0 && mat[at(c, r - 1)] === AIR) wat[at(c, r - 1)] = Math.min(1, wat[at(c, r - 1)] + 0.03); } }
    if (now % 30 === 0) for (let c = 0; c < WW; c++) { const r = top[c]; if (r >= WH) continue; const i = at(c, r); if (PORES[mat[i]] > 0 && wat[i] > 0.25) wat[i] -= 0.004;
      if (r > 0) { const j = at(c, r - 1); if (wat[j] > 0 && wat[j] < 0.2 && !riverAt(c)) wat[j] = Math.max(0, wat[j] - 0.01); } }
  }

  // ---- the gnome's step, in Hazel (World.step): the tiles round it, packed three to a number, each what is there, water, and
  // whether it can be climbed
  // (a tile within a standing tree, its trunk or its crown, or a great tree's: where the pack lets the gnome climb)
  // (Matthew: "we need more precise tree picking logic", the gnome with the pack climbing in the open sky over a crown) Where
  // the pack lets the gnome climb: the tiles a big tree's wood and leaves are in, worked out from the very limbs it is drawn
  // with (greatCrown, tallCrown, grown in tiles): its trunk, each limb (as wide as it is, and a little more), and each leaf pad
  // at the limbs' ends and inner forks (a flattened oval, a tile either side and half a tile up and down); a great tree's
  // trunk up to its crown. Not the sky over it, nor between its limbs where no leaves are; not the trees behind
  function buildTreeMask() {
    treeMask.fill(0);
    const mark = (c, r) => { if (inside(c, r) && mat[at(c, r)] === AIR) treeMask[at(c, r)] = 1; };
    const lay = (L, ox, oy) => {
      for (const sg of L.segs) { const len = Math.hypot(sg.P[3][0] - sg.P[0][0], sg.P[3][1] - sg.P[0][1]) * 1.15, n = Math.max(2, Math.ceil(len / 0.2));
        for (let i = 0; i <= n; i++) { const t = i / n, [x, y] = cubicAt(sg.P, t), rad = (sg.w0 + (sg.w1 - sg.w0) * t) / 2 + 0.2, X = ox + x, Y = oy + y;
          for (let c = Math.floor(X - rad); c <= Math.floor(X + rad); c++) for (let r = Math.floor(Y - rad); r <= Math.floor(Y + rad); r++) mark(c, r); } }
      for (const [x, y] of [...L.tips, ...L.mids]) { const X = ox + x, Y = oy + y + 0.15;
        for (let c = Math.floor(X - 1.2); c <= Math.floor(X + 1.2); c++) for (let r = Math.floor(Y - 0.8); r <= Math.floor(Y + 0.8); r++) {
          const dx = (c + 0.5 - X) / 1.2, dy = (r + 0.5 - Y) / 0.75; if (dx * dx + dy * dy <= 1) mark(c, r); } } };
    for (const G of S.greats) { lay(greatCrown(G, 1), G.x + 0.5, G.foot);
      for (let r = G.foot - Math.ceil(G.h * 0.74) - 1; r < G.foot; r++) for (let c = G.x - G.half; c <= G.x + G.half; c++) mark(c, r); }
    for (const t of S.trees) if (t.tall) lay(tallCrown(t, t.h * 1.45, 1), t.x + 0.5, surf0[t.x]);
  }
  const treeAt = (c, r) => inside(c, r) && treeMask[at(c, r)] === 1;
  const boulderAt = (c, r) => S.boulders.some(b => b.c === c && (b.r === r || (b.falling && b.oy > 0 && b.r + 1 === r)));
  function code(c, r) {
    if (!inside(c, r)) return 8;   // (0.0.95: masonry, which nothing digs; it was granite, which the diggers dig)
    const i = at(c, r), m = mat[i];
    if (m !== AIR) return m + 64 * shape[i];
    // (what is there, its water and whether it can be climbed, each worked out apart and then added: a platform across a tree's
    // trunk stays climbable with the pack; it had lost its climbing to the platform, and the gnome stuck under it)
    const what = boulderAt(c, r) ? 10 : fix[i] === F_PLAT || fix[i] === F_BRIDGE || fix[i] === F_HATCH ? 11 : 0;
    const climb = fix[i] === F_LADDER || fix[i] === F_STAIR || fix[i] === F_HATCH || bg[i] === B_DUG || (!!S.g && !!S.g.climbPack && what !== 10 && treeAt(c, r));
    return what + (wat[i] >= 0.5 ? 16 : 0) + (climb ? 32 : 0);
  }
  function near(g) {
    const cx = Math.floor(g.x / 1000), cy = Math.floor((g.y - 1) / 1000), row = r => code(cx - 1, r) + 512 * code(cx, r) + 262144 * code(cx + 1, r);
    return { cx, cy, r0: row(cy - 3), r1: row(cy - 2), r2: row(cy - 1), r3: row(cy), r4: row(cy + 1) };
  }
  function digOut(c, r) {
    const i = at(c, r), m = mat[i];
    if (m === AIR) return;
    // (Matthew: "when i dig sideways I should build reinforcements. and upwards in the ground should indicate stairs and
    // reinforcements too") Gnome dig's works: a tile dug along, a timber set in it and in the one the gnome stands in; a tile
    // dug up or down, a ladder in both, its rails against cribbing
    { const g = S.g, gc = Math.floor(g.x / 1000), gr = Math.floor((g.y - 1) / 1000), here = inside(gc, gr) ? at(gc, gr) : -1, up = c === gc && r !== gr;
      if (up) { S.works.set(i, "ladder"); if (here >= 0 && bg[here] === B_DUG) S.works.set(here, "ladder"); }
      else { if (!S.works.has(i)) S.works.set(i, "frame"); if (here >= 0 && bg[here] === B_DUG && !S.works.has(here)) S.works.set(here, "frame"); } }
    const water = wat[i] * PORES[m];
    mat[i] = AIR; bg[i] = B_DUG; wat[i] = water; shape[i] = 0; dirtyRootsAt(c, r);
    if (stone[i]) { dropStones(c, r, stone[i]); stone[i] = 0; }
    if (gem[i]) { S.gems++; keep("gems", S.gems); gemFound(); popWord("💎", c + 0.5, r + 0.3); if (SND) SND.gem(); gem[i] = 0; }
    else if (SND && S.frame - (S.digSndAt || 0) > 8) { SND.dig(); S.digSndAt = S.frame; }
    for (let k = 0; k < 7; k++) S.parts.push({ x: c + 0.5, y: r + 0.5, vx: (rand() - 0.5) * 0.12, vy: -rand() * 0.12, life: 30 + rand() * 20, col: COLOR[m] });
    if (r <= top[c]) top[c] = topOf(c);
    S.minimapAt = -1e9;
  }
  // (a sloped tile's ground, the triangle under its diagonal, as a path; and the height of its diagonal at a point across it)
  function slopeTri(c2, x, y, s, k) { c2.beginPath(); if (k === 1) { c2.moveTo(x, y + s + 0.5); c2.lineTo(x + s + 0.5, y); c2.lineTo(x + s + 0.5, y + s + 0.5); } else { c2.moveTo(x, y); c2.lineTo(x + s + 0.5, y + s + 0.5); c2.lineTo(x, y + s + 0.5); } c2.closePath(); }
  // (Matthew: "let's also do sloped banks, like Mario 3", "more realisitic, especially for creek and stream banks") Where the
  // land steps up or down by one tile, the corner of the higher ground is a sloped tile, ground only under its diagonal (shape
  // 1 sloping up to the east, 2 up to the west), and the gnome walks up and down it (World.step); a tree, a bush, a flower or a
  // toadstool on it stands on its diagonal, half a tile down (landY). Not under a great tree or a tall one, a village's door, a
  // lodge, a thing to be found or a dam; a river's bed slopes too, under the water; not a one-tile peak (both ways at once)
  const landY = c => surf0[c] + (inside(c, surf0[c]) && shape[at(c, surf0[c])] ? 0.5 : 0);
  function shapeSurface() {
    shape.fill(0);
    const busy = new Uint8Array(WW), mark = (x, d = 0) => { for (let c = Math.floor(x) - d; c <= Math.floor(x) + d; c++) if (c >= 0 && c < WW) busy[c] = 1; };
    for (const t of S.trees) if (t.tall) mark(t.x, 2); for (const G of S.greats) mark(G.x, G.half + 3); for (const v of S.villages) mark(v.x0 + 1, 3); for (const L of S.lodges) mark(L.x + L.w / 2, Math.ceil(L.w / 2) + 1);
    for (const it of S.items) mark(it.x); mark(S.start.x / 1000, 1); for (const d of S.dams) mark(d.at, 1);
    const ok = (c, r) => inside(c, r) && !busy[c] && mat[at(c, r)] >= SOIL && mat[at(c, r)] <= GRANITE && inside(c, r - 1) && mat[at(c, r - 1)] === AIR && !fix[at(c, r - 1)] && bg[at(c, r - 1)] === B_NONE;
    // (a bump one tile wide and one high cannot slope both ways: it is levelled first, its top tile taken away)
    for (let c = 1; c + 1 < WW; c++) if (surf0[c - 1] === surf0[c] + 1 && surf0[c + 1] === surf0[c] + 1 && ok(c, surf0[c]) && !gem[at(c, surf0[c])]) { const i = at(c, surf0[c]); mat[i] = AIR; stone[i] = 0; root[i] = 0; surf0[c]++; top[c] = topOf(c); }
    const want = new Map();
    for (let c = 0; c + 1 < WW; c++) { const a = surf0[c], b = surf0[c + 1];
      if (b === a - 1 && ok(c + 1, b)) { const i = at(c + 1, b); want.set(i, want.has(i) ? 3 : 1); }
      if (b === a + 1 && ok(c, a)) { const i = at(c, a); want.set(i, want.has(i) ? 3 : 2); } }
    for (const [i, v] of want) if (v !== 3) { shape[i] = v; stone[i] = 0; gem[i] = 0; }
  }
  // (a river's banks: the channel was cut straight down; each side is cut back now into a bank one tile down for each across,
  // from the edge of the bed up to the land, so it slopes into the water as a creek's bank does)
  function slopeBanks(R) {
    for (const [edge, dir, bed] of [[R.x - 1, -1, R.bed[0]], [R.x + R.w, 1, R.bed[R.w - 1]]]) {
      for (let j = 0; ; j++) { const c = edge + dir * j, want = bed - 1 - j; if (c < 0 || c >= WW || want <= surf0[c]) break;
        for (let r = surf0[c]; r < want; r++) { const i = at(c, r); mat[i] = AIR; bg[i] = B_NONE; gem[i] = 0; }
        surf0[c] = want; }
    }
  }
  // (Matthew: "let's have rocks in the earth -- like the creatures in the earth, except totally immobile; they just fall when we
  // dig out that earth. They become a mixture of foreground and background piles in the result tile") Stones set in the soil,
  // the clay and the sand (more in gravelly sand, fewer in clay), one to three in a tile, rounded, grey and brown, each sunk in
  // its earth (a dark rim round it, its top lit). Dig the tile out and its stones drop, falling faster and faster (slower in
  // water) to the floor below them, earth or a plank or a bridge, a little bounce, and lie there, heaped, each settling on
  // those already there; some at the back of the hole (drawn before the gnome, darker) and some at the front (after it, so the
  // gnome goes behind them); dig the floor away and the heap falls on
  const STONE_COLS = ["#8f8a80", "#a39a86", "#7d7468", "#9c8a72", "#b5ab98", "#6f675c", "#8a7a66"];
  const stoneShape = v => { const r = seededR(v * 13 + 7), n = 7, pts = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, rr = 0.75 + 0.3 * r(k); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * (0.62 + 0.2 * r(20))]); } return { pts, col: STONE_COLS[Math.floor(r(30) * STONE_COLS.length)] }; };
  function stonePath(c, x, y, rad, v) { const S2 = stoneShape(v); c.beginPath(); S2.pts.forEach(([px, py], k) => { const X = x + px * rad, Y = y + py * rad; k ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath(); return S2.col; }
  function drawStone(c, x, y, rad, v, set, dim) {
    const col = stonePath(c, x, y, rad, v); c.fillStyle = dim ? mixHex(col, "#1a120c", 0.38) : col; c.fill();
    if (set) { c.strokeStyle = "rgba(20,12,6,0.55)"; c.lineWidth = Math.max(1, rad * 0.22); c.stroke(); }
    c.fillStyle = dim ? "rgba(255,245,225,0.1)" : "rgba(255,245,225,0.3)"; c.beginPath(); c.ellipse(x + rad * 0.2, y - rad * 0.25, rad * 0.38, rad * 0.16, -0.3, 0, 7); c.fill();
    c.fillStyle = "rgba(0,0,0,0.18)"; c.beginPath(); c.ellipse(x - rad * 0.1, y + rad * 0.3, rad * 0.55, rad * 0.14, 0, 0, Math.PI); c.fill();
  }
  const stonesIn = v => { const r = seededR(v * 5 + 1), n = 1 + (v % 3), out = []; for (let k = 0; k < n; k++) { const rad = (n === 1 ? 0.2 : 0.13) + 0.09 * r(k * 3 + 2); out.push({ dx: rad + (1 - 2 * rad) * (n === 1 ? 0.5 + 0.3 * (r(k * 3) - 0.5) : (k + 0.5) / n), dy: rad + (1 - 2 * rad) * r(k * 3 + 1), rad, v: v * 7 + k }); } return out; };
  // (a tile's stones, set in it, drawn once for each look and size: a picture a tile square)
  const stoneTiles = new Map();
  function stoneTile(v) { const key = v + ":" + T + (LINE ? ":line" : ""); let cv = stoneTiles.get(key); if (cv) return cv;
    if (stoneTiles.size > 400) stoneTiles.clear(); cv = document.createElement("canvas"); cv.width = cv.height = Math.ceil(T); const c = cv.getContext("2d");
    const c2 = LINE ? lineCtx(c) : c; for (const st of stonesIn(v)) drawStone(c2, st.dx * T, st.dy * T, st.rad * T, st.v, true, false); stoneTiles.set(key, cv); return cv; }
  function dropStones(c, r, v) {
    for (const st of stonesIn(v)) S.pebbles.push({ x: c + st.dx, y: r + st.dy + st.rad * 0.6, vy: 0, vx: (st.dx - 0.5) * 0.01, rad: st.rad, v: st.v, front: seededR(st.v)(9) < 0.4, rest: false });
  }
  const floorAt = (c, r) => !inside(c, r) || mat[at(c, r)] !== AIR || fix[at(c, r)] === F_PLAT || fix[at(c, r)] === F_BRIDGE || fix[at(c, r)] === F_HATCH || boulderAt(c, r);
  function pebblesStep() {
    if (!S.pebbles || !S.pebbles.length) return;
    for (const p of S.pebbles) { const c = Math.floor(p.x);
      // (Matthew: "fallen rock keeps oscillating after reaching bottom surface": one lying on the others checked the open tile it lay in,
      // and fell, and landed, over and over) lying still until the floor it lies over is dug away
      if (p.rest) { if (S.frame % 8 === 0 && !floorAt(c, p.floor ?? Math.floor(p.y + 0.02))) p.rest = false; else continue; }
      const wet = inside(c, Math.floor(p.y)) && wat[at(c, Math.floor(p.y))] >= 0.5;
      p.vy = Math.min(wet ? 0.04 : 0.45, p.vy + (wet ? 0.004 : 0.012)); p.y += p.vy; p.x = Math.max(c + p.rad, Math.min(c + 1 - p.rad, p.x + p.vx));
      // (landing: on the stones already lying there, as it reaches the top of the heap, rolling a little off to one side; else on
      // the floor. It had been put back on top of the heap only once it reached the floor, half a tile on, and fell again, and
      // bounced, for ever: Matthew, "same bug")
      const fr = Math.floor(p.y); let land = null, under = null;
      for (const o of S.pebbles) if (o !== p && o.rest && Math.floor(o.x) === c && Math.abs(o.x - p.x) < (o.rad + p.rad) * 0.9) { const s2 = o.y - o.rad * 1.1;
        if (p.y >= s2 && p.y - p.vy <= s2 + 0.002 && (land === null || s2 < land)) { land = s2; under = o; } }
      if (land === null && floorAt(c, fr)) land = fr;
      if (land === null) continue;
      if (under) p.x = Math.max(c + p.rad, Math.min(c + 1 - p.rad, p.x + (p.x < under.x ? -1 : 1) * p.rad * 0.4 * (seededR(p.v)(3) + 0.3)));
      p.y = land; if (p.vy > 0.12) { p.vy = -p.vy * 0.25; p.y -= 0.01; } else { p.vy = 0; p.rest = true; p.vx = 0; p.floor = under ? under.floor ?? fr : fr; } }
  }
  function drawPebbles(front, c0, c1, r0, r1) {
    if (!S.pebbles) return; const s = T;
    for (const p of S.pebbles) { if (p.front !== front || p.x < c0 - 1 || p.x > c1 + 1 || p.y < r0 - 1 || p.y > r1 + 2) continue;
      const k = front ? 1 : 0.82; drawStone(ctx, p.x * s, (p.y - p.rad * 0.55 * k) * s, p.rad * k * s, p.v, false, !front); }
  }
  // (Matthew: "I should be able to build a bridge out of any pit") 🪵, B: standing at the edge of a pit or of the water, a plank
  // laid ahead at the gnome's own level, a bridge across, a plank a press; else, in a pit (or in its water), a ladder up the
  // gnome's own column, two rungs a press, to climb out by
  function buildHere() {
    const g = S.g; if (!g || S.faintAt) return;
    const c = Math.floor(g.x / 1000), stand = Math.floor(g.y / 1000), feet = Math.floor((g.y - 1) / 1000), ahead = c + g.face;
    const open = (cc, rr) => inside(cc, rr) && mat[at(cc, rr)] === AIR && !fix[at(cc, rr)] && !boulderAt(cc, rr);
    if (g.ground && open(ahead, stand)) { fix[at(ahead, stand)] = F_PLAT; S.works.set(at(ahead, stand), "plank"); popWord("🪵", ahead + 0.5, stand - 0.4); if (SND) SND.land(); return; }
    let n = 0;
    for (let r = feet; r > feet - 6 && n < 2; r--) { if (!inside(c, r) || mat[at(c, r)] !== AIR) break; if (!fix[at(c, r)]) { fix[at(c, r)] = F_LADDER; n++; } }
    if (n) { popWord("🪜", c + 0.5, feet - 1); if (SND) SND.land(); }
  }
  const words = [];
  const popWord = (t, x, y) => words.push({ t, x, y, at: performance.now() });
  function hurt(why) {
    if (performance.now() - S.hurtAt < 1500) return;
    S.hurtAt = performance.now(); S.hearts--; if (SND) SND.caught();
    popWord(why, S.g.x / 1000, S.g.y / 1000 - 1.6);
    if (S.hearts <= 0) { S.faintAt = performance.now(); S.banner = { text: "💫 The gnome fainted, and wakes up back home", t: performance.now() }; }
  }
  // ---- (Matthew: "let's do a speed run where we acquire each item and them run over each tree, and tunnel around in the
  // water to get every gem"; "every part of the foreground trees, like a DFS search would do") 🏃 The speed run: the gnome
  // plays the world by itself, as fast as the page can step it, only through the keys, each step Hazel's (World.step): first
  // each thing to be found, the nearest first; then every big tree, depth first: up its trunk, out along each limb to its
  // end and into its house, across each rope bridge to the tall tree and its platform, back, on up, into the crown; then every
  // gem, the nearest first, digging to it, swimming (with the gear) where the water is. Its way to each is found here, over the
  // tiles (a cheapest-path search, each move's cost the steps it takes); a target it cannot get to, after four tries, is left
  // and reported. (The search wants Hazel too: over the world's 57,344 tiles it waits on arrays, ticket 846)
  // (0.0.95) the things to find: each one's sign, its label over it, its name in the speed run, its banner when found
  const ITEM = {
    climb: { icon: "🧗", label: "🧗 tree-climbing pack", what: "🧗 the climbing pack", banner: "🧗 The tree-climbing pack: climb any tree, like a squirrel (↑)" },
    gear: { icon: "🤿", label: "🤿 diving gear", what: "🤿 the diving gear", banner: "🤿 The diving gear: breathe under the water as long as you like" },
    good: { icon: "⛏️", label: "⛏️ good digger", what: "⛏️ the good digger", banner: "⛏️ The good digger: tough ground goes faster, and limestone and granite give way" },
    super: { icon: "⚒️", label: "⚒️ super digger", what: "⚒️ the super digger", banner: "⚒️ The super digger: three times as fast, through anything, even the bedrock" },
    carrot: { icon: "🥕", label: "🥕 carrot", what: "🥕 a carrot", banner: "🥕 A carrot! Clover the rabbit 🐇 would love it: go and see her, and press R" },
  };
  const BOT = { on: false, phase: "", queue: [], cur: null, path: [], k: 0, lastCell: -1, still: 0, tries: 0, skipped: [], frames: 0, t0: 0, items: 0, parts: 0, partsAll: 0, gems: 0, gemsAll: 0, report: null };
  const dist = new Float64Array(NN), prev = new Int32Array(NN), heapI = new Int32Array(NN * 8), heapD = new Float64Array(NN * 8);   // (64-bit: in 32, a cost a hair lower rounded back to the same, and two tiles went on "improving" each other until the search's limit)
  function botClimb(c, r) { const i = at(c, r); return fix[i] === F_LADDER || fix[i] === F_STAIR || fix[i] === F_HATCH || bg[i] === B_DUG || wat[i] >= 0.5 || (!!S.g.climbPack && treeAt(c, r)); }
  function botStand(c, r) { if (r + 1 >= WH) return true; const b = at(c, r + 1); return mat[b] !== AIR || fix[b] === F_PLAT || fix[b] === F_BRIDGE || fix[b] === F_HATCH || boulderAt(c, r + 1); }
  // (a tile's cost to go into: open, a step; ground that can be dug, its digging too; rock that cannot, a boulder: no way)
  function botEnter(c, r) { if (!inside(c, r)) return Infinity; const i = at(c, r), m = mat[i];
    if (m !== AIR) { const d = digSteps(m, r, S.g.tool); return d > 0 ? 1 + d / 11 : Infinity; }
    if (boulderAt(c, r)) return Infinity;
    if (wat[i] >= 0.5 && !S.g.gear) { const deep = r > 0 && wat[at(c, r - 1)] >= 0.5 && r > 1 && wat[at(c, r - 2)] >= 0.5; return deep ? 40 : 1.6; }
    return 1; }
  function botPlan(tc, tr, avoid) {
    const g = S.g, sc = Math.floor(g.x / 1000), sr = Math.floor((g.y - 1) / 1000), start = at(sc, sr), goal = at(tc, tr);
    dist.fill(Infinity); prev.fill(-1); dist[start] = 0; let n = 0;
    const push = (i, d) => { if (n >= heapI.length) return; let j = n++; while (j > 0) { const p = (j - 1) >> 1; if (heapD[p] <= d) break; heapI[j] = heapI[p]; heapD[j] = heapD[p]; j = p; } heapI[j] = i; heapD[j] = d; };
    const pop = () => { const top = heapI[0], last = heapI[--n], ld = heapD[n]; let j = 0; for (;;) { let k = 2 * j + 1; if (k >= n) break; if (k + 1 < n && heapD[k + 1] < heapD[k]) k++; if (heapD[k] >= ld) break; heapI[j] = heapI[k]; heapD[j] = heapD[k]; j = k; } heapI[j] = last; heapD[j] = ld; return top; };
    push(start, 0); let seen = 0;
    while (n > 0 && seen < NN * 2) { const di = heapD[0], i = pop(), c = i % WW, r = (i - c) / WW, d = dist[i];
      if (di > d) continue;   // (a stale entry: this tile was reached more cheaply since)
      seen++; if (i === goal) break;
      const climb = mat[i] === AIR && botClimb(c, r), stand = botStand(c, r), held = climb || stand || mat[i] !== AIR;
      const go = (c2, r2, extra) => { const e = botEnter(c2, r2); if (e === Infinity) return; const j = at(c2, r2); if (avoid && avoid.has(j)) return; const nd = d + e + extra; if (nd < dist[j]) { dist[j] = nd; prev[j] = i; push(j, nd); } };
      if (held) { go(c - 1, r, 0); go(c + 1, r, 0); }
      go(c, r + 1, 0);
      if (climb || (mat[at(c, r - 1)] !== AIR && held)) go(c, r - 1, 0.3);
      else if (stand) { go(c, r - 1, 1.5); for (const dx of [-1, 1]) if (inside(c + dx, r - 1) && mat[at(c, r - 1)] === AIR && botStand(c + dx, r - 1)) go(c + dx, r - 1, 1.8); } }
    if (!isFinite(dist[goal])) return null;
    const path = []; for (let i = goal; i !== start && i >= 0; i = prev[i]) path.push(i); path.reverse(); return path;
  }
  function botTargets(phase) {
    const g = S.g, gc = g.x / 1000, gr = g.y / 1000;
    if (phase === "items") { const left = S.items.filter(it => !it.taken).sort((a, b) => Math.hypot(a.x - gc, a.y - gr) - Math.hypot(b.x - gc, b.y - gr));
      // (the good digger before the super digger, which lies in rock that only a digger digs)
      const sup = left.findIndex(it => it.kind === "super"), good = left.findIndex(it => it.kind === "good"); if (sup >= 0 && good > sup) left.splice(good, 0, ...left.splice(sup, 1));
      return left.map(it => ({ c: Math.floor(it.x), r: Math.floor(it.y), what: ITEM[it.kind].what, item: it })); }
    if (phase === "trees") { const out = [];
      for (const G of [...S.greats].sort((a, b) => Math.abs(a.x - gc) - Math.abs(b.x - gc))) {
        const name = G.kind === 31 ? "the stair tree" : "a great tree";
        out.push({ c: G.x, r: G.foot - 1, what: `${name}: its foot`, part: true });
        for (const L of [...G.limbs].sort((a, b) => a.y - b.y)) { const row = G.foot - L.y - 1, end = G.x + L.side * (G.half + L.len - 1);
          out.push({ c: G.x + L.side * (G.half + 1), r: row, what: `${name}: limb ${L.y} m up`, part: true });
          out.push({ c: end, r: row, what: `${name}: the ${L.house >= 0 && L.house < 100 ? "house" : L.house >= 100 ? "bird house" : "end"} on limb ${L.y} m up`, part: true });
          const br = S.bridges.find(b => b.row === G.foot - L.y && (L.side > 0 ? b.x0 >= G.x : b.x1 <= G.x));
          if (br) { const far = L.side > 0 ? br.x1 + 2 : br.x0 - 3; out.push({ c: far, r: row, what: `${name}: across the rope bridge, the tall tree's house`, part: true }); out.push({ c: end, r: row, what: `${name}: back over the bridge`, part: true }); } }
        out.push({ c: G.x, r: G.foot - G.h + 2, what: `${name}: up into its crown`, part: true }); }
      return out; }
    if (phase === "gems") { const all = []; for (let i = 0; i < NN; i++) if (gem[i]) all.push(i); BOT.gemsAll = BOT.gemsAll || all.length;
      return all.map(i => ({ c: i % WW, r: Math.floor(i / WW), what: "💎 a gem", gemAt: i })); }
    return [];
  }
  function botNext() {
    const g = S.g, gc = Math.floor(g.x / 1000), gr = Math.floor((g.y - 1) / 1000);
    for (;;) {
      if (!BOT.queue.length) { const order = ["items", "trees", "gems"], i = order.indexOf(BOT.phase) + 1;
        if (i >= order.length) { botFinish(); return false; }
        BOT.phase = order[i]; BOT.queue = botTargets(BOT.phase); if (BOT.phase === "trees") BOT.partsAll = BOT.queue.length; continue; }
      if (BOT.phase === "gems") BOT.queue.sort((a, b) => Math.abs(a.c - gc) + Math.abs(a.r - gr) * 1.5 - Math.abs(b.c - gc) - Math.abs(b.r - gr) * 1.5);
      const t = BOT.queue.shift(); if (t.gemAt != null && !gem[t.gemAt]) continue; if (t.item && t.item.taken) continue;
      BOT.cur = t; BOT.tries = 0; BOT.avoid = new Set(); BOT.path = botPlan(t.c, t.r, null) || []; BOT.k = 0; BOT.still = 0;
      if (!BOT.path.length && !(gc === t.c && gr === t.r)) { BOT.skipped.push(t.what + ` (${t.c}, ${t.r})`); continue; }
      return true; }
  }
  function botFinish() {
    BOT.on = false; for (const k in S.keys) S.keys[k] = false;
    const secs = BOT.frames / 60, mm = Math.floor(secs / 60), ss = Math.round(secs % 60);
    BOT.report = { time: `${mm}:${String(ss).padStart(2, "0")}`, frames: BOT.frames, items: `${S.items.filter(i => i.taken).length}/${S.items.length}`, treeParts: `${BOT.parts}/${BOT.partsAll}`, gems: `${BOT.gems}/${BOT.gemsAll}`, skipped: BOT.skipped, realMs: Math.round(performance.now() - BOT.t0) };
    S.banner = { text: `🏃 Speed run: ${BOT.report.time} · ${BOT.report.items} things · ${BOT.report.treeParts} tree parts · 💎 ${BOT.report.gems}`, t: performance.now() };
    console.log("speed run", BOT.report); $("run").setAttribute("aria-pressed", "false");
  }
  // (each step of the run: the keys toward the next tile on the way; arrived, the next target; no headway for four seconds,
  // the way again round where it stuck, four times, then on to the next)
  function botStep() {
    if (S.ride && S.ride.on) { const M = S.mount; S.ride.on = false; M.x = S.g.x; M.y = S.g.y; }   // (0.0.102: the speed run is on foot)
    const g = S.g, gc = Math.floor(g.x / 1000), gr0 = Math.floor((g.y - 1) / 1000), gr = inside(gc, gr0) && shape[at(gc, gr0)] ? gr0 - 1 : gr0, here = at(gc, gr);
    for (const k in S.keys) S.keys[k] = false;
    if (!BOT.cur && !botNext()) return;
    const t = BOT.cur;
    const done = t.gemAt != null ? !gem[t.gemAt] : t.item ? t.item.taken : Math.abs(gc - t.c) <= 0 && Math.abs(gr - t.r) <= 0;
    if (done) { if (t.gemAt != null) BOT.gems++; else if (t.item) BOT.items++; else BOT.parts++; BOT.cur = null; return; }
    // (0.0.102; Matthew: "I noticed when I turn on the speed run feature the gnome gets 'stuck' on slopes") No headway is measured
    // by how far the gnome has gone, not by the tile it is in: on a slope its feet go in and out of the sloped tile, the tile
    // changed every step or two, and the run, never seen as stuck, never looked for another way
    // Headway: a step further along the way, a tile dug, or a tile and a half gone (rocking to and fro over a tile is none)
    { const px = g.x / 1000, py = g.y / 1000; if (!BOT.anchor || BOT.k > BOT.anchor.k || Math.hypot(px - BOT.anchor.x, py - BOT.anchor.y) > 1.5 || g.dt > 0) { BOT.anchor = { x: px, y: py, k: BOT.k }; BOT.still = 0; } else BOT.still++; }
    if (BOT.still > 240) { BOT.still = 0; BOT.tries++; const wp = BOT.path[BOT.k]; if (wp != null) BOT.avoid.add(wp);
      if (BOT.tries > 4) { BOT.skipped.push(t.what + ` (${t.c}, ${t.r})`); BOT.cur = null; return; }
      BOT.path = botPlan(t.c, t.r, BOT.avoid) || []; BOT.k = 0; if (!BOT.path.length) { BOT.skipped.push(t.what + ` (${t.c}, ${t.r})`); BOT.cur = null; return; } }
    for (let j = BOT.k; j < Math.min(BOT.path.length, BOT.k + 4); j++) if (BOT.path[j] === here) BOT.k = j + 1;
    if (BOT.anchor && BOT.k < BOT.anchor.k) BOT.anchor.k = BOT.k;   // (a new way: its steps counted from here)
    const wp = BOT.path[Math.min(BOT.k, BOT.path.length - 1)]; if (wp == null) { BOT.cur = null; return; }
    const wc = wp % WW, wr = (wp - wc) / WW;
    // (up: a jump from the ground, or out of the water from its surface, as a player would, onto a bank a tile higher; down on a
    // slope, the digger too: down alone slides down it)
    if (wr < gr) { S.keys.up = true; if (((g.ground && !botClimb(gc, gr)) || (g.swim && !g.under)) && mat[at(gc, gr - 1)] === AIR) S.jumpQueued = true; }
    else if (wr > gr && (wc === gc || !g.ground)) { if (!g.ground || Math.abs(g.vx) < 40) S.keys.down = true; if (g.ground && wc === gc && Math.abs(g.vx) < 40 && ((inside(gc, gr0) && shape[at(gc, gr0)]) || (inside(gc, gr0 + 1) && shape[at(gc, gr0 + 1)]))) S.keys.dig = true; }
    // (across: to a tile on the same row, run on; to stop over a tile to go down or up from, let go in time: let go, the gnome
    // slows by a quarter a step, so it goes on about three steps' worth of its speed, and it was running past the tile and back)
    const ex = wc + 0.5 - g.x / 1000, stopping = wr !== gr && g.ground && !g.climb && Math.abs(ex) < 2.5;
    if (!stopping) { if (wc > gc) S.keys.right = true; else if (wc < gc) S.keys.left = true; }
    else if (Math.abs(ex) > Math.abs(g.vx) * 3 / 1000 + 0.12 && Math.sign(ex) !== -Math.sign(g.vx || ex)) { if (ex > 0) S.keys.right = true; else S.keys.left = true; }
    else if (wc !== gc && Math.abs(g.vx) < 15) { if (ex > 0) S.keys.right = true; else S.keys.left = true; }
  }
  function gnomeStep(h) {
    if (S.ride && S.ride.on) { rideStep(h); return; }
    const k = S.keys, pad = { dx: (k.right ? 1 : 0) - (k.left ? 1 : 0), up: k.up, down: k.down, jump: S.jumpQueued, dig: !!k.dig };
    S.jumpQueued = false;
    const t0 = performance.now();
    const g = h.step(S.g, near(S.g), pad); if (S.g.climbPack) g.climbPack = true;
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 120) S.stepMs.shift();
    S.g = g;
    if (g.ev === 1 && g.dc >= 0) digOut(g.dc, g.dr);
    else if (g.ev === 3 && SND) SND.splash();
    else if (g.ev === 4) hurt("😵 out of breath");
    else if (g.ev === 5 && SND) SND.low();
    pickups();
  }
  function pickups() {
    const g = S.g;
    // (a gem lying loose in an open tile, as some came to: picked up as the gnome goes through it)
    { const c = Math.floor(g.x / 1000), r = Math.floor((g.y - 500) / 1000), i = inside(c, r) ? at(c, r) : -1;
      if (i >= 0 && gem[i] && mat[i] === AIR) { gem[i] = 0; S.gems++; keep("gems", S.gems); gemFound(); popWord("💎", c + 0.5, r + 0.3); if (SND) SND.gem(); } }
    // the diving gear, walked into
    for (const it of S.items) if (!it.taken && Math.abs(it.x - g.x / 1000) < 0.8 && Math.abs(it.y - (g.y / 1000 - 0.5)) < 1) { it.taken = true; if (SND) SND.gem();
      if (it.kind === "climb") S.g = { ...S.g, climbPack: true };
      else if (it.kind === "gear") S.g = { ...S.g, gear: true };
      else if (it.kind === "carrot") S.carrots = (S.carrots || 0) + 1;
      else S.g = { ...S.g, tool: Math.max(S.g.tool || 0, it.kind === "super" ? 2 : 1) };
      S.banner = { text: ITEM[it.kind].banner, t: performance.now() }; }
    // a heart, walked into, gives back one heart (not with all five: it stays for later)
    if (S.hearts < 5) for (const hh of S.heartItems || []) if (!hh.taken && Math.abs(hh.x - g.x / 1000) < 0.8 && Math.abs(hh.y - (g.y / 1000 - 0.5)) < 1) {
      hh.taken = true; S.hearts++; popWord("❤️", hh.x, hh.y - 0.7); if (SND) SND.gem(); if (S.hearts >= 5) break; }
  }
  // (Matthew: "is there a celebration when we get them all? what happens?") There was none. The last gem of the world found: a
  // banner, Gnome dig's fanfare and its party tune, the gnome cheering, and its party: a burst of confetti, stars and bubbles
  // round the gnome, fountains of them from the corners of the view for half a minute, then the music as it was
  function gemFound() {
    S.found = (S.found || 0) + 1;
    if (S.gemTotal && S.found === S.gemTotal) { S.party = { t: performance.now(), burst: false };
      S.banner = { text: `🎉 Every gem in the world: ${S.found} of ${S.gemTotal}! 💎`, t: performance.now() + 2500 };
      if (SND) { SND.cleared(); if (SND.musicOn) SND.celebrate(); } }
  }
  const PARTY = ["#f43f5e", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#818cf8", "#e879f9", "#ffffff"];
  function spray(n, x, y, vx0, vy0, spread) {
    for (let i = 0; i < n && S.confetti.length < 500; i++) { const k = Math.random();
      S.confetti.push({ kind: k < 0.62 ? 0 : k < 0.86 ? 1 : 2, x, y, vx: vx0 + (Math.random() - 0.5) * spread, vy: vy0 - Math.random() * spread * 0.6, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 14, col: PARTY[Math.floor(Math.random() * PARTY.length)], z: 0.12 + Math.random() * 0.12, ph: Math.random() * 6.3, t: 0 }); }
  }
  function drawParty(s, now) {
    const P = S.party; if (!P && !(S.confetti && S.confetti.length)) return; const c = ctx, dt = Math.min(0.05, (now - (S.partyAt || now)) / 1000); S.partyAt = now;
    if (P) { const age = now - P.t, g = S.g, L = S.cam.x, B = S.cam.y + VH;
      if (!P.burst) { P.burst = true; spray(140, g.x / 1000, g.y / 1000 - 1, 0, -9, 11); }
      if (age < 30000) { const rate = age < 4000 ? 1 : 0.4; if (Math.random() < 0.7 * rate) spray(1, L + 0.6, B - 0.3, 6, -14, 3); if (Math.random() < 0.7 * rate) spray(1, L + VW - 0.6, B - 0.3, -6, -14, 3);
        if (Math.random() < 0.25 * rate && S.confetti.length < 500) S.confetti.push({ kind: 2, x: L + Math.random() * VW, y: B, vx: 0, vy: -1.8 - Math.random(), rot: 0, vr: 0, col: "#e0f2fe", z: 0.1 + Math.random() * 0.12, ph: Math.random() * 6.3, t: 0 }); }
      else { S.party = null; if (SND && SND.musicOn) { if (SND.play) SND.play(musicNow()); else SND.tune(0); } } }
    const keep = [];
    for (const p of S.confetti) { p.t += dt;
      if (p.kind === 2) { p.vy = Math.max(p.vy - 0.6 * dt, -2.8); p.x += (p.vx + Math.sin(p.t * 3 + p.ph) * 0.5) * dt; p.y += p.vy * dt; }
      else { p.vy = Math.min(p.vy + 11 * dt, p.kind === 0 ? 2.6 : 4.5); p.vx *= 1 - 1.2 * dt; p.x += (p.vx + (p.kind === 0 ? Math.sin(p.t * 5 + p.ph) * 0.6 : 0)) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
      if (p.t > 8 || p.y > S.cam.y + VH + 2 || p.y < S.cam.y - 3) continue;
      keep.push(p); const x = p.x * s, y = p.y * s, z = p.z * s;
      if (p.kind === 0) { c.save(); c.translate(x, y); c.rotate(p.rot); c.scale(1, Math.cos(p.t * 9 + p.ph)); c.fillStyle = p.col; c.fillRect(-z, -z * 0.45, z * 2, z * 0.9); c.restore(); }
      else if (p.kind === 1) { const tw = 0.75 + 0.25 * Math.sin(p.t * 14 + p.ph); c.fillStyle = p.col === "#ffffff" ? "#fef08a" : p.col; c.beginPath();
        for (let i = 0; i < 10; i++) { const a = p.rot + i * Math.PI / 5, r = (i % 2 ? 0.45 : 1.15) * z * tw; if (i) c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); }
      else { c.strokeStyle = "rgba(224,242,254,0.85)"; c.lineWidth = Math.max(1, s * 0.03); c.beginPath(); c.arc(x, y, z * 1.6, 0, 7); c.stroke(); } }
    S.confetti = keep;
  }
  // ---- the boulders: one with open air under it wobbles, then falls (slower in the water), landing where it can fall no further;
  // falling on the gnome, a heart
  function bouldersStep() {
    for (const b of S.boulders) {
      const open = (c, r) => inside(c, r) && mat[at(c, r)] === AIR && !fix[at(c, r)] && !S.boulders.some(o => o !== b && o.c === c && o.r === r);
      if (!b.falling) { if (!open(b.c, b.r + 1)) { b.wob = -1; continue; }
        if (b.wob < 0) { b.wob = 45; if (SND) SND.wobble(); } else if (--b.wob <= 0) { b.falling = true; b.oy = 0; } continue; }
      const wet = wat[at(b.c, b.r)] > 0.5;
      b.oy += wet ? 0.04 : 0.11;
      while (b.oy >= 1) { b.r++; b.oy -= 1; if (!open(b.c, b.r + 1)) { b.oy = 0; b.falling = false; b.wob = -1; if (SND) SND.land(); break; } }
      const gx = S.g.x / 1000, gy = S.g.y / 1000;
      if (b.falling && Math.abs(gx - (b.c + 0.5)) < 0.8 && gy > b.r + b.oy + 0.2 && gy - 0.9 < b.r + b.oy + 1) hurt("💥 a boulder");
    }
  }
  // ---- the beavers (World.beaver, ten times a second): the trees standing near each's lodge, given; a tree it fells falls, and
  // grows again from a sapling; a log laid raises its dam a little, and with it its river (World.water_row); a log washes away
  // from each dam every minute
  function beaversStep(h) {
    for (const B of S.beavers) {
      const near = S.trees.filter(t => t.alive && t.grow >= 1 && !t.keep && Math.abs(t.x - B.b.lodge) <= 36).map(t => t.x);
      const piles = S.piles.filter(p => p.n > 0 && Math.abs(p.x - B.b.lodge) <= 36).map(p => p.x), fallen = S.fallen.filter(f => f.k < f.F.pieces.length && Math.abs(f.x - B.b.lodge) <= 36).map(f => f.x);
      const b2 = h.beaver(B.b, near, piles, fallen);
      // (Matthew: "when the beavers carry a tree, they should carry one log at a time, from a huge pile that they create") a
      // felled tree is a pile of logs where it fell, eleven to fifteen by its height, a heap; a beaver starting to drag takes one from it
      if (b2.felled >= 0) { const t = S.trees.find(t => t.x === b2.felled && t.alive); if (t) { t.alive = false; t.fallAt = S.frame; t.fallDir = b2.face; t.regrow = 90 * 60;
        const F = fallenOf(t); S.fallen.push({ x: t.x, t, F, k: 0 }); S.piles.push({ x: t.x, n: 0, max: F.pieces.length, seed: S.frame }); } }
      if (b2.cut) { const fl = S.fallen.find(f => f.x === b2.tree && f.k < f.F.pieces.length), p = S.piles.find(p => p.x === b2.tree); if (fl && p) { cutPiece(fl); p.n++; } }
      if (b2.job === 3 && B.b.job !== 3) { const p = S.piles.find(p => p.x === b2.tree && p.n > 0); if (p) p.n--; }
      if (b2.laid) { const d = S.dams.find(d => Math.abs(d.at - b2.dam) <= 2); if (d && d.river) { d.logs = Math.min(d.logs + 1, 40); setLevel(h, d.river); } }
      B.b = b2;
    }
    S.fallen = S.fallen.filter(f => f.k < f.F.pieces.length && f.t.alive === false); S.piles = S.piles.filter(p => p.n > 0 || S.fallen.some(f => f.x === p.x));
    if (S.frame - S.damAt > 60 * 60) { S.damAt = S.frame; for (const d of S.dams) if (d.logs > 0 && d.river) { d.logs--; setLevel(h, d.river); } }
    for (const t of S.trees) if (!t.alive && --t.regrow <= 0) { t.alive = true; t.grow = 0.15; }
  }

  // ---- (Matthew: "let's have wind effects that are variable": "they affect hanging willow branches", "and waves on water
  // surface", "and grass/other light veg moving", "and trees moving") The wind: its strength and its way (-1 to 1, east the
  // positive way), wandering toward a new aim every six to sixteen seconds (now and then a strong one), with gusts on top of
  // it that die away; and in a gust, leaves blown off the trees
  function windStep() {
    const W0 = S.wind || (S.wind = { v: 0.25, aim: 0.3, next: 0, gust: 0 });
    if (S.frame >= W0.next) { const strong = rand() < 0.22; W0.aim = Math.max(-1, Math.min(1, (rand() - 0.38) * (strong ? 2.4 : 1.1))); W0.next = S.frame + Math.floor(60 * (6 + rand() * 10)); }
    if (rand() < 0.0035 + 0.006 * Math.abs(W0.v)) W0.gust = (0.35 + rand() * 0.45) * (W0.aim >= 0 ? 1 : -1);
    W0.gust *= 0.975; W0.v += (W0.aim - W0.v) * 0.004;
    S.windNow = Math.max(-1.4, Math.min(1.4, W0.v + W0.gust));
    if (Math.abs(S.windNow) > 0.75 && rand() < 0.25 && S.g) { const t = S.trees[Math.floor(rand() * S.trees.length)];
      if (t && t.alive && Math.abs(t.x - S.g.x / 1000) < 30) S.leaves.push({ x: t.x + (rand() - 0.5) * t.h * 0.6, y: surf0[t.x] - t.h * (0.6 + 0.3 * rand()), vy: 0.004, a: rand() * 6, life: 0, col: ["#5a8f2a", "#86a92e", "#c2a83a", "#2f7d32"][Math.floor(rand() * 4)] }); }
    for (const l of S.leaves) { l.x += S.windNow * 0.06 + Math.sin(l.a) * 0.01; l.y += l.vy + Math.cos(l.a * 0.7) * 0.004; l.a += 0.08; l.life++; }
    S.leaves = S.leaves.filter(l => l.life < 400 && l.y < WH);
  }
  // (how far a thing standing in the wind leans at its top, in tiles a tile of its height: the wind's lean, and a sway at the
  // thing's own pace, quicker and wider the stronger the wind)
  const sway = (seed, k = 1) => { const w = S.windNow || 0, t = performance.now(); return k * (w * 0.05 + (0.012 + 0.03 * Math.abs(w)) * Math.sin(t / (900 - 380 * Math.min(1, Math.abs(w))) + seed * 1.7)); };
  // (a picture drawn in bands, each pushed across by the sway, more toward its top (a tree bending), or, for a willow's
  // tassels, more toward their tips, below)
  // (0.0.95, Matthew: "the wind reduces the FPS to 11FPS?") Each band shifted across by whole pixels, not sheared: a sheared
  // picture is filtered as it is drawn, and in full screen the trees took 47 ms a frame so; shifted, at the picture's own size
  // (sprite: painted at the tile's size), a band is copied as it is, a tenth the cost. As many bands as keep each step to two and a half
  // pixels or so (80 at most), so that the bend still reads as a curve
  function drawSwaying(sp, x, y, k, lean, tassels = false, n = 6) {
    const f = T / sp.res * k, w = sp.w, h = sp.h, hT = h / sp.res * k, one = Math.abs(f - 1) < 0.001;
    const push = v => (tassels ? Math.max(0, (v - 0.12) / 0.88) ** 1.3 * 1.6 + (1 - v) * 0.3 : (1 - v) * (1 - v)) * lean * hT * T;   // (v: 0 at the top, 1 at the foot)
    const X = x - sp.ox * T * k, Y = y - sp.oy * T * k, RX = Math.round(X), RY = Math.round(Y);
    const seen = (sy, sh) => Y + (sy + sh) * f >= VIEW.y0 - T && Y + sy * f <= VIEW.y1 + T;   // (a band in view, or near it)
    if (Math.abs(lean) < 0.0005 && !sp.strips) { if (one) ctx.drawImage(sp.cv, RX, RY); else ctx.drawImage(sp.cv, X, Y, w * f, h * f); return; }
    const span = Math.abs(push(1) - push(0)) + Math.abs(push(0.5) - push(0)), m = Math.max(n, Math.min(80, Math.ceil(span / 2.5)), sp.strips ? Math.ceil(h / sp.sh) : 0);
    for (let i = 0; i < m; i++) { const sy = Math.floor(i * h / m), sh = Math.floor((i + 1) * h / m) - sy; if (sh <= 0 || !seen(sy, sh)) continue;
      const dx = Math.round(push((sy + sh / 2) / h));
      if (one) blitRows(sp, sy, sh, RX + dx, RY + sy, 1);
      else blitRows(sp, sy, Math.min(h - sy, sh + 1), X + dx, Y + sy * f, f); }
  }

  // ---- one frame: the gnome, the boulders, the water, the beavers, the smoke; the camera after the gnome
  function tick(h) {
    S.frame++;
    if (S.faintAt && S.ride && S.ride.on) { const M = S.mount; S.ride.on = false; M.x = S.g.x; M.y = S.g.y; M.face = S.g.face; }
    if (S.faintAt) { if (performance.now() - S.faintAt > 1800) { S.faintAt = 0; S.hearts = 5; S.g = { ...S.g, x: S.start.x, y: top[Math.floor(S.start.x / 1000)] * 1000, vx: 0, vy: 0, air: 600 }; S.cam.set = false; } }
    else { if (BOT.on) { BOT.frames++; botStep(); } gnomeStep(h); }
    bouldersStep();
    waterStep();
    if (S.frame % 6 === 0) beaversStep(h);
    for (const t of S.trees) if (t.alive && t.grow < 1) t.grow = Math.min(1, t.grow + 1 / (60 * 60));
    // (a heart taken comes back once its place has gone out of the view, so that none appears while you look)
    if (S.frame % 30 === 0 && S.cam.set) for (const hh of S.heartItems || []) if (hh.taken && (hh.x < S.cam.x - 1 || hh.x > S.cam.x + VW + 1 || hh.y < S.cam.y - 1 || hh.y > S.cam.y + VH + 1)) hh.taken = false;
    for (const B of S.beavers) B.px += (B.b.x / 100 - B.px) * 0.18;
    if (S.frame % 9 === 0) for (const d of S.ducts) if (d.kind === 3) S.smoke.push({ x: d.x + 0.5 + (rand() - 0.5) * 0.2, y: d.y0 - 2.2, r: 0.18, life: 0, drift: 0.004 + rand() * 0.006 });
    windStep(); houseSmoke(); squirrelsStep(); pebblesStep(); villagersStep(h); wildStep(); bunniesStep();
    if (S.frame % 15 === 0) musicStep();
    for (const s of S.smoke) { s.y -= 0.012; s.x += s.drift + S.windNow * 0.02; s.r += 0.006; s.life++; }
    S.smoke = S.smoke.filter(s => s.life < 200);
    for (const p of S.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.01; p.life--; }
    S.parts = S.parts.filter(p => p.life > 0);
  }

  // ---- drawing: the sky and far hills, the trees, the ground (its tiles; the water in it as blue, darker the fuller), the
  // rooms and their things, the great trees and their houses, the beavers, the boulders, the gnome, the water over all that is
  // in it, the dark underground (lit by the lantern, the lamps and the light shafts), and the words and the map
  const cv = $("world"), realCtx = cv.getContext("2d"); let ctx = realCtx, LINE = false;
  let T = 32, VW = 30, VH = 17;
  // (0.0.95, Matthew: "the wind reduces the FPS to 11FPS?") At most 56 pixels a tile: in full screen, at twice the pixels of the
  // screen, a tile was 80 and more, every picture stretched and filtered to it, 92 ms a frame; the canvas is drawn at most this
  // fine and the browser scales it to the screen. The trees, the bushes and the roots are painted at this size, and drawn 1:1
  const TCAP = 56;
  const tileFor = (w, hgt) => Math.max(12, Math.round(hgt > w ? w / 15 : Math.min(w / 28, hgt / 15.75)));
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    let w = Math.max(320, Math.round(r.width * d)), hgt = Math.max(180, Math.round(r.height * d));
    const t0 = tileFor(w, hgt); if (t0 > TCAP) { const q = TCAP / t0; w = Math.round(w * q); hgt = Math.round(hgt * q); }
    if (cv.width !== w || cv.height !== hgt) { cv.width = w; cv.height = hgt; texCache.clear(); }
    T = S.tileFix || Math.min(TCAP, tileFor(w, hgt));   // (tileFix: the booklet's pictures, ?test=1, a wider view of the world at fewer pixels a tile)
    VW = cv.width / T; VH = cv.height / T;
  }
  // (each kind of ground a few tiles' worth of texture, made once for the tile's size: specks, layers, cracks, bricks, planks)
  const texCache = new Map();
  function tex(kind, v) {
    const key = kind * 8 + v + (LINE ? 100000 : 0); let t = texCache.get(key); if (t) return t;
    t = document.createElement("canvas"); t.width = t.height = T; const c = t.getContext("2d");
    if (LINE) { c.fillStyle = "#fff"; c.fillRect(0, 0, T, T); texCache.set(key, t); return t; }
    let r = 1 + kind * 7 + v * 131; const R = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    const base = kind === 100 ? "#4a2f1d" : kind === 101 ? "#e8dcc4" : kind === 102 ? "#8a5a33" : kind === 103 ? "#6b6258" : kind === 104 ? "#3c3a3a" : COLOR[kind];
    c.fillStyle = base; c.fillRect(0, 0, T, T);
    const speck = (n, col, s) => { c.fillStyle = col; for (let k = 0; k < n; k++) c.fillRect(Math.floor(R() * T), Math.floor(R() * T), s, s); };
    const u = Math.max(1, Math.round(T / 16));
    if (kind === SOIL) { speck(14, "rgba(0,0,0,0.18)", 2 * u); speck(8, "rgba(255,230,190,0.15)", u); }
    else if (kind === CLAY) { c.fillStyle = "rgba(255,255,255,0.08)"; c.fillRect(0, T * 0.3, T, u); c.fillRect(0, T * 0.72, T, u); speck(6, "rgba(0,0,0,0.12)", u); }
    else if (kind === SAND) { for (let k = 0; k < 16; k++) { c.fillStyle = ["#a88b5a", "#d9c08a", "#8d7a63", "#c7ad7a"][k % 4]; c.beginPath(); c.arc(R() * T, R() * T, (0.5 + R() * 1.6) * u, 0, 7); c.fill(); } }
    else if (kind === SSTONE) { c.fillStyle = "rgba(120,60,30,0.25)"; for (let y = (v * 3) % 5; y < T; y += Math.round(T / 4)) c.fillRect(0, y, T, u); speck(10, "rgba(255,230,200,0.18)", u); }
    else if (kind === SHALE) { c.fillStyle = "rgba(0,0,0,0.25)"; for (let y = v; y < T; y += Math.round(T / 6)) c.fillRect(0, y, T, u); speck(6, "rgba(255,255,255,0.08)", u); }
    else if (kind === LIME) { speck(10, "rgba(0,0,0,0.1)", u); c.strokeStyle = "rgba(90,80,60,0.35)"; c.lineWidth = u; c.beginPath(); c.arc(T * (0.3 + 0.4 * R()), T * (0.3 + 0.4 * R()), T * 0.12, 0.3, 5.5); c.stroke(); }
    else if (kind === GRANITE) { for (let k = 0; k < 18; k++) { c.fillStyle = ["#5c5658", "#c9c2bd", "#b07a7a", "#3e3a3c"][k % 4]; c.fillRect(R() * T, R() * T, 2 * u, 2 * u); } }
    else if (kind === MASON) { c.fillStyle = "rgba(60,50,40,0.55)"; const hh = T / 2; c.fillRect(0, hh - u / 2, T, u); c.fillRect(0, 0, T, u / 2);
      c.fillRect((v % 2 ? T * 0.5 : T * 0.2), 0, u, hh); c.fillRect((v % 2 ? T * 0.15 : T * 0.7), hh, u, hh); speck(5, "rgba(255,255,255,0.1)", u); }
    else if (kind === TIMBER) { c.fillStyle = "rgba(60,30,10,0.45)"; c.fillRect(0, T / 2, T, u); c.fillRect((v * 0.3 % 1) * T, 0, u, T / 2); c.fillStyle = "rgba(255,220,170,0.15)"; c.fillRect(0, 0, T, u); }
    else if (kind === 100) { speck(12, "rgba(0,0,0,0.25)", 2 * u); speck(6, "rgba(255,220,180,0.08)", u); }   // (dug: the earth behind a tunnel)
    else if (kind === 101) { speck(8, "rgba(120,100,70,0.12)", u); }   // (plaster)
    else if (kind === 102) { c.fillStyle = "rgba(50,25,10,0.4)"; for (let x = 0; x < T; x += Math.round(T / 3)) c.fillRect(x, 0, u, T); }   // (wood paneling)
    else if (kind === 103) { c.fillStyle = "rgba(30,25,20,0.45)"; c.fillRect(0, T / 2, T, u); c.fillRect(T / 2, 0, u, T / 2); c.fillRect(T / 5, T / 2, u, T / 2); }   // (the stair's stones)
    else if (kind === 104) { speck(14, "rgba(255,255,255,0.06)", 2 * u); }   // (a cave)
    texCache.set(key, t); return t;
  }
  const GEMS = ["", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#f59e0b"];
  // (Gnome dig's earth, darker deeper: its four bands, and deeper still; each other kind of ground its own hue toward them, and
  // darker with the depth too)
  const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), mixRGB = (a, b, f) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
  const BANDS = [[0, "#a16207"], [6, "#92400e"], [14, "#7c2d12"], [26, "#5b2112"], [50, "#40170e"], [90, "#2a100a"]].map(([d, h]) => [d, hexRGB(h)]);
  const bandAt = d => { d = Math.max(0, d); for (let k = 1; k < BANDS.length; k++) if (d <= BANDS[k][0]) { const [d0, a] = BANDS[k - 1], [d1, b] = BANDS[k]; return mixRGB(a, b, (d - d0) / (d1 - d0)); } return BANDS[BANDS.length - 1][1]; };
  const HUE = { [CLAY]: "#9a4a2c", [SAND]: "#bf9050", [SSTONE]: "#b8662c", [SHALE]: "#5e4a3e", [LIME]: "#b9ae94", [GRANITE]: "#77706f" };
  const colCache = new Map(), rgbOf = a => `rgb(${a[0]},${a[1]},${a[2]})`;
  function groundCol(m, d) { const k = m * 256 + Math.max(0, Math.min(255, d)); let v = colCache.get(k); if (v) return v;
    const band = bandAt(d); v = rgbOf(m === SOIL ? band : mixRGB(mixRGB(hexRGB(HUE[m]), band, 0.3), [20, 10, 5], Math.min(0.5, Math.max(0, d) / 110))); colCache.set(k, v); return v; }
  const backCol = d => { const k = 100000 + Math.max(0, Math.min(255, d)); let v = colCache.get(k); if (!v) { v = rgbOf(mixRGB(bandAt(d), [20, 10, 5], 0.62)); colCache.set(k, v); } return v; };
  // (layers the size of the picture, for the roots and the threads, laid on at once, so that overlaps do not darken)
  const layerCv = [document.createElement("canvas"), document.createElement("canvas")];
  function layer(k, camX, camY) { const L = layerCv[k]; if (L.width !== cv.width || L.height !== cv.height) { L.width = cv.width; L.height = cv.height; }
    const c = L.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, L.width, L.height); c.setTransform(1, 0, 0, 1, -camX * T, -camY * T); return c; }
  // (the lines of each set, thinnest first, in as few strokes as their widths allow; mirrored about their tree, and a little
  // lower, for the roots seen behind a tunnel's back wall)
  function strokeLines(c, sets, col, wMul, dx, dy, minW, mirror, s, fixedW = 0) {
    c.strokeStyle = col; c.lineCap = "round";
    for (const R of sets) { const L = R.lines; let cur = -1;
      for (let k = 0; k < L.length; k += 5) { const w = L[k + 4]; if (w < minW) continue;
        const q = fixedW ? Math.max(0.8, fixedW * s / 100) : Math.max(1, Math.round(w / 100 * s * wMul * 2) / 2);
        if (q !== cur) { if (cur >= 0) c.stroke(); c.lineWidth = q; c.beginPath(); cur = q; }
        let x0 = L[k], y0 = L[k + 1], x1 = L[k + 2], y1 = L[k + 3]; if (mirror) { x0 = 2 * R.tx - x0; x1 = 2 * R.tx - x1; y0 += 45; y1 += 45; }
        c.moveTo(x0 / 100 * s + dx, y0 / 100 * s + dy); c.lineTo(x1 / 100 * s + dx, y1 / 100 * s + dy); }
      if (cur >= 0) c.stroke(); }
  }
  // (Gnome dig's drawWorks: a ladder, its two rails and four rungs, against a cribbing post each side; a timber set: a post
  // either side, a cap under the earth above, a sill on the earth below, their joints pegged)
  function drawWorks(c0, c1, r0, r1, u) {
    const c = ctx, dug = (k, r) => inside(k, r) && mat[at(k, r)] === AIR;
    const plank = (x, y, w2, h2, col, edge) => { c.fillStyle = col; c.fillRect(x, y, w2, h2); c.fillStyle = edge; c.fillRect(x, y + h2 * 0.72, w2, h2 * 0.28); };
    for (const [i, kind] of S.works) {
      const k = i % WW, r = Math.floor(i / WW); if (k < c0 || k > c1 || r < r0 || r > r1 || mat[i] !== AIR) continue;
      const x = k * u, y = r * u;
      if (kind === "ladder") {
        for (const px of [0.02, 0.9]) plank(x + px * u, y - 0.5, u * 0.08, u + 1, "#8f6233", "#5f3d1c");
        for (const rx of [0.24, 0.7]) plank(x + rx * u, y - 0.5, u * 0.07, u + 1, "#b07d45", "#8a5c2e");
        for (let j = 0; j < 4; j++) { const ry = y + (j + 0.4) * u / 4; plank(x + 0.24 * u, ry, u * 0.53, u * 0.055, "#c48f55", "#8a5c2e"); }
      } else {
        for (const px of [0.06, 0.86]) plank(x + px * u, y + u * 0.06, u * 0.08, u * 0.9, "#9a6a37", "#6e4721");
        if (!dug(k, r - 1)) plank(x - 0.5, y + u * 0.02, u + 1, u * 0.1, "#a8743e", "#6e4721");
        if (!dug(k, r + 1)) plank(x - 0.5, y + u * 0.9, u + 1, u * 0.08, "#8f6233", "#5f3d1c");
        c.strokeStyle = "rgba(110, 71, 33, 0.85)"; c.lineWidth = u * 0.035; c.beginPath(); c.moveTo(x + u * 0.12, y + u * 0.14); c.lineTo(x + u * 0.3, y + u * 0.12); c.moveTo(x + u * 0.88, y + u * 0.14); c.lineTo(x + u * 0.7, y + u * 0.12); c.stroke();
      }
    }
  }
  // (a dug tile's shaded edges, made once for the tile's size)
  let edgeSet = null;
  function edges() {
    if (edgeSet && edgeSet.T === T) return edgeSet;
    const mk = (w, h, x0, y0, x1, y1, a) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); const g = c.getContext("2d");
      const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(8,4,2,${a})`); gr.addColorStop(1, "rgba(8,4,2,0)"); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); return c; };
    edgeSet = { T, top: mk(T + 0.5, T * 0.34, 0, 0, 0, T * 0.34, 0.55), left: mk(T * 0.16, T + 0.5, 0, 0, T * 0.16, 0, 0.35), right: mk(T * 0.16 + 0.5, T + 0.5, T * 0.16, 0, 0, 0, 0.35) };
    return edgeSet;
  }
  // (each tree's roots and each mushroom's threads, grown in Hazel as they come near the view, a few a frame; the roots tell the
  // water where to go faster)
  function ensureRoots(x0, x1) {
    const h = H(); if (!h || !h.roots || !(S.built && S.built.compiled)) return;
    let n = 0;
    for (const t of S.rootPlan) { if (t.done || t.x < x0 || t.x > x1) continue; if (n++ >= 3) break; t.done = true; rootSet(h, t, true); }
  }
  // (one tree's roots, or a mushroom's threads, from Hazel: their lines to draw, and, growing, the water's quicker way down them in
  // the tiles they cross; a saved world loaded has those tiles already (0.0.101), so its roots are only drawn again)
  function rootSet(h, t, grow) {
    { const lines = t.kind === "shroom" ? h.threads(t.x * 100 + 50, t.row, t.seed) : h.roots(t.x * 100 + 50, t.row, t.k, t.seed);
      lines.sort((a, b) => a.w - b.w);
      const L = new Float32Array(lines.length * 5); let lo = t.x, hi = t.x;
      lines.forEach((l, i) => { L[i * 5] = l.x0; L[i * 5 + 1] = l.y0; L[i * 5 + 2] = l.x1; L[i * 5 + 3] = l.y1; L[i * 5 + 4] = l.w; lo = Math.min(lo, l.x0 / 100, l.x1 / 100); hi = Math.max(hi, l.x0 / 100, l.x1 / 100);
        if (grow && t.kind !== "shroom") for (let q = 0; q <= 2; q++) { const c = Math.floor((l.x0 + (l.x1 - l.x0) * q / 2) / 100), r = Math.floor((l.y0 + (l.y1 - l.y0) * q / 2) / 100);
          if (inside(c, r) && PORES[mat[at(c, r)]] > 0) root[at(c, r)] = Math.min(3, root[at(c, r)] + (l.w >= 10 ? 2 : 1)); } });
      (t.kind === "shroom" ? S.threadSets : S.rootSets).push({ tx: t.x * 100 + 50, x0: Math.floor(lo) - 1, x1: Math.ceil(hi) + 1, lines: L }); dirtyRootsX(Math.floor(lo) - 1, Math.ceil(hi) + 1); }
  }
  // (Matthew: "it seems like there are performance challenges now with gnome world") The roots and threads, drawn once into
  // pictures of the world twelve tiles square, at up to 48 pixels a tile, and drawn again only where they change: they were
  // stroked again every frame, every line of every root in view, three times over the ground and three more in the tunnels, 40
  // to 90 ms a frame. Each square has the roots over its ground (the dark roots and their lighter edge, laid on at 0.3, the
  // threads at 0.4, kept to its ground's tiles, a slope's to under its diagonal), and, where it has tunnels, the roots seen
  // behind their back walls and the roots across them, in front of the gnome, kept to the tunnels. A square is drawn again when
  // a tile in it is dug, or when roots grow into it (ensureRoots, as the gnome goes)
  const RCH = 12, rootChunks = new Map();
  const dirtyRootsAt = (c, r) => { const ch = rootChunks.get(Math.floor(c / RCH) + "," + Math.floor(r / RCH)); if (ch) ch.dirty = true; };
  const dirtyRootsX = (x0, x1) => { for (const [k, ch] of rootChunks) { const cx = +k.split(",")[0]; if ((cx + 1) * RCH >= x0 && cx * RCH <= x1) ch.dirty = true; } };
  function rootChunk(cx, cy) {
    const k = cx + "," + cy, res = Math.min(T, TCAP); let ch = rootChunks.get(k);
    if (ch && ch.res === res && !ch.dirty) { rootChunks.delete(k); rootChunks.set(k, ch); return ch; }
    const x0 = cx * RCH, y0 = cy * RCH, W = Math.ceil(RCH * res), sets = S.rootSets.filter(R => R.x1 >= x0 - 1 && R.x0 <= x0 + RCH + 1), tsets = S.threadSets.filter(R => R.x1 >= x0 - 1 && R.x0 <= x0 + RCH + 1);
    const mk = () => { const c = document.createElement("canvas"); c.width = c.height = W; return c; }, tmp = mk(), tg = tmp.getContext("2d");
    const pass = fn => { tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, W); tg.setTransform(1, 0, 0, 1, -x0 * res, -y0 * res); fn(tg); };
    const mask = (g, keep) => { g.globalCompositeOperation = "destination-in"; g.fillStyle = "#000"; g.beginPath();
      for (let r = y0; r < y0 + RCH; r++) for (let c = x0; c < x0 + RCH; c++) { if (!inside(c, r) || !keep(at(c, r))) continue; const X = (c - x0) * res, Y = (r - y0) * res, sk = shape[at(c, r)];
        if (sk === 1) { g.moveTo(X, Y + res + 0.5); g.lineTo(X + res + 0.5, Y); g.lineTo(X + res + 0.5, Y + res + 0.5); g.closePath(); }
        else if (sk === 2) { g.moveTo(X, Y); g.lineTo(X + res + 0.5, Y + res + 0.5); g.lineTo(X, Y + res + 0.5); g.closePath(); } else g.rect(X, Y, res + 0.5, res + 0.5); }
      g.fill(); g.globalCompositeOperation = "source-over"; };
    const ground = mk(), gg = ground.getContext("2d");
    pass(t => { strokeLines(t, sets, "#24120a", 1, 0, 0, 0, false, res); strokeLines(t, sets, "#3d2414", 0.35, -1, -1, 9, false, res); }); gg.globalAlpha = 0.3; gg.drawImage(tmp, 0, 0);
    pass(t => strokeLines(t, tsets, "#fafaf5", 1, 0, 0, 0, false, res, 3)); gg.globalAlpha = 0.4; gg.drawImage(tmp, 0, 0); gg.globalAlpha = 1;
    mask(gg, i => mat[i] >= SOIL && mat[i] <= GRANITE);
    let back = null, front = null; const dug = i => mat[i] === AIR && bg[i] === B_DUG;
    let any = false; for (let r = y0; r < y0 + RCH && !any; r++) for (let c = x0; c < x0 + RCH; c++) if (inside(c, r) && dug(at(c, r))) { any = true; break; }
    if (any) { back = mk(); const bgc = back.getContext("2d");
      pass(t => strokeLines(t, sets, "#24120a", 1, 0, 0, 0, true, res)); bgc.globalAlpha = 0.42; bgc.drawImage(tmp, 0, 0);
      pass(t => strokeLines(t, sets, "#b08a63", 1, 0, 0, 0, false, res)); bgc.globalAlpha = 0.2; bgc.drawImage(tmp, 0, 0);
      pass(t => strokeLines(t, tsets, "#fafaf5", 1, 0, 0, 0, false, res, 3)); bgc.globalAlpha = 0.14; bgc.drawImage(tmp, 0, 0); bgc.globalAlpha = 1; mask(bgc, dug);
      front = mk(); const fg = front.getContext("2d"); fg.setTransform(1, 0, 0, 1, -x0 * res, -y0 * res);
      strokeLines(fg, sets, "rgba(5,2,1,0.45)", 1.05, res * 0.05, res * 0.07, 5, false, res); strokeLines(fg, sets, "#5b3a22", 1, 0, 0, 5, false, res); strokeLines(fg, sets, "#8a6440", 0.35, -res * 0.012, -res * 0.012, 5, false, res);
      fg.setTransform(1, 0, 0, 1, 0, 0); mask(fg, dug); }
    ch = { res, ground, back, front, dirty: false }; rootChunks.set(k, ch);
    if (rootChunks.size > 30) rootChunks.delete(rootChunks.keys().next().value);
    return ch;
  }
  function drawRootChunks(c0, c1, r0, r1, s, which) {
    if (LINE) return;
    for (let cy = Math.floor(r0 / RCH); cy <= Math.floor(r1 / RCH); cy++) for (let cx = Math.floor(c0 / RCH); cx <= Math.floor(c1 / RCH); cx++) {
      const ch = rootChunk(cx, cy), img = ch[which]; if (img) ctx.drawImage(img, cx * RCH * s, cy * RCH * s, RCH * s, RCH * s); }
  }
  // (Matthew: "let's add a gnome picker --- the user can choose which main char they want: gnome dad (current choice), gnome mom,
  // gnome girl, gnome boy") who the player is, each one's look: the cap, the clothes, the hair, and size (the children four
  // fifths as tall, standing on the same ground; Matthew: "the girl's clothing is black and magenta -- with stylized hat with
  // those two themes": her dress black, her apron and cuffs magenta, her cap magenta striped in black round the cone, its brim
  // black); dad's white beard and moustache; mom's auburn braids over her shoulders, her
  // dress and apron; the girl's brunette pigtails and freckles, her dress and apron; the boy's sandy-blond fringe and freckles (Matthew: "let's make
  // the girl brunette and the boy sandy-blond"; "boy has long hair too, but not in braides; as a pony tail": his hair drawn
  // back from the fringe and tied at the nape, the tail down his back, swinging as he runs)
  const HEROES = {
    dad: { name: "Gnome dad", size: 1, cap: "#dc2626", capDk: "#b91c1c", brim: "#a51c1c", coat: "#5ba3d6", coatDk: "#4386b8", cuff: "#3f7fae", legFar: "#3a6f99", hair: "#f1f5f9", hair2: "#e5e7eb", hairDk: "#cbd5e1", brow: "#f8fafc", nose: 2.9, beard: true },
    mom: { name: "Gnome mom", size: 0.95, cap: "#4f7d2e", capDk: "#3f6824", brim: "#33561c", coat: "#a3557a", coatDk: "#874262", cuff: "#733654", legFar: "#5b3a4c", hair: "#b0703c", hair2: "#9a5e30", hairDk: "#7a4520", brow: "#7a4520", nose: 2.3, dress: true, apron: "#f4ecd8", braids: true, lashes: true },
    girl: { name: "Gnome girl", size: 0.8, cap: "#e0287f", capDk: "#b81d66", brim: "#1c181e", stripe: "#1c181e", coat: "#2a2430", coatDk: "#1a161e", cuff: "#d6247a", legFar: "#141016", hair: "#6e4326", hair2: "#5c351c", hairDk: "#3f2412", brow: "#4a2c16", nose: 2.0, dress: true, apron: "#e0287f", pigtails: true, lashes: true, freckles: true },
    boy: { name: "Gnome boy", size: 0.8, cap: "#2f6db5", capDk: "#245a96", brim: "#1e4c80", coat: "#4f9a3a", coatDk: "#3f7f2e", cuff: "#356b27", legFar: "#2f5f25", hair: "#d9b46c", hair2: "#c49d58", hairDk: "#94743a", brow: "#a08048", nose: 2.0, fringe: true, ponytail: true, freckles: true },
  };
  const heroLook = who => HEROES[who || S.hero] || HEROES.dad;
  // (the gnome, Gnome dig's own, copied from dig/app.js: its cap, beard and lantern; and, for the water, a swimmer's arms and a tilt)
  const loverAt = () => {};
  function gnome(c, x, y, u, d, ready, moving, now, diving, loves, lamp = true, cheer = false, pose = null, who = null) {
    if (cheer) { d = 2; moving = false; }
    const L = heroLook(who);
    const back = d === 0, flip = d === 3 ? -1 : 1, side = d === 1 || d === 3, step = moving ? Math.sin(now / 70) : 0;
    const bob = cheer ? -Math.abs(Math.sin(now / 150)) * 6 : moving ? -Math.abs(step) * 1.4 : 0, wave = cheer ? Math.sin(now / 110) * 2.5 : 0;
    c.save(); c.translate(x, y); c.scale(flip * u / 40, u / 40); c.translate(0, bob);
    if (L.size !== 1) { c.translate(0, 19); c.scale(L.size, L.size); c.translate(0, -19); }   // (smaller, the feet where they were)
    // (Gnome world: swimming along, he lies forward into the stroke, turned about his hips, his head up out of the water)
    if (pose && pose.swim && pose.stroke) { c.translate(0, 6); c.rotate(1.0); c.translate(0, -6); }
    const E = (cx, cy, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, 7); c.fill(); };
    if (!pose) E(0, 19 - bob, 13, 3.4, "rgba(0, 0, 0, 0.32)");   // (his shadow)
    const tail = (x0, y0, x1, y1, w, sw) => { const mx = (x0 + x1) / 2 + sw, my = (y0 + y1) / 2; c.fillStyle = L.hair2; c.beginPath(); c.moveTo(x0 - w, y0); c.quadraticCurveTo(mx - w * 1.1, my, x1, y1); c.quadraticCurveTo(mx + w * 1.1, my, x0 + w, y0); c.closePath(); c.fill();
      c.strokeStyle = L.hairDk; c.lineWidth = 0.5; c.beginPath(); for (const k of [-0.5, 0, 0.5]) { c.moveTo(x0 + k * w, y0 + 0.5); c.quadraticCurveTo(mx + k * w * 0.8, my, x1 + k * 0.4, y1 - 1); } c.stroke(); };
    if (L.ponytail && !back) tail(side ? 6.5 : 7, -10, side ? 10.5 : 9.5, 3.5, 2.6, 1.5);   // (the boy's ponytail, behind him, showing past his shoulder)
    for (const s2 of [-1, 1]) {   // (boots, a step at a time, with fur at the top)
      const lift = s2 * step > 0 ? -2 * Math.abs(step) : 0;
      c.fillStyle = "#5a3a22"; c.beginPath(); c.roundRect(s2 * 6 - 4 + (s2 > 0 ? 1 : -1), 13 + lift, 9, 6, 2.5); c.fill();
      c.fillStyle = "#7a5636"; c.beginPath(); c.roundRect(s2 * 6 - 4, 11.5 + lift, 8, 3, 1.5); c.fill();
    }
    const tank = () => { c.fillStyle = "#facc15"; c.beginPath(); c.roundRect(back ? -5 : -15, -7, back ? 10 : 7, 17, 3.5); c.fill();
      c.fillStyle = "#a16207"; c.fillRect(back ? -1.5 : -13, -9.5, 3, 3); };
    if (diving && !back) tank();   // (0.0.68: the diving gear on, its air tank on his back, behind him, or, his back to us, on it)
    // (the tunic, its sleeves and the belt; or the dress, longer and fuller, its apron over the front tied at the waist)
    const hem = L.dress ? 16 : 13, flare = L.dress ? 13.5 : 12;
    c.fillStyle = L.coat; c.beginPath(); c.moveTo(-9, -3); c.lineTo(9, -3); c.lineTo(flare, hem); c.quadraticCurveTo(0, hem + 2, -flare, hem); c.closePath(); c.fill();
    c.fillStyle = L.coatDk; c.beginPath(); c.moveTo(3, -3); c.lineTo(9, -3); c.lineTo(flare, hem); c.quadraticCurveTo(7, hem + 1.3, 4, hem + 1.5); c.closePath(); c.fill();
    if (!L.dress) { c.fillStyle = "#5c3a1a"; c.fillRect(-11.5, 4.6, 23, 5); }
    else if (!back) { c.fillStyle = L.apron; c.beginPath(); c.moveTo(-6.5, 3); c.lineTo(6.5, 3); c.quadraticCurveTo(8.5, 10, 7.5, hem - 0.5); c.quadraticCurveTo(0, hem + 1.2, -7.5, hem - 0.5); c.quadraticCurveTo(-8.5, 10, -6.5, 3); c.fill();
      c.strokeStyle = "rgba(120,90,60,0.35)"; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-3, 6); c.quadraticCurveTo(-3.5, 10, -3.2, hem - 1); c.moveTo(2.5, 6); c.quadraticCurveTo(3, 10, 2.8, hem - 1); c.stroke();
      c.fillStyle = L.apron; c.fillRect(-10, 2.4, 20, 2.2); c.fillStyle = "rgba(120,90,60,0.25)"; c.fillRect(-10, 4.2, 20, 0.5); }
    else { c.fillStyle = L.apron; c.fillRect(-10, 2.4, 20, 2.2); E(0, 3.5, 2.2, 1.6, L.apron); E(-2.6, 6, 1, 2.6, L.apron, 0.3); E(2.6, 6, 1, 2.6, L.apron, -0.3); }   // (the apron's bow, at the back)
    if (diving && back) tank();
    if (!back && !L.dress) { c.fillStyle = "#d9a93a"; c.beginPath(); c.roundRect(-3.6, 3.9, 7.2, 6.4, 1.2); c.fill(); c.fillStyle = "#5c3a1a"; c.fillRect(-1.8, 5.6, 3.6, 3); c.fillStyle = "#f2d27a"; c.fillRect(-3.2, 4.2, 6.4, 0.9); }
    let lx = cheer ? 15 : side ? 14 : 13, ly = cheer ? -19 - wave : side ? 2 : 5;   // (the lantern's hand)
    let hx = cheer ? -14 : -11, hy = cheer ? -16 + wave : 8;
    // (Gnome world, after Messed Up Dress Up's swimmers: swimming along, the arms windmill half a turn apart, the front crawl;
    // treading at the surface, the lantern held up out of the water, the other hand sculling)
    if (pose && pose.swim) { const a = pose.t / 170;
      if (pose.stroke) { lx = 10 + 13 * Math.cos(a); ly = -1 + 13 * Math.sin(a); hx = -6 + 13 * Math.cos(a + Math.PI); hy = -1 + 13 * Math.sin(a + Math.PI); }
      else { lx = 13; ly = -16; hx = -13 + 2.5 * Math.sin(a * 2); hy = 3 + 1.5 * Math.cos(a * 2); } }   // (the other hand)
    c.strokeStyle = L.coat; c.lineWidth = 4.5; c.lineCap = "round";
    c.beginPath(); c.moveTo(-8, -1); c.lineTo(hx, hy - 1); c.moveTo(8, -1); c.lineTo(lx - 2, ly); c.stroke();
    // (Matthew: "realistic hands, with indications of fingers") each hand at a cuff of the sleeve, darker: a palm, four fingers curled
    // (the lines between them), a thumb; the lantern's hand closed round its handle, drawn after it, below
    const cuff = (x0, y0, s2) => { E(x0, y0, 2.9, 1.7, L.cuff, s2 * 0.6); c.strokeStyle = "rgba(0,0,0,0.18)"; c.lineWidth = 0.4; c.beginPath(); c.ellipse(x0, y0, 2.9, 1.7, s2 * 0.6, 0.2, Math.PI - 0.2); c.stroke(); };
    const hand = (x0, y0, s2) => { E(x0, y0, 2.5, 2.3, "#f2c9a0"); E(x0 + s2 * 1.7, y0 - 1.1, 1.05, 1.45, "#ebbd93", s2 * -0.6);
      c.strokeStyle = "#c98f6c"; c.lineWidth = 0.42; c.lineCap = "round"; c.beginPath(); for (const k of [-0.8, 0.1, 1.0]) { c.moveTo(x0 - s2 * 2.1, y0 + k); c.quadraticCurveTo(x0 - s2 * 0.8, y0 + k + 0.35, x0 + s2 * 0.7, y0 + k * 1.05 + 0.25); } c.stroke(); c.lineCap = "butt"; };
    cuff(hx + 0.9, hy - 1.6, -1); hand(hx, hy, -1); cuff(lx - 2.6, ly - 1.0, 1);
    if (loves && !back) { c.save(); c.translate(hx - 1, hy + 1); loverAt(c, 0, 0, 26, now, false); c.restore(); }   // (0.0.71: the love shooter in his other hand)
    // (the lantern: a handle, a dark frame, its glass lit when it is ready; 0.0.73: only once he has it)
    if (lamp) {
      if (ready) { const gl = c.createRadialGradient(lx + 1, ly + 7, 0, lx + 1, ly + 7, 12); gl.addColorStop(0, "rgba(254, 240, 138, 0.75)"); gl.addColorStop(1, "rgba(254, 240, 138, 0)"); c.fillStyle = gl; c.beginPath(); c.arc(lx + 1, ly + 7, 12, 0, 7); c.fill(); }
    // (Matthew: "detailed lantern") its ring handle; a little roof and a knob on it; four posts and a crossbar round two panes of
    // glass, lit; inside, the flame on its wick; a base plate under it all
    { const cx = lx + 1, tp = ly + 3, dk = "#262626";
      c.strokeStyle = dk; c.lineWidth = 0.9; c.beginPath(); c.moveTo(cx - 2.4, tp + 0.6); c.quadraticCurveTo(cx - 2.2, tp - 3.4, cx, tp - 3.4); c.quadraticCurveTo(cx + 2.2, tp - 3.4, cx + 2.4, tp + 0.6); c.stroke();
      c.fillStyle = dk; c.beginPath(); c.moveTo(cx - 3.3, tp + 1.7); c.lineTo(cx - 1.5, tp - 0.1); c.lineTo(cx + 1.5, tp - 0.1); c.lineTo(cx + 3.3, tp + 1.7); c.closePath(); c.fill();
      E(cx, tp - 0.5, 0.8, 0.7, "#3a3a3a");
      c.fillStyle = ready ? "#fef08a" : "#b08a3a"; c.fillRect(cx - 2.6, tp + 1.7, 5.2, 7.6);
      if (ready) { c.fillStyle = "#f59e0b"; c.beginPath(); c.moveTo(cx, tp + 3.2); c.quadraticCurveTo(cx + 1.5, tp + 5.8, cx, tp + 7.2); c.quadraticCurveTo(cx - 1.5, tp + 5.8, cx, tp + 3.2); c.fill();
        c.fillStyle = "#fffbeb"; c.beginPath(); c.moveTo(cx, tp + 4.4); c.quadraticCurveTo(cx + 0.7, tp + 6, cx, tp + 6.9); c.quadraticCurveTo(cx - 0.7, tp + 6, cx, tp + 4.4); c.fill(); }
      c.fillStyle = dk; c.fillRect(cx - 0.5, tp + 7.1, 1, 1.2);
      for (const px of [cx - 3, cx + 2.3]) c.fillRect(px, tp + 1.5, 0.75, 8.2); c.fillRect(cx - 0.3, tp + 1.7, 0.6, 7.6); c.fillRect(cx - 2.9, tp + 5.3, 5.8, 0.5);
      c.fillStyle = "rgba(255,255,255,0.55)"; c.fillRect(cx - 2.1, tp + 2.3, 0.6, 2.4);
      c.fillStyle = dk; c.beginPath(); c.moveTo(cx - 3.2, tp + 9.3); c.lineTo(cx + 3.2, tp + 9.3); c.lineTo(cx + 3.6, tp + 10.6); c.lineTo(cx - 3.6, tp + 10.6); c.closePath(); c.fill(); }
    }
    hand(lx - 1.4, ly + 0.2, 1);
    // (mom's braids, down over her shoulders, ribbons at their ends; the girl's pigtails, out from under her cap at either side)
    const plait = (x0, y0, x1, y1, n, r0) => { for (let i = 0; i < n; i++) { const t = i / (n - 1), px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t, rr = r0 * (1 - 0.3 * t);
        E(px, py, rr, rr * 0.8, i % 2 ? L.hair2 : L.hair); c.strokeStyle = L.hairDk; c.lineWidth = 0.45; c.beginPath(); c.arc(px, py, rr * 0.75, 0.4, 2.7); c.stroke(); } };
    const pigtails = () => { const ox = side ? 1.5 : 0; for (const s2 of [-1, 1]) { const bx = ox + s2 * 9.5; plait(bx, -13, bx + s2 * 4.5, -6, 4, 2.3); E(bx + s2 * 5.2, -5, 1.4, 2.2, L.hair, s2 * -0.5); E(bx + s2 * 1.6, -11.2, 1.6, 1.1, L.cap); } };
    const braids = () => { const ox = side ? 1.5 : 0; for (const s2 of [-1, 1]) { const bx = ox + s2 * 7.2; plait(bx, -8, bx + s2 * 1.2, 4.5, 6, 2.1); E(bx + s2 * 1.3, 6.2, 1.6, 1.1, L.capDk); E(bx + s2 * 1.4, 7.6, 1.1, 1.6, L.hair2); } };
    if (back) {   // (his back: the beard showing at either side under the cap; hers, her hair down her back, the braids or pigtails)
      if (L.beard) { E(-7.5, -6, 3.5, 6, L.hair, 0.3); E(7.5, -6, 3.5, 6, L.hair, -0.3); }
      if (L.braids) { c.fillStyle = L.hair2; c.beginPath(); c.moveTo(-8, -14); c.quadraticCurveTo(-9.5, -4, -6, 1); c.lineTo(6, 1); c.quadraticCurveTo(9.5, -4, 8, -14); c.closePath(); c.fill(); }
      c.fillStyle = L.hair2; c.beginPath(); c.ellipse(0, -9.5, 8, 6.5, 0, 0, 7); c.fill();   // (the hair under the cap)
      c.strokeStyle = L.hairDk; c.lineWidth = 0.8; c.beginPath(); for (const hx of [-5, -2, 1, 4]) { c.moveTo(hx, -14); c.quadraticCurveTo(hx + 1, -9, hx, L.braids ? 0 : -4); } c.stroke();
      if (L.pigtails) pigtails();
      if (L.ponytail) { tail(0, -6.5, 0.8, 7, 3.2, Math.sin(now / 300) * 0.6); E(0, -6.5, 2.6, 1.3, L.capDk); }   // (his ponytail down his back, tied at the nape)
    } else {
      // (the face, rosy cheeks, the beard down over the tunic, its strands)
      // (mom's and the girl's hair, long, behind the face and down past it at the sides; it covers their ears)
      if (L.braids || L.pigtails) { const ox = side ? 1.5 : 0; c.fillStyle = L.hair2; c.beginPath(); c.moveTo(ox - 9, -15); c.quadraticCurveTo(ox - 10.5, -8, ox - 8, L.braids ? -3 : -6); c.lineTo(ox + 8, L.braids ? -3 : -6); c.quadraticCurveTo(ox + 10.5, -8, ox + 9, -15); c.closePath(); c.fill(); }
      // (Matthew: "gnomes should have ears") his ears, out at the sides of his head, half behind his face, the sideburns over their fronts
      if (!L.braids && !L.pigtails) for (const s2 of [-1, 1]) { const ex3 = (side ? 1.5 : 0) + s2 * (side && s2 < 0 ? 7.6 : 8.4), sc3 = side && s2 < 0 ? 0.8 : 1;
        E(ex3, -10.6, 1.9 * sc3, 2.8, "#efbf94", s2 * 0.15); E(ex3 + s2 * 0.3, -10.4, 0.9 * sc3, 1.6, "#d99a76", s2 * 0.15); }
      c.fillStyle = "#f2c9a0"; c.beginPath(); c.ellipse(side ? 1.5 : 0, L.beard ? -10.5 : -10.1, 7.5, L.beard ? 6.5 : 7, 0, 0, 7); c.fill();
      // (Gnome world; Matthew: "gnome should have side burns connecting head hair to beard") down each side of his face,
      // from the hair under the cap to the beard
      if (L.beard) for (const s2 of [-1, 1]) { const sx = (side ? 1.5 : 0) + s2 * (side && s2 > 0 ? 6.4 : 6.9); c.fillStyle = L.hair; c.beginPath(); c.moveTo(sx - 1.6, -15); c.quadraticCurveTo(sx - s2 * 0.4, -11, sx - 1.4 * s2 + (s2 < 0 ? 0 : 0), -6.5); c.lineTo(sx + s2 * 1.8, -7); c.quadraticCurveTo(sx + s2 * 2.2, -11, sx + 1.6, -15); c.closePath(); c.fill(); }
      E(side ? -3 : -5, -8, 2.2, 1.6, "rgba(244, 114, 114, 0.45)"); E(side ? 6 : 5, -8, 2.2, 1.6, "rgba(244, 114, 114, 0.45)");
      if (L.freckles) { c.fillStyle = "rgba(150, 85, 45, 0.55)"; for (const [fx3, fy3] of [[-5.6, -8.6], [-4.2, -7.6], [-6.2, -7.4], [4.6, -8.6], [6, -7.6], [3.8, -7.4]]) { c.beginPath(); c.arc(fx3 + (side ? 1.5 : 0), fy3, 0.42, 0, 7); c.fill(); } }
      if (L.beard) { c.fillStyle = "#f8fafc"; c.beginPath(); c.moveTo(-8 + (side ? 1 : 0), -8); c.quadraticCurveTo(-10, 3, (side ? 2 : 0), 12); c.quadraticCurveTo(10, 3, 8 + (side ? 2 : 0), -8); c.quadraticCurveTo(side ? 2 : 0, -2, -8 + (side ? 1 : 0), -8); c.fill();
      // (Matthew: "beard and beard texture") its locks, wavy, down to curls along its hem
      { const ox = side ? 1.5 : 0; for (const [bx, by] of [[-6.6, 0.5], [-4.6, 5.2], [-2.2, 9.4], [2.4, 9.4], [4.8, 5.2], [6.8, 0.5]]) E(bx + ox, by, 1.7, 1.5, "#f1f5f9", bx * 0.08);
        c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.7; c.lineCap = "round"; c.beginPath();
        for (const bx of [-5, -3, -1, 1, 3, 5]) { c.moveTo(bx * 0.9 + ox, -4); c.bezierCurveTo(bx * 0.9 + ox + 1, -1, bx * 0.75 + ox - 1, 3, bx * 0.55 + ox + 0.5, 7 - Math.abs(bx) * 0.6); }
        for (const [bx, by] of [[-6.6, 0.5], [-4.6, 5.2], [-2.2, 9.4], [2.4, 9.4], [4.8, 5.2], [6.8, 0.5]]) { c.moveTo(bx + ox + 0.9, by - 0.5); c.arc(bx + ox, by, 0.9, -0.5, 2.6); }
        c.stroke(); c.lineCap = "butt"; } }
      if (L.braids) braids();
      const fx = side ? 2.5 : 0;   // (the face turned a little toward the way he goes)
      // eyes, each with a glint, under bushy white brows
      for (const s2 of [-1, 1]) { const ex2 = fx + s2 * 3.2;
        if (cheer) { c.strokeStyle = "#1f2937"; c.lineWidth = 1.1; c.beginPath(); c.arc(ex2, -10.4, 1.7, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); }
        else { E(ex2, -11.2, 1.5, 1.7, "#1f2937"); E(ex2 + 0.5, -11.8, 0.5, 0.5, "#ffffff"); }
        if (L.beard) { c.fillStyle = L.brow; c.beginPath(); c.ellipse(ex2 + s2 * 0.5, cheer ? -14.2 : -13.4, 3, 1.4, s2 * 0.3, 0, 7); c.fill();
          c.strokeStyle = L.hairDk; c.lineWidth = 0.5; c.beginPath(); c.moveTo(ex2 - 2, -13.2); c.lineTo(ex2 + 2.4, -13.8); c.stroke(); }
        else { c.strokeStyle = L.brow; c.lineWidth = 0.55; c.lineCap = "round"; c.beginPath(); c.arc(ex2 + s2 * 0.3, cheer ? -11.4 : -10.8, 3.2, Math.PI * 1.3, Math.PI * 1.7); c.stroke();   // (a soft brow, a fine arch, high)
          if (L.lashes && !cheer) { c.strokeStyle = "#1f2937"; c.lineWidth = 0.4; c.beginPath(); c.moveTo(ex2 + s2 * 1.3, -12.4); c.quadraticCurveTo(ex2 + s2 * 2.1, -12.7, ex2 + s2 * 2.5, -13.3); c.stroke(); }   // (a lash flicked up at the outer corner)
          c.lineCap = "butt"; } }
      if (cheer) { c.fillStyle = "#7f1d1d"; c.beginPath(); c.arc(fx, -5, 3.4, 0.08, Math.PI - 0.08); c.closePath(); c.fill(); E(fx, -2.5, 1.9, 1, "#f472b6"); }   // (his smile, open wide)
      // (Gnome world; Matthew: "draw lips/mouth") his mouth, just showing under the moustache
      if (!cheer && L.beard) { E(fx, -3.3, 1.7, 0.75, "#d9776a"); c.strokeStyle = "#8b2a2a"; c.lineWidth = 0.9; c.lineCap = "round"; c.beginPath(); c.arc(fx, -5.0, 2.0, 0.4, Math.PI - 0.4); c.stroke(); c.lineCap = "butt"; }   // (Matthew: "let's have them generally look content")
      // (no beard: a smile under the nose, the lips just showing)
      if (!cheer && !L.beard) { E(fx, -4.7, 1.5, 0.6, "#d9776a"); c.strokeStyle = "#8b2a2a"; c.lineWidth = 0.75; c.lineCap = "round"; c.beginPath(); c.arc(fx, -6.6, 1.9, 0.45, Math.PI - 0.45); c.stroke(); c.lineCap = "butt"; }
      // the moustache, sweeping out from under the nose, and the round nose
      if (L.beard) { E(fx - 3.6, -6.4, 4.6, 2.2, L.hair, 0.35); E(fx + 3.6, -6.4, 4.6, 2.2, L.hair, -0.35);
        c.strokeStyle = L.hairDk; c.lineWidth = 0.6; c.beginPath(); c.moveTo(fx, -7); c.lineTo(fx - 6.5, -5.2); c.moveTo(fx, -7); c.lineTo(fx + 6.5, -5.2); c.stroke(); }
      const nz = L.nose, ny = L.beard ? -8.6 : -8.9; E(fx + (side ? 1 : 0), ny, nz, nz * 0.9, "#f0997d"); E(fx + (side ? 0.2 : -0.8), ny - 0.8 * nz / 2.9, 0.9 * nz / 2.9, 0.7 * nz / 2.9, "rgba(255, 255, 255, 0.6)");
      if (diving) {   // (and the mask over his eyes, its strap round the back of his head)
        c.strokeStyle = "#0f172a"; c.lineWidth = 1.3; c.beginPath(); c.moveTo(fx - 7, -11.5); c.lineTo(-9.5, -11); c.stroke();
        c.fillStyle = "#0284c7"; c.beginPath(); c.roundRect(fx - 7.5, -15.2, 15, 7.6, 3); c.fill();
        c.fillStyle = "rgba(224, 242, 254, 0.62)"; c.beginPath(); c.roundRect(fx - 6, -14, 12, 5.2, 2.2); c.fill();
        E(fx - 3.5, -13, 1.6, 0.7, "rgba(255, 255, 255, 0.85)", -0.3);
      }
    }
    if (back && diving) { c.strokeStyle = "#0f172a"; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-8, -11.5); c.lineTo(8, -11.5); c.stroke(); }
    // (Matthew: "hair hat") white hair curling out under the cap at each side, down to the sideburns
    if (!back) for (const s2 of [-1, 1]) { const hx2 = (side ? 1.5 : 0) + s2 * 8.2; for (const [dx, dy, r2] of [[0, -14.2, 2.1], [s2 * 1.1, -12.6, 1.7], [-s2 * 1.4, -14.8, 1.6]]) E(hx2 + dx, dy, r2, r2 * 0.85, L.hair);
      c.strokeStyle = L.hairDk; c.lineWidth = 0.5; c.beginPath(); c.arc(hx2, -14.2, 1.2, 0.3, 2.8); c.arc(hx2 + s2 * 1.1, -12.6, 0.9, 0.3, 2.8); c.stroke(); }
    // (the boy's fringe, over his brow under the cap; mom's and the girl's hair parted under theirs)
    if (!back && !L.beard) { const ox = side ? 1.5 : 0;
      if (L.fringe) { c.fillStyle = L.hair; c.beginPath(); c.moveTo(ox - 7.5, -14.6); for (let i = 0; i <= 6; i++) { const xx = ox - 7.5 + i * 2.5; c.quadraticCurveTo(xx + 1.25, -15.4, xx + 1.25 + (i < 6 ? 0.6 : 0), i % 2 ? -12.4 : -12.9); } c.lineTo(ox + 7.5, -14.6); c.closePath(); c.fill(); }
      else { c.fillStyle = L.hair; c.beginPath(); c.moveTo(ox - 7.6, -14.4); c.quadraticCurveTo(ox - 3.5, -14.6, ox, -13.2); c.quadraticCurveTo(ox + 3.5, -14.6, ox + 7.6, -14.4); c.lineTo(ox + 7.6, -15.4); c.lineTo(ox - 7.6, -15.4); c.closePath(); c.fill(); }
      if (L.pigtails) pigtails(); }
    // (the tall red cap, pulled down over the brows, its tip bending back)
    c.fillStyle = L.cap; c.beginPath(); c.moveTo(-10, -14.5); c.quadraticCurveTo(-7, -25, -1, -34); c.quadraticCurveTo(2, -36, 4, -32.5); c.quadraticCurveTo(7, -24, 10, -14.5); c.quadraticCurveTo(0, -16, -10, -14.5); c.fill();
    if (L.stripe) { c.save(); c.beginPath(); c.moveTo(-10, -14.5); c.quadraticCurveTo(-7, -25, -1, -34); c.quadraticCurveTo(2, -36, 4, -32.5); c.quadraticCurveTo(7, -24, 10, -14.5); c.quadraticCurveTo(0, -16, -10, -14.5); c.clip();
      c.strokeStyle = L.stripe; c.lineWidth = 2.4; c.beginPath(); for (let k = 0; k < 4; k++) { const y0 = -18.5 - k * 4.6; c.moveTo(-12, y0 + 1.6); c.quadraticCurveTo(0, y0 - 1.4, 12, y0 - 2.4); } c.stroke(); c.restore(); }   // (the girl's stripes round the cone)
    c.fillStyle = L.capDk; c.beginPath(); c.moveTo(3, -33); c.quadraticCurveTo(7, -24, 10, -14.5); c.quadraticCurveTo(6, -15.3, 4, -15.5); c.quadraticCurveTo(4, -24, 3, -33); c.fill();
    c.strokeStyle = "rgba(255, 255, 255, 0.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -17.5); c.quadraticCurveTo(-4, -26, -0.5, -32); c.stroke();
    c.strokeStyle = L.brim; c.lineWidth = 2; c.lineCap = "round"; c.beginPath(); c.moveTo(-9.6, -15.3); c.quadraticCurveTo(0, -16.8, 9.6, -15.3); c.stroke(); c.lineCap = "butt";   // (its brim)
    c.restore();
  }
  // (Matthew: "when the gnome is moving laterally, let's draw them in profile, like mario 3 as inspiration") The gnome from the
  // side, the way he goes, in the same cell of 40 units as the gnome facing us, its middle at x, y: his tall red cap leaning
  // back, its tip trailing; his round nose out in front, one eye under a bushy brow, the moustache sweeping back, the long
  // white beard down over his chest; his tunic and belt; the far arm swinging behind him, the near one holding the lantern out
  // ahead; his boots in a stride, a step every fifth of a second or so, his body bobbing; in the air, his legs tucked, the far
  // one back, the near one forward; with the diving gear, its tank on his back and its mask over his eye; swimming along, lying
  // forward into the stroke, his arms windmilling, his feet kicking
  function gnomeProfile(c, x, y, u, face, moving, ground, vy, now, diving, pose, who = null) {
    const L = heroLook(who);
    const swim = pose && pose.swim, stroke = swim && pose.stroke, p = now / 85, ride = !!(pose && pose.ride);
    const run = moving && ground && !swim, bob = run ? -Math.abs(Math.sin(p)) * 1.6 : 0;
    const E = (cx, cy, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, 7); c.fill(); };
    c.save(); c.translate(x, y); c.scale((face < 0 ? -1 : 1) * u / 40, u / 40); c.translate(0, bob);
    if (L.size !== 1) { c.translate(0, 19); c.scale(L.size, L.size); c.translate(0, -19); }
    if (stroke) { c.translate(0, 6); c.rotate(1.05); c.translate(0, -6); }
    else if (!ground && !swim) c.rotate(vy < 0 ? -0.08 : 0.06);
    else if (run) { c.translate(0, 18); c.rotate(0.08); c.translate(0, -18); }   // (leaning into the run)
    if (!swim && ground && !ride) E(0, 19 - bob, 12, 3.2, "rgba(0, 0, 0, 0.3)");
    // (the legs: a stride running; tucked in the air; kicking in the water; the far one darker, behind)
    const leg = (a, near) => { const hx = near ? 1.5 : -1.5, hy = 10, fx = hx + Math.sin(a) * 8, fy = hy + Math.cos(a) * 8;
      c.strokeStyle = near ? L.coatDk : L.legFar; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(hx, hy); c.lineTo(fx, fy); c.stroke();
      c.fillStyle = near ? "#5a3a22" : "#47301c"; c.beginPath(); c.roundRect(fx - 3.2, fy - 1.5, 9, 5, 2.4); c.fill();
      c.fillStyle = near ? "#7a5636" : "#64462c"; c.beginPath(); c.roundRect(fx - 3, fy - 2.8, 6, 2.6, 1.2); c.fill(); };
    const kick = stroke ? Math.sin(p * 2.2) * 0.45 : 0;
    const aNear = ride ? 0.6 : swim ? kick : !ground ? 0.75 : run ? Math.sin(p) * 1.0 : 0, aFar = ride ? 0.4 : swim ? -kick : !ground ? -0.55 : run ? -Math.sin(p) * 1.0 : 0;   // (riding: astride the saddle)
    // (the far arm, behind him: swinging opposite the near leg, or windmilling)
    const shoulder = [0, -1.5], armAt = a => [shoulder[0] + Math.sin(a) * 10, shoulder[1] + Math.cos(a) * 10];
    const farA = ride ? 1.55 : stroke ? p * 1.2 + Math.PI : run ? -aNear * 0.9 : !ground ? -2.3 : 0.3, nearA = ride ? 1.8 : stroke ? p * 1.2 : run ? 0.9 + aNear * 0.25 : !ground ? 2.2 : 1.1;   // (riding: the reins held out)
    if (diving) { c.fillStyle = "#facc15"; c.beginPath(); c.roundRect(-13, -7, 7, 17, 3.5); c.fill(); c.fillStyle = "#a16207"; c.fillRect(-11, -9.5, 3, 3); }
    { const [hx, hy] = armAt(farA); c.strokeStyle = L.coatDk; c.lineWidth = 4.5; c.lineCap = "round"; c.beginPath(); c.moveTo(-1, -1); c.lineTo(hx - 1, hy); c.stroke(); E(hx - 1, hy, 2.3, 2.3, "#e0b48a"); }
    leg(aFar, false);
    // (the tunic, the back of it shaded; the belt, the buckle in front)
    const hem = L.dress ? 16 : 13, fl = L.dress ? 1.5 : 0;
    c.fillStyle = L.coat; c.beginPath(); c.moveTo(-6, -3); c.lineTo(5.5, -3); c.quadraticCurveTo(9, 4, 10 + fl, hem); c.quadraticCurveTo(0, hem + 2, -9.5 - fl, hem); c.quadraticCurveTo(-8, 4, -6, -3); c.fill();
    c.fillStyle = L.coatDk; c.beginPath(); c.moveTo(-6, -3); c.lineTo(-2, -3); c.lineTo(-3, hem + 1); c.quadraticCurveTo(-7, hem + 0.8, -9.5 - fl, hem); c.quadraticCurveTo(-8, 4, -6, -3); c.fill();
    if (!L.dress) { c.fillStyle = "#5c3a1a"; c.fillRect(-9.2, 4.6, 19.2, 5); c.fillStyle = "#d9a93a"; c.beginPath(); c.roundRect(5.6, 3.9, 5, 6.4, 1.2); c.fill(); c.fillStyle = "#5c3a1a"; c.fillRect(7, 5.6, 2.2, 3); }
    else { c.fillStyle = L.apron; c.beginPath(); c.moveTo(2.5, 3); c.lineTo(8, 3); c.quadraticCurveTo(10.8, 9, 11.2, hem - 0.5); c.quadraticCurveTo(6, hem + 0.8, 2, hem); c.quadraticCurveTo(3, 9, 2.5, 3); c.fill();
      c.fillRect(-8.6, 2.4, 17, 2.2); E(-8.6, 3.5, 1.6, 1.3, L.apron); E(-9.6, 6, 0.9, 2.3, L.apron, 0.4); }   // (the apron, its strings tied in a bow at the back)
    leg(aNear, true);
    // (the head from the side: the white hair at the back, the ear, the face, the nose, the eye and brow, the moustache, the beard)
    if (L.braids) { c.fillStyle = L.hair2; c.beginPath(); c.moveTo(-3, -15); c.quadraticCurveTo(-8.5, -10, -7, -3); c.lineTo(-2, -4); c.closePath(); c.fill();
      for (let i = 0; i < 6; i++) { const t = i / 5, rr = 2 * (1 - 0.3 * t); E(-6 - t * 1.5, -4 + t * 10, rr, rr * 0.8, i % 2 ? L.hair2 : L.hair); } E(-7.6, 7.2, 1.5, 1, L.capDk); }   // (her braid, down her back)
    if (L.ponytail) { const sw = run ? Math.sin(p * 2) * 1.6 : stroke ? 1.5 : Math.sin(now / 400) * 0.4; c.fillStyle = L.hair2; c.beginPath(); c.moveTo(-6.6, -10); c.quadraticCurveTo(-11 - sw, -4, -9.5 - sw * 1.4, 3); c.quadraticCurveTo(-7.5 - sw, -3, -3.6, -8); c.closePath(); c.fill();
      c.strokeStyle = L.hairDk; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-5.5, -9.4); c.quadraticCurveTo(-9.6 - sw, -3.5, -9.2 - sw * 1.4, 2); c.stroke(); E(-5.6, -9.4, 1.4, 1.7, L.capDk, 0.4); }   // (the boy's ponytail)
    if (L.pigtails) { for (let i = 0; i < 4; i++) { const t = i / 3, rr = 2.2 * (1 - 0.3 * t); E(-7 - t * 4.5, -12 + t * 6, rr, rr * 0.8, i % 2 ? L.hair2 : L.hair); } E(-12.3, -5, 1.3, 2, L.hair, 0.5); E(-7.4, -11.4, 1.5, 1, L.cap); }   // (her pigtail, out behind)
    E(-4.6, -9.5, 3.4, L.braids || L.pigtails ? 6.2 : 5.4, L.hair2);
    E(2, -10.5, 6.6, 6.4, "#f2c9a0");
    if (!L.beard) E(4.6, -6.4, 4.1, 2.7, "#f2c9a0");   // (no beard: the jaw and chin)
    // (the sideburn, from the hair behind the temple down in front of the ear to the beard at the jaw; the ear over it)
    if (L.beard) { c.fillStyle = L.hair; c.beginPath(); c.moveTo(-4, -14); c.quadraticCurveTo(0.8, -13.6, 1.2, -9.5); c.quadraticCurveTo(1.6, -6.4, -0.2, -4.6); c.lineTo(-3.8, -6.2); c.quadraticCurveTo(-3.2, -10, -4, -14); c.fill(); }
    else if (L.fringe) { c.fillStyle = L.hair; c.beginPath(); c.moveTo(-4, -14.5); c.quadraticCurveTo(0, -14, 0.6, -11); c.lineTo(-2, -11.5); c.closePath(); c.fill(); }   // (his short hair, in front of the ear)
    if (!L.braids && !L.pigtails) E(-1.8, -10, 1.6, 2.2, "#e0b48a");
    else { c.fillStyle = L.hair; c.beginPath(); c.moveTo(-4.5, -14.5); c.quadraticCurveTo(1.5, -14.2, 1, -10); c.quadraticCurveTo(0.2, -7, -3.5, -5.5); c.quadraticCurveTo(-5, -10, -4.5, -14.5); c.fill(); }   // (her hair, over her ear)
    E(4.5, -8, 2.2, 1.6, "rgba(244, 114, 114, 0.45)");
    if (L.freckles) { c.fillStyle = "rgba(150, 85, 45, 0.55)"; for (const [fx3, fy3] of [[3.6, -8.6], [5, -7.8], [4, -7.2]]) { c.beginPath(); c.arc(fx3, fy3, 0.42, 0, 7); c.fill(); } }
    if (L.beard) { c.fillStyle = "#f8fafc"; c.beginPath(); c.moveTo(-2.5, -8); c.quadraticCurveTo(-4, 3, 3.5, 12); c.quadraticCurveTo(10.5, 3, 9.5, -6.5); c.quadraticCurveTo(3, -3, -2.5, -8); c.fill();
      c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.8; c.beginPath(); for (const bx of [0.5, 3, 5.5, 8]) { c.moveTo(bx, -4); c.quadraticCurveTo(bx * 0.75, 3, bx * 0.5 + 2, 9); } c.stroke();
      E(7.6, -4.2, 1.6, 0.95, "#8b2a2a"); E(7.9, -3.7, 1.3, 0.5, "#e58a7f");   // (his mouth, under the moustache)
      E(6.5, -6.3, 4.6, 2, L.hair, -0.25); }
    else { E(7.3, -5.2, 1.2, 0.55, "#d9776a"); c.strokeStyle = "#8b2a2a"; c.lineWidth = 0.7; c.lineCap = "round"; c.beginPath(); c.moveTo(6.2, -5.9); c.quadraticCurveTo(7.4, -5, 8.4, -5.9); c.stroke(); c.lineCap = "butt"; }   // (a smile)
    const nz = L.nose / 2.9; E(9.2 - (1 - nz) * 1.2, -8.8, 3.2 * nz, 2.8 * nz, "#f0997d"); E(8.6 - (1 - nz) * 1.2, -9.7, 0.9 * nz, 0.7 * nz, "rgba(255, 255, 255, 0.6)");
    E(5.4, -11.4, 1.3, 1.6, "#1f2937"); E(5.8, -12, 0.45, 0.45, "#ffffff");
    if (L.beard) { c.fillStyle = L.brow; c.beginPath(); c.ellipse(5.2, -13.5, 3, 1.3, -0.2, 0, 7); c.fill(); }
    else { c.strokeStyle = L.brow; c.lineWidth = 0.75; c.lineCap = "round"; c.beginPath(); c.arc(5.4, -11.2, 2.4, Math.PI * 1.25, Math.PI * 1.8); c.stroke();
      if (L.lashes) { c.strokeStyle = "#1f2937"; c.lineWidth = 0.45; c.beginPath(); c.moveTo(6.4, -12.6); c.lineTo(7.4, -13.4); c.moveTo(6.8, -12); c.lineTo(7.9, -12.5); c.stroke(); } c.lineCap = "butt"; }
    if (diving) { c.fillStyle = "#0284c7"; c.beginPath(); c.roundRect(2.5, -15, 7.5, 7, 2.6); c.fill(); c.fillStyle = "rgba(224, 242, 254, 0.62)"; c.beginPath(); c.roundRect(3.6, -14, 5.4, 5, 2); c.fill();
      c.strokeStyle = "#0f172a"; c.lineWidth = 1.3; c.beginPath(); c.moveTo(2.5, -11.5); c.lineTo(-6, -11); c.stroke(); }
    // (the cap: its brim over the brow, the cone leaning back, the tip bending down behind him)
    c.fillStyle = L.cap; c.beginPath(); c.moveTo(9.5, -13.6); c.quadraticCurveTo(6, -24, -1, -30); c.quadraticCurveTo(-6, -34.5, -11.5, -31.5); c.quadraticCurveTo(-8.5, -29.5, -8, -25); c.quadraticCurveTo(-8.5, -18, -8.5, -12); c.quadraticCurveTo(0, -15.4, 9.5, -13.6); c.fill();
    if (L.stripe) { c.save(); c.beginPath(); c.moveTo(9.5, -13.6); c.quadraticCurveTo(6, -24, -1, -30); c.quadraticCurveTo(-6, -34.5, -11.5, -31.5); c.quadraticCurveTo(-8.5, -29.5, -8, -25); c.quadraticCurveTo(-8.5, -18, -8.5, -12); c.quadraticCurveTo(0, -15.4, 9.5, -13.6); c.clip();
      c.strokeStyle = L.stripe; c.lineWidth = 2.4; c.beginPath(); for (let k = 0; k < 4; k++) { const y0 = -17.5 - k * 4.2; c.moveTo(-10, y0 + 1 + k * 0.6); c.quadraticCurveTo(0, y0 - 1, 10, y0 - 3 + k * 0.8); } c.stroke(); c.restore();
      c.strokeStyle = L.brim; c.lineWidth = 2; c.lineCap = "round"; c.beginPath(); c.moveTo(-8.3, -12.4); c.quadraticCurveTo(0, -15.2, 9.3, -13.8); c.stroke(); c.lineCap = "butt"; }
    c.fillStyle = L.capDk; c.beginPath(); c.moveTo(-8.5, -12); c.quadraticCurveTo(-8.5, -18, -8, -25); c.quadraticCurveTo(-8.5, -29.5, -11.5, -31.5); c.quadraticCurveTo(-5, -26, -4.5, -13.2); c.fill();
    c.strokeStyle = "rgba(255, 255, 255, 0.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(6, -16.5); c.quadraticCurveTo(3, -24, -2, -28.5); c.stroke();
    // (the near arm, the lantern held out ahead, glowing)
    { const [hx, hy] = armAt(nearA), lx = hx + 1.5, ly = hy - 1 + (run ? Math.sin(p * 2) * 0.8 : 0);
      c.strokeStyle = L.coat; c.lineWidth = 4.5; c.lineCap = "round"; c.beginPath(); c.moveTo(1.5, -1); c.lineTo(hx, hy); c.stroke(); E(hx, hy, 2.4, 2.4, "#f2c9a0");
      const gl = c.createRadialGradient(lx + 1, ly + 7, 0, lx + 1, ly + 7, 12); gl.addColorStop(0, "rgba(254, 240, 138, 0.75)"); gl.addColorStop(1, "rgba(254, 240, 138, 0)"); c.fillStyle = gl; c.beginPath(); c.arc(lx + 1, ly + 7, 12, 0, 7); c.fill();
      c.strokeStyle = "#1f2937"; c.lineWidth = 1.2; c.beginPath(); c.arc(lx + 1, ly + 2.5, 2.2, Math.PI, 0); c.stroke();
      c.fillStyle = "#1f2937"; c.beginPath(); c.roundRect(lx - 2.5, ly + 2.5, 7, 9, 1.5); c.fill(); c.fillStyle = "#fef08a"; c.beginPath(); c.roundRect(lx - 1.3, ly + 4, 4.6, 6, 1); c.fill(); }
    c.restore();
  }
  // ---- (Matthew, 2026-11-23: "let's spend more polygons on the trees above surface too", "more realism"; "the trees leaves
  // should use the fractal branches and pads from Messed Up Dress Up, not these circles that look quite prototypy";
  // "foreground trees should have crowns, not trunks that just end like stumps") The trees as Messed Up Dress Up grows them
  // (dress-up/js/10-nature.js leafyTree, pineTree, taperSvg; 09-backgrounds.js padInner; by Matthew Hammer and family, Apache
  // 2.0), by way of Gnome dig's canvas port of them (dig/app.js, copied here): a trunk flaring at its roots, curved tapering
  // limbs forking up and out, leaf pads (low scalloped clouds, shaded beneath, lit on top) at their tips, darker behind and
  // lighter in front; a pine's tiers of drooping boughs. Each tree painted once into a picture of its own (a sprite), at its
  // own height here, and drawn from it. (Matthew: "please get inspired by the artwork of Rien Poortvliet"): in the spirit of
  // his woods for Gnomes (Wil Huygen and Rien Poortvliet, 1976), our own pictures, none of his copied.
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
  // (Matthew: "Trees need some help, and polish, especially where the branches branch out; lots of sloppy geometry. Tree
  // branches are generally too straight, and under-detailed, especially when large", and the stair tree's crown, its limbs
  // fanning straight out of the flat top of its trunk) A tree's limbs, grown as wood grows: each limb a long curve (a cubic,
  // wavering, bending toward the light as it goes); at its end it forks as a living limb does: the leader carrying on nearly
  // as thick, one or two side limbs thinner, each starting inside its parent, flared, so the fork is one piece of wood, and a
  // collar of wood swelling over the join; a big limb puts out a side shoot partway along it, too. Drawn as wood is lit (from
  // above and the east): the bark, the shade along each limb's underside, the light along its top, the furrows of the bark
  // following the limb, a knot here and there and moss on the big ones, and twigs at the ends
  const cubicAt = (P, t) => { const m = 1 - t; return [m * m * m * P[0][0] + 3 * m * m * t * P[1][0] + 3 * m * t * t * P[2][0] + t * t * t * P[3][0], m * m * m * P[0][1] + 3 * m * m * t * P[1][1] + 3 * m * t * t * P[2][1] + t * t * t * P[3][1]]; };
  const cubicTan = (P, t) => { const m = 1 - t; return [3 * m * m * (P[1][0] - P[0][0]) + 6 * m * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]), 3 * m * m * (P[1][1] - P[0][1]) + 6 * m * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1])]; };
  function growLimbs(r, starts, o = {}) {
    const L = { segs: [], tips: [], mids: [], joints: [] }, up = o.up ?? 0.25, spread = o.spread ?? 0.6, shrink = o.shrink ?? 0.68, wob = o.wob ?? 0.15; let id = 0;
    const toward = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * f; };
    const grow = (x, y, a, len, w, lvl, flare, parent = -2) => { const k = ++id * 23, me = L.segs.length;
      const aE = toward(a, -Math.PI / 2, up) + (r(k) - 0.5) * 0.45, am = toward(a, aE, 0.5), ex = x + Math.cos(am) * len * 0.96, ey = y + Math.sin(am) * len * 0.96;
      const px = -Math.sin(am), py = Math.cos(am), v1 = (r(k + 1) - 0.5) * 2 * wob * len, v2 = (r(k + 2) - 0.5) * 2 * wob * len;
      const P = [[x, y], [x + Math.cos(a) * len * 0.36 + px * v1, y + Math.sin(a) * len * 0.36 + py * v1], [ex - Math.cos(aE) * len * 0.34 + px * v2, ey - Math.sin(aE) * len * 0.34 + py * v2], [ex, ey]];
      const w1 = w * (lvl === 0 ? 0.42 : 0.72); L.segs.push({ P, w0: w * flare, w1, lvl, k, parent });
      if (lvl === 0) { L.tips.push([ex, ey, aE]); return; }
      if (lvl === 1) L.mids.push([ex, ey]);
      L.joints.push([ex, ey, w1 * 0.58]);
      const bx = ex - Math.cos(aE) * w1 * 0.3, by = ey - Math.sin(aE) * w1 * 0.3, side = r(k + 6) < 0.5 ? -1 : 1, n = 1 + (r(k + 5) < 0.55 ? 1 : 0);
      grow(bx, by, aE + (r(k + 3) - 0.5) * 0.35, len * (0.72 + 0.12 * r(k + 4)), w1 * 0.86, lvl - 1, 1.12, me);
      for (let j = 0; j < n; j++) grow(bx, by, aE + (j === 0 ? side : -side) * (spread + 0.35 * r(k + 7 + j)), len * (shrink + 0.1 * r(k + 9 + j)), w1 * 0.64, lvl - 1, 1.2, me);
      if (lvl >= 2 && r(k + 12) < 0.7) { const t = 0.4 + 0.25 * r(k + 13), [sx, sy] = cubicAt(P, t), [tx, ty] = cubicTan(P, t), sd = r(k + 14) < 0.5 ? -1 : 1, wt = w + (w1 - w) * t;
        grow(sx, sy, Math.atan2(ty, tx) + sd * (0.75 + 0.3 * r(k + 15)), len * 0.5, wt * 0.46, lvl - 2, 1.3, me); }
    };
    for (const s0 of starts) grow(s0.x, s0.y, s0.a, s0.len, s0.w, s0.lvl, s0.flare || 1);
    return L;
  }
  function drawLimbs(g, L, bark, tile, px = 1) {
    const dk = mixHex(bark, "#000000", 0.5), lt = mixHex(bark, "#fff1d6", 0.4), N = 16, thin = 0.8 / px, LX = 0.45, LY = -0.89;
    const segs = [...L.segs].sort((a, b) => b.w0 - a.w0);
    for (const sg of segs) { const [mx, my] = cubicTan(sg.P, 0.5), md = Math.hypot(mx, my) || 1, flip = (-my / md) * LX + (mx / md) * LY > 0 ? -1 : 1, C = [];
      for (let i = 0; i <= N; i++) { const t = i / N, [x, y] = cubicAt(sg.P, t), [dx, dy] = cubicTan(sg.P, t), d = Math.hypot(dx, dy) || 1;
        C.push([x, y, -dy / d * flip, dx / d * flip, (sg.w0 + (sg.w1 - sg.w0) * Math.pow(t, 0.7)) / 2]); }
      sg.C = C; }
    const band = (C, a, b, fill) => { g.fillStyle = fill; g.beginPath(); C.forEach(([x, y, nx, ny, w], i) => i ? g.lineTo(x + nx * w * a, y + ny * w * a) : g.moveTo(x + nx * w * a, y + ny * w * a));
      for (let i = C.length - 1; i >= 0; i--) { const [x, y, nx, ny, w] = C[i]; g.lineTo(x + nx * w * b, y + ny * w * b); } g.closePath(); g.fill(); };
    for (const sg of segs) band(sg.C, -1, 1, bark);
    for (const [x, y, rx, ry] of L.joints) { g.fillStyle = bark; g.beginPath(); g.ellipse(x, y, rx, ry ?? rx, 0, 0, 7); g.fill(); }
    for (const sg of segs) { if (sg.w0 * px < 2.5) continue; const Cb = sg.C.slice(Math.round(N * (sg.base ?? 0.06)));
      band(Cb, 0.2, 1, "rgba(30,18,8,0.2)"); band(Cb, 0.6, 1, "rgba(30,18,8,0.2)"); g.globalAlpha = 0.4; band(Cb, -0.9, -0.42, lt); g.globalAlpha = 1; }
    for (const [x, y, rx, ry] of L.joints) { const R2 = Math.max(rx, ry ?? rx); if (R2 * px < 2) continue; const gr = g.createRadialGradient(x + LX * R2 * 0.4, y + LY * R2 * 0.4, R2 * 0.1, x, y, R2 * 1.05);
      gr.addColorStop(0, "rgba(255,240,214,0.16)"); gr.addColorStop(0.55, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(30,18,8,0.3)"); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry ?? rx, 0, 0, 7); g.fill(); }
    for (const sg of segs) { if (sg.w0 < 0.18 * tile) continue; const rr = seededR(sg.k + 3), n = Math.min(6, Math.max(2, Math.floor(sg.w0 / (0.11 * tile))));
      g.strokeStyle = dk; g.globalAlpha = 0.42; g.lineWidth = Math.max(thin, 0.028 * tile);
      for (let j = 0; j < n; j++) { const f = -0.8 + 1.6 * (j + 0.5) / n + (rr(j) - 0.5) * 0.15, t1 = 0.55 + 0.45 * rr(j + 9); let on = false; g.beginPath();
        sg.C.forEach(([x, y, nx, ny, w], i) => { const t = i / N; if (t < (sg.base ?? 0.15) || t > t1 || w * 2 < 0.07 * tile) return; const q = f * w + Math.sin(t * 9 + j * 1.7 + sg.k) * w * 0.07; if (on) g.lineTo(x + nx * q, y + ny * q); else { g.moveTo(x + nx * q, y + ny * q); on = true; } }); g.stroke(); }
      g.globalAlpha = 1;
      if (sg.w0 > 0.3 * tile && rr(20) < 0.45) { const [x, y, nx, ny, w] = sg.C[Math.floor(N * (0.3 + 0.4 * rr(21)))], a = Math.atan2(ny, nx) + Math.PI / 2;
        g.fillStyle = dk; g.globalAlpha = 0.6; g.beginPath(); g.ellipse(x + nx * w * 0.1, y + ny * w * 0.1, w * 0.3, w * 0.18, a, 0, 7); g.fill();
        g.globalAlpha = 0.5; g.strokeStyle = lt; g.lineWidth = Math.max(thin, 0.03 * tile); g.beginPath(); g.ellipse(x + nx * w * 0.1, y + ny * w * 0.1, w * 0.42, w * 0.28, a, 0, 7); g.stroke(); g.globalAlpha = 1; }
      if (sg.w0 > 0.35 * tile && rr(30) < 0.5) for (let q = 0; q < 9; q++) { const [x, y, nx, ny, w] = sg.C[Math.floor(N * (0.08 + 0.6 * rr(31 + q)))];
        g.fillStyle = ["#5a7a2a", "#6b8f32", "#4d6b22"][q % 3]; g.beginPath(); g.ellipse(x - nx * w * 0.82, y - ny * w * 0.82, (0.05 + 0.07 * rr(40 + q)) * tile, 0.035 * tile, Math.atan2(ny, nx) + Math.PI / 2, 0, 7); g.fill(); } }
    g.strokeStyle = mixHex(bark, "#000000", 0.2); g.lineCap = "round";
    L.tips.forEach(([x, y, a], i) => { const rr = seededR(i * 7 + 5); for (let j = 0; j < 3; j++) { const b = a + (j - 1) * 0.6 + (rr(j) - 0.5) * 0.3, l = (0.25 + 0.25 * rr(j + 3)) * tile;
      g.lineWidth = Math.max(thin, 0.04 * tile); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(b) * l * 0.5, y + Math.sin(b) * l * 0.5 - 0.05 * tile, x + Math.cos(b + 0.25) * l, y + Math.sin(b + 0.25) * l); g.stroke(); } });
    g.lineCap = "butt";
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
  function leafyFrame(seed, o = {}) {
    const r = seededR(seed), H2 = o.h ?? 320, wide = o.wide ?? 1, lean = (r(1) - 0.5) * 0.18, top = [Math.sin(lean) * H2 * 0.45, -H2 * 0.44];
    const L = growLimbs(r, [0, 1, 2].map(k => ({ x: top[0] + (k - 1) * 3, y: top[1] + 10 + 8 * r(25 + k), a: -Math.PI / 2 + (k - 1) * 0.7 * wide + (r(10 + k) - 0.5) * 0.3, len: H2 * (0.21 + 0.05 * r(20 + k)), w: 15, lvl: 1, flare: 1.25 })), { up: 0.22, spread: 0.55 * wide, shrink: 0.7, wob: 0.15 });
    L.segs.push({ P: [[0, 2], [top[0] * 0.15 + 4 * (r(3) - 0.5), -H2 * 0.15], [top[0] * 0.75 - 4 * (r(4) - 0.5), -H2 * 0.3], top], w0: 30, w1: 19, lvl: 3, k: seed, parent: -1 });
    return { L, top, r, H2, wide };
  }
  function leafyTree(c, seed, o = {}) {
    const r = seededR(seed), H2 = o.h ?? 320, wide = o.wide ?? 1, bark = o.bark ?? "#6b4a2b", dk = mixHex(bark, "#000000", 0.35);
    const greens = o.greens ?? ["#285e2a", "#2f7d32", "#3a8a3c", "#47a047", "#58b050"];
    const lean = (r(1) - 0.5) * 0.18, top = [Math.sin(lean) * H2 * 0.45, -H2 * 0.44];
    if (o.shadow !== false) { c.fillStyle = "rgba(0, 0, 0, 0.15)"; c.beginPath(); c.ellipse(0, 2, 70 * wide, 11, 0, 0, 7); c.fill(); }   // (Gnome world: none for a great tree's crown, up in the air)
    for (const e of [-1, 1]) { c.fillStyle = bark; c.beginPath(); c.moveTo(e * 10, -24); c.quadraticCurveTo(e * 16, -4, e * (30 + 8 * r(2 + e)), 2); c.lineTo(e * 6, 2); c.closePath(); c.fill(); }
    const L = leafyFrame(seed, o).L;
    drawLimbs(c, L, bark, o.tile ?? 25, o.px ?? 1); const tips = L.tips;
    if (o.marks) { c.fillStyle = "#292524"; for (let i = 0; i < 7; i++) { const q = 0.08 + i * 0.12, x = top[0] * q * 0.9, y = -H2 * 0.44 * q - 6; c.fillRect(x - 8 + (i % 2) * 6, y, 9, 3); } }   // (a birch's dark marks)
    if (o.bare) return;   // (Gnome world: the tree bare, its limbs seen when the gnome is under it)
    const pads = [];
    for (let i = 0; i < 4; i++) pads.push([top[0] + (r(30 + i) - 0.5) * 140 * wide, top[1] - 60 - 70 * r(34 + i), 0.55 + 0.2 * r(38 + i), 0]);
    tips.forEach(([x, y], i) => { pads.push([x + (r(40 + i) - 0.5) * 30, y - 16, 0.42 + 0.16 * r(50 + i), 1]); pads.push([x + (r(60 + i) - 0.5) * 40, y + 8, 0.36 + 0.14 * r(70 + i), 2]); });
    pads.sort((a, b) => a[3] - b[3] || a[1] - b[1]);
    pads.forEach(([x, y, sc, layer], i) => { const j = Math.floor(r(80 + i) * 8), sx = sc * (r(90 + i) < 0.5 ? -1 : 1) * wide;
      pad(c, j, x, y, sx, sc, greens[Math.min(greens.length - 1, layer + Math.floor(r(100 + i) * 3))]); });
  }
  // a pine: a trunk, then tiers of drooping boughs, ragged at their tips, darker underneath
  // (0.0.102; Matthew: "let's add more detail to the pine trees") A pine (200 high): its trunk tapering all the way up, furrowed,
  // lit on the east side, a few dead stubs low on it; in each tier, boughs out from the trunk to each side, curving down at their
  // ends, the back ones darker, the front lighter, each with a fringe of needle tufts hanging under it and needles catching the
  // light along its top; cones hanging under the upper boughs
  function pineTree(c, seed, color, n = 5) {
    const r = seededR(seed), dk = mixHex(color, "#000000", 0.35), lt = mixHex(color, "#8bc34a", 0.3), hi = mixHex(color, "#e6f5c8", 0.4);
    c.fillStyle = "#5e3d22"; c.beginPath(); c.moveTo(-7, 2); c.lineTo(-1.2, -188); c.lineTo(1.2, -188); c.lineTo(7, 2); c.fill();
    c.fillStyle = "rgba(255,228,196,0.16)"; c.beginPath(); c.moveTo(2, 2); c.lineTo(0.3, -186); c.lineTo(1.2, -186); c.lineTo(7, 2); c.fill();
    c.strokeStyle = "rgba(30,15,5,0.4)"; c.lineWidth = 0.8; c.beginPath(); for (let k = 0; k < 4; k++) { const x0 = -4.5 + k * 3; c.moveTo(x0, 2); for (let y = 0; y > -70; y -= 7) c.lineTo(x0 * (1 + y / 260) + (r(k * 30 + y) - 0.5) * 1.2, y - 7); } c.stroke();
    c.strokeStyle = "#4a3019"; c.lineCap = "round"; for (let k = 0; k < 3; k++) { const sd = k % 2 ? 1 : -1, y = -14 - k * 7; c.lineWidth = 1.6; c.beginPath(); c.moveTo(sd * 4, y); c.lineTo(sd * (12 + 6 * r(k + 60)), y - 3 - 3 * r(k + 61)); c.stroke(); }
    const bough = (sd, y0, len, droop, col, j, b) => { const tx = sd * len, ty = y0 + droop, mx = sd * len * 0.55, n2 = Math.max(5, Math.round(len / 4.5));
      const path = dy => { c.beginPath(); c.moveTo(0, y0 - 4 + dy); c.quadraticCurveTo(mx, y0 - 6 - droop * 0.15 + dy, tx, ty - 1.5 + dy);
        let px = tx, py = ty + 2 + dy;   // (the underside: uneven tufts of needles hanging, each a rounded scallop)
        for (let i = 1; i <= n2; i++) { const t = 1 - i / n2, x = tx * t, yb = y0 + droop * t * t + 3 + dy, hang = (3.5 + 4 * r(j * 97 + b * 13 + i)) * (0.55 + 0.45 * (1 - t));
          c.quadraticCurveTo((px + x) / 2 + sd * 1.2, Math.max(py, yb) + hang, x, yb); px = x; py = yb; }
        c.closePath(); };
      c.fillStyle = "rgba(0,0,0,0.24)"; path(3.5); c.fill(); c.fillStyle = col; path(0); c.fill();
      c.lineWidth = 0.8; c.globalAlpha = b > 1 ? 0.75 : 0.45; c.strokeStyle = hi; c.beginPath();   // (needles catching the light, inside the bough's top; darker ones along its middle)
      for (let i = 1; i < n2; i++) { const t = i / n2, x = tx * t, y = y0 - 1.5 - droop * 0.12 * Math.sin(Math.PI * t) + droop * t * t * 0.85; c.moveTo(x, y); c.lineTo(x + sd * 3, y + 1.6); c.moveTo(x + sd * 1.5, y + 0.4); c.lineTo(x + sd * 3.6, y - 0.6); } c.stroke();
      c.strokeStyle = dk; c.globalAlpha = 0.5; c.beginPath(); for (let i = 1; i < n2; i += 2) { const t = i / n2, x = tx * t, y = y0 + droop * t * t + 1; c.moveTo(x, y); c.lineTo(x + sd * 2.6, y + 2.2); } c.stroke(); c.globalAlpha = 1; };
    for (let j = 0; j < n; j++) {
      const u = j / n, y = -24 - u * 156, hw = 62 * (1 - u * 0.84), th = 60 - 22 * u, tip = y - th;
      for (let b = 0; b < 3; b++) for (const sd of [-1, 1]) { const f = (b + 1) / 3, len = hw * (0.55 + 0.45 * f) * (0.9 + 0.2 * r(j * 20 + b * 3 + sd)), y0 = tip + th * (0.22 + 0.62 * f) * 0.95, droop = th * (0.22 + 0.2 * r(j * 20 + b + 9));
        bough(sd, y0, len, droop, b === 0 ? dk : b === 1 ? color : lt, j, b * 2 + (sd > 0 ? 1 : 0)); }
      c.fillStyle = color; c.beginPath(); c.moveTo(0, tip - 2); c.lineTo(hw * 0.12, tip + th * 0.3); c.lineTo(-hw * 0.12, tip + th * 0.3); c.closePath(); c.fill();   // (the leader at its top)
      if (u > 0.35 && u < 0.9) for (const sd of [-1, 1]) if (r(j * 7 + sd + 300) < 0.35) { const cx = sd * hw * (0.55 + 0.25 * r(j + 310)), cy = tip + th * 0.8;
        c.fillStyle = "#7a4a26"; c.beginPath(); c.ellipse(cx, cy + 4, 1.8, 3.2, sd * 0.2, 0, 7); c.fill(); c.strokeStyle = "#4a2c14"; c.lineWidth = 0.5; c.beginPath(); for (let q = 0; q < 3; q++) { c.moveTo(cx - 1.6, cy + 2.3 + q * 1.7); c.lineTo(cx + 1.6, cy + 3 + q * 1.7); } c.stroke(); }
    }
    c.lineCap = "butt";
  }
  // (Matthew: "use this material to create a early 1990s game manual, as a zine"; "May need to add line-only drawing function")
  // Line art, for the manual's pictures and its coloring pages: the game's own drawing, through a canvas that draws each filled
  // shape white with a black outline, each thick stroke as an outlined tube and each thin one as a black line, text in black,
  // and leaves out what is only shading (a fill or a stroke fainter than half, a gradient all of whose colors are)
  const faintCol = col => { if (typeof col !== "string") return !!(col && col.faint); const m = /rgba?\(([^)]+)\)/.exec(col); if (!m) return false; const p = m[1].split(",").map(Number); return p.length === 4 && p[3] < 0.5; };
  const darkCol = col => { if (typeof col !== "string") return false; let r, g, b; const h = /^#([0-9a-f]{6})$/i.exec(col), m = /rgba?\(([^)]+)\)/.exec(col);
    if (h) { const n = parseInt(h[1], 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; } else if (m) { [r, g, b] = m[1].split(",").map(Number); } else return false;
    return 0.3 * r + 0.59 * g + 0.11 * b < 22; };   // (0.0.102: eyes and pupils black; the girl's black coat, 39, left open to color in)
  function lineCtx(real, lw = 1.3) {
    let faintFill = false, faintStroke = false, width = 1, darkFill = false;
    // (widths in the screen's pixels, whatever the drawing's own scale: the gnome is drawn at 40 to a tile, scaled)
    const sc = () => { const m = real.getTransform(); return Math.hypot(m.a, m.b) || 1; };
    const out = () => { real.strokeStyle = "#111"; real.lineWidth = lw / sc(); real.setLineDash([]); };
    const P = new Proxy(real, {
      get(t, k) {
        if (k === "fill") return (...a) => { if (real.globalAlpha < 0.5 || faintFill) return; real.save(); real.fillStyle = darkFill ? "#111" : "#fff"; real.fill(...a); if (!P.plain) { out(); a[0] instanceof Path2D ? real.stroke(a[0]) : real.stroke(); } real.restore(); };
        if (k === "stroke") return (...a) => { if (real.globalAlpha < 0.5 || faintStroke) return; real.save();
          const k = sc(), dev = width * k;
          if (dev > 3) { real.strokeStyle = "#111"; real.lineWidth = width + 2 * lw / k; a[0] instanceof Path2D ? real.stroke(a[0]) : real.stroke(); real.strokeStyle = "#fff"; real.lineWidth = width; }
          else { real.strokeStyle = "#111"; real.lineWidth = Math.max(0.8, Math.min(dev, lw)) / k; }
          a[0] instanceof Path2D ? real.stroke(a[0]) : real.stroke(); real.restore(); };
        if (k === "fillRect") return (x, y, w, h) => { if (real.globalAlpha < 0.5 || faintFill) return; real.save(); real.fillStyle = "#fff"; real.fillRect(x, y, w, h); if (!P.plain) { out(); real.strokeRect(x, y, w, h); } real.restore(); };
        if (k === "strokeRect") return (x, y, w, h) => { if (real.globalAlpha < 0.5 || faintStroke) return; real.save(); out(); real.strokeRect(x, y, w, h); real.restore(); };
        if (k === "plain") return t.__plain;
        if (k === "real") return real; if (k === "lw") return lw;   // (0.0.102: for a drawing that outlines several shapes as one, the rabbit's body)
        if (k === "fillText") return (...a) => { real.save(); real.fillStyle = "#111"; real.fillText(...a); real.restore(); };
        if (k === "createLinearGradient" || k === "createRadialGradient") return () => { let all = true; const g = { faint: true, addColorStop(o, c) { if (!faintCol(c)) all = false; const a = /rgba\(([^)]+)\)/.exec(c); g.faint = all || (o >= 0.99 && !!a && Number(a[1].split(",")[3]) < 0.15); } }; return g; };
        if (k === "drawImage") return (...a) => real.drawImage(...a);
        const v = real[k]; return typeof v === "function" ? v.bind(real) : v;
      },
      set(t, k, v) {
        if (k === "fillStyle") { faintFill = faintCol(v); darkFill = darkCol(v); return true; }
        if (k === "strokeStyle") { faintStroke = faintCol(v); return true; }
        if (k === "lineWidth") { width = v; return true; }
        if (k === "plain") { t.__plain = v; return true; }
        real[k] = v; return true;
      } });
    return P;
  }
  const spriteCache = new Map(), SPRITES = { painted: 0, strips: 0 };
  // (0.0.102: the trees three times as tall) A very big picture (over 6 million pixels: a great tree, the tall trees by it) is
  // kept in strips eight tiles tall, each painted the first time it is drawn, so only the strips in view are painted and held;
  // at most 40 million pixels of strips are kept (the oldest let go): a great tree a hundred tiles tall would be 15 million
  // pixels in one. The other pictures, whole, at most 48 million pixels of them (and 70 pictures)
  const STRIP_T = 8, BIG_PX = 6e6, STRIP_BUDGET = 40e6, WHOLE_BUDGET = 48e6, strips = new Map(); let stripPx = 0, wholePx = 0;
  const VIEW = { y0: -1e9, y1: 1e9 };   // (the rows in view, in the world's pixels, for skipping strips out of it: draw sets it)
  function forget(sp) { if (sp && sp.cv) { wholePx -= sp.w * sp.h; sp.cv = null; } if (!sp || !sp.strips) return; sp.strips.forEach((cv, i) => { const k = sp.key + "#" + i, e = strips.get(k); if (e) { stripPx -= e.px; strips.delete(k); } }); sp.strips = []; }
  function sprite(key, wT, hT, ox, oy, paint) {
    if (LINE) key = "line:" + key;
    let sp = spriteCache.get(key);
    if (sp && sp.T === T) { spriteCache.delete(key); spriteCache.set(key, sp); return sp; }
    forget(sp);
    const res = Math.min(T, LINE ? 64 : TCAP), W = Math.ceil(wT * res), Hp = Math.ceil(hT * res);
    if (W * Hp > BIG_PX) sp = { strips: [], sh: STRIP_T * res, w: W, h: Hp, ox, oy, res, T, key, paint, line: LINE };
    else { SPRITES.painted++;   // (counted, for the frame times: sprites painted afresh)
      const c = document.createElement("canvas"); c.width = W; c.height = Hp;
      const g0 = c.getContext("2d"), g = LINE ? lineCtx(g0) : g0; g0.translate(ox * res, oy * res); paint(g, res);
      sp = { cv: c, ox, oy, res, T, w: W, h: Hp }; wholePx += W * Hp; }
    spriteCache.set(key, sp);
    while ((spriteCache.size > 70 || wholePx > WHOLE_BUDGET) && spriteCache.size > 1) { const k0 = spriteCache.keys().next().value; forget(spriteCache.get(k0)); spriteCache.delete(k0); }
    return sp;
  }
  function stripOf(sp, i) {
    const k = sp.key + "#" + i; let cv = sp.strips[i];
    if (cv) { const e = strips.get(k); strips.delete(k); strips.set(k, e); return cv; }
    SPRITES.painted++; SPRITES.strips++;
    const h = Math.min(sp.sh, sp.h - i * sp.sh); cv = document.createElement("canvas"); cv.width = sp.w; cv.height = h;
    const g0 = cv.getContext("2d"), g = sp.line ? lineCtx(g0) : g0; g0.translate(sp.ox * sp.res, sp.oy * sp.res - i * sp.sh); sp.paint(g, sp.res);
    sp.strips[i] = cv; strips.set(k, { sp, i, px: sp.w * h }); stripPx += sp.w * h;
    while (stripPx > STRIP_BUDGET && strips.size > 1) { const [k0, e] = strips.entries().next().value; strips.delete(k0); e.sp.strips[e.i] = null; stripPx -= e.px; }
    return cv;
  }
  // (a picture's rows sy to sy + sh drawn at dx, dy, scaled by f: from its canvas, or from the strips they fall in)
  function blitRows(sp, sy, sh, dx, dy, f) {
    if (!sp.strips) { if (f === 1) ctx.drawImage(sp.cv, 0, sy, sp.w, sh, dx, dy, sp.w, sh); else ctx.drawImage(sp.cv, 0, sy, sp.w, sh, dx, dy, sp.w * f, sh * f); return; }
    for (let i = Math.floor(sy / sp.sh), e = sy + sh; i * sp.sh < e; i++) { const a = Math.max(sy, i * sp.sh), b = Math.min(e, (i + 1) * sp.sh, sp.h); if (b <= a) continue;
      const cv = stripOf(sp, i); if (f === 1) ctx.drawImage(cv, 0, a - i * sp.sh, sp.w, b - a, dx, dy + (a - sy), sp.w, b - a); else ctx.drawImage(cv, 0, a - i * sp.sh, sp.w, b - a, dx, dy + (a - sy) * f, sp.w * f, (b - a) * f); }
  }
  const drawSprite = (sp, x, y, k = 1) => { const f = T / sp.res * k; blitRows(sp, 0, sp.h, x - sp.ox * T * k, y - sp.oy * T * k, f); };
  const TREE_LOOK = { 0: { wide: 1.05 }, 2: { wide: 0.8, bark: "#e9e4dc", marks: true, greens: ["#4d7c0f", "#5a8f2a", "#6aa832", "#7cbf3a", "#93d04a"] },
    3: { wide: 0.75, bark: "#c9c7b3", greens: ["#5a7a1f", "#6f9228", "#86a83a", "#a3c24e", "#c2d86a"] }, 4: { wide: 1.25, bark: "#5e4630", greens: ["#3f5e2c", "#4f6f33", "#5f803b", "#74934a", "#8aa85a"] } };
  // (Matthew: "the willow trees should look much better"; "look at real examples", and three photographs of weeping willows)
  // A weeping willow as the photographs have it: a broad dome, as wide as it is tall or wider; a thick, gnarled trunk leaning a
  // little, mossy on its lit side, splitting low into sinuous limbs that arch up and out and droop at their tips; and the leaves
  // in tassels hanging in layers from the limbs, behind and in front, the curtain reaching nearly to the ground, gaps in it
  // showing the trunk and limbs inside; yellow-green, or (one in three) silvery blue-green; lit from the east, where the sun is.
  // In two parts: its back (the back curtains, the trunk, the limbs) and its front (the front curtains, the light on them)
  function taper3(g, p0, p1, p2, p3, w0, w1, fill) {
    const L = [], R = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14, mt = 1 - t;
      const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0], y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
      const dx = 3 * mt * mt * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]), dy = 3 * mt * mt * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
      const d = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * t) / 2; L.push([x - dy / d * w, y + dx / d * w]); R.push([x + dy / d * w, y - dx / d * w]); }
    poly(g, [...L, ...R.reverse()], fill);
  }
  function weepingWillow(g, t, hT, u, part) {
    const r = seededR(t.seed + 9), h = hT * u, W = h * (0.62 + 0.12 * r(1)), lean = (r(2) - 0.5) * u * 1.2, blue = t.seed % 3 === 0;
    const back = blue ? ["#3e5a55", "#4d6c66", "#5d7d76"] : ["#4a6418", "#5a7820", "#6b8a26"], front = blue ? ["#6f948b", "#86a9a0", "#a3c2b9"] : ["#86a92e", "#a2c23e", "#bcd75a"], hi = blue ? "#cfe0da" : "#dcec86";
    const bark = "#4e3e2c", moss = "rgba(120,140,60,0.45)";
    const top = x => -h * (0.98 - 0.55 * (x / W) ** 2) + (r(x / u * 1.7 + 3) - 0.5) * u * 0.6;   // (the dome)
    // (a tassel: a narrow strip of small leaves, tapering, hanging from y0 to y1, swaying a little; its edges ragged)
    const tassel = (x, y0, y1, col, wid) => { const n = Math.max(4, Math.round((y1 - y0) / (u * 0.22))), sway = (r(x * 1.3 + y0) - 0.5) * u * 0.5, L = [], R = [];
      for (let k = 0; k <= n; k++) { const q = k / n, cx = x + sway * q * q, cy = y0 + (y1 - y0) * q, w = wid * (1 - 0.75 * q) * (k % 2 ? 1.25 : 0.8); L.push([cx - w, cy]); R.push([cx + w, cy + u * 0.06]); }
      poly(g, [...L, ...R.reverse()], col); };
    const layer = (cols, y0off, gap, dw, step) => { for (let x = -W; x <= W; x += u * step) { if (r(x * 2.9 + y0off) < gap) continue;
      const xx = x + (r(x * 5.1) - 0.5) * u * 0.2, edge = Math.abs(xx) / W, y0 = top(xx) + y0off * h + r(x * 3.7) * u * 0.6;
      const y1 = -u * (0.15 + 0.9 * r(x * 7.3 + y0off)) - (1 - edge) * h * 0.08 * r(x * 1.1);
      if (y1 - y0 < u) continue; tassel(xx, y0, y1, cols[Math.floor(r(x * 4.3 + y0off) * 3)], u * dw); } };
    if (part === "back") {
      layer(back, 0, 0.08, 0.2, 0.26);
      // the trunk, gnarled and leaning, its foot flaring, moss on its lit side; the limbs, sinuous, arching out and drooping
      const fx = lean, fy = -h * 0.3;
      taper3(g, [0, u * 0.05], [u * 0.25, -h * 0.1], [lean * 0.5 - u * 0.2, -h * 0.2], [fx, fy], u * 1.05, u * 0.75, bark);
      for (const e of [-1, 1]) { g.fillStyle = bark; g.beginPath(); g.moveTo(e * u * 0.3, -u * 0.8); g.quadraticCurveTo(e * u * 0.45, -u * 0.15, e * u * 1.0, u * 0.05); g.lineTo(e * u * 0.1, u * 0.05); g.closePath(); g.fill(); }
      g.strokeStyle = "rgba(25,18,10,0.5)"; g.lineWidth = Math.max(1, u / 18);
      for (let j = 0; j < 5; j++) { const f = (j / 4 - 0.5) * 0.8; g.beginPath(); g.moveTo(f * u, 0); g.bezierCurveTo(f * u + u * 0.2, -h * 0.1, lean * 0.5 + f * u * 0.6, -h * 0.2, fx + f * u * 0.5, fy); g.stroke(); }
      g.fillStyle = moss; g.beginPath(); g.ellipse(u * 0.25, -h * 0.12, u * 0.18, h * 0.09, 0.1, 0, 7); g.fill();
      for (let k = 0; k < 5; k++) { const side = k - 2, a = -Math.PI / 2 + side * 0.5 + (r(k + 20) - 0.5) * 0.25, reach = W * (0.55 + 0.35 * r(k + 30));
        const p3 = [fx + Math.cos(a) * reach * 1.25, fy + Math.sin(a) * h * 0.5 + h * 0.12 * Math.abs(side) * 0.6];
        taper3(g, [fx, fy], [fx + Math.cos(a) * reach * 0.25, fy - h * (0.3 + 0.1 * r(k + 40))], [p3[0] * 0.8, p3[1] - h * 0.25], p3, u * (0.55 - 0.06 * Math.abs(side)), u * 0.1, bark);
        g.fillStyle = moss; g.beginPath(); g.ellipse(fx + Math.cos(a) * reach * 0.3 + u * 0.1, fy - h * 0.2, u * 0.12, u * 0.4, a + 1.6, 0, 7); g.fill();
        g.strokeStyle = bark; g.lineWidth = Math.max(1, u / 16); g.beginPath(); for (let j = 0; j < 4; j++) { const q = 0.45 + j * 0.14, x0 = fx + (p3[0] - fx) * q, y0 = fy - h * 0.28 + (p3[1] - fy + h * 0.28) * q;
          g.moveTo(x0, y0); g.quadraticCurveTo(x0 + (r(k * 9 + j) - 0.5) * u * 1.4, y0 - u * 0.6, x0 + (r(k * 7 + j) - 0.5) * u * 1.8, y0 + u * 0.9); } g.stroke(); }
      return; }
    // the curtains in front, gaps in them; the light along the east and the top
    layer(front, 0.06, 0.3, 0.22, 0.3);
    layer([front[2], hi, front[1]], 0.1, 0.62, 0.16, 0.34);
    g.globalAlpha = 0.55; for (let x = W * 0.1; x <= W; x += u * 0.4) { if (r(x * 8.1) < 0.4) continue; const y0 = top(x) + u * 0.2, y1 = y0 + h * (0.2 + 0.3 * r(x * 6.6)); tassel(x, y0, y1, hi, u * 0.1); } g.globalAlpha = 1;
  }
  // (two pictures of each tree: its back, seen always, and its front, faded away while the gnome is under the tree, so the
  // inside shows, as a cutaway (Matthew: "when we go under a tree, we should reveal the 'cut away'"; "same for other trees,
  // but especially willows since they have low hanging leaves"; "on the ground surface", "esp near water"): a willow's back
  // curtains, trunk and limbs, and its front curtains; another tree bare, its trunk and limbs, and whole)
  function tallCrown(t, hT, u) {
    const r = seededR(t.seed + 21), h = hT * u, topY = -h * 0.55;
    const tw = Math.max(0.9 * u, h * 0.026), tw1 = tw * 0.62, sd = r(4) < 0.5 ? -1 : 1;
    const L = growLimbs(r, [
      { x: 0, y: topY + 0.3 * u, a: -Math.PI / 2 + (r(1) - 0.5) * 0.2, len: h * 0.085, w: tw1 * 0.85, lvl: 3, flare: 1.2 },
      { x: -0.05 * u, y: topY + 1.0 * u, a: -Math.PI / 2 - 0.7 - 0.2 * r(2), len: h * 0.08, w: tw1 * 0.72, lvl: 3, flare: 1.3 },
      { x: 0.05 * u, y: topY + 1.8 * u, a: -Math.PI / 2 + 0.7 + 0.2 * r(3), len: h * 0.08, w: tw1 * 0.72, lvl: 3, flare: 1.3 },
      { x: sd * 0.1 * u, y: topY + 3.6 * u, a: -Math.PI / 2 + sd * (1.1 + 0.2 * r(5)), len: h * 0.06, w: tw1 * 0.5, lvl: 2, flare: 1.4 }], { up: 0.22, spread: 0.6, shrink: 0.66, wob: 0.15 });
    L.segs.push({ P: [[0, u * 0.05], [u * 0.2, topY * 0.33], [-u * 0.14, topY * 0.68], [0, topY + 0.2 * u]], w0: tw, w1: tw1, lvl: 4, k: t.seed + 7 });
    L.tw = tw; return L;
  }
  // (Matthew: "geometry/clipping bug?") A tall tree (by a great tree, its bridge's and its house's) grown as a great tree's crown
  // is: its trunk tapering up into three limbs leaving it at heights a little apart, and one lower, each forking again and
  // again (growLimbs), leaf pads of a tree's size at their ends and their inner forks; not Dress Up's small tree drawn large,
  // whose pads came out as slabs nine tiles wide and ran past the edges of its picture
  function paintTall(g, t, hT, u, part) {
    const r = seededR(t.seed + 21), h = hT * u, bark = "#6b4a2b", topY = -h * 0.55, greens = ["#1f4f24", "#285e2a", "#2f7d32", "#3a8a3c", "#47a047", "#58b050"];
    const L = tallCrown(t, hT, u), tw = L.tw;
    const padAt = (x, y, sc, col, j) => { g.save(); g.translate(x, y); const k = u * sc / 200; g.scale(k * (r(j) < 0.5 ? -1 : 1), k); pad(g, Math.floor(r(j + 1) * 8), 0, 0, 1, 1, col); g.restore(); };
    if (part !== "back") { L.mids.forEach(([x, y], i) => padAt(x + (r(i + 260) - 0.5) * u, y + u * 0.2, 2.6 + 0.6 * r(i + 270), greens[Math.floor(r(i + 280) * 2)], i * 5 + 1300));
      L.tips.forEach(([x, y], i) => padAt(x + (r(i + 300) - 0.5) * u * 0.6, y - u * 0.2, 2.1 + 0.7 * r(i + 310), greens[Math.floor(r(i + 320) * 2)], i * 5 + 400)); }
    for (const e of [-1, 1]) { g.fillStyle = bark; g.beginPath(); g.moveTo(e * tw * 0.35, -u * 0.9); g.quadraticCurveTo(e * tw * 0.5, -u * 0.12, e * (tw * 0.6 + u * 0.55), u * 0.05); g.lineTo(e * tw * 0.1, u * 0.05); g.closePath(); g.fill(); }
    drawLimbs(g, L, bark, u, 1);
    if (part !== "back") { L.mids.forEach(([x, y], i) => { if (r(i + 1400) < 0.5) padAt(x + (r(i + 1410) - 0.5) * u * 1.2, y + u * 0.3, 1.9 + 0.6 * r(i + 1420), greens[2 + Math.floor(r(i + 1430) * 2)], i * 5 + 1500); });
      L.tips.forEach(([x, y], i) => { padAt(x + (r(i + 500) - 0.5) * u, y + u * 0.45, 1.7 + 0.6 * r(i + 510), greens[2 + Math.floor(r(i + 520) * 3)], i * 5 + 600);
        if (r(i + 530) < 0.45) padAt(x + (r(i + 540) - 0.5) * u * 1.4, y - u * 0.6, 1.4 + 0.5 * r(i + 550), greens[3 + Math.floor(r(i + 560) * 3)], i * 5 + 700); }); }
  }
  function treeSprite(t, part = "front") {
    const hT = t.h * (t.tall ? 1.45 : 1) * (t.kind === 4 ? 1.1 : 1), wT = (t.tall ? 0.75 : t.kind === 1 ? 0.5 : t.kind === 4 ? 1.05 : 0.95 * (TREE_LOOK[t.kind] || TREE_LOOK[0]).wide) * hT + 2;
    if (t.tall) { const B = tallBox(t); return sprite(`tree:${t.kind}:${t.h}:${t.seed}:1:${part}`, B.w, B.h, B.ox, B.oy, (g, u) => paintTall(g, t, hT, u, part)); }
    const half = (t.kind === 1 ? 0.36 : t.kind === 4 ? 0.68 : 0.58 * (TREE_LOOK[t.kind] || TREE_LOOK[0]).wide) * hT + 1.5, up = (t.kind === 1 ? 1.2 : 1.08) * hT + 1.5;
    return sprite(`tree:${t.kind}:${t.h}:${t.seed}:0:${part}`, half * 2, up + 1, half, up, (g, u) => {
      if (t.kind === 4) { weepingWillow(g, t, hT, u, part); return; }
      if (t.kind === 1) { const sc = hT * 1.1 * u / 200; g.scale(sc, sc);
        if (part === "back") { g.fillStyle = "#5e3d22"; g.beginPath(); g.moveTo(-6, 2); g.lineTo(-2, -190); g.lineTo(2, -190); g.lineTo(6, 2); g.fill();
          g.strokeStyle = "#5e3d22"; g.lineWidth = 3; g.beginPath(); for (let j = 0; j < 7; j++) { const y = -30 - j * 22, w = 50 * (1 - j / 8); g.moveTo(0, y); g.lineTo(-w, y + 10); g.moveTo(0, y - 6); g.lineTo(w, y + 4); } g.stroke(); return; }
        pineTree(g, t.seed + 1, ["#1f5f3a", "#245f34", "#2a6b3c"][t.seed % 3], 6 + Math.floor(t.h / 5)); return; }
      const sc = hT * u / 330; g.scale(sc, sc); leafyTree(g, t.seed + 1, { ...(TREE_LOOK[t.kind] || TREE_LOOK[0]), bare: part === "back", tile: 330 / hT, px: sc });
    });
  }
  // (Matthew: "let's polish up the roots that reach the sloped ground --- we need branching into the ground, like mangrove
  // forests, in general") Each tree's roots branch out from its trunk above the ground and arch down into it, as a mangrove's
  // do: two or three each side, from a little way up the trunk, out a tile or two and down to the ground where they land (lower,
  // and longer, where the ground falls away, down a bank); by the water, more of them and longer, down into the water to the
  // bed. Each a tapering curve of bark, a rootlet off the bigger ones, its top lit
  const propLRU = [];   // (the trees whose prop roots are painted: the forty last seen)
  function drawPropRoots(t, x, y, s) {
    if (!t.alive || t.grow < 0.6) return;
    const key = s + ":" + y + (LINE ? ":line" : ""), P2 = t.props;
    if (!P2 || P2.key !== key) { const ox = 6 * s, oy = 2.5 * s, cv2 = document.createElement("canvas"); cv2.width = Math.ceil(12 * s); cv2.height = Math.ceil(8 * s);
      const g = cv2.getContext("2d"); g.translate(ox - x, oy - y); paintPropRoots(LINE ? lineCtx(g) : g, t, x, y, s); t.props = { key, cv: cv2, ox, oy };
      propLRU.push(t); if (propLRU.length > 40) { const o = propLRU.shift(); if (o !== t) o.props = null; } }
    ctx.drawImage(t.props.cv, x - t.props.ox, y - t.props.oy);
  }
  function paintPropRoots(ctx, t, x, y, s) {
    const r = seededR(t.seed * 3 + 17), hT = t.h * (t.tall ? 1.45 : 1) * (t.kind === 4 ? 1.1 : 1), trunkW = t.tall ? Math.max(0.9, hT * 0.026) : t.kind === 1 ? 0.3 : Math.min(1.1, 0.075 * hT);
    const wet = S.rivers.some(R => Math.abs(t.x + 0.5 - (R.x + R.w / 2)) < R.w / 2 + 7), per = (wet ? 4 : 2) + (t.kind === 4 ? 1 : 0), bark = t.kind === 2 ? "#cfc8bc" : t.kind === 3 ? "#b9b6a3" : "#5e4630";
    for (const sd of [-1, 1]) for (let k = 0; k < per; k++) { const q = j => r(sd * 50 + k * 7 + j);
      const x0 = x + sd * trunkW * (0.25 + 0.2 * q(1)) * s, y0 = y - (0.25 + (wet ? 0.9 : 0.5) * q(2)) * s;
      const reach = (wet ? 1.2 : 0.7) + (wet ? 1.6 : 0.9) * q(3) + trunkW * 0.5, ex = t.x + 0.5 + sd * reach, ec = Math.floor(ex);
      if (!inside(ec, surf0[ec] || 0)) continue;
      const R = riverAt(ec + 0.5); let ey = R ? R.bed[Math.max(0, Math.min(R.w - 1, ec - R.x))] : landY(ec); ey = Math.min(ey, landY(t.x) + 4) + 0.15;
      const X1 = ex * s, Y1 = ey * s, w0 = (0.12 + 0.08 * q(4)) * s * Math.min(1.4, 0.6 + trunkW * 0.5);
      const cx1 = x0 + (X1 - x0) * 0.45, cy1 = Math.min(y0, Y1) - (0.25 + 0.35 * q(5)) * s;
      taper(ctx, [x0, y0], [cx1, cy1], [X1, Y1], w0, w0 * 0.3, bark);
      ctx.strokeStyle = "rgba(255,240,215,0.22)"; ctx.lineWidth = Math.max(1, w0 * 0.25); ctx.beginPath(); ctx.moveTo(x0, y0 - w0 * 0.3); ctx.quadraticCurveTo(cx1, cy1 - w0 * 0.3, X1, Y1 - w0 * 0.2); ctx.stroke();
      if (q(6) < 0.6) { const t2 = 0.55 + 0.2 * q(7), mx = (1 - t2) * (1 - t2) * x0 + 2 * t2 * (1 - t2) * cx1 + t2 * t2 * X1, my = (1 - t2) * (1 - t2) * y0 + 2 * t2 * (1 - t2) * cy1 + t2 * t2 * Y1;
        const lx = mx + sd * (0.3 + 0.4 * q(8)) * s; taper(ctx, [mx, my], [lx - sd * 0.1 * s, my + 0.1 * s], [lx, Y1 + 0.05 * s], w0 * 0.45, w0 * 0.15, bark); } }
  }
  // (how far each tree is opened: the gnome under its crown, on the land or in the water beside it)
  function underTree(t) {
    const g = S.g; if (!g) return false;
    const hT = t.h * (t.kind === 4 ? 1.1 : 1), half = (t.kind === 1 ? 0.35 : t.kind === 4 ? 0.75 : 0.55) * hT, gx = g.x / 1000, gy = g.y / 1000, foot = surf0[t.x];
    return Math.abs(gx - (t.x + 0.5)) < half && gy <= foot + 2.5 && gy >= foot - hT * 0.8;
  }
  // (0.0.102; Matthew: "bushes scale up by 3x as well, and add detail where appropriate") A bush three times as big, about seven
  // tiles across and four and a half tall: woody stems fanning up out of the ground, a twig off each; leaf pads in a dome, the
  // back ones darker, the front lighter; small leaves catching the light on the front; and by its kind (World.plan's v), red
  // berries in clusters (2), white blossoms (1), or only leaves (0)
  const BUSH_GREENS = [["#1f4f24", "#285e2a", "#2f7d32", "#3a8a3c", "#47a047", "#58b050"], ["#2b4a1c", "#375f24", "#46742c", "#558a35", "#68a040", "#7fb54e"], ["#1d4630", "#265a3a", "#2f6e44", "#3b8250", "#48965c", "#5aaa6a"]];
  const bushSprite = b => sprite(`bush:${b.x}:${b.v}`, 9, 6, 4.5, 5.6, (g, u) => { const r = seededR(b.x * 7 + b.v), G = BUSH_GREENS[b.v % 3]; g.scale(u / 40, u / 40);   // (40 to a tile)
    g.fillStyle = "rgba(0,0,0,0.16)"; g.beginPath(); g.ellipse(0, 3, 140, 9, 0, 0, 7); g.fill();
    g.lineCap = "round"; g.strokeStyle = "#5a4128";
    for (let i = 0; i < 7; i++) { const x0 = (r(i + 70) - 0.5) * 36, a = (i / 6 - 0.5) * 2.1 + (r(i + 71) - 0.5) * 0.3, L = 100 + 50 * r(i + 72), x1 = x0 + Math.sin(a) * L, y1 = -Math.cos(a) * L * 0.85 - 18;
      g.lineWidth = 7 - (i % 3) * 1.5; g.beginPath(); g.moveTo(x0, 3); g.quadraticCurveTo(x0 + Math.sin(a) * L * 0.25, -L * 0.45, x1, y1); g.stroke();
      const tx = x0 + Math.sin(a) * L * 0.55, ty = -L * 0.5; g.lineWidth = 2.5; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + (a >= 0 ? 1 : -1) * (18 + 10 * r(i + 73)), ty - 20); g.stroke(); }
    for (let i = 0, n = 22; i < n; i++) { const k = i / n, ang = Math.PI * (0.06 + 0.88 * r(i)), rad = (0.35 + 0.65 * Math.sqrt(r(i + 10))) * (1 - k * 0.3);
      pad(g, Math.floor(r(i + 30) * 8), Math.cos(ang) * 118 * rad, 12 - Math.sin(ang) * 150 * rad * (0.8 + 0.2 * (1 - k)), 0.3 + 0.14 * r(i + 40), 0.9 + 0.5 * r(i + 50), G[Math.min(5, Math.floor(k * 6))]); }
    g.globalAlpha = 0.75; for (let i = 0; i < 46; i++) { const ang = Math.PI * (0.05 + 0.9 * r(i + 100)), rad = Math.sqrt(r(i + 110));
      g.fillStyle = r(i + 120) < 0.55 ? G[5] : "#9ccc65"; g.beginPath(); g.ellipse(Math.cos(ang) * 112 * rad, -Math.sin(ang) * 140 * rad - 8, 7, 3.2, (r(i + 130) - 0.5) * 2.4, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    if (b.v === 2) for (let i = 0; i < 13; i++) { const ang = Math.PI * (0.1 + 0.8 * r(i + 150)), rad = 0.3 + 0.65 * r(i + 160), cx = Math.cos(ang) * 110 * rad, cy = -Math.sin(ang) * 135 * rad - 10;
      for (let k = 0; k < 3; k++) { const bx = cx + (k - 1) * 6, by = cy + (k === 1 ? -5 : 0); g.fillStyle = "#b91c1c"; g.beginPath(); g.arc(bx, by, 5, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.arc(bx - 1.5, by - 1.8, 1.4, 0, 7); g.fill(); } }
    if (b.v === 1) for (let i = 0; i < 16; i++) { const ang = Math.PI * (0.08 + 0.84 * r(i + 170)), rad = 0.3 + 0.68 * r(i + 180), cx = Math.cos(ang) * 112 * rad, cy = -Math.sin(ang) * 138 * rad - 10;
      g.fillStyle = r(i + 190) < 0.3 ? "#f9d7e3" : "#fbfbf5"; for (let k = 0; k < 5; k++) { const a = k * 1.2566 + r(i + 200); g.beginPath(); g.ellipse(cx + Math.cos(a) * 4.5, cy + Math.sin(a) * 4.5, 4, 2.6, a, 0, 7); g.fill(); }
      g.fillStyle = "#f2c12e"; g.beginPath(); g.arc(cx, cy, 2.2, 0, 7); g.fill(); } });
  // (a felled tree: falling for a second, then a stump; a sapling grows, its picture drawn small)
  function drawTree(t, x, y) {
    const c = ctx;
    if (!t.alive) {
      const f = Math.min(1, (S.frame - t.fallAt) / 50);
      c.fillStyle = "#5e4630"; c.fillRect(x - 0.2 * T, y - 0.35 * T, 0.4 * T, 0.35 * T); c.fillStyle = "#d9b98a"; c.beginPath(); c.ellipse(x, y - 0.35 * T, 0.2 * T, 0.08 * T, 0, 0, 7); c.fill();
      c.strokeStyle = "#a8875e"; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y - 0.35 * T, 0.1 * T, 0.04 * T, 0, 0, 7); c.stroke();
      if (f < 1) { c.save(); c.translate(x, y - 0.35 * T); c.rotate((t.fallDir || 1) * f * Math.PI / 2); c.globalAlpha = 1 - f * 0.6; drawSprite(treeSprite(t), 0, 0.35 * T); c.restore(); }
      return; }
    const k = t.tall ? 1 : t.grow;
    t.open = (t.open || 0) + ((underTree(t) ? 1 : 0) - (t.open || 0)) * 0.12;
    const lean = sway(t.seed, t.kind === 1 ? 0.6 : t.kind === 4 ? 0.8 : 1);
    // (in bands, each pushed across by the sway: a willow's front curtains in seven, its back in four, a tree in six; ten each had
    // cost 4 ms a willow a frame)
    if (t.open > 0.02 || t.kind === 4) { drawSwaying(treeSprite(t, "back"), x, y, k, lean, false, 4); ctx.globalAlpha = 1 - 0.85 * t.open; }
    drawSwaying(treeSprite(t, "front"), x, y, k, t.kind === 4 ? lean * 1.8 : lean, t.kind === 4, t.kind === 4 ? 7 : 6); ctx.globalAlpha = 1;
  }
  // (Matthew: "let's draw more flowers that also are affected by wind"; "esp strong wind blows the flowers dramatically") The
  // flowers of a tile (World.plan: a daisy, a poppy, a bluebell, a buttercup, a lupine; one to three of them), each on its stem,
  // bowing the way the wind blows and fluttering at its own pace; in a strong wind bent right over, their petals streaming
  // out behind, some blown off
  const PETAL = ["#fbfbf7", "#d7261e", "#5b6fd6", "#f6c915", "#9b5bd1"];
  function drawFlowers(f, x0, y0, now) {
    const c = ctx, s = T, w = S.windNow || 0, aw = Math.min(1.4, Math.abs(w));
    // (0.0.102; Matthew: "flowers get bigger, since gnomes are not people; they are the size of about 6 to 12 inches, like the
    // height of a small flower") each about as tall as a gnome, or taller (a lupine): twice as tall as before, their heads and leaves
    // twice the size, fewer to a tile
    const n = f.n;
    for (let k = 0; k < n; k++) {
      const seed = f.x * 7 + k * 13, x = x0 + (k - (n - 1) / 2) * (1.1 / n) * s + ((seed % 5) - 2) * 0.05 * s, h = s * (0.85 + 0.22 * (seed % 4)) * (f.v === 4 ? 1.3 : 1);
      const flutter = Math.sin(now / (330 - 140 * Math.min(1, aw)) + seed * 0.7), bend = Math.max(-1.35, Math.min(1.35, w * 1.05 + (0.1 + 0.42 * aw) * flutter * 0.6));
      const tx = x + Math.sin(bend) * h, ty = y0 - Math.cos(bend) * h;
      c.strokeStyle = "#4d7c0f"; c.lineWidth = Math.max(1, s * 0.06); c.beginPath(); c.moveTo(x, y0); c.quadraticCurveTo(x + Math.sin(bend) * h * 0.25, y0 - h * 0.62, tx, ty); c.stroke();
      c.fillStyle = "#5a8f2a"; c.beginPath(); c.ellipse(x + Math.sin(bend) * h * 0.18 + s * 0.1, y0 - h * 0.35, s * 0.14, s * 0.045, -0.6 + bend, 0, 7); c.fill();
      c.fillStyle = "#4d7c0f"; c.beginPath(); c.ellipse(x + Math.sin(bend) * h * 0.1 - s * 0.09, y0 - h * 0.2, s * 0.12, s * 0.04, 0.6 + bend, 0, 7); c.fill();
      c.save(); c.translate(tx, ty); c.rotate(bend); c.scale(2.6, 2.6);
      const stream = Math.max(0, aw - 0.55) * 1.6 * Math.sign(w);   // (in a strong wind, the petals drawn out downwind)
      const petal = (a, len, wid, col) => { c.save(); c.rotate(a); c.translate(0, -len / 2); c.scale(1 + Math.abs(stream) * 0.8, 1); c.fillStyle = col; c.beginPath(); c.ellipse(stream * s * 0.03, 0, wid, len / 2, 0, 0, 7); c.fill(); c.restore(); };
      if (f.v === 0 || f.v === 3) { const n = f.v === 0 ? 8 : 5; for (let j = 0; j < n; j++) petal(j * 6.283 / n + (stream > 0 ? 0.3 : stream < 0 ? -0.3 : 0), s * (f.v === 0 ? 0.13 : 0.09), s * (f.v === 0 ? 0.03 : 0.045), PETAL[f.v]);
        c.fillStyle = f.v === 0 ? "#f2c12e" : "#e8a50c"; c.beginPath(); c.arc(0, 0, s * 0.04, 0, 7); c.fill(); }
      else if (f.v === 1) { for (const a of [-0.9, -0.3, 0.3, 0.9]) petal(a, s * 0.13, s * 0.07, PETAL[1]); c.fillStyle = "#1f1a17"; c.beginPath(); c.arc(0, -s * 0.03, s * 0.035, 0, 7); c.fill(); }
      else if (f.v === 2) { c.strokeStyle = "#4d7c0f"; c.lineWidth = Math.max(1, s * 0.025); for (let j = 0; j < 3; j++) { const bx = (j - 1) * s * 0.06, by = j * s * 0.07; c.beginPath(); c.moveTo(0, by); c.quadraticCurveTo(bx + s * 0.05, by, bx + s * 0.07, by + s * 0.06); c.stroke();
        c.fillStyle = PETAL[2]; c.beginPath(); c.moveTo(bx + s * 0.03, by + s * 0.05); c.quadraticCurveTo(bx + s * 0.07, by + s * 0.17, bx + s * 0.11, by + s * 0.05); c.closePath(); c.fill(); } }
      else { for (let j = 0; j < 7; j++) { c.fillStyle = j < 2 ? "#c69ae8" : PETAL[4]; c.beginPath(); c.ellipse((j % 2 ? 1 : -1) * s * 0.025, -j * s * 0.045, s * 0.035 * (1 + Math.abs(stream) * 0.5), s * 0.025, 0, 0, 7); c.fill(); } }
      c.restore();
      if (aw > 0.85 && Math.random() < 0.004 * aw && S.leaves.length < 160) S.leaves.push({ x: tx / s, y: ty / s, vy: 0.002, a: Math.random() * 6, life: 0, col: PETAL[f.v], petal: true });
    }
  }
  // (Matthew: "rivers creeks and so on -- -should have aquatic plants anchored on the bottom, sometimes"; "let's also have lily
  // pads that float on top with roots that extend down into the pond bed (or very edge of river)"; "lily pads have locus flowers
  // --- realistic ones") Each river's plants, placed once from the river itself: here and there on its bed tape grass (long
  // ribbons, where it is deep), pondweed (a stem of oval leaves) and milfoil (a stem in feathery whorls); in the shallows at its
  // edges reeds and bulrushes standing up out of the water; and where the water is five rows deep or less, toward the banks,
  // clumps of lily pads, each pad floating on the waves on its stem from a rhizome rooted in the bed; over some a lotus, its
  // bloom held up out of the water on its own stalk, or a bud. None where a lodge stands.
  function plantRiver(R) {
    const r = seededR(R.x * 31 + R.w * 7 + R.kind), P = []; let j = 0; const q = () => r(j++);
    for (let k = 0; k < R.w; k++) { const c = R.x + k, depth = R.bed[k] - R.level, edge = Math.min(k, R.w - 1 - k);
      if (S.lodges.some(L => L.river === R && c >= L.x - 1 && c <= L.x + L.w)) continue;   // (a dam spans the channel, behind the water: plants grow before it)
      if (edge <= 1 && depth <= 3 && q() < 0.7) P.push({ kind: "reed", k, x: c + 0.2 + q() * 0.6, n: 3 + Math.floor(q() * 4), cat: q() < 0.65, seed: q() * 100 });
      else if (depth >= 1 && q() < 0.42) { const v = q(); P.push({ kind: depth >= 4 && v < 0.5 ? "tape" : v < 0.78 ? "pondweed" : "milfoil", k, x: c + 0.15 + q() * 0.7, n: 4 + Math.floor(q() * 5), hgt: 0.45 + q() * 0.4, seed: q() * 100 }); }
      if (depth >= 1 && depth <= 5 && edge <= 4 && q() < 0.3) { const n = 2 + Math.floor(q() * 3), pads = [];
        for (let i = 0; i < n; i++) pads.push({ x: Math.max(R.x + 0.4, Math.min(R.x + R.w - 0.4, c + 0.5 + (i - (n - 1) / 2) * (0.7 + q() * 0.35))), rx: 0.34 + q() * 0.2, notch: q() * 6.28, seed: q() * 100 });
        P.push({ kind: "lily", k, x: c + 0.5, pads, lotus: q() < 0.5 ? (q() < 0.72 ? "bloom" : "bud") : null, lx: c + 0.3 + q() * 0.4, seed: q() * 100 }); } }
    R.plants = P;
  }
  // (the water's surface over x, in tiles, as the water is drawn: the same waves)
  const waterY = (R, x, now) => { const ww = S.windNow || 0, amp = 0.02 + 0.09 * Math.min(1.2, Math.abs(ww)), ph = now / 380 * (ww >= 0 ? -1 : 1); return R.level + amp * Math.sin(x * 1.9 + ph) + amp * 0.4 * Math.sin(x * 4.3 + ph * 1.7); };
  // (the ground under x, in tiles: the first solid tile down from the water's surface, on a slope its diagonal under x; -1, none
  // within the bed's depth and two more, as where the bed was dug away)
  const bedOf = (R, x) => { const c = Math.floor(x), fx = x - c; if (c < 0 || c >= WW) return -1; const k = Math.max(0, Math.min(R.w - 1, c - R.x)), lim = (R.bed[k] ?? R.level) + 3;
    for (let r = Math.max(0, R.level); r <= lim && r < WH; r++) { const i = at(c, r); if (mat[i] === AIR) continue; const sh = shape[i]; return sh === 1 ? r + 1 - fx : sh === 2 ? r + fx : r; } return -1; };
  // under the water's surface, before the water is laid over them: the plants on the bed, the reeds, the lilies' stems and roots,
  // the lotus's stalk
  function drawRiverUnder(R, s, now) {
    const c = ctx, cur = Math.sin(now / 1700 + R.x) * 0.5 + 0.5;   // (the current, now stronger, now weaker)
    for (const P of R.plants) { const bed = bedOf(R, P.x); if (bed < 0) continue; const x0 = P.x * s, y0 = bed * s + s * 0.08, depth = bed - R.level;
      if (P.kind === "tape") { for (let i = 0; i < P.n; i++) { const h = P.hgt * depth * (0.65 + 0.35 * Math.sin(P.seed + i * 2.1) ** 2) * s, sw = (0.12 + 0.18 * cur) * Math.sin(now / 900 + P.seed + i * 0.8) + 0.12, bx = x0 + (i - P.n / 2) * 0.05 * s;
          taper(c, [bx, y0], [bx + sw * h * 0.35, y0 - h * 0.55], [bx + sw * h * 0.9, y0 - h], s * 0.06, s * 0.015, i % 3 === 0 ? "#5fb34a" : i % 3 === 1 ? "#86c95a" : "#4a9d3e"); } }
      else if (P.kind === "pondweed" || P.kind === "milfoil") { const h = P.hgt * depth * s, sw = (0.08 + 0.1 * cur) * Math.sin(now / 1100 + P.seed) + 0.06;
        const at2 = t => [x0 + sw * h * t * t, y0 - h * t];
        c.strokeStyle = P.kind === "pondweed" ? "#8a9c38" : "#6aa84a"; c.lineWidth = Math.max(1, s * 0.03); c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0, y0 - h * 0.5, ...at2(1)); c.stroke();
        const m = P.n + 3;
        if (P.kind === "pondweed") for (let i = 1; i < m; i++) { const t = i / m, [lx, ly] = at2(t), side = i % 2 ? 1 : -1, a = side * (0.9 - 0.4 * t) - sw;
          c.fillStyle = i % 3 === 0 ? "#b2c447" : "#93b83a"; c.beginPath(); c.ellipse(lx + side * s * 0.09, ly, s * 0.12 * (1 - 0.3 * t), s * 0.045, a, 0, 7); c.fill(); }
        else { c.strokeStyle = "#9bd86e"; c.lineWidth = Math.max(1, s * 0.018); c.beginPath(); for (let i = 1; i < m; i++) { const t = i / m, [lx, ly] = at2(t), z = s * 0.14 * (1 - 0.4 * t);
            for (let a = 0; a < 6; a++) { const an = a * Math.PI / 3 + i; c.moveTo(lx, ly); c.lineTo(lx + Math.cos(an) * z, ly + Math.sin(an) * z * 0.45 - z * 0.15); } } c.stroke(); } }
      else if (P.kind === "reed") { const top = R.level - (0.7 + 0.5 * Math.sin(P.seed) ** 2), lean = sway(P.seed, 0.6);
        for (let i = 0; i < P.n; i++) { const h = (bed - top) * s * (0.75 + 0.25 * Math.sin(P.seed + i * 1.7) ** 2), bx = x0 + (i - P.n / 2) * 0.06 * s, tx = bx + lean * h * 0.9 + (i - P.n / 2) * 0.05 * s;
          taper(c, [bx, y0], [bx + (tx - bx) * 0.3, y0 - h * 0.6], [tx, y0 - h], s * 0.07, s * 0.01, i % 2 ? "#5d8a32" : "#7aa23e"); }
        if (P.cat) { const h = (bed - top + 0.35) * s, tx = x0 + lean * h * 0.9;
          c.strokeStyle = "#6a7d34"; c.lineWidth = Math.max(1, s * 0.035); c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0, y0 - h * 0.6, tx, y0 - h); c.stroke();
          c.save(); c.translate(tx, y0 - h); c.rotate(lean * 0.9); c.fillStyle = "#6b4226"; c.beginPath(); c.roundRect(-s * 0.06, s * 0.02, s * 0.12, s * 0.34, s * 0.06); c.fill();
          c.fillStyle = "rgba(255,255,255,0.12)"; c.fillRect(-s * 0.035, s * 0.05, s * 0.025, s * 0.28); c.strokeStyle = "#8a7a50"; c.lineWidth = Math.max(1, s * 0.015); c.beginPath(); c.moveTo(0, s * 0.02); c.lineTo(0, -s * 0.16); c.stroke(); c.restore(); } }
      else if (P.kind === "lily") {
        // (the rhizome along the bed, its roots down into it; a stem up to each pad, and to the lotus)
        c.strokeStyle = "#5a4630"; c.lineWidth = Math.max(1, s * 0.07); c.lineCap = "round"; c.beginPath(); c.moveTo(x0 - s * 0.3, y0); c.quadraticCurveTo(x0, y0 - s * 0.05, x0 + s * 0.3, y0 + s * 0.02); c.stroke();
        c.strokeStyle = "rgba(90,70,48,0.8)"; c.lineWidth = Math.max(1, s * 0.015); c.beginPath(); for (let i = 0; i < 6; i++) { const rx = x0 + (i - 2.5) * s * 0.1; c.moveTo(rx, y0 + s * 0.02); c.quadraticCurveTo(rx + Math.sin(P.seed + i) * s * 0.08, y0 + s * 0.2, rx + Math.sin(P.seed + i * 2) * s * 0.12, y0 + s * (0.3 + 0.15 * Math.sin(i + P.seed) ** 2)); } c.stroke();
        c.strokeStyle = "#7d8f3a"; c.lineWidth = Math.max(1, s * 0.025);
        for (const pd of P.pads) { const py = waterY(R, pd.x, now) * s; c.beginPath(); c.moveTo(x0 + (pd.x - P.x) * s * 0.25, y0); c.bezierCurveTo(x0 + (pd.x - P.x) * s * 0.4, y0 - (y0 - py) * 0.4, pd.x * s + Math.sin(now / 1300 + pd.seed) * s * 0.15, py + (y0 - py) * 0.3, pd.x * s, py + s * 0.03); c.stroke(); }
        if (P.lotus) { const fy = (waterY(R, P.lx, now) - (P.lotus === "bloom" ? 0.85 : 0.65)) * s, lean = sway(P.seed, 0.5), fx = P.lx * s + lean * s * 0.6;
          c.strokeStyle = "#6f8a3a"; c.lineWidth = Math.max(1, s * 0.035); c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(x0, y0 - (y0 - fy) * 0.5, fx - lean * s * 0.4, fy + (y0 - fy) * 0.3, fx, fy); c.stroke();
          P.at = [fx, fy, lean]; } else P.at = null;
        c.lineCap = "butt"; } }
  }
  // over the water: the lily pads floating, rising and falling on the waves, each a flattened disc with its notch, its veins and
  // its sheen; and the lotus over them
  function drawRiverOver(R, s, now) {
    const c = ctx;
    for (const P of R.plants) { if (P.kind !== "lily" || bedOf(R, P.x) < 0) continue;
      for (const pd of P.pads) { const x = pd.x * s, y = waterY(R, pd.x, now) * s, rx = pd.rx * s, ry = rx * 0.24, tilt = (waterY(R, pd.x + 0.2, now) - waterY(R, pd.x - 0.2, now)) * 1.2;
        c.save(); c.translate(x, y); c.rotate(tilt);
        c.fillStyle = "#2f5a22"; c.beginPath(); c.ellipse(0, ry * 0.45, rx, ry, 0, 0, 7); c.fill();   // (its rim, under)
        const n0 = pd.notch, gap = 0.32; c.fillStyle = "#4f8f35"; c.beginPath(); c.moveTo(0, 0); c.ellipse(0, 0, rx, ry, 0, n0 + gap / 2, n0 + Math.PI * 2 - gap / 2); c.closePath(); c.fill();
        c.strokeStyle = "rgba(170,210,120,0.55)"; c.lineWidth = Math.max(1, s * 0.012); c.beginPath(); for (let v = 0; v < 7; v++) { const a = n0 + gap + v * (Math.PI * 2 - 2 * gap) / 6; c.moveTo(0, 0); c.lineTo(Math.cos(a) * rx * 0.85, Math.sin(a) * ry * 0.85); } c.stroke();
        c.strokeStyle = "rgba(220,240,200,0.5)"; c.beginPath(); c.ellipse(0, 0, rx * 0.92, ry * 0.8, 0, Math.PI * 1.1, Math.PI * 1.75); c.stroke();
        c.restore(); }
      if (P.at) lotus(c, P.at[0], P.at[1], s * (P.lotus === "bud" ? 0.32 : 0.44), P.at[2], P.lotus === "bud", P.seed, now); }
  }
  // (Matthew: "lily pads have locus flowers --- realistic ones") A sacred lotus from the side: its petals broad and pointed,
  // white at the base flushing to rose at the tips, each veined; the back petals splayed, the outer ones opened out level,
  // the inner ones upright round the flat-topped seed pod, yellow-green and pitted, a ring of golden stamens round it; two
  // front petals over it all; green sepals under. A bud: a tight rose teardrop on its green cup.
  function lotus(c, x, y, z, lean, bud, seed, now) {
    c.save(); c.translate(x, y); c.rotate(lean * 0.6 + Math.sin(now / 1500 + seed) * 0.03);
    const petal = (a, len, wid, deep, front) => { c.save(); c.rotate(a); const g = c.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, "#fff7fa"); g.addColorStop(0.55, deep ? "#f6b9cf" : "#fbd3e1"); g.addColorStop(1, deep ? "#d9467f" : "#e8709c");
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-wid, -len * 0.25, -wid * 0.9, -len * 0.8, 0, -len); c.bezierCurveTo(wid * 0.9, -len * 0.8, wid, -len * 0.25, 0, 0); c.fill();
      c.strokeStyle = deep ? "rgba(170,40,90,0.35)" : "rgba(190,60,110,0.28)"; c.lineWidth = Math.max(0.6, z * 0.025); c.beginPath(); for (const v of [-0.45, 0, 0.45]) { c.moveTo(0, -len * 0.06); c.quadraticCurveTo(v * wid * 0.8, -len * 0.5, v * wid * 0.3, -len * 0.93); } c.stroke();
      if (front) { c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = Math.max(0.6, z * 0.03); c.beginPath(); c.moveTo(-wid * 0.3, -len * 0.2); c.quadraticCurveTo(-wid * 0.55, -len * 0.55, -wid * 0.15, -len * 0.85); c.stroke(); }
      c.restore(); };
    // (the sepals, green, under the flower)
    c.fillStyle = "#5f8a34"; for (const a of [-0.9, 0.9]) { c.save(); c.rotate(a); c.beginPath(); c.ellipse(0, -z * 0.15, z * 0.12, z * 0.3, 0, 0, 7); c.fill(); c.restore(); }
    if (bud) { const g = c.createLinearGradient(0, 0, 0, -z * 1.3); g.addColorStop(0, "#f7d6e2"); g.addColorStop(1, "#d9467f"); c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-z * 0.5, -z * 0.35, -z * 0.35, -z * 1.0, 0, -z * 1.3); c.bezierCurveTo(z * 0.35, -z * 1.0, z * 0.5, -z * 0.35, 0, 0); c.fill();
      c.strokeStyle = "rgba(170,40,90,0.4)"; c.lineWidth = Math.max(0.6, z * 0.03); c.beginPath(); c.moveTo(0, -z * 0.1); c.quadraticCurveTo(z * 0.12, -z * 0.7, 0, -z * 1.25); c.moveTo(-z * 0.2, -z * 0.15); c.quadraticCurveTo(-z * 0.25, -z * 0.7, -z * 0.04, -z * 1.2); c.stroke(); c.restore(); return; }
    for (const a of [-1.05, -0.55, 0.55, 1.05]) petal(a, z * 1.05, z * 0.36, true, false);   // (the back petals, splayed)
    for (const a of [-1.45, 1.45]) petal(a, z * 0.95, z * 0.34, true, false);   // (the outer ones, opened out level)
    for (const a of [-0.28, 0.28]) petal(a, z * 0.95, z * 0.3, false, false);   // (the inner ones, upright)
    // (the seed pod: flat-topped, yellow-green, pitted; the stamens round it)
    c.strokeStyle = "#f2c230"; c.lineWidth = Math.max(0.6, z * 0.035); c.beginPath(); for (let i = 0; i < 11; i++) { const a = -Math.PI / 2 + (i - 5) * 0.2; c.moveTo(0, -z * 0.32); c.lineTo(Math.cos(a) * z * 0.36, -z * 0.32 + Math.sin(a) * z * 0.28); } c.stroke();
    c.fillStyle = "#c9c94a"; c.beginPath(); c.moveTo(-z * 0.2, -z * 0.5); c.lineTo(z * 0.2, -z * 0.5); c.lineTo(z * 0.12, -z * 0.3); c.lineTo(-z * 0.12, -z * 0.3); c.closePath(); c.fill();
    c.fillStyle = "#e5e07a"; c.beginPath(); c.ellipse(0, -z * 0.5, z * 0.2, z * 0.05, 0, 0, 7); c.fill(); c.fillStyle = "#8a8a2a"; for (const dx of [-0.1, 0, 0.1]) { c.beginPath(); c.arc(dx * z, -z * 0.5, z * 0.018, 0, 7); c.fill(); }
    for (const a of [-0.62, 0.62]) petal(a, z * 0.82, z * 0.32, false, true);   // (the front petals, over it all)
    petal(0, z * 0.7, z * 0.28, false, true);
    c.restore();
  }
  // a mushroom on the land: a fly agaric (red, flecked white) or a bolete (brown, stout)
  function drawShroom(m, x, y) {
    const c = ctx, s0 = T * (0.7 + (m.x % 3) * 0.12);
    if (m.v === 0) { c.fillStyle = "#f3efe4"; c.beginPath(); c.moveTo(x - s0 * 0.08, y); c.lineTo(x - s0 * 0.06, y - s0 * 0.45); c.lineTo(x + s0 * 0.06, y - s0 * 0.45); c.lineTo(x + s0 * 0.1, y); c.fill();
      c.fillStyle = "#e9e1cf"; c.fillRect(x - s0 * 0.1, y - s0 * 0.3, s0 * 0.2, s0 * 0.04);
      c.fillStyle = "#c8321e"; c.beginPath(); c.ellipse(x, y - s0 * 0.45, s0 * 0.3, s0 * 0.2, 0, Math.PI, 0); c.fill();
      c.fillStyle = "rgba(0,0,0,0.18)"; c.beginPath(); c.ellipse(x, y - s0 * 0.46, s0 * 0.3, s0 * 0.05, 0, 0, Math.PI); c.fill();
      c.fillStyle = "#fffaf0"; for (const [dx, dy, r] of [[-0.15, -0.52, 0.035], [0.02, -0.6, 0.03], [0.16, -0.5, 0.03], [-0.04, -0.5, 0.025], [0.1, -0.56, 0.02]]) { c.beginPath(); c.arc(x + dx * s0, y + dy * s0, r * s0, 0, 7); c.fill(); } }
    else { c.fillStyle = "#e5d6b8"; c.beginPath(); c.ellipse(x, y - s0 * 0.16, s0 * 0.11, s0 * 0.17, 0, 0, 7); c.fill();
      c.fillStyle = "#7a4a26"; c.beginPath(); c.ellipse(x, y - s0 * 0.34, s0 * 0.22, s0 * 0.14, 0, Math.PI, 0); c.fill(); c.fillStyle = "#9a6438"; c.beginPath(); c.ellipse(x + s0 * 0.05, y - s0 * 0.4, s0 * 0.08, s0 * 0.04, 0, 0, 7); c.fill(); }
  }
  function greatCrown(G, u) {
    const h = G.h * u, bw = (G.half + 0.75) * u, r = seededR(G.v + 5), topY = -h * 0.74, topW = u * 1.5;
    const C = growLimbs(r, [
      { x: 0, y: topY + 0.4 * u, a: -Math.PI / 2 + (r(1) - 0.5) * 0.25, len: h * 0.12, w: topW * 0.72, lvl: 3, flare: 1.25 },
      { x: -0.15 * u, y: topY + 1.2 * u, a: -Math.PI / 2 - 0.62 - 0.2 * r(2), len: h * 0.115, w: topW * 0.62, lvl: 3, flare: 1.3 },
      { x: 0.15 * u, y: topY + 0.9 * u, a: -Math.PI / 2 + 0.62 + 0.2 * r(3), len: h * 0.115, w: topW * 0.62, lvl: 3, flare: 1.3 },
      { x: -0.3 * u, y: topY + 3.4 * u, a: -Math.PI / 2 - 1.05 - 0.15 * r(4), len: h * 0.09, w: topW * 0.42, lvl: 2, flare: 1.45 },
      { x: 0.3 * u, y: topY + 4.3 * u, a: -Math.PI / 2 + 1.05 + 0.15 * r(5), len: h * 0.09, w: topW * 0.42, lvl: 2, flare: 1.45 },
      ...G.limbs.map(L => ({ x: L.side * (G.half + L.len) * u * 0.62, y: -L.y * u + 0.2 * u, a: -Math.PI / 2 + L.side * 0.35, len: u * 1.9, w: u * 0.3, lvl: 1, flare: 1.25 }))],
      { up: 0.2, spread: 0.6, shrink: 0.66, wob: 0.14 });
    for (const L of G.limbs) { const ly = -L.y * u, ex = L.side * (G.half + L.len + 0.3) * u, x0 = L.side * bw * 0.3;
      C.segs.push({ P: [[x0, ly + 1.8 * u], [x0 + (ex - x0) * 0.3, ly + 1.15 * u], [x0 + (ex - x0) * 0.68, ly + 0.45 * u], [ex, ly + 0.3 * u]], w0: u * 1.25, w1: u * 0.34, lvl: 3, k: 900 + L.y, base: 0.22 }); }
    return C;
  }
  // (Matthew: "discontinuity in tree pad patterns", a tall tree's picture cut off straight up and down) A big tree's picture
  // is as big as its grown crown needs, its limbs' reach and a margin for the pads at their ends: not a guess, which clipped it
  function crownBox(L, m) { let x0 = 0, x1 = 0, y0 = 0; for (const sg of L.segs) for (const p of sg.P) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; }
    const half = Math.max(-x0, x1) + m; return { w: half * 2, h: -y0 + m + 1.2, ox: half, oy: -y0 + m }; }
  const tallBox = t => t.box || (t.box = crownBox(tallCrown(t, t.h * 1.45, 1), 3));
  const greatBox = G => G.box || (G.box = crownBox(greatCrown(G, 1), 3.5));
  // a great tree: a wide leafy crown at the top of it, pads over each house, the trunk wide and buttressed, furrowed, a curved
  // limb out under each platform
  function greatSprite(G) {
    const B = greatBox(G);
    return sprite(`great:${G.x}:${G.v}`, B.w, B.h, B.ox, B.oy, (g, u) => {
      // (Matthew: "top of tree still looks like multiple trunks, and crown isn't natural"; then "see branch point", the trunk
      // cut off flat and its limbs fanning straight out of it) its crown grows out of its trunk: the trunk carrying on as the
      // leader, two great limbs leaving it a little below, two lower ones further down, more level, each forking again and
      // again (growLimbs); a limb out under each platform, curving up to it, a collar where it leaves the trunk, and a branch
      // up from each, its pads over the house; leaf pads at every end and inner fork, tree-sized, darker behind, lighter in front
      const h = G.h * u, bw = (G.half + 0.75) * u, bark = "#6b4a2b", dk = "#45301c", r = seededR(G.v + 5), topY = -h * 0.74, topW = u * 1.5;
      const greens = ["#1f4f24", "#285e2a", "#2f7d32", "#3a8a3c", "#47a047", "#58b050"];
      const C = greatCrown(G, u);
      const padAt = (x, y, sc, col, j) => { g.save(); g.translate(x, y); const k = u * sc / 200; g.scale(k * (r(j) < 0.5 ? -1 : 1), k); pad(g, Math.floor(r(j + 1) * 8), 0, 0, 1, 1, col); g.restore(); };
      C.mids.forEach(([x, y], i) => padAt(x + (r(i + 260) - 0.5) * u, y + u * 0.2, 3.2 + 0.8 * r(i + 270), greens[Math.floor(r(i + 280) * 2)], i * 5 + 1300));
      C.tips.forEach(([x, y], i) => padAt(x + (r(i + 300) - 0.5) * u * 0.8, y - u * 0.2, 2.4 + 0.9 * r(i + 310), greens[Math.floor(r(i + 320) * 2)], i * 5 + 400));
      // (the trunk: buttresses flaring out over the ground, tapering up into the crown; the light to the east; its furrows)
      g.fillStyle = bark; g.beginPath(); g.moveTo(-bw - 2.2 * u, u * 0.1); g.bezierCurveTo(-bw - 0.6 * u, -u * 0.1, -bw - 0.1 * u, -u * 0.6, -bw * 0.95, -u * 1.6);
      g.bezierCurveTo(-bw * 0.8, -h * 0.35, -topW * 0.9, -h * 0.6, -topW * 0.55, topY); g.quadraticCurveTo(0, topY - 0.5 * u, topW * 0.55, topY);
      g.bezierCurveTo(topW * 0.9, -h * 0.6, bw * 0.8, -h * 0.35, bw * 0.95, -u * 1.6); g.bezierCurveTo(bw + 0.1 * u, -u * 0.6, bw + 0.6 * u, -u * 0.1, bw + 2.2 * u, u * 0.1); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,240,220,0.08)"; g.beginPath(); g.moveTo(bw * 0.2, -u); g.bezierCurveTo(bw * 0.5, -h * 0.35, topW * 0.5, -h * 0.6, topW * 0.1, topY); g.lineTo(topW * 0.5, topY); g.bezierCurveTo(topW * 0.85, -h * 0.6, bw * 0.78, -h * 0.35, bw * 0.9, -u); g.fill();
      g.fillStyle = "rgba(30,18,8,0.16)"; g.beginPath(); g.moveTo(-bw * 0.95, -u * 1.6); g.bezierCurveTo(-bw * 0.8, -h * 0.35, -topW * 0.9, -h * 0.6, -topW * 0.55, topY); g.lineTo(-topW * 0.2, topY); g.bezierCurveTo(-topW * 0.5, -h * 0.6, -bw * 0.45, -h * 0.35, -bw * 0.55, -u * 1.6); g.fill();
      g.strokeStyle = dk; g.globalAlpha = 0.5; g.lineWidth = Math.max(1, u / 14);
      for (let j = 0; j < 13; j++) { const f = j / 12 * 2 - 1; g.beginPath(); g.moveTo(f * (bw + 1.1 * u), u * 0.05); for (let k = 1; k <= 14; k++) { const y = topY * k / 14, wv = bw + (topW * 0.55 - bw) * k / 14; g.lineTo(f * wv + (r(j * 20 + k) - 0.5) * u * 0.1, y); } g.stroke(); }
      g.globalAlpha = 1;
      drawLimbs(g, C, bark, u, 1);
      C.mids.forEach(([x, y], i) => { if (r(i + 1400) < 0.55) padAt(x + (r(i + 1410) - 0.5) * u * 1.4, y + u * 0.3, 2.2 + 0.7 * r(i + 1420), greens[2 + Math.floor(r(i + 1430) * 2)], i * 5 + 1500); });
      C.tips.forEach(([x, y], i) => { padAt(x + (r(i + 500) - 0.5) * u * 1.2, y + u * 0.5, 1.9 + 0.8 * r(i + 510), greens[2 + Math.floor(r(i + 520) * 3)], i * 5 + 600);
        if (r(i + 530) < 0.45) padAt(x + (r(i + 540) - 0.5) * u * 1.6, y - u * 0.7, 1.6 + 0.6 * r(i + 550), greens[3 + Math.floor(r(i + 560) * 3)], i * 5 + 700); });
    });
  }
  // (Matthew: "let's have the ladders run in segments, and move with the tree behind it", "in the wind") A great tree's ladder
  // is in sections, one from the ground to the first platform and one from each platform up to the next, each a little askew,
  // lashed to the trunk with rope at its foot and its top, the next starting just below the platform, inside the one before;
  // and it sways as the tree does, each point pushed across by as much as the tree's picture is at its height. The gnome on it
  // sways with it
  function treePush(G, hy) { const B = greatBox(G), v = (B.oy - hy) / B.h; return (1 - v) * (1 - v) * sway(G.v, 0.18) * B.h; }
  const ladderTree = (c, r) => S.greats.find(G => G.kind === 30 && c === G.x && r < G.foot && r >= G.foot - Math.max(...G.limbs.map(l => l.y)) - 1);
  function ladderPush(gx, gy, climbing) { if (!climbing) return 0; const G = ladderTree(Math.floor(gx), Math.floor(gy - 0.5)); return G ? treePush(G, G.foot - gy + 0.5) : 0; }
  function drawTreeLadders(c0, c1, s) {
    const c = ctx;
    for (const G of S.greats) { if (G.kind !== 30 || G.x < c0 - 3 || G.x > c1 + 3) continue;
      const rows = [...new Set(G.limbs.map(l => l.y))].sort((a, b) => a - b), top = rows[rows.length - 1] + 1, stops = [0, ...rows.filter(y => y < top), top], r = seededR(G.v * 3 + 1), cx = G.x + 0.5;
      for (let k = 0; k + 1 < stops.length; k++) {
        const h0 = stops[k] - (k ? 0.4 : 0), h1 = stops[k + 1] + 0.3; if (h1 - h0 < 0.6) continue;
        const skew = (r(k) - 0.5) * 0.18, xb = (cx + skew + treePush(G, h0)) * s, xt = (cx - skew * 0.6 + treePush(G, h1)) * s, yb = (G.foot - h0) * s, yt = (G.foot - h1) * s, hw = 0.3 * s;
        const at2 = t => [xb + (xt - xb) * t, yb + (yt - yb) * t];
        // (its shadow on the trunk, its rails, its rungs, a rail's lit edge)
        c.lineCap = "round"; c.strokeStyle = "rgba(20,12,6,0.35)"; c.lineWidth = 0.1 * s;
        for (const e of [-1, 1]) { c.beginPath(); c.moveTo(xb + e * hw + 0.07 * s, yb + 0.05 * s); c.lineTo(xt + e * hw + 0.07 * s, yt + 0.05 * s); c.stroke(); }
        const n = Math.max(2, Math.round((h1 - h0) / 0.34)); c.strokeStyle = "#a0703f"; c.lineWidth = 0.075 * s;
        for (let j = 0; j < n; j++) { const [x, y] = at2((j + 0.5) / n); c.beginPath(); c.moveTo(x - hw, y); c.lineTo(x + hw, y); c.stroke(); }
        c.strokeStyle = "#7a4f2a"; c.lineWidth = 0.1 * s; for (const e of [-1, 1]) { c.beginPath(); c.moveTo(xb + e * hw, yb); c.lineTo(xt + e * hw, yt); c.stroke(); }
        c.strokeStyle = "rgba(255,230,190,0.3)"; c.lineWidth = Math.max(1, 0.025 * s); for (const e of [-1, 1]) { c.beginPath(); c.moveTo(xb + e * hw + 0.03 * s, yb); c.lineTo(xt + e * hw + 0.03 * s, yt); c.stroke(); }
        // (the rope lashings, at its foot and its top, round each rail and the trunk)
        c.strokeStyle = "#d8c49a"; c.lineWidth = Math.max(1, 0.03 * s); c.lineCap = "butt";
        for (const t of [0.06, 0.94]) { const [x, y] = at2(t); for (const e of [-1, 1]) { const rx = x + e * hw; c.beginPath();
          for (let q = 0; q < 3; q++) { c.moveTo(rx - 0.09 * s, y - 0.07 * s + q * 0.05 * s); c.lineTo(rx + 0.09 * s, y - 0.03 * s + q * 0.05 * s); } c.stroke(); } }
      }
    }
  }
  // (Matthew: "let's put a lot of gnome NPCs into the world, and give them a chance to say something friendly to the main char
  // when engaged"; "again, use Rien Poortvliet, but add our own imagination of variations for all villiagers") The villagers:
  // one or two in each room of the villages, sixteen out on the land and by the water, one on each great tree's platform by a
  // house. Each its own: a gnome (most of them), a gnome wife or a child; the tall pointed cap (red for most of the gnomes, as
  // Poortvliet paints them, and the wives' a soft grey-green; some of ours blue, green, brown or plum, striped or patched); a
  // beard long or short, white, grey, ginger or brown, or the wife's braids; a tunic or a dress and apron, a belt; and
  // something in hand (a pipe, a basket of berries, a walking stick, a lantern, a mushroom, a book, a watering can). They turn
  // to the gnome as it comes; and when it stops by one, there is a good chance it says something (World.greet), in a bubble
  const V_CAPS = ["#c62828", "#b71c1c", "#d84315", "#c62828", "#c62828", "#2e7d32", "#1565c0", "#6d4c41", "#6a1b9a"], V_WIFE = ["#6b7d4a", "#7a8b5a", "#8a6f9e", "#5b7c8a"];
  const V_BEARD = ["#f5f5f5", "#e0e0e0", "#bdbdbd", "#d2691e", "#8d6e63"], V_HAIR = ["#e8c872", "#a0522d", "#d9d4cc", "#5d4037"];
  const V_TUNIC = ["#1e5aa8", "#2f6b3a", "#7a4a26", "#b8860b", "#3e5f8a", "#8b3a3a"], V_DRESS = ["#4a5a7a", "#6b3a3a", "#3f5f3a", "#5a4a6a"], V_PANTS = ["#5d4037", "#6b6b6b", "#4e5d3a"];
  function makeVillagers() {
    S.villagers = []; const r = seededR(S.seed * 17 + 3); let id = 0;
    const add = (x, y, where, kindBias = 0) => { const k = id++, q = j => r(k * 31 + j), u = q(1);
      const kind = u < 0.5 - kindBias ? 0 : u < 0.82 ? 1 : 2;
      S.villagers.push({ id: k, kind, where, x, y, n: 0, nextAt: 0, face: q(2) < 0.5 ? -1 : 1,
        look: { cap: kind === 1 ? V_WIFE[Math.floor(q(3) * V_WIFE.length)] : V_CAPS[Math.floor(q(3) * V_CAPS.length)], stripe: q(4) < 0.18, patch: q(5) < 0.15, droop: (q(6) - 0.5) * 0.5,
          beard: V_BEARD[Math.floor(q(7) * V_BEARD.length)], beardLen: 0.22 + 0.3 * q(8), hair: V_HAIR[Math.floor(q(9) * V_HAIR.length)],
          coat: kind === 1 ? V_DRESS[Math.floor(q(10) * V_DRESS.length)] : V_TUNIC[Math.floor(q(10) * V_TUNIC.length)], pants: V_PANTS[Math.floor(q(11) * V_PANTS.length)],
          item: Math.floor(q(12) * 9), size: kind === 2 ? 0.7 + 0.08 * q(13) : kind === 1 ? 0.92 + 0.06 * q(13) : 0.96 + 0.1 * q(13), nose: 0.055 + 0.025 * q(14), cheeks: q(15) < 0.6 } }); };
    for (const R of S.rooms) { const n = R.w >= 6 ? 2 : 1; for (let j = 0; j < n; j++) { add(R.x + 1 + (R.w - 2) * (n === 1 ? 0.5 : j === 0 ? 0.2 : 0.8) + 0.5, R.y + 4, 0, -0.15); S.villagers[S.villagers.length - 1].room = R; } }
    for (let k = 0; k < 16; k++) { let c = Math.floor((k + 0.5) * WW / 16 + (r(500 + k) - 0.5) * 12); c = Math.max(4, Math.min(WW - 5, c));
      for (let t = 0; t < 12 && riverAt(c + 0.5); t++) c += 2;
      const nearWater = S.rivers.some(R => c > R.x - R.w / 2 - 8 && c < R.x + R.w * 1.5 + 8); add(c + 0.5, landY(c), nearWater ? 3 : 1); }
    for (const hs of S.houses) { if (hs.small) continue; for (const d of [2.4, 1.8, 3.0]) { const x = hs.x + 0.5 - hs.side * d, c = Math.floor(x); if (inside(c, hs.row) && fix[at(c, hs.row)] === F_PLAT) { add(x, hs.row, 2); break; } } }
    // (each villager's rank among those of its place, and how many there are: World.greet gives each its own lines)
    const per = {}; for (const v of S.villagers) v.rank = per[v.where] = (per[v.where] ?? -1) + 1; for (const v of S.villagers) v.count = per[v.where] + 1;
  }
  // (a villager whose room has flooded has gone up to a dry one: not seen there, nor heard)
  const villagerAway = v => { const c = Math.floor(v.x), r = Math.floor(v.y - 0.5); return inside(c, r) && wat[at(c, r)] >= 0.5; };
  function villagersStep(h) {
    if (!S.villagers || !S.g) return; const g = S.g, gx = g.x / 1000, gy = g.y / 1000, mid = S.cam.x + VW / 2;
    for (const v of S.villagers) { if (Math.abs(v.x - mid) < VW) villagerMove(v); if (v.mode !== "walk" && Math.abs(v.x - gx) < 4 && Math.abs(v.y - gy) < 2) v.face = gx > v.x ? 1 : -1; }
    if (S.talk && S.frame > S.talk.until) S.talk = null;
    if (S.frame % 6) return;
    let best = null, bd = 1e9; for (const v of S.villagers) { if (villagerAway(v)) continue; const dx = Math.abs(v.x - gx), dy = Math.abs(v.y - gy); if (dx < 1.7 && dy < 1.3 && dx < bd) { bd = dx; best = v; } }
    if (!best || (S.talk && S.talk.v === best) || S.frame < best.nextAt || Math.abs(g.vx) > 40) return;
    if (typeof h.greet === "function") { let t = null; try { t = h.greet(best.id, best.kind, best.where, best.n, best.rank ?? 0, best.count ?? 1); } catch (e) { t = null; }
      if (t && t.line) { S.talk = { v: best, name: t.name, line: t.line, until: S.frame + 60 * 5 }; best.n++; best.nextAt = S.frame + 60 * 10; return; } }
    best.nextAt = S.frame + 60 * 4; S.talk = { v: best, name: "", line: "🙂", until: S.frame + 60 * 1.5 };
  }
  function drawVillager(v, s, now, c0 = ctx, busy = false) {
    const c = c0, L = v.look, u = s * L.size, x = v.x * s, y = v.y * s, f = v.face, br = Math.sin(now / 700 + v.id) * 0.012, blink = Math.floor(now / 140 + v.id * 7) % 37 === 0;
    const ell = (col, ex, ey, rx, ry, a = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x + ex * u, y + ey * u, rx * u, ry * u, a, 0, 7); c.fill(); };
    const poly2 = (col, pts) => { c.fillStyle = col; c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(x + px * u, y + py * u) : c.moveTo(x + px * u, y + py * u)); c.closePath(); c.fill(); };
    ell("rgba(0,0,0,0.18)", 0, 0, 0.3, 0.05);
    // (boots, legs or skirt, the coat, the belt)
    for (const e of [-1, 1]) ell("#3e2a1a", e * 0.1, -0.035, 0.1, 0.05);
    if (v.kind === 1) { poly2(L.coat, [[-0.27, -0.05], [0.27, -0.05], [0.19, -0.46 + br], [-0.19, -0.46 + br]]); poly2("#efe7d4", [[-0.15, -0.07], [0.15, -0.07], [0.12, -0.38], [-0.12, -0.38]]); c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(x - 0.15 * u, y - 0.2 * u, 0.3 * u, Math.max(1, u * 0.012)); }
    else { for (const e of [-1, 1]) poly2(L.pants, [[e * 0.02, -0.07], [e * 0.18, -0.07], [e * 0.16, -0.21], [e * 0.02, -0.21]]); poly2(L.coat, [[-0.24, -0.17], [0.24, -0.17], [0.19, -0.47 + br], [-0.19, -0.47 + br]]);
      c.fillStyle = "#4a2e1a"; c.fillRect(x - 0.23 * u, y - 0.26 * u, 0.46 * u, 0.055 * u); c.fillStyle = "#d4a52a"; c.fillRect(x - 0.04 * u, y - 0.267 * u, 0.08 * u, 0.068 * u); }
    // (arms, hands)
    for (const e of [-1, 1]) { c.strokeStyle = L.coat; c.lineWidth = 0.09 * u; c.lineCap = "round"; c.beginPath(); c.moveTo(x + e * 0.18 * u, y - 0.42 * u); c.lineTo(x + e * 0.26 * u, y - 0.27 * u); c.stroke(); ell("#f1c9a5", e * 0.26, -0.25, 0.045, 0.045); }
    c.lineCap = "butt";
    // (the head: face, cheeks, eyes under a bushy brow, the big round nose; beard or braids; the cap)
    const hy = -0.6 + br;
    if (v.kind === 1) for (const e of [-1, 1]) { c.strokeStyle = L.hair; c.lineWidth = 0.05 * u; c.lineCap = "round"; c.beginPath(); c.moveTo(x + e * 0.11 * u, y + (hy - 0.02) * u); c.quadraticCurveTo(x + e * 0.17 * u, y + (hy + 0.1) * u, x + e * 0.14 * u, y + (hy + 0.24) * u); c.stroke(); ell(L.hair, e * 0.14, hy + 0.26, 0.025, 0.02); c.lineCap = "butt"; }
    // (Matthew: "gnomes should have ears"; "or long hair obscuring it") ears out at the sides, half behind the face; a wife's hair
    // falls over hers
    if (v.kind !== 1) for (const e of [-1, 1]) { ell("#eab993", e * 0.15, hy + 0.005, 0.034, 0.052, e * 0.15); ell("#d49474", e * 0.155, hy + 0.01, 0.016, 0.03, e * 0.15); }
    ell("#f1c9a5", 0, hy, 0.145, 0.135);
    if (v.kind === 1) for (const e of [-1, 1]) ell(L.hair, e * 0.135, hy + 0.01, 0.04, 0.085, e * 0.2);
    // (Matthew: "NPC gnomes need hair on their head sides. They seem too bare") hair curling out under the cap at each side, down
    // over the tops of the ears: a gnome's the color of his beard, a child's its own
    else { const hc = v.kind === 0 ? L.beard : L.hair, hd = mixHex(hc, "#000000", 0.18);
      for (const e of [-1, 1]) { ell(hc, e * 0.128, hy - 0.075, 0.05, 0.042); ell(hc, e * 0.148, hy - 0.035, 0.04, 0.038); ell(hc, e * 0.112, hy - 0.098, 0.045, 0.03);
        c.strokeStyle = hd; c.lineWidth = Math.max(1, 0.008 * u); c.beginPath(); c.arc(x + e * 0.13 * u, y + (hy - 0.07) * u, 0.025 * u, 0.3, 2.6); c.stroke(); } }
    if (L.cheeks) for (const e of [-1, 1]) ell("rgba(230,120,110,0.45)", e * 0.075, hy + 0.035, 0.035, 0.025);
    if (v.kind === 0) { poly2(L.beard, [[-0.12, hy + 0.01], [0.12, hy + 0.01], [0.06, hy + 0.08 + L.beardLen], [0, hy + 0.12 + L.beardLen], [-0.06, hy + 0.08 + L.beardLen]]);
      for (const e of [-1, 1]) ell(L.beard, e * 0.05, hy + 0.045, 0.06, 0.028, e * 0.3);
      c.strokeStyle = "rgba(0,0,0,0.12)"; c.lineWidth = Math.max(1, u / 60); for (const e of [-0.04, 0, 0.04]) { c.beginPath(); c.moveTo(x + e * u, y + (hy + 0.08) * u); c.lineTo(x + e * 0.8 * u, y + (hy + 0.05 + L.beardLen) * u); c.stroke(); } }
    // (Matthew: "the NPC gnomes should have faces"; "I dislike the gnome style where the hat is pulled over the face") the eyes
    // open under the brows, whites and all, the cap well up on the head above them
    const ex = f * 0.012; for (const e of [-1, 1]) { if (blink) { c.strokeStyle = "#3a2a1a"; c.lineWidth = Math.max(1, u / 40); c.beginPath(); c.moveTo(x + (e * 0.052 - 0.02) * u, y + (hy - 0.015) * u); c.lineTo(x + (e * 0.052 + 0.02) * u, y + (hy - 0.015) * u); c.stroke(); }
      else { ell("#fffaf0", e * 0.052, hy - 0.015, 0.027, 0.023); ell("#2a1a10", e * 0.052 + ex, hy - 0.013, 0.015, 0.017); ell("#fff", e * 0.052 + ex + 0.006, hy - 0.02, 0.005, 0.005); }
      // (Matthew: "all of the line-only gnomes look angry"; "let's have them generally look content") soft brows arched up, a
      // smiling crease under each eye
      c.strokeStyle = mixHex(v.kind === 0 ? L.beard : L.hair, "#5a4030", v.kind === 0 ? 0.25 : 0); c.lineWidth = Math.max(1, 0.018 * u); c.lineCap = "round"; c.beginPath(); c.arc(x + e * 0.054 * u, y + (hy - 0.035) * u, 0.034 * u, Math.PI * 1.2, Math.PI * 1.8); c.stroke();
      if (!blink) { c.strokeStyle = "rgba(150,90,70,0.6)"; c.lineWidth = Math.max(1, 0.01 * u); c.beginPath(); c.arc(x + e * 0.052 * u, y + (hy - 0.022) * u, 0.03 * u, Math.PI * 0.25, Math.PI * 0.75); c.stroke(); } c.lineCap = "butt"; }
    ell("#e8a08a", ex * 1.5, hy + 0.025, L.nose, L.nose * 0.9); ell("rgba(255,255,255,0.35)", ex * 1.5 - 0.015, hy + 0.01, L.nose * 0.3, L.nose * 0.25);
    // (a smile: a gnome's under his moustache, over his beard)
    // (Matthew: "mouths are on top of noses") below the nose, round and big as it is: a gnome's moustache under it, his smile under that
    { const nb = hy + 0.025 + L.nose * 0.9, my = v.kind === 0 ? nb + 0.03 : nb + 0.012;
      if (v.kind === 0) for (const e of [-1, 1]) ell(L.beard, ex * 1.5 + e * 0.036, nb + 0.004, 0.042, 0.018, e * 0.35);
      c.strokeStyle = "#8a3a32"; c.lineWidth = Math.max(1, u / 40); c.lineCap = "round"; c.beginPath(); c.arc(x + ex * 1.5 * u, y + my * u, 0.03 * u, 0.3, Math.PI - 0.3); c.stroke(); c.lineCap = "butt"; }
    const capH = v.kind === 2 ? 0.34 : 0.48, tipX = (L.droop + f * 0.06) * 0.3, cb = hy - 0.095;
    poly2(L.cap, [[-0.155, cb], [0.155, cb], [tipX, cb - capH]]);
    if (L.stripe) { c.save(); c.beginPath(); c.moveTo(x - 0.155 * u, y + cb * u); c.lineTo(x + 0.155 * u, y + cb * u); c.lineTo(x + tipX * u, y + (cb - capH) * u); c.closePath(); c.clip(); c.fillStyle = "rgba(255,255,255,0.35)"; for (let k = 1; k < 4; k++) c.fillRect(x - 0.2 * u, y + (cb - k * capH / 4) * u, 0.4 * u, 0.035 * u); c.restore(); }
    if (L.patch) { c.fillStyle = "#c8a032"; c.fillRect(x + 0.02 * u, y + (cb - 0.16) * u, 0.06 * u, 0.06 * u); c.strokeStyle = "rgba(0,0,0,0.3)"; c.lineWidth = Math.max(1, u / 70); c.strokeRect(x + 0.02 * u, y + (cb - 0.16) * u, 0.06 * u, 0.06 * u); }
    poly2("rgba(255,255,255,0.15)", [[0.04, cb - 0.01], [0.12, cb - 0.01], [tipX, cb - capH]]);
    ell(mixHex(L.cap, "#000000", 0.25), 0, cb, 0.16, 0.026);
    // (what it holds, in the hand on the side it faces)
    const hx = f * 0.26, hy2 = -0.25, I = busy ? -1 : v.kind === 2 ? (L.item % 3 === 0 ? 4 : 9) : v.kind === 1 ? [1, 1, 3, 5, 6, 9, 1, 6, 9][L.item] : [0, 2, 3, 5, 0, 2, 9, 6, 0][L.item];
    if (I === 0) { c.strokeStyle = "#5a3a1e"; c.lineWidth = 0.025 * u; c.beginPath(); c.moveTo(x + f * 0.03 * u, y + (hy + 0.07) * u); c.quadraticCurveTo(x + f * 0.12 * u, y + (hy + 0.12) * u, x + f * 0.17 * u, y + (hy + 0.06) * u); c.stroke(); ell("#5a3a1e", f * 0.18, hy + 0.04, 0.03, 0.035);
      const sm = (now / 900 + v.id) % 1; ell(`rgba(220,220,220,${(0.5 * (1 - sm)).toFixed(2)})`, f * 0.2 + sm * 0.05, hy - 0.04 - sm * 0.25, 0.03 + sm * 0.04, 0.03 + sm * 0.04); }
    else if (I === 1) { ell("#a0703f", hx, hy2 + 0.08, 0.1, 0.07); c.strokeStyle = "#7a4f2a"; c.lineWidth = 0.02 * u; c.beginPath(); c.arc(x + hx * u, y + (hy2 + 0.06) * u, 0.09 * u, Math.PI, 0); c.stroke(); for (let k = 0; k < 4; k++) ell(["#b71c1c", "#6a1b9a", "#b71c1c", "#1a237e"][k], hx - 0.06 + k * 0.04, hy2 + 0.035, 0.022, 0.022); }
    else if (I === 2) { c.strokeStyle = "#6b4a2b"; c.lineWidth = 0.035 * u; c.beginPath(); c.moveTo(x + hx * u, y + (hy2 - 0.25) * u); c.lineTo(x + (hx + f * 0.04) * u, y); c.stroke(); }
    else if (I === 3) { c.strokeStyle = "#333"; c.lineWidth = Math.max(1, u / 50); c.beginPath(); c.moveTo(x + hx * u, y + hy2 * u); c.lineTo(x + hx * u, y + (hy2 + 0.06) * u); c.stroke(); c.fillStyle = "#2a2a2a"; c.fillRect(x + (hx - 0.045) * u, y + (hy2 + 0.06) * u, 0.09 * u, 0.13 * u); ell(`rgba(255,214,120,${(0.8 + 0.2 * Math.sin(now / 90 + v.id)).toFixed(2)})`, hx, hy2 + 0.125, 0.032, 0.045); }
    else if (I === 4) { ell("#efe7d4", hx, hy2 + 0.05, 0.022, 0.05); ell("#c62828", hx, hy2, 0.07, 0.04); ell("#fff", hx - 0.02, hy2 - 0.01, 0.012, 0.01); }
    else if (I === 5) { c.fillStyle = "#7a1f1f"; c.fillRect(x + (hx - 0.06) * u, y + (hy2 - 0.02) * u, 0.12 * u, 0.09 * u); c.fillStyle = "#efe7d4"; c.fillRect(x + (hx - 0.055) * u, y + (hy2 - 0.015) * u, 0.11 * u, 0.012 * u); }
    else if (I === 6) { ell("#7b8a8f", hx, hy2 + 0.06, 0.08, 0.065); c.strokeStyle = "#7b8a8f"; c.lineWidth = 0.025 * u; c.beginPath(); c.moveTo(x + (hx + f * 0.07) * u, y + (hy2 + 0.05) * u); c.lineTo(x + (hx + f * 0.16) * u, y + (hy2 - 0.02) * u); c.stroke(); }
  }
  // (Matthew: "let's give the NPCs some more movement"; "maybe they stand still for a few seconds, then walk around back and forth
  // -- we need profile views of each, and walking"; "and some "busy" animations, like they are cooking, or cleaning, or doing other
  // things in the underground houses") Each villager stands a while (two to seven seconds), then walks a little way, to a place
  // in its own reach: across its room, along its stretch of land (its ground's height, a tile up or down at most), along its
  // platform; and stands again. In the village, at its place, it is busy at what its room is for. The gnome coming to talk, it
  // stops and turns to it
  const ACT = { 1: "stir", 3: "carry", 4: "hammer", 5: "read", 6: "stir", 7: "scrub", 8: "water", 9: "bucket", 10: "knit", 11: "knit", 12: "rock", 0: "sweep", 2: "sweep" };
  function villagerReach(v) {
    if (v.room) return [v.room.x + 0.6, v.room.x + v.room.w - 0.6];
    const c0 = Math.floor(v.x); let lo = c0, hi = c0;
    if (v.where === 2) { const r = Math.round(v.y), ok = c => inside(c, r) && (fix[at(c, r)] === F_PLAT || fix[at(c, r)] === F_BRIDGE);
      while (lo > c0 - 3 && ok(lo - 1)) lo--; while (hi < c0 + 3 && ok(hi + 1)) hi++; }
    else { const h0 = landY(c0), ok = c => inside(c, 1) && !riverAt(c + 0.5) && Math.abs(landY(c) - h0) <= 1.01 && mat[at(c, Math.floor(landY(c) - 0.5))] === AIR;
      while (lo > c0 - 3 && ok(lo - 1)) lo--; while (hi < c0 + 3 && ok(hi + 1)) hi++; }
    return [lo + 0.5, hi + 0.5];
  }
  function villagerMove(v) {
    if (!v.reach) { v.reach = villagerReach(v); v.mode = "stand"; v.timer = 60 + Math.floor(rand() * 300); v.act = v.room ? ACT[v.room.kind] || "sweep" : null; }
    if (S.talk && S.talk.v === v) { v.mode = "stand"; v.timer = Math.max(v.timer, 90); return; }
    if (v.mode === "walk") { const dx = v.to - v.x, sp = 0.022; if (Math.abs(dx) <= sp) { v.x = v.to; v.mode = v.act ? "busy" : "stand"; v.timer = (v.act ? 300 : 120) + Math.floor(rand() * 300); } else { v.x += Math.sign(dx) * sp; v.face = Math.sign(dx); }
      if (v.where === 1 || v.where === 3) v.y = landY(Math.floor(v.x)); v.step = (v.step || 0) + 1; return; }
    if (--v.timer > 0) return;
    const [a, b] = v.reach; if (b - a < 0.6) { v.timer = 400; return; }
    v.to = a + (b - a) * rand(); if (Math.abs(v.to - v.x) < 0.5) v.to = v.x < (a + b) / 2 ? b : a; v.mode = "walk";
  }
  // a villager walking, from the side, the way it goes: its cap leaning back, its nose out in front, an eye, an ear, a gnome's beard
  // down from his chin, a wife's braid behind; the near arm and the far swinging, the legs striding
  function drawVillagerProfile(v, s, now, c0 = ctx) {
    const c = c0, L = v.look, u = s * L.size, x = v.x * s, y = v.y * s, f = v.face || 1, ph = (v.step || 0) * 0.28, sw = Math.sin(ph), bob = Math.abs(Math.cos(ph)) * 0.015;
    const ell = (col, ex, ey, rx, ry, a = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x + f * ex * u, y + ey * u, rx * u, ry * u, f * a, 0, 7); c.fill(); };
    const poly2 = (col, pts) => { c.fillStyle = col; c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(x + f * px * u, y + py * u) : c.moveTo(x + f * px * u, y + py * u)); c.closePath(); c.fill(); };
    const limb = (col, x0, y0, x1, y1, w) => { c.strokeStyle = col; c.lineWidth = w * u; c.lineCap = "round"; c.beginPath(); c.moveTo(x + f * x0 * u, y + y0 * u); c.lineTo(x + f * x1 * u, y + y1 * u); c.stroke(); c.lineCap = "butt"; };
    ell("rgba(0,0,0,0.18)", 0, 0, 0.22, 0.045);
    // (the far arm and leg, darker, behind)
    limb(mixHex(L.coat, "#000000", 0.25), 0, -0.42, -0.12 * sw, -0.26, 0.085); ell("#e2b48e", -0.12 * sw, -0.24, 0.042, 0.042);
    if (v.kind !== 1) limb(mixHex(L.pants, "#000000", 0.2), 0, -0.2, -0.1 * sw, -0.05, 0.11); ell("#2e1f12", -0.1 * sw + 0.04, -0.03, 0.08, 0.04);
    // (the body, the near leg, the belt or apron)
    if (v.kind === 1) poly2(L.coat, [[-0.17, -0.05 - bob], [0.2, -0.05 - bob], [0.13, -0.46 - bob], [-0.12, -0.46 - bob]]);
    else { limb(L.pants, 0, -0.2, 0.1 * sw, -0.05, 0.11); poly2(L.coat, [[-0.15, -0.17 - bob], [0.17, -0.17 - bob], [0.13, -0.47 - bob], [-0.12, -0.47 - bob]]); }
    ell("#3e2a1a", 0.1 * sw + 0.04, -0.03, 0.085, 0.042);
    if (v.kind === 1) poly2("#efe7d4", [[0.05, -0.07 - bob], [0.2, -0.07 - bob], [0.15, -0.38 - bob], [0.06, -0.38 - bob]]);
    else { c.fillStyle = "#4a2e1a"; c.fillRect(x - 0.16 * u, y - (0.265 + bob) * u, 0.33 * u, 0.05 * u); }
    // (the head: the braid or the hair behind, the ear, the face, the nose out in front, an eye, the beard, the cap leaning back)
    const hy = -0.6 - bob;
    if (v.kind === 1) { limb(L.hair, -0.1, hy, -0.15, hy + 0.24, 0.05); ell(L.hair, -0.15, hy + 0.26, 0.03, 0.025); ell(L.hair, -0.06, hy + 0.01, 0.09, 0.1); }
    else ell(v.kind === 0 ? L.beard : L.hair, -0.07, hy + 0.0, 0.08, 0.09);
    ell("#f1c9a5", 0.01, hy, 0.12, 0.125);
    if (v.kind !== 1) { ell("#eab993", -0.04, hy + 0.01, 0.03, 0.05); ell("#d49474", -0.04, hy + 0.015, 0.014, 0.028); }
    ell("#2a1a10", 0.07, hy - 0.015, 0.016, 0.019); ell("#fff", 0.075, hy - 0.022, 0.005, 0.005);
    c.strokeStyle = v.kind === 0 ? L.beard : L.hair; c.lineWidth = Math.max(1, 0.016 * u); c.lineCap = "round"; c.beginPath(); c.arc(x + f * 0.07 * u, y + (hy - 0.035) * u, 0.03 * u, f > 0 ? Math.PI * 1.2 : Math.PI * 1.2, Math.PI * 1.8); c.stroke(); c.lineCap = "butt";
    if (L.cheeks) ell("rgba(230,120,110,0.45)", 0.05, hy + 0.04, 0.03, 0.022);
    if (v.kind === 0) { poly2(L.beard, [[0.01, hy + 0.03], [0.13, hy + 0.04], [0.12, hy + 0.12 + L.beardLen * 0.6], [0.05, hy + 0.1 + L.beardLen], [-0.03, hy + 0.08]]);
      c.strokeStyle = "rgba(0,0,0,0.12)"; c.lineWidth = Math.max(1, u / 60); c.beginPath(); for (const k of [0.03, 0.07]) { c.moveTo(x + f * k * u, y + (hy + 0.06) * u); c.lineTo(x + f * (k + 0.01) * u, y + (hy + 0.05 + L.beardLen * 0.8) * u); } c.stroke(); }
    else { c.strokeStyle = "#8a3a32"; c.lineWidth = Math.max(1, u / 45); c.beginPath(); c.arc(x + f * 0.09 * u, y + (hy + 0.05) * u, 0.02 * u, f > 0 ? 0.2 : Math.PI - 1.2, f > 0 ? 1.2 : Math.PI - 0.2); c.stroke(); }
    ell("#e8a08a", 0.125, hy + 0.025, L.nose * 0.85, L.nose * 0.8);
    const capH = v.kind === 2 ? 0.34 : 0.48, cb = hy - 0.09;
    poly2(L.cap, [[-0.15, cb + 0.01], [0.14, cb - 0.01], [-0.09, cb - capH * 0.97]]);
    ell(mixHex(L.cap, "#000000", 0.25), 0, cb, 0.15, 0.025, -0.08);
    // (the near arm, swinging, its hand, what it holds)
    limb(L.coat, 0.02, -0.42 - bob, 0.12 * sw, -0.26, 0.085); ell("#f1c9a5", 0.12 * sw, -0.24, 0.042, 0.042);
  }
  // (busy: what a villager's room is for, with its hands, a little prop, moving)
  function drawBusy(v, s, now, c0 = ctx) {
    const c = c0, u = s * v.look.size, x = v.x * s, y = v.y * s, f = v.face || 1, t = now / 1000 + v.id;
    const ell = (col, ex, ey, rx, ry, a = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x + f * ex * u, y + ey * u, rx * u, ry * u, f * a, 0, 7); c.fill(); };
    const line = (col, x0, y0, x1, y1, w) => { c.strokeStyle = col; c.lineWidth = Math.max(1, w * u); c.lineCap = "round"; c.beginPath(); c.moveTo(x + f * x0 * u, y + y0 * u); c.lineTo(x + f * x1 * u, y + y1 * u); c.stroke(); c.lineCap = "butt"; };
    const a = v.act;
    if (a === "stir") { ell("#3a3a3a", 0.42, -0.12, 0.16, 0.12); ell("#5a5a5a", 0.42, -0.2, 0.17, 0.035); const k = t * 3, lx = 0.42 + Math.cos(k) * 0.07; line("#8b5a2b", 0.26, -0.3, lx, -0.2 + Math.sin(k) * 0.015, 0.025);
      for (let j = 0; j < 3; j++) { const q = (t * 0.6 + j / 3) % 1; ell(`rgba(235,235,235,${(0.5 * (1 - q)).toFixed(2)})`, 0.42 + Math.sin(q * 6 + j) * 0.04, -0.25 - q * 0.35, 0.03 + q * 0.04, 0.03 + q * 0.04); } }
    else if (a === "sweep") { const k = Math.sin(t * 4) * 0.12; line("#8b5a2b", 0.24, -0.34, 0.3 + k, 0.0, 0.025); c.fillStyle = "#c9a24a"; c.beginPath(); c.moveTo(x + f * (0.24 + k) * u, y - 0.03 * u); c.lineTo(x + f * (0.38 + k) * u, y - 0.03 * u); c.lineTo(x + f * (0.42 + k) * u, y + 0.01 * u); c.lineTo(x + f * (0.2 + k) * u, y + 0.01 * u); c.closePath(); c.fill();
      if (Math.sin(t * 4) > 0.8) ell("rgba(160,140,110,0.4)", 0.45 + k, -0.03, 0.05, 0.02); }
    else if (a === "hammer") { const k = Math.max(0, Math.sin(t * 5)); ell("#6b6b6b", 0.4, -0.18, 0.12, 0.05); line("#8b5a2b", 0.26, -0.28, 0.35, -0.28 - k * 0.2, 0.025); ell("#555", 0.37, -0.3 - k * 0.2, 0.05, 0.025); if (k < 0.08) ell("#ffd166", 0.42, -0.25, 0.02, 0.02); }
    else if (a === "read") { const k = Math.sin(t * 0.7); c.fillStyle = "#7a1f1f"; c.fillRect(x - 0.1 * u, y - 0.36 * u, 0.2 * u, 0.12 * u); c.fillStyle = "#f5efe1"; c.fillRect(x - 0.09 * u, y - 0.355 * u, 0.085 * u, 0.1 * u); c.fillRect(x + 0.005 * u, y - 0.355 * u, 0.085 * u, 0.1 * u); if (k > 0.9) { c.fillStyle = "#fffaf0"; c.beginPath(); c.moveTo(x, y - 0.355 * u); c.lineTo(x + 0.05 * u, y - 0.4 * u); c.lineTo(x + 0.05 * u, y - 0.3 * u); c.lineTo(x, y - 0.255 * u); c.fill(); } }
    else if (a === "knit") { const k = Math.sin(t * 6) * 0.03; ell("#b03a5b", 0.0, -0.3, 0.07, 0.05); line("#c8c8c8", -0.12, -0.32 + k, 0.06, -0.26, 0.012); line("#c8c8c8", 0.12, -0.32 - k, -0.06, -0.26, 0.012); ell("#b03a5b", 0.3, -0.03, 0.06, 0.05); }
    else if (a === "scrub") { const k = Math.sin(t * 7) * 0.06; ell("#8b5a2b", 0.4, -0.1, 0.18, 0.1); ell("#cfe8f7", 0.4, -0.16, 0.16, 0.03); ell("#e9e1d0", 0.38 + k, -0.18, 0.05, 0.025); for (let j = 0; j < 3; j++) ell("rgba(255,255,255,0.8)", 0.32 + j * 0.07, -0.21 - ((t + j) % 1) * 0.08, 0.018, 0.018); }
    else if (a === "water") { const k = Math.sin(t * 1.5) * 0.15; c.save(); c.translate(x + f * 0.3 * u, y - 0.28 * u); c.rotate(f * (0.3 + k)); c.fillStyle = "#7b8a8f"; c.fillRect(-0.06 * u, -0.05 * u, 0.12 * u, 0.1 * u); c.restore(); for (let j = 0; j < 3; j++) ell("rgba(140,190,240,0.8)", 0.42 + j * 0.02, -0.18 + ((t * 2 + j / 3) % 1) * 0.15, 0.01, 0.018); ell("#c8a46a", 0.45, -0.03, 0.06, 0.04); }
    else if (a === "bucket") { const k = (Math.sin(t * 1.2) + 1) / 2; line("#d8c49a", 0.3, -0.5, 0.3, -0.2 + k * 0.15, 0.012); ell("#7a5a3a", 0.3, -0.15 + k * 0.15, 0.06, 0.05); }
    else if (a === "carry") { ell("#c88a4a", 0.0, -0.3, 0.07, 0.08); ell("#efe7d4", 0.0, -0.38, 0.06, 0.015); }
    else if (a === "rock") { const k = Math.sin(t * 2) * 0.1; c.save(); c.translate(x + f * 0.4 * u, y - 0.05 * u); c.rotate(k); c.fillStyle = "#8b5a2b"; c.beginPath(); c.ellipse(0, 0, 0.18 * u, 0.1 * u, 0, 0, Math.PI); c.fill(); c.fillStyle = "#f3d9e0"; c.fillRect(-0.1 * u, -0.08 * u, 0.2 * u, 0.08 * u); c.restore(); }
  }
  function drawTalk(s) {
    const T2 = S.talk; if (!T2) return; const v = T2.v, c = ctx, x = v.x * s, y = (v.y - 1.25 * v.look.size) * s, fs = Math.max(11, Math.round(0.3 * s)), pad = 0.18 * s, maxW = 5.2 * s;
    c.font = `${fs}px system-ui, sans-serif`; const words = T2.line.split(" "), lines = []; let cur = "";
    for (const w of words) { const t = cur ? cur + " " + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur);
    c.font = `bold ${fs}px system-ui, sans-serif`; const nameW = T2.name ? c.measureText(T2.name).width : 0; c.font = `${fs}px system-ui, sans-serif`;
    const w = Math.max(nameW, ...lines.map(l => c.measureText(l).width)) + pad * 2, lh = fs * 1.25, h = (lines.length + (T2.name ? 1 : 0)) * lh + pad * 1.4, bx = x - w / 2, by = y - h;
    c.fillStyle = "rgba(255,252,240,0.96)"; c.strokeStyle = "#5a3a1e"; c.lineWidth = Math.max(1, s / 30); c.beginPath(); c.roundRect(bx, by, w, h, 0.2 * s); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 0.15 * s, by + h - 1); c.lineTo(x, by + h + 0.25 * s); c.lineTo(x + 0.15 * s, by + h - 1); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x - 0.15 * s, by + h); c.lineTo(x, by + h + 0.25 * s); c.lineTo(x + 0.15 * s, by + h); c.stroke();
    c.textAlign = "left"; c.textBaseline = "top"; let ty = by + pad * 0.7;
    if (T2.name) { c.font = `bold ${fs}px system-ui, sans-serif`; c.fillStyle = "#7a2a1a"; c.fillText(T2.name, bx + pad, ty); ty += lh; c.font = `${fs}px system-ui, sans-serif`; }
    c.fillStyle = "#2a2018"; for (const l of lines) { c.fillText(l, bx + pad, ty); ty += lh; } c.textBaseline = "alphabetic";
  }
  // (Matthew: "trees should have squirrels running around, and generally avoiding the gnome") Squirrels: three in each great
  // tree, one in each tall one, red or grey. They run along the limbs the tree is drawn with (its crown grown again, in tiles,
  // and laid out as paths: each limb a run of points, its base joined to the limb it grows from), up and down the trunk, out
  // under the platforms and down onto the ground round its foot; now and then they stop and sit up, tail curled over their
  // backs, an acorn in their paws; and when the gnome comes within four or five tiles they are off, twice as fast, by
  // whichever way leads furthest from it, and, cornered, they freeze and scold it
  function treeGraph(segs, ox, oy) {
    const pts = [], nb = [], link = (a, b) => { if (a !== b && !nb[a].includes(b)) { nb[a].push(b); nb[b].push(a); } };
    for (const sg of [...segs].sort((a, b) => b.w0 - a.w0)) {
      const len = Math.hypot(sg.P[3][0] - sg.P[0][0], sg.P[3][1] - sg.P[0][1]) * 1.1, n = Math.max(1, Math.round(len / 0.6)), from = pts.length;
      for (let i = 0; i <= n; i++) { const [x, y] = cubicAt(sg.P, i / n); pts.push([ox + x, oy + y]); nb.push([]); if (i) link(pts.length - 2, pts.length - 1); }
      let bi = -1, bj = -1, bd = 2.5;
      for (let i = from; i < pts.length; i++) for (let j = 0; j < from; j++) { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (d < bd) { bd = d; bi = i; bj = j; } }
      if (bi >= 0) link(bi, bj); }
    // (and the leaps: from the end of a limb to any other limb within a tile and a half of it)
    const ends = []; for (let i = 0; i < pts.length; i++) if (nb[i].length === 1) ends.push(i);
    for (const i of ends) for (let j = 0; j < pts.length; j++) if (j !== i && !nb[i].includes(j) && Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < 1.5 && Math.abs(i - j) > 3) { link(i, j); break; }
    return { pts, nb };
  }
  function makeSquirrels() {
    S.squirrels = []; const rr = seededR(S.seed * 3 + 11); let id = 0;
    const homes = [...S.greats.map(G => { const C = greatCrown(G, 1), topY = -G.h * 0.74;
        C.segs.push({ P: [[0, -0.1], [0.15, topY * 0.33], [-0.1, topY * 0.66], [0, topY + 0.4]], w0: 3, w1: 1 }, { P: [[-4.5, 0], [-1.5, 0], [1.5, 0], [4.5, 0]], w0: 2.5, w1: 2.5 });
        const B = greatBox(G); return { n: 3, graph: treeGraph(C.segs, G.x + 0.5, G.foot), cx: G.x + 0.5, half: G.half + 0.4, oy: G.foot, spH: B.h, spOy: B.oy, lean: () => sway(G.v, 0.18) }; }),
      ...S.trees.filter(t => t.tall).map(t => { const hT = t.h * 1.45, C = tallCrown(t, hT, 1); C.segs.push({ P: [[-3, 0], [-1, 0], [1, 0], [3, 0]], w0: 0.5, w1: 0.5 });
        const B = tallBox(t); return { n: 1, tree: t, graph: treeGraph(C.segs, t.x + 0.5, surf0[t.x]), cx: t.x + 0.5, half: 0.5, oy: surf0[t.x], spH: B.h, spOy: B.oy, lean: () => sway(t.seed, 1) }; })];
    S.treeHomes = homes;   // (the birds perch along these limbs too)
    for (const H of homes) for (let k = 0; k < H.n; k++) { const at = Math.floor(rr(id * 5 + 1) * H.graph.pts.length);
      S.squirrels.push({ H, id: id++, at, to: at, prev: -1, f: 0, wait: Math.floor(rr(id * 5 + 2) * 120), face: 1, kind: rr(id * 5 + 3) < 0.3 ? 1 : 0 }); }
  }
  function squirrelsStep() {
    const g = S.g; if (!g || !S.squirrels) return; const gx = g.x / 1000, gy = g.y / 1000 - 0.6;
    for (const q of S.squirrels) { if (q.H.tree && !q.H.tree.alive) continue;
      const P = q.H.graph.pts, NB = q.H.graph.nb, a = P[q.at], b = P[q.to], x = a[0] + (b[0] - a[0]) * q.f, y = a[1] + (b[1] - a[1]) * q.f;
      q.scared = Math.hypot(x - gx, y - gy) < 4.5; if (q.scared && q.sat) { q.wait = 0; q.sat = false; }
      if (q.wait > 0) { q.wait--; continue; }
      if (q.to !== q.at) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.01; q.f += (q.scared ? 0.16 : 0.065) / L; if (q.f < 1) continue; q.f = 0; q.prev = q.at; q.at = q.to; }
      const here = P[q.at], opts = NB[q.at];
      if (q.scared) {   // (fleeing: the way, within thirty points along the limbs, to the point furthest from the gnome, not passing close by it)
        const par = new Map([[q.at, -1]]), dep = new Map([[q.at, 0]]), queue = [q.at]; let best = q.at, bd = Math.hypot(here[0] - gx, here[1] - gy) + 0.3;
        for (let qi = 0; qi < queue.length; qi++) { const u = queue[qi], du = dep.get(u); if (du >= 30) continue;
          for (const n of NB[u]) { if (par.has(n)) continue; const dn = Math.hypot(P[n][0] - gx, P[n][1] - gy); if (dn < 1.4) continue; par.set(n, u); dep.set(n, du + 1); queue.push(n); if (dn > bd) { bd = dn; best = n; } } }
        let step = best; while (step !== q.at && par.get(step) !== q.at) step = par.get(step);
        q.to = step; if (step === q.at) { q.wait = 10; q.scold = S.frame; } }
      else if (rand() < 0.03) { q.wait = 50 + Math.floor(rand() * 170); q.sat = true; q.acorn = rand() < 0.45; q.to = q.at; }
      else { const fw = opts.filter(n => n !== q.prev), from = fw.length ? fw : opts; q.to = from.length ? from[Math.floor(rand() * from.length)] : q.at; q.sat = false; } }
  }
  function drawSquirrels(c0, c1) {
    if (!S.squirrels) return; const c = ctx, s = T;
    for (const q of S.squirrels) { const H = q.H; if (H.tree && !H.tree.alive) continue;
      const P = H.graph.pts, a = P[q.at], b = P[q.to]; let x = a[0] + (b[0] - a[0]) * q.f; const y = a[1] + (b[1] - a[1]) * q.f; if (x < c0 - 2 || x > c1 + 2) continue;
      const v = (H.spOy - (H.oy - y)) / H.spH; x += (1 - v) * (1 - v) * H.lean() * H.spH;   // (swaying with its tree)
      const moving = q.to !== q.at && q.wait <= 0, ang = moving ? Math.atan2(b[1] - a[1], b[0] - a[0]) : (q.ang ?? 0); if (moving) q.ang = ang;
      if (Math.abs(Math.cos(ang)) > 0.2) q.face = Math.cos(ang) > 0 ? 1 : -1;
      const level = Math.abs(Math.sin(ang)) < 0.6; let rot = q.face > 0 ? ang : Math.PI - ang; rot = Math.atan2(Math.sin(rot), Math.cos(rot)); if (!moving && level) rot = 0;
      c.save(); c.translate(x * s, y * s); c.scale(q.face, 1); c.rotate(rot); c.translate(0, -0.1 * s); squirrelBody(c, s * 2, q, moving, q.sat && level); c.restore(); }   // (0.0.102: twice the size)
  }
  function squirrelBody(c, s, q, run, sit) {
    const fur = q.kind ? "#8d8b88" : "#b5531d", dark = q.kind ? "#66635f" : "#7f3410", belly = q.kind ? "#efece6" : "#f3dcb8", t = S.frame * (q.scared ? 0.7 : 0.38), ph = run ? Math.sin(t) : 0;
    const ell = (col, x, y, rx, ry, a = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x * s, y * s, rx * s, ry * s, a, 0, 7); c.fill(); };
    const tail = (pts, w) => { c.lineCap = "round"; c.strokeStyle = dark; c.globalAlpha = 0.45; c.lineWidth = w * 1.3 * s; c.setLineDash([w * 0.18 * s, w * 0.12 * s]); c.beginPath(); c.moveTo(pts[0] * s, pts[1] * s); c.bezierCurveTo(pts[2] * s, pts[3] * s, pts[4] * s, pts[5] * s, pts[6] * s, pts[7] * s); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
      c.strokeStyle = fur; c.lineWidth = w * s; c.beginPath(); c.moveTo(pts[0] * s, pts[1] * s); c.bezierCurveTo(pts[2] * s, pts[3] * s, pts[4] * s, pts[5] * s, pts[6] * s, pts[7] * s); c.stroke();
      c.strokeStyle = q.kind ? "rgba(255,255,255,0.35)" : "rgba(255,214,160,0.4)"; c.lineWidth = w * 0.35 * s; c.stroke(); c.lineCap = "butt"; };
    const head = (hx, hy) => { ell(fur, hx, hy, 0.075, 0.064); ell(belly, hx + 0.03, hy + 0.025, 0.04, 0.025);
      c.fillStyle = fur; c.beginPath(); c.moveTo((hx - 0.04) * s, (hy - 0.04) * s); c.lineTo((hx - 0.02) * s, (hy - 0.12) * s); c.lineTo((hx + 0.01) * s, (hy - 0.05) * s); c.fill();
      ell("#111", hx + 0.03, hy - 0.012, 0.014, 0.016); ell("#fff", hx + 0.035, hy - 0.018, 0.005, 0.005); ell("#3a1a0a", hx + 0.075, hy + 0.005, 0.012, 0.01); };
    if (sit) { const w = Math.sin(S.frame / 9 + q.id) * 0.02;
      tail([-0.1, -0.06, -0.36, -0.12, -0.32, -0.56 + w, -0.1, -0.56 + w], 0.15);
      ell(fur, -0.03, -0.1, 0.12, 0.1); ell(fur, 0.03, -0.25, 0.08, 0.14, -0.25); ell(belly, 0.07, -0.23, 0.045, 0.1, -0.25); head(0.08, -0.41);
      ell(dark, 0.06, -0.01, 0.07, 0.022);
      if (q.acorn) { ell("#8a5a2a", 0.14, -0.29, 0.032, 0.038); ell("#5a3a1e", 0.14, -0.315, 0.036, 0.018); } ell(fur, 0.12, -0.29, 0.03, 0.022); }
    else { const st = 1 + 0.18 * ph, lift = run ? Math.max(0, Math.sin(t)) * 0.05 : 0;
      tail([-0.15, -0.13 - lift, -0.38, -0.1 + 0.06 * ph, -0.44, -0.4, -0.24, -0.44 + 0.05 * ph], 0.14);
      ell(dark, -0.1 - 0.05 * ph, -0.035, 0.065, 0.032); ell(fur, 0, -0.12 - lift, 0.19 * st, 0.095); ell(belly, 0.03, -0.075 - lift, 0.12, 0.035);
      ell(dark, 0.13 + 0.05 * ph, -0.03, 0.045, 0.024); head(0.2 + 0.03 * ph, -0.18 - lift); }
    if (q.scold && S.frame - q.scold < 40) { c.strokeStyle = "#222"; c.lineWidth = Math.max(1, s / 30); c.beginPath(); for (const k of [0, 1]) { c.moveTo((0.28 + k * 0.08) * s, (-0.32 - k * 0.04) * s); c.lineTo((0.33 + k * 0.08) * s, (-0.42 - k * 0.04) * s); } c.stroke(); }
  }
  // ---- (Matthew: "and let's add insects, and frogs"; "and birds"; "birds fly; they land in tree branches, and they swim on the
  // water. hawks. sparrows blue jays robins ducks swans") The wildlife, as the squirrels are: placed once from the world, each
  // stepped only while near the view, shy of the gnome.
  //  - frogs on the lily pads (one to a clump, three to a river at most) or, on a river with none, its bank: sitting, a croak now
  //    and then, the throat puffed out; a hop to another pad now and then; the gnome near, a leap into the water, a swim under it
  //    and up onto the pad furthest from it; a flick of the tongue at an insect that comes close, and the insect gone
  //  - insects: dragonflies over each river, darting and hovering; butterflies (monarch, brimstone, cabbage white, common blue)
  //    and bumblebees about the flowers, settling on them now and then
  //  - birds: sparrows in little flocks by the bushes and robins on the open grass, hopping and pecking, up into the trees when
  //    the gnome comes and down again once it has gone; blue jays in the branches, hopping limb to limb, now and then off to
  //    another tree; two hawks soaring in wide circles high over the gnome's part of the world, now and then resting at the top
  //    of a great tree; mallards on every river, drakes and hens, paddling, dabbling tail up, away from the gnome; two swans on
  //    the river, gliding
  const WILD = { callAt: -1e9 };
  const wildCall = (name, x, y) => { const g = S.g; if (!SND || !SND[name] || S.frame - WILD.callAt < 90 || !g || Math.hypot(x - g.x / 1000, y - g.y / 1000) > 12) return; WILD.callAt = S.frame; SND[name](); };
  const viewNear = (x, m = 8) => x > S.cam.x - m && x < S.cam.x + VW + m;
  function makeWild() {
    const rr = seededR(S.seed * 5 + 77); let j = 0; const q = () => rr(j++);
    S.frogs = []; S.bugs = []; S.birds = [];
    for (const R of S.rivers) { const lilies = (R.plants || []).filter(P => P.kind === "lily");
      for (const P of lilies.slice(0, 3)) { const pd = P.pads[Math.floor(q() * P.pads.length)]; S.frogs.push({ R, pad: pd, x: pd.x, y: R.level, mode: "sit", face: q() < 0.5 ? -1 : 1, wait: 60 + Math.floor(q() * 300), croak: -1e9, tongue: -1e9, id: j }); }
      if (!lilies.length && q() < 0.7) { const side = q() < 0.5 ? -1 : 1, c = side < 0 ? R.x - 1 : R.x + R.w; S.frogs.push({ R, pad: null, bank: c + 0.5, x: c + 0.5, y: landY(c), mode: "sit", face: -side, wait: 100, croak: -1e9, tongue: -1e9, id: j }); }
      for (let k = 0; k < Math.min(3, 1 + Math.floor(R.w / 6)); k++) S.bugs.push({ kind: "dragon", hx: R.x + R.w * (0.2 + 0.6 * q()), hw: Math.max(1.5, R.w / 2), hy: R.level, x: R.x + R.w / 2, y: R.level - 1, tx: R.x + R.w / 2, ty: R.level - 1, wait: 0, col: ["#2e7bd6", "#c8322a", "#1f9e8a"][Math.floor(q() * 3)], id: j++ }); }
    for (const f of S.flowers) if (q() < 0.3) { const fly = q() < 0.65; S.bugs.push({ kind: fly ? "fly" : "bee", hx: f.x + 0.5, hw: 3, hy: landY(f.x), x: f.x + 0.5, y: landY(f.x) - 1, tx: f.x + 0.5, ty: landY(f.x) - 1, vx: 0, vy: 0, wait: 0, rest: 0,
      col: fly ? ["monarch", "brimstone", "white", "blue"][Math.floor(q() * 4)] : "bee", id: j++ }); }
    // (where a bird perches: along the limbs of the great and tall trees, away from the trunk's foot; and atop each small tree)
    S.perches = []; for (const H of S.treeHomes || []) H.graph.pts.forEach((p, i) => { if (p[1] < H.oy - 2.5 && H.graph.nb[i].length <= 2 && Math.abs(p[0] - H.cx) > H.half + 0.6) S.perches.push({ H, i, px: p[0] }); });   // (out on a limb, not on the trunk)
    // (0.0.102: the big trees' limbs have thousands of points; every so many kept, about 600 perches, each with its column, px)
    { const k = Math.max(1, Math.ceil(S.perches.length / 600)); S.perches = S.perches.filter((pr, i) => i % k === 0); }
    // (and in each tree's crown, now three times as tall, three perches: low out to one side, higher to the other, near the top)
    for (const t of S.trees) if (!t.tall && t.kind !== 4) for (const [fx, fy] of [[-0.28, 0.5], [0.24, 0.66], [0.05, 0.84]]) S.perches.push({ tree: t, fx: fx * (t.kind === 1 ? 0.5 : 1), fy, px: t.x + 0.5 });
    const P = S.perches, perch = () => P[Math.floor(q() * P.length)];
    if (P.length) for (let k = 0; k < Math.min(12, Math.floor(P.length / 10)); k++) { const pr = perch(); S.birds.push({ kind: "jay", mode: "perch", perch: pr, x: 0, y: 0, face: q() < 0.5 ? -1 : 1, wait: 60 + Math.floor(q() * 400), id: j++ }); }
    const ground = (kind, x) => { const c = Math.max(1, Math.min(WW - 2, Math.floor(x))); return { kind, mode: "ground", home: c + 0.5, x: c + 0.5, y: landY(c), face: q() < 0.5 ? -1 : 1, wait: Math.floor(q() * 120), hop: null, peck: 0, id: j++ }; };
    for (const b of S.bushes) if (q() < 0.35 && !riverAt(b.x)) { const n = 3 + Math.floor(q() * 3); for (let i = 0; i < n; i++) S.birds.push(ground("sparrow", b.x + (q() - 0.5) * 3)); }
    for (let x = 6; x < WW - 6; x += 9) if (q() < 0.35 && !riverAt(x) && !riverAt(x + 3)) S.birds.push(ground("robin", x + q() * 3));
    for (let k = 0; k < 2; k++) S.birds.push({ kind: "hawk", mode: "soar", cx: 12 + k * 30, r: 6 + q() * 4, a: q() * 6.28, x: 12, y: 10, face: 1, wait: 1200 + Math.floor(q() * 1800), id: j++ });
    for (const R of S.rivers) { const n = R.w >= 8 ? 2 + Math.floor(q() * 3) : q() < 0.5 ? 1 : 0;
      for (let i = 0; i < n; i++) S.birds.push({ kind: "duck", R, mode: "swim", x: R.x + 0.8 + q() * (R.w - 1.6), tx: 0, face: q() < 0.5 ? -1 : 1, hen: i % 2 === 1, dab: 0, wait: Math.floor(q() * 200), id: j++ });
      if (R.name === "the river") for (let i = 0; i < 2; i++) S.birds.push({ kind: "swan", R, mode: "swim", x: R.x + 2 + i * 1.6 + q() * 2, tx: 0, face: 1, dab: 0, wait: Math.floor(q() * 300), id: j++ }); }
  }
  // (a perch's place now, in tiles, swaying with its tree as the squirrels do)
  function perchAt(pr) {
    if (pr.H) { const H = pr.H, p = H.graph.pts[pr.i], v = (H.spOy - (H.oy - p[1])) / H.spH; return [p[0] + (1 - v) * (1 - v) * H.lean() * H.spH, p[1] - 0.06]; }
    const t = pr.tree; if (!t.alive) return null; const hT = t.h * (t.kind === 1 ? 1.05 : 0.93) * t.grow, fy = pr.fy || 1;
    return [t.x + 0.5 + (pr.fx || 0) * hT + sway(t.seed, t.kind === 1 ? 0.6 : 1) * hT * 1.2 * fy * fy, surf0[t.x] - hT * fy];
  }
  const flyTo = (b, x1, y1, then) => { b.fly = { x0: b.x, y0: b.y, x1, y1, t: 0, dur: Math.max(30, Math.hypot(x1 - b.x, y1 - b.y) * (b.kind === "hawk" ? 9 : 6)), then }; b.mode = "fly"; b.face = x1 >= b.x ? 1 : -1; };
  function wildStep() {
    const g = S.g; if (!g || !S.birds) return; const gx = g.x / 1000, gy = g.y / 1000 - 0.5, wet = g.swim || g.under;
    // frogs
    for (const f of S.frogs) { if (!viewNear(f.x)) continue; const R = f.R, d = Math.hypot(f.x - gx, f.y - gy);
      if (f.mode === "jump") { const J = f.jump; J.t += 1 / J.dur; f.x = J.x0 + (J.x1 - J.x0) * J.t; f.y = J.y0 + (J.y1 - J.y0) * J.t - Math.sin(Math.PI * Math.min(1, J.t)) * J.h;
        if (J.t >= 1) { f.x = J.x1; f.y = J.y1; f.mode = J.into; if (J.into === "swim" && SND && d < 10 && S.frame - (WILD.plopAt || 0) > 30) { WILD.plopAt = S.frame; SND.splash(); } f.wait = 40 + Math.floor(rand() * 200); } continue; }
      if (f.mode === "swim") { const pads = R.plants.flatMap(P => P.kind === "lily" ? P.pads : []), aim = pads.length ? pads.reduce((a, b) => Math.abs(b.x - gx) > Math.abs(a.x - gx) ? b : a) : null;
        const tx = aim ? aim.x : f.bank ?? f.x, ty = R.level + 0.55; f.face = tx >= f.x ? 1 : -1; f.x += Math.sign(tx - f.x) * Math.min(0.035, Math.abs(tx - f.x)); f.y += (ty - f.y) * 0.08;
        if (Math.abs(tx - f.x) < 0.05 && d > 4 && --f.wait <= 0) { f.pad = aim; f.jump = { x0: f.x, y0: f.y, x1: tx, y1: waterY(R, tx, performance.now()) - 0.04, t: 0, dur: 24, h: 0.6, into: "sit" }; f.mode = "jump"; } continue; }
      // (sitting: riding its pad on the waves, or on the bank)
      if (f.pad) { f.x = f.pad.x; f.y = waterY(R, f.pad.x, performance.now()) - 0.04; } else f.y = landY(Math.floor(f.x));
      if (d < (wet ? 3.5 : 2.5)) { const away = f.x >= gx ? 1 : -1, tx = Math.max(R.x + 0.4, Math.min(R.x + R.w - 0.4, f.x + away * (0.8 + rand() * 0.8)));
        f.face = away; f.jump = { x0: f.x, y0: f.y, x1: tx, y1: R.level + 0.4, t: 0, dur: 26, h: 0.7, into: "swim" }; f.mode = "jump"; f.pad = null; f.wait = 90; continue; }
      if (rand() < 0.0035) { f.croak = S.frame; wildCall("croak", f.x, f.y); }
      const bug = S.bugs.find(b => !b.gone && Math.abs(b.x - (f.x + f.face * 0.5)) < 0.7 && f.y - b.y > -0.2 && f.y - b.y < 1.2);
      if (bug && S.frame - f.tongue > 60) { f.tongue = S.frame; f.tx = bug.x; f.ty = bug.y; bug.gone = S.frame; }
      if (--f.wait <= 0 && f.pad) { f.wait = 300 + Math.floor(rand() * 600); const pads = R.plants.flatMap(P => P.kind === "lily" ? P.pads : []).filter(p => p !== f.pad && Math.abs(p.x - f.x) < 2.6);
        if (pads.length) { const to = pads[Math.floor(rand() * pads.length)]; f.face = to.x >= f.x ? 1 : -1; f.jump = { x0: f.x, y0: f.y, x1: to.x, y1: waterY(R, to.x, performance.now()) - 0.04, t: 0, dur: 28, h: 0.75, into: "sit" }; f.mode = "jump"; f.pad = to; } } }
    // insects
    for (const b of S.bugs) { if (!viewNear(b.hx)) continue;
      if (b.gone) { if (S.frame - b.gone > 900) { b.gone = 0; b.x = b.hx; b.y = b.hy - 1.5; } continue; }
      if (b.kind === "dragon") { if (--b.wait <= 0) { b.tx = b.hx + (rand() - 0.5) * 2 * b.hw; b.ty = b.hy - 0.35 - rand() * 1.6; b.wait = 30 + Math.floor(rand() * 90); }
        const k = Math.hypot(b.tx - b.x, b.ty - b.y) > 0.05 ? 0.12 : 0; b.x += (b.tx - b.x) * k; b.y += (b.ty - b.y) * k + Math.sin(S.frame / 7 + b.id) * 0.004; if (Math.abs(b.tx - b.x) > 0.05) b.face = b.tx > b.x ? 1 : -1; continue; }
      if (b.rest > 0) { b.rest--; continue; }
      const fast = b.kind === "bee" ? 0.05 : 0.03, flee = Math.hypot(b.x - gx, b.y - gy) < 1.5;
      if (--b.wait <= 0) { b.wait = (b.kind === "bee" ? 20 : 50) + Math.floor(rand() * 80);
        if (!flee && rand() < (b.kind === "bee" ? 0.35 : 0.2)) { const fl = S.flowers.filter(f => Math.abs(f.x + 0.5 - b.hx) < b.hw && top[f.x] >= surf0[f.x]); if (fl.length) { const f = fl[Math.floor(rand() * fl.length)]; b.tx = f.x + 0.5 + (rand() - 0.5) * 0.4; b.ty = landY(f.x) - 0.5; b.land = true; } }
        else { b.tx = b.hx + (rand() - 0.5) * 2 * b.hw; b.ty = b.hy - 0.5 - rand() * 2.2; b.land = false; } }
      b.vx += Math.sign(b.tx - b.x) * fast * 0.12 + (rand() - 0.5) * 0.01; b.vy += Math.sign(b.ty - b.y) * fast * 0.1 + (rand() - 0.5) * 0.012; b.vx *= 0.9; b.vy *= 0.9;
      if (flee) { b.vx += Math.sign(b.x - gx) * 0.01; b.vy -= 0.006; }
      b.x += b.vx; b.y += b.vy; if (Math.abs(b.vx) > 0.004) b.face = b.vx > 0 ? 1 : -1;
      if (b.land && Math.hypot(b.tx - b.x, b.ty - b.y) < 0.12) { b.x = b.tx; b.y = b.ty; b.vx = b.vy = 0; b.rest = 90 + Math.floor(rand() * 200); b.land = false; } }
    // birds
    for (const b of S.birds) {
      if (b.kind === "hawk") { b.cx += (gx - b.cx) * 0.0015;
        if (b.mode === "soar") { b.a += 0.006; const c = Math.max(0, Math.min(WW - 1, Math.round(b.cx))), base = Math.min(surf0[c], S.cam.y + VH * 0.5) - 9;
          const nx = b.cx + Math.cos(b.a) * b.r * 1.6, ny = base + Math.sin(b.a) * b.r * 0.3; b.face = nx >= b.x ? 1 : -1; b.x = nx; b.y = ny;
          if (--b.wait <= 0) { const G = S.greats.filter(G => Math.abs(G.x - b.x) < 30).sort((a, c2) => Math.abs(a.x - b.x) - Math.abs(c2.x - b.x))[0];
            if (G) { b.rest = G; flyTo(b, G.x + 0.5, G.foot - G.h * 0.74 - 0.9, "rest"); wildCall("hawk", b.x, b.y); } else b.wait = 900; } }
        else if (b.mode === "fly") stepFlight(b);
        else if (b.mode === "rest") { if (--b.wait <= 0 || Math.hypot(b.x - gx, b.y - gy) < 3) { b.wait = 1500 + Math.floor(rand() * 2000); b.a = Math.atan2((b.y - (surf0[Math.round(b.cx)] - 9)) / 0.3, (b.x - b.cx) / 1.6) || 0; flyTo(b, b.cx + Math.cos(b.a) * b.r * 1.6, b.y - 3, "soar"); } }
        continue; }
      if (b.kind === "duck" || b.kind === "swan") { const R = b.R; if (!viewNear(R.x + R.w / 2, 14)) continue; const near = Math.abs(b.x - gx) < (wet ? 3.5 : 2.2) && gy > R.level - 2.5;
        if (near) { b.tx = gx < R.x + R.w / 2 ? R.x + R.w - 0.6 : R.x + 0.6; b.dab = 0; if (rand() < 0.02) wildCall(b.kind === "duck" ? "quack" : "honk", b.x, R.level); }
        else if (--b.wait <= 0) { b.wait = 120 + Math.floor(rand() * 400); b.tx = R.x + 0.7 + rand() * (R.w - 1.4); if (b.kind === "duck" && rand() < 0.35) b.dab = 70 + Math.floor(rand() * 60); if (rand() < 0.15) wildCall(b.kind === "duck" ? "quack" : "honk", b.x, R.level); }
        if (b.dab > 0) { b.dab--; continue; }
        const sp = (near ? 0.04 : 0.012) * (b.kind === "swan" ? 0.8 : 1); if (Math.abs(b.tx - b.x) > 0.05) { b.face = b.tx > b.x ? 1 : -1; b.x += Math.sign(b.tx - b.x) * Math.min(sp, Math.abs(b.tx - b.x)); }
        continue; }
      if (!viewNear(b.mode === "fly" ? b.fly.x1 : b.x, 14) && !viewNear(b.x, 14)) continue;
      const scare = Math.hypot(b.x - gx, b.y - gy) < (b.kind === "jay" ? 2.2 : 3);
      if (b.mode === "fly") { stepFlight(b); continue; }
      if (b.mode === "perch") { const at = perchAt(b.perch); if (!at) { b.mode = "ground"; b.home = b.x; continue; } b.x = at[0]; b.y = at[1];
        if (scare || --b.wait <= 0) { b.wait = 200 + Math.floor(rand() * 500);
          if (b.home != null && !scare && Math.hypot(b.home - gx, landY(Math.floor(b.home)) - gy) > 6) { flyTo(b, b.home, landY(Math.floor(b.home)), "ground"); continue; }
          const opts = S.perches.filter(pr => pr !== b.perch && Math.abs(pr.px - b.x) < 16 && (() => { const a = perchAt(pr); return a && Math.abs(a[0] - b.x) < (scare ? 12 : 7) && Math.hypot(a[0] - gx, a[1] - gy) > 4; })());
          if (opts.length) { const pr = opts[Math.floor(rand() * opts.length)], a = perchAt(pr); b.perch = pr; flyTo(b, a[0], a[1], "perch"); if (rand() < 0.4) wildCall(b.kind === "jay" ? "jay" : b.kind === "robin" ? "robin" : "chirp", b.x, b.y); } }
        continue; }
      // (on the ground: hops and pecks; the gnome near, up into the nearest tree away from it)
      b.y = landY(Math.max(0, Math.min(WW - 1, Math.floor(b.x))));
      if (scare) { const opts = S.perches.filter(pr => Math.abs(pr.px - b.x) < 16).map(pr => [pr, perchAt(pr)]).filter(([, a]) => a && Math.abs(a[0] - b.x) < 12 && Math.hypot(a[0] - gx, a[1] - gy) > 4).sort((p1, p2) => Math.abs(p1[1][0] - b.x) - Math.abs(p2[1][0] - b.x));
        if (opts.length) { const [pr, a] = opts[Math.floor(rand() * Math.min(3, opts.length))]; b.perch = pr; b.wait = 300 + Math.floor(rand() * 300); flyTo(b, a[0], a[1], "perch"); wildCall(b.kind === "robin" ? "robin" : "chirp", b.x, b.y); continue; } }
      if (b.hop) { b.hop.t += 1 / 10; b.x = b.hop.x0 + (b.hop.x1 - b.hop.x0) * Math.min(1, b.hop.t); if (b.hop.t >= 1) b.hop = null; continue; }
      if (b.peck > 0) { b.peck--; continue; }
      if (--b.wait <= 0) { b.wait = 20 + Math.floor(rand() * 90); if (rand() < 0.45) b.peck = 18 + Math.floor(rand() * 20);
        else { const dx = (rand() < 0.5 ? -1 : 1) * (0.15 + rand() * 0.25), to = Math.abs(b.x + dx - b.home) > 3 ? b.x - dx : b.x + dx, c = Math.floor(to);
          if (c > 0 && c < WW - 1 && !riverAt(to) && Math.abs(landY(c) - b.y) < 0.6) { b.face = to > b.x ? 1 : -1; b.hop = { x0: b.x, x1: to, t: 0 }; } } } }
  }
  function stepFlight(b) {
    const F = b.fly; F.t += 1 / F.dur; const t = Math.min(1, F.t), e = t * t * (3 - 2 * t), arc = Math.sin(Math.PI * t) * Math.min(2, Math.hypot(F.x1 - F.x0, F.y1 - F.y0) * 0.25);
    b.x = F.x0 + (F.x1 - F.x0) * e; b.y = F.y0 + (F.y1 - F.y0) * e - arc;
    if (F.t >= 1) { b.mode = F.then; b.x = F.x1; b.y = F.y1; if (b.mode === "rest") b.wait = 600 + Math.floor(rand() * 900); }
  }
  // ---- (0.0.102; Matthew, 2026-11-24: "introduce bunny rabbits. one of the bunnys has a special saddle, like a horse, and
  // reins. if we have a carrot piece and give that rabbit the carrot piece, it will let us rid it around the world. We can get
  // on and off, and when on, we hop around and avoid water (jumping over it is an option, but not swimming)"; "the rabbit
  // should hop"; "jumping is very high, so we can jump over each stream/creek"; "the rabbit can dig very fast --- faster than
  // the gnome"; "when the gnome has swim gear, the rabbit can swim underground to dig"; "the gnome has a kit that supplies stuff
  // to the rabbit"; "climbing is enabled with the climbing gear, like the swimming gear") The bunnies: wild ones in the meadows,
  // nibbling and hopping about their homes, and away from a gnome on foot; and Clover, saddled and bridled, in the meadow past
  // the carrot garden by the start. Give her a carrot (R, or 🐇) and she lets the gnome ride. The gnome's own step in Hazel
  // (World.step) moves the two of them, as the page asks it: twice as fast across; a hop at every landing while a way is held;
  // a leap (↑) nearly six tiles high, long enough to clear the creeks and the stream; digging three times as fast; the ladders,
  // the stair and the trees only with the climbing pack (without it, the window World.step sees has nothing to climb); the
  // water only with the diving gear (without it, water at her feet ahead is a wall to her, but not in a leap, and a landing in
  // the water puts her back where she last stood dry). With the pack or the gear, she wears her own (the gnome's kit has one
  // for her). Off again (R) anywhere on the ground; she waits there
  const RABBIT_FUR = [["#9c8466", "#6e5a44", "#efe6d6"], ["#a8a39a", "#77726a", "#f2efe8"], ["#8a6a4a", "#5e4630", "#eadcc4"], ["#c9b89a", "#9a8668", "#f6efe2"]];
  function makeBunnies() {
    const rr = seededR(S.seed * 11 + 91); let j = 0; const q = () => rr(j++);
    S.bunnies = []; S.carrots = 0; S.ride = { on: false, leap: false, hop: false, safe: null };
    const open = c => c > 4 && c < WW - 5 && !riverAt(c) && !riverAt(c - 3) && !riverAt(c + 3) && Math.abs(surf0[c - 1] - surf0[c + 1]) <= 1 && !S.greats.some(G => Math.abs(G.x - c) < 4);
    for (let x = 20; x < WW - 20; x += 28 + Math.floor(q() * 30)) if (open(x)) { const n = q() < 0.4 ? 2 : 1;
      for (let i = 0; i < n; i++) S.bunnies.push({ x: x + 0.5 + i * 1.4, home: x + 0.5, face: q() < 0.5 ? -1 : 1, hop: null, wait: Math.floor(q() * 200), nib: 0, ear: 0, id: j, fur: RABBIT_FUR[1 + Math.floor(q() * 3)] }); }
    let c = 44; while (c < 90 && !open(c)) c++;
    S.mount = { x: (c + 0.5) * 1000, y: surf0[c] * 1000, face: -1, tame: false, nib: 0, ear: 0, wait: 60 };
    for (const gc of [26, 29, 32]) { let cc = gc; while (cc < gc + 8 && !open(cc)) cc++; S.items.push({ kind: "carrot", x: cc + 0.5, y: surf0[cc] - 0.5, taken: false }); }
    const pantry = S.rooms.find(R => R.kind === 3); if (pantry) S.items.push({ kind: "carrot", x: pantry.x + pantry.w * 0.7, y: pantry.y + 3.3, taken: false });
  }
  function bunniesStep() {
    const g = S.g; if (!g || !S.bunnies) return; const gx = g.x / 1000, gy = g.y / 1000, riding = S.ride.on, M = S.mount;
    if (M && !riding) { const c = Math.floor(M.x / 1000); let r = Math.ceil(M.y / 1000 - 0.001); while (r < WH && !floorAt(c, r)) r++;   // (if the ground under her went, she drops onto what is under it)
      if (r * 1000 > M.y) M.y = Math.min(r * 1000, M.y + 200);
      if (M.nib > 0) M.nib--; else if (--M.wait <= 0) { M.wait = 90 + Math.floor(rand() * 240); if (rand() < 0.55) M.nib = 50 + Math.floor(rand() * 70); else M.face = g.x > M.x ? 1 : -1; }
      M.ear = Math.max(0, M.ear - 0.03); if (rand() < 0.008) M.ear = 0.45; }
    for (const b of S.bunnies) { if (!viewNear(b.x, 12)) continue;
      if (b.hop) { const H = b.hop; H.t += 1 / H.dur; b.x = H.x0 + (H.x1 - H.x0) * Math.min(1, H.t); if (H.t >= 1) { b.hop = null; b.wait = b.flee ? 1 : 25 + Math.floor(rand() * 120); } continue; }
      const by = landY(Math.max(0, Math.min(WW - 1, Math.floor(b.x)))), d = Math.hypot(b.x - gx, by - gy);
      b.flee = d < 3.5 && !riding; b.ear = Math.max(0, b.ear - 0.03); if (rand() < 0.006) b.ear = 0.45;
      if (b.nib > 0 && !b.flee) { b.nib--; continue; }
      if (!b.flee && --b.wait > 0) continue;
      if (!b.flee && rand() < 0.45) { b.nib = 60 + Math.floor(rand() * 100); b.wait = 40; continue; }
      const away = b.flee ? (b.x >= gx ? 1 : -1) : Math.abs(b.x - b.home) > 5 ? Math.sign(b.home - b.x) : rand() < 0.5 ? -1 : 1;
      const to = b.x + away * (b.flee ? 1.5 + rand() * 0.8 : 0.5 + rand() * 0.7), c = Math.floor(to);
      if (c > 1 && c < WW - 2 && !riverAt(to) && Math.abs(landY(c) - by) < 1.3) { b.face = away; b.hop = { x0: b.x, x1: to, y0: by, y1: landY(c), t: 0, dur: b.flee ? 16 : 22, h: b.flee ? 0.9 : 0.45 }; }
      else { b.face = -away; b.wait = 40; } }
  }
  // (what World.step sees round Clover and the gnome: nothing to climb without the pack; without the gear, outside a leap, a
  // column beside her with water at her feet or below them, before any ground, a wall)
  function rideNear(g) {
    const cx = Math.floor(g.x / 1000), cy = Math.floor((g.y - 1) / 1000), R = S.ride, wall = [false, false, false];
    if (!g.gear && !R.leap && !g.swim && !g.under) for (const d of [-1, 1]) for (let r = cy - 1; r <= cy + 12; r++) { const v = code(cx + d, r); if (v & 16 && v < 64) { wall[d + 1] = true; break; } if (r > cy && (v & 15) >= 1 && (v & 15) <= 10) break; }
    const t = (c, r) => { if (wall[c - cx + 1] && r <= cy) return 10; const v = code(c, r); return !g.climbPack && v < 64 && (v & 32) ? v - 32 : v; };
    const row = r => t(cx - 1, r) + 512 * t(cx, r) + 262144 * t(cx + 1, r);
    return { cx, cy, r0: row(cy - 3), r1: row(cy - 2), r2: row(cy - 1), r3: row(cy), r4: row(cy + 1) };
  }
  function rideStep(h) {
    const k = S.keys, R = S.ride, g0 = S.g, dx = (k.right ? 1 : 0) - (k.left ? 1 : 0), wet = g0.swim || g0.under;
    // (↑ pressed while she is in the air, between hops, is kept a moment, for when she lands; a leap goes its whole height, up held or not)
    if (S.jumpQueued) R.want = 40; else if (R.want > 0) R.want--;
    const leap = (R.want > 0 || (k.up && R.leapt)) && g0.ground && !g0.climb && !wet, hop = !leap && g0.ground && dx !== 0 && !k.dig && !k.down && !g0.climb && !wet;
    // (rising in a hop or a leap, World.step is told up is held, so that it does not cut the jump short)
    const pad = { dx: k.dig ? dx : dx * 2, up: k.up || ((R.hop || R.leap) && !g0.ground && g0.vy < 0), down: k.down, jump: leap || hop || (S.jumpQueued && (g0.climb || wet)), dig: !!k.dig };
    if (leap) R.want = 0;
    S.jumpQueued = false;
    const t0 = performance.now();
    let g = { ...h.step(g0, rideNear(g0), pad) };   // (a plain copy: a record World.step gives back keeps its fields inside, and a change made to it here would not reach the next step)
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 120) S.stepMs.shift();
    if (g0.climbPack) g.climbPack = true; g.face = g.face < 0 ? -1 : 1;
    if (g.ev === 2) { if (leap) { g.vy = -360; R.leap = true; R.leapt = true; R.hop = false; } else { g.vy = -165; R.hop = true; } }
    if (!k.up) R.leapt = false;   // (up held: leap again at each landing)
    if (g.ground || g.climb || g.swim || g.under) R.hop = R.leap = false;
    if (g.dc >= 0 && g.dt > 0) g.dt += 2;   // (she digs three times as fast)
    if (!g.gear && (g.swim || g.under) && R.safe) {   // (no swimming without the diving gear: back onto the bank)
      g = { ...g, x: R.safe.x, y: R.safe.y, vx: 0, vy: 0, swim: false, under: false, ground: true, climb: false, air: 600, ev: 0, dc: -1, dr: -1, dt: 0 }; R.hop = R.leap = false;
      if (SND) SND.splash(); S.banner = { text: "🐇 Clover won't swim without her diving kit 🤿", t: performance.now() }; }
    if (g.ground && !g.swim && !g.under) R.safe = { x: g.x, y: g.y };
    S.g = g;
    if (g.ev === 1 && g.dc >= 0) digOut(g.dc, g.dr);
    else if (g.ev === 3 && SND) SND.splash();
    else if (g.ev === 4) hurt("😵 out of breath");
    pickups();
  }
  const nearClover = () => { const g = S.g, M = S.mount; return !!(g && M && !S.ride.on && Math.abs(M.x - g.x) < 1700 && Math.abs(M.y - g.y) < 1500); };
  function rideToggle() {
    const g = S.g, R = S.ride, M = S.mount; if (!g || !M || S.faintAt || BOT.on) return;
    const say = text => { S.banner = { text, t: performance.now() }; };
    if (R.on) { if (!g.ground || g.swim || g.under || g.climb) { say("🐇 Get off on solid ground"); return; }
      R.on = false; M.x = g.x; M.y = g.y; M.face = g.face; M.wait = 120; M.nib = 0;
      const c = Math.floor((g.x - g.face * 700) / 1000), r = Math.floor((g.y - 1) / 1000), free = inside(c, r) && mat[at(c, r)] === AIR && inside(c, r - 1) && mat[at(c, r - 1)] === AIR && floorAt(c, r + 1);
      S.g = { ...g, x: free ? g.x - g.face * 700 : g.x, vx: 0, vy: 0, dc: -1, dr: -1, dt: 0 }; say("🐇 Off you hop: Clover waits here"); return; }
    if (!nearClover()) return;
    if (!M.tame) { if (!(S.carrots > 0)) { say("🐇 Clover would like a carrot 🥕"); return; }
      S.carrots--; M.tame = true; if (SND) SND.gem(); say("🥕 Clover munches the carrot, and lets you ride! (R to get off)"); }
    R.on = true; R.hop = R.leap = false; R.safe = { x: M.x, y: M.y };
    S.g = { ...g, x: M.x, y: M.y, vx: 0, vy: 0, ground: true, climb: false, swim: false, under: false, face: M.face, dc: -1, dr: -1, dt: 0 };
  }
  // ---- (0.0.102; Matthew: "let's add different music tracks, --- look at the gnome dig game, and messed up dress up, and let's take
  // the current loop and extend it into about 10 sections that vary the current loop"; "I'd like a reggae dub remix of the current
  // music when we are under water --- half tempo -- keep the beat going, and fade like a DJ") The music by where the gnome is, as
  // each of Dress Up's backgrounds has its own tune, from Gnome dig's: on the land, Lantern road (the gnome's hop grown to ten
  // sections); under the ground, Root cellar; in a village, Second line; high in the great trees, Garden sun; riding Clover,
  // Boardwalk; and under the water, the dub of whichever it is, at half time, from the same bar so the beat goes on. A change
  // waits until the gnome has been in the new place a second and a half (the dub, a third of a second under), and comes in on
  // the next bar over two and a half seconds, the other going out thinned from the bottom (../shared/chip.js, mix)
  const MUSIC = { land: "Lantern road", under: "Root cellar", village: "Second line", trees: "Garden sun", ride: "Boardwalk" };
  const DJ = { place: "land", dub: false, cand: "land", candAt: 0, wet: 0 };
  function placeOfGnome() { const g = S.g; if (!g) return "land"; if (S.ride && S.ride.on) return "ride";
    const gx = g.x / 1000, c = Math.max(0, Math.min(WW - 1, Math.floor(gx))), depth = g.y / 1000 - surf0[c];
    if (depth > 3 && S.villages.some(v => gx >= v.x0 - 1 && gx <= v.x1 + 1)) return "village"; if (depth > 4) return "under"; if (depth < -12) return "trees"; return "land"; }
  function musicStep() {
    if (!SND || !SND.mix || !SND.musicOn || S.party) return;
    const p = placeOfGnome(); if (p !== DJ.cand) { DJ.cand = p; DJ.candAt = S.frame; }
    DJ.wet = S.g && S.g.under ? Math.min(DJ.wet + 15, 60) : Math.max(DJ.wet - 15, 0);
    const dub = DJ.dub ? DJ.wet > 0 : DJ.wet >= 20, place = S.frame - DJ.candAt >= 90 ? DJ.cand : DJ.place;
    if (place !== DJ.place || dub !== DJ.dub) { DJ.place = place; DJ.dub = dub; SND.mix(MUSIC[place], { dub }); }
  }
  const musicNow = () => MUSIC[DJ.place];
  // ---- drawing the wildlife
  // (a frog from the side, facing right: sitting, its long hind leg folded under it, eye up on its head, throat puffed when it
  // croaks, the tongue out to an insect; leaping, stretched out; swimming, its legs kicking)
  function drawFrog(f, s, now) {
    const c = ctx, u = s * 0.62, x = f.x * s, y = f.y * s, G = "#5aa13a", Gd = "#3f7d28", spot = "#2f6a24", belly = "#dfe9a8";
    const E = (col, ex, ey, rx, ry, a = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(ex * u, ey * u, rx * u, ry * u, a, 0, 7); c.fill(); };
    c.save(); c.translate(x, y); c.scale(f.face, 1);
    if (f.mode === "jump" || f.mode === "swim") { const J = f.jump, ang = f.mode === "jump" ? Math.atan2((J.y1 - J.y0) - Math.cos(Math.PI * Math.min(1, J.t)) * Math.PI * J.h, Math.abs(J.x1 - J.x0) + 0.01) * 0.6 : 0, k = f.mode === "swim" ? Math.sin(now / 120) : 1;
      c.translate(0, -0.2 * u); c.rotate(ang);
      for (const side of [-1, 1]) { const ext = 0.45 + 0.25 * k * side * (f.mode === "swim" ? 1 : 0); c.strokeStyle = side < 0 ? Gd : G; c.lineWidth = 0.1 * u; c.lineCap = "round"; c.beginPath(); c.moveTo(-0.25 * u, 0); c.lineTo(-(0.25 + ext * 0.6) * u, (0.05 + side * 0.05) * u); c.lineTo(-(0.25 + ext * 1.3) * u, (0.02 + side * 0.08) * u); c.stroke();
        E(side < 0 ? Gd : G, -(0.3 + ext * 1.3), 0.02 + side * 0.08, 0.1, 0.035, 0.3); }
      E(G, 0, 0, 0.42, 0.17); E(belly, 0.05, 0.08, 0.3, 0.07); E(G, 0.38, -0.03, 0.18, 0.13); for (const [sx, sy] of [[-0.15, -0.08], [0.05, -0.1], [-0.28, -0.02]]) E(spot, sx, sy, 0.05, 0.035);
      E(G, 0.38, -0.14, 0.08, 0.07); E("#e8c43a", 0.39, -0.15, 0.055, 0.05); E("#111", 0.395, -0.15, 0.04, 0.02);
      c.strokeStyle = G; c.lineWidth = 0.07 * u; c.beginPath(); c.moveTo(0.25 * u, 0.08 * u); c.lineTo(0.5 * u, 0.18 * u); c.stroke(); c.lineCap = "butt"; c.restore(); return; }
    // sitting
    E(Gd, -0.02, -0.03, 0.3, 0.06, 0.08); E(Gd, 0.28, -0.03, 0.09, 0.035);   // (the far foot, the near hand's toes)
    E(G, -0.2, -0.16, 0.26, 0.15, -0.35);   // (the thigh, folded)
    E(G, 0.02, -0.3, 0.4, 0.22, -0.4); E(belly, 0.12, -0.2, 0.26, 0.11, -0.35);   // (the body, its belly)
    E(G, 0.33, -0.47, 0.21, 0.15, -0.12);   // (the head)
    for (const [sx, sy, r] of [[-0.12, -0.42, 0.05], [0.04, -0.47, 0.04], [-0.27, -0.24, 0.045], [0.1, -0.36, 0.03], [-0.25, -0.12, 0.035]]) E(spot, sx, sy, r, r * 0.75);
    E(G, 0.33, -0.6, 0.1, 0.09); E("#e8c43a", 0.34, -0.61, 0.072, 0.066); E("#111", 0.345, -0.61, 0.052, 0.024); E("#fff", 0.36, -0.635, 0.016, 0.013);   // (the eye, gold, its pupil level)
    E(Gd, 0.42, -0.55, 0.025, 0.02);   // (the nostril)
    c.strokeStyle = "#2a4a1a"; c.lineWidth = Math.max(1, 0.025 * u); c.beginPath(); c.moveTo(0.18 * u, -0.42 * u); c.quadraticCurveTo(0.4 * u, -0.4 * u, 0.53 * u, -0.46 * u); c.stroke();
    E("#8a6a3a", 0.2, -0.47, 0.04, 0.04);   // (the eardrum)
    c.strokeStyle = G; c.lineWidth = 0.07 * u; c.lineCap = "round"; c.beginPath(); c.moveTo(0.22 * u, -0.25 * u); c.lineTo(0.3 * u, -0.05 * u); c.stroke(); c.lineCap = "butt";   // (the front leg)
    const cr = S.frame - f.croak; if (cr < 40) { const puff = 0.6 + 0.4 * Math.abs(Math.sin(cr / 6)); E("rgba(248,244,205,0.95)", 0.36, -0.33, 0.13 * puff, 0.11 * puff); }
    const tg = S.frame - f.tongue; if (tg < 12) { const k = Math.sin(Math.PI * tg / 12); c.strokeStyle = "#e0607a"; c.lineWidth = Math.max(1.5, 0.05 * u); c.lineCap = "round"; c.beginPath(); c.moveTo(0.52 * u, -0.45 * u);
      c.lineTo(0.52 * u + ((f.tx - f.x) * f.face * s - 0.52 * u) * k, -0.45 * u + ((f.ty - f.y) * s + 0.45 * u) * k); c.stroke(); c.lineCap = "butt"; }
    c.restore();
  }
  // (a dragonfly: a long slim abdomen, ringed, a thorax, big eyes, four clear wings beating to a blur; a butterfly: its wings
  // opening and closing, each kind its own colors and marks; a bumblebee: round, banded black and gold, its wings a blur)
  const BFLY = { monarch: ["#e8781c", "#1a1a1a", "#ffffff"], brimstone: ["#f3e04a", "#c9b22a", "#e8d23a"], white: ["#f6f4ec", "#3a3a3a", "#d8d6cc"], blue: ["#6a8fe0", "#2a3a7a", "#ffffff"] };
  function drawBug(b, s, now) {
    if (b.gone) return; const c = ctx, x = b.x * s, y = b.y * s; c.save(); c.translate(x, y); c.scale(b.face || 1, 1);
    if (b.kind === "dragon") { const u = s * 0.8, f = Math.sin(now / 18 + b.id);
      c.fillStyle = "rgba(220,235,255,0.45)"; for (const [wx, a] of [[0.02, -0.5 + f * 0.35], [-0.04, -0.6 - f * 0.35]]) { c.save(); c.translate(wx * u, -0.02 * u); c.rotate(a); c.beginPath(); c.ellipse(0, -0.2 * u, 0.06 * u, 0.22 * u, 0, 0, 7); c.fill(); c.restore(); }
      c.strokeStyle = b.col; c.lineWidth = Math.max(1, 0.04 * u); c.lineCap = "round"; c.beginPath(); c.moveTo(-0.05 * u, 0); c.lineTo(-0.5 * u, 0.02 * u); c.stroke();
      c.strokeStyle = "rgba(0,0,0,0.5)"; c.lineWidth = Math.max(1, 0.02 * u); c.beginPath(); for (let i = 1; i < 7; i++) { const sx = -0.05 * u - i * 0.065 * u; c.moveTo(sx, -0.02 * u); c.lineTo(sx, 0.025 * u); } c.stroke();
      c.fillStyle = b.col; c.beginPath(); c.ellipse(0.02 * u, 0, 0.07 * u, 0.045 * u, 0, 0, 7); c.fill(); c.fillStyle = "#1a2a3a"; c.beginPath(); c.arc(0.1 * u, -0.01 * u, 0.04 * u, 0, 7); c.fill(); c.lineCap = "butt"; c.restore(); return; }
    if (b.kind === "bee") { const u = s * 0.26, f = Math.sin(now / 15 + b.id);
      c.fillStyle = "rgba(230,240,255,0.6)"; c.beginPath(); c.ellipse(-0.05 * u, -0.35 * u, 0.18 * u, (0.25 + 0.1 * f) * u, -0.3, 0, 7); c.fill();
      c.fillStyle = "#f2b81e"; c.beginPath(); c.ellipse(0, 0, 0.42 * u, 0.3 * u, 0, 0, 7); c.fill(); c.fillStyle = "#1a1a1a"; for (const bx of [-0.18, 0.08]) c.fillRect(bx * u, -0.3 * u, 0.1 * u, 0.6 * u);
      c.beginPath(); c.arc(0.4 * u, -0.02 * u, 0.17 * u, 0, 7); c.fill(); c.restore(); return; }
    const [w, k, d] = BFLY[b.col] || BFLY.monarch, u = s * 0.42, open = b.rest > 0 ? 0.55 + 0.45 * Math.sin(now / 500 + b.id) : Math.abs(Math.sin(now / 70 + b.id));
    c.fillStyle = "#2a2018"; c.beginPath(); c.ellipse(0, 0, 0.2 * u, 0.04 * u, 0, 0, 7); c.fill();
    for (const [sy, sc] of [[-1, 1], [1, 0.75]]) { c.save(); c.scale(1, -sy * Math.max(0.08, open)); c.fillStyle = w; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(0.35 * u, -0.6 * u * sc, -0.1 * u, -0.75 * u * sc, -0.15 * u, -0.1 * u); c.closePath(); c.fill();
      c.strokeStyle = k; c.lineWidth = Math.max(1, 0.04 * u); c.stroke(); c.fillStyle = d; c.beginPath(); c.arc(0.05 * u, -0.45 * u * sc, 0.04 * u, 0, 7); c.fill(); c.restore(); }
    c.strokeStyle = "#2a2018"; c.lineWidth = Math.max(1, 0.02 * u); c.beginPath(); c.moveTo(0.18 * u, -0.02 * u); c.lineTo(0.3 * u, -0.14 * u); c.stroke(); c.restore();
  }
  // (a bird from the side, facing right, its kind's size and colors: standing, perched or swimming, or flying, its wings beating;
  // the hawk soaring on still wings, a beat now and then)
  const BIRD = {
    sparrow: { L: 0.24, body: "#9a6a3a", back: "#7a4e28", belly: "#ddd0b8", head: "#8a5a32", cap: "#6e6a62", face: "#c8c2b4", bill: "#4a4038", tail: "#6a4424", mark: "#2a2018" },
    robin: { L: 0.3, body: "#6e6256", back: "#5e5248", belly: "#e0662a", head: "#3a3430", cap: "#3a3430", face: "#3a3430", bill: "#e0b030", tail: "#3a3430", mark: "#fff" },
    jay: { L: 0.34, body: "#4a86d8", back: "#3a72c4", belly: "#eef0f4", head: "#4a86d8", cap: "#3a72c4", face: "#f4f6f8", bill: "#1a1a1a", tail: "#2f62b8", mark: "#1a1a1a", crest: true, bars: true },
    hawk: { L: 0.62, body: "#7a4e2a", back: "#5e3a1e", belly: "#f0e3cc", head: "#6a4426", cap: "#5e3a1e", face: "#efe2c8", bill: "#2a2a2a", tail: "#b5552a", mark: "#4a2e18", hook: true },
  };
  // (0.0.102; Matthew: "birds will generally look better if scaled up by 2x compared to current size. more detail on larger birds
  // so they aren't just ovals with line-wings sticking out") A bird twice the size, drawn as a bird is built: one smooth body,
  // the breast full and the back flat, narrowing into a tail of four feathers fanned a little, each with a pale edge; a round
  // head, its cap and cheek, an eye with a pale ring and a glint, the bill in two halves; perched, its wing folded along its side
  // (the coverts, then the long flight feathers stacked to their tips, each edged) and its legs gripping, three toes forward
  // and one back; flying, each wing spread, its leading edge bent at the wrist, five primaries fingered at the tip and the
  // secondaries scalloped back to the body, the far wing darker. Its kind's marks: a sparrow's streaked back and wing bars, a
  // robin's eye ring, a jay's crest, necklace and barred wings, a hawk's streaked breast, barred tail and hooked yellow-based bill
  function birdBody(c, u, K, flap, perched, now, id) {
    const E = (col, ex, ey, rx, ry, a = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(ex * u, ey * u, rx * u, ry * u, a, 0, 7); c.fill(); };
    const lw = Math.max(1, 0.02 * u), dk = mixHex(K.back, "#000000", 0.3), pale = mixHex(K.back, "#ffffff", 0.35), up = perched ? 0 : Math.sin(flap), hy = perched ? -0.17 : -0.07;
    const wing = near => { const ox = near ? 0.06 : -0.03, k = near ? 1 : 0.86, col = near ? K.back : dk;
      const wx = ox - 0.1, wy = -0.46 * up * k - 0.03, tx = ox - 0.44, ty = -0.9 * up * k - 0.02, rx = ox - 0.34, ry = -0.42 * up * k + 0.05;
      c.fillStyle = col; c.beginPath(); c.moveTo((ox + 0.1) * u, -0.04 * u); c.quadraticCurveTo((ox + 0.02) * u, (wy * 0.55 - 0.05) * u, wx * u, wy * u); c.lineTo(tx * u, ty * u);
      for (let f = 1; f <= 5; f++) { const t = f / 5, bx = tx + (rx - tx) * t, by = ty + (ry - ty) * t, nx = bx + 0.05, ny = by - 0.03 * Math.sign(up || 1); c.lineTo(nx * u, ny * u); c.lineTo(bx * u, by * u); }
      for (let f = 1; f <= 4; f++) { const t = f / 4, x = rx + (ox - 0.14 - rx) * t, y = ry + (0.02 - ry) * t; c.quadraticCurveTo((x - 0.04) * u, (y + 0.05) * u, x * u, y * u); }
      c.closePath(); c.fill();
      c.fillStyle = near ? pale : K.back; c.beginPath(); c.moveTo((ox + 0.1) * u, -0.04 * u); c.quadraticCurveTo((ox + 0.02) * u, (wy * 0.55 - 0.05) * u, wx * u, wy * u);
      c.lineTo((wx - 0.12) * u, (wy + (ty - wy) * 0.3) * u); c.quadraticCurveTo((ox - 0.08) * u, (wy * 0.4) * u, (ox - 0.02) * u, 0.02 * u); c.closePath(); c.globalAlpha = 0.55; c.fill(); c.globalAlpha = 1;
      c.strokeStyle = "rgba(0,0,0,0.28)"; c.lineWidth = lw; c.beginPath(); for (let f = 1; f <= 4; f++) { const t = f / 5; c.moveTo((wx - 0.04) * u, (wy + 0.03) * u); c.lineTo((tx + (rx - tx) * t + 0.03) * u, (ty + (ry - ty) * t) * u); } c.stroke();
      if (K.bars && near) { c.strokeStyle = K.mark; c.lineWidth = lw * 1.5; c.beginPath(); for (let f = 0; f < 3; f++) { const t = 0.35 + f * 0.2; c.moveTo((wx + (rx - wx) * t) * u, (wy + (ry - wy) * t) * u); c.lineTo((wx + (tx - wx) * t) * u, (wy + (ty - wy) * t) * u); } c.stroke(); } };
    if (!perched) wing(false);
    c.save(); c.translate(-0.28 * u, perched ? 0.02 * u : -0.01 * u); c.rotate(perched ? 0.42 : 0.03);   // (the tail)
    for (let i = 0; i < 4; i++) { c.save(); c.rotate((i - 1.5) * (perched ? 0.06 : 0.11)); c.fillStyle = i % 2 ? K.tail : mixHex(K.tail, "#000000", 0.15);
      c.beginPath(); c.moveTo(0, -0.045 * u); c.lineTo(-0.3 * u, -0.042 * u); c.quadraticCurveTo(-0.36 * u, 0, -0.3 * u, 0.042 * u); c.lineTo(0, 0.045 * u); c.fill();
      c.strokeStyle = "rgba(255,255,255,0.22)"; c.lineWidth = lw; c.beginPath(); c.moveTo(-0.05 * u, 0.04 * u); c.lineTo(-0.3 * u, 0.04 * u); c.stroke(); c.restore(); }
    if (K.hook) { c.strokeStyle = K.mark; c.lineWidth = lw * 1.6; c.beginPath(); for (const bx of [-0.12, -0.2, -0.27]) { c.moveTo(bx * u, -0.06 * u); c.lineTo(bx * u, 0.06 * u); } c.stroke(); }
    c.restore();
    c.save(); c.rotate(perched ? -0.15 : 0);   // (the body)
    const body = () => { c.beginPath(); c.moveTo(0.3 * u, -0.12 * u); c.bezierCurveTo(0.43 * u, 0.02 * u, 0.3 * u, 0.2 * u, 0.04 * u, 0.2 * u); c.bezierCurveTo(-0.16 * u, 0.2 * u, -0.28 * u, 0.1 * u, -0.36 * u, 0.04 * u);
      c.lineTo(-0.36 * u, -0.04 * u); c.bezierCurveTo(-0.2 * u, -0.16 * u, 0.08 * u, -0.21 * u, 0.3 * u, -0.12 * u); c.closePath(); };
    c.fillStyle = K.body; body(); c.fill(); c.save(); body(); c.clip();
    E(K.belly, 0.1, 0.14, 0.32, 0.13); E(K.back, -0.08, -0.17, 0.34, 0.08);
    if (K === BIRD.sparrow) { for (let i = 0; i < 6; i++) E(K.mark, -0.22 + i * 0.07, -0.11 + (i % 2) * 0.02, 0.04, 0.012, -0.2); for (let i = 0; i < 5; i++) E("rgba(120,90,60,0.5)", 0.02 + i * 0.05, 0.1 + (i % 2) * 0.03, 0.02, 0.008, 0.3); }
    if (K.hook) for (let i = 0; i < 9; i++) E(K.mark, -0.05 + (i % 3) * 0.09 + Math.floor(i / 3) * 0.03, 0.06 + Math.floor(i / 3) * 0.04, 0.016, 0.024);
    if (K === BIRD.jay) { c.strokeStyle = K.mark; c.lineWidth = lw * 1.8; c.beginPath(); c.arc(0.3 * u, -0.04 * u, 0.14 * u, 0.3, 2.3); c.stroke(); }
    c.restore(); c.restore();
    E(K.body, 0.3, hy + 0.06, 0.13, 0.11);   // (the neck)
    E(K.head, 0.33, hy, 0.15, 0.13); E(K.cap, 0.31, hy - 0.07, 0.12, 0.065); E(K.face, 0.38, hy + 0.03, 0.08, 0.055);
    if (K.crest) { c.fillStyle = K.cap; c.beginPath(); c.moveTo(0.26 * u, (hy - 0.08) * u); c.quadraticCurveTo(0.14 * u, (hy - 0.2) * u, 0.12 * u, (hy - 0.3) * u); c.quadraticCurveTo(0.25 * u, (hy - 0.22) * u, 0.37 * u, (hy - 0.11) * u); c.fill(); }
    c.fillStyle = K.bill; c.beginPath(); c.moveTo(0.45 * u, (hy - 0.035) * u); c.quadraticCurveTo((K.hook ? 0.56 : 0.54) * u, (hy - 0.02) * u, (K.hook ? 0.55 : 0.6) * u, (hy + (K.hook ? 0.05 : 0.005)) * u); c.lineTo(0.45 * u, (hy + 0.005) * u); c.fill();
    c.fillStyle = mixHex(K.bill, "#000000", 0.3); c.beginPath(); c.moveTo(0.45 * u, (hy + 0.008) * u); c.lineTo((K.hook ? 0.52 : 0.57) * u, (hy + 0.012) * u); c.lineTo(0.45 * u, (hy + 0.035) * u); c.fill();
    if (K.hook) E("#f2c43a", 0.445, hy - 0.01, 0.03, 0.026);
    E(K === BIRD.robin ? "#f4f0e6" : "rgba(255,255,255,0.55)", 0.37, hy - 0.025, 0.04, 0.036); E("#111", 0.37, hy - 0.025, 0.027, 0.027); E("#fff", 0.38, hy - 0.035, 0.009, 0.009);
    if (K === BIRD.sparrow) E(K.mark, 0.41, hy + 0.08, 0.05, 0.035);
    if (perched) { c.save(); c.rotate(-0.15);   // (the folded wing: the coverts, then the flight feathers stacked to their tips)
      c.fillStyle = K.back; c.beginPath(); c.moveTo(0.16 * u, -0.1 * u); c.quadraticCurveTo(0.05 * u, 0.1 * u, -0.2 * u, 0.08 * u); c.lineTo(-0.44 * u, 0.04 * u); c.quadraticCurveTo(-0.2 * u, -0.08 * u, 0.16 * u, -0.1 * u); c.fill();
      for (let f = 0; f < 4; f++) { const x0 = -0.12 - f * 0.08, y0 = 0.07 - f * 0.012; c.fillStyle = f % 2 ? K.back : dk; c.beginPath(); c.moveTo((x0 + 0.08) * u, (y0 - 0.06) * u); c.quadraticCurveTo((x0 - 0.12) * u, (y0 - 0.04) * u, (x0 - 0.14) * u, y0 * u); c.lineTo((x0 + 0.06) * u, (y0 + 0.01) * u); c.fill();
        c.strokeStyle = "rgba(255,255,255,0.25)"; c.lineWidth = lw; c.beginPath(); c.moveTo((x0 + 0.05) * u, (y0 + 0.005) * u); c.lineTo((x0 - 0.12) * u, y0 * u); c.stroke(); }
      c.fillStyle = pale; c.globalAlpha = 0.6; c.beginPath(); c.ellipse(0.04 * u, -0.06 * u, 0.13 * u, 0.045 * u, -0.1, 0, 7); c.fill(); c.globalAlpha = 1;
      if (K === BIRD.sparrow) { c.strokeStyle = "#f2ece0"; c.lineWidth = lw * 1.4; c.beginPath(); c.moveTo(0.1 * u, -0.03 * u); c.lineTo(-0.08 * u, 0.0); c.moveTo(0.06 * u, 0.02 * u); c.lineTo(-0.12 * u, 0.05 * u); c.stroke(); }
      if (K.bars) { c.strokeStyle = K.mark; c.lineWidth = lw * 1.4; c.beginPath(); for (let f = 0; f < 4; f++) { const x = -0.06 - f * 0.08; c.moveTo(x * u, -0.04 * u); c.lineTo((x - 0.03) * u, 0.07 * u); } c.stroke(); c.strokeStyle = "#fff"; c.beginPath(); c.moveTo(0.02 * u, -0.05 * u); c.lineTo(-0.02 * u, 0.06 * u); c.stroke(); }
      c.restore();
      const leg = K.hook ? "#e8b830" : "#5a4a3a"; c.strokeStyle = leg; c.lineWidth = Math.max(1, 0.028 * u); c.lineCap = "round"; c.beginPath();
      for (const lx of [-0.03, 0.06]) { c.moveTo(lx * u, 0.15 * u); c.lineTo((lx - 0.01) * u, 0.29 * u); c.lineTo((lx + 0.08) * u, 0.3 * u); c.moveTo((lx - 0.01) * u, 0.29 * u); c.lineTo((lx + 0.05) * u, 0.32 * u); c.moveTo((lx - 0.01) * u, 0.29 * u); c.lineTo((lx - 0.07) * u, 0.3 * u); }
      c.stroke(); c.lineCap = "butt"; }
    else wing(true);
  }
  function drawBird(b, s, now) {
    const c = ctx;
    if (b.kind === "duck" || b.kind === "swan") { const R = b.R, wy = waterY(R, b.x, now), x = b.x * s, y = wy * s, u = s * (b.kind === "swan" ? 2.8 : 1.9), sw = b.kind === "swan";   // (0.0.102: twice the size)
      const E = (col, ex, ey, rx, ry, a = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(ex * u, ey * u, rx * u, ry * u, a, 0, 7); c.fill(); };
      c.save(); c.translate(x, y); c.scale(b.face, 1); c.beginPath(); c.rect(-u, -2 * u, 2 * u, 2 * u + 0.04 * u); c.clip();   // (only what is over the water)
      const dab = b.dab > 0; if (dab) c.rotate(0.9);
      const body = sw ? "#fbfbf7" : b.hen ? "#9a7a55" : "#b8b8b0", back = sw ? "#ecece6" : b.hen ? "#7a5a38" : "#8a8a82";
      E(body, 0, -0.08, 0.42, 0.18); E(back, -0.08, -0.14, 0.3, 0.08); c.fillStyle = sw ? "#ecece6" : b.hen ? "#6a4a2a" : "#1a1a1a"; c.beginPath(); c.moveTo(-0.36 * u, -0.12 * u); c.lineTo(-0.5 * u, -0.24 * u); c.lineTo(-0.4 * u, -0.06 * u); c.fill();   // (the body, the tail up)
      if (!sw && !b.hen) { c.strokeStyle = "#1a1a1a"; c.lineWidth = Math.max(1, 0.03 * u); c.beginPath(); c.arc(-0.42 * u, -0.27 * u, 0.04 * u, 0.5, 4); c.stroke(); E("#6b3a2a", 0.25, -0.1, 0.13, 0.1); }   // (a drake's curl, his chestnut breast)
      if (!sw && !b.hen) E("#3a5ea8", -0.08, -0.14, 0.07, 0.03);   // (the blue speculum)
      if (!dab) { if (sw) { c.strokeStyle = body; c.lineWidth = 0.09 * u; c.lineCap = "round"; c.beginPath(); c.moveTo(0.25 * u, -0.12 * u); c.bezierCurveTo(0.45 * u, -0.3 * u, 0.15 * u, -0.5 * u, 0.32 * u, -0.72 * u); c.stroke(); c.lineCap = "butt";
          E(body, 0.36, -0.74, 0.08, 0.06); c.fillStyle = "#e8722a"; c.beginPath(); c.moveTo(0.4 * u, -0.77 * u); c.lineTo(0.56 * u, -0.7 * u); c.lineTo(0.42 * u, -0.69 * u); c.fill(); E("#1a1a1a", 0.41, -0.75, 0.035, 0.03); E("#111", 0.36, -0.76, 0.014, 0.014); }
        else { E(b.hen ? "#8a6a45" : "#1f6e3a", 0.33, -0.3, 0.11, 0.09); if (!b.hen) { E("rgba(120,220,160,0.35)", 0.3, -0.33, 0.06, 0.03); c.strokeStyle = "#fff"; c.lineWidth = Math.max(1, 0.025 * u); c.beginPath(); c.arc(0.3 * u, -0.2 * u, 0.06 * u, 0.6, 2.8); c.stroke(); }
          c.fillStyle = b.hen ? "#c87a2a" : "#e8c43a"; c.beginPath(); c.moveTo(0.42 * u, -0.31 * u); c.quadraticCurveTo(0.56 * u, -0.29 * u, 0.55 * u, -0.25 * u); c.lineTo(0.41 * u, -0.26 * u); c.fill(); E("#111", 0.37, -0.33, 0.018, 0.018); } }
      c.restore(); c.strokeStyle = "rgba(230,245,255,0.55)"; c.lineWidth = Math.max(1, s / 30); c.beginPath(); c.ellipse(x, y + 0.02 * s, u * 0.5, u * 0.05, 0, 0, Math.PI); c.stroke(); return; }
    const K = BIRD[b.kind]; if (!K) return; const u = s * K.L * 6, flying = b.mode === "fly" || b.mode === "soar";
    const flap = b.mode === "soar" ? (Math.sin(now / 900 + b.id) > 0.85 ? now / 70 : 0.35) : flying ? now / (b.kind === "hawk" ? 90 : 45) + b.id : 0;
    const hopY = b.hop ? -Math.sin(Math.PI * b.hop.t) * 0.12 : 0, pk = b.peck > 0 ? 0.5 : 0;
    c.save(); c.translate(b.x * s, (b.y + hopY) * s - (flying ? 0 : 0.3 * u)); c.scale(b.face, 1); if (pk) c.rotate(pk); else if (b.mode === "fly") c.rotate(Math.max(-0.4, Math.min(0.4, (b.fly.y1 - b.fly.y0) * 0.1)));
    birdBody(c, u, K, flap, !flying, now, b.id); c.restore();
  }
  // (a rabbit from the side, facing right, 40 to a tile at k = 1, its feet at x, y: the haunch, the back and the chest, the head
  // with its muzzle, nose, eye and whiskers, two long ears (the far one darker), the white tail, the paws; sitting, nibbling
  // (the head down), hopping (t from the take-off to the landing: the hind legs out behind, the ears laid back), swimming or
  // climbing. Clover's tack: a red blanket under a leather saddle, the girth, a stirrup, the bridle; her diving kit (goggles, a
  // snorkel, a little tank) and her climbing pack. Its mouth, where the reins go, given back)
  function drawRabbit(c, x, y, s, o) {
    const k = o.k || 1, [fur, dark, belly] = o.fur || RABBIT_FUR[0], pose = o.pose || "sit", t = o.t || 0, f = o.face < 0 ? -1 : 1;
    const E = (cx, cy, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, 7); c.fill(); };
    const st = pose === "hop" ? Math.sin(Math.PI * t) : 0, lean = pose === "hop" ? -0.32 * Math.cos(Math.PI * t) : pose === "swim" ? 0.08 : 0;
    const headX = pose === "nibble" ? 21 : 18 + 4 * st, headY = pose === "nibble" ? -11 : -25 + 3 * st, hx = -9 - 4 * st;
    const earA = pose === "hop" ? -1.05 + 0.25 * (1 - st) : pose === "swim" ? -1.25 : pose === "nibble" ? -0.6 : -0.3 + (o.ear || 0) * 0.6;
    // (Matthew: "why does the shadow not stay on the ground?") the shadow on the ground under her (o.gy), smaller and fainter the higher she is
    if (pose !== "swim" && pose !== "climb") { const gy = o.gy ?? y, up = Math.max(0, (gy - y) / s), q = Math.max(0.25, 1 - up / 4);
      c.fillStyle = `rgba(0,0,0,${(0.2 * q).toFixed(3)})`; c.beginPath(); c.ellipse(x, gy + 0.5 * s / 40 * k, (20 + 4 * st) * q * s / 40 * k, 3 * q * s / 40 * k, 0, 0, 7); c.fill(); }
    c.save(); c.translate(x, y); c.scale(f * s / 40 * k, s / 40 * k);
    if (pose === "climb") { c.translate(0, -16); c.rotate(-1.2); c.translate(0, 16); }
    c.rotate(lean);
    const ear = (dx, col, a, inner) => { const bx = headX - 3 + dx, by = headY - 5, cx = bx + Math.sin(a) * 10, cy = by - Math.cos(a) * 10; E(cx, cy, 3.4, 11, col, a); if (inner) E(cx + Math.sin(a) * 0.6, cy + 0.6, 1.5, 8, "#e6a49c", a); };
    // (Matthew: "the rabbit hopping animation should show the hind feet, in at least one frame, right?") In a hop, each hind leg
    // from the haunch to the hock, and the long hind foot from it: pushing off behind her, back and down; trailing out behind in
    // the air; swinging forward under her belly to land (a rabbit's hind feet come down ahead of its front paws)
    const foot = (dx, col, ph = 0) => { if (pose === "hop") { const tt = Math.max(0, Math.min(1, t + ph)), th = (tt < 0.6 ? 150 + 30 * tt / 0.6 : 180 - (tt - 0.6) / 0.4 * 165) * Math.PI / 180;
        const kx = hx - 4 + dx + (tt > 0.6 ? 14 * (tt - 0.6) / 0.4 : 0), ky = -5 + (tt > 0.6 ? -2 * (tt - 0.6) / 0.4 : 0);
        c.strokeStyle = col; c.lineWidth = 6.5; c.lineCap = "round"; c.beginPath(); c.moveTo(hx + 1 + dx, -11); c.lineTo(kx, ky); c.stroke(); c.lineCap = "butt";
        E(kx + Math.cos(th) * 6.5, ky + Math.sin(th) * 6.5, 7.5, 2.9, col, th); E(kx + Math.cos(th) * 12.5, ky + Math.sin(th) * 12.5, 2.4, 2.2, col); }
      else if (pose === "swim") { c.save(); c.translate(hx + dx, -6); c.rotate(0.6 + 0.4 * Math.sin(o.now / 120)); E(-9, 0, 10, 3, col); c.restore(); } else E(hx + 3 + dx, -2.6, 10, 3, col); };
    const paw = (dx, col) => { if (pose === "hop") { const px = t < 0.35 ? 12 : t < 0.7 ? 24 : 22, py = t < 0.35 ? -7 : t < 0.7 ? -10 : -2.5; E(px + dx, py, 5, 2.4, col, t < 0.35 ? 0.5 : t < 0.7 ? -0.4 : 0.1); } else if (pose === "climb") E(22 + dx, -20 - dx, 2.6, 5, col); else if (pose === "swim") E(17 + dx, -5 + 2 * Math.sin(o.now / 120 + dx), 4.5, 2.2, col, 0.4); else E(14 + dx, -2, 4, 2.4, col); };
    ear(-2.5, dark, earA - 0.2, false);
    foot(3, dark, 0.06); paw(-2, dark);
    // (the tail, the haunch, the back, the chest, the neck and the head: in the booklet's line drawing, outlined as one shape, all
    // their outlines first and then all their insides over them, so that only the rabbit's own edge shows, not each part's)
    const body = [[hx - 13.5 + 2 * st, -15, 5.6, 5.2, "#fbfaf6", 0], [hx, -12, 15, 12, fur, 0], [2, -15, 18, 11, fur, -0.12 - 0.1 * st], [12 + 3 * st, -17, 9, 10, fur, 0],
      [headX - 4, headY + 4, 7, 7, fur, 0], [headX, headY, 9.5, 8, fur, pose === "nibble" ? 0.5 : -0.15]], R = c.real;
    if (R) { const m = R.getTransform(), w = 2 * c.lw / (Math.hypot(m.a, m.b) || 1); R.save(); R.strokeStyle = "#111"; R.lineWidth = w; for (const b of body) { R.beginPath(); R.ellipse(b[0], b[1], b[2], b[3], b[5], 0, 7); R.stroke(); }
      R.fillStyle = "#fff"; for (const b of body) { R.beginPath(); R.ellipse(b[0], b[1], b[2], b[3], b[5], 0, 7); R.fill(); } R.restore(); }
    else { for (const b of body.slice(0, 4)) E(...b); E(hx + 2, -16, 9, 6, "rgba(255,255,255,0.08)", -0.3); E(4, -7.5, 13, 4.6, belly, -0.05); }
    c.strokeStyle = "rgba(60,40,25,0.25)"; c.lineWidth = 0.8; c.beginPath(); c.arc(hx + 2, -11, 9, -2.2, -0.6); c.stroke();   // (the haunch's line)
    foot(0, fur); paw(2, belly);
    if (!R) { E(...body[4]); E(...body[5]); }
    E(headX + 6, headY + 3, 4.5, 3.6, belly); E(headX + 9.4, headY + 1.6, 1.4, 1.1, "#d77a86");
    E(headX + 2, headY - 2, 2.3, 2.5, "#1b120c"); E(headX + 2.7, headY - 2.8, 0.8, 0.8, "#fff");
    c.strokeStyle = "rgba(70,50,35,0.55)"; c.lineWidth = 0.45; c.beginPath(); for (const a of [-0.25, 0, 0.25]) { c.moveTo(headX + 8, headY + 3); c.lineTo(headX + 8 + Math.cos(a) * 9, headY + 3 + Math.sin(a) * 6); } c.stroke();
    ear(0.5, fur, earA, true);
    if (o.saddle) {
      c.fillStyle = "#b91c1c"; c.beginPath(); c.moveTo(-12, -24); c.quadraticCurveTo(0, -30, 11, -25); c.lineTo(10, -17); c.quadraticCurveTo(0, -19, -11, -16); c.closePath(); c.fill();   // (the blanket)
      c.fillStyle = "#facc15"; for (let i = 0; i < 6; i++) c.fillRect(-10 + i * 3.8, -17.5 + Math.abs(i - 2.5) * 0.3, 1.6, 2.4);
      c.strokeStyle = "#4a2e18"; c.lineWidth = 2.2; c.beginPath(); c.moveTo(1, -22); c.lineTo(2, -4); c.stroke();   // (the girth)
      c.fillStyle = "#7a4a26"; c.beginPath(); c.moveTo(-9, -27); c.quadraticCurveTo(-10, -32, -6.5, -32); c.quadraticCurveTo(0, -27.5, 6, -29.5); c.quadraticCurveTo(9.5, -33, 10, -28); c.quadraticCurveTo(1, -22.5, -9, -27); c.fill();   // (the saddle, its cantle and pommel)
      c.fillStyle = "rgba(255,230,190,0.25)"; c.beginPath(); c.ellipse(-1, -28.5, 5, 1.2, -0.05, 0, 7); c.fill();
      c.strokeStyle = "#3a2414"; c.lineWidth = 1; c.beginPath(); c.moveTo(-2, -25); c.lineTo(-2.5, -13); c.stroke(); c.lineWidth = 1.4; c.beginPath(); c.moveTo(-5.5, -12.5); c.lineTo(0.5, -12.5); c.stroke();   // (the stirrup)
      c.strokeStyle = "#4a2e18"; c.lineWidth = 1.1; c.beginPath(); c.moveTo(headX + 7.5, headY + 3.5); c.lineTo(headX - 2, headY - 5); c.moveTo(headX + 7.5, headY + 3.5); c.lineTo(headX - 4, headY + 5); c.stroke();   // (the bridle)
      E(headX + 7.5, headY + 3.5, 1.3, 1.3, "#d1d5db");
      if (!o.rider) { c.strokeStyle = "#4a2e18"; c.lineWidth = 1; c.beginPath(); c.moveTo(headX + 7.5, headY + 3.5); c.quadraticCurveTo(headX - 2, headY + 12, 8, -28); c.stroke(); } }
    if (o.pack) { c.fillStyle = "#3f6212"; c.beginPath(); c.roundRect(hx - 6, -27, 10, 9, 2.5); c.fill(); c.fillStyle = "#65a30d"; c.fillRect(hx - 5, -24, 8, 2.4);
      c.strokeStyle = "#d8c49a"; c.lineWidth = 1.4; c.beginPath(); c.arc(hx - 1, -30, 3, 0, 7); c.stroke(); }
    if (o.kit) { c.fillStyle = "#facc15"; c.beginPath(); c.roundRect(hx - 7, -29, 6, 11, 3); c.fill(); c.fillStyle = "#a16207"; c.fillRect(hx - 5.5, -31, 3, 2.4);   // (her little tank)
      c.strokeStyle = "#0f172a"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(headX - 6, headY - 3); c.lineTo(headX + 1, headY - 3); c.stroke();
      E(headX + 2.2, headY - 2.2, 3.6, 3.6, "rgba(186,230,253,0.55)"); c.strokeStyle = "#0284c7"; c.lineWidth = 1.3; c.beginPath(); c.arc(headX + 2.2, headY - 2.2, 3.6, 0, 7); c.stroke();
      c.strokeStyle = "#f59e0b"; c.lineWidth = 2; c.lineCap = "round"; c.beginPath(); c.moveTo(headX + 7, headY + 4); c.quadraticCurveTo(headX + 3, headY + 6, headX - 1, headY - 9); c.lineTo(headX - 1, headY - 15); c.stroke(); c.lineCap = "butt"; }
    c.restore();
    return [x + f * (headX + 7.5) * s / 40 * k, y + (headY + 3.5) * s / 40 * k];
  }
  function drawBunnies(c0, c1, now) {
    const s = T, M = S.mount;
    for (const b of S.bunnies || []) { if (b.x < c0 - 2 || b.x > c1 + 2) continue; const H = b.hop;
      const y = H ? H.y0 + (H.y1 - H.y0) * Math.min(1, H.t) - Math.sin(Math.PI * Math.min(1, H.t)) * H.h : landY(Math.max(0, Math.min(WW - 1, Math.floor(b.x))));
      const gy = H ? H.y0 + (H.y1 - H.y0) * Math.min(1, H.t) : y;
      drawRabbit(ctx, b.x * s, y * s, s, { face: b.face, k: 0.78, pose: H ? "hop" : b.nib > 0 ? "nibble" : "sit", t: H ? Math.min(1, H.t) : 0, fur: b.fur, ear: b.ear, gy: gy * s, now }); }
    if (M && !S.ride.on && M.x / 1000 > c0 - 2 && M.x / 1000 < c1 + 2) { const x = M.x / 1000 * s, y = M.y / 1000 * s;
      drawRabbit(ctx, x, y, s, { face: M.face, k: 1.15, pose: M.nib > 0 ? "nibble" : "sit", saddle: true, fur: RABBIT_FUR[0], ear: M.ear, now });
      if (nearClover() && !LINE) { const word = M.tame ? "🐇 R: ride Clover" : S.carrots > 0 ? "🥕 R: give Clover a carrot" : "🐇 Clover would like a carrot 🥕";
        ctx.font = `bold ${Math.round(0.34 * s)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const tw = ctx.measureText(word).width, ly = y - 1.75 * s;
        ctx.fillStyle = "rgba(30,20,8,0.72)"; ctx.beginPath(); ctx.roundRect(x - tw / 2 - s * 0.16, ly - s * 0.24, tw + s * 0.32, s * 0.48, s * 0.16); ctx.fill();
        ctx.fillStyle = "#fff8d0"; ctx.fillText(word, x, ly); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; } }
  }
  // (the gnome riding: Clover under it, in her pose, the gnome sitting the saddle, the reins from its hands to her mouth; ducking
  // under a low roof)
  function drawRider(g, now) {
    const s = T, gx = g.x / 1000, lp = ladderPush(gx, g.y / 1000, g.climb), x = (gx + lp) * s, y = g.y / 1000 * s, wet = g.swim || g.under, moving = Math.abs(g.vx) > 10;
    const pose = g.climb ? "climb" : wet ? "swim" : !g.ground || moving ? "hop" : "sit";
    const t = !g.ground && !g.climb && !wet ? Math.max(0, Math.min(1, 0.5 + g.vy / 400)) : moving ? 0.95 : 0;
    const low = (() => { const c = Math.floor(gx), r = Math.floor((g.y - 1) / 1000) - 1; return inside(c, r) && mat[at(c, r)] !== AIR; })();
    const fc = Math.floor(gx); let fr = Math.ceil(g.y / 1000 - 0.001); while (fr < g.y / 1000 + 14 && !floorAt(fc, fr) && !(inside(fc, fr) && wat[at(fc, fr)] >= 0.5)) fr++;   // (the ground, or the water, under her)
    const mouth = drawRabbit(ctx, x, y, s, { face: g.face, k: 1.15, pose, t, saddle: true, rider: true, kit: g.gear, pack: g.climbPack, fur: RABBIT_FUR[0], gy: fr * s, now });
    const lean = (low ? 0.9 : 0) + (pose === "hop" ? (t - 0.5) * 0.3 : pose === "climb" ? -0.5 : 0), ox = x - g.face * (pose === "climb" ? 0.45 : 0.05) * s, oy = y - (low ? 0.78 : pose === "climb" ? 0.88 : 1.08) * s;
    ctx.save(); ctx.translate(ox, oy); ctx.rotate(g.face * lean); gnomeProfile(ctx, 0, 0, s * 0.98, g.face, false, true, 0, now, g.gear, { ride: true }); ctx.restore();
    const ha = g.face * lean, hx0 = 0.24 * s * g.face, hy0 = -0.08 * s, hx = ox + hx0 * Math.cos(ha) - hy0 * Math.sin(ha), hy = oy + hx0 * Math.sin(ha) + hy0 * Math.cos(ha);
    ctx.strokeStyle = "#4a2e18"; ctx.lineWidth = Math.max(1, s / 30); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + mouth[0]) / 2, Math.max(hy, mouth[1]) + 0.12 * s, mouth[0], mouth[1]); ctx.stroke();
  }
  function drawWild(s, now, c0, c1, r0, r1) {
    if (!S.birds) return; const vis = (x, y) => x > c0 - 1 && x < c1 + 2 && y > r0 - 2 && y < r1 + 2;
    for (const f of S.frogs) if (f.mode !== "swim" && vis(f.x, f.y)) drawFrog(f, s, now);
    for (const b of S.birds) if (vis(b.x, b.kind === "duck" || b.kind === "swan" ? b.R.level : b.y)) drawBird(b, s, now);
    for (const b of S.bugs) if (vis(b.x, b.y)) drawBug(b, s, now);
  }
  // a tree house (one of the sixteen styles, World.styles), its floor at y, its middle at x
  // (Matthew: "tree houses should have interiors, and a way to go inside of them"; "no inside of tree houses?") Walking in
  // through its door, the gnome is inside: the house's front fades away, as a tree's does, and there is its room, paneled,
  // its window lit, a lamp, and its things (World.furnish), the kind of room its style says
  const HOUSE_ROOM = [10, 2, 12, 4, 1, 6, 11, 5, 2, 1, 4, 10, 5, 1, 12, 2];
  const insideHouse = H0 => { const g = S.g; return !!g && !H0.small && Math.abs(g.x / 1000 - (H0.x + 0.5)) < 1.8 && Math.abs(g.y / 1000 - H0.row) < 0.35; };
  function drawRoom(H0, x, y) {
    const c = ctx, s = T, st = S.styles[H0.style % S.styles.length], wall = st ? hexOf(st.walls) : "#c9a26b", w = 3.8 * s, L = x - w / 2, top = y - 2.5 * s, r = seededR(H0.x * 5 + 3);
    const box = (col, bx, by, bw, bh, rr = 0) => { c.fillStyle = col; c.beginPath(); c.roundRect(bx, by, bw, bh, rr); c.fill(); }, lw = v => Math.max(1, v * s);
    const paper = mixHex(wall, "#f5ead2", 0.45), wains = mixHex(wall, "#3a2412", 0.55), rug = st ? hexOf(st.roofc) : "#9f1239";
    // (the walls: papered above, sprigs on the paper, paneled below a rail; the ceiling's beam, herbs drying from it)
    box(paper, L, top, w, 2.5 * s); c.fillStyle = mixHex(paper, "#000000", 0.12);
    for (let j = 0; j < 9; j++) for (let k = 0; k < 4; k++) { const px = L + (j + (k % 2) * 0.5) * w / 9 + 0.1 * s, py = top + 0.45 * s + k * 0.33 * s; c.beginPath(); c.arc(px, py, 0.035 * s, 0, 7); c.fill(); c.fillRect(px - lw(0.01), py, lw(0.02), 0.08 * s); }
    box(wains, L, y - 0.9 * s, w, 0.9 * s); c.fillStyle = "rgba(0,0,0,0.18)"; for (let k = 0; k < 6; k++) { c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = lw(0.02); c.strokeRect(L + 0.1 * s + k * w / 6, y - 0.78 * s, w / 6 - 0.2 * s, 0.6 * s); }
    box(mixHex(wains, "#000000", 0.25), L, y - 0.95 * s, w, 0.08 * s);
    const gr0 = c.createLinearGradient(0, y - 0.12 * s, 0, y); gr0.addColorStop(0, "#8a5a32"); gr0.addColorStop(1, "#5e3c1e"); c.fillStyle = gr0; c.fillRect(L, y - 0.12 * s, w, 0.12 * s);
    c.fillStyle = "rgba(0,0,0,0.25)"; for (let k = 1; k < 9; k++) c.fillRect(L + k * w / 9 + (k % 2) * 0.1 * s, y - 0.12 * s, lw(0.02), 0.12 * s);
    box("#5a3a1e", L, top, w, 0.16 * s); c.fillStyle = "rgba(255,255,255,0.12)"; c.fillRect(L, top + 0.12 * s, w, 0.03 * s);
    for (let k = 0; k < 3; k++) { const hx = L + (0.55 + k * 0.32) * s; c.strokeStyle = "#7a5a30"; c.lineWidth = lw(0.02); c.beginPath(); c.moveTo(hx, top + 0.16 * s); c.lineTo(hx, top + 0.3 * s); c.stroke();
      c.fillStyle = ["#5f7f3a", "#7a5aa0", "#8a9a4a"][k]; c.beginPath(); c.moveTo(hx - 0.08 * s, top + 0.3 * s); c.lineTo(hx + 0.08 * s, top + 0.3 * s); c.lineTo(hx + 0.03 * s, top + 0.62 * s); c.lineTo(hx - 0.03 * s, top + 0.62 * s); c.fill(); }
    // (a picture on the wall: a hill under the sky, in a gilt frame)
    { const px = L + 0.45 * s, py = top + 0.75 * s; box("#b8860b", px - 0.04 * s, py - 0.04 * s, 0.68 * s, 0.5 * s, 0.03 * s); box("#9fd0ee", px, py, 0.6 * s, 0.42 * s);
      c.fillStyle = "#5a9a3a"; c.beginPath(); c.moveTo(px, py + 0.42 * s); c.quadraticCurveTo(px + 0.25 * s, py + 0.1 * s, px + 0.6 * s, py + 0.3 * s); c.lineTo(px + 0.6 * s, py + 0.42 * s); c.fill();
      c.fillStyle = "#f2c12e"; c.beginPath(); c.arc(px + 0.45 * s, py + 0.12 * s, 0.05 * s, 0, 7); c.fill(); }
    // (the window, the sky and a leafy branch through it, curtains tied back)
    { const wx = x + 0.9 * s, wy = y - 1.9 * s, ww = 0.6 * s; box("#5e3d22", wx - 0.06 * s, wy - 0.06 * s, ww + 0.12 * s, ww + 0.12 * s, 0.02 * s);
      const gw = c.createLinearGradient(0, wy, 0, wy + ww); gw.addColorStop(0, "#8cc4ec"); gw.addColorStop(1, "#cfe8f7"); c.fillStyle = gw; c.fillRect(wx, wy, ww, ww);
      c.fillStyle = "#4f8a3a"; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(wx + (0.1 + 0.15 * k) * s, wy + (0.12 + 0.06 * (k % 2)) * s, 0.09 * s, 0.05 * s, 0.4, 0, 7); c.fill(); }
      c.fillStyle = "#5e3d22"; c.fillRect(wx + ww / 2 - lw(0.015), wy, lw(0.03), ww); c.fillRect(wx, wy + ww / 2 - lw(0.015), ww, lw(0.03));
      const cur = CURTAIN[Math.floor(r(1) * CURTAIN.length)]; for (const e of [0, 1]) { c.fillStyle = cur; c.beginPath(); const ex = e ? wx + ww + 0.08 * s : wx - 0.08 * s, ix = e ? wx + ww - 0.1 * s : wx + 0.1 * s;
        c.moveTo(ex, wy - 0.1 * s); c.lineTo(ix, wy - 0.1 * s); c.quadraticCurveTo(e ? ex - 0.02 * s : ex + 0.02 * s, wy + 0.35 * s, ex, wy + ww + 0.12 * s); c.closePath(); c.fill(); }
      box("#5e3d22", wx - 0.15 * s, wy - 0.14 * s, ww + 0.3 * s, 0.05 * s); box("#5e3d22", wx - 0.1 * s, wy + ww + 0.04 * s, ww + 0.2 * s, 0.06 * s); }
    // (a rug on the boards)
    c.fillStyle = rug; c.beginPath(); c.ellipse(x - 0.2 * s, y - 0.06 * s, 1.15 * s, 0.09 * s, 0, 0, 7); c.fill(); c.strokeStyle = "rgba(255,240,200,0.5)"; c.lineWidth = lw(0.02); c.beginPath(); c.ellipse(x - 0.2 * s, y - 0.06 * s, 0.9 * s, 0.06 * s, 0, 0, 7); c.stroke();
    c.save(); c.beginPath(); c.rect(L, top, w, 2.5 * s); c.clip();
    for (const t of H0.things || []) drawThing(t.kind, L - 0.1 * s + t.at / 10 * s, y, t.w / 10 * s);
    c.restore();
    // (the lamp hanging from the beam, its warm light flickering on the room)
    const fl = 0.5 + 0.5 * Math.sin(S.frame / 6 + H0.x) * Math.sin(S.frame / 3.7), lx = x, ly = top + 0.55 * s;
    c.strokeStyle = "#333"; c.lineWidth = lw(0.025); c.beginPath(); c.moveTo(lx, top + 0.16 * s); c.lineTo(lx, ly - 0.08 * s); c.stroke(); box("#2a2a2a", lx - 0.1 * s, ly - 0.1 * s, 0.2 * s, 0.04 * s); box("#fde68a", lx - 0.07 * s, ly - 0.06 * s, 0.14 * s, 0.18 * s, 0.03 * s); box("#2a2a2a", lx - 0.09 * s, ly + 0.12 * s, 0.18 * s, 0.03 * s);
    const gl = c.createRadialGradient(lx, ly, 0, lx, ly, 2.4 * s); gl.addColorStop(0, `rgba(255,214,140,${(0.24 + 0.06 * fl).toFixed(3)})`); gl.addColorStop(1, "rgba(255,214,140,0)"); c.fillStyle = gl; c.fillRect(L, top, w, 2.5 * s);
    const gs = c.createLinearGradient(L, 0, L + w, 0); gs.addColorStop(0, "rgba(0,0,0,0.25)"); gs.addColorStop(0.2, "rgba(0,0,0,0)"); gs.addColorStop(0.8, "rgba(0,0,0,0)"); gs.addColorStop(1, "rgba(0,0,0,0.25)"); c.fillStyle = gs; c.fillRect(L, top, w, 2.5 * s);
  }
  function drawHouse(H0, x, y) {
    const c = ctx, s = T, col = n => "#" + n.toString(16).padStart(6, "0");
    if (!H0.small) { H0.open = (H0.open || 0) + ((insideHouse(H0) ? 1 : 0) - (H0.open || 0)) * 0.15; if (H0.open > 0.02) drawRoom(H0, x, y); }
    if (H0.open > 0.02) c.globalAlpha = 1 - 0.9 * H0.open;
    drawHouseFront(H0, x, y); c.globalAlpha = 1;
  }
  // (Matthew: "add even more detail to each tree house --- polish") A tree house is painted once into a picture of its own
  // (as a tree is): its walls made as its style says (shingles course by course, boards and battens, logs with their cut
  // ends at the corners, half-timbering, stone, birch bark, plaster), the light from the east and the shadow under the eaves;
  // its door of planks on strap hinges, a stone step, a lantern; its windows framed, on sills, lit from inside, curtained, with
  // shutters (a heart cut in each) and boxes of flowers; its roof shingled course by course (scales on a cap or a dome, a
  // mushroom's gills under it, layered straw for thatch), barge boards and a finial, moss on the old ones; a stone chimney with
  // its pot; a gutter and its downspout, into a rain barrel (the rain kept, as the village keeps it); and its one thing more,
  // in the same detail. Over the picture, each frame: the lantern's flame, the sign swinging in the wind, the bees, the
  // weathercock turning, and the smoke from the chimney (S.smoke)
  const hexOf = n => "#" + n.toString(16).padStart(6, "0");
  const CURTAIN = ["#b91c1c", "#1d4ed8", "#15803d", "#a16207", "#7e22ce", "#c2410c", "#0f766e", "#be185d"];
  const SHUTTER = ["#2f5d3a", "#7f1d1d", "#1e3a5f", "#5b4636", "#3f5f2a", "#6b2f5a"];
  const BLOOM = ["#e53935", "#f2c12e", "#e85d75", "#fafafa", "#8e5bd8", "#f08a24"];
  function houseGeom(st) {
    const w = 3.8, hw = w / 2, top0 = -2.5, ov = 0.45, R = st.roof, M = st.more;
    const roofAt = dx => { const a = Math.abs(dx);
      if (R === 0) return top0 - 1.2 * Math.max(0, 1 - a / (hw + ov));
      if (R === 1) return top0 - 2 * Math.max(0, 1 - a / (hw + ov * 0.6));
      if (R === 2) return top0 - 1.2 * Math.min(1, Math.max(0, (hw + ov - a) / (hw + ov - w * 0.2)));
      if (R === 3) return top0 + 0.2 - 2 * Math.max(0, 1 - (a / (hw + ov * 1.4)) ** 2);
      if (R === 4) return top0 + 0.1 - 1.3 * Math.max(0, 1 - (a / (hw + ov)) ** 2);
      if (R === 5) return top0 - 2.6 * Math.max(0, 1 - a / (hw + ov));
      if (R === 6) return top0 - Math.sqrt(Math.max(0, hw * hw - a * a));
      if (R === 7) return top0 - 0.2 - 0.9 * (dx + hw + ov) / (w + 2 * ov);
      return top0 + 0.3 - 1.35 * Math.max(0, 1 - (a / (hw + ov * 1.3)) ** 2); };
    const cx = M === 4 ? hw + 0.08 : (R === 7 || M === 7) ? -0.95 : 0.95, chim = [cx, roofAt(cx) - (M === 4 ? 0.9 : R === 6 || R === 3 ? 0.45 : 0.7)];
    return { w, hw, top0, ov, roofAt, chim, sign: M === 2 ? 1 : -1 };
  }
  function roofPath(g, R, L, w, top0, ov, s) {
    const x = L + w / 2; g.beginPath();
    if (R === 0) { g.moveTo(L - ov, top0); g.lineTo(x, top0 - 1.2 * s); g.lineTo(L + w + ov, top0); }
    else if (R === 1) { g.moveTo(L - ov * 0.6, top0); g.lineTo(x, top0 - 2 * s); g.lineTo(L + w + ov * 0.6, top0); }
    else if (R === 2) { g.moveTo(L - ov, top0); g.lineTo(L + w * 0.3, top0 - 1.2 * s); g.lineTo(L + w * 0.7, top0 - 1.2 * s); g.lineTo(L + w + ov, top0); }
    else if (R === 3) { g.moveTo(L - ov * 1.4, top0 + 0.2 * s); g.bezierCurveTo(L - ov, top0 - 2.4 * s, L + w + ov, top0 - 2.4 * s, L + w + ov * 1.4, top0 + 0.2 * s); }
    else if (R === 4) { g.moveTo(L - ov, top0 + 0.1 * s); g.bezierCurveTo(L - ov, top0 - 1.6 * s, L + w + ov, top0 - 1.6 * s, L + w + ov, top0 + 0.1 * s); }
    else if (R === 5) { g.moveTo(L - ov, top0); g.lineTo(x, top0 - 2.6 * s); g.lineTo(L + w + ov, top0); }
    else if (R === 6) { g.moveTo(L, top0); g.arc(x, top0, w / 2, Math.PI, 0); }
    else if (R === 7) { g.moveTo(L - ov, top0 - 0.2 * s); g.lineTo(L + w + ov, top0 - 1.1 * s); g.lineTo(L + w + ov, top0); g.lineTo(L - ov, top0); }
    else { g.moveTo(L - ov * 1.3, top0 + 0.3 * s); g.quadraticCurveTo(x, top0 - 2.4 * s, L + w + ov * 1.3, top0 + 0.3 * s); }
    g.closePath();
  }
  function paintHouse(g, s, st, H0) {
    const Gm = houseGeom(st), r = seededR(H0.x * 31 + H0.row * 7 + H0.style * 3), x = 0, y = 0, R = st.roof, M = st.more, clad = st.clad || 0;
    const w = Gm.w * s, L = -w / 2, top0 = Gm.top0 * s, hh = -top0, ov = Gm.ov * s, lw = v => Math.max(1, v * s);
    const walls = hexOf(st.walls), trim = hexOf(st.trim), roofc = hexOf(st.roofc);
    const lum = n => ((n >> 16 & 255) * 0.3 + (n >> 8 & 255) * 0.59 + (n & 255) * 0.11) / 255;
    const timber = lum(st.trim) < 0.4 ? trim : "#4a2e1a", shade = (c0, k, a) => mixHex(c0, k > 0 ? "#ffffff" : "#000000", a);
    const box = (col, bx, by, bw, bh, rr = 0) => { g.fillStyle = col; g.beginPath(); g.roundRect(bx, by, bw, bh, rr); g.fill(); };
    const curtain = CURTAIN[Math.floor(r(1) * CURTAIN.length)], shutCol = SHUTTER[Math.floor(r(2) * SHUTTER.length)];
    const shutters = (clad === 0 || clad === 1 || clad === 4 || clad === 5 || clad === 7) && st.win !== 1 && M !== 1;
    // (a shingled run of wall, from y0 down to y1: courses from the bottom up, each shingle its own shade; scalloped or square)
    const shingles = (c0, y0, y1, scal, rh = 0.27 * s, X0 = L, X1 = L + w) => { let row = 0;
      for (let yy = y1 - rh; yy > y0 - rh; yy -= rh * 0.8, row++) { let xx = X0 - (row % 2) * 0.13 * s, j = 0;
        while (xx < X1) { const sw = (0.22 + 0.1 * r(row * 40 + j + 11)) * s, q = row * 40 + j;
          g.fillStyle = shade(c0, r(q + 7) < 0.5 ? 1 : -1, 0.03 + 0.07 * r(q + 9)); g.beginPath();
          if (scal) { g.moveTo(xx, yy); g.lineTo(xx, yy + rh - sw / 2); g.arc(xx + sw / 2, yy + rh - sw / 2, sw / 2, Math.PI, 0, true); g.lineTo(xx + sw, yy); }
          else g.rect(xx, yy, sw - lw(0.025), rh);
          g.fill(); g.strokeStyle = "rgba(0,0,0,0.2)"; g.lineWidth = lw(0.022); g.stroke(); xx += sw; j++; } } };
    const stones = (y0, y1) => { g.fillStyle = "#5f584e"; g.fillRect(L, y0, w, y1 - y0); const rh = 0.29 * s; let k = 0;
      for (let yy = y1 - rh; yy > y0 - rh * 0.9; yy -= rh) { let xx = L - r(k * 3 + 1) * 0.2 * s;
        while (xx < L + w) { const sw = (0.28 + 0.34 * r(k + 50)) * s;
          box(mixHex(["#a8a090", "#9a9284", "#b5ab98", "#8f8a80", "#a39a86"][Math.floor(r(k + 60) * 5)], walls, 0.22), xx + lw(0.03), yy + lw(0.03), sw - lw(0.06), rh - lw(0.06), 0.08 * s);
          g.fillStyle = "rgba(255,255,255,0.16)"; g.fillRect(xx + 0.06 * s, yy + 0.05 * s, sw * 0.45, 0.035 * s); g.fillStyle = "rgba(0,0,0,0.14)"; g.fillRect(xx + 0.05 * s, yy + rh - 0.09 * s, sw - 0.1 * s, 0.035 * s); xx += sw; k++; } } };
    // ---- the chimney (behind the roof; the big one outside its east wall, for a house with one thing more, the chimney) ----
    const [chx, chy] = Gm.chim, chimney = () => { const cw = (M === 4 ? 0.55 : 0.42) * s, cxp = chx * s, cyp = chy * s, base = M === 4 ? y : top0 + 0.4 * s;
      g.fillStyle = "#7d7266"; g.fillRect(cxp - cw / 2, cyp, cw, base - cyp);
      g.save(); g.beginPath(); g.rect(cxp - cw / 2, cyp, cw, base - cyp); g.clip(); let k = 0;
      for (let yy = base - 0.16 * s; yy > cyp - 0.16 * s; yy -= 0.16 * s, k++) for (let xx = cxp - cw / 2 - (k % 2) * 0.1 * s; xx < cxp + cw / 2; xx += 0.2 * s)
        box(["#9a8f80", "#8a8072", "#a59a88", "#93897a"][Math.floor(r(k * 13 + xx) * 4)], xx + lw(0.02), yy + lw(0.02), 0.2 * s - lw(0.04), 0.16 * s - lw(0.04), 0.03 * s);
      g.fillStyle = "rgba(255,240,210,0.14)"; g.fillRect(cxp + cw * 0.2, cyp, cw * 0.3, base - cyp); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(cxp - cw / 2, cyp, cw, 0.12 * s); g.restore();
      box("#6b6157", cxp - cw / 2 - 0.06 * s, cyp - 0.06 * s, cw + 0.12 * s, 0.1 * s, 0.02 * s);
      for (const e of (M === 4 ? [-0.12, 0.12] : [0])) { box("#b5653a", cxp + e * s - 0.08 * s, cyp - 0.26 * s, 0.16 * s, 0.21 * s, 0.03 * s); box("#8f4a28", cxp + e * s - 0.1 * s, cyp - 0.29 * s, 0.2 * s, 0.05 * s, 0.02 * s); } };
    if (M !== 4) chimney();
    // ---- the walls ----
    g.save(); g.beginPath(); g.rect(L, top0, w, hh); g.clip(); g.fillStyle = walls; g.fillRect(L, top0, w, hh);
    if (clad === 0) shingles(walls, top0, y, st.win === 0);
    else if (clad === 1) { const bw = 0.42 * s;
      for (let k = 0, xx = L; xx < L + w; xx += bw, k++) { g.fillStyle = shade(walls, r(k + 3) < 0.5 ? 1 : -1, 0.06 * r(k + 4)); g.fillRect(xx, top0, bw, hh);
        g.strokeStyle = "rgba(0,0,0,0.08)"; g.lineWidth = lw(0.015); for (let q = 0; q < 3; q++) { const gx = xx + (0.2 + 0.6 * r(k * 5 + q)) * bw; g.beginPath(); g.moveTo(gx, top0); g.bezierCurveTo(gx + 0.04 * s, top0 + hh * 0.3, gx - 0.04 * s, top0 + hh * 0.7, gx, y); g.stroke(); } }
      for (let xx = L + bw; xx < L + w; xx += bw) { g.fillStyle = shade(walls, -1, 0.22); g.fillRect(xx - 0.045 * s, top0, 0.09 * s, hh); g.fillStyle = "rgba(255,255,255,0.16)"; g.fillRect(xx + 0.015 * s, top0, 0.025 * s, hh); } }
    else if (clad === 2) { const lh = 0.31 * s; g.fillStyle = "#d8c8a8"; g.fillRect(L, top0, w, hh);
      for (let k = 0, yy = y - lh; yy > top0 - lh; yy -= lh, k++) { const gr = g.createLinearGradient(0, yy, 0, yy + lh); gr.addColorStop(0, shade(walls, 1, 0.2)); gr.addColorStop(0.45, walls); gr.addColorStop(1, shade(walls, -1, 0.38));
        g.fillStyle = gr; g.beginPath(); g.roundRect(L - 0.2 * s, yy + 0.025 * s, w + 0.4 * s, lh - 0.05 * s, lh * 0.45); g.fill();
        g.strokeStyle = "rgba(0,0,0,0.13)"; g.lineWidth = lw(0.016); for (let q = 0; q < 3; q++) { const gx = L + r(k * 9 + q) * w; g.beginPath(); g.moveTo(gx, yy + lh * (0.35 + 0.3 * r(k * 9 + q + 2))); g.lineTo(gx + (0.3 + 0.5 * r(k * 9 + q + 4)) * s, yy + lh * 0.5); g.stroke(); }
        if (r(k + 90) < 0.6) { g.fillStyle = shade(walls, -1, 0.45); g.beginPath(); g.ellipse(L + (0.3 + 3.2 * r(k + 91)) * s, yy + lh * 0.5, 0.06 * s, 0.04 * s, 0, 0, 7); g.fill(); } } }
    else if (clad === 3 || clad === 7) {
      for (let k = 0; k < 46; k++) { g.fillStyle = r(k) < 0.5 ? "rgba(0,0,0,0.045)" : "rgba(255,255,255,0.07)"; g.beginPath(); g.ellipse(L + r(k + 100) * w, top0 + r(k + 200) * hh, (0.1 + 0.25 * r(k + 300)) * s, (0.06 + 0.12 * r(k + 400)) * s, r(k + 500) * 3, 0, 7); g.fill(); }
      if (clad === 7) { g.strokeStyle = "rgba(90,70,40,0.25)"; g.lineWidth = lw(0.015); for (let k = 0; k < 4; k++) { let px = L + (0.3 + 3.2 * r(k + 600)) * s, py = top0 + (0.3 + 1.6 * r(k + 610)) * s; g.beginPath(); g.moveTo(px, py); for (let q = 0; q < 4; q++) { px += (r(k * 9 + q + 620) - 0.5) * 0.25 * s; py += 0.1 * s; g.lineTo(px, py); } g.stroke(); }
        g.strokeStyle = "rgba(120,95,60,0.12)"; for (let k = 0; k < 22; k++) { const gx = L + r(k + 700) * w; g.beginPath(); g.moveTo(gx, top0); g.lineTo(gx + (r(k + 710) - 0.5) * 0.1 * s, y); g.stroke(); } }
      else { const tb = 0.12 * s, beam = (x0, y0, x1, y1) => { g.strokeStyle = timber; g.lineWidth = tb; g.lineCap = "butt"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
        for (const px of [-1.82, -0.62, 0.62, 1.82]) beam(px * s, top0, px * s, y);
        for (const py of [top0 + 0.08 * s, y - 1.98 * s, y - 1.08 * s]) beam(L, py, L + w, py);
        for (const e of [-1, 1]) { beam(e * 1.82 * s, y - 1.08 * s, e * 1.22 * s, y); beam(e * 0.62 * s, y - 1.08 * s, e * 1.22 * s, y);
          beam(e * 1.82 * s, y - 1.98 * s, e * 0.62 * s, top0 + 0.08 * s); beam(e * 0.62 * s, y - 1.98 * s, e * 1.82 * s, top0 + 0.08 * s); }
        g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = lw(0.02); for (const px of [-1.82, -0.62, 0.62, 1.82]) { g.beginPath(); g.moveTo(px * s + tb * 0.3, top0); g.lineTo(px * s + tb * 0.3, y); g.stroke(); } } }
    else if (clad === 4) { shingles(walls, top0, y - 0.9 * s, st.win === 0); stones(y - 0.9 * s, y); box(trim, L, y - 0.98 * s, w, 0.1 * s); }
    else if (clad === 5) stones(top0, y);
    else if (clad === 6) { g.fillStyle = "rgba(0,0,0,0.05)"; for (let k = 0; k < 6; k++) g.fillRect(L + r(k + 40) * w, top0, (0.2 + 0.3 * r(k + 41)) * s, hh);
      for (let k = 0; k < 70; k++) { g.fillStyle = r(k + 800) < 0.8 ? "rgba(30,30,30,0.75)" : "rgba(120,90,60,0.5)"; box(g.fillStyle, L + r(k + 810) * w, top0 + r(k + 820) * hh, (0.08 + 0.3 * r(k + 830)) * s, (0.025 + 0.035 * r(k + 840)) * s, 0.02 * s); }
      for (let k = 0; k < 5; k++) { g.fillStyle = "rgba(40,35,30,0.55)"; g.beginPath(); g.ellipse(L + r(k + 850) * w, top0 + r(k + 860) * hh, (0.12 + 0.12 * r(k + 870)) * s, 0.08 * s, 0, 0, 7); g.fill(); } }
    // (the light from the east, the dirt of years along the floor, and the shadow under the eaves)
    let gr = g.createLinearGradient(L, 0, L + w, 0); gr.addColorStop(0, "rgba(0,0,0,0.16)"); gr.addColorStop(0.6, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(255,236,200,0.12)"); g.fillStyle = gr; g.fillRect(L, top0, w, hh);
    gr = g.createLinearGradient(0, y - 0.5 * s, 0, y); gr.addColorStop(0, "rgba(40,25,10,0)"); gr.addColorStop(1, "rgba(40,25,10,0.28)"); g.fillStyle = gr; g.fillRect(L, y - 0.5 * s, w, 0.5 * s);
    gr = g.createLinearGradient(0, top0, 0, top0 + 0.6 * s); gr.addColorStop(0, "rgba(0,0,0,0.38)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(L, top0, w, 0.6 * s);
    g.restore();
    if (clad === 2) for (let yy = y - 0.31 * s; yy > top0 - 0.31 * s; yy -= 0.31 * s) for (const ex of [L - 0.1 * s, L + w + 0.1 * s]) {   // (the logs' cut ends at the corners)
      g.fillStyle = "#c79a62"; g.beginPath(); g.arc(ex, yy + 0.155 * s, 0.14 * s, 0, 7); g.fill(); g.strokeStyle = "rgba(90,55,25,0.55)"; g.lineWidth = lw(0.015);
      for (const rr of [0.04, 0.08, 0.115]) { g.beginPath(); g.arc(ex, yy + 0.155 * s, rr * s, 0, 7); g.stroke(); } }
    if (clad !== 2 && clad !== 5) for (const e of [L, L + w - 0.13 * s]) { box(trim, e, top0, 0.13 * s, hh); g.fillStyle = "rgba(255,255,255,0.15)"; g.fillRect(e + 0.08 * s, top0, 0.03 * s, hh); }
    box(trim, L - 0.12 * s, y - 0.13 * s, w + 0.24 * s, 0.13 * s); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(L - 0.12 * s, y - 0.03 * s, w + 0.24 * s, 0.03 * s);
    // (ivy up the walls of the house named for it)
    if (/Heder/.test(st.latin)) for (const e of [-1, 1]) { let px = e * (Gm.hw - 0.25) * s, py = y - 0.1 * s; g.strokeStyle = "#3b2a1a"; g.lineWidth = lw(0.035); const pts = [[px, py]];
      for (let k = 0; k < 12; k++) { px += (r(k * 3 + e * 50) - 0.5) * 0.35 * s - e * 0.02 * s; py -= 0.2 * s; pts.push([px, py]); }
      g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke();
      pts.forEach(([a, b], i) => { if (i === 0) return; for (const d of [-1, 1]) { g.fillStyle = (i + d) % 3 ? "#2e6b2a" : "#3f8a35"; g.beginPath(); const lx = a + d * 0.12 * s, ly = b + 0.02 * s;
        g.moveTo(lx, ly - 0.09 * s); g.lineTo(lx + 0.08 * s, ly); g.lineTo(lx + 0.03 * s, ly + 0.02 * s); g.lineTo(lx, ly + 0.08 * s); g.lineTo(lx - 0.03 * s, ly + 0.02 * s); g.lineTo(lx - 0.08 * s, ly); g.closePath(); g.fill(); } }); }
    // ---- the door: a frame, planks, strap hinges, a ring, a little window, a stone step ----
    const dw = 0.7 * s, dh = 1.3 * s, dl = x - dw / 2, dt = y - dh;
    box(trim, dl - 0.09 * s, dt - 0.09 * s, dw + 0.18 * s, dh + 0.09 * s, [0.44 * s, 0.44 * s, 0, 0]);
    const doorCol = r(5) < 0.45 ? SHUTTER[Math.floor(r(6) * SHUTTER.length)] : "#5a3820"; box(doorCol, dl, dt, dw, dh, [0.35 * s, 0.35 * s, 0, 0]);
    g.save(); g.beginPath(); g.roundRect(dl, dt, dw, dh, [0.35 * s, 0.35 * s, 0, 0]); g.clip();
    g.fillStyle = "rgba(0,0,0,0.22)"; for (let k = 1; k < 4; k++) g.fillRect(dl + k * dw / 4 - lw(0.012), dt, lw(0.025), dh);
    gr = g.createLinearGradient(dl, 0, dl + dw, 0); gr.addColorStop(0, "rgba(0,0,0,0.25)"); gr.addColorStop(1, "rgba(255,255,255,0.06)"); g.fillStyle = gr; g.fillRect(dl, dt, dw, dh);
    for (const hy of [dt + 0.42 * s, y - 0.3 * s]) { box("#222", dl - 0.02 * s, hy - 0.035 * s, dw * 0.62, 0.07 * s, 0.03 * s); g.beginPath(); g.arc(dl + dw * 0.6, hy, 0.05 * s, 0, 7); g.fill();
      g.fillStyle = "#555"; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(dl + (0.08 + k * 0.14) * s, hy, 0.015 * s, 0, 7); g.fill(); } }
    if (st.win === 1 || st.win === 3) { g.fillStyle = trim; g.beginPath(); g.arc(x, dt + 0.32 * s, 0.13 * s, 0, 7); g.fill(); g.fillStyle = "#ffe29a"; g.beginPath(); g.arc(x, dt + 0.32 * s, 0.09 * s, 0, 7); g.fill(); }
    g.restore();
    g.strokeStyle = "#c8a032"; g.lineWidth = lw(0.03); g.beginPath(); g.arc(x + 0.2 * s, y - 0.62 * s, 0.06 * s, 0, 7); g.stroke(); box("#c8a032", x + 0.17 * s, y - 0.7 * s, 0.06 * s, 0.05 * s, 0.02 * s);
    box("#8e8a80", dl - 0.14 * s, y - 0.08 * s, dw + 0.28 * s, 0.08 * s, 0.02 * s); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(dl - 0.12 * s, y - 0.08 * s, dw + 0.24 * s, 0.02 * s);
    // (the lantern, on its bracket by the door; its flame is lit each frame)
    { const lx = x - 0.56 * s; g.strokeStyle = "#222"; g.lineWidth = lw(0.03); g.beginPath(); g.moveTo(lx - 0.1 * s, y - 1.2 * s); g.lineTo(lx + 0.1 * s, y - 1.2 * s); g.lineTo(lx, y - 1.13 * s); g.stroke();
      box("#2a2a2a", lx - 0.085 * s, y - 1.12 * s, 0.17 * s, 0.04 * s); box("rgba(255,226,154,0.9)", lx - 0.065 * s, y - 1.08 * s, 0.13 * s, 0.2 * s); box("#2a2a2a", lx - 0.085 * s, y - 0.88 * s, 0.17 * s, 0.035 * s);
      g.fillStyle = "#2a2a2a"; g.fillRect(lx - lw(0.01), y - 1.08 * s, lw(0.02), 0.2 * s); }
    // ---- the windows ----
    for (const sd of [-1, 1]) { const wx = x + sd * 1.15 * s, wy = y - 1.55 * s, bot = wy + (st.win === 1 ? 0.33 : st.win === 3 ? 0.35 : 0.32) * s;
      const shape = k => { g.beginPath(); if (st.win === 1) g.arc(wx, wy, (0.33 + k) * s, 0, 7); else if (st.win === 3) g.roundRect(wx - (0.3 + k) * s, wy - (0.4 + k) * s, (0.6 + 2 * k) * s, (0.75 + 2 * k) * s, [(0.3 + k) * s, (0.3 + k) * s, 0, 0]); else g.rect(wx - (0.32 + k) * s, wy - (0.32 + k) * s, (0.64 + 2 * k) * s, (0.64 + 2 * k) * s); };
      if (shutters) for (const e of [-1, 1]) { const sx = wx + e * 0.52 * s, sh = (st.win === 3 ? 0.78 : 0.7) * s, sy = bot - sh;
        box(shutCol, sx - 0.12 * s, sy, 0.24 * s, sh, 0.02 * s); g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(sx - lw(0.01), sy, lw(0.02), sh); g.fillRect(sx - 0.12 * s, sy + sh * 0.3, 0.24 * s, lw(0.025)); g.fillRect(sx - 0.12 * s, sy + sh * 0.7, 0.24 * s, lw(0.025));
        g.fillStyle = "#1a120c"; g.beginPath(); const hx = sx, hy = sy + sh * 0.18; g.moveTo(hx, hy + 0.07 * s); g.bezierCurveTo(hx - 0.09 * s, hy, hx - 0.04 * s, hy - 0.06 * s, hx, hy - 0.02 * s); g.bezierCurveTo(hx + 0.04 * s, hy - 0.06 * s, hx + 0.09 * s, hy, hx, hy + 0.07 * s); g.fill(); }
      g.fillStyle = trim; shape(0.08); g.fill();
      gr = g.createLinearGradient(0, wy - 0.4 * s, 0, wy + 0.4 * s); gr.addColorStop(0, "#fff3c4"); gr.addColorStop(1, "#eab25a"); g.fillStyle = gr; shape(0); g.fill();
      g.save(); shape(0); g.clip();
      g.fillStyle = "rgba(120,70,20,0.25)"; g.fillRect(wx - 0.4 * s, bot - 0.12 * s, 0.8 * s, 0.12 * s);
      for (const e of [-1, 1]) { g.fillStyle = curtain; g.beginPath(); g.moveTo(wx + e * 0.42 * s, wy - 0.45 * s); g.lineTo(wx + e * 0.06 * s, wy - 0.45 * s); g.quadraticCurveTo(wx + e * 0.2 * s, wy - 0.05 * s, wx + e * 0.36 * s, wy + 0.05 * s); g.lineTo(wx + e * 0.42 * s, bot); g.closePath(); g.fill();
        g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(wx + e * 0.3 * s - lw(0.01), wy - 0.45 * s, lw(0.02), 0.4 * s); box("#c8a032", wx + e * 0.33 * s - 0.03 * s, wy - 0.02 * s, 0.06 * s, 0.04 * s); }
      g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.moveTo(wx - 0.05 * s, wy - 0.45 * s); g.lineTo(wx + 0.08 * s, wy - 0.45 * s); g.lineTo(wx - 0.12 * s, wy + 0.4 * s); g.lineTo(wx - 0.25 * s, wy + 0.4 * s); g.closePath(); g.fill();
      g.restore();
      g.strokeStyle = trim; g.lineWidth = lw(0.065); g.beginPath();
      if (st.win === 2) { g.moveTo(wx - 0.32 * s, wy); g.lineTo(wx, wy - 0.32 * s); g.lineTo(wx + 0.32 * s, wy); g.lineTo(wx, wy + 0.32 * s); g.closePath(); g.moveTo(wx - 0.16 * s, wy - 0.16 * s); g.lineTo(wx + 0.16 * s, wy + 0.16 * s); g.moveTo(wx + 0.16 * s, wy - 0.16 * s); g.lineTo(wx - 0.16 * s, wy + 0.16 * s); }
      else { g.moveTo(wx - 0.33 * s, wy); g.lineTo(wx + 0.33 * s, wy); g.moveTo(wx, wy - 0.42 * s); g.lineTo(wx, wy + 0.36 * s); }
      g.stroke();
      if (st.win === 3) box(trim, wx - 0.07 * s, wy - 0.52 * s, 0.14 * s, 0.14 * s, 0.02 * s);
      if (st.win === 0 || st.win === 2) box(trim, wx - 0.46 * s, wy - 0.46 * s, 0.92 * s, 0.09 * s, 0.02 * s);
      box(trim, wx - 0.44 * s, bot + 0.04 * s, 0.88 * s, 0.09 * s, 0.02 * s); g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(wx - 0.4 * s, bot + 0.13 * s, 0.8 * s, 0.05 * s);
      // (a box of flowers under the sill: under both windows, for the house whose one thing more is its flowers)
      if (M === 8 || (r(70) < 0.75 && sd === (r(71) < 0.5 ? -1 : 1))) { const by = bot + 0.13 * s; box("#7a4a2a", wx - 0.38 * s, by, 0.76 * s, 0.18 * s, 0.02 * s); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(wx - 0.38 * s, by + 0.08 * s, 0.76 * s, lw(0.02));
        g.strokeStyle = "#3f7a2a"; g.lineWidth = lw(0.03); for (let k = 0; k < 4; k++) { const vx = wx + (-0.3 + 0.2 * k) * s; g.beginPath(); g.moveTo(vx, by + 0.17 * s); g.quadraticCurveTo(vx + 0.06 * s, by + 0.3 * s, vx + (r(k + sd * 20) - 0.5) * 0.1 * s, by + (0.3 + 0.15 * r(k + 30 + sd)) * s); g.stroke(); }
        for (let k = 0; k < (M === 8 ? 9 : 6); k++) { const fx = wx + (-0.32 + 0.64 * r(k * 3 + sd * 40 + 1)) * s, fy = by - (0.02 + 0.13 * r(k * 3 + sd * 40 + 2)) * s;
          g.fillStyle = k % 2 ? "#3f7a2a" : "#4f9a38"; g.beginPath(); g.ellipse(fx, fy + 0.04 * s, 0.07 * s, 0.045 * s, 0, 0, 7); g.fill(); }
        for (let k = 0; k < (M === 8 ? 8 : 5); k++) { const fx = wx + (-0.3 + 0.6 * r(k * 5 + sd * 60 + 1)) * s, fy = by - (0.06 + 0.16 * r(k * 5 + sd * 60 + 2)) * s, col = BLOOM[Math.floor(r(k * 5 + sd * 60 + 3) * BLOOM.length)];
          g.fillStyle = col; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(fx + Math.cos(p * 1.26) * 0.035 * s, fy + Math.sin(p * 1.26) * 0.035 * s, 0.03 * s, 0, 7); g.fill(); } g.fillStyle = "#f2c12e"; g.beginPath(); g.arc(fx, fy, 0.018 * s, 0, 7); g.fill(); } } }
    // ---- the gutter's downspout, into a rain barrel ----
    const ds = -Gm.sign, cornerX = ds * (Gm.hw + 0.06) * s, eaveY = (R === 7 ? (ds < 0 ? top0 - 0.15 * s : top0 - 1.0 * s) : R === 6 ? top0 : top0 + 0.08 * s), barrel = M === 9 || r(88) < 0.45;
    if (R !== 3 && R !== 8 && M !== 4) { const pipe = "#b87333", pw = 0.09 * s, eaveX = ds * (Gm.hw * s + (R === 6 ? 0 : ov * 0.75));
      g.strokeStyle = pipe; g.lineWidth = pw; g.lineCap = "round"; g.beginPath(); g.moveTo(eaveX, eaveY + 0.06 * s); g.lineTo(eaveX, eaveY + 0.2 * s); g.lineTo(cornerX, eaveY + 0.42 * s); g.lineTo(cornerX, y - (barrel ? 0.68 : 0.22) * s); if (!barrel) g.lineTo(cornerX + ds * 0.18 * s, y - 0.08 * s); g.stroke();
      g.strokeStyle = "rgba(255,230,190,0.45)"; g.lineWidth = lw(0.02); g.beginPath(); g.moveTo(cornerX + pw * 0.25, eaveY + 0.45 * s); g.lineTo(cornerX + pw * 0.25, y - (barrel ? 0.7 : 0.3) * s); g.stroke(); g.lineCap = "butt";
      box(pipe, eaveX - 0.1 * s, eaveY - 0.02 * s, 0.2 * s, 0.1 * s, 0.05 * s);
      for (const k of [0.35, 0.7]) box("#444", cornerX - 0.07 * s, eaveY + 0.45 * s + (y - eaveY - 0.9 * s) * k, 0.14 * s, 0.035 * s); }
    if (barrel || M === 9) { const bx = cornerX + ds * 0.3 * s;
      box("#8b5a2b", bx - 0.27 * s, y - 0.74 * s, 0.54 * s, 0.74 * s, 0.1 * s); g.fillStyle = "rgba(0,0,0,0.22)"; for (let k = 1; k < 5; k++) g.fillRect(bx - 0.27 * s + k * 0.108 * s, y - 0.72 * s, lw(0.02), 0.7 * s);
      gr = g.createLinearGradient(bx - 0.27 * s, 0, bx + 0.27 * s, 0); gr.addColorStop(0, "rgba(0,0,0,0.3)"); gr.addColorStop(0.7, "rgba(255,240,210,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0.15)"); g.fillStyle = gr; g.fillRect(bx - 0.27 * s, y - 0.74 * s, 0.54 * s, 0.74 * s);
      for (const hy of [0.62, 0.18]) box("#3a3a3a", bx - 0.28 * s, y - hy * s, 0.56 * s, 0.05 * s);
      g.fillStyle = "#3d6b85"; g.beginPath(); g.ellipse(bx, y - 0.72 * s, 0.24 * s, 0.05 * s, 0, 0, 7); g.fill(); box("#c8a032", bx - ds * 0.3 * s, y - 0.3 * s, 0.08 * s, 0.05 * s); }
    // ---- the roof ----
    if (R === 3) { g.fillStyle = "#efe3cf"; g.beginPath(); g.ellipse(x, top0 + 0.2 * s, Gm.hw * s + ov * 1.4, 0.28 * s, 0, 0, Math.PI); g.fill(); g.strokeStyle = "rgba(120,90,60,0.4)"; g.lineWidth = lw(0.015);
      for (let k = -14; k <= 14; k++) { g.beginPath(); g.moveTo(x + k * 0.07 * s, top0 + 0.2 * s); g.lineTo(x + k * 0.17 * s, top0 + 0.2 * s + 0.26 * s * Math.sqrt(Math.max(0, 1 - (k / 15) ** 2))); g.stroke(); } }
    g.fillStyle = roofc; roofPath(g, R, L, w, top0, ov, s); g.fill();
    g.save(); roofPath(g, R, L, w, top0, ov, s); g.clip();
    if (R === 0 || R === 1 || R === 2 || R === 5 || R === 7) shingles(roofc, top0 - 3 * s, top0 + 0.05 * s, false, 0.2 * s, L - 2 * ov, L + w + 2 * ov);
    else if (R === 4 || R === 6) shingles(roofc, top0 - 3 * s, top0 + 0.15 * s, true, 0.17 * s, L - 2 * ov, L + w + 2 * ov);
    else if (R === 3) { gr = g.createRadialGradient(0.7 * s, top0 - 1.5 * s, 0.1 * s, 0, top0 - 0.5 * s, 3 * s); gr.addColorStop(0, shade(roofc, 1, 0.3)); gr.addColorStop(1, shade(roofc, -1, 0.3)); g.fillStyle = gr; g.fillRect(L - 2 * ov, top0 - 3 * s, w + 4 * ov, 3.4 * s); }
    else if (R === 8) { for (let k = 0, yy = top0 + 0.3 * s; yy > top0 - 1.4 * s; yy -= 0.24 * s, k++) { g.fillStyle = "rgba(60,40,10,0.3)"; g.fillRect(L - 2 * ov, yy - 0.05 * s, w + 4 * ov, 0.05 * s);
        for (let j = 0; j < 70; j++) { const sx = L - 1.5 * ov + r(k * 100 + j) * (w + 3 * ov); g.strokeStyle = r(k * 100 + j + 50) < 0.5 ? shade(roofc, 1, 0.25) : shade(roofc, -1, 0.2); g.lineWidth = lw(0.02); g.beginPath(); g.moveTo(sx, yy - 0.22 * s); g.lineTo(sx + (sx > 0 ? 1 : -1) * 0.04 * s, yy); g.stroke(); } } }
    gr = g.createLinearGradient(-3 * s, 0, 3 * s, 0); gr.addColorStop(0, "rgba(0,0,0,0.2)"); gr.addColorStop(0.55, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(255,240,200,0.12)"); g.fillStyle = gr; g.fillRect(-4 * s, top0 - 3 * s, 8 * s, 3.5 * s);
    if (/Musc|Filic|Querc|Pinea/.test(st.latin) || r(97) < 0.25) for (let k = 0; k < 9; k++) { const mx = (r(k + 900) < 0.5 ? -1 : 1) * (0.6 + 1.6 * r(k + 901)) * s, my = Gm.roofAt(mx / s) * s + (0.12 + 0.25 * r(k + 902)) * s;
      g.fillStyle = ["#4d7c0f", "#5a8f2a", "#3f6212"][k % 3]; g.beginPath(); g.ellipse(mx, my, (0.1 + 0.14 * r(k + 903)) * s, (0.05 + 0.05 * r(k + 904)) * s, (r(k + 905) - 0.5) * 0.6, 0, 7); g.fill(); }
    g.restore();
    if (R === 3) { g.fillStyle = "rgba(255,255,255,0.9)"; for (const [dx, dy, rr] of [[-0.9, -0.9, 0.22], [0.5, -1.2, 0.17], [1.2, -0.6, 0.14], [-0.1, -1.5, 0.12], [-1.6, -0.35, 0.12], [1.85, -0.2, 0.09], [0.15, -0.75, 0.09]]) {
      g.beginPath(); g.ellipse(x + dx * s, top0 + dy * s, rr * s, rr * 0.8 * s, 0, 0, 7); g.fill(); g.fillStyle = "rgba(0,0,0,0.08)"; g.beginPath(); g.ellipse(x + dx * s, top0 + (dy + rr * 0.3) * s, rr * 0.9 * s, rr * 0.4 * s, 0, 0, Math.PI); g.fill(); g.fillStyle = "rgba(255,255,255,0.9)"; } }
    g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = lw(0.05); roofPath(g, R, L, w, top0, ov, s); g.stroke();
    if (R === 0 || R === 1 || R === 5) { const pk = R === 0 ? 1.2 : R === 1 ? 2 : 2.6, ex = R === 1 ? ov * 0.6 : ov;
      g.strokeStyle = trim; g.lineWidth = 0.12 * s; g.lineJoin = "round"; g.beginPath(); g.moveTo(L - ex, top0 + 0.02 * s); g.lineTo(x, top0 - pk * s + 0.05 * s); g.lineTo(L + w + ex, top0 + 0.02 * s); g.stroke(); g.lineJoin = "miter";
      g.fillStyle = trim; g.beginPath(); g.moveTo(x, top0 - (pk + 0.45) * s); g.lineTo(x + 0.07 * s, top0 - (pk + 0.05) * s); g.lineTo(x - 0.07 * s, top0 - (pk + 0.05) * s); g.fill(); g.beginPath(); g.arc(x, top0 - (pk + 0.2) * s, 0.07 * s, 0, 7); g.fill();
      if (R !== 5) { g.strokeStyle = trim; g.lineWidth = lw(0.04); g.beginPath(); g.moveTo(x - 0.4 * s, top0 - (pk - 0.25) * s); g.lineTo(x, top0 - (pk - 0.55) * s); g.lineTo(x + 0.4 * s, top0 - (pk - 0.25) * s); g.moveTo(x, top0 - (pk - 0.55) * s); g.lineTo(x, top0 - pk * s); g.stroke(); } }
    if (R === 2) { g.strokeStyle = shade(roofc, -1, 0.3); g.lineWidth = 0.08 * s; g.beginPath(); g.moveTo(L + w * 0.3, top0 - 1.2 * s); g.lineTo(L + w * 0.7, top0 - 1.2 * s); g.stroke(); }
    if (R === 4) { box("#5a3a1e", x - 0.06 * s, top0 - 1.55 * s, 0.12 * s, 0.4 * s, 0.04 * s); g.strokeStyle = "#5a3a1e"; g.lineWidth = lw(0.04); g.beginPath(); g.moveTo(x, top0 - 1.45 * s); g.quadraticCurveTo(x + 0.25 * s, top0 - 1.7 * s, x + 0.35 * s, top0 - 1.5 * s); g.stroke(); }
    if (R === 8) { g.strokeStyle = shade(roofc, -1, 0.35); g.lineWidth = lw(0.025); for (let j = 0; j < 26; j++) { const xx = L - ov * 1.3 + j * (w + 2.6 * ov) / 25; g.beginPath(); g.moveTo(xx, top0 + 0.22 * s); g.lineTo(xx + (r(j + 990) - 0.5) * 0.06 * s, top0 + (0.33 + 0.08 * r(j + 991)) * s); g.stroke(); } }
    if (R <= 1) { g.fillStyle = trim; for (let j = 0; j < 4; j++) { g.fillRect(L - ov + j * 0.18 * s, top0 - 0.05 * s, 0.07 * s, 0.25 * s); g.fillRect(L + w + ov - j * 0.18 * s - 0.07 * s, top0 - 0.05 * s, 0.07 * s, 0.25 * s); }
      g.strokeStyle = trim; g.lineWidth = lw(0.08); for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x + sd * w * 0.46, top0); g.lineTo(x + sd * w * 0.46, top0 + 0.35 * s); g.lineTo(x + sd * w * 0.3, top0); g.stroke(); } }
    if (M === 4) chimney();
    // ---- its one thing more ----
    g.lineWidth = lw(0.07);
    if (M === 1) { for (const sd of [-1, 1]) { const px = x + sd * 0.75 * s; g.fillStyle = trim; g.beginPath(); g.moveTo(px - 0.07 * s, y - 1.65 * s); g.lineTo(px + 0.07 * s, y - 1.65 * s); g.lineTo(px + 0.13 * s, y - 0.3 * s); g.lineTo(px - 0.13 * s, y - 0.3 * s); g.fill();
        g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(px - 0.1 * s, y - 1.6 * s, 0.05 * s, 1.3 * s); box("#8e8a80", px - 0.18 * s, y - 0.32 * s, 0.36 * s, 0.32 * s, 0.03 * s); g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(px - 0.18 * s, y - 0.17 * s, 0.36 * s, lw(0.02)); }
      g.fillStyle = roofc; g.beginPath(); g.moveTo(x - 1.02 * s, y - 1.62 * s); g.lineTo(x, y - 2.22 * s); g.lineTo(x + 1.02 * s, y - 1.62 * s); g.closePath(); g.fill();
      g.save(); g.clip(); shingles(roofc, y - 2.3 * s, y - 1.6 * s, false, 0.16 * s, x - 1.1 * s, x + 1.1 * s); g.restore();
      g.strokeStyle = trim; g.lineWidth = 0.09 * s; g.beginPath(); g.moveTo(x - 1.02 * s, y - 1.6 * s); g.lineTo(x, y - 2.22 * s); g.lineTo(x + 1.02 * s, y - 1.6 * s); g.stroke(); box(trim, x - 0.9 * s, y - 1.68 * s, 1.8 * s, 0.08 * s); }
    else if (M === 2) { const bxl = L - 0.55 * s, fy = top0 + 0.7 * s; box(trim, bxl, fy, 0.6 * s, 0.1 * s); for (const k of [0, 1]) { g.strokeStyle = trim; g.lineWidth = lw(0.05); g.beginPath(); g.moveTo(L - (0.05 + k * 0.35) * s, fy + 0.1 * s); g.lineTo(L - 0.02 * s, fy + 0.5 * s); g.stroke(); }
      for (let j = 0; j < 5; j++) box(trim, bxl + 0.02 * s + j * 0.12 * s, fy - 0.38 * s, 0.05 * s, 0.38 * s, 0.02 * s); box(trim, bxl, fy - 0.42 * s, 0.6 * s, 0.06 * s);
      box("#b45309", bxl + 0.05 * s, fy - 0.22 * s, 0.16 * s, 0.2 * s, [0, 0, 0.04 * s, 0.04 * s]); g.fillStyle = "#3f7a2a"; g.beginPath(); g.arc(bxl + 0.13 * s, fy - 0.3 * s, 0.11 * s, 0, 7); g.fill(); g.fillStyle = BLOOM[0]; g.beginPath(); g.arc(bxl + 0.1 * s, fy - 0.36 * s, 0.04 * s, 0, 7); g.fill(); }
    else if (M === 3) { const tx = L + w - 0.1 * s, tw = 0.8 * s, ty0 = top0 - 1.6 * s; g.fillStyle = walls; g.fillRect(tx - 0.4 * s, ty0, tw, 1.6 * s + 0.2 * s);
      g.save(); g.beginPath(); g.rect(tx - 0.4 * s, ty0, tw, 1.8 * s); g.clip(); if (clad === 0 || clad === 4) shingles(walls, ty0, top0 + 0.2 * s, false, 0.2 * s, tx - 0.5 * s, tx + 0.5 * s);
      gr = g.createLinearGradient(tx - 0.4 * s, 0, tx + 0.4 * s, 0); gr.addColorStop(0, "rgba(0,0,0,0.25)"); gr.addColorStop(1, "rgba(255,240,200,0.1)"); g.fillStyle = gr; g.fillRect(tx - 0.4 * s, ty0, tw, 1.8 * s); g.restore();
      box(trim, tx - 0.17 * s, top0 - 1.25 * s, 0.34 * s, 0.5 * s, [0.17 * s, 0.17 * s, 0, 0]); box("#ffe29a", tx - 0.12 * s, top0 - 1.2 * s, 0.24 * s, 0.42 * s, [0.12 * s, 0.12 * s, 0, 0]); g.fillStyle = trim; g.fillRect(tx - lw(0.015), top0 - 1.2 * s, lw(0.03), 0.42 * s);
      g.fillStyle = roofc; g.beginPath(); g.moveTo(tx - 0.58 * s, ty0 + 0.05 * s); g.lineTo(tx, ty0 - 1.15 * s); g.lineTo(tx + 0.58 * s, ty0 + 0.05 * s); g.closePath(); g.fill(); g.save(); g.clip(); shingles(roofc, ty0 - 1.3 * s, ty0 + 0.05 * s, true, 0.15 * s, tx - 0.7 * s, tx + 0.7 * s); g.restore();
      g.fillStyle = trim; g.beginPath(); g.arc(tx, ty0 - 1.2 * s, 0.07 * s, 0, 7); g.fill(); g.fillRect(tx - lw(0.015), ty0 - 1.45 * s, lw(0.03), 0.25 * s); }
    else if (M === 5) { const dy0 = top0 - 0.95 * s; g.fillStyle = walls; g.fillRect(x - 0.42 * s, dy0, 0.84 * s, 0.75 * s); g.save(); g.beginPath(); g.rect(x - 0.42 * s, dy0, 0.84 * s, 0.75 * s); g.clip(); shingles(walls, dy0, dy0 + 0.75 * s, true, 0.16 * s, x - 0.5 * s, x + 0.5 * s); g.restore();
      box(trim, x - 0.27 * s, dy0 + 0.12 * s, 0.54 * s, 0.48 * s); box("#ffe29a", x - 0.22 * s, dy0 + 0.16 * s, 0.44 * s, 0.4 * s); g.fillStyle = trim; g.fillRect(x - lw(0.015), dy0 + 0.16 * s, lw(0.03), 0.4 * s); g.fillRect(x - 0.22 * s, dy0 + 0.35 * s, 0.44 * s, lw(0.03));
      g.fillStyle = roofc; g.beginPath(); g.moveTo(x - 0.58 * s, dy0 + 0.02 * s); g.lineTo(x, dy0 - 0.48 * s); g.lineTo(x + 0.58 * s, dy0 + 0.02 * s); g.closePath(); g.fill(); g.strokeStyle = trim; g.lineWidth = 0.07 * s; g.stroke(); }
    else if (M === 6) { const pk = top0 - 2 * s; for (const e of [-1, 1]) box(trim, x + e * 0.28 * s - 0.05 * s, pk - 0.85 * s, 0.1 * s, 0.95 * s);
      g.fillStyle = roofc; g.beginPath(); g.moveTo(x - 0.48 * s, pk - 0.8 * s); g.lineTo(x, pk - 1.2 * s); g.lineTo(x + 0.48 * s, pk - 0.8 * s); g.closePath(); g.fill(); g.strokeStyle = trim; g.lineWidth = 0.06 * s; g.stroke();
      g.fillStyle = "#c8a032"; g.beginPath(); g.moveTo(x - 0.2 * s, pk - 0.12 * s); g.quadraticCurveTo(x - 0.15 * s, pk - 0.7 * s, x, pk - 0.72 * s); g.quadraticCurveTo(x + 0.15 * s, pk - 0.7 * s, x + 0.2 * s, pk - 0.12 * s); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 0.05 * s, pk - 0.6 * s, 0.04 * s, 0.4 * s); g.fillStyle = "#8a6a1a"; g.beginPath(); g.arc(x, pk - 0.08 * s, 0.05 * s, 0, 7); g.fill(); }
    else if (M === 7) { const tx = x + 0.25 * s, ty = top0 - 1.75 * s; g.strokeStyle = "#3a3a3a"; g.lineWidth = lw(0.04); g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - 0.25 * s, top0 - 1.3 * s); g.moveTo(tx, ty); g.lineTo(tx + 0.25 * s, top0 - 1.2 * s); g.stroke();
      g.save(); g.translate(tx, ty); g.rotate(-0.62); box("#b8860b", -0.15 * s, -0.09 * s, 1.0 * s, 0.18 * s, 0.04 * s); box("#8a6a1a", 0.82 * s, -0.11 * s, 0.12 * s, 0.22 * s, 0.03 * s); box("#8a6a1a", -0.22 * s, -0.06 * s, 0.1 * s, 0.12 * s, 0.02 * s);
      for (const k of [0.15, 0.45]) box("#6b4f12", k * s, -0.1 * s, 0.05 * s, 0.2 * s); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(-0.1 * s, -0.07 * s, 0.9 * s, 0.03 * s); g.restore(); }
    else if (M === 10) { const top = top0 - (R === 1 ? 2 : R === 7 ? 0.65 : 1.2) * s; g.strokeStyle = "#333"; g.lineWidth = lw(0.04); g.beginPath(); g.moveTo(x, top); g.lineTo(x, top - 0.75 * s); g.moveTo(x - 0.3 * s, top - 0.4 * s); g.lineTo(x + 0.3 * s, top - 0.4 * s); g.stroke();
      g.fillStyle = "#333"; g.beginPath(); g.arc(x, top - 0.4 * s, 0.05 * s, 0, 7); g.fill(); for (const e of [-1, 1]) { g.beginPath(); g.moveTo(x + e * 0.3 * s, top - 0.4 * s); g.lineTo(x + e * 0.24 * s, top - 0.45 * s); g.lineTo(x + e * 0.24 * s, top - 0.35 * s); g.fill(); } }
    else if (M === 11) for (let k = 0; k < 2; k++) { const bx = L - (0.45 + k * 0.62) * s; box("#6b4a2b", bx - 0.3 * s, y - 0.1 * s, 0.6 * s, 0.1 * s);
      for (let j = 0; j < 5; j++) { g.fillStyle = j % 2 ? "#d4a640" : "#e3b448"; g.beginPath(); g.ellipse(bx, y - 0.2 * s - j * 0.12 * s, (0.3 - j * 0.05) * s, 0.08 * s, 0, 0, 7); g.fill(); g.strokeStyle = "rgba(120,80,20,0.5)"; g.lineWidth = lw(0.015); g.stroke(); }
      g.fillStyle = "#3a2510"; g.beginPath(); g.arc(bx, y - 0.2 * s, 0.05 * s, Math.PI, 0); g.fill(); }
    // (a robin on the ridge of some)
    if ((R === 0 || R === 1 || R === 2 || R === 7) && r(99) < 0.3 && M !== 6 && M !== 10) { const bx = (r(98) - 0.5) * 1.6 * s, by = Gm.roofAt(bx / s) * s;
      g.fillStyle = "#6b4a2b"; g.beginPath(); g.ellipse(bx, by - 0.1 * s, 0.13 * s, 0.09 * s, 0, 0, 7); g.fill(); g.beginPath(); g.arc(bx + 0.11 * s, by - 0.18 * s, 0.06 * s, 0, 7); g.fill();
      g.fillStyle = "#e0662a"; g.beginPath(); g.ellipse(bx + 0.06 * s, by - 0.1 * s, 0.06 * s, 0.06 * s, 0, 0, 7); g.fill(); g.fillStyle = "#222"; g.fillRect(bx + 0.15 * s, by - 0.19 * s, 0.05 * s, 0.02 * s); g.fillRect(bx - 0.22 * s, by - 0.12 * s, 0.1 * s, 0.03 * s); }
  }
  // a small house: a bird's (a box on a bracket, its roof shingled, a perch, a bird looking out) or a squirrel's (round, mossy)
  function paintSmallHouse(g, s, H0) {
    const r = seededR(H0.x * 13 + H0.row), box = (col, bx, by, bw, bh, rr = 0) => { g.fillStyle = col; g.beginPath(); g.roundRect(bx, by, bw, bh, rr); g.fill(); };
    if (H0.style === 101) { g.fillStyle = "#7a5a3a"; g.beginPath(); g.ellipse(0, -0.5 * s, 0.48 * s, 0.45 * s, 0, 0, 7); g.fill();
      g.strokeStyle = "rgba(60,40,20,0.6)"; g.lineWidth = Math.max(1, s / 30); for (let k = 0; k < 14; k++) { const a = r(k) * 6.28, rr = 0.2 + 0.25 * r(k + 20); g.beginPath(); g.moveTo(Math.cos(a) * rr * s, -0.5 * s + Math.sin(a) * rr * s); g.lineTo(Math.cos(a + 0.5) * (rr + 0.1) * s, -0.5 * s + Math.sin(a + 0.5) * (rr + 0.1) * s); g.stroke(); }
      g.fillStyle = "#4d7c0f"; g.beginPath(); g.ellipse(-0.1 * s, -0.88 * s, 0.3 * s, 0.1 * s, -0.2, 0, 7); g.fill();
      g.fillStyle = "#1a1008"; g.beginPath(); g.arc(0.05 * s, -0.48 * s, 0.14 * s, 0, 7); g.fill();
      for (const [ax, ay] of [[0.4, -0.12], [0.55, -0.1], [0.47, -0.22]]) { box("#b5651d", ax * s - 0.06 * s, ay * s - 0.05 * s, 0.12 * s, 0.11 * s, 0.05 * s); box("#6b4a2b", ax * s - 0.065 * s, ay * s - 0.08 * s, 0.13 * s, 0.05 * s, 0.03 * s); }
      return; }
    box("#5a3a1e", -0.06 * s, -0.12 * s, 0.12 * s, 0.12 * s); box(H0.style === 100 ? "#c0703a" : "#8a6a4a", -0.35 * s, -0.82 * s, 0.7 * s, 0.72 * s, 0.03 * s);
    g.fillStyle = "rgba(0,0,0,0.15)"; for (let k = 1; k < 4; k++) g.fillRect(-0.35 * s + k * 0.175 * s, -0.82 * s, Math.max(1, s / 40), 0.72 * s);
    g.fillStyle = "#5a3a1e"; g.beginPath(); g.moveTo(-0.52 * s, -0.78 * s); g.lineTo(0, -1.22 * s); g.lineTo(0.52 * s, -0.78 * s); g.closePath(); g.fill();
    g.save(); g.clip(); g.fillStyle = "rgba(0,0,0,0.25)"; for (let yy = -0.86; yy > -1.25; yy -= 0.1) g.fillRect(-0.6 * s, yy * s, 1.2 * s, Math.max(1, s / 40)); g.restore();
    g.fillStyle = "#1a1008"; g.beginPath(); g.arc(0, -0.52 * s, 0.13 * s, 0, 7); g.fill();
    if (r(3) < 0.5) { g.fillStyle = "#7a8fa6"; g.beginPath(); g.arc(0, -0.5 * s, 0.09 * s, 0, 7); g.fill(); g.fillStyle = "#222"; g.beginPath(); g.arc(0.03 * s, -0.53 * s, 0.022 * s, 0, 7); g.fill(); g.fillStyle = "#f2c12e"; g.beginPath(); g.moveTo(0.08 * s, -0.5 * s); g.lineTo(0.15 * s, -0.48 * s); g.lineTo(0.08 * s, -0.46 * s); g.fill(); }
    box("#3a2510", -0.03 * s, -0.33 * s, 0.06 * s, 0.03 * s); box("#3a2510", -0.02 * s, -0.33 * s, 0.03 * s, 0.14 * s);
  }
  function drawHouseFront(H0, x, y) {
    const c = ctx, s = T;
    if (H0.small) { drawSprite(sprite(`smallhouse:${H0.x}:${H0.row}:${H0.style}`, 1.4, 1.6, 0.7, 1.35, (g, u) => paintSmallHouse(g, u, H0)), x, y); return; }
    const st = S.styles[H0.style % S.styles.length]; if (!st) return;
    drawSprite(sprite(`house:${H0.x}:${H0.row}:${H0.style}`, 8, 7.2, 4, 6.4, (g, u) => paintHouse(g, u, st, H0)), x, y);
    const Gm = houseGeom(st), fl = 0.5 + 0.5 * Math.sin(S.frame / 5 + H0.x) * Math.sin(S.frame / 3.1 + H0.x * 2), M = st.more;
    // (the lantern's flame)
    { const lx = x - 0.56 * s, ly = y - 0.98 * s, gr = c.createRadialGradient(lx, ly, 0, lx, ly, 0.55 * s); gr.addColorStop(0, `rgba(255,200,90,${(0.32 + 0.12 * fl).toFixed(3)})`); gr.addColorStop(1, "rgba(255,200,90,0)");
      c.fillStyle = gr; c.fillRect(lx - 0.55 * s, ly - 0.55 * s, 1.1 * s, 1.1 * s); c.fillStyle = "#fff4c2"; c.beginPath(); c.ellipse(lx, ly + 0.02 * s, 0.025 * s, (0.045 + 0.015 * fl) * s, 0, 0, 7); c.fill(); }
    // (the sign on its bracket, swinging in the wind: the house's name in gnome letters, its emblem in the roof's color)
    { const e = Gm.sign, bx0 = x + e * Gm.hw * s, by = y - 2.05 * s, bx = bx0 + e * 0.42 * s, a = Math.sin(S.frame / 37 + H0.x) * 0.05 + (S.windNow || 0) * 0.35;
      c.strokeStyle = "#222"; c.lineWidth = Math.max(1, s / 30); c.beginPath(); c.moveTo(bx0, by); c.lineTo(bx0 + e * 0.6 * s, by); c.moveTo(bx0, by + 0.18 * s); c.lineTo(bx0 + e * 0.2 * s, by); c.stroke();
      c.save(); c.translate(bx, by); c.rotate(a); c.beginPath(); c.moveTo(-0.2 * s, 0); c.lineTo(-0.2 * s, 0.12 * s); c.moveTo(0.2 * s, 0); c.lineTo(0.2 * s, 0.12 * s); c.stroke();
      c.fillStyle = "#7a4a2a"; c.beginPath(); c.roundRect(-0.3 * s, 0.12 * s, 0.6 * s, 0.32 * s, 0.05 * s); c.fill(); c.strokeStyle = "#4a2e1a"; c.lineWidth = Math.max(1, s / 24); c.stroke();
      c.fillStyle = hexOf(st.roofc); c.beginPath(); c.arc(-0.17 * s, 0.28 * s, 0.07 * s, 0, 7); c.fill(); c.fillStyle = "#f3e2c0"; c.fillRect(-0.06 * s, 0.21 * s, 0.28 * s, 0.03 * s); c.fillRect(-0.06 * s, 0.3 * s, 0.2 * s, 0.03 * s); c.restore(); }
    // (the weathercock, turned to face the wind)
    if (M === 10) { const top = y - 2.5 * s - (st.roof === 1 ? 2 : st.roof === 7 ? 0.65 : 1.2) * s - 0.75 * s, f = (S.windNow || 0) >= 0 ? -1 : 1; c.save(); c.translate(x, top); c.scale(f, 1);
      c.fillStyle = "#333"; c.beginPath(); c.moveTo(-0.3 * s, 0); c.lineTo(0.15 * s, 0); c.lineTo(0.22 * s, -0.12 * s); c.lineTo(0.3 * s, -0.1 * s); c.lineTo(0.24 * s, -0.22 * s); c.lineTo(0.12 * s, -0.2 * s); c.lineTo(0.02 * s, -0.08 * s); c.lineTo(-0.15 * s, -0.12 * s); c.lineTo(-0.32 * s, -0.3 * s); c.lineTo(-0.25 * s, -0.08 * s); c.closePath(); c.fill(); c.restore(); }
    // (the bees, about their skeps)
    if (M === 11) { c.fillStyle = "#2a2205"; for (let k = 0; k < 6; k++) { const t = S.frame / 30 + k * 1.7, bx = x - Gm.hw * s - (0.6 + 0.5 * Math.sin(t * 1.3 + k)) * s, by = y - (0.6 + 0.35 * Math.sin(t * 2.1 + k * 2)) * s;
      c.fillStyle = "#f2c12e"; c.beginPath(); c.ellipse(bx, by, 0.035 * s, 0.025 * s, 0, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); c.ellipse(bx, by - 0.03 * s, 0.025 * s, 0.015 * s, 0, 0, 7); c.fill(); } }
  }
  // (the smoke from each tree house's chimney near the view)
  function houseSmoke() {
    if (S.frame % 11) return; const mid = S.cam.x + VW / 2;
    for (const hs of S.houses) { if (hs.small || Math.abs(hs.x - mid) > VW) continue; const st = S.styles[hs.style % S.styles.length]; if (!st) continue; const [cx, cy] = houseGeom(st).chim;
      S.smoke.push({ x: hs.x + 0.5 + cx + (rand() - 0.5) * 0.1, y: hs.row + cy - 0.3, r: 0.12, life: 0, drift: 0.003 + rand() * 0.004 }); }
  }
  // a thing in a room (World.furnish), its left edge at x, standing on the floor at y, w its width (all in pixels)
  function drawThing(k, x, y, w) {
    const c = ctx, s = T, m = x + w / 2;
    const box = (col, bx, by, bw, bh, rr = 0) => { c.fillStyle = col; c.beginPath(); c.roundRect(bx, by, bw, bh, rr); c.fill(); };
    const ell = (col, ex, ey, rx, ry) => { c.fillStyle = col; c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, 7); c.fill(); };
    const wood = "#8b5a2b", dark = "#5a3a1e";
    switch (k) {
      case 1: box(dark, x, y - 0.9 * s, 0.12 * s, 0.9 * s); box(dark, x + w - 0.12 * s, y - 0.6 * s, 0.12 * s, 0.6 * s); box("#e9e1d0", x + 0.1 * s, y - 0.55 * s, w - 0.2 * s, 0.25 * s, 3); box("#c0392b", x + 0.4 * s, y - 0.5 * s, w - 0.5 * s, 0.22 * s, 3); ell("#fff", x + 0.3 * s, y - 0.62 * s, 0.22 * s, 0.1 * s); box(wood, x, y - 0.3 * s, w, 0.12 * s); break;
      case 2: box(wood, x, y - 0.8 * s, w, 0.1 * s); box(dark, x + 0.1 * s, y - 0.7 * s, 0.08 * s, 0.7 * s); box(dark, x + w - 0.18 * s, y - 0.7 * s, 0.08 * s, 0.7 * s); ell("#e9e1d0", m, y - 0.86 * s, 0.18 * s, 0.05 * s); break;
      case 3: box(dark, x + 0.05 * s, y - 1.05 * s, 0.07 * s, 1.05 * s); box(wood, x, y - 0.5 * s, w, 0.08 * s); box(dark, x + w - 0.1 * s, y - 0.45 * s, 0.07 * s, 0.45 * s); break;
      case 4: box("#7d7068", x, y - 2.2 * s, w, 2.2 * s); box("#5a4f48", x - 0.1 * s, y - 1.5 * s, w + 0.2 * s, 0.14 * s); box("#1a120c", x + 0.25 * s, y - 1.25 * s, w - 0.5 * s, 1.25 * s, [0.4 * s, 0.4 * s, 0, 0]);
        { const f = Math.sin(S.frame / 4) * 0.08 * s; ell("#f59e0b", m, y - 0.35 * s, 0.32 * s, 0.32 * s + f); ell("#fde047", m, y - 0.25 * s, 0.16 * s, 0.2 * s - f / 2); } break;
      case 5: box("#2d2d2d", x, y - 1.1 * s, w, 1.1 * s, 3); box("#444", x - 0.05 * s, y - 1.15 * s, w + 0.1 * s, 0.1 * s); box("#c2410c", x + 0.2 * s, y - 0.6 * s, 0.35 * s, 0.25 * s); box("#888", x + w * 0.6, y - 1.35 * s, 0.3 * s, 0.22 * s, 2); break;
      case 6: { const sy = y - 2.4 * s; box(wood, x, sy, w, 0.08 * s); box(wood, x, sy + 0.7 * s, w, 0.08 * s); for (let j = 0; j < Math.floor(w / (0.3 * s)); j++) { box(["#d97706", "#65a30d", "#b91c1c", "#e5e7eb"][j % 4], x + 0.08 * s + j * 0.3 * s, sy - 0.32 * s, 0.2 * s, 0.32 * s, 2); box(["#92400e", "#e5e7eb", "#4d7c0f"][j % 3], x + 0.1 * s + j * 0.3 * s, sy + 0.4 * s, 0.18 * s, 0.3 * s, 2); } break; }
      case 7: box("#8b5a2b", x, y - 1 * s, w, 1 * s, 0.25 * s); box("#555", x, y - 0.8 * s, w, 0.06 * s); box("#555", x, y - 0.25 * s, w, 0.06 * s); break;
      case 8: box("#6b4a2b", m - 0.25 * s, y - 0.45 * s, 0.5 * s, 0.45 * s); c.fillStyle = "#3a3a3a"; c.beginPath(); c.moveTo(x, y - 0.65 * s); c.lineTo(x + w, y - 0.65 * s); c.lineTo(x + w - 0.2 * s, y - 0.45 * s); c.lineTo(x + 0.2 * s, y - 0.45 * s); c.fill(); break;
      case 9: c.fillStyle = "#7a4a2a"; c.beginPath(); c.moveTo(x, y - 0.3 * s); c.lineTo(x + w, y - 0.55 * s); c.lineTo(x + w, y - 0.15 * s); c.closePath(); c.fill(); box("#3a2a1a", x + w - 0.1 * s, y - 0.5 * s, 0.2 * s, 0.4 * s); break;
      case 10: box(wood, x, y - 0.9 * s, w, 0.12 * s); box(dark, x + 0.1 * s, y - 0.8 * s, 0.1 * s, 0.8 * s); box(dark, x + w - 0.2 * s, y - 0.8 * s, 0.1 * s, 0.8 * s); box("#777", x + 0.3 * s, y - 1.15 * s, 0.5 * s, 0.08 * s); box("#a0522d", x + 0.3 * s, y - 1.12 * s, 0.12 * s, 0.25 * s);
        c.strokeStyle = "#555"; c.lineWidth = Math.max(1, s / 16); for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(x + w * 0.5 + j * 0.2 * s, y - 2.2 * s); c.lineTo(x + w * 0.5 + j * 0.2 * s, y - 1.7 * s); c.stroke(); } break;
      case 11: box(dark, x, y - 2.4 * s, w, 2.4 * s); for (let r = 0; r < 4; r++) for (let j = 0; j < Math.floor(w / (0.13 * s)) - 1; j++) box(["#b91c1c", "#1d4ed8", "#15803d", "#a16207", "#7e22ce"][(r * 3 + j) % 5], x + 0.08 * s + j * 0.13 * s, y - 2.3 * s + r * 0.58 * s, 0.1 * s, 0.45 * s); break;
      case 12: box(wood, x, y - 0.85 * s, w, 0.1 * s); box(dark, x + 0.05 * s, y - 0.75 * s, 0.4 * s, 0.75 * s); box(dark, x + w - 0.12 * s, y - 0.75 * s, 0.08 * s, 0.75 * s); box("#f5f0e1", x + w - 0.4 * s, y - 1.05 * s, 0.08 * s, 0.2 * s); ell("#fde047", x + w - 0.36 * s, y - 1.12 * s, 0.05 * s, 0.08 * s); box("#e9e1d0", x + 0.5 * s, y - 0.9 * s, 0.4 * s, 0.05 * s); break;
      case 13: c.fillStyle = "#9a6a3a"; c.beginPath(); c.moveTo(x, y - 0.8 * s); c.lineTo(x + w, y - 0.8 * s); c.lineTo(x + w - 0.15 * s, y); c.lineTo(x + 0.15 * s, y); c.fill(); box("#7dd3fc", x + 0.05 * s, y - 0.75 * s, w - 0.1 * s, 0.1 * s); box("#555", x, y - 0.55 * s, w, 0.05 * s); break;
      case 14: box("#3f6212", m - 0.12 * s, y - 1.3 * s, 0.24 * s, 1.3 * s); box("#4d7c0f", m - 0.2 * s, y - 1.35 * s, 0.4 * s, 0.1 * s); c.strokeStyle = "#3f6212"; c.lineWidth = 0.08 * s; c.beginPath(); c.moveTo(m, y - 1.25 * s); c.lineTo(m + 0.45 * s, y - 1.55 * s); c.stroke(); box("#3f6212", m + 0.1 * s, y - 1.0 * s, 0.25 * s, 0.08 * s); break;
      case 15: box(wood, x, y - 1 * s, w, 0.1 * s); box(dark, x + 0.08 * s, y - 0.9 * s, 0.08 * s, 0.9 * s); box(dark, x + w - 0.16 * s, y - 0.9 * s, 0.08 * s, 0.9 * s); ell("#e5e7eb", m, y - 1.08 * s, 0.25 * s, 0.08 * s); box("#94a3b8", m - 0.25 * s, y - 1.9 * s, 0.5 * s, 0.6 * s, 0.25 * s); break;
      case 16: box("#5a3a1e", x, y - 0.4 * s, w, 0.4 * s); for (let j = 0; j < Math.floor(w / (0.25 * s)); j++) { const mx = x + 0.15 * s + j * 0.25 * s; box("#f5f0e1", mx - 0.03 * s, y - 0.6 * s, 0.06 * s, 0.2 * s); ell(j % 2 ? "#c2410c" : "#e8d9b5", mx, y - 0.62 * s, 0.12 * s, 0.06 * s); } break;
      case 17: box(wood, x, y - 2 * s, 0.1 * s, 2 * s); box(wood, x + w - 0.1 * s, y - 2 * s, 0.1 * s, 2 * s); box(wood, x, y - 2 * s, w, 0.1 * s); box(wood, x, y - 0.9 * s, w, 0.1 * s);
        c.strokeStyle = "#d4a373"; c.lineWidth = Math.max(1, s / 30); for (let j = 1; j < 10; j++) { c.beginPath(); c.moveTo(x + j * w / 10, y - 1.9 * s); c.lineTo(x + j * w / 10, y - 0.9 * s); c.stroke(); } box("#b45309", x + 0.15 * s, y - 1.5 * s, w - 0.3 * s, 0.4 * s); break;
      case 18: c.strokeStyle = wood; c.lineWidth = 0.08 * s; c.beginPath(); c.arc(x + w * 0.6, y - 0.85 * s, 0.42 * s, 0, 7); c.stroke(); c.beginPath(); c.moveTo(x + w * 0.6, y - 0.85 * s); c.lineTo(x + w * 0.6, y); c.moveTo(x, y); c.lineTo(x + 0.3 * s, y - 0.6 * s); c.stroke();
        c.save(); c.translate(x + w * 0.6, y - 0.85 * s); c.rotate(S.frame / 20); c.lineWidth = Math.max(1, s / 24); c.beginPath(); for (let j = 0; j < 4; j++) { c.moveTo(0, 0); c.lineTo(Math.cos(j * 0.8) * 0.4 * s, Math.sin(j * 0.8) * 0.4 * s); } c.stroke(); c.restore(); box("#f5f0e1", x + 0.15 * s, y - 0.95 * s, 0.2 * s, 0.25 * s, 3); break;
      case 19: box("#9a6a3a", m - 0.22 * s, y - 0.9 * s, 0.44 * s, 0.9 * s, 0.1 * s); box(dark, m - 0.03 * s, y - 1.3 * s, 0.06 * s, 0.4 * s); break;
      case 20: box(dark, x, y - 2.6 * s, w, 2.6 * s, 0.15 * s); ell("#f5f0e1", m, y - 2.15 * s, w * 0.35, w * 0.35); c.strokeStyle = "#333"; c.lineWidth = Math.max(1, s / 24); c.beginPath(); c.moveTo(m, y - 2.15 * s); c.lineTo(m, y - 2.3 * s); c.moveTo(m, y - 2.15 * s); c.lineTo(m + 0.1 * s, y - 2.15 * s); c.stroke();
        { const a = Math.sin(S.frame / 30) * 0.35; c.strokeStyle = "#c8a032"; c.lineWidth = Math.max(1, s / 20); c.beginPath(); c.moveTo(m, y - 1.7 * s); c.lineTo(m + Math.sin(a) * 0.8 * s, y - 1.7 * s + Math.cos(a) * 0.8 * s); c.stroke(); ell("#c8a032", m + Math.sin(a) * 0.8 * s, y - 1.7 * s + Math.cos(a) * 0.8 * s, 0.1 * s, 0.1 * s); } break;
      case 21: { const a = Math.sin(S.frame / 40) * 0.06; c.save(); c.translate(m, y); c.rotate(a); box(wood, -w / 2, -0.55 * s, w, 0.08 * s); box(dark, w / 2 - 0.12 * s, -1.2 * s, 0.08 * s, 0.7 * s); c.strokeStyle = dark; c.lineWidth = 0.07 * s; c.beginPath(); c.moveTo(-w / 2, -0.05 * s); c.quadraticCurveTo(0, 0.12 * s, w / 2, -0.05 * s); c.stroke(); box(dark, -w / 2 + 0.1 * s, -0.5 * s, 0.07 * s, 0.45 * s); c.restore(); break; }
      case 22: box("#a16207", x, y - 1.3 * s, w, 1.3 * s, 3); box("#ca8a04", x + 0.08 * s, y - 1.2 * s, w - 0.16 * s, 0.5 * s, 2); box("#bfe3f5", x + 0.15 * s, y - 1.15 * s, w - 0.3 * s, 0.3 * s, 2); box("#888", x + w - 0.2 * s, y - 0.6 * s, 0.08 * s, 0.2 * s); break;
      case 23: box("#9f1239", x, y - 0.06 * s, w, 0.06 * s); box("#f59e0b", x + 0.2 * s, y - 0.06 * s, w - 0.4 * s, 0.03 * s); break;
      case 25: c.fillStyle = "#c9a26b"; c.beginPath(); c.moveTo(x, y - 0.8 * s); c.quadraticCurveTo(m, y + 0.1 * s, x + w, y - 0.8 * s); c.lineTo(x + w - 0.1 * s, y - 0.35 * s); c.lineTo(x + 0.1 * s, y - 0.35 * s); c.fill(); box("#bae6fd", x + 0.15 * s, y - 0.75 * s, w - 0.3 * s, 0.2 * s, 3); break;
      case 26: box("#7a4a2a", x, y - 0.7 * s, w, 0.7 * s, 3); box("#5a3a1e", x, y - 0.7 * s, w, 0.2 * s, 3); box("#c8a032", m - 0.06 * s, y - 0.55 * s, 0.12 * s, 0.15 * s); break;
      case 27: box("#8e8a80", x, y - 1 * s, w, 1 * s, 0.1 * s); c.fillStyle = "rgba(0,0,0,0.2)"; for (let j = 0; j < 3; j++) c.fillRect(x, y - 0.33 * s * (j + 1), w, Math.max(1, s / 20)); box(dark, x + 0.1 * s, y - 2.1 * s, 0.1 * s, 1.1 * s); box(dark, x + w - 0.2 * s, y - 2.1 * s, 0.1 * s, 1.1 * s); box(dark, x + 0.1 * s, y - 2.1 * s, w - 0.2 * s, 0.1 * s);
        box("#6b6b6b", m - 0.15 * s, y - 1.75 * s + Math.sin(S.frame / 50) * 0.2 * s, 0.3 * s, 0.3 * s, 2); break;
      case 28: box("#b45309", m - 0.25 * s, y - 0.45 * s, 0.5 * s, 0.45 * s, [0, 0, 0.1 * s, 0.1 * s]); c.strokeStyle = "#15803d"; c.lineWidth = 0.08 * s; for (let j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(m, y - 0.45 * s); c.quadraticCurveTo(m + j * 0.25 * s, y - 1.2 * s, m + j * 0.38 * s, y - 0.8 * s); c.stroke(); } break;
      case 29: box("#7c2d12", x, y - 2.6 * s, w, 1.3 * s); box("#f59e0b", x + 0.1 * s, y - 2.5 * s, w - 0.2 * s, 1.1 * s); ell("#15803d", m, y - 2 * s, w * 0.3, 0.3 * s); box(dark, x - 0.05 * s, y - 2.65 * s, w + 0.1 * s, 0.08 * s); break;
      case 30: box(wood, x, y - 0.8 * s, w, 0.12 * s); for (const f of [0.1, 0.5, 0.88]) box(dark, x + w * f - 0.05 * s, y - 0.7 * s, 0.1 * s, 0.7 * s); box(dark, x + 0.1 * s, y - 0.4 * s, w - 0.2 * s, 0.08 * s);
        for (let j = 0; j < Math.floor(w / (0.6 * s)); j++) { ell("#e9e1d0", x + 0.4 * s + j * 0.6 * s, y - 0.86 * s, 0.17 * s, 0.05 * s); } break;
      case 31: box("#8e8a80", x, y - 0.9 * s, w, 0.9 * s, 2); box("#6b6b6b", x + 0.1 * s, y - 0.85 * s, w - 0.2 * s, 0.25 * s, 2); box("#9a6a3a", x + w - 0.45 * s, y - 1.25 * s, 0.35 * s, 0.35 * s, 2); break;
      case 32: c.strokeStyle = "#7a7a7a"; c.lineWidth = 0.18 * s; c.beginPath(); c.arc(m, y - 0.75 * s, 0.35 * s, 0, 7); c.stroke(); box(dark, x, y - 0.5 * s, w, 0.08 * s); box(dark, x + 0.05 * s, y - 0.45 * s, 0.08 * s, 0.45 * s); box(dark, x + w - 0.13 * s, y - 0.45 * s, 0.08 * s, 0.45 * s); break;
      case 33: box(dark, m - 0.05 * s, y - 0.7 * s, 0.1 * s, 0.7 * s); ell("#2563eb", m, y - 0.95 * s, 0.25 * s, 0.25 * s); ell("#16a34a", m - 0.05 * s, y - 1 * s, 0.1 * s, 0.13 * s); break;
      case 34: c.strokeStyle = "#333"; c.lineWidth = Math.max(1, s / 20); c.beginPath(); c.moveTo(m, y - 1.4 * s); c.lineTo(m, y - 0.95 * s); c.stroke(); ell("#2d2d2d", m, y - 0.75 * s, 0.3 * s, 0.24 * s); ell("#f59e0b", m, y - 0.2 * s, 0.25 * s, 0.18 * s); break;
      case 35: box(dark, x, y - 2.2 * s, w, 0.08 * s); for (let j = 0; j < 3; j++) box(["#166534", "#7c2d12", "#1e3a8a"][j], x + 0.1 * s + j * 0.28 * s, y - 2.15 * s, 0.24 * s, 0.9 * s, [0, 0, 0.1 * s, 0.1 * s]); break;
      case 36: box(dark, x, y - 2.2 * s, 0.1 * s, 2.2 * s); box(dark, x + w - 0.1 * s, y - 2.2 * s, 0.1 * s, 2.2 * s); for (const yy of [0.35, 1.35]) { box(wood, x, y - yy * s, w, 0.1 * s); box("#1d4ed8", x + 0.2 * s, y - (yy + 0.22) * s, w - 0.3 * s, 0.2 * s, 3); ell("#fff", x + 0.3 * s, y - (yy + 0.28) * s, 0.18 * s, 0.08 * s); } break;
    }
  }
  // (Matthew: "the interior of the beaver dams' house structures should be shown", with a cutaway of a lodge) A lodge in
  // cutaway, as the world is: a dome of sticks and mud on the river's bed (or on the bank), stones round its foot; inside, its
  // chamber, dry, just above the water: the feeding floor, peeled sticks on it, and the nest, higher, its bedding of shredded
  // wood; two tunnels from the floor down through the base to the entrances under the water; the air vent at the top, where
  // the sticks are loose; and the beavers resting in it, curled up asleep
  function lodgeBeavers(c, s, mid, cx, fy, chW) {
    let n = 0;
    for (const B of S.beavers) { if (B.b.job !== 0 || Math.abs(B.b.lodge - mid) > 4) continue; const x = cx + chW * (0.45 + 0.22 * n) - (n > 1 ? chW * 0.9 : 0), y = fy - s * (n > 1 ? 0.12 : 0.36); n++;
      c.fillStyle = "#3b2a1e"; c.beginPath(); c.ellipse(x - s * 0.2, y - s * 0.05, s * 0.2, s * 0.07, -0.4, 0, 7); c.fill();
      c.fillStyle = "#7a4a28"; c.beginPath(); c.ellipse(x, y - s * 0.17, s * 0.3, s * 0.18, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + s * 0.24, y - s * 0.12, s * 0.13, s * 0.1, 0, 0, 7); c.fill();
      c.strokeStyle = "#1a1008"; c.lineWidth = Math.max(1, s / 30); c.beginPath(); c.arc(x + s * 0.27, y - s * 0.15, s * 0.03, 0.2, Math.PI - 0.2); c.stroke();
      if (Math.floor(performance.now() / 900 + n) % 3 === 0) { c.fillStyle = "rgba(255,255,255,0.7)"; c.font = `${Math.round(0.28 * s)}px sans-serif`; c.fillText("z", x + s * 0.3, y - s * 0.45); } }
  }
  // (a lodge drawn once for each height of its water, its 140 sticks among them, and the beavers asleep in it drawn over it each
  // frame: performance, Matthew: "it seems like there are performance challenges now")
  function drawLodgeCached(L, s) {
    const R = L.river, mid = L.x + L.w / 2, k = Math.floor(mid) - R.x, inCh = k >= 0 && k < R.w, base = inCh ? R.bed[k] : surf0[Math.max(0, Math.min(WW - 1, Math.floor(mid)))], lvl = R.level;
    const W = (L.w / 2 + 1.1) * s, cx = mid * s, by = base * s, topY = (Math.min(lvl, base) - 3.3) * s, key = lvl + ":" + base + ":" + s + (LINE ? ":line" : "");
    if (!L.cache || L.cache.key !== key) { const x0 = cx - W - s, y0 = topY - s, cv2 = document.createElement("canvas"); cv2.width = Math.ceil(2 * W + 2 * s); cv2.height = Math.ceil(by - topY + 2.5 * s);
      const g = cv2.getContext("2d"); g.translate(-x0, -y0); drawLodge(L, s, LINE ? lineCtx(g) : g, "body"); L.cache = { key, cv: cv2, x0, y0 }; }
    ctx.drawImage(L.cache.cv, L.cache.x0, L.cache.y0); drawLodge(L, s, ctx, "beavers");
  }
  function drawLodge(L, s, cc = ctx, part = "all") {
    const c = cc, R = L.river, mid = L.x + L.w / 2, k = Math.floor(mid) - R.x, inCh = k >= 0 && k < R.w;
    const base = inCh ? R.bed[k] : surf0[Math.max(0, Math.min(WW - 1, Math.floor(mid)))], lvl = R.level, r = seededR(L.x * 7 + 3);
    const cx = mid * s, by = base * s, W = (L.w / 2 + 1.1) * s, topY = (Math.min(lvl, base) - 3.3) * s, ry = by - topY;
    const dome = () => { c.beginPath(); c.moveTo(cx - W, by); c.bezierCurveTo(cx - W, by - ry * 0.75, cx - W * 0.55, topY, cx, topY); c.bezierCurveTo(cx + W * 0.55, topY, cx + W, by - ry * 0.75, cx + W, by); c.closePath(); };
    if (part === "beavers") { lodgeBeavers(c, s, mid, cx, (lvl - 0.15) * s, W * 0.62); return; }
    // (the mass: mud packed among the sticks)
    c.fillStyle = "#5e4128"; dome(); c.fill();
    c.save(); dome(); c.clip();
    c.lineCap = "round";
    for (let j = 0; j < 140; j++) { const a = r(j) * Math.PI, d = 0.55 + 0.45 * r(j + 300), x = cx + Math.cos(a) * W * d * (r(j + 600) < 0.5 ? -1 : 1), y = by - Math.sin(a) * ry * d * (0.4 + 0.6 * r(j + 900)) + (r(j + 1200) - 0.5) * s * 0.3;
      const ang = (r(j + 1500) - 0.5) * 2.4, len = s * (0.4 + 0.7 * r(j + 1800));
      c.strokeStyle = ["#8a6440", "#a07a4a", "#6b4a2b", "#c4a274", "#4a3220"][j % 5]; c.lineWidth = Math.max(1, s * (0.05 + 0.05 * r(j + 2100)));
      c.beginPath(); c.moveTo(x - Math.cos(ang) * len / 2, y - Math.sin(ang) * len / 2); c.lineTo(x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2); c.stroke(); }
    // (the chamber: a dry room just above the water, its floor a little over the waterline; the nest higher, to the east)
    const fy = (lvl - 0.15) * s, chH = Math.min(1.7 * s, (fy - topY) * 0.66), chW = W * 0.62;
    c.fillStyle = "#24170d"; c.beginPath(); c.moveTo(cx - chW, fy); c.bezierCurveTo(cx - chW, fy - chH * 0.9, cx - chW * 0.4, fy - chH * 1.1, cx + chW * 0.1, fy - chH); c.bezierCurveTo(cx + chW * 0.7, fy - chH * 1.15, cx + chW * 1.05, fy - chH * 0.8, cx + chW, fy - s * 0.25); c.lineTo(cx + chW * 0.3, fy - s * 0.25); c.lineTo(cx + chW * 0.25, fy); c.closePath(); c.fill();
    c.fillStyle = "#4a3220"; c.fillRect(cx - chW, fy - s * 0.06, chW * 1.25, s * 0.1); c.fillRect(cx + chW * 0.25, fy - s * 0.31, chW * 0.75, s * 0.1);
    c.strokeStyle = "#d8c48a"; c.lineWidth = Math.max(1, s / 28); c.beginPath();
    for (let j = 0; j < 26; j++) { const x = cx + chW * (0.3 + 0.65 * r(j + 2400)), y = fy - s * (0.32 + 0.12 * r(j + 2500)); c.moveTo(x, y); c.lineTo(x + s * (r(j + 2600) - 0.5) * 0.4, y - s * 0.04 * r(j + 2700)); } c.stroke();
    c.strokeStyle = "#e8d8b0"; c.lineWidth = Math.max(1, s / 16); c.beginPath(); for (let j = 0; j < 3; j++) { const x = cx - chW * (0.8 - 0.25 * j); c.moveTo(x, fy - s * 0.1); c.lineTo(x + s * 0.35, fy - s * 0.14); } c.stroke();
    // (two tunnels down from the floor, through the base, to the entrances under the water)
    c.strokeStyle = "#1b2833"; c.lineWidth = s * 0.42;
    for (const [x0, x1] of [[cx - chW * 0.55, cx - W * 0.85], [cx - chW * 0.1, cx + W * 0.2]]) { c.beginPath(); c.moveTo(x0, fy - s * 0.05); c.quadraticCurveTo((x0 + x1) / 2, fy + (by - fy) * 0.35, x1, by - s * 0.35); c.stroke(); }
    // (the air vent, loose sticks at the top)
    c.strokeStyle = "rgba(255,240,210,0.25)"; c.lineWidth = Math.max(1, s / 20); c.beginPath(); for (let j = 0; j < 5; j++) { const x = cx + (j - 2) * s * 0.12; c.moveTo(x, topY + s * 0.1); c.lineTo(x + s * 0.05, topY + s * 0.5); } c.stroke();
    // (the beavers resting, curled up asleep in the nest)
    if (part === "all") lodgeBeavers(c, s, mid, cx, fy, chW);
    c.restore();
    c.strokeStyle = "#3a2818"; c.lineWidth = Math.max(1, s / 14); dome(); c.stroke();
    // (stones round its foot)
    for (let j = 0; j < 7; j++) { c.fillStyle = ["#8a8580", "#a39e98", "#6f6a66"][j % 3]; c.beginPath(); c.ellipse(cx - W + (j + 0.5) * W * 2 / 7, by - s * 0.08, s * (0.18 + 0.1 * r(j + 3000)), s * 0.12, 0, 0, 7); c.fill(); }
  }
  // (Matthew: "let's have the beavers produce logs from the fallen tree in stages, not instantly", "doing DFS ideally") A felled
  // tree lies where it fell, its limbs as it grew them (the same limbs it was drawn with; a pine's boughs, a willow's arching
  // limbs), and the beavers cut it up a log at a time, depth first: down each limb to its ends, each limb's own limbs cut
  // before it, the thinnest twigs going with the limb they grow on, and the trunk last, in three logs, its top first. Each cut
  // is a log onto the pile beside it (World.beaver's cut), and that piece is gone from the tree on the ground
  function subCubic(P, f) { const lerp2 = (a, b) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], a = lerp2(P[0], P[1]), b = lerp2(P[1], P[2]), c2 = lerp2(P[2], P[3]), d = lerp2(a, b), e = lerp2(b, c2), m = lerp2(d, e); return [P[0], a, d, m]; }
  function fallenOf(t) {
    const hT = t.h * (t.kind === 4 ? 1.1 : 1), segs = [];
    if (t.kind === 1 || t.kind === 4) { const H = hT * (t.kind === 1 ? 0.9 : 0.55), r = seededR(t.seed + 5);
      segs.push({ P: [[0, 0], [0.05, -H * 0.33], [-0.05, -H * 0.66], [0, -H]], w0: t.kind === 1 ? 0.32 : 0.55, w1: t.kind === 1 ? 0.08 : 0.35, lvl: 3, k: 1, parent: -1 });
      const n = t.kind === 1 ? 5 + Math.floor(t.h / 3) : 4;
      for (let j = 0; j < n; j++) { const sd = j % 2 ? 1 : -1, y0 = t.kind === 1 ? -H * (0.22 + 0.7 * j / n) : -H * (0.85 + 0.03 * j), len = t.kind === 1 ? 0.5 + 1.4 * (1 - j / n) : hT * (0.3 + 0.08 * r(j));
        const ex = sd * len, ey = y0 + (t.kind === 1 ? 0.25 * len : -0.2 * len);
        segs.push({ P: [[0, y0], [sd * len * 0.35, y0 - 0.1 * len], [sd * len * 0.7, ey - 0.05], [ex, ey + (t.kind === 4 ? len * 0.4 : 0)]], w0: t.kind === 1 ? 0.12 : 0.24, w1: 0.05, lvl: 0, k: j + 2, parent: 0 }); } }
    else { const fr = leafyFrame(t.seed + 1, TREE_LOOK[t.kind] || TREE_LOOK[0]), k = hT / 330, ti = fr.L.segs.length - 1;
      for (const sg of fr.L.segs) segs.push({ P: sg.P.map(([x, y]) => [x * k, y * k]), w0: sg.w0 * k, w1: sg.w1 * k, lvl: sg.lvl, k: sg.k, parent: sg.parent === -2 ? ti : sg.parent ?? -1 });
      const tr = segs.splice(ti, 1)[0]; segs.unshift(tr); for (const sg of segs) if (sg !== tr) sg.parent = sg.parent === ti ? 0 : sg.parent < ti ? sg.parent + 1 : sg.parent; tr.parent = -1; }
    // (the pieces, depth first: each limb after its own limbs; the trunk last, top first)
    const kids = segs.map(() => []); segs.forEach((sg, i) => { if (sg.parent >= 0) kids[sg.parent].push(i); });
    const pieces = [], visit = i => { for (const c of kids[i]) visit(c); if (i === 0) pieces.push({ i: 0, to: 2 / 3 }, { i: 0, to: 1 / 3 }, { i: 0, to: 0 }); else if (segs[i].w0 >= 0.1) pieces.push({ i }); };
    visit(0);
    return { segs, pieces, trunk: 1, gone: new Uint8Array(segs.length) };
  }
  function cutPiece(fl) { const p = fl.F.pieces[fl.k++]; if (!p) return; if (p.i === 0) fl.F.trunk = p.to; else fl.F.gone[p.i] = 1; }
  function drawFallen(fl, s) {
    const t = fl.t, hT = t.h * (t.kind === 4 ? 1.1 : 1) + 3, x = (t.x + 0.5) * s, gy = landY(t.x) * s, key = fl.k + ":" + s + (LINE ? ":line" : "");
    if (!fl.pic || fl.pic.key !== key) { const ox = hT * s, oy = hT * 0.8 * s, cv2 = document.createElement("canvas"); cv2.width = Math.ceil(2 * hT * s); cv2.height = Math.ceil((hT * 0.8 + 2.5) * s);
      const g = cv2.getContext("2d"); g.translate(ox - x, oy - gy); paintFallen(LINE ? lineCtx(g) : g, fl, s); fl.pic = { key, cv: cv2, ox, oy }; }
    ctx.drawImage(fl.pic.cv, x - fl.pic.ox, gy - fl.pic.oy);
  }
  function paintFallen(ctx, fl, s) {
    const t = fl.t, F = fl.F, dir = t.fallDir || 1, gy = landY(t.x), x = (t.x + 0.5) * s, half = F.segs[0].w0 / 2;
    const seen = i => { for (let j = i; j > 0; j = F.segs[j].parent) if (F.gone[j]) return false; return i === 0 ? F.trunk > 0 : !F.gone[i]; };
    const L = { segs: [], tips: [], mids: [], joints: [] };
    F.segs.forEach((sg, i) => { if (!seen(i)) return; const P = i === 0 ? subCubic(sg.P, F.trunk) : sg.P; L.segs.push({ P: P.map(([a, b]) => [a * s, b * s]), w0: sg.w0 * s, w1: (i === 0 ? sg.w0 + (sg.w1 - sg.w0) * F.trunk : sg.w1) * s, lvl: sg.lvl, k: sg.k, base: 0.1 }); });
    if (!L.segs.length) return;
    // (lying along the ground: its trunk tilted up to rest on the highest ground under it, not buried in a bank)
    const Lt = Math.hypot(F.segs[0].P[3][0], F.segs[0].P[3][1]); let hi = gy; for (let k = 1; k <= Lt; k++) { const c = t.x + dir * k; if (inside(c, 0)) hi = Math.min(hi, landY(c)); }
    const tilt = Math.atan2(Math.max(0, gy - hi) + half, Lt);
    ctx.save(); ctx.translate(x + dir * 0.25 * s, (gy - 0.05) * s - half * s); ctx.rotate(dir * (Math.PI / 2 - tilt));
    drawLimbs(ctx, L, (TREE_LOOK[t.kind] || {}).bark || "#6b4a2b", s, 1);
    // (its leaves, wilting, on the ends of the limbs still on it)
    const greens = t.kind === 1 ? ["#1f5f3a", "#245f34"] : t.kind === 4 ? ["#86a92e", "#a2c23e"] : ["#5a7a2a", "#6b8a30", "#7a9a3a"];
    F.segs.forEach((sg, i) => { if (i === 0 || !seen(i) || sg.lvl > 0) return; const [ex, ey] = sg.P[3]; pad(ctx, sg.k % 8, ex * s, ey * s + 0.1 * s, (t.kind === 1 ? 0.004 : 0.006) * s * (sg.k % 2 ? 1 : -1), 0.006 * s, greens[sg.k % greens.length]); });
    ctx.restore();
  }
  // a pile of logs, their cut ends to us, stacked in rows, each row one fewer, as many as are left: bark round each, the pale
  // wood, its rings
  function drawPile(p, x, y) {
    const c = ctx, s = T, rad = 0.25 * s; let base = 1; while (base * (base + 1) / 2 < p.max) base++;
    let k = 0;
    for (let row = 0; row < base && k < p.n; row++) for (let j = 0; j < base - row && k < p.n; j++, k++) {
      const lx = x + (j - (base - row - 1) / 2) * rad * 2.05, ly = y - rad - row * rad * 1.75, rr = rad * (0.9 + 0.15 * ((k * 7 + p.seed) % 5) / 4);
      c.fillStyle = "#4a3020"; c.beginPath(); c.arc(lx, ly, rr, 0, 7); c.fill(); c.fillStyle = "#d9b98a"; c.beginPath(); c.arc(lx, ly, rr * 0.8, 0, 7); c.fill();
      c.strokeStyle = "rgba(140,95,50,0.55)"; c.lineWidth = Math.max(1, s / 40); c.beginPath(); c.arc(lx, ly, rr * 0.5, 0, 7); c.stroke(); c.beginPath(); c.arc(lx, ly, rr * 0.25, 0, 7); c.stroke();
      c.fillStyle = "rgba(255,240,215,0.25)"; c.beginPath(); c.arc(lx - rr * 0.25, ly - rr * 0.25, rr * 0.3, 0, 7); c.fill(); }
  }
  function drawBeaver(B, x, y, swimming) {
    const c = ctx, s = T, f = B.b.face || 1, job = B.b.job;
    if (job === 0) return;   // (in the lodge, resting: drawn there, drawLodge)
    c.save(); c.translate(x, y); c.scale(f, 1);
    const bob = job === 2 || job === 7 ? Math.sin(S.frame / 3) * 0.05 * s : 0;
    c.fillStyle = "#3b2a1e"; c.beginPath(); c.ellipse(-0.55 * s, -0.1 * s, 0.32 * s, 0.11 * s, -0.2, 0, 7); c.fill();   // (the tail, flat)
    c.fillStyle = "#7a4a28"; c.beginPath(); c.ellipse(0, -0.3 * s, 0.42 * s, 0.28 * s, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(0.38 * s, -0.42 * s + bob, 0.2 * s, 0.17 * s, 0, 0, 7); c.fill();
    c.fillStyle = "#1a1008"; c.beginPath(); c.arc(0.45 * s, -0.48 * s + bob, 0.035 * s, 0, 7); c.fill(); c.beginPath(); c.arc(0.57 * s, -0.42 * s + bob, 0.04 * s, 0, 7); c.fill();
    c.fillStyle = "#fde68a"; c.fillRect(0.5 * s, -0.36 * s + bob, 0.06 * s, 0.08 * s);
    c.fillStyle = "#5a3a1e"; c.beginPath(); c.arc(0.28 * s, -0.58 * s + bob, 0.06 * s, 0, 7); c.fill();
    if (!swimming) { c.fillStyle = "#5a3a1e"; c.fillRect(-0.2 * s, -0.1 * s, 0.1 * s, 0.12 * s); c.fillRect(0.2 * s, -0.1 * s, 0.1 * s, 0.12 * s); }
    if (job === 3) { c.fillStyle = "#6b4a2b"; c.beginPath(); c.roundRect(-1.05 * s, -0.56 * s, 1.15 * s, 0.26 * s, 0.12 * s); c.fill(); c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = Math.max(1, s / 30); c.beginPath(); c.moveTo(-0.95 * s, -0.47 * s); c.lineTo(0, -0.47 * s); c.moveTo(-0.9 * s, -0.38 * s); c.lineTo(-0.1 * s, -0.38 * s); c.stroke();
      c.fillStyle = "#d9b98a"; c.beginPath(); c.ellipse(-1.05 * s, -0.43 * s, 0.07 * s, 0.13 * s, 0, 0, 7); c.fill(); c.strokeStyle = "rgba(120,80,40,0.6)"; c.beginPath(); c.ellipse(-1.05 * s, -0.43 * s, 0.035 * s, 0.07 * s, 0, 0, 7); c.stroke(); }
    c.restore();
  }
  function draw() {
    fit();
    const now = performance.now(), W = cv.width, Hh = cv.height, s = T, g = S.g;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!g) { ctx.fillStyle = "#8cc4ec"; ctx.fillRect(0, 0, W, Hh); return; }
    // (the camera: smoothly after the gnome, a little ahead the way it faces, kept inside the world)
    const gx = g.x / 1000, gy = g.y / 1000 - 0.45, tx = gx + g.face * 1.2 - VW / 2, ty = gy - VH / 2;
    if (!S.cam.set) { S.cam.x = tx; S.cam.y = ty; S.cam.set = true; }
    S.cam.x += (tx - S.cam.x) * 0.12; S.cam.y += (ty - S.cam.y) * 0.12;
    S.cam.x = Math.max(0, Math.min(WW - VW, S.cam.x)); S.cam.y = Math.max(0, Math.min(WH - VH, S.cam.y));
    if (S.camFix) { S.cam.x = S.camFix.x; S.cam.y = S.camFix.y; }   // (the tests' fixed view)
    const camX = Math.round(S.cam.x * s) / s, camY = Math.round(S.cam.y * s) / s;
    const c0 = Math.max(0, Math.floor(camX) - 1), c1 = Math.min(WW - 1, Math.ceil(camX + VW) + 1), r0 = Math.max(0, Math.floor(camY) - 1), r1 = Math.min(WH - 1, Math.ceil(camY + VH) + 1);
    VIEW.y0 = camY * s; VIEW.y1 = (camY + VH) * s;
    pmark("sky");
    // the sky, the sun, far hills (slower, behind), clouds
    const sk = ctx.createLinearGradient(0, 0, 0, Hh); sk.addColorStop(0, "#5fa8e0"); sk.addColorStop(1, "#cfe9f7"); ctx.fillStyle = sk; ctx.fillRect(0, 0, W, Hh);
    const skyY = y => (y - camY) * s;
    ctx.fillStyle = "#fff6c2"; ctx.beginPath(); ctx.arc(W * 0.82, skyY(6 + SKY) * 0.4 + s * 2, s * 1.4, 0, 7); ctx.fill();
    for (const [par, col, amp, base] of [[0.25, "#a8c8a0", 4, 33 + SKY], [0.5, "#86b07a", 3, 36 + SKY]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, Hh);
      for (let px = 0; px <= W + 8; px += 8) { const wx = (px / s + camX * par); ctx.lineTo(px, (base - amp * (Math.sin(wx / 9) * 0.6 + Math.sin(wx / 23 + 1) * 0.8) - camY * (1 - par) - camY * par) * s); }
      ctx.lineTo(W, Hh); ctx.fill(); }
    for (let k = 0; k < 9; k++) { const cx = ((k * 61 + now / 900) % (WW * 0.6)) * 1.6 - camX * 0.35 * s / s; const x = (cx - camX * 0.0) * s * 0.5 + ((k * 137) % W), y = skyY(4 + SKY + (k * 7) % 12) * 0.6 + s;
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.ellipse(((x % (W + 400)) + W + 400) % (W + 400) - 200, y, s * 1.6, s * 0.45, 0, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(-camX * s, -camY * s);
    pmark("trees");
    // above the land: the trees, bushes and mushrooms (painted once, sprites), then the great trees over them
    const painted0 = SPRITES.painted, reach = t => t.tall ? tallBox(t).ox + 1 : t.h * (t.kind === 1 ? 0.4 : 0.75) + 2;
    for (const t of S.trees) { const m = reach(t); if (t.x >= c0 - m && t.x <= c1 + m) { drawTree(t, (t.x + 0.5) * s, landY(t.x) * s); drawPropRoots(t, (t.x + 0.5) * s, landY(t.x) * s, s); } }
    // (0.0.102) a tree just out of view, its picture painted now, one a frame, so that walking up to it does not wait on it
    if (SPRITES.painted === painted0 && !LINE) for (const t of S.trees) { const m = reach(t) + 24; if (!t.alive || t.tall || t.x < c0 - m || t.x > c1 + m) continue;
      const k = `tree:${t.kind}:${t.h}:${t.seed}:0:front`, sp = spriteCache.get(k); if (!sp || sp.T !== T) { treeSprite(t); if (t.kind === 4) treeSprite(t, "back"); break; } }
    pmark("bushes");
    for (const b of S.bushes) if (b.x >= c0 - 6 && b.x <= c1 + 6) drawSwaying(bushSprite(b), (b.x + 0.5) * s, landY(b.x) * s, 1, sway(b.x * 3, 0.9));
    pmark("shrooms");
    for (const m of S.shrooms) if (m.x >= c0 - 1 && m.x <= c1 + 1) drawShroom(m, (m.x + 0.5) * s, landY(m.x) * s);
    pmark("fallen");
    for (const fl of S.fallen) if (fl.x >= c0 - 16 && fl.x <= c1 + 16 && S.frame - fl.t.fallAt >= 50) drawFallen(fl, s);
    pmark("piles");
    for (const p of S.piles) if (p.x >= c0 - 2 && p.x <= c1 + 2) drawPile(p, (p.x + 0.5) * s, landY(p.x) * s);
    pmark("flowers");
    for (const f of S.flowers) if (f.x >= c0 - 2 && f.x <= c1 + 2 && top[f.x] >= surf0[f.x]) drawFlowers(f, (f.x + 0.5) * s, landY(f.x) * s, now);
    pmark("bunnies");
    drawBunnies(c0, c1, now);
    pmark("greats");
    for (const G of S.greats) { const gm = greatBox(G).ox + 1; if (G.x + gm < c0 || G.x - gm > c1) continue; const x = (G.x + 0.5) * s, y = G.foot * s;
      drawSwaying(greatSprite(G), x, y, 1, sway(G.v, 0.18));
      if (G.kind === 31) {   // (the stair inside: the trunk cut away, a winding stair round a post, a door to each limb)
        const top0 = y - (Math.max(...G.limbs.map(l => l.y)) + 1.2) * s, iw = (G.half + 0.2) * 2 * s * 0.75;
        // (Matthew: "let's hide the internal of the tree that's hollow until we are there, as with the tree houses") the hollow
        // and its stair shown only while the gnome is in the trunk, opening and closing as a house's front does; outside, the bark
        const inTrunk = Math.abs(g.x / 1000 - (G.x + 0.5)) <= G.half + 0.3 && g.y / 1000 <= G.foot + 0.2 && g.y / 1000 >= G.foot - Math.max(...G.limbs.map(l => l.y)) - 2;
        G.open = (G.open || 0) + ((inTrunk ? 1 : 0) - (G.open || 0)) * 0.15; ctx.save(); ctx.globalAlpha = G.open;
        ctx.fillStyle = "#24160c"; ctx.beginPath(); ctx.roundRect(x - iw / 2, top0, iw, y - top0, [iw / 2, iw / 2, 0, 0]); ctx.fill();
        ctx.strokeStyle = "#5e3d22"; ctx.lineWidth = Math.max(2, s / 8); ctx.stroke();
        ctx.fillStyle = "#5e3d22"; ctx.fillRect(x - 0.12 * s, top0 + 0.3 * s, 0.24 * s, y - top0 - 0.3 * s);
        for (let yy = y - 0.5 * s, j = 0; yy > top0 + 0.4 * s; yy -= 0.5 * s, j++) { const a = j * 0.9, sx = Math.sin(a); ctx.fillStyle = Math.cos(a) > 0 ? "#b07a48" : "#7a5230";
          ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + sx * iw * 0.46, yy - 0.12 * s); ctx.lineTo(x + sx * iw * 0.46, yy + 0.02 * s); ctx.lineTo(x, yy + 0.12 * s); ctx.fill(); }
        ctx.restore();
        for (const L of G.limbs) { const ly = y - L.y * s; ctx.fillStyle = "#4a2e1a"; ctx.beginPath(); ctx.roundRect(x + L.side * (iw / 2) - (L.side > 0 ? 0 : 0.35 * s), ly - 1 * s, 0.35 * s, 1 * s, [0.15 * s, 0.15 * s, 0, 0]); ctx.fill(); } }
    }
    pmark("ground");
    // the ground, as Gnome dig paints it: each kind flat, darker deeper, a fleck or two, its own faint marks
    ctx.plain = true;
    const dk = new Path2D(), lt = new Path2D(), ln = new Path2D(), sp = Math.max(1, s * 0.08);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const m = mat[at(c, r)]; if (m < SOIL || m > GRANITE) continue;
      const x = c * s, y = r * s, hsh = (c * 73 + r * 151) % 97;
      ctx.fillStyle = groundCol(m, r - surf0[c]); const sk = shape[at(c, r)]; if (sk) { slopeTri(ctx, x, y, s, sk); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = Math.max(1, s * 0.03); ctx.beginPath(); if (sk === 1) { ctx.moveTo(x, y + s); ctx.lineTo(x + s, y); } else { ctx.moveTo(x, y); ctx.lineTo(x + s, y + s); } ctx.stroke(); continue; }
      ctx.fillRect(x, y, s + 0.5, s + 0.5);
      dk.rect(x + s * (0.15 + (hsh % 5) * 0.03), y + s * 0.3, sp, sp); dk.rect(x + s * 0.65, y + s * (0.6 + (hsh % 3) * 0.08), sp, sp);
      if (m === SAND) { lt.rect(x + s * 0.4, y + s * 0.15, sp * 1.3, sp); dk.rect(x + s * 0.8, y + s * 0.45, sp * 1.2, sp * 1.2); lt.rect(x + s * 0.25, y + s * 0.75, sp, sp); }
      else if (m === SSTONE) lt.rect(x, y + s * (0.2 + (hsh % 6) * 0.1), s, Math.max(1, s * 0.04));
      else if (m === SHALE) { ln.rect(x, y + s * 0.35, s, Math.max(1, s * 0.035)); ln.rect(x, y + s * 0.72, s, Math.max(1, s * 0.035)); }
      else if (m === LIME) { lt.rect(x + s * 0.5, y + s * 0.2, sp, sp); lt.rect(x + s * 0.3, y + s * 0.62, sp * 1.5, sp * 0.6); }
      else if (m === GRANITE) { lt.rect(x + s * 0.3, y + s * 0.15, sp, sp); lt.rect(x + s * 0.75, y + s * 0.5, sp, sp); dk.rect(x + s * 0.45, y + s * 0.8, sp, sp); } }
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fill(dk); ctx.fillStyle = "rgba(255,232,200,0.1)"; ctx.fill(lt); ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fill(ln); ctx.plain = false;
    // (Matthew: "the tree roots have regressed, a lot, from the original gnome dig prototype game"; "it had foreground and
    // background elements, and accommodations for dug out earth tiles"; "the artwork behind those roots was a key part of the
    // aesthetic that I wanted to adopt") Gnome dig's roots and mycelium, grown in Hazel (World.roots, World.threads), and drawn
    // as Gnome dig draws them: one dark layer laid on faintly, a shade darker than the earth they cross, the threads pale;
    // behind a tunnel, its back wall darker and in it the roots seen from behind; across a tunnel, the roots that ran through it
    // as wood, over the gnome
    pmark("roots");
    ensureRoots(c0 - 14, c1 + 14);
    // (only over the ground: the roots grown before a bank was cut back do not cross the air over it; drawn once, rootChunk)
    drawRootChunks(c0, c1, r0, r1, s, "ground");
    pmark("walls");
    // masonry and timber, and what is behind each open tile under the land: rooms' walls, the stair's stones, a cave's rock
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = at(c, r), m = mat[i];
      if (m === MASON || m === TIMBER) { ctx.drawImage(tex(m, (c * 3 + r * 5) & 3), c * s, r * s); continue; }
      if (m !== AIR) continue; const b = bg[i];
      if (b === B_PLASTER || b === B_WOOD || b === B_STAIR || b === B_CAVE) ctx.drawImage(tex(b === B_PLASTER ? 101 : b === B_WOOD ? 102 : b === B_STAIR ? 103 : 104, (c * 7 + r * 3) & 3), c * s, r * s); }
    pmark("tunnels");
    // the dug tiles (Gnome dig's dugLayer): a back wall of darker earth, the roots seen from behind it, the near roots faint and
    // light, the threads; each edge against the ground shaded, the floor lit a little
    const dugPath = new Path2D(); let dugN = 0;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = at(c, r); if (mat[i] !== AIR || bg[i] !== B_DUG) continue;
      ctx.fillStyle = backCol(r - surf0[c]); ctx.fillRect(c * s, r * s, s + 0.5, s + 0.5); dugPath.rect(c * s, r * s, s + 0.5, s + 0.5); dugN++; }
    if (dugN) {
      drawRootChunks(c0, c1, r0, r1, s, "back");
      const E = LINE ? null : edges(), open = (cc, rr) => inside(cc, rr) && mat[at(cc, rr)] === AIR;
      if (E) for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = at(c, r); if (mat[i] !== AIR || bg[i] !== B_DUG) continue;
        if (!open(c, r - 1)) ctx.drawImage(E.top, c * s, r * s); if (!open(c - 1, r)) ctx.drawImage(E.left, c * s, r * s); if (!open(c + 1, r)) ctx.drawImage(E.right, c * s + s * 0.84, r * s);
        if (!open(c, r + 1)) { ctx.fillStyle = "rgba(255,228,196,0.07)"; ctx.fillRect(c * s, r * s + s * 0.9, s + 0.5, s * 0.1); } }
      drawWorks(c0, c1, r0, r1, s); }
    drawPebbles(false, c0, c1, r0, r1);
    pmark("surface");
    // on the ground: grass along the land, the water in it (blue, darker the fuller), gems, a digging's cracks
    const dc = g.dt > 0 ? g.dc : -1, dr = g.dr;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = at(c, r), m = mat[i]; if (m === AIR) continue;
      if (r === top[c] && r <= surf0[c] + 1 && m <= SSTONE) { const sk = shape[i], gy0 = j => r * s + (sk === 1 ? s - (j + 0.3) * s / 7 : sk === 2 ? (j + 0.3) * s / 7 : 0);
        // (Matthew: "more root, surface polish here", the slopes down to a creek) the topsoil under the turf, darker, along the land
        // and down each slope; and, where a tree's roots run near a slope's face, a root or two out of it, arching back in
        { const x0 = c * s, y0 = r * s, th = 0.2 * s, tc = mixHex(groundCol(m, r - surf0[c]), "#24140a", 0.45); ctx.fillStyle = tc; ctx.globalAlpha = 0.55; ctx.beginPath();
          if (sk === 1) { ctx.moveTo(x0, y0 + s); ctx.lineTo(x0 + s, y0); ctx.lineTo(x0 + s, y0 + th * 1.4); ctx.lineTo(x0 + th * 1.4, y0 + s); }
          else if (sk === 2) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + s, y0 + s); ctx.lineTo(x0 + s - th * 1.4, y0 + s); ctx.lineTo(x0, y0 + th * 1.4); }
          else { ctx.moveTo(x0, y0); ctx.lineTo(x0 + s + 0.5, y0); for (let j = 4; j >= 0; j--) ctx.lineTo(x0 + j * s / 4, y0 + th * (0.8 + 0.4 * (((c * 5 + j * 3) % 4) / 3))); }
          ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
          const rd = Math.max(root[i], inside(c, r + 1) ? root[at(c, r + 1)] : 0);
          if (sk && rd > 0) for (let j = 0; j < rd; j++) { const h = ((c * 7 + r * 13 + j * 29) % 97) / 97, t0 = 0.12 + 0.5 * h, t1 = Math.min(0.95, t0 + 0.22 + 0.15 * ((j * 31 + c) % 5) / 5), lift = (0.12 + 0.18 * ((c + j * 7) % 3) / 2) * s;
            const P0 = [x0 + t0 * s, sk === 1 ? y0 + (1 - t0) * s : y0 + t0 * s], P1 = [x0 + t1 * s, sk === 1 ? y0 + (1 - t1) * s : y0 + t1 * s], nx = sk === 1 ? -0.707 : 0.707, ny = -0.707;
            const C = [(P0[0] + P1[0]) / 2 + nx * lift, (P0[1] + P1[1]) / 2 + ny * lift];
            taper(ctx, P0, C, P1, (0.07 + 0.03 * rd) * s, 0.04 * s, "#5b3a22"); ctx.strokeStyle = "rgba(255,230,190,0.3)"; ctx.lineWidth = Math.max(1, s * 0.015); ctx.beginPath(); ctx.moveTo(P0[0], P0[1] - 0.02 * s); ctx.quadraticCurveTo(C[0], C[1] - 0.02 * s, P1[0], P1[1] - 0.02 * s); ctx.stroke(); } }
        ctx.fillStyle = "#4d7c0f"; if (sk) { ctx.strokeStyle = "#4d7c0f"; ctx.lineWidth = s * 0.14; ctx.beginPath(); ctx.moveTo(c * s, r * s + (sk === 1 ? s : 0)); ctx.lineTo(c * s + s, r * s + (sk === 1 ? 0 : s)); ctx.stroke(); } else ctx.fillRect(c * s, r * s - s * 0.04, s + 0.5, s * 0.14);
        ctx.strokeStyle = "#65a30d"; ctx.lineWidth = Math.max(1, s * 0.035); ctx.beginPath();
        const gw = S.windNow || 0, gt = now / (520 - 200 * Math.min(1, Math.abs(gw)));
        for (let j = 0; j < 7; j++) { const bx = c * s + (j + 0.3) * s / 7, by = gy0(j), bh = s * (0.1 + ((c * 7 + j * 13) % 5) * 0.035), bend = gw * 0.7 + (0.15 + 0.4 * Math.abs(gw)) * Math.sin(gt + c * 0.9 + j * 1.3);
          ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + bend * bh * 0.2, by - bh * 0.6, bx + s * 0.03 * (((c + j) % 3) - 1) + bend * bh * 0.7, by - bh * (1 - 0.25 * Math.abs(bend))); } ctx.stroke(); }
      const w0 = wat[i]; if (PORES[m] > 0 && w0 > 0.05) { ctx.fillStyle = `rgba(37,99,235,${(0.03 + 0.2 * w0 * w0).toFixed(3)})`; if (shape[i]) { slopeTri(ctx, c * s, r * s, s, shape[i]); ctx.fill(); } else ctx.fillRect(c * s, r * s, s + 0.5, s + 0.5);
        if (w0 > 0.95 && ((c * 7 + r * 3 + (S.frame >> 4)) % 11 === 0)) { ctx.fillStyle = "rgba(200,230,255,0.45)"; ctx.fillRect(c * s + s * 0.4, r * s + s * 0.4, s * 0.1, s * 0.1); } }
      if (gem[i]) { const tw = 0.5 + 0.5 * Math.sin(now / 300 + c + r); ctx.fillStyle = GEMS[gem[i]]; ctx.beginPath(); ctx.moveTo(c * s + s * 0.5, r * s + s * 0.2); ctx.lineTo(c * s + s * 0.78, r * s + s * 0.45); ctx.lineTo(c * s + s * 0.5, r * s + s * 0.8); ctx.lineTo(c * s + s * 0.22, r * s + s * 0.45); ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${(0.4 + 0.5 * tw).toFixed(2)})`; ctx.fillRect(c * s + s * 0.42, r * s + s * 0.32, s * 0.1, s * 0.1); }
      if (stone[i]) ctx.drawImage(stoneTile(stone[i]), c * s, r * s);
      if (c === dc && r === dr) { ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = Math.max(1, s / 14); const f = Math.min(1, g.dt / Math.max(1, digSteps(m, r, g.tool))); ctx.beginPath();
        for (let j = 0; j < 1 + Math.floor(f * 4); j++) { const a = j * 1.7; ctx.moveTo(c * s + s / 2, r * s + s / 2); ctx.lineTo(c * s + s / 2 + Math.cos(a) * s * 0.45 * f, r * s + s / 2 + Math.sin(a) * s * 0.45 * f); } ctx.stroke(); } }
    pmark("rooms");
    // the rooms' things, the doorways' frames, a lamp in each room
    for (const R of S.rooms) { if (R.x + R.w < c0 || R.x > c1 || R.y + 5 < r0 || R.y > r1) continue;
      for (const t of R.things) drawThing(t.kind, (R.x + t.at / 10) * s, (R.y + 4) * s, t.w / 10 * s);
      const lx = (R.x + R.w / 2) * s, ly = R.y * s; ctx.strokeStyle = "#333"; ctx.lineWidth = Math.max(1, s / 24); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 0.45 * s); ctx.stroke();
      ctx.fillStyle = "#3a3a3a"; ctx.fillRect(lx - 0.12 * s, ly + 0.45 * s, 0.24 * s, 0.32 * s); ctx.fillStyle = "#fde68a"; ctx.fillRect(lx - 0.08 * s, ly + 0.5 * s, 0.16 * s, 0.22 * s); }
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (fix[at(c, r)] === F_DOOR && fix[at(c, r - 1)] !== F_DOOR) { ctx.fillStyle = "#6b4a2b"; ctx.fillRect(c * s, r * s, s, 0.15 * s); ctx.fillRect(c * s, r * s, 0.12 * s, 3 * s); ctx.fillRect(c * s + s - 0.12 * s, r * s, 0.12 * s, 3 * s); }
    pmark("ladders");
    // ladders, the stair's steps, platforms, the hatch, rope bridges
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const f = fix[at(c, r)]; if (!f) continue; const x = c * s, y = r * s;
      if (f === F_LADDER) { if (ladderTree(c, r)) continue; ctx.fillStyle = "#8b5e34"; ctx.fillRect(x + 0.18 * s, y, 0.1 * s, s); ctx.fillRect(x + 0.72 * s, y, 0.1 * s, s); ctx.fillStyle = "#a0703f"; ctx.fillRect(x + 0.18 * s, y + 0.2 * s, 0.64 * s, 0.09 * s); ctx.fillRect(x + 0.18 * s, y + 0.7 * s, 0.64 * s, 0.09 * s); }
      else if (f === F_PLAT || f === F_HATCH) { ctx.fillStyle = f === F_HATCH ? "#7a4a28" : "#8b5a2b"; ctx.fillRect(x, y, s, 0.2 * s); ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(x + s * 0.48, y, Math.max(1, s / 20), 0.2 * s); }
      else if (f === F_BRIDGE) { const sag = Math.sin(((c % 7) + 0.5) / 7 * Math.PI) * 0.12 * s; ctx.fillStyle = "#a0703f"; ctx.fillRect(x + 0.05 * s, y + sag, 0.9 * s, 0.14 * s); ctx.strokeStyle = "#d8c49a"; ctx.lineWidth = Math.max(1, s / 20); ctx.beginPath(); ctx.moveTo(x, y - 0.6 * s + sag); ctx.lineTo(x + s, y - 0.6 * s + sag); ctx.moveTo(x + 0.5 * s, y - 0.6 * s + sag); ctx.lineTo(x + 0.5 * s, y + sag); ctx.stroke(); } }
    drawTreeLadders(c0, c1, s);
    for (const hs of S.houses) if (hs.x > c0 - 4 && hs.x < c1 + 4) drawHouse(hs, (hs.x + 0.5) * s, hs.row * s);
    drawSquirrels(c0, c1);
    if (S.villagers) for (const v of S.villagers) if (v.x > c0 - 2 && v.x < c1 + 2 && v.y > r0 - 2 && v.y < r1 + 3 && !villagerAway(v)) { if (v.mode === "walk") drawVillagerProfile(v, s, now); else { drawVillager(v, s, now, ctx, v.mode === "busy"); if (v.mode === "busy") drawBusy(v, s, now); } }
    // the village's door on the hill: a porch over the hatch; chimneys with smoke, light shafts' glass domes, air shafts' caps
    for (const v of S.villages) { const x = (v.x0 + 1) * s, y = v.top * s; if (v.x0 < c0 - 4 || v.x0 > c1 + 4) continue;
      ctx.fillStyle = "#8e8a80"; ctx.fillRect(x - 1.3 * s, y - 1.6 * s, 0.25 * s, 1.6 * s); ctx.fillRect(x + 1.05 * s, y - 1.6 * s, 0.25 * s, 1.6 * s);
      ctx.fillStyle = "#b91c1c"; ctx.beginPath(); ctx.moveTo(x - 1.6 * s, y - 1.6 * s); ctx.lineTo(x, y - 2.6 * s); ctx.lineTo(x + 1.6 * s, y - 1.6 * s); ctx.fill();
      ctx.fillStyle = "#fff"; for (const [dx, dy] of [[-0.6, -1.9], [0.4, -2.2], [0.9, -1.8]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, 0.1 * s, 0, 7); ctx.fill(); } }
    for (const d of S.ducts) { if (d.x < c0 - 2 || d.x > c1 + 2) continue; const x = d.x * s, y0 = d.y0 * s;
      if (d.kind === 3) { ctx.fillStyle = "#8b4a3a"; ctx.fillRect(x + 0.2 * s, y0 - 2.2 * s, 0.6 * s, 2.2 * s); ctx.fillStyle = "#6b3a2a"; ctx.fillRect(x + 0.12 * s, y0 - 2.3 * s, 0.76 * s, 0.2 * s); }
      else if (d.kind === 1) { ctx.fillStyle = "rgba(200,235,255,0.85)"; ctx.beginPath(); ctx.arc(x + 0.5 * s, y0, 0.55 * s, Math.PI, 0); ctx.fill(); ctx.strokeStyle = "#555"; ctx.lineWidth = Math.max(1, s / 20); ctx.stroke(); }
      else { ctx.fillStyle = "#6b7280"; ctx.fillRect(x + 0.38 * s, y0 - 0.9 * s, 0.24 * s, 0.9 * s); ctx.beginPath(); ctx.ellipse(x + 0.5 * s, y0 - 0.95 * s, 0.45 * s, 0.18 * s, 0, Math.PI, 0); ctx.fill(); }
      // (through the rooms above its own, the duct as a pipe along the wall; and into its own room, a chimney hood or a beam of light)
      for (const R of S.rooms) if (R !== d.room && d.x >= R.x && d.x < R.x + R.w && R.y < d.y1) { ctx.fillStyle = d.kind === 3 ? "#6b3a2a" : "#7a7a7a"; ctx.fillRect(x + 0.3 * s, R.y * s, 0.4 * s, 4 * s); }
      if (d.kind === 1) { const R = d.room; const gr = ctx.createLinearGradient(0, R.y * s, 0, (R.y + 4) * s); gr.addColorStop(0, "rgba(255,240,180,0.45)"); gr.addColorStop(1, "rgba(255,240,180,0)"); ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(x + 0.2 * s, R.y * s); ctx.lineTo(x + 0.8 * s, R.y * s); ctx.lineTo(x + 1.8 * s, (R.y + 4) * s); ctx.lineTo(x - 0.8 * s, (R.y + 4) * s); ctx.fill(); } }
    for (const sm of S.smoke) { ctx.fillStyle = `rgba(200,200,200,${(0.5 * (1 - sm.life / 200)).toFixed(3)})`; ctx.beginPath(); ctx.arc(sm.x * s, sm.y * s, sm.r * s, 0, 7); ctx.fill(); }
    pmark("lodges");
    // the beavers' lodges (domes of sticks) and dams (logs across the river, up to the water), behind the water
    for (const L of S.lodges) { if (!L.river || L.x > c1 + 8 || L.x + L.w < c0 - 8) continue; drawLodgeCached(L, s); }
    for (const d of S.dams) { const R = d.river; if (!R || R.x > c1 + 2 || R.x + R.w < c0 - 2) continue; ctx.globalAlpha = 0.45;
      for (let k = 0; k < R.w; k++) { const c = R.x + k; for (let rr = R.bed[k] - 1; rr >= R.level - 0.5; rr -= 0.5) { ctx.fillStyle = (k + Math.floor(rr * 2)) % 2 ? "#7a5230" : "#8b6040"; ctx.beginPath(); ctx.roundRect(c * s - 0.05 * s, rr * s, s * 1.1, 0.46 * s, 0.2 * s); ctx.fill(); } }
      ctx.globalAlpha = 1; ctx.strokeStyle = "#5e3d22"; ctx.lineWidth = Math.max(1, s / 10); for (let k = 0; k < R.w * 2; k++) { const x = (R.x + k / 2) * s; ctx.beginPath(); ctx.moveTo(x, (R.level - 0.4) * s); ctx.lineTo(x + 0.3 * s, (R.level - 0.9 - (k % 3) * 0.2) * s); ctx.stroke(); } }
    pmark("plants");
    for (const R of S.rivers) if (R.plants && R.x <= c1 + 2 && R.x + R.w >= c0 - 2) drawRiverUnder(R, s, now);
    if (S.frogs) for (const f of S.frogs) if (f.mode === "swim" && f.x > c0 - 1 && f.x < c1 + 1) drawFrog(f, s, now);
    pmark("creatures");
    // the beavers, the boulders, the diving gear, the gnome, the dirt flying
    for (const B of S.beavers) { const c = Math.floor(B.px), R = riverAt(c + 0.5), y = R ? R.level + 0.35 : landY(Math.max(0, Math.min(WW - 1, c))); B.py = B.py ? B.py + (y - B.py) * 0.25 : y; if (c < c0 - 3 || c > c1 + 3) continue; drawBeaver(B, (B.px + 0.5) * s, B.py * s, !!R); }
    for (const b of S.boulders) { if (b.c < c0 - 1 || b.c > c1 + 1 || b.r < r0 - 1 || b.r > r1 + 1) continue; const sh = b.wob > 0 ? Math.sin(now / 30) * 0.05 * s : 0, x = (b.c + 0.5) * s + sh, y = (b.r + b.oy + 0.5) * s;
      ctx.fillStyle = "#7d7b78"; ctx.beginPath(); ctx.ellipse(x, y + 0.04 * s, 0.47 * s, 0.44 * s, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#a8a5a0"; ctx.beginPath(); ctx.ellipse(x - 0.12 * s, y - 0.12 * s, 0.22 * s, 0.16 * s, -0.4, 0, 7); ctx.fill(); }
    // (0.0.101) the hearts in the gnomes' homes: red, bobbing and beating a little, on a soft pink glow
    for (const hh of S.heartItems || []) { if (hh.taken || hh.x < c0 - 1 || hh.x > c1 + 1 || hh.y < r0 - 1 || hh.y > r1 + 1) continue;
      const x = hh.x * s, y = hh.y * s + Math.sin(now / 350 + hh.x) * 0.07 * s, beat = Math.max(0, Math.sin(now / 160 + hh.x)) ** 6, z = s * (0.3 + 0.04 * beat);
      if (!LINE) { const glow = ctx.createRadialGradient(x, y, 0, x, y, s * 0.9); glow.addColorStop(0, "rgba(255,140,165,0.6)"); glow.addColorStop(1, "rgba(255,140,165,0)"); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, s * 0.9, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(x, y + z * 0.95); ctx.bezierCurveTo(x - z * 1.3, y + z * 0.1, x - z * 1.05, y - z * 1.1, x, y - z * 0.45); ctx.bezierCurveTo(x + z * 1.05, y - z * 1.1, x + z * 1.3, y + z * 0.1, x, y + z * 0.95); ctx.closePath();
      ctx.fillStyle = "#e11d48"; ctx.fill(); ctx.lineWidth = Math.max(1, s / 24); ctx.strokeStyle = "rgba(90,10,30,0.85)"; ctx.stroke();
      if (!LINE) { ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.ellipse(x - z * 0.45, y - z * 0.38, z * 0.2, z * 0.12, -0.6, 0, 7); ctx.fill(); } }
    // (Matthew: "the items themselves need more emph in the game") each thing to be found: on a golden halo, pulsing, sparkles
    // going round it, drawn half again as large, bobbing, a sign over it with its name (and in the dark it glows: the lights,
    // below; off the screen, a pointer at the edge, in hud)
    for (const it of S.items) { if (it.taken) continue; const x = it.x * s, y = it.y * s + Math.sin(now / 300) * 0.08 * s, pulse = 0.75 + 0.25 * Math.sin(now / 260);
      const halo = ctx.createRadialGradient(x, y, 0, x, y, s * 1.3 * pulse); halo.addColorStop(0, "rgba(255,236,150,0.85)"); halo.addColorStop(0.45, "rgba(255,214,90,0.35)"); halo.addColorStop(1, "rgba(255,214,90,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, s * 1.3 * pulse, 0, 7); ctx.fill();
      for (let j = 0; j < 5; j++) { const a = now / 700 + j * 1.2566, rx = x + Math.cos(a) * s * 0.85, ry = y + Math.sin(a) * s * 0.55, z = s * (0.07 + 0.04 * Math.sin(now / 150 + j));
        ctx.fillStyle = "#fff8d0"; ctx.beginPath(); ctx.moveTo(rx, ry - z * 2); ctx.lineTo(rx + z * 0.5, ry - z * 0.5); ctx.lineTo(rx + z * 2, ry); ctx.lineTo(rx + z * 0.5, ry + z * 0.5); ctx.lineTo(rx, ry + z * 2); ctx.lineTo(rx - z * 0.5, ry + z * 0.5); ctx.lineTo(rx - z * 2, ry); ctx.lineTo(rx - z * 0.5, ry - z * 0.5); ctx.closePath(); ctx.fill(); }
      ctx.save(); ctx.translate(x, y); ctx.scale(1.5, 1.5); ctx.strokeStyle = "rgba(40,25,10,0.8)"; ctx.lineWidth = Math.max(1, s / 22);
      if (it.kind === "climb") { ctx.fillStyle = "#7a4a28"; ctx.beginPath(); ctx.roundRect(-0.25 * s, -0.3 * s, 0.5 * s, 0.6 * s, 0.12 * s); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#a0703f"; ctx.fillRect(-0.18 * s, -0.05 * s, 0.36 * s, 0.18 * s);
        ctx.strokeStyle = "#d8c49a"; ctx.lineWidth = Math.max(1, s / 16); ctx.beginPath(); ctx.arc(0.32 * s, 0, 0.16 * s, 0, 7); ctx.stroke(); ctx.strokeStyle = "#9ca3af"; ctx.beginPath(); ctx.moveTo(-0.25 * s, -0.2 * s); ctx.lineTo(-0.38 * s, 0.25 * s); ctx.stroke(); }
      else if (it.kind === "good" || it.kind === "super") pick(ctx, s, it.kind === "super", now);
      else if (it.kind === "carrot") { ctx.rotate(0.35); ctx.fillStyle = "#4d7c0f"; for (const a of [-0.5, -0.15, 0.2, 0.5]) { ctx.save(); ctx.translate(0, -0.18 * s); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -0.2 * s, 0.05 * s, 0.2 * s, 0, 0, 7); ctx.fill(); ctx.restore(); }
        ctx.fillStyle = "#f97316"; ctx.beginPath(); ctx.moveTo(-0.13 * s, -0.2 * s); ctx.quadraticCurveTo(0, -0.26 * s, 0.13 * s, -0.2 * s); ctx.quadraticCurveTo(0.08 * s, 0.1 * s, 0, 0.38 * s); ctx.quadraticCurveTo(-0.08 * s, 0.1 * s, -0.13 * s, -0.2 * s); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(124,45,18,0.6)"; ctx.beginPath(); for (const yy of [-0.08, 0.04, 0.16]) { ctx.moveTo(-0.07 * s, yy * s); ctx.lineTo(0.02 * s, (yy + 0.02) * s); } ctx.stroke(); }
      else { ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.roundRect(-0.18 * s, -0.35 * s, 0.36 * s, 0.7 * s, 0.15 * s); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.roundRect(0.2 * s, -0.3 * s, 0.45 * s, 0.25 * s, 0.1 * s); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(224,242,254,0.7)"; ctx.fillRect(0.26 * s, -0.25 * s, 0.33 * s, 0.13 * s); }
      ctx.restore();
      if (LINE) continue;   // (the booklet's line drawings: the thing, without its label)
      const label = ITEM[it.kind].label, ly = y - s * 1.25 + Math.sin(now / 300) * 0.05 * s;
      ctx.font = `bold ${Math.round(0.36 * s)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(30,20,8,0.72)"; ctx.beginPath(); ctx.roundRect(x - tw / 2 - s * 0.18, ly - s * 0.26, tw + s * 0.36, s * 0.52, s * 0.18); ctx.fill(); ctx.strokeStyle = "#fde68a"; ctx.lineWidth = Math.max(1, s / 24); ctx.stroke();
      ctx.fillStyle = "#fff8d0"; ctx.fillText(label, x, ly); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; }
    const blink = performance.now() - S.hurtAt < 1500 && Math.floor(now / 100) % 2 === 0;
    if (!S.faintAt && !blink && S.ride && S.ride.on) drawRider(g, now);
    else if (!S.faintAt && !blink) {
      const moving = Math.abs(g.vx) > 10 || (g.climb && (S.keys.up || S.keys.down)), d = g.climb && !g.ground ? 0 : g.face > 0 ? 1 : 3;
      const swimPose = g.swim && !g.gear ? { swim: true, stroke: Math.abs(g.vx) > 10, t: now } : g.under ? { swim: true, stroke: true, under: true, t: now } : null;
      // (Matthew: "when the gnome is moving laterally, let's draw them in profile, like mario 3 as inspiration") running,
      // jumping, falling or swimming along, the gnome in profile; standing still or climbing, facing us, as before. (Matthew:
      // "I'm moving laterally but I don't see my profile view", wading along a tunnel he had dug, where the gnome counts as
      // climbing, since it can go any way there) Moving sideways, not pressing up or down, is in profile, climbing or not
      const lateral = (Math.abs(g.vx) > 10 && !(g.climb && (S.keys.up || S.keys.down))) || (!g.climb && !g.ground);
      const lp = ladderPush(gx, g.y / 1000, g.climb);
      // (Matthew: "down on a slope shouldn't dig --- it should do a slide animation that accelerates, like mario 3") sliding:
      // crouched, leaning back against the way it goes, the dust kicked up behind
      const sliding = g.ground && S.keys.down && !S.keys.dig && Math.abs(g.vx) > 60;
      if (sliding) { const dir = Math.sign(g.vx); ctx.save(); ctx.translate((gx + lp) * s, (g.y / 1000) * s); ctx.rotate(-dir * 0.32); ctx.scale(1, 0.8);
        gnomeProfile(ctx, 0, -0.48 * s, s * 0.98, dir, false, true, 0, now, g.gear, null); ctx.restore();
        if (S.frame % 2 === 0) S.parts.push({ x: gx - dir * 0.25, y: g.y / 1000 - 0.05, vx: -dir * (0.01 + 0.03 * rand()), vy: -0.02 - 0.03 * rand(), life: 18 + rand() * 10, col: "#c8b48a" }); }
      else if (lateral) gnomeProfile(ctx, (gx + lp) * s, (g.y / 1000) * s - 0.48 * s, s * 0.98, g.face, Math.abs(g.vx) > 10, g.ground || g.climb, g.vy, now, g.gear, swimPose);
      else gnome(ctx, (gx + lp) * s, (g.y / 1000) * s - 0.48 * s, s * 0.98, d, true, moving, now, g.gear, false, true, !!(S.party && now - S.party.t < 6000 && !swimPose), swimPose);
      if (g.under && !g.gear) { for (let j = 0; j < Math.ceil(g.air / 120); j++) { ctx.strokeStyle = g.air < 150 && Math.floor(now / 150) % 2 ? "#ef4444" : "rgba(220,240,255,0.9)"; ctx.lineWidth = Math.max(1, s / 20); ctx.beginPath(); ctx.arc((gx - 0.5 + j * 0.25) * s, (g.y / 1000 - 1.25 - (j % 2) * 0.12) * s, 0.09 * s, 0, 7); ctx.stroke(); } }
      if (g.swim && !g.under) { ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = Math.max(1, s / 16); const wl = Math.floor((g.y / 1000 - 0.45)) ; const sx = gx * s, sy = (wl) * s;
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sx + sd * (0.45 + (now % 900) / 900 * 0.5) * s, sy, 0.18 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } }
    }
    drawPebbles(true, c0, c1, r0, r1);
    drawTalk(s);
    for (const p of S.parts) { ctx.fillStyle = p.col; ctx.fillRect(p.x * s, p.y * s, s * 0.1, s * 0.1); }
    // (Gnome dig's front layer: the roots that ran through a tunnel still crossing it, as wood, its shadow on the wall behind, its
    // bark, its top lit; the gnome goes behind them)
    if (dugN) drawRootChunks(c0, c1, r0, r1, s, "front");
    pmark("water");
    // the water in the open (rivers, caves, tunnels flooded): over everything in it, so what is under it shows through, bluer
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = at(c, r);
      if (shape[i]) { const nc = shape[i] === 1 ? c - 1 : c + 1, nb = inside(nc, r) ? at(nc, r) : -1, up = r > 0 ? at(c, r - 1) : -1;
        const full = up >= 0 && mat[up] === AIR && wat[up] > 0.5, hgt = full ? 1 : nb >= 0 && mat[nb] === AIR ? Math.min(1, wat[nb]) : 0;
        if (hgt > 0.03) { ctx.save(); ctx.beginPath(); if (shape[i] === 1) { ctx.moveTo(c * s, r * s); ctx.lineTo(c * s + s, r * s); ctx.lineTo(c * s, r * s + s); } else { ctx.moveTo(c * s, r * s); ctx.lineTo(c * s + s, r * s); ctx.lineTo(c * s + s, r * s + s); } ctx.closePath(); ctx.clip();
          ctx.fillStyle = "rgba(40,120,210,0.45)"; ctx.fillRect(c * s, (r + 1 - hgt) * s, s + 0.5, hgt * s + 0.5); ctx.restore(); }
        continue; }
      if (mat[i] !== AIR) continue; const w0 = wat[i]; if (w0 < 0.03) continue;
      const above = r > 0 && mat[at(c, r - 1)] === AIR && wat[at(c, r - 1)] > 0.5, hgt = above ? 1 : Math.min(1, w0);
      if (above) { ctx.fillStyle = "rgba(40,120,210,0.45)"; ctx.fillRect(c * s, r * s, s, s + 0.5); continue; }
      // (the surface: waves, higher and quicker the stronger the wind, running the way it blows; white caps in a strong wind)
      const ww = S.windNow || 0, amp = s * (0.02 + 0.09 * Math.min(1.2, Math.abs(ww))), top = (r + 1 - hgt) * s, ph = now / 380 * (ww >= 0 ? -1 : 1);
      const wy = q => top + amp * Math.sin((c + q) * 1.9 + ph) + amp * 0.4 * Math.sin((c + q) * 4.3 + ph * 1.7);
      ctx.fillStyle = "rgba(40,120,210,0.45)"; ctx.beginPath(); ctx.moveTo(c * s, (r + 1) * s + 0.5); for (let q = 0; q <= 4; q++) ctx.lineTo((c + q / 4) * s + (q === 4 ? 0.5 : 0), wy(q / 4)); ctx.lineTo((c + 1) * s + 0.5, (r + 1) * s + 0.5); ctx.fill();
      ctx.strokeStyle = Math.abs(ww) > 0.8 && Math.sin(c * 2.3 + ph * 0.5) > 0.6 ? "rgba(255,255,255,0.9)" : "rgba(220,240,255,0.6)"; ctx.lineWidth = Math.max(1, s / 16);
      ctx.beginPath(); for (let q = 0; q <= 4; q++) { const xx = (c + q / 4) * s; if (q) ctx.lineTo(xx, wy(q / 4)); else ctx.moveTo(xx, wy(0)); } ctx.stroke(); }
    for (const R of S.rivers) if (R.plants && R.x <= c1 + 2 && R.x + R.w >= c0 - 2) drawRiverOver(R, s, now);
    pmark("wildlife");
    drawWild(s, now, c0, c1, r0, r1);
    // rain, in a shower
    if (S.rain && !LINE) { ctx.strokeStyle = "rgba(200,220,255,0.6)"; ctx.lineWidth = Math.max(1, s / 24); ctx.beginPath(); for (let k = 0; k < 120; k++) { const x = (c0 + ((k * 37.7 + S.frame * 0.3 * (k % 3 + 1)) % (c1 - c0 + 1))) * s, y = (r0 + ((k * 13.3 + S.frame * 0.5) % (r1 - r0 + 1))) * s; const col = Math.floor(x / s); if (col >= 0 && col < WW && y / s < top[col]) { ctx.moveTo(x, y); ctx.lineTo(x + (S.windNow || 0) * 0.45 * s - 0.05 * s, y + 0.5 * s); } } ctx.stroke(); }
    for (const l of S.leaves) { ctx.save(); ctx.translate(l.x * s, l.y * s); ctx.rotate(l.a); ctx.fillStyle = l.col; ctx.beginPath(); ctx.ellipse(0, 0, s * (l.petal ? 0.06 : 0.12), s * (l.petal ? 0.035 : 0.05), 0, 0, 7); ctx.fill(); ctx.restore(); }
    pmark("dark");
    // the dark under the ground: each tile darker the further it is under the sky, lit by the lantern, the lamps and the light
    // shafts; drawn as a tiny picture, a pixel a tile, stretched smooth over the view
    if (!LINE) {
      const lw = c1 - c0 + 3, lh = r1 - r0 + 3, img = darkImg(lw, lh), d = img.data;
      const lights = [{ x: gx, y: gy, r: 6.5 }, ...S.lamps.filter(l => l.x > c0 - 8 && l.x < c1 + 8 && l.y > r0 - 8 && l.y < r1 + 8), ...S.items.filter(it => !it.taken).map(it => ({ x: it.x, y: it.y, r: 3.5 }))];
      for (let j = 0; j < lh; j++) for (let k = 0; k < lw; k++) { const c = c0 - 1 + k, r = r0 - 1 + j; let a = 0;
        if (c >= 0 && c < WW && r >= 0 && r < WH) { const sky = Math.min(top[c], surf0[c]); a = r <= sky ? 0 : Math.min(0.9, (r - sky) / 6);
          if (a > 0) { let L = 0; for (const l of lights) { const dx = c + 0.5 - l.x, dy = r + 0.5 - l.y, q = 1 - Math.sqrt(dx * dx + dy * dy) / l.r; if (q > L) L = q; } a *= 1 - Math.min(1, L * 1.3); } }
        const o = (j * lw + k) * 4; d[o] = 6; d[o + 1] = 4; d[o + 2] = 12; d[o + 3] = Math.round(a * 255); }
      darkCtx.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(darkCv, 0, 0, lw, lh, (c0 - 1) * s, (r0 - 1) * s, lw * s, lh * s);
    }
    pmark("hud");
    // words floating up
    ctx.textAlign = "center"; ctx.font = `bold ${Math.round(0.55 * s)}px sans-serif`;
    for (let k = words.length - 1; k >= 0; k--) { const w = words[k], f = (now - w.at) / 1200; if (f > 1) { words.splice(k, 1); continue; } ctx.globalAlpha = 1 - f; ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 3; ctx.strokeText(w.t, w.x * s, (w.y - f) * s); ctx.fillText(w.t, w.x * s, (w.y - f) * s); ctx.globalAlpha = 1; }
    ctx.restore();
    // (each thing to be found that is off the screen: a pointer at the screen's edge, toward it, its sign and how far)
    if (!LINE) for (const it of S.items) { if (it.taken) continue; const dx = it.x - (camX + VW / 2), dy = it.y - (camY + VH / 2);
      if (Math.abs(dx) < VW / 2 - 0.5 && Math.abs(dy) < VH / 2 - 0.5) continue;
      const k = Math.min((VW / 2 - 1.4) / Math.max(0.001, Math.abs(dx)), (VH / 2 - 1.4) / Math.max(0.001, Math.abs(dy))), px = (VW / 2 + dx * k) * s, py = (VH / 2 + dy * k) * s, a = Math.atan2(dy, dx), pulse = 1 + 0.08 * Math.sin(now / 200);
      ctx.save(); ctx.translate(px, py); ctx.fillStyle = "rgba(30,20,8,0.7)"; ctx.beginPath(); ctx.arc(0, 0, s * 0.62 * pulse, 0, 7); ctx.fill(); ctx.strokeStyle = "#fde68a"; ctx.lineWidth = Math.max(2, s / 14); ctx.stroke();
      ctx.save(); ctx.rotate(a); ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.moveTo(s * 0.95 * pulse, 0); ctx.lineTo(s * 0.62, -s * 0.22); ctx.lineTo(s * 0.62, s * 0.22); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.font = `${Math.round(0.6 * s)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText(ITEM[it.kind].icon, 0, -s * 0.02);
      ctx.font = `bold ${Math.round(0.28 * s)}px sans-serif`; ctx.fillStyle = "#fff8d0"; ctx.fillText(`${Math.round(Math.hypot(it.x - S.g.x / 1000, it.y - S.g.y / 1000))} m`, 0, s * 0.85); ctx.restore(); }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    if (!LINE) { ctx.save(); ctx.translate(-camX * s, -camY * s); drawParty(s, now); ctx.restore(); }   // (in the world, where the gnome is)
    if (!LINE) hud(now);
  }
  const darkCv = document.createElement("canvas"), darkCtx = darkCv.getContext("2d"); let darkData = null;
  function darkImg(w, h) { if (darkCv.width !== w || darkCv.height !== h || !darkData) { darkCv.width = w; darkCv.height = h; darkData = darkCtx.createImageData(w, h); } return darkData; }
  // ---- the words over the picture: the hearts, the gems, how deep or how high, the place; a banner; and the map of the world
  const mapCv = document.createElement("canvas"); mapCv.width = WW; mapCv.height = WH; const mapCtx = mapCv.getContext("2d"); const mapImg = mapCtx.createImageData(WW, WH);
  const map2Cv = document.createElement("canvas"); map2Cv.width = WW * 2; map2Cv.height = WH * 2; const map2Ctx = map2Cv.getContext("2d");
  const MAPCOL = [[0, 0, 0], [122, 74, 36], [160, 99, 74], [194, 163, 107], [200, 135, 90], [91, 95, 102], [207, 202, 184], [138, 133, 136], [156, 143, 128], [139, 90, 43]];
  function minimap() {
    const d = mapImg.data;
    for (let r = 0; r < WH; r++) for (let c = 0; c < WW; c++) { const i = at(c, r), o = i * 4, m = mat[i]; let col;
      if (m === AIR) col = wat[i] > 0.5 ? [50, 110, 200] : r < surf0[c] ? [150, 200, 235] : bg[i] === B_PLASTER || bg[i] === B_WOOD ? [230, 200, 140] : bg[i] === B_STAIR ? [120, 110, 100] : [60, 40, 28];
      else { col = MAPCOL[m]; if (PORES[m] > 0 && wat[i] > 0.6) col = [col[0] * 0.6, col[1] * 0.7, col[2] * 0.6 + 80]; if (gem[i]) col = [[0, 0, 0], [255, 90, 90], [90, 235, 120], [110, 160, 255], [200, 120, 255], [255, 200, 60]][gem[i]]; }
      if (m === AIR && fix[i] && fix[i] !== F_DOOR) col = fix[i] === F_LADDER || fix[i] === F_STAIR ? [196, 150, 95] : [139, 94, 52];   // (ladders, the stair, platforms, bridges, planks)
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
    mapCtx.putImageData(mapImg, 0, 0);
    // (Matthew: "foreground trees and tree houses do not appear in the overview map HUD"; "the overview map should not use ovals
    // for tree pads. Use triangles, if you must"; "arrays of triangles") Over the tiles, on a layer two pixels a tile: each
    // tree's crown as an array of triangles, its pads (a leafy tree's stacked three, two, one, low and wide; a pine's tiers; a
    // willow's dome, its tassels hanging as narrow triangles), its trunk (a felled tree, its stump); each great tree's crown in
    // rows of pads, more over each house, its trunk, limbs and ladder; each tree house, its walls and roof in their colors
    const m = map2Ctx, hex = n => "#" + n.toString(16).padStart(6, "0");
    m.imageSmoothingEnabled = false; m.clearRect(0, 0, map2Cv.width, map2Cv.height); m.drawImage(mapCv, 0, 0, map2Cv.width, map2Cv.height);
    m.save(); m.scale(2, 2);
    const tri = (x0, y0, x1, y1, x2, y2, col) => { m.fillStyle = col; m.beginPath(); m.moveTo(x0, y0); m.lineTo(x1, y1); m.lineTo(x2, y2); m.closePath(); m.fill(); };
    const pad = (x, y, w, h, col) => tri(x - w / 2, y, x + w / 2, y, x, y - h, col);   // (a pad: a low, wide triangle, its base at y)
    const LEAF = { 0: ["#285e2a", "#2f7d32", "#47a047"], 2: ["#5a8f2a", "#6aa832", "#93d04a"], 3: ["#6f9228", "#86a83a", "#c2d86a"], 4: ["#5a7820", "#86a92e", "#bcd75a"] };
    for (const t of S.trees) { const foot = surf0[t.x], cx = t.x + 0.5;
      if (!t.alive) { m.fillStyle = "#6b4a2b"; m.fillRect(t.x + 0.25, foot - 0.5, 0.5, 0.5); continue; }
      const h = t.h * (t.tall ? 1.45 : 1) * t.grow;
      m.fillStyle = t.kind === 2 ? "#e9e4dc" : t.kind === 3 ? "#c9c7b3" : "#6b4a2b"; m.fillRect(cx - 0.25, foot - h * 0.5, 0.5, h * 0.5);
      if (t.kind === 1) { for (let k = 0; k < 4; k++) { const w = h * (0.62 - 0.12 * k), y = foot - h * (0.18 + 0.2 * k); pad(cx, y, w, h * 0.32, ["#1f5f3a", "#245f34", "#2a6b3c", "#357a46"][k]); } continue; }
      const C = LEAF[t.kind] || LEAF[0], hw = h * (t.kind === 4 ? 0.62 : t.kind === 0 ? 0.52 : 0.42), cy = foot - h * 0.58, th = h * 0.2;
      if (t.kind === 4) { for (let j = 0; j < 7; j++) { const x = cx - hw + (j + 0.5) * hw * 2 / 7, y0 = cy - h * 0.05 * Math.cos((j - 3) / 3.5 * 1.4); tri(x - hw / 7, y0, x + hw / 7, y0, x + 0.1, foot - h * (0.06 + 0.08 * (j % 2)), C[j % 2]); } }
      for (let k = 0; k < 3; k++) { const n = 3 - k, w = hw * 2 / 3 * (1.15 - 0.08 * k), y = cy - k * th * 0.85;
        for (let j = 0; j < n; j++) pad(n === 1 ? cx : cx - hw * (1 - 0.33 * k) + w / 2 + j * (hw * 2 * (1 - 0.33 * k) - w) / (n - 1), y, w, th, C[k]); } }
    for (const G of S.greats) { const cx = G.x + 0.5, h = G.h, C = LEAF[0];
      for (let k = 0; k < 4; k++) { const n = 6 - k, w = h * 0.28, y = G.foot - h * (0.72 + 0.11 * k), half = h * (0.5 - 0.08 * k);
        for (let j = 0; j < n; j++) pad(cx - half + w / 2 + j * (half * 2 - w) / (n - 1), y, w, h * 0.12, C[(j + k) % 3]); }
      m.fillStyle = "#6b4a2b"; m.fillRect(G.x - G.half, G.foot - h * 0.78, G.half * 2 + 1, h * 0.78);
      m.strokeStyle = "#6b4a2b"; m.lineWidth = 0.6;
      for (const L of G.limbs) { const ex = cx + L.side * (G.half + L.len), y = G.foot - L.y; m.beginPath(); m.moveTo(cx, y + 1.5); m.lineTo(ex, y + 0.4); m.stroke();
        pad(cx + L.side * (G.half + L.len * 0.55), y - 4.2, 2.6, 1.1, C[1]); pad(cx + L.side * (G.half + L.len * 0.85), y - 4.6, 2.2, 1, C[2]); }
      m.fillStyle = "#d8b07a"; for (let r = G.foot - G.h; r < G.foot; r++) for (let c = G.x - G.half; c <= G.x + G.half; c++) if (inside(c, r) && (fix[at(c, r)] === F_LADDER || fix[at(c, r)] === F_STAIR)) m.fillRect(c, r, 1, 1); }
    for (const hs of S.houses) { if (hs.small) { m.fillStyle = "#c0703a"; m.fillRect(hs.x, hs.row - 1, 0.8, 0.8); continue; }
      const st = S.styles[hs.style % S.styles.length]; if (!st) continue; const x0 = hs.x + 0.5 - 1.9;
      m.fillStyle = hex(st.walls); m.fillRect(x0, hs.row - 2.5, 3.8, 2.5); tri(x0 - 0.4, hs.row - 2.5, x0 + 4.2, hs.row - 2.5, x0 + 1.9, hs.row - 3.8, hex(st.roofc));
      m.fillStyle = "#3a2414"; m.fillRect(x0 + 1.6, hs.row - 1.2, 0.6, 1.2); }
    m.restore();
  }
  // (0.0.95) a digger, as found: a pick, its ash handle bound in leather; the good digger's head iron, the super digger's steel
  // with a gold collar and a diamond point, glinting
  function pick(c, s, sup, now) {
    if (sup) { const gl = c.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 0.7); gl.addColorStop(0, "rgba(186,230,253,0.55)"); gl.addColorStop(1, "rgba(186,230,253,0)"); c.fillStyle = gl; c.beginPath(); c.arc(0, 0, s * 0.7, 0, 7); c.fill(); }
    c.lineCap = "round"; c.strokeStyle = "rgba(40,25,10,0.85)"; c.lineWidth = s * 0.13; c.beginPath(); c.moveTo(-0.3 * s, 0.42 * s); c.lineTo(0.12 * s, -0.26 * s); c.stroke();
    c.strokeStyle = "#b07a45"; c.lineWidth = s * 0.08; c.beginPath(); c.moveTo(-0.3 * s, 0.42 * s); c.lineTo(0.12 * s, -0.26 * s); c.stroke();
    c.strokeStyle = "#5b3a1e"; c.lineWidth = s * 0.03; for (let k = 0; k < 3; k++) { const t = 0.12 + k * 0.06, x = -0.3 * s + 0.42 * s * t, y = 0.42 * s - 0.68 * s * t; c.beginPath(); c.moveTo(x - 0.05 * s, y - 0.02 * s); c.lineTo(x + 0.05 * s, y + 0.03 * s); c.stroke(); }
    const head = new Path2D(); head.moveTo(-0.42 * s, -0.02 * s); head.quadraticCurveTo(0.02 * s, -0.5 * s, 0.5 * s, -0.08 * s); head.quadraticCurveTo(0.06 * s, -0.36 * s, -0.42 * s, -0.02 * s);
    c.fillStyle = sup ? "#cbd5e1" : "#6b7280"; c.fill(head); c.strokeStyle = "rgba(30,30,35,0.9)"; c.lineWidth = Math.max(1, s / 26); c.stroke(head);
    c.strokeStyle = sup ? "rgba(255,255,255,0.8)" : "rgba(220,220,225,0.5)"; c.lineWidth = Math.max(1, s / 40); c.beginPath(); c.moveTo(-0.3 * s, -0.08 * s); c.quadraticCurveTo(0.02 * s, -0.4 * s, 0.38 * s, -0.12 * s); c.stroke();
    c.fillStyle = sup ? "#eab308" : "#4b5563"; c.beginPath(); c.roundRect(0.03 * s, -0.33 * s, 0.14 * s, 0.13 * s, 0.03 * s); c.fill(); c.stroke();
    if (sup) { c.fillStyle = "#a5f3fc"; c.beginPath(); c.moveTo(0.5 * s, -0.08 * s); c.lineTo(0.4 * s, -0.17 * s); c.lineTo(0.36 * s, -0.08 * s); c.closePath(); c.fill(); c.stroke();
      const tw = 0.5 + 0.5 * Math.sin(now / 160); c.fillStyle = `rgba(255,255,255,${(0.4 + 0.6 * tw).toFixed(2)})`; c.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = (i % 2 ? 0.03 : 0.11) * s * (0.6 + 0.4 * tw); const x = 0.44 * s + Math.cos(a) * rr, y = -0.2 * s + Math.sin(a) * rr; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); c.fill(); }
    c.lineCap = "butt";
  }
  // (Matthew: "show the current tile rock/soil description on the current top-left in-game HUD"; "and the moisture level of
  // that cell") the cell the gnome digs, else the ground under its feet, else the air or water it is in: what it is, how it digs
  // with the digger in hand, and how wet it is (its pores, how full of water)
  const ABOUT = ["", "soil: soft and dark, full of roots", "clay: sticky and tight; water stands on it", "sand and gravel: loose; water runs through", "sandstone: gritty and firm",
    "shale: hard, in thin sheets", "limestone: cracked; water seeps down through it", "granite: the hardest stone", "masonry: the gnomes' own walls", "timber: the gnomes' own beams"];
  function cellWords(g) {
    const gc = Math.floor(g.x / 1000), feet = Math.floor((g.y - 1) / 1000);
    let c = gc, r = feet + 1, how = "👣 underfoot";
    if (g.dc >= 0 && inside(g.dc, g.dr) && mat[at(g.dc, g.dr)] !== AIR) { c = g.dc; r = g.dr; how = "⛏️ digging"; }
    else if (!inside(c, r) || mat[at(c, r)] === AIR || boulderAt(c, r)) { r = feet; how = "here"; }
    if (!inside(c, r)) return "";
    const i = at(c, r), m = mat[i], w = wat[i], pct = Math.round(w * 100);
    if (m === AIR) return boulderAt(c, r) ? `${how}: a boulder` : w >= 0.5 ? `${how}: 🌊 water` : `${how}: open air${w > 0.05 ? ", 💧 a trickle of water" : ""}`;
    const bed = m === GRANITE && r >= WH - 4, about = bed ? (r >= WH - 1 ? "bedrock: the floor of the world" : "bedrock: the granite under the world") : ABOUT[m] || NAME[m];
    const d = digSteps(m, r, g.tool), need = d > 0 ? `⛏️ ${d <= 8 ? "easy" : d <= 20 ? "steady" : d <= 40 ? "hard" : "slow going"}, ${(d / 60).toFixed(1)} s`
      : m === MASON || m === TIMBER || r >= WH - 1 ? "⛏️ never dug" : (bed ? !(g.tool >= 2) : !(g.tool >= 1)) ? `⛏️ needs the ${bed ? "super" : "good"} digger` : "⛏️ never dug";
    const wet = PORES[m] === 0 ? "💧 none: water cannot soak in" : `💧 ${w < 0.05 ? "dry" : w < 0.25 ? "damp" : w < 0.5 ? "moist" : w < 0.85 ? "wet" : "soaked"}, ${pct}% full`;
    return `${how}: ${about}  ·  ${need}  ·  ${wet}`;
  }
  function hud(now) {
    const W = cv.width, Hh = cv.height, k = Math.max(1, Math.min(2.2, W / 900)), g = S.g;
    ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "top";
    const pill = (x, y, w, h) => { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10 * k); ctx.fill(); };
    ctx.font = `${Math.round(18 * k)}px sans-serif`;
    const hearts = "❤️".repeat(Math.max(0, S.hearts)) + "🤍".repeat(Math.max(0, 5 - S.hearts));
    const RV = g ? riverAt(g.x / 1000) : null, land = g ? (RV ? RV.natural - 4 : surf0[Math.floor(g.x / 1000)]) : 0, depth = g ? Math.round(g.y / 1000 - land) : 0;
    const where = g && (g.swim || g.under) ? (g.under ? "🫧 under the water" : "🏊 swimming") : depth > 1 ? `🕳️ ${depth} m down` : depth < -2 ? `🌳 ${-depth} m up` : "🌿 on the land";
    const gx = g ? g.x / 1000 : 0, place = (S.places.find(p => gx >= p.x0 && gx <= p.x1 && (!p.under || depth > 3)) || { name: "" }).name;
    const wv = S.windNow || 0, wa = Math.abs(wv), windWord = wa < 0.15 ? "calm" : wa < 0.45 ? "a breeze" : wa < 0.8 ? "windy" : "a gale", arrows = wa < 0.15 ? "" : (wv > 0 ? "→" : "←").repeat(wa < 0.45 ? 1 : wa < 0.8 ? 2 : 3);
    const runWord = BOT.on ? `🏃 ${Math.floor(BOT.frames / 3600)}:${String(Math.floor(BOT.frames / 60) % 60).padStart(2, "0")} · ${BOT.phase} · ${BOT.items + S.items.filter(i => i.taken).length - BOT.items}/${S.items.length} · 🌳 ${BOT.parts}/${BOT.partsAll || "?"} · 💎 ${BOT.gems}/${BOT.gemsAll || "?"}  ` : "";
    const rideBtn = $("ride"), showRide = !!(S.ride && (S.ride.on || nearClover())); if (rideBtn && rideBtn.hidden === showRide) rideBtn.hidden = !showRide;
    const line = `${runWord}${hearts}  💎 ${S.found || 0} / ${S.gemTotal || 0}${S.carrots ? "  🥕 " + S.carrots : ""}${S.ride && S.ride.on ? "  🐇" : ""}  🍃 ${windWord} ${arrows}  ${where}${g && g.gear ? "  🤿" : ""}${g && g.climbPack ? "  🧗" : ""}${g && g.tool ? (g.tool >= 2 ? "  ⚒️" : "  ⛏️") : ""}${place ? "  ·  " + place : ""}`;
    const tw = ctx.measureText(line).width;
    pill(10 * k, 10 * k, tw + 20 * k, 30 * k); ctx.fillStyle = "#fff"; ctx.fillText(line, 20 * k, 15 * k);
    let below = 46 * k;
    // (the cell's words, as many lines as they need to keep clear of the map in the top right corner)
    { const cw = g ? cellWords(g) : ""; if (cw) { ctx.font = `${Math.round(14 * k)}px sans-serif`;
        const room = (S.map ? W - Math.min(W * 0.3, 340 * k) - 10 * k : W) - 40 * k, lines = [];
        for (const part of cw.split("  ·  ")) { const last = lines[lines.length - 1]; if (last && ctx.measureText(last + "  ·  " + part).width <= room) lines[lines.length - 1] = last + "  ·  " + part; else lines.push(part); }
        const w2 = Math.max(...lines.map(l => ctx.measureText(l).width)); pill(10 * k, below, w2 + 20 * k, (6 + 18 * lines.length) * k); ctx.fillStyle = "#f5f5dc";
        lines.forEach((l, j) => ctx.fillText(l, 20 * k, below + (4 + 18 * j) * k)); below += (12 + 18 * lines.length) * k; ctx.font = `${Math.round(18 * k)}px sans-serif`; } }
    if (g && g.under && !g.gear) { const f = g.air / 600; pill(10 * k, below, 160 * k, 16 * k); ctx.fillStyle = f < 0.25 ? "#ef4444" : "#7dd3fc"; ctx.fillRect(14 * k, below + 4 * k, 152 * k * f, 8 * k); }
    if (S.banner && now - S.banner.t < 3500) { const f = Math.min(1, (3500 - (now - S.banner.t)) / 500); ctx.globalAlpha = f; ctx.font = `bold ${Math.round(24 * k)}px sans-serif`; ctx.textAlign = "center";
      const bw = ctx.measureText(S.banner.text).width; pill(W / 2 - bw / 2 - 16 * k, Hh * 0.18, bw + 32 * k, 40 * k); ctx.fillStyle = "#fff"; ctx.fillText(S.banner.text, W / 2, Hh * 0.18 + 8 * k); ctx.globalAlpha = 1; }
    if (S.map && g) {
      if (S.frame - S.minimapAt > 45) { minimap(); S.minimapAt = S.frame; }
      const mw = Math.min(W * 0.3, 340 * k), mh = mw * WH / WW, mx = W - mw - 10 * k, my = 10 * k + (document.documentElement.classList.contains("oracle-fs") ? 40 * k : 0);
      ctx.globalAlpha = 0.88; ctx.imageSmoothingEnabled = true; ctx.drawImage(map2Cv, mx, my, mw, mh); ctx.globalAlpha = 1;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.strokeRect(mx + S.cam.x / WW * mw, my + S.cam.y / WH * mh, VW / WW * mw, VH / WH * mh);
      // (Matthew: "overview map should show placement of all items on map that can be aquired") each thing still to be found,
      // marked where it is: the diving gear 🤿 and the tree-climbing pack 🧗, on a dark spot, big enough to read; the gems are the
      // map's colored flecks, each its own color
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `${Math.round(13 * k)}px sans-serif`;
      for (const it of S.items) { if (it.taken) continue; const ix = mx + it.x / WW * mw, iy = my + it.y / WH * mh;
        ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.arc(ix, iy, 8 * k, 0, 7); ctx.fill(); ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillText(ITEM[it.kind].icon, ix, iy + 0.5 * k); }
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(mx + gx / WW * mw, my + g.y / 1000 / WH * mh, 3 * k, 0, 7); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(mx, my, mw, mh); }
    ctx.restore();
    if (S.frame % 15 === 0) { $("gems").textContent = `💎 ${S.found || 0} / ${S.gemTotal || 0}`; $("gems").title = `this world's gems: found, and all there are (${S.gems} found in all your worlds)`; $("hearts").textContent = hearts; $("where").textContent = place || where; }
  }

  // (Matthew: "it seems like there are performance challenges now with gnome world"; "can we add a FPS HUD please?") The frame's
  // times: frames a second, the frame's time from one to the next, the world's steps in it and its drawing, the worst frame of the
  // last second; and the drawing in parts (pmark: each part's time, smoothed over a second), the three costliest shown. F hides it
  const PERF = { on: true, frames: [], ticks: [], draws: [], parts: {}, last: 0, name: null };
  function pmark(name) { if (PERF.flush) realCtx.getImageData(0, 0, 1, 1);   // (testing: the GPU's work finished before each section is timed)
    const t = performance.now(); if (PERF.name) PERF.parts[PERF.name] = (PERF.parts[PERF.name] || 0) * 0.95 + (t - PERF.last) * 0.05; PERF.name = name; PERF.last = t; }
  function drawPerf() {
    if (!PERF.on || !PERF.frames.length) return; const c = ctx, avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const fr = avg(PERF.frames), fps = 1000 / Math.max(1, fr), worst = Math.max(...PERF.frames), top = Object.entries(PERF.parts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const lines = [`${fps.toFixed(0)} fps · ${fr.toFixed(1)} ms a frame · worst ${worst.toFixed(0)} ms`, `world ${avg(PERF.ticks).toFixed(1)} ms · drawing ${avg(PERF.draws).toFixed(1)} ms`, top.map(([k, v]) => `${k} ${v.toFixed(1)}`).join(" · ")];
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.font = `${Math.round(Math.max(11, cv.height / 60))}px ui-monospace, monospace`; const lh = Math.max(13, cv.height / 50), w = Math.max(...lines.map(l => c.measureText(l).width)) + 16, x = 10, y = cv.height - 10 - lh * lines.length - 8;
    c.fillStyle = "rgba(0,0,0,0.6)"; c.beginPath(); c.roundRect(x, y, w, lh * lines.length + 8, 6); c.fill();
    c.fillStyle = fps >= 55 ? "#9be89b" : fps >= 40 ? "#f2c12e" : "#ff7a6a"; c.textBaseline = "top"; lines.forEach((l, i) => { c.fillText(l, x + 8, y + 4 + i * lh); if (!i) c.fillStyle = "#e8e2d0"; }); c.restore();
  }
  // ---- the loop: a step each sixtieth of a second (several to catch up, at most four a frame), then the picture
  let acc = 0, lastT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (PERF.prevT) { PERF.frames.push(t - PERF.prevT); if (PERF.frames.length > 60) PERF.frames.shift(); } PERF.prevT = t;
    const h = H();
    if (!h || !S.g || document.hidden || S.asking || (P && P.paused())) { lastT = t; timedDraw(); return; }
    acc += Math.min(100, t - (lastT || t)) * 60 / 1000; lastT = t;
    let n = 0; const tt = performance.now();
    try { if (BOT.on) { const tq = performance.now(); while (performance.now() - tq < 12 && BOT.on) { tick(h); n++; } acc = 0; } else while (acc >= 1 && n < 4) { tick(h); acc -= 1; n++; } } catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; drawStatus(); console.error(e); return; }
    if (n >= 4 && !BOT.on) acc = 0;
    PERF.ticks.push(performance.now() - tt); if (PERF.ticks.length > 60) PERF.ticks.shift();
    timedDraw();
  }
  // (a scene in line art: the frame drawn through the line canvas, onto a canvas of its own)
  function lineScene(x, y) { const keep = S.camFix; S.camFix = { x, y }; LINE = true; ctx = lineCtx(realCtx); realCtx.save(); realCtx.setTransform(1, 0, 0, 1, 0, 0); realCtx.fillStyle = "#fff"; realCtx.fillRect(0, 0, cv.width, cv.height); realCtx.restore();
    try { draw(); } finally { LINE = false; ctx = realCtx; S.camFix = keep; } const out = document.createElement("canvas"); out.width = cv.width; out.height = cv.height; out.getContext("2d").drawImage(cv, 0, 0); return out; }
  function timedDraw() { const t0 = performance.now(); PERF.name = null; draw(); pmark(null); PERF.draws.push(performance.now() - t0); if (PERF.draws.length > 60) PERF.draws.shift(); drawPerf(); }
  requestAnimationFrame(frame);

  // ---- the keys and the buttons
  const KEYS = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "up", w: "up", W: "up", z: "up", Z: "up", ArrowDown: "down", s: "down", S: "down", x: "dig", X: "dig" };
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  addEventListener("keydown", e => {
    if (typing(e)) return;
    const k = KEYS[e.key];
    if (k) { if (e.key.startsWith("Arrow")) e.preventDefault(); if (k === "up" && !S.keys.up) S.jumpQueued = true; S.keys[k] = true; }
    else if (e.key === "m" || e.key === "M") toggleMap();
    else if (e.key === "f" || e.key === "F") PERF.on = !PERF.on;
    else if (e.key === "b" || e.key === "B") { e.preventDefault(); buildHere(); }
    else if (e.key === "r" || e.key === "R" || e.key === "e" || e.key === "E") { e.preventDefault(); rideToggle(); }
  });
  addEventListener("keyup", e => { const k = KEYS[e.key]; if (k) S.keys[k] = false; });
  addEventListener("blur", () => { for (const k in S.keys) S.keys[k] = false; });
  for (const b of document.querySelectorAll(".gw-pad button[data-k]")) {
    const k = b.dataset.k;
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("held"); if (k === "up" && !S.keys.up) S.jumpQueued = true; S.keys[k] = true; });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { b.classList.remove("held"); S.keys[k] = false; });
    b.addEventListener("contextmenu", e => e.preventDefault());
  }
  { const b = $("build"); if (b) b.addEventListener("pointerdown", e => { e.preventDefault(); buildHere(); }); }
  { const b = $("ride"); if (b) b.addEventListener("pointerdown", e => { e.preventDefault(); rideToggle(); }); }
  { const b = $("run"); if (b) b.addEventListener("click", () => { BOT.on = !BOT.on; b.setAttribute("aria-pressed", String(BOT.on));
      if (BOT.on) { Object.assign(BOT, { phase: "", queue: [], cur: null, path: [], k: 0, skipped: [], frames: 0, t0: performance.now(), items: 0, parts: 0, partsAll: 0, gems: 0, gemsAll: 0, report: null }); S.banner = { text: "🏃 Speed run: every thing, every part of every big tree, every gem", t: performance.now() }; }
      else for (const k in S.keys) S.keys[k] = false; b.blur(); }); }
  function toggleMap() { S.map = !S.map; keep("map", S.map); $("map").setAttribute("aria-pressed", String(S.map)); }
  $("map").setAttribute("aria-pressed", String(S.map));
  $("map").addEventListener("click", () => { toggleMap(); $("map").blur(); });
  // (0.0.95, Matthew: "let's add a gnome picker") who you play: each button a little picture of its gnome, drawn as the game
  // draws them; the choice kept for the next visit
  function heroPicker() {
    const box = document.getElementById("heroes"); if (!box) return;
    for (const b of box.querySelectorAll("button[data-hero]")) { const who = b.dataset.hero, pc = b.querySelector("canvas");
      if (pc) { const g2 = pc.getContext("2d"); g2.clearRect(0, 0, pc.width, pc.height); gnome(g2, pc.width / 2, pc.height * 0.64, pc.height * 0.46, 2, true, false, 0, false, false, true, false, null, who); }
      b.setAttribute("aria-checked", String(who === S.hero));
      b.onclick = () => { if (!HEROES[who]) return; S.hero = who; keep("hero", who); for (const o of box.querySelectorAll("button[data-hero]")) o.setAttribute("aria-checked", String(o === b));
        S.banner = { text: `You are ${HEROES[who].name.toLowerCase()}`, t: performance.now() }; b.blur(); }; }
  }
  if (!HEROES[S.hero]) S.hero = "dad";
  heroPicker();
  $("new").addEventListener("click", () => { const h = H(); if (!h) return; S.seed = 1 + Math.floor(Math.random() * 100000); keep("seed", S.seed); build(h, S.seed); $("new").blur(); });

  // ---- (0.0.101; Matthew, 2026-11-24: "M wants a save/load feature, so that the game world state is preserved in a file"; "and
  // water state"; "choice of gnome family member as main char"; "position in the game world, and game world state for weather")
  // 💾 Save writes the world as it is to a file: its seed (from which Hazel's plan makes it all again), and all that play has
  // changed since: every tile (dug, built on, a gem taken, a slope cut) with its water, the roots grown, the rivers as high as
  // their dams hold them, the boulders and stones fallen, the trees the beavers felled and the logs cut from them, the beavers,
  // the things found, the hearts taken, what each villager has said, the gnome (who it is, where, its hearts, its gear) and the weather (the wind,
  // its gusts, the rain and when it comes next). 📂 Load makes the world from its seed again, then puts all that back. The birds,
  // frogs, insects and squirrels, the villagers' strolls and the dust and smoke start afresh. The tiles go packed (gzip, then
  // base64) where the browser can pack them: a world's tiles are 0.7 MB as they are.
  const SAVE_KIND = "hazeljs-examples/gnome-world", SAVE_V = 2;   // (2, 0.0.102: the bigger world, Clover, the carrots)
  const TILES = [mat, bg, fix, gem, stone, shape, root, top, wat];
  const bytesOf = A => new Uint8Array(A.buffer, A.byteOffset, A.byteLength);
  const TILE_BYTES = TILES.reduce((n, A) => n + A.byteLength, 0);
  function tileBytes() { const out = new Uint8Array(TILE_BYTES); let o = 0; for (const A of TILES) { out.set(bytesOf(A), o); o += A.byteLength; } return out; }
  function setTileBytes(u8) { let o = 0; for (const A of TILES) { bytesOf(A).set(u8.subarray(o, o + A.byteLength)); o += A.byteLength; } }
  const b64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => { const t = atob(s), u8 = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u8[i] = t.charCodeAt(i); return u8; };
  const squeeze = async (u8, how) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(how)).arrayBuffer());
  const plain = v => v === undefined ? null : JSON.parse(JSON.stringify(v, (k, x) => typeof x === "bigint" ? Number(x) : x));
  // (how many of each thing the plan made: a save fits only a world planned the same)
  const shapeOf = () => ({ rivers: S.rivers.length, trees: S.trees.length, items: S.items.length, hearts: (S.heartItems || []).length, dams: S.dams.length, beavers: S.beavers.length, villagers: S.villagers.length, roots: S.rootPlan.length });
  function snapshot() {
    return { kind: SAVE_KIND, v: SAVE_V, seed: S.seed, hero: S.hero, shape: shapeOf(), frame: S.frame, rand: seedRand, damAt: S.damAt,
      gnome: plain(S.g), hearts: S.hearts, found: S.found || 0, gemTotal: S.gemTotal || 0,
      weather: plain({ wind: S.wind || null, windNow: S.windNow, rain: S.rain, rainAt: S.rainAt, leaves: S.leaves }),
      works: [...S.works], items: S.items.map(it => it.taken ? 1 : 0), heartItems: (S.heartItems || []).map(hh => hh.taken ? 1 : 0),
      trees: S.trees.map(t => plain({ alive: t.alive, grow: t.grow, fallAt: t.fallAt, fallDir: t.fallDir ?? null, regrow: t.regrow })),
      fallen: S.fallen.map(f => ({ tree: S.trees.indexOf(f.t), k: f.k })), piles: plain(S.piles), dams: S.dams.map(d => d.logs),
      beavers: S.beavers.map(B => plain({ b: B.b, px: B.px, py: B.py })), boulders: plain(S.boulders), pebbles: plain(S.pebbles),
      villagers: S.villagers.map(v => ({ n: v.n, nextAt: v.nextAt })), roots: S.rootPlan.flatMap((t, k) => t.done ? [k] : []),
      ride: plain(S.ride), mount: plain(S.mount), carrots: S.carrots || 0,
      tiles: tileBytes() };
  }
  async function saveText(snap) {
    const gz = typeof CompressionStream === "function", packed = gz ? await squeeze(snap.tiles, new CompressionStream("gzip")) : snap.tiles;
    return JSON.stringify({ ...snap, page: "0.0.102", saved: new Date().toISOString(), tiles: { gzip: gz, bytes: snap.tiles.length, data: b64(packed) } });
  }
  async function readSave(text) {
    let d; try { d = JSON.parse(text); } catch (e) { d = null; }
    if (!d || d.kind !== SAVE_KIND || !d.tiles) throw new Error("it is not a Gnome world save");
    if (!(d.v <= SAVE_V)) throw new Error("a newer Gnome world saved it: reload this page for the newest");
    const packed = unb64(d.tiles.data);
    if (d.tiles.gzip && typeof DecompressionStream !== "function") throw new Error("this browser cannot unpack it");
    const raw = d.tiles.gzip ? await squeeze(packed, new DecompressionStream("gzip")) : packed;
    if (raw.length !== d.tiles.bytes || raw.length !== TILE_BYTES) throw new Error("its world is not the size of this one");
    return { ...d, tiles: raw };
  }
  // (the world made again from the save's seed, then all that play changed put back; a save that does not fit, and the world
  // as it was is put back instead)
  function restore(h, d) {
    S.frame = d.frame; S.seed = d.seed; build(h, S.seed);
    const have = shapeOf(); for (const k in d.shape) if (d.shape[k] !== have[k]) throw new Error("its world was planned by other rules (were they edited?)");
    for (const k of d.roots) { const t = S.rootPlan[k]; if (t && !t.done) { t.done = true; if (h.roots && S.built.compiled) rootSet(h, t, false); } }
    setTileBytes(d.tiles);
    seedRand = d.rand; S.damAt = d.damAt;
    const w = d.weather; S.wind = w.wind ? { ...w.wind } : undefined; S.windNow = w.windNow; S.rain = w.rain; S.rainAt = w.rainAt; S.leaves = (w.leaves || []).map(l => ({ ...l }));
    S.g = { ...d.gnome }; S.hearts = d.hearts > 0 ? d.hearts : 5; S.faintAt = 0; S.found = d.found; S.gemTotal = d.gemTotal;
    S.works = new Map(d.works);
    d.items.forEach((t, k) => { S.items[k].taken = !!t; });
    (d.heartItems || []).forEach((t, k) => { S.heartItems[k].taken = !!t; });
    d.trees.forEach(({ fallDir, ...t }, k) => { Object.assign(S.trees[k], t); if (fallDir != null) S.trees[k].fallDir = fallDir; });
    S.fallen = d.fallen.filter(f => S.trees[f.tree]).map(f => { const t = S.trees[f.tree], fl = { x: t.x, t, F: fallenOf(t), k: 0 }; while (fl.k < f.k) cutPiece(fl); return fl; });
    S.piles = d.piles.map(p => ({ ...p }));
    d.dams.forEach((logs, k) => { const dm = S.dams[k]; dm.logs = logs; if (dm.river) setLevel(h, dm.river); });
    d.beavers.forEach((B, k) => Object.assign(S.beavers[k], { b: { ...B.b }, px: B.px, py: B.py }));
    S.boulders = d.boulders.map(b => ({ ...b })); S.pebbles = d.pebbles.map(p => ({ ...p }));
    d.villagers.forEach((v, k) => { S.villagers[k].n = v.n; S.villagers[k].nextAt = v.nextAt; });
    if (d.ride) S.ride = { ...d.ride, safe: d.ride.safe ? { ...d.ride.safe } : null }; if (d.mount) S.mount = { ...d.mount }; S.carrots = d.carrots || 0;
    if (HEROES[d.hero]) { S.hero = d.hero; keep("hero", S.hero); heroPicker(); }
    keep("seed", S.seed);
    rootChunks.clear(); S.minimapAt = -1e9; S.cam.set = false; S.party = null; S.confetti = []; S.talk = null; S.parts = []; S.smoke = [];
  }
  function stopBot() { BOT.on = false; $("run").setAttribute("aria-pressed", "false"); for (const k in S.keys) S.keys[k] = false; }
  const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
  async function saveFile() {
    if (!H() || !S.g) return;
    const snap = snapshot(), name = `gnome-world-${S.seed}-${stamp()}.json`;
    try { const url = URL.createObjectURL(new Blob([await saveText(snap)], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      S.banner = { text: `💾 Saved: ${name}`, t: performance.now() }; }
    catch (e) { S.banner = { text: "💾 Could not save: " + (e && e.message || e), t: performance.now() }; console.error(e); }
  }
  async function loadText(text, name) {
    const h = H(); if (!h || !S.g) throw new Error("the world is not made yet");
    const d = await readSave(text), back = snapshot();
    try { restore(h, d); } catch (e) { restore(h, back); throw e; }
    stopBot(); S.banner = { text: `📂 Loaded ${name || "the saved world"}`, t: performance.now() };
  }
  $("save").addEventListener("click", () => { saveFile(); $("save").blur(); });
  $("load").addEventListener("click", () => { $("load-file").click(); $("load").blur(); });
  $("load-file").addEventListener("change", async e => { const inp = e.target, f = inp.files && inp.files[0]; if (!f) return;
    try { const text = await f.text(); inp.value = ""; await loadText(text, f.name); }
    catch (err) { inp.value = ""; S.banner = { text: "📂 Could not load it: " + (err && err.message || err), t: performance.now() }; console.error(err); } });
  // 🔄 Restart: this world again as it began, from its plan, after asking (Matthew: "let's also have a restart feature, with a
  // popup confirmation"); the world stands still while it asks
  function restartNow(h) { stopBot(); build(h, S.seed); S.banner = { text: "🔄 This world, as it began", t: performance.now() }; }
  function askRestart() {
    const h = H(); if (!h || !S.g || S.asking) return;
    const dlg = $("restart-ask"); for (const k in S.keys) S.keys[k] = false;
    if (!dlg || typeof dlg.showModal !== "function") { if (confirm("Restart this world? Everything dug, built and found in it goes back to how it began.")) restartNow(h); return; }
    S.asking = true; dlg.returnValue = "";
    dlg.addEventListener("close", () => { S.asking = false; if (dlg.returnValue === "yes") restartNow(h); }, { once: true });
    dlg.showModal();
  }
  { const dlg = $("restart-ask"); if (dlg) dlg.addEventListener("keydown", e => e.stopPropagation()); }   // (its keys are its own: not the gnome's, nor the pause's)
  $("restart").addEventListener("click", () => { $("restart").blur(); askRestart(); });
  // (for the test of a save and a load: the state read from the world itself, each part hashed, so that a part a save forgot shows)
  function digest() {
    const fnv = u8 => { let x = 0x811c9dc5; for (let i = 0; i < u8.length; i++) { x ^= u8[i]; x = Math.imul(x, 0x01000193); } return (x >>> 0).toString(16); };
    const arr = A => fnv(bytesOf(A)), js = v => fnv(new TextEncoder().encode(JSON.stringify(plain(v))));
    return { seed: S.seed, hero: S.hero, frame: S.frame, rand: seedRand, damAt: S.damAt, hearts: S.hearts, found: S.found || 0, gemTotal: S.gemTotal,
      ground: arr(mat), back: arr(bg), built: arr(fix), gems: arr(gem), stones: arr(stone), slopes: arr(shape), roots: arr(root), tops: arr(top), water: arr(wat),
      surface: arr(surf0), treeMask: arr(treeMask), gnome: js(S.g), weather: js({ wind: S.wind || null, windNow: S.windNow, rain: S.rain, rainAt: S.rainAt, leaves: S.leaves }),
      rivers: js(S.rivers.map(R => R.level)), dams: js(S.dams.map(d => d.logs)), works: js([...S.works]), things: js(S.items.map(it => [it.kind, it.x, it.y, !!it.taken])), heartItems: js((S.heartItems || []).map(hh => [hh.x, hh.y, !!hh.taken])),
      trees: js(S.trees.map(t => [t.x, t.alive, t.grow, t.fallAt, t.fallDir ?? null, t.regrow])), fallen: js(S.fallen.map(f => [f.x, S.trees.indexOf(f.t), f.k, f.F.trunk, [...f.F.gone]])),
      piles: js(S.piles), beavers: js(S.beavers.map(B => [B.b, B.px, B.py])), boulders: js(S.boulders), pebbles: js(S.pebbles),
      villagers: js(S.villagers.map(v => [v.id, v.n, v.nextAt])), ride: js({ ride: S.ride, mount: S.mount, carrots: S.carrots || 0 }), rootsDone: js(S.rootPlan.map(t => t.done ? 1 : 0)), rootSets: S.rootSets.length + S.threadSets.length };
  }
  addEventListener("resize", () => draw());
  const P = window.HazelPause ? window.HazelPause.make({ into: $("new").parentElement, over: $("world").parentElement,
    onChange: paused => { if (!SND) return; if (paused) SND.stop(); else if (SND.play) SND.play(musicNow()); else SND.tune(0); } }) : null;
  if (SND) {
    const sw = (id, get, set) => { const b = $(id); if (!b) return; b.setAttribute("aria-pressed", String(get()));
      b.addEventListener("click", () => { set(!get()); b.setAttribute("aria-pressed", String(get())); if (get()) SND.gesture(0); b.blur(); }); };
    if (SND.prefer) SND.prefer(MUSIC.land);
    sw("music", () => SND.musicOn, on => { SND.music(on); if (on) { if (SND.play) SND.play(musicNow()); else SND.tune(0); } });
    sw("sfx", () => SND.soundsOn, on => SND.sounds(on));
    if (window.HazelVolume) {
      window.HazelVolume.slider($("music"), { label: "Music volume", get: () => SND.volumeOf("music"), set: v => SND.setVolume("music", v), isOn: () => SND.musicOn });
      window.HazelVolume.slider($("sfx"), { label: "Sounds volume", get: () => SND.volumeOf("sfx"), set: v => SND.setVolume("sfx", v), isOn: () => SND.soundsOn, hear: () => SND.gem() });
    }
    for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => SND.gesture(0), true);
  } else for (const id of ["music", "sfx"]) { const b = $(id); if (b) b.hidden = true; }

  // ---- the rules: Hazel's library (with hazel-jit: the hazeljs branch's build; else npm's 0.0.4), the program built and,
  // where the library can, compiled; then the world made from its plan
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load: check the connection, then reload." : "⏳ Loading Hazel, whose rules plan the world and move the gnome…"; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { const ms = S.stepMs.length ? (S.stepMs.reduce((a, v) => a + v, 0) / S.stepMs.length).toFixed(3) : "…";
      st.className = "status ok"; st.textContent = b.compiled ? `✓ Hazel's rules, compiled by hazel-jit as the page loaded (${(b.ms / 1000).toFixed(1)} s, the hazeljs branch's build): the gnome's step about ${ms} ms.`
        : `✓ Hazel's rules, built by hazeljs ${S.lib === LIB_NPM ? "0.0.4" : ""} in ${(b.ms / 1000).toFixed(1)} s and interpreted${b.reason ? " (not compiled: " + b.reason + ")" : ""}: the gnome's step about ${ms} ms, so the world may go slowly.`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so the world cannot be made: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build");
  }
  setInterval(() => { if (S.built && S.built.ok) drawStatus(); }, 3000);
  let L = null, timer = 0;
  function buildRules() {
    if (!window.Hazel || !L) return;
    const sp = L.spec(PROGRAM, TAIL), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now(); let r, threw = "";
    const jit = typeof window.Hazel.jitProgram === "function" && !Q.has("interpreted");
    try { r = jit ? window.Hazel.jitProgram(sp) : window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!v && typeof v.step === "function" && typeof v.plan === "function" && !(r.errors || []).length, compiled: !!r.compiled, reason: r.reason || "", value: v, errors: r.errors || [], threw, ms: performance.now() - t0 };
    S.stepMs = [];
    if (S.built.ok) { try { build(v, S.seed); } catch (e) { S.built = { ...S.built, ok: false, threw: "making the world: " + String(e && e.message || e) }; console.error(e); } }
    drawStatus();
  }
  function loadLib() {
    drawStatus();
    const want = Q.get("lib") === "npm" ? [LIB_NPM] : [LIB_JIT, LIB_NPM];
    const next = i => { if (i >= want.length) { S.libFailed = true; drawStatus(); return; }
      const s = document.createElement("script"); s.src = want[i]; s.async = true;
      s.onload = () => { S.lib = want[i]; drawStatus(); setTimeout(buildRules, 30); }; s.onerror = () => { s.remove(); next(i + 1); };
      document.head.append(s); };
    next(0);
  }
  try {
    const [pre, ...mods] = await Promise.all([text("rules/preamble.hz"), ...MODULES.map(m => text(`rules/${m}.hz`))]);
    document.querySelector(`pre.hazel[data-program="${PROGRAM}"]:not([data-module])`).textContent = pre;
    MODULES.forEach((m, i) => { document.querySelector(`pre.hazel[data-module="${m}"]`).textContent = mods[i]; });
    window.HazelListingsOptions = { start: "request" };
    await load("../shared/hazel-listings.js?v=0.0.24");
    L = window.HazelListings; L.tail(PROGRAM, TAIL);
    L.onChange(PROGRAM, () => { clearTimeout(timer); timer = setTimeout(buildRules, 350); });
    loadLib();
  } catch (e) {
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });
  // ---- ⚙️ Advanced: this device's speed (600 of the gnome's steps through Hazel)
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Gnome world", built: () => S.built, libAt: () => 0, keysIn: null,
    mode: () => ({ asked: S.built && S.built.compiled ? "compiled" : "interpreted", error: null }),
    about: "600 of the gnome's steps through Hazel, running and jumping",
    work: async say => {
      const h = H(); if (!h || !S.g) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: 600 steps…"); let g = S.g; const t0 = performance.now();
      for (let n = 0; n < 600; n++) g = h.step(g, near(g), { dx: n % 120 < 60 ? 1 : -1, up: n % 40 < 10, down: false, jump: n % 40 === 0 });
      const ms = (performance.now() - t0) / 600;
      return { data: { step: +ms.toFixed(4) }, text: [`a step of the gnome through Hazel: ${ms.toFixed(3)} ms`] };
    },
  });
  if (Q.has("test")) window.WorldTest = { gemFound, gem, spriteCache, SPRITES, birdBody, BIRD, bushSprite, drawSprite, strips, drawRabbit, gnomeProfile, RABBIT_FUR, cellWords, digSteps, ITEM, mat, wat, at, WH, WW, BOT, botPlan, dist, botEnter, botStand, botClimb, profile: gnomeProfile, front: gnome, map: () => { minimap(); return map2Cv; }, look: (x, y) => { S.camFix = x == null ? null : { x, y }; draw(); }, paintHouse, paintSmallHouse, squirrelBody, drawVillager, drawVillagerProfile, drawBusy, S, tick: n => { const h = H(); for (let i = 0; i < n; i++) tick(h); draw(); }, draw, near, code, at, mat, wat, fix, bg, stone, shape, surf0, treeMask, digOut, tile: () => T, drawPebbles, PERF, timedDraw: () => timedDraw(), lineCtx, lineScene, paintTall, leafyTree, drawLodge };
  if (Q.has("test")) Object.assign(window.WorldTest, { snapshot, saveText, readSave, loadText, restartNow: () => restartNow(H()), askRestart, stopBot, digest, bot: on => { if (on !== BOT.on) $("run").click(); return BOT.on; } });
  document.body.classList.add("js");
  draw();
})();
