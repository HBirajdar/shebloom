# Document 4 — Wellness Content System

> VedaClue Women's Health App — Technical Documentation
> Generated: 2026-03-15

---

## Table of Contents

- [4.1 WellnessContent DB Model](#41-wellnesscontent-db-model)
- [4.2 3-Layer Fallback Chain](#42-3-layer-fallback-chain)
- [4.3 Content Types](#43-content-types)
- [4.4 Phase-Based Content Delivery](#44-phase-based-content-delivery)
- [4.5 Admin CRUD](#45-admin-crud)
- [4.6 Seed Data](#46-seed-data)
- [4.7 Error Handling](#47-error-handling)
- [Appendix A: Related Models (WaterLog, WellnessActivity)](#appendix-a-related-models)
- [Appendix B: Daily Wellness Score](#appendix-b-daily-wellness-score)

---

## 4.1 WellnessContent DB Model

**Schema location:** `src/server/prisma/schema.prisma`, line ~1897
**DB table:** `wellness_contents`

```
model WellnessContent {
  id              String   @id @default(cuid())
  type            String
  key             String
  phase           String?
  goal            String?
  dosha           String?
  week            Int?
  category        String?
  emoji           String?
  title           String?
  body            String   @db.Text
  metadata        Json?
  sortOrder       Int      @default(0)
  isActive        Boolean  @default(true)
  sourceReference String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([type, key])
  @@index([type, phase, goal])
  @@index([type, dosha])
  @@index([type, week])
  @@index([isActive])
}
```

### Field Reference

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `id` | String (CUID) | Auto | Primary key |
| `type` | String | Yes | Content category. Must be one of the 12 valid types (see [4.3](#43-content-types)) |
| `key` | String | Yes | Unique slug within a type, e.g. `"fertility_menstrual_0"`, `"preg_week_4_baby_1"` |
| `phase` | String? | No | Menstrual cycle phase: `menstrual`, `follicular`, `ovulation`, `luteal` |
| `goal` | String? | No | User health goal: `periods`, `fertility`, `pregnancy`, `wellness` |
| `dosha` | String? | No | Ayurvedic constitution: `vata`, `pitta`, `kapha` |
| `week` | Int? | No | Pregnancy week number (4, 8, 12, 16, 20, 24, 28, 32, 36, 40) |
| `category` | String? | No | Sub-grouping. Values depend on type: `morning`/`afternoon`/`evening` for routines; `baby`/`mom`/`tips`/`nutrition`/`exercise` for pregnancy |
| `emoji` | String? | No | Leading emoji extracted from the content body |
| `title` | String? | No | Display title (used by yoga poses, challenges, affirmations) |
| `body` | Text | Yes | Main content text. The only required content field |
| `metadata` | Json? | No | Structured extra data. Examples: `{ duration: "3 min" }` for yoga, `{ days: 7, color: "#E11D48", bg: "#FFF1F2", badge: "..." }` for challenges, `{ size, length, weight, trimester }` for pregnancy |
| `sortOrder` | Int | Auto (0) | Display ordering within a group. Lower = first |
| `isActive` | Boolean | Auto (true) | Soft-delete flag. Only active content is served to public endpoints |
| `sourceReference` | String? | No | Tracks content origin (see [4.6](#46-seed-data)) |
| `createdAt` | DateTime | Auto | Row creation timestamp |
| `updatedAt` | DateTime | Auto | Last modification timestamp |

**Unique constraint:** `@@unique([type, key])` — no two rows can share the same type+key combination. Violations return Prisma error `P2002`.

**Indexes:** Optimized for the three most common query patterns: by type+phase+goal, by type+dosha, and by type+week.

---

## 4.2 3-Layer Fallback Chain

The system uses a three-tier strategy to always deliver content, even when infrastructure fails.

**Implementation:** `src/server/src/services/wellness-content.service.ts`, method `getByType()` (line 34)

### Layer 1: Redis Cache

- **Config:** `src/server/src/config/redis.ts`
- **Connection:** `ioredis` client, connects to `REDIS_URL` env var (default `redis://localhost:6379`)
- **Cache prefix:** `wc:` (defined as `CACHE_PREFIX` at line 6 of the service)
- **Key format:** `wc:{type}:{phase}:{goal}:{dosha}:{week}:{category}` — segments are only appended if the corresponding filter is provided
  - Example with all filters: `wc:phase_tip:menstrual:fertility`
  - Example minimal: `wc:wellness_tip`
- **TTL for populated results:** 3600 seconds (1 hour), defined as `CACHE_TTL` at line 4
- **TTL for empty results:** 300 seconds (5 minutes), defined as `CACHE_EMPTY_TTL` at line 5. This prevents cache stampede when the DB has no content for a given query
- **Cache read:** `cacheGet<T>()` at `redis.ts` line 37. Returns `null` if Redis unavailable or key missing
- **Cache write:** `cacheSet()` at `redis.ts` line 48. Uses `SETEX` (set with expiry)
- **Cache invalidation:** `cacheDelPattern()` at `redis.ts` line 79. Uses `KEYS` + `DEL` with glob pattern `wc:{type}*`

**Key function** (`wellness-content.service.ts` line 22):
```typescript
function cacheKey(type: string, filters: Record<string, string | number | undefined>): string {
  const parts = [CACHE_PREFIX, type];
  if (filters.phase) parts.push(String(filters.phase));
  if (filters.goal) parts.push(String(filters.goal));
  if (filters.dosha) parts.push(String(filters.dosha));
  if (filters.week !== undefined) parts.push(String(filters.week));
  if (filters.category) parts.push(String(filters.category));
  return parts.join(':');
}
```

### Layer 2: PostgreSQL (via Prisma)

If the cache returns `null`, the service queries `prisma.wellnessContent.findMany()` with:
- `where`: `{ type, isActive: true }` plus any provided filters (phase, goal, dosha, week, category)
- `orderBy`: `{ sortOrder: 'asc' }`
- `select`: Returns only the fields needed for display (excludes `isActive`, `createdAt`, `updatedAt`)

The DB result is then written back to Redis for subsequent requests.

### Layer 3: Frontend Hardcoded Fallback

If both Redis and PostgreSQL fail, the service returns an empty array `[]` (line 74). The frontend (`WellnessPage.tsx`) detects empty/null DB content and falls back to the hardcoded `PHASE_DATA` constant (lines 14-80):

```typescript
// WellnessPage.tsx lines 178-184
const pd = {
  ...hardcodedPd,
  routine: dbRoutine || hardcodedPd.routine,   // DB wins if available
  yoga: dbYoga || hardcodedPd.yoga,
  tip: dbTipWisdom || hardcodedPd.tip,
};
const activeChallenges = dbChallenges || CHALLENGES;
```

The fallback data in `WellnessPage.tsx` is a complete mirror of the seed data, so users see identical content even if the database is empty.

### Flow Diagram

```
Client Request
     |
     v
[Redis Cache] --hit--> Return cached data
     |
    miss
     v
[PostgreSQL] --rows found--> Cache result, return
     |
    empty or error
     v
[Return []] --> Frontend uses hardcoded PHASE_DATA / CHALLENGES
```

---

## 4.3 Content Types

**Defined at:** `src/server/src/services/wellness-content.service.ts`, line 8 (`VALID_TYPES` Set)

There are **12 valid content types**. The route validates incoming `type` parameters against this set via `isValidType()` (line 209).

### Type Catalog

| # | Type | Phase? | Goal? | Dosha? | Week? | Category? | Seed Count | Description |
|---|------|--------|-------|--------|-------|-----------|------------|-------------|
| 1 | `phase_tip` | Yes | Yes | No | No | No | 32 | Short phase-specific health tips. Split by goal (fertility vs periods). Example: "Warm compress relieves cramps" |
| 2 | `wellness_tip` | No | `wellness` | No | No | No | 8 | General wellness advice, not phase-specific. Example: "Stay well hydrated throughout the day" |
| 3 | `phase_routine` | Yes | No | No | No | Yes (`morning`/`afternoon`/`evening`) | 49 | Time-of-day routines per cycle phase. Items grouped by category for display |
| 4 | `phase_yoga` | Yes | No | No | No | No | 16 | Yoga poses per phase with `title` (pose name), `body` (benefit), and `metadata.duration` |
| 5 | `phase_tip_wisdom` | Yes | No | No | No | No | 4 | One longer wisdom quote per phase. Example: "Rest is your superpower right now." |
| 6 | `challenge` | No | No | No | No | No | 4 | Multi-day wellness challenges with `metadata` containing `{ days, color, bg, badge }` |
| 7 | `affirmation` | Yes | No | No | No | No | 4 | Phase-specific positive affirmations with emoji and title |
| 8 | `self_care_breath` | Yes | No | No | No | No | 4 | Breathing exercise descriptions per phase. Example: "4-7-8 Relaxation: Inhale 4s, hold 7s, exhale 8s" |
| 9 | `journal_prompt` | Yes | No | No | No | No | 4 | Reflective journal prompts per phase |
| 10 | `self_care` | Yes | No | No | No | No | 20 | Self-care activity suggestions, 5 per phase |
| 11 | `dosha_remedy` | Yes | No | Yes | No | No | 36 | Ayurvedic remedies, 3 per dosha per phase (3 doshas x 4 phases x 3 items) |
| 12 | `pregnancy_week` | No | No | No | Yes | Yes (`baby`/`mom`/`tips`/`nutrition`/`exercise` + meta) | ~210 | Pregnancy content for weeks 4, 8, 12, 16, 20, 24, 28, 32, 36, 40. Each week has a meta row + 5 category groups of ~4 items each |

**Total seed items:** approximately **391 rows**.

---

## 4.4 Phase-Based Content Delivery

### How Phase Is Determined

The client determines the current cycle phase from `useCycleStore()` (Zustand store). The `WellnessPage.tsx` component reads `phase` at line 132:

```typescript
const { phase, cycleDay, goal, hasRealData } = useCycleStore();
const safePhase = (PHASE_DATA[phase] ? phase : 'follicular') as keyof typeof PHASE_DATA;
```

If the store's `phase` value is not one of the four known phases, it defaults to `'follicular'`.

### How Phase Is Passed to the API

The client calls the bulk endpoint with the phase as a query parameter (`WellnessPage.tsx` line 145):

```typescript
wellnessContentAPI.getBulk(
  ['phase_routine', 'phase_yoga', 'phase_tip_wisdom', 'challenge'],
  { phase: safePhase }
)
```

This hits `GET /api/v1/wellness-content/bulk?types=phase_routine,phase_yoga,phase_tip_wisdom,challenge&phase=menstrual`.

### How the DB Filters

In `wellness-content.service.ts` `getByType()` (line 49-54):

```typescript
const where: any = { type, isActive: true };
if (filters.phase) where.phase = filters.phase;
if (filters.goal) where.goal = filters.goal;
if (filters.dosha) where.dosha = filters.dosha;
if (filters.week !== undefined) where.week = filters.week;
if (filters.category) where.category = filters.category;
```

Filters are additive. Only provided filters are applied. Content without a `phase` value (e.g., `challenge` type where phase is `null`) will NOT match if a phase filter is passed -- this means challenges returned by the bulk call will be empty from DB unless they have a matching phase, which they don't in seed data.

**Note:** The `challenge` type in seed data has `phase: undefined` (no phase set). When the bulk request passes `phase=menstrual`, the DB query adds `where.phase = 'menstrual'` which excludes challenges. The frontend handles this by falling back to the hardcoded `CHALLENGES` array:
```typescript
const activeChallenges = dbChallenges || CHALLENGES;
```

### Supported Filter Combinations by Endpoint

| Endpoint | Filters Accepted |
|----------|-----------------|
| `GET /wellness-content?type=...` | `type` (required), `phase`, `goal`, `dosha`, `week`, `category` |
| `GET /wellness-content/bulk?types=...` | `types` (required, comma-separated), `phase`, `goal`, `dosha`, `week` |

---

## 4.5 Admin CRUD

**Routes file:** `src/server/src/routes/wellness-content.routes.ts`
**All admin routes require:** `authenticate` + `requireAdmin` middleware

### Endpoints

| Method | Path | Handler | Service Method | Description |
|--------|------|---------|---------------|-------------|
| GET | `/wellness-content/admin` | Line 58 | `adminList()` | Paginated list with filters. Default: page=1, limit=50, max limit=200 |
| POST | `/wellness-content/admin` | Line 73 | `create()` | Create new content. Requires `type`, `key`, `body` |
| PUT | `/wellness-content/admin/:id` | Line 86 | `update()` | Update any fields. Partial update supported |
| DELETE | `/wellness-content/admin/:id` | Line 98 | `delete()` | Hard delete (not soft delete) |
| PATCH | `/wellness-content/admin/:id/toggle` | Line 109 | `toggle()` | Flip `isActive` boolean |
| POST | `/wellness-content/admin/seed` | Line 120 | `seedAll()` | One-time bulk insert of all default content |

### Create Flow (`create()`, service line 130)

1. Validates `type`, `key`, and `body` are present (route line 76)
2. Inserts row via `prisma.wellnessContent.create()`
3. Sets `sourceReference` to `'Admin-created'` if not provided
4. Calls `invalidateCache(type)` to clear all Redis keys matching `wc:{type}*`
5. Returns the created row
6. On duplicate `type+key`: catches Prisma `P2002` error, returns HTTP 409

### Update Flow (`update()`, service line 154)

1. Finds existing record by `id`; throws `'Not found'` (HTTP 404) if missing
2. Builds partial update object from provided fields only
3. Updates via `prisma.wellnessContent.update()`
4. Invalidates cache for the **old** type
5. If the type was changed, also invalidates cache for the **new** type
6. On duplicate `type+key`: catches `P2002`, returns HTTP 409

### Toggle Flow (`toggle()`, service line 188)

1. Finds existing record by `id`
2. Flips `isActive` to its opposite value: `!existing.isActive`
3. Invalidates cache for the item's type

### Delete Flow (`delete()`, service line 180)

1. Finds existing record by `id`
2. Hard deletes via `prisma.wellnessContent.delete()`
3. Invalidates cache for the deleted item's type

### Cache Invalidation (`invalidateCache()`, service line 200)

```typescript
private async invalidateCache(type: string): Promise<void> {
  try {
    await cacheDelPattern(`${CACHE_PREFIX}${type}*`);
  } catch {
    // Redis unavailable — cache will expire naturally
  }
}
```

Uses `cacheDelPattern()` from `redis.ts` (line 79), which calls `KEYS wc:{type}*` then `DEL` on all matched keys. This clears every cached variant (all phase/goal/dosha combinations) for the affected type.

If Redis is down, the `catch` block silently swallows the error. Stale cache entries will expire naturally at their TTL (max 1 hour).

### Admin List Pagination

`adminList()` at service line 94 supports:
- **Filters:** type, phase, goal, dosha, week, isActive
- **Page:** defaults to 1, minimum 1
- **Limit:** defaults to 50, minimum 1, maximum 200
- **Sort:** by type ascending, then sortOrder ascending
- **Returns:** `{ items: [...], total: number }`

---

## 4.6 Seed Data

**Implementation:** `seedAll()` method in `src/server/src/services/wellness-content.service.ts`, line 214

**Trigger:** `POST /api/v1/wellness-content/admin/seed` (requires admin auth)

### Safety Guard

```typescript
const existing = await prisma.wellnessContent.count();
if (existing > 0) return { inserted: 0, skipped: true };
```

The seed is a **one-time operation**. If any wellness content rows exist in the database, the entire seed is skipped and returns `{ inserted: 0, skipped: true }`. To re-seed, you must first delete all existing content.

### Seed Breakdown

| # | Type | Count | Key Pattern | Source Reference Pattern |
|---|------|-------|-------------|------------------------|
| 1 | `phase_tip` (fertility) | 16 | `fertility_{phase}_{i}` | `DashboardPage.tsx:phaseTips.{phase}[{i}]` |
| 2 | `phase_tip` (periods) | 16 | `periods_{phase}_{i}` | `DashboardPage.tsx:periodTips.{phase}[{i}]` |
| 3 | `wellness_tip` | 8 | `wellness_{i}` | `DashboardPage.tsx:wellnessTips[{i}]` |
| 4 | `phase_routine` | 49 | `{phase}_{timeOfDay}_{i}` | `WellnessPage.tsx:PHASE_DATA.{phase}.routine.{timeOfDay}[{i}]` |
| 5 | `phase_yoga` | 16 | `{phase}_yoga_{i}` | `WellnessPage.tsx:PHASE_DATA.{phase}.yoga[{i}]` |
| 6 | `phase_tip_wisdom` | 4 | `wisdom_{phase}` | `WellnessPage.tsx:PHASE_DATA.{phase}.tip` |
| 7 | `challenge` | 4 | `challenge_{id}` | `WellnessPage.tsx:CHALLENGES[{i}]` |
| 8 | `affirmation` | 4 | `affirmation_{phase}` | `SelfCarePage.tsx:phaseWellness.{phase}.affirmation` |
| 9 | `self_care_breath` | 4 | `breath_{phase}` | `SelfCarePage.tsx:phaseWellness.{phase}.breath` |
| 10 | `journal_prompt` | 4 | `journal_{phase}` | `SelfCarePage.tsx:phaseWellness.{phase}.journalPrompt` |
| 11 | `self_care` | 20 | `selfcare_{phase}_{i}` | `SelfCarePage.tsx:phaseWellness.{phase}.selfCare[{i}]` |
| 12 | `dosha_remedy` | 36 | `dosha_{dosha}_{phase}_{i}` | `DashboardPage.tsx:doshaRemedies.{dosha}.{phase}[{i}]` |
| 13 | `pregnancy_week` | ~210 | `preg_week_{w}_meta` / `preg_week_{w}_{cat}_{i}` | `PregnancyPage.tsx:weekData[{w}]` / `PregnancyPage.tsx:weekData[{w}].{cat}[{i}]` |

**Total:** ~391 rows

### Batch Insert Strategy

```typescript
const chunkSize = 50;
for (let i = 0; i < wcData.length; i += chunkSize) {
  await prisma.wellnessContent.createMany({ data: wcData.slice(i, i + chunkSize) });
}
```

Inserts in sequential batches of 50 to avoid hitting database query-size limits.

### How to Re-Seed

1. Delete all existing content (admin must manually clear the table or use the delete endpoints)
2. Call `POST /api/v1/wellness-content/admin/seed` with an admin bearer token
3. The endpoint returns `{ inserted: <count>, skipped: false }`

### `sourceReference` Purpose

The `sourceReference` field tracks where each piece of content was originally hardcoded in the frontend. Examples:
- `"DashboardPage.tsx:phaseTips.menstrual[0]"` — identifies the exact array index in the original component
- `"WellnessPage.tsx:PHASE_DATA.follicular.routine.morning[2]"` — tracks nested data structures
- `"Admin-created"` — set automatically for content created via the admin API (service line 146)

This field enables:
- **Traceability:** Know which hardcoded constant a DB row replaced
- **Audit:** Distinguish between seeded and manually-created content
- **Migration:** If hardcoded data changes, developers can cross-reference which DB rows need updating

---

## 4.7 Error Handling

### Redis Unavailable

**All Redis operations fail silently.** This is enforced at two levels:

1. **`redis.ts` level** (line 36-46, 48-55, 57-64, 79-87): Every `cacheGet`, `cacheSet`, `cacheDel`, `cacheDelPattern` function checks `if (!redis || !isConnected) return null/void` before operating. All operations are wrapped in try/catch that logs errors and returns graceful defaults.

2. **Service level** (`wellness-content.service.ts` line 200-206): `invalidateCache()` has its own try/catch that silently ignores Redis failures. Comment: "Redis unavailable -- cache will expire naturally."

**Behavior when Redis is down:** The system operates with no caching. Every request hits PostgreSQL directly. Performance degrades but correctness is preserved.

### Database Empty or Unavailable

**Service level** (`wellness-content.service.ts` line 69-74):
```typescript
catch (e) {
  console.warn('[WellnessContent] DB/cache failed, frontend will use hardcoded fallback:', (e as any)?.message);
}
// Layer 3: Return empty — frontend has hardcoded fallback
return [];
```

If `prisma.wellnessContent.findMany()` throws (connection error, timeout, etc.), the service catches the error, logs a warning, and returns `[]`. The frontend detects the empty array and uses its hardcoded `PHASE_DATA` and `CHALLENGES` constants.

### Type Validation

**Route level** (`wellness-content.routes.ts` line 24-25):
```typescript
if (!type) { errorResponse(s, 'type parameter is required', 400); return; }
if (!wcService.isValidType(type)) { errorResponse(s, 'Invalid content type', 400); return; }
```

The `isValidType()` method (service line 209) checks against the `VALID_TYPES` Set. Invalid types are rejected with HTTP 400 before any cache/DB access.

**Bulk endpoint validation** (route line 40-44):
- Requires at least one type in the comma-separated `types` parameter
- Maximum 20 types per bulk request (prevents abuse)
- Filters out invalid types but continues with valid ones
- Returns HTTP 400 only if zero valid types remain after filtering

### Duplicate Key on Create/Update

Prisma unique constraint violation (`P2002`) is caught at the route level:
- **Create** (line 80): Returns HTTP 409 with `"A content item with this type+key already exists"`
- **Update** (line 92): Returns HTTP 409 with `"Duplicate type+key"`

### Not Found on Update/Delete/Toggle

All three operations first query `findUnique({ where: { id } })`. If the record does not exist, they throw `new Error('Not found')`, which is caught at the route level and returned as HTTP 404.

### Input Sanitization

- `safeInt()` (service line 16, route line 10): Safely parses integers, returns `undefined` on `NaN`
- `week` is always parsed through `safeInt()` before being used in queries
- `isActive` is coerced to boolean: `data.isActive === true || data.isActive === 'true'` (service line 145)
- Water log value is clamped: `Math.min(value, 20)` (wellness.routes.ts line 111)

### Redis Connection Configuration

**File:** `src/server/src/config/redis.ts`, lines 9-17

| Setting | Value | Purpose |
|---------|-------|---------|
| `maxRetriesPerRequest` | 3 | Limits retries per individual Redis command |
| `retryStrategy` | Exponential backoff, max 3s, stops after 10 attempts | Prevents infinite reconnection loops |
| `lazyConnect` | true | Defers connection until explicitly called |
| `connectTimeout` | 10000ms (10s) | Maximum wait for initial connection |

---

## Appendix A: Related Models

### WaterLog Model

**Schema:** `src/server/prisma/schema.prisma`, line ~387
**DB table:** `water_logs`

```
model WaterLog {
  id            String   @id @default(cuid())
  userId        String
  glasses       Int      @default(0)
  targetGlasses Int      @default(8)
  logDate       DateTime @default(now())
  createdAt     DateTime @default(now())
  user          User     @relation(...)
  @@unique([userId, logDate])
}
```

- Used by `POST /api/v1/wellness/log` (type=water) at `wellness.routes.ts` line 101
- Upsert pattern: finds existing log for today, updates if exists, creates if not
- Glasses capped at 20: `Math.min(value, 20)`
- Default target is 8 glasses

### WellnessActivity Model

**Schema:** `src/server/prisma/schema.prisma`, line ~738
**DB table:** `wellness_activities`

```
model WellnessActivity {
  id              String       @id @default(cuid())
  title           String
  description     String?
  category        String       // meditation, yoga, stress_management, breathing
  durationMinutes Int
  difficulty      String       @default("beginner")
  cyclePhases     CyclePhase[]
  imageUrl        String?
  audioUrl        String?
  videoUrl        String?
  instructions    Json?
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
}
```

- Queried by `GET /api/v1/wellness` at `wellness.routes.ts` line 16
- Filterable by `category` and `phase` (uses `{ has: phase }` on the `cyclePhases` array)
- Separate from WellnessContent; these are structured activities with media (audio/video URLs)

---

## Appendix B: Daily Wellness Score

**Endpoint:** `GET /api/v1/wellness/daily-score`
**File:** `src/server/src/routes/wellness.routes.ts`, line 30

### Score Calculation

The composite score is a weighted average of three components, each scored 0-100:

| Component | Weight | Scoring Logic |
|-----------|--------|---------------|
| Mood | 40% | GREAT=100, GOOD=80, OKAY=60, LOW=40, BAD=20. Default 60 if no mood logged |
| Water | 30% | `min(100, (glasses / targetGlasses) * 100)` |
| Symptoms | 30% | `max(0, 100 - symptomCount * 15)` — each symptom deducts 15 points |

**Formula:** `composite = round(mood * 0.4 + water * 0.3 + symptoms * 0.3)`

### Sleep & Exercise Tracking

Sleep and exercise are stored as encoded symptom entries (no dedicated models):
- Sleep: `symptomLog.symptoms = ["sleep:7.5"]`
- Exercise: `symptomLog.symptoms = ["exercise:30"]`

These are parsed out of symptom logs and excluded from the symptom count.

### Wellness History Score (Different Weights)

**Endpoint:** `GET /api/v1/wellness/history`
**File:** `src/server/src/routes/wellness.routes.ts`, line 138

The history view uses a **different** scoring system (additive, not weighted average):

| Component | Points | Condition |
|-----------|--------|-----------|
| Water | 0-30 | `min(30, round((glasses / 8) * 30))` |
| Mood | 0 or 25 | 25 if any mood logged, 0 otherwise |
| Sleep | 0 or 25 | 25 if sleep hours > 0 |
| Exercise | 0 or 20 | 20 if exercise logged |
| **Total** | **0-100** | Sum of all components |

---

## File Reference

| File | Purpose |
|------|---------|
| `src/server/src/routes/wellness-content.routes.ts` | Public + admin REST routes for WellnessContent |
| `src/server/src/routes/wellness.routes.ts` | Water logging, daily score, wellness history, activity listing |
| `src/server/src/services/wellness-content.service.ts` | Service layer: cache/DB queries, admin CRUD, seed logic |
| `src/server/src/config/redis.ts` | Redis client + cache helper functions |
| `src/server/prisma/schema.prisma` | WellnessContent, WaterLog, WellnessActivity models |
| `src/client/src/pages/WellnessPage.tsx` | Main wellness hub with hardcoded fallback data |
| `src/client/src/pages/WellnessHistoryPage.tsx` | History visualization (bar charts, calendar grid) |
| `src/client/src/services/api.ts` | `wellnessAPI` and `wellnessContentAPI` client SDKs |
| `src/client/src/hooks/useWellness.ts` | React hook for activities, score, and logging |
| `src/server/src/app.ts` | Route mounting: `/api/v1/wellness` and `/api/v1/wellness-content` |
