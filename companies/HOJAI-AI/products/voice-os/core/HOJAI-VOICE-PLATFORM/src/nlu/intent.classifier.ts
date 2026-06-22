// ============================================================================
// HOJAI VOICE PLATFORM - Intent Classifier
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import { openaiConfig } from '../config';
import { IntentResult, IntentDefinition, ExtractedEntity, SentimentScore, SupportedLanguage } from '../types';

interface IntentMatch {
  intent: IntentDefinition;
  confidence: number;
  extractedParameters: Record<string, unknown>;
  extractedEntities: ExtractedEntity[];
}

export class IntentClassifier {
  private client: AxiosInstance;
  private model: string;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    this.model = openaiConfig.model;
  }

  /**
   * Classify intent from text using agent's defined intents
   */
  async classify(
    text: string,
    intents: IntentDefinition[],
    context?: string[],
    language: SupportedLanguage = 'en-IN'
  ): Promise<IntentResult> {
    // Step 1: Try rule-based matching first for speed
    const ruleMatch = this.ruleBasedMatch(text, intents);
    if (ruleMatch && ruleMatch.confidence > 0.8) {
      return this.buildIntentResult(ruleMatch, text, language);
    }

    // Step 2: Use OpenAI for semantic matching
    try {
      const semanticMatch = await this.semanticMatch(text, intents, language);
      return this.buildIntentResult(semanticMatch, text, language);
    } catch (error) {
      console.error('Semantic matching failed, falling back to rule-based:', error);
      if (ruleMatch) {
        return this.buildIntentResult(ruleMatch, text, language);
      }
      // Return a no-match result
      return this.buildNoMatchResult(text, language);
    }
  }

  /**
   * Rule-based intent matching using keyword/pattern matching
   */
  private ruleBasedMatch(text: string, intents: IntentDefinition[]): IntentMatch | null {
    const normalizedText = text.toLowerCase().trim();

    let bestMatch: IntentMatch | null = null;
    let bestScore = 0;

    for (const intent of intents) {
      let matchCount = 0;
      const totalExamples = intent.examples.length;

      for (const example of intent.examples) {
        const normalizedExample = example.toLowerCase().trim();

        // Exact match
        if (normalizedText === normalizedExample) {
          matchCount += 1;
          continue;
        }

        // Contains match
        if (normalizedText.includes(normalizedExample) || normalizedExample.includes(normalizedText)) {
          matchCount += 0.8;
          continue;
        }

        // Word overlap
        const textWords = new Set(normalizedText.split(/\s+/));
        const exampleWords = new Set(normalizedExample.split(/\s+/));
        const overlap = [...textWords].filter(w => exampleWords.has(w)).length;
        const overlapRatio = overlap / Math.max(textWords.size, exampleWords.size);

        if (overlapRatio > 0.6) {
          matchCount += overlapRatio * 0.6;
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(matchCount / Math.max(totalExamples, 1), 1);

        if (confidence > bestScore) {
          bestScore = confidence;
          bestMatch = {
            intent,
            confidence,
            extractedParameters: {},
            extractedEntities: this.extractEntities(text, intent),
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Semantic matching using OpenAI
   */
  private async semanticMatch(
    text: string,
    intents: IntentDefinition[],
    language: SupportedLanguage
  ): Promise<IntentMatch> {
    const intentsContext = intents.map(intent => ({
      name: intent.name,
      description: intent.description,
      examples: intent.examples.slice(0, 5), // Limit examples to reduce token count
    }));

    const prompt = this.buildClassificationPrompt(text, intentsContext, language);

    const response = await this.client.post('/chat/completions', {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are an intent classification assistant. Analyze the user input and classify it into one of the provided intents.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.data.choices[0]?.message?.content || '';

    return this.parseClassificationResponse(content, intents, text);
  }

  /**
   * Build the classification prompt
   */
  private buildClassificationPrompt(
    text: string,
    intents: Array<{ name: string; description: string; examples: string[] }>,
    language: SupportedLanguage
  ): string {
    const languageInstruction = this.getLanguageInstruction(language);

    const intentsList = intents
      .map(i => `- ${i.name}: ${i.description}\n  Examples: ${i.examples.join(', ')}`)
      .join('\n');

    return `${languageInstruction}

User input: "${text}"

Available intents:
${intentsList}

Analyze the user input and respond with:
1. The matched intent name (or "no_match" if none fits)
2. A confidence score (0.0 to 1.0)
3. Any extracted parameters in JSON format

Respond in this format:
Intent: [intent_name]
Confidence: [0.0-1.0]
Parameters: {"param1": "value1", "param2": "value2"}`;
  }

  /**
   * Get language-specific instruction
   */
  private getLanguageInstruction(language: SupportedLanguage): string {
    const instructions: Record<string, string> = {
      'hi-IN': 'The user is speaking in Hindi. Match intents considering Hindi variations and transliterations.',
      'ta-IN': 'The user is speaking in Tamil. Match intents considering Tamil language patterns.',
      'te-IN': 'The user is speaking in Telugu. Match intents considering Telugu language patterns.',
      'bn-IN': 'The user is speaking in Bengali. Match intents considering Bengali language patterns.',
      'kn-IN': 'The user is speaking in Kannada. Match intents considering Kannada language patterns.',
      'ml-IN': 'The user is speaking in Malayalam. Match intents considering Malayalam language patterns.',
      'mr-IN': 'The user is speaking in Marathi. Match intents considering Marathi language patterns.',
      'gu-IN': 'The user is speaking in Gujarati. Match intents considering Gujarati language patterns.',
      'pa-IN': 'The user is speaking in Punjabi. Match intents considering Punjabi language patterns.',
      'en-IN': 'The user is speaking in English (India). Match intents considering Indian English variations.',
    };

    return instructions[language] || instructions['en-IN'];
  }

  /**
   * Parse the classification response from OpenAI
   */
  private parseClassificationResponse(
    content: string,
    intents: IntentDefinition[],
    text: string
  ): IntentMatch {
    const lines = content.split('\n');
    let matchedIntent: IntentDefinition | null = null;
    let confidence = 0.5;
    let parameters: Record<string, unknown> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('Intent:')) {
        const intentName = trimmedLine.replace('Intent:', '').trim().toLowerCase();
        matchedIntent = intents.find(i => i.name.toLowerCase() === intentName) || null;
      }

      if (trimmedLine.startsWith('Confidence:')) {
        const confStr = trimmedLine.replace('Confidence:', '').trim();
        confidence = parseFloat(confStr) || 0.5;
      }

      if (trimmedLine.startsWith('Parameters:')) {
        const paramStr = trimmedLine.replace('Parameters:', '').trim();
        try {
          parameters = JSON.parse(paramStr);
        } catch {
          // Try to extract from rest of content
          try {
            const paramMatch = content.match(/Parameters:\s*({[\s\S]*?})/);
            if (paramMatch) {
              parameters = JSON.parse(paramMatch[1]);
            }
          } catch {
            parameters = {};
          }
        }
      }
    }

    if (!matchedIntent) {
      // Find best matching intent by name similarity
      for (const intent of intents) {
        if (content.toLowerCase().includes(intent.name.toLowerCase())) {
          matchedIntent = intent;
          break;
        }
      }
    }

    if (!matchedIntent) {
      throw new Error('Could not match any intent');
    }

    return {
      intent: matchedIntent,
      confidence: Math.min(Math.max(confidence, 0), 1),
      extractedParameters: parameters,
      extractedEntities: this.extractEntities(text, matchedIntent),
    };
  }

  /**
   * Extract entities from text based on intent's entity definitions
   */
  private extractEntities(text: string, intent: IntentDefinition): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Built-in entity patterns
    const patterns: Record<string, RegExp> = {
      phone: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      number: /\b\d+(?:\.\d+)?\b/g,
      date: /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:today|tomorrow|yesterday|next\s+(?:week|month|year)))\b/gi,
      time: /\b(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)|(?:noon|midnight|morning|afternoon|evening))\b/gi,
    };

    // Custom entity patterns from intent
    for (const entityDef of intent.parameters || []) {
      const pattern = patterns[entityDef.name] || new RegExp(entityDef.name, 'gi');
      let match;

      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          entity: entityDef.name,
          type: entityDef.type,
          value: match[0],
          confidence: 0.9,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    return entities;
  }

  /**
   * Build IntentResult from IntentMatch
   */
  private buildIntentResult(match: IntentMatch, text: string, language: SupportedLanguage): IntentResult {
    return {
      intent: match.intent.name,
      confidence: match.confidence,
      parameters: match.extractedParameters,
      entities: match.extractedEntities,
      followUp: match.intent.followUp,
    };
  }

  /**
   * Build a no-match result
   */
  private buildNoMatchResult(text: string, language: SupportedLanguage): IntentResult {
    return {
      intent: 'unknown',
      confidence: 0,
      parameters: {},
      entities: [],
    };
  }

  /**
   * Extract structured data from text
   */
  async extractEntitiesFromText(
    text: string,
    entityTypes: string[],
    language: SupportedLanguage = 'en-IN'
  ): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];

    // Built-in patterns
    const patterns: Record<string, RegExp> = {
      phone: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      number: /\b\d+(?:\.\d+)?\b/g,
      url: /\bhttps?:\/\/[^\s]+\b/g,
      date: /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:today|tomorrow|yesterday|next\s+(?:week|month|year)))\b/gi,
      time: /\b(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)|(?:noon|midnight|morning|afternoon|evening))\b/gi,
    };

    for (const entityType of entityTypes) {
      const pattern = patterns[entityType];
      if (!pattern) continue;

      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          entity: entityType,
          type: entityType,
          value: match[0],
          confidence: 0.95,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    return entities;
  }
}

// Singleton instance
let intentClassifierInstance: IntentClassifier | null = null;

export function getIntentClassifier(): IntentClassifier {
  if (!intentClassifierInstance) {
    intentClassifierInstance = new IntentClassifier();
  }
  return intentClassifierInstance;
}

export default IntentClassifier;
