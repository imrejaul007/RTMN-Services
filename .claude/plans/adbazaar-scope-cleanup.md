# AdBazaar Scope Cleanup — Phase 8 (REVIEW)

**Date:** June 20, 2026
**Purpose:** Identify the 42-44 non-ad services polluting AdBazaar and propose where each should live. **This is a review document — no code changes proposed without explicit user approval per category.**

---

## Audit method

1. Parsed `package.json` descriptions of all 348 AdBazaar top-level dirs
2. Categorized by strict keyword matching against non-ad indicators (CRM/support/commerce/loyalty/messaging/HR)
3. Cross-referenced proposed destinations with existing company structures at `/Users/rejaulkarim/Documents/RTMN/companies/`

## Result: 42-44 services classified as non-ad (11-12% of AdBazaar scope)

These services either:
- Belong to a Department OS (sales-os, customer-success-os, marketing-os, workforce-os, etc.)
- Belong to another company (REZ-Merchant, REZ-Consumer, HOJAI-AI, CorpPerks, RABTUL-Technologies, Karma-Foundation, RTNM-Group)

---

## Full list with proposed destinations

### A → REZ-Merchant (commerce / CRM / customer engagement) — 18 services

| Service | Description | Why |
|---|---|---|
| `REZ-checkout-sdk` | Universal one-click checkout SDK | Commerce/checkout |
| `REZ-crm-hub` | CRM Integration Hub (HubSpot/Zoho) | CRM |
| `REZ-lead-intelligence` | Lead scoring + re-engagement | CRM/customer data |
| `REZ-rto-engine` | RTO (Return To Origin) Engine, COD fraud | Commerce |
| `REZ-communications-platform` | Multi-channel Email/SMS/WhatsApp/Push | Messaging |
| `REZ-journey-service` | Customer Journey Automation | Engagement |
| `REZ-engagement-platform` | Loyalty + offers + gamification + referrals | Engagement |
| `crm-service` | CRM Service | CRM |
| `customer-health-score-service` | Customer health metrics | CRM |
| `cart-recovery-service` | Cart abandonment recovery | Commerce |
| `journey-orchestrator` | Journey Orchestrator | Engagement |
| `lead-scoring-service` | Lead qualification | CRM |
| `push-notification-service` | Mobile push notifications | Messaging |
| `broadcast-service` | Mass broadcasting | Messaging |
| `rez-voice-billing` | Voice call session billing | Commerce |
| `rez-voice-cart-recovery` | Voice AI cart recovery | Commerce |
| `rez-whatsapp-commerce` | WhatsApp shopping/cart/checkout | Commerce |
| `rez-whatsapp-store` | WhatsApp Store commerce | Commerce |
| `rez-whatsapp-provisioning` | Multi-tenant WhatsApp provisioning | Commerce |
| `whatsapp-ads-service` | WhatsApp Commerce Ads (India) | **Ambiguous — could be ad-tech OR commerce** |

### B → HOJAI-AI services (helpdesk / support platform) — 6 services

| Service | Description |
|---|---|
| `REZ-support-tools-hub` | Zendesk/Freshdesk/Intercom integration |
| `customer-support-service` | Tickets and chat |
| `helpdesk-ticketing-service` | Ticketing system with SLA |
| `support-escalation-service` | Ticket escalation routing |
| `support-sla-service` | SLA tracking |
| `knowledge-base-service` | Self-service knowledge base |

### C → Karma-Foundation (loyalty / rewards) — 7 services

| Service | Description |
|---|---|
| `REZ-gamification-service` | Gamification |
| `REZ-anniversary-rewards` | Anniversary milestone rewards |
| `REZ-birthday-rewards` | Birthday rewards |
| `loyalty-program-service` | Loyalty program management |
| `rewards-catalog-service` | Rewards catalog |
| `points-expiration-service` | Points expiration handling |
| `tier-management-service` | VIP tier management |

### D → RTNM-Group (core platform engine) — 7 services

| Service | Description |
|---|---|
| `REZ-economic-engine` | Single source of truth for business rules |
| `REZ-graph-api` | Graph API for knowledge graph |
| `REZ-discovery-platform` | Semantic search/geo-ranking/recommendations |
| `REZ-feature-flags` | Feature flag evaluation |
| `REZ-referral-graph` | Referral network graph |
| `rez-viral-loop` | Viral loop engine |
| `governance-service` | Tenant isolation, RBAC, audit |

### E → RABTUL-Technologies (financial) — 1 service

| Service | Description |
|---|---|
| `adbazaar-creator-wallet` | Creator Wallet |

### F → REZ-Consumer — 1 service

| Service | Description |
|---|---|
| `REZ-consumer-kb` | Consumer memory/preferences/goals/context |

### G → CorpPerks (HR integration) — 2 services

| Service | Description |
|---|---|
| `corpperks-hr-integration` | CorpPerks HR integration |
| `corpperks-integration` | CorpPerks employee integration |

---

## Already at canonical homes (no action needed)

These are duplicated in AdBazaar but their canonical versions exist elsewhere. No action unless we want to deduplicate:

| AdBazaar version | Canonical home (existing) |
|---|---|
| `REZ-crm-hub` (AdBazaar) | `companies/RABTUL-Technologies/REZ-ai-crm-updates`, `companies/REZ-Merchant/rez-retail-crm-service` |
| `crm-service` (AdBazaar) | `services/crm-engine` (RTMN root) |
| `adbazaar-creator-wallet` | `companies/RABTUL-Technologies/rez-wallet-service` |

---

## Ambiguous (need user judgment)

A few services sit on the boundary:

| Service | Description | Question |
|---|---|---|
| `whatsapp-ads-service` | WhatsApp Commerce Ads (India) | Is this an ad-platform feature or a WhatsApp commerce feature? Description says both. |
| `REZ-engagement-platform` | "Unified loyalty + offers + gamification + referrals" | Marketing/loyalty overlap |
| `REZ-marketing` (29K LOC, in AdBazaar) | "REZ Ads Manager — audience targeting, cross-channel campaigns, keyword ads" | This IS advertising, but is it the right AdBazaar scope or belongs in industry-os/services/marketing-os/ (which already exists)? |
| `REZ-decision-service` (29K LOC) | Unified Targeting + Action Engine with Phase 3-5 Analytics Engines | Genuine ad-tech core, but massive and complex. Keep in AdBazaar. |
| `REZ-ads-service` | Merchant self-serve ads | AdBazaar core |
| `REZ-consumer-kb` | "Stores memory, preferences, goals, context" | MemoryOS already exists at `services/memory-os/` and at `companies/HOJAI-AI/services/`. This duplicates that. |

---

## Action categories (for user to choose per group)

For each group above, the user can choose:

1. **Move (relocate)**: physically move the directory to its destination company. Updates all references. Requires updating CLAUDE.md files at both source and destination.
2. **Reference (keep, but mark as mislocated)**: leave the directory in AdBazaar but add a deprecation notice in its CLAUDE.md saying "canonical home is X". Lower risk.
3. **Delete (if duplicate exists elsewhere)**: if a canonical version already exists at the destination, delete the AdBazaar version. Higher risk; requires verifying they're actually equivalent.
4. **Skip (no action)**: leave in AdBazaar, document in audit report only.

---

## Risks of doing this cleanup

| Risk | Mitigation |
|---|---|
| Service has cross-references to AdBazaar services | grep for imports/URLs referencing the moved service before move |
| Service is in CLAUDE.md as part of "the platform" | update CLAUDE.md in both locations |
| Service has its own RTMN Hub route | update Hub routes/index.js |
| Moving breaks docker-compose | update docker-compose.adbazaar-services.yml |
| Service is part of AdBazaar's "271 services" marketing claim | accept that the count will go down; that's the point |

---

## What is NOT in scope of this phase

- Code refactoring / merge of similar services (e.g., REZ-crm-hub vs the existing RABTUL-Technologies version)
- Port relocation for the moved services (they may have already-claimed ports in AdBazaar range)
- Updating RTMN Hub routes that reference moved services
- CLAUDE.md mass rewrite

---

## Recommendation

Given the destructive potential, I recommend a **review-and-approve approach**:

1. Review the 6 categories (A-G) above
2. For each category, choose Move / Reference / Delete / Skip
3. Only then execute the chosen actions

**Without explicit per-category approval, no moves happen.**