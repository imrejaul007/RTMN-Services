/**
 * Communication DNA Service - v1.0.0
 * ===================================
 * Profiles communication styles for people.
 *
 * Port: 4722
 *
 * Dimensions:
 * - Directness (0-100)
 * - Detail Level (0-100)
 * - Decision Speed (0-100)
 * - Humor (0-100)
 * - Formality (0-100)
 * - Emotional Expression (0-100)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4722;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Data stores
const profiles = new Map();    // personId -> CommunicationProfile
const history = new Map();       // personId -> Analysis[]
const adaptations = new Map();  // personId -> { targetId -> Adaptation }

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Analyze text for communication patterns
function analyzeText(text) {
  const lower = text.toLowerCase();

  // Directness indicators
  let directness = 50;
  if (/\b(i think|i believe|probably|might be)\b/.test(lower)) directness -= 20;
  if (/\b(do this|need to|must|should)\b/.test(lower)) directness += 20;
  if (/\b(maybe|perhaps|consider)\b/.test(lower)) directness -= 15;

  // Detail level (sentence length, complexity)
  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).length;
  const avgWordsPerSentence = words / Math.max(1, sentences);
  let detailLevel = Math.min(100, avgWordsPerSentence * 10);

  // Humor indicators
  let humor = 0;
  if (/\b(haha|lol|😂|😄|hahaha|funny)\b/.test(lower)) humor += 30;
  if (/\b(joke|kidding|just kidding|jk)\b/.test(lower)) humor += 20;
  if (text.length < 50) humor += 10;

  // Formality indicators
  let formality = 50;
  if (/\b(therefore|however|furthermore|consequently)\b/.test(lower)) formality += 25;
  if (/\b(hey|yo|gonna|wanna|kinda)\b/.test(lower)) formality -= 25;
  if (text.includes('Dear') || text.includes('Regards')) formality += 30;

  // Emotional expression
  let emotional = 0;
  if (/\b(!{2,}|[?!]{2,})\b/.test(text)) emotional += 30;
  if (/\b(love|hate|amazing|terrible|absolutely)\b/.test(lower)) emotional += 20;
  if (text.length > 200) emotional -= 15;

  return {
    directness: Math.max(0, Math.min(100, directness)),
    detailLevel: Math.max(0, Math.min(100, detailLevel)),
    humor: Math.max(0, Math.min(100, humor)),
    formality: Math.max(0, Math.min(100, formality)),
    emotional: Math.max(0, Math.min(100, emotional)),
    wordCount: words,
    sentenceCount: sentences
  };
}

// Calculate decision speed from communication patterns
function calculateDecisionSpeed(text, context) {
  const lower = text.toLowerCase();

  // Quick decision indicators
  if (/\b(done|deal|go|yes|approved|approved|let|sure)\b/.test(lower)) {
    return 85 + Math.random() * 15;
  }

  // Hesitant indicators
  if (/\b(let me think|i need to consider|maybe|perhaps)\b/.test(lower)) {
    return 30 + Math.random() * 20;
  }

  // Asking for input
  if (/\b(what do you think|your opinion|should we)\b/.test(lower)) {
    return 40 + Math.random() * 20;
  }

  return 50 + Math.random() * 30;
}

// Merge analysis into profile
function mergeProfile(profile, analysis, weight = 0.3) {
  return {
    directness: Math.round(profile.directness * (1 - weight) + analysis.directness * weight),
    detailLevel: Math.round(profile.detailLevel * (1 - weight) + analysis.detailLevel * weight),
    humor: Math.round(profile.humor * (1 - weight) + analysis.humor * weight),
    formality: Math.round(profile.formality * (1 - weight) + analysis.formality * weight),
    emotional: Math.round(profile.emotional * (1 - weight) + analysis.emotional * weight),
    decisionSpeed: profile.decisionSpeed
      ? Math.round(profile.decisionSpeed * (1 - weight) + analysis.decisionSpeed * weight)
      : Math.round(analysis.decisionSpeed)
  };
}

// Generate adaptation recommendations
function generateAdaptation(targetProfile, sourceProfile) {
  const adaptations = [];

  // Directness adaptation
  if (Math.abs(targetProfile.directness - sourceProfile.directness) > 30) {
    adaptations.push({
      dimension: 'directness',
      current: sourceProfile.directness,
      recommended: targetProfile.directness,
      action: targetProfile.directness > sourceProfile.directness
        ? 'Be more direct - state your point clearly'
        : 'Soften your language - ask instead of telling'
    });
  }

  // Detail level adaptation
  if (Math.abs(targetProfile.detailLevel - sourceProfile.detailLevel) > 40) {
    adaptations.push({
      dimension: 'detailLevel',
      current: sourceProfile.detailLevel,
      recommended: targetProfile.detailLevel,
      action: targetProfile.detailLevel > sourceProfile.detailLevel
        ? 'Provide more context and details'
        : 'Keep it brief - bullet points preferred'
    });
  }

  // Humor adaptation
  if (targetProfile.humor < 30 && sourceProfile.humor > 60) {
    adaptations.push({
      dimension: 'humor',
      current: sourceProfile.humor,
      recommended: targetProfile.humor,
      action: 'Reduce humor - keep communication professional'
    });
  }

  // Formality adaptation
  if (Math.abs(targetProfile.formality - sourceProfile.formality) > 40) {
    adaptations.push({
      dimension: 'formality',
      current: sourceProfile.formality,
      recommended: targetProfile.formality,
      action: targetProfile.formality > sourceProfile.formality
        ? 'Use more formal language'
        : 'Relax - casual tone is fine'
    });
  }

  return adaptations;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /profile - Analyze and create/update communication profile
 */
app.post('/profile', (req, res) => {
  const { personId, text, context, forceUpdate } = req.body;

  if (!personId || !text) {
    return res.status(400).json({ error: 'personId and text required' });
  }

  // Analyze text
  const analysis = analyzeText(text);
  analysis.decisionSpeed = calculateDecisionSpeed(text, context);

  // Get or create profile
  let profile = profiles.get(personId);

  if (!profile || forceUpdate) {
    profile = {
      personId,
      directness: analysis.directness,
      detailLevel: analysis.detailLevel,
      humor: analysis.humor,
      formality: analysis.formality,
      emotional: analysis.emotional,
      decisionSpeed: analysis.decisionSpeed,
      sampleSize: 1,
      lastUpdated: new Date().toISOString()
    };
  } else {
    profile = mergeProfile(profile, analysis);
    profile.sampleSize++;
    profile.lastUpdated = new Date().toISOString();
  }

  profiles.set(personId, profile);

  // Store analysis in history
  if (!history.has(personId)) history.set(personId, []);
  history.get(personId).push({
    ...analysis,
    timestamp: new Date().toISOString(),
    context
  });

  res.json({
    success: true,
    profile,
    analysis
  });
});

/**
 * GET /profile/:personId - Get communication profile
 */
app.get('/profile/:personId', (req, res) => {
  const { personId } = req.params;

  const profile = profiles.get(personId);

  if (!profile) {
    return res.status(404).json({
      error: 'Profile not found',
      message: 'Analyze some text first to create a profile'
    });
  }

  res.json({
    personId,
    profile,
    summary: generateSummary(profile)
  });
});

/**
 * Generate text summary of profile
 */
function generateSummary(profile) {
  const traits = [];

  if (profile.directness > 70) traits.push('direct');
  else if (profile.directness < 30) traits.push('diplomatic');

  if (profile.detailLevel > 70) traits.push('detailed');
  else if (profile.detailLevel < 30) traits.push('concise');

  if (profile.decisionSpeed > 70) traits.push('decisive');
  else if (profile.decisionSpeed < 40) traits.push('thoughtful');

  if (profile.humor > 60) traits.push('humorous');
  else if (profile.humor < 20) traits.push('serious');

  if (profile.formality > 70) traits.push('formal');
  else if (profile.formality < 30) traits.push('casual');

  if (profile.emotional > 70) traits.push('expressive');
  else if (profile.emotional < 30) traits.push('reserved');

  return traits.join(', ') || 'balanced';
}

/**
 * DELETE /profile/:personId - Delete profile
 */
app.delete('/profile/:personId', (req, res) => {
  const { personId } = req.params;

  profiles.delete(personId);
  history.delete(personId);
  adaptations.delete(personId);

  res.json({ success: true, deleted: personId });
});

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /history/:personId - Get analysis history
 */
app.get('/history/:personId', (req, res) => {
  const { personId } = req.params;
  const { limit } = req.query;

  let hist = history.get(personId) || [];
  hist = hist.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (limit) {
    hist = hist.slice(0, parseInt(limit));
  }

  res.json({
    personId,
    history: hist,
    count: hist.length
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /adapt - Get communication adaptation recommendations
 */
app.post('/adapt', (req, res) => {
  const { sourceId, targetId } = req.body;

  if (!sourceId || !targetId) {
    return res.status(400).json({ error: 'sourceId and targetId required' });
  }

  const sourceProfile = profiles.get(sourceId);
  const targetProfile = profiles.get(targetId);

  if (!sourceProfile) {
    return res.status(404).json({ error: 'Source profile not found' });
  }

  if (!targetProfile) {
    return res.status(404).json({ error: 'Target profile not found' });
  }

  const recommendations = generateAdaptation(targetProfile, sourceProfile);

  // Cache adaptation
  if (!adaptations.has(sourceId)) adaptations.set(sourceId, new Map());
  adaptations.get(sourceId).set(targetId, {
    recommendations,
    generatedAt: new Date().toISOString()
  });

  res.json({
    sourceId,
    targetId,
    sourceProfile,
    targetProfile,
    recommendations
  });
});

/**
 * GET /adapt/:sourceId/:targetId - Get cached adaptation
 */
app.get('/adapt/:sourceId/:targetId', (req, res) => {
  const { sourceId, targetId } = req.params;

  const cached = adaptations.get(sourceId)?.get(targetId);

  if (!cached) {
    return res.status(404).json({
      error: 'No cached adaptation',
      message: 'POST /adapt to generate recommendations'
    });
  }

  res.json({
    ...cached
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /match/:personId - Find similar communication styles
 */
app.get('/match/:personId', (req, res) => {
  const { personId } = req.params;
  const { limit } = req.query;

  const sourceProfile = profiles.get(personId);

  if (!sourceProfile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const matches = [];

  profiles.forEach((profile, id) => {
    if (id === personId) return;

    const similarity = calculateSimilarity(sourceProfile, profile);
    matches.push({ personId: id, profile, similarity });
  });

  matches.sort((a, b) => b.similarity - a.similarity);

  const maxResults = parseInt(limit) || 10;
  const topMatches = matches.slice(0, maxResults);

  res.json({
    personId,
    sourceProfile,
    matches: topMatches.map(m => ({
      personId: m.personId,
      similarity: m.similarity,
      profile: m.profile
    }))
  });
});

/**
 * Calculate similarity between two profiles
 */
function calculateSimilarity(p1, p2) {
  const dimensions = ['directness', 'detailLevel', 'humor', 'formality', 'emotional', 'decisionSpeed'];
  let totalDiff = 0;

  dimensions.forEach(dim => {
    const v1 = p1[dim] || 50;
    const v2 = p2[dim] || 50;
    totalDiff += Math.abs(v1 - v2);
  });

  // Max difference is 600 (6 dimensions * 100)
  const similarity = 100 - (totalDiff / 600) * 100;
  return Math.round(similarity);
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLE RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /recommend - Get style recommendations for communication
 */
app.post('/recommend', (req, res) => {
  const { personId, targetId, message } = req.body;

  if (!personId) {
    return res.status(400).json({ error: 'personId required' });
  }

  const profile = profiles.get(personId);
  const targetProfile = targetId ? profiles.get(targetId) : null;

  const recommendations = [];

  // Message-specific recommendations
  if (message) {
    const analysis = analyzeText(message);

    if (profile) {
      if (Math.abs(analysis.directness - profile.directness) > 30) {
        recommendations.push({
          type: 'directness',
          message: profile.directness > 60
            ? 'Consider being more direct'
            : 'Consider softening your approach'
        });
      }

      if (message.length > 500 && profile.detailLevel < 50) {
        recommendations.push({
          type: 'length',
          message: 'Target prefers brief communications - consider shortening'
        });
      }
    }
  }

  // Target-specific recommendations
  if (targetProfile && profile) {
    const adaptations = generateAdaptation(targetProfile, profile);
    adaptations.forEach(a => {
      recommendations.push({
        type: 'adaptation',
        dimension: a.dimension,
        message: a.action
      });
    });
  }

  res.json({
    personId,
    targetId,
    profile,
    recommendations
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'communication-dna',
    port: PORT,
    profiles: profiles.size
  });
});

app.listen(PORT, () => {
  console.log(`Communication DNA Service running on port ${PORT}`);
});

export default app;
