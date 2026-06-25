/**
 * Dual-client intelligence client (HOJAI + REZ).
 *
 * Thin re-export wrapper that delegates to `@rtmn/shared/intel/dual-client`.
 * Supports INTEL_MODE=hojai|rez|dual for routing between HOJAI Intelligence
 * (port 4881, core AI) and REZ Intelligence (port 5370, business intelligence).
 */

'use strict';

const dual = require('@rtmn/shared/intel/dual-client');

module.exports = dual;
