/**
 * HOJAI Hyperlocal Service - Geo Intelligence
 * Port: 4590
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4590', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Types
interface Zone {
  id: string;
  name: string;
  level: 'city' | 'district' | 'neighborhood' | 'micro_zone';
  center: { lat: number; lng: number };
  demandIndex: number;
}

interface Venue {
  id: string;
  name: string;
  zoneId: string;
  location: { lat: number; lng: number };
  type: string;
}

const zones = new Map<string, Zone>();
const venues = new Map<string, Venue>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-hyperlocal', version: '1.0.0', uptime: process.uptime() });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('service_up 1\n');
});

// Zones
app.get('/api/zones', (req: Request, res: Response) => {
  const list = Array.from(zones.values());
  res.json({ count: list.length, zones: list });
});

app.post('/api/zones', (req: Request, res: Response) => {
  const { name, level, center, demandIndex } = req.body;

  if (!name || !level) {
    return res.status(400).json({ error: 'name and level are required' });
  }

  const zone: Zone = {
    id: uuidv4(),
    name,
    level,
    center: center || { lat: 0, lng: 0 },
    demandIndex: demandIndex || 50,
  };

  zones.set(zone.id, zone);
  res.status(201).json({ success: true, zone });
});

// Venues
app.get('/api/venues', (req: Request, res: Response) => {
  const { zoneId, type } = req.query;
  let list = Array.from(venues.values());

  if (zoneId) list = list.filter(v => v.zoneId === zoneId);
  if (type) list = list.filter(v => v.type === type);

  res.json({ count: list.length, venues: list });
});

app.post('/api/venues', (req: Request, res: Response) => {
  const { name, zoneId, location, type } = req.body;

  if (!name || !zoneId) {
    return res.status(400).json({ error: 'name and zoneId are required' });
  }

  const venue: Venue = {
    id: uuidv4(),
    name,
    zoneId,
    location: location || { lat: 0, lng: 0 },
    type: type || 'general',
  };

  venues.set(venue.id, venue);
  res.status(201).json({ success: true, venue });
});

// Geo search
app.get('/api/geo/search', (req: Request, res: Response) => {
  const { lat, lng, radius = 5 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  // Simulated search
  const nearby = Array.from(venues.values()).filter(v => {
    const d = Math.sqrt(
      Math.pow(v.location.lat - Number(lat), 2) +
      Math.pow(v.location.lng - Number(lng), 2)
    );
    return d <= Number(radius);
  });

  res.json({ count: nearby.length, venues: nearby });
});

app.listen(PORT, () => {
  console.log(`\n📍 HOJAI Hyperlocal Service (${PORT})\n`);
});

export default app;