/**
 * Communication Twin Types
 * Writing style, tone analysis, and communication patterns
 */

/**
 * Communication channel types
 */
export type CommunicationChannel = 'email' | 'slack' | 'chat' | 'sms' | 'meeting' | 'document';

/**
 * Vocabulary categories
 */
export interface VocabularyProfile {
  common: string[];      // Frequently used words
  technical: string[];  // Domain-specific terms
  formal: string[];      // Formal vocabulary
  casual: string[];      // Informal vocabulary
}

/**
 * Sentence structure analysis
 */
export interface SentenceStructure {
  avgLength: number;           // Average words per sentence
  complexity: 'simple' | 'moderate' | 'complex';
  paragraphStyle: 'short' | 'medium' | 'long';
  usesBulletPoints: boolean;
  usesNumberedLists: boolean;
}

/**
 * Writing style patterns
 */
export interface WritingPattern {
  greetingPatterns: string[];     // "Dear", "Hi", "Hello"
  closingPatterns: string[];      // "Best", "Regards", "Thanks"
  signaturePhrases: string[];     // Phrases they always include
  commonPhrases: string[];        // Frequently used expressions
  fillerWords: string[];         // Words they use as fillers
}

/**
 * Writing profile for an employee
 */
export interface WritingProfile {
  employeeId: string;
  vocabulary: VocabularyProfile;
  sentenceStructure: SentenceStructure;
  patterns: WritingPattern;
  emojiUsage: number;             // 0-1 scale
  formality: number;              // 0-1 scale (informal to formal)
  humorUsage: number;             // 0-1 scale
  abbreviationUsage: number;      // 0-1 scale
  grammarAccuracy: number;        // 0-100 percentage
  confidence: number;             // 0-100 how confident the model is
  learnedFrom: number;            // Number of samples analyzed
  lastUpdated: string;
  status: 'learning' | 'stable' | 'outdated';
}

/**
 * Tone scores (0-1 scale)
 */
export interface ToneScores {
  formal: number;       // Formal vs casual
  friendly: number;     // Warm vs cold
  urgent: number;       // Urgent vs calm
  positive: number;     // Positive vs negative
  persuasive: number;   // Persuasive vs neutral
  confident: number;    // Confident vs hesitant
  empathetic: number;   // Empathetic vs detached
}

/**
 * Per-channel tone profile
 */
export interface ChannelToneProfile {
  email: ToneScores;
  slack: ToneScores;
  chat: ToneScores;
  meeting: ToneScores;
  document: ToneScores;
}

/**
 * Negotiation style
 */
export type NegotiationStyle = 'aggressive' | 'collaborative' | 'compromising' | 'accommodating' | 'principled';

/**
 * Response time patterns (in minutes for email, seconds for chat)
 */
export interface ResponseTimePattern {
  email: number;        // Average response time in minutes
  slack: number;        // Average response time in seconds
  chat: number;
  priority: 'immediate' | 'quick' | 'normal' | 'slow';
}

/**
 * Tone profile for an employee
 */
export interface ToneProfile {
  employeeId: string;
  baseline: ToneScores;
  perChannel: ChannelToneProfile;
  negotiationStyle: NegotiationStyle;
  responseTime: ResponseTimePattern;
  emotionalRange: number;         // 0-1, how much emotion expressed
  empathyLevel: number;            // 0-1
  assertivenessLevel: number;      // 0-1
  confidence: number;             // 0-100
  lastUpdated: string;
  status: 'learning' | 'stable' | 'outdated';
}

/**
 * Communication context
 */
export interface CommunicationContext {
  audienceType: 'internal' | 'external' | 'customer' | 'vendor' | 'executive' | 'peer';
  relationshipStrength: number;    // 0-100
  priorInteractions: number;
  topicCategory: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requiresFollowUp: boolean;
}

/**
 * Communication pattern entry
 */
export interface CommunicationPattern {
  id: string;
  employeeId: string;
  channel: CommunicationChannel;
  tone: string;
  responseTime?: number;
  timestamp: string;
  context?: CommunicationContext;
}

/**
 * Simulated communication response
 */
export interface SimulatedResponse {
  content: string;
  tone: ToneScores;
  channel: CommunicationChannel;
  confidence: number;             // 0-100
  suggestions?: string[];
  warnings?: string[];
}

/**
 * Communication style recommendation
 */
export interface StyleRecommendation {
  type: 'tone' | 'wording' | 'format' | 'timing';
  priority: 'low' | 'medium' | 'high';
  current: string;
  suggested: string;
  reason: string;
}

/**
 * Communication analysis result
 */
export interface CommunicationAnalysis {
  employeeId: string;
  channel: CommunicationChannel;
  originalText: string;
  analyzedAt: string;
  writingStyle: Partial<WritingProfile>;
  tone: Partial<ToneScores>;
  suggestions: StyleRecommendation[];
  matchScore: number;             // 0-100, how well it matches their style
}

/**
 * Communication training sample
 */
export interface CommunicationSample {
  id: string;
  employeeId: string;
  channel: CommunicationChannel;
  content: string;
  context: {
    recipientType: string;
    subject?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  };
  analyzed: boolean;
  createdAt: string;
}

/**
 * Writing style request
 */
export interface WriteStyleAnalysisRequest {
  employeeId: string;
  text: string;
  context?: {
    channel?: CommunicationChannel;
    recipientType?: string;
  };
}

/**
 * Communication learning event
 */
export interface CommunicationLearningEvent {
  employeeId: string;
  channel: CommunicationChannel;
  action: 'sent' | 'received' | 'drafted';
  content: string;
  timestamp: string;
  feedback?: {
    wasEffective: boolean;
    comment?: string;
  };
}
