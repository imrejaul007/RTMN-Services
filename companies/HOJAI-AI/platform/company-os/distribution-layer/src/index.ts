/**
 * Distribution Layer - Main Module
 *
 * Connects CompanyOS to:
 * - Consumer Apps (DO, REZ, Nuqta, BuzzLocal, StayOwn, Airzy)
 * - B2B Platforms (IndiaMART, TradeIndia)
 * - Agentic Commerce (Nexha)
 * - Global Nexus Federation
 */

export * from './types';
export * from './channels';
export * from './orchestrator';

import { channelRegistry } from './channels';
import { distributionOrchestrator } from './orchestrator';

export { channelRegistry, distributionOrchestrator };