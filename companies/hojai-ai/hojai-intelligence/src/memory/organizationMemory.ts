/**
 * HOJAI Intelligence - Organization Memory
 * Redis-based organization policies, brand voice, and operational memory
 */

import { v4 as uuidv4 } from 'uuid';
import { OrganizationMemory, Policy } from '../types';

// Default organization templates
const DEFAULT_ORG_TEMPLATES: Record<string, Partial<OrganizationMemory>> = {
  default: {
    brandVoice: {
      tone: 'professional',
      vocabulary: ['assistance', 'support', 'solution', 'help'],
      guidelines: [
        'Be courteous and professional',
        'Use the customer name when available',
        'Provide clear and concise responses',
        'Offer proactive assistance',
      ],
    },
    commonIssues: [],
    escalationPatterns: [],
    successMetrics: {
      csatTarget: 4.5,
      avgResolutionTime: 15, // minutes
      firstContactResolution: 0.7,
    },
  },
  retail: {
    brandVoice: {
      tone: 'friendly',
      vocabulary: ['help', 'find', 'recommend', 'suggest', 'discover'],
      guidelines: [
        'Be warm and approachable',
        'Use casual language appropriately',
        'Highlight deals and promotions',
        'Suggest complementary products',
      ],
    },
    commonIssues: [
      { issue: 'Order not received', resolutionCount: 150, avgResolutionTime: 20 },
      { issue: 'Wrong item shipped', resolutionCount: 80, avgResolutionTime: 15 },
      { issue: 'Return request', resolutionCount: 200, avgResolutionTime: 10 },
    ],
    escalationPatterns: [
      { pattern: 'money back guarantee mentioned', frequency: 0.8, typicalEscalation: 'refund_specialist' },
      { pattern: 'shipping damage claim', frequency: 0.6, typicalEscalation: 'claims_department' },
    ],
    successMetrics: {
      csatTarget: 4.2,
      avgResolutionTime: 12,
      firstContactResolution: 0.75,
    },
  },
  hospitality: {
    brandVoice: {
      tone: 'warm',
      vocabulary: ['welcome', 'ensure', 'comfort', 'experience', 'enjoy'],
      guidelines: [
        'Be welcoming and hospitable',
        'Anticipate guest needs',
        'Personalize interactions',
        'Emphasize premium experience',
      ],
    },
    commonIssues: [
      { issue: 'Room booking issue', resolutionCount: 100, avgResolutionTime: 8 },
      { issue: 'Service complaint', resolutionCount: 50, avgResolutionTime: 25 },
    ],
    successMetrics: {
      csatTarget: 4.7,
      avgResolutionTime: 10,
      firstContactResolution: 0.85,
    },
  },
};

// In-memory fallback
const inMemoryOrgs: Map<string, OrganizationMemory> = new Map();

// Default policies
const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'policy-refund-30days',
    name: '30-Day Refund Policy',
    description: 'Full refund within 30 days of purchase',
    conditions: [
      { field: 'daysSincePurchase', operator: 'lte', value: 30 },
      { field: 'purchaseAmount', operator: 'gt', value: 0 },
    ],
    actions: ['approve_full_refund'],
    priority: 10,
    active: true,
  },
  {
    id: 'policy-vip-escalation',
    name: 'VIP Escalation Priority',
    description: 'VIP customers get priority supervisor access',
    conditions: [
      { field: 'customerTier', operator: 'eq', value: 'vip' },
    ],
    actions: ['immediate_supervisor_access', 'offer_compensation'],
    priority: 20,
    active: true,
  },
  {
    id: 'policy-escalation-negative',
    name: 'Negative Sentiment Escalation',
    description: 'Escalate to supervisor when sentiment is strongly negative',
    conditions: [
      { field: 'sentimentScore', operator: 'lt', value: -0.5 },
    ],
    actions: ['offer_supervisor_call', 'prepare_compensation_options'],
    priority: 15,
    active: true,
  },
  {
    id: 'policy-high-value-refund',
    name: 'High Value Refund Review',
    description: 'Refunds over $500 require manager approval',
    conditions: [
      { field: 'refundAmount', operator: 'gt', value: 500 },
    ],
    actions: ['require_manager_approval', 'document_reason'],
    priority: 25,
    active: true,
  },
];

export class OrgMemory {
  private redis: any = null;
  private useRedis = false;
  private orgTTL = 604800; // 7 days

  constructor(redisClient?: any) {
    if (redisClient) {
      this.redis = redisClient;
      this.useRedis = true;
    }
  }

  /**
   * Get or create organization memory
   */
  async getOrCreateOrg(orgId: string, template?: string): Promise<OrganizationMemory> {
    const existing = await this.getOrg(orgId);
    if (existing) return existing;

    // Create from template
    const templateData = template && DEFAULT_ORG_TEMPLATES[template]
      ? DEFAULT_ORG_TEMPLATES[template]
      : DEFAULT_ORG_TEMPLATES.default;

    const org: OrganizationMemory = {
      orgId,
      policies: [...DEFAULT_POLICIES],
      brandVoice: templateData.brandVoice!,
      commonIssues: templateData.commonIssues!,
      escalationPatterns: templateData.escalationPatterns!,
      successMetrics: templateData.successMetrics!,
    };

    await this.saveOrg(org);
    return org;
  }

  /**
   * Get organization memory
   */
  async getOrg(orgId: string): Promise<OrganizationMemory | null> {
    const key = `org:memory:${orgId}`;

    if (this.useRedis) {
      try {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Redis get org error:', error);
        return inMemoryOrgs.get(orgId) || null;
      }
    }

    return inMemoryOrgs.get(orgId) || null;
  }

  /**
   * Update organization memory
   */
  async updateOrg(
    orgId: string,
    updates: Partial<OrganizationMemory>
  ): Promise<OrganizationMemory> {
    const org = await this.getOrCreateOrg(orgId);

    const updatedOrg: OrganizationMemory = {
      ...org,
      ...updates,
      orgId, // Ensure ID cannot be changed
    };

    await this.saveOrg(updatedOrg);
    return updatedOrg;
  }

  /**
   * Get policies for organization
   */
  async getPolicies(orgId: string): Promise<Policy[]> {
    const org = await this.getOrCreateOrg(orgId);
    return org.policies.filter(p => p.active);
  }

  /**
   * Add custom policy
   */
  async addPolicy(orgId: string, policy: Omit<Policy, 'id'>): Promise<Policy> {
    const org = await this.getOrCreateOrg(orgId);

    const newPolicy: Policy = {
      ...policy,
      id: `policy-${uuidv4()}`,
    };

    org.policies.push(newPolicy);
    await this.saveOrg(org);

    return newPolicy;
  }

  /**
   * Update policy
   */
  async updatePolicy(
    orgId: string,
    policyId: string,
    updates: Partial<Policy>
  ): Promise<Policy | null> {
    const org = await this.getOrCreateOrg(orgId);
    const policyIndex = org.policies.findIndex(p => p.id === policyId);

    if (policyIndex === -1) return null;

    org.policies[policyIndex] = {
      ...org.policies[policyIndex],
      ...updates,
      id: policyId, // Ensure ID cannot be changed
    };

    await this.saveOrg(org);
    return org.policies[policyIndex];
  }

  /**
   * Update brand voice
   */
  async updateBrandVoice(
    orgId: string,
    brandVoice: { tone: string; vocabulary: string[]; guidelines: string[] }
  ): Promise<void> {
    const org = await this.getOrCreateOrg(orgId);
    org.brandVoice = brandVoice;
    await this.saveOrg(org);
  }

  /**
   * Get response suggestions based on brand voice
   */
  async getResponseStyle(orgId: string): Promise<{
    tone: string;
    vocabulary: string[];
    guidelines: string[];
  }> {
    const org = await this.getOrCreateOrg(orgId);
    return org.brandVoice;
  }

  /**
   * Add common issue
   */
  async addCommonIssue(
    orgId: string,
    issue: string,
    resolutionCount: number,
    avgResolutionTime: number
  ): Promise<void> {
    const org = await this.getOrCreateOrg(orgId);

    const existingIndex = org.commonIssues.findIndex(i => i.issue === issue);
    if (existingIndex >= 0) {
      org.commonIssues[existingIndex].resolutionCount += resolutionCount;
      org.commonIssues[existingIndex].avgResolutionTime =
        (org.commonIssues[existingIndex].avgResolutionTime + avgResolutionTime) / 2;
    } else {
      org.commonIssues.push({ issue, resolutionCount, avgResolutionTime });
    }

    // Sort by resolution count
    org.commonIssues.sort((a, b) => b.resolutionCount - a.resolutionCount);

    await this.saveOrg(org);
  }

  /**
   * Update success metrics
   */
  async updateSuccessMetrics(
    orgId: string,
    metrics: Partial<{ csatTarget: number; avgResolutionTime: number; firstContactResolution: number }>
  ): Promise<void> {
    const org = await this.getOrCreateOrg(orgId);
    org.successMetrics = { ...org.successMetrics, ...metrics };
    await this.saveOrg(org);
  }

  /**
   * Get organizational insights
   */
  async getInsights(orgId: string): Promise<{
    totalPolicies: number;
    activePolicies: number;
    commonIssueCount: number;
    avgResolutionTime: number;
    csatTarget: number;
    currentCsat?: number;
  }> {
    const org = await this.getOrCreateOrg(orgId);

    return {
      totalPolicies: org.policies.length,
      activePolicies: org.policies.filter(p => p.active).length,
      commonIssueCount: org.commonIssues.length,
      avgResolutionTime: org.successMetrics.avgResolutionTime,
      csatTarget: org.successMetrics.csatTarget,
    };
  }

  /**
   * Get escalation pattern for situation
   */
  async getEscalationPath(
    orgId: string,
    situation: string
  ): Promise<string | null> {
    const org = await this.getOrCreateOrg(orgId);

    for (const pattern of org.escalationPatterns) {
      if (situation.toLowerCase().includes(pattern.pattern.toLowerCase())) {
        return pattern.typicalEscalation;
      }
    }

    return null;
  }

  /**
   * Save organization to storage
   */
  private async saveOrg(org: { orgId: string; [key: string]: unknown }): Promise<void> {
    const key = `org:memory:${org.orgId}`;

    if (this.useRedis) {
      try {
        await this.redis.setex(key, this.orgTTL, JSON.stringify(org));
      } catch (error) {
        console.error('Redis save org error:', error);
        inMemoryOrgs.set(org.orgId, org);
      }
    } else {
      inMemoryOrgs.set(org.orgId, org);
    }
  }

  /**
   * Get all organizations
   */
  async getAllOrgs(): Promise<string[]> {
    const orgIds: string[] = [];

    if (this.useRedis) {
      try {
        const keys = await this.redis.keys('org:memory:*');
        orgIds.push(...keys.map(k => k.replace('org:memory:', '')));
      } catch (error) {
        console.error('Redis keys error:', error);
      }
    }

    inMemoryOrgs.forEach((_, id) => {
      if (!orgIds.includes(id)) {
        orgIds.push(id);
      }
    });

    return orgIds;
  }

  /**
   * Delete organization
   */
  async deleteOrg(orgId: string): Promise<void> {
    const key = `org:memory:${orgId}`;

    if (this.useRedis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }

    inMemoryOrgs.delete(orgId);
  }
}

export const organizationMemory = new OrgMemory();