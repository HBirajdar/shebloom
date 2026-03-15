# Document 2 -- Authentication System

**App:** VedaClue (SheBloom)
**Generated:** 2026-03-15
**Source of truth:** Code reading only -- nothing assumed.

---

## 2.1 Email/Password Login

### Registration (`POST /api/v1/auth/register`)

**File:** `src/server/src/routes/auth.routes.ts` (line 14)
**Service:** `AuthService.register()` in `src/server/src/services/auth.service.ts` (line 51)

**Step-by-step flow:**

1. Request body validated against `registerSchema` (Zod):
   - `fullName` -- string, 2-100 chars, **required**
   - `email` -- valid email, **optional**
   - `phone` -- regex `/^[6-9]\d{9}$/`, **optional**
   - `password` -- string, 8-128 chars, **optional**
   - Refinement: at least one of `email` or `phone` must be present.
   - **File:** `src/server/src/validators/auth.validators.ts` (line 2-7)

2. If `email` provided, check uniqueness via `prisma.user.findUnique({ where: { email } })`. Throws `AppError('Email already registered', 409)` if found.

3. If `phone` provided, check uniqueness via `prisma.user.findUnique({ where: { phone } })`. Throws `AppError('Phone already registered', 409)` if found.

4. Password hashed with `bcrypt.hash(password, saltRounds)` where salt rounds come from `BCRYPT_SALT_ROUNDS` env var (default `12`).

5. User created in DB:
   ```ts
   prisma.user.create({
     data: { fullName, email, phone, passwordHash, authProvider: phone ? 'PHONE' : 'EMAIL', profile: { create: {} } },
   })
   ```
   - A `UserProfile` record is auto-created via the nested `profile: { create: {} }` relation.
   - `authProvider` set to `'PHONE'` if phone provided, otherwise `'EMAIL'`.

6. JWT tokens generated (see Section 2.3).

7. Refresh token stored in `RefreshToken` table with 7-day expiry.

8. Audit log entry created: `{ action: 'register', resource: 'user', resourceId: user.id }`.

9. Response (HTTP 201):
   ```json
   {
     "success": true,
     "message": "Registration successful",
     "data": {
       "user": { "id", "fullName", "email", "phone", "role", "authProvider" },
       "accessToken": "...",
       "refreshToken": "..."
     }
   }
   ```

### Login (`POST /api/v1/auth/login`)

**File:** `src/server/src/routes/auth.routes.ts` (line 18)
**Service:** `AuthService.loginWithEmail()` in `src/server/src/services/auth.service.ts` (line 67)

**Validation (loginSchema):**
- `email` -- valid email, **required**
- `password` -- string, min 1 char, **required**
- **File:** `src/server/src/validators/auth.validators.ts` (line 8)

**Step-by-step flow:**

1. Lookup user by email: `prisma.user.findUnique({ where: { email } })`.
2. If user not found OR `passwordHash` is null: throw `AppError('Invalid credentials', 401)`.
3. If `user.isActive === false`: throw `AppError('Account deactivated', 403)`.
4. Compare password with `bcrypt.compare(password, user.passwordHash)`. If mismatch: throw `AppError('Invalid credentials', 401)`.
5. Generate JWT tokens.
6. Store refresh token in DB (7-day expiry).
7. Update `lastLoginAt` to current timestamp.
8. Response (HTTP 200):
   ```json
   {
     "success": true,
     "message": "Login successful",
     "data": {
       "user": { "id", "fullName", "email", "role", "isActive", "authProvider" },
       "accessToken": "...",
       "refreshToken": "..."
     }
   }
   ```
   Note: `passwordHash` is stripped from the response object (line 76: `const { passwordHash: _, ...safe } = user`).

---

## 2.2 Phone/OTP Login

### Send OTP (`POST /api/v1/auth/otp/send`)

**File:** `src/server/src/routes/auth.routes.ts` (line 22)
**Service:** `AuthService.sendOtp()` in `src/server/src/services/auth.service.ts` (line 80)

**Validation (otpSendSchema):**
- `phone` -- regex `/^(\+?91)?[6-9]\d{9}$/` -- accepts raw 10-digit or with +91/91 prefix.
- **File:** `src/server/src/validators/auth.validators.ts` (line 10)

**Step-by-step flow:**

1. Phone normalized via `normalizePhone()` (line 33-39): strips `+91` or `91` prefix, validates 10 digits starting with 6-9. Throws `AppError('Enter a valid 10-digit Indian mobile number (6-9 start)', 400)` on invalid.

2. **Rate limiting:** Per-phone limit of 5 OTP requests per 15 minutes via Redis counter (`otp_rate:{phone}`, TTL 900s). Exceeding throws `AppError('Too many OTP requests. Please try again after 15 minutes.', 429)`.

3. OTP generated: 6-digit random number via `crypto.randomInt(100000, 999999)`.

4. OTP stored in **three layers** (redundancy):
   - **Redis:** `cacheSet('otp:{phone}', otp, 300)` -- 5-minute TTL
   - **In-memory Map:** `otpSet('otp:{phone}', otp, 300)` -- 5-minute TTL with auto-cleanup via `setTimeout`
   - **Database:** `prisma.otpStore.create({ data: { phone, otp, expiresAt } })` -- previous entries for same phone deleted first.

5. In non-production: OTP logged to console (`[OTP] Sending to: {phone}, OTP: {otp}`).

6. If Twilio is configured (all three env vars present: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`): SMS sent via Twilio to `+91{phone}`.

7. Response (HTTP 200):
   ```json
   {
     "success": true,
     "message": "OTP sent via SMS" | "OTP generated (SMS unavailable)",
     "data": { "smsSent": true | false }
   }
   ```

### Verify OTP (`POST /api/v1/auth/otp/verify`)

**File:** `src/server/src/routes/auth.routes.ts` (line 31)
**Service:** `AuthService.verifyOtp()` in `src/server/src/services/auth.service.ts` (line 112)

**Validation (otpVerifySchema):**
- `phone` -- regex `/^(\+?91)?[6-9]\d{9}$/`
- `otp` -- string, exactly 6 characters
- **File:** `src/server/src/validators/auth.validators.ts` (line 11)

**Step-by-step flow:**

1. Phone normalized.

2. **Verification rate limiting:** Max 5 verify attempts per phone per 15 minutes (`otp_verify:{phone}`, TTL 900s). Exceeding: OTP invalidated across all stores, throws `AppError('Too many verification attempts. Please request a new OTP.', 429)`.

3. OTP lookup priority: **Redis** -> **in-memory Map** -> **database fallback**.
   - DB fallback checks expiry: if expired, throws `AppError('OTP has expired. Please request a new one.', 400)`.

4. If no OTP found in any store: throw `AppError('OTP not found. Please request a new one.', 400)`.

5. If OTP does not match: throw `AppError('Incorrect OTP. Please try again.', 400)`.

6. On match: OTP cleared from all three stores.

7. **User lookup or creation:**
   - Checks if phone belongs to an admin via `ADMIN_PHONES` array (hardcoded: `['9405424185']`).
   - Looks up user by phone in DB.
   - If **no user exists** (`isNew = true`): creates user with `{ phone, fullName: 'User', authProvider: 'PHONE', isVerified: true }`. If phone is in `ADMIN_PHONES`, role set to `'ADMIN'`.
   - If **user exists**: updates `isVerified = true`, `lastLoginAt = now()`. If phone is admin phone and role is not ADMIN, promotes to ADMIN.

8. JWT tokens generated, refresh token stored.

9. Response (HTTP 200):
   ```json
   {
     "success": true,
     "message": "OTP verified",
     "data": {
       "user": { "id", "fullName", "email", "phone", "role", "authProvider" },
       "accessToken": "...",
       "refreshToken": "...",
       "isNewUser": true | false
     }
   }
   ```

---

## 2.3 JWT Token -- Generation, Storage, Expiry, Refresh

### Token Generation

**File:** `src/server/src/services/auth.service.ts` (line 45-49)
**Function:** `AuthService.generateTokens(userId, role)`

```ts
private generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRY || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, role, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { algorithm: 'HS256', expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
  return { accessToken, refreshToken };
}
```

| Property | Access Token | Refresh Token |
|---|---|---|
| **Payload** | `{ userId, role }` | `{ userId, role, type: 'refresh' }` |
| **Secret** | `JWT_SECRET` env var | `JWT_REFRESH_SECRET` env var |
| **Algorithm** | HS256 | HS256 |
| **Default expiry** | 15 minutes | 7 days |
| **Configurable via** | `JWT_EXPIRY` env var | `JWT_REFRESH_EXPIRY` env var |

### Token Storage

**Server-side:** Refresh tokens stored in `RefreshToken` table:
```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  isRevoked Boolean  @default(false)
  user      User     @relation(...)
  @@map("refresh_tokens")
}
```
**File:** `src/server/prisma/schema.prisma` (line 259-271)

**Client-side:** Tokens stored in `localStorage`:
- `sb_token` -- access token
- `sb_refresh` -- refresh token
- `vedaclue-auth` -- Zustand persisted store (user object + `isAuthenticated` flag)

**File:** `src/client/src/stores/authStore.ts` (lines 31-34)
**File:** `src/client/src/services/api.ts` (lines 20-21)

### Token Refresh (`POST /api/v1/auth/refresh`)

**File:** `src/server/src/routes/auth.routes.ts` (line 35)
**Service:** `AuthService.refreshAccessToken()` in `src/server/src/services/auth.service.ts` (line 159)

**Validation:** `refreshTokenSchema` -- requires `refreshToken` string, min 1 char.

**Step-by-step flow:**

1. Verify the refresh token JWT signature using `JWT_REFRESH_SECRET`.
2. Look up token in DB: must exist, not be revoked, and not be expired.
3. If not found: throw `AppError('Invalid refresh token', 401)`.
4. Revoke the used refresh token (`isRevoked = true`) -- **token rotation**.
5. Re-fetch user from DB to get current `role` and `isActive` status (prevents stale JWT claims).
6. If user not found or deactivated: throw `AppError('Account not found or deactivated', 401)`.
7. Generate new token pair.
8. Store new refresh token in DB.
9. Response:
   ```json
   { "success": true, "message": "Token refreshed", "data": { "accessToken": "...", "refreshToken": "..." } }
   ```

### Client-Side Auto-Refresh

**File:** `src/client/src/services/api.ts` (lines 30-55, 79-95)

When any API call returns 401:
1. A global `refreshPromise` lock prevents concurrent refresh attempts.
2. Calls `refreshToken()` which POSTs to `/api/v1/auth/refresh` with the stored refresh token.
3. On success: updates `sb_token` and `sb_refresh` in localStorage, retries the original request.
4. On failure: clears all auth data from localStorage (including `vedaclue-auth`, `vedaclue-subscription`, `vedaclue-cycle`), clears Zustand auth state, redirects to `/auth`.
5. Redirect is debounced via `isRedirecting` flag to prevent multiple concurrent redirects.

---

## 2.4 Auth Middleware -- How `authenticate` Works

**File:** `src/server/src/middleware/auth.ts`

### `authenticate` (line 11-51)

Required auth -- blocks unauthenticated requests.

**Step-by-step:**

1. Extracts `Authorization` header. If missing or not `Bearer ...`: returns `401 { error: 'Authentication required' }`.
2. Checks token blacklist via Redis (`blacklist:{token}`). If blacklisted: returns `401 { error: 'Token revoked' }`.
3. Verifies JWT with `JWT_SECRET` (HS256). Decodes `{ userId, id, role }`. Uses `decoded.userId || decoded.id` for backward compatibility.
4. Looks up user in cache (`user:{uid}:basic`, 60-second TTL). Cache miss: queries DB for `{ id, role, email, isActive }`.
5. If user not found in DB: returns `401 { error: 'User not found' }`.
6. If `isActive === false`: returns `403 { error: 'Account deactivated' }`.
7. Sets `req.user = { id, role, email }` and calls `next()`.

**Error handling:**
- `jwt.TokenExpiredError` -> `401 { error: 'Token expired', code: 'TOKEN_EXPIRED' }`
- `jwt.JsonWebTokenError` -> `401 { error: 'Invalid token' }`
- Any other error -> `500 { error: 'Authentication failed' }`

### `authorize(...roles)` (line 53-56)

Role-based authorization middleware, used after `authenticate`.

```ts
export const authorize = (...roles: string[]) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
    return;
  }
  next();
};
```

Usage pattern: `router.get('/admin/thing', authenticate, authorize('ADMIN'), handler)`

### `optionalAuth` (line 58-86)

Same as `authenticate` but never blocks -- silently sets `req.user` if a valid token is present, otherwise continues without it. Used for endpoints that behave differently for logged-in vs. anonymous users.

### `AuthRequest` Interface (line 7-9)

```ts
export interface AuthRequest extends Request {
  user?: { id: string; role: string; email?: string };
}
```

---

## 2.5 Role System

### Roles Defined in Schema

**File:** `src/server/prisma/schema.prisma` (line 16-20)

```prisma
enum Role {
  USER
  DOCTOR
  ADMIN
}
```

Default role on user creation: `USER` (line 100: `role Role @default(USER)`).

### How Roles Are Checked

**Server-side:** Via `authorize()` middleware (see Section 2.4).

**Client-side route guards** in `src/client/src/App.tsx`:

| Guard | Component | Access Rule |
|---|---|---|
| `ProtectedRoute` (line 90-94) | Checks `isAuthenticated` from Zustand store | Any authenticated user |
| `DoctorRoute` (line 97-102) | Checks `isAuthenticated` + `user.role === 'DOCTOR' \|\| 'ADMIN'` | DOCTOR or ADMIN only |
| `AdminRoute` (line 105-110) | Checks `isAuthenticated` + `user.role === 'ADMIN'` | ADMIN only |

**Redirect behavior:**
- Unauthenticated users -> `/auth`
- Users with insufficient role -> `/dashboard`

### Role-Based Login Redirect

**File:** `src/client/src/pages/Signin.tsx` (lines 74-82)

After successful login/register, the client redirects based on role:
- `ADMIN` -> `/admin`
- `DOCTOR` -> `/doctor-dashboard`
- `USER` -> default route (varies: `/setup` for registration, `/dashboard` for login/OTP verify)

### Admin Phone Hardcoding

**File:** `src/server/src/services/auth.service.ts` (line 42)

```ts
const ADMIN_PHONES = ['9405424185'];
```

When a phone number in this array logs in via OTP, the user is auto-promoted to `ADMIN` role.

---

## 2.6 New User Detection -- `isNewUser` Flag

**File:** `src/server/src/services/auth.service.ts`

The `isNewUser` flag is returned by two auth methods:

### OTP Verify (line 146-156)
```ts
const isNew = !user;  // true if no user found for this phone
// ...
return { user, ...tokens, isNewUser: isNew };
```

### Google Login (line 218-243)
```ts
const isNew = !user;  // true if no user found for this email
// ...
return { user: safe, ...tokens, isNewUser: isNew };
```

**Note:** Email/password `register()` does NOT return `isNewUser` (it is always a new user by definition). Email/password `loginWithEmail()` also does not return it (always an existing user).

**Client usage:** The `isNewUser` flag is present in the API response `data` object. However, the client-side `go()` function in `Signin.tsx` does not explicitly check `isNewUser`. Instead, the redirect destination is hardcoded per auth method:
- Registration -> `/setup` (always)
- Login -> `/dashboard` (always)
- OTP verify -> `/dashboard` (always)

---

## 2.7 Profile Incomplete Redirect

### When It Happens

The app does NOT have automatic server-side profile-completeness detection or forced redirect. Instead, it relies on the client-side routing:

**Registration flow:** After email/password registration, the client explicitly navigates to `/setup` (the `ProfileSetupPage`).

**File:** `src/client/src/pages/Signin.tsx` (line 154):
```ts
go(() => authAPI.register({ fullName: nm.trim(), email: em.trim(), password: pw }), '/setup');
```

**OTP/Google flow:** These redirect to `/dashboard`, even for new users. There is no automatic redirect to `/setup` for new OTP or Google users.

**Route definition:**
```tsx
<Route path="/setup" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
```
**File:** `src/client/src/App.tsx` (line 143)

The `/setup` route is protected (requires authentication) but there is no middleware or guard that forces incomplete profiles to visit it.

---

## 2.8 Error Handling

### Auth Endpoint Errors

All errors go through the global `errorHandler` middleware.
**File:** `src/server/src/middleware/errorHandler.ts`

| Endpoint | Error | HTTP Status | Message |
|---|---|---|---|
| `POST /register` | Email taken | 409 | `Email already registered` |
| `POST /register` | Phone taken | 409 | `Phone already registered` |
| `POST /register` | Validation fail | 400 | `Validation failed` + field errors |
| `POST /login` | User not found / no password | 401 | `Invalid credentials` |
| `POST /login` | Account deactivated | 403 | `Account deactivated` |
| `POST /login` | Wrong password | 401 | `Invalid credentials` |
| `POST /otp/send` | Invalid phone | 400 | `Enter a valid 10-digit Indian mobile number (6-9 start)` |
| `POST /otp/send` | Rate limited | 429 | `Too many OTP requests. Please try again after 15 minutes.` |
| `POST /otp/verify` | Rate limited | 429 | `Too many verification attempts. Please request a new OTP.` |
| `POST /otp/verify` | OTP expired | 400 | `OTP has expired. Please request a new one.` |
| `POST /otp/verify` | OTP not found | 400 | `OTP not found. Please request a new one.` |
| `POST /otp/verify` | Wrong OTP | 400 | `Incorrect OTP. Please try again.` |
| `POST /refresh` | Invalid/revoked token | 401 | `Invalid refresh token` |
| `POST /refresh` | User deactivated | 401 | `Account not found or deactivated` |
| `POST /google` | No idToken | 400 | `idToken is required` |
| `POST /google` | Google not configured | 500 | `Google Sign-In is not configured` |
| `POST /google` | Invalid Google token | 401 | `Invalid Google token` |
| `POST /google` | No email on Google account | 400 | `Google account has no email` |
| `POST /google` | Account deactivated | 403 | `Account deactivated` |
| `POST /forgot-password` | User not found | 200 | Silent -- `Reset email sent if account exists` (no info leak) |
| `POST /reset-password` | Invalid token type | 400 | `Invalid reset token` |
| `POST /reset-password` | Token expired/mismatch | 400 | `Token expired` |

### Global Error Handler

**File:** `src/server/src/middleware/errorHandler.ts`

| Error Type | HTTP Status | Response |
|---|---|---|
| `AppError` | `err.statusCode` | `{ success: false, error: err.message }` |
| `ZodError` | 400 | `{ success: false, error: 'Validation failed', details: fieldErrors }` |
| Prisma `P2002` | 409 | `Record already exists` |
| Prisma `P2025` | 404 | `Record not found` |
| Prisma `P2003` | 400 | `Related record not found` |
| Unknown | 500 | `Internal server error` (production) or actual message (dev) |

### Client-Side Error Parsing

**File:** `src/client/src/pages/Signin.tsx` (lines 36-47, function `parseErr`)

| Condition | User-facing message |
|---|---|
| No response (network error) | `Cannot reach server. Check your internet or try again in a moment.` |
| HTTP 429 | `Too many attempts. Please wait 15 minutes and try again.` |
| HTTP 5xx | `Server is temporarily unavailable. Please try again in a minute.` |
| HTTP 400 with `details` | Field-level validation errors joined |
| Other | Server's `error` or `message` field, or `Error {status}. Please try again.` |

---

## 2.9 Session Management -- How User Stays Logged In

### Token Persistence

The user's session is maintained via three localStorage entries:

| Key | Contents | Set By |
|---|---|---|
| `sb_token` | JWT access token | `authStore.setAuth()` |
| `sb_refresh` | JWT refresh token | `authStore.setAuth()` |
| `vedaclue-auth` | Zustand persisted state: `{ user, isAuthenticated }` | Zustand `persist` middleware |

**File:** `src/client/src/stores/authStore.ts` (lines 25-72)

### Request Authentication

Every API request automatically attaches the access token via Axios request interceptor:

```ts
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('sb_token');
  if (t) c.headers.Authorization = 'Bearer ' + t;
  return c;
});
```
**File:** `src/client/src/services/api.ts` (lines 19-23)

### Session Lifecycle

1. **Login/Register:** `setAuth(user, accessToken, refreshToken)` stores tokens and sets `isAuthenticated = true`.
2. **Ongoing requests:** Axios interceptor attaches `Bearer` token on every request.
3. **Token expiry (401):** Auto-refresh triggered (see Section 2.3). If refresh succeeds, request retried transparently. If refresh fails, full logout + redirect to `/auth`.
4. **Explicit logout (`POST /api/v1/auth/logout`):** Server revokes all refresh tokens for user. Client calls `clearAuth()` which removes all auth-related localStorage keys.
5. **Page reload:** Zustand `persist` middleware rehydrates `user` and `isAuthenticated` from `vedaclue-auth` localStorage. The access token in `sb_token` is used for subsequent API calls.

### Logout

**Server-side** (`AuthService.logout()`, line 172-174):
```ts
await prisma.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } });
```
Revokes ALL refresh tokens for the user (not just the current one).

**Client-side** (`clearAuth()`, lines 36-59):
Removes 18+ localStorage keys to prevent cross-user data leaks:
- `sb_token`, `sb_refresh`
- `vedaclue-auth`, `vedaclue-subscription`, `vedaclue-cycle`, `vedaclue-ayurveda`
- `sb_referral_code`, `sb_notif_prefs`, `sb_dosha`, `sb_streak`, `sb_water`, `sb_sleep`
- `sb_bookmarks`, `sb_routine_done`, `sb_challenges`, `sb_joined_challenges`
- `sb_delivery_address`, `sb_order_history`, `sb_callbacks`, `sb_bookings`, `sb_cart`

### Retry Logic

**File:** `src/client/src/services/api.ts` (lines 57-100)

Non-auth errors (500, 502, 503, 504, network errors, timeouts) are retried up to 2 times with exponential backoff (1s, 2s).

The Signin page additionally retries once on 500 with a 2-second delay (line 57-61), to handle Railway server cold starts.

---

## Appendix: Google Login

### `POST /api/v1/auth/google`

**File:** `src/server/src/routes/auth.routes.ts` (line 43)
**Service:** `AuthService.loginWithGoogle()` in `src/server/src/services/auth.service.ts` (line 189)

**Flow:**

1. Requires `idToken` in request body (no Zod validation, manual check).
2. First tries to verify as a Google ID token using `google-auth-library` (`OAuth2Client.verifyIdToken()`).
3. If that fails, treats it as an access token and calls `https://www.googleapis.com/oauth2/v3/userinfo`.
4. If both fail: throws `AppError('Invalid Google token', 401)`.
5. Requires `payload.email` to be present.
6. Finds or creates user by email:
   - **Existing user:** updates `lastLoginAt`, `authProvider` to `'GOOGLE'`, `avatarUrl`.
   - **New user:** creates with `authProvider: 'GOOGLE'`, `isVerified: true`, nested profile.
7. Returns `{ user, accessToken, refreshToken, isNewUser }`.

**Env vars required:** `GOOGLE_CLIENT_ID`

---

## Appendix: Password Reset

### `POST /api/v1/auth/forgot-password`

**Service:** `AuthService.forgotPassword()` (line 176)

1. Looks up user by email. If not found, returns silently (no information leakage).
2. Generates a JWT with `{ userId, type: 'reset' }`, 1-hour expiry, signed with `JWT_SECRET`.
3. Stores token in Redis at `reset:{userId}` with 3600s TTL.
4. Constructs reset link: `{FRONTEND_URL}/reset-password?token={token}`.
5. Sends email via `sendPasswordResetEmail()` from `email.service.ts`.

### `POST /api/v1/auth/reset-password`

**Service:** `AuthService.resetPassword()` (line 246)

**Validation:** `token` (string, min 1), `password` (string, 8-128 chars).

1. Verify JWT, check `type === 'reset'`.
2. Compare token against Redis-stored value. If mismatch: throw `AppError('Token expired', 400)`.
3. Hash new password with bcrypt (salt rounds: 12).
4. Update user's `passwordHash`.
5. Delete the reset token from Redis.

---

## Appendix: Database Models

### User Model (auth-relevant fields)

**File:** `src/server/prisma/schema.prisma` (lines 91-150)

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | String (cuid) | auto | Primary key |
| `email` | String? | null | Unique |
| `phone` | String? | null | Unique |
| `passwordHash` | String? | null | bcrypt hash |
| `fullName` | String | -- | Required |
| `role` | Role enum | `USER` | USER / DOCTOR / ADMIN |
| `authProvider` | AuthProvider enum | `EMAIL` | EMAIL / PHONE / GOOGLE / APPLE |
| `isVerified` | Boolean | false | Set true on OTP verify / Google login |
| `isActive` | Boolean | true | Set false to deactivate account |
| `lastLoginAt` | DateTime? | null | Updated on login |

### OtpStore Model

**File:** `src/server/prisma/schema.prisma` (lines 759-768)

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `phone` | String | Indexed, not unique (old entries deleted before insert) |
| `otp` | String | 6-digit code |
| `expiresAt` | DateTime | 5 minutes from creation |

### RefreshToken Model

**File:** `src/server/prisma/schema.prisma` (lines 259-271)

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK to User, indexed |
| `token` | String | Unique |
| `expiresAt` | DateTime | 7 days from creation |
| `isRevoked` | Boolean | Default false; set true on use (rotation) or logout |

---

## Appendix: Configuration / Environment Variables

| Variable | Used By | Default |
|---|---|---|
| `JWT_SECRET` | Access token signing + reset token | **Required** |
| `JWT_REFRESH_SECRET` | Refresh token signing | **Required** |
| `JWT_EXPIRY` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime | `7d` |
| `BCRYPT_SALT_ROUNDS` | Password hashing cost | `12` |
| `GOOGLE_CLIENT_ID` | Google OAuth verification | Required for Google login |
| `TWILIO_ACCOUNT_SID` | SMS OTP sending | Optional |
| `TWILIO_AUTH_TOKEN` | SMS OTP sending | Optional |
| `TWILIO_PHONE_NUMBER` | SMS OTP sender number | Optional |
| `FRONTEND_URL` | Password reset link base | `https://vedaclue.com` |

---

## Appendix: Auth API Client Methods

**File:** `src/client/src/services/api.ts` (lines 120-129)

```ts
export const authAPI = {
  register:      (d: any) => api.post('/auth/register', d),
  login:         (d: any) => api.post('/auth/login', d),
  sendOtp:       (phone: string) => api.post('/auth/otp/send', { phone }),
  verifyOtp:     (phone: string, otp: string) => api.post('/auth/otp/verify', { phone, otp }),
  google:        (idToken: string) => api.post('/auth/google', { idToken }),
  forgotPassword:(email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  logout:        () => api.post('/auth/logout'),
};
```
