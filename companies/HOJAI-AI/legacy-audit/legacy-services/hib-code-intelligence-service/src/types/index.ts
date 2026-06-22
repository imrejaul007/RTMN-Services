/**
 * HIB Code Intelligence - Type Definitions
 */

export interface CodeAnalysis {
  filePath: string;
  language: string;
  linesOfCode: number;
  complexity: number;
  maintainability: number;
  bugs: Bug[];
  securityIssues: SecurityIssue[];
  bestPractices: BestPractice[];
  suggestions: Suggestion[];
}

export interface Bug {
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
  suggestion?: string;
}

export interface SecurityIssue {
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cwe?: string;
  message: string;
  recommendation: string;
}

export interface BestPractice {
  line: number;
  rule: string;
  message: string;
  suggestion?: string;
}

export interface Suggestion {
  category: 'performance' | 'readability' | 'security' | 'architecture';
  priority: 'high' | 'medium' | 'low';
  message: string;
  effort: 'low' | 'medium' | 'high';
}

export interface RefactoringResult {
  original: string;
  refactored: string;
  changes: RefactoringChange[];
  impact: 'low' | 'medium' | 'high';
}

export interface RefactoringChange {
  type: 'replace' | 'extract' | 'rename' | 'move' | 'delete';
  description: string;
  beforeLines?: [number, number];
  afterLines?: [number, number];
}

export interface DocumentSummary {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  entities: Entity[];
  relationships: Relationship[];
}

export interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'concept' | 'date' | 'number';
  confidence: number;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
  confidence: number;
}

export interface ResearchResult {
  query: string;
  answer: string;
  sources: Source[];
  confidence: number;
}

export interface Source {
  title: string;
  url?: string;
  snippet: string;
  relevance: number;
}
