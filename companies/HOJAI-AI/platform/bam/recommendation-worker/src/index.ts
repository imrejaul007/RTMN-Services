/**
 * Recommendation Worker
 * Port: 5553
 *
 * AI Worker for personalized product recommendations:
 * - User profiling
 * - Collaborative filtering
 * - Content-based matching
 * - Real-time ranking
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import userProfiler from './modules/userProfiler.js';
import collaborativeFilter from './modules/collaborativeFilter.js';
import contentMatcher from './modules/contentMatcher.js';
import ranker from './modules/ranker.js';

const PORT = parseInt(process.env.PORT || '5553', 10);
const SERVICE_NAME = 'recommendation-worker';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Main worker entry: POST /run
 * Body: { user_id, context, limit, use_skills }
 */
app.post('/run', async (req, res) => {
  try {
    const {
      user_id,
      context = 'homepage',
      limit = 20,
      use_skills,
    } = req.body;

    const defaultSkills = ['user-profiling', 'collaborative-filtering', 'content-matching', 'real-time-ranking'];
    const skillsToRun = use_skills || defaultSkills;

    // Step 1: Build user profile
    let userProfile;
    if (skillsToRun.includes('user-profiling')) {
      userProfile = await userProfiler.buildProfile(user_id);
    }

    // Step 2: Find similar users
    let similarUsers: any[] = [];
    if (skillsToRun.includes('collaborative-filtering')) {
      similarUsers = await collaborativeFilter.findSimilarUsers(user_id, userProfile);
    }

    // Step 3: Content-based recommendations
    let contentRecs: any[] = [];
    if (skillsToRun.includes('content-matching') && userProfile) {
      contentRecs = await contentMatcher.match(userProfile, context);
    }

    // Step 4: Rank and combine
    const ranked = await ranker.rank({
      userId: user_id,
      userProfile,
      similarUsers,
      contentRecs,
      context,
      limit,
    });

    res.json({
      success: true,
      userId: user_id,
      context,
      recommendations: ranked,
      count: ranked.length,
      executedSkills: skillsToRun,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'WORKER_ERROR', message: error.message },
    });
  }
});

/**
 * Track user behavior
 */
app.post('/track', async (req, res) => {
  const { user_id, product_id, action, context } = req.body;

  await userProfiler.trackBehavior({
    userId: user_id,
    productId: product_id,
    action,
    context,
  });

  res.json({
    success: true,
    tracked: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get similar products
 */
app.post('/similar', async (req, res) => {
  const { product_id, limit = 10 } = req.body;
  const similar = await contentMatcher.findSimilar(product_id, limit);
  res.json({ similar, count: similar.length });
});

/**
 * Get bundle recommendations
 */
app.post('/bundle', async (req, res) => {
  const { user_id, cart_items, limit = 5 } = req.body;
  const bundles = await contentMatcher.bundleRecommendations(user_id, cart_items, limit);
  res.json({ bundles, count: bundles.length });
});

app.listen(PORT, () => {
  console.log(`✅ Recommendation Worker running on port ${PORT}`);
  console.log('   Skills: user-profiling, collaborative-filtering, content-matching, real-time-ranking');
});

export default app;
