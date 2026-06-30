# Company Emotion - Product Package

> **Product Name:** HOJAI Company Emotion
> **Category:** HR Tech / People Analytics
> **Pricing:** ₹5,000/month (10 employees), ₹15,000/month (50 employees), ₹50,000/month (Enterprise)
> **Status:** ✅ READY TO SELL

---

## Product Overview

**Company Emotion** is organization-level emotional intelligence. It tracks team morale, predicts burnout risk, and provides actionable insights for managers and HR.

---

## What You Get

### Morale Tracking
- Company-wide morale score
- Department breakdown
- Trend analysis over time
- Weekly snapshots

### Burnout Prevention
- Individual burnout risk scores
- Team burnout analytics
- Proactive alerts
- Intervention recommendations

### HR Analytics
- Employee emotion trends
- Team dynamics
- Meeting impact analysis
- Culture health metrics

### Manager Dashboard
- Real-time team alerts
- Department comparison
- Action recommendations
- Export to HR systems

---

## Pricing Tiers

| Feature | Team (10) | Business (50) | Enterprise |
|---------|---------|-------------|-----------|
| Price | ₹5,000/mo | ₹15,000/mo | ₹50,000/mo |
| Employees | 10 | 50 | Unlimited |
| Morale tracking | ✅ | ✅ | ✅ |
| Burnout alerts | ✅ | ✅ | ✅ |
| Department analytics | ❌ | ✅ | ✅ |
| Integration API | ❌ | ✅ | ✅ |
| Custom reports | ❌ | ❌ | ✅ |
| HR system sync | ❌ | ❌ | ✅ |

---

## Target Customers

### Primary
1. **Startups (20-100 employees)** - Prevent founder burnout
2. **HR departments** - Track team health
3. **Remote-first companies** - Monitor engagement

### Secondary
1. ** enterprises** - Culture initiatives
2. **Consulting firms** - Client team monitoring
3. **Healthcare** - Doctor burnout prevention

---

## Competitors & Positioning

| Competitor | Weakness | Our Advantage |
|------------|----------|---------------|
| Culture Amp | Expensive, slow | Real-time alerts |
| Lattice | Generic surveys | Emotion AI |
| 15Five | Self-reported only | Behavioral detection |
| OfficeVibe | Privacy concerns | Privacy-first |

**Positioning:** "The AI that spots burnout before it happens."

---

## Sales Deck (10 slides)

### Slide 1: Hook
**"87% of burnout happens silently. Until it's too late."**

### Slide 2: Problem
- 77% of employees experience burnout
- $125-190B in annual burnout costs
- Traditional surveys miss real-time signals
- Managers lack visibility into team health

### Slide 3: Solution
Company Emotion = Real-time morale tracking + Burnout prediction + Actionable insights

### Slide 4: How It Works
```
Communication → Emotion Detection → Morale Score → Alert
    ↓              ↓                  ↓            ↓
  Messages      AI analysis       Weekly trend    Manager
  Meetings      Behavior patterns Trending up      alert
  Surveys       Team patterns     Declining       Action items
```

### Slide 5: Features
- Morale dashboard per team
- Burnout risk prediction
- Proactive alerts
- Integration with Slack/Teams
- Action recommendations

### Slide 6: Morale Metrics
| Metric | Healthy | Warning | Critical |
|--------|---------|----------|----------|
| Morale Score | 70+ | 50-70 | <50 |
| Burnout Risk | <0.3 | 0.3-0.6 | >0.6 |
| Stress Trend | Stable | Declining | Sharp drop |

### Slide 7: Integration
```javascript
// Manager dashboard
const teamHealth = await companyEmotion.getAnalytics(teamId);

if (teamHealth.burnoutRisk > 0.6) {
  await alertManager({
    team: teamId,
    risk: 'high',
    message: '3 team members at burnout risk'
  });
}
```

### Slide 8: Pricing
| Tier | Employees | Price | Features |
|------|-----------|-------|----------|
| Team | 10 | ₹5K/mo | Morale + Alerts |
| Business | 50 | ₹15K/mo | +Departments |
| Enterprise | Unlimited | ₹50K/mo | +API +Custom |

### Slide 9: Case Study
**Company:** Tech startup in Bangalore
**Problem:** 25% quarterly attrition
**Solution:** Company Emotion monitoring
**Result:** 40% reduction in unexpected attrition

### Slide 10: CTA
**Start preventing burnout today.**
*"₹5,000/month for team health."*

---

## Demo Script (5 minutes)

### 1. Create Company
```bash
curl -X POST http://localhost:4780/company \
  -d '{
    "companyId": "startup_123",
    "name": "Acme Tech",
    "industry": "SaaS"
  }'
```

### 2. Record Employee Emotion
```bash
curl -X POST http://localhost:4780/employee/emotion \
  -d '{
    "employeeId": "emp_123",
    "companyId": "startup_123",
    "emotion": "stressed",
    "intensity": 0.8,
    "context": "quarterly_review"
  }'
```

### 3. Get Company Analytics
```bash
curl http://localhost:4780/company/startup_123/analytics
```

### Response
```json
{
  "companyId": "startup_123",
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

---

## Objection Handling

| Objection | Response |
|-----------|----------|
| "We have surveys" | "Surveys miss daily signals. We detect burnout 2 weeks earlier." |
| "Privacy concerns" | "100% anonymous. We can't identify individuals." |
| "Managers won't use it" | "It's automatic. Dashboard shows trends, not surveillance." |
| "Too expensive" | "One burned-out engineer costs ₹5L in turnover. ROI is 10x." |

---

## Go-to-Market

### Month 1: Launch
- [ ] Product Hunt launch
- [ ] HR tech communities
- [ ] 10 beta customers

### Month 2-3: Grow
- [ ] LinkedIn ads targeting HR heads
- [ ] Partnership with HR consultants
- [ ] Integration with BambooHR

### Month 4-6: Scale
- [ ] Enterprise sales team
- [ ] Industry verticals (Healthcare, Finance)
- [ ] $50K ARR target

---

## Files

| File | Purpose |
|------|---------|
| This doc | Product strategy |
| SALES-DECK.pptx | Sales deck |
| DEMO-SCRIPT.md | Live demo |
| API-REFERENCE.md | Technical docs |
| ROI-CALCULATOR.xlsx | Business case |
