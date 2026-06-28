# Doctor Copilot Specification
## AI Assistant for Doctors (Within RisaCare)

**Version:** 1.0 | **Date:** June 28, 2026
**Status:** 🔴 CONCEPT | **Priority:** P1
**Parent:** RisaCare (companies/RisaCare/)

---

## WHAT IS DOCTOR COPILOT

AI assistant that helps doctors with:
- Clinical note taking
- Diagnosis suggestions
- Prescription writing
- Lab order recommendations
- Follow-up scheduling
- Patient communication

---

## FEATURES

### 1. Clinical Documentation

**Voice-to-text clinical notes**
- Ambient listening during consultation
- Auto-structured SOAP notes
- ICD-10 code suggestions
- Custom templates per specialty

### 2. Diagnosis Assistant

**AI-powered diagnosis support**
- Symptom analysis
- Differential diagnosis list
- Confidence scoring
- Red flag detection
- Referral suggestions

### 3. Prescription Writer

**Smart prescription generation**
- Drug suggestions based on diagnosis
- Dosage calculator
- Interaction checker
- Allergy alerts
- Pharmacy integration

### 4. Lab Orders

**Intelligent lab recommendations**
- Evidence-based test suggestions
- Cost-effective alternatives
- Rush order flagging
- Lab result interpretation

### 5. Follow-up Automation

**Patient engagement**
- Auto-schedule follow-ups
- SMS/WhatsApp reminders
- Patient instructions
- Recovery timeline

---

## MODULES

| Module | Description |
|--------|-------------|
| `clinical-notes` | Voice-to-SOAP transcription |
| `diagnosis-ai` | ML-powered diagnosis suggestions |
| `prescription-writer` | Smart Rx generation |
| `lab-advisor` | Evidence-based test recs |
| `followup-automation` | Patient engagement |

---

## INTEGRATIONS

- RisaCare EMR (existing)
- Pharmacy network
- Lab network
- CorpID (doctor auth)
- MemoryOS (patient history)

---

## PRICING

| Tier | Price | Includes |
|------|-------|----------|
| Starter | ₹999/mo | Clinical notes, basic suggestions |
| Pro | ₹2,999/mo | + Diagnosis AI, prescriptions |
| Enterprise | ₹9,999/mo | + Lab advisor, full EMR |

---

## TIMELINE

| Phase | Weeks | Deliverable |
|-------|-------|-------------|
| 1 | 2 | Clinical notes (voice-to-SOAP) |
| 2 | 2 | Diagnosis suggestions |
| 3 | 2 | Prescription writer |
| 4 | 1 | Lab advisor |
| 5 | 1 | Follow-up automation |

**Total: 8 weeks**

---

*Status: 🔴 CONCEPT — Add to RisaCare*
*Location: companies/RisaCare/doctor-copilot/*
