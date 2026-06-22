import Anthropic from '@anthropic-ai/sdk';
import { ClauseModel, IStandardClause } from '../models/Clause';
import { IClause } from '../models/DocumentAnalysis';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

export interface RagSearchOptions {
  query: string;
  tenantId?: string;
  clauseType?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  limit?: number;
  similarityThreshold?: number;
}

export interface ClauseMatch {
  standardClause: IStandardClause;
  similarity: number;
  matchedClause?: IClause;
  differences: string[];
  recommendations: string[];
}

export interface RagSearchResult {
  query: string;
  matches: ClauseMatch[];
  totalMatches: number;
  searchTime: number;
}

/**
 * Search standard clause library using semantic similarity
 */
export async function searchStandardClauses(
  options: RagSearchOptions
): Promise<RagSearchResult> {
  const startTime = Date.now();
  const { query, clauseType, riskLevel, limit = 5 } = options;

  logger.info('Searching standard clauses', { query, clauseType, riskLevel });

  try {
    // Build MongoDB query
    const dbQuery: Record<string, unknown> = { isActive: true };

    if (clauseType) {
      dbQuery.type = clauseType;
    }

    if (riskLevel) {
      dbQuery.riskLevel = riskLevel;
    }

    // Get all matching standard clauses
    const standardClauses = await ClauseModel.find(dbQuery).limit(100).lean();

    if (standardClauses.length === 0) {
      return {
        query,
        matches: [],
        totalMatches: 0,
        searchTime: Date.now() - startTime
      };
    }

    // Calculate semantic similarity using embeddings or keyword matching
    const matches = await calculateClauseSimilarity(query, standardClauses, limit);

    logger.info('Clause search completed', {
      query,
      totalMatches: matches.length,
      searchTime: Date.now() - startTime
    });

    return {
      query,
      matches,
      totalMatches: matches.length,
      searchTime: Date.now() - startTime
    };
  } catch (error) {
    logger.error('Clause search failed', { error, query });
    throw new Error(`Clause search failed: ${(error as Error).message}`);
  }
}

/**
 * Calculate similarity between query and standard clauses
 */
async function calculateClauseSimilarity(
  query: string,
  standardClauses: IStandardClause[],
  limit: number
): Promise<ClauseMatch[]> {
  // Use Claude to find the best matching clauses
  const prompt = `Given the following search query, find the most relevant standard clauses from the list provided.

Search Query: "${query}"

Standard Clauses:
${standardClauses.map((clause, index) => `
[${index}] Type: ${clause.type}
Title: ${clause.title}
Summary: ${clause.summary}
Risk Level: ${clause.riskLevel}
Keywords: ${clause.keywords.join(', ')}
`).join('\n')}

For each clause, provide:
1. The index number (0-${standardClauses.length - 1})
2. A similarity score from 0 to 1
3. Key differences if any
4. Recommendations

Return as JSON array:
[
  {
    "index": 0,
    "similarity": 0.85,
    "differences": ["The standard clause has a 2-year limitation"],
    "recommendations": ["Consider adding mutual confidentiality"]
  }
]

Only include clauses with similarity >= 0.3. Sort by similarity descending. Return top ${limit} matches.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Fallback to keyword matching
      return fallbackKeywordMatching(query, standardClauses, limit);
    }

    const similarityResults = JSON.parse(jsonMatch[0]) as Array<{
      index: number;
      similarity: number;
      differences: string[];
      recommendations: string[];
    }>;

    return similarityResults
      .filter(result => result.index >= 0 && result.index < standardClauses.length)
      .map(result => ({
        standardClause: standardClauses[result.index] as unknown as IStandardClause,
        similarity: result.similarity,
        differences: result.differences,
        recommendations: result.recommendations
      }))
      .slice(0, limit);
  } catch (error) {
    logger.warn('Claude similarity calculation failed, using keyword fallback', { error });
    return fallbackKeywordMatching(query, standardClauses, limit);
  }
}

/**
 * Fallback keyword-based matching
 */
function fallbackKeywordMatching(
  query: string,
  standardClauses: IStandardClause[],
  limit: number
): ClauseMatch[] {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const scoredClauses = standardClauses.map(clause => {
    const titleWords = clause.title.toLowerCase().split(/\s+/);
    const summaryWords = clause.summary.toLowerCase().split(/\s+/);
    const keywordWords = clause.keywords.join(' ').toLowerCase().split(/\s+/);
    const allWords = [...titleWords, ...summaryWords, ...keywordWords];

    let matchCount = 0;
    for (const queryWord of queryWords) {
      if (allWords.some(w => w.includes(queryWord) || queryWord.includes(w))) {
        matchCount++;
      }
    }

    const similarity = queryWords.length > 0 ? matchCount / queryWords.length : 0;

    return {
      standardClause: clause,
      similarity: Math.min(1, similarity),
      differences: [],
      recommendations: []
    };
  });

  return scoredClauses
    .filter(c => c.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Compare a document clause against standard clauses
 */
export async function compareClauseToStandard(
  clause: IClause,
  options: { tenantId?: string; clauseType?: string } = {}
): Promise<ClauseMatch | null> {
  const { clauseType } = options;

  // Search for matching standard clauses
  const searchResult = await searchStandardClauses({
    query: clause.content,
    tenantId: options.tenantId,
    clauseType: clauseType || clause.type,
    limit: 1
  });

  if (searchResult.matches.length === 0) {
    return null;
  }

  const bestMatch = searchResult.matches[0];

  // Get detailed differences
  const differences = await analyzeClauseDifferences(clause, bestMatch.standardClause);

  return {
    ...bestMatch,
    matchedClause: clause,
    differences,
    recommendations: generateComparisonRecommendations(clause, bestMatch.standardClause)
  };
}

/**
 * Analyze differences between a clause and standard clause
 */
async function analyzeClauseDifferences(
  clause: IClause,
  standardClause: IStandardClause
): Promise<string[]> {
  const differences: string[] = [];

  // Compare risk levels
  if (clause.risk !== standardClause.riskLevel) {
    differences.push(
      `Risk level differs: Document is ${clause.risk}, standard is ${standardClause.riskLevel}`
    );
  }

  // Use Claude to identify specific differences
  const prompt = `Compare the following two clauses and identify specific differences:

Document Clause:
Type: ${clause.type}
Title: ${clause.title}
Content: ${clause.content.substring(0, 1000)}
Risk Factors: ${clause.riskFactors.join(', ')}

Standard Clause:
Type: ${standardClause.type}
Title: ${standardClause.title}
Content: ${standardClause.content.substring(0, 1000)}
Risk Factors: ${standardClause.riskFactors.join(', ')}

Return a JSON array of specific differences:
["Difference 1", "Difference 2", ...]`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = response.content[0];
    if (textContent.type === 'text') {
      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedDiffs = JSON.parse(jsonMatch[0]) as string[];
        differences.push(...parsedDiffs);
      }
    }
  } catch (error) {
    logger.warn('Claude difference analysis failed', { error });
  }

  return [...new Set(differences)];
}

/**
 * Generate recommendations based on comparison
 */
function generateComparisonRecommendations(
  clause: IClause,
  standardClause: IStandardClause
): string[] {
  const recommendations: string[] = [];

  // Risk-based recommendations
  if (clause.riskScore > 70 && standardClause.riskLevel === 'low') {
    recommendations.push('This clause has higher risk than standard. Consider negotiating more favorable terms.');
  }

  // Add standard clause recommendations
  recommendations.push(...standardClause.recommendations);

  // Add specific recommendations from risk factors
  for (const riskFactor of clause.riskFactors) {
    if (!standardClause.riskFactors.includes(riskFactor)) {
      recommendations.push(`Additional risk identified: ${riskFactor}`);
    }
  }

  return [...new Set(recommendations)].slice(0, 5);
}

/**
 * Add a clause to the standard library
 */
export async function addToClauseLibrary(
  clause: Partial<IStandardClause>,
  tenantId: string
): Promise<IStandardClause> {
  const clauseId = `std_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

  const newClause = new ClauseModel({
    ...clause,
    clauseId,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await newClause.save();

  logger.info('Clause added to library', { clauseId, tenantId });

  return newClause.toObject();
}

/**
 * Get standard clause by ID
 */
export async function getStandardClause(clauseId: string): Promise<IStandardClause | null> {
  const clause = await ClauseModel.findOne({ clauseId, isActive: true }).lean();
  return clause as IStandardClause | null;
}

/**
 * List standard clauses with filtering
 */
export async function listStandardClauses(options: {
  type?: string;
  riskLevel?: string;
  page?: number;
  limit?: number;
}): Promise<{ clauses: IStandardClause[]; total: number }> {
  const { type, riskLevel, page = 1, limit = 20 } = options;

  const query: Record<string, unknown> = { isActive: true };

  if (type) {
    query.type = type;
  }

  if (riskLevel) {
    query.riskLevel = riskLevel;
  }

  const [clauses, total] = await Promise.all([
    ClauseModel.find(query).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).lean(),
    ClauseModel.countDocuments(query)
  ]);

  return {
    clauses: clauses as unknown as IStandardClause[],
    total
  };
}

/**
 * Initialize standard clause library with default clauses
 */
export async function initializeClauseLibrary(): Promise<void> {
  const existingCount = await ClauseModel.countDocuments({ isActive: true });

  if (existingCount > 0) {
    logger.info('Clause library already initialized', { count: existingCount });
    return;
  }

  const defaultClauses: Partial<IStandardClause>[] = [
    {
      clauseId: 'std_conf_001',
      title: 'Standard Confidentiality Clause',
      type: 'confidentiality',
      content: 'Each party agrees to hold all Confidential Information received from the other party in strict confidence and not to disclose such information to any third parties without prior written consent. This obligation shall survive termination of this Agreement for a period of three (3) years.',
      summary: 'Standard mutual confidentiality obligation with 3-year survival period.',
      keywords: ['confidential', 'non-disclosure', 'confidentiality', 'proprietary'],
      riskLevel: 'low',
      riskFactors: ['Standard industry clause'],
      recommendations: ['Ensure clear definition of Confidential Information', 'Add carve-outs for legally required disclosures'],
      complianceMappings: [{ framework: 'GDPR', isCompliant: true, notes: 'Includes standard data protection terms' }],
      jurisdiction: ['US', 'EU']
    },
    {
      clauseId: 'std_term_001',
      title: 'Standard Termination Clause',
      type: 'termination',
      content: 'Either party may terminate this Agreement upon thirty (30) days prior written notice to the other party. Upon termination, all rights and obligations shall cease except those that by their nature should survive, including payment obligations, confidentiality, and indemnification.',
      summary: 'Mutual termination rights with 30-day notice period and standard survival provisions.',
      keywords: ['termination', 'notice', 'terminate', 'cancel'],
      riskLevel: 'low',
      riskFactors: ['Moderate notice period', 'Standard survival provisions'],
      recommendations: ['Consider adding termination for cause provisions', 'Include transition assistance obligations'],
      complianceMappings: [{ framework: 'SOC2', isCompliant: true }],
      jurisdiction: ['US']
    },
    {
      clauseId: 'std_liab_001',
      title: 'Limitation of Liability Clause',
      type: 'liability',
      content: 'IN NO EVENT SHALL EITHER PARTY BE LIABLE TO THE OTHER FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. EACH PARTY\'S TOTAL CUMULATIVE LIABILITY SHALL NOT EXCEED THE AMOUNTS PAID OR PAYABLE UNDER THIS AGREEMENT IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.',
      summary: 'Mutual limitation of liability capped at 12 months of fees, excluding indirect damages.',
      keywords: ['liability', 'limitation', 'damages', 'cap'],
      riskLevel: 'medium',
      riskFactors: ['Liability cap may be favorable to one party', 'Exclusion of consequential damages'],
      recommendations: ['Ensure mutual application', 'Consider carve-outs for willful misconduct and IP infringement'],
      complianceMappings: [
        { framework: 'SOC2', isCompliant: true },
        { framework: 'GDPR', isCompliant: true, notes: 'Standard liability limitations apply' }
      ],
      jurisdiction: ['US', 'EU']
    },
    {
      clauseId: 'std_ind_001',
      title: 'Standard Indemnification Clause',
      type: 'indemnification',
      content: 'Each party agrees to indemnify, defend, and hold harmless the other party from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys\' fees) arising out of or related to the indemnifying party\'s breach of this Agreement or negligent or wrongful acts or omissions.',
      summary: 'Mutual indemnification for breach and negligence with standard scope.',
      keywords: ['indemnify', 'defend', 'hold harmless', 'indemnification'],
      riskLevel: 'medium',
      riskFactors: ['Broad indemnification scope', 'Includes attorney fees'],
      recommendations: ['Add notice requirements', 'Include cooperation obligations', 'Consider mutual indemnification structure'],
      complianceMappings: [{ framework: 'GDPR', isCompliant: true, notes: 'Standard indemnification terms' }],
      jurisdiction: ['US']
    }
  ];

  await ClauseModel.insertMany(defaultClauses.map(c => ({
    ...c,
    createdAt: new Date(),
    updatedAt: new Date()
  })));

  logger.info('Clause library initialized with default clauses', { count: defaultClauses.length });
}

export default {
  searchStandardClauses,
  compareClauseToStandard,
  addToClauseLibrary,
  getStandardClause,
  listStandardClauses,
  initializeClauseLibrary
};
