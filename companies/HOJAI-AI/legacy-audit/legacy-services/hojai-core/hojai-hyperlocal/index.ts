/**
 * Hojai Hyperlocal Platform
 *
 * Geo Intelligence, Zones, Venues, Events, Footfall Prediction
 *
 * PORT: 4580
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { tenantMiddleware } from '../../shared/middleware/tenant';
import { createLogger } from '../../shared/utils/logger';
import { createResponse, createErrorResponse } from '../../shared/types';

const logger = createLogger('hojai-hyperlocal');

// ============================================
// TYPES
// ============================================

export interface Zone {
  id: string;
  tenant_id: string;
  name: string;
  level: 'city' | 'district' | 'neighborhood' | 'micro_zone';
  boundary?: GeoJSON;
  center: { lat: number; lng: number };
  demand_index: number;
  venue_count: number;
}

export interface Venue {
  id: string;
  tenant_id: string;
  name: string;
  type: 'restaurant' | 'retail' | 'gym' | 'salon' | 'clinic' | 'other';
  address: string;
  coordinates: { lat: number; lng: number };
  zone_id: string;
  demand_index: number;
  rating?: number;
}

export interface Event {
  id: string;
  tenant_id: string;
  name: string;
  category: 'concert' | 'festival' | 'sports' | 'community';
  coordinates: { lat: number; lng: number };
  zone_id: string;
  scale: 'small' | 'medium' | 'large';
  start_date: string;
  end_date: string;
  expected_attendance: number;
}

export interface FootfallPrediction {
  venue_id: string;
  date: string;
  predicted: number;
  confidence: number;
}

// ============================================
// STORAGE
// ============================================

const zones = new Map<string, Zone>();
const venues = new Map<string, Venue>();
const events = new Map<string, Event>();

// ============================================
// HYPERLOCAL PLATFORM
// ============================================

export class HojaiHyperlocalPlatform {

  // ============================================
  // ZONES
  // ============================================

  /**
   * Create zone
   */
  async createZone(
    tenantId: string,
    data: {
      name: string;
      level: Zone['level'];
      center: { lat: number; lng: number };
      demand_index?: number;
    }
  ): Promise<Zone> {
    const zone: Zone = {
      id: this.generateId('zone'),
      tenant_id: tenantId,
      name: data.name,
      level: data.level,
      center: data.center,
      demand_index: data.demand_index || 50,
      venue_count: 0
    };

    zones.set(zone.id, zone);
    return zone;
  }

  /**
   * List zones
   */
  async listZones(tenantId: string, level?: Zone['level']): Promise<Zone[]> {
    const results: Zone[] = [];
    for (const zone of zones.values()) {
      if (zone.tenant_id !== tenantId) continue;
      if (level && zone.level !== level) continue;
      results.push(zone);
    }
    return results;
  }

  /**
   * Get zones near coordinates
   */
  async getZonesNearby(
    tenantId: string,
    coordinates: { lat: number; lng: number },
    radiusKm: number = 5
  ): Promise<Zone[]> {
    const results: Zone[] = [];
    for (const zone of zones.values()) {
      if (zone.tenant_id !== tenantId) continue;
      const distance = this.calculateDistance(coordinates, zone.center);
      if (distance <= radiusKm) {
        results.push({ ...zone, demand_index: zone.demand_index - distance });
      }
    }
    return results.sort((a, b) => b.demand_index - a.demand_index);
  }

  // ============================================
  // VENUES
  // ============================================

  /**
   * Create venue
   */
  async createVenue(
    tenantId: string,
    data: {
      name: string;
      type: Venue['type'];
      address: string;
      coordinates: { lat: number; lng: number };
      zone_id: string;
    }
  ): Promise<Venue> {
    const venue: Venue = {
      id: this.generateId('venue'),
      tenant_id: tenantId,
      name: data.name,
      type: data.type,
      address: data.address,
      coordinates: data.coordinates,
      zone_id: data.zone_id,
      demand_index: 50
    };

    venues.set(venue.id, venue);

    // Update zone venue count
    const zone = zones.get(data.zone_id);
    if (zone) {
      zone.venue_count++;
      zones.set(zone.id, zone);
    }

    return venue;
  }

  /**
   * List venues
   */
  async listVenues(tenantId: string, zoneId?: string): Promise<Venue[]> {
    const results: Venue[] = [];
    for (const venue of venues.values()) {
      if (venue.tenant_id !== tenantId) continue;
      if (zoneId && venue.zone_id !== zoneId) continue;
      results.push(venue);
    }
    return results;
  }

  /**
   * Get venue demand
   */
  async getVenueDemand(tenantId: string, venueId: string): Promise<{ demand_index: number; peak_hours: number[] } | null> {
    const venue = venues.get(venueId);
    if (!venue || venue.tenant_id !== tenantId) return null;

    return {
      demand_index: venue.demand_index,
      peak_hours: [12, 13, 19, 20, 21]
    };
  }

  // ============================================
  // EVENTS
  // ============================================

  /**
   * Create event
   */
  async createEvent(
    tenantId: string,
    data: {
      name: string;
      category: Event['category'];
      coordinates: { lat: number; lng: number };
      zone_id: string;
      scale: Event['scale'];
      start_date: string;
      end_date: string;
      expected_attendance: number;
    }
  ): Promise<Event> {
    const event: Event = {
      id: this.generateId('event'),
      tenant_id: tenantId,
      name: data.name,
      category: data.category,
      coordinates: data.coordinates,
      zone_id: data.zone_id,
      scale: data.scale,
      start_date: data.start_date,
      end_date: data.end_date,
      expected_attendance: data.expected_attendance
    };

    events.set(event.id, event);
    return event;
  }

  /**
   * Get event impact
   */
  async getEventImpact(tenantId: string, eventId: string): Promise<{
    event: Event;
    impact_zones: { zone_id: string; impact_score: number }[];
    demand_boost: number;
  } | null> {
    const event = events.get(eventId);
    if (!event || event.tenant_id !== tenantId) return null;

    const scaleMultiplier = { small: 0.2, medium: 0.5, large: 0.8 }[event.scale];
    const demandBoost = Math.round(event.expected_attendance * scaleMultiplier / 100);

    // Find affected zones
    const affectedZones: { zone_id: string; impact_score: number }[] = [];
    for (const zone of zones.values()) {
      if (zone.tenant_id !== tenantId) continue;
      const distance = this.calculateDistance(event.coordinates, zone.center);
      if (distance < 10) {
        affectedZones.push({
          zone_id: zone.id,
          impact_score: Math.round(100 - distance * 10)
        });
      }
    }

    return {
      event,
      impact_zones: affectedZones,
      demand_boost: demandBoost
    };
  }

  /**
   * List upcoming events
   */
  async listEvents(tenantId: string, zoneId?: string): Promise<Event[]> {
    const results: Event[] = [];
    const now = new Date().toISOString();

    for (const event of events.values()) {
      if (event.tenant_id !== tenantId) continue;
      if (zoneId && event.zone_id !== zoneId) continue;
      if (event.end_date > now) {
        results.push(event);
      }
    }

    return results.sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  // ============================================
  // FOOTFALL PREDICTION
  // ============================================

  /**
   * Predict footfall
   */
  async predictFootfall(
    tenantId: string,
    venueId: string,
    date: string
  ): Promise<FootfallPrediction | null> {
    const venue = venues.get(venueId);
    if (!venue || venue.tenant_id !== tenantId) return null;

    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseFootfall = isWeekend ? 500 : 300;

    return {
      venue_id: venueId,
      date,
      predicted: Math.round(baseFootfall * (venue.demand_index / 50)),
      confidence: 0.85
    };
  }

  /**
   * Get footfall forecast
   */
  async getFootfallForecast(
    tenantId: string,
    venueId: string,
    days: number = 7
  ): Promise<FootfallPrediction[]> {
    const venue = venues.get(venueId);
    if (!venue || venue.tenant_id !== tenantId) return [];

    const predictions: FootfallPrediction[] = [];
    const startDate = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const prediction = await this.predictFootfall(
        tenantId,
        venueId,
        date.toISOString().split('T')[0]
      );
      if (prediction) {
        predictions.push(prediction);
      }
    }

    return predictions;
  }

  // ============================================
  // HELPERS
  // ============================================

  private calculateDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// EXPRESS ROUTES
// ============================================

export function createHyperlocalRoutes(platform: HojaiHyperlocalPlatform) {
  const router = express.Router();

  // Zones
  router.post('/zones', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const zone = await platform.createZone(tenantId, req.body);
      res.json(createResponse(zone, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('CREATE_ERROR', 'Failed to create zone'));
    }
  });

  router.get('/zones', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const zones = await platform.listZones(tenantId, req.query.level as Zone['level']);
      res.json(createResponse(zones, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('LIST_ERROR', 'Failed to list zones'));
    }
  });

  router.get('/zones/nearby', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { lat, lng, radius } = req.query;
      const zones = await platform.getZonesNearby(
        tenantId,
        { lat: parseFloat(lat as string), lng: parseFloat(lng as string) },
        radius ? parseFloat(radius as string) : 5
      );
      res.json(createResponse(zones, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('QUERY_ERROR', 'Failed to get nearby zones'));
    }
  });

  // Venues
  router.post('/venues', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const venue = await platform.createVenue(tenantId, req.body);
      res.json(createResponse(venue, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('CREATE_ERROR', 'Failed to create venue'));
    }
  });

  router.get('/venues', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const venues = await platform.listVenues(tenantId, req.query.zoneId as string);
      res.json(createResponse(venues, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('LIST_ERROR', 'Failed to list venues'));
    }
  });

  router.get('/venues/:id/demand', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const demand = await platform.getVenueDemand(tenantId, req.params.id);
      if (!demand) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Venue not found'));
      res.json(createResponse(demand, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('GET_ERROR', 'Failed to get venue demand'));
    }
  });

  // Events
  router.post('/events', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const event = await platform.createEvent(tenantId, req.body);
      res.json(createResponse(event, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('CREATE_ERROR', 'Failed to create event'));
    }
  });

  router.get('/events', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const events = await platform.listEvents(tenantId, req.query.zoneId as string);
      res.json(createResponse(events, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('LIST_ERROR', 'Failed to list events'));
    }
  });

  router.get('/events/:id/impact', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const impact = await platform.getEventImpact(tenantId, req.params.id);
      if (!impact) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Event not found'));
      res.json(createResponse(impact, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('GET_ERROR', 'Failed to get event impact'));
    }
  });

  // Footfall
  router.get('/venues/:id/footfall/predict', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { date } = req.query;
      const prediction = await platform.predictFootfall(
        tenantId,
        req.params.id,
        date as string || new Date().toISOString().split('T')[0]
      );
      if (!prediction) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Venue not found'));
      res.json(createResponse(prediction, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('PREDICT_ERROR', 'Failed to predict footfall'));
    }
  });

  router.get('/venues/:id/footfall/forecast', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { days } = req.query;
      const forecast = await platform.getFootfallForecast(
        tenantId,
        req.params.id,
        days ? parseInt(days as string) : 7
      );
      res.json(createResponse(forecast, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('FORECAST_ERROR', 'Failed to get forecast'));
    }
  });

  return router;
}

export async function bootstrap(port = 4580) {
  const platform = new HojaiHyperlocalPlatform();
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
  app.use(express.json({ limit: "10kb" }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'hojai-hyperlocal', version: '1.0.0' });
  });

  app.use('/api/hyperlocal', createHyperlocalRoutes(platform));

  app.listen(port, () => {
    logger.info('hojai_hyperlocal_started', { port });
  });

  return { platform, app };
}

export default { HojaiHyperlocalPlatform, createHyperlocalRoutes, bootstrap };
