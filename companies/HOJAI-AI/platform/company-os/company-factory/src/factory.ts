/**
 * Company Factory
 *
 * One-click deployment of any industry company.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CompanyFactoryTemplate,
  FactoryDeployment,
  CompanyStage,
} from './types';
import { getTemplate, listTemplates } from './templates';

// ============================================
// Deployments Store
// ============================================

const deployments = new Map<string, FactoryDeployment>();

// ============================================
// Company Factory Service
// ============================================

export class CompanyFactoryService {
  /**
   * Deploy a company from a template
   */
  async deployCompany(params: {
    industry: string;
    companyName?: string;
    customizations?: {
      departments?: string[];
      extensions?: string[];
      aiWorkers?: string[];
      channels?: string[];
      stage?: CompanyStage;
    };
  }): Promise<FactoryDeployment> {
    const template = getTemplate(params.industry);
    if (!template) {
      throw new Error(`Unknown industry: ${params.industry}`);
    }

    const companyId = `company_${uuidv4().slice(0, 8)}`;

    // Apply customizations
    const departments = params.customizations?.departments || template.defaultDepartments;
    const extensions = params.customizations?.extensions || template.defaultExtensions;
    const aiWorkers = params.customizations?.aiWorkers || template.defaultAIWorkers;
    const channels = params.customizations?.channels || template.defaultChannels;
    const stage = params.customizations?.stage || 'startup';

    const deployment: FactoryDeployment = {
      companyId,
      template,
      companyName: params.companyName || template.defaultName,
      stage,
      deployedAt: new Date().toISOString(),
      status: 'pending',
      components: {
        companyOS: false,
        industryExtension: false,
        aiWorkers: [],
        distributionChannels: [],
        wallets: false,
        trust: false,
      },
    };

    deployments.set(companyId, deployment);

    // Execute deployment steps
    try {
      await this.executeDeployment(deployment, {
        departments,
        extensions,
        aiWorkers,
        channels,
      });
    } catch (error) {
      deployment.status = 'failed';
      throw error;
    }

    return deployment;
  }

  /**
   * Execute deployment steps
   */
  private async executeDeployment(
    deployment: FactoryDeployment,
    config: {
      departments: string[];
      extensions: string[];
      aiWorkers: string[];
      channels: string[];
    }
  ): Promise<void> {
    deployment.status = 'deploying';

    // Step 1: CompanyOS
    await this.step('CompanyOS', async () => {
      deployment.components.companyOS = true;
    });

    // Step 2: Industry Extension
    await this.step('Industry Extension', async () => {
      deployment.components.industryExtension = true;
    });

    // Step 3: AI Workers
    for (const workerId of config.aiWorkers) {
      await this.step(`AI Worker: ${workerId}`, async () => {
        deployment.components.aiWorkers.push(workerId);
      });
    }

    // Step 4: Distribution Channels
    for (const channel of config.channels) {
      await this.step(`Channel: ${channel}`, async () => {
        deployment.components.distributionChannels.push(channel);
      });
    }

    // Step 5: Wallets
    await this.step('Wallets', async () => {
      deployment.components.wallets = true;
    });

    // Step 6: Trust
    await this.step('Trust', async () => {
      deployment.components.trust = true;
    });

    deployment.status = 'active';
  }

  /**
   * Execute a single step
   */
  private async step(name: string, fn: () => Promise<void>): Promise<void> {
    console.log(`[Factory] Deploying: ${name}`);
    await fn();
    // Simulate deployment time
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Get deployment status
   */
  getDeployment(companyId: string): FactoryDeployment | null {
    return deployments.get(companyId) || null;
  }

  /**
   * List all deployments
   */
  listDeployments(): FactoryDeployment[] {
    return Array.from(deployments.values());
  }

  /**
   * Upgrade a company to a new stage
   */
  upgradeStage(companyId: string, newStage: CompanyStage): FactoryDeployment | null {
    const deployment = deployments.get(companyId);
    if (!deployment) return null;

    deployment.stage = newStage;
    deployment.deployedAt = new Date().toISOString();
    return deployment;
  }

  /**
   * Get available templates
   */
  getTemplates(): CompanyFactoryTemplate[] {
    return listTemplates();
  }
}

export const companyFactory = new CompanyFactoryService();