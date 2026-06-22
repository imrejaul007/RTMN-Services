---
name: RN-011 MAINTENANCE_SAFE_AREA
description: Maintenance/ForceUpdate full-screen overlays in _layout.tsx missing SafeAreaView
type: bug
severity: MEDIUM
domain: React Native / UI
status: FIXED
fixed_date: 2026-04-19
fix_summary: Wrapped MaintenanceScreen and ForceUpdateScreen return View elements with SafeAreaView from react-native-safe-area-context. MaintenanceScreen, ForceUpdateScreen, and their overlay containers now respect safe area insets.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-011 — Maintenance Screen Missing SafeAreaView

### Status: OPEN | Severity: MEDIUM | Domain: React Native / UI

---

### Summary

Maintenance mode and force-update full-screen overlays in `app/_layout.tsx` render without `SafeAreaView`. On notched devices, critical messaging (maintenance notice, force-update prompt) is partially hidden under the notch.

### Files Affected

- `app/_layout.tsx:217-244`

### Fix

Wrap the overlay in `SafeAreaView`:

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

// Inside the maintenance/force-update render:
<Modal visible={showMaintenance || showForceUpdate}>
  <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    {/* overlay content — fully visible on all devices */}
  </SafeAreaView>
</Modal>
```

### Test Plan

1. Trigger maintenance mode on iPhone 14 Pro
2. Before fix: maintenance message partially hidden under notch
3. After fix: full message visible
