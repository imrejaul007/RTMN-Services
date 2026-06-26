/**
 * Twin Feedback OS - Type Definitions
 */

export interface TwinAction {
  id: string;
  description: string;
  value?: string;
  context?: Record<string, any>;
}

export interface Correction {
  value?: string;
  reason?: string;
  context?: Record<string, any>;
}

export interface Feedback {
  id: string;
  employeeId: string;
  capability: string;
  capabilityArea: CapabilityArea;
  feedbackType: FeedbackType;
  twinAction?: TwinAction;
  correction?: Correction;
  currentConfidence?: number;
  newConfidence: number;
  outcome: 'applied' | 'pending' | 'failed';
  timestamp: string;
}

export interface CorrectionPattern {
  capability: string;
  trigger: string;
  correctResponse: string;
  reason?: string;
  context: Record<string, any>;
  frequency: number;
  lastUpdated: string;
}

export interface RLHFTrainingExample {
  instruction: string;
  input: Record<string, any>;
  output_preferred: string | null;
  output_rejected: string | null;
  metadata: { capability: string; reason?: string; timestamp: string };
}

export interface CapabilityConfidence {
  capability: string;
  currentConfidence: number;
  totalFeedback: number;
  approvals: number;
  rejections: number;
}

export type FeedbackType = 'approve' | 'reject' | 'correct' | 'explain' | 'suggest';
export type CapabilityArea = 'communication' | 'decision' | 'workflow' | 'skill' | 'relationship' | 'general';

export interface FeedbackSubmission {
  employeeId: string;
  capability: string;
  capabilityArea?: CapabilityArea;
  feedbackType: FeedbackType;
  twinAction?: TwinAction;
  correction?: Correction;
  currentConfidence?: number;
}
