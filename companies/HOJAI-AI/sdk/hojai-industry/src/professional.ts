/**
 * Professional Services OS SDK client (port 5170)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class ProfessionalClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5170);
  }
}
