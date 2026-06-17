/**
 * Cosmic OS - Core Service
 *
 * AI Council of Agents, cosmic interpretation, spiritual abstraction
 */

import axios from 'axios';
import type {
  Mood,
  EnergyLevel,
  Domain,
  AgentType,
  CosmicState,
  MoodCheckIn,
  Insight,
  CouncilResponse,
  DailyReading,
  DomainGuidance,
  EmotionalServiceResponse,
  LifePatternResponse,
  HumanContextResponse,
} from '../types';

// ============================================
// SERVICE URLS
// ============================================

const SERVICE_URLS = {
  emotional: process.env.EMOTIONAL_SERVICE_URL || 'http://localhost:4160',
  lifePattern: process.env.LIFE_PATTERN_SERVICE_URL || 'http://localhost:4161',
  humanContext: process.env.HUMAN_CONTEXT_URL || 'http://localhost:4162',
  signalAggregator: process.env.SIGNAL_AGGREGATOR_URL || 'http://localhost:4142',
};

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// ============================================
// MOOD TO COSMIC STATE MAPPING
// ============================================

const MOOD_MAP: Record<Mood, { tone: string; social: number; focus: number }> = {
  very_positive: { tone: 'Radiant and expansive', social: 90, focus: 85 },
  positive: { tone: 'Warm and hopeful', social: 80, focus: 75 },
  neutral: { tone: 'Steady and centered', social: 60, focus: 70 },
  negative: { tone: 'Contemplative and reflective', social: 40, focus: 60 },
  very_negative: { tone: 'Quiet and introspective', social: 30, focus: 50 },
  anxious: { tone: 'Restless and searching', social: 50, focus: 30 },
  calm: { tone: 'Serene and content', social: 60, focus: 85 },
  energetic: { tone: 'Dynamic and vibrant', social: 80, focus: 70 },
  tired: { tone: 'Quiet and restorative', social: 30, focus: 50 },
  stressed: { tone: 'Intense and pressured', social: 40, focus: 40 },
  peaceful: { tone: 'Tranquil and harmonious', social: 50, focus: 90 },
};

// ============================================
// MOOD INTERPRETATION
// ============================================

export function interpretMoodToCosmicState(mood: Mood, energy: number): CosmicState {
  const mapped = MOOD_MAP[mood] || { tone: 'Variable and nuanced', social: 50, focus: 60 };
  const energyLevel: EnergyLevel = energy > 70 ? 'high' : energy > 40 ? 'medium' : 'low';

  return {
    energyLevel,
    emotionalTone: mapped.tone,
    socialEnergy: mapped.social,
    focusScore: mapped.focus,
    relationshipEnergy: getRelationshipGuidance(mapped.social),
    financialEnergy: getFinancialGuidance(energyLevel),
    growthEnergy: getGrowthInsight(energyLevel),
  };
}

function getRelationshipGuidance(socialEnergy: number): number {
  if (socialEnergy >= 70) return 90;
  if (socialEnergy >= 50) return 70;
  if (socialEnergy >= 30) return 50;
  return 30;
}

function getFinancialGuidance(energyLevel: EnergyLevel): number {
  if (energyLevel === 'high') return 85;
  if (energyLevel === 'medium') return 65;
  return 45;
}

function getGrowthInsight(energyLevel: EnergyLevel): number {
  if (energyLevel === 'high') return 80;
  if (energyLevel === 'medium') return 60;
  return 40;
}

// ============================================
// AGENT INSIGHT GENERATORS
// ============================================

function generateMysticInsight(state: CosmicState, input: MoodCheckIn): Insight {
  const themes = [
    'Your inner wisdom seeks expression today',
    'The universe conspires in your favor',
    'Trust the path that unfolds before you',
    'Your intuition is particularly sharp now',
  ];

  const theme = themes[Math.floor(Math.random() * themes.length)];

  return {
    agent: 'mystic',
    category: 'spiritual',
    title: 'Cosmic Alignment',
    interpretation: theme,
    symbolic: 'The stars whisper secrets meant only for you',
    practical: 'Take a moment for meditation or reflection today',
    confidence: 0.8,
  };
}

function generateHealerInsight(state: CosmicState, input: MoodCheckIn): Insight {
  let healing = 'Your emotional resilience is strong';
  let practical = 'Consider sharing your warmth with others';

  if (input.context?.workStress && input.context.workStress > 60) {
    healing = 'Work stress is affecting your emotional balance';
    practical = 'Consider delegating or taking a short break';
  }

  return {
    agent: 'healer',
    category: 'emotional',
    title: 'Inner Harmony',
    interpretation: healing,
    symbolic: 'The healer within you seeks balance and restoration',
    practical,
    confidence: 0.75,
  };
}

function generateStrategistInsight(state: CosmicState, input: MoodCheckIn): Insight {
  let guidance = 'Focus serves you well today';
  let practical = 'Prioritize your most important tasks';

  if (state.focusScore < 50) {
    guidance = 'Your focus may waver - be gentle with yourself';
    practical = 'Break large tasks into smaller, manageable steps';
  }

  return {
    agent: 'strategist',
    category: 'career',
    title: 'Strategic Clarity',
    interpretation: guidance,
    symbolic: 'The strategist charts a course through possibility',
    practical,
    timing: 'Morning hours favor deep work',
    confidence: 0.75,
  };
}

function generateOracleInsight(state: CosmicState, input: MoodCheckIn): Insight {
  const patterns = [
    'You may notice recurring themes or messages appearing',
    'Patterns from the past may offer guidance for today',
    'The rhythm of your life reveals its own wisdom',
    'What feels familiar may hold a new lesson',
  ];

  const pattern = patterns[Math.floor(Math.random() * patterns.length)];

  return {
    agent: 'oracle',
    category: 'spiritual',
    title: 'Pattern Recognition',
    interpretation: pattern,
    symbolic: 'The oracle sees threads connecting moments across time',
    practical: 'Look for what repeats - it carries meaning',
    timing: 'Past insights may illuminate present choices',
    confidence: 0.7,
  };
}

function generateConnectorInsight(state: CosmicState, input: MoodCheckIn): Insight {
  const socialMessages = {
    high: 'Connection energy flows freely - meaningful exchanges are favored',
    medium: 'Selective connection serves you well',
    low: 'Quality connection matters more than quantity today',
  };

  const message = socialMessages[state.energyLevel];

  return {
    agent: 'connector',
    category: 'relationship',
    title: 'Social Harmony',
    interpretation: message,
    symbolic: 'Every connection shifts both parties - this is the nature of relationship',
    practical:
      state.socialEnergy > 60
        ? 'Reach out to someone who matters - your warmth is felt'
        : 'A meaningful conversation, even brief, may carry weight today',
    confidence: 0.75,
  };
}

function generateWealthGuideInsight(state: CosmicState, input: MoodCheckIn): Insight {
  let guidance = 'Financial decisions made with clarity serve long-term wellbeing';
  let practical = 'Abundance is a mindset as much as a material condition';

  if (input.context?.financialStress && input.context.financialStress > 60) {
    return {
      agent: 'wealth_guide',
      category: 'financial',
      title: 'Financial Sensitivity',
      interpretation: 'Current circumstances may feel restrictive',
      symbolic: 'The wealth guide reminds - scarcity is temporary, abundance is eternal',
      practical: 'Focus on what you can control - small steps lead to big changes',
      confidence: 0.8,
    };
  }

  return {
    agent: 'wealth_guide',
    category: 'financial',
    title: 'Abundance Mindset',
    interpretation: guidance,
    symbolic: 'Prosperity flows when aligned with purpose',
    practical,
    confidence: 0.7,
  };
}

function generateExplorerInsight(state: CosmicState, input: MoodCheckIn): Insight {
  let guidance = 'Adventure calls - new experiences await';
  let practical = 'Step outside your comfort zone today';

  if (state.energyLevel === 'low') {
    guidance = 'Rest and reflection are their own form of exploration';
    practical = 'Explore ideas, books, or conversations rather than physical adventure';
  }

  return {
    agent: 'explorer',
    category: 'spiritual',
    title: 'Growth Opportunity',
    interpretation: guidance,
    symbolic: 'The explorer sees possibility in every horizon',
    practical,
    confidence: 0.72,
  };
}

// ============================================
// COUNCIL RESPONSE
// ============================================

function generateAgentInsight(agentType: AgentType, cosmicState: CosmicState, input: MoodCheckIn): Insight {
  switch (agentType) {
    case 'mystic':
      return generateMysticInsight(cosmicState, input);
    case 'healer':
      return generateHealerInsight(cosmicState, input);
    case 'strategist':
      return generateStrategistInsight(cosmicState, input);
    case 'oracle':
      return generateOracleInsight(cosmicState, input);
    case 'connector':
      return generateConnectorInsight(cosmicState, input);
    case 'wealth_guide':
      return generateWealthGuideInsight(cosmicState, input);
    case 'explorer':
      return generateExplorerInsight(cosmicState, input);
    default:
      return generateMysticInsight(cosmicState, input);
  }
}

function generateConsensus(insights: Insight[]): { theme: string; summary: string; suggestedAction: string } {
  const themes = insights
    .filter((i) => i.category === 'spiritual' || i.category === 'emotional')
    .map((i) => i.title);

  const mainTheme = themes[0] || 'Balance and Growth';

  return {
    theme: mainTheme,
    summary: `The council sees alignment in your path. ${insights.length} insights guide your journey.`,
    suggestedAction: insights[0]?.practical || 'Trust your inner wisdom',
  };
}

// ============================================
// DAILY AFFIRMATIONS & CAUTIONS
// ============================================

function getAffirmation(state: CosmicState): string {
  const affirmations: Record<EnergyLevel, string[]> = {
    high: [
      'I embrace this abundant energy with gratitude',
      'My enthusiasm lights the way for others',
      'Today I create and share freely',
    ],
    medium: [
      'I am exactly where I need to be',
      'Each moment brings its own gifts',
      'I trust the unfolding of my journey',
    ],
    low: [
      'Rest is part of the journey, not apart from it',
      'Tomorrow holds new possibilities',
      'I honor my need for stillness',
    ],
  };

  const pool = affirmations[state.energyLevel];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getCaution(state: CosmicState): string {
  const cautions: Record<EnergyLevel, string> = {
    high: 'Channel your abundant energy wisely - not everything needs immediate action',
    medium: 'Balance action with reflection - both have their place',
    low: 'Avoid comparing your rest to others\' progress - your pace is perfect',
  };

  return cautions[state.energyLevel];
}

// ============================================
// PUBLIC API
// ============================================

export function generateCouncilResponse(
  cosmicState: CosmicState,
  input: MoodCheckIn,
  activeAgents: AgentType[] = ['mystic', 'healer', 'strategist', 'oracle']
): CouncilResponse {
  const insights = activeAgents.map((agent) => generateAgentInsight(agent, cosmicState, input));

  return {
    cosmicState,
    mood: input.mood,
    energy: input.energy,
    insights,
    consensus: generateConsensus(insights),
    dailyAffirmation: getAffirmation(cosmicState),
    caution: getCaution(cosmicState),
    timestamp: new Date().toISOString(),
  };
}

export function generateDailyReading(state: CosmicState, userId: string): DailyReading {
  const agents: AgentType[] = ['mystic', 'healer', 'strategist', 'oracle', 'connector', 'explorer'];
  const insights = agents.map((agent) =>
    generateAgentInsight(agent, state, {
      userId,
      mood: 'neutral',
      energy: 50,
      timestamp: new Date().toISOString(),
    })
  );

  const affirmations = [
    'I am worthy of love and belonging',
    'My journey is unique and meaningful',
    'I trust the process of life',
  ];

  const themes = [
    'Integration and Wholeness',
    'Courage and Vulnerability',
    'Presence and Acceptance',
    'Growth Through Connection',
  ];

  return {
    userId,
    date: new Date().toISOString().split('T')[0],
    cosmicState: state,
    insights,
    affirmation: affirmations[Math.floor(Math.random() * affirmations.length)],
    theme: themes[Math.floor(Math.random() * themes.length)],
    suggestedActions: insights.slice(0, 3).map((i) => i.practical),
    avoidedActions: [
      'Don\'t force decisions today',
      'Avoid comparing yourself to others',
      'Don\'t overcommit your energy',
    ],
    moonPhase: getMoonPhase(),
    luckyColor: ['Purple', 'Gold', 'Teal', 'Rose'][Math.floor(Math.random() * 4)],
    luckyNumber: Math.floor(Math.random() * 9) + 1,
  };
}

function getMoonPhase(): string {
  const phases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  return phases[Math.floor(Math.random() * phases.length)];
}

export function getDomainGuidance(domain: Domain, state: CosmicState, input: MoodCheckIn): DomainGuidance {
  switch (domain) {
    case 'emotional':
      return {
        domain,
        guidance: generateHealerInsight(state, input).interpretation,
        actionItems: ['Practice self-compassion', 'Express your feelings', 'Seek joyful activities'],
        affirmations: ['I honor my emotions', 'I am healing and whole'],
      };
    case 'relationship':
      return {
        domain,
        guidance: generateConnectorInsight(state, input).interpretation,
        actionItems: ['Reach out to a loved one', 'Practice active listening', 'Express gratitude'],
        affirmations: ['I am worthy of connection', 'Loving relationships are my birthright'],
      };
    case 'career':
      return {
        domain,
        guidance: generateStrategistInsight(state, input).interpretation,
        actionItems: ['Prioritize your top 3 tasks', 'Take one calculated risk', 'Seek feedback'],
        affirmations: ['I am capable and creative', 'My work has meaning'],
      };
    case 'financial':
      return {
        domain,
        guidance: generateWealthGuideInsight(state, input).interpretation,
        actionItems: ['Review your spending', 'Set a financial intention', 'Practice gratitude for abundance'],
        affirmations: ['Money flows easily to me', 'I am a good steward of resources'],
      };
    case 'health':
      return {
        domain,
        guidance: 'Your body holds wisdom - listen to its signals',
        actionItems: ['Move your body gently', 'Hydrate well', 'Get adequate rest'],
        affirmations: ['My body is my temple', 'I nourish myself with care'],
      };
    case 'spiritual':
      return {
        domain,
        guidance: generateOracleInsight(state, input).interpretation,
        actionItems: ['Meditate for 10 minutes', 'Journal your insights', 'Spend time in nature'],
        affirmations: ['I am connected to all that is', 'My intuition guides me truly'],
      };
    case 'social':
      return {
        domain,
        guidance: generateConnectorInsight(state, input).interpretation,
        actionItems: ['Initiate one meaningful conversation', 'Practice being fully present', 'Set healthy boundaries'],
        affirmations: ['I attract supportive relationships', 'I am a good friend to myself'],
      };
  }
}

export function processMoodCheckIn(checkIn: MoodCheckIn): CouncilResponse {
  const cosmicState = interpretMoodToCosmicState(checkIn.mood, checkIn.energy);
  return generateCouncilResponse(cosmicState, checkIn);
}

export async function generateCosmicContext(userId: string): Promise<{
  emotional?: EmotionalServiceResponse;
  lifePattern?: LifePatternResponse;
  humanContext?: HumanContextResponse;
}> {
  const results: {
    emotional?: EmotionalServiceResponse;
    lifePattern?: LifePatternResponse;
    humanContext?: HumanContextResponse;
  } = {};

  try {
    const [emotionalRes, lifePatternRes, humanContextRes] = await Promise.allSettled([
      axios.get(`${SERVICE_URLS.emotional}/api/emotional/${userId}`, {
        headers: { 'x-internal-token': INTERNAL_TOKEN },
        timeout: 3000,
      }),
      axios.get(`${SERVICE_URLS.lifePattern}/api/patterns/${userId}`, {
        headers: { 'x-internal-token': INTERNAL_TOKEN },
        timeout: 3000,
      }),
      axios.get(`${SERVICE_URLS.humanContext}/api/context/${userId}`, {
        headers: { 'x-internal-token': INTERNAL_TOKEN },
        timeout: 3000,
      }),
    ]);

    if (emotionalRes.status === 'fulfilled') {
      results.emotional = emotionalRes.value.data;
    }
    if (lifePatternRes.status === 'fulfilled') {
      results.lifePattern = lifePatternRes.value.data;
    }
    if (humanContextRes.status === 'fulfilled') {
      results.humanContext = humanContextRes.value.data;
    }
  } catch (error) {
    console.error('Failed to fetch cosmic context:', error);
  }

  return results;
}

// ============================================
// SUGGESTED ACTIONS
// ============================================

function generateSuggestedActions(state: CosmicState, council: Insight[]): string[] {
  const actions: string[] = [];

  if (state.socialEnergy > 70) {
    actions.push('Reach out to someone special today');
  }

  if (state.focusScore > 70) {
    actions.push('Tackle your most challenging task');
  }

  if (state.energyLevel === 'high') {
    actions.push('Channel this energy into creative pursuits');
  }

  const spiritualInsight = council.find((i) => i.category === 'spiritual');
  if (spiritualInsight) {
    actions.push(spiritualInsight.practical);
  }

  return actions;
}

function generateAvoidedActions(state: CosmicState): string[] {
  const avoided: string[] = [];

  if (state.energyLevel === 'low') {
    avoided.push('Avoid overcommitting your schedule');
    avoided.push('Don\'t compare your energy to others\'');
  }

  if (state.focusScore < 50) {
    avoided.push('Avoid major decisions requiring deep focus');
  }

  avoided.push('Don\'t force connections that don\'t feel natural');

  return avoided;
}
