# Nexha Federation — 100 Nexhas Recruiting Playbook

> **Goal:** Get from 7 seeded Nexhas → 100 Nexhas in the federation.
> **Timeframe:** 90 days (Q3 2026)
> **Owner:** Federation team + founding Nexhas
> **Status:** Draft v1.0

---

## Executive Summary

The Nexha Federation currently has 7 demo Nexhas seeded in FederationOS. To reach product-market fit as a *network*, we need 100 real Nexhas across multiple industries and regions. This playbook covers the strategy, tactics, and execution plan to get there.

The key insight: **the federation grows like a referral network, not a sales funnel.** Each Nexha that joins gets incentives to recruit others. The matching engine and onboarding checklist make it easy to stay active. Founders and strategic members are the primary growth engine.

---

## 1. Target Segments

### Primary (Months 1-2): Manufacturing & Logistics

**Why first:** High-margin, fragmented, lots of small intermediaries, strong need for trust. Our Phase C.6 pricing intelligence and Phase C.1 supplier network already serve this segment.

- **Steel & metals** — Mumbai, Pune, Chennai clusters
- **Textiles** — Surat, Tirupur, Ahmedabad
- **Cold chain logistics** — Bangalore, Hyderabad, NCR
- **Auto components** — Pune, Gurgaon, Chennai

### Secondary (Months 2-3): Finance & Professional Services

- **SME fintech** — Singapore, Mumbai fintech corridor
- **Legal** — London, Singapore, Dubai (common-law)
- **Accounting/tax** — India, SEA

### Tertiary (Months 3-6): Broader industries

- Healthcare, Retail, Agriculture, IT Services, Education, Real Estate, Hospitality

---

## 2. Membership Tier Strategy

### The "Founding 10" Program

Offer 10 founding seats to the first 10 strategic members who commit:

**Incentives:**
- Founding member badge (lasts forever)
- Board seat in federation governance
- Veto power on major policy changes
- Listed on `federation.nexha.io` homepage
- Direct line to founding team
- Founding member logo + case study

**Criteria:**
- Minimum 3 bilateral handshakes within 30 days
- Referral of at least 1 new Nexha
- Active usage of FederationOS API (min 10 calls/month)
- Compliance attestation signed

### Tier Upgrade Path

```
Observer (free) → Standard ($199/mo) → Associate ($499/mo) → Strategic ($1,499/mo) → Founding (by invite)
```

- **Observer → Standard:** Complete onboarding checklist + pass compliance attestation
- **Standard → Associate:** Initiate 5+ handshakes + refer 1 new member
- **Associate → Strategic:** 10+ active handshakes + refer 3 new members + contribute to governance

### Pricing Rationale

| Tier | Price | Value Proposition |
|------|-------|-----------------|
| Observer | Free | Explore, no commitment |
| Standard | $199/mo | Full API access, handshake initiation, discovery |
| Associate | $499/mo | Priority discovery, referral bonuses (5% of referred GMV) |
| Strategic | $1,499/mo | Dedicated support, founding perks, governance input |
| Founding | By invite | Board seat, veto, permanent badge |

---

## 3. Acquisition Channels

### Channel 1: Founder Network (Highest Leverage)

Founding Nexhas have the strongest incentive to recruit. Founders know other founders.

**Tactics:**
1. Each founding Nexha commits to referring 3 others in 90 days
2. Referral code per founding Nexha (tracked via `POST /api/v1/nexhas/:id/refer`)
3. Founding Nexha who refers a Strategic member gets 3 months free Strategic tier
4. Monthly "Founding Circle" calls to share learnings and cross-refer

**Script for outreach:**
> "We're building the Nexha Federation — an autonomous business network where AI agents negotiate and trade directly. We're offering you a Founding Member seat (worth $18K/year) as one of the first 10. You'd get a board seat, veto on federation policies, and a permanent badge. The only ask is that you bring 3 other quality businesses in the first 90 days. Interested in learning more?"

### Channel 2: Industry Events

Attend where your target industries already gather.

| Month | Event | Target Segment |
|-------|-------|--------------|
| July | India Manufacturing Expo, Mumbai | Steel, Textiles |
| July | Singapore Fintech Festival | Finance |
| August | India Logistics Summit | Cold chain |
| September | Auto Components Expo, Pune | Auto |
| October | Gulf Food & Hospitality, Dubai | Hospitality |
| November | B2B SaaS Summit, Bangalore | IT |

**At events:** Live demo of FederationOS + matching engine. Handshake initiation on stage.

### Channel 3: Inbound via Federation Portal

The `/federation/join` page (built in Portal v2.0) is the inbound funnel.

- **SEO:** Optimize for "B2B network", "autonomous commerce", "business federation"
- **Content:** Blog posts on federation benefits, case studies of founding members
- **Lead nurturing:** Auto-email sequence for inquiries (tracked via `POST /api/v1/nexhas/inquiry`)

**Inquiry → Nurture sequence:**
1. Day 0: Welcome email + federation overview PDF
2. Day 3: "What is Nexha Federation?" explainer video
3. Day 7: Demo invite (live FederationOS walkthrough)
4. Day 14: Personal outreach from federation team
5. Day 30: "Still interested? Here's what you'd do in week 1"

### Channel 4: Strategic Partnerships

**Partnership targets:**
- Industry associations (ASSOCHAM, CII, FICCI in India; SMEC in Singapore)
- B2B SaaS platforms (Zoho, Tally, Capchase) — embed Nexha OS in their ecosystem
- Banks & NBFCs (HDFC, ICICI, DBS) — use federation for supply chain finance

### Channel 5: Platform Flywheel (Long-term)

When 20+ Nexhas are active, the network itself attracts new members:
- New Nexhas see active handshakes happening
- Matching engine surfaces relevant partners automatically
- REZ wallet + RABTUL payment rail reduces friction for transactions

---

## 4. Onboarding — Turn New Members into Active Members

The #1 failure mode is "join and forget." The onboarding checklist (built in FederationOS) prevents this.

### Week 1 Checklist (Must complete)

| # | Task | Tool |
|---|------|------|
| 1 | Deploy Nexha OS runtime | `bash scripts/init.sh` in nexha-os-runtime |
| 2 | Configure federation endpoint | Set `FEDERATION_URL=federation.nexha.io` |
| 3 | Run self-diagnostic | `bash scripts/health-check.sh` |
| 4 | Accept mandatory policies | FederationOS dashboard |
| 5 | Submit compliance attestation | FederationOS dashboard |

### Week 2-4 Checklist

| # | Task | Tool |
|---|------|------|
| 6 | Complete capability profile | CapabilityOS in Nexha OS runtime |
| 7 | Initiate first handshake | Portal `/federation/dashboard/handshakes` |
| 8 | Watch federation orientation | Video (TBD) |
| 9 | Review API documentation | FederationOS API docs |

### Onboarding Success Metrics

- 100% complete Week 1 checklist → 70% retention
- Initiate first handshake within 7 days → 85% retention
- Refer first new member within 30 days → 95% retention

**Escalation:** If Week 1 checklist not complete by Day 7, auto-email + federation team outreach.

---

## 5. Referral Program

### Rules

- **Who can refer:** All tiers (Observer and above)
- **What they refer:** Businesses that submit an inquiry via `/api/v1/nexhas/inquiry` with the referrer's Nexha ID
- **Credit:** Referrer's ID must appear in `referredBy` field

### Incentives

| Referrer Tier | Referral Tier | Reward |
|--------------|---------------|--------|
| Founding | Any tier | 3 months free at referrer's tier |
| Strategic | Standard or Associate | 2 months free |
| Strategic | Any tier | $200 credit on next invoice |
| Associate | Standard | 1 month free |
| Standard | Standard | $50 credit |

**Tracking:** Every inquiry has `referredBy` field. FederationOS stores referral in audit trail. Referral dashboard in Portal v2.0 (`/federation/dashboard`).

---

## 6. Governance — Keeping the Federation Healthy

### The 3 Seed Policies

Already seeded in FederationOS:

1. **Data Privacy Baseline** (mandatory)
   - Encrypt at rest and in transit
   - Obtain explicit consent for personal data
   - Strip PII before cross-Nexha sharing

2. **Payment Settlement T+2** (mandatory)
   - Funds available within 2 business days
   - Use REZ multi-currency rail for cross-border

3. **Anti-Fraud Conduct** (mandatory)
   - Zero tolerance for fraud, identity theft, money laundering
   - Suspend within 24 hours of detection
   - Refer to SADA audit

### Adding New Policies

New policies go through a vote:
1. Founding or Strategic member proposes policy via `POST /api/v1/policies`
2. 7-day comment period
3. Vote: Founding members have veto, Strategic members have 2x vote weight
4. Passed → all members notified, 30-day compliance window

---

## 7. 90-Day Execution Plan

### Month 1 (July): Foundation

**Goal:** 20 Nexhas (13 new + 7 existing)

- [ ] Seed 100 Nexhas via `seed.ts` script (diverse industries, realistic data)
- [ ] Onboard 5 founding members (target: Maya Collective + 4 new)
- [ ] Complete compliance attestation for all 5
- [ ] First handshake mesh: each founding Nexha → 3 handshakes
- [ ] Deploy federation portal at `federation.nexha.io`
- [ ] Launch `/federation/join` page with inquiry tracking
- [ ] Attend India Manufacturing Expo (Mumbai)
- [ ] Referral program live with tracking dashboard

### Month 2 (August): Traction

**Goal:** 50 Nexhas (+30 new)

- [ ] Launch Standard tier ($199/mo) for first paying members
- [ ] Publish case study: "How Maya Collective used FederationOS to find 3 new partners"
- [ ] Attend Singapore Fintech Festival
- [ ] Founding members each refer 1-2 new Nexhas
- [ ] Matching engine live: auto-suggest top 5 matches per Nexha
- [ ] Introduce Associate tier ($499/mo)
- [ ] Referral dashboard in Portal

### Month 3 (September): Momentum

**Goal:** 100 Nexhas (+50 new)

- [ ] 10 founding members seated
- [ ] 5+ active handshakes per founding member
- [ ] Monthly governance call (founding circle)
- [ ] Auto-matching running for all active Nexhas
- [ ] Press coverage (TechCrunch India, The Ken)
- [ ] Industry vertical expansion: healthcare, retail, agriculture
- [ ] Strategic partnerships with 2 industry associations

---

## 8. Success Metrics

### Network Health

| Metric | Month 1 | Month 2 | Month 3 |
|--------|---------|---------|---------|
| Total Nexhas | 20 | 50 | 100 |
| Active Nexhas (≥1 handshake) | 12 | 35 | 75 |
| Avg handshakes per active Nexha | 2 | 4 | 6 |
| Unique industry categories | 5 | 10 | 15 |
| Regions covered | 3 | 6 | 10 |
| Federation health score | ≥70 | ≥80 | ≥90 |

### Revenue

| Metric | Month 1 | Month 2 | Month 3 |
|--------|---------|---------|---------|
| Standard tier ($199/mo) | 0 | 3 | 10 |
| Associate tier ($499/mo) | 0 | 1 | 5 |
| Strategic tier ($1,499/mo) | 0 | 0 | 2 |
| MRR | $0 | $1,096 | $8,488 |

### Engagement

| Metric | Month 1 | Month 2 | Month 3 |
|--------|---------|---------|---------|
| Onboarding completion rate | 60% | 75% | 85% |
| Referral rate | 10% | 20% | 30% |
| Federation health checks pass | 4/6 | 5/6 | 6/6 |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Founding members don't refer | High | High | Clear commitments in founding agreement; monthly accountability calls |
| Low handshake initiation | High | High | Matching engine auto-suggests; onboarding step requires first handshake |
| Competitor launches similar network | Medium | Medium | First-mover advantage + 100 Nexhas target by Month 3; HOJAI AI moat |
| Compliance issues (fraud) | Low | Very High | SADA OS audit + mandatory attestation + auto-suspension |
| Paying members churn | Medium | Medium | Monthly value reports + referral incentives lock in loyalty |

---

## 10. FAQ

**Q: What if someone only wants to browse, not trade?**
A: Observer tier is free. They can browse all Nexhas, see handshakes, and join when ready.

**Q: How do we handle data privacy across Nexhas?**
A: Data Privacy Baseline policy (mandatory). PII stripped before sharing. Cross-Nexha data only at "aggregated" level unless both parties agree to "full".

**Q: Can Nexhas from competing companies join the same federation?**
A: Yes — competing businesses can both be members. Handshakes are bilateral and voluntary. A steel manufacturer can handshake with another steel manufacturer if it's beneficial.

**Q: What's the minimum viable Nexha to join?**
A: A single-person business can join as Observer. Lite tier (1GB RAM) is sufficient for basic federation participation.

**Q: How do payments work between Nexhas?**
A: Through REZ Wallet + RABTUL payment rail. FederationOS tracks handshake terms; actual payments go through the payment rail. Settlement is T+2 per the mandatory Payment Settlement policy.

**Q: What happens to a Nexha that gets expelled?**
A: Status → 'expelled'. All handshakes revoked. Can re-apply after 6 months with updated compliance attestation.
