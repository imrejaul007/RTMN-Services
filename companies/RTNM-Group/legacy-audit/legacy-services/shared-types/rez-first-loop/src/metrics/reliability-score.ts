/**
 * Loop Reliability Score Calculator
 *
 * Calculates the reliability score for the first loop based on
 * success metrics across all components.
 */

interface LoopMetrics {
  // Event Platform
  eventsReceived: number;
  eventsProcessed: number;
  eventsFailed: number;
  duplicatesSuppressed: number;

  // Action Engine
  actionsTriggered: number;
  actionsCompleted: number;
  actionsFailed: number;
  actionsPending: number;

  // Feedback Service
  feedbackCaptured: number;
  feedbackIgnored: number;
  feedbackFailed: number;

  // Learning
  learningUpdates: number;
}

interface ReliabilityScore {
  overall: number;
  components: {
    eventDelivery: number;
    idempotency: number;
    actionSuccess: number;
    feedbackCapture: number;
    learningLoop: number;
  };
  status: 'excellent' | 'good' | 'warning' | 'critical';
  recommendations: string[];
}

/**
 * Calculate component scores
 */
function calculateComponentScores(metrics: LoopMetrics): ReliabilityScore['components'] {
  // Event Delivery: percentage of events successfully processed
  const eventDelivery = metrics.eventsReceived > 0
    ? (metrics.eventsProcessed / metrics.eventsReceived) * 100
    : 100;

  // Idempotency: percentage of non-duplicate events
  const idempotency = metrics.eventsReceived > 0
    ? ((metrics.eventsReceived - metrics.duplicatesSuppressed) / metrics.eventsReceived) * 100
    : 100;

  // Action Success: percentage of triggered actions that completed
  const actionSuccess = metrics.actionsTriggered > 0
    ? (metrics.actionsCompleted / metrics.actionsTriggered) * 100
    : 100;

  // Feedback Capture: percentage of completed actions with feedback
  const feedbackCapture = metrics.actionsCompleted > 0
    ? (metrics.feedbackCaptured / metrics.actionsCompleted) * 100
    : 0;

  // Learning Loop: percentage of feedback that updated the model
  const learningLoop = metrics.feedbackCaptured > 0
    ? (metrics.learningUpdates / metrics.feedbackCaptured) * 100
    : 0;

  return {
    eventDelivery,
    idempotency,
    actionSuccess,
    feedbackCapture,
    learningLoop,
  };
}

/**
 * Calculate weighted overall reliability score
 */
function calculateReliabilityScore(metrics: LoopMetrics): ReliabilityScore {
  const components = calculateComponentScores(metrics);

  // Weights for each component
  const WEIGHTS = {
    eventDelivery: 0.20,
    idempotency: 0.20,
    actionSuccess: 0.25,
    feedbackCapture: 0.20,
    learningLoop: 0.15,
  };

  // Calculate weighted overall score
  const overall = Math.round(
    components.eventDelivery * WEIGHTS.eventDelivery +
    components.idempotency * WEIGHTS.idempotency +
    components.actionSuccess * WEIGHTS.actionSuccess +
    components.feedbackCapture * WEIGHTS.feedbackCapture +
    components.learningLoop * WEIGHTS.learningLoop
  );

  // Determine status
  let status: ReliabilityScore['status'];
  if (overall >= 99) {
    status = 'excellent';
  } else if (overall >= 95) {
    status = 'good';
  } else if (overall >= 90) {
    status = 'warning';
  } else {
    status = 'critical';
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (components.eventDelivery < 99) {
    recommendations.push(`Event delivery at ${components.eventDelivery.toFixed(1)}% - check Event Platform health`);
  }
  if (components.idempotency < 100) {
    recommendations.push(`Idempotency issues detected - ${metrics.duplicatesSuppressed} duplicates found`);
  }
  if (components.actionSuccess < 99) {
    recommendations.push(`Action success at ${components.actionSuccess.toFixed(1)}% - review Action Engine failures`);
  }
  if (components.feedbackCapture < 90) {
    recommendations.push(`Feedback capture at ${components.feedbackCapture.toFixed(1)}% - improve merchant engagement`);
  }
  if (components.learningLoop < 50) {
    recommendations.push(`Learning loop at ${components.learningLoop.toFixed(1)}% - verify feedback → model update flow`);
  }

  return {
    overall,
    components,
    status,
    recommendations,
  };
}

/**
 * Check if loop is production-ready
 */
function isProductionReady(score: ReliabilityScore): {
  ready: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];

  // Any duplicates = critical
  if (score.components.idempotency < 100) {
    blockers.push('Idempotency broken - duplicate actions detected');
  }

  // Event delivery must be > 99%
  if (score.components.eventDelivery < 99) {
    blockers.push('Event delivery below 99% - data loss detected');
  }

  // Action success must be > 95%
  if (score.components.actionSuccess < 95) {
    blockers.push('Action success below 95% - too many failures');
  }

  // Overall must be > 95%
  if (score.overall < 95) {
    blockers.push('Reliability score below 95% - system not ready');
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}

/**
 * Format score for display
 */
function formatScore(score: ReliabilityScore): string {
  const statusIcon = {
    excellent: '🟢',
    good: '🟡',
    warning: '🟠',
    critical: '🔴',
  }[score.status];

  let output = `
${statusIcon} LOOP RELIABILITY SCORE: ${score.overall}%

┌────────────────────────────────────────────────────────┐
│ Component              │ Score   │ Weight  │ Weighted  │
├────────────────────────────────────────────────────────┤
│ Event Delivery         │ ${score.components.eventDelivery.toFixed(1).padStart(6)}% │   20%   │  ${(score.components.eventDelivery * 0.20).toFixed(1).padStart(5)}%  │
│ Idempotency           │ ${score.components.idempotency.toFixed(1).padStart(6)}% │   20%   │  ${(score.components.idempotency * 0.20).toFixed(1).padStart(5)}%  │
│ Action Success       │ ${score.components.actionSuccess.toFixed(1).padStart(6)}% │   25%   │  ${(score.components.actionSuccess * 0.25).toFixed(1).padStart(5)}%  │
│ Feedback Capture      │ ${score.components.feedbackCapture.toFixed(1).padStart(6)}% │   20%   │  ${(score.components.feedbackCapture * 0.20).toFixed(1).padStart(5)}%  │
│ Learning Loop         │ ${score.components.learningLoop.toFixed(1).padStart(6)}% │   15%   │  ${(score.components.learningLoop * 0.15).toFixed(1).padStart(5)}%  │
├────────────────────────────────────────────────────────┤
│ OVERALL SCORE         │ ${score.overall.toString().padStart(6)}% │  100%   │  ${score.overall.toFixed(1).padStart(5)}%  │
└────────────────────────────────────────────────────────┘
`;

  if (score.recommendations.length > 0) {
    output += '\n⚠️  RECOMMENDATIONS:\n';
    score.recommendations.forEach(r => {
      output += `   • ${r}\n`;
    });
  }

  return output;
}

// Export for use in tests and monitoring
export {
  calculateReliabilityScore,
  calculateComponentScores,
  isProductionReady,
  formatScore,
  type LoopMetrics,
  type ReliabilityScore,
};

// Demo usage
if (require.main === module) {
  // Sample metrics
  const sampleMetrics: LoopMetrics = {
    eventsReceived: 1000,
    eventsProcessed: 998,
    eventsFailed: 2,
    duplicatesSuppressed: 0,
    actionsTriggered: 998,
    actionsCompleted: 995,
    actionsFailed: 3,
    actionsPending: 0,
    feedbackCaptured: 890,
    feedbackIgnored: 100,
    feedbackFailed: 5,
    learningUpdates: 850,
  };

  const score = calculateReliabilityScore(sampleMetrics);
  console.log(formatScore(score));

  const { ready, blockers } = isProductionReady(score);
  logger.info(\nProduction Ready: ${ready ? '✅ YES' : '❌ NO'}`);
  if (!ready) {
    console.log('\nBlockers:');
    blockers.forEach(b => logger.info(  ❌ ${b}`));
  }
}
