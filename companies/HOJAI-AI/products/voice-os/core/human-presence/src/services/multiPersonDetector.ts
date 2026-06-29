/**
 * Multi-Person Presence Detector
 * ===========================
 * Detects and tracks multiple people in a conversation.
 */

import type {
  HumanPresence,
  PresenceState,
  EnergyLevel
} from '../types/index.js';

export interface MultiPersonSession {
  sessionId: string;
  participants: Participant[];
  groupDynamics: GroupDynamics;
  dominantSpeaker?: string;
  conversationFlow: ConversationTurn[];
  startedAt: string;
  lastUpdated: string;
}

export interface Participant {
  userId: string;
  name?: string;
  role?: 'host' | 'guest' | 'moderator' | 'participant';
  speaking: boolean;
  speakingDuration: number; // seconds in current speaking turn
  totalSpeakingTime: number; // total seconds spoken
  interruptions: number;
  listens: number;
  energy: EnergyLevel;
  attention: number; // 0-100
}

export interface GroupDynamics {
  energy: 'high' | 'medium' | 'low';
  formality: 'formal' | 'casual' | 'mixed';
  warmth: number; // 0-100
  engagement: number; // 0-100
  conflicts: number;
  agreements: number;
  humor: number; // 0-100
  consensusLevel: number; // 0-100
}

export interface ConversationTurn {
  speakerId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  overlap: boolean; // spoke while others were speaking
  interruption?: boolean;
  topic?: string;
}

export class MultiPersonDetector {
  private sessions = new Map<string, MultiPersonSession>();

  /**
   * Create a new multi-person session
   */
  createSession(sessionId: string, participantIds: string[]): MultiPersonSession {
    const session: MultiPersonSession = {
      sessionId,
      participants: participantIds.map(id => ({
        userId: id,
        speaking: false,
        speakingDuration: 0,
        totalSpeakingTime: 0,
        interruptions: 0,
        listens: 0,
        energy: 'medium',
        attention: 70,
      })),
      groupDynamics: {
        energy: 'medium',
        formality: 'casual',
        warmth: 60,
        engagement: 50,
        conflicts: 0,
        agreements: 0,
        humor: 40,
        consensusLevel: 50,
      },
      conversationFlow: [],
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get existing session
   */
  getSession(sessionId: string): MultiPersonSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Record a speaker turn
   */
  recordTurn(
    sessionId: string,
    speakerId: string,
    startTime: string,
    endTime?: string
  ): ConversationTurn | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const duration = endTime
      ? (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
      : 0;

    const turn: ConversationTurn = {
      speakerId,
      startTime,
      endTime,
      duration,
      overlap: false,
    };

    session.conversationFlow.push(turn);
    session.lastUpdated = new Date().toISOString();

    // Update participant stats
    const participant = session.participants.find(p => p.userId === speakerId);
    if (participant) {
      participant.totalSpeakingTime += duration;
      participant.speaking = false;
    }

    return turn;
  }

  /**
   * Start speaking
   */
  startSpeaking(sessionId: string, speakerId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Check for overlap/interruption
    const activeSpeakers = session.participants.filter(p => p.speaking);
    if (activeSpeakers.length > 0) {
      // Mark as overlap/interruption
      const turn = session.conversationFlow[session.conversationFlow.length - 1];
      if (turn && !turn.endTime) {
        turn.overlap = true;
        turn.interruption = activeSpeakers[0].userId !== speakerId;
      }

      // Update interrupted speaker
      activeSpeakers.forEach(p => {
        if (p.userId !== speakerId) {
          p.listens++;
        }
        p.interruptions++;
      });
    }

    // Start this speaker
    const participant = session.participants.find(p => p.userId === speakerId);
    if (participant) {
      participant.speaking = true;
      participant.speakingDuration = 0;
    }
  }

  /**
   * Update group dynamics
   */
  updateGroupDynamics(sessionId: string): GroupDynamics | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const participants = session.participants;
    const totalSpeaking = participants.reduce((sum, p) => sum + p.totalSpeakingTime, 0);
    const avgSpeaking = totalSpeaking / participants.length;

    // Calculate energy
    const highEnergy = participants.filter(p => p.energy === 'high').length;
    const groupEnergy: 'high' | 'medium' | 'low' =
      highEnergy > participants.length / 2 ? 'high' :
      highEnergy === 0 ? 'low' : 'medium';

    // Calculate engagement
    const totalInterruptions = participants.reduce((sum, p) => sum + p.interruptions, 0);
    const totalListens = participants.reduce((sum, p) => sum + p.listens, 0);
    const engagement = Math.min(100, totalListens + totalInterruptions);

    // Detect dominant speaker
    const dominant = participants.reduce((max, p) =>
      p.totalSpeakingTime > max.totalSpeakingTime ? p : max
    );
    session.dominantSpeaker = dominant.userId;

    session.groupDynamics = {
      energy: groupEnergy,
      formality: 'casual', // Would need NLP to detect
      warmth: 60 + Math.random() * 20, // Placeholder
      engagement: Math.min(100, engagement * 5),
      conflicts: Math.floor(totalInterruptions / 2),
      agreements: totalListens,
      humor: 40 + Math.random() * 30,
      consensusLevel: 50 + (totalListens / (totalInterruptions + 1)) * 30,
    };

    return session.groupDynamics;
  }

  /**
   * Detect conversation mode
   */
  detectConversationMode(sessionId: string): 'meeting' | 'casual' | 'presentation' | 'interview' | 'family' {
    const session = this.sessions.get(sessionId);
    if (!session) return 'casual';

    const turns = session.conversationFlow;
    const participants = session.participants;

    // Presentation: one person dominates, others listen
    const dominantTime = Math.max(...participants.map(p => p.totalSpeakingTime));
    const totalTime = participants.reduce((sum, p) => sum + p.totalSpeakingTime, 0);
    const dominantRatio = dominantTime / totalTime;

    if (dominantRatio > 0.7) return 'presentation';

    // Interview: one asks, one answers
    const avgTurnLength = turns.reduce((sum, t) => sum + (t.duration || 0), 0) / turns.length;
    if (avgTurnLength > 60 && participants.length === 2) return 'interview';

    // Meeting: balanced participation
    const turnBalance = 1 - Math.abs(participants.map(p => p.totalSpeakingTime).reduce((a, b) => a - b, 0) / totalTime);
    if (turnBalance > 0.7) return 'meeting';

    // Family: high interruptions, warm dynamics
    if (session.groupDynamics.warmth > 70 && participants.length >= 3) return 'family';

    return 'casual';
  }

  /**
   * Generate adaptation for multi-person context
   */
  generateGroupAdaptation(sessionId: string): GroupAdaptation {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return getDefaultGroupAdaptation();
    }

    const mode = this.detectConversationMode(sessionId);
    const dynamics = session.groupDynamics;

    return {
      mode,
      responsePace: dynamics.energy === 'high' ? 140 : dynamics.energy === 'low' ? 90 : 120,
      responseLength: mode === 'presentation' ? 'short' : mode === 'meeting' ? 'medium' : 'long',
      formality: mode === 'presentation' || mode === 'meeting' ? 0.7 : 0.3,
      warmth: dynamics.warmth / 100,
      interruptionsAllowed: mode === 'family' || mode === 'casual',
      humorLevel: dynamics.humor > 60 ? 'moderate' : 'light',
      consensusBuilding: dynamics.consensusLevel < 50,
      acknowledgeOthers: dynamics.engagement < 70,
    };
  }

  /**
   * End session and get summary
   */
  endSession(sessionId: string): SessionSummary | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const summary: SessionSummary = {
      sessionId,
      duration: new Date().getTime() - new Date(session.startedAt).getTime(),
      participantCount: session.participants.length,
      dominantSpeaker: session.dominantSpeaker,
      totalTurns: session.conversationFlow.length,
      mode: this.detectConversationMode(sessionId),
      dynamics: session.groupDynamics,
      endedAt: new Date().toISOString(),
    };

    this.sessions.delete(sessionId);
    return summary;
  }
}

export interface GroupAdaptation {
  mode: 'meeting' | 'casual' | 'presentation' | 'interview' | 'family';
  responsePace: number;
  responseLength: 'short' | 'medium' | 'long';
  formality: number;
  warmth: number;
  interruptionsAllowed: boolean;
  humorLevel: 'none' | 'light' | 'moderate' | 'high';
  consensusBuilding: boolean;
  acknowledgeOthers: boolean;
}

export interface SessionSummary {
  sessionId: string;
  duration: number;
  participantCount: number;
  dominantSpeaker?: string;
  totalTurns: number;
  mode: 'meeting' | 'casual' | 'presentation' | 'interview' | 'family';
  dynamics: GroupDynamics;
  endedAt: string;
}

function getDefaultGroupAdaptation(): GroupAdaptation {
  return {
    mode: 'casual',
    responsePace: 120,
    responseLength: 'medium',
    formality: 0.5,
    warmth: 0.6,
    interruptionsAllowed: true,
    humorLevel: 'light',
    consensusBuilding: false,
    acknowledgeOthers: false,
  };
}
