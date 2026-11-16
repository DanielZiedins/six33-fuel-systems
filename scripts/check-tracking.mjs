// Loads a page in headless Chrome as a human-like visitor, scrolls it end to end,
// and reports which analytics events the page tried to send. Tracking calls are
// intercepted in-page and never reach the database.
//   node scripts/check-tracking.mjs [url]
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.argv[2] || "https://www.six33fuel.com/";
const PORT = 9300 + Math.floor(Math.random() * 500);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "s33-"))}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json(); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send("Page.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: `
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  window.__events = [];
  const realFetch = window.fetch;
  window.fetch = function (u, o) {
    if (String(u).includes('six33_fuel_track')) {
      try { const b = JSON.parse(o.body); window.__events.push(b.p_name + (b.p_label ? ':' + b.p_label : '')); } catch (_) {}
      return Promise.resolve(new Response('', { status: 204 }));
    }
    return realFetch.apply(this, arguments);
  };` });
await send("Page.navigate", { url });
await sleep(3500);
const h = await evaluate("document.documentElement.scrollHeight");
for (let y = 0; y < h; y += 500) { await evaluate(`window.scrollTo(0, ${y})`); await sleep(220); }
await sleep(800);
console.log(JSON.stringify(await evaluate("({ webdriver: navigator.webdriver, events: window.__events })"), null, 1));
ws.close(); chrome.kill();
