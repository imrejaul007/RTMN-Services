# REZ Referral Graph

Referral network graph and analysis service.

## Service Purpose

Tracks and analyzes referral networks, manages referral relationships, calculates referral bonuses, and provides graph-based insights for viral growth optimization.

## Port

```
3010
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/referrals` | List referrals |
| POST | `/api/referrals` | Create referral |
| GET | `/api/referrals/:id` | Get referral details |
| GET | `/api/referrals/user/:userId` | Get user's referrals |
| POST | `/api/referrals/:id/convert` | Mark referral as converted |
| GET | `/api/graph/:userId` | Get referral graph for user |
| GET | `/api/graph/:userId/depth/:depth` | Get nested referral graph |
| GET | `/api/bonuses/calculate/:userId` | Calculate referral bonuses |
| GET | `/api/analytics/network` | Network analytics |
| GET | `/api/analytics/viral` | Viral coefficient metrics |

## Configuration

Environment variables:

```env
PORT=3010
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/rez-referral-graph
GRAPH_MAX_DEPTH=5
```

## Setup Instructions

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build
npm start
```

## Referral Graph Structure

```typescript
interface ReferralNode {
  userId: string;
  referrerId?: string;
  referredAt: Date;
  convertedAt?: Date;
  rewardsEarned: number;
  chainDepth: number;
}

interface ReferralEdge {
  from: string;
  to: string;
  weight: number;
  createdAt: Date;
}
```

## Tech Stack

- Express.js
- TypeScript
- Mongoose (MongoDB)
- Zod (validation)
- UUID (ID generation)
- Axios (HTTP client)
- CORS
- Helmet (security headers)
