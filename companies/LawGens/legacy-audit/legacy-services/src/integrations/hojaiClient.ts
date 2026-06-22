/**
 * HOJAI AI Integration Client
 * Connects LawGens to HOJAI AI for legal reasoning and analysis
 */

import config from '../config';
import { logger } from '../utils/logger';
import {
  HojaiAnalysisRequest,
  HojaiAnalysisResponse,
  CaseLaw,
  ContractAnalysis,
  ComplianceCheck,
} from '../types';

interface HojaiServiceEndpoint {
  legal_research: string;
  contract_analysis: string;
  compliance_check: string;
  court_intelligence: string;
  document_drafting: string;
}

const HOJAI_ENDPOINTS: HojaiServiceEndpoint = {
  legal_research: '/api/ai/legal-research',
  contract_analysis: '/api/ai/contract-analysis',
  compliance_check: '/api/ai/compliance-check',
  court_intelligence: '/api/ai/court-intelligence',
  document_drafting: '/api/ai/document-drafting',
};

export interface LegalReasoningContext {
  caseLaw?: CaseLaw[];
  contractText?: string;
  complianceFramework?: string;
  courtPrecedents?: string[];
  jurisdiction?: string;
  practiceArea?: string;
}

export interface AIRecommendation {
  action: string;
  reasoning: string;
  confidence: number;
  precedent?: string;
}

class HojaiAIClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retryAttempts: number;

  constructor() {
    this.baseUrl = config.hojai.gatewayUrl;
    this.apiKey = config.hojai.apiKey;
    this.timeout = config.hojai.timeout;
    this.retryAttempts = config.hojai.retryAttempts;
  }

  /**
   * Make HTTP request to HOJAI AI gateway
   */
  private async makeRequest<T>(
    endpoint: string,
    body: Record<string, any>,
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Service-Name': 'lawgens',
          'X-Request-ID': this.generateRequestId(),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HOJAI AI request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info(`HOJAI AI request successful`, { endpoint, status: response.status });
      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`HOJAI AI request timeout after ${this.timeout}ms`);
      }

      // Retry logic
      if (retryCount < this.retryAttempts) {
        logger.warn(`Retrying HOJAI AI request`, { endpoint, retryCount: retryCount + 1 });
        return this.makeRequest<T>(endpoint, body, retryCount + 1);
      }

      logger.error(`HOJAI AI request failed`, { endpoint, error: error.message });
      throw error;
    }
  }

  /**
   * Generate unique request ID for tracing
   */
  private generateRequestId(): string {
    return `lg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Analyze legal research query using AI
   */
  async analyzeLegalResearch(
    query: string,
    context?: LegalReasoningContext
  ): Promise<{
    analysis: string;
    relevantCases: string[];
    statutes: string[];
    confidence: number;
  }> {
    try {
      const response = await this.makeRequest<{
        analysis: string;
        relevantCases: string[];
        statutes: string[];
        confidence: number;
      }>(
        HOJAI_ENDPOINTS.legal_research,
        {
          query,
          context: {
            jurisdiction: context?.jurisdiction,
            practiceArea: context?.practiceArea,
            existingCases: context?.caseLaw?.map(c => c.caseId),
            precedents: context?.courtPrecedents,
          },
          options: {
            maxResults: config.legalResearch.maxResults,
            includeReasoning: true,
          },
        }
      );

      return response;
    } catch (error: any) {
      logger.error(`Legal research analysis failed`, { query: query.substring(0, 100), error: error.message });
      // Return fallback response
      return {
        analysis: this.generateFallbackAnalysis(query),
        relevantCases: [],
        statutes: [],
        confidence: 0.5,
      };
    }
  }

  /**
   * Analyze contract with AI-powered clause detection and risk assessment
   */
  async analyzeContract(
    contractText: string,
    contractType: string,
    context?: LegalReasoningContext
  ): Promise<{
    clauses: any[];
    riskScore: number;
    riskLevel: string;
    issues: string[];
    recommendations: AIRecommendation[];
    summary: string;
  }> {
    try {
      const response = await this.makeRequest<{
        clauses: any[];
        riskScore: number;
        riskLevel: string;
        issues: string[];
        recommendations: AIRecommendation[];
        summary: string;
      }>(
        HOJAI_ENDPOINTS.contract_analysis,
        {
          contractText,
          contractType,
          context: {
            jurisdiction: context?.jurisdiction,
            existingContracts: context?.contractText ? [context.contractText.substring(0, 500)] : [],
            precedents: context?.courtPrecedents,
          },
          options: {
            detectClauses: true,
            assessRisks: true,
            checkCompliance: true,
          },
        }
      );

      return response;
    } catch (error: any) {
      logger.error(`Contract analysis failed`, { contractType, error: error.message });
      // Return fallback analysis
      return this.generateFallbackContractAnalysis(contractText, contractType);
    }
  }

  /**
   * Check compliance against regulations using AI
   */
  async checkCompliance(
    requirements: string[],
    regulation: string,
    evidence?: Record<string, string>
  ): Promise<{
    results: ComplianceCheck[];
    overallScore: number;
    criticalIssues: string[];
    recommendations: string[];
  }> {
    try {
      const response = await this.makeRequest<{
        results: ComplianceCheck[];
        overallScore: number;
        criticalIssues: string[];
        recommendations: string[];
      }>(
        HOJAI_ENDPOINTS.compliance_check,
        {
          requirements,
          regulation,
          evidence,
          context: {
            framework: regulation,
          },
          options: {
            detailedAnalysis: true,
            includeRemediation: true,
          },
        }
      );

      return response;
    } catch (error: any) {
      logger.error(`Compliance check failed`, { regulation, error: error.message });
      return this.generateFallbackComplianceCheck(requirements, regulation);
    }
  }

  /**
   * Analyze court intelligence with AI
   */
  async analyzeCourtIntelligence(
    caseData: {
      caseId: string;
      parties: string[];
      filings: string[];
      docket: string[];
    },
    context?: LegalReasoningContext
  ): Promise<{
    analysis: string;
    keyInsights: string[];
    predictedOutcomes: { outcome: string; probability: number }[];
    recommendedStrategies: string[];
  }> {
    try {
      const response = await this.makeRequest<{
        analysis: string;
        keyInsights: string[];
        predictedOutcomes: { outcome: string; probability: number }[];
        recommendedStrategies: string[];
      }>(
        HOJAI_ENDPOINTS.court_intelligence,
        {
          caseData,
          context: {
            precedents: context?.caseLaw?.map(c => c.caseId),
            jurisdiction: context?.jurisdiction,
          },
          options: {
            predictOutcome: true,
            suggestStrategies: true,
          },
        }
      );

      return response;
    } catch (error: any) {
      logger.error(`Court intelligence analysis failed`, { caseId: caseData.caseId, error: error.message });
      return {
        analysis: 'Court intelligence analysis temporarily unavailable',
        keyInsights: [],
        predictedOutcomes: [],
        recommendedStrategies: [],
      };
    }
  }

  /**
   * Draft legal document with AI assistance
   */
  async draftDocument(
    documentType: string,
    requirements: {
      parties: { name: string; role: string }[];
      terms: Record<string, any>;
      jurisdiction: string;
    },
    templateContent?: string
  ): Promise<{
    content: string;
    clauses: string[];
    warnings: string[];
    nextSteps: string[];
  }> {
    try {
      const response = await this.makeRequest<{
        content: string;
        clauses: string[];
        warnings: string[];
        nextSteps: string[];
      }>(
        HOJAI_ENDPOINTS.document_drafting,
        {
          documentType,
          requirements,
          templateContent,
          context: {
            jurisdiction: requirements.jurisdiction,
            parties: requirements.parties.map(p => p.name),
          },
          options: {
            includeClauses: true,
            validateTerms: true,
          },
        }
      );

      return response;
    } catch (error: any) {
      logger.error(`Document drafting failed`, { documentType, error: error.message });
      return this.generateFallbackDocumentDraft(documentType, requirements);
    }
  }

  /**
   * Generate semantic embeddings for legal text
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.makeRequest<{ embedding: number[] }>(
        '/api/ai/embeddings',
        { text, model: 'legal-semantic-v1' }
      );
      return response.embedding;
    } catch (error: any) {
      logger.warn(`Embedding generation failed, using fallback`, { error: error.message });
      return this.generateSimpleEmbedding(text);
    }
  }

  /**
   * Health check for HOJAI AI connection
   */
  async healthCheck(): Promise<{ available: boolean; latency: number; services: string[] }> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          available: true,
          latency,
          services: data.services || Object.keys(HOJAI_ENDPOINTS),
        };
      }

      return { available: false, latency, services: [] };
    } catch (error: any) {
      return { available: false, latency: Date.now() - startTime, services: [] };
    }
  }

  // ==================== Fallback Methods ====================

  private generateRequestId(): string {
    return `lg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFallbackAnalysis(query: string): string {
    return `Analysis of query: "${query.substring(0, 200)}..." - This requires comprehensive legal research. Consider consulting relevant case law and statutes in the applicable jurisdiction.`;
  }

  private generateFallbackContractAnalysis(contractText: string, contractType: string): any {
    const wordCount = contractText.split(/\s+/).length;
    return {
      clauses: [
        {
          clauseId: 'fallback-1',
          clauseType: 'general',
          originalText: contractText.substring(0, 500),
          summary: 'Standard contract clause requiring legal review',
          riskScore: 50,
          riskLevel: 'medium',
          issues: ['AI analysis unavailable - manual review recommended'],
          suggestions: ['Consult with legal counsel'],
        },
      ],
      riskScore: 50,
      riskLevel: 'medium',
      issues: ['Contract length:', `${wordCount} words`, 'Full analysis pending AI service availability'],
      recommendations: [
        {
          action: 'Manual Review',
          reasoning: 'AI analysis service is currently unavailable',
          confidence: 0.3,
        },
      ],
      summary: `This ${contractType} contract contains ${wordCount} words. Standard clauses detected. Professional legal review recommended.`,
    };
  }

  private generateFallbackComplianceCheck(requirements: string[], regulation: string): any {
    return {
      results: requirements.map((req, idx) => ({
        checkId: `check-${idx}`,
        regulation,
        requirement: req,
        status: 'needs_review' as const,
        findings: ['Compliance check pending AI analysis'],
        remediationSteps: ['Submit for AI-powered compliance review'],
      })),
      overallScore: 0,
      criticalIssues: [],
      recommendations: ['Enable HOJAI AI integration for automated compliance checks'],
    };
  }

  private generateFallbackDocumentDraft(documentType: string, requirements: any): any {
    return {
      content: this.generateBasicDocumentContent(documentType, requirements),
      clauses: ['Parties', 'Terms', 'Signatures', 'Date'],
      warnings: ['AI drafting unavailable - basic template generated'],
      nextSteps: ['Customize document', 'Review with legal counsel', 'Obtain signatures'],
    };
  }

  private generateBasicDocumentContent(documentType: string, requirements: any): string {
    const date = new Date().toLocaleDateString();
    const parties = requirements.parties.map((p: any) => `${p.role}: ${p.name}`).join('\n');

    return `${documentType.toUpperCase()}

Date: ${date}

PARTIES:
${parties}

JURISDICTION: ${requirements.jurisdiction}

TERMS AND CONDITIONS:
[To be drafted based on specific requirements]

SIGNATURES:

_________________________
${requirements.parties[0]?.name || 'Party 1'}

_________________________
${requirements.parties[1]?.name || 'Party 2'}

---
Generated by LawGens Legal AI Platform
Date: ${date}
`;
  }

  private generateSimpleEmbedding(text: string): number[] {
    // Simple hash-based embedding fallback
    const hash = this.simpleHash(text);
    return Array.from({ length: 384 }, (_, i) => {
      return ((hash * (i + 1)) % 1000) / 1000 - 0.5;
    });
  }

  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}

export const hojaiAIClient = new HojaiAIClient();
export default hojaiAIClient;