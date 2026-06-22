# AdOS - Advertising Operating System

> **Intelligence layer for real-world advertising**

---

## What is AdOS?

AdOS is the brain that optimizes advertising campaigns. It takes raw performance data and turns it into actionable budget allocations.

---

## Architecture

```
ReZ Mind (Context Signals)
        ↓
┌─────────────────────────────────────┐
│         AdOS Intelligence Layer        │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Campaign Intelligence       │   │
│  │ ├── ROI Engine           │   │
│  │ ├── Scoring Engine       │   │
│  │ ├── Allocation Engine    │   │
│  │ └── Guardrails          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ DOOH Screen Network       │   │
│  │ ├── Screen Manager       │   │
│  │ ├── Delivery Engine      │   │
│  │ └── Playlist Generator   │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
        ↓
Campaign Recommendations + Screen Playlists
```

---

## Two Parts of AdOS

### 1. Campaign Intelligence
Optimizes ad budget allocation for campaigns.

### 2. DOOH Screen Network
Delivers ads to physical screens (cab tablets, restaurant TVs, mall kiosks, etc.)

---

## Campaign Intelligence Services

### 1. ROI Engine (`services/roi.service.ts`)
Calculates Return on Ad Spend with confidence scoring.

```typescript
import { ROIEngine } from './services/roi.service'

const roi = new ROIEngine()
const result = roi.calculateROI(listing, metrics, budget, 30)
```

### 2. Scoring Engine (`services/scoring.service.ts`)
Scores listings using weighted factors.

```typescript
import { ScoringEngine } from './services/scoring.service'

const scoring = new ScoringEngine()
const scored = scoring.scoreListings(listings, metricsMap, budget)
```

### 3. Allocation Engine (`services/allocation.service.ts`)
Intelligently distributes budget across listings.

```typescript
import { AllocationEngine } from './services/allocation.service'

const allocation = new AllocationEngine()
const result = allocation.allocate(listings, metricsMap, totalBudget)
```

### 4. Guardrails Engine (`services/guardrails.service.ts`)
Enforces safety limits and prevents abuse.

```typescript
import { GuardrailsEngine } from './services/guardrails.service'

const guardrails = new GuardrailsEngine()
const result = guardrails.validate(listings, metricsMap, totalBudget)
```

---

## DOOH Screen Network Services

### Screen Types Supported

| Type | Examples | Best For |
|------|----------|----------|
| `cab_tablet` | Ola, Uber, ReZ Cabs | Fintech, Food |
| `restaurant_tv` | Cafe, QSRs | Food delivery |
| `mall_kiosk` | Mall directories | Retail, Fashion |
| `gym_screen` | Fitness centers | Health, Supplements |
| `salon_display` | Salons, Spas | Beauty, Wellness |
| `hotel_lobby` | Hotel displays | Travel, Tourism |
| `airport_display` | Terminals | Premium brands |
| `billboard_digital` | Outdoor LED | Brand awareness |

### 1. Screen Manager (`dooh/services/screen.service.ts`)
Manages screens in the network.

```typescript
import { ScreenManager } from './dooh/services/screen.service'

const manager = new ScreenManager()
manager.register(screen)
manager.updateStatus(screenId, 'active')
```

### 2. Delivery Engine (`dooh/services/delivery.service.ts`)
Decides which ads to show on screens.

```typescript
import { DeliveryEngine } from './dooh/services/delivery.service'

const delivery = new DeliveryEngine()
const ads = delivery.getAdsForScreen(request, screen, campaigns)
```

### 3. Playlist Generator (`dooh/services/playlist.service.ts`)
Creates optimized playlists for screens.

```typescript
import { PlaylistGenerator } from './dooh/services/playlist.service'

const generator = new PlaylistGenerator()
const playlist = generator.generatePlaylist(request, screen, campaigns)
```

---

## Context Targeting (from ReZ Mind)

```json
{
  "location_cluster": "IT workers",
  "time_pattern": "evening commute",
  "category_intent": ["food", "delivery"],
  "density": "dense"
}
```

### Ad Targeting by Context

| Context | Time | Ads Shown |
|---------|------|-----------|
| Morning commute | 8-10 AM | Coffee, Breakfast, Transit |
| Lunch | 12-2 PM | Food, Restaurants |
| Evening commute | 5-7 PM | Entertainment, Delivery |
| Weekend | Sat/Sun | Shopping, Family |
| Rainy day | Weather signal | Indoor activities |

---

## Revenue Model

### Campaign Intelligence
| Type | Description |
|------|-------------|
| Commission | 10-20% on booking |
| Coin margin | Markup on coin purchases |
| Performance fees | Cost per result |

### DOOH Screens
| Type | Description |
|------|-------------|
| CPM | ₹10-50 per 1000 impressions |
| Slot pricing | ₹100-500 per 10-sec slot |
| Performance | ₹2-20 per scan/visit |

**Screen Owner Share:** 60% owner / 40% platform

---

## Files

```
adsos/
├── src/
│ ├── index.ts              # Main orchestrator
│ ├── types.ts             # TypeScript interfaces
│ ├── services/
│ │ ├── roi.service.ts         # ROI calculations
│ │ ├── scoring.service.ts     # Listing scoring
│ │ ├── allocation.service.ts   # Budget allocation
│ │ └── guardrails.service.ts   # Safety checks
│ └── dooh/
│     ├── index.ts             # DOOH orchestrator
│     ├── types.ts            # Screen types
│     └── services/
│         ├── screen.service.ts    # Screen management
│         ├── delivery.service.ts  # Ad delivery
│         └── playlist.service.ts # Playlist generation
├── package.json
└── README.md
```

---

## Usage

### Campaign Optimization
```typescript
import { createAdOS } from './src'

const ados = createAdOS()
const result = ados.optimize({
  budget: 50000,
  duration_days: 30,
  listings: myListings
})
```

### DOOH Screen Network
```typescript
import { DOOHNetwork } from './src/dooh'

const dooh = new DOOHNetwork()
const ads = dooh.getAdsForScreen(screenId, campaigns)
const playlist = dooh.generatePlaylist(screenId, campaigns)
```

---

## Ecosystem Integration

```
ReZ Mind → signals → AdOS
        ↓
┌───────────────────┐
│ Campaign Intel    │ → AdBazaar
│ DOOH Network     │ → Physical screens
│ AdsQR            │ → QR tracking
└───────────────────┘
```

---

## Positioning

> **"AdOS turns every screen and campaign into measurable revenue."**

---

## Next Steps

1. Connect to AdBazaar for campaign inventory
2. Integrate ReZ Mind for context signals
3. Deploy to test screens
4. Build Screen OS player app
5. Scale the network
