/**
 * HOJAI Shared Clients Index
 * Exports all RTNM ecosystem integration clients
 */

// Re-export all clients
export { rabtul, RABTULClient } from './rabtul-client';
export type {
  AuthVerifyResponse,
  PaymentRequest,
  PaymentResponse,
  BalanceResponse,
  NotificationRequest,
  NotificationResponse
} from './rabtul-client';

export { rezIdentity, REZIdentityClient } from './rez-identity-client';
export type {
  UserProfile,
  PreCallResearch,
  ThreeSixtyView,
  IdentityVerification
} from './rez-identity-client';

export { skillnet, SkillNetClient } from './skillnet-client';
export type {
  Skill,
  GoalDecomposition,
  SkillExecution,
  SkillRecommendation
} from './skillnet-client';

export { industryAI, IndustryAIClient, INDUSTRY_URLS, INDUSTRY_VERTICALS } from './industry-ai-client';
export type {
  IndustryAnalysis,
  IndustryContext,
  IndustryReport,
  IndustryVertical
} from './industry-ai-client';

/**
 * Integration status checker
 * Provides a unified health check for all connected services
 */
export async function getIntegrationStatus() {
  const [rabtulHealth, identityHealth, skillnetHealth, industryHealth] = await Promise.all([
    rabtul.healthCheck().catch(() => ({ auth: false, payment: false, wallet: false, notification: false, overall: false })),
    rezIdentity.healthCheck().catch(() => ({ healthy: false, sources: 0 })),
    skillnet.healthCheck().catch(() => ({ healthy: false, skills: 0 })),
    industryAI.healthCheck().catch(() => ({ healthy: {}, total: 0, available: 0 }))
  ]);

  return {
    rabtul: rabtulHealth,
    identityHub: identityHealth,
    skillnet: skillnetHealth,
    industryAI: industryHealth,
    overall: rabtulHealth.overall && identityHealth.healthy && skillnetHealth.healthy,
    timestamp: new Date().toISOString()
  };
}