/**
 * Restaurant OS SDK client
 *
 * Industry key: 'restaurant' (port 5010)
 *
 * Inherits the 9-method template (menu + orders + tables + customers) from
 * IndustryBaseClient. Use the base methods directly.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class RestaurantClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5010);
  }
}
