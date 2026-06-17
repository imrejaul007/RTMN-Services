/**
 * Compliance Rules Model
 * Defines compliance rules and regulations (GDPR, KYC, AML)
 */

export enum ComplianceType {
  GDPR = 'GDPR',
  KYC = 'KYC',
  AML = 'AML',
  DATA_RETENTION = 'DATA_RETENTION',
  CONSENT = 'CONSENT'
}

export enum RuleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  VIOLATED = 'VIOLATED'
}

export interface ComplianceRule {
  id: string;
  name: string;
  type: ComplianceType;
  description: string;
  status: RuleStatus;
  conditions: RuleCondition[];
  actions: RuleAction[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'exists' | 'not_exists';
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'alert' | 'block' | 'notify' | 'flag' | 'archive' | 'delete';
  target?: string;
  message?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplianceViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  entityId: string;
  entityType: 'user' | 'transaction' | 'document' | 'account';
  type: ComplianceType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  resolvedBy?: string;
  notes?: string;
}

// Default compliance rules
export const DEFAULT_COMPLIANCE_RULES: Omit<ComplianceRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'GDPR Right to Erasure',
    type: ComplianceType.GDPR,
    description: 'Users have the right to request deletion of their personal data',
    status: RuleStatus.ACTIVE,
    conditions: [
      { field: 'requestType', operator: 'equals', value: 'erasure_request' },
      { field: 'userConsent', operator: 'exists', value: true }
    ],
    actions: [
      { type: 'notify', message: 'Data erasure request received' },
      { type: 'flag', message: 'Requires manual review' }
    ],
    severity: 'critical'
  },
  {
    name: 'GDPR Data Portability',
    type: ComplianceType.GDPR,
    description: 'Users can request their data in a portable format',
    status: RuleStatus.ACTIVE,
    conditions: [
      { field: 'requestType', operator: 'equals', value: 'data_portability' }
    ],
    actions: [
      { type: 'alert', message: 'Data export required within 30 days' }
    ],
    severity: 'high'
  },
  {
    name: 'KYC Identity Verification',
    type: ComplianceType.KYC,
    description: 'All users must complete identity verification',
    status: RuleStatus.ACTIVE,
    conditions: [
      { field: 'kycStatus', operator: 'not_equals', value: 'verified' },
      { field: 'accountAge', operator: 'greater_than', value: 30 }
    ],
    actions: [
      { type: 'block', message: 'Account limited until KYC verification' },
      { type: 'notify', message: 'KYC verification required' }
    ],
    severity: 'high'
  },
  {
    name: 'KYC Document Expiry Check',
    type: ComplianceType.KYC,
    description: 'Verify identity documents are not expired',
    status: RuleStatus.ACTIVE,
    conditions: [
      { field: 'documentExpiry', operator: 'less_than', value: new Date().toISOString() }
    ],
    actions: [
      { type: 'alert', message: 'Identity document expired' },
      { type: 'flag', message: 'Re-verification required' }
    ],
    severity: 'medium'
  },
  {
    name: 'AML Transaction Monitoring',
    type: ComplianceType.AML,
    description: 'Monitor for suspicious transaction patterns',
    status: RuleStatus.ACTIVE,
    conditions: [
      { field: 'transactionAmount', operator: 'greater_than', value: 10000 },
      { field: 'transactionFrequency', operator: 'greater_than', value: 5 }
    ],
    actions: [
      { type: 'flag', message: 'High-value transaction flagged for review' },
      { type: 'alert', message: 'Potential suspicious activity' }
    ],
    severity: 'critical'
  },
  {
    name: 'AML Sanctions Screening',
    type: ComplianceType.AML,
    description: 'Screen against international sanctions lists',
    status: RuleStatus.ACTIVE,
    conditions: [
      { field: 'sanctionsMatch', operator: 'equals', value: true }
    ],
    actions: [
      { type: 'block', message: 'Transaction blocked - sanctions match' },
      { type: 'alert', message: 'Immediate review required' }
    ],
    severity: 'critical'
  },
  {
    name: 'Data Retention Policy',
    type: ComplianceType.DATA_RETENTION,
    description: 'Personal data must be deleted after retention period',
    status: RuleStatus.ACTIVE,
    conditions: [
      { field: 'dataAge', operator: 'greater_than', value: 2555 },
      { field: 'dataType', operator: 'equals', value: 'personal' }
    ],
    actions: [
      { type: 'archive', message: 'Data eligible for archival' },
      { type: 'notify', message: 'Data retention review required' }
    ],
    severity: 'medium'
  }
];

// In-memory store for compliance rules
export class ComplianceStore {
  private rules: Map<string, ComplianceRule> = new Map();
  private violations: Map<string, ComplianceViolation> = new Map();

  constructor() {
    // Initialize with default rules
    DEFAULT_COMPLIANCE_RULES.forEach((rule, index) => {
      const id = `RULE-${String(index + 1).padStart(4, '0')}`;
      this.rules.set(id, {
        ...rule,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }

  getAllRules(): ComplianceRule[] {
    return Array.from(this.rules.values());
  }

  getRuleById(id: string): ComplianceRule | undefined {
    return this.rules.get(id);
  }

  getRulesByType(type: ComplianceType): ComplianceRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.type === type);
  }

  getActiveRules(): ComplianceRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.status === RuleStatus.ACTIVE);
  }

  addRule(rule: Omit<ComplianceRule, 'id' | 'createdAt' | 'updatedAt'>): ComplianceRule {
    const id = `RULE-${String(this.rules.size + 1).padStart(4, '0')}`;
    const newRule: ComplianceRule = {
      ...rule,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.rules.set(id, newRule);
    return newRule;
  }

  updateRule(id: string, updates: Partial<ComplianceRule>): ComplianceRule | undefined {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    const updatedRule = {
      ...rule,
      ...updates,
      id,
      updatedAt: new Date()
    };
    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  // Violations
  getAllViolations(): ComplianceViolation[] {
    return Array.from(this.violations.values());
  }

  getViolationById(id: string): ComplianceViolation | undefined {
    return this.violations.get(id);
  }

  getViolationsByEntity(entityId: string): ComplianceViolation[] {
    return Array.from(this.violations.values()).filter(v => v.entityId === entityId);
  }

  getOpenViolations(): ComplianceViolation[] {
    return Array.from(this.violations.values()).filter(v => v.status === 'open');
  }

  addViolation(violation: Omit<ComplianceViolation, 'id' | 'detectedAt'>): ComplianceViolation {
    const id = `VIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newViolation: ComplianceViolation = {
      ...violation,
      id,
      detectedAt: new Date()
    };
    this.violations.set(id, newViolation);
    return newViolation;
  }

  updateViolation(id: string, updates: Partial<ComplianceViolation>): ComplianceViolation | undefined {
    const violation = this.violations.get(id);
    if (!violation) return undefined;

    const updatedViolation = {
      ...violation,
      ...updates
    };
    this.violations.set(id, updatedViolation);
    return updatedViolation;
  }
}

export const complianceStore = new ComplianceStore();
