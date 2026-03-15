# Document 1 -- System Architecture

**App:** VedaClue (Women's Health & Wellness Platform)
**Generated:** 2026-03-15
**Source of truth:** Code inspection only -- nothing assumed.

---

## 1.1 Full Tech Stack with Versions

### Root Monorepo (`/package.json`)
| Tool | Version | Purpose |
|---|---|---|
| Node.js | >=20.0.0 | Runtime (enforced via `engines`) |
| npm | >=10.0.0 | Package manager |
| TypeScript | ^5.4.5 | Language |
| ESLint | ^8.57.0 | Linting |
| Prettier | ^3.2.5 | Code formatting |
| concurrently | ^8.2.2 | Parallel dev scripts |
| lint-staged | ^15.2.2 | Pre-commit lint |

### Client (`/src/client/package.json` -- `@vedaclue/client`)
| Library | Version | Purpose |
|---|---|---|
| React | ^18.3.1 | UI framework |
| react-dom | ^18.3.1 | DOM renderer |
| react-router-dom | ^6.23.1 | Client-side routing |
| Vite | ^5.2.12 | Build tool / dev server |
| @vitejs/plugin-react | ^4.3.0 | Vite React plugin |
| TailwindCSS | ^3.4.3 | Utility CSS |
| PostCSS | ^8.4.38 | CSS processing |
| autoprefixer | ^10.4.19 | Vendor prefixes |
| Zustand | ^4.5.2 | Global state management |
| @tanstack/react-query | ^5.36.0 | Server state / data fetching |
| Axios | ^1.7.2 | HTTP client |
| react-hook-form | ^7.51.5 | Form handling |
| @hookform/resolvers | ^3.4.2 | Zod resolver for RHF |
| Zod | ^3.23.8 | Schema validation (shared with server) |
| date-fns | ^3.6.0 | Date utilities |
| framer-motion | ^11.18.2 | Animations |
| react-spring | ^10.0.3 | Physics-based animations |
| @use-gesture/react | ^10.3.1 | Gesture handling |
| lucide-react | ^0.378.0 | Icon library |
| clsx | ^2.1.1 | Conditional classnames |
| tailwind-merge | ^2.3.0 | TW class deduplication |
| react-hot-toast | ^2.4.1 | Toast notifications |
| react-helmet-async | ^2.0.5 | SEO / head management |
| canvas-confetti | ^1.9.4 | Confetti effects |
| i18next | ^25.8.18 | Internationalization |
| react-i18next | ^16.5.8 | React i18n bindings |
| @react-oauth/google | ^0.13.4 | Google OAuth |
| Express | ^4.19.2 | Production SPA static server (`server.js`) |
| Vitest | ^1.6.0 | Unit testing |
| @testing-library/react | ^15.0.7 | Component testing |
| jsdom | ^24.0.0 | DOM environment for tests |
| vite-plugin-pwa | ^0.20.0 | PWA support |

### Server (`/src/server/package.json` -- `@vedaclue/server`)
| Library | Version | Purpose |
|---|---|---|
| Express | ^4.19.2 | HTTP framework |
| @prisma/client | ^5.14.0 | ORM / DB client |
| prisma | ^5.14.0 | Schema tooling / migrations |
| ioredis | ^5.4.1 | Redis client |
| jsonwebtoken | ^9.0.2 | JWT auth |
| bcryptjs | ^2.4.3 | Password hashing |
| cors | ^2.8.5 | CORS middleware |
| helmet | ^7.1.0 | Security headers |
| express-rate-limit | ^7.2.0 | Rate limiting |
| morgan | ^1.10.0 | HTTP request logging |
| winston | ^3.13.0 | Structured logging |
| Zod | ^3.23.8 | Input validation |
| dotenv | ^16.4.5 | Env var loading |
| tsx | ^4.11.0 | TS execution (dev + scripts) |
| node-cron | ^4.2.1 | Scheduled jobs |
| bull | ^4.12.9 | Job queue (Redis-backed) |
| @sendgrid/mail | ^8.1.6 | Transactional email |
| twilio | ^5.1.0 | SMS / OTP delivery |
| google-auth-library | ^10.6.1 | Google ID token verification |
| razorpay | ^2.9.6 | Payment gateway (India) |
| cloudinary | ^1.41.3 | Image/media CDN |
| multer | ^1.4.5-lts.1 | File upload parsing |
| multer-storage-cloudinary | ^4.0.0 | Direct-to-Cloudinary uploads |
| web-push | ^3.6.7 | Web Push notifications (VAPID) |
| @sentry/node | ^8.7.0 | Error monitoring |
| compression | ^1.7.4 | Gzip (disabled in prod -- Railway CDN handles it) |
| swagger-jsdoc | ^6.2.8 | OpenAPI spec generation |
| swagger-ui-express | ^5.0.0 | Interactive API docs at `/api-docs` |
| Vitest | ^1.6.0 | Unit testing |
| supertest | ^7.0.0 | HTTP integration testing |

### Infrastructure
| Component | Version / Service | Purpose |
|---|---|---|
| PostgreSQL | 16-alpine (Docker) | Primary database |
| Redis | 7-alpine (Docker) | Cache + rate limiting + OTP store |
| Railway | Nixpacks builder | Cloud deployment (PaaS) |
| Cloudinary | SaaS | Image/video CDN + storage |
| Razorpay | SaaS | Payment processing |
| SendGrid | SaaS | Email delivery |
| Twilio | SaaS | SMS / OTP |
| Sentry | SaaS | Error tracking |

---

## 1.2 Folder Structure

```
shebloom/                              # Monorepo root (npm workspaces)
+-- package.json                       # Root: workspace config, shared dev deps, top-level scripts
+-- nixpacks.toml                      # Railway build config (single-service deployment)
+-- railway.toml                       # Railway deploy config (health checks, start command)
+-- docker-compose.yml                 # Local dev: Postgres + Redis + API + Client
+-- env-example                        # Template for .env
+-- docker/
|   +-- Dockerfile.client              # Client container image
|   +-- Dockerfile.server              # Server container image
+-- nginx/
|   +-- default.conf                   # Nginx reverse proxy config (Docker prod)
+-- scripts/
|   +-- deploy.sh                      # Deployment helper script
|   +-- generate-icons.mjs             # PWA icon generator
+-- docs/
|   +-- DEPLOYMENT-GUIDE.md
|   +-- QA-REPORT.md
+-- src/
    +-- client/                        # @vedaclue/client workspace
    |   +-- package.json
    |   +-- nixpacks.toml              # Standalone client Railway config
    |   +-- vite.config.ts             # Vite build: aliases, proxy, chunking
    |   +-- tailwind.config.ts         # Tailwind theme
    |   +-- tsconfig.json
    |   +-- index.html                 # SPA entry
    |   +-- server.js                  # Production Express server (SPA + API proxy)
    |   +-- public/                    # Static assets: icons, manifest, SW, sitemap
    |   +-- src/
    |       +-- main.tsx               # React entry point
    |       +-- App.tsx                # Root component / router
    |       +-- i18n.ts                # i18next config
    |       +-- services/
    |       |   +-- api.ts             # Axios instance + all API wrappers (auth, cycle, etc.)
    |       +-- stores/                # Zustand stores (persisted to localStorage)
    |       |   +-- authStore.ts       # Auth state (user, tokens)
    |       |   +-- cycleStore.ts      # Period cycle state
    |       |   +-- subscriptionStore.ts # Subscription tier
    |       |   +-- ayurvedaStore.ts   # Dosha / Ayurveda state
    |       +-- components/            # Reusable UI components
    |       |   +-- layout/            # App shell, navigation
    |       |   +-- dashboard/         # Dashboard widgets
    |       |   +-- auth/              # Auth forms
    |       |   +-- common/            # Shared components
    |       |   +-- BottomNav.tsx, ErrorBoundary.tsx, ImageUpload.tsx, etc.
    |       +-- pages/                 # 44 route pages (AdminPage, TrackerPage, etc.)
    |       +-- hooks/                 # Custom hooks (useAchievements, useCart, usePeriodEvents, etc.)
    |       +-- locales/               # i18n translation files
    |       |   +-- en.json            # English
    |       |   +-- hi.json            # Hindi
    |       +-- styles/
    |       |   +-- index.css          # Global styles + Tailwind imports
    |       +-- utils/
    |           +-- helpers.ts         # Utility functions
    +-- server/                        # @vedaclue/server workspace
        +-- package.json
        +-- nixpacks.toml              # Standalone server Railway config
        +-- tsconfig.json
        +-- prisma/
        |   +-- schema.prisma          # Full database schema (Prisma)
        |   +-- seed.ts                # DB seed script
        +-- seeds/
        |   +-- index.ts               # Alternative seed entry
        +-- scripts/
        |   +-- db-backup.ts           # Export all tables to JSON
        |   +-- db-safe-push.ts        # Safe schema push (backup + verify counts)
        |   +-- cleanup-otp.sql        # Manual OTP cleanup
        +-- backups/                   # Timestamped JSON backup files
        +-- logs/                      # Winston log files
        +-- uploads/                   # Local file uploads (dev)
        +-- src/
            +-- server.ts              # Entry: bootstrap (DB, Redis, cron), HTTP listen
            +-- app.ts                 # Express app setup (middleware, routes, SPA serving)
            +-- config/
            |   +-- index.ts           # Barrel export
            |   +-- database.ts        # PrismaClient singleton
            |   +-- redis.ts           # ioredis connection + cache helpers
            |   +-- env.ts             # Zod-validated env schema
            |   +-- logger.ts          # Winston logger (dev: colorized, prod: JSON + files)
            |   +-- cloudinary.ts      # Cloudinary SDK config
            |   +-- swagger.ts         # OpenAPI spec definition
            +-- middleware/
            |   +-- auth.ts            # JWT authenticate / authorize / optionalAuth
            |   +-- errorHandler.ts    # Centralized error handler (AppError, Zod, Prisma)
            |   +-- notFoundHandler.ts # 404 catch-all
            |   +-- requestLogger.ts   # Request logging
            |   +-- roles.middleware.ts # Role-based access
            |   +-- subscription.middleware.ts # Premium feature gating
            |   +-- upload.middleware.ts       # Multer + Cloudinary upload
            |   +-- validate.ts        # Zod validation middleware
            +-- routes/                # 36 route files (one per domain)
            +-- services/              # 14 service files (business logic)
            |   +-- auth.service.ts    # OTP, login, register, Google, password reset
            |   +-- cycle.service.ts   # Period tracking, predictions, fertility, BBT
            |   +-- content.service.ts # Ayurvedic content (remedies, phase guidance)
            |   +-- doctor.service.ts  # Doctor search, profiles
            |   +-- dosha.service.ts   # Dosha assessment engine
            |   +-- email.service.ts   # SendGrid email sending
            |   +-- hospital.service.ts       # Hospital search
            |   +-- insights.service.ts       # Health insights aggregation
            |   +-- push.service.ts    # Web Push notifications (VAPID)
            |   +-- subscription.service.ts   # Razorpay subscriptions
            |   +-- user.service.ts    # User profile management
            |   +-- weather.service.ts # OpenWeather integration
            |   +-- wellness-content.service.ts # Wellness tips/routines
            |   +-- herb-safety.service.ts     # Herb interaction checker
            +-- validators/            # Zod schemas for request validation
            +-- utils/
                +-- response.utils.ts  # Standardized API response helpers
```

---

## 1.3 Data Flow Diagram

### Standard Authenticated Request

```
User (Browser)
  |
  |  HTTPS request (Bearer JWT in Authorization header)
  v
+-----------------------------------------------------------+
|  React SPA (Vite-built)                                   |
|  Page -> Hook (useData, usePeriodEvents, etc.)            |
|  -> api.ts (Axios instance, baseURL: /api/v1)             |
|  -> Interceptor adds JWT from localStorage (sb_token)     |
+-----------------------------------------------------------+
  |
  |  In Production: same-origin request (Express serves both)
  |  In Dev: Vite proxy forwards /api -> localhost:8000
  v
+-----------------------------------------------------------+
|  Express Server (app.ts)                                  |
|  1. helmet() -- security headers                          |
|  2. cors()   -- origin whitelist                          |
|  3. express.json() -- body parsing                        |
|  4. morgan() + requestLogger -- HTTP logging              |
|  5. rateLimit -- general (500/15min) + auth (60/15min)    |
+-----------------------------------------------------------+
  |
  v
+-----------------------------------------------------------+
|  Route Handler (e.g., /api/v1/cycles)                     |
|  -> authenticate middleware                               |
|     - Checks Redis for blacklisted token                  |
|     - jwt.verify() with JWT_SECRET (HS256)                |
|     - Checks Redis cache for user basic info (60s TTL)    |
|     - Falls back to Prisma DB lookup                      |
|  -> authorize('USER','ADMIN') (role check)                |
|  -> validate(zodSchema) (input validation)                |
+-----------------------------------------------------------+
  |
  v
+-----------------------------------------------------------+
|  Service Layer (e.g., cycle.service.ts)                   |
|  1. Check Redis cache (cacheGet)                          |
|  2. If cache miss -> Prisma query to PostgreSQL           |
|  3. Process business logic                                |
|  4. Write-through: cacheDel on mutations                  |
|  5. cacheSet result with TTL                              |
+-----------------------------------------------------------+
  |           |
  v           v
+--------+ +----------+
|  Redis | | PostgreSQL|
| (cache)| | (source   |
|        | |  of truth)|
+--------+ +----------+
  |
  v
+-----------------------------------------------------------+
|  Response                                                 |
|  { success: true, data: {...} }                           |
|  or                                                       |
|  { success: false, error: "message" }                     |
+-----------------------------------------------------------+
  |
  v
User (Browser)
  -> React Query caches response
  -> Zustand store updated (if auth/subscription/cycle)
  -> UI re-renders
```

### Token Refresh Flow

```
401 response from server
  -> Axios response interceptor catches it
  -> Calls POST /api/v1/auth/refresh with sb_refresh token
  -> On success: stores new sb_token + sb_refresh, retries original request
  -> On failure: clears all localStorage, redirects to /auth
  -> Global lock prevents parallel refresh attempts
```

### File Upload Flow

```
User selects file
  -> FormData via uploadAPI.image() / .multiple()
  -> upload.middleware.ts checks for Cloudinary config
     - If configured: multer-storage-cloudinary -> Cloudinary CDN
     - If not: multer diskStorage -> /uploads/ directory
  -> Returns URL(s) in response
```

---

## 1.4 Environment Variables

### Required (server will exit if missing)

| Variable | Source | Description |
|---|---|---|
| `DATABASE_URL` | `config/env.ts:7` | PostgreSQL connection string |
| `JWT_SECRET` | `config/env.ts:9` | JWT signing key (min 32 chars, validated in `app.ts:60-64` for production) |
| `JWT_REFRESH_SECRET` | `config/env.ts:10` | Refresh token signing key (min 32 chars) |

### With Defaults (optional to set)

| Variable | Default | Source | Description |
|---|---|---|---|
| `NODE_ENV` | `development` | `config/env.ts:4` | Environment mode |
| `APP_PORT` | `8000` | `config/env.ts:5` | Server listen port |
| `PORT` | -- | `server.ts:14` | Railway-injected port (takes precedence) |
| `APP_VERSION` | `1.0.0` | `config/env.ts:6` | Version string |
| `REDIS_URL` | `redis://localhost:6379` | `config/env.ts:8` | Redis connection |
| `JWT_EXPIRY` | `15m` | `config/env.ts:11` | Access token TTL |
| `JWT_REFRESH_EXPIRY` | `7d` | `config/env.ts:12` | Refresh token TTL |
| `BCRYPT_SALT_ROUNDS` | `12` | `config/env.ts:13` | Password hash cost |
| `CORS_ORIGINS` | `http://localhost:3000` | `config/env.ts:14` | Extra CORS origins |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | `config/env.ts:15` | Rate limit window |
| `RATE_LIMIT_MAX` | `100` (env) / `500` (app.ts) | `config/env.ts:16`, `app.ts:155` | Max requests per window |
| `AWS_REGION` | `ap-south-1` | `config/env.ts:21` | AWS region |
| `CLIENT_URL` | -- | `app.ts:105` | Added to CORS allow-list |
| `LOG_LEVEL` | auto (`info` prod, `debug` dev) | `config/logger.ts:21` | Winston log level |

### Optional Service Integrations

| Variable | Source | Description |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | `config/env.ts:17` | Twilio SMS |
| `TWILIO_AUTH_TOKEN` | `config/env.ts:18` | Twilio auth |
| `TWILIO_PHONE_NUMBER` | `config/env.ts:19` | Twilio sender number |
| `SENDGRID_API_KEY` | `config/env.ts:20` | Email delivery |
| `AWS_S3_BUCKET` | `config/env.ts:22` | S3 bucket name |
| `SENTRY_DSN` | `config/env.ts:23` | Error tracking |
| `RAZORPAY_KEY_ID` | `config/env.ts:24` | Payment gateway |
| `RAZORPAY_KEY_SECRET` | `config/env.ts:25` | Payment gateway secret |
| `ENCRYPTION_KEY` | `config/env.ts:26` | Data encryption key |
| `OPENWEATHER_API_KEY` | `config/env.ts:27` | Weather API |
| `GOOGLE_CLIENT_ID` | `auth.service.ts:190` | Google OAuth verification |
| `GOOGLE_CLIENT_SECRET` | `env-example:18` | Google OAuth (in env-example but not in Zod schema) |
| `CLOUDINARY_CLOUD_NAME` | `config/cloudinary.ts:4` | Image CDN |
| `CLOUDINARY_API_KEY` | `config/cloudinary.ts:5` | Image CDN |
| `CLOUDINARY_API_SECRET` | `config/cloudinary.ts:6` | Image CDN |
| `VAPID_PUBLIC_KEY` | `services/push.service.ts:6` | Web Push public key |
| `VAPID_PRIVATE_KEY` | `services/push.service.ts:7` | Web Push private key |
| `ADMIN_PIN_HASH` | `routes/admin.routes.ts:24` | Hashed admin access PIN |

### Client-Side Variables

| Variable | Source | Description |
|---|---|---|
| `VITE_API_URL` | `services/api.ts:8` | API base URL override (Vite injects at build time) |
| `BACKEND_URL` | `server.js:17` | API proxy target (production SPA server) |

---

## 1.5 Railway Deployment

VedaClue supports two deployment modes on Railway. The active configuration uses **single-service deployment** (root `nixpacks.toml`).

### Single-Service Mode (Primary)

**Config file:** `/nixpacks.toml`

```toml
[phases.setup]
nixPkgs = ["nodejs_20", "openssl"]

[phases.install]
cmds = ["npm install --include=dev"]

[phases.build]
cmds = [
  "npm run build -w src/client",   # Vite builds React -> src/client/dist/
  "npm run build -w src/server"     # prisma generate + tsc -> src/server/dist/
]

[start]
cmd = "npm start"   # runs: npm run start -w src/server
                     # which runs: npx prisma db push && node dist/server.js
```

**How it works:**
1. Railway detects `nixpacks.toml` at root, installs Node 20 + OpenSSL
2. `npm install --include=dev` installs all workspaces
3. Client is built with Vite (output: `src/client/dist/`)
4. Server is built with `prisma generate` + `tsc` (output: `src/server/dist/`)
5. On start: `prisma db push` syncs schema to DB, then `node dist/server.js` boots
6. Express serves the React SPA from `src/client/dist/` via static middleware (`app.ts:356-365`)
7. All `/api/*` routes handled by Express, everything else returns `index.html` (SPA fallback)

**Health check:** `GET /api/health` (`railway.toml:7`, `app.ts:173`)
- Returns `{ success: true, status: "healthy" }`
- Timeout: 60 seconds
- Restart policy: ON_FAILURE, max 3 retries

### Two-Service Mode (Alternative)

Separate `nixpacks.toml` files exist in `src/client/` and `src/server/` for independent deployment:

- **Client service** (`src/client/nixpacks.toml`): Builds Vite, runs `node server.js`
  - `server.js` serves SPA static files and proxies `/api/*` to `BACKEND_URL`
- **Server service** (`src/server/nixpacks.toml`): Builds Prisma + TS, runs server

### `railway.toml` (Legacy / Override)

**File:** `/railway.toml`

```toml
[deploy]
startCommand = "cd src/server && npx prisma db push --accept-data-loss && node dist/server.js"
```

> WARNING: This file uses `--accept-data-loss` on `prisma db push`, which contradicts the project's safety policy. The root `nixpacks.toml` takes precedence for Nixpacks builds, but this file may be active if Railway is configured to use the NIXPACKS builder with railway.toml overrides. Verify which config Railway is actually using.

### Bootstrap Sequence (`server.ts:73-357`)

```
1. app.listen(PORT)              -- HTTP server starts immediately (health checks pass)
2. connectDatabase()             -- Prisma connects to PostgreSQL
3. runMigrations()               -- npx prisma generate (regenerate client)
4. ensureChiefDoctor()           -- Seeds Dr. Shruthi R if missing
5. connectRedis()                -- ioredis connects (failure is non-fatal)
6. Register cron jobs:
   - */15 * * * *  Auto-complete past appointments
   - */15 * * * *  Deactivate expired community polls
   - 0 * * * *     Deactivate expired coupons
   - 0 * * * *     Clean up expired OTPs
   - 0 0 * * *     Expire seller licenses + unpublish products
   - 0 * * * *     Push notifications (water, mood, period, ovulation)
```

---

## 1.6 Redis Caching Strategy

**Config file:** `src/server/src/config/redis.ts`

### Connection

- Client: `ioredis` with lazy connect, 10s timeout, max 10 retries with exponential backoff (100ms-3s)
- **Fail-open design:** All cache operations (`cacheGet`, `cacheSet`, `cacheDel`, `cacheIncr`, `cacheDelPattern`) silently return null/0/void if Redis is down. The app continues using only PostgreSQL.
- Connection state tracked via `isConnected` boolean; errors logged but never thrown to callers.

### Cache Operations

| Function | Signature | Description |
|---|---|---|
| `cacheGet<T>(key)` | `redis.get` + JSON.parse | Read cached value |
| `cacheSet(key, data, ttl)` | `redis.setex` | Write with TTL (default: 3600s) |
| `cacheDel(key)` | `redis.del` | Delete single key |
| `cacheDelPattern(pattern)` | `redis.keys` + `redis.del` | Delete keys by glob pattern |
| `cacheIncr(key, ttl)` | `redis.incr` + `redis.expire` | Atomic counter with TTL (rate limiting) |

### Cache Key Patterns and TTLs

| Key Pattern | TTL | Service | Purpose |
|---|---|---|---|
| `user:{id}:basic` | 60s | `middleware/auth.ts:37,76` | Authenticated user lookup (avoids DB hit per request) |
| `blacklist:{token}` | varies | `middleware/auth.ts:20,63` | Revoked JWT tokens |
| `cycles:{userId}` | 600s (10min) | `cycle.service.ts:661,678` | User cycle list |
| `predictions:{userId}` | 1800s (30min) | `cycle.service.ts:785,1061` | Period/fertility predictions |
| `fertility:{userId}` | 3600s (1hr) | `cycle.service.ts:1070,1183` | Fertility insights |
| `ayurveda:{userId}` | 3600s (1hr) | `cycle.service.ts:1321,1568` | Ayurvedic cycle insights |
| `insights:{userId}` | 1800s (30min) | `insights.service.ts:441,534` | Health insights aggregation |
| `sub:{userId}:active` | 60s | `subscription.service.ts:28,33` | Subscription status check |
| `otp:{phone}` | 300s (5min) | `auth.service.ts:90` | OTP code storage |
| `otp_rate:{phone}` | 900s (15min) | `auth.service.ts:84` | OTP send rate limit (max via cacheIncr) |
| `otp_rate:email:{email}` | 900s (15min) | `routes/user.routes.ts:52` | Email OTP rate limit |
| `reset:{userId}` | 3600s (1hr) | `auth.service.ts:180` | Password reset token |
| `content:remedies:*` | 3600s (1hr) | `content.service.ts:66,81` | Ayurvedic remedies |
| `content:phase_guidance:*` | 3600s (1hr) | `content.service.ts:112,130` | Dosha phase guidance |
| `content:dosha_questions` | 3600s (1hr) | `content.service.ts:143,151` | Dosha quiz questions |
| `content:chat_responses:*` | 3600s (1hr) | `content.service.ts:164,172` | AI chat responses |
| `wellness_content:*` | 3600s (1hr) | `wellness-content.service.ts:45,67` | Wellness tips/routines |
| `weather:{lat}:{lon}` | 1800s (30min) | `weather.service.ts:50,70` | Weather data by location |
| `community_post:{userId}` | 3600s (1hr) | `routes/community.routes.ts:149` | Post rate limit counter |
| `community_edit:{userId}` | 3600s (1hr) | `routes/community.routes.ts:376,424` | Edit rate limit counter |

### Cache Invalidation Strategy

**Write-through invalidation:** On any mutation (create/update/delete), related cache keys are explicitly deleted via `cacheDel()`. The next read re-populates the cache.

Example from `cycle.service.ts:730-733` (on period log):
```
cacheDel(`cycles:${userId}`)
cacheDel(`predictions:${userId}`)
cacheDel(`fertility:${userId}`)
cacheDel('insights:' + userId)
```

The content service uses `cacheDelPattern()` for bulk invalidation across dosha/phase combinations (`content.service.ts:344-358`).

---

## 1.7 Database Migrations

### Schema Management Approach

VedaClue uses **Prisma's `db push`** for schema synchronization rather than migration files.

**Schema file:** `src/server/prisma/schema.prisma`
**Database:** PostgreSQL (connection via `DATABASE_URL`)

### Available Scripts

| Command | Runs | Description |
|---|---|---|
| `npm run db:migrate` | `prisma migrate dev` | Create migration file from schema diff (dev only) |
| `npm run db:migrate:deploy` (server) | `prisma migrate deploy` | Apply pending migrations (prod) |
| `npm run db:safe-push` | `tsx scripts/db-safe-push.ts` | Safe schema push with backup + verification |
| `npm run db:backup` | `tsx scripts/db-backup.ts` | Export all tables to JSON |
| `npm run db:seed` | `tsx seeds/index.ts` | Seed database |
| `npm run seed` (server) | `tsx prisma/seed.ts` | Alternative seed (configured in package.json prisma.seed) |
| `npm run db:studio` | `prisma studio` | Visual DB browser |
| `npm run db:reset` (server) | `prisma migrate reset --force` | Full reset (destructive) |

### Production Schema Sync

On every deployment start (`src/server/package.json:9`):
```
"start": "npx prisma db push && node dist/server.js"
```

This runs `prisma db push` which compares `schema.prisma` against the live database and applies additive changes (new tables, columns). It does NOT create migration files.

### Safe Push Script (`scripts/db-safe-push.ts`)

A safety wrapper around `prisma db push`:

1. **Step 1:** Runs `db-backup.ts` -- exports all 55+ tables to a timestamped JSON file in `src/server/backups/`
2. **Step 2:** Records row counts for 12 core models (user, cycle, doctor, order, etc.)
3. **Step 3:** Runs `npx prisma db push` (WITHOUT `--accept-data-loss`)
4. **Step 4:** Compares post-push row counts -- exits with error if any data loss detected

### Backup Script (`scripts/db-backup.ts`)

Exports all model data via `prisma.findMany()` to `src/server/backups/backup-{ISO-timestamp}.json`.

Covers 55+ models including: user, userProfile, cycle, moodLog, doctor, appointment, article, order, product, subscription, communityPost, seller, and more.

### Runtime Schema Regeneration

On every server boot (`server.ts:62`), `npx prisma generate` is run to ensure the Prisma Client JS matches the current schema. This handles cases where the schema was updated but the client wasn't regenerated.

### Seed Data

On every server boot, `ensureChiefDoctor()` (`server.ts:16-56`) checks for and creates the chief doctor record (Dr. Shruthi R) if missing. This acts as essential seed data baked into the bootstrap sequence.

---

## Appendix: API Route Map

All routes are mounted under `/api/v1/` in `app.ts:314-351`:

| Mount Path | Route File | Domain |
|---|---|---|
| `/auth` | `auth.routes.ts` | Registration, login, OTP, Google, password reset |
| `/users` | `user.routes.ts` | Profile, export, delete, mobile/email verification |
| `/cycles` | `cycle.routes.ts` | Period logging, predictions, BBT, cervical mucus, fertility |
| `/mood` | `mood.routes.ts` | Mood logging + history |
| `/pregnancy` | `pregnancy.routes.ts` | Pregnancy tracking |
| `/doctors` | `doctor.routes.ts` | Doctor search, profiles, slots |
| `/hospitals` | `hospital.routes.ts` | Hospital search, price comparison |
| `/articles` | `article.routes.ts` | Articles, bookmarks, likes, comments |
| `/wellness` | `wellness.routes.ts` | Wellness activities, daily score |
| `/appointments` | `appointment.routes.ts` | Booking, listing, cancellation |
| `/notifications` | `notification.routes.ts` | Push notifications, preferences |
| `/admin` | `admin.routes.ts` | Full admin dashboard (users, products, doctors, orders, etc.) |
| `/upload` | `upload.routes.ts` | Image/video upload (Cloudinary or local) |
| `/products` | `products.routes.ts` | Product catalog, reviews, wishlist |
| `/ai` | `ai.routes.ts` | AI features |
| `/cart` | `cart.routes.ts` | Shopping cart |
| `/achievements` | `achievements.routes.ts` | Gamification badges |
| `/reports` | `reports.routes.ts` | Health reports |
| `/callbacks` | `callback.routes.ts` | Callback requests |
| `/prescriptions` | `prescription.routes.ts` | Doctor prescriptions |
| `/payments` | `payment.routes.ts` | Razorpay orders, verification, COD |
| `/doctor` | `doctor-dashboard.routes.ts` | Doctor self-service dashboard |
| `/dosha` | `dosha.routes.ts` | Dosha assessment, profile, history |
| `/weather` | `weather.routes.ts` | Weather-based recommendations |
| `/finance` | `finance.routes.ts` | Coupons, platform config, payouts, audit |
| `/programs` | `program.routes.ts` | Wellness programs, enrollment |
| `/sellers` | `seller.routes.ts` | Seller management, payouts |
| `/community` | `community.routes.ts` | Posts, replies, likes, polls, moderation |
| `/content` | `content.routes.ts` | Ayurvedic content (remedies, phase guidance) |
| `/subscriptions` | `subscription.routes.ts` | Plans, Razorpay subscriptions, webhooks |
| `/analytics` | `analytics.routes.ts` | Event tracking, admin analytics, NPS |
| `/referrals` | `referral.routes.ts` | Referral codes, badges |
| `/email-campaigns` | `email-campaign.routes.ts` | Email campaign management |
| `/insights` | `insights.routes.ts` | Health insights aggregation |
| `/wellness-content` | `wellness-content.routes.ts` | Yoga, breathwork, tips content |
| `/debug` | `debug.routes.ts` | Debug routes (non-production only) |

**Non-versioned routes:**
- `GET /api/health` -- Health check
- `GET /api/ready` -- Readiness check
- `GET /sitemap.xml` -- Dynamic sitemap (cached 1hr, includes articles, doctors, products)
- `GET /api-docs` -- Swagger UI

---

*End of Document 1 -- System Architecture*
