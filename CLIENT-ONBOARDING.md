# Client Onboarding Guide

**Last Updated:** June 15, 2026

This guide walks clients through the standard onboarding process for RTMN products.

---

## Onboarding Overview

| Plan | Timeline | Steps |
|------|----------|-------|
| **Free** | Self-serve, instant | Sign up → Configure → Go |
| **Starter/Professional** | 1-2 weeks | Kickoff → Setup → Training → Go-live |
| **Enterprise** | 2-4 weeks | Discovery → Design → Build → Deploy → Training → Hypercare |

---

## Phase 1: Kickoff (Week 1)

### Day 1: Welcome

- [ ] Send welcome email with onboarding guide
- [ ] Schedule kickoff call (30 min)
- [ ] Create client account in billing system
- [ ] Create client folder in Google Drive / Notion
- [ ] Add to client Slack channel (if applicable)

### Kickoff Call Agenda (30 min)

1. **Introductions** (5 min)
   - RTMN team members and roles
   - Client team members and roles

2. **Goals & Success Criteria** (10 min)
   - What are you trying to achieve?
   - How will you measure success?
   - What does "good" look like in 30/60/90 days?

3. **Current State** (5 min)
   - What systems are you currently using?
   - What data sources exist?
   - Who are your key stakeholders?

4. **Timeline & Milestones** (5 min)
   - Go-live date
   - Key events to work around
   - Decision-making process

5. **Next Steps** (5 min)
   - Action items
   - Access provisioning
   - Next meeting scheduled

### Deliverables

- Signed order form / MSA
- Client contacts list (name, email, role)
- Current system inventory
- Success criteria document

---

## Phase 2: Setup (Week 1-2)

### Access Provisioning

| System | Access Needed | Owner |
|--------|--------------|-------|
| RTMN Platform | Admin account | RTMN |
| Source systems | API keys, credentials | Client |
| Data sources | Export access | Client |
| Communication | Slack/Teams channel | RTMN |

### Technical Setup

#### BrandPulse Setup Checklist

- [ ] Create BrandPulse account
- [ ] Verify email domain ownership
- [ ] Add first brand(s)
  - Brand name
  - Website URL
  - Industry vertical
- [ ] Connect review sources
  - Google Business Profile (OAuth)
  - Yelp (API key)
  - TripAdvisor (API key)
  - Facebook (Page ID)
- [ ] Configure alert rules
  - Negative review threshold
  - Key metric thresholds
  - Notification channels (email, Slack, webhook)
- [ ] Set up webhooks (if applicable)
  - CRM integration
  - Ticketing system
  - Custom endpoint
- [ ] Import historical data (if available)
- [ ] Configure dashboard preferences
  - Default brand view
  - Alert thresholds
  - Notification settings

#### Hotel OS Setup Checklist

- [ ] Create Hotel OS account
- [ ] Configure locations
  - Name, address, timezone
  - Room types
  - Operating hours
- [ ] Integrate PMS (if applicable)
  - Opera
  - Cloudbeds
  - Mews
  - Custom API
- [ ] Set up RTNM Digital Twin
  - Connect customer data
  - Enable guest twin
- [ ] Configure integrations
  - Booking engine
  - Channel manager
  - Review platform
- [ ] Set up staff accounts
  - Roles and permissions
  - MFA enforcement
- [ ] Import historical data (if available)

### Configuration Checklist

- [ ] Branding (logo, colors, favicon)
- [ ] Email templates (review request, alerts)
- [ ] Notification preferences
- [ ] Timezone and locale settings
- [ ] User roles and permissions
- [ ] API rate limits (if custom)

---

## Phase 3: Integration (Week 2)

### RTNM SDK Integration

For clients integrating with the broader RTNM ecosystem:

```typescript
import { RTMNClient } from '@rtmn/sdk';

// Initialize RTMN client
const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY,
  environment: 'production'
});

// Verify connection
const status = await rtmn.health.check();
console.log('RTMN connected:', status.connected);

// Get your digital twins
const twins = await rtmn.twins.list({ type: 'brand' });
console.log('Brands:', twins);
```

### Webhook Setup

```typescript
// Your webhook endpoint
app.post('/webhooks/brandpulse', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-brandpulse-signature'];
  const payload = req.body;

  // Verify signature
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Handle event
  const event = JSON.parse(payload);
  switch (event.type) {
    case 'review.negative':
      // Create support ticket
      createTicket(event.data);
      break;
    case 'sentiment.spike':
      // Alert team
      sendAlert(event.data);
      break;
  }

  res.status(200).send('OK');
});
```

---

## Phase 4: Training (Week 2-3)

### Training Schedule

| Session | Duration | Audience | Content |
|---------|----------|----------|---------|
| Platform Overview | 1 hour | All users | Navigation, key concepts |
| Dashboard Deep Dive | 1 hour | Power users | All features, filters, exports |
| Admin & Settings | 30 min | Admins | Users, billing, integrations |
| API & Integration | 1 hour | Developers | SDK, webhooks, REST API |
| Advanced Features | 1 hour | Power users | Alerts, automation, reporting |
| Q&A | 30 min | All | Open questions |

### Training Materials

- [ ] Slide deck (shared after session)
- [ ] Recording (for async viewing)
- [ ] Quick reference guide (1-page PDF)
- [ ] FAQ document
- [ ] Practice environment access

---

## Phase 5: Go-Live (Week 3-4)

### Go-Live Checklist

#### 1 Week Before

- [ ] All integrations tested
- [ ] All users trained
- [ ] Support contacts shared
- [ ] Go-live date confirmed

#### 1 Day Before

- [ ] Final data sync complete
- [ ] Monitoring alerts configured
- [ ] On-call engineer assigned
- [ ] Rollback plan documented

#### Go-Live Day

- [ ] Verify all services healthy
- [ ] Check monitoring dashboards
- [ ] Watch for errors in first hour
- [ ] Confirm data flowing correctly
- [ ] Send go-live confirmation to client

#### Day After

- [ ] Check for any issues
- [ ] Review first-day metrics
- [ ] Address any user questions
- [ ] Schedule 1-week check-in

---

## Phase 6: Hypercare (Weeks 4-8)

### Hypercare Support

- Daily check-ins (first week)
- Dedicated Slack channel
- Priority support response
- Weekly status reports
- Rapid issue resolution

### 1-Week Check-In

- [ ] Review usage metrics
- [ ] Address user questions
- [ ] Identify quick wins
- [ ] Plan next phase

### 30-Day Review

- [ ] Review success criteria
- [ ] Present ROI data
- [ ] Identify expansion opportunities
- [ ] Plan quarterly roadmap

---

## Enterprise Onboarding Add-Ons

For Enterprise clients, additional phases:

### Discovery Phase (Week 1)

- Stakeholder interviews (3-5)
- Technical architecture review
- Security and compliance review
- Data mapping workshop

### Design Phase (Week 2)

- Custom integration design
- Workflow automation design
- Reporting requirements
- SSO/SAML configuration

### Build Phase (Week 3-4)

- Custom development
- Integration testing
- User acceptance testing
- Security review

### Extended Training

- Onsite training (1-2 days)
- Train-the-trainer program
- Role-specific training tracks
- Executive briefings

---

## Resources

| Resource | Link |
|----------|------|
| Documentation | docs.rtmn.io (TBD) |
| API Reference | api-docs.rtmn.io (TBD) |
| Status Page | status.rtmn.io (TBD) |
| Support | support@rtmn.com |
| Training Videos | [TBD] |

---

## Contact

**Onboarding Team:** onboarding@rtmn.com
**Your Onboarding Manager:** [Name assigned at kickoff]
**Support:** See [SUPPORT.md](SUPPORT.md)

---

*Questions? Your onboarding manager is here to help. Don't hesitate to reach out.*