# Razorpay LIVE keys — full app go-live

Real payments on **website** ([smartlibdesk.in](https://www.smartlibdesk.in)) and **mobile app** (Expo).  
The mobile app does **not** need a Razorpay key in `.env` — it gets `keyId` from the backend `POST /api/payment/create-order`.

---

## Checklist (do in this order)

### 1) Razorpay Dashboard

1. [dashboard.razorpay.com](https://dashboard.razorpay.com) → **KYC complete** → **Live mode** ON (top toggle).
2. **Settings → API Keys → Live mode** → copy:
   - `rzp_live_…` (Key ID)
   - Key Secret (shown once — save safely)
3. **Settings → Website & app details** → add:
   - `https://www.smartlibdesk.in`
   - `https://smartlibdesk.in`

---

### 2) Railway — backend (secret + key id)

Service: `sk-Library-Management` → **Variables** → update:

```env
RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_LIVE_SECRET
```

Keep existing CORS vars:

```env
WEBSITE_URL=https://www.smartlibdesk.in
ALLOWED_ORIGINS=https://www.smartlibdesk.in,https://smartlibdesk.in
CORS_ALLOW_SMARTLIBDESK=true
CORS_CREDENTIALS=true
```

**Deploy / Redeploy** the backend.

Verify (on your Mac, with live keys in `backend/.env` only — do not commit):

```bash
cd backend && npm run verify:razorpay
```

Must show: `✅ Razorpay keys are VALID` and mode **live**.

---

### 3) Vercel — website (public key only)

**Project → Settings → Environment Variables → Production:**

```env
VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_ID
VITE_RAZORPAY_TEST_ONLY=false
VITE_API_URL=https://sk-library-management-production.up.railway.app
```

| Variable | Important |
|----------|-----------|
| `VITE_RAZORPAY_TEST_ONLY=false` | **Required** — otherwise live keys are blocked |
| `VITE_RAZORPAY_KEY_ID` | Must match Railway `RAZORPAY_KEY_ID` exactly |
| Never add `RAZORPAY_KEY_SECRET` to Vercel | Secret stays on Railway only |

**Redeploy** the website (env is baked at build time).

---

### 4) Mobile app (Expo / Play Store)

No Razorpay env in the app. Only the API URL:

`frontend/.env` or `eas.json` (already set for production):

```env
EXPO_PUBLIC_API_URL=https://sk-library-management-production.up.railway.app
```

After Railway has **live** keys:

1. Users on an **old APK** still work — payments use whatever keys the **server** returns.
2. For a **new store build**: `cd frontend && eas build --profile production`
3. Test on a real device: Library login → Subscription / Plan → Pay → real UPI or card.

---

### 5) Local development (optional)

Keep **test** keys locally so you do not charge real money while coding:

`backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

`website/.env`:

```env
VITE_RAZORPAY_KEY_ID=rzp_test_...
VITE_RAZORPAY_TEST_ONLY=true
```

Production = live keys only on **Railway + Vercel**.

---

### 6) First live payment test

1. Website: login → `/admin/subscription` → Pay now → **real** UPI or card (small amount).
2. App: same flow on phone.
3. Razorpay Dashboard → **Live mode** → **Transactions** → **captured**.

Test cards (`4111…`) and `test@razorpay` **do not work** in live mode.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “This website uses Razorpay TEST mode only” | Vercel: `VITE_RAZORPAY_TEST_ONLY=false` + redeploy |
| Key mismatch | `VITE_RAZORPAY_KEY_ID` = Railway `RAZORPAY_KEY_ID` (same `rzp_live_*`) |
| Authentication failed | Regenerate live key pair; update Railway secret; redeploy |
| App payment fails, website works | Railway keys OK; check app login + `EXPO_PUBLIC_API_URL` |
| Test card fails in live | Expected — use real payment in live mode |

---

## Quick reference

| Place | `RAZORPAY_KEY_ID` | `RAZORPAY_KEY_SECRET` | `VITE_RAZORPAY_*` |
|-------|-------------------|------------------------|-------------------|
| Railway | `rzp_live_*` | ✅ yes | — |
| Vercel | — | ❌ never | `rzp_live_*` + `TEST_ONLY=false` |
| Mobile app | — (from API) | ❌ never | — |
| Local dev | `rzp_test_*` | ✅ yes | `rzp_test_*` + `TEST_ONLY=true` |
