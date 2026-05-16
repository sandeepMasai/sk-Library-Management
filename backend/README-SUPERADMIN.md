# Super Admin (platform admin) — setup guide

This backend does **not** create a Super Admin row in MongoDB. The platform admin is a **single static account** whose credentials come from **environment variables**. After you set them and restart the server, you log in through the **admin auth API**.

## 1. Configure `backend/.env`

Add or update these variables:

```env
# Required for any JWT login (use long random values in production)
AUTH_JWT_SECRET=your_min_32_char_random_secret
AUTH_REFRESH_TOKEN_SECRET=your_second_long_random_secret

# Super Admin credentials (change defaults before production)
ADMIN_USERNAME=admin
ADMIN_PIN=your_strong_pin_here
```

Optional (used elsewhere in the codebase for display / identity metadata; **not** checked on admin login today):

```env
ADMIN_MOBILE=0000000000
ADMIN_EMAIL=
```

Copy from `.env.example` anything else your deployment needs (MongoDB URI, CORS, cookie flags, etc.).

## 2. Restart the backend

Env is read at process start. Always restart after changing secrets or admin credentials.

```bash
npm start
```

## 3. Log in as Super Admin

Use the **admin** route (not `/api/auth/login`):

```http
POST /api/admin/login
Content-Type: application/json
```

Body:

```json
{
  "username": "admin",
  "pin": "your_strong_pin_here"
}
```

Use the same values as `ADMIN_USERNAME` and `ADMIN_PIN` (comparison is case-insensitive for username).

Success response includes JWT fields such as `accessToken`, `refreshToken`, and `authToken` (access token alias). Use whichever your client expects, and send:

```http
Authorization: Bearer <accessToken>
```

on all protected `/api/admin/...` routes.

## 4. Refresh when the access token expires

```http
POST /api/auth/refresh
Content-Type: application/json
```

Body (typical):

```json
{
  "refreshToken": "<refreshToken from login>"
}
```

If you enabled **HTTP-only refresh cookies** (`AUTH_REFRESH_COOKIE_ENABLED=true` and a shared `COOKIE_SECRET`), the same endpoint can use the cookie instead of the body; see `.env.example`.

## 5. Production checklist

- Set **strong** `ADMIN_PIN` (do not use `admin@123` or short pins).
- Use long, unique `AUTH_JWT_SECRET` and `AUTH_REFRESH_TOKEN_SECRET`.
- Do **not** commit `.env`.
- Rate limiting applies to `POST /api/admin/login` (failed attempts are logged).

## 6. Troubleshooting

| Problem | What to check |
|--------|----------------|
| `401 Invalid admin credentials` | `ADMIN_USERNAME` / `ADMIN_PIN` vs JSON `username` / `pin`; restart after `.env` edits |
| `403` on `/api/auth/login` with `role: admin` | Normal: admin must use **`POST /api/admin/login`** |
| `401 Auth token expired` | Call **`POST /api/auth/refresh`** or log in again |

## Related docs

- `AUTH_README.md` — full auth flow, JWT, roles, refresh
- `README.md` — backend overview (some older notes may mention admin via `/api/auth/login`; the current admin entrypoint is **`/api/admin/login`**)
