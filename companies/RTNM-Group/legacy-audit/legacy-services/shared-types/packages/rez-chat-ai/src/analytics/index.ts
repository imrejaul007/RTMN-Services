// ── Analytics Module ─────────────────────────────────────────────────────────────
// Learning and improvement system for AI chat

// Types
export * from './types';

// Learning Engine
export {
  LearningSystem,
  getLearningSystem,
  resetLearningSystem,
  PatternAnalyzer,
  KnowledgeGapDetector,
  ResponseQualityAnalyzer,
  ImprovementRecommender,
  ConversationOutcomeTracker,
  detectIntent,
  normalizeText,
  extractKeywords,
} from './learningEngine';

// Analytics Service
export {
  AnalyticsService,
  getAnalyticsService,
  resetAnalyticsService,
  AnalyticsEventTracker,
  type AnalyticsRepository,
  type AnalyticsEvents,
} from './service';

// Convenience re-exports for common types
export type {
  ConversationOutcome,
  MessageFeedback,
  AIResponseMetrics,
  PatternEntry,
  KnowledgeGap,
  ImprovementAction,
  AnalyticsSummary,
  IntentPattern,
  LearningConfig,
} from './types';
