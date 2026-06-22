import Anthropic from '@anthropic-ai/sdk';
import { IClause } from '../models/DocumentAnalysis';
import logger from '../utils/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096');

export interface SummaryOptions {
  documentId: string;
  content: string;
  type?: 'brief' | 'detailed' | 'executive';
  focus?: string[];
  includeClauses?: boolean;
  tenantId?: string;
}

export interface DocumentSummary {
  documentId: string;
  title: string;
  type: 'brief' | 'detailed' | 'executive';
  overview: string;
  keyTerms: KeyTerm[];
  parties: string[];
  effectiveDate?: string;
  expirationDate?: string;
  obligations: Obligation[];
  risks: RiskSummary[];
  recommendations: string[];
  complianceHighlights: ComplianceHighlight[];
  generatedAt: Date;
  confidence: number;
}

export interface KeyTerm {
  term: string;
  definition: string;
  importance: 'high' | 'medium' | 'low';
}

export interface Obligation {
  party: string;
  description: string;
  type: 'payment' | 'performance' | 'confidentiality' | 'reporting' | 'other';
  dueDate?: string;
}

export interface RiskSummary {
  clauseId?: string;
  description: string;
  level: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface ComplianceHighlight {
  framework: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  description: string;
}

/**
 * Generate a comprehensive document summary
 */
export async function generateSummary(options: SummaryOptions): Promise<DocumentSummary> {
  const { documentId, content, type = 'detailed', focus, includeClauses = true, tenantId } = options;
  const startTime = Date.now();

  logger.info('Generating document summary', { documentId, type, tenantId });

  try {
    let summary: DocumentSummary;

    switch (type) {
      case 'brief':
        summary = await generateBriefSummary(documentId, content, tenantId);
        break;
      case 'executive':
        summary = await generateExecutiveSummary(documentId, content, focus, tenantId);
        break;
      case 'detailed':
      default:
        summary = await generateDetailedSummary(documentId, content, includeClauses, tenantId);
        break;
    }

    logger.info('Summary generated', {
      documentId,
      type,
      duration: Date.now() - startTime,
      confidence: summary.confidence
    });

    return summary;
  } catch (error) {
    logger.error('Summary generation failed', { documentId, error });
    throw new Error(`Summary generation failed: ${(error as Error).message}`);
  }
}

/**
 * Generate a brief summary (1-2 paragraphs)
 */
async function generateBriefSummary(
  documentId: string,
  content: string,
  tenantId?: string
): Promise<DocumentSummary> {
  const prompt = `Provide a brief summary of the following legal document in 2-3 paragraphs.

Focus on:
1. What is the document (type, purpose)
2. Who are the key parties
3. What are the main obligations or key terms
4. Any notable risks or concerns

Return as JSON:
{
  "overview": "Brief summary (2-3 paragraphs)",
  "keyParties": ["Party 1", "Party 2"],
  "effectiveDate": "if found, otherwise null",
  "expirationDate": "if found, otherwise null",
  "confidence": 0.85
}

Document:
${content.substring(0, 8000)}

Return ONLY the JSON object.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content[0];
  if (textContent.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return {
    documentId,
    title: 'Document Summary',
    type: 'brief',
    overview: parsed.overview || 'Summary not available',
    keyTerms: [],
    parties: parsed.keyParties || [],
    effectiveDate: parsed.effectiveDate || undefined,
    expirationDate: parsed.expirationDate || undefined,
    obligations: [],
    risks: [],
    recommendations: [],
    complianceHighlights: [],
    generatedAt: new Date(),
    confidence: parsed.confidence || 0.7
  };
}

/**
 * Generate a detailed summary with full breakdown
 */
async function generateDetailedSummary(
  documentId: string,
  content: string,
  includeClauses: boolean,
  tenantId?: string
): Promise<DocumentSummary> {
  const prompt = `Provide a comprehensive summary of the following legal document.

Return as JSON with this exact structure:
{
  "overview": "Comprehensive 3-4 paragraph overview of the document",
  "keyParties": ["All parties mentioned"],
  "effectiveDate": "if found, otherwise null",
  "expirationDate": "if found, otherwise null",
  "keyTerms": [
    {"term": "Term name", "definition": "What it means", "importance": "high|medium|low"}
  ],
  "obligations": [
    {"party": "Party name", "description": "What they must do", "type": "payment|performance|confidentiality|reporting|other", "dueDate": "if specified"}
  ],
  "risks": [
    {"description": "Risk description", "level": "high|medium|low", "recommendation": "How to address"}
  ],
  "recommendations": ["Key recommendations for review"],
  "complianceHighlights": [
    {"framework": "GDPR|SOC2|etc", "status": "compliant|non_compliant|partial|not_applicable", "description": "Brief description"}
  ],
  "confidence": 0.9
}

Document:
${content.substring(0, 12000)}

Return ONLY the JSON object.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content[0];
  if (textContent.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return {
    documentId,
    title: 'Document Summary',
    type: 'detailed',
    overview: parsed.overview || 'Summary not available',
    keyTerms: parsed.keyTerms || [],
    parties: parsed.keyParties || [],
    effectiveDate: parsed.effectiveDate || undefined,
    expirationDate: parsed.expirationDate || undefined,
    obligations: (parsed.obligations || []).map((o: any) => ({
      party: o.party,
      description: o.description,
      type: o.type || 'other',
      dueDate: o.dueDate
    })),
    risks: (parsed.risks || []).map((r: any) => ({
      description: r.description,
      level: r.level || 'medium',
      recommendation: r.recommendation || ''
    })),
    recommendations: parsed.recommendations || [],
    complianceHighlights: (parsed.complianceHighlights || []).map((c: any) => ({
      framework: c.framework,
      status: c.status || 'not_applicable',
      description: c.description || ''
    })),
    generatedAt: new Date(),
    confidence: parsed.confidence || 0.8
  };
}

/**
 * Generate executive summary focused on decision-making
 */
async function generateExecutiveSummary(
  documentId: string,
  content: string,
  focus?: string[],
  tenantId?: string
): Promise<DocumentSummary> {
  const focusText = focus ? `\nFocus areas: ${focus.join(', ')}` : '';

  const prompt = `Generate an executive summary of this legal document for business decision-makers.${focusText}

Return as JSON:
{
  "overview": "Executive summary (2 paragraphs) - What is this, why does it matter, and what action is recommended",
  "keyParties": ["Key parties"],
  "effectiveDate": "if found",
  "expirationDate": "if found",
  "keyTerms": [
    {"term": "Important term", "definition": "Brief definition", "importance": "high"}
  ],
  "obligations": [
    {"party": "Party", "description": "Key obligation", "type": "payment|performance|confidentiality|other"}
  ],
  "risks": [
    {"description": "Risk summary", "level": "high|medium|low", "recommendation": "Recommended action"}
  ],
  "recommendations": ["Top 3-5 action items or recommendations"],
  "confidence": 0.9
}

Document:
${content.substring(0, 10000)}

Return ONLY the JSON object.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1536,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content[0];
  if (textContent.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return {
    documentId,
    title: 'Executive Summary',
    type: 'executive',
    overview: parsed.overview || 'Executive summary not available',
    keyTerms: (parsed.keyTerms || []).filter((t: any) => t.importance === 'high'),
    parties: parsed.keyParties || [],
    effectiveDate: parsed.effectiveDate || undefined,
    expirationDate: parsed.expirationDate || undefined,
    obligations: (parsed.obligations || []).slice(0, 5),
    risks: (parsed.risks || []).slice(0, 5),
    recommendations: (parsed.recommendations || []).slice(0, 5),
    complianceHighlights: [],
    generatedAt: new Date(),
    confidence: parsed.confidence || 0.85
  };
}

/**
 * Generate a summary from extracted clauses
 */
export async function generateSummaryFromClauses(
  documentId: string,
  clauses: IClause[],
  content: string,
  tenantId?: string
): Promise<DocumentSummary> {
  const clausesJson = JSON.stringify(clauses.map(c => ({
    type: c.type,
    title: c.title,
    risk: c.risk,
    riskFactors: c.riskFactors
  })));

  const prompt = `Generate a summary based on the following extracted clauses from a legal document.

Clauses:
${clausesJson}

Document content (excerpt):
${content.substring(0, 5000)}

Return as JSON:
{
  "overview": "Summary based on extracted clauses",
  "keyParties": ["Parties inferred from document"],
  "keyTerms": [
    {"term": "Term", "definition": "Definition", "importance": "high|medium|low"}
  ],
  "obligations": [
    {"party": "Party", "description": "Obligation", "type": "type"}
  ],
  "risks": [
    {"description": "Risk", "level": "high|medium|low", "recommendation": "Recommendation"}
  ],
  "recommendations": ["Recommendations"],
  "confidence": 0.75
}

Return ONLY the JSON object.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1536,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content[0];
  if (textContent.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return {
    documentId,
    title: 'Document Summary (from Clauses)',
    type: 'detailed',
    overview: parsed.overview || 'Summary based on clause analysis',
    keyTerms: parsed.keyTerms || [],
    parties: parsed.keyParties || [],
    effectiveDate: undefined,
    expirationDate: undefined,
    obligations: parsed.obligations || [],
    risks: parsed.risks || [],
    recommendations: parsed.recommendations || [],
    complianceHighlights: [],
    generatedAt: new Date(),
    confidence: parsed.confidence || 0.75
  };
}

export default {
  generateSummary,
  generateBriefSummary,
  generateDetailedSummary,
  generateExecutiveSummary,
  generateSummaryFromClauses
};
