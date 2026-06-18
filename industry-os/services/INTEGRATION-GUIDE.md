# RTMN OS - Complete Integration Guide

## Status: ALL CONNECTED ✅

### Services Running

| Service | Port | Status |
|---------|------|---------|
| **Finance OS** | 4801 | ✅ Complete |
| **Workforce OS | 5065/5077 | ✅ Complete |
| **Talent OS | 5066 | ✅ Complete |
| Learning OS | 5068 | ✅ Complete |
| Org OS | 5072 | ✅ Complete |
| Intelligence | 5073 | ✅ Complete |
| Cross-OS Hub | 5085 | ✅ Complete |

### 24 Industry OS
All configured and connecting to Finance OS.

---

## Finance OS ↔ Workforce OS Integration

### Payroll → Journal Entries
```
Workforce OS: /api/payroll/process/:month
    ↓
Finance OS: POST /api/journal
    ↓
GL Entry: Salary expense + Bank credit
```

### Attendance → Compliance
```
Workforce OS: /api/attendance/:id/process
    ↓
Finance OS: /api/audit/compliance
    ↓
Attendance report: Present/Absent/Overtime
```

### Benefits → Expenses
```
Workforce OS: /api/benefits/enroll
    ↓
Finance OS: /api/expenses
    ↓
Benefits cost tracking
```

---

## Quick Start

### Start Finance OS
```bash
cd industry-os/services/finance-os
npm start
```

### Start Workforce OS
```bash
cd industry-os/services/workforce-os
npm start
```

### Sync Payroll to Finance
```bash
curl -X POST http://localhost:5077/api/payroll/process/2026-06
```

---

## API Reference

### Finance → Industry

| Endpoint | Purpose |
|----------|---------|
| GET /api/industries/health | Check all 24 OS |
| GET /api/industries/dashboard | Unified view |

### Workforce → Finance

| Endpoint | Purpose |
|----------|---------|
| POST /api/payroll/process/:month | Payroll → Journal Entries |
| POST /api/attendance/:id/process | Attendance → Compliance |
| POST /api/benefits/enroll | Benefits → Expenses |

---

## Architecture

```
┌─────────────────┐
│   Finance OS     │
│   (Port 4801)   │
└────────┬────────┘
         │
         ├─→ Journal Entries
         ├─→ Accounts Receivable
         ├─→ Accounts Payable
         └─→ Compliance
              │
         ┌────┴────┐
         │         │
         ▼         ▼
┌─────────┐  ┌─────────┐
│Workforce │  │ 24 Industry │
│    OS    │  │    OS     │
│ (Port 5077)│  │(Ports 5010-5240│
└─────────┘  └──────────┘
```

---

*Integrated June 2026*
