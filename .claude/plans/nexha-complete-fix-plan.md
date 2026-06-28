# Nexha Ecosystem — Complete Fix Plan

**Date:** 2026-06-28
**Goal:** Production-ready: 100% test coverage, fixed port conflicts, cleaned ghost services, updated docs

---

## What We Found

### True State of Nexha (40 services, 45,715 LOC)

| Category | Services | src/ LOC | test LOC | Coverage |
|---------|----------|----------|----------|----------|
| Federation (7) | capability-os, discovery-os, federation-os, reputation-os, opportunity-os, market-os, autonomous-logistics | 13,677 | 2,790 | **20%** |
| Commerce (8) | acp-messaging, business-directory, mission-planner, partner-graph, commerce-runtime, provisioning-engine, hooks-sdk, tenant-summary | 8,448 | 6,715 | **79%** |
| Ghost (24) | See below | 20,691 | 4,209 | **20%** |
| commerce-identity | (root-level) | 2,899 | **0** | **0%** |

### 9 Ghost Services with ZERO tests (5,141 untested LOC):
nexha-gametheory-os (1,110), nexha-onboarding-os (979), nexha-governance-os (955), nexha-agent-os (1,415, needs more tests), nexha-wallet-os (806), nexha-incentive-os (546), nexha-observability-os (459), nexha-legal-os (381), nexha-arbitration-os (388), nexha-failure-os (323)

### Port Conflicts (HIGH)
nexha-contract-network (expects 4289, defaults to 4381), nexha-compliance-network (expects 4290, defaults to 4376), nexha-payment-network (expects 4296, defaults to 4382), nexha-partner-network (expects 4297, defaults to 4383)

---

## Plan: 6 Phases

### PHASE 1: Fix Port Conflicts
Change default PORT in src/index.js for each service to match docker-compose.

### PHASE 2: Add Tests to Federation Services
Add ~500 lines covering match, attest, stats, NLP, compliance, handshakes, policies, RFCs, ACI computation, demand signals, market gaps.

### PHASE 3: Add Tests to commerce-identity
2,899 LOC, 0 tests. Cover supplier/buyer auth, JWT flow, ratings.

### PHASE 4: Add Tests to Ghost Services
Priority: gametheory-os (1,110) > onboarding-os (979) > governance-os (955) > agent-os (needs expansion) > wallet-os (806) > incentive-os > observability-os > legal-os > arbitration-os > failure-os

### PHASE 5: Clean Up
Remove stub services/nexha-os-runtime/, fix empty test dirs.

### PHASE 6: Update CLAUDE.md
Reflect true state with accurate coverage numbers.

**Total: ~11-12 hours of work**
