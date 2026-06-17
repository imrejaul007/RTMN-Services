import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5046;

app.use(cors());
app.use(express.json());

// Mock data generators
const generateMockVisitors = () => {
  const zones = ['entrance', 'zone-a', 'zone-b', 'zone-c', 'booths', 'food-court', 'exit'];
  return zones.map(zone => ({
    zone,
    currentVisitors: Math.floor(Math.random() * 500) + 100,
    avgDwellTime: Math.floor(Math.random() * 300) + 60,
    peakHour: `${Math.floor(Math.random() * 12) + 8}:00`,
    conversions: Math.floor(Math.random() * 50) + 10
  }));
};

const generateHeatmapData = () => {
  const points = [];
  for (let i = 0; i < 100; i++) {
    points.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      intensity: Math.random()
    });
  }
  return points;
};

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'exhibition-analytics-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Real-time visitor stats
app.get('/api/analytics/visitors', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      total: 1247,
      activeNow: 342,
      uniqueToday: 4521,
      returningRate: 0.28,
      avgSessionTime: 847,
      zones: generateMockVisitors()
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Heatmap data
app.get('/api/analytics/heatmap', (req: Request, res: Response) => {
  const zone = req.query.zone as string || 'main-hall';
  res.json({
    success: true,
    data: {
      zone,
      resolution: '1920x1080',
      dataPoints: generateHeatmapData(),
      hotspots: [
        { x: 25, y: 30, radius: 15, intensity: 0.95 },
        { x: 60, y: 45, radius: 20, intensity: 0.88 },
        { x: 80, y: 20, radius: 12, intensity: 0.72 }
      ]
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Booth engagement
app.get('/api/analytics/booths', (req: Request, res: Response) => {
  const booths = ['booth-001', 'booth-002', 'booth-003', 'booth-004', 'booth-005'];
  res.json({
    success: true,
    data: booths.map(id => ({
      id,
      name: `Exhibitor ${id.split('-')[1]}`,
      visits: Math.floor(Math.random() * 500) + 100,
      avgDwellTime: Math.floor(Math.random() * 180) + 60,
      interactions: Math.floor(Math.random() * 50) + 10,
      leads: Math.floor(Math.random() * 30) + 5,
      nps: Math.floor(Math.random() * 40) + 60
    })),
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Event performance metrics
app.get('/api/analytics/performance', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalRegistrations: 5234,
      checkedIn: 4521,
      checkedOut: 3274,
      ticketTypes: {
        vip: { sold: 120, used: 115 },
        premium: { sold: 856, used: 821 },
        standard: { sold: 4258, used: 3585 }
      },
      revenue: {
        tickets: 156780,
        upgrades: 23400,
        sponsorships: 85000
      },
      engagement: {
        avgBoothVisits: 4.2,
        avgSessionDuration: 847,
        networkingRequests: 1247,
        meetingsScheduled: 892
      }
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Track visitor movement
app.post('/api/analytics/track', (req: Request, res: Response) => {
  const { visitorId, zone, action, metadata } = req.body;
  res.json({
    success: true,
    data: {
      tracked: true,
      visitorId,
      zone,
      action,
      timestamp: new Date().toISOString()
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Demographics
app.get('/api/analytics/demographics', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      byIndustry: [
        { name: 'Technology', count: 1523, percentage: 34 },
        { name: 'Healthcare', count: 876, percentage: 19 },
        { name: 'Finance', count: 654, percentage: 15 },
        { name: 'Manufacturing', count: 432, percentage: 10 },
        { name: 'Retail', count: 398, percentage: 9 },
        { name: 'Other', count: 638, percentage: 14 }
      ],
      byRole: [
        { name: 'C-Level', count: 452, percentage: 10 },
        { name: 'Director', count: 1234, percentage: 27 },
        { name: 'Manager', count: 1567, percentage: 35 },
        { name: 'Individual Contributor', count: 1268, percentage: 28 }
      ],
      byRegion: [
        { name: 'North America', count: 1808, percentage: 40 },
        { name: 'Europe', count: 1130, percentage: 25 },
        { name: 'Asia Pacific', count: 904, percentage: 20 },
        { name: 'Other', count: 679, percentage: 15 }
      ]
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

app.listen(PORT, () => {
  console.log(`Exhibition Analytics Service running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
