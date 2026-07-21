# Communication Center

Library admins use **Communication Center** to send messages, images, and PDFs to students. Messages appear in the student **Inbox** (in-app notifications) and can trigger **push notifications** on the mobile app.

The UI is designed like an **email inbox** (Gmail-style): separate **read** and **compose** views, **Contacts** / **Sent** folders, and edit/delete on sent messages.

---

## Where it lives

| Platform | Path | How to open |
|----------|------|-------------|
| **Mobile (library admin)** | `frontend/pages/libraryadmin/CommunicationCenter.tsx` | Dashboard → **Communication Center** quick action, or Settings |
| **Website (library admin)** | `website/src/admin/pages/AdminCommunication.tsx` | Admin sidebar → Communication |
| **Website (dashboard widget)** | `website/src/admin/components/AdminCommunicationPanel.tsx` | Dashboard recent messages (limit 5) |
| **Backend API** | `backend/src/routes/communication.routes.js` | Mounted at `/api/communications` |
| **Business logic** | `backend/src/services/communication.service.js` | Send, history, stats, edit, delete |
| **Data model** | `backend/src/models/CommunicationCampaign.js` | Sent message campaigns |

### Mobile navigation

- Stack route: `CommunicationCenter` in [`frontend/App.tsx`](frontend/App.tsx)
- Lazy-loaded via [`frontend/navigation/lazyLibraryScreens.tsx`](frontend/navigation/lazyLibraryScreens.tsx)
- State / API: [`frontend/store.ts`](frontend/store.ts) (`sendCommunicationMessage`, `fetchCommunicationHistory`, etc.)

### Related screens

| Screen | Purpose |
|--------|---------|
| [`frontend/pages/libraryadmin/Notifications.tsx`](frontend/pages/libraryadmin/Notifications.tsx) | Admin **inbox** (incoming only; link to Communication Center to send) |
| Student app notifications | Students receive messages sent from Communication Center |

---

## Features

### Sending messages

- **Audience modes** (all wired to `POST /api/communications/send`)
  - **One** — single selected student
  - **Multiple** — selected students (checkboxes on Contacts)
  - **All** — every student in the library
  - **Active** — active membership only (`audience=active`)
  - **Expired** — expired membership only (`audience=expired`)
  - **Shift** — students on a shift (`audience=shift` + `shiftId`)
- **Content types**
  - Text, image, text+image, PDF, text+PDF (mobile PDF via `expo-document-picker`)
- **Subject** — optional on mobile; if empty, first line of message is used as title
- **Quick actions** — Fee reminder, Expiry alert, Festival, Exam notice, Library closed
- **Templates** — loaded from `GET /api/templates` with placeholders (`{{student_name}}`, `{{library_name}}`, `{{due_date}}`, `{{amount}}`)
- **Recipient preview** — count before send via `GET /api/communications/preview-count`

### Sent mail (history)

- List all sent campaigns with delivery stats
- **Read view** — full message, attachments, recipients, delivered/read counts
- **Edit** — update title and message text (PATCH)
- **Delete** — remove campaign and linked student notifications (DELETE)

### Stats (dashboard strip)

| Stat | Meaning |
|------|---------|
| Sent | Total campaigns sent |
| Delivered | Push notifications delivered |
| Read | Students who opened the message |
| Pending | Not yet read |

---

## Mobile UI (Gmail-style)

### Inbox layout

1. **Header** — Inbox title, library name, compose (+) and refresh
2. **Stats row** — Sent / Delivered / Read / Pending (hidden on mobile while reading a message)
3. **Split view** (tablet) or **list → detail** (phone)

### Contacts tab

- Search students
- Filters: All / Active / Expired
- Bulk mode: One / Multiple / All
- Tap a student → **Compose** screen

### Sent tab

- Search sent messages
- Tap a message → **Read-only** view (no compose form)
- Toolbar: Edit, Delete
- Bottom bar: New message · Edit · Delete

### Compose screen

- **To** — auto-filled from selection
- **Subject** — optional
- **Message** — body text
- Attach image, emoji, templates
- Sticky **Send** bar at bottom
- **+ FAB** on list to start a new message

### After Send

- Switches to **Sent** tab
- Opens the new message in **read view** (not compose)

---

## Website UI

[`website/src/admin/pages/AdminCommunication.tsx`](website/src/admin/pages/AdminCommunication.tsx) provides:

- Student list + sent history tabs
- Audience: all / selected students
- Text, image, and PDF attachments
- Edit and delete sent messages
- Quick action chips and recipient count preview

---

## API reference

Base path: **`/api/communications`**

All routes require auth (`library` or `admin` role). Send, PATCH, and DELETE also require an active subscription.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/stats` | Delivery statistics |
| `GET` | `/history` | Sent campaigns (`?limit=`) |
| `GET` | `/preview-count` | Recipient count (`audience`, `studentIds`, `shiftId`) |
| `POST` | `/send` | Send message (multipart: `image`, `document`) |
| `PATCH` | `/:id` | Edit `{ title, message }` |
| `DELETE` | `/:id` | Delete campaign + notifications |

### Send payload (form fields)

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Message subject |
| `message` | string | Body text |
| `messageType` | string | `text`, `image`, `text_image`, `pdf`, `text_pdf` |
| `audience` | string | `all`, `selected`, `active`, `expired`, `shift` |
| `studentIds` | JSON array | Required when `audience=selected` |
| `shiftId` | string | Required when `audience=shift` |
| `category` | string | Notification category (default `general`) |
| `image` | file | Optional image upload |
| `document` | file | Optional PDF upload |

### What happens on send

1. Recipients resolved per audience rules
2. `CommunicationCampaign` record created
3. Per-student `Notification` rows created (inbox)
4. Expo push sent where tokens exist
5. Template placeholders personalized per student when present

---

## Environment & dependencies

### Mobile (`frontend/.env`)

```env
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:1998
```

After changing `.env`, restart Expo with cache clear:

```bash
cd frontend
npx expo start -c
```

### Backend (file uploads)

PDF and image uploads need **Cloudinary** configured in `backend/.env`. See [`backend/README.md`](backend/README.md).

---

## Key files (quick map)

```
sk-Library-Management/
├── README-COMMUNICATION-CENTER.md          ← this file
├── backend/
│   ├── src/routes/communication.routes.js
│   ├── src/services/communication.service.js
│   ├── src/models/CommunicationCampaign.js
│   └── src/middleware/upload.communication.middleware.js
├── frontend/
│   ├── pages/libraryadmin/CommunicationCenter.tsx
│   ├── pages/libraryadmin/Notifications.tsx
│   ├── utils/communicationMessage.ts       ← derive title from body
│   └── store.ts                            ← mobile API calls
└── website/
    ├── src/admin/pages/AdminCommunication.tsx
    ├── src/admin/components/AdminCommunicationPanel.tsx
    └── src/admin/utils/communicationMessage.ts
```

---

## Testing checklist

### Mobile

1. Open **Communication Center** from dashboard
2. **Contacts** → pick a student → compose → **Send** → lands on sent read view
3. **Sent** → open message → confirm **no compose form**; use Edit / Delete
4. **+** FAB → new compose
5. **Multiple** mode → select students → preview recipients → send
6. **All** mode → broadcast message

### Website

1. Admin → Communication → send text + image/PDF
2. Edit and delete a sent message
3. Confirm student app inbox receives the notification

### API (optional)

```bash
# History (with library JWT)
curl -H "Authorization: Bearer TOKEN" http://localhost:1998/api/communications/history

# Stats
curl -H "Authorization: Bearer TOKEN" http://localhost:1998/api/communications/stats
```

---

## Roadmap (planned)

- Mobile PDF attachment (UI placeholder exists; website already supports PDF)
- WhatsApp / SMS / voice / scheduled sends (shown as “Premium — coming soon” in mobile UI)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Send fails / wrong API | Check `EXPO_PUBLIC_API_URL` in `frontend/.env` (no leading spaces); run `npx expo start -c` |
| Upload fails | Verify Cloudinary env vars on backend |
| Names slow on other screens | Unrelated; see attendance/student fetch docs |
| Compose shows while reading sent mail | Update app — read and compose are now separate views |

---

*Last updated: Communication Center Gmail-style mobile redesign (read vs compose split, Sent tab, edit/delete, post-send read view).*
