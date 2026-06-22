// ============================================================================
// HOJAI VOICE PLATFORM - Intent Service
// ============================================================================

import {
  IntentResult,
  IntentDefinition,
  ExtractedEntity,
  SupportedLanguage,
} from '../types';
import { getIntentClassifier } from '../nlu/intent.classifier';
import { getSentimentAnalyzer } from '../nlu/sentiment.analyzer';

/**
 * Intent Service - Handles NLU operations
 */
export class IntentService {
  private intentClassifier = getIntentClassifier();
  private sentimentAnalyzer = getSentimentAnalyzer();

  /**
   * Classify intent from text
   */
  async classifyIntent(
    text: string,
    intents: IntentDefinition[],
    context?: string[],
    language: SupportedLanguage = 'en-IN'
  ): Promise<IntentResult> {
    return this.intentClassifier.classify(text, intents, context, language);
  }

  /**
   * Analyze sentiment
   */
  async analyzeSentiment(
    text: string,
    language: SupportedLanguage = 'en-IN'
  ) {
    return this.sentimentAnalyzer.analyze(text, language);
  }

  /**
   * Combined analysis - intent + sentiment
   */
  async analyze(
    text: string,
    intents: IntentDefinition[],
    context?: string[],
    language: SupportedLanguage = 'en-IN'
  ): Promise<{
    intent: IntentResult;
    sentiment: ReturnType<typeof this.sentimentAnalyzer.analyze>;
  }> {
    const [intent, sentiment] = await Promise.all([
      this.intentClassifier.classify(text, intents, context, language),
      this.sentimentAnalyzer.analyze(text, language),
    ]);

    return { intent, sentiment };
  }

  /**
   * Extract entities from text
   */
  async extractEntities(
    text: string,
    entityTypes: string[],
    language: SupportedLanguage = 'en-IN'
  ): Promise<ExtractedEntity[]> {
    return this.intentClassifier.extractEntitiesFromText(text, entityTypes, language);
  }

  /**
   * Batch analyze multiple texts
   */
  async batchAnalyze(
    texts: Array<{
      text: string;
      intents: IntentDefinition[];
      context?: string[];
      language?: SupportedLanguage;
    }>
  ): Promise<Array<{
    intent: IntentResult;
    sentiment: ReturnType<typeof this.sentimentAnalyzer.analyze>;
  }>> {
    return Promise.all(
      texts.map(({ text, intents, context, language }) =>
        this.analyze(text, intents, context, language)
      )
    );
  }

  /**
   * Detect sentiment shift
   */
  async detectSentimentShift(
    previousSentiments: Array<{ score: number; confidence: number; label: string }>,
    currentSentiment: { score: number; confidence: number; label: string }
  ): Promise<{
    hasShift: boolean;
    shiftMagnitude: number;
    direction: 'improving' | 'declining' | 'stable';
  }> {
    return this.sentimentAnalyzer.detectSentimentShift(previousSentiments, currentSentiment);
  }
}

// Singleton instance
let intentServiceInstance: IntentService | null = null;

export function getIntentService(): IntentService {
  if (!intentServiceInstance) {
    intentServiceInstance = new IntentService();
  }
  return intentServiceInstance;
}

export default IntentService;
