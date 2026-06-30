# HOJAI AI Products

> **Everything you need to sell Human Intelligence OS**

---

## Quick Start

```bash
cd companies/HOJAI-AI
bash scripts/start-human-intelligence.sh start
```

---

## Product Packages

| Product | Doc | Price | Status |
|---------|-----|-------|---------|
| **EmotionOS** | [EMOTION-OS-PRODUCT.md](EMOTION-OS-PRODUCT.md) | ₹15K/mo | ✅ Ready |
| **Trust Passport** | [TRUST-PASSPORT-PRODUCT.md](TRUST-PASSPORT-PRODUCT.md) | ₹10K/mo | ✅ Ready |
| **Company Emotion** | [COMPANY-EMOTION-PRODUCT.md](COMPANY-EMOTION-PRODUCT.md) | ₹5K/mo | ✅ Ready |
| **AI Employees** | [AI-EMPLOYEES-CATALOG.md](AI-EMPLOYEES-CATALOG.md) | ₹10K/mo | ✅ Ready |

---

## Sales Materials

| Material | Doc | Status |
|----------|-----|--------|
| Pricing & GTM | [PRICING-GTM.md](PRICING-GTM.md) | ✅ Ready |
| Demo Scripts | [DEMO-SCRIPTS.md](DEMO-SCRIPTS.md) | ✅ Ready |
| Launch Checklist | [PRODUCT-LAUNCH-CHECKLIST.md](PRODUCT-LAUNCH-CHECKLIST.md) | ✅ Ready |

---

## Start All Services

```bash
bash scripts/start-human-intelligence.sh start
```

---

## Services Running

| Service | Port | Status |
|---------|------|--------|
| emotion-os-gateway | 4760 | ✅ |
| emotional-memory | 4761 | ✅ |
| empathy-response-engine | 4762 | ✅ |
| emotion-analytics | 4763 | ✅ |
| tone-analysis | 4767 | ✅ |
| communication-dna | 4722 | ✅ |
| habit-engine | 4731 | ✅ |
| burnout-prediction | 4732 | ✅ |
| trigger-intelligence | 4735 | ✅ |
| company-emotion | 4780 | ✅ |
| trust-passport | 4980 | ✅ |
| agent-trust-economy | 4985 | ✅ |
| simulation-os-gateway | 4874 | ✅ |
| sutar-agent-emotional-context | 4850 | ✅ |

---

## SDKs

| SDK | Install |
|-----|---------|
| @hojai/human-intelligence-sdk | `npm i @hojai/human-intelligence-sdk` |
| @hojai/knowledge-sdk | `npm i @hojai/knowledge-sdk` |

---

## Quick API Test

```bash
# Test EmotionOS
curl -X POST http://localhost:4760/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"I am frustrated"}'

# Test Trust Passport
curl -X POST http://localhost:4980/passport \
  -H "Content-Type: application/json" \
  -d '{"entityId":"test","entityType":"merchant","dimensions":{"reliability":95}}'

# Test Company Emotion
curl -X POST http://localhost:4780/company \
  -H "Content-Type: application/json" \
  -d '{"companyId":"test","name":"Test Corp"}'
```

---

## Architecture

```
HOJAI HUMAN INTELLIGENCE
        │
        ├── EmotionOS (4760-4767)
        │       Emotion detection, empathy, tone
        │
        ├── BehaviorOS (4731-4735)
        │       Habits, triggers, burnout
        │
        ├── TrustOS (4980-4985)
        │       Trust passports, economy
        │
        ├── Company Emotion (4780)
        │       Team morale, burnout
        │
        ├── SimulationOS (4874)
        │       What-if, Monte Carlo
        │
        └── Agent Context (4850)
                SUTAR emotional intelligence
```

---

## Contact

| Role | Email |
|------|-------|
| Sales | sales@hojai.ai |
| Support | support@hojai.ai |
| Demo | calendly.com/hojai |

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| June 30, 2026 | 1.0.0 | Initial launch |
