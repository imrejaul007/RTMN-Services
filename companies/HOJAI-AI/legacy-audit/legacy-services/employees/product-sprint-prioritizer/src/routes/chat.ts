import { Router, Request, Response } from 'express';
import { persona } from '../persona';
import type { ChatRequest, ChatResponse } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, history = [], metadata = {} } = req.body as ChatRequest;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response: ChatResponse = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: `Sprint Prioritizer response for: ${message}`,
      sprintPlan: {
        sprintNumber: metadata.sprintNumber || 1,
        goal: 'Deliver [feature] with measurable impact on [metric]',
        duration: '2 weeks',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 40,
        velocity: {
          historicalAvg: 35,
          adjustedCapacity: 34,
          buffer: 6
        },
        stories: [
          { id: 'ST-001', title: 'User authentication feature', points: 8, priority: 'P0', assignee: 'Dev 1', dependencies: [] },
          { id: 'ST-002', title: 'Dashboard UI update', points: 5, priority: 'P1', assignee: 'Dev 2', dependencies: ['ST-001'] },
          { id: 'ST-003', title: 'API integration', points: 8, priority: 'P0', assignee: 'Dev 3', dependencies: [] },
          { id: 'ST-004', title: 'Performance optimization', points: 3, priority: 'P2', assignee: 'Dev 1', dependencies: ['ST-001', 'ST-003'] }
        ]
      },
      prioritization: {
        framework: 'RICE',
        items: [
          { id: 'FEAT-001', title: 'User authentication', score: 125, rank: 1, reach: 1000, impact: 0.5, confidence: 0.75, effort: 3 },
          { id: 'FEAT-002', title: 'Dashboard redesign', score: 83, rank: 2, reach: 800, impact: 0.5, confidence: 0.8, effort: 4 },
          { id: 'FEAT-003', title: 'Performance improvements', score: 62, rank: 3, reach: 500, impact: 0.75, confidence: 0.6, effort: 4 },
          { id: 'FEAT-004', title: 'New reporting feature', score: 45, rank: 4, reach: 300, impact: 0.5, confidence: 0.9, effort: 6 }
        ],
        rationale: 'Prioritized by RICE score considering user reach, business impact, confidence level, and development effort'
      },
      capacity: {
        teamCapacity: 40,
        availableDays: 10,
        vacation: 2,
        meetings: 3,
        netCapacity: 35,
        buffer: 5,
        effectiveCapacity: 30,
        assignments: [
          { member: 'Dev 1', role: 'Backend', capacity: 10, allocation: 'Auth + API' },
          { member: 'Dev 2', role: 'Frontend', capacity: 10, allocation: 'Dashboard UI' },
          { member: 'Dev 3', role: 'Full Stack', capacity: 10, allocation: 'Integration' },
          { member: 'Dev 4', role: 'QA', capacity: 10, allocation: 'Testing' }
        ]
      },
      agent: 'sprint-prioritizer',
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
