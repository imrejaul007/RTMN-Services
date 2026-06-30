/**
 * Genie Meeting Intelligence Pipeline
 * =================================
 * Wires all the meeting intelligence services together:
 * - Speech Adapters (Azure/Whisper/Google)
 * - Speaker Diarization
 * - LLM Intelligence (Claude/GPT/Gemini)
 * - Decision Twin
 * - Voice Cloning
 * - Genie Memory
 */

import { createSpeechAdapter, addSpeakerDiarization } from '../speech-adapters/src/index.js';
import { createLLMAdapter, generateMeetingSummary, extractTasksFromTranscript, extractDecisionsFromTranscript, analyzeSentiment } from '../llm-adapters/src/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Service URLs
// ─────────────────────────────────────────────────────────────────────────────

const SERVICES = {
  // Speech
  speechProvider: process.env.SPEECH_PROVIDER || 'azure', // azure, whisper, google, local-whisper
  speakerDiarization: process.env.SPEAKER_DIARIZATION_URL || 'http://localhost:4894',
  voiceEmbedding: process.env.VOICE_EMBEDDING_URL || 'http://localhost:4895',

  // Intelligence
  emotionGateway: process.env.EMOTION_GATEWAY_URL || 'http://localhost:4760',
  llmProvider: process.env.LLM_PROVIDER || 'claude', // openai, claude, gemini, ollama

  // Storage
  meetingStorage: process.env.MEETING_STORAGE_URL || 'http://localhost:4896',
  decisionTwin: process.env.DECISION_TWIN_URL || 'http://localhost:4741',
  memoryOs: process.env.MEMORY_OS_URL || 'http://localhost:4703',

  // Voice
  voiceCloning: process.env.VOICE_CLONING_URL || 'http://localhost:4897',
  genieGateway: process.env.GENIE_GATEWAY_URL || 'http://localhost:4701'
};

// ─────────────────────────────────────────────────────────────────────────────
// Adapters
// ─────────────────────────────────────────────────────────────────────────────

let speechAdapter = null;
let llmAdapter = null;

export function initializeAdapters() {
  // Initialize speech adapter
  speechAdapter = createSpeechAdapter(SERVICES.speechProvider, {
    key: process.env.AZURE_SPEECH_KEY || process.env.OPENAI_API_KEY,
    region: process.env.AZURE_SPEECH_REGION || 'eastus',
    apiKey: process.env.OPENAI_API_KEY
  });

  // Initialize LLM adapter
  llmAdapter = createLLMAdapter(SERVICES.llmProvider, {
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    model: process.env.LLM_MODEL // Optional model override
  });

  return { speechAdapter, llmAdapter };
}

export function getSpeechAdapter() {
  if (!speechAdapter) initializeAdapters();
  return speechAdapter;
}

export function getLLMAdapter() {
  if (!llmAdapter) initializeAdapters();
  return llmAdapter;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full meeting analysis pipeline
 *
 * Input: audio, userId, knownSpeakers
 * Output: { segments, summary, tasks, decisions, intelligence, memory }
 */
export async function analyzeMeeting(params) {
  const {
    audio,
    userId,
    meetingId,
    knownSpeakers = [],
    options = {}
  } = params;

  const startTime = Date.now();
  const id = meetingId || `meeting_${Date.now()}`;

  console.log(`[genie-meeting-pipeline] Starting analysis: ${id}`);

  // Step 1: Speech-to-Text
  console.log('[genie-meeting-pipeline] Step 1: Transcription...');
  const transcription = await transcribeAudio(audio, {
    language: options.language || 'en-US',
    enableSpeakerDiarization: false // We do this separately
  });

  // Step 2: Speaker Diarization
  console.log('[genie-meeting-pipeline] Step 2: Diarization...');
  const diarization = await performDiarization(audio, userId, knownSpeakers);

  // Step 3: Merge transcription with diarization
  console.log('[genie-meeting-pipeline] Step 3: Merging...');
  const segments = mergeTranscriptionAndDiarization(transcription, diarization, userId);

  // Step 4: Emotion Analysis (optional)
  let emotionAnalysis = null;
  if (options.analyzeEmotions !== false) {
    console.log('[genie-meeting-pipeline] Step 4: Emotion analysis...');
    emotionAnalysis = await analyzeMeetingEmotions(segments);
  }

  // Step 5: LLM Summarization
  console.log('[genie-meeting-pipeline] Step 5: LLM summarization...');
  const summary = await generateMeetingIntelligence(segments, emotionAnalysis, userId, {
    meetingType: options.meetingType || 'general'
  });

  // Step 6: Task Extraction
  console.log('[genie-meeting-pipeline] Step 6: Task extraction...');
  const tasks = await extractMeetingTasks(segments, userId);

  // Step 7: Decision Extraction
  console.log('[genie-meeting-pipeline] Step 7: Decision extraction...');
  const decisions = await extractMeetingDecisions(segments);

  // Step 8: Relationship Updates
  console.log('[genie-meeting-pipeline] Step 8: Relationship updates...');
  await updateRelationshipIntelligence(segments, decisions, userId);

  // Step 9: Memory Storage
  console.log('[genie-meeting-pipeline] Step 9: Storing in memory...');
  await storeMeetingMemory({
    id, userId, segments, summary, tasks, decisions, emotionAnalysis
  });

  const processingTime = Date.now() - startTime;
  console.log(`[genie-meeting-pipeline] Complete in ${processingTime}ms`);

  return {
    meetingId: id,
    segments,
    summary,
    tasks,
    decisions,
    intelligence: generateMeetingIntelligence(segments, emotionAnalysis, userId),
    emotionAnalysis,
    processingTimeMs: processingTime
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Steps
// ─────────────────────────────────────────────────────────────────────────────

async function transcribeAudio(audio, options = {}) {
  try {
    const adapter = getSpeechAdapter();
    const result = await adapter.transcribe(audio, {
      language: options.language || 'en-US',
      enableSpeakerDiarization: false
    });
    return result;
  } catch (error) {
    console.error('[genie-meeting-pipeline] Transcription failed:', error.message);
    // Fallback to voice-gateway
    const response = await fetch(`${SERVICES.voiceGateway}/api/stt`, {
      method: 'POST',
      body: JSON.stringify({ audio, language: options.language })
    });
    return response.json();
  }
}

async function performDiarization(audio, userId, knownSpeakers) {
  try {
    const response = await fetch(`${SERVICES.speakerDiarization}/api/meeting/analyze`, {
      method: 'POST',
      body: JSON.stringify({
        audio,
        userId,
        knownSpeakers
      })
    });
    return response.json();
  } catch (error) {
    console.error('[genie-meeting-pipeline] Diarization failed:', error.message);
    return generateFallbackDiarization(knownSpeakers);
  }
}

function mergeTranscriptionAndDiarization(transcription, diarization, userId) {
  const transcriptionSegments = transcription.segments || [];
  const diarizationSegments = diarization.segments || [];

  // If we have word-level timestamps from both, merge by time
  // Otherwise, merge by index

  if (transcriptionSegments.length === diarizationSegments.length) {
    return transcriptionSegments.map((t, i) => ({
      ...t,
      speakerId: diarizationSegments[i]?.speakerId ?? 0,
      speakerName: diarizationSegments[i]?.speakerName || diarizationSegments[i]?.speaker || 'Speaker 1',
      identifiedUserId: diarizationSegments[i]?.identifiedUserId,
      isPrimaryUser: diarizationSegments[i]?.identifiedUserId === userId
    }));
  }

  // Fallback: use diarization as source
  return diarizationSegments.map((d, i) => ({
    id: i,
    speakerId: d.speakerId ?? i,
    speakerName: d.speakerName || d.speaker || `Speaker ${i + 1}`,
    identifiedUserId: d.identifiedUserId,
    isPrimaryUser: d.identifiedUserId === userId,
    text: transcriptionSegments[i]?.text || transcriptionSegments[i]?.transcript || '',
    start: d.start || d.startTime || i * 30,
    end: d.end || d.endTime || (i + 1) * 30,
    duration: d.duration || 30,
    confidence: d.confidence || d.speakerConfidence || 0.8
  }));
}

async function analyzeMeetingEmotions(segments) {
  try {
    const response = await fetch(`${SERVICES.emotionGateway}/api/analyze/stream`, {
      method: 'POST',
      body: JSON.stringify({
        segments: segments.map(s => ({
          start: s.start,
          end: s.end,
          text: s.text
        }))
      })
    });
    return response.json();
  } catch (error) {
    console.error('[genie-meeting-pipeline] Emotion analysis failed:', error.message);
    // LLM-based fallback
    return analyzeEmotionsWithLLM(segments);
  }
}

async function analyzeEmotionsWithLLM(segments) {
  const text = segments.map(s => `[${s.speakerName}]: ${s.text}`).join('\n');

  try {
    const llm = getLLMAdapter();
    const { analyzeSentiment: analyzeSentimentFn } = await import('../llm-adapters/src/index.js');
    return await analyzeSentimentFn(text, { speakers: segments.map(s => s.speakerName) }, llm);
  } catch (e) {
    return { sentiment: 'neutral', confidence: 0.5 };
  }
}

async function generateMeetingIntelligence(segments, emotionAnalysis, userId, options) {
  const transcript = segments.map(s => `[${s.speakerName}]: ${s.text}`).join('\n');

  try {
    const llm = getLLMAdapter();
    return await generateMeetingSummary(transcript, {
      meetingType: options.meetingType,
      participants: segments.map(s => ({ name: s.speakerName, userId: s.identifiedUserId })),
      userId
    }, llm);
  } catch (error) {
    console.error('[genie-meeting-pipeline] LLM summarization failed:', error.message);
    return generateFallbackSummary(segments);
  }
}

async function extractMeetingTasks(segments, userId) {
  const transcript = segments.map(s => s.text).join(' ');

  try {
    const llm = getLLMAdapter();
    return await extractTasksFromTranscript(transcript, { userId }, llm);
  } catch (error) {
    console.error('[genie-meeting-pipeline] Task extraction failed:', error.message);
    return extractTasksFallback(segments, userId);
  }
}

async function extractMeetingDecisions(segments) {
  const transcript = segments.map(s => s.text).join(' ');

  try {
    const llm = getLLMAdapter();
    return await extractDecisionsFromTranscript(transcript, {}, llm);
  } catch (error) {
    console.error('[genie-meeting-pipeline] Decision extraction failed:', error.message);
    return extractDecisionsFallback(segments);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

async function updateRelationshipIntelligence(segments, decisions, userId) {
  // Update Relationship Twin based on meeting
  for (const decision of decisions) {
    for (const stakeholder of decision.stakeholders || []) {
      if (stakeholder !== userId) {
        try {
          await fetch(`${SERVICES.decisionTwin}/api/decisions/link`, {
            method: 'POST',
            body: JSON.stringify({
              decisionId: decision.id,
              relationships: [{ userId: stakeholder, trust_change: 2 }]
            })
          });
        } catch (e) {
          // Silent fail
        }
      }
    }
  }
}

async function storeMeetingMemory(meeting) {
  try {
    await fetch(`${SERVICES.meetingStorage}/api/meeting`, {
      method: 'POST',
      body: JSON.stringify(meeting)
    });
  } catch (error) {
    console.error('[genie-meeting-pipeline] Memory storage failed:', error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Functions
// ─────────────────────────────────────────────────────────────────────────────

function generateFallbackDiarization(knownSpeakers) {
  const speakers = knownSpeakers.length > 0
    ? knownSpeakers
    : [{ name: 'Speaker 1' }, { name: 'Speaker 2' }];

  return {
    segments: speakers.map((s, i) => ({
      speakerId: i,
      speakerName: s.name,
      start: i * 60,
      end: (i + 1) * 60,
      duration: 60,
      speakerConfidence: 0.8
    })),
    speakerCount: speakers.length
  };
}

function generateFallbackSummary(segments) {
  const speakers = new Set(segments.map(s => s.speakerName));

  return {
    executive: {
      topics: ['Discussion held'],
      decisions: [],
      risks: []
    },
    action: {
      tasks: []
    },
    relationship: {
      trustChanges: [],
      notes: [`${speakers.size} participants`]
    },
    knowledge: {
      facts: [],
      preferences: []
    }
  };
}

function extractTasksFallback(segments, userId) {
  const tasks = [];
  const patterns = [
    /(?:will|should|can|need to|must)\s+(.+?)(?:\.|$)/gi,
    /(?:todo|task|action):\s*(.+?)(?:\.|$)/gi
  ];

  for (const seg of segments) {
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(seg.text)) !== null) {
        tasks.push({
          id: `task_${Date.now()}_${tasks.length}`,
          owner: seg.isPrimaryUser ? userId : seg.speakerName,
          action: match[1].trim(),
          priority: 'medium'
        });
      }
    }
  }

  return tasks;
}

function extractDecisionsFallback(segments) {
  const decisions = [];
  const patterns = [
    /(?:decided|agreed|approved|confirmed|we will|we're going)\s+(.+?)(?:\.|$)/gi
  ];

  for (const seg of segments) {
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(seg.text)) !== null) {
        decisions.push({
          id: `dec_${Date.now()}_${decisions.length}`,
          what: match[1].trim(),
          why: null,
          confidence: 0.6,
          stakeholders: [seg.speakerName]
        });
      }
    }
  }

  return decisions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default {
  initializeAdapters,
  getSpeechAdapter,
  getLLMAdapter,
  analyzeMeeting,
  SERVICES
};
