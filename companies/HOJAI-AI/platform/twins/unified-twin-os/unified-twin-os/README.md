# RTMN Unified Twin Architecture

**Port:** 3014  
**Status:** Built ✅

## What It Does

Provides a unified taxonomy for all digital twins across RTMN:

- **Human Twin** - Customer, Employee, Patient, Guest
- **Business Twin** - Store, Restaurant, Hotel, Clinic
- **Asset Twin** - Property, Vehicle, Equipment
- **Market Twin** - Competitor, Region, Demand
- **Agent Twin** - AI Workers

## Quick Start

```bash
cd core/unified-twin-os
npm install
npm start
```

## API Examples

### Create Twin

```bash
curl -X POST http://localhost:3014/api/twins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Palace",
    "type": "business",
    "subtype": "restaurant",
    "data": {"seats": 50}
  }'
```

### Search Across Types

```bash
curl -X POST http://localhost:3014/api/relationships/federate \
  -H "Content-Type: application/json" \
  -d '{"query": "pizza", "types": ["human", "business"]}'
```

### Get Relationship Graph

```bash
curl http://localhost:3014/api/relationships/graph/twin_123?depth=3
```

## Twin Types

| Type | Subtypes |
|------|----------|
| human | customer, employee, patient, guest, member, user |
| business | store, restaurant, hotel, clinic, salon, gym, office, warehouse |
| asset | property, vehicle, equipment, inventory, machine |
| market | competitor, region, demand, supply, trend |
| agent | ai_worker, ai_manager, ai_specialist |

## Relationship Types

- OWNS
- WORKS_AT
- CUSTOMER_OF
- PARTNER
- SUPPLIER
- COMPETES_WITH
- LOCATED_IN

## Health Check

```bash
curl http://localhost:3014/health
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Full documentation
