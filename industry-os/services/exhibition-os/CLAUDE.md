# Exhibition OS v1.0.0

**Port:** 5040  
**Status:** ✅ PRODUCTION READY  
**Category:** Industry OS - Vertical Layer

---

## Overview

Exhibition OS is a comprehensive platform for managing trade shows, expos, conferences, and exhibitions. It provides end-to-end capabilities from booth management to lead capture and analytics.

---

## Modules

| Module | Description |
|--------|-------------|
| **Exhibition Management** | Create, publish, track exhibitions |
| **Booth Management** | Layout, selection, setup |
| **Exhibitor Portal** | Registration, dashboard, leads |
| **Attendee Portal** | Tickets, schedule, networking |
| **Session Management** | Keynotes, panels, workshops |
| **Sponsor Management** | Tiers, branding, benefits |
| **Badge System** | Generate, scan, verify |
| **Lead Capture** | QR scan, forms, qualification |
| **Analytics** | Traffic, engagement, ROI |
| **Digital Twin** | Virtual tour, 3D layout |

---

## AI Agents (8)

| Agent | Purpose |
|-------|---------|
| Booth Optimizer | Optimal booth layout and placement |
| Lead Qualifier | Qualify booth leads automatically |
| Attendee Matcher | Match attendees to exhibitors |
| Schedule Advisor | Session recommendations |
| Traffic Predictor | Predict foot traffic |
| Engagement Booster | Booth engagement tips |
| Badge Verifier | Fake badge detection |
| ROI Tracker | Exhibition ROI analysis |

---

## Data Models

### Exhibition
```javascript
{
  id, name, tagline, description,
  industry, venue, city, address,
  startDate, endDate, hours,
  ticketPrice, status,
  exhibitorCount, attendeeCount,
  expectedVisitors, actualVisitors,
  floorPlan, zones
}
```

### Booth
```javascript
{
  id, exhibitionId, exhibitorId,
  boothNumber, zoneName, category,
  size, description, logo, banner,
  products, offers, liveMetrics
}
```

### Exhibitor
```javascript
{
  id, exhibitionId, companyName,
  contactName, email, phone, website,
  industry, category, description,
  logo, boothIds, leadsCount, tier
}
```

### Attendee
```javascript
{
  id, exhibitionId, name, email,
  company, title, avatar, interests,
  ticketType, coinBalance, badgesEarned,
  visitedBooths, sessionsAttended,
  checkedIn
}
```

### Session
```javascript
{
  id, exhibitionId, title, description,
  type, speakerName, room,
  startTime, endTime, date,
  capacity, registeredCount, tags
}
```

### Lead
```javascript
{
  id, exhibitionId, boothId, exhibitorId,
  attendeeId, attendeeName, attendeeEmail,
  attendeeCompany, interest, notes,
  rating, score, tier, qualified
}
```

---

## API Endpoints

### Health & Info
```
GET /health
GET /api/modules
GET /api/agents
POST /api/agents/:id/run
```

### Exhibitions
```
GET  /api/exhibitions
POST /api/exhibitions
GET  /api/exhibitions/:id
PATCH /api/exhibitions/:id
POST /api/exhibitions/:id/publish
POST /api/exhibitions/:id/start
POST /api/exhibitions/:id/complete
GET  /api/exhibitions/:id/analytics
GET  /api/exhibitions/:id/heatmap
GET  /api/exhibitions/:id/traffic
```

### Booths
```
GET  /api/exhibitions/:id/booths
POST /api/exhibitions/:id/booths
GET  /api/booths/:id
PATCH /api/booths/:id
POST /api/booths/:id/book
GET  /api/booths/:id/analytics
GET  /api/booths/:id/leads
```

### Exhibitors
```
GET  /api/exhibitions/:id/exhibitors
POST /api/exhibitions/:id/exhibitors
GET  /api/exhibitors/:id
GET  /api/exhibitors/:id/analytics
GET  /api/exhibitors/:id/leads
```

### Attendees
```
GET  /api/exhibitions/:id/attendees
POST /api/exhibitions/:id/attendees
GET  /api/attendees/:id
POST /api/attendees/:id/checkin
POST /api/attendees/:id/visit/:boothId
GET  /api/attendees/:id/profile
GET  /api/attendees/:id/recommendations
```

### Sessions
```
GET  /api/exhibitions/:id/sessions
POST /api/exhibitions/:id/sessions
POST /api/sessions/:id/register
POST /api/sessions/:id/feedback
```

### Sponsors
```
GET  /api/exhibitions/:id/sponsors
POST /api/exhibitions/:id/sponsors
```

### Badges
```
POST /api/badges
POST /api/badges/:id/scan
POST /api/badges/verify
```

### Leads
```
POST /api/leads
POST /api/leads/:id/qualify
PATCH /api/leads/:id
```

### Discovery
```
GET /api/exhibitions/:id/trending
```

---

## Quick Start

```bash
cd industry-os/services/exhibition-os
npm install
npm start  # Port 5040

# Test
curl http://localhost:5040/health

# Create exhibition
curl -X POST http://localhost:5040/api/exhibitions \
  -H "Content-Type: application/json" \
  -d '{"name":"Tech Expo 2026","industry":"tech","city":"Mumbai"}'
```

---

## RTMN Integration

| Service | Purpose |
|---------|---------|
| Marketing OS (5500) | Promote exhibitions |
| Analytics OS (4750) | Platform metrics |
| Event & Banquet OS (4751) | Event management |

---

*Last Updated: June 18, 2026*
