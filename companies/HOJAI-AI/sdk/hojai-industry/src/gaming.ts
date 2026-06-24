/**
 * Gaming OS SDK client (port 5120)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class GamingClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5120);
  }
}
