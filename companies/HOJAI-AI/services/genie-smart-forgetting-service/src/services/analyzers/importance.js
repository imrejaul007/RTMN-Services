/**
 * Importance Analyzer - Determines memory importance
 */

const analyzeImportance = (memory) => {
  const { content, tags, entities, twinType, metadata } = memory;
  const text = (content || '').toLowerCase();

  let score = 0;
  const factors = [];

  // Twin type contribution
  const twinScores = {
    health: { score: 10, reason: 'Health memories are critical' },
    financial: { score: 9, reason: 'Financial records are important' },
    relationship: { score: 7, reason: 'Relationships matter deeply' },
    personal: { score: 6, reason: 'Personal memories have value' },
    business: { score: 6, reason: 'Work-related information' },
    learning: { score: 5, reason: 'Learning is valuable' },
    creative: { score: 4, reason: 'Creative work has medium importance' },
    default: { score: 3, reason: 'General memory' }
  };

  const twinFactor = twinScores[twinType] || twinScores.default;
  score += twinFactor.score;
  factors.push({ type: 'twin', ...twinFactor });

  // Entity count
  if (entities && entities.length > 0) {
    const entityScore = Math.min(entities.length * 1.5, 8);
    score += entityScore;
    factors.push({ type: 'entities', score: entityScore, reason: `${entities.length} entities found` });
  }

  // Tag importance
  if (tags && tags.length > 0) {
    const importantTags = ['important', 'milestone', 'achievement', 'goal', 'family', 'contract', 'legal'];
    const hasImportant = tags.filter(t => importantTags.includes(t.toLowerCase()));

    if (hasImportant.length > 0) {
      score += hasImportant.length * 2.5;
      factors.push({
        type: 'tags',
        score: hasImportant.length * 2.5,
        reason: `Important tags: ${hasImportant.join(', ')}`
      });
    }

    const lowTags = ['temp', 'draft', 'test', 'ignore', 'delete'];
    const hasLow = tags.filter(t => lowTags.includes(t.toLowerCase()));

    if (hasLow.length > 0) {
      score -= hasLow.length * 2;
      factors.push({
        type: 'tags',
        score: -hasLow.length * 2,
        reason: `Low-importance tags: ${hasLow.join(', ')}`
      });
    }
  }

  // Content keyword analysis
  const highImportanceKeywords = [
    'important', 'milestone', 'achievement', 'celebrate', 'significant',
    'first', 'best', 'contract', 'agreement', 'commitment', 'promise',
    'goal', 'milestone', 'accomplished', 'won', 'earned', 'graduated'
  ];

  const mediumImportanceKeywords = [
    'remember', 'noted', 'thought', 'idea', 'interesting', 'worthwhile',
    'meaningful', 'special', 'notable', 'mention', 'contact'
  ];

  const lowImportanceKeywords = [
    'maybe', 'probably', 'might', 'perhaps', 'sometime', 'optional',
    'draft', 'temp', 'test', 'ignore', 'delete later', 'random'
  ];

  highImportanceKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      score += 2.5;
      factors.push({ type: 'keyword', score: 2.5, reason: `Found: "${keyword}"` });
    }
  });

  mediumImportanceKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      score += 1;
      factors.push({ type: 'keyword', score: 1, reason: `Found: "${keyword}"` });
    }
  });

  lowImportanceKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      score -= 1.5;
      factors.push({ type: 'keyword', score: -1.5, reason: `Found low-importance: "${keyword}"` });
    }
  });

  // Sentiment intensity
  if (memory.sentiment) {
    if (memory.sentiment.intensity > 0.8) {
      score += 4;
      factors.push({ type: 'sentiment', score: 4, reason: 'Strong emotional content' });
    } else if (memory.sentiment.intensity > 0.5) {
      score += 2;
      factors.push({ type: 'sentiment', score: 2, reason: 'Moderate emotional content' });
    }
  }

  // Access patterns
  if (memory.accessCount && memory.accessCount > 5) {
    score += 3;
    factors.push({ type: 'access', score: 3, reason: `Accessed ${memory.accessCount} times` });
  }

  // Metadata hints
  if (metadata) {
    if (metadata.sharedWith?.length > 0) {
      score += 2;
      factors.push({ type: 'sharing', score: 2, reason: 'Shared with others' });
    }
    if (metadata.pinned) {
      score += 5;
      factors.push({ type: 'pinned', score: 5, reason: 'Pinned by user' });
    }
  }

  // Cap and normalize score
  score = Math.max(1, Math.min(10, score));

  // Determine importance level
  let level;
  if (score >= 7) level = 'high';
  else if (score >= 4) level = 'medium';
  else level = 'low';

  return {
    level,
    score,
    factors: factors.sort((a, b) => Math.abs(b.score) - Math.abs(a.score)),
    confidence: calculateConfidence(factors)
  };
};

const calculateConfidence = (factors) => {
  if (factors.length === 0) return 'low';
  if (factors.length >= 5) return 'high';
  if (factors.length >= 3) return 'medium';
  return 'low';
};

module.exports = { analyzeImportance };
