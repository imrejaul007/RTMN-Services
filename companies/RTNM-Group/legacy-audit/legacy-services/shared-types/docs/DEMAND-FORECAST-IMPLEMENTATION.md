# Demand Forecasting and Dynamic Pricing AI - Implementation Documentation

## Overview

This document describes the implementation of the Demand Forecasting and Dynamic Pricing AI system for the REZ Merchant platform. The system consists of two AI agents that analyze historical data, detect patterns, and provide actionable recommendations to merchants.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REZ Merchant Platform                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │   REZ Merchant   │    │  REZ Merchant    │    │    NextaBiZ      │      │
│  │      App         │    │     Service      │    │   Integration    │      │
│  │                  │    │                  │    │                  │      │
│  │  - demand-       │    │  - Demand       │    │  - Procurement   │      │
│  │    forecast.tsx  │    │    ForecastAgent │    │    Signals       │      │
│  │  - pricing-      │◄──►│  - Dynamic      │◄──►│  - Marketing     │      │
│  │    suggestions   │    │    PricingAgent │    │    Signals       │      │
│  │    .tsx          │    │                  │    │                  │      │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘      │
│           │                      │                       │                  │
│           │                      ▼                       │                  │
│           │              ┌──────────────────┐            │                  │
│           │              │   Analytics      │            │                  │
│           │              │     API          │            │                  │
│           │              │                  │            │                  │
│           │              │ /forecast        │            │                  │
│           │              │ /pricing/        │            │                  │
│           │              │   recommendations│            │                  │
│           │              └──────────────────┘            │                  │
│           │                      │                       │                  │
│           │                      ▼                       │                  │
│           │              ┌──────────────────┐            │                  │
│           │              │   MongoDB        │◄───────────┘                  │
│           │              │   Orders,        │                              │
│           │              │   Products       │                              │
│           └──────────────┴──────────────────┴──────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Demand Forecast Agent

**Location:** `/rez-merchant-service/src/services/demandForecastAgent.ts`

#### Features

- **Historical Order Analysis**: Aggregates daily order data for configurable periods (default: 90 days)
- **Pattern Detection**: Identifies multiple types of patterns:
  - Weekend peaks (Saturday/Sunday)
  - Weekday lows
  - Seasonal trends (monthly analysis)
  - Growth/decline trends
  - Cyclical patterns
- **Demand Prediction**: Generates forecasts for 7, 14, or 30 day horizons
- **Demand Signals**: Automatically generates alerts based on forecast data:
  - High demand alerts
  - Low demand warnings
  - Opportunity notifications
  - Stock alerts
- **NextaBiZ Integration**: Triggers procurement or marketing signals based on demand levels

#### Key Algorithms

1. **Day-of-Week Weighting**
   ```typescript
   const DAY_OF_WEEK_WEIGHTS = {
     0: 0.8,   // Sunday
     1: 0.9,   // Monday
     2: 0.95,  // Tuesday
     3: 1.0,   // Wednesday
     4: 1.05,  // Thursday
     5: 1.2,   // Friday
     6: 1.3,   // Saturday
   };
   ```

2. **Seasonal Multipliers**
   ```typescript
   const SEASONAL_MULTIPLIERS = {
     0: 1.0,   // January
     1: 0.95,  // February
     // ... through December (peak: 1.3x in December)
   };
   ```

3. **Demand Level Classification**
   - Low: predicted orders < 70% of average
   - Medium: 70-130% of average
   - High: > 130% of average

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/merchant/analytics/forecast` | GET | Get demand forecast with predictions |
| `/merchant/analytics/forecast/historical` | GET | Get historical demand analysis |
| `/merchant/analytics/forecast/patterns` | GET | Get detected patterns |
| `/merchant/analytics/forecast/signals` | GET | Get demand signals and alerts |
| `/merchant/analytics/forecast/summary` | GET | Get quick forecast summary |
| `/internal/demand-signals/trigger` | POST | Trigger NextaBiZ signals |
| `/internal/demand-signals/status` | GET | Get demand signal status |

### 2. Dynamic Pricing Agent

**Location:** `/rez-merchant-service/src/services/dynamicPricingAgent.ts`

#### Features

- **Multi-Factor Pricing**: Considers multiple factors for price optimization:
  - Demand levels (35% weight)
  - Time of day (25% weight)
  - Seasonality (15% weight)
  - Inventory levels (15% weight)
  - Trends (10% weight)
- **Pricing Strategies**: Implements different strategies based on context:
  - Premium Pricing: Higher prices during peak periods
  - Competitive Pricing: Market-average pricing
  - Penetration Pricing: Lower prices to attract customers
  - Dynamic Pricing: Real-time adjustments
  - Bundle Pricing: Product combinations
- **Price Constraints**:
  - Minimum margin: 15%
  - Maximum discount: 40%
- **Product Recommendations**: Generates actionable recommendations for each product

#### Price Adjustment Factors

| Factor | Weight | Adjustment Range |
|--------|--------|-------------------|
| Demand (High) | 35% | +25% |
| Demand (Low) | 35% | -15% |
| Lunch Time | 20% | +15% |
| Dinner Time | 20% | +20% |
| Weekend | 15% | +15% |
| Weekend Peak | 15% | +20% |
| Low Stock | 10% | +20% |
| High Stock | 10% | -15% |
| Holiday Season | 10% | +30% |

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/merchant/pricing/recommendations` | GET | Get pricing recommendations |
| `/merchant/pricing/recommendations/summary` | GET | Get pricing summary |
| `/merchant/pricing/product/:productId` | GET | Get real-time price for product |
| `/merchant/pricing/strategies` | GET | Get available pricing strategies |

### 3. Merchant App Screens

#### Demand Forecast Screen

**Location:** `/rez-app-marchant/app/analytics/demand-forecast.tsx`

**Features:**
- Forecast horizon selector (7/14/30 days)
- Summary cards (high/low demand days, averages)
- Demand signals with severity badges
- Detected patterns visualization
- Forecast timeline with daily predictions
- Historical analysis summary
- Actionable recommendations

#### Pricing Suggestions Screen

**Location:** `/rez-app-marchant/app/analytics/pricing-suggestions.tsx`

**Features:**
- Price change summary cards
- Estimated revenue impact
- Recommended actions with priorities
- Bundle deal suggestions
- Filter by increase/decrease
- Product pricing cards with confidence scores
- Detailed product modal with factor breakdown
- Pricing context information

### 4. NextaBiZ Integration

**Location:** `/rez-merchant-service/src/routes/demandSignalsMerchant.ts`

#### Signal Types

| Signal Type | Trigger | NextaBiZ Action |
|-------------|---------|-----------------|
| High Demand | 3+ high-demand days predicted | Procurement Signal |
| Low Demand | 3+ low-demand days predicted | Marketing Signal |
| Declining Trend | >10% order decline | Marketing Signal |
| Opportunity | Weekend peak detected | None (internal only) |

#### Webhook Payload

```typescript
interface DemandSignalPayload {
  source: 'rez-merchant-service';
  merchantId: string;
  signalType: 'high_demand' | 'low_demand' | 'opportunity' | 'stock_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestedAction: string;
  affectedProducts: string[];
  timestamp: string;
  metadata: {
    triggeredBy: 'demand_forecast_agent';
    service: 'rez-merchant-service';
  };
}
```

## Data Models

### ForecastResult

```typescript
interface ForecastResult {
  merchantId: string;
  storeId?: string;
  horizon: 7 | 14 | 30;
  generatedAt: Date;
  historicalAnalysis: {
    periodStart: Date;
    periodEnd: Date;
    totalOrders: number;
    totalRevenue: number;
    avgDailyOrders: number;
    avgDailyRevenue: number;
  };
  patterns: PatternAnalysis[];
  forecasts: DemandForecast[];
  demandSignals: DemandSignal[];
  recommendations: string[];
}
```

### PricingRecommendationSet

```typescript
interface PricingRecommendationSet {
  merchantId: string;
  storeId?: string;
  generatedAt: Date;
  validUntil: Date;
  context: {
    horizon: number;
    averageDemandLevel: 'low' | 'medium' | 'high';
    peakHours: string[];
    slowHours: string[];
  };
  recommendations: PriceRecommendation[];
  bundles: BundleRecommendation[];
  summary: {
    totalProducts: number;
    priceIncreases: number;
    priceDecreases: number;
    noChange: number;
    estimatedRevenueImpact: number;
    averagePriceChange: number;
  };
  actions: RecommendedAction[];
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXTABIZZ_WEBHOOK_URL` | Webhook URL for NextaBiZ signals | - |
| `NEXTABIZZ_WEBHOOK_SECRET` | Secret for webhook signature | Internal service token |

### Service Integration

The services integrate with:

1. **Order Service**: Uses `Order` model for historical data
2. **Store Service**: Uses `Store` model for store filtering
3. **Product Service**: Uses `Product` model for pricing data
4. **Notification Service**: Creates notifications for demand signals

## Usage Examples

### Getting a Demand Forecast

```typescript
import { DemandForecastAgent } from './services/demandForecastAgent';

const forecast = await DemandForecastAgent.forecast(
  merchantId,
  7,      // horizon
  storeId, // optional store filter
  90      // historical days to analyze
);

console.log(forecast.patterns);
console.log(forecast.forecasts);
console.log(forecast.demandSignals);
```

### Getting Pricing Recommendations

```typescript
import { DynamicPricingAgent } from './services/dynamicPricingAgent';

const recommendations = await DynamicPricingAgent.getRecommendations(
  merchantId,
  storeId, // optional
  7        // horizon
);

console.log(recommendations.summary);
console.log(recommendations.actions);
console.log(recommendations.bundles);
```

### Triggering NextaBiZ Signals

```typescript
// Internal endpoint called by scheduled job
await fetch('/internal/demand-signals/trigger', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN
  },
  body: JSON.stringify({
    merchantId: 'merchant_123',
    horizon: 7,
    forceSend: false
  })
});
```

## Error Handling

All endpoints include:
- Request validation with appropriate error messages
- Error logging with request IDs for debugging
- Graceful degradation when data is insufficient
- Production-safe error messages (no stack traces)

## Performance Considerations

1. **Query Limits**: Maximum 50 products per pricing recommendation request
2. **Caching**: Results are cached for 5 minutes on the client
3. **Historical Limits**: Maximum 365 days of historical analysis
4. **Rate Limiting**: Standard rate limits apply to all endpoints

## Future Enhancements

1. **ML Model Integration**: Replace statistical models with trained ML models
2. **Competitor Analysis**: Incorporate competitor pricing data
3. **Weather Integration**: Add weather-based demand predictions
4. **Event Calendar**: Integrate local events and holidays
5. **A/B Testing**: Test pricing recommendations with controlled experiments
6. **Real-time Updates**: WebSocket connections for live price updates

## File Structure

```
rez-merchant-service/
├── src/
│   ├── services/
│   │   ├── demandForecastAgent.ts     # Demand forecasting logic
│   │   ├── dynamicPricingAgent.ts    # Pricing optimization logic
│   │   ├── churnAgent.ts             # Existing churn prediction
│   │   └── ltvCalculator.ts          # Existing LTV calculation
│   ├── routes/
│   │   ├── analytics/
│   │   │   ├── demandForecast.ts     # Forecast API routes
│   │   │   ├── index.ts              # Updated analytics router
│   │   │   └── ...
│   │   ├── pricing/
│   │   │   ├── recommendations.ts     # Pricing API routes
│   │   │   └── index.ts              # Pricing router
│   │   ├── demandSignalsMerchant.ts  # NextaBiZ integration
│   │   └── ...
│   └── index.ts                       # Updated main entry point
│
rez-app-marchant/
├── app/
│   └── analytics/
│       ├── demand-forecast.tsx        # Demand forecast screen
│       ├── pricing-suggestions.tsx    # Pricing suggestions screen
│       └── ...
└── services/
    └── api/
        └── analytics.ts               # Updated with new API methods
```

## Security Considerations

1. **Authentication**: All merchant endpoints require authentication via `merchantAuth` middleware
2. **Internal Authentication**: Internal endpoints require `requireInternalToken` middleware
3. **Webhook Verification**: NextaBiZ webhooks use HMAC-SHA256 signature verification
4. **Replay Attack Prevention**: Webhook timestamps validated against 5-minute window
5. **Rate Limiting**: Standard rate limits protect against abuse
6. **Input Validation**: All query parameters and body fields are validated
7. **SQL/NoSQL Injection Prevention**: MongoDB sanitizer applied to all inputs

## Monitoring and Logging

- All service operations are logged with structured logging
- Request IDs are propagated for distributed tracing
- Errors include request IDs for debugging
- Performance metrics logged for optimization
