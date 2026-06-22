---
name: SVC-006 SOCKET_BACKEND_MISMATCH
description: Socket connects to monolith backend but REST API connects to API gateway — different hosts
type: bug
severity: MEDIUM
domain: Cross-Service / WebSocket
fix_summary: SOCKET_URL now derived from BASE_URL (strips /api suffix) when not explicitly set. WebSocket and REST API always share the same host, ensuring auth cookie domain consistency.
fixed_date: 2026-04-19
status: FIXED
owner: unassigned
created: 2026-04-19
---

## Bug: SVC-006 — Socket Host Differs From REST API Host

### Status: OPEN | Severity: MEDIUM | Domain: Cross-Service / WebSocket

---

### Summary

`vercel.json` configures `EXPO_PUBLIC_SOCKET_URL` to `https://rez-backend-8dfu.onrender.com` (the monolith) while `EXPO_PUBLIC_API_BASE_URL` points to `https://rez-api-gateway.onrender.com/api` (the gateway). WebSocket connections go to a different host than REST API calls.

### Files Affected

- `vercel.json:23-24`
- `eas.json:34-35`
- `services/socket.ts:27-29`

### Root Cause

```json
// vercel.json:
{
  "EXPO_PUBLIC_API_BASE_URL": "https://rez-api-gateway.onrender.com/api",
  "EXPO_PUBLIC_SOCKET_URL": "https://rez-backend-8dfu.onrender.com"
}
```

The `socketService` connects to `rez-backend-8dfu`:
```typescript
// services/socket.ts:27-29:
this.socket = io(this.connectionUrl, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
});
```

Meanwhile, all REST calls go through `apiClient` → `rez-api-gateway`.

### Risks

1. **Auth cookie mismatch**: REST uses `Authorization: Bearer <token>` through gateway; Socket uses the monolith which may have different session validation
2. **Event namespace mismatch**: Gateway may route socket events differently than the monolith
3. **CORS mismatch**: The monolith's CORS config may differ from the gateway's
4. **If monolith is deprecated**: Socket connections will break when monolith is removed

### Fix

Route socket through the gateway, or ensure both services share auth:

```typescript
// Option 1: Socket through gateway (preferred — single auth source)
EXPO_PUBLIC_SOCKET_URL should match gateway host

// Option 2: Verify both services share session validation
// If socket must connect to monolith, ensure:
// - Same token validation middleware
// - Same CORS configuration
// - Socket.IO namespace consistency
```

Update `vercel.json`:

```json
{
  "EXPO_PUBLIC_API_BASE_URL": "https://rez-api-gateway.onrender.com/api",
  "EXPO_PUBLIC_SOCKET_URL": "https://rez-api-gateway.onrender.com"
}
```

Also update `services/socket.ts` to use the same `getApiUrl()` pattern as the REST client.

### Test Plan

1. Open admin app — WebSocket connects
2. Verify socket auth works (order events received after login)
3. Verify no auth errors in socket connection log
4. If monolith auth differs, socket may disconnect after token refresh
