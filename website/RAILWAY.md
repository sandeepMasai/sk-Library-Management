# Deploy website on Railway

Backend uses the repo root `railway.json` with `rootDirectory: backend`.  
This folder is a **separate Railway service**.

## Dashboard setup

1. Open your Railway project → **+ New** → **GitHub Repo** → same repository.
2. **Settings** → **Root Directory** → `website`
3. Railway reads `website/railway.json` automatically.
4. **Variables** (add before first deploy — `VITE_*` is baked in at build time):

   | Variable | Example |
   |----------|---------|
   | `VITE_API_URL` | `https://sk-library-management-production.up.railway.app` |

5. Deploy. Copy the public URL (e.g. `https://xxx.up.railway.app`).

## Backend service env (after website is live)

On the **backend** service, add or update:

```env
ALLOWED_ORIGINS=https://YOUR-WEBSITE.up.railway.app
WEBSITE_URL=https://YOUR-WEBSITE.up.railway.app
CORS_CREDENTIALS=true
CONTACT_TO_EMAIL=support@smartlibdesk.in
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@smartlibdesk.in
```

Redeploy backend if you changed CORS vars.

## Custom domain (optional)

Railway → website service → **Settings** → **Networking** → add domain (e.g. `smartlibdesk.in`).

## Verify

- `https://YOUR-WEBSITE/` — home page
- `/contact` — form (needs backend contact route deployed)
- `/admin/subscription` — Razorpay (library login + `RAZORPAY_*` on backend)
