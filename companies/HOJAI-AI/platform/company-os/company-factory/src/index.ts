/**
 * Company Factory - Main Module
 *
 * One-click deployment of any industry company.
 * Creates complete companies with:
 * - CompanyOS (universal layer)
 * - Industry Extension (vertical layer)
 * - AI Workers (workforce)
 * - Distribution Channels (commerce)
 * - Wallets + Trust (economy)
 */

export * from './types';
export * from './templates';
export * from './factory';

import { companyFactory } from './factory';
import { FACTORY_TEMPLATES, getTemplate, listTemplates } from './templates';

export { companyFactory, FACTORY_TEMPLATES, getTemplate, listTemplates };