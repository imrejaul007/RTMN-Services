/**
 * LLM Intelligence Adapter — v1.0.0
 * ===================================
 * LLM-powered intelligence for Genie:
 * - Meeting summarization (4-layer)
 * - Task extraction from text
 * - Decision extraction
 * - Relationship intelligence
 * - Knowledge extraction
 * - Sentiment analysis
 *
 * Providers: OpenAI, Claude, Gemini, Ollama (local)
 */

import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// LLM Adapter Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createLLMAdapter(provider = 'openai', config = {}) {
  switch (provider) {
    case 'openai':
      return new OpenAIAdapter(config);
    case 'claude':
      return new ClaudeAdapter(config);
    case 'gemini':
      return new GeminiAdapter(config);
    case 'ollama':
      return new OllamaAdapter(config);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Meeting Intelligence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate 4-layer meeting summary
 */
export async function generateMeetingSummary(transcript, context = {}, adapter) {
  const {
    meetingType = 'general',
    participants = [],
    userId = null,
    language = 'en'
  } = context;

  const prompt = buildMeetingSummaryPrompt(transcript, { meetingType, participants, userId, language });

  const response = await adapter.generate(prompt, {
    system: MEETING_SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 2000
  });

  return parseMeetingSummaryResponse(response, userId);
}

/**
 * Extract tasks from transcript
 */
export async function extractTasksFromTranscript(transcript, context = {}, adapter) {
  const prompt = buildTaskExtractionPrompt(transcript, context);

  const response = await adapter.generate(prompt, {
    system: TASK_EXTRACTION_SYSTEM_PROMPT,
    temperature: 0.2,
    maxTokens: 1000
  });

  return parseTaskExtractionResponse(response);
}

/**
 * Extract decisions from transcript
 */
export async function extractDecisionsFromTranscript(transcript, context = {}, adapter) {
  const prompt = buildDecisionExtractionPrompt(transcript, context);

  const response = await adapter.generate(prompt, {
    system: DECISION_EXTRACTION_SYSTEM_PROMPT,
    temperature: 0.2,
    maxTokens: 1500
  });

  return parseDecisionExtractionResponse(response);
}

/**
 * Analyze relationship from conversation
 */
export async function analyzeRelationship(conversation, personA, personB, adapter) {
  const prompt = buildRelationshipAnalysisPrompt(conversation, personA, personB);

  const response = await adapter.generate(prompt, {
    system: RELATIONSHIP_ANALYSIS_SYSTEM_PROMPT,
    temperature: 0.4,
    maxTokens: 1000
  });

  return parseRelationshipAnalysisResponse(response);
}

/**
 * Extract knowledge/facts from conversation
 */
export async function extractKnowledge(conversation, context = {}, adapter) {
  const prompt = buildKnowledgeExtractionPrompt(conversation, context);

  const response = await adapter.generate(prompt, {
    system: KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 1000
  });

  return parseKnowledgeExtractionResponse(response);
}

/**
 * Analyze sentiment and emotions from text
 */
export async function analyzeSentiment(text, context = {}, adapter) {
  const prompt = buildSentimentAnalysisPrompt(text, context);

  const response = await adapter.generate(prompt, {
    system: SENTIMENT_ANALYSIS_SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 500
  });

  return parseSentimentAnalysisResponse(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI Adapter
// ─────────────────────────────────────────────────────────────────────────────

class OpenAIAdapter {
  constructor(config) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-4o';
  }

  async generate(prompt, options = {}) {
    const {
      system = null,
      temperature = 0.7,
      maxTokens = 1000,
      responseFormat = null
    } = options;

    const messages = [];
    if (system) {
      messages.push({ role: 'system', content: system });
    }
    messages.push({ role: 'user', content: prompt });

    const body = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    if (responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const response = await axios.post(`${this.baseUrl}/chat/completions`, body, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude Adapter
// ─────────────────────────────────────────────────────────────────────────────

class ClaudeAdapter {
  constructor(config) {
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.model = config.model || 'claude-sonnet-4-20250514';
  }

  async generate(prompt, options = {}) {
    const {
      system = null,
      temperature = 0.7,
      maxTokens = 1000
    } = options;

    const body = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens
    };

    if (system) {
      body.system = system;
    }

    const response = await axios.post(`${this.baseUrl}/messages`, body, {
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    return response.data.content[0].text;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Adapter
// ─────────────────────────────────────────────────────────────────────────────

class GeminiAdapter {
  constructor(config) {
    this.apiKey = config.apiKey || process.env.GOOGLE_AI_API_KEY;
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.model = config.model || 'gemini-2.0-flash';
  }

  async generate(prompt, options = {}) {
    const {
      system = null,
      temperature = 0.7,
      maxTokens = 1000
    } = options;

    const contents = [{ role: 'user', parts: [{ text: prompt }] }];

    if (system) {
      contents.unshift({ role: 'user', parts: [{ text: system }] });
    }

    const response = await axios.post(
      `${this.baseUrl}/models/${this.model}:generateContent`,
      {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      },
      {
        params: { key: this.apiKey }
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ollama Adapter (Local)
// ─────────────────────────────────────────────────────────────────────────────

class OllamaAdapter {
  constructor(config) {
    this.baseUrl = config.baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = config.model || 'llama3';
  }

  async generate(prompt, options = {}) {
    const {
      system = null,
      temperature = 0.7,
      maxTokens = 1000
    } = options;

    const body = {
      model: this.model,
      prompt,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens
      }
    };

    if (system) {
      body.system = system;
    }

    const response = await axios.post(`${this.baseUrl}/api/generate`, body);

    return response.data.response;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Builders
// ─────────────────────────────────────────────────────────────────────────────

function buildMeetingSummaryPrompt(transcript, context) {
  const { meetingType, participants, userId, language } = context;

  return `Analyze this ${meetingType} meeting transcript and generate a comprehensive 4-layer summary.

TRANSCRIPT:
${transcript}

CONTEXT:
- Meeting Type: ${meetingType}
- Primary User: ${userId || 'Unknown'}
- Participants: ${participants.map(p => p.name || p.userId).join(', ') || 'Unknown'}
- Language: ${language}

Generate a JSON response with these 4 layers:`;
}

function buildTaskExtractionPrompt(transcript, context) {
  const { userId = null, knownPeople = [] } = context;

  return `Extract ALL tasks, action items, and commitments from this meeting transcript.

TRANSCRIPT:
${transcript}

PRIMARY USER: ${userId || 'Unknown'}
KNOWN PEOPLE: ${knownPeople.map(p => `${p.name} (${p.userId})`).join(', ') || 'None'}

Extract tasks following these rules:
1. Look for: "will", "should", "can", "need to", "must", "going to", "promised", "agreed to"
2. For each task extract: owner, action, deadline (if mentioned), priority
3. Infer the owner from context ("I will..." = primary user, "you should..." = addressed person)
4. Priority: high if urgent/important mentioned, low if casual, medium otherwise

Return as JSON array of tasks:`;
}

function buildDecisionExtractionPrompt(transcript, context) {
  return `Extract ALL decisions made in this meeting transcript.

TRANSCRIPT:
${transcript}

For each decision extract:
1. what: What was decided (clear, specific)
2. why: Why this decision was made (reason/context)
3. confidence: How certain is this a decision (0.0-1.0)
4. alternatives: What alternatives were discussed (even rejected ones)
5. stakeholders: Who made/was involved in this decision
6. context: Surrounding context that led to this decision

Return as JSON array of decisions:`;
}

function buildRelationshipAnalysisPrompt(conversation, personA, personB) {
  return `Analyze the relationship between ${personA} and ${personB} based on this conversation.

CONVERSATION:
${conversation}

Analyze:
1. Trust level (0-100): Based on language, commitments, follow-through
2. Communication style of each person
3. Power dynamics (who leads, who follows)
4. Emotional undertones
5. Areas of agreement/disagreement
6. Recommendations for ${personA} on how to best communicate with ${personB}

Return as JSON:`;
}

function buildKnowledgeExtractionPrompt(conversation, context) {
  const { domain = 'general' } = context;

  return `Extract knowledge, facts, and insights from this conversation.

CONVERSATION:
${conversation}

DOMAIN: ${domain}

Extract:
1. facts: Factual statements made (not opinions)
2. preferences: Stated likes/dislikes/preferences
3. skills: Skills or expertise mentioned
4. experiences: Past experiences shared
5. goals: Goals or objectives mentioned
6. constraints: Limitations, problems, blockers mentioned

Return as JSON:`;
}

function buildSentimentAnalysisPrompt(text, context) {
  const { speaker = 'Unknown' } = context;

  return `Analyze the sentiment and emotions in this text from ${speaker}.

TEXT:
${text}

Return as JSON:
{
  "sentiment": "positive|negative|neutral",
  "primaryEmotion": "...",
  "secondaryEmotions": [...],
  "confidence": 0.0-1.0,
  "intensity": "low|medium|high",
  "keyPhrases": [...],
  "implications": "..."
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response Parsers
// ─────────────────────────────────────────────────────────────────────────────

function parseMeetingSummaryResponse(response, userId) {
  try {
    const json = JSON.parse(response);
    return {
      executive: {
        topics: json.executive?.topics || [],
        decisions: json.executive?.decisions || [],
        risks: json.executive?.risks || [],
        keyOutcomes: json.executive?.keyOutcomes || []
      },
      action: {
        tasks: (json.action?.tasks || []).map(t => ({
          owner: t.owner || userId,
          action: t.action,
          deadline: t.deadline || null,
          priority: t.priority || 'medium'
        }))
      },
      relationship: {
        trustChanges: json.relationship?.trustChanges || [],
        communicationNotes: json.relationship?.notes || [],
        followUpRecommended: json.relationship?.followUp || null
      },
      knowledge: {
        facts: json.knowledge?.facts || [],
        preferences: json.knowledge?.preferences || [],
        insights: json.knowledge?.insights || []
      },
      raw: json
    };
  } catch (e) {
    // If not JSON, return as text summary
    return {
      executive: { textSummary: response },
      action: { tasks: [] },
      relationship: { notes: [] },
      knowledge: { insights: [] },
      raw: response
    };
  }
}

function parseTaskExtractionResponse(response) {
  try {
    const json = JSON.parse(response);
    const tasks = Array.isArray(json) ? json : json.tasks || [];

    return tasks.map((t, i) => ({
      id: `task_${Date.now()}_${i}`,
      owner: t.owner || 'Team',
      action: t.action || t.description || t.task,
      deadline: t.deadline || t.due || null,
      priority: t.priority || t.urgency || 'medium',
      source: 'meeting'
    }));
  } catch (e) {
    return [];
  }
}

function parseDecisionExtractionResponse(response) {
  try {
    const json = JSON.parse(response);
    const decisions = Array.isArray(json) ? json : json.decisions || [];

    return decisions.map((d, i) => ({
      id: `dec_${Date.now()}_${i}`,
      what: d.what || d.decision,
      why: d.why || d.reason || null,
      confidence: d.confidence || 0.7,
      alternatives: d.alternatives || d.options || [],
      stakeholders: d.stakeholders || d.who || [],
      context: d.context || null
    }));
  } catch (e) {
    return [];
  }
}

function parseRelationshipAnalysisResponse(response) {
  try {
    const json = JSON.parse(response);
    return {
      trust: json.trust || 50,
      communicationStyles: json.communicationStyles || {},
      powerDynamics: json.powerDynamics || {},
      emotionalTone: json.emotionalTone || 'neutral',
      recommendations: json.recommendations || []
    };
  } catch (e) {
    return {
      trust: 50,
      recommendations: []
    };
  }
}

function parseKnowledgeExtractionResponse(response) {
  try {
    const json = JSON.parse(response);
    return {
      facts: json.facts || [],
      preferences: json.preferences || [],
      skills: json.skills || [],
      experiences: json.experiences || [],
      goals: json.goals || [],
      constraints: json.constraints || []
    };
  } catch (e) {
    return { facts: [], preferences: [], skills: [], experiences: [], goals: [], constraints: [] };
  }
}

function parseSentimentAnalysisResponse(response) {
  try {
    const json = JSON.parse(response);
    return {
      sentiment: json.sentiment || 'neutral',
      primaryEmotion: json.primaryEmotion || 'neutral',
      secondaryEmotions: json.secondaryEmotions || [],
      confidence: json.confidence || 0.5,
      intensity: json.intensity || 'medium',
      keyPhrases: json.keyPhrases || [],
      implications: json.implications || ''
    };
  } catch (e) {
    return {
      sentiment: 'neutral',
      primaryEmotion: 'neutral',
      confidence: 0.5
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// System Prompts
// ─────────────────────────────────────────────────────────────────────────────

const MEETING_SYSTEM_PROMPT = `You are an expert meeting analyst. Generate structured, actionable insights from meeting transcripts. Always respond with valid JSON matching the specified schema. Be precise and extract all meaningful information.`;

const TASK_EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting action items from meeting transcripts. Be thorough - find ALL commitments, not just obvious ones. Inferred tasks (like "when someone says they have a deadline next week") count too.`;

const DECISION_EXTRACTION_SYSTEM_PROMPT = `You are an expert at identifying decisions in meetings. A decision is a commitment to a specific course of action. Look for agreement language, commitment language, and final statements. Distinguish between decisions and discussions.`;

const RELATIONSHIP_ANALYSIS_SYSTEM_PROMPT = `You are an expert at analyzing interpersonal dynamics. Provide nuanced insights about trust, communication styles, and relationship health. Be specific with examples from the conversation.`;

const KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting factual knowledge from conversations. Focus on concrete facts, not interpretations. Note the source person when possible.`;

const SENTIMENT_ANALYSIS_SYSTEM_PROMPT = `You are an expert at emotional analysis. Go beyond simple positive/negative to identify specific emotions and their intensity. Consider context and nuance.`;

// ─────────────────────────────────────────────────────────────────────────────
// Default Export
// ─────────────────────────────────────────────────────────────────────────────

export default {
  createLLMAdapter,
  generateMeetingSummary,
  extractTasksFromTranscript,
  extractDecisionsFromTranscript,
  analyzeRelationship,
  extractKnowledge,
  analyzeSentiment
};
