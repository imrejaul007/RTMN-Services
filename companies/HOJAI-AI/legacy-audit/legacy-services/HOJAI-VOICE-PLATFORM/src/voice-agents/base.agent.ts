// ============================================================================
// HOJAI VOICE PLATFORM - Base Voice Agent
// ============================================================================

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  VoiceAgent,
  VoiceConfig,
  IntentResult,
  Session,
  Message,
  SentimentScore,
  SupportedLanguage,
  IntentDefinition,
  EntityDefinition,
  ExtractedEntity,
} from '../types';
import { getSTTFactory } from '../stt';
import { getTTSFactory } from '../tts';
import { getIntentClassifier } from '../nlu/intent.classifier';
import { getSentimentAnalyzer } from '../nlu/sentiment.analyzer';
import { SessionModel } from '../models/Session';

export interface AgentConfig {
  agent: VoiceAgent;
  sessionTimeout?: number; // milliseconds
  maxSilenceDuration?: number;
  confidenceThreshold?: number;
}

export interface ConversationTurn {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  intent?: string;
  confidence?: number;
  sentiment?: SentimentScore;
}

export abstract class BaseVoiceAgent extends EventEmitter {
  protected agent: VoiceAgent;
  protected session: Session | null = null;
  protected conversationHistory: ConversationTurn[] = [];
  protected isActive: boolean = false;
  protected sttFactory = getSTTFactory();
  protected ttsFactory = getTTSFactory();
  protected intentClassifier = getIntentClassifier();
  protected sentimentAnalyzer = getSentimentAnalyzer();

  // Configuration
  protected sessionTimeout: number;
  protected maxSilenceDuration: number;
  protected confidenceThreshold: number;

  constructor(config: AgentConfig) {
    super();
    this.agent = config.agent;
    this.sessionTimeout = config.sessionTimeout || 300000; // 5 minutes
    this.maxSilenceDuration = config.maxSilenceDuration || 5000; // 5 seconds
    this.confidenceThreshold = config.confidenceThreshold || 0.6;
  }

  /**
   * Start a new session
   */
  async startSession(sessionData?: Partial<Session>): Promise<Session> {
    const sessionId = uuidv4();

    this.session = await SessionModel.create({
      id: sessionId,
      agentId: this.agent.id,
      organizationId: this.agent.metadata?.organizationId as string || '',
      status: 'active',
      language: this.agent.language,
      context: {
        customerName: sessionData?.context?.customerName,
        customerEmail: sessionData?.context?.customerEmail,
        previousInteractions: sessionData?.context?.previousInteractions || 0,
        preferences: {},
        customData: {},
      },
      messageHistory: [],
      currentIntent: undefined,
      currentParameters: {},
      sentimentHistory: [],
      startTime: new Date(),
      lastActivityTime: new Date(),
      metadata: {},
    });

    this.conversationHistory = [];
    this.isActive = true;

    // Emit greeting
    await this.speak(this.agent.greeting);

    this.emit('session:started', this.session);

    return this.session;
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    if (!this.session) return;

    await this.speak(this.agent.farewell);

    this.session.status = 'completed';
    this.session.endTime = new Date();
    await this.session.save();

    this.isActive = false;
    this.emit('session:ended', this.session);
  }

  /**
   * Process incoming audio (base64)
   */
  async processAudio(
    audioBase64: string,
    mimeType: string = 'audio/webm'
  ): Promise<{
    text: string;
    intent: IntentResult;
    sentiment: SentimentScore;
    response: string;
    responseAudio?: string;
  }> {
    if (!this.session) {
      throw new Error('No active session');
    }

    // Step 1: Speech-to-Text
    const sttResult = await this.sttFactory.transcribeFromBase64(
      audioBase64,
      this.session.language,
      this.agent.voiceConfig.sttEngine,
      mimeType
    );

    const userText = sttResult.text;

    // Step 2: Intent Classification
    const intentResult = await this.intentClassifier.classify(
      userText,
      this.agent.intents,
      this.getContextMessages(),
      this.session.language
    );

    // Step 3: Sentiment Analysis
    const sentiment = await this.sentimentAnalyzer.analyze(userText, this.session.language);

    // Step 4: Store the user message
    const userMessage = await this.addMessage({
      role: 'user',
      content: userText,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      sentiment,
    });

    // Step 5: Generate response
    const response = await this.generateResponse(intentResult, sentiment);

    // Step 6: Text-to-Speech
    const synthesisResult = await this.ttsFactory.synthesize(
      response,
      this.agent.voiceConfig.voiceId,
      this.session.language,
      this.agent.voiceConfig.ttsEngine,
      {
        speed: this.agent.voiceConfig.speed,
        pitch: this.agent.voiceConfig.pitch,
      }
    );

    // Step 7: Store agent response
    await this.addMessage({
      role: 'agent',
      content: response,
      audioUrl: synthesisResult.audioUrl,
    });

    this.emit('turn:completed', {
      userText,
      intent: intentResult,
      sentiment,
      response,
    });

    return {
      text: userText,
      intent: intentResult,
      sentiment,
      response,
      responseAudio: synthesisResult.audioUrl,
    };
  }

  /**
   * Process incoming text (for API calls)
   */
  async processText(
    text: string
  ): Promise<{
    intent: IntentResult;
    sentiment: SentimentScore;
    response: string;
    responseAudio?: string;
  }> {
    if (!this.session) {
      throw new Error('No active session');
    }

    // Step 1: Intent Classification
    const intentResult = await this.intentClassifier.classify(
      text,
      this.agent.intents,
      this.getContextMessages(),
      this.session.language
    );

    // Step 2: Sentiment Analysis
    const sentiment = await this.sentimentAnalyzer.analyze(text, this.session.language);

    // Step 3: Store the user message
    await this.addMessage({
      role: 'user',
      content: text,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      sentiment,
    });

    // Step 4: Generate response
    const response = await this.generateResponse(intentResult, sentiment);

    // Step 5: Text-to-Speech
    const synthesisResult = await this.ttsFactory.synthesize(
      response,
      this.agent.voiceConfig.voiceId,
      this.session.language,
      this.agent.voiceConfig.ttsEngine,
      {
        speed: this.agent.voiceConfig.speed,
        pitch: this.agent.voiceConfig.pitch,
      }
    );

    // Step 6: Store agent response
    await this.addMessage({
      role: 'agent',
      content: response,
      audioUrl: synthesisResult.audioUrl,
    });

    return {
      intent: intentResult,
      sentiment,
      response,
      responseAudio: synthesisResult.audioUrl,
    };
  }

  /**
   * Generate response based on intent and sentiment
   */
  protected async generateResponse(
    intent: IntentResult,
    sentiment: SentimentScore
  ): Promise<string> {
    // Check for escalation based on negative sentiment
    if (
      sentiment.score < -0.5 &&
      this.agent.intents.find(i => i.name === intent.intent)?.escalationThreshold
    ) {
      return this.handleEscalation(intent, sentiment);
    }

    // Find matching intent
    const matchedIntent = this.agent.intents.find(i => i.name === intent.intent);

    if (!matchedIntent) {
      return this.handleUnknownIntent(intent);
    }

    // Handle the intent
    return this.handleIntent(matchedIntent, intent.parameters, sentiment);
  }

  /**
   * Handle matched intent - override in subclasses
   */
  protected abstract handleIntent(
    intent: IntentDefinition,
    parameters: Record<string, unknown>,
    sentiment: SentimentScore
  ): Promise<string>;

  /**
   * Handle escalation
   */
  protected handleEscalation(
    intent: IntentResult,
    sentiment: SentimentScore
  ): string {
    if (this.agent.escalationNumber) {
      return `I understand you're experiencing some issues. Let me connect you with our support team who can better assist you. Please hold on.`;
    }
    return `I'm sorry you're having a difficult time. Let me make sure you speak with someone who can help you better.`;
  }

  /**
   * Handle unknown intent
   */
  protected handleUnknownIntent(intent: IntentResult): string {
    if (intent.confidence < this.confidenceThreshold) {
      return `I'm not sure I understood that correctly. Could you please rephrase your request?`;
    }
    return `I'm here to help with ${this.getAgentCapabilities()}. Could you please tell me more about what you need?`;
  }

  /**
   * Get agent capabilities description
   */
  protected abstract getAgentCapabilities(): string;

  /**
   * Add message to session
   */
  protected async addMessage(
    messageData: Omit<Message, 'id' | 'sessionId' | 'timestamp'>
  ): Promise<Message> {
    if (!this.session) {
      throw new Error('No active session');
    }

    const message: Message = {
      id: uuidv4(),
      sessionId: this.session.id,
      timestamp: new Date(),
      ...messageData,
    };

    this.conversationHistory.push({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      intent: message.intent,
      confidence: message.confidence,
      sentiment: message.sentiment,
    });

    await this.session.addMessage(message);

    return message;
  }

  /**
   * Get context messages for intent classification
   */
  protected getContextMessages(): string[] {
    const contextWindow = this.agent.contextWindow;
    return this.conversationHistory
      .slice(-contextWindow)
      .map(turn => turn.content);
  }

  /**
   * Speak text (TTS only)
   */
  async speak(text: string): Promise<string> {
    const synthesisResult = await this.ttsFactory.synthesize(
      text,
      this.agent.voiceConfig.voiceId,
      this.session?.language || this.agent.language,
      this.agent.voiceConfig.ttsEngine,
      {
        speed: this.agent.voiceConfig.speed,
        pitch: this.agent.voiceConfig.pitch,
      }
    );

    if (this.session) {
      await this.addMessage({
        role: 'agent',
        content: text,
        audioUrl: synthesisResult.audioUrl,
      });
    }

    return synthesisResult.audioUrl;
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(): boolean {
    if (!this.session) return true;

    const now = Date.now();
    const lastActivity = new Date(this.session.lastActivityTime).getTime();
    return now - lastActivity > this.sessionTimeout;
  }

  /**
   * Get current session
   */
  getSession(): Session | null {
    return this.session;
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationTurn[] {
    return [...this.conversationHistory];
  }

  /**
   * Update session context
   */
  async updateContext(context: Partial<Session['context']>): Promise<void> {
    if (!this.session) return;

    this.session.context = {
      ...this.session.context,
      ...context,
    };
    await this.session.save();
  }

  /**
   * Set current intent
   */
  async setCurrentIntent(
    intent: string,
    parameters: Record<string, unknown> = {}
  ): Promise<void> {
    if (!this.session) return;

    await this.session.setCurrentIntent(intent, parameters);
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    turnCount: number;
    averageSentiment: number;
    duration: number;
    currentIntent?: string;
  } {
    if (!this.session) {
      return { turnCount: 0, averageSentiment: 0, duration: 0 };
    }

    const avgSentiment =
      this.session.sentimentHistory.length > 0
        ? this.session.sentimentHistory.reduce((sum, s) => sum + s.score, 0) /
          this.session.sentimentHistory.length
        : 0;

    return {
      turnCount: this.conversationHistory.length,
      averageSentiment: avgSentiment,
      duration: this.session.duration,
      currentIntent: this.session.currentIntent || undefined,
    };
  }

  /**
   * Transfer to another number/agent
   */
  protected async transfer(to: string, reason?: string): Promise<string> {
    this.emit('transfer:initiated', { to, reason });
    return `Please wait while I transfer you to ${to}.`;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.session && this.session.status === 'active') {
      await this.endSession();
    }
    this.removeAllListeners();
  }
}
