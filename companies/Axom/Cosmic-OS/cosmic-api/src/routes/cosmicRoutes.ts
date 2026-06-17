/**
 * Cosmic OS - API Routes
 */

import { Router, Request, Response } from 'express';
import {
  interpretMoodToCosmicState,
  generateCouncilResponse,
  generateDailyReading,
  getDomainGuidance,
  processMoodCheckIn,
  generateCosmicContext,
} from '../services/cosmicService';
import type { Mood, Domain, AgentType, MoodCheckIn } from '../types';

const router = Router();

// ============================================
// MOOD CHECK-IN
// ============================================

/**
 * POST /api/mood/checkin
 * Submit a mood check-in and get cosmic response
 */
router.post('/mood/checkin', async (req: Request, res: Response) => {
  try {
    const { userId, mood, energy, context } = req.body;

    if (!mood || energy === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'mood and energy are required' },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    const checkIn: MoodCheckIn = {
      userId: userId || 'anonymous',
      mood: mood as Mood,
      energy,
      context,
      timestamp: new Date().toISOString(),
    };

    const response = processMoodCheckIn(checkIn);

    return res.json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Mood check-in error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process mood check-in' },
      meta: { timestamp: new Date().toISOString() },
    });
  }
});

// ============================================
// DAILY READING
// ============================================

/**
 * GET /api/daily/:userId
 * Get daily cosmic reading for a user
 */
router.get('/daily/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { mood, energy } = req.query;

    const cosmicState = interpretMoodToCosmicState(
      (mood as Mood) || 'neutral',
      parseInt(energy as string) || 50
    );

    const reading = generateDailyReading(cosmicState, userId);

    return res.json({
      success: true,
      data: reading,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Daily reading error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate daily reading' },
      meta: { timestamp: new Date().toISOString() },
    });
  }
});

// ============================================
// COUNCIL RESPONSE
// ============================================

/**
 * POST /api/council
 * Get full council response with specific agents
 */
router.post('/council', async (req: Request, res: Response) => {
  try {
    const { userId, mood, energy, context, agents } = req.body;

    const cosmicState = interpretMoodToCosmicState(mood as Mood, energy);

    const checkIn: MoodCheckIn = {
      userId: userId || 'anonymous',
      mood: mood as Mood,
      energy,
      context,
      timestamp: new Date().toISOString(),
    };

    const activeAgents = (agents as AgentType[]) || ['mystic', 'healer', 'strategist', 'oracle'];
    const response = generateCouncilResponse(cosmicState, checkIn, activeAgents);

    return res.json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Council response error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate council response' },
      meta: { timestamp: new Date().toISOString() },
    });
  }
});

// ============================================
// DOMAIN GUIDANCE
// ============================================

/**
 * GET /api/guidance/:domain
 * Get guidance for a specific life domain
 */
router.get('/guidance/:domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    const { mood, energy } = req.query;

    if (!['emotional', 'relationship', 'career', 'financial', 'health', 'spiritual', 'social'].includes(domain)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DOMAIN', message: 'Invalid domain specified' },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    const cosmicState = interpretMoodToCosmicState(
      (mood as Mood) || 'neutral',
      parseInt(energy as string) || 50
    );

    const checkIn: MoodCheckIn = {
      userId: 'anonymous',
      mood: (mood as Mood) || 'neutral',
      energy: parseInt(energy as string) || 50,
      timestamp: new Date().toISOString(),
    };

    const guidance = getDomainGuidance(domain as Domain, cosmicState, checkIn);

    return res.json({
      success: true,
      data: guidance,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Guidance error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate guidance' },
      meta: { timestamp: new Date().toISOString() },
    });
  }
});

// ============================================
// COSMIC CONTEXT
// ============================================

/**
 * GET /api/context/:userId
 * Get cosmic context from connected services
 */
router.get('/context/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const context = await generateCosmicContext(userId);

    return res.json({
      success: true,
      data: context,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Context error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch cosmic context' },
      meta: { timestamp: new Date().toISOString() },
    });
  }
});

// ============================================
// MOODS
// ============================================

/**
 * GET /api/moods
 * Get all available moods
 */
router.get('/moods', async (_req: Request, res: Response) => {
  const moods = [
    { value: 'very_positive', label: 'Very Positive', emoji: '✨' },
    { value: 'positive', label: 'Positive', emoji: '😊' },
    { value: 'neutral', label: 'Neutral', emoji: '😐' },
    { value: 'negative', label: 'Negative', emoji: '😔' },
    { value: 'very_negative', label: 'Very Negative', emoji: '😢' },
    { value: 'anxious', label: 'Anxious', emoji: '😰' },
    { value: 'calm', label: 'Calm', emoji: '😌' },
    { value: 'energetic', label: 'Energetic', emoji: '⚡' },
    { value: 'tired', label: 'Tired', emoji: '😴' },
    { value: 'stressed', label: 'Stressed', emoji: '😤' },
    { value: 'peaceful', label: 'Peaceful', emoji: '🕊️' },
  ];

  return res.json({
    success: true,
    data: { moods },
    meta: { timestamp: new Date().toISOString() },
  });
});

// ============================================
// AGENTS
// ============================================

/**
 * GET /api/agents
 * Get all available council agents
 */
router.get('/agents', async (_req: Request, res: Response) => {
  const agents = [
    {
      id: 'mystic',
      name: 'The Mystic',
      description: 'Spiritual guide for cosmic alignment',
      specialty: 'spiritual',
      emoji: '🔮',
    },
    {
      id: 'healer',
      name: 'The Healer',
      description: 'Emotional wellness and inner harmony',
      specialty: 'emotional',
      emoji: '💚',
    },
    {
      id: 'strategist',
      name: 'The Strategist',
      description: 'Life planning and career guidance',
      specialty: 'career',
      emoji: '🎯',
    },
    {
      id: 'oracle',
      name: 'The Oracle',
      description: 'Pattern recognition and timing',
      specialty: 'spiritual',
      emoji: '👁️',
    },
    {
      id: 'connector',
      name: 'The Connector',
      description: 'Relationship and social harmony',
      specialty: 'relationship',
      emoji: '💫',
    },
    {
      id: 'wealth_guide',
      name: 'The Wealth Guide',
      description: 'Financial clarity and abundance mindset',
      specialty: 'financial',
      emoji: '💎',
    },
    {
      id: 'explorer',
      name: 'The Explorer',
      description: 'Growth and adventure guidance',
      specialty: 'spiritual',
      emoji: '🧭',
    },
  ];

  return res.json({
    success: true,
    data: { agents },
    meta: { timestamp: new Date().toISOString() },
  });
});

// ============================================
// DOMAINS
// ============================================

/**
 * GET /api/domains
 * Get all available life domains
 */
router.get('/domains', async (_req: Request, res: Response) => {
  const domains = [
    { id: 'emotional', name: 'Emotional', emoji: '💚' },
    { id: 'relationship', name: 'Relationship', emoji: '💫' },
    { id: 'career', name: 'Career', emoji: '🎯' },
    { id: 'financial', name: 'Financial', emoji: '💎' },
    { id: 'health', name: 'Health', emoji: '🌿' },
    { id: 'spiritual', name: 'Spiritual', emoji: '🔮' },
    { id: 'social', name: 'Social', emoji: '🤝' },
  ];

  return res.json({
    success: true,
    data: { domains },
    meta: { timestamp: new Date().toISOString() },
  });
});

export default router;
