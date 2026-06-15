// ============================================================================
// SWOT Analyzer Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { SwotAnalysis } from '../types';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';

export class SwotAnalyzerService {
  private analyses: Map<string, SwotAnalysis> = new Map();

  /**
   * Generate a SWOT analysis from context
   */
  generate(context: string, options?: {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
  }): SwotAnalysis {
    const id = uuidv4();
    const analysis: SwotAnalysis = {
      id,
      context,
      strengths: options?.strengths || this.extractStrengths(context),
      weaknesses: options?.weaknesses || this.extractWeaknesses(context),
      opportunities: options?.opportunities || this.extractOpportunities(context),
      threats: options?.threats || this.extractThreats(context),
      recommendations: this.generateRecommendations(
        options?.strengths || this.extractStrengths(context),
        options?.weaknesses || this.extractWeaknesses(context),
        options?.opportunities || this.extractOpportunities(context),
        options?.threats || this.extractThreats(context),
      ),
      createdAt: new Date(),
    };
    this.analyses.set(id, analysis);
    logger.info(`[SWOTAnalyzer] Generated analysis ${id} for context: ${context.substring(0, 50)}...`);
    return analysis;
  }

  getById(id: string): SwotAnalysis {
    const a = this.analyses.get(id);
    if (!a) throw new NotFoundError(`SWOT analysis ${id}`);
    return a;
  }

  getAll(): SwotAnalysis[] {
    return Array.from(this.analyses.values());
  }

  /**
   * Extract strengths using keyword analysis
   */
  private extractStrengths(context: string): string[] {
    const lower = context.toLowerCase();
    const strengths: string[] = [];
    if (lower.includes('leader') || lower.includes('leading')) strengths.push('Market leadership position');
    if (lower.includes('experienced') || lower.includes('expert')) strengths.push('Experienced team and expertise');
    if (lower.includes('innovative') || lower.includes('patent')) strengths.push('Innovation and IP advantage');
    if (lower.includes('customer') && lower.includes('loyal')) strengths.push('Strong customer loyalty');
    if (lower.includes('scale')) strengths.push('Operational scale');
    if (lower.includes('brand')) strengths.push('Strong brand recognition');
    if (strengths.length === 0) strengths.push('Identified positive attributes in context');
    return strengths;
  }

  /**
   * Extract weaknesses
   */
  private extractWeaknesses(context: string): string[] {
    const lower = context.toLowerCase();
    const weaknesses: string[] = [];
    if (lower.includes('legacy') || lower.includes('old')) weaknesses.push('Legacy systems/technology debt');
    if (lower.includes('turnover') || lower.includes('attrition')) weaknesses.push('High employee turnover');
    if (lower.includes('limited') || lower.includes('constrained')) weaknesses.push('Resource constraints');
    if (lower.includes('lack') || lower.includes('missing')) weaknesses.push('Capability gaps');
    if (lower.includes('expensive') || lower.includes('costly')) weaknesses.push('High cost structure');
    if (weakenessesExist(lower)) weaknesses.push('Process inefficiencies');
    if (weaknesses.length === 0) weaknesses.push('Areas needing improvement identified');
    return weaknesses;
  }

  /**
   * Extract opportunities
   */
  private extractOpportunities(context: string): string[] {
    const lower = context.toLowerCase();
    const opportunities: string[] = [];
    if (lower.includes('market') && (lower.includes('grow') || lower.includes('expand'))) opportunities.push('Market expansion potential');
    if (lower.includes('new') && lower.includes('product')) opportunities.push('New product development');
    if (lower.includes('partner') || lower.includes('alliance')) opportunities.push('Strategic partnerships');
    if (lower.includes('ai') || lower.includes('digital')) opportunities.push('Digital transformation potential');
    if (lower.includes('emerging')) opportunities.push('Emerging market entry');
    if (opportunities.length === 0) opportunities.push('Growth opportunities identified in context');
    return opportunities;
  }

  /**
   * Extract threats
   */
  private extractThreats(context: string): string[] {
    const lower = context.toLowerCase();
    const threats: string[] = [];
    if (lower.includes('competit')) threats.push('Competitive pressure');
    if (lower.includes('regulation') || lower.includes('compliance')) threats.push('Regulatory changes');
    if (lower.includes('recession') || lower.includes('downturn')) threats.push('Economic downturn risk');
    if (lower.includes('disrupt')) threats.push('Market disruption');
    if (lower.includes('cyber') || lower.includes('security')) threats.push('Cybersecurity threats');
    if (lower.includes('talent') || lower.includes('shortage')) threats.push('Talent shortage');
    if (threats.length === 0) threats.push('External risks identified in context');
    return threats;
  }

  /**
   * Generate strategic recommendations from SWOT
   */
  private generateRecommendations(strengths: string[], weaknesses: string[], opportunities: string[], threats: string[]): string[] {
    const recommendations: string[] = [];
    if (strengths.length > 0 && opportunities.length > 0) {
      recommendations.push('SO Strategy: Leverage strengths to capitalize on opportunities');
    }
    if (weaknesses.length > 0 && opportunities.length > 0) {
      recommendations.push('WO Strategy: Address weaknesses to pursue opportunities');
    }
    if (strengths.length > 0 && threats.length > 0) {
      recommendations.push('ST Strategy: Use strengths to mitigate threats');
    }
    if (weaknesses.length > 0 && threats.length > 0) {
      recommendations.push('WT Strategy: Defend against threats by addressing weaknesses');
    }
    recommendations.push('Quarterly review and update of SWOT analysis');
    recommendations.push('Assign owners for each strategic recommendation');
    return recommendations;
  }
}

function weakenessesExist(_lower: string): boolean {
  return true; // Simple heuristic
}

export const swotAnalyzerService = new SwotAnalyzerService();
export default swotAnalyzerService;
