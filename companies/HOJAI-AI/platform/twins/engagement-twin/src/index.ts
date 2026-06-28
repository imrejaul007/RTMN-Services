import { requireAuth } from '@rtmn/shared/auth';
/**
 * Engagement Twin Service v1.0
 * Digital twin for employee engagement tracking
 * Port: 4901
 */

import express, { type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface EngagementSurvey {
  id: string;
  employeeId: string;
  period: string;
  overallScore: number;
  dimensions: EngagementDimension[];
  responses: SurveyResponse[];
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  createdAt: string;
}

export interface EngagementDimension {
  name: string;
  score: number;
  questions: string[];
}

export interface SurveyResponse {
  questionId: string;
  question: string;
  answer: string | number;
  score: number;
}

export function createEngagementTwinService() {
  const surveys: Map<string, EngagementSurvey> = new Map();

  const app = express();
  app.use(express.json());

  app.post('/api/engagement',requireAuth,  (req: Request, res: Response) => {
    const { employeeId, period, dimensions, responses } = req.body;
    if (!employeeId || !period) {
      return res.status(400).json({ error: 'employeeId and period are required' });
    }

    const survey: EngagementSurvey = {
      id: uuidv4(),
      employeeId,
      period,
      overallScore: 0,
      dimensions: dimensions || [],
      responses: (responses || []).map(r => ({ ...r, questionId: uuidv4() })),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (survey.dimensions.length > 0) {
      survey.overallScore = survey.dimensions.reduce((sum, d) => sum + d.score, 0) / survey.dimensions.length;
    }

    surveys.set(survey.id, survey);
    return res.status(201).json(survey);
  });

  app.get('/api/engagement', (req: Request, res: Response) => {
    const { employeeId, period, status } = req.query;
    let filtered = Array.from(surveys.values());
    if (employeeId) filtered = filtered.filter(s => s.employeeId === employeeId);
    if (period) filtered = filtered.filter(s => s.period === period);
    if (status) filtered = filtered.filter(s => s.status === status);
    return res.status(200).json({ surveys: filtered, total: filtered.length });
  });

  app.get('/api/engagement/analytics', (req: Request, res: Response) => {
    const { period } = req.query;
    let filtered = Array.from(surveys.values());
    if (period) filtered = filtered.filter(s => s.period === period);

    const avgScore = filtered.length > 0 ? filtered.reduce((sum, s) => sum + s.overallScore, 0) / filtered.length : 0;
    const byStatus: Record<string, number> = {};
    filtered.forEach(s => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });

    return res.status(200).json({ total: filtered.length, avgScore, byStatus });
  });

  app.get('/api/engagement/:id', (req: Request, res: Response) => {
    const survey = surveys.get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    return res.status(200).json(survey);
  });

  app.put('/api/engagement/:id',requireAuth,  (req: Request, res: Response) => {
    const survey = surveys.get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    if (req.body.status) {
      survey.status = req.body.status;
      if (req.body.status === 'completed') survey.completedAt = new Date().toISOString();
    }
    surveys.set(survey.id, survey);
    return res.status(200).json(survey);
  });

  app.delete('/api/engagement/:id',requireAuth,  (req: Request, res: Response) => {
    if (!surveys.has(req.params.id)) return res.status(404).json({ error: 'Survey not found' });
    surveys.delete(req.params.id);
    return res.status(204).send();
  });

  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({ status: 'healthy', service: 'engagement-twin', timestamp: new Date().toISOString() });
  });

  return app;
}

export default createEngagementTwinService;