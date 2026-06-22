/**
 * Brainstorming Routes - Idea generation and creativity
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /brainstorm
 * Brainstorm ideas
 */
router.post('/brainstorm', async (req, res) => {
  const { userId, topic, count, category } = req.body;

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }

  const ideaCount = count || 10;

  // Generate ideas based on category
  const ideas = generateIdeas(topic, ideaCount, category);

  // Categorize ideas
  const categorized = categorizeIdeas(ideas);

  res.json({
    success: true,
    topic,
    ideas,
    categorized,
    count: ideas.length
  });
});

/**
 * POST /brainstorm/scatter
 * Scatter-gather brainstorming
 */
router.post('/brainstorm/scatter', async (req, res) => {
  const { userId, topic, perspectives } = req.body;

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }

  const perspectiveList = perspectives || [
    'customer', 'competitor', 'investor', 'employee', 'expert'
  ];

  const results = perspectiveList.map(perspective => ({
    perspective,
    ideas: generateIdeasFromPerspective(topic, perspective),
    insights: generateInsightsFromPerspective(topic, perspective)
  }));

  // Find common themes
  const themes = findCommonThemes(results.map(r => r.ideas));

  res.json({
    success: true,
    topic,
    results,
    commonThemes: themes,
    count: results.reduce((sum, r) => sum + r.ideas.length, 0)
  });
});

/**
 * POST /brainstorm/reverse
 * Reverse brainstorming (how to make it worse, then flip)
 */
router.post('/brainstorm/reverse', async (req, res) => {
  const { userId, topic } = req.body;

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }

  // Step 1: How to make it worse
  const worse = [
    `How to make ${topic} fail completely?`,
    `How to make customers hate ${topic}?`,
    `How to waste resources on ${topic}?`,
    `How to create chaos with ${topic}?`
  ];

  // Step 2: Flip to positive
  const solutions = worse.map(w => ({
    problem: w,
    flipped: `Instead: How to ensure ${topic} succeeds by NOT doing the opposite`,
    solution: flipToPositive(w, topic)
  }));

  res.json({
    success: true,
    topic,
    reverse: solutions,
    insight: 'Sometimes solving "how to make it worse" reveals what NOT to do, and what TO do instead'
  });
});

/**
 * POST /brainstorm/six-hats
 * Six Thinking Hats method
 */
router.post('/brainstorm/six-hats', async (req, res) => {
  const { userId, topic } = req.body;

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }

  const hats = [
    {
      hat: 'White Hat',
      color: '⚪',
      focus: 'Facts & Information',
      thinking: generateWhiteHatThinking(topic)
    },
    {
      hat: 'Red Hat',
      color: '❤️',
      focus: 'Emotions & Feelings',
      thinking: generateRedHatThinking(topic)
    },
    {
      hat: 'Black Hat',
      color: '🖤',
      focus: 'Caution & Critical',
      thinking: generateBlackHatThinking(topic)
    },
    {
      hat: 'Yellow Hat',
      color: '💛',
      focus: 'Optimism & Benefits',
      thinking: generateYellowHatThinking(topic)
    },
    {
      hat: 'Green Hat',
      color: '💚',
      focus: 'Creativity & New Ideas',
      thinking: generateGreenHatThinking(topic)
    },
    {
      hat: 'Blue Hat',
      color: '💙',
      focus: 'Process & Control',
      thinking: generateBlueHatThinking(topic)
    }
  ];

  res.json({
    success: true,
    topic,
    hats,
    summary: hats.map(h => `${h.color} ${h.hat}: ${h.thinking.slice(0, 2).join(', ')}`).join(' | ')
  });
});

/**
 * POST /brainstorm/crazy-8
 * Crazy 8 brainstorming
 */
router.post('/brainstorm/crazy-8', async (req, res) => {
  const { userId, topic } = req.body;

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }

  // Generate 8 diverse ideas in 8 minutes
  const rounds = [
    { minute: 1, constraint: 'Solve for affordability', angle: 'low-cost' },
    { minute: 2, constraint: 'Solve for quality', angle: 'premium' },
    { minute: 3, constraint: 'Solve for speed', angle: 'fast' },
    { minute: 4, constraint: 'Solve for simplicity', angle: 'easy' },
    { minute: 5, constraint: 'Solve for personalization', angle: 'custom' },
    { minute: 6, constraint: 'Solve for sustainability', angle: 'eco' },
    { minute: 7, constraint: 'Solve for scale', angle: 'mass' },
    { minute: 8, constraint: 'Solve for community', angle: 'social' }
  ];

  const ideas = rounds.map(r => ({
    round: r.minute,
    constraint: r.constraint,
    idea: generateConstrainedIdea(topic, r.angle)
  }));

  res.json({
    success: true,
    topic,
    technique: 'Crazy 8 (8 ideas in 8 minutes)',
    ideas,
    tip: 'Pick your favorite from each round to refine further'
  });
});

/**
 * POST /brainstorm/analogies
 * Analogical thinking
 */
router.post('/brainstorm/analogies', async (req, res) => {
  const { userId, topic } = req.body;

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }

  const analogies = [
    { source: 'Nature', concepts: ['evolution', 'symbiosis', 'adaptation'] },
    { source: 'Technology', concepts: ['scalability', 'networks', 'automation'] },
    { source: 'Sports', concepts: ['teamwork', 'training', 'competition'] },
    { source: 'Cooking', concepts: ['ingredients', 'recipes', 'presentation'] },
    { source: 'Music', concepts: ['rhythm', 'harmony', 'improvisation'] }
  ];

  const results = analogies.map(a => ({
    source: a.source,
    concept: a.concepts[Math.floor(Math.random() * a.concepts.length)],
    application: `Apply ${a.source}'s concept of "${a.concepts[0]}" to ${topic}`,
    idea: `Use ${a.source.toLowerCase()} thinking to innovate ${topic.toLowerCase()}`
  }));

  res.json({
    success: true,
    topic,
    analogies: results,
    insight: 'Innovation often comes from applying concepts from one domain to another'
  });
});

// Helper functions
function generateIdeas(topic, count, category) {
  const templates = [
    `Implement a loyalty program for ${topic}`,
    `Create a mobile-first experience for ${topic}`,
    `Add AI-powered personalization to ${topic}`,
    `Introduce a subscription model for ${topic}`,
    `Build a community around ${topic}`,
    `Partner with complementary brands for ${topic}`,
    `Gamify the ${topic} experience`,
    `Add social sharing features to ${topic}`,
    `Create a premium tier for ${topic}`,
    `Launch a referral program for ${topic}`,
    `Automate the ${topic} workflow`,
    `Add real-time analytics to ${topic}`,
    `Introduce a freemium model for ${topic}`,
    `Create an API for ${topic}`,
    `Build a white-label version of ${topic}`,
    `Add offline capabilities to ${topic}`,
    `Introduce seasonal themes for ${topic}`,
    `Create a marketplace within ${topic}`,
    `Add user-generated content to ${topic}`,
    `Integrate ${topic} with smart home devices`
  ];

  return templates.slice(0, count).map((idea, i) => ({
    id: i + 1,
    idea,
    type: i < count / 3 ? 'innovation' : i < count * 2 / 3 ? 'growth' : 'optimization'
  }));
}

function categorizeIdeas(ideas) {
  return {
    innovation: ideas.filter(i => i.type === 'innovation'),
    growth: ideas.filter(i => i.type === 'growth'),
    optimization: ideas.filter(i => i.type === 'optimization')
  };
}

function generateIdeasFromPerspective(topic, perspective) {
  const templates = {
    customer: [`What would make me choose ${topic} over alternatives?`, `What would make me recommend ${topic}?`],
    competitor: [`How could we differentiate from ${topic}?`, `What would make us win against ${topic}?`],
    investor: [`How can ${topic} scale faster?`, `What metrics matter most for ${topic}?`],
    employee: [`How can we deliver ${topic} more efficiently?`, `What would make us proud of ${topic}?`],
    expert: [`What best practices should ${topic} follow?`, `What innovations are possible in ${topic}?`]
  };
  return templates[perspective] || [];
}

function generateInsightsFromPerspective(topic, perspective) {
  return [`From the ${perspective} perspective, ${topic} should focus on differentiators and value`];
}

function findCommonThemes(allIdeas) {
  return ['User experience', 'Value proposition', 'Scalability'];
}

function flipToPositive(problem, topic) {
  return `Ensure ${topic} succeeds by ensuring quality, efficiency, and customer satisfaction`;
}

function generateWhiteHatThinking(topic) {
  return [
    `Current market size for ${topic}: Growing at 15% YoY`,
    `Customer satisfaction with ${topic}: 72%`,
    `Average time to value: 3 months`
  ];
}

function generateRedHatThinking(topic) {
  return [
    `Intuition tells me ${topic} could be exciting`,
    `I feel ${topic} could create joy for users`,
    `There's passion potential in ${topic}`
  ];
}

function generateBlackHatThinking(topic) {
  return [
    `Risk: ${topic} may face regulatory challenges`,
    `Concern: Initial costs could be high`,
    `Caution: Competition in ${topic} space is intense`
  ];
}

function generateYellowHatThinking(topic) {
  return [
    `Opportunity: ${topic} addresses unmet needs`,
    `Benefit: ${topic} could generate recurring revenue`,
    `Optimism: ${topic} has high growth potential`
  ];
}

function generateGreenHatThinking(topic) {
  return [
    `Creative idea: ${topic} could use blockchain for transparency`,
    `Innovation: ${topic} could incorporate AR/VR elements`,
    `New angle: ${topic} could be community-driven`
  ];
}

function generateBlueHatThinking(topic) {
  return [
    `Process: Define scope first, then prioritize features`,
    `Control: Use agile methodology for ${topic}`,
    `Next: Schedule follow-up to refine ${topic} strategy`
  ];
}

function generateConstrainedIdea(topic, angle) {
  const ideas = {
    'low-cost': `Offer ${topic} at a fraction of current prices`,
    'premium': `Position ${topic} as a luxury experience`,
    'fast': `Make ${topic} instant and frictionless`,
    'easy': `Simplify ${topic} to one-tap interaction`,
    'custom': `Personalize ${topic} using AI for each user`,
    'eco': `Make ${topic} carbon neutral and sustainable`,
    'mass': `Scale ${topic} to reach millions`,
    'social': `Add community features to ${topic}`
  };
  return ideas[angle] || `Innovate ${topic} through ${angle}`;
}

export default router;
