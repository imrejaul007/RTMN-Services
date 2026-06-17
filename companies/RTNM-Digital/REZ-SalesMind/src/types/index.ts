// REZ SalesMind Type Definitions

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  score?: number;
  source?: string;
  owner?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'multi-channel';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';
  channels: string[];
  targetAudience: string[];
  scheduledStart?: Date;
  scheduledEnd?: Date;
  stats?: CampaignStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  converted: number;
  failed: number;
}

export interface Call {
  id: string;
  leadId: string;
  direction: 'inbound' | 'outbound';
  duration: number;
  status: 'completed' | 'missed' | 'voicemail' | 'failed';
  recordingUrl?: string;
  transcription?: string;
  createdAt: Date;
}

export interface Voicemail {
  id: string;
  callId: string;
  leadId: string;
  duration: number;
  audioUrl?: string;
  transcription?: string;
  detectedAt: Date;
}

export interface Transcription {
  id: string;
  callId: string;
  text: string;
  duration: number;
  speakerCount?: number;
  segments?: TranscriptionSegment[];
  createdAt: Date;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  speaker?: string;
  text: string;
  confidence: number;
}

export interface SDRWorkflow {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentStep: string;
  progress: number;
  prospectsProcessed: number;
  emailsSent: number;
  responsesReceived: number;
  meetingsBooked: number;
  startedAt?: Date;
  completedAt?: Date;
  logs: WorkflowLog[];
}

export interface WorkflowLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: any;
}

export interface AIRequest {
  model: 'claude' | 'gpt4' | 'auto';
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  context?: Record<string, any>;
}

export interface AIResponse {
  model: string;
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number;
}

export interface Email {
  id: string;
  leadId: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'delivered' | 'opened' | 'replied' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  repliedAt?: Date;
}

export interface CRMContact {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  hubspotId?: string;
}

export interface CRMDeal {
  id?: string;
  dealName: string;
  amount?: number;
  stage: string;
  closeDate?: Date;
  contactId?: string;
  hubspotId?: string;
}

export interface CRMActivity {
  type: 'call' | 'email' | 'meeting' | 'note';
  contactId: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SyncStatus {
  lastSyncAt?: Date;
  status: 'idle' | 'syncing' | 'success' | 'error';
  recordsSynced: number;
  errors: number;
  lastError?: string;
}
