# Consumer MFA Integration Guide

**Document Version:** 1.0
**Date:** 2026-04-30

---

## Overview

This document describes how to integrate consumer MFA (Multi-Factor Authentication) into the REZ ecosystem frontend applications.

## Current Implementation

### Backend (Already Implemented)

The `rez-auth-service` has MFA infrastructure that:

1. Checks if user has MFA enabled after OTP verification
2. Returns `mfaRequired: true` with a session token
3. Provides `/auth/mfa/verify-otp` endpoint to complete login

### Flow

```
1. POST /auth/otp/verify
   Body: { phone: '+919876543210', otp: '123456', countryCode: '+91' }

2. Response (if MFA enabled):
   {
     "success": true,
     "mfaRequired": true,
     "mfaSessionToken": "abc123...",
     "message": "Please enter your authenticator code to complete login.",
     "backupCodesAvailable": 10
   }

3. POST /auth/mfa/verify-otp
   Body: { mfaSessionToken: 'abc123...', totpCode: '123456' }

4. Response:
   {
     "success": true,
     "accessToken": "eyJ...",
     "refreshToken": "eyJ...",
     "user": { ... }
   }
```

---

## Frontend Integration

### React Native (REZ App)

```typescript
// hooks/useAuth.ts
import { useState } from 'react';

export function useAuth() {
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSessionToken, setMfaSessionToken] = useState<string | null>(null);

  async function login(phone: string, otp: string) {
    const response = await fetch('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, countryCode: '+91' }),
    });

    const data = await response.json();

    if (data.mfaRequired) {
      setMfaRequired(true);
      setMfaSessionToken(data.mfaSessionToken);
      return { mfaRequired: true };
    }

    // No MFA - login complete
    return { accessToken: data.accessToken, user: data.user };
  }

  async function verifyMFA(totpCode: string) {
    const response = await fetch('/auth/mfa/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        mfaSessionToken,
        totpCode,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    setMfaRequired(false);
    setMfaSessionToken(null);

    return { accessToken: data.accessToken, user: data.user };
  }

  return { login, verifyMFA, mfaRequired };
}
```

### Login Screen Component

```tsx
// screens/LoginScreen.tsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginScreen() {
  const { login, verifyMFA, mfaRequired } = useAuth();
  const [otp, setOtp] = useState('');

  async function handleOTPSubmit() {
    const result = await login(phone, otp);
    if (result.mfaRequired) {
      // Show MFA input
    }
  }

  async function handleMFASubmit() {
    const result = await verifyMFA(mfaCode);
    if (result.accessToken) {
      // Navigate to home
    }
  }

  return (
    <View>
      {mfaRequired ? (
        <MFAInput onSubmit={handleMFASubmit} />
      ) : (
        <OTPInput onSubmit={handleOTPSubmit} />
      )}
    </View>
  );
}
```

---

## User MFA Setup Flow

### Step 1: Enable MFA

1. User goes to Profile > Security > Enable MFA
2. App calls `GET /auth/mfa/setup` to get QR code URL
3. User scans QR with authenticator app (Google Authenticator, Authy)
4. User enters TOTP code to verify setup
5. App receives backup codes, stores securely

### Step 2: Use MFA

1. User enters phone + OTP
2. Server returns `mfaRequired: true`
3. App shows MFA input screen
4. User enters 6-digit TOTP code
5. Login completes

### Step 3: Recover with Backup Codes

If user loses phone:
1. Click "Use backup code"
2. Enter one of the 10 backup codes
3. Backup code is invalidated after use
4. Prompt user to reset MFA

---

## API Endpoints

### GET /auth/mfa/setup

Get MFA setup information (QR code URL).

**Response:**
```json
{
  "success": true,
  "qrCodeUrl": "otpauth://totp/REZ:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=REZ",
  "secret": "JBSWY3DPEHPK3PXP",
  "backupCodes": ["code1", "code2", ...]
}
```

### POST /auth/mfa/verify-setup

Verify TOTP setup and enable MFA.

**Body:**
```json
{
  "totpCode": "123456"
}
```

### POST /auth/mfa/verify-otp

Complete login with TOTP code.

**Body:**
```json
{
  "mfaSessionToken": "abc123...",
  "totpCode": "123456"
}
```

### POST /auth/mfa/disable

Disable MFA (requires current TOTP).

**Body:**
```json
{
  "totpCode": "123456"
}
```

### POST /auth/mfa/backup-code

Use a backup code to recover account.

**Body:**
```json
{
  "backupCode": "xxxx-xxxx-xxxx"
}
```

---

## Testing

```bash
# Test MFA flow
curl -X POST http://localhost:4002/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "otp": "123456", "countryCode": "+91"}'

# If MFA enabled, response includes mfaRequired: true
# Then:
curl -X POST http://localhost:4002/auth/mfa/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mfaSessionToken": "...", "totpCode": "123456"}'
```

---

## Related Documentation

- [Auth Service Architecture](../rez-auth-service/docs/architecture.md)
- [Security Remediation Plan](./SECURITY-REMEDIATION-PLAN.md)
- [SEC-005 Issue](../ISSUES_REPORT.md#SEC-005)
