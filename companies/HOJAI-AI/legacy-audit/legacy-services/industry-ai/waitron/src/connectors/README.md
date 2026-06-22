# Waitron Integration Connectors

## Overview

This directory contains all the integration connectors that wire Waitron to the RTMN ecosystem.

## Connectors

### 1. Weather Connector
**File:** `weather-connector.ts`
**Service:** BuzzLocal Weather Service
**Purpose:** Real weather data for demand prediction

```typescript
import { weatherConnector } from './connectors';

const prediction = await weatherConnector.getWeatherPrediction({
  latitude: 12.9716,
  longitude: 77.5946,
  name: 'Bangalore'
});

// prediction.demandMultiplier gives:
// - delivery: 1.35 (rain increases delivery)
// - dineIn: 0.65 (rain decreases dine-in)
```

### 2. QR Table Connector
**File:** `qr-table-connector.ts`
**Service:** REZ Table QR Service
**Purpose:** Table QR generation and scan processing

```typescript
import { qrTableConnector } from './connectors';

// Generate QR codes for all tables
await qrTableConnector.generateTableQRCodes('REST001', 'mtr-hsr', [
  { tableNumber: '1', tableName: 'Window Table', capacity: 4 },
  { tableNumber: '2', tableName: 'Corner Booth', capacity: 6 }
]);

// Process customer scan
const result = await qrTableConnector.processScan({
  qrData: '...',
  customerId: 'customer-123',
  partySize: 2
});
```

### 3. Nexha Procurement Connector
**File:** `nexha-procurement-connector.ts`
**Service:** NexhaBizz Reorder Engine
**Purpose:** Automatic procurement when inventory is low

```typescript
import { nexhaProcurementConnector } from './connectors';

// Send inventory signal
await nexhaProcurementConnector.sendInventorySignal({
  merchantId: 'MTR001',
  item: { itemId: 'T001', name: 'Tomatoes', currentStock: 5, reorderPoint: 20, unit: 'kg' },
  severity: 'high',
  signalType: 'low_stock'
});

// Process all alerts
const result = await nexhaProcurementConnector.processInventoryAlerts({
  merchantId: 'MTR001',
  alerts: [...]
});
```

### 4. Genie Restaurant Connector
**File:** `genie-restaurant-connector.ts`
**Service:** Waitron Restaurant Discovery
**Purpose:** Connect Genie to restaurant recommendations

```typescript
import { genieRestaurantConnector } from './connectors';

// Customer asks "Good breakfast nearby"
const result = await genieRestaurantConnector.discoverRestaurants({
  query: 'South Indian breakfast',
  location: { latitude: 12.9352, longitude: 77.6245 },
  preferences: { cuisinePreferences: ['south indian'] }
});
```

### 5. Catering Handler
**File:** `catering-handler.ts`
**Service:** Corporate Catering
**Purpose:** Handle corporate catering inquiries and RFQ

```typescript
import { cateringHandler } from './connectors';

// HR Manager asks "Find catering for 500 employees"
const result = await cateringHandler.handleInquiry({
  companyName: 'Tech Corp',
  partySize: 500,
  eventType: 'corporate_event',
  eventDate: '2026-07-15',
  location: { address: 'MG Road, Bangalore', city: 'Bangalore' }
});

// Natural language
const nlp = await cateringHandler.handleNaturalLanguageRequest({
  request: 'Need lunch for 500 people next Friday at our office'
});
```

### 6. AssetMind Connector
**File:** `assetmind-connector.ts`
**Service:** AssetMind Wealth Management
**Purpose:** Transfer restaurant profits to wealth

```typescript
import { assetMindConnector } from './connectors';

// Transfer daily profits
const result = await assetMindConnector.transferDailyProfits({
  merchantId: 'MTR001',
  restaurantId: 'MTR-HSR',
  profitData: {
    merchantId: 'MTR001',
    restaurantId: 'MTR-HSR',
    restaurantName: 'MTR HSR',
    date: '2026-06-13',
    revenue: 280000,
    foodCost: 78400,
    laborCost: 61600,
    netProfit: 112000,
    profitMargin: 40
  }
});
```

### 7. Restaurant Expansion Agent
**File:** `restaurant-expansion-agent.ts`
**Service:** SUTAR + RisnaEstate + CorpPerks + Nexha
**Purpose:** Autonomous restaurant expansion

```typescript
import { restaurantExpansionAgent } from './connectors';

// Arif wants to open 10 restaurants
const plan = await restaurantExpansionAgent.createExpansionPlan({
  merchantId: 'MTR001',
  merchantName: 'MTR Restaurants',
  targetLocations: 10,
  timeline: '12 months',
  preferredCities: ['Bangalore', 'Hyderabad', 'Chennai'],
  budgetPerLocation: 5000000
});

// Execute next phase
await restaurantExpansionAgent.executeNextPhase(plan.goal.id);
```

### 8. Integration Hub
**File:** `index.ts`
**Purpose:** Unified interface for all connectors

```typescript
import { WaitronIntegrationHub, waitronHub } from './connectors';

const hub = new WaitronIntegrationHub();
await hub.initialize();

// Or use singleton
const status = await waitronHub.healthCheck();
```

## Environment Variables

```bash
# BuzzLocal Weather
BUZZLOCAL_WEATHER_URL=http://localhost:4301

# REZ Table QR
REZ_TABLE_QR_URL=http://localhost:4025

# Restaurant Service
REZ_RESTAURANT_URL=http://localhost:4017

# Nexha
NEXHA_URL=http://localhost:4399
NEXTABIZZ_URL=http://localhost:3000

# AssetMind
ASSETMIND_URL=http://localhost:5200

# SUTAR
SUTAR_GOAL_URL=http://localhost:4150

# RisnaEstate
RISNA_URL=http://localhost:4300

# CorpPerks
CORPPERKS_URL=http://localhost:4006
```

## Story Flow Integration

| Time | Story Event | Connector Used |
|------|------------|---------------|
| 7:00 AM | Weather predicts rain | `weatherConnector` |
| 9:00 AM | Karim asks Genie for breakfast | `genieRestaurantConnector` |
| 9:15 AM | Karim scans table QR | `qrTableConnector` |
| 10:00 AM | Tomatoes running low | `nexhaProcurementConnector` |
| 2:00 PM | Corporate catering inquiry | `cateringHandler` |
| 8:00 PM | Expansion to 10 locations | `restaurantExpansionAgent` |
| 10:00 PM | Profit to wealth | `assetMindConnector` |

## Health Checks

```typescript
// Individual connector
const health = await weatherConnector.healthCheck();

// All connectors via hub
const hubHealth = await waitronHub.healthCheck();
```

## Error Handling

All connectors have graceful degradation:
- If external service is down, return mock/default data
- Log warnings for debugging
- Never throw unhandled errors
