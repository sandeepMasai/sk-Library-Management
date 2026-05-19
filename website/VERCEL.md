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

## 2) Backend CORS (Railway) — required for login

The website calls the API from the browser. Railway must allow your site **origin** or login fails with a CORS error.

On your **backend** Railway service (`sk-Library-Management`) → **Variables**:

### Custom domain `smartlibdesk.in` (production)

```env
WEBSITE_URL=https://www.smartlibdesk.in
ALLOWED_ORIGINS=https://www.smartlibdesk.in,https://smartlibdesk.in
CORS_ALLOW_SMARTLIBDESK=true
CORS_CREDENTIALS=true
```

`WEBSITE_URL` also auto-adds the `www` / non-`www` pair. `CORS_ALLOW_SMARTLIBDESK=true` allows `https://www.smartlibdesk.in` and `https://smartlibdesk.in`.

### Vercel preview URLs (optional)

```env
CORS_ALLOW_VERCEL=true
```

**Redeploy the backend** after saving variables (and after pushing the latest `httpStack.js` CORS changes).

## 3) Custom domain

Vercel project → **Settings** → **Domains** → add `smartlibdesk.in` and `www.smartlibdesk.in` → point DNS as Vercel instructs.

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
