# Telemedicine Platform — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P0 | **Build:** ₹45L / 8 weeks | **ARR:** ₹3.5Cr

---

## 1. Concept & Vision

End-to-end telemedicine platform connecting patients with doctors via video consults, with AI-powered triage, prescription management, and follow-up automation.

---

## 2. Core Features

### 2.1 Video Consultation (P0)
- HD video calls (WebRTC)
- Screen sharing for reports
- In-call chat
- Call recording (with consent)
- Waiting room management

### 2.2 AI Triage (P0)
```python
def triage(symptoms):
    urgency = ml_model.predict_urgency(symptoms)
    specialty = ml_model.predict_specialty(symptoms)
    return {
        'urgency': urgency,
        'specialty': specialty,
        'wait_time': calculate_wait_time(urgency)
    }
```

### 2.3 Prescription Management (P0)
- Digital prescriptions (e-signature)
- Pharmacy integration
- Refill requests
- Drug interaction checking

### 2.4 Follow-up Automation (P1)
- Scheduled follow-ups
- Symptom check-ins
- Medication reminders

---

## 3. API Endpoints

```
POST /api/consultations/schedule
POST /api/consultations/:id/start
POST /api/consultations/:id/prescribe
GET  /api/consultations/:id/prescription
POST /api/triage/assess
GET  /api/doctors/search
```

---

*Spec created: June 28, 2026*
