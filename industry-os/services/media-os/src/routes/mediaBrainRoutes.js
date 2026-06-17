/**
 * Media OS - AI Media Brain Routes
 * Access all 13 specialized AI agents
 */

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware');
const { mediaBrain } = require('../services/MediaBrain');
const logger = require('../config/database');

// ============================================
// AGENT DISCOVERY
// ============================================

// Get all available agents
router.get('/agents', optionalAuth, (req, res) => {
  const agents = mediaBrain.getAllAgents();
  res.json({ success: true, agents, count: agents.length });
});

// Get specific agent info
router.get('/agents/:name', optionalAuth, (req, res) => {
  const agent = mediaBrain.getAgent(req.params.name);
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  res.json({
    success: true,
    agent: {
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities,
    },
  });
});

// ============================================
// AI EDITOR AGENT
// ============================================

// Generate highlights
router.post('/editor/highlights', authenticate, async (req, res) => {
  try {
    const { videoId, maxHighlights, minDuration, maxDuration } = req.body;

    const result = await mediaBrain.agents.editor.generateHighlights(videoId, {
      maxHighlights,
      minDuration,
      maxDuration,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Highlight generation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate highlights' });
  }
});

// Generate trailer
router.post('/editor/trailer', authenticate, async (req, res) => {
  try {
    const { contentId, style } = req.body;

    const result = await mediaBrain.agents.editor.generateTrailer(contentId, style);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Trailer generation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate trailer' });
  }
});

// Auto-edit
router.post('/editor/edit', authenticate, async (req, res) => {
  try {
    const { clipId, instructions } = req.body;

    const result = await mediaBrain.agents.editor.autoEdit(clipId, instructions);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Auto-edit failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to auto-edit' });
  }
});

// ============================================
// AI NEWS WRITER AGENT
// ============================================

// Write article
router.post('/news/write', authenticate, async (req, res) => {
  try {
    const { topic, tone } = req.body;

    const result = await mediaBrain.agents.newsWriter.writeArticle(topic, tone);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Article writing failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to write article' });
  }
});

// Generate headlines
router.post('/news/headlines', authenticate, async (req, res) => {
  try {
    const { topic, count } = req.body;

    const result = await mediaBrain.agents.newsWriter.generateHeadlines(topic, count);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Headline generation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate headlines' });
  }
});

// Summarize content
router.post('/news/summarize', authenticate, async (req, res) => {
  try {
    const { contentId } = req.body;

    const result = await mediaBrain.agents.newsWriter.summarizeContent(contentId);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Summarization failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to summarize' });
  }
});

// ============================================
// AI FACT CHECKER AGENT
// ============================================

// Verify claim
router.post('/fact-check/verify', authenticate, async (req, res) => {
  try {
    const { claim } = req.body;

    const result = await mediaBrain.agents.factChecker.verifyClaim(claim);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Fact verification failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to verify facts' });
  }
});

// Score article
router.post('/fact-check/score', authenticate, async (req, res) => {
  try {
    const { contentId } = req.body;

    const result = await mediaBrain.agents.factChecker.scoreArticle(contentId);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Fact scoring failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to score article' });
  }
});

// ============================================
// AI COMMUNITY MANAGER AGENT
// ============================================

// Generate response
router.post('/community/respond', authenticate, async (req, res) => {
  try {
    const { comment, context } = req.body;

    const result = await mediaBrain.agents.community.generateResponse(comment, context);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Response generation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate response' });
  }
});

// Analyze sentiment
router.post('/community/sentiment', authenticate, async (req, res) => {
  try {
    const { text } = req.body;

    const result = await mediaBrain.agents.community.analyzeSentiment(text);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Sentiment analysis failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to analyze sentiment' });
  }
});

// Moderate content
router.post('/community/moderate', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    const result = await mediaBrain.agents.community.moderateContent(content);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Moderation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to moderate' });
  }
});

// ============================================
// AI SCHEDULER AGENT
// ============================================

// Find optimal times
router.post('/scheduler/optimal', authenticate, async (req, res) => {
  try {
    const { contentType, audience } = req.body;

    const result = await mediaBrain.agents.scheduler.findOptimalTimes(contentType, audience);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Scheduler failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to find optimal times' });
  }
});

// Recommend schedule
router.post('/scheduler/recommend', authenticate, async (req, res) => {
  try {
    const { creatorId } = req.body;

    const result = await mediaBrain.agents.scheduler.recommendSchedule(creatorId);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Schedule recommendation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to recommend schedule' });
  }
});

// ============================================
// AI THUMBNAIL ANALYZER AGENT
// ============================================

// Analyze thumbnail
router.post('/thumbnail/analyze', authenticate, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    const result = await mediaBrain.agents.thumbnailAnalyzer.analyzeThumbnail(imageUrl);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Thumbnail analysis failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to analyze thumbnail' });
  }
});

// Predict CTR
router.post('/thumbnail/predict-ctr', authenticate, async (req, res) => {
  try {
    const { thumbnailUrl, title } = req.body;

    const result = await mediaBrain.agents.thumbnailAnalyzer.predictCTR(thumbnailUrl, title);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('CTR prediction failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to predict CTR' });
  }
});

// ============================================
// AI TRANSCRIPT AGENT
// ============================================

// Transcribe audio
router.post('/transcript/transcribe', authenticate, async (req, res) => {
  try {
    const { audioUrl, language } = req.body;

    const result = await mediaBrain.agents.transcript.transcribe(audioUrl, language);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Transcription failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to transcribe' });
  }
});

// Generate captions
router.post('/transcript/captions', authenticate, async (req, res) => {
  try {
    const { contentId, format } = req.body;

    const result = await mediaBrain.agents.transcript.generateCaptions(contentId, format);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Caption generation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate captions' });
  }
});

// ============================================
// AI TRANSLATOR AGENT
// ============================================

// Translate content
router.post('/translate', authenticate, async (req, res) => {
  try {
    const { text, targetLang, sourceLang } = req.body;

    const result = await mediaBrain.agents.translator.translate(text, targetLang, sourceLang);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Translation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to translate' });
  }
});

// Generate dubbing script
router.post('/translate/dubbing', authenticate, async (req, res) => {
  try {
    const { contentId, targetLang, duration } = req.body;

    const result = await mediaBrain.agents.translator.generateDubbingScript(contentId, targetLang);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Dubbing script failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate dubbing script' });
  }
});

// ============================================
// AI VIRALITY PREDICTOR AGENT
// ============================================

// Predict virality
router.post('/virality/predict', authenticate, async (req, res) => {
  try {
    const { contentId } = req.body;

    const result = await mediaBrain.agents.virality.predictVirality(contentId);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Virality prediction failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to predict virality' });
  }
});

// Suggest hooks
router.post('/virality/hooks', authenticate, async (req, res) => {
  try {
    const { topic } = req.body;

    const result = await mediaBrain.agents.virality.suggestHooks(topic);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Hook suggestion failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to suggest hooks' });
  }
});

// ============================================
// AI CONTENT PLANNER AGENT
// ============================================

// Generate calendar
router.post('/planner/calendar', authenticate, async (req, res) => {
  try {
    const { creatorId, duration } = req.body;

    const result = await mediaBrain.agents.planner.generateCalendar(creatorId, duration);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Calendar generation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate calendar' });
  }
});

// Plan series
router.post('/planner/series', authenticate, async (req, res) => {
  try {
    const { theme, episodeCount } = req.body;

    const result = await mediaBrain.agents.planner.planSeries(theme, episodeCount);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Series planning failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to plan series' });
  }
});

// ============================================
// AI COMPLIANCE OFFICER AGENT
// ============================================

// Check compliance
router.post('/compliance/check', authenticate, async (req, res) => {
  try {
    const { contentId } = req.body;

    const result = await mediaBrain.agents.compliance.checkCompliance(contentId);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Compliance check failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to check compliance' });
  }
});

// Suggest age rating
router.post('/compliance/rating', authenticate, async (req, res) => {
  try {
    const { contentId } = req.body;

    const result = await mediaBrain.agents.compliance.suggestAgeRating(contentId);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Rating suggestion failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to suggest rating' });
  }
});

// ============================================
// AI ENGAGEMENT BOT AGENT
// ============================================

// Generate reply
router.post('/engagement/reply', authenticate, async (req, res) => {
  try {
    const { comment, sentiment } = req.body;

    const result = await mediaBrain.agents.engagement.generateReply(comment, sentiment);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Reply generation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate reply' });
  }
});

// Generate welcome
router.post('/engagement/welcome', authenticate, async (req, res) => {
  try {
    const { followerName } = req.body;

    const result = await mediaBrain.agents.engagement.generateWelcome(followerName);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Welcome generation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate welcome' });
  }
});

// ============================================
// AI TREND FORECASTER AGENT
// ============================================

// Forecast trends
router.post('/trends/forecast', authenticate, async (req, res) => {
  try {
    const { category, timeframe } = req.body;

    const result = await mediaBrain.agents.trendForecaster.forecastTrends(category, timeframe);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Trend forecasting failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to forecast trends' });
  }
});

// Get seasonal content
router.post('/trends/seasonal', authenticate, async (req, res) => {
  try {
    const { events } = req.body;

    const result = await mediaBrain.agents.trendForecaster.getSeasonalContent(events);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Seasonal content failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get seasonal content' });
  }
});

// ============================================
// ORCHESTRATED WORKFLOWS
// ============================================

// Full content analysis
router.post('/analyze/:contentId', authenticate, async (req, res) => {
  try {
    const results = await mediaBrain.analyzeContent(req.params.contentId);
    res.json({ success: true, results });
  } catch (error) {
    logger.error('Content analysis failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to analyze content' });
  }
});

// Generate full pipeline
router.post('/pipeline/generate', authenticate, async (req, res) => {
  try {
    const results = await mediaBrain.generateFullPipeline(req.body);
    res.json({ success: true, results });
  } catch (error) {
    logger.error('Pipeline generation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate pipeline' });
  }
});

// Handle comment
router.post('/handle-comment', authenticate, async (req, res) => {
  try {
    const { comment, context } = req.body;
    const result = await mediaBrain.handleComment(comment, context);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Comment handling failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to handle comment' });
  }
});

module.exports = router;
