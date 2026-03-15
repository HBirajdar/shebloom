# Document 10 -- Developer Guide

**VedaClue Women's Health & Wellness Platform**
**Last updated:** 2026-03-15

---

## Table of Contents

- [10.1 Local Setup](#101-local-setup)
- [10.2 Environment Variables](#102-environment-variables)
- [10.3 DB Safety Workflow](#103-db-safety-workflow)
- [10.4 Adding New Content Types to WellnessContent](#104-adding-new-content-types-to-wellnesscontent)
- [10.5 Adding New API Endpoints](#105-adding-new-api-endpoints)
- [10.6 Deployment Checklist for Railway](#106-deployment-checklist-for-railway)
- [10.7 How to Re-Seed the DB](#107-how-to-re-seed-the-db)
- [10.8 How to Rollback Safely](#108-how-to-rollback-safely)
- [10.9 Git Workflow](#109-git-workflow)
- [10.10 Common Issues and Fixes](#1010-common-issues-and-fixes)

---

## 10.1 Local Setup

### Prerequisites

| Tool       | Minimum Version | Check Command        |
|------------|-----------------|----------------------|
| Node.js    | 20.0.0          | `node -v`            |
| npm        | 10.0.0          | `npm -v`             |
| PostgreSQL | 16              | `psql --version`     |
| Redis      | 7               | `redis-cli --version`|

Alternatively, Docker can replace PostgreSQL and Redis (see Step 2b below).

### Step 1 -- Clone and Install

```bash
git clone <repo-url> shebloom
cd shebloom
npm install
```

This is an npm workspaces monorepo. Running `npm install` at the root installs dependencies for both workspaces:
- `src/client` (`@vedaclue/client`) -- React frontend
- `src/server` (`@vedaclue/server`) -- Express backend

### Step 2a -- Start Local PostgreSQL and Redis (Manual)

Create a PostgreSQL database:

```bash
createdb vedaclue_db
```

Ensure Redis is running:

```bash
redis-server
```

### Step 2b -- Start Local PostgreSQL and Redis (Docker)

```bash
npm run docker:dev
```

This runs `docker compose up -d` using `docker-compose.yml`, which starts:
- **PostgreSQL 16** on port `5432` (user: `vedaclue`, password: `vedaclue_secret`, db: `vedaclue_db`)
- **Redis 7** on port `6379`

To stop:

```bash
npm run docker:down
```

### Step 3 -- Configure Environment Variables

Create `src/server/.env` (the server reads env via `dotenv/config`):

```env
NODE_ENV=development
APP_PORT=8000
DATABASE_URL=postgresql://vedaclue:vedaclue_secret@localhost:5432/vedaclue_db?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random-string-at-least-32-chars>
JWT_REFRESH_SECRET=<random-string-at-least-32-chars>
```

See Section 10.2 for the full list of variables.

No `.env.example` file currently exists in the repository.

### Step 4 -- Push Schema to Database

```bash
npm run db:safe-push
```

This runs `src/server/scripts/db-safe-push.ts`, which:
1. Backs up all existing data to `src/server/backups/`
2. Runs `prisma db push` (WITHOUT `--accept-data-loss`)
3. Verifies row counts before and after

For a brand-new database, you can also use:

```bash
npm run db:migrate -w src/server
```

Which runs `prisma migrate dev` to create proper migration files.

### Step 5 -- Generate Prisma Client

```bash
npx prisma generate --schema=src/server/prisma/schema.prisma
```

Note: `npm run build -w src/server` runs `prisma generate` automatically as part of its build script.

### Step 6 -- Seed the Database (Optional)

```bash
npm run db:seed
```

This runs `src/server/seeds/index.ts` via `tsx`. It seeds sample doctors and articles using upsert (safe to run multiple times).

There is also a Prisma-native seed at `src/server/prisma/seed.ts` (same content), invoked by:

```bash
cd src/server && npx prisma db seed
```

### Step 7 -- Start Development Servers

```bash
npm run dev
```

This uses `concurrently` to start:
- **Client**: Vite dev server on port **3000** (`vite --port 3000`)
- **Server**: `tsx watch src/server.ts` with hot reload on port **8000**

The Vite dev server proxies `/api` requests to `http://localhost:8000` (configured in `src/client/vite.config.ts`).

### Verify

- Frontend: http://localhost:3000
- API health: http://localhost:8000/api/health
- Swagger docs (dev only): http://localhost:8000/api-docs

---

## 10.2 Environment Variables

All server environment variables are validated at startup by `src/server/src/config/env.ts` using Zod. The server will exit with an error if required variables are missing or invalid.

### Required Variables

| Variable             | Type   | Description                                                  |
|----------------------|--------|--------------------------------------------------------------|
| `DATABASE_URL`       | string | PostgreSQL connection string. Format: `postgresql://user:pass@host:5432/dbname?schema=public` |
| `JWT_SECRET`         | string | Signing key for access tokens. Must be at least 32 characters. |
| `JWT_REFRESH_SECRET` | string | Signing key for refresh tokens. Must be at least 32 characters. |

### Optional Variables with Defaults

| Variable                | Default                   | Description                                           |
|-------------------------|---------------------------|-------------------------------------------------------|
| `NODE_ENV`              | `development`             | `development`, `production`, or `test`                |
| `APP_PORT`              | `8000`                    | Express server port. Railway also sets `PORT`.        |
| `APP_VERSION`           | `1.0.0`                   | Reported in health check response (dev only).         |
| `REDIS_URL`             | `redis://localhost:6379`  | Redis connection string. Redis is optional -- if unavailable, caching is disabled and the server continues. |
| `JWT_EXPIRY`            | `15m`                     | Access token lifetime.                                |
| `JWT_REFRESH_EXPIRY`    | `7d`                      | Refresh token lifetime.                               |
| `BCRYPT_SALT_ROUNDS`    | `12`                      | Password hashing cost factor.                         |
| `CORS_ORIGINS`          | `http://localhost:3000`   | Allowed CORS origins. In production, set to deployed client URL. |
| `RATE_LIMIT_WINDOW_MS`  | `900000` (15 min)         | Rate limiter window in milliseconds.                  |
| `RATE_LIMIT_MAX`        | `100`                     | Max requests per window.                              |
| `AWS_REGION`            | `ap-south-1`              | AWS region for S3 (if used).                          |

### Optional Integration Variables (No Default)

| Variable                | Service       | Description                                             |
|-------------------------|---------------|---------------------------------------------------------|
| `SENDGRID_API_KEY`      | SendGrid      | Email delivery (callback notifications, campaigns).     |
| `SENDGRID_FROM_EMAIL`   | SendGrid      | Sender email. Defaults to `noreply@vedaclue.com` in code. |
| `TWILIO_ACCOUNT_SID`    | Twilio        | SMS/WhatsApp OTP and notifications.                     |
| `TWILIO_AUTH_TOKEN`     | Twilio        | Twilio authentication token.                            |
| `TWILIO_PHONE_NUMBER`   | Twilio        | Twilio phone number for sending.                        |
| `TWILIO_PHONE_FROM`     | Twilio        | SMS sender number (used in callback routes).            |
| `TWILIO_WHATSAPP_FROM`  | Twilio        | WhatsApp sender number (used in callback routes).       |
| `RAZORPAY_KEY_ID`       | Razorpay      | Payment gateway key ID.                                 |
| `RAZORPAY_KEY_SECRET`   | Razorpay      | Payment gateway secret.                                 |
| `RAZORPAY_WEBHOOK_SECRET`| Razorpay     | Webhook signature verification secret.                  |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary    | Image upload cloud name.                                |
| `CLOUDINARY_API_KEY`    | Cloudinary    | Image upload API key.                                   |
| `CLOUDINARY_API_SECRET` | Cloudinary    | Image upload API secret.                                |
| `SENTRY_DSN`            | Sentry        | Error tracking DSN.                                     |
| `AWS_S3_BUCKET`         | AWS S3        | S3 bucket name (if used).                               |
| `ENCRYPTION_KEY`        | --            | Data encryption key for sensitive fields.               |
| `OPENWEATHER_API_KEY`   | OpenWeather   | Weather-based wellness recommendations.                 |
| `GOOGLE_CLIENT_ID`      | Google OAuth  | Google sign-in client ID (used in `auth.service.ts`).   |
| `VAPID_PUBLIC_KEY`      | Web Push      | VAPID public key for push notifications. Generate with `npx web-push generate-vapid-keys`. |
| `VAPID_PRIVATE_KEY`     | Web Push      | VAPID private key for push notifications.               |

### Client-Side Variables

| Variable        | Default                      | Description                                    |
|-----------------|------------------------------|------------------------------------------------|
| `VITE_API_URL`  | (uses Vite proxy in dev)     | API base URL. Only needed if client is deployed separately from server. Set in `src/client/src/services/api.ts`. |

---

## 10.3 DB Safety Workflow

### Critical Rule

**NEVER use `prisma db push --accept-data-loss` or `prisma migrate reset --force-reset` in production.** These flags can drop tables, columns, and all user data.

### The Safe Push Script

```bash
npm run db:safe-push
```

**File:** `src/server/scripts/db-safe-push.ts`

This script performs three steps:
1. **Backup** -- Exports all tables to a timestamped JSON file in `src/server/backups/`
2. **Push** -- Runs `prisma db push` (no destructive flags) to apply schema changes
3. **Verify** -- Compares row counts before and after push; exits with error code if data loss is detected

If the push fails (e.g., schema conflict), the backup is preserved and the error is reported. Fix the schema issue manually rather than using destructive flags.

### Manual Backup

```bash
npm run db:backup
```

**File:** `src/server/scripts/db-backup.ts`

Exports all model data to `src/server/backups/backup-<timestamp>.json`. The backup file includes:
- Timestamp
- Per-model record counts
- Full data for every model listed in the MODELS array

### Safe Workflow for Schema Changes

1. **Edit** `src/server/prisma/schema.prisma`
2. **Run** `npm run db:backup` to create a backup
3. **Run** `npm run db:safe-push` to apply changes
4. If push fails with a conflict, fix the schema issue specifically -- do NOT use `--accept-data-loss`
5. For production deployments, use `prisma migrate dev --name <description>` locally to create a migration file, then `prisma migrate deploy` in production

### Migration Commands Reference

| Command                             | Script Name         | When to Use                                      |
|--------------------------------------|---------------------|--------------------------------------------------|
| `npm run db:safe-push`              | `db:safe-push`      | Additive schema changes (new tables, new optional columns) |
| `npm run db:migrate -w src/server`  | `db:migrate`        | Create a new migration file (`prisma migrate dev`)         |
| `npm run db:backup`                 | `db:backup`         | Export all data before any schema change                    |
| `npm run db:studio`                 | `db:studio`         | Open Prisma Studio GUI to browse data                       |

### What the Backup Covers

The backup script exports these models (defined in `db-backup.ts`):
`user`, `userProfile`, `doshaAssessment`, `doshaQuestion`, `userWeatherCache`, `refreshToken`, `cycle`, `moodLog`, `symptomLog`, `bBTLog`, `cervicalMucusLog`, `fertilityDailyLog`, `waterLog`, `pregnancy`, `pregnancyChecklist`, `doctor`, `doctorSlot`, `doctorReview`, `appointment`, `hospital`, `hospitalPrice`, `article`, `articleBookmark`, `articleLike`, `articleComment`, `notification`, `notificationPreference`, `wellnessActivity`, `otpStore`, `auditLog`, `product`, `productReview`, `wishlistItem`, `callbackRequest`, `prescription`, `order`, `orderItem`, `doctorPayout`, `platformConfig`, `coupon`, `couponRedemption`, `couponAuditLog`, `pendingSubscription`, `userEvent`, `npsSurvey`, `pushCampaign`, `referral`, `userBadge`, `emailCampaign`, `productPayout`, `paymentAuditLog`, `program`, `programContent`, `programEnrollment`, `seller`, `sellerTransaction`, `communityPost`, `communityReply`, `communityLike`, `communityReport`, `communityPoll`, `communityPollVote`, `ayurvedicRemedy`, `doshaPhaseGuidance`, `wellnessContent`, `aIChatResponse`, `subscriptionPlan`, `userSubscription`, `subscriptionEvent`, `subscriptionPromotion`.

---

## 10.4 Adding New Content Types to WellnessContent

The `WellnessContent` model is a generic key-value content store used by the wellness, dashboard, self-care, and pregnancy pages. All content types share the same database table (`wellness_contents`) and API.

### Database Model

**File:** `src/server/prisma/schema.prisma` (model `WellnessContent`)

Key fields:
- `type` -- Content category (e.g., `phase_tip`, `wellness_tip`, `pregnancy_week`)
- `key` -- Unique slug within a type (e.g., `fertility_menstrual_0`)
- `phase` -- Optional: `menstrual`, `follicular`, `ovulation`, `luteal`
- `goal` -- Optional: `periods`, `fertility`, `pregnancy`, `wellness`
- `dosha` -- Optional: `vata`, `pitta`, `kapha`
- `week` -- Optional: pregnancy week number
- `category` -- Optional: `morning`, `afternoon`, `evening`, `baby`, `mom`, etc.
- `body` -- The actual content text (required)
- `metadata` -- JSON for extra data (challenge duration, pregnancy size/weight, etc.)
- `@@unique([type, key])` -- Each type+key combination must be unique

### Steps to Add a New Content Type

**1. Register the type in the service:**

**File:** `src/server/src/services/wellness-content.service.ts`

Add your new type string to the `VALID_TYPES` set:

```typescript
const VALID_TYPES = new Set([
  'phase_tip', 'wellness_tip', 'phase_routine', 'phase_yoga', 'phase_tip_wisdom',
  'challenge', 'affirmation', 'self_care_breath', 'journal_prompt', 'self_care',
  'dosha_remedy', 'pregnancy_week',
  'your_new_type',  // <-- add here
]);
```

**2. Add seed data in the service's `seedAll()` method:**

In the same file (`wellness-content.service.ts`), add a new section inside the `seedAll()` method following the existing pattern:

```typescript
// N. YOUR NEW TYPE
const yourData = [
  { id: 'item1', title: 'Title', body: 'Content text' },
];
yourData.forEach((item, i) => {
  wcData.push({
    type: 'your_new_type',
    key: `your_new_type_${item.id}`,
    title: item.title,
    body: item.body,
    sortOrder: i,
    sourceReference: 'YourPage.tsx:yourData',
  });
});
```

**3. No schema changes needed.** The `WellnessContent` model is already generic enough for any content type. Use `phase`, `goal`, `dosha`, `week`, `category`, and `metadata` fields as needed for filtering.

**4. Fetch from the frontend:**

```typescript
// Single type
const { data } = await api.get('/api/v1/wellness-content', {
  params: { type: 'your_new_type', phase: 'menstrual' }
});

// Multiple types in one request
const { data } = await api.get('/api/v1/wellness-content/bulk', {
  params: { types: 'your_new_type,phase_tip', phase: 'menstrual' }
});
```

**5. Seed via admin API (alternative to `seedAll`):**

```
POST /api/v1/wellness-content/admin/seed
```

This endpoint calls `seedAll()`, which only runs if the `wellness_contents` table is empty (idempotent).

Individual items can also be created via:

```
POST /api/v1/wellness-content/admin
```

### Existing Content Types Reference

| Type               | Count | Filters Used            | Source Page          |
|--------------------|-------|-------------------------|----------------------|
| `phase_tip`        | 32    | phase, goal             | DashboardPage        |
| `wellness_tip`     | 8     | goal                    | DashboardPage        |
| `phase_routine`    | 49    | phase, category (time)  | WellnessPage         |
| `phase_yoga`       | 16    | phase                   | WellnessPage         |
| `phase_tip_wisdom` | 4     | phase                   | WellnessPage         |
| `challenge`        | 4     | --                      | WellnessPage         |
| `affirmation`      | 4     | phase                   | SelfCarePage         |
| `self_care_breath` | 4     | phase                   | SelfCarePage         |
| `journal_prompt`   | 4     | phase                   | SelfCarePage         |
| `self_care`        | 20    | phase                   | SelfCarePage         |
| `dosha_remedy`     | 36    | phase, dosha            | DashboardPage        |
| `pregnancy_week`   | ~210  | week, category          | PregnancyPage        |

---

## 10.5 Adding New API Endpoints

The server follows a **routes + service + validator** pattern. Not all routes have a dedicated service or validator file -- simpler routes embed logic directly.

### Directory Structure

```
src/server/src/
  routes/           # Express Router files (*.routes.ts)
  services/         # Business logic classes (*.service.ts)
  validators/       # Zod schemas (*.validators.ts)
  middleware/       # Auth, rate limiting, uploads, error handling
  config/           # Database, Redis, env, Swagger, Cloudinary, logger
```

### Step-by-Step: Add a New Feature (e.g., "Journal")

**1. Create the validator** (if input validation is needed):

**File:** `src/server/src/validators/journal.validators.ts`

```typescript
import { z } from 'zod';

export const createJournalSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  mood: z.enum(['GREAT', 'GOOD', 'OKAY', 'LOW', 'BAD']).optional(),
});
```

Export from the validators index:

**File:** `src/server/src/validators/index.ts`

```typescript
export * from './journal.validators';
```

**2. Create the service** (for complex business logic):

**File:** `src/server/src/services/journal.service.ts`

```typescript
import prisma from '../config/database';

class JournalService {
  async create(userId: string, data: { title: string; content: string }) {
    return prisma.journalEntry.create({
      data: { ...data, userId },
    });
  }

  async listByUser(userId: string) {
    return prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default new JournalService();
```

**3. Create the route file:**

**File:** `src/server/src/routes/journal.routes.ts`

```typescript
import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response.utils';
import journalService from '../services/journal.service';
import { createJournalSchema } from '../validators';

const r = Router();

r.get('/', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const data = await journalService.listByUser(q.user!.userId);
    successResponse(s, data, 'Journal entries fetched');
  } catch (e) { n(e); }
});

r.post('/', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const parsed = createJournalSchema.safeParse(q.body);
    if (!parsed.success) { errorResponse(s, parsed.error.errors[0].message, 400); return; }
    const data = await journalService.create(q.user!.userId, parsed.data);
    successResponse(s, data, 'Journal entry created');
  } catch (e) { n(e); }
});

export default r;
```

**4. Register the route in app.ts:**

**File:** `src/server/src/app.ts`

Add the import alongside the other route imports:

```typescript
import journalRoutes from './routes/journal.routes';
```

Mount it with the other `app.use` calls (around line 314-350):

```typescript
app.use('/api/v1/journal', journalRoutes);
```

### Key Patterns from Existing Code

- **Authentication:** `authenticate` middleware from `./middleware/auth` extracts `req.user.userId` and `req.user.role`.
- **Admin-only routes:** Add `requireAdmin` middleware from `./middleware/roles.middleware`.
- **Response helpers:** Use `successResponse(res, data, message)` and `errorResponse(res, message, statusCode)` from `./utils/response.utils`.
- **Error handling:** Catch blocks call `next(e)` to pass errors to the global error handler.
- **Route prefix:** All routes are mounted under `/api/v1/`.

### Existing Route Registrations

All routes are registered in `src/server/src/app.ts` at lines 314-350:

| Path                         | Route File                        |
|------------------------------|-----------------------------------|
| `/api/v1/auth`               | `auth.routes.ts`                  |
| `/api/v1/users`              | `user.routes.ts`                  |
| `/api/v1/cycles`             | `cycle.routes.ts`                 |
| `/api/v1/mood`               | `mood.routes.ts`                  |
| `/api/v1/pregnancy`          | `pregnancy.routes.ts`             |
| `/api/v1/doctors`            | `doctor.routes.ts`                |
| `/api/v1/hospitals`          | `hospital.routes.ts`              |
| `/api/v1/articles`           | `article.routes.ts`               |
| `/api/v1/wellness`           | `wellness.routes.ts`              |
| `/api/v1/appointments`       | `appointment.routes.ts`           |
| `/api/v1/notifications`      | `notification.routes.ts`          |
| `/api/v1/admin`              | `admin.routes.ts`                 |
| `/api/v1/upload`             | `upload.routes.ts`                |
| `/api/v1/products`           | `products.routes.ts`              |
| `/api/v1/ai`                 | `ai.routes.ts`                    |
| `/api/v1/cart`                | `cart.routes.ts`                  |
| `/api/v1/achievements`       | `achievements.routes.ts`          |
| `/api/v1/reports`            | `reports.routes.ts`               |
| `/api/v1/callbacks`          | `callback.routes.ts`              |
| `/api/v1/prescriptions`      | `prescription.routes.ts`          |
| `/api/v1/payments`           | `payment.routes.ts`               |
| `/api/v1/doctor`             | `doctor-dashboard.routes.ts`      |
| `/api/v1/dosha`              | `dosha.routes.ts`                 |
| `/api/v1/weather`            | `weather.routes.ts`               |
| `/api/v1/finance`            | `finance.routes.ts`               |
| `/api/v1/programs`           | `program.routes.ts`               |
| `/api/v1/sellers`            | `seller.routes.ts`                |
| `/api/v1/community`          | `community.routes.ts`             |
| `/api/v1/content`            | `content.routes.ts`               |
| `/api/v1/subscriptions`      | `subscription.routes.ts`          |
| `/api/v1/analytics`          | `analytics.routes.ts`             |
| `/api/v1/referrals`          | `referral.routes.ts`              |
| `/api/v1/email-campaigns`    | `email-campaign.routes.ts`        |
| `/api/v1/insights`           | `insights.routes.ts`              |
| `/api/v1/wellness-content`   | `wellness-content.routes.ts`      |
| `/api/v1/debug` (dev only)   | `debug.routes.ts`                 |

---

## 10.6 Deployment Checklist for Railway

VedaClue deploys as a **single Railway service** that serves both the compiled React client (static files) and the Express API.

### Deployment Configuration Files

| File                           | Purpose                                                      |
|--------------------------------|--------------------------------------------------------------|
| `nixpacks.toml` (root)        | Primary Railway build config. Builds both client and server. |
| `railway.toml`                 | Railway service config (build command, start command, health check). |
| `src/server/nixpacks.toml`    | Server-only nixpacks config (used if deploying server separately). |
| `src/client/nixpacks.toml`    | Client-only nixpacks config (used if deploying client separately). |

### How the Build Works (Root `nixpacks.toml`)

1. **Setup:** Installs Node.js 20 and OpenSSL
2. **Install:** `npm install --include=dev` (installs all workspace dependencies)
3. **Build client:** `npm run build -w src/client` (Vite builds to `src/client/dist/`)
4. **Build server:** `npm run build -w src/server` (runs `prisma generate` then `tsc`, outputs to `src/server/dist/`)
5. **Start:** `npm start` which runs `npx prisma db push && node dist/server.js` in the server workspace

### Pre-Deployment Checklist

- [ ] **Environment variables set in Railway dashboard:**
  - `DATABASE_URL` -- Railway Postgres connection string (provisioned by Railway)
  - `REDIS_URL` -- Railway Redis connection string (provisioned by Railway)
  - `JWT_SECRET` -- Strong random string, at least 32 chars
  - `JWT_REFRESH_SECRET` -- Strong random string, at least 32 chars
  - `CLIENT_URL` -- Deployed frontend URL (for CORS)
  - `NODE_ENV` -- Set to `production` (set automatically by nixpacks)
  - All optional integration keys as needed (Razorpay, SendGrid, Twilio, Cloudinary, etc.)

- [ ] **Database backup taken before deploy:**
  ```bash
  npm run db:backup
  ```

- [ ] **Schema changes reviewed:**
  - No destructive changes (dropping columns/tables)
  - New columns are optional (`?`) or have defaults

- [ ] **Build tested locally:**
  ```bash
  npm run build
  npm run typecheck
  ```

- [ ] **Health check endpoint verified:**
  - Railway checks `GET /api/health` (configured in `railway.toml`)
  - Timeout: 60 seconds
  - Restart policy: `ON_FAILURE`, max 3 retries

### Railway Start Sequence

When Railway starts the service, this happens:
1. `npx prisma db push` runs to sync schema with the database
2. `node dist/server.js` starts the Express server
3. Server binds to `PORT` (set by Railway)
4. Database connection established
5. Prisma client regenerated
6. Chief doctor record ensured
7. Redis connection attempted (non-fatal if unavailable)
8. Cron jobs registered (appointment auto-complete, poll expiry, coupon expiry, OTP cleanup, license expiry, push notifications)

### WARNING About `--accept-data-loss`

The `railway.toml` and `src/server/nixpacks.toml` files currently contain `--accept-data-loss` in their start commands. The root `nixpacks.toml` does NOT include this flag. **Always use the root `nixpacks.toml` for deployment** to prevent accidental data loss. The server-specific nixpacks config should be updated to remove this flag.

---

## 10.7 How to Re-Seed the DB

### Option A -- Prisma Seed (Doctors + Articles)

```bash
npm run db:seed
```

**File:** `src/server/seeds/index.ts`

Seeds:
- 5 sample doctors (Dr. Priya Sharma, Dr. Anita Desai, Dr. Meera Nair, Dr. Kavitha Rao, Dr. Sunita Gupta)
- 5 sample articles (PCOD, period pain, first trimester, yoga, hormonal imbalance)

Uses `upsert` -- safe to run multiple times without duplicating data.

Alternative (runs the same data via Prisma's native seed mechanism):

```bash
cd src/server && npx prisma db seed
```

**File:** `src/server/prisma/seed.ts`

### Option B -- Wellness Content Seed (Admin API)

```bash
curl -X POST http://localhost:8000/api/v1/wellness-content/admin/seed \
  -H "Authorization: Bearer <admin-jwt-token>"
```

Seeds ~391 wellness content items across all 12 content types. **Only runs if the `wellness_contents` table is empty.** If content already exists, it returns `{ skipped: true }`.

### Option C -- Full Database Reset (Development Only)

```bash
cd src/server && npx prisma migrate reset --force
```

This **drops all tables**, re-creates them from migrations, and runs the Prisma seed. **NEVER run this against a production database.**

---

## 10.8 How to Rollback Safely

### Schema Rollback

There is no automated rollback script. If a `prisma db push` causes problems:

1. **Check the backup** in `src/server/backups/backup-<timestamp>.json` (created by `db:safe-push`)
2. **Revert the schema change** in `prisma/schema.prisma` using git:
   ```bash
   git checkout HEAD~1 -- src/server/prisma/schema.prisma
   ```
3. **Re-run safe push** to apply the reverted schema:
   ```bash
   npm run db:safe-push
   ```

### Code Rollback

Since the project uses direct-to-main workflow, revert the problematic commit:

```bash
git revert <commit-hash>
git push origin main
```

Railway will auto-deploy the new commit.

### Data Restore from Backup

Backup files are JSON exports in `src/server/backups/`. Manual restoration requires writing a script to read the JSON and re-insert records via Prisma. There is no automated restore script currently.

---

## 10.9 Git Workflow

### Current Workflow: Direct to Main

- **Single branch:** `main`
- **No dev/staging branches** currently in use
- **No pull request process** -- commits go directly to `main`
- **Railway auto-deploys** from `main` on every push

### Commit Message Style (from recent history)

```
fix: accept flow, painLevel, mood, symptoms in logPeriod
fix: normalize cycleDay calculation to date-only comparison
chore: sync Prisma schema with existing DB columns
fix: resolve all critical + high audit issues across 6 files
feat: add confirmation dialogs + improved toast notifications for all admin actions
```

Convention: `type: description` where type is `fix`, `feat`, `chore`, `docs`, etc.

### Lint-Staged Configuration

The repository has `lint-staged` configured in root `package.json`:
- `*.{ts,tsx}` files: ESLint fix + Prettier format
- `*.{json,css,md}` files: Prettier format

Husky is currently disabled (`"prepare": "echo 'skipping husky'"`).

### Important: No .env.example

There is no `.env.example` file checked into the repository. Environment variable documentation exists only in `src/server/src/config/env.ts` (Zod schema) and this document.

---

## 10.10 Common Issues and Fixes

### 1. Server Fails to Start -- "Invalid environment configuration"

**Cause:** Missing or invalid required environment variables.

**Fix:** Check `src/server/src/config/env.ts` for required fields. At minimum, set `DATABASE_URL`, `JWT_SECRET` (32+ chars), and `JWT_REFRESH_SECRET` (32+ chars) in `src/server/.env`.

### 2. "FATAL: JWT_SECRET is weak or default"

**Cause:** In production mode, the server checks that `JWT_SECRET` is not a short or default value.

**Fix:** Set a strong random JWT_SECRET (32+ characters). Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Prisma db push Conflicts -- "Cannot execute this migration"

**Cause:** Schema has a destructive change (renaming/dropping a column or table).

**Fix:**
- Do NOT use `--accept-data-loss`
- Make the change additive: add the new column first, migrate data, then remove the old column in a separate step
- Or use `prisma migrate dev` to create a proper migration with custom SQL

### 4. Redis Connection Failed

**Cause:** Redis is not running or `REDIS_URL` is wrong.

**Impact:** Non-fatal. The server continues without caching. Console shows: `Redis unavailable (caching disabled)`.

**Fix:** Start Redis locally or via Docker (`npm run docker:dev`). Or ignore if caching is not needed during development.

### 5. ERR_CONTENT_DECODING_FAILED in Browser

**Cause:** Double compression. The Express `compression` middleware was removed because Railway CDN already handles gzip.

**Fix:** Do not re-add `compression` middleware to `app.ts`. This is noted in the source code comments.

### 6. Vite Proxy Not Working -- API Returns 404

**Cause:** The Vite dev server proxy is only active when running `npm run dev` (Vite dev mode). The proxy sends `/api` requests to `http://localhost:8000`.

**Fix:** Ensure the server is running on port 8000. If using a different port, update `src/client/vite.config.ts`:
```typescript
proxy: {
  '/api': { target: 'http://localhost:YOUR_PORT', changeOrigin: true },
},
```

### 7. Prisma Client Out of Sync -- "Unknown field" or "Invalid model"

**Cause:** Prisma schema was updated but `prisma generate` was not run.

**Fix:**
```bash
npx prisma generate --schema=src/server/prisma/schema.prisma
```

### 8. Port Conflict -- "EADDRINUSE"

**Cause:** Another process is using port 8000 (server) or 3000 (client).

**Fix:**
```bash
# Find and kill the process
# On Linux/Mac:
lsof -ti:8000 | xargs kill -9
# On Windows:
netstat -ano | findstr :8000
taskkill /PID <pid> /F
```

### 9. Build Fails -- TypeScript Errors

**Fix:** Run type checking to see all errors:
```bash
npm run typecheck
```

Note: The server `tsconfig.json` has `strict: false` and `noImplicitAny: false`, so many type errors are suppressed. The client has `strict: true`.

### 10. WellnessContent Seed Returns "skipped"

**Cause:** The `seedAll()` method only runs if the `wellness_contents` table has zero rows.

**Fix:** To re-seed, first delete all existing wellness content via admin API or directly in the database:
```sql
DELETE FROM wellness_contents;
```
Then re-run the seed endpoint.

### 11. `src/server/backups/` Growing Large

**Cause:** Each `db:backup` or `db:safe-push` creates a new JSON backup file.

**Fix:** Periodically delete old backup files. The backups directory is gitignored (listed as `?? src/server/backups/` in git status). Keep at least the most recent backup.

### 12. Cron Jobs Not Running

**Cause:** Cron jobs are registered in `src/server/src/server.ts` during the `bootstrap()` function. They only run after the database connects successfully.

**Registered cron jobs:**
| Schedule        | Task                                    |
|-----------------|-----------------------------------------|
| Every 15 min    | Auto-complete past appointments         |
| Every 15 min    | Deactivate expired community polls      |
| Every hour      | Deactivate expired coupons              |
| Every hour      | Clean up expired OTPs                   |
| Every hour      | Send push notifications (water, mood, period, ovulation) |
| Daily midnight  | Expire seller licenses + unpublish products |

---

*End of Document 10 -- Developer Guide*
