// ============================================================================
// HOJAI VOICE PLATFORM - Call Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Call,
  CallDocument,
  CallStatus,
  CallDirection,
  CreateCallRequest,
  OutboundCallRequest,
  TelecomProvider,
} from '../types';
import { CallModel } from '../models/Call';
import { getTelecomFactory } from '../telecom';

/**
 * Call Service - Handles voice call management
 */
export class CallService {
  private telecomFactory = getTelecomFactory();

  /**
   * Initiate an outbound call
   */
  async initiateCall(
    request: CreateCallRequest,
    organizationId: string,
    provider?: TelecomProvider
  ): Promise<CallDocument> {
    const callId = uuidv4();

    // Create call record
    const call = await CallModel.create({
      _id: callId,
      agentId: request.agentId,
      organizationId,
      direction: 'outbound',
      status: 'initiated',
      from: request.from || '',
      to: request.to,
      metadata: request.metadata || {},
    });

    try {
      // Make the actual call via telecom provider
      const outboundRequest: OutboundCallRequest = {
        to: request.to,
        from: request.from,
        agentId: request.agentId,
        metadata: { callId, organizationId },
      };

      const result = await this.telecomFactory.makeCall(outboundRequest, provider);

      // Update call with telecom info
      call.telecomProvider = provider || 'twilio';
      call.telecomCallId = result.callId;
      await call.save();

      return call;
    } catch (error) {
      // Update call status to failed
      call.status = 'failed';
      call.metadata = {
        ...call.metadata,
        error: (error as Error).message,
      };
      await call.save();

      throw error;
    }
  }

  /**
   * Create inbound call record (from webhook)
   */
  async createInboundCall(
    callData: {
      callId: string;
      from: string;
      to: string;
      agentId: string;
      provider: TelecomProvider;
      metadata?: Record<string, unknown>;
    },
    organizationId: string
  ): Promise<CallDocument> {
    const call = await CallModel.create({
      _id: callData.callId,
      agentId: callData.agentId,
      organizationId,
      direction: 'inbound',
      status: 'ringing',
      from: callData.from,
      to: callData.to,
      telecomProvider: callData.provider,
      telecomCallId: callData.callId,
      metadata: callData.metadata || {},
    });

    return call;
  }

  /**
   * Get call by ID
   */
  async getById(callId: string, organizationId: string): Promise<CallDocument | null> {
    return CallModel.findOne({ _id: callId, organizationId });
  }

  /**
   * List calls for an organization
   */
  async list(
    organizationId: string,
    options?: {
      agentId?: string;
      status?: CallStatus;
      direction?: CallDirection;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ calls: CallDocument[]; total: number }> {
    const query: Record<string, unknown> = { organizationId };

    if (options?.agentId) {
      query.agentId = options.agentId;
    }
    if (options?.status) {
      query.status = options.status;
    }
    if (options?.direction) {
      query.direction = options.direction;
    }
    if (options?.startDate || options?.endDate) {
      query.createdAt = {};
      if (options.startDate) {
        (query.createdAt as Record<string, Date>).$gte = options.startDate;
      }
      if (options.endDate) {
        (query.createdAt as Record<string, Date>).$lte = options.endDate;
      }
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [calls, total] = await Promise.all([
      CallModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CallModel.countDocuments(query),
    ]);

    return { calls, total };
  }

  /**
   * Update call status
   */
  async updateStatus(
    callId: string,
    organizationId: string,
    status: CallStatus,
    additionalData?: {
      startTime?: Date;
      endTime?: Date;
      duration?: number;
      sentiment?: Call['sentiment'];
    }
  ): Promise<CallDocument | null> {
    const updateData: Record<string, unknown> = { status };

    if (additionalData) {
      if (additionalData.startTime) {
        updateData.startTime = additionalData.startTime;
      }
      if (additionalData.endTime) {
        updateData.endTime = additionalData.endTime;
      }
      if (additionalData.duration !== undefined) {
        updateData.duration = additionalData.duration;
      }
      if (additionalData.sentiment) {
        updateData.sentiment = additionalData.sentiment;
      }
    }

    const call = await CallModel.findOneAndUpdate(
      { _id: callId, organizationId },
      { $set: updateData },
      { new: true }
    );

    return call;
  }

  /**
   * Mark call as answered
   */
  async markAnswered(callId: string, organizationId: string): Promise<CallDocument | null> {
    return this.updateStatus(callId, organizationId, 'in-progress', {
      startTime: new Date(),
    });
  }

  /**
   * Complete a call
   */
  async complete(
    callId: string,
    organizationId: string,
    outcome?: Call['outcome']
  ): Promise<CallDocument | null> {
    const call = await CallModel.findOne({ _id: callId, organizationId });

    if (!call) return null;

    const endTime = new Date();
    const duration = call.startTime
      ? Math.floor((endTime.getTime() - new Date(call.startTime).getTime()) / 1000)
      : undefined;

    const updateData: Record<string, unknown> = {
      status: 'completed',
      endTime,
      outcome: outcome || 'completed',
    };

    if (duration !== undefined) {
      updateData.duration = duration;
    }

    const updatedCall = await CallModel.findOneAndUpdate(
      { _id: callId, organizationId },
      { $set: updateData },
      { new: true }
    );

    return updatedCall;
  }

  /**
   * Transfer a call
   */
  async transfer(
    callId: string,
    organizationId: string,
    transferTo: string
  ): Promise<{ success: boolean; message: string }> {
    const call = await CallModel.findOne({ _id: callId, organizationId });

    if (!call) {
      return { success: false, message: 'Call not found' };
    }

    if (!call.telecomProvider) {
      return { success: false, message: 'Telecom provider not configured' };
    }

    try {
      await this.telecomFactory.transferCall(call.telecomCallId || callId, transferTo, call.telecomProvider);

      // Update call record
      call.status = 'transferred';
      call.transferTo = transferTo;
      await call.save();

      return {
        success: true,
        message: `Call transferred to ${transferTo}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Transfer failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * End a call
   */
  async endCall(
    callId: string,
    organizationId: string,
    reason?: string
  ): Promise<CallDocument | null> {
    const call = await CallModel.findOne({ _id: callId, organizationId });

    if (!call) return null;

    // End via telecom
    if (call.telecomProvider && call.telecomCallId) {
      try {
        await this.telecomFactory.endCall(call.telecomCallId, call.telecomProvider);
      } catch (error) {
        console.error('Error ending telecom call:', error);
      }
    }

    // Complete the call record
    return this.complete(callId, organizationId, reason === 'voicemail' ? 'voicemail' : undefined);
  }

  /**
   * Get call statistics
   */
  async getStats(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCalls: number;
    completedCalls: number;
    failedCalls: number;
    averageDuration: number;
    completionRate: number;
    transferRate: number;
    inboundCalls: number;
    outboundCalls: number;
  }> {
    return CallModel.getCallStats(organizationId, startDate, endDate);
  }

  /**
   * Get calls by agent
   */
  async getByAgent(
    agentId: string,
    organizationId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ calls: CallDocument[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const query = { agentId, organizationId };

    const [calls, total] = await Promise.all([
      CallModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CallModel.countDocuments(query),
    ]);

    return { calls, total };
  }

  /**
   * Get recent calls
   */
  async getRecent(
    organizationId: string,
    limit: number = 10
  ): Promise<CallDocument[]> {
    return CallModel.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

// Singleton instance
let callServiceInstance: CallService | null = null;

export function getCallService(): CallService {
  if (!callServiceInstance) {
    callServiceInstance = new CallService();
  }
  return callServiceInstance;
}

export default CallService;
