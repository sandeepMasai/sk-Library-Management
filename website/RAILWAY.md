# Deploy website on Railway

Backend uses the repo root `railway.json` with `rootDirectory: backend`.  
This folder is a **separate Railway service**.

## Dashboard setup (one time)

1. Railway project (same as backend) → **+ New** → **GitHub Repo** → `sk-Library-Management`
2. **Settings** → **Root Directory** → `website`
3. Note the **service name** (e.g. `website` or `sk-library-management-website`)

## Deploy

### A) GitHub Actions (recommended)

Repo → **Settings** → **Secrets** → **Actions**:

| Secret | Value |
|--------|--------|
| `RAILWAY_TOKEN` | [railway.app/account/tokens](https://railway.app/account/tokens) |
| `RAILWAY_WEBSITE_SERVICE` | Service name or ID from step 3 |

Push to `main` (changes under `website/`) or run workflow **Deploy website to Railway** manually.

The workflow sets `VITE_API_URL` and runs `railway up`.

### B) CLI from your Mac

```bash
npx @railway/cli login
cd website
export RAILWAY_WEBSITE_SERVICE=your-service-name
bash scripts/deploy-railway.sh
```

### C) Railway auto-deploy

If GitHub is connected to the website service, each push to `main` may deploy automatically. Set variable:

| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `https://sk-library-management-production.up.railway.app` |

Copy the public URL from **Networking** → **Generate Domain**.

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
