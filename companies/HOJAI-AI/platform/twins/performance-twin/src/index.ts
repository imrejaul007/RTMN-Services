/**
 * Performance Twin Service v1.0
 * Digital twin for employee performance tracking
 * Port: 4898
 */

import express, { type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface PerformanceRecord {
  id: string;
  employeeId: string;
  period: PerformancePeriod;
  metrics: PerformanceMetric[];
  overallScore: number;
  rating: PerformanceRating;
  strengths: string[];
  improvements: string[];
  goals: string[];
  feedback: Feedback[];
  status: 'draft' | 'submitted' | 'reviewed' | 'acknowledged';
  submittedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  description?: string;
  weight: number;
  score: number;
  maxScore: number;
  notes?: string;
}

export interface Feedback {
  id: string;
  reviewerId: string;
  reviewerName: string;
  type: 'peer' | 'manager' | 'self' | 'client';
  comment: string;
  rating?: number;
  createdAt: string;
}

export type PerformancePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type PerformanceRating = 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'unsatisfactory';

export interface PerformanceCreate {
  employeeId: string;
  period: PerformancePeriod;
  metrics?: Omit<PerformanceMetric, 'id'>[];
  feedback?: Omit<Feedback, 'id' | 'createdAt'>[];
}

export interface PerformanceUpdate {
  metrics?: PerformanceMetric[];
  overallScore?: number;
  rating?: PerformanceRating;
  strengths?: string[];
  improvements?: string[];
  goals?: string[];
  status?: 'draft' | 'submitted' | 'reviewed' | 'acknowledged';
}

// Helper to calculate rating from score
function calculateRating(score: number): PerformanceRating {
  if (score >= 90) return 'exceeds_expectations';
  if (score >= 70) return 'meets_expectations';
  if (score >= 50) return 'needs_improvement';
  return 'unsatisfactory';
}

// Create PerformanceTwin service
export function createPerformanceTwinService() {
  const records: Map<string, PerformanceRecord> = new Map();

  const app = express();
  app.use(express.json());

  // POST /api/performance - Create performance record
  app.post('/api/performance', (req: Request, res: Response) => {
    const { employeeId, period, metrics, feedback } = req.body;

    if (!employeeId || !period) {
      return res.status(400).json({ error: 'employeeId and period are required' });
    }

    const record: PerformanceRecord = {
      id: uuidv4(),
      employeeId,
      period,
      metrics: (metrics || []).map(m => ({ ...m, id: uuidv4() })),
      overallScore: 0,
      rating: 'meets_expectations',
      strengths: [],
      improvements: [],
      goals: [],
      feedback: (feedback || []).map(f => ({
        ...f,
        id: uuidv4(),
        createdAt: new Date().toISOString()
      })),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Calculate overall score
    if (record.metrics.length > 0) {
      const totalWeighted = record.metrics.reduce((sum, m) => {
        return sum + (m.score / m.maxScore) * m.weight * 100;
      }, 0);
      const totalWeight = record.metrics.reduce((sum, m) => sum + m.weight, 0);
      record.overallScore = totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;
      record.rating = calculateRating(record.overallScore);
    }

    records.set(record.id, record);
    return res.status(201).json(record);
  });

  // GET /api/performance - List records (MUST come before :id)
  app.get('/api/performance', (req: Request, res: Response) => {
    const { employeeId, period, status, rating } = req.query;
    let filtered = Array.from(records.values());

    if (employeeId) filtered = filtered.filter(r => r.employeeId === employeeId);
    if (period) filtered = filtered.filter(r => r.period === period);
    if (status) filtered = filtered.filter(r => r.status === status);
    if (rating) filtered = filtered.filter(r => r.rating === rating);

    return res.status(200).json({ records: filtered, total: filtered.length });
  });

  // GET /api/performance/analytics - Analytics
  app.get('/api/performance/analytics', (req: Request, res: Response) => {
    const { employeeId } = req.query;
    let filtered = Array.from(records.values());

    if (employeeId) filtered = filtered.filter(r => r.employeeId === employeeId);

    const byRating: Record<string, number> = {};
    const byPeriod: Record<string, number> = {};
    let totalScore = 0;

    filtered.forEach(record => {
      byRating[record.rating] = (byRating[record.rating] || 0) + 1;
      byPeriod[record.period] = (byPeriod[record.period] || 0) + 1;
      totalScore += record.overallScore;
    });

    return res.status(200).json({
      total: filtered.length,
      byRating,
      byPeriod,
      avgScore: filtered.length > 0 ? totalScore / filtered.length : 0,
      distribution: byRating
    });
  });

  // GET /api/performance/:id - Get record
  app.get('/api/performance/:id', (req: Request, res: Response) => {
    const record = records.get(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Performance record not found' });
    }
    return res.status(200).json(record);
  });

  // PUT /api/performance/:id - Update record
  app.put('/api/performance/:id', (req: Request, res: Response) => {
    const record = records.get(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Performance record not found' });
    }

    const updates = req.body;

    if (updates.metrics) {
      record.metrics = updates.metrics;
      // Recalculate score
      if (record.metrics.length > 0) {
        const totalWeighted = record.metrics.reduce((sum, m) => {
          return sum + (m.score / m.maxScore) * m.weight * 100;
        }, 0);
        const totalWeight = record.metrics.reduce((sum, m) => sum + m.weight, 0);
        record.overallScore = totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;
        record.rating = calculateRating(record.overallScore);
      }
    }

    if (updates.overallScore !== undefined) {
      record.overallScore = updates.overallScore;
      record.rating = calculateRating(updates.overallScore);
    }

    if (updates.rating) record.rating = updates.rating;
    if (updates.strengths) record.strengths = updates.strengths;
    if (updates.improvements) record.improvements = updates.improvements;
    if (updates.goals) record.goals = updates.goals;

    if (updates.status) {
      record.status = updates.status;
      if (updates.status === 'submitted') record.submittedAt = new Date().toISOString();
      if (updates.status === 'reviewed') record.reviewedAt = new Date().toISOString();
    }

    record.updatedAt = new Date().toISOString();
    records.set(record.id, record);
    return res.status(200).json(record);
  });

  // DELETE /api/performance/:id - Delete record
  app.delete('/api/performance/:id', (req: Request, res: Response) => {
    if (!records.has(req.params.id)) {
      return res.status(404).json({ error: 'Performance record not found' });
    }
    records.delete(req.params.id);
    return res.status(204).send();
  });

  // POST /api/performance/:id/feedback - Add feedback
  app.post('/api/performance/:id/feedback', (req: Request, res: Response) => {
    const record = records.get(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Performance record not found' });
    }

    const { reviewerId, reviewerName, type, comment, rating } = req.body;
    if (!reviewerId || !reviewerName || !type || !comment) {
      return res.status(400).json({ error: 'reviewerId, reviewerName, type, and comment are required' });
    }

    const feedback: Feedback = {
      id: uuidv4(),
      reviewerId,
      reviewerName,
      type,
      comment,
      rating,
      createdAt: new Date().toISOString()
    };

    record.feedback.push(feedback);
    record.updatedAt = new Date().toISOString();
    records.set(record.id, record);
    return res.status(201).json(feedback);
  });

  // GET /health - Health check
  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({
      status: 'healthy',
      service: 'performance-twin',
      timestamp: new Date().toISOString(),
      records: records.size
    });
  });

  return app;
}

export default createPerformanceTwinService;