# Contract Intelligence — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P0 | **Build:** ₹30L / 5 weeks | **ARR:** ₹2.5Cr

---

## 1. Concept & Vision

AI-powered contract analysis extracting key clauses, identifying risks, comparing versions, automating review workflows.

---

## 2. Core Features

### 2.1 Clause Extraction (P0)
- Auto-extract key clauses
- Clause classification
- Risk scoring

### 2.2 Risk Identification (P0)
- Unfavorable terms
- Missing protections
- Pricing risks
- Termination flags

### 2.3 Version Comparison (P0)
- Side-by-side diff
- Change highlighting
- Negotiation tracking

### 2.4 Template Library (P1)
- Standard contracts
- Industry templates
- Custom templates

---

## 3. API Endpoints

```
POST /api/contracts/analyze
GET  /api/contracts/:id/risks
POST /api/contracts/:id/compare
GET  /api/templates
```

---

*Spec created: June 28, 2026*
