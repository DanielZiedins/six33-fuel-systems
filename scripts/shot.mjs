// Screenshot one section of a page in headless Chrome (CDP, no deps).
//   node scripts/shot.mjs <url> <css-selector> <out.png> [width=1280]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const [url, sel, outFile, w = "1280"] = process.argv.slice(2);
const PORT = 9800 + Math.floor(Math.random() * 400);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "shot-"))}`, `--window-size=${w},900`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t; for (let i = 0; i < 50 && !t; i++) { await sleep(200); try { t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json(); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Emulation.setDeviceMetricsOverride", { width: +w, height: 900, deviceScaleFactor: 1, mobile: +w < 600 });
await send("Page.navigate", { url }); await sleep(3000);
await ev(`(async()=>{const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'))})()`);
await sleep(1400);
const box = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.scrollIntoView();const r=e.getBoundingClientRect();return {x:0,y:r.top+scrollY,width:innerWidth,height:Math.min(r.height,4000)}})()`);
await sleep(600);
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...box, scale: 1 } });
writeFileSync(outFile, Buffer.from(shot.result.data, "base64")); console.log("saved", outFile, box.height + "px");
ws.close(); chrome.kill();
