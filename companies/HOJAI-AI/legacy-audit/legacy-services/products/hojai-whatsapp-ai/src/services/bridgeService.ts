import axios from 'axios';
import { Schema, Model } from 'mongoose';

// ============================================================================
// SIGNAL TYPES
// ============================================================================

export interface CrossAppSignal {
  id: string;
  userId: string;
  tenantId: string;
  merchantId?: string;

  // Signal data
  signalType: SignalType;
  signalCategory: SignalCategory;
  confidence: number;

  // Data
  data: Record<string, any>;

  // Source
  source: 'hojai' | 'rez';
  sourceApp?: string;
  sourceService: string;

  // Enrichment (from REZ)
  enriched?: {
    ltv?: number;
    churnRisk?: number;
    segment?: string;
    preferences?: Record<string, any>;
  };

  createdAt: Date;
}

export enum SignalType {
  BEHAVIORAL = 'behavioral',
  COMMERCE = 'commerce',
  INTENT = 'intent',
  SEGMENT = 'segment',
  PREFERENCE = 'preference',
  TRANSACTION = 'transaction',
  ENGAGEMENT = 'engagement'
}

export enum SignalCategory {
  PURCHASE = 'purchase',
  BROWSE = 'browse',
  CHAT = 'chat',
  BOOKING = 'booking',
  FEEDBACK = 'feedback',
  LOCATION = 'location',
  SOCIAL = 'social',
  DEVICE = 'device'
}

// ============================================================================
// MODELS
// ============================================================================

const CrossAppSignalSchema = new Schema({
  userId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  merchantId: String,
  signalType: { type: String, enum: Object.values(SignalType), required: true },
  signalCategory: { type: String, enum: Object.values(SignalCategory), required: true },
  confidence: { type: Number, min: 0, max: 1 },
  data: { type: Map, of: Schema.Types.Mixed },
  source: { type: String, enum: ['hojai', 'rez'], required: true },
  sourceApp: String,
  sourceService: String,
  enriched: {
    ltv: Number,
    churnRisk: Number,
    segment: String,
    preferences: { type: Map, of: Schema.Types.Mixed }
  }
}, { timestamps: true });

CrossAppSignalSchema.index({ userId: 1, signalType: 1, createdAt: -1 });
CrossAppSignalSchema.index({ tenantId: 1, signalType: 1 });
CrossAppSignalSchema.index({ merchantId: 1, createdAt: -1 });

// ============================================================================
// BRIDGE SERVICE
// ============================================================================

export class SignalBridgeService {
  // REZ endpoints
  private readonly REZ_EVENT_BUS = process.env.REZ_EVENT_BUS_URL || 'http://localhost:4025';
  private readonly REZ_INTELLIGENCE = process.env.REZ_INTELLIGENCE_URL || 'http://localhost:4018';
  private readonly REZ_IDENTITY = process.env.REZ_IDENTITY_URL || 'http://localhost:4060';
  private readonly INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'rez-internal-token';

  /**
   * Emit signal from Hojai to REZ
   */
  async emitSignal(params: {
    tenantId: string;
    merchantId: string;
    userId: string;
    signalType: SignalType;
    signalCategory: SignalCategory;
    data: Record<string, any>;
    confidence?: number;
    sourceApp?: string;
  }): Promise<void> {
    try {
      // Forward to REZ Event Bus
      await axios.post(`${this.REZ_EVENT_BUS}/api/signals`, {
        type: params.signalType,
        category: params.signalCategory,
        userId: params.userId,
        merchantId: params.merchantId,
        data: params.data,
        source: 'hojai',
        sourceApp: params.sourceApp || 'whatsapp-ai',
        confidence: params.confidence || 0.8,
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'X-Internal-Token': this.INTERNAL_TOKEN,
          'X-Source': 'hojai-whatsapp-ai'
        }
      });

      console.log(`[Bridge] Signal emitted: ${params.signalType} for user ${params.userId}`);
    } catch (error) {
      console.error('[Bridge] Failed to emit signal:', error);
      // Don't throw - signal loss is acceptable
    }
  }

  /**
   * Get signals from REZ for user
   */
  async getSignals(params: {
    userId: string;
    signalType?: SignalType;
    limit?: number;
  }): Promise<CrossAppSignal[]> {
    try {
      const response = await axios.get(
        `${this.REZ_INTELLIGENCE}/api/signals/${params.userId}`,
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN
          }
        }
      );

      let signals = response.data.signals || [];

      if (params.signalType) {
        signals = signals.filter((s: any) => s.signalType === params.signalType);
      }

      return signals.slice(0, params.limit || 50);
    } catch (error) {
      console.error('[Bridge] Failed to get signals:', error);
      return [];
    }
  }

  /**
   * Get user context from REZ
   */
  async getUserContext(userId: string): Promise<{
    ltv?: number;
    churnRisk?: number;
    segment?: string;
    preferences?: Record<string, unknown>;
    loyalty?: { points: number; tier: string };
    commerce?: { totalOrders: number; avgOrderValue: number };
    mobility?: { homeLocation?: unknown; workLocation?: unknown };
    travel?: { lastDestination?: string; frequentRoutes?: string[] };
  } | null> {
    try {
      const response = await axios.get(
        `${this.REZ_IDENTITY}/api/users/${userId}/context`,
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN
          }
        }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Link Hojai user to REZ user
   */
  async linkUsers(params: {
    hojaiUserId: string;
    hojaiMerchantId: string;
    rezUserId?: string;
    phone?: string;
  }): Promise<{ linked: boolean; rezUserId?: string }> {
    try {
      const response = await axios.post(
        `${this.REZ_IDENTITY}/api/links/hojai`,
        {
          hojaiUserId: params.hojaiUserId,
          merchantId: params.hojaiMerchantId,
          phone: params.phone,
          source: 'whatsapp-ai'
        },
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN
          }
        }
      );

      return {
        linked: true,
        rezUserId: response.data.rezUserId
      };
    } catch (error) {
      console.error('[Bridge] Failed to link users:', error);
      return { linked: false };
    }
  }

  /**
   * Get enriched user profile
   */
  async getEnrichedProfile(params: {
    userId: string;
    merchantId: string;
    signalData: Record<string, any>;
  }): Promise<Record<string, any>> {
    // Start with signal data
    const enriched = { ...params.signalData };

    // Get REZ context if available
    const context = await this.getUserContext(params.userId);

    if (context) {
      // Merge REZ data
      enriched.rez = {
        ltv: context.ltv,
        churnRisk: context.churnRisk,
        segment: context.segment,
        preferences: context.preferences,
        loyalty: context.loyalty,
        commerce: context.commerce,
        mobility: context.mobility
      };
    }

    return enriched;
  }

  /**
   * Emit order/transaction to REZ
   */
  async emitTransaction(params: {
    userId: string;
    merchantId: string;
    transactionType: 'order' | 'booking' | 'payment';
    amount?: number;
    items?: any[];
    source: string;
  }): Promise<void> {
    await this.emitSignal({
      tenantId: params.merchantId,
      merchantId: params.merchantId,
      userId: params.userId,
      signalType: SignalType.TRANSACTION,
      signalCategory: SignalCategory.PURCHASE,
      data: {
        transactionType: params.transactionType,
        amount: params.amount,
        items: params.items,
        source: params.source
      },
      confidence: 1.0
    });
  }

  /**
   * Emit engagement signal
   */
  async emitEngagement(params: {
    userId: string;
    merchantId: string;
    action: 'message' | 'click' | 'view' | 'conversion';
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.emitSignal({
      tenantId: params.merchantId,
      merchantId: params.merchantId,
      userId: params.userId,
      signalType: SignalType.ENGAGEMENT,
      signalCategory: SignalCategory.CHAT,
      data: {
        action: params.action,
        ...params.metadata
      },
      confidence: 0.9
    });
  }

  /**
   * Get user segments from REZ
   */
  async getUserSegments(userId: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.REZ_INTELLIGENCE}/api/segments/user/${userId}`,
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN
          }
        }
      );
      return response.data.segments || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get LTV prediction from REZ
   */
  async getLTVPrediction(userId: string): Promise<number | null> {
    try {
      const response = await axios.get(
        `${this.REZ_INTELLIGENCE}/api/predictions/ltv/${userId}`,
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN
          }
        }
      );
      return response.data.ltv || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get churn risk from REZ
   */
  async getChurnRisk(userId: string): Promise<number | null> {
    try {
      const response = await axios.get(
        `${this.REZ_INTELLIGENCE}/api/predictions/churn/${userId}`,
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN
          }
        }
      );
      return response.data.risk || null;
    } catch {
      return null;
    }
  }

  /**
   * Get enriched context for AI response
   */
  async getEnrichedContext(
    userId: string,
    currentContext?: Record<string, any>
  ): Promise<Record<string, any>> {
    const context = currentContext || {};

    try {
      const [userContext, segments, ltv, churnRisk] = await Promise.all([
        this.getUserContext(userId),
        this.getUserSegments(userId),
        this.getLTVPrediction(userId),
        this.getChurnRisk(userId)
      ]);

      return {
        ...context,
        rez: {
          segments: segments || [],
          ltv: ltv || 0,
          churnRisk: churnRisk || 0,
          mobility: userContext?.mobility,
          travel: userContext?.travel,
          commerce: userContext?.commerce
        }
      };
    } catch {
      return context;
    }
  }

  /**
   * Emit behavioral signal
   */
  async emitBehavioralSignal(params: {
    userId: string;
    merchantId: string;
    signal: string;
    value: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    return this.emitSignal({
      tenantId: params.merchantId,
      merchantId: params.merchantId,
      userId: params.userId,
      signalType: SignalType.BEHAVIORAL,
      signalCategory: SignalCategory.BROWSE,
      data: {
        signal: params.signal,
        value: params.value,
        ...params.metadata
      },
      confidence: params.value
    });
  }
}

export const signalBridge = new SignalBridgeService();
