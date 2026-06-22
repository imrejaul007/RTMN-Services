/**
 * Super Voice - Ultimate Accuracy Pipeline
 *
 * Combines all accuracy improvements:
 * - Audio Processing (noise cancellation)
 * - Local Whisper (STT)
 * - NER (Indian names, companies)
 * - Conversation Context (pronoun resolution)
 * - Adaptive Learning (corrections)
 * - Intent Classification
 *
 * Target: 99% accuracy
 */

import { localWhisper } from '../voice/whisperLocal';
import { localIntentClassifier } from '../ml/intentClassifier';
import { adaptiveVoice } from '../ml/adaptiveVoice';
import { nerService } from '../ml/namedEntityRecognition';
import { conversationContext } from '../ml/conversationContext';
import { audioProcessor, smartRecorder } from '../audio/audioProcessing';
import { contextAssembly } from '../contextAssembly';

export interface SuperVoiceResult {
  transcript: string;
  entities: Entity[];
  intent: IntentResult;
  context: ContextResult;
  confidence: number;
  processingTime: number;
  steps: StepTiming[];
}

export interface Entity {
  text: string;
  type: string;
  normalized?: string;
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

interface StepTiming {
  name: string;
  time: number;
}

class SuperVoice {
  private isInitialized = false;

  /**
   * Initialize all components
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    const start = performance.now();

    // Initialize in parallel
    await Promise.all([
      localWhisper.init({ model: 'small', useGPU: true }), // Better accuracy
      localIntentClassifier.init(),
      adaptiveVoice.init(),
      nerService.init(),
      conversationContext.init(),
    ]);

    // Optimize Whisper for user
    await adaptiveVoice.optimizeWhisper();

    this.isInitialized = true;
    console.log(`[SuperVoice] Init: ${(performance.now() - start).toFixed(0)}ms`);
  }

  /**
   * Full pipeline with maximum accuracy
   */
  async process(): Promise<SuperVoiceResult> {
    const start = performance.now();
    const steps: StepTiming[] = [];

    // Initialize if needed
    if (!this.isInitialized) {
      await this.init();
    }

    // ========== STEP 1: Record ==========
    const recordStart = performance.now();
    await smartRecorder.start();
    // User speaks...
    const audio = await smartRecorder.stop();
    steps.push({ name: 'Record', time: performance.now() - recordStart });

    // ========== STEP 2: Audio Processing ==========
    const audioStart = performance.now();
    const processedAudio = await audioProcessor.process(audio.uri);
    steps.push({ name: 'Audio Processing', time: performance.now() - audioStart });

    // ========== STEP 3: VAD Check ==========
    const vadStart = performance.now();
    const hasSpeech = await audioProcessor.detectNoise(processedAudio.uri);
    if (hasSpeech.level === 'high') {
      // Reduce noise
      const enhanced = await audioProcessor.enhanceVoice(processedAudio.uri);
      steps.push({ name: 'Noise Reduction', time: performance.now() - vadStart });
    } else {
      steps.push({ name: 'VAD', time: performance.now() - vadStart });
    }

    // ========== STEP 4: Whisper STT ==========
    const sttStart = performance.now();
    const whisperResult = await localWhisper.transcribe(processedAudio.uri);
    steps.push({ name: 'Whisper STT', time: performance.now() - sttStart });

    let transcript = whisperResult.text;

    // ========== STEP 5: Dictionary Correction ==========
    const dictStart = performance.now();
    const corrected = await adaptiveVoice.correctTranscript(transcript);
    steps.push({ name: 'Dictionary', time: performance.now() - dictStart });

    // Learn from correction
    if (corrected !== transcript) {
      await adaptiveVoice.learnCorrection(transcript, corrected);
      transcript = corrected;
    }

    // ========== STEP 6: NER ==========
    const nerStart = performance.now();
    const entities = await nerService.extract(transcript);
    steps.push({ name: 'NER', time: performance.now() - nerStart });

    // ========== STEP 7: Pronoun Resolution ==========
    const pronounStart = performance.now();
    const expandedTranscript = await conversationContext.expandPronouns(transcript);
    steps.push({ name: 'Pronoun Resolution', time: performance.now() - pronounStart });

    // ========== STEP 8: Intent Classification ==========
    const intentStart = performance.now();
    const intent = await localIntentClassifier.classify(expandedTranscript);
    steps.push({ name: 'Intent', time: performance.now() - intentStart });

    // ========== STEP 9: Context Assembly ==========
    const contextStart = performance.now();
    const cachedContext = await contextAssembly.getCached();
    const context: ContextResult = cachedContext ? {
      memories: cachedContext.memories || [],
      knowledge: cachedContext.knowledge || [],
      suggestions: [],
    } : { memories: [], knowledge: [], suggestions: [] };
    steps.push({ name: 'Context', time: performance.now() - contextStart });

    // ========== STEP 10: Add to conversation ==========
    await conversationContext.addUserTurn(expandedTranscript, entities, intent.type);

    // ========== STEP 11: Voice Profile Learning ==========
    await adaptiveVoice.analyzeProfile(transcript);

    // ========== STEP 12: Learn Entities ==========
    for (const entity of entities) {
      await nerService.learnEntity(entity.text, entity.type as any);
    }

    const totalTime = performance.now() - start;

    // Calculate confidence
    const confidence = this.calculateConfidence(whisperResult.confidence, intent.confidence);

    return {
      transcript: expandedTranscript,
      entities,
      intent,
      context,
      confidence,
      processingTime: totalTime,
      steps,
    };
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(sttConfidence: number, intentConfidence: number): number {
    // Weighted average
    const sttWeight = 0.6;
    const intentWeight = 0.4;

    return (sttConfidence * sttWeight) + (intentConfidence * intentWeight);
  }

  /**
   * Quick process (text only, no audio)
   */
  async processText(text: string): Promise<SuperVoiceResult> {
    const start = performance.now();
    const steps: StepTiming[] = [];

    // ========== STEP 1: Dictionary Correction ==========
    const dictStart = performance.now();
    const corrected = await adaptiveVoice.correctTranscript(text);
    steps.push({ name: 'Dictionary', time: performance.now() - dictStart });

    // ========== STEP 2: Pronoun Resolution ==========
    const pronounStart = performance.now();
    const expanded = await conversationContext.expandPronouns(corrected);
    steps.push({ name: 'Pronoun', time: performance.now() - pronounStart });

    // ========== STEP 3: NER ==========
    const nerStart = performance.now();
    const entities = await nerService.extract(expanded);
    steps.push({ name: 'NER', time: performance.now() - nerStart });

    // ========== STEP 4: Intent ==========
    const intentStart = performance.now();
    const intent = await localIntentClassifier.classify(expanded);
    steps.push({ name: 'Intent', time: performance.now() - intentStart });

    // ========== STEP 5: Context ==========
    const contextStart = performance.now();
    const cached = await contextAssembly.getCached();
    const context: ContextResult = cached ? {
      memories: cached.memories || [],
      knowledge: cached.knowledge || [],
      suggestions: [],
    } : { memories: [], knowledge: [], suggestions: [] };
    steps.push({ name: 'Context', time: performance.now() - contextStart });

    // ========== STEP 6: Track ==========
    await conversationContext.addUserTurn(expanded, entities, intent.type);

    const totalTime = performance.now() - start;

    return {
      transcript: expanded,
      entities,
      intent,
      context,
      confidence: intent.confidence,
      processingTime: totalTime,
      steps,
    };
  }

  /**
   * Get conversation summary
   */
  async getSummary(): Promise<string> {
    const context = await conversationContext.getContext();
    return context.conversationSummary;
  }

  /**
   * Clear all learned data
   */
  async reset(): Promise<void> {
    await adaptiveVoice.clear();
    await nerService.clear();
    await conversationContext.clear();
  }

  /**
   * Get accuracy stats
   */
  getAccuracyStats(): {
    dictionaryCorrections: number;
    entitiesLearned: number;
    conversations: number;
    profile: any;
  } {
    return {
      dictionaryCorrections: adaptiveVoice.getStats().correctionsCount,
      entitiesLearned: nerService.getStats().learned,
      conversations: conversationContext.getStats().turns,
      profile: adaptiveVoice.getStats(),
    };
  }
}

export const superVoice = new SuperVoice();
export default superVoice;
