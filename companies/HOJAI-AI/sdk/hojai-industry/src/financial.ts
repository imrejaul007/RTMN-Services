/**
 * Financial OS SDK client (port 5220)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class FinancialClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5220);
  }
}
