# 📋 PHASE 0: FIX CRITICAL
**Duration:** Week 1
**Goal:** Clean up, fix ports, delete phantoms

---

## 0.1 Delete Phantom Directories

### Commands:
```bash
# Check before deleting
ls companies/razo-keyboard/
ls companies/do-app/
ls REZ-Workspace/industries/genie-os/

# Delete
rm -rf companies/razo-keyboard/
rm -rf companies/do-app/
rm -rf REZ-Workspace/industries/genie-os/

# Commit
git add -A
git commit -m "chore: delete phantom directories"
```

---

## 0.2 Port 4399 Resolution

### Current State:
- Nexha ecosystem-connector → port 4399
- RTMN Hub docs → port 4399
- **CLASH**

### Solution:
Move Nexha ecosystem-connector to port 4380

### Files to Update:
```
companies/Nexha/services/ecosystem-connector/start.sh
companies/Nexha/services/ecosystem-connector/package.json
```

### Change:
```bash
# In start.sh
PORT=4380  # was 4399
```

```json
// In package.json
{
  "scripts": {
    "start": "PORT=4380 node src/index.js"
  }
}
```

---

## 0.3 DO App Port Fix

### Current Ports (DO App expects):
- Genie: 7100 ✅
- CorpID: 7001 → change to 4702
- TwinOS: 7002 → change to 4705
- MemoryOS: 7003 → change to 4703
- SUTAR: 7200 → change to 4140

### File: `companies/do-app/backend/src/config/services.ts`
```typescript
export const SERVICE_URLS = {
  genie: process.env.GENIE_URL || 'http://localhost:7100',
  corpid: process.env.CORPID_URL || 'http://localhost:4702',
  twinos: process.env.TWINOS_URL || 'http://localhost:4705',
  memoryos: process.env.MEMORYOS_URL || 'http://localhost:4703',
  sutar: process.env.SUTAR_URL || 'http://localhost:4140',
};
```

---

## 0.4 Update RTMN Hub Port

### File: `services/rtmn-unified-hub/src/index.ts`
```typescript
const PORT = parseInt(process.env.PORT || '4399', 10);
```

This sets RTMN Hub at 4399 (Nexha now at 4380).

---

## Checklist

- [ ] Delete companies/razo-keyboard/
- [ ] Delete companies/do-app/
- [ ] Delete REZ-Workspace/industries/genie-os/
- [ ] Move Nexha ecosystem-connector to port 4380
- [ ] Fix DO App port mappings
- [ ] Set RTMN Hub to port 4399
- [ ] Commit all changes
