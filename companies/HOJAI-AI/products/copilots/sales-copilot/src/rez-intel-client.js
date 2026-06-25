/**
 * Dual-client intelligence client for sales-copilot.
 *
 * Thin re-export wrapper that delegates to `@rtmn/shared/intel/dual-client`
 * (the shared HOJAI + REZ dual-client helper). All copilots use this same
 * wrapper so endpoint shapes stay consistent across products.
 *
 * Why dual-client?
 *   REZ Intelligence Integration (port 5370) was historically the only
 *   backend SUTAR agents called. But REZ-Intel is itself a thin proxy over
 *   HOJAI Intelligence (port 4881) + REZ-Intelligence-Bridge (5369).
 *   HOJAI's intent/sentiment/retrieval/prediction agents live at 4881 and
 *   can serve HOJAI Foundry startups, Nexha tenants, and any non-REZ
 *   consumer directly — no need to depend on the REZ-Intel proxy.
 *
 *   This client supports INTEL_MODE=hojai|rez|dual so each deployment can
 *   pick the right backend (or use both with HOJAI-first fallback).
 *
 * If you need a new REZ-Intel-only helper that isn't in the shared module,
 * add it there once and re-export here.
 */

'use strict';

const dual = require('@rtmn/shared/intel/dual-client');

module.exports = dual;