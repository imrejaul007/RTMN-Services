# MyTalent Pro — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P2 (Phase 1) | **Build:** ₹15L / 5 weeks | **ARR:** ₹0.6Cr

---

## 1. Concept & Vision

**What it is:** A mobile-first employee experience app connecting to Workforce OS and CorpPerks — empowering employees with self-service, AI assistance, and a personalized work assistant.

**What it does:**
- Employee self-service (leave, attendance, payslips)
- Genie AI assistant for work queries
- Personalized dashboard with relevant updates
- Attendance and time tracking
- Company announcements and recognition

---

## 2. Problem Statement

- Employees waste 30% time on HR paperwork
- Manual leave/attendance requests cause delays
- Employees lack quick access to policies
- No mobile-first employee experience
- Disconnected employee journey

---

## 3. Product Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MYTALENT PRO                                  │
├─────────────────────────────────────────────────────────────────┤
│  MOBILE APP                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Dashboard│ │ Leave   │ │ Payslip │ │ Genie   │           │
│  │ Home     │ │ Manager │ │ View    │ │ Assistant│           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    CORE SERVICES                           │   │
│  │  Self-Service │ Attendance │ Documents │ Notifications     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    BACKEND CONNECTIONS                    │   │
│  │  Workforce OS │ CorpPerks │ CorpID │ REZ Wallet           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Core Features

### 4.1 Employee Dashboard (P0)

**Home Screen Widgets:**
| Widget | Data | Refresh |
|--------|------|---------|
| Quick Actions | Leave request, Attendance, Profile | Real-time |
| Today's Summary | Pending approvals, Meetings | Daily |
| Announcements | Company news, Polls | On-load |
| Recognition | Kudos, Badges | Weekly |
| Benefits | Remaining leaves, Claims | Monthly |

### 4.2 Leave Management (P0)

**Features:**
- View leave balance (EL, CL, SL, etc.)
- Apply for leave (single, multiple days, half day)
- Leave calendar with team availability
- Approval status tracking
- Cancel/withdraw requests
- Leave history

**Leave Types:**
- Earned Leave (EL)
- Casual Leave (CL)
- Sick Leave (SL)
- Maternity/Paternity Leave
- Compensatory Off
- Work From Home

### 4.3 Attendance (P0)

**Features:**
- Check-in/Check-out
- Location-based attendance (GPS)
- Photo verification
- Work from home toggle
- Attendance calendar
- Regularization requests
- Monthly attendance summary

**Time Tracking:**
- Shift-based schedules
- Overtime tracking
- Break time management
- Attendance reports

### 4.4 Payslip & Compensation (P0)

**Features:**
- Current month payslip
- Payslip history
- Salary breakdown (CTC, deductions, net)
- Tax declaration summary
- Form 16 download
- Reimbursement tracking

### 4.5 Genie AI Assistant (P0)

**Capabilities:**
- HR policy questions
- Leave application help
- Document requests
- IT support queries
- Company directory lookup
- Meeting scheduling

**Sample Interactions:**
- "Apply 2 days sick leave for tomorrow"
- "What's my leave balance?"
- "Who is my reporting manager?"
- "I need a salary certificate"

### 4.6 Profile & Settings (P1)

- View/edit profile
- Emergency contact update
- Bank account details
- Tax declaration
- Communication preferences
- App theme (light/dark)

### 4.7 Announcements & Feed (P1)

- Company announcements
- Policy updates
- Event notifications
- Birthday/work anniversary wishes
- Recognition posts

---

## 5. Screens

### 5.1 Home Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  MyTalent Pro                        [🔔 3]  [⚙️]           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Good Morning, Rahul! 👋                                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Today, June 28                                        │  │
│  │ 📍 Office | 9:00 AM - 6:00 PM                        │  │
│  │ ✓ Checked In at 8:55 AM                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Quick Actions                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  📝    │ │  📊    │ │  💰    │ │  👤    │           │
│  │ Leave  │ │Attend  │ │Payslip │ │Profile  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                                 │
│  Leave Balance                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ EL: 18 days  │ CL: 6 days  │ SL: 5 days              │  │
│  │ ████████░░  │ ██████░░░░  │ █████░░░░░              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Pending (2)                                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 📝 Leave Request - Pending approval from Manager        │  │
│  │ 📝 Regularization - 2 hrs missing for Jun 25           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 💬 Ask Genie anything about work...                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Leave Application

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Apply Leave                                              [?]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Leave Type *                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Earned Leave (EL)                          ▼           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Duration                                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ○ Full Day    ● Half Day    ○ Multiple Days           │  │
│  │                                                      │  │
│  │ Date: June 28, 2026 (Saturday)                      │  │
│  │ Session: ○ Morning  ● Afternoon                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Reason *                                                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Personal work to attend to...                          │  │
│  │                                                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  📅 Calendar Preview                                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Jun 27 (Fri) - Working day                            │  │
│  │ Jun 28 (Sat) - Week off                               │  │
│  │ Jun 29 (Sun) - Week off                               │  │
│  │ Jun 30 (Mon) - Working day                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Remaining after this: 17.5 days                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Submit Leave Request                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Backend Integration

### 6.1 Connected Services

| Service | Data Flow |
|---------|-----------|
| Workforce OS (5077) | Employee data, Leave, Attendance |
| CorpPerks Backend | Payroll, Payslips, Profile |
| CorpID | Identity, Auth |
| REZ Wallet | Reimbursements, Claims |

### 6.2 API Integration

```typescript
// Leave Management
POST /api/leave/apply
GET  /api/leave/balance
GET  /api/leave/history
POST /api/leave/cancel/:id

// Attendance
POST /api/attendance/check-in
POST /api/attendance/check-out
GET  /api/attendance/history
POST /api/attendance/regularize

// Payslip
GET  /api/payslip/current
GET  /api/payslip/history
GET  /api/payslip/:id/download

// Profile
GET  /api/profile
PUT  /api/profile
GET  /api/profile/emergency-contact
PUT  /api/profile/emergency-contact

// Genie
POST /api/genie/chat
```

---

## 7. Technical Spec

### 7.1 App Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native (Expo) |
| State | Zustand |
| Navigation | React Navigation |
| API Client | Axios + React Query |
| Auth | JWT + Biometrics |
| Push | Firebase Cloud Messaging |
| Analytics | Firebase Analytics |

### 7.2 Features

| Feature | Implementation |
|---------|----------------|
| Offline | AsyncStorage + Background sync |
| Biometrics | Expo LocalAuthentication |
| Camera | Expo Camera |
| Location | Expo Location |
| Maps | React Native Maps |

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| MAU | 80% of employees |
| Leave processing time | -50% |
| Attendance accuracy | 98%+ |
| NPS | 50+ |
| App crash rate | <0.5% |

---

## 9. Go-to-Market

### Phase 1: Pilot (Month 1-2)
- 1 company, 100 employees
- Core features only

### Phase 2: Expansion (Month 2-3)
- 5 companies, 1,000 employees
- Full feature set

### Phase 3: Scale (Month 3-5)
- 20 companies, 10,000 employees
- Enterprise features

### Revenue Model
- Per employee/month: ₹50-150
- Implementation: ₹25,000-100,000

---

*Spec created: June 28, 2026*
