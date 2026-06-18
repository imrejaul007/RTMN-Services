# Division 8 — AI Products

> **Status:** 🟢 ~70% built (Genie, Razo, Copilots all exist)
> **Owner:** HOJAI AI Products team + RTMN Department OS teams

---

## 1. Mission

What **customers recognize and buy**. These are user-facing products that compose from Divisions 1-7. Not infrastructure — actual apps.

## 2. Target State (per plan)

### Personal AI
- **Genie** — Personal AI assistant (Voice + chat + memory + twins)
- **Razo** — Communication OS / smart keyboard
- **Personal Twin** — Your digital twin
- **AI Workspace** — Unified work/personal OS

### Founder AI
- **FounderOS** — Founder's complete AI operating system
- **CoPilot** — Personal AI co-pilot (general)
- **Company Builder Suite** — Toolchain for building companies
- **Startup Studio** — AI-assisted startup creation
- **Investor Copilot** — For VCs / angel investors
- **Board Intelligence** — Board meeting AI

### Enterprise AI
- **Bizora** — Enterprise AI workspace
- **HIB (HOJAI Intelligence Bureau)** — Internal AI consulting
- **CXO OS** — Executive command center
- **Department OS** — Sales OS, Marketing OS, Finance OS, etc.
- **Enterprise Twin** — Whole-company digital twin
- **Company Twin** — Single-company digital twin
- **Employee Twin** — Per-employee digital twin

## 3. Current State — What's Built

### Personal AI ✅
| Product | Service | Port | State |
|---|---|---|---|
| **Genie Gateway** | [services/genie-gateway/](../../../services/genie-gateway/) | 4701 | ✅ Real |
| **Genie Personal AI** (full suite: 23 services) | [services/genie-*](../../../services/) (23 services) | 4709-4728 | ✅ Real — Genie ecosystem is the strongest area |
| **Razo Keyboard** | [services/razo-keyboard/](../../../services/razo-keyboard/) | 4725 | ✅ Real |
| **Personal Twin** (User Twin, Genie Twin) | [services/user-twin/](../../../services/user-twin/) + Genie Memory | 4889 | ✅ Real |
| **AI Workspace** | (Genie gateway + Genie Life University) | 4727 | 🟡 Partial |

### Founder AI 🟡
| Product | Service | Port | State |
|---|---|---|---|
| **CoPilot** (general) | [services/agent-copilot/](../../../services/agent-copilot/) | 4920 | ✅ Real (agent orchestration) |
| **Bizora** | `companies/RTNM-Digital/...` (Bizora branding) | — | 🟡 Marketed, partial impl |
| **FounderOS** | — | — | ❌ Not built |
| **Company Builder Suite** | — | — | ❌ Not built |
| **Startup Studio** | — | — | ❌ Not built |
| **Investor Copilot** | — | — | ❌ Not built |
| **Board Intelligence** | — | — | ❌ Not built |

### Enterprise AI ✅
| Product | Service | Port | State |
|---|---|---|---|
| **CXO OS** | [industry-os/services/cxo-os/](../../../industry-os/services/cxo-os/) | 5100 | ✅ Real |
| **Sales OS** | [industry-os/services/sales-os/](../../../industry-os/services/sales-os/) | 5055 | ✅ Real (22 agents) |
| **Marketing OS** | [industry-os/services/marketing-os/](../../../industry-os/services/marketing-os/) | 5500 | ✅ Real (15 agents) |
| **Customer Success OS** | [industry-os/services/customer-success-os/](../../../industry-os/services/customer-success-os/) | 4050 | ✅ Real |
| **Finance OS** | [industry-os/services/finance-os/](../../../industry-os/services/finance-os/) | 4801 | ✅ Real |
| **Workforce OS** | [industry-os/services/workforce-os/](../../../industry-os/services/workforce-os/) | 5077 | ✅ Real |
| **Operations OS** | [industry-os/services/operations-os/](../../../industry-os/services/operations-os/) | 5250 | ✅ Real |
| **Procurement OS** | [industry-os/services/procurement-os/](../../../industry-os/services/procurement-os/) | 5096 | ✅ Real |
| **Revenue Intelligence OS** | [industry-os/services/revenue-intelligence-os/](../../../industry-os/services/revenue-intelligence-os/) | 5400 | ✅ Real |
| **Media OS** | [industry-os/services/media-os/](../../../industry-os/services/media-os/) | 5600 | ✅ Real |
| **Sales Copilot** | [services/sales-copilot/](../../../services/sales-copilot/) | 4928 | ✅ Real |
| **Marketing Copilot** | [services/marketing-copilot/](../../../services/marketing-copilot/) | 4929 | ✅ Real |
| **Finance Copilot** | [services/finance-copilot/](../../../services/finance-copilot/) | 4930 | ✅ Real |
| **Executive Copilot** | [services/executive-copilot/](../../../services/executive-copilot/) | 4933 | ✅ Real |
| **Support Copilot** | [services/support-copilot/](../../../services/support-copilot/) | 4895 | ✅ Real |
| **Enterprise Twin** / **Company Twin** / **Employee Twin** | [services/organization-twin/](../../../services/organization-twin/) + [services/employee-twin/](../../../services/employee-twin/) | 4710 / 4730 | ✅ Real |
| **HOJAI Agent Copilot** (recovered, richer version) | [companies/HOJAI-AI-restored/hojai-agent-copilot/](../../HOJAI-AI-restored/hojai-agent-copilot/) | 4895 | 🟡 Recovered |
| **HIB (HOJAI Intelligence Bureau)** | — | — | ❌ Not built |

## 4. What's NOT Built

| Missing | Notes | Effort |
|---|---|---|
| **FounderOS** | Founder-specific AI OS | 12+ weeks |
| **Company Builder Suite** | Toolchain for company formation | 12+ weeks |
| **Startup Studio** | AI-assisted startup creation | 16+ weeks |
| **Investor Copilot** | AI for VCs | 6-8 weeks |
| **Board Intelligence** | Board meeting AI | 4-6 weeks |
| **HIB (HOJAI Intelligence Bureau)** | Internal consulting AI | 8-12 weeks |
| **AI Workspace** (full unified) | Genie is close but not unified | 8-12 weeks |
| **Bizora** (full impl) | Marketed but partial | 12+ weeks |

## 5. Gap Score

**~70% of target state is built.** Personal AI (Genie ecosystem) is very strong. Enterprise AI (Department OS, Copilots, Twins) is strong. Founder AI is the big gap.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **Bizora** (Enterprise AI Workspace) | 🔴 P0 | 12+ weeks — flagship product |
| 2 | **HIB (HOJAI Intelligence Bureau)** | 🟡 P1 | 8-12 weeks |
| 3 | **AI Workspace** (unified) | 🟡 P1 | 8-12 weeks |
| 4 | **Board Intelligence** | 🟢 P2 | 4-6 weeks |
| 5 | **Investor Copilot** | 🟢 P2 | 6-8 weeks |
| 6 | **FounderOS** | 🟢 P2 | 12+ weeks |
| 7 | **Startup Studio** | 🟢 P3 | 16+ weeks |
| 8 | **Company Builder Suite** | 🟢 P3 | 12+ weeks |

## 7. Dependencies

- **Depends on:** All lower divisions (1-7)
- **Blocks:** Nothing — this is the top of the stack

## 8. Open Questions

- **Bizora vs CXO OS:** Per user clarification, **Bizora is a HOJAI AI standalone product** (Enterprise AI Workspace). It's separate from CXO OS (which is one of the Department OSes under RTMN). Bizora could be thought of as the "AI layer for executives/founders" while CXO OS is the broader CXO command center. They may overlap in audience but are distinct products.
- **HIB pricing:** Consulting AI typically has a different pricing model (per engagement, not per seat). Define before building.
- **FounderOS scope:** Is this for first-time founders (mentorship) or experienced founders (ops automation)? Different products.
- **Personal Twin vs User Twin:** User Twin exists; is Personal Twin the same thing with AI agent capabilities? Or distinct?

---

*See also: [services/genie-gateway/CLAUDE.md](../../../services/genie-gateway/CLAUDE.md), [industry-os/services/cxo-os/CLAUDE.md](../../../industry-os/services/cxo-os/CLAUDE.md), [services/sales-copilot/CLAUDE.md](../../../services/sales-copilot/CLAUDE.md)*