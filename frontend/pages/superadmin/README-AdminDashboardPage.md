# Admin Dashboard page (`AdminDashboardPage.tsx`)

Super Admin **home** screen: high-level stats, revenue analytics, subscription breakdown, recent audit-style activity, and a short list of newly registered libraries.

## Where it lives

| Item | Path |
|------|------|
| Screen component | `frontend/pages/superadmin/AdminDashboardPage.tsx` |
| Tab entry | `Dashboard` under `AdminRoot` (see `frontend/README-ADMIN.md`) |

## Who can see it

- **Guest / not logged in** → `LoginScreen`.
- **Logged in but role ≠ `admin`** → `ForbiddenScreen`.
- **Role `admin`** → full dashboard.

State comes from `useAppStore`: `isAuthenticated()`, `role`.

## Data loading

On mount (when admin is authenticated), parallel and independent effects run:

| Purpose | HTTP | Query / notes |
|--------|------|----------------|
| Dashboard stats | `GET /api/admin/dashboard` | Expect `{ ok, stats }`; `stats`: `totalLibraries`, `activeLibraries`, `totalStudents`, `revenue`. |
| Libraries (pickers / lists) | `GET /api/admin/libraries` | `page=1`, `limit=50` → fills in-memory `libraries` (used by modals below). |
| Recent libraries widget | `GET /api/superadmin/recent-libraries` | `limit=8` — owner, city/state, plan, joined date, status. |
| Recent activity widget | `GET /api/superadmin/recent-activity` | `limit=20` — typed platform events (registration, payment, login, …). |
| Revenue overview widget | `GET /api/superadmin/revenue-overview` | Total / monthly / today revenue, subs, renewals, sparkline. |
| Legacy libraries preview | `GET /api/admin/libraries` | `page=1`, `limit=5`, `includeCounts=1` (pickers / modals). |
| Revenue analytics | `GET /api/admin/analytics/revenue` | `months=6` or `12` (toggle in UI). |
| Subscription donut | `GET /api/admin/subscriptions` | `status=all`; client aggregates **active**, **expiring soon** (≤ 7 days), **expired**. |
| Activity / logs | `GET /api/admin/logs` | Defaults: all libraries, no `from` / `to` unless state is set (see **Implementation notes**). |

The shared Axios layer (`frontend/services/api.ts`) attaches the JWT; expired tokens surface as API errors (retry after refresh or re-login).

## UI (modern “ops console” layout)

1. **Hero** — Accent rail, **Platform admin** pill, **Operations** title, short prose + monospace route hints; **Sync** retriggers full `load()`.
2. **KPI strip** — Four stat tiles with colored left stripe, monospace numbers.
3. **Analytics panel** — Overline `analytics`, monospace `GET …/analytics/revenue`, **segmented 6mo / 12mo** toggle, charts in bordered **inset** panels using theme primary / success / danger.
4. **Subscriptions panel** — `subscriptions` overline, donut + legend (counts in mono); **All** opens **Subscriptions** tab.
5. **Audit panel** — `audit` overline + `GET …/logs`; timeline-style activity **cards**; refresh pulls logs again.
6. **Registrar panel** — `registrar` + query hint; striped table, **plan** as chip, student count monospace; **Open list** → **Libraries**.

Charts: `frontend/components/ui/SimpleCharts.tsx`. Typography: **`Menlo` / monospace** on web & native where noted. **`ActivityIndicator`** for loading shells.

## Navigation

```ts
navigation.navigate('AdminRoot', { screen: 'Subscriptions' })
navigation.navigate('Libraries')
```

Ensure these route names match your `App.tsx` / navigator config.

## Local types (summary)

- `AdminStats`, `LibraryRow`, `RevenueAnalytics` / `RevenuePoint`, `SubscriptionRow`, `LogRow` — aligned with backend JSON shapes; adjust if APIs change.

## Implementation notes (current code)

1. Older comments may mention **block/delete** library actions — **not on this screen**; use **Libraries**.
2. **`onSendNotify`**, **`POST /api/admin/notify`**, and **notify** / **logs** picker **Modals** are wired in code, but nothing opens those modals from the UI — bulk notify / log-library filter need buttons if you want them.

## Troubleshooting

| Symptom | Likely cause |
|--------|----------------|
| Spinner forever | Backend down or unreachable base URL |
| Full-screen error + Retry | `401` / network; check token and `/api/admin/*` routes |
| Empty charts | Analytics or subscriptions returned empty / different shape |
| “No activity yet” | No rows from `/api/admin/logs` for default query |

## Related documentation

- `frontend/README-ADMIN.md` — Super Admin tabs and APIs
- `backend/README-SUPERADMIN.md` — platform admin `.env` + `POST /api/admin/login`
