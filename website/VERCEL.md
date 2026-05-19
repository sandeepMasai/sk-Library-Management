# Deploy website on Vercel

Vercel is the recommended host for this Vite + React site (easier than a second Railway service).

## 1) Connect GitHub (one time)

1. Open [vercel.com/new](https://vercel.com/new)
2. **Import** repo: `sandeepMasai/sk-Library-Management`
3. **Root Directory** → click **Edit** → set to: `website`
4. Framework: **Vite** (auto-detected)
5. **Environment Variables** → add:

   | Name | Value |
   |------|--------|
   | `VITE_API_URL` | `https://sk-library-management-production.up.railway.app` |

6. **Deploy**

Your site will be live at something like: `https://sk-library-management-xxx.vercel.app`

## 2) Backend CORS (Railway)

On your **backend** Railway service (`sk-Library-Management`) → **Variables**:

```env
CORS_ALLOW_VERCEL=true
CORS_CREDENTIALS=true
WEBSITE_URL=https://YOUR-PRODUCTION-URL.vercel.app
ALLOWED_ORIGINS=https://YOUR-PRODUCTION-URL.vercel.app
```

`CORS_ALLOW_VERCEL=true` allows **all** `*.vercel.app` preview URLs (each deploy gets a new subdomain).

**Redeploy the backend** after saving variables (and after pulling latest backend code with CORS fix).

## 3) Custom domain (optional)

Vercel project → **Settings** → **Domains** → add e.g. `smartlibdesk.in`

## 4) CLI deploy (optional)

```bash
cd website
npm install
npx vercel login
npx vercel link          # pick your team, link project
npx vercel --prod
```

Set env on Vercel first:

```bash
npx vercel env add VITE_API_URL production
# paste: https://sk-library-management-production.up.railway.app
```

## Verify

- Home page loads
- `/contact` form works (backend must have contact route + `CONTACT_TO_EMAIL`)
- `/login` → library login → `/admin`
- Legal pages: `/privacy-policy`, `/terms`, `/refund-policy`

## Razorpay merchant URLs

Use your Vercel domain in Razorpay dashboard and Super Admin global settings.
