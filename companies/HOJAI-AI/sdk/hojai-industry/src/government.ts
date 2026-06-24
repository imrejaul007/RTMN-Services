/**
 * Government OS SDK client (port 5130)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class GovernmentClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5130);
  }
}
