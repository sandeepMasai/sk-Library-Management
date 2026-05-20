# Razorpay LIVE keys (production)

Use this when accepting **real payments** on [smartlibdesk.in](https://www.smartlibdesk.in).

## 1) Razorpay Dashboard

1. Complete **KYC** and activate **Live mode** on [dashboard.razorpay.com](https://dashboard.razorpay.com).
2. **Settings → API Keys → Live mode** → generate / copy:
   - Key ID: `rzp_live_…`
   - Key Secret (shown once — store safely)

## 2) Railway (backend only)

On service `sk-Library-Management` → **Variables**:

```env
RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_LIVE_SECRET
```

Never commit the secret to git. **Redeploy** the backend after saving.

## 3) Vercel (website — public key only)

**Project → Settings → Environment Variables → Production:**

```env
VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_ID
VITE_API_URL=https://sk-library-management-production.up.railway.app
```

`VITE_RAZORPAY_KEY_ID` must be the **same** `rzp_live_*` id as `RAZORPAY_KEY_ID` on Railway.

Do **not** add `RAZORPAY_KEY_SECRET` to Vercel.

**Redeploy** the website (env is baked at build time).

## 4) Local dev (optional)

`backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
```

`website/.env`:

```env
VITE_RAZORPAY_KEY_ID=rzp_live_...
```

Restart both servers after changes.

> Tip: For day-to-day dev, keep **test** keys locally (`rzp_test_*`) and use **live** keys only on Railway + Vercel production.

## 5) Razorpay merchant settings

In Live mode, set website URL / webhook URLs to:

- `https://www.smartlibdesk.in`
- `https://smartlibdesk.in`

## 6) Verify

1. Library login → `/admin/subscription` → Pay now  
2. Complete payment with a **real** card/UPI (real money)  
3. Razorpay Dashboard → **Live mode** → Transactions → captured  

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Authentication failed | Key id + secret must be a **live** pair from the same dashboard account |
| Key mismatch error on site | `VITE_RAZORPAY_KEY_ID` ≠ Railway `RAZORPAY_KEY_ID` → make them identical and redeploy |
| Test card `4111…` fails in live | Test cards work only in **test** mode; live needs real payment methods |
