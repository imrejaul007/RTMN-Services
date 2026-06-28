# CorpID v3.0 — Universal Identity OS Specification

> **Version:** 3.0.0  
> **Port:** 4702  
> **Status:** Production Ready  
> **Tests:** 134 passing  
> **Last Updated:** June 28, 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Identity Types](#2-identity-types)
3. [Authentication & Security](#3-authentication--security)
4. [MFA System](#4-mfa-system)
5. [Session Management](#5-session-management)
6. [Workload Identity](#6-workload-identity)
7. [Agent Passports](#7-agent-passports)
8. [Delegation Engine](#8-delegation-engine)
9. [Trust System](#9-trust-system)
10. [Relationship Graph](#10-relationship-graph)
11. [Federation (OIDC/SAML)](#11-federation-oidcsaml)
12. [ACP Bridge](#12-acp-bridge)
13. [MemoryOS Events](#13-memoryos-events)
14. [API Reference](#14-api-reference)
15. [Data Models](#15-data-models)
16. [Configuration](#16-configuration)

---

## 1. Overview

CorpID is the **Universal Identity OS** for the RTMN ecosystem — managing identity for humans, AI agents, workloads, and autonomous economies.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CorpID v3.0 (4702)                      │
├─────────────────────────────────────────────────────────────┤
│  Express.js + JWT + bcrypt + TOTP                          │
│  PersistentStore (JSON files, survives restart)             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │  User   │  │  Agent  │  │Workload │  │  Trust  │     │
│  │ CI-IND  │  │ CI-AGT  │  │ CI-WRK  │  │  Score  │     │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │Delegation│  │Business │  │ Namespace│  │  Fed    │     │
│  │ Chain   │  │ CI-BIZ  │  │ Isolation│  │  Link   │     │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │
└─────────────────────────────────────────────────────────────┘
          │                  │                 │
          ▼                  ▼                 ▼
    ┌──────────┐       ┌──────────┐      ┌──────────┐
    │ AgentOS  │       │ MemoryOS │      │  Hub    │
    │ (4803)  │       │ (4703)  │      │ (4399)  │
    └──────────┘       └──────────┘      └──────────┘
```

### Capabilities

| Capability | Description |
|------------|-------------|
| Human Identity | User registration, login, profile, password management |
| AI Agent Identity | Agent passports with permissions, budgets, capabilities |
| Workload Identity | CI-WRK- typed identity for services, containers, cron |
| Delegation | Authority chains with scope narrowing and expiration |
| Trust Scoring | 6-dimensional trust (0-100) with levels |
| Relationships | Graph-based entity relationships |
| Federation | OIDC/SAML SSO integration |
| MFA | TOTP + backup codes + breach detection |
| Sessions | Token invalidation and session management |

---

## 2. Identity Types

### 2.1 CorpID Format

All entities use the format: `CI-<TYPE>-<ID>`

| Prefix | Entity | Example |
|--------|--------|---------|
| `CI-IND-` | Individual/Human | `CI-IND-a1b2c3d4` |
| `CI-BIZ-` | Business/Organization | `CI-BIZ-x9y8z7w6` |
| `CI-AGT-` | AI Agent | `CI-AGT-m5n4o3p2` |
| `CI-WRK-` | Workload/Service | `CI-WRK-k1l2m3n4` |
| `CI-REL-` | Relationship | `CI-REL-q5r6s7t8` |

### 2.2 User Model

```typescript
interface User {
  id: string;                    // "CI-IND-a1b2c3d4"
  email: string;                 // Unique
  passwordHash: string;          // bcrypt hash
  name: string;
  role: 'superadmin' | 'admin' | 'manager' | 'user';
  businessId?: string;           // "CI-BIZ-xxx"
  namespace?: string;             // Isolated namespace
  emailVerified: boolean;
  mfaEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil?: string;          // ISO timestamp
  lastLogin?: string;
  lastIp?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 Agent Model

```typescript
interface Agent {
  agentId: string;              // "CI-AGT-a1b2c3d4"
  name: string;
  description?: string;
  model?: string;                // "claude-opus-4-8"
  provider?: string;              // "anthropic" | "openai" | "internal"
  version?: string;
  
  // Ownership
  ownerId: string;               // "CI-IND-xxx"
  businessId?: string;
  
  // Authorization
  permissions: string[];         // ["leads:read", "orders:write"]
  scopes: string[];               // ["read:all"]
  
  // Constraints
  budget: {
    monthly: number;              // Max spend in USD cents
    spent: number;
    currency: string;
  };
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  
  // Status
  status: 'active' | 'suspended' | 'revoked' | 'pending';
  suspensionReason?: string;
  revokedAt?: string;
  
  // Trust
  trustScore: number;
  trustLevel: string;
  
  // Metadata
  capabilities: string[];
  tools: string[];
  department?: string;
  tags: string[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
  
  // Audit
  history: Array<{
    event: string;
    by: string;
    at: string;
    details: object;
  }>;
}
```

### 2.4 Workload Model

```typescript
interface WorkloadIdentity {
  workloadId: string;             // "CI-WRK-a1b2c3d4"
  type: 'container' | 'cron' | 'ci-cd' | 'api-gateway' | 'etl' | 'workflow' | 'lambda' | 'service';
  name: string;
  description?: string;
  
  // Ownership
  ownerId: string;              // "CI-IND-xxx"
  agentId?: string;               // "CI-AGT-xxx" (if agent-owned)
  businessId?: string;
  
  // Authorization
  scopes: string[];              // ["memory:read", "twin:write"]
  
  // Credentials
  credentials: {
    type: 'api-key' | 'oauth2-client-credentials' | 'mtls';
    keyId: string;
    rotatedAt?: string;
    nextRotationAt?: string;
    rotationPolicy: {
      intervalDays: number;
      autoRotate: boolean;
      gracePeriodHours: number;
    };
  };
  
  // Runtime
  runtime?: {
    image?: string;
    region?: string;
    environment: 'production' | 'staging' | 'development';
    cluster?: string;
    namespace?: string;
  };
  
  // Health
  status: 'active' | 'suspended' | 'rotated' | 'decommissioned';
  lastHeartbeat?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  history: Array<{
    event: string;
    by: string;
    at: string;
    details: object;
  }>;
}
```

---

## 3. Authentication & Security

### 3.1 JWT Token Structure

**Access Token Payload:**
```json
{
  "sub": "CI-IND-a1b2c3d4",
  "email": "user@example.com",
  "role": "admin",
  "businessId": "CI-BIZ-xxx",
  "type": "access",
  "iat": 1751200000,
  "exp": 1751203600,
  "iss": "rtmn-corpid"
}
```

**Refresh Token Payload:**
```json
{
  "sub": "CI-IND-a1b2c3d4",
  "type": "refresh",
  "iat": 1751200000,
  "exp": 1751800000,
  "iss": "rtmn-corpid"
}
```

**MFA Challenge Token Payload:**
```json
{
  "sub": "CI-IND-a1b2c3d4",
  "type": "mfa_challenge",
  "email": "user@example.com",
  "mfaSecret": "JBSWY3DPEHPK3PXP",
  "iat": 1751200000,
  "exp": 1751200300,
  "iss": "rtmn-corpid"
}
```

### 3.2 Login Flow (with MFA)

```
1. POST /auth/login
   ├── Validate email + password
   ├── Check account lock status
   ├── Check failed login attempts
   └── If MFA enabled:
       ├── Generate MFA challenge token (5 min expiry)
       └── Return { mfaRequired: true, mfaToken }

2. POST /auth/mfa-verify
   ├── Validate MFA challenge token
   ├── Verify TOTP code (6 digits)
   └── Return { accessToken, refreshToken }
```

### 3.3 Security Features

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcrypt, 12 rounds |
| Rate Limiting | 100 requests/min (global), 20/min (strict) |
| Account Lockout | 5 failed attempts = 15 min lock |
| Breach Detection | HaveIBeenPwned k-anonymity API |
| Token Expiry | Access: 1h, Refresh: 7d |
| Prototype Pollution | Prevented via sanitization |

### 3.4 Role-Based Access Control

| Role | Permissions |
|------|------------|
| `superadmin` | Full access, all businesses |
| `admin` | Full access within business |
| `manager` | Limited admin access |
| `user` | Own resources only |

---

## 4. MFA System

### 4.1 MFA Setup Flow

```
1. POST /api/mfa/setup (requires auth)
   ├── Generate TOTP secret (base32)
   ├── Generate QR code URL
   ├── Generate 10 backup codes (8 chars each)
   └── Return { secret, qrCodeUrl, backupCodes }

2. POST /api/mfa/verify (requires auth)
   ├── Validate TOTP code
   └── Enable MFA for user

3. POST /api/mfa/disable (requires auth)
   ├── Validate current password
   ├── Validate TOTP code
   └── Disable MFA
```

### 4.2 TOTP Configuration

| Parameter | Value |
|-----------|-------|
| Algorithm | SHA1 |
| Digits | 6 |
| Period | 30 seconds |
| Window | ±1 period (90s tolerance) |
| Backup Codes | 10 per user |
| Backup Code Length | 8 characters |

### 4.3 MFA Secret Model

```typescript
interface MfaSecret {
  email: string;                  // Key field (matches User.email)
  secret: string;                // Base32 TOTP secret
  enabled: boolean;
  backupCodes: string[];         // Hashed backup codes
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. Session Management

### 5.1 Session Tracking

Sessions are tracked via refresh tokens stored in `RefreshToken` model.

```typescript
interface RefreshToken {
  token: string;                 // Hashed token
  userId: string;
  email: string;
  expiresAt: string;
  createdAt: string;
  lastUsedAt?: string;
  userAgent?: string;
  ip?: string;
}
```

### 5.2 Session Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sessions` | GET | List active sessions |
| `/api/auth/sessions` | DELETE | Revoke all sessions |
| `/api/auth/logout` | POST | Logout current session |

---

## 6. Workload Identity

### 6.1 CI-WRK- Identity

Workloads are non-human entities that need programmatic API access.

**Supported Types:**
- `container` — Docker/Kubernetes pods
- `cron` — Scheduled jobs
- `ci-cd` — CI/CD runners
- `api-gateway` — API gateway services
- `etl` — Data pipelines
- `workflow` — Workflow orchestrators
- `lambda` — Serverless functions
- `service` — Microservices

### 6.2 Credential Rotation

```typescript
// Rotation policy per workload
{
  intervalDays: 30,        // Rotate every 30 days
  autoRotate: true,        // Auto-rotate enabled
  gracePeriodHours: 24     // 24 hour grace period
}

// Rotation endpoint
POST /api/workloads/:workloadId/rotate
Response: { workloadId, keyId, nextRotationAt }
```

### 6.3 Workload Token

Workloads use API key authentication:

```
Headers:
  X-Workload-ID: CI-WRK-a1b2c3d4
  X-Workload-Key: wk_live_xxxxx
  
OR Bearer token:
  Authorization: Bearer <jwt_with_type:workload_access>
```

---

## 7. Agent Passports

### 7.1 Agent Lifecycle

```
┌──────────┐
│ pending  │ ──approve()──► ┌──────────┐
└──────────┘                 │  active  │ ──suspend()──► ┌──────────┐
                           └──────────┘                │ suspended │
                           │                           └──────────┘
                           └──────revoke()──────────► ┌──────────┐
                                                      │ revoked  │
                                                      └──────────┘
```

### 7.2 Agent Permissions

Permissions follow the format `resource:action`:

```
leads:read      — Read leads
leads:write     — Create/update leads
orders:read      — Read orders
orders:write     — Create/update orders
emails:send      — Send emails
reports:generate — Generate reports
```

### 7.3 Agent Budget

```typescript
interface AgentBudget {
  monthly: 50000,      // $500.00 limit per month
  spent: 12500,        // Current spend
  currency: 'USD'
}
```

---

## 8. Delegation Engine

### 8.1 Delegation Concept

Delegation allows principals to grant limited authority to agents:

```
Human (CI-IND-xxx)
    │
    │ delegates "leads:read, orders:write"
    │ with 0.8x trust attenuation
    ▼
Agent (CI-AGT-yyy)
    │
    │ further delegates "orders:write" only
    ▼
Sub-Agent (CI-AGT-zzz)
```

### 8.2 Delegation Model

```typescript
interface Delegation {
  delegationId: string;
  
  // Principal
  delegatorId: string;           // CI-IND-xxx or CI-AGT-yyy
  delegatorType: 'human' | 'agent';
  
  // Delegate
  delegateId: string;             // CI-AGT-yyy (always agent)
  delegateName?: string;
  
  // Scope
  scope: string[];                // ["leads:read", "orders:write"]
  
  // Constraints
  constraints?: {
    maxValue?: number;            // Max transaction value in cents
    maxCallsPerDay?: number;
    maxCallsPerMonth?: number;
    allowedEntities?: string[];   // Allowed CI-BIZ-xxx
    deniedEntities?: string[];
    timeWindow?: {
      startHour: number;          // 0-23
      endHour: number;
    };
    requireApprovalAbove?: number;
  };
  
  // Attenuation
  attenuationFactor: number;      // 0.0-1.0
  effectiveTrustScore: number;     // delegator.trust * attenuation
  
  // Expiration
  expiresAt?: string;             // ISO timestamp
  autoRevoke: boolean;
  
  // Status
  status: 'active' | 'expired' | 'revoked' | 'pending_approval' | 'rejected';
  
  // Chain
  parentDelegationId?: string;    // For sub-delegations
  
  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  history: Array<{
    event: string;
    by: string;
    at: string;
    details: object;
  }>;
}
```

### 8.3 Scope Narrowing

Delegations can only **narrow** scope, never expand:

```
Original: ["leads:read", "orders:write", "emails:send"]
Allowed:  ["leads:read"]                    ✓
Allowed:  ["leads:read", "orders:read"]     ✓
Denied:   ["leads:read", "orders:write", "reports:write"]  ✗ (expands)
```

### 8.4 Delegation Chain

```bash
GET /api/delegations/chain/:entityId

Response:
{
  "success": true,
  "entityId": "CI-AGT-zzz",
  "chainLength": 3,
  "chain": [
    {
      "delegationId": "DEL-001",
      "delegatorId": "CI-IND-user",
      "delegateId": "CI-AGT-yyy",
      "scope": ["leads:read", "orders:write"],
      "attenuationFactor": 0.8,
      "effectiveTrustScore": 72
    },
    {
      "delegationId": "DEL-002",
      "delegatorId": "CI-AGT-yyy",
      "delegateId": "CI-AGT-zzz",
      "scope": ["orders:write"],
      "attenuationFactor": 0.9,
      "effectiveTrustScore": 64.8
    }
  ]
}
```

### 8.5 SUTAR Authority Check

```bash
POST /api/delegations/check

Request:
{
  "agentId": "CI-AGT-zzz",
  "requiredScope": "orders:write",
  "context": {
    "value": 50000,
    "entityId": "CI-BIZ-merchant"
  }
}

Response (authorized):
{
  "authorized": true,
  "chain": [...],
  "effectiveTrust": 64.8
}

Response (unauthorized):
{
  "authorized": false,
  "reason": "Transaction value 50000 exceeds maxValue 30000",
  "chain": [...]
}
```

---

## 9. Trust System

### 9.1 Trust Levels

| Level | Score Range | Badge |
|-------|-------------|-------|
| Platinum | 90-100 | 🏆 |
| Gold | 80-89 | ⭐ |
| Silver | 70-79 | 🥈 |
| Bronze | 50-69 | 🥉 |
| Iron | 30-49 | ⚙️ |
| Restricted | 0-29 | ⚠️ |

### 9.2 Trust Dimensions

| Dimension | Weight | Sources | Description |
|-----------|--------|---------|-------------|
| `identity` | 0.15 | CorpID | Identity verification level |
| `behavioral` | 0.20 | CorpID | Login patterns, auth behavior |
| `financial` | 0.20 | Wallet, SUTAR | Payment history |
| `social` | 0.10 | TwinOS, CorpID | Endorsements |
| `business` | 0.15 | SUTAR, TwinOS | B2B reputation |
| `agent` | 0.20 | AgentOS, CorpID | Decision quality |

### 9.3 Overall Score Calculation

```
Overall = Σ(dimension_score × dimension_weight)
```

### 9.4 Trust Dimension Model

```typescript
interface TrustDimension {
  dimensionKey: string;          // "CI-AGT-xxx:behavioral"
  corpId: string;
  dimension: string;             // identity|behavioral|financial|social|business|agent
  score: number;                   // 0-100
  level: string;                   // platinum|gold|silver|bronze|iron|restricted
  weight: number;                  // Configured weight
  sources: string[];              // Data sources
  signals: Array<{
    type: string;
    value: number;
    source: string;
    evidence?: string;
    at: string;
  }>;
  history: Array<{
    score: number;
    at: string;
    reason: string;
  }>;
  lastUpdated: string;
}
```

---

## 10. Relationship Graph

### 10.1 Node Types

| Type | Description |
|------|-------------|
| `user` | Human user |
| `organization` | Company/org |
| `department` | Department within org |
| `team` | Team within department |
| `consumer` | End consumer |
| `merchant` | Merchant account |
| `branch` | Branch/outlet |
| `agent` | AI agent |
| `device` | IoT device |
| `api_key` | API key |
| `twin` | Digital twin |
| `employee` | Employee |

### 10.2 Edge Types

| Type | Description |
|------|-------------|
| `owns` | Ownership relationship |
| `member_of` | Membership |
| `manages` | Management chain |
| `reports_to` | Reporting structure |
| `partner_of` | Partnership |
| `supplies_to` | Supplier relationship |
| `trusts` | Trust relationship |
| `owns_agent` | Owns an AI agent |
| `owns_merchant` | Owns merchant account |

### 10.3 Graph Query

```bash
GET /api/relationships/nodes/:nodeId/related?depth=2&types=user,agent

Response:
{
  "success": true,
  "node": { "nodeId": "RNODE-001", "entityType": "user", "entityId": "CI-IND-xxx" },
  "related": [
    {
      "nodeId": "RNODE-002",
      "entityType": "organization",
      "entityId": "CI-BIZ-yyy",
      "relationship": "member_of",
      "depth": 1
    },
    {
      "nodeId": "RNODE-003",
      "entityType": "agent",
      "entityId": "CI-AGT-zzz",
      "relationship": "owns_agent",
      "depth": 2
    }
  ]
}
```

---

## 11. Federation (OIDC/SAML)

### 11.1 OIDC Discovery

```
GET /.well-known/openid-configuration

Response:
{
  "issuer": "http://localhost:4702",
  "authorization_endpoint": "http://localhost:4702/api/federation/oidc/authorize",
  "token_endpoint": "http://localhost:4702/api/federation/oidc/token",
  "userinfo_endpoint": "http://localhost:4702/api/federation/oidc/userinfo",
  "jwks_uri": "http://localhost:4702/api/federation/oidc/jwks",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email"],
  "claims_supported": ["sub", "name", "email", "role", "businessId", "trustScore"]
}
```

### 11.2 OAuth Providers

| Provider | ID | Auth URL |
|----------|-----|---------|
| Google | `google` | accounts.google.com |
| GitHub | `github` | github.com |

### 11.3 SAML Flow

```
1. GET /api/federation/saml/metadata
   └── Returns SP metadata XML

2. POST /api/federation/saml/acs
   └── Receives SAML response, creates session

3. GET /api/federation/saml/sls
   └── Processes logout request
```

---

## 12. ACP Bridge

### 12.1 ACP Protocol

ACP (Agent Communication Protocol) is used for agent-to-agent messaging in the Nexha network.

### 12.2 ACP Endpoints

```bash
# Verify CorpID exists
GET /api/acp/verify/:corpId
Response: { verified: true, corpId, score }

# Get entity info for ACP
GET /api/acp/entity/:corpId
Response: { entity: { corpId, type, name, trustScore, trustLevel, verified } }

# Enrich ACP message with CorpID data
POST /api/acp/enrich
Request: { message: { senderId, type, targetId, payload } }
Response: { enrichedMessage: { ..., sender: { corpId, type, trustScore, delegationChain } } }
```

---

## 13. MemoryOS Events

### 13.1 Event Types

| Event Type | Trigger |
|------------|---------|
| `user_registered` | User creation |
| `user_updated` | User update |
| `agent_passport_created` | Agent creation |
| `agent_passport_updated` | Agent update |
| `agent_passport_suspended` | Agent suspended |
| `agent_passport_revoked` | Agent revoked |
| `delegation_granted` | Delegation creation |
| `delegation_updated` | Delegation update |
| `delegation_revoked` | Delegation revocation |
| `delegation_expired` | Delegation expiration |
| `trust_score_changed` | Trust score update |
| `workload_identity_registered` | Workload creation |
| `workload_credentials_rotated` | Credential rotation |
| `session_started` | Login |
| `session_ended` | Logout |

### 13.2 Event Payload

```typescript
interface IdentityEvent {
  entityId: string;
  eventType: string;
  timestamp: string;               // ISO timestamp
  data: object;                   // Event-specific data
  source: 'corpID';
  tags: string[];                 // ['identity', 'audit', 'corpID']
}
```

---

## 14. API Reference

### 14.1 Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login (returns MFA token if enabled) |
| POST | `/auth/mfa-verify` | No | Verify MFA code |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | Yes | Logout |
| GET | `/auth/me` | Yes | Get current user |

### 14.2 MFA

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/mfa/setup` | Yes | Setup MFA |
| POST | `/api/mfa/verify` | Yes | Verify MFA code |
| GET | `/api/mfa/status` | Yes | Get MFA status |
| POST | `/api/mfa/disable` | Yes | Disable MFA |

### 14.3 Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Admin | List users |
| POST | `/api/users` | Admin | Create user |
| GET | `/api/users/:id` | Yes | Get user |
| PUT | `/api/users/:id` | Yes | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user |
| GET | `/api/profile` | Yes | Get own profile |
| PUT | `/api/profile` | Yes | Update own profile |
| PUT | `/api/profile/password` | Yes | Change password |

### 14.4 Agents

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/agents` | Yes | Create agent passport |
| GET | `/api/agents` | Yes | List agents |
| GET | `/api/agents/capabilities` | No | List capabilities |
| GET | `/api/agents/:agentId` | Yes | Get agent |
| PUT | `/api/agents/:agentId` | Yes | Update agent |
| DELETE | `/api/agents/:agentId` | Yes | Revoke passport |
| POST | `/api/agents/:agentId/suspend` | Yes | Suspend agent |
| POST | `/api/agents/:agentId/resume` | Yes | Resume agent |
| GET | `/api/agents/:agentId/permissions` | Yes | Get permissions |
| POST | `/api/agents/:agentId/permissions` | Yes | Add permissions |
| GET | `/api/agents/:agentId/budget` | Yes | Get budget |
| POST | `/api/agents/:agentId/budget/reset` | Yes | Reset budget |

### 14.5 Workloads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/workloads` | Admin | Register workload |
| GET | `/api/workloads` | Admin | List workloads |
| GET | `/api/workloads/:workloadId` | Yes | Get workload |
| POST | `/api/workloads/:workloadId/rotate` | Yes | Rotate credentials |
| DELETE | `/api/workloads/:workloadId` | Yes | Deregister |
| GET | `/api/workloads/:workloadId/verify` | WL | Verify workload |

### 14.6 Delegations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/delegations` | Yes | Create delegation |
| GET | `/api/delegations` | Yes | List delegations |
| GET | `/api/delegations/issued` | Yes | Delegations I created |
| GET | `/api/delegations/received` | Yes | Delegations to me |
| GET | `/api/delegations/chain/:entityId` | Yes | Full delegation chain |
| GET | `/api/delegations/:delegationId` | Yes | Get delegation |
| PUT | `/api/delegations/:delegationId` | Yes | Update (narrow only) |
| DELETE | `/api/delegations/:delegationId` | Yes | Revoke |
| DELETE | `/api/delegations/:delegationId/expire` | Yes | Force expire |
| POST | `/api/delegations/:delegationId/approve` | Yes | Approve |
| POST | `/api/delegations/:delegationId/reject` | Yes | Reject |
| POST | `/api/delegations/check` | No | SUTAR authority check |

### 14.7 Trust

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/trust/score/:corpId` | No | Get trust score |
| PUT | `/api/trust/score/:corpId` | Yes | Update score |
| GET | `/api/trust/levels` | No | Get trust levels |
| GET | `/api/trust/score/:corpId/dimensions` | No | All dimensions |
| GET | `/api/trust/score/:corpId/dimensions/:dim` | No | Specific dimension |
| PUT | `/api/trust/score/:corpId/dimensions/:dim` | Yes | Update dimension |
| POST | `/api/trust/score/:corpId/refresh` | No | Refresh score |
| POST | `/api/trust/evaluate` | Yes | Evaluate entity |
| GET | `/api/trust/risk-check` | Yes | Risk check |

### 14.8 Federation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/.well-known/openid-configuration` | No | OIDC discovery |
| GET | `/api/federation/providers` | No | OAuth providers |
| GET | `/api/federation/oidc/jwks` | No | JWKS |
| GET | `/api/federation/oidc/userinfo` | Yes | User info |
| POST | `/api/federation/oidc/token` | No | Token exchange |
| POST | `/api/federation/oidc/revoke` | No | Revoke token |
| GET | `/api/federation/saml/metadata` | No | SAML metadata |
| POST | `/api/federation/saml/acs` | No | SAML ACS |
| GET | `/api/federation/saml/sls` | No | SAML logout |

### 14.9 ACP

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/acp/verify/:corpId` | No | Verify CorpID |
| GET | `/api/acp/entity/:corpId` | No | Get entity |
| POST | `/api/acp/enrich` | No | Enrich message |

---

## 15. Data Models

### 15.1 Complete Model List

| Model | Key | Storage |
|-------|-----|---------|
| `User` | email | Users |
| `Business` | id | Businesses |
| `RefreshToken` | token | Sessions |
| `ApiKey` | id | API Keys |
| `TrustScore` | corpId | Trust scores |
| `TrustDimension` | dimensionKey | Trust dimensions |
| `Namespace` | name | Isolated namespaces |
| `Agent` | agentId | Agent passports |
| `AgentInteraction` | id | Interaction logs |
| `Delegation` | delegationId | Delegations |
| `RelNode` | nodeId | Relationship nodes |
| `RelEdge` | edgeId | Relationship edges |
| `TrustEvaluation` | evaluationId | Trust evaluations |
| `IdentityEvent` | eventId | Timeline events |
| `FedProvider` | providerId | OAuth providers |
| `FedLink` | linkId | OAuth links |
| `WorkloadIdentity` | workloadId | Workload identities |
| `MfaSecret` | email | MFA secrets |

### 15.2 Storage

Data is stored as JSON files in `./data/` directory:
- `data/users.json`
- `data/businesses.json`
- `data/agents.json`
- etc.

### 15.3 Encryption

Enable AES-256-GCM encryption with:
```bash
STORAGE_ENCRYPTION_KEY=your-32-byte-key
# or
PERSISTENT_STORE_KEY=your-key
```

---

## 16. Configuration

### 16.1 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4702 | Service port |
| `JWT_SECRET` | - | JWT signing secret (required) |
| `JWT_EXPIRES_IN` | 1h | Access token expiry |
| `REFRESH_EXPIRES_IN` | 7d | Refresh token expiry |
| `TOKEN_ISSUER` | rtmn-corpid | Token issuer |
| `STORAGE_ENCRYPTION_KEY` | - | Encryption key |
| `PERSISTENT_STORE_KEY` | - | Alternative encryption key |
| `AGENT_OS_URL` | localhost:4803 | AgentOS service URL |
| `MEMORY_OS_URL` | localhost:4703 | MemoryOS service URL |
| `CORPID_INTERNAL_TOKEN` | corpID-internal-dev-token | Internal API token |
| `OIDC_ALLOWED_CLIENTS` | - | Comma-separated client IDs |

### 16.2 Rate Limits

| Limiter | Limit | Window |
|---------|-------|--------|
| Global | 100 requests | 1 minute |
| Auth | 10 requests | 1 minute |
| Strict | 20 requests | 1 minute |
| Login | 5 attempts | 5 minutes |

### 16.3 Security Defaults

| Setting | Value |
|---------|-------|
| Bcrypt rounds | 12 |
| Account lockout | 5 attempts → 15 min |
| MFA window | ±1 period (90s) |
| Backup codes | 10 per user |
| Delegation max depth | 10 levels |

---

## 17. Integration Points

### 17.1 RTMN Hub

CorpID is exposed via RTMN Hub at `/api/identity/*`:

```
/api/identity/health     → http://localhost:4702/health
/api/identity/auth/*    → http://localhost:4702/auth/*
/api/identity/api/*     → http://localhost:4702/api/*
```

### 17.2 External Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| AgentOS | 4803 | Agent registry sync |
| MemoryOS | 4703 | Identity events |
| Hub | 4399 | Unified gateway |

---

## 18. Error Codes

| Code | Message | HTTP |
|------|---------|------|
| `USER_NOT_FOUND` | User not found | 404 |
| `INVALID_CREDENTIALS` | Invalid email or password | 401 |
| `ACCOUNT_LOCKED` | Account locked | 423 |
| `MFA_REQUIRED` | MFA verification required | 403 |
| `INVALID_MFA_CODE` | Invalid MFA code | 401 |
| `TOKEN_EXPIRED` | Token expired | 401 |
| `FORBIDDEN` | Access denied | 403 |
| `CONFLICT` | Resource already exists | 409 |
| `VALIDATION_ERROR` | Validation failed | 400 |

---

*CorpID v3.0 — Universal Identity OS for Humans, AI Agents, Workloads & Autonomous Economies*
