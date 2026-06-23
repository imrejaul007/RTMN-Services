/**
 * SkillOS SDK — Typed HTTP client
 *
 * Auto-generated from /openapi.json — DO NOT EDIT BY HAND.
 */

import type { ApiResponse, Skill, Asset, Install, Transaction } from './types.js';

export interface ClientConfig {
  baseUrl?: string;
  token?: string;
  fetch?: typeof fetch;
}

export class SkillsClient {
  private baseUrl: string;
  private token?: string;
  private fetcher: typeof fetch;

  constructor(config: ClientConfig = {}) {
    this.baseUrl = (config.baseUrl || 'http://localhost:4743').replace(/\/$/, '');
    this.token = config.token;
    this.fetcher = config.fetch || fetch;
  }

  private async request(method: string, path: string, body?: any, query?: Record<string, any>): Promise<ApiResponse> {
    let url = this.baseUrl + path;
    if (query) {
      const qs = Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
        .join('&');
      if (qs) url += '?' + qs;
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
    const res = await this.fetcher(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: any;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const err = new Error(data?.message || data?.error || 'HTTP ' + res.status);
      (err as any).status = res.status;
      (err as any).body = data;
      throw err;
    }
    return data;
  }

  /**
   * GET /health
   * Tags: auto-generated
   */
  async getHealth(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/health`, undefined, undefined);
  }

  /**
   * POST /api/skills
   * Tags: auto-generated
   */
  async postApiSkills(body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skills`, body, undefined);
  }

  /**
   * GET /api/skills/:id
   * Tags: auto-generated
   */
  async getApiSkillsId(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/skills/${encodeURIComponent(String(id))}`, undefined, undefined);
  }

  /**
   * POST /api/skills/:id/execute
   * Tags: auto-generated
   */
  async postApiSkillsIdExecute(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skills/${encodeURIComponent(String(id))}/execute`, body, undefined);
  }

  /**
   * POST /api/skills/compose
   * Tags: auto-generated
   */
  async postApiSkillsCompose(body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skills/compose`, body, undefined);
  }

  /**
   * POST /api/skills/:id/learn
   * Tags: auto-generated
   */
  async postApiSkillsIdLearn(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skills/${encodeURIComponent(String(id))}/learn`, body, undefined);
  }

  /**
   * POST /api/skills/:id/versions
   * Tags: auto-generated
   */
  async postApiSkillsIdVersions(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skills/${encodeURIComponent(String(id))}/versions`, body, undefined);
  }

  /**
   * POST /api/skills/:id/permissions
   * Tags: auto-generated
   */
  async postApiSkillsIdPermissions(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skills/${encodeURIComponent(String(id))}/permissions`, body, undefined);
  }

  /**
   * GET /api/skills/:id/analytics
   * Tags: auto-generated
   */
  async getApiSkillsIdAnalytics(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/skills/${encodeURIComponent(String(id))}/analytics`, undefined, undefined);
  }

  /**
   * POST /api/skills/:id/dependencies
   * Tags: auto-generated
   */
  async postApiSkillsIdDependencies(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skills/${encodeURIComponent(String(id))}/dependencies`, body, undefined);
  }

  /**
   * GET /api/skills/:id/events
   * Tags: auto-generated
   */
  async getApiSkillsIdEvents(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/skills/${encodeURIComponent(String(id))}/events`, undefined, undefined);
  }

  /**
   * PUT /api/skills/:id/policies
   * Tags: auto-generated
   */
  async putApiSkillsIdPolicies(id: string, body?: any): Promise<ApiResponse> {
    return this.request('PUT', `/api/skills/${encodeURIComponent(String(id))}/policies`, body, undefined);
  }

  /**
   * POST /api/skills/:id/memory
   * Tags: auto-generated
   */
  async postApiSkillsIdMemory(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skills/${encodeURIComponent(String(id))}/memory`, body, undefined);
  }

  /**
   * POST /api/skills/:id/twin
   * Tags: auto-generated
   */
  async postApiSkillsIdTwin(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skills/${encodeURIComponent(String(id))}/twin`, body, undefined);
  }

  /**
   * POST /api/skills/:id/flow
   * Tags: auto-generated
   */
  async postApiSkillsIdFlow(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skills/${encodeURIComponent(String(id))}/flow`, body, undefined);
  }

  /**
   * POST /api/skills/:id/test
   * Tags: auto-generated
   */
  async postApiSkillsIdTest(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skills/${encodeURIComponent(String(id))}/test`, body, undefined);
  }

  /**
   * GET /api/skills/:id/monitoring
   * Tags: auto-generated
   */
  async getApiSkillsIdMonitoring(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/skills/${encodeURIComponent(String(id))}/monitoring`, undefined, undefined);
  }

  /**
   * GET /api/assets
   * Tags: auto-generated
   */
  async getApiAssets(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/assets`, undefined, undefined);
  }

  /**
   * GET /api/assets/:id
   * Tags: auto-generated
   */
  async getApiAssetsId(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/assets/${encodeURIComponent(String(id))}`, undefined, undefined);
  }

  /**
   * POST /api/assets/:id/install
   * Tags: auto-generated
   */
  async postApiAssetsIdInstall(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/assets/${encodeURIComponent(String(id))}/install`, body, undefined);
  }

  /**
   * POST /api/assets/:id/certify
   * Tags: auto-generated
   */
  async postApiAssetsIdCertify(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/assets/${encodeURIComponent(String(id))}/certify`, body, undefined);
  }

  /**
   * POST /api/assets/:id/deprecate
   * Tags: auto-generated
   */
  async postApiAssetsIdDeprecate(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/assets/${encodeURIComponent(String(id))}/deprecate`, body, undefined);
  }

  /**
   * GET /api/installed
   * Tags: auto-generated
   */
  async getApiInstalled(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/installed`, undefined, undefined);
  }

  /**
   * DELETE /api/installed/:id
   * Tags: auto-generated
   */
  async deleteApiInstalledId(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('DELETE', `/api/installed/${encodeURIComponent(String(id))}`, undefined, undefined);
  }

  /**
   * POST /api/billing/charge
   * Tags: auto-generated
   */
  async postApiBillingCharge(body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/billing/charge`, body, undefined);
  }

  /**
   * GET /api/billing/transactions
   * Tags: auto-generated
   */
  async getApiBillingTransactions(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/billing/transactions`, undefined, undefined);
  }

  /**
   * GET /api/billing/payouts/:publisherId
   * Tags: auto-generated
   */
  async getApiBillingPayoutsPublisherid(publisherId: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/billing/payouts/${encodeURIComponent(String(publisherId))}`, undefined, undefined);
  }

  /**
   * GET /api/audit
   * Tags: auto-generated
   */
  async getApiAudit(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/audit`, undefined, undefined);
  }

  /**
   * GET /
   * Tags: auto-generated
   */
  async getRoot(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/`, undefined, undefined);
  }

  /**
   * GET /ready
   * Tags: auto-generated
   */
  async getReady(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/ready`, undefined, undefined);
  }

  /**
   * GET /api/skills/categories
   * Tags: auto-generated
   */
  async getApiSkillsCategories(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/skills/categories`, undefined, undefined);
  }

  /**
   * GET /api/skills/discover
   * Tags: auto-generated
   */
  async getApiSkillsDiscover(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/skills/discover`, undefined, undefined);
  }

  /**
   * GET /api/discover/semantic
   * Tags: auto-generated
   */
  async getApiDiscoverSemantic(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/discover/semantic`, undefined, undefined);
  }

  /**
   * GET /api/recommend
   * Tags: auto-generated
   */
  async getApiRecommend(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/recommend`, undefined, undefined);
  }

  /**
   * GET /api/skills/marketplace
   * Tags: auto-generated
   */
  async getApiSkillsMarketplace(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/skills/marketplace`, undefined, undefined);
  }

  /**
   * GET /api/analytics
   * Tags: auto-generated
   */
  async getApiAnalytics(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/analytics`, undefined, undefined);
  }

  /**
   * POST /api/skill-templates
   * Tags: auto-generated
   */
  async postApiSkill-templates(body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skill-templates`, body, undefined);
  }

  /**
   * POST /api/skill-templates/:id/instantiate
   * Tags: auto-generated
   */
  async postApiSkill-templatesIdInstantiate(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/skill-templates/${encodeURIComponent(String(id))}/instantiate`, body, undefined);
  }

  /**
   * GET /api/skill-events
   * Tags: auto-generated
   */
  async getApiSkill-events(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/skill-events`, undefined, undefined);
  }

  /**
   * GET /api/skills/:id/tests
   * Tags: auto-generated
   */
  async getApiSkillsIdTests(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/skills/${encodeURIComponent(String(id))}/tests`, undefined, undefined);
  }

  /**
   * GET /openapi.json
   * Tags: auto-generated
   */
  async getOpenapi.json(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/openapi.json`, undefined, undefined);
  }

  /**
   * POST /api/installed/:id/pin
   * Tags: auto-generated
   */
  async postApiInstalledIdPin(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/installed/${encodeURIComponent(String(id))}/pin`, body, undefined);
  }

  /**
   * POST /api/installed/:id/upgrade
   * Tags: auto-generated
   */
  async postApiInstalledIdUpgrade(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/installed/${encodeURIComponent(String(id))}/upgrade`, body, undefined);
  }

  /**
   * POST /api/installed/:id/rollback
   * Tags: auto-generated
   */
  async postApiInstalledIdRollback(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/installed/${encodeURIComponent(String(id))}/rollback`, body, undefined);
  }

  /**
   * GET /api/installed/:id/history
   * Tags: auto-generated
   */
  async getApiInstalledIdHistory(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/installed/${encodeURIComponent(String(id))}/history`, undefined, undefined);
  }

  /**
   * POST /api/libraries
   * Tags: auto-generated
   */
  async postApiLibraries(body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/libraries`, body, undefined);
  }

  /**
   * GET /api/libraries/:id
   * Tags: auto-generated
   */
  async getApiLibrariesId(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/libraries/${encodeURIComponent(String(id))}`, undefined, undefined);
  }

  /**
   * POST /api/libraries/:id/skills/:assetId
   * Tags: auto-generated
   */
  async postApiLibrariesIdSkillsAssetid(id: string, assetId: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/libraries/${encodeURIComponent(String(id))}/skills/${encodeURIComponent(String(assetId))}`, body, undefined);
  }

  /**
   * GET /api/libraries/:id/skills
   * Tags: auto-generated
   */
  async getApiLibrariesIdSkills(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/libraries/${encodeURIComponent(String(id))}/skills`, undefined, undefined);
  }

  /**
   * POST /api/libraries/:id/agents/:agentId
   * Tags: auto-generated
   */
  async postApiLibrariesIdAgentsAgentid(id: string, agentId: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/libraries/${encodeURIComponent(String(id))}/agents/${encodeURIComponent(String(agentId))}`, body, undefined);
  }

  /**
   * POST /api/datasets
   * Tags: auto-generated
   */
  async postApiDatasets(body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/datasets`, body, undefined);
  }

  /**
   * GET /api/datasets/:id
   * Tags: auto-generated
   */
  async getApiDatasetsId(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/datasets/${encodeURIComponent(String(id))}`, undefined, undefined);
  }

  /**
   * POST /api/datasets/:id/examples
   * Tags: auto-generated
   */
  async postApiDatasetsIdExamples(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/datasets/${encodeURIComponent(String(id))}/examples`, body, undefined);
  }

  /**
   * POST /api/datasets/:id/finalize
   * Tags: auto-generated
   */
  async postApiDatasetsIdFinalize(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/datasets/${encodeURIComponent(String(id))}/finalize`, body, undefined);
  }

  /**
   * POST /api/datasets/:id/version
   * Tags: auto-generated
   */
  async postApiDatasetsIdVersion(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/datasets/${encodeURIComponent(String(id))}/version`, body, undefined);
  }

  /**
   * POST /api/training/jobs
   * Tags: auto-generated
   */
  async postApiTrainingJobs(body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/training/jobs`, body, undefined);
  }

  /**
   * GET /api/training/jobs/:id
   * Tags: auto-generated
   */
  async getApiTrainingJobsId(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/training/jobs/${encodeURIComponent(String(id))}`, undefined, undefined);
  }

  /**
   * POST /api/training/jobs/:id/sync
   * Tags: auto-generated
   */
  async postApiTrainingJobsIdSync(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/training/jobs/${encodeURIComponent(String(id))}/sync`, body, undefined);
  }

  /**
   * POST /api/training/jobs/:id/cancel
   * Tags: auto-generated
   */
  async postApiTrainingJobsIdCancel(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/training/jobs/${encodeURIComponent(String(id))}/cancel`, body, undefined);
  }

  /**
   * POST /api/adapters
   * Tags: auto-generated
   */
  async postApiAdapters(body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/adapters`, body, undefined);
  }

  /**
   * GET /api/adapters/:id
   * Tags: auto-generated
   */
  async getApiAdaptersId(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/adapters/${encodeURIComponent(String(id))}`, undefined, undefined);
  }

  /**
   * POST /api/assets/:id/reviews
   * Tags: auto-generated
   */
  async postApiAssetsIdReviews(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/assets/${encodeURIComponent(String(id))}/reviews`, body, undefined);
  }

  /**
   * GET /api/reviews/:id
   * Tags: auto-generated
   */
  async getApiReviewsId(id: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/reviews/${encodeURIComponent(String(id))}`, undefined, undefined);
  }

  /**
   * POST /api/reviews/:id/helpful
   * Tags: auto-generated
   */
  async postApiReviewsIdHelpful(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/reviews/${encodeURIComponent(String(id))}/helpful`, body, undefined);
  }

  /**
   * POST /api/reviews/:id/response
   * Tags: auto-generated
   */
  async postApiReviewsIdResponse(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/reviews/${encodeURIComponent(String(id))}/response`, body, undefined);
  }

  /**
   * POST /api/reviews/:id/flag
   * Tags: auto-generated
   */
  async postApiReviewsIdFlag(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/reviews/${encodeURIComponent(String(id))}/flag`, body, undefined);
  }

  /**
   * GET /api/creators/leaderboard
   * Tags: auto-generated
   */
  async getApiCreatorsLeaderboard(_body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/creators/leaderboard`, undefined, undefined);
  }

  /**
   * GET /api/creators/:creatorId
   * Tags: auto-generated
   */
  async getApiCreatorsCreatorid(creatorId: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/creators/${encodeURIComponent(String(creatorId))}`, undefined, undefined);
  }

  /**
   * GET /api/creators/:creatorId/assets
   * Tags: auto-generated
   */
  async getApiCreatorsCreatoridAssets(creatorId: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/creators/${encodeURIComponent(String(creatorId))}/assets`, undefined, undefined);
  }

  /**
   * POST /api/assets/:id/plans
   * Tags: auto-generated
   */
  async postApiAssetsIdPlans(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/assets/${encodeURIComponent(String(id))}/plans`, body, undefined);
  }

  /**
   * PUT /api/plans/:id
   * Tags: auto-generated
   */
  async putApiPlansId(id: string, body?: any): Promise<ApiResponse> {
    return this.request('PUT', `/api/plans/${encodeURIComponent(String(id))}`, body, undefined);
  }

  /**
   * POST /api/subscriptions
   * Tags: auto-generated
   */
  async postApiSubscriptions(body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/subscriptions`, body, undefined);
  }

  /**
   * PUT /api/subscriptions/:id
   * Tags: auto-generated
   */
  async putApiSubscriptionsId(id: string, body?: any): Promise<ApiResponse> {
    return this.request('PUT', `/api/subscriptions/${encodeURIComponent(String(id))}`, body, undefined);
  }

  /**
   * POST /api/billing/payouts
   * Tags: auto-generated
   */
  async postApiBillingPayouts(body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/billing/payouts`, body, undefined);
  }

  /**
   * PUT /api/billing/payouts/:id
   * Tags: auto-generated
   */
  async putApiBillingPayoutsId(id: string, body?: any): Promise<ApiResponse> {
    return this.request('PUT', `/api/billing/payouts/${encodeURIComponent(String(id))}`, body, undefined);
  }

  /**
   * GET /api/dashboard/publisher/:publisherId
   * Tags: auto-generated
   */
  async getApiDashboardPublisherPublisherid(publisherId: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/dashboard/publisher/${encodeURIComponent(String(publisherId))}`, undefined, undefined);
  }

  /**
   * POST /api/agents/:agentId/enhance
   * Tags: auto-generated
   */
  async postApiAgentsAgentidEnhance(agentId: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/agents/${encodeURIComponent(String(agentId))}/enhance`, body, undefined);
  }

  /**
   * GET /api/agents/:agentId/skills
   * Tags: auto-generated
   */
  async getApiAgentsAgentidSkills(agentId: string, _body?: any): Promise<ApiResponse> {
    return this.request('GET', `/api/agents/${encodeURIComponent(String(agentId))}/skills`, undefined, undefined);
  }

  /**
   * POST /api/assets/:id/install-pack
   * Tags: auto-generated
   */
  async postApiAssetsIdInstall-pack(id: string, body?: any): Promise<ApiResponse> {
    return this.request('POST', `/api/assets/${encodeURIComponent(String(id))}/install-pack`, body, undefined);
  }

}
