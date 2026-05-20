# Razorpay test payment (website)

**This website is TEST-only** (`VITE_RAZORPAY_TEST_ONLY=true`). Use `rzp_test_*` keys on Railway and Vercel — live keys are blocked at checkout.

Use this to satisfy Razorpay’s **“Do a test transaction”** check for [smartlibdesk.in](https://www.smartlibdesk.in).

## 1) Keys must be **Test mode**

In [Razorpay Dashboard](https://dashboard.razorpay.com) → toggle **Test mode** (top).

On **Railway** (backend service `sk-Library-Management`) set:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your_test_secret
```

- Key ID must start with `rzp_test_` (not `rzp_live_`).
- Copy from **Settings → API Keys → Test mode**.
- **Redeploy** the backend after changing variables.

**Website** (`website/.env` or Vercel env) — public key only:

```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
```

Must be the **same** `rzp_test_*` id as `RAZORPAY_KEY_ID` on the backend. Never put `RAZORPAY_KEY_SECRET` in Vite/frontend.

On **Vercel** (website), set `VITE_API_URL` + `VITE_RAZORPAY_KEY_ID`, then redeploy the website build.

## 2) Site must allow your domain (CORS)

Railway backend:

```env
WEBSITE_URL=https://www.smartlibdesk.in
ALLOWED_ORIGINS=https://www.smartlibdesk.in,https://smartlibdesk.in
CORS_ALLOW_SMARTLIBDESK=true
CORS_CREDENTIALS=true
```

Use **one** URL in the browser (recommended: `https://www.smartlibdesk.in` only).

## 3) Complete a test checkout on the site

1. Open **https://www.smartlibdesk.in/login**
2. Sign in as **Library** (email + password) — not Student.
3. Go to **https://www.smartlibdesk.in/admin/subscription**
4. Click **Pay now** on the **Trial** plan (smallest amount).
5. Razorpay popup opens → pay with test details below.
6. Wait for **“Payment successful!”** on the page.

If you close the popup or see 401 in the console, Razorpay will not count the test.

## 4) Razorpay test payment details

### UPI (recommended — avoids “International cards are not supported”)

Many Indian Razorpay test accounts **reject foreign / international test cards**. Use UPI instead:

| Field | Value |
|--------|--------|
| UPI ID | `success@razorpay` |

Or scan the **UPI QR** in the checkout and complete payment in your UPI app (test mode).

(Use only in **Test mode**; this simulates success.)

### Card (only if UPI is unavailable)

| Field | Value |
|--------|--------|
| Card number | `4111 1111 1111 1111` |
| Expiry | Any future date (e.g. `12/30`) |
| CVV | Any 3 digits (e.g. `123`) |
| Name | Any name |

If you see **“International cards are not supported”**, switch to **UPI** above — do not retry with the same card.

If OTP is asked in test mode, enter **`123456`** or the OTP shown in the Razorpay test UI.

## 5) Confirm in Razorpay Dashboard

1. Stay in **Test mode**.
2. **Transactions** → you should see a **captured** payment.
3. Return to the onboarding / integration page → **Refresh** → test transaction should show as done.

## Troubleshooting

### `Authentication failed` on `api.razorpay.com/.../otp/create` (or checkout popup)

This means **Key ID and Key Secret do not match** or keys were **regenerated** in the dashboard.

**Verify keys on your machine:**

```bash
cd backend
node scripts/verify-razorpay.js
```

You must see `✅ Razorpay keys are VALID`. If you see `❌ Authentication failed`:

1. [Razorpay Dashboard](https://dashboard.razorpay.com) → **Test mode** (toggle ON)
2. **Settings → API Keys** → **Regenerate** secret (or create new key pair)
3. Copy **Key ID** + **Key Secret** together (same row / same generation)
4. Update **Railway** `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` → redeploy backend
5. Update **Vercel** `VITE_RAZORPAY_KEY_ID` = same Key ID only → redeploy website
6. Update `backend/.env` and `website/.env` for local dev
7. Run `node scripts/verify-razorpay.js` again until ✅

| Symptom | Fix |
|---------|-----|
| `401` on `create-order` | Log out → log in again on the same URL (`www`). Deploy latest website (refresh token support). |
| `Authentication failed` / `BAD_REQUEST_ERROR` | Run `verify-razorpay.js` — regenerate test keys in Razorpay dashboard. |
| Popup does not open | Check browser console; fix CORS / login first. |
| Payment succeeds in popup but site shows error | Check `POST /api/payment/verify` in Network tab; ensure still logged in. |
| Razorpay still says “no test payment” | Keys on Railway are **live** while dashboard is in **test** — both must be test. |

## After going live

Switch Railway to **live** keys (`rzp_live_*`) and complete KYC. Test keys must not be used for real customer payments.
