# Global Nexha Foundation — Founding Charter

**Status:** Proposed
**Date:** 2026-06-29
**Document:** GNF-CHARTER-v1.0
**Authoring Body:** Initial Steerco (RTMN Digital)

---

## 1. Mission

The **Global Nexha Foundation (GNF)** is a neutral, member-governed organization stewarding the **Nexha Agent Commerce Protocol (NACP)** — the open standard for AI-to-AI commerce.

The Foundation exists to:

1. **Maintain NACP as open infrastructure** — Like W3C for the Web or Linux Foundation for Kubernetes.
2. **Convene diverse stakeholders** — AI labs, enterprises, governments, merchants, logistics providers, financial institutions.
3. **Protect neutrality** — Ensure no single company controls the protocol.
4. **Drive adoption** — Lower barriers through SDKs, documentation, and reference implementations.
5. **Certify implementations** — Compliance testing for SDKs and gateways.

## 2. Why a Foundation?

Today, NACP is stewarded by RTMN Digital. This creates three problems:

1. **Perception** — External partners (OpenAI, Google, Meta, SAP) see NACP as a proprietary RTMN product, not neutral infrastructure. They will not join.
2. **Conflict of interest** — RTMN operates Nexha gateways and competes with other gateway operators.
3. **Single point of failure** — If RTMN pivots, NACP loses its steward.

A foundation solves all three by transferring stewardship to a neutral entity governed by diverse stakeholders.

## 3. Legal Structure

**Recommended:** Swiss Verein (like W3C, ICANN, Linux Foundation Europe)

| Attribute | Detail |
|-----------|--------|
| **Legal form** | Swiss Verein (association under Swiss Civil Code Art. 60+) |
| **Seat** | Zug, Switzerland (crypto-valley, established VC jurisdiction) |
| **Registered** | Handelsregister Kanton Zug |
| **Members** | Initial 12–18 founding members, growing to 50+ |
| **Fiscal year** | Calendar year |
| **Annual budget** | Target $5M Year 1, scaling to $20M Year 3 |

### Why Switzerland?

- Neutral on geopolitics (similar to ICANN, W3C, Red Cross)
- Established home for tech foundations (Ethereum, Web3, ICP)
- Strong IP and privacy law
- Single-language Zug is small, pragmatic, English-friendly
- 12% corporate tax in Zug (lowest in CH)

## 4. Membership Tiers

| Tier | Annual Dues | Voting Power | Examples |
|------|------------|--------------|----------|
| **Platinum Founding** | $500,000 | 5 votes | OpenAI, Anthropic, Google, Meta, AWS, Microsoft, SAP, Shopify |
| **Gold** | $100,000 | 2 votes | Stripe, DHL, FedEx, Maersk, Visa, Mastercard, Razorpay, Salesforce |
| **Silver** | $25,000 | 1 vote | Mid-size AI labs, logistics startups, fintech companies |
| **Bronze** | $5,000 | 0.5 votes | Individual developers, small merchants, consultants |
| **Associate (non-voting)** | $0 | 0 votes | Government agencies, academic institutions, NGOs |

**Goal:** 18 founding members by EOY 2026, 50+ members by EOY 2027.

## 5. Governance Structure

```
┌──────────────────────────────────────────────────────────────┐
│                     GENERAL ASSEMBLY                        │
│   (All members vote on bylaws, budget, board election)     │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     BOARD OF DIRECTORS                       │
│   (9 members: 4 Platinum + 2 Gold + 1 Silver + 1 Bronze   │
│    + 1 Independent Chair)                                   │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ TECHNICAL COUNCIL│ │ SECURITY COUNCIL │ │ ECONOMIC COUNCIL │
│                  │ │                  │ │                  │
│ - Protocol spec  │ │ - Trust models   │ │ - Fee structure  │
│ - SDK standards  │ │ - DID resolution │ │ - Token economics│
│ - Compatibility  │ │ - AI safety      │ │ - Settlement     │
│ - Reference impl │ │ - Fraud prevent  │ │ - Incentives     │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  EXECUTIVE DIRECTOR + STAFF                  │
│   (15–25 FTE by Year 2: engineers, ops, legal, marketing)   │
└──────────────────────────────────────────────────────────────┘
```

### 5.1 Board of Directors

**Composition (9 seats):**
- 4 Platinum Founding Member representatives
- 2 Gold Member representatives
- 1 Silver Member representative
- 1 Bronze Member representative
- 1 Independent Chair (elected by full Assembly, must not be employee of any member)

**Term:** 3 years, staggered (3 seats elected each year)

**Responsibilities:**
- Approve annual budget
- Approve protocol major version releases
- Hire/fire Executive Director
- Approve new membership tiers
- Resolve disputes between councils

### 5.2 Technical Council

**Size:** 7–12 members (elected for technical merit, not by company size)

**Charter:** Owns NACP specification (RFCs), reference implementations, SDK standards.

**Cadence:** Monthly public meetings, quarterly in-person summits.

**Decision-making:** Lazy consensus (2-week comment window), 2/3 majority for breaking changes.

### 5.3 Security Council

**Size:** 5–9 members (security researchers, cryptographers, trust & safety experts)

**Charter:** Trust scoring formulas, DID resolution, identity verification, AI safety guardrails, fraud prevention, incident response.

### 5.4 Economic Council

**Size:** 5–9 members (economists, payment industry, financial inclusion experts)

**Charter:** Fee structure, transaction fees, settlement standards, dispute resolution economics, incentive alignment.

## 6. Intellectual Property

### 6.1 NACP Specification (RFCs)
- **License:** Creative Commons Attribution 4.0 (CC-BY-4.0)
- Anyone may implement, fork, or extend without royalty
- Foundation maintains canonical reference

### 6.2 Reference Implementations
- **License:** Apache 2.0 (permissive, patent grant)
- Open source under `github.com/global-nexha-foundation/`
- Community contributions welcome

### 6.3 Trademarks
- "Nexha" wordmark, "did:nexha" DID method, "NACP" acronym
- Held by Foundation, freely usable per trademark policy
- No fees for compliant implementations

### 6.4 Patent Policy
- Members commit to non-aggression on NACP implementations
- Inspired by W3C Patent Policy (royalty-free licensing)
- Defensive termination if member asserts patents against NACP

## 7. Working Groups

Specialized working groups under Technical Council:

| WG | Focus | Initial Chair |
|----|-------|---------------|
| **WG-Identity** | DID methods, CorpID integration, KYC standards | TBD |
| **WG-Discovery** | Supplier indexing, NLP, vector search | TBD |
| **WG-Negotiation** | ACP state machines, multi-party protocols | TBD |
| **WG-Payment** | Escrow, multi-currency, BNPL, dispute resolution | TBD |
| **WG-Logistics** | Carrier integration, customs, insurance | TBD |
| **WG-AI-Safety** | Trust scoring for AI agents, hallucination detection | TBD |
| **WG-Compliance** | GDPR, AI Act, OFAC, sanctions screening | TBD |
| **WG-Standards** | Cross-industry alignment (UN/CEFACT, ISO 20022) | TBD |

## 8. Funding Model

### 8.1 Initial Funding ($5M Year 1)

| Source | Amount | % |
|--------|--------|---|
| Platinum Founding Members (×8) | $4,000,000 | 80% |
| Gold Members (×8) | $800,000 | 16% |
| RTMN Digital in-kind contribution (IP, staff) | $200,000 | 4% |

### 8.2 Year 2-3 Targets ($10M-$20M)

- Add Silver/Bronze member tiers
- Trademark licensing (optional, for non-compliant forks)
- Certification fees (badges for compliant SDKs)
- Training and conference revenue
- Grants from governments (EU AI Act compliance, US NIST, India DPI)

### 8.3 RTMN In-Kind Contribution

RTMN Digital commits to contribute for 3 years:

- **NACP source code** (Apache 2.0) — current 62 services, SDKs, MCP server
- **Founding staff** (5 FTE for Year 1): Executive Director, CTO, Head of Security, DevRel Lead, Legal Counsel
- **Brand assets** — Nexha logos, wordmark, trademarks (transferred to Foundation)
- **Initial treasury** — $500K cash for legal/setup costs

After Year 3, RTMN is treated as any other member.

## 9. Neutrality Safeguards

To ensure GNF cannot be captured by RTMN or any single member:

1. **RTMN cannot hold more than 15% of Board seats** (max 1 of 9 if RTMN is Platinum, or 0 if not)
2. **Independent Chair must not be affiliated with any member company**
3. **Trademarks and source code transferred to Foundation** before Year 1 ends
4. **Annual third-party audit** (KPMG, EY, Deloitte)
5. **Public meeting minutes** for all council and board meetings
6. **Open financial books** — annual report published
7. **Member voting power capped** — no single member can hold >25% of total votes

## 10. Initial Steerco (Pre-Foundation)

Until the Foundation is formally incorporated (target: Q4 2026), an Initial Steerco manages the transition:

**Members:**
- RTMN Digital (founder, transferring IP)
- 6 invited Platinum candidates (target: OpenAI, Anthropic, Google, Meta, Shopify, SAP)
- 2 invited Gold candidates (target: Stripe, DHL)

**Responsibilities:**
- Finalize bylaws
- Hire legal counsel (Swiss)
- Open Swiss bank account
- Recruit Executive Director
- Coordinate IP transfer

## 11. Timeline

| Date | Milestone |
|------|-----------|
| **2026-06-29** | Charter drafted (this document) |
| **2026-07** | Initial Steerco formation |
| **2026-08** | Open Steerco membership to 8–10 candidates |
| **2026-09** | First in-person Steerco meeting (Zug) |
| **2026-10** | Swiss legal entity formed |
| **2026-11** | Hire Executive Director |
| **2026-12** | Foundation formally launched at Nexha Summit 2026 |
| **2027-Q1** | First Board of Directors elected |
| **2027-Q2** | Technical Council + Security Council + Economic Council operational |
| **2027-Q3** | First major protocol version (NACP v2.0) under Foundation governance |

## 12. How to Get Involved

### For AI Labs (OpenAI, Anthropic, Google, Meta)
- Become a Platinum Founding Member
- Appoint representative to Board
- Contribute to Technical Council and AI-Safety WG

### For Enterprises (SAP, Shopify, Stripe, DHL)
- Become a Gold or Platinum Member
- Appoint representative to Economic Council
- Build or certify NACP-compliant integrations

### For Developers
- Become a Bronze Member (or free Associate)
- Contribute to SDKs, reference implementations, docs
- Participate in working groups

### For Governments
- Join as Associate (free, non-voting)
- Provide regulatory guidance and use case requirements
- Endorse NACP in national AI policy

### Contact
- Email: foundation@nexha.io
- GitHub: github.com/global-nexha-foundation
- Website: nexha.io (coming soon)

---

## Appendix A: Why NACP Should Be a Foundation, Not a Company

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Foundation (recommended)** | Neutral, durable, attracts diverse members | Slow decision-making | ✅ Yes |
| **Open source under RTMN** | Fast | Not neutral, single point of failure | ❌ No |
| **Independent company** | Fast, focused | Single shareholder, can be sold | ❌ No |
| **Standards body (ISO/IEEE)** | Authoritative | Slow, expensive, not agile | ❌ No for v1 |
| **Consortium (Hyperledger-style)** | Industry buy-in | Members can leave | ❌ No |

**Foundations work for this kind of infrastructure:**
- World Wide Web → W3C (1994)
- Linux kernel → Linux Foundation (2000)
- Kubernetes → CNCF (2015)
- HTTP/3 → IETF (open process)
- OAuth → IETF
- Let’s Encrypt → ISRG (foundation)

NACP should join this pattern.

## Appendix B: Comparison to Similar Foundations

| Foundation | Founded | Focus | Members | Budget |
|------------|---------|-------|---------|--------|
| **W3C** | 1994 | Web standards | 450+ | $15M |
| **Linux Foundation** | 2000 | Linux, open source | 2,000+ | $300M |
| **Apache Software Foundation** | 1999 | Apache projects | 8,500+ | $1.5M |
| **CNCF** | 2015 | Cloud native | 700+ | $200M |
| **OpenJS Foundation** | 2019 | JavaScript | 35+ | $7M |
| **Global Nexha Foundation (proposed)** | 2026 | AI commerce | 50+ (Y3) | $20M |

GNW positioned to be among top 10 tech foundations by 2030.

---

*End of Charter. Next: Bylaws (separate document).*