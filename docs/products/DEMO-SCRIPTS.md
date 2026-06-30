# Live Demo Scripts

> **Duration:** 5-10 minutes per demo
> **Audience:** Founders, Product Managers, Technical Leads

---

## Demo 1: EmotionOS (5 min)

### Setup (30 seconds)
```bash
# Start EmotionOS
curl http://localhost:4760/health

# Should see: {"status":"ok","service":"emotion-os-gateway"}
```

### Demo Flow

**Step 1: Detect Emotion from Text (1 min)**

```bash
curl -X POST http://localhost:4760/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I am frustrated with this service",
    "context": "customer_support"
  }'
```

**Expected Response:**
```json
{
  "emotions": {
    "frustration": 0.84,
    "anger": 0.72,
    "stress": 0.65
  },
  "trust": 0.21,
  "recommended_action": "escalate_to_human"
}
```

**Say:** "Watch how EmotionOS detects frustration from text in real-time."

---

**Step 2: Generate Empathy Response (1 min)**

```bash
curl -X POST http://localhost:4760/empathy \
  -H "Content-Type: application/json" \
  -d '{
    "emotion": "frustrated",
    "tone": "empathetic",
    "severity": "high"
  }'
```

**Expected Response:**
```json
{
  "response": "I completely understand your frustration, and I'm sorry you've experienced this. Let me connect you with our specialist right away."
}
```

**Say:** "And it generates empathetic responses automatically."

---

**Step 3: Voice Emotion Detection (2 min)**

```bash
curl -X POST http://localhost:4760/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, I need help",
    "voice": {
      "pitch": 85,
      "energy": 92,
      "speechRate": 195,
      "pauseFrequency": 1
    }
  }'
```

**Expected Response:**
```json
{
  "emotions": {
    "frustration": 0.78,
    "stress": 0.72
  },
  "confidence": 0.91,
  "alert": "high_frustration"
}
```

**Say:** "Voice analysis adds 20% more accuracy. High pitch + high energy + fast speech = frustrated caller."

---

**Step 4: Call to Action (30 seconds)**

"Integrate EmotionOS in 3 lines of code:
```javascript
import { EmotionOS } from '@hojai/emotion-sdk';
const emotion = await emotionOS.analyze({ text: message });
```"

**Price:** Starting at ₹15,000/month

---

## Demo 2: Trust Passport (5 min)

### Setup (30 seconds)
```bash
curl http://localhost:4980/health
# Should see: {"status":"ok","service":"trust-passport"}
```

### Demo Flow

**Step 1: Create Trust Passport (1 min)**

```bash
curl -X POST http://localhost:4980/passport \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "merchant_demo",
    "entityType": "merchant",
    "dimensions": {
      "reliability": 95,
      "competence": 88,
      "integrity": 92,
      "responsiveness": 85
    }
  }'
```

**Expected Response:**
```json
{
  "passport": {
    "overallTrust": 90,
    "trustLevel": "platinum",
    "badge": "🏆",
    "multiplier": 1.5,
    "benefits": [
      "50% fee reduction",
      "Instant payouts"
    ]
  }
}
```

**Say:** "Trust Passport gives merchants a verified trust score that travels across marketplaces."

---

**Step 2: Verify Trust (1 min)**

```bash
curl -X POST http://localhost:4980/verify \
  -H "Content-Type: application/json" \
  -d '{
    "passportId": "hojai:merchant_demo",
    "verifierId": "buyer_123",
    "purpose": "transaction"
  }'
```

**Expected Response:**
```json
{
  "verification": {
    "valid": true,
    "trustLevel": "platinum",
    "multiplier": 1.5,
    "verifiedAt": "2026-06-30T12:00:00Z"
  }
}
```

**Say:** "Buyers can verify trust instantly before making transactions."

---

**Step 3: Economic Benefits (2 min)**

```bash
curl http://localhost:4980/passport/hojai:merchant_demo/benefits
```

**Expected Response:**
```json
{
  "benefits": [
    { "type": "fee_reduction", "value": "50%" },
    { "type": "payout_speed", "value": "instant" },
    { "type": "support", "value": "priority" }
  ]
}
```

**Say:** "Platinum merchants get 50% fee reduction and instant payouts. Trust pays for itself."

---

**Step 4: Call to Action (30 seconds)**

"Trust Passport API: 3 lines to verify any merchant:
```javascript
const trust = await trustPassport.verify(merchantId);
if (trust.level === 'platinum') {
  // Give them the best rates
}
```"

**Price:** Starting at ₹10,000/month

---

## Demo 3: Company Emotion (5 min)

### Setup (30 seconds)
```bash
curl http://localhost:4780/health
# Should see: {"status":"ok","service":"company-emotion"}
```

### Demo Flow

**Step 1: Create Company Profile (1 min)**

```bash
curl -X POST http://localhost:4780/company \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "startup_demo",
    "name": "Acme Tech",
    "industry": "SaaS"
  }'
```

**Expected Response:**
```json
{
  "company": {
    "id": "startup_demo",
    "name": "Acme Tech",
    "morale": 70,
    "burnoutRisk": 0.3
  }
}
```

**Say:** "Company Emotion tracks team morale and burnout risk automatically."

---

**Step 2: Add Employee Emotion (1 min)**

```bash
curl -X POST http://localhost:4780/employee/emotion \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp_123",
    "companyId": "startup_demo",
    "emotion": "stressed",
    "intensity": 0.8,
    "context": "quarterly_targets"
  }'
```

**Expected Response:**
```json
{
  "employee": {
    "id": "emp_123",
    "avgStress": 0.8,
    "burnoutRisk": 0.65
  }
}
```

**Say:** "Individual burnout tracking. 0.65 risk = warning level."

---

**Step 3: Company Analytics (2 min)**

```bash
curl http://localhost:4780/company/startup_demo/analytics
```

**Expected Response:**
```json
{
  "companyId": "startup_demo",
  "overallMorale": 68,
  "moraleLevel": "good",
  "burnoutRisk": 0.42,
  "departments": [
    { "name": "Engineering", "morale": 72, "burnoutRisk": 0.38 },
    { "name": "Sales", "morale": 58, "burnoutRisk": 0.65 }
  ],
  "recommendations": [
    "Sales team burnout risk elevated - schedule check-ins"
  ]
}
```

**Say:** "Department-level visibility. Sales team needs attention."

---

**Step 4: Call to Action (30 seconds)**

"Company Emotion dashboard:
- Real-time morale tracking
- Burnout prediction 2 weeks early
- Manager alerts

Price: ₹5,000/month for 10 employees"

---

## Demo 4: Full Integration (10 min)

### Architecture Overview

```
Customer Support Ticket
        │
        ▼
  EmotionOS Detection
  (Is customer frustrated?)
        │
   Yes ──────── No
    │           │
    ▼           ▼
Escalate    Auto-response
to human     with empathy
    │           │
    └─────┬─────┘
          ▼
   Record to Trust Passport
   (Trust score update)
          │
          ▼
   Company Emotion Dashboard
   (Team morale tracking)
```

### Full Flow Demo

**1. Customer Message (30 sec)**
```bash
curl -X POST http://localhost:4760/analyze \
  -d '{"text":"This is ridiculous. I have been waiting for 3 weeks!","context":"support"}'
```

**2. Auto-escalate if frustrated (30 sec)**
```bash
# If frustration > 0.7, route to human
```

**3. Update Trust Score (30 sec)**
```bash
curl -X POST http://localhost:4980/interaction \
  -d '{"merchant":"seller_123","outcome":"resolved","type":"support_ticket"}'
```

**4. Track Team Morale (30 sec)**
```bash
curl -X POST http://localhost:4780/employee/emotion \
  -d '{"employeeId":"support_agent","emotion":"stressed","context":"difficult_customer"}'
```

**5. Manager Dashboard (30 sec)**
```bash
curl http://localhost:4780/company/company_123/analytics
```

---

## Objection Handling During Demos

### "We already have sentiment analysis"
- "Sentiment is binary (positive/negative). We detect 10+ specific emotions."

### "How do you prevent gaming?"
- "Multi-source verification + behavior anomaly detection + audit trail."

### "Privacy concerns"
- "All processing is on-device or private cloud. We can't see raw data."

### "Too expensive"
- "One frustrated customer costs ₹5,000 in churn. Prevention pays for itself."

---

## Demo Checklist

- [ ] Start all services (`bash scripts/start-human-intelligence.sh start`)
- [ ] Test all API calls locally
- [ ] Prepare competitor comparisons
- [ ] Have case studies ready
- [ ] Know pricing tiers
- [ ] Set up Calendly for follow-up
- [ ] Send demo recording link

---

## Demo Follow-up Email

Subject: "HOJAI EmotionOS - Next Steps"

```
Hi [Name],

Thanks for the demo today! 

As discussed, here's the quick recap:
- EmotionOS: Real-time emotion detection + empathy generation
- Trust Passport: Portable trust credentials for merchants
- Company Emotion: Team morale + burnout prevention

Your 7-day free trial: [LINK]

Pricing: Starting ₹15,000/month

Questions? Let's chat.
[Calendly Link]

Best,
[Your Name]
```

---

## Video Demo Recording

### Setup
1. Screen share: API dashboard
2. Record terminal commands
3. Show response JSONs
4. Add voice-over narration

### Length: 2-3 minutes
1. Hook (10 sec): "What if AI could sense frustration?"
2. Demo (90 sec): Live API calls
3. Results (30 sec): Show real responses
4. CTA (20 sec): "Start free trial"

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Demo completion rate | 80% |
| Demo-to-trial conversion | 40% |
| Trial-to-paid | 30% |
| Average deal size | ₹25,000/month |
| Sales cycle | 2 weeks |
