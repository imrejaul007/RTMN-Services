# REZ Intelligence Hub

## Overview

- **Purpose**: Unified user and merchant intelligence hub with Voice AI and autonomous agents
- **Git Path**: `rez-intelligence-hub`
- **Port**: 4020
- **Status**: Active Development
- **Live URL**: https://rez-intelligence-hub.onrender.com

## Features

| Feature | Description |
|---------|-------------|
| User Profiles | Derived signals from user events, preference tracking, intent signals with confidence scores |
| Merchant Profiles | Demand pattern analysis, customer type tracking, pricing behavior insights |
| Voice AI | Speech-to-text transcription, text-to-speech synthesis, autonomous agents |
| Finance Intelligence | Transaction analysis, revenue tracking, credit risk prediction |
| Dormancy Detection | Daily cron job to identify and re-engage dormant users |
| Dashboard | Real-time metrics and health monitoring across ReZ ecosystem |

## API Endpoints

### Health & Monitoring

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/health` | Basic health check | None |
| GET | `/health/voice` | Voice AI health status | None |

### User Profiles

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/profile/user` | Create/update user profile from event | None |
| GET | `/profile/user/:userId` | Get user profile by ID | None |
| GET | `/profiles` | List all profiles (paginated) | None |

### User Intelligence

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/intelligence/user/:userId/intents` | Get user's active intents from Intent Graph | None |
| GET | `/api/intelligence/user/:userId/profile` | Get user's enriched profile | None |
| GET | `/api/intelligence/users/by-intent` | Get users filtered by intent category | None |
| GET | `/api/intelligence/users/dormant` | Get dormant users for re-engagement | None |
| GET | `/api/intelligence/segments` | Get all user segments | None |
| GET | `/api/intelligence/stats` | Get intelligence hub statistics | None |

### Finance Intelligence

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/finance/profile/:userId` | Analyze user's financial intent | None |
| GET | `/api/finance/ready-users` | Identify credit-ready users | None |
| GET | `/api/finance/risk/:userId` | Predict loan default risk | None |

### Dashboard

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/dashboard/stats` | Overall system statistics | None |
| GET | `/api/dashboard/segments` | User segment distribution | None |
| GET | `/api/dashboard/dormancy` | Dormancy report | None |
| GET | `/api/dashboard/health` | System health status | None |

### Voice AI

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/voice/process` | Process voice/text input | None |
| POST | `/api/voice/text` | Process text with optional TTS | None |
| GET | `/api/agents/status` | Get agent status | None |

### Voice Webhooks

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/webhook/voice` | Twilio voice webhook | Twilio Signature |
| POST | `/webhook/voice/twilio/process` | Process Twilio voice input | None |
| POST | `/webhook/voice/twilio/status` | Call status callbacks | None |
| POST | `/webhook/voice/twilio/hangup` | Handle hangup | None |

## Data Models

### Collections

| Collection | Schema | Indexes |
|------------|--------|---------|
| `user_profiles` | UserProfileSchema | userId (unique), segments, updatedAt, intent_signals |
| `merchant_profiles` | MerchantProfileSchema | merchantId (unique), segments, demand_pattern |
| `intents` | IntentSchema | userId, merchantId, lastSeenAt, status |
| `user_intelligence` | UserIntelligenceSchema | userId (unique) |
| `dormancy_reports` | DormancyReportSchema | userId |

### Schemas

```typescript
// User Profile
{
  userId: string;
  derived_signals: {
    preferences: {
      cuisines: string[];
      price_range: 'budget' | 'moderate' | 'premium' | 'luxury';
      time_pattern: string;
      dietary: string[];
    };
    intent_signals: {
      current_intent: string;
      intent_confidence: number;
      purchase_probability: number;
    };
    behavior: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
      avg_order_value: number;
      engagement_level: 'low' | 'medium' | 'high';
    };
  };
  segments: string[];
  updatedAt: Date;
}

// User Intelligence
{
  userId: string;
  affinities: [{
    category: string;
    score: number;
    topIntents: string[];
    lastSeen: Date;
  }];
  segments: string[];
  behavior: {
    avgSessionLength: number;
    avgOrdersPerWeek: number;
    avgOrderValue: number;
    preferredCategories: string[];
    preferredTimes: string[];
  };
  predictions: {
    churnRisk: number;
    purchaseProbability: number;
    lifetimeValue: number;
  };
}
```

## Integration Points

| Service | Purpose | Method | URL |
|---------|---------|--------|-----|
| MongoDB | Primary database | Mongoose ODM | Atlas |
| Intent Graph | User intent signals | HTTP API | https://rez-intent-graph.onrender.com |
| Action Engine | Re-engagement triggers | HTTP POST | https://rez-action-engine.onrender.com |
| Finance Service | Credit recommendations | HTTP POST | https://rez-finance-service.onrender.com |
| Order Service | Order management | HTTP | https://rez-order-service.onrender.com |
| Booking Service | Booking management | HTTP | https://rez-booking-service.onrender.com |
| OpenAI | Whisper STT | API | api.openai.com |
| ElevenLabs | Text-to-Speech | API | api.elevenlabs.io |
| Twilio | Voice calls | Webhook | Twilio API |

## Environment Variables

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `NODE_ENV` | Environment mode | Yes | development |
| `PORT` | Server port | Yes | 4020 |
| `MONGODB_URI` | MongoDB connection | Yes | - |
| `REDIS_URL` | Redis cache (optional) | No | redis://localhost:6379 |
| `ANTHROPIC_API_KEY` | Claude AI | No | - |
| `OPENAI_API_KEY` | Whisper STT | No | - |
| `ELEVENLABS_API_KEY` | Text-to-Speech | No | - |
| `INTERNAL_SERVICE_TOKEN` | Service auth | Yes | change-me |
| `ALLOWED_ORIGINS` | CORS origins | Yes | localhost:3000,5173 |
| `LOG_LEVEL` | Logging verbosity | No | info |
| `INTENT_GRAPH_URL` | Intent Graph service | Yes | - |
| `ACTION_ENGINE_URL` | Action Engine service | Yes | - |
| `FINANCE_SERVICE_URL` | Finance service | No | - |
| `SENTRY_DSN` | Error tracking | No | - |

## Security

| Check | Status | Notes |
|-------|--------|-------|
| Hardcoded Secrets | **CRITICAL** | MongoDB URI hardcoded in index.ts:31 |
| Authentication | MISSING | No auth middleware on endpoints |
| Rate Limiting | MISSING | No rate limiting configured |
| CORS Configuration | PARTIAL | Uses ALLOWED_ORIGINS but not enforced |
| Input Validation | PARTIAL | Zod schemas exist but not on all endpoints |
| SQL Injection | N/A | Uses Mongoose ODM |
| XSS Protection | PARTIAL | Helmet middleware imported |
| API Key Validation | MISSING | No validation for external APIs |

### Critical Security Issues

1. **Hardcoded MongoDB Credentials** (Line 31 of src/index.ts)
   ```typescript
   const MONGODB = 'mongodb+srv://work_db_user:ZAFYAYH1zK0C74Ap@...';
   ```
   - Credentials are exposed in source code
   - Must use environment variable

2. **No Authentication Middleware**
   - All endpoints are publicly accessible
   - INTERNAL_SERVICE_TOKEN defined but never enforced

3. **No Rate Limiting**
   - APIs vulnerable to abuse
   - No protection against DoS attacks

4. **Missing form-data Dependency**
   - stt.js imports FormData but package.json lacks `form-data`
   - Build will fail in production

## Deployment

| Platform | URL | Status |
|----------|-----|--------|
| Render | https://rez-intelligence-hub.onrender.com | Active |
| Health Check | /health | Configured |

### Deployment Configuration

**render.yaml:**
```yaml
services:
  - type: web
    name: rez-intelligence-hub
    env: node
    region: singapore
    buildCommand: npm install && npm run build
    startCommand: node dist/index.js
    healthCheckPath: /health
```

**Dockerfile:**
- Base: node:20-alpine
- Port: 4020
- Health check enabled
- Non-root user configured

## Project Structure

```
rez-intelligence-hub/
├── src/
│   ├── index.ts              # Main entry (283 lines)
│   ├── schemas/
│   │   └── index.ts          # Zod validation schemas (244 lines)
│   ├── routes/
│   │   ├── userRoutes.ts      # User intelligence (195 lines)
│   │   ├── financeRoutes.ts   # Finance intelligence (53 lines)
│   │   └── dashboardRoutes.ts # Dashboard endpoints (220 lines)
│   ├── services/
│   │   ├── userIntelligenceService.ts  # User profiling (322 lines)
│   │   └── financeIntelligence.ts     # Finance analysis (192 lines)
│   ├── jobs/
│   │   └── dormancyDetection.ts        # Cron job (240 lines)
│   └── voice/
│       ├── agents/
│       │   ├── swarmOrchestrator.js    # Agent orchestration
│       │   ├── orderAgent.js           # Order handling
│       │   ├── bookingAgent.js         # Booking handling
│       │   ├── supportAgent.js        # Support requests
│       │   └── nluAgent.js            # NLU processing
│       ├── services/
│       │   ├── stt.js                  # Speech-to-text
│       │   ├── tts.js                  # Text-to-speech
│       │   └── voiceRouter.js          # Intent classification
│       └── webhooks/
│           ├── twilioWebhook.js        # Twilio integration
│           └── dailyWebhook.js         # Daily.co integration
├── .env.example
├── package.json
├── tsconfig.json
├── Dockerfile
├── render.yaml
└── DEPLOY.sh
```

## Code Quality Issues

| Issue | Location | Severity |
|-------|----------|----------|
| Hardcoded MongoDB URI | src/index.ts:31 | Critical |
| Missing form-data dep | package.json | High |
| No auth middleware | src/ | High |
| No rate limiting | src/ | High |
| Unused `require` | src/routes/userRoutes.ts:139 | Medium |
| Inconsistent error handling | src/ | Medium |
| No API documentation | src/ | Medium |
| TypeScript config relaxed | tsconfig.json | Low |

## Dependencies

**Production:**
- express: ^4.18.2
- mongoose: ^8.23.1
- cors: ^2.8.5
- helmet: ^7.1.0
- axios: ^1.16.0
- zod: ^3.23.8
- @types/express, @types/node, @types/axios

**Development:**
- tsx: ^4.21.0
- ts-node-dev: ^2.0.0

**Missing (Required):**
- form-data (for STT multipart uploads)
