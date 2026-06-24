/**
 * Travel OS SDK client (port 5190)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class TravelClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5190);
  }
}
