/**
 * Transport OS SDK client (port 5240)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class TransportClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5240);
  }
}
