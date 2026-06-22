// ============================================================================
// HOJAI VOICE PLATFORM - Session Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Session,
  SessionDocument,
  SessionStatus,
  StartSessionRequest,
  SendMessageRequest,
  Message,
  SupportedLanguage,
} from '../types';
import { SessionModel } from '../models/Session';
import { getAgentService } from './agent.service';
import { createVoiceAgent } from '../voice-agents';

/**
 * Session Service - Handles conversation sessions
 */
export class SessionService {
  private agentService = getAgentService();
  private activeSessions: Map<string, ReturnType<typeof createVoiceAgent>> = new Map();

  /**
   * Start a new session
   */
  async start(
    request: StartSessionRequest,
    organizationId: string
  ): Promise<{ session: SessionDocument; agent: ReturnType<typeof createVoiceAgent> }> {
    const sessionId = uuidv4();

    // Get agent
    const agent = await this.agentService.getById(request.agentId, organizationId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Create session
    const session = await SessionModel.create({
      _id: sessionId,
      agentId: request.agentId,
      organizationId,
      callId: request.callId,
      customerId: request.customerId,
      customerPhone: request.customerPhone,
      status: 'active',
      language: request.language || agent.language,
      context: {
        customerName: request.context?.customerName,
        customerEmail: request.context?.customerEmail,
        previousInteractions: request.context?.previousInteractions || 0,
        preferences: request.context?.preferences || {},
        customData: request.context?.customData || {},
      },
      messageHistory: [],
      currentIntent: undefined,
      currentParameters: {},
      sentimentHistory: [],
      startTime: new Date(),
      lastActivityTime: new Date(),
      metadata: request.metadata || {},
    });

    // Create voice agent instance
    const voiceAgent = createVoiceAgent(agent);
    this.activeSessions.set(sessionId, voiceAgent);

    // Start agent session
    await voiceAgent.startSession({
      context: {
        customerName: request.context?.customerName,
        customerEmail: request.context?.customerEmail,
        previousInteractions: request.context?.previousInteractions,
      },
    });

    return { session, agent: voiceAgent };
  }

  /**
   * Get session by ID
   */
  async getById(sessionId: string, organizationId: string): Promise<SessionDocument | null> {
    return SessionModel.findOne({ _id: sessionId, organizationId });
  }

  /**
   * Get active session
   */
  getActiveSession(sessionId: string): ReturnType<typeof createVoiceAgent> | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * List sessions
   */
  async list(
    organizationId: string,
    options?: {
      agentId?: string;
      status?: SessionStatus;
      customerId?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ sessions: SessionDocument[]; total: number }> {
    const query: Record<string, unknown> = { organizationId };

    if (options?.agentId) {
      query.agentId = options.agentId;
    }
    if (options?.status) {
      query.status = options.status;
    }
    if (options?.customerId) {
      query.customerId = options.customerId;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      SessionModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SessionModel.countDocuments(query),
    ]);

    return { sessions, total };
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    organizationId: string,
    messageData: Omit<Message, 'id' | 'sessionId' | 'timestamp'>
  ): Promise<Message> {
    const session = await SessionModel.findOne({ _id: sessionId, organizationId });

    if (!session) {
      throw new Error('Session not found');
    }

    const message: Message = {
      id: uuidv4(),
      sessionId,
      timestamp: new Date(),
      ...messageData,
    };

    session.messageHistory.push(message);
    session.lastActivityTime = new Date();

    if (messageData.sentiment) {
      session.sentimentHistory.push(messageData.sentiment);
    }

    await session.save();

    return message;
  }

  /**
   * Send message (text) and get response
   */
  async sendMessage(
    sessionId: string,
    organizationId: string,
    content: string
  ): Promise<{
    message: Message;
    response: string;
    intent?: string;
    sentiment?: number;
  }> {
    const voiceAgent = this.activeSessions.get(sessionId);

    if (!voiceAgent) {
      throw new Error('Session not active or not found');
    }

    // Process text
    const result = await voiceAgent.processText(content);

    // Add user message
    const userMessage = await this.addMessage(sessionId, organizationId, {
      role: 'user',
      content,
      intent: result.intent.intent,
      confidence: result.intent.confidence,
    });

    // Add agent message
    await this.addMessage(sessionId, organizationId, {
      role: 'agent',
      content: result.response,
      audioUrl: result.responseAudio,
      intent: result.intent.intent,
    });

    return {
      message: userMessage,
      response: result.response,
      intent: result.intent.intent,
      sentiment: result.sentiment.score,
    };
  }

  /**
   * Process audio and get response
   */
  async processAudio(
    sessionId: string,
    organizationId: string,
    audioBase64: string,
    mimeType: string = 'audio/webm'
  ): Promise<{
    text: string;
    response: string;
    responseAudio?: string;
    intent: string;
    confidence: number;
    sentiment: number;
  }> {
    const voiceAgent = this.activeSessions.get(sessionId);

    if (!voiceAgent) {
      throw new Error('Session not active or not found');
    }

    // Process audio
    const result = await voiceAgent.processAudio(audioBase64, mimeType);

    // Add user message
    await this.addMessage(sessionId, organizationId, {
      role: 'user',
      content: result.text,
      intent: result.intent.intent,
      confidence: result.intent.confidence,
      sentiment: result.sentiment,
    });

    // Add agent message
    await this.addMessage(sessionId, organizationId, {
      role: 'agent',
      content: result.response,
      audioUrl: result.responseAudio,
      intent: result.intent.intent,
      sentiment: result.sentiment,
    });

    return {
      text: result.text,
      response: result.response,
      responseAudio: result.responseAudio,
      intent: result.intent.intent,
      confidence: result.intent.confidence,
      sentiment: result.sentiment.score,
    };
  }

  /**
   * End a session
   */
  async end(sessionId: string, organizationId: string): Promise<SessionDocument | null> {
    const voiceAgent = this.activeSessions.get(sessionId);

    if (voiceAgent) {
      await voiceAgent.endSession();
      this.activeSessions.delete(sessionId);
    }

    const session = await SessionModel.findOneAndUpdate(
      { _id: sessionId, organizationId },
      {
        $set: {
          status: 'completed',
          endTime: new Date(),
        },
      },
      { new: true }
    );

    return session;
  }

  /**
   * Get session history
   */
  async getHistory(
    sessionId: string,
    organizationId: string
  ): Promise<SessionDocument | null> {
    return SessionModel.findOne({ _id: sessionId, organizationId });
  }

  /**
   * Get session statistics
   */
  async getStats(sessionId: string, organizationId: string): Promise<{
    turnCount: number;
    averageSentiment: number;
    duration: number;
    currentIntent?: string;
    messageCount: number;
  } | null> {
    const session = await SessionModel.findOne({ _id: sessionId, organizationId });

    if (!session) return null;

    const avgSentiment =
      session.sentimentHistory.length > 0
        ? session.sentimentHistory.reduce((sum, s) => sum + s.score, 0) /
          session.sentimentHistory.length
        : 0;

    return {
      turnCount: Math.floor(session.messageHistory.length / 2),
      averageSentiment: avgSentiment,
      duration: session.duration,
      currentIntent: session.currentIntent || undefined,
      messageCount: session.messageHistory.length,
    };
  }

  /**
   * Update session context
   */
  async updateContext(
    sessionId: string,
    organizationId: string,
    context: Partial<Session['context']>
  ): Promise<SessionDocument | null> {
    const voiceAgent = this.activeSessions.get(sessionId);

    if (voiceAgent) {
      await voiceAgent.updateContext(context);
    }

    const session = await SessionModel.findOne({ _id: sessionId, organizationId });

    if (!session) return null;

    session.context = {
      ...session.context,
      ...context,
    };

    await session.save();

    return session;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(maxIdleTimeMs: number = 300000): Promise<number> {
    return SessionModel.expireInactiveSessions(maxIdleTimeMs);
  }

  /**
   * Get sessions by customer
   */
  async getByCustomer(
    customerId: string,
    organizationId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{ sessions: SessionDocument[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const query = { customerId, organizationId };

    const [sessions, total] = await Promise.all([
      SessionModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SessionModel.countDocuments(query),
    ]);

    return { sessions, total };
  }
}

// Singleton instance
let sessionServiceInstance: SessionService | null = null;

export function getSessionService(): SessionService {
  if (!sessionServiceInstance) {
    sessionServiceInstance = new SessionService();
  }
  return sessionServiceInstance;
}

export default SessionService;
