import Anthropic from '@anthropic-ai/sdk';
import { IDocumentAnalysis, IClause, IComplianceCheck, IEntity } from '../models/DocumentAnalysis';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096');

export interface AnalyzeDocumentOptions {
  documentId: string;
  content: string;
  tenantId: string;
  userId: string;
}

export interface AnalysisPrompt {
  summary: string;
  keyParties: string[];
  effectiveDate?: string;
  expirationDate?: string;
  clauses: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    risk: 'low' | 'medium' | 'high';
    riskFactors: string[];
    recommendations: string[];
  }>;
  entities: {
    parties: string[];
    dates: string[];
    amounts: string[];
    jurisdictions: string[];
  };
}

/**
 * Analyze a legal document using Claude
 */
export async function analyzeDocument(options: AnalyzeDocumentOptions): Promise<IDocumentAnalysis> {
  const startTime = Date.now();
  const { documentId, content, tenantId } = options;

  logger.info('Starting document analysis', { documentId, tenantId, contentLength: content.length });

  try {
    const prompt = buildAnalysisPrompt(content);
    const response = await callClaudeWithRetry(prompt);

    const analysis = parseAnalysisResponse(response, documentId, startTime);

    logger.info('Document analysis completed', {
      documentId,
      tenantId,
      clauseCount: analysis.clauses.length,
      riskScore: analysis.riskScore,
      duration: analysis.analysisDuration
    });

    return analysis;
  } catch (error) {
    logger.error('Document analysis failed', { documentId, tenantId, error });
    throw new Error(`Document analysis failed: ${(error as Error).message}`);
  }
}

/**
 * Build the analysis prompt for Claude
 */
function buildAnalysisPrompt(content: string): string {
  return `You are an expert legal document analyst. Analyze the following legal document and provide a comprehensive breakdown.

Return your response as a valid JSON object with this exact structure:
{
  "summary": "A concise 2-3 sentence summary of the document's purpose and key terms",
  "keyParties": ["List of all parties mentioned in the document"],
  "effectiveDate": "The effective date if found, otherwise null",
  "expirationDate": "The expiration/termination date if found, otherwise null",
  "clauses": [
    {
      "id": "unique-id",
      "type": "confidentiality|termination|liability|indemnification|payment|intellectual_property|warranty|force_majeure|dispute_resolution|governing_law|assignment|amendment|notice|severability|entire_agreement|other",
      "title": "Descriptive title for this clause",
      "content": "The exact text of the clause (can be abbreviated if very long)",
      "risk": "low|medium|high",
      "riskFactors": ["List of specific risk factors identified in this clause"],
      "recommendations": ["Specific recommendations for addressing each risk"]
    }
  ],
  "entities": {
    "parties": ["All parties, companies, and organizations mentioned"],
    "dates": ["All significant dates mentioned (effective date, termination, notice periods, etc.)"],
    "amounts": ["All monetary amounts mentioned"],
    "jurisdictions": ["All jurisdictions, governing laws, or venues mentioned"]
  }
}

Document to analyze:
${content.substring(0, 15000)}

Ensure the JSON is valid and complete. Focus on identifying:
1. Standard contract clauses (termination, confidentiality, liability, etc.)
2. Unusual or potentially risky terms
3. Compliance-relevant provisions
4. Key dates and obligations

Return ONLY the JSON object, no additional text.`;
}

/**
 * Call Claude API with retry logic
 */
async function callClaudeWithRetry(prompt: string, maxRetries: number = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const textContent = response.content[0];
      if (textContent.type === 'text') {
        return textContent.text;
      }

      throw new Error('Unexpected response type from Claude');
    } catch (error) {
      lastError = error as Error;

      // Retry on rate limit or temporary errors
      if ((error as any).status === 429 || (error as any).status === 503) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(`Claude API rate limited, retrying in ${delay}ms`, { attempt });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Claude API failed after retries');
}

/**
 * Parse Claude's response into structured analysis
 */
function parseAnalysisResponse(response: string, documentId: string, startTime: number): IDocumentAnalysis {
  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse analysis response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as AnalysisPrompt;

  // Process clauses
  const clauses: IClause[] = parsed.clauses.map((clause, index) => ({
    id: clause.id || `clause_${uuidv4().replace(/-/g, '').substring(0, 8)}`,
    type: clause.type as IClause['type'],
    title: clause.title,
    content: clause.content,
    startIndex: 0,
    endIndex: clause.content.length,
    risk: clause.risk,
    riskScore: calculateClauseRiskScore(clause.risk, clause.riskFactors),
    riskFactors: clause.riskFactors || [],
    recommendations: clause.recommendations || [],
    complianceMappings: []
  }));

  // Calculate overall risk score
  const riskScore = calculateOverallRiskScore(clauses);

  // Process compliance checks
  const complianceChecks: IComplianceCheck[] = performComplianceChecks(clauses);

  const analysis: IDocumentAnalysis = {
    documentId,
    summary: parsed.summary || 'Document analyzed successfully.',
    keyParties: parsed.keyParties || [],
    effectiveDate: parsed.effectiveDate || undefined,
    expirationDate: parsed.expirationDate || undefined,
    clauses,
    riskScore,
    complianceChecks,
    entities: {
      parties: parsed.entities?.parties || [],
      dates: parsed.entities?.dates || [],
      amounts: parsed.entities?.amounts || [],
      currencies: [],
      jurisdictions: parsed.entities?.jurisdictions || [],
      contracts: [],
      penalties: []
    },
    confidence: calculateConfidence(clauses),
    analyzedAt: new Date(),
    analysisDuration: Date.now() - startTime,
    modelVersion: MODEL
  };

  return analysis;
}

/**
 * Calculate risk score for a clause
 */
function calculateClauseRiskScore(risk: 'low' | 'medium' | 'high', riskFactors: string[]): number {
  const baseScore = {
    low: 10,
    medium: 50,
    high: 90
  }[risk];

  const factorAdjustment = riskFactors.length * 5;
  return Math.min(100, baseScore + factorAdjustment);
}

/**
 * Calculate overall document risk score
 */
function calculateOverallRiskScore(clauses: IClause[]): number {
  if (clauses.length === 0) return 0;

  const totalScore = clauses.reduce((sum, clause) => sum + clause.riskScore, 0);
  const averageScore = totalScore / clauses.length;

  // Weight high-risk clauses more heavily
  const highRiskClauses = clauses.filter(c => c.risk === 'high');
  const highRiskBonus = highRiskClauses.length * 5;

  return Math.min(100, Math.round(averageScore + highRiskBonus));
}

/**
 * Perform compliance checks on clauses
 */
function performComplianceChecks(clauses: IClause[]): IComplianceCheck[] {
  const frameworks = ['GDPR', 'SOC2', 'ISO27001', 'CCPA', 'HIPAA'];
  const checks: IComplianceCheck[] = [];

  for (const framework of frameworks) {
    const frameworkClauses = clauses.filter(clause =>
      clause.complianceMappings?.some(m => m.framework === framework)
    );

    const compliantCount = frameworkClauses.filter(clause =>
      clause.complianceMappings?.some(m => m.framework === framework && m.status === 'compliant')
    ).length;

    const nonCompliantCount = frameworkClauses.filter(clause =>
      clause.complianceMappings?.some(m => m.framework === framework && m.status === 'non_compliant')
    ).length;

    let status: 'compliant' | 'non_compliant' | 'partial' = 'compliant';
    if (nonCompliantCount > 0) status = 'partial';
    if (nonCompliantCount > frameworkClauses.length / 2) status = 'non_compliant';

    const score = frameworkClauses.length > 0
      ? Math.round((compliantCount / frameworkClauses.length) * 100)
      : 100;

    checks.push({
      framework,
      status,
      score,
      issues: [],
      recommendations: []
    });
  }

  return checks;
}

/**
 * Calculate analysis confidence based on clause coverage
 */
function calculateConfidence(clauses: IClause[]): number {
  if (clauses.length === 0) return 0;

  // Base confidence on number of clauses found
  const clauseCountConfidence = Math.min(1, clauses.length / 10);

  // Check for key clause types
  const keyTypes = ['termination', 'liability', 'confidentiality', 'indemnification', 'governing_law'];
  const foundTypes = new Set(clauses.map(c => c.type));
  const coverageScore = keyTypes.filter(t => foundTypes.has(t as any)).length / keyTypes.length;

  // Combine scores with weights
  const confidence = (clauseCountConfidence * 0.3) + (coverageScore * 0.7);

  return Math.round(confidence * 100) / 100;
}

export default {
  analyzeDocument
};
