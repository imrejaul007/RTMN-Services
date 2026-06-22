// ============================================================================
// HOJAI VOICE PLATFORM - Exotel Telecom Adapter
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import { telecomConfig } from '../config';
import {
  TelecomProvider,
  OutboundCallRequest,
  InboundCallEvent,
  WebhookPayload,
  CallStatus,
} from '../types';

export class ExotelAdapter {
  private client: AxiosInstance;
  private apiKey: string;
  private apiToken: string;
  private accountSid: string;
  private webhookUrl: string;

  constructor() {
    this.apiKey = telecomConfig.exotel.apiKey;
    this.apiToken = telecomConfig.exotel.apiToken;
    this.accountSid = telecomConfig.exotel.accountSid;
    this.webhookUrl = telecomConfig.exotel.webhookUrl;

    this.client = axios.create({
      baseURL: `https://${this.apiKey}:${this.apiToken}@twilix.exotel.in`,
      timeout: 30000,
    });
  }

  /**
   * Make an outbound call via Exotel
   */
  async makeCall(request: OutboundCallRequest): Promise<{ callId: string; status: string }> {
    try {
      const response = await this.client.post(
        `/v1/Accounts/${this.accountSid}/Calls/connect.json`,
        {
          From: {
            phone_number_id: this.accountSid,
          },
          To: request.to,
          CallerId: request.from || '',
          StatusCallback: `${this.webhookUrl}/exotel/status`,
          AmdCallback: `${this.webhookUrl}/exotel/amd`,
        }
      );

      const data = response.data;
      return {
        callId: data.CallSid || data.Call?.Sid || '',
        status: data.Status || 'initiated',
      };
    } catch (error) {
      console.error('Exotel makeCall error:', error);
      throw new Error(`Failed to make call: ${(error as Error).message}`);
    }
  }

  /**
   * Get call details
   */
  async getCallStatus(callId: string): Promise<{
    callId: string;
    status: CallStatus;
    duration?: number;
    recordingUrl?: string;
  }> {
    try {
      const response = await this.client.get(
        `/v1/Accounts/${this.accountSid}/Calls/${callId}.json`
      );

      const data = response.data;
      const call = data.Call || data;

      return {
        callId: call.Sid || callId,
        status: this.mapCallStatus(call.Status || call.Status),
        duration: call.Duration ? parseInt(call.Duration, 10) : undefined,
        recordingUrl: call.RecordingUrl,
      };
    } catch (error) {
      console.error('Exotel getCallStatus error:', error);
      throw new Error(`Failed to get call status: ${(error as Error).message}`);
    }
  }

  /**
   * End an active call
   */
  async endCall(callId: string): Promise<boolean> {
    try {
      await this.client.post(
        `/v1/Accounts/${this.accountSid}/Calls/${callId}/status.json`,
        { Status: 'completed' }
      );
      return true;
    } catch (error) {
      console.error('Exotel endCall error:', error);
      return false;
    }
  }

  /**
   * Transfer a call
   */
  async transferCall(callId: string, toNumber: string): Promise<boolean> {
    try {
      await this.client.post(
        `/v1/Accounts/${this.accountSid}/Calls/${callId}/forward.json`,
        { To: toNumber }
      );
      return true;
    } catch (error) {
      console.error('Exotel transferCall error:', error);
      return false;
    }
  }

  /**
   * Get call logs
   */
  async getCallLogs(options?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    limit?: number;
  }): Promise<Array<{
    callId: string;
    from: string;
    to: string;
    status: CallStatus;
    duration: number;
    date: Date;
  }>> {
    try {
      const params = new URLSearchParams();
      if (options?.startDate) params.append('Dategte', options.startDate.toISOString());
      if (options?.endDate) params.append('Datelte', options.endDate.toISOString());
      if (options?.status) params.append('Status', options.status);
      params.append('Limit', String(options?.limit || 50));

      const response = await this.client.get(
        `/v1/Accounts/${this.accountSid}/Calls.json?${params.toString()}`
      );

      const calls = response.data.calls || [];

      return calls.map((call: Record<string, unknown>) => ({
        callId: call.Sid as string || '',
        from: call.From as string || '',
        to: call.To as string || '',
        status: this.mapCallStatus(call.Status as string || ''),
        duration: call.Duration ? parseInt(call.Duration as string, 10) : 0,
        date: new Date(call.DateCreated as string || Date.now()),
      }));
    } catch (error) {
      console.error('Exotel getCallLogs error:', error);
      return [];
    }
  }

  /**
   * Generate Exotel XML for voice response
   */
  generateXML(options: {
    voice?: 'man' | 'woman';
    language?: string;
  }): string {
    const { voice = 'woman', language = 'en-IN' } = options;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play digits="1"></Play>
  <Say voice="${voice}" language="${language}"></Say>
</Response>`;
  }

  /**
   * Generate XML for playing audio
   */
  generateAudioXML(audioUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
</Response>`;
  }

  /**
   * Generate XML for gathering speech/DTMF input
   */
  generateGatherXML(prompt: string, actionUrl: string, options?: {
    voice?: string;
    language?: string;
    timeout?: number;
    maxDigits?: number;
  }): string {
    const {
      voice = 'woman',
      language = 'en-IN',
      timeout = 30,
      maxDigits = 15,
    } = options || {};

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather requestUrl="${actionUrl}" method="POST" timeout="${timeout}" numDigits="${maxDigits}">
    <Say voice="${voice}" language="${language}">${prompt}</Say>
  </Gather>
  <Say voice="${voice}" language="${language}">We didn't receive any input. Goodbye!</Say>
  <Hangup></Hangup>
</Response>`;
  }

  /**
   * Generate XML for conference call
   */
  generateConferenceXML(conferenceName: string, options?: {
    muted?: boolean;
    beep?: boolean;
    startOnEnter?: boolean;
  }): string {
    const {
      muted = false,
      beep = true,
      startOnEnter = true,
    } = options || {};

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Conference
    name="${conferenceName}"
    muted="${muted}"
    beep="${beep}"
    startConferenceOnEnter="${startOnEnter}"
  ></Conference>
</Response>`;
  }

  /**
   * Parse incoming call webhook
   */
  parseWebhook(payload: WebhookPayload): InboundCallEvent {
    return {
      callId: payload.CallSid || payload.id || '',
      from: payload.From || payload.FromNumber || '',
      to: payload.To || payload.ToNumber || '',
      direction: 'inbound',
      timestamp: new Date(),
      metadata: {
        ...payload,
        provider: 'exotel' as TelecomProvider,
      },
    };
  }

  /**
   * Parse call status webhook
   */
  parseStatusWebhook(payload: WebhookPayload): {
    callId: string;
    status: CallStatus;
    duration?: number;
    recordingUrl?: string;
  } {
    return {
      callId: payload.CallSid || '',
      status: this.mapCallStatus(payload.CallStatus || ''),
      duration: payload.CallDuration ? parseInt(payload.CallDuration as string, 10) : undefined,
      recordingUrl: payload.RecordingUrl,
    };
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { provider: TelecomProvider; name: string; supported: boolean } {
    return {
      provider: 'exotel',
      name: 'Exotel',
      supported: !!(this.apiKey && this.apiToken && this.accountSid),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get(`/v1/Accounts/${this.accountSid}/Balance.json`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Map Exotel status to our CallStatus
   */
  private mapCallStatus(exotelStatus: string): CallStatus {
    const statusMap: Record<string, CallStatus> = {
      'active': 'in-progress',
      'completed': 'completed',
      'failed': 'failed',
      'busy': 'busy',
      'no-answer': 'no-answer',
      'pending': 'initiated',
      'in-progress': 'in-progress',
    };

    return statusMap[exotelStatus.toLowerCase()] || 'failed';
  }
}

// Singleton instance
let exotelAdapterInstance: ExotelAdapter | null = null;

export function getExotelAdapter(): ExotelAdapter {
  if (!exotelAdapterInstance) {
    exotelAdapterInstance = new ExotelAdapter();
  }
  return exotelAdapterInstance;
}

export default ExotelAdapter;
