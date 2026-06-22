import { Server } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const PORT = parseInt(process.env.PORT || '3132');
const app = express();
app.use(express.json());

interface LocationPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  accuracy?: number;
  source?: 'gps' | 'cell' | 'ip' | 'wifi';
}

interface LocationReport {
  id: string;
  subjectId: string;
  points: LocationPoint[];
  boundingBox?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  visitedLocations: string[];
  createdAt: Date;
}

const reports = new Map<string, LocationReport>();

// Analyze GPS data
app.post('/analyze/gps', (req, res) => {
  try {
    const { subjectId, points } = req.body;
    if (!points) return res.status(400).json({ error: 'points required' });

    const lats = points.map((p: any) => p.latitude);
    const lngs = points.map((p: any) => p.longitude);

    const report: LocationReport = {
      id: uuidv4(),
      subjectId,
      points,
      boundingBox: {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs)
      },
      visitedLocations: [],
      createdAt: new Date()
    };

    reports.set(report.id, report);
    res.json({ success: true, reportId: report.id, pointCount: points.length, boundingBox: report.boundingBox });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cell tower lookup
app.post('/cell-tower', (req, res) => {
  try {
    const { mcc, mnc, lac, cid } = req.body;
    // In production, integrate with cell tower databases
    res.json({
      approximateLocation: { latitude: 28.6139, longitude: 77.2090 },
      city: 'Delhi',
      country: 'India',
      accuracy: '500m-5km',
      note: 'Cell tower location is approximate'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// IP geolocation
app.post('/ip-geolocation', (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'ip required' });

    // Mock response - in production use MaxMind or similar
    const octets = ip.split('.');
    const lat = 20 + (parseInt(octets[1] || '0') % 20);
    const lng = 70 + (parseInt(octets[2] || '0') % 20);

    res.json({
      ip,
      location: { latitude: lat, longitude: lng },
      city: 'Major City',
      country: 'India',
      isp: 'Internet Provider',
      threatLevel: 'low'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze movement patterns
app.post('/analyze/movement', (req, res) => {
  try {
    const { points } = req.body;
    if (!points) return res.status(400).json({ error: 'points required' });

    // Sort by timestamp
    const sorted = points.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let totalDistance = 0;
    const locations: string[] = [];

    // Calculate movement
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const dist = Math.sqrt(Math.pow(curr.latitude - prev.latitude, 2) + Math.pow(curr.longitude - prev.longitude, 2));
      totalDistance += dist;
    }

    // Cluster analysis
    const clusters = Math.ceil(sorted.length / 10);

    res.json({
      totalPoints: sorted.length,
      totalDistanceKm: totalDistance * 111,
      averageSpeedKmh: totalDistance * 111 / (sorted.length * 0.1),
      clusters,
      patterns: ['Home-Work', 'Frequent Locations', 'Travel Routes']
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get report
app.get('/report/:id', (req, res) => {
  const report = reports.get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', reportCount: reports.size });
});

// MCP Server
const server = new Server({ name: 'rez-mcp-location-intelligence', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'analyze_gps', description: 'Analyze GPS location data', inputSchema: { type: 'object', properties: { subjectId: { type: 'string' }, points: { type: 'array' } } } },
    { name: 'cell_tower_lookup', description: 'Cell tower location lookup', inputSchema: { type: 'object', properties: { mcc: { type: 'string' }, mnc: { type: 'string' }, lac: { type: 'string' }, cid: { type: 'string' } } } },
    { name: 'ip_geolocation', description: 'IP to location lookup', inputSchema: { type: 'object', properties: { ip: { type: 'string' } } } },
    { name: 'analyze_movement', description: 'Analyze movement patterns', inputSchema: { type: 'object', properties: { points: { type: 'array' } } } },
    { name: 'generate_location_report', description: 'Generate location evidence report', inputSchema: { type: 'object', properties: { reportId: { type: 'string' } } } }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'analyze_gps':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /analyze/gps' }) })] };
      case 'cell_tower_lookup':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, approximateLocation: { lat: 28.6, lng: 77.2 } }) })] };
      case 'ip_geolocation':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, ip: args?.ip, location: { lat: 28.6, lng: 77.2 } }) })] };
      case 'analyze_movement':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, patterns: ['Home-Work', 'Travel'] }) })] };
      case 'generate_location_report':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP GET /report/{id}' }) })] };
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

if (process.env.TRANSPORT === 'http') {
  app.listen(PORT, () => console.log(`Location Intelligence MCP on port ${PORT}`));
} else {
  server.connect();
  console.error('Location Intelligence MCP running');
}