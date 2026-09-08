# SIX33 FUEL SYSTEMS

> **"Seek first the Kingdom of God."** — Matthew 6:33

Pre-launch **Coming Soon** site for **SIX33 Fuel Systems** — premium powdered fuel
systems built to spread the gospel and impact culture. A movement by
**Seek First World**.

- **Live:** https://www.six33fuel.com (apex redirects to `www`)
- **Vercel:** `six33-fuel-systems`
- **Stack:** zero-build static site. One self-contained `index.html`. No npm, no bundler.

---

## The four systems

| # | System | Focus | Colour | Scripture |
|---|--------|-------|--------|-----------|
| 01 | **Ignite** | Energy + focus | Ember orange `#ff5e1f` | Romans 12:11 |
| 02 | **Flow** | Productivity + deep work | Electric cyan `#19d3f3` | Colossians 3:23 |
| 03 | **Recover** | Recovery + electrolytes | Emerald green `#4fd13c` | Psalm 23:3 |
| 04 | **Rest** | Sleep + nervous system | Deep purple `#8b6cf6` | Psalm 4:8 |

The current build is **pre-launch**: nothing is for sale, there is no cart, and every
call to action routes to the Kickstarter waitlist.

---

## Repo contents

```
six33-fuel-systems/
├── index.html              # The entire site — markup, CSS and JS in one file
├── vercel.json             # Headers, caching and redirects
├── robots.txt              # Points crawlers at the sitemap
├── sitemap.xml             # Single-URL sitemap
├── manifest.webmanifest    # PWA/install metadata
├── og.jpg                  # 1200×630 social share card
├── six33-lineup.jpg/.webp  # Product lineup showcase
├── six33-logo.png/.webp    # Crown-shield mark (360px)
├── founder.webp            # Daniel Ziedins portrait
├── favicon-32.png          # Browser tab icon
├── favicon-192.png         # Android / manifest icon
├── favicon-512.png         # Maskable install icon
└── apple-touch-icon.png    # iOS home screen (180px)
```

### Page sections

Coming-soon banner · sticky nav · cinematic hero · rolling marquee · lineup showcase ·
four system cards · trust badges · the Fuel Map day rhythm · the full mission box ·
mission / movement · founder spotlight · lifestyle reels · testimonials · Kickstarter
explainer · Outpost Rewards · Seek First World band · **waitlist capture** · final CTA ·
footer.

---

## The waitlist

The waitlist is the whole point of this site, so it writes to a real table.

- **Database:** Thy Kingdom Network — MAIN (Supabase `vmpkiwfvnlzraabtjkig`)
- **Table:** `public.six33_fuel_signups`
- **Access:** RLS is on, with a single `anon` **INSERT** policy. Anonymous visitors
  cannot read, update or delete rows. The page uses the anon key over PostgREST;
  there is no server and no service-role key in the client.
- **Duplicates:** the table has a unique index on `email`, so a repeat signup returns
  `409` and the page treats that as success. Do **not** switch the request to
  `Prefer: resolution=merge-duplicates` — upsert needs an UPDATE policy, which would
  let anyone overwrite another person's row.

### Bot guard

Roughly 60% of a sibling site's list turned out to be bots, and their bounces are
charged against the shared `team.thykingdom.net` sending domain. So this form runs
two checks before it writes:

1. **Honeypot** — an off-screen `website` field. Any value means a bot.
2. **Time to submit** — anything submitted under 2.5s after load is a bot.

A tripped guard shows the normal success state and writes **nothing**, so the bot has
no signal to adapt to. Real failures show an inline error instead. `time_to_submit_ms`
is stored in `metadata` so the threshold can be audited against real traffic.

### Reading the list

```sql
select email, full_name, created_at, metadata
from public.six33_fuel_signups
order by created_at desc;
```

---

## Caching — read before editing `vercel.json`

This site previously served **`index.html` with `max-age=31536000, immutable`**, which
meant returning visitors were pinned to a year-old copy of the page and deploys were
invisible to them. The current config sends `max-age=0, must-revalidate` for HTML and a
one-day `stale-while-revalidate` for images.

Image filenames are **not** content-hashed, so never mark them `immutable` — you would
lose the ability to update the founder photo or the lineup shot.

The config also uses the modern `headers` array. Do not reintroduce the legacy
`builds` / `routes` keys: `routes` silently overrides `headers`, which is how the
security headers came to be dropped.

---

## Local development

```bash
python3 -m http.server 4733
```

Then open http://localhost:4733. There is no build step — edit `index.html` and reload.

Note that a plain static server sends no `Cache-Control`, so hard-reload if a change
does not appear.

---

## Deploy

Every push to `main` auto-deploys via Vercel.

```bash
git add -A && git commit -m "your message" && git push
```

Commit as `danielziedins@gmail.com` — Vercel blocks deploys from unrecognised commit
authors.

---

## What to connect next

- **Kickstarter URL** — the "Kickstarter Coming Soon" buttons are placeholders until
  the campaign is live.
- **Welcome email** — the waitlist stores `email_subscribed` and an `unsub_token` ready
  for a Resend journey, matching the other TKN sites. Nothing sends yet.
- **Social accounts** — the footer's social row was removed because no SIX33 Fuel
  accounts exist yet. The `.footer-social` CSS is still in place for when they do.
- **Real product photography** — the four system cards render their packets in CSS.
- **Analytics** — no analytics or consent banner is installed.

---

## Brand reference

| Element | Value |
|---------|-------|
| Parent brand | Seek First World |
| Product line | SIX33 Fuel Systems |
| Sibling brands | SIX33 World, Lions Den Alliance, Kingdom Connect |
| Core tagline | Fuel Your Purpose. Live On Mission. |
| Foundation verse | Matthew 6:33 |
| Logo mark | Gold crown-and-cross shield |
| Primary accent | Ember orange `#ff5e1f` |
| Gold accent | `#c9a25a` |
| Background | Matte black `#050505` |
| Type | Oswald (display) · Sora (body) · JetBrains Mono (detail) |

---

Built To Seek First. © 2026 SIX33 Fuel Systems — Seek First World.
