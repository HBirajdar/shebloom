# Document 3 -- Cycle Tracking & Predictions

**Application:** VedaClue Women's Health App
**Primary source file:** `src/server/src/services/cycle.service.ts`
**Last reviewed:** 2026-03-15

---

## 3.1 Period Logging (`logPeriod`)

### Route

`POST /api/cycles/log` -- defined in `src/server/src/routes/cycle.routes.ts` (line 20).
Requires authentication (`authenticate` middleware). No subscription required (FREE tier).

### Input Validation (Route-Level)

Performed inline in `cycle.routes.ts` lines 22-27 before calling the service:

| Field       | Rule                                                        |
|-------------|-------------------------------------------------------------|
| `startDate` | Required. Must parse to a valid `Date`.                     |
| `endDate`   | Optional. If present, must parse to a valid `Date`.         |
| `flow`      | Optional. Must be one of: `heavy`, `medium`, `light`, `spotting`. |
| `painLevel` | Optional. Integer 0-10.                                     |

Additional fields accepted by the service (line 682): `notes` (string), `mood` (string[]), `symptoms` (string[]).

### Zod Schema (Unused at Route Level)

File `src/server/src/validators/cycle.validators.ts` defines a `logPeriodSchema` via Zod:

```
z.object({
  startDate: z.string(),
  endDate: z.string().optional(),
  notes: z.string().max(500).optional(),
  flow: z.string().optional(),
  painLevel: z.number().int().min(0).max(10).optional(),
  mood: z.array(z.string()).optional(),
  symptoms: z.array(z.string()).optional(),
})
```

> **WARNING:** This Zod schema is defined but is NOT applied as middleware on the route. Validation is done with inline `if` checks in the route handler. The Zod schema and the route-level checks are consistent but the Zod schema is effectively dead code.

### Duplicate Detection

Service `logPeriod` (line 684-687): queries for an existing cycle with the **exact same `startDate`** for the same user. If found, throws `"A period is already logged for this date"`.

Matching is by exact `DateTime` equality on `startDate`, not date-only.

### endDate Capping

Line 692-696: if `endDate` is provided, it is capped to `startDate + 15 days`. If the supplied `endDate` exceeds that maximum, it is silently set to the cap date. This prevents unreasonably long period entries.

### Auto-Computation of `periodLength`

Lines 698-703:

```
periodLength = floor((endDate - startDate) / 86400000) + 1
```

The `+1` makes the calculation **inclusive** (start and end dates both count as period days). If the computed value is `< 1` or `> 15`, `periodLength` is set to `undefined` (not stored).

### Auto-Computation of `cycleLength`

Lines 706-714: the service finds the most recent **previous** cycle for the user (ordered by `startDate desc`, with `startDate < currentStartDate`). If found:

```
cycleLength = floor((currentStartDate - previousStartDate) / 86400000)
```

Only stored if the value is between **18 and 50 days** inclusive. Values outside this range are discarded (set to `undefined`), preventing bad data from skewing predictions.

### Database Record Created

Line 716-729: a `Cycle` record is created via Prisma with fields:

| DB Column      | Source                                    |
|----------------|-------------------------------------------|
| `userId`       | From authenticated user                   |
| `startDate`    | Parsed to `Date`                          |
| `endDate`      | Parsed to `Date`, capped at +15 days      |
| `cycleLength`  | Auto-computed or `undefined`              |
| `periodLength` | Auto-computed or `undefined`              |
| `notes`        | Passed through                            |
| `flow`         | Passed through                            |
| `painLevel`    | Cast to `Number` if not null              |
| `mood`         | Array of strings, defaults to `[]`        |
| `symptoms`     | Array of strings, defaults to `[]`        |

### Cache Invalidation

Lines 730-733: four Redis keys are deleted after logging:
- `cycles:{userId}`
- `predictions:{userId}`
- `fertility:{userId}`
- `insights:{userId}`

### Cycle Model (Prisma Schema)

Defined in `src/server/prisma/schema.prisma` line 275, mapped to table `cycles`:

```
model Cycle {
  id            String    @id @default(cuid())
  userId        String
  startDate     DateTime
  endDate       DateTime?
  cycleLength   Int?
  periodLength  Int?
  ovulationDate DateTime?
  fertileStart  DateTime?
  fertileEnd    DateTime?
  flow          String?       // light, medium, heavy, spotting
  painLevel     Int?          // 0-10
  mood          String[]      // array of mood tags
  symptoms      String[]      // array of symptom tags
  isPredicted   Boolean   @default(false)
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@index([userId, startDate])
  @@map("cycles")
}
```

> Note: `ovulationDate`, `fertileStart`, `fertileEnd`, and `isPredicted` exist on the model but are **not populated by `logPeriod`**. They appear to be legacy or reserved for future use.

---

## 3.2 Prediction Algorithm (`getPredictions`)

Defined in `CycleService.getPredictions` starting at line 783. Results are cached in Redis for **30 minutes** (line 1061).

### Step 1: Gather Data (lines 788-797)

- Fetches the user's `UserProfile` (for fallback `cycleLength` and `periodLength`).
- Fetches up to **24 cycles** ordered by `startDate ASC`.
- If zero cycles exist, returns `{ message: 'Not enough data for prediction' }`.
- Falls back to `profile.cycleLength || 28` and `profile.periodLength || 5` if profile exists; otherwise uses hardcoded defaults (28, 5).

### Step 2: Compute Cycle Lengths (lines 802-809)

Iterates consecutive cycle pairs (ascending order) and computes:

```
diff = floor((cycle[i+1].startDate - cycle[i].startDate) / 86400000)
```

Only includes values where `18 <= diff <= 50`. This filters out data entry errors and very short/long outliers (ACOG normal range is 21-35, but a wider band is accepted).

### Step 3: Weighted Moving Average (lines 811-824)

Uses the last **12 valid cycle lengths** (most recent). Applies **exponential weights** with **decay factor 0.75**:

```
exponentialWeights(n, decay=0.75):
  w[i] = 0.75^i   for i = 0..n-1
```

Weights are then **reversed** so that the most recent cycle length (last in array) gets weight `0.75^0 = 1.0`, the second-most-recent gets `0.75^1 = 0.75`, the third gets `0.75^2 = 0.5625`, and so on.

Weighted mean formula (lines 114-121):

```
avgCycleLength = round( sum(length[i] * weight[i]) / sum(weight[i]) )
```

Standard deviation is computed using sample variance (`n-1` denominator, line 111).

If only 1 cycle length is available, it is used directly. If zero, falls back to `profile.cycleLength || 28`.

### Step 4: Luteal Phase Estimation (lines 826-833)

Calls `estimateLutealPhase()` (line 204). This function:

1. For each cycle, checks if `ovulationDate` is stored or can be detected from BBT thermal shift data.
2. If ovulation is found, computes luteal length = days from ovulation to next cycle's `startDate`.
3. Only accepts values in range **7-19 days** (Lenton 1984).
4. If 2+ valid luteal lengths found: returns `round(mean(lutealLengths))`.
5. If exactly 1 found: returns that value.
6. **Default fallback: 13 days** (population median per Lenton 1984 -- NOT the commonly assumed 14 days).

### Step 5: Current Cycle Position (lines 835-856)

`periodLength` is auto-calculated from the average of all cycles that have an `endDate`, filtered to 1-15 days. Falls back to `profile.periodLength || 5`.

**Cycle day calculation** (lines 847-850):
```
todayMidnight = Date.UTC(year, month, date)   // midnight UTC
startMidnight = Date.UTC(startYear, startMonth, startDate)
cycleDay = floor((todayMidnight - startMidnight) / 86400000) + 1
```

Day 1 = first day of the last logged period. Both dates are normalized to midnight UTC to prevent timezone-related off-by-one errors.

**Ovulation day** (line 854):
```
ovulationDay = max(1, avgCycleLength - lutealPhase)
```

Clamped to minimum day 1.

**Ovulation date** (line 855):
```
ovulationDate = lastStart + ovulationDay * 86400000
```

**Next period date** (line 856):
```
nextPeriod = lastStart + avgCycleLength * 86400000
```

### Step 6: Fertile Window (lines 858-861)

Based on Wilcox et al. (1995) -- sperm survival up to 5 days, egg viability ~12-24h:

```
fertileStart = ovulationDate - 5 days
fertileEnd   = ovulationDate + 1 day
```

Total fertile window: **7 days** (5 days before ovulation through 1 day after).

### Step 7: Confidence Intervals (lines 863-868)

Uses the standard deviation of cycle lengths to create a +/-1 SD window (covers ~68% of expected values):

```
periodWindowEarly = nextPeriod - cycleSD days
periodWindowLate  = nextPeriod + cycleSD days
ovulationWindowEarly = ovulationDate - cycleSD days
ovulationWindowLate  = ovulationDate + cycleSD days
```

### Step 8: Confidence Score (lines 921-928, function at lines 133-166)

`computeConfidence()` produces a score from 0-100 with the following point allocation:

| Factor                       | Points | Criteria                                                  |
|------------------------------|--------|-----------------------------------------------------------|
| **Cycle history** (max 40)   | 40     | 6+ cycles tracked                                        |
|                              | 25     | 3-5 cycles tracked                                       |
|                              | 15     | 2 cycles tracked                                         |
|                              | 5      | 0-1 cycles tracked                                       |
| **Regularity** (max 25)      | 25     | SD < 2 days (very regular)                               |
|                              | 18     | SD 2-3.99 days (moderately regular)                      |
|                              | 10     | SD 4-6.99 days (somewhat irregular)                      |
|                              | 3      | SD >= 7 days (irregular)                                 |
| **BBT tracking** (max 15)    | 15     | Any BBT log data exists                                  |
| **Cervical mucus** (max 12)  | 12     | CM data logged for today                                 |
| **LH testing** (max 8)       | 8      | LH test result exists for today                          |

**Maximum possible score:** 100 (40+25+15+12+8).

Level thresholds:
- `very_high`: score >= 70
- `high`: score >= 50
- `medium`: score >= 30
- `low`: score < 30

The score is clamped to `min(100, score)`.

### Step 9: BBT Override (lines 930-950)

If a thermal shift is detected in current-cycle BBT data (using the 3-over-6 rule at lines 170-198):
- `confirmedOvulation` is set to `true`.
- `adjustedOvulationDate` replaces the statistical estimate.
- `nextPeriodDate` is recalculated as `confirmedOvulationDate + lutealPhase days`.

**Thermal shift detection** ("3-over-6 rule", lines 182-197):
1. Requires at least 6 temperature readings.
2. Slides a window: baseline = the 6 temps before index `i`, next3 = the 3 temps at/after index `i`.
3. All 3 must be above the max of the baseline (coverline).
4. At least 1 of the 3 must be >= coverline + 0.2 deg C.
5. Ovulation date = the **last low-temp day** (index `i-1`).

### Step 10: Regularity Score (lines 952-956)

```
regularityScore = round(max(0, 100 - (cycleSD / mean(cycleLengths)) * 200))
```

This is essentially `100 - 2 * coefficient_of_variation * 100`. Lower variability yields a higher score. If fewer than 2 cycle lengths are available, defaults to **50**.

### Step 11: Conception Probability (lines 888-913)

Base probability comes from the Wilcox et al. (1995) day-specific rates:

| Day relative to ovulation | Probability |
|---------------------------|-------------|
| -5                        | 0.10        |
| -4                        | 0.16        |
| -3                        | 0.14        |
| -2                        | 0.27        |
| -1                        | 0.31        |
| 0 (ovulation day)         | 0.33        |
| +1                        | 0.00        |

If **cervical mucus** data exists for today (line 897-901):
```
fertilityScore = fertilityScore * 0.5 + cmScore * 100 * 0.5
```

CM scores: `dry=0.05, sticky=0.15, creamy=0.35, watery=0.70, eggWhite=0.95, spotting=0.10`.

If **LH test** data exists for today (lines 903-907):
```
fertilityScore = fertilityScore * 0.6 + lhScore * 100 * 0.4
```

LH scores: `negative=0.10, faint=0.40, positive=0.85, peak=0.95`.

Fertility status labels (lines 916-919):
- `peak`: score >= 80
- `high`: score >= 50
- `moderate`: score >= 25
- `low`: score < 25

### Cycle Abnormality Alerts (lines 1005-1045)

The prediction response includes alert objects with types:

| Alert               | Trigger                         | Severity |
|---------------------|---------------------------------|----------|
| `amenorrhea`        | > 90 days since last period     | `urgent` |
| `oligomenorrhea`    | Average cycle > 35d (2+ cycles) | `warning`|
| `polymenorrhea`     | Average cycle < 21d (2+ cycles) | `warning`|
| `cycle_change`      | Latest cycle differs > 7d from previous average (3+ cycles) | `info` |
| `irregular`         | SD > 7 days (3+ cycles)         | `warning`|

---

## 3.3 Phase Detection

### How Current Phase Is Calculated (lines 870-877)

Phase determination uses `cycleDay` (day within the current cycle, 1-indexed) and two computed boundaries:

```
follicularEnd = max(periodLength + 1, ovulationDay - 3)
```

Phase assignment (evaluated in order):

| Phase          | Condition                               |
|----------------|-----------------------------------------|
| **Menstrual**  | `cycleDay <= periodLength`              |
| **Follicular** | `cycleDay <= follicularEnd`             |
| **Ovulation**  | `cycleDay <= ovulationDay + 2`          |
| **Luteal**     | Everything else (default)               |

### Phase Boundaries Example (28-day cycle, periodLength=5, lutealPhase=13)

- `ovulationDay = 28 - 13 = 15`
- `follicularEnd = max(5+1, 15-3) = max(6, 12) = 12`

| Phase       | Days        |
|-------------|-------------|
| Menstrual   | 1-5         |
| Follicular  | 6-12        |
| Ovulation   | 13-17       |
| Luteal      | 18-28       |

### Edge Cases

- **`follicularEnd` guard**: `max(periodLength + 1, ovulationDay - 3)` ensures that the follicular phase always gets at least 1 day after the menstrual phase ends. If `ovulationDay - 3` is less than `periodLength + 1`, the follicular phase shrinks but never disappears.
- **Short cycles (e.g., 21 days)**: ovulationDay could be as low as 8 (if lutealPhase=13), giving follicularEnd = max(6, 5) = 6 and a 1-day follicular phase.
- **Cycle day exceeds avgCycleLength**: the phase defaults to `luteal`. The `daysUntilPeriod` field can go negative, signaling the period is late.
- **Ovulation phase always spans 3+ days**: from `follicularEnd + 1` through `ovulationDay + 2`.

---

## 3.4 Past Period Import (Onboarding)

### UI Flow

Defined in `src/client/src/pages/ProfileSetupPage.tsx`.

Onboarding step 2 (for non-pregnancy goals) allows the user to enter up to **3 past periods**. Each entry has a `startDate` and optional `endDate`.

### Validation (`validatePastPeriods`, lines 66-141)

| Rule                           | Error message                        |
|--------------------------------|--------------------------------------|
| `startDate` is required        | "Start date is required"             |
| `startDate` > today            | "Date cannot be in the future"       |
| `startDate` < 12 months ago    | "Must be within last 12 months"      |
| `endDate` > today              | "Date cannot be in the future"       |
| `endDate` <= `startDate`       | "Must be after start date"           |
| Overlapping date ranges        | "Overlaps with another period"       |
| Duplicate `startDate` values   | "Duplicate start date"               |

Overlap detection (lines 108-125): for periods without an `endDate`, assumes a 5-day span (`aEnd = aStart + 5 * 86400000`).

### Saving (`savePastPeriods`, lines 143-167)

1. Filters out empty entries (no `startDate`).
2. **Sorts oldest-first** (`a.startDate.localeCompare(b.startDate)`) -- this is critical because `logPeriod` auto-computes `cycleLength` from the previous cycle. Oldest-first ordering ensures the second period can compute its `cycleLength` from the first, and the third from the second.
3. Calls `cycleAPI.log()` sequentially for each period with:
   - `startDate`: ISO string
   - `endDate`: if user provided one, uses it; otherwise auto-generates `startDate + (periodSetting - 1) days`
   - `flow`: hardcoded to `'medium'`
4. Errors are caught silently per-period (non-blocking).
5. Shows a toast: `"{n} period(s) imported!"` or error message.

### How This Activates Predictions

With 3 past periods imported (oldest-first):
- Period 1: no `cycleLength` (no previous cycle).
- Period 2: `cycleLength` = days between period 1 and period 2.
- Period 3: `cycleLength` = days between period 2 and period 3.

This gives 2 computed cycle lengths, which is enough for the weighted moving average in `getPredictions` (line 815: `if (cycleLengths.length >= 2)`). With only 1 cycle length, the single value is used directly. With zero, it falls back to the profile default.

### Skip Option

Users can skip past period import entirely (line 186-188: `handleSkipPeriods` simply advances the step). Predictions will still work but with lower confidence and profile-default values.

---

## 3.5 Calendar Data

### Calendar Marker Computation (TrackerPage)

Defined in `src/client/src/pages/TrackerPage.tsx`, `calendarMarkers` useMemo starting at line 290.

Markers are stored as `Record<string, string[]>` where the key is a date string (`YYYY-MM-DD`, local timezone) and the value is an array of marker types.

### Marking Logged Period Days (lines 303-318)

For each cycle in the user's cycle list:

1. Gets `start = startOfDay(cycle.startDate)`.
2. Computes `maxDays = min(cycle.periodLength || 5, 10)` -- **hard cap of 10 days** on the calendar.
3. Computes `endFromLength = start + (maxDays - 1) days`.
4. If `cycle.endDate` exists and is <= `endFromLength`, uses it; otherwise falls back to `endFromLength`.
5. Iterates from `start` through `end`, marking each day with type `'period'`.

> Note: The 15-day cap from `logPeriod` (server-side) and the 10-day display cap (client-side) are independent. The server allows up to 15 days stored; the calendar only displays up to 10. The `getCycles` method (line 659) also sanitizes returned data, capping `endDate` to `min(periodLength || 5, 10)` days.

### Marking Predicted Period Days (lines 332-343)

If `prediction.daysUntilPeriod` is available:
```
nextPeriodStart = today + daysUntilPeriod
```
Marks `periodLength` days starting from `nextPeriodStart` with type `'predicted'`.

Also marks **PMS days**: 3-5 days before the predicted next period start, but only if those days are in the future.

### Marking Fertile Window and Ovulation (lines 345-369)

Only rendered if `showFertility` is true (fertility goal users):

- If `fertileStart` and `fertileEnd` are provided by the prediction API, marks every day in that range with `'fertile'`.
- **Fallback**: if no fertile window data but `cycleDay` is known, calculates `ovDay = cycleLength - 14` and marks +/-2 days around it as `'fertile'`, plus the ovulation day itself as `'ovulation'`.
- If `prediction.ovulationDate` exists, marks that day as `'ovulation'`.

### Visual Rendering (lines 920-949)

| Marker Type  | Background Style                                   | Text Color   |
|--------------|-----------------------------------------------------|--------------|
| `period`     | Solid fill (`PHASE_COLORS.menstrual`)               | White        |
| `ovulation`  | Solid fill (`PHASE_COLORS.ovulation`)               | White        |
| `fertile`    | `bg-teal-50` with teal border                       | Gray (default)|
| `predicted`  | `bg-rose-50` with dashed rose border                | `text-rose-400` |

Today's date gets `ring-2 ring-rose-400 ring-offset-2`.

---

## 3.6 Error Handling

### Missing UserProfile

- `getPredictions` (line 788-797): if `profile` is null, constructs a `safeProfile` fallback with `{ cycleLength: 28, periodLength: 5, dateOfBirth: null }`. Predictions proceed with default values.
- This means predictions **always work** even without a profile, just with lower accuracy.

### No Cycle History

- `getPredictions` (line 795): if `allCycles.length === 0`, returns `{ message: 'Not enough data for prediction' }` immediately. No further computation is attempted.

### Single Cycle

- With only 1 cycle logged, `cycleLengths` will be empty (need 2 cycles for a diff). Falls back to `profile.cycleLength || 28`.
- Confidence score will be low (5 points for "limited cycle history").
- All predictions still function but with profile defaults.

### Invalid Dates

- **Route level** (lines 23-26): `startDate` is required; both `startDate` and `endDate` are checked with `isNaN(new Date(x).getTime())`. Returns 400 with descriptive error.
- **Duplicate startDate** (service line 687): throws `"A period is already logged for this date"` -- caught by route error handler, returns as error response.

### Out-of-Range Computed Values

- `cycleLength`: only stored if 18-50 days (line 713).
- `periodLength`: only stored if 1-15 days (line 702).
- `lutealPhase`: only accepted if 7-19 days (line 225); defaults to 13.
- `ovulationDay`: clamped to minimum 1 via `Math.max(1, ...)` (line 854).

### Update/Delete Guards

- `updatePeriod` (line 738-739): verifies the cycle belongs to the user. Throws `"Period entry not found"` if not.
- `updatePeriod` (lines 742-747): if `startDate` is changing, checks for duplicates on the new date.
- `deletePeriod` (line 769-770): same ownership check before deletion.

### Stale Data Sanitization

- `getCycles` (lines 670-677): when returning cycle history, caps `endDate` to `startDate + min(periodLength || 5, 10)` days. This guards against bad data imported before the endDate cap fix was added.

---

## Appendix: Key Function Reference

| Function                  | File                          | Line | Purpose                                              |
|---------------------------|-------------------------------|------|------------------------------------------------------|
| `CycleService.logPeriod`  | `cycle.service.ts`            | 682  | Creates a cycle record with auto-computed fields     |
| `CycleService.getPredictions` | `cycle.service.ts`        | 783  | Full prediction engine (14 steps)                    |
| `CycleService.updatePeriod` | `cycle.service.ts`          | 737  | Updates existing cycle with duplicate check           |
| `CycleService.deletePeriod` | `cycle.service.ts`          | 768  | Deletes a cycle with ownership verification           |
| `CycleService.getCycles`  | `cycle.service.ts`            | 659  | Retrieves cycles with endDate sanitization            |
| `CycleService.logSymptoms`| `cycle.service.ts`            | 1575 | Creates a SymptomLog record                           |
| `exponentialWeights`       | `cycle.service.ts`            | 125  | Generates decay-based weights for WMA                |
| `weightedMean`             | `cycle.service.ts`            | 114  | Computes weighted average                             |
| `computeConfidence`        | `cycle.service.ts`            | 133  | Calculates 0-100 confidence score                    |
| `estimateLutealPhase`      | `cycle.service.ts`            | 204  | Computes individual luteal phase from BBT/history    |
| `detectThermalShift`       | `cycle.service.ts`            | 170  | 3-over-6 BBT thermal shift detection                 |
| `getHormoneEstimates`      | `cycle.service.ts`            | 1604 | Estimates relative hormone levels by cycle day        |
| `savePastPeriods`          | `ProfileSetupPage.tsx`        | 143  | Onboarding: saves up to 3 past periods oldest-first  |
| `validatePastPeriods`      | `ProfileSetupPage.tsx`        | 66   | Onboarding: validates date ranges and overlaps        |
| `calendarMarkers` (memo)   | `TrackerPage.tsx`             | 290  | Computes calendar day markers from cycles+predictions |
