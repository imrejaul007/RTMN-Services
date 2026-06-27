/**
 * Conversation Tracing - Type Definitions
 * Multi-agent conversation tracking with sentiment and topic analysis
 */

// Participant types
export interface Participant {
  id: string;
  type: 'agent' | 'user' | 'system' | 'bot';
  name: string;
  role?: string;
  metadata?: Record<string, unknown>;
}

// Message types
export interface Message {
  id: string;
  conversationId: string;
  parentMessageId?: string;
  participantId: string;
  content: string;
  contentType: 'text' | 'json' | 'image' | 'audio' | 'tool_call' | 'tool_result' | 'system';
  timestamp: number;
  metadata?: MessageMetadata;
  sentiment?: SentimentScore;
  topics?: TopicTag[];
  intents?: IntentTag[];
  entities?: Entity[];
  language?: string;
}

export interface MessageMetadata {
  tokens?: number;
  model?: string;
  latency?: number;
  toolCalls?: ToolCall[];
  attachments?: Attachment[];
  editHistory?: EditHistory[];
  reactions?: Reaction[];
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result?: unknown;
  duration?: number;
  error?: string;
}

export interface Attachment {
  type: string;
  url?: string;
  name?: string;
  size?: number;
  mimeType?: string;
}

export interface EditHistory {
  editedAt: number;
  previousContent?: string;
  editType: 'edit' | 'delete' | 'regenerate';
}

export interface Reaction {
  participantId: string;
  emoji: string;
  timestamp: number;
}

// Sentiment analysis
export interface SentimentScore {
  overall: number; // -1 to 1
  positive: number; // 0 to 1
  negative: number; // 0 to 1
  neutral: number; // 0 to 1
  confidence: number; // 0 to 1
  emotions?: EmotionScores;
}

export interface EmotionScores {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
}

// Topic tracking
export interface TopicTag {
  topic: string;
  confidence: number; // 0 to 1
  mentions: number;
  firstMention?: number; // timestamp
  lastMention?: number; // timestamp
}

export interface IntentTag {
  intent: string;
  confidence: number; // 0 to 1
  slots?: Record<string, unknown>;
}

// Entity extraction
export interface Entity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'product' | 'price' | 'date' | 'url' | 'email' | 'phone' | 'custom';
  subtype?: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  metadata?: Record<string, unknown>;
}

// Conversation types
export interface Conversation {
  id: string;
  title?: string;
  participants: Participant[];
  messages: Map<string, Message>;
  startTime: number;
  endTime?: number;
  status: ConversationStatus;
  metadata: ConversationMetadata;
  summary?: ConversationSummary;
  analytics?: ConversationAnalytics;
}

export type ConversationStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface ConversationMetadata {
  source: 'sutar' | 'genie' | 'do-app' | 'api' | 'manual';
  channel?: 'chat' | 'voice' | 'email' | 'whatsapp' | 'sms' | 'api';
  industryVertical?: string;
  useCase?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

// Analytics types
export interface ConversationAnalytics {
  totalMessages: number;
  totalParticipants: number;
  messageRate: MessageRate;
  sentimentTrend: SentimentTrend;
  topicEvolution: TopicEvolution;
  participantEngagement: ParticipantEngagement[];
  turnTaking: TurnTakingAnalysis;
  responseTimes: ResponseTimeAnalysis;
  keywordFrequency: Record<string, number>;
  languageStats?: LanguageStats;
  escalationEvents?: EscalationEvent[];
}

export interface MessageRate {
  messagesPerMinute: number;
  messagesPerHour: number;
  peakHour: number;
  averageMessagesPerParticipant: number;
}

export interface SentimentTrend {
  overall: number; // Average sentiment
  trend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
  highPoints: { timestamp: number; value: number }[];
  lowPoints: { timestamp: number; value: number }[];
  sentimentByParticipant: Record<string, number>;
  sentimentOverTime: { timestamp: number; value: number }[];
}

export interface TopicEvolution {
  topics: TopicTag[];
  emergingTopics: { topic: string; velocity: number }[];
  fadingTopics: { topic: string; velocity: number }[];
  topicTransitions: { from: string; to: string; count: number }[];
}

export interface ParticipantEngagement {
  participantId: string;
  participantName: string;
  messageCount: number;
  averageResponseTime: number;
  sentimentContribution: number;
  topicContributions: Record<string, number>;
  lastActive: number;
}

export interface TurnTakingAnalysis {
  averageTurnLength: number;
  turnDistribution: Record<string, number>;
  interruptions: number;
  overlappingTopics: string[];
  dialogueActs: Record<string, number>;
}

export interface ResponseTimeAnalysis {
  averageResponseTime: number;
  medianResponseTime: number;
  fastestResponse: number;
  slowestResponse: number;
  responseTimeByParticipant: Record<string, number>;
  responseTimeByHour: Record<number, number>;
}

export interface LanguageStats {
  primaryLanguage: string;
  languageDistribution: Record<string, number>;
  codeSwitching: number;
  translationRequests: number;
}

export interface EscalationEvent {
  timestamp: number;
  type: 'sentiment_drop' | 'repetition' | 'confusion' | 'explicit_request' | 'system_triggered';
  description: string;
  affectedParticipants: string[];
  resolution?: string;
}

// Summary types
export interface ConversationSummary {
  generatedAt: number;
  duration: number;
  keyPoints: string[];
  decisions: { description: string; agreedBy: string[] }[];
  actionItems: { description: string; assignedTo?: string; dueDate?: number }[];
  unresolvedIssues: string[];
  nextSteps: string[];
  overallOutcome: 'resolved' | 'escalated' | 'pending' | 'abandoned';
  sentimentSummary: string;
}

// Request/Response types
export interface StartConversationRequest {
  title?: string;
  participants: Participant[];
  source?: 'sutar' | 'genie' | 'do-app' | 'api' | 'manual';
  channel?: string;
  metadata?: Record<string, unknown>;
}

export interface StartConversationResponse {
  conversationId: string;
  title?: string;
  participants: Participant[];
  startTime: number;
}

export interface AddMessageRequest {
  participantId: string;
  content: string;
  contentType?: 'text' | 'json' | 'image' | 'audio' | 'tool_call' | 'tool_result' | 'system';
  parentMessageId?: string;
  metadata?: MessageMetadata;
}

export interface AddMessageResponse {
  messageId: string;
  conversationId: string;
  timestamp: number;
  sentiment?: SentimentScore;
  topics?: TopicTag[];
}

export interface GetConversationRequest {
  conversationId: string;
  includeMessages?: boolean;
  includeAnalytics?: boolean;
  includeSummary?: boolean;
  messageLimit?: number;
  messageOffset?: number;
}

export interface GetConversationResponse {
  conversation: {
    id: string;
    title?: string;
    participants: Participant[];
    startTime: number;
    endTime?: number;
    status: ConversationStatus;
    messageCount: number;
    metadata: ConversationMetadata;
  };
  messages?: Message[];
  analytics?: ConversationAnalytics;
  summary?: ConversationSummary;
}

export interface GetConversationAnalyticsRequest {
  conversationId: string;
  includeSentiment?: boolean;
  includeTopics?: boolean;
  includeEngagement?: boolean;
  includeResponseTimes?: boolean;
}

export interface ListConversationsRequest {
  status?: ConversationStatus;
  participantId?: string;
  source?: string;
  startTime?: number;
  endTime?: number;
  searchQuery?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'startTime' | 'endTime' | 'messageCount';
  sortOrder?: 'asc' | 'desc';
}

export interface ListConversationsResponse {
  conversations: {
    id: string;
    title?: string;
    participantCount: number;
    messageCount: number;
    startTime: number;
    endTime?: number;
    status: ConversationStatus;
    lastMessageAt?: number;
  }[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Storage interface
export interface ConversationStorage {
  saveConversation(conversation: Conversation): Promise<void>;
  getConversation(conversationId: string): Promise<Conversation | null>;
  deleteConversation(conversationId: string): Promise<boolean>;
  listConversations(query: ListConversationsRequest): Promise<ListConversationsResponse>;
  addMessage(message: Message): Promise<void>;
  getMessages(conversationId: string, limit?: number, offset?: number): Promise<Message[]>;
  updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void>;
}

// NLP Analysis interfaces
export interface NLPAnalysisResult {
  sentiment: SentimentScore;
  topics: TopicTag[];
  intents: IntentTag[];
  entities: Entity[];
  language?: string;
}

export interface TopicModel {
  name: string;
  keywords: string[];
  threshold: number;
}

export interface IntentClassifier {
  name: string;
  intents: string[];
  examples: Record<string, string[]>;
}