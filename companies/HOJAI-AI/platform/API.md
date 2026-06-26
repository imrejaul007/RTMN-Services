# Employee Twin Ecosystem - Complete API Reference

> **Version:** 1.0.0
> **Date:** June 26, 2026

---

## 📋 Overview

The Employee Twin Ecosystem provides a comprehensive API for creating and managing digital twins. All services follow REST patterns with JSON responses.

### Base URL
```
http://localhost:{PORT}
```

### Response Format
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Health Check
```
GET /health
GET /ready
```

---

## 🔧 CORE TWINS (Phase 1)

### Communication Twin - Port 4743

#### Analyze Writing Style
```
POST /api/twin/:employeeId/communication/style
Content-Type: application/json

{
  "text": "Dear Sir, I am writing to inform you...",
  "channel": "email"
}

Response:
{
  "success": true,
  "data": {
    "profile": { ... },
    "analysis": {
      "wordCount": 45,
      "avgSentenceLength": 15.2,
      "formality": 85,
      "emojiUsage": 0
    }
  }
}
```

#### Analyze Tone
```
POST /api/twin/:employeeId/communication/tone
Content-Type: application/json

{
  "text": "URGENT: Need this ASAP!",
  "channel": "slack"
}

Response:
{
  "success": true,
  "data": {
    "tone": {
      "formal": 0.3,
      "friendly": 0.5,
      "urgent": 0.9,
      "positive": 0.4
    }
  }
}
```

#### Get Profile
```
GET /api/twin/:employeeId/communication/profile
```

#### Get Tone History
```
GET /api/twin/:employeeId/communication/tone-history
```

#### Set Negotiation Style
```
POST /api/twin/:employeeId/communication/negotiation-style
Content-Type: application/json

{
  "style": "collaborative"
}
```

#### Simulate Response
```
POST /api/twin/:employeeId/communication/simulate
Content-Type: application/json

{
  "context": "follow-up email",
  "recipientType": "customer",
  "channel": "email"
}
```

#### Get Stats
```
GET /api/twin/:employeeId/communication/stats
```

---

### Workflow Twin - Port 4741

#### Observe Action
```
POST /api/twin/:employeeId/workflow/observe
Content-Type: application/json

{
  "tool": "crm",
  "action": "create_lead",
  "target": "lead_form",
  "duration": 5,
  "outcome": "success"
}
```

#### Batch Observe
```
POST /api/twin/:employeeId/workflow/batch-observe
Content-Type: application/json

{
  "actions": [
    { "tool": "crm", "action": "create_lead" },
    { "tool": "email", "action": "send_intro" },
    { "tool": "crm", "action": "update_status" }
  ]
}
```

#### Get Workflows
```
GET /api/twin/:employeeId/workflow/patterns?status=active
```

#### Create Workflow
```
POST /api/twin/:employeeId/workflow/patterns
Content-Type: application/json

{
  "name": "Lead Qualification",
  "steps": [
    { "name": "Create Lead", "tool": "crm", "action": "create" },
    { "name": "Send Intro", "tool": "email", "action": "send" }
  ],
  "trigger": { "type": "event", "eventType": "new_lead" }
}
```

#### Simulate Workflow
```
POST /api/twin/:employeeId/workflow/simulate
Content-Type: application/json

{
  "workflowId": "wf_123",
  "context": { "leadId": "lead_456" },
  "dryRun": true
}
```

#### Get Stats
```
GET /api/twin/:employeeId/workflow/stats
```

---

### Decision Twin - Port 4742

#### Capture Decision
```
POST /api/twin/:employeeId/decision/capture
Content-Type: application/json

{
  "type": "purchasing",
  "domain": "operations",
  "choice": "Supplier A",
  "alternatives": ["Supplier B", "Supplier C"],
  "reasoning": {
    "factors": [
      { "name": "price", "weight": 0.3, "direction": "negative" },
      { "name": "quality", "weight": 0.5, "direction": "positive" }
    ],
    "model": "data-driven"
  },
  "outcome": "success"
}
```

#### Get Decision History
```
GET /api/twin/:employeeId/decision/history?type=purchasing&limit=50
```

#### Predict Decision
```
POST /api/twin/:employeeId/decision/predict
Content-Type: application/json

{
  "context": { "type": "purchasing" },
  "options": ["Supplier A", "Supplier B", "Supplier C"]
}

Response:
{
  "success": true,
  "data": {
    "predictedChoice": "Supplier A",
    "confidence": 85,
    "reasoning": "Based on 12 similar decisions"
  }
}
```

#### Get Patterns
```
GET /api/twin/:employeeId/decision/patterns
```

#### Add Reasoning
```
POST /api/twin/:employeeId/decision/:decisionId/reasoning
Content-Type: application/json

{
  "reasoning": {
    "factors": [...],
    "constraints": ["budget_limit"],
    "model": "experience"
  }
}
```

---

### Relationship Twin - Port 4744

#### Get Relationship Graph
```
GET /api/twin/:employeeId/relationship/graph

Response:
{
  "success": true,
  "data": {
    "nodes": [...],
    "edges": [...],
    "metrics": {
      "totalConnections": 45,
      "strongConnections": 12,
      "avgInfluence": 72,
      "networkDiversity": 5
    }
  }
}
```

#### Connect/Add Relationship
```
POST /api/twin/:employeeId/relationship/connect
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john@company.com",
  "role": "VP Sales",
  "company": "Acme Corp",
  "type": "external"
}
```

#### Update Relationship
```
PATCH /api/twin/:employeeId/relationship/:personId
Content-Type: application/json

{
  "influence": 85,
  "trust": 90,
  "sentiment": 0.8
}
```

#### Add Interaction
```
POST /api/twin/:employeeId/relationship/interaction
Content-Type: application/json

{
  "personId": "person_123",
  "type": "meeting",
  "subject": "Quarterly Review",
  "outcome": "Positive discussion",
  "sentiment": "positive",
  "duration": 60
}
```

#### Get Influence Metrics
```
GET /api/twin/:employeeId/relationship/influence
```

---

### Knowledge Twin - Port 4739

#### Add Knowledge Node
```
POST /api/twin/:employeeId/knowledge
Content-Type: application/json

{
  "concept": "Enterprise Sales",
  "description": "Deals > $100K requiring multiple stakeholders",
  "type": "declarative",
  "category": "sales",
  "tags": ["enterprise", "b2b", "complex"]
}
```

#### Get Knowledge Nodes
```
GET /api/twin/:employeeId/knowledge?category=sales&search=negotiation
```

#### Add Expertise
```
POST /api/twin/:employeeId/knowledge/expertise
Content-Type: application/json

{
  "domain": "Sales",
  "subdomains": ["enterprise", "channel", "digital"],
  "level": "advanced",
  "yearsExperience": 8,
  "certifications": ["Salesforce Admin", "HubSpot Expert"]
}
```

#### Get Knowledge Gaps
```
GET /api/twin/:employeeId/knowledge/gaps?filled=false
```

#### Add Knowledge Gap
```
POST /api/twin/:employeeId/knowledge/gaps
Content-Type: application/json

{
  "topic": "AI Sales Automation",
  "priority": "high",
  "currentLevel": "beginner",
  "desiredLevel": "intermediate"
}
```

#### Query Knowledge
```
POST /api/twin/:employeeId/knowledge/query
Content-Type: application/json

{
  "query": "negotiation tactics",
  "category": "sales"
}
```

---

### Reputation Twin - Port 4745

#### Get Reputation
```
GET /api/twin/:employeeId/reputation

Response:
{
  "success": true,
  "data": {
    "trustScore": {
      "overall": 85,
      "reliability": 90,
      "competence": 88,
      "communication": 82
    },
    "avgRating": 4.5,
    "totalReviews": 23,
    "badges": [...]
  }
}
```

#### Add Review
```
POST /api/twin/:employeeId/reputation/reviews
Content-Type: application/json

{
  "reviewerId": "manager_123",
  "type": "peer",
  "rating": 5,
  "strengths": ["Leadership", "Technical Skills"],
  "improvements": ["Delegation"],
  "comment": "Excellent team player"
}
```

#### Award Badge
```
POST /api/twin/:employeeId/reputation/badges
Content-Type: application/json

{
  "name": "Top Performer",
  "description": "Achieved 150% of targets",
  "tier": "gold"
}
```

---

### Behavioral Twin - Port 4746

#### Get Work Style
```
GET /api/twin/:employeeId/behavior/work-style
```

#### Set Work Style
```
POST /api/twin/:employeeId/behavior/work-style
Content-Type: application/json

{
  "workPattern": {
    "type": "morning",
    "preferredStartTime": "08:00"
  },
  "communicationPreference": "async",
  "decisionSpeed": "data-driven",
  "riskTolerance": 65
}
```

#### Log Energy Level
```
POST /api/twin/:employeeId/behavior/energy-log
Content-Type: application/json

{
  "day": "monday",
  "timeSlot": "09:00-11:00",
  "level": "high",
  "tasks": ["deep_work", "coding"]
}
```

#### Get Optimal Hours
```
GET /api/twin/:employeeId/behavior/optimal-hours

Response:
{
  "success": true,
  "data": {
    "optimalTimes": ["06:00-10:00", "14:00-16:00"],
    "basedOn": { "workStyle": "morning", "energyMap": "available" }
  }
}
```

#### Track Productivity
```
POST /api/twin/:employeeId/behavior/track
Content-Type: application/json

{
  "date": "2026-06-26",
  "tasksCompleted": 12,
  "meetingsHours": 3,
  "deepWorkHours": 4,
  "focusScore": 85,
  "score": 82
}
```

---

### Memory Twin - Port 4738

#### Add Memory
```
POST /api/memory/:employeeId
Content-Type: application/json

{
  "type": "fact",
  "content": "John prefers email over calls for complex discussions",
  "confidence": 85,
  "source": "observation",
  "tags": ["preference", "communication"]
}
```

#### Get Memories
```
GET /api/memory/:employeeId?type=fact&search=preference
```

---

## 🔭 OBSERVATION LAYER (Phase 2)

### Twin Observer - Port 4747

#### Subscribe to Events
```
POST /api/observer/subscribe
Content-Type: application/json

{
  "employeeId": "emp_123",
  "sources": ["email", "slack", "crm"],
  "twinId": "twin_456"
}
```

#### Ingest Event
```
POST /api/observer/events
Content-Type: application/json

{
  "employeeId": "emp_123",
  "source": "email",
  "type": "sent",
  "data": {
    "subject": "Project Update",
    "to": "team@company.com"
  }
}
```

#### Batch Ingest
```
POST /api/observer/events/batch
Content-Type: application/json

{
  "events": [
    { "employeeId": "emp_123", "source": "email", "type": "sent" },
    { "employeeId": "emp_123", "source": "slack", "type": "message" }
  ]
}
```

#### Get Events
```
GET /api/observer/events/:employeeId?source=email&limit=100
```

#### Get Stats
```
GET /api/observer/stats/:employeeId
```

---

### Human Teaching - Port 4748

#### Create Session
```
POST /api/teaching/sessions
Content-Type: application/json

{
  "employeeId": "emp_123",
  "twinId": "twin_456",
  "topic": "How to handle difficult customers",
  "description": "Best practices for escalation",
  "type": "screen_recording"
}
```

#### Start Recording
```
POST /api/teaching/sessions/:id/start
```

#### Add Frame
```
POST /api/teaching/sessions/:id/frames
Content-Type: application/json

{
  "timestamp": 12500,
  "description": "Click on customer profile",
  "keyPoints": ["Always verify customer", "Check history first"]
}
```

#### Add Voice Segment
```
POST /api/teaching/sessions/:id/voice
Content-Type: application/json

{
  "start": 12500,
  "end": 18200,
  "text": "When you see a red flag, always escalate to the manager...",
  "confidence": 92
}
```

#### Extract Knowledge
```
POST /api/teaching/sessions/:id/extract

Response:
{
  "success": true,
  "data": {
    "extracted": 5,
    "knowledge": [
      { "concept": "Escalation", "description": "Red flags require manager", "confidence": 88 }
    ]
  }
}
```

---

### Meeting Intelligence - Port 4749

#### Create Meeting
```
POST /api/meetings/:employeeId
Content-Type: application/json

{
  "title": "Q2 Planning",
  "participants": ["emp_1", "emp_2", "emp_3"]
}
```

#### Transcribe
```
POST /api/meetings/:meetingId/transcribe
Content-Type: application/json

{
  "transcript": "Meeting started at 9am..."
}
```

#### Add Decision
```
POST /api/meetings/:meetingId/decisions
Content-Type: application/json

{
  "decision": "Launch product in Q3"
}
```

#### Add Action Item
```
POST /api/meetings/:meetingId/actions
Content-Type: application/json

{
  "description": "Prepare budget proposal",
  "assignee": "emp_123",
  "dueDate": "2026-07-01"
}
```

---

### Skill Wallet - Port 4750

#### Get Wallet
```
GET /api/wallet/:employeeId
```

#### Install Skill
```
POST /api/wallet/:employeeId/skills/install
Content-Type: application/json

{
  "skillId": "sales-negotiation-pro",
  "name": "Sales Negotiation Pro",
  "source": "bam",
  "version": "2.1.0"
}
```

#### Create Composition
```
POST /api/wallet/:employeeId/compose
Content-Type: application/json

{
  "name": "Sales Enterprise Pack",
  "skills": ["sales-negotiation-pro", "enterprise-selling", "gcc-export"],
  "purpose": "Complete enterprise sales capability"
}
```

#### Add Certification
```
POST /api/wallet/:employeeId/certifications
Content-Type: application/json

{
  "name": "Salesforce Admin",
  "issuer": "Salesforce",
  "expiresAt": "2027-06-01"
}
```

---

## ⚡ AUTONOMOUS EXECUTION (Phase 5)

### Autonomy Controller - Port 4760

#### Get Settings
```
GET /api/autonomy/:employeeId/settings
```

#### Set Mode
```
POST /api/autonomy/:employeeId/mode
Content-Type: application/json

{
  "mode": "delegate"
}
```

**Modes:** `shadow` | `assist` | `delegate` | `autonomous`

#### Add Boundary
```
POST /api/autonomy/:employeeId/boundaries
Content-Type: application/json

{
  "type": "amount",
  "condition": "purchases",
  "maxValue": 10000,
  "allowed": true
}
```

#### Check Approval
```
POST /api/autonomy/:employeeId/check-approval
Content-Type: application/json

{
  "confidence": 92,
  "type": "payment",
  "amount": 5000
}

Response:
{
  "success": true,
  "data": {
    "requiresApproval": false,
    "reason": "Within boundaries",
    "mode": "delegate"
  }
}
```

#### Approve/Reject
```
POST /api/autonomy/:employeeId/approve/:taskId
POST /api/autonomy/:employeeId/reject/:taskId
Content-Type: application/json

{
  "reason": "Looks good"
}
```

---

### 24x7 Execution Engine - Port 4761

#### Queue Task
```
POST /api/queue
Content-Type: application/json

{
  "employeeId": "emp_123",
  "description": "Follow up with lead #456",
  "priority": "normal",
  "scheduledFor": "2026-06-27T09:00:00Z"
}
```

#### Execute Task
```
POST /api/queue/:taskId/execute
```

#### Set Sleep Mode
```
POST /api/schedule/:employeeId/mode
Content-Type: application/json

{
  "mode": "sleep"
}
```

---

### Emergency Stop - Port 4763

#### Trigger Stop
```
POST /api/emergency/stop
Content-Type: application/json

{
  "employeeId": "emp_123",
  "reason": "Suspicious activity detected"
}
```

#### Resume
```
POST /api/emergency/resume
```

---

## 🏥 POLISH (Phase 6)

### Twin Dashboard - Port 4770

```
GET /api/dashboard/:employeeId

Response:
{
  "success": true,
  "data": {
    "overview": {
      "twinsActive": 9,
      "healthScore": 85,
      "productivityGain": 23
    },
    "twins": {
      "communication": { "status": "active", "confidence": 78 },
      "workflow": { "status": "active", "confidence": 65 }
    }
  }
}
```

### Twin Health Monitor - Port 4773

```
GET /api/health/services

Response:
{
  "success": true,
  "data": {
    "services": {
      "communication-twin": { "status": "healthy", "url": "http://localhost:4743" },
      "workflow-twin": { "status": "healthy", "url": "http://localhost:4741" }
    },
    "healthy": 12,
    "total": 12
  }
}
```

---

## 🔌 CONNECTOR PATTERNS

All connectors follow this pattern:

### Health Check
```
GET /health
```

### Observer Events
```
GET /api/observer/events/:userId?days=7
```

### CRUD Operations
```
GET  /api/:resource           # List
GET  /api/:resource/:id        # Get
POST /api/:resource           # Create
PATCH /api/:resource/:id      # Update
DELETE /api/:resource/:id      # Delete
```

---

## 📊 PORT REFERENCE

| Service | Port | Phase |
|---------|------|-------|
| Memory Twin | 4738 | 1 |
| Knowledge Twin | 4739 | 1 |
| Workflow Twin | 4741 | 1 |
| Decision Twin | 4742 | 1 |
| Communication Twin | 4743 | 1 |
| Relationship Twin | 4744 | 1 |
| Reputation Twin | 4745 | 1 |
| Behavioral Twin | 4746 | 1 |
| Twin Observer | 4747 | 2 |
| Human Teaching | 4748 | 2 |
| Meeting Intelligence | 4749 | 2 |
| Skill Wallet | 4750 | 2 |
| Browser Agent | 4751 | 3 |
| Desktop Agent | 4752 | 3 |
| Autonomy Controller | 4760 | 5 |
| Execution Engine | 4761 | 5 |
| Shadow Mode | 4762 | 5 |
| Emergency Stop | 4763 | 5 |
| Notification | 4764 | 5 |
| Dashboard | 4770 | 6 |
| Mobile | 4771 | 6 |
| Analytics | 4772 | 6 |
| Health Monitor | 4773 | 6 |

---

**Last Updated:** June 26, 2026
