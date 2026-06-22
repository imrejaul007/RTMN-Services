/**
 * Unified Telecom Bridge Service
 *
 * Abstracts Twilio, Exotel, Knowlarity into single interface
 */

import { v4 as uuidv4 } from 'uuid';
import { exotelService } from './ExotelService';
import { knowlarityService } from './KnowlarityService';
import type { CallRequest, CallResponse, Campaign, CallMetrics } from '../types.js';

export type TelecomProvider = 'twilio' | 'exotel' | 'knowlarity' | 'ozonetel';

export class TelecomBridge {
  private activeProvider: TelecomProvider;
  private twilioClient: any = null;

  constructor() {
    this.activeProvider = (process.env.TELECOM_PROVIDER as TelecomProvider) || 'twilio';
    this.initTwilio();
  }

  private async initTwilio() {
    if (this.activeProvider === 'twilio') {
      try {
        const twilio = (await import('twilio')).default;
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
      } catch (error) {
        console.warn('[Telecom] Twilio not configured');
      }
    }
  }

  /**
   * Make outbound call
   */
  async makeCall(request: CallRequest): Promise<CallResponse> {
    const callId = uuidv4();

    try {
      switch (this.activeProvider) {
        case 'twilio':
          return await this.makeTwilioCall(request);
        case 'exotel':
          return await this.makeExotelCall(request);
        case 'knowlarity':
          return await this.makeKnowlarityCall(request);
        default:
          return await this.makeTwilioCall(request);
      }
    } catch (error) {
      console.error('[Telecom] Make call failed:', error);
      return { callId, status: 'failed' };
    }
  }

  private async makeTwilioCall(request: CallRequest): Promise<CallResponse> {
    if (!this.twilioClient) {
      return { callId: uuidv4(), status: 'failed' };
    }

    const call = await this.twilioClient.calls.create({
      to: request.to,
      from: request.from || process.env.TWILIO_PHONE_NUMBER,
      url: request.context?.twimlUrl || 'http://demo.twilio.com/docs/voice.xml'
    });

    return {
      callId: call.sid,
      status: 'initiated'
    };
  }

  private async makeExotelCall(request: CallRequest): Promise<CallResponse> {
    const result = await exotelService.makeCall(
      request.from || process.env.EXOTEL_CALLER_ID || '',
      request.to,
      request.context?.callbackUrl || ''
    );

    return {
      callId: result.callId,
      status: 'initiated'
    };
  }

  private async makeKnowlarityCall(request: CallRequest): Promise<CallResponse> {
    const result = await knowlarityService.makeCall(
      request.to,
      request.from || '',
      request.agentId || ''
    );

    return {
      callId: result.callId,
      status: 'initiated'
    };
  }

  /**
   * Get call metrics
   */
  async getMetrics(options: {
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): Promise<CallMetrics> {
    const calls = await exotelService.getCallLogs({
      dateFrom: options.dateFrom?.toISOString(),
      dateTo: options.dateTo?.toISOString()
    });

    const totalCalls = calls.length;
    const answeredCalls = calls.filter(c => c.Status === 'completed').length;
    const missedCalls = calls.filter(c => c.Status === 'missed').length;
    const totalDuration = calls.reduce((sum, c) => sum + (c.Duration || 0), 0);

    return {
      totalCalls,
      answeredCalls,
      missedCalls,
      avgDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
      totalCost: 0,
      conversionRate: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0
    };
  }

  /**
   * Create outbound campaign
   */
  async createCampaign(campaign: Omit<Campaign, 'id'>): Promise<Campaign> {
    const id = uuidv4();

    switch (this.activeProvider) {
      case 'exotel':
        await exotelService.createMissedCallCampaign(
          campaign.phoneNumbers,
          process.env.EXOTEL_CALLER_ID || ''
        );
        break;
      case 'knowlarity':
        await knowlarityService.bulkCall(
          campaign.phoneNumbers,
          process.env.KNOWLARITY_CALLER_ID || '',
          ''
        );
        break;
    }

    return { ...campaign, id, status: 'running' };
  }

  getProvider(): TelecomProvider {
    return this.activeProvider;
  }
}

export const telecomBridge = new TelecomBridge();
