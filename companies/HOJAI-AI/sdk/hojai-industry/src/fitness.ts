/**
 * Fitness OS SDK client (port 5110)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class FitnessClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5110);
  }
}
