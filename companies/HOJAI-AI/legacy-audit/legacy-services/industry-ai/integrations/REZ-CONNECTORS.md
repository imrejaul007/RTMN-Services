# HOJAI Industry AI - REZ-Merchant Integration Connectors

This folder contains connectors that allow HOJAI Industry AI to integrate with REZ-Merchant services.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 HOJAI Industry AI                      │
│                   (Non-REZ Clients)                   │
├─────────────────────────────────────────────────────┤
│  AI Layer:                                            │
│  • AI Employees (200+)                                │
│  • Industry Brains                                     │
│  • Voice AI, WhatsApp                                │
├─────────────────────────────────────────────────────┤
│                   Connectors                          │
│  (Use REZ services for REZ clients)                  │
│  (Use built-in services for non-REZ clients)        │
├─────────────────────────────────────────────────────┤
│                 REZ Merchant OS                       │
│              (For REZ Ecosystem Clients)              │
├─────────────────────────────────────────────────────┤
│  Backend Services:                                    │
│  • rez-restaurant-service                            │
│  • rez-salon-service                                 │
│  • rez-pms-service                                   │
│  • etc.                                             │
└─────────────────────────────────────────────────────┘
```

## Available Connectors

| Connector | REZ Service | Purpose |
|-----------|-------------|---------|
| [restaurant-connector.ts](restaurant-connector.ts) | rez-restaurant-service | Restaurant operations |
| [salon-connector.ts](salon-connector.ts) | rez-salon-service | Salon operations |
| [hotel-connector.ts](hotel-connector.ts) | rez-pms-service | Hotel operations |
| [fitness-connector.ts](fitness-connector.ts) | rez-fitness-service | Gym operations |
| [retail-connector.ts](retail-connector.ts) | rez-pos-service | Retail operations |
| [healthcare-connector.ts](healthcare-connector.ts) | rez-healthcare-service | Healthcare operations |

## Usage

### For REZ Clients
```typescript
import { RestaurantConnector } from './restaurant-connector';

const connector = new RestaurantConnector({
  useREZServices: true,
  rezApiKey: process.env.REZ_API_KEY,
  rezBaseUrl: process.env.REZ_API_URL,
});

// HOJAI AI calls will route to REZ services
const menu = await connector.getMenu(restaurantId);
```

### For Non-REZ Clients
```typescript
const connector = new RestaurantConnector({
  useREZServices: false,
  // Uses built-in services from industry-ai
});

// HOJAI AI uses its own services
const menu = await connector.getMenu(branchId);
```

## Status

✅ Connectors defined
⏳ REZ API client implementation needed
