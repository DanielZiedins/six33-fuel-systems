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
├── privacy.html            # /privacy
├── 404.html                # Branded not-found page
├── llms.txt                # Plain-language summary for AI crawlers
├── og.jpg                  # 1200×630 branded social share card
├── six33-four-systems.*    # Showcase: the four launching systems
├── six33-lineup.jpg/.webp  # Full six-product concept master (not shown)
├── supabase/functions/six33-fuel-email/  # Waitlist + welcome email edge function
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

The waitlist is the whole point of this site, so it is built like the rest of the
network's capture forms (same shape as Kingdom Hub).

```
form ──POST /api/waitlist──▶ Vercel rewrite ──▶ edge fn six33-fuel-email
                                                   ├─ rpc six33_fuel_subscribe   (validation, bot guard, flood cap, referral credit)
                                                   ├─ rpc six33_fuel_claim_welcome (claim BEFORE send)
                                                   ├─ Resend → welcome email      (release claim if the send fails)
                                                   └─ { ok, is_new, ref_code, emailed }
```

- **Database:** TKN-MAIN (Supabase `vmpkiwfvnlzraabtjkig`), table `public.six33_fuel_signups`.
- **No direct API access.** RLS is on with no policies and all grants revoked; the only
  way in is the `six33_fuel_subscribe` RPC, which only the service role can call. So the
  bot guard cannot be skipped by posting straight to Supabase.
- **Edge function source** is tracked in `supabase/functions/six33-fuel-email/index.ts`.
  Deploy changes with the Supabase CLI or MCP, `verify_jwt: false`.
- **Same-origin routes** (rewrites in `vercel.json`):
  - `POST /api/waitlist` — subscribe + welcome email
  - `GET /api/ref?stats=CODE` — how many people a share link has brought in
  - `GET|POST /api/unsubscribe?token=` — link + RFC 8058 one-click unsubscribe
  - Preview the email: `https://vmpkiwfvnlzraabtjkig.supabase.co/functions/v1/six33-fuel-email?preview=welcome&name=Daniel`
- **Sender:** `fuel@team.thykingdom.net` (the only verified Resend domain); replies go to
  `hello@thykingdom.net`. The Resend key is read from `tkn_app_secrets`, never committed.

### Bot guard (server-side)

1. **Honeypot** — an off-screen `website` field.
2. **Time to submit** — under 2.5s after page load.
3. **Flood cap** — more than 300 signups in 10 minutes is refused.

A tripped honeypot or timer returns a normal-looking success and writes nothing.
Roughly 60% of a sibling site's list was bots, and their bounces count against the
shared `team.thykingdom.net` sending domain.

### Referrals

Every signup gets a 6-character `ref_code`. The success state shows a personal share
link (`/?ref=CODE`), copy/WhatsApp/Text/Email/X/Facebook buttons, and a live count. An
inbound `?ref=` is remembered in localStorage until that visitor signs up, and only a code
that exists is credited.

```sql
select * from public.six33_fuel_referral_leaderboard;   -- who brought whom in
select email, full_name, ref_code, referred_by, created_at, metadata
from public.six33_fuel_signups order by created_at desc;
```

### Anonymous analytics

`six33_fuel_track` (anon-callable, allowlisted names, 3000 per 10 min cap) writes to
`six33_fuel_events`: `pageview`, `section_view`, `cta`, `signup`, `share`, `faq_open`,
`outbound`, `ref_landing`. No cookies, IDs or emails. It fires only on the production host,
never under automation, and `?notrack` opts a browser out.

```sql
select * from public.six33_fuel_event_daily order by day desc, n desc;
```

---

## Content rules

- **No invented social proof.** The old testimonials section quoted named people
  reviewing products that don't exist yet; it is now "Who It's Built For". Real backer
  stories go there after launch.
- The showcase uses `six33-four-systems.*`, a crop of the four launching systems.
  `six33-lineup.*` is the full six-product concept (incl. Endure and Alpha), kept as
  the master but not shown.
- The FAQ markup and the FAQPage JSON-LD must say the same thing — edit both together.

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
- **Launch broadcast** — one welcome email sends today; the launch-day announcement to
  the list still needs writing and sending.
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
