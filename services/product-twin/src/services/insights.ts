import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { KnownIssue, IssueSeverity } from '../models/KnownIssue';
import { Part, PartStatus } from '../models/Part';
import { Documentation, DocType } from '../models/Documentation';
import { FAQ } from '../models/FAQ';
import { Specification } from '../models/Specification';

// Quality score weights
const QUALITY_WEIGHTS = {
  satisfaction: 0.25,
  returnRate: 0.20,
  resolutionTime: 0.15,
  documentation: 0.15,
  issues: 0.15,
  partsAvailability: 0.10
};

// AI Quality Score calculation
export interface QualityScore {
  overall: number;
  satisfactionScore: number;
  returnRateScore: number;
  resolutionTimeScore: number;
  documentationScore: number;
  issuesScore: number;
  partsAvailabilityScore: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  factors: {
    positive: string[];
    negative: string[];
    recommendations: string[];
  };
}

// Product insights
export interface ProductInsights {
  qualityScore: QualityScore;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highPriorityIssues: number;
    openIssues: number;
    resolvedIssues: number;
    averageResolutionDays: number;
    partsInStock: number;
    partsOutOfStock: number;
    documentationCount: number;
    faqCount: number;
    specificationCount: number;
  };
  trends: {
    issueFrequency: 'increasing' | 'stable' | 'decreasing';
    supportLoad: 'high' | 'medium' | 'low';
    qualityTrend: 'improving' | 'stable' | 'declining';
  };
  competitors?: {
    comparison: string;
    strengths: string[];
    weaknesses: string[];
  };
  generatedAt: Date;
}

// Calculate satisfaction score (0-100)
function calculateSatisfactionScore(satisfactionScore: number): number {
  // Convert 0-5 rating to 0-100
  return Math.round((satisfactionScore / 5) * 100);
}

// Calculate return rate score (0-100, lower is better)
function calculateReturnRateScore(returnRate: number): number {
  // Return rate is a percentage, lower is better
  // 0% return rate = 100 score, 20%+ = 0 score
  const score = Math.max(0, 100 - returnRate * 5);
  return Math.round(score);
}

// Calculate resolution time score (0-100, lower hours is better)
function calculateResolutionTimeScore(avgHours: number): number {
  // < 24 hours = 100, < 48 hours = 80, < 72 hours = 60, etc.
  if (avgHours <= 24) return 100;
  if (avgHours <= 48) return 80;
  if (avgHours <= 72) return 60;
  if (avgHours <= 168) return 40; // 1 week
  return 20;
}

// Calculate documentation score (0-100)
function calculateDocumentationScore(docCount: number, specCount: number): number {
  // Score based on completeness of documentation
  let score = 0;

  // Base score for having documentation
  score += Math.min(docCount * 10, 40);

  // Score for specifications
  score += Math.min(specCount * 2, 30);

  // Score for having manuals
  score += docCount >= 1 ? 15 : 0;

  // Score for having FAQs
  score += 15;

  return Math.min(score, 100);
}

// Calculate issues score (0-100, fewer issues is better)
function calculateIssuesScore(
  totalIssues: number,
  criticalIssues: number,
  highPriorityIssues: number,
  resolvedPercentage: number
): number {
  let score = 100;

  // Deduct for total issues
  score -= Math.min(totalIssues * 2, 30);

  // Deduct heavily for critical issues
  score -= criticalIssues * 15;

  // Deduct for high priority issues
  score -= highPriorityIssues * 5;

  // Bonus for high resolution rate
  score += Math.round(resolvedPercentage * 0.2);

  return Math.max(0, Math.min(score, 100));
}

// Calculate parts availability score (0-100)
function calculatePartsAvailabilityScore(
  totalParts: number,
  inStockParts: number
): number {
  if (totalParts === 0) return 100;
  return Math.round((inStockParts / totalParts) * 100);
}

// Determine grade from score
function getGrade(score: number): QualityScore['grade'] {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 65) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// Generate quality score for a product
export async function generateQualityScore(
  tenantId: string,
  productId: mongoose.Types.ObjectId
): Promise<QualityScore> {
  // Fetch all related data
  const [product, issues, parts, docs, specs, faqs] = await Promise.all([
    Product.findOne({ tenantId, _id: productId }),
    KnownIssue.find({ tenantId, productId }),
    Part.find({ tenantId, 'compatibleProducts.productId': productId }),
    Documentation.find({ tenantId, productId, isPublished: true }),
    Specification.find({ tenantId, productId }),
    FAQ.find({ tenantId, productId, status: 'published' })
  ]);

  if (!product) {
    throw new Error('Product not found');
  }

  const { supportMetrics } = product;

  // Calculate individual scores
  const satisfactionScore = calculateSatisfactionScore(supportMetrics.satisfactionScore || 0);
  const returnRateScore = calculateReturnRateScore(supportMetrics.returnRate || 0);
  const resolutionTimeScore = calculateResolutionTimeScore(
    supportMetrics.averageResolutionTimeHours || 0
  );
  const documentationScore = calculateDocumentationScore(docs.length, specs.length);

  // Issues analysis
  const totalIssues = issues.length;
  const criticalIssues = issues.filter((i) => i.severity === IssueSeverity.CRITICAL).length;
  const highPriorityIssues = issues.filter(
    (i) => i.severity === IssueSeverity.HIGH
  ).length;
  const resolvedIssues = issues.filter(
    (i) => i.status === 'resolved' || i.status === 'wont_fix'
  ).length;
  const resolvedPercentage = totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 100;

  const issuesScore = calculateIssuesScore(
    totalIssues,
    criticalIssues,
    highPriorityIssues,
    resolvedPercentage
  );

  // Parts availability
  const totalParts = parts.length;
  const inStockParts = parts.filter(
    (p) => p.status === PartStatus.AVAILABLE || p.status === PartStatus.LIMITED
  ).length;
  const partsAvailabilityScore = calculatePartsAvailabilityScore(totalParts, inStockParts);

  // Calculate weighted overall score
  const overall =
    satisfactionScore * QUALITY_WEIGHTS.satisfaction +
    returnRateScore * QUALITY_WEIGHTS.returnRate +
    resolutionTimeScore * QUALITY_WEIGHTS.resolutionTime +
    documentationScore * QUALITY_WEIGHTS.documentation +
    issuesScore * QUALITY_WEIGHTS.issues +
    partsAvailabilityScore * QUALITY_WEIGHTS.partsAvailability;

  // Generate factors
  const factors = {
    positive: [] as string[],
    negative: [] as string[],
    recommendations: [] as string[]
  };

  // Positive factors
  if (satisfactionScore >= 80) {
    factors.positive.push('High customer satisfaction rating');
  }
  if (returnRateScore >= 80) {
    factors.positive.push('Low return rate indicates product quality');
  }
  if (resolutionTimeScore >= 80) {
    factors.positive.push('Fast issue resolution time');
  }
  if (documentationScore >= 70) {
    factors.positive.push('Comprehensive documentation available');
  }
  if (issuesScore >= 70) {
    factors.positive.push('Low number of known issues');
  }
  if (partsAvailabilityScore >= 80) {
    factors.positive.push('Good parts availability');
  }

  // Negative factors
  if (satisfactionScore < 50) {
    factors.negative.push('Low customer satisfaction requires attention');
  }
  if (returnRateScore < 50) {
    factors.negative.push('High return rate may indicate quality issues');
  }
  if (resolutionTimeScore < 50) {
    factors.negative.push('Slow issue resolution affects customer experience');
  }
  if (documentationScore < 50) {
    factors.negative.push('Insufficient documentation for customers');
  }
  if (issuesScore < 50) {
    factors.negative.push('Multiple known issues affecting product quality');
  }
  if (partsAvailabilityScore < 50) {
    factors.negative.push('Poor parts availability may delay repairs');
  }
  if (criticalIssues > 0) {
    factors.negative.push(`${criticalIssues} critical issues require immediate attention`);
  }

  // Recommendations
  if (documentationScore < 70) {
    factors.recommendations.push('Consider adding more product documentation');
  }
  if (issuesScore < 70 && totalIssues > 0) {
    factors.recommendations.push('Review and resolve known issues to improve quality');
  }
  if (partsAvailabilityScore < 70) {
    factors.recommendations.push('Improve parts inventory for better serviceability');
  }
  if (resolutionTimeScore < 70) {
    factors.recommendations.push('Implement faster support ticket resolution process');
  }
  if (satisfactionScore < 60) {
    factors.recommendations.push('Survey customers to identify satisfaction drivers');
  }
  if (faqs.length < 5) {
    factors.recommendations.push('Add more FAQs to help customers self-serve');
  }

  return {
    overall: Math.round(overall),
    satisfactionScore,
    returnRateScore,
    resolutionTimeScore,
    documentationScore,
    issuesScore,
    partsAvailabilityScore,
    grade: getGrade(overall),
    factors
  };
}

// Generate comprehensive product insights
export async function generateProductInsights(
  tenantId: string,
  productId: string
): Promise<ProductInsights> {
  const pid = new mongoose.Types.ObjectId(productId);

  // Fetch all related data
  const [product, issues, parts, docs, specs, faqs] = await Promise.all([
    Product.findOne({ tenantId, _id: pid }),
    KnownIssue.find({ tenantId, productId: pid }),
    Part.find({ tenantId, 'compatibleProducts.productId': pid }),
    Documentation.find({ tenantId, productId: pid, isPublished: true }),
    Specification.find({ tenantId, productId: pid }),
    FAQ.find({ tenantId, productId: pid, status: 'published' })
  ]);

  if (!product) {
    throw new Error('Product not found');
  }

  // Calculate summary stats
  const totalIssues = issues.length;
  const criticalIssues = issues.filter((i) => i.severity === IssueSeverity.CRITICAL).length;
  const highPriorityIssues = issues.filter(
    (i) => i.severity === IssueSeverity.HIGH
  ).length;
  const openIssues = issues.filter(
    (i) => !['resolved', 'wont_fix'].includes(i.status as string)
  ).length;
  const resolvedIssues = issues.filter(
    (i) => ['resolved', 'wont_fix'].includes(i.status as string)
  ).length;

  // Calculate average resolution time
  const resolvedWithDates = issues.filter(
    (i) => i.resolutionDate && i.firstOccurrence
  );
  const avgResolutionDays =
    resolvedWithDates.length > 0
      ? resolvedWithDates.reduce((sum, i) => {
          const days = Math.ceil(
            (new Date(i.resolutionDate!).getTime() -
              new Date(i.firstOccurrence!).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }, 0) / resolvedWithDates.length
      : 0;

  // Parts stats
  const partsInStock = parts.filter(
    (p) => p.status === PartStatus.AVAILABLE && p.inventory.available > 0
  ).length;
  const partsOutOfStock = parts.filter(
    (p) =>
      p.status === PartStatus.OUT_OF_STOCK ||
      (p.inventory.available === 0 && p.status !== PartStatus.DISCONTINUED)
  ).length;

  // Get quality score
  const qualityScore = await generateQualityScore(tenantId, pid);

  // Determine trends
  const recentIssues = issues.filter(
    (i) => new Date(i.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const olderIssues = issues.filter(
    (i) =>
      new Date(i.createdAt) <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) &&
      new Date(i.createdAt) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  );

  let issueFrequency: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (recentIssues.length > olderIssues.length * 1.2) {
    issueFrequency = 'increasing';
  } else if (recentIssues.length < olderIssues.length * 0.8) {
    issueFrequency = 'decreasing';
  }

  // Support load
  let supportLoad: 'high' | 'medium' | 'low' = 'low';
  const ticketCount = product.supportMetrics.ticketCount || 0;
  if (ticketCount > 100) {
    supportLoad = 'high';
  } else if (ticketCount > 20) {
    supportLoad = 'medium';
  }

  // Quality trend (based on issue frequency and support metrics)
  let qualityTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (issueFrequency === 'decreasing' && qualityScore.overall >= 80) {
    qualityTrend = 'improving';
  } else if (issueFrequency === 'increasing' || qualityScore.overall < 50) {
    qualityTrend = 'declining';
  }

  return {
    qualityScore,
    summary: {
      totalIssues,
      criticalIssues,
      highPriorityIssues,
      openIssues,
      resolvedIssues,
      averageResolutionDays: Math.round(avgResolutionDays * 10) / 10,
      partsInStock,
      partsOutOfStock,
      documentationCount: docs.length,
      faqCount: faqs.length,
      specificationCount: specs.length
    },
    trends: {
      issueFrequency,
      supportLoad,
      qualityTrend
    },
    generatedAt: new Date()
  };
}

// Generate comparative insights
export async function generateComparativeInsights(
  tenantId: string,
  productIds: mongoose.Types.ObjectId[]
): Promise<any> {
  const insights = await Promise.all(
    productIds.map((id) => generateProductInsights(tenantId, id.toString()))
  );

  const products = await Product.find({
    tenantId,
    _id: { $in: productIds }
  }).lean();

  // Create comparison
  const comparison = insights.map((insight, index) => ({
    productId: productIds[index],
    productName: products.find((p) => p._id.equals(productIds[index]))?.name,
    overallScore: insight.qualityScore.overall,
    grade: insight.qualityScore.grade,
    criticalIssues: insight.summary.criticalIssues,
    satisfactionScore: insight.qualityScore.satisfactionScore,
    documentationScore: insight.qualityScore.documentationScore
  }));

  // Sort by overall score
  comparison.sort((a, b) => b.overallScore - a.overallScore);

  // Identify top performer and laggard
  const topPerformer = comparison[0];
  const laggard = comparison[comparison.length - 1];

  // Best practices from top performer
  const topInsights = insights[comparison.findIndex((c) => c.productId.equals(topPerformer.productId))];

  return {
    comparison,
    summary: {
      averageScore:
        comparison.reduce((sum, c) => sum + c.overallScore, 0) / comparison.length,
      topPerformer: {
        name: topPerformer.productName,
        score: topPerformer.overallScore,
        grade: topPerformer.grade
      },
      needsImprovement: {
        name: laggard.productName,
        score: laggard.overallScore,
        grade: laggard.grade
      }
    },
    bestPractices: topInsights?.qualityScore.factors.positive || [],
    recommendations: topInsights?.qualityScore.factors.recommendations || []
  };
}

// Generate support ticket insights
export async function generateSupportInsights(
  tenantId: string,
  productId: mongoose.Types.ObjectId
): Promise<any> {
  const issues = await KnownIssue.find({ tenantId, productId });

  const totalTickets = issues.reduce((sum, i) => sum + i.ticketCount, 0);
  const issuesBySeverity = {
    critical: issues.filter((i) => i.severity === IssueSeverity.CRITICAL).length,
    high: issues.filter((i) => i.severity === IssueSeverity.HIGH).length,
    medium: issues.filter((i) => i.severity === IssueSeverity.MEDIUM).length,
    low: issues.filter((i) => i.severity === IssueSeverity.LOW).length,
    info: issues.filter((i) => i.severity === IssueSeverity.INFO).length
  };

  const ticketsBySeverity = {
    critical: issues
      .filter((i) => i.severity === IssueSeverity.CRITICAL)
      .reduce((sum, i) => sum + i.ticketCount, 0),
    high: issues
      .filter((i) => i.severity === IssueSeverity.HIGH)
      .reduce((sum, i) => sum + i.ticketCount, 0),
    medium: issues
      .filter((i) => i.severity === IssueSeverity.MEDIUM)
      .reduce((sum, i) => sum + i.ticketCount, 0),
    low: issues
      .filter((i) => i.severity === IssueSeverity.LOW)
      .reduce((sum, i) => sum + i.ticketCount, 0)
  };

  // Top issues by ticket count
  const topIssues = issues
    .sort((a, b) => b.ticketCount - a.ticketCount)
    .slice(0, 5)
    .map((i) => ({
      title: i.title,
      severity: i.severity,
      status: i.status,
      ticketCount: i.ticketCount,
      hasWorkaround: i.workaroundAvailable
    }));

  return {
    totalTickets,
    issuesBySeverity,
    ticketsBySeverity,
    topIssues,
    resolutionRate:
      issues.length > 0
        ? Math.round(
            (issues.filter((i) => ['resolved', 'wont_fix'].includes(i.status as string))
              .length /
              issues.length) *
              100
          )
        : 100,
    averageTicketsPerIssue:
      issues.length > 0 ? Math.round(totalTickets / issues.length) : 0
  };
}
