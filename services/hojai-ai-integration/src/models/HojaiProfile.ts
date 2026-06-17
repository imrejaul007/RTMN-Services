import { v4 as uuidv4 } from 'uuid';

export enum HojaiProduct {
  GENIE = 'genie',
  COPILOT = 'copilot',
  SUTAR = 'sutar',
  MEMORY = 'memory',
  GOALS = 'goals'
}

export enum TrustLevel {
  UNVERIFIED = 'unverified',
  BASIC = 'basic',
  VERIFIED = 'verified',
  TRUSTED = 'trusted',
  ELITE = 'elite'
}

export enum IntegrationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  DISCONNECTED = 'disconnected'
}

export interface ConversationMemory {
  id: string;
  tenantId: string;
  conversationId: string;
  messages: ConversationMessage[];
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface GoalMapping {
  id: string;
  tenantId: string;
  goalId: string;
  outcomeId?: string;
  status: 'active' | 'completed' | 'cancelled';
  progress: number;
  milestones: GoalMilestone[];
  linkedTwinId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date;
}

export interface DecisionRecord {
  id: string;
  tenantId: string;
  decisionId: string;
  context: Record<string, any>;
  decision: string;
  outcome?: string;
  confidence: number;
  agentId?: string;
  createdAt: Date;
}

export interface SupportContext {
  tenantId: string;
  customerId: string;
  issueType?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  summary?: string;
  suggestedActions?: string[];
}

export interface HojaiProfile {
  id: string;
  tenantId: string;
  hojaiUserId: string;
  products: HojaiProduct[];
  trustLevel: TrustLevel;
  integrations: IntegrationRecord[];
  customerTwinId?: string;
  agentTwinId?: string;
  preferences: ProfilePreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationRecord {
  product: HojaiProduct;
  status: IntegrationStatus;
  externalId?: string;
  lastSyncAt?: Date;
  config: Record<string, any>;
}

export interface ProfilePreferences {
  notifications: boolean;
  autoSync: boolean;
  privacyLevel: 'minimal' | 'standard' | 'full';
  language: string;
  timezone: string;
}

export interface CreateHojaiProfileRequest {
  tenantId: string;
  hojaiUserId: string;
  products?: HojaiProduct[];
  preferences?: Partial<ProfilePreferences>;
}

export interface UpdateHojaiProfileRequest {
  products?: HojaiProduct[];
  trustLevel?: TrustLevel;
  preferences?: Partial<ProfilePreferences>;
}

export class HojaiProfileModel {
  private profiles: Map<string, HojaiProfile> = new Map();
  private conversations: Map<string, ConversationMemory> = new Map();
  private goalMappings: Map<string, GoalMapping> = new Map();
  private decisionRecords: Map<string, DecisionRecord> = new Map();

  createProfile(request: CreateHojaiProfileRequest): HojaiProfile {
    const id = `HP-${uuidv4().slice(0, 8).toUpperCase()}`;
    const now = new Date();

    const profile: HojaiProfile = {
      id,
      tenantId: request.tenantId,
      hojaiUserId: request.hojaiUserId,
      products: request.products || [HojaiProduct.GENIE],
      trustLevel: TrustLevel.BASIC,
      integrations: (request.products || [HojaiProduct.GENIE]).map(product => ({
        product,
        status: IntegrationStatus.PENDING,
        config: {}
      })),
      preferences: {
        notifications: true,
        autoSync: true,
        privacyLevel: 'standard',
        language: 'en',
        timezone: 'UTC',
        ...request.preferences
      },
      createdAt: now,
      updatedAt: now
    };

    this.profiles.set(id, profile);
    return profile;
  }

  getProfile(id: string): HojaiProfile | undefined {
    return this.profiles.get(id);
  }

  getProfileByTenantAndUser(tenantId: string, hojaiUserId: string): HojaiProfile | undefined {
    for (const profile of this.profiles.values()) {
      if (profile.tenantId === tenantId && profile.hojaiUserId === hojaiUserId) {
        return profile;
      }
    }
    return undefined;
  }

  updateProfile(id: string, updates: UpdateHojaiProfileRequest): HojaiProfile | undefined {
    const profile = this.profiles.get(id);
    if (!profile) return undefined;

    if (updates.products) {
      profile.products = updates.products;
      updates.products.forEach(product => {
        if (!profile.integrations.find(i => i.product === product)) {
          profile.integrations.push({
            product,
            status: IntegrationStatus.PENDING,
            config: {}
          });
        }
      });
    }

    if (updates.trustLevel) {
      profile.trustLevel = updates.trustLevel;
    }

    if (updates.preferences) {
      profile.preferences = { ...profile.preferences, ...updates.preferences };
    }

    profile.updatedAt = new Date();
    this.profiles.set(id, profile);
    return profile;
  }

  activateIntegration(profileId: string, product: HojaiProduct, externalId?: string): HojaiProfile | undefined {
    const profile = this.profiles.get(profileId);
    if (!profile) return undefined;

    const integration = profile.integrations.find(i => i.product === product);
    if (integration) {
      integration.status = IntegrationStatus.ACTIVE;
      integration.lastSyncAt = new Date();
      if (externalId) integration.externalId = externalId;
    }

    profile.updatedAt = new Date();
    this.profiles.set(profileId, profile);
    return profile;
  }

  createConversation(tenantId: string, conversationId: string, initialMessage?: string): ConversationMemory {
    const conversation: ConversationMemory = {
      id: `CM-${uuidv4().slice(0, 8).toUpperCase()}`,
      tenantId,
      conversationId,
      messages: initialMessage ? [{
        id: uuidv4(),
        role: 'user',
        content: initialMessage,
        timestamp: new Date()
      }] : [],
      context: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: Record<string, any>): ConversationMemory | undefined {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return undefined;

    conversation.messages.push({
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
      metadata
    });
    conversation.updatedAt = new Date();

    this.conversations.set(conversationId, conversation);
    return conversation;
  }

  getConversation(conversationId: string): ConversationMemory | undefined {
    return this.conversations.get(conversationId);
  }

  createGoalMapping(tenantId: string, goalId: string, outcomeId?: string): GoalMapping {
    const mapping: GoalMapping = {
      id: `GM-${uuidv4().slice(0, 8).toUpperCase()}`,
      tenantId,
      goalId,
      outcomeId,
      status: 'active',
      progress: 0,
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.goalMappings.set(mapping.id, mapping);
    return mapping;
  }

  updateGoalProgress(mappingId: string, progress: number, milestoneId?: string): GoalMapping | undefined {
    const mapping = this.goalMappings.get(mappingId);
    if (!mapping) return undefined;

    mapping.progress = Math.min(100, Math.max(0, progress));
    if (milestoneId) {
      const milestone = mapping.milestones.find(m => m.id === milestoneId);
      if (milestone && !milestone.completed) {
        milestone.completed = true;
        milestone.completedAt = new Date();
      }
    }

    if (mapping.progress >= 100) {
      mapping.status = 'completed';
    }

    mapping.updatedAt = new Date();
    this.goalMappings.set(mappingId, mapping);
    return mapping;
  }

  createDecisionRecord(tenantId: string, decisionId: string, context: Record<string, any>, decision: string, confidence: number, agentId?: string): DecisionRecord {
    const record: DecisionRecord = {
      id: `DR-${uuidv4().slice(0, 8).toUpperCase()}`,
      tenantId,
      decisionId,
      context,
      decision,
      confidence,
      agentId,
      createdAt: new Date()
    };

    this.decisionRecords.set(record.id, record);
    return record;
  }

  getDecisionRecords(tenantId: string, limit: number = 50): DecisionRecord[] {
    return Array.from(this.decisionRecords.values())
      .filter(r => r.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getProfilesByTenant(tenantId: string): HojaiProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.tenantId === tenantId);
  }

  getAllProfiles(): HojaiProfile[] {
    return Array.from(this.profiles.values());
  }
}

export const hojaiProfileModel = new HojaiProfileModel();
