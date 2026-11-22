// hazeljs-examples, Light trails in Node (ticket 826): the rider's slips, a quick look. Built by hazeljs: with a luck below the
// slips the rider turns by chance (left, none, right by the luck's remainder by 3), above them it chooses as it looks.
//   node node/trails-slip.mjs
import Hazel from "hazeljs";
import { readFileSync } from "node:fs";
const read = f => readFileSync(new URL("../trails/rules/" + f, import.meta.url), "utf8").replace(/\s+$/, "");
const r = Hazel.runProgram({ preamble: read("preamble.hz"), modules: [{ name: "Trails", text: read("Trails.hz") }], tail: "(start = Trails.start, step = Trails.step, robot = Trails.robot)" });
if (!r.ok) { console.log("not built", (r.errors || []).map(e => String(e.message).slice(0, 300)).join(" | ")); process.exit(1); }
const T = r.value, g = T.start(0);
console.log("Hazel's rider heading", g.bd, "(3: left); slips at luck 0, 1, 2:", [0, 1, 2].map(l => T.robot(g, 2, 6, 12, l)).join(", "), "(2 down, 3 on, 0 up); looking, luck 50:", T.robot(g, 2, 6, 12, 50));
