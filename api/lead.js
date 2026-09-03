/**
 * POST /api/lead
 * Server-side only. Emails new Ember LP leads to Yuval + Raz via Resend,
 * and forwards the same lead to GoHighLevel (speed-to-lead workflow).
 *
 * Env (Vercel project settings):
 *   RESEND_API_KEY    — required for email (https://resend.com)
 *   RESEND_FROM       — e.g. "Ember Chimney <info@emberchimney.com>"
 *   GHL_WEBHOOK_URL   — Inbound Webhook URL (Ember LP Leads — Speed to Lead)
 */

const TO = ["yuvalcarmel27@gmail.com", "raz2540@gmail.com"];

const GEO = {
  "1026178": "Allen",
  "1026193": "Argyle",
  "1026215": "Bedford",
  "1026271": "Carrollton",
  "1026278": "Celina",
  "1026306": "Colleyville",
  "1026317": "Coppell",
  "1026339": "Dallas",
  "1026350": "Denton",
  "1026385": "Euless",
  "1026398": "Flower Mound",
  "1026411": "Fort Worth",
  "1026407": "Frisco",
  "1026441": "Grapevine",
  "9052131": "Highland Park",
  "9052132": "Highland Village",
  "1026490": "Hurst",
  "1026518": "Keller",
  "9189634": "Lantana",
  "1026556": "Lewisville",
  "1026562": "Little Elm",
  "1026607": "McKinney",
  "1026658": "North Richland Hills",
  "1026695": "Plano",
  "1026716": "Prosper",
  "1026729": "Richardson",
  "1026741": "Rockwall",
  "1026804": "Southlake",
  "1026836": "The Colony",
  "9053007": "Trophy Club",
  "9053028": "University Park",
  "9053138": "Westlake",
};

const SERVICE_LABELS = {
  "chimney-sweep": "Chimney Sweep",
  "chimney-inspection": "Chimney Inspection",
  "chimney-repair": "Chimney Repair",
  "fireplace-repair": "Fireplace Repair",
  "fireplace-installation": "Fireplace & Gas Log Installation",
  "chimney-cap": "Chimney Cap",
};

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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function serviceLabel(service, page) {
  if (service && SERVICE_LABELS[service]) return SERVICE_LABELS[service];
  if (service) return service;
  const m = String(page || "").match(/\/offer\/([^/]+)/);
  if (m && SERVICE_LABELS[m[1]]) return SERVICE_LABELS[m[1]];
  return "Offer landing page";
}

function cityDisplay(loc) {
  if (!loc) return "—";
  if (GEO[loc]) return `${GEO[loc]} (${loc})`;
  return loc;
}

function dash(v) {
  return v && String(v).trim() ? String(v).trim() : "—";
}

function phoneHref(phone) {
  const digits = String(phone).replace(/[^\d+]/g, "");
  if (!digits) return "";
  return digits.startsWith("+") ? digits : "+1" + digits.replace(/^1/, "");
}

function buildTextEmail(fields) {
  return [
    "NEW EMBER CHIMNEY LEAD",
    "======================",
    "",
    `Name:     ${fields.name}`,
    `Phone:    ${fields.phone}`,
    `Zip:      ${fields.zip}`,
    `Message:  ${fields.message || "(none)"}`,
    "",
    `Service:  ${fields.serviceLabel}`,
    `Page:     ${fields.page || "(unknown)"}`,
    `City:     ${fields.cityLine}`,
    `Keyword:  ${fields.kw || "(none)"}`,
    `Gclid:    ${fields.gclid || "(none)"}`,
    `Time:     ${fields.time}`,
    "",
    "— Ember Chimney landing page form",
  ].join("\n");
}

function row(label, valueHtml) {
  return `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #eceff3;width:34%;font-size:13px;font-weight:700;color:#5a6270;vertical-align:top;">
        ${label}
      </td>
      <td style="padding:12px 14px;border-bottom:1px solid #eceff3;font-size:15px;color:#1a1a1a;vertical-align:top;line-height:1.45;">
        ${valueHtml}
      </td>
    </tr>`;
}

function buildHtmlEmail(fields) {
  const tel = phoneHref(fields.phone);
  const phoneCell = tel
    ? `<a href="tel:${escapeHtml(tel)}" style="color:#d25910;font-weight:700;text-decoration:none;">${escapeHtml(fields.phone)}</a>`
    : escapeHtml(fields.phone);

  const messageCell = fields.message
    ? `<div style="white-space:pre-wrap;">${escapeHtml(fields.message)}</div>`
    : `<span style="color:#9aa3af;">(none)</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Ember Lead</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Montserrat,Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e8ec;box-shadow:0 10px 30px rgba(15,39,68,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f2744 0%,#16345a 55%,#d25910 160%);padding:22px 24px 20px;">
              <div style="font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.75);margin-bottom:8px;">
                New website lead
              </div>
              <div style="font-size:22px;font-weight:800;color:#ffffff;line-height:1.25;letter-spacing:-0.02em;">
                ${escapeHtml(fields.name)}
              </div>
              <div style="margin-top:8px;font-size:14px;color:rgba(255,255,255,0.9);">
                ${escapeHtml(fields.serviceLabel)} · Ember Chimney LP
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 10px 4px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                ${row("Name", escapeHtml(fields.name))}
                ${row("Phone", phoneCell)}
                ${row("Zip", escapeHtml(fields.zip))}
                ${row("Message", messageCell)}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:4px 24px 8px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#9aa3af;margin:8px 0 4px 0;">
                Tracking
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 10px 10px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f7f8fa;border-radius:12px;">
                ${row("Service", escapeHtml(fields.serviceLabel))}
                ${row("Page", `<span style="word-break:break-all;">${escapeHtml(dash(fields.page))}</span>`)}
                ${row("City", escapeHtml(fields.cityLine))}
                ${row("Keyword", escapeHtml(dash(fields.kw)))}
                ${row("Gclid", `<span style="word-break:break-all;font-size:13px;color:#5a6270;">${escapeHtml(dash(fields.gclid))}</span>`)}
                ${row("Time", escapeHtml(fields.time))}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 22px;">
              <a href="tel:${escapeHtml(tel || fields.phone)}" style="display:inline-block;background:#d25910;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 18px;border-radius:10px;">
                Call ${escapeHtml(fields.phone)}
              </a>
              <div style="margin-top:16px;font-size:12px;line-height:1.5;color:#9aa3af;">
                Sent automatically from the Ember Chimney offer landing pages.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

  const fields = {
    name,
    phone,
    zip,
    message,
    page,
    loc,
    kw,
    gclid,
    service,
    serviceLabel: serviceLabel(service, page),
    cityLine: cityDisplay(loc),
    time: centralTimeStamp(),
  };

  const subject = `New Ember Lead — ${fields.serviceLabel} — ${name}`;
  const text = buildTextEmail(fields);
  const html = buildHtmlEmail(fields);

  // GHL inbound webhook payload (keys match workflow mapping + site aliases)
  const ghlPayload = {
    name,
    phone,
    zip,
    message,
    page,
    city_param: loc,
    kw_param: kw,
    gclid,
    loc,
    kw,
    service,
  };

  const ghlPromise = forwardToGhl(ghlPayload);
  const emailPromise = sendResendEmail({ subject, text, html });

  const [ghl, emailed] = await Promise.all([ghlPromise, emailPromise]);

  return json(res, 200, {
    ok: !!(emailed.ok || ghl.ok),
    emailed: !!emailed.ok,
    ghl: !!ghl.ok,
    id: emailed.id || null,
    error: emailed.ok || ghl.ok ? undefined : emailed.error || ghl.error,
  });
};

/** Forward lead to GHL; never throws — failures are logged only. */
async function forwardToGhl(payload) {
  const url = (process.env.GHL_WEBHOOK_URL || "").trim();
  if (!url) {
    return { ok: false, skipped: true, error: "GHL_WEBHOOK_URL not set" };
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const bodyText = await r.text().catch(() => "");
    if (!r.ok) {
      console.error("[lead] GHL webhook error", r.status, bodyText.slice(0, 300));
      return { ok: false, error: "GHL webhook error" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[lead] GHL webhook failed", err);
    return { ok: false, error: "GHL webhook failed" };
  }
}

async function sendResendEmail({ subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[lead] RESEND_API_KEY is not set");
    return { ok: false, error: "Email not configured (RESEND_API_KEY missing)" };
  }

  const from =
    process.env.RESEND_FROM || "Ember Chimney <info@emberchimney.com>";

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
        text,
        html,
      }),
    });

    const result = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[lead] Resend error", r.status, result);
      return { ok: false, error: "Email provider error" };
    }

    return { ok: true, id: result.id || null };
  } catch (err) {
    console.error("[lead] send failed", err);
    return { ok: false, error: "Email send failed" };
  }
}
