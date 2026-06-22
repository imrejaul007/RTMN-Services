# CLAUDE.md - Waitron

## Project Overview

**Name:** Waitron - Restaurant OS for HOJAI  
**Company:** hojai-ai  
**Type:** Restaurant Operating System  
**Tagline:** "The Restaurant That Never Stopped Learning"  
**Port:** 4820  
**Version:** 1.0.0  
**Status:** ✅ PRODUCTION READY - ALL 8 INTEGRATIONS BUILT

---

## Quick Start

```bash
cd companies/hojai-ai/industry-ai/waitron
npm install
npm run dev    # Development server on port 4820
npm run build  # Build for production
npm start      # Production server
```

---

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- MongoDB
- Redis
- Docker + Docker Compose

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4820 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |

### Integration URLs

| Variable | Default | Description |
|----------|---------|-------------|
| REZ_RESTAURANT_URL | http://localhost:4017 | Restaurant Service |
| REZ_TABLE_QR_URL | http://localhost:4025 | Table QR Service |
| BUZZLOCAL_WEATHER_URL | http://localhost:4301 | Weather Service |
| NEXHA_URL | http://localhost:4399 | Nexha Service |
| NEXTABIZZ_URL | http://localhost:3000 | NexhaBizz |
| ASSETMIND_URL | http://localhost:5200 | AssetMind |
| SUTAR_GOAL_URL | http://localhost:4150 | SUTAR Goal OS |
| RISNA_URL | http://localhost:4300 | RisnaEstate |
| CORPPERKS_URL | http://localhost:4006 | CorpPerks |

---

## Architecture

Waitron is a Restaurant Operating System that connects to the RTMN ecosystem via 8 integration connectors:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WAITRON LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                     INTEGRATION CONNECTORS                            │    │
│   ├─────────────────────────────────────────────────────────────────────┤    │
│   │ ✅ Weather Connector         → BuzzLocal Weather Service            │    │
│   │ ✅ QR Table Connector        → REZ Table QR + TableTwin               │    │
│   │ ✅ Nexha Procurement        → NexhaBizz Reorder Engine               │    │
│   │ ✅ Genie Restaurant         → DO App → Restaurant Discovery          │    │
│   │ ✅ Catering Handler         → Corporate Catering + RFQ                │    │
│   │ ✅ AssetMind Connector      → Profit → Wealth Management             │    │
│   │ ✅ Expansion Agent          → SUTAR + Risna + CorpPerks + Nexha      │    │
│   │ ✅ Integration Hub          → Unified Interface + Health Check        │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                     RESTAURANT TWINS                                │    │
│   ├─────────────────────────────────────────────────────────────────────┤    │
│   │ ✅ Restaurant Twin    ✅ Order Twin      ✅ Kitchen Twin            │    │
│   │ ✅ Inventory Twin    ✅ Customer Twin   ✅ Staff Twin              │    │
│   │ ✅ Loyalty Twin      ✅ Table Twin                                  │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Restaurant Twin (7:00 AM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/twin/:merchantId` | Demand prediction with real weather |

### Owner Briefing (8:00 AM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/briefing/:merchantId` | Morning briefing with revenue, profit, recommendations |

### Customer Discovery (9:00 AM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/discover` | Natural language restaurant discovery |
| GET | `/api/restaurants/nearby` | Location-based restaurant search |
| GET | `/api/restaurants/:id` | Restaurant details with menu |

### REZ QR (9:15 AM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/qr/scan` | QR scan → Customer identity → Table assignment |

### Ordering (9:20 AM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create order |
| GET | `/api/orders/:id` | Get order status |
| PATCH | `/api/orders/:id` | Update order status |

### Procurement (10:00 AM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/procurement/alerts` | Inventory alerts |
| POST | `/api/procurement/trigger` | Trigger auto-procurement |

### Dashboard (6:00 PM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/:merchantId` | Evening intelligence view |

### Expansion (8:00 PM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expand/:merchantId` | Create expansion plan |
| GET | `/api/expand/:merchantId/progress` | Get expansion progress |
| POST | `/api/expand/:merchantId/execute` | Execute next phase |

### Wealth Transfer (10:00 PM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/wealth/transfer` | Transfer daily profits |
| GET | `/api/wealth/summary/:merchantId` | Get wealth summary |
| GET | `/api/wealth/recommendations/:merchantId` | Get investment recommendations |

### Catering

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/catering/inquiry` | Handle corporate catering inquiry |
| POST | `/api/catering/nlp` | Natural language catering request |

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/metrics` | Prometheus metrics |
| GET | `/services/status` | All connected services status |

---

## Integration Connectors

### 1. Weather Connector
**File:** `src/connectors/weather-connector.ts`

Connects to BuzzLocal Weather Service for real weather data.

```typescript
import { weatherConnector } from './connectors';

const prediction = await weatherConnector.getWeatherPrediction({
  latitude: 12.9716,
  longitude: 77.5946
});
// Returns: weather data + demand multipliers
```

### 2. QR Table Connector
**File:** `src/connectors/qr-table-connector.ts`

Connects to REZ Table QR Service for QR generation and scan processing.

```typescript
import { qrTableConnector } from './connectors';

// Generate QR codes
await qrTableConnector.generateTableQRCodes('REST001', 'mtr-hsr', [
  { tableNumber: '1', capacity: 4 }
]);

// Process scan
const result = await qrTableConnector.processScan({
  qrData: '...',
  customerId: 'customer-123'
});
```

### 3. Nexha Procurement Connector
**File:** `src/connectors/nexha-procurement-connector.ts`

Connects to NexhaBizz Reorder Engine for automatic procurement.

```typescript
import { nexhaProcurementConnector } from './connectors';

await nexhaProcurementConnector.sendInventorySignal({
  merchantId: 'MTR001',
  item: { name: 'Tomatoes', currentStock: 5, reorderPoint: 20 },
  severity: 'high'
});
```

### 4. Genie Restaurant Connector
**File:** `src/connectors/genie-restaurant-connector.ts`

Connects DO App to restaurant discovery for Genie recommendations.

```typescript
import { genieRestaurantConnector } from './connectors';

const result = await genieRestaurantConnector.discoverRestaurants({
  query: 'South Indian breakfast',
  location: { latitude: 12.9352, longitude: 77.6245 }
});
```

### 5. Catering Handler
**File:** `src/connectors/catering-handler.ts`

Handles corporate catering inquiries and RFQ generation.

```typescript
import { cateringHandler } from './connectors';

const result = await cateringHandler.handleInquiry({
  companyName: 'Tech Corp',
  partySize: 500,
  eventType: 'corporate_event',
  eventDate: '2026-07-15'
});
```

### 6. AssetMind Connector
**File:** `src/connectors/assetmind-connector.ts`

Connects restaurant profits to wealth management.

```typescript
import { assetMindConnector } from './connectors';

const result = await assetMindConnector.transferDailyProfits({
  merchantId: 'MTR001',
  restaurantId: 'MTR-HSR',
  profitData: { revenue: 280000, foodCost: 78400, laborCost: 61600, netProfit: 112000 }
});
```

### 7. Restaurant Expansion Agent
**File:** `src/connectors/restaurant-expansion-agent.ts`

Autonomous restaurant expansion using SUTAR, RisnaEstate, CorpPerks, Nexha.

```typescript
import { restaurantExpansionAgent } from './connectors';

const plan = await restaurantExpansionAgent.createExpansionPlan({
  merchantId: 'MTR001',
  targetLocations: 10,
  timeline: '12 months'
});
```

### 8. Integration Hub
**File:** `src/connectors/index.ts`

Unified interface for all connectors.

```typescript
import { WaitronIntegrationHub, waitronHub } from './connectors';

const hub = new WaitronIntegrationHub();
await hub.initialize();
const status = await hub.healthCheck();
```

---

## Story Flow Integration

| Time | Story Event | Connector Used |
|------|------------|-----------------|
| 7:00 AM | Weather predicts rain | `weatherConnector` |
| 9:00 AM | Karim asks Genie for breakfast | `genieRestaurantConnector` |
| 9:15 AM | Karim scans table QR | `qrTableConnector` |
| 10:00 AM | Tomatoes running low | `nexhaProcurementConnector` |
| 2:00 PM | Corporate catering inquiry | `cateringHandler` |
| 8:00 PM | Expansion to 10 locations | `restaurantExpansionAgent` |
| 10:00 PM | Profit to wealth | `assetMindConnector` |

---

## Story: "The Restaurant That Never Stopped Learning"

### MTR HSR, Bangalore - Powered by Waitron

**Characters:**
- **Karim** - Customer, lives in BTM, uses REZ daily
- **Arif** - Owner of MTR HSR, 3 restaurants, planning 20 locations

### Daily Flow

```
7:00 AM - Before The Restaurant Opens
────────────────────────────────────────
Waitron analyzes:
• Yesterday sales
• Reservations
• Customer demand
• Weather (via BuzzLocal)
• Traffic
• Inventory
• Staff schedules
• Local events

Prediction: "Rain after 6 PM, Delivery +27%, Biryani +14%"

8:00 AM - The Owner Wakes Up
────────────────────────────────────────
Genie prepares Arif's briefing:
• Revenue Yesterday: ₹2.8 Lakhs
• Profit Margin: 24%
• Food Waste: 2.1%
• Top Dish: Chicken Biryani
• Tomato Inventory: Low
• Weekend Demand: High
• Recommended Actions: 3

9:00 AM - Customer Discovery
────────────────────────────────────────
Karim opens REZ App, asks Genie:
"Good breakfast nearby"

Genie knows:
• Karim likes South Indian breakfast
• Usually eats before meetings
• Prefers quieter places
• Meeting in Koramangala at 11 AM

MTR HSR recommended (via Waitron)

9:15 AM - Arrival
────────────────────────────────────────
Karim scans table QR
Waitron recognizes:
• Identity
• Karma
• Loyalty
• Previous visits
• Favorites

Table 5 assigned automatically

9:20 AM - Ordering
────────────────────────────────────────
Waitron shows:
• "Your Favorites" (Masala Dosa, Filter Coffee)
• "New Special Breakfast"
• "20 Karma Bonus Available"

Order placed → Kitchen Agent → Inventory Agent → Finance Agent

10:00 AM - Inventory Problem
────────────────────────────────────────
Tomatoes running low (5kg, min: 20kg)
Inventory Twin detects critical

Nexha activates:
• Farm Agents respond
• Distributor Agents respond
• RFQ created
• Contract signed
• Delivery scheduled

Arif never calls suppliers.

2:00 PM - Corporate Opportunity
────────────────────────────────────────
Company wants lunch for 500 employees
HR Manager asks CoPilot

Waitron matches MTR → Proposal generated → Contract signed

8:00 PM - Expansion
────────────────────────────────────────
Arif asks: "Open 10 more restaurants"

Sutar activates:
• Risa RealEstate finds locations
• CorpPerks finds staff
• Nexha finds suppliers
• AdBazaar creates campaigns
• RIDZA creates forecasts
• RABTUL creates merchant accounts

10:00 PM - Personal Wealth
────────────────────────────────────────
Profits transferred to AssetMind
Portfolio updated
Auto-investment executed
```

---

## Comparison: Traditional vs Waitron

| Aspect | Traditional Restaurant | Waitron-Powered |
|--------|----------------------|-----------------|
| Weather Prediction | None | ✅ Real-time BuzzLocal |
| Customer Discovery | Word of mouth | ✅ Genie AI recommendations |
| Table Assignment | Manual | ✅ QR scan → Auto-seat |
| Procurement | Manual calls | ✅ Auto via Nexha |
| Catering | Sales calls | ✅ AI matching + RFQ |
| Expansion | Consultants | ✅ Autonomous agents |
| Wealth Management | Separate app | ✅ Auto transfer |

---

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server |
| `npm run build` | Build TypeScript |
| `npm start` | Production server |
| `docker-compose up` | Docker deployment |

---

## Docker

```bash
# Build image
docker build -t waitron .

# Run container
docker run -p 4820:4820 --env-file .env waitron

# Docker Compose (all services)
docker-compose up -d
```

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "compression": "^1.7.4",
  "prom-client": "^15.1.0",
  "winston": "^3.11.0",
  "axios": "^1.6.0",
  "zod": "^3.22.0"
}
```

---

## Related Services

| Service | Port | Purpose |
|---------|------|---------|
| BuzzLocal Weather | 4301 | Weather data |
| REZ Table QR | 4025 | QR generation/scan |
| NexhaBizz | 3000 | Procurement |
| AssetMind | 5200 | Wealth management |
| SUTAR Goal | 4150 | Goal decomposition |
| RisnaEstate | 4300 | Location search |
| CorpPerks | 4006 | Staff management |

---

## Documentation

- [Full Integration Docs](src/connectors/README.md)
- [Build Summary](src/connectors/BUILD-SUMMARY.md)
- [INTEGRATION.md](INTEGRATION.md)

---

**Last Updated:** 2026-06-14

**Built by:** Claude Code

**Tagline:** "The Restaurant That Never Stopped Learning"
