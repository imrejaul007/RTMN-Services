# HOJAI HYPERLOCAL PLATFORM SPECIFICATION
**Version:** 1.0 | **Date:** May 29, 2026 | **Status:** ARCHITECTURE SPEC

---

## Executive Summary

**Hyperlocal Platform** brings real-world intelligence to Hojai.

It connects:
- **Physical locations** (stores, venues, hotspots)
- **Customer behavior** (who goes where, when)
- **Demand patterns** (what's popular, when)
- **Event impact** (how events affect nearby businesses)

This is Hojai's unique competitive advantage.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HYPERLOCAL PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       DATA LAYER                                      │   │
│  │                                                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │  Zones  │ │ Venues │ │  Events  │ │ Patterns │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      INTELLIGENCE LAYER                              │   │
│  │                                                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │  Demand  │ │  Event   │ │  Area    │ │  Venue   │           │   │
│  │  │  Engine  │ │  Impact   │ │  Score   │ │ Match    │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       API LAYER                                      │   │
│  │                                                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │   Zone   │ │ Location │ │  Search  │ │ Analytics│           │   │
│  │  │   API    │ │    API    │ │    API    │ │    API    │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Hierarchy

### 5-Level Zone System

```typescript
interface ZoneHierarchy {
  // Level 1: City
  city: string;                 // 'bangalore'
  
  // Level 2: District/Locality
  district?: string;             // 'koramangala'
  
  // Level 3: Neighborhood
  neighborhood?: string;         // 'ngb_bangalore_koramangala_5th_block'
  
  // Level 4: Micro-zone (building clusters)
  micro_zone?: string;           // 'mz_bangalore_koramangala_5th_block_1'
  
  // Level 5: Venue Cluster
  venue_cluster?: string;         // 'vc_mall_of_bangalore'
}
```

### Zone IDs

| Level | ID Format | Example |
|-------|-----------|---------|
| City | `{city}` | `bangalore` |
| District | `{city}_{district}` | `bangalore_koramangala` |
| Neighborhood | `ngb_{city}_{district}_{name}` | `ngb_bangalore_koramangala_5th_block` |
| Micro-zone | `mz_{city}_{district}_{name}_{id}` | `mz_bangalore_koramangala_5th_block_1` |
| Venue Cluster | `vc_{venue_name}` | `vc_mall_of_bangalore` |

---

## Zone Data Model

### Zone Entity

```typescript
interface Zone {
  id: string;                    // 'ngb_bangalore_koramangala_5th_block'
  tenant_id?: string;            // Optional tenant scope
  
  // Hierarchy
  hierarchy: ZoneHierarchy;
  level: ZoneLevel;
  
  // Geography
  boundary?: GeoJSON;             // Polygon for zone
  center: {
    lat: number;
    lng: number;
  };
  radius_km?: number;            // For circular zones
  
  // Characteristics
  characteristics: ZoneCharacteristics;
  
  // Demand
  demand_index: number;            // 0-100
  demand_trend: 'rising' | 'stable' | 'declining';
  
  // Venues
  venue_count: number;
  venue_types: VenueType[];
  
  // Statistics
  stats: ZoneStats;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

type ZoneLevel = 'city' | 'district' | 'neighborhood' | 'micro_zone' | 'venue_cluster';

interface ZoneCharacteristics {
  type: 'residential' | 'commercial' | 'mixed' | 'industrial';
  avg_foot_traffic: number;
  peak_hours: number[];
  demographics?: {
    age_distribution?: Record<string, number>;
    income_level?: 'low' | 'medium' | 'high';
  };
  amenities: string[];             // 'metro', 'parking', 'mall'
}

interface ZoneStats {
  total_visits_30d: number;
  unique_visitors_30d: number;
  avg_visit_duration_minutes: number;
  popular_hours: Record<string, number>;  // Hour -> visit count
}
```

---

## Venue Data Model

### Venue Entity

```typescript
interface Venue {
  id: string;
  tenant_id?: string;            // Optional for public venues
  
  // Identity
  name: string;
  type: VenueType;
  
  // Location
  address: Address;
  coordinates: {
    lat: number;
    lng: number;
  };
  
  // Zone
  zone_id: string;
  
  // Business Info
  business?: {
    tenant_id: string;         // If it's a customer
    category: string;
    rating?: number;
    price_range?: number;       // 1-4
    operating_hours?: OperatingHours;
  };
  
  // Demand
  demand_index: number;          // 0-100
  peak_hours: number[];
  
  // Foot Traffic
  foot_traffic: {
    daily_avg: number;
    weekly_pattern: Record<string, number>;
    monthly_trend: number;      // % change
  };
  
  // Events
  upcoming_events?: EventReference[];
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

type VenueType = 
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'retail_store'
  | 'mall'
  | 'gym'
  | 'salon'
  | 'clinic'
  | 'pharmacy'
  | 'supermarket'
  | 'hotel'
  | 'coworking'
  | 'park'
  | 'attraction'
  | 'transport_hub'
  | 'other';

interface OperatingHours {
  [day: string]: {
    open: string;             // '09:00'
    close: string;             // '21:00'
    is_closed: boolean;
  };
}
```

---

## Event Data Model

### Event Entity

```typescript
interface Event {
  id: string;
  tenant_id: string;            // Organizer
  
  // Identity
  name: string;
  description?: string;
  category: EventCategory;
  
  // Location
  venue_id?: string;
  address?: Address;
  coordinates?: {
    lat: number;
    lng: number;
  };
  
  // Zone
  zone_id: string;
  
  // Timing
  dates: {
    start: Date;
    end: Date;
    all_day: boolean;
    recurring?: RecurringPattern;
  };
  
  // Scale
  scale: 'small' | 'medium' | 'large' | 'major';
  expected_attendance?: number;
  
  // Impact Prediction
  impact_prediction?: EventImpactPrediction;
  
  // Status
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

type EventCategory = 
  | 'concert'
  | 'festival'
  | 'sports'
  | 'exhibition'
  | 'conference'
  | 'community'
  | 'cultural'
  | 'political'
  | 'weather'
  | 'holiday';

interface EventImpactPrediction {
  // Zone Impact
  affected_zones: {
    zone_id: string;
    impact_score: number;        // 0-100
    impact_radius_km: number;
  }[];
  
  // Time Impact
  demand_change: {
    before_event: number;       // % change
    during_event: number;
    after_event: number;
    recovery_days: number;
  };
  
  // Category Impact
  category_impact: {
    category: VenueType;
    impact_score: number;
  }[];
  
  // Predicted
  predicted_attendance: number;
  predicted_revenue_boost: number;
}

interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;             // Every X days/weeks/months
  end_date?: Date;
}
```

---

## Demand Engine

### Demand Index Calculation

```typescript
interface DemandEngine {
  
  // Calculate demand index for a zone
  async calculateDemandIndex(
    zone_id: string,
    time_range: TimeRange
  ): Promise<DemandIndex> {
    
    // 1. Get base signals
    const signals = await this.getDemandSignals(zone_id, time_range);
    
    // 2. Apply weights
    const weightedScore = this.applyWeights(signals);
    
    // 3. Normalize to 0-100
    return this.normalize(weightedScore);
  }
  
  // Demand signals with weights
  getDemandSignals(zone_id: string, time_range: TimeRange): DemandSignals {
    return {
      // Order signals (weight: 0.15)
      order_velocity: this.getOrderVelocity(zone_id, time_range),
      order_count: this.getOrderCount(zone_id, time_range),
      
      // Ride signals (weight: 0.15)
      ride_frequency: this.getRideFrequency(zone_id, time_range),
      pickup_demand: this.getPickupDemand(zone_id, time_range),
      
      // Foot traffic (weight: 0.12)
      footfall_count: this.getFootfall(zone_id, time_range),
      unique_visitors: this.getUniqueVisitors(zone_id, time_range),
      
      // Event signals (weight: 0.12)
      upcoming_events: this.getUpcomingEvents(zone_id),
      event_impact_score: this.getEventImpact(zone_id),
      
      // Weather (weight: 0.05)
      weather_factor: this.getWeatherImpact(zone_id),
      
      // Time factors (weight: 0.07)
      time_factor: this.getTimeFactor(zone_id, time_range),
      
      // Merchant density (weight: 0.10)
      merchant_density: this.getMerchantDensity(zone_id),
      merchant_ratings: this.getMerchantRatings(zone_id),
      
      // Consumer affinity (weight: 0.08)
      consumer_affinity: this.getConsumerAffinity(zone_id),
      
      // Historical trend (weight: 0.08)
      historical_trend: this.getHistoricalTrend(zone_id, time_range),
      
      // Competition (weight: 0.07)
      competition_index: this.getCompetitionIndex(zone_id),
      
      // Accessibility (weight: 0.06)
      accessibility_score: this.getAccessibilityScore(zone_id)
    };
  }
  
  // Weight configuration
  weights: Record<keyof DemandSignals, number> = {
    order_velocity: 0.05,
    order_count: 0.10,
    ride_frequency: 0.08,
    pickup_demand: 0.07,
    footfall_count: 0.07,
    unique_visitors: 0.05,
    upcoming_events: 0.08,
    event_impact_score: 0.04,
    weather_factor: 0.05,
    time_factor: 0.07,
    merchant_density: 0.06,
    merchant_ratings: 0.04,
    consumer_affinity: 0.08,
    historical_trend: 0.08,
    competition_index: 0.07,
    accessibility_score: 0.06
  };
}

interface DemandSignals {
  order_velocity: number;
  order_count: number;
  ride_frequency: number;
  pickup_demand: number;
  footfall_count: number;
  unique_visitors: number;
  upcoming_events: number;
  event_impact_score: number;
  weather_factor: number;
  time_factor: number;
  merchant_density: number;
  merchant_ratings: number;
  consumer_affinity: number;
  historical_trend: number;
  competition_index: number;
  accessibility_score: number;
}

interface DemandIndex {
  zone_id: string;
  score: number;                 // 0-100
  trend: 'rising' | 'stable' | 'declining';
  components: {
    signal: string;
    score: number;
    contribution: number;         // % contribution to total
  }[];
  calculated_at: Date;
  valid_until: Date;
}
```

---

## Event Impact Engine

### Impact Prediction

```typescript
interface EventImpactEngine {
  
  // Predict event impact on zones
  async predictEventImpact(
    event: Event
  ): Promise<EventImpactPrediction> {
    
    // 1. Calculate zone impact
    const affectedZones = await this.calculateZoneImpact(event);
    
    // 2. Calculate time impact
    const timeImpact = await this.calculateTimeImpact(event);
    
    // 3. Calculate category impact
    const categoryImpact = await this.calculateCategoryImpact(event);
    
    // 4. Generate overall prediction
    return {
      affected_zones: affectedZones,
      demand_change: timeImpact,
      category_impact: categoryImpact,
      predicted_attendance: this.predictAttendance(event),
      predicted_revenue_boost: this.predictRevenueBoost(event, affectedZones)
    };
  }
  
  // Calculate radius impact based on event scale
  calculateZoneImpact(event: Event): ZoneImpact[] {
    const radiusMap = {
      small: 0.5,      // 500m
      medium: 2,       // 2km
      large: 5,        // 5km
      major: 15        // 15km
    };
    
    const radius = radiusMap[event.scale];
    const impactScore = this.getImpactScore(event.scale, event.category);
    
    // Find all zones within radius
    const zones = this.findZonesInRadius(
      event.coordinates,
      radius
    );
    
    return zones.map(zone => ({
      zone_id: zone.id,
      impact_score: this.decayWithDistance(zone, event.coordinates, impactScore),
      impact_radius_km: radius
    }));
  }
  
  // Predict demand change over time
  calculateTimeImpact(event: Event): TimeImpact {
    const baseImpact = this.getBaseImpact(event.scale);
    
    return {
      before_event: baseImpact * 0.1,    // +10% pre-event (anticipation)
      during_event: baseImpact,              // +X% during event
      after_event: baseImpact * -0.05,      // -5% post-event (lull)
      recovery_days: this.getRecoveryDays(event.scale)
    };
  }
  
  // Get category-specific impact
  calculateCategoryImpact(event: Event): CategoryImpact[] {
    const categoryImpactMap: Record<EventCategory, Record<VenueType, number>> = {
      concert: {
        restaurant: 0.8,   // Big boost
        bar: 0.9,
        parking: 0.7,
        retail_store: 0.3
      },
      festival: {
        restaurant: 0.6,
        retail_store: 0.8,
        mall: 0.9
      },
      sports: {
        restaurant: 0.5,
        parking: 0.8,
        bar: 0.4
      },
      // ... etc
    };
    
    return Object.entries(categoryImpactMap[event.category] || {})
      .map(([category, impact]) => ({
        category: category as VenueType,
        impact_score: impact
      }));
  }
}
```

---

## Area Intelligence

### Area Scoring

```typescript
interface AreaIntelligence {
  
  // Score an area for a specific use case
  async scoreArea(
    zone_id: string,
    use_case: UseCase
  ): Promise<AreaScore> {
    
    switch (use_case) {
      case 'new_store':
        return this.scoreForNewStore(zone_id);
      case 'campaign':
        return this.scoreForCampaign(zone_id);
      case 'delivery_optimization':
        return this.scoreForDelivery(zone_id);
      case 'ad_targeting':
        return this.scoreForAdTargeting(zone_id);
    }
  }
  
  // Score for new store location
  scoreForNewStore(zone_id: string): AreaScore {
    const factors = {
      demand: this.getDemandIndex(zone_id),
      competition: this.getCompetitionIndex(zone_id),  // Inverse
      accessibility: this.getAccessibilityScore(zone_id),
      demographics: this.getDemographicScore(zone_id),
      foot_traffic: this.getFootTrafficScore(zone_id)
    };
    
    return {
      zone_id,
      use_case: 'new_store',
      overall_score: this.weightedSum(factors, {
        demand: 0.35,
        competition: 0.25,
        accessibility: 0.15,
        demographics: 0.15,
        foot_traffic: 0.10
      }),
      factors,
      recommendation: this.generateRecommendation(factors)
    };
  }
}

type UseCase = 'new_store' | 'campaign' | 'delivery_optimization' | 'ad_targeting';

interface AreaScore {
  zone_id: string;
  use_case: UseCase;
  overall_score: number;          // 0-100
  factors: Record<string, number>;
  recommendation: string;
  comparable_zones?: string[];     // Similar zones
}
```

---

## Footfall Prediction

### Footfall Model

```typescript
interface FootfallPrediction {
  
  // Predict footfall for a venue
  async predictFootfall(
    venue_id: string,
    date_range: DateRange
  ): Promise<FootfallPrediction[]> {
    
    const predictions: FootfallPrediction[] = [];
    const venue = await this.getVenue(venue_id);
    
    for (const date of this.iterateDates(date_range)) {
      // Base footfall from historical data
      const baseFootfall = this.getHistoricalFootfall(venue, date);
      
      // Adjustments
      const weatherAdj = this.getWeatherAdjustment(venue, date);
      const eventAdj = this.getEventAdjustment(venue, date);
      const trendAdj = this.getTrendAdjustment(venue, date);
      
      predictions.push({
        venue_id,
        date: date,
        predicted_footfall: Math.round(
          baseFootfall * weatherAdj * eventAdj * trendAdj
        ),
        confidence: this.calculateConfidence(date),
        factors: { weatherAdj, eventAdj, trendAdj }
      });
    }
    
    return predictions;
  }
  
  // Get hourly distribution
  async getHourlyDistribution(
    venue_id: string,
    date: Date
  ): Promise<HourlyDistribution> {
    const venue = await this.getVenue(venue_id);
    
    return {
      venue_id,
      date,
      distribution: venue.peak_hours.reduce((acc, hour, idx) => {
        acc[hour] = this.getHourlyCount(venue, date, hour);
        return acc;
      }, {})
    };
  }
}

interface FootfallPrediction {
  venue_id: string;
  date: Date;
  predicted_footfall: number;
  confidence: number;            // 0-1
  factors: {
    weatherAdj: number;
    eventAdj: number;
    trendAdj: number;
  };
}
```

---

## Local Graph

### Graph Relationships

```typescript
interface LocalGraph {
  
  // Find related venues
  async findRelatedVenues(
    venue_id: string,
    options: FindRelatedOptions
  ): Promise<RelatedVenue[]> {
    return this.graph.query({
      type: 'venue',
      filters: {
        near: {
          venue_id,
          radius_km: options.radius || 1
        },
        same_type: options.sameType || false,
        complementary: options.complementary || false
      },
      limit: options.limit || 10
    });
  }
  
  // Find popular routes between venues
  async findPopularRoutes(
    origin_venue_id: string,
    destination_venue_id: string
  ): Promise<PopularRoute[]> {
    return this.graph.query({
      type: 'route',
      filters: {
        origin: origin_venue_id,
        destination: destination_venue_id
      }
    });
  }
  
  // Analyze customer journeys
  async analyzeJourneys(
    zone_id: string,
    time_range: TimeRange
  ): Promise<CustomerJourney[]> {
    // Find common patterns of venue visits
    const sequences = await this.getVisitSequences(zone_id, time_range);
    return this.clusterSequences(sequences);
  }
}

interface RelatedVenue {
  venue: Venue;
  relationship: 'nearby' | 'same_category' | 'complementary' | 'competitor';
  distance_km: number;
  affinity_score: number;         // How often visited together
}

interface PopularRoute {
  origin_venue_id: string;
  destination_venue_id: string;
  popularity_score: number;      // 0-100
  avg_time_between_visits_minutes: number;
  common_sequences: string[][];  // Common visit patterns
}

interface CustomerJourney {
  sequence: string[];           // Venue IDs in order
  frequency: number;             // How common this pattern is
  avg_duration_minutes: number;
  zones: string[];               // Zones visited
}
```

---

## API Endpoints

### Zones

```
# Zone Management
GET    /api/zones                    - List zones
GET    /api/zones/:id               - Get zone
GET    /api/zones/:id/stats         - Zone statistics
GET    /api/zones/:id/demand        - Demand index
GET    /api/zones/:id/venues        - Venues in zone

# Zone Search
GET    /api/zones/search           - Search zones
GET    /api/zones/nearby           - Zones near coordinates
```

### Venues

```
# Venue Management
GET    /api/venues                  - List venues
GET    /api/venues/:id             - Get venue
POST   /api/venues                  - Create venue
PUT    /api/venues/:id              - Update venue
DELETE /api/venues/:id             - Delete venue

# Venue Intelligence
GET    /api/venues/:id/demand      - Venue demand
GET    /api/venues/:id/footfall    - Footfall prediction
GET    /api/venues/:id/related     - Related venues
GET    /api/venues/:id/analytics   - Venue analytics
```

### Events

```
# Event Management
GET    /api/events                  - List events
GET    /api/events/:id             - Get event
POST   /api/events                  - Create event
PUT    /api/events/:id              - Update event
DELETE /api/events/:id             - Delete event

# Event Impact
GET    /api/events/:id/impact      - Predicted impact
GET    /api/events/:id/affected-zones - Affected zones
```

### Search

```
# Location Search
GET    /api/search/zones           - Search zones
GET    /api/search/venues           - Search venues
GET    /api/search/nearby           - Search nearby

# Intelligence Search
GET    /api/search/hotspots        - Find hotspots
GET    /api/search/opportunities    - Find opportunities
```

### Analytics

```
# Zone Analytics
GET    /api/analytics/zones/:id    - Zone analytics
GET    /api/analytics/zones/comparison - Compare zones

# Demand Analytics
GET    /api/analytics/demand       - Overall demand
GET    /api/analytics/demand/trends - Demand trends
GET    /api/analytics/demand/forecast - Demand forecast
```

---

## API Examples

### Search Nearby Zones

```typescript
// Request
GET /api/zones/nearby?lat=12.9352&lng=77.6245&radius_km=5

// Response
{
  success: true,
  data: {
    zones: [
      {
        id: 'ngb_bangalore_koramangala_5th_block',
        hierarchy: {
          city: 'bangalore',
          district: 'koramangala',
          neighborhood: '5th_block'
        },
        demand_index: 87,
        demand_trend: 'rising',
        venue_count: 45,
        distance_km: 0.5
      },
      // ...
    ]
  }
}
```

---

### Get Venue Demand

```typescript
// Request
GET /api/venues/venue_abc123/demand?time_range=7d

// Response
{
  success: true,
  data: {
    venue_id: 'venue_abc123',
    demand_index: 78,
    trend: 'stable',
    hourly: {
      '10:00': 45,
      '11:00': 62,
      '12:00': 85,
      // ...
    },
    weekly: {
      'monday': 72,
      'friday': 89,
      'saturday': 95,
      // ...
    },
    predictions: [
      { date: '2026-05-30', demand: 82 },
      { date: '2026-05-31', demand: 88 },
      // ...
    ]
  }
}
```

---

### Predict Event Impact

```typescript
// Request
GET /api/events/event_xyz/impact

// Response
{
  success: true,
  data: {
    event_id: 'event_xyz',
    event_name: 'IPL Final Watch Party',
    scale: 'large',
    
    affected_zones: [
      { zone_id: 'ngb_bangalore_koramangala', impact_score: 95 },
      { zone_id: 'ngb_bangalore_indiranagar', impact_score: 72 },
      { zone_id: 'ngb_bangalore_whitefield', impact_score: 45 }
    ],
    
    demand_change: {
      before_event: 0.15,
      during_event: 0.85,
      after_event: -0.05,
      recovery_days: 2
    },
    
    category_impact: [
      { category: 'restaurant', impact_score: 0.8 },
      { category: 'bar', impact_score: 0.9 },
      { category: 'retail_store', impact_score: 0.4 }
    ],
    
    predicted_attendance: 5000,
    predicted_revenue_boost: 350000
  }
}
```

---

## Integration Points

### Hojai Core

```
Hyperlocal Platform
    │
    ├──► Event Bus (4510)
    │       (zone.updated, event.created, demand.changed)
    │
    ├──► Memory (4520)
    │       (location preferences, venue history)
    │
    └──► Intelligence (4530)
            (demand prediction, footfall forecasting)
```

### External Data Sources

```
Hyperlocal Platform
    │
    ├── Weather API ───► Weather adjustments
    ├── Map API ───────► Zone boundaries, routes
    ├── Calendar API ──► Event data
    └── Mobility Data ─► Ride frequency, routes
```

---

## Port Registry

| Service | Port | Purpose |
|---------|------|---------|
| Hyperlocal API | 4580 | Zone, Venue, Event APIs |
| Demand Engine | 4581 | Demand calculations |
| Footfall ML | 4582 | Footfall prediction |

---

## Document Version

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 29, 2026 | Hojai AI | Initial spec |

---

*This is the Hojai Hyperlocal Platform Specification.*
