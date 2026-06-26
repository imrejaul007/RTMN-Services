/**
 * Observation Types
 * Event capture, observation services, and learning integration
 */

/**
 * Event source types
 */
export type EventSource =
  | 'email'
  | 'slack'
  | 'crm'
  | 'task'
  | 'calendar'
  | 'document'
  | 'approval'
  | 'meeting'
  | 'call'
  | 'chat';

/**
 * Event action type
 */
export type EventActionType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'sent'
  | 'received'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'failed';

/**
 * Event attachment
 */
export interface EventAttachment {
  id: string;
  type: 'file' | 'image' | 'link';
  name: string;
  url?: string;
  size?: number;
}

/**
 * Event participant
 */
export interface EventParticipant {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

/**
 * Event content
 */
export interface EventContent {
  text?: string;
  summary?: string;
  attachments?: EventAttachment[];
  metadata?: Record<string, any>;
}

/**
 * Observed action
 */
export interface ObservedAction {
  id: string;
  employeeId: string;
  type: EventActionType;
  target: string;
  timestamp: string;
  duration?: number;            // milliseconds
  outcome: 'success' | 'failure';
  result?: any;
  error?: string;
  context?: Record<string, any>;
}

/**
 * Primary Observed Event interface
 */
export interface ObservedEvent {
  id: string;
  employeeId: string;
  source: EventSource;
  type: string;
  timestamp: string;
  context: {
    subject?: string;
    participants?: EventParticipant[];
    channel?: string;
    tool?: string;
    documentType?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
  };
  content: EventContent;
  actions: ObservedAction[];
  outcome?: string;
  tagged: boolean;
  processed: boolean;
  extractedPatterns?: string[];
  linkedKnowledge?: string[];
  createdAt: string;
}

/**
 * Event subscription
 */
export interface EventSubscription {
  id: string;
  employeeId: string;
  twinId?: string;
  sources: EventSource[];
  filters?: {
    include?: string[];
    exclude?: string[];
    minConfidence?: number;
  };
  enabled: boolean;
  createdAt: string;
  lastEventAt?: string;
}

/**
 * Event stream
 */
export interface EventStream {
  id: string;
  employeeId: string;
  name: string;
  sources: EventSource[];
  bufferSize: number;
  events: ObservedEvent[];
  createdAt: string;
  lastUpdated: string;
}

/**
 * Observer configuration
 */
export interface ObserverConfig {
  id: string;
  name: string;
  source: EventSource;
  enabled: boolean;
  pollingInterval?: number;       // milliseconds
  webhookUrl?: string;
  apiCredentials?: Record<string, string>;
  filters?: {
    includePatterns?: string[];
    excludePatterns?: string[];
    maxEventsPerMinute?: number;
  };
}

/**
 * Event deduplication rule
 */
export interface DeduplicationRule {
  id: string;
  source: EventSource;
  fields: string[];             // fields to use for dedup
  windowSeconds: number;         // time window for dedup
  strategy: 'first' | 'last' | 'merge';
}

/**
 * Batch observation result
 */
export interface BatchObservationResult {
  processed: number;
  tagged: number;
  failed: number;
  patterns: string[];
  errors?: string[];
}

/**
 * Observation statistics
 */
export interface ObservationStats {
  employeeId: string;
  period: {
    start: string;
    end: string;
  };
  totalEvents: number;
  bySource: Record<EventSource, number>;
  byType: Record<string, number>;
  avgPerDay: number;
  mostActiveSource: EventSource;
  mostActiveDay: string;
  taggedEvents: number;
  processedEvents: number;
}

/**
 * Event query
 */
export interface EventQuery {
  employeeId: string;
  sources?: EventSource[];
  types?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  includeActions?: boolean;
  includeContent?: boolean;
}

/**
 * Event aggregation
 */
export interface EventAggregation {
  employeeId: string;
  period: {
    start: string;
    end: string;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  aggregations: {
    bySource: Record<EventSource, number>;
    byDayOfWeek: Record<string, number>;
    byHour: Record<string, number>;
    byType: Record<string, number>;
  };
  trends: {
    date: string;
    count: number;
  }[];
}

/**
 * Teaching session type
 */
export type TeachingSessionType = 'screen' | 'voice' | 'both';

/**
 * Teaching session status
 */
export type TeachingSessionStatus = 'recording' | 'paused' | 'completed' | 'failed';

/**
 * Screen frame
 */
export interface ScreenFrame {
  timestamp: number;
  data: string;                  // base64 or URL
  windowTitle?: string;
  activeElement?: string;
}

/**
 * Window change
 */
export interface WindowChange {
  timestamp: number;
  from: string;
  to: string;
  reason: 'open' | 'close' | 'switch';
}

/**
 * Screen recording
 */
export interface ScreenRecording {
  id: string;
  sessionId: string;
  frames: ScreenFrame[];
  windowChanges: WindowChange[];
  duration: number;             // seconds
  fps: number;
}

/**
 * Voice segment
 */
export interface VoiceSegment {
  id: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
  speaker?: string;
}

/**
 * Session context
 */
export interface SessionContext {
  taskDescription?: string;
  tool?: string;
  topic?: string;
  goal?: string;
  tags?: string[];
}

/**
 * Teaching session
 */
export interface TeachingSession {
  id: string;
  employeeId: string;
  type: TeachingSessionType;
  status: TeachingSessionStatus;
  startTime: string;
  endTime?: string;
  duration: number;             // seconds
  screenRecording?: ScreenRecording;
  voiceSegments: VoiceSegment[];
  context: SessionContext;
  completed: boolean;
  knowledgeExtracted: boolean;
  extractedKnowledgeIds?: string[];
  createdAt: string;
}

/**
 * Teaching explanation
 */
export interface TeachingExplanation {
  id: string;
  sessionId: string;
  timestamp: number;             // seconds into session
  duration: number;             // seconds
  text: string;
  topic: string;
  keywords: string[];
  extracted: boolean;
  linkedTwinId?: string;
  linkedKnowledgeId?: string;
  validated: boolean;
  createdAt: string;
}

/**
 * Extracted knowledge from teaching
 */
export interface ExtractedTeachingKnowledge {
  id: string;
  employeeId: string;
  sessionId: string;
  type: 'skill' | 'workflow' | 'decision' | 'preference' | 'rule';
  content: string;
  context: string;
  confidence: number;             // 0-100
  source: 'screen' | 'voice' | 'both';
  timestamp: number;
  validated: boolean;
  approved: boolean;
  usedForTwin: string[];
  createdAt: string;
}

/**
 * Meeting info
 */
export interface MeetingInfo {
  id: string;
  title: string;
  participants: EventParticipant[];
  startTime: string;
  endTime?: string;
  duration?: number;              // minutes
  platform: 'zoom' | 'meet' | 'teams' | 'other';
  recordingUrl?: string;
  transcript?: string;
}

/**
 * Meeting decision
 */
export interface MeetingDecision {
  id: string;
  meetingId: string;
  description: string;
  madeBy: string;
  reasoning?: string;
  confidence?: number;
  status: 'proposed' | 'accepted' | 'rejected' | 'pending';
  actionItems?: string[];
  createdAt: string;
}

/**
 * Meeting action item
 */
export interface MeetingActionItem {
  id: string;
  meetingId: string;
  description: string;
  assignee: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
}
