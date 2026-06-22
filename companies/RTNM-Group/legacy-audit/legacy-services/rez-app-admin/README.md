# REZ Admin Dashboard

React Native/Expo web and mobile admin platform for REZ backend system management, user oversight, fraud detection, and merchant settlements.

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Expo CLI: `npm install -g expo-cli`
- Web browser for Expo Web

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit with your backend API URL and admin credentials
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

   Then press:
   - `w` — Expo Web (opens in browser)
   - `i` — iOS simulator
   - `a` — Android emulator

## Project Structure

```
app/                     # Expo Router file-based navigation
├── (auth)/              # Admin login/2FA
├── (dashboard)/         # Main admin interface
│   ├── users/           # User management & search
│   ├── merchants/       # Merchant onboarding & KYC
│   ├── settlements/     # Payout management
│   ├── fraud/           # Fraud detection & device blocking
│   ├── campaigns/       # Promotion management
│   ├── notifications/   # Push/SMS/email campaigns
│   ├── analytics/       # Dashboards & reports
│   └── audit/           # Audit logs & compliance
├── reports/             # Report generation & exports
└── _layout.tsx          # Root navigation config

components/              # Reusable React components
├── DataTable.tsx        # Sortable, filterable tables
├── Modal.tsx            # Dialog components
├── Charts.tsx           # Analytics visualizations
└── ...

hooks/                   # React hooks for admin logic
├── useAdminAuth.ts      # Admin authentication
├── useApi.ts            # API request wrapper
├── usePermissions.ts    # Role-based access control
└── ...

utils/                   # Admin-specific utilities
├── reportGenerator.ts   # CSV/Excel export
├── dateUtils.ts         # Date formatting
├── validationUtils.ts   # Form validation
└── ...

services/                # API client classes
├── adminApi.ts          # Admin-only endpoints
├── usersApi.ts          # User management
├── merchantsApi.ts      # Merchant operations
├── settlementApi.ts     # Payout processing
└── ...

types/                   # TypeScript interfaces
├── admin.types.ts       # Admin-specific types
└── index.ts

__tests__/               # Jest test suite
├── integration/         # Admin API tests
└── mocks/               # Mock handlers

config/
├── env.ts               # Environment variables
├── roles.ts             # Role permissions matrix
└── ...
```

## Key Features

- **User Management** — Search, verify, block users; view transaction history
- **Merchant Onboarding** — KYC verification, document review, tier assignment
- **Settlement & Payouts** — Manual/automatic payouts, settlement reports
- **Fraud Detection** — Device fingerprint blocking, suspicious activity alerts
- **Campaign Management** — Create promotions, set rules, track performance
- **Notification Broadcasting** — Send push/SMS/email to user segments
- **Analytics Dashboard** — User metrics, revenue, cashback burn, order trends
- **Audit Logs** — Complete activity tracking for compliance (PCI-DSS, AML)
- **Reporting** — Generate CSVs/PDFs for business intelligence

## API Integration

### Admin Endpoints

All admin calls require authentication with role-based permissions:

```typescript
const response = await adminApi.request<AdminData>(
  '/admin/users/:userId/block',
  { method: 'POST', body: { reason: 'Fraud detected' } }
);
```

**Permissions:** Admin role matrix in `config/roles.ts`:
- `super_admin` — All permissions
- `finance_admin` — Settlements, disputes, refunds
- `trust_safety_admin` — User blocking, fraud investigation
- `marketing_admin` — Campaigns, notifications
- `support_admin` — View-only user data access

### Response Format

Same standardized format as backend:

```typescript
interface AdminResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: { [key: string]: string[] };
  meta?: {
    pagination?: { page, limit, total, pages };
    timestamp?: string;
  };
}
```

## Development

### Run Tests
```bash
npm test              # All tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### Linting
```bash
npm run lint         # ESLint check
npm run format       # Prettier format
npm run type-check   # TypeScript check
```

### Build for Web
```bash
npm run build:web
# Serves from: dist/
```

### Build for iOS/Android
```bash
eas build --platform ios --profile admin-production
eas build --platform android --profile admin-production
```

## Environment Variables

Create `.env.local`:

```bash
# API Configuration
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api  # Dev
# EXPO_PUBLIC_API_BASE_URL=https://api.rez.app/api  # Prod

# Admin Auth
EXPO_PUBLIC_ADMIN_AUTH_URL=http://localhost:5000/api/admin/auth

# Feature Flags
EXPO_PUBLIC_ENABLE_SETTLEMENTS=true
EXPO_PUBLIC_ENABLE_FRAUD_DETECTION=true
```

## Deployment

### Web (Expo Web)
```bash
eas build --platform web --profile admin-production
# Deploys to Vercel/hosting
```

### Mobile
```bash
eas build --platform ios --profile admin-production
eas submit --platform ios --profile admin-production
```

## Security & Compliance

- **Role-Based Access Control:** Enforce permissions via `usePermissions()` hook
- **Audit Trail:** All admin actions logged with timestamp and user ID
- **2FA:** Required for super_admin roles
- **Rate Limiting:** Admin endpoints rate-limited to prevent abuse
- **Data Masking:** Sensitive data (SSN, card numbers) masked in UI

## Known TODOs & Issues

- **Batch Operations:** Bulk user block/unblock not yet implemented
- **Settlement Scheduling:** Manual scheduling only, no recurring payouts
- **Fraud ML Model:** Currently rule-based, needs ML integration
- **Report Caching:** Large exports may timeout on first run
- **Mobile Responsiveness:** Some tables not optimized for mobile view

## Monitoring & Alerts

- **Admin Action Alerts:** Sentry alerts on high-risk operations (payout > 1L, user block)
- **Dashboard Performance:** New Relic tracks admin page load times
- **Failed Reports:** Email alerts on export generation failures

## Testing Before Release

- [ ] Admin login with 2FA works
- [ ] User search/filter returns correct results
- [ ] Settlement calculations match backend ledger
- [ ] Fraud block prevents user login immediately
- [ ] Push notification broadcast reaches test users
- [ ] Report export generates valid CSV
- [ ] Audit log captures all admin actions

## Support & Documentation

- See `DEPLOYMENT.md` for production deployment steps
- API contract: Backend README
- Role permissions: `config/roles.ts`
- Type safety: All admin APIs are TypeScript-typed

---

**Version:** 1.0.0
**Last Updated:** 2026-03-23
**Platform:** React Native/Expo (Web, iOS, Android)
**Maintainer:** Release Engineering (Priya Menon)
