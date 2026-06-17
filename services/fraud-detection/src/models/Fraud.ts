// Fraud Pattern Types
export enum FraudPatternType {
  VELOCITY = 'velocity',
  AMOUNT_ANOMALY = 'amount_anomaly',
  GEO_ANOMALY = 'geo_anomaly',
  DEVICE_FINGERPRINT = 'device_fingerprint',
  BEHAVIORAL = 'behavioral',
  NETWORK = 'network',
  TIME_BASED = 'time_based',
  CUSTOM = 'custom'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  PENDING = 'pending',
  INVESTIGATING = 'investigating',
  CONFIRMED = 'confirmed',
  FALSE_POSITIVE = 'false_positive',
  RESOLVED = 'resolved'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum BlockAction {
  NONE = 'none',
  FLAG = 'flag',
  REVIEW = 'review',
  BLOCK = 'block',
  AUTO_BLOCK = 'auto_block'
}

export interface FraudPattern {
  id: string;
  name: string;
  type: FraudPatternType;
  description: string;
  enabled: boolean;
  weight: number; // Contribution to risk score (0-100)
  conditions: PatternCondition[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface PatternCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex' | 'in' | 'between';
  value: unknown;
  secondaryValue?: unknown; // For 'between' operator
}

export interface FraudAlert {
  id: string;
  transactionId: string;
  patternId: string;
  patternName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  blockAction: BlockAction;
  customerId: string;
  merchantId: string;
  amount: number;
  currency: string;
  description: string;
  details: AlertDetail[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
}

export interface AlertDetail {
  field: string;
  expected: unknown;
  actual: unknown;
  severity: AlertSeverity;
  message: string;
}

export interface FraudCheckResult {
  transactionId: string;
  allowed: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  blockAction: BlockAction;
  matchedPatterns: MatchedPattern[];
  recommendations: string[];
  processingTimeMs: number;
  timestamp: Date;
}

export interface MatchedPattern {
  patternId: string;
  patternName: string;
  patternType: FraudPatternType;
  confidence: number; // 0-100
  contributingScore: number;
  details: AlertDetail[];
}

// In-memory storage for patterns and alerts
export class FraudStore {
  private patterns: Map<string, FraudPattern> = new Map();
  private alerts: Map<string, FraudAlert> = new Map();
  private transactionHistory: Map<string, TransactionRecord[]> = new Map();

  // Pattern operations
  addPattern(pattern: FraudPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  getPattern(id: string): FraudPattern | undefined {
    return this.patterns.get(id);
  }

  getAllPatterns(): FraudPattern[] {
    return Array.from(this.patterns.values());
  }

  getEnabledPatterns(): FraudPattern[] {
    return Array.from(this.patterns.values()).filter(p => p.enabled);
  }

  updatePattern(id: string, updates: Partial<FraudPattern>): FraudPattern | undefined {
    const pattern = this.patterns.get(id);
    if (pattern) {
      const updated = { ...pattern, ...updates, updatedAt: new Date() };
      this.patterns.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deletePattern(id: string): boolean {
    return this.patterns.delete(id);
  }

  // Alert operations
  addAlert(alert: FraudAlert): void {
    this.alerts.set(alert.id, alert);
  }

  getAlert(id: string): FraudAlert | undefined {
    return this.alerts.get(id);
  }

  getAllAlerts(): FraudAlert[] {
    return Array.from(this.alerts.values());
  }

  getAlertsByStatus(status: AlertStatus): FraudAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.status === status);
  }

  getAlertsByCustomer(customerId: string): FraudAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.customerId === customerId);
  }

  getAlertsByMerchant(merchantId: string): FraudAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.merchantId === merchantId);
  }

  updateAlert(id: string, updates: Partial<FraudAlert>): FraudAlert | undefined {
    const alert = this.alerts.get(id);
    if (alert) {
      const updated = { ...alert, ...updates, updatedAt: new Date() };
      this.alerts.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // Transaction history for velocity checks
  addTransactionRecord(record: TransactionRecord): void {
    const records = this.transactionHistory.get(record.customerId) || [];
    records.push(record);
    // Keep only last hour of records
    const oneHourAgo = Date.now() - 3600000;
    const filtered = records.filter(r => r.timestamp.getTime() > oneHourAgo);
    this.transactionHistory.set(record.customerId, filtered);
  }

  getRecentTransactions(customerId: string): TransactionRecord[] {
    const records = this.transactionHistory.get(customerId) || [];
    const oneHourAgo = Date.now() - 3600000;
    return records.filter(r => r.timestamp.getTime() > oneHourAgo);
  }

  getTransactionCount(customerId: string): number {
    return this.getRecentTransactions(customerId).length;
  }

  // Statistics
  getStats(): FraudStats {
    const allAlerts = Array.from(this.alerts.values());
    return {
      totalPatterns: this.patterns.size,
      enabledPatterns: this.getEnabledPatterns().length,
      totalAlerts: allAlerts.length,
      pendingAlerts: allAlerts.filter(a => a.status === AlertStatus.PENDING).length,
      confirmedFraud: allAlerts.filter(a => a.status === AlertStatus.CONFIRMED).length,
      falsePositives: allAlerts.filter(a => a.status === AlertStatus.FALSE_POSITIVE).length
    };
  }
}

export interface TransactionRecord {
  transactionId: string;
  customerId: string;
  merchantId: string;
  amount: number;
  timestamp: Date;
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface FraudStats {
  totalPatterns: number;
  enabledPatterns: number;
  totalAlerts: number;
  pendingAlerts: number;
  confirmedFraud: number;
  falsePositives: number;
}

// Default fraud patterns
export const DEFAULT_PATTERNS: Omit<FraudPattern, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'High Velocity',
    type: FraudPatternType.VELOCITY,
    description: 'Multiple transactions in a short time period',
    enabled: true,
    weight: 30,
    conditions: [
      { field: 'transactionCount', operator: 'gt', value: 5 },
      { field: 'timeWindow', operator: 'lte', value: 300000 } // 5 minutes
    ]
  },
  {
    name: 'High Amount Anomaly',
    type: FraudPatternType.AMOUNT_ANOMALY,
    description: 'Transaction amount significantly higher than average',
    enabled: true,
    weight: 35,
    conditions: [
      { field: 'amountDeviation', operator: 'gt', value: 3 }, // 3x standard deviation
      { field: 'absoluteAmount', operator: 'gt', value: 1000 }
    ]
  },
  {
    name: 'Rapid Fire',
    type: FraudPatternType.VELOCITY,
    description: 'More than 3 transactions in under a minute',
    enabled: true,
    weight: 25,
    conditions: [
      { field: 'transactionCount', operator: 'gt', value: 3 },
      { field: 'timeWindow', operator: 'lte', value: 60000 }
    ]
  },
  {
    name: 'Night Owl',
    type: FraudPatternType.TIME_BASED,
    description: 'Transactions between 1 AM and 5 AM local time',
    enabled: true,
    weight: 15,
    conditions: [
      { field: 'hour', operator: 'between', value: 1, secondaryValue: 5 }
    ]
  },
  {
    name: 'New Device',
    type: FraudPatternType.DEVICE_FINGERPRINT,
    description: 'Transaction from a new/unrecognized device',
    enabled: true,
    weight: 20,
    conditions: [
      { field: 'knownDevice', operator: 'eq', value: false }
    ]
  },
  {
    name: 'Unusual Location',
    type: FraudPatternType.GEO_ANOMALY,
    description: 'Transaction from a location different than usual',
    enabled: true,
    weight: 25,
    conditions: [
      { field: 'usualLocationMatch', operator: 'eq', value: false }
    ]
  },
  {
    name: 'Same Merchant Repeat',
    type: FraudPatternType.BEHAVIORAL,
    description: 'Multiple rapid transactions to same merchant',
    enabled: true,
    weight: 20,
    conditions: [
      { field: 'sameMerchantCount', operator: 'gt', value: 2 },
      { field: 'timeWindow', operator: 'lte', value: 180000 }
    ]
  },
  {
    name: 'Network Fraud',
    type: FraudPatternType.NETWORK,
    description: 'Connected to known fraudulent accounts',
    enabled: true,
    weight: 40,
    conditions: [
      { field: 'fraudulentNetworkConnection', operator: 'eq', value: true }
    ]
  }
];
