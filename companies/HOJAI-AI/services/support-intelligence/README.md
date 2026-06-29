# Support Intelligence Service

**Port:** 4900  
**Purpose:** Analyzes customer support patterns to predict escalation probability, recommend agent type, and suggest communication tone.

## API

```
POST /api/support/profile
```

### Input

```javascript
{
  ticketHistory: {
    total: 15,
    last90d: 8,
    escalations: 2
  },
  refundRequests: {
    total: 5,
    denied: 1
  },
  sentiment: "neutral",
  channelHistory: {
    whatsapp: 10,
    email: 3
  }
}
```

### Output

```javascript
{
  tickets_90d: 8,
  refund_rate: 0.2,
  sentiment: "neutral",
  escalation_probability: 0.35,
  priority: "normal",
  recommended_tone: "friendly",
  preferred_channel: "whatsapp",
  recommended_agent: "ai",
  likely_resolution: "apology",
  wait_time_tolerance: "medium"
}
```

## Priority Levels

| Priority | Escalation Prob | Tickets/90d |
|----------|-----------------|--------------|
| High | > 50% | > 10 |
| Normal | 20-50% | 3-10 |
| Low | < 20% | < 3 |

## Agent Types

| Agent | When |
|-------|------|
| AI | Low escalation, low refund rate |
| Human | Medium escalation or refund rate |
| Specialist | High escalation or high refund rate |

## Start

```bash
npm install
npm start
# http://localhost:4900/health
```

## Tests

```bash
npm test
```

## Related

- Gateway: `services/customer-intelligence-gateway` (4896)
- Customer Twin: `platform/twins/customer-twin` (4895)
- Live Support OS: `products/hib/live-support-os`
