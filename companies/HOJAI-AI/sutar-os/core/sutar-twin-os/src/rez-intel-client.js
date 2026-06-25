/**
 * Dual-client intelligence client for sutar-twin-os (CJS)
 *
 * Re-exports the shared HOJAI + REZ dual-client helper. Supports
 * INTEL_MODE=hojai|rez|dual for routing between HOJAI Intelligence
 * (port 4881, core AI) and REZ Intelligence (port 5370, business intelligence).
 *
 * See @rtmn/shared/intel/dual-client for the full backend mapping.
 */

'use strict';

const dual = require('@rtmn/shared/intel/dual-client');

module.exports = dual;