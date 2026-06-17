import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5049;

app.use(cors());
app.use(express.json());

// Types
interface Copilot {
  id: string;
  name: string;
  type: 'sales' | 'support' | 'analytics' | 'navigation' | 'recommendation';
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Briefing {
  id: string;
  userId: string;
  type: 'morning' | 'evening' | 'on-demand';
  content: {
    highlights: string[];
    recommendations: string[];
    schedule: string[];
  };
  createdAt: string;
}

// Mock Data
const copilots: Copilot[] = [
  {
    id: 'copilot-1',
    name: 'Exhibition Guide',
    type: 'navigation',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'copilot-2',
    name: 'Deal Finder',
    type: 'recommendation',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'copilot-3',
    name: 'Sales Assistant',
    type: 'sales',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'copilot-4',
    name: 'Support Bot',
    type: 'support',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

const briefings: Briefing[] = [
  {
    id: 'briefing-1',
    userId: 'user-1',
    type: 'morning',
    content: {
      highlights: [
        'Tech Pavilion opens at 9 AM - AI startups showcase',
        'Networking lunch at 12:30 PM - Hall B',
        'Keynote: Future of Exhibitions at 3 PM'
      ],
      recommendations: [
        'Visit the Innovation Zone for trending products',
        'Book a demo at Booth A-12'
      ],
      schedule: [
        '09:00 - Tech Pavilion opens',
        '10:00 - Panel: Digital Transformation',
        '12:30 - Networking Lunch',
        '15:00 - Keynote Speech'
      ]
    },
    createdAt: new Date().toISOString()
  }
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
    service: 'exhibition-intelligence-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Copilot routes
app.get('/api/copilots', (req: Request, res: Response) => {
  res.json(response(copilots, req));
});

app.get('/api/copilots/:id', (req: Request, res: Response) => {
  const copilot = copilots.find(c => c.id === req.params.id);
  if (!copilot) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Copilot not found' },
      meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
    });
  }
  res.json(response(copilot, req));
});

app.post('/api/copilots', (req: Request, res: Response) => {
  const copilot: Copilot = {
    id: uuidv4(),
    name: req.body.name,
    type: req.body.type,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  copilots.push(copilot);
  res.status(201).json(response(copilot, req));
});

app.post('/api/copilots/:id/ask', (req: Request, res: Response) => {
  const copilot = copilots.find(c => c.id === req.params.id);
  if (!copilot) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Copilot not found' }
    });
  }

  const answer = {
    copilotId: copilot.id,
    question: req.body.question,
    answer: `Based on the ${copilot.type} copilot, here's my recommendation...`,
    suggestions: [
      'Visit Booth A-15 for exclusive deals',
      'Check out the new product launch at 2 PM',
      'Connect with industry leaders at the evening mixer'
    ]
  };
  res.json(response(answer, req));
});

// Briefing routes
app.get('/api/briefings', (req: Request, res: Response) => {
  res.json(response(briefings, req));
});

app.get('/api/briefings/:id', (req: Request, res: Response) => {
  const briefing = briefings.find(b => b.id === req.params.id);
  if (!briefing) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Briefing not found' }
    });
  }
  res.json(response(briefing, req));
});

app.post('/api/briefings', (req: Request, res: Response) => {
  const briefing: Briefing = {
    id: uuidv4(),
    userId: req.body.userId || 'user-1',
    type: req.body.type || 'on-demand',
    content: req.body.content || {
      highlights: ['Event updates', 'New exhibitors', 'Special offers'],
      recommendations: ['Visit Hall C', 'Attend workshop at 4 PM'],
      schedule: ['Morning: Opening ceremony', 'Afternoon: Demo sessions']
    },
    createdAt: new Date().toISOString()
  };
  briefings.push(briefing);
  res.status(201).json(response(briefing, req));
});

app.get('/api/briefings/user/:userId', (req: Request, res: Response) => {
  const userBriefings = briefings.filter(b => b.userId === req.params.userId);
  res.json(response(userBriefings, req));
});

// Analytics endpoint
app.get('/api/analytics', (req: Request, res: Response) => {
  const analytics = {
    totalQueries: 1247,
    copilotsActive: copilots.filter(c => c.status === 'active').length,
    briefingsGenerated: briefings.length,
    popularTopics: [
      { topic: 'Product Information', count: 423 },
      { topic: 'Booth Locations', count: 312 },
      { topic: 'Special Offers', count: 298 },
      { topic: 'Schedule & Events', count: 214 }
    ],
    hourlyStats: [
      { hour: '09:00', queries: 89 },
      { hour: '10:00', queries: 156 },
      { hour: '11:00', queries: 203 },
      { hour: '12:00', queries: 178 },
      { hour: '13:00', queries: 145 },
      { hour: '14:00', queries: 189 },
      { hour: '15:00', queries: 167 },
      { hour: '16:00', queries: 120 }
    ]
  };
  res.json(response(analytics, req));
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
  console.log(`Exhibition Intelligence Service running on port ${PORT}`);
});

export default app;
