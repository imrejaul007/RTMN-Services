/**
 * Cosmic OS - API Service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CouncilResponse, DailyReading, DomainGuidance, Mood, Agent, MoodOption, Domain } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_COSMIC_API_URL || 'http://localhost:4160';

class CosmicAPI {
  private token: string | null = null;

  async setToken(token: string | null) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem('cosmic_token', token);
    } else {
      await AsyncStorage.removeItem('cosmic_token');
    }
  }

  async loadToken() {
    this.token = await AsyncStorage.getItem('cosmic_token');
    return this.token;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>,
    params?: Record<string, string | number>
  ): Promise<{ success: boolean; data?: T; error?: { code: string; message: string } }> {
    const url = new URL(`${BASE_URL}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      return await response.json();
    } catch (error) {
      console.error('Cosmic API Error:', error);
      return {
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Failed to connect to Cosmic OS' },
      };
    }
  }

  // ============================================
  // MOOD CHECK-IN
  // ============================================

  async checkInMood(userId: string, mood: Mood, energy: number, context?: any): Promise<CouncilResponse> {
    const response = await this.request<CouncilResponse>('POST', '/api/mood/checkin', {
      userId,
      mood,
      energy,
      context,
    });

    if (response.success && response.data) {
      return response.data;
    }

    // Return mock data for demo
    return this.getMockCouncilResponse(mood, energy);
  }

  // ============================================
  // DAILY READING
  // ============================================

  async getDailyReading(userId: string, mood?: Mood, energy?: number): Promise<DailyReading> {
    const params: Record<string, string | number> = {};
    if (mood) params.mood = mood;
    if (energy !== undefined) params.energy = energy;

    const response = await this.request<DailyReading>('GET', `/api/daily/${userId}`, undefined, params);

    if (response.success && response.data) {
      return response.data;
    }

    return this.getMockDailyReading(userId);
  }

  // ============================================
  // COUNCIL RESPONSE
  // ============================================

  async getCouncilResponse(
    userId: string,
    mood: Mood,
    energy: number,
    agents?: string[]
  ): Promise<CouncilResponse> {
    const response = await this.request<CouncilResponse>('POST', '/api/council', {
      userId,
      mood,
      energy,
      agents,
    });

    if (response.success && response.data) {
      return response.data;
    }

    return this.getMockCouncilResponse(mood, energy);
  }

  // ============================================
  // DOMAIN GUIDANCE
  // ============================================

  async getDomainGuidance(domain: Domain, mood?: Mood, energy?: number): Promise<DomainGuidance> {
    const params: Record<string, string | number> = {};
    if (mood) params.mood = mood;
    if (energy !== undefined) params.energy = energy;

    const response = await this.request<DomainGuidance>('GET', `/api/guidance/${domain}`, undefined, params);

    if (response.success && response.data) {
      return response.data;
    }

    return this.getMockDomainGuidance(domain);
  }

  // ============================================
  // AVAILABLE DATA
  // ============================================

  async getMoods(): Promise<MoodOption[]> {
    const response = await this.request<{ moods: MoodOption[] }>('GET', '/api/moods');

    if (response.success && response.data) {
      return response.data.moods;
    }

    // Return defaults
    return [
      { value: 'very_positive', label: 'Radiant', emoji: '✨', color: '#10B981' },
      { value: 'positive', label: 'Happy', emoji: '😊', color: '#34D399' },
      { value: 'neutral', label: 'Neutral', emoji: '😐', color: '#6B7280' },
    ];
  }

  async getAgents(): Promise<Agent[]> {
    const response = await this.request<{ agents: Agent[] }>('GET', '/api/agents');

    if (response.success && response.data) {
      return response.data.agents;
    }

    return [];
  }

  // ============================================
  // MOCK DATA FOR DEMO
  // ============================================

  private getMockCouncilResponse(mood: Mood, energy: number): CouncilResponse {
    const energyLevel = energy > 70 ? 'high' : energy > 40 ? 'medium' : 'low';

    return {
      cosmicState: {
        energyLevel,
        emotionalTone: this.getMoodTone(mood),
        socialEnergy: energy,
        focusScore: Math.min(100, energy + 10),
        relationshipEnergy: Math.max(0, energy - 10),
        financialEnergy: energy,
        growthEnergy: energy,
      },
      mood,
      energy,
      insights: [
        {
          agent: 'mystic',
          category: 'spiritual',
          title: 'Cosmic Alignment',
          interpretation: 'Your inner wisdom seeks expression today',
          symbolic: 'The stars whisper secrets meant only for you',
          practical: 'Take a moment for meditation or reflection today',
          confidence: 0.8,
        },
        {
          agent: 'healer',
          category: 'emotional',
          title: 'Inner Harmony',
          interpretation: 'Your emotional resilience is strong',
          symbolic: 'The healer within you seeks balance and restoration',
          practical: 'Consider sharing your warmth with others',
          confidence: 0.75,
        },
        {
          agent: 'strategist',
          category: 'career',
          title: 'Strategic Clarity',
          interpretation: energyLevel === 'high' ? 'Focus serves you well today' : 'Rest and reflection serve you',
          symbolic: 'The strategist charts a course through possibility',
          practical: energyLevel === 'high' ? 'Prioritize your most important tasks' : 'Break large tasks into smaller steps',
          confidence: 0.75,
        },
      ],
      consensus: {
        theme: 'Balance and Growth',
        summary: 'The council sees alignment in your path',
        suggestedAction: 'Trust your inner wisdom today',
      },
      dailyAffirmation: this.getAffirmation(energyLevel),
      caution: energyLevel === 'high'
        ? 'Channel your abundant energy wisely'
        : 'Rest is part of the journey, not apart from it',
      timestamp: new Date().toISOString(),
    };
  }

  private getMockDailyReading(userId: string): DailyReading {
    const themes = ['Integration and Wholeness', 'Courage and Vulnerability', 'Presence and Acceptance'];
    const affirmations = [
      'I am worthy of love and belonging',
      'My journey is unique and meaningful',
      'I trust the process of life',
    ];

    return {
      userId,
      date: new Date().toISOString().split('T')[0],
      cosmicState: {
        energyLevel: 'medium',
        emotionalTone: 'Steady and centered',
        socialEnergy: 60,
        focusScore: 70,
        relationshipEnergy: 70,
        financialEnergy: 65,
        growthEnergy: 60,
      },
      insights: [
        {
          agent: 'mystic',
          category: 'spiritual',
          title: 'Cosmic Alignment',
          interpretation: 'Your inner wisdom seeks expression today',
          symbolic: 'The stars whisper secrets meant only for you',
          practical: 'Take a moment for meditation or reflection today',
          confidence: 0.8,
        },
      ],
      affirmation: affirmations[Math.floor(Math.random() * affirmations.length)],
      theme: themes[Math.floor(Math.random() * themes.length)],
      suggestedActions: ['Practice mindfulness', 'Connect with a loved one', 'Trust your intuition'],
      avoidedActions: ['Don\'t force decisions', 'Avoid comparison', 'Don\'t overcommit'],
      moonPhase: ['New Moon', 'Waxing Crescent', 'Full Moon'][Math.floor(Math.random() * 3)],
      luckyColor: ['Purple', 'Gold', 'Teal', 'Rose'][Math.floor(Math.random() * 4)],
      luckyNumber: Math.floor(Math.random() * 9) + 1,
    };
  }

  private getMockDomainGuidance(domain: Domain): DomainGuidance {
    const guidance: Record<Domain, { guidance: string; actions: string[]; affirmations: string[] }> = {
      emotional: {
        guidance: 'Your emotional resilience is your greatest asset',
        actions: ['Practice self-compassion', 'Express your feelings', 'Seek joyful activities'],
        affirmations: ['I honor my emotions', 'I am healing and whole'],
      },
      relationship: {
        guidance: 'Quality connections nurture your soul',
        actions: ['Reach out to a loved one', 'Practice active listening', 'Express gratitude'],
        affirmations: ['I am worthy of connection', 'Loving relationships are my birthright'],
      },
      career: {
        guidance: 'Your unique talents are needed in the world',
        actions: ['Prioritize your top 3 tasks', 'Take one calculated risk', 'Seek feedback'],
        affirmations: ['I am capable and creative', 'My work has meaning'],
      },
      financial: {
        guidance: 'Abundance flows when aligned with purpose',
        actions: ['Review your spending', 'Set a financial intention', 'Practice gratitude'],
        affirmations: ['Money flows easily to me', 'I am a good steward of resources'],
      },
      health: {
        guidance: 'Your body holds wisdom - listen to its signals',
        actions: ['Move your body gently', 'Hydrate well', 'Get adequate rest'],
        affirmations: ['My body is my temple', 'I nourish myself with care'],
      },
      spiritual: {
        guidance: 'You are connected to all that is',
        actions: ['Meditate for 10 minutes', 'Journal your insights', 'Spend time in nature'],
        affirmations: ['I am connected to all that is', 'My intuition guides me truly'],
      },
      social: {
        guidance: 'Community nourishes the soul',
        actions: ['Initiate one meaningful conversation', 'Practice presence', 'Set healthy boundaries'],
        affirmations: ['I attract supportive relationships', 'I am a good friend to myself'],
      },
    };

    return {
      domain,
      ...guidance[domain],
    };
  }

  private getMoodTone(mood: Mood): string {
    const tones: Record<Mood, string> = {
      very_positive: 'Radiant and expansive',
      positive: 'Warm and hopeful',
      neutral: 'Steady and centered',
      negative: 'Contemplative and reflective',
      very_negative: 'Quiet and introspective',
      anxious: 'Restless and searching',
      calm: 'Serene and content',
      energetic: 'Dynamic and vibrant',
      tired: 'Quiet and restorative',
      stressed: 'Intense and pressured',
      peaceful: 'Tranquil and harmonious',
    };
    return tones[mood] || 'Variable and nuanced';
  }

  private getAffirmation(energyLevel: string): string {
    const affirmations: Record<string, string[]> = {
      high: ['My enthusiasm lights the way for others', 'Today I create and share freely'],
      medium: ['I am exactly where I need to be', 'Each moment brings its own gifts'],
      low: ['Rest is part of the journey', 'Tomorrow holds new possibilities'],
    };
    const pool = affirmations[energyLevel] || affirmations.medium;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

export const cosmicAPI = new CosmicAPI();
export default cosmicAPI;