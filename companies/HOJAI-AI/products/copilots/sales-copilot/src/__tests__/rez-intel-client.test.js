/**
 * Tests for sales-copilot's rez-intel-client.js (dual-client)
 *
 * Uses the shared test helper from @rtmn/shared/test/rez-intel-helpers
 * which runs the standard dual-client suite (16 tests covering both HOJAI
 * and REZ backends, all 3 modes, graceful degradation, timeouts).
 *
 * Run with:  node --test src/__tests__/rez-intel-client.test.js
 */

'use strict';

const path = require('node:path');
const helpers = require('@rtmn/shared/test/rez-intel-helpers');

const clientPath = path.resolve(__dirname, '..', 'rez-intel-client.js');
helpers.runDualClientTests(helpers.test, clientPath);