# RETAIL Vertical Documentation

## Overview

The **RETAIL** vertical covers all commerce and point-of-sale related services within the ReZ platform. This vertical enables merchants to manage their stores, process orders, handle payments, and engage customers through QR-based interactions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RETAIL VERTICAL                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   QR SDK    │    │  BNPL Svc   │    │Delivery Svc │    │White Label  │  │
│  │             │    │             │    │             │    │   Service   │  │
│  │  - Menu QR  │    │ - EMI Calc  │    │ - Tracking  │    │ - Partners  │  │
│  │  - Store QR │    │ - Credit    │    │ - Status    │    │ - Branding  │  │
│  │  - Campaign │    │ - Payments  │    │             │    │             │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                   │                   │                   │         │
│         └───────────────────┴─────────┬─────────┴───────────────────┘         │
│                                       │                                         │
│                            ┌──────────┴──────────┐                            │
│                            │   Merchant SDK      │                            │
│                            │   (Deprecated)      │                            │
│                            └──────────┬──────────┘                            │
│                                       │                                         │
│                            ┌──────────┴──────────┐                            │
│                            │   Loyalty Client    │                            │
│                            │   (Karma Points)    │                            │
│                            └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Services Inventory

| Service | Port | Description | Status |
|---------|------|-------------|--------|
| `rez-bnpl-service` | 3080 | Buy Now Pay Later with EMI calculations | Active |
| `rez-white-label-service` | 3083 | White-label platform for partners | Active |
| `rez-instant-delivery-service` | 3084 | Instant delivery tracking and management | Active |
| `@rez/qr-sdk` | N/A | Unified SDK for QR systems | Active |
| `@rez/loyalty-client` | N/A | Loyalty program with Karma integration | Active |

## Modules

### POS (Point of Sale)
QR-based point of sale system enabling:
- Menu management for restaurants
- Store profiles (Linktree-style)
- Order placement and tracking
- Split bill functionality
- Digital payments via wallet

**Document:** [01_POS.md](./01_POS.md)

### Inventory Management
Product and menu management:
- Menu item catalog
- Category management
- Dietary filters
- Stock tracking
- Product recommendations

**Document:** [02_INVENTORY.md](./02_INVENTORY.md)

## QR System Overview

The QR SDK supports multiple QR types:

| QR Type | Purpose | Use Case |
|---------|---------|----------|
| **Menu QR** | Restaurant menus | Scan to view menu, place orders |
| **Store QR** | Store profiles (Rez Now) | Linktree-style business pages |
| **Room QR** | Hotel services | Room service, checkout |
| **Campaign QR** | Marketing | Promotions, rewards attribution |

## Payment Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Menu QR │───>│  Order   │───>│   BNPL   │───>│  Wallet  │
│  (POS)   │    │ Creation │    │  (EMI)   │    │ Checkout │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

## Key Dependencies

- **MongoDB**: Primary database for all services
- **Redis**: Caching and job queues
- **@rez/shared**: Common utilities and types
- **@rez/shared-types**: Type definitions

## Environment Configuration

```typescript
// Service URLs
API_URL=https://api.rez.money
WALLET_URL=https://wallet.rez.money
PAYMENT_URL=https://payment.rez.money
AUTH_URL=https://auth.rez.money
MERCHANT_URL=https://merchant.rez.money
```

## Documentation Structure

```
SOT/2_VERTICALS/Retail/
├── README.md           # This file
├── 01_POS.md          # Point of Sale documentation
└── 02_INVENTORY.md    # Inventory management documentation
```

## Related Platforms

- **Commerce Platform** (`/commerce-platform`): Parent platform for retail services
- **AI Platform** (`/ai-platform`): AI services for recommendations and intent capture

## Status

| Component | Status |
|-----------|--------|
| BNPL Service | Active |
| White Label | Active |
| Instant Delivery | Active |
| QR SDK | Active |
| Loyalty Client | Active |

---

*Last Updated: 2026-05-10*
