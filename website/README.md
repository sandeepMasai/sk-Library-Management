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

## Deploy on Vercel

1. Import this repo and set **Root Directory** to `website`.
2. Framework preset: **Vite**.
3. Environment variable: `VITE_API_URL` = your Railway API URL.
4. Deploy. SPA rewrites in `vercel.json` prevent 404 on refresh.

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
