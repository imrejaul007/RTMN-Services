import Anthropic from '@anthropic-ai/sdk';
import { IClause } from '../models/DocumentAnalysis';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096');

export interface ExtractClausesOptions {
  documentId: string;
  content: string;
  tenantId: string;
  forceReExtract?: boolean;
}

export interface ClauseExtractionResult {
  clauses: IClause[];
  extractionMetadata: {
    totalClauses: number;
    byType: Record<string, number>;
    byRiskLevel: Record<string, number>;
    extractedAt: Date;
  };
}

/**
 * Clause type patterns for initial identification
 */
const CLAUSE_TYPE_PATTERNS: Record<string, RegExp[]> = {
  confidentiality: [
    /confidential/i,
    /non-disclosure/i,
    /proprietary information/i,
    /trade secret/i
  ],
  termination: [
    /termination/i,
    /terminate/i,
    /cancel/i,
    /expire/i,
    /end of term/i
  ],
  liability: [
    /liability/i,
    /limitation of liability/i,
    /damages/i,
    /indemnif/i,
    /hold harmless/i
  ],
  indemnification: [
    /indemnif/i,
    /defend and hold harmless/i,
    /indemnity/i
  ],
  payment: [
    /payment/i,
    /fee/i,
    /compensation/i,
    /invoice/i,
    /billing/i
  ],
  intellectual_property: [
    /intellectual property/i,
    /patent/i,
    /copyright/i,
    /trademark/i,
    /ip\s*(?:rights?|ownership)/i
  ],
  warranty: [
    /warrant/i,
    /guarantee/i,
    /representation/i,
    /assurance/i
  ],
  force_majeure: [
    /force majeure/i,
    /act of god/i,
    /unforeseeable circumstance/i
  ],
  dispute_resolution: [
    /arbitrat/i,
    /mediat/i,
    /dispute resolution/i,
    /governing law/i,
    /venue/i,
    /jurisdiction/i
  ],
  governing_law: [
    /governing law/i,
    /applicable law/i,
    /shall be governed/i,
    /chosen law/i
  ],
  assignment: [
    /assignment/i,
    /assign/i,
    /transfer.*right/i,
    /successor/i
  ],
  amendment: [
    /amendment/i,
    /modification/i,
    /alteration/i,
    /change.*term/i
  ],
  notice: [
    /notice/i,
    /notification/i,
    /written.*consent/i
  ],
  severability: [
    /severability/i,
    /invalid.*provision/i,
    /remain.*effect/i
  ],
  entire_agreement: [
    /entire agreement/i,
    /integration clause/i,
    /supersedes/i,
    /whole agreement/i
  ]
};

/**
 * Extract clauses from document content
 */
export async function extractClauses(options: ExtractClausesOptions): Promise<ClauseExtractionResult> {
  const { documentId, content, tenantId } = options;
  const startTime = Date.now();

  logger.info('Starting clause extraction', { documentId, tenantId, contentLength: content.length });

  try {
    // Use Claude to identify and extract clauses
    const extractedClauses = await extractClausesWithClaude(content, documentId);

    // Add positional information
    const clausesWithPosition = addClausePositions(content, extractedClauses);

    // Calculate metadata
    const byType: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};

    for (const clause of clausesWithPosition) {
      byType[clause.type] = (byType[clause.type] || 0) + 1;
      byRiskLevel[clause.risk] = (byRiskLevel[clause.risk] || 0) + 1;
    }

    logger.info('Clause extraction completed', {
      documentId,
      tenantId,
      clauseCount: clausesWithPosition.length,
      byType,
      byRiskLevel,
      duration: Date.now() - startTime
    });

    return {
      clauses: clausesWithPosition,
      extractionMetadata: {
        totalClauses: clausesWithPosition.length,
        byType,
        byRiskLevel,
        extractedAt: new Date()
      }
    };
  } catch (error) {
    logger.error('Clause extraction failed', { documentId, tenantId, error });
    throw new Error(`Clause extraction failed: ${(error as Error).message}`);
  }
}

/**
 * Extract clauses using Claude
 */
async function extractClausesWithClaude(content: string, documentId: string): Promise<Omit<IClause, 'startIndex' | 'endIndex'>[]> {
  const prompt = `You are an expert legal document analyst. Extract all significant clauses from the following legal document.

For each clause, identify:
1. type: One of confidentiality, termination, liability, indemnification, payment, intellectual_property, warranty, force_majeure, dispute_resolution, governing_law, assignment, amendment, notice, severability, entire_agreement, other
2. title: A clear, descriptive title for the clause
3. content: The actual clause text (can be abbreviated if very long, but capture key terms)
4. risk: low, medium, or high based on potential legal/business risk
5. riskFactors: Array of specific risks (e.g., "unlimited liability", "one-sided termination", "broad indemnification")
6. recommendations: Array of suggestions to mitigate risks

Return a JSON array of clauses:
[
  {
    "id": "clause-1",
    "type": "confidentiality",
    "title": "Confidentiality Obligations",
    "content": "The Receiving Party agrees to hold all Confidential Information in strict confidence...",
    "risk": "low",
    "riskFactors": ["Standard confidentiality clause"],
    "recommendations": ["Consider adding time limitations on confidentiality obligations"]
  }
]

Document:
${content.substring(0, 12000)}

Return ONLY the JSON array, no additional text.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse clauses from response');
    }

    const clauses = JSON.parse(jsonMatch[0]) as Omit<IClause, 'startIndex' | 'endIndex'>[];

    return clauses.map((clause, index) => ({
      ...clause,
      id: clause.id || `clause_${documentId}_${index + 1}`
    }));
  } catch (error) {
    logger.error('Claude clause extraction failed', { error });
    // Fallback to pattern-based extraction
    return extractClausesWithPatterns(content, documentId);
  }
}

/**
 * Fallback pattern-based clause extraction
 */
function extractClausesWithPatterns(content: string, documentId: string): Omit<IClause, 'startIndex' | 'endIndex'>[] {
  const clauses: Omit<IClause, 'startIndex' | 'endIndex'>[] = [];
  const sectionHeaders = content.match(/^[A-Z][A-Za-z\s]+(?:CLAUSE|SECTION|ARTICLE|PARAGRAPH|\d+\.)/gm) || [];

  for (const header of sectionHeaders) {
    const type = identifyClauseType(header);
    if (type) {
      const id = `clause_${documentId}_${clauses.length + 1}`;
      clauses.push({
        id,
        type: type as IClause['type'],
        title: header.trim(),
        content: extractSectionContent(content, header),
        risk: 'low',
        riskScore: 10,
        riskFactors: [],
        recommendations: [],
        complianceMappings: []
      });
    }
  }

  return clauses;
}

/**
 * Identify clause type from header/title
 */
function identifyClauseType(header: string): string | null {
  const lowerHeader = header.toLowerCase();

  for (const [type, patterns] of Object.entries(CLAUSE_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerHeader)) {
        return type;
      }
    }
  }

  return null;
}

/**
 * Extract content for a section
 */
function extractSectionContent(content: string, header: string): string {
  const headerIndex = content.indexOf(header);
  if (headerIndex === -1) return '';

  // Find next section header or use remaining content
  const remaining = content.substring(headerIndex + header.length);
  const nextSectionMatch = remaining.match(/^[A-Z][A-Za-z\s]+(?:CLAUSE|SECTION|ARTICLE|\d+\.)/m);

  if (nextSectionMatch) {
    const nextSectionIndex = remaining.indexOf(nextSectionMatch[0]);
    return remaining.substring(0, nextSectionIndex).trim();
  }

  return remaining.trim().substring(0, 2000);
}

/**
 * Add positional information to clauses
 */
function addClausePositions(
  content: string,
  clauses: Omit<IClause, 'startIndex' | 'endIndex'>[]
): IClause[] {
  return clauses.map(clause => {
    // Find the first occurrence of the clause content in the document
    const startIndex = content.indexOf(clause.content.substring(0, 100));
    const endIndex = startIndex >= 0 ? startIndex + clause.content.length : 0;

    return {
      ...clause,
      startIndex: Math.max(0, startIndex),
      endIndex: Math.min(content.length, endIndex)
    };
  });
}

/**
 * Get clause by ID
 */
export function getClauseById(clauses: IClause[], clauseId: string): IClause | undefined {
  return clauses.find(c => c.id === clauseId);
}

/**
 * Get clauses by type
 */
export function getClausesByType(clauses: IClause[], type: string): IClause[] {
  return clauses.filter(c => c.type === type);
}

/**
 * Get clauses by risk level
 */
export function getClausesByRiskLevel(clauses: IClause[], risk: 'low' | 'medium' | 'high'): IClause[] {
  return clauses.filter(c => c.risk === risk);
}

/**
 * Search clauses by keyword
 */
export function searchClauses(clauses: IClause[], keyword: string): IClause[] {
  const lowerKeyword = keyword.toLowerCase();
  return clauses.filter(clause =>
    clause.title.toLowerCase().includes(lowerKeyword) ||
    clause.content.toLowerCase().includes(lowerKeyword) ||
    clause.riskFactors.some(f => f.toLowerCase().includes(lowerKeyword))
  );
}

export default {
  extractClauses,
  getClauseById,
  getClausesByType,
  getClausesByRiskLevel,
  searchClauses
};
