/**
 * Non-Profit OS SDK client (port 5160)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class NonProfitClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5160);
  }
}
