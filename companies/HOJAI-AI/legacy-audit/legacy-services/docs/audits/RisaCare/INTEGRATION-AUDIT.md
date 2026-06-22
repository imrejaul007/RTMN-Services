# RisaCare Ecosystem Integration Audit

**Date:** June 20, 2026  
**Version:** 1.0.0

---

## Ecosystem Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REZ ECOSYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │   HOJAI    │────▶│  RABTUL    │────▶│    REZ     │           │
│  │   LLM      │     │   Auth     │     │ Intelligence│           │
│  │  (4730)    │     │  (4000+)   │     │  (3000+)   │           │
│  └─────────────┘     └─────────────┘     └─────────────┘           │
│       │                   │                   │                    │
│       ▼                   ▼                   ▼                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              RisaCare Healthcare OS                      │    │
│  │                                                           │    │
│  │  B2C (4700-4729)     B2B (4740-4743)     AI (4750+)     │    │
│  │  - Profile           - Hospital       - RCM             │    │
│  │  - Records           - Doctor         - Eligibility      │    │
│  │  - Booking           - Lab             - Pharmacy        │    │
│  │  - AI Service        - Pharmacy        - Teleconsult     │    │
│  │  - Wellness          - Elderly        - FHIR            │    │
│  │  - Teleconsult       - HomeCare       - Ambient Audio   │    │
│  │  - Insurance                        - Predictive       │    │
│  │                                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              CARECODE (HOJAI)                            │   │
│  │  - Care Manager AI    - Diagnosis AI                      │   │
│  │  - Pharmacist AI     - Appointment AI                     │   │
│  │  - Billing AI        - Records AI                        │   │
│  │  - IVR System       - Compliance Worker                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Integration Status

### ✅ CONNECTED TO ECOSYSTEM

| Integration | Service | Status | Notes |
|------------|---------|--------|-------|
| **HOJAI LLM** | risa-care-ai-service | ✅ Connected | HTTP to port 4730 |
| **RABTUL Auth** | Profile, Booking, Marketplace | ✅ Connected | JWT validation |
| **RABTUL Payment** | Marketplace | ✅ Connected | Payment processing |
| **REZ Intelligence** | Booking, Records | ✅ Connected | Intent signals |
| **CARECODE** | risa-care-ai-scribe | ✅ Connected | SOAP notes |
| **HOJAI Voice** | Ambient Audio | ✅ Connected | WebSocket/STT |

### ⚠️ PARTIALLY CONNECTED

| Service | Integration | Status | Notes |
|---------|-------------|--------|-------|
| Pharmacy Integration | RABTUL Payment | ⚠️ Partial | Payment wired, delivery not |
| Lab Integration | REZ Intelligence | ⚠️ Partial | Order sync, results pending |
| Teleconsult V2 | HOJAI Voice | ⚠️ Partial | WebRTC wired, LLM not |

### ❌ STANDALONE (Not Connected)

| Service | Issue |
|---------|-------|
| RCM Service | No ecosystem connection |
| Eligibility Service | No RABTUL payer integration |
| Clearinghouse | No payer API connection |
| Nursing Home | No integration |
| Predictive Engine | No REZ Intelligence |
| FHIR Service | No external FHIR sync |

---

## Integration Points by Company

### HOJAI-AI

| Service | Connects To | Port | Integration |
|---------|-------------|------|-------------|
| hojai-llm/providers | RisaCare AI | 4730 | ✅ Real LLM |
| hojai-voice-service | RisaCare Ambient | 4590 | ✅ STT/TTS |
| CARECODE | RisaCare AI Scribe | 4102 | ✅ Shared |
| carecode-IVR | RisaCare | 4857 | ✅ Voice |

### RABTUL-Technologies

| Service | Connects To | Port | Integration |
|---------|-------------|------|-------------|
| REZ-auth-service | All services | 4002 | ✅ JWT Auth |
| REZ-wallet-service | Pharmacy | 4004 | ✅ Coins |
| REZ-payment-service | Pharmacy, Booking | 4001 | ✅ Payments |
| REZ-notification-service | Booking, AI | 4011 | ✅ Push |

### REZ-Intelligence

| Service | Connects To | Port | Integration |
|---------|-------------|------|-------------|
| REZ-health-expert | RisaCare AI | 3011 | ✅ Health signals |
| REZ-health-monitor | Predictive | 3013 | ✅ Vitals |
| REZ-care-service | Booking | 3014 | ✅ Care signals |

### RisaCare

| Port | Service | HOJAI | RABTUL | REZ-Intelligence |
|------|---------|-------|--------|-----------------|
| 4700 | API Gateway | ❌ | ❌ | ❌ |
| 4702 | Records | ❌ | ❌ | ✅ |
| 4703 | AI Service | ✅ | ❌ | ❌ |
| 4704 | Profile | ❌ | ✅ | ❌ |
| 4705 | Booking | ❌ | ✅ | ✅ |
| 4706 | Marketplace | ❌ | ✅ | ❌ |
| 4732 | AI Scribe | ✅ | ❌ | ❌ |
| 4750 | RCM | ❌ | ❌ | ❌ |
| 4753 | Wearable | ❌ | ❌ | ❌ |
| 4754 | Predictive | ❌ | ❌ | ❌ |
| 4755 | Lab | ❌ | ❌ | ❌ |
| 4756 | Teleconsult V2 | ⚠️ Partial | ❌ | ❌ |
| 4757 | Pharmacy | ❌ | ✅ | ❌ |
| 4758 | Eligibility | ❌ | ❌ | ❌ |
| 4759 | Clearinghouse | ❌ | ❌ | ❌ |
| 4760 | Nursing Home | ❌ | ❌ | ❌ |
| 4761 | FHIR | ❌ | ❌ | ❌ |
| 4762 | Ambient | ✅ | ❌ | ❌ |

---

## What's Connected vs Standalone

### Connected Services (Need to Expand)

| Service | Connected To | Can Connect To |
|---------|-------------|----------------|
| risa-care-ai-service | HOJAI LLM | RABTUL Auth, REZ Intelligence |
| risa-care-profile-service | RABTUL Auth | HOJAI LLM |
| risa-care-booking-service | RABTUL, REZ Intelligence | HOJAI LLM |
| risa-care-marketplace-service | RABTUL Payment | HOJAI LLM, REZ Intelligence |
| risa-care-ai-scribe | HOJAI LLM | RABTUL Auth |
| risa-care-teleconsult-v2 | WebSocket | HOJAI LLM, RABTUL Auth |

### Standalone Services (Need Integration)

| Service | Should Connect To |
|---------|------------------|
| risa-care-rcm-service | RABTUL Payment, Clearinghouse |
| risa-care-eligibility-service | RABTUL Auth, Payer APIs |
| risa-care-clearinghouse | RABTUL Payment |
| risa-care-nursing-home-service | RABTUL Auth, REZ Intelligence |
| risa-care-fhir-service | External FHIR, REZ Intelligence |
| risa-care-ambient-audio-service | HOJAI Voice (partial) |
| risa-care-predictive-service | REZ Intelligence |
| risa-care-wearable-service | RABTUL Auth |
| risa-care-lab-integration | REZ Intelligence |
| risa-care-pharmacy-integration | RABTUL Payment |

---

## Missing Integration Points

### HIGH PRIORITY

1. **All AI Services → REZ Intelligence**
   - Add intent signal emission
   - Connect to Health Intent Graph

2. **RCM/Eigibility → RABTUL Payment**
   - Connect payment processing
   - Connect notification service

3. **Predictive Engine → REZ Intelligence**
   - Emit health risk signals
   - Connect to care coordination

### MEDIUM PRIORITY

4. **FHIR → External Systems**
   - Connect to hospital EHRs
   - Connect to national health ID (ABHA)

5. **Ambient Audio → HOJAI Voice**
   - Real Whisper integration
   - Real-time LLM summary

6. **Nursing Home → RABTUL Auth**
   - Staff authentication
   - Role-based access

### LOW PRIORITY

7. **Wearable → RABTUL Profile**
   - Sync health data to profile
   - Family sharing

---

## Action Items

### Phase 1: Connect All AI Services

```
risa-care-ai-service
    │
    ├── HOJAI LLM ✅
    ├── RABTUL Auth → ADD
    └── REZ Intelligence → ADD

risa-care-ai-scribe
    │
    ├── HOJAI LLM ✅
    └── REZ Intelligence → ADD

risa-care-predictive-service
    │
    └── REZ Intelligence → ADD
```

### Phase 2: Connect All B2B Services

```
risa-care-rcm-service
    │
    ├── RABTUL Payment → ADD
    ├── risa-care-eligibility → ADD
    └── Clearinghouse → ADD

risa-care-pharmacy-integration
    │
    ├── RABTUL Payment ✅
    ├── RABTUL Auth → ADD
    └── REZ Intelligence → ADD
```

### Phase 3: Connect Infrastructure

```
All Services
    │
    ├── RABTUL Auth ✅/❌
    ├── RABTUL Notification → Ensure all
    └── HOJAI LLM (AI services) ✅/❌
```

---

## Integration Checklist

- [ ] All services use RABTUL Auth
- [ ] All services log to REZ Intelligence
- [ ] AI services connect to HOJAI LLM
- [ ] Payment services connect to RABTUL Payment
- [ ] Booking connects to REZ Intelligence signals
- [ ] FHIR connects to external systems
- [ ] Ambient Audio uses real Whisper
- [ ] Predictive engine emits risk signals

---

**Last Updated:** June 20, 2026
