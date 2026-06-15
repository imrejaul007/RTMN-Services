# Energy OS - Development Guide

**Port:** 5100
**Type:** Industry OS (Energy)

## Architecture

Energy OS manages smart energy distribution from meters to billing.

### Core Components

1. **Smart Meter Management** - Registration, status tracking
2. **Consumption Tracking** - Reading collection, analytics
3. **Consumer Management** - Customer accounts, tariffs
4. **Billing System** - Slab-based tariffs, bill generation
5. **Grid Management** - Load monitoring, status
6. **Renewable Integration** - Solar, wind sources

### Data Models

#### Meter
```javascript
{
  id: string,
  consumerId: string,
  type: 'smart'|'industrial'|'commercial',
  status: 'active'|'inactive',
  location: string
}
```

#### Consumer
```javascript
{
  id: string,
  name: string,
  type: 'domestic'|'commercial'|'industrial',
  tariffId: string,
  meterId: string,
  address: string
}
```

#### Reading
```javascript
{
  id: string,
  meterId: string,
  reading: number,
  timestamp: string,
  unit: 'kWh'
}
```

### Digital Twins

- **Meter Twin** - All registered meters
- **Consumer Twin** - Customer base
- **Grid Twin** - Load and capacity
- **Billing Twin** - Pending bills
- **Renewable Twin** - Energy sources

### Integration Points

- **API Gateway** (port 3000)
- **TwinOS Hub**
- **RABTUL Payment** - Bill payments

### Testing

```bash
# Health check
curl http://localhost:5100/health

# Get meters
curl http://localhost:5100/api/meters

# Get tariffs
curl http://localhost:5100/api/tariffs

# Calculate bill
curl -X POST http://localhost:5100/api/bills/calculate \
  -H "Content-Type: application/json" \
  -d '{"consumerId":"c1","consumption":250}'
```
