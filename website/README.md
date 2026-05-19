# SmartLibDesk marketing website

Standalone React site for Razorpay merchant approval and public legal pages. **Not** mixed with the Expo app in `../frontend/`.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Deploy on Vercel (recommended)

See **[VERCEL.md](./VERCEL.md)** — import repo, **Root Directory = `website`**, set `VITE_API_URL`, deploy.

Quick link: [vercel.com/new](https://vercel.com/new) → GitHub → `sk-Library-Management` → root `website`.

## Deploy on Railway (optional)

See **[RAILWAY.md](./RAILWAY.md)** if you prefer hosting the static site on Railway too.

## Local dev (CORS)

`npm run dev` proxies `/api` to Railway via Vite — **no CORS setup needed** on localhost.

## Railway (backend) after deploy

Add your **live website** origin (required for Vercel/production, not localhost):

```
ALLOWED_ORIGINS=https://your-site.vercel.app
CORS_CREDENTIALS=true
```

Optional for testing production API from localhost without proxy:

```
CORS_ALLOW_LOCALHOST=true
```

Set contact form variables:

```
CONTACT_TO_EMAIL=you@example.com
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@smartlibdesk.in
CONTACT_TO_EMAIL=support@smartlibdesk.in
```

## Razorpay + app legal URLs

After the site is live, set in Super Admin → Global Settings:

- Privacy Policy URL → `https://<site>/privacy-policy`
- Terms URL → `https://<site>/terms`
- Refund Policy URL → `https://<site>/refund-policy`

Submit the same URLs in the Razorpay merchant dashboard.
