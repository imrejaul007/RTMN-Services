# MobileOS — App Store Infrastructure

**Port:** 4598
**Purpose:** Build, sign, and publish mobile apps to App Store and Play Store

---

## Overview

MobileOS provides end-to-end mobile app management:
- **Build** — iOS (simulated Xcode Cloud) and Android (Gradle)
- **Sign** — Certificates and provisioning profiles
- **Submit** — App Store and Play Store submission
- **Release** — Gradual rollout, holdback, immediate
- **OTA** — CodePush-style updates
- **Crash** — Crash reporting and analytics
- **Push** — Push notification delivery

---

## Workflow

```
1. Create App
   ↓
2. Build (iOS + Android)
   ├── Code Sign
   └── Generate IPA / APK / AAB
   ↓
3. Test (TestFlight / Internal Testing)
   ↓
4. Submit to Store
   ↓
5. Review (24-48 hours)
   ↓
6. Published!
   ↓
7. Monitor (Crashes, Analytics)
   ↓
8. Update (OTA or new build)
```

---

## API Endpoints

### Apps
```
POST /api/apps              - Create app
GET  /api/apps             - List apps
GET  /api/apps/:id         - Get app
```

### Builds
```
POST /api/builds             - Trigger build
GET  /api/builds             - List builds
GET  /api/builds/:id         - Get build
GET  /api/builds/:id/logs    - Get build logs
GET  /api/builds/:id/download - Download artifact
POST /api/builds/:id/cancel  - Cancel build
```

### Certificates & Profiles (iOS)
```
POST /api/certificates       - Upload certificate
GET  /api/certificates       - List certificates
DELETE /api/certificates/:id - Revoke certificate

POST /api/profiles           - Create provisioning profile
GET  /api/profiles           - List profiles
```

### Submissions
```
POST /api/submissions         - Submit to store
GET  /api/submissions         - List submissions
GET  /api/submissions/:id    - Get submission
POST /api/submissions/:id/cancel - Cancel submission
```

### Releases
```
POST /api/releases            - Create release
GET  /api/releases            - List releases
POST /api/releases/:id/publish - Publish release
POST /api/releases/:id/rollback - Rollback
```

### OTA Updates
```
POST /api/ota/deploy         - Deploy OTA update
GET  /api/ota/check          - Check for updates
```

### Crash Reporting
```
POST /api/crashes            - Report crash
GET  /api/crashes            - List crashes
GET  /api/crashes/:id        - Get crash details
POST /api/crashes/:id/resolve - Mark resolved
```

### Push Notifications
```
POST /api/notifications/send  - Send push
GET  /api/notifications      - List notifications
```

### Analytics
```
GET  /api/analytics          - App analytics
```

---

## Example Usage

### Create App
```bash
curl -X POST http://localhost:4598/api/apps \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "company-123",
    "name": "FastBite Delivery",
    "bundleId": "com.fastbite.delivery",
    "platform": "both",
    "category": "Food & Drink"
  }'
```

### Trigger Build
```bash
curl -X POST http://localhost:4598/api/builds \
  -H 'Content-Type: application/json' \
  -d '{
    "appId": "app-123",
    "platform": "both",
    "buildType": "release",
    "branch": "main",
    "metadata": {
      "version": "2.1.0",
      "buildNumber": 42
    }
  }'
```

### Submit to App Store
```bash
curl -X POST http://localhost:4598/api/submissions \
  -H 'Content-Type: application/json' \
  -d '{
    "appId": "app-123",
    "platform": "ios",
    "buildId": "build-456",
    "releaseNotes": {
      "en-US": "Bug fixes and performance improvements"
    }
  }'
```

### Check for OTA Updates
```bash
curl "http://localhost:4598/api/ota/check?appId=app-123&version=2.0.0&platform=ios"
```

### Send Push Notification
```bash
curl -X POST http://localhost:4598/api/notifications/send \
  -H 'Content-Type: application/json' \
  -d '{
    "appId": "app-123",
    "platform": "both",
    "title": "New Feature!",
    "body": "Check out our new dark mode",
    "data": {"action": "open_settings"}
  }'
```

---

## Build Artifacts

### iOS
- **IPA** — App package for distribution
- **Symbols** — Debug symbols for crash reports

### Android
- **APK** — Direct install
- **AAB** — App Bundle for Play Store

---

## Release Types

| Type | Description |
|------|-------------|
| `immediate` | All users immediately |
| `gradual` | Percentage rollout |
| `holdback` | Internal testing first |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      MobileOS                            │
│                      (4598)                             │
├─────────────────────────────────────────────────────────┤
│  Build Engine                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │  Xcode  │ │ Gradle   │ │  Expo    │              │
│  │  Cloud  │ │  Build   │ │ Build    │              │
│  └──────────┘ └──────────┘ └──────────┘              │
├─────────────────────────────────────────────────────────┤
│  Code Signing                                           │
│  Certificates │ Profiles │ Keys                      │
├─────────────────────────────────────────────────────────┤
│  Store Submission                                       │
│  App Store │ Play Store │ Enterprise                  │
├─────────────────────────────────────────────────────────┤
│  Release Management                                     │
│  Gradual │ Holdback │ Rollback │ OTA                 │
├─────────────────────────────────────────────────────────┤
│  App Intelligence                                       │
│  Crashes │ Analytics │ Push │ Remote Config          │
└─────────────────────────────────────────────────────────┘
```

---

## App Store Submission

### Required Assets
- App icons (all sizes)
- Screenshots (iPhone, iPad, Android)
- App preview videos
- Description and metadata
- Privacy policy URL
- Support URL

### Review Guidelines
- 24-48 hours typical review time
- 90% approval rate
- Common rejection reasons:
  - Missing privacy policy
  - Crashes during review
  - Incomplete IAP implementation
  - Guideline violations

---

## Next Steps

1. **Add real build infrastructure** — MacStadium, Codemagic
2. **Add app signing** — Real certificate management
3. **Add TestFlight** — Beta testing integration
4. **Add Play Store API** — Real Play Store submission
5. **Add remote config** — Feature flags
