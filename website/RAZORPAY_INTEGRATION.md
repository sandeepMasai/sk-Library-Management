# Razorpay Standard Web Checkout — SmartLibDesk

Stack: **Express backend** + **Vite/React website**. SDK: `razorpay` (already in `backend/package.json`).

## Endpoints

| Step | Method | Path | Auth |
|------|--------|------|------|
| Create order (subscription) | POST | `/api/payment/create-order` | Library JWT + `{ planId }` |
| Verify (subscription) | POST | `/api/payment/verify` | Library JWT + plan + payment fields |
| Create order (standard alias) | POST | `/api/create-order` | Library JWT + `{ amount, currency?, receipt? }` |
| Verify (standard alias) | POST | `/api/verify-payment` | Library JWT + signature fields |

Amount is always in **paise** (₹1 = 100). Minimum **100** paise.

## Environment

**Backend** (`backend/.env` — never commit):

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your_secret
```

**Website** (`website/.env` — Key ID only):

```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
VITE_RAZORPAY_TEST_ONLY=true
VITE_API_URL=http://127.0.0.1:1998
```

Verify keys:

```bash
cd backend && npm run verify:razorpay
```

## Frontend (website)

- Script loaded dynamically: `https://checkout.razorpay.com/v1/checkout.js`
- Module: `website/src/lib/razorpayWeb.ts`
- UI: **Admin → Subscription** → Pay now

Flow:

1. `POST /api/payment/create-order` → `{ orderId, keyId, amount, currency }`
2. `new Razorpay({ key, order_id, amount, currency, handler })` → `.open()`
3. On success → `POST /api/payment/verify` with `razorpay_*` fields

## Test (sandbox)

1. `cd backend && npm run dev`
2. `cd website && npm run dev`
3. Library login → `/admin/subscription` → Pay now
4. Card: `4111 1111 1111 1111` · CVV `123` · OTP `123456`
5. UPI: `success@razorpay`

## Railway + Vercel

Set the same `RAZORPAY_*` on Railway and `VITE_RAZORPAY_KEY_ID` on Vercel, then redeploy both.

Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
