/**
 * Construction OS SDK client (port 5210)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class ConstructionClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5210);
  }
}
