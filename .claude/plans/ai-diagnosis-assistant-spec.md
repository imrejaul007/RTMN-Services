# AI Diagnosis Assistant — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P1 | **Build:** ₹35L / 6 weeks | **ARR:** ₹2.0Cr

---

## 1. Concept & Vision

AI-powered symptom checker and diagnostic assistant helping patients understand symptoms and guiding to appropriate care, while assisting doctors with differential diagnosis.

---

## 2. Core Features

### 2.1 Symptom Checker (P0)
- Conversational symptom input
- Follow-up questions
- Possible causes ranked by probability
- Urgency assessment
- Recommended actions

### 2.2 Doctor Decision Support (P0)
- Differential diagnosis suggestions
- Rare disease alerts
- Drug interaction warnings
- Similar case retrieval

### 2.3 Health Risk Assessment (P1)
- Chronic disease risk scoring
- Lifestyle recommendations
- Preventive screening reminders

---

## 3. API Endpoints

```
POST /api/symptoms/analyze
GET  /api/symptoms/:id/causes
POST /api/decision-support/diagnosis
GET  /api/risk-assessment/:patientId
```

---

*Spec created: June 28, 2026*
