// Root Cause Analyzer
import { Breach } from '../types';
import { logger } from '../utils/logger';

export interface RootCauseAnalysis {
  breachId: string;
  possibleCauses: Array<{ cause: string; probability: number; reasoning: string }>;
  recommendations: string[];
  similarIncidents: string[];
  analysisTimestamp: Date;
}

export class RootCauseAnalyzer {
  analyze(breach: Breach): RootCauseAnalysis {
    const causes: Array<{ cause: string; probability: number; reasoning: string }> = [];

    if (breach.metric === 'uptime' || breach.metric === 'availability') {
      causes.push({ cause: 'Service crash or restart', probability: 0.7, reasoning: 'Uptime drops often caused by crashes' });
      causes.push({ cause: 'Network issues', probability: 0.5, reasoning: 'Connectivity problems' });
      causes.push({ cause: 'Resource exhaustion (CPU/memory)', probability: 0.6, reasoning: 'Overload conditions' });
    } else if (breach.metric === 'latency' || breach.metric === 'response_time') {
      causes.push({ cause: 'Database slow queries', probability: 0.7, reasoning: 'DB performance issues affect latency' });
      causes.push({ cause: 'High load/traffic spike', probability: 0.6, reasoning: 'Increased requests' });
      causes.push({ cause: 'External API slow', probability: 0.5, reasoning: 'Downstream dependency' });
      causes.push({ cause: 'Inefficient code', probability: 0.4, reasoning: 'Algorithmic complexity' });
    } else if (breach.metric === 'error_rate') {
      causes.push({ cause: 'Bug in recent deployment', probability: 0.8, reasoning: 'Errors often follow deploys' });
      causes.push({ cause: 'Invalid input data', probability: 0.5, reasoning: 'Data quality issues' });
      causes.push({ cause: 'External service failures', probability: 0.6, reasoning: 'Cascading failures' });
    } else if (breach.metric === 'throughput') {
      causes.push({ cause: 'Resource bottleneck', probability: 0.7, reasoning: 'Throttling or limits' });
      causes.push({ cause: 'Configuration change', probability: 0.5, reasoning: 'Recent config update' });
    }

    // Sort by probability
    causes.sort((a, b) => b.probability - a.probability);

    const recommendations = [
      'Check recent deployments and roll back if needed',
      'Review service logs for errors around breach time',
      'Check resource utilization (CPU, memory, disk, network)',
      'Verify external service status',
      'Review database query performance',
      'Check for traffic anomalies',
    ];

    return {
      breachId: breach.id,
      possibleCauses: causes.slice(0, 5),
      recommendations,
      similarIncidents: [],
      analysisTimestamp: new Date(),
    };
  }
}

export const rootCauseAnalyzer = new RootCauseAnalyzer();
export default rootCauseAnalyzer;
