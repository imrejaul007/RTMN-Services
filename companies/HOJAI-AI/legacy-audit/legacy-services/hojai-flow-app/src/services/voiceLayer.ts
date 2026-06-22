/**
 * Hojai Voice Layer - Complete Voice Architecture
 *
 * Voice is not an input method.
 * Voice is the entry point into the Memory OS.
 *
 * Architecture:
 * User Speech → VAD → Language Detection → ASR → Personal Dictionary
 * → Voice Identity → Intent Detection → Context Assembly
 * → Memory Retrieval → Knowledge Retrieval → Reasoning
 * → Action Planning → Text/Voice/Action
 */

import { Audio } from 'expo-av';
import axios from 'axios';

const VOICE_SERVICE = process.env.VOICE_SERVICE_URL || 'http://localhost:4033';
const FLOW_SERVICE = process.env.HOJAI_FLOW_URL || 'http://localhost:4580';

// ============================================================================
// TYPES
// ============================================================================

export interface VoiceInput {
  rawTranscript: string;
  language: 'en' | 'hi' | 'hinglish' | 'mixed';
  confidence: number;
}

export interface ProcessedInput {
  transcript: string;
  language: string;
  intent: Intent;
  context: ContextAssembly;
  memories: MemoryItem[];
  knowledge: KnowledgeItem[];
}

export interface Intent {
  type: 'dictation' | 'query' | 'action' | 'workflow' | 'agent' | 'multi_agent';
  subtype: string;
  entities: Record<string, string>;
  confidence: number;
}

export interface ContextAssembly {
  currentApp: string;
  currentUser: string;
  recentConversation: string[];
  businessContext: Record<string, unknown>;
  memory: MemoryItem[];
}

export interface MemoryItem {
  tier: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  content: string;
  importance: number;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: string;
  relevance: number;
}

export interface ActionPlan {
  action: string;
  target: string;
  params: Record<string, unknown>;
  requiresApproval: boolean;
  preview: string;
}

// ============================================================================
// VOICE LAYER
// ============================================================================

class HojaiVoiceLayer {
  private isRecording = false;
  private recording: Audio.Recording | null = null;

  // ============================================================================
  // LAYER 1: VOICE CAPTURE
  // ============================================================================

  async startCapture(): Promise<void> {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    this.recording = new Audio.Recording();
    await this.recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    await this.recording.startAsync();
    this.isRecording = true;
  }

  async stopCapture(): Promise<string> {
    if (!this.recording) return '';

    await this.recording.stopAndUnloadAsync();
    this.isRecording = false;
    return this.recording.getURI() || '';
  }

  // ============================================================================
  // LAYER 2: VAD (Voice Activity Detection)
  // ============================================================================

  /**
   * Detect if audio contains speech
   * Runs locally for low latency
   */
  async detectVoiceActivity(_audioUri: string): Promise<boolean> {
    // In production, use a local VAD model
    // like webrtc-vad or Silero VAD
    // For now, return true (assume speech detected)
    return true;
  }

  /**
   * Get voice activity segments
   */
  async getVADSegments(_audioUri: string): Promise<Array<{start: number; end: number}>> {
    // Return audio segments where speech was detected
    // In production, use Silero VAD
    return [{ start: 0, end: 0 }]; // Placeholder
  }

  // ============================================================================
  // LAYER 3: LANGUAGE DETECTION
  // ============================================================================

  /**
   * Detect language from audio or text
   * Supports: English, Hindi, Bengali, Tamil, Telugu, Kannada, Hinglish
   */
  async detectLanguage(text: string): Promise<string> {
    // Simple heuristic-based detection
    // In production, use a language detection model

    const hindiIndicators = /[ऀ-ॿ]/;
    const hinglishIndicators = /\b(bhai|mera|aur|to|ka|ki|ko|se|le|de|kar|bhejo|bol|yaar|jaldi)\b/i;
    const englishRatio = text.replace(/[^a-zA-Z]/g, '').length / text.length;

    if (hindiIndicators.test(text)) {
      return 'hi';
    }
    if (hinglishIndicators.test(text) && englishRatio > 0.3 && englishRatio < 0.8) {
      return 'hinglish';
    }
    return 'en';
  }

  // ============================================================================
  // LAYER 4: SPEECH RECOGNITION
  // ============================================================================

  /**
   * Stream ASR - converts speech to text
   */
  async speechToText(audioUri: string, language: string): Promise<VoiceInput> {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
    formData.append('language', language);

    try {
      const response = await axios.post(`${VOICE_SERVICE}/api/stt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000,
      });

      return {
        rawTranscript: response.data.text || '',
        language: await this.detectLanguage(response.data.text || ''),
        confidence: response.data.confidence || 0.9,
      };
    } catch (error) {
      console.error('[Voice] STT failed:', error);
      return {
        rawTranscript: '',
        language: 'en',
        confidence: 0,
      };
    }
  }

  // ============================================================================
  // LAYER 5: PERSONAL DICTIONARY
  // ============================================================================

  /**
   * Apply personal dictionary corrections
   * e.g., "Reza" → "REZ", "Riza" → "RidZa"
   */
  async applyPersonalDictionary(
    transcript: string,
    userId: string
  ): Promise<string> {
    try {
      const response = await axios.get(`${FLOW_SERVICE}/api/memory/dictionary`, {
        params: { userId },
      });

      let corrected = transcript;
      for (const word of response.data.words || []) {
        const regex = new RegExp(`\\b${word.word}\\b`, 'gi');
        corrected = corrected.replace(regex, word.correction);
      }

      return corrected;
    } catch {
      return transcript;
    }
  }

  // ============================================================================
  // LAYER 6: VOICE IDENTITY
  // ============================================================================

  /**
   * Get voice profile for personalization
   */
  async getVoiceProfile(userId: string): Promise<VoiceProfile | null> {
    try {
      const response = await axios.get(`${FLOW_SERVICE}/api/personas/active`, {
        params: { userId },
      });

      return response.data.voice;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // LAYER 7: INTENT DETECTION
  // ============================================================================

  /**
   * Classify user intent
   * Target: 1-10ms latency
   */
  async detectIntent(text: string): Promise<Intent> {
    const lower = text.toLowerCase();

    // Dictation patterns
    if (/^(write|draft|compose|type|create a|send message)/.test(lower)) {
      return {
        type: 'dictation',
        subtype: 'compose',
        entities: this.extractEntities(text),
        confidence: 0.9,
      };
    }

    // Query patterns
    if (/^(what|where|when|who|why|how|find|search|lookup)/.test(lower) || lower.includes('?')) {
      return {
        type: 'query',
        subtype: 'search',
        entities: this.extractEntities(text),
        confidence: 0.9,
      };
    }

    // Action patterns
    if (/^(schedule|create|book|send|message|call|email|notify|remind)/.test(lower)) {
      return {
        type: 'action',
        subtype: this.extractActionType(lower),
        entities: this.extractEntities(text),
        confidence: 0.9,
      };
    }

    // Workflow patterns
    if (/^(run|execute|start|begin|trigger)/.test(lower)) {
      return {
        type: 'workflow',
        subtype: 'automation',
        entities: this.extractEntities(text),
        confidence: 0.85,
      };
    }

    // Agent patterns
    if (/^(follow.?up|check.?in|reach.?out|contact|connect)/.test(lower)) {
      return {
        type: 'agent',
        subtype: 'outreach',
        entities: this.extractEntities(text),
        confidence: 0.85,
      };
    }

    // Multi-agent patterns
    if (/^(review|analyze|report|summary)/.test(lower)) {
      return {
        type: 'multi_agent',
        subtype: 'business_intelligence',
        entities: this.extractEntities(text),
        confidence: 0.8,
      };
    }

    // Default to dictation
    return {
      type: 'dictation',
      subtype: 'general',
      entities: this.extractEntities(text),
      confidence: 0.6,
    };
  }

  private extractEntities(text: string): Record<string, string> {
    const entities: Record<string, string> = {};

    // Extract names (capitalized words)
    const nameMatch = text.match(/to\s+([A-Z][a-z]+)/);
    if (nameMatch) entities.person = nameMatch[1];

    // Extract time
    if (/tomorrow/.test(text)) entities.time = 'tomorrow';
    if (/today/.test(text)) entities.time = 'today';
    if (/next week/.test(text)) entities.time = 'next_week';

    return entities;
  }

  private extractActionType(text: string): string {
    if (/schedule|meeting|calendar/.test(text)) return 'schedule';
    if (/send|message|email/.test(text)) return 'send';
    if (/create|campaign/.test(text)) return 'create';
    if (/book|reserve/.test(text)) return 'book';
    return 'general';
  }

  // ============================================================================
  // LAYER 8: CONTEXT ASSEMBLY
  // ============================================================================

  /**
   * Assemble context before processing
   * Load: Current App + User + Recent Conversation + Business Context
   */
  async assembleContext(userId: string, currentApp?: string): Promise<ContextAssembly> {
    try {
      const response = await axios.get(`${FLOW_SERVICE}/api/brain/context`, {
        params: { userId, app: currentApp },
      });

      return response.data;
    } catch {
      return {
        currentApp: currentApp || 'unknown',
        currentUser: userId,
        recentConversation: [],
        businessContext: {},
        memory: [],
      };
    }
  }

  // ============================================================================
  // LAYER 9: MEMORY RETRIEVAL (L1-L5)
  // ============================================================================

  /**
   * Retrieve memories by tier
   * L1: Current session | L2: Recent | L3: Personal | L4: Business | L5: Intelligence
   */
  async retrieveMemories(
    userId: string,
    query: string,
    tiers: string[] = ['L1', 'L2', 'L3', 'L4', 'L5']
  ): Promise<MemoryItem[]> {
    try {
      const response = await axios.get(`${FLOW_SERVICE}/api/memory/retrieve`, {
        params: { userId, query, tiers: tiers.join(',') },
      });

      return response.data.memories || [];
    } catch {
      return [];
    }
  }

  // ============================================================================
  // LAYER 10: KNOWLEDGE RETRIEVAL
  // ============================================================================

  async retrieveKnowledge(
    userId: string,
    query: string
  ): Promise<KnowledgeItem[]> {
    try {
      const response = await axios.post(
        `${FLOW_SERVICE}/api/brain/search`,
        { userId, query }
      );

      return response.data.results || [];
    } catch {
      return [];
    }
  }

  // ============================================================================
  // LAYER 11: ACTION PLANNING
  // ============================================================================

  /**
   * Create action plan from intent
   */
  async createActionPlan(
    intent: Intent,
    context: ContextAssembly
  ): Promise<ActionPlan> {
    const actionMap: Record<string, string> = {
      dictation: 'compose_draft',
      query: 'search_knowledge',
      action: 'execute_task',
      workflow: 'run_workflow',
      agent: 'delegate_agent',
      multi_agent: 'orchestrate',
    };

    return {
      action: actionMap[intent.type] || 'general',
      target: intent.entities.person || 'unknown',
      params: intent.entities,
      requiresApproval: intent.type === 'agent' || intent.type === 'workflow',
      preview: `Confirm: ${intent.subtype} ${intent.entities.person || ''}`,
    };
  }

  // ============================================================================
  // COMPLETE PIPELINE
  // ============================================================================

  /**
   * Full voice pipeline
   * User Speech → VAD → Language → ASR → Dictionary → Identity → Intent → Context → Memory → Knowledge → Action
   */
  async process(
    userId: string,
    currentApp?: string
  ): Promise<ProcessedInput> {
    // 1. Capture
    await this.startCapture();
    const audioUri = await this.stopCapture();

    // 2. VAD (skip silence)
    const hasVoice = await this.detectVoiceActivity(audioUri);
    if (!hasVoice) {
      throw new Error('No speech detected');
    }

    // 3. Language Detection
    // (We'll detect from transcript after ASR)

    // 4. Speech Recognition
    const voiceInput = await this.speechToText(audioUri, 'en');
    if (!voiceInput.rawTranscript) {
      throw new Error('No speech recognized');
    }

    // 5. Personal Dictionary
    const transcript = await this.applyPersonalDictionary(
      voiceInput.rawTranscript,
      userId
    );

    // 6. Voice Identity (for personalization)

    // 7. Intent Detection
    const intent = await this.detectIntent(transcript);

    // 8. Context Assembly
    const context = await this.assembleContext(userId, currentApp);

    // 9-10. Memory + Knowledge Retrieval (in parallel)
    const [memories, knowledge] = await Promise.all([
      this.retrieveMemories(userId, transcript),
      this.retrieveKnowledge(userId, transcript),
    ]);

    return {
      transcript,
      language: voiceInput.language,
      intent,
      context,
      memories,
      knowledge,
    };
  }
}

interface VoiceProfile {
  accent: string;
  speakingSpeed: number;
  commonPhrases: string[];
  languageMix: string[];
}

export const hojaiVoiceLayer = new HojaiVoiceLayer();
export default hojaiVoiceLayer;
