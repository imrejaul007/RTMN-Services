# Database Schema

## Overview

The ReZ platform uses **MongoDB** as the primary document database across all services. Each microservice maintains its own database with collections optimized for that domain's access patterns.

**Database Configuration:**
- Default Port: `27017`
- Connection pooling enabled
- Read preference: `primaryPreferred` for read replicas
- Write concern: `majority` for critical operations
- TTL indexes for automatic data expiration

---

## Commerce Platform

### Collections

#### `users`
User accounts and authentication data.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| email | String | Unique | User email address |
| phone | String | Unique, Sparse | Phone number (E.164 format) |
| passwordHash | String | No | bcrypt hashed password |
| firstName | String | No | User first name |
| lastName | String | No | User last name |
| profileImage | String | No | CDN URL to profile image |
| dateOfBirth | Date | No | Date of birth |
| gender | String | No | Gender identity |
| status | String | Yes | active/suspended/pending_verification |
| emailVerified | Boolean | No | Email verification status |
| phoneVerified | Boolean | No | Phone verification status |
| kycStatus | String | Yes | none/submitted/pending/approved/rejected |
| kycData | Object | No | KYC documents and metadata |
| preferences | Object | No | User preferences (notifications, language) |
| loyaltyTier | String | Yes | bronze/silver/gold/platinum |
| loyaltyPoints | Number | No | Current loyalty points balance |
| referralCode | String | Unique | User's referral code |
| referredBy | ObjectId | No | Reference to referring user |
| createdAt | Date | Yes | Account creation timestamp |
| updatedAt | Date | Yes | Last update timestamp |
| lastLoginAt | Date | No | Last login timestamp |

**Indexes:**
- `{ email: 1 }` - Unique index for login
- `{ phone: 1 }` - Sparse unique index for SMS auth
- `{ status: 1, createdAt: -1 }` - User management queries
- `{ referralCode: 1 }` - Referral lookups
- `{ "kycStatus": 1, "createdAt": -1 }` - KYC processing queue

#### `merchants`
Merchant/business accounts.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| businessName | String | Unique | Legal business name |
| tradingName | String | No | Display/brand name |
| merchantCode | String | Unique | System merchant identifier |
| category | String | Yes | Business category (retail/food/service) |
| subcategory | String | No | Business subcategory |
| email | String | Unique | Business email |
| phone | String | No | Business phone |
| address | Object | No | Business address |
| location | Object | No | GeoJSON point for location search |
| logo | String | No | CDN URL to logo |
| coverImage | String | No | CDN URL to cover image |
| description | String | No | Business description |
| status | String | Yes | pending/active/suspended/archived |
| verificationStatus | String | Yes | unverified/pending/verified |
| bankDetails | Object | No | Bank account information |
| commissionRate | Number | No | Platform commission percentage |
| rating | Number | No | Average merchant rating |
| reviewCount | Number | No | Total review count |
| ownerId | ObjectId | Yes | Reference to user who owns merchant |
| settings | Object | No | Merchant-specific settings |
| operatingHours | Object | No | Business hours by day |
| createdAt | Date | Yes | Registration timestamp |
| updatedAt | Date | Yes | Last update timestamp |

**Indexes:**
- `{ businessName: 1 }` - Search by business name
- `{ status: 1, category: 1 }` - Merchant listings
- `{ location: "2dsphere" }` - Geospatial queries
- `{ ownerId: 1 }` - Owner's merchants

#### `orders`
Customer orders and transactions.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| orderNumber | String | Unique | Human-readable order number |
| userId | ObjectId | FK | Reference to users |
| merchantId | ObjectId | FK | Reference to merchants |
| type | String | Yes | dine_in/takeaway/delivery |
| items | Array | No | Order items array |
| items[].productId | ObjectId | No | Product reference |
| items[].name | String | No | Product name at time of order |
| items[].quantity | Number | No | Quantity ordered |
| items[].unitPrice | Number | No | Price per unit |
| items[].subtotal | Number | No | Line item subtotal |
| items[].options | Array | No | Selected product options |
| items[].notes | String | No | Special instructions |
| subtotal | Number | No | Order subtotal before tax |
| taxAmount | Number | No | Tax amount |
| serviceFee | Number | No | Service fee |
| deliveryFee | Number | No | Delivery fee |
| discount | Number | No | Discount amount |
| total | Number | Yes | Final order total |
| currency | String | No | ISO currency code (default: BDT) |
| status | String | Yes | pending/confirmed/preparing/ready/completed/cancelled |
| paymentStatus | String | Yes | pending/paid/refunded/partially_refunded |
| paymentMethod | String | No | card/wallet/cash/bnpl |
| paymentId | ObjectId | No | Reference to payment |
| fulfillmentStatus | String | Yes | unfulfilled/partial/fulfilled |
| deliveryAddress | Object | No | Delivery address for orders |
| deliveryPartnerId | ObjectId | No | Assigned delivery partner |
| estimatedReadyTime | Date | No | Estimated ready time |
| actualReadyTime | Date | No | Actual ready time |
| completedAt | Date | No | Order completion timestamp |
| notes | String | No | Order notes |
| rating | Number | No | Customer rating (1-5) |
| review | String | No | Customer review text |
| source | String | Yes | pos/app/web/widget |
| channelId | ObjectId | No | White-label channel reference |
| createdAt | Date | Yes | Order creation timestamp |
| updatedAt | Date | Yes | Last update timestamp |

**Indexes:**
- `{ orderNumber: 1 }` - Order lookup by number
- `{ userId: 1, createdAt: -1 }` - User order history
- `{ merchantId: 1, status: 1 }` - Merchant order management
- `{ status: 1, createdAt: -1 }` - Status-based queries
- `{ createdAt: -1 }` - Reporting queries
- `{ "deliveryAddress.location": "2dsphere" }` - Delivery zone queries

#### `products`
Products/menu items offered by merchants.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| merchantId | ObjectId | FK | Reference to merchants |
| name | String | Yes | Product name |
| slug | String | Unique | URL-friendly identifier |
| description | String | No | Product description |
| category | String | Yes | Product category |
| subcategory | String | No | Product subcategory |
| tags | Array | No | Search tags |
| images | Array | No | CDN URLs to product images |
| basePrice | Number | Yes | Base price |
| currency | String | No | ISO currency code |
| options | Array | No | Available product options |
| options[].name | String | No | Option group name |
| options[].required | Boolean | No | Is selection required |
| options[].multiSelect | Boolean | No | Allow multiple selections |
| options[].choices | Array | No | Available choices |
| addons | Array | No | Available add-ons |
| modifiers | Array | No | Price modifiers |
| nutrition | Object | No | Nutritional information |
| allergens | Array | No | Allergen information |
| preparationTime | Number | No | Prep time in minutes |
| isAvailable | Boolean | Yes | Availability status |
| isFeatured | Boolean | No | Featured item flag |
| isPopular | Boolean | No | Popular item flag |
| sortOrder | Number | No | Display sort order |
| metadata | Object | No | Additional metadata |
| createdAt | Date | No | Creation timestamp |
| updatedAt | Date | No | Last update timestamp |

**Indexes:**
- `{ merchantId: 1, category: 1 }` - Merchant menu by category
- `{ isAvailable: 1, isFeatured: 1 }` - Available featured items
- `{ tags: 1 }` - Tag-based search

#### `payments`
Payment transactions.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| transactionId | String | Unique | External transaction ID |
| orderId | ObjectId | FK | Reference to orders |
| userId | ObjectId | FK | Reference to users |
| merchantId | ObjectId | FK | Reference to merchants |
| amount | Number | Yes | Payment amount |
| currency | String | No | ISO currency code |
| type | String | Yes | payment/refund/chargeback |
| method | String | Yes | card/wallet/bnpl/cash |
| provider | String | No | Payment provider (stripe/bkash/etc) |
| providerRef | String | No | Provider's transaction reference |
| status | String | Yes | pending/processing/completed/failed/refunded |
| gatewayResponse | Object | No | Raw gateway response |
| metadata | Object | No | Additional payment metadata |
| createdAt | Date | Yes | Payment initiation timestamp |
| completedAt | Date | No | Payment completion timestamp |
| updatedAt | Date | No | Last update timestamp |

**Indexes:**
- `{ transactionId: 1 }` - Transaction lookup
- `{ orderId: 1 }` - Order payment history
- `{ userId: 1, createdAt: -1 }` - User payment history
- `{ status: 1, createdAt: -1 }` - Payment reconciliation

#### `loyalty_transactions`
Loyalty points transactions.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| userId | ObjectId | FK | Reference to users |
| type | String | Yes | earn/redeem/expire/adjust |
| points | Number | No | Points amount (positive/negative) |
| balance | Number | No | Balance after transaction |
| orderId | ObjectId | No | Related order reference |
| merchantId | ObjectId | No | Merchant where points earned |
| description | String | No | Transaction description |
| expiresAt | Date | No | Points expiration date |
| status | String | Yes | pending/completed/cancelled |
| createdAt | Date | Yes | Transaction timestamp |

**Indexes:**
- `{ userId: 1, createdAt: -1 }` - User transaction history
- `{ expiresAt: 1 }` - TTL index for expiration

#### `reviews`
Product and merchant reviews.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| userId | ObjectId | FK | Reference to users |
| merchantId | ObjectId | FK | Reference to merchants |
| orderId | ObjectId | No | Reference to orders |
| rating | Number | Yes | Rating (1-5) |
| title | String | No | Review title |
| content | String | No | Review content |
| images | Array | No | Review images |
| service | Number | No | Service rating (1-5) |
| quality | Number | No | Quality rating (1-5) |
| value | Number | No | Value rating (1-5) |
| isVerifiedPurchase | Boolean | No | Verified order flag |
| isFeatured | Boolean | No | Featured review flag |
| status | String | Yes | pending/approved/rejected/hidden |
| reply | Object | No | Merchant reply |
| helpfulCount | Number | No | Helpful votes count |
| createdAt | Date | Yes | Review timestamp |
| updatedAt | Date | No | Last update timestamp |

**Indexes:**
- `{ merchantId: 1, status: 1, createdAt: -1 }` - Merchant reviews
- `{ userId: 1 }` - User reviews

---

## BNPL Service

### Collections

#### `bnpl_applications`
Buy Now Pay Later applications.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| applicationId | String | Unique | Human-readable application ID |
| userId | ObjectId | FK | Reference to users |
| merchantId | ObjectId | FK | Reference to merchants |
| orderId | ObjectId | No | Associated order |
| amount | Number | Yes | Requested amount |
| tenure | Number | No | Repayment tenure (weeks) |
| status | String | Yes | pending/approved/rejected/active/completed/defaulted |
| creditLimit | Number | No | Approved credit limit |
| usedAmount | Number | No | Amount currently used |
| availableCredit | Number | No | Available credit balance |
| riskScore | Number | No | Calculated risk score |
| decision | Object | No | Approval decision details |
| terms | Object | No | Repayment terms |
| scheduledPayments | Array | No | Payment schedule |
| createdAt | Date | Yes | Application timestamp |
| updatedAt | Date | Yes | Last update timestamp |

**Indexes:**
- `{ applicationId: 1 }` - Application lookup
- `{ userId: 1, status: 1 }` - User applications
- `{ status: 1, createdAt: -1 }` - Status queues

#### `bnpl_schedules`
Repayment schedules.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| applicationId | ObjectId | FK | Reference to bnpl_applications |
| userId | ObjectId | FK | Reference to users |
| scheduleNumber | Number | No | Installment number |
| dueDate | Date | Yes | Payment due date |
| amount | Number | No | Scheduled amount |
| principal | Number | No | Principal portion |
| interest | Number | No | Interest portion |
| paidAmount | Number | No | Amount paid |
| status | String | Yes | upcoming/due/overdue/paid/partially_paid |
| paidAt | Date | No | Payment timestamp |
| paymentMethod | String | No | Payment method used |
| createdAt | Date | No | Creation timestamp |

**Indexes:**
- `{ userId: 1, dueDate: 1 }` - User payment reminders
- `{ status: 1, dueDate: 1 }` - Payment processing

---

## Channel Manager Service

### Collections

#### `channels`
White-label channels.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| channelId | String | Unique | Channel identifier |
| name | String | No | Channel display name |
| slug | String | Unique | URL slug |
| ownerId | ObjectId | FK | Channel owner reference |
| type | String | Yes | restaurant/retail/service |
| branding | Object | No | White-label branding config |
| branding.primaryColor | String | No | Primary brand color |
| branding.secondaryColor | String | No | Secondary brand color |
| branding.logo | String | No | Channel logo URL |
| branding.favicon | String | No | Favicon URL |
| domain | String | Unique | Custom domain |
| settings | Object | No | Channel-specific settings |
| features | Object | No | Feature flags |
| isActive | Boolean | Yes | Channel active status |
| createdAt | Date | No | Creation timestamp |
| updatedAt | Date | No | Last update timestamp |

**Indexes:**
- `{ slug: 1 }` - Channel lookup
- `{ ownerId: 1 }` - Owner's channels
- `{ isActive: 1 }` - Active channel listing

#### `channel_merchants`
Merchant-channel associations.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| channelId | ObjectId | FK | Reference to channels |
| merchantId | ObjectId | FK | Reference to merchants |
| status | String | Yes | pending/active/suspended |
| commissionOverride | Number | No | Channel-specific commission |
| addedAt | Date | No | Association timestamp |

**Indexes:**
- `{ channelId: 1, merchantId: 1 }` - Compound unique
- `{ merchantId: 1 }` - Merchant's channels

---

## Instant Delivery Service

### Collections

#### `delivery_requests`
Delivery assignment requests.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| requestId | String | Unique | Human-readable request ID |
| orderId | ObjectId | FK | Reference to orders |
| merchantId | ObjectId | FK | Reference to merchants |
| userId | ObjectId | FK | Reference to users |
| pickupLocation | Object | No | Merchant location |
| pickupLocation.address | String | No | Pickup address |
| pickupLocation.coordinates | Object | No | GeoJSON point |
| deliveryLocation | Object | No | Customer delivery location |
| deliveryLocation.address | String | No | Delivery address |
| deliveryLocation.coordinates | Object | No | GeoJSON point |
| deliveryLocation.instructions | String | No | Delivery instructions |
| status | String | Yes | pending/assigned/picked_up/in_transit/delivered/failed |
| priority | String | Yes | low/normal/high/urgent |
| estimatedPickup | Date | No | Estimated pickup time |
| estimatedDelivery | Date | No | Estimated delivery time |
| actualPickup | Date | No | Actual pickup time |
| actualDelivery | Date | No | Actual delivery time |
| assignedPartnerId | ObjectId | No | Assigned delivery partner |
| assignedAt | Date | No | Assignment timestamp |
| route | Object | No | Optimized route data |
| distance | Number | No | Distance in meters |
| createdAt | Date | Yes | Request timestamp |

**Indexes:**
- `{ requestId: 1 }` - Request lookup
- `{ status: 1, createdAt: -1 }` - Status queues
- `{ assignedPartnerId: 1, status: 1 }` - Partner assignments
- `{ pickupLocation.coordinates: "2dsphere" }` - Zone matching

#### `delivery_partners`
Delivery partner profiles.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| partnerId | String | Unique | Partner identifier |
| userId | ObjectId | FK | Reference to users |
| vehicleType | String | Yes | bike/car/van |
| vehiclePlate | String | No | Vehicle plate number |
| status | String | Yes | online/offline/busy |
| currentLocation | Object | No | Current GeoJSON location |
| currentLocation.coordinates | Array | No | [longitude, latitude] |
| currentLocation.timestamp | Date | No | Location update time |
| isAvailable | Boolean | Yes | Availability status |
| zones | Array | No | Active delivery zones |
| stats | Object | No | Performance statistics |
| stats.totalDeliveries | Number | No | Total deliveries |
| stats.rating | Number | No | Average rating |
| stats.acceptanceRate | Number | No | Request acceptance rate |
| createdAt | Date | No | Registration timestamp |

**Indexes:**
- `{ partnerId: 1 }` - Partner lookup
- `{ status: 1, isAvailable: 1 }` - Availability queries
- `{ currentLocation: "2dsphere" }` - Location-based matching

---

## Intent Graph Service

### Collections

#### `intents`
Captured user intents.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| intentId | String | Unique | Intent identifier |
| userId | ObjectId | No | User reference (if known) |
| sessionId | String | Yes | Session identifier |
| type | String | Yes | search/browse/purchase/query |
| query | String | Yes | Original query text |
| entities | Array | No | Extracted entities |
| entities[].type | String | No | Entity type |
| entities[].value | String | No | Entity value |
| entities[].confidence | Number | No | Confidence score |
| confidence | Number | No | Overall intent confidence |
| response | Object | No | Generated response |
| source | String | Yes | chat/web/app/voice |
| channelId | ObjectId | No | Channel reference |
| metadata | Object | No | Additional metadata |
| createdAt | Date | Yes | Intent capture timestamp |

**Indexes:**
- `{ sessionId: 1, createdAt: -1 }` - Session intents
- `{ "entities.type": 1, "entities.value": 1 }` - Entity search
- `{ createdAt: -1 }` - Time-based analysis

#### `intent_graph`
Intent relationship graph.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| sourceIntent | String | Yes | Source intent identifier |
| targetIntent | String | Yes | Target intent identifier |
| relation | String | Yes | Relationship type |
| weight | Number | No | Relationship weight |
| frequency | Number | No | Co-occurrence count |
| lastUpdated | Date | No | Last update timestamp |

**Indexes:**
- `{ sourceIntent: 1, targetIntent: 1 }` - Unique edge
- `{ relation: 1, weight: -1 }` - Relation queries

---

## Chat Service

### Collections

#### `conversations`
Chat conversations.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| conversationId | String | Unique | Conversation identifier |
| type | String | Yes | direct/group/channel |
| participants | Array | No | Participant user IDs |
| lastMessage | Object | No | Last message preview |
| lastMessage.text | String | No | Message text |
| lastMessage.senderId | ObjectId | No | Sender user ID |
| lastMessage.timestamp | Date | No | Message timestamp |
| unreadCount | Map | No | Unread counts per user |
| metadata | Object | No | Conversation metadata |
| createdAt | Date | No | Creation timestamp |
| updatedAt | Date | Yes | Last activity timestamp |

**Indexes:**
- `{ participants: 1 }` - User conversations
- `{ updatedAt: -1 }` - Recent conversations

#### `messages`
Chat messages.

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| _id | ObjectId | PK | Primary key |
| conversationId | ObjectId | FK | Reference to conversations |
| senderId | ObjectId | FK | Sender user reference |
| type | String | Yes | text/image/file/location/product |
| content | String | No | Message content |
| metadata | Object | No | Message metadata |
| attachments | Array | No | Attached files |
| replyTo | ObjectId | No | Reply to message ID |
| reactions | Array | No | Message reactions |
| status | String | Yes | sent/delivered/read |
| readBy | Array | No | Read receipt user IDs |
| createdAt | Date | Yes | Send timestamp |

**Indexes:**
- `{ conversationId: 1, createdAt: -1 }` - Conversation messages
- `{ senderId: 1, createdAt: -1 }` - User sent messages

---

## Migrations

### Migration Strategy

Migrations follow a sequential versioning pattern with the following structure:

```
migrations/
  001_initial_schema.js
  002_add_user_preferences.js
  003_add_merchant_location.js
  ...
```

### Version History

| Version | Description | Applied At |
|---------|-------------|------------|
| 001 | Initial schema with users, merchants, orders | 2024-01-01 |
| 002 | Added user preferences and settings | 2024-01-15 |
| 003 | Added geospatial indexes for location search | 2024-02-01 |
| 004 | Added BNPL service collections | 2024-02-15 |
| 005 | Added channel manager collections | 2024-03-01 |
| 006 | Added delivery service collections | 2024-03-15 |
| 007 | Added intent graph collections | 2024-04-01 |
| 008 | Added chat service collections | 2024-04-15 |
| 009 | Added TTL indexes for session cleanup | 2024-05-01 |

### Rollback Procedure

1. Check migration status: `db.migrations.find({ status: 'completed' }).sort({ version: -1 })`
2. Identify target rollback version
3. Execute rollback command: `db.migrate:rollback --to [target-version]`
4. Verify data integrity after rollback

---

## Index Optimization

### Recommended Index Strategies

1. **Covered Queries**: Include only indexed fields in queries when possible
2. **Compound Indexes**: Order by selectivity (highest first)
3. **Partial Indexes**: Use for sparse or optional fields
4. **Geospatial Indexes**: Use for location-based queries
5. **TTL Indexes**: Use for automatic data expiration

### Query Patterns to Optimize

```javascript
// Good: Compound index for common query
db.orders.createIndex({ merchantId: 1, status: 1, createdAt: -1 })

// Good: Partial index for active records only
db.users.createIndex(
  { email: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
)

// Good: Geospatial index for delivery
db.delivery_requests.createIndex({ "pickupLocation.coordinates": "2dsphere" })
```

---

## Data Retention

| Collection | Retention Period | Archive Policy |
|------------|-----------------|----------------|
| sessions | 30 days | Auto-delete |
| orders | 7 years | Archive to cold storage |
| payments | 7 years | Archive to cold storage |
| messages | 1 year | Archive to cold storage |
| intents | 90 days | Auto-delete |
| logs | 30 days | Auto-delete |

---

## Security Considerations

1. **Field-Level Encryption**: Sensitive fields (passwordHash, bankDetails, kycData) are encrypted at rest
2. **Index Security**: Compound indexes avoid exposing sensitive data
3. **Audit Logging**: All write operations logged for compliance
4. **Data Masking**: PII masked in query results based on user permissions
