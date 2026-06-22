---
name: SVC-011 SOCKET_SINGLETON_DISCONNECT
description: Dashboard index.tsx was disconnecting the shared socket singleton on unmount, breaking live data on other tabs/screens
type: bug
severity: MEDIUM
domain: Cross-Screen / Socket Service
status: FIXED
owner: unassigned
created: 2026-04-19
---

## Bug: SVC-011 — Socket Singleton Disconnection on Screen Unmount

### Status: FIXED | Severity: MEDIUM | Domain: Cross-Screen / Socket Service

---

### Summary

The dashboard `index.tsx` was calling `socketService.disconnect()` inside its `useEffect` cleanup function. Since `socketService` is a singleton (shared across the entire app), disconnecting it on the dashboard unmount would break socket connections on all other screens that had registered listeners.

### Files Affected

- `app/(dashboard)/index.tsx:115-116`
- `services/socket.ts` (singleton pattern)

### Root Cause

```typescript
// app/(dashboard)/index.tsx — BEFORE FIX:
useEffect(() => {
  setupSocket();
  return () => {
    socketService.disconnect();  // WRONG: disconnects shared singleton
  };
}, []);
```

The `socketService` is a module-level singleton:
```typescript
// services/socket.ts:
class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  static getInstance(): SocketService { ... }
  connect(): Promise<void> { ... }
  disconnect(): void { this.socket?.disconnect(); }  // disconnects shared instance
}
```

When `index.tsx` unmounts (e.g., user navigates away), it disconnects the singleton — any other screen with active listeners loses its socket connection.

### Fix

Only remove event listeners on unmount, do NOT disconnect the singleton:

```typescript
// app/(dashboard)/index.tsx — AFTER FIX:
// BUG-080: Only remove event listeners on unmount. Do NOT disconnect the shared
// socket singleton — other screens depend on it.
useEffect(() => {
  let cleanupListeners: (() => void) | undefined;

  const setupSocket = async () => {
    try {
      await socketService.connect();
      setSocketConnected(true);

      // Wire connection loss detection to UI
      socketService.onConnectionLost(() => {
        setSocketConnected(false);
      });

      // NOTE: gmv:update and merchant:alert events are not emitted by the
      // backend yet. GMV is loaded via the REST dashboard stats endpoint.
      // When backend emitters are added, re-enable real-time listeners here.

      // Register socket listeners and capture the cleanup function
      const listeners: Array<() => void> = [];
      listeners.push(
        socketService.on('order:new', (data) => { ... })
      );
      // ...

      cleanupListeners = () => listeners.forEach((cleanup) => cleanup());
    } catch (error) {
      // ...
    }
  };

  setupSocket();

  // BUG-007: Store the cleanup function returned by setupSocket and call it on unmount.
  // BUG-080: Do NOT call socketService.disconnect() here — the singleton is shared.
  return () => {
    cleanupListeners?.();
  };
}, []);
```

### Related Bugs

- **BUG-026**: Connection-lost callback registration
- **BUG-082**: Concurrent fetch guard in live-monitor
- **BUG-069**: Socket connects to monolith instead of gateway

### Test Plan

1. Navigate to dashboard (socket connects)
2. Navigate to live-monitor (registers its own listeners on the SAME singleton)
3. Navigate back to dashboard (dashboard unmounts)
4. Live-monitor should still receive socket events (not broken by step 3)
