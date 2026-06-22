# Loyalty System Documentation

## Overview

The Rez Loyalty System provides a comprehensive customer engagement platform that rewards users for their continued patronage through points, coins, badges, milestones, and tiered membership benefits.

## Features

### 1. Points System
- Earn points on every order (1 point per Rs. 10 spent)
- Points multiplier based on tier (Bronze: 1x, Silver: 1.25x, Gold: 1.5x, Platinum: 2x)
- Redeem points for rewards and discounts

### 2. Coins System
- Earn coins on every order (1 coin per Rs. 50 spent)
- Coins can be redeemed for exclusive rewards
- Bonus coins on milestone completions

### 3. Visit Tracking
- Track customer visits across all stores
- Automatic visit recording after successful orders
- Visit history with detailed analytics

### 4. Streak System
- Maintain daily visit streaks
- Streak badges for consecutive days (7, 14, 30 days)
- Streak at-risk notifications
- Grace period for streak protection

### 5. Milestones
| Milestone | Target | Rewards |
|-----------|--------|---------|
| First Steps | 1 order | 50 coins |
| Regular | 5 visits | 200 coins |
| Loyal | 10 visits | 500 coins + 5% discount |
| VIP | 25 visits | 1500 coins + 10% discount |
| Elite | 50 visits | 3000 coins + 15% discount |
| Legend | 100 visits | 5000 coins + 20% discount |

### 6. Badge System
- Unlock badges by completing milestones
- Badge categories: visits, streaks, spending, orders
- Rarity levels: Common, Rare, Epic, Legendary

### 7. Tier System

#### Bronze (0+ visits)
- 1% cashback
- Birthday bonus
- Member-only deals

#### Silver (10+ visits)
- 1.25% cashback
- Birthday bonus
- Early access to sales
- 1% extra cashback

#### Gold (25+ visits)
- 2% cashback
- Double birthday bonus
- Priority customer support
- Early access to new items
- Free delivery on Rs. 500+ orders

#### Platinum (50+ visits)
- 3% cashback
- Triple birthday bonus
- Dedicated priority support
- First access to new items
- Free delivery on all orders
- Exclusive platinum events
- Personal concierge service

## API Reference

### Get Loyalty Profile
```
GET /api/loyalty
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "userId": "user_123",
    "totalVisits": 12,
    "currentStreak": 3,
    "longestStreak": 7,
    "points": 450,
    "coins": 1200,
    "tier": "silver",
    "badges": [...],
    "milestones": [...]
  }
}
```

### Record Visit
```
POST /api/loyalty/visit
Authorization: Bearer {token}
Idempotency-Key: {unique_key}

Body:
{
  "orderId": "order_123",
  "storeSlug": "store-name",
  "storeName": "Store Name",
  "orderTotal": 50000
}

Response:
{
  "success": true,
  "data": {
    "visit": {...},
    "events": [...],
    "earnedCoins": 1000,
    "earnedPoints": 5000,
    "unlockedMilestones": [...],
    "newTier": "silver"
  }
}
```

### Get Milestones
```
GET /api/loyalty/milestones

Response:
{
  "success": true,
  "data": [
    {
      "id": "first_order",
      "name": "First Steps",
      "target": 1,
      "current": 1,
      "reward": { "coins": 50 },
      "unlockedAt": "2024-01-15T10:30:00Z"
    },
    ...
  ]
}
```

### Get Badges
```
GET /api/loyalty/badges

Response:
{
  "success": true,
  "data": [
    {
      "id": "first_order",
      "name": "First Order",
      "icon": "🎉",
      "description": "Completed your first order",
      "unlockedAt": "2024-01-15T10:30:00Z"
    },
    ...
  ]
}
```

### Get Streak Status
```
GET /api/loyalty/streak

Response:
{
  "success": true,
  "data": {
    "currentStreak": 3,
    "longestStreak": 7,
    "lastVisit": "2024-03-15T14:30:00Z",
    "atRisk": false,
    "daysUntilLoss": 2
  }
}
```

### Get Tier Info
```
GET /api/loyalty/tier

Response:
{
  "success": true,
  "data": {
    "currentTier": "silver",
    "nextTier": "gold",
    "progress": 48,
    "perks": [...],
    "totalVisits": 12,
    "visitsRequired": 25
  }
}
```

## Components

### MilestoneCard
Displays milestone progress with unlock animations.

```tsx
import MilestoneCard from '@/components/loyalty/MilestoneCard';

<MilestoneCard
  milestone={milestone}
  compact={false}
  onUnlock={(m) => console.log('Unlocked:', m.name)}
/>
```

### BadgeDisplay
Shows earned badges with detail modal.

```tsx
import BadgeDisplay from '@/components/loyalty/BadgeDisplay';

<BadgeDisplay
  earnedBadges={badges}
  showDetails={true}
  size="md"
  onShare={(badge) => shareBadge(badge)}
/>
```

### StreakCounter
Displays current streak with at-risk warnings.

```tsx
import StreakCounter from '@/components/loyalty/StreakCounter';

<StreakCounter
  currentStreak={3}
  longestStreak={7}
  lastVisit={lastVisit}
  atRisk={false}
  daysUntilLoss={2}
/>
```

### TierCard
Shows current tier and progress to next.

```tsx
import TierCard from '@/components/loyalty/TierCard';

<TierCard
  currentTier="silver"
  nextTier="gold"
  progress={48}
  visitsRemaining={13}
/>
```

### YourUsual
"Order your usual" feature for repeat customers.

```tsx
import YourUsual from '@/components/menu/YourUsual';

<YourUsual
  storeSlug="store-name"
  onReorder={(items) => handleReorder(items)}
/>
```

## Configuration

### Milestones (`/lib/config/milestones.ts`)
Defines all milestones with targets, rewards, and categories.

### Tiers (`/lib/config/tiers.ts`)
Defines tier requirements, perks, and benefits.

## Notifications

The system sends push notifications for:
- Milestone unlocked
- Badge earned
- Tier upgrade
- Streak at risk
- Streak maintained
- Coins/Points earned

## Integration

### Order Flow Integration
After successful order payment:

```typescript
import { completeOrderWithLoyalty } from '@/lib/api/order';

const result = await completeOrderWithLoyalty(
  orderId,
  storeSlug,
  storeName,
  orderTotal,
  true
);

if (result.loyalty) {
  showLoyaltyToast(result.loyalty.message);
}
```

## Database Schema

### loyalty_profiles
- user_id (UUID, PK)
- total_visits (INT)
- current_streak (INT)
- longest_streak (INT)
- last_visit (TIMESTAMP)
- points (INT)
- coins (INT)
- tier (ENUM)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### loyalty_visits
- id (UUID, PK)
- user_id (UUID, FK)
- store_slug (VARCHAR)
- order_id (VARCHAR)
- order_total (INT)
- points_earned (INT)
- coins_earned (INT)
- visited_at (TIMESTAMP)

### loyalty_badges
- id (UUID, PK)
- user_id (UUID, FK)
- badge_id (VARCHAR)
- unlocked_at (TIMESTAMP)

### loyalty_milestones
- id (UUID, PK)
- user_id (UUID, FK)
- milestone_id (VARCHAR)
- current (INT)
- unlocked_at (TIMESTAMP, NULLABLE)

## Security

- All API endpoints require authentication
- Idempotency keys prevent duplicate processing
- Rate limiting on loyalty operations
- Audit logging for all redemptions

## Best Practices

1. Always call `recordVisit` after successful payment confirmation
2. Use idempotency keys to prevent duplicate recordings
3. Display milestone unlock animations to increase engagement
4. Send streak reminders when `atRisk` is true
5. Show tier progress to encourage upgrades
