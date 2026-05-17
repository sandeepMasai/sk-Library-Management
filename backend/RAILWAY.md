# Railway — Backend Deploy

## 1) Railway project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Repo select karo: `sk-Library-Management`
3. Service **Settings** → **Root Directory** = `backend`
4. **Networking** → **Generate Domain** (e.g. `https://your-app.up.railway.app`)

## 2) Environment variables

**Variables** tab me ye set karo (local `backend/.env` se copy kar sakte ho, secrets Railway par hi rakho):

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | Yes | `production` |
| `MONGODB_URI` | Yes | Atlas connection string |
| `AUTH_JWT_SECRET` | Yes | Min 32 chars |
| `AUTH_REFRESH_TOKEN_SECRET` | Yes | Min 32 chars |
| `ADMIN_USERNAME` | Yes | Super admin login |
| `ADMIN_PIN` | Yes | Strong PIN |
| `ADMIN_MOBILE` | Yes | 10-digit mobile |
| `HOST` | Yes | `0.0.0.0` |
| `TRUST_PROXY` | Yes | `true` |
| `SUBSCRIPTION_CRON_ENABLED` | Recommended | `true` |
| `EMAIL_OTP_CRON_ENABLED` | Recommended | `true` |

`PORT` **mat** set karo — Railway khud deta hai.

**502 "Application failed to respond":**
1. Variables se `PORT=1998` hatao (agar hai)
2. Networking → domain **Target port** = deploy logs wala port (ya blank/auto)
3. `MONGODB_URI` + `HOST=0.0.0.0` set karo
4. Redeploy

Secrets generate:

```bash
cd backend
node scripts/generate-secrets.js
```

## 3) MongoDB Atlas

1. Atlas → **Network Access** → Add IP `0.0.0.0/0` (ya Railway static egress agar use karte ho)
2. **Database** → Connect → connection string → `MONGODB_URI` me paste

## 4) Deploy

Push to `main` → Railway auto-build (`npm install` + `npm start`).

Health check:

```bash
curl https://YOUR-DOMAIN.up.railway.app/health
```

Expected: `{"ok":true,...}`

## 5) Mobile app (Expo)

Frontend ko Railway URL par point karo (root ya `frontend/.env`):

```env
EXPO_PUBLIC_API_URL=https://YOUR-DOMAIN.up.railway.app
```

Phir Expo restart: `npx expo start -c`

## 6) One-command deploy (Mac Terminal)

```bash
cd backend
npx @railway/cli login
node scripts/build-railway-env.js
bash scripts/railway-deploy.sh
```

Script sets all variables from `.railway-deploy.env` and runs `railway up`.

## 7) GitHub Actions (optional)

1. https://railway.app/account/tokens → create token  
2. GitHub repo → **Settings → Secrets → Actions** → `RAILWAY_TOKEN`  
3. Push to `main` → workflow deploys `backend/`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Root Directory = `backend` confirm karo |
| Crash on start | `MONGODB_URI` + JWT secrets check karo |
| 401 admin login | `ADMIN_USERNAME` / `ADMIN_PIN` Railway vars match karo |
| App can't reach API | `EXPO_PUBLIC_API_URL` = Railway HTTPS URL |
