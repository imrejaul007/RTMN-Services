# ReputationOS Mathematics

**Document Version:** 1.0
**Last Updated:** June 27, 2026
**Status:** Canonical Reference

---

## Overview

This document defines the complete mathematical framework for the Autonomous Commerce Index (ACI) - the reputation system for Global Nexha.

---

## Core Formula: Autonomous Commerce Index (ACI)

```
ACI = Base × Trust + Volume × Delivery + Quality × Reliability + Financial × Stability + Response × Engagement + Compliance × Adherence + ESG × Responsibility + Innovation × Growth

ACI = (Base × 0.20) + (Volume × 0.20) + (Quality × 0.15) + (Financial × 0.15) + (Response × 0.10) + (Compliance × 0.10) + (ESG × 0.05) + (Innovation × 0.05)
```

### Component Definitions

| Component | Weight | Description |
|-----------|--------|-------------|
| **Trust** | 0.20 | Historical reliability and honesty |
| **Delivery** | 0.20 | On-time delivery performance |
| **Quality** | 0.15 | Product/service quality ratings |
| **Financial** | 0.15 | Financial stability and payment history |
| **Response** | 0.10 | Communication responsiveness |
| **Compliance** | 0.10 | Regulatory and policy adherence |
| **ESG** | 0.05 | Environmental, Social, Governance |
| **Innovation** | 0.05 | Innovation and improvement |

---

## Component Formulas

### 1. Trust Score (T)

```
T = (1 - D) × BaseTrust × DecayFactor × (1 + Bonuses) × (1 - Penalties)

Where:
- D = daysSinceLastActivity / 365
- BaseTrust = 50 (initial)
- DecayFactor = e^(-λ × D), λ = 0.1
```

### 2. Delivery Score (D)

```
D = (OnTimeDeliveries / TotalDeliveries) × 100 × RecencyWeight

RecencyWeight = 1 / (1 + e^(-k × (DaysSince - Midpoint)))
Where k = 0.1, Midpoint = 30
```

### 3. Quality Score (Q)

```
Q = (WeightedSum of Ratings) / TotalRatings × QualityFactors

QualityFactors = 1 + (RecentQuality - AverageQuality) / 100

Where RecentQuality = ratings from last 30 days
      AverageQuality = all-time average
```

### 4. Financial Score (F)

```
F = PaymentScore × 0.6 + CreditScore × 0.3 + TransactionVolume × 0.1

PaymentScore = (OnTimePayments / TotalPayments) × 100
CreditScore = max(0, min(100, CreditLimitUsage × 100))
TransactionVolume = log10(TotalTransactionValue + 1) × 10
```

### 5. Response Score (R)

```
R = (ResponseRate × 0.5) + (AvgResponseTimeScore × 0.3) + (ResolutionRate × 0.2)

ResponseRate = (Responses / Queries) × 100
AvgResponseTimeScore = max(0, 100 - (AvgResponseHours × 2))
ResolutionRate = (Resolved / TotalQueries) × 100
```

### 6. Compliance Score (C)

```
C = (PolicyAdherence × 0.4) + (AuditScore × 0.3) + (ViolationPenalty × 0.3)

PolicyAdherence = ((PoliciesFollowed - PoliciesViolated) / PoliciesApplicable) × 100
AuditScore = 100 - (MinorViolations × 5) - (MajorViolations × 20) - (CriticalViolations × 50)
ViolationPenalty = e^(-TotalViolations / 10) × 100
```

### 7. ESG Score (E)

```
E = EnvironmentalScore × 0.4 + SocialScore × 0.3 + GovernanceScore × 0.3

EnvironmentalScore = 100 - (CarbonFootprint / MaxCarbon × 50)
SocialScore = 100 - (LaborIssues / TotalEmployees × 30)
GovernanceScore = Based on board diversity, transparency, ethics
```

### 8. Innovation Score (I)

```
I = (ImprovementRate × 0.4) + (NewCapabilities × 0.3) + (ProcessEfficiency × 0.3)

ImprovementRate = (CurrentPerformance - PreviousPerformance) / PreviousPerformance × 100
NewCapabilities = Number of new capabilities added × 10
ProcessEfficiency = (OldProcessTime - NewProcessTime) / OldProcessTime × 100
```

---

## Decay Functions

### Trust Decay

```
TrustDecay(t) = Trust0 × e^(-λ × t)

Where:
- Trust0 = Initial trust at t=0
- λ = 0.001 per day
- t = days since last verified transaction
```

### Activity Decay

```
ActivityDecay(t) = max(0, BaseScore - (t × DecayRate))

Where:
- BaseScore = 100
- DecayRate = 0.5 per day of inactivity
- Minimum score = 20
```

### Recency Weighting

```
RecencyWeight = 1 / (1 + e^(-k × (CurrentDate - EventDate - Midpoint)))

Where:
- k = 0.1 (steepness)
- Midpoint = 90 days
```

---

## Penalty Functions

### Fraud Penalty

```
FraudPenalty = -50 × SeverityFactor × RecencyMultiplier

SeverityFactor = 1 (minor), 2 (major), 5 (critical)
RecencyMultiplier = e^(-t/30) (less severe over time)
```

### Dispute Penalty

```
DisputePenalty = -10 × (DisputeRate × 0.5 + LostDisputeRate × 0.5)

Where:
- DisputeRate = Disputes / Transactions
- LostDisputeRate = LostDisputes / ResolvedDisputes
```

### Late Payment Penalty

```
LatePaymentPenalty = -5 × (PaymentDelayDays / 30)

Capped at -25 points per incident
```

---

## Boost Functions

### Newcomer Boost

```
NewcomerBoost = min(10, AccountAgeDays × 0.1)

Applied for first 180 days
```

### Quality Excellence Boost

```
QualityBoost = +5 if QualityScore > 95
QualityBoost = +3 if QualityScore > 90
QualityBoost = +1 if QualityScore > 85
```

### Consistency Boost

```
ConsistencyBoost = +5 if NoIncidents for 90+ consecutive days
ConsistencyBoost = +10 if NoIncidents for 180+ consecutive days
```

### Peer Validation Boost

```
PeerValidationBoost = +2 per validated peer endorsement
Maximum: +20
```

---

## Industry Adjustment Factors

```
IndustryACI = RawACI × IndustryMultiplier

Industry Multipliers:
- Healthcare: 1.1 (higher trust requirements)
- Financial: 1.15 (strictest requirements)
- Food Service: 1.05 (safety-sensitive)
- Technology: 1.0 (standard)
- Manufacturing: 0.95 (physical products, longer cycles)
```

---

## Score Ranges & Badges

| Score Range | Badge | Label | Benefits |
|------------|-------|-------|----------|
| 90-100 | 🏆 Platinum | Elite | 2x discovery boost, 50% fee reduction |
| 80-89 | ⭐ Gold | Premium | 1.5x discovery, 25% fee reduction |
| 70-79 | 🥈 Silver | Trusted | Standard discovery, 10% fee reduction |
| 50-69 | 🥉 Bronze | Verified | Standard discovery |
| 30-49 | ⚙️ Iron | Basic | Limited discovery |
| 0-29 | ⚠️ Restricted | New/Unverified | Heavy restrictions |

---

## Example Calculations

### Example 1: Established Supplier

```
Trust = 85 (on-time history)
Delivery = 92 (98% on-time delivery)
Quality = 88 (4.4/5.0 average)
Financial = 90 (excellent payment history)
Response = 95 (2h average response)
Compliance = 92 (clean audits)
ESG = 75 (mid-tier)
Innovation = 80 (regular improvements)

ACI = (85 × 0.20) + (92 × 0.20) + (88 × 0.15) + (90 × 0.15) + (95 × 0.10) + (92 × 0.10) + (75 × 0.05) + (80 × 0.05)

ACI = 17 + 18.4 + 13.2 + 13.5 + 9.5 + 9.2 + 3.75 + 4

ACI = 88.55 ≈ Gold Badge
```

### Example 2: New Supplier (with boost)

```
Trust = 55 (limited history)
Delivery = 70 (90% on-time)
Quality = 75 (3.8/5.0 average)
Financial = 60 (limited history)
Response = 80 (excellent)
Compliance = 85 (compliant)
ESG = N/A
Innovation = N/A

RawACI = (55 × 0.20) + (70 × 0.20) + (75 × 0.15) + (60 × 0.15) + (80 × 0.10) + (85 × 0.10)
       + (50 × 0.05) + (50 × 0.05)

RawACI = 11 + 14 + 11.25 + 9 + 8 + 8.5 + 2.5 + 2.5 = 66.75

NewcomerBoost = 5 (30 days old)
FinalACI = 66.75 + 5 = 71.75 ≈ Silver Badge
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | June 27, 2026 | Initial canonical version |

---

*This document is the authoritative reference for ACI calculations.*
