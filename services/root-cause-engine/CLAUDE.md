# Root Cause Intelligence Engine

**Version:** 1.0.0  
**Port:** 4950  
**Status:** Production Ready

---

## Overview

The Root Cause Intelligence Engine analyzes complaint patterns to find **WHY** problems happen, not just **WHAT** the problem is. It builds causal chains, identifies contributing factors, and generates actionable recommendations with ROI calculations.

---

## Quick Start

```bash
# Install dependencies
cd services/root-cause-engine
npm install

# Start the service
npm start

# Development mode
npm run dev
```

---

## API Endpoints

### Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Analyze complaints for root causes |
| POST | `/api/analyze/batch` | Batch analyze multiple complaint sets |
| GET | `/api/analyze/:analysisId` | Get specific analysis by ID |

### History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history` | Get analysis history for tenant |
| GET | `/api/history/:analysisId` | Get detailed analysis |
| GET | `/api/history/stats/summary` | Get summary statistics |
| GET | `/api/history/search` | Search analyses by keyword |
| DELETE | `/api/history/:analysisId` | Delete an analysis |

### Recommendations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations` | Get all recommendations |
| GET | `/api/recommendations/summary` | Get recommendation statistics |
| GET | `/api/recommendations/by-status/:status` | Filter by status |
| PATCH | `/api/recommendations/:id/status` | Update recommendation status |
| GET | `/api/recommendations/factors` | Get factor summary |
| GET | `/api/recommendations/factors/controllable` | Get controllable factors only |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/ready` | Readiness check |

---

## Usage Examples

### Analyze Complaints

```bash
curl -X POST http://localhost:4950/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "complaints": [
      {
        "title": "Delivery delayed by 5 days",
        "description": "Package arrived much later than expected",
        "category": "delivery",
        "severity": "high",
        "affectedUsers": 150,
        "revenueImpact": 25000,
        "timestamp": "2026-06-15T10:00:00Z"
      }
    ],
    "options": {
      "depth": 3,
      "includeHistorical": true
    }
  }'
```

### Response Structure

```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "causalChain": {
      "nodes": [
        { "level": "symptom", "title": "late delivery", ... },
        { "level": "issue", "title": "routing error", ... },
        { "level": "cause", "title": "poor route planning", ... },
        { "level": "root_cause", "title": "inadequate infrastructure", ... }
      ],
      "chainStrength": 85,
      "primaryRootCause": "inadequate infrastructure"
    },
    "factors": [
      { "type": "process", "name": "Unclear process documentation", "impact": 75, "controllability": "controllable" },
      { "type": "resource", "name": "Budget constraints", "impact": 60, "controllability": "uncontrollable" }
    ],
    "recommendations": [
      {
        "title": "Address root cause systematically",
        "priority": 10,
        "estimatedCost": 25000,
        "estimatedSavings": 75000,
        "roi": 300,
        "implementationEffort": "high",
        "timeframe": "8-12 weeks"
      }
    ],
    "similarCases": [...],
    "summary": "Analysis of 1 complaint(s) affecting 150 users...",
    "metadata": {
      "totalComplaints": 1,
      "totalAffectedUsers": 150,
      "totalRevenueImpact": 25000,
      "confidence": "high",
      "processingTimeMs": 234
    }
  }
}
```

### Get Recommendation Summary

```bash
curl http://localhost:4950/api/recommendations/summary?tenantId=tenant-123
```

---

## Causal Chain Structure

The engine builds a 4-level causal chain:

```
Symptom     → What customers experience (e.g., "late delivery")
   ↓
Issue       → The direct problem (e.g., "routing error")
   ↓
Cause       → Why the issue exists (e.g., "poor route planning")
   ↓
Root Cause  → The fundamental problem (e.g., "inadequate infrastructure")
```

---

## Contributing Factors

| Type | Description | Examples |
|------|-------------|----------|
| `process` | Process-related issues | Unclear documentation, missing checkpoints |
| `technology` | System/tech issues | Integration failures, data quality |
| `human` | People-related issues | Insufficient training, human error |
| `external` | External factors | Vendor issues, market conditions |
| `resource` | Resource constraints | Budget limits, capacity issues |
| `policy` | Policy-related issues | Restrictive policies, unclear guidelines |

### Controllability Levels

- **Controllable**: Can be directly addressed
- **Partially Controllable**: Can be influenced but not fully controlled
- **Uncontrollable**: External factors that must be accommodated

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4950 | Server port |
| `MONGODB_URI` | mongodb://localhost:27017/root-cause-engine | MongoDB connection string |
| `NODE_ENV` | development | Environment mode |
| `LOG_LEVEL` | info | Logging level |

---

## Database Schema

### Analysis
Stores root cause analysis records with causal chain references and metrics.

### CausalChain
Stores the causal chain structure with nodes at different levels (symptom, issue, cause, root_cause).

### Factor
Stores contributing factors with impact scores and controllability levels.

### Recommendation
Stores actionable recommendations with ROI calculations and implementation details.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Root Cause Engine                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Pattern     │───▶│   Chain      │───▶│   Factor     │  │
│  │  Detector    │    │   Builder    │    │   Analyzer   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │           │
│         └───────────────────┼───────────────────┘           │
│                             ▼                               │
│                    ┌──────────────┐                          │
│                    │ Recommendation│                         │
│                    │  Generator   │                          │
│                    └──────────────┘                          │
│                             │                                │
├─────────────────────────────┼───────────────────────────────┤
│                             ▼                                │
│                    ┌──────────────┐                          │
│                    │   MongoDB    │                          │
│                    └──────────────┘                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Integration with RTMN Ecosystem

This service connects to:

- **Service Registry** (4399) - Service discovery
- **Event Bus** (4510) - Publish analysis events
- **Industry OS** - Industry-specific complaint data

---

## License

Internal use only - RTMN Ecosystem
