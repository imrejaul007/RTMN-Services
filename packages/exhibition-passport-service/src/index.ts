/**
 * Exhibition Passport Service
 * Port 5054
 *
 * Missions, Gamification, Badges, Progress Tracking
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5054;
const SERVICE_NAME = 'exhibition-passport-service';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })],
});

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================
// DATA MODELS
// ============================================

interface Mission {
  id: string;
  exhibition_id: string;
  name: string;
  description: string;
  type: 'visit_booth' | 'attend_session' | 'explore_zone' | 'meet_sponsor' | 'purchase' | 'refer_friend' | 'complete_profile' | 'custom';
  target: number; // Number of times to complete
  target_entity_id?: string; // Specific booth, session, zone, etc.
  coin_reward: number;
  badge_reward?: string; // Badge ID
  bonus_reward?: { type: string; value: number };
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

interface Passport {
  id: string;
  attendee_id: string;
  exhibition_id: string;
  passport_type: 'full' | 'zone' | 'category' | 'sponsor';
  zone_id?: string;
  category?: string;
  sponsor_id?: string;
  name: string;
  description: string;
  missions: string[]; // Mission IDs
  progress: number; // 0-100
  completed_missions: number;
  total_missions: number;
  is_completed: boolean;
  completed_at?: string;
  started_at: string;
  updated_at: string;
}

interface MissionProgress {
  id: string;
  passport_id: string;
  mission_id: string;
  attendee_id: string;
  exhibition_id: string;
  current: number;
  target: number;
  is_completed: boolean;
  completed_at?: string;
  last_activity_at: string;
  activities: MissionActivity[];
}

interface MissionActivity {
  id: string;
  timestamp: string;
  entity_id: string;
  entity_type: string;
  points_earned: number;
}

interface Badge {
  id: string;
  exhibition_id: string;
  name: string;
  description: string;
  icon: string; // emoji or image URL
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  criteria: Record<string, unknown>; // Criteria to earn
  is_active: boolean;
  created_at: string;
}

interface EarnedBadge {
  id: string;
  badge_id: string;
  attendee_id: string;
  exhibition_id: string;
  earned_at: string;
  source: string; // mission, manual, achievement
}

// Stores
const missions = new Map<string, Mission>();
const passports = new Map<string, Passport>();
const missionProgress = new Map<string, MissionProgress>();
const badges = new Map<string, Badge>();
const earnedBadges = new Map<string, EarnedBadge>();

// ============================================
// HEALTH
// ============================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: { missions: missions.size, passports: passports.size, badges: badges.size, earned_badges: earnedBadges.size },
  });
});

app.get('/health/live', (_req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', (_req, res) => res.json({ status: 'ready' }));

// ============================================
// MISSIONS
// ============================================

app.get('/api/missions', (req, res) => {
  const { exhibition_id, active_only, type } = req.query;
  let results = Array.from(missions.values());

  if (exhibition_id) results = results.filter(m => m.exhibition_id === exhibition_id);
  if (active_only === 'true') results = results.filter(m => m.is_active && new Date(m.ends_at) > new Date());
  if (type) results = results.filter(m => m.type === type);

  res.json({ success: true, data: { missions: results, total: results.length } });
});

app.get('/api/missions/:id', (req, res) => {
  const mission = missions.get(req.params.id);
  if (!mission) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mission not found' } });
  res.json({ success: true, data: mission });
});

app.post('/api/missions', (req, res) => {
  const { exhibition_id, name, description, type, target, target_entity_id, coin_reward, badge_reward, bonus_reward, starts_at, ends_at } = req.body;

  if (!exhibition_id || !name || !type || target === undefined || coin_reward === undefined) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const mission: Mission = {
    id: `MSN-${uuidv4().substring(0, 8).toUpperCase()}`,
    exhibition_id,
    name,
    description: description || '',
    type,
    target,
    target_entity_id,
    coin_reward,
    badge_reward,
    bonus_reward,
    is_active: true,
    starts_at: starts_at || new Date().toISOString(),
    ends_at: ends_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  missions.set(mission.id, mission);
  logger.info('Mission created', { id: mission.id, name });

  res.status(201).json({ success: true, data: mission });
});

// Create default missions for an exhibition
app.post('/api/missions/defaults/:exhibitionId', (req, res) => {
  const { exhibitionId } = req.params;

  const defaultMissions: Omit<Mission, 'id' | 'created_at'>[] = [
    { exhibition_id: exhibitionId, name: '🎯 Booth Explorer', description: 'Visit 10 different booths', type: 'visit_booth', target: 10, coin_reward: 100, is_active: true, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    { exhibition_id: exhibitionId, name: '📚 Knowledge Seeker', description: 'Attend 3 sessions', type: 'attend_session', target: 3, coin_reward: 75, is_active: true, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    { exhibition_id: exhibitionId, name: '🌟 Trend Spotter', description: 'Visit all zones', type: 'explore_zone', target: 5, coin_reward: 150, is_active: true, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    { exhibition_id: exhibitionId, name: '🤝 Networker', description: 'Make 5 new connections', type: 'custom', target: 5, coin_reward: 50, is_active: true, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    { exhibition_id: exhibitionId, name: '🏆 Early Bird', description: 'Complete your profile', type: 'complete_profile', target: 1, coin_reward: 25, is_active: true, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
  ];

  const created = [];
  for (const m of defaultMissions) {
    const mission: Mission = { id: `MSN-${uuidv4().substring(0, 8).toUpperCase()}`, ...m, created_at: new Date().toISOString() };
    missions.set(mission.id, mission);
    created.push(mission);
  }

  res.status(201).json({ success: true, data: { missions: created, count: created.length } });
});

// ============================================
// PASSPORTS
// ============================================

app.get('/api/passports', (req, res) => {
  const { attendee_id, exhibition_id } = req.query;
  let results = Array.from(passports.values());

  if (attendee_id) results = results.filter(p => p.attendee_id === attendee_id);
  if (exhibition_id) results = results.filter(p => p.exhibition_id === exhibition_id);

  res.json({ success: true, data: { passports: results, total: results.length } });
});

app.get('/api/passports/:id', (req, res) => {
  const passport = passports.get(req.params.id);
  if (!passport) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Passport not found' } });
  res.json({ success: true, data: passport });
});

app.get('/api/attendees/:attendeeId/:exhibitionId/passport', (req, res) => {
  const { attendeeId, exhibitionId } = req.params;

  // Find or create passport
  let passport = Array.from(passports.values()).find(
    p => p.attendee_id === attendeeId && p.exhibition_id === exhibitionId && p.passport_type === 'full'
  );

  if (!passport) {
    // Create new passport with all active missions
    const activeMissions = Array.from(missions.values())
      .filter(m => m.exhibition_id === exhibitionId && m.is_active);

    const now = new Date().toISOString();
    passport = {
      id: `PASP-${uuidv4().substring(0, 8).toUpperCase()}`,
      attendee_id: attendeeId,
      exhibition_id: exhibitionId,
      passport_type: 'full',
      name: 'Exhibition Passport',
      description: 'Complete missions to earn rewards!',
      missions: activeMissions.map(m => m.id),
      progress: 0,
      completed_missions: 0,
      total_missions: activeMissions.length,
      is_completed: false,
      started_at: now,
      updated_at: now,
    };

    passports.set(passport.id, passport);

    // Initialize progress for each mission
    for (const mission of activeMissions) {
      const progress: MissionProgress = {
        id: `PRG-${uuidv4().substring(0, 8).toUpperCase()}`,
        passport_id: passport.id,
        mission_id: mission.id,
        attendee_id: attendeeId,
        exhibition_id: exhibitionId,
        current: 0,
        target: mission.target,
        is_completed: false,
        last_activity_at: now,
        activities: [],
      };
      missionProgress.set(`${passport.id}:${mission.id}`, progress);
    }
  }

  res.json({ success: true, data: passport });
});

// ============================================
// MISSION PROGRESS
// ============================================

// Record mission activity
app.post('/api/progress/record', (req, res) => {
  const { attendee_id, exhibition_id, mission_type, entity_id, entity_type } = req.body;

  if (!attendee_id || !exhibition_id || !mission_type) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  // Get passport
  const passport = Array.from(passports.values()).find(
    p => p.attendee_id === attendee_id && p.exhibition_id === exhibition_id && p.passport_type === 'full'
  );

  if (!passport) {
    return res.status(404).json({ success: false, error: { code: 'NO_PASSPORT', message: 'Attendee does not have a passport' } });
  }

  // Find matching missions
  const matchingMissions = Array.from(missions.values()).filter(
    m => m.exhibition_id === exhibition_id && m.type === mission_type && m.is_active
  );

  if (matchingMissions.length === 0) {
    return res.json({ success: true, data: { message: 'No matching missions found' } });
  }

  const results = [];
  let totalCoinsEarned = 0;

  for (const mission of matchingMissions) {
    // Check target entity if specified
    if (mission.target_entity_id && mission.target_entity_id !== entity_id) continue;

    const progressKey = `${passport.id}:${mission.id}`;
    let progress = missionProgress.get(progressKey);

    if (!progress) {
      const now = new Date().toISOString();
      progress = {
        id: `PRG-${uuidv4().substring(0, 8).toUpperCase()}`,
        passport_id: passport.id,
        mission_id: mission.id,
        attendee_id,
        exhibition_id,
        current: 0,
        target: mission.target,
        is_completed: false,
        last_activity_at: now,
        activities: [],
      };
    }

    if (progress.is_completed) continue;

    // Increment progress
    progress.current++;
    progress.last_activity_at = new Date().toISOString();

    const activity: MissionActivity = {
      id: `ACT-${uuidv4().substring(0, 8).toUpperCase()}`,
      timestamp: progress.last_activity_at,
      entity_id: entity_id || '',
      entity_type: entity_type || '',
      points_earned: 0,
    };
    progress.activities.push(activity);

    // Check completion
    let coinsEarned = 0;
    if (progress.current >= progress.target && !progress.is_completed) {
      progress.is_completed = true;
      progress.completed_at = progress.last_activity_at;
      coinsEarned = mission.coin_reward;
      totalCoinsEarned += coinsEarned;
      activity.points_earned = coinsEarned;

      passport.completed_missions++;
      passport.progress = Math.round((passport.completed_missions / passport.total_missions) * 100);

      if (passport.completed_missions >= passport.total_missions) {
        passport.is_completed = true;
        passport.completed_at = new Date().toISOString();
        totalCoinsEarned += 200; // Completion bonus
      }
    }

    missionProgress.set(progressKey, progress);
    results.push({ mission_id: mission.id, mission_name: mission.name, progress, coins_earned: coinsEarned });
  }

  passport.updated_at = new Date().toISOString();
  passports.set(passport.id, passport);

  res.json({
    success: true,
    data: {
      progress_results: results,
      total_coins_earned: totalCoinsEarned,
      passport,
    },
  });
});

app.get('/api/progress/:passportId/:missionId', (req, res) => {
  const key = `${req.params.passportId}:${req.params.missionId}`;
  const progress = missionProgress.get(key);

  if (!progress) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Progress not found' } });
  res.json({ success: true, data: progress });
});

// Get all progress for a passport
app.get('/api/passports/:passportId/progress', (req, res) => {
  const passport = passports.get(req.params.passportId);
  if (!passport) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Passport not found' } });

  const progressList = [];
  for (const missionId of passport.missions) {
    const key = `${passport.id}:${missionId}`;
    const progress = missionProgress.get(key);
    const mission = missions.get(missionId);
    if (progress && mission) {
      progressList.push({ mission, progress });
    }
  }

  res.json({ success: true, data: { passport, progress: progressList } });
});

// ============================================
// BADGES
// ============================================

app.get('/api/badges', (req, res) => {
  const { exhibition_id, active_only } = req.query;
  let results = Array.from(badges.values());

  if (exhibition_id) results = results.filter(b => b.exhibition_id === exhibition_id);
  if (active_only === 'true') results = results.filter(b => b.is_active);

  res.json({ success: true, data: { badges: results, total: results.length } });
});

app.post('/api/badges', (req, res) => {
  const { exhibition_id, name, description, icon, tier, criteria } = req.body;

  if (!exhibition_id || !name || !icon || !tier) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const badge: Badge = {
    id: `BADGE-${uuidv4().substring(0, 8).toUpperCase()}`,
    exhibition_id,
    name,
    description: description || '',
    icon,
    tier,
    criteria: criteria || {},
    is_active: true,
    created_at: new Date().toISOString(),
  };

  badges.set(badge.id, badge);
  res.status(201).json({ success: true, data: badge });
});

app.get('/api/attendees/:attendeeId/badges', (req, res) => {
  const { attendeeId } = req.params;
  const earned = Array.from(earnedBadges.values()).filter(e => e.attendee_id === attendeeId);

  const badgeDetails = earned.map(e => {
    const badge = badges.get(e.badge_id);
    return { ...e, badge };
  });

  res.json({ success: true, data: { badges: badgeDetails, total: badgeDetails.length } });
});

app.post('/api/badges/:badgeId/award', (req, res) => {
  const { attendee_id, exhibition_id, source } = req.body;

  const badge = badges.get(req.params.badgeId);
  if (!badge) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Badge not found' } });

  // Check if already earned
  const existing = Array.from(earnedBadges.values()).find(
    e => e.badge_id === badge.id && e.attendee_id === attendee_id
  );

  if (existing) {
    return res.json({ success: true, data: { message: 'Badge already earned', earned_badge: existing } });
  }

  const earned: EarnedBadge = {
    id: `EBN-${uuidv4().substring(0, 8).toUpperCase()}`,
    badge_id: badge.id,
    attendee_id,
    exhibition_id,
    earned_at: new Date().toISOString(),
    source: source || 'achievement',
  };

  earnedBadges.set(earned.id, earned);
  logger.info('Badge awarded', { badge_id: badge.id, attendee_id, name: badge.name });

  res.status(201).json({ success: true, data: earned });
});

// ============================================
// STATS
// ============================================

app.get('/api/stats/:exhibitionId', (req, res) => {
  const { exhibitionId } = req.params;

  const exhibitionPassports = Array.from(passports.values()).filter(p => p.exhibition_id === exhibitionId);
  const completedPassports = exhibitionPassports.filter(p => p.is_completed);

  res.json({
    success: true,
    data: {
      total_passports: exhibitionPassports.length,
      completed_passports: completedPassports.length,
      completion_rate: exhibitionPassports.length > 0 ? Math.round((completedPassports.length / exhibitionPassports.length) * 100) : 0,
      active_missions: Array.from(missions.values()).filter(m => m.exhibition_id === exhibitionId && m.is_active).length,
      total_badges: Array.from(badges.values()).filter(b => b.exhibition_id === exhibitionId).length,
    },
  });
});

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  logger.info(`🏅 Exhibition Passport Service started on port ${PORT}`);
});

export default app;