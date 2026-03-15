# Document 7 -- Admin Panel

VedaClue women's health application -- Admin CMS and management console.

---

## 7.1 Admin Role -- Assignment and Enforcement

### Database Definition

The `Role` enum in the Prisma schema (`src/server/prisma/schema.prisma`, line 16) defines three values:

```
enum Role {
  USER
  DOCTOR
  ADMIN
}
```

A user's role is stored as the `role` column on the `User` model. There is no self-service UI for upgrading to ADMIN. The role must be set manually (database edit) or via the admin panel's user-management feature where an existing admin can change another user's role.

### Server-Side Enforcement (Two Layers)

**Layer 1 -- JWT Authentication Middleware**
File: `src/server/src/middleware/auth.ts`, line 11, function `authenticate`.

- Extracts `Bearer` token from `Authorization` header.
- Checks token blacklist in Redis (`blacklist:{token}`).
- Verifies JWT with `HS256` algorithm against `JWT_SECRET`.
- Looks up user in Redis cache (`user:{uid}:basic`) or falls back to Prisma query (selects `id`, `role`, `email`, `isActive`).
- Rejects deactivated accounts (HTTP 403 `Account deactivated`).
- Sets `req.user = { id, role, email }`.

**Layer 2 -- Role Guard Middleware**
File: `src/server/src/middleware/roles.middleware.ts`, line 4, function `requireAdmin`.

- Checks `req.user.role !== 'ADMIN'`; returns HTTP 403 `Admin access required` on failure.
- Applied globally to all admin routes at `src/server/src/routes/admin.routes.ts`, line 15:
  ```
  r.use(authenticate, requireAdmin);
  ```

Additional role guards in the same file:
| Function | Line | Allows |
|---|---|---|
| `requireAdmin` | 4 | `ADMIN` only |
| `requireDoctor` | 13 | `DOCTOR` or `ADMIN` |
| `requireSuperAdmin` | 22 | `ADMIN` only (identical to `requireAdmin`) |

### Client-Side Enforcement (Two Layers)

**Layer 1 -- Route Guard (`AdminRoute`)**
File: `src/client/src/App.tsx`, line 105.

```tsx
function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```

Applied at line 166: `<Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />`

**Layer 2 -- In-Page Guard**
File: `src/client/src/pages/AdminPage.tsx`, lines 5799-5804.

```tsx
if (!isAuthenticated || !user) return <Navigate to="/auth" replace />;
if (user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
```

### Admin PIN (Additional Security Layer)

Beyond JWT + role, the admin panel requires a server-verified PIN before unlocking.

- **Frontend**: `AdminPage.tsx`, line 4520 -- state `isUnlocked` persisted in `sessionStorage` key `sb_admin_unlocked`.
- **Unlock flow** (`handleUnlock`, line 5240): sends PIN to `POST /api/admin/verify-pin`, on success sets `isUnlocked = true` and stores `sb_admin_unlocked = '1'` in sessionStorage.
- **Server**: `admin.routes.ts`, line 18 -- compares submitted PIN against bcrypt hash stored in `ADMIN_PIN_HASH` environment variable using `bcrypt.compare()`.
- **Lock**: `handleLock` (line 5270) clears sessionStorage and navigates to `/profile`.
- The PIN login screen (lines 5273-5316) shows an input field, toggle password visibility, and an "Authenticate" button. It displays `passError` in a red box on failure.

---

## 7.2 All Admin Tabs

The tab navigation is defined at `AdminPage.tsx`, line 5726. The `TabId` type (line 253) and the `tabs` array together define **47 visible navigation tabs** plus several "virtual" tab IDs used for sub-views (add/edit forms).

### Navigation Tabs (in display order)

| Tab ID | Icon | Label | Purpose |
|---|---|---|---|
| `overview` | (chart) | Home | Dashboard summary: published products/articles/doctors counts |
| `users` | (people) | Users | User list with search, role filter, pagination; edit role, ban/activate |
| `leads` | (target) | Leads | Lead scoring board -- users who viewed paywall but did not convert |
| `insights` | (chart) | Insights | Business analytics: metrics, funnel analysis |
| `live_feed` | (satellite) | Live | Real-time activity feed |
| `churn_risk` | (alert) | Churn | Churn risk identification |
| `segments` | (puzzle) | Segments | User segmentation |
| `alerts` | (bell) | Alerts | System alerts |
| `forecast` | (crystal ball) | Forecast | Revenue/growth forecasting |
| `cohorts` | (calendar) | Cohorts | Cohort analysis |
| `exports` | (inbox) | Export | Data export tools |
| `journeys` | (rail) | Journeys | User journey mapping |
| `geo` | (globe) | Geo | Geographic analytics |
| `referrals` | (link) | Referrals | Referral program management |
| `streaks` | (fire) | Streaks | User engagement streaks |
| `campaigns` | (megaphone) | Campaigns | Push notification campaigns |
| `nps` | (star) | NPS | Net Promoter Score tracking |
| `ltv` | (dollar) | LTV | Lifetime value analysis |
| `ab_tests` | (flask) | A/B Tests | A/B test management |
| `email_campaigns` | (email) | Emails | Email campaign management with triggers |
| `badges` | (medal) | Badges | User badge/achievement management |
| `anomalies` | (lightning) | Anomalies | Anomaly detection |
| `health_score` | (green heart) | Health | Platform health score |
| `content_perf` | (page) | Content | Content performance analytics |
| `orders` | (cart) | Orders | Order management with status updates |
| `subscriptions` | (gem) | Subs | Subscription plan management |
| `products` | (package) | Products | Product CRUD with publish/unpublish |
| `articles` | (notepad) | Articles | Article CRUD with publish/unpublish |
| `doctors` | (doctor) | Doctors | Doctor CRUD with publish/promote |
| `appointments` | (calendar) | Appts | Appointment management with status transitions |
| `analytics` | (chart) | Stats | General analytics dashboard |
| `finance` | (bank) | Finance | Revenue dashboard, platform config, coupons (FinanceTab component) |
| `callbacks` | (phone) | Callbacks | User callback requests |
| `analytics_products` | (chart) | Prod Stats | Product-specific analytics |
| `analytics_doctors` | (stethoscope) | Doc Stats | Doctor-specific analytics |
| `prescriptions` | (pill) | Rx | Prescription records |
| `ayurveda` | (yin-yang) | Ayurveda | Dosha profiles, questions, analytics |
| `payouts` | (money bag) | Payouts | Doctor payout management |
| `wellness` | (yoga) | Wellness | Wellness activity CRUD |
| `programs` | (graduation) | Programs | Multi-week program CRUD with nested content |
| `sellers` | (shop) | Sellers | Seller onboarding and management |
| `community` | (speech) | Community | Community post/reply moderation |
| `wellness_content` | (herb) | Tips/Content | Wellness content CMS with type filters, seed button |
| `content` | (books) | Content | Content library |
| `audit_log` | (clipboard) | Audit Log | Payment ledger, filterable events, CSV export |
| `settings` | (gear) | Settings | Email whitelist, maintenance mode, registrations toggle |

### Virtual Tab IDs (sub-views, not in nav)

`add_product`, `add_article`, `add_doctor`, `edit_product`, `edit_article`, `edit_doctor`, `add_wellness`, `edit_wellness`, `program_content`, `add_program`, `edit_program`, `seller_detail`, `seller_payouts`, `add_seller`, `user_detail`, `edit_wellness_content`.

---

## 7.3 Tips/Content Tab (Wellness Content CMS)

**Tab ID**: `wellness_content`
**Display location**: `AdminPage.tsx`, line 8222.
**Backend routes**: `src/server/src/routes/wellness-content.routes.ts`.

### Content Type Filters

The tab displays filter buttons for these content types (line 8240):

`(All)`, `phase_tip`, `wellness_tip`, `phase_routine`, `phase_yoga`, `phase_tip_wisdom`, `challenge`, `affirmation`, `self_care_breath`, `journal_prompt`, `self_care`, `dosha_remedy`, `pregnancy_week`

Clicking a filter calls `fetchWellnessContent(1, type)` which hits `GET /wellness-content/admin?type={type}&page={page}&limit=50`.

### CRUD Operations

**Create** (line 8235 button, handler at line 4963):
- Required fields: `type`, `key`, `body` (validated client-side).
- Optional fields: `phase`, `goal`, `dosha`, `week`, `category`, `emoji`, `title`, `metadata` (must be valid JSON), `sortOrder`, `isActive`, `sourceReference`.
- API: `POST /wellness-content/admin` (wellness-content.routes.ts, line 73).
- Unique constraint on `type + key` (Prisma P2002 error returns `A content item with this type+key already exists`).
- Success toast: `'New entry created'` (line 3718) or `'Content created'` (line 4981).

**Read/List** (handler `fetchWellnessContent`, line 4954):
- API: `GET /wellness-content/admin?type=&page=&limit=50`.
- Paginated at 50 items per page (line 8277).
- Each item card displays: type badge, phase badge, goal badge, dosha badge, week badge, active/inactive status, emoji + title/key, truncated body (80 chars), source reference.

**Update** (line 8267 edit button, handler at line 4973):
- Populates `wcForm` from item data, navigates to `edit_wellness_content` tab.
- API: `PUT /wellness-content/admin/:id` (wellness-content.routes.ts, line 86).
- Success toast: `'Content updated & cache cleared'` (line 3733).

**Delete** (line 8269 delete button, handler `handleWcDelete` at line 4990):
- Shows red confirmation modal: title `'Delete Content?'`, message `This will permanently delete '{key}'. This cannot be undone.`
- API: `DELETE /wellness-content/admin/:id` (wellness-content.routes.ts, line 98).
- Success toast: `"'{key}' deleted successfully"` (line 4993).

**Toggle Active** (line 8266, handler `handleWcToggle` at line 4999):
- Shows confirmation modal (variant depends on current state).
- API: `PATCH /wellness-content/admin/:id/toggle` (wellness-content.routes.ts, line 108).
- Success toast: `"'{key}' paused"` or `"'{key}' is now active"` (line 5007).

### Seed Data Button

Visible only when `wcTotal === 0` (line 8226).

- Button label: `Seed Data`.
- Confirmation modal: title `'Seed Wellness Content?'`, message `'This will create ~391 default wellness content items.'`, confirmLabel `'Seed'`, variant `blue`.
- API: `POST /wellness-content/admin/seed` (wellness-content.routes.ts, line 120).
- Server calls `wcService.seedAll()`. If content already exists, returns `'Wellness content already exists, seed skipped'`.
- Success toast: server message or `'Seeded!'` (line 8230).
- Error toast: server error or `'Seed failed'` (line 8232).

### Cache Refresh

A separate "refresh cache" action (line 3766) calls the backend to clear all wellness content caches.
Success toast: `'All content caches refreshed'`.

---

## 7.4 Doctors Tab

**Tab ID**: `doctors`
**Interface**: `AdminDoctor` (`AdminPage.tsx`, line 103).
**Backend**: `admin.routes.ts`, lines 537-703.

### Doctor Data Model Fields

| Field | Type | Notes |
|---|---|---|
| `name` | string | Required (maps to `fullName` in DB) |
| `specialization` | string | Required |
| `experience` | number | Maps to `experienceYears` |
| `fee` | number | Maps to `consultationFee` |
| `qualification` | string | Comma-separated, maps to `qualifications[]` |
| `about` | string | Maps to `bio` |
| `tags` | string[] | Comma-separated in form |
| `languages` | string[] | Comma-separated in form, uppercased on server |
| `avatarUrl` | string | Optional image URL |
| `isChief` | boolean | Chief doctor flag |
| `isPromoted` | boolean | Featured/promoted badge |
| `hospitalName` | string | Optional |
| `location` | string | Optional |
| `commissionRate` | number | Optional, platform commission % |
| `email` | string | Optional, triggers User account creation on server |

### Add Doctor Flow

1. Admin clicks "+ Doctor" button (navigates to `add_doctor` tab).
2. Fills form defined by `emptyDoctor` (line 4568): name, specialization, experience, fee, qualification, about, tags, languages, avatarUrl, isChief, isPromoted, hospitalName, location, commissionRate.
3. Calls `handleAddDoctor` (line 5487).
4. Validation: `if (!nd.name)` -- only name is required on the client.
5. Server validation (`admin.routes.ts`, line 547): name AND specialization are both required.
6. Server creates `prisma.doctor.create()` with defaults: `isPublished: true`, `rating: 5.0`, `totalReviews: 0`, `isAvailable: true`, `isVerified: true`, `status: 'active'`, `approvedBy` and `approvedAt` set to current admin/time.
7. **User account linking** (line 566): if `email` is provided in the request body:
   - If a user with that email exists, their role is upgraded to `DOCTOR` and linked to the doctor record.
   - If no user exists, a new user is created with a random 16-char hex password, role `DOCTOR`, linked to the doctor.
   - Link failure is non-fatal (doctor is still created).
8. Success toast: `'Doctor added!'` (line 5502).
9. Navigates back to `doctors` tab.

### Publish / Unpublish

Handler: `handleToggleDoctorPublish` (line 5531).
- Shows confirmation modal:
  - Unpublish: title `'Hide Doctor?'`, message `"This will hide Dr. '{name}' from users."`, confirmLabel `'Hide'`, variant `yellow`.
  - Publish: title `'Show Doctor?'`, message `"Dr. '{name}' will be visible to users."`, confirmLabel `'Show'`, variant `green`.
- API: `POST /admin/doctors/:id/toggle-publish` (admin.routes.ts, line 633).
- Server toggles `isPublished`, sets `status` to `active` or `pending`, updates `publishedAt` and `approvedBy`/`approvedAt` accordingly.
- Success toast: `"Dr. '{name}' hidden"` or `"Dr. '{name}' is now visible"` (line 5544).

### Promote / Demote

Handler: `handleToggleDoctorPromote` (line 5551).
- Shows confirmation modal:
  - Remove promotion: title `'Remove Promotion?'`, message `"Remove featured badge from Dr. '{name}'?"`, confirmLabel `'Remove'`, variant `blue`.
  - Promote: title `'Promote Doctor?'`, message `"Promote Dr. '{name}' to featured?"`, confirmLabel `'Promote'`, variant `blue`.
- API: `POST /admin/doctors/:id/toggle-promote` (admin.routes.ts, line 683).
- Success toast: `"Dr. '{name}' promotion removed"` or `"Dr. '{name}' is now featured"` (line 5564).

### Delete Doctor

Handler: `handleDeleteDoctor` (line 5571).
- Shows red confirmation modal: title `'Delete Doctor?'`, message `"This will permanently delete Dr. '{name}'. This cannot be undone."`, confirmLabel `'Delete'`, variant `red`.
- API: `DELETE /admin/doctors/:id` (admin.routes.ts, line 692).
- Success toast: `"Dr. '{name}' deleted successfully"` (line 5578).

---

## 7.5 Confirmation Modal System

**Component**: `ConfirmModal` (`AdminPage.tsx`, line 186).
**State interface**: `ConfirmModalState` (line 178).

### Interface

```ts
interface ConfirmModalState {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'red' | 'yellow' | 'blue' | 'green';
  onConfirm: () => void | Promise<void>;
}
```

### Variant Styles

| Variant | Gradient (confirm button) | Background (icon circle) | Icon | Semantic Use |
|---|---|---|---|---|
| `red` | `from-red-500 to-rose-500` | `bg-red-50` | Warning sign | Destructive/delete actions |
| `yellow` | `from-amber-500 to-yellow-500` | `bg-amber-50` | Warning sign | Caution actions (unpublish, ban, maintenance ON) |
| `blue` | `from-blue-500 to-indigo-500` | `bg-blue-50` | Info circle | Neutral actions (promote, change role, seed data) |
| `green` | `from-emerald-500 to-green-500` | `bg-emerald-50` | Check mark | Positive actions (publish, activate, enable) |

### Usage Pattern

All admin actions that require confirmation use the `askConfirm` helper (line 4556):

```ts
const askConfirm = (title, message, confirmLabel, variant, onConfirm) => {
  setConfirmAction({ title, message, confirmLabel, variant, onConfirm });
};
```

### Keyboard Support

- **Escape key** dismisses the modal (lines 220-226, `useEffect` with `keydown` listener).
- **Backdrop click** dismisses the modal (line 229, `onClick={onClose}` on overlay div).
- Inner modal content stops propagation (`onClick={e => e.stopPropagation()}`, line 230).

### Loading State

- While `onConfirm` is executing, the confirm button shows `'Processing...'` and both buttons are disabled (`disabled={loading}`, lines 237, 241).
- `onClose()` is called in the `finally` block (line 216), so the modal always closes after the action completes or fails.

### All Confirmation Modal Invocations

| Action | Title | Variant | Location (line) |
|---|---|---|---|
| Delete coupon | `'Delete Coupon?'` | `red` | 327 |
| Delete community post | `'Delete Post?'` | `red` | 2683 |
| Delete community reply | `'Delete Reply?'` | `red` | 2697 |
| Deactivate subscription plan | `'Deactivate Plan?'` | `yellow` | 3302 |
| Delete promotion | `'Delete Promotion?'` | `red` | 3308 |
| Delete email campaign | `'Delete Campaign?'` | `red` | 4256 |
| Delete callback | `'Delete Callback?'` | `red` | 4823 |
| Update order status | varies | varies | 4877 |
| Delete payout | `'Delete Payout?'` | `red` | 4929 |
| Delete wellness content | `'Delete Content?'` | `red` | 4990 |
| Toggle wellness content | varies | varies | 4999 |
| Publish/unpublish product | `'Publish Product?'` / `'Unpublish Product?'` | `green` / `yellow` | 5383 |
| Delete product | `'Delete Product?'` | `red` | 5402 |
| Publish/unpublish article | similar | `green` / `yellow` | 5457 |
| Delete article | `'Delete Article?'` | `red` | 5476 |
| Show/hide doctor | `'Show Doctor?'` / `'Hide Doctor?'` | `green` / `yellow` | 5534 |
| Promote/demote doctor | `'Promote Doctor?'` / `'Remove Promotion?'` | `blue` | 5554 |
| Delete doctor | `'Delete Doctor?'` | `red` | 5573 |
| Change user role | `'Change User Role?'` | `blue` | 5637 |
| Ban/activate user | `'Ban User?'` / `'Activate User?'` | `red` / `green` | 5654 |
| Toggle maintenance mode | `'Enable Maintenance?'` / `'Disable Maintenance?'` | `yellow` / `green` | 5697 |
| Toggle registrations | `'Enable Registrations?'` / `'Disable Registrations?'` | `green` / `yellow` | 5712 |
| Delete program | `'Delete Program?'` | `red` | 7281 |
| Delete program content | `'Delete Content?'` | `red` | 7473 |
| Delete wellness activity | `'Delete Activity?'` | `red` | 7562 |
| Seed wellness content | `'Seed Wellness Content?'` | `blue` | 8227 |

---

## 7.6 Toast Notifications

**Library**: `react-hot-toast` (imported at `AdminPage.tsx`, line 80).
**Global config**: `src/client/src/main.tsx`, line 38.

```tsx
<Toaster position="top-center" toastOptions={{
  duration: 3000,
  style: { borderRadius: '12px', background: '#333', color: '#fff' },
}} />
```

- **Position**: top-center.
- **Auto-dismiss**: 3000 ms (3 seconds).
- **Style**: dark background (#333), white text, rounded corners (12px).

### All Toast Messages in AdminPage

#### Success Toasts (`toast.success`)

| Message | Context | Line |
|---|---|---|
| `'Welcome, Admin!'` | PIN verification success | 5250 |
| `'Config saved'` | Finance platform config saved | 295 |
| `'Coupon updated'` | Coupon edit saved | 314 |
| `'Coupon created'` | New coupon created | 317 |
| `'Coupon deleted successfully'` | Coupon deleted | 328 |
| `'Users exported!'` | User data CSV export | 1457 |
| `'{label} exported!'` | Generic export success | 1603 |
| `'Campaign created'` | Push campaign created | 2240 |
| `'Sent to {sentTo} users'` | Campaign sent | 2252 |
| `'Deleted'` | Campaign deleted | 2259 |
| `'CSV downloaded'` | Seller CSV export | 3033 |
| `'New entry created'` | Wellness content created | 3718 |
| `'Content updated & cache cleared'` | Wellness content updated | 3733 |
| `'Entry deleted'` | Wellness content deleted | 3746 |
| `'Status toggled'` | Wellness content toggled | 3758 |
| `'All content caches refreshed'` | Cache refresh | 3766 |
| `'Campaign created'` | Email campaign created | 4251 |
| `'Sent!'` | Email campaign sent | 4255 |
| `'Campaign deleted'` | Email campaign deleted | 4256 |
| `'Triggered: {trigger}'` | Email trigger fired | 4257 |
| `'Callback updated'` | Callback request updated | 4818 |
| `'Callback deleted successfully'` | Callback deleted | 4827 |
| `'Order status updated to {status}'` | Order status change | 4885 |
| `'Settlement generated!'` | Payout generated | 4912 |
| `'Payout marked as paid!'` | Payout marked paid | 4921 |
| `'Payout deleted successfully'` | Payout deleted | 4932 |
| `'Content updated'` | Wellness content updated | 4978 |
| `'Content created'` | Wellness content created | 4981 |
| `"'{key}' deleted successfully"` | Wellness content deleted | 4993 |
| `"'{key}' paused"` / `"'{key}' is now active"` | Wellness content toggled | 5007 |
| `'Activity updated!'` | Wellness activity updated | 5031 |
| `'Activity created!'` | Wellness activity created | 5034 |
| `'Program updated!'` | Program updated | 5089 |
| `'Program created!'` | Program created | 5092 |
| `'Content added!'` | Program content added | 5111 |
| `'Seller {status}'` | Seller status updated | 5158 |
| `'{message}' or 'Payout generated'` | Seller payout generated | 5166 |
| `'Seller created successfully'` | New seller created | 5185 |
| `'Document status updated'` | Seller document updated | 5199 |
| `'{type} CSV downloaded'` | Seller CSV export | 5215 |
| `'Product added as draft!'` | Product created | 5346 |
| `'Product updated!'` | Product updated | 5373 |
| `"'{name}' unpublished"` / `"'{name}' is now live"` | Product publish toggle | 5393 |
| `"'{name}' deleted successfully"` | Product deleted | 5407 |
| `'Article saved as draft!'` | Article created | 5425 |
| `'Article updated!'` | Article updated | 5447 |
| `"'{title}' unpublished"` / `"'{title}' is now published"` | Article publish toggle | 5467 |
| `"'{title}' deleted successfully"` | Article deleted | 5481 |
| `'Doctor added!'` | Doctor created | 5502 |
| `'Doctor updated!'` | Doctor updated | 5524 |
| `"Dr. '{name}' hidden"` / `"Dr. '{name}' is now visible"` | Doctor publish toggle | 5544 |
| `"Dr. '{name}' promotion removed"` / `"Dr. '{name}' is now featured"` | Doctor promote toggle | 5564 |
| `"Dr. '{name}' deleted successfully"` | Doctor deleted | 5578 |
| `'Role updated to {role}'` | User role changed | 5646 |
| `"'{fullName}' has been banned"` / `"'{fullName}' activated"` | User ban/activate | 5663 |
| `'Status updated'` | Appointment status changed | 5674 |
| `'Email added'` | Whitelist email added | 5685 |
| `'Email removed'` | Whitelist email removed | 5692 |
| `'Maintenance mode ON'` / `'Maintenance mode OFF'` | Maintenance toggle | 5705 |
| `'Registrations enabled'` / `'Registrations disabled'` | Registrations toggle | 5720 |
| `'Commission updated'` | Seller commission updated | 8016 |
| `'Marked as paid'` | Seller payout marked paid | 8127 |
| `'Put on hold'` | Seller payout put on hold | 8134 |
| `'{message}' or 'Seeded!'` | Wellness content seeded | 8230 |

#### Error Toasts (`toast.error`)

| Message | Context | Line |
|---|---|---|
| `'Session expired -- please log in again'` | Auth token expired | 4723 |
| `'Your session expired. Please log in again.'` | PIN verify auth failure | 5259 |
| `'Failed to load finance data'` | Finance fetch error | 286 |
| `'Failed to save'` | Finance config save error | 297 |
| `'{server message}' or 'Failed'` | Coupon save error | 323 |
| `'Failed to delete coupon'` | Coupon delete error | 329 |
| `'Export failed'` | Various export errors | 1458, 1604 |
| `'Failed to create'` | Campaign create error | 2244 |
| `'Failed to send'` | Campaign send error | 2254 |
| `'Name and price required'` | Product validation | 5327 |
| `'Title and content required'` | Article validation | 5414 |
| `'Name required'` | Doctor validation | 5488 |
| `'Title is required'` | Wellness/program validation | 5020, 5073 |
| `'Title and body required'` | Campaign validation | 2237 |
| `'Type, key, and body are required'` | Wellness content validation | 4963 |
| `'Metadata must be valid JSON'` | Wellness content JSON validation | 4967 |
| `'Enter a valid email'` | Whitelist email validation | 5680 |
| `'User ID and Business Name are required'` | Seller validation | 5179 |
| `'Failed to load dashboard'` | Dashboard error | 4743 |
| `'Failed to load users'` | Users fetch error | 4763 |
| `'Failed to load appointments'` | Appointments error | 4782 |
| `'Failed to load analytics'` | Analytics error | 4795 |
| `'Failed to load callbacks'` | Callbacks error | 4808 |
| `'Failed to update callback'` | Callback update error | 4819 |
| `'Failed to delete callback'` | Callback delete error | 4828 |
| `'Failed to load product analytics'` | Product analytics error | 4838 |
| `'Doctor analytics: {msg}'` | Doctor analytics error | 4850 |
| `'Failed to load prescriptions'` | Prescriptions error | 4861 |
| `'Failed to load orders'` | Orders error | 4872 |
| `'Failed to update order status'` | Order status error | 4887 |
| `'Failed to load payout summary'` | Payout summary error | 4899 |
| `'Failed to load payouts'` | Payout list error | 4907 |
| `'Failed to generate settlement'` | Payout generate error | 4916 |
| `'Failed to update payout'` | Payout update error | 4926 |
| `'Failed to delete payout'` | Payout delete error | 4935 |
| `'Failed to load wellness activities'` | Wellness error | 4946 |
| `'Failed to load wellness content'` | Wellness content error | 4959 |
| `'Save failed'` / `'{message}'` | Wellness/program save error | 4987, 5039, 5097, 5114 |
| `'Failed to load programs'` | Programs error | 5050 |
| `'Failed to load content'` | Program content error | 5058 |
| `'Failed to load sellers'` | Sellers error | 5128 |
| `'Failed to load seller details'` | Seller detail error | 5141 |
| `'Failed to add product'` | Product create error | 5349 |
| `'Failed to update product'` | Product update error | 5376 |
| `'Failed to toggle product'` | Product toggle error | 5394 |
| `'Failed to delete product'` | Product delete error | 5408 |
| `'Failed to add article'` | Article create error | 5428 |
| `'Failed to update article'` | Article update error | 5450 |
| `'Failed to toggle article'` | Article toggle error | 5468 |
| `'Failed to delete article'` | Article delete error | 5482 |
| `'Failed to add doctor'` | Doctor create error | 5505 |
| `'Failed to update doctor'` | Doctor update error | 5527 |
| `'Failed to toggle doctor'` | Doctor toggle error | 5545 |
| `'Failed to toggle promotion'` | Doctor promote error | 5565 |
| `'Failed to delete doctor'` | Doctor delete error | 5579 |
| `'Failed to update role'` | User role error | 5647 |
| `'Failed to update user'` | User ban/activate error | 5664 |
| `'Seed failed'` | Wellness content seed error | 8232 |

---

## Key File Paths

| File | Role |
|---|---|
| `src/client/src/pages/AdminPage.tsx` | Main admin SPA (~8300 lines, all tabs in one file) |
| `src/client/src/App.tsx` (line 105) | `AdminRoute` guard component |
| `src/client/src/main.tsx` (line 38) | Toaster global config |
| `src/server/src/routes/admin.routes.ts` | All admin API routes (CRUD for products, articles, doctors, users, appointments, payouts, wellness, programs, sellers, callbacks, orders, dosha, upload) |
| `src/server/src/routes/wellness-content.routes.ts` | Wellness content CRUD + seed route |
| `src/server/src/middleware/auth.ts` | JWT authentication middleware |
| `src/server/src/middleware/roles.middleware.ts` | `requireAdmin`, `requireDoctor`, `requireSuperAdmin` guards |
| `src/server/prisma/schema.prisma` (line 16) | `Role` enum definition |
