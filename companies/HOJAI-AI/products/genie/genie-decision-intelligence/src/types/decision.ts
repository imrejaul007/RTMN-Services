/**
 * Decision Types — Spec Part 21
 */

export interface Alternative {
  name: string;
  rejected: boolean;
  reason?: string;
}

export interface Decision {
  id: string;
  userId: string;
  what: string;              // What was decided
  why: string;               // Why this decision
  who: string[];             // Who approved (people names or IDs)
  when: Date;                // When decided
  alternatives: Alternative[]; // Alternatives considered
  confidence: number;        // 0-1
  impact: 'low' | 'medium' | 'high';
  context: string;           // Additional context
  source: 'meeting' | 'chat' | 'email' | 'voice' | 'manual';
  tags: string[];            // For search
  revisitDate?: Date;        // When to revisit
  relatedDecisions?: string[]; // Linked decisions
  createdAt: Date;
  updatedAt: Date;
}

export interface DecisionMemory {
  // Long-term memory of all decisions for a user
  userId: string;
  decisions: Decision[];
  totalCount: number;
  byImpact: {
    high: number;
    medium: number;
    low: number;
  };
  bySource: Record<string, number>;
}

export interface WhyQuery {
  topic: string;
  userId: string;
  context?: string;
}

export interface WhyResponse {
  decision: Decision | null;
  alternatives: Alternative[];
  similarDecisions: Decision[];
  confidence: number;
  reasoning: string;
}

export interface ExtractRequest {
  userId: string;
  text: string;
  source: 'meeting' | 'chat' | 'email' | 'voice' | 'manual';
  context?: string;
  attendees?: string[];
  timestamp?: string;
}

export interface ExtractResponse {
  decisions: Decision[];
  confidence: number;
  rawExtraction: any;
}