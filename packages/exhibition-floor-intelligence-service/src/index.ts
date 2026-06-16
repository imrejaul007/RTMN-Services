/**
 * Exhibition Floor Intelligence Service
 * Port 5061
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5061;
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

const heatmaps = new Map();
const zones = new Map();

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-floor-intelligence', timestamp: new Date().toISOString() });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (_req, res) => {
  res.json({ status: 'ready' });
});

app.get('/api/zones/:exhibitionId/density', (req, res) => {
  const exhibitionId = req.params.exhibitionId;
  const zoneData = Array.from(zones.values()).filter((z: any) => z.exhibition_id === exhibitionId);

  res.json({
    success: true,
    data: {
      zones: zoneData.map((z: any) => ({
        zone_id: z.id,
        zone_name: z.name,
        current_density: z.density,
        visitors_count: z.visitors,
        status: z.density > 80 ? 'congested' : z.density > 50 ? 'busy' : 'quiet',
      })),
      updated_at: new Date().toISOString(),
    },
  });
});

app.post('/api/zones/:zoneId/density', (req, res) => {
  const { density, visitors, exhibition_id, name } = req.body;
  let zone = zones.get(req.params.zoneId) as any;

  if (!zone) {
    zone = { id: req.params.zoneId, exhibition_id: exhibition_id || '', name: name || 'Zone', density: 0, visitors: 0 };
  }

  zone.density = density || 0;
  zone.visitors = visitors || 0;
  zones.set(req.params.zoneId, zone);

  res.json({ success: true, data: zone });
});

app.get('/api/heatmap/:exhibitionId', (req, res) => {
  const exhibitionId = req.params.exhibitionId;
  let heatmap = heatmaps.get(exhibitionId);

  if (!heatmap) {
    const booths = [];
    for (let i = 1; i <= 50; i++) {
      booths.push({
        booth_id: `B${i.toString().padStart(3, '0')}`,
        zone: i <= 20 ? 'A' : i <= 35 ? 'B' : 'C',
        density: Math.floor(Math.random() * 100),
        visitors: Math.floor(Math.random() * 50),
      });
    }
    heatmap = { exhibition_id: exhibitionId, booths, generated_at: new Date().toISOString() };
    heatmaps.set(exhibitionId, heatmap);
  }

  res.json({ success: true, data: heatmap });
});

app.get('/api/navigate/:boothId/nearby', (req, res) => {
  res.json({
    success: true,
    data: {
      current_booth: req.params.boothId,
      nearby: [
        { booth_id: 'B001', distance: '10m', direction: 'North', name: 'TechCorp' },
        { booth_id: 'B005', distance: '15m', direction: 'East', name: 'CloudFirst' },
        { booth_id: 'B012', distance: '20m', direction: 'South', name: 'DataWorks' },
      ],
    },
  });
});

app.listen(PORT, () => {
  logger.info(`Floor Intelligence Service started on port ${PORT}`);
});

export default app;
