# HOJAI Studio — Complete Documentation

> **Version:** 1.0.0
> **Built:** June 26, 2026
> **Purpose:** Build any AI company in 30 minutes

---

## Quick Start

```bash
# Start all services
bash scripts/start-hojai.sh

# Open Studio UI
open http://localhost:3001

# Or use API directly
curl -X POST localhost:4570/api/v1/deploy \
  -d '{"companyName": "TravelMate", "template": "ota"}'
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HOJAI STUDIO ORCHESTRATOR (4570)               │
│         ONE API TO RULE THEM ALL                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    FOUNDRY SERVICES (6)                       │   │
│  │  Template Compiler (4500) • BAM (4510) • Agent Gen (4520)  │   │
│  │  Auth (4530) • Deploy Pipeline (4540) • Flows (4550)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    OTA SERVICES (4)                          │   │
│  │  PMS Integration (4700) • GDS (4701) • Payment (4702)     │   │
│  │  Build Pipeline (4703)                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    NEXHA NETWORK (40+)                      │   │
│  │  Payment Network • Logistics • Hotel OS • Healthcare OS   │   │
│  │  Insurance Network • Trade Finance • Discovery OS         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 17 Templates

| Template | AI Agents | Monthly Cost | Like |
|----------|-----------|-------------|------|
| **Online Travel Agency** | 13 | $4,450 | MakeMyTrip |
| **Agentic E-Commerce** | 12 | $4,050 | Amazon |
| **Food Delivery** | 10 | $3,100 | Swiggy |
| **Import/Export** | 9 | $3,250 | Alibaba |
| **Mobility** | 13 | $3,800 | Uber |
| **Marketplace** | 8 | $2,800 | Shopify |
| **Healthcare** | 6 | $1,900 | Practo |
| **Education** | 6 | $1,550 | BYJU's |
| **Fintech** | 7 | $2,650 | CRED |
| **Logistics** | 8 | $2,800 | Delhivery |
| **Restaurant** | 6 | $2,100 | Zomato |
| **Hotel** | 7 | $2,450 | OYO |
| **Super App** | 15 | $5,500 | Paytm |
| **Social Commerce** | 7 | $2,450 | Meesho |
| **B2B Commerce** | 9 | $3,150 | IndiaMART |
| **Insurance** | 5 | $1,750 | PolicyBazaar |
| **Stock Trading** | 6 | $2,100 | Groww |

---

## 510 Companies Mapped

### Commerce (10)
Amazon, Flipkart, Alibaba, eBay, Etsy, Shopify, Meesho, Udaan, IndiaMART, Jumbotail

### Food Delivery (8)
Zomato, Swiggy, DoorDash, UberEats, Instacart, Grubhub, DeliveryHero, Rapido

### Mobility (6)
Uber, Ola, Lyft, Grab, Gojek, Rapido

### Healthcare (7)
Practo, 1mg, PharmEasy, MFine, MediBuddy, ICICI Prudential, LIC

### Fintech (10)
PhonePe, Razorpay, CRED, Groww, Upstox, Zerodha, Jar, Fi, Juspay, Paytm

### Education (9)
BYJU's, Unacademy, PhysicsWallah, Vedantu, Toppr, upGrad, Simplilearn, Coursera, Udemy

### Travel (8)
OYO, MakeMyTrip, Goibibo, Yatra, Booking.com, Agoda, Trivago, Airbnb

### Logistics (8)
Delhivery, BlackBuck, Drodo, LocoNav, Rivigo, Ecom Express, Xpressbees, Delhivery FTL

---

## 50+ Flows Ready

### OTA Flows
1. `hotel_search_flow` - Search → Book hotel
2. `flight_search_flow` - Search → Book flight
3. `package_booking_flow` - Holiday package booking
4. `corporate_booking_flow` - Corporate travel
5. `loyalty_flow` - Points & rewards
6. `refund_flow` - Cancellation & refund

### E-Commerce Flows
1. `buyer_journey` - Browse → Purchase
2. `order_fulfillment` - Order → Delivery
3. `returns_flow` - Return → Refund
4. `seller_onboarding` - Add seller
5. `pricing_optimization` - Dynamic pricing
6. `marketing_automation` - Campaigns

### Food Delivery Flows
1. `order_flow` - Order → Delivery
2. `restaurant_onboarding` - Add restaurant
3. `delivery_matching` - Find driver
4. `support_flow` - Complaints
5. `fraud_detection` - Fake orders

### Mobility Flows
1. `ride_booking` - Request → Ride
2. `driver_onboarding` - Add driver
3. `surge_pricing` - Dynamic pricing
4. `safety_incident` - Emergency response

---

## API Reference

### Deploy Company
```bash
POST /api/v1/deploy
{
  "companyName": "TravelMate",
  "template": "ota",
  "sector": "travel"
}
```

### Get Templates
```bash
GET /api/v1/templates
```

### Get Flows
```bash
GET /api/v1/flows?template=ota
```

### Execute Flow
```bash
POST /api/v1/flows/ota/hotel_search_flow/execute
```

### Connect Nexha
```bash
POST /api/v1/nexha/payment-network/connect
```

---

## Nexha Integration

Every template automatically connects to relevant Nexha networks:

| Template | Nexha Networks |
|----------|---------------|
| OTA | hotel-os, flight-os, payment-network, insurance-network, loyalty-os |
| E-Commerce | payment-network, logistics-network, catalog-os, discovery-os |
| Food Delivery | payment-network, logistics-network, restaurant-os |
| Mobility | payment-network, mobility-os, insurance-network, logistics-network |
| Healthcare | healthcare-os, insurance-network, pharmacy-network |
| Fintech | payment-network, banking-os, investment-network |
| Education | education-os, learning-os |
| Import/Export | trade-finance-network, customs-network, logistics-network |

---

## Deploy Example: "TravelMate AI" (OTA)

```bash
# 1. Deploy
curl -X POST localhost:4570/api/v1/deploy \
  -d '{
    "companyName": "TravelMate",
    "template": "ota",
    "sector": "travel",
    "options": { "mobile": true }
  }'

# Response:
{
  "success": true,
  "deployment": {
    "id": "dep_xxx",
    "companyName": "TravelMate",
    "flows": ["hotel_search_flow", "flight_search_flow", ...],
    "agents": ["TripPlannerAgent", "HotelDiscoveryAgent", ...],
    "nexhaConnections": ["hotel-os", "payment-network", ...],
    "urls": {
      "passenger": "https://travelmate.passenger.hojai.app",
      "admin": "https://travelmate.admin.hojai.app",
      "api": "https://travelmate.api.hojai.app"
    },
    "status": "live"
  }
}

# 2. Open dashboard
open https://travelmate.admin.hojai.app

# 3. Download mobile apps
open https://apps.hojai.app/travelmate/ios.ipa
open https://apps.hojai.app/travelmate/android.aab
```

---

## Cost Comparison

| Company Type | Traditional Cost/mo | HOJAI AI/mo | Savings |
|-------------|-------------------|-------------|---------|
| OTA | $150,000 | $4,450 | 97% |
| E-Commerce | $120,000 | $4,050 | 97% |
| Food Delivery | $80,000 | $3,100 | 96% |
| Mobility | $100,000 | $3,800 | 96% |
| Healthcare | $60,000 | $1,900 | 97% |
| Fintech | $70,000 | $2,650 | 96% |

---

## Files

```
foundry/
├── services/
│   ├── template-compiler/     # :4500
│   ├── bam-integration/       # :4510
│   ├── agent-generator/       # :4520
│   ├── auth-middleware/       # :4530
│   ├── deploy-pipeline/      # :4540
│   ├── flows-engine/         # :4550
│   ├── company-mapper/       # :4560
│   └── studio-orchestrator/   # :4570
│
├── starters/
│   ├── ota/                   # Online Travel Agency
│   ├── ecommerce/             # E-Commerce
│   ├── food-delivery/         # Food Delivery
│   ├── mobility/              # Mobility
│   ├── healthcare/            # Healthcare
│   ├── education/             # Education
│   └── ... (10 more templates)
│
├── services/
│   ├── pms-integration/       # :4700
│   ├── gds-integration/       # :4701
│   ├── payment-gateway/       # :4702
│   └── build-pipeline/        # :4703
│
└── products/
    └── hojai-studio-ui/       # :3001
```

---

## Next Steps

1. **Connect Real APIs** - Add real PMS/GDS credentials
2. **Deploy to Cloud** - Use HOJAI Cloud for hosting
3. **Launch Mobile** - Submit to App Store/Play Store
4. **Scale** - Add more agents, customize flows

---

## Testing

### Test Infrastructure

HOJAI AI uses **Vitest** for testing across all services.

```bash
# Run all tests
cd companies/HOJAI-AI
npx vitest run

# Run tests for specific service
npx vitest run platform/twins/behavioral-twin/__tests__/

# Run with coverage
npx vitest run --coverage
```

### Test Coverage

| Service Group | Tests Created | Status |
|--------------|--------------|--------|
| **Twin Services** | behavioral-twin, knowledge-twin, memory-twin, relationship-twin, reputation-twin, twin-analytics, twin-mobile | ✅ Complete |
| **Connector Services** | salesforce-connector, hubspot-connector, slack-connector, github-connector, jira-connector, notion-connector, shopify-connector | ✅ Complete |
| **AgentOS Services** | agent-registry | ✅ Complete |
| **Skills Services** | skill-os | ✅ Complete |
| **BLR AI Marketplace** | roi-calculator | ✅ Complete |

### Test Patterns

All tests follow these patterns:

1. **Constants Validation** - Verify all enum values and constants
2. **Validation Tests** - Test input validation for all entities
3. **Calculation Tests** - Verify mathematical functions (ROI, scoring, etc.)
4. **Edge Case Tests** - Handle empty inputs, boundary conditions, error states
5. **Business Logic Tests** - Test core functionality with realistic scenarios

### Adding New Tests

```typescript
// Example test structure
import { describe, it, expect } from 'vitest';

describe('MyService - Feature', () => {
  it('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Running Tests in CI

Tests run automatically on:
- Every push to main branch
- Pull request creation
- Manual trigger via GitHub Actions

---

*Built with ❤️ by HOJAI AI*
