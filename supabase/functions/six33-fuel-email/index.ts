// SIX33 Fuel Systems — waitlist capture, welcome email, referrals, unsubscribe.
//
// POST {email,name,source,elapsedMs,trap,ref,meta} → subscribe (+ welcome email)
// GET  ?stats=<CODE>                               → { valid, referred } for a share link
// GET  ?token=<unsub_token>                        → unsubscribe (link in the email)
// POST ?token=<unsub_token>                        → RFC 8058 one-click unsubscribe
// GET  ?preview=welcome[&name=]                    → render the email in a browser
//
// The site reaches this through same-origin Vercel rewrites:
//   /api/waitlist, /api/ref, /api/unsubscribe  →  this function.
//
// Validation, the bot guard and the flood cap live in the six33_fuel_subscribe RPC
// (service-role only), so they cannot be bypassed by calling the API directly.
// The welcome send is CLAIMED before it is sent, so a retry can never double-mail.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Only team.thykingdom.net is verified in Resend; replies go to a real inbox (has MX).
const FROM = "SIX33 Fuel Systems <fuel@team.thykingdom.net>";
const REPLY_TO = "hello@thykingdom.net";
const SITE = "https://www.six33fuel.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn} failed: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function resendKey(): Promise<string> {
  const env = Deno.env.get("RESEND_API_KEY");
  if (env) return env;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tkn_app_secrets?key=eq.RESEND_API_KEY&select=value`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const key = (await res.json())?.[0]?.value;
  if (!key) throw new Error("RESEND_API_KEY not found");
  return key;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// ── Email ───────────────────────────────────────────────────────────────────
const BG = "#050505", PANEL = "#111116", LINE = "#26262e", TEXT = "#f4f4f5", DIM = "#b4b4bc",
      FAINT = "#8f8f99", IGNITE = "#ff5e1f", GOLD = "#d9b46a";
const DISPLAY = "Oswald,'Arial Narrow','Helvetica Neue',Arial,sans-serif";
const BODY = "Sora,'Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'JetBrains Mono',Menlo,Consolas,monospace";

const SYSTEMS = [
  ["Ignite", "Energy + Focus", "#ff5e1f", "Romans 12:11"],
  ["Flow", "Productivity + Deep Work", "#19d3f3", "Colossians 3:23"],
  ["Recover", "Recovery + Electrolytes", "#4fd13c", "Psalm 23:3"],
  ["Rest", "Sleep + Nervous System", "#8b6cf6", "Psalm 4:8"],
];

function welcomeEmail(name: string | null, unsubToken: string, refCode: string) {
  const first = esc((name ?? "").trim().split(/\s+/)[0] || "friend");
  const unsub = `${SITE}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
  const share = `${SITE}/?ref=${encodeURIComponent(refCode)}`;
  const p = (t: string, color = DIM) =>
    `<p style="margin:0 0 16px;font:400 15px/1.7 ${BODY};color:${color}">${t}</p>`;
  const perk = (t: string) =>
    `<tr><td style="padding:7px 0;font:400 15px/1.55 ${BODY};color:${DIM}"><span style="color:${IGNITE};font-weight:700">&#10003;</span>&nbsp;&nbsp;${t}</td></tr>`;
  const sys = SYSTEMS.map(([n, tag, c, v]) => `
    <tr><td style="padding:10px 0;border-bottom:1px solid ${LINE}">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};vertical-align:middle"></span>
      &nbsp;<span style="font:700 15px/1 ${DISPLAY};letter-spacing:.12em;text-transform:uppercase;color:${c}">${n}</span>
      <span style="font:400 13px/1 ${BODY};color:${DIM}">&nbsp;&middot;&nbsp;${tag}</span>
      <span style="float:right;font:400 11px/1.6 ${MONO};color:${FAINT};letter-spacing:.06em">${v}</span>
    </td></tr>`).join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>You're on the SIX33 list</title></head>
<body style="margin:0;padding:0;background:${BG}">
<div style="display:none;max-height:0;overflow:hidden">Your spot on the SIX33 Kickstarter list is locked in. Here's what happens next.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:28px 14px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:${PANEL};border:1px solid ${LINE};border-radius:10px;overflow:hidden">
  <tr><td style="height:3px;background:linear-gradient(90deg,#ff5e1f,#19d3f3,#4fd13c,#8b6cf6);font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:34px 32px 8px">
    <div style="font:500 11px/1 ${MONO};letter-spacing:.28em;text-transform:uppercase;color:${FAINT}">SIX33 Fuel Systems &middot; Waitlist</div>
    <div style="font:700 38px/1.02 ${DISPLAY};text-transform:uppercase;color:${TEXT};margin-top:16px">You're on<br>the list.</div>
    <div style="font:500 11px/1.6 ${MONO};letter-spacing:.16em;text-transform:uppercase;color:${GOLD};margin-top:14px">&mdash; Built To Seek First. Matthew 6:33</div>
  </td></tr>
  <tr><td style="padding:24px 32px 8px">
    ${p(`Hi ${first},`, TEXT)}
    ${p(`Thank you for standing with SIX33 before there's a single box on a shelf. You're now on the founding list &mdash; when the Kickstarter goes live, <strong style="color:${TEXT}">you hear first</strong>, before it's announced anywhere else.`)}
    ${p(`SIX33 isn't a supplement brand. It's four daily fuel systems with scripture on every packet &mdash; built to put the gospel back into the rhythm of ordinary days: the gym, the office, the dinner table.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border:1px solid ${LINE};border-radius:8px;padding:18px 20px;margin:6px 0 24px">
      <tr><td style="font:500 11px/1 ${MONO};letter-spacing:.22em;text-transform:uppercase;color:${IGNITE};padding-bottom:10px">What your spot means</td></tr>
      ${perk("First word the moment the Kickstarter launches")}
      ${perk("Founding-backer pricing &mdash; revealed on launch day")}
      ${perk("First-run boxes go to founding backers")}
      ${perk("No spam. Only the launch, the mission, and how to be part of it")}
    </table>
    <div style="font:500 11px/1 ${MONO};letter-spacing:.22em;text-transform:uppercase;color:${FAINT};margin:0 0 4px">The four systems</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">${sys}</table>
  </td></tr>
  <tr><td style="padding:0 32px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1c0d06,#0b0b0e);border:1px solid #4a2412;border-radius:8px">
      <tr><td style="padding:22px 22px 24px">
        <div style="font:700 22px/1.1 ${DISPLAY};text-transform:uppercase;color:${TEXT}">Bring your people.</div>
        <p style="margin:10px 0 16px;font:400 14px/1.65 ${BODY};color:${DIM}">This movement grows one conversation at a time. Here's your personal link &mdash; everyone who joins through it is counted to your name.</p>
        <div style="font:500 13px/1.4 ${MONO};color:${GOLD};background:${BG};border:1px dashed #5a4a2a;border-radius:6px;padding:12px 14px;word-break:break-all">${share}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px"><tr><td style="background:${IGNITE};border-radius:3px">
          <a href="${share}&amp;src=welcome-email" style="display:inline-block;padding:14px 26px;font:600 14px/1 ${DISPLAY};letter-spacing:.14em;text-transform:uppercase;color:#000;text-decoration:none">Open my share page &rarr;</a>
        </td></tr></table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:26px 32px 8px">
    ${p(`While SIX33 is coming together, the wider movement is already moving. <a href="https://www.seekfirst.world/?src=six33fuel-welcome" style="color:${GOLD}">Seek First World</a> is where it lives &mdash; devotionals, drops and the people building it.`)}
    ${p(`And if you have a question, an idea, or you want to carry SIX33 into your gym, team or church &mdash; just reply. I read every one.`)}
    <p style="margin:22px 0 0;font:400 15px/1.6 ${BODY};color:${TEXT}">&mdash; Daniel Ziedins<br><span style="color:${FAINT};font-size:13px">Founder, SIX33 Fuel Systems &amp; Seek First World</span></p>
  </td></tr>
  <tr><td style="padding:26px 32px 30px">
    <div style="border-top:1px solid ${LINE};padding-top:18px;font:400 12px/1.7 ${BODY};color:${FAINT}">
      You're receiving this because you joined the waitlist at <a href="${SITE}" style="color:${FAINT}">six33fuel.com</a>.<br>
      <a href="${unsub}" style="color:${FAINT};text-decoration:underline">Unsubscribe</a> &nbsp;&middot;&nbsp; A movement by Seek First World &middot; Part of the Thy Kingdom Network.
    </div>
  </td></tr>
</table></td></tr></table></body></html>`;

  const text = `Hi ${first},

You're on the SIX33 Fuel Systems founding list. When the Kickstarter goes live, you hear first - before it's announced anywhere else.

What your spot means:
- First word the moment the Kickstarter launches
- Founding-backer pricing - revealed on launch day
- First-run boxes go to founding backers
- No spam. Only the launch, the mission, and how to be part of it.

The four systems:
${SYSTEMS.map(([n, t, , v]) => `- ${n}: ${t} (${v})`).join("\n")}

Bring your people - your personal link (everyone who joins through it is counted to your name):
${share}

While you wait: https://www.seekfirst.world

Questions, ideas, or want to carry SIX33 into your gym, team or church? Just reply. I read every one.

- Daniel Ziedins
Founder, SIX33 Fuel Systems & Seek First World

Unsubscribe: ${unsub}`;

  return { subject: `You're on the list, ${first.replace(/&[a-z#0-9]+;/g, "")} — Built To Seek First`, html, text };
}

function page(title: string, body: string) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title} · SIX33 Fuel Systems</title></head>
<body style="margin:0;background:${BG};color:${TEXT};font:400 16px/1.65 ${BODY}">
<main style="max-width:520px;margin:18vh auto;padding:0 24px;text-align:center">
<div style="font:500 11px/1 ${MONO};letter-spacing:.3em;text-transform:uppercase;color:${FAINT}">SIX33 Fuel Systems</div>
<h1 style="font:700 34px/1.05 ${DISPLAY};text-transform:uppercase;margin:16px 0 12px">${title}</h1>
${body}
<p style="margin-top:28px"><a href="${SITE}" style="color:${IGNITE};font:600 14px/1 ${DISPLAY};letter-spacing:.14em;text-transform:uppercase;text-decoration:none">Back to six33fuel.com &rarr;</a></p>
</main></body></html>`,
    { headers: { ...CORS, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

// ── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.get("preview") === "welcome") {
    const { html } = welcomeEmail(url.searchParams.get("name") ?? "Daniel", "preview", "PREVIEW");
    return new Response(html, { headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
  }

  const stats = url.searchParams.get("stats");
  if (req.method === "GET" && stats) {
    if (!/^[A-Za-z0-9]{4,12}$/.test(stats)) return json({ valid: false, referred: 0 });
    try {
      return json(await rpc("six33_fuel_ref_stats", { p_code: stats }));
    } catch (err) {
      console.error("stats failed", err);
      return json({ valid: false, referred: 0 }, 500);
    }
  }

  const token = url.searchParams.get("token") ?? url.searchParams.get("unsub");
  if (token) {
    try {
      await rpc("six33_fuel_unsubscribe", { p_token: token });
    } catch (err) {
      console.error("unsubscribe failed", err);
    }
    // RFC 8058: mail clients POST "List-Unsubscribe=One-Click" — that is never a signup.
    if (req.method === "POST") return new Response("Unsubscribed", { headers: { ...CORS, "Content-Type": "text/plain" } });
    return page("You're unsubscribed.",
      `<p style="color:${DIM}">You won't receive any more SIX33 emails. Thank you for standing with the mission &mdash; grace and peace.</p>`);
  }

  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const email = String(body.email ?? "").slice(0, 254);
  const name = body.name == null ? null : String(body.name).slice(0, 80);
  const meta = body.meta && typeof body.meta === "object" && !Array.isArray(body.meta) ? body.meta : {};

  let sub: { ok: boolean; error?: string; skipped?: boolean; is_new?: boolean; ref_code?: string };
  try {
    sub = await rpc("six33_fuel_subscribe", {
      p_email: email,
      p_name: name,
      p_source: body.source == null ? "six33fuel.com" : String(body.source),
      p_elapsed_ms: Math.min(Number(body.elapsedMs ?? 0) | 0, 86_400_000),
      p_trap: body.trap == null ? null : String(body.trap),
      p_ref: body.ref == null ? null : String(body.ref).slice(0, 12),
      p_meta: JSON.stringify(meta).length <= 4000 ? meta : {},
    });
  } catch (err) {
    console.error("subscribe failed", err);
    return json({ ok: false, error: "Something went wrong on our end. Please try again." }, 500);
  }

  if (!sub.ok) return json(sub, 400);
  // Bot guard tripped: look successful, do nothing, give nothing away.
  if (sub.skipped) return json({ ok: true, ref_code: null });

  const base = { ok: true, is_new: !!sub.is_new, ref_code: sub.ref_code };

  let claim: { claimed: boolean; email?: string; full_name?: string; unsub_token?: string; ref_code?: string };
  try {
    claim = await rpc("six33_fuel_claim_welcome", { p_email: email });
  } catch (err) {
    console.error("claim failed", err);
    return json({ ...base, emailed: false });
  }
  if (!claim.claimed) return json({ ...base, emailed: false });

  try {
    const { subject, html, text } = welcomeEmail(claim.full_name ?? name, claim.unsub_token!, claim.ref_code!);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await resendKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [claim.email],
        reply_to: REPLY_TO,
        subject,
        html,
        text,
        tags: [{ name: "flow", value: "six33-fuel-welcome" }],
        headers: {
          "List-Unsubscribe": `<${SITE}/api/unsubscribe?token=${claim.unsub_token}>, <mailto:${REPLY_TO}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error("welcome send failed", err);
    try {
      await rpc("six33_fuel_release_welcome", { p_email: email });
    } catch (_) { /* nothing more to do */ }
    return json({ ...base, emailed: false });
  }

  return json({ ...base, emailed: true });
});
