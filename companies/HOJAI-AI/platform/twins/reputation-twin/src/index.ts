/**
 * Reputation Twin Service
 * Port: 4745
 *
 * Tracks reputation and trust:
 * - Reviews and ratings
 * - Trust scores
 * - Badges and achievements
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4745', 10);
const VERSION = '1.0.0';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// Types
interface Review {
  id: string;
  employeeId: string;
  reviewerId: string;
  type: 'performance' | 'peer' | 'customer' | '360';
  rating: number;
  strengths: string[];
  improvements: string[];
  comment?: string;
  createdAt: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedAt: string;
}

interface TrustScore {
  employeeId: string;
  overall: number;
  reliability: number;
  competence: number;
  communication: number;
  collaboration: number;
  consistency: number;
  calculatedAt: string;
}

// Storage
const reviews = new Map<string, Review[]>();
const badges = new Map<string, Badge[]>();
const trustScores = new Map<string, TrustScore>();

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`;
}

interface ApiError extends Error { statusCode?: number; code?: string; }
const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
};

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'reputation-twin', version: VERSION, timestamp: new Date().toISOString() });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, service: 'reputation-twin', timestamp: new Date().toISOString() });
});

/**
 * Get reputation profile
 */
app.get('/api/twin/:employeeId/reputation', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const empReviews = reviews.get(employeeId) || [];
  const empBadges = badges.get(employeeId) || [];
  const trust = trustScores.get(employeeId);

  const avgRating = empReviews.length > 0
    ? empReviews.reduce((sum, r) => sum + r.rating, 0) / empReviews.length
    : 0;

  res.json({
    success: true,
    data: {
      employeeId,
      trustScore: trust || null,
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews: empReviews.length,
      badges: empBadges,
      percentile: calculatePercentile(avgRating)
    }
  });
});

function calculatePercentile(rating: number): number {
  // Simple percentile calculation
  return Math.round((rating / 5) * 100);
}

/**
 * Add review
 */
app.post('/api/twin/:employeeId/reputation/reviews', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { reviewerId, type, rating, strengths, improvements, comment } = req.body;

    if (!reviewerId || !type || rating === undefined) {
      const err: ApiError = new Error('reviewerId, type, and rating are required'); err.statusCode = 400; throw err;
    }

    const review: Review = {
      id: generateId('review'),
      employeeId,
      reviewerId,
      type,
      rating: Math.max(1, Math.min(5, rating)),
      strengths: strengths || [],
      improvements: improvements || [],
      comment,
      createdAt: new Date().toISOString()
    };

    const empReviews = reviews.get(employeeId) || [];
    empReviews.push(review);
    reviews.set(employeeId, empReviews);

    // Recalculate trust score
    updateTrustScore(employeeId, empReviews);

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'REVIEW_ERROR', message: error.message } });
  }
});

function updateTrustScore(employeeId: string, empReviews: Review[]) {
  if (empReviews.length === 0) return;

  const avgRating = empReviews.reduce((sum, r) => sum + r.rating, 0) / empReviews.length;
  const reviewCount = empReviews.length;

  // Calculate component scores based on review types
  const peerReviews = empReviews.filter(r => r.type === 'peer');
  const performanceReviews = empReviews.filter(r => r.type === 'performance');

  trustScores.set(employeeId, {
    employeeId,
    overall: avgRating * 20,
    reliability: peerReviews.length > 0 ? peerReviews.reduce((sum, r) => sum + r.rating, 0) / peerReviews.length * 20 : 70,
    competence: performanceReviews.length > 0 ? performanceReviews.reduce((sum, r) => sum + r.rating, 0) / performanceReviews.length * 20 : 70,
    communication: 70,
    collaboration: 70,
    consistency: Math.min(100, reviewCount * 10),
    calculatedAt: new Date().toISOString()
  });
}

/**
 * Get reviews
 */
app.get('/api/twin/:employeeId/reputation/reviews', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { type, limit = 20 } = req.query;

  let empReviews = reviews.get(employeeId) || [];
  if (type) empReviews = empReviews.filter(r => r.type === type);

  res.json({
    success: true,
    data: {
      reviews: empReviews.slice(-Number(limit)),
      total: empReviews.length
    }
  });
});

/**
 * Award badge
 */
app.post('/api/twin/:employeeId/reputation/badges', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { name, description, icon, tier } = req.body;

    if (!name) {
      const err: ApiError = new Error('name is required'); err.statusCode = 400; throw err;
    }

    const badge: Badge = {
      id: generateId('badge'),
      name,
      description: description || '',
      icon: icon || '🏅',
      tier: tier || 'bronze',
      earnedAt: new Date().toISOString()
    };

    const empBadges = badges.get(employeeId) || [];
    empBadges.push(badge);
    badges.set(employeeId, empBadges);

    res.status(201).json({ success: true, data: badge });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'BADGE_ERROR', message: error.message } });
  }
});

/**
 * Get badges
 */
app.get('/api/twin/:employeeId/reputation/badges', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const empBadges = badges.get(employeeId) || [];

  res.json({ success: true, data: { badges: empBadges, total: empBadges.length } });
});

/**
 * Stats
 */
app.get('/api/twin/:employeeId/reputation/stats', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const empReviews = reviews.get(employeeId) || [];
  const empBadges = badges.get(employeeId) || [];
  const trust = trustScores.get(employeeId);

  const byType: Record<string, number> = {};
  empReviews.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1; });

  res.json({
    success: true,
    data: {
      employeeId,
      totalReviews: empReviews.length,
      totalBadges: empBadges.length,
      avgRating: empReviews.length > 0 ? empReviews.reduce((sum, r) => sum + r.rating, 0) / empReviews.length : 0,
      byType,
      trustScore: trust?.overall || 0,
      tier: getTier(empBadges)
    }
  });
});

function getTier(badgeList: Badge[]): string {
  if (badgeList.some(b => b.tier === 'platinum')) return 'platinum';
  if (badgeList.some(b => b.tier === 'gold')) return 'gold';
  if (badgeList.some(b => b.tier === 'silver')) return 'silver';
  return 'bronze';
}

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Reputation Twin Service - Started               ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Reviews, Trust Scores, Badges, Achievements  ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
