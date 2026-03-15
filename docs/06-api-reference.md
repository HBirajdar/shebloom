# DOCUMENT 6 -- API REFERENCE

**VedaClue Women's Health Platform**
Generated from source code analysis of `src/server/src/routes/*.ts`

---

## Table of Contents

1. [Global Conventions](#1-global-conventions)
2. [Auth Routes](#2-auth-routes)
3. [User Routes](#3-user-routes)
4. [Cycle Routes](#4-cycle-routes)
5. [Wellness Routes](#5-wellness-routes)
6. [Wellness Content Routes](#6-wellness-content-routes)
7. [Notification Routes](#7-notification-routes)
8. [Doctor Routes](#8-doctor-routes)
9. [Products Routes](#9-products-routes)
10. [Admin Routes](#10-admin-routes)
11. [Debug Routes](#11-debug-routes)
12. [Mood Routes](#12-mood-routes)
13. [Pregnancy Routes](#13-pregnancy-routes)
14. [Hospital Routes](#14-hospital-routes)
15. [Article Routes](#15-article-routes)
16. [Appointment Routes](#16-appointment-routes)
17. [Upload Routes](#17-upload-routes)
18. [AI Routes](#18-ai-routes)
19. [Cart Routes](#19-cart-routes)
20. [Achievements Routes](#20-achievements-routes)
21. [Reports Routes](#21-reports-routes)
22. [Callback Routes](#22-callback-routes)
23. [Prescription Routes](#23-prescription-routes)
24. [Payment Routes](#24-payment-routes)
25. [Doctor Dashboard Routes](#25-doctor-dashboard-routes)
26. [Dosha Routes](#26-dosha-routes)
27. [Weather Routes](#27-weather-routes)
28. [Finance Routes](#28-finance-routes)
29. [Program Routes](#29-program-routes)
30. [Seller Routes](#30-seller-routes)
31. [Community Routes](#31-community-routes)
32. [Content Routes](#32-content-routes)
33. [Subscription Routes](#33-subscription-routes)
34. [Analytics Routes](#34-analytics-routes)
35. [Referral Routes](#35-referral-routes)
36. [Email Campaign Routes](#36-email-campaign-routes)
37. [Insights Routes](#37-insights-routes)

---

## 1. Global Conventions

### Base URL

All API endpoints are served under:

```
/api/v1/
```

### Authentication

- **Bearer Token**: JWT (HS256) passed via `Authorization: Bearer <token>`
- **Middleware**:
  - `authenticate` -- requires valid JWT; populates `req.user` with `{ id, role, email }`
  - `authorize(...roles)` -- requires user to have one of the specified roles (`USER`, `ADMIN`, `DOCTOR`)
  - `optionalAuth` -- attempts auth silently; does not reject if missing
  - `requireAdmin` -- shorthand for `authenticate` + `authorize('ADMIN')`
  - `requireDoctor` -- shorthand for `authenticate` + `authorize('DOCTOR')`
  - `requireSubscription(feature)` -- checks active subscription for gated premium features

### Standard Response Envelope

**Success:**
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... },
  "timestamp": "2026-03-15T00:00:00.000Z"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2026-03-15T00:00:00.000Z"
}
```

### Rate Limits

| Limiter       | Window  | Max Requests | Applied To               |
|---------------|---------|--------------|--------------------------|
| General       | 15 min  | 500          | All routes               |
| Auth          | 15 min  | 60           | `/api/v1/auth/*`         |
| Upload        | 15 min  | 20           | `/api/v1/upload/*`       |
| AI            | 15 min  | 20           | `/api/v1/ai/*`           |

### Common ID Format

All entity IDs use CUID strings (e.g., `clxyz...`).

---

## 2. Auth Routes

**Mount prefix:** `/api/v1/auth`
**Source:** `auth.routes.ts`
**Default auth:** None (public routes)

### POST `/api/v1/auth/register`

Register a new user account.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `fullName` | string | Yes | |
| `email` | string | Yes | Must be valid email |
| `password` | string | Yes | Min 6 characters |
| `phone` | string | No | |

**Success (201):**
```json
{
  "success": true,
  "data": {
    "user": { "id", "fullName", "email", "role", "avatarUrl", "isVerified" },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**Errors:**
- `400` -- Missing required fields, invalid email format, password too short
- `409` -- Email already registered

---

### POST `/api/v1/auth/login`

Authenticate with email and password.

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `password` | string | Yes |

**Success (200):**
```json
{
  "data": {
    "user": { "id", "fullName", "email", "role", "avatarUrl", "isVerified" },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**Errors:**
- `400` -- Missing fields
- `401` -- Invalid credentials
- `403` -- Account deactivated

---

### POST `/api/v1/auth/otp/send`

Send OTP to email for verification.

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |

**Success (200):** `{ "message": "OTP sent" }`

**Errors:**
- `400` -- Invalid email
- `404` -- User not found

---

### POST `/api/v1/auth/otp/verify`

Verify OTP code.

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `otp` | string | Yes |

**Success (200):** Returns verified user + tokens.

**Errors:**
- `400` -- Invalid/expired OTP

---

### POST `/api/v1/auth/refresh`

Refresh an expired JWT.

| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | Yes |

**Success (200):** `{ "token": "new_jwt", "refreshToken": "new_refresh" }`

**Errors:**
- `401` -- Invalid or expired refresh token

---

### POST `/api/v1/auth/logout`

**Auth:** Required

Invalidate current token (blacklisted via Redis).

**Success (200):** `{ "message": "Logged out" }`

---

### POST `/api/v1/auth/google`

OAuth login/register via Google.

| Field | Type | Required |
|-------|------|----------|
| `idToken` | string | Yes |

**Success (200):** Returns user + tokens.

---

### POST `/api/v1/auth/forgot-password`

Request password reset.

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |

**Success (200):** `{ "message": "Reset email sent" }`

---

### POST `/api/v1/auth/reset-password`

Reset password using token from email.

| Field | Type | Required |
|-------|------|----------|
| `token` | string | Yes |
| `password` | string | Yes |

**Success (200):** `{ "message": "Password reset" }`

**Errors:**
- `400` -- Invalid/expired token

---

## 3. User Routes

**Mount prefix:** `/api/v1/user`
**Source:** `user.routes.ts`
**Default auth:** All routes require `authenticate`

### GET `/api/v1/user/me`

Get current user profile with related data.

**Success (200):**
```json
{
  "data": {
    "id", "fullName", "email", "phone", "avatarUrl",
    "role", "isVerified", "profile": { ... }
  }
}
```

---

### PUT `/api/v1/user/me`

Update current user profile.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `fullName` | string | No | |
| `phone` | string | No | |
| `avatarUrl` | string | No | |
| Various profile fields | mixed | No | Forwarded to UserProfile |

**Success (200):** Updated user object.

---

### DELETE `/api/v1/user/me`

Deactivate (soft-delete) the current user account.

**Success (200):** `{ "message": "Account deactivated" }`

---

### GET `/api/v1/user/export`

Export all user data (GDPR compliance).

**Success (200):** JSON blob of all user data.

---

### POST `/api/v1/user/email/send-otp`

Send OTP to verify a new email address.

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |

---

### POST `/api/v1/user/email/confirm`

Confirm email change with OTP.

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `otp` | string | Yes |

---

### POST `/api/v1/user/mobile/send-otp`

Send OTP to verify mobile number.

| Field | Type | Required |
|-------|------|----------|
| `phone` | string | Yes |

---

### POST `/api/v1/user/mobile/confirm`

Confirm mobile number with OTP.

| Field | Type | Required |
|-------|------|----------|
| `phone` | string | Yes |
| `otp` | string | Yes |

---

## 4. Cycle Routes

**Mount prefix:** `/api/v1/cycles`
**Source:** `cycle.routes.ts`
**Default auth:** All routes require `authenticate`

### GET `/api/v1/cycles/`

List all cycles for the authenticated user.

**Success (200):** Array of cycle objects.

---

### POST `/api/v1/cycles/log`

Log a new period entry.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `startDate` | string (ISO date) | Yes | |
| `endDate` | string (ISO date) | No | |
| `flow` | string | No | `heavy`, `medium`, `light`, `spotting` |
| `painLevel` | number | No | 0-10 |
| `mood` | string | No | |
| `symptoms` | string[] | No | |

**Success (201):** Created cycle object.

**Errors:**
- `400` -- Missing startDate, invalid date, invalid flow, painLevel out of range

---

### GET `/api/v1/cycles/predict`

Get cycle predictions based on history.

**Success (200):** Prediction data (next period date, fertile window, ovulation day).

---

### PUT `/api/v1/cycles/:id`

Update an existing period entry.

| Param | Type | Required |
|-------|------|----------|
| `id` | string (path) | Yes |

Body: Same fields as POST `/log`.

---

### DELETE `/api/v1/cycles/:id`

Delete a period entry.

---

### POST `/api/v1/cycles/symptoms`

Log symptoms for the current cycle day.

| Field | Type | Required |
|-------|------|----------|
| `symptoms` | string[] | Yes |
| `notes` | string | No |

**Success (201):** Created symptom log.

---

### POST `/api/v1/cycles/bbt` -- PREMIUM

**Auth:** `requireSubscription('cycle:bbt')`

Log basal body temperature.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `temperature` | number | Yes | 35.0 - 39.0 (Celsius) |
| `logDate` | string | Yes | |
| `time` | string | No | |
| `method` | string | No | |
| `notes` | string | No | |

**Success (201):** Created BBT log.

**Errors:**
- `400` -- Missing required fields, temperature out of range
- `403` -- No active subscription

---

### GET `/api/v1/cycles/bbt` -- PREMIUM

**Auth:** `requireSubscription('cycle:bbt')`

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 90 |

**Success (200):** Array of BBT logs.

---

### POST `/api/v1/cycles/cervical-mucus` -- PREMIUM

**Auth:** `requireSubscription('cycle:cervical-mucus')`

| Field | Type | Required |
|-------|------|----------|
| `type` | string | Yes |
| `logDate` | string | Yes |
| `amount` | string | No |
| `notes` | string | No |

**Success (201):** Created cervical mucus log.

---

### GET `/api/v1/cycles/cervical-mucus` -- PREMIUM

**Auth:** `requireSubscription('cycle:cervical-mucus')`

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 90 |

---

### POST `/api/v1/cycles/fertility-daily` -- PREMIUM

**Auth:** `requireSubscription('cycle:fertility-daily')`

| Field | Type | Required |
|-------|------|----------|
| `logDate` | string | Yes |
| (other fields) | mixed | No |

---

### GET `/api/v1/cycles/fertility-daily` -- PREMIUM

**Auth:** `requireSubscription('cycle:fertility-daily')`

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 90 |

---

### GET `/api/v1/cycles/fertility-insights` -- PREMIUM

**Auth:** `requireSubscription('cycle:fertility-insights')`

Returns computed fertility insights for the user.

---

### GET `/api/v1/cycles/ayurvedic-insights` -- PREMIUM

**Auth:** `requireSubscription('cycle:ayurvedic-insights')`

Returns Ayurvedic + modern science insights based on cycle data.

---

## 5. Wellness Routes

**Mount prefix:** `/api/v1/wellness`
**Source:** `wellness.routes.ts`

### GET `/api/v1/wellness/`

**Auth:** None (public)

List active wellness activities.

| Query | Type | Notes |
|-------|------|-------|
| `category` | string | Filter by category |
| `phase` | string | Filter by cycle phase (uppercased) |

**Success (200):** Array of wellness activity objects.

---

### GET `/api/v1/wellness/daily-score`

**Auth:** Required

Compute today's wellness score (composite of mood, water, symptoms).

**Success (200):**
```json
{
  "data": {
    "score": 75,
    "components": {
      "mood": { "score": 80, "logged": true, "value": "GOOD" },
      "water": { "score": 63, "glasses": 5, "target": 8 },
      "sleep": { "logged": true, "hours": 7 },
      "exercise": { "logged": false },
      "symptoms": { "score": 85, "count": 1 }
    },
    "date": "2026-03-15T00:00:00.000Z"
  }
}
```

Score formula: `mood(40%) + water(30%) + symptoms(30%)`

---

### POST `/api/v1/wellness/log`

**Auth:** Required

Log water intake, sleep hours, or exercise.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | string | Yes | `water`, `sleep`, or `exercise` |
| `value` | number | Yes | 0-100; for water capped at 20 glasses |
| `notes` | string | No | |

**Success (200/201):** Created/updated log entry.

**Errors:**
- `400` -- Missing type/value, invalid type, value out of range

---

### GET `/api/v1/wellness/history`

**Auth:** Required

Get wellness history over a date range.

| Query | Type | Default | Notes |
|-------|------|---------|-------|
| `days` | number | 30 | 1-90 |

**Success (200):** Array of daily records with water, sleep, exercise, mood, and composite score.

Score formula (history): `water(30) + mood(25) + sleep(25) + exercise(20)` -- max 100.

---

## 6. Wellness Content Routes

**Mount prefix:** `/api/v1/wellness-content`
**Source:** `wellness-content.routes.ts`

### GET `/api/v1/wellness-content/`

**Auth:** Required

List wellness content items.

---

### GET `/api/v1/wellness-content/bulk`

**Auth:** Required

Bulk fetch wellness content.

---

### Admin CRUD (all require `requireAdmin`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/wellness-content/admin` | List all content (admin) |
| POST | `/api/v1/wellness-content/admin` | Create content |
| PUT | `/api/v1/wellness-content/admin/:id` | Update content |
| DELETE | `/api/v1/wellness-content/admin/:id` | Delete content |

---

## 7. Notification Routes

**Mount prefix:** `/api/v1/notifications`
**Source:** `notification.routes.ts`

### GET `/api/v1/notifications/vapid-key`

**Auth:** None (public)

Get VAPID public key for web push subscription.

**Success (200):** `{ "data": { "publicKey": "..." } }`

**Errors:**
- `503` -- Push not configured (VAPID keys missing)

---

### POST `/api/v1/notifications/subscribe`

**Auth:** Required

Save push subscription for the user.

| Field | Type | Required |
|-------|------|----------|
| `subscription` | object | Yes |
| `subscription.endpoint` | string | Yes |

**Errors:**
- `400` -- Invalid subscription (missing endpoint)

---

### POST `/api/v1/notifications/unsubscribe`

**Auth:** Required

Remove push subscription.

---

### GET `/api/v1/notifications/preferences`

**Auth:** Required

Get notification preferences. Creates defaults if none exist.

**Success (200):** NotificationPreference object.

---

### PUT `/api/v1/notifications/preferences`

**Auth:** Required

Update notification preferences.

| Field | Type | Notes |
|-------|------|-------|
| `pushEnabled` | boolean | |
| `periodReminder` | boolean | |
| `periodReminderDays` | number | 1-7 |
| `ovulationReminder` | boolean | |
| `waterReminder` | boolean | |
| `waterIntervalHours` | number | 0.5-6 |
| `waterStartHour` | number | 0-23 |
| `waterEndHour` | number | 0-23 |
| `moodReminder` | boolean | |
| `moodReminderHour` | number | 0-23 |
| `appointmentReminder` | boolean | |
| `appointmentLeadMins` | number | |

**Errors:**
- `400` -- Value out of valid range

---

### GET `/api/v1/notifications/`

**Auth:** Required

List user notifications (last 50). Also fires smart notification generation (idempotent, async).

**Success (200):**
```json
{
  "success": true,
  "data": [ ...notifications ],
  "unreadCount": 3,
  "timestamp": "..."
}
```

Note: This response does NOT use the standard envelope's `data` wrapper for `unreadCount` -- it is at the top level alongside `data`.

---

### PUT `/api/v1/notifications/read-all`

**Auth:** Required

Mark all notifications as read.

---

### PUT `/api/v1/notifications/:id/read`

**Auth:** Required

Mark a single notification as read.

**Errors:**
- `404` -- Notification not found

---

### PATCH `/api/v1/notifications/:id/read`

**Auth:** Required

Legacy compatibility endpoint. Same behavior as PUT above.

---

## 8. Doctor Routes

**Mount prefix:** `/api/v1/doctors`
**Source:** `doctor.routes.ts`

### GET `/api/v1/doctors/`

**Auth:** None (public)

List published doctors.

---

### GET `/api/v1/doctors/:id`

**Auth:** None (public)

Get a single doctor's details.

**Errors:**
- `404` -- Doctor not found

---

### GET `/api/v1/doctors/:id/slots`

**Auth:** None (public)

Get available appointment slots for a doctor.

---

### GET `/api/v1/doctors/all`

**Auth:** Admin only

List all doctors (including unpublished).

---

### POST `/api/v1/doctors/`

**Auth:** Admin only

Create a new doctor profile.

---

### PUT `/api/v1/doctors/:id`

**Auth:** Admin only

Update a doctor profile.

---

### DELETE `/api/v1/doctors/:id`

**Auth:** Admin only

Delete a doctor profile.

---

## 9. Products Routes

**Mount prefix:** `/api/v1/products`
**Source:** `products.routes.ts`

### GET `/api/v1/products/`

**Auth:** None (public)

Search and filter products.

| Query | Type | Notes |
|-------|------|-------|
| `search` | string | Search name/description |
| `category` | string | Filter by category |
| `minPrice` | number | |
| `maxPrice` | number | |
| `sort` | string | Sort field |
| `page` | number | Default 1 |
| `limit` | number | Default 20 |

---

### GET `/api/v1/products/dosha-recommendations`

**Auth:** None (public) or optional auth

Get product recommendations based on dosha type.

---

### GET `/api/v1/products/:id`

**Auth:** None (public)

Get a single product with details.

---

### GET `/api/v1/products/:id/reviews`

**Auth:** None (public)

List reviews for a product.

---

### POST `/api/v1/products/:id/reviews`

**Auth:** Required

Submit a product review.

| Field | Type | Required |
|-------|------|----------|
| `rating` | number | Yes |
| `comment` | string | No |

---

### GET `/api/v1/products/:id/related`

**Auth:** None (public)

Get related products.

---

### GET `/api/v1/products/wishlist`

**Auth:** Required

Get user's wishlist.

---

### POST `/api/v1/products/wishlist/:id`

**Auth:** Required

Add product to wishlist.

---

### DELETE `/api/v1/products/wishlist/:id`

**Auth:** Required

Remove product from wishlist.

---

### Admin Endpoints (all require `requireAdmin`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/products/admin/all` | List all products |
| POST | `/api/v1/products/admin` | Create product |
| PUT | `/api/v1/products/admin/:id` | Update product |
| DELETE | `/api/v1/products/admin/:id` | Delete product |
| PATCH | `/api/v1/products/admin/:id/reviews/:reviewId` | Moderate review |

---

## 10. Admin Routes

**Mount prefix:** `/api/v1/admin`
**Source:** `admin.routes.ts`
**Default auth:** All routes require `authenticate` + `requireAdmin`

### POST `/api/v1/admin/verify-pin`

Verify admin PIN for elevated operations.

| Field | Type | Required |
|-------|------|----------|
| `pin` | string | Yes |

**Success (200):** `{ "data": { "verified": true } }`

**Errors:**
- `400` -- PIN missing
- `401` -- Invalid PIN
- `500` -- `ADMIN_PIN_HASH` env var not set

---

### GET `/api/v1/admin/stats`

Get quick count statistics.

**Success (200):**
```json
{ "data": { "users": 100, "doctors": 10, "products": 50, "articles": 30, "appointments": 200 } }
```

---

### GET `/api/v1/admin/dashboard`

Get dashboard data (recent products, articles, doctors).

---

### GET `/api/v1/admin/analytics`

Get aggregated analytics (user counts, mood distribution, avg cycle length, recent signups).

---

### Users Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/users` | List users (paginated, searchable) |
| PATCH | `/api/v1/admin/users/:id` | Update user role/active status |
| DELETE | `/api/v1/admin/users/:id` | Deactivate user (soft delete) |

**GET `/api/v1/admin/users` Query Params:**

| Query | Type | Notes |
|-------|------|-------|
| `page` | number | Default 1 |
| `limit` | number | Default 20 |
| `search` | string | Search name/email/phone |
| `role` | string | `USER`, `DOCTOR`, `ADMIN` |

**PATCH body:** `{ "role": "ADMIN", "isActive": false }`

---

### Appointments Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/appointments` | List all appointments (paginated) |
| PATCH | `/api/v1/admin/appointments/:id` | Update appointment status |

**Appointment statuses:** `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`, `NO_SHOW`, `CANCELLED`

Note: Auto-completes past PENDING/CONFIRMED appointments on list fetch.

---

### Products CRUD

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/products` | List all products |
| POST | `/api/v1/admin/products` | Create product |
| PUT | `/api/v1/admin/products/:id` | Update product |
| POST | `/api/v1/admin/products/:id/toggle-publish` | Toggle publish status |
| PATCH | `/api/v1/admin/products/:id/publish` | Publish product |
| PATCH | `/api/v1/admin/products/:id/unpublish` | Unpublish product |
| DELETE | `/api/v1/admin/products/:id` | Delete product |

---

### Articles CRUD

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/articles` | List all articles |
| POST | `/api/v1/admin/articles` | Create article |
| PUT | `/api/v1/admin/articles/:id` | Update article |
| POST | `/api/v1/admin/articles/:id/toggle-publish` | Toggle DRAFT/PUBLISHED |
| PATCH | `/api/v1/admin/articles/:id/publish` | Publish article |
| PATCH | `/api/v1/admin/articles/:id/unpublish` | Unpublish article |
| DELETE | `/api/v1/admin/articles/:id` | Delete article |

---

### Doctors CRUD

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/doctors` | List all doctors |
| POST | `/api/v1/admin/doctors` | Create doctor (optionally links User account) |
| PUT | `/api/v1/admin/doctors/:id` | Update doctor |
| POST | `/api/v1/admin/doctors/:id/toggle-publish` | Toggle publish |
| PATCH | `/api/v1/admin/doctors/:id/approve` | Approve & publish doctor |
| PATCH | `/api/v1/admin/doctors/:id/reject` | Reject doctor |
| POST | `/api/v1/admin/doctors/:id/toggle-promote` | Toggle promoted status |
| DELETE | `/api/v1/admin/doctors/:id` | Delete doctor |

---

### File Upload

### POST `/api/v1/admin/upload`

Upload a file (image/video).

- **Content-Type:** `multipart/form-data`
- **Field name:** `file`
- **Max size:** 10 MB
- **Allowed types:** JPEG, PNG, GIF, WebP, MP4, MOV, AVI, QuickTime

**Success (200):** `{ "data": { "url": "/uploads/filename", "filename": "...", "size": 12345 } }`

---

### Callback Requests

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/callbacks` | List all callback requests |
| PATCH | `/api/v1/admin/callbacks/:id` | Update status/notes |
| DELETE | `/api/v1/admin/callbacks/:id` | Delete callback request |

**Callback statuses:** `PENDING`, `CONTACTED`, `COMPLETED`, `CANCELLED`

---

### Product Analytics

### GET `/api/v1/admin/analytics/products`

Returns product statistics: total, published, out-of-stock, low-stock alerts, top 5 by reviews, category breakdown.

---

### Doctor Analytics

### GET `/api/v1/admin/analytics/doctors`

Returns per-doctor booking stats: total bookings, confirmed, completed, cancelled, no-show, revenue, cancellation rate.

---

### Prescriptions

### GET `/api/v1/admin/prescriptions`

List all prescriptions with appointment and user details.

---

### Test Email

### POST `/api/v1/admin/test-email`

Send a test welcome email.

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |

---

### Orders Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/orders` | List orders (paginated, filterable) |
| PATCH | `/api/v1/admin/orders/:id/status` | Update order status |

**Order statuses:** `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`

Note: Cancelling/returning restores product stock.

---

### Dosha Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/dosha/profiles` | List all dosha profiles (paginated) |
| GET | `/api/v1/admin/dosha/profiles/:userId` | Detailed dosha profile |
| PATCH | `/api/v1/admin/dosha/profiles/:userId/verify` | Admin verify/override dosha |
| GET | `/api/v1/admin/dosha/analytics` | Dosha distribution stats |
| GET | `/api/v1/admin/dosha/questions` | List quiz questions |
| POST | `/api/v1/admin/dosha/questions` | Create question |
| PUT | `/api/v1/admin/dosha/questions/:id` | Update question |
| DELETE | `/api/v1/admin/dosha/questions/:id` | Delete question |

---

### Doctor Payouts & Settlements

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/payouts/summary` | Per-doctor unsettled earnings overview |
| GET | `/api/v1/admin/payouts` | List all payouts (filterable by status, doctorId) |
| POST | `/api/v1/admin/payouts/generate` | Generate settlement for a doctor |
| PATCH | `/api/v1/admin/payouts/:id` | Update payout status |
| DELETE | `/api/v1/admin/payouts/:id` | Delete payout (PENDING only) |

**Payout statuses:** `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `CANCELLED`

**POST generate body:**
| Field | Type | Required |
|-------|------|----------|
| `doctorId` | string | Yes |
| `commissionRate` | number | No (overrides doctor/platform default) |

---

### Wellness Activities Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/wellness` | List all activities |
| POST | `/api/v1/admin/wellness` | Create activity |
| PUT | `/api/v1/admin/wellness/:id` | Update activity |
| POST | `/api/v1/admin/wellness/:id/toggle-publish` | Toggle active/inactive |
| DELETE | `/api/v1/admin/wellness/:id` | Delete activity |

**Valid categories:** `yoga`, `breathing`, `meditation`, `stress_management`

---

### Programs Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/programs` | List programs (with content/enrollment counts) |
| POST | `/api/v1/admin/programs` | Create program |
| PUT | `/api/v1/admin/programs/:id` | Update program |
| POST | `/api/v1/admin/programs/:id/toggle-publish` | Toggle publish |
| DELETE | `/api/v1/admin/programs/:id` | Delete program |
| GET | `/api/v1/admin/programs/:id/contents` | List program content |
| POST | `/api/v1/admin/programs/:id/contents` | Add content to program |
| PUT | `/api/v1/admin/programs/contents/:contentId` | Update content item |
| DELETE | `/api/v1/admin/programs/contents/:contentId` | Delete content item |
| GET | `/api/v1/admin/programs/:id/enrollments` | List enrollments |

---

## 11. Debug Routes

**Mount prefix:** `/api/v1/debug`
**Source:** `debug.routes.ts`

### GET `/api/v1/debug/health`

**Auth:** None (public)

Health check -- tests database connectivity.

**Success (200):**
```json
{ "status": "ok", "db": "connected", "version": "2.2", "timestamp": "..." }
```

**Error (500):**
```json
{ "status": "error", "db": "disconnected" }
```

---

### GET `/api/v1/debug/`

**Auth:** Admin only

Full debug info with entity counts.

**Success (200):**
```json
{
  "status": "ok", "db": "connected",
  "counts": { "users": 0, "cycles": 0, "appointments": 0, "doctors": 0 },
  "version": "2.2"
}
```

---

## 12. Mood Routes

**Mount prefix:** `/api/v1/mood`
**Source:** `mood.routes.ts`
**Default auth:** All routes require `authenticate`

### POST `/api/v1/mood/`

Log a mood entry.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `mood` | string | Yes | e.g. `GREAT`, `GOOD`, `OKAY`, `LOW`, `BAD` |
| `notes` | string | No | |

**Success (201):** Created mood log.

---

### GET `/api/v1/mood/history`

Get mood history.

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 30 |

**Success (200):** Array of mood log entries.

---

## 13. Pregnancy Routes

**Mount prefix:** `/api/v1/pregnancy`
**Source:** `pregnancy.routes.ts`
**Default auth:** All routes require `authenticate`

### GET `/api/v1/pregnancy/`

Get active pregnancy details with current week data.

**Success (200):** Pregnancy object with week-specific information.

---

### POST `/api/v1/pregnancy/`

Create/start a new pregnancy tracking.

| Field | Type | Required |
|-------|------|----------|
| `dueDate` | string | Yes |
| `lastPeriodDate` | string | No |

---

### DELETE `/api/v1/pregnancy/`

End pregnancy tracking.

---

## 14. Hospital Routes

**Mount prefix:** `/api/v1/hospitals`
**Source:** `hospital.routes.ts`
**Default auth:** None (all public)

### GET `/api/v1/hospitals/`

Search hospitals.

| Query | Type | Notes |
|-------|------|-------|
| `search` | string | Search by name/location |
| `lat` | number | Latitude for proximity search |
| `lng` | number | Longitude for proximity search |

---

### GET `/api/v1/hospitals/compare/prices`

Compare prices across hospitals for a procedure.

---

### GET `/api/v1/hospitals/:id`

Get hospital details.

---

## 15. Article Routes

**Mount prefix:** `/api/v1/articles`
**Source:** `article.routes.ts`

### GET `/api/v1/articles/`

**Auth:** None (public)

List published articles with filters.

---

### GET `/api/v1/articles/all`

**Auth:** Admin only

List all articles (including drafts).

---

### GET `/api/v1/articles/recommended`

**Auth:** `optionalAuth`

Get recommended articles (personalized if authenticated).

---

### GET `/api/v1/articles/bookmarked`

**Auth:** Required

Get user's bookmarked articles.

---

### POST `/api/v1/articles/:id/bookmark`

**Auth:** Required

Toggle bookmark on an article.

---

### POST `/api/v1/articles/:id/like`

**Auth:** Required

Toggle like on an article.

---

### GET `/api/v1/articles/:id/comments`

**Auth:** None (public)

List comments on an article.

---

### POST `/api/v1/articles/:id/comments`

**Auth:** Required (DOCTOR or ADMIN role)

Add a comment to an article.

---

### DELETE `/api/v1/articles/:id/comments/:commentId`

**Auth:** Required

Delete a comment (own comment, or admin).

---

### GET `/api/v1/articles/:slug`

**Auth:** `optionalAuth`

Get article by slug (increments view count).

---

### Admin CRUD:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/articles/` | Admin | Create article |
| PUT | `/api/v1/articles/:id` | Admin | Update article |
| DELETE | `/api/v1/articles/:id` | Admin | Delete article |

---

## 16. Appointment Routes

**Mount prefix:** `/api/v1/appointments`
**Source:** `appointment.routes.ts`
**Default auth:** All routes require `authenticate`

### POST `/api/v1/appointments/`

Create a new appointment. Generates a Jitsi meeting link.

| Field | Type | Required |
|-------|------|----------|
| `doctorId` | string | Yes |
| `scheduledAt` | string (ISO) | Yes |
| `reason` | string | No |
| `notes` | string | No |

**Success (201):** Appointment object with `meetingLink`.

---

### GET `/api/v1/appointments/`

List user's appointments.

---

### GET `/api/v1/appointments/:id`

Get appointment details.

---

### PATCH `/api/v1/appointments/:id/cancel`

Cancel an appointment.

---

### PATCH `/api/v1/appointments/:id/status`

**Auth:** Admin only

Update appointment status.

| Field | Type | Required |
|-------|------|----------|
| `status` | string | Yes |

---

## 17. Upload Routes

**Mount prefix:** `/api/v1/upload`
**Source:** `upload.routes.ts`
**Rate limit:** 20 requests / 15 min
**Default auth:** All routes require `authenticate`

### POST `/api/v1/upload/image`

Upload a single image.

- **Max size:** 5 MB
- **Content-Type:** `multipart/form-data`

---

### POST `/api/v1/upload/video`

Upload a single video.

- **Max size:** 50 MB

---

### POST `/api/v1/upload/multiple`

Upload multiple files.

---

### DELETE `/api/v1/upload/:publicId`

**Auth:** Admin only

Delete an uploaded file by public ID.

---

## 18. AI Routes

**Mount prefix:** `/api/v1/ai`
**Source:** `ai.routes.ts`
**Rate limit:** 20 requests / 15 min
**Default auth:** All routes require `authenticate`

### POST `/api/v1/ai/chat`

Send a message to the AI assistant.

| Field | Type | Required |
|-------|------|----------|
| `message` | string | Yes |
| `context` | object | No |

**Success (200):** AI response object.

---

## 19. Cart Routes

**Mount prefix:** `/api/v1/cart`
**Source:** `cart.routes.ts`
**Default auth:** All routes require `authenticate`

Note: Cart is stored **in-memory** (not database-backed). Cart data is lost on server restart.

### GET `/api/v1/cart/`

Get current cart contents.

---

### POST `/api/v1/cart/add`

Add item to cart.

| Field | Type | Required |
|-------|------|----------|
| `productId` | string | Yes |
| `quantity` | number | No (default 1) |

---

### DELETE `/api/v1/cart/:id`

Remove item from cart.

---

### POST `/api/v1/cart/checkout`

Checkout the cart (creates an order).

---

## 20. Achievements Routes

**Mount prefix:** `/api/v1/achievements`
**Source:** `achievements.routes.ts`
**Default auth:** All routes require `authenticate`

### GET `/api/v1/achievements/`

Get computed badges/achievements for the user.

**Success (200):** Array of achievement objects with earned status.

---

## 21. Reports Routes

**Mount prefix:** `/api/v1/reports`
**Source:** `reports.routes.ts`
**Default auth:** `authenticate` + `requireSubscription`

### GET `/api/v1/reports/summary`

Get health summary report (premium feature).

**Errors:**
- `403` -- No active subscription

---

## 22. Callback Routes

**Mount prefix:** `/api/v1/callback`
**Source:** `callback.routes.ts`
**Rate limit:** 5 requests / 15 min (IP-based)

### POST `/api/v1/callback/`

**Auth:** None (public)

Submit a callback request.

| Field | Type | Required |
|-------|------|----------|
| `name` | string | Yes |
| `phone` | string | Yes |
| `reason` | string | No |

---

## 23. Prescription Routes

**Mount prefix:** `/api/v1/prescriptions`
**Source:** `prescription.routes.ts`
**Default auth:** All routes require `authenticate`

### POST `/api/v1/prescriptions/`

Create a prescription (doctor creates for a patient).

| Field | Type | Required |
|-------|------|----------|
| `appointmentId` | string | Yes |
| `medications` | array | Yes |
| `diagnosis` | string | No |
| `notes` | string | No |

---

### GET `/api/v1/prescriptions/my`

Get patient's own prescriptions.

---

### GET `/api/v1/prescriptions/appointment/:appointmentId`

Get prescription for a specific appointment.

---

### GET `/api/v1/prescriptions/:id`

Get a single prescription by ID.

---

## 24. Payment Routes

**Mount prefix:** `/api/v1/payments`
**Source:** `payment.routes.ts`

### POST `/api/v1/payments/webhook`

**Auth:** None (public, raw body for Razorpay signature verification)

Razorpay payment webhook handler.

---

### POST `/api/v1/payments/create-order`

**Auth:** Required

Create a Razorpay order for product purchase.

---

### POST `/api/v1/payments/verify`

**Auth:** Required

Verify Razorpay payment signature after successful payment.

| Field | Type | Required |
|-------|------|----------|
| `razorpay_order_id` | string | Yes |
| `razorpay_payment_id` | string | Yes |
| `razorpay_signature` | string | Yes |

---

### POST `/api/v1/payments/cod`

**Auth:** Required

Place a Cash on Delivery order.

---

### POST `/api/v1/payments/appointment-order`

**Auth:** Required

Create a Razorpay order for an appointment payment.

---

### POST `/api/v1/payments/verify-appointment`

**Auth:** Required

Verify appointment payment.

---

### GET `/api/v1/payments/orders`

**Auth:** Required

List user's orders.

---

### GET `/api/v1/payments/orders/:id`

**Auth:** Required

Get a specific order.

---

## 25. Doctor Dashboard Routes

**Mount prefix:** `/api/v1/doctor-dashboard`
**Source:** `doctor-dashboard.routes.ts`
**Default auth:** `authenticate` + `requireDoctor`

### GET `/api/v1/doctor-dashboard/`

Get doctor dashboard overview (stats, recent appointments).

---

### GET `/api/v1/doctor-dashboard/appointments`

List doctor's appointments.

---

### PATCH `/api/v1/doctor-dashboard/appointments/:id/status`

Update appointment status.

---

### GET `/api/v1/doctor-dashboard/profile`

Get doctor profile.

---

### PUT `/api/v1/doctor-dashboard/profile`

Update doctor profile.

---

### Slots Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/doctor-dashboard/slots` | List available slots |
| POST | `/api/v1/doctor-dashboard/slots` | Create slot |
| PUT | `/api/v1/doctor-dashboard/slots/:id` | Update slot |
| DELETE | `/api/v1/doctor-dashboard/slots/:id` | Delete slot |

---

### Prescriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/doctor-dashboard/prescriptions` | List prescriptions created |
| POST | `/api/v1/doctor-dashboard/prescriptions` | Create prescription |

---

### Reviews

### GET `/api/v1/doctor-dashboard/reviews`

Get reviews received by the doctor.

---

### Articles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/doctor-dashboard/articles` | List doctor's articles |
| POST | `/api/v1/doctor-dashboard/articles` | Create article |
| PUT | `/api/v1/doctor-dashboard/articles/:id` | Update article |
| DELETE | `/api/v1/doctor-dashboard/articles/:id` | Delete article |

---

### Patient Dosha

### GET `/api/v1/doctor-dashboard/patients/:id/dosha`

Get a patient's dosha profile.

---

### Earnings

### GET `/api/v1/doctor-dashboard/earnings`

Get doctor's earnings summary.

---

## 26. Dosha Routes

**Mount prefix:** `/api/v1/dosha`
**Source:** `dosha.routes.ts`
**Default auth:** All routes require `authenticate`

### GET `/api/v1/dosha/questions`

Get dosha assessment quiz questions.

---

### POST `/api/v1/dosha/assess`

Submit dosha assessment answers.

| Field | Type | Required |
|-------|------|----------|
| `answers` | object | Yes |

**Success (200):** Dosha profile with scores (vata, pitta, kapha).

---

### POST `/api/v1/dosha/migrate`

Migrate legacy dosha data to new format.

---

### GET `/api/v1/dosha/profile`

Get current dosha profile.

---

### GET `/api/v1/dosha/history`

Get assessment history.

---

## 27. Weather Routes

**Mount prefix:** `/api/v1/weather`
**Source:** `weather.routes.ts`
**Default auth:** All routes require `authenticate`

### POST `/api/v1/weather/location`

Update user's location for weather data.

| Field | Type | Required |
|-------|------|----------|
| `latitude` | number | Yes |
| `longitude` | number | Yes |

---

### GET `/api/v1/weather/current`

Get current weather for user's saved location.

---

## 28. Finance Routes

**Mount prefix:** `/api/v1/finance`
**Source:** `finance.routes.ts`

### GET `/api/v1/finance/config/public`

**Auth:** None (public)

Get public platform configuration (currency, payment methods, etc.).

---

### POST `/api/v1/finance/coupon/validate`

**Auth:** Required

Validate a coupon code.

| Field | Type | Required |
|-------|------|----------|
| `code` | string | Yes |
| `amount` | number | No |

---

### Admin Endpoints (all require `requireAdmin`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/finance/config` | Get full platform config |
| PUT | `/api/v1/finance/config` | Update platform config |
| GET | `/api/v1/finance/coupons` | List coupons |
| POST | `/api/v1/finance/coupons` | Create coupon |
| PUT | `/api/v1/finance/coupons/:id` | Update coupon |
| DELETE | `/api/v1/finance/coupons/:id` | Delete coupon |
| GET | `/api/v1/finance/analytics` | Revenue analytics |
| GET | `/api/v1/finance/product-payouts` | Product payout info |
| GET | `/api/v1/finance/audit-log` | Audit log (supports CSV export) |

---

## 29. Program Routes

**Mount prefix:** `/api/v1/programs`
**Source:** `program.routes.ts`

### GET `/api/v1/programs/`

**Auth:** None (public)

List published programs.

---

### GET `/api/v1/programs/:id`

**Auth:** None (public)

Get program details.

---

### GET `/api/v1/programs/me/enrolled`

**Auth:** Required

List programs the user is enrolled in.

---

### GET `/api/v1/programs/me/enrolled/:programId`

**Auth:** Required

Get enrollment details for a specific program.

---

### POST `/api/v1/programs/me/progress`

**Auth:** Required

Update progress on a program content item.

---

### POST `/api/v1/programs/:id/enroll`

**Auth:** Required

Enroll in a free program.

---

### POST `/api/v1/programs/:id/enroll-paid`

**Auth:** Required

Enroll in a paid program (after payment).

---

### POST `/api/v1/programs/:id/leave`

**Auth:** Required

Leave/unenroll from a program.

---

## 30. Seller Routes

**Mount prefix:** `/api/v1/sellers`
**Source:** `seller.routes.ts`
**Default auth:** All routes require `authenticate`

### Seller Self-Service

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sellers/me` | Get seller profile |
| PUT | `/api/v1/sellers/me` | Update seller profile |
| GET | `/api/v1/sellers/me/eligibility` | Check seller eligibility |
| GET | `/api/v1/sellers/me/products` | List seller's products |
| GET | `/api/v1/sellers/me/dashboard` | Seller dashboard stats |
| GET | `/api/v1/sellers/me/transactions` | Transaction history |
| GET | `/api/v1/sellers/me/payouts` | Payout history |
| GET | `/api/v1/sellers/me/top-products` | Top-selling products |
| GET | `/api/v1/sellers/me/area-sales` | Area-based sales data |

### Admin Seller Management (require `requireAdmin`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sellers/admin/create` | Create seller account |
| PUT | `/api/v1/sellers/admin/:id` | Update seller |
| PATCH | `/api/v1/sellers/admin/:id/documents` | Update documents |
| GET | `/api/v1/sellers/admin/:id/checklist` | Get onboarding checklist |
| GET | `/api/v1/sellers/admin/list` | List all sellers |
| GET | `/api/v1/sellers/admin/:id` | Get seller detail |
| PATCH | `/api/v1/sellers/admin/:id/status` | Update seller status |
| PATCH | `/api/v1/sellers/admin/:id/commission` | Update commission rate |
| GET | `/api/v1/sellers/admin/:id/earnings` | Get seller earnings |
| POST | `/api/v1/sellers/admin/:id/generate-payout` | Generate payout |
| GET | `/api/v1/sellers/admin/payouts/all` | List all payouts |
| PATCH | `/api/v1/sellers/admin/payouts/:payoutId` | Update payout |
| GET | `/api/v1/sellers/admin/analytics/overview` | Seller analytics overview |

CSV export available on several admin endpoints via `?format=csv` query parameter.

---

## 31. Community Routes

**Mount prefix:** `/api/v1/community`
**Source:** `community.routes.ts`

### Posts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/community/posts` | `optionalAuth` | List posts |
| GET | `/api/v1/community/posts/:id` | `optionalAuth` | Get single post |
| POST | `/api/v1/community/posts` | Required | Create post |
| POST | `/api/v1/community/posts/:id/like` | Required | Toggle like |
| POST | `/api/v1/community/posts/:id/report` | Required | Report post |
| PUT | `/api/v1/community/posts/:id` | Required | Edit own post |
| DELETE | `/api/v1/community/posts/:id` | Required | Soft delete own post |

### Replies

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/community/posts/:id/replies` | `optionalAuth` | List replies |
| POST | `/api/v1/community/posts/:id/replies` | Required | Add reply |

### Polls

Posts can include polls. Poll voting is part of the post interactions.

### Moderation (ADMIN/DOCTOR)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/community/moderation/reported` | List reported posts |
| PATCH | `/api/v1/community/moderation/:id/resolve` | Resolve report |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| DELETE | `/api/v1/community/admin/posts/:id/hard-delete` | Permanently delete |
| PATCH | `/api/v1/community/admin/posts/:id/pin` | Toggle pin status |

---

## 32. Content Routes

**Mount prefix:** `/api/v1/content`
**Source:** `content.routes.ts`

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/content/dosha-questions` | Get dosha quiz questions |
| GET | `/api/v1/content/remedies` | Get Ayurvedic remedies |
| GET | `/api/v1/content/phase-guidance` | Get cycle phase guidance |

### Admin CRUD (require `requireAdmin`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/content/phase-guidance` | Create guidance |
| PUT | `/api/v1/content/phase-guidance/:id` | Update guidance |
| DELETE | `/api/v1/content/phase-guidance/:id` | Delete guidance |
| POST | `/api/v1/content/chat-responses` | Create chat response |
| PUT | `/api/v1/content/chat-responses/:id` | Update chat response |
| DELETE | `/api/v1/content/chat-responses/:id` | Delete chat response |
| POST | `/api/v1/content/remedies` | Create remedy |
| PUT | `/api/v1/content/remedies/:id` | Update remedy |
| DELETE | `/api/v1/content/remedies/:id` | Delete remedy |
| POST | `/api/v1/content/dosha-questions` | Create question |
| PUT | `/api/v1/content/dosha-questions/:id` | Update question |
| DELETE | `/api/v1/content/dosha-questions/:id` | Delete question |
| POST | `/api/v1/content/dosha-questions/:id/toggle` | Toggle question active |
| POST | `/api/v1/content/cache-refresh` | Refresh content cache |

---

## 33. Subscription Routes

**Mount prefix:** `/api/v1/subscriptions`
**Source:** `subscription.routes.ts`

### POST `/api/v1/subscriptions/webhook`

**Auth:** None (public, raw body for Razorpay signature verification)

Razorpay subscription webhook handler.

---

### User Endpoints (require `authenticate`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/subscriptions/plans` | List available plans |
| GET | `/api/v1/subscriptions/my` | Get user's subscription |
| POST | `/api/v1/subscriptions/create` | Create subscription (Razorpay) |
| POST | `/api/v1/subscriptions/verify` | Verify subscription payment |
| POST | `/api/v1/subscriptions/cancel` | Cancel subscription |
| GET | `/api/v1/subscriptions/invoices` | Get subscription invoices |

### Admin Endpoints (require `requireAdmin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/subscriptions/admin/plans` | List all plans |
| POST | `/api/v1/subscriptions/admin/plans` | Create plan |
| PUT | `/api/v1/subscriptions/admin/plans/:id` | Update plan |
| DELETE | `/api/v1/subscriptions/admin/plans/:id` | Delete plan |
| POST | `/api/v1/subscriptions/admin/sync-razorpay` | Sync plans with Razorpay |
| GET | `/api/v1/subscriptions/admin/promotions` | List promotions |
| POST | `/api/v1/subscriptions/admin/promotions` | Create promotion |
| PUT | `/api/v1/subscriptions/admin/promotions/:id` | Update promotion |
| DELETE | `/api/v1/subscriptions/admin/promotions/:id` | Delete promotion |
| GET | `/api/v1/subscriptions/admin/subscribers` | List subscribers |
| GET | `/api/v1/subscriptions/admin/analytics` | Subscription analytics |
| GET | `/api/v1/subscriptions/admin/events` | Subscription events log |
| POST | `/api/v1/subscriptions/admin/expire-check` | Run expiration check |

---

## 34. Analytics Routes

**Mount prefix:** `/api/v1/analytics`
**Source:** `analytics.routes.ts`

### User-Facing Endpoints

#### POST `/api/v1/analytics/track`

**Auth:** Required

Log a single user event (fire-and-forget).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `event` | string | Yes | Must be from allowed list (see below) |
| `category` | string | No | |
| `label` | string | No | |
| `value` | number | No | |
| `metadata` | object | No | |
| `sessionId` | string | No | |
| `referrer` | string | No | |

**Allowed events:** `page_view`, `paywall_viewed`, `paywall_dismissed`, `checkout_started`, `checkout_completed`, `checkout_abandoned`, `plan_selected`, `coupon_applied`, `coupon_failed`, `feature_locked`, `upgrade_prompt_shown`, `upgrade_prompt_clicked`, `subscription_page_viewed`, `trial_started`, `product_viewed`, `product_added_to_cart`, `cart_viewed`, `article_viewed`, `search_performed`, `feature_used`, `appointment_started`, `appointment_abandoned`, `session_start`, `session_end`, `nps_submitted`, `referral_click`, `share_clicked`, `streak_milestone`, `ab_variant_shown`

**Success (200):** `{ "ok": true }` (always succeeds, even on internal error)

**Errors:**
- `400` -- Missing event, invalid event type

---

#### POST `/api/v1/analytics/track/batch`

**Auth:** Required

Log multiple events at once.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `events` | array | Yes | Max 50 events per batch |

Each event in the array follows the same schema as `/track`. Metadata capped at 2048 chars. Labels capped at 255 chars.

---

#### POST `/api/v1/analytics/nps`

**Auth:** Required

Submit NPS (Net Promoter Score) survey.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `score` | number | Yes | 0-10 |
| `feedback` | string | No | |
| `page` | string | No | Page where survey was shown |

**Rate limit:** 1 submission per user per 30 days.

**Errors:**
- `400` -- Score out of range
- `429` -- Already submitted recently

---

### Admin Endpoints (all require `authenticate` + `requireAdmin`)

#### GET `/api/v1/analytics/admin/users/:id`

Aggregated user profile view: orders, subscriptions, appointments, events, community activity, engagement score, total spending.

---

#### GET `/api/v1/analytics/admin/leads`

Lead board -- users who showed purchase intent but didn't convert.

| Query | Type | Default | Notes |
|-------|------|---------|-------|
| `type` | string | `all` | `paywall`, `checkout_abandoned`, `feature_locked`, `all` |
| `page` | number | 1 | |
| `limit` | number | 50 | |

Returns lead score (0-100), lead type (`hot`/`warm`/`cold`), event breakdown per user.

---

#### GET `/api/v1/analytics/admin/funnel`

Conversion funnel: New Users -> Viewed Pricing -> Selected Plan -> Started Checkout -> Completed Payment.

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 30 |

Also includes top locked features (demand signal).

---

#### GET `/api/v1/analytics/admin/metrics`

Enhanced business metrics.

**Response includes:**
- **Revenue:** MRR, ARR, total revenue, month-over-month growth
- **Subscriptions:** Active count by interval (monthly/yearly/lifetime), churn rate
- **Engagement:** DAU, WAU, MAU, stickiness (DAU/MAU), 14-day DAU trend, signup trend
- **Retention:** Cohort-based day-1 and day-7 retention
- **Conversion:** Trial-to-paid conversion rate
- **Top Features:** Most used features (last 30 days)

---

#### GET `/api/v1/analytics/admin/events`

Raw event log with filters.

| Query | Type | Default |
|-------|------|---------|
| `event` | string | (all) |
| `userId` | string | (all) |
| `category` | string | (all) |
| `days` | number | 7 |
| `page` | number | 1 |
| `limit` | number | 100 |

---

#### GET `/api/v1/analytics/admin/events/summary`

Aggregated event counts by event type.

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 30 |

---

#### GET `/api/v1/analytics/admin/live-feed`

Real-time activity feed (most recent events with user details).

| Query | Type | Default | Notes |
|-------|------|---------|-------|
| `limit` | number | 30 | Max 100 |
| `after` | string (ISO) | None | Cursor for polling new events |

---

#### GET `/api/v1/analytics/admin/churn-risk`

Per-subscriber churn risk assessment.

| Query | Type | Default |
|-------|------|---------|
| `page` | number | 1 |
| `limit` | number | 30 |
| `risk` | string | (all) | `high`, `medium`, `low` |

Risk scoring (0-100) based on: login recency (30pts), activity decline (25pts), trial expiry (15pts), account age vs engagement (15pts), auto-renew disabled (15pts).

---

#### GET `/api/v1/analytics/admin/segments`

Dynamic user segmentation with multiple filters.

| Query | Type | Notes |
|-------|------|-------|
| `status` | string | `active`, `inactive`, `new`, `premium`, `free` |
| `role` | string | `USER`, `DOCTOR`, `ADMIN` |
| `minEvents` | number | |
| `maxEvents` | number | |
| `lastLoginDays` | number | Users not logged in N+ days |
| `hasEvent` | string | Specific event name |
| `minSpend` | number | |
| `maxSpend` | number | |
| `goal` | string | Primary health goal |
| `page` | number | Default 1 |
| `limit` | number | Default 50 |

---

#### GET `/api/v1/analytics/admin/alerts`

Smart threshold-based alerts. Automatically detects:
- Hot leads today
- Checkout abandonment spikes
- Signup trend changes
- Expiring trials
- Payment failures
- Feature lock demand
- Revenue milestones
- Inactive premium users

**Response:** `{ "alerts": [{ "type", "severity", "title", "detail", "value" }] }`

Severity levels: `critical`, `warning`, `success`, `info` (sorted in that order).

---

#### GET `/api/v1/analytics/admin/export/:type`

Export data as CSV download.

| Param | Values |
|-------|--------|
| `type` | `leads`, `users`, `events`, `revenue` |

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 30 |

**Response:** CSV file download (`Content-Type: text/csv`).

---

#### GET `/api/v1/analytics/admin/forecast`

Revenue forecasting with linear regression.

**Response includes:**
- Historical monthly revenue (6 months)
- 3-month forecast with confidence bands (20%)
- Current MRR and projected MRR
- Growth direction (growing/declining/flat)
- Churn rate trend
- Trial conversion projection

---

#### GET `/api/v1/analytics/admin/cohorts`

Compare signup cohorts.

| Query | Type | Default |
|-------|------|---------|
| `months` | number | 4 (max 12) |

Returns per-cohort: size, weekly retention, conversions, avg events, revenue.

---

#### GET `/api/v1/analytics/admin/journeys`

User journey / path analysis.

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 7 |

Returns: page popularity, top 3-step flows, page-to-page transitions, entry/exit pages.

---

#### GET `/api/v1/analytics/admin/geo`

Geographic and device analytics: user locations, device breakdown (mobile/desktop/tablet), top referrer domains, IP-based region grouping.

---

#### GET `/api/v1/analytics/admin/referrals`

Traffic source analysis.

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 30 |

Returns: source categories (direct/google/social/other), detailed sources, UTM breakdowns (source/medium/campaign), page view and visitor counts.

---

#### GET `/api/v1/analytics/admin/streaks`

Engagement streak analysis.

| Query | Type | Default |
|-------|------|---------|
| `minStreak` | number | 3 |
| `page` | number | 1 |
| `limit` | number | 30 |

Returns per-user: current streak, longest streak, total active days, streak distribution.

---

#### GET `/api/v1/analytics/admin/nps`

NPS results dashboard.

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 90 |

Returns: NPS score, promoter/passive/detractor counts, score distribution, monthly trend, recent feedback.

---

#### GET `/api/v1/analytics/admin/campaigns`

List push notification campaigns.

---

#### POST `/api/v1/analytics/admin/campaigns`

Create a push campaign.

| Field | Type | Required |
|-------|------|----------|
| `title` | string | Yes |
| `body` | string | Yes |
| `segment` | string | Yes |

**Segments:** `all`, `premium`, `free`, `inactive_7d`, `inactive_30d`, `new_7d`

---

#### POST `/api/v1/analytics/admin/campaigns/:id/send`

Send a push campaign to matched users. Creates notifications in DB for all matched users.

---

#### DELETE `/api/v1/analytics/admin/campaigns/:id`

Delete a campaign.

---

#### GET `/api/v1/analytics/admin/ltv`

Lifetime Value analysis.

Returns: avg LTV (all users & paying users), median LTV, distribution buckets, top 20 users, LTV by signup cohort, projected annual LTV.

---

#### GET `/api/v1/analytics/admin/ab-tests`

A/B test results.

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 30 |

Returns per-test: variants shown, conversions, conversion rates.

---

#### GET `/api/v1/analytics/admin/anomalies`

Anomaly detection (last 7 days vs 23-day baseline).

Detects: traffic spikes (>2x), traffic drops (<0.5x), error event spikes (>1.5x). Severity: `low`, `medium`, `high`.

---

#### GET `/api/v1/analytics/admin/health-score`

Platform health score (0-100).

Components: engagement (30pts), growth (20pts), retention (20pts), revenue (15pts), NPS (15pts).

Returns score, breakdown, and trend (`improving`/`stable`/`declining`).

---

#### GET `/api/v1/analytics/admin/sessions/:userId`

Session timelines for a specific user (last 90 days, max 20 sessions).

---

#### GET `/api/v1/analytics/admin/predictive-churn`

Predictive churn analysis using multi-signal scoring.

Signals: login recency (30pts), activity trend (25pts), subscription status (20pts), low engagement (15pts), usage consistency (10pts).

Returns counts by category (healthy/atRisk/churning) and top 20 churning users.

---

#### GET `/api/v1/analytics/admin/content-performance`

Content performance analysis: top viewed articles, products, and wellness features.

| Query | Type | Default |
|-------|------|---------|
| `days` | number | 30 (max 365) |

---

## 35. Referral Routes

**Mount prefix:** `/api/v1/referrals`
**Source:** `referral.routes.ts`
**Default auth:** All routes require `authenticate`

### User Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/referrals/my-code` | Get user's referral code |
| GET | `/api/v1/referrals/my-referrals` | List referrals made |
| POST | `/api/v1/referrals/invite` | Send referral invite |
| POST | `/api/v1/referrals/apply` | Apply a referral code |

### Badges

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/referrals/badges/my` | Get user's referral badges |
| GET | `/api/v1/referrals/badges/all` | List all available badges |
| POST | `/api/v1/referrals/badges/check` | Check badge eligibility |

### Admin (require `requireAdmin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/referrals/admin/all` | List all referrals |
| GET | `/api/v1/referrals/admin/stats` | Referral statistics |
| GET | `/api/v1/referrals/admin/badges` | Admin badge management |

---

## 36. Email Campaign Routes

**Mount prefix:** `/api/v1/email-campaigns`
**Source:** `email-campaign.routes.ts`
**Default auth:** All routes require `authenticate` + `requireAdmin`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/email-campaigns/` | List campaigns |
| GET | `/api/v1/email-campaigns/stats` | Campaign statistics |
| POST | `/api/v1/email-campaigns/` | Create campaign |
| PUT | `/api/v1/email-campaigns/:id` | Update campaign |
| DELETE | `/api/v1/email-campaigns/:id` | Delete campaign |
| POST | `/api/v1/email-campaigns/:id/toggle` | Toggle campaign active |
| POST | `/api/v1/email-campaigns/:id/send-test` | Send test email |
| POST | `/api/v1/email-campaigns/:id/send` | Send campaign |
| POST | `/api/v1/email-campaigns/trigger/:trigger` | Trigger automated campaign |

---

## 37. Insights Routes

**Mount prefix:** `/api/v1/insights`
**Source:** `insights.routes.ts`
**Default auth:** All routes require `authenticate`

### GET `/api/v1/insights/`

Get full personalized health insights.

---

### GET `/api/v1/insights/patterns`

Get detected health patterns.

---

### GET `/api/v1/insights/mood-trends`

Get mood trend analysis.

---

## Appendix: Route Mount Table

From `app.ts`, all routes are mounted at `/api/v1/`:

| Prefix | Router |
|--------|--------|
| `/auth` | auth.routes |
| `/user` | user.routes |
| `/cycles` | cycle.routes |
| `/wellness` | wellness.routes |
| `/wellness-content` | wellness-content.routes |
| `/notifications` | notification.routes |
| `/doctors` | doctor.routes |
| `/products` | products.routes |
| `/admin` | admin.routes |
| `/debug` | debug.routes |
| `/mood` | mood.routes |
| `/pregnancy` | pregnancy.routes |
| `/hospitals` | hospital.routes |
| `/articles` | article.routes |
| `/appointments` | appointment.routes |
| `/upload` | upload.routes |
| `/ai` | ai.routes |
| `/cart` | cart.routes |
| `/achievements` | achievements.routes |
| `/reports` | reports.routes |
| `/callback` | callback.routes |
| `/prescriptions` | prescription.routes |
| `/payments` | payment.routes |
| `/doctor-dashboard` | doctor-dashboard.routes |
| `/dosha` | dosha.routes |
| `/weather` | weather.routes |
| `/finance` | finance.routes |
| `/programs` | program.routes |
| `/sellers` | seller.routes |
| `/community` | community.routes |
| `/content` | content.routes |
| `/subscriptions` | subscription.routes |
| `/analytics` | analytics.routes |
| `/referrals` | referral.routes |
| `/email-campaigns` | email-campaign.routes |
| `/insights` | insights.routes |
