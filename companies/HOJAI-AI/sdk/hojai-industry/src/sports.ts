/**
 * Sports OS SDK client (port 5180)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class SportsClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5180);
  }
}
