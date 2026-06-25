/**
 * Tests for sutar-twin-os' rez-intel-client.js
 *
 * Uses the shared dual-client test helper from @rtmn/shared/test/rez-intel-helpers
 * which provides 16 standard tests for the dual-client wrapper.
 *
 * Run with:  node --test src/__tests__/rez-intel-client.test.js
 */

'use strict';

const path = require('node:path');
const helpers = require('@rtmn/shared/test/rez-intel-helpers');

const clientPath = path.resolve(__dirname, '..', 'rez-intel-client.js');
helpers.runDualClientTests(helpers.test, clientPath);