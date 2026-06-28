import { requireAuth } from '@rtmn/shared/auth';
/**
 * Performance Review Twin Service v1.0
 * Digital twin for formal performance reviews
 * Port: 4903
 */

import express, { type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  period: string;
  type: 'annual' | 'mid_year' | 'probation' | 'promotion';
  overallRating: number;
  ratings: ReviewRating[];
  achievements: string[];
  areasForImprovement: string[];
  developmentPlan: DevelopmentItem[];
  recommendations: string[];
  status: 'draft' | 'submitted' | 'meeting_scheduled' | 'completed';
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRating {
  category: string;
  rating: number;
  maxRating: number;
  comments?: string;
}

export interface DevelopmentItem {
  id: string;
  title: string;
  description: string;
  targetDate?: string;
  status: 'planned' | 'in_progress' | 'completed';
}

export function createPerformanceReviewTwinService() {
  const reviews: Map<string, PerformanceReview> = new Map();

  const app = express();
  app.use(express.json());

  app.post('/api/reviews',requireAuth,  (req: Request, res: Response) => {
    const { employeeId, reviewerId, period, type, ratings, achievements, areasForImprovement, developmentPlan } = req.body;
    if (!employeeId || !reviewerId || !period || !type) {
      return res.status(400).json({ error: 'employeeId, reviewerId, period, and type are required' });
    }

    const overallRating = ratings?.length > 0
      ? ratings.reduce((sum, r) => sum + (r.rating / r.maxRating) * 100, 0) / ratings.length
      : 0;

    const review: PerformanceReview = {
      id: uuidv4(),
      employeeId,
      reviewerId,
      period,
      type,
      overallRating: Math.round(overallRating),
      ratings: ratings || [],
      achievements: achievements || [],
      areasForImprovement: areasForImprovement || [],
      developmentPlan: (developmentPlan || []).map(d => ({ ...d, id: uuidv4() })),
      recommendations: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    reviews.set(review.id, review);
    return res.status(201).json(review);
  });

  app.get('/api/reviews', (req: Request, res: Response) => {
    const { employeeId, reviewerId, period, type, status } = req.query;
    let filtered = Array.from(reviews.values());
    if (employeeId) filtered = filtered.filter(r => r.employeeId === employeeId);
    if (reviewerId) filtered = filtered.filter(r => r.reviewerId === reviewerId);
    if (period) filtered = filtered.filter(r => r.period === period);
    if (type) filtered = filtered.filter(r => r.type === type);
    if (status) filtered = filtered.filter(r => r.status === status);
    return res.status(200).json({ reviews: filtered, total: filtered.length });
  });

  app.get('/api/reviews/analytics', (req: Request, res: Response) => {
    const { period } = req.query;
    let filtered = Array.from(reviews.values());
    if (period) filtered = filtered.filter(r => r.period === period);

    const avgRating = filtered.length > 0
      ? filtered.reduce((sum, r) => sum + r.overallRating, 0) / filtered.length
      : 0;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    filtered.forEach(r => {
      byType[r.type] = (byType[r.type] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });

    return res.status(200).json({ total: filtered.length, avgRating, byType, byStatus });
  });

  app.get('/api/reviews/:id', (req: Request, res: Response) => {
    const review = reviews.get(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    return res.status(200).json(review);
  });

  app.put('/api/reviews/:id',requireAuth,  (req: Request, res: Response) => {
    const review = reviews.get(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    if (req.body.status) {
      review.status = req.body.status;
      if (req.body.status === 'submitted') review.submittedAt = new Date().toISOString();
      if (req.body.status === 'completed') review.completedAt = new Date().toISOString();
    }
    if (req.body.recommendations) review.recommendations = req.body.recommendations;
    review.updatedAt = new Date().toISOString();

    reviews.set(review.id, review);
    return res.status(200).json(review);
  });

  app.delete('/api/reviews/:id',requireAuth,  (req: Request, res: Response) => {
    if (!reviews.has(req.params.id)) return res.status(404).json({ error: 'Review not found' });
    reviews.delete(req.params.id);
    return res.status(204).send();
  });

  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({ status: 'healthy', service: 'performance-review-twin', timestamp: new Date().toISOString() });
  });

  return app;
}

export default createPerformanceReviewTwinService;