# SIX33 FUEL SYSTEMS

> **"Seek first the Kingdom of God."** — Matthew 6:33

Cinematic eCommerce website for **SIX33 Fuel Systems** — premium powdered hydration & performance stick packs. A movement by **Seek First World**.

---

## The Six Systems

| # | System | Color | Scripture |
|---|--------|-------|-----------|
| 01 | **Ignite** — Energy + Focus | Ember orange `#ff5e1f` | Romans 12:11 |
| 02 | **Flow** — Productivity + Deep Work | Electric cyan `#19d3f3` | Colossians 3:23 |
| 03 | **Recover** — Recovery + Electrolytes | Emerald green `#4fd13c` | Psalm 23:3 |
| 04 | **Rest** — Sleep + Nervous System | Deep purple `#8b6cf6` | Psalm 4:8 |
| 05 | **Endure** — Hydration + Endurance | Bronze gold `#d99a3e` | Hebrews 12:1 |
| 06 | **Alpha** — Tactical / Gym / Testosterone | Crimson red `#e63d3d` | 1 Corinthians 16:13 |

---

## What's in this repo

```
six33-fuel-systems/
├── index.html         # Complete single-page eCommerce site (self-contained)
├── six33-lineup.jpg   # Official product lineup mockup (hero showcase)
├── vercel.json        # Vercel deployment config
└── README.md
```

### Site sections
- Cinematic hero with animated type, floating packet, stats bar, dual CTAs
- Rolling marquee — "Fuel Your Purpose · Built To Seek First · ..."
- Full lineup showcase — embedded real packaging mockup image
- Six product cards — code-rendered stick packs with per-product verse, triad chips, hover glow
- Five trust badges — Clean Ingredients · No Artificial Crap · Lab Tested · Performance Driven · Faith Fueled
- The Fuel Map — 6-node day-rhythm timeline (05:00 to 21:00)
- Full Mission System bundle — all 6 packs, $189 vs $228
- Mission / Movement — scripture, pillar grid, large background "SEEK FIRST" text
- Lifestyle reels grid — athlete / builder / outdoor / travel / gym culture
- Testimonials — 3 community voices
- Subscription tiers — Scout $34 / Operator $89 / Vanguard $159 per month
- Outpost Rewards — 4 community tiers (Recruit to Founder's Circle)
- Epic final CTA — scroll-triggered "Fuel Your Purpose. Live On Mission."
- Full footer linking all 6 systems, Seek First World, Lions Den Alliance, Kingdom Connect
- Slide-out cart drawer with working quantity controls, toast notifications, running total
- Fully responsive (mobile-first), ESC closes cart, scroll-sticky nav with glass blur

---

## Deploy — GitHub to Vercel

Zero-build static site. No npm, no bundler, no framework needed.

### Step 1 — Create the GitHub repo

1. Go to github.com/new
2. Name it `six33-fuel-systems`
3. Do NOT initialize with a README (we already have one)
4. Hit Create repository

### Step 2 — Push the code

```bash
git init
git add .
git commit -m "Launch: SIX33 Fuel Systems — Built To Seek First"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/six33-fuel-systems.git
git push -u origin main
```

### Step 3 — Connect to Vercel

1. Go to vercel.com/new
2. Import Git Repository — select `six33-fuel-systems`
3. Framework preset: Other (static HTML)
4. Build command: leave blank
5. Output directory: leave blank
6. Hit Deploy

Vercel picks up `vercel.json` automatically. Live in ~30 seconds.

Every push to `main` auto-deploys from that point forward.

---

## What to connect next

- **Payment processor** — wire the `checkout()` function in the script block to Stripe, Shopify, or GoHighLevel
- **Subscription billing** — connect the three subscription buttons to Stripe Billing or Recharge
- **Real product photos** — swap the CSS-rendered packets in `.pc-packet` divs with actual photography
- **Video content** — drop real mp4 or YouTube embeds into the lifestyle reel cards (`.ls-card`)
- **Custom domain** — set in Vercel > Project Settings > Domains

---

## Brand reference

| Element | Value |
|---------|-------|
| Parent brand | Seek First World |
| Product line | SIX33 Fuel Systems |
| Ministry arms | Lions Den Alliance, Kingdom Connect |
| Core tagline | Fuel Your Purpose. Live On Mission. |
| Foundation verse | Matthew 6:33 |
| Logo mark | Gold crown-and-cross shield |
| Primary accent | Ember orange #ff5e1f |
| Gold accent | #c9a25a |
| Background | Matte black #050505 |

---

Built To Seek First. © 2026 SIX33 Fuel Systems — Seek First World.
