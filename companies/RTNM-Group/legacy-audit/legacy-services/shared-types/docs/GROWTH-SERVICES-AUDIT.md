# REZ Growth/Engagement Services Audit Report

**Audit Date:** 2026-05-02
**Services Audited:**
- `rez-ads-service` (Port 4007)
- `rez-marketing-service` (Port 4000)
- `rez-notification-events` (Worker Service)

---

## Table of Contents

1. [rez-ads-service](#1-rez-ads-service)
   - [API Endpoints](#11-api-endpoints)
   - [Models/Schemas](#12-modelsschemas)
   - [Key Capabilities](#13-key-capabilities)
2. [rez-marketing-service](#2-rez-marketing-service)
   - [API Endpoints](#21-api-endpoints)
   - [Models/Schemas](#22-modelsschemas)
   - [Key Capabilities](#23-key-capabilities)
3. [rez-notification-events](#3-rez-notification-events)
   - [API Endpoints](#31-api-endpoints)
   - [Models/Schemas](#32-modelsschemas)
   - [Key Capabilities](#33-key-capabilities)
4. [Current Service Connections](#4-current-service-connections)
5. [Missing Integrations](#5-missing-integrations)
6. [Recommended Integration Points](#6-recommended-integration-points)

---

## 1. rez-ads-service

**Service Type:** REST API + Interaction Tracking
**Port:** 4007
**Database:** MongoDB (ADS_MONGO_URI)
**Cache:** Redis

### 1.1 API Endpoints

#### Health Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Basic health check (DB + Redis) |
| GET | `/healthz` | None | Minimal health check |
| GET | `/health/detailed` | None | Detailed health with latency metrics |
| GET | `/metrics` | None | Prometheus metrics |

#### Merchant Routes (`/merchant/ads`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Merchant JWT | List merchant's ads with pagination |
| POST | `/` | Merchant JWT | Create new ad campaign |
| GET | `/analytics` | Merchant JWT | Get merchant's aggregate ad stats |
| GET | `/:id` | Merchant JWT | Get single ad details |
| PUT | `/:id` | Merchant JWT | Update draft/rejected ad |
| PATCH | `/:id/submit` | Merchant JWT | Submit ad for review |
| PATCH | `/:id/pause` | Merchant JWT | Pause active ad |
| PATCH | `/:id/activate` | Merchant JWT | Reactivate paused ad |
| DELETE | `/:id` | Merchant JWT | Soft delete (draft/paused only) |

#### Admin Routes (`/admin/ads`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Admin JWT | List all ads with filters |
| GET | `/stats` | Admin JWT | Network-wide ad statistics |
| GET | `/:id` | Admin JWT | Get single ad details |
| PATCH | `/:id/approve` | Admin JWT | Approve pending ad |
| PATCH | `/:id/reject` | Admin JWT | Reject ad with reason |
| PATCH | `/:id/pause` | Admin JWT | Force pause active ad |

#### Ad Interaction Routes (`/ads`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/:id/click` | Consumer JWT | Record click with fraud detection |
| POST | `/:id/impression` | Consumer JWT | Record impression |
| POST | `/attribute` | Internal JWT | Link order to campaign |
| GET | `/:id/analytics` | Merchant JWT | Get ad ROI metrics |

#### Ad Serving Routes (`/ads`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/serve` | Consumer JWT | Serve targeted ad for placement |
| POST | `/impression` | Consumer JWT | Track impression (rate limited) |
| POST | `/click` | Consumer JWT | Track click (rate limited) |

### 1.2 Models/Schemas

#### AdCampaign
```
Fields:
- merchantId: ObjectId (ref: Merchant)
- storeId: ObjectId (ref: Store)
- title: String (max 150)
- headline: String (max 90)
- description: String (max 200)
- ctaText: String (max 30)
- ctaUrl: String (validated, no javascript:)
- imageUrl: String
- placement: Enum ['home_banner', 'explore_feed', 'store_listing', 'search_result']
- targetSegment: Enum ['all', 'new', 'loyal', 'lapsed', 'nearby']
- targetLocation: { city, radiusKm }
- targetInterests: [String]
- bidType: Enum ['CPC', 'CPM']
- bidAmount: Number (min 0)
- dailyBudget: Number (min 0)
- totalBudget: Number (min 0)
- totalSpent: Number (default 0)
- frequencyCapDays: Number (default 1)
- startDate: Date (indexed)
- endDate: Date (indexed)
- status: Enum ['draft', 'pending_review', 'active', 'paused', 'rejected', 'completed']
- rejectionReason: String
- impressions: Number (default 0)
- clicks: Number (default 0)
- ctr: Virtual (computed)
- reviewedBy: ObjectId
- reviewedAt: Date

Indexes:
- merchantId
- placement
- startDate
- status
- Compound: (merchantId, createdAt), (status, placement, startDate, endDate)
```

#### AdInteraction
```
Fields:
- campaignId: ObjectId (ref: AdCampaign)
- userId: String
- type: Enum ['impression', 'click', 'conversion']
- ip: String
- userAgent: String
- orderId: String (sparse, for attribution)
- isFraud: Boolean (default false)
- fraudReason: String
- createdAt, updatedAt: Date

Indexes:
- campaignId
- userId
- type
- isFraud
- Compound: (campaignId, type, createdAt), (userId, campaignId, createdAt), (orderId, campaignId)
```

### 1.3 Key Capabilities

| Capability | Description |
|------------|-------------|
| **Ad Campaign Lifecycle** | Full workflow: draft -> pending_review -> active/rejected -> paused -> completed |
| **Multi-Placement Targeting** | home_banner, explore_feed, store_listing, search_result |
| **Bidding Models** | CPC (Cost Per Click) and CPM (Cost Per Mille) |
| **Budget Management** | Daily and total budget enforcement with atomic operations |
| **Fraud Detection** | Redis-backed click fraud detection (rapid clicks, IP flooding, bot detection) |
| **Frequency Capping** | Per-user ad frequency limits (24h default) |
| **Rate Limiting** | Redis-backed rate limiting on impression/click endpoints |
| **Attribution** | Order-to-campaign attribution within 24h window |
| **ROI Analytics** | CTR, conversion rate, revenue estimation |
| **Intent Capture** | Events sent to rez-intent-graph service |
| **Click Deduplication** | 5-minute dedup window to prevent click inflation |

---

## 2. rez-marketing-service

**Service Type:** REST API + Campaign Orchestration
**Port:** 4000
**Database:** MongoDB (MONGODB_URI)
**Cache:** Redis
**Workers:** BullMQ (campaignWorker, interestSyncWorker, interestRetryWorker)

### 2.1 API Endpoints

#### Health Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Basic health check |
| GET | `/healthz` | None | Minimal health check |
| GET | `/metrics` | None | Prometheus metrics |

#### Campaign Routes (`/campaigns`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Merchant JWT | List campaigns with pagination |
| GET | `/:id` | Merchant JWT | Get single campaign |
| POST | `/` | Merchant JWT | Create campaign |
| PATCH | `/:id` | Merchant JWT | Update draft/scheduled campaign |
| POST | `/:id/launch` | Merchant JWT | Dispatch campaign now |
| POST | `/:id/cancel` | Merchant JWT | Cancel campaign |
| DELETE | `/:id` | Merchant JWT | Delete draft only |

#### Broadcast Routes (`/broadcasts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Merchant JWT | Create and send broadcast |
| GET | `/:merchantId` | Merchant JWT | List past broadcasts with stats |
| POST | `/:broadcastId/schedule` | Merchant JWT | Schedule for future |
| POST | `/send` | Merchant JWT | Sprint 9: segment-based send |

#### Audience Routes (`/audience`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/estimate` | Merchant JWT | Estimate audience size |
| GET | `/interests` | Consumer JWT | Get available interest tags |
| GET | `/locations` | Consumer JWT | Get top areas/cities |
| GET | `/institutions` | Consumer JWT | Get institutions with user counts |
| POST | `/search-signal` | Internal JWT | Record keyword search event |
| POST | `/location-signal` | Internal JWT | Update location from order |

#### Analytics Routes (`/analytics`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/summary` | Merchant JWT | Merchant summary stats |
| GET | `/campaign/:id` | Merchant JWT | Campaign-specific metrics |
| POST | `/track/open` | Merchant JWT | Track email open |
| POST | `/track/click` | Merchant JWT | Track link click |
| POST | `/track/conversion` | Merchant JWT | Track conversion |

#### Keyword Routes (`/keywords`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auction` | None (Public) | Get keyword bid results for search |
| GET | `/` | Merchant JWT | List merchant's keyword bids |
| POST | `/` | Merchant JWT | Create keyword bid |
| PATCH | `/:id` | Merchant JWT | Update keyword bid |
| DELETE | `/:id` | Merchant JWT | Delete keyword bid |

#### Webhook Routes (`/webhooks`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/whatsapp` | None (Meta verification) | WhatsApp webhook verification |
| POST | `/whatsapp` | HMAC signature | WhatsApp delivery receipts |
| GET | `/track/open` | None | Email tracking pixel |

#### AdBazaar Routes (`/adbazaar`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/broadcast` | Internal key | Trigger AdBazaar broadcast |
| GET | `/status/:broadcastId` | Internal key | Check broadcast status |

#### Voucher Routes (`/vouchers`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | None | Create voucher |
| GET | `/` | None | List vouchers with filters |
| GET | `/:id` | None | Get voucher by ID |
| GET | `/code/:code` | None | Get voucher by code |
| PATCH | `/:id` | None | Update voucher |
| DELETE | `/:id` | None | Deactivate voucher |
| POST | `/validate` | None | Validate voucher for order |
| POST | `/redeem` | None | Redeem voucher for order |
| GET | `/:id/redemptions` | None | Get redemption history |
| GET | `/user/:userId` | None | Get user redemption history |
| POST | `/cleanup` | None | Mark expired vouchers (cron) |

#### Interaction Routes (`/interaction`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/:id/impression` | Consumer JWT | Record ad impression |
| POST | `/:id/click` | Consumer JWT | Record ad click |

### 2.2 Models/Schemas

#### MarketingCampaign
```
Fields:
- merchantId: ObjectId (ref: Merchant)
- name: String (max 100)
- objective: Enum ['awareness', 'engagement', 'sales', 'win_back']
- channel: Enum ['whatsapp', 'push', 'sms', 'email', 'in_app']
- message: String (max 4096)
- templateName: String
- imageUrl: String
- ctaUrl: String
- ctaText: String
- audience: IAudienceFilter {
    segment: Enum (12 types including all, recent, lapsed, high_value, etc.)
    location: { city, area, pincode, radiusKm, coordinates }
    interests: [String]
    birthday: { daysAhead }
    purchaseHistory: { categoryIds, productKeywords, withinDays, minOrderCount }
    institution: { name, type, area }
    keyword: { terms, withinDays }
    customFilter: { interests, location, ageRange, institutions }
    estimatedCount
  }
- status: Enum ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled']
- scheduledAt: Date
- sentAt: Date
- stats: { sent, delivered, failed, deduped, opened, clicked, converted }
- dailyBudget: Number (in paise)
- totalSpent: Number (in paise)
- attributionWindowDays: Number (default 7)
- createdBy: ObjectId

Indexes:
- (merchantId, status, createdAt)
- (status, scheduledAt)
```

#### KeywordBid
```
Fields:
- merchantId: ObjectId (ref: Merchant)
- keyword: String (indexed, lowercase)
- matchType: Enum ['exact', 'broad', 'phrase']
- channel: Enum ['search', 'feed']
- bidAmount: Number
- bidType: Enum ['cpc', 'cpm']
- dailyBudget: Number
- totalBudget: Number (optional)
- totalSpent: Number
- impressions: Number
- clicks: Number
- headline: String (max 80)
- description: String (max 200)
- imageUrl: String
- ctaUrl: String
- ctaText: String
- isActive: Boolean
- startDate, endDate: Date

Indexes:
- (keyword, isActive, bidAmount) for auction queries
```

#### UserInterestProfile
```
Fields:
- userId: ObjectId (ref: User, unique)
- interests: [{ tag, score (0-100), orderCount, lastOrderAt }]
- primaryLocation: { city, area, pincode, coordinates, source, updatedAt }
- locationHistory: [ILocationSignal]
- institution: { name, type, area, confidence }
- recentSearches: [{ term, searchedAt }]
- lastSyncedAt: Date

Indexes:
- (interests.tag)
- (primaryLocation.city)
- (primaryLocation.area)
- (primaryLocation.pincode)
- (institution.name)
- (recentSearches.term, recentSearches.searchedAt)
```

#### AdCampaign (Marketing)
```
Fields:
- merchantId: ObjectId
- title: String
- bidType: Enum ['CPC', 'CPM']
- bidAmount: Number
- dailyBudget: Number
- totalBudget: Number
- totalSpent: Number
- status: Enum ['draft', 'active', 'paused', 'completed']
```

#### Voucher
```
Fields:
- code: String (unique, uppercase)
- type: Enum ['percentage', 'fixed', 'bogo', 'free_delivery']
- value: Number
- minOrderValue: Number
- maxDiscount: Number (for percentage)
- maxUses: Number
- usedCount: Number
- validFrom: Date (indexed)
- validUntil: Date (indexed)
- status: Enum ['active', 'exhausted', 'expired', 'cancelled'] (indexed)
- applicableTo: Enum ['all', 'category', 'product', 'store']
- applicableIds: [String]
- metadata: Mixed
- createdBy: ObjectId

Indexes:
- (code, status)
- (status, validUntil)
- (merchantId, status) - NOTE: merchantId field referenced but not in schema
```

#### VoucherRedemption
```
Fields:
- voucherId: ObjectId (ref: Voucher)
- voucherCode: String
- userId: String
- orderId: String (unique - prevents duplicate usage)
- discountApplied: Number
- orderValue: Number
- redeemedAt: Date

Indexes:
- (voucherId, userId) - unique compound
```

### 2.3 Key Capabilities

| Capability | Description |
|------------|-------------|
| **Campaign Lifecycle** | draft -> scheduled/sending -> sent/failed/cancelled |
| **Multi-Channel Support** | WhatsApp, Push, SMS, Email, In-App |
| **Advanced Audience Targeting** | 12 segment types including location, interests, birthday, purchase history, keywords |
| **Keyword Search Ads** | Real-time keyword auction for search results |
| **Broadcast System** | Multi-channel broadcast with segment-based sends |
| **Voucher Management** | Full CRUD + validation + redemption with atomic transactions |
| **WhatsApp Integration** | Meta WhatsApp Business API with delivery receipts |
| **Interest Engine** | Derives user interests from order history |
| **Birthday Campaigns** | Scheduled birthday-based targeting |
| **Per-Channel Rate Limiting** | Prevents notification spam per channel |
| **Idempotent Broadcasts** | Prevents duplicate sends on retry |
| **Intent Capture** | Events sent to rez-intent-graph service |

---

## 3. rez-notification-events

**Service Type:** BullMQ Worker (Background Job Processor)
**Health Port:** 3011
**Database:** MongoDB
**Cache:** Redis (BullMQ)

### 3.1 API Endpoints

#### Internal Routes (`/api/internal`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/digest/send` | Internal Token | Trigger digest email notifications |
| POST | `/push/batch` | Internal Token | Process pending push notifications |

#### Health Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:port/health` | None | Health check server |

### 3.2 Models/Schemas

This service does not define its own MongoDB models. It operates on existing collections:

| Collection | Purpose |
|------------|---------|
| `userdevices` | User push tokens for Expo |
| `users` | User email lookup |
| `notifications` | In-app notification storage |
| `usernotificationsettings` | User notification preferences |

### 3.3 Key Capabilities

| Capability | Description |
|------------|-------------|
| **Multi-Channel Delivery** | Push (Expo), Email (SendGrid), SMS (MSG91/Twilio), WhatsApp (Meta/Twilio), In-App |
| **Push Notifications** | Expo Push API with token validation and receipt handling |
| **Email Delivery** | SendGrid integration with template support |
| **SMS Delivery** | MSG91 integration with fallback support |
| **WhatsApp Delivery** | Meta WhatsApp Business API and Twilio WhatsApp |
| **In-App Notifications** | MongoDB storage for app notification center |
| **User Preferences** | Respect user opt-outs per channel and event type |
| **Rate Limiting** | Per-user notification rate limiting (50/hour per event type) |
| **Event Deduplication** | 24-hour dedup window prevents duplicate notifications |
| **DLQ Handling** | Dead letter queue for failed jobs |
| **DLQ Cleanup** | Archive after 7 days, delete after 90 days |
| **Priority Channels** | Critical channels (push, email) fail the job; optional channels log and continue |
| **Schema Validation** | Zod validation for incoming events |
| **Streak At-Risk Notifications** | Scheduled notifications for users with streaks at risk |
| **Corp Notifications** | Benefit allocation, gift campaigns, karma, hotel bookings, GST invoices |

---

## 4. Current Service Connections

### 4.1 Existing Integrations

```
+-------------------+     +-----------------------+     +----------------------+
|   rez-ads-service | --> |  rez-intent-graph     |     |    Redis (shared)   |
|   (Port 4007)     |     |  (INTENT_CAPTURE_URL) |     |  - Rate limiting    |
+-------------------+     +-----------------------+     |  - Click dedup      |
        |                                                  |  - Frequency cap    |
        |                                                  |  - Daily budgets    |
        v                                                  +----------------------+
+-------------------+
| rez-marketing-    | --> +-----------------------+ --> +----------------------+
| service           |     |  rez-notification-    |     |    MongoDB (shared)  |
| (Port 4000)       |     |  events (Worker)      |     |  - AdCampaign       |
+-------------------+     |  (BullMQ Queue)       |     |  - MarketingCampaign|
        |                +-----------------------+     |  - UserInterestProfile
        |                          |                   |  - Voucher          |
        v                          v                   |  - etc.              |
+-------------------+     +-----------------------+     +----------------------+
|   Redis (shared)  | <-- |  rez-backend         | --------------------+
|  - Idempotency    |     |  (Monolith)           |                     |
|  - Rate limiting  |     +-----------------------+     +--------------------+
|  - Daily counters |                                 |   External Services  |
+-------------------+                                 |  - Expo Push API    |
        ^                                            |  - SendGrid         |
        |                                            |  - MSG91            |
        |                                            |  - Twilio           |
        |                                            |  - Meta WhatsApp    |
        |                                            +--------------------+
        |
        +-- rez-scheduler-service (triggers digest/push batch)
```

### 4.2 Communication Patterns

| From | To | Mechanism | Purpose |
|------|----|-----------|---------|
| rez-ads-service | rez-intent-graph | HTTP POST | Intent capture events |
| rez-marketing-service | rez-intent-graph | HTTP POST | Intent capture events |
| rez-marketing-service | rez-notification-events | BullMQ Queue | Notification job dispatch |
| rez-marketing-service | Redis | Direct | Rate limiting, idempotency |
| rez-notification-events | MongoDB | Direct | User data, notification storage |
| rez-notification-events | Expo | HTTP | Push notifications |
| rez-notification-events | SendGrid | HTTP | Email notifications |
| rez-notification-events | MSG91/Twilio | HTTP | SMS/WhatsApp notifications |
| rez-scheduler-service | rez-notification-events | HTTP POST | Trigger digest/batch |

---

## 5. Missing Integrations

### 5.1 Critical Gaps

| Gap | Description | Impact |
|-----|-------------|--------|
| **Ads-to-Marketing Attribution** | No connection between ad clicks in rez-ads-service and marketing campaign attribution | Cannot measure ad-driven marketing conversions |
| **Cross-Service Analytics** | No unified analytics dashboard combining ad performance + marketing ROI | Merchants cannot see full picture |
| **Notification Preferences Sync** | rez-notification-events checks preferences; rez-marketing-service has no awareness | May send notifications users opted out of via marketing UI |
| **Voucher Integration in Campaigns** | Vouchers created in marketing-service cannot be attached to campaigns | Cannot auto-attach vouchers to broadcasts |
| **Keyword Bidding -> Ad Serving** | KeywordBid model exists but no connection to ad serving in rez-ads-service | Search ads not integrated with ad serving |
| **Ad Performance -> Broadcast Targeting** | User segments not enriched with ad engagement data | Cannot target "users who clicked ads" |
| **Order Service -> Attribution** | Attribution only works within 24h; no connection to order completion | Incomplete conversion tracking |
| **User Interest Profile Sync** | InterestEngine updates UserInterestProfile; not consumed by ad targeting | Ad targeting uses stale or missing data |

### 5.2 Data Silos

| Service | Data Isolated |
|---------|---------------|
| rez-ads-service | Ad interactions not shared with marketing |
| rez-marketing-service | Campaign performance not shared with ads |
| rez-notification-events | Delivery receipts not shared with marketing campaigns |
| Both ads + marketing | No unified user engagement profile |

---

## 6. Recommended Integration Points

### 6.1 High Priority

#### 6.1.1 Unified Notification Event Schema
```
// Create shared event type across services
interface UnifiedNotificationEvent {
  eventId: string;
  eventType: string;
  userId: string;
  channels: NotificationChannel[];
  payload: NotificationPayload;
  source: 'ads' | 'marketing' | 'core';
  attribution?: {
    campaignId?: string;
    adId?: string;
    merchantId?: string;
  };
  createdAt: string;
}
```
**Action:** Standardize event schema in shared-types package

#### 6.1.2 Ad-to-Marketing Attribution Bridge
```
POST /ads/attribute-order
{
  orderId: string;
  userId: string;
  merchantId: string;
  orderValue: number;
  channel: 'whatsapp' | 'push' | 'sms' | 'email' | 'in_app' | 'ad_click';
  campaignId?: string;
  adId?: string;
}
```
**Action:** rez-ads-service -> marketing-service attribution API

#### 6.1.3 Campaign Performance Webhook
```
When marketing campaign sends, emit event to:
POST /analytics/campaign-completed {
  campaignId: string;
  merchantId: string;
  stats: { sent, delivered, failed, opened, clicked, converted }
  revenue?: number;
}
```
**Action:** rez-marketing-service -> analytics service

#### 6.1.4 User Engagement Score API
```
GET /users/:userId/engagement-score
Response: {
  adInteractionScore: number;      // 0-100 based on ad clicks/impressions
  marketingEngagementScore: number; // 0-100 based on email opens/clicks
  overallScore: number;
  segments: string[];
}
```
**Action:** rez-marketing-service exposes unified score consumed by targeting

### 6.2 Medium Priority

#### 6.2.1 Shared Voucher Pool
```
POST /campaigns/:id/attach-voucher
{
  voucherId: string;
  autoApply: boolean;
}
```
**Action:** Link vouchers to campaigns for auto-application on conversion

#### 6.2.2 Keyword Ad Serving Integration
```
// In rez-ads-service serve.ts
GET /ads/serve?placement=search_result&keyword=biryani
// Should include KeywordBid results alongside regular ads
```
**Action:** Merge KeywordBid auction results into ad serving pipeline

#### 6.2.3 Real-time Interest Sync
```
// When UserInterestProfile updated, notify ad service
POST /ads/interests-updated
{
  userId: string;
  newInterests: string[];
  removedInterests: string[];
}
```
**Action:** rez-marketing-service -> rez-ads-service interest updates

### 6.3 Lower Priority

#### 6.3.1 Unified Push Token Management
- Consolidate userdevices collection across services
- Single source of truth for push tokens

#### 6.3.2 Cross-Service Rate Limiting
- Shared rate limit configuration
- Coordinated rate limit state

#### 6.3.3 Campaign-Ads Budget Coordination
- When marketing campaign uses budget, deduct from merchant wallet
- Unified billing across ads and marketing

---

## Appendix A: Environment Variables

### rez-ads-service
| Variable | Required | Description |
|----------|----------|-------------|
| ADS_MONGO_URI / MONGO_URI / MONGODB_URI | Yes | MongoDB connection |
| REDIS_URL | Yes | Redis connection |
| JWT_SECRET | Yes | JWT verification |
| SENTRY_DSN | No | Error tracking |
| CORS_ORIGIN | No | CORS origins |
| PORT | No | Server port (default 4007) |
| INTENT_CAPTURE_URL | No | Intent graph endpoint |
| INTERNAL_SERVICE_TOKEN | No | Internal auth token |

### rez-marketing-service
| Variable | Required | Description |
|----------|----------|-------------|
| MONGODB_URI | Yes | MongoDB connection |
| REDIS_URL | Yes | Redis/BullMQ connection |
| INTERNAL_SERVICE_TOKENS_JSON / INTERNAL_SERVICE_TOKEN | Yes | Service auth |
| SENTRY_DSN | No | Error tracking |
| CORS_ORIGIN | No | CORS origins |
| PORT | No | Server port (default 4000) |
| WHATSAPP_WEBHOOK_VERIFY_TOKEN | Yes | WhatsApp verification |
| WHATSAPP_APP_SECRET | No | WhatsApp HMAC |
| ADBAZAAR_INTERNAL_KEY | No | AdBazaar auth |

### rez-notification-events
| Variable | Required | Description |
|----------|----------|-------------|
| MONGODB_URI | Yes | MongoDB connection |
| REDIS_URL | Yes | BullMQ connection |
| INTERNAL_SERVICE_TOKEN | Yes | Internal auth |
| SENDGRID_API_KEY | No | Email delivery |
| SENDGRID_FROM_EMAIL | No | Email sender |
| MSG91_API_KEY | No | SMS delivery |
| TWILIO_ACCOUNT_SID | No | WhatsApp/SMS |
| TWILIO_AUTH_TOKEN | No | WhatsApp/SMS |
| TWILIO_WHATSAPP_FROM | No | WhatsApp sender |
| WHATSAPP_API_TOKEN | No | Meta WhatsApp |
| WHATSAPP_PHONE_NUMBER_ID | No | Meta WhatsApp |
| WHATSAPP_API_VERSION | No | WhatsApp API version |
| HEALTH_PORT | No | Health server port |

---

## Appendix B: Collection Dependencies

| Collection | Owned By | Used By |
|------------|----------|---------|
| AdCampaign | rez-ads-service | rez-ads-service |
| AdInteraction | rez-ads-service | rez-ads-service |
| MarketingCampaign | rez-marketing-service | rez-marketing-service, rez-notification-events |
| KeywordBid | rez-marketing-service | rez-marketing-service |
| UserInterestProfile | rez-marketing-service | rez-marketing-service, rez-ads-service |
| Voucher | rez-marketing-service | rez-marketing-service |
| VoucherRedemption | rez-marketing-service | rez-marketing-service |
| userdevices | rez-notification-events | rez-notification-events |
| notifications | rez-notification-events | rez-notification-events |
| usernotificationsettings | rez-notification-events | rez-notification-events |
| users | Shared | All services |

---

*End of Audit Report*
