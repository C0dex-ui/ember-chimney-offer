# Ember LP tracking + lead email

## What’s installed

| Piece | Where | Purpose |
|--------|--------|---------|
| CallRail `swap.js` | All 6 offer pages (end of `<body>`) | Swaps visible phone when `?gclid=` present |
| Google Ads gtag `AW-18337676973` | All 6 pages (`<head>`) | Base tag |
| Conversion `AW-18337676973/hrOACJfpptkcEK39iqhE` | **thank-you only** | Form lead conversion |
| `POST /api/lead` | Vercel serverless | Emails Yuval + Raz via Resend |
| Form submit in `assets/js/lp.js` | 5 offer pages | POST lead → always redirect to thank-you |

**Phone numbers in HTML are unchanged:** `(844) 803-0373` / `tel:+18448030373`.

## Vercel env vars (required for email)

Project → Settings → Environment Variables (Production + Preview):

```
RESEND_API_KEY=re_...
RESEND_FROM=Ember Chimney <info@YOUR-DOMAIN.com>
```

They already have **info@domain** — use that as the From address **after** the domain is verified in Resend.

### Connect `info@domain.com` to Resend

1. Create/login at https://resend.com → create an API key  
2. **Domains → Add domain** = the domain of `info@...` (e.g. `emberchimney.com`)  
3. Add the DNS records Resend gives you (SPF + DKIM) at the domain DNS host  
4. Wait until Resend shows the domain as **Verified**  
5. In Vercel set:
   - `RESEND_API_KEY`
   - `RESEND_FROM=Ember Chimney <info@that-domain.com>`  
6. Redeploy  

**Important:** Having `info@` in Google/Outlook is not enough by itself. Resend can only send *as* that address if the **domain DNS** is verified in Resend. This does not replace or delete their existing inbox — it only authorizes sending.

If `RESEND_API_KEY` is missing, the API still returns 200 and the form **still redirects** to thank-you (so conversion tracking works). Check Vercel function logs for `[lead]`.

## Deploy

```bash
git push
# or: vercel --prod
```

## Verification (incognito, after deploy)

1. Offer page + `?gclid=test` → number may swap to tracking # (often 817) within ~1–2s  
2. No `gclid` → stays (844) 803-0373  
3. `?gclid=test&loc=1026804&kw=chimney%20cleaning` on sweep → tracking # + H1 city/kw  
4. Submit form name `Test DELETE` → lands on `/offer/thank-you/`  
5. DevTools Network → `googleadservices` / conversion request on thank-you  
6. Both inboxes receive lead email  
7. No console errors  
8. Repeat on mobile 375px  

### CallRail DNI not swapping?

Code already loads official `swap.js` (no `async`) before `</body>` and uses format `(844) 803-0373`.

If the number stays 844 with `?gclid=test` in a **fresh private window**:

1. **CallRail → company → source / website pool**  
   - Landing domain must include `ember-chimney.vercel.app` (and any custom domain)  
2. **Swap target** must match the number on the site: `844-803-0373` / `(844) 803-0373`  
3. **Number pool** must have available tracking numbers  
4. Use CallRail **Integrations → JavaScript Snippet → Test** (auto-test) against the live URL  
5. Retest only with `?gclid=test` (CallRail docs) in a new incognito window, no ad blockers  

Recipients:

- yuvalcarmel27@gmail.com  
- raz2540@gmail.com  
