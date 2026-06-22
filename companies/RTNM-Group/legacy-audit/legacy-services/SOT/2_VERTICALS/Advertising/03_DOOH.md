# DOOH (Digital Out of Home) Service

> Last Updated: 2026-05-10

## Overview

DOOH (Digital Out of Home) is the screen network management component of the REZ advertising ecosystem. It enables dynamic, contextually-relevant advertising across a distributed network of digital screens in taxis, restaurants, malls, airports, and other locations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           DOOH NETWORK                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    DOOH Engine (AdOS)                          │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │  │
│  │  │ Delivery Engine │  │ Playlist Gen    │  │ Screen Mgr  │  │  │
│  │  │ (Ad Selection)  │  │ (Scheduling)    │  │ (Registry)  │  │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│         ┌──────────────────┼──────────────────┐                     │
│         ▼                  ▼                  ▼                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│  │  Screens    │    │  Campaigns  │    │  Creatives  │           │
│  │  (20+ types)│    │  (Targeting)│    │  (Assets)   │           │
│  └─────────────┘    └─────────────┘    └─────────────┘           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Screen Types

### Ground Transport

| Type | Example | Audience |
|------|---------|----------|
| `cab_tablet` | Ola/Uber/ReZ cabs | Office workers, commuters |
| `bus_shelter` | City bus stops | Local commuters |
| `bus_interior` | Public buses | Transit riders |
| `train_display` | Local trains | Commuters |
| `metro_screen` | Metro stations | Urban commuters |

### Aviation

| Type | Example | Audience |
|------|---------|----------|
| `flight_seatback` | In-flight entertainment | Travelers |
| `flight_overhead` | Overhead displays | Travelers |
| `flight_entrance` | Doorframe screens | Travelers |
| `airport_display` | Terminal screens | Travelers, visitors |
| `airport_gate` | Gate displays | Boarding passengers |
| `airport_lounge` | Lounge screens | Premium travelers |

### Hospitality

| Type | Example | Audience |
|------|---------|----------|
| `restaurant_tv` | Restaurant menus | Foodies, families |
| `hotel_lobby` | Hotel displays | Travelers, guests |
| `hotel_room` | Room TVs | Hotel guests |

### Retail

| Type | Example | Audience |
|------|---------|----------|
| `mall_kiosk` | Mall directories | Shoppers |
| `mall_directory` | Directory screens | Mall visitors |
| `gym_screen` | Fitness centers | Health-focused |
| `salon_display` | Salon mirrors | Beauty enthusiasts |

### Other

| Type | Example | Audience |
|------|---------|----------|
| `office_lobby` | Office reception | Office workers |
| `office_elevator` | Elevator screens | Office workers |
| `billboard_digital` | LED billboards | Street traffic |
| `generic_display` | Generic screens | Various |

## Screen Data Model

```typescript
interface Screen {
  id: string
  name: string
  type: ScreenType
  locationType: LocationType

  // Location
  location: {
    city: string
    area: string
    zone?: string
    lat: number
    lng: number
    address?: string
  }

  // Hardware
  hardware?: {
    model?: string
    os?: string
    resolution?: string
    screenSize?: number  // inches
  }

  // Network
  networkId?: string
  ipAddress?: string
  macAddress?: string

  // Owner
  ownerId: string
  ownerType: 'owned' | 'partner' | 'external'

  // Status
  status: 'active' | 'inactive' | 'offline' | 'maintenance'
  lastSeen?: Date
  lastSync?: Date

  // Schedule
  operatingHours?: {
    open: string   // "09:00"
    close: string  // "22:00"
    timezone: string
  }

  // Audience
  audienceProfile?: {
    primary: AudienceSegment[]
    secondary?: AudienceSegment[]
    peakHours: TimeSlot[]
    avgDwellTime: number  // seconds
    dailyFootfall?: number
  }

  // Pricing
  cpm: number
  slotPricing?: SlotPricing[]
}
```

## DOOH Campaign

```typescript
interface DOOHCampaign {
  id: string
  name: string
  brandId: string

  // Content
  creatives: Creative[]

  // Targeting
  targeting: {
    cities?: string[]
    areas?: string[]
    screenTypes?: ScreenType[]
    locationTypes?: LocationType[]
    audienceSegments?: AudienceSegment['type'][]
    dayParts?: {
      morning?: boolean   // 6-12
      afternoon?: boolean // 12-17
      evening?: boolean   // 17-22
    }
    weekdaysOnly?: boolean
  }

  // Budget
  budget: number
  spent: number

  // Schedule
  startDate: Date
  endDate: Date
  scheduleType: 'continuous' | 'scheduled' | 'time_slots'

  // Status
  status: 'draft' | 'active' | 'paused' | 'completed' | 'budget_exhausted'

  // Metrics
  metrics: {
    impressions: number
    uniqueImpressions: number
    scans: number
    visits: number
    purchases: number
    revenue: number
    scanRate: number
    visitRate: number
    purchaseRate: number
    cpmActual: number
    cpcActual: number
  }
}
```

## Core Services

### Screen Manager

Manages screen registry and heartbeats:

```typescript
class ScreenManager {
  register(screen: Screen): void
  get(screenId: string): Screen | undefined
  updateStatus(screenId: string, status: ScreenStatus): void
  query(filter: ScreenQuery): Screen[]
  processHeartbeat(heartbeat: ScreenHeartbeat): ContentUpdate | null
  getStats(): NetworkStats
}
```

### Playlist Generator

Creates optimized playlists for screens:

```typescript
class PlaylistGenerator {
  generatePlaylist(
    request: PlaylistRequest,
    screen: Screen,
    activeCampaigns: DOOHCampaign[]
  ): Playlist

  // Filters campaigns by targeting criteria
  // Scores campaigns by budget urgency and audience match
  // Builds slots with gap enforcement
}
```

### Delivery Engine

Decides which ads to show:

```typescript
class DeliveryEngine {
  getAdsForScreen(
    request: DeliveryRequest,
    screen: Screen,
    campaigns: DOOHCampaign[]
  ): DeliveryResponse

  // Filters eligible campaigns
  // Ranks by audience match, time score, urgency
  // Selects top N slots
}
```

## Playlist Structure

```typescript
interface Playlist {
  id: string
  screenId: string
  date: Date

  slots: PlaylistSlot[]

  totalDuration: number  // seconds
  generatedAt: Date
  version: number
}

interface PlaylistSlot {
  position: number
  campaignId: string
  creativeId: string
  startTime: string      // "09:00:00"
  duration: number       // seconds
  scheduledImpressions: number
  actualImpressions?: number
}
```

## Screen OS Configuration

Lightweight client installed on screens:

```typescript
interface ScreenOSConfig {
  serverUrl: string
  apiKey: string
  syncInterval: number     // seconds
  playlistRefresh: number   // seconds
  heartbeatInterval: number // seconds (default: 60)
  offlineBufferHours: number
}
```

### Screen Heartbeat

Screens send periodic heartbeats:

```typescript
interface ScreenHeartbeat {
  screenId: string
  timestamp: Date
  status: ScreenStatus
  playlistVersion: number
  currentCampaignId?: string
  impressionsLastHour: number
  errors?: string[]
}
```

## Context Signals (ReZ Mind Integration)

```typescript
interface ContextSignal {
  signalType: 'weather' | 'time' | 'location_density' | 'event' | 'category_intent'
  condition: string
  action: 'boost' | 'reduce' | 'show' | 'hide'
  campaignId?: string
}

// Example: Boost cold-weather ads when temperature drops
{
  signalType: 'weather',
  condition: 'temperature < 20',
  action: 'boost',
  campaignId: 'warm-beverage-campaign'
}
```

## Revenue Model

```typescript
interface RevenueModel {
  type: 'cpm' | 'slot' | 'performance' | 'hybrid'

  // CPM
  cpmRate?: number

  // Slot pricing
  slotPricing?: SlotPricing[]

  // Performance
  performanceRate?: number
  performanceMetric?: 'scan' | 'visit' | 'purchase'

  // Hybrid
  baseCpm?: number
  performanceBonus?: number
}

interface RevenueShare {
  screenOwner: number  // percentage
  platform: number    // percentage
  contentProvider?: number
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/screens/register` | Register new screen |
| `GET` | `/api/screens` | List screens |
| `POST` | `/api/playlist/generate` | Generate playlist |
| `POST` | `/api/heartbeat` | Process heartbeat |

## Environment Variables

```bash
DOOH_SERVER_URL=https://dooh.rezapp.com
DOOH_API_KEY=xxx
```

## File Structure

```
dooh/
├── index.ts                    # Main entry
├── types.ts                   # Type definitions
└── services/
    ├── screen.service.ts       # Screen management
    ├── playlist.service.ts     # Playlist generation
    └── delivery.service.ts     # Ad delivery

adsos/src/dooh/
├── index.ts                    # DOOH module entry
├── types.ts                    # Full type definitions
└── services/
    ├── screen.service.ts        # Screen manager
    ├── playlist.service.ts      # Playlist generator
    └── delivery.service.ts      # Delivery engine

rez-dooh-service/
├── index.ts                    # Service entry
└── types.ts                    # Types

dooh-screen-app/
└── (screen client app)

dooh-mobile/
└── (mobile companion app)
```

## Related Documentation

- [README](README.md) - Advertising vertical overview
- [AdBazaar](01_ADBAZAAR.md) - Marketplace service
- [AdsQr](02_ADSQR.md) - QR campaigns
