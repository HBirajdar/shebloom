# Document 5 — Push Notifications

## 5.1 VAPID Setup

The server uses the **Web Push** protocol (not Firebase Cloud Messaging, despite the `fcmToken` column name) via the `web-push` npm package.

**Required environment variables:**

| Variable | Purpose |
|---|---|
| `VAPID_PUBLIC_KEY` | Base64url-encoded public key shared with the browser Push API |
| `VAPID_PRIVATE_KEY` | Private key used to sign push payloads (server-only, never exposed) |

**File:** `src/server/src/services/push.service.ts`, lines 6-11

```ts
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:support@vedaclue.com', VAPID_PUBLIC, VAPID_PRIVATE);
}
```

- Keys are generated once with `npx web-push generate-vapid-keys` (comment on line 5).
- The `mailto:` subject is `support@vedaclue.com`.
- If either key is missing, `setVapidDetails` is never called and all push sends silently return `false` (line 35).

**Client retrieval:** The client fetches the public key via `GET /api/v1/notifications/vapid-key` (no auth required). If the key is empty, the server returns HTTP 503 with `{ success: false, error: 'Push not configured' }`.

- **Route:** `src/server/src/routes/notification.routes.ts`, lines 18-22
- **Client call:** `notificationAPI.getVapidKey()` in `src/client/src/services/api.ts`, line 225

---

## 5.2 Service Worker

**File:** `src/client/public/sw.js`, lines 149-179

### Push event handler (line 149)

```
self.addEventListener('push', event => { ... })
```

1. Parses the incoming payload as JSON. Falls back to `{ title: 'VedaClue', body: event.data.text() }` if JSON parsing fails.
2. Calls `self.registration.showNotification()` with:
   - `icon`: `/icon-192.png`
   - `badge`: `/icon-192.png`
   - `vibrate`: `[200, 100, 200]`
   - `tag`: `data.tag || 'vedaclue'` -- uses default tag, which means consecutive notifications with no explicit tag will **replace** each other in the OS notification tray.
   - `data.url`: The deep-link URL (defaults to `/`).

### Notification click handler (line 165)

```
self.addEventListener('notificationclick', event => { ... })
```

1. Closes the notification.
2. Searches for an existing app window (`clients.matchAll`).
3. If found, navigates that window to `data.url` and focuses it.
4. If no window exists, opens a new one via `clients.openWindow(url)`.

---

## 5.3 Subscription Flow

**File:** `src/client/src/hooks/usePushNotifications.ts`

### Hook: `usePushNotifications()`

**Returned state:**

| Field | Type | Description |
|---|---|---|
| `permission` | `NotificationPermission` | Browser permission state: `'default'`, `'granted'`, `'denied'` |
| `isSubscribed` | `boolean` | Whether an active PushSubscription exists |
| `loading` | `boolean` | True during subscribe/unsubscribe operations |
| `subscribe` | `() => Promise<boolean>` | Requests permission, subscribes, saves to server |
| `unsubscribe` | `() => Promise<void>` | Unsubscribes from browser + server |

### Subscribe flow (lines 31-73)

1. **Guard:** Checks `'serviceWorker' in navigator` and `'PushManager' in window`. Warns and returns `false` if unsupported.
2. **Permission:** Calls `Notification.requestPermission()`. Aborts if not `'granted'`.
3. **VAPID key:** Fetches via `notificationAPI.getVapidKey()`. Aborts with console warning if server has no key.
4. **Browser subscribe:** Calls `reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` with the VAPID public key converted from base64url to `Uint8Array` (helper `urlBase64ToUint8Array`, lines 4-11).
5. **Server persist:** Sends the subscription JSON to `POST /api/v1/notifications/subscribe` via `notificationAPI.subscribe(sub.toJSON())`.

### Where the token is stored

The subscription object is serialized to JSON and stored in the `User.fcmToken` column (type `String?`).

- **Subscribe route:** `src/server/src/routes/notification.routes.ts`, lines 27-37 -- `prisma.user.update({ data: { fcmToken: JSON.stringify(subscription) } })`
- **Unsubscribe route:** lines 40-48 -- sets `fcmToken: null`

### Unsubscribe flow (lines 75-87)

1. Calls `reg.pushManager.getSubscription()` and `sub.unsubscribe()` on the browser side.
2. Calls `POST /api/v1/notifications/unsubscribe` to set `fcmToken = null` on the server.
3. Errors are caught and logged but do not throw.

### Auto-check on mount (lines 20-29)

On mount, if the service worker is available and permission is `'granted'`, the hook checks `getSubscription()` to set `isSubscribed`.

---

## 5.4 Notification Preference Model

**File:** `src/server/prisma/schema.prisma`, lines 709-734

### `NotificationPreference` (table: `notification_preferences`)

| Field | Type | Default | Validation (route) | Description |
|---|---|---|---|---|
| `id` | `String` (cuid) | auto | -- | Primary key |
| `userId` | `String` | -- | -- | Unique; FK to `User` |
| `pushEnabled` | `Boolean` | `true` | -- | Master push toggle |
| `periodReminder` | `Boolean` | `true` | -- | Period prediction push |
| `periodReminderDays` | `Int` | `2` | 1-7 | Days before predicted period |
| `ovulationReminder` | `Boolean` | `true` | -- | Ovulation day push |
| `waterReminder` | `Boolean` | `true` | -- | Hydration nudge pushes |
| `waterIntervalHours` | `Float` | `2` | 0.5-6 | Hours between water reminders |
| `waterStartHour` | `Int` | `8` | 0-23 | Earliest hour to send water reminders |
| `waterEndHour` | `Int` | `22` | 0-23 | Latest hour to send water reminders |
| `moodReminder` | `Boolean` | `true` | -- | Daily mood check-in push |
| `moodReminderHour` | `Int` | `20` | 0-23 | Hour of day for mood reminder |
| `appointmentReminder` | `Boolean` | `true` | -- | Appointment reminders |
| `appointmentLeadMins` | `Int` | `60` | -- | Minutes before appointment |
| `createdAt` | `DateTime` | `now()` | -- | |
| `updatedAt` | `DateTime` | auto | -- | |

Validation is enforced in the `PUT /notifications/preferences` route handler (`src/server/src/routes/notification.routes.ts`, lines 62-97). The route uses an explicit allowlist of updatable fields (line 64-69) to prevent mass assignment.

### `Notification` (table: `notifications`, lines 691-705)

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | `String` (cuid) | auto | Primary key |
| `userId` | `String` | -- | FK to `User` |
| `title` | `String` | -- | Notification title |
| `body` | `String` | -- | Notification body text |
| `type` | `String` | -- | Category key (see section 5.5) |
| `data` | `Json?` | -- | Arbitrary payload (deep-link URL, etc.) |
| `isRead` | `Boolean` | `false` | Read status |
| `createdAt` | `DateTime` | `now()` | |

Index: `@@index([userId, isRead])` for efficient unread count queries.

---

## 5.5 Scheduled Reminder Jobs

All push reminders run from a single cron job in `src/server/src/server.ts`, lines 234-354.

**Cron schedule:** `0 * * * *` (every hour, on the hour).

### Job architecture

1. Fetches all active users with a non-null `fcmToken` (line 242-246).
2. Batch-loads `NotificationPreference`, `UserProfile`, and `WaterLog` (today's) for all those users in parallel (lines 251-259).
3. Iterates each user and checks each reminder type.

### Reminder types

#### Water Reminder
- **Type string:** `water_reminder`
- **Condition:** `waterReminder` enabled (default `true`), current UTC hour is within `[waterStartHour, waterEndHour]`, and `(currentHour - waterStartHour) % waterIntervalHours === 0`.
- **Skip if:** User already met their daily glass target, or a `water_reminder` notification was sent within the last `waterIntervalHours` hours.
- **Deep link URL:** `/wellness`
- **Lines:** 283-301

#### Mood Check-in
- **Type string:** `mood_reminder`
- **Condition:** `moodReminder` enabled (default `true`), current UTC hour matches `moodReminderHour` (default 20).
- **Skip if:** A `mood_reminder` was sent within the last 20 hours.
- **Deep link URL:** `/wellness`
- **Lines:** 303-312

#### Period Prediction
- **Type string:** `period_prediction`
- **Condition:** `periodReminder` enabled (default `true`), days until predicted next period equals `periodReminderDays` (default 2), and current UTC hour is 9.
- **Calculation:** `nextPeriod = lastPeriodDate + cycleLength * 86400000ms`
- **Skip if:** A `period_prediction` was sent within the last 24 hours.
- **Deep link URL:** `/tracker`
- **Lines:** 314-330

#### Ovulation Day
- **Type string:** `ovulation_push`
- **Condition:** `ovulationReminder` enabled (default `true`), current cycle day equals `cycleLength - 14`, and current UTC hour is 9.
- **Skip if:** An `ovulation_push` was sent within the last 24 hours.
- **Deep link URL:** `/tracker`
- **Lines:** 332-346

### Smart notifications (on-demand, not cron)

A second set of notifications is generated in `generateSmartNotifications()` inside `src/server/src/routes/notification.routes.ts`, lines 100-137. These fire lazily whenever a user fetches their notification list (`GET /notifications`), and create **in-app DB records only** (no push send).

| Type string | Trigger | Idempotency window |
|---|---|---|
| `period_reminder` | Period due in exactly 3 days | 24 hours |
| `period_late` | Period is 7+ days late | 7 days |
| `period_overdue` | Period is 1-3 days late | 3 days |
| `ovulation` | Cycle day equals ovulation day | 24 hours |

---

## 5.6 Idempotency -- How Duplicates Are Prevented

Both the cron job and smart notification generator use the same pattern:

1. Before creating a notification, query `prisma.notification.findFirst()` filtering by `userId`, `type`, and `createdAt >= (now - window)`.
2. If a matching record exists, skip.

**Idempotency windows by type:**

| Type | Window | Source |
|---|---|---|
| `water_reminder` | `waterIntervalHours` (default 2h) | Cron (server.ts:292-293) |
| `mood_reminder` | 20 hours | Cron (server.ts:305-306) |
| `period_prediction` | 24 hours | Cron (server.ts:323-324) |
| `ovulation_push` | 24 hours | Cron (server.ts:339-340) |
| `period_reminder` | 24 hours | Smart (notification.routes.ts:117) |
| `period_late` | 7 days | Smart (notification.routes.ts:122) |
| `period_overdue` | 3 days | Smart (notification.routes.ts:127) |
| `ovulation` | 24 hours | Smart (notification.routes.ts:132) |

There is no database-level unique constraint enforcing this -- idempotency relies entirely on the `findFirst` check at the application layer. A race condition between two concurrent cron ticks or two simultaneous `GET /notifications` calls could theoretically produce duplicates, though the hourly cron schedule makes this unlikely.

---

## 5.7 Deep Links

When a push notification is clicked, the service worker navigates to the `url` field from the notification's `data` payload.

| Notification type | Deep link URL | Target page |
|---|---|---|
| `water_reminder` | `/wellness` | Wellness page |
| `mood_reminder` | `/wellness` | Wellness page |
| `period_prediction` | `/tracker` | Period tracker |
| `ovulation_push` | `/tracker` | Period tracker |
| Smart notifications (DB-only) | N/A | No push sent; displayed in-app notification list |
| Default (no url in data) | `/` | Dashboard |

The URL is embedded in the push payload at send time (`src/server/src/services/push.service.ts`, line 44):
```ts
data: { url: data?.url || '/', ...data }
```

---

## 5.8 Error Handling

### Push send failure (`push.service.ts`, lines 47-56)

| HTTP status from push service | Action |
|---|---|
| `410 Gone` or `404 Not Found` | Subscription expired. Sets `fcmToken = null` on the user record and logs. |
| Any other error | Logs the error message. Returns `false`. |

The function always returns `boolean` -- it never throws. The caller (cron job) uses `await` but does not act on the return value beyond counting successes.

### No subscription

If `user.fcmToken` is `null`, `sendPushNotification` returns `false` immediately (line 35). The notification DB record is still created (line 25-27), so the user sees it in their in-app notification list.

### VAPID keys missing

If either `VAPID_PUBLIC_KEY` or `VAPID_PRIVATE_KEY` is not set:
- `webpush.setVapidDetails()` is never called (line 9-11).
- All calls to `sendPushNotification` return `false` at line 35.
- The `GET /notifications/vapid-key` endpoint returns HTTP 503.
- The client hook logs `[Push] Server has no VAPID key configured` and aborts subscription (`usePushNotifications.ts`, lines 50-54).

### Bulk send (`sendPushToMany`, line 62-72)

Uses `Promise.allSettled` so one user's failure does not block others.

### Cron job failure (`server.ts`, line 351-353)

The entire cron block is wrapped in try/catch. Errors are logged via `logger.warn` and silently swallowed. The cron job will retry on the next hourly tick.

### DB notification create failure (`push.service.ts`, line 27)

The `prisma.notification.create()` call has a `.catch()` that logs but does not prevent the push from being attempted.

---

## 5.9 Notification API Endpoints Summary

All routes are mounted under `/api/v1/notifications`.

**File:** `src/server/src/routes/notification.routes.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/vapid-key` | No | Returns VAPID public key |
| `POST` | `/subscribe` | Yes | Save push subscription (stores in `User.fcmToken`) |
| `POST` | `/unsubscribe` | Yes | Remove push subscription (`fcmToken = null`) |
| `GET` | `/preferences` | Yes | Get notification preferences (auto-creates defaults) |
| `PUT` | `/preferences` | Yes | Update notification preferences (allowlisted fields) |
| `GET` | `/` | Yes | List last 50 notifications + unread count; triggers smart notification generation |
| `PUT` | `/read-all` | Yes | Mark all user notifications as read |
| `PUT` | `/:id/read` | Yes | Mark single notification as read |
| `PATCH` | `/:id/read` | Yes | Legacy compat alias for PUT `/:id/read` |

### Client API object

**File:** `src/client/src/services/api.ts`, lines 221-230

```ts
export const notificationAPI = {
  list:              () => api.get('/notifications'),
  markRead:          (id) => api.put('/notifications/' + id + '/read'),
  markAllRead:       () => api.put('/notifications/read-all'),
  getVapidKey:       () => api.get('/notifications/vapid-key'),
  subscribe:         (subscription) => api.post('/notifications/subscribe', { subscription }),
  unsubscribe:       () => api.post('/notifications/unsubscribe'),
  getPreferences:    () => api.get('/notifications/preferences'),
  updatePreferences: (d) => api.put('/notifications/preferences', d),
};
```

---

## 5.10 UI Integration Points

### Dashboard push opt-in card

**File:** `src/client/src/pages/DashboardPage.tsx`, lines 195-198, 926-952

- A banner appears if `!pushDismissed && !isSubscribed && permission !== 'denied'`.
- Dismissal is persisted via `localStorage.setItem('sb_push_dismissed', '1')` (line 948).
- The "Enable Notifications" button calls `pushSubscribe()` from the hook.

### Profile notification settings

**File:** `src/client/src/pages/ProfilePage.tsx`, lines 505-601

- Section "Notifications" shows a master push toggle (subscribe/unsubscribe).
- If push is subscribed and preferences are loaded, four sub-toggles appear:
  - Period Reminders (shows `periodReminderDays` days before)
  - Ovulation Day
  - Water Reminders (shows interval and hour range)
  - Mood Check-in (shows `moodReminderHour`)
- Each toggle calls `toggleNotifPref(key, value)` which hits `PUT /notifications/preferences`.
- If browser permission is `'denied'`, the master toggle is disabled with label "Blocked by browser".

### Notification bell (Dashboard header)

**File:** `src/client/src/pages/DashboardPage.tsx`, lines 321-325, 430-433

- On mount, fetches `notificationAPI.list()` and reads `unreadCount` from the response.
- Displays a red badge on the bell icon if `notifCount > 0`.
- Clicking navigates to `/notifications`.
