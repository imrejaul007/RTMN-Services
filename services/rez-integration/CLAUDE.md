# REZ Integration Service

**Version:** 1.0.0
**Port:** 4961
**Status:** Active Development

---

## Overview

REZ Integration Service connects the REZ ecosystem (REZ-Consumer, REZ-Merchant, REZ-Delivery) to Customer Operations and Digital Twins. It acts as a bridge, synchronizing data across services and maintaining real-time consistency.

## Architecture

```
                    REZ Integration Service (4961)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │   REZ   │          │   REZ   │          │   REZ   │
   │Consumer │          │ Merchant│          │ Delivery│
   │ (3000)  │          │ (4800)  │          │ (4500)  │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
        │  TwinOS   │   │  Event    │   │  Customer │
        │   Hub     │   │   Bus     │   │   Ops     │
        │ (4705)    │   │ (4510)    │   │  Bridge   │
        └───────────┘   └───────────┘   └───────────┘
```

## Twin Sync Mappings

| Twin Type | Source | Sync Events |
|-----------|--------|-------------|
| **Order Twin** | REZ-Consumer, REZ-Merchant | order.created, order.updated, order.status_changed |
| **Product Twin** | REZ-Merchant | product.created, product.updated, availability |
| **Shipment Twin** | REZ-Delivery | shipment.created, shipment.status_changed, location |
| **Payment Twin** | REZ-Wallet, All | payment.completed, payment.refunded |
| **Customer Twin** | REZ-Consumer, Genie | profile.created, profile.updated |
| **Delivery Twin** | REZ-Delivery | partner.location, partner.status |
| **Area Twin** | REZ-Merchant | merchant.location, operating zones |

## API Endpoints

### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/api/twins/sync` | Trigger full twin sync |
| GET | `/api/twins/:twinType` | Get twin status |
| GET | `/api/bridges/customer-ops` | Bridge connection status |

### REZ-Consumer Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/consumer/health` | Consumer service health |
| GET | `/api/consumer/profile/:consumerId` | Get consumer profile |
| POST | `/api/consumer/order` | Create consumer order |
| PUT | `/api/consumer/order/:orderId/status` | Update order status |
| GET | `/api/consumer/orders/:consumerId` | Get order history |
| POST | `/api/consumer/wallet/topup` | Wallet topup |
| GET | `/api/consumer/genie-context/:consumerId` | Get Genie AI context |
| POST | `/api/consumer/webhook` | Consumer webhooks |

### REZ-Merchant Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/merchant/health` | Merchant service health |
| GET | `/api/merchant/profile/:merchantId` | Get merchant profile |
| POST | `/api/merchant/pos/order` | Process POS order |
| PUT | `/api/merchant/order/:orderId/status` | Update order status |
| GET | `/api/merchant/products/:merchantId` | Get merchant products |
| POST | `/api/merchant/products` | Add/update product |
| PUT | `/api/merchant/products/:productId/availability` | Update availability |
| GET | `/api/merchant/orders/:merchantId` | Get merchant orders |
| POST | `/api/merchant/payments/settlement` | Process settlement |
| POST | `/api/merchant/webhook` | Merchant webhooks |

### REZ-Delivery Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/delivery/health` | Delivery service health |
| GET | `/api/delivery/partner/:partnerId` | Get partner profile |
| PUT | `/api/delivery/partner/:partnerId/location` | Update location |
| PUT | `/api/delivery/partner/:partnerId/status` | Update partner status |
| POST | `/api/delivery/shipment` | Create shipment |
| PUT | `/api/delivery/shipment/:shipmentId/status` | Update shipment status |
| GET | `/api/delivery/shipment/:shipmentId/track` | Track shipment |
| GET | `/api/delivery/partner/:partnerId/earnings` | Get partner earnings |
| POST | `/api/delivery/assign` | Assign delivery to order |
| POST | `/api/delivery/webhook` | Delivery webhooks |

## Environment Variables

```bash
# Service
PORT=4961

# REZ Ecosystem
REZ_CONSUMER_URL=http://localhost:3000
REZ_MERCHANT_URL=http://localhost:4800
REZ_DELIVERY_URL=http://localhost:4500
REZ_WALLET_URL=http://localhost:4004

# Digital Twins
TWIN_OS_HUB_URL=http://localhost:4705
ORDER_TWIN_URL=http://localhost:3018
PRODUCT_TWIN_URL=http://localhost:3015
SHIPMENT_TWIN_URL=http://localhost:3019
CUSTOMER_TWIN_URL=http://localhost:3016
PAYMENT_TWIN_URL=http://localhost:4004

# Event Bus
EVENT_BUS_URL=http://localhost:4510

# Genie
GENIE_API_URL=http://localhost:4703
```

## Quick Start

```bash
cd services/rez-integration
npm install
cp .env.example .env
npm run dev
```

## Events Published

The service publishes the following events to the Event Bus:

- `consumer.order.created`
- `consumer.order.status_changed`
- `merchant.order.created`
- `merchant.order.status_changed`
- `merchant.product.created`
- `merchant.payment.settled`
- `delivery.shipment.created`
- `delivery.shipment.assigned`
- `delivery.shipment.status_changed`
- `delivery.partner.status_changed`

## Data Flow

### Order Creation Flow
```
REZ-Consumer → POST /api/consumer/order
                ↓
         [TwinSyncService]
                ↓
    ┌───────────┼───────────┐
    ↓           ↓           ↓
Order Twin  Customer Twin  Customer Ops
                          Bridge
                ↓
         [EventBus]
         order.created
```

### Delivery Assignment Flow
```
REZ-Merchant → Order Ready
                    ↓
REZ-Delivery → POST /api/delivery/shipment
                    ↓
              [TwinSyncService]
                    ↓
         ┌──────────┼──────────┐
         ↓          ↓          ↓
    Shipment    Order Twin   Customer Ops
    Twin                     Bridge
                    ↓
         [EventBus]
         delivery.shipment.assigned
```

## Related Services

| Service | Port | Purpose |
|---------|------|---------|
| REZ-ecosystem-connector | 4399 | Service Registry |
| REZ-event-bus | 4510 | Pub/Sub Events |
| TwinOS Hub | 4705 | Digital Twins |
| MemoryOS | 4703 | AI Memory |
| Agent Twin | 3011 | Agent Profiles |
| Property Twin | 3015 | Properties |
| Buyer Twin | 3017 | Buyer Profiles |
| Deal Twin | 3018 | Deal Management |

## Service Dependencies

- **Required:** TwinOS Hub (4705), Event Bus (4510)
- **Optional:** REZ-Consumer, REZ-Merchant, REZ-Delivery (graceful fallback)
- **For Genie Context:** MemoryOS (4703)

## Troubleshooting

### Twins not syncing
1. Check twin service health: `curl http://localhost:<twin-port>/health`
2. Verify network connectivity
3. Check logs for specific error messages

### Event publishing fails
1. Verify Event Bus is running
2. Check API key configuration
3. View Event Bus logs for subscription issues

### Service unavailable
1. Check if service started: `curl http://localhost:4961/health`
2. Verify all dependencies are running
3. Review startup logs for initialization errors

---

*Last Updated: June 2026*
