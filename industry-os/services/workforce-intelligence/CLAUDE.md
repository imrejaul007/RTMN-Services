# RTMN Workforce Intelligence

**Version:** 1.0  
**Port:** 5073  
**Status:** Phase 4 - Building  
**Parent:** RTMN Workforce OS  

---

## Overview

Workforce Intelligence is the AI-powered command center for HR operations, providing:
- Real-time workforce health monitoring
- Sentiment analysis
- Predictive analytics
- HR Command Center dashboard
- AI-powered insights

---

## Features

### Intelligence Layer
- Skills Graph
- Knowledge Graph
- Sentiment Intelligence
- Culture Intelligence
- Organization Health

### Predictive Analytics
- Attrition prediction
- Flight risk detection
- Burnout detection
- Performance forecasting
- Headcount planning

### AI Command Center
- CEO Dashboard
- HR Dashboard
- Real-time alerts
- Actionable insights
- Trend analysis

### Digital Twins
- Workforce Twin
- Organization Twin
- Skills Twin
- Knowledge Twin

---

## API Endpoints

### Analytics
```
GET  /api/analytics/overview         - CEO dashboard
GET  /api/analytics/hr-dashboard     - HR dashboard
GET  /api/analytics/health           - Org health score
GET  /api/analytics/alerts           - Active alerts
```

### Predictions
```
GET  /api/predictions/attrition      - Attrition forecast
GET  /api/predictions/flight-risk    - Flight risk scores
GET  /api/predictions/burnout        - Burnout risk
GET  /api/predictions/performance    - Performance forecast
GET  /api/predictions/headcount      - Headcount forecast
```

### Intelligence
```
GET  /api/intelligence/sentiment     - Org sentiment
GET  /api/intelligence/culture       - Culture score
GET  /api/intelligence/skills        - Skills graph
GET  /api/intelligence/knowledge     - Knowledge graph
```

### Insights
```
GET  /api/insights/cards            - Decision cards
GET  /api/insights/recommendations  - AI recommendations
GET  /api/insights/trends           - Trend analysis
```

---

## Events Subscribed

- `employee.created`
- `employee.terminated`
- `leave.requested`
- `performance.reviewed`
- `attendance.anomaly`

---

*Last Updated: June 17, 2026*
