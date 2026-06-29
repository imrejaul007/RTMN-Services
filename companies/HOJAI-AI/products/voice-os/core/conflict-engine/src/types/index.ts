/**
 * Conflict Engine Types
 */

export interface DisagreementSignal {
  type: "unrealistic" | "harmful" | "contradictory" | "risky";
  severity: "low" | "medium" | "high";
  message: string;
  alternative?: string;
}

export interface ConflictResponse {
  shouldChallenge: boolean;
  approach: "gentle" | "direct" | "empathetic" | "none";
  message: string;
  offerAlternative: boolean;
  alternative?: string;
}

export interface UserValues {
  priorities: string[];
  principles: string[];
  longTermGoals: string[];
  shortTermGoals: string[];
}