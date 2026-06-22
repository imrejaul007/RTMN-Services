# Certificate Pinning Implementation Guide

## Overview

Certificate pinning prevents man-in-the-middle (MITM) attacks by validating that the server's SSL certificate matches an expected certificate or public key hash.

## Current Status

| App | Certificate Pinning | Notes |
|-----|-------------------|-------|
| rez-app-consumer | Not Implemented | Uses HTTPS, no pinning |
| rez-app-marchant | Not Implemented | Uses HTTPS, no pinning |
| rez-app-admin | Not Implemented | Uses HTTPS, no pinning |
| rez-now | Not Implemented | Uses HTTPS via Cloudflare |
| adBazaar | Not Implemented | Uses HTTPS via Vercel |

## Implementation Options

### Option 1: react-native-cert-pinning (React Native CLI)

For bare React Native projects:

```bash
npm install react-native-cert-pinning
```

```typescript
import { fetchPinSSL, PinnedCertificate } from 'react-native-cert-pinning';

const pinConfig: PinnedCertificate[] = [
  {
    host: 'api.rez.money',
    certificateHash: 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  },
];

const response = await fetchPinSSL(url, options, pinConfig);
```

### Option 2: expo-dev-client + expo-ssl-pinning (Expo)

For Expo projects with custom dev client:

```bash
npx expo install expo-dev-client
```

```typescript
// Using expo-ssl-pinning or custom native module
```

### Option 3: Custom Native Module

For fine-grained control:

```typescript
// ios/LocalPods/SSLPinning/SSLPinning.swift
import Foundation
import Security

class SSLPinningURLSession: NSObject, URLSessionDelegate {
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        // Validate certificate against pinned certificates
    }
}
```

## Recommended Approach for ReZ Apps

Given that all ReZ apps are Expo-based and go through Cloudflare/Vercel CDN:

1. **Short-term**: Enable Cloudflare/Vercel certificate pinning at the CDN level
2. **Medium-term**: Add Firebase App Check for API verification
3. **Long-term**: Implement native certificate pinning for critical endpoints

### Firebase App Check (Recommended)

App Check helps protect your API from abuse by verifying that calls come from your legitimate app instance.

```typescript
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

initializeAppCheck(getApp(), {
  provider: new ReCaptchaEnterpriseProvider('RECAPTCHA_ENTERPRISE_SITE_KEY'),
  isTokenAutoRefreshEnabled: true,
});
```

## Security Notes

- Certificate pinning can break during certificate rotation
- Always implement backup pins for certificate renewal
- Test thoroughly before deploying to production
- Consider using public key pinning instead of certificate pinning (more resilient to certificate rotation)

## References

- [OWASP Certificate Pinning](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html#certificate-pinning)
- [react-native-cert-pinning](https://github.com/nicklockwood/react-native-cert-pinning)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
