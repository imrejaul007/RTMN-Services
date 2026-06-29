# Communication Preference Service

**Port:** 4905  
**Purpose:** Analyzes customer communication patterns to determine optimal channel, timing, and tone for marketing and support messages.

## API

```
POST /api/communication/preferences
```

### Input

```javascript
{
  channelHistory: {
    whatsapp: 45,
    email: 20,
    sms: 5
  },
  engagementHistory: {
    openRates: { email: 0.6, sms: 0.8 },
    responseRates: { whatsapp: 0.4, sms: 0.2 }
  },
  timezone: "Asia/Kolkata"
}
```

### Output

```javascript
{
  preferred_channel: "whatsapp",
  secondary_channels: ["email", "sms"],
  best_time_to_contact: {
    day: "Tuesday",
    time: "10:00-12:00",
    timezone: "Asia/Kolkata"
  },
  engagement_scores: {
    whatsapp: 0.45,
    email: 0.35,
    sms: 0.25
  },
  optimal_frequency: "bi-weekly",
  tone_preference: "friendly"
}
```

## Channel Priority

| Channel | Open Rate | Best For |
|---------|-----------|----------|
| WhatsApp | 98% | Quick updates, support |
| SMS | 90% | OTPs, urgent alerts |
| Email | 40-60% | Detailed content, offers |
| Push | 50-70% | App users, real-time |

## Start

```bash
npm install
npm start
# http://localhost:4905/health
```

## Tests

```bash
npm test
```

## Related

- Gateway: `services/customer-intelligence-gateway` (4896)
- Support Intelligence: `services/support-intelligence` (4900)
- WhatsApp OS: `products/hib/whatsapp-os` (4860)
