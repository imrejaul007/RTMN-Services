/**
 * Dual-client intelligence client for support-copilot.
 *
 * Thin re-export wrapper that delegates to `@rtmn/shared/intel/dual-client`
 * (the shared HOJAI + REZ dual-client helper). All copilots use this same
 * wrapper so endpoint shapes stay consistent across products.
 */

'use strict';

const dual = require('@rtmn/shared/intel/dual-client');

module.exports = dual;