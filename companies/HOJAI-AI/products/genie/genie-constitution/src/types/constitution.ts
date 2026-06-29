/**
 * Constitution Types — Spec Part 32: Personal Constitution
 */

export interface ConstitutionValue {
  name: string;          // "honesty", "family-first", "speed"
  weight: number;        // 0-1
  examples?: string[];    // "Never lied to investors"
}

export interface Constitution {
  userId: string;
  always: string[];              // Things Genie must always do
  never: string[];               // Things Genie must never do
  requiresApproval: string[];    // Things needing user approval
  values: ConstitutionValue[];    // Core values with weights
  ethicsLevel: 'basic' | 'standard' | 'strict';
  updatedAt: Date;
  createdAt: Date;
}

export interface CheckResult {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
  violatedRules: string[];
  matchedValues: string[];
}

export interface ActionRequest {
  userId: string;
  action: string;
  context?: string;
  recipients?: string[];
  amount?: number;
  category?: string;
}