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
   | `VITE_API_URL` | `https://api.smartlibdesk.in` |

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
# paste: https://api.smartlibdesk.in
```

## APK download (`/download`)

The QR opens **`/download`**; users tap **Download APK**. The file must exist at `/downloads/SmartLibDesk-v1.0.2.apk` after deploy.

**One-time (include APK in deploy):**

```bash
cd frontend && npm run build:apk   # or copy your release APK to frontend/dist/
cd ../website && npm run copy-apk
git add public/downloads/SmartLibDesk-v1.0.2.apk
git commit -m "Add APK for website download"
git push
```

Redeploy Vercel. Check: `curl -I https://www.smartlibdesk.in/downloads/SmartLibDesk-v1.0.2.apk` → **200**.

**Or** host APK elsewhere and set on Vercel:

```env
VITE_APK_DOWNLOAD_URL=https://your-cdn.example.com/SmartLibDesk-v1.0.2.apk
```

## Verify

- Home page loads
- `/download` → Download APK works (not 404)
- `/contact` form works (backend must have contact route + `CONTACT_TO_EMAIL`)
- `/login` → library login → `/admin`
- Legal pages: `/privacy-policy`, `/terms`, `/refund-policy`

## Razorpay merchant URLs

Use your production domain in Razorpay dashboard and Super Admin global settings:

- `https://www.smartlibdesk.in`
- `https://smartlibdesk.in`

## Razorpay — website stays on **TEST mode only**

The website is configured for sandbox payments only (`VITE_RAZORPAY_TEST_ONLY=true`).

**Vercel (website):**

```env
VITE_RAZORPAY_TEST_ONLY=true
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
VITE_API_URL=https://api.smartlibdesk.in
```

**Railway (backend)** must use the **same** test pair:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your_test_secret
```

Redeploy **both** after changing keys. Test card: `4111 1111 1111 1111` (CVV `123`, expiry `12/26`) · UPI: `test@razorpay`.

Full steps: **[RAZORPAY_TEST.md](./RAZORPAY_TEST.md)**.

> Live keys (`rzp_live_*`) are documented in [RAZORPAY_LIVE.md](./RAZORPAY_LIVE.md) for later; the website blocks live checkout while test-only is enabled.

## Payment errors (401 / “Authentication failed”)

| Error | Cause | Fix |
|-------|--------|-----|
| **401** on `/api/payment/create-order` | Login token missing or expired | Sign out, sign in again at `/login`. Use one canonical URL (`www` **or** apex — not both). |
| **402** on dashboard / students | Subscription expired | Normal — pay on **Admin → Subscription** |
| **`BAD_REQUEST_ERROR` Authentication failed** | Wrong/missing Razorpay keys on **Railway backend** | Railway → Variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (live keys for production) → **Redeploy** |

Use **www only** (or apex only) in Vercel so login token stays in one `localStorage` bucket.
