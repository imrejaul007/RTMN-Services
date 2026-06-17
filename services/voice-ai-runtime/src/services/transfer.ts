import axios from 'axios';
import winston from 'winston';
import type { TransferRequest, VoiceSession, TicketPayload, CustomerProfileUpdate } from '../types.js';

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

export interface TransferResult {
  success: boolean;
  transferId: string;
  targetType: string;
  targetId: string;
  waitTime?: number;
  message?: string;
}

export interface IntegrationResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class TransferService {
  private ticketEngineUrl: string;
  private customerTwinUrl: string;
  private agentCopilotUrl: string;
  private memoryOsUrl: string;
  private agentQueue: Map<string, string[]> = new Map();

  constructor() {
    this.ticketEngineUrl = process.env.TICKET_ENGINE_URL || 'http://localhost:4300';
    this.customerTwinUrl = process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017';
    this.agentCopilotUrl = process.env.AGENT_COPILOT_URL || 'http://localhost:4765';
    this.memoryOsUrl = process.env.MEMORY_OS_URL || 'http://localhost:4703';

    // Initialize agent queues
    this.agentQueue.set('general', ['agent-1', 'agent-2', 'agent-3']);
    this.agentQueue.set('sales', ['sales-1', 'sales-2']);
    this.agentQueue.set('support', ['support-1', 'support-2', 'support-3']);
    this.agentQueue.set('accounting', ['accounting-1', 'accounting-2']);

    logger.info('Transfer Service initialized', {
      ticketEngine: this.ticketEngineUrl,
      customerTwin: this.customerTwinUrl,
      agentCopilot: this.agentCopilotUrl,
    });
  }

  async transferToAgent(request: TransferRequest, session: VoiceSession): Promise<TransferResult> {
    const transferId = `TF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Transferring call to agent', {
      transferId,
      sessionId: request.sessionId,
      targetType: request.targetType,
      targetId: request.targetId,
    });

    try {
      // Get available agent from queue
      const queue = this.agentQueue.get(request.targetId) || ['agent-1'];
      const availableAgent = queue[0];

      // Create ticket with transfer info
      await this.createTransferTicket(session, {
        transferId,
        targetType: request.targetType,
        targetId: request.targetId,
        agentId: availableAgent,
        reason: request.reason,
        priority: request.priority,
      });

      // Update customer profile
      await this.updateCustomerProfile(session, {
        lastTransfer: transferId,
        lastQueue: request.targetId,
        callCount: (session.metadata.callCount || 0) + 1,
      });

      // Add call summary to memory
      await this.saveToMemory(session);

      logger.info('Transfer completed successfully', {
        transferId,
        agentId: availableAgent,
      });

      return {
        success: true,
        transferId,
        targetType: request.targetType,
        targetId: availableAgent,
        waitTime: Math.floor(Math.random() * 30) + 10, // Simulated wait time
        message: `Connecting to ${request.targetId} queue`,
      };
    } catch (error) {
      logger.error('Transfer failed', { error, transferId });
      return {
        success: false,
        transferId,
        targetType: request.targetType,
        targetId: request.targetId,
        message: 'Transfer failed - please try again',
      };
    }
  }

  async createTransferTicket(session: VoiceSession, transferInfo: {
    transferId: string;
    targetType: string;
    targetId: string;
    agentId: string;
    reason?: string;
    priority: number;
  }): Promise<IntegrationResult> {
    const payload: TicketPayload = {
      customerId: session.customerId,
      customerPhone: session.customerPhone,
      sessionId: session.sessionId,
      transcript: session.transcript,
      summary: this.generateSummary(session.transcript),
      priority: this.mapPriority(transferInfo.priority),
      category: `transfer_${transferInfo.targetId}`,
      metadata: {
        transferId: transferInfo.transferId,
        agentId: transferInfo.agentId,
        reason: transferInfo.reason,
        queue: transferInfo.targetId,
        duration: session.duration,
      },
    };

    try {
      const response = await axios.post(
        `${this.ticketEngineUrl}/api/tickets`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      logger.debug('Ticket created for transfer', {
        transferId: transferInfo.transferId,
        ticketId: response.data?.id,
      });

      return { success: true, data: response.data };
    } catch (error: any) {
      logger.warn('Ticket creation failed (ticket engine may be unavailable)', {
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  async updateCustomerProfile(session: VoiceSession, updates: {
    lastTransfer?: string;
    lastQueue?: string;
    callCount?: number;
    preferences?: Record<string, any>;
  }): Promise<IntegrationResult> {
    const payload: CustomerProfileUpdate = {
      customerId: session.customerId,
      phone: session.customerPhone,
      lastCallSession: session.sessionId,
      callCount: updates.callCount,
      preferences: updates.preferences,
    };

    try {
      const response = await axios.patch(
        `${this.customerTwinUrl}/api/customers/phone/${session.customerPhone}`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      logger.debug('Customer profile updated', {
        customerId: session.customerId,
        updates: Object.keys(updates),
      });

      return { success: true, data: response.data };
    } catch (error: any) {
      logger.warn('Customer profile update failed (customer-twin may be unavailable)', {
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  async getAgentSuggestions(session: VoiceSession): Promise<any[]> {
    try {
      const response = await axios.post(
        `${this.agentCopilotUrl}/api/suggestions`,
        {
          context: {
            customerId: session.customerId,
            sessionId: session.sessionId,
            transcript: session.transcript,
            ivrState: session.ivrState,
          },
          type: 'voice_call',
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      return response.data?.suggestions || [];
    } catch (error: any) {
      logger.debug('Agent suggestions unavailable', { error: error.message });
      return [];
    }
  }

  async saveToMemory(session: VoiceSession): Promise<IntegrationResult> {
    const memoryEntry = {
      type: 'voice_call',
      sessionId: session.sessionId,
      customerId: session.customerId,
      phone: session.customerPhone,
      transcript: session.transcript,
      duration: session.duration,
      timestamp: session.startTime,
      summary: this.generateSummary(session.transcript),
    };

    try {
      await axios.post(
        `${this.memoryOsUrl}/api/memories`,
        memoryEntry,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      return { success: true };
    } catch (error: any) {
      logger.debug('Memory save failed (memory-os may be unavailable)', {
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  private generateSummary(transcript: VoiceSession['transcript']): string {
    if (transcript.length === 0) return 'No conversation recorded';

    const userMessages = transcript
      .filter(t => t.role === 'user')
      .map(t => t.text)
      .join(' ');

    return userMessages.length > 200
      ? userMessages.substring(0, 200) + '...'
      : userMessages;
  }

  private mapPriority(priority: number): TicketPayload['priority'] {
    if (priority >= 4) return 'urgent';
    if (priority >= 3) return 'high';
    if (priority >= 2) return 'medium';
    return 'low';
  }

  // Queue management
  addAgentToQueue(queueId: string, agentId: string): void {
    const queue = this.agentQueue.get(queueId) || [];
    if (!queue.includes(agentId)) {
      queue.push(agentId);
      this.agentQueue.set(queueId, queue);
    }
  }

  removeAgentFromQueue(queueId: string, agentId: string): void {
    const queue = this.agentQueue.get(queueId) || [];
    const index = queue.indexOf(agentId);
    if (index > -1) {
      queue.splice(index, 1);
      this.agentQueue.set(queueId, queue);
    }
  }

  getQueueStatus(): Record<string, { agents: string[]; count: number }> {
    const status: Record<string, { agents: string[]; count: number }> = {};
    for (const [queueId, agents] of this.agentQueue.entries()) {
      status[queueId] = { agents, count: agents.length };
    }
    return status;
  }
}

export const transferService = new TransferService();
