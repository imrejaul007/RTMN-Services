# Salar OS - Workforce Intelligence Service

**Version:** 1.0 | **Date:** June 10, 2026 | **Status:** Ready for Integration

---

## Overview

Salar OS is the Workforce Intelligence layer of the RTMN ecosystem. It provides skills graph, team insights, capacity predictions, and workforce analytics.

### Position in RTMN Architecture

```
CorpID (Identity)
    ↓
MemoryOS (History)
    ↓
TwinOS (Representation)
    ↓
Salar OS (Workforce Intelligence)  ← You are here
    ↓
Sutar OS (Execution)
    ↓
Nexha (Economic Network)
```

---

## Service Information

| Attribute | Value |
|-----------|-------|
| Port | 4710 |
| MongoDB | corpperks database |
| Dependencies | CorpID (4702), Assertion Service (4707), Agent Registry (4708) |

---

## Core Features

### 1. Skills Graph
- Organization-wide skills inventory
- Skill relationships and dependencies
- Skill gap analysis
- Skill trend tracking

### 2. Team Intelligence
- Team composition analysis
- Team health scoring
- Skills coverage by team
- Member matching for tasks

### 3. Capacity Intelligence
- Capacity forecasting
- Bottleneck detection
- Utilization analysis
- Scheduling support

### 4. Workforce Analytics
- Headcount metrics
- Skills analytics
- Team health metrics
- Risk indicators

### 5. Sutar Integration
- Workforce matching for tasks
- Human + Agent hybrid recommendations
- Task assignment support

---

## API Reference

### Skills Graph

#### Get Skills Graph
```
GET /skills/graph/:orgId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orgId": "org-123",
    "skills": [
      {
        "skill": "python",
        "count": 25,
        "avgConfidence": 0.82
      }
    ],
    "totalEmployees": 150,
    "computedAt": "2026-06-10T12:00:00Z"
  }
}
```

#### Search Skills
```
POST /skills/search
```

**Request:**
```json
{
  "orgId": "org-123",
  "skills": ["python", "javascript"],
  "minConfidence": 0.6
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "corpId": "CI-IND-ABC12",
        "name": "Rejaul Karim",
        "totalConfidence": 1.8,
        "skills": [
          { "skill": "python", "confidence": 0.9 },
          { "skill": "javascript", "confidence": 0.9 }
        ]
      }
    ],
    "totalMatches": 5
  }
}
```

#### Skill Gap Analysis
```
GET /skills/gap/:orgId?targetSkills=python,kubernetes,docker
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSkills": 3,
      "present": 2,
      "missing": 1,
      "coveragePercent": 67
    },
    "gapAnalysis": [
      { "skill": "python", "gap": { "status": "PRESENT" } },
      { "skill": "kubernetes", "gap": { "status": "PRESENT" } },
      { "skill": "docker", "gap": { "status": "MISSING", "severity": "HIGH" } }
    ]
  }
}
```

---

### Team Intelligence

#### Get Team Details
```
GET /teams/:orgId/:teamId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "teamId": "team-123",
    "name": "Backend Team",
    "members": [...],
    "skills": ["python", "aws", "postgresql"],
    "capacity": 100,
    "utilization": 0.78,
    "healthScore": 0.85
  }
}
```

#### Find Team Members
```
POST /teams/find-members
```

**Request:**
```json
{
  "orgId": "org-123",
  "teamId": "team-123",
  "requiredSkills": ["python", "aws"],
  "maxMembers": 3
}
```

---

### Capacity Intelligence

#### Capacity Forecast
```
GET /capacity/:orgId/forecast?days=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "totalCapacity": 1000,
      "utilizationRate": 0.75,
      "availableCapacity": 250
    },
    "forecast": [
      {
        "date": "2026-06-11",
        "availableCapacity": 750,
        "utilizationRate": 0.75,
        "confidence": 0.99
      }
    ]
  }
}
```

#### Identify Bottlenecks
```
GET /capacity/:orgId/bottlenecks
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bottlenecks": [
      {
        "type": "OVERLOADED_TEAMS",
        "severity": "HIGH",
        "affectedTeams": 4,
        "recommendations": [
          "Consider redistributing work",
          "Evaluate hiring needs"
        ]
      }
    ],
    "overallRisk": "MEDIUM"
  }
}
```

---

### Workforce Analytics

#### Get Analytics Dashboard
```
GET /analytics/:orgId?period=weekly
```

#### Get Insights
```
GET /insights/:orgId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "SKILL_GAP",
        "title": "Skill gaps detected",
        "impact": "warning",
        "skills": ["docker", "kubernetes"]
      }
    ],
    "summary": {
      "critical": 0,
      "warnings": 2,
      "positive": 1
    }
  }
}
```

---

### Sutar Integration

#### Find Workforce for Task
```
POST /workforce/find
```

**Request:**
```json
{
  "orgId": "org-123",
  "task": "Build user authentication",
  "requiredSkills": ["python", "authentication"],
  "requiredCapacity": 40,
  "allowHybrid": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "candidates": [
      {
        "type": "HUMAN",
        "corpId": "CI-IND-ABC12",
        "name": "Rejaul Karim",
        "matchScore": 0.85,
        "cost": 0
      },
      {
        "type": "AGENT",
        "corpId": "CI-AGT-AUTH01",
        "name": "Auth Agent",
        "matchScore": 0.78,
        "cost": 0.02
      }
    ],
    "hybridRecommendation": {
      "description": "Hybrid team recommended",
      "human": {...},
      "agent": {...}
    }
  }
}
```

---

## Data Models

### Skills Graph
```typescript
interface WorkforceGraph {
  orgId: string;
  skills: Skill[];
  teams: Team[];
  totalEmployees: number;
  computedAt: Date;
}

interface Skill {
  skill: string;
  count: number;
  employees: {
    corpId: string;
    confidence: number;
    level: string;
  }[];
  avgConfidence: number;
}

interface Team {
  teamId: string;
  name: string;
  leadCorpId: string;
  memberCorpIds: string[];
  skills: string[];
  capacity: number;
  utilization: number;
}
```

### Capacity
```typescript
interface CapacityForecast {
  date: string;
  availableCapacity: number;
  utilizedCapacity: number;
  utilizationRate: number;
  confidence: number;
}

interface Bottleneck {
  type: 'OVERLOADED_TEAMS' | 'SKILL_SHORTAGE' | 'UNDERSTAFFED_TEAMS';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  affectedTeams?: number;
  affectedSkills?: number;
  recommendations: string[];
}
```

---

## Environment Variables

```bash
# Salar OS
PORT=4710
MONGODB_URI=mongodb://localhost:27017/salaros

# Dependencies
CORPID_SERVICE_URL=http://localhost:4702
ASSERTION_SERVICE_URL=http://localhost:4707
AGENT_REGISTRY_URL=http://localhost:4708
INTERNAL_SERVICE_TOKEN=corpid-internal-token
```

---

## Related Services

| Service | Port | Integration |
|---------|------|------------|
| CorpID | 4702 | Employee identities, relationships |
| Assertion Service | 4707 | Skills and capability assertions |
| Agent Registry | 4708 | AI agent capabilities |
| MemoryOS | 4201 | Historical events (future) |
| Sutar OS | TBD | Task assignment |

---

**Next:** Integration with Sutar OS for autonomous workforce orchestration
