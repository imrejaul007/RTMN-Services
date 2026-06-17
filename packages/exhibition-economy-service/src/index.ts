import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5050;

app.use(cors());
app.use(express.json());

// Types
interface User {
  id: string;
  name: string;
  email: string;
  coins: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  xp: number;
  createdAt: string;
}

interface Transaction {
  id: string;
  userId: string;
  type: 'earn' | 'spend' | 'reward' | 'refund';
  amount: number;
  reason: string;
  createdAt: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  stock: number;
  category: 'discount' | 'item' | 'experience' | 'vip';
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  coins: number;
  xp: number;
  tier: string;
}

// Mock Data
const users: User[] = [
  { id: 'user-1', name: 'Alice Johnson', email: 'alice@example.com', coins: 2500, tier: 'gold', xp: 4500, createdAt: new Date().toISOString() },
  { id: 'user-2', name: 'Bob Smith', email: 'bob@example.com', coins: 3200, tier: 'platinum', xp: 6200, createdAt: new Date().toISOString() },
  { id: 'user-3', name: 'Carol White', email: 'carol@example.com', coins: 1800, tier: 'silver', xp: 2800, createdAt: new Date().toISOString() },
  { id: 'user-4', name: 'David Brown', email: 'david@example.com', coins: 4100, tier: 'platinum', xp: 7800, createdAt: new Date().toISOString() },
  { id: 'user-5', name: 'Eve Davis', email: 'eve@example.com', coins: 950, tier: 'bronze', xp: 1200, createdAt: new Date().toISOString() }
];

const transactions: Transaction[] = [
  { id: 'txn-1', userId: 'user-1', type: 'earn', amount: 100, reason: 'Badge scan', createdAt: new Date().toISOString() },
  { id: 'txn-2', userId: 'user-1', type: 'spend', amount: -50, reason: 'Reward redemption', createdAt: new Date().toISOString() },
  { id: 'txn-3', userId: 'user-2', type: 'reward', amount: 500, reason: 'Top exhibitor referral', createdAt: new Date().toISOString() },
  { id: 'txn-4', userId: 'user-3', type: 'earn', amount: 75, reason: 'Product review', createdAt: new Date().toISOString() }
];

const rewards: Reward[] = [
  { id: 'reward-1', name: '10% Off Coupon', description: 'Get 10% off at any booth', cost: 100, stock: 500, category: 'discount' },
  { id: 'reward-2', name: 'Free Coffee', description: 'Complimentary coffee at Cafe A', cost: 50, stock: 200, category: 'item' },
  { id: 'reward-3', name: 'VIP Lounge Access', description: 'Access to exclusive VIP lounge', cost: 1000, stock: 50, category: 'vip' },
  { id: 'reward-4', name: 'Workshop Entry', description: 'Free entry to premium workshops', cost: 300, stock: 100, category: 'experience' },
  { id: 'reward-5', name: 'Expo T-Shirt', description: 'Official exhibition merchandise', cost: 200, stock: 150, category: 'item' }
];

// Response helper
const response = <T>(data: T, req: Request) => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string || uuidv4()
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'exhibition-economy-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// User routes
app.get('/api/users', (req: Request, res: Response) => {
  res.json(response(users, req));
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' }
    });
  }
  res.json(response(user, req));
});

app.post('/api/users', (req: Request, res: Response) => {
  const user: User = {
    id: uuidv4(),
    name: req.body.name,
    email: req.body.email,
    coins: 100,
    tier: 'bronze',
    xp: 0,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  res.status(201).json(response(user, req));
});

app.patch('/api/users/:id/coins', (req: Request, res: Response) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' }
    });
  }

  const { amount, type, reason } = req.body;
  user.coins += amount;

  const transaction: Transaction = {
    id: uuidv4(),
    userId: user.id,
    type: type || (amount > 0 ? 'earn' : 'spend'),
    amount,
    reason: reason || 'Coin adjustment',
    createdAt: new Date().toISOString()
  };
  transactions.push(transaction);

  res.json(response({ user, transaction }, req));
});

// Transaction routes
app.get('/api/transactions', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const filtered = userId ? transactions.filter(t => t.userId === userId) : transactions;
  res.json(response(filtered, req));
});

app.post('/api/transactions', (req: Request, res: Response) => {
  const transaction: Transaction = {
    id: uuidv4(),
    userId: req.body.userId,
    type: req.body.type,
    amount: req.body.amount,
    reason: req.body.reason,
    createdAt: new Date().toISOString()
  };
  transactions.push(transaction);

  const user = users.find(u => u.id === req.body.userId);
  if (user) {
    user.coins += req.body.amount;
  }

  res.status(201).json(response(transaction, req));
});

// Rewards routes
app.get('/api/rewards', (req: Request, res: Response) => {
  const category = req.query.category as string;
  const filtered = category ? rewards.filter(r => r.category === category) : rewards;
  res.json(response(filtered, req));
});

app.get('/api/rewards/:id', (req: Request, res: Response) => {
  const reward = rewards.find(r => r.id === req.params.id);
  if (!reward) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Reward not found' }
    });
  }
  res.json(response(reward, req));
});

app.post('/api/rewards/redeem', (req: Request, res: Response) => {
  const { userId, rewardId } = req.body;
  const user = users.find(u => u.id === userId);
  const reward = rewards.find(r => r.id === rewardId);

  if (!user || !reward) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User or reward not found' }
    });
  }

  if (user.coins < reward.cost) {
    return res.status(400).json({
      success: false,
      error: { code: 'INSUFFICIENT_COINS', message: 'Not enough coins' }
    });
  }

  if (reward.stock <= 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'OUT_OF_STOCK', message: 'Reward out of stock' }
    });
  }

  user.coins -= reward.cost;
  reward.stock -= 1;

  const transaction: Transaction = {
    id: uuidv4(),
    userId: user.id,
    type: 'spend',
    amount: -reward.cost,
    reason: `Redeemed: ${reward.name}`,
    createdAt: new Date().toISOString()
  };
  transactions.push(transaction);

  res.json(response({
    user,
    reward,
    transaction,
    voucherCode: `VCH-${uuidv4().slice(0, 8).toUpperCase()}`
  }, req));
});

// Leaderboard routes
app.get('/api/leaderboard', (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'all';
  const limit = parseInt(req.query.limit as string) || 10;

  const leaderboard: LeaderboardEntry[] = users
    .sort((a, b) => b.coins - a.coins)
    .slice(0, limit)
    .map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      userName: user.name,
      coins: user.coins,
      xp: user.xp,
      tier: user.tier
    }));

  res.json(response({
    period,
    leaderboard,
    totalParticipants: users.length
  }, req));
});

app.get('/api/leaderboard/user/:userId', (req: Request, res: Response) => {
  const user = users.find(u => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' }
    });
  }

  const sortedUsers = [...users].sort((a, b) => b.coins - a.coins);
  const rank = sortedUsers.findIndex(u => u.id === user.id) + 1;

  res.json(response({
    rank,
    user,
    totalParticipants: users.length,
    percentile: Math.round((1 - rank / users.length) * 100)
  }, req));
});

// Analytics
app.get('/api/analytics', (req: Request, res: Response) => {
  const totalCoins = users.reduce((sum, u) => sum + u.coins, 0);
  const totalTransactions = transactions.length;

  res.json(response({
    totalUsers: users.length,
    totalCoins,
    totalTransactions,
    averageCoins: Math.round(totalCoins / users.length),
    tierDistribution: {
      bronze: users.filter(u => u.tier === 'bronze').length,
      silver: users.filter(u => u.tier === 'silver').length,
      gold: users.filter(u => u.tier === 'gold').length,
      platinum: users.filter(u => u.tier === 'platinum').length
    },
    recentActivity: transactions.slice(-10).reverse()
  }, req));
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

app.listen(PORT, () => {
  console.log(`Exhibition Economy Service running on port ${PORT}`);
});

export default app;
