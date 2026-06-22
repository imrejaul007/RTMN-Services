// REST Client for Legal AI Service
const LEGAL_SERVICE_URL = process.env.LEGAL_SERVICE_URL || 'http://localhost:5004';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

export interface DocumentAnalysis {
  documentId: string;
  summary: string;
  documentType: string;
  keyEntities: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  language: string;
  wordCount: number;
}

export interface Clause {
  id: string;
  type: string;
  title: string;
  content: string;
  riskLevel: 'low' | 'medium' | 'high';
  implications: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation?: string;
  }>;
  recommendations: string[];
}

export interface ComplianceResult {
  compliant: boolean;
  framework: string;
  violations: string[];
  suggestions: string[];
}

export interface LegalQuestion {
  question: string;
  answer: string;
  confidence: number;
  sources: string[];
  relatedLaws: string[];
}

export async function fetchFromLegal<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${LEGAL_SERVICE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_SERVICE_TOKEN,
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as T;
  } catch (error) {
    console.error(`Legal API error (${endpoint}):`, error);
    return null;
  }
}

export async function analyzeDocument(content: string): Promise<DocumentAnalysis | null> {
  return fetchFromLegal<DocumentAnalysis>('/api/legal/analyze', {
    method: 'POST',
    body: JSON.stringify({ content })
  });
}

export async function extractClauses(documentId: string): Promise<Clause[] | null> {
  return fetchFromLegal<Clause[]>(`/api/legal/clauses/${documentId}`);
}

export async function assessRisk(documentId: string): Promise<RiskAssessment | null> {
  return fetchFromLegal<RiskAssessment>(`/api/legal/risk/${documentId}`);
}

export async function checkCompliance(documentId: string, framework?: string): Promise<ComplianceResult | null> {
  return fetchFromLegal<ComplianceResult>(`/api/legal/compliance/${documentId}?framework=${framework || 'gdpr'}`);
}

export async function askQuestion(question: string, context?: string): Promise<LegalQuestion | null> {
  return fetchFromLegal<LegalQuestion>('/api/legal/question', {
    method: 'POST',
    body: JSON.stringify({ question, context })
  });
}
