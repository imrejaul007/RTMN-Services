/**
 * Retail OS SDK client (port 5030)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class RetailClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5030);
  }
}
