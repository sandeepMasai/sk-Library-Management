# SmartLibDesk — Marketing & Web App

Standalone **Vite + React** website for SmartLibDesk: public marketing pages, legal policies (Razorpay merchant approval), library registration, web admin dashboard, super-admin console, and Android APK download.

**Production:** [https://www.smartlibdesk.in](https://www.smartlibdesk.in)

This project lives in `website/` and is **separate** from the Expo mobile app in `../frontend/` and the Express API in `../backend/`.

---

## Table of contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Features](#features)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [npm scripts](#npm-scripts)
- [Routes & pages](#routes--pages)
- [Authentication & roles](#authentication--roles)
- [API integration](#api-integration)
- [Android APK download](#android-apk-download)
- [Razorpay payments](#razorpay-payments)
- [SEO](#seo)
- [Build & preview](#build--preview)
- [Deployment](#deployment)
- [Backend configuration (CORS & email)](#backend-configuration-cors--email)
- [Legal URLs (Razorpay & Super Admin)](#legal-urls-razorpay--super-admin)
- [Troubleshooting](#troubleshooting)
- [Related documentation](#related-documentation)

---

## Overview

| Item | Detail |
|------|--------|
| **Package name** | `smartlibdesk-website` |
| **Purpose** | Marketing site, legal pages, library login/register, web admin, super-admin, APK hosting |
| **API backend** | Express on Railway (`../backend/`) |
| **Mobile app** | React Native / Expo (`../frontend/`) |
| **Recommended host** | [Vercel](https://vercel.com) (root directory: `website`) |
| **Alternate host** | Railway (see [RAILWAY.md](./RAILWAY.md)) |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| UI | React 19, React Router 7 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Language | TypeScript 5.8 |
| Static serve (Railway) | `serve` (SPA mode) |
| Payments | Razorpay Standard Checkout (web) |
| SEO | Per-route meta via `usePageSeo`, JSON-LD, auto-generated `sitemap.xml` |

**Node.js:** `>= 18` (see `package.json` → `engines`)

---

## Features

### Public marketing

- **Home** — hero, stats, how-it-works, daily workflow, testimonials, FAQ
- **About** — company and product story
- **Services** — feature grid (students, QR attendance, seats, notifications, billing, reports)
- **Pricing** — subscription plans (Trial ₹99, Monthly ₹999, 6 Month ₹4999, Yearly ₹9999)
- **Contact** — form → `POST /api/public/contact` (requires backend email config)
- **Download app** — APK download page + QR for mobile install

### Legal (Razorpay & compliance)

- `/privacy-policy`
- `/terms`
- `/refund-policy`

### Auth & onboarding

- **Register** — new library signup (email verification flow via backend)
- **Login** — library owner login → redirects to `/admin`
- **Super Admin login** — `/superadmin/login` → platform admin dashboard

### Library admin (`/admin/*`)

Requires **library** role JWT.

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard overview |
| `/admin/students` | Add, edit, manage students |
| `/admin/attendance` | Daily QR token for check-in |
| `/admin/seats` | Seat allocation & shifts |
| `/admin/subscription` | Plan selection + Razorpay checkout |
| `/admin/settings` | Library profile & settings |

### Super admin (`/superadmin/*`)

Requires **admin** role JWT.

| Route | Purpose |
|-------|---------|
| `/superadmin/dashboard` | Platform overview |
| `/superadmin/libraries` | All registered libraries |
| `/superadmin/subscriptions` | Subscription management |
| `/superadmin/students` | Cross-library student view |

### Content configuration

Marketing copy, plans, nav links, and FAQs are centralized in:

`src/content/site.ts`

---

## Project structure

```
website/
├── index.html                 # Default meta, OG, Twitter, favicons
├── package.json
├── vite.config.ts             # React, Tailwind, /api proxy (dev), build chunks
├── vercel.json                # SPA rewrites, www redirect, security headers, /apk redirect
├── railway.json               # Railway build/start for optional website hosting
├── tsconfig.json
├── .env.example               # Template for local / Vercel env vars
│
├── public/
│   ├── robots.txt
│   ├── sitemap.xml            # Regenerated on each build (prebuild script)
│   ├── site.webmanifest
│   ├── favicon.svg
│   ├── favicon.png
│   ├── logo.png
│   └── downloads/             # SmartLibDesk-v1.0.2.apk (via copy-apk script)
│
├── scripts/
│   ├── generate-sitemap.mjs   # Writes public/sitemap.xml before build
│   └── copy-apk.mjs           # Copies APK from frontend build into public/downloads
│
└── src/
    ├── main.tsx
    ├── router.tsx             # All routes
    ├── content/site.ts        # Site copy, plans, nav, FAQ
    ├── pages/                 # Marketing, legal, login, register, download
    ├── admin/                 # Library admin layout + pages + API helpers
    ├── superadmin/            # Super admin layout + pages + API helpers
    ├── components/            # Layout, Header, Footer, UI, LegalLayout, etc.
    ├── context/AuthContext.tsx
    ├── lib/
    │   ├── http.ts            # API client, tokens, refresh, dev proxy
    │   ├── auth.ts            # loginLibrary, loginAdmin, session helpers
    │   ├── api.ts             # Contact form
    │   ├── razorpayWeb.ts     # Razorpay checkout loader + flow
    │   ├── razorpayConfig.ts
    │   └── appDownload.ts     # APK URL helpers
    ├── seo/                   # config, Seo, usePageSeo, structuredData
    └── data/indiaLocations.ts # State/city for registration forms
```

---

## Prerequisites

1. **Node.js** 18 or newer
2. **npm** (comes with Node)
3. **Backend API** running locally or on Railway (for login, admin, contact, payments)
4. **MongoDB** configured on the backend (see `../backend/README.md`)

---

## Quick start

```bash
cd website
cp .env.example .env
# Edit .env — set VITE_API_URL to your local or Railway backend
npm install
npm run dev
```

Open **http://localhost:5173**

### Local dev notes

- Vite proxies **`/api`** to `VITE_API_URL` (or `http://127.0.0.1:1998` by default) — **no CORS setup needed** on localhost.
- For **QR attendance testing on a phone**, set `VITE_DEV_ORIGIN` to your machine’s LAN IP (from the Network URL Vite prints), not `localhost`.
- Run the backend separately: `npm run dev` in `../backend/` (default port may differ; match `VITE_API_URL`).

---

## Environment variables

Copy `.env.example` to `.env`. Variables prefixed with `VITE_` are embedded at **build time** (set them on Vercel/Railway before deploy).

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes (prod) | Backend base URL, no trailing slash. Example: `https://sk-library-management-production.up.railway.app` |
| `VITE_RAZORPAY_KEY_ID` | For payments | Public Razorpay key (`rzp_test_*` or `rzp_live_*`). **Never** put secret here. |
| `VITE_RAZORPAY_TEST_ONLY` | Recommended | `true` = sandbox only on website. Set `false` only when going live with matching live keys. |
| `VITE_APK_DOWNLOAD_URL` | Optional | Full URL if APK is hosted on CDN/Supabase instead of `/downloads/` |
| `VITE_DEV_ORIGIN` | Optional (dev) | LAN origin for QR links, e.g. `http://192.168.1.10:5173` |

### Example `.env` (local)

```env
VITE_API_URL=http://127.0.0.1:1998
VITE_RAZORPAY_TEST_ONLY=true
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
# VITE_DEV_ORIGIN=http://192.168.1.10:5173
```

### Example Vercel (production)

```env
VITE_API_URL=https://sk-library-management-production.up.railway.app
VITE_RAZORPAY_TEST_ONLY=true
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
```

Backend must use the **same** Razorpay key pair (`RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` on Railway).

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server with `--host` (LAN accessible) |
| `npm run build` | `prebuild` (sitemap + copy-apk) then production bundle → `dist/` |
| `npm run preview` | Serve `dist/` locally after build |
| `npm run copy-apk` | Copy Android APK into `public/downloads/` |
| `npm run deploy:vercel` | `vercel --prod` (CLI deploy) |
| `npm start` | Serve `dist/` on `PORT` (default 3000) — used by Railway |

**prebuild** automatically runs:

1. `node scripts/generate-sitemap.mjs`
2. `node scripts/copy-apk.mjs`

---

## Routes & pages

### Public (marketing layout)

| Path | Page | Indexed (sitemap) |
|------|------|-------------------|
| `/` | Home | Yes |
| `/about` | About | Yes |
| `/services` | Services | No (alias: `/courses`) |
| `/courses` | Services (same component) | Yes |
| `/pricing` | Pricing | No |
| `/contact` | Contact | Yes |
| `/download` | Download Android APK | Yes |
| `/login` | Library login | No (`noindex`) |
| `/register` | Library registration | No |
| `/dashboard` | User dashboard (protected) | No |
| `/privacy-policy` | Privacy Policy | Yes |
| `/terms` | Terms & Conditions | Yes |
| `/refund-policy` | Refund Policy | Yes |

### Admin & super admin

| Path | Access |
|------|--------|
| `/admin`, `/admin/*` | Library role |
| `/superadmin/login` | Public login form |
| `/superadmin/*` | Admin role |

### Redirects (Vercel)

- `smartlibdesk.in` → `https://www.smartlibdesk.in` (canonical www)
- `/apk` → `/downloads/SmartLibDesk-v1.0.2.apk`

---

## Authentication & roles

| Role | Login | Storage keys |
|------|-------|----------------|
| `library` | `/login` (email + password) | `sld_auth_token`, `sld_refresh_token` |
| `admin` | `/superadmin/login` (username + PIN) | Same |
| `student` | Mobile app primarily | — |

- Sessions use JWT access + refresh tokens via `src/lib/http.ts`.
- On **401**, the client attempts silent refresh; on failure, tokens are cleared and user is logged out.
- **Use one canonical domain** (`www` or apex only) in production so `localStorage` is not split between hosts.

Protected routes use `src/components/ProtectedRoute.tsx` with optional `roles={['library']}` or `roles={['admin']}`.

---

## API integration

| Concern | Behavior |
|---------|----------|
| **Development** | Requests go to `/api/...` → Vite proxy → `VITE_API_URL` |
| **Production** | Requests go directly to `VITE_API_URL` + path |
| **Auth header** | `Authorization: Bearer <token>` from `localStorage` |

### Common endpoints (website)

| Feature | Method | Path |
|---------|--------|------|
| Library login | POST | `/api/auth/login` |
| Token refresh | POST | `/api/auth/refresh` |
| Contact form | POST | `/api/public/contact` |
| Create payment order | POST | `/api/payment/create-order` |
| Verify payment | POST | `/api/payment/verify` |
| Super admin login | POST | `/api/admin/login` |

Admin and super-admin pages use helpers in `src/admin/api/` and `src/superadmin/api/`.

---

## Android APK download

The **Download** page (`/download`) shows install instructions and a download button.

| Item | Value |
|------|--------|
| **File name** | `SmartLibDesk-v1.0.2.apk` |
| **Public path** | `/downloads/SmartLibDesk-v1.0.2.apk` |
| **Short URL** | `/apk` (Vercel redirect) |

### Include APK in deploy

```bash
# Build APK in frontend (if applicable)
cd ../frontend && npm run build:apk

# Copy into website
cd ../website && npm run copy-apk

# Commit and deploy
git add public/downloads/SmartLibDesk-v1.0.2.apk
git commit -m "Add APK for website download"
git push
```

Verify after deploy:

```bash
curl -I https://www.smartlibdesk.in/downloads/SmartLibDesk-v1.0.2.apk
# Expect HTTP 200
```

**Alternative:** host APK elsewhere and set `VITE_APK_DOWNLOAD_URL` on Vercel.

---

## Razorpay payments

Library subscriptions are paid on **Admin → Subscription** via Razorpay Standard Checkout.

### Flow

1. `POST /api/payment/create-order` → order ID + amount (paise)
2. Load `https://checkout.razorpay.com/v1/checkout.js`
3. Open Razorpay modal (`src/lib/razorpayWeb.ts`)
4. On success → `POST /api/payment/verify`

### Test mode (recommended for website)

| Where | Variables |
|-------|-----------|
| Website (Vercel) | `VITE_RAZORPAY_TEST_ONLY=true`, `VITE_RAZORPAY_KEY_ID=rzp_test_*` |
| Backend (Railway) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (same test pair) |

**Test card:** `4111 1111 1111 1111` · CVV `123` · Expiry `12/26`  
**Test UPI:** `test@razorpay`

Verify backend keys:

```bash
cd ../backend && npm run verify:razorpay
```

See **[RAZORPAY_TEST.md](./RAZORPAY_TEST.md)**, **[RAZORPAY_LIVE.md](./RAZORPAY_LIVE.md)**, **[RAZORPAY_INTEGRATION.md](./RAZORPAY_INTEGRATION.md)**.

---

## SEO

- **Canonical URL:** `https://www.smartlibdesk.in`
- **Per-route SEO:** `src/seo/config.ts` + `usePageSeo` in layout
- **Structured data:** Organization, WebSite, Service (JSON-LD)
- **Sitemap:** auto-generated on build (`public/sitemap.xml`)
- **robots.txt:** allows marketing routes; disallows admin/auth paths

After deploy, submit sitemap in [Google Search Console](https://search.google.com/search-console):

`https://www.smartlibdesk.in/sitemap.xml`

Full guide: **[SEO.md](./SEO.md)**

---

## Build & preview

```bash
npm run build    # Generates sitemap, copies APK, outputs to dist/
npm run preview  # http://localhost:4173 (default Vite preview port)
```

Production build splits vendor chunk (`react`, `react-dom`, `react-router-dom`) for caching.

---

## Deployment

### Vercel (recommended)

1. [vercel.com/new](https://vercel.com/new) → Import `sk-Library-Management`
2. **Root Directory:** `website`
3. **Environment:** `VITE_API_URL` (+ Razorpay vars if using payments)
4. Deploy

**Custom domain:** `www.smartlibdesk.in` + `smartlibdesk.in` (apex redirects to www via `vercel.json`)

CLI:

```bash
cd website
npm install
npx vercel login
npx vercel link
npx vercel env add VITE_API_URL production
npx vercel --prod
```

Full steps: **[VERCEL.md](./VERCEL.md)**

### Railway (optional)

Separate Railway service with root directory `website`. Uses `npm run build` + `npm start`.

Full steps: **[RAILWAY.md](./RAILWAY.md)**

---

## Backend configuration (CORS & email)

After the website is live, update the **backend** Railway service (`../backend/`).

### CORS (required for browser login)

**Custom domain:**

```env
WEBSITE_URL=https://www.smartlibdesk.in
ALLOWED_ORIGINS=https://www.smartlibdesk.in,https://smartlibdesk.in
CORS_ALLOW_SMARTLIBDESK=true
CORS_CREDENTIALS=true
```

**Vercel preview URLs (optional):**

```env
CORS_ALLOW_VERCEL=true
```

**Local testing against production API (optional):**

```env
CORS_ALLOW_LOCALHOST=true
```

Redeploy the backend after changing CORS variables.

### Contact form email

```env
CONTACT_TO_EMAIL=support@smartlibdesk.in
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@smartlibdesk.in
```

---

## Legal URLs (Razorpay & Super Admin)

After deploy, set these in **Super Admin → Global Settings** and in the **Razorpay merchant dashboard**:

| Policy | URL |
|--------|-----|
| Privacy | `https://www.smartlibdesk.in/privacy-policy` |
| Terms | `https://www.smartlibdesk.in/terms` |
| Refund | `https://www.smartlibdesk.in/refund-policy` |
| Website | `https://www.smartlibdesk.in` |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| CORS error on login | Backend missing website origin | Set `ALLOWED_ORIGINS` / `WEBSITE_URL` on Railway; redeploy backend |
| 401 on `/api/payment/create-order` | Expired or missing JWT | Log out and log in again; use single canonical domain (www or apex) |
| `BAD_REQUEST_ERROR` Authentication failed (Razorpay) | Mismatched or missing keys on **backend** | Set `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` on Railway; redeploy |
| 402 on admin pages | Subscription expired | Pay at **Admin → Subscription** |
| APK 404 on `/download` | APK not in `public/downloads/` | Run `npm run copy-apk`, commit APK, redeploy |
| QR opens wrong URL on phone | Using `localhost` in QR | Set `VITE_DEV_ORIGIN` to LAN IP |
| Contact form fails | Backend email not configured | Set `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_TO_EMAIL` |
| SEO page 404 on refresh | Host missing SPA rewrite | Use Vercel (`vercel.json`) or `serve -s` on Railway |

### Post-deploy checklist

- [ ] Home page loads
- [ ] `/download` — APK downloads (HTTP 200)
- [ ] `/contact` — form sends email
- [ ] `/login` → library login → `/admin`
- [ ] Legal pages load: `/privacy-policy`, `/terms`, `/refund-policy`
- [ ] `curl https://www.smartlibdesk.in/sitemap.xml`
- [ ] `curl https://www.smartlibdesk.in/robots.txt`

---

## Related documentation

| File | Topic |
|------|--------|
| [VERCEL.md](./VERCEL.md) | Vercel deploy, domains, APK, Razorpay on Vercel |
| [RAILWAY.md](./RAILWAY.md) | Railway website service deploy |
| [SEO.md](./SEO.md) | SEO structure, Search Console, sitemap |
| [RAZORPAY_INTEGRATION.md](./RAZORPAY_INTEGRATION.md) | Payment API flow |
| [RAZORPAY_TEST.md](./RAZORPAY_TEST.md) | Sandbox testing |
| [RAZORPAY_LIVE.md](./RAZORPAY_LIVE.md) | Live keys (when ready) |
| [../backend/README.md](../backend/README.md) | API & MongoDB setup |
| [../frontend/README.md](../frontend/README.md) | Expo mobile app |

---

## Support

- **Email:** support@smartlibdesk.in  
- **Product:** SmartLibDesk — library management for study halls and institutes across India

---

## License

Part of the **sk-Library-Management** monorepo. See repository root for license terms.
