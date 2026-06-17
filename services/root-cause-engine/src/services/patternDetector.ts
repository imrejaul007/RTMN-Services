import { ComplaintData, PatternDetection, Severity } from '../types';

interface Pattern {
  type: string;
  keywords: string[];
  category: string;
}

const KNOWN_PATTERNS: Pattern[] = [
  {
    type: 'delivery_delay',
    keywords: ['delay', 'late', 'slow', 'waiting', 'delivery time', 'long wait'],
    category: 'service_timing'
  },
  {
    type: 'quality_issue',
    keywords: ['broken', 'damaged', 'defective', 'poor quality', 'bad', 'wrong'],
    category: 'product_quality'
  },
  {
    type: 'communication_failure',
    keywords: ['no response', 'ignored', 'unclear', 'confusing', 'miscommunication', 'no update'],
    category: 'communication'
  },
  {
    type: 'billing_error',
    keywords: ['charge', 'billing', 'payment', 'price', 'cost', 'overcharged', 'incorrect amount'],
    category: 'financial'
  },
  {
    type: 'staff_behavior',
    keywords: ['rude', 'unprofessional', 'helpful', 'attitude', 'behavior', 'impolite'],
    category: 'human_factors'
  },
  {
    type: 'technical_issue',
    keywords: ['error', 'crash', 'bug', 'not working', 'app', 'website', 'system', 'login'],
    category: 'technology'
  },
  {
    type: 'availability_issue',
    keywords: ['unavailable', 'out of stock', 'not available', 'sold out', 'closed'],
    category: 'resource'
  },
  {
    type: 'hygiene_concern',
    keywords: ['dirty', 'clean', 'hygiene', 'sanitary', 'germ', 'contamination'],
    category: 'health_safety'
  }
];

export class PatternDetector {
  detectPatterns(complaints: ComplaintData[]): PatternDetection[] {
    const patternCounts: Map<string, Set<string>> = new Map();
    const patternComplaints: Map<string, string[]> = new Map();
    const patternSeverities: Map<string, Severity[]> = new Map();

    // Initialize pattern tracking
    KNOWN_PATTERNS.forEach(pattern => {
      patternCounts.set(pattern.type, new Set());
      patternComplaints.set(pattern.type, []);
      patternSeverities.set(pattern.type, []);
    });

    // Analyze each complaint
    complaints.forEach(complaint => {
      const complaintText = `${complaint.title} ${complaint.description}`.toLowerCase();
      const matchedPatterns = this.findMatchingPatterns(complaintText);

      matchedPatterns.forEach(patternType => {
        patternCounts.get(patternType)?.add(complaint.category);
        patternComplaints.get(patternType)?.push(complaint.id || 'unknown');
        patternSeverities.get(patternType)?.push(complaint.severity);
      });
    });

    // Build pattern detection results
    const detections: PatternDetection[] = [];

    patternCounts.forEach((categories, patternType) => {
      const count = categories.size;
      if (count >= 1) {
        const severities = patternSeverities.get(patternType) || [];
        const complaintIds = patternComplaints.get(patternType) || [];

        detections.push({
          patternType,
          frequency: count,
          severity: this.getMostSevere(severities),
          commonFactors: Array.from(categories),
          complaintIds,
          detectedAt: new Date()
        });
      }
    });

    // Sort by frequency and severity
    return detections.sort((a, b) => {
      const severityOrder: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.frequency - a.frequency;
    });
  }

  private findMatchingPatterns(text: string): string[] {
    const matchedPatterns: string[] = [];

    KNOWN_PATTERNS.forEach(pattern => {
      const hasMatch = pattern.keywords.some(keyword => text.includes(keyword.toLowerCase()));
      if (hasMatch) {
        matchedPatterns.push(pattern.type);
      }
    });

    return matchedPatterns;
  }

  private getMostSevere(severities: Severity[]): Severity {
    const severityOrder: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return severities.reduce((most, current) =>
      severityOrder[current] > severityOrder[most] ? current : most
    , 'low' as Severity);
  }

  detectTemporalPatterns(complaints: ComplaintData[]): {
    timeOfDay?: string;
    dayOfWeek?: string;
    seasonal?: string;
  } {
    const hourCounts: number[] = new Array(24).fill(0);
    const dayCounts: Record<string, number> = {};
    const monthCounts: Record<string, number> = {};

    complaints.forEach(complaint => {
      const date = new Date(complaint.timestamp);
      const hour = date.getHours();
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      const month = date.toLocaleDateString('en-US', { month: 'long' });

      hourCounts[hour]++;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const peakMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      timeOfDay: peakHour >= 9 && peakHour <= 17 ? 'business_hours' : 'off_hours',
      dayOfWeek: peakDay,
      seasonal: peakMonth
    };
  }

  detectCategoryPatterns(complaints: ComplaintData[]): Map<string, {
    count: number;
    avgSeverity: number;
    avgUsersAffected: number;
  }> {
    const categoryStats = new Map<string, {
      count: number;
      totalSeverity: number;
      totalUsers: number;
    }>();

    const severityValues: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

    complaints.forEach(complaint => {
      const current = categoryStats.get(complaint.category) || {
        count: 0,
        totalSeverity: 0,
        totalUsers: 0
      };

      categoryStats.set(complaint.category, {
        count: current.count + 1,
        totalSeverity: current.totalSeverity + severityValues[complaint.severity],
        totalUsers: current.totalUsers + complaint.affectedUsers
      });
    });

    const result = new Map<string, {
      count: number;
      avgSeverity: number;
      avgUsersAffected: number;
    }>();

    categoryStats.forEach((stats, category) => {
      result.set(category, {
        count: stats.count,
        avgSeverity: stats.totalSeverity / stats.count,
        avgUsersAffected: stats.totalUsers / stats.count
      });
    });

    return result;
  }
}
