// node/cdp.mjs (0.0.101): headless Chrome, driven over its DevTools protocol with Node's own fetch and WebSocket (Node 22; no
// packages), for the checks that run on GitHub's runners: node/world-save-check.mjs, node/zine-check.mjs. Not for the laptop,
// which runs no headless browser.
//   const C = await chrome(); const p = await C.open(url, "page 1"); await p.eval("1 + 1"); C.close();
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function chrome({ port = 9333, bin = process.env.CHROME || "google-chrome" } = {}) {
  if (typeof WebSocket !== "function") throw new Error("needs Node 22 or later (its WebSocket)");
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), "cdp-"));
  const proc = spawn(bin, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "--no-first-run", "--no-default-browser-check",
    "--no-sandbox", "--mute-audio", "--window-size=1280,900", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  proc.stderr.on("data", () => {});
  let up = false;
  for (let i = 0; i < 100 && !up; i++) { try { up = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch (e) { /* not yet */ } if (!up) await sleep(200); }
  if (!up) { proc.kill("SIGKILL"); throw new Error("Chrome did not start"); }
  return { open: (url, name) => Page.open(port, url, name), close: () => { try { proc.kill("SIGKILL"); } catch (e) { /* gone */ } } };
}

export class Page {
  static async open(port, url, name) {
    const r = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURI(url)}`, { method: "PUT" });
    const t = await r.json(), p = new Page(); p.name = name; p.id = 0; p.wait = new Map(); p.console = [];
    p.ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((ok, no) => { p.ws.onopen = ok; p.ws.onerror = no; });
    p.ws.onmessage = ev => { const m = JSON.parse(ev.data);
      if (m.id && p.wait.has(m.id)) { const w = p.wait.get(m.id); p.wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.ok(m.result); return; }
      if (m.method === "Runtime.consoleAPICalled" && /error|warning/.test(m.params.type)) p.console.push(`[${name} ${m.params.type}] ` + m.params.args.map(a => a.value ?? a.description ?? "").join(" "));
      if (m.method === "Runtime.exceptionThrown") p.console.push(`[${name} exception] ` + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)); };
    await p.send("Runtime.enable"); await p.send("Page.enable");
    return p;
  }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((ok, no) => this.wait.set(id, { ok, no })); }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`${this.name}: ` + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
  async until(expr, what, ms = 180000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await this.eval(expr)) return; await sleep(500); } throw new Error(`${this.name}: ${what}: not after ${ms / 1000} s`); }
  async shot(file) { const r = await this.send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(file, Buffer.from(r.data, "base64")); }
}
