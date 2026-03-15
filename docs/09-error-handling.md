# DOCUMENT 9 -- ERROR HANDLING & EDGE CASES

**Application:** VedaClue Women's Health Platform
**Date:** 2026-03-15
**Scope:** Server-side global error handling, client-side interceptors, graceful degradation, and edge-case coverage.

---

## 9.1 Global Error Handler

### 9.1.1 Server -- Express Error Middleware Chain

The server has a **three-layer** error handling chain registered at the bottom of `app.ts` (lines 367-378):

```
1. notFoundHandler   -- catches unmatched routes
2. errorHandler      -- primary typed error handler (AppError, Zod, Prisma)
3. anonymous handler -- final catch-all fallback (file size limits, unknown errors)
```

**File:** `src/server/src/middleware/errorHandler.ts`

**`AppError` class** (lines 6-17): Custom operational error with `statusCode`, `isOperational` flag, and optional `code` string. All intentional business errors are thrown as `AppError`.

```ts
export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly code?: string;
  constructor(message: string, statusCode: number, code?: string) { ... }
}
```

**Primary `errorHandler` middleware** (lines 19-43) handles errors in this order:

| Error Type | Detection | HTTP Status | Response |
|---|---|---|---|
| `AppError` | `instanceof AppError` | Varies (set by thrower) | `{ success: false, error: msg, code? }` |
| `ZodError` | `instanceof ZodError` | 400 | `{ success: false, error: 'Validation failed', details: fieldErrors }` |
| Prisma errors | Duck-typed: `code` matches `/^P\d{4}$/` | See 9.2 | `{ success: false, error: msg }` |
| Unknown errors | Fallthrough | 500 | Production: `"Internal server error"` / Dev: actual `err.message` |

**`asyncHandler` wrapper** (lines 45-46): Every async route handler is wrapped so rejected promises are forwarded to `next(err)` instead of crashing the process.

```ts
export const asyncHandler = (fn: Function) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

**Final catch-all in `app.ts`** (lines 372-378): Catches anything the primary handler misses, including multer `LIMIT_FILE_SIZE` errors (returns 400 with "File too large. Max 5MB for images.").

### 9.1.2 Server -- Process-Level Handlers

**File:** `src/server/src/server.ts`, lines 359-369

| Event | Behavior |
|---|---|
| `SIGTERM` | Logs and exits cleanly (code 0) |
| `SIGINT` | Logs and exits cleanly (code 0) |
| `unhandledRejection` | Logs error, does **not** exit -- keeps server running |
| `uncaughtException` | Logs error + stack. **Only** exits if `EADDRINUSE` or `Cannot find module`; otherwise keeps running (Railway restarts on real crashes) |

### 9.1.3 Server -- 404 Handler

**File:** `src/server/src/middleware/notFoundHandler.ts`

Returns `{ success: false, error: 'Route not found', path: originalUrl }` with status 404.

Additionally, in `app.ts` line 361, API-prefixed routes that miss all route handlers return a more specific 404:
```json
{ "success": false, "error": "Route GET /api/v1/missing not found" }
```

### 9.1.4 Server -- Request Logging

**File:** `src/server/src/middleware/requestLogger.ts`

Every request gets an `X-Request-ID` header (from client or auto-generated UUID). On response `finish`, the logger categorizes by status:
- 5xx: `logger.error`
- 4xx: `logger.warn`
- 2xx/3xx: `logger.info`

Logged data includes `requestId`, `method`, `path`, `status`, `duration`, and `ip`.

### 9.1.5 Client -- React ErrorBoundary

**File:** `src/client/src/components/ErrorBoundary.tsx`

A class-based React error boundary wraps the entire app (registered in `App.tsx` around `<AppShell>`). On unhandled render errors:

- Logs error + component stack to console
- Shows a rose-themed fallback UI with two buttons:
  - "Go to Dashboard" -- resets error state and navigates to `/dashboard`
  - "Reload Page" -- calls `window.location.reload()`

### 9.1.6 Client -- Axios Response Interceptor

**File:** `src/client/src/services/api.ts`, lines 79-118

The global Axios interceptor provides user-friendly error messages:

| Condition | `err.message` set to |
|---|---|
| Server returned `error` or `message` field | Uses server message directly |
| `ECONNABORTED` (timeout) | `"Request timed out -- please try again"` |
| HTTP 429 | `"Too many requests -- please wait a minute"` |
| HTTP 403 | `"Access denied -- admin login required"` |
| No response at all (network error) | `"Network error -- check your connection"` |

### 9.1.7 Server -- Response Utilities

**File:** `src/server/src/utils/response.utils.ts`

Two helper functions standardize API responses:

```ts
successResponse(res, data, message = 'Success', status = 200)
// Returns: { success: true, message, data, timestamp }

errorResponse(res, error, status = 400)
// Returns: { success: false, error: string, timestamp }
```

### 9.1.8 Server -- Validation Middleware

**File:** `src/server/src/middleware/validate.ts`

Two validators available:
- `validate(schema)` -- validates `req.body` only
- `validateRequest(schema)` -- validates `{ body, query, params }` as a combined object

Both catch `ZodError` and return status 400 with flattened field errors.

---

## 9.2 Prisma Error Codes Handled

**File:** `src/server/src/middleware/errorHandler.ts`, lines 31-40

The error handler uses duck-typing to detect Prisma errors (any error whose `.code` matches `/^P\d{4}$/`), avoiding import issues across Prisma versions.

| Prisma Code | HTTP Status | Error Message | Meaning |
|---|---|---|---|
| `P2002` | 409 | `"Record already exists"` | Unique constraint violation (duplicate email, phone, etc.) |
| `P2025` | 404 | `"Record not found"` | Record to update/delete does not exist |
| `P2003` | 400 | `"Related record not found"` | Foreign key constraint failure |
| Any other `P####` | 400 | `"Database error"` | Generic fallback for unmapped Prisma codes |

---

## 9.3 Railway Redeploy Window -- Auto-Retry Logic

**File:** `src/client/src/services/api.ts`, lines 57-77, 97-100

During Railway redeployments (typically 10-30 seconds), the server returns 5xx errors or drops connections. The client handles this transparently:

**Retry configuration:**
- `MAX_RETRIES = 2` (up to 2 retry attempts per request)
- Retryable statuses: `500, 502, 503, 504`
- Also retries on: network errors (no response, not cancelled), timeouts (`ECONNABORTED`)
- Does **not** retry: 401 (handled by token refresh), 4xx client errors

**Backoff strategy:** Exponential -- 1 second after first failure, 2 seconds after second failure.

```ts
// Exponential backoff: 1s, 2s
await new Promise(r => setTimeout(r, req._retryCount * 1000));
return api(req);
```

**Request timeout:** 15 seconds (`timeout: 15000` on the Axios instance, line 15). Comment in code: "fail fast, retry handles recovery."

**Server-side resilience (server.ts, lines 73-79):** The HTTP server starts **immediately** (before DB/Redis connect) so Railway health checks pass during bootstrap. Database and Redis connections happen asynchronously after the server is listening.

---

## 9.4 Redis Unavailable -- Graceful Degradation

**File:** `src/server/src/config/redis.ts`

Redis is treated as **always optional**. The connection uses `lazyConnect: true` with a 10-second timeout.

### Connection resilience:

| Setting | Value |
|---|---|
| `maxRetriesPerRequest` | 3 |
| `retryStrategy` | Exponential: `min(times * 100ms, 3000ms)`, gives up after 10 attempts (returns `null`) |
| `connectTimeout` | 10,000ms |

### Fail-silent cache operations:

Every cache function checks `if (!redis || !isConnected) return <default>` before attempting operations:

| Function | Return on Redis down | File line |
|---|---|---|
| `cacheGet(key)` | `null` | Line 38 |
| `cacheSet(key, data, ttl)` | `void` (no-op) | Line 49 |
| `cacheDel(key)` | `void` (no-op) | Line 58 |
| `cacheIncr(key, ttl)` | `0` (fail-open) | Line 68 |
| `cacheDelPattern(pattern)` | `void` (no-op) | Line 80 |

All operations are wrapped in try/catch; errors are logged via `logger.error` but never thrown.

**Critical note on `cacheIncr` returning 0 (line 68):** This is a **fail-open** design. When Redis is down, rate limiting via `cacheIncr` (used for OTP rate limits) returns 0, effectively **disabling rate limiting**. The code comment confirms: `// fail-open if Redis is down`.

### OTP storage without Redis:

**File:** `src/server/src/services/auth.service.ts`, lines 13-28

An **in-memory `Map`** serves as fallback OTP storage. OTPs are stored in three layers simultaneously:
1. Redis (`cacheSet`)
2. In-memory Map (`otpSet`) -- with auto-cleanup via `setTimeout`
3. Database (`prisma.otpStore.create`)

Verification checks all three layers in order: Redis -> in-memory -> DB (line 126-135).

### Server startup with Redis down:

**File:** `src/server/src/server.ts`, lines 98-104

```ts
try {
  await connectRedis();
} catch (redisErr: any) {
  logger.warn('Redis unavailable (caching disabled): ' + redisErr.message);
}
```

The server continues running normally. Only a warning is logged.

---

## 9.5 DB Unavailable -- Hardcoded Fallback Activation

### 9.5.1 Server startup behavior

**File:** `src/server/src/server.ts`, lines 82-96

| Environment | DB connection fails | Result |
|---|---|---|
| Production | `process.exit(1)` | Server shuts down (Railway auto-restarts) |
| Development | Logs warning | Server stays up; DB-dependent routes will fail individually |

The HTTP server starts **before** attempting DB connection (line 75), ensuring Railway health checks pass even during slow DB startups.

### 9.5.2 Content service fallback

**File:** `src/server/src/services/content.service.ts`, lines 17-101

The `ContentService` implements a three-layer content pipeline:
1. **Redis cache** -- checked first
2. **Database** -- checked if cache misses
3. **Hardcoded fallback constants** -- used if both fail

Hardcoded fallbacks include:
- `FALLBACK_CHAT_RESPONSES` (line 22): 9 pattern-matched AI chat responses covering cramps, PCOS, fertility, stress, sleep, diet, exercise, ayurveda, and late periods
- `FALLBACK_PHASE_ADVICE` (line 34): Phase-specific advice for all 4 cycle phases (menstrual, follicular, ovulation, luteal)

When DB/cache fails, the service logs a warning and returns fallback data:
```ts
console.warn('[ContentService] DB/cache failed for chat responses, using fallback:', ...);
return FALLBACK_CHAT_RESPONSES.map(r => ({ ...r, regex: new RegExp(r.regexPattern, 'i') }));
```

For dosha phase guidance (`getDoshaPhaseGuidance`), the service returns `null` on failure -- the caller (cycle service) then falls back to its own hardcoded `DOSHA_PHASE_GUIDANCE` map.

### 9.5.3 Wellness content service fallback

**File:** `src/server/src/services/wellness-content.service.ts`, lines 43-74

Uses a two-layer approach:
1. Redis cache (including cached empty results with shorter 5-min TTL to prevent cache stampede)
2. Database

If both fail, returns an empty array `[]` -- the **frontend has its own hardcoded fallback** content (line 73 comment: "Layer 3: Return empty -- frontend has hardcoded fallback").

### 9.5.4 Prisma client singleton

**File:** `src/server/src/config/database.ts`

Uses the standard Next.js/Prisma singleton pattern (`globalForPrisma`) to prevent connection exhaustion in development (hot-reload creates multiple instances). In production, `globalForPrisma.prisma` is **not** set, so each cold start creates a fresh client.

Logging levels: development logs `['query', 'warn', 'error']`; production logs `['error']` only.

---

## 9.6 Invalid JWT -- What Happens

**File:** `src/server/src/middleware/auth.ts`

The `authenticate` middleware handles JWT errors in this sequence:

| Step | Check | HTTP Status | Response | Code |
|---|---|---|---|---|
| 1 | Missing/malformed `Authorization` header | 401 | `"Authentication required"` | -- |
| 2 | Token is blacklisted (via Redis `blacklist:{token}`) | 401 | `"Token revoked"` | -- |
| 3 | `jwt.verify` throws `TokenExpiredError` | 401 | `"Token expired"` | `TOKEN_EXPIRED` |
| 4 | `jwt.verify` throws `JsonWebTokenError` | 401 | `"Invalid token"` | -- |
| 5 | Decoded user not found in DB | 401 | `"User not found"` | -- |
| 6 | User exists but `isActive === false` | 403 | `"Account deactivated"` | -- |
| 7 | Any other error | 500 | `"Authentication failed"` | -- |

**Token refresh flow (client-side):**

**File:** `src/client/src/services/api.ts`, lines 30-55, 84-95

On 401 response:
1. Sets `req._retry = true` to prevent infinite loops
2. Uses a **global refresh lock** (`refreshPromise`) to prevent concurrent 401s from triggering parallel refresh calls
3. Calls `POST /api/v1/auth/refresh` with the stored refresh token
4. On success: stores new tokens, replays original request
5. On failure: clears all auth data from localStorage (`sb_token`, `sb_refresh`, `vedaclue-auth`, `vedaclue-subscription`, `vedaclue-cycle`), clears Zustand auth store, and redirects to `/auth`
6. Uses `isRedirecting` flag to prevent multiple simultaneous redirects

**Server-side refresh validation:**

**File:** `src/server/src/services/auth.service.ts`, lines 159-170

The refresh endpoint:
- Verifies JWT signature with `JWT_REFRESH_SECRET` (separate from access token secret)
- Checks DB for non-revoked, non-expired refresh token
- **Immediately revokes** the used refresh token (rotation)
- Re-reads user role and active status from DB (prevents stale JWT roles)
- Issues new access + refresh token pair

### `optionalAuth` middleware

**File:** `src/server/src/middleware/auth.ts`, lines 58-86

For public routes that optionally enrich with user data: all JWT errors are silently caught (`catch {}`), and the request continues unauthenticated. No error is ever returned.

---

## 9.7 Expired OTP -- What Happens

**File:** `src/server/src/services/auth.service.ts`, lines 80-156

### OTP lifecycle:

| Stage | TTL | Storage |
|---|---|---|
| Generation | 5 minutes | Redis (300s), in-memory Map (300s), DB (`expiresAt`) |
| Cleanup | Hourly cron | `server.ts` line 165: `prisma.otpStore.deleteMany({ where: { expiresAt: { lt: new Date() } } })` |

### Verification error cases:

| Scenario | Error Message | HTTP Status |
|---|---|---|
| Rate limit exceeded (>5 requests/15 min) | `"Too many OTP requests. Please try again after 15 minutes."` | 429 |
| Verification attempts exceeded (>5/15 min) | `"Too many verification attempts. Please request a new OTP."` | 429 |
| OTP expired (DB lookup shows `expiresAt < now`) | `"OTP has expired. Please request a new one."` | 400 |
| OTP not found in any store | `"OTP not found. Please request a new one."` | 400 |
| OTP does not match | `"Incorrect OTP. Please try again."` | 400 |

**Brute-force protection (lines 115-124):** When verification attempts exceed 5 per phone per 15 minutes, the OTP is **forcibly invalidated** across all three stores (Redis, in-memory, DB), requiring the user to request a fresh one.

### OTP lookup order (lines 126-135):

```
Redis (cacheGet) -> In-memory Map (otpGet) -> Database (prisma.otpStore.findFirst)
```

The DB lookup intentionally queries **without** an expiry filter so it can distinguish between "OTP expired" (returns specific error) and "OTP not found" (different error).

### After successful verification:

OTP is cleared from all three stores. User is found-or-created, tokens are issued.

---

## 9.8 Concurrent Requests -- Race Conditions Handled

### 9.8.1 Prisma `$transaction` usage

Two services use explicit Prisma interactive transactions to prevent race conditions:

**Dosha assessment submission:**
**File:** `src/server/src/services/dosha.service.ts`, lines 144-184

Wraps in `$transaction`:
1. Deactivates all previous active assessments for the user
2. Creates new assessment
3. Updates user profile with new dosha scores

This prevents a race where two concurrent submissions could both remain "active."

**Subscription creation:**
**File:** `src/server/src/services/subscription.service.ts`, lines 167-209

Wraps in `$transaction`:
1. Finds and expires any existing active subscription
2. Creates the new subscription
3. Logs subscription events

Prevents double-subscription if user clicks "Subscribe" twice quickly.

**Subscription expiry processing:**
**File:** `src/server/src/services/subscription.service.ts`, lines 395-428

Multiple `$transaction` blocks handle concurrent expiry checks for PAST_DUE subscriptions past grace period, trial expirations, and active subscription end dates.

### 9.8.2 Client-side concurrency guards

**Token refresh lock:**
**File:** `src/client/src/services/api.ts`, lines 26, 87-89

```ts
let refreshPromise: Promise<string | null> | null = null;
```

When multiple requests simultaneously receive 401, only the **first** triggers a refresh. All others await the same `refreshPromise`. After the refresh completes (or fails), `refreshPromise` is reset to `null` via `.finally()`.

**Redirect guard:**
**File:** `src/client/src/services/api.ts`, line 28

```ts
let isRedirecting = false;
```

Prevents multiple concurrent failed refreshes from creating multiple redirects to `/auth`.

### 9.8.3 Rate limiting

**File:** `src/server/src/app.ts`, lines 154-170

| Limiter | Window | Max Requests | Scope |
|---|---|---|---|
| General | 15 min (configurable) | 500 (configurable) | All `/api/` routes |
| Auth | 15 min | 60 | `/api/v1/auth/` routes |

Both use `express-rate-limit` with `trust proxy: 1` (Railway). Standard rate limit headers are enabled; legacy headers disabled.

**Per-phone OTP rate limiting (Redis-backed):**
**File:** `src/server/src/services/auth.service.ts`, lines 83-85, 116-124

- Send OTP: max 5 per phone per 15 minutes (`otp_rate:{phone}`)
- Verify OTP: max 5 per phone per 15 minutes (`otp_verify:{phone}`)

Both use `cacheIncr` which **fail-open** when Redis is down (returns 0, bypassing the limit).

### 9.8.4 Cron job safety

**File:** `src/server/src/server.ts`, lines 111-354

All cron jobs are wrapped in individual try/catch blocks. A failing cron job logs a warning but never crashes the server or affects other cron jobs. Error messages are truncated to 200 characters to prevent log flooding.

---

## 9.9 Additional Edge Cases

### 9.9.1 CORS handling

**File:** `src/server/src/app.ts`, lines 98-122

Non-matching origins are **not** rejected with an error -- instead `callback(null, false)` returns a response without CORS headers. This prevents the browser from receiving an opaque network error. A console warning is logged.

### 9.9.2 JWT secret validation

**File:** `src/server/src/app.ts`, lines 59-65

At startup in production, the server checks that `JWT_SECRET` is at least 32 characters and does not contain `"change-this"`. If the check fails, the process exits immediately (`process.exit(1)`).

### 9.9.3 Upload fallback

**File:** `src/server/src/middleware/upload.middleware.ts`

If Cloudinary credentials are not configured or initialization fails, uploads fall back to **local disk storage** (`uploads/` directory). The file filter rejects non-allowed MIME types with descriptive errors:
- Images: "Only JPG, PNG, WebP images allowed"
- Videos: "Only MP4 and MOV videos allowed"

File size limits: 5MB for images, 50MB for videos.

### 9.9.4 Role-based access errors

**File:** `src/server/src/middleware/roles.middleware.ts`

| Middleware | Required Role | Error on Denial |
|---|---|---|
| `requireAdmin` | `ADMIN` | 403: `"Admin access required"` |
| `requireDoctor` | `DOCTOR` or `ADMIN` | 403: `"Doctor access required"` |
| `requireSuperAdmin` | `ADMIN` | 403: `"Super admin access required"` |

### 9.9.5 Subscription access errors

**File:** `src/server/src/middleware/subscription.middleware.ts`

When a user lacks an active subscription for a premium feature, returns:
```json
{
  "success": false,
  "error": "Premium subscription required",
  "upgrade": true,
  "feature": "cycle:bbt"
}
```

Admins bypass all subscription checks (line 18-21).

### 9.9.6 Password reset -- silent failure

**File:** `src/server/src/services/auth.service.ts`, line 178

`forgotPassword` silently returns if the email does not exist in the database. This prevents user enumeration attacks.

### 9.9.7 Google Sign-In -- dual token support

**File:** `src/server/src/services/auth.service.ts`, lines 189-211

The Google auth handler first tries to verify the token as an **ID token** (standard flow). If that fails, it falls back to treating it as an **access token** (verifying via Google's userinfo API). This handles both web and mobile auth flows.

### 9.9.8 Analytics tracking -- fire-and-forget

**File:** `src/client/src/services/api.ts`, lines 560-563

```ts
track: (d) => api.post('/analytics/track', d).catch(() => {}),
trackBatch: (events) => api.post('/analytics/track/batch', { events }).catch(() => {}),
```

Analytics API calls silently swallow all errors to never impact user experience.

### 9.9.9 Canonical domain redirect

**File:** `src/server/src/app.ts`, lines 74-80

Requests to `www.vedaclue.com` are 301-redirected to `vedaclue.com` to prevent localStorage isolation between subdomains.

---

## Summary of Degradation Modes

| Dependency Down | Impact | Fallback Strategy |
|---|---|---|
| Redis | No caching, no rate limiting, no token blacklist | Fail-silent returns; in-memory OTP store; fail-open rate limits |
| Database (dev) | DB-dependent routes fail individually | Server stays up; health check passes |
| Database (prod) | Server exits | Railway auto-restarts |
| Cloudinary | Image/video upload uses local disk | Automatic fallback in upload middleware |
| Twilio | OTP SMS not delivered | OTP logged to console; `smsSent: false` returned |
| Google OAuth | Google Sign-In unavailable | Returns 500: "Google Sign-In is not configured" |
| Content DB tables | AI chat, phase guidance, remedies | Hardcoded `FALLBACK_*` constants in content.service.ts |
| Wellness content DB | Wellness tips, routines, challenges | Returns `[]`; frontend uses its own hardcoded content |
