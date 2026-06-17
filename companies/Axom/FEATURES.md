# Axom - Community Intelligence Platform

**Last Updated:** June 17, 2026  
**Location:** `companies/Axom/`  
**Status:** ✅ **PRODUCTION READY**  
**Tagline:** "Community Intelligence & Local Discovery"

---

## Overview

Axom provides community intelligence and local discovery services for the RTMN ecosystem. It connects via Layer 15 (Consumer) and powers BuzzLocal for hyperlocal discovery.

---

## Core Services

| Service | Port | Purpose |
|---------|------|---------|
| buzzlocal | 4000+ | Local business discovery |
| REZ-cosmic-twin | 4010 | Cosmic twin for context |
| REZ-emotional-intelligence | 4011 | Emotional context tracking |
| REZ-human-context-graph | 4012 | Human relationship graph |
| REZ-life-pattern-engine | 4013 | Life pattern analysis |
| REZ-life-story-engine | 4014 | Life story tracking |
| REZ-memory-engine | 4015 | Community memory |

### Compliance Services

| Service | Port | Purpose |
|---------|------|---------|
| audit-trail-service | 4020 | Audit logging |
| breach-detection-service | 4021 | Security breach detection |
| communication-compliance-service | 4022 | Communication compliance |
| llm-compliance-service | 4023 | LLM compliance checking |
| policy-engine-service | 4024 | Policy management |
| enforcement-gateway | 4025 | Compliance enforcement |
| agent-governance-service | 4026 | AI agent governance |

---

## Features

### BuzzLocal - Local Discovery

| Feature | Description | Status |
|---------|-------------|--------|
| Business Discovery | Find local businesses | ✅ |
| Reviews & Ratings | User reviews and ratings | ✅ |
| Category Search | Search by category | ✅ |
| Distance-Based | Sort by proximity | ✅ |
| Opening Hours | Real-time status | ✅ |
| Contact Info | Phone, address, website | ✅ |

### Community Intelligence

| Feature | Description | Status |
|---------|-------------|--------|
| Trend Detection | Local trend analysis | ✅ |
| Sentiment Analysis | Community sentiment | ✅ |
| Event Discovery | Local events | ✅ |
| Recommendation Engine | Personalized suggestions | ✅ |
| Demand Forecasting | Predict demand | ✅ |

### Emotional Intelligence

| Feature | Description | Status |
|---------|-------------|--------|
| Sentiment Tracking | User sentiment analysis | ✅ |
| Mood Detection | Detect user mood | ✅ |
| Context Awareness | Emotional context | ✅ |
| Relationship Health | Track relationships | ✅ |

### Life Pattern Engine

| Feature | Description | Status |
|---------|-------------|--------|
| Pattern Recognition | Daily/weekly patterns | ✅ |
| Routine Detection | Identify routines | ✅ |
| Anomaly Detection | Unusual patterns | ✅ |
| Prediction | Predict next actions | ✅ |

---

## API Endpoints

### BuzzLocal

```
GET  /api/buzzlocal/search         - Search local businesses
GET  /api/buzzlocal/business/:id   - Get business details
GET  /api/buzzlocal/reviews/:id    - Get business reviews
POST /api/buzzlocal/reviews        - Add review
GET  /api/buzzlocal/nearby         - Get nearby businesses
GET  /api/buzzlocal/trending       - Get trending businesses
```

### Community Intelligence

```
GET  /api/community/trends         - Get local trends
GET  /api/community/sentiment      - Get sentiment analysis
GET  /api/community/events         - Get local events
POST /api/community/recommend      - Get recommendations
```

### Emotional Intelligence

```
GET  /api/emotional/:userId        - Get user emotional state
POST /api/emotional/track          - Track emotional data
GET  /api/emotional/relationships  - Get relationship health
```

### Life Patterns

```
GET  /api/patterns/:userId         - Get life patterns
GET  /api/patterns/anomalies       - Get detected anomalies
POST /api/patterns/learn           - Learn new patterns
```

---

## RTMN Ecosystem Integration

### Connected Services

| Service | Port | Purpose |
|---------|------|---------|
| Genie Personal Twin | 4708 | Personal context |
| Restaurant OS | 5010 | Local restaurant discovery |
| Hotel OS | 5025 | Local hotel discovery |
| AdBazaar | 4056 | Local advertising |
| REZ-Consumer | 3000 | Consumer app integration |

### Layer Integration

| RTMN Layer | Connection |
|------------|------------|
| Layer 2 (Customer Growth) | Local marketing, ads |
| Layer 15 (Consumer) | Discovery, referrals |

---

## Use Cases

### 1. Restaurant Discovery

Users discover nearby restaurants:
1. BuzzLocal searches nearby restaurants
2. Shows reviews and ratings
3. Displays opening hours
4. Connects to Restaurant OS for ordering

### 2. Hotel Discovery

Travelers find local hotels:
1. BuzzLocal shows nearby hotels
2. Sentiment analysis of reviews
3. Connects to Hotel OS for booking

### 3. Community Events

Local event discovery:
1. Events appear in BuzzLocal
2. Sentiment analysis of interest
3. Connects to relevant industry OS

---

## Competitive Advantages

| Feature | Generic Discovery | Axom/BuzzLocal |
|---------|-------------------|----------------|
| Hyperlocal | Limited | ✅ Deep local integration |
| Community Sentiment | ❌ | ✅ Real-time sentiment |
| Life Patterns | ❌ | ✅ AI-powered patterns |
| RTMN Integration | ❌ | ✅ Full ecosystem |
| Emotional Context | ❌ | ✅ Emotional intelligence |

---

## Related Documentation

- [CLAUDE.md](CLAUDE.md) - Technical architecture
- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md) - Company registry
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../../RTNM-PRODUCTS-FEATURES-AUDIT.md) - Product features

---

*Last Updated: June 17, 2026*
*Axom - Part of RTMN Ecosystem*