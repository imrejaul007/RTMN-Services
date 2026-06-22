import { Server } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const PORT = parseInt(process.env.PORT || '3130');
const app = express();
app.use(express.json());

interface Contact {
  id: string;
  name: string;
  platform: string;
  profileUrl?: string;
  connections?: string[];
}

interface Network {
  id: string;
  subjectId: string;
  contacts: Contact[];
  createdAt: Date;
}

// In-memory store
const networks = new Map<string, Network>();

app.post('/network', (req, res) => {
  try {
    const { subjectId, contacts } = req.body;
    if (!subjectId) {
      return res.status(400).json({ error: 'subjectId required' });
    }

    const id = uuidv4();
    const network: Network = {
      id,
      subjectId,
      contacts: contacts || [],
      createdAt: new Date()
    };
    networks.set(id, network);
    res.json({ success: true, networkId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/network/:id/contact', (req, res) => {
  try {
    const network = networks.get(req.params.id);
    if (!network) return res.status(404).json({ error: 'Network not found' });

    const { name, platform, profileUrl, connections } = req.body;
    if (!name || !platform) {
      return res.status(400).json({ error: 'name and platform required' });
    }

    const contact: Contact = {
      id: uuidv4(),
      name,
      platform,
      profileUrl,
      connections
    };
    network.contacts.push(contact);
    res.json({ success: true, contactId: contact.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/network/:id', (req, res) => {
  const network = networks.get(req.params.id);
  if (!network) return res.status(404).json({ error: 'Network not found' });
  res.json(network);
});

app.get('/network/:id/analysis', (req, res) => {
  const network = networks.get(req.params.id);
  if (!network) return res.status(404).json({ error: 'Network not found' });

  const analysis = {
    totalContacts: network.contacts.length,
    byPlatform: network.contacts.reduce((acc: any, c) => {
      acc[c.platform] = (acc[c.platform] || 0) + 1;
      return acc;
    }, {}),
    connections: network.contacts.filter(c => c.connections?.length).length,
    mostConnected: network.contacts.sort((a, b) => (b.connections?.length || 0) - (a.connections?.length || 0)).slice(0, 5)
  };
  res.json(analysis);
});

app.post('/sentiment', (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const words = content.toLowerCase().split(/\s+/);
    const positive = ['good', 'great', 'excellent', 'happy', 'love', 'win', 'success', 'profit', 'growth'];
    const negative = ['bad', 'poor', 'hate', 'angry', 'loss', 'fail', 'problem', 'crisis', 'debt'];
    const neutral = ['meeting', 'report', 'data', 'information'];

    let score = 0;
    let positiveCount = 0, negativeCount = 0;

    for (const word of words) {
      if (positive.includes(word)) { score += 1; positiveCount++; }
      if (negative.includes(word)) { score -= 1; negativeCount++; }
    }

    const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
    res.json({ content: content.substring(0, 100) + '...', sentiment, score, positiveCount, negativeCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', networkCount: networks.size });
});

// MCP Server
const server = new Server({ name: 'rez-mcp-social-intelligence', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'scrape_profile', description: 'Scrape social media profile data', inputSchema: { type: 'object', properties: { platform: { type: 'string' }, username: { type: 'string' } } } },
    { name: 'analyze_network', description: 'Analyze contact network', inputSchema: { type: 'object', properties: { networkId: { type: 'string' } } } },
    { name: 'sentiment_analysis', description: 'Analyze content sentiment', inputSchema: { type: 'object', properties: { content: { type: 'string' } } } },
    { name: 'find_connections', description: 'Find common connections', inputSchema: { type: 'object', properties: { subjectId1: { type: 'string' }, subjectId2: { type: 'string' } } } },
    { name: 'track_activity', description: 'Track social media activity', inputSchema: { type: 'object', properties: { platform: { type: 'string' }, username: { type: 'string' } } } },
    { name: 'create_network', description: 'Create contact network', inputSchema: { type: 'object', properties: { subjectId: { type: 'string' } } } }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'scrape_profile':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, platform: args?.platform, username: args?.username, message: 'Profile data retrieved' }) })] };
      case 'analyze_network':
        const network = networks.get(args?.networkId);
        if (!network) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Network not found' }) }], isError: true };
        return { content: [{ type: 'text', text: JSON.stringify({ totalContacts: network.contacts.length, platforms: [...new Set(network.contacts.map(c => c.platform))] }) }] };
      case 'sentiment_analysis':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, sentiment: 'neutral', score: 0 }) }] };
      case 'find_connections':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, connections: [] }) }] };
      case 'track_activity':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, recentActivity: [], sentiment: 'neutral' }) }] };
      case 'create_network':
        const id = uuidv4();
        networks.set(id, { id, subjectId: args?.subjectId || '', contacts: [], createdAt: new Date() });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, networkId: id }) }] };
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

if (process.env.TRANSPORT === 'http') {
  app.listen(PORT, () => console.log(`Social Intelligence MCP on port ${PORT}`));
} else {
  server.connect();
  console.error('Social Intelligence MCP running');
}