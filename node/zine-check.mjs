// node/zine-check.mjs (0.0.101): Gnome world's instruction booklet still prints as a zine, each of its pages on one half-letter
// page and no more (Matthew, 2026-11-24: "let's update the zine, with these new features"). For a GitHub runner (headless Chrome;
// not the laptop). The booklet printed to PDF by Chrome at its own page size (@page, 5.5 by 8.5 inches), and the pages counted:
// as many as the booklet's sections that print, or a section ran onto a page of its own. The PDF goes in the artifact.
//   node node/zine-check.mjs [base url] [out dir] [booklet path]
import fs from "node:fs";
import path from "node:path";
import { chrome } from "./cdp.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:8000/", OUT = process.argv[3] || "zine", WHAT = process.argv[4] || "world/manual/";
fs.mkdirSync(OUT, { recursive: true });
let C = null, code = 1;
try {
  C = await chrome({ port: 9334 });
  const p = await C.open(BASE + WHAT, "booklet");
  // (0.0.138: a runner's Chrome 157 left the tab /json/new opened on about:blank, and the wait, met at once by about:blank, printed
  // a blank page, twice; Chrome 158 had navigated. So the booklet is asked for again if the tab is elsewhere, and the wait is for
  // the booklet itself: its address and its sections, as well as its pictures)
  if (!String(await p.eval("location.href")).startsWith(BASE + WHAT)) await p.send("Page.navigate", { url: BASE + WHAT });
  await p.until(`location.href.startsWith(${JSON.stringify(BASE + WHAT)}) && document.readyState === 'complete' && !!document.querySelector('section.page') && [...document.images].every(i => i.complete)`, "the booklet and its pictures loaded", 60000);
  await p.eval("document.fonts.ready.then(() => true)");
  await p.send("Emulation.setEmulatedMedia", { media: "print" });
  const sections = await p.eval(`[...document.querySelectorAll("section.page")].filter(s => getComputedStyle(s).display !== "none").map(s => (s.querySelector("h2") || {}).textContent || "the cover")`);
  const r = await p.send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true });
  const pdf = Buffer.from(r.data, "base64"), name = path.join(OUT, "gnome-world-booklet.pdf");
  fs.writeFileSync(name, pdf);
  const text = pdf.toString("latin1"), counts = [...text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)].map(m => +(m[1] || m[2]));
  const pages = counts.length ? Math.max(...counts) : (text.match(/\/Type\s*\/Page\b(?!s)/g) || []).length;
  console.log(`the booklet: ${sections.length} sections print (${sections.join(" · ")})`);
  console.log(`printed: ${pages} pages, ${(pdf.length / 1024).toFixed(0)} KB (${name})`);
  if (p.console.length) console.log(p.console.join("\n"));
  if (pages === sections.length) { console.log("✓ each section on one page"); code = 0; }
  else console.log(`FAILED: ${pages} pages for ${sections.length} sections: a section runs onto a page of its own`);
} catch (e) { console.log("FAILED: " + (e && e.stack || e)); }
if (C) C.close();
process.exit(code);
