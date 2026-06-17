import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5054;

app.use(cors());
app.use(express.json());

// Mock data
interface Mission {
  id: string;
  title: string;
  description: string;
  category: 'networking' | 'exploration' | 'engagement' | 'discovery';
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;
  requirements: {
    type: string;
    count: number;
    description: string;
  };
  rewards: {
    type: 'points' | 'badge' | 'unlock';
    value: string;
    description: string;
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointsRequired: number;
}

interface UserProgress {
  odingoId: string;
  odingoName: string;
  level: number;
  points: number;
  totalPoints: number;
  badges: string[];
  missionsCompleted: string[];
  missionsInProgress: string[];
  streak: number;
  lastActive: string;
}

const missions: Mission[] = [
  {
    id: '1',
    title: 'First Contact',
    description: 'Connect with 3 exhibitors',
    category: 'networking',
    points: 50,
    difficulty: 'easy',
    icon: '🤝',
    requirements: { type: 'connections', count: 3, description: 'Make 3 new connections' },
    rewards: { type: 'badge', value: 'networker-bronze', description: 'Bronze Networker badge' }
  },
  {
    id: '2',
    title: 'Booth Explorer',
    description: 'Visit 10 different booths',
    category: 'exploration',
    points: 100,
    difficulty: 'medium',
    icon: '🗺️',
    requirements: { type: 'booth_visits', count: 10, description: 'Check in at 10 booths' },
    rewards: { type: 'badge', value: 'explorer-silver', description: 'Silver Explorer badge' }
  },
  {
    id: '3',
    title: 'Meeting Master',
    description: 'Schedule 5 meetings',
    category: 'engagement',
    points: 150,
    difficulty: 'medium',
    icon: '📅',
    requirements: { type: 'appointments', count: 5, description: 'Book 5 appointments' },
    rewards: { type: 'points', value: '150', description: '150 bonus points' }
  },
  {
    id: '4',
    title: 'VIP Hunt',
    description: 'Meet 3 speakers or VIPs',
    category: 'discovery',
    points: 200,
    difficulty: 'hard',
    icon: '⭐',
    requirements: { type: 'vip_meetings', count: 3, description: 'Connect with 3 VIPs' },
    rewards: { type: 'badge', value: 'vip-hunter', description: 'VIP Hunter exclusive badge' }
  },
  {
    id: '5',
    title: 'Social Butterfly',
    description: 'Send 10 messages',
    category: 'networking',
    points: 75,
    difficulty: 'easy',
    icon: '💬',
    requirements: { type: 'messages', count: 10, description: 'Send 10 messages' },
    rewards: { type: 'points', value: '75', description: '75 points' }
  },
  {
    id: '6',
    title: 'Demo Expert',
    description: 'Attend 5 product demos',
    category: 'engagement',
    points: 125,
    difficulty: 'medium',
    icon: '🎯',
    requirements: { type: 'demos', count: 5, description: 'Attend 5 product demonstrations' },
    rewards: { type: 'badge', value: 'demo-master', description: 'Demo Expert badge' }
  }
];

const badges: Badge[] = [
  { id: 'networker-bronze', name: 'Bronze Networker', description: 'Made 3 connections', icon: '🥉', category: 'bronze', pointsRequired: 50 },
  { id: 'networker-silver', name: 'Silver Networker', description: 'Made 10 connections', icon: '🥈', category: 'silver', pointsRequired: 200 },
  { id: 'networker-gold', name: 'Gold Networker', description: 'Made 25 connections', icon: '🥇', category: 'gold', pointsRequired: 500 },
  { id: 'explorer-silver', name: 'Silver Explorer', description: 'Visited 10 booths', icon: '🗺️', category: 'silver', pointsRequired: 200 },
  { id: 'explorer-gold', name: 'Gold Explorer', description: 'Visited 25 booths', icon: '🌍', category: 'gold', pointsRequired: 500 },
  { id: 'vip-hunter', name: 'VIP Hunter', description: 'Met 3 VIPs', icon: '⭐', category: 'platinum', pointsRequired: 1000 },
  { id: 'demo-master', name: 'Demo Expert', description: 'Attended 5 demos', icon: '🎯', category: 'silver', pointsRequired: 250 },
  { id: 'champion', name: 'Exhibition Champion', description: 'Top 10% participant', icon: '🏆', category: 'platinum', pointsRequired: 2000 }
];

const userProgress: Record<string, UserProgress> = {
  '1': {
    odingoId: '1',
    odingoName: 'Alice Johnson',
    level: 5,
    points: 450,
    totalPoints: 1200,
    badges: ['networker-bronze', 'demo-master'],
    missionsCompleted: ['1', '5'],
    missionsInProgress: ['2', '3'],
    streak: 3,
    lastActive: new Date().toISOString()
  }
};

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'exhibition-passport-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Missions
app.get('/api/missions', (_req: Request, res: Response) => {
  res.json({ success: true, data: missions });
});

app.get('/api/missions/:id', (req: Request, res: Response) => {
  const mission = missions.find(m => m.id === req.params.id);
  if (!mission) {
    return res.status(404).json({ success: false, error: 'Mission not found' });
  }
  res.json({ success: true, data: mission });
});

app.get('/api/missions/category/:category', (req: Request, res: Response) => {
  const filteredMissions = missions.filter(m => m.category === req.params.category);
  res.json({ success: true, data: filteredMissions });
});

// Badges
app.get('/api/badges', (_req: Request, res: Response) => {
  res.json({ success: true, data: badges });
});

app.get('/api/badges/:id', (req: Request, res: Response) => {
  const badge = badges.find(b => b.id === req.params.id);
  if (!badge) {
    return res.status(404).json({ success: false, error: 'Badge not found' });
  }
  res.json({ success: true, data: badge });
});

// User Progress
app.get('/api/progress/:userId', (req: Request, res: Response) => {
  const progress = userProgress[req.params.userId];
  if (!progress) {
    return res.status(404).json({ success: false, error: 'Progress not found' });
  }
  res.json({ success: true, data: progress });
});

app.get('/api/leaderboard', (_req: Request, res: Response) => {
  const leaderboard = Object.values(userProgress)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((p, index) => ({
      rank: index + 1,
      ...p
    }));
  res.json({ success: true, data: leaderboard });
});

app.post('/api/progress/:userId', (req: Request, res: Response) => {
  const userId = req.params.userId;

  if (!userProgress[userId]) {
    userProgress[userId] = {
      odingoId: userId,
      odingoName: req.body.odingoName || 'Anonymous',
      level: 1,
      points: 0,
      totalPoints: 0,
      badges: [],
      missionsCompleted: [],
      missionsInProgress: [],
      streak: 0,
      lastActive: new Date().toISOString()
    };
  }

  const progress = userProgress[userId];

  // Update progress based on action
  const { action, missionId, points } = req.body;

  if (action === 'complete_mission' && missionId) {
    if (!progress.missionsCompleted.includes(missionId)) {
      progress.missionsCompleted.push(missionId);
      progress.missionsInProgress = progress.missionsInProgress.filter(id => id !== missionId);
      const mission = missions.find(m => m.id === missionId);
      if (mission) {
        progress.points += mission.points;
        progress.totalPoints += mission.points;
        // Check for badge unlocks
        checkAndUnlockBadges(progress);
      }
    }
  } else if (action === 'add_points' && points) {
    progress.points += points;
    progress.totalPoints += points;
  }

  progress.lastActive = new Date().toISOString();
  res.json({ success: true, data: progress });
});

function checkAndUnlockBadges(progress: UserProgress) {
  badges.forEach(badge => {
    if (!progress.badges.includes(badge.id) && progress.totalPoints >= badge.pointsRequired) {
      progress.badges.push(badge.id);
    }
  });
}

// Stats
app.get('/api/stats', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalMissions: missions.length,
      totalBadges: badges.length,
      activeUsers: Object.keys(userProgress).length,
      totalCompletions: Object.values(userProgress).reduce((sum, p) => sum + p.missionsCompleted.length, 0)
    }
  });
});

app.listen(PORT, () => {
  console.log(`Exhibition Passport Service running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

export default app;
