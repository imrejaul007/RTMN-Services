// ============================================================================
// HOJAI VOICE PLATFORM - Knowlarity Telecom Adapter
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

export class KnowlarityAdapter {
  private client: AxiosInstance;
  private apiKey: string;
  private number: string;
  private webhookUrl: string;

  constructor() {
    this.apiKey = telecomConfig.knowlarity.apiKey;
    this.number = telecomConfig.knowlarity.number;
    this.webhookUrl = telecomConfig.knowlarity.webhookUrl;

    this.client = axios.create({
      baseURL: 'https://kpn.knowlarity.com',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Make an outbound call via Knowlarity
   */
  async makeCall(request: OutboundCallRequest): Promise<{ callId: string; status: string }> {
    try {
      const response = await this.client.post(
        '/v1/user/call/makecall',
        {
          caller_number: request.from || this.number,
          callee_number: request.to,
          priority: 'high',
          record: true,
          time_limit: 3600,
          self_on_call: false,
        }
      );

      const data = response.data;
      return {
        callId: data.call_uuid || data.callId || data.call_id || '',
        status: 'initiated',
      };
    } catch (error) {
      console.error('Knowlarity makeCall error:', error);
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
        `/v1/user/call/callstatus?call_id=${callId}`
      );

      const data = response.data;
      return {
        callId: callId,
        status: this.mapCallStatus(data.status || data.call_status || ''),
        duration: data.duration ? parseInt(data.duration, 10) : undefined,
        recordingUrl: data.recording_url || data.record_url,
      };
    } catch (error) {
      console.error('Knowlarity getCallStatus error:', error);
      throw new Error(`Failed to get call status: ${(error as Error).message}`);
    }
  }

  /**
   * End an active call
   */
  async endCall(callId: string): Promise<boolean> {
    try {
      await this.client.post('/v1/user/call/disconnect', {
        call_id: callId,
      });
      return true;
    } catch (error) {
      console.error('Knowlarity endCall error:', error);
      return false;
    }
  }

  /**
   * Transfer a call
   */
  async transferCall(callId: string, toNumber: string): Promise<boolean> {
    try {
      await this.client.post('/v1/user/call/transfer', {
        call_id: callId,
        transfer_to: toNumber,
      });
      return true;
    } catch (error) {
      console.error('Knowlarity transferCall error:', error);
      return false;
    }
  }

  /**
   * Get call logs
   */
  async getCallLogs(options?: {
    startDate?: Date;
    endDate?: Date;
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
      const params: Record<string, string> = {};
      if (options?.startDate) params.start_date = options.startDate.toISOString();
      if (options?.endDate) params.end_date = options.endDate.toISOString();
      params.limit = String(options?.limit || 50);

      const response = await this.client.get('/v1/user/call/calllogs', { params });

      const calls = response.data.call_logs || response.data.calls || [];

      return calls.map((call: Record<string, unknown>) => ({
        callId: call.call_id as string || call.call_uuid as string || '',
        from: call.caller_number as string || '',
        to: call.callee_number as string || '',
        status: this.mapCallStatus(call.status as string || ''),
        duration: call.duration ? parseInt(call.duration as string, 10) : 0,
        date: new Date(call.start_time as string || call.created_at as string || Date.now()),
      }));
    } catch (error) {
      console.error('Knowlarity getCallLogs error:', error);
      return [];
    }
  }

  /**
   * Generate Knowlarity XML for voice response
   */
  generateXML(options: {
    voice?: string;
    language?: string;
  }): string {
    const { voice = 'female', language = 'en-IN' } = options;

    return `<?xml version="1.0" encoding="UTF-8"?>
<collect Mihon="1" Dtmf="1">
  <play>
    <voice langid="${language}">${voice}</voice>
  </play>
</collect>`;
  }

  /**
   * Generate XML for playing audio
   */
  generateAudioXML(audioUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<playaudio>
  <url>${audioUrl}</url>
</playaudio>`;
  }

  /**
   * Generate XML for gathering input
   */
  generateGatherXML(prompt: string, actionUrl: string, options?: {
    voice?: string;
    language?: string;
    timeout?: number;
    maxDigits?: number;
  }): string {
    const {
      voice = 'female',
      language = 'en-IN',
      timeout = 30,
      maxDigits = 15,
    } = options || {};

    return `<?xml version="1.0" encoding="UTF-8"?>
<collect Mihon="${timeout}" Dtmf="1" maxdigits="${maxDigits}" input="speech">
  <play>
    <voice langid="${language}">${voice}</voice>
    <text>${prompt}</text>
  </play>
</collect>`;
  }

  /**
   * Generate XML for conference call
   */
  generateConferenceXML(conferenceName: string, options?: {
    muted?: boolean;
    beep?: boolean;
  }): string {
    const {
      muted = false,
      beep = true,
    } = options || {};

    return `<?xml version="1.0" encoding="UTF-8"?>
<collect Mihon="1" Dtmf="1">
  <conference bridged="true" record="true" beep="${beep}" muted="${muted}">
    <name>${conferenceName}</name>
  </conference>
</collect>`;
  }

  /**
   * Parse incoming call webhook
   */
  parseWebhook(payload: WebhookPayload): InboundCallEvent {
    return {
      callId: payload.CallSid || payload.call_id || payload.id || '',
      from: payload.From || payload.caller_number || '',
      to: payload.To || payload.callee_number || '',
      direction: 'inbound',
      timestamp: new Date(),
      metadata: {
        ...payload,
        provider: 'knowlarity' as TelecomProvider,
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
      callId: payload.CallSid || payload.call_id || '',
      status: this.mapCallStatus(payload.CallStatus || payload.status || ''),
      duration: payload.CallDuration ? parseInt(payload.CallDuration as string, 10) : undefined,
      recordingUrl: payload.RecordingUrl || (payload.metadata as Record<string, unknown>)?.recording_url as string,
    };
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { provider: TelecomProvider; name: string; supported: boolean } {
    return {
      provider: 'knowlarity',
      name: 'Knowlarity',
      supported: !!(this.apiKey && this.number),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/v1/user/account/info');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Map Knowlarity status to our CallStatus
   */
  private mapCallStatus(knowlarityStatus: string): CallStatus {
    const statusMap: Record<string, CallStatus> = {
      'answered': 'completed',
      'completed': 'completed',
      'failed': 'failed',
      'busy': 'busy',
      'no-answer': 'no-answer',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'incoming': 'initiated',
    };

    return statusMap[knowlarityStatus.toLowerCase()] || 'failed';
  }
}

// Singleton instance
let knowlarityAdapterInstance: KnowlarityAdapter | null = null;

export function getKnowlarityAdapter(): KnowlarityAdapter {
  if (!knowlarityAdapterInstance) {
    knowlarityAdapterInstance = new KnowlarityAdapter();
  }
  return knowlarityAdapterInstance;
}

export default KnowlarityAdapter;
