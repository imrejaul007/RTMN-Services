'use strict';

const path = require('node:path');
const helpers = require('@rtmn/shared/test/rez-intel-helpers');

const clientPath = path.resolve(__dirname, '..', 'rez-intel-client.js');
helpers.runDualClientTests(helpers.test, clientPath);