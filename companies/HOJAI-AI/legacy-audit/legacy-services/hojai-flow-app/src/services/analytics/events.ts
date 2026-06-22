/**
 * Analytics - Event tracking
 *
 * Features:
 * - Voice usage metrics
 * - Intent distribution
 * - Action completion rates
 * - Persona usage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { flowApi } from '../api/client';

const ANALYTICS_KEY = 'hojai_analytics';

interface AnalyticsEvent {
  type: string;
  properties: Record<string, unknown>;
  timestamp: number;
}

interface VoiceMetrics {
  totalSessions: number;
  totalDuration: number;
  avgSessionLength: number;
  languageBreakdown: Record<string, number>;
}

interface IntentMetrics {
  dictation: number;
  query: number;
  action: number;
  workflow: number;
  agent: number;
}

interface ActionMetrics {
  suggested: number;
  approved: number;
  rejected: number;
  completed: number;
}

interface Analytics {
  voice: VoiceMetrics;
  intents: IntentMetrics;
  actions: ActionMetrics;
  personas: Record<string, number>;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private sessionStart: number | null = null;

  /**
   * Track event
   */
  track(type: string, properties: Record<string, unknown> = {}) {
    const event: AnalyticsEvent = {
      type,
      properties,
      timestamp: Date.now(),
    };

    this.events.push(event);

    // Send to server if batch size reached
    if (this.events.length >= 10) {
      this.flush();
    }

    // Log in dev
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${type}`, properties);
    }
  }

  /**
   * Voice events
   */
  voiceStart() {
    this.sessionStart = Date.now();
    this.track('voice_start');
  }

  voiceEnd(success: boolean, language: string) {
    if (this.sessionStart) {
      const duration = Date.now() - this.sessionStart;
      this.track('voice_end', {
        duration,
        success,
        language,
      });
      this.sessionStart = null;
    }
  }

  transcriptGenerated(text: string, language: string) {
    this.track('transcript_generated', {
      textLength: text.length,
      language,
    });
  }

  /**
   * Intent events
   */
  intentDetected(type: string, subtype: string, confidence: number) {
    this.track('intent_detected', {
      type,
      subtype,
      confidence,
    });
  }

  /**
   * Action events
   */
  actionSuggested(type: string) {
    this.track('action_suggested', { type });
  }

  actionApproved(id: string) {
    this.track('action_approved', { actionId: id });
  }

  actionRejected(id: string, reason?: string) {
    this.track('action_rejected', { actionId: id, reason });
  }

  actionCompleted(id: string, duration: number) {
    this.track('action_completed', { actionId: id, duration });
  }

  /**
   * Persona events
   */
  personaSwitched(from: string, to: string) {
    this.track('persona_switched', { from, to });
  }

  personaCreated(type: string) {
    this.track('persona_created', { type });
  }

  /**
   * Flush events to server
   */
  async flush() {
    if (this.events.length === 0) return;

    const events = [...this.events];
    this.events = [];

    try {
      // Store locally
      await this.persistEvents(events);

      // Send to server
      await flowApi.post('/api/analytics/events', { events });
    } catch (e) {
      // Put events back if failed
      this.events = [...events, ...this.events];
      console.error('[Analytics] Flush failed:', e);
    }
  }

  /**
   * Persist events locally
   */
  private async persistEvents(events: AnalyticsEvent[]) {
    try {
      const stored = await AsyncStorage.getItem(ANALYTICS_KEY);
      const allEvents: AnalyticsEvent[] = stored ? JSON.parse(stored) : [];

      // Keep last 1000 events
      const trimmed = [...allEvents, ...events].slice(-1000);

      await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('[Analytics] Persist failed:', e);
    }
  }

  /**
   * Get metrics
   */
  async getMetrics(): Promise<Analytics> {
    const stored = await AsyncStorage.getItem(ANALYTICS_KEY);
    const events: AnalyticsEvent[] = stored ? JSON.parse(stored) : [];

    return this.calculateMetrics(events);
  }

  /**
   * Calculate metrics from events
   */
  private calculateMetrics(events: AnalyticsEvent[]): Analytics {
    const analytics: Analytics = {
      voice: {
        totalSessions: 0,
        totalDuration: 0,
        avgSessionLength: 0,
        languageBreakdown: {},
      },
      intents: {
        dictation: 0,
        query: 0,
        action: 0,
        workflow: 0,
        agent: 0,
      },
      actions: {
        suggested: 0,
        approved: 0,
        rejected: 0,
        completed: 0,
      },
      personas: {},
    };

    for (const event of events) {
      switch (event.type) {
        case 'voice_start':
          analytics.voice.totalSessions++;
          break;

        case 'voice_end':
          if (event.properties.duration) {
            analytics.voice.totalDuration += event.properties.duration as number;
          }
          if (event.properties.language) {
            const lang = event.properties.language as string;
            analytics.voice.languageBreakdown[lang] =
              (analytics.voice.languageBreakdown[lang] || 0) + 1;
          }
          break;

        case 'intent_detected':
          if (event.properties.type) {
            const intentType = event.properties.type as string;
            if (intentType in analytics.intents) {
              (analytics.intents as Record<string, number>)[intentType]++;
            }
          }
          break;

        case 'action_suggested':
          analytics.actions.suggested++;
          break;

        case 'action_approved':
          analytics.actions.approved++;
          break;

        case 'action_rejected':
          analytics.actions.rejected++;
          break;

        case 'action_completed':
          analytics.actions.completed++;
          break;

        case 'persona_switched':
          if (event.properties.to) {
            const persona = event.properties.to as string;
            analytics.personas[persona] = (analytics.personas[persona] || 0) + 1;
          }
          break;
      }
    }

    // Calculate averages
    if (analytics.voice.totalSessions > 0) {
      analytics.voice.avgSessionLength =
        analytics.voice.totalDuration / analytics.voice.totalSessions;
    }

    return analytics;
  }

  /**
   * Clear analytics
   */
  async clear() {
    this.events = [];
    await AsyncStorage.removeItem(ANALYTICS_KEY);
  }
}

export const analytics = new AnalyticsService();
export default analytics;
