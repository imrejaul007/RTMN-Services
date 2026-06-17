import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import type { VoiceSession, VoiceSessionSchema } from '../types.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

// In-memory session store (use Redis in production)
const sessions = new Map<string, VoiceSession>();

export class VoiceSessionService {
  private sessions: Map<string, VoiceSession> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  createSession(params: {
    callSid?: string;
    customerId?: string;
    customerPhone: string;
    metadata?: Record<string, any>;
  }): VoiceSession {
    const session: VoiceSession = {
      sessionId: uuidv4(),
      callSid: params.callSid,
      customerId: params.customerId,
      customerPhone: params.customerPhone,
      status: 'initiated',
      startTime: Date.now(),
      transcript: [],
      metadata: params.metadata || {},
    };

    this.sessions.set(session.sessionId, session);
    logger.info('Voice session created', {
      sessionId: session.sessionId,
      customerPhone: params.customerPhone,
    });

    return session;
  }

  getSession(sessionId: string): VoiceSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionByCallSid(callSid: string): VoiceSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.callSid === callSid) {
        return session;
      }
    }
    return undefined;
  }

  updateSession(sessionId: string, updates: Partial<VoiceSession>): VoiceSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found for update', { sessionId });
      return undefined;
    }

    const updatedSession = { ...session, ...updates };
    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  addTranscriptEntry(
    sessionId: string,
    entry: { role: 'user' | 'assistant'; text: string; audioUrl?: string }
  ): VoiceSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found for transcript', { sessionId });
      return undefined;
    }

    session.transcript.push({
      ...entry,
      timestamp: Date.now(),
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  updateStatus(sessionId: string, status: VoiceSession['status']): VoiceSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found for status update', { sessionId });
      return undefined;
    }

    session.status = status;

    if (status === 'completed' || status === 'failed' || status === 'transferred') {
      session.endTime = Date.now();
      session.duration = Math.floor((session.endTime - session.startTime) / 1000);
    }

    this.sessions.set(sessionId, session);
    logger.info('Session status updated', { sessionId, status });

    return session;
  }

  setIVRState(sessionId: string, state: string): VoiceSession | undefined {
    return this.updateSession(sessionId, { ivrState: state });
  }

  endSession(sessionId: string, reason: string = 'completed'): VoiceSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    session.status = reason === 'transferred' ? 'transferred' :
                     reason === 'failed' ? 'failed' : 'completed';
    session.endTime = Date.now();
    session.duration = Math.floor((session.endTime - session.startTime) / 1000);
    session.metadata.endReason = reason;

    this.sessions.set(sessionId, session);

    // Clean up timeout
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }

    logger.info('Voice session ended', {
      sessionId,
      reason,
      duration: session.duration,
    });

    return session;
  }

  getActiveSessions(): VoiceSession[] {
    const activeStatuses: VoiceSession['status'][] = ['initiated', 'in_progress', 'waiting'];
    return Array.from(this.sessions.values()).filter(s =>
      activeStatuses.includes(s.status)
    );
  }

  getSessionStats(): {
    total: number;
    active: number;
    completed: number;
    avgDuration: number;
  } {
    const allSessions = Array.from(this.sessions.values());
    const completed = allSessions.filter(s =>
      s.status === 'completed' || s.status === 'transferred'
    );
    const durations = completed.map(s => s.duration || 0);

    return {
      total: allSessions.length,
      active: this.getActiveSessions().length,
      completed: completed.length,
      avgDuration: durations.length > 0
        ? Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
    };
  }

  cleanupOldSessions(maxAgeMs: number = 3600000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.endTime && session.endTime < cutoff) {
        this.sessions.delete(sessionId);
        logger.debug('Cleaned up old session', { sessionId });
      }
    }
  }
}

export const voiceSessionService = new VoiceSessionService();
