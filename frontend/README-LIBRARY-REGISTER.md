# Library registration

How a **new library tenant** signs up in this app: UI flow, API contract, and what happens after success.

## Where it lives in the app

| Platform | Entry |
|----------|--------|
| **Native (Expo)** | Login screen → link to **Register**, or stack screen `RegisterLibrary` (`RegisterLibraryScreen`). |
| **Web (deep link)** | Path `register-library` (see `App.tsx` linking config). |

**Primary UI file:** `screens/auth/RegisterLibraryScreen.tsx`  
**Thin wrapper (web):** `pages/RegisterLibraryPage.tsx`

## Prerequisites

1. **Backend** is running and reachable (see root `README.md` — `PORT`, MongoDB, etc.).
2. **Frontend API base URL** is set so the app can call the server, e.g. `EXPO_PUBLIC_API_URL` (see root `README.md`).

Registration is a **public** call (no JWT required).

## HTTP API

**Endpoint:** `POST /api/auth/register-library`  
**Route:** `backend/src/routes/auth.routes.js` → `authController.registerLibrary`

### Request body (JSON)

| Field | Required | Notes |
|-------|----------|--------|
| `libraryName` | Yes | Public name of the library. |
| `ownerName` | Yes | Account owner / contact name. |
| `email` | Yes | Lowercased by server; used for login and must be **unique**. |
| `password` | Yes | Stored hashed server-side. |
| `city` | Yes | City name (from India picker: selected city). |
| `state` | Yes | State or Union Territory name (from picker). |
| `place` | Yes | Area, landmark, or locality (free text; max 200 chars on server). |
| `pincode` | Yes | India postal PIN — **exactly 6 digits** (non-digits stripped server-side). |
| `phone` | Yes | Contact mobile: **10 digits** (India). Accepts optional leading country code `91` (e.g. `919876543210`); stored as 10 digits. Alias: `mobile` in JSON is also read. |

**Not sent by the API (client-only):** the screen also collects **Total seats** (`1`–`5000`). After a successful register response, the app calls authenticated **`POST /api/seats/bulk-create`** with `{ totalSeats, spaceId: null }` to create seats `1..N`. If that fails (e.g. subscription middleware), seats can be added later from the **Seats** tab or **Profile → Edit total seats**.

### Success response (`201`)

Typical shape (may be wrapped in `{ success, data }` depending on client unwrapping):

- `user` — library user object (includes `id`, `role: "library"`, `libraryCode`, branding fields as implemented).
- `authToken` (and refresh token if your `issueAuthTokens` returns them) — client persists these for `Authorization: Bearer …`.
- `libraryCode` — short code for students (also often on `user`).

### Common errors

- **400** — Missing or empty required fields.
- **409 / validation** — Duplicate **email** (library already registered with that email), or other DB uniqueness rules.

## Backend behaviour (summary)

Implemented in `backend/src/services/auth.service.js` → `registerLibrary`:

1. Creates a **Library** document (`plan: "none"`, subscription inactive until billing flow completes).
2. Issues **auth tokens** for role `library` (`libraryId` = that library’s id).
3. Logs `register_library` for audit.

`libraryCode` is generated on the Library model when missing (see `backend/src/models/Library.js`).

## After registration (client)

From `RegisterLibraryScreen.tsx`:

1. **Zustand** is updated: `currentUser`, `token` / `authToken`, `role: "library"`, `libraryId`, `libraryCode`, merged `users`.
2. **Seats:** `bulkCreateSeats(totalSeats)` then `fetchSeats()` (best-effort).
3. **Navigation:** native → `LibraryRoot`; web → opens `/dashboard`.

New libraries usually hit the **subscription / plan** gate until a paid plan is active (see `libraryMustChoosePlan` and library tabs in `App.tsx`).

## Manual test with `curl`

Replace host/port and JSON as needed:

```bash
curl -sS -X POST "http://localhost:5000/api/auth/register-library" \
  -H "Content-Type: application/json" \
  -d '{
    "libraryName": "Demo Library",
    "ownerName": "Owner Name",
    "email": "owner-demo@example.com",
    "password": "YourSecurePassword1",
    "city": "Pune",
    "state": "Maharashtra",
    "place": "FC Road, Shivajinagar",
    "pincode": "411005",
    "phone": "9876543210"
  }'
```

Then create seats (requires **library** JWT from the response):

```bash
curl -sS -X POST "http://localhost:5000/api/seats/bulk-create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"totalSeats": 100, "spaceId": null}'
```

## Related docs

- Root: `README.md` — install, MongoDB, `EXPO_PUBLIC_API_URL`.
- Backend: `backend/README.md` — API overview if present.
- Admin UI map: `README-ADMIN.md`.
