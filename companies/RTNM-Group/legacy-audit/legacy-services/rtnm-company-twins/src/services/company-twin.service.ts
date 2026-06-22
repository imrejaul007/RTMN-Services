import { v4 as uuidv4 } from 'uuid';
import {
  CompanyTwin,
  ICompanyTwin,
  ICompanyTwinDocument,
  IBudget,
  IPolicy,
  IAIAgent,
  createDefaultBudget,
  createDefaultTrustRules,
  createDefaultAIAgent,
  createDefaultMargins,
  createDefaultGrowthTargets,
} from '../models/company-twin.model';
import logger from '../utils/logger';

export interface CreateTwinInput {
  corpId: string;
  name: string;
  type: ICompanyTwin['type'];
  revenueModel?: ICompanyTwin['revenueModel'];
  costStructure?: ICompanyTwin['costStructure'];
  margins?: ICompanyTwin['margins'];
  growthTargets?: ICompanyTwin['growthTargets'];
  riskTolerance?: ICompanyTwin['riskTolerance'];
  budget?: Partial<IBudget>;
  policies?: IPolicy[];
  aiAgent?: Partial<IAIAgent>;
  trustRules?: ICompanyTwin['trustRules'];
  metadata?: Record<string, unknown>;
}

export interface UpdateTwinInput {
  name?: string;
  type?: ICompanyTwin['type'];
  revenueModel?: Partial<ICompanyTwin['revenueModel']>;
  costStructure?: Partial<ICompanyTwin['costStructure']>;
  margins?: Partial<ICompanyTwin['margins']>;
  growthTargets?: Partial<ICompanyTwin['growthTargets']>;
  riskTolerance?: ICompanyTwin['riskTolerance'];
  status?: ICompanyTwin['status'];
  metadata?: Record<string, unknown>;
}

export interface UpdateBudgetInput {
  total?: number;
  allocated?: number;
  categories?: IBudget['categories'];
  fiscalYear?: string;
  currency?: string;
}

export interface UpdatePoliciesInput {
  policies: IPolicy[];
  action?: 'replace' | 'merge' | 'add';
}

export interface TwinResponse {
  success: boolean;
  data?: ICompanyTwin;
  error?: string;
  message?: string;
}

class CompanyTwinService {
  /**
   * Create a new company twin
   */
  async createTwin(input: CreateTwinInput): Promise<TwinResponse> {
    try {
      logger.info('Creating company twin', { corpId: input.corpId, name: input.name });

      // Check if twin already exists
      const existingTwin = await CompanyTwin.findOne({ corpId: input.corpId });
      if (existingTwin) {
        return {
          success: false,
          error: `Company twin with corpId ${input.corpId} already exists`,
        };
      }

      const twinId = `twin_${uuidv4()}`;
      const fiscalYear = input.budget?.fiscalYear || new Date().getFullYear().toString();

      // Create default budget if not provided
      const budget: IBudget = {
        ...createDefaultBudget(fiscalYear),
        ...input.budget,
      };

      // Create AI agent if not provided
      const aiAgent: IAIAgent = {
        ...createDefaultAIAgent(input.name, 'ceo'),
        ...input.aiAgent,
      };

      const twinData: Partial<ICompanyTwinDocument> = {
        twinId,
        corpId: input.corpId,
        name: input.name,
        type: input.type,
        revenueModel: input.revenueModel || {
          type: 'subscription',
          pricing: {
            basePrice: 0,
            currency: 'INR',
            billingCycle: 'monthly',
          },
        },
        costStructure: input.costStructure || {
          fixed: 0,
          variable: 0,
          total: 0,
          breakdown: [],
        },
        margins: input.margins || createDefaultMargins(),
        growthTargets: input.growthTargets || createDefaultGrowthTargets(),
        riskTolerance: input.riskTolerance || 'moderate',
        aiAgent,
        budget,
        policies: input.policies || [],
        trustRules: input.trustRules || createDefaultTrustRules(),
        status: 'pending',
        metadata: input.metadata,
      };

      const twin = new CompanyTwin(twinData);
      await twin.save();

      logger.info('Company twin created successfully', { twinId, corpId: input.corpId });

      return {
        success: true,
        data: twin.toJSON() as ICompanyTwin,
        message: 'Company twin created successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating company twin', { error: errorMessage, input });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get company twin by corpId
   */
  async getTwin(corpId: string): Promise<TwinResponse> {
    try {
      logger.info('Getting company twin', { corpId });

      const twin = await CompanyTwin.findOne({ corpId });

      if (!twin) {
        return {
          success: false,
          error: `Company twin with corpId ${corpId} not found`,
        };
      }

      return {
        success: true,
        data: twin.toJSON() as ICompanyTwin,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting company twin', { error: errorMessage, corpId });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get all twins with optional filters
   */
  async getAllTwins(filters?: {
    status?: ICompanyTwin['status'];
    type?: ICompanyTwin['type'];
    limit?: number;
    skip?: number;
  }): Promise<{ success: boolean; data?: ICompanyTwin[]; total?: number; error?: string }> {
    try {
      const query: Record<string, unknown> = {};

      if (filters?.status) {
        query.status = filters.status;
      }
      if (filters?.type) {
        query.type = filters.type;
      }

      const limit = filters?.limit || 50;
      const skip = filters?.skip || 0;

      const [twins, total] = await Promise.all([
        CompanyTwin.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
        CompanyTwin.countDocuments(query),
      ]);

      return {
        success: true,
        data: twins.map((t) => t.toJSON() as ICompanyTwin),
        total,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting all twins', { error: errorMessage });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update company twin
   */
  async updateTwin(corpId: string, updates: UpdateTwinInput): Promise<TwinResponse> {
    try {
      logger.info('Updating company twin', { corpId, updates });

      const twin = await CompanyTwin.findOneAndUpdate(
        { corpId },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!twin) {
        return {
          success: false,
          error: `Company twin with corpId ${corpId} not found`,
        };
      }

      logger.info('Company twin updated successfully', { twinId: twin.twinId, corpId });

      return {
        success: true,
        data: twin.toJSON() as ICompanyTwin,
        message: 'Company twin updated successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating company twin', { error: errorMessage, corpId, updates });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update budget for company twin
   */
  async updateBudget(corpId: string, budgetUpdates: UpdateBudgetInput): Promise<TwinResponse> {
    try {
      logger.info('Updating budget for company twin', { corpId, budgetUpdates });

      const twin = await CompanyTwin.findOne({ corpId });

      if (!twin) {
        return {
          success: false,
          error: `Company twin with corpId ${corpId} not found`,
        };
      }

      // Calculate remaining budget
      const total = budgetUpdates.total ?? twin.budget.total;
      const allocated = budgetUpdates.allocated ?? twin.budget.allocated;
      const remaining = total - allocated;

      const updatedBudget: IBudget = {
        ...twin.budget,
        ...budgetUpdates,
        remaining: Math.max(0, remaining),
        lastUpdated: new Date(),
      };

      twin.budget = updatedBudget;
      await twin.save();

      logger.info('Budget updated successfully', { twinId: twin.twinId, corpId });

      return {
        success: true,
        data: twin.toJSON() as ICompanyTwin,
        message: 'Budget updated successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating budget', { error: errorMessage, corpId });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update policies for company twin
   */
  async updatePolicies(corpId: string, policyUpdates: UpdatePoliciesInput): Promise<TwinResponse> {
    try {
      logger.info('Updating policies for company twin', { corpId, action: policyUpdates.action });

      const twin = await CompanyTwin.findOne({ corpId });

      if (!twin) {
        return {
          success: false,
          error: `Company twin with corpId ${corpId} not found`,
        };
      }

      let updatedPolicies: IPolicy[];

      switch (policyUpdates.action) {
        case 'replace':
          updatedPolicies = policyUpdates.policies;
          break;
        case 'merge':
          // Merge new policies with existing, updating matching ones
          const existingPolicyMap = new Map(twin.policies.map((p) => [p.policyId, p]));
          policyUpdates.policies.forEach((newPolicy) => {
            existingPolicyMap.set(newPolicy.policyId, newPolicy);
          });
          updatedPolicies = Array.from(existingPolicyMap.values());
          break;
        case 'add':
        default:
          // Add new policies, avoiding duplicates
          const existingIds = new Set(twin.policies.map((p) => p.policyId));
          const newPolicies = policyUpdates.policies.filter((p) => !existingIds.has(p.policyId));
          updatedPolicies = [...twin.policies, ...newPolicies];
          break;
      }

      twin.policies = updatedPolicies;
      await twin.save();

      logger.info('Policies updated successfully', { twinId: twin.twinId, corpId });

      return {
        success: true,
        data: twin.toJSON() as ICompanyTwin,
        message: 'Policies updated successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating policies', { error: errorMessage, corpId });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update AI agent for company twin
   */
  async updateAIAgent(corpId: string, agentUpdates: Partial<IAIAgent>): Promise<TwinResponse> {
    try {
      logger.info('Updating AI agent for company twin', { corpId });

      const twin = await CompanyTwin.findOne({ corpId });

      if (!twin) {
        return {
          success: false,
          error: `Company twin with corpId ${corpId} not found`,
        };
      }

      twin.aiAgent = {
        ...twin.aiAgent,
        ...agentUpdates,
      };
      await twin.save();

      logger.info('AI agent updated successfully', { twinId: twin.twinId, corpId });

      return {
        success: true,
        data: twin.toJSON() as ICompanyTwin,
        message: 'AI agent updated successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating AI agent', { error: errorMessage, corpId });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update trust rules for company twin
   */
  async updateTrustRules(
    corpId: string,
    trustRules: Partial<ICompanyTwin['trustRules']>
  ): Promise<TwinResponse> {
    try {
      logger.info('Updating trust rules for company twin', { corpId });

      const twin = await CompanyTwin.findOneAndUpdate(
        { corpId },
        { $set: { trustRules: { ...twin?.trustRules, ...trustRules } } },
        { new: true, runValidators: true }
      );

      if (!twin) {
        return {
          success: false,
          error: `Company twin with corpId ${corpId} not found`,
        };
      }

      logger.info('Trust rules updated successfully', { twinId: twin.twinId, corpId });

      return {
        success: true,
        data: twin.toJSON() as ICompanyTwin,
        message: 'Trust rules updated successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating trust rules', { error: errorMessage, corpId });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete company twin
   */
  async deleteTwin(corpId: string): Promise<TwinResponse> {
    try {
      logger.info('Deleting company twin', { corpId });

      const twin = await CompanyTwin.findOneAndDelete({ corpId });

      if (!twin) {
        return {
          success: false,
          error: `Company twin with corpId ${corpId} not found`,
        };
      }

      logger.info('Company twin deleted successfully', { twinId: twin.twinId, corpId });

      return {
        success: true,
        data: twin.toJSON() as ICompanyTwin,
        message: 'Company twin deleted successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error deleting company twin', { error: errorMessage, corpId });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Activate company twin
   */
  async activateTwin(corpId: string): Promise<TwinResponse> {
    try {
      logger.info('Activating company twin', { corpId });

      const twin = await CompanyTwin.findOneAndUpdate(
        { corpId },
        { $set: { status: 'active' } },
        { new: true }
      );

      if (!twin) {
        return {
          success: false,
          error: `Company twin with corpId ${corpId} not found`,
        };
      }

      // Also activate AI agent
      twin.aiAgent.status = 'active';
      await twin.save();

      logger.info('Company twin activated', { twinId: twin.twinId, corpId });

      return {
        success: true,
        data: twin.toJSON() as ICompanyTwin,
        message: 'Company twin activated successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error activating company twin', { error: errorMessage, corpId });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Suspend company twin
   */
  async suspendTwin(corpId: string, reason?: string): Promise<TwinResponse> {
    try {
      logger.info('Suspending company twin', { corpId, reason });

      const twin = await CompanyTwin.findOneAndUpdate(
        { corpId },
        { $set: { status: 'suspended' } },
        { new: true }
      );

      if (!twin) {
        return {
          success: false,
          error: `Company twin with corpId ${corpId} not found`,
        };
      }

      // Suspend AI agent
      twin.aiAgent.status = 'inactive';
      await twin.save();

      logger.info('Company twin suspended', { twinId: twin.twinId, corpId, reason });

      return {
        success: true,
        data: twin.toJSON() as ICompanyTwin,
        message: 'Company twin suspended successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error suspending company twin', { error: errorMessage, corpId });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get twin analytics/summary
   */
  async getTwinSummary(corpId: string): Promise<{
    success: boolean;
    data?: {
      corpId: string;
      twinId: string;
      status: string;
      budgetUtilization: number;
      activePolicies: number;
      aiAgentStatus: string;
      trustLevel: string;
      marginsHealth: 'healthy' | 'warning' | 'critical';
    };
    error?: string;
  }> {
    try {
      const twin = await CompanyTwin.findOne({ corpId });

      if (!twin) {
        return {
          success: false,
          error: `Company twin with corpId ${corpId} not found`,
        };
      }

      const budgetUtilization =
        twin.budget.total > 0
          ? ((twin.budget.total - twin.budget.remaining) / twin.budget.total) * 100
          : 0;

      const activePolicies = twin.policies.filter((p) => p.status === 'active').length;

      const marginsHealth =
        twin.margins.net >= twin.margins.target.net
          ? 'healthy'
          : twin.margins.net >= twin.margins.target.net * 0.7
          ? 'warning'
          : 'critical';

      return {
        success: true,
        data: {
          corpId: twin.corpId,
          twinId: twin.twinId,
          status: twin.status,
          budgetUtilization: Math.round(budgetUtilization * 100) / 100,
          activePolicies,
          aiAgentStatus: twin.aiAgent.status,
          trustLevel: twin.trustRules.trustLevel,
          marginsHealth,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting twin summary', { error: errorMessage, corpId });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const companyTwinService = new CompanyTwinService();
export default companyTwinService;
