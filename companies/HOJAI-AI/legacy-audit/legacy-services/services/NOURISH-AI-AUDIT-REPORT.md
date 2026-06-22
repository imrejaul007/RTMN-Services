# Nourish AI vs RisaCare Audit Report

**Last Updated:** June 2026
**Version:** 1.0.0

---

## Executive Summary

| Category | Status | Gap |
|----------|--------|-----|
| Medication Records | ✅ IMPLEMENTED | - |
| Care Insights | ✅ IMPLEMENTED | - |
| Explainable AI | ✅ IMPLEMENTED | - |
| Care Plans | ❌ NOT IMPLEMENTED | Missing |
| Daily Notes | ⚠️ PARTIAL | Need dedicated service |
| Assessments | ⚠️ PARTIAL | Only symptoms, not formal |
| Incident Reports | ❌ NOT IMPLEMENTED | Missing |
| Shift Handovers | ❌ NOT IMPLEMENTED | Missing |
| Risk Detection | ⚠️ PARTIAL | Only biomarker, no falls/wounds |
| Operational Intelligence | ⚠️ PARTIAL | No staffing/capacity |
| Responsible AI | ⚠️ PARTIAL | Need AI Safety Charter |

---

## Feature Comparison Matrix

| Feature | Nourish AI | RisaCare | Status | Gap |
|---------|------------|----------|--------|-----|
| **Care Plans** | ✅ Care plans | ❌ | **MISSING** | Need service |
| **Daily Notes** | ✅ Notes | ⚠️ Timeline events | **PARTIAL** | Need notes service |
| **Assessments** | ✅ Formal | ⚠️ Symptoms only | **PARTIAL** | Need formal assessments |
| **Medication Records** | ✅ | ✅ | **DONE** | - |
| **Incident Reports** | ✅ | ❌ | **MISSING** | Need service |
| **Shift Handovers** | ✅ | ❌ | **MISSING** | Need service |
| **Risk Detection** | ✅ Falls/Wounds | ⚠️ Biomarker | **PARTIAL** | Need fall/wound |
| **Care Insights** | ✅ Analytics | ✅ Health Score | **DONE** | - |
| **Operational Intel** | ✅ Staffing | ⚠️ Partial | **PARTIAL** | Need staffing |
| **Explainable AI** | ✅ | ✅ | **DONE** | - |
| **Responsible AI** | ✅ Charter | ⚠️ Docs only | **PARTIAL** | Need charter |

---

## Critical Gaps

### 1. Care Plans Service (HIGH PRIORITY)
**What Nourish Has:** Structured care plans with goals, interventions, reviews
**RisaCare Gap:** No care plan management
**Build:** `/hojai-ai/services/care-plan-service`

### 2. Incident Management Service (HIGH PRIORITY)
**What Nourish Has:** Incident logging, safeguarding, investigation
**RisaCare Gap:** No incident reports
**Build:** `/hojai-ai/services/incident-management-service`

### 3. Shift Handover Service (MEDIUM PRIORITY)
**What Nourish Has:** Shift notes, handover reports, continuity
**RisaCare Gap:** No shift communication
**Build:** `/hojai-ai/services/shift-handover-service`

### 4. Fall & Wound Risk Detection (HIGH PRIORITY)
**What Nourish Has:** Falls risk, wound deterioration, safeguarding
**RisaCare Gap:** Only biomarker risk, no falls/wounds
**Build:** `/hojai-ai/services/risk-detection-service`

### 5. Formal Assessment Service (MEDIUM PRIORITY)
**What Nourish Has:** MUST, Braden scale, formal assessments
**RisaCare Gap:** Only symptom assessment
**Build:** `/hojai-ai/services/assessment-service`

### 6. AI Safety Charter (HIGH PRIORITY)
**What Nourish Has:** Public AI principles, governance board
**RisaCare Gap:** Embedded docs, no public charter
**Build:** `/hojai-ai/docs/AI-SAFETY-CHARTER.md`

---

## Implemented Features (Stay as-is)

### ✅ Medication Records
- Location: `RisaCare/risa-care-medication-service`
- Features: Tracking, reminders, adherence, refill

### ✅ Care Insights (Health Score)
- Location: `RisaCare/risa-care-wellness-service`
- Components: Preventive, activity, lifestyle, biomarkers, engagement

### ✅ Explainable AI
- Location: `RisaCare/docs/HEALTH-AI.md`
- Features: Confidence levels, disclaimers, uncertainty indicators

### ✅ Responsible AI Foundation
- Location: `hojai-ai/packages/hojai-hitl` (Human-in-the-loop)
- Location: `hojai-ai/packages/hojai-trust` (Trust & Safety)
- Location: `hojai-ai/packages/hojai-governance` (Policy)

---

## Architecture Comparison

### Nourish AI Architecture
```
Care Records → Data Platform → AI Intelligence Layer
                                       ↓
              Risk Prediction | Recommendations | Alerts | Insights
                                       ↓
                                  Care Teams
```

### RisaCare Current Architecture
```
Health Vault → Intelligence Layer → AI Agents
                                       ↓
              Prediction | Memory | Journey | Resolution
                                       ↓
                    User + Doctor + Family + Agent
```

### RisaCare Target Architecture (After Fixes)
```
Care Records + Care Plans + Incidents + Shift Notes
                    ↓
           Unified Health Data Platform
                    ↓
        AI Intelligence Layer + Risk Detection
                    ↓
         Predictions | Recommendations | Alerts
                    ↓
         Care Team + User + Family + Agent
```

---

## Strategic Position

| Area | Nourish AI | RisaCare |
|------|------------|----------|
| Care Home Software | **Strong** | Weak |
| Social Care Intel | **Strong** | Weak |
| Consumer Health OS | Weak | **Strong** |
| Family Health Graph | Weak | **Strong** |
| Health Vault | Moderate | **Strong** |
| AI Memory | Weak | **Strong** |
| Healthcare Marketplace | Weak | **Strong** |
| Preventive Wellness | Moderate | **Strong** |

**RisaCare wins on consumer/family; Nourish wins on care home operations.**

---

## Recommended Actions

### Phase 1: Critical (Build Now)
1. **Care Plan Service** - Core care management
2. **Incident Management** - Safety/safeguarding
3. **Risk Detection** - Falls/wounds/deterioration

### Phase 2: Important (Build Next)
4. **Shift Handover** - Care continuity
5. **Assessment Templates** - Formal assessments
6. **AI Safety Charter** - Public governance

### Phase 3: Enhancement
7. **Operational Dashboard** - Staffing/capacity
8. **Quality Metrics** - Care quality scores

---

## Key Lesson from Nourish

> "Build the operating system first. Build the intelligence layer second. Build AI on top of real workflow data."

**RisaCare needs the care workflow infrastructure (plans, incidents, shifts) before AI can provide deep intelligence.**
