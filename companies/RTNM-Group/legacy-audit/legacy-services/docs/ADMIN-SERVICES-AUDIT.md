# REZ Admin Services - Complete Audit

**Date:** May 18, 2026
**Version:** 1.0

---

## Executive Summary

REZ has **6 admin services** across different domains. This audit identifies overlaps, gaps, and recommends consolidation.

---

## Admin Services Inventory

### 1. REZ Unified Admin (`rez-unified-admin`)

| Aspect | Details |
|--------|---------|
| **Purpose** | Ecosystem-wide dashboard |
| **Scope** | All companies |
| **Status** | Spec only (partial UI) |
| **Missing** | Full implementation |

**Features:**
- Service health monitoring
- Customer 360
- Revenue analytics
- Event logs

**Missing:**
- User management
- API key management
- Webhook configuration
- Audit logs
- Role-based access control

---

### 2. REZ Admin Service (`rez-admin-service`)

| Aspect | Details |
|--------|---------|
| **Purpose** | General admin operations |
| **Scope** | Platform-wide |
| **Status** | Basic skeleton |
| **Missing** | Features, UI, integrations |

**Features:**
- MongoDB connection
- Basic health check

**Missing:**
- Everything else

---

### 3. Support Dashboard (`rez-support-dashboard`)

| Aspect | Details |
|--------|---------|
| **Purpose** | Support team operations |
| **Scope** | Customer support |
| **Status** | Implemented |
| **Port** | 4052 |

**Features:**
- Unified inbox
- Agent assignment
- SLA tracking
- Real-time updates
- Channel aggregation (WhatsApp, Email, Instagram, Web, Chat)
- Analytics dashboard

**Connected to:**
- REZ-care-service
- REZ-agent
- WhatsApp Commerce
- Instagram Bridge

---

### 4. Trust Admin (`REZ-trust-admin`)

| Aspect | Details |
|--------|---------|
| **Purpose** | Trust & safety operations |
| **Scope** | Fraud, verification, AML |
| **Status** | Implemented |
| **Missing** | Integration with unified admin |

**Features:**
- Fraud case management
- Verification queue
- AML monitoring
- Trust score dashboard

**Missing:**
- Real-time fraud alerts
- ML model management
- Integration with unified dashboard

---

### 5. Loyalty Admin (`rez-loyalty-admin`)

| Aspect | Details |
|--------|---------|
| **Purpose** | Karma/loyalty management |
| **Scope** | Rewards & gamification |
| **Status** | Implemented |
| **Missing** | Integration with unified admin |

**Features:**
- Karma point management
- Tier configuration
- Campaign management
- Leaderboards

**Connected to:**
- Karma service
- Wallet service

---

### 6. App Admin (`rez-app-admin`)

| Aspect | Details |
|--------|---------|
| **Purpose** | Consumer app management |
| **Scope** | REZ App |
| **Status** | Implemented |
| **Missing** | Integration with unified admin |

**Features:**
- User management
- App configuration
- Push notification management
- Feature flags

---

## Comparison Matrix

| Feature | Unified | Admin | Support | Trust | Loyalty | App |
|---------|---------|--------|----------|--------|----------|-----|
| **Service Health** | ✅ | | | | | |
| **Customer 360** | ✅ | | | | | |
| **Analytics** | ✅ | | ✅ | | ✅ | |
| **User Management** | | | | | | ✅ |
| **API Keys** | | | | | | |
| **Webhooks** | | | | | | |
| **Audit Logs** | | | | | | |
| **RBAC** | | | | | | |
| **Unified Inbox** | | | ✅ | | | |
| **Fraud Cases** | | | | ✅ | | |
| **Karma Config** | | | | | ✅ | |
| **App Config** | | | | | | ✅ |
| **Notifications** | | | | | | ✅ |

---

## Overlaps & Gaps

### Overlaps

1. **Analytics** - Shared between Unified, Support, and Loyalty admins
2. **User View** - Multiple admins show user data differently
3. **Notifications** - Both Support and App admin manage notifications

### Gaps

| Gap | Priority | Impact |
|-----|----------|--------|
| **RBAC/Access Control** | HIGH | Security risk |
| **Audit Logging** | HIGH | Compliance risk |
| **API Key Management** | HIGH | Platform risk |
| **Webhook Config** | MEDIUM | Integration risk |
| **Unified Search** | MEDIUM | Efficiency |
| **Alert Management** | MEDIUM | Operations |

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────┐
│              UNIFIED ADMIN PORTAL                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Service │  │ Customer│  │  Fraud  │           │
│  │ Health  │  │   360   │  │  Admin  │           │
│  └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  Karma  │  │ Support │  │   App  │           │
│  │ Admin   │  │ Inbox   │  │  Config │           │
│  └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
│  ┌─────────────────────────────────────┐           │
│  │         SHARED INFRASTRUCTURE        │           │
│  │  RBAC │ Audit Logs │ API Keys │ Search │           │
│  └─────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
```

---

## Recommendations

### 1. Consolidate into Single Portal

Merge all admin services into unified portal with modules:

| Module | Current Service |
|--------|----------------|
| Service Health | Unified Admin |
| Customer 360 | Unified Admin |
| Analytics | Unified + Support + Loyalty |
| User Management | App Admin |
| Fraud/Trust | Trust Admin |
| Karma Config | Loyalty Admin |
| Support Inbox | Support Dashboard |
| App Config | App Admin |

### 2. Add Missing Features

| Feature | Module | Priority |
|---------|--------|----------|
| RBAC | Shared | HIGH |
| Audit Logs | Shared | HIGH |
| API Key Management | Shared | HIGH |
| Webhook Config | Shared | MEDIUM |
| Alert Management | Operations | MEDIUM |
| Unified Search | Shared | MEDIUM |

### 3. Integration Points

| Admin | Connect To |
|-------|-----------|
| Unified | Event Bus, CDP, Intelligence |
| Support | REZ-care, Agent |
| Trust | Fraud Agent, Signals |
| Loyalty | Karma Service, Wallet |
| App | Auth, Notifications |

---

## Implementation Plan

### Phase 1: Foundation
1. Add RBAC to unified admin
2. Add audit logging
3. Add API key management
4. Integrate with event bus

### Phase 2: Consolidation
1. Move Trust admin into unified
2. Move Loyalty admin into unified
3. Move App admin into unified
4. Keep Support as separate (needed for agents)

### Phase 3: Enhancement
1. Add unified search
2. Add webhook management
3. Add alert management
4. Add ML model management for fraud

---

## Files Status

| Admin | README | UI | API | Integration |
|-------|---------|----|----|-------------|
| unified-admin | ✅ SPEC | ✅ Partial | | |
| admin-service | ✅ Basic | | | |
| support-dashboard | ✅ Full | ✅ Full | ✅ Full | ✅ |
| trust-admin | ✅ | ✅ Full | ✅ | |
| loyalty-admin | ✅ | ✅ Full | ✅ | |
| app-admin | | ✅ Full | | |

---

## Next Steps

1. ✅ Document current state
2. ⬜ Add RBAC to unified admin
3. ⬜ Add audit logging
4. ⬜ Integrate all admin services
5. ⬜ Consolidate into single portal
6. ⬜ Add missing features
