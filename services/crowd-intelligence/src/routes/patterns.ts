import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PatternDetector } from '../services/patternDetector';
import { CrowdProfile, CrowdPattern, PatternType } from '../models/CrowdProfile';

const router = Router();

// In-memory storage for patterns
const detectedPatterns: CrowdPattern[] = [];

// Pattern detection service
const patternDetector = new PatternDetector({
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta)
});

// Detect patterns for a location
router.post('/detect', (req: Request, res: Response) => {
  const { locationId, profiles, type } = req.body;

  if (!locationId || !profiles || !Array.isArray(profiles)) {
    return res.status(400).json({
      error: 'locationId and profiles array are required'
    });
  }

  const patterns: CrowdPattern[] = [];

  // Detect specific pattern type if requested
  if (type) {
    const pattern = patternDetector.detectSpecificPattern(
      profiles as CrowdProfile[],
      type as PatternType,
      locationId
    );
    if (pattern) {
      patterns.push(pattern);
      detectedPatterns.push(pattern);
    }
  } else {
    // Detect all pattern types
    const patternTypes: PatternType[] = [
      'rush_hour',
      'quiet_period',
      'gradual_increase',
      'sudden_spike',
      'gradual_decrease',
      'periodic',
      'weekend_surge',
      'event_burst'
    ];

    for (const patternType of patternTypes) {
      const pattern = patternDetector.detectSpecificPattern(
        profiles as CrowdProfile[],
        patternType,
        locationId
      );
      if (pattern) {
        patterns.push(pattern);
        detectedPatterns.push(pattern);
      }
    }
  }

  res.json({
    locationId,
    patternsDetected: patterns.length,
    patterns,
    summary: patternDetector.getPatternSummary(profiles as CrowdProfile[])
  });
});

// Get all detected patterns
router.get('/', (req: Request, res: Response) => {
  const { locationId, type, limit } = req.query;

  let patterns = [...detectedPatterns];

  if (locationId) {
    patterns = patterns.filter(p => p.locationId === locationId);
  }
  if (type) {
    patterns = patterns.filter(p => p.type === type);
  }

  patterns.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

  const result = limit ? patterns.slice(0, parseInt(limit as string)) : patterns;

  res.json({
    patterns: result,
    total: patterns.length,
    byType: {
      rush_hour: patterns.filter(p => p.type === 'rush_hour').length,
      quiet_period: patterns.filter(p => p.type === 'quiet_period').length,
      gradual_increase: patterns.filter(p => p.type === 'gradual_increase').length,
      sudden_spike: patterns.filter(p => p.type === 'sudden_spike').length,
      gradual_decrease: patterns.filter(p => p.type === 'gradual_decrease').length,
      periodic: patterns.filter(p => p.type === 'periodic').length,
      weekend_surge: patterns.filter(p => p.type === 'weekend_surge').length,
      event_burst: patterns.filter(p => p.type === 'event_burst').length
    }
  });
});

// Get pattern by ID
router.get('/:id', (req: Request, res: Response) => {
  const pattern = detectedPatterns.find(p => p.id === req.params.id);

  if (!pattern) {
    return res.status(404).json({ error: 'Pattern not found' });
  }

  res.json(pattern);
});

// Analyze pattern characteristics
router.post('/analyze', (req: Request, res: Response) => {
  const { profiles, patternType } = req.body;

  if (!profiles || !Array.isArray(profiles)) {
    return res.status(400).json({ error: 'profiles array is required' });
  }

  const analysis = patternDetector.analyzePatternCharacteristics(
    profiles as CrowdProfile[],
    patternType
  );

  res.json({
    analysis,
    profileCount: profiles.length,
    timestamp: new Date()
  });
});

// Get pattern statistics
router.get('/stats/overview', (req: Request, res: Response) => {
  const { hours } = req.query;
  const hoursNum = hours ? parseInt(hours as string) : 24;
  const cutoff = Date.now() - hoursNum * 60 * 60 * 1000;

  const recentPatterns = detectedPatterns.filter(
    p => p.detectedAt.getTime() > cutoff
  );

  res.json({
    timeRange: { hours: hoursNum, cutoff: new Date(cutoff).toISOString() },
    totalPatterns: recentPatterns.length,
    byType: recentPatterns.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    averageConfidence:
      recentPatterns.length > 0
        ? recentPatterns.reduce((sum, p) => sum + p.confidence, 0) / recentPatterns.length
        : 0,
    peakHours: getPeakPatternHours(recentPatterns),
    mostCommon: getMostCommonPattern(recentPatterns)
  });
});

// Helper functions
function getPeakPatternHours(patterns: CrowdPattern[]): string[] {
  const hourCounts = new Map<number, number>();

  for (const pattern of patterns) {
    const hour = pattern.startTime.getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  }

  return Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => `${hour}:00 - ${hour + 1}:00`);
}

function getMostCommonPattern(patterns: CrowdPattern[]): { type: PatternType; count: number } | null {
  if (patterns.length === 0) return null;

  const typeCounts = patterns.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  return { type: mostCommon[0] as PatternType, count: mostCommon[1] };
}

export default router;