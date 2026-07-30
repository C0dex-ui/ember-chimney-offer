/**
 * POST /api/lead
 * Server-side only. Emails new Ember LP leads to Yuval + Raz via Resend.
 *
 * Env (Vercel project settings):
 *   RESEND_API_KEY  — required (https://resend.com)
 *   RESEND_FROM     — required for production, e.g.
 *                     "Ember Chimney <info@yourdomain.com>"
 *                     Domain must be verified in Resend (DNS).
 *                     Falls back to onboarding@resend.dev only for testing.
 */

const TO = ["yuvalcarmel27@gmail.com", "raz2540@gmail.com"];

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8") || "";
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function clean(v, max) {
  const s = String(v == null ? "" : v).trim();
  return s.slice(0, max || 500);
}

function centralTimeStamp() {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      dateStyle: "full",
      timeStyle: "long",
    }).format(new Date());
  } catch (e) {
    return new Date().toISOString() + " (UTC)";
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return json(res, 204, {});
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  let data;
  try {
    data = await readBody(req);
  } catch (e) {
    return json(res, 400, { ok: false, error: e.message || "Bad request" });
  }

  const name = clean(data.name, 120);
  const phone = clean(data.phone, 40);
  const zip = clean(data.zip, 20);
  const message = clean(data.message, 2000);
  const page = clean(data.page, 200);
  const loc = clean(data.loc, 40);
  const kw = clean(data.kw, 200);
  const gclid = clean(data.gclid, 200);
  const service = clean(data.service, 80);

  if (!name || !phone || !zip) {
    return json(res, 400, {
      ok: false,
      error: "name, phone, and zip are required",
    });
  }

  const subject = `New Ember Lead — ${service || page || "offer"} — ${name}`;
  const body = [
    `Name:     ${name}`,
    `Phone:    ${phone}`,
    `Zip:      ${zip}`,
    `Message:  ${message || "(none)"}`,
    `Page:     ${page || "(unknown)"}`,
    `City:     ${loc || "(none)"}`,
    `Keyword:  ${kw || "(none)"}`,
    `Gclid:    ${gclid || "(none)"}`,
    `Service:  ${service || "(none)"}`,
    `Time:     ${centralTimeStamp()}`,
  ].join("\n");

  // TODO next phase: also forward payload to CRM webhook (env var), same JSON body

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[lead] RESEND_API_KEY is not set");
    // Still 200 so the client always redirects to thank-you
    return json(res, 200, {
      ok: false,
      emailed: false,
      error: "Email not configured (RESEND_API_KEY missing)",
    });
  }

  // Prefer their real mailbox identity (info@domain) once domain is verified in Resend
  const from =
    process.env.RESEND_FROM ||
    "Ember Chimney <onboarding@resend.dev>";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: TO,
        subject,
        text: body,
      }),
    });

    const result = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[lead] Resend error", r.status, result);
      return json(res, 200, {
        ok: false,
        emailed: false,
        error: "Email provider error",
      });
    }

    return json(res, 200, { ok: true, emailed: true, id: result.id || null });
  } catch (err) {
    console.error("[lead] send failed", err);
    return json(res, 200, {
      ok: false,
      emailed: false,
      error: "Email send failed",
    });
  }
};
