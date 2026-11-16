// SIX33 Fuel Systems — zero-dependency generator.
//
//   node scripts/build.mjs          write everything
//   node scripts/build.mjs --check  exit 1 if any generated file is out of date
//
// Generates, from content/*.mjs:
//   journal/index.html, journal/<slug>/index.html, sitemap.xml, llms.txt
// and fills the marked slots in index.html:
//   <!-- GEN:JOURNAL --> … <!-- /GEN:JOURNAL -->   (latest posts teaser)
//   <!-- GEN:NETWORK --> … <!-- /GEN:NETWORK -->   (contextual sibling sites)
//
// Vercel serves this repo as plain static files (no build step runs there), so
// generated output is committed. Run this, then commit.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "../content/site.mjs";
import { POSTS } from "../content/posts.mjs";
import { NETWORK } from "../content/network.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const out = new Map(); // path -> contents
const emit = (rel, text) => out.set(rel, text);
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

// ── Guards ──────────────────────────────────────────────────────────────────
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
const fail = (m) => { console.error("✗ " + m); process.exit(1); };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
if (!DATE.test(SITE.contentUpdated) || SITE.contentUpdated > today) fail(`contentUpdated ${SITE.contentUpdated} is malformed or in the future (today ${today})`);
const slugs = new Set();
for (const p of POSTS) {
  if (!DATE.test(p.date) || p.date > today) fail(`${p.slug}: date ${p.date} is malformed or in the future`);
  if (slugs.has(p.slug)) fail(`duplicate slug ${p.slug}`);
  slugs.add(p.slug);
  for (const d of p.related || []) if (!NETWORK[d]) fail(`${p.slug}: related "${d}" is not in content/network.mjs`);
  if (p.description.length > 200) fail(`${p.slug}: description is ${p.description.length} chars (keep ≤ 200)`);
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 8);
const words = (s) => s.replace(/[#>*\-\[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
const readMins = (s) => Math.max(1, Math.round(words(s) / 230));
const fmtDate = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const ACCENT = { ignite: "#ff5e1f", flow: "#19d3f3", recover: "#4fd13c", rest: "#8b6cf6", gold: "#c9a25a" };
const postUrl = (p) => `${SITE.url}/journal/${p.slug}`;

// Asset versions: change when the file changes, so a day of caching never serves stale CSS/JS.
const CSS_V = hash(read("assets/site.css"));
const JS_V = hash(read("assets/journal.js"));

// Organization + founder: copied verbatim from the homepage's JSON-LD (one entity, one shape).
const home = read("index.html");
const homeLd = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const ORG = homeLd["@graph"].find((n) => n["@type"] === "Organization");
const FOUNDER = homeLd["@graph"].find((n) => n["@type"] === "Person");
if (!ORG || !FOUNDER) fail("index.html JSON-LD must define Organization and Person nodes");

// Inline markdown: escape first, then **bold**, *em*, [text](url).
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      const ext = /^https?:/.test(u);
      return `<a href="${u}"${ext ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`;
    });
}
function render(md) {
  const blocks = md.trim().split(/\n\s*\n/);
  return blocks.map((b) => {
    b = b.trim();
    if (b.startsWith("## ")) return `<h2>${inline(b.slice(3))}</h2>`;
    if (b.startsWith("> ")) {
      const text = b.replace(/^> ?/gm, " ").trim();
      const m = text.match(/^(.*?)\s+—\s+([^—]+)$/);
      return m
        ? `<blockquote><p>${inline(m[1])}</p><cite>${inline(m[2])}</cite></blockquote>`
        : `<blockquote><p>${inline(text)}</p></blockquote>`;
    }
    if (/^- /.test(b)) return `<ul>${b.split(/\n/).map((l) => `<li>${inline(l.replace(/^- /, ""))}</li>`).join("")}</ul>`;
    if (/^\*[^*].*\*$/.test(b)) return `<p class="note">${inline(b.slice(1, -1))}</p>`;
    return `<p>${inline(b.replace(/\n/g, " "))}</p>`;
  }).join("\n");
}

// ── Page chrome ─────────────────────────────────────────────────────────────
function head({ title, description, path, image, type = "website", extraMeta = "", ld }) {
  const url = SITE.url + path;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${url}" />
<meta name="robots" content="index,follow,max-image-preview:large" />
<meta name="theme-color" content="#050505" />
<meta property="og:site_name" content="${SITE.name}" />
<meta property="og:type" content="${type}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${image}" />
${extraMeta}<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="alternate" type="application/rss+xml" title="SIX33 Fuel Journal" href="/journal/feed.xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Sora:wght@400;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/assets/site.css?v=${CSS_V}" />
<script type="application/ld+json">
${JSON.stringify(ld, null, 1)}
</script>
</head>`;
}
const header = (current) => `<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <a class="brand" href="/" aria-label="SIX33 Fuel Systems — home"><img src="/six33-logo.webp" width="30" height="30" alt="" /><span><b>SIX33</b><small>Fuel Systems</small></span></a>
  <nav aria-label="Main">
    <a href="/#products">The Systems</a>
    <a href="/journal"${current === "journal" ? ' aria-current="page"' : ""}>Journal</a>
    <a href="/#faq">FAQ</a>
    <a class="cta" href="#join" data-cta="header">Join Waitlist</a>
  </nav>
</header>`;
const footer = `<footer class="foot">
  <div class="verse">"Seek first the Kingdom of God." &mdash; Matthew 6:33</div>
  <a href="/">Home</a><a href="/#products">The Systems</a><a href="/journal">Journal</a><a href="/#faq">FAQ</a><a href="/privacy">Privacy</a>
  <div>&copy; 2026 SIX33 Fuel Systems &mdash; a movement by <a href="https://www.seekfirst.world" style="margin:0">Seek First World</a>.</div>
</footer>
<script src="/assets/journal.js?v=${JS_V}" defer></script>`;
const joinBox = (source, heading = "Be first when SIX33 launches.") => `<section class="join" id="join" aria-labelledby="join-h">
  <h2 id="join-h">${heading}</h2>
  <p>Join the Kickstarter waitlist. One welcome email now, then you'll hear the moment the campaign goes live &mdash; before it's announced anywhere else.</p>
  <form data-join="${source}" novalidate>
    <label class="sr-only" for="join-email">Email address</label>
    <input id="join-email" type="email" name="email" placeholder="your.email@example.com" autocomplete="email" required maxlength="254" />
    <div class="trap" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
    <button type="submit">Join The Waitlist</button>
  </form>
  <p class="msg" role="status"></p>
  <div class="share"><label class="sr-only" for="join-share">Your share link</label><input id="join-share" type="text" readonly /><p class="fine"><button type="button" data-copy class="btn-line" style="margin-top:10px;cursor:pointer;background:none">Copy link</button></p></div>
  <p class="fine">No spam. Unsubscribe in one click. <a href="/privacy">Privacy</a></p>
</section>`;

// ── Cards ───────────────────────────────────────────────────────────────────
const card = (p) => `<a class="card" href="/journal/${p.slug}" style="--accent:${ACCENT[p.accent] || ACCENT.ignite}">
  <span class="eyebrow"><span class="cat">${esc(p.category)}</span><span>${readMins(p.body)} min read</span></span>
  <h3>${esc(p.title)}</h3>
  <p>${esc(p.description)}</p>
  <span class="more">Read &rarr;</span>
</a>`;

// ── Post pages ──────────────────────────────────────────────────────────────
for (const p of POSTS) {
  const url = postUrl(p);
  const image = existsSync(join(ROOT, "journal", p.slug, "og.jpg")) ? `${url}/og.jpg` : `${SITE.url}/og.jpg`;
  const related = (p.related || []).map((d) => NETWORK[d]);
  const others = POSTS.filter((o) => o.slug !== p.slug).slice(0, 3);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      ORG,
      FOUNDER,
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: p.title,
        description: p.description,
        url,
        mainEntityOfPage: url,
        image,
        datePublished: p.date,
        dateModified: p.updated || p.date,
        articleSection: p.category,
        wordCount: words(p.body),
        inLanguage: "en",
        author: { "@id": FOUNDER["@id"] },
        publisher: { "@id": ORG["@id"] },
        isPartOf: { "@id": `${SITE.url}/journal#blog` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.url}/` },
          { "@type": "ListItem", position: 2, name: "Journal", item: `${SITE.url}/journal` },
          { "@type": "ListItem", position: 3, name: p.title, item: url },
        ],
      },
    ],
  };
  const extra = `<meta property="article:published_time" content="${p.date}" />\n<meta property="article:author" content="${FOUNDER.name}" />\n<meta property="article:section" content="${esc(p.category)}" />\n`;
  emit(`journal/${p.slug}/index.html`, `${head({ title: `${p.title} — SIX33 Fuel Journal`, description: p.description, path: `/journal/${p.slug}`, image, type: "article", extraMeta: extra, ld })}
<body style="--accent:${ACCENT[p.accent] || ACCENT.ignite}">
${header("journal")}
<main id="main">
  <article class="narrow">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/journal">Journal</a> / ${esc(p.category)}</nav>
    <div class="eyebrow" style="margin-top:28px"><span class="cat">${esc(p.category)}</span><span>&middot;</span><time datetime="${p.date}">${fmtDate(p.date)}</time><span>&middot;</span><span>${readMins(p.body)} min read</span></div>
    <h1 class="title">${esc(p.title)}</h1>
    <p class="lead">${esc(p.description)}</p>
    <div class="byline"><img src="/founder.webp" width="44" height="44" alt="" loading="lazy" /><div><b><a href="/#founder" style="text-decoration:none">${FOUNDER.name}</a></b><span>Founder, SIX33 Fuel Systems</span></div></div>
    <div class="accent-bar" aria-hidden="true"></div>
    <div class="prose">
${render(p.body)}
    </div>
${related.length ? `    <aside class="related" aria-labelledby="rel-h"><h2 id="rel-h">Mentioned in this article</h2>
${related.map((s) => `      <a href="${s.url}" target="_blank" rel="noopener"><b>${esc(s.name)}</b><span>${esc(s.relevance)}</span></a>`).join("\n")}
    </aside>` : ""}
    ${joinBox(`journal:${p.slug}`)}
  </article>
  <section class="section wrap" aria-labelledby="more-h">
    <div class="eyebrow">Keep Reading</div>
    <h2 class="section-title" id="more-h">More From The Journal</h2>
    <div class="cards">
${others.map(card).join("\n")}
    </div>
  </section>
</main>
${footer}
</body>
</html>
`);
}

// ── Journal index ───────────────────────────────────────────────────────────
{
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      ORG,
      FOUNDER,
      {
        "@type": "Blog",
        "@id": `${SITE.url}/journal#blog`,
        name: "The SIX33 Fuel Journal",
        url: `${SITE.url}/journal`,
        description: "Faith, discipline and the story behind SIX33 Fuel Systems.",
        publisher: { "@id": ORG["@id"] },
        blogPost: POSTS.map((p) => ({ "@type": "BlogPosting", "@id": `${postUrl(p)}#article`, headline: p.title, url: postUrl(p), datePublished: p.date })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.url}/` },
          { "@type": "ListItem", position: 2, name: "Journal", item: `${SITE.url}/journal` },
        ],
      },
    ],
  };
  emit("journal/index.html", `${head({ title: "The Journal — SIX33 Fuel Systems", description: "Faith, discipline and the story behind SIX33 Fuel Systems — four fuel systems with scripture on every packet.", path: "/journal", image: `${SITE.url}/og.jpg`, ld })}
<body>
${header("journal")}
<main id="main">
  <section class="hero-band">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb" style="padding-top:0"><a href="/">Home</a> / Journal</nav>
      <h1 class="title">The Journal.</h1>
      <p class="lead" style="max-width:620px">Faith, discipline and the story behind SIX33 &mdash; written for people who carry something: a team, a company, a family, a calling.</p>
    </div>
  </section>
  <section class="section wrap" aria-label="All posts">
    <div class="cards">
${POSTS.map(card).join("\n")}
    </div>
  </section>
  <div class="narrow">${joinBox("journal:index")}</div>
</main>
${footer}
</body>
</html>
`);
}

// ── RSS feed ────────────────────────────────────────────────────────────────
emit("journal/feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>The SIX33 Fuel Journal</title>
<link>${SITE.url}/journal</link>
<atom:link href="${SITE.url}/journal/feed.xml" rel="self" type="application/rss+xml" />
<description>Faith, discipline and the story behind SIX33 Fuel Systems.</description>
<language>en</language>
${POSTS.map((p) => `<item><title>${esc(p.title)}</title><link>${postUrl(p)}</link><guid>${postUrl(p)}</guid><pubDate>${new Date(p.date + "T12:00:00Z").toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join("\n")}
</channel>
</rss>
`);

// ── Sitemap ─────────────────────────────────────────────────────────────────
const latest = POSTS.reduce((m, p) => ((p.updated || p.date) > m ? p.updated || p.date : m), "0000");
const urls = [
  { loc: `${SITE.url}/`, lastmod: SITE.contentUpdated, pri: "1.0" },
  { loc: `${SITE.url}/journal`, lastmod: latest, pri: "0.8" },
  ...POSTS.map((p) => ({ loc: postUrl(p), lastmod: p.updated || p.date, pri: "0.7" })),
  { loc: `${SITE.url}/privacy`, lastmod: "2026-10-07", pri: "0.2" },
];
emit("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.pri}</priority></url>`).join("\n")}
</urlset>
`);

// ── llms.txt ────────────────────────────────────────────────────────────────
emit("llms.txt", `# SIX33 Fuel Systems

> Pre-launch site for SIX33 Fuel Systems: four premium powdered fuel systems with scripture on every packet, launching on Kickstarter. A movement by Seek First World, founded by Daniel Ziedins, named for Matthew 6:33 ("Seek first the Kingdom of God"). Nothing is on sale yet; the site collects a Kickstarter waitlist.

## The four systems
- Ignite — energy and focus (Romans 12:11)
- Flow — productivity and deep work (Colossians 3:23)
- Recover — recovery and electrolytes (Psalm 23:3)
- Rest — sleep and nervous-system support (Psalm 4:8)

## Key facts
- Status: coming soon; launch date not yet announced. Pricing is revealed on launch day.
- Kickstarter backer tiers: Scout (one system), Operator (full four-system box), Vanguard (founding circle).
- Full ingredient panels will be published before the campaign goes live.
- Parent brand: Seek First World (https://www.seekfirst.world). Part of the Thy Kingdom Network.
- Contact and wholesale/ministry partnerships: ${SITE.email}

## Pages
- [Home: systems, Fuel Map, FAQ and waitlist](${SITE.url}/)
- [The Journal](${SITE.url}/journal)
- [Privacy](${SITE.url}/privacy)

## Journal
${POSTS.map((p) => `- [${p.title}](${postUrl(p)}): ${p.description}`).join("\n")}

## Related
${Object.values(NETWORK).map((s) => `- [${s.name}](${s.url}): ${s.relevance}`).join("\n")}
`);

// ── Homepage slots ──────────────────────────────────────────────────────────
function fill(html, name, inner) {
  const re = new RegExp(`(<!-- GEN:${name} -->)[\\s\\S]*?(<!-- /GEN:${name} -->)`);
  if (!re.test(html)) fail(`index.html is missing the <!-- GEN:${name} --> slot`);
  return html.replace(re, `$1\n${inner}\n$2`);
}
let index = home;
index = fill(index, "JOURNAL", POSTS.slice(0, 3).map((p) => `      <a class="jr-card reveal" href="/journal/${p.slug}" style="--accent:${ACCENT[p.accent] || ACCENT.ignite}">
        <span class="jr-meta"><span class="jr-cat">${esc(p.category)}</span> &middot; ${readMins(p.body)} min read</span>
        <span class="jr-title">${esc(p.title)}</span>
        <span class="jr-desc">${esc(p.description)}</span>
        <span class="jr-more">Read &rarr;</span>
      </a>`).join("\n"));
const NET_ON_HOME = ["seekfirst.world", "six33.world", "six33outpost.com", "lionsdenalliance.com", "rebornlife.app", "thykingdom.net"];
index = fill(index, "NETWORK", NET_ON_HOME.map((d) => NETWORK[d]).map((s) => `      <a class="net-card reveal" href="${s.url}" target="_blank" rel="noopener">
        <span class="net-name">${esc(s.name)} <span aria-hidden="true">&nearr;</span></span>
        <span class="net-why">${esc(s.relevance)}</span>
      </a>`).join("\n"));
emit("index.html", index);

// ── Write / check ───────────────────────────────────────────────────────────
// Remove post folders whose slug no longer exists (keeps the site in sync with content).
const journalDir = join(ROOT, "journal");
const stale = existsSync(journalDir)
  ? readdirSync(journalDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !slugs.has(d.name)).map((d) => d.name)
  : [];
let drift = 0;
for (const [rel, text] of out) {
  const abs = join(ROOT, rel);
  const current = existsSync(abs) ? readFileSync(abs, "utf8") : null;
  if (current === text) continue;
  drift++;
  if (CHECK) { console.error(`  out of date: ${rel}`); continue; }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
  console.log(`  wrote ${rel}`);
}
for (const s of stale) {
  drift++;
  if (CHECK) console.error(`  stale post folder: journal/${s}`);
  else { rmSync(join(journalDir, s), { recursive: true }); console.log(`  removed journal/${s}`); }
}
if (CHECK && drift) fail(`${drift} generated file(s) out of date — run: node scripts/build.mjs`);
console.log(CHECK ? "✓ generated files are up to date" : `✓ ${out.size} files checked, ${drift} changed`);
