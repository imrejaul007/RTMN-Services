/**
 * Real Estate OS SDK client (port 5230)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class RealEstateClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5230);
  }
}
