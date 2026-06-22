/**
 * Knowlarity Integration Service
 *
 * Another major India-focused telephony platform
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class KnowlarityService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.KNOWLARITY_API_KEY || '';
    this.baseUrl = 'https://kpiwidgets.qikpod.com';
  }

  /**
   * Make an outbound call
   */
  async makeCall(to: string, from: string, agentId: string): Promise<{ callId: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/call/makecall`,
        {
          agent_id: agentId,
          to_number: to,
          from_number: from
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { callId: response.data.call_id || uuidv4() };
    } catch (error) {
      console.error('[Knowlarity] Make call failed:', error);
      throw error;
    }
  }

  /**
   * Initiate bulk calling
   */
  async bulkCall(
    phoneNumbers: string[],
    from: string,
    agentId: string
  ): Promise<{ campaignId: string; calls: number }> {
    try {
      const campaignId = uuidv4();

      const promises = phoneNumbers.map(phone =>
        this.makeCall(phone, from, agentId)
      );

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      return { campaignId, calls: successCount };
    } catch (error) {
      console.error('[Knowlarity] Bulk call failed:', error);
      throw error;
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callId: string): Promise<{
    status: string;
    duration?: number;
    recordingUrl?: string;
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/call/status/${callId}`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        }
      );

      return {
        status: response.data.status || 'unknown',
        duration: response.data.duration,
        recordingUrl: response.data.recording_url
      };
    } catch (error) {
      console.error('[Knowlarity] Get status failed:', error);
      return { status: 'error' };
    }
  }

  /**
   * Disconnect call
   */
  async disconnect(callId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/v1/call/disconnect/${callId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('[Knowlarity] Disconnect failed:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const knowlarityService = new KnowlarityService();
