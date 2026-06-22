# ReZ Ecosystem - MongoDB Database Audit

## Databases

### 1. ReZ Database (All ReZ Apps)
```
mongodb+srv://work_db_user:RmptskyDLFNSJGCA@cluster0.ku78x6g.mongodb.net/rez-app
```

**Used by:**
- rez-app-consumer
- rez-now
- rez-merchant-service
- rez-order-service
- rez-auth-service
- rez-catalog-service
- rez-search-service
- rez-gamification-service
- rez-ads-service
- rez-media-events
- analytics-events

### 2. Hotel PMS Database
```
mongodb+srv://work_db_user:KWQ5Te51URo9hPtq@rez-hotel-pms.xlr3tsy.mongodb.net/rez-hotel-pms
```

**Used by:**
- Hotel OTA
- Hotel PMS

---

## Collections in ReZ Database

| Collection | Service | Purpose |
|------------|---------|---------|
| users | rez-auth-service | User accounts |
| orders | rez-order-service | Orders |
| stores | rez-catalog-service | Stores/Merchants |
| products | rez-catalog-service | Products |
| sessions | rez-auth-service | User sessions |
| notifications | rez-notification-service | Notifications |
| wallets | rez-wallet-service | User wallets |

---

## Intent Graph Collections

Add to **ReZ Database** (`rez-app`):

```javascript
// intents collection
{
  _id: ObjectId,
  userId: String,           // User ID
  appType: String,          // hotel_ota, restaurant, retail, etc.
  category: String,          // TRAVEL, DINING, RETAIL, etc.
  intentKey: String,        // e.g., "hotel_mumbai_weekend"
  intentQuery: String,      // Original search query
  confidence: Number,       // 0.0 - 1.0
  status: String,           // ACTIVE, DORMANT, FULFILLED, EXPIRED
  firstSeenAt: Date,
  lastSeenAt: Date,
  signals: [{
    eventType: String,    // search, view, cart_add, etc.
    weight: Number,
    data: Object,
    capturedAt: Date
  }]
}

// dormantIntents collection
{
  _id: ObjectId,
  userId: String,
  appType: String,
  category: String,
  intentKey: String,
  dormancyScore: Number,
  revivalScore: Number,
  daysDormant: Number,
  lastNudgeSent: Date,
  nudgeCount: Number,
  idealRevivalAt: Date,
  status: String,           // active, paused, revived
  revivedAt: Date
}

// merchantKnowledge collection
{
  _id: ObjectId,
  merchantId: String,
  type: String,             // menu, policy, faq, offer, hours, contact
  title: String,
  content: String,
  tags: [String],
  metadata: Object,
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
}

// crossAppProfiles collection
{
  _id: ObjectId,
  userId: String,
  travelIntentCount: Number,
  diningIntentCount: Number,
  retailIntentCount: Number,
  dormantTravelCount: Number,
  dormantDiningCount: Number,
  dormantRetailCount: Number,
  totalConversions: Number,
  travelAffinity: Number,
  diningAffinity: Number,
  retailAffinity: Number,
  updatedAt: Date
}

// nudges collection
{
  _id: ObjectId,
  dormantIntentId: String,
  userId: String,
  channel: String,          // push, email, sms, in_app
  message: String,
  status: String,           // pending, sent, delivered, clicked, converted, failed
  sentAt: Date,
  deliveredAt: Date,
  clickedAt: Date,
  convertedAt: Date,
  error: String,
  createdAt: Date
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         MongoDB: rez-app (ReZ Database)            │
├─────────────────────────────────────────────────────┤
│  Collections:                                       │
│  • users, orders, stores, products, etc.           │
│  • intents ⭐ NEW                                 │
│  • intentSignals ⭐ NEW                           │
│  • dormantIntents ⭐ NEW                           │
│  • merchantKnowledge ⭐ NEW                        │
│  • crossAppProfiles ⭐ NEW                        │
│  • nudges ⭐ NEW                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│        MongoDB: rez-hotel-pms (PMS Database)     │
├─────────────────────────────────────────────────────┤
│  Collections:                                       │
│  • hotels, bookings, rooms, guests, etc.            │
└─────────────────────────────────────────────────────┘
```
