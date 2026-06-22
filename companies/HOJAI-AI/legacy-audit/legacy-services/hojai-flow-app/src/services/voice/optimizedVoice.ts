/**
 * Optimized Voice Layer - Maximum Performance
 *
 * Targets:
 * - <100ms latency
 * - 99% accuracy
 * - Offline capable
 * - Continuous learning
 *
 * Pipeline:
 * Voice → VAD → Language → Local Whisper → Dictionary → Intent
 * → Context → Memory → Action → TTS
 */

import { Audio } from 'expo-av';
import { localWhisper } from '../voice/whisperLocal';
import { localIntentClassifier } from '../ml/intentClassifier';
import { adaptiveVoice } from '../ml/adaptiveVoice';
import { contextAssembly } from '../contextAssembly';
import { vadService } from '../vad';

const FLOW_SERVICE = process.env.HOJAI_FLOW_URL || 'http://localhost:4580';

// ============================================================================
// TYPES
// ============================================================================

export interface VoiceResult {
  transcript: string;
  language: string;
  confidence: number;
  intent: IntentResult;
  context: ContextResult;
  processingTime: number;
}

export interface IntentResult {
  type: string;
  subtype: string;
  confidence: number;
  entities: Record<string, string>;
}

export interface ContextResult {
  memories: any[];
  knowledge: any[];
  suggestions: string[];
}

// ============================================================================
// OPTIMIZED VOICE LAYER
// ============================================================================

class OptimizedVoiceLayer {
  private isInitialized = false;
  private isRecording = false;
  private recording: Audio.Recording | null = null;

  /**
   * Initialize all components
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    const startTime = performance.now();

    // Initialize Whisper
    await localWhisper.init({
      model: 'base', // 74MB, 80% accuracy, fast
      language: 'en',
      threads: 4,
      useGPU: true,
    });

    // Initialize Intent Classifier
    await localIntentClassifier.init();

    // Initialize Adaptive Voice
    await adaptiveVoice.init();

    // Optimize Whisper for user
    await adaptiveVoice.optimizeWhisper();

    const initTime = performance.now() - startTime;
    console.log(`[Voice] Initialized in ${initTime.toFixed(0)}ms`);

    this.isInitialized = true;
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    await this.init();

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

  /**
   * Stop recording and process
   */
  async stopAndProcess(): Promise<VoiceResult> {
    const startTime = performance.now();

    if (!this.recording) {
      throw new Error('Not recording');
    }

    // Get audio URI
    const uri = await this.recording.stopAndUnloadAsync();
    this.isRecording = false;

    // Process through pipeline
    const result = await this.processAudio(uri || '');

    result.processingTime = performance.now() - startTime;

    return result;
  }

  /**
   * Process audio through full pipeline
   */
  async processAudio(audioUri: string): Promise<VoiceResult> {
    const pipelineStart = performance.now();

    // ========== STEP 1: VAD (2-5ms) ==========
    const vadStart = performance.now();
    const hasSpeech = await vadService.containsSpeech(audioUri);
    if (!hasSpeech) {
      throw new Error('No speech detected');
    }
    console.log(`[Voice] VAD: ${(performance.now() - vadStart).toFixed(0)}ms`);

    // ========== STEP 2: Language Detection (1-2ms) ==========
    // Skip - Whisper handles language detection

    // ========== STEP 3: Local Whisper STT (30-100ms) ==========
    const sttStart = performance.now();
    const whisperResult = await localWhisper.transcribe(audioUri);
    console.log(`[Voice] STT: ${(performance.now() - sttStart).toFixed(0)}ms`);

    let transcript = whisperResult.text;

    // ========== STEP 4: Adaptive Corrections (2-5ms) ==========
    const dictStart = performance.now();
    const corrected = await adaptiveVoice.correctTranscript(transcript);
    const needsCorrection = corrected !== transcript;
    console.log(`[Voice] Dictionary: ${(performance.now() - dictStart).toFixed(0)}ms`);

    // Learn from correction if needed
    if (needsCorrection) {
      await adaptiveVoice.learnCorrection(transcript, corrected);
      transcript = corrected;
    }

    // ========== STEP 5: Intent Classification (5-10ms) ==========
    const intentStart = performance.now();
    const intent = await localIntentClassifier.classify(transcript);
    console.log(`[Voice] Intent: ${(performance.now() - intentStart).toFixed(0)}ms`);

    // ========== STEP 6: Context Assembly (50-100ms) ==========
    const contextStart = performance.now();
    const context = await this.getContext();
    console.log(`[Voice] Context: ${(performance.now() - contextStart).toFixed(0)}ms`);

    // ========== STEP 7: Learn from transcript (5-10ms) ==========
    await adaptiveVoice.analyzeProfile(transcript);

    console.log(`[Voice] Pipeline: ${(performance.now() - pipelineStart).toFixed(0)}ms total`);

    return {
      transcript,
      language: whisperResult.language,
      confidence: whisperResult.confidence,
      intent,
      context,
      processingTime: 0,
    };
  }

  /**
   * Get context from memory
   */
  private async getContext(): Promise<ContextResult> {
    try {
      // Get cached context (instant)
      const cached = await contextAssembly.getCached();

      if (cached) {
        return {
          memories: cached.memories || [],
          knowledge: cached.knowledge || [],
          suggestions: this.generateSuggestions(cached),
        };
      }

      // Fallback to API
      const response = await fetch(`${FLOW_SERVICE}/api/brain/context`, {
        method: 'GET',
      });

      const data = await response.json();

      return {
        memories: data.memories || [],
        knowledge: data.knowledge || [],
        suggestions: [],
      };
    } catch {
      return {
        memories: [],
        knowledge: [],
        suggestions: [],
      };
    }
  }

  /**
   * Generate suggestions based on context
   */
  private generateSuggestions(context: any): string[] {
    const suggestions: string[] = [];

    // Recent memories suggest follow-ups
    if (context.recentConversation?.length > 0) {
      suggestions.push('Follow up on recent conversation');
    }

    // Pending actions
    if (context.memories?.some((m: any) => m.type === 'action')) {
      suggestions.push('Complete pending action');
    }

    return suggestions;
  }

  /**
   * Quick process (for short phrases)
   */
  async quickProcess(text: string): Promise<VoiceResult> {
    const startTime = performance.now();

    // Skip audio processing, just do intent + context
    const intent = await localIntentClassifier.classify(text);
    const context = await this.getContext();

    return {
      transcript: text,
      language: 'en',
      confidence: 1.0,
      intent,
      context,
      processingTime: performance.now() - startTime,
    };
  }

  /**
   * Get voice stats
   */
  getStats(): {
    isInitialized: boolean;
    isRecording: boolean;
    adaptiveStats: any;
  } {
    return {
      isInitialized: this.isInitialized,
      isRecording: this.isRecording,
      adaptiveStats: adaptiveVoice.getStats(),
    };
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
    }

    await localWhisper.destroy();

    this.isInitialized = false;
    this.isRecording = false;
  }
}

export const optimizedVoice = new OptimizedVoiceLayer();
export default optimizedVoice;
