# CorpPerks Audit Report
**Date:** June 26, 2026  
**Auditor:** Claude Code

---

## Executive Summary

CorpPerks is a **full HRMS platform** (not just corporate gifting) with 110+ services, 46 AI agents, and complete Indian compliance. Major overlap with Workforce OS (5077).

---

## CorpPerks Product Inventory

### Web Applications (8)

| App | Purpose |
|-----|---------|
| peopleos | Workforce OS - Core HRMS dashboard (93 pages) |
| talentai | Career Intelligence Platform (48 pages) |
| insight-campus | Student Campus Management (28 pages) |
| client-portal | Client Management Portal |
| admin-dashboard | Tenant Admin Panel |
| super-admin | Platform Super Admin |
| support-portal | Helpdesk |
| corpperks-landing | Marketing Landing Page |

### Mobile Applications (5)

| App | Screens | Purpose |
|-----|---------|---------|
| people | 69 | Employee self-service app (MyTalent) |
| manager-app | 12 | Manager dashboard |
| client-app | 5 | Client portal mobile |
| talentai-app | 13 | Career intelligence mobile |
| insight-app | 5 | Student campus mobile |

### Core Microservices (31)

| Port | Service | Purpose |
|------|---------|---------|
| 4006 | backend | Core HRMS |
| 4700 | api-gateway | Unified API Gateway |
| 4738 | payroll-service | Indian Payroll (PF/ESI/TDS/Gratuity) |
| 4728 | meeting-service | 1:1 Meetings & Feedback |
| 4729 | performance-service | Performance Reviews |
| 4730 | okr-service | OKR Tracking ⚠️ PORT CONFLICT |
| 4731 | workflow-service | Business Process Automation |
| 4732 | onboarding-service | Employee Onboarding |
| 4733 | exit-service | Offboarding |
| 4734 | lms-service | Learning Management System |
| 4750 | ai-agents-service | 6 General AI Agents |
| 4751 | role-ai-agents | 40 Role-Based AI Agents |
| 4810 | face-attendance | Face Recognition |

### AI Agents (46 Total)

**General (6):** Career Coach, Productivity Advisor, Learning Coach, Financial Advisor, Benefits Assistant, HR Assistant

**Role-Based (40):** 10 roles × 4 levels (L1-L4)
- Software: CodeBuddy → DevPro → TechLead → CTO Advisor
- Sales: SalesBuddy → SalesPro → SalesLeader → Revenue Strategist
- Marketing: MarketingBuddy → MarketingPro → MarketingManager → CMO Counselor
- Finance: FinanceBuddy → FinanceAnalyst → FinanceManager → CFO Counselor
- HR: HRBuddy → HRPro → HRManager → CHRO Counselor
- [5 more roles...]

---

## Employee Features Coverage

### HR Features (Complete)

| Category | Coverage |
|----------|----------|
| Recruitment | ✅ Job postings, screening, interview, background verification |
| Onboarding | ✅ Documents, training, equipment, workflows |
| Core HR | ✅ Employee CRUD, org chart, departments |
| Attendance | ✅ Clock in/out, geo-fencing, overtime |
| Leave | ✅ Sick, casual, earned, WFH, holidays |
| Performance | ✅ OKRs, reviews, 360 feedback |
| 1:1 Meetings | ✅ Scheduling, feedback, action items |
| Learning | ✅ LMS, courses, certificates |
| Documents | ✅ Templates, e-signatures |
| Workflows | ✅ Business process automation |

### Indian Compliance

| Compliance | Status |
|------------|--------|
| PF (Provident Fund) | ✅ |
| ESI (Employee State Insurance) | ✅ |
| TDS (Tax Deducted at Source) | ✅ |
| Professional Tax | ✅ |
| Gratuity | ✅ |
| LWF (Labor Welfare Fund) | ✅ |

---

## Critical Issues Found

### 1. Port Conflict

| Port | CorpPerks | HOJAI-AI |
|------|-----------|----------|
| **4730** | OKR Service | Employee Twin |

### 2. Service Duplication

| Industry-OS | CorpPerks | Recommendation |
|-------------|-----------|-----------------|
| Workforce OS (5077) | backend (4006) | Deprecate 5077 |

---

## Integration Points

| Company | Integration |
|---------|-------------|
| RABTUL | Auth, Wallet, Payment, Notifications |
| HOJAI AI | Memory, Agents, Twin-Memory Bridge |
| REZ Merchant | Benefits, GST |
| CorpID | Universal Identity |

---

## Statistics

| Metric | Count |
|--------|-------|
| Web Applications | 8 |
| Mobile Applications | 5 |
| Core Microservices | 31 |
| AI Agents | 46 |
| API Endpoints | ~1,772 |
| Lines of Code | ~415,125 |

---

## Recommendations

1. **Resolve port 4730** - Move CorpPerks OKR to 4749
2. **Deprecate Workforce OS** - Use CorpPerks as canonical
3. **Consolidate** - Merge duplicate workforce intelligence services
4. **Integrate TwinOS** - Connect Employee Twin to CorpPerks HRMS
