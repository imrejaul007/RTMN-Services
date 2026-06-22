# REZ Trust Admin Dashboard

Comprehensive trust management, fraud detection, and BNPL risk assessment dashboard for RTNM-Group.

## Features

- **Trust Score Dashboard** - Real-time trust metrics with animated score displays
- **User Trust Management** - KYC verification, trust scores, and BNPL limits
- **Merchant Trust Management** - Monitor merchant reliability and fraud prevention
- **Fraud Pattern Detection** - ML-powered fraud detection with case management
- **BNPL Risk Assessment** - Portfolio risk analysis and limit management

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Recharts for data visualization
- Lucide React for icons

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
REZ-trust-admin/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Trust overview dashboard
│   │   ├── users/page.tsx    # User trust management
│   │   ├── merchants/page.tsx # Merchant trust
│   │   └── fraud/page.tsx     # Fraud detection
│   ├── components/
│   │   ├── TrustScore.tsx    # Score display components
│   │   ├── FraudAlert.tsx    # Fraud alert components
│   │   └── TrustTimeline.tsx # Event timeline
│   └── app/
│       └── globals.css       # Global styles
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Pages

### Overview (`/`)
- Trust score trends with area chart
- BNPL risk distribution
- Recent fraud alerts
- Trust metrics summary
- Activity timeline

### Users (`/users`)
- User list with trust scores
- KYC status management
- BNPL limit tracking
- Bulk actions support
- User detail panel

### Merchants (`/merchants`)
- Merchant grid with trust scores
- Category filtering
- Risk level assessment
- Transaction volume tracking
- Performance trends

### Fraud (`/fraud`)
- Active fraud case management
- Fraud trends visualization
- Pattern detection
- Case investigation workflow
- ML confidence scoring

## Components

### TrustScore
Animated circular gauge displaying trust scores with trend indicators.

### FraudAlert
Comprehensive fraud alert cards with severity levels and action buttons.

### TrustTimeline
Event timeline for tracking verification, score changes, and alerts.

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=your-api-url
```

## License

Proprietary - RTNM-Group
