// ============================================================================
// HOJAI VOICE PLATFORM - Agent Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  VoiceAgent,
  VoiceAgentDocument,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentType,
  SupportedLanguage,
  VoiceConfig,
  IntentDefinition,
  EntityDefinition,
} from '../types';
import { VoiceAgentModel } from '../models/VoiceAgent';
import { getDefaultIntents } from '../voice-agents';

/**
 * Agent Service - Handles voice agent CRUD operations
 */
export class AgentService {
  /**
   * Create a new voice agent
   */
  async create(
    data: CreateAgentRequest,
    organizationId: string
  ): Promise<VoiceAgentDocument> {
    // Generate ID
    const agentId = uuidv4();

    // Build intents
    let intents: IntentDefinition[] = [];

    if (data.intents && data.intents.length > 0) {
      intents = data.intents.map((intent, idx) => ({
        ...intent,
        id: intent.id || `intent_${agentId}_${idx}`,
      }));
    } else {
      // Use default intents for the agent type
      const defaultIntents = getDefaultIntents(data.type);
      intents = defaultIntents.map((intent, idx) => ({
        id: `intent_${agentId}_${idx}`,
        name: intent.name,
        description: intent.name,
        examples: intent.examples,
        action: intent.action,
      }));
    }

    // Build entities
    const entities: EntityDefinition[] = (data.entities || []).map((entity, idx) => ({
      ...entity,
      id: entity.id || `entity_${agentId}_${idx}`,
    }));

    // Build voice config
    const voiceConfig: VoiceConfig = {
      language: data.language || 'en-IN',
      voiceId: data.voiceConfig?.voiceId || '预设-indian-female-1',
      ttsEngine: data.voiceConfig?.ttsEngine || 'elevenlabs',
      sttEngine: data.voiceConfig?.sttEngine || 'whisper',
      speed: data.voiceConfig?.speed || 1.0,
      pitch: data.voiceConfig?.pitch || 1.0,
      volume: data.voiceConfig?.volume || 1.0,
    };

    // Create agent
    const agent = await VoiceAgentModel.create({
      _id: agentId,
      name: data.name,
      description: data.description || '',
      type: data.type,
      status: 'active',
      language: data.language || 'en-IN',
      voiceConfig,
      greeting: data.greeting || 'Namaste! How can I help you?',
      farewell: data.farewell || 'Thank you for calling. Have a great day!',
      intents,
      entities,
      contextWindow: data.contextWindow || 10,
      escalationNumber: data.escalationNumber,
      organizationId,
      metadata: {
        ...data.metadata,
        createdBy: organizationId,
      },
    });

    return agent;
  }

  /**
   * Get agent by ID
   */
  async getById(agentId: string, organizationId: string): Promise<VoiceAgentDocument | null> {
    return VoiceAgentModel.findOne({ _id: agentId, organizationId });
  }

  /**
   * List all agents for an organization
   */
  async list(
    organizationId: string,
    options?: {
      type?: AgentType;
      status?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ agents: VoiceAgentDocument[]; total: number }> {
    const query: Record<string, unknown> = { organizationId };

    if (options?.type) {
      query.type = options.type;
    }
    if (options?.status) {
      query.status = options.status;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [agents, total] = await Promise.all([
      VoiceAgentModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      VoiceAgentModel.countDocuments(query),
    ]);

    return { agents, total };
  }

  /**
   * Update an agent
   */
  async update(
    agentId: string,
    organizationId: string,
    data: UpdateAgentRequest
  ): Promise<VoiceAgentDocument | null> {
    const updateData: Record<string, unknown> = { ...data };

    // Handle intents update
    if (data.intents) {
      updateData.intents = data.intents.map((intent, idx) => ({
        ...intent,
        id: intent.id || `intent_${agentId}_${idx}`,
      }));
    }

    // Handle entities update
    if (data.entities) {
      updateData.entities = data.entities.map((entity, idx) => ({
        ...entity,
        id: entity.id || `entity_${agentId}_${idx}`,
      }));
    }

    // Handle voice config update
    if (data.voiceConfig) {
      updateData.voiceConfig = data.voiceConfig;
    }

    const agent = await VoiceAgentModel.findOneAndUpdate(
      { _id: agentId, organizationId },
      { $set: updateData },
      { new: true }
    );

    return agent;
  }

  /**
   * Delete an agent
   */
  async delete(agentId: string, organizationId: string): Promise<boolean> {
    const result = await VoiceAgentModel.deleteOne({ _id: agentId, organizationId });
    return result.deletedCount > 0;
  }

  /**
   * Add an intent to an agent
   */
  async addIntent(
    agentId: string,
    organizationId: string,
    intent: Omit<IntentDefinition, 'id'>
  ): Promise<VoiceAgentDocument | null> {
    const intentId = `intent_${agentId}_${Date.now()}`;

    const agent = await VoiceAgentModel.findOneAndUpdate(
      { _id: agentId, organizationId },
      { $push: { intents: { ...intent, id: intentId } } },
      { new: true }
    );

    return agent;
  }

  /**
   * Remove an intent from an agent
   */
  async removeIntent(
    agentId: string,
    organizationId: string,
    intentId: string
  ): Promise<VoiceAgentDocument | null> {
    const agent = await VoiceAgentModel.findOneAndUpdate(
      { _id: agentId, organizationId },
      { $pull: { intents: { id: intentId } } },
      { new: true }
    );

    return agent;
  }

  /**
   * Update agent status
   */
  async updateStatus(
    agentId: string,
    organizationId: string,
    status: VoiceAgent['status']
  ): Promise<VoiceAgentDocument | null> {
    const agent = await VoiceAgentModel.findOneAndUpdate(
      { _id: agentId, organizationId },
      { $set: { status } },
      { new: true }
    );

    return agent;
  }

  /**
   * Duplicate an agent
   */
  async duplicate(
    agentId: string,
    organizationId: string,
    newName: string
  ): Promise<VoiceAgentDocument | null> {
    const original = await VoiceAgentModel.findOne({ _id: agentId, organizationId });

    if (!original) {
      return null;
    }

    const duplicateData: CreateAgentRequest = {
      name: newName,
      description: original.description,
      type: original.type,
      language: original.language,
      voiceConfig: original.voiceConfig,
      greeting: original.greeting,
      farewell: original.farewell,
      intents: original.intents.map(i => ({
        name: i.name,
        description: i.description,
        examples: i.examples,
        action: i.action,
        parameters: i.parameters,
        requiredParameters: i.requiredParameters,
        followUp: i.followUp,
        escalationThreshold: i.escalationThreshold,
      })),
      entities: original.entities.map(e => ({
        name: e.name,
        type: e.type,
        values: e.values,
        patterns: e.patterns,
        builtinType: e.builtinType,
      })),
      contextWindow: original.contextWindow,
      escalationNumber: original.escalationNumber,
    };

    return this.create(duplicateData, organizationId);
  }

  /**
   * Get agent statistics
   */
  async getStats(agentId: string, organizationId: string): Promise<{
    totalCalls: number;
    totalSessions: number;
    averageDuration: number;
    completionRate: number;
  }> {
    const agent = await VoiceAgentModel.findOne({ _id: agentId, organizationId });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // In a real implementation, this would query Call and Session models
    // For now, return placeholder data
    return {
      totalCalls: 0,
      totalSessions: 0,
      averageDuration: 0,
      completionRate: 0,
    };
  }

  /**
   * Train an agent (placeholder for ML training)
   */
  async train(agentId: string, organizationId: string): Promise<{ status: string; message: string }> {
    const agent = await VoiceAgentModel.findOne({ _id: agentId, organizationId });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Update status to training
    agent.status = 'training';
    await agent.save();

    // In a real implementation, this would trigger an ML training job
    // For now, just update status after a delay
    setTimeout(async () => {
      await VoiceAgentModel.updateOne(
        { _id: agentId },
        { $set: { status: 'active' } }
      );
    }, 5000);

    return {
      status: 'training',
      message: 'Agent training has been initiated. It may take a few minutes to complete.',
    };
  }
}

// Singleton instance
let agentServiceInstance: AgentService | null = null;

export function getAgentService(): AgentService {
  if (!agentServiceInstance) {
    agentServiceInstance = new AgentService();
  }
  return agentServiceInstance;
}

export default AgentService;
