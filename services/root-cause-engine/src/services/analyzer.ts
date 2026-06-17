import { v4 as uuidv4 } from 'uuid';
import {
  ComplaintData,
  RootCauseAnalysis,
  AnalysisResponse,
  CausalChain,
  ContributingFactor,
  Recommendation,
  SimilarCase,
  ConfidenceLevel,
  ImpactLevel,
  Severity
} from '../types';
import { Analysis, CausalChainModel, Factor, RecommendationModel } from '../models';
import { PatternDetector } from './patternDetector';
import { ChainBuilder } from './chainBuilder';
import { FactorAnalyzer } from './factorAnalyzer';
import { RecommendationGenerator } from './recommendationGenerator';

export class RootCauseAnalyzer {
  private patternDetector: PatternDetector;
  private chainBuilder: ChainBuilder;
  private factorAnalyzer: FactorAnalyzer;
  private recommendationGenerator: RecommendationGenerator;

  constructor() {
    this.patternDetector = new PatternDetector();
    this.chainBuilder = new ChainBuilder();
    this.factorAnalyzer = new FactorAnalyzer();
    this.recommendationGenerator = new RecommendationGenerator();
  }

  async analyze(
    tenantId: string,
    complaints: ComplaintData[],
    options?: { depth?: number; includeHistorical?: boolean; similarityThreshold?: number }
  ): Promise<AnalysisResponse> {
    const startTime = Date.now();
    const analysisId = uuidv4();

    // Step 1: Create analysis record
    const analysis = new Analysis({
      analysisId,
      tenantId,
      complaintIds: complaints.map(c => c.id || uuidv4()),
      summary: '',
      primaryRootCause: '',
      similarCases: [],
      status: 'in_progress'
    });
    await analysis.save();

    try {
      // Step 2: Detect patterns in complaints
      const patterns = this.patternDetector.detectPatterns(complaints);

      // Step 3: Build causal chains
      const causalChain = await this.chainBuilder.buildChain(
        analysisId,
        tenantId,
        complaints,
        options?.depth || 3
      );

      // Step 4: Analyze contributing factors
      const factors = await this.factorAnalyzer.analyzeFactors(
        analysisId,
        tenantId,
        complaints,
        causalChain
      );

      // Step 5: Generate recommendations
      const recommendations = await this.recommendationGenerator.generate(
        analysisId,
        tenantId,
        factors,
        causalChain
      );

      // Step 6: Find similar historical cases
      let similarCases: SimilarCase[] = [];
      if (options?.includeHistorical !== false) {
        similarCases = await this.findSimilarCases(
          tenantId,
          causalChain.primaryRootCause,
          options?.similarityThreshold || 70
        );
      }

      // Calculate metrics
      const totalAffectedUsers = complaints.reduce((sum, c) => sum + c.affectedUsers, 0);
      const totalRevenueImpact = complaints.reduce((sum, c) => sum + (c.revenueImpact || 0), 0);

      // Determine confidence and impact
      const confidence = this.calculateConfidence(causalChain, factors);
      const impact = this.calculateImpact(totalAffectedUsers, totalRevenueImpact);

      // Generate summary
      const summary = this.generateSummary(
        complaints.length,
        causalChain,
        factors,
        recommendations,
        totalAffectedUsers,
        totalRevenueImpact
      );

      // Update analysis record
      await Analysis.findOneAndUpdate(
        { analysisId },
        {
          causalChainId: causalChain.causalChainId,
          factorIds: factors.map(f => f.factorId),
          recommendationIds: recommendations.map(r => r.recommendationId),
          summary,
          primaryRootCause: causalChain.primaryRootCause,
          confidence,
          impact,
          totalAffectedUsers,
          totalRevenueImpact,
          similarCases,
          status: 'completed',
          completedAt: new Date()
        }
      );

      const processingTime = Date.now() - startTime;

      return {
        analysisId,
        causalChain,
        factors,
        recommendations,
        similarCases,
        summary,
        metadata: {
          totalComplaints: complaints.length,
          totalAffectedUsers,
          totalRevenueImpact,
          confidence,
          processingTimeMs: processingTime
        }
      };
    } catch (error) {
      // Mark analysis as failed
      await Analysis.findOneAndUpdate(
        { analysisId },
        { status: 'failed' }
      );
      throw error;
    }
  }

  private calculateConfidence(chain: CausalChain, factors: ContributingFactor[]): ConfidenceLevel {
    const chainStrength = chain.chainStrength;
    const avgFactorImpact = factors.length > 0
      ? factors.reduce((sum, f) => sum + f.impact, 0) / factors.length
      : 0;

    const confidenceScore = (chainStrength * 0.6) + (avgFactorImpact * 0.4);

    if (confidenceScore >= 75) return 'high';
    if (confidenceScore >= 50) return 'medium';
    return 'low';
  }

  private calculateImpact(users: number, revenue: number): ImpactLevel {
    const score = (users * 0.4) + (revenue * 0.0001);

    if (score >= 10000) return 'severe';
    if (score >= 1000) return 'significant';
    if (score >= 100) return 'moderate';
    return 'minimal';
  }

  private generateSummary(
    complaintCount: number,
    chain: CausalChain,
    factors: ContributingFactor[],
    recommendations: Recommendation[],
    affectedUsers: number,
    revenueImpact: number
  ): string {
    const controllableFactors = factors.filter(f => f.controllability === 'controllable');
    const uncontrollableFactors = factors.filter(f => f.controllability === 'uncontrollable');

    return `Analysis of ${complaintCount} complaint(s) affecting ${affectedUsers} users ` +
      `with estimated revenue impact of $${revenueImpact.toLocaleString()}. ` +
      `Primary root cause identified as: ${chain.primaryRootCause}. ` +
      `Found ${factors.length} contributing factors (${controllableFactors.length} controllable, ` +
      `${uncontrollableFactors.length} uncontrollable). ` +
      `Generated ${recommendations.length} actionable recommendations ` +
      `with chain strength of ${chain.chainStrength}%.`;
  }

  private async findSimilarCases(
    tenantId: string,
    rootCause: string,
    threshold: number
  ): Promise<SimilarCase[]> {
    const similarAnalyses = await Analysis.find({
      tenantId,
      status: 'completed',
      primaryRootCause: { $regex: rootCause.split(' ')[0], $options: 'i' }
    })
      .sort({ createdAt: -1 })
      .limit(5);

    return similarAnalyses.map(a => ({
      analysisId: a.analysisId,
      title: a.summary.substring(0, 100),
      rootCause: a.primaryRootCause,
      similarity: this.calculateSimilarity(rootCause, a.primaryRootCause),
      resolution: a.similarCases[0]?.resolution
    }))
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(' '));
    const words2 = new Set(str2.toLowerCase().split(' '));
    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;
    return Math.round((intersection / union) * 100);
  }

  async getAnalysis(analysisId: string): Promise<RootCauseAnalysis | null> {
    return Analysis.findOne({ analysisId });
  }

  async getAnalysisHistory(
    tenantId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: RootCauseAnalysis[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      Analysis.find({ tenantId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Analysis.countDocuments({ tenantId })
    ]);

    return { items, total };
  }
}
