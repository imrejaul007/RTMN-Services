/**
 * LearningOS Types
 *
 * Collective intelligence across companies:
 * - Industry insights
 * - Best practices
 * - Benchmarks
 * - Knowledge graphs
 */

export type IndustryType = string;

export interface IndustryInsight {
  id: string;
  industry: IndustryType;
  type: 'marketing' | 'operations' | 'finance' | 'hr' | 'sales';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;        // 0-100
  dataPoints: number;         // How many companies contributed
  anonymized: boolean;        // True = no company identifiable
  createdAt: string;
  sourceCompanies: string[]; // Anonymized IDs
}

export interface BestPractice {
  id: string;
  industry: IndustryType;
  category: string;
  title: string;
  description: string;
  steps: string[];
  expectedOutcome: string;
  successRate: number;       // 0-100
  companiesUsing: number;
  createdAt: string;
}

export interface Benchmark {
  id: string;
  industry: IndustryType;
  metric: string;
  value: number;
  unit: string;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  sampleSize: number;
  period: string;           // "2026-Q1"
  updatedAt: string;
}

export interface CompanyKnowledge {
  companyId: string;
  industry: IndustryType;
  stage: 'startup' | 'growth' | 'enterprise' | 'franchise';
  learnings: Learning[];
  patterns: string[];       // Pattern IDs applied
  metrics: Record<string, number>;
}

export interface Learning {
  id: string;
  type: 'success' | 'failure' | 'experiment';
  category: string;
  title: string;
  description: string;
  outcome: string;
  impact: number;           // +10, -5, etc.
  applicableTo: string[];    // Other companies
  createdAt: string;
}

export interface IndustryKnowledgeGraph {
  industry: IndustryType;
  entities: GraphEntity[];
  relationships: GraphRelationship[];
  insights: string[];       // Insight IDs
  benchmarks: string[];      // Benchmark IDs
}

export interface GraphEntity {
  id: string;
  type: 'metric' | 'practice' | 'insight' | 'company';
  name: string;
  properties: Record<string, any>;
}

export interface GraphRelationship {
  from: string;
  to: string;
  type: string;             // 'influences', 'enables', 'contradicts'
  strength: number;          // 0-100
}
