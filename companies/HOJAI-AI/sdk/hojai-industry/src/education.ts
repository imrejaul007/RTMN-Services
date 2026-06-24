/**
 * Education OS SDK client (port 5060)
 *
 * Inherits the template surface from IndustryBaseClient.
 */

import type { HojaiConfig } from './foundation-config.js';
import { IndustryBaseClient } from './base.js';

export class EducationClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5060);
  }
}
