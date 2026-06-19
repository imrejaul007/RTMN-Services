import { Customer, ICustomer } from '../models/Customer';
import { SegmentCondition } from '../types';
import logger from '../utils/logger';

export interface SegmentRule {
  id: string;
  name: string;
  description: string;
  conditions: SegmentCondition[];
  operator: 'AND' | 'OR';
  priority: number;
  isActive: boolean;
}


export interface SegmentAssignment {
  customerId: string;
  segmentId: string;
  segmentName: string;
  assignedAt: Date;
  source: string;
}

export interface SegmentSummary {
  id: string;
  name: string;
  description: string;
  customerCount: number;
  percentageOfTotal: number;
  averageMetrics: {
    totalRevenue: number;
    averageOrderValue: number;
    engagementScore: number;
  };
}

// Default segment rules
const DEFAULT_SEGMENTS: SegmentRule[] = [
  {
    id: 'seg-new-customers',
    name: 'New Customers',
    description: 'Customers acquired in the last 30 days',
    conditions: [
      { field: 'createdAt', operator: 'gte,days', value: -30 }
    ],
    operator: 'AND',
    priority: 10,
    isActive: true
  },
  {
    id: 'seg-engaged',
    name: 'Highly Engaged',
    description: 'Customers with engagement score >= 70',
    conditions: [
      { field: 'metrics.engagementScore', operator: 'gte', value: 70 }
    ],
    operator: 'AND',
    priority: 20,
    isActive: true
  },
  {
    id: 'seg-at-risk',
    name: 'At Risk',
    description: 'Customers with churn risk >= 60',
    conditions: [
      { field: 'riskScore.churnRisk', operator: 'gte', value: 60 }
    ],
    operator: 'AND',
    priority: 30,
    isActive: true
  },
  {
    id: 'seg-vip',
    name: 'VIP Customers',
    description: 'VIP tier customers with high lifetime value',
    conditions: [
      { field: 'tier', operator: 'equals', value: 'vip' },
      { field: 'metrics.totalRevenue', operator: 'gte', value: 50000 }
    ],
    operator: 'AND',
    priority: 40,
    isActive: true
  },
  {
    id: 'seg-premium',
    name: 'Premium Customers',
    description: 'Premium or Enterprise tier customers',
    conditions: [
      { field: 'tier', operator: 'in', value: ['premium', 'enterprise', 'vip'] }
    ],
    operator: 'OR',
    priority: 50,
    isActive: true
  },
  {
    id: 'seg-high-value',
    name: 'High Value',
    description: 'Customers with lifetime value >= 10000',
    conditions: [
      { field: 'metrics.totalRevenue', operator: 'gte', value: 10000 }
    ],
    operator: 'AND',
    priority: 60,
    isActive: true
  },
  {
    id: 'seg-inactive',
    name: 'Inactive',
    description: 'Customers with no activity in 60+ days',
    conditions: [
      { field: 'lastActivityAt', operator: 'lte,days', value: -60 }
    ],
    operator: 'AND',
    priority: 70,
    isActive: true
  },
  {
    id: 'seg-churned',
    name: 'Churned',
    description: 'Customers marked as churned',
    conditions: [
      { field: 'status', operator: 'equals', value: 'churned' }
    ],
    operator: 'AND',
    priority: 80,
    isActive: true
  },
  {
    id: 'seg-frequent-buyers',
    name: 'Frequent Buyers',
    description: 'Customers with 5+ orders',
    conditions: [
      { field: 'metrics.totalOrders', operator: 'gte', value: 5 }
    ],
    operator: 'AND',
    priority: 90,
    isActive: true
  },
  {
    id: 'seg-one-time',
    name: 'One-Time Buyers',
    description: 'Customers with exactly 1 order',
    conditions: [
      { field: 'metrics.totalOrders', operator: 'equals', value: 1 }
    ],
    operator: 'AND',
    priority: 100,
    isActive: true
  },
  {
    id: 'seg-high-risk',
    name: 'High Risk',
    description: 'Customers with overall risk score >= 70',
    conditions: [
      { field: 'riskScore.overall', operator: 'gte', value: 70 }
    ],
    operator: 'AND',
    priority: 110,
    isActive: true
  },
  {
    id: 'seg-low-engagement',
    name: 'Low Engagement',
    description: 'Customers with engagement score < 30',
    conditions: [
      { field: 'metrics.engagementScore', operator: 'lt', value: 30 }
    ],
    operator: 'AND',
    priority: 120,
    isActive: true
  },
  {
    id: 'seg-recently-active',
    name: 'Recently Active',
    description: 'Active in last 7 days',
    conditions: [
      { field: 'lastActivityAt', operator: 'gte,days', value: -7 }
    ],
    operator: 'AND',
    priority: 130,
    isActive: true
  },
  {
    id: 'seg-business',
    name: 'Business Customers',
    description: 'Business or enterprise type customers',
    conditions: [
      { field: 'type', operator: 'equals', value: 'business' }
    ],
    operator: 'AND',
    priority: 140,
    isActive: true
  },
  {
    id: 'seg-blocked',
    name: 'Blocked',
    description: 'Blocked or flagged customers',
    conditions: [
      { field: 'status', operator: 'equals', value: 'blocked' }
    ],
    operator: 'AND',
    priority: 150,
    isActive: true
  }
];

class SegmentationService {
  private segmentRules: SegmentRule[] = DEFAULT_SEGMENTS;

  /**
   * Get all active segment rules
   */
  getSegmentRules(): SegmentRule[] {
    return this.segmentRules.filter(r => r.isActive);
  }

  /**
   * Add or update a segment rule
   */
  addSegmentRule(rule: SegmentRule): void {
    const existingIndex = this.segmentRules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.segmentRules[existingIndex] = { ...rule, isActive: true };
    } else {
      this.segmentRules.push({ ...rule, isActive: true });
    }
    logger.info('Segment rule added/updated', { ruleId: rule.id });
  }

  /**
   * Deactivate a segment rule
   */
  deactivateSegmentRule(ruleId: string): void {
    const rule = this.segmentRules.find(r => r.id === ruleId);
    if (rule) {
      rule.isActive = false;
      logger.info('Segment rule deactivated', { ruleId });
    }
  }

  /**
   * Check if a customer matches a single condition
   */
  private evaluateCondition(customer: ICustomer, condition: SegmentCondition): boolean {
    const fieldParts = condition.field.split('.');
    let value: unknown = customer;

    // Navigate to the field value
    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return false;
      }
    }

    // Handle special date operators
    if (condition.operator.endsWith(',days')) {
      const baseOperator = condition.operator.replace(',days', '') as keyof typeof OPERATORS;
      const days = condition.value as number;
      const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      if (value instanceof Date) {
        return OPERATORS[baseOperator](value.getTime(), targetDate.getTime());
      }
      return false;
    }

    // Standard operators
    const operator = condition.operator as keyof typeof OPERATORS;
    if (!OPERATORS[operator]) {
      logger.warn('Unknown operator', { operator });
      return false;
    }

    return OPERATORS[operator](value, condition.value);
  }

  /**
   * Check if customer matches a segment rule
   */
  private matchesSegment(customer: ICustomer, rule: SegmentRule): boolean {
    if (!rule.isActive) return false;

    const results = rule.conditions.map(c => this.evaluateCondition(customer, c));

    if (rule.operator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * Assign segments to a single customer
   */
  async assignSegmentsToCustomer(customerId: string): Promise<SegmentAssignment[]> {
    const customer = await Customer.findByCustomerId(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const assignments: SegmentAssignment[] = [];

    // Sort rules by priority
    const sortedRules = [...this.segmentRules]
      .filter(r => r.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (this.matchesSegment(customer, rule)) {
        // Check if already assigned
        const existingSegment = customer.segments.find(s => s.id === rule.id);

        if (!existingSegment) {
          const assignment: SegmentAssignment = {
            customerId,
            segmentId: rule.id,
            segmentName: rule.name,
            assignedAt: new Date(),
            source: 'segmentation-engine'
          };

          customer.segments.push({
            id: rule.id,
            name: rule.name,
            description: rule.description,
            assignedAt: new Date(),
            source: 'segmentation-engine'
          });

          assignments.push(assignment);
        }
      } else {
        // Remove from segments if no longer matches
        customer.segments = customer.segments.filter(s => s.id !== rule.id);
      }
    }

    if (assignments.length > 0) {
      await customer.save();
      logger.info(`Assigned ${assignments.length} segments to customer ${customerId}`);
    }

    return assignments;
  }

  /**
   * Assign segments to all customers (batch operation)
   */
  async assignSegmentsToAllCustomers(): Promise<{
    processed: number;
    assigned: number;
    errors: string[];
  }> {
    let processed = 0;
    let assigned = 0;
    const errors: string[] = [];

    const customers = await Customer.find({});

    for (const customer of customers) {
      try {
        const result = await this.assignSegmentsToCustomer(customer.customerId);
        processed++;
        assigned += result.length;
      } catch (error) {
        errors.push(`${customer.customerId}: ${(error as Error).message}`);
      }
    }

    logger.info('Batch segmentation complete', { processed, assigned, errors: errors.length });
    return { processed, assigned, errors };
  }

  /**
   * Get customers in a specific segment
   */
  async getCustomersInSegment(segmentId: string): Promise<ICustomer[]> {
    return Customer.find({
      'segments.id': segmentId
    }).sort({ 'metrics.totalRevenue': -1 });
  }

  /**
   * Get segment summary statistics
   */
  async getSegmentSummary(segmentId: string): Promise<SegmentSummary | null> {
    const rule = this.segmentRules.find(r => r.id === segmentId);
    if (!rule) return null;

    const customers = await this.getCustomersInSegment(segmentId);
    const totalCustomers = await Customer.countDocuments();

    const avgMetrics = {
      totalRevenue: 0,
      averageOrderValue: 0,
      engagementScore: 0
    };

    if (customers.length > 0) {
      avgMetrics.totalRevenue = customers.reduce((sum, c) =>
        sum + (c.metrics?.totalRevenue || 0), 0) / customers.length;
      avgMetrics.averageOrderValue = customers.reduce((sum, c) =>
        sum + (c.metrics?.averageOrderValue || 0), 0) / customers.length;
      avgMetrics.engagementScore = customers.reduce((sum, c) =>
        sum + (c.metrics?.engagementScore || 0), 0) / customers.length;
    }

    return {
      id: segmentId,
      name: rule.name,
      description: rule.description,
      customerCount: customers.length,
      percentageOfTotal: totalCustomers > 0
        ? Math.round((customers.length / totalCustomers) * 100 * 100) / 100
        : 0,
      averageMetrics: {
        totalRevenue: Math.round(avgMetrics.totalRevenue * 100) / 100,
        averageOrderValue: Math.round(avgMetrics.averageOrderValue * 100) / 100,
        engagementScore: Math.round(avgMetrics.engagementScore * 100) / 100
      }
    };
  }

  /**
   * Get all segment summaries
   */
  async getAllSegmentSummaries(): Promise<SegmentSummary[]> {
    const summaries: SegmentSummary[] = [];

    for (const rule of this.segmentRules.filter(r => r.isActive)) {
      const summary = await this.getSegmentSummary(rule.id);
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries.sort((a, b) => b.customerCount - a.customerCount);
  }

  /**
   * Get segment distribution (pie chart data)
   */
  async getSegmentDistribution(): Promise<Array<{
    segmentId: string;
    segmentName: string;
    count: number;
    percentage: number;
  }>> {
    const totalCustomers = await Customer.countDocuments();
    const summaries = await this.getAllSegmentSummaries();

    return summaries.map(s => ({
      segmentId: s.id,
      segmentName: s.name,
      count: s.customerCount,
      percentage: totalCustomers > 0
        ? Math.round((s.customerCount / totalCustomers) * 10000) / 100
        : 0
    }));
  }

  /**
   * Create custom segment query
   */
  async queryCustomers(conditions: SegmentCondition[], operator: 'AND' | 'OR' = 'AND'): Promise<ICustomer[]> {
    const query: Record<string, unknown> = {};

    for (const condition of conditions) {
      const conditionQuery = this.buildConditionQuery(condition);
      if (Object.keys(conditionQuery).length > 0) {
        if (operator === 'AND') {
          Object.assign(query, conditionQuery);
        }
      }
    }

    if (operator === 'OR') {
      const orConditions = conditions.map(c => this.buildConditionQuery(c));
      const validConditions = orConditions.filter(c => Object.keys(c).length > 0);
      if (validConditions.length > 0) {
        return Customer.find({ $or: validConditions });
      }
    }

    return Customer.find(query);
  }

  /**
   * Build MongoDB query from condition
   */
  private buildConditionQuery(condition: SegmentCondition): Record<string, unknown> {
    const { field, operator, value } = condition;

    switch (operator) {
      case 'equals':
        return { [field]: value };
      case 'not_equals':
        return { [field]: { $ne: value } };
      case 'contains':
        return { [field]: { $regex: value, $options: 'i' } };
      case 'gt':
        return { [field]: { $gt: value } };
      case 'gte':
        return { [field]: { $gte: value } };
      case 'lt':
        return { [field]: { $lt: value } };
      case 'lte':
        return { [field]: { $lte: value } };
      case 'in':
        return { [field]: { $in: Array.isArray(value) ? value : [value] } };
      case 'not_in':
        return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
      case 'exists':
        return { [field]: { $exists: true, $ne: null } };
      case 'not_exists':
        return { [field]: { $exists: false } };
      default:
        return {};
    }
  }

  /**
   * Get customer's segment membership
   */
  async getCustomerSegments(customerId: string): Promise<SegmentAssignment[]> {
    const customer = await Customer.findByCustomerId(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    return customer.segments.map(s => ({
      customerId,
      segmentId: s.id,
      segmentName: s.name,
      assignedAt: s.assignedAt,
      source: s.source || 'segmentation-engine'
    }));
  }
}

// Operator functions
const OPERATORS = {
  equals: (value: unknown, target: unknown): boolean => value === target,
  not_equals: (value: unknown, target: unknown): boolean => value !== target,
  contains: (value: unknown, target: unknown): boolean =>
    String(value).toLowerCase().includes(String(target).toLowerCase()),
  gt: (value: unknown, target: unknown): boolean =>
    typeof value === 'number' && typeof target === 'number' && value > target,
  gte: (value: unknown, target: unknown): boolean =>
    typeof value === 'number' && typeof target === 'number' && value >= target,
  lt: (value: unknown, target: unknown): boolean =>
    typeof value === 'number' && typeof target === 'number' && value < target,
  lte: (value: unknown, target: unknown): boolean =>
    typeof value === 'number' && typeof target === 'number' && value <= target,
  in: (value: unknown, target: unknown): boolean =>
    Array.isArray(target) && target.includes(value),
  not_in: (value: unknown, target: unknown): boolean =>
    Array.isArray(target) && !target.includes(value),
  exists: (value: unknown): boolean => value !== undefined && value !== null,
  not_exists: (value: unknown): boolean => value === undefined || value === null
};

export const segmentationService = new SegmentationService();
