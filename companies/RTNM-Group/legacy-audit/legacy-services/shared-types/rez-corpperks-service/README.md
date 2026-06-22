# REZ CorpPerks Service

Enterprise benefits and perks microservice for corporate customers.

## Purpose

The CorpPerks Service manages:
- Corporate account management
- Employee benefits administration
- Perk catalog and redemption
- Corp wallet management
- GST calculations and invoicing
- Integration with partner services (Hotel, Procurement)

## Environment Variables

```env
# Service
PORT=4013
NODE_ENV=production

# CORS
CORS_ORIGIN=https://admin.rez.money,https://rez-app.vercel.app

# Internal
INTERNAL_SERVICE_TOKEN=your_internal_token_here
CORP_API_URL=https://api.rez.money

# Service URLs
WALLET_SERVICE_URL=https://rez-wallet-service.onrender.com
FINANCE_SERVICE_URL=https://rez-finance-service.onrender.com
KARMA_SERVICE_URL=https://karma.onrender.com
HOTEL_SERVICE_URL=http://localhost:4011
PROCUREMENT_SERVICE_URL=http://localhost:4012

# Makcorps
MAKCORPS_CLIENT_ID=your_client_id

# NextaBizz
NEXTABIZZ_CLIENT_ID=your_client_id

# HRIS
HRIS_CLIENT_ID=your_client_id
```

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## API Endpoints

### Benefits & Employees

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/corp/benefits | List benefits |
| POST | /api/corp/benefits | Create benefit |
| GET | /api/corp/employees | List employees |
| POST | /api/corp/employees | Enroll employee |
| POST | /api/corp/employees/bulk-import | Bulk import employees |

### GST & Invoicing

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/gst/calculate | Calculate GST |
| POST | /api/gst/invoices | Create invoice |
| GET | /api/gst/invoices | List invoices |
| POST | /api/gst/reports/gstr1 | GSTR-1 report |

### Rewards

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/rewards/summary | My rewards |
| POST | /api/rewards/award | Award coins |
| GET | /api/rewards/catalog | Reward catalog |
| POST | /api/rewards/redeem | Redeem reward |

### Campaigns

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/campaigns | List campaigns |
| POST | /api/campaigns | Create campaign |
| GET | /api/campaigns/:id/analytics | Campaign analytics |

### Integrations

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/integrations/health | Integration health |
| POST | /api/integrations/:provider/connect | Connect provider |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |

## CorpPerks SDK

```bash
npm install @rez/corpperks-sdk
```

```typescript
import { CorpPerksClient } from '@rez/corpperks-sdk';

const corp = new CorpPerksClient({
  apiBaseUrl: 'https://api.rez.money',
  token: userToken,
});

const benefits = await corp.getMyBenefits();
const booking = await corp.createBooking({...});
await corp.redeemReward('R001');
```

## Data Models

### Corporation
```typescript
{
  corpId: string;
  name: string;
  email: string;
  phone: string;
  industry: string;
  employeeCount: number;
  status: 'active' | 'inactive' | 'suspended';
  walletBalance: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Employee
```typescript
{
  employeeId: string;
  corpId: string;
  userId: string;
  employeeCode: string;
  department: string;
  designation: string;
  benefits: string[];
  status: 'active' | 'inactive';
  joinedAt: Date;
}
```

### Benefit
```typescript
{
  benefitId: string;
  name: string;
  description: string;
  type: 'discount' | 'cashback' | 'perk' | 'insurance';
  value: number;
  category: string;
  partnerId?: string;
  applicableTo: string[];
}
```

## Partner Integrations

| Partner | Integration |
|---------|-------------|
| Makcorps | Hotel bookings |
| NextaBizz | Procurement |
| HRIS Systems | Employee sync |

## Deployment

### Render.com
1. Connect GitHub repository
2. Build command: `npm run build`
3. Start command: `npm start`
4. Configure partner credentials

### Docker
```bash
docker build -t rez-corpperks-service .
docker run -p 4013:4013 --env-file .env rez-corpperks-service
```

### Docker Compose
```bash
docker-compose up -d
```

## Related Services

- **rez-wallet-service** - Corp wallet
- **rez-hotel-service** - Hotel bookings
- **rez-procurement-service** - Procurement
- **rez-karma-service** - Karma rewards

## License

MIT
