/**
 * Home Services OS SDK client (port 5140)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class HomeServicesClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5140);
  }
}
