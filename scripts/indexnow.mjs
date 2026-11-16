// Submit URLs to IndexNow (Bing, Yandex, Seznam, Naver share one endpoint).
//   node scripts/indexnow.mjs            -> every URL in the LIVE sitemap
//   node scripts/indexnow.mjs <url>...   -> just these
// The key file (<key>.txt at the site root) must already be deployed.
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "www.six33fuel.com";
const keyFile = readdirSync(ROOT).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("no IndexNow key file at the repo root");
const key = keyFile.slice(0, -4);
let urls = process.argv.slice(2);
if (!urls.length) {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`, { cache: "no-store" })).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
const live = await fetch(`https://${HOST}/${keyFile}`, { cache: "no-store" });
if (!live.ok || (await live.text()).trim() !== key) throw new Error(`key file not live at https://${HOST}/${keyFile} — deploy it first`);
const res = await fetch("https://api.indexnow.org/IndexNow", {
  method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList: urls }),
});
console.log(`IndexNow ${res.status} ${res.statusText} — submitted ${urls.length} URLs`);
urls.forEach((u) => console.log("  " + u));
if (res.status >= 300) process.exit(1);
