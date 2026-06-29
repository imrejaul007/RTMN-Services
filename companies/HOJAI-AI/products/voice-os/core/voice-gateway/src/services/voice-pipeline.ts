/**
 * Voice Pipeline Orchestrator
 * ==========================
 * Orchestrates the complete VoiceOS pipeline:
 * STT → Conversation Physics → Voice Director → TTS
 */

import { config } from '../config/index.js';

const CP_BASE = process.env.CONVERSATION_PHYSICS_URL || 'http://localhost:4891';
const VD_BASE = process.env.VOICE_DIRECTOR_URL || 'http://localhost:4892';
const HG_BASE = process.env.HUMAN_GROWTH_URL || 'http://localhost:4895';
const HP_BASE = process.env.HUMAN_PRESENCE_URL || 'http://localhost:4896';
const LT_BASE = process.env.LIFE_TIMELINE_URL || 'http://localhost:4893';
const VI_BASE = process.env.VOICE_IDENTITY_URL || 'http://localhost:4894';

export interface PipelineInput {
  userId: string;
  audioBase64: string;
  mimeType?: string;
  context?: {
    relationship?: string;
    conversationId?: string;
    mode?: 'casual' | 'formal' | 'intimate';
  };
}

export interface PipelineOutput {
  audioBase64: string;
  mimeType: string;
  durationMs: number;
  engine: string;
  conversationState: ConversationState;
  directives: VoiceDirectives;
  latencyBreakdown: LatencyBreakdown;
}

export interface ConversationState {
  turnComplete: boolean;
  shouldSpeak: boolean;
  backchannel?: string;
  silenceAnalysis?: SilenceAnalysis;
  repairNeeded?: boolean;
  correctedTranscript?: string;
}

export interface SilenceAnalysis {
  meaning: string;
  urgency: string;
  response?: string;
}

export interface VoiceDirectives {
  emotion: string;
  pace: number;
  volume: string;
  warmth: number;
  formality: number;
  expressions: string[];
  pauseBeforeMs: number;
  pauseAfterMs: number;
}

export interface LatencyBreakdown {
  sttMs: number;
  conversationPhysicsMs: number;
  voiceDirectorMs: number;
  ttsMs: number;
  totalMs: number;
}

/**
 * Execute the complete VoiceOS pipeline
 */
export async function executePipeline(
  input: PipelineInput
): Promise<PipelineOutput> {
  const startTime = Date.now();
  const breakdown: LatencyBreakdown = {
    sttMs: 0,
    conversationPhysicsMs: 0,
    voiceDirectorMs: 0,
    ttsMs: 0,
    totalMs: 0,
  };

  // Step 1: STT (handled by voice-gateway)
  const sttStart = Date.now();
  const transcript = await performSTT(input);
  breakdown.sttMs = Date.now() - sttStart;

  // Step 2: Conversation Physics
  const cpStart = Date.now();
  const convState = await analyzeConversation(
    input.userId,
    transcript,
    input.context
  );
  breakdown.conversationPhysicsMs = Date.now() - cpStart;

  // Step 3: Voice Director
  const vdStart = Date.now();
  const directives = await generateVoiceDirectives(
    input.userId,
    convState,
    input.context
  );
  breakdown.voiceDirectorMs = Date.now() - vdStart;

  // Step 4: TTS (handled by voice-gateway)
  const ttsStart = Date.now();
  const ttsResult = await performTTS(
    transcript,
    directives,
    convState
  );
  breakdown.ttsMs = Date.now() - ttsStart;

  breakdown.totalMs = Date.now() - startTime;

  return {
    ...ttsResult,
    conversationState: convState,
    directives,
    latencyBreakdown: breakdown,
  };
}

/**
 * Step 1: Speech-to-Text
 */
async function performSTT(input: PipelineInput): Promise<string> {
  // In production, this would call the voice-gateway's STT engine
  // For now, we assume audio is already transcribed
  // This would integrate with: Whisper, Deepgram, Google STT, Sarvam
  return `[Transcribed from audio: ${input.audioBase64.substring(0, 50)}...]`;
}

/**
 * Step 2: Conversation Physics Analysis
 */
async function analyzeConversation(
  userId: string,
  transcript: string,
  context?: PipelineInput['context']
): Promise<ConversationState> {
  try {
    const response = await fetch(`${CP_BASE}/api/conversation/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        transcript,
        relationship: context?.relationship || 'friend',
      }),
    });

    if (!response.ok) {
      // Fallback to default state
      return getDefaultConversationState();
    }

    const data = await response.json();
    return {
      turnComplete: data.turnComplete ?? true,
      shouldSpeak: data.shouldSpeak ?? true,
      backchannel: data.backchannel,
      silenceAnalysis: data.silenceAnalysis,
      repairNeeded: data.repairNeeded,
      correctedTranscript: data.correctedTranscript,
    };
  } catch (error) {
    console.error('[voice-pipeline] Conversation Physics error:', error);
    return getDefaultConversationState();
  }
}

/**
 * Step 3: Generate Voice Directives
 */
async function generateVoiceDirectives(
  userId: string,
  convState: ConversationState,
  context?: PipelineInput['context']
): Promise<VoiceDirectives> {
  try {
    // Get presence adaptation
    let presenceAdaptation = null;
    try {
      const presenceRes = await fetch(`${HP_BASE}/api/presence/${userId}/adaptation`);
      if (presenceRes.ok) {
        presenceAdaptation = (await presenceRes.json()).adaptation;
      }
    } catch {}

    // Get emotion from conversation state
    const emotion = convState.silenceAnalysis?.meaning === 'CONFUSION'
      ? 'concerned'
      : convState.repairNeeded
        ? 'patient'
        : 'warm';

    // Generate directive
    const response = await fetch(`${VD_BASE}/api/directive/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emotion,
        relationship: context?.relationship || 'friend',
        personalityMode: getPersonalityMode(context?.relationship),
        context: {
          timeOfDay: getTimeOfDay(),
          urgency: 'normal',
          ...presenceAdaptation,
        },
      }),
    });

    if (!response.ok) {
      return getDefaultDirectives();
    }

    const data = await response.json();
    return data.directive;
  } catch (error) {
    console.error('[voice-pipeline] Voice Director error:', error);
    return getDefaultDirectives();
  }
}

/**
 * Step 4: Text-to-Speech
 */
async function performTTS(
  transcript: string,
  directives: VoiceDirectives,
  convState: ConversationState
): Promise<{ audioBase64: string; mimeType: string; durationMs: number; engine: string }> {
  // If we should not speak (waiting for user), return silence
  if (!convState.shouldSpeak) {
    return {
      audioBase64: generateSilenceAudio(directives.pauseAfterMs),
      mimeType: 'audio/wav',
      durationMs: directives.pauseAfterMs,
      engine: 'none',
    };
  }

  // Generate SSML with directives
  const ssml = generateSSML(transcript, directives);

  // In production, this would call TTS engines
  // For now, return placeholder
  return {
    audioBase64: `[TTS audio for: ${transcript.substring(0, 100)}]`,
    mimeType: 'audio/mp3',
    durationMs: Math.round(transcript.length / 5) * 1000, // ~5 chars/sec
    engine: 'hojai',
  };
}

/**
 * Generate SSML markup with voice directives
 */
function generateSSML(text: string, directives: VoiceDirectives): string {
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const pauseBreak = directives.pauseBeforeMs > 0
    ? `<break time="${directives.pauseBeforeMs}ms"/>`
    : '';

  const rateAttr = directives.pace !== 1.0
    ? ` rate="${directives.pace > 1 ? 'fast' : 'slow'}"`
    : '';

  const volumeAttr = directives.volume !== 'normal'
    ? ` volume="${directives.volume}"`
    : '';

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis">
  <prosody${rateAttr}${volumeAttr}>
    ${pauseBreak}${escapedText}
  </prosody>
</speak>`;
}

/**
 * Generate silence audio placeholder
 */
function generateSilenceAudio(durationMs: number): string {
  // In production, would generate actual silence WAV
  return `[${durationMs}ms silence]`;
}

/**
 * Get personality mode based on relationship
 */
function getPersonalityMode(relationship?: string): string {
  const modeMap: Record<string, string> = {
    mother: 'mother',
    father: 'professional',
    sibling: 'friend',
    friend: 'friend',
    colleague: 'professional',
    boss: 'professional',
    child: 'child',
    partner: 'friend',
  };
  return relationship ? modeMap[relationship] || 'friend' : 'friend';
}

/**
 * Get time of day
 */
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

/**
 * Default conversation state
 */
function getDefaultConversationState(): ConversationState {
  return {
    turnComplete: true,
    shouldSpeak: true,
  };
}

/**
 * Default voice directives
 */
function getDefaultDirectives(): VoiceDirectives {
  return {
    emotion: 'warm',
    pace: 1.0,
    volume: 'medium',
    warmth: 0.7,
    formality: 0.3,
    expressions: ['SMILE'],
    pauseBeforeMs: 200,
    pauseAfterMs: 250,
  };
}

/**
 * Check pipeline health
 */
export async function checkPipelineHealth(): Promise<{
  healthy: boolean;
  services: Record<string, boolean>;
}> {
  const services: Record<string, boolean> = {
    'conversation-physics': false,
    'voice-director': false,
    'human-growth': false,
    'human-presence': false,
    'life-timeline': false,
    'voice-identity': false,
  };

  const bases = {
    'conversation-physics': CP_BASE,
    'voice-director': VD_BASE,
    'human-growth': HG_BASE,
    'human-presence': HP_BASE,
    'life-timeline': LT_BASE,
    'voice-identity': VI_BASE,
  };

  await Promise.all(
    Object.entries(bases).map(async ([name, base]) => {
      try {
        const response = await fetch(`${base}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000),
        });
        services[name] = response.ok;
      } catch {
        services[name] = false;
      }
    })
  );

  const healthy = Object.values(services).every((v) => v);

  return { healthy, services };
}
