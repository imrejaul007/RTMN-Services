# DEPRECATED: Workforce OS

**Status:** DEPRECATED  
**Date:** June 26, 2026  
**Canonical Replacement:** CorpPerks Backend (port 4006)

---

## Why Deprecated

Workforce OS (5077) is deprecated because it duplicates functionality already available in **CorpPerks**, which is:

1. **More mature** - 69-screen mobile app, 46 AI agents, Indian compliance
2. **Canonical** - CorpPerks is the designated HRMS for all RTMN companies
3. **Connected** - Already integrated with CorpPerks bridges (REZ-merchant, CorpID, etc.)

---

## Migration Guide

### Old: Workforce OS (5077)
```
http://localhost:5077/api/employees
```

### New: CorpPerks Backend (4006)
```
http://localhost:4006/api/employees
```

---

## Feature Comparison

| Feature | Workforce OS | CorpPerks Backend |
|---------|--------------|-------------------|
| Employee CRUD | ✅ | ✅ |
| Departments | ✅ | ✅ |
| Org Chart | ✅ | ✅ |
| Attendance | ✅ | ✅ |
| Leave | ✅ | ✅ |
| Payroll | ❌ | ✅ (Indian compliance) |
| Performance | ❌ | ✅ |
| OKR | ❌ | ✅ |
| LMS | ❌ | ✅ |
| Indian Compliance | ❌ | ✅ PF/ESI/TDS/Gratuity |

---

## Industry OS Integration

Industry OS services that reference Workforce OS should update their integration:

```javascript
// OLD
const workforce = process.env.WORKFORCE_OS_URL || 'http://localhost:5077';

// NEW - Use CorpPerks Backend
const workforce = process.env.CORPPERKS_BACKEND_URL || 'http://localhost:4006';
```

### Files to Update

Industry OS services that need updating:

- `restaurant-os/src/industry-integration.js`
- `hotel-os/src/industry-integration.js`
- `healthcare-os/src/industry-integration.js`
- `retail-os/src/industry-integration.js`
- `beauty-os/src/industry-integration.js`
- `fitness-os/src/industry-integration.js`
- `fashion-os/src/industry-integration.js`
- `manufacturing-os/src/industry-integration.js`
- `entertainment-os/src/industry-integration.js`
- `revenue-intelligence-os/src/industry-integration.js`

---

## Deprecation Timeline

| Date | Action |
|------|--------|
| June 26, 2026 | Deprecated - marked for removal |
| July 26, 2026 | Remove from Industry OS integrations |
| August 26, 2026 | Remove service entirely |

---

## Questions

For questions about this deprecation, contact the RTMN architecture team.

---
