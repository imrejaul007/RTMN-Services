# HOJAI AI - RTNM Ecosystem Integration Test Guide

## Overview

This document provides comprehensive testing procedures for validating the HOJAI AI ecosystem integration with the RTNM ecosystem services.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOJAI AI ECOSYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│  │   SUTAR OS      │────▶│   Genie Voice   │────▶│ RAZO Keyboard   │      │
│  │  (Integration   │     │  (Personal AI)  │     │   (CoPilot)     │      │
│  │      Hub)       │     │                 │     │                 │      │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘      │
│           │                       │                       │               │
│           ▼                       ▼                       ▼               │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │                    HOJAI SHARED CLIENTS                       │      │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐ │      │
│  │  │   RABTUL     │ │    REZ       │ │  SkillNet    │ │Industry│ │      │
│  │  │   Client     │ │  Identity   │ │   Client     │ │AI Client│ │      │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘ │      │
│  └────────────────────────────────────────────────────────────────┘      │
│                              │                                             │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RTNM ECOSYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   RABTUL AUTH   │  │  RABTUL PAYMENT │  │  RABTUL WALLET  │             │
│  │   (Port 4002)   │  │   (Port 4001)   │  │   (Port 4004)   │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ RABTUL NOTIFY    │  │ REZ IDENTITY    │  │   SKILLNET      │             │
│  │   (Port 4005)   │  │   (Port 6000)   │  │ (Ports 5120/30) │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │                    INDUSTRY AI (28 Verticals)                  │      │
│  │  Healthcare | Legal | Finance | Real Estate | Hospitality | ... │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Services Running

Before running tests, ensure the following services are running:

1. **MongoDB** - `localhost:27017`
2. **Redis** - `localhost:6379`
3. **RABTUL Services**:
   - Auth Service - `localhost:4002`
   - Payment Service - `localhost:4001`
   - Wallet Service - `localhost:4004`
   - Notification Service - `localhost:4005`
4. **REZ Identity Hub** - `localhost:6000`
5. **HOJAI SkillNet** - `localhost:5130` (also Runtime on `localhost:5120`)
6. **HOJAI Shared** - `localhost:4580`
7. **SUTAR OS** - `localhost:4750`
8. **Genie Voice** - `localhost:4760`
9. **RAZO Keyboard** - `localhost:4650`

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Configure your environment variables
# At minimum, set:
# - JWT_SECRET
# - INTERNAL_SERVICE_TOKEN
# - RABTUL service URLs
# - REZ_IDENTITY_URL
```

## Test Categories

### 1. RABTUL Client Tests

#### Test 1.1: Token Verification

```bash
# Test authentication
curl -X POST http://localhost:4580/api/test/rabtul/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "test_token_here"}'
```

**Expected Response:**
```json
{
  "valid": true,
  "userId": "user_123",
  "email": "user@example.com"
}
```

#### Test 1.2: Payment Processing

```bash
# Test payment initiation
curl -X POST http://localhost:4580/api/test/rabtul/payment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "amount": 100,
    "action": "subscription",
    "currency": "INR"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "transactionId": "txn_abc123",
  "amount": 100,
  "status": "pending"
}
```

#### Test 1.3: Balance Check

```bash
# Test wallet balance
curl http://localhost:4580/api/test/rabtul/balance/user_123
```

**Expected Response:**
```json
{
  "userId": "user_123",
  "amount": 5000,
  "currency": "INR",
  "available": 5000,
  "frozen": 0
}
```

#### Test 1.4: Notification Sending

```bash
# Test notification
curl -X POST http://localhost:4580/api/test/rabtul/notify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "type": "alert",
    "title": "Payment Received",
    "message": "Your payment of Rs. 100 was successful",
    "channels": ["push", "email"]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "notificationId": "notif_xyz789"
}
```

### 2. REZ Identity Hub Client Tests

#### Test 2.1: User Profile Retrieval

```bash
# Test profile fetch
curl http://localhost:4580/api/test/identity/profile/user_123
```

**Expected Response:**
```json
{
  "userId": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Corp",
  "industry": "technology"
}
```

#### Test 2.2: Pre-Call Research

```bash
# Test 25-source research
curl http://localhost:4580/api/test/identity/precall/user_123
```

**Expected Response:**
```json
{
  "userId": "user_123",
  "sources": [
    {"name": "linkedin", "data": {...}, "confidence": 0.95},
    {"name": "company_website", "data": {...}, "confidence": 0.85},
    // ... 23 more sources
  ],
  "summary": "Key insights about the user...",
  "riskFlags": [],
  "opportunities": ["Potential upsell"]
}
```

#### Test 2.3: 360-Degree View

```bash
# Test comprehensive view
curl http://localhost:4580/api/test/identity/360/user_123
```

**Expected Response:**
```json
{
  "userId": "user_123",
  "personal": {...},
  "professional": {...},
  "financial": {...},
  "behavioral": {...},
  "relationships": {...}
}
```

### 3. SkillNet Client Tests

#### Test 3.1: Get All Skills

```bash
# Test skills retrieval
curl http://localhost:4580/api/test/skillnet/skills
```

**Expected Response:**
```json
{
  "skills": [
    {
      "id": "skill_001",
      "name": "Sales Pitch",
      "category": "sales",
      "complexity": "intermediate"
    },
    // ... more skills
  ]
}
```

#### Test 3.2: Get Skills by Category

```bash
# Test category filter
curl "http://localhost:4580/api/test/skillnet/skills?category=sales"
```

#### Test 3.3: Goal Decomposition

```bash
# Test goal execution
curl -X POST http://localhost:4580/api/test/skillnet/execute \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Schedule a meeting with the client",
    "context": {
      "userId": "user_123",
      "clientId": "client_456"
    }
  }'
```

**Expected Response:**
```json
{
  "goal": "Schedule a meeting with the client",
  "steps": [
    {"order": 1, "action": "Check client availability", "skill": "calendar"},
    {"order": 2, "action": "Send meeting invite", "skill": "email"}
  ],
  "confidence": 0.92
}
```

#### Test 3.4: Skill Execution

```bash
# Test skill run
curl -X POST http://localhost:4580/api/test/skillnet/run \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": "skill_001",
    "input": {"clientName": "Acme Corp"}
  }'
```

### 4. Industry AI Client Tests

#### Test 4.1: Healthcare Analysis

```bash
# Test healthcare vertical
curl -X POST http://localhost:4580/api/test/industry/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "vertical": "healthcare",
    "data": {"patientCount": 1000, "beds": 50}
  }'
```

**Expected Response:**
```json
{
  "vertical": "healthcare",
  "insights": ["Patient-to-bed ratio optimal", "Consider expansion"],
  "confidence": 0.88
}
```

#### Test 4.2: Get Industry Context

```bash
# Test context retrieval
curl http://localhost:4580/api/test/industry/context/healthcare
```

#### Test 4.3: List All Verticals

```bash
# Test verticals list
curl http://localhost:4580/api/test/industry/verticals
```

**Expected Response:**
```json
{
  "verticals": [
    "healthcare", "legal", "finance", "realestate",
    "hospitality", "restaurant", "fleet", "education",
    // ... more verticals
  ],
  "total": 28
}
```

### 5. SUTAR OS Integration Hub Tests

#### Test 5.1: Prepare Context

```bash
# Test context preparation
curl -X POST http://localhost:4750/api/hub/prepare \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "query": "Schedule a meeting with Dr. Smith"
  }'
```

**Expected Response:**
```json
{
  "userId": "user_123",
  "profile": {...},
  "preCallResearch": {...},
  "skills": [...],
  "auth": {"valid": true},
  "query": "Schedule a meeting with Dr. Smith",
  "timestamp": "2026-06-12T10:00:00Z"
}
```

#### Test 5.2: Process with Industry Expertise

```bash
# Test industry processing
curl -X POST http://localhost:4750/api/hub/process \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "query": "Optimize patient flow",
    "industry": "healthcare"
  }'
```

#### Test 5.3: Execute with Payment

```bash
# Test payment execution
curl -X POST http://localhost:4750/api/hub/execute-payment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "action": "premium_subscription",
    "amount": 999
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "transactionId": "txn_abc123",
  "balance": 4001,
  "notificationId": "notif_xyz789"
}
```

#### Test 5.4: Health Check

```bash
# Test overall health
curl http://localhost:4750/api/hub/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "services": {
    "rabtul": true,
    "identityHub": true,
    "skillnet": true,
    "industryAI": true
  }
}
```

### 6. Genie Integration Tests

#### Test 6.1: Process Command

```bash
# Test Genie command
curl -X POST http://localhost:4760/api/genie/process \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Schedule a meeting with the healthcare team tomorrow at 10am",
    "userId": "user_123"
  }'
```

**Expected Response:**
```json
{
  "response": "I've scheduled a meeting with the healthcare team for tomorrow at 10:00 AM.",
  "actions": [...],
  "memory": {...},
  "industryContext": {...}
}
```

#### Test 6.2: Industry Detection

```bash
# Test industry detection
curl -X POST http://localhost:4760/api/genie/detect-industry \
  -H "Content-Type: application/json" \
  -d '{"command": "I need to optimize my restaurant's menu"}'
```

**Expected Response:**
```json
{
  "industry": "restaurant",
  "confidence": 0.95
}
```

### 7. CoPilot Integration Tests

#### Test 7.1: Keyboard Input Processing

```bash
# Test keyboard routing
curl -X POST http://localhost:4650/api/copilot/process \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hey Genie, schedule a meeting",
    "userId": "user_123"
  }'
```

**Expected Response:**
```json
{
  "predictions": [],
  "suggestions": [],
  "actions": [],
  "genieResponse": "I've scheduled the meeting.",
  "mode": "genie"
}
```

#### Test 7.2: Typing Suggestions

```bash
# Test typing mode
curl -X POST http://localhost:4650/api/copilot/process \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Book a flight to",
    "userId": "user_123"
  }'
```

**Expected Response:**
```json
{
  "predictions": ["Book a flight to Mumbai", "Book a flight to Delhi"],
  "suggestions": [
    {
      "type": "deeplink",
      "text": "Search flights",
      "icon": "✈️",
      "action": "airzy://flight-search",
      "confidence": 0.9
    }
  ],
  "actions": [],
  "mode": "typing"
}
```

#### Test 7.3: Keyboard Feed

```bash
# Test keyboard feed
curl http://localhost:4650/api/copilot/feed/user_123
```

### 8. End-to-End Integration Tests

#### Test 8.1: Complete User Journey

```bash
# Test complete journey
curl -X POST http://localhost:4750/api/test/e2e/journey \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "scenario": "healthcare_consultation"
  }'
```

**Journey Steps:**
1. Verify user authentication (RABTUL Auth)
2. Get user profile (REZ Identity Hub)
3. Get pre-call research (REZ Identity Hub)
4. Get relevant skills (SkillNet)
5. Execute goal decomposition (SkillNet)
6. Process payment if needed (RABTUL Payment)
7. Send notification (RABTUL Notification)

#### Test 8.2: Cross-Service Health Check

```bash
# Test all services
curl http://localhost:4580/api/test/integration-status
```

**Expected Response:**
```json
{
  "rabtul": {
    "auth": true,
    "payment": true,
    "wallet": true,
    "notification": true,
    "overall": true
  },
  "identityHub": {
    "healthy": true,
    "sources": 25
  },
  "skillnet": {
    "healthy": true,
    "skills": 100
  },
  "industryAI": {
    "healthy": {
      "healthcare": true,
      "legal": true,
      "finance": true
    },
    "total": 28,
    "available": 28
  },
  "overall": true,
  "timestamp": "2026-06-12T10:00:00Z"
}
```

## Automated Test Suite

Run the complete test suite:

```bash
# From the hojai-ai directory
cd /Users/rejaulkarim/Documents/RTMN/companies/hojai-ai

# Run integration tests
npm run test:integration

# Or run specific test file
npm run test:integration -- --testNamePattern="RABTUL"
```

## Test Results Interpretation

### Success Criteria

- All health checks return `healthy: true`
- All API calls return expected response structure
- End-to-end journeys complete without errors
- No timeout errors (30s threshold)

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection refused | Service not running | Start missing service |
| 401 Unauthorized | Invalid token | Refresh authentication |
| 404 Not Found | Wrong endpoint | Check service documentation |
| Timeout | Service overloaded | Retry with backoff |
| 500 Internal Error | Service error | Check service logs |

## Performance Benchmarks

| Operation | Target | Max |
|------------|--------|-----|
| Token verification | 50ms | 200ms |
| Payment processing | 200ms | 1000ms |
| Balance check | 30ms | 100ms |
| Profile fetch | 100ms | 500ms |
| Pre-call research | 500ms | 2000ms |
| Goal decomposition | 300ms | 1500ms |
| Industry analysis | 200ms | 1000ms |

## Troubleshooting

### Service Connectivity Issues

```bash
# Check if service is running
curl http://localhost:4580/health

# Check Docker containers
docker ps | grep hojai

# Check logs
docker logs hojai-shared
```

### Database Issues

```bash
# Check MongoDB connection
mongosh --host localhost:27017 --eval "db.adminCommand('ping')"

# Check Redis connection
redis-cli -h localhost ping
```

### Network Issues

```bash
# Check network configuration
docker network inspect hojai-network

# Test internal connectivity
docker exec hojai-shared curl http://rabtul-auth:4002/health
```

## Test Coverage Matrix

| Service | Health | Auth | Payment | Profile | Skills | Industry |
|---------|--------|------|---------|---------|--------|----------|
| RABTUL Auth | ✓ | ✓ | - | - | - | - |
| RABTUL Payment | ✓ | - | ✓ | - | - | - |
| RABTUL Wallet | ✓ | - | - | - | - | - |
| RABTUL Notify | ✓ | - | - | - | - | - |
| REZ Identity | ✓ | - | - | ✓ | - | - |
| SkillNet | ✓ | - | - | - | ✓ | - |
| Industry AI | ✓ | - | - | - | - | ✓ |
| SUTAR OS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Genie | ✓ | - | - | - | ✓ | ✓ |
| CoPilot | ✓ | - | - | - | - | - |

## Report Generation

Generate a test report:

```bash
curl -X POST http://localhost:4580/api/test/report \
  -H "Content-Type: application/json" \
  -d '{"format": "json"}' > test-report.json
```

---

**Document Version:** 1.0
**Last Updated:** June 12, 2026
**Author:** HOJAI AI Integration Team
