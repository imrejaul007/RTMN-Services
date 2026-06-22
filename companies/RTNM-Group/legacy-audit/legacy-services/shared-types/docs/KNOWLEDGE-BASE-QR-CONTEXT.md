# REZ Knowledge Base QR Context Service

## Overview

The REZ Knowledge Base Service now includes comprehensive QR context-specific knowledge bases that enable intelligent routing of user queries to the appropriate knowledge base based on the QR code source.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Unified Knowledge Router                      │
├─────────────────────────────────────────────────────────────────┤
│  routeToKnowledgeBase(query, context)                           │
│  detectQueryContext(query)                                       │
│  createContextFromQR(qrData)                                     │
│  matchQueryIntent(query, context)                                │
│  searchKBItems(query, context)                                   │
│  getQuestionResponse(query, context)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Hotel Room KB │    │Restaurant KB  │    │ Store KB      │
│               │    │               │    │               │
│ - Housekeeping│    │ - Dietary     │    │ - Link Types  │
│ - Room Service│    │ - Allergens   │    │ - Categories  │
│ - Spa         │    │ - Cuisine     │    │ - Services    │
│ - Concierge   │    │ - Pairings    │    │ - Common Q    │
│ - Maintenance │    │ - Spice Level │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
                                                      │
                                                      ▼
                                            ┌───────────────┐
                                            │ Campaign KB   │
                                            │               │
                                            │ - Reward Types│
                                            │ - Attribution│
                                            │ - Claim Proc │
                                            │ - Campaigns  │
                                            └───────────────┘
```

## QR Context Sources

| Source | Description | Knowledge Base |
|--------|-------------|---------------|
| `room_qr` | Hotel room service QR | Hotel Room Service KB |
| `menu_qr` | Restaurant menu QR | Restaurant Menu KB |
| `store_qr` | Store/Merchant QR | Store Merchant KB |
| `ads_qr` | Campaign/Ads QR | Campaign/Ads KB |
| `rez_now` | REZ Now quick access | Combined KB |
| `unknown` | Default/unknown | Combined KB |

## Knowledge Bases

### 1. Hotel Room Service KB

**File:** `src/kb/hotel-room.ts`

Handles all hotel room service related intents:

- **Housekeeping:** Towels, sheets, pillows, blankets, toiletries, ironing, turndown service
- **Room Service:** Beverages, snacks, meals, breakfast, desserts (with dietary info)
- **Spa:** Massages, facials, manicures, pedicures, body treatments
- **Concierge:** Reservations, taxi booking, tour booking, gift shopping, lost items
- **Maintenance:** AC issues, plumbing, electrical, door locks, WiFi problems
- **Amenities:** WiFi, gym, pool, parking, business center
- **Billing:** Balance inquiries, payment, checkout process

### 2. Restaurant Menu KB

**File:** `src/kb/restaurant-menu.ts`

Handles all restaurant menu related intents:

- **Dietary Options:** Vegetarian, vegan, gluten-free, Jain, halal, kosher, nut-free, diabetic-friendly
- **Allergens:** Milk, eggs, peanuts, tree nuts, shellfish, fish, soy, wheat, sesame
- **Cuisine Types:** Indian, Chinese, Italian, Mexican, Thai, Japanese, American, Mediterranean, French, Korean
- **Spice Levels:** 0 (No Spice) to 5 (Extremely Hot)
- **Food Pairings:** Wine, beer, cocktail, non-alcoholic, food combinations
- **Common Questions:** Wait times, portion sizes, customization options

### 3. Store Merchant KB

**File:** `src/kb/store-merchant.ts`

Handles all store and merchant related intents:

- **Link Types:** Website, menu, reservation, order, contact, social, gallery, reviews, loyalty, offers, about, FAQ
- **Store Categories:** Restaurant, grocery, pharmacy, electronics, fashion, beauty, home, sports, toys, books, jewelry, services
- **Services:** Delivery, pickup, installation, repair, customization, consultation, loyalty, gift wrapping, alteration, financing
- **Common Queries:** Hours, location, parking, accessibility, returns, warranty, loyalty, pricing, availability

### 4. Campaign/Ads KB

**File:** `src/kb/campaign-ads.ts`

Handles all campaign and advertising related intents:

- **Reward Types:** Coins, discount, sample, consultation, contest, voucher, upgrade, loyalty tier
- **Attribution Methods:** QR scan, store visit, purchase, digital engagement, referral, quiz
- **Claim Processes:** Step-by-step for each reward type
- **Campaign Types:** Welcome, seasonal, flash sale, loyalty, referral, gamification, social, product launch

## API Endpoints

### List Knowledge Bases
```http
GET /api/qr-context/knowledge-bases
```

### Get Knowledge Base Details
```http
GET /api/qr-context/hotel-room
GET /api/qr-context/restaurant-menu
GET /api/qr-context/store-merchant
GET /api/qr-context/campaign-ads
```

### Detect Context
```http
POST /api/qr-context/detect
{
  "query": "I need extra towels",
  // OR
  "qrData": {
    "type": "room_qr",
    "merchantId": "hotel-123"
  }
}
```

### Search Items
```http
POST /api/qr-context/search
{
  "query": "coffee",
  "context": { "source": "menu_qr" }
}
```

### Process Query
```http
POST /api/qr-context/query
{
  "query": "I am allergic to nuts",
  "context": { "source": "menu_qr" }
}
```

### Process QR Data
```http
POST /api/qr-context/process
{
  "qrData": {
    "type": "menu_qr",
    "merchantId": "restaurant-456"
  }
}
```

### Get Items from KB
```http
GET /api/qr-context/room/items?category=housekeeping&search=towel
```

## Usage Examples

### Example 1: Hotel Room Service Query
```typescript
import { createContextFromQR, matchQueryIntent, searchKBItems } from './kb';

// User scans hotel room QR
const context = createContextFromQR({
  type: 'room_qr',
  merchantId: 'hotel-123',
  userId: 'user-456'
});

const query = "I need fresh towels for my room";
const intent = matchQueryIntent(query, context);
// Returns: 'requests'

const items = searchKBItems(query, context);
// Returns: [{ id: 'towels', name: 'Extra Towels', ... }]
```

### Example 2: Restaurant Dietary Query
```typescript
import { createContextFromQR, getQuestionResponse } from './kb';

const context = createContextFromQR({
  type: 'menu_qr',
  merchantId: 'restaurant-789'
});

const response = getQuestionResponse("I am vegan, what can I eat?", context);
// Returns vegan-friendly response with recommendations
```

### Example 3: Campaign Reward Query
```typescript
import { detectQueryContext, routeToKnowledgeBase } from './kb';

const query = "How do I redeem my coins?";
const source = detectQueryContext(query);
// Returns: 'ads_qr'

const kb = routeToKnowledgeBase(query, { source, timestamp: new Date() });
// Returns: campaignAdsKB
```

## Unified Router API

```typescript
import UnifiedKnowledgeRouter from './kb';

// Get singleton instance
const router = UnifiedKnowledgeRouter.getInstance();

// Get knowledge base by context
const kb = router.getKnowledgeBase(context);

// Detect context from query
const source = router.detectContextFromQuery("I want to order food");

// Create context from QR data
const context = router.createContext(qrData);

// Match intent
const intent = router.matchIntent(query, context);

// Search items
const results = router.searchItems(query, context);

// Get common question response
const response = router.getCommonQuestionResponse(query, context);
```

## Context Slots

Each knowledge base tracks specific context slots:

| Knowledge Base | Slots |
|---------------|-------|
| Hotel Room | roomNumber, itemRequested, quantity, preferredTime, specialInstructions |
| Restaurant Menu | itemRequested, quantity, modifications, dietaryRestrictions, allergies, spiceLevel, preferredTime, diningOption |
| Store Merchant | storeCategory, productInterest, serviceRequested, locationContext, timeContext |
| Campaign/Ads | campaignId, rewardType, merchantId, userId, timestamp, locationVerified |

## Response Templates

### Greeting Responses
- Hotel Room: "Hello! Welcome to room service..."
- Restaurant: "Hello! Welcome to our restaurant..."
- Store: "Hello! Welcome to [Store Name]..."
- Campaign: "Hello! Welcome to REZ Rewards!..."

### Not Understood Response
Each KB has a consistent `notUnderstood` response encouraging users to rephrase their questions.

### Escalation Handling
Each KB has an `escalationPrompt` for transferring to human agents when queries cannot be resolved.

## File Structure

```
rez-knowledge-base-service/src/
├── kb/
│   ├── index.ts           # Exports all KBs and router
│   ├── hotel-room.ts      # Hotel/Room Service KB
│   ├── restaurant-menu.ts # Restaurant Menu KB
│   ├── store-merchant.ts  # Store/Merchant KB
│   ├── campaign-ads.ts    # Campaign/Ads KB
│   └── unifiedRouter.ts   # Context routing logic
├── routes/
│   ├── merchant.ts        # Existing merchant routes
│   └── qr-context.ts      # New QR context routes
└── index.ts               # Updated main service entry
```

## Version History

- **2.0.0** - Added QR context routing with unified knowledge base router
  - Added hotel-room.ts knowledge base
  - Added restaurant-menu.ts knowledge base
  - Added store-merchant.ts knowledge base
  - Added campaign-ads.ts knowledge base
  - Added unifiedRouter.ts for context-based routing
  - Updated index.ts with new routes and endpoints

- **1.0.0** - Initial merchant knowledge base service
