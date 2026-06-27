# Patient Health Twin — Product Specification

**Version:** 1.0  
**Date:** June 28, 2026  
**Product:** P1 (Phase 3)  
**Estimated Build:** ₹50L / 8 weeks  
**ARR Potential:** ₹3.0Cr

---

## 1. Concept & Vision

A comprehensive AI-powered health profile connecting patients to all healthcare touchpoints — clinics, hospitals, pharmacies, labs, insurance, and emergency services.

**Core Value:**
- Unifies medical records, prescriptions, lab reports, health metrics
- Real-time health scoring with predictive alerts
- Seamless provider, pharmacy, insurer connections
- Personalized AI health recommendations

---

## 2. Problem Statement

- 30% diagnostic tests are duplicates (fragmented records)
- 40% chronic patients miss medication doses
- 45 min avg emergency care delays (missing history)
- 25% hospital readmissions are preventable

---

## 3. Product Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PATIENT HEALTH TWIN                          │
├─────────────────────────────────────────────────────────────────┤
│  DATA LAYER: EMR │ Lab Results │ Pharmacy │ Insurance │ Wearables │
│                          ↓                                        │
│  TWIN CORE: Medical Profile │ Health Score │ Predictive │ Care    │
│                          ↓                                        │
│  AI LAYER: Symptom Checker │ Medication Advisor │ Health Coach │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Core Features

### 4.1 Medical Profile (P0)
- Demographics: Name, DOB, blood type, allergies, emergency contacts
- Medical History: Conditions, surgeries, hospitalizations
- Family History: Hereditary conditions
- Vital Signs: BP, heart rate, temperature, weight, glucose, O2

### 4.2 Health Score Engine (P0)

```
Overall Score = f(vitals, conditions, labs, lifestyle, preventive)
├── Vital Signs (25%): BP trend, HR, weight, sleep
├── Conditions (20%): Control level, adherence, risk
├── Lab Results (25%): Glucose, cholesterol, thyroid
├── Lifestyle (20%): Activity, diet, sleep, stress
└── Preventive (10%): Vaccination, screening, checkups

Range: 0-100
- 90-100: Excellent
- 75-89: Good
- 50-74: Fair
- <50: Needs attention
```

### 4.3 Predictive Alerts (P0)
| Alert | Trigger | Action |
|-------|---------|--------|
| Critical | Abnormal vitals | Immediate + 911 |
| Warning | Trend deviation | Doctor suggestion |
| Reminder | Medication due | Take dose |
| Preventive | Screening due | Book appointment |
| Follow-up | Post-visit | Care plan |

### 4.4 Care Coordination (P1)
- Care Team: All providers in one view
- Care Plans: Shared treatment plans
- Appointments: Unified scheduling
- Prescriptions: Digital management
- Lab Orders: Integrated ordering/results

### 4.5 Emergency Response (P0)
- Emergency Profile: Visible without unlock
- Allergies: Prominent display
- Medications: Current list
- ICE Contact: One-tap call
- Medical Directive: DNR, organ donor

---

## 5. AI Agents

### 5.1 Symptom Checker
- Natural language symptom input
- Clarifying questions
- Possible causes ranked by likelihood
- Next steps: self-care / appointment / ER

### 5.2 Medication Advisor
- Smart reminders (timing optimization)
- Drug interaction checking
- Side effect education
- Refill reminders
- Adherence tracking

### 5.3 Health Coach
- Personalized based on: conditions, labs, wearables, lifestyle
- Diet recommendations
- Exercise plans
- Sleep improvement
- Stress management

### 5.4 Emergency Response
- Triggers: Critical vitals, fall detection, SOS
- Actions: Emergency services, contacts, profile share, first-aid

---

## 6. Data Model

```typescript
interface PatientHealthTwin {
  id: string;
  patientId: string;
  
  demographics: {
    name: string;
    dateOfBirth: Date;
    bloodType: string;
    allergies: Allergy[];
    emergencyContacts: EmergencyContact[];
  };
  
  medicalProfile: {
    conditions: Condition[];
    surgeries: Surgery[];
    immunizations: Immunization[];
  };
  
  vitalSigns: {
    bloodPressure: VitalRecord[];
    heartRate: VitalRecord[];
    temperature: VitalRecord[];
    weight: VitalRecord[];
    bloodGlucose: VitalRecord[];
    oxygenSaturation: VitalRecord[];
  };
  
  healthScore: {
    overall: number;
    vitalsScore: number;
    conditionsScore: number;
    labsScore: number;
    lifestyleScore: number;
    preventiveScore: number;
    lastCalculated: Date;
  };
  
  careTeam: {
    providers: Provider[];
    carePlans: CarePlan[];
  };
}

interface Allergy {
  allergen: string;
  type: 'food' | 'drug' | 'environmental';
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
}

interface Condition {
  name: string;
  icd10Code: string;
  diagnosedDate: Date;
  status: 'active' | 'resolved' | 'chronic';
  severity: 'mild' | 'moderate' | 'severe';
}
```

---

## 7. API Endpoints

### Patient APIs
```
GET/PUT/POST  /api/health-twin/profile
GET/PUT       /api/health-twin/demographics
GET/POST      /api/health-twin/allergies
GET/POST      /api/health-twin/conditions
GET/POST      /api/health-twin/vitals
GET           /api/health-twin/health-score
GET           /api/health-twin/care-team
POST          /api/health-twin/documents
POST          /api/health-twin/wearables/sync
```

### Provider APIs
```
GET           /api/provider/patients
POST          /api/provider/patients/:id/vitals
POST          /api/provider/patients/:id/conditions
POST          /api/provider/patients/:id/prescriptions
POST          /api/provider/patients/:id/care-plans
```

### AI Agent APIs
```
POST          /api/ai/symptoms/check
GET           /api/ai/coach/recommendations
GET           /api/ai/medications/interactions
POST          /api/ai/emergency/assess
```

---

## 8. Integrations

### Healthcare Systems
| System | Standard | Direction |
|--------|----------|-----------|
| Hospital EMR | HL7 FHIR | Bidirectional |
| Lab Systems | HL7/LIS | Inbound |
| Pharmacy | NCPDP | Bidirectional |
| Insurance | JSON APIs | Claims sync |

### Wearables
| Device | Data |
|--------|------|
| Apple Health | Vitals, Activity, Sleep |
| Google Fit | Vitals, Activity, Sleep |
| Samsung/Fitbit/Oura | Various vitals |
| CGM | Blood glucose |

### Government (India)
| System | Purpose |
|--------|---------|
| CoWIN | Vaccination records |
| ABHA | Health account linkage |

---

## 9. Compliance & Security

- **Encryption:** AES-256 at rest, TLS 1.3 in transit
- **HIPAA Compliance:** Full BAA coverage
- **Indian PDPA:** Consent management, data localization
- **Access Control:** Self, Provider, Emergency, Family, Insurance
- **Audit Trail:** Every access logged, patient-accessible

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Patients enrolled | 100K by Y1 |
| Health records per patient | 5 avg |
| Emergency profiles completed | 80% |
| Hospital readmissions | -15% |
| Medication adherence | +25% |
| NPS | 50+ |

---

## 11. Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + TypeScript |
| Database | PostgreSQL + TimescaleDB |
| Cache | Redis |
| AI | TensorFlow + OpenAI |
| Storage | S3 + Glacier |

---

## 12. Team & Timeline

| Role | Count |
|------|-------|
| Tech Lead | 1 |
| Senior Backend | 2 |
| AI/ML Engineer | 2 |
| Mobile Developer | 2 |
| Compliance Officer | 1 |

**Duration:** 8 weeks  
**Investment:** ₹50L

---

## 13. Go-to-Market

### Phase 1: Pilot (Month 1-2)
- 3-5 clinic partners
- 500 patients enrolled

### Phase 2: Expansion (Month 3-4)
- 10 hospitals
- 10,000 patients

### Phase 3: Scale (Month 5-8)
- 50 hospitals
- 100,000 patients
- Insurance partnerships

### Revenue Model
- Per-patient: ₹50-200/month
- Provider portal: ₹2,000-10,000/month
- Insurance: ₹5/lives covered
- API: Usage-based

---

*Spec created: June 28, 2026*
