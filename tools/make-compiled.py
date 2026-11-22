#!/usr/bin/env python3
"""hazeljs-examples: an oracle's Hazel, compiled ahead of time, as <app>/compiled.js (ticket 765, and the Hazel reports'
report 54, "Compiled ahead of time, for older phones"): the I Ching's since 0.0.11, the Tarot's since 0.0.13, astrology's
since 0.0.16 (ticket 768).

hazel-jit (Hazel's prototype compiler to JavaScript, on hazelgrove/hazel's trial/694-view-jit line) compiles the oracle's
program as hazeljs joins it: the preamble, `module Name = { body } in` for each module, then the page's tail (the I
Ching's `(cast = Casting.cast, reading = Reading.reading)`, the Tarot's `(deal = Reading.deal)`, astrology's
`(reading = Reading.reading)`). Tests on hazelgrove/hazel's branches trial/765-iching-aot and trial/768-astrology-aot print
each compiled program to CI's log; this wraps one, with hazel-jit's runtime from the same commit, into one file the page
loads instead of hazeljs (2.8 MB) and its build of the program.

Values cross by the functions' declared types: hazeljs gives and takes a constructor as {tag}, a list as an array and a
labeled tuple as an object; hazel-jit's code has {c}, a chain of {h, t} cells, and an array carrying its labels.

  python3 tools/make-compiled.py --app i-ching --hazel ~/hazel-694-merge --commit a4633af773 --src iching-src.js
  python3 tools/make-compiled.py --app tarot --hazel ~/hazel-694-merge --commit 760ce2cf67 --src tarot-src.js
  python3 tools/make-compiled.py --app astrology --hazel ~/hazel-694-merge --commit COMMIT --branch trial/768-astrology-aot --src astrology-src.js
  python3 tools/make-compiled.py --app checkers --hazel ~/hazel-694-merge --commit COMMIT --branch trial/794-games-aot --src checkers-src.js
"""
import argparse, os, subprocess

ap = argparse.ArgumentParser()
ap.add_argument("--app", default="i-ching", choices=["i-ching", "tarot", "astrology", "checkers", "go", "minesweeper", "mahjong", "solitaire", "pinball", "mahjong-solitaire", "downhill", "bricks", "snake", "trails"])
ap.add_argument("--hazel", required=True, help="a checkout of hazelgrove/hazel with the commit")
ap.add_argument("--commit", required=True, help="the commit whose hazel-jit compiled the program")
ap.add_argument("--branch", default="trial/765-iching-aot", help="the branch whose test printed it")
ap.add_argument("--src", required=True, help="the compiled program, as the test printed it (a function body of $R)")
ap.add_argument("--out", default=None, help="default: <app>/compiled.js")
a = ap.parse_args()
a.out = a.out or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), a.app, "compiled.js")

# ---- each oracle's functions, hazeljs's values in and out (hazeljs: a constructor {tag, value}, a list an array, a labeled
# tuple an object; hazel-jit: {c, v}, {h, t} cells, an array carrying its labels), written from the declared types
ADAPTERS = {
  "i-ching": ("IChingCompiled", """
  const trigram = t => ({ number: int(t.number), name: t.name, image: t.image });
  const hexagram = h => ({ number: int(h.number), name: h.name });
  // cast : (Method, Float, Float, Float) -> Cast, a Cast being (line = Line, value = Int, counts = [Int])
  const cast = (m, a, b, c) => {
    const r = P.cast([{ c: m.tag }, a, b, c]);
    return { line: { tag: r.line.c }, value: int(r.value), counts: array(r.counts).map(int) };
  };
  // reading : [Line] -> Reading
  const reading = ls => {
    const r = P.reading(list(ls.map(l => ({ c: l.tag }))));
    return { cast: int(r.cast), lower: trigram(r.lower), upper: trigram(r.upper), primary: hexagram(r.primary),
             changing: array(r.changing).map(int), relating: hexagram(r.relating) };
  };
  const api = { cast, reading, made };"""),
  "tarot": ("TarotCompiled", """
  // Spread = + One + Three(Trio) + CelticCross + Relationship + Choice(Int) + YearAhead(Year), Year = (start = Int, theme = Bool)
  const spread = s => s.tag === "Three" ? { c: "Three", v: { c: s.value.tag } }
    : s.tag === "Choice" ? { c: "Choice", v: s.value }
    : s.tag === "YearAhead" ? { c: "YearAhead", v: $R.tup([s.value.start, s.value.theme], ["start", "theme"]) }
    : { c: s.tag };
  // Card = + Major(Int) + Minor(Suit, Int)
  const card = c => c.c === "Major" ? { tag: "Major", value: int(c.v) } : { tag: "Minor", value: [{ tag: c.v[0].c }, int(c.v[1])] };
  // deal : (Spread, [Float], Bool) -> [Dealt], a Dealt being (card = Card, name = String, reversed = Bool, position = String, about = String)
  const deal = (s, us, reversals) => array(P.deal([spread(s), list(us), reversals]))
    .map(d => ({ card: card(d.card), name: d.name, reversed: d.reversed, position: d.position, about: d.about }));
  const api = { deal, made };"""),
  "astrology": ("AstrologyCompiled", """
  // in: Moment = (year = Int, month = Int, day = Int, hour = Float), Site = (latitude = Float, longitude = Float)
  const moment = m => $R.tup([m.year, m.month, m.day, m.hour], ["year", "month", "day", "hour"]);
  const site = s => $R.tup([s.latitude, s.longitude], ["latitude", "longitude"]);
  // out: Body, Kind, Sign and Element are constructors without payloads
  const tag = c => ({ tag: c.c });
  const place = p => ({ body: tag(p.body), longitude: p.longitude });
  const aspect = a => ({ a: tag(a.a), b: tag(a.b), kind: tag(a.kind), orb: a.orb });
  const note = n => ({ head: n.head, text: n.text });
  const mark = m => ({ body: tag(m.body), x: m.x, y: m.y, ring: int(m.ring) });
  const line = l => ({ x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, kind: tag(l.kind) });
  const signMark = s => ({ sign: tag(s.sign), element: tag(s.element), x: s.x, y: s.y });
  const chart = c => ({ ascendant: c.ascendant, midheaven: c.midheaven, houses: array(c.houses) });
  const wheel = w => ({ marks: array(w.marks).map(mark), lines: array(w.lines).map(line), signs: array(w.signs).map(signMark),
                        cusps: array(w.cusps).map(line), axes: array(w.axes).map(line) });
  // reading : (Moment, Site, Moment) -> Reading, Reading = (natal = [Place], chart = Chart, aspects = [Aspect], today = [Place],
  //   transits = [Aspect], notes = [Note], today_notes = [Note], wheel = Wheel)
  const reading = (birth, at, today) => {
    const r = P.reading([moment(birth), site(at), moment(today)]);
    return { natal: array(r.natal).map(place), chart: chart(r.chart), aspects: array(r.aspects).map(aspect),
             today: array(r.today).map(place), transits: array(r.transits).map(aspect), notes: array(r.notes).map(note),
             today_notes: array(r.today_notes).map(note), wheel: wheel(r.wheel) };
  };
  const api = { reading, made };"""),
  "checkers": ("CheckersCompiled", """
  // (ticket 794, the games compiled as the oracles are) Game = (black = Int, white = Int, kings = Int, turn = Int, quiet = Int,
  // over = Bool, winner = Int, last = [Int]), Move = (from = Int, path = [Int], took = [Int])
  const G = ["black", "white", "kings", "turn", "quiet", "over", "winner", "last"], M = ["from", "path", "took"];
  const gameIn = g => $R.tup([g.black, g.white, g.kings, g.turn, g.quiet, g.over, g.winner, list(g.last)], G);
  const gameOut = r => ({ black: int(r.black), white: int(r.white), kings: int(r.kings), turn: int(r.turn), quiet: int(r.quiet),
                          over: r.over, winner: int(r.winner), last: array(r.last).map(int) });
  const moveIn = m => $R.tup([m.from, list(m.path), list(m.took)], M);
  const moveOut = r => ({ from: int(r.from), path: array(r.path).map(int), took: array(r.took).map(int) });
  // start : Game; moves : Game -> [Move]; apply : (Game, Move) -> Game; choose : (Game, Int, [Int]) -> Move
  const start = gameOut(P.start);
  const moves = g => array(P.moves(gameIn(g))).map(moveOut);
  const apply = (g, m) => gameOut(P.apply([gameIn(g), moveIn(m)]));
  const choose = (g, depth, rs) => moveOut(P.choose([gameIn(g), depth, list(rs || [])]));
  const api = { start, moves, apply, choose, made };"""),
  "go": ("GoCompiled", """
  // (ticket 794) Game = (size = Int, board = [[Int]], turn = Int, ko = Int, passes = Int, black_took = Int, white_took = Int,
  // last = Int, over = Bool), Score = (black = Int, white = Int, komi = Int, owners = [Int])
  const G = ["size", "board", "turn", "ko", "passes", "black_took", "white_took", "last", "over"];
  const gameIn = g => $R.tup([g.size, list(g.board.map(list)), g.turn, g.ko, g.passes, g.black_took, g.white_took, g.last, g.over], G);
  const gameOut = r => ({ size: int(r.size), board: array(r.board).map(row => array(row).map(int)), turn: int(r.turn), ko: int(r.ko),
                          passes: int(r.passes), black_took: int(r.black_took), white_took: int(r.white_took), last: int(r.last), over: r.over });
  // fresh : Int -> Game; play : (Game, Int) -> Game; pass : Game -> Game; score : Game -> Score; choose : (Game, [Int]) -> Int
  const fresh = n => gameOut(P.fresh(n));
  const play = (g, p) => gameOut(P.play([gameIn(g), p]));
  const pass = g => gameOut(P.pass(gameIn(g)));
  const score = g => { const r = P.score(gameIn(g)); return { black: int(r.black), white: int(r.white), komi: int(r.komi), owners: array(r.owners).map(int) }; };
  const choose = (g, rs) => int(P.choose([gameIn(g), list(rs || [])]));
  const api = { fresh, play, pass, score, choose, made };"""),
  "minesweeper": ("MinesweeperCompiled", """
  // (ticket 794) Cell = (mine = Bool, near = Int, open = Bool, flag = Bool), Game = (rows = Int, cols = Int, mines = Int,
  // grid = [[Cell]], left = Int, over = Bool, won = Bool, boom = Int)
  const CL = ["mine", "near", "open", "flag"], G = ["rows", "cols", "mines", "grid", "left", "over", "won", "boom"];
  const cellIn = c => $R.tup([c.mine, c.near, c.open, c.flag], CL);
  const cellOut = r => ({ mine: r.mine, near: int(r.near), open: r.open, flag: r.flag });
  const gameIn = g => $R.tup([g.rows, g.cols, g.mines, list(g.grid.map(row => list(row.map(cellIn)))), g.left, g.over, g.won, g.boom], G);
  const gameOut = r => ({ rows: int(r.rows), cols: int(r.cols), mines: int(r.mines), grid: array(r.grid).map(row => array(row).map(cellOut)),
                          left: int(r.left), over: r.over, won: r.won, boom: int(r.boom) });
  // fresh : (Int, Int, Int) -> Game; lay : (Int, Int, Int, [Float], Int, Int) -> Game; reveal, flag, chord : (Game, Int, Int)
  // -> Game; flags : Game -> Int; sure : Game -> (kind = Int, at = Int, why = Int); pick : Game -> (at = Int, risk = Int)
  const fresh = (rows, cols, mines) => gameOut(P.fresh([rows, cols, mines]));
  const lay = (rows, cols, mines, us, r0, c0) => gameOut(P.lay([rows, cols, mines, list(us), r0, c0]));
  const reveal = (g, r, c) => gameOut(P.reveal([gameIn(g), r, c]));
  const flag = (g, r, c) => gameOut(P.flag([gameIn(g), r, c]));
  const chord = (g, r, c) => gameOut(P.chord([gameIn(g), r, c]));
  const flags = g => int(P.flags(gameIn(g)));
  const sure = g => { const r = P.sure(gameIn(g)); return { kind: int(r.kind), at: int(r.at), why: int(r.why) }; };
  // (ticket 809) pick : Game -> (at = Int, risk = Int): the closed cell least likely to be a mine, its chance in thousandths
  const pick = g => { const r = P.pick(gameIn(g)); return { at: int(r.at), risk: int(r.risk) }; };
  const api = { fresh, lay, reveal, flag, chord, flags, sure, pick, made };"""),
  "mahjong": ("MahjongCompiled", """
  // (ticket 794) Meld = (kind = Int, tile = Int, shown = Bool), Seat = (hand = [Int], melds = [Meld], river = [Int], points = Int),
  // Item = (code = Int, faan = Int), Event = (who = Int, what = Int, tile = Int), Game = (wall = [Int], seats = [Seat],
  // turn = Int, phase = Int, tile = Int, from = Int, drawn = Int, dealer = Int, wind = Int, hand_no = Int, winner = Int,
  // items = [Item], pays = [Int], events = [Event]), Act = (kind = Int, tile = Int), Opts = (discard = Bool, win = Bool,
  // kongs = [Int], pung = Bool, kong = Bool, chows = [Int])
  const ints = l => array(l).map(int);
  const ML = ["kind", "tile", "shown"], SL = ["hand", "melds", "river", "points"], IL = ["code", "faan"], EL = ["who", "what", "tile"];
  const G = ["wall", "seats", "turn", "phase", "tile", "from", "drawn", "dealer", "wind", "hand_no", "winner", "items", "pays", "events"];
  const seatIn = s => $R.tup([list(s.hand), list(s.melds.map(m => $R.tup([m.kind, m.tile, m.shown], ML))), list(s.river), s.points], SL);
  const seatOut = r => ({ hand: ints(r.hand), melds: array(r.melds).map(m => ({ kind: int(m.kind), tile: int(m.tile), shown: m.shown })),
                          river: ints(r.river), points: int(r.points) });
  const gameIn = g => $R.tup([list(g.wall), list(g.seats.map(seatIn)), g.turn, g.phase, g.tile, g.from, g.drawn, g.dealer, g.wind,
    g.hand_no, g.winner, list(g.items.map(i => $R.tup([i.code, i.faan], IL))), list(g.pays),
    list(g.events.map(e => $R.tup([e.who, e.what, e.tile], EL)))], G);
  const gameOut = r => ({ wall: ints(r.wall), seats: array(r.seats).map(seatOut), turn: int(r.turn), phase: int(r.phase),
    tile: int(r.tile), from: int(r.from), drawn: int(r.drawn), dealer: int(r.dealer), wind: int(r.wind), hand_no: int(r.hand_no),
    winner: int(r.winner), items: array(r.items).map(i => ({ code: int(i.code), faan: int(i.faan) })), pays: ints(r.pays),
    events: array(r.events).map(e => ({ who: int(e.who), what: int(e.what), tile: int(e.tile) })) });
  const actIn = a => $R.tup([a.kind, a.tile], ["kind", "tile"]);
  // start : [Int] -> Game; step : (Game, Act) -> Game; options : Game -> Opts; next_hand : (Game, [Int]) -> Game
  const start = rs => gameOut(P.start(list(rs)));
  const step = (g, a) => gameOut(P.step([gameIn(g), actIn(a)]));
  const options = g => { const r = P.options(gameIn(g));
    return { discard: r.discard, win: r.win, kongs: ints(r.kongs), pung: r.pung, kong: r.kong, chows: ints(r.chows) }; };
  const next_hand = (g, rs) => gameOut(P.next_hand([gameIn(g), list(rs)]));
  const api = { start, step, options, next_hand, made };"""),
  "solitaire": ("SolitaireCompiled", """
  // (ticket 794) Suit = + Spades + Hearts + Diamonds + Clubs, Card = (suit = Suit, rank = Int), Pile = (down = [Card],
  // up = [Card]), Game = (stock = [Card], waste = [Card], foundations = [[Card]], piles = [Pile], draw = Int),
  // Run = (pile = Int, count = Int), From = + FromWaste + FromPile(Run) + FromFoundation(Int), To = + ToPile(Int) + ToFoundation,
  // Step = (from = From, to = To), Move = + Draw + Redeal + Shift(Step)
  const cardIn = k => $R.tup([{ c: k.suit.tag }, k.rank], ["suit", "rank"]);
  const cardOut = r => ({ suit: { tag: r.suit.c }, rank: int(r.rank) });
  const cards = l => array(l).map(cardOut), cardsIn = ks => list(ks.map(cardIn));
  const G = ["stock", "waste", "foundations", "piles", "draw"];
  const gameIn = g => $R.tup([cardsIn(g.stock), cardsIn(g.waste), list(g.foundations.map(cardsIn)),
    list(g.piles.map(p => $R.tup([cardsIn(p.down), cardsIn(p.up)], ["down", "up"]))), g.draw], G);
  const gameOut = r => ({ stock: cards(r.stock), waste: cards(r.waste), foundations: array(r.foundations).map(cards),
    piles: array(r.piles).map(p => ({ down: cards(p.down), up: cards(p.up) })), draw: int(r.draw) });
  const fromIn = f => f.tag === "FromPile" ? { c: "FromPile", v: $R.tup([f.value.pile, f.value.count], ["pile", "count"]) }
    : f.tag === "FromFoundation" ? { c: "FromFoundation", v: f.value } : { c: f.tag };
  const fromOut = r => r.c === "FromPile" ? { tag: "FromPile", value: { pile: int(r.v.pile), count: int(r.v.count) } }
    : r.c === "FromFoundation" ? { tag: "FromFoundation", value: int(r.v) } : { tag: r.c };
  const toIn = t => t.tag === "ToPile" ? { c: "ToPile", v: t.value } : { c: t.tag };
  const toOut = r => r.c === "ToPile" ? { tag: "ToPile", value: int(r.v) } : { tag: r.c };
  const moveIn = m => m.tag === "Shift" ? { c: "Shift", v: $R.tup([fromIn(m.value.from), toIn(m.value.to)], ["from", "to"]) } : { c: m.tag };
  const moveOut = r => r.c === "Shift" ? { tag: "Shift", value: { from: fromOut(r.v.from), to: toOut(r.v.to) } } : { tag: r.c };
  // deal : ([Float], Int) -> Game; moves : Game -> [Move]; moves_from : (Game, From) -> [Move]; apply : (Game, Move) -> Game;
  // won : Game -> Bool
  const deal = (us, draw) => gameOut(P.deal([list(us), draw]));
  const moves = g => array(P.moves(gameIn(g))).map(moveOut);
  const moves_from = (g, f) => array(P.moves_from([gameIn(g), fromIn(f)])).map(moveOut);
  const apply = (g, m) => gameOut(P.apply([gameIn(g), moveIn(m)]));
  const won = g => P.won(gameIn(g));
  const api = { deal, moves, moves_from, apply, won, made };"""),
  "pinball": ("PinballCompiled", """
  // (ticket 793; round two, ticket 805) Game = (x = Int, y = Int, vx = Int, vy = Int, flips = [Int], score = Int, balls = Int,
  // over = Bool, hits = [Int], warp = Int, gate = Int, save = Int, t = Int, lv = Int); Board = (name, bg, ink, glow, pattern = String,
  // walls = [Wall], bumpers = [Bumper], tracks = [Track], flippers = [Flipper], portals = [Portal], lights = [Light], sx = Int, sy = Int, svx = Int, svy = Int,
  // gravity = Int), its pieces records of Ints
  const ints = l => array(l).map(int);
  const G = ["x", "y", "vx", "vy", "flips", "score", "balls", "over", "hits", "warp", "gate", "save", "t", "lv"];
  const gameIn = g => $R.tup([g.x, g.y, g.vx, g.vy, list(g.flips), g.score, g.balls, g.over, list(g.hits), g.warp, g.gate, g.save, g.t, g.lv], G);
  const gameOut = r => ({ x: int(r.x), y: int(r.y), vx: int(r.vx), vy: int(r.vy), flips: ints(r.flips), score: int(r.score),
                          balls: int(r.balls), over: r.over, hits: ints(r.hits), warp: int(r.warp), gate: int(r.gate), save: int(r.save), t: int(r.t), lv: int(r.lv) });
  const rec = (r, ks) => Object.fromEntries(ks.map(k => [k, int(r[k])]));
  const boardOut = r => ({ name: r.name, bg: r.bg, ink: r.ink, glow: r.glow, pattern: r.pattern,
    walls: array(r.walls).map(w => rec(w, ["ax", "ay", "bx", "by", "bounce", "kick", "level"])), bumpers: array(r.bumpers).map(b => rec(b, ["x", "y", "r", "points", "track", "phase", "level"])), tracks: array(r.tracks).map(t => rec(t, ["cx", "cy", "rx", "ry", "period"])),
    flippers: array(r.flippers).map(f => rec(f, ["x", "y", "len", "side", "level"])),
    portals: array(r.portals).map(q => ({ ...rec(q, ["x", "y", "r", "tx", "ty", "from", "to", "kind", "need", "hold", "ex", "ey"]), path: ints(q.path) })), lights: array(r.lights).map(l => rec(l, ["x", "y", "group", "level"])), glass: ints(r.glass),
    sx: int(r.sx), sy: int(r.sy), svx: int(r.svx), svy: int(r.svy), gravity: int(r.gravity) });
  // board : Int -> Board; start : Int -> Game; step : (Int, Game, Bool, Bool, Int) -> Game (the board, the game, the left and
  // right flippers held, the plunger's launch 0 to 100)
  const board = i => boardOut(P.board(i));
  const start = i => gameOut(P.start(i));
  const step = (i, g, left, right, launch) => gameOut(P.step([i, gameIn(g), left, right, launch]));
  const api = { board, start, step, made };"""),
  "mahjong-solitaire": ("MahjongSolitaireCompiled", """
  // (ticket 803) Game = (layout = Int, slots = [Slot], near = [Near], plan = [Pair]); Slot = (face, up, lf, rt = Int); Near = (above, below,
  // left, right = [Int]); Pair = (a, b = Int); Place = (x, y, z = Int). A game out keeps hazel-jit's own value beside the
  // page's (its $raw, not enumerable), so a game going back in is not built again
  const ints = l => array(l).map(int);
  const slotOut = s => ({ face: int(s.face), up: int(s.up), lf: int(s.lf), rt: int(s.rt) });
  const nearOut = n => ({ above: ints(n.above), below: ints(n.below), left: ints(n.left), right: ints(n.right) });
  const pairOut = p => ({ a: int(p.a), b: int(p.b) });
  const gameOut = r => { const g = { layout: int(r.layout), slots: array(r.slots).map(slotOut), near: array(r.near).map(nearOut), plan: array(r.plan).map(pairOut) }; Object.defineProperty(g, "$raw", { value: r }); return g; };
  const gameIn = g => g.$raw || $R.tup([g.layout, list(g.slots.map(s => $R.tup([s.face, s.up, s.lf, s.rt], ["face", "up", "lf", "rt"]))),
    list(g.near.map(n => $R.tup([list(n.above), list(n.below), list(n.left), list(n.right)], ["above", "below", "left", "right"]))),
    list(g.plan.map(p => $R.tup([p.a, p.b], ["a", "b"])))], ["layout", "slots", "near", "plan"]);
  // deal : (Int, Int) -> Game (the layout, a seed); take : (Game, Int, Int) -> Game; frees, pairs, best : Game -> ...;
  // shuffle : (Game, Int) -> Game; places : Int -> [Place]; won : Game -> Bool
  const deal = (k, seed) => gameOut(P.deal([k, seed]));
  const take = (g, a, b) => gameOut(P.take([gameIn(g), a, b]));
  const frees = g => ints(P.frees(gameIn(g)));
  const pairs = g => array(P.pairs(gameIn(g))).map(pairOut);
  const best = g => pairOut(P.best(gameIn(g)));
  const shuffle = (g, seed) => gameOut(P.shuffle([gameIn(g), seed]));
  const places = k => array(P.places(k)).map(q => ({ x: int(q.x), y: int(q.y), z: int(q.z) }));
  const won = g => P.won(gameIn(g));
  const api = { deal, take, frees, pairs, best, shuffle, places, won, made };"""),
  "downhill": ("DownhillCompiled", """
  // (ticket 823) Run = (x, y, speed, heading, air, rise, down, score, gates, jumps, bx, by, br = Int, rolling, over = Bool, hit, seed,
  // t = Int, chase = Bool); Thing = (kind, x, y, w = Int); Choice = (turn = Int, tuck = Bool)
  const RUN = ["x", "y", "speed", "heading", "air", "rise", "down", "score", "gates", "jumps", "bx", "by", "br", "rolling", "over", "hit", "seed", "t", "chase"];
  const FLAGS = new Set(["rolling", "over", "chase"]);
  const runIn = g => $R.tup(RUN.map(k => g[k]), RUN);
  const runOut = r => Object.fromEntries(RUN.map(k => [k, FLAGS.has(k) ? r[k] : int(r[k])]));
  // start : (Int, Bool) -> Run (a seed, whether a snowball comes); step : (Run, Int, Bool) -> Run (a turn, -1, 0 or 1, and
  // crouching); course : (Int, Int) -> [Thing] (a seed, a stretch); robot : Run -> Choice
  const start = (seed, chase) => runOut(P.start([seed, chase]));
  const step = (g, turn, tuck) => runOut(P.step([runIn(g), turn, tuck]));
  const course = (seed, k) => array(P.course([seed, k])).map(t => ({ kind: int(t.kind), x: int(t.x), y: int(t.y), w: int(t.w) }));
  const robot = g => { const c = P.robot(runIn(g)); return { turn: int(c.turn), tuck: c.tuck }; };
  const api = { start, step, course, robot, made };"""),
  "bricks": ("BricksCompiled", """
  // (ticket 824) Game = (bx, by, vx, vy, px, pw = Int, bricks = [Int], balls, score, level = Int, held, over = Bool, hit, t = Int);
  // Choice = (target = Int, launch = Bool)
  const GAME = ["bx", "by", "vx", "vy", "px", "pw", "bricks", "balls", "score", "level", "held", "over", "hit", "t"];
  const gameIn = g => $R.tup(GAME.map(k => k === "bricks" ? list(g.bricks) : g[k]), GAME);
  const gameOut = r => Object.fromEntries(GAME.map(k => [k, k === "bricks" ? array(r.bricks).map(int) : k === "held" || k === "over" ? r[k] : int(r[k])]));
  // start : (Int, Bool) -> Game (a level, a wide paddle); step : (Game, Int, Bool) -> Game (where the paddle goes, a launch);
  // layout : Int -> [Int]; robot : Game -> Choice
  const start = (l, wide) => gameOut(P.start([l, wide]));
  const step = (g, target, launch) => gameOut(P.step([gameIn(g), target, launch]));
  const layout = l => array(P.layout(l)).map(int);
  const robot = g => { const c = P.robot(gameIn(g)); return { target: int(c.target), launch: c.launch }; };
  const api = { start, step, layout, robot, made };"""),
}
GLOBAL, ADAPT = ADAPTERS[a.app]
TITLE = {"i-ching": "the I Ching", "tarot": "the Tarot", "astrology": "astrology", "checkers": "Checkers", "go": "Go", "minesweeper": "Minesweeper", "mahjong": "Mahjong", "solitaire": "Solitaire", "pinball": "Pinball", "mahjong-solitaire": "Mahjong solitaire", "downhill": "Downhill", "bricks": "Bricks", "snake": "Snake", "trails": "Light trails"}[a.app]
TICKET = {"i-ching": "765", "tarot": "765", "astrology": "768", "checkers": "794", "go": "794", "minesweeper": "794", "mahjong": "794", "solitaire": "794", "pinball": "793", "mahjong-solitaire": "803", "downhill": "823", "bricks": "824", "snake": "825", "trails": "826"}[a.app]

jit = subprocess.run(["git", "-C", a.hazel, "show", f"{a.commit}:src/language/dynamics/HazelJit.re"], capture_output=True, text=True, check=True).stdout
i = jit.index("let source = {|") + len("let source = {|")
runtime = jit[i:jit.index("|};", i)]
src = open(a.src).read().strip()
assert "HAZEL-JIT" not in src and src, "the compiled program, between the markers only"

out = f"""// hazeljs-examples, {TITLE}: its Hazel (rules/*.hz), compiled ahead of time to JavaScript by hazel-jit at
// hazelgrove/hazel {a.commit} ({a.branch}), wrapped by tools/make-compiled.py. Made, not written: do not edit.
// (ticket {TICKET}) The page runs its rules through this file instead of loading hazeljs and building the program, unless asked
// for interpreted (?interpreted=1) or the rules are edited. The same answers are checked by node/compare-compiled.mjs.
(() => {{
  "use strict";
  const $R = ({runtime});
  const P = (function ($R) {{
{src}
  }})($R);
  // ---- values across: hazeljs's shapes in and out, hazel-jit's inside
  const list = xs => {{ let r = null; for (let i = xs.length - 1; i >= 0; i--) r = {{ h: xs[i], t: r }}; return r; }};
  const array = l => {{ const out = []; for (let p = l; p !== null; p = p.t) out.push(p.h); return out; }};
  const int = n => Number(n);
  const made = "{a.commit}";{ADAPT}
  // (ticket 797) a game's converters, for node/three-way.mjs to time the page boundary by itself
  try {{ api.$convert = {{ gameIn, gameOut }}; }} catch (e) {{ /* an oracle: no game crosses */ }}
  if (typeof window !== "undefined") window.{GLOBAL} = api;
  if (typeof module !== "undefined") module.exports = api;
}})();
"""
open(a.out, "w").write(out)
print(f"wrote {a.out}: {len(out) // 1024} kB, from {a.commit}")
