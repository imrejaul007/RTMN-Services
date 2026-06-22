/**
 * Unified SDK - Connect any app to Hojai + REZ Intelligence
 *
 * Features:
 * - Event tracking (commerce, health, mobility, travel)
 * - Emotional wellness (mood check-in, cosmic context)
 * - Identity management
 */
import axios from 'axios';

export interface SDKConfig {
  apiKey: string;
  baseUrl?: string;
  debug?: boolean;
}

export interface EmitOptions {
  source: string;
  event: string;
  userId?: string;
  data: Record<string, any>;
  privacy?: 'public' | 'internal' | 'sensitive';
}

// Wellness types
export interface WellnessCheckIn {
  userId: string;
  mood: 'radiant' | 'bright' | 'balanced' | 'clouded' | 'stormy' | 'peaceful' | 'restless' | 'tired';
  energy: 1 | 2 | 3 | 4 | 5;
  note?: string;
  gratitude?: string;
}

export interface WellnessResult {
  success: boolean;
  mood: {
    current: string;
    energy: number;
    stress: number;
    socialEnergy: number;
  };
  cosmic: {
    energyLevel: 'high' | 'medium' | 'low';
    emotionalTone: string;
    focusScore: number;
    socialEnergy: number;
  };
  affirmation: string;
  insight: string;
}

export interface CosmicContext {
  cosmic: {
    energyLevel: 'high' | 'medium' | 'low';
    emotionalTone: string;
    focusScore: number;
    socialEnergy: number;
  };
  dailyReading?: {
    primaryTheme: string;
    affirmation: string;
  };
  suggestedActions: string[];
}

export class HojaiSDK {
  private apiKey: string;
  private baseUrl: string;
  private cosmicUrl: string;
  private debug: boolean;
  private queue: any[] = [];
  private flushing = false;

  constructor(config: SDKConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://localhost:4570';
    this.cosmicUrl = process.env.COSMIC_SERVICE_URL || 'http://localhost:4163';
    this.debug = config.debug || false;

    // Flush queue on interval
    setInterval(() => this.flush(), 5000);
  }

  async emit(options: EmitOptions): Promise<void> {
    const event = {
      ...options,
      timestamp: new Date().toISOString(),
      sdk: 'unified-v2'
    };

    if (this.debug) {
      console.log('[HojaiSDK] Emit:', event);
    }

    // Add to queue
    this.queue.push(event);

    // Flush immediately if queue is large
    if (this.queue.length >= 10) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;

    this.flushing = true;
    const batch = this.queue.splice(0, 50);

    try {
      await axios.post(`${this.baseUrl}/api/events/batch`, { events: batch }, {
        headers: { 'X-API-Key': this.apiKey }
      });
    } catch (e) {
      // Re-add failed events
      this.queue.unshift(...batch);
      console.error('[HojaiSDK] Batch failed, will retry');
    }

    this.flushing = false;
  }

  // ============================================
  // COMMERCE TRACKING
  // ============================================

  async trackCommerce(data: { userId: string; action: string; value?: number }) {
    return this.emit({ source: 'commerce', event: data.action, userId: data.userId, data: data });
  }

  async trackPurchase(data: { userId: string; amount: number; category: string }) {
    return this.emit({ source: 'commerce', event: 'purchase', userId: data.userId, data: data });
  }

  async trackCart(data: { userId: string; action: 'add' | 'remove' | 'abandon'; items: any[] }) {
    return this.emit({ source: 'commerce', event: `cart_${data.action}`, userId: data.userId, data: data });
  }

  // ============================================
  // HEALTH & WELLNESS TRACKING
  // ============================================

  async trackHealth(data: { userId: string; metrics: any }) {
    return this.emit({ source: 'health', event: 'metrics', userId: data.userId, data: data, privacy: 'sensitive' });
  }

  async trackFitness(data: { userId: string; activity: string; duration?: number; calories?: number }) {
    return this.emit({ source: 'fitness', event: data.activity, userId: data.userId, data: data });
  }

  async trackSleep(data: { userId: string; hours: number; quality?: number }) {
    return this.emit({ source: 'health', event: 'sleep', userId: data.userId, data: data, privacy: 'sensitive' });
  }

  // ============================================
  // EMOTIONAL WELLNESS (NEW)
  // ============================================

  /**
   * Record a mood check-in with cosmic interpretation
   */
  async wellnessCheckIn(data: WellnessCheckIn): Promise<WellnessResult> {
    try {
      const response = await axios.post(
        `${this.cosmicUrl}/api/mood/checkin`,
        {
          userId: data.userId,
          mood: data.mood,
          energy: data.energy * 20, // 1-5 to 20-100
        },
        { headers: { 'X-API-Key': this.apiKey } }
      );

      return {
        success: true,
        mood: {
          current: data.mood,
          energy: data.energy * 20,
          stress: 100 - (data.energy * 20),
          socialEnergy: this.estimateSocialEnergy(data.mood),
        },
        cosmic: response.data.cosmicInterpretation || {
          energyLevel: data.energy >= 4 ? 'high' : data.energy >= 2 ? 'medium' : 'low',
          emotionalTone: this.getEmotionalTone(data.mood),
          focusScore: data.energy >= 3 ? 75 : 50,
          socialEnergy: this.estimateSocialEnergy(data.mood),
        },
        affirmation: response.data.affirmation || this.getAffirmation(data.mood),
        insight: response.data.cosmicInterpretation?.practical || this.getInsight(data.mood),
      };
    } catch {
      // Fallback to local interpretation
      return {
        success: true,
        mood: {
          current: data.mood,
          energy: data.energy * 20,
          stress: 100 - (data.energy * 20),
          socialEnergy: this.estimateSocialEnergy(data.mood),
        },
        cosmic: {
          energyLevel: data.energy >= 4 ? 'high' : data.energy >= 2 ? 'medium' : 'low',
          emotionalTone: this.getEmotionalTone(data.mood),
          focusScore: data.energy >= 3 ? 75 : 50,
          socialEnergy: this.estimateSocialEnergy(data.mood),
        },
        affirmation: this.getAffirmation(data.mood),
        insight: this.getInsight(data.mood),
      };
    }
  }

  /**
   * Get cosmic context for a user
   */
  async getCosmicContext(userId: string): Promise<CosmicContext> {
    try {
      const response = await axios.get(
        `${this.cosmicUrl}/api/cosmic/${userId}`,
        { headers: { 'X-API-Key': this.apiKey } }
      );

      return {
        cosmic: response.data.cosmic,
        dailyReading: response.data.dailyReading,
        suggestedActions: response.data.suggestedActions || [],
      };
    } catch {
      return {
        cosmic: {
          energyLevel: 'medium',
          emotionalTone: 'Balanced and steady',
          focusScore: 70,
          socialEnergy: 60,
        },
        suggestedActions: ['Take a moment to breathe', 'Be present with yourself'],
      };
    }
  }

  /**
   * Get domain-specific guidance
   */
  async getGuidance(userId: string, domain: string): Promise<{
    guidance: string;
    practicalSteps: string[];
    symbolic: string;
  }> {
    try {
      const response = await axios.get(
        `${this.cosmicUrl}/api/guidance/${userId}/${domain}`,
        { headers: { 'X-API-Key': this.apiKey } }
      );

      return {
        guidance: response.data.guidance?.guidance || 'Trust your path',
        practicalSteps: response.data.guidance?.practicalSteps || ['Breathe', 'Be present'],
        symbolic: response.data.guidance?.symbolic || 'Growth takes time',
      };
    } catch {
      return {
        guidance: 'Follow your intuition',
        practicalSteps: ['Take one step at a time'],
        symbolic: 'Every journey is unique',
      };
    }
  }

  // ============================================
  // MOBILITY TRACKING
  // ============================================

  async trackMobility(data: { userId: string; rideType: string; location: any }) {
    return this.emit({ source: 'mobility', event: data.rideType, userId: data.userId, data: data });
  }

  async trackTravel(data: { userId: string; destination: string; class: string }) {
    return this.emit({ source: 'travel', event: 'booking', userId: data.userId, data: data });
  }

  // ============================================
  // IDENTITY
  // ============================================

  async identify(userId: string, traits?: Record<string, any>) {
    return this.emit({ source: 'identity', event: 'identify', userId, data: { traits } });
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private getEmotionalTone(mood: string): string {
    const tones: Record<string, string> = {
      radiant: 'Radiant and expansive',
      bright: 'Warm and hopeful',
      balanced: 'Steady and centered',
      clouded: 'Contemplative and reflective',
      stormy: 'Intense and transformative',
      peaceful: 'Serene and content',
      restless: 'Eager and searching',
      tired: 'Quiet and introspective',
    };
    return tones[mood] || 'Balanced and steady';
  }

  private estimateSocialEnergy(mood: string): number {
    const energy: Record<string, number> = {
      radiant: 90, bright: 80, balanced: 60,
      clouded: 40, stormy: 30, peaceful: 50,
      restless: 70, tired: 30,
    };
    return energy[mood] || 50;
  }

  private getAffirmation(mood: string): string {
    const affirmations: Record<string, string> = {
      radiant: 'Your light illuminates the path for others',
      bright: 'Today brings opportunities aligned with your highest good',
      balanced: 'In equilibrium, all things become possible',
      clouded: 'Even clouds have silver linings - look for the gift',
      stormy: 'After every storm comes clarity',
      peaceful: 'This peace is a treasure - savor it',
      restless: 'The search is part of the journey',
      tired: 'Rest is not retreat - it is how growth happens',
    };
    return affirmations[mood] || 'You are exactly where you need to be';
  }

  private getInsight(mood: string): string {
    const insights: Record<string, string> = {
      radiant: 'This energy is meant to be shared wisely',
      bright: 'Act on positive impulses with care',
      balanced: 'This equilibrium is a strength',
      clouded: 'Clarity returns when you are ready',
      stormy: 'Breathe through - this too shall pass',
      peaceful: 'Share this calm energy gently with others',
      restless: 'Channel restlessness into curiosity',
      tired: 'Prioritize rest above productivity',
    };
    return insights[mood] || 'Trust the process';
  }
}

// Factory
export function createSDK(config: SDKConfig): HojaiSDK {
  return new HojaiSDK(config);
}


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'unified-sdk',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
