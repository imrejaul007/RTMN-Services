# RFQ Automation — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P0 | **Build:** ₹30L / 5 weeks | **ARR:** ₹2.0Cr

---

## 1. Concept & Vision

AI-powered RFQ automation platform enabling buyers to request quotes from multiple vendors, compare offers, and negotiate automatically.

---

## 2. Core Features

### 2.1 RFQ Creation (P0)
- Multi-item RFQ
- Spec upload
- Quantity & timeline
- Vendor selection

### 2.2 Smart Vendor Matching (P0)
```python
def match_vendors(rfq):
    requirements = extract_requirements(rfq)
    candidates = find_vendors(requirements)
    scored = rank_vendors(candidates, requirements)
    return scored[:rfq.max_vendors]
```

### 2.3 Quote Collection (P0)
- Automated quote requests
- Quote comparison matrix
- Price breakdown
- Timeline comparison

### 2.4 Negotiation Engine (P1)
- Counter-offer management
- Best-price negotiation
- Terms optimization

---

## 3. API Endpoints

```
POST /api/rfqs
GET  /api/rfqs/:id
POST /api/rfqs/:id/quotes
GET  /api/quotes/:id/compare
POST /api/negotiations/:id/counter
```

---

*Spec created: June 28, 2026*
