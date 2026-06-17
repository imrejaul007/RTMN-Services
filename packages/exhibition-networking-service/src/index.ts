import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5052;

app.use(cors());
app.use(express.json());

// Mock data
const profiles = [
  {
    id: '1',
    name: 'Alice Johnson',
    company: 'Tech Innovations',
    role: 'CEO',
    avatar: 'https://i.pravatar.cc/150?u=alice',
    industry: 'Technology',
    interests: ['AI', 'Startups', 'Investing'],
    bio: 'Passionate about building the future of tech.'
  },
  {
    id: '2',
    name: 'Bob Smith',
    company: 'Design Studio',
    role: 'Creative Director',
    avatar: 'https://i.pravatar.cc/150?u=bob',
    industry: 'Design',
    interests: ['UI/UX', 'Branding', 'Innovation'],
    bio: 'Creating beautiful experiences that matter.'
  },
  {
    id: '3',
    name: 'Carol Williams',
    company: 'Green Energy Co',
    role: 'VP Sales',
    avatar: 'https://i.pravatar.cc/150?u=carol',
    industry: 'Energy',
    interests: ['Sustainability', 'CleanTech', 'Sales'],
    bio: 'Driving the transition to sustainable energy.'
  }
];

const connections: Record<string, string[]> = {
  '1': ['2', '3'],
  '2': ['1'],
  '3': ['1']
};

const messages: Array<{
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  read: boolean;
}> = [];

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'exhibition-networking-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Profiles
app.get('/api/profiles', (_req: Request, res: Response) => {
  res.json({ success: true, data: profiles });
});

app.get('/api/profiles/:id', (req: Request, res: Response) => {
  const profile = profiles.find(p => p.id === req.params.id);
  if (!profile) {
    return res.status(404).json({ success: false, error: 'Profile not found' });
  }
  res.json({ success: true, data: profile });
});

app.post('/api/profiles', (req: Request, res: Response) => {
  const newProfile = {
    id: uuidv4(),
    ...req.body,
    avatar: `https://i.pravatar.cc/150?u=${uuidv4()}`
  };
  profiles.push(newProfile);
  connections[newProfile.id] = [];
  res.status(201).json({ success: true, data: newProfile });
});

// Connections
app.get('/api/connections/:userId', (req: Request, res: Response) => {
  const userConnections = connections[req.params.userId] || [];
  const connectedProfiles = profiles.filter(p => userConnections.includes(p.id));
  res.json({ success: true, data: connectedProfiles });
});

app.post('/api/connections', (req: Request, res: Response) => {
  const { fromUserId, toUserId } = req.body;

  if (!connections[fromUserId]) {
    connections[fromUserId] = [];
  }
  if (!connections[fromUserId].includes(toUserId)) {
    connections[fromUserId].push(toUserId);
  }

  res.json({ success: true, message: 'Connection request sent' });
});

app.delete('/api/connections', (req: Request, res: Response) => {
  const { fromUserId, toUserId } = req.body;

  if (connections[fromUserId]) {
    connections[fromUserId] = connections[fromUserId].filter(id => id !== toUserId);
  }

  res.json({ success: true, message: 'Connection removed' });
});

// Messages
app.get('/api/messages/:userId', (req: Request, res: Response) => {
  const userMessages = messages.filter(
    m => m.to === req.params.userId || m.from === req.params.userId
  );
  res.json({ success: true, data: userMessages });
});

app.post('/api/messages', (req: Request, res: Response) => {
  const message = {
    id: uuidv4(),
    from: req.body.from,
    to: req.body.to,
    content: req.body.content,
    timestamp: new Date().toISOString(),
    read: false
  };
  messages.push(message);
  res.status(201).json({ success: true, data: message });
});

app.patch('/api/messages/:id/read', (req: Request, res: Response) => {
  const message = messages.find(m => m.id === req.params.id);
  if (message) {
    message.read = true;
    return res.json({ success: true, data: message });
  }
  res.status(404).json({ success: false, error: 'Message not found' });
});

// Search
app.get('/api/search', (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase();
  const results = profiles.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.company.toLowerCase().includes(query) ||
    p.industry.toLowerCase().includes(query)
  );
  res.json({ success: true, data: results });
});

app.listen(PORT, () => {
  console.log(`Exhibition Networking Service running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

export default app;
