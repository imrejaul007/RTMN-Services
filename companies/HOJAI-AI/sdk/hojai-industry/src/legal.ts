/**
 * Legal OS SDK client (port 5035)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class LegalClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5035);
  }
}
