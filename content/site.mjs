// One place for site-wide facts. The generator (scripts/build.mjs) reads this.
export const SITE = {
  name: "SIX33 Fuel Systems",
  url: "https://www.six33fuel.com",
  email: "hello@thykingdom.net",
  // Bump ONLY when page content changes (not for styling/infra) — it feeds sitemap
  // <lastmod> and dateModified. Never use the build clock.
  contentUpdated: "2026-11-14",
};

// The Organization and founder (Person) entities are NOT redefined here: the generator
// copies them verbatim out of index.html's JSON-LD, so every page uses one shape.
