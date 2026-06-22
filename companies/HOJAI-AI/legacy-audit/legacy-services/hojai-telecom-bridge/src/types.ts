// Telecom Provider Types

export interface TelephonyConfig {
  provider: 'twilio' | 'exotel' | 'knowlarity' | 'ozonetel';
  apiKey: string;
  apiSecret: string;
  callerId: string;
}

export interface CallRequest {
  to: string;
  from?: string;
  agentId?: string;
  customerId?: string;
  context?: Record<string, any>;
  language?: string;
}

export interface CallResponse {
  callId: string;
  status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed';
  duration?: number;
  cost?: number;
}

export interface IVRFlow {
  id: string;
  name: string;
  steps: IVRStep[];
}

export interface IVRStep {
  id: string;
  type: 'greet' | 'menu' | 'collect' | 'transfer' | 'action' | 'hangup';
  config: Record<string, any>;
  nextStep?: string;
}

export interface CallEvent {
  callId: string;
  event: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed';
  timestamp: Date;
  duration?: number;
  recordingUrl?: string;
  transcript?: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'outbound' | 'missed_call' | 'promotional';
  phoneNumbers: string[];
  ivrFlowId?: string;
  schedule?: Date;
  status: 'draft' | 'scheduled' | 'running' | 'completed';
}

export interface CallMetrics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  totalCost: number;
  conversionRate: number;
}
