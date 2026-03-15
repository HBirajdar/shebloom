# Document 8 -- Database Schema

## Datasource & Generator

- **Provider:** PostgreSQL
- **ORM:** Prisma Client JS
- **Connection:** `DATABASE_URL` environment variable

---

## Enums

| Enum | Values |
|------|--------|
| Role | USER, DOCTOR, ADMIN |
| AuthProvider | EMAIL, PHONE, GOOGLE, APPLE |
| CyclePhase | MENSTRUAL, FOLLICULAR, OVULATION, LUTEAL |
| MoodLevel | GREAT, GOOD, OKAY, LOW, BAD |
| AppointmentStatus | PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, REJECTED, NO_SHOW, CANCELLED |
| ArticleStatus | DRAFT, REVIEW, PUBLISHED, ARCHIVED |
| Language | ENGLISH, HINDI, TAMIL, KANNADA, TELUGU, MARATHI, BENGALI, GUJARATI |
| DoshaType | VATA, PITTA, KAPHA, VATA_PITTA, PITTA_KAPHA, VATA_KAPHA, TRIDOSHIC |
| AssessmentType | SELF_QUICK, SELF_FULL, DOCTOR_CLINICAL, ADMIN_OVERRIDE |
| PayoutStatus | PENDING, PROCESSING, PAID, FAILED, ON_HOLD |
| DiscountType | PERCENTAGE, FLAT |
| CouponScope | ALL, CONSULTATION, PRODUCTS, SUBSCRIPTION |
| SubscriptionInterval | MONTHLY, YEARLY, LIFETIME |
| SubscriptionStatus | TRIAL, ACTIVE, PAST_DUE, CANCELLED, EXPIRED, PAUSED |
| SubscriptionEventType | CREATED, TRIAL_STARTED, TRIAL_ENDED, ACTIVATED, RENEWED, PAYMENT_FAILED, GRACE_STARTED, CANCELLED, EXPIRED, UPGRADED, DOWNGRADED, REFUNDED, ADMIN_EXTENDED, ADMIN_CANCELLED, PROMO_APPLIED, COUPON_APPLIED |
| PromotionType | WELCOME_BONUS, FLASH_SALE, SEASONAL, REFERRAL |
| SellerStatus | PENDING, APPROVED, SUSPENDED, REJECTED, DEACTIVATED |
| DocumentStatus | NOT_SUBMITTED, UNDER_REVIEW, VERIFIED, EXPIRED, REJECTED |

---

## Models -- Users & Profiles

### User
Purpose: Core user account for all roles (patient, doctor, admin)
DB table: `users`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| email | String | No | -- | Unique email |
| phone | String | No | -- | Unique phone |
| passwordHash | String | No | -- | Hashed password |
| fullName | String | Yes | -- | Display name |
| avatarUrl | String | No | -- | Profile picture |
| photoUrl | String | No | -- | Alternate photo |
| dateOfBirth | DateTime | No | -- | DOB |
| role | Role | Yes | USER | User role |
| authProvider | AuthProvider | Yes | EMAIL | Auth method |
| isVerified | Boolean | Yes | false | Email/phone verified |
| isActive | Boolean | Yes | true | Account active |
| language | Language | Yes | ENGLISH | Preferred language |
| timezone | String | Yes | "Asia/Kolkata" | User timezone |
| fcmToken | String | No | -- | Firebase push token |
| lastLoginAt | DateTime | No | -- | Last login timestamp |
| createdAt | DateTime | Yes | now() | Created timestamp |
| updatedAt | DateTime | Yes | auto | Updated timestamp |

- Relations: profile, cycles, moodLogs, symptomLogs, bbtLogs, cervicalMucusLogs, fertilityDailyLogs, pregnancies, appointments, articleBookmarks, articleLikes, articleComments, waterLogs, notifications, refreshTokens, prescriptions, orders, doctorProfile, doctorReviews, productReviews, wishlistItems, programEnrollments, seller, communityPosts, communityReplies, communityLikes, communityReports, subscriptions, events, npsSurveys, referralsSent, referralsReceived, badges, notificationPrefs
- Indexes: `[role]`, `[createdAt]`

### UserProfile
Purpose: Extended health/wellness profile per user
DB table: `user_profiles`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes (unique) | -- | FK to User |
| cycleLength | Int | Yes | 28 | Average cycle length (days) |
| periodLength | Int | Yes | 5 | Average period length (days) |
| lastPeriodDate | DateTime | No | -- | Last period start |
| primaryGoal | String | No | -- | track_periods, pregnancy, wellness, fertility |
| interests | String[] | Yes | -- | Interest tags |
| height | Float | No | -- | Height in cm |
| weight | Float | No | -- | Weight in kg |
| bloodGroup | String | No | -- | Blood group |
| medicalConditions | String[] | Yes | -- | Known conditions |
| allergies | String[] | Yes | -- | Known allergies |
| isPregnant | Boolean | Yes | false | Currently pregnant |
| pregnancyWeek | Int | No | -- | Current pregnancy week |
| contraceptiveMethod | String | No | -- | Contraceptive method |
| dosha | String | No | -- | Ayurvedic constitution (legacy) |
| doshaType | DoshaType | No | -- | Structured dosha (supports dual) |
| vataScore | Float | No | -- | 0-100 from assessment |
| pittaScore | Float | No | -- | 0-100 from assessment |
| kaphaScore | Float | No | -- | 0-100 from assessment |
| doshaConfidence | Float | No | -- | 0-100 assessment confidence |
| doshaVerified | Boolean | Yes | false | Verified by doctor/admin |
| doshaVerifiedBy | String | No | -- | Verifier userId |
| doshaVerifiedAt | DateTime | No | -- | Verification timestamp |
| locationLatitude | Float | No | -- | User latitude |
| locationLongitude | Float | No | -- | User longitude |
| city | String | No | -- | User city |

- Relations: user (cascade delete), doshaAssessments

---

## Models -- Dosha & Ayurveda

### DoshaAssessment
Purpose: Stores each Prakriti assessment (multiple per user, one active)
DB table: `dosha_assessments`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | User who took assessment |
| profileId | String | Yes | -- | FK to UserProfile |
| assessmentType | AssessmentType | Yes | SELF_QUICK | Type of assessment |
| answers | Json | Yes | -- | Array of question/answer data |
| primaryDosha | DoshaType | Yes | -- | Primary result |
| secondaryDosha | DoshaType | No | -- | Secondary result |
| vataScore | Float | Yes | -- | 0-100 |
| pittaScore | Float | Yes | -- | 0-100 |
| kaphaScore | Float | Yes | -- | 0-100 |
| confidence | Float | Yes | 30 | 0-100 confidence |
| isActive | Boolean | Yes | true | Currently active assessment |
| assessedBy | String | No | -- | Doctor/Admin userId |
| assessedByName | String | No | -- | Assessor display name |
| verificationNotes | String | No | -- | Doctor/Admin notes |

- Indexes: `[userId, isActive]`, `[profileId]`

### DoshaQuestion
Purpose: Admin-managed question bank for Prakriti quizzes
DB table: `dosha_questions`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| questionText | String | Yes | -- | Question text |
| questionCategory | String | Yes | -- | body_type, digestion, sleep, etc. |
| options | Json | Yes | -- | Array of {label, vataScore, pittaScore, kaphaScore} |
| weight | Float | Yes | 1.0 | Diagnostic weight |
| orderIndex | Int | Yes | 0 | Display order |
| isActive | Boolean | Yes | true | Active flag |

- Indexes: `[isActive, orderIndex]`

### AyurvedicRemedy
Purpose: DB-managed Ayurvedic herbal remedies by condition and dosha
DB table: `ayurvedic_remedies`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| condition | String | Yes | -- | delayed_period, pcos, cramps, etc. |
| dosha | String | Yes | -- | Vata, Pitta, Kapha, all |
| herbNameSanskrit | String | Yes | -- | Sanskrit herb name |
| herbNameEnglish | String | Yes | -- | English herb name |
| botanicalName | String | No | -- | Botanical name |
| benefitText | String | Yes | -- | Benefit description |
| safetyNote | String | No | -- | Safety information |
| pregnancySafety | String | Yes | "caution" | safe, caution, avoid, contraindicated |
| sourceReference | String | No | -- | Source citation |
| isActive | Boolean | Yes | true | Active flag |

- Indexes: `[condition, dosha, isActive]`

### DoshaPhaseGuidance
Purpose: Dosha-specific guidance per menstrual cycle phase
DB table: `dosha_phase_guidance`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| dosha | String | Yes | -- | Vata, Pitta, Kapha |
| phase | String | Yes | -- | menstrual, follicular, ovulation, luteal |
| dominantDosha | String | No | -- | Dominant dosha in this phase |
| imbalanceRisk | String | No | -- | Imbalance risk description |
| dietTips | Json | Yes | -- | String[] of diet tips |
| herbTips | Json | Yes | -- | String[] of herb tips |
| yogaTips | Json | Yes | -- | String[] of yoga tips |
| lifestyleTips | Json | Yes | -- | String[] of lifestyle tips |
| avoidList | Json | Yes | -- | String[] of things to avoid |
| modernCorrelation | String | No | -- | Modern medical correlation (Text) |
| isActive | Boolean | Yes | true | Active flag |

- Unique: `[dosha, phase]`

---

## Models -- Cycle & Health Tracking

### Cycle
Purpose: Menstrual cycle records (actual and predicted)
DB table: `cycles`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | FK to User |
| startDate | DateTime | Yes | -- | Cycle start |
| endDate | DateTime | No | -- | Cycle end |
| cycleLength | Int | No | -- | Length in days |
| periodLength | Int | No | -- | Period length in days |
| ovulationDate | DateTime | No | -- | Estimated ovulation |
| fertileStart | DateTime | No | -- | Fertile window start |
| fertileEnd | DateTime | No | -- | Fertile window end |
| flow | String | No | -- | light, medium, heavy, spotting |
| painLevel | Int | No | -- | 0-10 scale |
| mood | String[] | Yes | -- | Mood tags |
| symptoms | String[] | Yes | -- | Symptom tags |
| isPredicted | Boolean | Yes | false | Predicted vs actual |
| notes | String | No | -- | User notes |

- Indexes: `[userId, startDate]`

### MoodLog
Purpose: Daily mood tracking
DB table: `mood_logs`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | FK to User |
| mood | MoodLevel | Yes | -- | Mood level enum |
| notes | String | No | -- | Optional notes |
| logDate | DateTime | Yes | now() | Log date |

- Indexes: `[userId, logDate]`

### SymptomLog
Purpose: Daily symptom tracking
DB table: `symptom_logs`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | FK to User |
| symptoms | String[] | Yes | -- | Symptom names |
| severity | Int | No | 5 | 1-10 scale |
| notes | String | No | -- | Optional notes |
| logDate | DateTime | Yes | now() | Log date |

- Indexes: `[userId, logDate]`

### BBTLog
Purpose: Basal body temperature tracking for fertility
DB table: `bbt_logs`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | FK to User |
| temperature | Float | Yes | -- | Celsius (e.g. 36.45) |
| time | String | No | -- | Time of measurement ("06:30") |
| method | String | Yes | "oral" | oral, vaginal, tympanic |
| notes | String | No | -- | Optional notes |
| logDate | DateTime | Yes | -- | Log date |

- Unique: `[userId, logDate]`

### CervicalMucusLog
Purpose: Cervical mucus tracking for fertility
DB table: `cervical_mucus_logs`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | FK to User |
| type | String | Yes | -- | dry, sticky, creamy, watery, eggWhite, spotting |
| amount | String | No | -- | none, light, moderate, heavy |
| notes | String | No | -- | Optional notes |
| logDate | DateTime | Yes | -- | Log date |

- Unique: `[userId, logDate]`

### FertilityDailyLog
Purpose: Composite daily fertility log combining multiple signals
DB table: `fertility_daily_logs`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | FK to User |
| logDate | DateTime | Yes | -- | Log date |
| bbt | Float | No | -- | BBT reading |
| cervicalMucus | String | No | -- | CM type |
| cervicalPosition | String | No | -- | low-firm-closed / high-soft-open |
| lhTestResult | String | No | -- | negative, faint, positive, peak |
| intercourse | Boolean | Yes | false | Intercourse logged |
| fertilityScore | Float | No | -- | 0-100 computed probability |
| phase | String | No | -- | Cycle phase |
| notes | String | No | -- | Optional notes |

- Unique: `[userId, logDate]`

### WaterLog
Purpose: Daily water intake tracking
DB table: `water_logs`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | FK to User |
| glasses | Int | Yes | 0 | Glasses consumed |
| targetGlasses | Int | Yes | 8 | Daily target |
| logDate | DateTime | Yes | now() | Log date |

- Unique: `[userId, logDate]`

---

## Models -- Pregnancy

### Pregnancy
Purpose: Active pregnancy tracking
DB table: `pregnancies`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | FK to User |
| dueDate | DateTime | Yes | -- | Estimated due date |
| conceptionDate | DateTime | No | -- | Estimated conception |
| currentWeek | Int | Yes | 1 | Current pregnancy week |
| isActive | Boolean | Yes | true | Active pregnancy |
| notes | String | No | -- | Notes |

- Relations: checklistItems
- Indexes: `[userId]`

### PregnancyChecklist
Purpose: Weekly pregnancy checklist items
DB table: `pregnancy_checklists`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| pregnancyId | String | Yes | -- | FK to Pregnancy |
| week | Int | Yes | -- | Pregnancy week |
| title | String | Yes | -- | Task title |
| description | String | No | -- | Task description |
| isCompleted | Boolean | Yes | false | Completion status |
| completedAt | DateTime | No | -- | When completed |

- Indexes: `[pregnancyId, week]`

---

## Models -- Doctors & Appointments

### Doctor
Purpose: Doctor/practitioner profiles
DB table: `doctors`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | No (unique) | -- | FK to User (optional) |
| fullName | String | Yes | -- | Doctor name |
| specialization | String | Yes | -- | Medical specialization |
| qualifications | String[] | Yes | -- | Degrees/certifications |
| experienceYears | Int | Yes | -- | Years of experience |
| hospitalName | String | No | -- | Hospital name |
| hospitalId | String | No | -- | FK to Hospital |
| consultationFee | Float | Yes | -- | Fee in INR |
| commissionRate | Float | No | -- | Per-doctor commission override |
| rating | Float | Yes | 0 | Average rating |
| totalReviews | Int | Yes | 0 | Review count |
| languages | Language[] | Yes | -- | Spoken languages |
| tags | String[] | Yes | -- | Searchable tags |
| bio | String | No | -- | Doctor bio |
| avatarUrl | String | No | -- | Profile photo |
| photoUrl | String | No | -- | Alternate photo |
| clinicPhotos | String[] | Yes | [] | Clinic gallery |
| introVideoUrl | String | No | -- | Intro video |
| isAvailable | Boolean | Yes | true | Currently available |
| isVerified | Boolean | Yes | false | Verified by admin |
| isPublished | Boolean | Yes | false | Visible to users |
| isChief | Boolean | Yes | false | Chief doctor flag |
| isPromoted | Boolean | Yes | false | Promoted listing |
| status | String | Yes | "pending" | Approval status |
| location | String | No | -- | Location text |

- Relations: hospital, appointments, articles, reviews, availableSlots, prescriptions, payouts
- Indexes: `[specialization]`, `[rating]`, `[consultationFee]`, `[isPublished]`, `[status]`

### DoctorSlot
Purpose: Weekly availability slots for doctors
DB table: `doctor_slots`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| doctorId | String | Yes | -- | FK to Doctor |
| dayOfWeek | Int | Yes | -- | 0=Sun, 6=Sat |
| startTime | String | Yes | -- | "09:00" format |
| endTime | String | Yes | -- | "17:00" format |
| isActive | Boolean | Yes | true | Slot active |

- Unique: `[doctorId, dayOfWeek, startTime]`

### DoctorReview
Purpose: Patient reviews of doctors
DB table: `doctor_reviews`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| doctorId | String | Yes | -- | FK to Doctor |
| userId | String | Yes | -- | FK to User |
| rating | Float | Yes | -- | Star rating |
| comment | String | No | -- | Review text |

- Unique: `[doctorId, userId]`

### Appointment
Purpose: Consultation appointments between users and doctors
DB table: `appointments`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | FK to User |
| doctorId | String | No | -- | FK to Doctor (optional) |
| doctorName | String | No | -- | Name for custom/admin doctors |
| scheduledAt | DateTime | Yes | -- | Appointment time |
| duration | Int | Yes | 30 | Duration in minutes |
| status | AppointmentStatus | Yes | PENDING | Current status |
| type | String | Yes | "consultation" | Appointment type |
| notes | String | No | -- | Notes |
| meetingLink | String | No | -- | Video call link |
| paymentId | String | No | -- | Payment reference |
| amountPaid | Float | No | -- | Final amount paid |
| originalFee | Float | No | -- | Doctor's original fee |
| couponCode | String | No | -- | Applied coupon |
| couponDiscount | Float | No | -- | Coupon discount |
| platformFee | Float | No | -- | Platform fee |
| cancellationReason | String | No | -- | Reason for cancellation |
| rejectionReason | String | No | -- | Reason for rejection |

- Relations: user, doctor, prescription
- Indexes: `[userId]`, `[doctorId]`, `[scheduledAt]`, `[status]`

### Prescription
Purpose: Doctor prescriptions linked to appointments
DB table: `prescriptions`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| appointmentId | String | Yes (unique) | -- | FK to Appointment |
| doctorId | String | No | -- | FK to Doctor |
| userId | String | Yes | -- | FK to User |
| diagnosis | String | Yes | -- | Diagnosis text |
| medicines | Json | Yes | -- | [{name, dosage, frequency, duration}] |
| instructions | String | No | -- | Additional instructions |
| followUpDate | DateTime | No | -- | Follow-up date |
| pdfUrl | String | No | -- | PDF download URL |

- Indexes: `[userId]`, `[doctorId]`

---

## Models -- Hospitals

### Hospital
Purpose: Hospital/clinic directory
DB table: `hospitals`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| name | String | Yes | -- | Hospital name |
| address | String | Yes | -- | Street address |
| city | String | Yes | -- | City |
| state | String | Yes | -- | State |
| pincode | String | Yes | -- | PIN code |
| latitude | Float | No | -- | Geo latitude |
| longitude | Float | No | -- | Geo longitude |
| phone | String | No | -- | Contact phone |
| email | String | No | -- | Contact email |
| website | String | No | -- | Website URL |
| rating | Float | Yes | 0 | Average rating |
| totalBeds | Int | No | -- | Bed count |
| hasEmergency | Boolean | Yes | false | Emergency services |
| category | String | No | -- | budget, mid_range, premium |
| accreditation | String[] | Yes | -- | NABH, JCI, etc. |
| specialties | String[] | Yes | -- | Medical specialties |
| imageUrls | String[] | Yes | -- | Gallery images |
| isActive | Boolean | Yes | true | Active listing |

- Relations: doctors, prices
- Indexes: `[city]`, `[rating]`

### HospitalPrice
Purpose: Service pricing for hospitals
DB table: `hospital_prices`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| hospitalId | String | Yes | -- | FK to Hospital |
| serviceName | String | Yes | -- | Service name |
| minPrice | Float | Yes | -- | Minimum price |
| maxPrice | Float | No | -- | Maximum price |
| currency | String | Yes | "INR" | Currency code |

- Indexes: `[hospitalId]`

---

## Models -- Articles & Content

### Article
Purpose: Health articles written by doctors or the VedaClue team
DB table: `articles`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| doctorId | String | No | -- | FK to Doctor (author) |
| title | String | Yes | -- | Article title |
| slug | String | Yes (unique) | -- | URL slug |
| content | String | Yes | -- | Article body |
| excerpt | String | No | -- | Short summary |
| category | String | Yes | -- | periods, pregnancy, pcod, etc. |
| tags | String[] | Yes | -- | Topic tags |
| coverImageUrl | String | No | -- | Cover image |
| readTimeMinutes | Int | Yes | 5 | Estimated read time |
| status | ArticleStatus | Yes | DRAFT | Publishing status |
| viewCount | Int | Yes | 0 | View counter |
| likeCount | Int | Yes | 0 | Like counter |
| isFeatured | Boolean | Yes | false | Featured flag |
| authorName | String | Yes | "VedaClue Team" | Display author |
| references | String[] | Yes | [] | Medical references |
| sources | String[] | Yes | [] | Source URLs |
| disclaimer | String | No | -- | Custom disclaimer |
| evidenceLevel | String | No | -- | peer-reviewed, clinical-study, etc. |
| medicalReviewedBy | String | No | -- | Medical reviewer |

- Relations: doctor, bookmarks, likes, comments
- Indexes: `[category]`, `[status]`, `[publishedAt]`

### ArticleBookmark / ArticleLike / ArticleComment
Purpose: User interactions with articles
DB tables: `article_bookmarks`, `article_likes`, `article_comments`

- ArticleBookmark: unique per `[userId, articleId]`
- ArticleLike: unique per `[userId, articleId]`, has `type` (LIKE/DISLIKE)
- ArticleComment: indexed by `[articleId]`, has `content` text

---

## Models -- Products & E-commerce

### Product
Purpose: Ayurvedic product catalog
DB table: `products`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| name | String | Yes | -- | Product name |
| category | String | Yes | -- | Product category |
| price | Float | Yes | -- | Price in INR |
| discountPrice | Float | No | -- | Sale price |
| description | String | Yes | -- | Product description |
| ingredients | String[] | Yes | -- | Ingredient list |
| benefits | String[] | Yes | -- | Benefit list |
| howToUse | String | Yes | -- | Usage instructions |
| size | String | Yes | -- | Package size |
| rating | Float | Yes | 0 | Average rating |
| inStock | Boolean | Yes | true | Stock availability |
| isPublished | Boolean | Yes | false | Published to users |
| isFeatured | Boolean | Yes | false | Featured listing |
| stock | Int | Yes | 0 | Stock quantity |
| status | String | Yes | "draft" | Approval status |
| sellerId | String | No | -- | FK to Seller (null = platform-owned) |
| doshaTypes | String[] | Yes | [] | Suitable dosha types |
| bestFor | String[] | Yes | [] | Benefit tags |
| skinType | String | No | -- | Target skin type |
| certifications | String[] | Yes | [] | organic, cruelty-free, etc. |
| certifiedOrganic | Boolean | Yes | false | Has organic cert |
| ayushApproved | Boolean | Yes | false | AYUSH approved |

- Relations: seller, orderItems, productReviews, wishlistItems
- Indexes: `[category]`, `[isPublished]`, `[rating]`, `[sellerId]`, `[isFeatured]`, `[inStock]`, `[name]`, `[status]`

### ProductReview
Purpose: Verified purchase reviews with star ratings
DB table: `product_reviews`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| productId | String | Yes | -- | FK to Product |
| userId | String | Yes | -- | FK to User |
| rating | Float | Yes | -- | 1-5 stars |
| title | String | No | -- | Review headline |
| comment | String | No | -- | Review body |
| isVerifiedPurchase | Boolean | Yes | false | Verified purchase flag |
| helpfulCount | Int | Yes | 0 | Upvotes |
| images | String[] | Yes | [] | Review photos |
| adminReply | String | No | -- | Seller/admin response |
| isApproved | Boolean | Yes | true | Moderation flag |

- Unique: `[productId, userId]`

### WishlistItem
Purpose: Server-persisted user wishlist
DB table: `wishlist_items`

- Unique: `[userId, productId]`
- Fields: id, userId, productId, createdAt

### CallbackRequest
Purpose: Product inquiry callback requests
DB table: `callback_requests`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | No | -- | Optional FK to User |
| productId | String | No | -- | Product reference |
| userName | String | Yes | -- | Requester name |
| userPhone | String | Yes | -- | Requester phone |
| productName | String | Yes | -- | Product name |
| status | String | Yes | "PENDING" | PENDING, CALLED, RESOLVED |
| adminNotes | String | No | -- | Admin notes |

- Indexes: `[status]`, `[productId]`

---

## Models -- Orders & Payments

### Order
Purpose: Product orders (Razorpay + COD)
DB table: `orders`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| orderNumber | String | Yes (unique) | -- | Human-readable order number |
| userId | String | Yes | -- | FK to User |
| subtotal | Float | Yes | -- | Pre-discount subtotal |
| discount | Float | Yes | 0 | Total discount |
| couponCode | String | No | -- | Applied coupon |
| couponDiscount | Float | Yes | 0 | Coupon discount amount |
| platformFee | Float | Yes | 0 | Platform fee |
| deliveryCharge | Float | Yes | 0 | Delivery fee |
| gstAmount | Float | Yes | 0 | GST amount |
| totalAmount | Float | Yes | -- | Final total |
| paymentMethod | String | Yes | "razorpay" | razorpay or COD |
| paymentStatus | String | Yes | "PENDING" | Payment status |
| paymentId | String | No | -- | Payment reference |
| razorpayOrderId | String | No (unique) | -- | Razorpay order ID |
| orderStatus | String | Yes | "PENDING" | Order fulfillment status |
| deliveryAddress | Json | Yes | -- | Delivery address JSON |

- Indexes: `[userId]`, `[orderStatus]`, `[paymentStatus]`, `[razorpayOrderId]`, `[createdAt]`

### OrderItem
Purpose: Individual line items within an order
DB table: `order_items`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| orderId | String | Yes | -- | FK to Order |
| productId | String | Yes | -- | FK to Product (Restrict delete) |
| productName | String | Yes | -- | Product name snapshot |
| quantity | Int | Yes | -- | Quantity ordered |
| price | Float | Yes | -- | Unit price |
| totalPrice | Float | Yes | -- | Line total |
| sellerId | String | No | -- | Seller snapshot at order time |

- Indexes: `[orderId]`, `[sellerId]`

### PaymentAuditLog
Purpose: Immutable ledger of every payment event (disputes, chargebacks, audits)
DB table: `payment_audit_logs`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | FK to User |
| eventType | String | Yes | -- | ORDER_CREATED, ORDER_PAID, REFUND, etc. |
| orderId | String | No | -- | Internal order ID |
| appointmentId | String | No | -- | Internal appointment ID |
| orderNumber | String | No | -- | Human-readable order number |
| razorpayOrderId | String | No | -- | Razorpay order ID |
| razorpayPaymentId | String | No | -- | Razorpay payment ID |
| subtotal | Float | Yes | 0 | Original amount |
| couponDiscount | Float | Yes | 0 | Coupon discount |
| platformFee | Float | Yes | 0 | Platform fee |
| deliveryCharge | Float | Yes | 0 | Delivery fee |
| gstAmount | Float | Yes | 0 | GST |
| totalAmount | Float | Yes | 0 | Final amount |
| paymentMethod | String | No | -- | Payment method |
| currency | String | Yes | "INR" | Currency |

- Indexes: `[userId]`, `[eventType]`, `[orderId]`, `[appointmentId]`, `[razorpayPaymentId]`, `[createdAt]`

---

## Models -- Doctor & Seller Payouts

### DoctorPayout
Purpose: Periodic settlement records for doctor earnings
DB table: `doctor_payouts`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| doctorId | String | Yes | -- | FK to Doctor |
| periodStart | DateTime | Yes | -- | Settlement period start |
| periodEnd | DateTime | Yes | -- | Settlement period end |
| totalEarnings | Float | Yes | -- | Gross earnings |
| platformFee | Float | Yes | -- | Commission amount |
| netPayout | Float | Yes | -- | Amount payable |
| commissionRate | Float | Yes | 20 | Commission % |
| appointmentCount | Int | Yes | -- | Appointments in period |
| status | PayoutStatus | Yes | PENDING | Payout status |
| transactionId | String | No | -- | UTR / transaction ref |
| paidAt | DateTime | No | -- | Payment date |

- Indexes: `[doctorId]`, `[status]`, `[createdAt]`

### ProductPayout
Purpose: Seller/vendor product sales settlement
DB table: `product_payouts`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| sellerId | String | No | -- | FK to Seller (null = platform) |
| periodStart | DateTime | Yes | -- | Period start |
| periodEnd | DateTime | Yes | -- | Period end |
| totalSales | Float | Yes | -- | Gross sales |
| totalOrders | Int | Yes | -- | Order count |
| platformFee | Float | Yes | -- | Commission amount |
| netPayout | Float | Yes | -- | Amount payable |
| commissionRate | Float | Yes | 15 | Commission % |
| gstCollected | Float | Yes | 0 | GST collected |
| tdsDeducted | Float | Yes | 0 | TDS deducted |
| status | PayoutStatus | Yes | PENDING | Payout status |

- Indexes: `[sellerId]`, `[status]`, `[createdAt]`

---

## Models -- Seller / Vendor Marketplace

### Seller
Purpose: Marketplace seller/vendor profiles (admin-onboarded, curated)
DB table: `sellers`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes (unique) | -- | FK to User |
| businessName | String | Yes | -- | Business name |
| businessType | String | Yes | "INDIVIDUAL" | INDIVIDUAL, COMPANY, etc. |
| gstin | String | No | -- | GST number |
| panNumber | String | No | -- | PAN for TDS |
| contactEmail | String | Yes | -- | Contact email |
| contactPhone | String | Yes | -- | Contact phone |
| bankAccountNumber | String | No | -- | Bank account |
| bankIfsc | String | No | -- | IFSC code |
| upiId | String | No | -- | UPI ID |
| bankVerified | Boolean | Yes | false | Bank KYC verified |
| fssaiNumber | String | No | -- | FSSAI license |
| fssaiStatus | DocumentStatus | Yes | NOT_SUBMITTED | FSSAI verification |
| ayushLicense | String | No | -- | AYUSH license |
| ayushStatus | DocumentStatus | Yes | NOT_SUBMITTED | AYUSH verification |
| gstStatus | DocumentStatus | Yes | NOT_SUBMITTED | GST verification |
| commissionRate | Float | Yes | 15 | Platform commission % |
| tdsRate | Float | Yes | 1 | TDS rate % |
| totalSales | Float | Yes | 0 | Lifetime gross sales |
| totalOrders | Int | Yes | 0 | Lifetime orders |
| totalProducts | Int | Yes | 0 | Active products |
| rating | Float | Yes | 5.0 | Seller rating |
| status | SellerStatus | Yes | PENDING | Approval status |
| isVerified | Boolean | Yes | false | KYC verified |

- Relations: user, products, transactions, payouts
- Indexes: `[status]`, `[city]`, `[state]`, `[totalSales]`

### SellerTransaction
Purpose: Per-order-item transaction record for seller earnings
DB table: `seller_transactions`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| sellerId | String | Yes | -- | FK to Seller |
| orderId | String | Yes | -- | Order reference |
| orderItemId | String | Yes (unique) | -- | FK to OrderItem |
| productId | String | Yes | -- | Product reference |
| productName | String | Yes | -- | Product name snapshot |
| quantity | Int | Yes | -- | Quantity sold |
| salePrice | Float | Yes | -- | Unit sale price |
| grossAmount | Float | Yes | -- | Total gross |
| commissionRate | Float | Yes | -- | Commission % at sale time |
| commissionAmount | Float | Yes | -- | Commission deducted |
| tdsAmount | Float | Yes | 0 | TDS deducted |
| netAmount | Float | Yes | -- | Net seller earnings |
| isSettled | Boolean | Yes | false | Settlement status |

- Indexes: `[sellerId]`, `[orderId]`, `[productId]`, `[isSettled]`, `[orderDate]`, `[buyerState]`

---

## Models -- Coupons & Promotions

### Coupon
Purpose: Promo codes for consultations and products
DB table: `coupons`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| code | String | Yes (unique) | -- | Promo code (e.g. "FIRST50") |
| description | String | No | -- | Description |
| discountType | DiscountType | Yes | PERCENTAGE | PERCENTAGE or FLAT |
| discountValue | Float | Yes | -- | Discount amount/percentage |
| maxDiscountAmount | Float | No | -- | Max discount cap |
| minOrderAmount | Float | Yes | 0 | Minimum order to apply |
| applicableTo | CouponScope | Yes | ALL | ALL, CONSULTATION, PRODUCTS |
| specificDoctorIds | String[] | Yes | [] | Target specific doctors |
| specificProductIds | String[] | Yes | [] | Target specific products |
| maxUses | Int | No | -- | Total redemption limit |
| maxUsesPerUser | Int | Yes | 1 | Per-user limit |
| currentUses | Int | Yes | 0 | Redemption counter |
| validFrom | DateTime | Yes | now() | Start date |
| validUntil | DateTime | No | -- | End date (null = no expiry) |
| isActive | Boolean | Yes | true | Active flag |
| firstOrderOnly | Boolean | Yes | false | First order only |

- Relations: redemptions, auditLogs
- Indexes: `[code]`, `[isActive]`

### CouponRedemption
Purpose: Tracks each coupon usage
DB table: `coupon_redemptions`

- Fields: id, couponId, userId, orderId?, appointmentId?, subscriptionId?, discount, createdAt
- Indexes: `[couponId, userId]`

### CouponAuditLog
Purpose: Admin audit trail for coupon changes
DB table: `coupon_audit_logs`

- Fields: id, couponId, adminId, action (CREATED/UPDATED/DELETED/TOGGLED), changes (Json), ipAddress, userAgent
- Indexes: `[couponId]`, `[adminId]`

---

## Models -- Subscriptions

### SubscriptionPlan
Purpose: Subscription tier definitions
DB table: `subscription_plans`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| name | String | Yes | -- | Plan name |
| slug | String | Yes (unique) | -- | URL slug |
| description | String | No | -- | Plan description (Text) |
| interval | SubscriptionInterval | Yes | -- | MONTHLY, YEARLY, LIFETIME |
| basePrice | Float | Yes | -- | Full price in INR |
| currency | String | Yes | "INR" | Currency |
| goalPricing | Json | No | -- | Per-goal price overrides |
| trialDays | Int | Yes | 0 | Trial period |
| gracePeriodDays | Int | Yes | 3 | Grace period |
| razorpayPlanId | String | No | -- | Razorpay plan ID |
| highlights | String[] | Yes | [] | Feature highlights |
| badge | String | No | -- | "POPULAR", "BEST VALUE" |
| sortOrder | Int | Yes | 0 | Display order |
| isActive | Boolean | Yes | true | Active flag |
| isFree | Boolean | Yes | false | Free plan |
| isPublished | Boolean | Yes | true | Published to users |

- Relations: subscriptions, promotions
- Indexes: `[isActive, isPublished]`, `[interval]`

### UserSubscription
Purpose: Active user subscription instances
DB table: `user_subscriptions`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes | -- | FK to User |
| planId | String | Yes | -- | FK to SubscriptionPlan |
| status | SubscriptionStatus | Yes | TRIAL | Current status |
| trialStartDate | DateTime | No | -- | Trial start |
| trialEndDate | DateTime | No | -- | Trial end |
| currentPeriodStart | DateTime | Yes | -- | Current billing period start |
| currentPeriodEnd | DateTime | Yes | -- | Current billing period end |
| razorpaySubscriptionId | String | No (unique) | -- | Razorpay subscription ID |
| pricePaid | Float | Yes | -- | Amount paid |
| originalPrice | Float | Yes | -- | Original price |
| couponCode | String | No | -- | Applied coupon |
| couponDiscount | Float | Yes | 0 | Coupon discount |
| promotionDiscount | Float | Yes | 0 | Promotion discount |
| goal | String | No | -- | Goal at purchase time |
| isAutoRenew | Boolean | Yes | true | Auto-renewal |
| renewalCount | Int | Yes | 0 | Times renewed |

- Relations: user, plan, events
- Indexes: `[userId, status, currentPeriodEnd]`, `[status]`, `[razorpaySubscriptionId]`, `[currentPeriodEnd]`

### SubscriptionEvent
Purpose: Lifecycle event log for subscriptions
DB table: `subscription_events`

- Fields: id, subscriptionId, userId, eventType (SubscriptionEventType), amount, currency, razorpayPaymentId, previousStatus, newStatus, metadata, performedBy
- Indexes: `[subscriptionId]`, `[userId]`, `[eventType]`, `[createdAt]`

### SubscriptionPromotion
Purpose: Time-limited promotions for subscription plans
DB table: `subscription_promotions`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| name | String | Yes | -- | Promotion name |
| type | PromotionType | Yes | FLASH_SALE | Promotion type |
| discountType | DiscountType | Yes | PERCENTAGE | PERCENTAGE or FLAT |
| discountValue | Float | Yes | -- | Discount amount |
| maxDiscountAmount | Float | No | -- | Max cap |
| planId | String | No | -- | Target plan (null = all) |
| goals | String[] | Yes | [] | Target goals |
| isWelcomeBonus | Boolean | Yes | false | Welcome bonus flag |
| newUserWindowDays | Int | Yes | 30 | Days for new user eligibility |
| startDate | DateTime | Yes | now() | Start date |
| endDate | DateTime | No | -- | End date |
| isActive | Boolean | Yes | true | Active flag |
| maxRedemptions | Int | No | -- | Total limit |
| maxPerUser | Int | Yes | 1 | Per-user limit |

- Indexes: `[isActive, type]`, `[startDate, endDate]`

### PendingSubscription
Purpose: Server-side pricing cache between payment create and verify (tamper prevention)
DB table: `pending_subscriptions`

- Fields: id, userId, planId, razorpayOrderId? (unique), razorpaySubId? (unique), originalPrice, pricePaid, couponCode, couponDiscount, promotionId, promoDiscount, goal, paymentType, expiresAt
- Indexes: `[userId]`, `[razorpayOrderId]`, `[razorpaySubId]`

---

## Models -- Platform Configuration

### PlatformConfig
Purpose: Global platform settings (single row, id="default")
DB table: `platform_config`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| defaultDoctorCommission | Float | Yes | 20 | Doctor consultation commission % |
| defaultProductCommission | Float | Yes | 15 | Product sales commission % |
| deliveryCharge | Float | Yes | 49 | Default delivery charge |
| freeDeliveryAbove | Float | Yes | 499 | Free delivery threshold |
| gstRate | Float | Yes | 18 | GST % |
| includeGstInPrice | Boolean | Yes | true | Prices are GST-inclusive |
| platformFeeFlat | Float | Yes | 0 | Flat fee per order |
| platformFeePercent | Float | Yes | 2 | % fee per order |
| cancellationWindowHours | Int | Yes | 24 | Free cancellation window |
| codEnabled | Boolean | Yes | true | COD enabled |
| minOrderAmount | Float | Yes | 0 | Minimum order amount |
| refundProcessingDays | Int | Yes | 7 | Refund processing days |
| subscriptionEnabled | Boolean | Yes | true | Subscriptions ON/OFF |
| subscriptionGraceDays | Int | Yes | 3 | Subscription grace days |
| subscriptionTrialDays | Int | Yes | 7 | Default trial days |

---

## Models -- Notifications

### Notification
Purpose: In-app notifications
DB table: `notifications`

- Fields: id, userId, title, body, type (period_reminder, appointment, etc.), data (Json), isRead, createdAt
- Indexes: `[userId, isRead]`

### NotificationPreference
Purpose: Per-user notification settings
DB table: `notification_preferences`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| userId | String | Yes (unique) | -- | FK to User |
| pushEnabled | Boolean | Yes | true | Global push toggle |
| periodReminder | Boolean | Yes | true | Period reminders |
| periodReminderDays | Int | Yes | 2 | Days before period |
| ovulationReminder | Boolean | Yes | true | Ovulation reminders |
| waterReminder | Boolean | Yes | true | Water reminders |
| waterIntervalHours | Float | Yes | 2 | Water reminder interval |
| moodReminder | Boolean | Yes | true | Mood check-in |
| moodReminderHour | Int | Yes | 20 | Mood reminder hour |
| appointmentReminder | Boolean | Yes | true | Appointment reminders |
| appointmentLeadMins | Int | Yes | 60 | Minutes before appointment |

---

## Models -- Wellness & Content

### WellnessActivity
Purpose: Meditation, yoga, and wellness activity catalog
DB table: `wellness_activities`

- Fields: id, title, description, category, durationMinutes, difficulty, cyclePhases (CyclePhase[]), imageUrl, audioUrl, videoUrl, instructions (Json), isActive
- Indexes: `[category]`

### WellnessContent
Purpose: Admin-editable wellness tips, phase guidance, pregnancy week content
DB table: `wellness_contents`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| type | String | Yes | -- | phase_tip, wellness_tip, self_care, affirmation, etc. |
| key | String | Yes | -- | Unique slug |
| phase | String | No | -- | Cycle phase |
| goal | String | No | -- | User goal |
| dosha | String | No | -- | Target dosha |
| week | Int | No | -- | Pregnancy week |
| category | String | No | -- | morning, evening, nutrition, etc. |
| title | String | No | -- | Content title |
| body | String | Yes | -- | Content body (Text) |
| metadata | Json | No | -- | Extra structured data |
| sortOrder | Int | Yes | 0 | Display order |
| isActive | Boolean | Yes | true | Active flag |

- Unique: `[type, key]`
- Indexes: `[type, phase, goal]`, `[type, dosha]`, `[type, week]`, `[isActive]`

### AIChatResponse
Purpose: Pattern-matched AI chat responses (admin-managed)
DB table: `ai_chat_responses`

- Fields: id, patternName (unique), regexPattern, responseText (Text), category, isActive, priority
- Indexes: `[isActive, priority]`

---

## Models -- Community

### CommunityPost
Purpose: Forum posts for health discussions
DB table: `community_posts`

- Fields: id, userId, content (Text), category, isAnonymous, isPinned, isHidden, hiddenBy, hiddenReason, likeCount, replyCount, reportCount, isEdited
- Relations: user, replies, likes, reports
- Indexes: `[category]`, `[userId]`, `[isPinned, createdAt]`, `[isHidden]`

### CommunityReply
Purpose: Replies to community posts
DB table: `community_replies`

- Fields: id, postId, userId, content (Text), isDoctor, isAnonymous, isHidden, hiddenBy, hiddenReason, likeCount, reportCount, isEdited
- Indexes: `[postId, createdAt]`, `[userId]`

### CommunityLike
Purpose: Likes on posts and replies
DB table: `community_likes`

- Fields: id, userId, postId?, replyId?
- Unique: `[userId, postId]`, `[userId, replyId]`

### CommunityReport
Purpose: Content moderation reports
DB table: `community_reports`

- Fields: id, userId, postId?, replyId?, reason, details, status (PENDING/REVIEWED/DISMISSED/ACTION_TAKEN), reviewedBy, reviewedAt
- Indexes: `[status]`, `[postId]`, `[replyId]`

### CommunityPoll
Purpose: Community polls created by admins/doctors
DB table: `community_polls`

- Fields: id, question, options (Json), category, createdBy, isActive, expiresAt, totalVotes
- Relations: votes
- Indexes: `[isActive, createdAt]`

### CommunityPollVote
Purpose: Individual poll votes
DB table: `community_poll_votes`

- Fields: id, pollId, userId, optionId
- Unique: `[pollId, userId]`

---

## Models -- Programs / Courses

### Program
Purpose: Structured wellness programs (e.g. PCOD 90-day, fertility bootcamp)
DB table: `programs`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| id | String | Yes | cuid() | Primary key |
| title | String | Yes | -- | Program title |
| subtitle | String | No | -- | Subtitle |
| description | String | No | -- | Description (Text) |
| category | String | Yes | -- | pcod, fertility, menopause, etc. |
| durationDays | Int | Yes | 30 | Duration in days |
| isFree | Boolean | Yes | true | Free program |
| price | Float | Yes | 0 | Price in INR |
| discountPrice | Float | No | -- | Sale price |
| targetAudiences | String[] | Yes | [] | Target audiences |
| doshaTypes | String[] | Yes | [] | Target doshas |
| difficulty | String | Yes | "beginner" | Difficulty level |
| highlights | String[] | Yes | [] | Key benefits |
| status | String | Yes | "DRAFT" | DRAFT, PUBLISHED, ARCHIVED |
| isPublished | Boolean | Yes | false | Published flag |
| isFeatured | Boolean | Yes | false | Featured flag |
| totalEnrolled | Int | Yes | 0 | Enrollment count |

- Relations: contents, enrollments
- Indexes: `[category]`, `[status]`, `[isFeatured]`

### ProgramContent
Purpose: Individual content items within a program (videos, articles, tasks)
DB table: `program_contents`

- Fields: id, programId, weekNumber, dayNumber, sortOrder, title, description (Text), contentType (video/article/audio/task/etc.), videoUrl, audioUrl, imageUrl, body (Text), duration, instructions (Json), metadata (Json), isFree, isLocked
- Indexes: `[programId, weekNumber, sortOrder]`

### ProgramEnrollment
Purpose: User enrollment in programs with progress tracking
DB table: `program_enrollments`

- Fields: id, userId, programId, status (ACTIVE/COMPLETED/PAUSED/CANCELLED), startDate, endDate, completedAt, isPaid, amountPaid, paymentId, couponCode, couponDiscount, progress (Json), completedCount, lastAccessedAt
- Unique: `[userId, programId]`
- Indexes: `[userId]`, `[programId]`, `[status]`

---

## Models -- Analytics & Engagement

### UserEvent
Purpose: Behavioral analytics (page views, funnel tracking, engagement)
DB table: `user_events`

- Fields: id, userId?, sessionId?, event, category, label, value (Float), metadata (Json), ipAddress, userAgent, referrer
- Indexes: `[userId]`, `[event]`, `[category]`, `[createdAt]`, `[sessionId]`, `[userId, event]`, `[event, createdAt]`

### NpsSurvey
Purpose: Net Promoter Score surveys
DB table: `nps_surveys`

- Fields: id, userId, score (0-10), feedback, page
- Indexes: `[userId]`, `[createdAt]`, `[score]`

### PushCampaign
Purpose: Admin push notification campaigns
DB table: `push_campaigns`

- Fields: id, title, body, segment, sentCount, status (draft/sent/failed), scheduledAt, sentAt, createdBy
- Indexes: `[status]`, `[createdAt]`

### EmailCampaign
Purpose: Automated email campaigns (welcome, trial_expiring, etc.)
DB table: `email_campaigns`

- Fields: id, name, subject, body (HTML), trigger, segment, sentCount, openCount, clickCount, status, lastSentAt
- Indexes: `[trigger]`, `[status]`

---

## Models -- Gamification & Referrals

### Referral
Purpose: User referral tracking
DB table: `referrals`

- Fields: id, referrerId, referredId?, referralCode (unique), referredEmail, referredPhone, status (pending/signed_up/converted/rewarded), rewardType, rewardApplied, convertedAt
- Relations: referrer (User), referred (User)
- Indexes: `[referrerId]`, `[referralCode]`, `[referredId]`

### UserBadge
Purpose: Gamification badges earned by users
DB table: `user_badges`

- Fields: id, userId, badge (key string), earnedAt, metadata (Json)
- Unique: `[userId, badge]`
- Indexes: `[userId]`, `[badge]`

---

## Models -- Auth & Security

### RefreshToken
Purpose: JWT refresh token storage
DB table: `refresh_tokens`

- Fields: id, userId, token (unique), expiresAt, isRevoked
- Indexes: `[userId]`

### OtpStore
Purpose: Phone OTP storage with expiry
DB table: `otp_store`

- Fields: id, phone, otp, expiresAt
- Indexes: `[phone]`

### AuditLog
Purpose: Security audit trail (logins, data access, modifications)
DB table: `audit_logs`

- Fields: id, userId?, action, resource, resourceId, ipAddress, userAgent, metadata (Json)
- Indexes: `[userId]`, `[action]`, `[createdAt]`

---

## Models -- Weather

### UserWeatherCache
Purpose: Cached weather data for Ayurvedic seasonal recommendations
DB table: `user_weather_cache`

- Fields: id, userId (unique), latitude, longitude, city, country, temperature (Celsius), humidity (%), weatherCondition, windSpeed (m/s), description, lastFetchedAt

---

## Schema Statistics

| Metric | Count |
|--------|-------|
| Models | 47 |
| Enums | 18 |
| Total tables | 47 |

## Key Design Patterns

- **All PKs:** CUID strings (`@id @default(cuid())`)
- **Timestamps:** `createdAt` + `updatedAt` on all models
- **Soft delete:** Uses `isActive`/`isHidden` flags (no hard deletes)
- **Cascade delete:** User deletion cascades to all owned records
- **SetNull on delete:** Doctor/Seller deletion sets FKs to null (preserves history)
- **Restrict delete:** Products cannot be deleted if referenced by OrderItems
- **Financial immutability:** PaymentAuditLog and SellerTransaction are append-only ledgers
- **Single-row config:** PlatformConfig uses `id = "default"` for global settings
