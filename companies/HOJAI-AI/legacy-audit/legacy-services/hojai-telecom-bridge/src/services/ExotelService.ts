/**
 * Exotel Integration Service
 *
 * India's leading cloud telephony platform
 * Supports: Inbound, Outbound, IVR, Missed Calls, Campaigns
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class ExotelService {
  private apiKey: string;
  private apiToken: string;
  private subdomain: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.EXOTEL_API_KEY || '';
    this.apiToken = process.env.EXOTEL_API_TOKEN || '';
    this.subdomain = process.env.EXOTEL_SUBDOMAIN || '';
    this.baseUrl = `https://${this.apiKey}:${this.apiToken}@api.exotel.com`;
  }

  /**
   * Make an outbound call
   */
  async makeCall(from: string, to: string, callbackUrl: string): Promise<{ callId: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/Accounts/${this.subdomain}/Calls/connect.json`,
        {
          From: { type: 'phone', phone_number: from },
          To: { type: 'phone', phone_number: to },
          CallbackUrl: callbackUrl,
          StatusCallback: callbackUrl
        }
      );

      return { callId: response.data.Call?.Sid || uuidv4() };
    } catch (error) {
      console.error('[Exotel] Make call failed:', error);
      throw error;
    }
  }

  /**
   * Send SMS
   */
  async sendSms(from: string, to: string, body: string): Promise<{ messageId: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/Accounts/${this.subdomain}/Sms/send.json`,
        {
          From: { type: 'phone', phone_number: from },
          To: { type: 'phone', phone_number: to },
          Body: body
        }
      );

      return { messageId: response.data.SmsSid || uuidv4() };
    } catch (error) {
      console.error('[Exotel] Send SMS failed:', error);
      throw error;
    }
  }

  /**
   * Get call details
   */
  async getCall(callId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/Accounts/${this.subdomain}/Calls/${callId}.json`
      );
      return response.data.Call;
    } catch (error) {
      console.error('[Exotel] Get call failed:', error);
      throw error;
    }
  }

  /**
   * Hangup a call
   */
  async hangup(callId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/v1/Accounts/${this.subdomain}/Calls/${callId}/hangup.json`
      );
    } catch (error) {
      console.error('[Exotel] Hangup failed:', error);
      throw error;
    }
  }

  /**
   * Transfer call to another number
   */
  async transfer(callId: string, to: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/v1/Accounts/${this.subdomain}/Calls/${callId}/forward.json`,
        {
          To: { type: 'phone', phone_number: to }
        }
      );
    } catch (error) {
      console.error('[Exotel] Transfer failed:', error);
      throw error;
    }
  }

  /**
   * Get call recordings
   */
  async getRecordings(callId: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/Accounts/${this.subdomain}/Calls/${callId}/Recordings.json`
      );
      return response.data.Recordings || [];
    } catch (error) {
      console.error('[Exotel] Get recordings failed:', error);
      return [];
    }
  }

  /**
   * Create missed call campaign
   */
  async createMissedCallCampaign(
    phoneNumbers: string[],
    callerId: string
  ): Promise<{ campaignId: string }> {
    try {
      const campaignId = uuidv4();

      // Make simultaneous calls
      const promises = phoneNumbers.map(phone =>
        this.makeCall(callerId, phone, '')
      );

      await Promise.all(promises);

      return { campaignId };
    } catch (error) {
      console.error('[Exotel] Create campaign failed:', error);
      throw error;
    }
  }

  /**
   * Get call logs
   */
  async getCallLogs(options: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  } = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (options.dateFrom) params.append('DateFrom', options.dateFrom);
      if (options.dateTo) params.append('DateTo', options.dateTo);
      if (options.status) params.append('Status', options.status);

      const response = await axios.get(
        `${this.baseUrl}/v1/Accounts/${this.subdomain}/Calls.json?${params}`
      );

      return response.data.Calls || [];
    } catch (error) {
      console.error('[Exotel] Get call logs failed:', error);
      return [];
    }
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.apiToken && this.subdomain);
  }
}

export const exotelService = new ExotelService();
