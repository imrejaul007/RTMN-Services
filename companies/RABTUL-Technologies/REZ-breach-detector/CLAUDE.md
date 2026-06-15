# RABTUL Breach Detector (Port 4196)

**Status:** ✅ Production Ready  
**Company:** RABTUL Technologies  
**Purpose:** Real-time SLA breach detection and remediation

## Overview

Detects SLA breaches in real-time using multiple detection strategies (threshold, anomaly, spike, pattern, sustained). Triggers auto-remediation based on severity, creates incidents, and sends multi-channel notifications.

## Features

### 1. Detection Methods
- **Threshold**: Direct threshold comparison
- **Anomaly**: Z-score based (3+ std deviations)
- **Spike**: 3x recent baseline
- **Pattern**: 5 consecutive declining values
- **Sustained**: Monotonic decline detection

### 2. Severity Classification
- **low**: <10% deviation
- **medium**: 10-25% deviation
- **high**: 25-50% deviation
- **critical**: >50% deviation

### 3. Auto-Remediation by Severity
- **critical**: Page on-call + auto-scale
- **high**: Alert team via Slack
- **medium**: Log for review
- **low**: Track only

### 4. Incident Management
- Auto-create from breach
- Multi-breach incidents
- Status workflow: open → investigating → identified → monitoring → closed
- Assignment to engineers
- Full timeline tracking

### 5. Notifications
- 5 channels: email, slack, pagerduty, webhook, sms
- Per-channel severity filtering
- Enable/disable per channel
- Notification log

### 6. Root Cause Analysis
- Probabilistic cause ranking
- Metric-specific heuristics
- Recommendations
- Similar incident lookup

### 7. Event Streaming
- Server-Sent Events (SSE)
- Real-time updates
- Heartbeat for connection health

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/api/v1/info` | Service info |
| POST | `/api/v1/breach` | Detect breach |
| GET | `/api/v1/breach` | List breaches |
| GET | `/api/v1/breach/:id` | Get breach |
| PATCH | `/api/v1/breach/:id/status` | Update status |
| DELETE | `/api/v1/breach/:id` | Delete |
| GET | `/api/v1/breach/:id/events` | Get events |
| GET | `/api/v1/breach/stats/summary` | Stats |
| POST | `/api/v1/detection/analyze` | Analyze data |
| POST | `/api/v1/detection/analyze-and-remediate` | Analyze + remediate |
| GET | `/api/v1/detection/stream` | SSE stream |
| POST | `/api/v1/incident` | Create incident |
| GET | `/api/v1/incident` | List incidents |
| GET | `/api/v1/incident/:id` | Get incident |
| PATCH | `/api/v1/incident/:id/status` | Update status |
| PATCH | `/api/v1/incident/:id/assign` | Assign |
| POST | `/api/v1/remediation/trigger/:breachId` | Trigger remediation |
| GET | `/api/v1/remediation/:id` | Get remediation |
| GET | `/api/v1/remediation/breach/:breachId` | For breach |
| POST | `/api/v1/remediation/channels` | Register channel |
| GET | `/api/v1/remediation/channels` | List channels |
| POST | `/api/v1/remediation/analyze-cause/:breachId` | Root cause |

## Events Published

- `breach-detector.ready`
- `breach.detected`
- `breach.acknowledged`
- `breach.resolved`
- `remediation.started`
- `remediation.completed`
- `pagerduty.alert`
- `slack.alert`
- `auto.scale`
- `incident.created`
- `incident.open`/`investigating`/`identified`/`monitoring`/`closed`
- `notification.{channel-type}`
