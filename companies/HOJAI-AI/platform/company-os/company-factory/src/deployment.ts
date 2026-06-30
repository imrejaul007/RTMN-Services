/**
 * Company Factory - Deployment Implementation
 *
 * Real deployment using the unified civilization stack bridges.
 * This replaces the stubbed deployment steps with actual wiring.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CompanyFactoryTemplate,
  FactoryDeployment,
  CompanyStage,
} from './types';
import { getTemplate, listTemplates } from './templates';

// ============================================================================
// SERVICE URLs
// ============================================================================

const SALAR_URL = process.env.SALAR_URL || 'http://localhost:4710';
const BLR_MARKETPLACE_URL = process.env.BLR_MARKETPLACE_URL || 'http://localhost:4255';
const SUTAR_DECISION_URL = process.env.SUTAR_DECISION_URL || 'http://localhost:4240';
const SUTAR_ECONOMY_URL = process.env.SUTAR_ECONOMY_URL || 'http://localhost:4294';
const AGENT_OS_URL = process.env.AGENT_OS_URL || 'http://localhost:4802';
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';
const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4705';
const SADA_URL = process.env.SADA_URL || 'http://localhost:4190';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// ============================================================================
// HELPERS
// ============================================================================

async function callService(url: string, method: string, body?: any): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (INTERNAL_TOKEN) {
    headers['x-internal-token'] = INTERNAL_TOKEN;
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error: any) {
    console.error(`[Factory] Failed to call ${url}:`, error.message);
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// DEPLOYMENT IMPLEMENTATION
// ============================================================================

export class DeploymentService {
  private deployments = new Map<string, FactoryDeployment>();

  /**
   * Deploy a complete company using the unified stack
   */
  async deploy(params: {
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
    const deployment: FactoryDeployment = {
      companyId,
      template,
      companyName: params.companyName || template.defaultName,
      stage: params.customizations?.stage || 'startup',
      deployedAt: new Date().toISOString(),
      status: 'deploying',
      components: {
        companyOS: false,
        industryExtension: false,
        aiWorkers: false,
        distribution: false,
        wallets: false,
        trust: false,
      },
    };

    console.log(`[Factory] Starting deployment for ${deployment.companyName} (${companyId})`);
    this.deployments.set(companyId, deployment);

    try {
      // Phase 1: Company Identity
      await this.deployCompanyIdentity(deployment);
      console.log(`[Factory] ✓ Company Identity deployed`);

      // Phase 2: Department Workers
      await this.deployDepartments(deployment);
      console.log(`[Factory] ✓ Departments deployed`);

      // Phase 3: AI Workers
      await this.deployAIWorkers(deployment);
      console.log(`[Factory] ✓ AI Workers deployed`);

      // Phase 4: Commerce Setup
      await this.deployCommerce(deployment);
      console.log(`[Factory] ✓ Commerce deployed`);

      // Phase 5: Trust Setup
      await this.deployTrust(deployment);
      console.log(`[Factory] ✓ Trust deployed`);

      deployment.status = 'deployed';
      console.log(`[Factory] ✓ Company deployed successfully: ${companyId}`);
    } catch (error: any) {
      deployment.status = 'failed';
      deployment.error = error.message;
      console.error(`[Factory] ✗ Deployment failed:`, error);
    }

    this.deployments.set(companyId, deployment);
    return deployment;
  }

  // ==========================================================================
  // PHASE 1: COMPANY IDENTITY
  // ==========================================================================

  private async deployCompanyIdentity(deployment: FactoryDeployment): Promise<void> {
    const { companyId, companyName, template } = deployment;

    // Step 1.1: Create company identity in CorpID
    console.log(`[Factory] Creating company identity: ${companyId}`);
    const corpidResult = await callService(
      `${CORPID_URL}/api/identities/company`,
      'POST',
      {
        companyId,
        name: companyName,
        industry: template.industry,
        type: 'COMPANY',
        metadata: {
          template: template.name,
          deployedAt: deployment.deployedAt,
        },
      }
    );

    if (!corpidResult.ok) {
      console.warn(`[Factory] CorpID creation failed, continuing...`);
    }

    // Step 1.2: Create company digital twin
    console.log(`[Factory] Creating company twin: ${companyId}`);
    const twinResult = await callService(
      `${TWINOS_URL}/api/twins/company`,
      'POST',
      {
        twinType: 'COMPANY',
        companyId,
        name: companyName,
        industry: template.industry,
        metadata: {
          template: template.name,
          deployedAt: deployment.deployedAt,
        },
      }
    );

    if (!twinResult.ok) {
      console.warn(`[Factory] Twin creation failed, continuing...`);
    }

    // Step 1.3: Create company wallet
    console.log(`[Factory] Creating company wallet: ${companyId}`);
    const walletResult = await callService(
      `${SUTAR_ECONOMY_URL}/api/v1/wallets`,
      'POST',
      {
        ownerId: companyId,
        ownerType: 'COMPANY',
        currency: 'INR',
        initialBalance: 0,
      }
    );

    if (!walletResult.ok) {
      console.warn(`[Factory] Wallet creation failed, continuing...`);
    }

    // Step 1.4: Initialize trust score
    console.log(`[Factory] Initializing trust: ${companyId}`);
    const trustResult = await callService(
      `${SADA_URL}/api/v1/trust/score/${companyId}`,
      'POST',
      {
        entityType: 'COMPANY',
        initialScore: 0.5,
        riskLevel: 'MEDIUM',
      }
    );

    if (!trustResult.ok) {
      console.warn(`[Factory] Trust init failed, continuing...`);
    }

    deployment.components.companyOS = true;
    deployment.components.wallets = true;
    deployment.components.trust = true;
  }

  // ==========================================================================
  // PHASE 2: DEPARTMENTS
  // ==========================================================================

  private async deployDepartments(deployment: FactoryDeployment): Promise<void> {
    const { companyId, template } = deployment;
    const departments = template.defaultDepartments;

    for (const dept of departments) {
      console.log(`[Factory] Creating department: ${dept}`);

      // Step 2.1: Create department twin
      const twinResult = await callService(
        `${TWINOS_URL}/api/twins/department`,
        'POST',
        {
          twinType: 'DEPARTMENT',
          companyId,
          name: dept,
        }
      );

      // Step 2.2: Register department in Salar
      const salarResult = await callService(
        `${SALAR_URL}/capabilities/department`,
        'POST',
        {
          departmentId: `${companyId}-${dept}`,
          companyId,
          name: dept,
          capabilities: [],
        }
      );

      await delay(50); // Simulate processing
    }

    deployment.components.companyOS = true;
  }

  // ==========================================================================
  // PHASE 3: AI WORKERS
  // ==========================================================================

  private async deployAIWorkers(deployment: FactoryDeployment): Promise<void> {
    const { companyId, template } = deployment;
    const aiWorkers = template.defaultAIWorkers;

    console.log(`[Factory] Deploying ${aiWorkers.length} AI workers`);

    for (const worker of aiWorkers) {
      console.log(`[Factory] Deploying AI worker: ${worker.name}`);

      // Step 3.1: Create worker identity in CorpID
      const corpidResult = await callService(
        `${CORPID_URL}/api/identities/agent`,
        'POST',
        {
          type: 'AGENT',
          name: worker.name,
          owner: companyId,
          department: worker.department,
          capabilities: worker.capabilities,
          metadata: {
            role: worker.role,
            source: 'company-factory',
          },
        }
      );

      // Step 3.2: Register in Salar
      const salarResult = await callService(
        `${SALAR_URL}/agent-twin`,
        'POST',
        {
          companyId,
          department: worker.department,
          role: worker.role,
          name: worker.name,
          capabilities: worker.capabilities,
        }
      );

      // Step 3.3: Create digital twin
      const twinResult = await callService(
        `${TWINOS_URL}/api/twins/agent`,
        'POST',
        {
          twinType: 'AGENT',
          companyId,
          department: worker.department,
          name: worker.name,
          capabilities: worker.capabilities,
          corpId: corpidResult.data?.identityId,
        }
      );

      // Step 3.4: Deploy to AgentOS
      const agentResult = await callService(
        `${AGENT_OS_URL}/api/agent/full-deploy`,
        'POST',
        {
          name: worker.name,
          type: 'custom',
          owner: companyId,
          capabilities: worker.capabilities,
          metadata: {
            role: worker.role,
            department: worker.department,
            source: 'company-factory',
          },
          scope: companyId,
        }
      );

      // Step 3.5: Index to BLR Marketplace
      if (worker.publishToMarketplace) {
        await callService(
          `${SALAR_URL}/salar-bridge/blr/index`,
          'POST',
          {
            agentTwin: {
              agentId: salarResult.data?.agentId,
              name: worker.name,
              capabilities: worker.capabilities,
              department: worker.department,
            },
          }
        );
      }

      await delay(100); // Simulate processing
    }

    deployment.components.aiWorkers = true;
  }

  // ==========================================================================
  // PHASE 4: COMMERCE
  // ==========================================================================

  private async deployCommerce(deployment: FactoryDeployment): Promise<void> {
    const { companyId, template } = deployment;

    // Step 4.1: Set up distribution channels
    for (const channel of template.defaultChannels) {
      console.log(`[Factory] Setting up channel: ${channel}`);

      // Create channel configuration
      await callService(
        `${TWINOS_URL}/api/twins/channel`,
        'POST',
        {
          twinType: 'CHANNEL',
          companyId,
          name: channel,
          status: 'ACTIVE',
        }
      );

      await delay(50);
    }

    // Step 4.2: Register in BLR if marketplace enabled
    if (template.marketplaceEnabled) {
      await callService(
        `${BLR_MARKETPLACE_URL}/api/sellers`,
        'POST',
        {
          companyId,
          companyName: deployment.companyName,
          industry: template.industry,
        }
      );
    }

    deployment.components.distribution = true;
  }

  // ==========================================================================
  // PHASE 5: TRUST
  // ==========================================================================

  private async deployTrust(deployment: FactoryDeployment): Promise<void> {
    const { companyId } = deployment;

    // Step 5.1: Request trust verification
    await callService(
      `${SADA_URL}/api/v1/trust/verify/${companyId}`,
      'POST',
      {
        entityType: 'COMPANY',
        checks: ['identity', 'kyc', 'compliance'],
      }
    );

    // Step 5.2: Push trust to all systems
    await callService(
      `${SADA_URL}/trust/push/salar`,
      'POST',
      {
        entityId: companyId,
        entityType: 'ORGANIZATION',
        trustScore: 0.5,
        riskLevel: 'MEDIUM',
      }
    );

    await delay(50);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  getDeployment(companyId: string): FactoryDeployment | undefined {
    return this.deployments.get(companyId);
  }

  listDeployments(): FactoryDeployment[] {
    return Array.from(this.deployments.values());
  }

  async rollback(companyId: string): Promise<void> {
    const deployment = this.deployments.get(companyId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${companyId}`);
    }

    console.log(`[Factory] Rolling back deployment: ${companyId}`);

    // Rollback steps (simplified)
    if (deployment.components.trust) {
      await callService(`${SADA_URL}/api/v1/trust/score/${companyId}`, 'DELETE');
    }

    if (deployment.components.wallets) {
      await callService(`${SUTAR_ECONOMY_URL}/api/v1/wallets/${companyId}`, 'DELETE');
    }

    this.deployments.delete(companyId);
    console.log(`[Factory] ✓ Rollback complete: ${companyId}`);
  }
}

// Export singleton instance
export const deploymentService = new DeploymentService();
